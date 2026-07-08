# API Architecture

> Sprintio — AI-Enhanced Collaborative Work Management Platform

**Version**: 1.0.0
**Date**: 2026-07-08
**Status**: Approved
**Owner**: Platform Engineering

---

## Table of Contents

1. [Overview](#1-overview)
2. [API Design Principles](#2-api-design-principles)
3. [URL Structure](#3-url-structure)
4. [Request & Response Format](#4-request--response-format)
5. [Pagination](#5-pagination)
6. [Filtering & Sorting](#6-filtering--sorting)
7. [Versioning](#7-versioning)
8. [Error Responses](#8-error-responses)
9. [Rate Limiting](#9-rate-limiting)
10. [OpenAPI Specification](#10-openapi-specification)
11. [Authentication & Authorization](#11-authentication--authorization)
12. [WebSocket API](#12-websocket-api)
13. [Webhook API](#13-webhook-api)
14. [CLI API](#14-cli-api)
15. [API Security](#15-api-security)
16. [Testing Strategy](#16-testing-strategy)
17. [Endpoint Reference](#17-endpoint-reference)
18. [Quick Reference](#18-quick-reference)

---

## 1. Overview

Sprintio exposes a dual-protocol API: **REST** for CRUD operations and **WebSocket** for real-time collaboration. Every endpoint returns **JSON**. The API is fully described by an **OpenAPI 3.1** specification that drives documentation, client generation, and contract testing.

### Design Goals

| Goal | How |
|------|-----|
| **Developer experience** | Consistent naming, predictable URLs, rich error messages |
| **Performance** | Cursor pagination, sparse fieldsets, ETag caching |
| **Security** | OAuth 2.0 + JWT, API keys, rate limiting, input validation |
| **Real-time** | WebSocket channels for task updates, comments, presence, and notifications |
| **Extensibility** | Webhooks, API versioning, OpenAPI-driven code generation |

### Protocol Selection

| Protocol | When | Transport |
|----------|------|-----------|
| **REST** | CRUD, queries, bulk operations, file transfers | HTTPS (HTTP/2) |
| **WebSocket** | Live updates, presence, notifications, collaboration cursors | WSS |
| **Webhooks** | Outbound event delivery to third-party integrations | HTTPS |

---

## 2. API Design Principles

### 2.1 RESTful Conventions

| Principle | Convention |
|-----------|------------|
| **Resources are nouns** | `/tasks`, `/projects`, `/workspaces` — never verbs |
| **HTTP methods = actions** | `GET` read, `POST` create, `PUT` full replace, `PATCH` partial update, `DELETE` remove |
| **Plural nouns** | Always `/tasks`, never `/task` |
| **Nested for context** | `/workspaces/{wid}/projects/{pid}/tasks` for scoped access |
| **Flat for direct access** | `/tasks/{id}` for known-resource access |
| **Idempotency** | `PUT` and `DELETE` are idempotent; `POST` uses `Idempotency-Key` header |
| **Content negotiation** | Default `application/json`; support `application/vnd.sprintio.v1+json` |

### 2.2 Resource Naming Rules

```
# Lowercase, kebab-case for multi-word
/workspaces/{wid}/projects/{pid}/tasks/{tid}

# Singular for sub-resources that always belong to one parent
/workspaces/{wid}/billing

# Plural for collections that can exist independently
/tasks
/automations

# Use query params for actions that don't create/delete resources
/tasks/{id}?action=move    ← WRONG
POST /tasks/{id}/move       ← RIGHT
```

### 2.3 HTTP Status Codes

| Code | Usage |
|------|-------|
| `200` | Successful read, update (PATCH), or action |
| `201` | Successful create (POST) |
| `204` | Successful delete (no body) |
| `400` | Validation error / malformed request |
| `401` | Missing or invalid authentication |
| `403` | Authenticated but not authorized |
| `404` | Resource not found |
| `409` | Conflict (duplicate, version mismatch) |
| `413` | Payload too large |
| `415` | Unsupported media type |
| `422` | Semantic validation error |
| `429` | Rate limit exceeded |
| `500` | Internal server error |
| `503` | Service temporarily unavailable |

---

## 3. URL Structure

### 3.1 Resource Hierarchy

```
/api/v1/
├── /auth
│   ├── /register              POST
│   ├── /login                 POST
│   ├── /logout                POST
│   ├── /refresh               POST
│   ├── /forgot-password       POST
│   ├── /reset-password        POST
│   ├── /oauth/:provider       GET (redirect)
│   ├── /oauth/:provider/callback  GET
│   └── /mfa
│       ├── /setup             POST
│       ├── /verify            POST
│       └── /disable           POST
│
├── /users
│   ├── /me                    GET, PATCH
│   ├── /me/avatar             POST, DELETE
│   ├── /me/preferences        GET, PUT
│   └── /me/notification-settings  GET, PUT
│
├── /workspaces
│   ├── /                      GET, POST
│   ├── /:wid                   GET, PATCH, DELETE
│   ├── /:wid/members           GET, POST
│   ├── /:wid/members/:uid      PATCH, DELETE
│   ├── /:wid/roles             GET, POST
│   ├── /:wid/roles/:rid        GET, PATCH, DELETE
│   ├── /:wid/settings          GET, PUT
│   └── /:wid/billing           GET, PATCH
│
├── /workspaces/:wid/projects
│   ├── /                      GET, POST
│   ├── /:pid                   GET, PATCH, DELETE
│   ├── /:pid/members           GET, POST
│   ├── /:pid/members/:uid      PATCH, DELETE
│   ├── /:pid/labels            GET, POST
│   ├── /:pid/labels/:lid       PATCH, DELETE
│   └── /:pid/settings          GET, PUT
│
├── /workspaces/:wid/projects/:pid/folders
│   ├── /                      GET, POST
│   ├── /:fid                   GET, PATCH, DELETE
│   └── /:fid/subfolders        GET
│
├── /workspaces/:wid/projects/:pid/lists
│   ├── /                      GET, POST
│   ├── /:lid                   GET, PATCH, DELETE
│   ├── /:lid/views             GET, POST
│   ├── /:lid/views/:vid        GET, PATCH, DELETE
│   └── /:lid/filters           GET, POST, DELETE
│
├── /tasks
│   ├── /                      GET (global search across workspaces)
│   ├── /:tid                   GET, PATCH, DELETE
│   ├── /:tid/subtasks          GET, POST
│   ├── /:tid/assign            POST, DELETE
│   ├── /:tid/move              POST
│   ├── /:tid/time-entries      GET, POST
│   ├── /bulk                   PATCH, DELETE, POST (move)
│   └── /bulk/assign            POST
│
├── /documents
│   ├── /                      GET, POST
│   ├── /:did                   GET, PATCH, DELETE
│   ├── /:did/blocks            GET, POST
│   ├── /:did/blocks/:bid       GET, PATCH, DELETE
│   └── /:did/collaborate       WebSocket endpoint
│
├── /comments
│   ├── /                      GET, POST
│   ├── /:cid                   GET, PATCH, DELETE
│   └── /:cid/reactions         POST, DELETE
│
├── /attachments
│   ├── /                      GET
│   ├── /:aid                   GET (download), DELETE
│   └── /upload                 POST (multipart/form-data)
│
├── /search
│   └── /                      GET
│
├── /activity
│   ├── /feed                   GET
│   └── /audit-log              GET (admin)
│
├── /automations
│   ├── /                      GET, POST
│   ├── /:aid                   GET, PATCH, DELETE
│   ├── /:aid/toggle           POST
│   └── /:aid/test             POST
│
├── /webhooks
│   ├── /                      GET, POST
│   ├── /:whid                  GET, PATCH, DELETE
│   ├── /:whid/deliveries       GET
│   └── /:whid/test            POST
│
├── /ai
│   ├── /chat                  POST
│   ├── /summarize             POST
│   └── /auto-assign           POST
│
├── /notifications
│   ├── /                      GET
│   ├── /:nid/read             POST
│   ├── /read-all             POST
│   └── /preferences          GET, PUT
│
├── /admin
│   ├── /stats                 GET
│   ├── /users                 GET, PATCH
│   ├── /feature-flags         GET, PATCH
│   └── /system-health         GET
│
├── /exports
│   ├── /csv                   POST
│   └── /pdf                   POST
│
└── /ws                          WebSocket upgrade endpoint
```

### 3.2 Nested vs Flat Routing Decision Matrix

| Scenario | Route Style | Example |
|----------|------------|---------|
| Always accessed via parent | Nested | `/workspaces/{wid}/projects` |
| Accessed independently with known ID | Flat | `/tasks/{id}` |
| Cross-parent search | Flat with filters | `/tasks?workspace_id=...&project_id=...` |
| Deeply nested (4+ levels) | Flatten at 3 | Use flat `/lists/{lid}/tasks` instead of `/workspaces/.../lists/.../tasks` |

### 3.3 Route Depth Limit

Maximum nesting depth is **3 segments** from `/api/v1/`. Deeper resource chains are flattened:

```http
# Too deep — NOT allowed
GET /api/v1/workspaces/{wid}/projects/{pid}/lists/{lid}/tasks/{tid}

# Correct — flatten using direct resource
GET /api/v1/tasks/{tid}
# Or with scope filter
GET /api/v1/tasks?list_id={lid}
```

---

## 4. Request & Response Format

### 4.1 JSON Response Envelope

Every REST response is wrapped in a consistent envelope:

```typescript
// Successful response
interface ApiResponse<T> {
  data: T;
  meta?: {
    request_id: string;       // UUID, for tracing
    timestamp: string;        // ISO 8601
    duration_ms: number;      // Server processing time
    version: string;          // API version used
  };
  pagination?: PaginationMeta; // Present on list endpoints
}

// Error response
interface ApiErrorResponse {
  error: {
    code: string;             // Machine-readable, e.g. "VALIDATION_ERROR"
    message: string;          // Human-readable message
    details?: ErrorDetail[];  // Field-level errors
    doc_url?: string;         // Link to relevant docs
  };
  meta: {
    request_id: string;
    timestamp: string;
  };
}
```

### 4.2 Successful Response Examples

**Single Resource:**

```json
{
  "data": {
    "id": "task_8f3k2j1m",
    "type": "task",
    "attributes": {
      "title": "Implement OAuth2 login",
      "description": "Add GitHub and Google OAuth providers",
      "status": "in_progress",
      "priority": "high",
      "assignee_id": "user_9x8w7v6u",
      "list_id": "list_4t5y6z7a",
      "project_id": "proj_1b2c3d4e",
      "workspace_id": "ws_5e6f7g8h",
      "labels": ["backend", "auth"],
      "due_date": "2026-07-15T00:00:00Z",
      "estimated_hours": 16,
      "subtask_count": 5,
      "completed_subtasks": 2,
      "comment_count": 3,
      "attachment_count": 2,
      "created_at": "2026-07-01T10:30:00Z",
      "updated_at": "2026-07-08T14:22:00Z",
      "created_by": "user_9x8w7v6u"
    },
    "relationships": {
      "assignee": {
        "data": { "id": "user_9x8w7v6u", "type": "user" }
      },
      "list": {
        "data": { "id": "list_4t5y6z7a", "type": "list" }
      },
      "project": {
        "data": { "id": "proj_1b2c3d4e", "type": "project" }
      }
    },
    "links": {
      "self": "/api/v1/tasks/task_8f3k2j1m",
      "project": "/api/v1/workspaces/ws_5e6f7g8h/projects/proj_1b2c3d4e",
      "assignee": "/api/v1/users/user_9x8w7v6u"
    }
  },
  "meta": {
    "request_id": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "timestamp": "2026-07-08T14:22:00Z",
    "duration_ms": 23,
    "version": "2026-07-08"
  }
}
```

**Collection (List) Response:**

```json
{
  "data": [
    {
      "id": "task_8f3k2j1m",
      "type": "task",
      "attributes": { "title": "Implement OAuth2 login", "status": "in_progress", "priority": "high" }
    },
    {
      "id": "task_2g4h5i6j",
      "type": "task",
      "attributes": { "title": "Write unit tests", "status": "todo", "priority": "medium" }
    }
  ],
  "meta": {
    "request_id": "req_b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "timestamp": "2026-07-08T14:22:00Z",
    "duration_ms": 45,
    "version": "2026-07-08"
  },
  "pagination": {
    "cursor": {
      "after": "eyJpZCI6InRhc2tfMmc0aDVpNmoifQ==",
      "before": "eyJpZCI6InRhc2tfOGYzazJqMW0ifQ=="
    },
    "has_more": true,
    "total_count": 247
  }
}
```

### 4.3 Create / Update Request Bodies

**Create Task (POST):**

```http
POST /api/v1/lists/list_4t5y6z7a/tasks
Content-Type: application/json
Authorization: Bearer <token>
Idempotency-Key: idem_a1b2c3d4

{
  "title": "Implement OAuth2 login",
  "description": "Add GitHub and Google OAuth providers",
  "priority": "high",
  "assignee_id": "user_9x8w7v6u",
  "labels": ["backend", "auth"],
  "due_date": "2026-07-15T00:00:00Z",
  "estimated_hours": 16
}
```

**Partial Update (PATCH):**

```http
PATCH /api/v1/tasks/task_8f3k2j1m
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "in_progress",
  "assignee_id": "user_2y3z4a5b"
}
```

**File Upload (multipart/form-data):**

```http
POST /api/v1/attachments/upload
Content-Type: multipart/form-data; boundary=----FormBoundary
Authorization: Bearer <token>

------FormBoundary
Content-Disposition: form-data; name="file"; filename="design-spec.pdf"
Content-Type: application/pdf

<binary data>
------FormBoundary
Content-Disposition: form-data; name="task_id"

task_8f3k2j1m
------FormBoundary
Content-Disposition: form-data; name="workspace_id"

ws_5e6f7g8h
------FormBoundary--
```

### 4.4 Partial Response (Sparse Fieldsets)

Request specific fields to reduce payload size:

```http
GET /api/v1/tasks?fields=id,title,status,assignee_id,due_date
```

**Response — only requested fields returned:**

```json
{
  "data": [
    {
      "id": "task_8f3k2j1m",
      "type": "task",
      "attributes": {
        "title": "Implement OAuth2 login",
        "status": "in_progress",
        "assignee_id": "user_9x8w7v6u",
        "due_date": "2026-07-15T00:00:00Z"
      }
    }
  ]
}
```

### 4.5 Include Related Resources (Side-loading)

```http
GET /api/v1/tasks?include=assignee,list,labels
```

```json
{
  "data": [...],
  "included": [
    {
      "id": "user_9x8w7v6u",
      "type": "user",
      "attributes": {
        "name": "Alice Chen",
        "email": "alice@example.com",
        "avatar_url": "https://cdn.sprintio.app/avatars/alice.jpg"
      }
    },
    {
      "id": "list_4t5y6z7a",
      "type": "list",
      "attributes": { "name": "Sprint 42", "color": "#6366f1" }
    }
  ]
}
```

---

## 5. Pagination

### 5.1 Cursor-Based Pagination (Default & Recommended)

Used for **all collection endpoints**. Provides stable, performant pagination regardless of data changes.

```http
GET /api/v1/workspaces/ws_5e6f7g8h/tasks?limit=25
```

**Request Parameters:**

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | integer | 25 | 100 | Number of items per page |
| `after` | string | — | — | Cursor: items after this point |
| `before` | string | — | — | Cursor: items before this point |

**Response:**

```json
{
  "data": [...],
  "pagination": {
    "cursor": {
      "after": "eyJpZCI6InRhc2tfMmc0aDVpNmoifQ==",
      "before": "eyJpZCI6InRhc2tfOGYzazJqMW0ifQ=="
    },
    "has_more": true,
    "total_count": 247
  }
}
```

**Usage pattern:**

```http
# First page
GET /api/v1/tasks?limit=25

# Next page — use "after" cursor from previous response
GET /api/v1/tasks?limit=25&after=eyJpZCI6InRhc2tfMmc0aDVpNmoifQ==

# Previous page — use "before" cursor
GET /api/v1/tasks?limit=25&before=eyJpZCI6InRhc2tfOGYzazJqMW0ifQ==
```

### 5.2 Offset-Based Pagination (Legacy Support)

Available via `page` and `per_page` query parameters for compatibility, but cursor-based is preferred.

```http
GET /api/v1/tasks?page=3&per_page=25
```

```json
{
  "pagination": {
    "page": 3,
    "per_page": 25,
    "total_count": 247,
    "total_pages": 10
  }
}
```

### 5.3 Pagination Limits

| Scenario | Max `limit` | Notes |
|----------|-------------|-------|
| Standard endpoints | 100 | Default: 25 |
| Search results | 50 | Default: 20 |
| Bulk export endpoints | 1000 | Special endpoint only |
| Admin endpoints | 200 | Requires admin role |

---

## 6. Filtering & Sorting

### 6.1 Simple Filters

Use query parameters matching attribute names:

```http
GET /api/v1/tasks?status=in_progress&priority=high&assignee_id=user_9x8w7v6u
```

### 6.2 Operator Filters

Append operators to parameter names using double-underscore notation:

```http
# Equality (default, implicit)
GET /api/v1/tasks?status=in_progress

# Not equal
GET /api/v1/tasks?status__neq=done

# Greater than / Less than (for dates and numbers)
GET /api/v1/tasks?due_date__gte=2026-07-01&due_date__lte=2026-07-31

# Contains (for text search within field)
GET /api/v1/tasks?title__contains=oauth

# Starts with
GET /api/v1/tasks?title__starts_with=Implement

# In (comma-separated values)
GET /api/v1/tasks?priority__in=high,critical

# Is null
GET /api/v1/tasks?assignee_id__is_null=true

# Date operators
GET /api/v1/tasks?created_at__gte=2026-07-01T00:00:00Z
GET /api/v1/tasks?due_date__before=today
GET /api/v1/tasks?created_at__after=7d     # Relative: 7 days ago
```

### 6.3 Complex Filters (Filter Objects)

For advanced queries, use a JSON-encoded `filter` parameter:

```http
GET /api/v1/tasks?filter={"and":[{"status":{"in":["todo","in_progress"]}},{"or":[{"priority":"high"},{"assignee_id":"user_9x8w7v6u"}]},{"due_date":{"lte":"2026-07-15T00:00:00Z"}}]}
```

Filter object schema:

```typescript
interface FilterExpression {
  and?: FilterExpression[];
  or?: FilterExpression[];
  [field: string]: {
    eq?: unknown;
    neq?: unknown;
    gt?: unknown;
    gte?: unknown;
    lt?: unknown;
    lte?: unknown;
    in?: unknown[];
    nin?: unknown[];
    contains?: string;
    starts_with?: string;
    is_null?: boolean;
    between?: [unknown, unknown];
  } | unknown;
}
```

### 6.4 Sorting

```http
# Sort ascending (default)
GET /api/v1/tasks?sort=created_at

# Sort descending
GET /api/v1/tasks?sort=-created_at

# Multiple sort fields
GET /api/v1/tasks?sort=-priority,created_at

# Sort by related resource
GET /api/v1/tasks?sort=assignee.name
```

**Response header** for the applied sort:

```http
X-Sort: -priority,created_at
```

### 6.5 Search

Global full-text search across multiple resource types:

```http
GET /api/v1/search?q=oauth+implementation&types=task,document&workspace_id=ws_5e6f7g8h
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query (min 2 chars) |
| `types` | string[] | Resource types to search: `task`, `document`, `comment`, `project` |
| `workspace_id` | string | Scope to workspace |
| `project_id` | string | Scope to project |

**Response:**

```json
{
  "data": [
    {
      "id": "task_8f3k2j1m",
      "type": "task",
      "attributes": {
        "title": "Implement OAuth2 login",
        "status": "in_progress",
        "snippet": "...add GitHub and <mark>OAuth</mark> providers..."
      },
      "score": 0.95,
      "workspace_id": "ws_5e6f7g8h"
    }
  ],
  "meta": {
    "query": "oauth implementation",
    "types": ["task", "document"],
    "total_count": 12
  }
}
```

---

## 7. Versioning

### 7.1 URL-Based Versioning

```http
GET /api/v1/tasks
GET /api/v2/tasks   # Future breaking change
```

**Rules:**

| Rule | Detail |
|------|--------|
| **Version format** | `/api/v{major}/` — only major versions in URL |
| **Date stamp** | Each version gets a release date: `2026-07-08` |
| **Header override** | `Accept: application/vnd.sprintio.v1+json` can pin version |
| **Default** | Latest stable version if no version specified |
| **Minimum** | Always serve the latest 2 major versions simultaneously |

### 7.2 Deprecation Policy

| Phase | Duration | Behavior |
|-------|----------|----------|
| **Announced** | T-6 months | `Sunset` header added; deprecation warning in response |
| **Deprecated** | T-3 months | Response includes `Deprecation` header; documentation flagged |
| **Sunset** | T-0 | Returns `410 Gone` with migration guide link |

**Deprecation headers:**

```http
HTTP/1.1 200 OK
Deprecation: Sat, 08 Jan 2027 00:00:00 GMT
Sunset: Sun, 08 Jul 2027 00:00:00 GMT
Link: <https://docs.sprintio.app/api/migration/v1-to-v2>; rel="deprecation"
X-API-Warning: This endpoint is deprecated. See docs for migration guide.
```

### 7.3 Non-Breaking Changes (Same Version)

These do NOT require a new version:

- Adding new optional request fields
- Adding new response fields
- Adding new endpoints
- Adding new enum values
- Adding new query parameters
- Adding new headers

### 7.4 Breaking Changes (New Version Required)

- Removing or renaming fields
- Changing field types
- Changing URL structure
- Changing required fields
- Modifying error codes
- Changing authentication requirements

---

## 8. Error Responses

### 8.1 Standard Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request body contains invalid fields.",
    "details": [
      {
        "field": "title",
        "code": "STRING_TOO_SHORT",
        "message": "Title must be at least 3 characters.",
        "received": "ab",
        "expected": "string with min length 3"
      },
      {
        "field": "due_date",
        "code": "INVALID_FORMAT",
        "message": "Must be a valid ISO 8601 date.",
        "received": "next friday",
        "expected": "ISO 8601 date-time string"
      }
    ],
    "doc_url": "https://docs.sprintio.app/api/errors/VALIDATION_ERROR"
  },
  "meta": {
    "request_id": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "timestamp": "2026-07-08T14:22:00Z"
  }
}
```

### 8.2 Error Code Catalog

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| `400` | `BAD_REQUEST` | Malformed request syntax |
| `400` | `MISSING_REQUIRED_FIELD` | Required field not provided |
| `400` | `INVALID_JSON` | Request body is not valid JSON |
| `400` | `IDEMPOTENCY_KEY_REUSED` | Same key used for different payload |
| `401` | `UNAUTHENTICATED` | No authentication provided |
| `401` | `TOKEN_EXPIRED` | JWT has expired |
| `401` | `TOKEN_INVALID` | JWT signature verification failed |
| `401` | `TOKEN_REVOKED` | Token has been revoked |
| `403` | `FORBIDDEN` | Authenticated but not authorized |
| `403` | `INSUFFICIENT_PERMISSIONS` | Role lacks required permission |
| `403` | `ACCOUNT_DISABLED` | Account has been disabled |
| `404` | `NOT_FOUND` | Resource does not exist |
| `404` | `ENDPOINT_NOT_FOUND` | API endpoint does not exist |
| `409` | `CONFLICT` | Resource state conflict |
| `409` | `VERSION_CONFLICT` | Optimistic lock version mismatch |
| `409` | `DUPLICATE_RESOURCE` | Resource already exists |
| `413` | `PAYLOAD_TOO_LARGE` | Request body exceeds limit |
| `415` | `UNSUPPORTED_MEDIA_TYPE` | Content-Type not accepted |
| `422` | `UNPROCESSABLE_ENTITY` | Semantically invalid request |
| `422` | `BUSINESS_RULE_VIOLATION` | Domain constraint violated |
| `422` | `CIRCULAR_REFERENCE` | Detected circular dependency |
| `429` | `RATE_LIMITED` | Rate limit exceeded |
| `500` | `INTERNAL_ERROR` | Unexpected server error |
| `502` | `BAD_GATEWAY` | Upstream service error |
| `503` | `SERVICE_UNAVAILABLE` | Service temporarily down |
| `504` | `GATEWAY_TIMEOUT` | Upstream service timeout |

### 8.3 Validation Error Details

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request body contains 3 errors.",
    "details": [
      {
        "field": "members[0].email",
        "code": "INVALID_EMAIL",
        "message": "Must be a valid email address.",
        "received": "not-an-email"
      },
      {
        "field": "members[1].role",
        "code": "INVALID_ENUM",
        "message": "Role must be one of: owner, admin, member, viewer.",
        "received": "superadmin",
        "expected": ["owner", "admin", "member", "viewer"]
      },
      {
        "field": "settings.retention_days",
        "code": "NUMBER_OUT_OF_RANGE",
        "message": "Must be between 1 and 365.",
        "received": -5,
        "expected": "integer between 1 and 365"
      }
    ]
  }
}
```

### 8.4 Not-Found Obfuscation

For security, 404 responses are identical whether the resource exists but is unauthorized, or truly does not exist:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested resource could not be found.",
    "doc_url": "https://docs.sprintio.app/api/errors/NOT_FOUND"
  }
}
```

---

## 9. Rate Limiting

### 9.1 Rate Limit Tiers

| Tier | User Authenticated | API Key Authenticated | Unauthenticated |
|------|-------------------|----------------------|-----------------|
| **Free** | 100 req/min | 200 req/min | 20 req/min |
| **Pro** | 500 req/min | 1,000 req/min | N/A |
| **Enterprise** | 2,000 req/min | 5,000 req/min | N/A |
| **Admin** | 5,000 req/min | 10,000 req/min | N/A |

### 9.2 Per-Endpoint Limits

Some endpoints have stricter limits due to resource cost:

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| **Auth** (`/auth/login`) | 5 | 15 min (sliding) |
| **Password reset** | 3 | 1 hour |
| **MFA verify** | 5 | 15 min |
| **File upload** | 10 | 1 min |
| **AI endpoints** (`/ai/*`) | 30 | 1 min |
| **Search** (`/search`) | 60 | 1 min |
| **Bulk operations** (`/tasks/bulk`) | 10 | 1 min |
| **Export** (`/exports/*`) | 5 | 1 hour |
| **Webhook test** | 5 | 5 min |

### 9.3 Per-Workspace Limits

Additional workspace-level throttling:

| Tier | Requests/min | Concurrent connections |
|------|-------------|----------------------|
| Free workspace | 500 | 5 |
| Pro workspace | 5,000 | 25 |
| Enterprise workspace | 50,000 | 100 |

### 9.4 Rate Limit Headers

Every response includes rate limit headers:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1751990520
X-RateLimit-Policy: 100;w=60
```

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |
| `X-RateLimit-Policy` | Rate limit policy (for debugging) |

### 9.5 Rate Limit Exceeded Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 23
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1751990520

{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Try again in 23 seconds.",
    "retry_after": 23,
    "doc_url": "https://docs.sprintio.app/api/rate-limits"
  }
}
```

### 9.6 Rate Limit Implementation (Token Bucket)

```typescript
// Pseudocode for token bucket rate limiter
interface RateLimiter {
  key: string;           // e.g., "user:usr_123:tasks"
  capacity: number;      // Max tokens (burst size)
  refillRate: number;    // Tokens added per second
  refillInterval: number; // Refill check interval (ms)
}

// Per-user sliding window with Redis
// Key: "ratelimit:{user_id}:{endpoint_group}"
// Value: sorted set of request timestamps
```

---

## 10. OpenAPI Specification

### 10.1 Spec Generation Strategy

The OpenAPI 3.1 spec is **auto-generated** from TypeScript source:

```
src/
├── routes/                    # Express route definitions
│   ├── auth.routes.ts
│   ├── tasks.routes.ts
│   └── index.ts
├── schemas/                   # Zod schemas (source of truth)
│   ├── auth.schema.ts
│   ├── tasks.schema.ts
│   └── common.schema.ts
├── middleware/
│   └── openapi.middleware.ts  # Spec generation middleware
└── docs/
    └── openapi.ts             # Top-level spec configuration
```

### 10.2 OpenAPI Spec Structure

```yaml
openapi: 3.1.0
info:
  title: Sprintio API
  version: "2026-07-08"
  description: |
    AI-enhanced collaborative work management platform API.
    Supports REST for CRUD operations and WebSocket for real-time collaboration.
  contact:
    name: Sprintio API Support
    email: api-support@sprintio.app
    url: https://docs.sprintio.app
  license:
    name: Proprietary
    url: https://sprintio.app/license

servers:
  - url: https://api.sprintio.app/api/v1
    description: Production
  - url: https://api.staging.sprintio.app/api/v1
    description: Staging
  - url: http://localhost:3000/api/v1
    description: Local development

security:
  - bearerAuth: []
  - apiKeyAuth: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: "JWT access token from /auth/login"
    apiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: "API key for programmatic access"

  schemas:
    Task:
      type: object
      required: [id, type, attributes]
      properties:
        id:
          type: string
          example: "task_8f3k2j1m"
        type:
          type: string
          enum: [task]
        attributes:
          $ref: "#/components/schemas/TaskAttributes"
        relationships:
          $ref: "#/components/schemas/TaskRelationships"
        links:
          type: object
          properties:
            self:
              type: string

    TaskAttributes:
      type: object
      required: [title, status, priority, created_at, updated_at]
      properties:
        title:
          type: string
          minLength: 3
          maxLength: 500
          example: "Implement OAuth2 login"
        description:
          type: string
          maxLength: 50000
          nullable: true
        status:
          $ref: "#/components/schemas/TaskStatus"
        priority:
          $ref: "#/components/schemas/TaskPriority"
        assignee_id:
          type: string
          nullable: true
          example: "user_9x8w7v6u"
        list_id:
          type: string
          example: "list_4t5y6z7a"
        project_id:
          type: string
          example: "proj_1b2c3d4e"
        labels:
          type: array
          items:
            type: string
        due_date:
          type: string
          format: date-time
          nullable: true
        estimated_hours:
          type: number
          minimum: 0
          maximum: 1000
          nullable: true
        subtask_count:
          type: integer
        completed_subtasks:
          type: integer
        comment_count:
          type: integer
        attachment_count:
          type: integer
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
        created_by:
          type: string

    TaskStatus:
      type: string
      enum: [backlog, todo, in_progress, in_review, done, cancelled]

    TaskPriority:
      type: string
      enum: [none, low, medium, high, urgent]

    Error:
      type: object
      required: [error, meta]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: array
              items:
                $ref: "#/components/schemas/ErrorDetail"
            doc_url:
              type: string
              format: uri
        meta:
          $ref: "#/components/schemas/ResponseMeta"

    ErrorDetail:
      type: object
      properties:
        field:
          type: string
        code:
          type: string
        message:
          type: string
        received:
          type: string
        expected:
          type: string

    ResponseMeta:
      type: object
      properties:
        request_id:
          type: string
          format: uuid
        timestamp:
          type: string
          format: date-time
        duration_ms:
          type: integer
        version:
          type: string

    PaginationMeta:
      type: object
      properties:
        cursor:
          type: object
          properties:
            after:
              type: string
              nullable: true
            before:
              type: string
              nullable: true
        has_more:
          type: boolean
        total_count:
          type: integer

  responses:
    BadRequest:
      description: Validation error
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
    Forbidden:
      description: Insufficient permissions
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
    RateLimited:
      description: Rate limit exceeded
      headers:
        Retry-After:
          schema:
            type: integer
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"

tags:
  - name: Auth
    description: Authentication and authorization
  - name: Users
    description: User profile and preferences
  - name: Workspaces
    description: Workspace management
  - name: Projects
    description: Project management
  - name: Folders
    description: Folder hierarchy
  - name: Lists
    description: List management and views
  - name: Tasks
    description: Task management
  - name: Documents
    description: Document and block editing
  - name: Comments
    description: Comments and discussions
  - name: Attachments
    description: File uploads and downloads
  - name: Search
    description: Full-text search
  - name: Activity
    description: Activity feed and audit log
  - name: Automations
    description: Workflow automations
  - name: Webhooks
    description: Webhook configuration
  - name: AI
    description: AI-powered features
  - name: Notifications
    description: Notification management
  - name: Admin
    description: Admin operations
  - name: Exports
    description: Data export
```

### 10.3 Sample Endpoint Spec

```yaml
paths:
  /tasks:
    get:
      operationId: listTasks
      summary: List tasks
      description: |
        Returns a paginated list of tasks. Supports filtering by status,
        priority, assignee, date ranges, and full-text search.
      tags: [Tasks]
      security:
        - bearerAuth: []
        - apiKeyAuth: []
      parameters:
        - $ref: "#/components/parameters/LimitParam"
        - $ref: "#/components/parameters/AfterCursor"
        - $ref: "#/components/parameters/BeforeCursor"
        - name: status
          in: query
          schema:
            $ref: "#/components/schemas/TaskStatus"
        - name: priority
          in: query
          schema:
            $ref: "#/components/schemas/TaskPriority"
        - name: assignee_id
          in: query
          schema:
            type: string
        - name: project_id
          in: query
          schema:
            type: string
        - name: sort
          in: query
          schema:
            type: string
            default: "-updated_at"
        - name: fields
          in: query
          schema:
            type: string
          description: Comma-separated field names to include
        - name: include
          in: query
          schema:
            type: string
          description: Related resources to side-load
        - name: filter
          in: query
          schema:
            type: string
          description: JSON-encoded complex filter expression
      responses:
        "200":
          description: Paginated task list
          headers:
            X-RateLimit-Limit:
              schema: { type: integer }
            X-RateLimit-Remaining:
              schema: { type: integer }
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/Task"
                  meta:
                    $ref: "#/components/schemas/ResponseMeta"
                  pagination:
                    $ref: "#/components/schemas/PaginationMeta"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "429":
          $ref: "#/components/responses/RateLimited"

    post:
      operationId: createTask
      summary: Create a task
      tags: [Tasks]
      security:
        - bearerAuth: []
      parameters:
        - name: Idempotency-Key
          in: header
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateTaskRequest"
      responses:
        "201":
          description: Task created
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: "#/components/schemas/Task"
                  meta:
                    $ref: "#/components/schemas/ResponseMeta"
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
```

### 10.4 Documentation & Tooling

| Tool | Purpose | Integration |
|------|---------|-------------|
| **Scalar** | Interactive API docs UI | Served at `/docs` |
| **zod-to-openapi** | Zod → OpenAPI schema generation | Build step |
| **openapi-typescript** | OpenAPI → TypeScript client gen | `npm run gen:client` |
| **openapi-generator** | Multi-language SDK generation | CI/CD pipeline |
| **Prism** | Mock server from OpenAPI spec | `npx prism mock openapi.yaml` |
| **Spectral** | OpenAPI linting / style rules | Pre-commit hook |

---

## 11. Authentication & Authorization

### 11.1 Authentication Methods

| Method | Use Case | Header |
|--------|----------|--------|
| **JWT Bearer** | User sessions (web, mobile) | `Authorization: Bearer <token>` |
| **API Key** | Programmatic access, integrations | `X-API-Key: <key>` |
| **OAuth 2.0** | Third-party login (GitHub, Google) | OAuth flow |
| **Session Cookie** | Web app (same-origin) | `Cookie: session=<token>` |

### 11.2 JWT Token Structure

```json
{
  "sub": "user_9x8w7v6u",
  "email": "alice@example.com",
  "workspace_id": "ws_5e6f7g8h",
  "roles": ["admin"],
  "permissions": ["tasks:write", "projects:read"],
  "iat": 1751990400,
  "exp": 1751994000,
  "iss": "sprintio",
  "aud": "sprintio-api"
}
```

### 11.3 Token Lifecycle

```http
# Login — receive access + refresh tokens
POST /api/v1/auth/login
{
  "email": "alice@example.com",
  "password": "s3cure_p@ss"
}

HTTP/1.1 200 OK
Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh
{
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "refresh_expires_in": 604800,
    "user": {
      "id": "user_9x8w7v6u",
      "name": "Alice Chen",
      "email": "alice@example.com",
      "avatar_url": "https://cdn.sprintio.app/avatars/alice.jpg"
    }
  }
}

# Refresh — get new access token
POST /api/v1/auth/refresh
Cookie: refresh_token=<token>

# Logout — revoke refresh token
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

### 11.4 Role-Based Access Control (RBAC)

| Role | Scope | Permissions |
|------|-------|-------------|
| **Owner** | Workspace | Full control, billing, delete workspace |
| **Admin** | Workspace | Manage members, settings, all resources |
| **Member** | Workspace | Create/edit own resources, comment, view |
| **Viewer** | Workspace/Project | Read-only access |
| **Guest** | Project | Limited read/write on assigned tasks |

Permission format: `{resource}:{action}`

```
tasks:create    tasks:read    tasks:update    tasks:delete
projects:create projects:read projects:update projects:delete
documents:create documents:read documents:update documents:delete
comments:create comments:read comments:update comments:delete
members:invite  members:remove
workspace:manage workspace:billing
admin:stats     admin:users   admin:feature-flags
```

---

## 12. WebSocket API

### 12.1 Connection

```http
GET /api/v1/ws
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZQ==
Authorization: Bearer <token>
```

### 12.2 Connection Response

```json
{
  "type": "connected",
  "payload": {
    "connection_id": "conn_a1b2c3d4",
    "user_id": "user_9x8w7v6u",
    "workspace_id": "ws_5e6f7g8h",
    "server_time": "2026-07-08T14:22:00Z"
  }
}
```

### 12.3 Message Protocol

All messages follow a uniform envelope:

```typescript
// Client → Server
interface ClientMessage {
  type: string;          // Message type
  payload: unknown;      // Message data
  id?: string;           // Optional client message ID for ack
}

// Server → Client
interface ServerMessage {
  type: string;          // Message type
  payload: unknown;      // Message data
  id?: string;           // Correlated client message ID
  timestamp: string;     // Server timestamp
}
```

### 12.4 Channel Subscription Model

Clients subscribe to scoped channels for real-time updates:

```json
// Subscribe to task updates in a project
{
  "type": "subscribe",
  "id": "sub_001",
  "payload": {
    "channels": [
      "task:proj_1b2c3d4e",
      "document:doc_7h8i9j0k",
      "presence:ws_5e6f7g8h",
      "notifications:user_9x8w7v6u"
    ]
  }
}

// Server acknowledges
{
  "type": "subscribed",
  "id": "sub_001",
  "payload": {
    "channels": ["task:proj_1b2c3d4e", "document:doc_7h8i9j0k", "presence:ws_5e6f7g8h", "notifications:user_9x8w7v6u"]
  },
  "timestamp": "2026-07-08T14:22:00Z"
}
```

### 12.5 Event Catalog

| Event Type | Channel Pattern | Description | Payload |
|------------|----------------|-------------|---------|
| `task.created` | `task:{project_id}` | New task created | Task object |
| `task.updated` | `task:{project_id}` | Task fields changed | Changed fields |
| `task.moved` | `task:{project_id}` | Task moved between lists | {from_list, to_list, position} |
| `task.deleted` | `task:{project_id}` | Task deleted | {task_id} |
| `task.assigned` | `task:{project_id}` | Assignee changed | {task_id, assignee_id} |
| `task.status_changed` | `task:{project_id}` | Status updated | {task_id, from_status, to_status} |
| `comment.created` | `task:{task_id}` | New comment | Comment object |
| `comment.updated` | `task:{task_id}` | Comment edited | Comment object |
| `comment.deleted` | `task:{task_id}` | Comment deleted | {comment_id} |
| `reaction.added` | `task:{task_id}` | Emoji reaction added | {comment_id, user_id, emoji} |
| `reaction.removed` | `task:{task_id}` | Emoji reaction removed | {comment_id, user_id, emoji} |
| `document.updated` | `document:{doc_id}` | Document content changed | Operational transform |
| `document.cursor` | `document:{doc_id}` | Collaborator cursor position | {user_id, position, selection} |
| `presence.joined` | `presence:{workspace_id}` | User came online | {user_id, name, avatar} |
| `presence.left` | `presence:{workspace_id}` | User went offline | {user_id} |
| `presence.typing` | `task:{task_id}` | User typing in comment | {user_id, is_typing} |
| `notification.new` | `notifications:{user_id}` | New notification | Notification object |
| `notification.read` | `notifications:{user_id}` | Notification marked read | {notification_id} |
| `attachment.uploaded` | `task:{task_id}` | File attachment added | Attachment object |
| `activity.logged` | `activity:{project_id}` | Activity entry created | Activity object |
| `automation.triggered` | `task:{project_id}` | Automation ran | {automation_id, task_id, result} |

### 12.6 Presence System

```json
// Get current workspace presence
{
  "type": "presence.get",
  "payload": {
    "workspace_id": "ws_5e6f7g8h"
  }
}

// Response
{
  "type": "presence.state",
  "payload": {
    "workspace_id": "ws_5e6f7g8h",
    "users": [
      {
        "user_id": "user_9x8w7v6u",
        "name": "Alice Chen",
        "avatar_url": "https://cdn.sprintio.app/avatars/alice.jpg",
        "status": "online",
        "current_view": { "type": "task", "id": "task_8f3k2j1m" },
        "last_seen": "2026-07-08T14:22:00Z"
      },
      {
        "user_id": "user_2y3z4a5b",
        "name": "Bob Park",
        "status": "idle",
        "current_view": { "type": "project", "id": "proj_1b2c3d4e" },
        "last_seen": "2026-07-08T14:20:30Z"
      }
    ]
  }
}
```

### 12.7 Document Collaboration (Operational Transform)

```json
// Client sends operation
{
  "type": "document.operation",
  "id": "op_001",
  "payload": {
    "document_id": "doc_7h8i9j0k",
    "version": 42,
    "operations": [
      {
        "type": "insert",
        "position": 128,
        "content": "new paragraph text"
      }
    ]
  }
}

// Server acknowledges and broadcasts
{
  "type": "document.operation.ack",
  "id": "op_001",
  "payload": {
    "document_id": "doc_7h8i9j0k",
    "version": 43,
    "applied": true
  },
  "timestamp": "2026-07-08T14:22:00Z"
}

// Server broadcasts to other collaborators
{
  "type": "document.operation.remote",
  "payload": {
    "document_id": "doc_7h8i9j0k",
    "version": 43,
    "user_id": "user_9x8w7v6u",
    "operations": [
      {
        "type": "insert",
        "position": 128,
        "content": "new paragraph text"
      }
    ]
  },
  "timestamp": "2026-07-08T14:22:00Z"
}
```

### 12.8 Heartbeat & Reconnection

```
Client                          Server
  │                               │
  │──── ping ─────────────────────>│  (every 30s)
  │<──── pong ─────────────────────│
  │                               │
  │        [connection drops]     │
  │                               │
  │──── reconnect ────────────────>│  (with last_event_id)
  │<──── reconnected ─────────────│
  │<──── missed events (catchup) ─│  (events since last_event_id)
```

| Parameter | Value |
|-----------|-------|
| Ping interval | 30 seconds |
| Pong timeout | 10 seconds |
| Reconnect window | 5 minutes |
| Missed event buffer | Last 100 events per channel |

---

## 13. Webhook API

### 13.1 Webhook Configuration

```http
POST /api/v1/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/sprintio",
  "events": ["task.created", "task.status_changed", "comment.created"],
  "secret": "whsec_your_signing_secret",
  "description": "Sync task updates to external tool",
  "active": true,
  "filters": {
    "project_id": "proj_1b2c3d4e"
  }
}
```

### 13.2 Supported Webhook Events

| Event | Description |
|-------|-------------|
| `task.created` | New task created |
| `task.updated` | Task fields modified |
| `task.moved` | Task moved between lists |
| `task.deleted` | Task deleted |
| `task.assigned` | Task assigned/unassigned |
| `task.status_changed` | Task status changed |
| `project.created` | New project created |
| `project.updated` | Project updated |
| `project.deleted` | Project deleted |
| `comment.created` | New comment |
| `comment.updated` | Comment edited |
| `comment.deleted` | Comment deleted |
| `member.added` | Member added to workspace |
| `member.removed` | Member removed |
| `automation.triggered` | Automation executed |
| `*` | All events (wildcard) |

### 13.3 Webhook Payload

```json
{
  "id": "evt_a1b2c3d4e5f6",
  "type": "task.created",
  "created_at": "2026-07-08T14:22:00Z",
  "workspace_id": "ws_5e6f7g8h",
  "data": {
    "task": {
      "id": "task_8f3k2j1m",
      "title": "Implement OAuth2 login",
      "status": "todo",
      "priority": "high",
      "assignee_id": "user_9x8w7v6u",
      "project_id": "proj_1b2c3d4e",
      "list_id": "list_4t5y6z7a",
      "created_by": "user_9x8w7v6u",
      "created_at": "2026-07-08T14:22:00Z"
    }
  },
  "actor": {
    "id": "user_9x8w7v6u",
    "name": "Alice Chen",
    "email": "alice@example.com"
  }
}
```

### 13.4 Signature Verification

Every webhook delivery includes an HMAC-SHA256 signature:

```http
POST https://your-app.com/webhooks/sprintio
Content-Type: application/json
X-Sprintio-Event: task.created
X-Sprintio-Delivery: del_a1b2c3d4
X-Sprintio-Signature: sha256=a1b2c3d4e5f67890...
X-Sprintio-Timestamp: 1751990520
```

**Verification (Node.js):**

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  // Reject if timestamp is older than 5 minutes (replay protection)
  const age = Date.now() / 1000 - parseInt(timestamp);
  if (age > 300) return false;

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### 13.5 Delivery Guarantees

| Guarantee | Detail |
|-----------|--------|
| **At-least-once** | Webhooks may be delivered more than once; consumers must be idempotent |
| **Ordering** | Events within a single resource are ordered; cross-resource events are not |
| **Timeout** | 10-second response timeout |
| **Retry policy** | Exponential backoff: 1min, 5min, 30min, 2hr, 12hr, 24hr |
| **Max retries** | 6 attempts total |
| **Delivery window** | Events retained for 7 days; undelivered events are dropped |

**Retry schedule:**

| Attempt | Delay | Cumulative |
|---------|-------|------------|
| 1 | Immediate | 0 |
| 2 | 1 min | 1 min |
| 3 | 5 min | 6 min |
| 4 | 30 min | 36 min |
| 5 | 2 hours | 2.5 hours |
| 6 | 12 hours | 14.5 hours |

### 13.6 Delivery Log

```http
GET /api/v1/webhooks/wh_a1b2c3d4/deliveries?limit=10
Authorization: Bearer <token>
```

```json
{
  "data": [
    {
      "id": "del_x1y2z3",
      "event": "task.created",
      "status": "delivered",
      "status_code": 200,
      "request_url": "https://your-app.com/webhooks/sprintio",
      "request_headers": { "X-Sprintio-Event": "task.created" },
      "request_body_size": 512,
      "response_code": 200,
      "response_body_size": 28,
      "duration_ms": 234,
      "attempts": 1,
      "created_at": "2026-07-08T14:22:00Z",
      "delivered_at": "2026-07-08T14:22:00Z"
    },
    {
      "id": "del_a4b5c6",
      "event": "task.updated",
      "status": "failed",
      "status_code": 500,
      "error": "Internal Server Error",
      "attempts": 6,
      "next_retry_at": null,
      "created_at": "2026-07-08T13:15:00Z",
      "last_attempted_at": "2026-07-09T03:15:00Z"
    }
  ]
}
```

---

## 14. CLI API

### 14.1 Authentication Flow

```bash
# Interactive login — opens browser for OAuth
sprintio auth login

# API key login (CI/CD environments)
sprintio auth login --api-key $SPRINTIO_API_KEY

# Status check
sprintio auth status

# Logout
sprintio auth logout
```

**OAuth device flow for headless environments:**

```http
POST /api/v1/auth/device/code
Content-Type: application/json

{
  "client_id": "sprintio-cli",
  "scope": "tasks:write projects:read"
}

HTTP/1.1 200 OK
{
  "data": {
    "device_code": "device_a1b2c3d4",
    "user_code": "ABCD-1234",
    "verification_uri": "https://sprintio.app/device/verify",
    "expires_in": 600,
    "interval": 5
  }
}

# Poll for completion
POST /api/v1/auth/device/token
{
  "client_id": "sprintio-cli",
  "device_code": "device_a1b2c3d4"
}
```

### 14.2 Machine-Readable Output

All CLI commands support `--output` flag:

| Format | Flag | Use Case |
|--------|------|----------|
| Table | `--output table` (default) | Human-readable terminal |
| JSON | `--output json` | Programmatic consumption |
| YAML | `--output yaml` | Configuration files |
| CSV | `--output csv` | Spreadsheet import |

**Example:**

```bash
sprintio tasks list --project proj_1b2c3d4e --output json
```

```json
{
  "data": [
    {
      "id": "task_8f3k2j1m",
      "title": "Implement OAuth2 login",
      "status": "in_progress",
      "priority": "high",
      "assignee": "Alice Chen",
      "due_date": "2026-07-15",
      "created_at": "2026-07-01"
    }
  ],
  "meta": {
    "total_count": 42,
    "page": 1,
    "per_page": 25
  }
}
```

### 14.3 CLI Command Reference

```bash
# Workspaces
sprintio workspaces list
sprintio workspaces switch <workspace_id>

# Tasks
sprintio tasks list --project <id> --status in_progress --sort -priority
sprintio tasks create --title "New task" --project <id> --assignee <user>
sprintio tasks update <id> --status done
sprintio tasks move <id> --to-list <list_id>

# Projects
sprintio projects list --workspace <id>
sprintio projects create --name "New Project" --workspace <id>

# Search
sprintio search "oauth implementation" --types task,document

# Export
sprintio export csv --project <id> --output tasks.csv
sprintio export pdf --task <id> --output report.pdf

# Webhooks
sprintio webhooks list
sprintio webhooks create --url https://example.com/hooks --events task.created

# Activity
sprintio activity feed --project <id> --limit 20

# AI
sprintio ai summarize --task <id>
sprintio ai assign --project <id> --auto
```

---

## 15. API Security

### 15.1 CORS Configuration

```typescript
// Express CORS middleware configuration
const corsOptions = {
  origin: [
    'https://app.sprintio.app',
    'https://staging.sprintio.app',
    'http://localhost:3000',    // Local dev only
    'http://localhost:5173',    // Vite dev server
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Authorization',
    'Content-Type',
    'X-API-Key',
    'X-Idempotency-Key',
    'X-Request-ID',
    'Accept',
    'Accept-Version',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-ID',
    'ETag',
    'X-Total-Count',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours preflight cache
};
```

### 15.2 Content Security Policy

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://cdn.sprintio.app data:;
  connect-src 'self' wss://api.sprintio.app;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

### 15.3 Input Sanitization

**Zod validation at every endpoint boundary:**

```typescript
import { z } from 'zod';

const CreateTaskSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(500, 'Title must be at most 500 characters')
    .trim()
    .refine(
      (val) => !/[<>{}]/.test(val),
      'Title contains disallowed characters'
    ),
  description: z
    .string()
    .max(50000)
    .optional()
    .transform((val) => sanitizeHtml(val)),  // Strip HTML
  priority: z.enum(['none', 'low', 'medium', 'high', 'urgent']),
  assignee_id: z.string().regex(/^usr_[a-z0-9]+$/).optional(),
  due_date: z.coerce.date().min(new Date()).optional(),
  labels: z.array(z.string().max(50)).max(20).default([]),
  estimated_hours: z.number().min(0).max(1000).optional(),
});
```

**SQL Injection Prevention:**

| Layer | Mechanism |
|-------|-----------|
| **ORM** | Prisma generates parameterized queries |
| **Raw queries** | Always use `$1`, `$2` parameterized syntax |
| **Input validation** | Zod schemas reject unexpected types |
| **UUID validation** | Regex check on all resource IDs: `/^[a-z0-9_]+$/` |
| **No string interpolation** | ESLint rule禁止 template literals in queries |

```typescript
// WRONG — vulnerable
const query = `SELECT * FROM tasks WHERE workspace_id = '${workspaceId}'`;

// RIGHT — parameterized
const tasks = await prisma.task.findMany({
  where: { workspaceId },
});
```

### 15.4 Security Headers

```typescript
// Helmet.js configuration
const helmetConfig = {
  contentSecurityPolicy: { /* see above */ },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
};
```

### 15.5 Request Size Limits

| Content Type | Limit | Config |
|-------------|-------|--------|
| JSON body | 1 MB | `express.json({ limit: '1mb' })` |
| Multipart upload | 50 MB | `multer({ limits: { fileSize: 50 * 1024 * 1024 } })` |
| URL length | 2,048 chars | Cloudflare limit |
| WebSocket message | 64 KB | WS library config |
| Query string | 4,096 chars | Express default |

### 15.6 Idempotency

For `POST` endpoints that create resources:

```http
POST /api/v1/tasks
Idempotency-Key: idem_a1b2c3d4-e5f6-7890-abcd-ef1234567890
Content-Type: application/json

{
  "title": "Implement OAuth2 login"
}
```

**Rules:**

- Key is a UUID, sent via `Idempotency-Key` header
- Stored for 24 hours
- Same key + same payload = cached response (no duplicate creation)
- Same key + different payload = `409 CONFLICT`
- Only applies to `POST`; `PUT`/`DELETE` are inherently idempotent

### 15.7 Audit Logging

Every state-changing operation is logged:

```json
{
  "id": "audit_x1y2z3",
  "timestamp": "2026-07-08T14:22:00Z",
  "actor": {
    "id": "user_9x8w7v6u",
    "type": "user",
    "ip": "203.0.113.42",
    "user_agent": "Mozilla/5.0..."
  },
  "action": "task.created",
  "resource": {
    "type": "task",
    "id": "task_8f3k2j1m"
  },
  "changes": {
    "title": { "after": "Implement OAuth2 login" },
    "status": { "after": "todo" }
  },
  "context": {
    "workspace_id": "ws_5e6f7g8h",
    "project_id": "proj_1b2c3d4e",
    "request_id": "req_a1b2c3d4"
  }
}
```

---

## 16. Testing Strategy

### 16.1 Testing Pyramid

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E╲          ~10% — Full user journeys
                 ╱──────╲
                ╱Contract╲        ~20% — API contract tests
               ╱──────────╲
              ╱ Integration ╲     ~30% — Route + DB + service
             ╱────────────────╲
            ╱    Unit Tests     ╲  ~40% — Isolated business logic
           ╱──────────────────────╲
```

### 16.2 Unit Tests

Test Zod schemas, validation logic, and business rules in isolation:

```typescript
import { describe, it, expect } from 'vitest';
import { CreateTaskSchema } from '../schemas/tasks.schema';

describe('CreateTaskSchema', () => {
  it('rejects title shorter than 3 characters', () => {
    const result = CreateTaskSchema.safeParse({ title: 'ab' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe('too_small');
    }
  });

  it('rejects invalid priority', () => {
    const result = CreateTaskSchema.safeParse({
      title: 'Valid task title',
      priority: 'critical',  // not in enum
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid task payload', () => {
    const result = CreateTaskSchema.safeParse({
      title: 'Implement OAuth2 login',
      priority: 'high',
    });
    expect(result.success).toBe(true);
  });
});
```

### 16.3 Integration Tests

Test complete request/response cycle with a test database:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { testDb, createTestUser, createTestWorkspace } from '../helpers';

describe('POST /api/v1/tasks', () => {
  let authToken: string;
  let listId: string;

  beforeAll(async () => {
    const user = await createTestUser({ email: 'test@example.com' });
    const workspace = await createTestWorkspace(user.id);
    authToken = await loginAs(user);
    listId = workspace.defaultListId;
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it('creates a task and returns 201', async () => {
    const response = await request(app)
      .post(`/api/v1/lists/${listId}/tasks`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({
        title: 'Implement OAuth2 login',
        priority: 'high',
      })
      .expect(201);

    expect(response.body.data.id).toMatch(/^task_/);
    expect(response.body.data.attributes.title).toBe('Implement OAuth2 login');
    expect(response.body.meta.request_id).toBeDefined();
  });

  it('returns 401 without auth token', async () => {
    await request(app)
      .post(`/api/v1/lists/${listId}/tasks`)
      .send({ title: 'No auth task' })
      .expect(401);
  });

  it('returns 422 with invalid data', async () => {
    const response = await request(app)
      .post(`/api/v1/lists/${listId}/tasks`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ title: '' })
      .expect(422);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toHaveLength(1);
  });
});
```

### 16.4 Contract Tests

Verify API responses match the OpenAPI specification:

```typescript
import { describe, it, expect } from 'vitest';
import { OpenAPI } from 'openapi-types';
import { validateResponse } from 'openapi-validator';
import { spec } from '../openapi-spec';
import request from 'supertest';
import { app } from '../../src/app';

describe('API Contract Tests', () => {
  it('GET /api/v1/tasks matches OpenAPI spec', async () => {
    const response = await request(app)
      .get('/api/v1/tasks')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200);

    const validation = validateResponse(spec, '/api/v1/tasks', 'get', response);
    expect(validation.valid).toBe(true);
  });

  it('POST /api/v1/tasks response matches spec', async () => {
    const response = await request(app)
      .post(`/api/v1/lists/${listId}/tasks`)
      .set('Authorization', `Bearer ${testToken}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ title: 'Contract test task' })
      .expect(201);

    const validation = validateResponse(spec, '/api/v1/lists/{lid}/tasks', 'post', response);
    expect(validation.valid).toBe(true);
  });
});
```

### 16.5 Mock Server

Prism mock server for frontend development before backend is ready:

```bash
# Start mock server from OpenAPI spec
npx @stoplight/prism-cli mock docs/openapi.yaml --port 4010

# Frontend points to mock server
VITE_API_URL=http://localhost:4010/api/v1
```

### 16.6 Load Testing

```bash
# k6 load test script
k6 run --vus 100 --duration 5m tests/load/tasks-api.js
```

```javascript
// tests/load/tasks-api.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up
    { duration: '3m', target: 100 },   // Sustained load
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${API_URL}/api/v1/tasks?limit=25`, {
    headers: { Authorization: `Bearer ${__ENV.TEST_TOKEN}` },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has pagination': (r) => JSON.parse(r.body).pagination !== undefined,
  });

  sleep(1);
}
```

### 16.7 Test Environment Matrix

| Environment | Purpose | Data | Deploy |
|-------------|---------|------|--------|
| **Local** | Development | SQLite / Docker PG | Local machine |
| **Test** | CI/CD unit + integration | PostgreSQL in Docker | CI runner |
| **Staging** | Contract + E2E + load | Production snapshot (anonymized) | Cloudflare |
| **Production** | Live | Real data | Cloudflare |

---

## 17. Endpoint Reference

### 17.1 Auth Endpoints

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `POST` | `/auth/register` | Register new account | None | 5/hr |
| `POST` | `/auth/login` | Email + password login | None | 5/15min |
| `POST` | `/auth/logout` | Revoke tokens | Bearer | Unlimited |
| `POST` | `/auth/refresh` | Refresh access token | Cookie | 20/min |
| `POST` | `/auth/forgot-password` | Request password reset | None | 3/hr |
| `POST` | `/auth/reset-password` | Reset with token | None | 5/hr |
| `GET` | `/auth/oauth/:provider` | Initiate OAuth flow | None | 10/hr |
| `GET` | `/auth/oauth/:provider/callback` | OAuth callback | None | 10/hr |
| `POST` | `/auth/mfa/setup` | Enable MFA | Bearer | 5/hr |
| `POST` | `/auth/mfa/verify` | Verify MFA code | Bearer | 5/15min |
| `POST` | `/auth/mfa/disable` | Disable MFA | Bearer | 5/hr |
| `POST` | `/auth/device/code` | CLI device auth flow | None | 10/hr |
| `POST` | `/auth/device/token` | Poll device auth status | None | 20/min |

### 17.2 User Endpoints

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `GET` | `/users/me` | Get current user profile | Bearer | 100/min |
| `PATCH` | `/users/me` | Update profile | Bearer | 30/min |
| `POST` | `/users/me/avatar` | Upload avatar | Bearer | 10/min |
| `DELETE` | `/users/me/avatar` | Remove avatar | Bearer | 10/min |
| `GET` | `/users/me/preferences` | Get preferences | Bearer | 100/min |
| `PUT` | `/users/me/preferences` | Update preferences | Bearer | 30/min |
| `GET` | `/users/me/notification-settings` | Get notification prefs | Bearer | 100/min |
| `PUT` | `/users/me/notification-settings` | Update notification prefs | Bearer | 30/min |

### 17.3 Workspace Endpoints

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `GET` | `/workspaces` | List user's workspaces | Bearer | 100/min |
| `POST` | `/workspaces` | Create workspace | Bearer | 5/hr |
| `GET` | `/workspaces/:wid` | Get workspace details | Bearer | 100/min |
| `PATCH` | `/workspaces/:wid` | Update workspace | Bearer/Admin | 30/min |
| `DELETE` | `/workspaces/:wid` | Delete workspace | Bearer/Owner | 1/day |
| `GET` | `/workspaces/:wid/members` | List members | Bearer | 100/min |
| `POST` | `/workspaces/:wid/members` | Invite member | Bearer/Admin | 20/min |
| `PATCH` | `/workspaces/:wid/members/:uid` | Update member role | Bearer/Admin | 30/min |
| `DELETE` | `/workspaces/:wid/members/:uid` | Remove member | Bearer/Admin | 30/min |
| `GET` | `/workspaces/:wid/roles` | List roles | Bearer | 100/min |
| `POST` | `/workspaces/:wid/roles` | Create role | Bearer/Admin | 10/min |
| `PATCH` | `/workspaces/:wid/roles/:rid` | Update role | Bearer/Admin | 10/min |
| `DELETE` | `/workspaces/:wid/roles/:rid` | Delete role | Bearer/Admin | 10/min |
| `GET` | `/workspaces/:wid/settings` | Get settings | Bearer | 100/min |
| `PUT` | `/workspaces/:wid/settings` | Update settings | Bearer/Admin | 10/min |
| `GET` | `/workspaces/:wid/billing` | Get billing info | Bearer/Owner | 10/hr |
| `PATCH` | `/workspaces/:wid/billing` | Update billing | Bearer/Owner | 5/hr |

### 17.4 Project Endpoints

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `GET` | `/workspaces/:wid/projects` | List projects | Bearer | 100/min |
| `POST` | `/workspaces/:wid/projects` | Create project | Bearer | 20/min |
| `GET` | `/workspaces/:wid/projects/:pid` | Get project | Bearer | 100/min |
| `PATCH` | `/workspaces/:wid/projects/:pid` | Update project | Bearer/Admin | 30/min |
| `DELETE` | `/workspaces/:wid/projects/:pid` | Delete project | Bearer/Admin | 10/hr |
| `GET` | `/workspaces/:wid/projects/:pid/members` | List members | Bearer | 100/min |
| `POST` | `/workspaces/:wid/projects/:pid/members` | Add member | Bearer/Admin | 20/min |
| `PATCH` | `/workspaces/:wid/projects/:pid/members/:uid` | Update member | Bearer/Admin | 30/min |
| `DELETE` | `/workspaces/:wid/projects/:pid/members/:uid` | Remove member | Bearer/Admin | 30/min |
| `GET` | `/workspaces/:wid/projects/:pid/labels` | List labels | Bearer | 100/min |
| `POST` | `/workspaces/:wid/projects/:pid/labels` | Create label | Bearer | 20/min |
| `PATCH` | `/workspaces/:wid/projects/:pid/labels/:lid` | Update label | Bearer | 20/min |
| `DELETE` | `/workspaces/:wid/projects/:pid/labels/:lid` | Delete label | Bearer | 20/min |
| `GET` | `/workspaces/:wid/projects/:pid/settings` | Get settings | Bearer | 100/min |
| `PUT` | `/workspaces/:wid/projects/:pid/settings` | Update settings | Bearer/Admin | 10/min |

### 17.5 Folder Endpoints

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `GET` | `/workspaces/:wid/projects/:pid/folders` | List folders | Bearer | 100/min |
| `POST` | `/workspaces/:wid/projects/:pid/folders` | Create folder | Bearer | 20/min |
| `GET` | `/workspaces/:wid/projects/:pid/folders/:fid` | Get folder | Bearer | 100/min |
| `PATCH` | `/workspaces/:wid/projects/:pid/folders/:fid` | Update folder | Bearer | 20/min |
| `DELETE` | `/workspaces/:wid/projects/:pid/folders/:fid` | Delete folder | Bearer | 10/hr |
| `GET` | `/workspaces/:wid/projects/:pid/folders/:fid/subfolders` | Get subfolders | Bearer | 100/min |

### 17.6 List Endpoints

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `GET` | `/workspaces/:wid/projects/:pid/lists` | List all lists | Bearer | 100/min |
| `POST` | `/workspaces/:wid/projects/:pid/lists` | Create list | Bearer | 20/min |
| `GET` | `/workspaces/:wid/projects/:pid/lists/:lid` | Get list | Bearer | 100/min |
| `PATCH` | `/workspaces/:wid/projects/:pid/lists/:lid` | Update list | Bearer | 20/min |
| `DELETE` | `/workspaces/:wid/projects/:pid/lists/:lid` | Delete list | Bearer | 10/hr |
| `GET` | `/workspaces/:wid/projects/:pid/lists/:lid/views` | List views | Bearer | 100/min |
| `POST` | `/workspaces/:wid/projects/:pid/lists/:lid/views` | Create view | Bearer | 20/min |
| `GET` | `.../views/:vid` | Get view | Bearer | 100/min |
| `PATCH` | `.../views/:vid` | Update view | Bearer | 20/min |
| `DELETE` | `.../views/:vid` | Delete view | Bearer | 10/hr |
| `GET` | `/workspaces/:wid/projects/:pid/lists/:lid/filters` | List saved filters | Bearer | 100/min |
| `POST` | `/workspaces/:wid/projects/:pid/lists/:lid/filters` | Save filter | Bearer | 20/min |
| `DELETE` | `.../filters/:fid` | Delete filter | Bearer | 20/min |

### 17.7 Task Endpoints

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `GET` | `/tasks` | List tasks (global) | Bearer | 100/min |
| `POST` | `/lists/:lid/tasks` | Create task in list | Bearer | 30/min |
| `GET` | `/tasks/:tid` | Get task | Bearer | 100/min |
| `PATCH` | `/tasks/:tid` | Update task | Bearer | 60/min |
| `DELETE` | `/tasks/:tid` | Delete task | Bearer | 20/min |
| `GET` | `/tasks/:tid/subtasks` | List subtasks | Bearer | 100/min |
| `POST` | `/tasks/:tid/subtasks` | Create subtask | Bearer | 30/min |
| `POST` | `/tasks/:tid/assign` | Assign user | Bearer | 30/min |
| `DELETE` | `/tasks/:tid/assign/:uid` | Unassign user | Bearer | 30/min |
| `POST` | `/tasks/:tid/move` | Move task to list | Bearer | 30/min |
| `GET` | `/tasks/:tid/time-entries` | List time entries | Bearer | 100/min |
| `POST` | `/tasks/:tid/time-entries` | Log time | Bearer | 30/min |
| `PATCH` | `/tasks/bulk` | Bulk update tasks | Bearer | 10/min |
| `DELETE` | `/tasks/bulk` | Bulk delete tasks | Bearer | 10/min |
| `POST` | `/tasks/bulk/move` | Bulk move tasks | Bearer | 10/min |
| `POST` | `/tasks/bulk/assign` | Bulk assign tasks | Bearer | 10/min |

### 17.8 Document Endpoints

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `GET` | `/documents` | List documents | Bearer | 100/min |
| `POST` | `/documents` | Create document | Bearer | 20/min |
| `GET` | `/documents/:did` | Get document | Bearer | 100/min |
| `PATCH` | `/documents/:did` | Update document meta | Bearer | 30/min |
| `DELETE` | `/documents/:did` | Delete document | Bearer | 10/hr |
| `GET` | `/documents/:did/blocks` | List blocks | Bearer | 100/min |
| `POST` | `/documents/:did/blocks` | Create block | Bearer | 60/min |
| `GET` | `/documents/:did/blocks/:bid` | Get block | Bearer | 100/min |
| `PATCH` | `/documents/:did/blocks/:bid` | Update block | Bearer | 120/min |
| `DELETE` | `/documents/:did/blocks/:bid` | Delete block | Bearer | 20/min |

### 17.9 Comment Endpoints

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `GET` | `/comments` | List comments (with task_id filter) | Bearer | 100/min |
| `POST` | `/comments` | Create comment | Bearer | 60/min |
| `GET` | `/comments/:cid` | Get comment | Bearer | 100/min |
| `PATCH` | `/comments/:cid` | Edit comment | Bearer | 30/min |
| `DELETE` | `/comments/:cid` | Delete comment | Bearer | 20/min |
| `POST` | `/comments/:cid/reactions` | Add reaction | Bearer | 60/min |
| `DELETE` | `/comments/:cid/reactions/:emoji` | Remove reaction | Bearer | 60/min |

### 17.10 Attachment Endpoints

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `GET` | `/attachments` | List attachments (with filters) | Bearer | 100/min |
| `POST` | `/attachments/upload` | Upload file (multipart) | Bearer | 10/min |
| `GET` | `/attachments/:aid` | Download file | Bearer | 100/min |
| `DELETE` | `/attachments/:aid` | Delete attachment | Bearer | 20/min |

### 17.11 Search, Activity & Automations

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `GET` | `/search` | Full-text search | Bearer | 60/min |
| `GET` | `/activity/feed` | Activity feed | Bearer | 100/min |
| `GET` | `/activity/audit-log` | Audit log (admin) | Bearer/Admin | 30/min |
| `GET` | `/automations` | List automations | Bearer | 100/min |
| `POST` | `/automations` | Create automation | Bearer | 10/min |
| `GET` | `/automations/:aid` | Get automation | Bearer | 100/min |
| `PATCH` | `/automations/:aid` | Update automation | Bearer | 10/min |
| `DELETE` | `/automations/:aid` | Delete automation | Bearer | 10/hr |
| `POST` | `/automations/:aid/toggle` | Enable/disable | Bearer | 10/min |
| `POST` | `/automations/:aid/test` | Test automation | Bearer | 5/min |

### 17.12 Webhook, Notification, AI & Admin Endpoints

| Method | Path | Description | Auth | Rate Limit |
|--------|------|-------------|------|------------|
| `GET` | `/webhooks` | List webhooks | Bearer | 100/min |
| `POST` | `/webhooks` | Create webhook | Bearer | 10/hr |
| `GET` | `/webhooks/:whid` | Get webhook | Bearer | 100/min |
| `PATCH` | `/webhooks/:whid` | Update webhook | Bearer | 10/min |
| `DELETE` | `/webhooks/:whid` | Delete webhook | Bearer | 10/hr |
| `GET` | `/webhooks/:whid/deliveries` | Delivery log | Bearer | 30/min |
| `POST` | `/webhooks/:whid/test` | Send test event | Bearer | 5/min |
| `GET` | `/notifications` | List notifications | Bearer | 100/min |
| `POST` | `/notifications/:nid/read` | Mark read | Bearer | 100/min |
| `POST` | `/notifications/read-all` | Mark all read | Bearer | 10/min |
| `GET` | `/notifications/preferences` | Get prefs | Bearer | 100/min |
| `PUT` | `/notifications/preferences` | Update prefs | Bearer | 10/min |
| `POST` | `/ai/chat` | AI chat assistant | Bearer | 30/min |
| `POST` | `/ai/summarize` | Summarize resource | Bearer | 30/min |
| `POST` | `/ai/auto-assign` | AI auto-assign | Bearer | 10/min |
| `GET` | `/admin/stats` | Workspace stats | Bearer/Admin | 10/min |
| `GET` | `/admin/users` | List all users | Bearer/Admin | 30/min |
| `PATCH` | `/admin/users/:uid` | Update user | Bearer/Admin | 10/min |
| `GET` | `/admin/feature-flags` | Feature flags | Bearer/Admin | 60/min |
| `PATCH` | `/admin/feature-flags/:flag` | Toggle flag | Bearer/Admin | 10/min |
| `GET` | `/admin/system-health` | System health | Bearer/Admin | 10/min |
| `POST` | `/exports/csv` | Export CSV | Bearer | 5/hr |
| `POST` | `/exports/pdf` | Export PDF | Bearer | 5/hr |

---

## 18. Quick Reference

### 18.1 Common Patterns

```bash
# ─── Authentication ─────────────────────────────
Authorization: Bearer <jwt_access_token>
X-API-Key: <api_key>                          # Alternative auth

# ─── Request Headers ────────────────────────────
Content-Type: application/json
Idempotency-Key: <uuid>                       # POST requests
X-Request-ID: <uuid>                          # Client-generated trace ID
Accept: application/json
Accept-Version: 2026-07-08                     # Pin API version

# ─── Response Headers ───────────────────────────
X-Request-ID: <uuid>                          # Server-generated trace ID
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1751990520
ETag: "abc123"                                # Cache validation
Deprecation: Sat, 08 Jan 2027 00:00:00 GMT    # Deprecated endpoint
Sunset: Sun, 08 Jul 2027 00:00:00 GMT         # Sunset date
```

### 18.2 Quick cURL Examples

```bash
# Login
curl -X POST https://api.sprintio.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"s3cure_p@ss"}'

# List tasks with filters and pagination
curl https://api.sprintio.app/api/v1/tasks?status=in_progress&priority=high&limit=10 \
  -H "Authorization: Bearer $TOKEN"

# Create a task
curl -X POST https://api.sprintio.app/api/v1/lists/list_4t5y6z7a/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"title":"New task","priority":"high"}'

# Update a task
curl -X PATCH https://api.sprintio.app/api/v1/tasks/task_8f3k2j1m \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'

# Upload a file
curl -X POST https://api.sprintio.app/api/v1/attachments/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@document.pdf" \
  -F "task_id=task_8f3k2j1m" \
  -F "workspace_id=ws_5e6f7g8h"

# Full-text search
curl "https://api.sprintio.app/api/v1/search?q=oauth&types=task,document" \
  -H "Authorization: Bearer $TOKEN"

# Export tasks as CSV
curl -X POST https://api.sprintio.app/api/v1/exports/csv \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"project_id":"proj_1b2c3d4e","format":"csv"}'
```

### 18.3 ID Format Reference

| Resource | Prefix | Example | Length |
|----------|--------|---------|--------|
| User | `usr_` | `usr_9x8w7v6u` | 16 |
| Workspace | `ws_` | `ws_5e6f7g8h` | 14 |
| Project | `proj_` | `proj_1b2c3d4e` | 16 |
| Folder | `folder_` | `folder_3a4b5c6d` | 18 |
| List | `list_` | `list_4t5y6z7a` | 15 |
| Task | `task_` | `task_8f3k2j1m` | 14 |
| Document | `doc_` | `doc_7h8i9j0k` | 13 |
| Comment | `cmt_` | `cmt_1a2b3c4d` | 13 |
| Attachment | `att_` | `att_9e8f7g6h` | 13 |
| Label | `lbl_` | `lbl_2d3e4f5a` | 13 |
| Automation | `auto_` | `auto_6b7c8d9e` | 14 |
| Webhook | `wh_` | `wh_a1b2c3d4` | 12 |
| Role | `role_` | `role_e5f6a7b8` | 14 |
| View | `view_` | `view_c9d0e1f2` | 14 |
| Filter | `flt_` | `flt_a3b4c5d6` | 13 |
| Time Entry | `te_` | `te_1a2b3c4d` | 12 |
| Notification | `ntf_` | `ntf_5e6f7a8b` | 13 |
| Event | `evt_` | `evt_1a2b3c4d` | 13 |
| Request | `req_` | `req_a1b2c3d4-e5f6-7890-abcd-ef1234567890` | UUID |

### 18.4 Status Enums

```typescript
// Task statuses (Kanban flow)
type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';

// Task priorities
type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

// Project statuses
type ProjectStatus = 'active' | 'on_hold' | 'archived' | 'deleted';

// Member roles
type MemberRole = 'owner' | 'admin' | 'member' | 'viewer' | 'guest';

// Automation trigger types
type AutomationTrigger = 'status_change' | 'assignee_change' | 'due_date_approaching' | 'label_added' | 'schedule';

// Automation action types
type AutomationAction = 'assign' | 'move_to_list' | 'add_label' | 'remove_label' | 'set_priority' | 'notify' | 'webhook';
```

### 18.5 Date & Time Conventions

| Convention | Format | Example |
|------------|--------|---------|
| Timestamps | ISO 8601 UTC | `2026-07-08T14:22:00Z` |
| Dates only | ISO 8601 date | `2026-07-08` |
| Relative (filter) | Relative notation | `7d` (7 days), `2w` (2 weeks), `1m` (1 month) |
| Durations | ISO 8601 duration | `PT4H30M` (4 hours 30 minutes) |
| Time zones | Always UTC in API | Client converts to local |

---

> **Document End**
> For the interactive API reference, visit: `https://docs.sprintio.app/api`
> OpenAPI spec: `https://api.sprintio.app/api/v1/openapi.json`
> Status page: `https://status.sprintio.app`
