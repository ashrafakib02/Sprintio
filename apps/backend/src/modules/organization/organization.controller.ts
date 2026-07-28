import type { Request, Response } from 'express';
import * as organizationService from './organization.service.js';
import { CreateOrganizationSchema, UpdateOrganizationSchema, AddOrganizationMemberSchema } from '@sprintio/shared';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/async-handler.js';

// ============================================================
// Handlers
// ============================================================

/**
 * POST /api/organizations
 * Create a new organization. Authenticated user becomes the owner.
 */
export const createOrganization = asyncHandler(async (req: Request, res: Response) => {
  const parsed = CreateOrganizationSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return res.status(400).json({ error: message });
  }

  const userId = req.user!.userId;
  const organization = await organizationService.createOrganization(userId, parsed.data);

  return sendSuccess(res, { organization }, 201);
});

/**
 * GET /api/organizations/:organizationId
 * Get an organization by ID.
 */
export const getOrganization = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.params.organizationId as string;
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  const organization = await organizationService.getOrganization(organizationId);

  return sendSuccess(res, { organization });
});

/**
 * GET /api/organizations
 * List all organizations the authenticated user belongs to.
 */
export const listOrganizations = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const organizations = await organizationService.getUserOrganizations(userId);

  return sendSuccess(res, { organizations });
});

/**
 * POST /api/organizations/:organizationId/members
 * Add a member to an organization. Requires MANAGE_MEMBERS permission.
 */
export const addMember = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.params.organizationId as string;
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  const parsed = AddOrganizationMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return res.status(400).json({ error: message });
  }

  const requestedBy = req.user!.userId;
  const member = await organizationService.addOrganizationMember(
    organizationId,
    parsed.data.userId,
    parsed.data.role,
    requestedBy,
  );

  return sendSuccess(res, { member }, 201);
});

/**
 * DELETE /api/organizations/:organizationId/members/:userId
 * Remove a member from an organization. Requires MANAGE_MEMBERS permission.
 */
export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.params.organizationId as string;
  const targetUserId = req.params.userId as string;

  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID is required' });
  }
  if (!targetUserId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const requestedBy = req.user!.userId;
  await organizationService.removeOrganizationMember(organizationId, targetUserId, requestedBy);

  return sendSuccess(res, { message: 'Member removed' });
});

/**
 * GET /api/organizations/:organizationId/members
 * List all members of an organization.
 */
export const listMembers = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.params.organizationId as string;
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  const members = await organizationService.getOrganizationMembers(organizationId);

  return sendSuccess(res, { members });
});

/**
 * PATCH /api/organizations/:organizationId
 * Update an organization. Requires UPDATE permission.
 */
export const updateOrganization = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.params.organizationId as string;
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  const parsed = UpdateOrganizationSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return res.status(400).json({ error: message });
  }

  const requestedBy = req.user!.userId;
  const organization = await organizationService.updateOrganization(
    organizationId,
    parsed.data,
    requestedBy,
  );

  return sendSuccess(res, { organization });
});

/**
 * POST /api/organizations/:organizationId/archive
 * Archive an organization. Requires UPDATE permission.
 */
export const archiveOrganization = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.params.organizationId as string;
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  const requestedBy = req.user!.userId;
  const organization = await organizationService.archiveOrganization(organizationId, requestedBy);

  return sendSuccess(res, { organization });
});

/**
 * POST /api/organizations/:organizationId/restore
 * Restore an archived organization. Requires UPDATE permission.
 */
export const restoreOrganization = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.params.organizationId as string;
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  const requestedBy = req.user!.userId;
  const organization = await organizationService.restoreOrganization(organizationId, requestedBy);

  return sendSuccess(res, { organization });
});

/**
 * DELETE /api/organizations/:organizationId
 * Permanently delete an organization. Requires DELETE permission.
 */
export const deleteOrganization = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.params.organizationId as string;
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  const requestedBy = req.user!.userId;
  await organizationService.deleteOrganization(organizationId, requestedBy);

  return sendSuccess(res, { message: 'Organization deleted' });
});
