export type NotificationType =
  | 'task_assigned'
  | 'task_status_changed'
  | 'meeting_ended'
  | 'summary_ready'
  | 'action_item_assigned'
  | 'mention'
  | 'general';

export interface NotificationSender {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  sender?: NotificationSender | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
