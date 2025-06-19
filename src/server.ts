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

// Connect and Start
mongoose.connect('mongodb+srv://shivamvijay543:86xH5JUuxNajPqxf@cluster0.zamipz9.mongodb.net/iskcon?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => app.listen(3000, () => console.log('Server running on 3000')))
  .catch(err => console.error(err));


  function asyncHandler(fn: (req: Request, res: Response) => Promise<any>) {
    return (req: Request, res: Response, next: express.NextFunction) => {
      fn(req, res).catch(next);
    };
  }
