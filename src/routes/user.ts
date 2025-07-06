import { Router, Request, Response } from 'express';
import User from '../models/User';
import { asyncHandler } from '../utils';
import multer from 'multer';
import fs from 'fs';
import csv from 'csv-parser';
import mongoose from "mongoose";


const router = Router();

const upload = multer({ dest: 'uploads/' });

function cleanObjectId(id: string | undefined): mongoose.Types.ObjectId | undefined {
    if (typeof id === 'string') {
        const trimmed = id.trim();
        if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
            return new mongoose.Types.ObjectId(trimmed);
        }
    }
    return undefined;
}


router.post('/add', asyncHandler(async (req: Request, res: Response) => {
    try {
        const user = new User(req.body);
        const saved = await user.save();
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: saved
        });
    } catch (error: any) {
        console.error('Error creating user:', error);

        // Handle MongoDB duplicate key error (E11000)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'field';
            const value = error.keyValue?.[field] || 'unknown';

            return res.status(409).json({
                success: false,
                message: `A user with this ${field} already exists: ${value}`,
                error: 'DUPLICATE_KEY_ERROR',
                field: field,
                value: value
            });
        }

        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors || {}).map((err: any) => ({
                field: err.path,
                message: err.message,
                value: err.value
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                error: 'VALIDATION_ERROR',
                details: validationErrors
            });
        }

        // Handle cast errors (invalid ObjectId, etc.)
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: `Invalid ${error.path}: ${error.value}`,
                error: 'CAST_ERROR',
                field: error.path
            });
        }

        // Handle other MongoDB errors
        if (error.name === 'MongoServerError') {
            return res.status(500).json({
                success: false,
                message: 'Database operation failed',
                error: 'MONGO_SERVER_ERROR'
            });
        }

        // Handle generic errors
        return res.status(500).json({
            success: false,
            message: error.message || 'An unexpected error occurred while creating the user',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { role, center, search } = req.query;

    const query: any = {};
    if (role) query.Role = role;
    if (center) query.center = center;
    if (search) {
        query.$or = [
            { name: new RegExp(search as string, 'i') },
            { contact: new RegExp(search as string, 'i') }
        ];
    }

    const users = await User.find(query)
        .populate('location center services mentorId mentees batches')
        .sort({ createdAt: -1 });

    res.json({ total: users.length, users });
}));

router.get('/by-batch-center', asyncHandler(async (req: Request, res: Response) => {
    const { batchId, centerId } = req.query;

    if (!batchId || !centerId) {
        return res.status(400).json({ error: 'batchId and centerId are required' });
    }

    const users = await User.find({
        batches: batchId,
        center: centerId
    })
        .populate('location center services mentorId mentees batches')
        .sort({ createdAt: -1 });

    res.json({ total: users.length, users });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findById(req.params.id)
        .populate('location center services mentorId mentees batches');

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
}));

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    if (!updated) return res.status(404).json({ error: 'User not found' });

    res.json(updated);
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'User deleted successfully' });
}));

router.post('/bulk-add', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'CSV file is required' });

    const users: any[] = [];
    const filePath = req.file.path;

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
            // Parse and push each row
            users.push({
                name: row.name,
                contact: row.contact,
                Role: row.Role,
                center: cleanObjectId(row.center)
            });
        })
        .on('end', async () => {
            try {
                const inserted = await User.insertMany(users, { ordered: false });
                fs.unlinkSync(filePath);
                res.json({ message: `${inserted.length} users added successfully` });
            } catch (error) {
                fs.unlinkSync(filePath);
                res.status(500).json({ error: (error as Error).message });
            }
        })
        .on('error', (error) => {
            fs.unlinkSync(filePath);
            res.status(500).json({ error: (error as Error).message });
        });
}));

// Bulk mark attendance by user IDs
router.post('/attendance/bulk-mark', asyncHandler(async (req: Request, res: Response) => {
    const { sessionId, userIds } = req.body;
    // userIds: [string] - array of user IDs

    if (!sessionId || !Array.isArray(userIds)) {
        return res.status(400).json({ error: 'Session ID and userIds array are required' });
    }

    const results: {
        success: Array<{ userId: string; name: string; contact: string }>;
        failed: Array<{ userId: string; error: string }>;
    } = {
        success: [],
        failed: []
    };

    for (const userId of userIds) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                results.failed.push({
                    userId,
                    error: 'User not found'
                });
                continue;
            }

            // Check if attendance already exists
            const existingAttendance = user.attendance.find(
                att => att.session.toString() === sessionId
            );

            if (existingAttendance) {
                results.failed.push({
                    userId,
                    error: 'Attendance already marked for this session'
                });
                continue;
            }

            // Add attendance
            user.attendance.push({
                session: new mongoose.Types.ObjectId(sessionId),
                present: true,
                markedAt: new Date()
            });

            await user.save();

            results.success.push({
                userId,
                name: user.name,
                contact: user.contact
            });

        } catch (error) {
            results.failed.push({
                userId,
                error: (error as Error).message
            });
        }
    }

    res.json({
        message: `Attendance marked for ${results.success.length} users`,
        results
    });
}));

export default router;
