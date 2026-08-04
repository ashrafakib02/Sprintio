import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    orderBy: vi.fn().mockReturnThis(),
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
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    _sql: { strings, values },
  })),
  relations: vi.fn((_table: unknown, fn: (...args: unknown[]) => unknown) =>
    fn({ many: vi.fn(), one: vi.fn() }),
  ),
}));

vi.mock('../../db/schema/users.js', () => ({
  users: { id: 'id', role: 'role', email: 'email' },
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

import { db } from '../../config/database.js';
import { listUserSessions, revokeSession } from '../../modules/auth/auth.service.js';
import { invalidateSession } from '../../cache/session-cache.js';

describe('session management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUserSessions', () => {
    it('should return sessions with parsed device info', async () => {
      const sessions = [
        {
          id: 'session-1',
          userId: 'user-1',
          deviceId: 'device-1',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
          ipAddress: '192.168.1.1',
          expiresAt: new Date(Date.now() + 86400000),
          createdAt: new Date('2024-01-15T10:00:00Z'),
        },
      ];

      // Mock the chained query - listUserSessions uses select().from().where().orderBy()
      const chainMock = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(sessions),
        select: vi.fn().mockReturnThis(),
      };
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chainMock);

      const result = await listUserSessions('user-1', 'device-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('session-1');
      expect(result[0].isCurrent).toBe(true); // deviceId matches
      expect(result[0].browser).toContain('Chrome');
      expect(result[0].os).toContain('Windows');
      expect(result[0].ipAddress).toBe('192.168.1.1');
    });

    it('should mark isCurrent=false for non-current device', async () => {
      const sessions = [
        {
          id: 'session-1',
          userId: 'user-1',
          deviceId: 'device-other',
          userAgent: 'Chrome/120',
          ipAddress: '10.0.0.1',
          expiresAt: new Date(Date.now() + 86400000),
          createdAt: new Date(),
        },
      ];

      const chainMock = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(sessions),
        select: vi.fn().mockReturnThis(),
      };
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chainMock);

      const result = await listUserSessions('user-1', 'current-device');
      expect(result[0].isCurrent).toBe(false);
    });

    it('should return empty array when user has no sessions', async () => {
      const chainMock = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        select: vi.fn().mockReturnThis(),
      };
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chainMock);

      const result = await listUserSessions('user-1', 'device-1');
      expect(result).toHaveLength(0);
    });

    it('should handle multiple sessions', async () => {
      const sessions = [
        {
          id: 's1',
          userId: 'user-1',
          deviceId: 'device-1',
          userAgent: 'Chrome/120',
          ipAddress: '10.0.0.1',
          expiresAt: new Date(Date.now() + 86400000),
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 's2',
          userId: 'user-1',
          deviceId: 'device-2',
          userAgent: 'Safari/17',
          ipAddress: '10.0.0.2',
          expiresAt: new Date(Date.now() + 86400000),
          createdAt: new Date('2024-01-16'),
        },
      ];

      const chainMock = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(sessions),
        select: vi.fn().mockReturnThis(),
      };
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chainMock);

      const result = await listUserSessions('user-1', 'device-1');
      expect(result).toHaveLength(2);
      expect(result[0].isCurrent).toBe(true);
      expect(result[1].isCurrent).toBe(false);
    });
  });

  describe('revokeSession', () => {
    it('should delete session and invalidate cache', async () => {
      const now = new Date(Date.now() + 86400000);

      // Mock: find session belonging to user (not current)
      const sessionChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValue([{ id: 'session-2', userId: 'user-1', deviceId: 'device-other' }]),
        select: vi.fn().mockReturnThis(),
      };

      // Mock: find refresh token for session
      const tokenChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 'rt-2', sessionId: 'session-2', expiresAt: now }]),
        select: vi.fn().mockReturnThis(),
      };

      let selectCallCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        selectCallCount++;
        return selectCallCount === 1 ? sessionChain : tokenChain;
      });

      await revokeSession('user-1', 'session-2', 'device-current');

      expect(invalidateSession).toHaveBeenCalledWith('session-2');
      expect(db.delete).toHaveBeenCalled();
    });

    it('should throw when session not found', async () => {
      const sessionChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        select: vi.fn().mockReturnThis(),
      };
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(sessionChain);

      await expect(revokeSession('user-1', 'nonexistent', 'device-1')).rejects.toThrow(
        'Session not found',
      );
    });

    it('should throw when trying to revoke current session', async () => {
      const sessionChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValue([{ id: 'session-1', userId: 'user-1', deviceId: 'device-current' }]),
        select: vi.fn().mockReturnThis(),
      };
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(sessionChain);

      await expect(revokeSession('user-1', 'session-1', 'device-current')).rejects.toThrow(
        'Cannot revoke your current session',
      );
    });
  });
});
