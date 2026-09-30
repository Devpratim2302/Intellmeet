import mongoose, { Document, Model, Schema } from 'mongoose';

export type ActionItemStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ActionItemPriority = 'low' | 'medium' | 'high';

export interface IActionItem extends Document {
  meeting: mongoose.Types.ObjectId;
  roomId: string;
  workspace?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  assigneeName?: string;
  assignee?: mongoose.Types.ObjectId;
  dueDate?: Date | null;
  status: ActionItemStatus;
  priority: ActionItemPriority;
  sourceSnippet?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const actionItemSchema = new Schema<IActionItem>(
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
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task description is required'],
      trim: true,
      minlength: [2, 'Task description must be at least 2 characters'],
      maxlength: [500, 'Task description cannot exceed 500 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    assigneeName: {
      type: String,
      trim: true,
      default: '',
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    sourceSnippet: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
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

actionItemSchema.index({ meeting: 1, status: 1 });
actionItemSchema.index({ roomId: 1, status: 1 });
actionItemSchema.index({ workspace: 1, status: 1 });

export const ActionItem: Model<IActionItem> = mongoose.model<IActionItem>(
  'ActionItem',
  actionItemSchema
);
