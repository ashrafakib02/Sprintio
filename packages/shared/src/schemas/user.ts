import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
