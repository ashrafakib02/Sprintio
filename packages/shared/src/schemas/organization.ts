import { z } from 'zod';

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100),
  description: z.string().max(500).optional(),
  website: z.string().url().max(500).optional(),
});

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  website: z.string().url().max(500).nullable().optional(),
});

export const AddOrganizationMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'member', 'guest']).default('member'),
});

export const UpdateOrganizationMemberSchema = z.object({
  role: z.enum(['owner', 'admin', 'member', 'guest']),
});

export const AddWorkspaceMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'member', 'guest']).default('member'),
});

export const UpdateWorkspaceMemberSchema = z.object({
  role: z.enum(['owner', 'admin', 'member', 'guest']),
});

export const ListOrganizationsSchema = z.object({
  includeArchived: z.enum(['true', 'false']).default('false').optional(),
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;
export type AddOrganizationMemberInput = z.infer<typeof AddOrganizationMemberSchema>;
export type UpdateOrganizationMemberInput = z.infer<typeof UpdateOrganizationMemberSchema>;
export type AddWorkspaceMemberInput = z.infer<typeof AddWorkspaceMemberSchema>;
export type UpdateWorkspaceMemberInput = z.infer<typeof UpdateWorkspaceMemberSchema>;
export type ListOrganizationsInput = z.infer<typeof ListOrganizationsSchema>;
