import { api } from './api';
import { NotificationItem } from '../types/notification.types';

export interface NotificationResponse {
  notifications: NotificationItem[];
  unreadCount: number;
  count: number;
}

export const notificationApi = {
  /**
   * Fetch current user notifications
   */
  async getNotifications(options?: {
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationResponse> {
    const res = await api.get('/notifications', { params: options });
    return res.data.data;
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(id: string): Promise<NotificationItem> {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data.data.notification;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<number> {
    const res = await api.patch('/notifications/read-all');
    return res.data.data.updatedCount;
  },

  /**
   * Delete a notification
   */
  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },
};
