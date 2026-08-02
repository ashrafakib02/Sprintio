import type { Request, Response, NextFunction } from 'express';
import { repoDb } from '../config/db-for-repos.js';
import { projectRepo, workspaceRepo } from '@sprintio/db/repositories';
import { AppError } from '@sprintio/shared';

declare global {
  namespace Express {
    interface Request {
      projectId?: string;
      // workspaceId and organizationId already declared in tenant.ts
    }
  }
}

/**
 * requireProject middleware.
 * Extracts :projectId from URL, validates project exists,
 * walks chain to workspace, checks workspace membership,
 * sets req.projectId, req.workspaceId, req.organizationId.
 */
export async function requireProject(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    if (!projectId) {
      return next(AppError.badRequest('Project ID is required'));
    }

    const project = await projectRepo.findById(repoDb, projectId);
    if (!project) {
      return next(AppError.notFound('Project'));
    }

    // Walk chain: project → workspace
    const workspace = await workspaceRepo.findById(repoDb, project.workspaceId);
    if (!workspace) {
      return next(AppError.notFound('Workspace'));
    }

    // Check workspace membership
    const userId = req.user?.userId;
    if (!userId) {
      return next(AppError.unauthorized('Authentication required'));
    }

    const isMember = await workspaceRepo.isMember(repoDb, workspace.id, userId);
    if (!isMember) {
      return next(AppError.forbidden('You are not a member of this workspace'));
    }

    // Set context on request
    req.projectId = project.id;
    req.workspaceId = workspace.id;
    req.organizationId = workspace.organizationId ?? undefined;

    next();
  } catch (error) {
    next(error);
  }
}
