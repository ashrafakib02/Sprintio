import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@sprintio/shared';
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
    return next(AppError.unauthorized('Authentication required'));
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return next(AppError.unauthorized('Invalid or expired token'));
  }

  // Check if this specific token has been revoked
  const revoked = await isAccessTokenRevoked(payload.jti);
  if (revoked) {
    return next(AppError.unauthorized('Token has been revoked'));
  }

  // Check if all tokens for this user have been revoked (logout-all)
  const userRevoked = await isUserRevoked(payload.userId);
  if (userRevoked) {
    return next(AppError.unauthorized('Token has been revoked'));
  }

  req.user = payload;
  next();
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
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
