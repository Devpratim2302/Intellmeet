import { Request, Response, NextFunction } from 'express';
import { messageService } from '../services/message.service.js';

export const getMeetingMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const messages = await messageService.getMeetingMessages(id, limit);

    res.status(200).json({
      success: true,
      data: {
        messages,
        count: messages.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createMeetingMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { content } = req.body;

    const message = await messageService.createMessage({
      roomId: id,
      senderId: user._id.toString(),
      senderName: user.name,
      senderEmail: user.email,
      senderAvatar: user.avatar,
      content,
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};
