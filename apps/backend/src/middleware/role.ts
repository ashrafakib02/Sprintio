import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { users } from '../db/schema/users.js';

declare global {
  namespace Express {
    interface Request {
      userRole?: string;
    }
  }
}

/**
 * requireRole(...roles)
 *
 * Middleware factory that checks if the authenticated user has one of the
 * required roles. Fetches the role from DB on each call.
 *
 * Must be used after `authenticate` middleware.
 */
export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }

    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: 'User not found', code: 'UNAUTHORIZED' });
      return;
    }

    const userRole = user.role ?? 'member';

    if (!roles.includes(userRole)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
      });
      return;
    }

    req.userRole = userRole;
    next();
  };
}
