import { z } from 'zod';

export const ResendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>;
