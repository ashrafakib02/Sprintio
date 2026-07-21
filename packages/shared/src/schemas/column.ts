import { z } from 'zod';

export const CreateColumnSchema = z.object({
  name: z.string().min(1).max(50),
  boardId: z.string().uuid(),
  position: z.number().int().min(0),
  color: z.string().max(7).optional(),
});

export const UpdateColumnSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  position: z.number().int().min(0).optional(),
  color: z.string().max(7).nullable().optional(),
});

export type CreateColumnInput = z.infer<typeof CreateColumnSchema>;
export type UpdateColumnInput = z.infer<typeof UpdateColumnSchema>;
