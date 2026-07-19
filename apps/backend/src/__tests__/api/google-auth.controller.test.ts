import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/env.js', () => ({
  env: {
    COOKIE_SECURE: false,
    FRONTEND_URL: 'http://localhost:5173',
    GOOGLE_CLIENT_ID: 'test-id',
    GOOGLE_CLIENT_SECRET: 'test-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:3001/api/auth/google/callback',
    DEVICE_COOKIE_NAME: 'device_id',
    DEVICE_COOKIE_MAX_AGE: 31536000,
  },
}));

vi.mock('../../modules/auth/google-auth.service.js', () => ({
  getGoogleAuthUrl: vi.fn(),
  handleGoogleCallback: vi.fn(),
  linkGoogleAccount: vi.fn(),
  unlinkGoogleAccount: vi.fn(),
  getLinkedProviders: vi.fn(),
}));

vi.mock('../../utils/cookie.js', () => ({
  setAccessTokenCookie: vi.fn(),
  setRefreshTokenCookie: vi.fn(),
  getDeviceIdFromRequest: vi.fn(),
  setDeviceIdCookie: vi.fn(),
  cookieDomain: vi.fn().mockReturnValue(''),
  ACCESS_TOKEN_COOKIE: 'access_token',
  REFRESH_TOKEN_COOKIE: 'refresh_token',
}));

import * as controller from '../../modules/auth/google-auth.controller.js';
import * as googleAuthService from '../../modules/auth/google-auth.service.js';
import { createMockReq, createMockRes } from '../helpers.js';

describe('google-auth.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('googleLogin', () => {
    it('should redirect to Google OAuth URL', async () => {
      const req = createMockReq();
      const res = createMockRes();

      vi.mocked(googleAuthService.getGoogleAuthUrl).mockReturnValue(
        'https://accounts.google.com/o/oauth2/auth?client_id=test',
      );

      await controller.googleLogin(req, res as never);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('accounts.google.com'));
      expect(googleAuthService.getGoogleAuthUrl).toHaveBeenCalledWith(expect.any(String));
    });

    it('should set state cookie before redirecting', async () => {
      const req = createMockReq();
      const res = createMockRes();

      vi.mocked(googleAuthService.getGoogleAuthUrl).mockReturnValue('https://google.com/auth');

      await controller.googleLogin(req, res as never);

      // Should set a state cookie
      expect(res.setHeader).toHaveBeenCalled();
    });

    it('should redirect to error page when getGoogleAuthUrl throws', async () => {
      const req = createMockReq();
      const res = createMockRes();

      vi.mocked(googleAuthService.getGoogleAuthUrl).mockImplementation(() => {
        throw new Error('OAuth not configured');
      });

      await controller.googleLogin(req, res as never);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=google_auth_init_failed'),
      );
    });
  });

  describe('googleCallback', () => {
    it('should redirect to success page on valid callback', async () => {
      const req = createMockReq({
        query: { code: 'auth-code', state: 'valid-state' },
        headers: { cookie: 'google_oauth_state=valid-state' },
      });
      const res = createMockRes();

      vi.mocked(googleAuthService.handleGoogleCallback).mockResolvedValue({
        user: {
          id: 'u1',
          name: 'Test',
          email: 'test@test.com',
          emailVerified: true,
          role: 'member',
          avatar: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        tokens: { accessToken: 'access', refreshToken: 'refresh' },
      });

      await controller.googleCallback(req, res as never);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('success=true'));
    });

    it('should redirect with error when Google returns an error', async () => {
      const req = createMockReq({
        query: { error: 'access_denied' },
      });
      const res = createMockRes();

      await controller.googleCallback(req, res as never);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=access_denied'));
    });

    it('should redirect with error when no code is provided', async () => {
      const req = createMockReq({
        query: {},
      });
      const res = createMockRes();

      await controller.googleCallback(req, res as never);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=no_code_provided'));
    });

    it('should redirect with error when state is invalid', async () => {
      const req = createMockReq({
        query: { code: 'auth-code', state: 'wrong-state' },
        headers: { cookie: 'google_oauth_state=correct-state' },
      });
      const res = createMockRes();

      await controller.googleCallback(req, res as never);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=invalid_state'));
    });

    it('should redirect with error when state cookie is missing', async () => {
      const req = createMockReq({
        query: { code: 'auth-code', state: 'some-state' },
        headers: {},
      });
      const res = createMockRes();

      await controller.googleCallback(req, res as never);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=invalid_state'));
    });

    it('should redirect with error when service throws', async () => {
      const req = createMockReq({
        query: { code: 'auth-code', state: 'valid-state' },
        headers: { cookie: 'google_oauth_state=valid-state' },
      });
      const res = createMockRes();

      vi.mocked(googleAuthService.handleGoogleCallback).mockRejectedValue(
        new Error('token_exchange_failed'),
      );

      await controller.googleCallback(req, res as never);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=google_callback_failed'),
      );
    });
  });

  describe('googleLink', () => {
    it('should link Google account and return providers', async () => {
      const req = createMockReq({
        user: { userId: 'user-1' },
        body: { code: 'auth-code' },
      });
      const res = createMockRes();

      vi.mocked(googleAuthService.linkGoogleAccount).mockResolvedValue([
        { provider: 'google', providerAccountId: 'g-123', linkedAt: new Date().toISOString() },
      ]);

      await controller.googleLink(req, res as never);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.providers).toHaveLength(1);
    });

    it('should return 401 when not authenticated', async () => {
      const req = createMockReq({ body: { code: 'auth-code' } });
      const res = createMockRes();

      await controller.googleLink(req, res as never);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when code is missing', async () => {
      const req = createMockReq({
        user: { userId: 'user-1' },
        body: {},
      });
      const res = createMockRes();

      await controller.googleLink(req, res as never);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 409 when account already linked to another user', async () => {
      const req = createMockReq({
        user: { userId: 'user-1' },
        body: { code: 'auth-code' },
      });
      const res = createMockRes();

      vi.mocked(googleAuthService.linkGoogleAccount).mockRejectedValue(
        new Error('This Google account is already linked to another user'),
      );

      await controller.googleLink(req, res as never);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('should return 409 when Google already linked for this user', async () => {
      const req = createMockReq({
        user: { userId: 'user-1' },
        body: { code: 'auth-code' },
      });
      const res = createMockRes();

      vi.mocked(googleAuthService.linkGoogleAccount).mockRejectedValue(
        new Error('Google account is already linked'),
      );

      await controller.googleLink(req, res as never);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('googleUnlink', () => {
    it('should unlink Google account and return providers', async () => {
      const req = createMockReq({ user: { userId: 'user-1' } });
      const res = createMockRes();

      vi.mocked(googleAuthService.unlinkGoogleAccount).mockResolvedValue([]);

      await controller.googleUnlink(req, res as never);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.providers).toEqual([]);
    });

    it('should return 401 when not authenticated', async () => {
      const req = createMockReq();
      const res = createMockRes();

      await controller.googleUnlink(req, res as never);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when unlink is not allowed', async () => {
      const req = createMockReq({ user: { userId: 'user-1' } });
      const res = createMockRes();

      vi.mocked(googleAuthService.unlinkGoogleAccount).mockRejectedValue(
        new Error('Cannot unlink Google account. You must set a password first.'),
      );

      await controller.googleUnlink(req, res as never);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 on unexpected errors', async () => {
      const req = createMockReq({ user: { userId: 'user-1' } });
      const res = createMockRes();

      vi.mocked(googleAuthService.unlinkGoogleAccount).mockRejectedValue(
        new Error('Database connection failed'),
      );

      await controller.googleUnlink(req, res as never);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('googleProviders', () => {
    it('should return list of providers', async () => {
      const req = createMockReq({ user: { userId: 'user-1' } });
      const res = createMockRes();

      vi.mocked(googleAuthService.getLinkedProviders).mockResolvedValue([
        { provider: 'google', providerAccountId: 'g-123', linkedAt: new Date().toISOString() },
      ]);

      await controller.googleProviders(req, res as never);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.providers).toHaveLength(1);
    });

    it('should return 401 when not authenticated', async () => {
      const req = createMockReq();
      const res = createMockRes();

      await controller.googleProviders(req, res as never);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 500 when service throws', async () => {
      const req = createMockReq({ user: { userId: 'user-1' } });
      const res = createMockRes();

      vi.mocked(googleAuthService.getLinkedProviders).mockRejectedValue(new Error('DB error'));

      await controller.googleProviders(req, res as never);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
