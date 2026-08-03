import type { Request, Response } from 'express';
import * as taskService from './task.service.js';
import { CreateTaskForProjectSchema, UpdateTaskSchema, UuidSchema } from '@sprintio/shared';
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
 * GET /api/projects/:projectId/tasks
 * List all tasks in a project.
 */
export const listTasks = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const uuidError = validateUuid(projectId, 'project ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const userId = req.user!.userId;
  const tasks = await taskService.listTasks(projectId, userId);

  return sendSuccess(res, { tasks });
});

/**
 * POST /api/projects/:projectId/tasks
 * Create a new task in a project.
 */
export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const uuidError = validateUuid(projectId, 'project ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const parsed = CreateTaskForProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return res.status(400).json({ error: message });
  }

  const userId = req.user!.userId;
  const task = await taskService.createTask(projectId, parsed.data, userId);

  return sendSuccess(res, { task }, 201);
});

/**
 * GET /api/tasks/my
 * Get tasks assigned to the current user.
 */
export const getMyTasks = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const tasks = await taskService.getMyTasks(userId);
  return sendSuccess(res, { tasks });
});

/**
 * GET /api/tasks/:taskId
 * Get a task by ID.
 */
export const getTask = asyncHandler(async (req: Request, res: Response) => {
  const taskId = req.params.taskId as string;
  const uuidError = validateUuid(taskId, 'task ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const userId = req.user!.userId;
  const task = await taskService.getTask(taskId, userId);

  return sendSuccess(res, { task });
});

/**
 * PATCH /api/tasks/:taskId
 * Update a task.
 */
export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const taskId = req.params.taskId as string;
  const uuidError = validateUuid(taskId, 'task ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const parsed = UpdateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return res.status(400).json({ error: message });
  }

  const userId = req.user!.userId;
  const task = await taskService.updateTask(taskId, parsed.data, userId);

  return sendSuccess(res, { task });
});

/**
 * DELETE /api/tasks/:taskId
 * Delete a task.
 */
export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const taskId = req.params.taskId as string;
  const uuidError = validateUuid(taskId, 'task ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const userId = req.user!.userId;
  await taskService.deleteTask(taskId, userId);

  return sendSuccess(res, { message: 'Task deleted' });
});
