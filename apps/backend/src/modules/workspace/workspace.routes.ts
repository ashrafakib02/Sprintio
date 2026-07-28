import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createWorkspace,
  getWorkspace,
  listWorkspaces,
  getWorkspaceContext,
  addMember,
  removeMember,
  listMembers,
} from './workspace.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireWorkspace } from '../../middleware/tenant.js';
import { requirePermission } from '../../middleware/permission.js';

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

// Add member to workspace (authenticated, requires MANAGE_MEMBERS permission)
router.post(
  '/:workspaceId/members',
  authenticate,
  requireWorkspace,
  memberLimiter as unknown as express.RequestHandler,
  requirePermission('workspace:manage_members'),
  addMember,
);

// Remove member from workspace (authenticated, requires MANAGE_MEMBERS permission)
router.delete(
  '/:workspaceId/members/:userId',
  authenticate,
  requireWorkspace,
  requirePermission('workspace:manage_members'),
  removeMember,
);

// List workspace members (authenticated, must be member)
router.get('/:workspaceId/members', authenticate, requireWorkspace, listMembers);

export default router;
