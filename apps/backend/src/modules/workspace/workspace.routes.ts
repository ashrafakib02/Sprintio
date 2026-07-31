import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createWorkspace,
  getWorkspace,
  listWorkspaces,
  getWorkspaceContext,
  switchWorkspace,
  updateWorkspace,
  archiveWorkspace,
  restoreWorkspace,
  deleteWorkspace,
  addMember,
  removeMember,
  listMembers,
  inviteMember,
  acceptInvitation,
  rejectInvitation,
  listInvitations,
  transferOwnership,
  updateWorkspaceSettings,
  getWorkspaceRoles,
  createWorkspaceRole,
  updateWorkspaceRole,
  deleteWorkspaceRole,
  listPermissions,
  updateMemberRoleHandler,
} from './workspace.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireWorkspace } from '../../middleware/tenant.js';
import { requireWorkspacePermission } from '../../middleware/rbac.js';

// ── Rate limiters ────────────────────────────────────────────
const workspaceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

const memberLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

// ── Router ───────────────────────────────────────────────────
const router: ReturnType<typeof Router> = Router();

// Create workspace (authenticated)
router.post(
  '/',
  authenticate,
  workspaceLimiter as unknown as express.RequestHandler,
  createWorkspace,
);

// List user's workspaces (authenticated)
router.get('/', authenticate, listWorkspaces);

// Get workspace by ID (authenticated, must be member via tenant middleware)
router.get('/:workspaceId', authenticate, requireWorkspace, getWorkspace);

// Get workspace context: workspace + user's role (authenticated, must be member)
router.get('/:workspaceId/context', authenticate, requireWorkspace, getWorkspaceContext);

// Switch workspace - validates membership and returns workspace context
router.post('/:workspaceId/switch', authenticate, requireWorkspace, switchWorkspace);

// Update workspace (authenticated, requires UPDATE permission)
router.patch(
  '/:workspaceId',
  authenticate,
  requireWorkspace,
  requireWorkspacePermission('workspace:update'),
  updateWorkspace,
);

// Archive workspace (authenticated, requires UPDATE permission)
router.post(
  '/:workspaceId/archive',
  authenticate,
  requireWorkspace,
  requireWorkspacePermission('workspace:update'),
  archiveWorkspace,
);

// Restore workspace (authenticated, requires UPDATE permission)
router.post(
  '/:workspaceId/restore',
  authenticate,
  requireWorkspace,
  requireWorkspacePermission('workspace:update'),
  restoreWorkspace,
);

// Delete workspace (authenticated, requires DELETE permission)
router.delete(
  '/:workspaceId',
  authenticate,
  requireWorkspace,
  requireWorkspacePermission('workspace:delete'),
  deleteWorkspace,
);

// Add member to workspace (authenticated, requires MANAGE_MEMBERS permission)
router.post(
  '/:workspaceId/members',
  authenticate,
  requireWorkspace,
  memberLimiter as unknown as express.RequestHandler,
  requireWorkspacePermission('workspace:manage_members'),
  addMember,
);

// Remove member from workspace (authenticated, requires MANAGE_MEMBERS permission)
router.delete(
  '/:workspaceId/members/:userId',
  authenticate,
  requireWorkspace,
  requireWorkspacePermission('workspace:manage_members'),
  removeMember,
);

// List workspace members (authenticated, must be member)
router.get('/:workspaceId/members', authenticate, requireWorkspace, listMembers);

// ============================================================
// Invitation Routes
// ============================================================

// Invite member to workspace (authenticated, requires MANAGE_MEMBERS permission)
router.post(
  '/:workspaceId/invitations',
  authenticate,
  requireWorkspace,
  memberLimiter as unknown as express.RequestHandler,
  requireWorkspacePermission('workspace:manage_members'),
  inviteMember,
);

// List pending invitations for workspace (authenticated, requires MANAGE_MEMBERS permission)
router.get(
  '/:workspaceId/invitations',
  authenticate,
  requireWorkspace,
  requireWorkspacePermission('workspace:manage_members'),
  listInvitations,
);

// Accept invitation (authenticated, no workspace membership required)
router.post('/invitations/accept', authenticate, acceptInvitation);

// Reject invitation (authenticated, no workspace membership required)
router.post('/invitations/reject', authenticate, rejectInvitation);

// Transfer ownership (authenticated, requires workspace ownership)
router.post(
  '/:workspaceId/transfer-ownership',
  authenticate,
  requireWorkspace,
  requireWorkspacePermission('workspace:update'),
  transferOwnership,
);

// ============================================================
// Workspace Settings Routes
// ============================================================

// Update workspace settings (branding, general info)
router.patch(
  '/:workspaceId/settings',
  authenticate,
  requireWorkspace,
  requireWorkspacePermission('workspace:settings'),
  updateWorkspaceSettings,
);

// ============================================================
// Role Management Routes
// ============================================================

// List all roles for a workspace
router.get(
  '/:workspaceId/roles',
  authenticate,
  requireWorkspace,
  requireWorkspacePermission('workspace:manage_roles'),
  getWorkspaceRoles,
);

// Create a custom role
router.post(
  '/:workspaceId/roles',
  authenticate,
  requireWorkspace,
  memberLimiter as unknown as express.RequestHandler,
  requireWorkspacePermission('workspace:manage_roles'),
  createWorkspaceRole,
);

// Update a custom role
router.patch(
  '/:workspaceId/roles/:roleId',
  authenticate,
  requireWorkspace,
  requireWorkspacePermission('workspace:manage_roles'),
  updateWorkspaceRole,
);

// Delete a custom role
router.delete(
  '/:workspaceId/roles/:roleId',
  authenticate,
  requireWorkspace,
  requireWorkspacePermission('workspace:manage_roles'),
  deleteWorkspaceRole,
);

// List all available permissions
router.get('/permissions', authenticate, listPermissions);

// Update a member's role
router.patch(
  '/:workspaceId/members/:userId/role',
  authenticate,
  requireWorkspace,
  requireWorkspacePermission('workspace:manage_members'),
  updateMemberRoleHandler,
);

export default router;
