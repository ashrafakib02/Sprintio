# Sprintio Database Migration Plan

**Database**: PostgreSQL 16 + TimescaleDB + pgvector
**ORM**: Drizzle ORM
**Date**: 2026-07-09
**Version**: 1.0.0

---

## 1. Migration Overview

| Metric                      | Value                                                               |
| --------------------------- | ------------------------------------------------------------------- |
| **Total Migrations**        | 17                                                                  |
| **Total Tables**            | 32                                                                  |
| **Schemas**                 | 6 (auth, workspace, automation, integration, analytics, timeseries) |
| **Extensions**              | 6 (uuid-ossp, pgcrypto, vector, pg_trgm, btree_gin, timescaledb)    |
| **Deferred FK Constraints** | 2 (api_keys → workspaces)                                           |
| **TimescaleDB Hypertables** | 3 (activity_log, automation_runs, webhook_deliveries)               |
| **Estimated Total Time**    | 35–55 minutes                                                       |
| **Risk Level**              | Medium — circular dependency on api_keys requires careful ordering  |

---

## 2. Migration Sequence

| #   | Migration Name                    | Description                                                                        | Tables Affected                                                  | Dependencies                                           |
| --- | --------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| 01  | `001_enable_extensions`           | Install all required PostgreSQL extensions                                         | (none — extension-level)                                         | None                                                   |
| 02  | `002_create_schemas`              | Create all 6 schemas in dependency order                                           | (none — schema-level)                                            | 001                                                    |
| 03  | `003_auth_users_and_sessions`     | Core auth tables: users, user_accounts, sessions                                   | users, user_accounts, sessions                                   | 002                                                    |
| 04  | `004_workspace_core`              | Core workspace tables: workspaces, memberships, teams, team_members, spaces        | workspaces, memberships, teams, team_members, spaces             | 003 (users)                                            |
| 05  | `005_auth_api_keys`               | Create api_keys table WITHOUT workspace FK (circular dep)                          | api_keys                                                         | 003 (users)                                            |
| 06  | `006_project_structure`           | Folders, lists, tasks, task_relationships — the project hierarchy                  | folders, lists, tasks, task_relationships                        | 004 (spaces, workspaces, users)                        |
| 07  | `007_custom_fields_and_labels`    | Custom field definitions, values, and labels                                       | custom_field_definitions, custom_field_values, labels            | 006 (tasks, spaces, workspaces)                        |
| 08  | `008_collaboration`               | Comments, documents, document_versions, attachments, saved_views                   | comments, documents, document_versions, attachments, saved_views | 006 (tasks, lists, spaces, folders, workspaces, users) |
| 09  | `009_notifications_and_recurring` | Notifications, preferences, and recurring task templates                           | notifications, notification_preferences, recurring_tasks         | 006 (tasks, workspaces, users)                         |
| 10  | `010_automation_schema`           | Automation engine tables                                                           | automations, automation_runs                                     | 004 (workspaces, users)                                |
| 11  | `011_integration_schema`          | Integration and webhook tables                                                     | webhooks, webhook_deliveries, connected_integrations             | 004 (workspaces, users)                                |
| 12  | `012_analytics_schema`            | AI/embedding and usage analytics                                                   | ai_embeddings, ai_usage                                          | 004 (workspaces, users)                                |
| 13  | `013_timeseries_schema`           | Time-series activity logging                                                       | activity_log                                                     | 004 (workspaces, users)                                |
| 14  | `014_deferred_foreign_keys`       | Add FK constraints that were deferred due to circular dependencies                 | api_keys (ALTER)                                                 | 004, 005                                               |
| 15  | `015_indexes`                     | Create all performance indexes across every schema                                 | (index-only — 50+ indexes)                                       | 003–013                                                |
| 16  | `016_triggers_and_functions`      | created_at/updated_at triggers, audit triggers, TimescaleDB hypertable conversions | (trigger/function-level)                                         | 015                                                    |
| 17  | `017_seed_data`                   | Default statuses, plans, notification defaults, system labels                      | (data-only — INSERT)                                             | 016                                                    |

---

## 3. Detailed Migration Files

### Migration 001: `001_enable_extensions`

**Description**: Install all PostgreSQL extensions required by the platform.
**Complexity**: Low
**Risk**: Low

```sql
-- Migration 001: Enable Extensions
-- Idempotent: Uses CREATE EXTENSION IF NOT EXISTS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- UUID v4 generation (gen_random_uuid via pgcrypto also available)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- Cryptographic functions, gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "vector";        -- pgvector for AI embeddings (ivfflat, hnsw)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- Trigram similarity search
CREATE EXTENSION IF NOT EXISTS "btree_gin";     -- GIN index support for scalar types
CREATE EXTENSION IF NOT EXISTS "timescaledb";   -- Hypertables, compression, continuous aggregates
```

**Verification**: `SELECT extname FROM pg_extension ORDER BY extname;` should return 6 rows.

---

### Migration 002: `002_create_schemas`

**Description**: Create all 6 application schemas in dependency order.
**Complexity**: Low
**Risk**: Low

```sql
-- Migration 002: Create Schemas
-- Idempotent: Uses CREATE SCHEMA IF NOT EXISTS

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS workspace;
CREATE SCHEMA IF NOT EXISTS automation;
CREATE SCHEMA IF NOT EXISTS integration;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS timeseries;

-- Grant default privileges for the application role
-- (Adjust role names to match your deployment)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sprintio_app') THEN
        CREATE ROLE sprintio_app LOGIN;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA auth TO sprintio_app;
GRANT USAGE ON SCHEMA workspace TO sprintio_app;
GRANT USAGE ON SCHEMA automation TO sprintio_app;
GRANT USAGE ON SCHEMA integration TO sprintio_app;
GRANT USAGE ON SCHEMA analytics TO sprintio_app;
GRANT USAGE ON SCHEMA timeseries TO sprintio_app;
```

**Verification**: `SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('auth','workspace','automation','integration','analytics','timeseries');` should return 6 rows.

---

### Migration 003: `003_auth_users_and_sessions`

**Description**: Core authentication tables — users, user_accounts (OAuth/provider links), and sessions.
**Complexity**: Medium
**Risk**: Low — foundation for everything else

```sql
-- Migration 003: Auth — Users and Sessions

-- ============================================================
-- TABLE: auth.users
-- ============================================================
CREATE TABLE IF NOT EXISTS auth.users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(320) NOT NULL,           -- RFC 5321 max
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash   TEXT,                             -- nullable for OAuth-only users
    full_name       VARCHAR(255),
    avatar_url      TEXT,
    locale          VARCHAR(10) DEFAULT 'en',
    timezone        VARCHAR(50) DEFAULT 'UTC',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_superadmin   BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_auth_users_email UNIQUE (email)
);

-- ============================================================
-- TABLE: auth.user_accounts (OAuth / social provider links)
-- ============================================================
CREATE TABLE IF NOT EXISTS auth.user_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider        VARCHAR(50) NOT NULL,             -- 'google', 'github', 'saml', etc.
    provider_uid    VARCHAR(255) NOT NULL,            -- provider's user ID
    provider_data   JSONB DEFAULT '{}',               -- tokens, profile snapshot
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_accounts_provider UNIQUE (provider, provider_uid)
);

-- ============================================================
-- TABLE: auth.sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS auth.sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,                    -- SHA-256 of session token
    ip_address      INET,
    user_agent      TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_sessions_token_hash UNIQUE (token_hash)
);
```

**Verification**: All three tables exist in `auth` schema. Confirm constraints: `SELECT conname FROM pg_constraint WHERE connamespace = 'auth'::regnamespace;`

---

### Migration 004: `004_workspace_core`

**Description**: Core workspace hierarchy — workspaces, memberships, teams, team_members, and spaces.
**Complexity**: High
**Risk**: Medium — this is the central hub; many tables depend on it

```sql
-- Migration 004: Workspace Core

-- ============================================================
-- TABLE: workspace.workspaces
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.workspaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    description     TEXT,
    logo_url        TEXT,
    plan            VARCHAR(50) NOT NULL DEFAULT 'free',  -- 'free', 'pro', 'enterprise'
    settings        JSONB DEFAULT '{}',
    is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_workspaces_slug UNIQUE (slug)
);

-- ============================================================
-- TABLE: workspace.memberships
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.memberships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role            VARCHAR(50) NOT NULL DEFAULT 'member',  -- 'owner', 'admin', 'member', 'guest'
    invited_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_memberships_workspace_user UNIQUE (workspace_id, user_id)
);

-- ============================================================
-- TABLE: workspace.teams (self-referencing)
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.teams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    parent_team_id  UUID REFERENCES workspace.teams(id) ON DELETE SET NULL,  -- self-FK
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_teams_workspace_name UNIQUE (workspace_id, name)
);

-- ============================================================
-- TABLE: workspace.team_members
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.team_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES workspace.teams(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role            VARCHAR(50) NOT NULL DEFAULT 'member',
    added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_team_members_team_user UNIQUE (team_id, user_id)
);

-- ============================================================
-- TABLE: workspace.spaces
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.spaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    icon            VARCHAR(50),
    color           VARCHAR(7),                       -- hex color
    visibility      VARCHAR(20) NOT NULL DEFAULT 'workspace', -- 'workspace', 'team', 'private'
    is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_spaces_workspace_name UNIQUE (workspace_id, name)
);
```

**Verification**: All 5 tables exist in `workspace` schema. Verify self-FK on teams: `SELECT conname FROM pg_constraint WHERE confrelid = 'workspace.teams'::regclass;`

---

### Migration 005: `005_auth_api_keys`

**Description**: Create api_keys table without workspace FK to break circular dependency. FK added in migration 014.
**Complexity**: Low
**Risk**: Medium — the deferred FK pattern must be followed strictly

```sql
-- Migration 005: Auth — API Keys (Deferred Workspace FK)
-- NOTE: workspace_id column exists but FK constraint is added in migration 014
--       This breaks the circular dependency: api_keys <-> workspaces

-- ============================================================
-- TABLE: auth.api_keys
-- ============================================================
CREATE TABLE IF NOT EXISTS auth.api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id    UUID,                             -- column exists, FK added in 014
    name            VARCHAR(255) NOT NULL,
    key_hash        TEXT NOT NULL,                    -- bcrypt/sha256 of the API key
    key_prefix      VARCHAR(10) NOT NULL,             -- first 8 chars for identification (e.g., 'sk_live_')
    scopes          TEXT[] NOT NULL DEFAULT '{}',      -- e.g. ARRAY['read:tasks', 'write:comments']
    rate_limit      INTEGER DEFAULT 1000,              -- requests per hour
    expires_at      TIMESTAMPTZ,
    last_used_at    TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_api_keys_key_hash UNIQUE (key_hash)
);
```

**Verification**: Table exists in `auth` schema. Confirm NO FK exists on workspace_id yet: `SELECT conname FROM pg_constraint WHERE conrelid = 'auth.api_keys'::regclass AND conname LIKE '%workspace%';` should return 0 rows.

---

### Migration 006: `006_project_structure`

**Description**: The core project hierarchy — folders, lists, tasks, and task relationships. This is the largest and most interconnected migration.
**Complexity**: Very High
**Risk**: High — 4 tables with interdependent foreign keys, self-referencing FKs

```sql
-- Migration 006: Project Structure (Folders → Lists → Tasks)

-- ============================================================
-- TABLE: workspace.folders (self-referencing via parent_folder_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.folders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id            UUID NOT NULL REFERENCES workspace.spaces(id) ON DELETE CASCADE,
    parent_folder_id    UUID REFERENCES workspace.folders(id) ON DELETE SET NULL,  -- self-FK
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: workspace.lists
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.lists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id        UUID NOT NULL REFERENCES workspace.spaces(id) ON DELETE CASCADE,
    folder_id       UUID REFERENCES workspace.folders(id) ON DELETE SET NULL,
    created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    icon            VARCHAR(50),
    color           VARCHAR(7),
    view_type       VARCHAR(20) NOT NULL DEFAULT 'list', -- 'list', 'board', 'timeline', 'calendar', 'table'
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: workspace.tasks (self-referencing via parent_task_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.tasks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id             UUID NOT NULL REFERENCES workspace.lists(id) ON DELETE CASCADE,
    parent_task_id      UUID REFERENCES workspace.tasks(id) ON DELETE SET NULL,  -- self-FK (subtasks)
    created_by          UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    title               TEXT NOT NULL,
    description         TEXT,
    description_html    TEXT,                         -- rendered HTML version
    status              VARCHAR(50) NOT NULL DEFAULT 'todo',  -- 'todo', 'in_progress', 'in_review', 'done'
    priority            SMALLINT DEFAULT 0,           -- 0=none, 1=low, 2=medium, 3=high, 4=urgent
    due_date            TIMESTAMPTZ,
    start_date          TIMESTAMPTZ,
    estimated_hours     DECIMAL(8,2),
    actual_hours        DECIMAL(8,2),
    sort_order          INTEGER NOT NULL DEFAULT 0,
    is_archived         BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at        TIMESTAMPTZ,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: workspace.task_relationships
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.task_relationships (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_task_id      UUID NOT NULL REFERENCES workspace.tasks(id) ON DELETE CASCADE,
    target_task_id      UUID NOT NULL REFERENCES workspace.tasks(id) ON DELETE CASCADE,
    relationship_type   VARCHAR(50) NOT NULL,          -- 'blocks', 'blocked_by', 'relates_to', 'duplicates'
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_task_relationships UNIQUE (source_task_id, target_task_id, relationship_type),
    CONSTRAINT chk_no_self_relationship CHECK (source_task_id != target_task_id)
);

-- Seed default statuses for this workspace (system-level template)
-- Actual workspace-level statuses are in seed data migration 017
```

**Verification**: All 4 tables exist. Verify self-FKs on folders and tasks. Verify task_relationships self-check constraint.

---

### Migration 007: `007_custom_fields_and_labels`

**Description**: Custom field definitions, their values, and workspace-level labels.
**Complexity**: Medium
**Risk**: Low

```sql
-- Migration 007: Custom Fields and Labels

-- ============================================================
-- TABLE: workspace.custom_field_definitions
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.custom_field_definitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id        UUID NOT NULL REFERENCES workspace.spaces(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    field_type      VARCHAR(50) NOT NULL,             -- 'text', 'number', 'date', 'select', 'multi_select', 'checkbox', 'url', 'email', 'person'
    description     TEXT,
    options         JSONB DEFAULT '[]',               -- for select/multi_select: [{label, color, value}]
    is_required     BOOLEAN NOT NULL DEFAULT FALSE,
    is_unique       BOOLEAN NOT NULL DEFAULT FALSE,
    default_value   JSONB,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_custom_fields_space_name UNIQUE (space_id, name)
);

-- ============================================================
-- TABLE: workspace.custom_field_values
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.custom_field_values (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id             UUID NOT NULL REFERENCES workspace.tasks(id) ON DELETE CASCADE,
    field_definition_id UUID NOT NULL REFERENCES workspace.custom_field_definitions(id) ON DELETE CASCADE,
    value               JSONB,                        -- polymorphic value storage
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_custom_field_values_task_field UNIQUE (task_id, field_definition_id)
);

-- ============================================================
-- TABLE: workspace.labels
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.labels (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    color           VARCHAR(7) NOT NULL DEFAULT '#6B7280',  -- hex color
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_labels_workspace_name UNIQUE (workspace_id, name)
);
```

**Verification**: All 3 tables exist. Verify unique constraints.

---

### Migration 008: `008_collaboration`

**Description**: Collaboration features — comments, documents with versioning, attachments, and saved views.
**Complexity**: High
**Risk**: Medium — documents table has many FKs

```sql
-- Migration 008: Collaboration (Comments, Documents, Attachments, Saved Views)

-- ============================================================
-- TABLE: workspace.comments (self-referencing for threads)
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.comments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id             UUID NOT NULL REFERENCES workspace.tasks(id) ON DELETE CASCADE,
    parent_comment_id   UUID REFERENCES workspace.comments(id) ON DELETE CASCADE,  -- self-FK (threads)
    author_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    body                TEXT NOT NULL,
    body_html           TEXT,
    is_edited           BOOLEAN NOT NULL DEFAULT FALSE,
    is_resolved         BOOLEAN NOT NULL DEFAULT FALSE,
    reactions           JSONB DEFAULT '{}',            -- {"thumbsup": ["user-id-1"], "heart": ["user-id-2"]}
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: workspace.documents (polymorphic parent)
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    space_id        UUID REFERENCES workspace.spaces(id) ON DELETE SET NULL,
    folder_id       UUID REFERENCES workspace.folders(id) ON DELETE SET NULL,
    list_id         UUID REFERENCES workspace.lists(id) ON DELETE SET NULL,
    task_id         UUID REFERENCES workspace.tasks(id) ON DELETE SET NULL,
    created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    title           VARCHAR(500) NOT NULL,
    slug            VARCHAR(500),
    content         TEXT,                             -- markdown content
    content_html    TEXT,                             -- rendered HTML
    is_published    BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
    current_version INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_documents_workspace_slug UNIQUE (workspace_id, slug)
);

-- ============================================================
-- TABLE: workspace.document_versions
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.document_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES workspace.documents(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    version_number  INTEGER NOT NULL,
    title           VARCHAR(500) NOT NULL,
    content         TEXT,
    content_html    TEXT,
    change_summary  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_document_versions_doc_version UNIQUE (document_id, version_number)
);

-- ============================================================
-- TABLE: workspace.attachments (polymorphic — no direct FK to entities)
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by     UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    -- Polymorphic parent fields (only one should be set)
    parent_type     VARCHAR(50),                      -- 'task', 'comment', 'document', 'message'
    parent_id       UUID,
    file_name       VARCHAR(500) NOT NULL,
    file_size       BIGINT NOT NULL,                  -- bytes
    mime_type       VARCHAR(255) NOT NULL,
    storage_key     TEXT NOT NULL,                    -- S3/R2 key or local path
    storage_bucket  VARCHAR(255),
    checksum        VARCHAR(64),                      -- SHA-256
    metadata        JSONB DEFAULT '{}',               -- dimensions, duration, etc.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_attachment_parent CHECK (
        (parent_type IS NULL AND parent_id IS NULL) OR
        (parent_type IS NOT NULL AND parent_id IS NOT NULL)
    )
);

-- ============================================================
-- TABLE: workspace.saved_views
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.saved_views (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id         UUID NOT NULL REFERENCES workspace.lists(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    view_type       VARCHAR(20) NOT NULL DEFAULT 'list',
    filters         JSONB DEFAULT '{}',               -- {status: ["todo"], priority: [3], assignee: [...]}
    sort_config     JSONB DEFAULT '[]',               -- [{field: "due_date", direction: "asc"}]
    group_by        VARCHAR(100),                     -- field name to group by
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    is_shared       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_saved_views_list_user_name UNIQUE (list_id, user_id, name)
);
```

**Verification**: All 5 tables exist. Verify documents has all 5 polymorphic FK columns. Verify attachments has the CHECK constraint.

---

### Migration 009: `009_notifications_and_recurring`

**Description**: Notification system, user preferences, and recurring task templates.
**Complexity**: Medium
**Risk**: Low

```sql
-- Migration 009: Notifications and Recurring Tasks

-- ============================================================
-- TABLE: workspace.notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    type            VARCHAR(100) NOT NULL,            -- 'task_assigned', 'comment_mention', 'status_change', etc.
    title           VARCHAR(500) NOT NULL,
    body            TEXT,
    entity_type     VARCHAR(50),                      -- polymorphic: 'task', 'comment', 'document'
    entity_id       UUID,
    actor_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    is_emailed      BOOLEAN NOT NULL DEFAULT FALSE,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at         TIMESTAMPTZ
);

-- ============================================================
-- TABLE: workspace.notification_preferences
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.notification_preferences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL,          -- matches notification.type values
    channel         VARCHAR(20) NOT NULL DEFAULT 'in_app', -- 'in_app', 'email', 'push', 'slack'
    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_notif_prefs_user_type_channel UNIQUE (user_id, notification_type, channel)
);

-- ============================================================
-- TABLE: workspace.recurring_tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.recurring_tasks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id             UUID NOT NULL REFERENCES workspace.tasks(id) ON DELETE CASCADE,
    workspace_id        UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    recurrence_rule     TEXT NOT NULL,                 -- iCalendar RRULE format
    recurrence_timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    next_occurrence_at  TIMESTAMPTZ,
    last_occurrence_at  TIMESTAMPTZ,
    max_occurrences     INTEGER,                       -- NULL = unlimited
    current_count       INTEGER NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Verification**: All 3 tables exist. Verify notification_preferences unique constraint.

---

### Migration 010: `010_automation_schema`

**Description**: Automation engine — trigger/action workflows and their execution history.
**Complexity**: Medium
**Risk**: Low — isolated schema

```sql
-- Migration 010: Automation Schema

-- ============================================================
-- TABLE: automation.automations
-- ============================================================
CREATE TABLE IF NOT EXISTS automation.automations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    trigger_type    VARCHAR(50) NOT NULL,             -- 'status_change', 'due_date', 'field_update', 'schedule', 'webhook'
    trigger_config  JSONB NOT NULL DEFAULT '{}',      -- {field: "status", from: "todo", to: "in_progress"}
    actions         JSONB NOT NULL DEFAULT '[]',      -- [{type: "assign", config: {user_id: "..."}}, ...]
    last_run_at     TIMESTAMPTZ,
    run_count       INTEGER NOT NULL DEFAULT 0,
    error_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: automation.automation_runs
-- ============================================================
CREATE TABLE IF NOT EXISTS automation.automation_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id   UUID NOT NULL REFERENCES automation.automations(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'success', 'failed'
    trigger_event   JSONB DEFAULT '{}',               -- snapshot of what triggered the run
    actions_taken   JSONB DEFAULT '[]',               -- log of each action's result
    error_message   TEXT,
    duration_ms     INTEGER,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);
```

**Verification**: Both tables exist in `automation` schema. Verify FK to `workspace.workspaces`.

---

### Migration 011: `011_integration_schema`

**Description**: Third-party integrations — webhooks, delivery tracking, connected services.
**Complexity**: Medium
**Risk**: Low — isolated schema

```sql
-- Migration 011: Integration Schema

-- ============================================================
-- TABLE: integration.webhooks
-- ============================================================
CREATE TABLE IF NOT EXISTS integration.webhooks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    name            VARCHAR(255) NOT NULL,
    url             TEXT NOT NULL,
    secret          TEXT,                             -- HMAC signing secret
    events          TEXT[] NOT NULL DEFAULT '{}',     -- e.g. ARRAY['task.created', 'task.updated']
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    headers         JSONB DEFAULT '{}',               -- custom headers
    failure_count   INTEGER NOT NULL DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: integration.webhook_deliveries
-- ============================================================
CREATE TABLE IF NOT EXISTS integration.webhook_deliveries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id      UUID NOT NULL REFERENCES integration.webhooks(id) ON DELETE CASCADE,
    event_type      VARCHAR(100) NOT NULL,
    payload         JSONB NOT NULL,
    response_status SMALLINT,
    response_body   TEXT,
    attempt         SMALLINT NOT NULL DEFAULT 1,
    max_attempts    SMALLINT NOT NULL DEFAULT 3,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed', 'retrying'
    error_message   TEXT,
    delivered_at    TIMESTAMPTZ,
    next_retry_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: integration.connected_integrations
-- ============================================================
CREATE TABLE IF NOT EXISTS integration.connected_integrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    provider        VARCHAR(50) NOT NULL,             -- 'slack', 'github', 'jira', 'linear', 'notion', etc.
    provider_team_id VARCHAR(255),
    access_token    TEXT,                             -- encrypted
    refresh_token   TEXT,                             -- encrypted
    token_expires_at TIMESTAMPTZ,
    settings        JSONB DEFAULT '{}',               -- provider-specific config
    status          VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'error', 'disconnected'
    last_synced_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_connected_integrations_workspace_provider UNIQUE (workspace_id, provider)
);
```

**Verification**: All 3 tables exist in `integration` schema.

---

### Migration 012: `012_analytics_schema`

**Description**: AI-powered analytics — vector embeddings for semantic search and usage tracking.
**Complexity**: Medium
**Risk**: Medium — pgvector requires careful index configuration

```sql
-- Migration 012: Analytics Schema

-- ============================================================
-- TABLE: analytics.ai_embeddings
-- Polymorphic: embeds tasks, documents, comments for semantic search
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics.ai_embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     VARCHAR(50) NOT NULL,             -- 'task', 'document', 'comment'
    entity_id       UUID NOT NULL,
    model           VARCHAR(100) NOT NULL,            -- 'text-embedding-3-small', 'nomic-embed-text', etc.
    embedding       vector(1536),                     -- dimension depends on model; 1536 for OpenAI
    content_hash    VARCHAR(64) NOT NULL,             -- SHA-256 of source text to detect staleness
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_ai_embeddings_entity_model UNIQUE (entity_type, entity_id, model)
);

-- ============================================================
-- TABLE: analytics.ai_usage
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics.ai_usage (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    operation       VARCHAR(50) NOT NULL,             -- 'embedding', 'summarize', 'autofill', 'search'
    model           VARCHAR(100) NOT NULL,
    input_tokens    INTEGER NOT NULL DEFAULT 0,
    output_tokens   INTEGER NOT NULL DEFAULT 0,
    cost_cents      INTEGER NOT NULL DEFAULT 0,       -- cost in hundredths of a cent
    latency_ms      INTEGER,
    entity_type     VARCHAR(50),
    entity_id       UUID,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Verification**: Both tables exist in `analytics` schema. Verify `embedding` column is `vector(1536)`: `SELECT udt_name FROM information_schema.columns WHERE table_schema='analytics' AND table_name='ai_embeddings' AND column_name='embedding';`

---

### Migration 013: `013_timeseries_schema`

**Description**: Time-series activity log for audit trails and analytics.
**Complexity**: Medium
**Risk**: Low (hypertable conversion happens in migration 016)

```sql
-- Migration 013: Timeseries Schema

-- ============================================================
-- TABLE: timeseries.activity_log
-- ============================================================
CREATE TABLE IF NOT EXISTS timeseries.activity_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    workspace_id    UUID NOT NULL REFERENCES workspace.workspaces(id) ON DELETE CASCADE,
    action          VARCHAR(100) NOT NULL,            -- 'task.created', 'task.status_changed', 'comment.added', etc.
    entity_type     VARCHAR(50),
    entity_id       UUID,
    entity_name     TEXT,                             -- denormalized for fast display
    old_value       JSONB,
    new_value       JSONB,
    metadata        JSONB DEFAULT '{}',
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTE: TimescaleDB hypertable conversion happens in migration 016
-- because indexes must be created before hypertable conversion
```

**Verification**: Table exists in `timeseries` schema. Confirm it is NOT yet a hypertable: `SELECT h hypertable_name FROM timescaledb_information.hypertables WHERE hypertable_schema='timeseries';` should return empty (or error if no activities exist yet).

---

### Migration 014: `014_deferred_foreign_keys`

**Description**: Add FK constraints that were deferred to break circular dependencies.
**Complexity**: Low
**Risk**: Medium — must verify referential integrity before adding

```sql
-- Migration 014: Deferred Foreign Keys

-- ============================================================
-- Add workspace FK to api_keys (breaks circular dependency)
-- ============================================================
DO $$
BEGIN
    -- Only add if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'auth.api_keys'::regclass
        AND conname = 'fk_api_keys_workspace_id'
    ) THEN
        ALTER TABLE auth.api_keys
            ADD CONSTRAINT fk_api_keys_workspace_id
            FOREIGN KEY (workspace_id) REFERENCES workspace.workspaces(id) ON DELETE SET NULL;
    END IF;
END
$$;

-- Verify no orphaned references exist before constraint is enforced
-- (In practice, api_keys rows shouldn't reference non-existent workspaces
--  if the app logic is correct, but this is a safety check)
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM auth.api_keys ak
    WHERE ak.workspace_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM workspace.workspaces w WHERE w.id = ak.workspace_id);

    IF orphan_count > 0 THEN
        RAISE WARNING '% orphaned api_keys found. Nullifying workspace_id.', orphan_count;
        UPDATE auth.api_keys SET workspace_id = NULL
        WHERE workspace_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM workspace.workspaces w WHERE w.id = workspace_id);
    END IF;
END
$$;
```

**Verification**: `SELECT conname FROM pg_constraint WHERE conrelid = 'auth.api_keys'::regclass AND conname = 'fk_api_keys_workspace_id';` should return 1 row.

---

### Migration 015: `015_indexes`

**Description**: Create all performance indexes. Split into sections for clarity and to ensure idempotency.
**Complexity**: High — 50+ indexes
**Risk**: Low — index creation is non-destructive

```sql
-- Migration 015: Indexes
-- All indexes use IF NOT EXISTS for idempotency

-- ============================================================
-- AUTH SCHEMA INDEXES
-- ============================================================

-- users
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users (email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON auth.users (is_active) WHERE is_active = TRUE;

-- user_accounts
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON auth.user_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_provider ON auth.user_accounts (provider, provider_uid);

-- sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON auth.sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON auth.sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON auth.sessions (token_hash);

-- api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON auth.api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_id ON auth.api_keys (workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON auth.api_keys (key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON auth.api_keys (is_active, expires_at) WHERE is_active = TRUE;

-- ============================================================
-- WORKSPACE SCHEMA INDEXES
-- ============================================================

-- workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspace.workspaces (owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspace.workspaces (slug);

-- memberships
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON workspace.memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_workspace_id ON workspace.memberships (workspace_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON workspace.memberships (role);

-- teams
CREATE INDEX IF NOT EXISTS idx_teams_workspace_id ON workspace.teams (workspace_id);
CREATE INDEX IF NOT EXISTS idx_teams_parent_team_id ON workspace.teams (parent_team_id);

-- team_members
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON workspace.team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON workspace.team_members (team_id);

-- spaces
CREATE INDEX IF NOT EXISTS idx_spaces_workspace_id ON workspace.spaces (workspace_id);
CREATE INDEX IF NOT EXISTS idx_spaces_created_by ON workspace.spaces (created_by);
CREATE INDEX IF NOT EXISTS idx_spaces_archived ON workspace.spaces (is_archived) WHERE is_archived = FALSE;

-- folders
CREATE INDEX IF NOT EXISTS idx_folders_space_id ON workspace.folders (space_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_folder_id ON workspace.folders (parent_folder_id);

-- lists
CREATE INDEX IF NOT EXISTS idx_lists_space_id ON workspace.lists (space_id);
CREATE INDEX IF NOT EXISTS idx_lists_folder_id ON workspace.lists (folder_id);
CREATE INDEX IF NOT EXISTS idx_lists_created_by ON workspace.lists (created_by);
CREATE INDEX IF NOT EXISTS idx_lists_archived ON workspace.lists (is_archived) WHERE is_archived = FALSE;

-- tasks
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON workspace.tasks (list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON workspace.tasks (parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON workspace.tasks (created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON workspace.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON workspace.tasks (priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON workspace.tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON workspace.tasks (is_archived) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON workspace.tasks (completed_at);
-- Composite index for common query: tasks in a list by status and priority
CREATE INDEX IF NOT EXISTS idx_tasks_list_status_priority ON workspace.tasks (list_id, status, priority DESC);

-- task_relationships
CREATE INDEX IF NOT EXISTS idx_task_rel_source ON workspace.task_relationships (source_task_id);
CREATE INDEX IF NOT EXISTS idx_task_rel_target ON workspace.task_relationships (target_task_id);
CREATE INDEX IF NOT EXISTS idx_task_rel_type ON workspace.task_relationships (relationship_type);

-- custom_field_definitions
CREATE INDEX IF NOT EXISTS idx_custom_fields_space_id ON workspace.custom_field_definitions (space_id);

-- custom_field_values
CREATE INDEX IF NOT EXISTS idx_custom_field_values_task_id ON workspace.custom_field_values (task_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field_def_id ON workspace.custom_field_values (field_definition_id);

-- labels
CREATE INDEX IF NOT EXISTS idx_labels_workspace_id ON workspace.labels (workspace_id);

-- comments
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON workspace.comments (task_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON workspace.comments (parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON workspace.comments (author_id);

-- documents
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON workspace.documents (workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_space_id ON workspace.documents (space_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON workspace.documents (folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_list_id ON workspace.documents (list_id);
CREATE INDEX IF NOT EXISTS idx_documents_task_id ON workspace.documents (task_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON workspace.documents (created_by);
CREATE INDEX IF NOT EXISTS idx_documents_published ON workspace.documents (is_published) WHERE is_published = TRUE;

-- document_versions
CREATE INDEX IF NOT EXISTS idx_doc_versions_document_id ON workspace.document_versions (document_id);

-- attachments
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON workspace.attachments (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_attachments_parent ON workspace.attachments (parent_type, parent_id);

-- saved_views
CREATE INDEX IF NOT EXISTS idx_saved_views_list_id ON workspace.saved_views (list_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_user_id ON workspace.saved_views (user_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON workspace.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id ON workspace.notifications (workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON workspace.notifications (user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON workspace.notifications (created_at DESC);

-- notification_preferences
CREATE INDEX IF NOT EXISTS idx_notif_prefs_user_id ON workspace.notification_preferences (user_id);

-- recurring_tasks
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_task_id ON workspace.recurring_tasks (task_id);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_next_occurrence ON workspace.recurring_tasks (next_occurrence_at) WHERE is_active = TRUE;

-- ============================================================
-- AUTOMATION SCHEMA INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_automations_workspace_id ON automation.automations (workspace_id);
CREATE INDEX IF NOT EXISTS idx_automations_created_by ON automation.automations (created_by);
CREATE INDEX IF NOT EXISTS idx_automations_active ON automation.automations (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_automation_runs_automation_id ON automation.automation_runs (automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_status ON automation.automation_runs (status);
-- NOTE: activity_log index for automation_runs is a TimescaleDB hypertable index, created in migration 016

-- ============================================================
-- INTEGRATION SCHEMA INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_webhooks_workspace_id ON integration.webhooks (workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON integration.webhooks (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON integration.webhook_deliveries (webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON integration.webhook_deliveries (status);
CREATE INDEX IF NOT EXISTS idx_connected_integrations_workspace ON integration.connected_integrations (workspace_id);
CREATE INDEX IF NOT EXISTS idx_connected_integrations_provider ON integration.connected_integrations (provider);

-- ============================================================
-- ANALYTICS SCHEMA INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ai_embeddings_entity ON analytics.ai_embeddings (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_model ON analytics.ai_embeddings (model);
-- HNSW index for vector similarity search (created after hypertable if applicable)
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_vector ON analytics.ai_embeddings USING hnsw (embedding vector_cosine_ops);
-- NOTE: For very large datasets, consider ivfflat instead of hnsw; set lists = sqrt(row_count)

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON analytics.ai_usage (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_workspace_id ON analytics.ai_usage (workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON analytics.ai_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_operation ON analytics.ai_usage (operation);

-- ============================================================
-- TIMESERIES SCHEMA INDEXES (pre-hypertable)
-- ============================================================
-- These are standard B-tree indexes created BEFORE hypertable conversion
-- TimescaleDB will convert them to hypertable-aware indexes

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON timeseries.activity_log (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_workspace_id ON timeseries.activity_log (workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON timeseries.activity_log (action);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON timeseries.activity_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON timeseries.activity_log (created_at DESC);
```

**Verification**: Count indexes per schema: `SELECT schemaname, COUNT(*) FROM pg_indexes WHERE schemaname IN ('auth','workspace','automation','integration','analytics','timeseries') GROUP BY schemaname;`

---

### Migration 016: `016_triggers_and_functions`

**Description**: Database triggers for updated_at auto-update, TimescaleDB hypertable conversions, and utility functions.
**Complexity**: High
**Risk**: Medium — TimescaleDB hypertable conversion is irreversible without data loss

```sql
-- Migration 016: Triggers, Functions, and TimescaleDB Hypertables

-- ============================================================
-- FUNCTION: auto-update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION workspace.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auth.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS: Apply updated_at to all tables with updated_at column
-- ============================================================

-- auth schema
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

CREATE TRIGGER trg_user_accounts_updated_at
    BEFORE UPDATE ON auth.user_accounts
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

CREATE TRIGGER trg_api_keys_updated_at
    BEFORE UPDATE ON auth.api_keys
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

-- workspace schema
CREATE TRIGGER trg_workspaces_updated_at
    BEFORE UPDATE ON workspace.workspaces
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

CREATE TRIGGER trg_memberships_updated_at
    BEFORE UPDATE ON workspace.memberships
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

CREATE TRIGGER trg_teams_updated_at
    BEFORE UPDATE ON workspace.teams
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

CREATE TRIGGER trg_spaces_updated_at
    BEFORE UPDATE ON workspace.spaces
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

CREATE TRIGGER trg_folders_updated_at
    BEFORE UPDATE ON workspace.folders
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

CREATE TRIGGER trg_lists_updated_at
    BEFORE UPDATE ON workspace.lists
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON workspace.tasks
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

CREATE TRIGGER trg_custom_field_definitions_updated_at
    BEFORE UPDATE ON workspace.custom_field_definitions
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

CREATE TRIGGER trg_custom_field_values_updated_at
    BEFORE UPDATE ON workspace.custom_field_values
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

CREATE TRIGGER trg_labels_updated_at
    BEFORE UPDATE ON workspace.labels
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

CREATE TRIGGER trg_comments_updated_at
    BEFORE UPDATE ON workspace.comments
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

CREATE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON workspace.documents
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

CREATE TRIGGER trg_saved_views_updated_at
    BEFORE UPDATE ON workspace.saved_views
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

CREATE TRIGGER trg_notification_preferences_updated_at
    BEFORE UPDATE ON workspace.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

CREATE TRIGGER trg_recurring_tasks_updated_at
    BEFORE UPDATE ON workspace.recurring_tasks
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

CREATE TRIGGER trg_automations_updated_at
    BEFORE UPDATE ON automation.automations
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

CREATE TRIGGER trg_webhooks_updated_at
    BEFORE UPDATE ON integration.webhooks
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

CREATE TRIGGER trg_connected_integrations_updated_at
    BEFORE UPDATE ON integration.connected_integrations
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

CREATE TRIGGER trg_ai_embeddings_updated_at
    BEFORE UPDATE ON analytics.ai_embeddings
    FOR EACH ROW EXECUTE FUNCTION workspace.set_updated_at();

-- ============================================================
-- FUNCTION: activity log helper (for trigger-based logging)
-- ============================================================
CREATE OR REPLACE FUNCTION timeseries.log_activity(
    p_user_id UUID,
    p_workspace_id UUID,
    p_action VARCHAR,
    p_entity_type VARCHAR DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_entity_name TEXT DEFAULT NULL,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO timeseries.activity_log (
        user_id, workspace_id, action, entity_type, entity_id,
        entity_name, old_value, new_value, metadata
    ) VALUES (
        p_user_id, p_workspace_id, p_action, p_entity_type, p_entity_id,
        p_entity_name, p_old_value, p_new_value, p_metadata
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TIMESCALEDB: Convert tables to hypertables
-- WARNING: Hypertable conversion is irreversible
-- Run these AFTER all indexes are created on the base tables
-- ============================================================

-- activity_log: partition by created_at, chunk interval 7 days
SELECT create_hypertable(
    'timeseries.activity_log',
    by_range('created_at', INTERVAL '7 days'),
    if_not_exists => TRUE
);

-- automation_runs: partition by started_at, chunk interval 1 day
SELECT create_hypertable(
    'automation.automation_runs',
    by_range('started_at', INTERVAL '1 day'),
    if_not_exists => TRUE
);

-- webhook_deliveries: partition by created_at, chunk interval 1 day
SELECT create_hypertable(
    'integration.webhook_deliveries',
    by_range('created_at', INTERVAL '1 day'),
    if_not_exists => TRUE
);

-- ============================================================
-- TIMESCALEDB: Enable compression on old data
-- ============================================================
ALTER TABLE timeseries.activity_log SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'workspace_id',
    timescaledb.compress_orderby = 'created_at DESC'
);

-- Compress data older than 30 days (schedule via policy)
SELECT add_compression_policy('timeseries.activity_log', INTERVAL '30 days', if_not_exists => TRUE);

ALTER TABLE automation.automation_runs SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'automation_id',
    timescaledb.compress_orderby = 'started_at DESC'
);

SELECT add_compression_policy('automation.automation_runs', INTERVAL '7 days', if_not_exists => TRUE);

ALTER TABLE integration.webhook_deliveries SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'webhook_id',
    timescaledb.compress_orderby = 'created_at DESC'
);

SELECT add_compression_policy('integration.webhook_deliveries', INTERVAL '7 days', if_not_exists => TRUE);

-- ============================================================
-- TIMESCALEDB: Continuous Aggregates (activity rollups)
-- ============================================================
CREATE MATERIALIZED VIEW timeseries.activity_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', created_at) AS bucket,
    workspace_id,
    user_id,
    action,
    COUNT(*) AS event_count
FROM timeseries.activity_log
GROUP BY bucket, workspace_id, user_id, action
WITH NO DATA;

-- Refresh policy: every 15 minutes
SELECT add_continuous_aggregate_policy('timeseries.activity_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '15 minutes',
    schedule_interval => INTERVAL '15 minutes',
    if_not_exists => TRUE
);

-- ============================================================
-- Retention policy: drop data older than 2 years
-- ============================================================
SELECT add_retention_policy('timeseries.activity_log', INTERVAL '2 years', if_not_exists => TRUE);
```

**Verification**:

1. Triggers exist: `SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema IN ('auth','workspace','automation','integration','analytics');`
2. Hypertables exist: `SELECT * FROM timescaledb_information.hypertables;`
3. Compression policies: `SELECT * FROM timescaledb_information.jobs WHERE proc_name = 'policy_compression';`

---

### Migration 017: `017_seed_data`

**Description**: Initial data — default statuses, system labels, and notification preferences template.
**Complexity**: Low
**Risk**: Low

```sql
-- Migration 017: Seed Data
-- Idempotent: Uses INSERT ... ON CONFLICT DO NOTHING

-- ============================================================
-- Default workspace statuses (system-level templates)
-- Stored as a reference; each workspace copies these on creation
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.default_statuses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_key      VARCHAR(50) NOT NULL UNIQUE,
    label           VARCHAR(100) NOT NULL,
    color           VARCHAR(7) NOT NULL DEFAULT '#6B7280',
    category        VARCHAR(20) NOT NULL,             -- 'open', 'in_progress', 'closed'
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO workspace.default_statuses (status_key, label, color, category, sort_order, is_default) VALUES
    ('todo',          'To Do',          '#94A3B8', 'open',        1, TRUE),
    ('in_progress',   'In Progress',    '#3B82F6', 'in_progress', 2, FALSE),
    ('in_review',     'In Review',      '#F59E0B', 'in_progress', 3, FALSE),
    ('blocked',       'Blocked',        '#EF4444', 'in_progress', 4, FALSE),
    ('done',          'Done',           '#10B981', 'closed',      5, FALSE),
    ('cancelled',     'Cancelled',      '#6B7280', 'closed',      6, FALSE)
ON CONFLICT (status_key) DO NOTHING;

-- ============================================================
-- Default priorities
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.default_priorities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    priority_level  SMALLINT NOT NULL UNIQUE,          -- 0-4
    label           VARCHAR(50) NOT NULL,
    color           VARCHAR(7) NOT NULL DEFAULT '#6B7280',
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO workspace.default_priorities (priority_level, label, color, sort_order) VALUES
    (0, 'None',    '#94A3B8', 0),
    (1, 'Low',     '#3B82F6', 1),
    (2, 'Medium',  '#F59E0B', 2),
    (3, 'High',    '#EF4444', 3),
    (4, 'Urgent',  '#DC2626', 4)
ON CONFLICT (priority_level) DO NOTHING;

-- ============================================================
-- System labels (available in every new workspace)
-- ============================================================
-- NOTE: These are templates; actual workspace labels are created
-- per-workspace via the application layer. This table stores the
-- defaults to copy from.

CREATE TABLE IF NOT EXISTS workspace.default_labels (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    color           VARCHAR(7) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO workspace.default_labels (name, color) VALUES
    ('Bug',          '#EF4444'),
    ('Feature',      '#8B5CF6'),
    ('Enhancement',  '#3B82F6'),
    ('Documentation', '#F59E0B'),
    ('Question',     '#10B981'),
    ('Duplicate',    '#6B7280'),
    ('Wontfix',      '#9CA3AF'),
    ('Help Wanted',  '#06B6D4'),
    ('Good First Issue', '#22C55E'),
    ('Performance',  '#F97316')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Default notification type definitions
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.notification_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_key        VARCHAR(100) NOT NULL UNIQUE,
    label           VARCHAR(255) NOT NULL,
    description     TEXT,
    default_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO workspace.notification_types (type_key, label, description, default_enabled) VALUES
    ('task_assigned',       'Task Assigned',        'When someone assigns you a task',              TRUE),
    ('task_completed',      'Task Completed',       'When a task you are assigned to is completed', TRUE),
    ('task_due_soon',       'Task Due Soon',        'When a task is due within 24 hours',           TRUE),
    ('comment_mention',     'Comment Mention',       'When someone @mentions you in a comment',      TRUE),
    ('comment_on_task',     'Comment on Your Task', 'When someone comments on your assigned task',   TRUE),
    ('status_change',       'Status Changed',       'When a task status changes',                   FALSE),
    ('document_edited',     'Document Edited',       'When a document you created is edited',        FALSE),
    ('workspace_invite',    'Workspace Invite',      'When someone invites you to a workspace',      TRUE),
    ('team_added',          'Added to Team',         'When you are added to a team',                 TRUE),
    ('automation_failed',   'Automation Failed',     'When an automation run fails',                 TRUE)
ON CONFLICT (type_key) DO NOTHING;

-- ============================================================
-- Default workspace plans (billing tiers)
-- ============================================================
CREATE TABLE IF NOT EXISTS workspace.plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_key            VARCHAR(50) NOT NULL UNIQUE,   -- 'free', 'pro', 'enterprise'
    name                VARCHAR(100) NOT NULL,
    max_members         INTEGER NOT NULL,
    max_spaces          INTEGER NOT NULL,
    max_storage_bytes   BIGINT NOT NULL,
    max_automations     INTEGER NOT NULL,
    max_api_calls_hour  INTEGER NOT NULL,
    ai_credits_monthly  INTEGER NOT NULL,
    price_cents_monthly INTEGER NOT NULL DEFAULT 0,
    features            JSONB DEFAULT '{}',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO workspace.plans (plan_key, name, max_members, max_spaces, max_storage_bytes, max_automations, max_api_calls_hour, ai_credits_monthly, price_cents_monthly, features) VALUES
    ('free',       'Free',       10,   5,   1073741824,    10,   100,   100,   0,      '{"custom_fields": false, "time_tracking": false, "sso": false}'),
    ('pro',        'Pro',        50,   25,  10737418240,   100,  1000,  2000,  1200,   '{"custom_fields": true,  "time_tracking": true,  "sso": false}'),
    ('enterprise', 'Enterprise', 999,  999, 107374182400,  999,  10000, 10000, 4800,   '{"custom_fields": true,  "time_tracking": true,  "sso": true}')
ON CONFLICT (plan_key) DO NOTHING;

-- ============================================================
-- Grant permissions to application role
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sprintio_app') THEN
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA auth TO sprintio_app;
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA workspace TO sprintio_app;
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA automation TO sprintio_app;
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA integration TO sprintio_app;
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA analytics TO sprintio_app;
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA timeseries TO sprintio_app;

        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO sprintio_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA workspace TO sprintio_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA automation TO sprintio_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA integration TO sprintio_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA analytics TO sprintio_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA timeseries TO sprintio_app;
    END IF;
END
$$;
```

**Verification**:

- `SELECT COUNT(*) FROM workspace.default_statuses;` → 6
- `SELECT COUNT(*) FROM workspace.default_priorities;` → 5
- `SELECT COUNT(*) FROM workspace.default_labels;` → 10
- `SELECT COUNT(*) FROM workspace.notification_types;` → 10
- `SELECT COUNT(*) FROM workspace.plans;` → 3

---

## 4. Dependency Graph

```
                    ┌──────────────┐
                    │   001: Ext   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  002: Schemas│
                    └──────┬───────┘
                           │
              ┌────────────▼────────────┐
              │  003: Users & Sessions  │
              └───┬────────────┬────────┘
                  │            │
     ┌────────────▼───┐   ┌───▼──────────────┐
     │ 004: Workspace │   │ 005: API Keys    │
     │    Core        │   │ (no workspace FK)│
     └───┬────────┬───┘   └───┬──────────────┘
         │        │           │
         │   ┌────▼───────────┘
         │   │
    ┌────▼───▼─────────────┐      ┌──────────────────┐
    │  006: Project        │      │ 010: Automation   │
    │     Structure        │      │     Schema        │
    │ (Folders→Lists→Tasks)│      └────────┬──────────┘
    └──┬─────┬──────┬──────┘               │
       │     │      │              ┌───────▼──────────┐
       │     │      │              │ 014: Deferred FKs │
       │     │      │              │ (api_keys→workspace)
       │     │      │              └──────────────────┘
  ┌────▼──┐  │  ┌───▼──────────┐
  │  007: │  │  │  008: Collab │
  │Custom │  │  │  (Comments,  │
  │Fields │  │  │  Docs, etc.) │
  │& Label│  │  └──────────────┘
  └───────┘  │
        ┌────▼──────────────┐     ┌─────────────────┐
        │  009: Notifs &    │     │ 011: Integration│
        │  Recurring Tasks  │     │    Schema        │
        └───────────────────┘     └────────┬────────┘
                                           │
                                    ┌──────▼───────┐
                                    │ 012: Analytics│
                                    └──────┬───────┘
                                           │
                                    ┌──────▼───────┐
                                    │ 013: Time-   │
                                    │   series     │
                                    └──────┬───────┘
                                           │
                   ┌───────────────────────┐│
                   │                       ││
            ┌──────▼──────────────┐  ┌─────▼▼────────────┐
            │ 015: All Indexes    │  │ (from 004,005,    │
            │ (depends on all    │  │  006-013 tables)  │
            │  tables existing)  │  └───────────────────┘
            └──────┬─────────────┘
                   │
            ┌──────▼─────────────┐
            │ 016: Triggers &    │
            │     Functions &    │
            │     Hypertables    │
            └──────┬─────────────┘
                   │
            ┌──────▼─────────────┐
            │ 017: Seed Data     │
            └────────────────────┘
```

### Critical Path

```
001 → 002 → 003 → 004 → 006 → 007/008/009 → 015 → 016 → 017
```

### Parallelizable Migrations

These groups can run in parallel since they share no sequential dependencies (only depend on common ancestors):

| Group | Migrations           | Common Ancestor         |
| ----- | -------------------- | ----------------------- |
| A     | 005 (api_keys)       | 003 (users)             |
| B     | 004 (workspace core) | 003 (users)             |
| C     | 010 (automation)     | 004 (workspace core)    |
| D     | 011 (integration)    | 004 (workspace core)    |
| E     | 012 (analytics)      | 004 (workspace core)    |
| F     | 013 (timeseries)     | 004 (workspace core)    |
| G     | 007, 008, 009        | 006 (project structure) |

After 003: run 004 and 005 in parallel
After 004: run 010, 011, 012, 013 in parallel
After 006: run 007, 008, 009 in parallel

---

## 5. Rollback Strategy

Each migration must have a corresponding rollback. Rollbacks are executed in **reverse order**.

| Migration | Rollback Strategy                                                                                                                                                                                                                                                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **017**   | `DELETE FROM workspace.plans; DELETE FROM workspace.notification_types; DELETE FROM workspace.default_labels; DELETE FROM workspace.default_priorities; DELETE FROM workspace.default_statuses; DROP TABLE IF EXISTS workspace.plans, workspace.notification_types, workspace.default_labels, workspace.default_priorities, workspace.default_statuses;` |
| **016**   | Drop all triggers, functions, continuous aggregates. Remove hypertables (requires `DROP_HYPERTABLE` or table drop + recreate). **WARNING**: TimescaleDB hypertable conversion cannot be "undone" — you must drop and recreate the table.                                                                                                                 |
| **015**   | `DROP INDEX CONCURRENTLY IF EXISTS <index_name>` for each index. Use `CONCURRENTLY` to avoid locks.                                                                                                                                                                                                                                                      |
| **014**   | `ALTER TABLE auth.api_keys DROP CONSTRAINT IF EXISTS fk_api_keys_workspace_id;`                                                                                                                                                                                                                                                                          |
| **013**   | `DROP TABLE IF EXISTS timeseries.activity_log CASCADE;`                                                                                                                                                                                                                                                                                                  |
| **012**   | `DROP TABLE IF EXISTS analytics.ai_usage CASCADE; DROP TABLE IF EXISTS analytics.ai_embeddings CASCADE;`                                                                                                                                                                                                                                                 |
| **011**   | `DROP TABLE IF EXISTS integration.connected_integrations CASCADE; DROP TABLE IF EXISTS integration.webhook_deliveries CASCADE; DROP TABLE IF EXISTS integration.webhooks CASCADE;`                                                                                                                                                                       |
| **010**   | `DROP TABLE IF EXISTS automation.automation_runs CASCADE; DROP TABLE IF EXISTS automation.automations CASCADE;`                                                                                                                                                                                                                                          |
| **009**   | `DROP TABLE IF EXISTS workspace.recurring_tasks CASCADE; DROP TABLE IF EXISTS workspace.notification_preferences CASCADE; DROP TABLE IF EXISTS workspace.notifications CASCADE;`                                                                                                                                                                         |
| **008**   | `DROP TABLE IF EXISTS workspace.saved_views CASCADE; DROP TABLE IF EXISTS workspace.attachments CASCADE; DROP TABLE IF EXISTS workspace.document_versions CASCADE; DROP TABLE IF EXISTS workspace.documents CASCADE; DROP TABLE IF EXISTS workspace.comments CASCADE;`                                                                                   |
| **007**   | `DROP TABLE IF EXISTS workspace.labels CASCADE; DROP TABLE IF EXISTS workspace.custom_field_values CASCADE; DROP TABLE IF EXISTS workspace.custom_field_definitions CASCADE;`                                                                                                                                                                            |
| **006**   | `DROP TABLE IF EXISTS workspace.task_relationships CASCADE; DROP TABLE IF EXISTS workspace.tasks CASCADE; DROP TABLE IF EXISTS workspace.lists CASCADE; DROP TABLE IF EXISTS workspace.folders CASCADE;`                                                                                                                                                 |
| **005**   | `DROP TABLE IF EXISTS auth.api_keys CASCADE;`                                                                                                                                                                                                                                                                                                            |
| **004**   | `DROP TABLE IF EXISTS workspace.spaces CASCADE; DROP TABLE IF EXISTS workspace.team_members CASCADE; DROP TABLE IF EXISTS workspace.teams CASCADE; DROP TABLE IF EXISTS workspace.memberships CASCADE; DROP TABLE IF EXISTS workspace.workspaces CASCADE;`                                                                                               |
| **003**   | `DROP TABLE IF EXISTS auth.sessions CASCADE; DROP TABLE IF EXISTS auth.user_accounts CASCADE; DROP TABLE IF EXISTS auth.users CASCADE;`                                                                                                                                                                                                                  |
| **002**   | `DROP SCHEMA IF EXISTS timeseries CASCADE; DROP SCHEMA IF EXISTS analytics CASCADE; DROP SCHEMA IF EXISTS integration CASCADE; DROP SCHEMA IF EXISTS automation CASCADE; DROP SCHEMA IF EXISTS workspace CASCADE; DROP SCHEMA IF EXISTS auth CASCADE;`                                                                                                   |
| **001**   | `DROP EXTENSION IF EXISTS timescaledb CASCADE; DROP EXTENSION IF EXISTS btree_gin CASCADE; DROP EXTENSION IF EXISTS pg_trgm CASCADE; DROP EXTENSION IF EXISTS vector CASCADE; DROP EXTENSION IF EXISTS pgcrypto CASCADE; DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;`                                                                                  |

### Rollback Rules

1. **Always rollback in reverse migration order** (017 → 001)
2. **Never rollback a single migration in isolation** if later migrations depend on it
3. **Use `CASCADE`** on all `DROP` statements to remove dependent objects
4. **TimescaleDB hypertables** require special handling — see migration 016 rollback note
5. **Backup before rollback** — `pg_dump` the database before executing any rollback
6. **Test rollback in staging first** — always validate the full rollback chain in a non-production environment

---

## 6. Estimated Timeline

| Migration | Name                   | Est. Time     | Notes                                             |
| --------- | ---------------------- | ------------- | ------------------------------------------------- |
| 001       | Extensions             | 1–2 min       | Extension download may take time on first install |
| 002       | Schemas                | < 1 min       | Simple DDL                                        |
| 003       | Users & Sessions       | 1–2 min       | 3 tables with constraints                         |
| 004       | Workspace Core         | 2–3 min       | 5 tables, self-referencing FKs                    |
| 005       | API Keys               | < 1 min       | Single table                                      |
| 006       | Project Structure      | 3–5 min       | 4 tables, complex interdependencies               |
| 007       | Custom Fields          | 1–2 min       | 3 tables                                          |
| 008       | Collaboration          | 2–4 min       | 5 tables, polymorphic FKs                         |
| 009       | Notifications          | 1–2 min       | 3 tables                                          |
| 010       | Automation             | 1–2 min       | 2 tables                                          |
| 011       | Integration            | 1–2 min       | 3 tables                                          |
| 012       | Analytics              | 1–2 min       | 2 tables, pgvector                                |
| 013       | Timeseries             | < 1 min       | 1 table                                           |
| 014       | Deferred FKs           | < 1 min       | Single ALTER TABLE                                |
| 015       | Indexes                | 3–8 min       | 50+ indexes; varies by data volume                |
| 016       | Triggers & Hypertables | 2–5 min       | Hypertable conversion, continuous aggregates      |
| 017       | Seed Data              | < 1 min       | Small INSERTs                                     |
| **Total** |                        | **25–45 min** | First run (empty database)                        |
| **Total** |                        | **35–60 min** | With data (index rebuild on large tables)         |

---

## 7. Risk Assessment

### High Risk

| Migration                        | Risk                                                                  | Impact                                             | Mitigation                                                                |
| -------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------- |
| **006** (Project Structure)      | Complex interdependencies between folders, lists, tasks with self-FKs | Application cannot function without this           | Run integration tests immediately after; verify all FK chains work        |
| **016** (Triggers & Hypertables) | TimescaleDB hypertable conversion is **irreversible**                 | Cannot undo without dropping and recreating tables | Backup before execution; test on staging with production-like data volume |
| **015** (Indexes)                | 50+ indexes on large tables can lock the database                     | Extended downtime on existing databases            | Use `CREATE INDEX CONCURRENTLY`; schedule during maintenance window       |

### Medium Risk

| Migration                | Risk                                                       | Impact                                      | Mitigation                                         |
| ------------------------ | ---------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------- |
| **004** (Workspace Core) | Central hub — most tables depend on workspaces             | Cascading failures if FKs are wrong         | Validate FK integrity with `pg_constraint` queries |
| **012** (Analytics)      | pgvector HNSW index build time scales with row count       | Slow on large embedding datasets            | Build vector index separately after data migration |
| **014** (Deferred FKs)   | Adding FK to existing data may fail if orphaned rows exist | Migration will fail on constraint violation | Pre-check script runs before ALTER TABLE           |

### Low Risk

| Migration | Risk                    | Impact                      | Mitigation                               |
| --------- | ----------------------- | --------------------------- | ---------------------------------------- |
| **001**   | Extension install fails | PostgreSQL version mismatch | Verify PG 16 + TimescaleDB compatibility |
| **002**   | Schema already exists   | Wasted time                 | `IF NOT EXISTS` handles this             |
| **017**   | Seed data conflicts     | Stale data on re-run        | `ON CONFLICT DO NOTHING` handles this    |

---

## 8. Testing Strategy

### Per-Migration Testing

For **each** migration, run these checks after execution:

```sql
-- 1. Verify tables exist
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('auth','workspace','automation','integration','analytics','timeseries')
ORDER BY table_schema, table_name;

-- 2. Verify constraints
SELECT tc.table_schema, tc.table_name, tc.constraint_name, tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema IN ('auth','workspace','automation','integration','analytics','timeseries')
ORDER BY tc.table_schema, tc.table_name;

-- 3. Verify indexes (post-015)
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname IN ('auth','workspace','automation','integration','analytics','timeseries')
ORDER BY schemaname, tablename;

-- 4. Verify triggers (post-016)
SELECT trigger_schema, event_object_table, trigger_name
FROM information_schema.triggers
WHERE trigger_schema IN ('auth','workspace','automation','integration','analytics','timeseries')
ORDER BY trigger_schema, event_object_table;

-- 5. Verify hypertables (post-016)
SELECT hypertable_schema, hypertable_name
FROM timescaledb_information.hypertables;

-- 6. Verify extensions
SELECT extname, extversion FROM pg_extension
WHERE extname IN ('uuid-ossp','pgcrypto','vector','pg_trgm','btree_gin','timescaledb');
```

### Integration Tests

After all migrations complete, run these end-to-end tests:

```sql
-- Test 1: Full entity lifecycle (create → update → delete)
-- Create a user, workspace, space, list, task, comment, and verify all FKs

-- Test 2: Self-referencing FKs
-- Create a parent folder, child folder; parent task, subtask
-- Delete parent and verify children handle correctly (SET NULL or CASCADE)

-- Test 3: Polymorphic references
-- Create attachments referencing tasks, comments, and documents
-- Verify the CHECK constraint prevents orphaned references

-- Test 4: TimescaleDB hypertable writes
-- Insert activity_log rows and verify they are chunked correctly
SELECT * FROM timescaledb_information.chunks
WHERE hypertable_name = 'activity_log';

-- Test 5: pgvector similarity search
INSERT INTO analytics.ai_embeddings (entity_type, entity_id, model, embedding, content_hash)
VALUES ('task', gen_random_uuid(), 'test-model', '[0.1, 0.2, ...]'::vector(3), 'abc123');
-- Query with cosine similarity

-- Test 6: Triggers
UPDATE auth.users SET full_name = 'Test User' WHERE email = 'test@example.com';
-- Verify updated_at changed: SELECT updated_at FROM auth.users WHERE ...;

-- Test 7: Rollback validation
-- Run full rollback (017 → 001) and verify clean state
-- Re-run all migrations and verify they succeed again (idempotency)
```

### Automated Test Script

```bash
#!/bin/bash
# run-migration-tests.sh

set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://localhost:5432/sprintio_test}"

echo "=== Sprintio Migration Test Suite ==="

# 1. Create clean test database
dropdb --if-exists sprintio_test
createdb sprintio_test

# 2. Run all migrations in order
for migration in migrations/*.sql; do
    echo "Running: $migration"
    psql "$DATABASE_URL" -f "$migration"
    if [ $? -ne 0 ]; then
        echo "FAILED: $migration"
        exit 1
    fi
done

# 3. Run verification queries
echo "=== Verification ==="
psql "$DATABASE_URL" -c "
    SELECT
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')) AS total_tables,
        (SELECT COUNT(*) FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog','information_schema')) AS total_indexes,
        (SELECT COUNT(*) FROM information_schema.triggers) AS total_triggers;
"

# 4. Run integration tests
psql "$DATABASE_URL" -f tests/integration-tests.sql

# 5. Test idempotency (re-run all migrations)
echo "=== Testing Idempotency ==="
for migration in migrations/*.sql; do
    psql "$DATABASE_URL" -f "$migration" 2>/dev/null
done

# 6. Test rollback
echo "=== Testing Rollback ==="
for rollback in rollbacks/*.sql; do
    psql "$DATABASE_URL" -f "$rollback"
done

# 7. Re-run migrations after rollback
echo "=== Re-running after rollback ==="
for migration in migrations/*.sql; do
    psql "$DATABASE_URL" -f "$migration"
done

echo "=== All tests passed ==="
```

---

## 9. Seed Data

### Summary of Seed Data

| Table                          | Rows | Purpose                                         |
| ------------------------------ | ---- | ----------------------------------------------- |
| `workspace.default_statuses`   | 6    | Template task statuses copied to new workspaces |
| `workspace.default_priorities` | 5    | Priority levels (None through Urgent)           |
| `workspace.default_labels`     | 10   | System-level labels (Bug, Feature, etc.)        |
| `workspace.notification_types` | 10   | Notification type definitions with defaults     |
| `workspace.plans`              | 3    | Billing tiers (Free, Pro, Enterprise)           |

### Default Statuses

| Key           | Label       | Color   | Category    | Default |
| ------------- | ----------- | ------- | ----------- | ------- |
| `todo`        | To Do       | #94A3B8 | open        | Yes     |
| `in_progress` | In Progress | #3B82F6 | in_progress | No      |
| `in_review`   | In Review   | #F59E0B | in_progress | No      |
| `blocked`     | Blocked     | #EF4444 | in_progress | No      |
| `done`        | Done        | #10B981 | closed      | No      |
| `cancelled`   | Cancelled   | #6B7280 | closed      | No      |

### Default Priorities

| Level | Label  | Color   |
| ----- | ------ | ------- |
| 0     | None   | #94A3B8 |
| 1     | Low    | #3B82F6 |
| 2     | Medium | #F59E0B |
| 3     | High   | #EF4444 |
| 4     | Urgent | #DC2626 |

### Default Labels

| Name             | Color   |
| ---------------- | ------- |
| Bug              | #EF4444 |
| Feature          | #8B5CF6 |
| Enhancement      | #3B82F6 |
| Documentation    | #F59E0B |
| Question         | #10B981 |
| Duplicate        | #6B7280 |
| Wontfix          | #9CA3AF |
| Help Wanted      | #06B6D4 |
| Good First Issue | #22C55E |
| Performance      | #F97316 |

### Plans

| Plan       | Members | Spaces | Storage | Automations | API Calls/hr | AI Credits/mo | Price/mo |
| ---------- | ------- | ------ | ------- | ----------- | ------------ | ------------- | -------- |
| Free       | 10      | 5      | 1 GB    | 10          | 100          | 100           | $0       |
| Pro        | 50      | 25     | 10 GB   | 100         | 1,000        | 2,000         | $12      |
| Enterprise | 999     | 999    | 100 GB  | 999         | 10,000       | 10,000        | $48      |

### Application-Layer Seeding

When a **new workspace is created**, the application should:

1. Copy all `default_statuses` → `workspace.statuses` (workspace-scoped copy)
2. Copy all `default_labels` → `workspace.labels` (workspace-scoped copy)
3. Insert workspace owner as `workspace.memberships` with role `owner`
4. Create default space: "General"
5. Create default list in that space: "Tasks"
6. Create default saved view: "My Tasks" (filter: assigned_to = current user)

---

## 10. Drizzle ORM Considerations

### Migration File Structure

```
src/
  db/
    index.ts                    # Database connection
    schema/
      auth/
        users.ts
        user-accounts.ts
        sessions.ts
        api-keys.ts
      workspace/
        workspaces.ts
        memberships.ts
        teams.ts
        ...
      automation/
        automations.ts
        automation-runs.ts
      integration/
        webhooks.ts
        webhook-deliveries.ts
        connected-integrations.ts
      analytics/
        ai-embeddings.ts
        ai-usage.ts
      timeseries/
        activity-log.ts
    migrations/
      001_enable_extensions.ts
      002_create_schemas.ts
      003_auth_users_and_sessions.ts
      004_workspace_core.ts
      005_auth_api_keys.ts
      006_project_structure.ts
      007_custom_fields_and_labels.ts
      008_collaboration.ts
      009_notifications_and_recurring.ts
      010_automation_schema.ts
      011_integration_schema.ts
      012_analytics_schema.ts
      013_timeseries_schema.ts
      014_deferred_foreign_keys.ts
      015_indexes.ts
      016_triggers_and_functions.ts
      017_seed_data.ts
```

### Schema Definition Example

```typescript
// src/db/schema/auth/users.ts
import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  passwordHash: text('password_hash'),
  fullName: varchar('full_name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  locale: varchar('locale', { length: 10 }).default('en'),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  isActive: boolean('is_active').notNull().default(true),
  isSuperadmin: boolean('is_superadmin').notNull().default(false),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### Migration File Example (Raw SQL)

```typescript
// src/db/migrations/003_auth_users_and_sessions.ts
import { sql } from 'drizzle-orm';
import type { Migration } from 'drizzle-orm/migrator';

export default {
  name: '003_auth_users_and_sessions',
  up: sql`
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(320) NOT NULL,
      ...
    );
  `,
  down: sql`
    DROP TABLE IF EXISTS auth.sessions CASCADE;
    DROP TABLE IF EXISTS auth.user_accounts CASCADE;
    DROP TABLE IF EXISTS auth.users CASCADE;
  `,
} satisfies Migration;
```

### Key Drizzle Considerations

1. **Schema prefix**: Always use `auth.`, `workspace.`, etc. prefix in Drizzle schema definitions since Drizzle doesn't natively support multi-schema out of the box. Use the `schema` option in `pgTable`:

```typescript
import { pgTable } from 'drizzle-orm/pg-core';

export const users = pgTable('users', { ... }, (table) => ({
  // This creates the table in the 'auth' schema
}), { schema: 'auth' });
```

2. **Raw SQL migrations for non-DDL operations**: Drizzle's migration system is primarily for schema changes. For TimescaleDB-specific operations (`create_hypertable`, `add_compression_policy`), use raw SQL in the migration files.

3. **Circular dependency handling**: Drizzle generates migrations from schema definitions. The `api_keys → workspaces` circular dependency requires **manual migration splitting**:
   - Migration 005: Create `api_keys` table without the FK (use raw SQL)
   - Migration 014: Add the FK constraint (use raw SQL)
   - Do NOT define the FK in the Drizzle schema until migration 014 has run

4. **Self-referencing FKs**: Drizzle supports these but the migration must create the table first, then add the self-referencing FK. Use the two-step approach:

```typescript
// In the migration file:
// Step 1: Create table with self-referencing column (no FK constraint yet)
// Step 2: ALTER TABLE ADD CONSTRAINT for self-FK
```

5. **Index creation**: Define indexes in Drizzle schema using the third argument of `pgTable`:

```typescript
export const tasks = pgTable(
  'tasks',
  {
    // columns...
  },
  (table) => ({
    listIdIdx: index('idx_tasks_list_id').on(table.listId),
    statusIdx: index('idx_tasks_status').on(table.status),
    // composite index
    listStatusPriorityIdx: index('idx_tasks_list_status_priority').on(
      table.listId,
      table.status,
      table.priority,
    ),
  }),
);
```

6. **Vector columns**: Use raw SQL type for pgvector since Drizzle doesn't natively support `vector(N)`:

```typescript
import { raw } from 'drizzle-orm';

export const aiEmbeddings = pgTable(
  'ai_embeddings',
  {
    // ...
    embedding: raw('vector(1536)'),
  },
  { schema: 'analytics' },
);
```

7. **Polymorphic references** (attachments, documents, notifications): These use `parent_type` + `parent_id` columns without foreign keys. Define them in Drizzle as plain columns:

```typescript
export const attachments = pgTable('attachments', {
  parentType: varchar('parent_type', { length: 50 }),
  parentId: uuid('parent_id'),
  // No .references() — intentional
});
```

8. **Migration runner configuration**:

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/**/*.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

9. **Migration naming convention**: Use the format `NNN_descriptive_name.ts` matching the migration order defined above. Drizzle executes migrations in alphabetical/file-order.

10. **Idempotency in Drizzle**: Drizzle tracks which migrations have run in a `__drizzle_migrations` table. Each migration runs exactly once. For safety, use `IF NOT EXISTS` / `IF EXISTS` in all DDL statements within migrations.

---

## Appendix: Complete Table Reference

| #   | Schema      | Table                    | Created In | Dependencies                                     | FKs                                                                          |
| --- | ----------- | ------------------------ | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1   | auth        | users                    | 003        | extensions                                       | —                                                                            |
| 2   | auth        | user_accounts            | 003        | users                                            | user_id → users(id)                                                          |
| 3   | auth        | sessions                 | 003        | users                                            | user_id → users(id)                                                          |
| 4   | auth        | api_keys                 | 005        | users                                            | user_id → users(id); workspace_id → workspaces(id) [deferred to 014]         |
| 5   | workspace   | workspaces               | 004        | users                                            | owner_id → users(id)                                                         |
| 6   | workspace   | memberships              | 004        | workspaces, users                                | workspace_id → workspaces(id); user_id → users(id)                           |
| 7   | workspace   | teams                    | 004        | workspaces                                       | workspace_id → workspaces(id); parent_team_id → teams(id)                    |
| 8   | workspace   | team_members             | 004        | teams, users                                     | team_id → teams(id); user_id → users(id)                                     |
| 9   | workspace   | spaces                   | 004        | workspaces, users                                | workspace_id → workspaces(id); created_by → users(id)                        |
| 10  | workspace   | folders                  | 006        | spaces                                           | space_id → spaces(id); parent_folder_id → folders(id)                        |
| 11  | workspace   | lists                    | 006        | spaces, folders, users                           | space_id → spaces(id); folder_id → folders(id); created_by → users(id)       |
| 12  | workspace   | tasks                    | 006        | lists, users                                     | list_id → lists(id); parent_task_id → tasks(id); created_by → users(id)      |
| 13  | workspace   | task_relationships       | 006        | tasks                                            | source_task_id → tasks(id); target_task_id → tasks(id)                       |
| 14  | workspace   | custom_field_definitions | 007        | spaces                                           | space_id → spaces(id)                                                        |
| 15  | workspace   | custom_field_values      | 007        | tasks, custom_field_definitions                  | task_id → tasks(id); field_definition_id → custom_field_definitions(id)      |
| 16  | workspace   | labels                   | 007        | workspaces                                       | workspace_id → workspaces(id)                                                |
| 17  | workspace   | comments                 | 008        | tasks, users                                     | task_id → tasks(id); parent_comment_id → comments(id); author_id → users(id) |
| 18  | workspace   | documents                | 008        | workspaces, spaces, folders, lists, tasks, users | workspace_id → workspaces(id); + 4 optional FKs                              |
| 19  | workspace   | document_versions        | 008        | documents, users                                 | document_id → documents(id); created_by → users(id)                          |
| 20  | workspace   | attachments              | 008        | users                                            | uploaded_by → users(id); polymorphic parent (no FK)                          |
| 21  | workspace   | saved_views              | 008        | lists, users                                     | list_id → lists(id); user_id → users(id)                                     |
| 22  | workspace   | notifications            | 009        | users, workspaces                                | user_id → users(id); workspace_id → workspaces(id); actor_id → users(id)     |
| 23  | workspace   | notification_preferences | 009        | users                                            | user_id → users(id)                                                          |
| 24  | workspace   | recurring_tasks          | 009        | tasks, workspaces                                | task_id → tasks(id); workspace_id → workspaces(id)                           |
| 25  | automation  | automations              | 010        | workspaces, users                                | workspace_id → workspaces(id); created_by → users(id)                        |
| 26  | automation  | automation_runs          | 010        | automations                                      | automation_id → automations(id)                                              |
| 27  | integration | webhooks                 | 011        | workspaces, users                                | workspace_id → workspaces(id); created_by → users(id)                        |
| 28  | integration | webhook_deliveries       | 011        | webhooks                                         | webhook_id → webhooks(id)                                                    |
| 29  | integration | connected_integrations   | 011        | workspaces, users                                | workspace_id → workspaces(id); created_by → users(id)                        |
| 30  | analytics   | ai_embeddings            | 012        | —                                                | polymorphic (no FK)                                                          |
| 31  | analytics   | ai_usage                 | 012        | users, workspaces                                | user_id → users(id); workspace_id → workspaces(id)                           |
| 32  | timeseries  | activity_log             | 013        | users, workspaces                                | user_id → users(id); workspace_id → workspaces(id)                           |
| —   | workspace   | default_statuses         | 017        | —                                                | seed data                                                                    |
| —   | workspace   | default_priorities       | 017        | —                                                | seed data                                                                    |
| —   | workspace   | default_labels           | 017        | —                                                | seed data                                                                    |
| —   | workspace   | notification_types       | 017        | —                                                | seed data                                                                    |
| —   | workspace   | plans                    | 017        | —                                                | seed data                                                                    |

---

_This migration plan was generated for Sprintio v1.0.0. Review and adjust before production deployment._
