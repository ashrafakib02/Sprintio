import type { Request, Response, NextFunction } from 'express';
import { repoDb } from '../config/db-for-repos.js';
import { organizationRepo } from '@sprintio/db/repositories';
import { PERMISSIONS } from '@sprintio/shared';

declare global {
  namespace Express {
    interface Request {
      organizationRole?: string;
    }
  }
}

/**
 * Static organization role → permission mapping.
 * Uses PERMISSIONS constants for consistency with the rest of the codebase.
 */
const ORG_ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: [
    PERMISSIONS.ORGANIZATION.CREATE,
    PERMISSIONS.ORGANIZATION.UPDATE,
    PERMISSIONS.ORGANIZATION.DELETE,
    PERMISSIONS.ORGANIZATION.MANAGE_MEMBERS,
    PERMISSIONS.ORGANIZATION.MANAGE_BILLING,
    PERMISSIONS.ORGANIZATION.SETTINGS,
    PERMISSIONS.WORKSPACE.CREATE,
    PERMISSIONS.WORKSPACE.UPDATE,
    PERMISSIONS.WORKSPACE.DELETE,
    PERMISSIONS.WORKSPACE.MANAGE_MEMBERS,
    PERMISSIONS.WORKSPACE.MANAGE_BILLING,
    PERMISSIONS.BOARD.CREATE,
    PERMISSIONS.BOARD.UPDATE,
    PERMISSIONS.BOARD.DELETE,
    PERMISSIONS.TASK.CREATE,
    PERMISSIONS.TASK.UPDATE,
    PERMISSIONS.TASK.DELETE,
    PERMISSIONS.TASK.ASSIGN,
    PERMISSIONS.DOCUMENT.CREATE,
    PERMISSIONS.DOCUMENT.UPDATE,
    PERMISSIONS.DOCUMENT.DELETE,
  ],
  admin: [
    PERMISSIONS.ORGANIZATION.UPDATE,
    PERMISSIONS.ORGANIZATION.MANAGE_MEMBERS,
    PERMISSIONS.ORGANIZATION.SETTINGS,
    PERMISSIONS.WORKSPACE.UPDATE,
    PERMISSIONS.WORKSPACE.MANAGE_MEMBERS,
    PERMISSIONS.BOARD.CREATE,
    PERMISSIONS.BOARD.UPDATE,
    PERMISSIONS.BOARD.DELETE,
    PERMISSIONS.TASK.CREATE,
    PERMISSIONS.TASK.UPDATE,
    PERMISSIONS.TASK.DELETE,
    PERMISSIONS.TASK.ASSIGN,
    PERMISSIONS.DOCUMENT.CREATE,
    PERMISSIONS.DOCUMENT.UPDATE,
    PERMISSIONS.DOCUMENT.DELETE,
  ],
  member: [
    PERMISSIONS.BOARD.CREATE,
    PERMISSIONS.BOARD.UPDATE,
    PERMISSIONS.BOARD.DELETE,
    PERMISSIONS.TASK.CREATE,
    PERMISSIONS.TASK.UPDATE,
    PERMISSIONS.TASK.DELETE,
    PERMISSIONS.TASK.ASSIGN,
    PERMISSIONS.DOCUMENT.CREATE,
    PERMISSIONS.DOCUMENT.UPDATE,
    PERMISSIONS.DOCUMENT.DELETE,
  ],
  guest: [PERMISSIONS.BOARD.CREATE, PERMISSIONS.TASK.CREATE, PERMISSIONS.DOCUMENT.CREATE],
};

/**
 * requireOrganizationPermission(...permissions)
 *
 * Checks if the authenticated user has ALL of the specified permissions
 * within the organization. The organization is resolved from:
 *   1. req.organizationId (set by tenant middleware or routes)
 *   2. req.params.organizationId
 *   3. req.query.organizationId
 *
 * Must be used after `authenticate` middleware.
 * Caches the resolved role on `req.organizationRole` for downstream use.
 */
export function requireOrganizationPermission(...permissions: string[]) {
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

      // Check if role is already cached from a previous middleware in this request
      if (req.organizationRole) {
        // Owner bypasses all permission checks
        if (req.organizationRole === 'owner') {
          return next();
        }

        const rolePermissions = ORG_ROLE_PERMISSIONS[req.organizationRole] ?? [];
        const hasAll = permissions.every((p) => rolePermissions.includes(p));

        if (!hasAll) {
          res.status(403).json({
            error: 'Insufficient organization permissions',
            code: 'FORBIDDEN',
          });
          return;
        }

        return next();
      }

      // Look up the user's role in the organization
      const role = await organizationRepo.getMemberRole(repoDb, organizationId, req.user.userId);

      if (!role) {
        res.status(403).json({
          error: 'You are not a member of this organization',
          code: 'FORBIDDEN',
        });
        return;
      }

      // Cache for downstream middleware/handlers
      req.organizationRole = role;

      // Owner bypasses all permission checks
      if (role === 'owner') {
        return next();
      }

      const rolePermissions = ORG_ROLE_PERMISSIONS[role] ?? [];
      const hasAll = permissions.every((p) => rolePermissions.includes(p));

      if (!hasAll) {
        res.status(403).json({
          error: 'Insufficient organization permissions',
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
