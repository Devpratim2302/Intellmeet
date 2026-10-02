import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service.js';

export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || (req.user as any)?._id?.toString();
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const unreadOnly = req.query.unreadOnly === 'true';

    const { notifications, unreadCount } = await notificationService.getUserNotifications(
      userId,
      { limit, unreadOnly }
    );

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
        count: notifications.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || (req.user as any)?._id?.toString();
    const { id } = req.params;

    const notification = await notificationService.markAsRead(id, userId);

    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found or unauthorized',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: {
        notification,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || (req.user as any)?._id?.toString();
    const updatedCount = await notificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        updatedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || (req.user as any)?._id?.toString();
    const { id } = req.params;

    const deleted = await notificationService.deleteNotification(id, userId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Notification not found or unauthorized',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
