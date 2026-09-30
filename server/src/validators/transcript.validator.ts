import { z } from 'zod';

export const addTranscriptSegmentSchema = z.object({
  text: z
    .string({ required_error: 'Segment text is required' })
    .min(1, 'Segment text cannot be empty')
    .max(5000, 'Segment text cannot exceed 5000 characters'),
  startTime: z.number().nonnegative().optional(),
  endTime: z.number().nonnegative().optional(),
  confidence: z.number().min(0).max(1).optional(),
  timestamp: z.string().datetime().optional(),
});

export type AddTranscriptSegmentInput = z.infer<typeof addTranscriptSegmentSchema>;
