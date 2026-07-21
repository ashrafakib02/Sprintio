import { z } from 'zod';
import { BOARD_VIEW_TYPES } from '../constants/status.js';

export const BoardViewTypeSchema = z.enum(BOARD_VIEW_TYPES);

export const CreateBoardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  spaceId: z.string().uuid().optional(),
});

export const UpdateBoardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

export type CreateBoardInput = z.infer<typeof CreateBoardSchema>;
export type UpdateBoardInput = z.infer<typeof UpdateBoardSchema>;
