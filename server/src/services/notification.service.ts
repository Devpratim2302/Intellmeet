import mongoose from 'mongoose';
import { Notification, INotification, NotificationType } from '../models/notification.model.js';
import { getSocketIO } from '../sockets/index.js';

export interface CreateNotificationInput {
  recipient: string | mongoose.Types.ObjectId;
  sender?: string | mongoose.Types.ObjectId | null;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Creates a notification, persists to MongoDB, and delivers it via Socket.io in real-time
   */
  async createNotification(input: CreateNotificationInput): Promise<INotification> {
    const recipientId =
      typeof input.recipient === 'string'
        ? new mongoose.Types.ObjectId(input.recipient)
        : input.recipient;

    const senderId =
      input.sender && typeof input.sender === 'string'
        ? new mongoose.Types.ObjectId(input.sender)
        : (input.sender as mongoose.Types.ObjectId | null);

    const notification = new Notification({
      recipient: recipientId,
      sender: senderId || null,
      type: input.type,
      title: input.title.trim(),
      message: input.message.trim(),
      link: input.link?.trim() || '',
      read: false,
      metadata: input.metadata || {},
    });

    await notification.save();

    // Populate sender details for real-time delivery
    await notification.populate('sender', 'name email avatar');

    // Deliver via Socket.io
    try {
      const io = getSocketIO();
      if (io) {
        const roomName = `user:${recipientId.toString()}`;
        io.to(roomName).emit('notification:new', notification);
      }
    } catch (socketError) {
      console.warn('[NotificationService] Socket delivery warning:', socketError);
    }

    return notification;
  }

  /**
   * Retrieves notifications for a user, sorted descending by creation time
   */
  async getUserNotifications(
    userId: string | mongoose.Types.ObjectId,
    options?: { limit?: number; unreadOnly?: boolean }
  ): Promise<{ notifications: INotification[]; unreadCount: number }> {
    const uid = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const limit = options?.limit || 50;

    const query: any = { recipient: uid };
    if (options?.unreadOnly) {
      query.read = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('sender', 'name email avatar'),
      Notification.countDocuments({ recipient: uid, read: false }),
    ]);

    return { notifications, unreadCount };
  }

  /**
   * Marks a single notification as read
   */
  async markAsRead(
    notificationId: string,
    userId: string | mongoose.Types.ObjectId
  ): Promise<INotification | null> {
    const uid = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: uid },
      { read: true },
      { new: true }
    );

    return notification;
  }

  /**
   * Marks all notifications as read for a user
   */
  async markAllAsRead(userId: string | mongoose.Types.ObjectId): Promise<number> {
    const uid = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    const result = await Notification.updateMany(
      { recipient: uid, read: false },
      { read: true }
    );

    return result.modifiedCount;
  }

  /**
   * Deletes a notification
   */
  async deleteNotification(
    notificationId: string,
    userId: string | mongoose.Types.ObjectId
  ): Promise<boolean> {
    const uid = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    const result = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: uid,
    });

    return !!result;
  }
}

export const notificationService = new NotificationService();
