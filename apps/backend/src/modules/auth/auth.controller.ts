import type { Request, Response } from 'express';
import * as authService from './auth.service.js';
import { RegisterSchema, LoginSchema } from '@sprintio/shared';
import {
  setAuthCookies,
  ensureDeviceIdCookie,
  getRefreshTokenFromRequest,
  clearAuthCookies,
  getAccessTokenFromRequest,
} from '../../utils/cookie.js';
import { decodeToken } from '../../utils/jwt.js';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/async-handler.js';

// ============================================================
// Handlers
// ============================================================

/**
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
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
});

/**
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
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
});

/**
 * POST /api/auth/refresh
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token not found' });
  }

  const userAgent = req.headers['user-agent'];
  const ipAddress = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;

  try {
    const tokens = await authService.refreshTokens(refreshToken, { userAgent, ipAddress });

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return sendSuccess(res, { message: 'Tokens refreshed' });
  } catch (error) {
    clearAuthCookies(res);
    throw error;
  }
});

/**
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
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

  try {
    if (refreshToken) {
      await authService.logoutUser(refreshToken, accessTokenJti, accessTokenExpiresAt);
    } else if (accessTokenJti && accessTokenExpiresAt) {
      // Even without refresh token, blacklist the access token
      const { revokeAccessToken } = await import('../../cache/token-blacklist.js');
      await revokeAccessToken(accessTokenJti, accessTokenExpiresAt);
    }
  } finally {
    clearAuthCookies(res);
  }

  return sendSuccess(res, { message: 'Logged out' });
});

/**
 * POST /api/auth/logout-all
 */
export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Extract access token JTI and expiry for blacklisting
  const accessToken = getAccessTokenFromRequest(req);
  const accessTokenJti = req.user.jti;
  let accessTokenExpiresAt: Date | undefined;

  if (accessToken) {
    const decoded = decodeToken(accessToken);
    if (decoded?.exp) {
      accessTokenExpiresAt = new Date(decoded.exp * 1000);
    }
  }

  try {
    await authService.logoutAllSessions(req.user.userId, accessTokenJti, accessTokenExpiresAt);
  } finally {
    clearAuthCookies(res);
  }

  return sendSuccess(res, { message: 'All sessions logged out' });
});

/**
 * GET /api/auth/me
 */
export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userProfile = await authService.getCurrentUser(req.user.userId);

  if (!userProfile) {
    return res.status(404).json({ error: 'User not found' });
  }

  return sendSuccess(res, { user: userProfile });
});

// ============================================================
// Session Management Handlers
// ============================================================

/**
 * GET /api/auth/sessions
 */
export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const sessions = await authService.listUserSessions(req.user.userId, req.user.deviceId);

  return sendSuccess(res, { sessions });
});

/**
 * DELETE /api/auth/sessions/:sessionId
 */
export const revokeSessionById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const sessionIdParam = req.params.sessionId;
  const sessionId = Array.isArray(sessionIdParam) ? sessionIdParam[0] : sessionIdParam;
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  await authService.revokeSession(req.user.userId, sessionId, req.user.deviceId);

  return sendSuccess(res, { message: 'Session revoked' });
});
