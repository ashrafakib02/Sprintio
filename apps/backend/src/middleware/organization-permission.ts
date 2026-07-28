import type { Request, Response, NextFunction } from 'express';
import { repoDb } from '../config/db-for-repos.js';
import { organizationRepo } from '@sprintio/db/repositories';

declare global {
  namespace Express {
    interface Request {
      organizationRole?: string;
    }
  }
}

/**
 * Static organization role → permission mapping.
 * Mirrors the workspace-level PERMISSIONS.ORGANIZATION values.
 */
const ORG_ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: [
    'organization:create',
    'organization:update',
    'organization:delete',
    'organization:manage_members',
    'organization:manage_billing',
    'organization:settings',
  ],
  admin: ['organization:update', 'organization:manage_members', 'organization:settings'],
  member: [],
  guest: [],
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
