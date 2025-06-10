import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  name: string;
  description?: string;
  center: mongoose.Types.ObjectId;
  batch?: mongoose.Types.ObjectId;
  conductor?: mongoose.Types.ObjectId;
  date: Date;
  level:number;
}

const SessionSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  center: { type: Schema.Types.ObjectId, ref: 'Center', required: true },
  batch: { type: Schema.Types.ObjectId, ref: 'Batch' },
  conductor: { type: Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, required: true },
  level: { type: Number, required: true, default: 1 } // Level of the session
}, {
  timestamps: true
});

export default mongoose.model<ISession>('Session', SessionSchema);