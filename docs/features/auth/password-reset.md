# Password Reset

Secure forgot/reset password flow for Sprintio. Users request a reset link via email, click it, and set a new password. All previous sessions are revoked on reset for security.

## Architecture

```
User clicks "Forgot password?" → POST /api/auth/forgot-password { email }
  → generates token (randomUUID), stores SHA-256 hash, sends email with reset link
  → ALWAYS returns success (never reveals if email exists)

User clicks link → /reset-password?token=abc123
  → Enter new password + confirm → POST /api/auth/reset-password { token, password }
  → backend: hash token → look up → check expiry → update passwordHash → delete token (single-use)
  → revoke ALL user sessions for security → redirect to success page
```

---

## Database Schema

### `password_reset_tokens` table

| Column       | Type          | Constraints                       |
| ------------ | ------------- | --------------------------------- |
| `id`         | `uuid`        | PK, auto-generated                |
| `token_hash` | `varchar(64)` | NOT NULL, UNIQUE                  |
| `user_id`    | `uuid`        | NOT NULL, FK → users.id (CASCADE) |
| `expires_at` | `timestamptz` | NOT NULL                          |
| `created_at` | `timestamptz` | DEFAULT now()                     |

- Token hash is SHA-256 of the plain UUID token (64 hex chars)
- Tokens expire after 1 hour (`PASSWORD_RESET_EXPIRY_MS`)
- Old tokens are deleted before generating new ones (one active reset per user)
- Token is deleted after successful use (single-use)

---

## API Endpoints

### POST `/api/auth/forgot-password`

**Auth required:** No
**Rate limit:** 5 requests per 15 minutes per IP

**Request:**

```json
{ "email": "user@example.com" }
```

**Success (200):**

```json
{
  "data": { "message": "If an account with that email exists, a password reset link has been sent" }
}
```

**Security:** Always returns the same success message regardless of whether the email exists. This prevents email enumeration attacks.

**Logic:**

1. Validate email with Zod
2. Look up user by email
3. If not found → return success message (no-op)
4. If found → delete existing reset tokens, generate new token, send email
5. Return success message

### POST `/api/auth/reset-password`

**Auth required:** No
**Rate limit:** 5 requests per 15 minutes per IP

**Request:**

```json
{
  "token": "uuid-from-email",
  "password": "NewPass1!",
  "confirmPassword": "NewPass1!"
}
```

**Success (200):**

```json
{ "data": { "message": "Password reset successful" } }
```

**Errors:**

- 400 — Validation error (weak password, passwords don't match)
- 400 — Invalid or expired reset link

**Password requirements:**

- At least 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Logic:**

1. Validate input with Zod (password + confirmPassword must match, password must meet strength rules)
2. Hash incoming token → look up in `password_reset_tokens`
3. If not found → "Invalid or expired reset link"
4. If expired → delete token, return error
5. Hash new password with bcrypt
6. Update `users.password_hash`
7. Delete reset token (single-use)
8. **Revoke ALL user sessions** (invalidate session cache, delete refresh tokens + sessions from DB, blacklist tokens in Redis)
9. Return success

---

## Email Template

The password reset email contains:

- Subject: "Reset your password — Sprintio"
- Button linking to `${FRONTEND_URL}/reset-password?token=${token}`
- Fallback plain-text URL
- 1-hour expiry notice
- "Ignore if you didn't request this" notice

In development (no SMTP configured), the reset URL is logged to the console.

---

## Frontend Routes

### `/forgot-password` — Guest Layout

- Email input form
- On submit: sends request, shows "Check your email" confirmation
- Link back to `/login`

### `/reset-password?token=...` — Guest Layout

- New password input (with show/hide toggle)
- Password strength indicator (weak/medium/strong)
- Password validation rules checklist (live feedback)
- Confirm password input with match indicator
- Shows "Invalid link" state if token is missing
- Link back to `/login`

### `/reset-password-success` — Guest Layout

- Green checkmark icon
- "Password reset successful!"
- "Your password has been updated" message
- Button → `/login`

---

## Environment Variables

| Variable                   | Default                 | Description             |
| -------------------------- | ----------------------- | ----------------------- |
| `PASSWORD_RESET_EXPIRY_MS` | `3600000` (1 hour)      | Token validity duration |
| `BACKEND_URL`              | `http://localhost:3001` | Used in email links     |
| `FRONTEND_URL`             | `http://localhost:5173` | Used for redirect links |

---

## Security Considerations

1. **No email enumeration:** Forgot password always returns the same response
2. **Token hashing:** Plain tokens are never stored — only SHA-256 hashes
3. **Single-use tokens:** Token is deleted after successful password reset
4. **Short expiry:** 1 hour vs 24 hours for email verification
5. **Session invalidation:** ALL sessions revoked on password reset
6. **Rate limiting:** 5 requests per 15 minutes on both endpoints
7. **Password strength:** Enforced with regex validation (uppercase, lowercase, number, special char)
8. **Bcrypt hashing:** Passwords hashed with bcrypt (12 salt rounds)

---

## Implementation Files

### Backend

| File                                                         | Purpose                    |
| ------------------------------------------------------------ | -------------------------- |
| `apps/backend/src/db/schema/password-reset-tokens.ts`        | Drizzle ORM schema         |
| `apps/backend/src/modules/auth/password-reset.service.ts`    | Business logic             |
| `apps/backend/src/modules/auth/password-reset.controller.ts` | Request handlers           |
| `apps/backend/src/modules/auth/password-reset.routes.ts`     | Route definitions          |
| `apps/backend/src/modules/auth/password-reset.validation.ts` | Zod validation schemas     |
| `apps/backend/src/services/email.ts`                         | `sendPasswordResetEmail()` |
| `apps/backend/src/app.ts`                                    | Rate limiters              |

### Frontend

| File                                                    | Purpose                                             |
| ------------------------------------------------------- | --------------------------------------------------- |
| `apps/web/src/lib/api.ts`                               | `forgotPassword()`, `resetPassword()` API functions |
| `apps/web/src/hooks/use-forgot-password.ts`             | Forgot password mutation hook                       |
| `apps/web/src/hooks/use-reset-password.ts`              | Reset password mutation hook                        |
| `apps/web/src/routes/_guest.forgot-password.tsx`        | Forgot password page                                |
| `apps/web/src/routes/_guest.reset-password.tsx`         | Reset password form                                 |
| `apps/web/src/routes/_guest.reset-password-success.tsx` | Success page                                        |
