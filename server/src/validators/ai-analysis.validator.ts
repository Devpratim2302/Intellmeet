import { z } from 'zod';

export const rawActionItemSchema = z.object({
  title: z
    .string({ required_error: 'Action item title is required' })
    .min(2, 'Task title must be at least 2 characters')
    .max(500, 'Task title cannot exceed 500 characters'),
  description: z.string().optional().default(''),
  assigneeName: z.string().nullable().optional().default(''),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  sourceSnippet: z.string().optional().default(''),
});

export const meetingAIResponseSchema = z.object({
  overview: z
    .string({ required_error: 'Overview is required' })
    .min(10, 'Overview must be at least 10 characters'),
  keyPoints: z
    .array(z.string().min(2))
    .min(1, 'At least one key discussion point is required'),
  decisions: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  actionItems: z.array(rawActionItemSchema).default([]),
});

export type ValidatedMeetingAIResponse = z.infer<typeof meetingAIResponseSchema>;
