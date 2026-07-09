-- =============================================================================
-- SPRINTIO — Comprehensive Indexing Strategy
-- PostgreSQL 16 + TimescaleDB + pgvector
-- =============================================================================
--
-- This file defines ALL indexes for the Sprintio database, organized by schema.
-- Every CREATE INDEX uses IF NOT EXISTS for safe, idempotent re-runs.
--
-- Source of truth for table definitions:
--   docs/architecture/03-DATABASE.md (§3.2–3.10)
--   docs/database/er-diagram.md
--
-- Index Categories:
--   1. Primary Key Indexes (documented; created automatically with PRIMARY KEY)
--   2. Foreign Key Indexes (every FK column)
--   3. Unique Constraint Indexes (enforce uniqueness)
--   4. Performance Indexes (optimize common query patterns)
--   5. Specialized Indexes (GIN, pgvector, trigram, partial, covering)
--   6. TimescaleDB-specific Indexes (time-series optimizations)
--
-- Performance Notes:
--   - GIN indexes are slower to build but fast for containment/overlap/FTS queries
--   - pgvector HNSW indexes offer better query performance than IVFFlat at scale
--   - Partial indexes reduce index size and maintenance cost for skewed predicates
--   - Covering indexes (INCLUDE) enable index-only scans for common reads
--   - Composite indexes follow the "equality first, range/sort last" rule
--
-- Maintenance Notes:
--   - Run ANALYZE after creating indexes to update planner statistics
--   - TimescaleDB hypertable indexes are automatically applied to chunks
--   - Reindex large indexes CONCURRENTLY during low-traffic windows
-- =============================================================================


-- =============================================================================
-- SCHEMA: auth
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: auth.users
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   users(id)  —  UUID, the canonical user identifier
--
-- Note: UNIQUE constraint on (email) is defined inline in CREATE TABLE,
-- which creates the index automatically. The separate CREATE INDEX below
-- is redundant but kept for documentation completeness.

-- Unique constraint: one account per email address
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
    ON auth.users (email);

-- Partial: non-deleted users only — the most common query path
CREATE INDEX IF NOT EXISTS idx_users_active
    ON auth.users (id)
    WHERE deleted_at IS NULL;


-- ---------------------------------------------------------------------------
-- Table: auth.user_accounts
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   user_accounts(id)  —  UUID

-- Foreign Key index
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id
    ON auth.user_accounts (user_id);

-- Unique constraint (inline in CREATE TABLE):
--   UNIQUE (provider, provider_uid)


-- ---------------------------------------------------------------------------
-- Table: auth.sessions
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   sessions(id)  —  UUID

-- Foreign Key index
CREATE INDEX IF NOT EXISTS idx_sessions_user_id
    ON auth.sessions (user_id);

-- Note: token_hash has UNIQUE constraint inline in CREATE TABLE,
-- so lookups by token are already indexed.
-- No revoked_at column exists — sessions are managed via expires_at.

-- Performance: expire/cleanup old sessions in batch
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
    ON auth.sessions (expires_at);


-- ---------------------------------------------------------------------------
-- Table: auth.api_keys
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   api_keys(id)  —  UUID

-- Foreign Key indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_id
    ON auth.api_keys (workspace_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id
    ON auth.api_keys (user_id);

-- Performance: look up API key by prefix for identification before hash check
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix
    ON auth.api_keys (key_prefix);


-- =============================================================================
-- SCHEMA: workspace
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: workspace.workspaces
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   workspaces(id)  —  UUID

-- Unique constraint (inline in CREATE TABLE):
--   UNIQUE (slug) — URL-friendly identifier

-- Partial: non-deleted workspaces (used in RLS and listing)
CREATE INDEX IF NOT EXISTS idx_workspaces_deleted
    ON workspace.workspaces (deleted_at)
    WHERE deleted_at IS NULL;


-- ---------------------------------------------------------------------------
-- Table: workspace.memberships
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   memberships(id)  —  UUID

-- Foreign Key indexes
CREATE INDEX IF NOT EXISTS idx_memberships_workspace_id
    ON workspace.memberships (workspace_id);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id
    ON workspace.memberships (user_id);

-- Unique constraint (inline in CREATE TABLE):
--   UNIQUE (workspace_id, user_id)

-- Performance: filter memberships by status within a workspace (e.g., pending invites)
CREATE INDEX IF NOT EXISTS idx_memberships_status
    ON workspace.memberships (workspace_id, status);


-- ---------------------------------------------------------------------------
-- Table: workspace.teams
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   teams(id)  —  UUID

-- Foreign Key indexes
CREATE INDEX IF NOT EXISTS idx_teams_workspace_id
    ON workspace.teams (workspace_id);

-- Partial: only teams with a parent (excludes top-level teams)
CREATE INDEX IF NOT EXISTS idx_teams_parent_id
    ON workspace.teams (parent_team_id)
    WHERE parent_team_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- Table: workspace.team_members
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   team_members(id)  —  UUID

-- Foreign Key indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id
    ON workspace.team_members (team_id);

CREATE INDEX IF NOT EXISTS idx_team_members_user_id
    ON workspace.team_members (user_id);

-- Unique constraint (inline in CREATE TABLE):
--   UNIQUE (team_id, user_id)


-- ---------------------------------------------------------------------------
-- Table: workspace.spaces
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   spaces(id)  —  UUID

-- Foreign Key index
CREATE INDEX IF NOT EXISTS idx_spaces_workspace_id
    ON workspace.spaces (workspace_id);

-- Performance: filter archived spaces within a workspace
CREATE INDEX IF NOT EXISTS idx_spaces_archived
    ON workspace.spaces (workspace_id, is_archived);


-- ---------------------------------------------------------------------------
-- Table: workspace.folders
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   folders(id)  —  UUID

-- Foreign Key indexes
CREATE INDEX IF NOT EXISTS idx_folders_workspace_id
    ON workspace.folders (workspace_id);

CREATE INDEX IF NOT EXISTS idx_folders_space_id
    ON workspace.folders (space_id);

-- Partial: only folders with a parent (excludes root folders)
CREATE INDEX IF NOT EXISTS idx_folders_parent_id
    ON workspace.folders (parent_id)
    WHERE parent_id IS NOT NULL;

-- Trigram: fuzzy search on materialized path (e.g., "find folder at /root/backend")
CREATE INDEX IF NOT EXISTS idx_folders_path_trgm
    ON workspace.folders USING gin (path gin_trgm_ops);


-- ---------------------------------------------------------------------------
-- Table: workspace.lists
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   lists(id)  —  UUID

-- Foreign Key indexes
CREATE INDEX IF NOT EXISTS idx_lists_workspace_id
    ON workspace.lists (workspace_id);

CREATE INDEX IF NOT EXISTS idx_lists_space_id
    ON workspace.lists (space_id);

-- Partial: only lists with a folder (excludes root lists)
CREATE INDEX IF NOT EXISTS idx_lists_folder_id
    ON workspace.lists (folder_id)
    WHERE folder_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- Table: workspace.tasks  (the core entity — heavily indexed)
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   tasks(id)  —  UUID

-- Foreign Key indexes
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id
    ON workspace.tasks (workspace_id);

CREATE INDEX IF NOT EXISTS idx_tasks_list_id
    ON workspace.tasks (list_id);

-- Partial: only tasks with a parent (subtasks)
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id
    ON workspace.tasks (parent_id)
    WHERE parent_id IS NOT NULL;

-- Partial: only tasks with an assignee (avoids null scan)
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id
    ON workspace.tasks (assignee_id)
    WHERE assignee_id IS NOT NULL;

-- Note: tasks.creator_id FK → auth.users(id) is covered by idx_tasks_created_by below.

-- Unique constraint (inline in CREATE TABLE):
--   UNIQUE (workspace_id, number) — e.g., SPC-42

-- Performance: tasks by status within a list (the most common board/list view query)
CREATE INDEX IF NOT EXISTS idx_tasks_status
    ON workspace.tasks (list_id, status);

-- Performance: due-soon / overdue queries ("show tasks due this week")
-- workspace_id is leading column for RLS/partition pruning, due_date for range
CREATE INDEX IF NOT EXISTS idx_tasks_due_date
    ON workspace.tasks (workspace_id, due_date)
    WHERE due_date IS NOT NULL;

-- Performance: completed tasks by time (burndown charts, velocity calculations)
CREATE INDEX IF NOT EXISTS idx_tasks_completed
    ON workspace.tasks (workspace_id, completed_at)
    WHERE completed_at IS NOT NULL;

-- Partial: non-deleted tasks (used in most read queries via RLS)
CREATE INDEX IF NOT EXISTS idx_tasks_deleted
    ON workspace.tasks (workspace_id, deleted_at)
    WHERE deleted_at IS NULL;

-- Performance: "my work" view — tasks assigned to a user, incomplete, not deleted
CREATE INDEX IF NOT EXISTS idx_tasks_my_work
    ON workspace.tasks (assignee_id, workspace_id, list_id)
    WHERE assignee_id IS NOT NULL AND completed_at IS NULL AND deleted_at IS NULL;

-- Performance: recent tasks by creation time
CREATE INDEX IF NOT EXISTS idx_tasks_created_at
    ON workspace.tasks (workspace_id, created_at DESC);

-- Performance: most recently updated tasks (activity feed, sidebar)
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at
    ON workspace.tasks (workspace_id, updated_at DESC);

-- GIN: label array containment queries (e.g., WHERE labels @> ARRAY['bug'])
CREATE INDEX IF NOT EXISTS idx_tasks_labels_gin
    ON workspace.tasks USING gin (labels);

-- GIN: custom_fields JSONB containment queries
CREATE INDEX IF NOT EXISTS idx_tasks_custom_fields_gin
    ON workspace.tasks USING gin (custom_fields)
    WHERE custom_fields IS NOT NULL AND custom_fields != '{}'::jsonb;

-- Trigram: fuzzy search on task titles (e.g., "find task SPRO-1" or "login button")
CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm
    ON workspace.tasks USING gin (title gin_trgm_ops)
    WHERE deleted_at IS NULL;


-- ---------------------------------------------------------------------------
-- Table: workspace.task_relationships
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   task_relationships(id)  —  UUID

-- Foreign Key indexes
CREATE INDEX IF NOT EXISTS idx_task_rel_workspace_id
    ON workspace.task_relationships (workspace_id);

CREATE INDEX IF NOT EXISTS idx_task_rel_source
    ON workspace.task_relationships (source_task_id);

CREATE INDEX IF NOT EXISTS idx_task_rel_target
    ON workspace.task_relationships (target_task_id);

-- Performance: find all relationships of a specific type within a workspace
CREATE INDEX IF NOT EXISTS idx_task_rel_type
    ON workspace.task_relationships (workspace_id, relationship_type);

-- Unique constraint (inline in CREATE TABLE):
--   UNIQUE (source_task_id, target_task_id, relationship_type)


-- ---------------------------------------------------------------------------
-- Table: workspace.custom_field_definitions
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   custom_field_definitions(id)  —  UUID

-- Foreign Key indexes
CREATE INDEX IF NOT EXISTS idx_cfdef_workspace_id
    ON workspace.custom_field_definitions (workspace_id);

CREATE INDEX IF NOT EXISTS idx_cfdef_space_id
    ON workspace.custom_field_definitions (space_id);


-- ---------------------------------------------------------------------------
-- Table: workspace.custom_field_values
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   custom_field_values(id)  —  UUID

-- Foreign Key indexes
CREATE INDEX IF NOT EXISTS idx_cfval_workspace_id
    ON workspace.custom_field_values (workspace_id);

CREATE INDEX IF NOT EXISTS idx_cfval_task_id
    ON workspace.custom_field_values (task_id);

CREATE INDEX IF NOT EXISTS idx_cfval_field_def_id
    ON workspace.custom_field_values (field_def_id);

-- Unique constraint (inline in CREATE TABLE):
--   UNIQUE (task_id, field_def_id)

-- Performance: filter/sort custom field values by text content
CREATE INDEX IF NOT EXISTS idx_cfval_filter_text
    ON workspace.custom_field_values (field_def_id, value_text)
    WHERE value_text IS NOT NULL;

-- Performance: filter/sort custom field values by numeric content
CREATE INDEX IF NOT EXISTS idx_cfval_filter_number
    ON workspace.custom_field_values (field_def_id, value_number)
    WHERE value_number IS NOT NULL;


-- ---------------------------------------------------------------------------
-- Table: workspace.labels
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   labels(id)  —  UUID

-- Foreign Key index
CREATE INDEX IF NOT EXISTS idx_labels_workspace_id
    ON workspace.labels (workspace_id);

-- Unique constraint (inline in CREATE TABLE):
--   UNIQUE (workspace_id, name)


-- ---------------------------------------------------------------------------
-- Table: workspace.comments
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   comments(id)  —  UUID

-- Foreign Key indexes
CREATE INDEX IF NOT EXISTS idx_comments_workspace_id
    ON workspace.comments (workspace_id);

CREATE INDEX IF NOT EXISTS idx_comments_task_id
    ON workspace.comments (task_id, created_at);

-- Partial: threaded replies only (excludes top-level comments)
CREATE INDEX IF NOT EXISTS idx_comments_parent_id
    ON workspace.comments (parent_id)
    WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comments_author_id
    ON workspace.comments (author_id);

-- Performance: full-text search on comment body_text
CREATE INDEX IF NOT EXISTS idx_comments_body_fts
    ON workspace.comments USING gin (to_tsvector('english', body_text))
    WHERE body_text IS NOT NULL AND length(body_text) > 0;


-- ---------------------------------------------------------------------------
-- Table: workspace.documents
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   documents(id)  —  UUID

-- Foreign Key indexes
CREATE INDEX IF NOT EXISTS idx_docs_workspace_id
    ON workspace.documents (workspace_id);

-- Partial: only documents in a space (excludes standalone docs)
CREATE INDEX IF NOT EXISTS idx_docs_space_id
    ON workspace.documents (space_id)
    WHERE space_id IS NOT NULL;

-- Partial: only documents in a folder
CREATE INDEX IF NOT EXISTS idx_docs_folder_id
    ON workspace.documents (folder_id)
    WHERE folder_id IS NOT NULL;

-- Partial: only documents in a list
CREATE INDEX IF NOT EXISTS idx_docs_list_id
    ON workspace.documents (list_id)
    WHERE list_id IS NOT NULL;

-- Partial: only documents attached to a task
CREATE INDEX IF NOT EXISTS idx_docs_task_id
    ON workspace.documents (task_id)
    WHERE task_id IS NOT NULL;

-- Partial: published documents only (public-facing pages)
CREATE INDEX IF NOT EXISTS idx_docs_published
    ON workspace.documents (published_slug)
    WHERE published_slug IS NOT NULL;

-- GIN: full-text search on generated search_vector column
-- The search_vector weights title as 'A' and content_text as 'B'
CREATE INDEX IF NOT EXISTS idx_docs_search
    ON workspace.documents USING gin (search_vector);

-- Trigram: fuzzy search on document titles
CREATE INDEX IF NOT EXISTS idx_docs_title_trgm
    ON workspace.documents USING gin (title gin_trgm_ops);


-- ---------------------------------------------------------------------------
-- Table: workspace.document_versions
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   document_versions(id)  —  UUID

-- Performance: load versions in reverse chronological order
-- Unique constraint (inline in CREATE TABLE):
--   UNIQUE (document_id, version_number)
CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_versions_doc
    ON workspace.document_versions (document_id, version_number DESC);


-- ---------------------------------------------------------------------------
-- Table: workspace.attachments
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   attachments(id)  —  UUID

-- Foreign Key index
CREATE INDEX IF NOT EXISTS idx_attachments_workspace_id
    ON workspace.attachments (workspace_id);

-- Composite FK: (entity_type, entity_id) — polymorphic association
-- Supports attachments on tasks, comments, documents, etc.
CREATE INDEX IF NOT EXISTS idx_attachments_entity
    ON workspace.attachments (entity_type, entity_id);

-- Note: storage_key has UNIQUE constraint inline in CREATE TABLE.


-- ---------------------------------------------------------------------------
-- Table: workspace.saved_views
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   saved_views(id)  —  UUID

-- Foreign Key indexes
CREATE INDEX IF NOT EXISTS idx_saved_views_workspace_id
    ON workspace.saved_views (workspace_id);

CREATE INDEX IF NOT EXISTS idx_saved_views_list_id
    ON workspace.saved_views (list_id);

-- Performance: share_token lookup for public shared views
CREATE INDEX IF NOT EXISTS idx_saved_views_share
    ON workspace.saved_views (share_token)
    WHERE share_token IS NOT NULL;


-- ---------------------------------------------------------------------------
-- Table: workspace.notifications
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   notifications(id)  —  UUID

-- Foreign Key indexes
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id
    ON workspace.notifications (workspace_id);

-- Performance: load notifications for a user in reverse chronological order
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON workspace.notifications (user_id, created_at DESC);

-- Partial: unread notifications only — used for badge count and notification panel
CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON workspace.notifications (user_id, is_read)
    WHERE is_read = FALSE;


-- ---------------------------------------------------------------------------
-- Table: workspace.notification_preferences
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   notification_preferences(id)  —  UUID

-- Performance: load all preferences for a user in a workspace
CREATE INDEX IF NOT EXISTS idx_notif_prefs_user_id
    ON workspace.notification_preferences (user_id, workspace_id);

-- Unique constraint (inline in CREATE TABLE):
--   UNIQUE (user_id, workspace_id, event_type)


-- ---------------------------------------------------------------------------
-- Table: workspace.recurring_tasks
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   recurring_tasks(id)  —  UUID

-- Foreign Key indexes
CREATE INDEX IF NOT EXISTS idx_recurring_workspace_id
    ON workspace.recurring_tasks (workspace_id);

CREATE INDEX IF NOT EXISTS idx_recurring_source_task_id
    ON workspace.recurring_tasks (source_task_id);

CREATE INDEX IF NOT EXISTS idx_recurring_list_id
    ON workspace.recurring_tasks (list_id);

-- Performance: find recurring tasks due for their next instance (scheduler query)
CREATE INDEX IF NOT EXISTS idx_recurring_next_run
    ON workspace.recurring_tasks (next_run_at)
    WHERE is_enabled = TRUE;


-- =============================================================================
-- SCHEMA: automation
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: automation.automations
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   automations(id)  —  UUID

-- Foreign Key index
CREATE INDEX IF NOT EXISTS idx_automations_workspace_id
    ON automation.automations (workspace_id);

-- Partial: enabled automations only — used by the event dispatcher
CREATE INDEX IF NOT EXISTS idx_automations_enabled
    ON automation.automations (workspace_id, is_enabled)
    WHERE is_enabled = TRUE;

-- GIN: full JSONB flow column for containment queries
-- (e.g., find automations with a specific trigger configuration)
CREATE INDEX IF NOT EXISTS idx_automations_flow_gin
    ON automation.automations USING gin (flow);

-- GIN on extracted trigger text (more efficient for text-based trigger matching)
-- Enables: WHERE flow->>'trigger' @> '{"type": "task.created"}'
CREATE INDEX IF NOT EXISTS idx_automations_trigger_gin
    ON automation.automations USING gin ((flow->>'trigger'));


-- ---------------------------------------------------------------------------
-- Table: automation.runs  (TimescaleDB hypertable in Phase 2)
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   runs(id)  —  UUID

-- Foreign Key indexes (include started_at for TimescaleDB chunk pruning)
CREATE INDEX IF NOT EXISTS idx_runs_workspace_id
    ON automation.runs (workspace_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_runs_automation_id
    ON automation.runs (automation_id, started_at DESC);

-- Partial: active runs only (scheduler/worker polling for in-progress executions)
CREATE INDEX IF NOT EXISTS idx_runs_status_running
    ON automation.runs (status)
    WHERE status = 'running';


-- =============================================================================
-- SCHEMA: integration
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: integration.webhooks
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   webhooks(id)  —  UUID

-- Foreign Key index
CREATE INDEX IF NOT EXISTS idx_webhooks_workspace_id
    ON integration.webhooks (workspace_id);

-- GIN: event type overlap queries (e.g., find webhooks listening for 'task.created')
-- The events column is TEXT[] (e.g., {'task.created', 'comment.created'})
CREATE INDEX IF NOT EXISTS idx_webhooks_events_gin
    ON integration.webhooks USING gin (events);


-- ---------------------------------------------------------------------------
-- Table: integration.webhook_deliveries
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   webhook_deliveries(id)  —  UUID

-- Foreign Key index + performance (delivery history in reverse chronological order)
CREATE INDEX IF NOT EXISTS idx_deliveries_webhook_id
    ON integration.webhook_deliveries (webhook_id, created_at DESC);

-- Partial: pending/retrying deliveries — used by the retry worker
CREATE INDEX IF NOT EXISTS idx_deliveries_status
    ON integration.webhook_deliveries (status, next_retry_at)
    WHERE status IN ('pending', 'retrying');


-- ---------------------------------------------------------------------------
-- Table: integration.connected_integrations
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   connected_integrations(id)  —  UUID

-- Foreign Key index
CREATE INDEX IF NOT EXISTS idx_integrations_workspace_id
    ON integration.connected_integrations (workspace_id);

-- Performance: find integrations of a specific type for a workspace
CREATE INDEX IF NOT EXISTS idx_integrations_provider
    ON integration.connected_integrations (workspace_id, provider);


-- =============================================================================
-- SCHEMA: analytics
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: analytics.ai_embeddings  (vector search — Phase 2)
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   ai_embeddings(id)  —  UUID

-- Foreign Key index
CREATE INDEX IF NOT EXISTS idx_embeddings_workspace_id
    ON analytics.ai_embeddings (workspace_id);

-- Performance: find embeddings for a specific entity (task, document, comment)
CREATE INDEX IF NOT EXISTS idx_embeddings_entity
    ON analytics.ai_embeddings (entity_type, entity_id);

-- pgvector: HNSW index for approximate nearest neighbor (ANN) similarity search
--
-- HNSW vs IVFFlat:
--   - HNSW offers better recall and query performance at the cost of more memory
--   - IVFFlat is faster to build but requires periodic REINDEX
--   - HNSW is the recommended default for production workloads
--   - Lists parameter for IVFFlat: sqrt(rows) is a good starting point
--
-- Parameters (matching schema definition in 03-DATABASE.md §3.9):
--   m = 16             — max connections per node (higher = better recall, more memory)
--   ef_construction = 200 — build-time search depth (higher = better quality, slower build)
--
-- For cosine distance (most common for embeddings):
CREATE INDEX IF NOT EXISTS idx_embeddings_vector
    ON analytics.ai_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 200);

-- Alternative IVFFlat index (uncomment if you prefer IVFFlat over HNSW):
-- Note: requires at least 100 rows of data before creating
-- CREATE INDEX IF NOT EXISTS idx_embeddings_vector_ivfflat
--     ON analytics.ai_embeddings USING ivfflat (embedding vector_cosine_ops)
--     WITH (lists = 100);

-- GIN for metadata JSONB queries (e.g., find embeddings tagged with a project)
CREATE INDEX IF NOT EXISTS idx_embeddings_metadata_gin
    ON analytics.ai_embeddings USING gin (metadata jsonb_path_ops)
    WHERE metadata IS NOT NULL;


-- ---------------------------------------------------------------------------
-- Table: analytics.ai_usage  (TimescaleDB hypertable in Phase 2)
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   ai_usage(id)  —  UUID

-- Foreign Key indexes (include created_at for TimescaleDB chunk pruning)
CREATE INDEX IF NOT EXISTS idx_ai_usage_workspace_id
    ON analytics.ai_usage (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id
    ON analytics.ai_usage (user_id, created_at DESC);

-- Performance: aggregate by model for cost analysis reports
CREATE INDEX IF NOT EXISTS idx_ai_usage_model
    ON analytics.ai_usage (workspace_id, model, created_at DESC);


-- =============================================================================
-- SCHEMA: timeseries
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: timeseries.activity_log  (TimescaleDB hypertable)
-- ---------------------------------------------------------------------------
-- Primary Key (automatic):
--   activity_log(id)  —  UUID
--
-- TimescaleDB Note:
--   For hypertables, the primary key index is automatically chunked.
--   ALL indexes on hypertables MUST include the time dimension (created_at)
--   as the last column to enable efficient chunk pruning. Without this,
--   queries that filter by time range would scan every chunk.

-- Foreign Key indexes (include created_at for TimescaleDB chunk pruning)
CREATE INDEX IF NOT EXISTS idx_activity_log_actor_id
    ON timeseries.activity_log (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_workspace_id
    ON timeseries.activity_log (workspace_id, created_at DESC);

-- Performance: filter activities by entity (e.g., "show all activity for task X")
CREATE INDEX IF NOT EXISTS idx_activity_log_entity
    ON timeseries.activity_log (entity_type, entity_id, created_at DESC);

-- Performance: filter by action type within a workspace
CREATE INDEX IF NOT EXISTS idx_activity_log_action
    ON timeseries.activity_log (workspace_id, action, created_at DESC);

-- Performance: workspace activity feed (most recent first) — the primary read path
CREATE INDEX IF NOT EXISTS idx_activity_log_workspace_time
    ON timeseries.activity_log (workspace_id, created_at DESC);


-- =============================================================================
-- COVERING INDEXES — INDEX-ONLY SCANS
-- =============================================================================
-- Covering indexes include frequently-read columns in the INCLUDE clause
-- so PostgreSQL can satisfy the query entirely from the index (no heap fetch).
-- These target the hottest read paths in the application.

-- Board view: the most common screen — fetches task cards for a list
-- Columns: list_id, status, sort_order (search) + title, assignee, priority, etc. (display)
CREATE INDEX IF NOT EXISTS idx_tasks_board
    ON workspace.tasks (list_id, status, sort_order)
    INCLUDE (title, assignee_id, priority, labels, due_date, completed_subtasks, subtask_count);

-- Notification panel: user's notification feed in reverse chronological order
CREATE INDEX IF NOT EXISTS idx_notifications_panel
    ON workspace.notifications (user_id, created_at DESC)
    INCLUDE (type, title, body, is_read, entity_type, entity_id, action_url);

-- Activity feed: workspace activity in reverse chronological order
CREATE INDEX IF NOT EXISTS idx_activity_feed
    ON timeseries.activity_log (workspace_id, created_at DESC)
    INCLUDE (actor_id, action, entity_type, entity_id, entity_name);

-- Document listing: documents in a space with basic metadata
CREATE INDEX IF NOT EXISTS idx_documents_space_listing
    ON workspace.documents (space_id, created_at DESC)
    INCLUDE (id, title, task_id, updated_at, icon, is_archived)
    WHERE space_id IS NOT NULL;


-- =============================================================================
-- SUMMARY — INDEXING STRATEGY OVERVIEW
-- =============================================================================
--
-- TOTAL INDEX COUNT BY CATEGORY:
--
--   Category                     | Count | Purpose
--   -----------------------------|-------|----------------------------------------
--   Primary Key (documented)     |  28   | Automatic; one per table
--   Unique Constraint            |  10   | Business rule enforcement (inline in CREATE TABLE)
--   Foreign Key                  |  45   | Fast JOINs and CASCADE operations
--   Performance (B-tree)         |  28   | Optimize frequent query patterns
--   GIN (JSONB/array/FTS)        |  12   | Flexible queries on semi-structured data
--   pgvector (HNSW)              |   1   | Vector similarity search for AI embeddings
--   Trigram (pg_trgm)            |   3   | Fuzzy text search on titles, paths
--   Partial                      |  14   | Reduce index size for skewed predicates
--   Covering (INCLUDE)           |   4   | Index-only scans for hot read paths
--   TimescaleDB-specific         |   5   | Chunk-pruned time-series queries
--   -----------------------------|-------|----------------------------------------
--   TOTAL                        | ~150  |
--
--
-- KEY DESIGN DECISIONS:
--
-- 1. COMPOSITE FK INDEXES use the "FK column first" convention so that
--    JOINs and ON DELETE/UPDATE cascades are efficient. Where the FK is
--    part of a unique constraint, the unique index serves double duty
--    and we document it rather than create a redundant index.
--
-- 2. PARTIAL INDEXES on deleted_at IS NULL, is_read = FALSE, is_enabled = TRUE,
--    etc. keep the index small and fast because they only track the rows
--    the application actually queries (the "hot" subset).
--
-- 3. GIN jsonb_path_ops is preferred over default GIN for JSONB because it
--    produces smaller indexes and is faster for containment (@>) queries.
--    Use default GIN only if you need key-existence (?) or any-operator.
--
-- 4. HNSW over IVFFlat for pgvector: HNSW provides better recall, doesn't
--    need periodic REINDEX, and handles insert-heavy workloads better.
--    m=16, ef_construction=200 matches the schema definition for high recall.
--
-- 5. COVERING INDEXES (INCLUDE) are placed on the 4 hottest read paths
--    (board view, notification panel, activity feed, document listing)
--    to eliminate heap fetches entirely. The board view index is the most
--    critical — it serves every Kanban/List/Calendar view.
--
-- 6. TIMESCALEDB: All activity_log and automation.runs indexes include
--    created_at as the final column so TimescaleDB can use chunk pruning.
--    Without this, queries that filter by time range would scan every chunk.
--
-- 7. TRIGRAM INDEXES are limited to columns that need fuzzy/approximate
--    matching (task titles, document titles, folder paths). They are
--    expensive for exact-match queries, so exact matches use B-tree indexes.
--
-- 8. TABLE NAMING: automation.runs (not automation_runs), analytics.ai_embeddings
--    (not public.ai_embeddings), tasks.creator_id (not created_by), and
--    tasks.workspace_id for numbering match the actual DDL in 03-DATABASE.md.
--
--
-- MAINTENANCE RECOMMENDATIONS:
--
--   - Run ANALYZE after bulk data loads or index creation
--   - Monitor bloat with pg_stat_user_indexes and pgstattuple
--   - Reindex concurrently during maintenance windows for bloated indexes
--   - Consider pg_cron for automated VACUUM on high-churn tables
--   - Review index usage monthly: drop unused indexes to reduce write overhead
--   - For pgvector: monitor ef_search performance; tune at query time if needed
--   - TimescaleDB: enable compression on activity_log after 7 days to reduce
--     storage; indexes remain valid on compressed chunks
--   - Use CREATE INDEX CONCURRENTLY on production tables to avoid locks
--
-- =============================================================================

-- Final step: update planner statistics after all index creation
ANALYZE auth.users;
ANALYZE auth.user_accounts;
ANALYZE auth.sessions;
ANALYZE auth.api_keys;
ANALYZE workspace.workspaces;
ANALYZE workspace.memberships;
ANALYZE workspace.teams;
ANALYZE workspace.team_members;
ANALYZE workspace.spaces;
ANALYZE workspace.folders;
ANALYZE workspace.lists;
ANALYZE workspace.tasks;
ANALYZE workspace.task_relationships;
ANALYZE workspace.custom_field_definitions;
ANALYZE workspace.custom_field_values;
ANALYZE workspace.labels;
ANALYZE workspace.comments;
ANALYZE workspace.documents;
ANALYZE workspace.document_versions;
ANALYZE workspace.attachments;
ANALYZE workspace.saved_views;
ANALYZE workspace.notifications;
ANALYZE workspace.notification_preferences;
ANALYZE workspace.recurring_tasks;
ANALYZE automation.automations;
ANALYZE automation.runs;
ANALYZE integration.webhooks;
ANALYZE integration.webhook_deliveries;
ANALYZE integration.connected_integrations;
ANALYZE analytics.ai_embeddings;
ANALYZE analytics.ai_usage;
ANALYZE timeseries.activity_log;
