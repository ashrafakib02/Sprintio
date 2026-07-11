# Authentication Foundation

## Overview

This document describes the authentication foundation for the Sprint.io platform. It provides the infrastructure for user authentication using JWT (ES256) with refresh token rotation, but does NOT include login/registration UI.

## Architecture

### Token Strategy

- **Access Token**: Short-lived JWT (15 min default), stored in HttpOnly cookie
- **Refresh Token**: Long-lived JWT (7 days default), stored in HttpOnly cookie with Strict SameSite
- **Algorithm**: ES256 (ECDSA using P-256 and SHA-256)
- **Rotation**: Refresh tokens are rotated on each use (old token deleted, new pair issued)

### Database Schema

#### Users Table

| Column         | Type         | Constraints        |
| -------------- | ------------ | ------------------ |
| id             | UUID         | PK, auto-generated |
| email          | VARCHAR(255) | UNIQUE, NOT NULL   |
| password_hash  | VARCHAR(255) | NOT NULL           |
| email_verified | BOOLEAN      | DEFAULT FALSE      |
| created_at     | TIMESTAMPTZ  | DEFAULT NOW()      |
| updated_at     | TIMESTAMPTZ  | DEFAULT NOW()      |

#### Sessions Table

| Column     | Type        | Constraints              |
| ---------- | ----------- | ------------------------ |
| id         | UUID        | PK, auto-generated       |
| user_id    | UUID        | FK -> users(id), CASCADE |
| user_agent | TEXT        |                          |
| ip_address | VARCHAR(45) |                          |
| expires_at | TIMESTAMPTZ | NOT NULL                 |
| created_at | TIMESTAMPTZ | DEFAULT NOW()            |

#### Refresh Tokens Table

| Column     | Type         | Constraints                 |
| ---------- | ------------ | --------------------------- |
| id         | UUID         | PK, auto-generated          |
| token_hash | VARCHAR(255) | UNIQUE, NOT NULL            |
| session_id | UUID         | FK -> sessions(id), CASCADE |
| user_id    | UUID         | FK -> users(id), CASCADE    |
| expires_at | TIMESTAMPTZ  | NOT NULL                    |
| created_at | TIMESTAMPTZ  | DEFAULT NOW()               |

### API Endpoints

| Method | Path                 | Auth | Description               |
| ------ | -------------------- | ---- | ------------------------- |
| POST   | /api/auth/register   | No   | Register a new user       |
| POST   | /api/auth/login      | No   | Login with email/password |
| POST   | /api/auth/refresh    | No*  | Refresh access token      |
| POST   | /api/auth/logout     | Yes  | Logout (single session)   |
| POST   | /api/auth/logout-all | Yes  | Logout all sessions       |
| GET    | /api/auth/me         | Yes  | Get current user profile  |

\*Uses refresh token cookie, not access token

### Security Features

- HttpOnly cookies (no XSS exposure)
- CSRF protection via SameSite cookie policy
- Rate limiting (20 req/15min for auth routes)
- Helmet security headers
- Password hashing with bcrypt (configurable salt rounds)
- Refresh token rotation (single-use tokens)
- SHA-256 hashed tokens in database
- Input validation with Zod

### Environment Variables

See `.env.example` for all required environment variables.

### File Structure

```
apps/backend/
├── src/
│   ├── config/
│   │   ├── env.ts          # Environment validation
│   │   ├── database.ts     # PostgreSQL + Drizzle
│   │   └── redis.ts        # Redis connection
│   ├── db/
│   │   ├── schema/
│   │   │   ├── index.ts
│   │   │   ├── users.ts
│   │   │   ├── sessions.ts
│   │   │   └── refresh-tokens.ts
│   │   └── migrations/
│   │       └── 0000_initial.sql
│   ├── middleware/
│   │   └── auth.ts         # JWT verification middleware
│   ├── modules/
│   │   └── auth/
│   │       ├── index.ts
│   │       ├── auth.service.ts
│   │       ├── auth.controller.ts
│   │       ├── auth.routes.ts
│   │       └── auth.validation.ts
│   ├── types/
│   │   └── auth.ts
│   ├── utils/
│   │   ├── jwt.ts          # ES256 JWT utilities
│   │   ├── cookie.ts       # Cookie management
│   │   ├── password.ts     # bcrypt utilities
│   │   └── token-hash.ts   # SHA-256 token hashing
│   ├── app.ts              # Express app setup
│   └── server.ts           # Server entry point
├── drizzle.config.ts
├── package.json
├── tsconfig.json
└── .env.example
```

### Usage Examples

#### Register

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'
```

#### Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}' \
  -c cookies.txt
```

#### Access Protected Route

```bash
curl http://localhost:3001/api/auth/me -b cookies.txt
```

### Next Steps (Not Implemented)

- [ ] Login UI
- [ ] Registration UI
- [ ] Email verification flow
- [ ] Password reset flow
- [ ] OAuth providers (Google, GitHub)
- [ ] Two-factor authentication
