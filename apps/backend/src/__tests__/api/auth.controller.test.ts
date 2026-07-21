import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env before any imports
vi.mock('../../config/env.js', () => ({
  env: {
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    JWT_ACCESS_EXPIRY_MS: 900000,
    JWT_REFRESH_EXPIRY_MS: 604800000,
    COOKIE_SECURE: false,
    COOKIE_DOMAIN: 'localhost',
    DEVICE_COOKIE_NAME: 'device_id',
    DEVICE_COOKIE_MAX_AGE: 31536000,
  },
}));

// Mock auth service
vi.mock('../../modules/auth/auth.service.js', () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  refreshTokens: vi.fn(),
  logoutUser: vi.fn(),
  logoutAllSessions: vi.fn(),
  getCurrentUser: vi.fn(),
  listUserSessions: vi.fn(),
  revokeSession: vi.fn(),
}));

// Mock cookie utils
vi.mock('../../utils/cookie.js', () => ({
  setAccessTokenCookie: vi.fn(),
  setRefreshTokenCookie: vi.fn(),
  setAuthCookies: vi.fn(),
  ensureDeviceIdCookie: vi.fn().mockReturnValue('test-device-id'),
  clearAuthCookies: vi.fn(),
  getRefreshTokenFromRequest: vi.fn(),
  getAccessTokenFromRequest: vi.fn(),
  setDeviceIdCookie: vi.fn(),
  getDeviceIdFromRequest: vi.fn(),
  ACCESS_TOKEN_COOKIE: 'access_token',
  REFRESH_TOKEN_COOKIE: 'refresh_token',
}));

// Mock JWT
vi.mock('../../utils/jwt.js', () => ({
  decodeToken: vi.fn(),
}));

// Mock validation (shared schemas)
vi.mock('@sprintio/shared', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    RegisterSchema: { safeParse: vi.fn() },
    LoginSchema: { safeParse: vi.fn() },
  };
});

import * as authController from '../../modules/auth/auth.controller.js';
import * as authService from '../../modules/auth/auth.service.js';
import { getRefreshTokenFromRequest, getAccessTokenFromRequest } from '../../utils/cookie.js';
import { decodeToken } from '../../utils/jwt.js';
import { RegisterSchema, LoginSchema } from '@sprintio/shared';
import { createMockReq, createMockRes, createMockNext } from '../helpers.js';
import { AppError } from '@sprintio/shared';

describe('auth.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should return 201 with user on successful registration', async () => {
      const req = createMockReq({
        body: {
          name: 'Test',
          email: 'test@test.com',
          password: 'Password1!',
          confirmPassword: 'Password1!',
        },
        headers: { 'user-agent': 'Chrome/120' },
        socket: { remoteAddress: '127.0.0.1' },
      });
      const res = createMockRes();

      vi.mocked(RegisterSchema.safeParse).mockReturnValue({
        success: true,
        data: { name: 'Test', email: 'test@test.com', password: 'Password1!' },
      } as never);

      vi.mocked(authService.registerUser).mockResolvedValue({
        user: {
          id: 'u1',
          name: 'Test',
          email: 'test@test.com',
          emailVerified: false,
          role: 'member',
          avatarUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        tokens: { accessToken: 'access', refreshToken: 'refresh' },
      });

      await authController.register(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(201);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.user.name).toBe('Test');
    });

    it('should return 400 on validation failure', async () => {
      const req = createMockReq({ body: {} });
      const res = createMockRes();

      vi.mocked(RegisterSchema.safeParse).mockReturnValue({
        success: false,
        error: { errors: [{ message: 'Name is required' }] },
      } as never);

      await authController.register(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.error).toContain('Name is required');
    });

    it('should return 409 when email already exists', async () => {
      const req = createMockReq({
        body: {
          name: 'Test',
          email: 'existing@test.com',
          password: 'Password1!',
          confirmPassword: 'Password1!',
        },
      });
      const res = createMockRes();

      vi.mocked(RegisterSchema.safeParse).mockReturnValue({
        success: true,
        data: { name: 'Test', email: 'existing@test.com', password: 'Password1!' },
      } as never);

      vi.mocked(authService.registerUser).mockRejectedValue(
        AppError.conflict('A user with this email already exists'),
      );

      const next = createMockNext();
      await authController.register(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
    });

    it('should return 500 on unexpected errors', async () => {
      const req = createMockReq({
        body: {
          name: 'Test',
          email: 'test@test.com',
          password: 'Password1!',
          confirmPassword: 'Password1!',
        },
      });
      const res = createMockRes();

      vi.mocked(RegisterSchema.safeParse).mockReturnValue({
        success: true,
        data: { name: 'Test', email: 'test@test.com', password: 'Password1!' },
      } as never);

      vi.mocked(authService.registerUser).mockRejectedValue(AppError.internal('DB error'));

      const next = createMockNext();
      await authController.register(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    });
  });

  describe('login', () => {
    it('should return user on successful login', async () => {
      const req = createMockReq({
        body: { email: 'test@test.com', password: 'Password1!' },
      });
      const res = createMockRes();

      vi.mocked(LoginSchema.safeParse).mockReturnValue({
        success: true,
        data: { email: 'test@test.com', password: 'Password1!' },
      } as never);

      vi.mocked(authService.loginUser).mockResolvedValue({
        user: {
          id: 'u1',
          name: 'Test',
          email: 'test@test.com',
          emailVerified: true,
          role: 'member',
          avatarUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        tokens: { accessToken: 'access', refreshToken: 'refresh' },
      });

      await authController.login(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.user.email).toBe('test@test.com');
    });

    it('should return 401 for invalid credentials', async () => {
      const req = createMockReq({
        body: { email: 'test@test.com', password: 'WrongPass1!' },
      });
      const res = createMockRes();

      vi.mocked(LoginSchema.safeParse).mockReturnValue({
        success: true,
        data: { email: 'test@test.com', password: 'WrongPass1!' },
      } as never);

      vi.mocked(authService.loginUser).mockRejectedValue(
        AppError.unauthorized('Invalid email or password'),
      );

      const next = createMockNext();
      await authController.login(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('should return 403 for unverified email', async () => {
      const req = createMockReq({
        body: { email: 'test@test.com', password: 'Password1!' },
      });
      const res = createMockRes();

      vi.mocked(LoginSchema.safeParse).mockReturnValue({
        success: true,
        data: { email: 'test@test.com', password: 'Password1!' },
      } as never);

      vi.mocked(authService.loginUser).mockRejectedValue(
        AppError.unauthorized('Please verify your email before signing in'),
      );

      const next = createMockNext();
      await authController.login(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('should return 401 for OAuth-only users (no enumeration)', async () => {
      const req = createMockReq({
        body: { email: 'test@test.com', password: 'Password1!' },
      });
      const res = createMockRes();

      vi.mocked(LoginSchema.safeParse).mockReturnValue({
        success: true,
        data: { email: 'test@test.com', password: 'Password1!' },
      } as never);

      vi.mocked(authService.loginUser).mockRejectedValue(
        AppError.unauthorized('This account uses Google Sign-In'),
      );

      const next = createMockNext();
      await authController.login(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });
  });

  describe('refresh', () => {
    it('should return tokens on successful refresh', async () => {
      const req = createMockReq();
      const res = createMockRes();

      vi.mocked(getRefreshTokenFromRequest).mockReturnValue('refresh-token');

      vi.mocked(authService.refreshTokens).mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      await authController.refresh(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.message).toBe('Tokens refreshed');
    });

    it('should return 401 when refresh token is missing', async () => {
      const req = createMockReq();
      const res = createMockRes();

      vi.mocked(getRefreshTokenFromRequest).mockReturnValue(undefined);

      await authController.refresh(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(401);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.error).toContain('Refresh token not found');
    });

    it('should return 401 and clear cookies when refresh token is invalid', async () => {
      const req = createMockReq();
      const res = createMockRes();

      vi.mocked(getRefreshTokenFromRequest).mockReturnValue('invalid-token');
      vi.mocked(authService.refreshTokens).mockRejectedValue(
        AppError.unauthorized('Invalid or expired refresh token'),
      );

      const next = createMockNext();
      await authController.refresh(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
      const { clearAuthCookies } = await import('../../utils/cookie.js');
      expect(clearAuthCookies).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should call logoutUser and clear cookies', async () => {
      const req = createMockReq();
      const res = createMockRes();

      vi.mocked(getRefreshTokenFromRequest).mockReturnValue('refresh-token');
      vi.mocked(getAccessTokenFromRequest).mockReturnValue(undefined);

      await authController.logout(req, res as never, createMockNext());

      const { clearAuthCookies } = await import('../../utils/cookie.js');
      expect(clearAuthCookies).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should clear cookies even when service throws', async () => {
      const req = createMockReq();
      const res = createMockRes();

      vi.mocked(getRefreshTokenFromRequest).mockReturnValue('bad-token');
      vi.mocked(getAccessTokenFromRequest).mockReturnValue(undefined);
      vi.mocked(authService.logoutUser).mockRejectedValue(AppError.internal('DB error'));

      const next = createMockNext();
      await authController.logout(req, res as never, next);

      const { clearAuthCookies } = await import('../../utils/cookie.js');
      expect(clearAuthCookies).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    });
  });

  describe('logoutAll', () => {
    it('should call logoutAllSessions and return 200', async () => {
      const req = createMockReq({
        user: { userId: 'user-1', jti: 'jti-1' },
      });
      const res = createMockRes();

      vi.mocked(getAccessTokenFromRequest).mockReturnValue('access-token');
      vi.mocked(decodeToken).mockReturnValue({ exp: Date.now() / 1000 + 900 } as never);

      await authController.logoutAll(req, res as never, createMockNext());

      expect(authService.logoutAllSessions).toHaveBeenCalledWith(
        'user-1',
        'jti-1',
        expect.any(Date),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 401 when user is not authenticated', async () => {
      const req = createMockReq();
      const res = createMockRes();

      await authController.logoutAll(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('me', () => {
    it('should return user profile', async () => {
      const req = createMockReq({ user: { userId: 'user-1' } });
      const res = createMockRes();

      vi.mocked(authService.getCurrentUser).mockResolvedValue({
        id: 'user-1',
        name: 'Test',
        email: 'test@test.com',
        emailVerified: true,
        role: 'admin',
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await authController.me(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.user.id).toBe('user-1');
    });

    it('should return 401 when not authenticated', async () => {
      const req = createMockReq();
      const res = createMockRes();

      await authController.me(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 404 when user not found', async () => {
      const req = createMockReq({ user: { userId: 'user-1' } });
      const res = createMockRes();

      vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

      await authController.me(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('listSessions', () => {
    it('should return list of sessions', async () => {
      const req = createMockReq({ user: { userId: 'user-1', deviceId: 'device-1' } });
      const res = createMockRes();

      vi.mocked(authService.listUserSessions).mockResolvedValue([
        {
          id: 'session-1',
          deviceId: 'device-1',
          browser: 'Chrome 120',
          os: 'Windows 10',
          device: 'Computer',
          deviceType: 'desktop',
          ipAddress: '127.0.0.1',
          isCurrent: true,
          lastActive: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ]);

      await authController.listSessions(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.sessions).toHaveLength(1);
    });

    it('should return 401 when not authenticated', async () => {
      const req = createMockReq();
      const res = createMockRes();

      await authController.listSessions(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('revokeSessionById', () => {
    it('should revoke session and return 200', async () => {
      const req = createMockReq({
        user: { userId: 'user-1', deviceId: 'device-1' },
        params: { sessionId: 'session-2' },
      });
      const res = createMockRes();

      vi.mocked(authService.revokeSession).mockResolvedValue(undefined);

      await authController.revokeSessionById(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.message).toBe('Session revoked');
    });

    it('should return 400 when session ID is missing', async () => {
      const req = createMockReq({
        user: { userId: 'user-1', deviceId: 'device-1' },
        params: {},
      });
      const res = createMockRes();

      await authController.revokeSessionById(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when session not found', async () => {
      const req = createMockReq({
        user: { userId: 'user-1', deviceId: 'device-1' },
        params: { sessionId: 'nonexistent' },
      });
      const res = createMockRes();

      vi.mocked(authService.revokeSession).mockRejectedValue(AppError.notFound('Session'));

      const next = createMockNext();
      await authController.revokeSessionById(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });

    it('should return 400 when trying to revoke current session', async () => {
      const req = createMockReq({
        user: { userId: 'user-1', deviceId: 'device-1' },
        params: { sessionId: 'session-1' },
      });
      const res = createMockRes();

      vi.mocked(authService.revokeSession).mockRejectedValue(
        AppError.badRequest('Cannot revoke your current session'),
      );

      const next = createMockNext();
      await authController.revokeSessionById(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });
  });
});
