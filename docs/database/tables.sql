-- =============================================================================
-- Sprintio — Complete Database DDL
-- PostgreSQL 16 + TimescaleDB + pgvector
-- =============================================================================
-- This file defines the full schema for the Sprintio collaborative work
-- management platform. It covers six PostgreSQL schemas:
--
--   auth        — Authentication, identity, sessions, API keys
--   workspace   — Core business logic (workspaces, tasks, documents)
--   automation  — Workflow automation engine
--   integration — Webhooks, third-party integrations
--   analytics   — AI embeddings, usage tracking
--   timeseries  — Activity log hypertable (TimescaleDB)
--
-- Run order: extensions → schemas → tables → foreign keys → comments → indexes
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "timescaledb";


-- =============================================================================
-- 2. SCHEMAS
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS workspace;
CREATE SCHEMA IF NOT EXISTS automation;
CREATE SCHEMA IF NOT EXISTS integration;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS timeseries;


-- =============================================================================
-- 3. SCHEMA: auth — Authentication & Identity
-- =============================================================================

-- -----------------------------------------------------------------------------
-- auth.users
-- Core user record. Every platform participant has exactly one row here.
-- The password_hash is nullable to support OAuth-only users.
-- -----------------------------------------------------------------------------
CREATE TABLE auth.users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT        UNIQUE NOT NULL,
    name          TEXT        NOT NULL,
    avatar_url    TEXT,
    password_hash TEXT,
    locale        TEXT        NOT NULL DEFAULT 'en',
    timezone      TEXT        NOT NULL DEFAULT 'UTC',
    is_active     BOOLEAN     NOT NULL DEFAULT true,
    mfa_enabled   BOOLEAN     NOT NULL DEFAULT false,
    mfa_secret    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  auth.users IS 'Core user record — one row per platform participant.';
COMMENT ON COLUMN auth.users.email IS 'Unique login email address.';
COMMENT ON COLUMN auth.users.password_hash IS 'Bcrypt/argon2 hash; NULL for OAuth-only users.';
COMMENT ON COLUMN auth.users.locale IS 'BCP-47 locale code, e.g. en, fr, ja.';
COMMENT ON COLUMN auth.users.mfa_enabled IS 'Whether multi-factor authentication is active.';
COMMENT ON COLUMN auth.users.mfa_secret IS 'TOTP shared secret (base-32 encoded).';

-- -----------------------------------------------------------------------------
-- auth.user_accounts
-- Links a user to one or more OAuth provider identities (Google, GitHub, etc.).
-- A single user may have multiple provider bindings.
-- -----------------------------------------------------------------------------
CREATE TABLE auth.user_accounts (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL,
    provider      TEXT        NOT NULL,
    provider_uid  TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_user_accounts_identity UNIQUE (user_id, provider, provider_uid)
);

COMMENT ON TABLE  auth.user_accounts IS 'OAuth provider bindings — links users to Google/GitHub identities.';
COMMENT ON COLUMN auth.user_accounts.provider IS 'OAuth provider slug, e.g. google, github.';
COMMENT ON COLUMN auth.user_accounts.provider_uid IS 'Provider-unique user identifier (sub claim).';

-- -----------------------------------------------------------------------------
-- auth.sessions
-- Active and revoked login sessions. The token_hash stores a SHA-256 digest
-- of the session token — the raw token is only sent to the client once.
-- -----------------------------------------------------------------------------
CREATE TABLE auth.sessions (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL,
    token_hash    TEXT        NOT NULL,
    device_name   TEXT,
    user_agent    TEXT,
    ip_address    INET,
    expires_at    TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at    TIMESTAMPTZ
);

COMMENT ON TABLE  auth.sessions IS 'Login sessions — stores hashed tokens, device info, and expiry.';
COMMENT ON COLUMN auth.sessions.token_hash IS 'SHA-256 hash of the bearer session token.';
COMMENT ON COLUMN auth.sessions.revoked_at IS 'Timestamp when the session was revoked; NULL if still active.';

-- -----------------------------------------------------------------------------
-- auth.api_keys
-- Workspace-scoped API keys for programmatic access (CI/CD, integrations).
-- Keys are shown once at creation; only the hash is stored.
-- -----------------------------------------------------------------------------
CREATE TABLE auth.api_keys (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  UUID        NOT NULL,
    user_id       UUID        NOT NULL,
    name          TEXT        NOT NULL,
    key_prefix    TEXT        NOT NULL,
    key_hash      TEXT        NOT NULL,
    scopes        TEXT[]      NOT NULL DEFAULT '{}',
    last_used_at  TIMESTAMPTZ,
    expires_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  auth.api_keys IS 'Workspace-scoped API keys for programmatic / CI / integration access.';
COMMENT ON COLUMN auth.api_keys.key_prefix IS 'First 8 characters of the key for visual identification.';
COMMENT ON COLUMN auth.api_keys.key_hash IS 'SHA-256 hash of the full secret key.';
COMMENT ON COLUMN auth.api_keys.scopes IS 'Array of allowed permission scopes, e.g. tasks:read, docs:write.';


-- =============================================================================
-- 4. SCHEMA: workspace — Core Business Logic
-- =============================================================================

-- -----------------------------------------------------------------------------
-- workspace.workspaces
-- Top-level tenant container. All entities (tasks, docs, etc.) belong to a
-- workspace. The slug is URL-safe and unique across the platform.
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.workspaces (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT        NOT NULL,
    slug          TEXT        UNIQUE NOT NULL,
    owner_id      UUID        NOT NULL,
    plan          TEXT        NOT NULL DEFAULT 'free'
                  CHECK (plan IN ('free', 'team', 'enterprise')),
    max_members   INT         NOT NULL DEFAULT 10,
    settings      JSONB       NOT NULL DEFAULT '{}',
    logo_url      TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  workspace.workspaces IS 'Top-level tenant — all entities are scoped to a workspace.';
COMMENT ON COLUMN workspace.workspaces.slug IS 'URL-safe unique identifier, e.g. acme-corp.';
COMMENT ON COLUMN workspace.workspaces.plan IS 'Billing plan tier.';
COMMENT ON COLUMN workspace.workspaces.max_members IS 'Seat cap enforced by the billing plan.';
COMMENT ON COLUMN workspace.workspaces.settings IS 'Workspace-level JSON preferences (notifications, features, etc.).';

-- -----------------------------------------------------------------------------
-- workspace.memberships
-- Maps users to workspaces with a role. The composite unique constraint on
-- (workspace_id, user_id) prevents duplicate memberships.
-- guest_scopes limits what a guest-role member can see/do.
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.memberships (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  UUID        NOT NULL,
    user_id       UUID        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'member'
                  CHECK (role IN ('owner', 'admin', 'member', 'guest', 'viewer')),
    status        TEXT        NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'invited', 'suspended')),
    guest_scopes  JSONB,
    invited_by    UUID,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_memberships_workspace_user UNIQUE (workspace_id, user_id)
);

COMMENT ON TABLE  workspace.memberships IS 'User-to-workspace mapping with role-based access control.';
COMMENT ON COLUMN workspace.memberships.role IS 'RBAC role: owner > admin > member > guest > viewer.';
COMMENT ON COLUMN workspace.memberships.status IS 'Lifecycle status: active, pending invite, or suspended.';
COMMENT ON COLUMN workspace.memberships.guest_scopes IS 'JSON document restricting a guest member\'s visible spaces/lists.';
COMMENT ON COLUMN workspace.memberships.invited_by IS 'User who sent the invitation (NULL for the owner).';

-- -----------------------------------------------------------------------------
-- workspace.teams
-- Named groups of members within a workspace. Teams can be nested via the
-- parent_team_id self-referential foreign key (e.g. Engineering → Frontend).
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.teams (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID        NOT NULL,
    name            TEXT        NOT NULL,
    description     TEXT,
    parent_team_id  UUID,
    color           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  workspace.teams IS 'Named member groups within a workspace; supports nesting.';
COMMENT ON COLUMN workspace.teams.parent_team_id IS 'Parent team for hierarchical organisation (NULL = top-level).';

-- -----------------------------------------------------------------------------
-- workspace.team_members
-- Many-to-many join between teams and users.
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.team_members (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id     UUID        NOT NULL,
    user_id     UUID        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_team_members_team_user UNIQUE (team_id, user_id)
);

COMMENT ON TABLE workspace.team_members IS 'Join table: which users belong to which teams.';

-- -----------------------------------------------------------------------------
-- workspace.spaces
-- A space is a high-level organisational container inside a workspace (think
-- "Marketing", "Engineering"). Each space owns folders, lists, and tasks.
-- statuses is a JSONB array defining the status workflow for the space.
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.spaces (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID       NOT NULL,
    name        TEXT        NOT NULL,
    description TEXT,
    icon        TEXT,
    color       TEXT,
    statuses    JSONB       NOT NULL DEFAULT '[
        {"name":"Todo","color":"gray"},
        {"name":"In Progress","color":"blue"},
        {"name":"Done","color":"green"}
    ]',
    sort_order  INT         NOT NULL DEFAULT 0,
    is_archived BOOLEAN     NOT NULL DEFAULT false,
    created_by  UUID        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  workspace.spaces IS 'High-level organisational container (e.g. Marketing, Engineering).';
COMMENT ON COLUMN workspace.spaces.statuses IS 'Ordered array of {name, color} status definitions for tasks in this space.';
COMMENT ON COLUMN workspace.spaces.is_archived IS 'Archived spaces are hidden from the UI but preserved in data.';

-- -----------------------------------------------------------------------------
-- workspace.folders
-- Optional nested folders inside a space, used to group lists. The path
-- column stores a materialised slash-delimited ancestor chain for efficient
-- subtree queries (e.g. "/design/brand/2025").
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.folders (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id    UUID        NOT NULL,
    parent_id   UUID,
    name        TEXT        NOT NULL,
    path        TEXT,
    depth       INT         NOT NULL DEFAULT 0,
    sort_order  INT         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  workspace.folders IS 'Nested folders inside a space for grouping lists.';
COMMENT ON COLUMN workspace.folders.path IS 'Materialised path, e.g. /design/brand — used for subtree queries.';
COMMENT ON COLUMN workspace.folders.depth IS 'Nesting depth (0 = root folder).';

-- -----------------------------------------------------------------------------
-- workspace.lists
-- A list is an ordered collection of tasks within a space (optionally inside
-- a folder). default_view controls the initial UI presentation.
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.lists (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id     UUID        NOT NULL,
    folder_id    UUID,
    name         TEXT        NOT NULL,
    description  TEXT,
    icon         TEXT,
    default_view TEXT        NOT NULL DEFAULT 'board'
                 CHECK (default_view IN ('board', 'list', 'table')),
    view_config  JSONB       NOT NULL DEFAULT '{}',
    sort_order   INT         NOT NULL DEFAULT 0,
    is_archived  BOOLEAN     NOT NULL DEFAULT false,
    created_by   UUID        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  workspace.lists IS 'Ordered collection of tasks; belongs to a space and optionally a folder.';
COMMENT ON COLUMN workspace.lists.default_view IS 'Default UI view: board (kanban), list, or table.';
COMMENT ON COLUMN workspace.lists.view_config IS 'Per-list view preferences (column widths, group-by, etc.).';

-- -----------------------------------------------------------------------------
-- workspace.tasks
-- The central entity of the platform. Each task belongs to exactly one list
-- and is identified by a per-list sequential number for human-friendly IDs
-- (e.g. "PROJ-42"). description stores rich-text (Tiptap/ProseMirror JSONB).
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.tasks (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id         UUID          NOT NULL,
    number          INT           NOT NULL,
    title           TEXT          NOT NULL,
    description     JSONB         NOT NULL DEFAULT '{}',
    status          TEXT          NOT NULL DEFAULT 'Todo',
    priority        TEXT          NOT NULL DEFAULT 'none'
                    CHECK (priority IN ('urgent', 'high', 'medium', 'low', 'none')),
    labels          TEXT[]        NOT NULL DEFAULT '{}',
    parent_id       UUID,
    assignee_id     UUID,
    created_by      UUID          NOT NULL,
    due_date        TIMESTAMPTZ,
    start_date      TIMESTAMPTZ,
    estimated_hours DECIMAL(8,2),
    actual_hours    DECIMAL(8,2),
    custom_fields   JSONB         NOT NULL DEFAULT '{}',
    sort_order      INT           NOT NULL DEFAULT 0,
    is_archived     BOOLEAN       NOT NULL DEFAULT false,
    is_completed    BOOLEAN       NOT NULL DEFAULT false,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT uq_tasks_list_number UNIQUE (list_id, number)
);

COMMENT ON TABLE  workspace.tasks IS 'Core work item — tasks are scoped to a list and carry a per-list number.';
COMMENT ON COLUMN workspace.tasks.number IS 'Per-list sequential task number, displayed as e.g. "PROJ-42".';
COMMENT ON COLUMN workspace.tasks.description IS 'Rich-text body stored as Tiptap / ProseMirror JSONB.';
COMMENT ON COLUMN workspace.tasks.labels IS 'Flat text labels attached to the task (denormalised for fast filtering).';
COMMENT ON COLUMN workspace.tasks.parent_id IS 'Parent task for sub-task / check-list relationships.';
COMMENT ON COLUMN workspace.tasks.custom_fields IS 'Key/value store for space-level custom field values.';
COMMENT ON COLUMN workspace.tasks.sort_order IS 'Board/list ordering position within the task\'s status column.';
COMMENT ON COLUMN workspace.tasks.is_completed IS 'Denormalised completion flag (kept in sync via trigger/app).';

-- -----------------------------------------------------------------------------
-- workspace.task_relationships
-- Typed links between tasks (blockers, duplicates, related). Each directed
-- pair + type must be unique.
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.task_relationships (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    source_task_id    UUID        NOT NULL,
    target_task_id    UUID        NOT NULL,
    relationship_type TEXT        NOT NULL
                      CHECK (relationship_type IN ('blocked_by', 'blocks', 'related', 'duplicate')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_task_relationships UNIQUE (source_task_id, target_task_id, relationship_type)
);

COMMENT ON TABLE  workspace.task_relationships IS 'Typed directional links between tasks (blockers, duplicates, etc.).';

-- -----------------------------------------------------------------------------
-- workspace.custom_field_definitions
-- Defines a custom field that applies to all tasks within a space. The config
-- JSONB holds type-specific options (e.g. select choices, min/max for numbers).
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.custom_field_definitions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id    UUID        NOT NULL,
    name        TEXT        NOT NULL,
    field_type  TEXT        NOT NULL
                CHECK (field_type IN (
                    'text', 'number', 'date', 'select', 'multi_select',
                    'checkbox', 'url', 'email', 'person', 'duration',
                    'formula', 'rollup'
                )),
    config      JSONB       NOT NULL DEFAULT '{}',
    sort_order  INT         NOT NULL DEFAULT 0,
    is_required BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  workspace.custom_field_definitions IS 'Schema definitions for space-level custom fields on tasks.';
COMMENT ON COLUMN workspace.custom_field_definitions.config IS 'Type-specific options (choices, regex, formula, etc.) in JSONB.';

-- -----------------------------------------------------------------------------
-- workspace.custom_field_values
-- Stores actual values for a custom field on a specific task. Different
-- columns are populated depending on the field_type, with a JSON fallback.
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.custom_field_values (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id       UUID        NOT NULL,
    field_def_id  UUID        NOT NULL,
    value_text    TEXT,
    value_number  DECIMAL,
    value_boolean BOOLEAN,
    value_date    TIMESTAMPTZ,
    value_select  TEXT,
    value_json    JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_cf_values_task_field UNIQUE (task_id, field_def_id)
);

COMMENT ON TABLE  workspace.custom_field_values IS 'Populated values for a custom field on a specific task.';
COMMENT ON COLUMN workspace.custom_field_values.value_json IS 'Fallback JSONB column for complex/multi-type values.';

-- -----------------------------------------------------------------------------
-- workspace.labels
-- Workspace-level reusable labels (tags) that can be applied to tasks.
-- Scoped by a unique (workspace_id, name) constraint.
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.labels (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  UUID        NOT NULL,
    name          TEXT        NOT NULL,
    color         TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_labels_workspace_name UNIQUE (workspace_id, name)
);

COMMENT ON TABLE workspace.labels IS 'Reusable workspace-scoped labels (tags) applied to tasks.';

-- -----------------------------------------------------------------------------
-- workspace.comments
-- Threaded comments on tasks. parent_id enables nested replies. reactions
-- is a JSONB map of emoji → user_id arrays.
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.comments (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id       UUID        NOT NULL,
    parent_id     UUID,
    body          JSONB       NOT NULL DEFAULT '{}',
    author_id     UUID        NOT NULL,
    reactions     JSONB       NOT NULL DEFAULT '{}',
    is_resolved   BOOLEAN     NOT NULL DEFAULT false,
    resolved_by   UUID,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  workspace.comments IS 'Threaded, rich-text comments on tasks.';
COMMENT ON COLUMN workspace.comments.body IS 'Comment body stored as Tiptap / ProseMirror JSONB.';
COMMENT ON COLUMN workspace.comments.reactions IS 'Emoji reactions map, e.g. {"👍":["user-uuid"], "🎉":["uuid1","uuid2"]}.';
COMMENT ON COLUMN workspace.comments.is_resolved IS 'Resolved comments are collapsed by default in the UI.';

-- -----------------------------------------------------------------------------
-- workspace.documents
-- Rich-text documents (wiki pages, specs, notes) scoped to a workspace and
-- optionally linked to a space, folder, list, or task. yjs_state holds the
-- Yjs collaborative editing binary state vector.
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.documents (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  UUID        NOT NULL,
    space_id      UUID,
    folder_id     UUID,
    list_id       UUID,
    task_id       UUID,
    title         TEXT        NOT NULL,
    content       JSONB       NOT NULL DEFAULT '{}',
    yjs_state     BYTEA,
    search_vector tsvector,
    permissions   JSONB       NOT NULL DEFAULT '{"public":false}',
    created_by    UUID        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  workspace.documents IS 'Rich-text documents (wiki pages, specs, notes) with real-time collaboration.';
COMMENT ON COLUMN workspace.documents.yjs_state IS 'Binary Yjs state vector for collaborative editing.';
COMMENT ON COLUMN workspace.documents.search_vector IS 'Auto-updated tsvector for full-text search.';
COMMENT ON COLUMN workspace.documents.permissions IS 'Access control: {"public":false,"allowedUsers":[],"allowedTeams":[]}';

-- -----------------------------------------------------------------------------
-- workspace.document_versions
-- Immutable version history for documents. Each edit creates a new row;
-- older versions are never modified (append-only log).
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.document_versions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID        NOT NULL,
    version_number  INT         NOT NULL,
    title           TEXT,
    content         JSONB,
    author_id       UUID        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  workspace.document_versions IS 'Immutable version history (append-only log) for documents.';
COMMENT ON COLUMN workspace.document_versions.version_number IS 'Monotonically increasing version number per document.';

-- -----------------------------------------------------------------------------
-- workspace.attachments
-- File attachments for tasks, comments, or documents. Files are stored in
-- an object store (S3 / R2) referenced by storage_key. entity_type + entity_id
-- is a polymorphic foreign key (no DB-level FK constraint for flexibility).
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.attachments (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type       TEXT        NOT NULL
                      CHECK (entity_type IN ('task', 'comment', 'document')),
    entity_id         UUID        NOT NULL,
    filename          TEXT        NOT NULL,
    original_filename TEXT        NOT NULL,
    storage_key       TEXT        NOT NULL,
    mime_type         TEXT,
    size_bytes        BIGINT,
    thumbnail_key     TEXT,
    uploaded_by       UUID        NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  workspace.attachments IS 'File attachments for tasks, comments, or documents (polymorphic).';
COMMENT ON COLUMN workspace.attachments.entity_type IS 'Polymorphic discriminator: task, comment, or document.';
COMMENT ON COLUMN workspace.attachments.storage_key IS 'Object-store key (S3/R2 path) for the stored file.';
COMMENT ON COLUMN workspace.attachments.thumbnail_key IS 'Object-store key for a generated thumbnail image.';
COMMENT ON COLUMN workspace.attachments.size_bytes IS 'File size in bytes.';

-- -----------------------------------------------------------------------------
-- workspace.saved_views
-- User-customised view configurations saved for a specific list. Visibility
-- controls whether other workspace members can see the saved view.
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.saved_views (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id       UUID        NOT NULL,
    user_id       UUID        NOT NULL,
    name          TEXT        NOT NULL,
    view_type     TEXT        NOT NULL DEFAULT 'board',
    config        JSONB       NOT NULL DEFAULT '{}',
    visibility    TEXT        NOT NULL DEFAULT 'private'
                  CHECK (visibility IN ('private', 'workspace')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  workspace.saved_views IS 'User-saved view configurations for a specific list.';
COMMENT ON COLUMN workspace.saved_views.config IS 'Serialised filters, groupings, and sort preferences in JSONB.';
COMMENT ON COLUMN workspace.saved_views.visibility IS 'private = author only; workspace = visible to all members.';

-- -----------------------------------------------------------------------------
-- workspace.notifications
-- In-app notification inbox for users. Polymorphic entity reference via
-- entity_type + entity_id. actor_id records who triggered the event.
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.notifications (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL,
    workspace_id  UUID        NOT NULL,
    type          TEXT        NOT NULL,
    title         TEXT        NOT NULL,
    message       TEXT,
    entity_type   TEXT,
    entity_id     UUID,
    actor_id      UUID,
    is_read       BOOLEAN     NOT NULL DEFAULT false,
    read_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  workspace.notifications IS 'In-app notification inbox for users.';
COMMENT ON COLUMN workspace.notifications.type IS 'Notification category, e.g. task_assigned, comment_mention.';
COMMENT ON COLUMN workspace.notifications.actor_id IS 'User who triggered the notification (NULL for system events).';

-- -----------------------------------------------------------------------------
-- workspace.notification_preferences
-- Per-user, per-event-type notification delivery preferences.
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.notification_preferences (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,
    event_type  TEXT        NOT NULL,
    in_app      BOOLEAN     NOT NULL DEFAULT true,
    email       BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_notif_prefs_user_event UNIQUE (user_id, event_type)
);

COMMENT ON TABLE  workspace.notification_preferences IS 'Per-user delivery preferences for each notification event type.';

-- -----------------------------------------------------------------------------
-- workspace.recurring_tasks
-- Schedules automatic creation of task copies based on a cron expression.
-- next_run_at is recalculated after each execution.
-- -----------------------------------------------------------------------------
CREATE TABLE workspace.recurring_tasks (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    source_task_id  UUID        NOT NULL,
    workspace_id    UUID        NOT NULL,
    cron_expression TEXT        NOT NULL,
    timezone        TEXT        NOT NULL DEFAULT 'UTC',
    next_run_at     TIMESTAMPTZ,
    last_run_at     TIMESTAMPTZ,
    is_active       BOOLEAN     NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  workspace.recurring_tasks IS 'Cron-based scheduling for automatic recurring task creation.';
COMMENT ON COLUMN workspace.recurring_tasks.cron_expression IS 'Standard 5-field cron expression (minute hour dom month dow).';
COMMENT ON COLUMN workspace.recurring_tasks.source_task_id IS 'Template task that gets cloned on each scheduled run.';


-- =============================================================================
-- 5. SCHEMA: automation — Workflow Automation
-- =============================================================================

-- -----------------------------------------------------------------------------
-- automation.automations
-- A named automation rule scoped to a workspace. The flow JSONB describes
-- a DAG of trigger → condition → action nodes (executed by the app layer).
-- -----------------------------------------------------------------------------
CREATE TABLE automation.automations (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id   UUID        NOT NULL,
    name           TEXT        NOT NULL,
    description    TEXT,
    flow           JSONB       NOT NULL,
    is_enabled     BOOLEAN     NOT NULL DEFAULT true,
    trigger_count  INT         NOT NULL DEFAULT 0,
    created_by     UUID        NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  automation.automations IS 'Named workflow automation rule (trigger → condition → action DAG).';
COMMENT ON COLUMN automation.automations.flow IS 'JSONB DAG describing triggers, conditions, and actions.';
COMMENT ON COLUMN automation.automations.trigger_count IS 'Denormalised counter of total invocations (for analytics).';

-- -----------------------------------------------------------------------------
-- automation.automation_runs
-- Execution log for each automation run. Stores per-step results and error
-- details for debugging and audit.
-- -----------------------------------------------------------------------------
CREATE TABLE automation.automation_runs (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id  UUID        NOT NULL,
    status         TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled')),
    trigger_event  JSONB,
    step_results   JSONB,
    error_message  TEXT,
    duration_ms    INT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  automation.automation_runs IS 'Execution log for each automation invocation.';
COMMENT ON COLUMN automation.automation_runs.trigger_event IS 'The event payload that triggered this run.';
COMMENT ON COLUMN automation.automation_runs.step_results IS 'Per-step execution results (JSONB array).';


-- =============================================================================
-- 6. SCHEMA: integration — Webhooks & Third-Party Integrations
-- =============================================================================

-- -----------------------------------------------------------------------------
-- integration.webhooks
-- Outbound HTTP webhooks that fire when specific events occur in the
-- workspace. Each webhook has a signing secret for payload verification.
-- -----------------------------------------------------------------------------
CREATE TABLE integration.webhooks (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  UUID        NOT NULL,
    name          TEXT        NOT NULL,
    url           TEXT        NOT NULL,
    secret        TEXT        NOT NULL,
    events        TEXT[]      NOT NULL,
    is_active     BOOLEAN     NOT NULL DEFAULT true,
    retry_policy  JSONB       NOT NULL DEFAULT '{"maxRetries":3,"backoffMs":1000}',
    created_by    UUID        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  integration.webhooks IS 'Outbound HTTP webhooks fired on workspace events.';
COMMENT ON COLUMN integration.webhooks.secret IS 'HMAC signing secret for payload verification by the receiver.';
COMMENT ON COLUMN integration.webhooks.events IS 'Array of event types this webhook subscribes to.';
COMMENT ON COLUMN integration.webhooks.retry_policy IS 'Retry configuration: {"maxRetries":3,"backoffMs":1000}.';

-- -----------------------------------------------------------------------------
-- integration.webhook_deliveries
-- Delivery log for every webhook attempt. Tracks status, HTTP response, and
-- error details for debugging and retry logic.
-- -----------------------------------------------------------------------------
CREATE TABLE integration.webhook_deliveries (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id      UUID        NOT NULL,
    event_type      TEXT        NOT NULL,
    payload         JSONB       NOT NULL,
    status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'delivered', 'failed')),
    attempt         INT         NOT NULL DEFAULT 0,
    response_status INT,
    response_body   TEXT,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered_at    TIMESTAMPTZ
);

COMMENT ON TABLE  integration.webhook_deliveries IS 'Delivery log per webhook attempt — tracks HTTP responses and errors.';
COMMENT ON COLUMN integration.webhook_deliveries.attempt IS 'Attempt number (1-based); incremented on each retry.';
COMMENT ON COLUMN integration.webhook_deliveries.delivered_at IS 'Timestamp of successful delivery (NULL if failed/pending).';

-- -----------------------------------------------------------------------------
-- integration.connected_integrations
-- OAuth-connected third-party services (GitHub, GitLab, Slack) linked to a
-- workspace. Tokens are encrypted at rest by the application layer.
-- -----------------------------------------------------------------------------
CREATE TABLE integration.connected_integrations (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id      UUID        NOT NULL,
    provider          TEXT        NOT NULL
                      CHECK (provider IN ('github', 'gitlab', 'slack')),
    access_token      TEXT,
    refresh_token     TEXT,
    provider_user_id  TEXT,
    provider_username TEXT,
    sync_config       JSONB       NOT NULL DEFAULT '{}',
    connected_by      UUID        NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  integration.connected_integrations IS 'OAuth-connected third-party services (GitHub, GitLab, Slack).';
COMMENT ON COLUMN integration.connected_integrations.access_token IS 'Encrypted OAuth access token (decrypted at app layer).';
COMMENT ON COLUMN integration.connected_integrations.sync_config IS 'Provider-specific sync preferences (repos to track, channels, etc.).';


-- =============================================================================
-- 7. SCHEMA: analytics — AI Embeddings & Usage Tracking
-- =============================================================================

-- -----------------------------------------------------------------------------
-- analytics.ai_embeddings
-- Vector embeddings for semantic search. Each row stores a chunk of text
-- alongside its 1536-dimensional vector (OpenAI text-embedding-3-small).
-- A HNSW index is created below for fast approximate nearest-neighbour queries.
-- -----------------------------------------------------------------------------
CREATE TABLE analytics.ai_embeddings (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type   TEXT          NOT NULL,
    entity_id     UUID          NOT NULL,
    embedding     vector(1536),
    chunk_text    TEXT          NOT NULL,
    chunk_index   INT           NOT NULL DEFAULT 0,
    model_name    TEXT          NOT NULL DEFAULT 'text-embedding-3-small',
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  analytics.ai_embeddings IS 'Vector embeddings for semantic search over tasks, documents, etc.';
COMMENT ON COLUMN analytics.ai_embeddings.embedding IS '1536-dim vector from text-embedding-3-small; queried via HNSW index.';
COMMENT ON COLUMN analytics.ai_embeddings.chunk_text IS 'Original text chunk that was embedded.';
COMMENT ON COLUMN analytics.ai_embeddings.entity_type IS 'Polymorphic entity type the embedding belongs to.';
COMMENT ON COLUMN analytics.ai_embeddings.model_name IS 'Embedding model identifier for versioning and migration.';

-- -----------------------------------------------------------------------------
-- analytics.ai_usage
-- Tracks AI/LLM API consumption per user and workspace. Used for billing,
-- rate-limiting, and cost reporting.
-- -----------------------------------------------------------------------------
CREATE TABLE analytics.ai_usage (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID,
    workspace_id  UUID,
    operation     TEXT          NOT NULL,
    model         TEXT          NOT NULL,
    input_tokens  INT           NOT NULL DEFAULT 0,
    output_tokens INT           NOT NULL DEFAULT 0,
    credits_used  DECIMAL(10,4) NOT NULL DEFAULT 0,
    cost_usd      DECIMAL(10,6) NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  analytics.ai_usage IS 'AI / LLM API consumption log for billing and cost reporting.';
COMMENT ON COLUMN analytics.ai_usage.operation IS 'Operation type: embedding, completion, chat, summarise, etc.';
COMMENT ON COLUMN analytics.ai_usage.credits_used IS 'Platform credits consumed by this API call.';
COMMENT ON COLUMN analytics.ai_usage.cost_usd IS 'Actual USD cost at provider rates (for reconciliation).';


-- =============================================================================
-- 8. SCHEMA: timeseries — Activity Log (TimescaleDB Hypertable)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- timeseries.activity_log
-- Append-only audit trail of every meaningful action across the platform.
-- This table is converted into a TimescaleDB hypertable after creation for
-- efficient time-range queries and compression.
-- Uses BIGSERIAL instead of UUID to keep the primary key compact for the
-- hypertable partitioning key.
-- -----------------------------------------------------------------------------
CREATE TABLE timeseries.activity_log (
    id            BIGSERIAL     NOT NULL,
    actor_id      UUID,
    workspace_id  UUID          NOT NULL,
    action        TEXT          NOT NULL,
    entity_type   TEXT          NOT NULL,
    entity_id     UUID          NOT NULL,
    changes       JSONB,
    ip_address    INET,
    user_agent    TEXT,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),

    PRIMARY KEY (id, created_at)
);

SELECT create_hypertable(
    'timeseries.activity_log',
    'created_at',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

COMMENT ON TABLE  timeseries.activity_log IS 'Append-only audit trail; TimescaleDB hypertable partitioned by created_at.';
COMMENT ON COLUMN timeseries.activity_log.actor_id IS 'User who performed the action (NULL for system actions).';
COMMENT ON COLUMN timeseries.activity_log.action IS 'Verb: created, updated, deleted, status_changed, etc.';
COMMENT ON COLUMN timeseries.activity_log.entity_type IS 'Polymorphic entity discriminator.';
COMMENT ON COLUMN timeseries.activity_log.changes IS 'JSONB diff: {"field":{"old":"a","new":"b"}}';


-- =============================================================================
-- 9. FOREIGN KEY CONSTRAINTS (ALTER TABLE)
-- =============================================================================
-- Foreign keys are defined after all tables are created to avoid
-- circular-dependency ordering issues during initial bootstrap.

-- ── auth schema ──────────────────────────────────────────────────────────────

ALTER TABLE auth.user_accounts
    ADD CONSTRAINT fk_user_accounts_user
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE auth.sessions
    ADD CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE auth.api_keys
    ADD CONSTRAINT fk_api_keys_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspace.workspaces (id) ON DELETE CASCADE;

ALTER TABLE auth.api_keys
    ADD CONSTRAINT fk_api_keys_user
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- ── workspace schema ─────────────────────────────────────────────────────────

ALTER TABLE workspace.workspaces
    ADD CONSTRAINT fk_workspaces_owner
    FOREIGN KEY (owner_id) REFERENCES auth.users (id) ON DELETE RESTRICT;

ALTER TABLE workspace.memberships
    ADD CONSTRAINT fk_memberships_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspace.workspaces (id) ON DELETE CASCADE;

ALTER TABLE workspace.memberships
    ADD CONSTRAINT fk_memberships_user
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE workspace.memberships
    ADD CONSTRAINT fk_memberships_invited_by
    FOREIGN KEY (invited_by) REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE workspace.teams
    ADD CONSTRAINT fk_teams_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspace.workspaces (id) ON DELETE CASCADE;

ALTER TABLE workspace.teams
    ADD CONSTRAINT fk_teams_parent
    FOREIGN KEY (parent_team_id) REFERENCES workspace.teams (id) ON DELETE SET NULL;

ALTER TABLE workspace.team_members
    ADD CONSTRAINT fk_team_members_team
    FOREIGN KEY (team_id) REFERENCES workspace.teams (id) ON DELETE CASCADE;

ALTER TABLE workspace.team_members
    ADD CONSTRAINT fk_team_members_user
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE workspace.spaces
    ADD CONSTRAINT fk_spaces_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspace.workspaces (id) ON DELETE CASCADE;

ALTER TABLE workspace.spaces
    ADD CONSTRAINT fk_spaces_created_by
    FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE RESTRICT;

ALTER TABLE workspace.folders
    ADD CONSTRAINT fk_folders_space
    FOREIGN KEY (space_id) REFERENCES workspace.spaces (id) ON DELETE CASCADE;

ALTER TABLE workspace.folders
    ADD CONSTRAINT fk_folders_parent
    FOREIGN KEY (parent_id) REFERENCES workspace.folders (id) ON DELETE SET NULL;

ALTER TABLE workspace.lists
    ADD CONSTRAINT fk_lists_space
    FOREIGN KEY (space_id) REFERENCES workspace.spaces (id) ON DELETE CASCADE;

ALTER TABLE workspace.lists
    ADD CONSTRAINT fk_lists_folder
    FOREIGN KEY (folder_id) REFERENCES workspace.folders (id) ON DELETE SET NULL;

ALTER TABLE workspace.lists
    ADD CONSTRAINT fk_lists_created_by
    FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE RESTRICT;

ALTER TABLE workspace.tasks
    ADD CONSTRAINT fk_tasks_list
    FOREIGN KEY (list_id) REFERENCES workspace.lists (id) ON DELETE CASCADE;

ALTER TABLE workspace.tasks
    ADD CONSTRAINT fk_tasks_parent
    FOREIGN KEY (parent_id) REFERENCES workspace.tasks (id) ON DELETE SET NULL;

ALTER TABLE workspace.tasks
    ADD CONSTRAINT fk_tasks_assignee
    FOREIGN KEY (assignee_id) REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE workspace.tasks
    ADD CONSTRAINT fk_tasks_created_by
    FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE RESTRICT;

ALTER TABLE workspace.task_relationships
    ADD CONSTRAINT fk_task_rels_source
    FOREIGN KEY (source_task_id) REFERENCES workspace.tasks (id) ON DELETE CASCADE;

ALTER TABLE workspace.task_relationships
    ADD CONSTRAINT fk_task_rels_target
    FOREIGN KEY (target_task_id) REFERENCES workspace.tasks (id) ON DELETE CASCADE;

ALTER TABLE workspace.custom_field_definitions
    ADD CONSTRAINT fk_cf_defs_space
    FOREIGN KEY (space_id) REFERENCES workspace.spaces (id) ON DELETE CASCADE;

ALTER TABLE workspace.custom_field_values
    ADD CONSTRAINT fk_cf_values_task
    FOREIGN KEY (task_id) REFERENCES workspace.tasks (id) ON DELETE CASCADE;

ALTER TABLE workspace.custom_field_values
    ADD CONSTRAINT fk_cf_values_field_def
    FOREIGN KEY (field_def_id) REFERENCES workspace.custom_field_definitions (id) ON DELETE CASCADE;

ALTER TABLE workspace.labels
    ADD CONSTRAINT fk_labels_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspace.workspaces (id) ON DELETE CASCADE;

ALTER TABLE workspace.comments
    ADD CONSTRAINT fk_comments_task
    FOREIGN KEY (task_id) REFERENCES workspace.tasks (id) ON DELETE CASCADE;

ALTER TABLE workspace.comments
    ADD CONSTRAINT fk_comments_parent
    FOREIGN KEY (parent_id) REFERENCES workspace.comments (id) ON DELETE SET NULL;

ALTER TABLE workspace.comments
    ADD CONSTRAINT fk_comments_author
    FOREIGN KEY (author_id) REFERENCES auth.users (id) ON DELETE RESTRICT;

ALTER TABLE workspace.comments
    ADD CONSTRAINT fk_comments_resolved_by
    FOREIGN KEY (resolved_by) REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE workspace.documents
    ADD CONSTRAINT fk_documents_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspace.workspaces (id) ON DELETE CASCADE;

ALTER TABLE workspace.documents
    ADD CONSTRAINT fk_documents_space
    FOREIGN KEY (space_id) REFERENCES workspace.spaces (id) ON DELETE SET NULL;

ALTER TABLE workspace.documents
    ADD CONSTRAINT fk_documents_folder
    FOREIGN KEY (folder_id) REFERENCES workspace.folders (id) ON DELETE SET NULL;

ALTER TABLE workspace.documents
    ADD CONSTRAINT fk_documents_list
    FOREIGN KEY (list_id) REFERENCES workspace.lists (id) ON DELETE SET NULL;

ALTER TABLE workspace.documents
    ADD CONSTRAINT fk_documents_task
    FOREIGN KEY (task_id) REFERENCES workspace.tasks (id) ON DELETE SET NULL;

ALTER TABLE workspace.documents
    ADD CONSTRAINT fk_documents_created_by
    FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE RESTRICT;

ALTER TABLE workspace.document_versions
    ADD CONSTRAINT fk_doc_versions_document
    FOREIGN KEY (document_id) REFERENCES workspace.documents (id) ON DELETE CASCADE;

ALTER TABLE workspace.document_versions
    ADD CONSTRAINT fk_doc_versions_author
    FOREIGN KEY (author_id) REFERENCES auth.users (id) ON DELETE RESTRICT;

ALTER TABLE workspace.attachments
    ADD CONSTRAINT fk_attachments_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES auth.users (id) ON DELETE RESTRICT;

ALTER TABLE workspace.saved_views
    ADD CONSTRAINT fk_saved_views_list
    FOREIGN KEY (list_id) REFERENCES workspace.lists (id) ON DELETE CASCADE;

ALTER TABLE workspace.saved_views
    ADD CONSTRAINT fk_saved_views_user
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE workspace.notifications
    ADD CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE workspace.notifications
    ADD CONSTRAINT fk_notifications_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspace.workspaces (id) ON DELETE CASCADE;

ALTER TABLE workspace.notifications
    ADD CONSTRAINT fk_notifications_actor
    FOREIGN KEY (actor_id) REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE workspace.notification_preferences
    ADD CONSTRAINT fk_notif_prefs_user
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE workspace.recurring_tasks
    ADD CONSTRAINT fk_recurring_source_task
    FOREIGN KEY (source_task_id) REFERENCES workspace.tasks (id) ON DELETE CASCADE;

ALTER TABLE workspace.recurring_tasks
    ADD CONSTRAINT fk_recurring_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspace.workspaces (id) ON DELETE CASCADE;

-- ── automation schema ────────────────────────────────────────────────────────

ALTER TABLE automation.automations
    ADD CONSTRAINT fk_automations_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspace.workspaces (id) ON DELETE CASCADE;

ALTER TABLE automation.automations
    ADD CONSTRAINT fk_automations_created_by
    FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE RESTRICT;

ALTER TABLE automation.automation_runs
    ADD CONSTRAINT fk_auto_runs_automation
    FOREIGN KEY (automation_id) REFERENCES automation.automations (id) ON DELETE CASCADE;

-- ── integration schema ───────────────────────────────────────────────────────

ALTER TABLE integration.webhooks
    ADD CONSTRAINT fk_webhooks_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspace.workspaces (id) ON DELETE CASCADE;

ALTER TABLE integration.webhooks
    ADD CONSTRAINT fk_webhooks_created_by
    FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE RESTRICT;

ALTER TABLE integration.webhook_deliveries
    ADD CONSTRAINT fk_webhook_deliveries_webhook
    FOREIGN KEY (webhook_id) REFERENCES integration.webhooks (id) ON DELETE CASCADE;

ALTER TABLE integration.connected_integrations
    ADD CONSTRAINT fk_connected_int_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspace.workspaces (id) ON DELETE CASCADE;

ALTER TABLE integration.connected_integrations
    ADD CONSTRAINT fk_connected_int_connected_by
    FOREIGN KEY (connected_by) REFERENCES auth.users (id) ON DELETE RESTRICT;

-- ── analytics schema ─────────────────────────────────────────────────────────

ALTER TABLE analytics.ai_usage
    ADD CONSTRAINT fk_ai_usage_user
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE analytics.ai_usage
    ADD CONSTRAINT fk_ai_usage_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspace.workspaces (id) ON DELETE SET NULL;

-- ── timeseries schema ────────────────────────────────────────────────────────

ALTER TABLE timeseries.activity_log
    ADD CONSTRAINT fk_activity_log_actor
    FOREIGN KEY (actor_id) REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE timeseries.activity_log
    ADD CONSTRAINT fk_activity_log_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspace.workspaces (id) ON DELETE CASCADE;


-- =============================================================================
-- 10. INDEXES
-- =============================================================================

-- ── auth indexes ─────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX idx_user_accounts_provider
    ON auth.user_accounts (provider, provider_uid)
    WHERE provider_uid IS NOT NULL;

CREATE INDEX idx_sessions_user_id
    ON auth.sessions (user_id);

CREATE INDEX idx_sessions_token_hash
    ON auth.sessions (token_hash);

CREATE INDEX idx_sessions_expires_at
    ON auth.sessions (expires_at);

CREATE INDEX idx_api_keys_workspace
    ON auth.api_keys (workspace_id);

CREATE INDEX idx_api_keys_key_hash
    ON auth.api_keys (key_hash);

-- ── workspace indexes ────────────────────────────────────────────────────────

CREATE INDEX idx_memberships_workspace
    ON workspace.memberships (workspace_id);

CREATE INDEX idx_memberships_user
    ON workspace.memberships (user_id);

CREATE INDEX idx_teams_workspace
    ON workspace.teams (workspace_id);

CREATE INDEX idx_teams_parent
    ON workspace.teams (parent_team_id)
    WHERE parent_team_id IS NOT NULL;

CREATE INDEX idx_team_members_user
    ON workspace.team_members (user_id);

CREATE INDEX idx_spaces_workspace
    ON workspace.spaces (workspace_id);

CREATE INDEX idx_spaces_archived
    ON workspace.spaces (workspace_id, is_archived);

CREATE INDEX idx_folders_space
    ON workspace.folders (space_id);

CREATE INDEX idx_folders_parent
    ON workspace.folders (parent_id)
    WHERE parent_id IS NOT NULL;

CREATE INDEX idx_lists_space
    ON workspace.lists (space_id);

CREATE INDEX idx_lists_folder
    ON workspace.lists (folder_id)
    WHERE folder_id IS NOT NULL;

CREATE INDEX idx_lists_archived
    ON workspace.lists (space_id, is_archived);

CREATE INDEX idx_tasks_list
    ON workspace.tasks (list_id);

CREATE INDEX idx_tasks_status
    ON workspace.tasks (list_id, status);

CREATE INDEX idx_tasks_assignee
    ON workspace.tasks (assignee_id)
    WHERE assignee_id IS NOT NULL;

CREATE INDEX idx_tasks_created_by
    ON workspace.tasks (created_by);

CREATE INDEX idx_tasks_parent
    ON workspace.tasks (parent_id)
    WHERE parent_id IS NOT NULL;

CREATE INDEX idx_tasks_due_date
    ON workspace.tasks (due_date)
    WHERE due_date IS NOT NULL;

CREATE INDEX idx_tasks_priority
    ON workspace.tasks (list_id, priority);

CREATE INDEX idx_tasks_archived
    ON workspace.tasks (list_id, is_archived);

CREATE INDEX idx_tasks_labels
    ON workspace.tasks USING GIN (labels);

CREATE INDEX idx_tasks_sort_order
    ON workspace.tasks (list_id, status, sort_order);

CREATE INDEX idx_task_rels_source
    ON workspace.task_relationships (source_task_id);

CREATE INDEX idx_task_rels_target
    ON workspace.task_relationships (target_task_id);

CREATE INDEX idx_cf_defs_space
    ON workspace.custom_field_definitions (space_id);

CREATE INDEX idx_cf_values_task
    ON workspace.custom_field_values (task_id);

CREATE INDEX idx_cf_values_field_def
    ON workspace.custom_field_values (field_def_id);

CREATE INDEX idx_labels_workspace
    ON workspace.labels (workspace_id);

CREATE INDEX idx_comments_task
    ON workspace.comments (task_id);

CREATE INDEX idx_comments_parent
    ON workspace.comments (parent_id)
    WHERE parent_id IS NOT NULL;

CREATE INDEX idx_comments_author
    ON workspace.comments (author_id);

CREATE INDEX idx_documents_workspace
    ON workspace.documents (workspace_id);

CREATE INDEX idx_documents_space
    ON workspace.documents (space_id)
    WHERE space_id IS NOT NULL;

CREATE INDEX idx_documents_task
    ON workspace.documents (task_id)
    WHERE task_id IS NOT NULL;

CREATE INDEX idx_documents_search
    ON workspace.documents USING GIN (search_vector);

CREATE INDEX idx_doc_versions_document
    ON workspace.document_versions (document_id, version_number DESC);

CREATE INDEX idx_attachments_entity
    ON workspace.attachments (entity_type, entity_id);

CREATE INDEX idx_saved_views_list
    ON workspace.saved_views (list_id);

CREATE INDEX idx_saved_views_user
    ON workspace.saved_views (user_id);

CREATE INDEX idx_notifications_user_unread
    ON workspace.notifications (user_id, is_read)
    WHERE is_read = false;

CREATE INDEX idx_notifications_created
    ON workspace.notifications (user_id, created_at DESC);

CREATE INDEX idx_notif_prefs_user
    ON workspace.notification_preferences (user_id);

CREATE INDEX idx_recurring_tasks_next_run
    ON workspace.recurring_tasks (next_run_at)
    WHERE is_active = true;

-- ── automation indexes ───────────────────────────────────────────────────────

CREATE INDEX idx_automations_workspace
    ON automation.automations (workspace_id);

CREATE INDEX idx_auto_runs_automation
    ON automation.automation_runs (automation_id);

CREATE INDEX idx_auto_runs_status
    ON automation.automation_runs (status);

CREATE INDEX idx_auto_runs_created
    ON automation.automation_runs (created_at DESC);

-- ── integration indexes ──────────────────────────────────────────────────────

CREATE INDEX idx_webhooks_workspace
    ON integration.webhooks (workspace_id);

CREATE INDEX idx_webhook_deliveries_webhook
    ON integration.webhook_deliveries (webhook_id);

CREATE INDEX idx_webhook_deliveries_status
    ON integration.webhook_deliveries (webhook_id, status);

CREATE INDEX idx_connected_int_workspace
    ON integration.connected_integrations (workspace_id);

-- ── analytics indexes ────────────────────────────────────────────────────────

CREATE INDEX idx_embeddings_entity
    ON analytics.ai_embeddings (entity_type, entity_id);

CREATE INDEX idx_embeddings_model
    ON analytics.ai_embeddings (model_name);

-- HNSW index for fast approximate nearest-neighbour vector search
CREATE INDEX idx_embeddings_vector_hnsw
    ON analytics.ai_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_ai_usage_user
    ON analytics.ai_usage (user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX idx_ai_usage_workspace
    ON analytics.ai_usage (workspace_id)
    WHERE workspace_id IS NOT NULL;

CREATE INDEX idx_ai_usage_created
    ON analytics.ai_usage (created_at DESC);

-- ── timeseries indexes ───────────────────────────────────────────────────────

CREATE INDEX idx_activity_log_workspace_time
    ON timeseries.activity_log (workspace_id, created_at DESC);

CREATE INDEX idx_activity_log_actor
    ON timeseries.activity_log (actor_id)
    WHERE actor_id IS NOT NULL;

CREATE INDEX idx_activity_log_entity
    ON timeseries.activity_log (entity_type, entity_id);

CREATE INDEX idx_activity_log_action
    ON timeseries.activity_log (workspace_id, action);


-- =============================================================================
-- 11. AUTOMATIC updated_at TRIGGER FUNCTION
-- =============================================================================
-- A reusable trigger that sets updated_at to now() on every UPDATE.

CREATE OR REPLACE FUNCTION auth.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to every table that has an updated_at column.

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

CREATE TRIGGER trg_workspaces_updated_at
    BEFORE UPDATE ON workspace.workspaces
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

CREATE TRIGGER trg_memberships_updated_at
    BEFORE UPDATE ON workspace.memberships
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

CREATE TRIGGER trg_teams_updated_at
    BEFORE UPDATE ON workspace.teams
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

CREATE TRIGGER trg_spaces_updated_at
    BEFORE UPDATE ON workspace.spaces
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

CREATE TRIGGER trg_folders_updated_at
    BEFORE UPDATE ON workspace.folders
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

CREATE TRIGGER trg_lists_updated_at
    BEFORE UPDATE ON workspace.lists
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON workspace.tasks
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

CREATE TRIGGER trg_comments_updated_at
    BEFORE UPDATE ON workspace.comments
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

CREATE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON workspace.documents
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

CREATE TRIGGER trg_saved_views_updated_at
    BEFORE UPDATE ON workspace.saved_views
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

CREATE TRIGGER trg_notif_prefs_updated_at
    BEFORE UPDATE ON workspace.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

CREATE TRIGGER trg_recurring_tasks_updated_at
    BEFORE UPDATE ON workspace.recurring_tasks
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

CREATE TRIGGER trg_automations_updated_at
    BEFORE UPDATE ON automation.automations
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

CREATE TRIGGER trg_webhooks_updated_at
    BEFORE UPDATE ON integration.webhooks
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();

CREATE TRIGGER trg_connected_int_updated_at
    BEFORE UPDATE ON integration.connected_integrations
    FOR EACH ROW EXECUTE FUNCTION auth.set_updated_at();


-- =============================================================================
-- END OF DDL
-- =============================================================================
