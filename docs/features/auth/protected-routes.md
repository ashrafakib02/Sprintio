# Protected Routes

## Overview

Sprintio implements route protection using a two-layout system: **Authenticated** and **Guest** layouts, enforced via TanStack Router's pathless layout routes and a centralized auth context.

## Architecture

### Route Hierarchy

| Route          | Access     | Layout           | Redirect On                  |
| -------------- | ---------- | ---------------- | ---------------------------- |
| `/`            | PUBLIC     | None (root)      | —                            |
| `/login`       | GUEST only | `_guest`         | Authenticated → `/dashboard` |
| `/register`    | GUEST only | `_guest`         | Authenticated → `/dashboard` |
| `/dashboard`   | PROTECTED  | `_authenticated` | Not authenticated → `/login` |
| `/dashboard/*` | PROTECTED  | `_authenticated` | Not authenticated → `/login` |

### Auth State Flow

1. **App mount** → `AuthProvider` renders (wrapped around all routes via `__root.tsx`)
2. **AuthProvider** → React Query fetches `GET /api/auth/me` (queryKey: `['auth', 'me']`)
3. **401 response** → AuthProvider attempts `POST /api/auth/refresh`, then retries `/me`
4. **Refresh fails** → Auth state = `{ user: null, isAuthenticated: false }`
5. **Route guards** → Guest routes redirect authenticated users; protected routes rely on AuthProvider

### File Structure

```
apps/web/src/
├── contexts/
│   └── auth-provider.tsx           # AuthContext + AuthProvider
├── hooks/
│   ├── use-auth.ts                 # useAuth() hook
│   ├── use-logout.ts               # useLogout() hook
│   ├── use-login.ts                # Updated: invalidates auth query, navigates to /dashboard
│   └── use-register.ts             # Updated: invalidates auth query, navigates to /dashboard
├── lib/
│   ├── api.ts                      # fetchMe, refreshTokens, logoutApi, credentials: 'include'
│   └── route-guards.ts             # Role-based guard utilities
├── types/
│   └── auth.ts                     # AuthUser, AuthState, AuthContextValue
└── routes/
    ├── __root.tsx                  # Root — wraps everything with AuthProvider
    ├── index.tsx                   # Landing page (public)
    ├── _guest.tsx                  # Guest layout (pathless, centered content)
    ├── _guest.login.tsx            # Login page (guest only)
    ├── _guest.register.tsx         # Register page (guest only)
    ├── _authenticated.tsx          # Auth layout (sidebar + main content)
    └── _authenticated.dashboard.tsx # Dashboard (protected)
```

## Frontend

### Auth Provider

The `AuthProvider` wraps the entire application (via `__root.tsx`) and manages auth state using React Query:

```tsx
// contexts/auth-provider.tsx
export function AuthProvider({ children }: AuthProviderProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    staleTime: 5 * 60_000,
  });

  // On 401: attempt refresh → retry /me → or set user=null
  // Exposes: { user, isLoading, isAuthenticated, logout, refetchUser }
}
```

### useAuth Hook

```tsx
import { useAuth } from '@/hooks/use-auth';

function MyComponent() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <LoginPrompt />;

  return <div>Welcome, {user.name}!</div>;
}
```

### useLogout Hook

```tsx
import { useLogout } from '@/hooks/use-logout';

function SignOutButton() {
  const logout = useLogout();

  return <button onClick={() => logout.mutate()}>Sign out</button>;
}
```

### Route Guards (beforeLoad)

TanStack Router's `beforeLoad` runs before component rendering. Guards are defined in layout routes:

**Authenticated layout** (`_authenticated.tsx`):

- Relies on AuthProvider's `isAuthenticated` state
- Components render loading spinner while auth resolves
- Redirect handled by AuthProvider on failed `/me` fetch

**Guest layout** (`_guest.tsx`):

- Simple wrapper, no redirect logic needed (login/register forms handle their own flow)

### Role-Based Route Guards

For future routes that require specific roles:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { requireRoles } from '@/lib/route-guards';

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: ({ context }) => {
    requireRoles(context.auth?.user, ['owner', 'admin']);
  },
  component: AdminPage,
});
```

### API Client Changes

The `apiRequest` function now includes:

- `credentials: 'include'` — ensures httpOnly cookies are sent with every request
- Error status attached to thrown errors (`err.status = res.status`) for 401 detection
- New endpoints: `fetchMe()`, `refreshTokens()`, `logoutApi()`

## Backend

### Middleware Stack

```
Request → authenticate → [requireRole(...)] → [requirePermission(...)] → Handler
```

| Middleware                    | Purpose                                               | File                          |
| ----------------------------- | ----------------------------------------------------- | ----------------------------- |
| `authenticate`                | Validates JWT from httpOnly cookie, checks revocation | `middleware/auth.ts`          |
| `optionalAuth`                | Best-effort auth (doesn't fail if no token)           | `middleware/auth.ts`          |
| `requireRole(...roles)`       | Checks user's role against allowed roles              | `middleware/role.ts`          |
| `requirePermission(...perms)` | Checks granular permissions                           | `middleware/permission.ts`    |
| `errorHandler`                | Centralized AppError → HTTP response mapping          | `middleware/error-handler.ts` |

### Role Hierarchy

```
owner (4) > admin (3) > member (2) > guest (1)
```

### Permission Matrix

| Permission                 | Owner | Admin | Member | Guest |
| -------------------------- | :---: | :---: | :----: | :---: |
| `workspace:create`         |  ✅   |   —   |   —    |   —   |
| `workspace:update`         |  ✅   |  ✅   |   —    |   —   |
| `workspace:delete`         |  ✅   |   —   |   —    |   —   |
| `workspace:manage_members` |  ✅   |  ✅   |   —    |   —   |
| `workspace:manage_billing` |  ✅   |   —   |   —    |   —   |
| `board:create`             |  ✅   |  ✅   |   ✅   |  🔶   |
| `board:update`             |  ✅   |  ✅   |   ✅   |  🔶   |
| `board:delete`             |  ✅   |  ✅   |   ✅   |   —   |
| `task:create`              |  ✅   |  ✅   |   ✅   |  🔶   |
| `task:update`              |  ✅   |  ✅   |   ✅   |  🔶   |
| `task:delete`              |  ✅   |  ✅   |   ✅   |   —   |
| `task:assign`              |  ✅   |  ✅   |   ✅   |   —   |
| `document:create`          |  ✅   |  ✅   |   ✅   |  🔶   |
| `document:update`          |  ✅   |  ✅   |   ✅   |  🔶   |
| `document:delete`          |  ✅   |  ✅   |   ✅   |   —   |

> 🔶 = Scoped access (guest can only access explicitly granted resources)

### Usage Examples

#### Protecting a route with role check

```typescript
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

// Only admins and owners can delete workspaces
router.delete('/workspaces/:id', authenticate, requireRole('owner', 'admin'), deleteWorkspace);
```

#### Protecting a route with permission check

```typescript
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission.js';

// Members, admins, and owners can create tasks
router.post('/tasks', authenticate, requirePermission('task:create'), createTask);
```

#### Stacking middleware

```typescript
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { requirePermission } from '../middleware/permission.js';

// Must be authenticated + admin/owner + have workspace:manage_members
router.post(
  '/workspaces/:id/members',
  authenticate,
  requireRole('owner', 'admin'),
  requirePermission('workspace:manage_members'),
  addMember,
);
```

### Error Response Format

All middleware errors follow a consistent format:

```json
{
  "error": "Insufficient permissions",
  "code": "FORBIDDEN",
  "required": ["owner", "admin"],
  "current": "member"
}
```

The centralized error handler catches `AppError` instances from `@sprintio/shared` and maps them to structured responses with `error`, `code`, and optional `details`.

## Security Considerations

1. **Backend is the source of truth** — Frontend route guards are UX convenience only; all authorization is enforced server-side.
2. **httpOnly cookies** — JWT tokens are never exposed to JavaScript (XSS-safe).
3. **SameSite=Lax** — Prevents CSRF via cross-site cookie transmission.
4. **Refresh token rotation** — Single-use tokens with stolen-token detection.
5. **Token revocation** — Redis-backed blacklist for immediate invalidation.
6. **Rate limiting** — 20 req/15min on auth endpoints, 100 req/15min globally.
7. **ES256 (ECDSA P-256)** — Modern JWT algorithm with separate key pairs for access and refresh tokens.
