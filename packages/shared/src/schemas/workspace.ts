import { z } from 'zod';

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100),
  description: z.string().max(500).optional(),
});

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

export const AddWorkspaceMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'member', 'guest']).default('member'),
});

export const UpdateWorkspaceMemberSchema = z.object({
  role: z.enum(['owner', 'admin', 'member', 'guest']),
});

export const ListWorkspacesSchema = z.object({
  includeArchived: z.enum(['true', 'false']).default('false').optional(),
});

export const InviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member', 'guest']).default('member'),
});

export const TransferOwnershipSchema = z.object({
  newOwnerId: z.string().uuid('Invalid user ID'),
});

export const ListInvitationsSchema = z.object({});

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'guest']),
});

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required').max(128),
});

export const RejectInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required').max(128),
});

// ── Workspace Settings Schemas ──────────────────────────────

export const UpdateWorkspaceSettingsSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  logo: z.string().url('Invalid logo URL').nullable().optional(),
  brandColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .nullable()
    .optional(),
  customDomain: z.string().max(253).nullable().optional(),
});

// ── Role Management Schemas ─────────────────────────────────

export const CreateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(50),
  description: z.string().max(200).optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

export const UpdateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).nullable().optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

export const AssignRoleSchema = z.object({
  roleId: z.string().uuid('Invalid role ID'),
});

export const RevokeRoleSchema = z.object({
  roleId: z.string().uuid('Invalid role ID'),
});

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
export type AddWorkspaceMemberInput = z.infer<typeof AddWorkspaceMemberSchema>;
export type UpdateWorkspaceMemberInput = z.infer<typeof UpdateWorkspaceMemberSchema>;
export type ListWorkspacesInput = z.infer<typeof ListWorkspacesSchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export type TransferOwnershipInput = z.infer<typeof TransferOwnershipSchema>;
export type ListInvitationsInput = z.infer<typeof ListInvitationsSchema>;
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>;
export type RejectInvitationInput = z.infer<typeof RejectInvitationSchema>;
export type UpdateWorkspaceSettingsInput = z.infer<typeof UpdateWorkspaceSettingsSchema>;
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type AssignRoleInput = z.infer<typeof AssignRoleSchema>;
export type RevokeRoleInput = z.infer<typeof RevokeRoleSchema>;
