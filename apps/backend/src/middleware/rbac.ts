import type { Request, Response, NextFunction } from 'express';
import { repoDb } from '../config/db-for-repos.js';
import { workspaceRepo, organizationRepo } from '@sprintio/db/repositories';
import { WORKSPACE_ROLE_PERMISSIONS, type WorkspaceRole } from '@sprintio/shared';

// ============================================================
// Type Augmentation
// ============================================================

declare global {
  namespace Express {
    interface Request {
      workspaceRole?: string;
    }
  }
}

// ============================================================
// requireWorkspacePermission
// ============================================================

/**
 * requireWorkspacePermission(...permissions)
 *
 * DB-backed workspace-scoped permission check.
 * Looks up the user's role in the workspace from the database,
 * then checks if that role has the required permissions.
 *
 * Caches the resolved role on `req.workspaceRole` for downstream use.
 * Must be used after `authenticate` and `requireWorkspace` middleware.
 */
export function requireWorkspacePermission(...permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
        return;
      }

      const workspaceId = req.workspaceId;
      if (!workspaceId) {
        res.status(400).json({
          error: 'Workspace context is required',
          code: 'BAD_REQUEST',
        });
        return;
      }

      // Check if role is already cached from a previous middleware in this request
      if (req.workspaceRole) {
        // Owner bypasses all permission checks
        if (req.workspaceRole === 'owner') {
          return next();
        }

        const rolePermissions =
          WORKSPACE_ROLE_PERMISSIONS[req.workspaceRole as WorkspaceRole] ?? [];
        const hasAll = permissions.every((p) => rolePermissions.includes(p));

        if (!hasAll) {
          res.status(403).json({
            error: 'Insufficient workspace permissions',
            code: 'FORBIDDEN',
          });
          return;
        }

        return next();
      }

      // Look up the user's role in the workspace
      const role = await workspaceRepo.getMemberRole(repoDb, workspaceId, req.user.userId);

      if (!role) {
        res.status(403).json({
          error: 'You are not a member of this workspace',
          code: 'FORBIDDEN',
        });
        return;
      }

      // Cache for downstream middleware/handlers
      req.workspaceRole = role;

      // Owner bypasses all permission checks
      if (role === 'owner') {
        return next();
      }

      const rolePermissions = WORKSPACE_ROLE_PERMISSIONS[role as WorkspaceRole] ?? [];
      const hasAll = permissions.every((p) => rolePermissions.includes(p));

      if (!hasAll) {
        res.status(403).json({
          error: 'Insufficient workspace permissions',
          code: 'FORBIDDEN',
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// ============================================================
// requireResourceOwner
// ============================================================

type ResourceType = 'workspace' | 'organization' | 'board' | 'task' | 'document';

/**
 * Resource ownership lookup functions.
 * Each returns the owner's userId for the given resource, or null if not found.
 */
const RESOURCE_OWNERS: Record<
  ResourceType,
  (repoDb: never, resourceId: string) => Promise<string | null>
> = {
  workspace: async (_db, resourceId) => {
    const workspace = await workspaceRepo.findById(repoDb, resourceId);
    return workspace ? null : null; // Workspaces don't have a single owner — use membership
  },
  organization: async (_db, resourceId) => {
    const org = await organizationRepo.findById(repoDb, resourceId);
    return org ? null : null; // Organizations don't track a single owner
  },
  board: async (_db, _resourceId) => {
    // TODO: Implement when board repository exists
    return null;
  },
  task: async (_db, _resourceId) => {
    // TODO: Implement when task repository exists
    return null;
  },
  document: async (_db, _resourceId) => {
    // TODO: Implement when document repository exists
    return null;
  },
};

/**
 * requireResourceOwner(resourceType, paramKey?)
 *
 * Middleware that checks if the authenticated user owns the specified resource.
 * Ownership is determined by looking up the resource's creator/owner field.
 *
 * Sets `req.resourceOwnerId` for downstream use.
 * Must be used after `authenticate` middleware.
 */
export function requireResourceOwner(resourceType: ResourceType, paramKey = 'id') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
        return;
      }

      const resourceId = req.params[paramKey] as string;
      if (!resourceId) {
        res.status(400).json({
          error: `Resource ID is required (param: ${paramKey})`,
          code: 'BAD_REQUEST',
        });
        return;
      }

      const lookup = RESOURCE_OWNERS[resourceType];
      if (!lookup) {
        res.status(500).json({
          error: `Unknown resource type: ${resourceType}`,
          code: 'INTERNAL_ERROR',
        });
        return;
      }

      const ownerUserId = await lookup(repoDb as never, resourceId);

      if (!ownerUserId) {
        res.status(404).json({
          error: `${resourceType} not found`,
          code: 'NOT_FOUND',
        });
        return;
      }

      // Store on request for downstream handlers
      (req as unknown as Record<string, unknown>).resourceOwnerId = ownerUserId;

      // Check ownership
      if (ownerUserId !== req.user.userId) {
        res.status(403).json({
          error: 'You do not own this resource',
          code: 'FORBIDDEN',
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// ============================================================
// requireOrganizationMember (lightweight check)
// ============================================================

/**
 * requireOrganizationMember()
 *
 * Lightweight middleware that checks if the user is a member of the organization.
 * Does NOT check specific permissions — use requireOrganizationPermission for that.
 * Sets `req.organizationRole` for downstream use.
 *
 * Must be used after `authenticate` middleware.
 */
export function requireOrganizationMember() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
        return;
      }

      const organizationId =
        req.organizationId ||
        (req.params.organizationId as string) ||
        (req.query.organizationId as string);

      if (!organizationId) {
        res.status(400).json({
          error: 'Organization ID is required',
          code: 'BAD_REQUEST',
        });
        return;
      }

      const role = await organizationRepo.getMemberRole(repoDb, organizationId, req.user.userId);

      if (!role) {
        res.status(403).json({
          error: 'You are not a member of this organization',
          code: 'FORBIDDEN',
        });
        return;
      }

      req.organizationRole = role;
      next();
    } catch (error) {
      next(error);
    }
  };
}
