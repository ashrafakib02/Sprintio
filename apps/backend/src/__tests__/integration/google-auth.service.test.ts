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

// Mock env with Google OAuth configured
vi.mock('../../config/env.js', () => ({
  env: {
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:3001/api/auth/google/callback',
    JWT_ACCESS_PRIVATE_KEY: privateKeyBase64,
    JWT_ACCESS_PUBLIC_KEY: publicKeyBase64,
    JWT_REFRESH_PRIVATE_KEY: privateKeyBase64,
    JWT_REFRESH_PUBLIC_KEY: publicKeyBase64,
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    JWT_ACCESS_EXPIRY_MS: 900000,
    JWT_REFRESH_EXPIRY_MS: 604800000,
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
    sadd: vi.fn().mockResolvedValue(1),
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

vi.mock('../../db/schema/oauth-accounts.js', () => ({
  oauthAccounts: {
    id: 'id',
    userId: 'userId',
    provider: 'provider',
    providerAccountId: 'providerAccountId',
    accessToken: 'accessToken',
    refreshToken: 'refreshToken',
    expiresAt: 'expiresAt',
    scope: 'scope',
    tokenType: 'tokenType',
    createdAt: 'createdAt',
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

// Mock googleapis
vi.mock('googleapis', () => {
  const mockGetToken = vi.fn().mockResolvedValue({
    tokens: {
      access_token: 'google-access-token',
      id_token: 'google-id-token',
      refresh_token: 'google-refresh-token',
      expiry_date: Date.now() + 3600000,
    },
  });

  const mockGenerateAuthUrl = vi.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth');

  const mockOAuth2 = {
    getToken: mockGetToken,
    setCredentials: vi.fn(),
    generateAuthUrl: mockGenerateAuthUrl,
  };

  const mockUserinfoGet = vi.fn().mockResolvedValue({
    data: {
      id: 'google-user-id-123',
      email: 'google@test.com',
      name: 'Google User',
      picture: 'https://example.com/photo.jpg',
      verified_email: true,
    },
  });

  return {
    google: {
      auth: {
        OAuth2: vi.fn().mockImplementation(() => ({
          ...mockOAuth2,
          generateAuthUrl: mockGenerateAuthUrl,
          getToken: mockGetToken,
          setCredentials: vi.fn(),
        })),
      },
      oauth2: vi.fn().mockReturnValue({
        userinfo: { get: mockUserinfoGet },
      }),
    },
  };
});

import { db } from '../../config/database.js';
import {
  handleGoogleCallback,
  linkGoogleAccount,
  unlinkGoogleAccount,
  getLinkedProviders,
} from '../../modules/auth/google-auth.service.js';

function mockDbChain(returnValue: unknown) {
  const chain: Record<string, unknown> = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue(Promise.resolve(returnValue)),
    select: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnValue(Promise.resolve(returnValue)),
  };

  // Make the chain thenable so `await db.select().from().where()` works
  // and `.then(callback)` works for Drizzle's implicit execution
  chain.then = (resolve: (value: unknown) => unknown, reject?: (err: unknown) => unknown) => {
    return Promise.resolve(returnValue).then(resolve, reject);
  };

  return chain;
}

describe('google-auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleGoogleCallback', () => {
    it('should create a new user when Google account is new', async () => {
      // Mock: no existing user by googleId
      // Mock: no existing user by email
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockDbChain([]));

      // Mock: insert returns new user
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'new-user',
              name: 'Google User',
              email: 'google@test.com',
              emailVerified: true,
              role: 'member',
              avatarUrl: 'https://example.com/photo.jpg',
              createdAt: new Date('2024-01-01'),
              updatedAt: new Date('2024-01-01'),
            },
          ]),
        }),
      });

      const result = await handleGoogleCallback('auth-code', { deviceId: 'device-1' });

      expect(result.user.email).toBe('google@test.com');
      expect(result.user.name).toBe('Google User');
      expect(result.user.emailVerified).toBe(true);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should link Google account to existing email user', async () => {
      // Mock: no user by googleId
      (db.select as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockDbChain([])) // googleId lookup
        .mockReturnValueOnce(
          // email lookup returns existing user
          mockDbChain([
            {
              id: 'existing-user',
              name: 'Existing User',
              email: 'google@test.com',
              passwordHash: 'some-hash',
              emailVerified: false,
              role: 'member',
              avatarUrl: null,
              createdAt: new Date('2024-01-01'),
              updatedAt: new Date('2024-01-01'),
            },
          ]),
        )
        .mockReturnValueOnce(
          // Fetch updated user
          mockDbChain([
            {
              id: 'existing-user',
              name: 'Existing User',
              email: 'google@test.com',
              passwordHash: 'some-hash',
              emailVerified: true,
              role: 'member',
              avatarUrl: 'https://example.com/photo.jpg',
              createdAt: new Date('2024-01-01'),
              updatedAt: new Date('2024-06-01'),
            },
          ]),
        );

      const result = await handleGoogleCallback('auth-code', { deviceId: 'device-1' });

      expect(result.user.email).toBe('google@test.com');
      // Should have updated user with Google data
      expect(db.update).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled(); // oauth_accounts entry
    });

    it('should update existing Google user on returning login', async () => {
      const existingUser = {
        id: 'google-user',
        name: 'Google User',
        email: 'google@test.com',
        passwordHash: null,
        emailVerified: true,
        role: 'member',
        avatarUrl: 'https://example.com/old-photo.jpg',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      // Mock: found by googleId
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockDbChain([existingUser]));

      // Mock: insert returns new user (for session creation)
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'new-session' }]),
        }),
      });

      const result = await handleGoogleCallback('auth-code', { deviceId: 'device-1' });

      expect(result.user.id).toBe('google-user');
      // Should update oauth accounts
      expect(db.update).toHaveBeenCalled();
    });

    it('should throw when Google has no email', async () => {
      // Override googleapis mock for this test
      const { google } = await import('googleapis');
      vi.mocked(google.oauth2).mockReturnValue({
        userinfo: {
          get: vi.fn().mockResolvedValue({
            data: { id: '123', email: null, name: null },
          }),
        },
      } as never);

      await expect(handleGoogleCallback('auth-code', { deviceId: 'd1' })).rejects.toThrow(
        'Could not retrieve email',
      );
    });
  });

  describe('linkGoogleAccount', () => {
    it('should link Google account to user', async () => {
      // Mock: no existing link for this google account
      // Mock: user doesn't already have Google link
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockDbChain([]));

      const result = await linkGoogleAccount('user-1', 'auth-code');

      expect(result).toEqual([]);
      expect(db.insert).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
    });

    it('should throw when Google account already linked to another user', async () => {
      // Mock: existing link found for different user
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDbChain([{ userId: 'other-user' }]),
      );

      await expect(linkGoogleAccount('user-1', 'auth-code')).rejects.toThrow(
        'already linked to another user',
      );
    });

    it('should throw when user already has a Google link', async () => {
      // Mock: no existing link for this Google account ID
      // Mock: but user already has a Google provider link
      (db.select as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockDbChain([])) // no existing link by providerAccountId
        .mockReturnValueOnce(mockDbChain([{ provider: 'google' }])); // user has google link

      await expect(linkGoogleAccount('user-1', 'auth-code')).rejects.toThrow(
        'Google account is already linked',
      );
    });
  });

  describe('unlinkGoogleAccount', () => {
    it('should unlink Google account when user has a password', async () => {
      // Mock: user has passwordHash
      (db.select as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(
          mockDbChain([{ id: 'user-1', passwordHash: 'some-hash' }]),
        )
        .mockReturnValueOnce(mockDbChain([])) // other OAuth providers check
        .mockReturnValueOnce(mockDbChain([])); // getLinkedProviders after unlink

      const result = await unlinkGoogleAccount('user-1');

      expect(result).toEqual([]);
      expect(db.delete).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
    });

    it('should prevent unlink when user has no password and no other providers', async () => {
      (db.select as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(
          mockDbChain([{ id: 'user-1', passwordHash: null }]),
        )
        .mockReturnValueOnce(mockDbChain([])); // no other providers

      await expect(unlinkGoogleAccount('user-1')).rejects.toThrow(
        'Cannot unlink Google account',
      );
    });

    it('should allow unlink when user has another OAuth provider', async () => {
      (db.select as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(
          mockDbChain([{ id: 'user-1', passwordHash: null }]),
        )
        .mockReturnValueOnce(
          mockDbChain([{ provider: 'github' }]), // has github provider
        )
        .mockReturnValueOnce(mockDbChain([])); // getLinkedProviders after unlink

      const result = await unlinkGoogleAccount('user-1');

      expect(result).toEqual([]);
      expect(db.delete).toHaveBeenCalled();
    });

    it('should throw when user not found', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockDbChain([]));

      await expect(unlinkGoogleAccount('nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('getLinkedProviders', () => {
    it('should return list of linked providers', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDbChain([
          {
            provider: 'google',
            providerAccountId: 'google-123',
            createdAt: new Date('2024-01-01'),
          },
        ]),
      );

      const result = await getLinkedProviders('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe('google');
      expect(result[0].providerAccountId).toBe('google-123');
    });

    it('should return empty array when no providers linked', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockDbChain([]));

      const result = await getLinkedProviders('user-1');
      expect(result).toEqual([]);
    });
  });
});
