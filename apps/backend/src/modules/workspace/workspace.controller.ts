import type { Request, Response } from 'express';
import * as workspaceService from './workspace.service.js';
import { CreateWorkspaceSchema, AddWorkspaceMemberSchema } from '@sprintio/shared';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/async-handler.js';

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
 * Get a workspace by ID.
 */
export const getWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID is required' });
  }

  const workspace = await workspaceService.getWorkspace(workspaceId);

  return sendSuccess(res, { workspace });
});

/**
 * GET /api/workspaces
 * List all workspaces the authenticated user belongs to.
 */
export const listWorkspaces = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const workspaces = await workspaceService.getUserWorkspaces(userId);

  return sendSuccess(res, { workspaces });
});

/**
 * GET /api/workspaces/:workspaceId/context
 * Get workspace context: workspace details + user's role.
 */
export const getWorkspaceContext = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID is required' });
  }

  const userId = req.user!.userId;
  const context = await workspaceService.resolveWorkspaceContext(workspaceId, userId);

  return sendSuccess(res, context);
});

/**
 * POST /api/workspaces/:workspaceId/members
 * Add a member to a workspace. Requires MANAGE_MEMBERS permission.
 */
export const addMember = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID is required' });
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

  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID is required' });
  }
  if (!targetUserId) {
    return res.status(400).json({ error: 'User ID is required' });
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
  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID is required' });
  }

  const members = await workspaceService.getWorkspaceMembers(workspaceId);

  return sendSuccess(res, { members });
});
