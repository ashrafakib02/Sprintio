# Workspace & Organization Foundation

> Multi-tenant foundation for Sprintio — organizations, workspaces, membership, and permissions.

## Overview

The workspace foundation establishes the multi-tenant data model for Sprintio:

```
User ──┬── Organization Membership ── Organization ──┬── Workspace Membership ── Workspace
       │                                              │
       └──────────────────────────────────────────────┘
```

- **Organization** — top-level tenant container (company, team, or personal account)
- **Workspace** — project-level container within an organization (or standalone)
- **Membership** — many-to-many join with role-based access (owner → admin → member → guest)
- **Permissions** — role-gated operations at both organization and workspace scope

## Architecture

### Entity Hierarchy

```
Organization (1) ──→ (N) Workspace
      │                      │
      ▼                      ▼
OrganizationMember    WorkspaceMember
```

- Organizations own workspaces (optional FK — workspaces can be standalone)
- Both entities have independent membership tables with role-based access
- Cascading deletes: deleting an organization removes its members and workspaces

### Multi-tenant Isolation

The `tenant.ts` middleware extracts the workspace context from each request:

| Source       | Priority | Header           | Param          | Query         |
| ------------ | -------- | ---------------- | -------------- | ------------- |
| Workspace ID | 1st      | `x-workspace-id` | `:workspaceId` | `workspaceId` |

Once resolved, `req.workspaceId` and `req.organizationId` are available to all downstream middleware and controllers.

---

## Database Schema

### organizations

| Column      | Type         | Constraints                   |
| ----------- | ------------ | ----------------------------- |
| id          | uuid         | PK, default gen_random_uuid() |
| name        | varchar(100) | NOT NULL                      |
| slug        | varchar(100) | NOT NULL, UNIQUE              |
| description | text         | nullable                      |
| logo        | text         | nullable                      |
| website     | varchar(500) | nullable                      |
| created_at  | timestamptz  | NOT NULL, DEFAULT now()       |
| updated_at  | timestamptz  | NOT NULL, DEFAULT now()       |

### organization_members

| Column          | Type        | Constraints                                       |
| --------------- | ----------- | ------------------------------------------------- |
| id              | uuid        | PK, default gen_random_uuid()                     |
| organization_id | uuid        | FK → organizations.id ON DELETE CASCADE, NOT NULL |
| user_id         | uuid        | FK → users.id ON DELETE CASCADE, NOT NULL         |
| role            | varchar(20) | NOT NULL, DEFAULT 'member'                        |
| created_at      | timestamptz | NOT NULL, DEFAULT now()                           |

**Indexes:** Unique on (organization_id, user_id), index on user_id

### workspaces (enhanced)

| Column          | Type         | Constraints                                       |
| --------------- | ------------ | ------------------------------------------------- |
| id              | uuid         | PK, default gen_random_uuid()                     |
| name            | varchar(100) | NOT NULL                                          |
| slug            | varchar(100) | NOT NULL, UNIQUE                                  |
| description     | text         | nullable                                          |
| logo            | text         | nullable                                          |
| organization_id | uuid         | FK → organizations.id ON DELETE CASCADE, nullable |
| plan            | varchar(20)  | NOT NULL, DEFAULT 'free'                          |
| created_at      | timestamptz  | NOT NULL, DEFAULT now()                           |
| updated_at      | timestamptz  | NOT NULL, DEFAULT now()                           |

### workspace_members

| Column       | Type        | Constraints                                    |
| ------------ | ----------- | ---------------------------------------------- |
| id           | uuid        | PK, default gen_random_uuid()                  |
| workspace_id | uuid        | FK → workspaces.id ON DELETE CASCADE, NOT NULL |
| user_id      | uuid        | FK → users.id ON DELETE CASCADE, NOT NULL      |
| role         | varchar(20) | NOT NULL, DEFAULT 'member'                     |
| created_at   | timestamptz | NOT NULL, DEFAULT now()                        |

**Indexes:** Unique on (workspace_id, user_id), index on user_id

---

## Migration

Run the migration to create the new tables:

```bash
# Apply the migration SQL directly against the database
psql $DATABASE_URL -f packages/db/migrations/0001_organizations.sql
```

The migration is idempotent — safe to run multiple times (`CREATE TABLE IF NOT EXISTS`, `IF NOT EXISTS` column checks).

---

## Permission Model

### Organization Permissions

| Permission                    | Owner | Admin | Member | Guest |
| ----------------------------- | ----- | ----- | ------ | ----- |
| `organization:create`         | ✅    | ❌    | ❌     | ❌    |
| `organization:update`         | ✅    | ✅    | ❌     | ❌    |
| `organization:delete`         | ✅    | ❌    | ❌     | ❌    |
| `organization:manage_members` | ✅    | ✅    | ❌     | ❌    |
| `organization:manage_billing` | ✅    | ❌    | ❌     | ❌    |
| `organization:settings`       | ✅    | ✅    | ❌     | ❌    |

### Workspace Permissions

| Permission                 | Owner | Admin | Member | Guest |
| -------------------------- | ----- | ----- | ------ | ----- |
| `workspace:create`         | ✅    | ❌    | ❌     | ❌    |
| `workspace:update`         | ✅    | ✅    | ❌     | ❌    |
| `workspace:delete`         | ✅    | ❌    | ❌     | ❌    |
| `workspace:manage_members` | ✅    | ✅    | ❌     | ❌    |
| `workspace:manage_billing` | ✅    | ❌    | ❌     | ❌    |
| `board:create`             | ✅    | ✅    | ✅     | ✅    |
| `board:update`             | ✅    | ✅    | ✅     | ❌    |
| `board:delete`             | ✅    | ✅    | ✅     | ❌    |
| `task:create`              | ✅    | ✅    | ✅     | ✅    |
| `task:update`              | ✅    | ✅    | ✅     | ❌    |
| `task:delete`              | ✅    | ✅    | ✅     | ❌    |
| `task:assign`              | ✅    | ✅    | ✅     | ❌    |
| `document:create`          | ✅    | ✅    | ✅     | ✅    |
| `document:update`          | ✅    | ✅    | ✅     | ❌    |
| `document:delete`          | ✅    | ✅    | ✅     | ❌    |

### Role Hierarchy

```
owner (4) > admin (3) > member (2) > guest (1)
```

Owner bypasses all permission checks. Higher roles inherit all lower role permissions implicitly through the permission mapping.

---

## API Endpoints

### Organizations

| Method | Path                                     | Auth | Permission                    | Description               |
| ------ | ---------------------------------------- | ---- | ----------------------------- | ------------------------- |
| POST   | `/api/organizations`                     | ✅   | — (any authenticated)         | Create organization       |
| GET    | `/api/organizations`                     | ✅   | — (any authenticated)         | List user's organizations |
| GET    | `/api/organizations/:organizationId`     | ✅   | Must be member                | Get organization details  |
| POST   | `/api/organizations/:id/members`         | ✅   | `organization:manage_members` | Add member                |
| DELETE | `/api/organizations/:id/members/:userId` | ✅   | `organization:manage_members` | Remove member             |
| GET    | `/api/organizations/:id/members`         | ✅   | Must be member                | List members              |

### Workspaces

| Method | Path                                   | Auth | Permission                 | Description               |
| ------ | -------------------------------------- | ---- | -------------------------- | ------------------------- |
| POST   | `/api/workspaces`                      | ✅   | — (any authenticated)      | Create workspace          |
| GET    | `/api/workspaces`                      | ✅   | — (any authenticated)      | List user's workspaces    |
| GET    | `/api/workspaces/:workspaceId`         | ✅   | Must be member             | Get workspace details     |
| GET    | `/api/workspaces/:workspaceId/context` | ✅   | Must be member             | Get workspace + user role |
| POST   | `/api/workspaces/:id/members`          | ✅   | `workspace:manage_members` | Add member                |
| DELETE | `/api/workspaces/:id/members/:userId`  | ✅   | `workspace:manage_members` | Remove member             |
| GET    | `/api/workspaces/:id/members`          | ✅   | Must be member             | List members              |

### Rate Limits

| Endpoint Group    | Window | Max Requests |
| ----------------- | ------ | ------------ |
| Organization CRUD | 15 min | 30           |
| Member management | 15 min | 20           |
| Workspace CRUD    | 15 min | 30           |
| Workspace members | 15 min | 20           |

---

## Middleware Stack

### Multi-tenant Middleware (`tenant.ts`)

```ts
import { extractWorkspaceContext, requireWorkspace } from './middleware/tenant.js';

// Light extraction (no DB validation)
router.get('/some-route', authenticate, extractWorkspaceContext, handler);

// Full validation (DB lookup + membership check)
router.get('/some-route', authenticate, requireWorkspace, handler);
```

### Organization Permission Middleware (`organization-permission.ts`)

```ts
import { requireOrganizationPermission } from './middleware/organization-permission.js';

// Must be used after authenticate
router.post(
  '/org/:id/settings',
  authenticate,
  requireOrganizationPermission('organization:settings'),
  handler,
);
```

### Workspace Permission Middleware (`permission.ts`)

```ts
import { requirePermission } from './middleware/permission.js';

// Must be used after authenticate
router.post(
  '/workspace/:id/members',
  authenticate,
  requireWorkspace, // validates membership
  requirePermission('workspace:manage_members'),
  handler,
);
```

---

## File Structure

```
packages/
  db/
    src/
      schema/
        organizations.ts          # organizations table
        organization-members.ts   # organization_members table
        relations.ts              # Drizzle relation definitions
        workspaces.ts             # enhanced with organizationId FK
        index.ts                  # barrel exports
      repositories/
        organization.repository.ts  # org data access layer
        workspace.repository.ts     # workspace data access layer
        index.ts                    # barrel exports
    migrations/
      0001_organizations.sql     # idempotent migration SQL

  shared/
    src/
      types/
        organization.ts           # Organization, OrganizationMembership types
        workspace.ts              # enhanced with organizationId field
      schemas/
        organization.ts           # Zod validation schemas
      constants/
        roles.ts                  # ORGANIZATION_ROLES added
        permissions.ts            # ORGANIZATION permission group added

apps/backend/
  src/
    middleware/
      tenant.ts                   # extractWorkspaceContext, requireWorkspace
      organization-permission.ts  # requireOrganizationPermission
      permission.ts               # enhanced with ORGANIZATION permissions
    modules/
      organization/
        organization.service.ts   # business logic
        organization.controller.ts # HTTP handlers
        organization.routes.ts    # Express router
        index.ts                  # barrel export
      workspace/
        workspace.service.ts      # business logic
        workspace.controller.ts   # HTTP handlers
        workspace.routes.ts       # Express router
        index.ts                  # barrel export
    config/
      db-for-repos.ts             # type bridge for repository functions
```

---

## Shared Types

### Organization

```ts
interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole; // 'owner' | 'admin' | 'member' | 'guest'
  user?: User;
  createdAt: string;
}
```

### Workspace (enhanced)

```ts
interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  organizationId: string | null; // NEW — links to organization
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  updatedAt: string;
}
```

### Zod Schemas

```ts
// Create organization
CreateOrganizationSchema = {
  name: string (1-100),
  description?: string (max 500),
  website?: string (URL, max 500)
}

// Add member to organization or workspace
AddOrganizationMemberSchema = {
  userId: string (UUID),
  role: 'admin' | 'member' | 'guest' (default: 'member')
}
```

---

## Usage Examples

### Create an Organization

```bash
curl -X POST http://localhost:3001/api/organizations \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=..." \
  -d '{"name": "Acme Corp", "description": "Our company"}'
```

### Create a Workspace Under an Organization

```bash
curl -X POST http://localhost:3001/api/workspaces \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=..." \
  -d '{"name": "Engineering", "organizationId": "org-uuid-here"}'
```

### Add a Member to a Workspace

```bash
curl -X POST http://localhost:3001/api/workspaces/ws-id/members \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=..." \
  -d '{"userId": "user-uuid", "role": "admin"}'
```

### Get Workspace Context (for frontend)

```bash
curl http://localhost:3001/api/workspaces/ws-id/context \
  -H "Cookie: access_token=..."
# Returns: { data: { workspace: {...}, userRole: "admin" } }
```

---

## Design Decisions

1. **Organization is optional** — Workspaces can exist standalone (for personal use) or under an organization. The FK is nullable.

2. **Slug-based uniqueness** — Both organizations and workspaces use slugs for URL-friendly identifiers. Slugs are auto-generated from names using `slugify()`.

3. **Creator as owner** — Creating an org/workspace automatically adds the creator as `owner` in a transaction.

4. **Owner protection** — Cannot remove the owner from an organization or workspace. Must transfer ownership first (future feature).

5. **Cascading deletes** — Deleting an organization removes all its members and workspaces. Deleting a workspace removes all its members.

6. **Two-layer permissions** — Organization permissions (org-scoped) and workspace permissions (workspace-scoped) are independent. A user can be an admin in one workspace and a member in another within the same organization.

7. **Middleware composition** — `authenticate → requireWorkspace → requirePermission` is the standard middleware chain for workspace-scoped routes.

---

## What's NOT Included (Future Work)

This is a **foundation only**. The following are explicitly out of scope:

- Full CRUD endpoints for organizations and workspaces (update, delete)
- Invitation system (email-based org/workspace invites)
- Ownership transfer
- Plan enforcement (checking plan limits on member count, etc.)
- Audit logging
- Organization/workspace settings API
- Billing integration
- Workspace switching UI
- Slug uniqueness validation across org/workspace namespaces
