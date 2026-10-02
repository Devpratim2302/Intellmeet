import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z
    .string({ required_error: 'Task title is required' })
    .min(2, 'Task title must be at least 2 characters')
    .max(300, 'Task title cannot exceed 300 characters')
    .trim(),
  description: z
    .string()
    .max(2000, 'Task description cannot exceed 2000 characters')
    .optional()
    .default(''),
  status: z.enum(['todo', 'in_progress', 'completed']).optional().default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  dueDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .or(z.null())
    .optional(),
  workspaceId: z.string().optional(),
  meetingId: z.string().optional(),
  roomId: z.string().optional(),
  actionItemId: z.string().optional(),
  assigneeId: z.string().optional().nullable(),
  assigneeName: z.string().optional(),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(2, 'Task title must be at least 2 characters')
    .max(300, 'Task title cannot exceed 300 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .max(2000, 'Task description cannot exceed 2000 characters')
    .optional(),
  status: z.enum(['todo', 'in_progress', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .or(z.null())
    .optional(),
  workspaceId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  assigneeName: z.string().optional(),
});

export const convertActionItemSchema = z.object({
  actionItemId: z.string({ required_error: 'Action item ID is required' }).min(1),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .or(z.null())
    .optional(),
  workspaceId: z.string().optional(),
  assigneeId: z.string().optional().nullable(),
  assigneeName: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ConvertActionItemInput = z.infer<typeof convertActionItemSchema>;
