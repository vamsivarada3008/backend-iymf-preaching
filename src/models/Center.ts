import mongoose, { Schema, Document } from 'mongoose';

export interface ICenter extends Document {
  name: string;
  location: mongoose.Types.ObjectId;
}

const centerSchema = new Schema({
  name: { type: String, required: true },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: false },
});

export default mongoose.model<ICenter>('Center', centerSchema);
