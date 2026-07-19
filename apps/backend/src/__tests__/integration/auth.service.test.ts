import { describe, it, expect, vi, beforeEach } from 'vitest';

// Generate ES256 test keys using vi.hoisted() so they're available in vi.mock factories
const { privateKeyBase64, publicKeyBase64 } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('node:crypto') as typeof import('node:crypto');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return {
    privateKeyBase64: Buffer.from(
      privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
    ).toString('base64'),
    publicKeyBase64: Buffer.from(
      publicKey.export({ type: 'spki', format: 'pem' }) as string,
    ).toString('base64'),
  };
});

// Mock all external dependencies
vi.mock('../../config/env.js', () => ({
  env: {
    JWT_ACCESS_PRIVATE_KEY: privateKeyBase64,
    JWT_ACCESS_PUBLIC_KEY: publicKeyBase64,
    JWT_REFRESH_PRIVATE_KEY: privateKeyBase64,
    JWT_REFRESH_PUBLIC_KEY: publicKeyBase64,
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    JWT_ACCESS_EXPIRY_MS: 900000,
    JWT_REFRESH_EXPIRY_MS: 604800000,
    BCRYPT_SALT_ROUNDS: 4,
    FRONTEND_URL: 'http://localhost:5173',
  },
}));

vi.mock('../../config/database.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    returning: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../config/redis.js', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
    sadd: vi.fn().mockResolvedValue(1),
    srem: vi.fn().mockResolvedValue(1),
    smembers: vi.fn().mockResolvedValue([]),
    expire: vi.fn().mockResolvedValue(1),
    pipeline: vi.fn().mockReturnValue({
      del: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ _eq: args })),
  and: vi.fn((...args: unknown[]) => ({ _and: args })),
  gt: vi.fn((...args: unknown[]) => ({ _gt: args })),
  desc: vi.fn((...args: unknown[]) => ({ _desc: args })),
}));

vi.mock('../../db/schema/users.js', () => ({
  users: {
    id: 'id',
    name: 'name',
    email: 'email',
    passwordHash: 'passwordHash',
    emailVerified: 'emailVerified',
    role: 'role',
    avatarUrl: 'avatarUrl',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    googleId: 'googleId',
  },
}));

vi.mock('../../db/schema/sessions.js', () => ({
  sessions: {
    id: 'id',
    userId: 'userId',
    deviceId: 'deviceId',
    userAgent: 'userAgent',
    ipAddress: 'ipAddress',
    expiresAt: 'expiresAt',
    createdAt: 'createdAt',
  },
}));

vi.mock('../../db/schema/refresh-tokens.js', () => ({
  refreshTokens: {
    id: 'id',
    tokenHash: 'tokenHash',
    sessionId: 'sessionId',
    userId: 'userId',
    expiresAt: 'expiresAt',
  },
}));

vi.mock('../../cache/session-cache.js', () => ({
  cacheSession: vi.fn().mockResolvedValue(undefined),
  invalidateSession: vi.fn().mockResolvedValue(undefined),
  invalidateAllUserSessions: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../cache/token-blacklist.js', () => ({
  revokeAccessToken: vi.fn().mockResolvedValue(undefined),
  revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
  isRefreshTokenRevoked: vi.fn().mockResolvedValue(false),
  revokeAllUserTokens: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../auth/email-verification.service.js', () => ({
  createAndSendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

import { db } from '../../config/database.js';
import * as authService from '../../modules/auth/auth.service.js';
import { hashToken } from '../../utils/token-hash.js';

// Helper to create a chainable DB mock that returns a specific value
function mockDbChain(returnValue: unknown) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue(Promise.resolve(returnValue)),
    orderBy: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnValue(Promise.resolve(returnValue)),
  };
  return chain;
}

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should create a new user with tokens when email is available', async () => {
      // Mock: no existing user
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockDbChain([]));
      // Mock: insert user returns new user
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'new-user-1',
              name: 'Test User',
              email: 'test@example.com',
              emailVerified: false,
              role: 'member',
              avatarUrl: null,
              createdAt: new Date('2024-01-01'),
              updatedAt: new Date('2024-01-01'),
            },
          ]),
        }),
      });

      const result = await authService.registerUser(
        'Test User',
        'test@example.com',
        'Password123!',
        { deviceId: 'device-1' },
      );

      expect(result.user.id).toBe('new-user-1');
      expect(result.user.name).toBe('Test User');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe('member');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw when email already exists', async () => {
      // Mock: existing user found
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDbChain([{ id: 'existing-user' }]),
      );

      await expect(
        authService.registerUser('Test', 'existing@test.com', 'Password123!'),
      ).rejects.toThrow('A user with this email already exists');
    });

    it('should register without password (OAuth user)', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockDbChain([]));
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'oauth-user',
              name: 'OAuth User',
              email: 'oauth@test.com',
              emailVerified: true,
              role: 'member',
              avatarUrl: 'https://example.com/avatar.jpg',
              createdAt: new Date('2024-01-01'),
              updatedAt: new Date('2024-01-01'),
            },
          ]),
        }),
      });

      const result = await authService.registerUser('OAuth User', 'oauth@test.com', undefined, {
        deviceId: 'device-1',
      });

      expect(result.user.emailVerified).toBe(true);
      expect(result.tokens.accessToken).toBeDefined();
    });
  });

  describe('loginUser', () => {
    it('should return tokens for valid credentials', async () => {
      const { hashPassword } = await import('../../utils/password.js');
      const hash = await hashPassword('Password123!');

      // Mock: find user
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDbChain([
          {
            id: 'user-1',
            name: 'Test User',
            email: 'test@test.com',
            passwordHash: hash,
            emailVerified: true,
            role: 'member',
            avatarUrl: null,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        ]),
      );

      // Mock: insert session
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'session-new' }]),
        }),
      });

      const result = await authService.loginUser('test@test.com', 'Password123!', {
        deviceId: 'device-1',
      });

      expect(result.user.id).toBe('user-1');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw when user not found', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockDbChain([]));

      await expect(
        authService.loginUser('nobody@test.com', 'Password123!'),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw for OAuth-only users (no password)', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDbChain([
          {
            id: 'user-1',
            passwordHash: null,
            emailVerified: true,
          },
        ]),
      );

      await expect(
        authService.loginUser('test@test.com', 'Password123!'),
      ).rejects.toThrow('Google Sign-In');
    });

    it('should throw for wrong password', async () => {
      const { hashPassword } = await import('../../utils/password.js');
      const hash = await hashPassword('CorrectPassword123!');

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDbChain([
          {
            id: 'user-1',
            passwordHash: hash,
            emailVerified: true,
          },
        ]),
      );

      await expect(
        authService.loginUser('test@test.com', 'WrongPassword123!'),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw for unverified email', async () => {
      const { hashPassword } = await import('../../utils/password.js');
      const hash = await hashPassword('Password123!');

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDbChain([
          {
            id: 'user-1',
            passwordHash: hash,
            emailVerified: false,
          },
        ]),
      );

      await expect(
        authService.loginUser('test@test.com', 'Password123!'),
      ).rejects.toThrow('verify your email');
    });
  });

  describe('refreshTokens', () => {
    it('should issue new tokens when refresh token is valid', async () => {
      // First generate a valid refresh token
      const { generateRefreshToken } = await import('../../utils/jwt.js');
      const refreshPayload = {
        userId: 'user-1',
        sessionId: 'session-old',
        deviceId: 'device-1',
      };
      const refreshToken = await generateRefreshToken(refreshPayload);
      const tokenHash = hashToken(refreshToken);

      // Mock: stored token found
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDbChain([
          {
            id: 'rt-1',
            tokenHash,
            sessionId: 'session-old',
            userId: 'user-1',
            expiresAt: new Date(Date.now() + 3600000),
          },
        ]),
      );

      // Mock: insert new session
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'session-new' }]),
        }),
      });

      const { isRefreshTokenRevoked } = await import('../../cache/token-blacklist.js');
      vi.mocked(isRefreshTokenRevoked).mockResolvedValue(false);

      const result = await authService.refreshTokens(refreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      // The new refresh token should be different from the old one
      expect(result.refreshToken).not.toBe(refreshToken);
    });

    it('should throw when refresh token is revoked (reuse detection)', async () => {
      const { generateRefreshToken } = await import('../../utils/jwt.js');
      const refreshToken = await generateRefreshToken({
        userId: 'user-1',
        sessionId: 'session-1',
        deviceId: 'device-1',
      });

      const { isRefreshTokenRevoked, revokeAllUserTokens } = await import(
        '../../cache/token-blacklist.js'
      );
      vi.mocked(isRefreshTokenRevoked).mockResolvedValue(true);
      vi.mocked(revokeAllUserTokens).mockResolvedValue(undefined);

      await expect(authService.refreshTokens(refreshToken)).rejects.toThrow(
        'Invalid or expired refresh token',
      );

      // Verify ALL tokens were revoked (stolen token response)
      expect(revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    });

    it('should throw when stored token not found in DB', async () => {
      const { generateRefreshToken } = await import('../../utils/jwt.js');
      const refreshToken = await generateRefreshToken({
        userId: 'user-1',
        sessionId: 'session-missing',
        deviceId: 'device-1',
      });

      const { isRefreshTokenRevoked } = await import('../../cache/token-blacklist.js');
      vi.mocked(isRefreshTokenRevoked).mockResolvedValue(false);

      // Mock: no stored token
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockDbChain([]));

      await expect(authService.refreshTokens(refreshToken)).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });
  });

  describe('logoutUser', () => {
    it('should revoke tokens and clean up session', async () => {
      const { generateRefreshToken } = await import('../../utils/jwt.js');
      const refreshToken = await generateRefreshToken({
        userId: 'user-1',
        sessionId: 'session-1',
        deviceId: 'device-1',
      });
      // Mock: find token
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDbChain([
          {
            id: 'rt-1',
            sessionId: 'session-1',
            userId: 'user-1',
            expiresAt: new Date(Date.now() + 3600000),
          },
        ]),
      );

      await authService.logoutUser(refreshToken, 'access-jti', new Date(Date.now() + 900000));

      const { revokeRefreshToken, revokeAccessToken } = await import(
        '../../cache/token-blacklist.js'
      );
      expect(revokeRefreshToken).toHaveBeenCalled();
      expect(revokeAccessToken).toHaveBeenCalledWith('access-jti', expect.any(Date));
    });

    it('should still blacklist access token when refresh token not found', async () => {
      const { generateRefreshToken } = await import('../../utils/jwt.js');
      const refreshToken = await generateRefreshToken({
        userId: 'user-1',
        sessionId: 'session-1',
        deviceId: 'device-1',
      });

      // Mock: no stored token
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockDbChain([]));

      await authService.logoutUser(refreshToken, 'access-jti', new Date(Date.now() + 900000));

      const { revokeAccessToken } = await import('../../cache/token-blacklist.js');
      expect(revokeAccessToken).toHaveBeenCalled();
    });
  });

  describe('logoutAllSessions', () => {
    it('should revoke all tokens and delete all sessions', async () => {
      const { revokeAllUserTokens } = await import('../../cache/token-blacklist.js');
      vi.mocked(revokeAllUserTokens).mockResolvedValue(undefined);

      await authService.logoutAllSessions('user-1', 'access-jti', new Date(Date.now() + 900000));

      expect(revokeAllUserTokens).toHaveBeenCalledWith('user-1');

      // Should delete refresh tokens and sessions
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return user payload when user exists', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDbChain([
          {
            id: 'user-1',
            name: 'Test User',
            email: 'test@test.com',
            emailVerified: true,
            role: 'admin',
            avatarUrl: 'https://example.com/avatar.jpg',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-06-01'),
          },
        ]),
      );

      const result = await authService.getCurrentUser('user-1');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test User');
      expect(result?.role).toBe('admin');
    });

    it('should return null when user not found', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockDbChain([]));

      const result = await authService.getCurrentUser('nonexistent');
      expect(result).toBeNull();
    });
  });
});
