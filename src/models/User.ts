import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  contact: string;
  motherTongue?: string;
  paidStatus?: boolean;
  registrationComment?: string;
  location: mongoose.Types.ObjectId;
  center: mongoose.Types.ObjectId;
  Role: 'Participant' | 'Devotee';
  services?: mongoose.Types.ObjectId[];
  mentorId?: mongoose.Types.ObjectId;
  mentees?: mongoose.Types.ObjectId[];
  attendance: {
    session: mongoose.Types.ObjectId;
    present: boolean;
    markedAt?: Date;
  }[];
  sadhna: {
    date: Date,
    readingMinutes: Number,
    hearingMinutes: Number,
    chantingRounds: Number
  }[];
  chantingRounds?: Number;
  batches?: mongoose.Types.ObjectId[];
}

const UserSchema = new Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true, unique: true },
  motherTongue: { type: String, required: false },
  paidStatus: { type: Boolean, default: false },
  registrationComment: String,
  location: { type: Schema.Types.ObjectId, ref: 'Location', required: false },
  center: { type: Schema.Types.ObjectId, ref: 'Center', required: false },
  Role: { type: String, enum: ['Participant', 'Devotee'], required: true },
  services: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
  mentorId: { type: Schema.Types.ObjectId, ref: 'User' },
  mentees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  attendance: [{
    session: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    present: { type: Boolean, required: true },
    markedAt: { type: Date, default: Date.now }
  }],
  sadhna: [{
    date: Date,
    readingMinutes: Number,
    hearingMinutes: Number,
    chantingRounds: Number
  }],
  chantingRounds:Number,
  batches: [{ type: Schema.Types.ObjectId, ref: 'Batch' }]

}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);