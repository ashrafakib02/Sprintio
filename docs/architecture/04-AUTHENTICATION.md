# Sprintio — Authentication & Authorization Architecture

---

| Field             | Value                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Document Type** | Architecture Document — Auth & AuthZ                                                                                                          |
| **Product**       | Sprintio — Sprint fast. Ship together.                                                                                                        |
| **Version**       | 1.0                                                                                                                                           |
| **Status**        | Finalized                                                                                                                                     |
| **Date**          | 2026-07-08                                                                                                                                    |
| **Author**        | Lead AI Engineer                                                                                                                              |
| **Related Docs**  | [PRD](../PRD.md), [MVP Definition](../MVP_DEFINITION.md), [NFR](../NON_FUNCTIONAL_REQUIREMENTS.md), [Frontend Architecture](./01-FRONTEND.md) |

---

## Table of Contents

1. [Overview & Principles](#1-overview--principles)
2. [System Architecture](#2-system-architecture)
3. [Auth Flows](#3-auth-flows)
4. [Token Strategy](#4-token-strategy)
5. [Session Management](#5-session-management)
6. [Password Strategy](#6-password-strategy)
7. [OAuth Integration](#7-oauth-integration)
8. [Magic Link (Passwordless)](#8-magic-link-passwordless)
9. [Multi-Factor Authentication (TOTP)](#9-multi-factor-authentication-totp)
10. [RBAC Model](#10-rbac-model)
11. [Authorization Middleware](#11-authorization-middleware)
12. [API Key Authentication](#12-api-key-authentication)
13. [Security Controls](#13-security-controls)
14. [Frontend Integration](#14-frontend-integration)
15. [Database Schema](#15-database-schema)
16. [Security Checklist](#16-security-checklist)
17. [Quick Reference Cheat Sheet](#17-quick-reference-cheat-sheet)
18. [Migration & Post-MVP Path](#18-migration--post-mvp-path)

---

## 1. Overview & Principles

### 1.1 Design Philosophy

Sprintio's auth system is built on four principles:

| Principle                    | Rationale                                                                                                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Defense in Depth**         | Multiple layers: API Gateway rate limiting → middleware auth → DB-level RLS. No single point of failure.                                                                                |
| **Zero Trust**               | Every request is verified. JWT validates authenticity; RBAC validates authorization. Tokens are short-lived; refresh is rotation-based.                                                 |
| **Workspace Isolation**      | AuthN resolves identity; AuthZ resolves scope. Every permission check is scoped to a workspace first, then the resource.                                                                |
| **MVP-Ready, Phase 2-Proof** | Ships email/password + OAuth + RBAC. Architecture is extensible for SSO/SAML, SCIM, custom roles, and ABAC without rewrites (see [MVP §7.5](../MVP_DEFINITION.md#75-permission-model)). |

### 1.2 Auth Stack

| Layer                | Component                   | Tech                     |
| -------------------- | --------------------------- | ------------------------ |
| **Identity Store**   | PostgreSQL `users` table    | PostgreSQL 16            |
| **Session Store**    | Redis hash per session      | Redis 7 Cluster          |
| **Token Issuer**     | JWT access + refresh tokens | `jose` library (ES256)   |
| **Password Hashing** | Memory-hard KDF             | argon2id (RFC 9106)      |
| **OAuth Providers**  | Google, GitHub              | Passport.js adapters     |
| **Rate Limiter**     | Token bucket per IP/key     | Redis sliding window     |
| **Audit Log**        | Append-only event store     | PostgreSQL + TimescaleDB |
| **MFA**              | TOTP (RFC 6238)             | `otplib`                 |

### 1.3 MVP Scope Alignment

Per the [MVP Definition §E6](../MVP_DEFINITION.md#e6-team-management), the MVP ships:

| Feature                         | Ships in MVP? | Notes                            |
| ------------------------------- | :-----------: | -------------------------------- |
| Email/password registration     |      ✅       | With email verification          |
| OAuth 2.0 (Google, GitHub)      |      ✅       | Account linking supported        |
| Magic link login                |      ✅       | Passwordless option              |
| JWT access + refresh tokens     |      ✅       | HTTP-only cookies, rotation      |
| Multi-factor auth (TOTP)        |      ✅       | Optional per-user                |
| Session management              |      ✅       | Basic concurrent sessions        |
| API key authentication          |      ✅       | Workspace-scoped                 |
| RBAC (Owner/Admin/Member/Guest) |      ✅       | Database-driven role definitions |
| Workspace-level permissions     |      ✅       | All permission checks scoped     |
| SSO/SAML 2.0                    |   ⏸ Phase 2   | Enterprise feature               |
| SCIM 2.0 provisioning           |   ⏸ Phase 2   | Enterprise feature               |
| Custom roles                    |   ⏸ Phase 2   | Entitlement-gated                |
| IP allowlists                   |   ⏸ Phase 2   | Admin-configurable               |
| Device trust                    |   ⏸ Phase 2   | Step-up auth                     |

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌─────────────────┐   │
│  │  Web App  │  │  PWA      │  │  Desktop  │  │  API Consumers  │   │
│  │  (React)  │  │  (SWA)    │  │  (Tauri)  │  │  (API Keys)     │   │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └────────┬────────┘   │
└────────┼───────────────┼───────────────┼─────────────────┼───────────┘
         │               │               │                 │
         ▼               ▼               ▼                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE EDGE                                     │
│         DDoS Protection │ WAF │ TLS Termination │ Rate Limiting     │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    API GATEWAY / EXPRESS MIDDLEWARE                    │
│                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ Rate       │→ │ Auth       │→ │ RBAC       │→ │ Route        │  │
│  │ Limiter    │  │ Resolver   │  │ Guard      │  │ Handler      │  │
│  │ (Redis)    │  │ (JWT/Cookie│  │ (Workspace │  │ (Controller) │  │
│  │            │  │  /API Key) │  │  Scoped)   │  │              │  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    AUTH SERVICE LAYER                         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │    │
│  │  │ Register │  │ Login    │  │ OAuth    │  │ MFA      │    │    │
│  │  │ Service  │  │ Service  │  │ Service  │  │ Service  │    │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │    │
│  │  │ Token    │  │ Session  │  │ Password │  │ API Key  │    │    │
│  │  │ Service  │  │ Service  │  │ Service  │  │ Service  │    │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │    │
│  └──────────────────────────────────────────────────────────────┘    │
└────────────┬───────────────────┬────────────────────┬───────────────┘
             │                   │                    │
             ▼                   ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐
│   PostgreSQL 16 │  │   Redis 7       │  │   Cloudflare R2      │
│                 │  │                 │  │                      │
│  users          │  │  sessions:*     │  │  profile_avatars     │
│  workspaces     │  │  rate_limit:*   │  │                      │
│  memberships    │  │  mfa_pending:*  │  │                      │
│  sessions       │  │  oauth_state:*  │  │                      │
│  api_keys       │  │  magic_links:*  │  │                      │
│  audit_log      │  │  refresh:*      │  │                      │
│  roles          │  │                 │  │                      │
│  permissions    │  │                 │  │                      │
└─────────────────┘  └─────────────────┘  └──────────────────────┘
```

---

## 3. Auth Flows

### 3.1 Registration Flow (Email/Password)

```
┌──────────┐         ┌──────────┐         ┌────────────┐        ┌──────────┐
│  Client  │         │  Server  │         │ PostgreSQL │        │  Redis   │
└────┬─────┘         └────┬─────┘         └─────┬──────┘        └────┬─────┘
     │  POST /auth/register                     │                    │
     │  { email, password, name }               │                    │
     │──────────────────────────────────────────>│                    │
     │                                          │                    │
     │                    ┌─────────────────────┤                    │
     │                    │ 1. Validate input   │                    │
     │                    │    (Zod schema)      │                    │
     │                    │ 2. Check email not  │                    │
     │                    │    already taken     │                    │
     │                    │ 3. Hash password    │                    │
     │                    │    (argon2id)        │                    │
     │                    │ 4. Generate email   │                    │
     │                    │    verification token│                    │
     │                    │ 5. Insert user      │                    │
     │                    │ 6. Create personal  │                    │
     │                    │    workspace         │                    │
     │                    └─────────────────────┤                    │
     │                                          │                    │
     │  201 { userId, message: "Verify email" } │                    │
     │<──────────────────────────────────────────│                    │
     │                                          │                    │
     │  POST /auth/verify-email                 │                    │
     │  { token: "abc123..." }                  │                    │
     │──────────────────────────────────────────>│                    │
     │                                          │                    │
     │                    ┌─────────────────────┤                    │
     │                    │ 1. Validate token   │                    │
     │                    │ 2. Mark email verified│                   │
     │                    │ 3. Generate token   │                    │
     │                    │    pair (access+     │                    │
     │                    │    refresh)          │                    │
     │                    │ 4. Create session   │───────────────────>│
     │                    │    in Redis          │                    │
     │                    └─────────────────────┤                    │
     │                                          │                    │
     │  200 { accessToken, Set-Cookie: refresh }│                    │
     │<──────────────────────────────────────────│                    │
     │                                          │                    │
     │  ┌────────────────────┐                   │                    │
     │  │ Email sent (async) │                   │                    │
     │  │ "Verify your email"│                   │                    │
     │  └────────────────────┘                   │                    │
```

### 3.2 Login Flow (Email/Password)

```
┌──────────┐         ┌──────────┐         ┌────────────┐        ┌──────────┐
│  Client  │         │  Server  │         │ PostgreSQL │        │  Redis   │
└────┬─────┘         └────┬─────┘         └─────┬──────┘        └────┬─────┘
     │  POST /auth/login                       │                    │
     │  { email, password }                    │                    │
     │──────────────────────────────────────────>│                    │
     │                                          │                    │
     │                    ┌─────────────────────┤                    │
     │                    │ 1. Rate limit check │                    │
     │                    │    (5 attempts/15min│                    │
     │                    │     per email)       │                    │
     │                    │ 2. Find user by     │                    │
     │                    │    email             │                    │
     │                    │ 3. Verify password  │                    │
     │                    │    (argon2id verify) │                    │
     │                    │ 4. Check email      │                    │
     │                    │    verified           │                    │
     │                    │ 5. Check if MFA     │                    │
     │                    │    required           │                    │
     │                    └─────────────────────┤                    │
     │                                          │                    │
     │  ┌─── If MFA required ──────────────┐   │                    │
     │  │                                   │   │                    │
     │  │  200 { requiresMFA: true,         │   │                    │
     │  │        mfaToken: "enc..." }       │   │                    │
     │  │<──────────────────────────────────│   │                    │
     │  │                                   │   │                    │
     │  │  POST /auth/mfa/verify           │   │                    │
     │  │  { mfaToken, code: "123456" }    │   │                    │
     │  │──────────────────────────────────>│   │                    │
     │  │                                   │   │                    │
     │  │  ┌─────────────────────────────┐  │   │                    │
     │  │  │ 1. Validate mfaToken       │  │   │                    │
     │  │  │ 2. Verify TOTP code        │  │   │                    │
     │  │  │    (±1 window = 30s each)  │  │   │                    │
     │  │  │ 3. Issue token pair        │  │───────────────────────>│
     │  │  │ 4. Create session          │  │   │                    │
     │  │  └─────────────────────────────┘  │   │                    │
     │  │                                   │   │                    │
     │  │  200 { accessToken,              │   │                    │
     │  │        Set-Cookie: refresh }     │   │                    │
     │  │<──────────────────────────────────│   │                    │
     │  └───────────────────────────────────┘   │                    │
     │                                          │                    │
     │  ┌─── If no MFA ────────────────────┐   │                    │
     │  │                                   │   │                    │
     │  │  Issue token pair                 │───────────────────────>│
     │  │  Create session                   │   │                    │
     │  │                                   │   │                    │
     │  │  200 { accessToken,              │   │                    │
     │  │        Set-Cookie: refresh }     │   │                    │
     │  │<──────────────────────────────────│   │                    │
     │  └───────────────────────────────────┘   │                    │
```

### 3.3 OAuth Login Flow (Google/GitHub)

```
┌──────────┐         ┌──────────┐         ┌──────────┐        ┌──────────┐
│  Client  │         │  Server  │         │  OAuth   │        │ PostgreSQL│
└────┬─────┘         └────┬─────┘         │ Provider │        └────┬─────┘
     │                    │               └────┬─────┘              │
     │ GET /auth/oauth/:provider              │                    │
     │ (e.g., /auth/oauth/google)            │                    │
     │───────────────────────────────────────>│                    │
     │                                        │                    │
     │                    ┌──────────────────┤                    │
     │                    │ 1. Generate state│                    │
     │                    │    (CSRF token)  │                    │
     │                    │ 2. Store in Redis│                    │
     │                    │    (TTL: 10 min) │                    │
     │                    └──────────────────┤                    │
     │                                        │                    │
     │  302 Redirect to provider /authorize   │                    │
     │  ?client_id=...                        │                    │
     │  &redirect_uri=/auth/oauth/callback    │                    │
     │  &scope=openid email profile           │                    │
     │  &state=abc123state                    │                    │
     │<───────────────────────────────────────│                    │
     │                                        │                    │
     │  ┌──── User authenticates with ────┐  │                    │
     │  │     provider (consent screen)    │  │                    │
     │  └─────────────────────────────────┘  │                    │
     │                                        │                    │
     │  302 Redirect back to /auth/oauth/     │                    │
     │       callback?code=xyz&state=abc123   │                    │
     │───────────────────────────────────────>│                    │
     │                                        │                    │
     │                    ┌──────────────────┤                    │
     │                    │ 1. Validate state│                    │
     │                    │    (Redis lookup) │                    │
     │                    │ 2. Exchange code  │                    │
     │                    │    for tokens     │                    │
     │                    │ 3. Fetch user info│                    │
     │                    │ 4. Find-or-create │                    │
     │                    │    user by        │                    │
     │                    │    email+provider │───────────────────>│
     │                    │ 5. If existing:   │                    │
     │                    │    link provider  │                    │
     │                    │ 6. Create session │                    │
     │                    │ 7. Issue JWT pair │                    │
     │                    └──────────────────┤                    │
     │                                        │                    │
     │  302 Redirect to /app (with tokens     │                    │
     │       in Set-Cookie)                   │                    │
     │<───────────────────────────────────────│                    │
```

### 3.4 Token Refresh Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐        ┌──────────┐
│  Client  │         │  Server  │         │ PostgreSQL│        │  Redis   │
└────┬─────┘         └────┬─────┘         └────┬─────┘        └────┬─────┘
     │                    │                    │                    │
     │  API Request with expired access token │                    │
     │  (access token in Authorization header)│                    │
     │───────────────────────────────────────>│                    │
     │                                        │                    │
     │  401 { code: "TOKEN_EXPIRED" }         │                    │
     │<───────────────────────────────────────│                    │
     │                                        │                    │
     │  POST /auth/refresh                    │                    │
     │  Cookie: refreshToken=rt_...           │                    │
     │───────────────────────────────────────>│                    │
     │                                        │                    │
     │                    ┌──────────────────┤                    │
     │                    │ 1. Extract refresh│                    │
     │                    │    token from     │                    │
     │                    │    cookie          │                    │
     │                    │ 2. Look up session│                    │
     │                    │    in Redis        │                    │
     │                    │    (session hash)  │───────────────────>│
     │                    │ 3. Validate token │                    │
     │                    │    hash matches    │<───────────────────│
     │                    │ 4. ROTATE:         │                    │
     │                    │    a) Generate new │                    │
     │                    │       access token │                    │
     │                    │    b) Generate new │                    │
     │                    │       refresh token│                    │
     │                    │    c) Update Redis │                    │
     │                    │       session hash │───────────────────>│
     │                    │    d) Invalidate   │                    │
     │                    │       old refresh  │                    │
     │                    │ 5. Audit log entry │                    │
     │                    └──────────────────┤                    │
     │                                        │                    │
     │  200 { accessToken }                   │                    │
     │  Set-Cookie: refreshToken=rt_new...    │                    │
     │  (HttpOnly, Secure, SameSite=Lax)     │                    │
     │<───────────────────────────────────────│                    │
     │                                        │                    │
     │  Replay original request with new      │                    │
     │  access token                          │                    │
     │───────────────────────────────────────>│                    │
     │                                        │                    │
     │  200 { data: ... }                     │                    │
     │<───────────────────────────────────────│                    │
```

### 3.5 API Key Authentication Flow

```
┌──────────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ API Consumer │      │  Server  │      │ PostgreSQL│      │  Redis   │
│  (CI/CD,     │      │          │      │           │      │          │
│   Script)    │      │          │      │           │      │          │
└──────┬───────┘      └────┬─────┘      └────┬──────┘      └────┬─────┘
       │                   │                  │                   │
       │ GET /v1/tasks     │                  │                   │
       │ Authorization:    │                  │                   │
       │  Bearer sk_live_  │                  │                   │
       │  a1b2c3d4...      │                  │                   │
       │──────────────────>│                  │                   │
       │                   │                  │                   │
       │  ┌────────────────┤                  │                   │
       │  │ 1. Detect API  │                  │                   │
       │  │    key prefix   │                  │                   │
       │  │ 2. Hash key    │                  │                   │
       │  │    (SHA-256)    │                  │                   │
       │  │ 3. Look up     │─────────────────>│                   │
       │  │    api_keys    │                  │                   │
       │  │    by hash     │<─────────────────│                   │
       │  │ 4. Check not   │                  │                   │
       │  │    revoked/exp. │                  │                   │
       │  │ 5. Rate limit  │                  │                   │
       │  │    per key      │────────────────────────────────────>│
       │  │ 6. Resolve     │<────────────────────────────────────│
       │  │    workspace + │                  │                   │
       │  │    permissions │                  │                   │
       │  └────────────────┤                  │                   │
       │                   │                  │                   │
       │ 200 { data: [...] }                  │                   │
       │ X-RateLimit-Limit: 1000              │                   │
       │ X-RateLimit-Remaining: 997           │                   │
       │<──────────────────│                  │                   │
```

---

## 4. Token Strategy

### 4.1 JWT Access Token

| Property      | Value                                                |
| ------------- | ---------------------------------------------------- |
| **Algorithm** | ES256 (ECDSA P-256 + SHA-256)                        |
| **Expiry**    | 15 minutes                                           |
| **Signing**   | Private key (ES256); public key for verification     |
| **Header**    | `kid` (key ID) for key rotation                      |
| **Storage**   | `Authorization: Bearer <token>` header (NOT cookies) |

**JWT Payload:**

```typescript
interface AccessTokenPayload {
  sub: string; // User ID (UUID)
  sid: string; // Session ID
  wsp: string; // Active workspace ID
  roles: string[]; // Workspace roles: ["owner"] | ["admin"] | ["member"] | ["guest"]
  email: string; // User email (for logging, NOT for auth decisions)
  iat: number; // Issued at (unix timestamp)
  exp: number; // Expiration (unix timestamp)
  iss: string; // "sprintio"
  aud: string; // "sprintio-api"
  mfa: boolean; // Whether MFA was verified for this session
}
```

### 4.2 Refresh Token

| Property    | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| **Format**  | Opaque token (not a JWT — prevents token leakage via JWT inspection) |
| **Expiry**  | 7 days (30 days for "Remember Me")                                   |
| **Storage** | `HttpOnly`, `Secure`, `SameSite=Lax` cookie                          |
| **Name**    | `srt` (Sprintio Refresh Token)                                       |
| **Path**    | `/api/auth` (scoped to auth endpoints only)                          |

**Refresh Token Security:**

- Never exposed to JavaScript (`HttpOnly`)
- Never sent cross-site (`SameSite=Lax`)
- Only transmitted over HTTPS (`Secure`)
- Scoped to auth path only (prevents leakage on non-auth requests)
- One-time use: each refresh rotates to a new token (see §4.3)

### 4.3 Token Rotation Strategy

```
┌────────────────────────────────────────────────────────────┐
│                    TOKEN ROTATION FLOW                       │
│                                                            │
│  t=0: Login                                               │
│  ┌──────────┐  ┌──────────┐                                │
│  │ access_0 │  │ refresh_0│  → stored in Redis session     │
│  │ (15 min) │  │ (7 days) │                                │
│  └──────────┘  └──────────┘                                │
│                                                            │
│  t=15min: Access expired → refresh_0 sent                  │
│  ┌──────────┐  ┌──────────┐                                │
│  │ access_1 │  │ refresh_1│  → refresh_0 invalidated       │
│  │ (15 min) │  │ (7 days) │    (replay = session stolen)   │
│  └──────────┘  └──────────┘                                │
│                                                            │
│  t=30min: Access expired → refresh_1 sent                  │
│  ┌──────────┐  ┌──────────┐                                │
│  │ access_2 │  │ refresh_2│  → refresh_1 invalidated       │
│  │ (15 min) │  │ (7 days) │                                │
│  └──────────┘  └──────────┘                                │
│                                                            │
│  t=7 days: refresh_2 expires → session ended               │
│  → User must re-authenticate                               │
│                                                            │
│  DETECTION: If refresh_N is used after refresh_N+1 was     │
│  issued → INVALIDATE ALL SESSIONS for that user            │
│  (token reuse = potential theft)                           │
└────────────────────────────────────────────────────────────┘
```

### 4.4 Token Generation Implementation

```typescript
// src/lib/auth/token.ts
import * as jose from 'jose';
import { randomBytes } from 'node:crypto';

const ALGORITHM = 'ES256';
const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_TTL = 7 * 24 * 3600; // 7 days in seconds
const REFRESH_TOKEN_TTL_REMEMBER = 30 * 24 * 3600; // 30 days

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiry: Date;
  sessionId: string;
}

export async function generateTokenPair(
  payload: Omit<AccessTokenPayload, 'iat' | 'exp' | 'iss' | 'aud'>,
  options: { rememberMe?: boolean; privateKey?: jose.JWTVerifyOptions } = {},
): Promise<TokenPair> {
  const privateKey = await loadSigningKey(); // ES256 private key from env
  const sessionId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  const accessToken = await new jose.SignJWT({
    ...payload,
    sid: sessionId,
  })
    .setProtectedHeader({ alg: ALGORITHM, kid: getKeyId() })
    .setIssuer('sprintio')
    .setAudience('sprintio-api')
    .setIssuedAt(now)
    .setExpirationTime(`${ACCESS_TOKEN_TTL}s`)
    .setJti(crypto.randomUUID()) // Unique token ID for revocation
    .sign(privateKey);

  // Refresh token: opaque random string (NOT a JWT)
  const refreshToken = `srt_${randomBytes(48).toString('base64url')}`;
  const refreshExpiry = options.rememberMe
    ? new Date(Date.now() + REFRESH_TOKEN_TTL_REMEMBER * 1000)
    : new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiry: refreshExpiry,
    sessionId,
  };
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const publicKey = await loadVerificationKey(); // ES256 public key

  const { payload } = await jose.jwtVerify(token, publicKey, {
    issuer: 'sprintio',
    audience: 'sprintio-api',
  });

  return payload as unknown as AccessTokenPayload;
}
```

### 4.5 Key Rotation

| Property            | Value                                               |
| ------------------- | --------------------------------------------------- |
| **Active Keys**     | 2 (current + previous)                              |
| **Rotation Period** | Every 90 days                                       |
| **Overlap Period**  | 7 days (both keys valid during rotation)            |
| **Key Storage**     | Cloudflare Secrets / Vault; NOT in code or env vars |

```
Key Lifecycle:
  Day 0     Day 90    Day 97    Day 180   Day 187
    │         │         │         │         │
    ├─ Key A  ├─ Key A  │         │         │
    │ (sign)  │ (verify)│         │         │
    │         ├─ Key B  ├─ Key B  │         │
    │         │ (sign+  │ (verify)│         │
    │         │  verify)│         │         │
    │         │         ├─ Key C  ├─ Key C  │
    │         │         │ (sign+  │ (verify)│
    │         │         │  verify)│         │
```

---

## 5. Session Management

### 5.1 Session Store (Redis)

Each authenticated session is stored as a Redis hash:

```
Key:    sprintio:session:{sessionId}
Hash:
  user_id        → UUID of the user
  refresh_token  → SHA-256 hash of the current refresh token
  workspace_id   → Active workspace context
  ip_address     → IP at login time
  user_agent     → User agent string
  device_info    → Parsed device type (Chrome/Windows/etc.)
  created_at     → ISO timestamp
  last_active    → ISO timestamp (updated on each refresh)
  expires_at     → ISO timestamp
  mfa_verified   → "true" | "false"
  remember_me    → "true" | "false"

TTL: 7 days (or 30 days if remember_me=true)
```

### 5.2 Session Features

| Feature                  | Implementation                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| **Concurrent Sessions**  | Unlimited by default; 10 concurrent sessions warning at plan limits                       |
| **Session Revocation**   | Single session revoke → delete Redis hash; All sessions → delete by `user_id` prefix scan |
| **Last Active Tracking** | Updated on each token refresh (not every request — avoids Redis write amplification)      |
| **Device Display**       | Parse `User-Agent` → show "Chrome on macOS", "Firefox on Windows" in session list         |
| **Session Listing**      | `SCAN` Redis with pattern `sprintio:session:*` filtered by `user_id`                      |

### 5.3 Session Revocation Implementation

```typescript
// src/lib/auth/session.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);
const SESSION_PREFIX = 'sprintio:session:';
const USER_SESSIONS_PREFIX = 'sprintio:user-sessions:';

export async function createSession(sessionId: string, data: SessionData): Promise<void> {
  const key = `${SESSION_PREFIX}${sessionId}`;
  const userKey = `${USER_SESSIONS_PREFIX}${data.userId}`;

  const ttl = data.rememberMe ? 30 * 24 * 3600 : 7 * 24 * 3600;

  // Store session data
  await redis.hset(key, {
    user_id: data.userId,
    refresh_token: hashToken(data.refreshToken),
    workspace_id: data.workspaceId,
    ip_address: data.ipAddress,
    user_agent: data.userAgent,
    device_info: parseDevice(data.userAgent),
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
    expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
    mfa_verified: String(data.mfaVerified),
    remember_me: String(data.rememberMe),
  });

  await redis.expire(key, ttl);

  // Track session IDs per user (for listing/revocation)
  await redis.sadd(userKey, sessionId);
  await redis.expire(userKey, ttl);
}

export async function revokeSession(sessionId: string): Promise<void> {
  const key = `${SESSION_PREFIX}${sessionId}`;
  const data = await redis.hgetall(key);

  if (!data.user_id) return;

  const userKey = `${USER_SESSIONS_PREFIX}${data.user_id}`;

  await Promise.all([redis.del(key), redis.srem(userKey, sessionId)]);
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  const userKey = `${USER_SESSIONS_PREFIX}${userId}`;
  const sessionIds = await redis.smembers(userKey);

  if (sessionIds.length === 0) return;

  // Pipeline for performance
  const pipeline = redis.pipeline();
  for (const sid of sessionIds) {
    pipeline.del(`${SESSION_PREFIX}${sid}`);
  }
  pipeline.del(userKey);
  await pipeline.exec();
}

export async function refreshSession(
  sessionId: string,
  newRefreshToken: string,
  newRefreshTokenHash: string,
): Promise<void> {
  const key = `${SESSION_PREFIX}${sessionId}`;

  await redis.hset(key, {
    refresh_token: newRefreshTokenHash,
    last_active: new Date().toISOString(),
  });

  // Extend TTL
  const data = await redis.hgetall(key);
  const ttl = data.remember_me === 'true' ? 30 * 24 * 3600 : 7 * 24 * 3600;
  await redis.expire(key, ttl);
}

// Helper: detect refresh token reuse (stolen token)
export async function detectTokenReuse(
  userId: string,
  incomingTokenHash: string,
): Promise<boolean> {
  const userKey = `${USER_SESSIONS_PREFIX}${userId}`;
  const sessionIds = await redis.smembers(userKey);

  for (const sid of sessionIds) {
    const data = await redis.hgetall(`${SESSION_PREFIX}${sid}`);
    // If ANY session has a DIFFERENT (newer) refresh token hash,
    // and we're receiving an older one → theft detected
    if (data.refresh_token && data.refresh_token !== incomingTokenHash) {
      return true; // Token reuse detected
    }
  }

  return false;
}
```

---

## 6. Password Strategy

### 6.1 Hashing: argon2id

| Property        | Value                                             |
| --------------- | ------------------------------------------------- |
| **Algorithm**   | argon2id (RFC 9106 — hybrid of argon2i + argon2d) |
| **Memory**      | 64 MB (tunable; increase as hardware improves)    |
| **Iterations**  | 3                                                 |
| **Parallelism** | 4 threads                                         |
| **Salt**        | 16 bytes, random, per-hash                        |
| **Output**      | 32 bytes                                          |

**Why argon2id over bcrypt?**

- Memory-hard (resistant to GPU/ASIC attacks — bcrypt is not)
- Winner of the Password Hashing Competition (2015)
- RFC 9106 standardized; recommended by OWASP
- Better resistance to side-channel attacks than pure argon2d

### 6.2 Password Strength Requirements

| Rule                 | Implementation                                                 |
| -------------------- | -------------------------------------------------------------- |
| **Minimum length**   | 8 characters                                                   |
| **Maximum length**   | 128 characters (prevent DoS via large hashes)                  |
| **Complexity**       | At least 3 of: uppercase, lowercase, digit, special char       |
| **Common passwords** | Check against Have I Been Pwned top 100k passwords             |
| **Breach database**  | HIBP k-Anonymity API check at registration and password change |
| **Reuse prevention** | Last 5 passwords cannot be reused (hash comparison)            |

### 6.3 Password Hashing Implementation

```typescript
// src/lib/auth/password.ts
import argon2 from 'argon2';
import { z } from 'zod';

const PASSWORD_SCHEMA = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine((pwd) => {
    const checks = [
      /[a-z]/.test(pwd),
      /[A-Z]/.test(pwd),
      /[0-9]/.test(pwd),
      /[^a-zA-Z0-9]/.test(pwd),
    ];
    return checks.filter(Boolean).length >= 3;
  }, 'Password must contain at least 3 of: lowercase, uppercase, digit, special character');

export const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3, // 3 iterations
  parallelism: 4, // 4 threads
  saltLength: 16,
  hashLength: 32,
};

export async function hashPassword(password: string): Promise<string> {
  // Validate password strength
  PASSWORD_SCHEMA.parse(password);

  // Hash with argon2id
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export async function checkPasswordBreach(password: string): Promise<boolean> {
  // HIBP k-Anonymity: only send first 5 chars of SHA-1 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  const prefix = hashHex.slice(0, 5).toUpperCase();
  const suffix = hashHex.slice(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const text = await response.text();

  return text.includes(suffix.toUpperCase());
}
```

### 6.4 Password Reset Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐        ┌──────────┐
│  Client  │         │  Server  │         │  Email   │        │ PostgreSQL│
└────┬─────┘         └────┬─────┘         └────┬─────┘        └────┬─────┘
     │  POST /auth/forgot-password              │                    │
     │  { email }                               │                    │
     │──────────────────────────────────────────>│                    │
     │                                          │                    │
     │  ┌──────────────────────────────────────┤                    │
     │  │ 1. Rate limit: 3 requests/hour/email │                    │
     │  │ 2. Always return 200 (no user enum)  │                    │
     │  │ 3. If email exists:                  │                    │
     │  │    a) Generate reset token (random)  │                    │
     │  │    b) Hash token for DB storage      │───────────────────>│
     │  │    c) Store with 1-hour expiry       │                    │
     │  │    d) Queue email (async)            │                    │
     │  └──────────────────────────────────────┤                    │
     │                                          │                    │
     │  200 { message: "If email exists..." }   │                    │
     │<──────────────────────────────────────────│                    │
     │                                          │                    │
     │  ┌────── Email sent ─────────────────┐   │                    │
     │  │ "Reset password" link:             │   │                    │
     │  │ /reset-password?token=abc123       │   │                    │
     │  └───────────────────────────────────┘   │                    │
     │                                          │                    │
     │  POST /auth/reset-password               │                    │
     │  { token, newPassword }                   │                    │
     │──────────────────────────────────────────>│                    │
     │                                          │                    │
     │  ┌──────────────────────────────────────┤                    │
     │  │ 1. Hash token, look up in DB        │───────────────────>│
     │  │ 2. Check not expired                │                    │
     │  │ 3. Check not already used           │                    │
     │  │ 4. Hash new password (argon2id)      │                    │
     │  │ 5. Update user password             │                    │
     │  │ 6. Mark token used                  │                    │
     │  │ 7. REVOKE ALL sessions for user     │                    │
     │  │ 8. Log audit event                  │                    │
     │  └──────────────────────────────────────┤                    │
     │                                          │                    │
     │  200 { message: "Password updated" }     │                    │
     │<──────────────────────────────────────────│                    │
```

---

## 7. OAuth Integration

### 7.1 Provider Configuration

| Provider   | Scopes                 | Callback URL                  | Account Linking        |
| ---------- | ---------------------- | ----------------------------- | ---------------------- |
| **Google** | `openid email profile` | `/auth/oauth/google/callback` | Match by email         |
| **GitHub** | `read:user user:email` | `/auth/oauth/github/callback` | Match by primary email |

### 7.2 OAuth Configuration

```typescript
// src/lib/auth/oauth/config.ts

export const OAUTH_PROVIDERS = {
  google: {
    authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenURL: 'https://oauth2.googleapis.com/token',
    userInfoURL: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'email', 'profile'],
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: '/auth/oauth/google/callback',
  },
  github: {
    authorizationURL: 'https://github.com/login/oauth/authorize',
    tokenURL: 'https://github.com/login/oauth/access_token',
    userInfoURL: 'https://api.github.com/user',
    scopes: ['read:user', 'user:email'],
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    callbackURL: '/auth/oauth/github/callback',
  },
} as const;
```

### 7.3 Account Linking Logic

```
┌────────────────────────────────────────────────────────────────┐
│                   ACCOUNT LINKING DECISION TREE                  │
│                                                                │
│  OAuth callback received (provider, email, providerId)         │
│                    │                                           │
│                    ▼                                           │
│  ┌───────────────────────────────────┐                         │
│  │ Does user exist with this email?  │                         │
│  └────────┬──────────────┬───────────┘                         │
│           │ YES          │ NO                                  │
│           ▼              ▼                                     │
│  ┌─────────────────┐  ┌──────────────────┐                    │
│  │ Is this provider│  │ Create new user   │                    │
│  │ already linked? │  │ (email verified  │                    │
│  └───┬─────────┬───┘  │  from OAuth)     │                    │
│      │ YES     │ NO   │ Create personal  │                    │
│      ▼         ▼      │ workspace        │                    │
│  ┌────────┐ ┌──────┐  │ Link provider    │                    │
│  │Login   │ │Link  │  └──────────────────┘                    │
│  │normal  │ │OAuth │                                           │
│  └────────┘ │to    │                                           │
│             │exist.│                                           │
│             └──────┘                                           │
│                                                                │
│  Post-login:                                                   │
│  1. Generate JWT access token (15 min)                        │
│  2. Generate refresh token (7 days)                           │
│  3. Create session in Redis                                   │
│  4. Set refresh token cookie                                  │
│  5. Audit log: "user.login" via provider                      │
│  6. Redirect to /app                                          │
└────────────────────────────────────────────────────────────────┘
```

### 7.4 OAuth Implementation

```typescript
// src/lib/auth/oauth/handler.ts
import { OAUTH_PROVIDERS } from './config';

export async function handleOAuthCallback(
  provider: 'google' | 'github',
  code: string,
  state: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const config = OAUTH_PROVIDERS[provider];

  // 1. Validate state (CSRF protection)
  const storedState = await redis.get(`oauth:state:${state}`);
  if (!storedState) throw new AuthError('INVALID_STATE', 'OAuth state expired or invalid');
  await redis.del(`oauth:state:${state}`);

  // 2. Exchange code for tokens
  const tokenResponse = await fetch(config.tokenURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: `${process.env.APP_URL}${config.callbackURL}`,
    }),
  });
  const tokens = await tokenResponse.json();

  // 3. Fetch user info
  const userInfoResponse = await fetch(config.userInfoURL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userInfoResponse.json();

  // 4. Find or create user
  const email = userInfo.email;
  const providerId = userInfo.id;

  const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);

  let userId: string;

  if (existingUser.rows.length > 0) {
    userId = existingUser.rows[0].id;

    // Link provider if not already linked
    await db.query(
      `INSERT INTO user_oauth_providers (user_id, provider, provider_user_id, email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, provider) DO UPDATE SET provider_user_id = $3`,
      [userId, provider, providerId, email],
    );
  } else {
    // Create new user (OAuth-verified email)
    const result = await db.query(
      `INSERT INTO users (email, name, email_verified, avatar_url)
       VALUES ($1, $2, true, $3)
       RETURNING id`,
      [email, userInfo.name, userInfo.picture || null],
    );
    userId = result.rows[0].id;

    // Link provider
    await db.query(
      `INSERT INTO user_oauth_providers (user_id, provider, provider_user_id, email)
       VALUES ($1, $2, $3, $4)`,
      [userId, provider, providerId, email],
    );

    // Create personal workspace
    await createPersonalWorkspace(userId);
  }

  // 5. Generate tokens and session
  const { accessToken, refreshToken, sessionId } = await generateTokenPair({
    sub: userId,
    email,
    wsp: await getDefaultWorkspaceId(userId),
    roles: ['member'],
    mfa: false,
  });

  await createSession(sessionId, {
    userId,
    refreshToken,
    workspaceId: await getDefaultWorkspaceId(userId),
    ipAddress: '', // from request
    userAgent: '', // from request
    mfaVerified: false,
    rememberMe: false,
  });

  // 6. Audit log
  await auditLog({
    action: 'user.login',
    userId,
    metadata: { method: 'oauth', provider },
  });

  return { accessToken, refreshToken };
}
```

---

## 8. Magic Link (Passwordless)

### 8.1 Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │         │  Server  │         │  Email   │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │  POST /auth/magic-link                  │
     │  { email }                              │
     │─────────────────────────────────────────>│
     │                                         │
     │  ┌─────────────────────────────────────┤
     │  │ 1. Rate limit: 3 requests/hour/email│
     │  │ 2. Generate magic link token (32B)  │
     │  │ 3. Store in Redis:                  │
     │  │    key: ml:{token_hash}             │
     │  │    value: { userId, email, expires } │
     │  │    TTL: 15 minutes                  │
     │  │ 4. Queue email (async)              │
     │  └─────────────────────────────────────┤
     │                                         │
     │  200 { message: "Check your email" }   │
     │<─────────────────────────────────────────│
     │                                         │
     │  ┌──── Email sent ─────────────────┐   │
     │  │ Subject: "Sign in to Sprintio"   │   │
     │  │ Link: https://app.sprintio.io/  │   │
     │  │        auth/magic-link/          │   │
     │  │        verify?token=ml_abc123    │   │
     │  │ Expiry: 15 minutes              │   │
     │  └─────────────────────────────────┘   │
     │                                         │
     │  GET /auth/magic-link/verify?token=... │
     │─────────────────────────────────────────>│
     │                                         │
     │  ┌─────────────────────────────────────┤
     │  │ 1. Hash token, look up in Redis    │
     │  │ 2. Check not expired               │
     │  │ 3. Delete token (single use)       │
     │  │ 4. Find-or-create user by email    │
     │  │ 5. Mark email verified             │
     │  │ 6. Generate token pair             │
     │  │ 7. Create session                  │
     │  │ 8. Audit log                       │
     │  └─────────────────────────────────────┤
     │                                         │
     │  302 Redirect to /app                  │
     │  (Set-Cookie: refresh token)           │
     │<─────────────────────────────────────────│
```

### 8.2 Implementation

```typescript
// src/lib/auth/magic-link.ts
import { randomBytes, createHash } from 'node:crypto';
import { redis } from '../redis';

const MAGIC_LINK_TTL = 15 * 60; // 15 minutes
const MAGIC_LINK_PREFIX = 'ml:';
const MAX_ATTEMPTS_PER_HOUR = 3;

export async function generateMagicLink(email: string): Promise<void> {
  // Rate limit
  const attemptsKey = `ml:attempts:${email}`;
  const attempts = await redis.incr(attemptsKey);
  if (attempts === 1) await redis.expire(attemptsKey, 3600);
  if (attempts > MAX_ATTEMPTS_PER_HOUR) {
    throw new AuthError('RATE_LIMITED', 'Too many magic link requests');
  }

  // Find or create user
  const user = await findOrCreateUserByEmail(email);

  // Generate token
  const rawToken = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  // Store in Redis
  await redis.setex(
    `${MAGIC_LINK_PREFIX}${tokenHash}`,
    MAGIC_LINK_TTL,
    JSON.stringify({
      userId: user.id,
      email,
      createdAt: new Date().toISOString(),
    }),
  );

  // Send email (async via BullMQ)
  await emailQueue.add('magic-link', {
    to: email,
    token: rawToken,
    expiresIn: '15 minutes',
  });
}

export async function verifyMagicLink(
  rawToken: string,
): Promise<{ userId: string; email: string }> {
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const key = `${MAGIC_LINK_PREFIX}${tokenHash}`;

  const data = await redis.get(key);
  if (!data) {
    throw new AuthError('INVALID_TOKEN', 'Magic link expired or invalid');
  }

  // Delete immediately (single-use)
  await redis.del(key);

  const { userId, email } = JSON.parse(data);
  return { userId, email };
}
```

---

## 9. Multi-Factor Authentication (TOTP)

### 9.1 TOTP Configuration

| Property      | Value                                             |
| ------------- | ------------------------------------------------- |
| **Algorithm** | SHA-1 (RFC 6238 — compatible with all TOTP apps)  |
| **Digits**    | 6                                                 |
| **Period**    | 30 seconds                                        |
| **Tolerance** | ±1 period (60 seconds window)                     |
| **Issuer**    | `Sprintio`                                        |
| **Apps**      | Google Authenticator, Authy, 1Password, Bitwarden |

### 9.2 MFA Setup Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │         │  Server  │         │ TOTP App │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │  POST /auth/mfa/setup                   │
     │  (requires active auth session)         │
     │─────────────────────────────────────────>│
     │                                         │
     │  ┌─────────────────────────────────────┤
     │  │ 1. Generate TOTP secret (20 bytes)  │
     │  │ 2. Store encrypted in DB:           │
     │  │    users.mfa_secret (AES-256)       │
     │  │ 3. Generate QR code URI:            │
     │  │    otpauth://totp/Sprintio:          │
     │  │    user@email.com?secret=XXX&        │
     │  │    issuer=Sprintio&algorithm=SHA1    │
     │  │ 4. Generate 10 backup codes          │
     │  │    (random 8-char alphanumeric)      │
     │  │ 5. Hash backup codes for storage     │
     │  │ 6. Store as "pending" (not active)   │
     │  └─────────────────────────────────────┤
     │                                         │
     │  200 {                                  │
     │    qrCode: "data:image/png;base64...",  │
     │    secret: "JBSWY3DPEHPK3PXP",         │
     │    backupCodes: [                       │
     │      "A1B2-C3D4",                       │
     │      "E5F6-G7H8",                       │
     │      ... (10 total)                     │
     │    ]                                    │
     │  }                                      │
     │<─────────────────────────────────────────│
     │                                         │
     │  ┌── User scans QR with TOTP app ──┐   │
     │  │  App generates 6-digit code      │   │
     │  └──────────────────────────────────┘   │
     │                                         │
     │  POST /auth/mfa/confirm                 │
     │  { code: "123456" }                     │
     │─────────────────────────────────────────>│
     │                                         │
     │  ┌─────────────────────────────────────┤
     │  │ 1. Verify TOTP code                 │
     │  │ 2. If valid: mark MFA as active     │
     │  │ 3. Update backup code hashes        │
     │  │ 4. Audit log: "mfa.enabled"         │
     │  └─────────────────────────────────────┤
     │                                         │
     │  200 { message: "MFA enabled" }        │
     │<─────────────────────────────────────────│
```

### 9.3 MFA Verification Implementation

```typescript
// src/lib/auth/mfa.ts
import * as otplib from 'otplib';
import { randomBytes, createHash } from 'node:crypto';
import { db } from '../database';

const TOTP_OPTIONS = {
  issuer: 'Sprintio',
  algorithm: 'sha1',
  digits: 6,
  period: 30,
};

export async function generateMFASecret(userId: string): Promise<{
  secret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}> {
  const secret = otplib.authenticator.generateSecret(); // 16-char base32

  // Generate QR code
  const otpauthUrl = otplib.authenticator.keyuri(
    (await getUserById(userId)).email,
    TOTP_OPTIONS.issuer,
    secret,
  );
  const qrCodeDataUrl = await generateQRCode(otpauthUrl);

  // Generate backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    randomBytes(4)
      .toString('hex')
      .toUpperCase()
      .match(/.{1,4}/g)!
      .join('-'),
  );

  // Store hashed backup codes
  const hashedCodes = await Promise.all(
    backupCodes.map(async (code) => ({
      hash: await argon2.hash(code.replace('-', '')),
      used: false,
    })),
  );

  await db.query(
    `UPDATE users
     SET mfa_secret_encrypted = encrypt($1),
         mfa_backup_codes = $2,
         mfa_enabled = false
     WHERE id = $3`,
    [secret, JSON.stringify(hashedCodes), userId],
  );

  return { secret, qrCodeDataUrl, backupCodes };
}

export async function verifyTOTPCode(userId: string, code: string): Promise<boolean> {
  const user = await db.query('SELECT mfa_secret_encrypted FROM users WHERE id = $1', [userId]);

  const secret = decrypt(user.rows[0].mfa_secret_encrypted);
  return otplib.authenticator.verify({ token: code, secret });
}

export async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  const user = await db.query('SELECT mfa_backup_codes FROM users WHERE id = $1', [userId]);

  const backupCodes: Array<{ hash: string; used: boolean }> = JSON.parse(
    user.rows[0].mfa_backup_codes,
  );

  const cleanCode = code.replace('-', '');

  for (let i = 0; i < backupCodes.length; i++) {
    if (!backupCodes[i].used && (await argon2.verify(backupCodes[i].hash, cleanCode))) {
      // Mark as used
      backupCodes[i].used = true;
      await db.query('UPDATE users SET mfa_backup_codes = $1 WHERE id = $2', [
        JSON.stringify(backupCodes),
        userId,
      ]);
      return true;
    }
  }

  return false;
}
```

---

## 10. RBAC Model

### 10.1 Role Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    ROLE HIERARCHY                            │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  OWNER (workspace creator)                           │  │
│  │  Full control. Cannot be removed by others.          │  │
│  │  Transfers ownership. Deletes workspace.             │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │ inherits all permissions         │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │  ADMIN                                              │  │
│  │  Manage members, settings, billing, API keys.        │  │
│  │  Cannot transfer ownership or delete workspace.      │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │ inherits all permissions         │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │  MEMBER                                             │  │
│  │  Create/edit tasks, docs, automations.               │  │
│  │  Comment, assign, update status.                     │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │ inherits view-only permissions   │
│  ┌────────────────────────▼──────────────────────────────┐  │
│  │  GUEST (project-scoped)                              │  │
│  │  View + limited edit on assigned resources only.     │  │
│  │  Time-limited access. Cannot see unscoped resources. │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Permission Matrix

| Permission                   | Owner | Admin |  Member  |   Guest   |
| ---------------------------- | :---: | :---: | :------: | :-------: |
| **Workspace Management**     |       |       |          |           |
| Create workspace             |  ✅   |   —   |    —     |     —     |
| Delete workspace             |  ✅   |   —   |    —     |     —     |
| Transfer ownership           |  ✅   |   —   |    —     |     —     |
| Update workspace settings    |  ✅   |  ✅   |    —     |     —     |
| Manage billing/plan          |  ✅   |  ✅   |    —     |     —     |
| **Member Management**        |       |       |          |           |
| Invite members               |  ✅   |  ✅   |    —     |     —     |
| Remove members               |  ✅   |  ✅   |    —     |     —     |
| Change member roles          |  ✅   |  ✅   |    —     |     —     |
| View all members             |  ✅   |  ✅   |    ✅    |     —     |
| **Project/Space Management** |       |       |          |           |
| Create space                 |  ✅   |  ✅   |    ✅    |     —     |
| Delete space                 |  ✅   |  ✅   |    —     |     —     |
| Manage space settings        |  ✅   |  ✅   |    ✅    |     —     |
| Archive space                |  ✅   |  ✅   |    —     |     —     |
| **Task Management**          |       |       |          |           |
| Create tasks                 |  ✅   |  ✅   |    ✅    | 🔶 Scoped |
| Edit own tasks               |  ✅   |  ✅   |    ✅    | 🔶 Scoped |
| Edit all tasks               |  ✅   |  ✅   |    ✅    | 🔶 Scoped |
| Delete tasks                 |  ✅   |  ✅   |    ✅    |     —     |
| Assign tasks                 |  ✅   |  ✅   |    ✅    |     —     |
| Move tasks between lists     |  ✅   |  ✅   |    ✅    |     —     |
| Bulk operations              |  ✅   |  ✅   |    ✅    |     —     |
| **Document Management**      |       |       |          |           |
| Create docs                  |  ✅   |  ✅   |    ✅    | 🔶 Scoped |
| Edit own docs                |  ✅   |  ✅   |    ✅    | 🔶 Scoped |
| Edit all docs                |  ✅   |  ✅   |    ✅    |     —     |
| Delete docs                  |  ✅   |  ✅   |    ✅    |     —     |
| **Automation**               |       |       |          |           |
| Create automations           |  ✅   |  ✅   |    ✅    |     —     |
| Edit automations             |  ✅   |  ✅   |    ✅    |     —     |
| Delete automations           |  ✅   |  ✅   |    ✅    |     —     |
| View run history             |  ✅   |  ✅   |    ✅    |     —     |
| **Integrations**             |       |       |          |           |
| Connect integrations         |  ✅   |  ✅   |    —     |     —     |
| Manage webhooks              |  ✅   |  ✅   |    —     |     —     |
| **Security & API**           |       |       |          |           |
| Create API keys              |  ✅   |  ✅   |    —     |     —     |
| Revoke API keys              |  ✅   |  ✅   | ✅ (own) |     —     |
| Manage SSO (Phase 2)         |  ✅   |  ✅   |    —     |     —     |
| View audit logs              |  ✅   |  ✅   |    —     |     —     |
| Export audit logs            |  ✅   |  ✅   |    —     |     —     |
| **Teams**                    |       |       |          |           |
| Create teams                 |  ✅   |  ✅   |    —     |     —     |
| Manage team members          |  ✅   |  ✅   |    —     |     —     |
| View teams                   |  ✅   |  ✅   |    ✅    |    ✅     |
| **AI Copilot**               |       |       |          |           |
| Use AI features              |  ✅   |  ✅   |    ✅    |     —     |
| Configure AI settings        |  ✅   |  ✅   |    —     |     —     |
| View AI usage                |  ✅   |  ✅   |    —     |     —     |

> 🔶 **Scoped** = Guest can perform the action only on resources they have been explicitly granted access to.

### 10.3 RBAC Data Model

```sql
-- Roles are stored in database, not hardcoded
-- This enables custom roles in Phase 2

CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL UNIQUE,          -- 'owner', 'admin', 'member', 'guest'
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT true,         -- false = custom role (Phase 2)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-seed system roles
INSERT INTO roles (name, description, is_system) VALUES
  ('owner',  'Full workspace control', true),
  ('admin',  'Manage members and settings', true),
  ('member', 'Standard workspace member', true),
  ('guest',  'Scoped, limited access', true);

-- Permissions are granular actions
CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action      VARCHAR(100) NOT NULL UNIQUE,         -- e.g., 'task.create', 'space.delete'
  resource    VARCHAR(100) NOT NULL,                -- e.g., 'task', 'space', 'workspace'
  description TEXT
);

-- Role ↔ Permission mapping
CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- User ↔ Workspace ↔ Role (many-to-many)
CREATE TABLE memberships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES roles(id),
  invited_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, workspace_id)
);

-- Guest scope: which resources a guest can access
CREATE TABLE guest_scopes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,               -- 'task', 'list', 'folder'
  resource_id   UUID NOT NULL,
  expires_at    TIMESTAMPTZ,                        -- NULL = no expiry
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (membership_id, resource_type, resource_id)
);

-- Indexes
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_workspace ON memberships(workspace_id);
CREATE INDEX idx_memberships_user_workspace ON memberships(user_id, workspace_id);
CREATE INDEX idx_guest_scopes_membership ON guest_scopes(membership_id);
CREATE INDEX idx_guest_scopes_resource ON guest_scopes(resource_type, resource_id);
```

---

## 11. Authorization Middleware

### 11.1 Middleware Chain

```
┌──────────────────────────────────────────────────────────────────────┐
│                     EXPRESS MIDDLEWARE CHAIN                          │
│                                                                      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────────┐ │
│  │ Request  │──>│ Rate     │──>│ Auth     │──>│ RBAC Guard       │ │
│  │ arrives  │   │ Limiter  │   │ Resolver │   │                  │ │
│  │          │   │ (per IP) │   │          │   │ 1. Check role     │ │
│  │          │   │          │   │ 1. Check │   │    in workspace   │ │
│  │          │   │ 429 if   │   │    header │   │ 2. Check resource │ │
│  │          │   │ exceeded │   │    type   │   │    permissions    │ │
│  │          │   │          │   │ 2. JWT:   │   │ 3. Guest scope    │ │
│  │          │   │          │   │    verify │   │    check          │ │
│  │          │   │          │   │ 3. Cookie:│   │ 4. 403 if denied  │ │
│  │          │   │          │   │    refresh│   │                  │ │
│  │          │   │          │   │ 4. API Key│   │                  │ │
│  │          │   │          │   │    lookup │   │                  │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────────────┘ │
│                                                     │                │
│                                                     ▼                │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     ROUTE HANDLER                            │   │
│  │                                                              │   │
│  │  req.user    = { id, email, sessionId, roles, workspaceId }  │   │
│  │  req.auth    = { method: 'jwt' | 'cookie' | 'api_key' }     │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### 11.2 Auth Resolver Middleware

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/auth/token';
import { redis } from '../lib/redis';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      auth?: AuthMethod;
    }
  }
}

interface AuthenticatedUser {
  id: string;
  email: string;
  sessionId: string;
  workspaceId: string;
  roles: string[];
  mfaVerified: boolean;
}

interface AuthMethod {
  type: 'jwt' | 'api_key';
  keyId?: string; // for API keys
}

/**
 * Auth resolver middleware.
 * Extracts and validates the authentication method.
 * Populates req.user and req.auth.
 */
export async function authResolver(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'] as string | undefined;

    // API Key authentication
    if (apiKeyHeader) {
      return await handleApiKeyAuth(req, res, next, apiKeyHeader);
    }

    // Bearer token (JWT)
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      return await handleJwtAuth(req, res, next, token);
    }

    // No authentication
    return res.status(401).json({
      code: 'UNAUTHENTICATED',
      message: 'Authentication required',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
      });
    }
    next(error);
  }
}

async function handleJwtAuth(
  req: Request,
  res: Response,
  next: NextFunction,
  token: string,
): Promise<void> {
  const payload = await verifyAccessToken(token);

  // Check if session is still valid (not revoked)
  const sessionExists = await redis.exists(`sprintio:session:${payload.sid}`);
  if (!sessionExists) {
    return res.status(401).json({
      code: 'SESSION_REVOKED',
      message: 'Session has been revoked',
    });
  }

  req.user = {
    id: payload.sub,
    email: payload.email,
    sessionId: payload.sid,
    workspaceId: payload.wsp,
    roles: payload.roles,
    mfaVerified: payload.mfa,
  };
  req.auth = { type: 'jwt' };

  next();
}

async function handleApiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction,
  apiKey: string,
): Promise<void> {
  // Hash the API key and look it up
  const keyHash = await sha256(apiKey);
  const keyData = await db.query(
    `SELECT ak.*, m.role_id, r.name as role_name
     FROM api_keys ak
     JOIN memberships m ON m.workspace_id = ak.workspace_id
     JOIN roles r ON r.id = m.role_id
     WHERE ak.key_hash = $1
       AND ak.revoked_at IS NULL
       AND ak.expires_at > NOW()`,
    [keyHash],
  );

  if (keyData.rows.length === 0) {
    return res.status(401).json({
      code: 'INVALID_API_KEY',
      message: 'Invalid or expired API key',
    });
  }

  const key = keyData.rows[0];

  // Rate limit per API key
  const rateLimitKey = `rl:apikey:${key.id}`;
  const count = await redis.incr(rateLimitKey);
  if (count === 1) await redis.expire(rateLimitKey, 60);
  if (count > 1000) {
    return res.status(429).json({
      code: 'RATE_LIMITED',
      message: 'API key rate limit exceeded',
    });
  }

  // Update last used
  await db.query('UPDATE api_keys SET last_used_at = NOW(), last_used_ip = $1 WHERE id = $2', [
    req.ip,
    key.id,
  ]);

  req.user = {
    id: key.user_id,
    email: '', // API keys don't expose email
    sessionId: `apikey:${key.id}`,
    workspaceId: key.workspace_id,
    roles: [key.role_name],
    mfaVerified: true, // API keys bypass MFA (authenticated via key)
  };
  req.auth = { type: 'api_key', keyId: key.id };

  next();
}
```

### 11.3 RBAC Guard Middleware

```typescript
// src/middleware/rbac.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../database';

type Permission = string; // e.g., 'task.create', 'space.delete', 'workspace.manage'

/**
 * RBAC Guard middleware factory.
 * Checks if the authenticated user has the required permission
 * in their current workspace context.
 */
export function requirePermission(...permissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    }

    const { id: userId, workspaceId } = req.user;

    // 1. Get user's membership and role in this workspace
    const membership = await db.query(
      `SELECT m.role_id, r.name as role_name
       FROM memberships m
       JOIN roles r ON r.id = m.role_id
       WHERE m.user_id = $1 AND m.workspace_id = $2`,
      [userId, workspaceId],
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({
        code: 'NOT_MEMBER',
        message: 'You are not a member of this workspace',
      });
    }

    const { role_id, role_name } = membership.rows[0];

    // 2. Owner bypasses all permission checks
    if (role_name === 'owner') {
      return next();
    }

    // 3. Check if role has the required permission(s)
    const rolePermissions = await db.query(
      `SELECT p.action
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = $1`,
      [role_id],
    );

    const hasPermission = permissions.every((required) =>
      rolePermissions.rows.some((p) => p.action === required),
    );

    if (!hasPermission) {
      return res.status(403).json({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Missing required permission: ${permissions.join(' or ')}`,
      });
    }

    // 4. For guests: check resource scope
    if (role_name === 'guest') {
      const resourceId = req.params.id || req.params.taskId || req.params.listId;
      const resourceType = extractResourceType(req);

      if (resourceId && resourceType) {
        const scope = await db.query(
          `SELECT 1 FROM guest_scopes gs
           JOIN memberships m ON m.id = gs.membership_id
           WHERE m.user_id = $1
             AND m.workspace_id = $2
             AND gs.resource_type = $3
             AND gs.resource_id = $4
             AND (gs.expires_at IS NULL OR gs.expires_at > NOW())`,
          [userId, workspaceId, resourceType, resourceId],
        );

        if (scope.rows.length === 0) {
          return res.status(403).json({
            code: 'OUT_OF_SCOPE',
            message: 'You do not have access to this resource',
          });
        }
      }
    }

    next();
  };
}

// Helper: cache permission checks (5 minute TTL)
export async function getCachedPermissions(userId: string, workspaceId: string): Promise<string[]> {
  const cacheKey = `perms:${userId}:${workspaceId}`;
  const cached = await redis.get(cacheKey);

  if (cached) return JSON.parse(cached);

  const result = await db.query(
    `SELECT DISTINCT p.action
     FROM memberships m
     JOIN role_permissions rp ON rp.role_id = m.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE m.user_id = $1 AND m.workspace_id = $2`,
    [userId, workspaceId],
  );

  const permissions = result.rows.map((r) => r.action);
  await redis.setex(cacheKey, 300, JSON.stringify(permissions)); // 5 min

  return permissions;
}
```

### 11.4 Route Usage Examples

```typescript
// src/routes/tasks.ts
import { authResolver } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// All routes require authentication
router.use(authResolver);

// Read tasks — Members, Admins, Owners
router.get('/', requirePermission('task.read'), taskController.listTasks);

// Create task — Members, Admins, Owners (Guests scoped)
router.post('/', requirePermission('task.create'), taskController.createTask);

// Delete task — Members, Admins, Owners (not Guests)
router.delete('/:id', requirePermission('task.delete'), taskController.deleteTask);

// Manage workspace settings — Admins, Owners only
router.put(
  '/workspace/settings',
  requirePermission('workspace.manage'),
  workspaceController.updateSettings,
);

// Create API key — Admins, Owners only
router.post('/api-keys', requirePermission('apikey.create'), apiKeyController.createKey);
```

---

## 12. API Key Authentication

### 12.1 Key Properties

| Property              | Value                                                       |
| --------------------- | ----------------------------------------------------------- |
| **Format**            | `srio_live_{random48bytes}` (prefix identifies environment) |
| **Prefixes**          | `srio_live_` (production), `srio_test_` (staging)           |
| **Hashing**           | SHA-256 stored in DB; raw key shown only once at creation   |
| **Scoping**           | Per-workspace; inherits the creator's role permissions      |
| **Rate Limit**        | 1,000 requests/minute per key (configurable per plan)       |
| **Max per workspace** | 10 active keys                                              |
| **Expiration**        | Configurable: 30 days, 90 days, 365 days, or never          |

### 12.2 API Key Database Schema

```sql
CREATE TABLE api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,               -- User-given label: "CI/CD Pipeline"
  key_prefix    VARCHAR(20) NOT NULL,                -- First 8 chars: "srio_live_a1b2c"
  key_hash      VARCHAR(64) NOT NULL UNIQUE,         -- SHA-256 of full key
  scopes        TEXT[] NOT NULL DEFAULT '{}',         -- Future: ['task:*', 'doc:read']
  expires_at    TIMESTAMPTZ,                          -- NULL = no expiry
  last_used_at  TIMESTAMPTZ,
  last_used_ip  INET,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_api_key_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_api_key_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_workspace ON api_keys(workspace_id);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
```

### 12.3 Key Generation

```typescript
// src/lib/auth/api-keys.ts
import { randomBytes, createHash } from 'node:crypto';
import { db } from '../database';

const MAX_KEYS_PER_WORKSPACE = 10;

export async function generateApiKey(
  userId: string,
  workspaceId: string,
  name: string,
  options: { expiresIn?: number } = {},
): Promise<{ rawKey: string; keyPrefix: string; id: string }> {
  // Check limit
  const existing = await db.query(
    `SELECT COUNT(*) FROM api_keys
     WHERE workspace_id = $1 AND revoked_at IS NULL`,
    [workspaceId],
  );

  if (parseInt(existing.rows[0].count) >= MAX_KEYS_PER_WORKSPACE) {
    throw new AuthError(
      'KEY_LIMIT_REACHED',
      `Maximum ${MAX_KEYS_PER_WORKSPACE} API keys per workspace`,
    );
  }

  // Generate key
  const rawBytes = randomBytes(48);
  const rawKey = `srio_live_${rawBytes.toString('base64url')}`;
  const keyPrefix = rawKey.slice(0, 16) + '...';
  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  const expiresAt = options.expiresIn ? new Date(Date.now() + options.expiresIn * 1000) : null;

  const result = await db.query(
    `INSERT INTO api_keys (user_id, workspace_id, name, key_prefix, key_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [userId, workspaceId, name, keyPrefix, keyHash, expiresAt],
  );

  // Audit log
  await auditLog({
    action: 'apikey.create',
    userId,
    workspaceId,
    metadata: { keyName: name, keyPrefix },
  });

  // Raw key returned ONLY at creation time
  return { rawKey, keyPrefix, id: result.rows[0].id };
}

export async function revokeApiKey(
  keyId: string,
  userId: string,
  workspaceId: string,
): Promise<void> {
  await db.query(
    `UPDATE api_keys
     SET revoked_at = NOW()
     WHERE id = $1 AND workspace_id = $2`,
    [keyId, workspaceId],
  );

  await auditLog({
    action: 'apikey.revoke',
    userId,
    workspaceId,
    metadata: { keyId },
  });
}
```

---

## 13. Security Controls

### 13.1 CSRF Protection

| Strategy                     | Implementation                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------ |
| **SameSite cookies**         | `SameSite=Lax` on refresh token cookie — blocks cross-site cookie transmission |
| **Origin header validation** | Express middleware checks `Origin` against allowlist                           |
| **State parameter**          | OAuth flows use random state tokens stored in Redis (10-minute TTL)            |
| **Double Submit Cookie**     | For cookie-based auth: CSRF token in cookie + header must match                |

```typescript
// src/middleware/csrf.ts
const ALLOWED_ORIGINS = [
  'https://app.sprintio.io',
  'https://sprintio.io',
  // Dev
  'http://localhost:5173',
];

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip for API key auth (stateless, no cookies)
  if (req.auth?.type === 'api_key') return next();

  // Skip for GET/HEAD/OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const origin = req.headers.origin || req.headers.referer;
  if (origin && !ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
    return res.status(403).json({
      code: 'CSRF_VIOLATION',
      message: 'Invalid origin',
    });
  }

  next();
}
```

### 13.2 Rate Limiting

| Scope                        | Limit       | Window     | Action                             |
| ---------------------------- | ----------- | ---------- | ---------------------------------- |
| **Global per IP**            | 1,000 req   | 1 minute   | 429                                |
| **Login per email**          | 5 attempts  | 15 minutes | 429 + email notification           |
| **Registration per IP**      | 10 accounts | 1 hour     | 429                                |
| **Password reset per email** | 3 requests  | 1 hour     | 200 (always — prevent enumeration) |
| **Magic link per email**     | 3 requests  | 1 hour     | 200 (always)                       |
| **OAuth state per session**  | 5 requests  | 10 minutes | 429                                |
| **API key**                  | 1,000 req   | 1 minute   | 429 (configurable)                 |
| **MFA attempts**             | 5 attempts  | 15 minutes | 429                                |
| **Token refresh**            | 10 requests | 15 minutes | 429 (revoke all sessions)          |

```typescript
// src/middleware/rate-limit.ts
import { redis } from '../lib/redis';

interface RateLimitConfig {
  key: string;
  limit: number;
  windowSeconds: number;
  skipSuccessful?: boolean;
}

export function rateLimit(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `rl:${config.key}:${getClientIdentifier(req)}`;
    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1000;

    // Sliding window counter
    const multi = redis.multi();
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zadd(key, now, `${now}:${Math.random()}`);
    multi.zcard(key);
    multi.expire(key, config.windowSeconds);

    const results = await multi.exec();
    const count = results![2][1] as number;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.limit - count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((now + config.windowSeconds * 1000) / 1000));

    if (count > config.limit) {
      return res.status(429).json({
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
        retryAfter: config.windowSeconds,
      });
    }

    next();
  };
}

function getClientIdentifier(req: Request): string {
  // Prefer API key, then IP
  const apiKey = req.headers['x-api-key'];
  if (apiKey) return `apikey:${apiKey.slice(0, 16)}`;
  return `ip:${req.ip}`;
}
```

### 13.3 Brute Force Protection

```
┌────────────────────────────────────────────────────────────────────┐
│                    BRUTE FORCE PROTECTION FLOW                      │
│                                                                    │
│  Failed login attempt                                              │
│         │                                                          │
│         ▼                                                          │
│  ┌──────────────────────────────┐                                  │
│  │ Increment failure counter    │                                  │
│  │ Redis: rl:login:{email}     │                                  │
│  │ TTL: 15 minutes             │                                  │
│  └──────────┬───────────────────┘                                  │
│             │                                                      │
│    ┌────────┼────────┬────────────┬────────────┐                   │
│    │        │        │            │            │                   │
│    ▼        ▼        ▼            ▼            ▼                   │
│  1-4      5        6-10       11-20        20+                    │
│  fails    fails    fails      fails         fails                  │
│    │        │        │            │            │                   │
│    ▼        ▼        ▼            ▼            ▼                   │
│  Allow   Block    Block +     Block +     Block +                 │
│  next    15 min   email       notify      lock account            │
│  attempt          warning     admin        (manual                │
│                               to user     unlock)                 │
│                                                                    │
│  GLOBAL IP BLOCKLIST:                                              │
│  If IP triggers brute force on 5+ different emails                │
│  → Block IP for 1 hour                                            │
│  → Alert security team                                             │
└────────────────────────────────────────────────────────────────────┘
```

### 13.4 Audit Logging

| Event                          | Data Captured                                                 |
| ------------------------------ | ------------------------------------------------------------- |
| `user.register`                | userId, email, method (email/oauth/magic-link), ip, userAgent |
| `user.login`                   | userId, method, provider, ip, userAgent, sessionId            |
| `user.login.failed`            | email (hashed), reason, ip, userAgent                         |
| `user.logout`                  | userId, sessionId, ip                                         |
| `user.password.reset.request`  | userId, ip                                                    |
| `user.password.reset.complete` | userId, ip                                                    |
| `user.password.changed`        | userId, ip                                                    |
| `mfa.enabled`                  | userId, ip                                                    |
| `mfa.disabled`                 | userId, ip                                                    |
| `mfa.verified`                 | userId, method (totp/backup), ip                              |
| `apikey.create`                | userId, workspaceId, keyName, keyPrefix                       |
| `apikey.revoke`                | userId, workspaceId, keyId                                    |
| `session.revoked`              | userId, sessionId, revokedBy                                  |
| `session.revoke_all`           | userId, revokedBy, count                                      |
| `member.invited`               | workspaceId, invitedEmail, role, invitedBy                    |
| `member.removed`               | workspaceId, removedUserId, removedBy                         |
| `member.role_changed`          | workspaceId, targetUserId, oldRole, newRole, changedBy        |

```sql
-- Audit log table (append-only, immutable)
CREATE TABLE audit_log (
  id            BIGSERIAL PRIMARY KEY,
  workspace_id  UUID REFERENCES workspaces(id),
  user_id       UUID REFERENCES users(id),
  action        VARCHAR(100) NOT NULL,
  target_type   VARCHAR(50),
  target_id     UUID,
  metadata      JSONB DEFAULT '{}',
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent updates/deletes (immutable)
CREATE RULE audit_log_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE audit_log_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;

-- Indexes
CREATE INDEX idx_audit_log_workspace ON audit_log(workspace_id, created_at DESC);
CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action, created_at DESC);

-- Partition by month for performance at scale
-- (TimescaleDB hypertable for time-series queries)
```

### 13.5 Cookie Security

```typescript
// src/lib/auth/cookie.ts
import { CookieOptions } from 'express';

export const REFRESH_TOKEN_COOKIE: CookieOptions = {
  httpOnly: true, // Not accessible to JavaScript
  secure: true, // HTTPS only
  sameSite: 'lax', // Prevent CSRF; allows top-level navigation
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth', // Only sent to auth endpoints
  domain: '.sprintio.io',
};

export const REFRESH_TOKEN_COOKIE_REMEMBER: CookieOptions = {
  ...REFRESH_TOKEN_COOKIE,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};
```

### 13.6 Security Headers

```typescript
// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0'); // Rely on CSP instead
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'");
  next();
});
```

---

## 14. Frontend Integration

### 14.1 Auth Context (React)

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  workspaceId: string;
  roles: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: 'google' | 'github') => void;
  loginWithMagicLink: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check auth on mount (validate access token or refresh)
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      // Try refresh (cookie-based — automatic)
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Send refresh token cookie
      });

      if (response.ok) {
        const { accessToken } = await response.json();
        // Store access token in memory (NOT localStorage)
        setAccessToken(accessToken);

        // Fetch user profile
        const profileResponse = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (profileResponse.ok) {
          setUser(await profileResponse.json());
        }
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    const data = await response.json();

    if (data.requiresMFA) {
      // Redirect to MFA verification page
      navigate('/auth/mfa', { state: { mfaToken: data.mfaToken } });
      return;
    }

    // Store access token in memory
    setAccessToken(data.accessToken);

    // Fetch user profile
    const profileResponse = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    setUser(await profileResponse.json());
  }, []);

  const loginWithOAuth = useCallback((provider: 'google' | 'github') => {
    window.location.href = `/api/auth/oauth/${provider}`;
  }, []);

  const loginWithMagicLink = useCallback(async (email: string) => {
    await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setAccessToken(null);
    setUser(null);
    navigate('/auth/login');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithOAuth,
        loginWithMagicLink,
        logout,
        refreshAuth: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
```

### 14.2 Access Token Management (In-Memory)

```typescript
// src/lib/auth/token-manager.ts

let accessToken: string | null = null;
let refreshPromise: Promise<void> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Automatic token refresh with request queue.
 * When a 401 is received, all pending requests wait
 * for the refresh to complete, then retry once.
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Always include cookies for refresh
  });

  // Token expired — attempt refresh
  if (response.status === 401 && !options.headers?.['X-Retry']) {
    // Deduplicate concurrent refresh attempts
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => {
        refreshPromise = null;
      });
    }

    await refreshPromise;

    // Retry original request once with new token
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
      headers.set('X-Retry', 'true');
      return fetch(url, { ...options, headers, credentials: 'include' });
    }
  }

  return response;
}

async function doRefresh(): Promise<void> {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      const { accessToken: newToken } = await response.json();
      setAccessToken(newToken);
    } else {
      // Refresh failed — force re-login
      setAccessToken(null);
      window.location.href = '/auth/login';
    }
  } catch {
    setAccessToken(null);
    window.location.href = '/auth/login';
  }
}
```

### 14.3 Protected Routes (TanStack Router)

```typescript
// src/routes/__root.tsx
import { createRootRoute, Outlet, redirect } from '@tanstack/react-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) {
    throw redirect({ to: '/auth/login' });
  }

  return <Outlet />;
}

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  ),
});

// Protected layout route
export const protectedRoute = createRootRoute({
  beforeLoad: () => {
    // Auth check happens in AuthGuard component
  },
  component: AuthGuard,
});
```

### 14.4 Frontend Auth Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                    FRONTEND AUTH STATE MACHINE                        │
│                                                                      │
│                    ┌──────────────┐                                  │
│                    │   APP LOAD   │                                  │
│                    └──────┬───────┘                                  │
│                           │                                          │
│                           ▼                                          │
│                    ┌──────────────┐     ┌──────────────────┐        │
│                    │ Check Token  │────>│ Refresh Token    │        │
│                    │ (in memory)  │fail │ (POST /auth/     │        │
│                    └──────┬───────┘     │  refresh)        │        │
│                      ok   │             └────────┬─────────┘        │
│                           │                ok    │     fail         │
│                           ▼                │     │                  │
│                    ┌──────────────┐         │     ▼                  │
│                    │  FETCH USER  │         │  ┌──────────────┐     │
│                    │  PROFILE     │         │  │  REDIRECT TO │     │
│                    └──────┬───────┘         │  │  LOGIN PAGE  │     │
│                           │                 │  └──────────────┘     │
│                           ▼                 │                       │
│                    ┌──────────────┐         │                       │
│                    │  AUTHENTICATED│         │                       │
│                    │  (show app)  │<────────┘                       │
│                    └──────┬───────┘                                  │
│                           │                                          │
│              ┌────────────┼────────────┐                            │
│              │            │            │                            │
│              ▼            ▼            ▼                            │
│        ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│        │ 401 on   │ │ Logout   │ │ Session  │                     │
│        │ API call │ │ button   │ │ expires  │                     │
│        └────┬─────┘ └────┬─────┘ └────┬─────┘                     │
│             │            │            │                            │
│             ▼            ▼            ▼                            │
│        Auto-refresh  Clear tokens   Auto-refresh                   │
│        + retry       + redirect     + redirect                    │
│                       to login                                    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 15. Database Schema

### 15.1 Users Table

```sql
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 VARCHAR(255) NOT NULL UNIQUE,
  email_verified        BOOLEAN NOT NULL DEFAULT false,
  name                  VARCHAR(255) NOT NULL,
  password_hash         VARCHAR(255),                  -- NULL for OAuth-only users
  avatar_url            TEXT,
  timezone              VARCHAR(50) DEFAULT 'UTC',
  locale                VARCHAR(10) DEFAULT 'en',
  mfa_enabled           BOOLEAN NOT NULL DEFAULT false,
  mfa_secret_encrypted  TEXT,                          -- AES-256 encrypted TOTP secret
  mfa_backup_codes      JSONB,                         -- Hashed backup codes
  last_login_at         TIMESTAMPTZ,
  last_login_ip         INET,
  deleted_at            TIMESTAMPTZ,                   -- Soft delete
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
```

### 15.2 Workspaces Table

```sql
CREATE TABLE workspaces (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) NOT NULL UNIQUE,
  owner_id      UUID NOT NULL REFERENCES users(id),
  plan          VARCHAR(20) NOT NULL DEFAULT 'free',  -- free, pro, business, enterprise
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
```

### 15.3 Memberships Table

```sql
CREATE TABLE memberships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role_id       UUID NOT NULL REFERENCES roles(id),
  invited_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, workspace_id)
);
```

### 15.4 Sessions Table (Backup/Audit — primary store is Redis)

```sql
-- Sessions are stored in Redis for performance.
-- This table is for audit trail and session listing.
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id),
  ip_address    INET,
  user_agent    TEXT,
  device_info   JSONB,                               -- parsed device details
  mfa_verified  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ,
  revoke_reason VARCHAR(50)                          -- 'user', 'admin', 'password_change', 'security'
);

CREATE INDEX idx_sessions_user ON sessions(user_id) WHERE revoked_at IS NULL;
```

### 15.5 OAuth Providers Table

```sql
CREATE TABLE user_oauth_providers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider          VARCHAR(20) NOT NULL,             -- 'google', 'github'
  provider_user_id  VARCHAR(255) NOT NULL,
  email             VARCHAR(255) NOT NULL,
  access_token      TEXT,                             -- Encrypted
  refresh_token     TEXT,                             -- Encrypted
  token_expires_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, provider),
  UNIQUE (provider, provider_user_id)
);
```

### 15.6 Password Reset Tokens

```sql
CREATE TABLE password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,           -- SHA-256 of the raw token
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash)
  WHERE used_at IS NULL;
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);
```

### 15.7 API Keys Table

```sql
CREATE TABLE api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  key_prefix    VARCHAR(20) NOT NULL,
  key_hash      VARCHAR(64) NOT NULL UNIQUE,
  scopes        TEXT[] NOT NULL DEFAULT '{}',
  expires_at    TIMESTAMPTZ,
  last_used_at  TIMESTAMPTZ,
  last_used_ip  INET,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_workspace ON api_keys(workspace_id) WHERE revoked_at IS NULL;
```

---

## 16. Security Checklist

### 16.1 Authentication Security

| Control                                                 | Status | Notes                                        |
| ------------------------------------------------------- | :----: | -------------------------------------------- |
| Passwords hashed with argon2id (memory-hard)            |   ✅   | OWASP recommended; 64MB memory, 3 iterations |
| Password strength enforcement (min 8, complexity, HIBP) |   ✅   | Top 100k breached passwords blocked          |
| JWT access tokens short-lived (15 min)                  |   ✅   | ES256 signing; not stored in localStorage    |
| Refresh token rotation (one-time use)                   |   ✅   | Token reuse detection → revoke all sessions  |
| Refresh token in HttpOnly cookie                        |   ✅   | Not accessible to JavaScript                 |
| OAuth state parameter (CSRF)                            |   ✅   | Stored in Redis, 10-min TTL                  |
| Email verification required                             |   ✅   | Account locked until verified                |
| MFA (TOTP) optional per user                            |   ✅   | Backup codes for recovery                    |
| Rate limiting on auth endpoints                         |   ✅   | Per-IP, per-email, per-key                   |
| Brute force protection (lockout)                        |   ✅   | 5 failures → 15-min block; progressive       |
| Password reset tokens single-use                        |   ✅   | Hashed in DB, 1-hour expiry                  |
| Magic link tokens single-use                            |   ✅   | Stored in Redis, 15-min expiry               |
| Session revocation (single + all)                       |   ✅   | Immediate via Redis delete                   |
| Secure cookie flags (HttpOnly, Secure, SameSite)        |   ✅   | Path-scoped to /api/auth                     |
| No secrets in code or environment                       |   ✅   | Cloudflare Secrets / Vault                   |

### 16.2 Authorization Security

| Control                                    | Status | Notes                                 |
| ------------------------------------------ | :----: | ------------------------------------- |
| RBAC model (Owner/Admin/Member/Guest)      |   ✅   | Database-driven, not hardcoded        |
| Permission checks centralized (middleware) |   ✅   | `requirePermission()` guard           |
| Workspace isolation (all queries scoped)   |   ✅   | `workspaceId` from JWT required       |
| Guest access scoped to specific resources  |   ✅   | `guest_scopes` table                  |
| Guest access time-limited                  |   ✅   | `expires_at` on guest scopes          |
| Owner cannot be demoted                    |   ✅   | Role change API rejects Owner changes |
| Audit logging for all auth events          |   ✅   | Append-only, immutable table          |
| API keys scoped per workspace              |   ✅   | Workspace + role from key             |
| API key rate limiting                      |   ✅   | 1,000 req/min per key                 |

### 16.3 Infrastructure Security

| Control                                       | Status | Notes                                         |
| --------------------------------------------- | :----: | --------------------------------------------- |
| TLS 1.3 for all connections                   |   ✅   | Enforced at Cloudflare edge                   |
| HSTS header (2 year, includeSubDomains)       |   ✅   | Preload ready                                 |
| CORS origin allowlist                         |   ✅   | Strict; credentials only from trusted origins |
| Security headers (CSP, X-Frame-Options, etc.) |   ✅   | All standard headers set                      |
| DDoS protection (Cloudflare)                  |   ✅   | Built-in                                      |
| Database encryption at rest (AES-256)         |   ✅   | Cloud provider managed                        |
| No direct DB access from internet             |   ✅   | Private network only                          |
| Dependency vulnerability scanning             |   ✅   | Dependabot + Snyk in CI                       |
| Secret scanning in CI                         |   ✅   | truffleHog + gitleaks                         |

---

## 17. Quick Reference Cheat Sheet

### Auth Endpoints

| Method   | Endpoint                             | Auth Required | Description                         |
| -------- | ------------------------------------ | :-----------: | ----------------------------------- |
| `POST`   | `/api/auth/register`                 |      ❌       | Register with email/password        |
| `POST`   | `/api/auth/login`                    |      ❌       | Login with email/password           |
| `POST`   | `/api/auth/logout`                   |      ✅       | Revoke session, clear cookie        |
| `POST`   | `/api/auth/refresh`                  |    Cookie     | Rotate refresh token                |
| `GET`    | `/api/auth/me`                       |      ✅       | Get current user profile            |
| `POST`   | `/api/auth/verify-email`             |      ❌       | Verify email with token             |
| `POST`   | `/api/auth/forgot-password`          |      ❌       | Request password reset              |
| `POST`   | `/api/auth/reset-password`           |      ❌       | Reset password with token           |
| `GET`    | `/api/auth/oauth/:provider`          |      ❌       | Redirect to OAuth provider          |
| `GET`    | `/api/auth/oauth/:provider/callback` |      ❌       | OAuth callback handler              |
| `POST`   | `/api/auth/magic-link`               |      ❌       | Request magic link email            |
| `GET`    | `/api/auth/magic-link/verify`        |      ❌       | Verify magic link token             |
| `POST`   | `/api/auth/mfa/setup`                |      ✅       | Generate TOTP secret + QR           |
| `POST`   | `/api/auth/mfa/confirm`              |      ✅       | Activate MFA with code              |
| `POST`   | `/api/auth/mfa/verify`               |      ✅       | Verify TOTP during login            |
| `POST`   | `/api/auth/mfa/disable`              |      ✅       | Disable MFA (requires current code) |
| `GET`    | `/api/auth/sessions`                 |      ✅       | List active sessions                |
| `DELETE` | `/api/auth/sessions/:id`             |      ✅       | Revoke specific session             |
| `DELETE` | `/api/auth/sessions`                 |      ✅       | Revoke all sessions                 |
| `POST`   | `/api/auth/api-keys`                 |      ✅       | Create API key                      |
| `GET`    | `/api/auth/api-keys`                 |      ✅       | List API keys                       |
| `DELETE` | `/api/auth/api-keys/:id`             |      ✅       | Revoke API key                      |

### Auth Headers

| Header                        | Usage                                               |
| ----------------------------- | --------------------------------------------------- |
| `Authorization: Bearer <jwt>` | JWT access token (15-min TTL)                       |
| `X-API-Key: srio_live_...`    | API key authentication                              |
| `X-Request-ID: <uuid>`        | Request tracing (auto-generated if absent)          |
| `X-RateLimit-Limit`           | Rate limit ceiling (response header)                |
| `X-RateLimit-Remaining`       | Remaining requests (response header)                |
| `X-RateLimit-Reset`           | Unix timestamp when window resets (response header) |

### Token Lifetimes

| Token                           | Lifetime     | Storage           | Notes                                          |
| ------------------------------- | ------------ | ----------------- | ---------------------------------------------- |
| **Access Token**                | 15 minutes   | JavaScript memory | Signed JWT (ES256); NOT in localStorage/cookie |
| **Refresh Token**               | 7 days       | HttpOnly cookie   | Opaque; rotated on each use                    |
| **Refresh Token (Remember Me)** | 30 days      | HttpOnly cookie   | Opaque; rotated on each use                    |
| **Email Verification**          | 24 hours     | PostgreSQL        | SHA-256 hash stored; single-use                |
| **Password Reset**              | 1 hour       | PostgreSQL        | SHA-256 hash stored; single-use                |
| **Magic Link**                  | 15 minutes   | Redis             | SHA-256 hash stored; single-use                |
| **MFA Pending Token**           | 5 minutes    | Redis             | Temporary; until TOTP verified                 |
| **OAuth State**                 | 10 minutes   | Redis             | CSRF protection; single-use                    |
| **API Key**                     | Configurable | PostgreSQL        | Never expires (default), or 30/90/365 days     |

### Error Codes

| Code                       | HTTP Status | Description                                  |
| -------------------------- | :---------: | -------------------------------------------- |
| `UNAUTHENTICATED`          |     401     | No credentials provided                      |
| `TOKEN_EXPIRED`            |     401     | Access token expired (client should refresh) |
| `SESSION_REVOKED`          |     401     | Session was revoked                          |
| `INVALID_CREDENTIALS`      |     401     | Wrong email or password                      |
| `EMAIL_NOT_VERIFIED`       |     403     | Email verification required                  |
| `MFA_REQUIRED`             |     400     | MFA setup/verification needed                |
| `MFA_INVALID_CODE`         |     400     | TOTP code incorrect                          |
| `INSUFFICIENT_PERMISSIONS` |     403     | User lacks required role/permission          |
| `NOT_MEMBER`               |     403     | User is not a member of this workspace       |
| `OUT_OF_SCOPE`             |     403     | Guest does not have access to this resource  |
| `RATE_LIMITED`             |     429     | Too many requests                            |
| `INVALID_API_KEY`          |     401     | API key invalid or revoked                   |
| `CSRF_VIOLATION`           |     403     | CSRF check failed                            |
| `ACCOUNT_LOCKED`           |     423     | Too many failed login attempts               |
| `KEY_LIMIT_REACHED`        |     400     | Max API keys reached for workspace           |

---

## 18. Migration & Post-MVP Path

### 18.1 Phase 2 Additions (Months 7–12)

| Feature                 | Architecture Impact                                | Migration Path                                             |
| ----------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| **SSO/SAML 2.0**        | New `saml_providers` table; new auth resolver type | Add SAML strategy alongside existing; same RBAC model      |
| **SCIM 2.0**            | New sync worker; directory mappings table          | Abstract `IdentityProvider` interface; MVP already uses it |
| **Custom Roles**        | `roles.is_system = false`; permission builder UI   | DB-driven roles already; add UI for permission config      |
| **IP Allowlists**       | New `ip_allowlists` table; middleware check        | Add check in auth resolver after role verification         |
| **Device Trust**        | New `trusted_devices` table; step-up auth          | Add device fingerprint; challenge untrusted devices        |
| **Audit Log Export**    | SIEM connectors (Splunk, Datadog)                  | Export API on existing `audit_log` table                   |
| **Workspace Analytics** | Materialized views on audit + activity             | Read replicas + aggregation jobs                           |

### 18.2 Phase 3 Additions (Months 13–18)

| Feature                     | Notes                                                 |
| --------------------------- | ----------------------------------------------------- |
| **OAuth App Provider**      | Sprintio becomes an OAuth provider for 3rd-party apps |
| **OIDC Provider**           | Standard OIDC endpoints for enterprise SSO            |
| **ABAC (Attribute-Based)**  | Layer on top of RBAC; policy engine (e.g., Cedar)     |
| **Field-Level Permissions** | Extend permission model to field granularity          |
| **Legal Hold**              | Freeze user data; immune to deletion                  |
| **E-Discovery Export**      | Export held data in reviewable format                 |

---

## Appendix A: Environment Variables

| Variable               | Description                  | Example                                     |
| ---------------------- | ---------------------------- | ------------------------------------------- |
| `JWT_PRIVATE_KEY`      | ES256 private key (PEM)      | `-----BEGIN EC PRIVATE KEY-----...`         |
| `JWT_PUBLIC_KEY`       | ES256 public key (PEM)       | `-----BEGIN PUBLIC KEY-----...`             |
| `JWT_KEY_ID`           | Key ID for header `kid`      | `key-2024-01`                               |
| `DATABASE_URL`         | PostgreSQL connection string | `postgresql://user:pass@host:5432/sprintio` |
| `REDIS_URL`            | Redis connection string      | `redis://:pass@host:6379`                   |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID       | `xxx.apps.googleusercontent.com`            |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret   | `GOCSPX-xxx`                                |
| `GITHUB_CLIENT_ID`     | GitHub OAuth client ID       | `Iv1.xxx`                                   |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret   | `xxx`                                       |
| `APP_URL`              | Frontend app URL             | `https://app.sprintio.io`                   |
| `API_URL`              | Backend API URL              | `https://api.sprintio.io`                   |
| `MFA_ENCRYPTION_KEY`   | AES-256 key for MFA secrets  | 64-char hex string                          |

## Appendix B: Dependencies

| Package                   | Purpose                             | Version |
| ------------------------- | ----------------------------------- | ------- |
| `jose`                    | JWT creation & verification (ES256) | ^5.x    |
| `argon2`                  | Password hashing (argon2id)         | ^0.31.x |
| `otplib`                  | TOTP generation & verification      | ^12.x   |
| `ioredis`                 | Redis client                        | ^5.x    |
| `zod`                     | Input validation                    | ^3.x    |
| `passport`                | OAuth strategy framework            | ^0.7.x  |
| `passport-google-oauth20` | Google OAuth strategy               | ^2.x    |
| `passport-github2`        | GitHub OAuth strategy               | ^0.1.x  |
| `qrcode`                  | QR code generation for MFA          | ^1.x    |

---

**Document Status:** Finalized  
**Next Review:** 2026-07-15  
**Owner:** Engineering  
**Approvers:** [whom it may concern]
