import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { listTasks, createTask } from './task.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireProject } from '../../middleware/project-scoping.js';
import { requireWorkspacePermission } from '../../middleware/rbac.js';

const taskLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
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

// List tasks in project
router.get('/', authenticate, requireProject, listTasks);

// Create task in project (requires task:create permission)
router.post(
  '/',
  authenticate,
  requireProject,
  taskLimiter as unknown as express.RequestHandler,
  requireWorkspacePermission('task:create'),
  createTask,
);

export default router;
