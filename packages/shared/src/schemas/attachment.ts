import { z } from 'zod';
import { MAX_FILE_SIZE } from '../constants/limits.js';

export const AttachmentSchema = z.object({
  id: z.string().uuid(),
  filename: z.string().min(1).max(255),
  url: z.string().url(),
  mimeType: z.string().min(1),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
  uploaderId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
});

export const CreateAttachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  url: z.string().url(),
  mimeType: z.string().min(1),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
  taskId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
});

export type AttachmentInput = z.infer<typeof AttachmentSchema>;
export type CreateAttachmentInput = z.infer<typeof CreateAttachmentSchema>;
