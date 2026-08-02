import type { Request, Response } from 'express';
import * as workspaceService from './workspace.service.js';
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  AddWorkspaceMemberSchema,
  ListWorkspacesSchema,
  InviteMemberSchema,
  TransferOwnershipSchema,
  UpdateWorkspaceSettingsSchema,
  CreateRoleSchema,
  UpdateRoleSchema,
  UuidSchema,
} from '@sprintio/shared';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/async-handler.js';

// ============================================================
// Helpers
// ============================================================

function validateUuid(value: string, label: string): string | null {
  const result = UuidSchema.safeParse(value);
  if (!result.success) {
    return `Invalid ${label} format`;
  }
  return null;
}

// ============================================================
// Handlers
// ============================================================

/**
 * POST /api/workspaces
 * Create a new workspace. Authenticated user becomes the owner.
 */
export const createWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const parsed = CreateWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return res.status(400).json({ error: message });
  }

  const userId = req.user!.userId;
  const organizationId = req.body.organizationId as string | undefined;

  const workspace = await workspaceService.createWorkspace(userId, {
    ...parsed.data,
    organizationId,
  });

  return sendSuccess(res, { workspace }, 201);
});

/**
 * GET /api/workspaces/:workspaceId
 * Get a workspace by ID. Requires membership.
 */
export const getWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const uuidError = validateUuid(workspaceId, 'workspace ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const requestedBy = req.user!.userId;
  const workspace = await workspaceService.getWorkspace(workspaceId, requestedBy);

  return sendSuccess(res, { workspace });
});

/**
 * GET /api/workspaces
 * List all workspaces the authenticated user belongs to.
 */
export const listWorkspaces = asyncHandler(async (req: Request, res: Response) => {
  const parsed = ListWorkspacesSchema.safeParse(req.query);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return res.status(400).json({ error: message });
  }

  const userId = req.user!.userId;
  const includeArchived = parsed.data.includeArchived === 'true';
  const workspaces = await workspaceService.getUserWorkspaces(
    userId,
    parsed.data.organizationId,
    includeArchived,
  );

  return sendSuccess(res, { workspaces });
});

/**
 * GET /api/workspaces/:workspaceId/context
 * Get workspace context: workspace details + user's role.
 */
export const getWorkspaceContext = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const uuidError = validateUuid(workspaceId, 'workspace ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const userId = req.user!.userId;
  const context = await workspaceService.resolveWorkspaceContext(workspaceId, userId);

  return sendSuccess(res, context);
});

/**
 * POST /api/workspaces/:workspaceId/switch
 * Switch to a workspace - validates membership and returns workspace context.
 * This is used by the frontend workspace switcher to validate and fetch workspace data.
 */
export const switchWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const uuidError = validateUuid(workspaceId, 'workspace ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const userId = req.user!.userId;
  const context = await workspaceService.resolveWorkspaceContext(workspaceId, userId);

  return sendSuccess(res, context);
});

/**
 * PATCH /api/workspaces/:workspaceId
 * Update a workspace. Requires UPDATE permission.
 */
export const updateWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const uuidError = validateUuid(workspaceId, 'workspace ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const parsed = UpdateWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return res.status(400).json({ error: message });
  }

  const requestedBy = req.user!.userId;
  const workspace = await workspaceService.updateWorkspace(workspaceId, parsed.data, requestedBy);

  return sendSuccess(res, { workspace });
});

/**
 * POST /api/workspaces/:workspaceId/archive
 * Archive a workspace. Requires UPDATE permission.
 */
export const archiveWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const uuidError = validateUuid(workspaceId, 'workspace ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const requestedBy = req.user!.userId;
  const workspace = await workspaceService.archiveWorkspace(workspaceId, requestedBy);

  return sendSuccess(res, { workspace });
});

/**
 * POST /api/workspaces/:workspaceId/restore
 * Restore an archived workspace. Requires UPDATE permission.
 */
export const restoreWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const uuidError = validateUuid(workspaceId, 'workspace ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const requestedBy = req.user!.userId;
  const workspace = await workspaceService.restoreWorkspace(workspaceId, requestedBy);

  return sendSuccess(res, { workspace });
});

/**
 * DELETE /api/workspaces/:workspaceId
 * Permanently delete a workspace. Requires DELETE permission.
 */
export const deleteWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const uuidError = validateUuid(workspaceId, 'workspace ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const requestedBy = req.user!.userId;
  await workspaceService.deleteWorkspace(workspaceId, requestedBy);

  return sendSuccess(res, { message: 'Workspace deleted' });
});

/**
 * POST /api/workspaces/:workspaceId/members
 * Add a member to a workspace. Requires MANAGE_MEMBERS permission.
 */
export const addMember = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const uuidError = validateUuid(workspaceId, 'workspace ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const parsed = AddWorkspaceMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return res.status(400).json({ error: message });
  }

  const requestedBy = req.user!.userId;
  const member = await workspaceService.addWorkspaceMember(
    workspaceId,
    parsed.data.userId,
    parsed.data.role,
    requestedBy,
  );

  return sendSuccess(res, { member }, 201);
});

/**
 * DELETE /api/workspaces/:workspaceId/members/:userId
 * Remove a member from a workspace. Requires MANAGE_MEMBERS permission.
 */
export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const targetUserId = req.params.userId as string;

  const wsError = validateUuid(workspaceId, 'workspace ID');
  if (wsError) {
    return res.status(400).json({ error: wsError });
  }
  const userError = validateUuid(targetUserId, 'user ID');
  if (userError) {
    return res.status(400).json({ error: userError });
  }

  const requestedBy = req.user!.userId;
  await workspaceService.removeWorkspaceMember(workspaceId, targetUserId, requestedBy);

  return sendSuccess(res, { message: 'Member removed' });
});

/**
 * GET /api/workspaces/:workspaceId/members
 * List all members of a workspace.
 */
export const listMembers = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const uuidError = validateUuid(workspaceId, 'workspace ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const requestedBy = req.user!.userId;
  const members = await workspaceService.getWorkspaceMembers(workspaceId, requestedBy);

  return sendSuccess(res, { members });
});

// ============================================================
// Invitation Handlers
// ============================================================

/**
 * POST /api/workspaces/:workspaceId/invitations
 * Invite a user to a workspace by email. Requires MANAGE_MEMBERS permission.
 */
export const inviteMember = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const uuidError = validateUuid(workspaceId, 'workspace ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const parsed = InviteMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return res.status(400).json({ error: message });
  }

  const requestedBy = req.user!.userId;
  const invitation = await workspaceService.inviteWorkspaceMember(
    workspaceId,
    parsed.data.email,
    parsed.data.role,
    requestedBy,
  );

  return sendSuccess(res, { invitation }, 201);
});

/**
 * POST /api/workspaces/invitations/accept
 * Accept a workspace invitation by token.
 */
export const acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string };
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Invitation token is required' });
  }

  const userId = req.user!.userId;
  const email = req.user!.email;
  const member = await workspaceService.acceptInvitation(token, userId, email);

  return sendSuccess(res, { member });
});

/**
 * POST /api/workspaces/invitations/reject
 * Reject a workspace invitation by token.
 */
export const rejectInvitation = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string };
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Invitation token is required' });
  }

  const userId = req.user!.userId;
  const email = req.user!.email;
  await workspaceService.rejectInvitation(token, userId, email);

  return sendSuccess(res, { message: 'Invitation rejected' });
});

/**
 * GET /api/workspaces/:workspaceId/invitations
 * List pending invitations for a workspace. Requires MANAGE_MEMBERS permission.
 */
export const listInvitations = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const uuidError = validateUuid(workspaceId, 'workspace ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const requestedBy = req.user!.userId;
  const invitations = await workspaceService.getWorkspaceInvitations(workspaceId, requestedBy);

  return sendSuccess(res, { invitations });
});

/**
 * POST /api/workspaces/:workspaceId/transfer-ownership
 * Transfer workspace ownership to another member.
 */
export const transferOwnership = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const uuidError = validateUuid(workspaceId, 'workspace ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const parsed = TransferOwnershipSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return res.status(400).json({ error: message });
  }

  const requestedBy = req.user!.userId;
  const result = await workspaceService.transferOwnership(workspaceId, parsed.data, requestedBy);

  return sendSuccess(res, result);
});

// ============================================================
// Workspace Settings Handlers
// ============================================================

/**
 * PATCH /api/workspaces/:workspaceId/settings
 * Update workspace settings (branding, general info).
 */
export const updateWorkspaceSettings = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const uuidError = validateUuid(workspaceId, 'workspace ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const parsed = UpdateWorkspaceSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return res.status(400).json({ error: message });
  }

  const requestedBy = req.user!.userId;
  const workspace = await workspaceService.updateWorkspaceSettings(
    workspaceId,
    parsed.data,
    requestedBy,
  );

  return sendSuccess(res, { workspace });
});

// ============================================================
// Role Management Handlers
// ============================================================

/**
 * GET /api/workspaces/:workspaceId/roles
 * List all roles for a workspace.
 */
export const getWorkspaceRoles = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const uuidError = validateUuid(workspaceId, 'workspace ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const requestedBy = req.user!.userId;
  const roles = await workspaceService.getWorkspaceRoles(workspaceId, requestedBy);

  return sendSuccess(res, { roles });
});

/**
 * POST /api/workspaces/:workspaceId/roles
 * Create a custom role for a workspace.
 */
export const createWorkspaceRole = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const uuidError = validateUuid(workspaceId, 'workspace ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const parsed = CreateRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return res.status(400).json({ error: message });
  }

  const requestedBy = req.user!.userId;
  const role = await workspaceService.createWorkspaceRole(workspaceId, parsed.data, requestedBy);

  return sendSuccess(res, { role }, 201);
});

/**
 * PATCH /api/workspaces/:workspaceId/roles/:roleId
 * Update a custom role.
 */
export const updateWorkspaceRole = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const roleId = req.params.roleId as string;

  const wsError = validateUuid(workspaceId, 'workspace ID');
  if (wsError) return res.status(400).json({ error: wsError });

  const roleError = validateUuid(roleId, 'role ID');
  if (roleError) return res.status(400).json({ error: roleError });

  const parsed = UpdateRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return res.status(400).json({ error: message });
  }

  const requestedBy = req.user!.userId;
  const role = await workspaceService.updateWorkspaceRole(
    workspaceId,
    roleId,
    parsed.data,
    requestedBy,
  );

  return sendSuccess(res, { role });
});

/**
 * DELETE /api/workspaces/:workspaceId/roles/:roleId
 * Delete a custom role.
 */
export const deleteWorkspaceRole = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const roleId = req.params.roleId as string;

  const wsError = validateUuid(workspaceId, 'workspace ID');
  if (wsError) return res.status(400).json({ error: wsError });

  const roleError = validateUuid(roleId, 'role ID');
  if (roleError) return res.status(400).json({ error: roleError });

  const requestedBy = req.user!.userId;
  await workspaceService.deleteWorkspaceRole(workspaceId, roleId, requestedBy);

  return sendSuccess(res, { message: 'Role deleted' });
});

/**
 * GET /api/workspaces/permissions
 * List all available permissions.
 */
export const listPermissions = asyncHandler(async (_req: Request, res: Response) => {
  const permissions = await workspaceService.listPermissions();
  return sendSuccess(res, { permissions });
});

/**
 * PATCH /api/workspaces/:workspaceId/members/:userId/role
 * Update a member's role.
 */
export const updateMemberRoleHandler = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const userId = req.params.userId as string;

  const wsError = validateUuid(workspaceId, 'workspace ID');
  if (wsError) return res.status(400).json({ error: wsError });

  const userError = validateUuid(userId, 'user ID');
  if (userError) return res.status(400).json({ error: userError });

  const { role: newRole } = req.body as { role?: string };
  if (!newRole || typeof newRole !== 'string') {
    return res.status(400).json({ error: 'Role is required' });
  }

  const requestedBy = req.user!.userId;
  const member = await workspaceService.updateMemberRole(workspaceId, userId, newRole, requestedBy);

  return sendSuccess(res, { member });
});
