export interface MeetingSummary {
  id: string;
  meeting: string;
  roomId: string;
  overview: string;
  keyPoints: string[];
  decisions: string[];
  topics: string[];
  provider: string;
  aiModel?: string;
  createdAt: string;
  updatedAt: string;
}

export type ActionItemStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ActionItemPriority = 'low' | 'medium' | 'high';

export interface ActionItem {
  id: string;
  meeting: string;
  roomId: string;
  workspace?: string;
  title: string;
  description?: string;
  assigneeName?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  dueDate?: string;
  status: ActionItemStatus;
  priority: ActionItemPriority;
  sourceSnippet?: string;
  createdAt: string;
  updatedAt: string;
}
