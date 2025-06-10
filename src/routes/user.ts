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
    const user = new User(req.body);
    const saved = await user.save();
    res.status(201).json(saved);
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


export default router;
