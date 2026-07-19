import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReq, createMockRes, createMockNext } from '../../helpers.js';

// Must mock all dependencies before importing the module under test
vi.mock('../../../config/env.js', () => ({
  env: {
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
  },
}));

vi.mock('../../../utils/jwt.js', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../../../utils/cookie.js', () => ({
  getAccessTokenFromRequest: vi.fn(),
}));

vi.mock('../../../cache/token-blacklist.js', () => ({
  isAccessTokenRevoked: vi.fn(),
  isUserRevoked: vi.fn(),
}));

import { authenticate, optionalAuth } from '../../../middleware/auth.js';
import { verifyAccessToken } from '../../../utils/jwt.js';
import { getAccessTokenFromRequest } from '../../../utils/cookie.js';
import { isAccessTokenRevoked, isUserRevoked } from '../../../cache/token-blacklist.js';

describe('authenticate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call next with error when no token is present', async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    (getAccessTokenFromRequest as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    await authenticate(req, res as never, next);

    expect(next).toHaveBeenCalledOnce();
    const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(error).toBeDefined();
    expect(error.message).toContain('Authentication required');
    expect(error.statusCode).toBe(401);
  });

  it('should call next with error when token verification fails', async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    (getAccessTokenFromRequest as ReturnType<typeof vi.fn>).mockReturnValue('invalid-token');
    (verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await authenticate(req, res as never, next);

    expect(next).toHaveBeenCalledOnce();
    const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(error.message).toContain('Invalid or expired token');
  });

  it('should call next with error when token is revoked', async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    (getAccessTokenFromRequest as ReturnType<typeof vi.fn>).mockReturnValue('valid-token');
    (verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 'user-1',
      email: 'test@test.com',
      jti: 'jti-1',
      deviceId: 'device-1',
    });
    (isAccessTokenRevoked as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (isUserRevoked as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await authenticate(req, res as never, next);

    expect(next).toHaveBeenCalledOnce();
    const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(error.message).toContain('Token has been revoked');
  });

  it('should call next with error when all user tokens are revoked', async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    (getAccessTokenFromRequest as ReturnType<typeof vi.fn>).mockReturnValue('valid-token');
    (verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 'user-1',
      email: 'test@test.com',
      jti: 'jti-1',
      deviceId: 'device-1',
    });
    (isAccessTokenRevoked as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (isUserRevoked as ReturnType<typeof vi.fn>).mockResolvedValue(Date.now());

    await authenticate(req, res as never, next);

    expect(next).toHaveBeenCalledOnce();
    const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(error.message).toContain('Token has been revoked');
  });

  it('should attach user to req and call next without error when token is valid', async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    const payload = {
      userId: 'user-1',
      email: 'test@test.com',
      jti: 'jti-1',
      deviceId: 'device-1',
    };

    (getAccessTokenFromRequest as ReturnType<typeof vi.fn>).mockReturnValue('valid-token');
    (verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue(payload);
    (isAccessTokenRevoked as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (isUserRevoked as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await authenticate(req, res as never, next);

    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalledWith(); // no error argument
  });
});

describe('optionalAuth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call next without attaching user when no token is present', async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    (getAccessTokenFromRequest as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    await optionalAuth(req, res as never, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('should attach user when token is valid and not revoked', async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    const payload = {
      userId: 'user-1',
      email: 'test@test.com',
      jti: 'jti-1',
      deviceId: 'device-1',
    };

    (getAccessTokenFromRequest as ReturnType<typeof vi.fn>).mockReturnValue('valid-token');
    (verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue(payload);
    (isAccessTokenRevoked as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (isUserRevoked as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await optionalAuth(req, res as never, next);

    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalledWith();
  });

  it('should not attach user when token verification fails', async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    (getAccessTokenFromRequest as ReturnType<typeof vi.fn>).mockReturnValue('bad-token');
    (verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await optionalAuth(req, res as never, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('should not attach user when token is revoked', async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    (getAccessTokenFromRequest as ReturnType<typeof vi.fn>).mockReturnValue('valid-token');
    (verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 'user-1',
      email: 'test@test.com',
      jti: 'jti-1',
      deviceId: 'device-1',
    });
    (isAccessTokenRevoked as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (isUserRevoked as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await optionalAuth(req, res as never, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('should not attach user when all user tokens are revoked', async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    (getAccessTokenFromRequest as ReturnType<typeof vi.fn>).mockReturnValue('valid-token');
    (verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 'user-1',
      email: 'test@test.com',
      jti: 'jti-1',
      deviceId: 'device-1',
    });
    (isAccessTokenRevoked as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (isUserRevoked as ReturnType<typeof vi.fn>).mockResolvedValue(Date.now());

    await optionalAuth(req, res as never, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });
});
