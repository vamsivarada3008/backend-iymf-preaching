import mongoose, { Schema, Document } from 'mongoose';

export interface IService extends Document {
  name: string;
  description?: string;
  center: mongoose.Types.ObjectId;
  coordinator?: mongoose.Types.ObjectId;
  participants?: mongoose.Types.ObjectId[];
  batch?: mongoose.Types.ObjectId;
  child_services?: mongoose.Types.ObjectId[];
  parent_service?: mongoose.Types.ObjectId;
}

const ServiceSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  center: { type: Schema.Types.ObjectId, ref: 'Center', required: true },
  coordinator: { type: Schema.Types.ObjectId, ref: 'User' },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  batch: { type: Schema.Types.ObjectId, ref: 'Batch' },
  child_services: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
  parent_service: { type: Schema.Types.ObjectId, ref: 'Service'}
},{
  timestamps: true
});

export default mongoose.model<IService>('Service', ServiceSchema); 