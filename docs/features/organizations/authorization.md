# Organization Authorization

## Overview

Organization authorization controls who can access and modify organization resources. The system implements **defense-in-depth** with authorization checks at multiple layers: route middleware, service layer, and database constraints.

### Design Principles

- **Membership required**: All organization operations require the user to be a member.
- **Role-based access**: Permissions are derived from the user's role within the organization.
- **Defense-in-depth**: Authorization is checked at both middleware and service layers.
- **Principle of least privilege**: Roles grant only the permissions needed for their level.
- **No information disclosure**: Error messages are generic to prevent probing.

---

## Authorization Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     Express Routes                           │
│  authenticate → requireOrganizationPermission → handler      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   Middleware Layer                            │
│  1. authenticate    — JWT verification, sets req.user        │
│  2. requireOrgPerm  — DB-backed role lookup, permission check│
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   Service Layer                              │
│  assertPermission()     — Role → permission mapping          │
│  validateRole()         — Role string validation             │
│  assertCanAssignRole()  — Hierarchy enforcement              │
│  isMember()             — Membership verification            │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   Database Layer                             │
│  CHECK constraint on role column                             │
│  UNIQUE constraint on (organization_id, user_id)            │
│  FOREIGN KEY constraints with CASCADE                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Organization Roles

### Role Definitions

| Role     | Level | Description                                                       |
| -------- | ----- | ----------------------------------------------------------------- |
| `owner`  | 4     | Full control. Can manage billing, delete org, transfer ownership. |
| `admin`  | 3     | Can update org settings, manage members, manage workspaces.       |
| `member` | 2     | Standard member. Can view org and participate in workspaces.      |
| `guest`  | 1     | Read-only access. Cannot modify org settings or members.          |

### Role Hierarchy

Roles are strictly hierarchical. A user can only assign roles **below** their own level:

```
owner (4) > admin (3) > member (2) > guest (1)
```

**Enforcement rules:**

- Only the **owner** can assign the `owner` role.
- A user **cannot** assign a role equal to or higher than their own.
- An **admin** cannot assign another admin (only owner can).
- A **member** cannot assign member or above (only admin+ can).

### Role Assignment Matrix

| Assigner ↓ \ Target → | owner | admin | member | guest |
| --------------------- | ----- | ----- | ------ | ----- |
| **owner**             | ✅    | ✅    | ✅     | ✅    |
| **admin**             | ❌    | ❌    | ✅     | ✅    |
| **member**            | ❌    | ❌    | ❌     | ✅    |
| **guest**             | ❌    | ❌    | ❌     | ❌    |

---

## Permission Matrix

Permissions are derived from roles. The `owner` role bypasses all permission checks.

| Permission                    | owner | admin | member | guest |
| ----------------------------- | ----- | ----- | ------ | ----- |
| `organization:create`         | ✅    | —     | —      | —     |
| `organization:update`         | ✅    | ✅    | ❌     | ❌    |
| `organization:delete`         | ✅    | ❌    | ❌     | ❌    |
| `organization:manage_members` | ✅    | ✅    | ❌     | ❌    |
| `organization:manage_billing` | ✅    | ❌    | ❌     | ❌    |
| `organization:settings`       | ✅    | ✅    | ❌     | ❌    |

> **Note:** `organization:create` is a global permission (any authenticated user can create an org). The other permissions are org-scoped.

### Permission Constants

Defined in `packages/shared/src/constants/permissions.ts`:

```ts
export const PERMISSIONS = {
  ORGANIZATION: {
    CREATE: 'organization:create',
    UPDATE: 'organization:update',
    DELETE: 'organization:delete',
    MANAGE_MEMBERS: 'organization:manage_members',
    MANAGE_BILLING: 'organization:manage_billing',
    SETTINGS: 'organization:settings',
  },
  // ...
} as const;
```

---

## Route Protection

All organization routes are protected by the `authenticate` middleware. Write operations additionally require `requireOrganizationPermission`.

### Route → Permission Mapping

| Route                                    | Method | Permission Required           | Rate Limit |
| ---------------------------------------- | ------ | ----------------------------- | ---------- |
| `/api/organizations`                     | POST   | None (auth only)              | 30/15min   |
| `/api/organizations`                     | GET    | None (auth only)              | —          |
| `/api/organizations/:id`                 | GET    | Membership                    | —          |
| `/api/organizations/:id`                 | PATCH  | `organization:update`         | 30/15min   |
| `/api/organizations/:id/archive`         | POST   | `organization:update`         | 30/15min   |
| `/api/organizations/:id/restore`         | POST   | `organization:update`         | 30/15min   |
| `/api/organizations/:id`                 | DELETE | `organization:delete`         | 30/15min   |
| `/api/organizations/:id/members`         | POST   | `organization:manage_members` | 20/15min   |
| `/api/organizations/:id/members/:userId` | DELETE | `organization:manage_members` | —          |
| `/api/organizations/:id/members`         | GET    | Membership                    | —          |

### Middleware Chain

```ts
// Example: Update organization
router.patch(
  '/:organizationId',
  authenticate, // 1. Verify JWT
  organizationLimiter, // 2. Rate limit
  requireOrganizationPermission('organization:update'), // 3. Check org role
  updateOrganization, // 4. Handler
);

// Example: List members (membership check only)
router.get(
  '/:organizationId/members',
  authenticate, // 1. Verify JWT
  listMembers, // 2. Handler (service checks membership)
);
```

---

## Middleware Details

### `authenticate` (`apps/backend/src/middleware/auth.ts`)

Extracts the JWT access token from the request cookie, verifies it, checks the token blacklist, and sets `req.user` with the payload.

```ts
req.user = {
  userId: string,
  email: string,
  role: string, // Global user role (from JWT)
  jti: string, // Token ID for revocation
  iat: number, // Issued at
};
```

### `requireOrganizationPermission(...permissions)` (`apps/backend/src/middleware/organization-permission.ts`)

Looks up the user's role in the specific organization via `organizationRepo.getMemberRole()`, checks against the `ORG_ROLE_PERMISSIONS` map, and caches the role on `req.organizationRole` for downstream use.

**Resolution order for organization ID:**

1. `req.organizationId` (set by tenant middleware)
2. `req.params.organizationId` (from route params)
3. `req.query.organizationId` (from query string)

**Owner bypass:** The `owner` role passes all permission checks without map lookup.

### `requirePermission(...permissions)` (`apps/backend/src/middleware/permission.ts`)

Global permission check based on the JWT role (no DB query). Used for workspace/board/task-level permissions, not organization-scoped operations.

---

## Service Layer Authorization

### `assertPermission(role, permission)`

Validates that a user's role grants the required permission. Uses the same `ORG_ROLE_PERMISSIONS` map as the middleware (defense-in-depth).

```ts
function assertPermission(role: string | undefined, permission: string): void {
  if (!role) throw AppError.forbidden('You are not a member of this organization');
  if (role === 'owner') return; // Owner bypass

  const permissions = ORG_ROLE_PERMISSIONS[role] ?? [];
  if (!permissions.includes(permission)) {
    throw AppError.forbidden('Insufficient organization permissions');
  }
}
```

### `validateRole(role)`

Validates that a role string is one of the valid `ORGANIZATION_ROLES`. Defense-in-depth against schema bypass.

```ts
function validateRole(role: string): void {
  if (!(ORGANIZATION_ROLES as readonly string[]).includes(role)) {
    throw AppError.badRequest(
      `Invalid role '${role}'. Must be one of: owner, admin, member, guest`,
    );
  }
}
```

### `assertCanAssignRole(assignerRole, targetRole)`

Enforces role hierarchy rules to prevent privilege escalation:

```ts
function assertCanAssignRole(assignerRole: string, targetRole: string): void {
  const assignerLevel = ROLE_HIERARCHY[assignerRole] ?? 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] ?? 0;

  // Only owners can assign the owner role
  if (targetRole === 'owner' && assignerRole !== 'owner') {
    throw AppError.forbidden('Only the organization owner can assign the owner role');
  }

  // Cannot assign a role equal to or higher than your own
  if (targetLevel >= assignerLevel) {
    throw AppError.forbidden(
      `Cannot assign a role equal to or higher than your own (${assignerRole})`,
    );
  }
}
```

---

## Resource Authorization

### Membership Verification

Every read operation on organization resources verifies the requester is a member:

```ts
// getOrganization
const isMember = await organizationRepo.isMember(repoDb, orgId, requestedBy);
if (!isMember) {
  throw AppError.forbidden('You are not a member of this organization');
}

// getOrganizationMembers
const isMember = await organizationRepo.isMember(repoDb, orgId, requestedBy);
if (!isMember) {
  throw AppError.forbidden('You are not a member of this organization');
}
```

### Write Operation Authorization

Write operations require both membership AND the appropriate permission:

```ts
// 1. Verify membership (via getMemberRole)
const role = await organizationRepo.getMemberRole(repoDb, orgId, requestedBy);

// 2. Check permission
assertPermission(role, PERMISSIONS.ORGANIZATION.UPDATE);

// 3. Additional business rules (e.g., role hierarchy for member management)
assertCanAssignRole(requesterRole!, targetRole);
```

---

## Tenant Isolation

### Organization-Scoped Queries

All queries that return organization data are filtered by `organization_id`:

```ts
// Find org by ID
db.select().from(organizations).where(eq(organizations.id, id));

// Find orgs a user belongs to
db.select()
  .from(organizations)
  .innerJoin(organizationMembers, eq(organizations.id, organizationMembers.organizationId))
  .where(eq(organizationMembers.userId, userId));

// Find members of an org
db.select().from(organizationMembers).where(eq(organizationMembers.organizationId, organizationId));
```

### Cross-Organization Access Prevention

1. **Membership check**: Users can only see orgs they belong to (enforced by `isMember` / `findByUserId`).
2. **Permission check**: Users can only perform actions their role permits within the org.
3. **UUID validation**: All path parameters are validated as UUIDs before DB queries.
4. **Membership check on reads**: `getOrganization` and `getOrganizationMembers` both verify membership before returning data.

---

## Error Responses

### Authorization Errors

| HTTP Status | Code           | Condition                                 |
| ----------- | -------------- | ----------------------------------------- |
| `401`       | `UNAUTHORIZED` | Not authenticated (missing/invalid token) |
| `403`       | `FORBIDDEN`    | Not a member of the organization          |
| `403`       | `FORBIDDEN`    | Insufficient role permissions             |
| `403`       | `FORBIDDEN`    | Cannot assign role (hierarchy violation)  |
| `403`       | `FORBIDDEN`    | Only owner can assign owner role          |

### Error Message Strategy

Error messages are **generic** to prevent information disclosure:

- ✅ `"You are not a member of this organization"` (not "User X is not a member")
- ✅ `"Insufficient organization permissions"` (not "Admin cannot delete")
- ✅ `"Cannot remove the organization owner"` (not "User X is the owner")
- ✅ `"Member not found"` (not "User X is not a member" — avoids probing)

---

## Security Properties

### What's Prevented

| Attack                     | Mitigation                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| **Privilege escalation**   | `assertCanAssignRole` enforces hierarchy; Zod schema excludes `owner` from assignable roles |
| **Owner hijacking**        | Only owner can assign owner role; owner cannot be removed                                   |
| **Unauthorized access**    | Membership verified on all read operations                                                  |
| **Cross-tenant access**    | All queries scoped by `organization_id`                                                     |
| **Information disclosure** | Generic error messages; membership check on member listing                                  |
| **Slug collision**         | Unique constraint + PG 23505 catch for race conditions                                      |
| **Invalid roles**          | Zod validation + `validateRole()` + DB CHECK constraint                                     |
| **Rate limiting**          | Write operations rate-limited to prevent abuse                                              |

### Defense-in-Depth Layers

1. **Zod schema**: `AddOrganizationMemberSchema` restricts roles to `['admin', 'member', 'guest']` (no `owner`)
2. **Service validation**: `validateRole()` checks against `ORGANIZATION_ROLES` constant
3. **Hierarchy enforcement**: `assertCanAssignRole()` prevents escalation
4. **DB CHECK constraint**: `role IN ('owner', 'admin', 'member', 'guest')` prevents invalid values at storage level

---

## File Reference

| Layer                         | File                                                            |
| ----------------------------- | --------------------------------------------------------------- |
| Auth middleware               | `apps/backend/src/middleware/auth.ts`                           |
| Org permission middleware     | `apps/backend/src/middleware/organization-permission.ts`        |
| Global permission middleware  | `apps/backend/src/middleware/permission.ts`                     |
| Role middleware               | `apps/backend/src/middleware/role.ts`                           |
| Tenant middleware             | `apps/backend/src/middleware/tenant.ts`                         |
| Service (authorization logic) | `apps/backend/src/modules/organization/organization.service.ts` |
| Repository (DB queries)       | `packages/db/src/repositories/organization.repository.ts`       |
| Schema (constraints)          | `packages/db/src/schema/organization-members.ts`                |
| Role constants                | `packages/shared/src/constants/roles.ts`                        |
| Permission constants          | `packages/shared/src/constants/permissions.ts`                  |
| Validation schemas            | `packages/shared/src/schemas/organization.ts`                   |
| Migration (CHECK constraint)  | `packages/db/migrations/0002_add_org_member_role_check.sql`     |

---

## Related Documentation

- [Organization Create & Read](./create-read.md)
- [Organization Lifecycle](./lifecycle.md)
