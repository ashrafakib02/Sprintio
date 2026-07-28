import type { Request, Response, NextFunction } from 'express';
import { repoDb } from '../config/db-for-repos.js';
import { workspaceRepo } from '@sprintio/db/repositories';
import { AppError } from '@sprintio/shared';

declare global {
  namespace Express {
    interface Request {
      workspaceId?: string;
      organizationId?: string;
    }
  }
}

/**
 * Extracts the workspace ID and optional organization ID from the request.
 * Sources (in priority order):
 *   1. Header: x-workspace-id
 *   2. Param: :workspaceId
 *   3. Query: workspaceId
 *
 * Does NOT validate against the database — use `requireWorkspace` for that.
 */
export function extractWorkspaceContext(req: Request, _res: Response, next: NextFunction): void {
  const workspaceId =
    (req.headers['x-workspace-id'] as string) ||
    (req.params.workspaceId as string) ||
    (req.query.workspaceId as string);

  if (workspaceId) {
    req.workspaceId = workspaceId;
  }

  next();
}

/**
 * Extracts and validates the workspace context.
 * Checks that:
 *   1. A workspace ID is present
 *   2. The workspace exists in the database
 *   3. The authenticated user is a member of the workspace
 *
 * Sets `req.workspaceId` and `req.organizationId` on success.
 * Must be used after `authenticate` middleware.
 */
export async function requireWorkspace(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Extract workspace ID
    const workspaceId =
      (req.headers['x-workspace-id'] as string) ||
      (req.params.workspaceId as string) ||
      (req.query.workspaceId as string);

    if (!workspaceId) {
      return next(AppError.badRequest('Workspace ID is required'));
    }

    // Validate workspace exists
    const workspace = await workspaceRepo.findById(repoDb, workspaceId);
    if (!workspace) {
      return next(AppError.notFound('Workspace'));
    }

    // Validate user is authenticated
    const userId = req.user?.userId;
    if (!userId) {
      return next(AppError.unauthorized('Authentication required'));
    }

    // Check user is a member
    const isMember = await workspaceRepo.isMember(repoDb, workspaceId, userId);
    if (!isMember) {
      return next(AppError.forbidden('You are not a member of this workspace'));
    }

    // Set context on request
    req.workspaceId = workspace.id;
    req.organizationId = workspace.organizationId ?? undefined;

    next();
  } catch (error) {
    next(error);
  }
}
