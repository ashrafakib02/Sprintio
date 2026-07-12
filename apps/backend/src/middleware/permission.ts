import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { users } from '../db/schema/users.js';
import { PERMISSIONS } from '@sprintio/shared';

/**
 * Static role → permission mapping (MVP).
 * Future: workspace-scoped DB lookup from a role_permissions table.
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: [
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
  guest: [
    PERMISSIONS.BOARD.CREATE,
    PERMISSIONS.TASK.CREATE,
    PERMISSIONS.DOCUMENT.CREATE,
  ],
};

/**
 * requirePermission(...permissions)
 *
 * Checks if the authenticated user has ALL of the specified permissions.
 * Owner bypasses all checks.
 *
 * Must be used after `authenticate` middleware.
 */
export function requirePermission(...permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }

    // Use cached role from requireRole if already resolved, else fetch
    let role = req.userRole;
    if (!role) {
      const [user] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, req.user.userId))
        .limit(1);

      if (!user) {
        res.status(401).json({ error: 'User not found', code: 'UNAUTHORIZED' });
        return;
      }
      role = user.role ?? 'member';
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
        required: permissions,
        current: role,
      });
      return;
    }

    next();
  };
}
