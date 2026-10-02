import { z } from 'zod';

export const notificationQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .refine((val) => isNaN(val) || (val >= 1 && val <= 100), {
      message: 'Limit must be a number between 1 and 100',
    }),
  unreadOnly: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
