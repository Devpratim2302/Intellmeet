import mongoose, { Document, Model, Schema } from 'mongoose';

export type NotificationType =
  | 'task_assigned'
  | 'task_created'
  | 'task_status_changed'
  | 'meeting_scheduled'
  | 'meeting_reminder'
  | 'meeting_ended'
  | 'summary_ready'
  | 'action_item_assigned'
  | 'mention'
  | 'general';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  sender?: mongoose.Types.ObjectId | null;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient user reference is required'],
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: [
        'task_assigned',
        'task_created',
        'task_status_changed',
        'meeting_scheduled',
        'meeting_reminder',
        'meeting_ended',
        'summary_ready',
        'action_item_assigned',
        'mention',
        'general',
      ],
      default: 'general',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    link: {
      type: String,
      trim: true,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
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

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export const Notification: Model<INotification> = mongoose.model<INotification>(
  'Notification',
  notificationSchema
);
