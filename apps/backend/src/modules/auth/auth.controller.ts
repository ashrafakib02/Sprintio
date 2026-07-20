import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service.js';
import { registerSchema, loginSchema } from './auth.validation.js';
import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearAuthCookies,
  getRefreshTokenFromRequest,
  setDeviceIdCookie,
  getDeviceIdFromRequest,
  getAccessTokenFromRequest,
} from '../../utils/cookie.js';
import { decodeToken } from '../../utils/jwt.js';

// ============================================================
// Helpers
// ============================================================

function sendSuccess(res: Response, data: unknown, statusCode = 200) {
  return res.status(statusCode).json({ data });
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  setAccessTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, refreshToken);
}

function ensureDeviceIdCookie(res: Response, req: Request): string {
  const existing = getDeviceIdFromRequest(req);
  if (existing) return existing;

  const deviceId = randomUUID();
  setDeviceIdCookie(res, deviceId);
  return deviceId;
}

// ============================================================
// Handlers
// ============================================================

/**
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(', ');
      return res.status(400).json({ error: message });
    }

    const { name, email, password } = parsed.data as {
      name: string;
      email: string;
      password?: string;
    };
    const deviceId = ensureDeviceIdCookie(res, req);
    const userAgent = req.headers['user-agent'];
    const ipAddress = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;

    const result = await authService.registerUser(name, email, password, {
      deviceId,
      userAgent,
      ipAddress,
    });

    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

    return sendSuccess(res, { user: result.user }, 201);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(', ');
      return res.status(400).json({ error: message });
    }

    const { email, password } = parsed.data;
    const deviceId = ensureDeviceIdCookie(res, req);
    const userAgent = req.headers['user-agent'];
    const ipAddress = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;

    const result = await authService.loginUser(email, password, {
      deviceId,
      userAgent,
      ipAddress,
    });

    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

    return sendSuccess(res, { user: result.user });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/refresh
 */
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token not found' });
    }

    const userAgent = req.headers['user-agent'];
    const ipAddress = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;

    const tokens = await authService.refreshTokens(refreshToken, { userAgent, ipAddress });

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return sendSuccess(res, { message: 'Tokens refreshed' });
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
}

/**
 * POST /api/auth/logout
 */
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);

    // Extract access token JTI for blacklisting
    const accessToken = getAccessTokenFromRequest(req);
    let accessTokenJti: string | undefined;
    let accessTokenExpiresAt: Date | undefined;

    if (accessToken) {
      const decoded = decodeToken(accessToken);
      if (decoded?.jti) {
        accessTokenJti = decoded.jti as string;
        accessTokenExpiresAt = decoded.exp ? new Date(decoded.exp * 1000) : undefined;
      }
    }

    if (refreshToken) {
      await authService.logoutUser(refreshToken, accessTokenJti, accessTokenExpiresAt);
    } else if (accessTokenJti && accessTokenExpiresAt) {
      // Even without refresh token, blacklist the access token
      const { revokeAccessToken } = await import('../../cache/token-blacklist.js');
      await revokeAccessToken(accessTokenJti, accessTokenExpiresAt);
    }

    clearAuthCookies(res);

    return sendSuccess(res, { message: 'Logged out' });
  } catch (error) {
    // Still clear cookies even if DB operation fails
    clearAuthCookies(res);
    next(error);
  }
}

/**
 * POST /api/auth/logout-all
 */
export async function logoutAll(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as { userId: string; jti?: string } | undefined;
    if (!user?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Extract access token JTI and expiry for blacklisting
    const accessToken = getAccessTokenFromRequest(req);
    const accessTokenJti = user.jti;
    let accessTokenExpiresAt: Date | undefined;

    if (accessToken) {
      const decoded = decodeToken(accessToken);
      if (decoded?.exp) {
        accessTokenExpiresAt = new Date(decoded.exp * 1000);
      }
    }

    await authService.logoutAllSessions(user.userId, accessTokenJti, accessTokenExpiresAt);

    clearAuthCookies(res);

    return sendSuccess(res, { message: 'All sessions logged out' });
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
}

/**
 * GET /api/auth/me
 */
export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as { userId: string } | undefined;
    if (!user?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userProfile = await authService.getCurrentUser(user.userId);

    if (!userProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    return sendSuccess(res, { user: userProfile });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// Session Management Handlers
// ============================================================

/**
 * GET /api/auth/sessions
 */
export async function listSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as { userId: string; deviceId: string } | undefined;
    if (!user?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const sessions = await authService.listUserSessions(user.userId, user.deviceId);

    return sendSuccess(res, { sessions });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/auth/sessions/:sessionId
 */
export async function revokeSessionById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as { userId: string; deviceId: string } | undefined;
    if (!user?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const sessionIdParam = req.params.sessionId;
    const sessionId = Array.isArray(sessionIdParam) ? sessionIdParam[0] : sessionIdParam;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    await authService.revokeSession(user.userId, sessionId, user.deviceId);

    return sendSuccess(res, { message: 'Session revoked' });
  } catch (error) {
    next(error);
  }
}
