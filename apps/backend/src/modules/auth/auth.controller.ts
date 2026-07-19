import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
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

function sendError(res: Response, message: string, statusCode = 400) {
  return res.status(statusCode).json({ error: message });
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
export async function register(req: Request, res: Response) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(', ');
      return sendError(res, message, 400);
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
    const message = error instanceof Error ? error.message : 'Registration failed';

    if (message.includes('already exists')) {
      return sendError(res, message, 409);
    }

    console.error('Register error:', error);
    return sendError(res, 'Registration failed', 500);
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(', ');
      return sendError(res, message, 400);
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
    const message = error instanceof Error ? error.message : 'Login failed';

    if (message.includes('Invalid email or password')) {
      return sendError(res, 'Invalid email or password', 401);
    }

    if (message.includes('verify your email')) {
      return sendError(res, 'Invalid email or password', 401);
    }

    if (message.includes('Google Sign-In')) {
      return sendError(res, 'Invalid email or password', 401);
    }

    console.error('Login error:', error);
    return sendError(res, 'Login failed', 500);
  }
}

/**
 * POST /api/auth/refresh
 */
export async function refresh(req: Request, res: Response) {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      return sendError(res, 'Refresh token not found', 401);
    }

    const userAgent = req.headers['user-agent'];
    const ipAddress = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;

    const tokens = await authService.refreshTokens(refreshToken, { userAgent, ipAddress });

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return sendSuccess(res, { message: 'Tokens refreshed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token refresh failed';

    if (message.includes('Invalid or expired')) {
      clearAuthCookies(res);
      return sendError(res, message, 401);
    }

    console.error('Refresh error:', error);
    return sendError(res, 'Token refresh failed', 500);
  }
}

/**
 * POST /api/auth/logout
 */
export async function logout(req: Request, res: Response) {
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
    console.error('Logout error:', error);
    // Still clear cookies even if DB operation fails
    clearAuthCookies(res);
    return sendError(res, 'Logout failed', 500);
  }
}

/**
 * POST /api/auth/logout-all
 */
export async function logoutAll(req: Request, res: Response) {
  try {
    const user = req.user as { userId: string; jti?: string } | undefined;
    if (!user?.userId) {
      return sendError(res, 'Authentication required', 401);
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
    console.error('Logout all error:', error);
    clearAuthCookies(res);
    return sendError(res, 'Logout failed', 500);
  }
}

/**
 * GET /api/auth/me
 */
export async function me(req: Request, res: Response) {
  try {
    const user = req.user as { userId: string } | undefined;
    if (!user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const userProfile = await authService.getCurrentUser(user.userId);

    if (!userProfile) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, { user: userProfile });
  } catch (error) {
    console.error('Get user error:', error);
    return sendError(res, 'Failed to get user', 500);
  }
}

// ============================================================
// Session Management Handlers
// ============================================================

/**
 * GET /api/auth/sessions
 */
export async function listSessions(req: Request, res: Response) {
  try {
    const user = req.user as { userId: string; deviceId: string } | undefined;
    if (!user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const sessions = await authService.listUserSessions(user.userId, user.deviceId);

    return sendSuccess(res, { sessions });
  } catch (error) {
    console.error('List sessions error:', error);
    return sendError(res, 'Failed to list sessions', 500);
  }
}

/**
 * DELETE /api/auth/sessions/:sessionId
 */
export async function revokeSessionById(req: Request, res: Response) {
  try {
    const user = req.user as { userId: string; deviceId: string } | undefined;
    if (!user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const sessionIdParam = req.params.sessionId;
    const sessionId = Array.isArray(sessionIdParam) ? sessionIdParam[0] : sessionIdParam;
    if (!sessionId) {
      return sendError(res, 'Session ID is required', 400);
    }

    await authService.revokeSession(user.userId, sessionId, user.deviceId);

    return sendSuccess(res, { message: 'Session revoked' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to revoke session';

    if (message.includes('not found')) {
      return sendError(res, message, 404);
    }

    if (message.includes('current session')) {
      return sendError(res, message, 400);
    }

    console.error('Revoke session error:', error);
    return sendError(res, 'Failed to revoke session', 500);
  }
}
