import mongoose, { Schema, Document } from 'mongoose';

export interface IBatch extends Document {
  name: string;
  description?: string;
  center: mongoose.Types.ObjectId;
  currentLevel?: number;
}

const BatchSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  center: { type: Schema.Types.ObjectId, ref: 'Center', required: true },
  currentLevel: { type: Number, required: true, default: 1 }
}, {
  timestamps: true
});

export default mongoose.model<IBatch>('Batch', BatchSchema);