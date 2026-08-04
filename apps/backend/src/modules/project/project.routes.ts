import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getProject,
  updateProject,
  deleteProject,
  archiveProject,
  restoreProject,
} from './project.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireProject } from '../../middleware/project-scoping.js';
import { requireWorkspacePermission } from '../../middleware/rbac.js';
import { taskNestedRoutes } from '../task/index.js';

const projectLimiter = rateLimit({
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

const router: ReturnType<typeof Router> = Router();

// Nested task routes under project
router.use('/:projectId/tasks', taskNestedRoutes);

// Get project (authenticated, requireProject checks membership)
router.get('/:projectId', authenticate, requireProject, getProject);

// Update project (requires project:update workspace permission)
router.patch(
  '/:projectId',
  authenticate,
  requireProject,
  requireWorkspacePermission('project:update'),
  updateProject,
);

// Delete project (requires project:delete workspace permission)
router.delete(
  '/:projectId',
  authenticate,
  requireProject,
  requireWorkspacePermission('project:delete'),
  deleteProject,
);

// Archive project (requires project:update workspace permission)
router.post(
  '/:projectId/archive',
  authenticate,
  requireProject,
  projectLimiter as unknown as express.RequestHandler,
  requireWorkspacePermission('project:update'),
  archiveProject,
);

// Restore soft-deleted project (requires project:update workspace permission)
router.post(
  '/:projectId/restore',
  authenticate,
  requireProject,
  requireWorkspacePermission('project:update'),
  restoreProject,
);

export default router;
