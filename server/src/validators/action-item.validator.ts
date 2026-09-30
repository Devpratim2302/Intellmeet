import { z } from 'zod';

export const createActionItemSchema = z.object({
  title: z
    .string({ required_error: 'Task title is required' })
    .min(2, 'Title must be at least 2 characters')
    .max(500, 'Title cannot exceed 500 characters'),
  description: z.string().optional(),
  assigneeName: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  workspaceId: z.string().optional(),
});

export const updateActionItemSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  title: z.string().min(2).max(500).optional(),
  description: z.string().optional(),
  assigneeName: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});
