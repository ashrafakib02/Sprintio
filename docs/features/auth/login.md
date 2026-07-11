# Email Login

## Overview

Users can sign in with their email and password. On success, HttpOnly cookies are set for access and refresh tokens.

## API Endpoint

```
POST /api/auth/login
```

### Rate Limit

20 requests per 15 minutes per IP (auth rate limiter).

### Request Body

```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

| Field      | Type   | Required | Rules               |
| ---------- | ------ | -------- | ------------------- |
| `email`    | string | Yes      | Valid email format  |
| `password` | string | Yes      | Minimum 1 character |

### Success Response (200)

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "emailVerified": false
    }
  }
}
```

Sets HttpOnly cookies: `access_token` (15min) and `refresh_token` (7d).

### Error Responses

| Status | Code              | Message                       |
| ------ | ----------------- | ----------------------------- |
| 400    | VALIDATION_ERROR  | Field-level validation errors |
| 401    | UNAUTHORIZED      | "Invalid email or password"   |
| 429    | TOO_MANY_REQUESTS | Rate limit exceeded           |
| 500    | INTERNAL_ERROR    | "Login failed"                |

## Backend Flow

1. **Validation** — Zod schema in `auth.validation.ts` validates email and password
2. **User lookup** — Queries `users` table by email
3. **Password verification** — bcrypt compare with stored hash
4. **Session creation** — Creates session record with user-agent and IP address
5. **Token generation** — HS256 JWT access token (15min) + refresh token (7d)
6. **Refresh token storage** — SHA-256 hashed before DB insert
7. **Cookie setup** — Sets HttpOnly cookies for both tokens

## Frontend Flow

1. **Form render** — `/login` route renders the login form
2. **Client validation** — Email format + password required
3. **Submit** — POST to `/api/auth/login` via React Query mutation
4. **Loading state** — Spinner on button, form disabled during request
5. **Success** — Toast "Welcome back!" + redirect to `/`
6. **Error** — Toast with error message from API

## Rate Limiting

All `/api/auth/*` routes are rate-limited to **20 requests per 15 minutes** per IP address using `express-rate-limit`.

## Security Notes

- Passwords are compared using bcrypt (never stored in plain text)
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Refresh tokens are stored as SHA-256 hashes
- HttpOnly cookies prevent XSS access to tokens
- SameSite=Strict on refresh token cookie
- Secure flag respects `COOKIE_SECURE` env var

## Files

| File                                               | Purpose                   |
| -------------------------------------------------- | ------------------------- |
| `apps/backend/src/modules/auth/auth.controller.ts` | Request handler           |
| `apps/backend/src/modules/auth/auth.service.ts`    | Business logic            |
| `apps/backend/src/modules/auth/auth.validation.ts` | Zod validation schemas    |
| `apps/backend/src/modules/auth/auth.routes.ts`     | Route definitions         |
| `apps/web/src/routes/login.tsx`                    | Login page UI             |
| `apps/web/src/hooks/use-login.ts`                  | React Query mutation hook |
| `apps/web/src/lib/api.ts`                          | API client                |
