// Express App Setup
import express, { Request, Response } from 'express';
import mongoose, { Model } from 'mongoose';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import cors from 'cors';
import path from 'path';
import centerRoutes from './routes/center';
import batchRoutes from './routes/batch';
import serviceRoutes from './routes/service';
import userRoutes from './routes/user';
import sessionRoutes from './routes/session';

import { User, Pg, Center, Location, Session, Service,Batch } from './models';

const app = express();
app.use(express.json());
app.use(cors());

// File upload config
const upload = multer({ dest: 'uploads/' });

// Helper: Ensure location exists or create it
async function getOrCreateLocation(locationData: {
    name: string;
    type?: string;
    googleMapLink?: string;
    city?: string;
    state?: string;
    country?: string;
  }) {
    let location = await Location.findOne({ name: locationData.name });
    if (!location) {
      location = await Location.create(locationData);
    }

    console.log(location);
    return location._id;
  }


  app.use('/center', centerRoutes);
  app.use('/batch', batchRoutes);
  app.use('/service', serviceRoutes);
  app.use('/user', userRoutes);
  app.use('/session', sessionRoutes);

// 1. Register Participant
app.post('/participants/register', async (req: Request, res: Response) => {
  try {
    const { name, contact, motherTongue, paidStatus, registrationComment, location, center } = req.body;
    const locationId = await getOrCreateLocation(location);

    const participant = await User.create({
      name,
      contact,
      motherTongue,
      paidStatus,
      registrationComment,
      location: locationId,
      center,
      Role: 'Participant'
    });

    res.status(201).json(participant);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Register Devotee
app.post('/devotees/register', async (req: Request, res: Response) => {
  try {
    const { name, contact, motherTongue, location, center } = req.body;
    const locationId = await getOrCreateLocation(location);

    const devotee = await User.create({
      name,
      contact,
      motherTongue,
      location: locationId,
      center,
      Role: 'Devotee'
    });

    res.status(201).json(devotee);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Get User Profile
app.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('services')
      .populate('center')
      .populate('location')
      .populate('mentorId', 'name contact')
      .populate('mentees', 'name contact')
      .populate('attendance.session');

    res.json(user);
  } catch (err) {
    res.status(404).json({ error: 'User not found' });
  }
});

// 4. Get PG Profile
app.get('/pg/:id', async (req: Request, res: Response) => {
  try {
    const pg = await Pg.findById(req.params.id);
    res.json(pg);
  } catch (err) {
    res.status(404).json({ error: 'PG not found' });
  }
});

// 5. Update PG Profile
app.put('/pg/:id', async (req: Request, res: Response) => {
  try {
    const updated = await Pg.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Get Center Profile
app.get('/center/:id', async (req: Request, res: Response) => {
  try {
    const center = await Center.findById(req.params.id).populate('location head');
    res.json(center);
  } catch (err) {
    res.status(404).json({ error: 'Center not found' });
  }
});

// 6a. Create Center (Avoid Duplicate by name + location)
app.post('/center/create', asyncHandler(async (req: Request, res: Response)  => {
  try {
    const { name, location, head } = req.body;
    const locationId = await getOrCreateLocation(location);

    const existing = await Center.findOne({ name, location: locationId });
    if (existing) return res.status(409).json({ error: 'Center already exists with this name and location' });

    const created = await Center.create({ name, location: locationId, head });
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}));

// 6b. Get Centers with Filters + Pagination
app.get('/center', async (req: Request, res: Response) => {
  try {
    const { location, head, name, page = 1, limit = 10 } = req.query;
    const query: any = {};
    if (location) query.location = location;
    if (head) query.head = head;
    if (name) query.name = { $regex: name, $options: 'i' };

    const centers = await Center.find(query)
      .populate('location head')
      .skip((+page - 1) * +limit)
      .limit(+limit);

    const total = await Center.countDocuments(query);
    res.json({ data: centers, total, page: +page, limit: +limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Update Center
app.put('/center/:id', async (req: Request, res: Response) => {
  try {
    const updated = await Center.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 8. Filter Sadhna (Last 30 Days)
app.get('/users/:id/sadhna', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);
    const filtered = user?.sadhna?.filter(s => new Date(s.date) >= last30);
    res.json(filtered);
  } catch (err) {
    res.status(404).json({ error: 'User not found' });
  }
});

// 9. Filter Attendance
app.get('/users/:id/attendance', async (req: Request, res: Response) => {
    try {
      const { present, startDate, endDate, sessionType } = req.query;
      const user = await User.findById(req.params.id).populate('attendance.session');
      const filtered = user?.attendance?.filter(async a => {
        const session = await Session.findById(a.session);
        const d = new Date(a.date);
        const matchPresent = present ? a.present === (present === 'true') : true;
        const matchDate = (!startDate || d >= new Date(startDate as string)) && (!endDate || d <= new Date(endDate as string));
        const matchType = sessionType ? session?.name === sessionType : true;
        return matchPresent && matchDate && matchType;
      });
      res.json(filtered);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

// 10. Bulk Import CSV for Entity
app.post('/import_genric/:entity', upload.single('file'), asyncHandler(async (req: Request, res: Response)  => {
  const { entity } = req.params;
  const filePath = req.file?.path;
  const results: any[] = [];

  if (!filePath) return res.status(400).json({ error: 'No file uploaded' });

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        let model;
        switch (entity) {
          case 'pg': model = Pg; break;
          case 'location': model = Location; break;
          case 'center': model = Center; break;
          case 'Session': model = Session; break;
          case 'service': model = Service; break;
          case 'devotee': model = User; break;
          default: return res.status(400).json({ error: 'Invalid entity' });
        }

        const inserted = await (model as Model<any>).insertMany(results.map(r => {
            if (entity === 'devotee') r.Role = 'Devotee';
            return r;
          }));

        fs.unlinkSync(filePath);
        res.status(201).json({ insertedCount: inserted.length });
      } catch (err: any) {
        fs.unlinkSync(filePath);
        res.status(500).json({ error: err.message });
      }
    });
}));



app.post('/import/pg', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
    const filePath = req.file?.path;
    if (!filePath) return res.status(400).json({ error: 'No file uploaded' });
  
    const results: any[] = [];
  
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          const pgDocs = [];

          console.log(results);
          for (const r of results) {
            // Extract location fields from CSV row, customize keys as needed
            const locationData = {
              name: r.locationName || r.LocationName || r.name, // fallback to PG name if needed
              type: r.locationType || r.LocationType || 'PG',
              googleMapLink: r.googleMapLink || r.GoogleMapLink || '',
              city: r.city || '',
              state: r.state || '',
              country: r.country || '',
            };

            console.log(locationData);
  
            const locationId = await getOrCreateLocation(locationData);

            console.log(locationId);
  
            pgDocs.push({
              name: r.name || r.Name,
              ownerContact: r.ownerContact || r.OwnerContact,
              location: locationId,
              favourable: r.favourable === 'false' ? false : true,
              comment: r.comment || '',
            });
          }
  
          const inserted = await Pg.insertMany(pgDocs);
  
          fs.unlinkSync(filePath);
          res.status(201).json({ insertedCount: inserted.length });
        } catch (err: any) {
          fs.unlinkSync(filePath);
          res.status(500).json({ error: err.message });
        }
      });
  }));

// Connect and Start
mongoose.connect('mongodb+srv://shivamvijay543:86xH5JUuxNajPqxf@cluster0.zamipz9.mongodb.net/iskcon?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => app.listen(3000, () => console.log('Server running on 3000')))
  .catch(err => console.error(err));


  function asyncHandler(fn: (req: Request, res: Response) => Promise<any>) {
    return (req: Request, res: Response, next: express.NextFunction) => {
      fn(req, res).catch(next);
    };
  }
