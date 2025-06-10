import mongoose, { Schema, Document } from 'mongoose';

export interface IPg extends Document {
  name: string;
  ownerContact: string;
  location: mongoose.Types.ObjectId;
  favourable: boolean;
  comment: string;
  cultivation: Array<{
    date: Date;
    action: string;
    notes: string;
  }>;
  outreach: Array<{
    date: Date;
    roomsVisited: Array<number>;
    paidRegisteredCount: number;
    unPaidRegisteredCount: number;
    studentsMetCount: number;
  }>;
}

const PgSchema = new Schema({
  name: { type: String, required: true },
  ownerContact: { type: String, required: false },
  location: { type: Schema.Types.ObjectId, ref: 'Location', required: false },
  favourable: { type: Boolean, default: true },
  comment: String,
  cultivation: [{
    date: Date,
    action: String,  // e.g., Prasadam, Invite, Follow-Up, Call
    notes: String
  }],
  outreach: [{
    date: Date,
    roomsVisited: [Number],
    paidRegisteredCount: Number,
    unPaidRegisteredCount: Number,
    studentsMetCount: Number
  }]
}, {
  timestamps: true
});

export default mongoose.model<IPg>('Pg', PgSchema); 