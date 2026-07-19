import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/redis.js', () => ({
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

vi.mock('../../../config/env.js', () => ({
  env: {},
}));

import {
  cacheSession,
  getCachedSession,
  invalidateSession,
  invalidateAllUserSessions,
} from '../../../cache/session-cache.js';
import { redis } from '../../../config/redis.js';

describe('session-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cacheSession', () => {
    it('should store session data in Redis with EX and track in set', async () => {
      const data = {
        deviceId: 'device-1',
        userAgent: 'Chrome',
        ipAddress: '127.0.0.1',
        expiresAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      await cacheSession('session-1', 'user-1', data, 60000);

      // Should call redis.set with session key, JSON, EX, and ttl
      expect(redis.set).toHaveBeenCalledWith(
        'session:session-1',
        expect.any(String),
        'EX',
        60,
      );

      // Verify the JSON content
      const setCall = (redis.set as ReturnType<typeof vi.fn>).mock.calls[0];
      const stored = JSON.parse(setCall[1]);
      expect(stored.id).toBe('session-1');
      expect(stored.userId).toBe('user-1');
      expect(stored.deviceId).toBe('device-1');

      // Should add to user sessions set
      expect(redis.sadd).toHaveBeenCalledWith('user_sessions:user-1', 'session-1');
      expect(redis.expire).toHaveBeenCalledWith('user_sessions:user-1', 60);
    });

    it('should floor TTL to seconds', async () => {
      await cacheSession('s1', 'u1', {
        deviceId: null,
        userAgent: null,
        ipAddress: null,
        expiresAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }, 9999); // 9.999 seconds → floored to 9

      expect(redis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'EX',
        9,
      );
    });
  });

  describe('getCachedSession', () => {
    it('should return parsed session data when found', async () => {
      const sessionData = {
        id: 'session-1',
        userId: 'user-1',
        deviceId: 'device-1',
        userAgent: 'Chrome',
        ipAddress: '127.0.0.1',
        expiresAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(sessionData));

      const result = await getCachedSession('session-1');
      expect(result).toEqual(sessionData);
      expect(redis.get).toHaveBeenCalledWith('session:session-1');
    });

    it('should return null when session not found', async () => {
      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await getCachedSession('session-missing');
      expect(result).toBeNull();
    });

    it('should return null when Redis throws an error', async () => {
      (redis.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Redis down'));

      const result = await getCachedSession('session-1');
      expect(result).toBeNull();
    });

    it('should return null when stored data is not valid JSON', async () => {
      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue('not-json{{{');

      const result = await getCachedSession('session-1');
      expect(result).toBeNull();
    });
  });

  describe('invalidateSession', () => {
    it('should remove session from cache and user set', async () => {
      const sessionData = JSON.stringify({
        id: 'session-1',
        userId: 'user-1',
        deviceId: 'device-1',
      });

      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(sessionData);

      await invalidateSession('session-1');

      expect(redis.srem).toHaveBeenCalledWith('user_sessions:user-1', 'session-1');
      expect(redis.del).toHaveBeenCalledWith('session:session-1');
    });

    it('should delete key even when session data not found', async () => {
      (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await invalidateSession('session-1');

      expect(redis.srem).not.toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledWith('session:session-1');
    });

    it('should silently handle Redis errors', async () => {
      (redis.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Redis down'));

      // Should not throw
      await expect(invalidateSession('session-1')).resolves.toBeUndefined();
    });
  });

  describe('invalidateAllUserSessions', () => {
    it('should delete all session keys and the user set via pipeline', async () => {
      (redis.smembers as ReturnType<typeof vi.fn>).mockResolvedValue(['s1', 's2', 's3']);

      const mockPipeline = {
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      (redis.pipeline as ReturnType<typeof vi.fn>).mockReturnValue(mockPipeline);

      await invalidateAllUserSessions('user-1');

      // Should delete each session key + the user set key
      expect(mockPipeline.del).toHaveBeenCalledTimes(4);
      expect(mockPipeline.del).toHaveBeenCalledWith('session:s1');
      expect(mockPipeline.del).toHaveBeenCalledWith('session:s2');
      expect(mockPipeline.del).toHaveBeenCalledWith('session:s3');
      expect(mockPipeline.del).toHaveBeenCalledWith('user_sessions:user-1');
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should do nothing when user has no sessions', async () => {
      (redis.smembers as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await invalidateAllUserSessions('user-1');

      expect(redis.pipeline).not.toHaveBeenCalled();
    });

    it('should silently handle Redis errors', async () => {
      (redis.smembers as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Redis down'));

      await expect(invalidateAllUserSessions('user-1')).resolves.toBeUndefined();
    });
  });
});
