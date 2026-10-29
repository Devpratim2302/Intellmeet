import mongoose from 'mongoose';
import { Task, ITask, TaskStatus, TaskPriority } from '../models/task.model.js';
import { ActionItem } from '../models/action-item.model.js';
import { Meeting } from '../models/meeting.model.js';
import { User } from '../models/user.model.js';
import { Workspace } from '../models/workspace.model.js';
import { notificationService } from './notification.service.js';

export interface TaskFilterOptions {
  workspaceId?: string;
  meetingId?: string;
  roomId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  search?: string;
}

export class TaskService {
  /**
   * Create a new task and notify the assignee if one is assigned
   */
  async createTask(
    data: {
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDate?: Date | string | null;
      workspaceId?: string;
      meetingId?: string;
      roomId?: string;
      actionItemId?: string;
      assigneeId?: string | null;
      assigneeName?: string;
    },
    creatorUserId: string
  ): Promise<ITask> {
    let workspaceObjId: mongoose.Types.ObjectId | null = null;
    if (data.workspaceId && mongoose.Types.ObjectId.isValid(data.workspaceId)) {
      workspaceObjId = new mongoose.Types.ObjectId(data.workspaceId);
    }

    let meetingObjId: mongoose.Types.ObjectId | null = null;
    let normalizedRoomId = data.roomId ? data.roomId.trim().toLowerCase() : '';

    if (data.meetingId) {
      if (mongoose.Types.ObjectId.isValid(data.meetingId)) {
        meetingObjId = new mongoose.Types.ObjectId(data.meetingId);
      } else {
        const found = await Meeting.findOne({ roomId: data.meetingId.toLowerCase() });
        if (found) {
          meetingObjId = found._id as mongoose.Types.ObjectId;
          normalizedRoomId = found.roomId;
        }
      }
    }

    if (!normalizedRoomId && meetingObjId) {
      const found = await Meeting.findById(meetingObjId);
      if (found) {
        normalizedRoomId = found.roomId;
        if (!workspaceObjId && found.workspace) {
          workspaceObjId = found.workspace as mongoose.Types.ObjectId;
        }
      }
    }

    let assigneeObjId: mongoose.Types.ObjectId | null = null;
    let assigneeDisplayName = data.assigneeName?.trim() || '';

    if (data.assigneeId && mongoose.Types.ObjectId.isValid(data.assigneeId)) {
      assigneeObjId = new mongoose.Types.ObjectId(data.assigneeId);
      const assigneeUser = await User.findById(assigneeObjId);
      if (assigneeUser) {
        assigneeDisplayName = assigneeUser.name;
      }
    } else if (assigneeDisplayName && !assigneeObjId) {
      // Try to match registered user by name
      const matchedUser = await User.findOne({
        name: { $regex: new RegExp(`^${assigneeDisplayName}$`, 'i') },
      });
      if (matchedUser) {
        assigneeObjId = matchedUser._id as mongoose.Types.ObjectId;
      }
    }

    const task = new Task({
      title: data.title.trim(),
      description: data.description?.trim() || '',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      workspace: workspaceObjId,
      meeting: meetingObjId,
      roomId: normalizedRoomId,
      actionItem:
        data.actionItemId && mongoose.Types.ObjectId.isValid(data.actionItemId)
          ? new mongoose.Types.ObjectId(data.actionItemId)
          : null,
      assignee: assigneeObjId,
      assigneeName: assigneeDisplayName,
      createdBy: new mongoose.Types.ObjectId(creatorUserId),
    });

    await task.save();
    await task.populate([
      { path: 'assignee', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'workspace', select: 'name slug' },
      { path: 'meeting', select: 'title roomId' },
    ]);

    // 1. Dispatch confirmation notification to the task creator
    try {
      await notificationService.createNotification({
        recipient: creatorUserId,
        sender: creatorUserId,
        type: 'task_created',
        title: 'Task Created',
        message: `Task "${task.title}" created successfully${assigneeDisplayName ? ` and assigned to ${assigneeDisplayName}` : ''}`,
        link: `/tasks?taskId=${task.id}`,
        metadata: {
          taskId: task.id,
          workspaceId: task.workspace?.toString(),
          meetingId: task.meeting?.toString(),
          roomId: task.roomId,
        },
      });
    } catch (notifErr) {
      console.warn('[TaskService] Creator task notification delivery failed:', notifErr);
    }

    // 2. Dispatch assignment notification if assignee is different from creator
    if (assigneeObjId && assigneeObjId.toString() !== creatorUserId) {
      try {
        await notificationService.createNotification({
          recipient: assigneeObjId,
          sender: creatorUserId,
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `You were assigned to: "${task.title}"`,
          link: `/tasks?taskId=${task.id}`,
          metadata: {
            taskId: task.id,
            workspaceId: task.workspace?.toString(),
            meetingId: task.meeting?.toString(),
            roomId: task.roomId,
          },
        });
      } catch (notifErr) {
        console.warn('[TaskService] Assignee task notification delivery failed:', notifErr);
      }
    }

    return task;
  }

  /**
   * Get tasks with comprehensive filtering and user-scoped data isolation.
   * Users only see tasks they created, are assigned to, or belong to workspaces/meetings they are members of.
   * In Demo Mode, Demo Admin sees the pre-provisioned evaluation tasks.
   */
  async getTasks(filter: TaskFilterOptions, currentUserId?: string): Promise<ITask[]> {
    const conditions: any[] = [];

    // Isolate tasks to current user's realm (creator, assignee, workspace member, meeting participant)
    if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
      const userObjId = new mongoose.Types.ObjectId(currentUserId);

      // Find workspaces where user is owner or member
      const userWorkspaces = await Workspace.find({
        $or: [{ owner: userObjId }, { 'members.user': userObjId }],
      }).select('_id');
      const workspaceIds = userWorkspaces.map((w) => w._id);

      // Find meetings where user is host or participant
      const userMeetings = await Meeting.find({
        $or: [{ host: userObjId }, { participants: userObjId }],
      }).select('_id');
      const meetingIds = userMeetings.map((m) => m._id);

      const accessConditions: any[] = [
        { createdBy: userObjId },
        { assignee: userObjId },
      ];
      if (workspaceIds.length > 0) {
        accessConditions.push({ workspace: { $in: workspaceIds } });
      }
      if (meetingIds.length > 0) {
        accessConditions.push({ meeting: { $in: meetingIds } });
      }

      conditions.push({ $or: accessConditions });
    }

    if (filter.workspaceId) {
      if (mongoose.Types.ObjectId.isValid(filter.workspaceId)) {
        conditions.push({ workspace: new mongoose.Types.ObjectId(filter.workspaceId) });
      }
    }

    if (filter.meetingId) {
      if (mongoose.Types.ObjectId.isValid(filter.meetingId)) {
        conditions.push({ meeting: new mongoose.Types.ObjectId(filter.meetingId) });
      }
    }

    if (filter.roomId) {
      conditions.push({ roomId: filter.roomId.trim().toLowerCase() });
    }

    if (filter.status) {
      conditions.push({ status: filter.status });
    }

    if (filter.priority) {
      conditions.push({ priority: filter.priority });
    }

    if (filter.assigneeId) {
      if (filter.assigneeId === 'me' && currentUserId) {
        conditions.push({ assignee: new mongoose.Types.ObjectId(currentUserId) });
      } else if (mongoose.Types.ObjectId.isValid(filter.assigneeId)) {
        conditions.push({ assignee: new mongoose.Types.ObjectId(filter.assigneeId) });
      }
    }

    if (filter.search) {
      const regex = new RegExp(filter.search.trim(), 'i');
      conditions.push({
        $or: [{ title: regex }, { description: regex }, { assigneeName: regex }],
      });
    }

    const finalQuery =
      conditions.length === 0
        ? {}
        : conditions.length === 1
          ? conditions[0]
          : { $and: conditions };

    return Task.find(finalQuery)
      .sort({ createdAt: -1 })
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('workspace', 'name slug')
      .populate('meeting', 'title roomId')
      .populate('actionItem', 'title status');
  }

  /**
   * Get a single task by ID
   */
  async getTaskById(taskId: string): Promise<ITask | null> {
    if (!mongoose.Types.ObjectId.isValid(taskId)) return null;
    return Task.findById(taskId)
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('workspace', 'name slug')
      .populate('meeting', 'title roomId')
      .populate('actionItem', 'title status');
  }

  /**
   * Update an existing task
   */
  async updateTask(
    taskId: string,
    updates: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      dueDate: Date | string | null;
      workspaceId: string | null;
      assigneeId: string | null;
      assigneeName: string;
    }>,
    userId: string
  ): Promise<ITask | null> {
    if (!mongoose.Types.ObjectId.isValid(taskId)) return null;

    const task = await Task.findById(taskId);
    if (!task) return null;

    const previousAssignee = task.assignee ? task.assignee.toString() : null;
    const previousStatus = task.status;

    if (updates.title !== undefined) task.title = updates.title.trim();
    if (updates.description !== undefined) task.description = updates.description.trim();
    if (updates.status !== undefined) task.status = updates.status;
    if (updates.priority !== undefined) task.priority = updates.priority;
    if (updates.dueDate !== undefined) {
      task.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
    }

    if (updates.workspaceId !== undefined) {
      task.workspace =
        updates.workspaceId && mongoose.Types.ObjectId.isValid(updates.workspaceId)
          ? new mongoose.Types.ObjectId(updates.workspaceId)
          : null;
    }

    if (updates.assigneeId !== undefined) {
      if (updates.assigneeId && mongoose.Types.ObjectId.isValid(updates.assigneeId)) {
        task.assignee = new mongoose.Types.ObjectId(updates.assigneeId);
        const user = await User.findById(task.assignee);
        if (user) task.assigneeName = user.name;
      } else {
        task.assignee = null;
      }
    }

    if (updates.assigneeName !== undefined) {
      task.assigneeName = updates.assigneeName.trim();
    }

    await task.save();
    await task.populate([
      { path: 'assignee', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'workspace', select: 'name slug' },
      { path: 'meeting', select: 'title roomId' },
      { path: 'actionItem', select: 'title status' },
    ]);

    // Helper to safely resolve entity ID string regardless of population state
    const resolveEntityId = (entity: any): string | null => {
      if (!entity) return null;
      if (typeof entity === 'string') return entity;
      if (entity._id) return entity._id.toString();
      if (typeof entity.toString === 'function' && entity.toString() !== '[object Object]') {
        return entity.toString();
      }
      return null;
    };

    // Check if new assignee was assigned
    const newAssignee = resolveEntityId(task.assignee);
    if (newAssignee && newAssignee !== previousAssignee && newAssignee !== userId) {
      try {
        await notificationService.createNotification({
          recipient: newAssignee,
          sender: userId,
          type: 'task_assigned',
          title: 'Task Assigned To You',
          message: `You were assigned to: "${task.title}"`,
          link: `/tasks?taskId=${task.id}`,
          metadata: { taskId: task.id },
        });
      } catch (err) {
        console.warn('[TaskService] Notification delivery warning:', err);
      }
    }

    // Check if status changed
    if (updates.status && updates.status !== previousStatus) {
      const assigneeStr = resolveEntityId(task.assignee);
      const createdByStr = resolveEntityId(task.createdBy);
      const targetUser =
        assigneeStr && assigneeStr !== userId
          ? assigneeStr
          : createdByStr && createdByStr !== userId
            ? createdByStr
            : null;

      if (targetUser) {
        try {
          await notificationService.createNotification({
            recipient: targetUser,
            sender: userId,
            type: 'task_status_changed',
            title: 'Task Status Updated',
            message: `Task "${task.title}" was moved to ${task.status.toUpperCase().replace('_', ' ')}`,
            link: `/tasks?taskId=${task.id}`,
            metadata: { taskId: task.id, status: task.status },
          });
        } catch (err) {
          console.warn('[TaskService] Status notification warning:', err);
        }
      }
    }

    return task;
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(taskId)) return false;
    const result = await Task.findByIdAndDelete(taskId);
    return !!result;
  }

  /**
   * Convert a meeting ActionItem into a trackable Task
   */
  async convertActionItemToTask(
    actionItemId: string,
    creatorUserId: string,
    overrides?: {
      priority?: TaskPriority;
      dueDate?: Date | string | null;
      workspaceId?: string;
      assigneeId?: string | null;
      assigneeName?: string;
    }
  ): Promise<{ task: ITask; isNew: boolean }> {
    if (!mongoose.Types.ObjectId.isValid(actionItemId)) {
      const error: any = new Error('Invalid action item ID format');
      error.statusCode = 400;
      throw error;
    }

    const actionItem = await ActionItem.findById(actionItemId);
    if (!actionItem) {
      const error: any = new Error('Action item not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if this action item is already converted to a task
    let existingTask = await Task.findOne({ actionItem: actionItem._id }).populate([
      { path: 'assignee', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'workspace', select: 'name slug' },
      { path: 'meeting', select: 'title roomId' },
    ]);

    if (existingTask) {
      return { task: existingTask, isNew: false };
    }

    // Fetch meeting details to ensure accurate roomId and workspace linkage
    const meeting = await Meeting.findById(actionItem.meeting);

    let assigneeId: mongoose.Types.ObjectId | null | undefined = actionItem.assignee;
    let assigneeName = actionItem.assigneeName || '';

    if (overrides?.assigneeId !== undefined) {
      assigneeId =
        overrides.assigneeId && mongoose.Types.ObjectId.isValid(overrides.assigneeId)
          ? new mongoose.Types.ObjectId(overrides.assigneeId)
          : null;
    }
    if (overrides?.assigneeName) {
      assigneeName = overrides.assigneeName;
    }

    const newTask = new Task({
      title: actionItem.title,
      description: actionItem.description || actionItem.sourceSnippet || '',
      status: actionItem.status === 'completed' ? 'completed' : 'todo',
      priority: overrides?.priority || (actionItem.priority as TaskPriority) || 'medium',
      dueDate: overrides?.dueDate
        ? new Date(overrides.dueDate)
        : actionItem.dueDate || null,
      workspace: overrides?.workspaceId && mongoose.Types.ObjectId.isValid(overrides.workspaceId)
        ? new mongoose.Types.ObjectId(overrides.workspaceId)
        : actionItem.workspace || meeting?.workspace || null,
      meeting: actionItem.meeting,
      roomId: actionItem.roomId || meeting?.roomId || '',
      actionItem: actionItem._id,
      assignee: assigneeId,
      assigneeName,
      createdBy: new mongoose.Types.ObjectId(creatorUserId),
    });

    await newTask.save();
    await newTask.populate([
      { path: 'assignee', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'workspace', select: 'name slug' },
      { path: 'meeting', select: 'title roomId' },
      { path: 'actionItem', select: 'title status' },
    ]);

    // Dispatch assignment notification if assignee is set and differs from creator
    if (assigneeId && assigneeId.toString() !== creatorUserId) {
      try {
        await notificationService.createNotification({
          recipient: assigneeId,
          sender: creatorUserId,
          type: 'task_assigned',
          title: 'New Task From Meeting Action Item',
          message: `An action item from meeting "${meeting?.title || actionItem.roomId}" was assigned to you as a task: "${newTask.title}"`,
          link: `/tasks?taskId=${newTask.id}`,
          metadata: {
            taskId: newTask.id,
            actionItemId: actionItem.id,
            meetingId: meeting?.id,
            roomId: actionItem.roomId,
          },
        });
      } catch (err) {
        console.warn('[TaskService] Notification error:', err);
      }
    }

    return { task: newTask, isNew: true };
  }
}

export const taskService = new TaskService();
