import mongoose, { Document, Model, Schema } from 'mongoose';

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface IWorkspaceMember {
  user: mongoose.Types.ObjectId;
  role: WorkspaceRole;
  joinedAt: Date;
}

export interface IWorkspace extends Document {
  name: string;
  slug: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  members: IWorkspaceMember[];
  meetings: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const workspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Member user reference is required'],
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      minlength: [2, 'Workspace name must be at least 2 characters'],
      maxlength: [100, 'Workspace name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Workspace slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Workspace owner is required'],
      index: true,
    },
    members: {
      type: [workspaceMemberSchema],
      default: [],
    },
    meetings: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Meeting',
      },
    ],
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

workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ 'members.user': 1 });

export const Workspace: Model<IWorkspace> = mongoose.model<IWorkspace>(
  'Workspace',
  workspaceSchema
);
