import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISummary extends Document {
  meeting: mongoose.Types.ObjectId;
  roomId: string;
  transcript?: mongoose.Types.ObjectId;
  overview: string;
  keyPoints: string[];
  decisions: string[];
  topics: string[];
  provider: string;
  aiModel: string;
  generatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const summarySchema = new Schema<ISummary>(
  {
    meeting: {
      type: Schema.Types.ObjectId,
      ref: 'Meeting',
      required: [true, 'Meeting reference is required'],
      index: true,
    },
    roomId: {
      type: String,
      required: [true, 'Room ID is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    transcript: {
      type: Schema.Types.ObjectId,
      ref: 'Transcript',
      default: null,
    },
    overview: {
      type: String,
      required: [true, 'Summary overview is required'],
      trim: true,
      minlength: [10, 'Overview must be at least 10 characters'],
    },
    keyPoints: {
      type: [String],
      required: [true, 'Key points are required'],
      default: [],
    },
    decisions: {
      type: [String],
      default: [],
    },
    topics: {
      type: [String],
      default: [],
    },
    provider: {
      type: String,
      default: 'mock',
      trim: true,
    },
    aiModel: {
      type: String,
      default: 'mock-grounded',
      trim: true,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

summarySchema.index({ meeting: 1, createdAt: -1 });
summarySchema.index({ roomId: 1, createdAt: -1 });

export const Summary: Model<ISummary> = mongoose.model<ISummary>('Summary', summarySchema);
