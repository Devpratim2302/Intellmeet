import { Request, Response, NextFunction } from 'express';
import { taskService } from '../services/task.service.js';

export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || (req.user as any)?._id?.toString();
    const task = await taskService.createTask(req.body, userId);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: {
        task,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || (req.user as any)?._id?.toString();
    const { workspaceId, meetingId, roomId, status, priority, assigneeId, search } = req.query;

    const tasks = await taskService.getTasks(
      {
        workspaceId: workspaceId as string | undefined,
        meetingId: meetingId as string | undefined,
        roomId: roomId as string | undefined,
        status: status as any,
        priority: priority as any,
        assigneeId: assigneeId as string | undefined,
        search: search as string | undefined,
      },
      userId
    );

    res.status(200).json({
      success: true,
      data: {
        tasks,
        count: tasks.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const task = await taskService.getTaskById(id);

    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        task,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || (req.user as any)?._id?.toString();
    const { id } = req.params;

    const updatedTask = await taskService.updateTask(id, req.body, userId);

    if (!updatedTask) {
      res.status(404).json({
        success: false,
        message: 'Task not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: {
        task: updatedTask,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await taskService.deleteTask(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Task not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const convertActionItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || (req.user as any)?._id?.toString();
    const { actionItemId, priority, dueDate, workspaceId, assigneeId, assigneeName } = req.body;

    const { task, isNew } = await taskService.convertActionItemToTask(
      actionItemId,
      userId,
      { priority, dueDate, workspaceId, assigneeId, assigneeName }
    );

    res.status(isNew ? 201 : 200).json({
      success: true,
      message: isNew
        ? 'Action item successfully converted to trackable task'
        : 'Action item is already tracked as a task',
      data: {
        task,
        isNew,
      },
    });
  } catch (error) {
    next(error);
  }
};
