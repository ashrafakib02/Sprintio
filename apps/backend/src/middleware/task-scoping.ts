import type { Request, Response, NextFunction } from 'express';
import { repoDb } from '../config/db-for-repos.js';
import { taskRepo, boardRepo, workspaceRepo } from '@sprintio/db/repositories';
import { AppError } from '@sprintio/shared';

declare global {
  namespace Express {
    interface Request {
      taskId?: string;
      // projectId, workspaceId, organizationId already declared
    }
  }
}

/**
 * requireTask middleware.
 * Extracts :taskId from URL, walks full chain task→board→workspace,
 * checks workspace membership, sets req.taskId, req.workspaceId, req.organizationId.
 * Also sets req.projectId if the board has one.
 */
export async function requireTask(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = req.params.taskId as string;
    if (!taskId) {
      return next(AppError.badRequest('Task ID is required'));
    }

    const task = await taskRepo.findById(repoDb, taskId);
    if (!task) {
      return next(AppError.notFound('Task'));
    }

    // Walk chain: task → board → workspace
    if (!task.boardId) {
      return next(AppError.badRequest('Task has no associated board'));
    }
    const board = await boardRepo.findById(repoDb, task.boardId);
    if (!board) {
      return next(AppError.notFound('Board'));
    }

    const workspace = await workspaceRepo.findById(repoDb, board.workspaceId);
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
    req.taskId = task.id;
    req.workspaceId = workspace.id;
    req.organizationId = workspace.organizationId ?? undefined;
    if (board.projectId) {
      req.projectId = board.projectId;
    }

    next();
  } catch (error) {
    next(error);
  }
}
