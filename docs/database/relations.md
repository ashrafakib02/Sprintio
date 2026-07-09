# Sprintio — Entity Relations Reference

> **Database:** PostgreSQL 16 · **Schemas:** 6 · **Tables:** 36 · **Foreign Keys:** 58
> Last updated: 2026-07-09

---

## Table of Contents

1. [Schema Overview](#1-schema-overview)
2. [Foreign Key Reference Table](#2-foreign-key-reference-table)
3. [Schema-by-Schema Relationship Details](#3-schema-by-schema-relationship-details)
4. [Self-Referencing Relationships](#4-self-referencing-relationships)
5. [Polymorphic Relationships](#5-polymorphic-relationships)
6. [Cardinality Diagram](#6-cardinality-diagram)
7. [Constraint Summary](#7-constraint-summary)
8. [Cascade Behaviors](#8-cascade-behaviors)
9. [Cross-Schema Dependencies](#9-cross-schema-dependencies)

---

## 1. Schema Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Sprintio Database                               │
│                                                                         │
│  ┌─────────┐  ┌───────────┐  ┌────────────┐  ┌────────────┐            │
│  │  auth   │  │ workspace │  │ automation │  │ integration│            │
│  │         │  │           │  │            │  │            │            │
│  │ 4 tables│  │ 21 tables │  │ 2 tables   │  │ 3 tables   │            │
│  └────┬────┘  └─────┬─────┘  └─────┬──────┘  └─────┬──────┘            │
│       │             │              │               │                    │
│       │             │              │               │                    │
│  ┌────┴────┐  ┌─────┴─────┐                                  │
│  │analytics│  │ timeseries│                                  │
│  │         │  │           │                                  │
│  │2 tables │  │ 1 table   │                                  │
│  └─────────┘  └───────────┘                                  │
│                                                              │
└──────────────────────────────────────────────────────────────────────────┘
```

### Table Counts by Schema

| Schema | Tables | Key Entities |
|--------|--------|-------------|
| `auth` | 4 | users, user_accounts, sessions, api_keys |
| `workspace` | 21 | workspaces, memberships, teams, spaces, folders, lists, tasks, comments, documents, labels, … |
| `automation` | 2 | automations, automation_runs |
| `integration` | 3 | webhooks, webhook_deliveries, connected_integrations |
| `analytics` | 2 | ai_embeddings, ai_usage |
| `timeseries` | 1 | activity_log |

---

## 2. Foreign Key Reference Table

### 2.1 `auth` Schema

| Source Table | Source Column | Target Table | Target Column | ON DELETE | ON UPDATE |
|---|---|---|---|---|---|
| `auth.user_accounts` | `user_id` | `auth.users` | `id` | CASCADE | CASCADE |
| `auth.sessions` | `user_id` | `auth.users` | `id` | CASCADE | CASCADE |
| `auth.api_keys` | `user_id` | `auth.users` | `id` | CASCADE | CASCADE |
| `auth.api_keys` | `workspace_id` | `workspace.workspaces` | `id` | SET NULL | CASCADE |

### 2.2 `workspace` Schema

| Source Table | Source Column | Target Table | Target Column | ON DELETE | ON UPDATE |
|---|---|---|---|---|---|
| `workspace.workspaces` | `owner_id` | `auth.users` | `id` | RESTRICT | CASCADE |
| `workspace.memberships` | `workspace_id` | `workspace.workspaces` | `id` | CASCADE | CASCADE |
| `workspace.memberships` | `user_id` | `auth.users` | `id` | CASCADE | CASCADE |
| `workspace.memberships` | `invited_by` | `auth.users` | `id` | SET NULL | CASCADE |
| `workspace.teams` | `workspace_id` | `workspace.workspaces` | `id` | CASCADE | CASCADE |
| `workspace.teams` | `parent_team_id` | `workspace.teams` | `id` | SET NULL | CASCADE |
| `workspace.team_members` | `team_id` | `workspace.teams` | `id` | CASCADE | CASCADE |
| `workspace.team_members` | `user_id` | `auth.users` | `id` | CASCADE | CASCADE |
| `workspace.spaces` | `workspace_id` | `workspace.workspaces` | `id` | CASCADE | CASCADE |
| `workspace.spaces` | `created_by` | `auth.users` | `id` | RESTRICT | CASCADE |
| `workspace.folders` | `space_id` | `workspace.spaces` | `id` | CASCADE | CASCADE |
| `workspace.folders` | `parent_id` | `workspace.folders` | `id` | CASCADE | CASCADE |
| `workspace.lists` | `space_id` | `workspace.spaces` | `id` | CASCADE | CASCADE |
| `workspace.lists` | `folder_id` | `workspace.folders` | `id` | SET NULL | CASCADE |
| `workspace.lists` | `created_by` | `auth.users` | `id` | RESTRICT | CASCADE |
| `workspace.tasks` | `list_id` | `workspace.lists` | `id` | CASCADE | CASCADE |
| `workspace.tasks` | `parent_id` | `workspace.tasks` | `id` | CASCADE | CASCADE |
| `workspace.tasks` | `assignee_id` | `auth.users` | `id` | SET NULL | CASCADE |
| `workspace.tasks` | `created_by` | `auth.users` | `id` | RESTRICT | CASCADE |
| `workspace.task_relationships` | `source_task_id` | `workspace.tasks` | `id` | CASCADE | CASCADE |
| `workspace.task_relationships` | `target_task_id` | `workspace.tasks` | `id` | CASCADE | CASCADE |
| `workspace.custom_field_definitions` | `space_id` | `workspace.spaces` | `id` | CASCADE | CASCADE |
| `workspace.custom_field_values` | `task_id` | `workspace.tasks` | `id` | CASCADE | CASCADE |
| `workspace.custom_field_values` | `definition_id` | `workspace.custom_field_definitions` | `id` | CASCADE | CASCADE |
| `workspace.labels` | `workspace_id` | `workspace.workspaces` | `id` | CASCADE | CASCADE |
| `workspace.comments` | `task_id` | `workspace.tasks` | `id` | CASCADE | CASCADE |
| `workspace.comments` | `parent_id` | `workspace.comments` | `id` | CASCADE | CASCADE |
| `workspace.comments` | `author_id` | `auth.users` | `id` | RESTRICT | CASCADE |
| `workspace.comments` | `resolved_by` | `auth.users` | `id` | SET NULL | CASCADE |
| `workspace.documents` | `workspace_id` | `workspace.workspaces` | `id` | CASCADE | CASCADE |
| `workspace.documents` | `space_id` | `workspace.spaces` | `id` | SET NULL | CASCADE |
| `workspace.documents` | `folder_id` | `workspace.folders` | `id` | SET NULL | CASCADE |
| `workspace.documents` | `list_id` | `workspace.lists` | `id` | SET NULL | CASCADE |
| `workspace.documents` | `task_id` | `workspace.tasks` | `id` | SET NULL | CASCADE |
| `workspace.documents` | `created_by` | `auth.users` | `id` | RESTRICT | CASCADE |
| `workspace.document_versions` | `document_id` | `workspace.documents` | `id` | CASCADE | CASCADE |
| `workspace.document_versions` | `author_id` | `auth.users` | `id` | RESTRICT | CASCADE |
| `workspace.attachments` | `uploaded_by` | `auth.users` | `id` | RESTRICT | CASCADE |
| `workspace.saved_views` | `list_id` | `workspace.lists` | `id` | CASCADE | CASCADE |
| `workspace.saved_views` | `user_id` | `auth.users` | `id` | CASCADE | CASCADE |
| `workspace.notifications` | `user_id` | `auth.users` | `id` | CASCADE | CASCADE |
| `workspace.notifications` | `workspace_id` | `workspace.workspaces` | `id` | CASCADE | CASCADE |
| `workspace.notifications` | `actor_id` | `auth.users` | `id` | SET NULL | CASCADE |
| `workspace.notification_preferences` | `user_id` | `auth.users` | `id` | CASCADE | CASCADE |
| `workspace.recurring_tasks` | `source_task_id` | `workspace.tasks` | `id` | CASCADE | CASCADE |
| `workspace.recurring_tasks` | `workspace_id` | `workspace.workspaces` | `id` | CASCADE | CASCADE |

### 2.3 `automation` Schema

| Source Table | Source Column | Target Table | Target Column | ON DELETE | ON UPDATE |
|---|---|---|---|---|---|
| `automation.automations` | `workspace_id` | `workspace.workspaces` | `id` | CASCADE | CASCADE |
| `automation.automations` | `created_by` | `auth.users` | `id` | RESTRICT | CASCADE |
| `automation.automation_runs` | `automation_id` | `automation.automations` | `id` | CASCADE | CASCADE |

### 2.4 `integration` Schema

| Source Table | Source Column | Target Table | Target Column | ON DELETE | ON UPDATE |
|---|---|---|---|---|---|
| `integration.webhooks` | `workspace_id` | `workspace.workspaces` | `id` | CASCADE | CASCADE |
| `integration.webhooks` | `created_by` | `auth.users` | `id` | RESTRICT | CASCADE |
| `integration.webhook_deliveries` | `webhook_id` | `integration.webhooks` | `id` | CASCADE | CASCADE |
| `integration.connected_integrations` | `workspace_id` | `workspace.workspaces` | `id` | CASCADE | CASCADE |
| `integration.connected_integrations` | `connected_by` | `auth.users` | `id` | RESTRICT | CASCADE |

### 2.5 `analytics` Schema

| Source Table | Source Column | Target Table | Target Column | ON DELETE | ON UPDATE |
|---|---|---|---|---|---|
| `analytics.ai_usage` | `user_id` | `auth.users` | `id` | SET NULL | CASCADE |
| `analytics.ai_usage` | `workspace_id` | `workspace.workspaces` | `id` | SET NULL | CASCADE |

> **Note:** `analytics.ai_embeddings` uses a polymorphic reference (`entity_type` + `entity_id`) with no physical FK constraint — referential integrity is enforced at the application layer.

### 2.6 `timeseries` Schema

| Source Table | Source Column | Target Table | Target Column | ON DELETE | ON UPDATE |
|---|---|---|---|---|---|
| `timeseries.activity_log` | `actor_id` | `auth.users` | `id` | SET NULL | CASCADE |
| `timeseries.activity_log` | `workspace_id` | `workspace.workspaces` | `id` | CASCADE | CASCADE |

---

## 3. Schema-by-Schema Relationship Details

### 3.1 `auth` — Identity & Authentication

```
                    ┌──────────────┐
                    │  auth.users  │
                    │              │
                    │  id (PK)     │
                    │  email       │
                    │  name        │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
    ┌─────────────────┐ ┌──────────┐ ┌──────────────┐
    │  user_accounts  │ │ sessions │ │   api_keys   │
    │                 │ │          │ │              │
    │  user_id ───────┤ │ user_id ─┤ │ user_id ─────┤
    │  provider       │ │ token    │ │ workspace_id │──┐
    │  provider_id    │ │ expires  │ │ key_hash     │  │
    └─────────────────┘ └──────────┘ └──────────────┘  │
                                                       │
                                         ┌─────────────┘
                                         ▼
                               ┌──────────────────┐
                               │workspace.workspaces│
                               └──────────────────┘
```

#### `auth.users` — The Identity Root

The standalone identity entity. Every person in Sprintio is represented exactly once here. This table has **no foreign keys** — it is the root of the entire reference graph. All other schemas depend on it.

**Business meaning:** A single, authoritative identity record. One user can own multiple workspaces, belong to many teams, and have many linked external accounts.

**Referenced by 25+ FKs across all 6 schemas.**

#### `auth.user_accounts` → `auth.users`

| Property | Value |
|---|---|
| FK | `user_accounts.user_id → users.id` |
| Cardinality | Many-to-One (many accounts → one user) |
| Cascade | DELETE CASCADE, UPDATE CASCADE |
| Nullable | No |

**Business meaning:** Links a Sprintio user to external identity providers (Google, GitHub, SAML, etc.). A single user can have multiple accounts — e.g., both a Google login and a GitHub login. This enables multi-provider SSO without duplicating identity records.

#### `auth.sessions` → `auth.users`

| Property | Value |
|---|---|
| FK | `sessions.user_id → users.id` |
| Cardinality | Many-to-One (many sessions → one user) |
| Cascade | DELETE CASCADE, UPDATE CASCADE |
| Nullable | No |

**Business meaning:** Tracks active login sessions. When a user is deleted, all their sessions are destroyed. Sessions are ephemeral and exist only to authenticate a specific user across requests.

#### `auth.api_keys` → `auth.users` + `workspace.workspaces`

| Property | Value |
|---|---|
| FK1 | `api_keys.user_id → users.id` |
| FK2 | `api_keys.workspace_id → workspaces.id` |
| Cardinality | Many-to-One (many API keys → one user, optional workspace scope) |
| Cascade1 | DELETE CASCADE, UPDATE CASCADE |
| Cascade2 | DELETE SET NULL, UPDATE CASCADE |
| Nullable | `workspace_id` is nullable |

**Business meaning:** Long-lived tokens for programmatic access (CI/CD, integrations, CLI). Each key belongs to exactly one user. If a workspace is deleted, the key's workspace scope is removed (SET NULL) but the key persists with user-level access only. This prevents breaking integrations when a workspace is restructured.

---

### 3.2 `workspace` — Core Business Entities

This is the largest schema with 21 tables, forming the operational heart of Sprintio.

#### Hierarchy Overview

```
workspaces
  ├── memberships (users ↔ workspaces)
  ├── teams
  │     └── team_members (users ↔ teams)
  ├── spaces
  │     ├── folders (recursive)
  │     ├── lists
  │     │     ├── tasks (recursive for subtasks)
  │     │     │     ├── task_relationships
  │     │     │     ├── custom_field_values
  │     │     │     ├── comments (recursive for threads)
  │     │     │     └── attachments (polymorphic)
  │     │     └── saved_views
  │     └── custom_field_definitions
  ├── labels
  ├── documents
  │     └── document_versions
  ├── notifications
  ├── notification_preferences
  └── recurring_tasks
```

#### `workspace.workspaces` → `auth.users`

| Property | Value |
|---|---|
| FK | `workspaces.owner_id → users.id` |
| Cardinality | Many-to-One (many workspaces → one owner) |
| Cascade | DELETE RESTRICT, UPDATE CASCADE |
| Nullable | No |

**Business meaning:** Every workspace has exactly one owner — the user who created it. The RESTRICT on delete is critical: you cannot delete a user who owns workspaces without first transferring ownership or deleting the workspaces. This prevents orphaned workspaces.

#### `workspace.memberships` → `workspace.workspaces` + `auth.users` (×2)

| Property | Value |
|---|---|
| FK1 | `memberships.workspace_id → workspaces.id` |
| FK2 | `memberships.user_id → users.id` |
| FK3 | `memberships.invited_by → users.id` |
| Cardinality | Many-to-Many junction (users ↔ workspaces), enriched with role + invitation metadata |
| Cascade1 | DELETE CASCADE, UPDATE CASCADE |
| Cascade2 | DELETE CASCADE, UPDATE CASCADE |
| Cascade3 | DELETE SET NULL, UPDATE CASCADE |
| Nullable | `invited_by` is nullable |

**Business meaning:** The RBAC foundation. Each row represents one user's membership in one workspace with a specific role (`owner`, `admin`, `member`, `guest`). The `invited_by` column tracks who extended the invitation — if that user is deleted, the invitation record survives (SET NULL). A UNIQUE constraint on `(workspace_id, user_id)` prevents duplicate memberships.

#### `workspace.teams` → `workspace.workspaces` + `workspace.teams` (self)

| Property | Value |
|---|---|
| FK1 | `teams.workspace_id → workspaces.id` |
| FK2 | `teams.parent_team_id → teams.id` |
| Cardinality | Many-to-One (teams → workspace), self-referencing (child → parent) |
| Cascade1 | DELETE CASCADE, UPDATE CASCADE |
| Cascade2 | DELETE SET NULL, UPDATE CASCADE |
| Nullable | `parent_team_id` is nullable |

**Business meaning:** Teams group users within a workspace. Supports nested hierarchies — a team can have a parent team, forming an organizational tree. Deleting a parent team promotes children to top-level (SET NULL) rather than cascading, preserving team structure during reorganization.

#### `workspace.team_members` → `workspace.teams` + `auth.users`

| Property | Value |
|---|---|
| FK1 | `team_members.team_id → teams.id` |
| FK2 | `team_members.user_id → users.id` |
| Cardinality | Many-to-Many junction (users ↔ teams) |
| Cascade | DELETE CASCADE, UPDATE CASCADE on both |
| Nullable | No |

**Business meaning:** Assigns users to teams. Deleting a team removes all its memberships. Deleting a user removes all their team assignments.

#### `workspace.spaces` → `workspace.workspaces` + `auth.users`

| Property | Value |
|---|---|
| FK1 | `spaces.workspace_id → workspaces.id` |
| FK2 | `spaces.created_by → users.id` |
| Cardinality | Many-to-One (spaces → workspace, spaces → creator) |
| Cascade1 | DELETE CASCADE, UPDATE CASCADE |
| Cascade2 | DELETE RESTRICT, UPDATE CASCADE |
| Nullable | No |

**Business meaning:** Spaces are high-level organizational containers within a workspace (e.g., "Engineering", "Marketing"). The RESTRICT on `created_by` preserves audit trail — you cannot delete a user who created spaces without first reassigning or removing them.

#### `workspace.folders` → `workspace.spaces` + `workspace.folders` (self)

| Property | Value |
|---|---|
| FK1 | `folders.space_id → spaces.id` |
| FK2 | `folders.parent_id → folders.id` |
| Cardinality | Many-to-One (folders → space), self-referencing (child → parent) |
| Cascade1 | DELETE CASCADE, UPDATE CASCADE |
| Cascade2 | DELETE CASCADE, UPDATE CASCADE |
| Nullable | `parent_id` is nullable |

**Business meaning:** Folders provide nested organization within a space. Unlike teams, deleting a parent folder cascades to delete all child folders — this is because folders are purely organizational (unlike teams which contain people and have independent value).

#### `workspace.lists` → `workspace.spaces` + `workspace.folders` + `auth.users`

| Property | Value |
|---|---|
| FK1 | `lists.space_id → spaces.id` |
| FK2 | `lists.folder_id → folders.id` |
| FK3 | `lists.created_by → users.id` |
| Cardinality | Many-to-One (lists → space, optional folder, one creator) |
| Cascade1 | DELETE CASCADE, UPDATE CASCADE |
| Cascade2 | DELETE SET NULL, UPDATE CASCADE |
| Cascade3 | DELETE RESTRICT, UPDATE CASCADE |
| Nullable | `folder_id` is nullable |

**Business meaning:** Lists are the primary unit of work organization (similar to boards, to-do lists, or sprints). A list lives in exactly one space and optionally in one folder. If the folder is deleted, the list moves to the space root (SET NULL).

#### `workspace.tasks` → `workspace.lists` + `workspace.tasks` (self) + `auth.users` (×2)

| Property | Value |
|---|---|
| FK1 | `tasks.list_id → lists.id` |
| FK2 | `tasks.parent_id → tasks.id` |
| FK3 | `tasks.assignee_id → users.id` |
| FK4 | `tasks.created_by → users.id` |
| Cardinality | Many-to-One (tasks → list), self-referencing (subtask → parent), optional assignee, one creator |
| Cascade1 | DELETE CASCADE, UPDATE CASCADE |
| Cascade2 | DELETE CASCADE, UPDATE CASCADE |
| Cascade3 | DELETE SET NULL, UPDATE CASCADE |
| Cascade4 | DELETE RESTRICT, UPDATE CASCADE |
| Nullable | `parent_id` is nullable, `assignee_id` is nullable |

**Business meaning:** The fundamental unit of work. A task belongs to exactly one list. It may have a parent task (subtask relationship) and an optional assignee. The RESTRICT on `created_by` preserves the creation audit trail. If the assignee is deleted, the task becomes unassigned (SET NULL).

**This is the most referenced table in the system — 8 other tables point to it:**

| Referencing Table | Relationship |
|---|---|
| `tasks` (self) | Parent → Subtasks |
| `task_relationships` (×2) | Source + Target task |
| `custom_field_values` | Task's custom field data |
| `comments` | Task's discussion thread |
| `attachments` (polymorphic) | Task's file attachments |
| `recurring_tasks` | Task as recurrence template |
| `documents` | Task's linked document |

#### `workspace.task_relationships` → `workspace.tasks` (×2)

| Property | Value |
|---|---|
| FK1 | `task_relationships.source_task_id → tasks.id` |
| FK2 | `task_relationships.target_task_id → tasks.id` |
| Cardinality | Many-to-Many self-join (tasks ↔ tasks) |
| Cascade | DELETE CASCADE, UPDATE CASCADE on both |
| Nullable | No |

**Business meaning:** Explicit directed relationships between tasks (e.g., "blocks", "is blocked by", "relates to", "duplicates"). Deleting either task removes the relationship. A UNIQUE constraint on `(source_task_id, target_task_id)` prevents duplicate relationships.

#### `workspace.custom_field_definitions` → `workspace.spaces`

| Property | Value |
|---|---|
| FK | `custom_field_definitions.space_id → spaces.id` |
| Cardinality | Many-to-One (definitions → space) |
| Cascade | DELETE CASCADE, UPDATE CASCADE |
| Nullable | No |

**Business meaning:** Defines a custom field schema for a space (e.g., "Priority" dropdown, "Story Points" number). Custom fields are scoped to a space — deleting a space removes all its field definitions.

#### `workspace.custom_field_values` → `workspace.tasks` + `workspace.custom_field_definitions`

| Property | Value |
|---|---|
| FK1 | `custom_field_values.task_id → tasks.id` |
| FK2 | `custom_field_values.definition_id → custom_field_definitions.id` |
| Cardinality | Many-to-One (values → task, values → definition) |
| Cascade | DELETE CASCADE, UPDATE CASCADE on both |
| Nullable | No |

**Business meaning:** Stores the actual value of a custom field for a specific task. A UNIQUE constraint on `(task_id, definition_id)` ensures each task has at most one value per custom field.

#### `workspace.labels` → `workspace.workspaces`

| Property | Value |
|---|---|
| FK | `labels.workspace_id → workspaces.id` |
| Cardinality | Many-to-One (labels → workspace) |
| Cascade | DELETE CASCADE, UPDATE CASCADE |
| Nullable | No |

**Business meaning:** Workspace-scoped tags/labels for categorizing tasks. Deleting a workspace removes all its labels. Tasks reference labels through a many-to-many junction table (`task_labels`).

#### `workspace.comments` → `workspace.tasks` + `workspace.comments` (self) + `auth.users` (×2)

| Property | Value |
|---|---|
| FK1 | `comments.task_id → tasks.id` |
| FK2 | `comments.parent_id → comments.id` |
| FK3 | `comments.author_id → users.id` |
| FK4 | `comments.resolved_by → users.id` |
| Cardinality | Many-to-One (comments → task), self-referencing (reply → parent comment), one author, optional resolver |
| Cascade1 | DELETE CASCADE, UPDATE CASCADE |
| Cascade2 | DELETE CASCADE, UPDATE CASCADE |
| Cascade3 | DELETE RESTRICT, UPDATE CASCADE |
| Cascade4 | DELETE SET NULL, UPDATE CASCADE |
| Nullable | `parent_id` is nullable, `resolved_by` is nullable |

**Business meaning:** Discussion threads on tasks with support for threaded replies. The RESTRICT on `author_id` preserves conversation attribution. Resolution tracking records who marked a comment resolved.

#### `workspace.documents` → `workspace.workspaces` + `auth.users` + 4 optional

| Property | Value |
|---|---|
| FK1 | `documents.workspace_id → workspaces.id` |
| FK2 | `documents.space_id → spaces.id` |
| FK3 | `documents.folder_id → folders.id` |
| FK4 | `documents.list_id → lists.id` |
| FK5 | `documents.task_id → tasks.id` |
| FK6 | `documents.created_by → users.id` |
| Cardinality | Many-to-One (documents → workspace, optional space/folder/list/task, one creator) |
| Cascade1 | DELETE CASCADE, UPDATE CASCADE |
| Cascade2 | DELETE SET NULL, UPDATE CASCADE |
| Cascade3 | DELETE SET NULL, UPDATE CASCADE |
| Cascade4 | DELETE SET NULL, UPDATE CASCADE |
| Cascade5 | DELETE SET NULL, UPDATE CASCADE |
| Cascade6 | DELETE RESTRICT, UPDATE CASCADE |
| Nullable | `space_id`, `folder_id`, `list_id`, `task_id` are all nullable |

**Business meaning:** Rich documents (specs, notes, wikis) scoped to multiple levels of the workspace hierarchy. All scope columns are nullable — a document can exist at the workspace level without being attached to any specific entity. When a scoped entity is deleted, the document simply detaches (SET NULL) rather than being destroyed.

#### `workspace.document_versions` → `workspace.documents` + `auth.users`

| Property | Value |
|---|---|
| FK1 | `document_versions.document_id → documents.id` |
| FK2 | `document_versions.author_id → users.id` |
| Cardinality | Many-to-One (versions → document, one author) |
| Cascade1 | DELETE CASCADE, UPDATE CASCADE |
| Cascade2 | DELETE RESTRICT, UPDATE CASCADE |
| Nullable | No |

**Business meaning:** Immutable version history. Deleting a document destroys all its versions (CASCADE). The author is permanently recorded (RESTRICT).

#### `workspace.attachments` → `auth.users` + {tasks, comments, documents} (polymorphic)

| Property | Value |
|---|---|
| FK | `attachments.uploaded_by → users.id` |
| Cardinality | Many-to-One (attachments → uploader) + polymorphic many-to-one |
| Cascade | DELETE RESTRICT, UPDATE CASCADE |
| Nullable | No |

**Business meaning:** File uploads attached to tasks, comments, or documents via a polymorphic association. The uploaded-by reference is preserved for audit (RESTRICT).

#### `workspace.saved_views` → `workspace.lists` + `auth.users`

| Property | Value |
|---|---|
| FK1 | `saved_views.list_id → lists.id` |
| FK2 | `saved_views.user_id → users.id` |
| Cardinality | Many-to-One (views → list, one user) |
| Cascade | DELETE CASCADE, UPDATE CASCADE on both |
| Nullable | No |

**Business meaning:** Named, persisted filter/sort configurations. Users save custom views of lists (e.g., "My High Priority Tasks"). Deleting a list destroys all saved views for it.

#### `workspace.notifications` → `auth.users` (×2) + `workspace.workspaces`

| Property | Value |
|---|---|
| FK1 | `notifications.user_id → users.id` |
| FK2 | `notifications.workspace_id → workspaces.id` |
| FK3 | `notifications.actor_id → users.id` |
| Cardinality | Many-to-One (notifications → recipient, one workspace, optional actor) |
| Cascade1 | DELETE CASCADE, UPDATE CASCADE |
| Cascade2 | DELETE CASCADE, UPDATE CASCADE |
| Cascade3 | DELETE SET NULL, UPDATE CASCADE |
| Nullable | `actor_id` is nullable |

**Business meaning:** User-facing notification feed. Notifications are always tied to a workspace. The `actor_id` is the user who triggered the notification — if deleted, shown as "deleted user" (SET NULL).

#### `workspace.notification_preferences` → `auth.users`

| Property | Value |
|---|---|
| FK | `notification_preferences.user_id → users.id` |
| Cardinality | One-to-One (one preferences record per user, enforced by UNIQUE constraint) |
| Cascade | DELETE CASCADE, UPDATE CASCADE |
| Nullable | No |

**Business meaning:** Per-user notification delivery settings (channels, frequency, mute rules).

#### `workspace.recurring_tasks` → `workspace.tasks` + `workspace.workspaces`

| Property | Value |
|---|---|
| FK1 | `recurring_tasks.source_task_id → tasks.id` |
| FK2 | `recurring_tasks.workspace_id → workspaces.id` |
| Cardinality | Many-to-One (recurring definitions → source task, one workspace) |
| Cascade | DELETE CASCADE, UPDATE CASCADE on both |
| Nullable | No |

**Business meaning:** Defines recurrence rules for tasks. The source task serves as a template — the system creates new tasks from this template on a schedule.

---

### 3.3 `automation` — Workflow Automation

#### `automation.automations` → `workspace.workspaces` + `auth.users`

| Property | Value |
|---|---|
| FK1 | `automations.workspace_id → workspaces.id` |
| FK2 | `automations.created_by → users.id` |
| Cardinality | Many-to-One (automations → workspace, one creator) |
| Cascade1 | DELETE CASCADE, UPDATE CASCADE |
| Cascade2 | DELETE RESTRICT, UPDATE CASCADE |
| Nullable | No |

**Business meaning:** Workflow automation rules (e.g., "when task status changes to Done, notify assignee"). Workspace-scoped.

#### `automation.automation_runs` → `automation.automations`

| Property | Value |
|---|---|
| FK | `automation_runs.automation_id → automations.id` |
| Cardinality | Many-to-One (runs → automation) |
| Cascade | DELETE CASCADE, UPDATE CASCADE |
| Nullable | No |

**Business meaning:** Execution log for each automation trigger. Records success/failure and timing.

---

### 3.4 `integration` — External Connections

#### `integration.webhooks` → `workspace.workspaces` + `auth.users`

| Property | Value |
|---|---|
| FK1 | `webhooks.workspace_id → workspaces.id` |
| FK2 | `webhooks.created_by → users.id` |
| Cardinality | Many-to-One (webhooks → workspace, one creator) |
| Cascade1 | DELETE CASCADE, UPDATE CASCADE |
| Cascade2 | DELETE RESTRICT, UPDATE CASCADE |
| Nullable | No |

**Business meaning:** Outbound HTTP webhook configurations that fire on workspace events.

#### `integration.webhook_deliveries` → `integration.webhooks`

| Property | Value |
|---|---|
| FK | `webhook_deliveries.webhook_id → webhooks.id` |
| Cardinality | Many-to-One (deliveries → webhook) |
| Cascade | DELETE CASCADE, UPDATE CASCADE |
| Nullable | No |

**Business meaning:** Log of each webhook invocation with request/response details and status.

#### `integration.connected_integrations` → `workspace.workspaces` + `auth.users`

| Property | Value |
|---|---|
| FK1 | `connected_integrations.workspace_id → workspaces.id` |
| FK2 | `connected_integrations.connected_by → users.id` |
| Cardinality | Many-to-One (integrations → workspace, one connector) |
| Cascade1 | DELETE CASCADE, UPDATE CASCADE |
| Cascade2 | DELETE RESTRICT, UPDATE CASCADE |
| Nullable | No |

**Business meaning:** Tracks which external services (Slack, GitHub, Jira, etc.) are connected to a workspace.

---

### 3.5 `analytics` — AI & Intelligence

#### `analytics.ai_embeddings` (polymorphic)

| Property | Value |
|---|---|
| Polymorphic FK | `entity_type` + `entity_id` → {tasks, comments, documents} |
| Cardinality | Many-to-One (embeddings → any of tasks/comments/documents) |
| Cascade | Application-layer enforcement (no physical FK) |
| Nullable | N/A |

**Business meaning:** Vector embeddings for semantic search across platform entities. The polymorphic pattern allows a single vector store to serve multiple entity types. No FK constraint — referential integrity is enforced at the application layer.

#### `analytics.ai_usage` → `auth.users` + `workspace.workspaces`

| Property | Value |
|---|---|
| FK1 | `ai_usage.user_id → users.id` |
| FK2 | `ai_usage.workspace_id → workspaces.id` |
| Cardinality | Many-to-One (usage records → optional user, optional workspace) |
| Cascade1 | DELETE SET NULL, UPDATE CASCADE |
| Cascade2 | DELETE SET NULL, UPDATE CASCADE |
| Nullable | Both `user_id` and `workspace_id` are nullable |

**Business meaning:** Tracks AI feature consumption for billing and rate limiting. Both references are nullable to handle system-level AI usage or anonymous usage tracking. SET NULL preserves usage history for billing even after user/workspace deletion.

---

### 3.6 `timeseries` — Activity Tracking

#### `timeseries.activity_log` → `auth.users` + `workspace.workspaces`

| Property | Value |
|---|---|
| FK1 | `activity_log.actor_id → users.id` |
| FK2 | `activity_log.workspace_id → workspaces.id` |
| Cardinality | Many-to-One (log entries → optional actor, one workspace) |
| Cascade1 | DELETE SET NULL, UPDATE CASCADE |
| Cascade2 | DELETE CASCADE, UPDATE CASCADE |
| Nullable | `actor_id` is nullable |

**Business meaning:** Append-only event stream of all platform activity. Powers analytics, audit trails, and timeline views. The actor is nullable to capture system-initiated actions (e.g., automated workflows).

---

## 4. Self-Referencing Relationships

Self-referencing FKs create tree or graph structures within a single table. Sprintio has **5** self-referencing relationships:

### 4.1 `workspace.tasks.parent_id` → `workspace.tasks.id` — Subtask Hierarchy

```
                ┌───────────────┐
                │   Task A      │
                │ parent_id=NULL│
                └───────┬───────┘
                        │
           ┌────────────┼────────────┐
           │            │            │
     ┌─────┴─────┐ ┌───┴───┐ ┌─────┴─────┐
     │  Task B    │ │Task C │ │  Task D    │
     │ parent=A   │ │parent=A│ │ parent=A   │
     └─────┬─────┘ └───────┘ └───────────┘
           │
     ┌─────┴─────┐
     │  Task E    │
     │ parent=B   │
     └───────────┘
```

| Property | Value |
|---|---|
| Column | `tasks.parent_id → tasks.id` |
| Cascade | DELETE CASCADE |
| Nullable | Yes (NULL = root-level task) |
| Depth | Recursive, unlimited (practical limit ~10 levels) |

**Business meaning:** Subtask decomposition. A task can be broken into subtasks, which can themselves have subtasks. Deleting a parent task cascades to destroy all descendant subtasks.

### 4.2 `workspace.folders.parent_id` → `workspace.folders.id` — Folder Nesting

```
Space "Engineering"
  └── Backend/
        ├── API/
        │     └── v2/
        └── Database/
              └── Migrations/
```

| Property | Value |
|---|---|
| Column | `folders.parent_id → folders.id` |
| Cascade | DELETE CASCADE |
| Nullable | Yes (NULL = root folder in space) |
| Scoped by | `space_id` — folders within the same space form a tree |

**Business meaning:** Nested folder organization. Deleting a parent folder cascades to delete all child folders — folders are purely organizational and have no independent identity outside their parent.

### 4.3 `workspace.teams.parent_team_id` → `workspace.teams.id` — Org Hierarchy

```
Workspace "Acme Corp"
  └── Engineering (root)
        ├── Frontend
        │     ├── React Team
        │     └── Mobile Team
        └── Backend
              ├── Platform
              └── Data
```

| Property | Value |
|---|---|
| Column | `teams.parent_team_id → teams.id` |
| Cascade | DELETE SET NULL |
| Nullable | Yes (NULL = top-level team) |
| Scoped by | `workspace_id` — teams within the same workspace form a tree |

**Business meaning:** Organizational hierarchy. **Unlike folders and tasks, SET NULL is used** — deleting a parent team promotes children to top-level rather than cascading, because teams contain people and have independent value.

### 4.4 `workspace.comments.parent_id` → `workspace.comments.id` — Threaded Comments

```
Task: "Implement auth flow"

  Comment A (root)
    ├── Comment B (reply to A)
    │     └── Comment C (reply to B)
    └── Comment D (reply to A)
  Comment E (root, separate thread)
```

| Property | Value |
|---|---|
| Column | `comments.parent_id → comments.id` |
| Cascade | DELETE CASCADE |
| Nullable | Yes (NULL = root comment) |
| Scoped by | `task_id` — comment threads are per-task |

**Business meaning:** Threaded discussion. Deleting a parent comment cascades to delete all replies. Typical depth is 2-3 levels.

### 4.5 Cross-Table Self-Reference: `workspace.task_relationships`

While not a traditional self-referencing FK, `task_relationships` connects two rows from the same `tasks` table through a dedicated junction:

```
Task A ──[blocks]──→ Task B
Task B ──[relates_to]──→ Task C
Task C ──[blocked_by]──→ Task A   (circular dependency allowed)
```

| Property | Value |
|---|---|
| Columns | `source_task_id → tasks.id`, `target_task_id → tasks.id` |
| Cascade | DELETE CASCADE on both |
| Unique | `(source_task_id, target_task_id)` — no duplicate directed edges |

---

## 5. Polymorphic Relationships

Polymorphic associations use a type discriminator column (`entity_type`) alongside an ID column (`entity_id`) to reference one of several possible parent tables. PostgreSQL does not enforce these as formal FK constraints — referential integrity is maintained at the application layer.

### 5.1 `workspace.attachments` → {tasks, comments, documents}

```
                         ┌──────────────────┐
                         │    attachments    │
                         │                  │
                         │ entity_type      │
                         │ entity_id ──────────────────┐
                         │ uploaded_by → users.id      │
                         └──────────────────┘          │
                                                       │
                    ┌──────────────────────────────────┤
                    │                                  │
         ┌──────────┴──────────┐                      │
         │  entity_type =      │                      │
         │  'task'             │                      │
         │                     │                      │
         │  workspace.tasks    │ ◄────────────────────┘
         └─────────────────────┘  entity_id = tasks.id

         ┌─────────────────────┐
         │  entity_type =      │
         │  'comment'          │
         │                     │
         │  workspace.comments │ ◄──────── entity_id = comments.id
         └─────────────────────┘

         ┌─────────────────────┐
         │  entity_type =      │
         │  'document'         │
         │                     │
         │  workspace.documents│ ◄──────── entity_id = documents.id
         └─────────────────────┘
```

| `entity_type` | Parent Table | Business Meaning |
|---|---|---|
| `task` | `workspace.tasks` | File attached to a task |
| `comment` | `workspace.comments` | File attached to a comment (e.g., screenshot) |
| `document` | `workspace.documents` | File attached to a document |

**Constraints:**
- CHECK: `entity_type IN ('task', 'comment', 'document')`
- Referential integrity enforced at application layer (e.g., via trigger or application code)

### 5.2 `analytics.ai_embeddings` → {tasks, comments, documents}

```
                    ┌────────────────────┐
                    │   ai_embeddings    │
                    │                    │
                    │ entity_type        │
                    │ entity_id ──────────────┐
                    │ embedding (vector) │      │
                    └────────────────────┘      │
                                                │
              ┌─────────────────────────────────┤
              │                                 │
   ┌──────────┴──────────┐          ┌──────────┴──────────┐
   │  entity_type =      │          │  entity_type =      │
   │  'task'             │          │  'comment'          │
   │  workspace.tasks    │ ◄────────│  workspace.comments │ ◄──┘
   └─────────────────────┘          └─────────────────────┘

   ┌─────────────────────┐
   │  entity_type =      │
   │  'document'         │
   │  workspace.documents│ ◄──────── entity_id
   └─────────────────────┘
```

| `entity_type` | Parent Table | Business Meaning |
|---|---|---|
| `task` | `workspace.tasks` | Embedding of task title + description |
| `comment` | `workspace.comments` | Embedding of comment body |
| `document` | `workspace.documents` | Embedding of document content |

**Constraints:**
- CHECK: `entity_type IN ('task', 'comment', 'document')`
- UNIQUE: `(entity_type, entity_id)` — one embedding per entity
- Referential integrity enforced at application layer

### Polymorphic Integrity Patterns

Since PostgreSQL cannot enforce polymorphic FKs at the DDL level, recommend one of:

1. **Application-layer validation** — Validate `entity_type` + `entity_id` on every insert/update
2. **Database triggers** — Before INSERT/UPDATE trigger that verifies the referenced entity exists
3. **Deferred constraint triggers** — For complex multi-table scenarios

---

## 6. Cardinality Diagram

### 6.1 Core Entity Relationships (ER Notation)

```
                              ┌──────────────────┐
                              │   auth.users      │
                              │                  │
                              │   PK: id         │
                              └────────┬─────────┘
                                       │
          ┌────────────┬──────────┬─────┼────┬──────────┬────────────┐
          │            │          │     │    │          │            │
          │1:N         │1:N       │1:N  │1:N │1:N       │1:1         │1:N
          ▼            ▼          ▼     ▼    ▼          ▼            ▼
     ┌─────────┐ ┌──────────┐ ┌─────┐ │ ┌──────┐ ┌──────────┐ ┌──────────┐
     │sessions │ │user_     │ │api_ │ │ │member│ │notification│ │activity  │
     │         │ │accounts  │ │keys │ │ │ships │ │_prefs     │ │_log      │
     └─────────┘ └──────────┘ └──┬──┘ │ └──┬───┘ └──────────┘ └──────────┘
                                 │    │    │
                                 │    │    │
                           ┌─────┘    │    │
                           │          │    │
                           ▼          │    ▼
                    ┌────────────┐    │  ┌──────────────┐
                    │workspaces  │◄───┘  │notifications  │
                    │            │──────►│              │
                    │ PK: id     │ 1:N   └──────────────┘
                    └─────┬──────┘
                          │
        ┌─────┬─────┬─────┼─────┬──────┬──────┬──────┬──────┐
        │     │     │     │     │      │      │      │      │
        │1:N  │1:N  │1:N  │1:N  │1:N   │1:N   │1:N   │1:N   │1:N
        ▼     ▼     ▼     ▼     ▼      ▼      ▼      ▼      ▼
    ┌──────┐┌─────┐┌─────┐┌────┐┌────┐┌─────┐┌──────┐┌─────┐┌──────┐
    │teams ││space││label││auto││webh││conn.││recur.││docum.││saved  │
    │      ││     ││     ││    ││ooks││integ││tasks ││ents  ││views  │
    └──┬───┘└──┬──┘└─────┘└──┬─┘└──┬─┘└─────┘└──┬───┘└──┬───┘└──────┘
       │       │             │     │             │       │
       │1:N    │1:N          │     │             │       │
       ▼       ▼             │     │             │       │
    ┌───────┐┌──────┐        │     │             │       │
    │team_  ││      │        │     │             │       │
    │members││folders│◄───────┼─────┼─────┐       │       │
    └───────┘└──┬───┘        │     │     │       │       │
               │1:N          │     │     │       │       │
               ▼             │     │     │       │       │
            ┌──────┐         │     │     │       │       │
            │      │◄────────┼─────┼─────┘       │       │
            │lists │         │     │             │       │
            └──┬───┘         │     │             │       │
               │1:N          │     │             │       │
               ▼             │     │             │       │
            ┌──────┐         │     │             │       │
            │tasks │◄────────┼─────┼─────┐       │       │
            │      │         │     │     │       │       │
            └──┬───┘         │     │     │       │       │
               │             │     │     │       │       │
       ┌───────┼───────┬─────┘     │     │       │       │
       │       │       │           │     │       │       │
       │1:N    │1:N    │1:N        │     │       │       │
       ▼       ▼       ▼           │     │       │       │
    ┌──────┐┌──────┐┌──────────┐   │     │       │       │
    │task_ ││custom││comments  │   │     │       │       │
    │relat.││field_││          │   │     │       │       │
    │      ││values││          │   │     │       │       │
    └──────┘└──────┘└──────────┘   │     │       │       │
                                   │     │       │       │
```

### 6.2 Relationship Type Summary

| Relationship | Type | Via | Description |
|---|---|---|---|
| Users ↔ Workspaces | Many-to-Many | `memberships` | User membership in workspaces with roles |
| Users ↔ Teams | Many-to-Many | `team_members` | User assignment to teams |
| Users → API Keys | One-to-Many | `api_keys.user_id` | User owns many API keys |
| Users → Sessions | One-to-Many | `sessions.user_id` | User has many sessions |
| Users → User Accounts | One-to-Many | `user_accounts.user_id` | User has many linked accounts |
| Users → Workspaces (owner) | One-to-Many | `workspaces.owner_id` | User owns many workspaces |
| Users → Notifications | One-to-Many | `notifications.user_id` | User receives many notifications |
| Users → Activity Log | One-to-Many | `activity_log.actor_id` | User generates many activity events |
| Workspaces → Spaces | One-to-Many | `spaces.workspace_id` | Workspace contains many spaces |
| Workspaces → Teams | One-to-Many | `teams.workspace_id` | Workspace contains many teams |
| Workspaces → Labels | One-to-Many | `labels.workspace_id` | Workspace has many labels |
| Workspaces → Automations | One-to-Many | `automations.workspace_id` | Workspace has many automations |
| Workspaces → Webhooks | One-to-Many | `webhooks.workspace_id` | Workspace has many webhooks |
| Workspaces → Documents | One-to-Many | `documents.workspace_id` | Workspace has many documents |
| Spaces → Folders | One-to-Many | `folders.space_id` | Space contains many folders |
| Spaces → Lists | One-to-Many | `lists.space_id` | Space contains many lists |
| Spaces → Custom Field Defs | One-to-Many | `custom_field_definitions.space_id` | Space defines many custom fields |
| Folders → Folders | One-to-Many (self) | `folders.parent_id` | Nested folder hierarchy |
| Folders → Lists | One-to-Many | `lists.folder_id` | Folder contains many lists |
| Lists → Tasks | One-to-Many | `tasks.list_id` | List contains many tasks |
| Lists → Saved Views | One-to-Many | `saved_views.list_id` | List has many saved views |
| Tasks → Tasks | One-to-Many (self) | `tasks.parent_id` | Task has many subtasks |
| Tasks → Comments | One-to-Many | `comments.task_id` | Task has many comments |
| Tasks → Custom Field Values | One-to-Many | `custom_field_values.task_id` | Task has many field values |
| Tasks ↔ Tasks | Many-to-Many | `task_relationships` | Task dependency relationships |
| Comments → Comments | One-to-Many (self) | `comments.parent_id` | Comment threading |
| Teams → Teams | One-to-Many (self) | `teams.parent_team_id` | Nested team hierarchy |
| Documents → Versions | One-to-Many | `document_versions.document_id` | Document has many versions |
| Automations → Runs | One-to-Many | `automation_runs.automation_id` | Automation has many runs |
| Webhooks → Deliveries | One-to-Many | `webhook_deliveries.webhook_id` | Webhook has many deliveries |
| Notifications → Users | Many-to-One | `notifications.actor_id` | Notification triggered by user |
| {Tasks, Comments, Docs} → Attachments | Many-to-One (polymorphic) | `attachments.entity_type/entity_id` | Entities have many attachments |
| {Tasks, Comments, Docs} → Embeddings | Many-to-One (polymorphic) | `ai_embeddings.entity_type/entity_id` | Entities have many embeddings |
| Users ↔ Notification Prefs | One-to-One | `notification_preferences.user_id` | One preferences record per user |

---

## 7. Constraint Summary

### 7.1 PRIMARY KEY Constraints

All 36 tables use `id` (UUID or SERIAL) as their primary key.

| Schema | Table | PK |
|---|---|---|
| `auth` | `users` | `id` |
| `auth` | `user_accounts` | `id` |
| `auth` | `sessions` | `id` |
| `auth` | `api_keys` | `id` |
| `workspace` | `workspaces` | `id` |
| `workspace` | `memberships` | `id` |
| `workspace` | `teams` | `id` |
| `workspace` | `team_members` | `id` |
| `workspace` | `spaces` | `id` |
| `workspace` | `folders` | `id` |
| `workspace` | `lists` | `id` |
| `workspace` | `tasks` | `id` |
| `workspace` | `task_relationships` | `id` |
| `workspace` | `custom_field_definitions` | `id` |
| `workspace` | `custom_field_values` | `id` |
| `workspace` | `labels` | `id` |
| `workspace` | `comments` | `id` |
| `workspace` | `documents` | `id` |
| `workspace` | `document_versions` | `id` |
| `workspace` | `attachments` | `id` |
| `workspace` | `saved_views` | `id` |
| `workspace` | `notifications` | `id` |
| `workspace` | `notification_preferences` | `id` |
| `workspace` | `recurring_tasks` | `id` |
| `automation` | `automations` | `id` |
| `automation` | `automation_runs` | `id` |
| `integration` | `webhooks` | `id` |
| `integration` | `webhook_deliveries` | `id` |
| `integration` | `connected_integrations` | `id` |
| `analytics` | `ai_embeddings` | `id` |
| `analytics` | `ai_usage` | `id` |
| `timeseries` | `activity_log` | `id` |

### 7.2 UNIQUE Constraints

| Table | Columns | Purpose |
|---|---|---|
| `workspace.memberships` | `(workspace_id, user_id)` | One membership per user per workspace |
| `workspace.team_members` | `(team_id, user_id)` | One membership per user per team |
| `workspace.task_relationships` | `(source_task_id, target_task_id)` | No duplicate directed edges |
| `workspace.custom_field_values` | `(task_id, definition_id)` | One value per custom field per task |
| `workspace.notification_preferences` | `(user_id)` | One preferences record per user |
| `analytics.ai_embeddings` | `(entity_type, entity_id)` | One embedding per entity |

### 7.3 CHECK Constraints

| Table | Column | Constraint |
|---|---|---|
| `auth.user_accounts` | `provider` | `CHECK (provider IN ('email', 'google', 'github', 'saml', 'microsoft', ...))` |
| `auth.user_accounts` | `provider_id` | `CHECK (provider_id != '')` |
| `workspace.memberships` | `role` | `CHECK (role IN ('owner', 'admin', 'member', 'guest'))` |
| `workspace.tasks` | `status` | `CHECK (status IN ('todo', 'in_progress', 'in_review', 'done', 'cancelled'))` |
| `workspace.tasks` | `priority` | `CHECK (priority IN ('urgent', 'high', 'medium', 'low', 'none'))` |
| `workspace.task_relationships` | `relationship_type` | `CHECK (relationship_type IN ('blocks', 'blocked_by', 'relates_to', 'duplicates'))` |
| `workspace.task_relationships` | `source_task_id != target_task_id` | Prevent self-referencing relationships |
| `workspace.custom_field_definitions` | `field_type` | `CHECK (field_type IN ('text', 'number', 'select', 'multi_select', 'date', 'checkbox', 'url'))` |
| `workspace.attachments` | `entity_type` | `CHECK (entity_type IN ('task', 'comment', 'document'))` |
| `workspace.comments` | `parent_id != id` | Prevent self-referencing comments |
| `workspace.folders` | `parent_id != id` | Prevent self-referencing folders |
| `workspace.teams` | `parent_team_id != id` | Prevent self-referencing teams |
| `workspace.tasks` | `parent_id != id` | Prevent self-referencing subtasks |
| `analytics.ai_embeddings` | `entity_type` | `CHECK (entity_type IN ('task', 'comment', 'document'))` |
| `automation.automation_runs` | `status` | `CHECK (status IN ('pending', 'running', 'success', 'failed', 'timeout'))` |
| `integration.webhook_deliveries` | `status` | `CHECK (status IN ('pending', 'success', 'failed', 'retrying'))` |

### 7.4 NOT NULL Constraints (Key Columns)

Every table has NOT NULL on:
- Primary key (`id`)
- All foreign key columns that are not explicitly nullable
- Audit timestamps (`created_at`, `updated_at`)

**Explicitly nullable FK columns:**

| Table | Column | Nullable |
|---|---|---|
| `auth.api_keys` | `workspace_id` | Yes |
| `workspace.memberships` | `invited_by` | Yes |
| `workspace.teams` | `parent_team_id` | Yes |
| `workspace.folders` | `parent_id` | Yes |
| `workspace.lists` | `folder_id` | Yes |
| `workspace.tasks` | `parent_id` | Yes |
| `workspace.tasks` | `assignee_id` | Yes |
| `workspace.comments` | `parent_id` | Yes |
| `workspace.comments` | `resolved_by` | Yes |
| `workspace.documents` | `space_id` | Yes |
| `workspace.documents` | `folder_id` | Yes |
| `workspace.documents` | `list_id` | Yes |
| `workspace.documents` | `task_id` | Yes |
| `workspace.notifications` | `actor_id` | Yes |
| `analytics.ai_usage` | `user_id` | Yes |
| `analytics.ai_usage` | `workspace_id` | Yes |
| `timeseries.activity_log` | `actor_id` | Yes |

---

## 8. Cascade Behaviors

### 8.1 Cascade Strategy Overview

| Strategy | Count | When Used |
|---|---|---|
| **CASCADE** | 32 FKs | Child has no independent meaning without parent |
| **RESTRICT** | 12 FKs | Prevent accidental deletion; require explicit cleanup first |
| **SET NULL** | 14 FKs | Reference is optional; preserve child on parent deletion |

### 8.2 RESTRICT — "Cannot Delete Until Referenced Records Are Handled"

These are the most safety-critical cascade rules. They prevent data loss by requiring explicit cleanup:

| FK | Why RESTRICT |
|---|---|
| `workspaces.owner_id → users.id` | Cannot delete a user who owns workspaces; must transfer ownership first |
| `spaces.created_by → users.id` | Preserve creation audit trail |
| `lists.created_by → users.id` | Preserve creation audit trail |
| `tasks.created_by → users.id` | Preserve creation audit trail |
| `comments.author_id → users.id` | Preserve attribution; show as "deleted user" instead |
| `documents.created_by → users.id` | Preserve creation audit trail |
| `document_versions.author_id → users.id` | Preserve version authorship |
| `attachments.uploaded_by → users.id` | Preserve upload audit trail |
| `automations.created_by → users.id` | Preserve automation creator |
| `webhooks.created_by → users.id` | Preserve webhook creator |
| `connected_integrations.connected_by → users.id` | Preserve who connected the integration |

### 8.3 SET NULL — "Preserve Record, Remove Reference"

| FK | Behavior |
|---|---|
| `api_keys.workspace_id → workspaces.id` | API key persists, loses workspace scope |
| `memberships.invited_by → users.id` | Membership persists, inviter reference lost |
| `teams.parent_team_id → teams.id` | Child teams become top-level |
| `lists.folder_id → folders.id` | Lists move to space root |
| `tasks.assignee_id → users.id` | Task becomes unassigned |
| `comments.resolved_by → users.id` | Resolution record preserved, resolver lost |
| `documents.space_id → spaces.id` | Document becomes workspace-level |
| `documents.folder_id → folders.id` | Document moves to space root |
| `documents.list_id → lists.id` | Document detaches from list |
| `documents.task_id → tasks.id` | Document detaches from task |
| `notifications.actor_id → users.id` | Notification persists, actor shown as "deleted user" |
| `ai_usage.user_id → users.id` | Usage records preserved for billing |
| `ai_usage.workspace_id → workspaces.id` | Usage records preserved for billing |
| `activity_log.actor_id → users.id` | Log preserved, actor shown as "system" |

### 8.4 CASCADE — "Destroy Children When Parent Is Destroyed"

All remaining FKs use CASCADE. These represent true ownership hierarchies where children have no meaning without their parent:

- `user_accounts`, `sessions`, `api_keys` → user deletion destroys auth data
- `memberships`, `teams`, `team_members` → workspace deletion destroys org structure
- `folders`, `lists`, `tasks` → space/list deletion destroys work items
- `task_relationships`, `custom_field_values` → task deletion destroys metadata
- `comments`, `document_versions` → task/document deletion destroys content
- `automation_runs` → automation deletion destroys execution history
- `webhook_deliveries` → webhook deletion destroys delivery logs
- `saved_views`, `notifications`, `notification_preferences` → cascading cleanup
- `recurring_tasks` → workspace/task deletion removes recurrence definitions

---

## 9. Cross-Schema Dependencies

### 9.1 Dependency Graph

```
                    ┌──────────┐
                    │   auth   │ ◄── Foundation schema; no outbound FKs
                    └────┬─────┘
                         │
            Referenced by ALL other schemas
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               │               │
  ┌──────────────┐       │               │
  │  workspace   │       │               │
  └──────┬───────┘       │               │
         │               │               │
    ┌────┼────┬────┬─────┘               │
    │    │    │    │                      │
    ▼    ▼    ▼    ▼                      ▼
┌────────┐┌────────┐┌──────────┐  ┌──────────┐
│automation││integr. ││analytics │  │timeseries│
└────────┘└────────┘└──────────┘  └──────────┘
```

### 9.2 Schema Dependency Matrix

| Source Schema | Depends On | Depended On By |
|---|---|---|
| `auth` | — | `workspace`, `automation`, `integration`, `analytics`, `timeseries` |
| `workspace` | `auth` | `automation`, `integration`, `analytics`, `timeseries` |
| `automation` | `auth`, `workspace` | — |
| `integration` | `auth`, `workspace` | — |
| `analytics` | `auth`, `workspace` | — |
| `timeseries` | `auth`, `workspace` | — |

### 9.3 Cross-Schema FKs

Every cross-schema FK targets either `auth.users.id` or `workspace.workspaces.id`:

| Source Schema.Table | FK Column | Target |
|---|---|---|
| `auth.api_keys` | `workspace_id` | `workspace.workspaces.id` |
| `automation.automations` | `workspace_id` | `workspace.workspaces.id` |
| `automation.automations` | `created_by` | `auth.users.id` |
| `integration.webhooks` | `workspace_id` | `workspace.workspaces.id` |
| `integration.webhooks` | `created_by` | `auth.users.id` |
| `integration.connected_integrations` | `workspace_id` | `workspace.workspaces.id` |
| `integration.connected_integrations` | `connected_by` | `auth.users.id` |
| `analytics.ai_usage` | `user_id` | `auth.users.id` |
| `analytics.ai_usage` | `workspace_id` | `workspace.workspaces.id` |
| `analytics.ai_embeddings` | `entity_id` (poly) | `workspace.{tasks,comments,documents}.id` |
| `timeseries.activity_log` | `actor_id` | `auth.users.id` |
| `timeseries.activity_log` | `workspace_id` | `workspace.workspaces.id` |

### 9.4 Migration Ordering

For schema creation and destruction, respect the dependency graph:

**Create order (respects dependencies):**
1. `auth`
2. `workspace`
3. `automation`, `integration`, `analytics`, `timeseries` (independent of each other)

**Drop order (reverse dependencies):**
1. `automation`, `integration`, `analytics`, `timeseries`
2. `workspace`
3. `auth`

### 9.5 Cross-Schema JOIN Patterns

Common cross-schema queries and their JOIN paths:

| Query Pattern | JOIN Path |
|---|---|
| "Show all tasks assigned to a user across workspaces" | `auth.users → workspace.memberships → workspace.workspaces → workspace.spaces → workspace.lists → workspace.tasks` |
| "List all automations for a workspace with run history" | `workspace.workspaces → automation.automations → automation.automation_runs` |
| "Show activity log with actor names" | `timeseries.activity_log → auth.users (on actor_id)` |
| "Get AI usage by user and workspace" | `analytics.ai_usage → auth.users` + `analytics.ai_usage → workspace.workspaces` |
| "List all webhooks with delivery status for a workspace" | `workspace.workspaces → integration.webhooks → integration.webhook_deliveries` |

---

> **Document version:** 1.0 · **Database:** PostgreSQL 16 · **Generated:** 2026-07-09
