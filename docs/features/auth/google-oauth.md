# Google OAuth

## Overview

Google OAuth enables passwordless sign-in and sign-up in Sprintio using a user's Google account. It follows the OAuth 2.0 Authorization Code flow with PKCE-ready state management, providing a secure and familiar authentication experience. Users can link Google as an additional login method, and the system handles both new registrations and existing account merging seamlessly.

## Architecture

### Flow Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│              │     │              │     │              │     │              │
│   Frontend   │────▶│   Backend    │────▶│    Google    │────▶│   Backend    │
│   (React)    │     │  (Express)   │     │  OAuth 2.0   │     │  (Express)   │
│              │◀────│              │◀────│              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
     1. Click             2. Generate          3. User            4. Exchange
        "Google"             state +              consents             code for
        button               redirect                                   tokens
                                                                      │
                                           7. Redirect to      5. Fetch user
                                              frontend           info from
                                              with cookies       Google API
                                                                      │
                                           6. Create/update     8. Create
                                              user + session      session +
                                                                      tokens
```

### Components

| Component               | File                                                      | Responsibility                                             |
| ----------------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| Google OAuth Controller | `apps/backend/src/modules/auth/google-auth.controller.ts` | Handles OAuth endpoints (initiate, callback, link, unlink) |
| Google OAuth Service    | `apps/backend/src/modules/auth/google-auth.service.ts`    | Business logic for user lookup, creation, account linking  |
| Google OAuth Routes     | `apps/backend/src/modules/auth/google-auth.routes.ts`     | Route definitions for `/api/auth/google/*`                 |
| Auth Middleware         | `apps/backend/src/middleware/auth.ts`                     | Validates access tokens for protected routes               |
| User Schema             | `apps/backend/src/db/schema/users.ts`                     | User table with `google_id` and nullable `password_hash`   |
| OAuth Accounts Schema   | `apps/backend/src/db/schema/oauth-accounts.ts`            | Stores OAuth provider account links                        |
| Session Utilities       | `apps/backend/src/utils/cookie.ts`                        | Cookie management for auth tokens and CSRF state           |

### Data Flow

1. **Frontend → Backend**: User clicks "Continue with Google" button
2. **Backend → Google**: Backend generates CSRF state token, stores in HttpOnly cookie, redirects to Google's consent page
3. **User → Google**: User authenticates with Google and grants consent
4. **Google → Backend**: Google redirects back with authorization code and state parameter
5. **Backend → Google**: Backend validates state, exchanges code for access/ID tokens via Google's token endpoint
6. **Google → Backend**: Google returns user profile (email, name, avatar, Google ID)
7. **Backend → Database**: Backend creates or links user account, creates session, generates token pair
8. **Backend → Frontend**: Backend sets HttpOnly auth cookies, redirects to frontend callback URL

## Setup Guide

### Google Cloud Console

Step-by-step guide to set up Google OAuth credentials:

1. **Go to [Google Cloud Console](https://console.cloud.google.com)**
2. **Create or select a project**
   - Click the project dropdown at the top
   - Click "New Project" and name it (e.g., "Sprintio")
   - Click "Create"
3. **Enable APIs**
   - Navigate to "APIs & Services" > "Library"
   - Search for and enable "Google People API" (recommended) or "Google+ API" (legacy)
   - Click "Enable"
4. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" > "OAuth consent screen"
   - Select "External" user type (for production) or "Internal" (for Google Workspace)
   - Fill in required fields:
     - App name: "Sprintio"
     - User support email: your email
     - Developer contact email: your email
   - Click "Save and Continue"
   - Add scopes: `email`, `profile`, `openid`
   - Click "Save and Continue"
   - Add test users if in testing mode
5. **Create OAuth 2.0 Client ID**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Name: "Sprintio Web Client"
   - Authorized redirect URIs:
     - `http://localhost:3001/api/auth/google/callback` (development)
     - `https://your-production-domain.com/api/auth/google/callback` (production)
   - Click "Create"
6. **Note the credentials**
   - Copy the **Client ID** (format: `xxx.apps.googleusercontent.com`)
   - Copy the **Client Secret** (format: `GOCSPX-xxx`)
   - Store both securely; never commit to version control

### Environment Variables

Add the following to your `.env` file:

| Variable               | Description                          | Required | Example                                          |
| ---------------------- | ------------------------------------ | -------- | ------------------------------------------------ |
| `GOOGLE_CLIENT_ID`     | Google OAuth 2.0 Client ID           | Yes      | `123456789-abc.apps.googleusercontent.com`       |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret       | Yes      | `GOCSPX-abc123def456`                            |
| `GOOGLE_REDIRECT_URI`  | Callback URL matching Google Console | Yes      | `http://localhost:3001/api/auth/google/callback` |

These variables are validated at startup using Zod in `apps/backend/src/config/env.ts`. The server will refuse to start if they are missing or malformed.

### Frontend Setup

No special frontend setup is required. The Google OAuth flow is redirect-based:

1. Frontend renders "Continue with Google" button
2. Button triggers a full-page redirect to `GET /api/auth/google`
3. After Google consent, the user is redirected back to the frontend callback page
4. Frontend callback page detects success/failure via query parameters

The redirect-based approach means:

- No Google SDK or JavaScript library needed on the frontend
- No client-side token handling for Google tokens
- Works in all browsers without popup blockers or cookie issues
- CSP (Content Security Policy) headers don't need modification

## API Reference

### Endpoints

#### GET /api/auth/google

Initiates the Google OAuth flow by redirecting the user to Google's consent page.

**Auth required**: No

**Query params**: None

**Behavior**:

1. Generates a CSRF state token using `crypto.randomUUID()`
2. Stores state in an HttpOnly, SameSite=Lax cookie with 10-minute expiry
3. If user is already authenticated, stores user ID in state for account linking
4. Redirects to `https://accounts.google.com/o/oauth2/v2/auth` with:
   - `client_id`: Your Google Client ID
   - `redirect_uri`: Your configured redirect URI
   - `response_type`: `code`
   - `scope`: `openid email profile`
   - `state`: CSRF token
   - `access_type`: `offline` (enables refresh token)
   - `prompt`: `consent` (ensures consistent consent screen)

**Response**: HTTP 302 redirect to Google's consent page

**State cookie format**:

```
google_oauth_state=<uuid>; HttpOnly; SameSite=Lax; Max-Age=600
```

---

#### GET /api/auth/google/callback

Handles the OAuth callback from Google after user consent.

**Auth required**: No

**Query params**:

| Param   | Type   | Description                           |
| ------- | ------ | ------------------------------------- |
| `code`  | string | Authorization code from Google        |
| `state` | string | CSRF token to validate against cookie |

**Behavior**:

1. Validates `state` parameter matches the cookie value (CSRF protection)
2. Exchanges `code` for access/ID tokens via Google's token endpoint
3. Fetches user profile from Google's People API using the access token
4. Extracts `email`, `name`, `picture`, and `sub` (Google ID) from profile
5. **New user**: Creates user account (no password, email verified, with avatar)
6. **Existing user** (email match): Links Google account to existing user
7. **Linking mode**: If user was authenticated when initiating, links to that user
8. Creates OAuth account record in `oauth_accounts` table
9. Creates session and token pair (same as email login)
10. Sets `access_token` and `refresh_token` HttpOnly cookies
11. Clears the state cookie
12. Redirects to frontend callback URL

**Success redirect**: `GET /auth/callback?success=true`

**Error redirect**: `GET /auth/callback?error=<encoded_message>`

**Error scenarios**:

| Error                    | Cause                                         |
| ------------------------ | --------------------------------------------- |
| `state_mismatch`         | CSRF token validation failed                  |
| `code_exchange_failed`   | Google rejected the authorization code        |
| `email_required`         | Google account has no email (rare)            |
| `email_conflict`         | Email belongs to a different account          |
| `account_already_linked` | Google account already linked to another user |

---

#### POST /api/auth/google/link

Link a Google account to the currently authenticated user.

**Auth required**: Yes (access token via HttpOnly cookie)

**Request Body**:

```json
{
  "code": "authorization_code_from_google"
}
```

| Field  | Type   | Required | Description                                   |
| ------ | ------ | -------- | --------------------------------------------- |
| `code` | string | Yes      | Authorization code from Google OAuth callback |

**Behavior**:

1. Validates user is authenticated
2. Exchanges code for Google tokens
3. Fetches Google user profile
4. Checks that the Google account isn't already linked to another user
5. Creates OAuth account record linking Google to authenticated user
6. Updates user's `google_id` and `avatar` if not set

**Success Response (200)**:

```json
{
  "data": {
    "message": "Google account linked successfully"
  }
}
```

**Error Responses**:

| Status | Code           | Message                                                        |
| ------ | -------------- | -------------------------------------------------------------- |
| 400    | ALREADY_LINKED | "This Google account is already linked to another user"        |
| 400    | EMAIL_CONFLICT | "This Google account email conflicts with an existing account" |
| 401    | UNAUTHORIZED   | "Authentication required"                                      |
| 500    | INTERNAL_ERROR | "Failed to link Google account"                                |

---

#### POST /api/auth/google/unlink

Unlink Google account from the currently authenticated user.

**Auth required**: Yes (access token via HttpOnly cookie)

**Request Body**: None

**Behavior**:

1. Validates user is authenticated
2. Checks if user has a password set (required to unlink if it's the only login method)
3. Checks if user has other linked OAuth providers
4. Prevents unlinking if it would leave the user with no way to log in
5. Removes the OAuth account record
6. Clears `google_id` from user record

**Success Response (200)**:

```json
{
  "data": {
    "message": "Google account unlinked successfully"
  }
}
```

**Error Responses**:

| Status | Code              | Message                                                                      |
| ------ | ----------------- | ---------------------------------------------------------------------------- |
| 400    | ONLY_LOGIN_METHOD | "Cannot unlink Google — it is your only login method. Set a password first." |
| 401    | UNAUTHORIZED      | "Authentication required"                                                    |
| 500    | INTERNAL_ERROR    | "Failed to unlink Google account"                                            |

---

#### GET /api/auth/google/providers

Get a list of linked OAuth providers for the authenticated user.

**Auth required**: Yes (access token via HttpOnly cookie)

**Query params**: None

**Success Response (200)**:

```json
{
  "data": {
    "providers": [
      {
        "provider": "google",
        "linkedAt": "2026-07-19T10:30:00.000Z"
      }
    ]
  }
}
```

**Error Responses**:

| Status | Code         | Message                   |
| ------ | ------------ | ------------------------- |
| 401    | UNAUTHORIZED | "Authentication required" |

## OAuth Flow

### New User (Sign up with Google)

```
1. User clicks "Continue with Google" on login/register page
2. Frontend navigates to GET /api/auth/google
3. Backend generates state token, stores in HttpOnly cookie
4. Backend redirects to Google consent page
5. User signs in with Google and grants consent
6. Google redirects to GET /api/auth/google/callback?code=xxx&state=yyy
7. Backend validates state against cookie
8. Backend exchanges code for tokens via Google's token endpoint
9. Backend fetches user profile from Google People API
10. Backend creates new user:
    - email: from Google profile
    - name: from Google profile
    - passwordHash: null (no password)
    - emailVerified: true (Google verifies emails)
    - avatar: Google profile picture URL
    - googleId: Google's unique user ID (sub field)
11. Backend creates oauth_accounts record (provider: "google")
12. Backend creates session record
13. Backend generates access/refresh token pair (ES256 JWTs)
14. Backend sets HttpOnly cookies for both tokens
15. Backend redirects to /auth/callback?success=true
16. Frontend callback page detects success=true
17. Frontend invalidates auth query cache
18. Frontend navigates to /dashboard
```

### Existing User (First time Google login)

Same as new user flow steps 1–9, then:

```
10. Backend finds existing user by email
11. Backend updates user record:
    - googleId: Google's unique user ID
    - avatar: Google profile picture URL
12. Backend creates oauth_accounts record
13. Backend creates session and token pair
14. Backend sets cookies and redirects to frontend
```

This allows users who registered with email/password to also log in with Google using the same email address.

### Account Linking (Logged-in user connects Google)

```
1. User navigates to Settings → Connected Accounts
2. User clicks "Connect Google"
3. Frontend redirects to GET /api/auth/google
4. Backend detects user is authenticated (from access token cookie)
5. Backend stores user ID in the state parameter (encoded)
6. Backend redirects to Google consent page
7. User consents on Google
8. Google redirects to callback with code + state
9. Backend extracts user ID from state (linking mode)
10. Backend validates linking intent matches authenticated user
11. Backend exchanges code, fetches profile, creates OAuth account link
12. Backend redirects to settings page with success message
```

### Flow Comparison

| Scenario                           | Starting State    | User Creation       | Google ID Set | Email Verified |
| ---------------------------------- | ----------------- | ------------------- | ------------- | -------------- |
| New user via Google                | Not authenticated | Yes                 | Yes           | Yes (auto)     |
| Existing user + first Google login | Not authenticated | No (finds by email) | Yes           | Already set    |
| Account linking                    | Authenticated     | No                  | Yes           | Already set    |

## Database Schema

### Users Table Changes

The `users` table requires modifications to support OAuth:

```sql
-- Existing column becomes nullable (OAuth users have no password)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- New columns for Google OAuth
ALTER TABLE users ADD COLUMN google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- Index for Google ID lookups
CREATE INDEX idx_users_google_id ON users (google_id) WHERE google_id IS NOT NULL;
```

**Drizzle schema change** (`apps/backend/src/db/schema/users.ts`):

```typescript
import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'member', 'guest']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  passwordHash: text('password_hash'), // Now nullable for OAuth users
  avatar: text('avatar'),
  avatarUrl: text('avatar_url'), // Google profile picture
  googleId: varchar('google_id', { length: 255 }).unique(), // Google's sub ID
  role: userRoleEnum('role').notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### OAuth Accounts Table (New)

Stores linked OAuth provider accounts for each user:

```sql
CREATE TABLE oauth_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider      VARCHAR(50) NOT NULL,           -- e.g., "google"
  provider_account_id VARCHAR(255) NOT NULL,    -- Google's user ID (sub)
  access_token  TEXT,                           -- OAuth access token (nullable)
  refresh_token TEXT,                           -- OAuth refresh token (nullable)
  expires_at    TIMESTAMP,                      -- Token expiry (nullable)
  scope         TEXT,                           -- Granted scopes (nullable)
  token_type    VARCHAR(50),                    -- Token type (nullable)
  created_at    TIMESTAMP DEFAULT NOW()         -- When linked
);

-- Unique constraint: one account per provider per user
CREATE UNIQUE INDEX idx_oauth_accounts_user_provider
  ON oauth_accounts (user_id, provider);

-- Unique constraint: one user per provider account
CREATE UNIQUE INDEX idx_oauth_accounts_provider_account
  ON oauth_accounts (provider, provider_account_id);
```

**Drizzle schema** (`apps/backend/src/db/schema/oauth-accounts.ts`):

```typescript
import { pgTable, uuid, varchar, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull(),
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
    scope: text('scope'),
    tokenType: varchar('token_type', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_oauth_accounts_user_provider').on(table.userId, table.provider),
    uniqueIndex('idx_oauth_accounts_provider_account').on(table.provider, table.providerAccountId),
  ],
);

export type OAuthAccount = typeof oauthAccounts.$inferSelect;
```

## Security Considerations

### CSRF Protection

- **State parameter** is generated using `crypto.randomUUID()` (cryptographically secure)
- Stored in an **HttpOnly cookie** with 10-minute expiry (`Max-Age=600`)
- **SameSite=Lax** prevents CSRF on cross-origin POST requests
- Validated on every callback — mismatch results in immediate rejection
- State cookie is cleared after successful validation

### Token Storage

| Token                | Storage                             | Lifetime                    |
| -------------------- | ----------------------------------- | --------------------------- |
| Google access token  | `oauth_accounts.access_token` (DB)  | ~1 hour (managed by Google) |
| Google refresh token | `oauth_accounts.refresh_token` (DB) | Long-lived (until revoked)  |
| App access token     | HttpOnly cookie (`access_token`)    | 15 minutes                  |
| App refresh token    | HttpOnly cookie (`refresh_token`)   | 7 days                      |

- All app tokens use **ES256 JWTs** with asymmetric keys (same as email login)
- Refresh tokens are **SHA-256 hashed** before DB storage
- Google tokens are stored for potential API integrations (calendar, etc.)

### Account Safety

- **OAuth-only users** (no password) cannot unlink Google if it's their only login method
- The unlink endpoint checks for:
  - Presence of a `password_hash` (can unlink if password exists)
  - Other linked OAuth providers (can unlink if another provider exists)
- Users with both email/password and Google can freely link/unlink
- **Email verification is auto-completed** for Google users — Google verifies email ownership

### Rate Limiting

- Google OAuth callback endpoint is rate-limited to prevent authorization code replay
- Standard auth rate limits apply (20 requests per 15 minutes per IP)
- Token exchange with Google is subject to Google's own rate limits

### Additional Security Measures

- Authorization codes are single-use (exchanged once, immediately)
- Tokens are exchanged server-side (never exposed to frontend)
- No sensitive data is stored in localStorage or sessionStorage
- All cookies use `Secure` flag in production (controlled by `COOKIE_SECURE` env var)

## User Experience

### Login Page

The login page includes a Google sign-in option alongside the email/password form:

```
┌─────────────────────────────┐
│                             │
│   Sign in to Sprintio       │
│                             │
│   ┌─────────────────────┐   │
│   │  Continue with Google│   │
│   │  [G] icon            │   │
│   └─────────────────────┘   │
│                             │
│   ── Or continue with ──    │
│                             │
│   Email: [_____________]    │
│   Password: [___________]   │
│                             │
│   [Sign In]                 │
│                             │
│   Don't have an account?    │
│   Sign up                   │
│                             │
└─────────────────────────────┘
```

- Google button appears **above** the email/password form
- Divider text: "Or continue with email"
- Google button uses official Google branding (colored G logo)
- Full-width button, prominent placement

### Register Page

Same Google option available as an alternative to form completion:

```
┌─────────────────────────────┐
│                             │
│   Create your account       │
│                             │
│   ┌─────────────────────┐   │
│   │  Continue with Google│   │
│   │  [G] icon            │   │
│   └─────────────────────┘   │
│                             │
│   ── Or register with ──    │
│                             │
│   Name: [_______________]   │
│   Email: [_____________]    │
│   Password: [___________]   │
│   Confirm: [___________]    │
│                             │
│   [Create Account]          │
│                             │
└─────────────────────────────┘
```

### Settings / Connected Accounts

The settings page displays linked OAuth providers:

```
┌─────────────────────────────┐
│   Connected Accounts        │
│                             │
│   ┌─────────────────────┐   │
│   │ [G] Google          │   │
│   │ john@gmail.com      │   │
│   │ Linked Jul 19, 2026 │   │
│   │ [Disconnect]        │   │
│   └─────────────────────┘   │
│                             │
│   ┌─────────────────────┐   │
│   │ [+] Connect GitHub  │   │
│   └─────────────────────┘   │
│                             │
└─────────────────────────────┘
```

- Shows each linked provider with email and link date
- Disconnect button with confirmation dialog
- Confirmation warns if it's the last login method
- Connect button for additional providers

### Error Handling

| Scenario                                 | User Experience                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| User cancels Google consent              | Redirected back with `error=access_denied`, toast: "Google sign-in was cancelled"      |
| Email already exists (different account) | Toast: "An account with this email already exists. Please sign in with your password." |
| Network error during OAuth               | Standard error page with retry option                                                  |
| CSRF validation failure                  | Toast: "Security validation failed. Please try again."                                 |
| Google account already linked            | Toast: "This Google account is already linked to another user."                        |

### Loading States

- **Initiating OAuth**: Button shows spinner, text changes to "Connecting..."
- **Callback page**: Full-page loading state with "Completing sign-in..." message
- **Linking account**: Button shows spinner, form disabled

## Troubleshooting

### Common Issues

#### 1. `redirect_uri_mismatch`

**Error**: "The redirect URI in the request does not match the ones authorized for the OAuth client."

**Cause**: The `GOOGLE_REDIRECT_URI` environment variable doesn't exactly match the redirect URI configured in Google Cloud Console.

**Fix**:

- Verify `GOOGLE_REDIRECT_URI` in `.env` matches exactly (including protocol, port, path)
- Common mistake: trailing slash (`/callback` vs `/callback/`)
- Must be an exact match — no wildcards
- Development: `http://localhost:3001/api/auth/google/callback`
- Production: `https://yourdomain.com/api/auth/google/callback`

#### 2. `access_denied`

**Error**: User sees "Access denied" from Google.

**Cause**: User clicked "Cancel" or denied consent on Google's consent screen.

**Fix**: This is normal user behavior. No action needed — the user is redirected back with an error message.

#### 3. `invalid_grant`

**Error**: "The authorization code has expired or has already been used."

**Cause**: Authorization codes are valid for ~10 minutes and single-use. This happens if:

- Code expired (user took too long to consent)
- Code was reused (network retry, browser refresh)

**Fix**: User must restart the OAuth flow by clicking "Continue with Google" again.

#### 4. Account Not Linking

**Symptoms**: Google login creates a new account instead of linking to existing.

**Cause**: Email addresses don't match between the Google account and existing Sprintio account.

**Fix**:

- Verify the email on the Google account matches the existing account
- Check for typos or different email aliases
- Users may have multiple Google accounts — ensure they're using the correct one

#### 5. `invalid_client`

**Error**: "The OAuth client was not found."

**Cause**: `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is incorrect or the OAuth client was deleted.

**Fix**:

- Verify credentials in Google Cloud Console > APIs & Services > Credentials
- Ensure the OAuth client hasn't been deleted or disabled
- Check for copy-paste errors (extra spaces, missing characters)

### Development Tips

1. **Local development redirect URI**: Use `http://localhost:3001/api/auth/google/callback`
   - Google allows `localhost` without HTTPS for development
   - No need to use `http://127.0.0.1` — `localhost` works fine

2. **Testing with real accounts**: Google OAuth requires a real Google account
   - Service accounts won't work for user-facing OAuth
   - Create a test Google account for development

3. **OAuth consent screen**: In testing mode, only explicitly added test users can authenticate
   - Add your development/test Google accounts to the test users list
   - Or publish the app (requires verification for external users)

4. **Token refresh**: Google refresh tokens can be revoked by the user at any time
   - Handle gracefully in your app — detect and prompt re-authentication
   - Monitor for `invalid_grant` errors on token refresh

5. **Production checklist**:
   - [ ] Set `COOKIE_SECURE=true` in production
   - [ ] Use HTTPS for production redirect URI
   - [ ] Add production domain to authorized redirect URIs in Google Console
   - [ ] Complete OAuth consent screen verification for external users
   - [ ] Set up monitoring for OAuth-related errors

## Files

| File                                                      | Purpose                           |
| --------------------------------------------------------- | --------------------------------- |
| `apps/backend/src/modules/auth/google-auth.controller.ts` | OAuth endpoint handlers           |
| `apps/backend/src/modules/auth/google-auth.service.ts`    | OAuth business logic              |
| `apps/backend/src/modules/auth/google-auth.routes.ts`     | Route definitions                 |
| `apps/backend/src/modules/auth/google-auth.validation.ts` | Zod schemas for OAuth inputs      |
| `apps/backend/src/db/schema/oauth-accounts.ts`            | OAuth accounts table schema       |
| `apps/backend/src/db/schema/users.ts`                     | Users table (with Google columns) |
| `apps/backend/src/middleware/auth.ts`                     | Authentication middleware         |
| `apps/backend/src/utils/cookie.ts`                        | Cookie management utilities       |
| `apps/backend/src/utils/jwt.ts`                           | JWT token generation              |
| `apps/backend/src/config/env.ts`                          | Environment variable validation   |
| `apps/web/src/routes/login.tsx`                           | Login page with Google button     |
| `apps/web/src/routes/register.tsx`                        | Register page with Google button  |
| `apps/web/src/routes/auth.callback.tsx`                   | OAuth callback handling page      |
| `apps/web/src/routes/settings.connected-accounts.tsx`     | Connected accounts settings       |
| `apps/web/src/hooks/use-google-auth.ts`                   | React Query hook for OAuth        |
| `apps/web/src/components/google-sign-in-button.tsx`       | Google sign-in button component   |
