import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/redis.js', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('../../../config/env.js', () => ({
  env: {},
}));

import {
  revokeAccessToken,
  revokeRefreshToken,
  isAccessTokenRevoked,
  isRefreshTokenRevoked,
  revokeAllUserTokens,
  isUserRevoked,
} from '../../../cache/token-blacklist.js';
import { redis } from '../../../config/redis.js';

describe('token-blacklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('revokeAccessToken', () => {
    it('should set blacklist:access:{jti} with TTL based on expiry', async () => {
      const futureDate = new Date(Date.now() + 60000); // 60 seconds from now
      await revokeAccessToken('jti-123', futureDate);

      expect(redis.set).toHaveBeenCalledWith(
        'blacklist:access:jti-123',
        '1',
        'EX',
        expect.any(Number),
      );

      const ttl = (redis.set as ReturnType<typeof vi.fn>).mock.calls[0][3];
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('should use minimum TTL of 1 second for already expired tokens', async () => {
      const pastDate = new Date(Date.now() - 10000); // already expired
      await revokeAccessToken('jti-expired', pastDate);

      const ttl = (redis.set as ReturnType<typeof vi.fn>).mock.calls[0][3];
      expect(ttl).toBe(1);
    });
  });

  describe('revokeRefreshToken', () => {
    it('should set blacklist:refresh:{jti} with TTL', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour
      await revokeRefreshToken('jti-refresh', futureDate);

      expect(redis.set).toHaveBeenCalledWith(
        'blacklist:refresh:jti-refresh',
        '1',
        'EX',
        expect.any(Number),
      );
    });
  });

  describe('isAccessTokenRevoked', () => {
    it('should return true when access token is revoked (exists=1)', async () => {
      (redis.exists as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      const result = await isAccessTokenRevoked('jti-abc');
      expect(result).toBe(true);
      expect(redis.exists).toHaveBeenCalledWith('blacklist:access:jti-abc');
    });

    it('should return false when access token is not revoked (exists=0)', async () => {
      (redis.exists as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await isAccessTokenRevoked('jti-abc');
      expect(result).toBe(false);
    });

    it('should return false (fail-open) when Redis throws an error', async () => {
      (redis.exists as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Redis down'));

      const result = await isAccessTokenRevoked('jti-abc');
      expect(result).toBe(false);
    });
  });

  describe('isRefreshTokenRevoked', () => {
    it('should return true when refresh token is revoked', async () => {
      (redis.exists as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      const result = await isRefreshTokenRevoked('jti-r');
      expect(result).toBe(true);
      expect(redis.exists).toHaveBeenCalledWith('blacklist:refresh:jti-r');
    });

    it('should return false when refresh token is not revoked', async () => {
      (redis.exists as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await isRefreshTokenRevoked('jti-r');
      expect(result).toBe(false);
    });

    it('should return false (fail-open) when Redis throws an error', async () => {
      (redis.exists as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Connection lost'));

      const result = await isRefreshTokenRevoked('jti-r');
      expect(result).toBe(false);
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should set a user blacklist marker with 7-day TTL', async () => {
      await revokeAllUserTokens('user-123');

      expect(redis.set).toHaveBeenCalledWith(
        'blacklist:user:user-123',
        expect.any(String),
        'EX',
        604800, // 7 * 24 * 60 * 60
      );

      // The value should be a timestamp
      const value = (redis.set as ReturnType<typeof vi.fn>).mock.calls[0][1];
      const timestamp = parseInt(value, 10);
      expect(timestamp).toBeGreaterThan(0);
      expect(timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('isUserRevoked', () => {
    it('should return timestamp when user has a revocation marker', async () => {
      const timestamp = Date.now().toString();
      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(timestamp);

      const result = await isUserRevoked('user-123');
      expect(result).toBe(parseInt(timestamp, 10));
      expect(redis.get).toHaveBeenCalledWith('blacklist:user:user-123');
    });

    it('should return null when user has no revocation marker', async () => {
      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await isUserRevoked('user-123');
      expect(result).toBeNull();
    });

    it('should fail-closed (return timestamp) when Redis throws an error', async () => {
      (redis.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Redis error'));

      const result = await isUserRevoked('user-123');
      // Fail-closed: returns Date.now() to protect user during Redis outage
      expect(result).toBeTypeOf('number');
      expect(result).toBeGreaterThan(0);
    });
  });
});
