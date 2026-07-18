# Email Verification

## Overview

Email verification ensures users have access to the email address they registered with. After registration, users receive a verification email with a unique link. Clicking the link verifies their email address.

## Architecture

```
Registration → Generate token → Store SHA-256 hash in DB → Send email with link
Link click   → GET /api/auth/verify-email/:token → Verify hash → Set email_verified=true → Redirect
Resend       → POST /api/auth/resend-verification → Invalidate old tokens → Generate new → Send email
```

## Database Schema

### `email_verification_tokens` Table

| Column       | Type            | Description                            |
| ------------ | --------------- | -------------------------------------- |
| `id`         | UUID (PK)       | Unique identifier                      |
| `token_hash` | VARCHAR(64)     | SHA-256 hash of the verification token |
| `user_id`    | UUID (FK→users) | Reference to user (CASCADE delete)     |
| `expires_at` | TIMESTAMPTZ     | Token expiration time (24 hours)       |
| `created_at` | TIMESTAMPTZ     | Creation timestamp                     |

### Design Decisions

- **SHA-256 hashing**: Tokens are stored as hashes, never plaintext (same pattern as refresh tokens)
- **Single-use**: Token is deleted after successful verification
- **24-hour expiration**: Balances security with user convenience
- **Cascade delete**: Tokens are cleaned up when a user is deleted

## API Endpoints

### POST `/api/auth/resend-verification`

Resends the verification email to the specified address.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**

```json
{
  "data": {
    "message": "Verification email sent"
  }
}
```

**Error Responses:**

| Status | Message                | Description                      |
| ------ | ---------------------- | -------------------------------- |
| 400    | Validation error       | Invalid email format             |
| 409    | Email already verified | User's email is already verified |

**Rate Limit:** 5 requests per 15 minutes per IP

**Security Note:** Returns success even if user not found (prevents email enumeration)

### GET `/api/auth/verify-email/:token`

Verifies the email using the token from the verification link.

**Behavior:** Redirects to frontend pages (not JSON response)

| Condition     | Redirect To             |
| ------------- | ----------------------- |
| Token valid   | `/verified`             |
| Token expired | `/verify-email/expired` |
| Token invalid | `/verify-email/expired` |

**Note:** This endpoint is called when users click the link in their email. It's a GET request that redirects to the frontend.

## Frontend Routes

### `/verify-email` — Check Your Email Page

Shown after registration. Displays:

- Mail icon
- "We sent a verification link to {email}"
- Resend form (email input + button)
- Link to sign in

**Search Params:** `email` (pre-filled from registration)

### `/verified` — Success Page

Shown after clicking the verification link. Displays:

- Green checkmark icon
- "Email verified!"
- "Your email has been verified successfully"
- Button to sign in

### `/verify-email/expired` — Expired Link Page

Shown when verification link is expired or invalid. Displays:

- Amber warning icon
- "Link expired or invalid"
- "Please request a new verification email"
- Resend form
- Link to sign in

## Environment Variables

| Variable                       | Default                 | Description                |
| ------------------------------ | ----------------------- | -------------------------- |
| `SMTP_HOST`                    | `localhost`             | SMTP server host           |
| `SMTP_PORT`                    | `587`                   | SMTP server port           |
| `SMTP_USER`                    | `''`                    | SMTP username              |
| `SMTP_PASS`                    | `''`                    | SMTP password              |
| `EMAIL_FROM`                   | `noreply@sprintio.dev`  | Sender email address       |
| `FRONTEND_URL`                 | `http://localhost:5173` | Frontend URL for redirects |
| `EMAIL_VERIFICATION_EXPIRY_MS` | `86400000`              | Token expiry (24 hours)    |

## Development Mode

In development, verification emails are logged to the console instead of being sent via SMTP:

```
📧 Verification email URL: http://localhost:5173/api/auth/verify-email/{token}
```

## Security Considerations

1. **Token Hashing**: Tokens are stored as SHA-256 hashes, never plaintext
2. **Single-use**: Tokens are deleted after successful verification
3. **Rate Limiting**: Resend endpoint limited to 5 requests per 15 minutes
4. **No Email Enumeration**: Resend returns success even for non-existent emails
5. **Expiration**: Tokens expire after 24 hours
6. **Cascade Delete**: Tokens are cleaned up when users are deleted

## User Flow

1. **Registration**: User creates account → redirected to `/verify-email`
2. **Email Sent**: Verification email sent with unique link
3. **Verification**: User clicks link → email verified → redirected to `/verified`
4. **Resend**: User can resend verification email from `/verify-email` or `/verify-email/expired`
5. **Login**: Users can log in before verification (optional banner prompts verification)

## Implementation Files

### Backend

| File                                                             | Purpose               |
| ---------------------------------------------------------------- | --------------------- |
| `apps/backend/src/db/schema/email-verification-tokens.ts`        | Drizzle schema        |
| `apps/backend/src/services/email.ts`                             | Email sending service |
| `apps/backend/src/modules/auth/email-verification.service.ts`    | Business logic        |
| `apps/backend/src/modules/auth/email-verification.controller.ts` | Request handlers      |
| `apps/backend/src/modules/auth/email-verification.routes.ts`     | Route definitions     |

### Frontend

| File                                                  | Purpose                 |
| ----------------------------------------------------- | ----------------------- |
| `apps/web/src/hooks/use-resend-verification.ts`       | TanStack Query mutation |
| `apps/web/src/routes/_guest.verify-email.tsx`         | Check email page        |
| `apps/web/src/routes/_guest.verified.tsx`             | Success page            |
| `apps/web/src/routes/_guest.verify-email-expired.tsx` | Expired link page       |

### Shared

| File                                                     | Purpose     |
| -------------------------------------------------------- | ----------- |
| `packages/shared/src/schemas/email-verification.ts`      | Zod schema  |
| `packages/shared/src/errors/email-verification-error.ts` | Error class |
