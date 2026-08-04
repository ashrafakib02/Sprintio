import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/env.js', () => ({
  env: {
    PASSWORD_RESET_EXPIRY_MS: 3600000,
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
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    _sql: { strings, values },
  })),
  relations: vi.fn((_table: unknown, fn: (...args: unknown[]) => unknown) =>
    fn({ many: vi.fn(), one: vi.fn() }),
  ),
}));

vi.mock('../../db/schema/users.js', () => ({
  users: { id: 'id', email: 'email', passwordHash: 'passwordHash' },
}));

vi.mock('../../db/schema/password-reset-tokens.js', () => ({
  passwordResetTokens: {
    id: 'id',
    tokenHash: 'tokenHash',
    userId: 'userId',
    expiresAt: 'expiresAt',
  },
}));

vi.mock('../../services/email.js', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../cache/token-blacklist.js', () => ({
  revokeAllUserTokens: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../cache/session-cache.js', () => ({
  invalidateAllUserSessions: vi.fn().mockResolvedValue(undefined),
}));

import { db } from '../../config/database.js';
import { forgotPassword, resetPassword } from '../../modules/auth/password-reset.service.js';
import { sendPasswordResetEmail } from '../../services/email.js';
import { revokeAllUserTokens } from '../../cache/token-blacklist.js';

function mockDbChain(returnValue: unknown) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue(Promise.resolve(returnValue)),
    select: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnValue(Promise.resolve(returnValue)),
  };
}

describe('password-reset.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('forgotPassword', () => {
    it('should send reset email when user exists', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDbChain([{ id: 'user-1', email: 'test@test.com' }]),
      );

      const result = await forgotPassword('test@test.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('password reset link has been sent');
      expect(sendPasswordResetEmail).toHaveBeenCalledWith('test@test.com', expect.any(String));

      // Should have deleted existing tokens and inserted new one
      expect(db.delete).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });

    it('should return same message when user does not exist (no user enumeration)', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockDbChain([]));

      const result = await forgotPassword('nonexistent@test.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('password reset link has been sent');
      // Should NOT send email
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should update password and revoke all tokens with valid token', async () => {
      const { hashToken } = await import('../../utils/token-hash.js');
      const token = 'valid-reset-token';
      const tokenHash = hashToken(token);

      // Mock: find stored token (not expired)
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDbChain([
          {
            id: 'pt-1',
            tokenHash,
            userId: 'user-1',
            expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
          },
        ]),
      );

      const result = await resetPassword(token, 'NewPassword123!');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password reset successful');

      // Should update user password
      expect(db.update).toHaveBeenCalled();
      // Should delete the reset token
      expect(db.delete).toHaveBeenCalled();
      // Should revoke all tokens
      expect(revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    });

    it('should fail when token is not found', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockDbChain([]));

      const result = await resetPassword('invalid-token', 'NewPassword123!');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid or expired reset link');
    });

    it('should fail when token has expired', async () => {
      const { hashToken } = await import('../../utils/token-hash.js');
      const token = 'expired-token';
      const tokenHash = hashToken(token);

      // Mock: find token that is expired
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDbChain([
          {
            id: 'pt-2',
            tokenHash,
            userId: 'user-1',
            expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
          },
        ]),
      );

      const result = await resetPassword(token, 'NewPassword123!');

      expect(result.success).toBe(false);
      expect(result.message).toContain('expired');
      // Should delete the expired token
      expect(db.delete).toHaveBeenCalled();
    });
  });
});
