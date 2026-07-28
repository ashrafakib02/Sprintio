import type { Request, Response, NextFunction } from 'express';
import { PERMISSIONS } from '@sprintio/shared';
import { env } from '../config/env.js';

/**
 * Static role → permission mapping (MVP).
 * Future: workspace-scoped DB lookup from a role_permissions table.
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
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
 * requirePermission(...permissions)
 *
 * Checks if the authenticated user has ALL of the specified permissions.
 * Owner bypasses all checks.
 * Reads role from the JWT payload (no DB query needed).
 *
 * Must be used after `authenticate` middleware.
 */
export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }

    // Use cached role from requireRole if already resolved, else read from JWT
    let role = req.userRole;
    if (!role) {
      role = req.user?.role ?? env.DEFAULT_USER_ROLE;
      req.userRole = role;
    }

    // Owner bypasses all permission checks
    if (role === 'owner') {
      return next();
    }

    const userPermissions = ROLE_PERMISSIONS[role] ?? [];
    const hasAll = permissions.every((p) => userPermissions.includes(p));

    if (!hasAll) {
      res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
}
