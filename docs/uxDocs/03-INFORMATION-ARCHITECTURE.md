# Sprintio — Information Architecture

> **Sprint fast. Ship together.**
> Document: 03 — Information Architecture
> Version: 1.0 | Date: 2026-07-08
> Scope: MVP — Complete sitemap, data model, navigation taxonomy, content structure

---

## Table of Contents

1. [IA Principles](#1-ia-principles)
2. [Product Sitemap](#2-productsitemap)
3. [Entity Data Model](#3-entity-data-model)
4. [Navigation Taxonomy](#4-navigation-taxonomy)
5. [Content Hierarchy & Grouping](#5-content-hierarchy--grouping)
6. [Search & Filter Taxonomy](#6-search--filter-taxonomy)
7. [URL Structure](#7-url-structure)
8. [Command Palette Taxonomy](#8-command-palette-taxonomy)
9. [Permissions & Access Scoping](#9-permissions--access-scoping)
10. [Cross-Reference Matrix](#10-cross-reference-matrix)

---

## 1. IA Principles

| #   | Principle                              | Rationale                                                                                                                                           |
| --- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | **Flat hierarchy, rich relationships** | Spaces/Folders/Lists are organizational wrappers; the real work connects through Tasks, Docs, and Links — not nesting depth                         |
| P2  | **Context before navigation**          | Users rarely navigate to "see everything" — they navigate to see what's relevant _now_. Every view is pre-filtered by context (sprint, me, blocked) |
| P3  | **Progressive disclosure**             | New users see 4 primary screens. Power users unlock keyboard shortcuts, command palette, and advanced filters over time                             |
| P4  | **Entities are peers**                 | Tasks and Docs are first-class citizens at the same level — not tasks-inside-docs or docs-inside-tasks. They link bidirectionally                   |
| P5  | **Global + local separation**          | Global navigation (sidebar, command palette, search) is always available. Local actions (filter, sort, new task) are scoped to the current view     |

---

## 2. Product Sitemap

### 2.1 Top-Level Structure

```
Sprintio
├── Home (Dashboard / My Work)
├── Workspace Tree
│   ├── Space: Engineering
│   │   ├── Folder: Frontend
│   │   │   ├── List: Auth Module ─── Board View / List View
│   │   │   ├── List: Dashboard
│   │   │   └── List: Payments
│   │   ├── Folder: Backend
│   │   │   ├── List: API
│   │   │   └── List: Data Pipeline
│   │   └── Folder: DevOps
│   │       └── List: Infrastructure
│   ├── Space: Design
│   │   ├── List: UI Components
│   │   └── List: UX Research
│   └── Space: Marketing
│       ├── List: Blog
│       └── List: Documentation
├── Docs (First-Class Document Section)
│   ├── RFC: Auth v2 Refresh Token Design
│   ├── Spec: Dashboard Charts
│   └── + New Document
├── Automations
│   ├── Stale Task Nudge (Active)
│   ├── Auto-Assign on Status Change (Active)
│   └── + New Automation
├── Team
│   ├── Members
│   ├── Groups
│   └── Guest Access
├── Settings
│   ├── Workspace: General / Members / Billing / Security
│   ├── Profile: Preferences / Notifications
│   └── Help
└── AI Copilot (Persistent Panel — accessible from any screen)
```

### 2.2 Maximum Nesting Depth

```
Level 0: Workspace           (top-level container)
Level 1: Space               (team domain: Engineering, Design)
Level 2: Folder              (sub-domain grouping: Frontend, Backend)
Level 3: List / Sprint       (the actual work container)
Level 4: Task / Doc          (leaf entity — never nest further)
```

**Rule:** 4 levels max. Tasks and Docs are always leaves. No nesting of tasks within tasks beyond parent/subtask (which is a relationship, not a hierarchy).

### 2.3 Sidebar Tree — Flat vs Tree

| Element        | Navigation Type  | Reasoning                       |
| -------------- | ---------------- | ------------------------------- |
| Home           | Flat link        | Single destination, no children |
| Workspace Tree | Collapsible tree | Many items; drill-down needed   |
| Docs           | Collapsible list | Flat list of docs, no tree      |
| Automations    | Collapsible list | Flat list of flows              |
| Team           | Flat link        | Opens settings section          |
| Settings       | Flat link        | Opens settings page             |

---

## 3. Entity Data Model

### 3.1 Core Entities

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIP MAP                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  WORKSPACE ◄──────────────────────────────────────────────┐          │
│    │                                                       │          │
│    ├── SPACE (1..n)                                        │          │
│    │     └── FOLDER (0..n)                                 │          │
│    │           └── LIST (0..n)                             │          │
│    │                 ├── TASK (0..n) ◄──── Sprint ────┐    │          │
│    │                 │    ├── Subtask (0..n)           │    │          │
│    │                 │    ├── Comment (0..n)           │    │          │
│    │                 │    ├── Attachment (0..n)        │    │          │
│    │                 │    └── Custom Field Values       │    │          │
│    │                 └── Sprint (0..n)                 │    │          │
│    │                                                    │    │          │
│    ├── DOC (0..n) ◄──── bidirectional links ──► TASK    │    │          │
│    │     ├── Comment (0..n)                             │    │          │
│    │     ├── Version (0..n)                             │    │          │
│    │     └── Backlink (0..n)                            │    │          │
│    │                                                    │    │          │
│    ├── AUTOMATION (0..n)                                │    │          │
│    │     ├── Trigger                                    │    │          │
│    │     ├── Condition (0..n)                           │    │          │
│    │     ├── Action (0..n)                              │    │          │
│    │     └── Run History (0..n)                         │    │          │
│    │                                                    │    │          │
│    ├── USER (1..n) ◄── Member ──► Role                  │    │          │
│    │     ├── Profile                                    │    │          │
│    │     └── Notification Preferences                   │    │          │
│    │                                                    │    │          │
│    ├── GROUP (0..n)                                     │    │          │
│    │     └── USER (members)                             │    │          │
│    │                                                    │    │          │
│    ├── CUSTOM FIELD DEFINITION (0..n)                   │    │          │
│    │     └── Value (per Task)                            │    │          │
│    │                                                    │    │          │
│    └── NOTIFICATION (0..n)                              │    │          │
│         └── Read Status                                 │    │          │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Entity Properties

#### Workspace

| Property   | Type      | Required | Notes                             |
| ---------- | --------- | -------- | --------------------------------- |
| id         | UUID      | auto     | Primary key                       |
| name       | string    | yes      | e.g. "Acme Engineering"           |
| slug       | string    | yes      | URL-safe, e.g. "acme-engineering" |
| plan       | enum      | auto     | "free" (MVP)                      |
| created_at | timestamp | auto     |                                   |
| settings   | JSONB     | no       | Workspace-level config            |

#### Space

| Property     | Type   | Required | Notes                 |
| ------------ | ------ | -------- | --------------------- |
| id           | UUID   | auto     |                       |
| workspace_id | FK     | auto     |                       |
| name         | string | yes      | e.g. "Engineering"    |
| icon         | string | no       | Emoji or icon name    |
| color        | string | no       | Hex color for sidebar |
| sort_order   | int    | auto     | Position in sidebar   |
| created_by   | FK     | auto     |                       |

#### Folder

| Property         | Type   | Required | Notes             |
| ---------------- | ------ | -------- | ----------------- |
| id               | UUID   | auto     |                   |
| space_id         | FK     | auto     |                   |
| name             | string | yes      | e.g. "Frontend"   |
| parent_folder_id | FK     | no       | Null = root level |
| sort_order       | int    | auto     |                   |

#### List

| Property     | Type   | Required          | Notes                |
| ------------ | ------ | ----------------- | -------------------- |
| id           | UUID   | auto              |                      |
| folder_id    | FK     | no                | Null = root of space |
| space_id     | FK     | auto              |                      |
| name         | string | yes               | e.g. "Auth Module"   |
| description  | text   | no                | Brief context        |
| icon         | string | no                |                      |
| default_view | enum   | "board" or "list" |                      |

#### Task

| Property       | Type      | Required | Notes                                                                                  |
| -------------- | --------- | -------- | -------------------------------------------------------------------------------------- |
| id             | UUID      | auto     |                                                                                        |
| list_id        | FK        | auto     |                                                                                        |
| identifier     | string    | auto     | e.g. "SIO-245" (workspace prefix + sequence)                                           |
| title          | string    | yes      | Max 256 chars                                                                          |
| description    | rich text | no       | Blocknote JSON                                                                         |
| status         | enum      | yes      | Configurable per workspace (default: Backlog, In Progress, In Review, Done, Cancelled) |
| priority       | enum      | no       | P0, P1, P2, P3, P4                                                                     |
| assignee_id    | FK        | no       | Single assignee (multi-assignee = Phase 2)                                             |
| sprint_id      | FK        | no       |                                                                                        |
| parent_task_id | FK        | no       | For subtask relationships                                                              |
| due_date       | date      | no       |                                                                                        |
| labels         | array     | no       | String array, workspace-scoped                                                         |
| estimate       | int       | no       | Story points (1, 2, 3, 5, 8, 13)                                                       |
| position       | float     | auto     | For ordering within a status column                                                    |
| custom_fields  | JSONB     | no       | Extensible metadata store                                                              |
| github_pr_url  | string    | no       | Auto-populated by integration                                                          |
| github_branch  | string    | no       | Auto-populated by integration                                                          |
| created_by     | FK        | auto     |                                                                                        |
| created_at     | timestamp | auto     |                                                                                        |
| updated_at     | timestamp | auto     |                                                                                        |

#### Task Relationships

| Relationship           | Inverse         | Description                                                |
| ---------------------- | --------------- | ---------------------------------------------------------- |
| parent_task → subtask  | child → parent  | Parent/child hierarchy (not nesting, just a link)          |
| task blocks → task     | task blocked by | Dependency: A blocks B means B can't start until A is done |
| task related to → task | task related to | Loose association, no dependency                           |

#### Doc

| Property     | Type      | Required                             | Notes                     |
| ------------ | --------- | ------------------------------------ | ------------------------- |
| id           | UUID      | auto                                 |                           |
| workspace_id | FK        | auto                                 |                           |
| title        | string    | yes                                  |                           |
| content      | rich text | no                                   | Blocknote JSON (TipTap)   |
| status       | enum      | "draft" or "in_review" or "approved" | Tracks document lifecycle |
| created_by   | FK        | auto                                 |                           |
| created_at   | timestamp | auto                                 |                           |
| updated_at   | timestamp | auto                                 |                           |

#### Doc ↔ Task Links (Bidirectional)

| Property   | Type      | Notes                                                             |
| ---------- | --------- | ----------------------------------------------------------------- |
| id         | UUID      | Auto                                                              |
| doc_id     | FK        |                                                                   |
| task_id    | FK        |                                                                   |
| link_type  | enum      | "references" (doc mentions task) or "linked" (task linked to doc) |
| created_at | timestamp |                                                                   |

#### Comment (Shared Entity)

| Property          | Type      | Required        | Notes                                |
| ----------------- | --------- | --------------- | ------------------------------------ |
| id                | UUID      | auto            |                                      |
| entity_type       | enum      | "task" or "doc" | Polymorphic                          |
| entity_id         | UUID      | auto            |                                      |
| parent_comment_id | FK        | no              | For threaded replies                 |
| author_id         | FK        | auto            |                                      |
| content           | rich text | no              | Supports @mentions, emoji            |
| resolved          | boolean   | no              | For doc inline comments              |
| anchored_text     | string    | no              | For doc inline comments (text range) |
| created_at        | timestamp | auto            |                                      |
| updated_at        | timestamp | auto            |                                      |

#### Automation

| Property     | Type      | Required | Notes                      |
| ------------ | --------- | -------- | -------------------------- |
| id           | UUID      | auto     |                            |
| workspace_id | FK        | auto     |                            |
| name         | string    | yes      | e.g. "Stale Task Nudge"    |
| enabled      | boolean   | yes      |                            |
| trigger      | JSON      | yes      | Trigger definition         |
| conditions   | array     | no       | Array of condition objects |
| actions      | array     | yes      | Array of action objects    |
| created_by   | FK        | auto     |                            |
| last_run_at  | timestamp | auto     |                            |

#### Sprint

| Property     | Type   | Required                              | Notes            |
| ------------ | ------ | ------------------------------------- | ---------------- |
| id           | UUID   | auto                                  |                  |
| workspace_id | FK     | auto                                  |                  |
| name         | string | yes                                   | e.g. "Sprint 14" |
| start_date   | date   | yes                                   |                  |
| end_date     | date   | yes                                   |                  |
| goal         | text   | no                                    | Sprint objective |
| status       | enum   | "planning" or "active" or "completed" |                  |

---

## 4. Navigation Taxonomy

### 4.1 Primary Navigation (Sidebar)

```
┌──────────────────────────────────────────────────────────────┐
│                     SIDEBAR SECTIONS                         │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ── FIXED ──────────────────────────────────────────────────  │
│  │  🏠  Home / My Work                                       │  │
│  │       └── Today view, filtered to current user            │  │
│  │                                                            │  │
│  ── WORKSPACE TREE (scrollable) ────────────────────────────  │
│  │  ▾ [Space Name]                                           │  │
│  │    ▸ [Folder Name]                                        │  │
│  │      📋 [List Name] ─── Board View (default)             │  │
│  │                       ─── List View                       │  │
│  │                                                            │  │
│  ── DIVIDER ────────────────────────────────────────────────  │
│  │                                                            │  │
│  ── FIRST-CLASS SECTIONS ───────────────────────────────────  │
│  │  📄  Docs                                                  │  │
│  │       └── [Recent docs list, max 10 visible]              │  │
│  │       └── + New Doc                                        │  │
│  │  🤖  Automations                                           │  │
│  │       └── [Active automations, max 5 visible]             │  │
│  │                                                            │  │
│  ── DIVIDER ────────────────────────────────────────────────  │
│  │                                                            │  │
│  ── ADMIN ──────────────────────────────────────────────────  │
│  │  👥  Team                                                  │  │
│  │  ⚙   Settings                                             │  │
│  │                                                            │  │
│  ── BOTTOM WIDGET ──────────────────────────────────────────  │
│  │  📋  Onboarding Checklist (dismissible)                   │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Secondary Navigation (In-View Tabs)

Each major screen has view-level navigation:

| Screen                   | Tab Navigation                                  | Default     |
| ------------------------ | ----------------------------------------------- | ----------- |
| List (Board/List toggle) | Board ● / List                                  | Board       |
| Task Detail              | Description / Comments / Activity / Subtasks    | Description |
| Doc Editor               | Editor / Comments / Version History / Backlinks | Editor      |
| Settings                 | Workspace / Profile / Notifications / Help      | Workspace   |

### 4.3 Tertiary Navigation (Filter Bar)

Every view with task data has a consistent filter bar:

```
┌─────────────────────────────────────────────────────────────┐
│  Filter: [Status▾] [Assignee▾] [Priority▾] [Label▾]       │
│          [Sprint▾] [Due Date▾] [Search...........] Clear   │
└─────────────────────────────────────────────────────────────┘
```

**Filter Taxonomy:**

| Filter   | Type                   | Values                                          |
| -------- | ---------------------- | ----------------------------------------------- |
| Status   | Multi-select dropdown  | Workspace-defined statuses                      |
| Assignee | Multi-select dropdown  | All members + "Unassigned"                      |
| Priority | Multi-select dropdown  | P0, P1, P2, P3, P4                              |
| Label    | Multi-select dropdown  | Workspace-defined labels                        |
| Sprint   | Single-select dropdown | Active sprint, All sprints, specific sprints    |
| Due Date | Preset ranges          | Overdue, Today, This Week, This Sprint, No Date |
| Search   | Text input             | Searches title + description                    |

---

## 5. Content Hierarchy & Grouping

### 5.1 Task Display Grouping Options

| Grouping        | When Used                                  | Visual                          |
| --------------- | ------------------------------------------ | ------------------------------- |
| **By Status**   | Board View (columns), List View (sections) | Columns or collapsible groups   |
| **By Assignee** | Board swimlane, List grouped               | Rows (board) or sections (list) |
| **By Priority** | List View grouped                          | Sections: P0 → P4               |
| **By Sprint**   | List View across sprints                   | Sections per sprint             |
| **By Label**    | List View filtered                         | Sections per label              |
| **No Group**    | List View flat                             | Single flat list, sortable      |

### 5.2 Doc Organization

```
Docs are organized FLAT (no nesting):

Doc List View:
├── RFC: Auth v2 Refresh Token Design    Draft       👤Marcus
├── Spec: Dashboard Charts               In Review   👤Priya
├── Meeting Notes: Sprint 14 Planning    Draft       👤Sarah
├── Onboarding Runbook                    Approved    👤Alex
└── + New Document

Documents are linked to Tasks via [[wiki-links]], NOT via hierarchy.
A doc can reference many tasks; a task can link to many docs.
```

### 5.3 Sprint Organization

```
Sprints are time-boxed containers:

Active Sprint: Sprint 14 (Jul 1 – Jul 14)
├── In Planning: Sprint 15 (Jul 15 – Jul 28)
├── Completed: Sprint 13 (Jun 16 – Jun 30)
├── Completed: Sprint 12 (Jun 1 – Jun 15)
└── ...

Tasks belong to exactly one Sprint OR the Backlog (no sprint assigned).
```

---

## 6. Search & Filter Taxonomy

### 6.1 Global Search (⌘K / Command Palette)

The command palette is the power-user's primary navigation tool:

```
┌──────────────────────────────────────────────────────────────────────┐
│  🔍 Search Sprintio...                                               │
│  ──────────────────────────────────────────────────────────────────  │
│                                                                       │
│  ── Recent ─────────────────────────────────────────────────────────  │
│  │  📋 SIO-245  Auth refresh token flow                              │
│  │  📄 RFC: Auth v2 Refresh Token Design                             │
│  │  📋 SIO-231  Migrate DB schema                                    │
│                                                                       │
│  ── Quick Actions ─────────────────────────────────────────────────  │
│  │  ➕  Create new task                                               │
│  │  📄  Create new document                                           │
│  │  ⚙   Open settings                                                │
│  │  👥  Go to Team                                                    │
│                                                                       │
│  ── Navigation ────────────────────────────────────────────────────  │
│  │  🏠  Go to Home                                                    │
│  │  📋  Go to Board View                                             │
│  │  📋  Go to List View                                               │
│  │  📄  Go to Docs                                                    │
│  │  🤖  Go to Automations                                            │
│                                                                       │
│  ── Search Results ────────────────────────────────────────────────  │
│  │  📋 SIO-245  Auth refresh token flow  In Progress  P1             │
│  │  📋 SIO-246  Payment webhook validation In Progress  P1           │
│  │  📄 RFC: Auth v2 Refresh Token Design  Draft                       │
│                                                                       │
│  ─────────────────────────────────────────────────────────────────── │
│  ⌨ ↑↓ Navigate  ↵ Select  esc Close  ⌘K Reopen                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Search Scope:**

| Category | Searchable Fields              | Icon |
| -------- | ------------------------------ | ---- |
| Tasks    | Identifier, title, description | 📋   |
| Docs     | Title, content (full-text)     | 📄   |
| People   | Name, email                    | 👤   |
| Actions  | Command names, settings pages  | ⚡   |

### 6.2 Local Search (Per-View)

Each view has a contextual search that filters the current data set:

| View          | Search Fields                       | Behavior                     |
| ------------- | ----------------------------------- | ---------------------------- |
| Board View    | Task title, identifier              | Filters cards in all columns |
| List View     | Task title, identifier, description | Filters rows                 |
| Docs          | Doc title, content                  | Filters doc list             |
| Notifications | Notification text, task title       | Filters notification list    |

---

## 7. URL Structure

### 7.1 Route Taxonomy

```
Base: https://app.sprintio.com

/                                   → Redirect to /home (or workspace)
/home                               → Home / My Work dashboard

/workspaces/:workspaceId
  /spaces/:spaceId
    /folders/:folderId
      /lists/:listId
        /board                      → Board View (default)
        /list                       → List View
        /sprints/:sprintId          → Sprint-specific Board/List

  /docs                             → Docs list
    /docs/:docId                    → Doc editor

  /automations                      → Automations list
    /automations/:automationId      → Automation builder

  /team                             → Team management
    /team/members                   → Members list
    /team/groups                    → Groups list

  /settings                         → Settings
    /settings/workspace/general     → Workspace settings
    /settings/workspace/members     → Members settings
    /settings/workspace/billing     → Billing settings
    /settings/workspace/security    → Security settings
    /settings/profile               → User profile
    /settings/notifications         → Notification preferences

  /tasks/:taskId                    → Task detail (opens panel from current view)

/auth/login                         → Login
/auth/signup                        → Signup
/auth/verify                        → Email verification
/auth/reset                         → Password reset

/onboarding                         → First-time setup wizard
```

### 7.2 URL Patterns

| Pattern                       | Behavior                               | Example                  |
| ----------------------------- | -------------------------------------- | ------------------------ |
| `/:workspaceId/:listId/board` | Opens Board View for that list         | `/ws-abc/list-123/board` |
| `/:workspaceId/:listId/list`  | Opens List View for that list          | `/ws-abc/list-123/list`  |
| `/:workspaceId/docs/:docId`   | Opens doc editor directly              | `/ws-abc/docs/doc-456`   |
| `/:workspaceId/tasks/:taskId` | Opens task detail panel from last view | `/ws-abc/tasks/task-789` |
| `/?filter=status:in_progress` | Pre-applied filter via query param     | Board with status filter |

### 7.3 Deep Linking Rules

| Action                      | URL Behavior                                            |
| --------------------------- | ------------------------------------------------------- |
| Click task on board         | Appends `/tasks/:taskId` to current URL; opens panel    |
| Open doc from sidebar       | Navigates to `/docs/:docId`                             |
| Click notification for task | Navigates to task detail, preserving source view        |
| Share task link             | URL with task ID; opens board/list with task panel open |
| Share doc link              | URL with doc ID; opens doc editor directly              |
| Share sprint link           | URL with sprint ID; opens board/list filtered to sprint |

---

## 8. Command Palette Taxonomy

### 8.1 Command Categories

```
┌──────────────────────────────────────────────────────────────┐
│                    COMMAND PALETTE MAP                        │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ── NAVIGATION ─────────────────────────────────────────────  │
│  │  G H    → Go to Home                                       │
│  │  G M    → Go to My Work                                    │
│  │  G B    → Go to Board View                                 │
│  │  G L    → Go to List View                                  │
│  │  G D    → Go to Docs                                       │
│  │  G A    → Go to Automations                                │
│  │  G T    → Go to Team                                       │
│  │  G S    → Go to Settings                                   │
│                                                                │
│  ── CREATION ───────────────────────────────────────────────  │
│  │  N       → New Task (context-aware: in current list)       │
│  │  ⌘ N     → New Document                                    │
│  │  ⌘ Shift N → New Automation                                │
│  │  I       → Import CSV                                      │
│                                                                │
│  ── VIEW ACTIONS ──────────────────────────────────────────  │
│  │  /        → Focus search                                   │
│  │  ⌘ K      → Open command palette                           │
│  │  ⌘ /      → Toggle filter bar                              │
│  │  V B      → Switch to Board View                           │
│  │  V L      → Switch to List View                            │
│                                                                │
│  ── TASK ACTIONS (when task panel open) ──────────────────  │
│  │  E        → Edit task title                                │
│  │  ⌘ Enter  → Save changes                                   │
│  │  ⌘ D      → Duplicate task                                │
│  │  ⌘ Delete → Delete task (with confirmation)                │
│  │  A        → Assign task                                    │
│  │  S        → Change status                                  │
│  │  P        → Change priority                                │
│                                                                │
│  ── AI COMMANDS ──────────────────────────────────────────  │
│  │  /create  → NL task creation                               │
│  │  /summarize → Summarize current sprint/project             │
│  │  /triage  → AI triage for selected tasks                   │
│                                                                │
│  ── HELP ─────────────────────────────────────────────────  │
│  │  ?        → Show keyboard shortcuts                        │
│  │  /help    → Go to Help page                                │
│  └────────────────────────────────────────────────────────────┘
```

---

## 9. Permissions & Access Scoping

### 9.1 Role Hierarchy

```
Owner
  └── Full access: create, read, update, delete, admin, billing, workspace delete
        │
Admin
  └── Full access minus: billing changes, workspace delete
        │
Member
  └── Create/read/update own + all shared content, comment, assign
        │
Guest
  └── Read/write only shared tasks/docs, no admin, no settings
```

### 9.2 Permission Matrix

| Action            | Owner | Admin | Member | Guest |
| ----------------- | :---: | :---: | :----: | :---: |
| Create task       |  ✅   |  ✅   |   ✅   |  ✅*  |
| Edit any task     |  ✅   |  ✅   |   ✅   |  ❌   |
| Delete task       |  ✅   |  ✅   |  ✅**  |  ❌   |
| Create doc        |  ✅   |  ✅   |   ✅   |  ✅*  |
| Edit any doc      |  ✅   |  ✅   |   ✅   |  ❌   |
| Comment on task   |  ✅   |  ✅   |   ✅   |  ✅   |
| Create automation |  ✅   |  ✅   |   ✅   |  ❌   |
| Manage members    |  ✅   |  ✅   |   ❌   |  ❌   |
| Change settings   |  ✅   |  ✅   |   ❌   |  ❌   |
| Manage billing    |  ✅   |  ❌   |   ❌   |  ❌   |
| Delete workspace  |  ✅   |  ❌   |   ❌   |  ❌   |

\* _Guests can only create tasks/docs in shared lists/projects_
\** _Members can only delete their own tasks_

### 9.3 Scoping Rules

| Scope      | Who Sees It                        | Rule                                                               |
| ---------- | ---------------------------------- | ------------------------------------------------------------------ |
| Workspace  | All members                        | Top-level container; everyone in the workspace sees all spaces     |
| Space      | All members                        | Visible to all workspace members (no per-space permissions in MVP) |
| Folder     | All members                        | Visible to all workspace members                                   |
| List       | All members                        | Visible to all workspace members; guests see only shared lists     |
| Task       | Assignee + list members + admins   |                                                                    |
| Doc        | Created by + shared users + admins | Docs can be private (only creator + shared) or workspace-wide      |
| Automation | All members                        | Visible to all; only admins can delete                             |

---

## 10. Cross-Reference Matrix

### 10.1 Entity → Screen Mapping

| Entity     | Primary Screen             | Detail View                    | Create/Edit            |
| ---------- | -------------------------- | ------------------------------ | ---------------------- |
| Task       | Board / List               | Task Detail Panel (slide-in)   | Inline create or modal |
| Doc        | Docs List                  | Doc Editor (full page)         | Modal → inline editor  |
| Sprint     | Sprint Selector (dropdown) | Board/List filtered to sprint  | Modal                  |
| Automation | Automations List           | Automation Builder (full page) | Modal → builder        |
| User       | Team Members               | Settings / Members page        | Invite modal           |
| Group      | Team Groups                | Settings / Members page        | Create modal           |
| Workspace  | — (implicit)               | Settings / General             | Setup wizard           |
| Space      | Sidebar tree               | — (inline in tree)             | Inline in sidebar      |
| Folder     | Sidebar tree               | — (inline in tree)             | Inline in sidebar      |
| List       | Sidebar tree               | — (inline in tree)             | Inline in sidebar      |

### 10.2 Persona → Primary Navigation Path

| Persona    | Morning Entry Point | Primary Navigation            | Power User Shortcut |
| ---------- | ------------------- | ----------------------------- | ------------------- |
| **Sarah**  | Home → Board View   | Sidebar: Space → List → Board | `G B` → Board       |
| **Marcus** | Home → My Work      | Sidebar: Space → List → List  | `G M` → My Work     |
| **Priya**  | Home → Board View   | Sidebar: Space → List → Board | `G B` → Board       |
| **Alex**   | Home → Docs         | Sidebar: Docs → Specific doc  | `G D` → Docs        |

### 10.3 Screen → Entity Dependencies

| Screen             | Depends On                    | Optional With                 |
| ------------------ | ----------------------------- | ----------------------------- |
| Board View         | Workspace, Space, List, Tasks | Sprint, Filters               |
| List View          | Workspace, Space, List, Tasks | Sprint, Filters, Grouping     |
| Task Detail        | Task, Comments, Activity      | Subtasks, Links, Attachments  |
| Doc Editor         | Doc, Content                  | Comments, Backlinks, Versions |
| Automation Builder | Automation, Trigger/Actions   | Conditions, Run History       |
| AI Copilot Panel   | Workspace context             | Current screen context        |
| Settings           | Workspace, User               | Members, Billing              |
| Onboarding Wizard  | User, Workspace               | Team invites                  |

---

## Appendix A: IA Decision Log

| Decision                               | Choice                           | Rationale                                                                                      |
| -------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------- |
| Tasks under Lists, not under Projects  | Lists are the atomic container   | More flexible; a project can span multiple lists; a list can be a sprint or a feature area     |
| Docs are first-class, not inside tasks | Bidirectional links, not nesting | Matches how teams actually work: specs reference many tasks; tasks reference many docs         |
| Automations are workspace-scoped       | Not per-list                     | Automation logic is more valuable when it can span multiple lists; granular scoping is Phase 2 |
| Single assignee per task               | MVP constraint                   | Multi-assignee adds complexity (permissions, notifications, UI) without clear MVP value        |
| Sprints are global (not per-space)     | Simplifies sprint planning       | Teams typically run one sprint across all spaces; per-space sprints are Phase 2                |
| No nested tasks beyond parent/subtask  | Prevents deep nesting confusion  | Parent/subtask is a relationship, not hierarchy; max depth is 1 level                          |

---

> **Next Document:** [04-COMPONENT-HIERARCHY.md](./04-COMPONENT-HIERARCHY.md) — Atomic design system, component tree, composition patterns
