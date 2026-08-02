# Sprintio Domain Model Architecture

> **Status:** Design Document
> **Date:** 2026-08-02
> **Scope:** Complete domain model redesign to enforce the Organization → Workspace → Project → Task hierarchy

---

## Table of Contents

1. [Entity Relationship Diagram](#1-entity-relationship-diagram)
2. [Entity Specifications](#2-entity-specifications)
3. [Relationship Rules](#3-relationship-rules)
4. [Integrity Constraints](#4-integrity-constraints)
5. [Board ↔ Project Relationship Design](#5-board--project-relationship-design)
6. [Sprint ↔ Task Relationship Design](#6-sprint--task-relationship-design)
7. [What Changes vs What Stays](#7-what-changes-vs-what-stays)
8. [Permission & Authorization Model](#8-permission--authorization-model)
9. [Shared Type Definitions (TypeScript)](#9-shared-type-definitions-typescript)
10. [Zod Validation Schemas](#10-zod-validation-schemas)
11. [Repository Patterns & Query Examples](#11-repository-patterns--query-examples)
12. [Drizzle Relations (Complete Code)](#12-drizzle-relations-complete-code)

---

## 1. Entity Relationship Diagram

### Core Hierarchy (The Spine)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│      USER   │       │ORGANIZATION │       │  WORKSPACE  │       │   PROJECT   │
│─────────────│◄──MM──│─────────────│──1:N──│─────────────│──1:N──│─────────────│
│ id       PK │  via  │ id       PK │       │ id       PK │       │ id       PK │
│ email       │ org_  │ name        │       │ name        │       │ name        │
│ name        │ member│ slug    UQ  │       │ slug    UQ  │       │ description │
│ ...         │       │ description │       │ orgId   FK──┼──►Org │ wsId    FK──┼──►Ws
│             │       │ logo        │       │ description │       │ status      │
│             │       │ website     │       │ logo        │       │ startDate   │
│             │       │ archivedAt  │       │ brandColor  │       │ endDate     │
│             │       │ timestamps  │       │ plan        │       │ timestamps  │
│             │       └─────────────┘       │ archivedAt  │       └──────┬──────┘
│             │                             │ timestamps  │              │
│             │                             └──────┬──────┘         ┌───┴───┐
│             │                                    │                │       │
│             │                                    │           ┌────┴───┐ ┌─┴──────┐
│             │                                    │           │SPRINT  │ │  TASK  │
│             │                                    │           │────────│ │────────│
│             │                               MM   │      1:N  │ id  PK │ │id   PK │
│             │◄──────────────────────────────via──┤           │ projId │ │projIdFK│──►Proj
│             │       workspace_members            │           │ FK  ───┼─►Proj   │ │status  │
│             │                                    │           │ name   │ │priority│
│             │                                    │           │ goal   │ │assignee│
│             │                                    │           │ dates  │ │position│
│             │                                    │           │ status │ │labels  │
│             │                                    │           │ ts     │ │dueDate │
│             │                                    │           └────────┘ │sprintId│
│             │                                    │                      │  FK?   │
└─────────────┘                                    │                      │boardId │
                                                   │                      │  FK    │
                                              ┌────┴──┐                   │columnId│
                                              │ BOARD │                   │  FK    │
                                              │───────│                   │ts      │
                                              │ id PK │                   └────────┘
                                              │ name  │
                                              │ projId│
                                              │  FK   │──►Project
                                              │desc   │
                                              │ts     │
                                              └───┬───┘
                                                  │ 1:N
                                              ┌───┴────────┐
                                              │BOARD_COLUMN│
                                              │────────────│
                                              │ id      PK │
                                              │ name       │
                                              │ boardId FK │──►Board
                                              │ position   │
                                              │ color      │
                                              │ timestamp  │
                                              └────────────┘
```

### Membership & RBAC Tables

```
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────┐
│ ORGANIZATION_MEMBERS │     │  WORKSPACE_MEMBERS   │     │   ROLES  │
│──────────────────────│     │──────────────────────│     │──────────│
│ id               PK  │     │ id               PK  │     │ id    PK │
│ organizationId   FK──┼─►O │ workspaceId      FK──┼─►W  │ name     │
│ userId           FK──┼─►U  │ userId           FK──┼─►U  │ scope    │
│ role               │     │ role                │     │ ts       │
│ ts                 │     │ ts                  │     └──────────┘
│ UQ(org_id, user_id) │     │ UQ(ws_id, user_id)  │
└──────────────────────┘     └──────────────────────┘

┌────────────────┐     ┌────────────────┐
│  USER_ROLES    │     │ROLE_PERMISSIONS│
│────────────────│     │────────────────│
│ userId     FK──┼─►U  │ roleId     FK──┼─►Roles
│ roleId     FK──┼─►R  │permId     FK──┼─►Perms
└────────────────┘     └────────────────┘

┌────────────────────┐
│   PERMISSIONS      │
│────────────────────│
│ id             PK  │
│ resource          │
│ action            │
│ ts                │
└────────────────────┘
```

### Complete Relationship Summary

| Parent       | Child           | Cardinality | FK Column                             | Required?      |
| ------------ | --------------- | ----------- | ------------------------------------- | -------------- |
| Organization | Workspace       | 1:N         | `workspaces.organizationId`           | YES (NOT NULL) |
| Workspace    | Project         | 1:N         | `projects.workspaceId`                | YES (NOT NULL) |
| Project      | Task            | 1:N         | `tasks.projectId`                     | YES (NOT NULL) |
| Project      | Sprint          | 1:N         | `sprints.projectId`                   | YES (NOT NULL) |
| Project      | Board           | 1:N         | `boards.projectId`                    | YES (NOT NULL) |
| Board        | BoardColumn     | 1:N         | `board_columns.boardId`               | YES (NOT NULL) |
| Sprint       | Task            | 1:N         | `tasks.sprintId`                      | NO (nullable)  |
| Board        | Task            | 1:N         | `tasks.boardId`                       | YES (NOT NULL) |
| BoardColumn  | Task            | 1:N         | `tasks.columnId`                      | YES (NOT NULL) |
| User         | Task (assignee) | 1:N         | `tasks.assigneeId`                    | NO (nullable)  |
| Organization | OrgMember       | 1:N         | `organization_members.organizationId` | YES            |
| Workspace    | WsMember        | 1:N         | `workspace_members.workspaceId`       | YES            |
| User         | OrgMember       | 1:N         | `organization_members.userId`         | YES            |
| User         | WsMember        | 1:N         | `workspace_members.userId`            | YES            |

---

## 2. Entity Specifications

### 2.1 Organization

**Purpose:** Top-level tenant boundary. Groups users, workspaces, and billing. Every resource ultimately belongs to an organization.

| Field         | Type           | Nullable | Default             | Constraint       | Notes               |
| ------------- | -------------- | -------- | ------------------- | ---------------- | ------------------- |
| `id`          | `uuid`         | NO       | `gen_random_uuid()` | PK               |                     |
| `name`        | `varchar(100)` | NO       | —                   | NOT NULL         | Display name        |
| `slug`        | `varchar(100)` | NO       | —                   | UNIQUE, NOT NULL | URL-safe identifier |
| `description` | `text`         | YES      | `null`              |                  |                     |
| `logo`        | `text`         | YES      | `null`              |                  | URL to logo image   |
| `website`     | `varchar(500)` | YES      | `null`              |                  |                     |
| `createdAt`   | `timestamptz`  | NO       | `now()`             | NOT NULL         |                     |
| `updatedAt`   | `timestamptz`  | NO       | `now()`             | NOT NULL         | Auto-updated        |
| `archivedAt`  | `timestamptz`  | YES      | `null`              |                  | Soft-delete marker  |

**Changes from current:** NONE. Schema is correct as-is.

---

### 2.2 Workspace

**Purpose:** Sub-division within an organization. Owns projects, boards, and member access. Exactly one parent organization.

| Field            | Type           | Nullable | Default             | Constraint                                             | Notes                               |
| ---------------- | -------------- | -------- | ------------------- | ------------------------------------------------------ | ----------------------------------- |
| `id`             | `uuid`         | NO       | `gen_random_uuid()` | PK                                                     |                                     |
| `name`           | `varchar(100)` | NO       | —                   | NOT NULL                                               |                                     |
| `slug`           | `varchar(100)` | NO       | —                   | UNIQUE, NOT NULL                                       |                                     |
| `description`    | `text`         | YES      | `null`              |                                                        |                                     |
| `logo`           | `text`         | YES      | `null`              |                                                        |                                     |
| `brandColor`     | `varchar(7)`   | YES      | `null`              |                                                        | Hex color `#RRGGBB`                 |
| `customDomain`   | `varchar(253)` | YES      | `null`              |                                                        |                                     |
| `organizationId` | `uuid`         | **NO**   | —                   | **FK → organizations.id, NOT NULL, ON DELETE CASCADE** | **CHANGE: was nullable**            |
| `plan`           | `varchar(20)`  | NO       | `'free'`            | NOT NULL                                               | `'free'` / `'pro'` / `'enterprise'` |
| `archivedAt`     | `timestamptz`  | YES      | `null`              |                                                        | Soft-delete                         |
| `createdAt`      | `timestamptz`  | NO       | `now()`             | NOT NULL                                               |                                     |
| `updatedAt`      | `timestamptz`  | NO       | `now()`             | NOT NULL                                               | Auto-updated                        |

**Changes from current:**

- `organizationId`: **nullable → NOT NULL** (critical hierarchy enforcement)
- Add composite unique constraint: `UNIQUE(organizationId, slug)` — slugs only need to be unique within an organization, not globally. The current global `unique()` on slug should be **removed** to allow different organizations to have workspaces with the same slug.

---

### 2.3 Project

**Purpose:** Container for work items (tasks) within a workspace. Owns boards, sprints, and tasks. Exactly one parent workspace.

| Field         | Type           | Nullable | Default             | Constraint                                      | Notes                                            |
| ------------- | -------------- | -------- | ------------------- | ----------------------------------------------- | ------------------------------------------------ |
| `id`          | `uuid`         | NO       | `gen_random_uuid()` | PK                                              |                                                  |
| `name`        | `varchar(100)` | NO       | —                   | NOT NULL                                        |                                                  |
| `description` | `text`         | YES      | `null`              |                                                 |                                                  |
| `workspaceId` | `uuid`         | NO       | —                   | FK → workspaces.id, NOT NULL, ON DELETE CASCADE | Already NOT NULL                                 |
| `status`      | `varchar(20)`  | NO       | `'active'`          | NOT NULL                                        | `'active'`/`'paused'`/`'completed'`/`'archived'` |
| `startDate`   | `timestamptz`  | YES      | `null`              |                                                 |                                                  |
| `endDate`     | `timestamptz`  | YES      | `null`              |                                                 |                                                  |
| `createdAt`   | `timestamptz`  | NO       | `now()`             | NOT NULL                                        |                                                  |
| `updatedAt`   | `timestamptz`  | NO       | `now()`             | NOT NULL                                        | Auto-updated                                     |

**Changes from current:**

- Add composite unique: `UNIQUE(workspaceId, slug)` — projects need a slug field (see below).
- Add `slug` column: `varchar(100)`, NOT NULL — needed for URL routing (`/org/ws/project`).

**New field to add:**

| Field  | Type           | Nullable | Default | Constraint | Notes                                |
| ------ | -------------- | -------- | ------- | ---------- | ------------------------------------ |
| `slug` | `varchar(100)` | NO       | —       | NOT NULL   | URL-safe identifier within workspace |

---

### 2.4 Task

**Purpose:** Atomic unit of work. Belongs to exactly one project. May optionally appear on a board (within that project) and in a sprint (within that project).

| Field         | Type           | Nullable | Default             | Constraint                                        | Notes                                                         |
| ------------- | -------------- | -------- | ------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| `id`          | `uuid`         | NO       | `gen_random_uuid()` | PK                                                |                                                               |
| `title`       | `varchar(255)` | NO       | —                   | NOT NULL                                          |                                                               |
| `description` | `text`         | YES      | `null`              |                                                   | Markdown supported                                            |
| `status`      | `varchar(30)`  | NO       | `'todo'`            | NOT NULL                                          | `'todo'`/`'in_progress'`/`'in_review'`/`'done'`/`'cancelled'` |
| `priority`    | `varchar(20)`  | NO       | `'none'`            | NOT NULL                                          | `'none'`/`'low'`/`'medium'`/`'high'`/`'urgent'`               |
| `projectId`   | `uuid`         | **NO**   | —                   | **FK → projects.id, NOT NULL, ON DELETE CASCADE** | **NEW: primary parent**                                       |
| `boardId`     | `uuid`         | **YES**  | `null`              | **FK → boards.id, ON DELETE SET NULL**            | **CHANGE: was NOT NULL**                                      |
| `columnId`    | `uuid`         | **YES**  | `null`              | **FK → board_columns.id, ON DELETE SET NULL**     | **CHANGE: was NOT NULL**                                      |
| `sprintId`    | `uuid`         | YES      | `null`              | FK → sprints.id, ON DELETE SET NULL               | No change                                                     |
| `assigneeId`  | `uuid`         | YES      | `null`              | FK → users.id, ON DELETE SET NULL                 | No change                                                     |
| `position`    | `integer`      | NO       | `0`                 | NOT NULL                                          | Ordering within board column                                  |
| `labels`      | `jsonb`        | YES      | `[]`                |                                                   | `string[]` typed                                              |
| `dueDate`     | `timestamptz`  | YES      | `null`              |                                                   |                                                               |
| `createdAt`   | `timestamptz`  | NO       | `now()`             | NOT NULL                                          |                                                               |
| `updatedAt`   | `timestamptz`  | NO       | `now()`             | NOT NULL                                          | Auto-updated                                                  |

**Changes from current:**

- **ADD** `projectId` (NOT NULL, FK → projects.id, CASCADE)
- **CHANGE** `boardId`: NOT NULL → nullable (SET NULL on delete)
- **CHANGE** `columnId`: NOT NULL → nullable (SET NULL on delete)
- Remove `boardId` and `columnId` as primary organizational axis — `projectId` becomes the authoritative parent.

**Why boardId/columnId become nullable:**
Tasks can exist in a project without being placed on any board. A task might be created from a list view, API, or automation before being assigned to a board column. The board/column is a _view-layer concern_, not a data-ownership concern.

---

### 2.5 Sprint

**Purpose:** Time-boxed iteration within a project. Groups tasks for focused delivery cycles.

| Field       | Type           | Nullable | Default             | Constraint                                    | Notes                                |
| ----------- | -------------- | -------- | ------------------- | --------------------------------------------- | ------------------------------------ |
| `id`        | `uuid`         | NO       | `gen_random_uuid()` | PK                                            |                                      |
| `projectId` | `uuid`         | NO       | —                   | FK → projects.id, NOT NULL, ON DELETE CASCADE | Already correct                      |
| `name`      | `varchar(100)` | NO       | —                   | NOT NULL                                      | e.g., "Sprint 12"                    |
| `goal`      | `text`         | YES      | `null`              |                                               | Sprint objective                     |
| `startDate` | `timestamptz`  | NO       | —                   | NOT NULL                                      |                                      |
| `endDate`   | `timestamptz`  | NO       | —                   | NOT NULL                                      |                                      |
| `status`    | `varchar(20)`  | NO       | `'planned'`         | NOT NULL                                      | `'planned'`/`'active'`/`'completed'` |
| `createdAt` | `timestamptz`  | NO       | `now()`             | NOT NULL                                      |                                      |

**Changes from current:** NONE. Schema is correct as-is.

---

### 2.6 Board

**Purpose:** A configurable view (Kanban, list, etc.) that organizes tasks from a project into columns. Each board belongs to exactly one project.

| Field         | Type           | Nullable | Default             | Constraint                                        | Notes                               |
| ------------- | -------------- | -------- | ------------------- | ------------------------------------------------- | ----------------------------------- |
| `id`          | `uuid`         | NO       | `gen_random_uuid()` | PK                                                |                                     |
| `name`        | `varchar(100)` | NO       | —                   | NOT NULL                                          | e.g., "Kanban Board", "Bug Tracker" |
| `description` | `text`         | YES      | `null`              |                                                   |                                     |
| `projectId`   | `uuid`         | **NO**   | —                   | **FK → projects.id, NOT NULL, ON DELETE CASCADE** | **CHANGE: was workspaceId**         |
| `createdAt`   | `timestamptz`  | NO       | `now()`             | NOT NULL                                          |                                     |
| `updatedAt`   | `timestamptz`  | NO       | `now()`             | NOT NULL                                          | Auto-updated                        |

**Changes from current:**

- **REMOVE** `workspaceId` column
- **ADD** `projectId` (NOT NULL, FK → projects.id, CASCADE)
- Board is now project-scoped, not workspace-scoped

---

### 2.7 BoardColumn

**Purpose:** A column within a board that defines a stage/status in the workflow (e.g., "To Do", "In Progress", "Done"). Tasks are positioned within columns.

| Field       | Type           | Nullable | Default             | Constraint                                  | Notes                           |
| ----------- | -------------- | -------- | ------------------- | ------------------------------------------- | ------------------------------- |
| `id`        | `uuid`         | NO       | `gen_random_uuid()` | PK                                          |                                 |
| `name`      | `varchar(100)` | NO       | —                   | NOT NULL                                    | Column header                   |
| `boardId`   | `uuid`         | NO       | —                   | FK → boards.id, NOT NULL, ON DELETE CASCADE | Already correct                 |
| `position`  | `integer`      | NO       | `0`                 | NOT NULL                                    | Column ordering (left-to-right) |
| `color`     | `varchar(7)`   | YES      | `null`              |                                             | Hex color for visual grouping   |
| `createdAt` | `timestamptz`  | NO       | `now()`             | NOT NULL                                    |                                 |

**Changes from current:** NONE. Schema is correct as-is.

---

## 3. Relationship Rules

### 3.1 Ownership Hierarchy (Hard FKs)

Every entity has exactly one owner via a required foreign key. Deleting a parent cascades to all children.

```
Organization ──CASCADE──► Workspace ──CASCADE──► Project ──CASCADE──► Task
                                                 │
                                    ┌────────────┼────────────┐
                                    ▼            ▼            ▼
                                 Sprint       Board      (milestones)
                                    │            │
                                    │            ▼
                                    │      BoardColumn
                                    │            │
                                    └──────┬─────┘
                                           ▼
                                         Task
```

| Relationship             | FK Column                   | Required | ON DELETE | ON UPDATE |
| ------------------------ | --------------------------- | -------- | --------- | --------- |
| Organization → Workspace | `workspaces.organizationId` | NOT NULL | CASCADE   | —         |
| Workspace → Project      | `projects.workspaceId`      | NOT NULL | CASCADE   | —         |
| Project → Task           | `tasks.projectId`           | NOT NULL | CASCADE   | —         |
| Project → Sprint         | `sprints.projectId`         | NOT NULL | CASCADE   | —         |
| Project → Board          | `boards.projectId`          | NOT NULL | CASCADE   | —         |
| Board → BoardColumn      | `board_columns.boardId`     | NOT NULL | CASCADE   | —         |

### 3.2 View-Layer Associations (Soft FKs)

Tasks may optionally appear on a board within their parent project. These are view-layer associations, not ownership.

| Relationship       | FK Column        | Required | ON DELETE | ON UPDATE |
| ------------------ | ---------------- | -------- | --------- | --------- |
| Board → Task       | `tasks.boardId`  | nullable | SET NULL  | —         |
| BoardColumn → Task | `tasks.columnId` | nullable | SET NULL  | —         |
| Sprint → Task      | `tasks.sprintId` | nullable | SET NULL  | —         |

**Rationale for SET NULL (not CASCADE):** Removing a board, column, or sprint should not destroy tasks. Tasks are owned by the project. When a board is deleted, tasks on it become "unboarded" — they still exist in the project and can be placed on another board.

### 3.3 User Associations (Soft FKs)

| Relationship           | FK Column              | Required | ON DELETE | ON UPDATE |
| ---------------------- | ---------------------- | -------- | --------- | --------- |
| User → Task (assignee) | `tasks.assigneeId`     | nullable | SET NULL  | —         |
| User ↔ Organization    | `organization_members` | required | CASCADE   | —         |
| User ↔ Workspace       | `workspace_members`    | required | CASCADE   | —         |

### 3.4 Membership & Access Rules

1. **Organization membership** grants access to all workspaces within that organization.
2. **Workspace membership** grants access to all projects, boards, and tasks within that workspace.
3. A user may belong to multiple organizations and multiple workspaces.
4. Workspace access is always validated through its parent organization: `workspace.organizationId → organizationMembers.organizationId`.

**Access validation query pattern:**

```
To access workspace W:
  1. Resolve: W.organizationId → Org
  2. Check: organization_members WHERE orgId = Org AND userId = User
  3. Optionally also check: workspace_members WHERE wsId = W AND userId = User
```

---

## 4. Integrity Constraints

### 4.1 Unique Constraints

| Table                  | Columns                  | Constraint Name               | Purpose                                              |
| ---------------------- | ------------------------ | ----------------------------- | ---------------------------------------------------- |
| `organizations`        | `slug`                   | `organizations_slug_unique`   | Global slug uniqueness                               |
| `workspaces`           | `organizationId, slug`   | `workspaces_org_slug_unique`  | Slug unique per org (REPLACES current global unique) |
| `projects`             | `workspaceId, slug`      | `projects_ws_slug_unique`     | Slug unique per workspace                            |
| `organization_members` | `organizationId, userId` | `org_members_org_user_unique` | No duplicate membership                              |
| `workspace_members`    | `workspaceId, userId`    | `ws_members_ws_user_unique`   | No duplicate membership                              |

### 4.2 NOT NULL Enforcement by Hierarchy

The hierarchy itself enforces "must never exist without parent" through NOT NULL foreign keys:

| Rule                                                  | Enforcement Mechanism                                |
| ----------------------------------------------------- | ---------------------------------------------------- |
| "Every Workspace belongs to exactly one Organization" | `workspaces.organizationId` → NOT NULL               |
| "Every Project belongs to exactly one Workspace"      | `projects.workspaceId` → NOT NULL (already enforced) |
| "Every Task belongs to exactly one Project"           | `tasks.projectId` → NOT NULL (new column)            |
| "Projects must never exist without a Workspace"       | `projects.workspaceId` NOT NULL + FK with CASCADE    |
| "Tasks must never exist without a Project"            | `tasks.projectId` NOT NULL + FK with CASCADE         |
| "Boards must never exist without a Project"           | `boards.projectId` NOT NULL + FK with CASCADE        |
| "Columns must never exist without a Board"            | `board_columns.boardId` NOT NULL (already enforced)  |
| "Sprints must never exist without a Project"          | `sprints.projectId` NOT NULL (already enforced)      |

### 4.3 Check Constraints

```sql
-- Ensure date ranges are valid
ALTER TABLE projects ADD CONSTRAINT projects_dates_check
  CHECK (endDate IS NULL OR startDate IS NULL OR endDate >= startDate);

ALTER TABLE sprints ADD CONSTRAINT sprints_dates_check
  CHECK (endDate >= startDate);

-- Ensure status values are valid (enforced at application layer via Zod schemas,
-- but DB-level check constraints provide defense-in-depth)

ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'in_review', 'done', 'cancelled'));

ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('none', 'low', 'medium', 'high', 'urgent'));

ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('active', 'paused', 'completed', 'archived'));

ALTER TABLE sprints ADD CONSTRAINT sprints_status_check
  CHECK (status IN ('planned', 'active', 'completed'));

-- Ensure position is non-negative
ALTER TABLE tasks ADD CONSTRAINT tasks_position_check
  CHECK (position >= 0);

ALTER TABLE board_columns ADD CONSTRAINT columns_position_check
  CHECK (position >= 0);
```

### 4.4 Board ↔ Task Consistency Rule

When a task has both `boardId` and `columnId` set, the column must belong to the same board:

```sql
-- Application-level invariant (not a DB constraint, but enforced in repository/service layer):
-- If tasks.boardId IS NOT NULL AND tasks.columnId IS NOT NULL,
--   THEN board_columns.boardId = tasks.boardId
```

This is enforced in the service/repository layer rather than as a DB constraint because it spans two tables and would require a trigger.

### 4.5 Sprint ↔ Task Consistency Rule

When a task has `sprintId` set, the sprint must belong to the same project as the task:

```sql
-- Application-level invariant:
-- If tasks.sprintId IS NOT NULL,
--   THEN sprints.projectId = tasks.projectId
```

---

## 5. Board ↔ Project Relationship Design

### The Problem

Currently, boards are workspace-scoped (`boards.workspaceId`), and tasks are board-scoped (`tasks.boardId`). The new hierarchy requires tasks to be project-scoped. We need to decide how boards fit in.

### Three Options Evaluated

#### Option A: Boards Belong to Projects (RECOMMENDED)

```
Project
  ├── Board (Kanban) ──► Columns ──► Tasks (placed here)
  ├── Board (List) ──► Columns ──► Tasks (placed here)
  └── Board (Timeline) ──► Columns ──► Tasks (placed here)
```

- Each project has one or more boards.
- Each board belongs to exactly one project.
- Boards are a _view-layer construct_ — the same task can appear on multiple boards within the same project via different board/column assignments, or not appear on any board at all.
- Columns are scoped to their parent board.

**Pros:**

- Clean hierarchy: Project → Board → Column → Task placement
- Natural fit for project-level Kanban boards
- Tasks have a single authoritative parent (project), board is just a view
- Supports multiple views of the same project data (Kanban, List, Timeline)
- Simple FK model — no cross-entity references

**Cons:**

- Cannot create a "cross-project board" that shows tasks from multiple projects
- Workspace-level dashboards must aggregate from multiple projects

#### Option B: Boards Are Workspace-Level Views Referencing Project Tasks

```
Workspace
  ├── Board (cross-project) ──► References tasks from Project A + Project B
  └── Board (filtered) ──► References tasks from Project A only
```

- Boards stay at workspace level.
- Board columns reference tasks across multiple projects.
- A task can appear on any board in its workspace (or any workspace it belongs to via project chain).

**Pros:**

- Cross-project views (PMO-level boards, team-wide Kanban)
- Maximum flexibility

**Cons:**

- **Circular hierarchy problem:** Task is owned by Project, but board is owned by Workspace. The board references tasks from multiple projects, creating a many-to-many web.
- Complex access control: board access requires checking project access for every task
- Breaks the clean ownership model — who "owns" the board-view of a task?
- Harder to reason about data locality

#### Option C: Boards Are Replaced by Project-Level Kanban Views (No Board Entity)

```
Project
  └── Tasks (with status, column position)
      └── UI renders Kanban board directly from task status/position
```

- Remove the Board and BoardColumn entities entirely.
- Tasks have a `status` field that maps to visual columns.
- The Kanban view is rendered purely from task data — no board configuration needed.

**Pros:**

- Simplest model — fewer tables, fewer FKs
- No board/column management overhead

**Cons:**

- Loses configurable workflows (different projects might need different column sets)
- Cannot have multiple board views of the same project
- Status becomes tightly coupled to visual representation
- Harder to support custom workflows (e.g., a project with "Design" → "Review" → "Approved" → "Dev" → "QA")

### Recommendation: Option A — Boards Belong to Projects

**Rationale:**

1. **Hierarchy purity.** The entire data model flows downward: Organization → Workspace → Project → Board → Column → Task placement. No lateral or upward references.

2. **Task ownership is unambiguous.** A task belongs to exactly one project. Its board/column placement is a _view concern_ that can change without affecting ownership.

3. **Multiple views are supported.** A single project can have a Kanban board, a list board, and a timeline board — each with different columns — all referencing the same pool of project tasks.

4. **Cross-project views are achievable without model complexity.** Workspace-level dashboards can aggregate tasks from multiple projects using read-only queries, API endpoints, or materialized views — without polluting the data model.

5. **Backward compatible.** The migration is straightforward: `ALTER TABLE boards DROP COLUMN workspace_id; ALTER TABLE boards ADD COLUMN project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE;`

---

## 6. Sprint ↔ Task Relationship Design

### Current State

```
Sprint ←── sprints.projectId ── Project
Task ←── tasks.boardId ── Board (workspace-scoped, disconnected from projects)
Task ←── tasks.sprintId ── Sprint
Task ←── tasks.columnId ── BoardColumn
```

Tasks independently reference both a board (via `boardId`) and a sprint (via `sprintId`). There's no enforced relationship between the sprint and the board — a task could be in Sprint 3 but on a board that belongs to a completely different project.

### Target State

```
Project
  ├── Sprint 1 ──► [Task A, Task B] (via tasks.sprintId)
  ├── Sprint 2 ──► [Task C]        (via tasks.sprintId)
  ├── Board (Kanban) ──► [Task A, Task B, Task C] (via tasks.boardId)
  └── Tasks pool: [Task A, Task B, Task C, Task D] (via tasks.projectId)
```

**Key design decisions:**

1. **Tasks are always owned by a Project.** `tasks.projectId` is the authoritative parent FK (NOT NULL).

2. **Sprints are optional groupings within a project.** A task can be assigned to a sprint or remain "unsprinted" (backlog).

3. **Boards are optional view containers.** A task can be placed on a board or remain "unboarded" (visible only in list/filter views).

4. **Sprint ↔ Board consistency is enforced at the application layer.** When a task is placed in a sprint and on a board, the service layer validates that the board belongs to the same project as the sprint. This is a read-time validation, not a write-time FK constraint, because:
   - The sprint and board are independent organizational concepts
   - A task might temporarily reference mismatched sprint/board during transition operations
   - Enforcing this at the DB level would require complex triggers

5. **Task status vs. Board column are distinct.** A task's `status` field is its canonical state (`todo`, `in_progress`, etc.). The `columnId` is its position on a specific board. These are intentionally decoupled:
   - Different boards in the same project might map status values to different columns
   - A task's status can be updated independently of its board position
   - API consumers can filter by status without needing board context

### Lifecycle Examples

**Creating a task in a sprint:**

```
1. Task created with: projectId = P1, sprintId = S1, boardId = null, columnId = null
2. Task appears in sprint backlog
3. User drags task onto board B1 → boardId = B1, columnId = C_todo
```

**Moving task between sprints:**

```
1. Task has: projectId = P1, sprintId = S1, boardId = B1, columnId = C_done
2. User moves to sprint S2 → sprintId = S2
3. Board placement unchanged (board still belongs to same project P1)
```

**Deleting a board:**

```
1. Board B1 deleted (ON DELETE CASCADE removes all board_columns for B1)
2. Tasks with boardId = B1 → boardId = null, columnId = null (SET NULL)
3. Tasks still exist in project, still in their sprints if any
```

**Deleting a sprint:**

```
1. Sprint S1 deleted (tasks have ON DELETE SET NULL on sprintId)
2. Tasks with sprintId = S1 → sprintId = null
3. Tasks remain in project, still on their boards
```

---

## 7. What Changes vs What Stays

### 7.1 Schema Changes (Before / After)

#### `workspaces` table

| Change                       | Before        | After                       | Migration                                                                                                                                                         |
| ---------------------------- | ------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organizationId` nullability | **nullable**  | **NOT NULL**                | `ALTER TABLE workspaces ALTER COLUMN organization_id SET NOT NULL;` (requires backfill: delete orphaned workspaces or assign to a default org)                    |
| `slug` uniqueness            | Global unique | **Per-organization unique** | `ALTER TABLE workspaces DROP CONSTRAINT workspaces_slug_unique; ALTER TABLE workspaces ADD CONSTRAINT workspaces_org_slug_unique UNIQUE (organization_id, slug);` |

#### `projects` table

| Change                | Before | After                        | Migration                                                                                                                |
| --------------------- | ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Add `slug` column     | —      | `varchar(100) NOT NULL`      | `ALTER TABLE projects ADD COLUMN slug varchar(100) NOT NULL; UPDATE projects SET slug = lower(replace(name, ' ', '-'));` |
| Add unique constraint | —      | `UNIQUE(workspace_id, slug)` | `ALTER TABLE projects ADD CONSTRAINT projects_ws_slug_unique UNIQUE (workspace_id, slug);`                               |

#### `tasks` table

| Change                 | Before       | After                                                     | Migration                                                                                                                                                                            |
| ---------------------- | ------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Add `projectId`        | —            | `uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE` | `ALTER TABLE tasks ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;` (backfill from board→workspace→project chain, then SET NOT NULL)                           |
| `boardId` nullability  | **NOT NULL** | **nullable**                                              | `ALTER TABLE tasks ALTER COLUMN board_id DROP NOT NULL;`                                                                                                                             |
| `boardId` on delete    | CASCADE      | **SET NULL**                                              | `ALTER TABLE tasks DROP CONSTRAINT tasks_board_id_fk; ALTER TABLE tasks ADD CONSTRAINT tasks_board_id_fk FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE SET NULL;`           |
| `columnId` nullability | **NOT NULL** | **nullable**                                              | `ALTER TABLE tasks ALTER COLUMN column_id DROP NOT NULL;`                                                                                                                            |
| `columnId` on delete   | CASCADE      | **SET NULL**                                              | `ALTER TABLE tasks DROP CONSTRAINT tasks_column_id_fk; ALTER TABLE tasks ADD CONSTRAINT tasks_column_id_fk FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE SET NULL;` |
| Add index              | —            | `tasks_project_id_idx`                                    | `CREATE INDEX tasks_project_id_idx ON tasks(project_id);`                                                                                                                            |

#### `boards` table

| Change                     | Before                    | After                                                     | Migration                                                                                                                                                          |
| -------------------------- | ------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Remove `workspaceId`       | `uuid NOT NULL`           | **REMOVED**                                               | `ALTER TABLE boards DROP COLUMN workspace_id;`                                                                                                                     |
| Remove `workspaceId` index | `boards_workspace_id_idx` | **REMOVED**                                               | `DROP INDEX boards_workspace_id_idx;`                                                                                                                              |
| Add `projectId`            | —                         | `uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE` | `ALTER TABLE boards ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;` (backfill: for each board, find its tasks' projects, or default-assign) |
| Add index                  | —                         | `boards_project_id_idx`                                   | `CREATE INDEX boards_project_id_idx ON boards(project_id);`                                                                                                        |

### 7.2 Shared Types Changes

#### `packages/shared/src/types/task.ts`

| Change          | Before   | After               |
| --------------- | -------- | ------------------- |
| Add `projectId` | —        | `projectId: string` |
| `boardId` type  | `string` | `string \| null`    |
| `columnId` type | `string` | `string \| null`    |

#### `packages/shared/src/types/board.ts`

| Change           | Before   | After                                          |
| ---------------- | -------- | ---------------------------------------------- |
| `workspaceId`    | `string` | **REMOVED**                                    |
| Add `projectId`  | —        | `projectId: string`                            |
| Remove `spaceId` | `string` | **REMOVED** (was a non-existent phantom field) |

#### `packages/shared/src/types/project.ts`

| Change     | Before | After          |
| ---------- | ------ | -------------- |
| Add `slug` | —      | `slug: string` |

#### `packages/shared/src/types/index.ts`

No changes needed — already exports all types.

### 7.3 Drizzle Relations Changes (`packages/db/src/schema/relations.ts`)

**Current state:** Relations file exists but is **missing** relations for: `projects`, `sprints`, `boards`, `columns`, `tasks`. These must be added.

**New relations to add:**

```typescript
// Projects
projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, { ... }),
  tasks: many(tasks),
  sprints: many(sprints),
  boards: many(boards),
}));

// Sprints
sprintsRelations = relations(sprints, ({ one, many }) => ({
  project: one(projects, { ... }),
  tasks: many(tasks),
}));

// Boards
boardsRelations = relations(boards, ({ one, many }) => ({
  project: one(projects, { ... }),
  columns: many(boardColumns),
  tasks: many(tasks),
}));

// Board Columns
boardColumnsRelations = relations(boardColumns, ({ one, many }) => ({
  board: one(boards, { ... }),
  tasks: many(tasks),
}));

// Tasks
tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, { ... }),
  board: one(boards, { ... }),
  column: one(boardColumns, { ... }),
  sprint: one(sprints, { ... }),
  assignee: one(users, { ... }),
}));

// Workspaces (update existing)
workspacesRelations — add: projects: many(boards)  → projects: many(projects)
```

**Also update `workspacesRelations`:**

- Add `projects: many(projects)` — currently missing

### 7.4 New Repository

| File                                                 | Status                                 |
| ---------------------------------------------------- | -------------------------------------- |
| `packages/db/src/repositories/project.repository.ts` | **NEW** — must be created              |
| `packages/db/src/repositories/sprint.repository.ts`  | **NEW** — optional, can be added later |
| `packages/db/src/repositories/board.repository.ts`   | **NEW** — optional, can be added later |

### 7.5 New Backend Services

| File                                           | Status                    |
| ---------------------------------------------- | ------------------------- |
| `apps/backend/src/services/project.service.ts` | **NEW** — must be created |
| `apps/backend/src/services/sprint.service.ts`  | **NEW** — future          |
| `apps/backend/src/services/board.service.ts`   | **NEW** — future          |

### 7.6 Milestone Table

The `Milestone` type exists in `packages/shared/src/types/project.ts` but has **no database table**. Two options:

1. **Create the table** if milestones are a planned feature.
2. **Remove the type** if milestones are not planned.

**Recommendation:** Create the table now while we're redesigning the schema, since the type is already defined and the migration is simple.

```sql
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX milestones_project_id_idx ON milestones(project_id);
```

### 7.7 Summary: Change Impact Matrix

| Component                                        | Status        | Effort                                  |
| ------------------------------------------------ | ------------- | --------------------------------------- |
| `workspaces.organizationId` nullable → NOT NULL  | **CHANGE**    | Medium (data backfill)                  |
| `workspaces.slug` global unique → per-org unique | **CHANGE**    | Low                                     |
| `projects` add `slug` column                     | **CHANGE**    | Low                                     |
| `tasks` add `projectId`                          | **CHANGE**    | High (data backfill from board→project) |
| `tasks.boardId` NOT NULL → nullable              | **CHANGE**    | Low                                     |
| `tasks.columnId` NOT NULL → nullable             | **CHANGE**    | Low                                     |
| `tasks.boardId` CASCADE → SET NULL               | **CHANGE**    | Low                                     |
| `tasks.columnId` CASCADE → SET NULL              | **CHANGE**    | Low                                     |
| `boards.workspaceId` → `boards.projectId`        | **CHANGE**    | High (data migration)                   |
| Relations file: add missing relations            | **CHANGE**    | Medium                                  |
| `project.repository.ts`                          | **NEW**       | Medium                                  |
| `project.service.ts`                             | **NEW**       | Medium                                  |
| `milestones` table                               | **NEW**       | Low                                     |
| `organizations` schema                           | **NO CHANGE** | —                                       |
| `sprints` schema                                 | **NO CHANGE** | —                                       |
| `board_columns` schema                           | **NO CHANGE** | —                                       |
| `organization_members` schema                    | **NO CHANGE** | —                                       |
| `workspace_members` schema                       | **NO CHANGE** | —                                       |
| `users` schema                                   | **NO CHANGE** | —                                       |
| RBAC tables (roles, permissions, etc.)           | **NO CHANGE** | —                                       |

---

## Appendix A: Migration Sequence

The changes must be applied in a specific order to avoid breaking existing data:

1. **Add `slug` to `projects`** (backfill from `name`)
2. **Add `project_id` to `tasks`** (nullable initially)
3. **Backfill `tasks.project_id`** by tracing: `tasks.board_id → boards.workspace_id → ... → projects.workspace_id`. For orphaned tasks with no board, assign to a default project.
4. **Add `project_id` to `boards`** (nullable initially)
5. **Backfill `boards.project_id`** by tracing: `boards.workspace_id → projects.workspace_id`. For workspaces with multiple projects, use the first/only project.
6. **Set `boards.project_id` to NOT NULL** after backfill
7. **Set `tasks.project_id` to NOT NULL** after backfill
8. **Drop `boards.workspace_id`** column
9. **Make `tasks.board_id` nullable** and change FK to SET NULL
10. **Make `tasks.column_id` nullable** and change FK to SET NULL
11. **Make `workspaces.organization_id` NOT NULL** (delete orphaned workspaces or assign to org)
12. **Update `workspaces.slug`** constraint from global unique to per-org unique
13. **Create `milestones` table** (optional)
14. **Add indexes** on new FK columns

## Appendix B: Design Decisions Log

| Decision                    | Choice            | Rationale                                          |
| --------------------------- | ----------------- | -------------------------------------------------- |
| Board ownership             | Project-scoped    | Hierarchy purity; avoids cross-project complexity  |
| Task board/column nullable  | Yes               | Tasks exist in projects first, board is a view     |
| Board DELETE behavior       | SET NULL on tasks | Preserve tasks when removing a view                |
| Sprint DELETE behavior      | SET NULL on tasks | Preserve tasks when removing a sprint iteration    |
| Task status vs board column | Decoupled         | Different boards may map statuses differently      |
| Workspace slug uniqueness   | Per-organization  | Different orgs should be able to use the same slug |
| Milestone table             | Include now       | Type already exists; clean to add during redesign  |

---

## 8. Permission & Authorization Model

> Source: `packages/shared/src/hierarchy-permissions.ts`

### 8.1 Design Philosophy

Permissions cascade **downward** through the hierarchy:

```
Organization-level permissions → apply to ALL workspaces + projects
Workspace-level permissions   → apply to ALL projects in that workspace
Project-level permissions     → apply only to that specific project
```

A user's **effective permissions** are the union of their org, workspace, and project roles.

### 8.2 Permission Constants

```typescript
export const PERMISSIONS = {
  ORGANIZATION: {
    CREATE: 'organization:create',
    UPDATE: 'organization:update',
    DELETE: 'organization:delete',
    MANAGE_MEMBERS: 'organization:manage_members',
    MANAGE_BILLING: 'organization:manage_billing',
    SETTINGS: 'organization:settings',
  },
  WORKSPACE: {
    CREATE: 'workspace:create',
    UPDATE: 'workspace:update',
    DELETE: 'workspace:delete',
    MANAGE_MEMBERS: 'workspace:manage_members',
    MANAGE_BILLING: 'workspace:manage_billing',
    SETTINGS: 'workspace:settings',
    MANAGE_ROLES: 'workspace:manage_roles',
  },
  PROJECT: {
    CREATE: 'project:create',
    READ: 'project:read',
    UPDATE: 'project:update',
    DELETE: 'project:delete',
    MANAGE_MEMBERS: 'project:manage_members',
  },
  BOARD: {
    CREATE: 'board:create',
    UPDATE: 'board:update',
    DELETE: 'board:delete',
  },
  TASK: {
    CREATE: 'task:create',
    UPDATE: 'task:update',
    DELETE: 'task:assign',
    ASSIGN: 'task:assign',
  },
  DOCUMENT: {
    CREATE: 'document:create',
    UPDATE: 'document:update',
    DELETE: 'document:delete',
  },
} as const;
```

### 8.3 Role → Permission Mappings

#### Organization Roles

| Role       | Permissions                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------- |
| **owner**  | All org + workspace + project + board + task + document permissions                                |
| **admin**  | All except `organization:delete`                                                                   |
| **member** | `workspace:create`, `project:read`, `board:create`, `task:create/update/assign`, `document:create` |
| **guest**  | None                                                                                               |

#### Workspace Roles (apply within a single workspace)

| Role       | Permissions                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **owner**  | All workspace + project + board + task + document permissions                                                                   |
| **admin**  | All except `workspace:delete`                                                                                                   |
| **member** | `project:create/read/update`, `board:create/update/delete`, `task:create/update/delete/assign`, `document:create/update/delete` |
| **guest**  | `project:read`, `board:create`, `task:create`, `document:create`                                                                |

#### Project Roles (finest-grained)

| Role       | Permissions                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------- |
| **admin**  | All project + board + task + document permissions                                                   |
| **member** | `project:read`, `board:create/update`, `task:create/update/delete/assign`, `document:create/update` |
| **viewer** | `project:read` only                                                                                 |

### 8.4 Resource Ownership Chain

```
task → project → workspace → organization
sprint → project → workspace → organization
board → workspace → organization  (workspace-scoped boards)
board → project → workspace → organization  (project-scoped boards)
column → board → ...
document → project → workspace → organization
```

**`RESOURCE_PARENT` map** (used by middleware to walk the chain):

```typescript
export const RESOURCE_PARENT: Record<string, string> = {
  task: 'project',
  sprint: 'project',
  board: 'workspace', // or 'project' for project-scoped boards
  project: 'workspace',
  workspace: 'organization',
  document: 'project',
  column: 'board',
  card: 'board',
};
```

### 8.5 Helper Functions

```typescript
// Get ancestor chain for a resource type
chainForResource('task'); // → ['project', 'workspace', 'organization']

// Compute effective permissions from roles at all levels
effectivePermissions({ orgRole: 'admin', workspaceRole: 'member', projectRole: 'viewer' });

// Check permissions
hasAllPermissions(effective, ['task:create', 'task:update']);
hasAnyPermission(effective, ['task:create', 'task:update']);
```

### 8.6 Middleware Design (Backend Implementation)

```
Request flow for a project-scoped task operation:

  1. authenticate()            — verify JWT, attach user to req
  2. extractWorkspaceContext()  — resolve workspace from URL/header
  3. requireProjectMember()     — user is at least a viewer in the project
  4. requireProjectPermission('task:create')
                               — user has the specific permission
  5. [optional] requireResourceOwner('task')
                               — for update/delete: user owns the task OR
                                 is project/workspace/org admin
```

---

## 9. Shared Type Definitions (TypeScript)

> Source: `packages/shared/src/hierarchy-types.ts`

### 9.1 Core Entity Types

```typescript
// ── Organization ──────────────────────────────────────────────
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: string;
}

export type OrganizationRole = 'owner' | 'admin' | 'member' | 'guest';

// ── Workspace ─────────────────────────────────────────────────
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  organizationId: string | null; // Will become string after migration
  plan: 'free' | 'pro' | 'enterprise';
  brandColor: string | null;
  customDomain: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
}

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'guest';

// ── Project ───────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMembership {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: string;
}

export type ProjectRole = 'admin' | 'member' | 'viewer';

// ── Sprint ────────────────────────────────────────────────────
export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  createdAt: string;
}

export type SprintStatus = 'planned' | 'active' | 'completed';

// ── Task ──────────────────────────────────────────────────────
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string; // REQUIRED — primary parent
  boardId: string | null; // Optional — view-layer concern
  columnId: string | null; // Optional — only set when boardId is set
  sprintId: string | null; // Optional — temporal grouping
  assigneeId: string | null;
  position: number;
  labels: string[];
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

// ── Board ─────────────────────────────────────────────────────
export interface Board {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string; // Kept for backwards compatibility
  spaceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  name: string;
  boardId: string;
  position: number;
  color: string | null;
}
```

### 9.2 Key Design Notes

- **Task.projectId is always required** — tasks always belong to a project
- **Task.boardId / columnId are nullable** — tasks can exist without a board placement
- **Task.sprintId is nullable** — tasks can exist outside sprints (backlog)
- **Board.workspaceId is kept** — backwards compatibility; new boards will use projectId
- **Workspace.organizationId is `string | null`** in types — will become `string` after migration

---

## 10. Zod Validation Schemas

> Source: `packages/shared/src/hierarchy-types.ts`

### 10.1 Task Schemas

```typescript
export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  projectId: z.string().uuid(), // REQUIRED
  boardId: z.string().uuid().nullable().optional(), // Optional
  columnId: z.string().uuid().nullable().optional(), // Optional
  sprintId: z.string().uuid().nullable().optional(), // Optional
  assigneeId: z.string().uuid().nullable().optional(),
  priority: TaskPrioritySchema.default('none'),
  dueDate: z.string().datetime().optional(),
  labels: z.array(z.string().uuid()).optional(),
  parentId: z.string().uuid().optional(),
  position: z.number().optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().omit({ projectId: true });
// projectId cannot be changed after creation (task belongs to one project forever)
```

### 10.2 Project Schemas

```typescript
export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  workspaceId: z.string().uuid(), // REQUIRED — projects always belong to a workspace
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().omit({ workspaceId: true });
// workspaceId cannot be changed after creation
```

### 10.3 Sprint Schemas

```typescript
export const CreateSprintSchema = z.object({
  name: z.string().min(1).max(100),
  projectId: z.string().uuid(), // REQUIRED
  goal: z.string().max(500).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const UpdateSprintSchema = CreateSprintSchema.partial().omit({ projectId: true });
```

### 10.4 Board Schemas

```typescript
export const CreateBoardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  spaceId: z.string().uuid().optional(),
});

export const UpdateBoardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});
```

---

## 11. Repository Patterns & Query Examples

> Source: `packages/db/src/repositories/hierarchy-repositories.ts`

### 11.1 Interface Contracts

```typescript
// ── Project Repository ────────────────────────────────────────
export interface ProjectRepository {
  findById(db, id: string): Promise<ProjectRecord | undefined>;
  findByWorkspaceId(db, workspaceId: string): Promise<ProjectRecord[]>;
  findByWorkspaceIdWithPagination(
    db,
    workspaceId,
    page,
    limit,
  ): Promise<{ projects: ProjectRecord[]; total: number }>;
  create(db, data: CreateProjectData): Promise<ProjectRecord>;
  updateById(db, id, data: UpdateProjectData): Promise<ProjectRecord | undefined>;
  archiveById(db, id): Promise<ProjectRecord | undefined>;
  deleteById(db, id): Promise<boolean>;
  countByWorkspaceId(db, workspaceId): Promise<number>;
}

// ── Sprint Repository ─────────────────────────────────────────
export interface SprintRepository {
  findById(db, id): Promise<SprintRecord | undefined>;
  findByProjectId(db, projectId): Promise<SprintRecord[]>;
  create(db, data: CreateSprintData): Promise<SprintRecord>;
  updateById(db, id, data): Promise<SprintRecord | undefined>;
  deleteById(db, id): Promise<boolean>;
}

// ── Task Repository (updated) ─────────────────────────────────
export interface TaskRepository {
  create(db, data: CreateTaskData, userId: string): Promise<TaskRecord>;
  findByProjectId(db, projectId): Promise<TaskRecord[]>;
  findByAssignee(db, assigneeId): Promise<TaskRecord[]>;
  findById(db, id): Promise<TaskRecord | undefined>;
  updateById(db, id, data): Promise<TaskRecord | undefined>;
  deleteById(db, id): Promise<boolean>;
  moveToColumn(db, taskId, data: TaskMoveData): Promise<TaskRecord | undefined>;
}
```

### 11.2 Task Create — Requires projectId

```typescript
export async function createTask(
  db: PostgresJsDatabase,
  data: CreateTaskData,
  userId: string,
): Promise<TaskRecord> {
  const [task] = await db
    .insert(tasks)
    .values({
      title: data.title,
      description: data.description ?? null,
      priority: data.priority ?? 'medium',
      projectId: data.projectId, // REQUIRED — no bootstrap logic
      assigneeId: data.assigneeId ?? userId,
      boardId: data.boardId ?? null, // Optional
      columnId: data.columnId ?? null, // Optional
      sprintId: data.sprintId ?? null, // Optional
      position: 0,
      labels: data.labels ?? [],
      dueDate: data.dueDate ?? null,
    })
    .returning();
  return task;
}
```

### 11.3 Eager Loading Query Patterns

#### Task with Full Hierarchy Chain

```typescript
export async function findTaskWithHierarchy(db: SchemaDb, taskId: string) {
  return db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      project: {
        with: {
          workspace: {
            with: {
              organization: true,
            },
          },
        },
      },
      board: true,
      column: true,
      sprint: true,
      assignee: {
        columns: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });
}
// Returns: task → project → workspace → organization (full chain)
```

#### Workspace with All Projects + Tasks

```typescript
export async function findWorkspaceWithProjects(db: SchemaDb, workspaceId: string) {
  return db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    with: {
      projects: {
        orderBy: [desc(projects.createdAt)],
        with: {
          sprints: { orderBy: [asc(sprints.startDate)] },
          tasks: { orderBy: [asc(tasks.position)] },
        },
      },
    },
  });
}
```

#### Board with Columns and Tasks (for rendering)

```typescript
export async function findBoardWithColumns(db: SchemaDb, boardId: string) {
  return db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    with: {
      columns: { orderBy: [asc(columns.position)] },
      tasks: { orderBy: [asc(tasks.position)] },
    },
  });
}
```

#### Sprint with Tasks (for sprint planning)

```typescript
export async function findSprintWithTasks(db: SchemaDb, sprintId: string) {
  return db.query.sprints.findFirst({
    where: eq(sprints.id, sprintId),
    with: {
      tasks: {
        orderBy: [asc(tasks.position)],
        with: {
          assignee: {
            columns: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      },
    },
  });
}
```

### 11.4 Bulk Operations

```typescript
// Batch update sprint assignment
export async function bulkUpdateTaskSprint(
  db: PostgresJsDatabase,
  taskIds: string[],
  sprintId: string | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const taskId of taskIds) {
      await tx.update(tasks).set({ sprintId, updatedAt: new Date() }).where(eq(tasks.id, taskId));
    }
  });
}

// Archive all tasks in a project
export async function archiveTasksByProjectId(
  db: PostgresJsDatabase,
  projectId: string,
): Promise<void> {
  await db
    .update(tasks)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(tasks.projectId, projectId));
}
```

---

## 12. Drizzle Relations (Complete Code)

> Source: `packages/db/src/schema/hierarchy.ts`
>
> These are the complete relation definitions for every entity. Import into `packages/db/src/schema/relations.ts`.

### 12.1 Core Hierarchy Relations

```typescript
import { relations } from 'drizzle-orm';
import { organizations } from './organizations.js';
import { organizationMembers } from './organization-members.js';
import { workspaces } from './workspaces.js';
import { workspaceMembers } from './workspace-members.js';
import { workspaceInvitations } from './workspace-invitations.js';
import { projects } from './projects.js';
import { boards } from './boards.js';
import { columns } from './columns.js';
import { tasks } from './tasks.js';
import { sprints } from './sprints.js';
import { documents } from './documents.js';
import { attachments } from './attachments.js';
import { notifications } from './notifications.js';
import { users } from './users.js';
import { roles } from './roles.js';
import { permissions } from './permissions.js';
import { rolePermissions } from './role-permissions.js';
import { userRoles } from './user-roles.js';

// ── Organization ──────────────────────────────────────────────
export const organizationsHierarchyRelations = relations(organizations, ({ many }) => ({
  workspaces: many(workspaces),
  members: many(organizationMembers),
}));

// ── Organization Members ──────────────────────────────────────
export const organizationMembersHierarchyRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}));

// ── Workspace ─────────────────────────────────────────────────
export const workspacesHierarchyRelations = relations(workspaces, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [workspaces.organizationId],
    references: [organizations.id],
  }),
  members: many(workspaceMembers),
  invitations: many(workspaceInvitations),
  projects: many(projects),
  boards: many(boards),
  documents: many(documents),
}));

// ── Workspace Members ─────────────────────────────────────────
export const workspaceMembersHierarchyRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}));

// ── Workspace Invitations ─────────────────────────────────────
export const workspaceInvitationsHierarchyRelations = relations(
  workspaceInvitations,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceInvitations.workspaceId],
      references: [workspaces.id],
    }),
    invitedBy: one(users, {
      fields: [workspaceInvitations.invitedById],
      references: [users.id],
    }),
  }),
);
```

### 12.2 Project, Sprint, Board, Task Relations

```typescript
// ── Project (Workspace → Project) ─────────────────────────────
export const projectsHierarchyRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  sprints: many(sprints),
  tasks: many(tasks),
  boards: many(boards),
  documents: many(documents),
}));

// ── Board ─────────────────────────────────────────────────────
export const boardsHierarchyRelations = relations(boards, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [boards.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [boards.projectId],
    references: [projects.id],
    relationName: 'projectBoards',
  }),
  columns: many(columns),
  tasks: many(tasks),
}));

// ── Column (Board Column) ─────────────────────────────────────
export const columnsHierarchyRelations = relations(columns, ({ one, many }) => ({
  board: one(boards, {
    fields: [columns.boardId],
    references: [boards.id],
  }),
  tasks: many(tasks),
}));

// ── Sprint ────────────────────────────────────────────────────
export const sprintsHierarchyRelations = relations(sprints, ({ one, many }) => ({
  project: one(projects, {
    fields: [sprints.projectId],
    references: [projects.id],
  }),
  tasks: many(tasks),
}));

// ── Task (Project → Task) ─────────────────────────────────────
export const tasksHierarchyRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  board: one(boards, {
    fields: [tasks.boardId],
    references: [boards.id],
    relationName: 'boardTasks',
  }),
  column: one(columns, {
    fields: [tasks.columnId],
    references: [columns.id],
  }),
  sprint: one(sprints, {
    fields: [tasks.sprintId],
    references: [sprints.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
    relationName: 'assignee',
  }),
}));
```

### 12.3 Supporting Entity Relations

```typescript
// ── Document ──────────────────────────────────────────────────
export const documentsHierarchyRelations = relations(documents, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [documents.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
    relationName: 'projectDocuments',
  }),
  author: one(users, {
    fields: [documents.authorId],
    references: [users.id],
  }),
  attachments: many(attachments),
}));

// ── Attachment ────────────────────────────────────────────────
export const attachmentsHierarchyRelations = relations(attachments, ({ one }) => ({
  task: one(tasks, {
    fields: [attachments.taskId],
    references: [tasks.id],
  }),
  document: one(documents, {
    fields: [attachments.documentId],
    references: [documents.id],
  }),
  uploader: one(users, {
    fields: [attachments.uploaderId],
    references: [users.id],
  }),
}));

// ── Notification ──────────────────────────────────────────────
export const notificationsHierarchyRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// ── User (reverse lookups) ────────────────────────────────────
export const usersHierarchyRelations = relations(users, ({ many }) => ({
  organizationMemberships: many(organizationMembers),
  workspaceMemberships: many(workspaceMembers),
  workspaceInvitations: many(workspaceInvitations),
  assignedTasks: many(tasks, { relationName: 'assignee' }),
  uploadedAttachments: many(attachments),
  authoredDocuments: many(documents),
  notifications: many(notifications),
  userRoles: many(userRoles),
}));

// ── RBAC ──────────────────────────────────────────────────────
export const rolesHierarchyRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsHierarchyRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsHierarchyRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userRolesHierarchyRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));
```

### 12.4 Complete Cascade Rules (28 rules)

| #   | Parent        | Child         | FK Column       | On Delete | Rationale                                               |
| --- | ------------- | ------------- | --------------- | --------- | ------------------------------------------------------- |
| 1   | organizations | workspaces    | organization_id | CASCADE   | Deleting an org removes all its workspaces              |
| 2   | organizations | org_members   | organization_id | CASCADE   | Deleting an org removes membership records              |
| 3   | workspaces    | projects      | workspace_id    | CASCADE   | Deleting a workspace removes all its projects           |
| 4   | workspaces    | boards        | workspace_id    | CASCADE   | Deleting a workspace removes its boards                 |
| 5   | workspaces    | documents     | workspace_id    | CASCADE   | Deleting a workspace removes its documents              |
| 6   | workspaces    | ws_members    | workspace_id    | CASCADE   | Deleting a workspace removes membership records         |
| 7   | workspaces    | ws_invite     | workspace_id    | CASCADE   | Deleting a workspace removes pending invitations        |
| 8   | projects      | sprints       | project_id      | CASCADE   | Deleting a project removes its sprints                  |
| 9   | projects      | tasks         | project_id      | CASCADE   | Deleting a project removes all its tasks                |
| 10  | projects      | boards        | project_id      | SET NULL  | Board outlives project; scope becomes workspace-wide    |
| 11  | projects      | documents     | project_id      | SET NULL  | Document outlives project; scope becomes workspace-wide |
| 12  | boards        | columns       | board_id        | CASCADE   | Deleting a board removes its columns                    |
| 13  | boards        | tasks         | board_id        | SET NULL  | Task survives board deletion; task still in project     |
| 14  | columns       | tasks         | column_id       | CASCADE   | Deleting a column removes tasks in that column          |
| 15  | sprints       | tasks         | sprint_id       | SET NULL  | Task survives sprint deletion; sprint is a timebox      |
| 16  | users         | tasks         | assignee_id     | SET NULL  | Task survives user deletion; assignment cleared         |
| 17  | users         | attachments   | uploader_id     | CASCADE   | Deleting a user removes their uploads                   |
| 18  | users         | notifications | user_id         | CASCADE   | Deleting a user removes their notifications             |
| 19  | users         | documents     | author_id       | CASCADE   | Deleting a user removes their authored documents        |
| 20  | tasks         | attachments   | task_id         | SET NULL  | Attachment survives task deletion; keeps the file       |
| 21  | documents     | attachments   | document_id     | SET NULL  | Attachment survives document deletion; keeps the file   |
| 22  | users         | org_members   | user_id         | CASCADE   | Deleting a user removes their org memberships           |
| 23  | users         | ws_members    | user_id         | CASCADE   | Deleting a user removes their workspace memberships     |
| 24  | users         | ws_invite     | invited_by_id   | SET NULL  | Invitation stays; inviter reference cleared             |
| 25  | roles         | role_perms    | role_id         | CASCADE   | Deleting a role removes its permission mappings         |
| 26  | permissions   | role_perms    | permission_id   | CASCADE   | Deleting a permission removes its role mappings         |
| 27  | users         | user_roles    | user_id         | CASCADE   | Deleting a user removes their role assignments          |
| 28  | roles         | user_roles    | role_id         | CASCADE   | Deleting a role removes all user assignments of it      |
