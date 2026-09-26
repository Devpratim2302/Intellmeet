import { Request, Response, NextFunction } from 'express';
import { meetingService } from '../services/meeting.service.js';

export const createMeeting = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const meeting = await meetingService.createMeeting(userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      data: { meeting },
    });
  } catch (error) {
    next(error);
  }
};

export const listMeetings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    const meetings = await meetingService.getUserMeetings(userId);

    res.status(200).json({
      success: true,
      data: { meetings, count: meetings.length },
    });
  } catch (error) {
    next(error);
  }
};

export const getMeeting = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const meeting = await meetingService.getMeeting(id);

    res.status(200).json({
      success: true,
      data: { meeting },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMeeting = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!._id.toString();
    const meeting = await meetingService.updateMeeting(id, userId, req.body);

    res.status(200).json({
      success: true,
      message: 'Meeting updated successfully',
      data: { meeting },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMeeting = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!._id.toString();
    await meetingService.deleteMeeting(id, userId);

    res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
