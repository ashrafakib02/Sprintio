import { redis } from '../config/redis.js';
import {
  blacklistAccessKey,
  blacklistRefreshKey,
  userBlacklistMarker,
} from '../utils/redis-keys.js';

// ── Token Blacklisting ───────────────────────────────────────

/**
 * Calculate remaining TTL in seconds from a future expiry date.
 */
function remainingTtl(expiresAt: Date): number {
  const remaining = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  return Math.max(remaining, 1); // At least 1 second
}

/**
 * Revoke an access token by its JTI.
 */
export async function revokeAccessToken(jti: string, expiresAt: Date): Promise<void> {
  const ttl = remainingTtl(expiresAt);
  await redis.set(blacklistAccessKey(jti), '1', 'EX', ttl);
}

/**
 * Revoke a refresh token by its JTI.
 */
export async function revokeRefreshToken(jti: string, expiresAt: Date): Promise<void> {
  const ttl = remainingTtl(expiresAt);
  await redis.set(blacklistRefreshKey(jti), '1', 'EX', ttl);
}

/**
 * Check if an access token JTI has been revoked.
 */
export async function isAccessTokenRevoked(jti: string): Promise<boolean> {
  try {
    const exists = await redis.exists(blacklistAccessKey(jti));
    return exists === 1;
  } catch {
    // If Redis is down, fail open (allow the request) — JWT is still cryptographically valid
    return false;
  }
}

/**
 * Check if a refresh token JTI has been revoked.
 */
export async function isRefreshTokenRevoked(jti: string): Promise<boolean> {
  try {
    const exists = await redis.exists(blacklistRefreshKey(jti));
    return exists === 1;
  } catch {
    return false;
  }
}

/**
 * Mark a user for revocation of all their tokens.
 * Uses a marker key that the middleware checks. Any token issued
 * before this marker was set is considered revoked.
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  const ttl = 7 * 24 * 60 * 60; // 7 days — longest possible token lifetime
  await redis.set(userBlacklistMarker(userId), Date.now().toString(), 'EX', ttl);
}

/**
 * Check if all tokens for a user have been revoked.
 * Returns the timestamp of the revocation marker, or null if no marker exists.
 */
export async function isUserRevoked(userId: string): Promise<number | null> {
  try {
    const timestamp = await redis.get(userBlacklistMarker(userId));
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch {
    return null;
  }
}
