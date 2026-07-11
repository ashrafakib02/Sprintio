# Email Registration

## Overview

Users can create an account with their name, email, and password. No email verification is required at this stage.

## API Endpoint

```
POST /api/auth/register
```

### Rate Limit

20 requests per 15 minutes per IP (stricter auth rate limiter).

### Request Body

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123"
}
```

| Field             | Type   | Required | Rules                                                    |
| ----------------- | ------ | -------- | -------------------------------------------------------- |
| `name`            | string | Yes      | 1–100 characters                                         |
| `email`           | string | Yes      | Valid email format, unique                               |
| `password`        | string | Yes      | 8–128 chars, at least 1 uppercase, 1 lowercase, 1 number |
| `confirmPassword` | string | Yes      | Must match `password`                                    |

### Success Response (201)

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

| Status | Code              | Message                                                                           |
| ------ | ----------------- | --------------------------------------------------------------------------------- |
| 400    | VALIDATION_ERROR  | Field-level validation errors (e.g., "Name is required", "Invalid email address") |
| 409    | CONFLICT          | "A user with this email already exists"                                           |
| 429    | TOO_MANY_REQUESTS | Rate limit exceeded                                                               |
| 500    | INTERNAL_ERROR    | "Registration failed"                                                             |

## Backend Flow

1. **Validation** — Zod schema in `auth.validation.ts` validates name, email, password, confirmPassword
2. **Duplicate check** — Queries `users` table for existing email
3. **Password hashing** — bcrypt with configurable salt rounds (default 12)
4. **User creation** — Inserts into `users` table with `emailVerified: false`
5. **Session creation** — Creates a session record with expiry
6. **Token generation** — HS256 JWT access token (15min) + refresh token (7d)
7. **Refresh token storage** — SHA-256 hashed before DB insert
8. **Cookie setup** — Sets HttpOnly cookies for both tokens

## Frontend Flow

1. **Form render** — `/register` route renders the registration form
2. **Client validation** — Real-time field validation on blur, full validation on submit
3. **Password strength** — Visual indicator (weak/medium/strong) based on character variety
4. **Submit** — POST to `/api/auth/register` via React Query mutation
5. **Loading state** — Spinner on button, form disabled during request
6. **Success** — Toast notification + redirect to `/`
7. **Error** — Toast with error message from API

## Password Requirements

- Minimum 8 characters, maximum 128
- At least one uppercase letter (A–Z)
- At least one lowercase letter (a–z)
- At least one number (0–9)

## Database Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Files

| File                                               | Purpose                   |
| -------------------------------------------------- | ------------------------- |
| `apps/backend/src/modules/auth/auth.controller.ts` | Request handler           |
| `apps/backend/src/modules/auth/auth.service.ts`    | Business logic            |
| `apps/backend/src/modules/auth/auth.validation.ts` | Zod validation schemas    |
| `apps/backend/src/modules/auth/auth.routes.ts`     | Route definitions         |
| `apps/backend/src/db/schema/users.ts`              | Database schema           |
| `apps/web/src/routes/register.tsx`                 | Registration page UI      |
| `apps/web/src/hooks/use-register.ts`               | React Query mutation hook |
| `apps/web/src/lib/api.ts`                          | API client                |
