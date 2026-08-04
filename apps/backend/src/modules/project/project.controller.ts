import type { Request, Response } from 'express';
import * as projectService from './project.service.js';
import {
  CreateProjectForWorkspaceSchema,
  UpdateProjectSchema,
  UuidSchema,
  ProjectListQuerySchema,
} from '@sprintio/shared';
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
 * GET /api/workspaces/:workspaceId/projects
 * List projects with pagination and optional filters.
 */
export const listProjects = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const uuidError = validateUuid(workspaceId, 'workspace ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const parsed = ProjectListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return res.status(400).json({ error: message });
  }

  const userId = req.user!.userId;
  const result = await projectService.listProjectsPaginated(workspaceId, userId, parsed.data);

  return sendSuccess(res, result);
});

/**
 * POST /api/workspaces/:workspaceId/projects
 * Create a new project in a workspace.
 */
export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.params.workspaceId as string;
  const uuidError = validateUuid(workspaceId, 'workspace ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const parsed = CreateProjectForWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return res.status(400).json({ error: message });
  }

  const userId = req.user!.userId;
  const project = await projectService.createProject(workspaceId, parsed.data, userId);

  return sendSuccess(res, { project }, 201);
});

/**
 * GET /api/projects/:projectId
 * Get a project by ID with stats.
 */
export const getProject = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const uuidError = validateUuid(projectId, 'project ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const userId = req.user!.userId;
  const project = await projectService.getProjectWithStats(projectId, userId);

  return sendSuccess(res, { project });
});

/**
 * PATCH /api/projects/:projectId
 * Update a project.
 */
export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const uuidError = validateUuid(projectId, 'project ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const parsed = UpdateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return res.status(400).json({ error: message });
  }

  const userId = req.user!.userId;
  const project = await projectService.updateProject(projectId, parsed.data, userId);

  return sendSuccess(res, { project });
});

/**
 * DELETE /api/projects/:projectId
 * Soft-delete a project.
 */
export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const uuidError = validateUuid(projectId, 'project ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const userId = req.user!.userId;
  await projectService.deleteProject(projectId, userId);

  return sendSuccess(res, { message: 'Project deleted' });
});

/**
 * POST /api/projects/:projectId/archive
 * Archive a project.
 */
export const archiveProject = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const uuidError = validateUuid(projectId, 'project ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const userId = req.user!.userId;
  const project = await projectService.archiveProject(projectId, userId);

  return sendSuccess(res, { project });
});

/**
 * POST /api/projects/:projectId/restore
 * Restore a soft-deleted project.
 */
export const restoreProject = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const uuidError = validateUuid(projectId, 'project ID');
  if (uuidError) {
    return res.status(400).json({ error: uuidError });
  }

  const userId = req.user!.userId;
  const project = await projectService.restoreProject(projectId, userId);

  return sendSuccess(res, { project });
});
