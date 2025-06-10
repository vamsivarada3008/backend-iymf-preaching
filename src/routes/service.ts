import { Router, Request, Response } from 'express';
import Service from '../models/Service';
import fs from 'fs';
import csv from 'csv-parser';
import { asyncHandler } from '../utils';
import multer from 'multer';
import mongoose, {Schema} from 'mongoose';
import User from '../models/User';
import { Center } from '../models';
import Batch from '../models/Batch';

const router = Router();

const upload = multer({
    dest: 'uploads/', // folder where multer stores uploaded files temporarily
    limits: { fileSize: 10 * 1024 * 1024 }, // limit file size to 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv') {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

router.post('/add', asyncHandler(async (req: Request, res: Response) => {

    const service = new Service(req.body);
    const saved = await service.save();

    // add services to all the participant
    if (req.body.participants && req.body.participants.length > 0) {
        const participants = await User.find({ _id: { $in: req.body.participants } });
        for (const participant of participants) {
            // @ts-ignore
            participant.services?.push(saved?._id);
            await participant.save();
        }
    }
    res.status(201).json(saved);
}));

function cleanObjectId(id: string | undefined): mongoose.Types.ObjectId  {
    if (typeof id === 'string') {
        const trimmed = id.trim();
        if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
            return new mongoose.Types.ObjectId(trimmed);
        }
    }
    return new mongoose.Types.ObjectId();
}


router.post(
    '/bulk-add',
    upload.single('file'), // <-- multer middleware, expecting form field name 'file'
    asyncHandler(async (req: Request, res: Response) => {
        if (!req.file) return res.status(400).json({ error: 'CSV file required' });

        const filePath = req.file.path;
        const rows: any[] = [];

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => rows.push(row))
            .on('end', async () => {
                try {

                    console.log(rows);
                    const parentMap = new Map<string, any>();
                    const servicesToInsert: any[] = [];

                    for (const row of rows) {
                        let {
                            name,
                            description,
                            center,
                            batch,
                            parent_name,
                            parent_description
                        } = row;

                        center = cleanObjectId(center) || undefined;
                        batch = cleanObjectId(batch) || undefined;

                        const parentKey = `${parent_name}_${center}_${batch}`;
                        let parentService = parentMap.get(parentKey);

                        if (!parentService) {
                            parentService = new Service({
                                name: parent_name,
                                description: parent_description,
                                center,
                                batch
                            });
                            await parentService.save();
                            parentMap.set(parentKey, parentService);
                        }

                        servicesToInsert.push({
                            name,
                            description,
                            center,
                            batch,
                            parent_service: parentService._id
                        });
                    }

                    const insertedServices = await Service.insertMany(servicesToInsert);

                    for (const service of insertedServices) {
                        await Service.findByIdAndUpdate(service.parent_service, {
                            $addToSet: { child_services: service._id }
                        });
                    }

                    fs.unlinkSync(filePath);
                    res.json({ message: `${insertedServices.length} services added successfully` });
                } catch (error) {
                    fs.unlinkSync(filePath);
                    res.status(500).json({ error: (error as Error).message });
                }
            })
            .on('error', (error) => {
                fs.unlinkSync(filePath);
                res.status(500).json({ error: (error as Error).message });
            });
    })
);

router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const { center, name } = req.query;

    const query: any = {};
    if (center) query.center = center;
    if (name) query.name = new RegExp(name as string, 'i');

    const services = await Service.find(query)
        .populate('center coordinator participants batch')
        .sort({ createdAt: -1 });

    res.json(services);
}));

router.put('/update-all', asyncHandler(async (req: Request, res: Response) => {
    // if the center inside the service is not present them get center ny tis id "68372f9cc6114453c76307e5" and right it to the service
    const services = await Service.find({});
    for (const service of services) {
            const batch = await Batch.findById("683730eb0143ba12a72d3ed7");
            service.batch = batch?._id as unknown as mongoose.Types.ObjectId;
            await service.save();
    }
    res.json({ message: 'Services updated successfully' });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const service = await Service.findById(req.params.id)
        .populate('center coordinator participants batch');

    if (!service) return res.status(404).json({ error: 'Service not found' });

    res.json(service);
}));



router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const updated = await Service.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    // Add services to participants if they are updated
    if (req.body.participants && req.body.participants.length > 0) {
        const participants = await User.find({ _id: { $in: req.body.participants } });
        for (const participant of participants) {
            // @ts-ignore
            if (!participant.services.includes(updated?._id as unknown as mongoose.Types.ObjectId)) {
                participant.services?.push(updated?._id as unknown as mongoose.Types.ObjectId);
                await participant.save();
            }
        }
    }

    if (!updated) return res.status(404).json({ error: 'Service not found' });

    res.json(updated);
}));




router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const deleted = await Service.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Service not found' });

    res.json({ message: 'Service deleted successfully' });
}));

export default router;
