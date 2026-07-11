import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../utils/jwt.js';
import { getAccessTokenFromRequest } from '../utils/cookie.js';
import { isAccessTokenRevoked, isUserRevoked } from '../cache/token-blacklist.js';

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = getAccessTokenFromRequest(req);

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Check if this specific token has been revoked
  const revoked = await isAccessTokenRevoked(payload.jti);
  if (revoked) {
    res.status(401).json({ error: 'Token has been revoked' });
    return;
  }

  // Check if all tokens for this user have been revoked (logout-all)
  const userRevoked = await isUserRevoked(payload.userId);
  if (userRevoked) {
    res.status(401).json({ error: 'Token has been revoked' });
    return;
  }

  req.user = payload;
  next();
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = getAccessTokenFromRequest(req);
  if (token) {
    const payload = await verifyAccessToken(token);
    if (payload) {
      // Only attach if not revoked
      const revoked = await isAccessTokenRevoked(payload.jti);
      const userRevoked = await isUserRevoked(payload.userId);
      if (!revoked && !userRevoked) {
        req.user = payload;
      }
    }
  }
  next();
}
