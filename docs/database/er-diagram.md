# Sprintio — Entity-Relationship Diagram

> **Database**: PostgreSQL 16 + TimescaleDB + pgvector  
> **ORM**: Drizzle  
> **Schemas**: `auth`, `workspace`, `automation`, `integration`, `analytics`, `timeseries`

This document contains the complete ER diagram for all Sprintio database tables, split into six logical sections for readability. Each section maps to a PostgreSQL schema.

---

## Legend

| Symbol      | Meaning                           |
| ----------- | --------------------------------- |
| `PK`        | Primary Key                       |
| `FK`        | Foreign Key                       |
| `UQ`        | Unique Constraint                 |
| `NN`        | NOT NULL                          |
| `{}`        | Array (e.g., `TEXT[]`)            |
| `>>`        | JSONB / complex type              |
| `vector(n)` | pgvector embedding of dimension n |
| `TSTZ`      | `TIMESTAMPTZ`                     |

### Cardinality Notation

| ER Symbol    | SQL Equivalent | Meaning                                  |
| ------------ | -------------- | ---------------------------------------- |
| `\|\|--\|\|` | 1..1 ↔ 1..1    | Exactly one to exactly one               |
| `}o--\|\|`   | 0..* ↔ 1..1    | Zero or many to exactly one              |
| `\|o--\|\|`  | 1..* ↔ 1..1    | One or many to exactly one (FK NOT NULL) |
| `}o--o{`     | 0..* ↔ 0..*    | Zero or many to zero or many (junction)  |
| `}o--o       | `              | 0..* ↔ 0..1                              | Zero or many to zero or one |

### Notes on Column Display

- **PKs, FKs, and UQ columns** are always shown with constraints.
- Tables with many columns show the most important fields; full definitions live in the migration files.
- `created_at` and `updated_at` are present on nearly every table and are omitted for clarity unless a table is small.

---

## Section 1: `auth` — Authentication & Identity

```mermaid
erDiagram
    USERS["USERS"] {
        uuid PK id
        text UQ email
        text name
        text avatar_url
        text password_hash
        text locale
        text timezone
        boolean is_active
        boolean mfa_enabled
        timestamptz created_at
        timestamptz updated_at
    }

    USER_ACCOUNTS["USER_ACCOUNTS"] {
        uuid PK id
        uuid FK user_id
        text provider "google | github"
        text provider_uid
        timestamptz created_at
    }

    SESSIONS["SESSIONS"] {
        uuid PK id
        uuid FK user_id
        text token_hash
        text device_name
        text user_agent
        text ip_address
        timestamptz expires_at
        timestamptz created_at
        timestamptz revoked_at
    }

    API_KEYS["API_KEYS"] {
        uuid PK id
        uuid FK workspace_id
        uuid FK user_id
        text name
        text key_prefix
        text key_hash
        text_arr scopes "TEXT[]"
        timestamptz last_used_at
        timestamptz expires_at
        timestamptz created_at
    }

    WORKSPACES_FK["workspaces (workspace)"] {
        uuid id
    }

    USERS ||--o{ USER_ACCOUNTS : "has many"
    USERS ||--o{ SESSIONS : "has many"
    USERS ||--o{ API_KEYS : "creates"

    WORKSPACES_FK ||--o{ API_KEYS : "scoped to"

    USER_ACCOUNTS }o--|| USERS : "belongs to"
    USER_ACCOUNTS }o--|| USERS : "FK user_id"

    SESSIONS }o--|| USERS : "belongs to"

    API_KEYS }o--|| USERS : "belongs to"
    API_KEYS }o--|| WORKSPACES_FK : "scoped to workspace"
```

> **`USER_ACCOUNTS` unique constraint**: `(user_id, provider)` — each user can link one account per OAuth provider.  
> **`SESSIONS`**: Soft-revocation via `revoked_at`; hard-delete for GDPR.  
> **`API_KEYS`**: `key_prefix` stores the first 8 chars for identification; the full secret is only shown once at creation.  
> **`api_keys.workspace_id`** is the only cross-schema FK in `auth`.

---

## Section 2: `workspace` — Core Entities

```mermaid
erDiagram
    USERS_WS["USERS (auth)"] {
        uuid id
    }

    WORKSPACES["WORKSPACES"] {
        uuid PK id
        text name
        text UQ slug
        uuid FK owner_id
        text plan "free | team | enterprise"
        int max_members
        jsonb settings
        text logo_url
        timestamptz created_at
        timestamptz updated_at
    }

    MEMBERSHIPS["MEMBERSHIPS"] {
        uuid PK id
        uuid FK workspace_id
        uuid FK user_id
        text role "owner | admin | member | guest | viewer"
        text status "active | invited | suspended"
        jsonb guest_scopes
        uuid FK invited_by
        timestamptz created_at
        timestamptz updated_at
    }

    TEAMS["TEAMS"] {
        uuid PK id
        uuid FK workspace_id
        text name
        text description
        uuid FK parent_team_id "self-FK"
        text color
        timestamptz created_at
        timestamptz updated_at
    }

    TEAM_MEMBERS["TEAM_MEMBERS"] {
        uuid PK id
        uuid FK team_id
        uuid FK user_id
        timestamptz created_at
    }

    LABELS["LABELS"] {
        uuid PK id
        uuid FK workspace_id
        text name
        text color
        timestamptz created_at
    }

    WORKSPACES ||--o{ MEMBERSHIPS : "has members"
    WORKSPACES ||--o{ TEAMS : "has teams"
    WORKSPACES ||--o{ LABELS : "defines labels"
    WORKSPACES }o--|| USERS_WS : "owner"

    MEMBERSHIPS }o--|| WORKSPACES : "belongs to"
    MEMBERSHIPS }o--|| USERS_WS : "user"
    MEMBERSHIPS }o--o| USERS_WS : "invited_by"

    TEAMS }o--|| WORKSPACES : "belongs to"
    TEAMS }o--o| TEAMS : "parent_team (self)"

    TEAM_MEMBERS }o--|| TEAMS : "member of"
    TEAM_MEMBERS }o--|| USERS_WS : "is user"

    LABELS }o--|| WORKSPACES : "belongs to"
```

> **`MEMBERSHIPS` unique constraint**: `(workspace_id, user_id)` — one membership per user per workspace.  
> **`TEAMS`**: Self-referencing via `parent_team_id` for nested team hierarchy.  
> **`LABELS` unique constraint**: `(workspace_id, name)` — labels are workspace-scoped and unique by name.  
> **`MEMBERSHIPS.invited_by`** is an optional FK — null for self-join owners.

---

## Section 3: `workspace` — Spaces, Lists & Tasks

```mermaid
erDiagram
    USERS_WS2["USERS (auth)"] {
        uuid id
    }

    WORKSPACES_WS["WORKSPACES"] {
        uuid id
    }

    SPACES["SPACES"] {
        uuid PK id
        uuid FK workspace_id
        text name
        text description
        text icon
        text color
        jsonb statuses "custom status definitions"
        int sort_order
        boolean is_archived
        uuid FK created_by
        timestamptz created_at
        timestamptz updated_at
    }

    FOLDERS["FOLDERS"] {
        uuid PK id
        uuid FK space_id
        uuid FK parent_id "self-FK"
        text name
        text path "materialized path"
        int depth
        int sort_order
        timestamptz created_at
        timestamptz updated_at
    }

    LISTS["LISTS"] {
        uuid PK id
        uuid FK space_id
        uuid FK folder_id "nullable"
        text name
        text description
        text icon
        text default_view "board | list | table"
        jsonb view_config
        int sort_order
        boolean is_archived
        uuid FK created_by
        timestamptz created_at
        timestamptz updated_at
    }

    TASKS["TASKS"] {
        uuid PK id
        uuid FK list_id
        int number "per-list sequence"
        text title
        jsonb description "TipTap JSON"
        text status
        text priority "urgent | high | medium | low | none"
        text_arr labels "TEXT[]"
        uuid FK parent_id "self-FK (subtasks)"
        uuid FK assignee_id "nullable"
        uuid FK created_by
        timestamptz due_date
        timestamptz start_date
        decimal estimated_hours
        decimal actual_hours
        jsonb custom_fields
        int sort_order
        boolean is_archived
        boolean is_completed
        timestamptz completed_at
        timestamptz created_at
        timestamptz updated_at
    }

    TASK_RELATIONSHIPS["TASK_RELATIONSHIPS"] {
        uuid PK id
        uuid FK source_task_id
        uuid FK target_task_id
        text relationship_type "blocked_by | blocks | related | duplicate"
        timestamptz created_at
    }

    COMMENTS["COMMENTS"] {
        uuid PK id
        uuid FK task_id
        uuid FK parent_id "self-FK (threads)"
        jsonb body "TipTap JSON"
        uuid FK author_id
        jsonb reactions
        boolean is_resolved
        uuid FK resolved_by "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    SPACES }o--|| WORKSPACES_WS : "belongs to"
    SPACES }o--|| USERS_WS2 : "created_by"

    FOLDERS }o--|| SPACES : "belongs to"
    FOLDERS }o--o| FOLDERS : "parent (self)"

    LISTS }o--|| SPACES : "belongs to"
    LISTS }o--o| FOLDERS : "optional folder"
    LISTS }o--|| USERS_WS2 : "created_by"

    TASKS }o--|| LISTS : "belongs to"
    TASKS }o--o| TASKS : "parent (subtask)"
    TASKS }o--o| USERS_WS2 : "assignee"
    TASKS }o--|| USERS_WS2 : "created_by"

    TASK_RELATIONSHIPS }o--|| TASKS : "source_task"
    TASK_RELATIONSHIPS }o--|| TASKS : "target_task"

    COMMENTS }o--|| TASKS : "on task"
    COMMENTS }o--|| USERS_WS2 : "author"
    COMMENTS }o--o| COMMENTS : "thread parent"
    COMMENTS }o--o| USERS_WS2 : "resolved_by"
```

> **`FOLDERS`**: Materialized-path pattern (`path` column, e.g. `/parent/child/`) for efficient subtree queries.  
> **`TASKS` unique constraint**: `(list_id, number)` — each list maintains its own auto-incrementing task number.  
> **`TASK_RELATIONSHIPS` unique constraint**: `(source_task_id, target_task_id, relationship_type)`.  
> **`COMMENTS`**: Threaded via self-referencing `parent_id`; null = top-level comment.

---

## Section 4: `workspace` — Documents, Fields & Views

```mermaid
erDiagram
    USERS_D["USERS (auth)"] {
        uuid id
    }

    SPACES_D["SPACES"] {
        uuid id
    }

    FOLDERS_D["FOLDERS"] {
        uuid id
    }

    LISTS_D["LISTS"] {
        uuid id
    }

    TASKS_D["TASKS"] {
        uuid id
    }

    CUSTOM_FIELD_DEFS["CUSTOM_FIELD_DEFINITIONS"] {
        uuid PK id
        uuid FK space_id
        text name
        text field_type "text | number | date | select | multi_select | checkbox | url | email | person | duration | formula | rollup"
        jsonb config "options, formula expr, etc."
        int sort_order
        boolean is_required
        timestamptz created_at
        timestamptz updated_at
    }

    CUSTOM_FIELD_VALUES["CUSTOM_FIELD_VALUES"] {
        uuid PK id
        uuid FK task_id
        uuid FK field_def_id
        text value_text
        decimal value_number
        boolean value_boolean
        timestamptz value_date
        text value_select
        jsonb value_json
        timestamptz created_at
        timestamptz updated_at
    }

    DOCUMENTS["DOCUMENTS"] {
        uuid PK id
        uuid FK workspace_id
        uuid FK space_id "nullable"
        uuid FK folder_id "nullable"
        uuid FK list_id "nullable"
        uuid FK task_id "nullable"
        text title
        jsonb content "TipTap JSON"
        bytea yjs_state "collaborative editing"
        tsvector search_vector "full-text index"
        jsonb permissions
        uuid FK created_by
        timestamptz created_at
        timestamptz updated_at
    }

    DOCUMENT_VERSIONS["DOCUMENT_VERSIONS"] {
        uuid PK id
        uuid FK document_id
        int version_number
        text title
        jsonb content
        uuid FK author_id
        timestamptz created_at
    }

    ATTACHMENTS["ATTACHMENTS"] {
        uuid PK id
        text entity_type "task | comment | document"
        uuid entity_id "polymorphic"
        text filename
        text original_filename
        text storage_key "R2 path"
        text mime_type
        bigint size_bytes
        text thumbnail_key
        uuid FK uploaded_by
        timestamptz created_at
    }

    SAVED_VIEWS["SAVED_VIEWS"] {
        uuid PK id
        uuid FK list_id
        uuid FK user_id
        text name
        text view_type "board | list | table | calendar | gantt"
        jsonb config "filters, sorts, grouping"
        text visibility "private | workspace"
        timestamptz created_at
        timestamptz updated_at
    }

    RECURRING_TASKS["RECURRING_TASKS"] {
        uuid PK id
        uuid FK source_task_id
        uuid FK workspace_id
        text cron_expression
        text timezone
        timestamptz next_run_at
        timestamptz last_run_at
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    NOTIFICATIONS["NOTIFICATIONS"] {
        uuid PK id
        uuid FK user_id
        uuid FK workspace_id
        text type
        text title
        text message
        text entity_type "polymorphic"
        uuid entity_id
        uuid FK actor_id
        boolean is_read
        timestamptz read_at
        timestamptz created_at
    }

    NOTIFICATION_PREFS["NOTIFICATION_PREFERENCES"] {
        uuid PK id
        uuid FK user_id
        text event_type
        boolean in_app "default true"
        boolean email "default false"
        timestamptz created_at
        timestamptz updated_at
    }

    CUSTOM_FIELD_DEFS }o--|| SPACES_D : "space-scoped"
    CUSTOM_FIELD_VALUES }o--|| TASKS_D : "on task"
    CUSTOM_FIELD_VALUES }o--|| CUSTOM_FIELD_DEFS : "field definition"

    DOCUMENTS }o--|| USERS_D : "created_by"
    DOCUMENTS }o--o| SPACES_D : "optional space"
    DOCUMENTS }o--o| FOLDERS_D : "optional folder"
    DOCUMENTS }o--o| LISTS_D : "optional list"
    DOCUMENTS }o--o| TASKS_D : "optional task"

    DOCUMENT_VERSIONS }o--|| DOCUMENTS : "versions of"
    DOCUMENT_VERSIONS }o--|| USERS_D : "author"

    ATTACHMENTS }o--|| USERS_D : "uploaded_by"

    SAVED_VIEWS }o--|| LISTS_D : "saves view for"
    SAVED_VIEWS }o--|| USERS_D : "owned by"

    RECURRING_TASKS }o--|| TASKS_D : "template task"
    RECURRING_TASKS }o--|| USERS_D : "for workspace"

    NOTIFICATIONS }o--|| USERS_D : "recipient"
    NOTIFICATIONS }o--|| USERS_D : "actor"
    NOTIFICATIONS }o--|| USERS_D : "for user"

    NOTIFICATION_PREFS }o--|| USERS_D : "per user"
```

> **`DOCUMENTS`**: Polymorphic container — can be attached to a space, folder, list, or task (or none). The `search_vector` column is a `tsvector` maintained via a trigger for full-text search.  
> **`ATTACHMENTS`**: Polymorphic via `entity_type` + `entity_id` (no FK constraint — validated in application layer). Files are stored in Cloudflare R2; `storage_key` is the object path.  
> **`NOTIFICATIONS`**: Also polymorphic via `entity_type` + `entity_id`.  
> **`NOTIFICATION_PREFERENCES` unique constraint**: `(user_id, event_type)`.  
> **`DOCUMENT_VERSIONS`**: Immutable snapshots; `version_number` is auto-incremented per document.  
> **`RECURRING_TASKS`**: Uses standard cron expressions; `next_run_at` is computed from cron + timezone.

---

## Section 5: `automation` — Automation Engine

```mermaid
erDiagram
    USERS_A["USERS (auth)"] {
        uuid id
    }

    WORKSPACES_A["WORKSPACES"] {
        uuid id
    }

    AUTOMATIONS["AUTOMATIONS"] {
        uuid PK id
        uuid FK workspace_id
        text name
        text description
        jsonb flow "trigger + conditions[] + actions[]"
        boolean is_enabled
        int trigger_count
        uuid FK created_by
        timestamptz created_at
        timestamptz updated_at
    }

    AUTOMATION_RUNS["AUTOMATION_RUNS"] {
        uuid PK id
        uuid FK automation_id
        text status "pending | running | success | failed | cancelled"
        jsonb trigger_event "the event that fired"
        jsonb step_results "per-action results"
        text error_message
        int duration_ms
        timestamptz created_at
    }

    AUTOMATIONS }o--|| WORKSPACES_A : "workspace-scoped"
    AUTOMATIONS }o--|| USERS_A : "created_by"

    AUTOMATION_RUNS }o--|| AUTOMATIONS : "execution of"
```

> **`AUTOMATIONS.flow`** structure:
>
> ```jsonc
> {
>   "trigger": { "type": "task.status_changed", "config": {...} },
>   "conditions": [ { "field": "priority", "operator": "eq", "value": "urgent" } ],
>   "actions": [ { "type": "send_notification", "config": {...} } ]
> }
> ```
>
> **`AUTOMATION_RUNS.step_results`**: Array of per-action outcomes for debugging and audit.  
> **`trigger_count`** is denormalized for fast dashboard queries; actual runs live in `automation_runs`.

---

## Section 6: `integration` — External Services

```mermaid
erDiagram
    USERS_I["USERS (auth)"] {
        uuid id
    }

    WORKSPACES_I["WORKSPACES"] {
        uuid id
    }

    WEBHOOKS["WEBHOOKS"] {
        uuid PK id
        uuid FK workspace_id
        text name
        text url
        text secret "HMAC signing key"
        text_arr events "TEXT[]"
        boolean is_active
        jsonb retry_policy
        uuid FK created_by
        timestamptz created_at
        timestamptz updated_at
    }

    WEBHOOK_DELIVERIES["WEBHOOK_DELIVERIES"] {
        uuid PK id
        uuid FK webhook_id
        text event_type
        jsonb payload
        text status "pending | delivered | failed"
        int attempt
        int response_status
        text response_body
        text error_message
        timestamptz created_at
        timestamptz delivered_at
    }

    CONNECTED_INTEGRATIONS["CONNECTED_INTEGRATIONS"] {
        uuid PK id
        uuid FK workspace_id
        text provider "github | gitlab | slack"
        text access_token "encrypted"
        text refresh_token "encrypted"
        text provider_user_id
        text provider_username
        jsonb sync_config
        uuid FK connected_by
        timestamptz created_at
        timestamptz updated_at
    }

    WEBHOOKS }o--|| WORKSPACES_I : "workspace-scoped"
    WEBHOOKS }o--|| USERS_I : "created_by"

    WEBHOOK_DELIVERIES }o--|| WEBHOOKS : "delivery attempt"

    CONNECTED_INTEGRATIONS }o--|| WORKSPACES_I : "workspace-scoped"
    CONNECTED_INTEGRATIONS }o--|| USERS_I : "connected_by"
```

> **`WEBHOOKS.secret`**: HMAC-256 key used to sign payloads via `X-Sprintio-Signature` header.  
> **`WEBHOOK_DELIVERIES`**: Retained for debugging; old records should be pruned. `attempt` tracks retry count.  
> **`CONNECTED_INTEGRATIONS`**: `access_token` and `refresh_token` are encrypted at rest (application-layer encryption, e.g. `pgcrypto` or envelope encryption via a KMS).  
> **`CONNECTED_INTEGRATIONS`** does NOT have a unique constraint on `(workspace_id, provider)` — a workspace can connect multiple GitHub/GitLab accounts.

---

## Section 7: `analytics` — AI & Metrics

```mermaid
erDiagram
    USERS_AN["USERS (auth)"] {
        uuid id
    }

    WORKSPACES_AN["WORKSPACES"] {
        uuid id
    }

    AI_EMBEDDINGS["AI_EMBEDDINGS"] {
        uuid PK id
        text entity_type "task | document | comment | ..."
        uuid entity_id "polymorphic"
        vector_1536 embedding "pgvector vector(1536)"
        text chunk_text
        int chunk_index
        text model_name
        timestamptz created_at
    }

    AI_USAGE["AI_USAGE"] {
        uuid PK id
        uuid FK user_id
        uuid FK workspace_id
        text operation "summarize | embed | suggest | ..."
        text model "gpt-4o | claude-3 | ..."
        int input_tokens
        int output_tokens
        decimal credits_used
        decimal cost_usd
        timestamptz created_at
    }

    AI_EMBEDDINGS }o--|| USERS_AN : "user context"

    AI_USAGE }o--|| USERS_AN : "user"
    AI_USAGE }o--|| WORKSPACES_AN : "workspace"
```

> **`AI_EMBEDDINGS`**: Uses `pgvector` extension. The `vector(1536)` column supports HNSW and IVFFlat indexes for semantic search. Polymorphic via `entity_type` + `entity_id`.  
> **`AI_EMBEDDINGS` recommended indexes**:
>
> ```sql
> CREATE INDEX idx_ai_embeddings_hnsw ON analytics.ai_embeddings
>   USING hnsw (embedding vector_cosine_ops);
> CREATE INDEX idx_ai_embeddings_entity ON analytics.ai_embeddings
>   (entity_type, entity_id);
> ```
>
> **`AI_USAGE`**: Tracks token consumption and costs for billing dashboards and usage limits.

---

## Section 8: `timeseries` — Time-Series (TimescaleDB)

```mermaid
erDiagram
    USERS_T["USERS (auth)"] {
        uuid id
    }

    WORKSPACES_T["WORKSPACES"] {
        uuid id
    }

    ACTIVITY_LOG["ACTIVITY_LOG"] {
        bigserial PK id
        uuid FK actor_id
        uuid FK workspace_id
        text action "task.created | comment.added | ..."
        text entity_type "polymorphic"
        uuid entity_id
        jsonb changes "diff of what changed"
        text ip_address
        text user_agent
        timestamptz created_at "TIMESTAMPTZ — hypertable partition key"
    }

    ACTIVITY_LOG }o--|| USERS_T : "actor"
    ACTIVITY_LOG }o--|| WORKSPACES_T : "workspace"
```

> **TimescaleDB hypertable**: `activity_log` is partitioned by `created_at` for efficient time-range queries.
>
> ```sql
> SELECT create_hypertable('timeseries.activity_log', 'created_at');
> ```
>
> **Retention policy** (suggested):
>
> ```sql
> SELECT add_retention_policy('timeseries.activity_log', INTERVAL '1 year');
> ```
>
> **Compression policy** (suggested):
>
> ```sql
> SELECT add_compression_policy('timeseries.activity_log', INTERVAL '7 days');
> ```
>
> **`changes`** JSONB captures a `{ before: {...}, after: {...} }` diff for full audit trail.  
> **`entity_type` + `entity_id`** is polymorphic — same pattern as `attachments` and `ai_embeddings`.

---

## Cross-Schema Relationship Map

The following diagram shows how the six schemas connect to each other. Foreign keys cross schema boundaries at three points:

```mermaid
erDiagram
    AUTH_SCHEMA["auth.users"] {
        uuid id
        text email
    }

    WORKSPACE_SCHEMA["workspace.workspaces"] {
        uuid id
        uuid FK owner_id --> auth.users
    }

    WORKSPACE_SCHEMA2["workspace.tasks"] {
        uuid id
    }

    AUTOMATION_SCHEMA["automation.automations"] {
        uuid id
    }

    INTEGRATION_SCHEMA["integration.webhooks"] {
        uuid id
    }

    ANALYTICS_SCHEMA["analytics.ai_embeddings"] {
        uuid id
    }

    TIMESERIES_SCHEMA["timeseries.activity_log"] {
        bigserial id
    }

    WORKSPACE_SCHEMA }o--|| AUTH_SCHEMA : "owner_id FK"
    WORKSPACE_SCHEMA2 }o--|| AUTH_SCHEMA : "assignee_id, created_by FK"

    AUTOMATION_SCHEMA }o--|| WORKSPACE_SCHEMA : "workspace_id FK"
    INTEGRATION_SCHEMA }o--|| WORKSPACE_SCHEMA : "workspace_id FK"

    ANALYTICS_SCHEMA }o--|| AUTH_SCHEMA : "user_id FK"
    ANALYTICS_SCHEMA }o--|| WORKSPACE_SCHEMA : "workspace_id FK"

    TIMESERIES_SCHEMA }o--|| AUTH_SCHEMA : "actor_id FK"
    TIMESERIES_SCHEMA }o--|| WORKSPACE_SCHEMA : "workspace_id FK"
```

### Cross-Schema FK Summary

| Source Table                         | FK Column                   | Target Schema | Target Table | Notes                      |
| ------------------------------------ | --------------------------- | ------------- | ------------ | -------------------------- |
| `workspace.workspaces`               | `owner_id`                  | `auth`        | `users`      | Required FK                |
| `workspace.memberships`              | `user_id`                   | `auth`        | `users`      | Required FK                |
| `workspace.teams`                    | (indirect via team_members) | `auth`        | `users`      | Via `team_members.user_id` |
| `workspace.tasks`                    | `assignee_id`               | `auth`        | `users`      | Nullable FK                |
| `workspace.tasks`                    | `created_by`                | `auth`        | `users`      | Required FK                |
| `workspace.comments`                 | `author_id`                 | `auth`        | `users`      | Required FK                |
| `workspace.documents`                | `created_by`                | `auth`        | `users`      | Required FK                |
| `workspace.attachments`              | `uploaded_by`               | `auth`        | `users`      | Required FK                |
| `auth.api_keys`                      | `workspace_id`              | `workspace`   | `workspaces` | Required FK                |
| `automation.automations`             | `workspace_id`              | `workspace`   | `workspaces` | Required FK                |
| `automation.automations`             | `created_by`                | `auth`        | `users`      | Required FK                |
| `integration.webhooks`               | `workspace_id`              | `workspace`   | `workspaces` | Required FK                |
| `integration.webhooks`               | `created_by`                | `auth`        | `users`      | Required FK                |
| `integration.connected_integrations` | `workspace_id`              | `workspace`   | `workspaces` | Required FK                |
| `integration.connected_integrations` | `connected_by`              | `auth`        | `users`      | Required FK                |
| `analytics.ai_usage`                 | `user_id`                   | `auth`        | `users`      | Required FK                |
| `analytics.ai_usage`                 | `workspace_id`              | `workspace`   | `workspaces` | Required FK                |
| `timeseries.activity_log`            | `actor_id`                  | `auth`        | `users`      | Required FK                |
| `timeseries.activity_log`            | `workspace_id`              | `workspace`   | `workspaces` | Required FK                |

---

## Table Count by Schema

| Schema                      | Table Count | Tables                                                                                                                                                                                                                                    |
| --------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`                      | 4           | users, user_accounts, sessions, api_keys                                                                                                                                                                                                  |
| `workspace`                 | 18          | workspaces, memberships, teams, team_members, spaces, folders, lists, tasks, task_relationships, custom_field_definitions, custom_field_values, labels, comments, documents, document_versions, attachments, saved_views, recurring_tasks |
| `workspace` (notifications) | 3           | notifications, notification_preferences, — (included in workspace schema)                                                                                                                                                                 |
| `automation`                | 2           | automations, automation_runs                                                                                                                                                                                                              |
| `integration`               | 3           | webhooks, webhook_deliveries, connected_integrations                                                                                                                                                                                      |
| `analytics`                 | 2           | ai_embeddings, ai_usage                                                                                                                                                                                                                   |
| `timeseries`                | 1           | activity_log                                                                                                                                                                                                                              |
| **Total**                   | **~33**     |                                                                                                                                                                                                                                           |

---

## Full Table Reference (Alphabetical)

| #   | Schema        | Table                    | PK Type   | Notable Columns                                     |
| --- | ------------- | ------------------------ | --------- | --------------------------------------------------- |
| 1   | `analytics`   | ai_embeddings            | UUID      | `embedding vector(1536)`, polymorphic               |
| 2   | `analytics`   | ai_usage                 | UUID      | `credits_used`, `cost_usd`, token counts            |
| 3   | `automation`  | automation_runs          | UUID      | `step_results JSONB`, `duration_ms`                 |
| 4   | `automation`  | automations              | UUID      | `flow JSONB` (trigger+conditions+actions)           |
| 5   | `auth`        | api_keys                 | UUID      | `key_prefix`, `key_hash`, `scopes TEXT[]`           |
| 6   | `auth`        | sessions                 | UUID      | `token_hash`, `revoked_at` (soft delete)            |
| 7   | `auth`        | user_accounts            | UUID      | OAuth provider linking                              |
| 8   | `auth`        | users                    | UUID      | Core identity; `email` unique                       |
| 9   | `integration` | connected_integrations   | UUID      | `access_token` encrypted, `sync_config`             |
| 10  | `integration` | webhook_deliveries       | UUID      | Delivery audit trail with retries                   |
| 11  | `integration` | webhooks                 | UUID      | `secret` HMAC, `events TEXT[]`                      |
| 12  | `timeseries`  | activity_log             | BIGSERIAL | TimescaleDB hypertable, `changes JSONB`             |
| 13  | `workspace`   | attachments              | UUID      | Polymorphic (`entity_type`+`entity_id`), R2 storage |
| 14  | `workspace`   | comments                 | UUID      | Threaded (self-FK), `reactions JSONB`               |
| 15  | `workspace`   | custom_field_definitions | UUID      | 12 field types, `config JSONB`                      |
| 16  | `workspace`   | custom_field_values      | UUID      | Nullable typed columns per field type               |
| 17  | `workspace`   | document_versions        | UUID      | Immutable content snapshots                         |
| 18  | `workspace`   | documents                | UUID      | `tsvector` search, `yjs_state BYTEA`, polymorphic   |
| 19  | `workspace`   | folders                  | UUID      | Materialized path, self-referencing                 |
| 20  | `workspace`   | labels                   | UUID      | Workspace-scoped, `UNIQUE(workspace_id, name)`      |
| 21  | `workspace`   | lists                    | UUID      | `view_config JSONB`, optional folder                |
| 22  | `workspace`   | memberships              | UUID      | 5 roles, 3 statuses, `guest_scopes`                 |
| 23  | `workspace`   | notification_preferences | UUID      | Per-event `in_app`/`email` toggles                  |
| 24  | `workspace`   | notifications            | UUID      | Polymorphic, actor + recipient                      |
| 25  | `workspace`   | recurring_tasks          | UUID      | Cron expression, next/last run                      |
| 26  | `workspace`   | saved_views              | UUID      | `config JSONB` (filters, sorts, grouping)           |
| 27  | `workspace`   | spaces                   | UUID      | `statuses JSONB` (custom workflow)                  |
| 28  | `workspace`   | task_relationships       | UUID      | 4 relationship types                                |
| 29  | `workspace`   | tasks                    | UUID      | TipTap JSONB description, per-list numbering        |
| 30  | `workspace`   | team_members             | UUID      | M:N junction, `UNIQUE(team_id, user_id)`            |
| 31  | `workspace`   | teams                    | UUID      | Self-referencing hierarchy                          |
| 32  | `workspace`   | workspaces               | UUID      | `plan`, `settings JSONB`, slug unique               |
