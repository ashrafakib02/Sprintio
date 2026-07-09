import { z } from 'zod';

export const CreateDocumentSchema = z.object({
  title: z.string().min(1).max(255),
  spaceId: z.string().uuid().optional(),
});

export const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.record(z.unknown()).optional(),
});

export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentSchema>;
