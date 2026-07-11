# Sprintio — Database Architecture

**Document Type:** Database Architecture  
**Product:** Sprintio — Sprint fast. Ship together.  
**Version:** 1.0  
**Status:** Finalized  
**Date:** 2026-07-07  
**Related Docs:** [PRD](../PRD.md), [NFRs](../NON_FUNCTIONAL_REQUIREMENTS.md), [Functional Requirements](../FUNCTIONAL_REQUIREMENTS.md), [MVP Definition](../MVP_DEFINITION.md)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Choices](#2-technology-choices)
3. [Schema Design](#3-schema-design)
4. [Entity Relationship Diagram](#4-entity-relationship-diagram)
5. [Migration Strategy](#5-migration-strategy)
6. [Indexing Strategy](#6-indexing-strategy)
7. [Query Patterns](#7-query-patterns)
8. [Partitioning (TimescaleDB)](#8-partitioning-timescaledb)
9. [Row-Level Security](#9-row-level-security)
10. [Soft Deletes](#10-soft-deletes)
11. [JSONB Patterns](#11-jsonb-patterns)
12. [Vector Search (pgvector)](#12-vector-search-pgvector)
13. [Connection Pooling](#13-connection-pooling)
14. [Backup & Recovery](#14-backup--recovery)
15. [Performance & Optimization](#15-performance--optimization)
16. [Redis Cache Architecture](#16-redis-cache-architecture)
17. [Quick Reference Cheat Sheet](#17-quick-reference-cheat-sheet)

---

## 1. Executive Summary

Sprintio's data architecture is built on **PostgreSQL 16** with extensions that deliver enterprise-grade capabilities without sacrificing operational simplicity. This document defines the complete database layer — from schema design through disaster recovery — ensuring the platform scales from MVP (50 workspaces, 500 DAU) to full production (100K+ workspaces, 10K+ concurrent users).

### Key Design Principles

| Principle                    | Implementation                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| **Workspace isolation**      | Every query is scoped to a workspace via RLS policies — no data leaks across boundaries  |
| **Append-only auditability** | Activity log, webhook deliveries, and automation runs are immutable append-only records  |
| **Extensible schema**        | JSONB metadata columns + typed custom field tables let us add features without migration |
| **Zero-downtime evolution**  | All migrations are reversible, versioned, and designed for online deployment             |
| **Read replica scaling**     | Reads route to replicas; writes hit primary — connection pooling handles the split       |
| **Time-series optimization** | TimescaleDB hypertables for activity logs and metrics with automatic partitioning        |

### Scale Targets (from NFRs)

| Metric                         | MVP Target | Full Production |
| ------------------------------ | ---------- | --------------- |
| Total workspaces               | 100        | 100,000+        |
| Total users                    | 1,000      | 1,000,000+      |
| Total tasks                    | 100,000    | 1,000,000,000+  |
| Tasks per project              | 5,000      | 100,000+        |
| Concurrent users/workspace     | 50         | 500+            |
| DB query latency (p95)         | < 50ms     | < 50ms          |
| Activity log entries/workspace | 100,000    | 10,000,000+     |

---

## 2. Technology Choices

### 2.1 ORM Recommendation: Drizzle ORM

**Recommendation: Drizzle ORM** over Prisma.

| Factor                      | Drizzle ORM                                                            | Prisma                                            |
| --------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------- |
| **Query performance**       | Compiles to raw SQL — no query engine overhead                         | Routes through Rust query engine — adds latency   |
| **PostgreSQL extensions**   | Native support for pgvector, TimescaleDB, RLS                          | Limited; raw SQL escape hatch needed              |
| **SQL migration control**   | Generates plain SQL migrations — full control                          | Abstracted migrations — less control              |
| **Bundle size**             | ~50KB (tree-shakeable)                                                 | ~150KB+ (includes query engine)                   |
| **PgBouncer compatibility** | Excellent — uses standard prepared statements or parameterized queries | Poor — Prisma engine opens long-lived connections |
| **Type safety**             | TypeBox/Zod schema inference; strict SQL types                         | Excellent type inference from schema              |
| **JSONB support**           | First-class typed JSONB columns                                        | Supported but less ergonomic                      |
| **Raw SQL access**          | Seamless `sql` template literal with type inference                    | `db.$queryRaw` — less integrated                  |
| **Migration philosophy**    | Plain SQL — version-controlled, reviewable, reversible                 | Abstraction-first — can obscure what runs         |
| **Runtime overhead**        | Minimal — direct SQL execution                                         | Rust engine + TCP connection to query proxy       |
| **Community (2026)**        | Growing rapidly; strong PostgreSQL community                           | Larger overall; declining PostgreSQL mindshare    |

**Why Drizzle wins for Sprintio:**

1. **PgBouncer is critical** at our scale — Prisma's connection model conflicts with pooled connections
2. **pgvector and TimescaleDB** need first-class SQL support, not escape hatches
3. **Plain SQL migrations** give DBAs and senior engineers full visibility into schema changes
4. **Zero runtime overhead** matters when every API call must hit < 200ms (NFR-PERF-04)
5. **RLS policies** are expressed in SQL and Drizzle's `withRLS` helper integrates cleanly

### 2.2 Database Extensions

```sql
-- Required extensions (run once per database)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";        -- UUID generation (uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";          -- Encryption functions (pgp_sym_encrypt)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";           -- Trigram index for fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";         -- GIN index support for composite types
CREATE EXTENSION IF NOT EXISTS "pgvector";          -- Vector similarity search (Phase 2)
CREATE EXTENSION IF NOT EXISTS "timescaledb";       -- Time-series hypertables (Phase 2)
-- PostgreSQL 16 built-in (no extension needed):
-- - pg_stat_statements (query performance monitoring)
-- - pg_partman (partition management, optional)
```

### 2.3 Infrastructure Stack

| Component             | Technology                   | Purpose                                |
| --------------------- | ---------------------------- | -------------------------------------- |
| **Primary Database**  | PostgreSQL 16                | OLTP workload, all core tables         |
| **Read Replica**      | PostgreSQL 16                | Read scaling, analytics queries        |
| **Connection Pooler** | PgBouncer (transaction mode) | Connection multiplexing                |
| **Cache**             | Redis 7 Cluster              | Session cache, hot data, rate limiting |
| **Object Storage**    | Cloudflare R2                | File attachments, document exports     |
| **Time-Series**       | TimescaleDB (extension)      | Activity log, metrics hypertables      |
| **Vector Search**     | pgvector (Phase 2)           | Semantic search embeddings             |
| **ORM**               | Drizzle ORM                  | Schema definition, queries, migrations |

---

## 3. Schema Design

### 3.1 Schema Organization

Sprintio uses a **single-database, multi-schema** strategy:

```
sprintio_db
├── public          -- Core application tables
├── auth            -- Authentication (users, sessions, API keys)
├── workspace       -- Workspace-scoped entities (projects, tasks, docs)
├── automation      -- Automation engine (rules, runs, logs)
├── integration     -- External integrations (GitHub, Slack, webhooks)
├── analytics       -- Metrics, usage tracking, aggregation views
└── timeseries      -- TimescaleDB hypertables (activity_log, metrics)
```

> **Why schemas?** Logical grouping keeps migrations organized, simplifies RLS policy application, and makes it trivial to grant/revoke access at the schema level. PostgreSQL schemas have near-zero overhead — they are namespaces, not separate databases.

### 3.2 Core Tables — Authentication (`auth` schema)

```sql
-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE auth.users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    name            VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    password_hash   TEXT,                          -- NULL for OAuth-only users
    locale          VARCHAR(10) DEFAULT 'en',
    timezone        VARCHAR(50) DEFAULT 'UTC',
    last_active_at  TIMESTAMPTZ,

    -- Soft delete
    deleted_at      TIMESTAMPTZ,

    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON auth.users (email);
CREATE INDEX idx_users_deleted ON auth.users (deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- USER ACCOUNTS (OAuth providers)
-- ============================================================
CREATE TABLE auth.user_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider        VARCHAR(50) NOT NULL,          -- 'google', 'github', 'email'
    provider_uid    VARCHAR(255) NOT NULL,         -- Provider's user ID
    provider_data   JSONB DEFAULT '{}',            -- Profile data from provider

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (provider, provider_uid)
);

CREATE INDEX idx_user_accounts_user ON auth.user_accounts (user_id);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE auth.sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL UNIQUE,           -- Hashed refresh token
    user_agent      TEXT,
    ip_address      INET,
    device_name     VARCHAR(255),
    is_trusted      BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON auth.sessions (user_id);
CREATE INDEX idx_sessions_expires ON auth.sessions (expires_at);
-- Auto-cleanup: DELETE FROM auth.sessions WHERE expires_at < NOW();

-- ============================================================
-- API KEYS
-- ============================================================
CREATE TABLE auth.api_keys (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL,                 -- FK added after workspace table
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    key_prefix      VARCHAR(10) NOT NULL,          -- First 8 chars for identification
    key_hash        TEXT NOT NULL UNIQUE,           -- SHA-256 of the full key
    scopes          TEXT[] NOT NULL DEFAULT '{}',   -- e.g., {'tasks:read', 'tasks:write'}
    expires_at      TIMESTAMPTZ,
    last_used_at    TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_workspace ON auth.api_keys (workspace_id);
CREATE INDEX idx_api_keys_prefix ON auth.api_keys (key_prefix);
```

### 3.3 Core Tables — Workspace (`workspace` schema)

```sql
-- ============================================================
-- WORKSPACES
-- ============================================================
CREATE TABLE workspace.workspaces (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,  -- URL-friendly identifier
    description     TEXT,
    logo_url        TEXT,

    -- Settings
    settings        JSONB NOT NULL DEFAULT '{
        "default_currency": "USD",
        "timezone": "UTC",
        "week_starts_on": "monday",
        "ai_enabled": true,
        "ai_instructions": ""
    }'::jsonb,

    -- Branding (for client portals)
    branding        JSONB NOT NULL DEFAULT '{
        "primary_color": "#6366f1",
        "logo_url": null,
        "custom_domain": null
    }'::jsonb,

    -- Plan & limits
    plan            VARCHAR(20) NOT NULL DEFAULT 'free',
    max_members     INT NOT NULL DEFAULT 5,
    max_projects    INT NOT NULL DEFAULT 10,
    storage_limit_bytes BIGINT NOT NULL DEFAULT 1073741824,  -- 1GB free tier

    -- Soft delete
    deleted_at      TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workspaces_slug ON workspace.workspaces (slug);
CREATE INDEX idx_workspaces_deleted ON workspace.workspaces (deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- WORKSPACE MEMBERSHIPS
-- ============================================================
CREATE TABLE workspace.memberships (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL DEFAULT 'member',
    -- Roles: 'owner', 'admin', 'member', 'guest', 'viewer'

    -- Guest-specific
    scope_type      VARCHAR(20),                   -- 'task', 'list', 'folder', NULL for full
    scope_id        UUID,
    expires_at      TIMESTAMPTZ,                   -- Guest access expiry

    -- Invitation state
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    -- Status: 'pending', 'active', 'deactivated'
    invited_by      UUID REFERENCES auth.users(id),
    invited_at      TIMESTAMPTZ,
    accepted_at     TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_memberships_workspace ON workspace.memberships (workspace_id);
CREATE INDEX idx_memberships_user ON workspace.memberships (user_id);
CREATE INDEX idx_memberships_status ON workspace.memberships (workspace_id, status);

-- ============================================================
-- TEAMS
-- ============================================================
CREATE TABLE workspace.teams (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    parent_team_id  UUID REFERENCES workspace.teams(id),  -- Nested groups

    -- Avatar
    avatar_url      TEXT,
    color           VARCHAR(7),                     -- Hex color for sidebar

    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_workspace ON workspace.teams (workspace_id);
CREATE INDEX idx_teams_parent ON workspace.teams (parent_team_id) WHERE parent_team_id IS NOT NULL;

-- ============================================================
-- TEAM MEMBERS
-- ============================================================
CREATE TABLE workspace.team_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id         UUID NOT NULL REFERENCES workspace.teams(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (team_id, user_id)
);

CREATE INDEX idx_team_members_team ON workspace.team_members (team_id);
CREATE INDEX idx_team_members_user ON workspace.team_members (user_id);
```

### 3.4 Core Tables — Projects & Tasks (`workspace` schema)

```sql
-- ============================================================
-- SPACES (top-level project areas)
-- ============================================================
CREATE TABLE workspace.spaces (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    icon            VARCHAR(50),                    -- Emoji or icon identifier
    color           VARCHAR(7),                     -- Hex color

    -- Ordering
    sort_order      INT NOT NULL DEFAULT 0,

    -- Visibility
    is_archived     BOOLEAN NOT NULL DEFAULT FALSE,

    -- Custom status definitions (per-space status workflow)
    statuses        JSONB NOT NULL DEFAULT '[
        {"id": "backlog",     "name": "Backlog",     "color": "#94a3b8", "type": "open",    "order": 0},
        {"id": "todo",        "name": "To Do",        "color": "#3b82f6", "type": "open",    "order": 1},
        {"id": "in_progress", "name": "In Progress",  "color": "#f59e0b", "type": "active",  "order": 2},
        {"id": "in_review",   "name": "In Review",    "color": "#8b5cf6", "type": "active",  "order": 3},
        {"id": "done",        "name": "Done",         "color": "#22c55e", "type": "closed",  "order": 4},
        {"id": "cancelled",   "name": "Cancelled",    "color": "#ef4444", "type": "cancelled","order": 5}
    ]'::jsonb,

    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spaces_workspace ON workspace.spaces (workspace_id);
CREATE INDEX idx_spaces_archived ON workspace.spaces (workspace_id, is_archived);

-- ============================================================
-- FOLDERS
-- ============================================================
CREATE TABLE workspace.folders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    space_id        UUID NOT NULL REFERENCES workspace.spaces(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES workspace.folders(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,

    -- Materialized path for efficient hierarchy queries
    path            TEXT NOT NULL,                  -- e.g., '/root/child/grandchild'
    depth           INT NOT NULL DEFAULT 0,
    sort_order      INT NOT NULL DEFAULT 0,

    is_archived     BOOLEAN NOT NULL DEFAULT FALSE,

    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_folders_workspace ON workspace.folders (workspace_id);
CREATE INDEX idx_folders_space ON workspace.folders (space_id);
CREATE INDEX idx_folders_parent ON workspace.folders (parent_id);
CREATE INDEX idx_folders_path ON workspace.folders USING GIN (path gin_trgm_ops);

-- ============================================================
-- LISTS
-- ============================================================
CREATE TABLE workspace.lists (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    space_id        UUID NOT NULL REFERENCES workspace.spaces(id) ON DELETE CASCADE,
    folder_id       UUID REFERENCES workspace.folders(id) ON DELETE SET NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,

    -- View configuration
    default_view    VARCHAR(20) NOT NULL DEFAULT 'list',
    -- 'list', 'board', 'table', 'calendar', 'timeline', 'dashboard'

    view_config     JSONB NOT NULL DEFAULT '{
        "sort": [{"field": "created_at", "direction": "desc"}],
        "group_by": null,
        "filters": [],
        "visible_columns": ["title", "status", "assignee", "priority", "due_date"],
        "column_order": ["title", "status", "assignee", "priority", "due_date"]
    }'::jsonb,

    -- Task count cache (denormalized for sidebar performance)
    task_count      INT NOT NULL DEFAULT 0,
    open_task_count INT NOT NULL DEFAULT 0,

    sort_order      INT NOT NULL DEFAULT 0,
    is_archived     BOOLEAN NOT NULL DEFAULT FALSE,

    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lists_workspace ON workspace.lists (workspace_id);
CREATE INDEX idx_lists_space ON workspace.lists (space_id);
CREATE INDEX idx_lists_folder ON workspace.lists (folder_id) WHERE folder_id IS NOT NULL;

-- ============================================================
-- TASKS (the core entity)
-- ============================================================
CREATE TABLE workspace.tasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    list_id         UUID NOT NULL REFERENCES workspace.lists(id) ON DELETE CASCADE,

    -- Identity
    number          INT NOT NULL,                   -- Auto-incrementing per workspace (e.g., SPC-142)
    title           VARCHAR(500) NOT NULL,
    description     JSONB DEFAULT NULL,              -- TipTap/ProseMirror JSON document

    -- Status & Classification
    status          VARCHAR(50) NOT NULL DEFAULT 'backlog',
    priority        VARCHAR(20) DEFAULT NULL,        -- 'urgent', 'high', 'medium', 'low', null
    labels          TEXT[] DEFAULT '{}',

    -- Relationships
    parent_id       UUID REFERENCES workspace.tasks(id) ON DELETE SET NULL,  -- Subtasks
    assignee_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    creator_id      UUID NOT NULL REFERENCES auth.users(id),

    -- Dates
    start_date      DATE,
    due_date        DATE,
    completed_at    TIMESTAMPTZ,

    -- Hierarchy path (materialized for efficient tree queries)
    path            TEXT NOT NULL DEFAULT '',         -- e.g., '/task-uuid/task-uuid'
    depth           INT NOT NULL DEFAULT 0,
    sort_order      INT NOT NULL DEFAULT 0,

    -- Denormalized counts (updated by triggers/application)
    subtask_count       INT NOT NULL DEFAULT 0,
    completed_subtasks  INT NOT NULL DEFAULT 0,
    comment_count       INT NOT NULL DEFAULT 0,
    attachment_count    INT NOT NULL DEFAULT 0,

    -- Custom field values (JSONB for flexibility)
    custom_fields   JSONB NOT NULL DEFAULT '{}',
    -- Example: {"priority_score": 8, "story_points": 5, "sprint": "Sprint 23"}

    -- Metadata
    metadata        JSONB NOT NULL DEFAULT '{}',     -- Extensible metadata

    -- Recurring task config
    recurrence      JSONB DEFAULT NULL,
    -- Example: {"cron": "0 9 * * 1", "timezone": "UTC", "anti_stacking": true}

    -- Soft delete
    deleted_at      TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique task number per workspace
CREATE UNIQUE INDEX idx_tasks_workspace_number ON workspace.tasks (workspace_id, number);

-- Primary query indexes
CREATE INDEX idx_tasks_workspace ON workspace.tasks (workspace_id);
CREATE INDEX idx_tasks_list ON workspace.tasks (list_id);
CREATE INDEX idx_tasks_parent ON workspace.tasks (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_tasks_assignee ON workspace.tasks (assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX idx_tasks_status ON workspace.tasks (list_id, status);
CREATE INDEX idx_tasks_due_date ON workspace.tasks (workspace_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_completed ON workspace.tasks (workspace_id, completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_tasks_labels ON workspace.tasks USING GIN (labels);
CREATE INDEX idx_tasks_custom_fields ON workspace.tasks USING GIN (custom_fields);
CREATE INDEX idx_tasks_deleted ON workspace.tasks (workspace_id, deleted_at) WHERE deleted_at IS NULL;

-- Composite index for board view (most common query)
CREATE INDEX idx_tasks_board ON workspace.tasks (list_id, status, sort_order)
    INCLUDE (title, assignee_id, priority, labels, due_date, completed_subtasks, subtask_count);

-- ============================================================
-- TASK RELATIONSHIPS (dependencies, related, duplicates)
-- ============================================================
CREATE TABLE workspace.task_relationships (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    source_task_id  UUID NOT NULL REFERENCES workspace.tasks(id) ON DELETE CASCADE,
    target_task_id  UUID NOT NULL REFERENCES workspace.tasks(id) ON DELETE CASCADE,
    relationship_type VARCHAR(20) NOT NULL,
    -- 'blocked_by', 'blocks', 'related', 'duplicate', 'cloned_from'

    created_by      UUID NOT NULL REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (source_task_id, target_task_id, relationship_type),
    CHECK (source_task_id != target_task_id)
);

CREATE INDEX idx_task_rel_source ON workspace.task_relationships (source_task_id);
CREATE INDEX idx_task_relationships_target ON workspace.task_relationships (target_task_id);
CREATE INDEX idx_task_rel_type ON workspace.task_relationships (workspace_id, relationship_type);

-- ============================================================
-- CUSTOM FIELD DEFINITIONS (per space)
-- ============================================================
CREATE TABLE workspace.custom_field_definitions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    space_id        UUID NOT NULL REFERENCES workspace.spaces(id) ON DELETE CASCADE,

    name            VARCHAR(255) NOT NULL,
    field_type      VARCHAR(30) NOT NULL,
    -- 'text', 'long_text', 'number', 'select', 'multi_select',
    -- 'date', 'person', 'checkbox', 'url', 'email', 'phone',
    -- 'status', 'rating', 'formula', 'rollup', 'lookup', 'location'

    -- Type-specific configuration
    config          JSONB NOT NULL DEFAULT '{}',
    -- For select: {"options": [{"id": "opt_1", "label": "Option 1", "color": "#3b82f6"}]}
    -- For number: {"min": 0, "max": 100, "decimals": 0}
    -- For formula: {"expression": "{{field_a}} + {{field_b}}", "output_type": "number"}
    -- For rollup: {"source_field": "id", "function": "sum", "filter": null}

    -- Ordering
    sort_order      INT NOT NULL DEFAULT 0,
    is_required     BOOLEAN NOT NULL DEFAULT FALSE,
    is_visible      BOOLEAN NOT NULL DEFAULT TRUE,

    -- Default value
    default_value   JSONB,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cfdef_workspace ON workspace.custom_field_definitions (workspace_id);
CREATE INDEX idx_cfdef_space ON workspace.custom_field_definitions (space_id);

-- ============================================================
-- CUSTOM FIELD VALUES (per task per field)
-- ============================================================
-- Stored as JSONB in tasks.custom_fields for fast reads.
-- This normalized table exists for:
-- 1. Filter/sort queries on custom fields
-- 2. Rollup aggregation
-- 3. Formula recalculation triggers
CREATE TABLE workspace.custom_field_values (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    task_id         UUID NOT NULL REFERENCES workspace.tasks(id) ON DELETE CASCADE,
    field_def_id    UUID NOT NULL REFERENCES workspace.custom_field_definitions(id) ON DELETE CASCADE,

    -- Typed value columns (only one populated per row)
    value_text      TEXT,
    value_number    NUMERIC,
    value_date      DATE,
    value_boolean   BOOLEAN,
    value_person_id UUID REFERENCES auth.users(id),
    value_select    TEXT,
    value_multi_select TEXT[],
    value_json      JSONB,                          -- Catch-all for complex types

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (task_id, field_def_id)
);

CREATE INDEX idx_cfval_task ON workspace.custom_field_values (task_id);
CREATE INDEX idx_cfval_field ON workspace.custom_field_values (field_def_id);
CREATE INDEX idx_cfval_filter ON workspace.custom_field_values (field_def_id, value_text);
CREATE INDEX idx_cfval_number ON workspace.custom_field_values (field_def_id, value_number)
    WHERE value_number IS NOT NULL;

-- ============================================================
-- LABELS
-- ============================================================
CREATE TABLE workspace.labels (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    color           VARCHAR(7) NOT NULL DEFAULT '#6366f1',

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (workspace_id, name)
);

CREATE INDEX idx_labels_workspace ON workspace.labels (workspace_id);
```

### 3.5 Core Tables — Comments, Documents, Attachments

```sql
-- ============================================================
-- COMMENTS (on tasks)
-- ============================================================
CREATE TABLE workspace.comments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    task_id         UUID NOT NULL REFERENCES workspace.tasks(id) ON DELETE CASCADE,

    -- Threading
    parent_id       UUID REFERENCES workspace.comments(id) ON DELETE CASCADE,

    -- Content
    body            JSONB NOT NULL,                 -- TipTap/ProseMirror rich text
    body_text       TEXT NOT NULL,                  -- Plain text for search
    body_html       TEXT,                           -- Rendered HTML for email notifications

    -- Author
    author_id       UUID NOT NULL REFERENCES auth.users(id),

    -- Assignment (comment can be an action item)
    assigned_to     UUID REFERENCES auth.users(id),
    is_resolved     BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at     TIMESTAMPTZ,
    resolved_by     UUID REFERENCES auth.users(id),

    -- Reactions
    reactions       JSONB NOT NULL DEFAULT '{}',
    -- Example: {"👍": ["user-uuid-1", "user-uuid-2"], "🎉": ["user-uuid-3"]}

    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_task ON workspace.comments (task_id, created_at);
CREATE INDEX idx_comments_parent ON workspace.comments (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comments_author ON workspace.comments (author_id);
CREATE INDEX idx_comments_workspace ON workspace.comments (workspace_id);

-- ============================================================
-- DOCUMENTS (first-class entities)
-- ============================================================
CREATE TABLE workspace.documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,

    -- Nesting (a doc can live in a space, folder, list, or task)
    space_id        UUID REFERENCES workspace.spaces(id) ON DELETE SET NULL,
    folder_id       UUID REFERENCES workspace.folders(id) ON DELETE SET NULL,
    list_id         UUID REFERENCES workspace.lists(id) ON DELETE SET NULL,
    task_id         UUID REFERENCES workspace.tasks(id) ON DELETE SET NULL,

    -- Content
    title           VARCHAR(500) NOT NULL,
    icon            VARCHAR(50),                    -- Emoji icon
    cover_image     TEXT,

    -- Document body (TipTap/ProseMirror JSON)
    content         JSONB NOT NULL DEFAULT '{"type": "doc", "content": []}'::jsonb,

    -- Yjs CRDT state for collaborative editing
    yjs_state       BYTEA,                          -- Binary Yjs document state
    yjs_state_vector BYTEA,                         -- For partial sync

    -- Full-text search
    content_text    TEXT,                           -- Plain text extraction for FTS
    search_vector   TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(content_text, '')), 'B')
    ) STORED,

    -- Published state
    is_published    BOOLEAN NOT NULL DEFAULT FALSE,
    published_slug  VARCHAR(255) UNIQUE,
    published_at    TIMESTAMPTZ,
    publish_config  JSONB DEFAULT '{
        "password": null,
        "seo_title": null,
        "seo_description": null,
        "custom_domain": null
    }'::jsonb,

    -- Version tracking
    version         INT NOT NULL DEFAULT 1,

    -- Permissions
    permissions     JSONB DEFAULT NULL,
    -- null = inherit from workspace; explicit override:
    -- {"user_uuid": "edit", "team_uuid": "view"}

    -- Sorting
    sort_order      INT NOT NULL DEFAULT 0,
    is_archived     BOOLEAN NOT NULL DEFAULT FALSE,

    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_docs_workspace ON workspace.documents (workspace_id);
CREATE INDEX idx_docs_space ON workspace.documents (space_id) WHERE space_id IS NOT NULL;
CREATE INDEX idx_docs_folder ON workspace.documents (folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX idx_docs_task ON workspace.documents (task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_docs_published ON workspace.documents (published_slug) WHERE published_slug IS NOT NULL;
CREATE INDEX idx_docs_search ON workspace.documents USING GIN (search_vector);

-- ============================================================
-- DOCUMENT VERSIONS (version history)
-- ============================================================
CREATE TABLE workspace.document_versions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES workspace.documents(id) ON DELETE CASCADE,
    version_number  INT NOT NULL,

    title           VARCHAR(500) NOT NULL,
    content         JSONB NOT NULL,
    content_text    TEXT,

    author_id       UUID NOT NULL REFERENCES auth.users(id),

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (document_id, version_number)
);

CREATE INDEX idx_doc_versions_doc ON workspace.document_versions (document_id, version_number DESC);

-- ============================================================
-- ATTACHMENTS
-- ============================================================
CREATE TABLE workspace.attachments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,

    -- Polymorphic attachment (task, comment, or document)
    entity_type     VARCHAR(20) NOT NULL,           -- 'task', 'comment', 'document'
    entity_id       UUID NOT NULL,

    -- File metadata
    filename        VARCHAR(500) NOT NULL,
    mime_type       VARCHAR(255) NOT NULL,
    size_bytes      BIGINT NOT NULL,

    -- Storage
    storage_key     TEXT NOT NULL UNIQUE,            -- R2 object key (e.g., 'workspace/{id}/attachments/{uuid}/{filename}')
    storage_bucket  VARCHAR(100) NOT NULL DEFAULT 'sprintio-attachments',
    cdn_url         TEXT,                           -- Public CDN URL (if public)

    -- Metadata
    metadata        JSONB DEFAULT '{}',             -- Image dimensions, duration, etc.

    uploader_id     UUID NOT NULL REFERENCES auth.users(id),

    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_entity ON workspace.attachments (entity_type, entity_id);
CREATE INDEX idx_attachments_workspace ON workspace.attachments (workspace_id);
CREATE INDEX idx_attachments_storage ON workspace.attachments (storage_key);
```

### 3.6 Core Tables — Automations

```sql
-- ============================================================
-- AUTOMATIONS
-- ============================================================
CREATE TABLE automation.automations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,

    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,

    -- Flow definition (trigger → conditions → actions)
    flow            JSONB NOT NULL,
    -- Example:
    -- {
    --   "trigger": {"type": "task.status_changed", "config": {"from": "in_progress", "to": "done"}},
    --   "conditions": [{"type": "field_match", "field": "assignee", "operator": "is_set"}],
    --   "actions": [
    --     {"type": "notify", "config": {"channel": "in_app", "recipients": ["creator"], "message": "Task completed!"}},
    --     {"type": "update_field", "config": {"field": "status", "value": "in_review"}}
    --   ]
    -- }

    -- Template info (if installed from template)
    template_id     VARCHAR(100),
    template_name   VARCHAR(255),

    -- Stats
    total_runs      INT NOT NULL DEFAULT 0,
    last_run_at     TIMESTAMPTZ,
    last_error      TEXT,

    -- Ownership
    created_by      UUID NOT NULL REFERENCES auth.users(id),

    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automations_workspace ON automation.automations (workspace_id);
CREATE INDEX idx_automations_enabled ON automation.automations (workspace_id, is_enabled) WHERE is_enabled = TRUE;
CREATE INDEX idx_automations_trigger ON automation.automations USING GIN ((flow->>'trigger'));

-- ============================================================
-- AUTOMATION RUNS
-- ============================================================
CREATE TABLE automation.runs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    automation_id   UUID NOT NULL REFERENCES automation.automations(id) ON DELETE CASCADE,

    status          VARCHAR(20) NOT NULL DEFAULT 'running',
    -- 'running', 'completed', 'failed', 'cancelled'

    -- Execution context
    trigger_event   JSONB NOT NULL,                 -- The event that triggered this run
    step_results    JSONB NOT NULL DEFAULT '[]',    -- Input/output per step
    error           TEXT,

    -- Timing
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    duration_ms     INT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- This will be converted to a TimescaleDB hypertable in Phase 2
CREATE INDEX idx_runs_workspace ON automation.runs (workspace_id, started_at DESC);
CREATE INDEX idx_runs_automation ON automation.runs (automation_id, started_at DESC);
CREATE INDEX idx_runs_status ON automation.runs (status) WHERE status = 'running';
```

### 3.7 Core Tables — Webhooks, Integrations

```sql
-- ============================================================
-- WEBHOOKS (outbound)
-- ============================================================
CREATE TABLE integration.webhooks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,

    name            VARCHAR(255) NOT NULL,
    url             TEXT NOT NULL,
    secret          TEXT NOT NULL,                  -- HMAC signing secret (encrypted at rest)

    -- Event filtering
    events          TEXT[] NOT NULL DEFAULT '*',
    -- e.g., {'task.created', 'task.status_changed', 'comment.created'}

    -- Delivery config
    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    retry_policy    JSONB NOT NULL DEFAULT '{"max_retries": 3, "backoff_ms": [1000, 5000, 30000]}',

    -- Stats
    total_deliveries    INT NOT NULL DEFAULT 0,
    failed_deliveries   INT NOT NULL DEFAULT 0,
    last_delivery_at    TIMESTAMPTZ,
    last_delivery_status VARCHAR(20),

    created_by      UUID NOT NULL REFERENCES auth.users(id),

    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_workspace ON integration.webhooks (workspace_id);
CREATE INDEX idx_webhooks_events ON integration.webhooks USING GIN (events);

-- ============================================================
-- WEBHOOK DELIVERIES
-- ============================================================
CREATE TABLE integration.webhook_deliveries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id      UUID NOT NULL REFERENCES integration.webhooks(id) ON DELETE CASCADE,
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,

    event_type      VARCHAR(100) NOT NULL,
    payload         JSONB NOT NULL,

    -- Delivery result
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending', 'success', 'failed', 'retrying'

    attempt         INT NOT NULL DEFAULT 1,
    max_attempts    INT NOT NULL DEFAULT 3,

    request_headers JSONB,
    response_status INT,
    response_body   TEXT,
    error           TEXT,

    -- Timing
    delivered_at    TIMESTAMPTZ,
    next_retry_at   TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- This will be converted to a TimescaleDB hypertable in Phase 2
CREATE INDEX idx_deliveries_webhook ON integration.webhook_deliveries (webhook_id, created_at DESC);
CREATE INDEX idx_deliveries_status ON integration.webhook_deliveries (status, next_retry_at)
    WHERE status IN ('pending', 'retrying');

-- ============================================================
-- INTEGRATIONS (connected external services)
-- ============================================================
CREATE TABLE integration.connected_integrations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,

    provider        VARCHAR(50) NOT NULL,           -- 'github', 'gitlab', 'slack', 'notion'
    provider_name   VARCHAR(255) NOT NULL,          -- 'GitHub' (display name)

    -- Auth
    access_token    TEXT,                           -- Encrypted OAuth token
    refresh_token   TEXT,                           -- Encrypted refresh token
    token_expires_at TIMESTAMPTZ,

    -- Provider state
    provider_data   JSONB NOT NULL DEFAULT '{}',    -- Account info, org, etc.

    -- Sync config
    sync_config     JSONB DEFAULT '{}',
    last_synced_at  TIMESTAMPTZ,
    sync_status     VARCHAR(20) DEFAULT 'idle',

    connected_by    UUID NOT NULL REFERENCES auth.users(id),

    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_integrations_workspace ON integration.connected_integrations (workspace_id);
CREATE INDEX idx_integrations_provider ON integration.connected_integrations (workspace_id, provider);
```

### 3.8 Core Tables — Notifications & Recurring Tasks

```sql
-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE workspace.notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    type            VARCHAR(50) NOT NULL,
    -- 'task.assigned', 'task.commented', 'task.mentioned',
    -- 'document.commented', 'automation.failed', etc.

    title           VARCHAR(500) NOT NULL,
    body            TEXT,

    -- Link to source entity
    entity_type     VARCHAR(20),                    -- 'task', 'comment', 'document', 'automation'
    entity_id       UUID,

    -- Read state
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,

    -- Action
    action_url      TEXT,                           -- Deep link to the relevant entity
    action_label    VARCHAR(100),

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON workspace.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON workspace.notifications (user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_workspace ON workspace.notifications (workspace_id);

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================
CREATE TABLE workspace.notification_preferences (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,

    event_type      VARCHAR(50) NOT NULL,           -- e.g., 'task.assigned'
    in_app          BOOLEAN NOT NULL DEFAULT TRUE,
    email           BOOLEAN NOT NULL DEFAULT TRUE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, workspace_id, event_type)
);

CREATE INDEX idx_notif_prefs_user ON workspace.notification_preferences (user_id, workspace_id);

-- ============================================================
-- RECURRING TASKS
-- ============================================================
CREATE TABLE workspace.recurring_tasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    source_task_id  UUID NOT NULL REFERENCES workspace.tasks(id) ON DELETE CASCADE,
    list_id         UUID NOT NULL REFERENCES workspace.lists(id) ON DELETE CASCADE,

    -- Schedule
    cron_expression VARCHAR(100) NOT NULL,          -- Standard cron: '0 9 * * 1'
    timezone        VARCHAR(50) NOT NULL DEFAULT 'UTC',

    -- Behavior
    carry_over_subtasks BOOLEAN NOT NULL DEFAULT FALSE,
    anti_stacking   BOOLEAN NOT NULL DEFAULT TRUE,

    -- Next execution
    next_run_at     TIMESTAMPTZ NOT NULL,
    last_run_at     TIMESTAMPTZ,

    -- State
    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    total_runs      INT NOT NULL DEFAULT 0,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recurring_workspace ON workspace.recurring_tasks (workspace_id);
CREATE INDEX idx_recurring_next_run ON workspace.recurring_tasks (next_run_at) WHERE is_enabled = TRUE;
```

### 3.9 Core Tables — AI & Search (Phase 2)

```sql
-- ============================================================
-- AI EMBEDDINGS (vector search)
-- ============================================================
CREATE TABLE analytics.ai_embeddings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,

    -- Source entity
    entity_type     VARCHAR(20) NOT NULL,           -- 'task', 'document', 'comment'
    entity_id       UUID NOT NULL,

    -- Embedding
    embedding       vector(1536),                   -- OpenAI text-embedding-3-small dimensions
    model           VARCHAR(50) NOT NULL DEFAULT 'text-embedding-3-small',

    -- Chunk info (large docs are split into chunks)
    chunk_index     INT NOT NULL DEFAULT 0,
    chunk_text      TEXT NOT NULL,                  -- The text this embedding represents

    -- Metadata
    metadata        JSONB DEFAULT '{}',

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX idx_embeddings_vector ON analytics.ai_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 200);

CREATE INDEX idx_embeddings_entity ON analytics.ai_embeddings (entity_type, entity_id);
CREATE INDEX idx_embeddings_workspace ON analytics.ai_embeddings (workspace_id);

-- ============================================================
-- AI USAGE TRACKING
-- ============================================================
CREATE TABLE analytics.ai_usage (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    operation       VARCHAR(50) NOT NULL,
    -- 'triage', 'summary', 'write_assistant', 'nl_task_create', 'search', etc.

    model           VARCHAR(100) NOT NULL,
    input_tokens    INT NOT NULL DEFAULT 0,
    output_tokens   INT NOT NULL DEFAULT 0,
    credits_used    INT NOT NULL DEFAULT 0,

    -- Cost tracking
    cost_usd        NUMERIC(10, 6) DEFAULT 0,

    -- Context
    entity_type     VARCHAR(20),
    entity_id       UUID,

    latency_ms      INT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Will be converted to TimescaleDB hypertable in Phase 2
CREATE INDEX idx_ai_usage_workspace ON analytics.ai_usage (workspace_id, created_at DESC);
CREATE INDEX idx_ai_usage_user ON analytics.ai_usage (user_id, created_at DESC);
```

### 3.10 Core Tables — Saved Views

```sql
-- ============================================================
-- SAVED VIEWS
-- ============================================================
CREATE TABLE workspace.saved_views (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    list_id         UUID NOT NULL REFERENCES workspace.lists(id) ON DELETE CASCADE,

    name            VARCHAR(255) NOT NULL,
    description     TEXT,

    -- View type
    view_type       VARCHAR(20) NOT NULL DEFAULT 'list',
    -- 'list', 'board', 'table', 'calendar', 'timeline', 'dashboard'

    -- View configuration (filters, sorts, groups, columns)
    config          JSONB NOT NULL DEFAULT '{
        "sort": [],
        "group_by": null,
        "filters": [],
        "visible_columns": [],
        "column_order": []
    }'::jsonb,

    -- Sharing
    visibility      VARCHAR(20) NOT NULL DEFAULT 'personal',
    -- 'personal', 'shared', 'link'
    share_token     VARCHAR(100),
    share_password  TEXT,

    -- Ownership
    created_by      UUID NOT NULL REFERENCES auth.users(id),

    sort_order      INT NOT NULL DEFAULT 0,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_views_workspace ON workspace.saved_views (workspace_id);
CREATE INDEX idx_saved_views_list ON workspace.saved_views (list_id);
CREATE INDEX idx_saved_views_share ON workspace.saved_views (share_token) WHERE share_token IS NOT NULL;
```

---

## 4. Entity Relationship Diagram

### 4.1 High-Level ERD

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SPRINTIO SCHEMA MAP                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   auth   │    │  workspace   │    │  automation  │    │ integration  │     │
│  │──────────│    │──────────────│    │──────────────│    │──────────────│     │
│  │ users    │◄───│ memberships  │    │ automations  │    │ webhooks     │     │
│  │ sessions │    │ workspaces   │    │ runs         │    │ deliveries   │     │
│  │ api_keys │    │ spaces       │    └──────────────┘    │ integrations │     │
│  └──────────┘    │ folders      │                        └──────────────┘     │
│                  │ lists        │                                              │
│                  │ tasks ◄──────────────────────────────────────┐             │
│                  │ task_relationships                           │             │
│                  │ comments                                     │             │
│                  │ documents                                    │             │
│                  │ attachments                                  │             │
│                  │ custom_field_definitions                     │             │
│                  │ custom_field_values                          │             │
│                  │ labels                                       │             │
│                  │ teams, team_members                          │             │
│                  │ saved_views                                  │             │
│                  │ notifications                                │             │
│                  │ recurring_tasks                              │             │
│                  └──────────────────────────────────────────────┘             │
│                                                                                 │
│  ┌──────────┐                                                                  │
│  │analytics │◄───── (reads from workspace tables for aggregation)              │
│  │──────────│                                                                  │
│  │ ai_embeddings                                                              │
│  │ ai_usage                                                                   │
│  └──────────┘                                                                  │
│                                                                                 │
│  ┌──────────────┐  (Phase 2 — TimescaleDB hypertables)                         │
│  │  timeseries  │                                                              │
│  │──────────────│                                                              │
│  │ activity_log │  (partitioned by time)                                       │
│  │ metrics      │  (partitioned by time)                                       │
│  └──────────────┘                                                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Core Entity Relationships

```
                              ┌──────────────┐
                              │    users     │
                              │──────────────│
                              │ id (UUID PK) │
                              │ email        │
                              │ name         │
                              └──────┬───────┘
                                     │
                         ┌───────────┼───────────┐
                         │           │           │
                         ▼           ▼           ▼
                 ┌──────────┐ ┌──────────┐ ┌────────────┐
                 │sessions  │ │api_keys  │ │memberships │
                 │──────────│ │──────────│ │────────────│
                 │user_id   │ │user_id   │ │user_id     │
                 │token_hash│ │workspace │ │workspace_id│
                 └──────────┘ └──────────┘ │role        │
                                           └─────┬──────┘
                                                 │
                   ┌─────────────────────────────┤
                   │                             │
                   ▼                             ▼
          ┌─────────────────┐          ┌─────────────────┐
          │  workspaces     │          │    teams        │
          │─────────────────│          │─────────────────│
          │ id (UUID PK)    │◄─────────│ workspace_id    │
          │ name            │          │ name            │
          │ slug            │          │ parent_team_id  │
          │ plan            │          └────────┬────────┘
          └────────┬────────┘                   │
                   │                            ▼
                   │                    ┌──────────────┐
                   │                    │ team_members  │
                   │                    │──────────────│
                   │                    │ team_id      │
                   │                    │ user_id      │
                   │                    └──────────────┘
                   │
        ┌──────────┼──────────┬──────────────┐
        │          │          │              │
        ▼          ▼          ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│  spaces  │ │  labels  │ │documents │ │notifications │
│──────────│ │──────────│ │──────────│ │──────────────│
│workspace │ │workspace │ │workspace │ │workspace     │
│ name     │ │ name     │ │ title    │ │ user_id      │
│ statuses │ │ color    │ │ content  │ │ type         │
└────┬─────┘ └──────────┘ │ yjs_state│ │ is_read      │
     │                     └──────────┘ └──────────────┘
     │
     ├──▶┌──────────┐
     │   │ folders  │
     │   │──────────│
     │   │ parent_id│──▶ (self-referencing tree)
     │   │ path     │    Materialized path: /root/child/leaf
     │   └────┬─────┘
     │        │
     │        ▼
     │   ┌──────────┐
     │   │  lists   │
     │   │──────────│
     │   │ name     │
     │   │statuses  │  (per-list status config)
     │   └────┬─────┘
     │        │
     │        ▼
     │   ┌──────────────────────────────────────────────────┐
     │   │                     tasks                        │
     │   │──────────────────────────────────────────────────│
     │   │ id (UUID PK)           │ completed_at            │
     │   │ workspace_id           │ parent_id ──▶ (self)    │
     │   │ list_id                │ assignee_id ──▶ users   │
     │   │ number (per-workspace) │ creator_id ──▶ users     │
     │   │ title                  │ custom_fields (JSONB)    │
     │   │ description (JSONB)    │ labels (TEXT[])          │
     │   │ status                 │ recurrence (JSONB)       │
     │   │ priority               │ deleted_at (soft delete) │
     │   │ path (materialized)    │                          │
     │   └───────┬────────────────┼──────────┬──────────────┘
     │           │                │          │
     │           ▼                ▼          ▼
     │  ┌──────────────┐  ┌──────────┐ ┌──────────────┐
     │  │task_relations│  │comments  │ │attachments   │
     │  │──────────────│  │──────────│ │──────────────│
     │  │source_task_id│  │task_id   │ │entity_type   │
     │  │target_task_id│  │parent_id │ │entity_id     │
     │  │rel_type      │  │body(JSON)│ │storage_key   │
     │  └──────────────┘  │author_id │ │mime_type     │
     │                    └──────────┘ └──────────────┘
     │
     ▼
┌────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  automations   │────▶│  runs        │     │custom_fields_def│
│────────────────│     │──────────────│     │─────────────────│
│ workspace_id   │     │automation_id │     │workspace_id     │
│ flow (JSONB)   │     │status        │     │space_id         │
│ is_enabled     │     │step_results  │     │name, field_type │
└────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
                                                      ▼
                                             ┌─────────────────┐
                                             │custom_field_vals │
                                             │─────────────────│
                                             │task_id          │
                                             │field_def_id     │
                                             │value_* (typed)  │
                                             └─────────────────┘
```

### 4.3 Task Hierarchy Detail

```
Hierarchy Path:  Workspace > Space > Folder > List > Task

workspace.tasks.materialized_path example:
  /spc-eng/folder-backend/list-api-tasks/task-abc123

Used for:
  - Efficient "all tasks in space" queries
  - Moving tasks between lists (update path, preserve references)
  - Tree traversal for nested views
```

---

## 5. Migration Strategy

### 5.1 Drizzle ORM Migration Setup

Sprintio uses **Drizzle Kit** for schema management and **plain SQL migrations** for full control.

```
project/
├── drizzle/
│   ├── config.ts                  -- Drizzle Kit configuration
│   ├── schema/
│   │   ├── auth.ts                -- Auth schema tables
│   │   ├── workspace.ts           -- Workspace schema tables
│   │   ├── automation.ts          -- Automation schema tables
│   │   └── integration.ts         -- Integration schema tables
│   └── migrations/
│       ├── 0000_initial/
│       │   ├── 0000_create_auth.sql
│       │   ├── 0001_create_workspaces.sql
│       │   └── _journal.json
│       ├── 0001_add_custom_fields/
│       │   └── ...
│       └── _journal.json          -- Migration chain tracking
└── src/
    └── db/
        ├── client.ts              -- Database connection
        ├── index.ts               -- Schema exports
        └── rls.ts                 -- RLS middleware
```

**drizzle.config.ts:**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './drizzle/schema/*',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    prefix: 'timestamp',
  },
});
```

### 5.2 Migration Commands

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Push schema directly (dev only — skips migration files)
npx drizzle-kit push

# Run pending migrations
npx drizzle-kit migrate

# Pull existing DB schema into Drizzle schema files
npx drizzle-kit pull

# Open Drizzle Studio (visual DB browser)
npx drizzle-kit studio
```

### 5.3 Zero-Downtime Migration Rules

Every migration must follow these rules to achieve zero-downtime deployment:

#### Rule 1: Expand-Contract Pattern

```sql
-- ✅ CORRECT: Expand first (add column), then migrate data, then contract (remove old)
-- Step 1: Expand (deploy #1)
ALTER TABLE workspace.tasks ADD COLUMN priority_v2 VARCHAR(20);
UPDATE workspace.tasks SET priority_v2 = priority WHERE priority_v2 IS NULL;
-- Step 2: Switch application to use priority_v2 (deploy #2)
-- Step 3: Contract (deploy #3) — only after 100% traffic on new column
ALTER TABLE workspace.tasks DROP COLUMN priority;
ALTER TABLE workspace.tasks RENAME COLUMN priority_v2 TO priority;

-- ❌ WRONG: Rename in place (breaks reads during deployment)
ALTER TABLE workspace.tasks RENAME COLUMN priority TO priority_v2;  -- Downtime!
```

#### Rule 2: Never Lock Large Tables

```sql
-- ✅ CORRECT: Add index without blocking writes
CREATE INDEX CONCURRENTLY idx_new_index ON workspace.tasks (workspace_id, created_at);
-- NOTE: CONCURRENTLY cannot run inside a transaction

-- ❌ WRONG: Locks table for duration of index build
CREATE INDEX idx_new_index ON workspace.tasks (workspace_id, created_at);
```

#### Rule 3: Always Provide Rollback

```sql
-- forward.sql
CREATE TABLE workspace.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- rollback.sql
DROP TABLE IF EXISTS workspace.goals;
```

#### Rule 4: Column Additions with Defaults

```sql
-- PostgreSQL 11+ handles DEFAULT efficiently (no table rewrite)
-- ✅ Safe even on large tables
ALTER TABLE workspace.tasks
    ADD COLUMN estimated_hours NUMERIC(8, 2) DEFAULT 0;

-- For non-trivial defaults, use a two-step approach:
-- Step 1: Add column without default
ALTER TABLE workspace.tasks ADD COLUMN estimated_hours NUMERIC(8, 2);
-- Step 2: Set default in application code or batch update
ALTER TABLE workspace.tasks ALTER COLUMN estimated_hours SET DEFAULT 0;
```

### 5.4 Migration Safety Checklist

Before merging any migration PR:

- [ ] **Forward SQL** is idempotent where possible (uses `IF NOT EXISTS`, `IF EXISTS`)
- [ ] **Rollback SQL** exists and has been tested locally
- [ ] `CREATE INDEX CONCURRENTLY` is used for all new indexes on tables with > 10K rows
- [ ] No `ALTER TABLE` locks exceed 1 second on tables with > 100K rows
- [ ] New columns have sensible defaults (no NULL surprises)
- [ ] Foreign keys reference existing tables with correct ON DELETE behavior
- [ ] Migration runs in < 60 seconds on a production-sized dataset
- [ ] Application code is compatible with both old and new schema (expand phase)

---

## 6. Indexing Strategy

### 6.1 Index Categories

| Category               | Purpose                       | Example                                    |
| ---------------------- | ----------------------------- | ------------------------------------------ |
| **Primary Key**        | Clustered index, row identity | `id UUID PRIMARY KEY`                      |
| **Unique**             | Enforce uniqueness            | `email`, `workspace.slug`                  |
| **B-tree**             | Equality and range queries    | `status`, `due_date`, `created_at`         |
| **GIN**                | Array and JSONB containment   | `labels`, `custom_fields`, `search_vector` |
| **GIN (trigram)**      | Fuzzy text search             | `folders.path`, `documents.title`          |
| **Partial**            | Conditional indexes (sparse)  | `WHERE deleted_at IS NULL`                 |
| **Covering (INCLUDE)** | Index-only scans              | Board view composite index                 |
| **HNSW**               | Vector similarity (Phase 2)   | `ai_embeddings.embedding`                  |

### 6.2 Key Indexes by Query Pattern

```sql
-- ============================================================
-- BOARD VIEW: Get all tasks in a list, grouped by status
-- Query: SELECT * FROM tasks WHERE list_id = ? ORDER BY sort_order
-- ============================================================
CREATE INDEX idx_tasks_board ON workspace.tasks (list_id, status, sort_order)
    INCLUDE (title, assignee_id, priority, labels, due_date, completed_subtasks, subtask_count);
-- The INCLUDE clause enables index-only scans — no heap fetch needed

-- ============================================================
-- MY WORK: Tasks assigned to a user across all workspaces
-- Query: SELECT * FROM tasks WHERE assignee_id = ? AND completed_at IS NULL
-- ============================================================
CREATE INDEX idx_tasks_my_work ON workspace.tasks (assignee_id, workspace_id, list_id)
    WHERE assignee_id IS NOT NULL AND completed_at IS NULL AND deleted_at IS NULL;

-- ============================================================
-- DUE DATE FILTER: Tasks due this week
-- Query: SELECT * FROM tasks WHERE workspace_id = ? AND due_date BETWEEN ? AND ?
-- ============================================================
CREATE INDEX idx_tasks_due_range ON workspace.tasks (workspace_id, due_date)
    WHERE due_date IS NOT NULL AND deleted_at IS NULL;

-- ============================================================
-- ACTIVITY FEED: Recent activity for a task
-- Query: SELECT * FROM activity WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC
-- ============================================================
-- (TimescaleDB hypertable — see §8)
CREATE INDEX idx_activity_entity ON timeseries.activity_log (entity_type, entity_id, created_at DESC);

-- ============================================================
-- NOTIFICATION UNREAD COUNT: Fast count of unread notifications
-- Query: SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = FALSE
-- ============================================================
CREATE INDEX idx_notifications_unread ON workspace.notifications (user_id, is_read)
    WHERE is_read = FALSE;
-- Partial index — only indexes unread rows (fast count)

-- ============================================================
-- AUTOMATION TRIGGER LOOKUP: Find enabled automations matching an event
-- Query: SELECT * FROM automations WHERE workspace_id = ? AND is_enabled = TRUE
--         AND flow @> '{"trigger": {"type": "task.created"}}'::jsonb
-- ============================================================
CREATE INDEX idx_automation_triggers ON automation.automations (workspace_id)
    WHERE is_enabled = TRUE;
-- JSONB containment index for trigger matching:
CREATE INDEX idx_automation_flow ON automation.automations USING GIN (flow);

-- ============================================================
-- WEBHOOK EVENT FILTERING: Find webhooks subscribed to an event type
-- ============================================================
CREATE INDEX idx_webhook_events ON integration.webhooks USING GIN (events);

-- ============================================================
-- DOCUMENT FULL-TEXT SEARCH
-- ============================================================
CREATE INDEX idx_docs_fts ON workspace.documents USING GIN (search_vector);
-- Usage:
-- SELECT * FROM documents
-- WHERE search_vector @@ plainto_tsquery('english', 'project requirements')
-- AND workspace_id = ?
-- ORDER BY ts_rank(search_vector, plainto_tsquery('english', 'project requirements')) DESC;

-- ============================================================
-- LABEL FILTERING: Tasks with a specific label
-- ============================================================
CREATE INDEX idx_tasks_labels ON workspace.tasks USING GIN (labels);
-- Usage:
-- SELECT * FROM tasks WHERE labels @> ARRAY['bug'] AND workspace_id = ?;

-- ============================================================
-- CUSTOM FIELD FILTERING: Tasks with specific custom field values
-- ============================================================
CREATE INDEX idx_cfval_field_text ON workspace.custom_field_values (field_def_id, value_text)
    WHERE value_text IS NOT NULL;
CREATE INDEX idx_cfval_field_number ON workspace.custom_field_values (field_def_id, value_number)
    WHERE value_number IS NOT NULL;
```

### 6.3 Anti-Patterns to Avoid

| Anti-Pattern                              | Why It's Bad                                                 | Better Approach                                            |
| ----------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| Indexing every JSONB key                  | Massive index bloat; slow writes                             | Use generated columns or typed `custom_field_values` table |
| Over-indexing low-cardinality columns     | Index scans slower than sequential for < 100 distinct values | Sequential scan or partial index                           |
| Ignoring `WHERE deleted_at IS NULL`       | Indexes include deleted rows — wasted space                  | Partial index on active rows only                          |
| Composite indexes with wrong column order | Leftmost prefix rule means wrong order = unused index        | Put equality columns first, range columns last             |
| Not using `CONCURRENTLY`                  | Locks table during index build                               | Always `CREATE INDEX CONCURRENTLY` on production           |

### 6.4 Index Maintenance

```sql
-- Find unused indexes (run monthly)
SELECT
    schemaname, tablename, indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS times_used
FROM pg_stat_user_indexes
WHERE idx_scan < 100
    AND schemaname IN ('workspace', 'auth', 'automation', 'integration')
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find bloated indexes
SELECT
    indexname, tablename,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS size,
    (SELECT pg_size_pretty(pg_relation_size(tablename::regclass))) AS table_size
FROM pg_indexes
WHERE schemaname = 'workspace'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- REINDEX CONCURRENTLY (non-blocking, PostgreSQL 12+)
REINDEX INDEX CONCURRENTLY idx_tasks_board;
```

---

## 7. Query Patterns

### 7.1 Task List Query (List View)

```sql
-- Get tasks in a list with pagination, sorting, and filtering
-- Drizzle ORM
const tasks = await db
  .select({
    id: tasks.id,
    number: tasks.number,
    title: tasks.title,
    status: tasks.status,
    priority: tasks.priority,
    assigneeId: tasks.assigneeId,
    dueDate: tasks.dueDate,
    labels: tasks.labels,
    subtaskCount: tasks.subtaskCount,
    completedSubtasks: tasks.completedSubtasks,
    commentCount: tasks.commentCount,
    createdAt: tasks.createdAt,
  })
  .from(tasks)
  .where(
    and(
      eq(tasks.listId, listId),
      isNull(tasks.deletedAt),
      isNull(tasks.parentId),  // Top-level tasks only
    )
  )
  .orderBy(asc(tasks.sortOrder))
  .limit(50)
  .offset(0);
```

### 7.2 Board View Query (Kanban)

```sql
-- Get all tasks grouped by status for a board
-- Uses the covering index: idx_tasks_board
SELECT
    status,
    json_agg(
        json_build_object(
            'id', id,
            'number', number,
            'title', title,
            'assignee_id', assignee_id,
            'priority', priority,
            'labels', labels,
            'due_date', due_date,
            'completed_subtasks', completed_subtasks,
            'subtask_count', subtask_count
        ) ORDER BY sort_order
    ) AS tasks,
    COUNT(*) AS task_count
FROM workspace.tasks
WHERE list_id = $1
    AND deleted_at IS NULL
GROUP BY status
ORDER BY
    CASE status
        WHEN 'backlog' THEN 0
        WHEN 'todo' THEN 1
        WHEN 'in_progress' THEN 2
        WHEN 'in_review' THEN 3
        WHEN 'done' THEN 4
        WHEN 'cancelled' THEN 5
    END;
```

### 7.3 Full-Text Search

```sql
-- Search across tasks and documents in a workspace
WITH task_results AS (
    SELECT
        'task' AS entity_type,
        id AS entity_id,
        title AS title,
        LEFT(body_text, 200) AS snippet,
        ts_rank(
            to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body_text, '')),
            plainto_tsquery('english', $2)
        ) AS rank
    FROM workspace.tasks
    WHERE workspace_id = $1
        AND deleted_at IS NULL
        AND to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body_text, ''))
            @@ plainto_tsquery('english', $2)
),
doc_results AS (
    SELECT
        'document' AS entity_type,
        id AS entity_id,
        title AS title,
        LEFT(content_text, 200) AS snippet,
        ts_rank(search_vector, plainto_tsquery('english', $2)) AS rank
    FROM workspace.documents
    WHERE workspace_id = $1
        AND deleted_at IS NULL
        AND search_vector @@ plainto_tsquery('english', $2)
)
SELECT * FROM task_results
UNION ALL
SELECT * FROM doc_results
ORDER BY rank DESC
LIMIT 20;
```

### 7.4 Activity Feed (Paginated)

```sql
-- Cursor-based activity feed for a task
SELECT
    al.id,
    al.action,
    al.entity_type,
    al.entity_id,
    al.changes,
    al.actor_id,
    u.name AS actor_name,
    u.avatar_url AS actor_avatar,
    al.created_at
FROM timeseries.activity_log al
JOIN auth.users u ON u.id = al.actor_id
WHERE al.workspace_id = $1
    AND al.entity_type = $2
    AND al.entity_id = $3
    AND al.created_at < $4  -- Cursor: timestamp of last seen item
ORDER BY al.created_at DESC
LIMIT 25;
```

### 7.5 Workspace Sidebar (Denormalized Counts)

```sql
-- Get sidebar data: spaces, folders, lists with task counts
SELECT
    s.id AS space_id,
    s.name AS space_name,
    s.icon AS space_icon,
    s.color AS space_color,
    json_agg(
        json_build_object(
            'id', l.id,
            'name', l.name,
            'task_count', l.task_count,
            'open_task_count', l.open_task_count,
            'folder_id', l.folder_id
        ) ORDER BY l.sort_order
    ) AS lists
FROM workspace.spaces s
LEFT JOIN workspace.lists l ON l.space_id = s.id AND l.deleted_at IS NULL
WHERE s.workspace_id = $1
    AND s.is_archived = FALSE
    AND s.deleted_at IS NULL
GROUP BY s.id, s.name, s.icon, s.color, s.sort_order
ORDER BY s.sort_order;
```

### 7.6 Notification Count (Fast)

```sql
-- Unread notification count (uses partial index)
SELECT COUNT(*)
FROM workspace.notifications
WHERE user_id = $1
    AND is_read = FALSE;
-- Uses: idx_notifications_unread partial index
```

### 7.7 Task Hierarchy (Recursive CTE)

```sql
-- Get all subtasks for a task (recursive)
WITH RECURSIVE subtasks AS (
    -- Base case: direct children
    SELECT id, title, status, parent_id, 1 AS depth
    FROM workspace.tasks
    WHERE parent_id = $1
        AND deleted_at IS NULL

    UNION ALL

    -- Recursive case: children of children
    SELECT t.id, t.title, t.status, t.parent_id, s.depth + 1
    FROM workspace.tasks t
    INNER JOIN subtasks s ON t.parent_id = s.id
    WHERE t.deleted_at IS NULL
        AND s.depth < 10  -- Safety limit
)
SELECT * FROM subtasks ORDER BY depth, title;
```

### 7.8 Automations Triggered by Event

```sql
-- Find all automations that should fire for a given event
SELECT
    a.id,
    a.flow
FROM automation.automations a
WHERE a.workspace_id = $1
    AND a.is_enabled = TRUE
    AND a.deleted_at IS NULL
    AND a.flow @> jsonb_build_object(
        'trigger', jsonb_build_object('type', $2)
    )::jsonb;
-- Example: $2 = 'task.status_changed'
```

---

## 8. Partitioning (TimescaleDB)

### 8.1 Hypertable Definitions (Phase 2)

TimescaleDB hypertables automatically partition data by time, enabling efficient time-range queries and automated data lifecycle management.

```sql
-- ============================================================
-- ACTIVITY LOG (append-only, immutable)
-- ============================================================
CREATE TABLE timeseries.activity_log (
    id              UUID DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL,
    actor_id        UUID NOT NULL,

    action          VARCHAR(50) NOT NULL,
    -- 'created', 'updated', 'deleted', 'moved', 'status_changed',
    -- 'assigned', 'commented', 'attachment_added', 'field_changed'

    entity_type     VARCHAR(20) NOT NULL,
    -- 'task', 'document', 'comment', 'space', 'folder', 'list'
    entity_id       UUID NOT NULL,

    -- What changed
    changes         JSONB DEFAULT '{}',
    -- Example: {"status": {"from": "todo", "to": "in_progress"}}
    -- Example: {"assignee": {"from": null, "to": "user-uuid"}}

    -- Snapshot of entity at time of change (optional, for audit)
    entity_snapshot JSONB,

    -- Metadata
    metadata        JSONB DEFAULT '{}',

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert to hypertable (TimescaleDB)
SELECT create_hypertable('timeseries.activity_log', 'created_at',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

-- ============================================================
-- WEBHOOK DELIVERIES (append-only)
-- ============================================================
-- Already defined in §3.7; convert to hypertable:
SELECT create_hypertable('integration.webhook_deliveries', 'created_at',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- ============================================================
-- AUTOMATION RUNS (append-only)
-- ============================================================
SELECT create_hypertable('automation.runs', 'started_at',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- ============================================================
-- AI USAGE TRACKING (append-only)
-- ============================================================
SELECT create_hypertable('analytics.ai_usage', 'created_at',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);
```

### 8.2 Continuous Aggregates (Materialized Views)

```sql
-- ============================================================
-- Daily activity summary per workspace
-- ============================================================
CREATE MATERIALIZED VIEW timeseries.daily_activity_summary
WITH (timescaledb.continuous) AS
SELECT
    workspace_id,
    time_bucket('1 day', created_at) AS day,
    action,
    entity_type,
    COUNT(*) AS event_count,
    COUNT(DISTINCT actor_id) AS unique_actors
FROM timeseries.activity_log
GROUP BY workspace_id, day, action, entity_type
WITH NO DATA;

-- Refresh policy: update every hour
SELECT add_continuous_aggregate_policy('timeseries.daily_activity_summary',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);

-- ============================================================
-- Weekly workspace metrics
-- ============================================================
CREATE MATERIALIZED VIEW timeseries.weekly_workspace_metrics
WITH (timescaledb.continuous) AS
SELECT
    workspace_id,
    time_bucket('1 week', created_at) AS week,
    COUNT(*) FILTER (WHERE action = 'created' AND entity_type = 'task') AS tasks_created,
    COUNT(*) FILTER (WHERE action = 'status_changed' AND changes->>'to' = 'done') AS tasks_completed,
    COUNT(DISTINCT actor_id) AS active_users,
    COUNT(*) FILTER (WHERE entity_type = 'comment') AS comments_added
FROM timeseries.activity_log
GROUP BY workspace_id, week
WITH NO DATA;

SELECT add_continuous_aggregate_policy('timeseries.weekly_workspace_metrics',
    start_offset => INTERVAL '4 weeks',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);
```

### 8.3 Compression Policies

```sql
-- Compress activity_log chunks older than 30 days
ALTER TABLE timeseries.activity_log SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'workspace_id',
    timescaledb.compress_orderby = 'created_at DESC'
);

SELECT add_compression_policy('timeseries.activity_log', INTERVAL '30 days');

-- Compress webhook_deliveries older than 7 days
ALTER TABLE integration.webhook_deliveries SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'workspace_id',
    timescaledb.compress_orderby = 'created_at DESC'
);

SELECT add_compression_policy('integration.webhook_deliveries', INTERVAL '7 days');
```

### 8.4 Retention Policies

```sql
-- Auto-delete activity_log older than 1 year (configurable per workspace)
-- Phase 2: Use retention policy with workspace-level override
SELECT add_retention_policy('timeseries.activity_log', INTERVAL '365 days');

-- Auto-delete webhook_deliveries older than 90 days
SELECT add_retention_policy('integration.webhook_deliveries', INTERVAL '90 days');

-- Auto-delete automation runs older than 90 days
SELECT add_retention_policy('automation.runs', INTERVAL '90 days');

-- Auto-delete AI usage records older than 1 year
SELECT add_retention_policy('analytics.ai_usage', INTERVAL '365 days');
```

### 8.5 Chunk Statistics

```sql
-- Monitor hypertable chunks
SELECT
    h.table_name,
    count(*) AS num_chunks,
    pg_size_pretty(sum(ch.chunk_size)) AS total_size,
    min(c.range_start) AS earliest_data,
    max(c.range_end) AS latest_data
FROM timescaledb_information.chunks c
JOIN timescaledb_information.hypertables h ON c.hypertable_name = h.hypertable_name
GROUP BY h.table_name;
```

---

## 9. Row-Level Security

### 9.1 RLS Design Philosophy

Sprintio enforces workspace isolation at the **database level** using PostgreSQL Row-Level Security. Every query is automatically scoped to the user's workspace membership, eliminating the risk of cross-workspace data leaks at the application layer.

### 9.2 RLS Helper Functions

```sql
-- ============================================================
-- Helper: Get current workspace ID from session/local variable
-- ============================================================
-- The application sets this at the start of each request:
--   SET LOCAL app.current_workspace_id = '<workspace-uuid>';
--   SET LOCAL app.current_user_id = '<user-uuid>';

CREATE OR REPLACE FUNCTION auth.current_workspace_id()
RETURNS UUID AS $$
    SELECT current_setting('app.current_workspace_id', TRUE)::UUID;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.current_user_id()
RETURNS UUID AS $$
    SELECT current_setting('app.current_user_id', TRUE)::UUID;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- Helper: Check if user has required role in workspace
-- ============================================================
CREATE OR REPLACE FUNCTION auth.user_has_role(
    p_workspace_id UUID,
    p_min_role VARCHAR(20)
)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM workspace.memberships m
        WHERE m.workspace_id = p_workspace_id
            AND m.user_id = auth.current_user_id()
            AND m.status = 'active'
            AND (
                (p_min_role = 'viewer'  AND m.role IN ('owner', 'admin', 'member', 'guest', 'viewer'))
                OR (p_min_role = 'member' AND m.role IN ('owner', 'admin', 'member'))
                OR (p_min_role = 'admin'  AND m.role IN ('owner', 'admin'))
                OR (p_min_role = 'owner'  AND m.role = 'owner')
            )
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### 9.3 RLS Policies

```sql
-- ============================================================
-- WORKSPACES: Users can only see workspaces they belong to
-- ============================================================
ALTER TABLE workspace.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_isolation ON workspace.workspaces
    FOR ALL
    USING (
        id IN (
            SELECT m.workspace_id
            FROM workspace.memberships m
            WHERE m.user_id = auth.current_user_id()
                AND m.status = 'active'
        )
    );

-- ============================================================
-- SPACES: Scoped to workspace
-- ============================================================
ALTER TABLE workspace.spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_isolation ON workspace.spaces
    FOR ALL
    USING (workspace_id = auth.current_workspace_id());

-- ============================================================
-- TASKS: Scoped to workspace + membership
-- ============================================================
ALTER TABLE workspace.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_isolation ON workspace.tasks
    FOR ALL
    USING (workspace_id = auth.current_workspace_id());

-- ============================================================
-- COMMENTS: Scoped to workspace
-- ============================================================
ALTER TABLE workspace.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_isolation ON workspace.comments
    FOR ALL
    USING (workspace_id = auth.current_workspace_id());

-- ============================================================
-- DOCUMENTS: Workspace + optional doc-level permissions
-- ============================================================
ALTER TABLE workspace.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_isolation ON workspace.documents
    FOR SELECT
    USING (
        workspace_id = auth.current_workspace_id()
        AND (
            -- No explicit permissions → inherit workspace access
            permissions IS NULL
            OR
            -- Explicit permissions: check user or team membership
            permissions @> jsonb_build_object(
                auth.current_user_id()::text, 'view'
            )
            OR
            permissions @> jsonb_build_object(
                auth.current_user_id()::text, 'edit'
            )
        )
    );

CREATE POLICY workspace_modify ON workspace.documents
    FOR INSERT, UPDATE, DELETE
    USING (
        workspace_id = auth.current_workspace_id()
        AND (
            permissions IS NULL  -- Inherit workspace access
            OR
            permissions @> jsonb_build_object(
                auth.current_user_id()::text, 'edit'
            )
        )
    );

-- ============================================================
-- MEMBERSHIPS: Scoped to workspace
-- ============================================================
ALTER TABLE workspace.memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_isolation ON workspace.memberships
    FOR ALL
    USING (workspace_id = auth.current_workspace_id());

-- ============================================================
-- AUTOMATIONS: Scoped to workspace
-- ============================================================
ALTER TABLE automation.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_isolation ON automation.automations
    FOR ALL
    USING (workspace_id = auth.current_workspace_id());

-- ============================================================
-- NOTIFICATIONS: User sees only their own
-- ============================================================
ALTER TABLE workspace.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_isolation ON workspace.notifications
    FOR ALL
    USING (
        user_id = auth.current_user_id()
        AND workspace_id = auth.current_workspace_id()
    );
```

### 9.4 Application-Level RLS Integration (Drizzle)

```typescript
// src/db/rls.ts
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

/**
 * Set RLS context variables for the current request.
 * Must be called within a transaction.
 */
export async function setRLSContext(
  db: NodePgDatabase,
  userId: string,
  workspaceId: string
) {
  // PostgreSQL SET LOCAL only affects the current transaction
  await db.execute(
    sql`SET LOCAL app.current_user_id = ${userId}`;
  );
  await db.execute(
    sql`SET LOCAL app.current_workspace_id = ${workspaceId}`;
  );
}

/**
 * Execute a callback with RLS context.
 * All queries within the callback will be scoped to the user's workspace.
 */
export async function withRLS<T>(
  db: NodePgDatabase,
  userId: string,
  workspaceId: string,
  callback: (db: NodePgDatabase) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await setRLSContext(tx, userId, workspaceId);
    return callback(tx);
  });
}
```

### 9.5 Performance Considerations

| Concern                             | Mitigation                                                            |
| ----------------------------------- | --------------------------------------------------------------------- |
| RLS adds WHERE clause overhead      | All RLS policies use indexed columns (`workspace_id`, `user_id`)      |
| `SELECT` policies slow list queries | Use `SECURITY DEFINER` helper functions that cache membership lookups |
| Policy evaluation per row           | Ensure workspace_id indexes exist before enabling RLS                 |
| Subquery in policy                  | PostgreSQL caches subquery results within a transaction               |

### 9.6 Testing RLS

```sql
-- Test that RLS is working
-- As user A in workspace 1:
SET LOCAL app.current_user_id = 'user-a-uuid';
SET LOCAL app.current_workspace_id = 'workspace-1-uuid';

-- Should see only workspace 1 tasks:
SELECT COUNT(*) FROM workspace.tasks;

-- As user B (not a member of workspace 1):
SET LOCAL app.current_user_id = 'user-b-uuid';
SET LOCAL app.current_workspace_id = 'workspace-1-uuid';

-- Should see 0 tasks:
SELECT COUNT(*) FROM workspace.tasks;
```

---

## 10. Soft Deletes

### 10.1 Soft Delete Pattern

All user-facing entities support soft deletes via a `deleted_at` timestamp column. This enables:

- **Undo/restore** within the recovery window (90 days for MVP)
- **Audit trail preservation** — deleted entities still exist in activity log
- **No cascade surprises** — `ON DELETE SET NULL` preserves relationships
- **GDPR compliance** — hard delete after legal retention period

### 10.2 Implementation

```sql
-- ============================================================
-- Soft delete trigger: auto-update updated_at on soft delete
-- ============================================================
CREATE OR REPLACE FUNCTION workspace.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all workspace tables
CREATE TRIGGER trigger_tasks_updated
    BEFORE UPDATE ON workspace.tasks
    FOR EACH ROW
    EXECUTE FUNCTION workspace.update_timestamp();

CREATE TRIGGER trigger_documents_updated
    BEFORE UPDATE ON workspace.documents
    FOR EACH ROW
    EXECUTE FUNCTION workspace.update_timestamp();

-- (Repeat for all mutable workspace tables)
```

### 10.3 Application-Level Soft Delete

```typescript
// src/db/soft-delete.ts
import { eq, isNull, SQL } from 'drizzle-orm';

/**
 * Standard soft-delete filter.
 * Use this in ALL queries to exclude soft-deleted records.
 */
export function notDeleted<T extends { deletedAt: any }>(table: T): SQL {
  return isNull(table.deletedAt);
}

/**
 * Soft-delete a record.
 */
export async function softDelete(db: NodePgDatabase, table: any, id: string) {
  return db.update(table).set({ deletedAt: new Date() }).where(eq(table.id, id));
}

/**
 * Restore a soft-deleted record.
 */
export async function restore(db: NodePgDatabase, table: any, id: string) {
  return db.update(table).set({ deletedAt: null }).where(eq(table.id, id));
}

/**
 * Permanent delete (GDPR, admin cleanup).
 */
export async function hardDelete(db: NodePgDatabase, table: any, id: string) {
  return db.delete(table).where(eq(table.id, id));
}
```

### 10.4 Cleanup Cron (90-Day Purge)

```sql
-- Run weekly via pg_cron or application scheduler
-- Purge soft-deleted workspaces (and cascade to all child entities)
DELETE FROM workspace.workspaces
WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '90 days';

-- Purge soft-deleted tasks
DELETE FROM workspace.tasks
WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '90 days';

-- Purge soft-deleted documents
DELETE FROM workspace.documents
WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '90 days';
```

### 10.5 Excluded from Soft Delete

These entities are **hard-deleted** immediately (no recovery):

- `auth.sessions` — expired sessions are truncated
- `workspace.notifications` — read notifications are purged after 30 days
- `automation.runs` — old runs are purged by TimescaleDB retention policy

---

## 11. JSONB Patterns

### 11.1 TipTap/ProseMirror Document Storage

```sql
-- Task description stored as TipTap JSON
-- Example document:
-- {
--   "type": "doc",
--   "content": [
--     {
--       "type": "heading",
--       "attrs": {"level": 2},
--       "content": [{"type": "text", "text": "Requirements"}]
--     },
--     {
--       "type": "paragraph",
--       "content": [
--         {"type": "text", "text": "The API must support "},
--         {"type": "mention", "attrs": {"id": "user-uuid", "label": "Marcus"}},
--         {"type": "text", "text": " authentication."}
--       ]
--     },
--     {
--       "type": "codeBlock",
--       "attrs": {"language": "typescript"},
--       "content": [{"type": "text", "text": "const auth = new AuthService();"}]
--     }
--   ]
-- }

-- Query: Extract plain text from TipTap JSON for search indexing
CREATE OR REPLACE FUNCTION workspace.extract_plain_text(doc JSONB)
RETURNS TEXT AS $$
    SELECT string_agg(text, ' ')
    FROM jsonb_array_elements_text(
        jsonb_path_query_array(doc, '$.content[*]..text')
    ) AS text;
$$ LANGUAGE sql IMMUTABLE;

-- Query: Find tasks with mentions of a specific user
SELECT * FROM workspace.tasks
WHERE description @> jsonb_build_object(
    'content', jsonb_build_array(
        jsonb_build_object(
            'type', 'paragraph',
            'content', jsonb_build_array(
                jsonb_build_object(
                    'type', 'mention',
                    'attrs', jsonb_build_object('id', $1::text)
                )
            )
        )
    )
);
```

### 11.2 Custom Field Values (JSONB on Tasks)

```sql
-- Tasks.custom_fields examples:
-- Task A: {"priority_score": 8, "story_points": 5, "sprint": "Sprint 23"}
-- Task B: {"bug_type": "ui", "severity": "high", "affected_version": "2.1.0"}
-- Task C: {"budget": 15000, "client": "Acme Corp", "contract_type": "fixed"}

-- Query: Filter by custom field value
SELECT * FROM workspace.tasks
WHERE custom_fields ->> 'story_points' IS NOT NULL
    AND (custom_fields ->> 'story_points')::int > 3
    AND workspace_id = $1;

-- Query: Aggregate custom field values
SELECT
    custom_fields ->> 'sprint' AS sprint,
    COUNT(*) AS task_count,
    SUM((custom_fields ->> 'story_points')::int) AS total_points
FROM workspace.tasks
WHERE workspace_id = $1
    AND custom_fields ? 'sprint'
GROUP BY custom_fields ->> 'sprint';
```

### 11.3 View Configuration (JSONB)

```sql
-- lists.view_config stores the full view state:
-- {
--   "sort": [{"field": "created_at", "direction": "desc"}],
--   "group_by": "status",
--   "filters": [
--     {"field": "assignee", "operator": "is", "value": "{{current_user}}"},
--     {"field": "due_date", "operator": "before", "value": "{{next_week}}"}
--   ],
--   "visible_columns": ["title", "status", "assignee", "priority", "due_date"],
--   "column_order": ["title", "status", "assignee", "priority", "due_date"]
-- }

-- Query: Get a view configuration
SELECT view_config FROM workspace.lists WHERE id = $1;

-- Query: Update a specific filter (partial update)
UPDATE workspace.lists
SET view_config = jsonb_set(
    view_config,
    '{filters}',
    (view_config->'filters') || '[{"field": "priority", "operator": "is", "value": "high"}]'::jsonb
)
WHERE id = $1;
```

### 11.4 Automation Flow (JSONB)

```sql
-- automation.automations.flow:
-- {
--   "trigger": {
--     "type": "task.status_changed",
--     "config": {"from_status": "in_progress", "to_status": "done"}
--   },
--   "conditions": [
--     {"type": "field_match", "field": "priority", "operator": "equals", "value": "high"},
--     {"type": "time_range", "field": "due_date", "operator": "is_overdue"}
--   ],
--   "branch": {
--     "true": [
--       {"type": "notify", "config": {"channel": "in_app", "template": "high_priority_done"}}
--     ],
--     "false": [
--       {"type": "update_field", "config": {"field": "labels", "action": "append", "value": "auto-closed"}}
--     ]
--   }
-- }

-- Query: Find automations triggered by a specific event type
SELECT id, name, flow
FROM automation.automations
WHERE workspace_id = $1
    AND is_enabled = TRUE
    AND flow @> jsonb_build_object(
        'trigger', jsonb_build_object('type', 'task.status_changed')
    );

-- Query: Count automation runs by status
SELECT
    status,
    COUNT(*) AS count,
    AVG(duration_ms) AS avg_duration_ms
FROM automation.runs
WHERE automation_id = $1
    AND started_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

### 11.5 Metadata Pattern

```sql
-- tasks.metadata stores miscellaneous data:
-- {
--   "import_batch": "csv-import-2026-07-01",
--   "ai_triage": {"confidence": 0.92, "model": "gpt-4", "processed_at": "2026-07-01T10:30:00Z"},
--   "github_pr": {"repo": "org/repo", "pr_number": 42, "url": "https://..."},
--   "slack_message": {"channel": "C0123", "ts": "1688212200.000100"}
-- }

-- Query: Find tasks with a GitHub PR linked
SELECT id, title, metadata->'github_pr' AS github_pr
FROM workspace.tasks
WHERE metadata ? 'github_pr'
    AND workspace_id = $1;

-- Query: Find tasks created from a specific import
SELECT id, title
FROM workspace.tasks
WHERE metadata->>'import_batch' = $1
    AND workspace_id = $2;
```

---

## 12. Vector Search (pgvector)

### 12.1 Setup (Phase 2)

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Embedding dimensions:
-- OpenAI text-embedding-3-small: 1536 dimensions
-- OpenAI text-embedding-3-large: 3072 dimensions
-- Use 1536 for cost/quality balance

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX idx_embeddings_hnsw ON analytics.ai_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 200);
-- m = 16: connections per node (higher = better recall, more memory)
-- ef_construction = 200: search width during index build (higher = better quality, slower build)
```

### 12.2 Embedding Generation Pipeline

```typescript
// src/services/embeddings.ts
import OpenAI from 'openai';
import { db } from '../db';
import { aiEmbeddings } from '../db/schema/analytics';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface EmbeddingSource {
  entityType: 'task' | 'document' | 'comment';
  entityId: string;
  workspaceId: string;
  text: string; // Title + description/body text
}

/**
 * Generate embeddings for an entity.
 * For large documents, chunk the text into ~512 token segments.
 */
export async function generateEmbedding(source: EmbeddingSource): Promise<void> {
  const CHUNK_SIZE = 800; // ~512 tokens; overlap not needed for search
  const chunks = chunkText(source.text, CHUNK_SIZE);

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks,
  });

  // Upsert embeddings
  for (let i = 0; i < chunks.length; i++) {
    await db
      .insert(aiEmbeddings)
      .values({
        workspaceId: source.workspaceId,
        entityType: source.entityType,
        entityId: source.entityId,
        embedding: response.data[i].embedding,
        model: 'text-embedding-3-small',
        chunkIndex: i,
        chunkText: chunks[i],
      })
      .onConflictDoUpdate({
        target: [aiEmbeddings.entityType, aiEmbeddings.entityId, aiEmbeddings.chunkIndex],
        set: {
          embedding: response.data[i].embedding,
          chunkText: chunks[i],
          updatedAt: new Date(),
        },
      });
  }
}

function chunkText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = '';
  for (const sentence of sentences) {
    if (current.length + sentence.length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = '';
    }
    current += sentence + ' ';
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
```

### 12.3 Semantic Search Query

```sql
-- Find semantically similar entities to a query
-- $1 = embedding vector (1536 dimensions)
-- $2 = workspace_id
-- $3 = entity_type filter (optional)
-- $4 = result limit

SELECT
    ae.entity_type,
    ae.entity_id,
    ae.chunk_text AS snippet,
    1 - (ae.embedding <=> $1::vector) AS similarity,  -- Cosine similarity
    -- Fetch entity title/description
    CASE ae.entity_type
        WHEN 'task' THEN (SELECT title FROM workspace.tasks WHERE id = ae.entity_id)
        WHEN 'document' THEN (SELECT title FROM workspace.documents WHERE id = ae.entity_id)
        WHEN 'comment' THEN (SELECT body_text FROM workspace.comments WHERE id = ae.entity_id)
    END AS title
FROM analytics.ai_embeddings ae
WHERE ae.workspace_id = $2
    AND ($3::text IS NULL OR ae.entity_type = $3)
ORDER BY ae.embedding <=> $1::vector  -- Cosine distance (lower = more similar)
LIMIT $4;
```

### 12.4 HNSW Index Tuning

| Parameter               | Small Dataset (< 100K) | Medium (100K–1M) | Large (> 1M) |
| ----------------------- | ---------------------- | ---------------- | ------------ |
| **m**                   | 16                     | 16               | 32           |
| **ef_construction**     | 100                    | 200              | 200          |
| **ef_search** (runtime) | 50                     | 100              | 200          |
| **Lists** (IVFFlat alt) | N/A                    | N/A              | N/A          |

> **Note:** HNSW is preferred over IVFFlat for Sprintio's use case because:
>
> - HNSW doesn't require a training step (IVFFlat does)
> - HNSW provides better recall at the same speed
> - Sprintio's embedding count per workspace is moderate (< 100K per workspace)

---

## 13. Connection Pooling

### 13.1 PgBouncer Configuration

```ini
; /etc/pgbouncer/sprintio.ini

[databases]
sprintio = host=primary.sprintio.internal port=5432 dbname=sprintio_db
sprintio_replica = host=replica.sprintio.internal port=5432 dbname=sprintio_db

[pgbouncer]
; Pool mode: transaction (recommended for Drizzle ORM)
pool_mode = transaction

; Connection limits
max_client_conn = 1000           ; Total client connections accepted
default_pool_size = 50           ; Server connections per user/database pair
min_pool_size = 10               ; Minimum connections maintained
reserve_pool_size = 10           ; Extra connections for burst traffic
reserve_pool_timeout = 3         ; Seconds before using reserve pool

; Timeouts
server_idle_timeout = 300        ; Close idle server connections after 5 min
client_idle_timeout = 0          ; No client idle timeout (app manages)
query_timeout = 30               ; Kill queries running > 30 seconds
query_wait_timeout = 120         ; Max wait for a server connection

; Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1

; Security
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

; Drizzle compatibility
max_prepared_statements = 0      ; Disable server-side prepared statements
; (Drizzle handles this when pool_mode = transaction)
```

### 13.2 Connection Routing

```
                         ┌─────────────────┐
                         │   Application   │
                         │   (Node.js)     │
                         └────────┬────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │              │
                    ▼             ▼              ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │ PgBouncer│  │ PgBouncer│  │ Redis    │
            │ (Primary)│  │ (Replica)│  │ Cluster  │
            └─────┬────┘  └─────┬────┘  └──────────┘
                  │             │
                  ▼             ▼
          ┌──────────────┐ ┌──────────────┐
          │ PostgreSQL   │ │ PostgreSQL   │
          │ Primary      │ │ Read Replica │
          │ (Read/Write) │ │ (Read Only)  │
          └──────────────┘ └──────────────┘
```

### 13.3 Application Connection Config

```typescript
// src/db/client.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Primary pool (writes)
const primaryPool = new Pool({
  host: process.env.DB_PRIMARY_HOST, // PgBouncer primary
  port: parseInt(process.env.DB_PORT || '6432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // App-level max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
});

// Replica pool (reads)
const replicaPool = new Pool({
  host: process.env.DB_REPLICA_HOST, // PgBouncer replica
  port: parseInt(process.env.DB_PORT || '6432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 30, // More connections for reads
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
});

// Drizzle instances
export const dbWrite = drizzle(primaryPool);
export const dbRead = drizzle(replicaPool);

// Helper: Use replica for reads, primary for writes
export function getDb(readOnly = false) {
  return readOnly ? dbRead : dbWrite;
}
```

### 13.4 Read/Write Splitting

```typescript
// src/db/read-write.ts
import { getDb } from './client';

/**
 * Read replica for SELECT queries.
 * All reads should go through this to distribute load.
 */
export async function readQuery<T>(callback: (db: NodePgDatabase) => Promise<T>): Promise<T> {
  return callback(getDb(true));
}

/**
 * Primary for INSERT/UPDATE/DELETE.
 * Write transactions always go through this.
 */
export async function writeQuery<T>(callback: (db: NodePgDatabase) => Promise<T>): Promise<T> {
  return callback(getDb(false));
}

/**
 * Read-after-write consistency:
 * After a write, subsequent reads should go to primary
 * to avoid replication lag (typically < 100ms).
 */
export async function readAfterWrite<T>(
  writeFn: (db: NodePgDatabase) => Promise<T>,
  readFn: (db: NodePgDatabase) => Promise<T>,
): Promise<{ write: T; read: T }> {
  const write = await writeFn(getDb(false));
  // Immediately read from primary to avoid stale read
  const read = await readFn(getDb(false));
  return { write, read };
}
```

---

## 14. Backup & Recovery

### 14.1 Backup Strategy

| Backup Type          | Frequency  | Retention | Storage       | RPO      |
| -------------------- | ---------- | --------- | ------------- | -------- |
| **WAL Archiving**    | Continuous | 30 days   | Cloudflare R2 | < 1 hour |
| **Base Backup**      | Daily      | 30 days   | Cloudflare R2 | 24 hours |
| **Monthly Snapshot** | Monthly    | 12 months | Cloudflare R2 | 30 days  |

### 14.2 WAL Archiving Configuration

```ini
# postgresql.conf (PostgreSQL 16)

# WAL settings
wal_level = replica
archive_mode = on
archive_command = 'rclone copy %p s3:sprintio-backups/wal/%f'
archive_timeout = 3600          # Force WAL switch every hour (RPO guarantee)

# Replication
max_wal_senders = 5
wal_keep_size = 1GB

# Backup settings
full_page_writes = on
```

### 14.3 Backup Commands

```bash
# Full base backup (runs daily via cron)
pg_basebackup \
  -h primary.sprintio.internal \
  -U backup_user \
  -D /tmp/sprintio-backup \
  -Ft \                           # Tar format
  -z \                            # Gzip compression
  --checkpoint=fast \
  --wal-method=stream \
  -P

# Upload to R2
rclone copy /tmp/sprintio-backup s3:sprintio-backups/daily/$(date +%Y-%m-%d)

# Cleanup old backups locally
rm -rf /tmp/sprintio-backup
```

### 14.4 Point-in-Time Recovery

```bash
# Restore to a specific timestamp
# 1. Download base backup from R2
rclone copy s3:sprintio-backups/daily/2026-07-01 /tmp/restore

# 2. Configure recovery
cat >> postgresql.conf << EOF
restore_command = 'rclone copy s3:sprintio-backups/wal/%f %p'
recovery_target_time = '2026-07-01 14:30:00+00'
recovery_target_action = 'pause'
EOF

# 3. Create recovery.signal
touch /var/lib/postgresql/data/recovery.signal

# 4. Start PostgreSQL (enters recovery mode)
pg_ctl -D /var/lib/postgresql/data start

# 5. Verify recovery, then promote
psql -c "SELECT pg_wal_replay_resume();"
```

### 14.5 Backup Monitoring

```sql
-- Verify WAL archiving is working
SELECT
    archived_count,
    last_archived_wal,
    last_archived_time,
    failed_count,
    last_failed_wal,
    last_failed_time
FROM pg_stat_archiver;

-- Alert if:
-- - failed_count > 0 (archiving errors)
-- - last_archived_time is older than 10 minutes (archiving stalled)

-- Check replication lag (if read replica exists)
SELECT
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replay_lag_bytes
FROM pg_stat_replication;
```

---

## 15. Performance & Optimization

### 15.1 Query Performance Monitoring

```sql
-- Enable pg_stat_statements (run once)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 20 slowest queries
SELECT
    calls,
    round(total_exec_time::numeric, 2) AS total_ms,
    round(mean_exec_time::numeric, 2) AS avg_ms,
    round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS pct_total,
    rows,
    query
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY total_exec_time DESC
LIMIT 20;

-- Top 20 most-called queries
SELECT
    calls,
    round(mean_exec_time::numeric, 2) AS avg_ms,
    rows / NULLIF(calls, 0) AS avg_rows,
    query
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY calls DESC
LIMIT 20;

-- Queries with high variance (potential for optimization)
SELECT
    calls,
    round(stddev_exec_time::numeric, 2) AS stddev_ms,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    query
FROM pg_stat_statements
WHERE calls > 100
    AND stddev_exec_time > mean_exec_time  -- High variance
ORDER BY stddev_exec_time DESC
LIMIT 20;
```

### 15.2 EXPLAIN ANALYZE Patterns

```sql
-- ============================================================
-- Pattern 1: Board view query
-- ============================================================
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    status,
    json_agg(json_build_object('id', id, 'title', title) ORDER BY sort_order)
FROM workspace.tasks
WHERE list_id = 'some-list-uuid'
    AND deleted_at IS NULL
GROUP BY status;

-- Expected: Index Scan using idx_tasks_board
-- Verify: actual time < 50ms, no Seq Scan

-- ============================================================
-- Pattern 2: Full-text search
-- ============================================================
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, title, ts_rank(search_vector, plainto_tsquery('english', 'API authentication'))
FROM workspace.documents
WHERE search_vector @@ plainto_tsquery('english', 'API authentication')
    AND workspace_id = 'some-workspace-uuid'
ORDER BY ts_rank(search_vector, plainto_tsquery('english', 'API authentication')) DESC
LIMIT 20;

-- Expected: Bitmap Index Scan using idx_docs_fts
-- Verify: actual time < 100ms

-- ============================================================
-- Pattern 3: Task with relationships (N+1 check)
-- ============================================================
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
    t.*,
    json_agg(DISTINCT jsonb_build_object(
        'id', tr.id,
        'type', tr.relationship_type,
        'target_id', tr.target_task_id
    )) AS relationships,
    json_agg(DISTINCT jsonb_build_object(
        'id', c.id,
        'body_text', LEFT(c.body_text, 200),
        'author_name', u.name
    )) AS recent_comments
FROM workspace.tasks t
LEFT JOIN workspace.task_relationships tr ON tr.source_task_id = t.id
LEFT JOIN LATERAL (
    SELECT c.*, u.name
    FROM workspace.comments c
    JOIN auth.users u ON u.id = c.author_id
    WHERE c.task_id = t.id
    ORDER BY c.created_at DESC
    LIMIT 5
) c ON true
LEFT JOIN auth.users u ON u.id = c.author_id
WHERE t.id = 'some-task-uuid'
GROUP BY t.id;

-- Verify: Uses index lookups, not seq scans
-- Verify: Lateral join is efficient (uses idx_comments_task)
```

### 15.3 Common Performance Pitfalls

| Pitfall                     | Symptom                              | Solution                                                           |
| --------------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| **N+1 queries**             | API latency scales with result count | Use `json_agg` + `JOIN LATERAL` to fetch related data in one query |
| **Missing partial indexes** | COUNT queries scan entire table      | Add `WHERE deleted_at IS NULL` partial indexes                     |
| **JSONB full-table scan**   | `custom_fields @>` queries are slow  | Create GIN indexes on frequently queried JSONB columns             |
| **Unparameterized queries** | PgBouncer connection reuse fails     | Always use parameterized queries ($1, $2)                          |
| **Large result sets**       | Memory pressure, slow serialization  | Enforce cursor-based pagination; never `SELECT *` without LIMIT    |
| **Transaction hold time**   | Connection pool exhaustion           | Keep transactions < 500ms; avoid HTTP calls inside transactions    |

### 15.4 Table Size Monitoring

```sql
-- Table sizes (find candidates for partitioning or archival)
SELECT
    schemaname || '.' || tablename AS table_name,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS table_size,
    pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename::regclass)) AS index_size,
    (SELECT reltuples::bigint FROM pg_class WHERE oid = (schemaname || '.' || tablename)::regclass) AS est_rows
FROM pg_tables
WHERE schemaname IN ('workspace', 'auth', 'automation', 'integration', 'analytics', 'timeseries')
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
LIMIT 20;
```

### 15.5 Vacuum & Maintenance

```sql
-- Monitor table bloat
SELECT
    schemaname, tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 1) AS dead_pct,
    last_autovacuum,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname IN ('workspace', 'auth')
    AND n_dead_tup > 10000
ORDER BY n_dead_tup DESC;

-- Manual vacuum for heavily updated tables
VACUUM ANALYZE workspace.tasks;
VACUUM ANALYZE workspace.comments;
```

---

## 16. Redis Cache Architecture

### 16.1 Cache Key Namespaces

```
sprintio:{workspace_id}:{entity}:{id}         -- Entity cache
sprintio:{workspace_id}:sidebar                -- Sidebar data
sprintio:{workspace_id}:counts:{list_id}      -- Task counts
sprintio:user:{user_id}:session               -- Session data
sprintio:user:{user_id}:notifications:unread  -- Unread count
sprintio:rate:{identifier}                     -- Rate limiting
sprintio:presence:{doc_id}                     -- Yjs presence data
sprintio:lock:{resource_type}:{resource_id}    -- Distributed locks
```

### 16.2 Cache Strategy

| Data                    | Cache TTL              | Invalidation Trigger           |
| ----------------------- | ---------------------- | ------------------------------ |
| **Task**                | 5 min                  | Task update, comment add       |
| **List metadata**       | 10 min                 | List update, task count change |
| **Space sidebar**       | 5 min                  | Space/folder/list CRUD         |
| **User session**        | 30 min (sliding)       | Session refresh                |
| **Unread count**        | 30 sec                 | Notification create, mark read |
| **Rate limit counters** | 1 min (sliding window) | Per request                    |
| **View config**         | 10 min                 | View update                    |

### 16.3 Cache-Aside Pattern

```typescript
// src/cache/entity-cache.ts
import Redis from 'ioredis';

const redis = new Redis.Cluster(/* nodes */);

export async function getCachedTask(taskId: string, workspaceId: string) {
  const key = `sprintio:${workspaceId}:task:${taskId}`;

  // Try cache first
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // Cache miss — fetch from DB
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });

  if (task) {
    // Set with TTL
    await redis.setex(key, 300, JSON.stringify(task)); // 5 min TTL
  }

  return task;
}

export async function invalidateTaskCache(taskId: string, workspaceId: string) {
  const key = `sprintio:${workspaceId}:task:${taskId}`;
  await redis.del(key);

  // Also invalidate sidebar cache
  await redis.del(`sprintio:${workspaceId}:sidebar`);
}
```

---

## 17. Quick Reference Cheat Sheet

### 17.1 Table Reference

| Schema        | Table                      | Purpose              | Key Indexes                                        |
| ------------- | -------------------------- | -------------------- | -------------------------------------------------- |
| `auth`        | `users`                    | User accounts        | `email` (unique)                                   |
| `auth`        | `user_accounts`            | OAuth providers      | `(provider, provider_uid)`                         |
| `auth`        | `sessions`                 | Active sessions      | `user_id`, `expires_at`                            |
| `auth`        | `api_keys`                 | API authentication   | `key_hash` (unique)                                |
| `workspace`   | `workspaces`               | Top-level container  | `slug` (unique)                                    |
| `workspace`   | `memberships`              | User ↔ workspace     | `(workspace_id, user_id)`                          |
| `workspace`   | `teams`                    | Groups               | `workspace_id`, `parent_team_id`                   |
| `workspace`   | `spaces`                   | Project areas        | `workspace_id`                                     |
| `workspace`   | `folders`                  | Folder hierarchy     | `workspace_id`, `parent_id`, `path` (trigram)      |
| `workspace`   | `lists`                    | Task containers      | `workspace_id`, `space_id`                         |
| `workspace`   | `tasks`                    | Core work items      | `list_id`, `assignee_id`, `status`, `labels` (GIN) |
| `workspace`   | `task_relationships`       | Dependencies         | `source_task_id`, `target_task_id`                 |
| `workspace`   | `comments`                 | Threaded discussions | `task_id`, `parent_id`                             |
| `workspace`   | `documents`                | First-class docs     | `workspace_id`, `search_vector` (GIN)              |
| `workspace`   | `document_versions`        | Version history      | `(document_id, version_number)`                    |
| `workspace`   | `attachments`              | File metadata        | `entity_type, entity_id`                           |
| `workspace`   | `custom_field_definitions` | Field schemas        | `space_id`                                         |
| `workspace`   | `custom_field_values`      | Field data           | `task_id`, `field_def_id`                          |
| `workspace`   | `labels`                   | Tag definitions      | `(workspace_id, name)`                             |
| `workspace`   | `saved_views`              | View configs         | `list_id`                                          |
| `workspace`   | `notifications`            | User notifications   | `user_id`, unread partial                          |
| `workspace`   | `recurring_tasks`          | Cron schedules       | `next_run_at`                                      |
| `automation`  | `automations`              | Workflow rules       | `workspace_id`, trigger GIN                        |
| `automation`  | `runs`                     | Execution history    | `workspace_id`, `automation_id`                    |
| `integration` | `webhooks`                 | Outbound webhooks    | `workspace_id`, events GIN                         |
| `integration` | `webhook_deliveries`       | Delivery log         | `webhook_id`                                       |
| `integration` | `connected_integrations`   | External services    | `workspace_id`, `provider`                         |
| `analytics`   | `ai_embeddings`            | Vector search        | HNSW on `embedding`                                |
| `analytics`   | `ai_usage`                 | AI cost tracking     | `workspace_id`, `user_id`                          |
| `timeseries`  | `activity_log`             | Audit trail          | Hypertable: `created_at`                           |

### 17.2 Migration Commands

```bash
npx drizzle-kit generate          # Generate migration from schema
npx drizzle-kit migrate           # Run pending migrations
npx drizzle-kit push              # Push schema directly (dev)
npx drizzle-kit pull              # Pull DB schema into code
npx drizzle-kit studio            # Visual DB browser
```

### 17.3 RLS Quick Reference

```typescript
// Every API route handler should wrap queries in RLS context
import { withRLS } from '@/db/rls';

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  const workspaceId = req.headers['x-workspace-id'];

  return withRLS(db, user.id, workspaceId, async (tx) => {
    // All queries are automatically workspace-scoped
    const tasks = await tx.select().from(tasksTable);
    return Response.json(tasks);
  });
}
```

### 17.4 Drizzle Schema Snippet

```typescript
// drizzle/schema/workspace.ts
import {
  pgSchema,
  uuid,
  varchar,
  timestamp,
  jsonb,
  text,
  boolean,
  int,
  pgEnum,
} from 'drizzle-orm/pg-core';

const workspaceSchema = pgSchema('workspace');

export const tasks = workspaceSchema.table(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id').notNull(),
    listId: uuid('list_id').notNull(),
    number: int('number').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    description: jsonb('description'),
    status: varchar('status', { length: 50 }).default('backlog').notNull(),
    priority: varchar('priority', { length: 20 }),
    labels: text('labels').array().default([]),
    parentId: uuid('parent_id'),
    assigneeId: uuid('assignee_id'),
    creatorId: uuid('creator_id').notNull(),
    startDate: timestamp('start_date', { mode: 'date' }),
    dueDate: timestamp('due_date', { mode: 'date' }),
    completedAt: timestamp('completed_at', { mode: 'date' }),
    sortOrder: int('sort_order').default(0).notNull(),
    subtaskCount: int('subtask_count').default(0).notNull(),
    completedSubtasks: int('completed_subtasks').default(0).notNull(),
    commentCount: int('comment_count').default(0).notNull(),
    customFields: jsonb('custom_fields').default({}).notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    recurrence: jsonb('recurrence'),
    deletedAt: timestamp('deleted_at', { mode: 'date' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Indexes
    workspaceIdx: index('idx_tasks_workspace').on(table.workspaceId),
    listIdx: index('idx_tasks_list').on(table.listId),
    assigneeIdx: index('idx_tasks_assignee').on(table.assigneeId),
    statusIdx: index('idx_tasks_status').on(table.listId, table.status),
    boardIdx: index('idx_tasks_board').on(table.listId, table.status, table.sortOrder),
    deletedIdx: index('idx_tasks_deleted').on(table.workspaceId).where(isNull(table.deletedAt)),
    labelsIdx: index('idx_tasks_labels').using('gin', table.labels),
    customFieldsIdx: index('idx_tasks_custom_fields').using('gin', table.customFields),
  }),
);
```

### 17.5 Key Architectural Decisions

| Decision               | Choice                                            | Rationale                                                  |
| ---------------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| **ORM**                | Drizzle ORM                                       | Raw SQL performance, PgBouncer compatible, SQL migrations  |
| **UUID Strategy**      | UUIDv4 (random)                                   | No sequential leaking, safe for distributed systems        |
| **Soft Deletes**       | `deleted_at` timestamp                            | Undo support, audit preservation, GDPR compliance          |
| **Custom Fields**      | JSONB on tasks + normalized `custom_field_values` | Fast reads via JSONB, filtered/sorted via normalized table |
| **Hierarchy**          | Materialized path (`path TEXT`)                   | Efficient subtree queries, simple to update on move        |
| **Document Storage**   | TipTap JSON + Yjs binary state                    | CRDT collaboration + structured content                    |
| **Search**             | PostgreSQL FTS (Phase 1) → pgvector (Phase 2)     | Start simple, upgrade to semantic search                   |
| **Activity Log**       | TimescaleDB hypertable                            | Auto-partitioning, compression, retention policies         |
| **RLS**                | Application-enforced via `SET LOCAL`              | Fast, transparent, works with connection poolers           |
| **Connection Pooling** | PgBouncer (transaction mode)                      | Multiplexes connections, compatible with Drizzle           |

---

## Appendix A: Database Configuration

### PostgreSQL 16 Configuration (Production)

```ini
# postgresql.conf — Sprintio Production Settings

# Memory
shared_buffers = 4GB               # 25% of 16GB RAM
effective_cache_size = 12GB        # 75% of 16GB RAM
work_mem = 256MB                   # Per-operation memory for sorts/hashes
maintenance_work_mem = 1GB         # For VACUUM, CREATE INDEX, ALTER TABLE

# Write Ahead Log
wal_buffers = 64MB
checkpoint_completion_target = 0.9
max_wal_size = 4GB
min_wal_size = 1GB

# Query Planning
random_page_cost = 1.1             # SSD storage (not HDD)
effective_io_concurrency = 200     # SSD
default_statistics_target = 200    # Better query plans

# Parallelism (PostgreSQL 16)
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

# Connection
max_connections = 200              # PgBouncer handles pooling

# Logging
log_min_duration_statement = 100   # Log queries > 100ms
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0

# Autovacuum
autovacuum_max_workers = 4
autovacuum_naptime = 30s
autovacuum_vacuum_cost_delay = 2ms

# Timezone
timezone = 'UTC'
```

---

**Document Status:** Finalized  
**Next Review:** 2026-07-14  
**Owner:** Engineering  
**Approvers:** [whom it may concern]

---

_This document is the single source of truth for Sprintio's database architecture. Schema changes must be reviewed against this document and the migration safety checklist (§5.4) before deployment._
