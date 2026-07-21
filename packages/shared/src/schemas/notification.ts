import { z } from 'zod';

export const CreateNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.string().min(1),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  actionUrl: z.string().url().optional(),
});

export const MarkNotificationReadSchema = z.object({
  read: z.boolean(),
});

export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type MarkNotificationReadInput = z.infer<typeof MarkNotificationReadSchema>;
