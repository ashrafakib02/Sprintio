// ── Redis Key Helpers ────────────────────────────────────────
// Centralized key patterns for all Redis usage in the auth system.

export function sessionKey(sessionId: string): string {
  return `session:${sessionId}`;
}

export function userSessionsKey(userId: string): string {
  return `user_sessions:${userId}`;
}

export function blacklistAccessKey(jti: string): string {
  return `blacklist:access:${jti}`;
}

export function blacklistRefreshKey(jti: string): string {
  return `blacklist:refresh:${jti}`;
}

export function userBlacklistMarker(userId: string): string {
  return `blacklist:user:${userId}`;
}
