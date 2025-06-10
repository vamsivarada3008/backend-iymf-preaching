import { Router, Request, Response } from 'express';
import Session, { ISession } from '../models/Session';
import { asyncHandler } from '../utils';
import mongoose from 'mongoose';

const router = Router();

// Create a new session
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const sessionsData = req.body;

    if (!Array.isArray(sessionsData) || sessionsData.length === 0) {
        return res.status(400).json({ error: 'Request body must be a non-empty array of sessions' });
    }

    const insertedSessions = await Session.insertMany(sessionsData, { ordered: false });
    const populatedSessions = await Session.find({ _id: { $in: insertedSessions.map(s => s._id) } })
        .populate(['center', 'batch', 'conductor']);

    res.status(201).json(populatedSessions);
}));


// Get all sessions with optional filters
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { name, center, batch, conductor, startDate, endDate, level } = req.query;
    
    const query: any = {};
    if (name) query.name = new RegExp(name as string, 'i');
    if (center && mongoose.Types.ObjectId.isValid(center as string)) query.center = new mongoose.Types.ObjectId(center as string);
    if (batch && mongoose.Types.ObjectId.isValid(batch as string)) query.batch = new mongoose.Types.ObjectId(batch as string);
    if (conductor && mongoose.Types.ObjectId.isValid(conductor as string)) query.conductor = new mongoose.Types.ObjectId(conductor as string);
    if (level) query.level = Number(level);

    // Date range filter
    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate as string);
        if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const sessions = await Session.find(query)
        .populate(['center', 'batch', 'conductor'])
        .sort({ date: -1, createdAt: -1 });
    
    res.json(sessions);
}));

// Get a single session by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid session ID' });
    }

    const session = await Session.findById(req.params.id)
        .populate(['center', 'batch', 'conductor']);
    
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
}));

// Update a session
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid session ID' });
    }

    const updated = await Session.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    ).populate(['center', 'batch', 'conductor']);
    
    if (!updated) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(updated);
}));

// Delete a session
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid session ID' });
    }

    const deleted = await Session.findByIdAndDelete(req.params.id);
    
    if (!deleted) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ message: 'Session deleted successfully' });
}));


export default router; 