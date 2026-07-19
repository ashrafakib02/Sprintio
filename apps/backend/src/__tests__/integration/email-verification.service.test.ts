import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/env.js', () => ({
  env: {
    EMAIL_VERIFICATION_EXPIRY_MS: 86400000,
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
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ _eq: args })),
}));

vi.mock('../../db/schema/users.js', () => ({
  users: { id: 'id', email: 'email', emailVerified: 'emailVerified' },
}));

vi.mock('../../db/schema/email-verification-tokens.js', () => ({
  emailVerificationTokens: {
    id: 'id',
    tokenHash: 'tokenHash',
    userId: 'userId',
    expiresAt: 'expiresAt',
  },
}));

vi.mock('../../services/email.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

import { db } from '../../config/database.js';
import {
  generateVerificationToken,
  createAndSendVerificationEmail,
  verifyEmailToken,
  resendVerification,
} from '../../modules/auth/email-verification.service.js';
import { sendVerificationEmail } from '../../services/email.js';
import { hashToken } from '../../utils/token-hash.js';

function mockDbChain(returnValue: unknown) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue(Promise.resolve(returnValue)),
    select: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnValue(Promise.resolve(returnValue)),
  };
}

describe('email-verification.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateVerificationToken', () => {
    it('should generate a UUID token and store its hash', async () => {
      const token = await generateVerificationToken('user-1');

      expect(typeof token).toBe('string');
      expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

      // Should delete old tokens and insert new one
      expect(db.delete).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });

    it('should store the SHA-256 hash of the token', async () => {
      const token = await generateVerificationToken('user-1');
      const expectedHash = hashToken(token);

      // db.insert().values() — insert() returns db mock via mockReturnThis(), so values is on db
      const valuesFn = (db as unknown as Record<string, ReturnType<typeof vi.fn>>).values;
      const valuesCall = valuesFn.mock.calls[0];
      const values = valuesCall[0]; // first argument to .values()
      expect(values.tokenHash).toBe(expectedHash);
    });
  });

  describe('createAndSendVerificationEmail', () => {
    it('should generate token and send email', async () => {
      await createAndSendVerificationEmail('user-1', 'test@test.com');

      expect(sendVerificationEmail).toHaveBeenCalledWith('test@test.com', expect.any(String));
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('verifyEmailToken', () => {
    it('should verify email with valid token', async () => {
      const token = 'valid-verification-token';
      const tokenHash = hashToken(token);

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDbChain([
          {
            id: 'evt-1',
            tokenHash,
            userId: 'user-1',
            expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
          },
        ]),
      );

      const result = await verifyEmailToken(token);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email verified successfully');

      // Should update user's emailVerified
      expect(db.update).toHaveBeenCalled();
      // Should delete the token (single-use)
      expect(db.delete).toHaveBeenCalled();
    });

    it('should fail with invalid token', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockDbChain([]));

      const result = await verifyEmailToken('nonexistent-token');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid or expired verification link');
    });

    it('should fail with expired token', async () => {
      const token = 'expired-token';
      const tokenHash = hashToken(token);

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDbChain([
          {
            id: 'evt-2',
            tokenHash,
            userId: 'user-1',
            expiresAt: new Date(Date.now() - 1000), // expired
          },
        ]),
      );

      const result = await verifyEmailToken(token);

      expect(result.success).toBe(false);
      expect(result.message).toContain('expired');
      // Should delete the expired token
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('resendVerification', () => {
    it('should send verification email for unverified user', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDbChain([{ id: 'user-1', email: 'test@test.com', emailVerified: false }]),
      );

      const result = await resendVerification('test@test.com');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Verification email sent');
      expect(sendVerificationEmail).toHaveBeenCalled();
    });

    it('should return same message when user not found (no enumeration)', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(mockDbChain([]));

      const result = await resendVerification('nobody@test.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('verification email has been sent');
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should fail when email is already verified', async () => {
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDbChain([{ id: 'user-1', email: 'test@test.com', emailVerified: true }]),
      );

      const result = await resendVerification('test@test.com');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Email already verified');
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });
  });
});
