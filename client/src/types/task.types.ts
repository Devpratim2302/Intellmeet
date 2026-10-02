export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskUserRef {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface TaskMeetingRef {
  id: string;
  title: string;
  roomId: string;
}

export interface TaskWorkspaceRef {
  id: string;
  name: string;
  slug: string;
}

export interface TaskActionItemRef {
  id: string;
  title: string;
  status: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  workspace?: TaskWorkspaceRef | string | null;
  meeting?: TaskMeetingRef | string | null;
  roomId?: string;
  actionItem?: TaskActionItemRef | string | null;
  assignee?: TaskUserRef | null;
  assigneeName?: string;
  createdBy: TaskUserRef;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDTO {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  workspaceId?: string;
  meetingId?: string;
  roomId?: string;
  actionItemId?: string;
  assigneeId?: string | null;
  assigneeName?: string;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  workspaceId?: string | null;
  assigneeId?: string | null;
  assigneeName?: string;
}

export interface ConvertActionItemDTO {
  actionItemId: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  workspaceId?: string;
  assigneeId?: string | null;
  assigneeName?: string;
}
