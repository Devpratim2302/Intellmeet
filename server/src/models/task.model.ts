import mongoose, { Document, Model, Schema } from 'mongoose';

export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ITask extends Document {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date | null;
  workspace?: mongoose.Types.ObjectId | null;
  meeting?: mongoose.Types.ObjectId | null;
  roomId?: string;
  actionItem?: mongoose.Types.ObjectId | null;
  assignee?: mongoose.Types.ObjectId | null;
  assigneeName?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [2, 'Task title must be at least 2 characters'],
      maxlength: [300, 'Task title cannot exceed 300 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Task description cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'completed'],
      default: 'todo',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
      index: true,
    },
    meeting: {
      type: Schema.Types.ObjectId,
      ref: 'Meeting',
      default: null,
      index: true,
    },
    roomId: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      index: true,
    },
    actionItem: {
      type: Schema.Types.ObjectId,
      ref: 'ActionItem',
      default: null,
      index: true,
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assigneeName: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user reference is required'],
      index: true,
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

taskSchema.index({ workspace: 1, status: 1 });
taskSchema.index({ meeting: 1, status: 1 });
taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ createdBy: 1, status: 1 });

export const Task: Model<ITask> = mongoose.model<ITask>('Task', taskSchema);
