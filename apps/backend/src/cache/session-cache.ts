import { redis } from '../config/redis.js';
import { sessionKey, userSessionsKey } from '../utils/redis-keys.js';

// ── Types ────────────────────────────────────────────────────

export interface CachedSession {
  id: string;
  userId: string;
  deviceId: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: string; // ISO string
  createdAt: string; // ISO string
}

// ── Cache Operations ─────────────────────────────────────────

/**
 * Cache a session in Redis with TTL matching the refresh token expiry.
 */
export async function cacheSession(
  sessionId: string,
  userId: string,
  data: Omit<CachedSession, 'id' | 'userId'>,
  ttlMs: number,
): Promise<void> {
  const key = sessionKey(sessionId);
  const ttlSeconds = Math.floor(ttlMs / 1000);

  const cached: CachedSession = {
    id: sessionId,
    userId,
    ...data,
  };

  await redis.set(key, JSON.stringify(cached), 'EX', ttlSeconds);

  // Track session ID in user's session set for bulk invalidation
  const userKey = userSessionsKey(userId);
  await redis.sadd(userKey, sessionId);
  await redis.expire(userKey, ttlSeconds);
}

/**
 * Get a cached session from Redis.
 * Returns null if not found or expired.
 */
export async function getCachedSession(sessionId: string): Promise<CachedSession | null> {
  try {
    const data = await redis.get(sessionKey(sessionId));
    if (!data) return null;
    return JSON.parse(data) as CachedSession;
  } catch {
    return null;
  }
}

/**
 * Invalidate a single session cache entry.
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  try {
    // Get the session to find userId for cleanup
    const data = await redis.get(sessionKey(sessionId));
    if (data) {
      const session = JSON.parse(data) as CachedSession;
      await redis.srem(userSessionsKey(session.userId), sessionId);
    }
    await redis.del(sessionKey(sessionId));
  } catch {
    // Silently fail — cache invalidation is best-effort
  }
}

/**
 * Invalidate all cached sessions for a user.
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  try {
    const userKey = userSessionsKey(userId);
    const sessionIds = await redis.smembers(userKey);

    if (sessionIds.length > 0) {
      const pipeline = redis.pipeline();
      for (const id of sessionIds) {
        pipeline.del(sessionKey(id));
      }
      pipeline.del(userKey);
      await pipeline.exec();
    }
  } catch {
    // Silently fail — cache invalidation is best-effort
  }
}
