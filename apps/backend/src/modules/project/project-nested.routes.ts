import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { listProjects, createProject } from './project.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireWorkspace } from '../../middleware/tenant.js';
import { requireWorkspacePermission } from '../../middleware/rbac.js';

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

const router: ReturnType<typeof Router> = Router({ mergeParams: true });

// List projects in workspace
router.get('/', authenticate, requireWorkspace, listProjects);

// Create project in workspace (requires project:create permission)
router.post(
  '/',
  authenticate,
  requireWorkspace,
  projectLimiter as unknown as express.RequestHandler,
  requireWorkspacePermission('project:create'),
  createProject,
);

export default router;
