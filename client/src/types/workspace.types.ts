import { User } from './auth.types';

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface WorkspaceMember {
  user: User;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  owner: User;
  members: WorkspaceMember[];
  meetings?: string[];
  createdAt: string;
  updatedAt: string;
}
