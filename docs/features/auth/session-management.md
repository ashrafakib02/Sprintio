# Session Management

Sprintio's session management system provides secure, multi-device authentication with automatic token rotation, device tracking, and real-time session control.

## Overview

Every login creates a **session** — a server-side record linking a user to a specific device. Sessions enable:

- **Multiple simultaneous logins** across devices (phone, desktop, tablet)
- **Per-device session visibility** with parsed device metadata (browser, OS, device type)
- **Selective session revocation** — kill a specific device or all devices at once
- **Refresh token rotation** — single-use tokens with stolen-token detection
- **Redis-accelerated lookups** for fast auth checks and bulk invalidation

## Architecture

### Database Schema

Two PostgreSQL tables (via Drizzle ORM) power the session system:

```
┌──────────────┐       ┌──────────────────┐
│   sessions   │       │  refresh_tokens   │
├──────────────┤       ├──────────────────┤
│ id (UUID PK) │◄──────│ session_id (FK)   │
│ user_id (FK) │       │ user_id (FK)      │
│ device_id    │       │ token_hash (UQ)   │
│ user_agent   │       │ expires_at        │
│ ip_address   │       │ created_at        │
│ expires_at   │       └──────────────────┘
│ created_at   │
└──────────────┘
```

- **sessions** — One row per active login. Stores device identity and metadata.
- **refresh_tokens** — One row per session. Stores SHA-256 hash of the refresh token (never raw tokens in the DB).
- Both tables have `CASCADE` deletes from the `users` table.

### Redis Layer

Redis provides fast lookups and atomic invalidation:

| Key Pattern               | Type          | TTL                  | Purpose                         |
| ------------------------- | ------------- | -------------------- | ------------------------------- |
| `session:{id}`            | String (JSON) | Refresh expiry (7d)  | Cached session data             |
| `user_sessions:{userId}`  | Set           | Refresh expiry (7d)  | Set of session IDs for bulk ops |
| `blacklist:access:{jti}`  | String        | Remaining token life | Revoked access tokens           |
| `blacklist:refresh:{jti}` | String        | Remaining token life | Revoked refresh tokens          |
| `blacklist:user:{userId}` | String        | 7 days               | Global user revocation marker   |

### JWT Tokens

Two separate ES256 key pairs (asymmetric signing):

|              | Access Token                     | Refresh Token                                                    |
| ------------ | -------------------------------- | ---------------------------------------------------------------- |
| **Expiry**   | 15 minutes                       | 7 days                                                           |
| **Payload**  | userId, email, jti, deviceId     | userId, sessionId, jti, deviceId                                 |
| **Storage**  | HttpOnly cookie (`access_token`) | HttpOnly cookie (`refresh_token`, scoped to `/api/auth/refresh`) |
| **Key pair** | Separate from refresh            | Separate from access                                             |

## Session Lifecycle

### Create Session (Login/Register)

```
Client                    Server                     PostgreSQL            Redis
  │                         │                           │                   │
  │── POST /auth/login ────►│                           │                   │
  │                         │── INSERT session ────────►│                   │
  │                         │── INSERT refresh_token ──►│                   │
  │                         │── SET session:{id} ──────►│                   │
  │                         │── SADD user_sessions ────►│                   │
  │◄── Set-Cookie (tokens) ─│                           │                   │
```

1. Validate credentials
2. Generate device ID (from cookie or new UUID)
3. Insert session row with deviceId, userAgent, ipAddress
4. Generate access + refresh JWT pair
5. Hash refresh token (SHA-256), insert into `refresh_tokens`
6. Cache session in Redis with TTL
7. Set httpOnly cookies

### Refresh Token Rotation

```
Client                    Server                     PostgreSQL            Redis
  │                         │                           │                   │
  │── POST /auth/refresh ──►│                           │                   │
  │   (cookie: refresh)     │── Verify JWT signature ──►│                   │
  │                         │── Check blacklist ───────►│                   │
  │                         │── Hash & find token ─────►│                   │
  │                         │── DELETE old refresh_token │                   │
  │                         │── DELETE old session ────►│                   │
  │                         │── DEL old session cache ──►│                   │
  │                         │── INSERT new session ────►│                   │
  │                         │── INSERT new refresh ────►│                   │
  │                         │── SET new session cache ──►│                   │
  │◄── Set-Cookie (new) ────│                           │                   │
```

**Security: Stolen Token Detection**

If a refresh token that was already consumed (rotated) is reused:

1. The token's JTI is found in the Redis blacklist
2. The system assumes token theft
3. **ALL tokens for that user are revoked** (global revocation marker set)
4. The request is rejected with 401

### Logout (Current Device)

```
Client                    Server                     PostgreSQL            Redis
  │                         │                           │                   │
  │── POST /auth/logout ───►│                           │                   │
  │   (cookie: refresh)     │── Hash token, find row ──►│                   │
  │                         │── Blacklist refresh JTI ──►│                   │
  │                         │── Blacklist access JTI ───►│                   │
  │                         │── DEL session cache ──────►│                   │
  │                         │── DELETE refresh_token ───►│                   │
  │                         │── DELETE session ─────────►│                   │
  │◄── Clear cookies ───────│                           │                   │
```

### Logout All Devices

```
Client                    Server                     PostgreSQL            Redis
  │                         │                           │                   │
  │── POST /auth/logout-all►│                           │                   │
  │   (cookie: access)      │── SET blacklist:user ─────►│                   │
  │                         │── Pipeline DEL sessions ──►│                   │
  │                         │── DELETE ALL refresh_tokens│                   │
  │                         │── DELETE ALL sessions ────►│                   │
  │◄── Clear cookies ───────│                           │                   │
```

The global revocation marker (`blacklist:user:{userId}`) ensures any still-in-flight access tokens are rejected by the `authenticate` middleware.

## API Reference

### `GET /api/auth/sessions`

List all active sessions for the authenticated user.

**Headers:**

```
Cookie: access_token=<token>
```

**Response (200):**

```json
{
  "data": {
    "sessions": [
      {
        "id": "a1b2c3d4-...",
        "deviceId": "550e8400-e29b-41d4-a716-446655440000",
        "browser": "Chrome 120",
        "os": "Windows 10",
        "device": "Desktop",
        "deviceType": "desktop",
        "ipAddress": "192.168.1.100",
        "isCurrent": true,
        "lastActive": "2026-07-19T10:30:00.000Z",
        "createdAt": "2026-07-15T08:00:00.000Z"
      },
      {
        "id": "e5f6g7h8-...",
        "deviceId": "660e8400-e29b-41d4-a716-446655440001",
        "browser": "Safari 17",
        "os": "iOS 17",
        "device": "iPhone",
        "deviceType": "mobile",
        "ipAddress": "10.0.0.50",
        "isCurrent": false,
        "lastActive": "2026-07-18T14:20:00.000Z",
        "createdAt": "2026-07-10T12:00:00.000Z"
      }
    ]
  }
}
```

**Device Types:** `desktop` | `mobile` | `tablet` | `bot` | `unknown`

---

### `DELETE /api/auth/sessions/:sessionId`

Revoke a specific session by ID.

**Headers:**

```
Cookie: access_token=<token>
```

**Response (200):**

```json
{
  "data": {
    "message": "Session revoked"
  }
}
```

**Errors:**

| Status | Reason                                                  |
| ------ | ------------------------------------------------------- |
| 400    | Cannot revoke your current session (use logout instead) |
| 404    | Session not found or doesn't belong to this user        |

---

### `POST /api/auth/logout`

Revoke the current session.

**Request Body:** None (reads refresh token from cookie)

**Response (200):**

```json
{
  "data": {
    "message": "Logged out"
  }
}
```

---

### `POST /api/auth/logout-all`

Revoke **all** sessions for the authenticated user.

**Headers:**

```
Cookie: access_token=<token>
```

**Response (200):**

```json
{
  "data": {
    "message": "All sessions logged out"
  }
}
```

## Device Metadata

User-Agent strings are parsed into structured metadata using `ua-parser-js`:

```typescript
interface DeviceMetadata {
  browser: string; // "Chrome 120", "Safari 17", "Firefox 121"
  os: string; // "Windows 10", "macOS", "iOS 17", "Android 14"
  device: string; // "Desktop", "iPhone", "iPad", "Samsung Galaxy S24"
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
}
```

**Detection logic:**

- Mobile/tablet detection via `ua-parser-js` device parser
- Bot detection via keyword matching (bot, crawler, spider, curl, wget, python-requests)
- Fallback to `"unknown"` for missing or unrecognizable user-agents

## Security Considerations

### Token Storage

- **HttpOnly cookies** — JavaScript cannot access tokens (XSS protection)
- **Secure flag** — Cookies only sent over HTTPS in production
- **SameSite=Lax** — CSRF protection for access token cookie
- **SameSite=Strict** — Refresh token cookie scoped to `/api/auth/refresh` only

### Refresh Token Rotation

- Single-use tokens — deleted from DB immediately on use
- New session created on each refresh (prevents session fixation)
- Stolen token reuse triggers automatic revocation of all user sessions

### Redis Fail-Open Policy

- If Redis is down, blacklist checks return `false` (allow request)
- JWT signature verification still protects against forgery
- Session cache misses fall back to database queries

### Rate Limiting

| Endpoint       | Limit        | Window     |
| -------------- | ------------ | ---------- |
| Login/Register | 20 requests  | 15 minutes |
| Token Refresh  | 20 requests  | 15 minutes |
| General API    | 100 requests | 15 minutes |

## Frontend Integration

### Session Management UI

The settings page (`/settings`) includes an **Active Sessions** section:

- Fetches sessions via `GET /api/auth/sessions`
- Displays device icon (desktop/mobile/tablet), browser + OS, IP address
- Shows "Current" badge on the active device
- "Revoke" button per session (with confirmation)
- "Log out all other sessions" bulk action

### Auth Provider

The `AuthProvider` handles token refresh automatically:

1. On 401 response, attempts `POST /api/auth/refresh`
2. Refresh creates a new session (rotation)
3. Retries the original request
4. On refresh failure, clears auth state and redirects to login

## Troubleshooting

| Issue                             | Cause                               | Solution                                               |
| --------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| Sessions disappearing             | Token rotation creates new sessions | This is expected — old sessions are deleted on refresh |
| "Cannot revoke current session"   | Trying to revoke the active session | Use logout instead of session revoke                   |
| Session not showing device info   | Missing/empty User-Agent header     | Check client isn't stripping User-Agent                |
| All sessions revoked unexpectedly | Stolen token reuse detected         | Re-login on all devices                                |
| Redis down, sessions still work   | Fail-open policy                    | Sessions fall back to DB queries                       |

## File Reference

| File                                                   | Purpose                                 |
| ------------------------------------------------------ | --------------------------------------- |
| `apps/backend/src/db/schema/sessions.ts`               | Sessions table schema                   |
| `apps/backend/src/db/schema/refresh-tokens.ts`         | Refresh tokens table schema             |
| `apps/backend/src/modules/auth/auth.service.ts`        | Session CRUD + token rotation logic     |
| `apps/backend/src/modules/auth/auth.controller.ts`     | HTTP handlers for session endpoints     |
| `apps/backend/src/modules/auth/auth.routes.ts`         | Route definitions with middleware       |
| `apps/backend/src/utils/user-agent-parser.ts`          | User-Agent parsing utility              |
| `apps/backend/src/cache/session-cache.ts`              | Redis session cache operations          |
| `apps/backend/src/cache/token-blacklist.ts`            | Redis token blacklisting                |
| `apps/backend/src/utils/redis-keys.ts`                 | Centralized Redis key patterns          |
| `apps/backend/src/middleware/auth.ts`                  | JWT verification + blacklist checks     |
| `apps/web/src/components/settings/active-sessions.tsx` | Sessions management UI                  |
| `apps/web/src/lib/api.ts`                              | Frontend API client (session functions) |
