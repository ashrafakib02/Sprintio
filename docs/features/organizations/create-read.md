# Organization Create & Read API

## Overview

This document describes the Organization Create and Read API endpoints for the Sprintio backend. Organizations are top-level containers that group workspaces and manage membership at the company level.

## Architecture

The organization feature follows a layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                        Express Routes                         │
│  POST /api/organizations    GET /api/organizations            │
│  GET  /api/organizations/:organizationId                      │
└──────────────────────────┬────────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────────┐
│                      Controllers                                │
│  createOrganization, getOrganization, listOrganizations        │
└──────────────────────────┬────────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────────┐
│                      Services                                   │
│  createOrganization, getOrganization, getUserOrganizations     │
└──────────────────────────┬────────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────────┐
│                      Repository (Drizzle ORM)                   │
│  findById, findBySlug, findByUserIdFiltered, create            │
└──────────────────────────┬────────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────────┐
│                      Database Schema (PostgreSQL)               │
│  organizations table                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### organizations table

```sql
CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,
  slug            VARCHAR(100) NOT NULL UNIQUE,
  description     TEXT,
  logo            TEXT,
  website         VARCHAR(500),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at     TIMESTAMPTZ
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
```

### organization_members table

```sql
CREATE TABLE organization_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role              VARCHAR(20) NOT NULL DEFAULT 'member',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
```

### Organization Roles

| Role   | Permissions                                                                        |
| ------ | ---------------------------------------------------------------------------------- |
| owner  | All permissions (create, update, delete, manage_members, manage_billing, settings) |
| admin  | update, manage_members, settings                                                   |
| member | (none - view only)                                                                 |
| guest  | (none - view only)                                                                 |

## API Endpoints

### Create Organization

Creates a new organization. The authenticated user becomes the **owner**.

```
POST /api/organizations
```

#### Authentication

Required: Bearer token (access token in cookie or Authorization header)

#### Request Body

| Field       | Type   | Required | Validation                    |
| ----------- | ------ | -------- | ----------------------------- |
| name        | string | Yes      | 1-100 characters              |
| description | string | No       | Max 500 characters            |
| website     | string | No       | Valid URL, max 500 characters |

The `slug` is auto-generated from the name using `slugify()`.

#### Example Request

```bash
curl -X POST http://localhost:3001/api/organizations \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=eyJhbGciOiJIUzI1NiIs..." \
  -d '{
    "name": "Acme Corporation",
    "description": "Our company organization",
    "website": "https://acme.com"
  }'
```

#### Success Response (201 Created)

```json
{
  "data": {
    "organization": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Acme Corporation",
      "slug": "acme-corporation",
      "description": "Our company organization",
      "logo": null,
      "website": "https://acme.com",
      "archivedAt": null,
      "createdAt": "2026-07-29T12:34:56.789Z",
      "updatedAt": "2026-07-29T12:34:56.789Z"
    }
  }
}
```

#### Error Responses

| Status | Code                | Message                                            |
| ------ | ------------------- | -------------------------------------------------- |
| 400    | VALIDATION_ERROR    | Validation error messages joined by comma          |
| 401    | UNAUTHORIZED        | Authentication required                            |
| 409    | CONFLICT            | An organization with a similar name already exists |
| 429    | RATE_LIMIT_EXCEEDED | Too many requests, please try again later          |
| 500    | INTERNAL_ERROR      | Failed to create organization                      |

---

### Get Organization by ID

Retrieves a single organization by its UUID. The authenticated user must be a member of the organization.

```
GET /api/organizations/:organizationId
```

#### Authentication

Required: Bearer token + organization membership

#### Path Parameters

| Parameter      | Type | Required | Description       |
| -------------- | ---- | -------- | ----------------- |
| organizationId | UUID | Yes      | Organization UUID |

#### Example Request

```bash
curl -X GET http://localhost:3001/api/organizations/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Cookie: access_token=eyJhbGciOiJIUzI1NiIs..."
```

#### Success Response (200 OK)

```json
{
  "data": {
    "organization": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Acme Corporation",
      "slug": "acme-corporation",
      "description": "Our company organization",
      "logo": null,
      "website": "https://acme.com",
      "archivedAt": null,
      "createdAt": "2026-07-29T12:34:56.789Z",
      "updatedAt": "2026-07-29T12:34:56.789Z"
    }
  }
}
```

#### Error Responses

| Status | Code           | Message                                   |
| ------ | -------------- | ----------------------------------------- |
| 400    | BAD_REQUEST    | Organization ID is required               |
| 401    | UNAUTHORIZED   | Authentication required                   |
| 403    | FORBIDDEN      | You are not a member of this organization |
| 404    | NOT_FOUND      | Organization not found                    |
| 500    | INTERNAL_ERROR | Failed to fetch organization              |

---

### List User Organizations

Returns all organizations the authenticated user belongs to.

```
GET /api/organizations
```

#### Authentication

Required: Bearer token

#### Query Parameters

| Parameter       | Type    | Required | Default | Description                    |
| --------------- | ------- | -------- | ------- | ------------------------------ |
| includeArchived | boolean | No       | false   | Include archived organizations |

#### Example Request

```bash
# List active organizations
curl -X GET http://localhost:3001/api/organizations \
  -H "Cookie: access_token=eyJhbGciOiJIUzI1NiIs..."

# Include archived organizations
curl -X GET "http://localhost:3001/api/organizations?includeArchived=true" \
  -H "Cookie: access_token=eyJhbGciOiJIUzI1NiIs..."
```

#### Success Response (200 OK)

```json
{
  "data": {
    "organizations": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "name": "Acme Corporation",
        "slug": "acme-corporation",
        "description": "Our company organization",
        "logo": null,
        "website": "https://acme.com",
        "archivedAt": null,
        "createdAt": "2026-07-29T12:34:56.789Z",
        "updatedAt": "2026-07-29T12:34:56.789Z"
      },
      {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "name": "Personal Projects",
        "slug": "personal-projects",
        "description": null,
        "logo": null,
        "website": null,
        "archivedAt": null,
        "createdAt": "2026-07-20T08:15:23.456Z",
        "updatedAt": "2026-07-20T08:15:23.456Z"
      }
    ]
  }
}
```

#### Error Responses

| Status | Code           | Message                       |
| ------ | -------------- | ----------------------------- |
| 401    | UNAUTHORIZED   | Authentication required       |
| 500    | INTERNAL_ERROR | Failed to fetch organizations |

---

## Zod Validation Schemas

Located in `packages/shared/src/schemas/organization.ts`:

### CreateOrganizationSchema

```typescript
export const CreateOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100),
  description: z.string().max(500).optional(),
  website: z.string().url().max(500).optional(),
});
```

### UpdateOrganizationSchema

```typescript
export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  website: z.string().url().max(500).nullable().optional(),
});
```

### AddOrganizationMemberSchema

```typescript
export const AddOrganizationMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'member', 'guest']).default('member'),
});
```

### ListOrganizationsSchema

```typescript
export const ListOrganizationsSchema = z.object({
  includeArchived: z.enum(['true', 'false']).default('false').optional(),
});
```

---

## Error Handling

All endpoints use standardized error handling via `AppError` class from `@sprintio/shared`:

```typescript
// Error codes
AppError.notFound('Organization'); // 404
AppError.conflict('An organization with a similar name already exists'); // 409
AppError.forbidden('You are not a member of this organization'); // 403
AppError.badRequest('Organization ID is required'); // 400
AppError.unauthorized('Authentication required'); // 401
AppError.internal('Failed to create organization'); // 500
```

Error response format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## Rate Limiting

| Endpoint                   | Limit        | Window     |
| -------------------------- | ------------ | ---------- |
| POST /api/organizations    | 30 requests  | 15 minutes |
| GET /api/organizations     | 100 requests | 15 minutes |
| GET /api/organizations/:id | 100 requests | 15 minutes |

---

## Testing

### Unit Tests

Test files should be created at:

- `apps/backend/src/__tests__/unit/modules/organization/organization.service.test.ts`
- `apps/backend/src/__tests__/unit/modules/organization/organization.controller.test.ts`

### Integration Tests

Test files should be created at:

- `apps/backend/src/__tests__/integration/organization.service.test.ts`

### Test Coverage Requirements

- [ ] Create organization - success case
- [ ] Create organization - validation failure
- [ ] Create organization - slug conflict
- [ ] Create organization - unauthorized
- [ ] Create organization - rate limited
- [ ] Get organization - success case
- [ ] Get organization - not found
- [ ] Get organization - not a member
- [ ] List organizations - success case
- [ ] List organizations - include archived
- [ ] List organizations - unauthorized

---

## Implementation Files

| Layer           | File                                                               |
| --------------- | ------------------------------------------------------------------ |
| Database Schema | `packages/db/src/schema/organizations.ts`                          |
| Repository      | `packages/db/src/repositories/organization.repository.ts`          |
| Service         | `apps/backend/src/modules/organization/organization.service.ts`    |
| Controller      | `apps/backend/src/modules/organization/organization.controller.ts` |
| Routes          | `apps/backend/src/modules/organization/organization.routes.ts`     |
| Validation      | `packages/shared/src/schemas/organization.ts`                      |
| Types           | `packages/shared/src/types/organization.ts`                        |
| Module Export   | `apps/backend/src/modules/organization/index.ts`                   |

---

## Related Documentation

- [Organization Membership API](./membership.md) - Add/remove/list members
- [Workspace Foundation](../workspace/workspace-foundation.md) - Workspaces under organizations
- [Authentication](../auth/auth-foundation.md) - Auth middleware and tokens
- [Permission System](../permissions.md) - Role-based access control

---

## Future Enhancements (Out of Scope)

The following are **not implemented** in this feature:

- [ ] Update Organization (PATCH /api/organizations/:id)
- [ ] Archive Organization (POST /api/organizations/:id/archive)
- [ ] Restore Organization (POST /api/organizations/:id/restore)
- [ ] Delete Organization (DELETE /api/organizations/:id)
- [ ] Organization Invitations
- [ ] Ownership Transfer
- [ ] Organization Settings API
- [ ] Billing Integration
- [ ] Audit Logging

See [Future Work](../FUTURE_ROADMAP.md) for planned enhancements.
