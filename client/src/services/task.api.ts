import { api } from './api';
import {
  Task,
  CreateTaskDTO,
  UpdateTaskDTO,
  ConvertActionItemDTO,
} from '../types/task.types';

export interface TaskFilterParams {
  workspaceId?: string;
  meetingId?: string;
  roomId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  search?: string;
}

export const taskApi = {
  /**
   * Fetch all tasks with optional filters
   */
  async getTasks(params?: TaskFilterParams): Promise<Task[]> {
    const res = await api.get('/tasks', { params });
    return res.data.data.tasks;
  },

  /**
   * Fetch single task by ID
   */
  async getTask(id: string): Promise<Task> {
    const res = await api.get(`/tasks/${id}`);
    return res.data.data.task;
  },

  /**
   * Create a new task
   */
  async createTask(data: CreateTaskDTO): Promise<Task> {
    const res = await api.post('/tasks', data);
    return res.data.data.task;
  },

  /**
   * Update an existing task
   */
  async updateTask(id: string, data: UpdateTaskDTO): Promise<Task> {
    const res = await api.patch(`/tasks/${id}`, data);
    return res.data.data.task;
  },

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },

  /**
   * Convert a meeting action item to a task
   */
  async convertActionItem(data: ConvertActionItemDTO): Promise<{ task: Task; isNew: boolean }> {
    const res = await api.post('/tasks/convert-action-item', data);
    return res.data.data;
  },
};
