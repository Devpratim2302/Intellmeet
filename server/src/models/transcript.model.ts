import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ITranscriptSpeaker {
  id?: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  avatar?: string;
}

export interface ITranscriptWord {
  word: string;
  start?: number;
  end?: number;
  confidence?: number;
}

export interface ITranscriptSegment {
  _id?: mongoose.Types.ObjectId;
  speaker: ITranscriptSpeaker;
  text: string;
  timestamp: Date;
  startTime?: number; // start offset in seconds
  endTime?: number;   // end offset in seconds
  confidence?: number; // 0.0 to 1.0
  words?: ITranscriptWord[];
  createdAt?: Date;
}

export type TranscriptStatus = 'recording' | 'processing' | 'completed' | 'failed';

export interface ITranscript extends Document {
  meeting: mongoose.Types.ObjectId;
  roomId: string;
  status: TranscriptStatus;
  language: string;
  provider: string; // 'mock' | 'openai' | 'deepgram'
  fullText: string;
  segments: ITranscriptSegment[];
  durationSeconds?: number;
  audioFileUrl?: string;
  audioMimeType?: string;
  audioSizeBytes?: number;
  createdAt: Date;
  updatedAt: Date;
}

const speakerSchema = new Schema<ITranscriptSpeaker>(
  {
    id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      required: [true, 'Speaker name is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const wordSchema = new Schema<ITranscriptWord>(
  {
    word: { type: String, required: true },
    start: { type: Number, default: 0 },
    end: { type: Number, default: 0 },
    confidence: { type: Number, default: 1 },
  },
  { _id: false }
);

const transcriptSegmentSchema = new Schema<ITranscriptSegment>(
  {
    speaker: {
      type: speakerSchema,
      required: [true, 'Speaker information is required'],
    },
    text: {
      type: String,
      required: [true, 'Segment text is required'],
      trim: true,
      minlength: [1, 'Segment text cannot be empty'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    startTime: {
      type: Number,
      default: 0,
    },
    endTime: {
      type: Number,
      default: 0,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.95,
    },
    words: [wordSchema],
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret: any) {
        if (ret._id) {
          ret.id = ret._id.toString();
          delete ret._id;
        }
        return ret;
      },
    },
  }
);

const transcriptSchema = new Schema<ITranscript>(
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
    status: {
      type: String,
      enum: ['recording', 'processing', 'completed', 'failed'],
      default: 'completed',
      index: true,
    },
    language: {
      type: String,
      default: 'en-US',
      trim: true,
    },
    provider: {
      type: String,
      default: 'mock',
      trim: true,
    },
    fullText: {
      type: String,
      default: '',
    },
    segments: [transcriptSegmentSchema],
    durationSeconds: {
      type: Number,
      default: 0,
    },
    audioFileUrl: {
      type: String,
      default: '',
    },
    audioMimeType: {
      type: String,
      default: '',
    },
    audioSizeBytes: {
      type: Number,
      default: 0,
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

// Indexes for fast lookup
transcriptSchema.index({ meeting: 1, createdAt: -1 });
transcriptSchema.index({ roomId: 1, createdAt: -1 });

export const Transcript: Model<ITranscript> = mongoose.model<ITranscript>('Transcript', transcriptSchema);
