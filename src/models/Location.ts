import mongoose, { Schema, Document } from 'mongoose';

export interface ILocation extends Document {
  name: string;
  type?: string;
  googleMapLink?: string;
  city?: string;
  state?: string;
  country?: string;
}

const LocationSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['PG', 'BACE', 'TEMPLE','CENTER', 'FLAT', 'OTHER'] },
  googleMapLink: String,
  city: String,
  state: String,
  country: String
}, {
  timestamps: true
});

export default mongoose.model<ILocation>('Location', LocationSchema); 