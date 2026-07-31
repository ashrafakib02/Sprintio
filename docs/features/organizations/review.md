# Organization Module — Code Review

## Overview

Full code review of the Organization module covering architecture, security, performance, maintainability, and type safety. The module spans 13 files across 3 packages.

## Files Reviewed

| Package           | File                                                                                                                                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/db`     | `src/schema/organizations.ts`, `src/schema/organization-members.ts`, `src/schema/relations.ts`, `src/repositories/organization.repository.ts`, `migrations/0001_organizations.sql`, `migrations/0002_add_org_member_role_check.sql` |
| `packages/shared` | `src/schemas/organization.ts`, `src/constants/permissions.ts`, `src/constants/roles.ts`                                                                                                                                             |
| `apps/backend`    | `src/modules/organization/organization.service.ts`, `src/modules/organization/organization.controller.ts`, `src/modules/organization/organization.routes.ts`, `src/middleware/organization-permission.ts`                           |

## Findings Summary

| Severity       | Count | Description                                              |
| -------------- | ----- | -------------------------------------------------------- |
| **Critical**   | 1     | Duplicated permission map — will drift                   |
| **Warning**    | 6     | Authorization gaps, redundant queries, unsafe assertions |
| **Suggestion** | 7     | Code organization, type narrowing, documentation         |
| **Positive**   | 8     | Clean architecture, defense-in-depth, proper indexing    |

---

## Critical

### 1. Duplicated Permission Map Will Drift

**Files:**

- `apps/backend/src/middleware/organization-permission.ts` (lines 17–29)
- `apps/backend/src/modules/organization/organization.service.ts` (lines 121–137)

The `ORG_ROLE_PERMISSIONS` map is defined **twice** — once in the middleware and once in the service — using different mechanisms. The middleware uses hardcoded string literals (`'organization:create'`, etc.) while the service uses `PERMISSIONS.ORGANIZATION.CREATE` constants. If either map is updated independently, one enforcement point will silently become more or less permissive than the other.

**Impact:** Authorization bypass or lockout. A permission change to one file without updating the other creates an inconsistent security posture.

**Fix:** Extract `ORG_ROLE_PERMISSIONS` into a single shared constant in `packages/shared/src/constants/permissions.ts`. The middleware should import and use `PERMISSIONS.ORGANIZATION.CREATE` instead of string literals.

---

## Warnings

### 2. `getUserOrganizationRole` Lacks Authorization

**Files:**

- `apps/backend/src/modules/organization/organization.service.ts` (lines 452–457)

Takes `orgId` and `userId`, returns the role without verifying that the caller is a member. If ever exposed via a route, this leaks membership and role information to any authenticated user.

**Fix:** Add a `requestedBy` parameter and verify membership before returning the role. Alternatively, remove the function until a route is ready with proper guards.

### 3. Non-Null Assertions on `req.user!`

**File:** `apps/backend/src/modules/organization/organization.controller.ts` (10 occurrences)

Every handler uses `req.user!.userId` with a non-null assertion. If a route is added without the `authenticate` middleware, this throws an unhandled runtime error.

**Fix:** Use a typed `AuthenticatedRequest` interface or a `requireAuth(req)` helper that throws a proper `AppError`.

### 4. Redundant DB Queries in Service Methods

**File:** `apps/backend/src/modules/organization/organization.service.ts`

Multiple methods execute 3–4 sequential queries where 1–2 would suffice:

| Method                  | Queries                                                | Optimization                             |
| ----------------------- | ------------------------------------------------------ | ---------------------------------------- |
| `updateOrganization`    | 4 (findById → getMemberRole → findBySlug → updateById) | Join findById + getMemberRole            |
| `archiveOrganization`   | 3 (findById → getMemberRole → archiveById)             | Join findById + getMemberRole            |
| `deleteOrganization`    | 3 (findById → getMemberRole → deleteById)              | Join findById + getMemberRole            |
| `addOrganizationMember` | 4 (findById → getMemberRole → isMember → addMember)    | Join findById + getMemberRole + isMember |

**Fix:** Add a repository method `findByIdWithMembership(orgId, userId)` that joins organizations and organization_members in a single query.

### 5. No Pagination on `getOrganizationMembers`

**Files:**

- `apps/backend/src/modules/organization/organization.service.ts` (lines 430–447)
- `packages/db/src/repositories/organization.repository.ts` (lines 306–314)

For organizations with thousands of members, this loads every record into memory with no pagination.

**Fix:** Add keyset pagination (cursor on `createdAt` or `id`) with `limit` and expose `page`/`limit` query parameters on `GET /:organizationId/members`.

### 6. Inconsistent Error Response Format

**Files:**

- `apps/backend/src/middleware/organization-permission.ts` (lines 75–79) — returns `{ error, code }`
- `apps/backend/src/modules/organization/organization.controller.ts` (lines 36–38) — returns `{ error }`

The middleware includes a `code` field while controller validation does not, making client-side error handling inconsistent.

**Fix:** Standardize all error responses to include both `error` and `code` fields, or use the `AppError` class consistently throughout.

### 7. Unsafe `req.query` Cast

**File:** `apps/backend/src/middleware/organization-permission.ts` (line 54)

`req.query.organizationId as string` is unsafe — Express query values can be `string | string[] | ParsedQs`. Array values would produce unexpected DB results.

**Fix:** Add a type guard: `typeof rawQuery === 'string' ? rawQuery : undefined`.

---

## Suggestions

### 8. Workspace Schemas in Organization File

**File:** `packages/shared/src/schemas/organization.ts` (lines 24–31)

`AddWorkspaceMemberSchema` and `UpdateWorkspaceMemberSchema` live in the organization schema file. Move to `packages/shared/src/schemas/workspace.ts`.

### 9. Repeated UUID Validation Boilerplate

**File:** `apps/backend/src/modules/organization/organization.controller.ts`

The UUID validation pattern repeats 8 times. Extract an Express middleware factory:

```typescript
function validateOrgIdParam(req, res, next) { ... }
function validateUserIdParam(req, res, next) { ... }
```

### 10. `slugify` Behavior Undocumented

**File:** `apps/backend/src/modules/organization/organization.service.ts` (line 156)

Two different names can produce the same slug (e.g., "My Org" and "my-org"). The conflict error doesn't show the actual conflicting slug. Consider appending a random suffix (e.g., `my-org-a3f2`).

### 11. Repository Return Types Are Manually Defined

**File:** `packages/db/src/repositories/organization.repository.ts` (lines 9–27)

`OrganizationRecord` and `OrganizationMemberRecord` are manually defined and must stay in sync with the schema. Use Drizzle's `InferSelectModel`:

```typescript
import type { InferSelectModel } from 'drizzle-orm';
export type OrganizationRecord = InferSelectModel<typeof organizations>;
```

### 12. `role` Field Is `string` Instead of Union Type

**File:** `packages/db/src/repositories/organization.repository.ts` (line 25)

`OrganizationMemberRecord.role` is typed as `string`. Given the DB CHECK constraint and shared constants, narrow it:

```typescript
type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];
```

### 13. Non-null Assertion on `requesterRole!`

**File:** `apps/backend/src/modules/organization/organization.service.ts` (line 376)

Safe in practice (the preceding `assertPermission` would have thrown), but relies on subtle control-flow guarantees. Refactor `assertPermission` to return the narrowed role type.

### 14. Relations File Co-location

**File:** `packages/db/src/schema/relations.ts` (lines 36–57)

Workspace and organization relations are co-located. Intentional for Drizzle, but may become a merge-conflict hotspot as the team scales.

---

## Positive Findings

### Architecture

- **Clean layering** — schema → repository → service → controller → routes with no layer bypassing
- **Correct dependency direction** — no circular imports across packages
- **Canonical constants** — service imports `PERMISSIONS` from shared, not hardcoded strings

### Security

- **Rate limiting** — write operations rate-limited (30/15min org ops, 20/15min member ops)
- **DB CHECK constraint** — `0002_add_org_member_role_check.sql` provides defense-in-depth
- **Privilege escalation prevention** — `assertCanAssignRole` enforces role hierarchy correctly
- **Soft-delete lifecycle** — `deleteOrganization` enforces archive-before-delete

### Performance

- **Selective column fetching** — `findByUserId` uses explicit columns, not `SELECT *`
- **Proper indexing** — composite unique index on `(organization_id, user_id)`, secondary index on `user_id`, unique constraint on `slug`

### Maintainability

- **`asyncHandler` usage** — all handlers wrapped, preventing unhandled promise rejections
- **Zod schema inference** — input types derived from schemas via `z.infer<>`
- **`as const` on constants** — enables compile-time type checking

---

## Top 3 Priorities

| #   | Severity     | Issue                                                 | Effort |
| --- | ------------ | ----------------------------------------------------- | ------ |
| 1   | **Critical** | Extract `ORG_ROLE_PERMISSIONS` to shared constant     | Small  |
| 2   | **Warning**  | Secure or remove `getUserOrganizationRole`            | Small  |
| 3   | **Warning**  | Replace `req.user!` with typed `AuthenticatedRequest` | Medium |

## Recommendations Roadmap

| Phase           | Items                                                                  | Effort    |
| --------------- | ---------------------------------------------------------------------- | --------- |
| **Immediate**   | #1 (shared permission map), #2 (secure getUserOrganizationRole)        | 1–2 hours |
| **Short-term**  | #3 (AuthenticatedRequest), #5 (member pagination), #6 (error format)   | Half day  |
| **Medium-term** | #4 (query consolidation), #9 (UUID middleware), #11 (InferSelectModel) | 1 day     |
| **Backlog**     | #8, #10, #12, #13, #14                                                 | As needed |
