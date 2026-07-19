import { describe, it, expect, vi } from 'vitest';
import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setDeviceIdCookie,
  getAccessTokenFromRequest,
  getRefreshTokenFromRequest,
  getDeviceIdFromRequest,
  clearAuthCookies,
} from '../../../utils/cookie.js';
import { createMockReq, createMockRes } from '../../helpers.js';

vi.mock('../../../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_ACCESS_EXPIRY_MS: 900000,
    JWT_REFRESH_EXPIRY_MS: 604800000,
    COOKIE_SECURE: false,
    COOKIE_DOMAIN: 'localhost',
    DEVICE_COOKIE_NAME: 'device_id',
    DEVICE_COOKIE_MAX_AGE: 31536000,
  },
}));

describe('cookie utils', () => {
  describe('setAccessTokenCookie', () => {
    it('should set a Set-Cookie header with access_token', () => {
      const res = createMockRes();
      setAccessTokenCookie(res as never, 'test-access-token');

      const header = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls.find(
        (call: unknown[]) => call[0] === 'Set-Cookie',
      );
      expect(header).toBeDefined();

      const cookieValue = header[1] as string[];
      const accessCookie = cookieValue.find((c: string) => c.startsWith('access_token='));
      expect(accessCookie).toBeDefined();
      expect(accessCookie).toContain('access_token=test-access-token');
      expect(accessCookie).toContain('Path=/');
      expect(accessCookie).toContain('HttpOnly');
      expect(accessCookie).toContain('SameSite=Lax');
      expect(accessCookie).toContain('Max-Age=900'); // 900000 / 1000
      // Not Secure since COOKIE_SECURE is false
      expect(accessCookie).not.toContain('Secure');
    });

    it('should not include Domain in non-production environment', () => {
      const res = createMockRes();
      setAccessTokenCookie(res as never, 'token');

      const header = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls.find(
        (call: unknown[]) => call[0] === 'Set-Cookie',
      );
      const cookieValue = (header[1] as string[]).find((c: string) =>
        c.startsWith('access_token='),
      );
      expect(cookieValue).not.toContain('Domain=');
    });
  });

  describe('setRefreshTokenCookie', () => {
    it('should set a Set-Cookie header with refresh_token', () => {
      const res = createMockRes();
      setRefreshTokenCookie(res as never, 'test-refresh-token');

      const header = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls.find(
        (call: unknown[]) => call[0] === 'Set-Cookie',
      );
      expect(header).toBeDefined();

      const cookieValue = header[1] as string[];
      const refreshCookie = cookieValue.find((c: string) => c.startsWith('refresh_token='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('refresh_token=test-refresh-token');
      expect(refreshCookie).toContain('Path=/api/auth/refresh');
      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('SameSite=Strict');
      expect(refreshCookie).toContain('Max-Age=604800'); // 604800000 / 1000
    });
  });

  describe('setDeviceIdCookie', () => {
    it('should set a Set-Cookie header with device_id', () => {
      const res = createMockRes();
      setDeviceIdCookie(res as never, 'my-device-uuid');

      const header = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls.find(
        (call: unknown[]) => call[0] === 'Set-Cookie',
      );
      expect(header).toBeDefined();

      const cookieValue = header[1] as string[];
      const deviceCookie = cookieValue.find((c: string) => c.startsWith('device_id='));
      expect(deviceCookie).toBeDefined();
      expect(deviceCookie).toContain('device_id=my-device-uuid');
      expect(deviceCookie).toContain('Max-Age=31536000');
    });
  });

  describe('getAccessTokenFromRequest', () => {
    it('should extract access_token from cookie header', () => {
      const req = createMockReq({
        headers: { cookie: 'access_token=abc123; other=val' },
      });
      expect(getAccessTokenFromRequest(req)).toBe('abc123');
    });

    it('should return undefined when no cookie header', () => {
      const req = createMockReq({ headers: {} });
      expect(getAccessTokenFromRequest(req)).toBeUndefined();
    });

    it('should return undefined when cookie header has no access_token', () => {
      const req = createMockReq({
        headers: { cookie: 'other_token=value' },
      });
      expect(getAccessTokenFromRequest(req)).toBeUndefined();
    });

    it('should handle cookie with spaces', () => {
      const req = createMockReq({
        headers: { cookie: ' access_token = my-token ' },
      });
      // The cookie parser trims spaces from values
      expect(getAccessTokenFromRequest(req)).toBe('my-token');
    });
  });

  describe('getRefreshTokenFromRequest', () => {
    it('should extract refresh_token from cookie header', () => {
      const req = createMockReq({
        headers: { cookie: 'refresh_token=xyz789' },
      });
      expect(getRefreshTokenFromRequest(req)).toBe('xyz789');
    });

    it('should return undefined when no cookie header', () => {
      const req = createMockReq({ headers: {} });
      expect(getRefreshTokenFromRequest(req)).toBeUndefined();
    });
  });

  describe('getDeviceIdFromRequest', () => {
    it('should extract device_id from cookie header', () => {
      const req = createMockReq({
        headers: { cookie: 'device_id=my-device-id' },
      });
      expect(getDeviceIdFromRequest(req)).toBe('my-device-id');
    });

    it('should return undefined when no cookie header', () => {
      const req = createMockReq({ headers: {} });
      expect(getDeviceIdFromRequest(req)).toBeUndefined();
    });
  });

  describe('clearAuthCookies', () => {
    it('should set Max-Age=0 for access, refresh, and device cookies', () => {
      const res = createMockRes();
      clearAuthCookies(res as never);

      const setHeaderCalls = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls;
      const cookieCalls = setHeaderCalls.filter(
        (call: unknown[]) => call[0] === 'Set-Cookie',
      );

      // clearAuthCookies calls appendCookie 3 times (access, refresh, device)
      expect(cookieCalls).toHaveLength(3);

      // All should have Max-Age=0
      for (const cookieCall of cookieCalls) {
        expect(cookieCall[1][0]).toContain('Max-Age=0');
      }

      // Verify each cookie type is present across the calls
      const allValues = cookieCalls.map((c: unknown[]) => c[1] as string).join('\n');
      expect(allValues).toContain('access_token=');
      expect(allValues).toContain('refresh_token=');
      expect(allValues).toContain('device_id=');
    });
  });

  describe('cookie appending', () => {
    it('should append multiple cookies to existing Set-Cookie header', () => {
      const res = createMockRes();
      // Set an initial cookie
      (res.getHeader as ReturnType<typeof vi.fn>).mockReturnValue('existing-cookie=1');
      setAccessTokenCookie(res as never, 'token');

      const cookieCall = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls.find(
        (call: unknown[]) => call[0] === 'Set-Cookie',
      );
      const values = cookieCall[1] as string[];
      expect(values).toHaveLength(2);
      expect(values[0]).toBe('existing-cookie=1');
      expect(values[1]).toContain('access_token=token');
    });
  });
});
