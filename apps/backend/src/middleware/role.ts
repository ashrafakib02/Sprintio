import type { Request, Response, NextFunction } from 'express';

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
 * required roles. Reads role from the JWT payload (no DB query needed).
 *
 * Must be used after `authenticate` middleware.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
      return;
    }

    const userRole = (req.user as unknown as { role?: string }).role ?? 'member';

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
