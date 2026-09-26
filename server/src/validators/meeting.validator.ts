import { z } from 'zod';

export const createMeetingSchema = z.object({
  title: z
    .string({ required_error: 'Meeting title is required' })
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(120, 'Title cannot exceed 120 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  scheduledStartTime: z
    .string()
    .datetime({ message: 'scheduledStartTime must be a valid ISO date string' })
    .optional(),
  scheduledEndTime: z
    .string()
    .datetime({ message: 'scheduledEndTime must be a valid ISO date string' })
    .optional(),
});

export const updateMeetingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(120, 'Title cannot exceed 120 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  status: z
    .enum(['scheduled', 'active', 'completed', 'cancelled'], {
      errorMap: () => ({ message: 'Status must be scheduled, active, completed, or cancelled' }),
    })
    .optional(),
  scheduledStartTime: z
    .string()
    .datetime({ message: 'scheduledStartTime must be a valid ISO date string' })
    .optional(),
  scheduledEndTime: z
    .string()
    .datetime({ message: 'scheduledEndTime must be a valid ISO date string' })
    .optional(),
});
