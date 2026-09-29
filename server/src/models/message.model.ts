import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IMessage extends Document {
  roomId: string;
  meeting?: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  senderName: string;
  senderEmail?: string;
  senderAvatar?: string;
  content: string;
  type: 'chat' | 'system';
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    roomId: {
      type: String,
      required: [true, 'Room ID is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    meeting: {
      type: Schema.Types.ObjectId,
      ref: 'Meeting',
      default: null,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
      index: true,
    },
    senderName: {
      type: String,
      required: [true, 'Sender name is required'],
      trim: true,
    },
    senderEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    senderAvatar: {
      type: String,
      default: '',
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      minlength: [1, 'Message content cannot be empty'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    type: {
      type: String,
      enum: ['chat', 'system'],
      default: 'chat',
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

// Compound index for querying room message history sorted chronologically
messageSchema.index({ roomId: 1, createdAt: 1 });

export const Message: Model<IMessage> = mongoose.model<IMessage>('Message', messageSchema);
