# Auth Token System

## Overview

The authentication token system uses **ES256 (ECDSA P-256)** asymmetric JWTs with per-device sessions, Redis-backed token blacklisting, and session caching. This provides stronger cryptographic guarantees than HS256, per-device logout, instant token revocation, and reduced database load.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      TOKEN SYSTEM                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Keys (ES256 — Asymmetric)                                      │
│  ├─ Access:  Private key signs → Public key verifies            │
│  └─ Refresh: Private key signs → Public key verifies            │
│      (Separate key pairs for isolation)                         │
│                                                                 │
│  Token Payloads                                                 │
│  ├─ Access:  { userId, email, jti, deviceId }                   │
│  └─ Refresh: { userId, sessionId, jti, deviceId }               │
│                                                                 │
│  Security Features                                              │
│  ├─ Refresh rotation (single-use tokens)                        │
│  ├─ Token blacklisting (Redis, per-JTI)                         │
│  ├─ Device ID tracking (per-device sessions)                    │
│  ├─ Reuse detection (stolen token protection)                   │
│  └─ Redis session cache (reduced DB reads)                      │
│                                                                 │
│  Storage                                                        │
│  ├─ PostgreSQL: users, sessions, refresh_tokens                 │
│  └─ Redis: session cache, blacklist, device→session mapping     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## ES256 vs HS256

| Feature     | HS256 (Before)                           | ES256 (Current)                        |
| ----------- | ---------------------------------------- | -------------------------------------- |
| Algorithm   | HMAC-SHA256                              | ECDSA P-256                            |
| Key Type    | Symmetric (shared secret)                | Asymmetric (key pair)                  |
| Key Size    | 32+ char string                          | 256-bit EC key                         |
| Signing     | Same secret signs + verifies             | Private key signs, public key verifies |
| Security    | Secret compromise = all tokens forgeable | Only private key can sign              |
| Performance | Fast (symmetric)                         | Slightly slower (asymmetric)           |
| Library     | `jose` (native ES256 support)            | `jose` (no new dependencies)           |

### Key Generation

```bash
cd apps/backend
npx tsx src/utils/generate-keys.ts
```

Outputs base64-encoded PEM keys for `.env` configuration. Generates separate key pairs for access and refresh tokens.

## Token Structure

### Access Token

```
Header:  { alg: "ES256", typ: "JWT" }
Payload: {
  sub:     string   // userId (standard JWT claim)
  userId:  string   // userId (application claim)
  email:   string   // user email
  jti:     string   // UUID — unique token ID for blacklisting
  deviceId: string  // UUID — identifies the login device
  iat:     number   // issued at (unix timestamp)
  exp:     number   // expiry (unix timestamp, 15 minutes)
}
```

### Refresh Token

```
Header:  { alg: "ES256", typ: "JWT" }
Payload: {
  sub:       string   // userId
  userId:    string   // userId
  sessionId: string   // session UUID
  jti:       string   // UUID — unique token ID for blacklisting
  deviceId:  string   // UUID — same device as access token
  iat:       number   // issued at
  exp:       number   // expiry (7 days)
}
```

## Device ID

### How It Works

1. **First login/register**: Server generates a UUID `deviceId`, stores it in a cookie (`device_id`, HttpOnly, 365-day expiry), and associates it with the session in the DB.
2. **Subsequent requests**: Client automatically sends the `device_id` cookie. Server reads it and uses it for token generation and session tracking.
3. **Per-device sessions**: Each device gets its own session and refresh token. Logging out from one device doesn't affect others.

### Cookie Details

| Property | Value                                               |
| -------- | --------------------------------------------------- |
| Name     | `device_id` (configurable via `DEVICE_COOKIE_NAME`) |
| HttpOnly | true                                                |
| SameSite | Lax                                                 |
| Secure   | respects `COOKIE_SECURE` env var                    |
| MaxAge   | 365 days (configurable via `DEVICE_COOKIE_MAX_AGE`) |
| Path     | `/`                                                 |

### Schema Column

Added to `sessions` table:

```ts
deviceId: varchar('device_id', { length: 36 }); // nullable for backward compat
```

## Token Blacklisting

### Strategy

Redis-based with automatic TTL expiry. Each revoked token's JTI is stored as a key with TTL matching its remaining lifetime.

### Redis Keys

| Key Pattern               | Type   | TTL                         | Purpose                                  |
| ------------------------- | ------ | --------------------------- | ---------------------------------------- |
| `blacklist:access:{jti}`  | STRING | remaining access token TTL  | Revoked access token                     |
| `blacklist:refresh:{jti}` | STRING | remaining refresh token TTL | Revoked refresh token                    |
| `blacklist:user:{userId}` | STRING | 7 days                      | User-wide revocation marker (logout-all) |

### When Tokens Are Revoked

| Action                 | Access Token                                   | Refresh Token                       |
| ---------------------- | ---------------------------------------------- | ----------------------------------- |
| Logout (single device) | Blacklisted by JTI                             | Blacklisted by JTI                  |
| Logout (all devices)   | User-wide marker set                           | All DB tokens deleted               |
| Refresh rotation       | Old access not blacklisted (expires naturally) | Old refresh deleted from DB + Redis |
| Refresh reuse detected | User-wide marker set                           | User-wide marker set                |

### Middleware Check

The `authenticate` middleware checks Redis for revoked tokens on every request:

1. Verify JWT signature (ES256) — cryptographic validity
2. Check `blacklist:access:{jti}` — individual revocation
3. Check `blacklist:user:{userId}` — user-wide revocation

**Fail-open policy**: If Redis is down, requests are allowed through (the JWT is still cryptographically valid). This prevents Redis outages from locking out all users.

## Redis Session Cache

### Purpose

Cache session data in Redis to avoid hitting the database on every authenticated request.

### Redis Keys

| Key Pattern              | Type          | TTL                       | Value              |
| ------------------------ | ------------- | ------------------------- | ------------------ |
| `session:{sessionId}`    | STRING (JSON) | refresh token expiry (7d) | Session data       |
| `user_sessions:{userId}` | SET           | refresh token expiry (7d) | Set of session IDs |

### Cached Session Shape

```ts
{
  id: string; // session UUID
  userId: string; // user UUID
  deviceId: string; // device UUID
  userAgent: string; // client user-agent
  ipAddress: string; // client IP
  expiresAt: string; // ISO timestamp
  createdAt: string; // ISO timestamp
}
```

### Cache Lifecycle

- **Write**: On login/register → `cacheSession()`
- **Read**: On refresh → `getCachedSession()` (currently not used in middleware to keep access fast; available for future use)
- **Invalidate**: On logout → `invalidateSession()`; on logout-all → `invalidateAllUserSessions()`
- **Cleanup**: TTL handles expiry automatically; user session SET allows bulk invalidation

## Refresh Token Rotation

### Flow

1. Client sends refresh token (from cookie) to `POST /api/auth/refresh`
2. Server verifies JWT signature (ES256)
3. Server checks Redis blacklist for the refresh token's JTI
4. Server hashes the token and looks it up in the DB
5. **Reuse detection**: If the token was already consumed (consumed marker in Redis), it's a stolen token → revoke ALL tokens for the device
6. Delete the old refresh token from DB (single-use)
7. Delete old session from DB + invalidate Redis cache
8. Create new session + token pair with same deviceId
9. Set new cookies and respond

### Reuse Detection

If a refresh token that was already rotated is reused:

1. The token's hash won't be found in the DB (it was deleted)
2. If the hash IS found but the consumed marker exists in Redis → reuse detected
3. Response: revoke ALL tokens for the user + return 401

## Logout

### Single Device (`POST /api/auth/logout`)

1. Extract access token JTI from cookie for blacklisting
2. Find refresh token by hash in DB
3. Blacklist both access and refresh token JTIs in Redis
4. Delete refresh token + session from DB
5. Invalidate session cache in Redis
6. Clear all auth cookies

### All Devices (`POST /api/auth/logout-all`)

1. Set user-wide revocation marker in Redis (`blacklist:user:{userId}`)
2. Invalidate all session caches for the user
3. Delete all refresh tokens + sessions from DB
4. Blacklist current access token JTI
5. Clear all auth cookies

## Redis Key Inventory

Complete list of all Redis keys used by the auth system:

| Key                       | Type   | TTL    | Purpose                    |
| ------------------------- | ------ | ------ | -------------------------- |
| `session:{sessionId}`     | STRING | 7d     | Cached session data        |
| `user_sessions:{userId}`  | SET    | 7d     | Track session IDs per user |
| `blacklist:access:{jti}`  | STRING | ~15min | Revoked access token       |
| `blacklist:refresh:{jti}` | STRING | ~7d    | Revoked refresh token      |
| `blacklist:user:{userId}` | STRING | 7d     | User-wide token revocation |

## Security Considerations

1. **Asymmetric keys**: Private key never leaves the server. Public key could be shared with other services for verification.
2. **Separate key pairs**: Access and refresh tokens use different key pairs. Compromising one doesn't affect the other.
3. **Short access token lifetime**: 15 minutes limits the window for token theft.
4. **Refresh token rotation**: Single-use tokens with reuse detection prevent replay attacks.
5. **Device tracking**: Each device is isolated. Stolen tokens from one device don't compromise others.
6. **Redis fail-open**: Blacklist checks fail open to prevent service disruption.
7. **HttpOnly cookies**: Tokens are not accessible via JavaScript (XSS protection).
8. **SameSite=Strict** on refresh cookie: Prevents CSRF attacks on token refresh.
9. **SHA-256 hashed refresh tokens in DB**: Even if the DB is compromised, refresh tokens can't be replayed.

## Files

| File                                               | Purpose                              |
| -------------------------------------------------- | ------------------------------------ |
| `apps/backend/src/utils/generate-keys.ts`          | ES256 key pair generation script     |
| `apps/backend/src/utils/jwt.ts`                    | JWT signing and verification (ES256) |
| `apps/backend/src/utils/cookie.ts`                 | Cookie management (auth + device ID) |
| `apps/backend/src/utils/redis-keys.ts`             | Redis key pattern helpers            |
| `apps/backend/src/utils/token-hash.ts`             | SHA-256 token hashing                |
| `apps/backend/src/cache/session-cache.ts`          | Redis session cache operations       |
| `apps/backend/src/cache/token-blacklist.ts`        | Redis token blacklisting operations  |
| `apps/backend/src/types/auth.ts`                   | Auth type definitions                |
| `apps/backend/src/config/env.ts`                   | Environment variable validation      |
| `apps/backend/src/config/redis.ts`                 | Redis client configuration           |
| `apps/backend/src/db/schema/sessions.ts`           | Session table (with deviceId)        |
| `apps/backend/src/db/schema/refresh-tokens.ts`     | Refresh token table                  |
| `apps/backend/src/modules/auth/auth.service.ts`    | Auth business logic                  |
| `apps/backend/src/modules/auth/auth.controller.ts` | Request/response handlers            |
| `apps/backend/src/middleware/auth.ts`              | Authentication middleware            |
