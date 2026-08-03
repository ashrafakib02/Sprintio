import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getMyTasks, getTask, updateTask, deleteTask } from './task.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireTask } from '../../middleware/task-scoping.js';
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

const router: ReturnType<typeof Router> = Router();

// Get tasks assigned to the current user (must come before /:taskId)
router.get('/my', authenticate, getMyTasks);

// Get task (authenticated, requireTask checks membership)
router.get('/:taskId', authenticate, requireTask, getTask);

// Update task (requires task:update workspace permission)
router.patch(
  '/:taskId',
  authenticate,
  requireTask,
  taskLimiter as unknown as express.RequestHandler,
  requireWorkspacePermission('task:update'),
  updateTask,
);

// Delete task (requires task:delete workspace permission)
router.delete(
  '/:taskId',
  authenticate,
  requireTask,
  requireWorkspacePermission('task:delete'),
  deleteTask,
);

export default router;
