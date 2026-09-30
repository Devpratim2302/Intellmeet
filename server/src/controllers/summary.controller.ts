import { Request, Response, NextFunction } from 'express';
import { meetingAnalysisService } from '../services/ai/meeting-analysis.service.js';
import { ActionItem } from '../models/action-item.model.js';

export const generateMeetingSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || (req.user as any)?._id?.toString();
    const provider = req.body.provider;
    const workspaceId = req.body.workspaceId;

    const { summary, actionItems } = await meetingAnalysisService.generateAnalysis(id, {
      userId,
      providerName: provider,
      workspaceId,
    });

    res.status(201).json({
      success: true,
      message: 'AI meeting summary and action items generated successfully',
      data: {
        summary,
        actionItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMeetingSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const summary = await meetingAnalysisService.getMeetingSummary(id);

    res.status(200).json({
      success: true,
      data: {
        summary: summary || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMeetingActionItems = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const status = req.query.status as string | undefined;

    const actionItems = await meetingAnalysisService.getMeetingActionItems(id, { status });

    res.status(200).json({
      success: true,
      data: {
        actionItems,
        count: actionItems.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createMeetingActionItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || (req.user as any)?._id?.toString();

    const actionItem = await meetingAnalysisService.createManualActionItem(id, {
      ...req.body,
      userId,
    });

    res.status(201).json({
      success: true,
      message: 'Action item created successfully',
      data: {
        actionItem,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateActionItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { itemId } = req.params;
    const updated = await meetingAnalysisService.updateActionItem(itemId, req.body);

    if (!updated) {
      res.status(404).json({
        success: false,
        message: 'Action item not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Action item updated successfully',
      data: {
        actionItem: updated,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteActionItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { itemId } = req.params;
    const deleted = await ActionItem.findByIdAndDelete(itemId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Action item not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Action item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
