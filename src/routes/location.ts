import { Router, Request, Response } from 'express';
import Location, { ILocation } from '../models/Location';
import { asyncHandler } from '../utils';
import mongoose from 'mongoose';

const router = Router();

// Create a new location
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const location = new Location(req.body);
    const saved = await location.save();
    res.status(201).json(saved);
}));

// Get all locations with optional filters
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { name, type, city, state, country } = req.query;
    
    const query: any = {};
    if (name) query.name = new RegExp(name as string, 'i');
    if (type) query.type = type;
    if (city) query.city = new RegExp(city as string, 'i');
    if (state) query.state = new RegExp(state as string, 'i');
    if (country) query.country = new RegExp(country as string, 'i');

    const locations = await Location.find(query)
        .sort({ createdAt: -1 });
    
    res.json(locations);
}));

// Get a single location by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid location ID' });
    }

    const location = await Location.findById(req.params.id);
    
    if (!location) {
        return res.status(404).json({ error: 'Location not found' });
    }
    
    res.json(location);
}));

// Update a location
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid location ID' });
    }

    const updated = await Location.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );
    
    if (!updated) {
        return res.status(404).json({ error: 'Location not found' });
    }
    
    res.json(updated);
}));

// Delete a location
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid location ID' });
    }

    const deleted = await Location.findByIdAndDelete(req.params.id);
    
    if (!deleted) {
        return res.status(404).json({ error: 'Location not found' });
    }
    
    res.json({ message: 'Location deleted successfully' });
}));

export default router; 