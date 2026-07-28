import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createOrganization,
  getOrganization,
  listOrganizations,
  updateOrganization,
  archiveOrganization,
  restoreOrganization,
  deleteOrganization,
  addMember,
  removeMember,
  listMembers,
} from './organization.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireOrganizationPermission } from '../../middleware/organization-permission.js';

// ── Rate limiters ────────────────────────────────────────────
const organizationLimiter = rateLimit({
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

// Create organization (authenticated)
router.post(
  '/',
  authenticate,
  organizationLimiter as unknown as express.RequestHandler,
  createOrganization,
);

// List user's organizations (authenticated)
router.get('/', authenticate, listOrganizations);

// Get organization by ID (authenticated, must be member)
router.get('/:organizationId', authenticate, getOrganization);

// Update organization (authenticated, requires UPDATE permission)
router.patch(
  '/:organizationId',
  authenticate,
  organizationLimiter as unknown as express.RequestHandler,
  requireOrganizationPermission('organization:update'),
  updateOrganization,
);

// Archive organization (authenticated, requires UPDATE permission)
router.post(
  '/:organizationId/archive',
  authenticate,
  requireOrganizationPermission('organization:update'),
  archiveOrganization,
);

// Restore archived organization (authenticated, requires UPDATE permission)
router.post(
  '/:organizationId/restore',
  authenticate,
  requireOrganizationPermission('organization:update'),
  restoreOrganization,
);

// Delete organization permanently (authenticated, requires DELETE permission)
router.delete(
  '/:organizationId',
  authenticate,
  requireOrganizationPermission('organization:delete'),
  deleteOrganization,
);

// Add member to organization (authenticated, requires MANAGE_MEMBERS)
router.post(
  '/:organizationId/members',
  authenticate,
  memberLimiter as unknown as express.RequestHandler,
  requireOrganizationPermission('organization:manage_members'),
  addMember,
);

// Remove member from organization (authenticated, requires MANAGE_MEMBERS)
router.delete(
  '/:organizationId/members/:userId',
  authenticate,
  requireOrganizationPermission('organization:manage_members'),
  removeMember,
);

// List organization members (authenticated, must be member)
router.get('/:organizationId/members', authenticate, listMembers);

export default router;
