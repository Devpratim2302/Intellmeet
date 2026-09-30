import mongoose, { Document, Model, Schema } from 'mongoose';

export type MeetingStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export interface IMeeting extends Document {
  title: string;
  description?: string;
  host: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  roomId: string;
  status: MeetingStatus;
  workspace?: mongoose.Types.ObjectId;
  scheduledStartTime?: Date;
  scheduledEndTime?: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const meetingSchema = new Schema<IMeeting>(
  {
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Host is required'],
      index: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    roomId: {
      type: String,
      required: [true, 'Room ID is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
      index: true,
    },
    scheduledStartTime: {
      type: Date,
      default: null,
    },
    scheduledEndTime: {
      type: Date,
      default: null,
    },
    actualStartTime: {
      type: Date,
      default: null,
    },
    actualEndTime: {
      type: Date,
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

// Helpful compound index for querying user meetings
meetingSchema.index({ host: 1, status: 1 });
meetingSchema.index({ participants: 1, status: 1 });

export const Meeting: Model<IMeeting> = mongoose.model<IMeeting>('Meeting', meetingSchema);
