import { Router, Request, Response } from 'express';
import Batch, { IBatch } from '../models/Batch';
import { asyncHandler } from '../utils';
import mongoose from 'mongoose';

const router = Router();

// Create a new batch
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const batch = new Batch(req.body);
    const saved = await batch.save();
    const populated = await saved.populate('center');
    res.status(201).json(populated);
}));

// Get all batches with optional filters
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { name, center, minLevel, maxLevel } = req.query;
    
    const query: any = {};
    if (name) query.name = new RegExp(name as string, 'i');
    if (center && mongoose.Types.ObjectId.isValid(center as string)) {
        query.center = new mongoose.Types.ObjectId(center as string);
    }
    
    // Level range filter
    if (minLevel || maxLevel) {
        query.currentLevel = {};
        if (minLevel) query.currentLevel.$gte = Number(minLevel);
        if (maxLevel) query.currentLevel.$lte = Number(maxLevel);
    }

    const batches = await Batch.find(query)
        .populate('center')
        .sort({ createdAt: -1 });
    
    res.json(batches);
}));

// Get a single batch by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid batch ID' });
    }

    const batch = await Batch.findById(req.params.id)
        .populate('center');
    
    if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
    }
    
    res.json(batch);
}));

// Update a batch
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid batch ID' });
    }

    // Ensure currentLevel is within valid range if provided
    if (req.body.currentLevel !== undefined) {
        const level = Number(req.body.currentLevel);
        if (isNaN(level) || level < 1) {
            return res.status(400).json({ error: 'Current level must be a positive number' });
        }
    }

    const updated = await Batch.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    ).populate('center');
    
    if (!updated) {
        return res.status(404).json({ error: 'Batch not found' });
    }
    
    res.json(updated);
}));

// Delete a batch
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid batch ID' });
    }

    const deleted = await Batch.findByIdAndDelete(req.params.id);
    
    if (!deleted) {
        return res.status(404).json({ error: 'Batch not found' });
    }
    
    res.json({ message: 'Batch deleted successfully' });
}));

// Increment batch level
router.post('/:id/increment-level', asyncHandler(async (req: Request, res: Response) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid batch ID' });
    }

    const batch = await Batch.findById(req.params.id);
    if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
    }

    batch.currentLevel = (batch.currentLevel || 1) + 1;
    await batch.save();
    await batch.populate('center');
    
    res.json(batch);
}));

export default router;
