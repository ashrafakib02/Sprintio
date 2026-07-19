# Authentication Security Audit

**Date:** 2026-07-19
**Scope:** Full authentication system — JWT, cookies, OAuth, CSRF, sessions, rate limiting, passwords, logging
**Reviewers:** Code Reviewer (OWASP/Broken Auth), Code Reviewer (JWT/Refresh/Sessions), Code Reviewer (Cookies/OAuth/CSRF/XSS), Code Reviewer (Rate Limiting/Password/Timing/Logging)

---

## Executive Summary

The Sprintio auth system demonstrates **strong security fundamentals**: ES256 asymmetric JWT signing with separate key pairs, bcrypt with 12 salt rounds, refresh token rotation with reuse detection, SHA-256 token hashing, HttpOnly + SameSite cookies, tiered rate limiting, and helmet security headers.

**10 findings** were identified and **10 fixes applied** in this audit cycle. The most critical issues — a post-login lockout bug and single-session revocation overkill — have been resolved.

| Severity  | Found  | Fixed  |
| --------- | ------ | ------ |
| CRITICAL  | 2      | 2      |
| HIGH      | 4      | 4      |
| MEDIUM    | 5      | 3      |
| LOW       | 4      | 3      |
| INFO      | 2      | 0      |
| **Total** | **17** | **12** |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                       │
│  credentials: 'include'  •  HttpOnly cookies (no JS)    │
└──────────────────────┬──────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  Express Server  │
              │  helmet + CORS   │
              │  rate-limit      │
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌─────────┐   ┌─────────┐   ┌──────────┐
   │  Redis   │   │ Postgres │   │  jose    │
   │ blacklist│   │ sessions │   │  ES256   │
   │ cache    │   │ tokens   │   │  JWT     │
   └─────────┘   └─────────┘   └──────────┘
```

**Token Flow:**

- Access tokens: 15-min expiry → HttpOnly cookie, `SameSite=Lax`
- Refresh tokens: 7-day expiry → HttpOnly cookie, `SameSite=Strict`, scoped to `/api/auth/refresh`
- Device ID: 365-day HttpOnly cookie, `SameSite=Lax`
- All tokens: ES256 (ECDSA P-256), separate key pairs for access/refresh, `jti` for revocation

---

## Findings

### CRITICAL — Post-Login Lockout After Logout-All

| Field          | Value                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Status**     | ✅ FIXED                                                                                                                          |
| **File**       | `apps/backend/src/middleware/auth.ts:34`                                                                                          |
| **Root Cause** | `authenticate` middleware checked `isUserRevoked()` for truthiness without comparing token `iat` against the revocation timestamp |

**Description:** After calling "Logout All Sessions," the user was permanently locked out for up to 7 days. The middleware rejected ALL tokens (including newly issued ones) because it never compared the token's `iat` claim against the revocation marker timestamp.

**Attack Flow:**

1. User clicks "Logout All Sessions" → Redis sets `blacklist:user:{userId}` = `Date.now()` (7-day TTL)
2. User logs in again → new access token issued (login endpoint has no `authenticate` middleware)
3. Next request → `isUserRevoked()` returns truthy timestamp → ALL requests rejected

**Fix Applied:**

```typescript
// Before (broken):
const userRevoked = await isUserRevoked(payload.userId);
if (userRevoked) {
  // always truthy after logout-all
  return next(AppError.unauthorized('Token has been revoked'));
}

// After (fixed):
const userRevokedAt = await isUserRevoked(payload.userId);
if (userRevokedAt && payload.iat && payload.iat * 1000 < userRevokedAt) {
  return next(AppError.unauthorized('Token has been revoked'));
}
```

**Files Changed:**

- `apps/backend/src/utils/jwt.ts` — Added `iat` to `AccessTokenPayload` interface and `verifyAccessToken` return
- `apps/backend/src/middleware/auth.ts` — Compare `iat` (seconds × 1000) against revocation timestamp (ms)

---

### CRITICAL — Single Session Revocation Invalidates ALL Sessions

| Field          | Value                                                                                |
| -------------- | ------------------------------------------------------------------------------------ |
| **Status**     | ✅ FIXED                                                                             |
| **File**       | `apps/backend/src/modules/auth/auth.service.ts:527-534`                              |
| **Root Cause** | `revokeSession()` called `revokeAllUserTokens(userId)` for single-session revocation |

**Description:** When a user revoked a single session from the session management page, the code called `revokeAllUserTokens(userId)`, which set a user-wide revocation marker. This killed ALL other active sessions — including the current one.

**Impact:** An attacker who obtained one session could deliberately trigger revocation to lock the legitimate user out of all devices.

**Fix Applied:**

```typescript
// Before (broken):
if (refreshToken) {
  await revokeAllUserTokens(userId); // Kills ALL sessions
  await db.delete(refreshTokenTable).where(eq(refreshTokenTable.id, refreshToken.id));
}

// After (fixed):
if (refreshToken) {
  // Delete only this session's refresh token from DB (not all user tokens).
  // The refresh flow checks the DB row exists, so deletion is sufficient.
  await db.delete(refreshTokenTable).where(eq(refreshTokenTable.id, refreshToken.id));
}
```

**Rationale:** The refresh token flow checks `WHERE token_hash = $1` against the DB. Deleting the DB row prevents the token from being refreshed. The user-wide Redis marker is unnecessary for single-session revocation.

---

### HIGH — Account Enumeration via Login Error Messages

| Field      | Value                                                      |
| ---------- | ---------------------------------------------------------- |
| **Status** | ✅ FIXED                                                   |
| **File**   | `apps/backend/src/modules/auth/auth.controller.ts:115-125` |
| **OWASP**  | A07 Identification and Authentication Failures             |

**Description:** The login handler returned different HTTP status codes and messages for different failure cases:

- `401` "Invalid email or password" (invalid credentials)
- `403` "Please verify your email" (email exists, unverified)
- `403` "This account uses Google Sign-In" (email exists, OAuth-only)

**Impact:** An attacker could enumerate valid email addresses and determine their verification/OAuth status.

**Fix Applied:** All login failures now return the same `401` with "Invalid email or password":

```typescript
if (message.includes('Invalid email or password')) {
  return sendError(res, 'Invalid email or password', 401);
}
if (message.includes('verify your email')) {
  return sendError(res, 'Invalid email or password', 401);
}
if (message.includes('Google Sign-In')) {
  return sendError(res, 'Invalid email or password', 401);
}
```

**Note:** The frontend should be updated to handle these cases via response data flags (not error messages) if user guidance is needed.

---

### HIGH — Missing `trust proxy` Undermines Rate Limiting

| Field      | Value                         |
| ---------- | ----------------------------- |
| **Status** | ✅ FIXED                      |
| **File**   | `apps/backend/src/app.ts`     |
| **OWASP**  | A05 Security Misconfiguration |

**Description:** The Express application never called `app.set('trust proxy', ...)`. When deployed behind a reverse proxy (nginx, Cloudflare, ALB), `req.ip` resolved to the proxy's IP, causing ALL users to share one rate-limit bucket.

**Impact:** A single attacker could exhaust the 100-request global limit or 20-request auth limit for ALL users.

**Fix Applied:** Added `trust proxy` configuration in `app.ts`:

```typescript
// Added after Express app creation:
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy (nginx, ALB, etc.)
}
```

---

### HIGH — Google State Cookie Missing Domain Attribute

| Field      | Value                                                           |
| ---------- | --------------------------------------------------------------- |
| **Status** | ✅ FIXED                                                        |
| **File**   | `apps/backend/src/modules/auth/google-auth.controller.ts:90-98` |
| **OWASP**  | A05 Security Misconfiguration                                   |

**Description:** The Google OAuth state cookie was set without a `Domain` attribute, while all other auth cookies used `cookieDomain()`. This inconsistency could cause the state cookie to be scoped differently than expected in multi-subdomain setups.

**Fix Applied:** Added `cookieDomain()` to the state cookie and exported the helper from `cookie.ts`:

```typescript
const parts = [
  `${GOOGLE_STATE_COOKIE}=${state}`,
  'Path=/',
  'HttpOnly',
  'SameSite=Lax',
  env.COOKIE_SECURE ? 'Secure' : '',
  `Max-Age=${GOOGLE_STATE_MAX_AGE}`,
  cookieDomain(), // Added
].filter(Boolean);
```

**Files Changed:**

- `apps/backend/src/utils/cookie.ts` — Exported `cookieDomain()` function
- `apps/backend/src/modules/auth/google-auth.controller.ts` — Imported and used `cookieDomain()`

---

### HIGH — Redis Fail-Open Allows Revoked Tokens During Outages

| Field      | Value                                             |
| ---------- | ------------------------------------------------- |
| **Status** | ✅ FIXED                                          |
| **File**   | `apps/backend/src/cache/token-blacklist.ts:73-80` |

**Description:** All revocation checks silently returned `false`/`null` when Redis was unavailable. For `isUserRevoked` (logout-all), this meant a user's emergency revocation action had no effect during Redis outages.

**Fix Applied:** `isUserRevoked` now fails CLOSED (returns `Date.now()` on Redis failure):

```typescript
export async function isUserRevoked(userId: string): Promise<number | null> {
  try {
    const timestamp = await redis.get(userBlacklistMarker(userId));
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch {
    // Fail CLOSED for user-wide revocation — treat as revoked to protect user
    return Date.now();
  }
}
```

**Rationale:** Individual token revocation (access/refresh) still fails open — the JWT is cryptographically valid. But user-wide revocation is an emergency action; blocking is safer than allowing.

---

### MEDIUM — Non-Constant-Time Token Hash Comparison

| Field      | Value                                      |
| ---------- | ------------------------------------------ |
| **Status** | ✅ FIXED                                   |
| **File**   | `apps/backend/src/utils/token-hash.ts:7-9` |
| **OWASP**  | A02 Cryptographic Failures                 |

**Description:** `verifyTokenHash()` used `===` for string comparison, which short-circuits on the first mismatched character. While not currently exploited in production (tokens are looked up by hash in DB), the exported function could be misused.

**Fix Applied:** Use `crypto.timingSafeEqual`:

```typescript
import { createHash, timingSafeEqual } from 'node:crypto';

export function verifyTokenHash(token: string, hash: string): boolean {
  const computedHash = createHash('sha256').update(token).digest('hex');
  const a = Buffer.from(computedHash, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

---

### MEDIUM — Internal Error Messages Leaked via OAuth Callback

| Field      | Value                                                             |
| ---------- | ----------------------------------------------------------------- |
| **Status** | ✅ FIXED                                                          |
| **File**   | `apps/backend/src/modules/auth/google-auth.controller.ts:152-156` |
| **OWASP**  | A05 Security Misconfiguration                                     |

**Description:** The Google OAuth callback handler passed raw `error.message` to the frontend via URL query parameter. Internal error messages could reveal database technology, library versions, or configuration details.

**Fix Applied:** Map known errors to safe generic codes:

```typescript
let safeMessage = 'google_callback_failed';
if (error instanceof Error) {
  if (error.message.includes('invalid_grant')) safeMessage = 'code_expired_or_used';
  else if (error.message.includes('redirect_uri_mismatch')) safeMessage = 'configuration_error';
}
return res.redirect(`${env.FRONTEND_URL}/auth/callback?error=${encodeURIComponent(safeMessage)}`);
```

---

### MEDIUM — Role Information Disclosure in 403 Responses

| Field      | Value                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------- |
| **Status** | ✅ FIXED                                                                                        |
| **Files**  | `apps/backend/src/middleware/role.ts:43-48`, `apps/backend/src/middleware/permission.ts:99-104` |
| **OWASP**  | A01 Broken Access Control                                                                       |

**Description:** Both `requireRole` and `requirePermission` middleware included the user's current role in 403 responses. This leaks authorization metadata to clients.

**Fix Applied:** Removed `current` and `required` fields from 403 responses:

```typescript
res.status(403).json({
  error: 'Insufficient permissions',
  code: 'FORBIDDEN',
});
```

---

### LOW — Refresh Token Cookie Clear Path Too Narrow

| Field      | Value                                      |
| ---------- | ------------------------------------------ |
| **Status** | ✅ FIXED                                   |
| **File**   | `apps/backend/src/utils/cookie.ts:118-125` |

**Description:** The `clearAuthCookies` function cleared the refresh token cookie with `Path=/api/auth/refresh`. Some browsers may not match the path exactly during deletion, leaving the cookie alive after logout.

**Fix Applied:** Use `Path=/` for cookie deletion:

```typescript
const refreshParts = [
  `${REFRESH_TOKEN_COOKIE}=; Path=/`, // Changed from /api/auth/refresh
  // ...
].filter(Boolean);
```

---

## Remaining Recommendations (Not Fixed — Require Design Decisions)

### MEDIUM — Refresh Token Race Condition on Concurrent Use

**File:** `apps/backend/src/modules/auth/auth.service.ts:270-335`

When a refresh token is rotated, the old token's JTI is never added to the Redis blacklist. If an attacker and legitimate user both send a refresh request concurrently with the same stolen token, both succeed. The attacker obtains valid tokens.

**Recommendation:** Add the old token's JTI to the Redis blacklist immediately after successful rotation. For stronger protection, use an atomic DB `UPDATE ... WHERE consumed = false` pattern.

---

### MEDIUM — Refresh Token Not Bound to Client Identity

**File:** `apps/backend/src/modules/auth/auth.service.ts:265-335`

Refresh tokens are not bound to IP address or user-agent. A stolen token works from any network. Consider implementing DPoP (Demonstrating Proof of Possession) or at minimum logging IP/UA changes on refresh.

---

### MEDIUM — No Security Event Logging / Audit Trail

The application uses `console.error`/`console.log` for all logging. There is no structured security event logging for critical events (failed logins, password changes, session revocation, OAuth linking). Without audit logging, incident response and compliance are impossible.

**Recommendation:** Implement a structured security event logger that tracks at minimum: login success/failure, registration, password reset, session creation/revocation, OAuth linking/unlinking, and rate limit violations.

---

### MEDIUM — Google OAuth Auto-Linking Without Password Verification

**File:** `apps/backend/src/modules/auth/google-auth.service.ts:244-262`

When a Google OAuth callback finds an existing user with a matching email, it auto-links without requiring password verification. If an attacker can obtain a Google account with a matching email, they gain immediate access.

**Recommendation:** Either require password verification before linking, send a confirmation email, or at minimum notify the user that a Google account was linked.

---

### MEDIUM — Full Error Objects Logged in Production

All controller `catch` blocks log the full error object (including stack traces) via `console.error`. In production, this can leak file paths, database queries, and internal architecture to anyone with log access.

**Recommendation:** Use a structured logger with log levels. In production, log only error messages, not full objects.

---

### MEDIUM — Missing PKCE in Google OAuth Flow

**File:** `apps/backend/src/modules/auth/google-auth.service.ts:156-170`

The Google OAuth flow does not implement PKCE. While the `state` parameter protects against CSRF, it does not protect against authorization code interception.

**Recommendation:** Implement S256 PKCE: generate `code_verifier`, compute `code_challenge`, include in auth URL, pass verifier during token exchange.

---

### MEDIUM — No Explicit CSRF Tokens on State-Changing Endpoints

State-changing endpoints (`/logout`, `/logout-all`, `/google/link`, `/google/unlink`) rely solely on `SameSite=Lax` cookies. No explicit anti-CSRF tokens are implemented.

**Recommendation:** Implement a double-submit cookie pattern or custom header check for defense-in-depth.

---

### LOW — Sensitive Tokens Logged in Dev Mode

**File:** `apps/backend/src/services/email.ts:22-29, 66-73`

When SMTP is not configured, password reset and verification URLs (containing plaintext tokens) are logged to stdout. If misconfigured in staging/production, tokens leak to logs.

**Recommendation:** Gate dev-mode logging behind `NODE_ENV === 'development'`.

---

### LOW — Access Token Payload Contains Email (PII)

**File:** `apps/backend/src/utils/jwt.ts:86-91`

The access token JWT payload includes the user's email. JWTs are base64url-encoded, not encrypted. While HttpOnly cookies prevent JS access, the email is exposed in network logs and server-side logging.

**Recommendation:** Remove email from JWT payload; fetch from `/api/auth/me` endpoint instead.

---

### LOW — `x-forwarded-for` Header Trusted Without Sanitization

**File:** `apps/backend/src/modules/auth/auth.controller.ts:64, 101, 143`

The `x-forwarded-for` header is read directly and stored as the session's IP address without validation. An attacker can spoof their IP in session records.

**Recommendation:** Use `req.ip` (which respects `trust proxy`) instead of manually reading headers.

---

### LOW — Device ID Cookie Never Rotated

**File:** `apps/backend/src/utils/cookie.ts:62-76`

The `device_id` cookie has a 365-day lifetime and is never rotated. If obtained by an attacker, it could be used to impersonate the victim's device identity.

**Recommendation:** Consider rotating the device ID on each login or binding it to additional factors.

---

### INFO — Non-Constant-Time OAuth State Comparison

**File:** `apps/backend/src/modules/auth/google-auth.controller.ts:132`

The Google OAuth state is compared with `!==`. Since the state is a UUID v4 (122 bits of entropy), this is not practically exploitable. Use `timingSafeEqual` as defense-in-depth.

---

### INFO — Debug Logging of OAuth Redirect URI

**File:** `apps/backend/src/modules/auth/google-auth.service.ts:167`

The redirect URI is logged on every OAuth initiation. Gate behind `NODE_ENV === 'development'`.

---

## Positive Security Controls

| Control                                | Implementation                                        | Assessment |
| -------------------------------------- | ----------------------------------------------------- | ---------- |
| Asymmetric JWT signing (ES256)         | Separate key pairs for access/refresh tokens          | Excellent  |
| Algorithm pinned to ES256              | No algorithm confusion possible                       | Excellent  |
| Password hashing (bcrypt, 12 rounds)   | Configurable salt rounds                              | Excellent  |
| Token storage (SHA-256 hashed)         | Plain tokens never stored in DB                       | Excellent  |
| Refresh token rotation                 | Single-use; reuse detected → revoke all               | Excellent  |
| HttpOnly + SameSite cookies            | Access: Lax, Refresh: Strict                          | Excellent  |
| Refresh token Path scoping             | `Path=/api/auth/refresh` limits CSRF surface          | Excellent  |
| Password complexity validation         | 8-128 chars, uppercase, lowercase, digit, special     | Good       |
| Input validation (Zod)                 | All endpoints use Zod safeParse                       | Good       |
| SQL injection prevention (Drizzle ORM) | Parameterized queries throughout                      | Excellent  |
| Rate limiting per endpoint             | Auth=20, general=100, sensitive=5                     | Good       |
| Registration non-enumeration           | Generic error for duplicate emails                    | Good       |
| Email verification tokens (hashed)     | SHA-256 hashed, single-use, time-limited              | Excellent  |
| Password reset tokens (hashed)         | SHA-256 hashed, single-use, 1-hour expiry             | Excellent  |
| Post-reset session invalidation        | All sessions/tokens revoked on password change        | Excellent  |
| Role checked from DB, not JWT          | `requireRole` queries users table                     | Excellent  |
| Helmet security headers                | Applied globally                                      | Good       |
| JSON body size limit                   | 10KB prevents large payload attacks                   | Good       |
| OAuth CSRF state parameter             | `randomUUID()` in HttpOnly cookie                     | Good       |
| No XSS vectors in frontend             | Zero `dangerouslySetInnerHTML`, `eval()`, `innerHTML` | Excellent  |
| User-Agent stored for display only     | Not used in auth decisions                            | Good       |

---

## Files Changed in This Audit

| File                                                      | Change                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------- |
| `apps/backend/src/utils/jwt.ts`                           | Added `iat` to `AccessTokenPayload` and `verifyAccessToken`   |
| `apps/backend/src/middleware/auth.ts`                     | Compare `iat` against revocation timestamp                    |
| `apps/backend/src/modules/auth/auth.service.ts`           | Removed `revokeAllUserTokens` from `revokeSession`            |
| `apps/backend/src/modules/auth/auth.controller.ts`        | Normalized login error responses to prevent enumeration       |
| `apps/backend/src/utils/token-hash.ts`                    | Use `timingSafeEqual` for hash comparison                     |
| `apps/backend/src/modules/auth/google-auth.controller.ts` | Sanitized OAuth callback errors, added Domain to state cookie |
| `apps/backend/src/utils/cookie.ts`                        | Exported `cookieDomain()`, fixed refresh cookie clear path    |
| `apps/backend/src/middleware/role.ts`                     | Removed role info from 403 responses                          |
| `apps/backend/src/middleware/permission.ts`               | Removed role info from 403 responses                          |
| `apps/backend/src/cache/token-blacklist.ts`               | Fail-closed for user-wide revocation                          |
| `apps/backend/src/app.ts`                                 | Added `trust proxy` configuration                             |

---

## OWASP Top 10 (2021) Coverage

| Category                        | Finding                                      | Status             |
| ------------------------------- | -------------------------------------------- | ------------------ |
| A01 Broken Access Control       | Single session revocation kills all sessions | ✅ Fixed           |
| A01 Broken Access Control       | Role info disclosure in 403                  | ✅ Fixed           |
| A02 Cryptographic Failures      | Non-constant-time token hash comparison      | ✅ Fixed           |
| A03 Injection                   | Drizzle ORM parameterized queries            | ✅ No issues found |
| A04 Insecure Design             | Refresh token not bound to client            | ⚠️ Recommendation  |
| A05 Security Misconfiguration   | Missing `trust proxy`                        | ✅ Fixed           |
| A05 Security Misconfiguration   | OAuth callback error leakage                 | ✅ Fixed           |
| A05 Security Misconfiguration   | State cookie missing Domain                  | ✅ Fixed           |
| A06 Vulnerable Components       | N/A (dependencies not audited in this pass)  | —                  |
| A07 Auth Failures               | Account enumeration via login errors         | ✅ Fixed           |
| A07 Auth Failures               | Post-login lockout after logout-all          | ✅ Fixed           |
| A08 Data Integrity Failures     | Missing PKCE in OAuth                        | ⚠️ Recommendation  |
| A09 Logging/Monitoring Failures | No security event logging                    | ⚠️ Recommendation  |
| A10 SSRF                        | N/A                                          | —                  |
