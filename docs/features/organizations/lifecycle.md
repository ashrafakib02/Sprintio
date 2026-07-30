# Organization Lifecycle Management

## Overview

Organization lifecycle management provides the full set of operations for managing an organization's lifecycle from creation through archival and permanent deletion. It implements a **soft-delete strategy** where organizations can be archived (hidden from default views but preserved in the database) and later restored, or permanently deleted with cascade to all child resources.

The lifecycle is enforced at the **service layer** with role-based permission checks, state-transition guards, and database-level uniqueness constraints that handle concurrent requests safely.

### Design Principles

- **Soft-delete first**: Archive preserves all data; only explicit delete is permanent.
- **Cascading deletes are irreversible**: Deleting an organization removes members, workspaces, and all nested resources.
- **Permission-gated operations**: Each lifecycle action requires a specific permission, enforced at both the middleware and service layers.
- **State-transition guards**: Invalid transitions (e.g., archiving an already-archived org) return clear error messages.
- **Race-condition safe**: Slug uniqueness is enforced via PostgreSQL unique constraints with application-level catch for error code `23505`.

---

## State Machine

```
                    ┌──────────────────────────────────┐
                    │                                  │
                    ▼                                  │
    ┌───────────────────────┐   restore    ┌──────────┴──────────┐
    │                       │ ◄─────────── │                     │
    │       ACTIVE          │              │     ARCHIVED        │
    │  (archivedAt = NULL)  │ ──────────►  │ (archivedAt = ts)   │
    │                       │   archive    │                     │
    └───────────┬───────────┘              └──────────┬──────────┘
                │                                     │
                │ delete                              │ delete
                │                                     │
                ▼                                     ▼
        ┌───────────────┐                     ┌───────────────┐
        │               │                     │               │
        │   DELETED     │                     │   DELETED     │
        │  (hard delete)│                     │  (hard delete)│
        └───────────────┘                     └───────────────┘
```

### State Definitions

| State        | `archivedAt`       | Visible in Default Listing | Updatable | Archivable | Restorable |
| ------------ | ------------------ | -------------------------- | --------- | ---------- | ---------- |
| **Active**   | `NULL`             | Yes                        | Yes       | Yes        | No         |
| **Archived** | Non-null timestamp | No                         | No        | No         | Yes        |
| **Deleted**  | N/A (row removed)  | N/A                        | N/A       | N/A        | N/A        |

### Valid Transitions

| From     | To       | Operation               | Permission Required   |
| -------- | -------- | ----------------------- | --------------------- |
| Active   | Archived | `archiveOrganization()` | `organization:update` |
| Archived | Active   | `restoreOrganization()` | `organization:update` |
| Active   | Deleted  | `deleteOrganization()`  | `organization:delete` |
| Archived | Deleted  | `deleteOrganization()`  | `organization:delete` |

### Invalid Transitions

| From     | To                   | Operation               | Error Message                                                 |
| -------- | -------------------- | ----------------------- | ------------------------------------------------------------- |
| Archived | Archived             | `archiveOrganization()` | `"Organization is already archived"`                          |
| Active   | Active (via restore) | `restoreOrganization()` | `"Organization is not archived"`                              |
| Archived | Active (via update)  | `updateOrganization()`  | `"Cannot update an archived organization. Restore it first."` |

---

## API Endpoints

All endpoints are prefixed with `/api/organizations`.

### 1. Update Organization

Updates an organization's name, description, or website. Changing the name regenerates the slug.

```
PATCH /api/organizations/:organizationId
```

#### Authentication

Required. User must be authenticated.

#### Authorization

Requires `organization:update` permission (owner or admin).

#### Request Body

| Field         | Type             | Required | Constraints                   | Description                                       |
| ------------- | ---------------- | -------- | ----------------------------- | ------------------------------------------------- |
| `name`        | `string`         | No       | `1–100` characters            | Organization name. Slug is regenerated.           |
| `description` | `string \| null` | No       | `≤ 500` characters            | Organization description. Set to `null` to clear. |
| `website`     | `string \| null` | No       | Valid URL, `≤ 500` characters | Organization website. Set to `null` to clear.     |

All fields are optional. At least one field must be provided (enforced by Zod).

**Note:** Updating an archived organization returns `400 Bad Request`. Restore the organization first.

#### Response

```json
// 200 OK
{
  "success": true,
  "data": {
    "organization": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "description": "The best company",
      "logo": null,
      "website": "https://acme.com",
      "archivedAt": null,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-07-29T14:00:00.000Z"
    }
  }
}
```

#### Error Responses

| Status | Code                  | Condition                                            |
| ------ | --------------------- | ---------------------------------------------------- |
| `400`  | `BAD_REQUEST`         | Invalid UUID format for `organizationId`             |
| `400`  | `BAD_REQUEST`         | Organization is archived                             |
| `400`  | `BAD_REQUEST`         | Validation failed (e.g., name too long, invalid URL) |
| `401`  | `UNAUTHORIZED`        | Not authenticated                                    |
| `403`  | `FORBIDDEN`           | User is not a member of the organization             |
| `403`  | `FORBIDDEN`           | User lacks `organization:update` permission          |
| `404`  | `NOT_FOUND`           | Organization does not exist                          |
| `409`  | `CONFLICT`            | Slug conflicts with another organization             |
| `429`  | `RATE_LIMIT_EXCEEDED` | Too many requests (rate limit: 30 / 15 min)          |
| `500`  | `INTERNAL_ERROR`      | Database update failed unexpectedly                  |

#### Slug Race Condition Handling

When changing the name, the service performs an optimistic check for slug uniqueness, then catches PostgreSQL unique-constraint violations (error code `23505`) to handle the case where a concurrent request inserted the same slug between the check and the update. This converts the raw database error into a user-friendly `409 CONFLICT` response.

---

### 2. Archive Organization

Soft-deletes an organization by setting `archivedAt` to the current timestamp. The organization is hidden from default listings but all data (members, workspaces, tasks) is preserved.

```
POST /api/organizations/:organizationId/archive
```

#### Authentication

Required.

#### Authorization

Requires `organization:update` permission (owner or admin).

#### Request Body

None.

#### Response

```json
// 200 OK
{
  "success": true,
  "data": {
    "organization": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "description": "The best company",
      "logo": null,
      "website": "https://acme.com",
      "archivedAt": "2025-07-29T14:30:00.000Z",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-07-29T14:30:00.000Z"
    }
  }
}
```

#### Error Responses

| Status | Code             | Condition                                          |
| ------ | ---------------- | -------------------------------------------------- |
| `400`  | `BAD_REQUEST`    | Invalid UUID format for `organizationId`           |
| `400`  | `BAD_REQUEST`    | Organization is already archived                   |
| `401`  | `UNAUTHORIZED`   | Not authenticated                                  |
| `403`  | `FORBIDDEN`      | User is not a member / lacks `organization:update` |
| `404`  | `NOT_FOUND`      | Organization does not exist                        |
| `500`  | `INTERNAL_ERROR` | Database update failed unexpectedly                |

#### Cascade Behavior

Archiving does **NOT** cascade. Members, workspaces, and all nested resources remain intact. The only change is the `archivedAt` timestamp on the organization row.

---

### 3. Restore Organization

Restores an archived organization by clearing `archivedAt` (setting it to `null`). The organization reappears in default listings.

```
POST /api/organizations/:organizationId/restore
```

#### Authentication

Required.

#### Authorization

Requires `organization:update` permission (owner or admin).

#### Request Body

None.

#### Response

```json
// 200 OK
{
  "success": true,
  "data": {
    "organization": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "description": "The best company",
      "logo": null,
      "website": "https://acme.com",
      "archivedAt": null,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-07-29T14:35:00.000Z"
    }
  }
}
```

#### Error Responses

| Status | Code             | Condition                                          |
| ------ | ---------------- | -------------------------------------------------- |
| `400`  | `BAD_REQUEST`    | Invalid UUID format for `organizationId`           |
| `400`  | `BAD_REQUEST`    | Organization is not archived                       |
| `401`  | `UNAUTHORIZED`   | Not authenticated                                  |
| `403`  | `FORBIDDEN`      | User is not a member / lacks `organization:update` |
| `404`  | `NOT_FOUND`      | Organization does not exist                        |
| `500`  | `INTERNAL_ERROR` | Database update failed unexpectedly                |

---

### 4. Delete Organization

Permanently deletes an organization and **all** associated resources via database cascade. This operation is **irreversible**.

```
DELETE /api/organizations/:organizationId
```

#### Authentication

Required.

#### Authorization

Requires `organization:delete` permission (**owner only**).

#### Request Body

None.

#### Response

```json
// 200 OK
{
  "success": true,
  "data": {
    "message": "Organization deleted"
  }
}
```

#### Error Responses

| Status | Code             | Condition                                          |
| ------ | ---------------- | -------------------------------------------------- |
| `400`  | `BAD_REQUEST`    | Invalid UUID format for `organizationId`           |
| `401`  | `UNAUTHORIZED`   | Not authenticated                                  |
| `403`  | `FORBIDDEN`      | User is not a member / lacks `organization:delete` |
| `404`  | `NOT_FOUND`      | Organization does not exist                        |
| `500`  | `INTERNAL_ERROR` | Database delete failed unexpectedly                |

#### Cascade Behavior

Deleting an organization cascades to and permanently removes:

| Table                     | Relationship                           |
| ------------------------- | -------------------------------------- |
| `organization_members`    | All membership records                 |
| `workspaces`              | All workspaces in the organization     |
| `workspace_members`       | Members of those workspaces            |
| `projects`, `tasks`, etc. | All nested resources within workspaces |

> **Warning**: This operation cannot be undone. Consider archiving instead if you may need to recover the organization later.

---

## Permission Matrix

Permissions are role-based. The `owner` role always passes all permission checks (bypass).

| Operation                | Owner | Admin                                | Member | Guest |
| ------------------------ | ----- | ------------------------------------ | ------ | ----- |
| Create organization      | Yes   | N/A (uses membership, not org perms) | N/A    | N/A   |
| Read organization        | Yes   | Yes                                  | Yes    | Yes   |
| List organizations       | Yes   | Yes                                  | Yes    | Yes   |
| **Update organization**  | Yes   | Yes                                  | No     | No    |
| **Archive organization** | Yes   | Yes                                  | No     | No    |
| **Restore organization** | Yes   | Yes                                  | No     | No    |
| **Delete organization**  | Yes   | No                                   | No     | No    |
| Manage members           | Yes   | Yes                                  | No     | No    |

### Permission Constants

```
organization:create          — Create new organizations
organization:update          — Update, archive, restore
organization:delete          — Permanently delete
organization:manage_members  — Add/remove members, change roles
organization:manage_billing  — Manage billing settings
organization:settings        — Organization settings
```

### Enforcement Layers

Permissions are checked at **two layers**:

1. **Middleware** (`requireOrganizationPermission`): Applied to routes. Resolves the user's role from the database, checks the required permission, and caches the role on `req.organizationRole` for downstream use. Returns `403` immediately if unauthorized.

2. **Service layer** (`assertPermission`): Each service method independently validates the permission. This provides defense-in-depth in case a route is accessed without middleware (e.g., internal service calls).

---

## Soft Delete Strategy

### Archive vs. Delete

| Aspect                   | Archive (Soft Delete)       | Delete (Hard Delete)                 |
| ------------------------ | --------------------------- | ------------------------------------ |
| **Mechanism**            | Sets `archivedAt` timestamp | Removes row from database            |
| **Reversible?**          | Yes (via restore)           | No                                   |
| **Data preserved?**      | Yes — all data intact       | No — cascades to all children        |
| **Visible in listings?** | No (filtered by default)    | N/A (row no longer exists)           |
| **Updatable?**           | No (must restore first)     | N/A                                  |
| **Members affected?**    | No — membership preserved   | Yes — all membership records deleted |
| **Workspaces affected?** | No — workspaces preserved   | Yes — all workspaces cascaded        |
| **Slug freed?**          | No — still reserved         | Yes — slug becomes available         |
| **Permission required**  | `organization:update`       | `organization:delete`                |

### Listing Behavior

The `GET /api/organizations` endpoint accepts an `includeArchived` query parameter:

```
GET /api/organizations?includeArchived=false   (default — active only)
GET /api/organizations?includeArchived=true    (all, including archived)
```

Archived organizations have `archivedAt` set to a non-null ISO timestamp, which the frontend can use to display archival status.

---

## Audit Fields

| Field        | Type                  | Set On  | Updated On        | Description                                              |
| ------------ | --------------------- | ------- | ----------------- | -------------------------------------------------------- |
| `createdAt`  | `TIMESTAMPTZ`         | Insert  | Never             | When the organization was created                        |
| `updatedAt`  | `TIMESTAMPTZ`         | Insert  | Every update      | Auto-updated via Drizzle's `$onUpdate(() => new Date())` |
| `archivedAt` | `TIMESTAMPTZ \| NULL` | Archive | Archive / Restore | `NULL` = active; non-null = archived timestamp           |

All timestamps are stored in UTC with timezone information (`TIMESTAMPTZ`). The API serializes them as ISO 8601 strings (e.g., `2025-07-29T14:30:00.000Z`).

### How `updatedAt` Works

Drizzle ORM's `$onUpdate(() => new Date())` is configured on the `updatedAt` column. This means every `UPDATE` query on the `organizations` table automatically sets `updatedAt` to the current time — no application code needed.

---

## Data Model

```sql
organizations (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  logo        TEXT,
  website     VARCHAR(500),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ   -- NULL = active, non-NULL = archived
)
```

### Constraints

- **`slug UNIQUE`**: Prevents duplicate slugs. The application catches PostgreSQL error code `23505` (unique_violation) and converts it to a user-friendly `409 CONFLICT` response.
- **`archived_at` nullable**: `NULL` indicates an active organization. A non-null value indicates the organization is archived.

---

## Error Responses

All errors follow a consistent shape:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE"
}
```

### Error Codes Reference

| Code                  | HTTP Status | Meaning                                                        |
| --------------------- | ----------- | -------------------------------------------------------------- |
| `BAD_REQUEST`         | `400`       | Invalid input, invalid state transition, or validation failure |
| `UNAUTHORIZED`        | `401`       | Not authenticated (missing or invalid token)                   |
| `FORBIDDEN`           | `403`       | Authenticated but lacks required permission                    |
| `NOT_FOUND`           | `404`       | Organization does not exist                                    |
| `CONFLICT`            | `409`       | Slug uniqueness conflict (another org has a similar name)      |
| `RATE_LIMIT_EXCEEDED` | `429`       | Too many requests (rate limiter triggered)                     |
| `INTERNAL_ERROR`      | `500`       | Unexpected server error                                        |

### Per-Endpoint Error Summary

| Endpoint            | 400 | 401 | 403 | 404 | 409 | 429 | 500 |
| ------------------- | --- | --- | --- | --- | --- | --- | --- |
| `PATCH /:id`        | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `POST /:id/archive` | Yes | Yes | Yes | Yes | No  | No  | Yes |
| `POST /:id/restore` | Yes | Yes | Yes | Yes | No  | No  | Yes |
| `DELETE /:id`       | Yes | Yes | Yes | Yes | No  | No  | Yes |

### Rate Limits

| Scope                              | Window     | Max Requests |
| ---------------------------------- | ---------- | ------------ |
| Organization CRUD (create, update) | 15 minutes | 30           |
| Member management (add, remove)    | 15 minutes | 20           |

---

## Examples

### Update Organization

```bash
curl -X PATCH http://localhost:3000/api/organizations/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Acme Corporation",
    "description": "The best company in the world",
    "website": "https://acme.com"
  }'
```

#### Update — Clear the description

```bash
curl -X PATCH http://localhost:3000/api/organizations/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "description": null
  }'
```

#### Update — Archived org (error)

```bash
curl -X PATCH http://localhost:3000/api/organizations/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "New Name"
  }'

# Response: 400
# { "error": "Cannot update an archived organization. Restore it first.", "code": "BAD_REQUEST" }
```

### Archive Organization

```bash
curl -X POST http://localhost:3000/api/organizations/550e8400-e29b-41d4-a716-446655440000/archive \
  -H "Authorization: Bearer <token>"
```

#### Archive — Already archived (error)

```bash
curl -X POST http://localhost:3000/api/organizations/550e8400-e29b-41d4-a716-446655440000/archive \
  -H "Authorization: Bearer <token>"

# Response: 400
# { "error": "Organization is already archived", "code": "BAD_REQUEST" }
```

### Restore Organization

```bash
curl -X POST http://localhost:3000/api/organizations/550e8400-e29b-41d4-a716-446655440000/restore \
  -H "Authorization: Bearer <token>"
```

#### Restore — Not archived (error)

```bash
curl -X POST http://localhost:3000/api/organizations/550e8400-e29b-41d4-a716-446655440000/restore \
  -H "Authorization: Bearer <token>"

# Response: 400
# { "error": "Organization is not archived", "code": "BAD_REQUEST" }
```

### Delete Organization

```bash
curl -X DELETE http://localhost:3000/api/organizations/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <token>"

# Response: 200
# { "success": true, "data": { "message": "Organization deleted" } }
```

#### Delete — Insufficient permissions (error)

```bash
curl -X DELETE http://localhost:3000/api/organizations/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <token>"

# Response: 403
# { "error": "Insufficient organization permissions", "code": "FORBIDDEN" }
```

### List Organizations (Including Archived)

```bash
curl -X GET "http://localhost:3000/api/organizations?includeArchived=true" \
  -H "Authorization: Bearer <token>"
```

---

## Service Layer Implementation Notes

### File Locations

| Layer            | File                                                               |
| ---------------- | ------------------------------------------------------------------ |
| Service          | `apps/backend/src/modules/organization/organization.service.ts`    |
| Controller       | `apps/backend/src/modules/organization/organization.controller.ts` |
| Routes           | `apps/backend/src/modules/organization/organization.routes.ts`     |
| Middleware       | `apps/backend/src/middleware/organization-permission.ts`           |
| Schema (Drizzle) | `packages/db/src/schema/organizations.ts`                          |
| Repository       | `packages/db/src/repositories/organization.repository.ts`          |
| Validation (Zod) | `packages/shared/src/schemas/organization.ts`                      |

### Architectural Decisions

1. **Dual permission checks**: Middleware checks permissions before the handler runs. The service method also checks via `assertPermission()`. This defense-in-depth prevents accidental exposure if a route is registered without middleware.

2. **Slug race condition handling**: Both `createOrganization` and `updateOrganization` use an optimistic check (`findBySlug`) followed by a `try/catch` that detects PostgreSQL error code `23505` (unique_violation). This handles the TOCTOU window where two concurrent requests both pass the uniqueness check before either commits.

3. **Archived org update guard**: `updateOrganization` checks `org.archivedAt` before processing any updates. If archived, it returns `400 Bad Request` with a message suggesting the user restore first. This prevents modifications to organizations that are hidden from default views.

4. **Soft-delete as default**: Archiving is the recommended way to deactivate an organization. Hard delete is reserved for permanent removal and requires the higher `organization:delete` permission (owner only).

5. **No active-workspace guard on archive**: Archiving does not check for open tasks or active workspaces. This is intentional — the archive operation is non-destructive and all data is preserved. If workspace-level safeguards are needed, they should be enforced at the workspace layer.

---

## Related Documentation

- [Organization Create & Read](./create-read.md)
- [Workspace Foundation](../workspace-foundation.md)
