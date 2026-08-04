# Project Foundation

> Foundation layer for the Project module — database schema, shared types, Zod validation, error handling, frontend API client, Redux state, and TanStack Query hooks.

## Overview

The Project module is the core unit of work in Sprintio's sprint management platform. A project sits within a workspace, groups sprints and tasks, and provides the primary organizational unit that users interact with daily.

This document covers everything built during the foundation phase — the full data model, shared contracts, and frontend infrastructure that all future Project features (CRUD endpoints, settings UI, member management) will build on.

### Where It Sits in the Monorepo

```
packages/db/         → Drizzle ORM schema + relations (projects table)
packages/shared/     → Zod schemas + TypeScript types + constants + errors
apps/web/            → API client + Redux slice + TanStack Query hooks
apps/backend/        → Express routes + controllers + services (future)
```

### Foundation Summary

| Layer            | What Was Built                                                                         |
| ---------------- | -------------------------------------------------------------------------------------- |
| **Database**     | `projects` table (13 columns), 3 enums, indexes, unique constraints, check constraints |
| **Shared types** | `Project`, `ProjectMembership`, `ProjectRole` interfaces + Zod DTOs                    |
| **Constants**    | `PROJECT_STATUSES`, `PROJECT_PRIORITIES`, `PROJECT_VISIBILITIES`, `PROJECT_ROLES`      |
| **Errors**       | `ProjectError` class with 6 static factories                                           |
| **Frontend API** | Full API client (CRUD + archive/restore + member management)                           |
| **Redux**        | UI state slice (filters, dialogs, sidebar, member selection)                           |
| **Hooks**        | 10 TanStack Query hooks (queries + mutations, most with optimistic updates)            |

---

## Database Schema

**File:** `packages/db/src/schema/projects.ts`

### Table: `projects`

| Column         | Type                    | Nullable | Default               | Description                                |
| -------------- | ----------------------- | -------- | --------------------- | ------------------------------------------ |
| `id`           | uuid                    | NOT NULL | `gen_random_uuid()`   | Primary key                                |
| `name`         | varchar(100)            | NOT NULL | —                     | Display name                               |
| `slug`         | varchar(100)            | NOT NULL | —                     | URL-safe identifier (per-workspace unique) |
| `description`  | text                    | nullable | —                     | Optional description                       |
| `workspace_id` | uuid                    | NOT NULL | —                     | FK → `workspaces.id` (CASCADE)             |
| `status`       | project_status enum     | NOT NULL | `'active'`            | Current project status                     |
| `priority`     | project_priority enum   | NOT NULL | `'none'`              | Priority level                             |
| `visibility`   | project_visibility enum | NOT NULL | `'workspace'`         | Who can see the project                    |
| `start_date`   | timestamptz             | nullable | —                     | Planned start                              |
| `end_date`     | timestamptz             | nullable | —                     | Planned end                                |
| `deleted_at`   | timestamptz             | nullable | —                     | Soft delete timestamp                      |
| `created_at`   | timestamptz             | NOT NULL | `now()`               | Row creation time                          |
| `updated_at`   | timestamptz             | NOT NULL | `now()` + `$onUpdate` | Auto-updated on change                     |

### Enums

#### `project_status`

| Value       | Description                                  |
| ----------- | -------------------------------------------- |
| `active`    | Project is in progress                       |
| `on_hold`   | Project paused temporarily                   |
| `completed` | Project is finished                          |
| `archived`  | Project archived (hidden from default views) |

#### `project_priority`

| Value    | Description                  |
| -------- | ---------------------------- |
| `none`   | No priority set (default)    |
| `low`    | Low priority                 |
| `medium` | Medium priority              |
| `high`   | High priority                |
| `urgent` | Requires immediate attention |

#### `project_visibility`

| Value       | Description                                 |
| ----------- | ------------------------------------------- |
| `workspace` | Visible only to workspace members (default) |
| `public`    | Visible to all workspace members + public   |

### Indexes

| Index Name                         | Type   | Columns                  | Purpose                               |
| ---------------------------------- | ------ | ------------------------ | ------------------------------------- |
| `projects_workspace_id_idx`        | btree  | `workspace_id`           | Fast workspace lookups                |
| `projects_workspace_id_status_idx` | btree  | `workspace_id`, `status` | Filtered project list queries         |
| `projects_workspace_id_slug_idx`   | UNIQUE | `workspace_id`, `slug`   | Enforce slug uniqueness per workspace |

### Check Constraints

```sql
CHECK (status IN ('active', 'on_hold', 'completed', 'archived'))
CHECK (priority IN ('none', 'low', 'medium', 'high', 'urgent'))
CHECK (visibility IN ('workspace', 'public'))
```

> **Note:** The DB-level checks are a safety net. The Zod schemas and enum types in `packages/shared` are the primary validation layer and are more expressive.

---

## Folder Structure

```
packages/
  db/
    src/
      schema/
        projects.ts                        # projects table + enums
        relations.ts                       # projectsRelations (workspace, boards, sprints, tasks, documents)

  shared/
    src/
      hierarchy-types.ts                   # Project, ProjectMembership, ProjectRole interfaces + Zod DTOs
      schemas/
        project.ts                         # Re-exports + CreateProjectForWorkspaceSchema + ProjectListQuerySchema + slug helper
      errors/
        project-error.ts                   # ProjectError class (6 static factories)
      constants/
        status.ts                          # PROJECT_STATUSES, PROJECT_PRIORITIES, PROJECT_VISIBILITIES
        roles.ts                           # PROJECT_ROLES, PROJECT_ROLE_HIERARCHY

apps/
  web/
    src/
      types/
        project.ts                         # ProjectUIState, ProjectContextData, ProjectMemberWithUser, ProjectListFilters
      lib/
        project-api.ts                     # API client (CRUD + archive/restore + member management)
        query-keys.ts                      # queryKeys.projects.* factory
        route-constants.ts                 # ROUTES.project*, ROUTES.projectSettings*, etc.
      store/
        slices/
          projectSlice.ts                  # Redux slice (UI state: filters, dialogs, sidebar)
      hooks/
        use-project-settings.ts            # TanStack Query hooks (queries + mutations)
```

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        apps/web (React)                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Redux Slice  │  │ TanStack Queries │  │  API Client      │  │
│  │  (UI State)   │  │ (Server State)   │  │  (fetch layer)   │  │
│  └──────┬───────┘  └────────┬─────────┘  └────────┬─────────┘  │
│         │                   │                      │             │
│         ▼                   ▼                      ▼             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              TanStack Query Cache                        │   │
│  │  queryKeys.projects.{all|list|detail|members|memberRole} │   │
│  └──────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │  HTTP (JSON)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   apps/backend (Express) — FUTURE               │
│                                                                 │
│  Routes → Controllers → Services → Drizzle ORM                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     packages/db (Drizzle)                       │
│                                                                 │
│  projects table ──→ workspace_id FK (CASCADE)                   │
│  indexes: workspace_id, (workspace_id, status), workspace+slug  │
└─────────────────────────────────────────────────────────────────┘
```

### Shared Package Role

```
packages/shared/
  ├── constants/status.ts     →  enum value arrays (PROJECT_STATUSES, etc.)
  ├── constants/roles.ts      →  PROJECT_ROLES, PROJECT_ROLE_HIERARCHY
  ├── hierarchy-types.ts      →  Project interface, Zod schemas (CreateProjectSchema, etc.)
  └── errors/project-error.ts →  ProjectError class
```

The shared package is the single source of truth for all Project domain contracts. Both the backend and frontend import from `@sprintio/shared`.

### State Management Split

| State Type       | Managed By             | What It Stores                                                              |
| ---------------- | ---------------------- | --------------------------------------------------------------------------- |
| **UI State**     | Redux (`projectSlice`) | Active tab, sidebar collapsed, dialog open/close, member selection, filters |
| **Server State** | TanStack Query         | Project data, member lists, API responses                                   |

This separation follows the convention established in the workspace foundation: Redux owns ephemeral UI concerns, TanStack Query owns server data with caching, optimistic updates, and invalidation.

---

## Relations

**File:** `packages/db/src/schema/relations.ts`

### Drizzle Relation Map

```ts
export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    // Many projects → one workspace
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  boards: many(boards), // One project → many boards
  sprints: many(sprints), // One project → many sprints
  tasks: many(tasks), // One project → many tasks
  documents: many(documents), // One project → many documents
}));
```

### Relationship Diagram

```
Workspace (1) ──────────→ (N) Project
                              │
                              ├──→ (N) Sprint ──→ (N) Task
                              │
                              ├──→ (N) Board ──→ (N) Task
                              │
                              ├──→ (N) Task (direct, without board)
                              │
                              └──→ (N) Document (future)
```

### Key Relationships

| Parent    | Child    | FK Column      | Relationship | Cascade    |
| --------- | -------- | -------------- | ------------ | ---------- |
| Workspace | Project  | `workspace_id` | One-to-many  | `CASCADE`  |
| Project   | Sprint   | `project_id`   | One-to-many  | `CASCADE`  |
| Project   | Board    | `project_id`   | One-to-many  | `SET NULL` |
| Project   | Task     | `project_id`   | One-to-many  | `CASCADE`  |
| Project   | Document | `project_id`   | One-to-many  | `SET NULL` |

> **Cascade behavior:** Deleting a workspace cascades to all its projects. Deleting a project cascades to tasks and sprints (both use `CASCADE`). Boards and documents have `SET NULL` on their `project_id` FK — deleting a project sets their `project_id` to `NULL` rather than deleting them.

---

## Permission Model

**Files:** `packages/shared/src/constants/roles.ts`, `packages/shared/src/errors/project-error.ts`

### Project Roles

Three roles at the project scope, each with a numeric hierarchy level:

| Role     | Level | Description                                                     |
| -------- | ----- | --------------------------------------------------------------- |
| `admin`  | 3     | Full project access — manage settings, members, and all content |
| `member` | 2     | Create and edit tasks/sprints/boards, cannot manage members     |
| `viewer` | 1     | Read-only access to project content                             |

### Hierarchy Constants

```ts
// packages/shared/src/constants/roles.ts
export const PROJECT_ROLES = ['admin', 'member', 'viewer'] as const;

export const PROJECT_ROLE_HIERARCHY: Record<string, number> = {
  admin: 3,
  member: 2,
  viewer: 1,
};
```

### Access Control Rules

1. **Workspace membership is a prerequisite** — A user must be a member of the workspace before they can be added to any project within that workspace.
2. **Role assignment constraint** — A user cannot assign a role equal to or higher than their own role within a project. An `admin` (level 3) can assign `member` or `viewer`, but not `admin`.
3. **Owner bypass** — The workspace `owner` (level 4) implicitly has full access to all projects in the workspace without explicit project membership.

### Permission Matrix (Planned)

| Action                    | Admin | Member | Viewer |
| ------------------------- | ----- | ------ | ------ |
| View project              | ✅    | ✅     | ✅     |
| Update project settings   | ✅    | ❌     | ❌     |
| Archive / restore project | ✅    | ❌     | ❌     |
| Delete project            | ✅    | ❌     | ❌     |
| Manage project members    | ✅    | ❌     | ❌     |
| Create sprint             | ✅    | ✅     | ❌     |
| Update / delete sprint    | ✅    | ✅     | ❌     |
| Create task               | ✅    | ✅     | ❌     |
| Update / delete task      | ✅    | ✅     | ❌     |
| Create / update board     | ✅    | ✅     | ❌     |
| View tasks and boards     | ✅    | ✅     | ✅     |

### Error Factories

The `ProjectError` class (`packages/shared/src/errors/project-error.ts`) provides domain-specific error factories:

```ts
ProjectError.notFound(id?)              // 404 — PROJECT_NOT_FOUND
ProjectError.slugConflict(slug)         // 409 — PROJECT_SLUG_CONFLICT
ProjectError.invalidSlug(slug)          // 400 — PROJECT_INVALID_SLUG
ProjectError.archivedWorkspace()        // 400 — PROJECT_ARCHIVED_WORKSPACE
ProjectError.notMemberOfWorkspace()     // 403 — PROJECT_NOT_MEMBER
ProjectError.insufficientPermissions(action) // 403 — PROJECT_INSUFFICIENT_PERMISSIONS
```

All extend `AppError` and integrate with the centralized Express error handler.

---

## Shared Types & Schemas

**Files:** `packages/shared/src/hierarchy-types.ts`, `packages/shared/src/schemas/project.ts`

### TypeScript Interfaces

```ts
interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  workspaceId: string;
  status: ProjectStatus; // 'active' | 'on_hold' | 'completed' | 'archived'
  priority: ProjectPriority; // 'none' | 'low' | 'medium' | 'high' | 'urgent'
  visibility: ProjectVisibility; // 'workspace' | 'public'
  startDate: string | null;
  endDate: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectMembership {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole; // 'admin' | 'member' | 'viewer'
  createdAt: string;
}
```

### Zod Schemas

#### `CreateProjectSchema`

```ts
CreateProjectSchema = {
  name:        string (1–100 chars),
  slug:        string (1–100 chars, regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description?: string (max 2000),
  workspaceId: string (UUID, required),
  priority:    ProjectPrioritySchema (default: 'none'),
  visibility:  ProjectVisibilitySchema (default: 'workspace'),
  startDate?:  string (ISO datetime),
  endDate?:    string (ISO datetime),
}
```

#### `UpdateProjectSchema`

```ts
// All fields from CreateProjectSchema made optional, workspaceId omitted
UpdateProjectSchema = CreateProjectSchema.partial().omit({ workspaceId: true });
```

#### `CreateProjectForWorkspaceSchema`

```ts
// CreateProjectSchema with workspaceId omitted (provided by URL param)
CreateProjectForWorkspaceSchema = CreateProjectSchema.omit({ workspaceId: true });
```

#### `ProjectListQuerySchema`

```ts
ProjectListQuerySchema = {
  status?:     'active' | 'on_hold' | 'completed' | 'archived',
  priority?:   'none' | 'low' | 'medium' | 'high' | 'urgent',
  visibility?: 'workspace' | 'public',
  search?:     string (max 100),
  page?:       number (≥ 1, default: 1),
  limit?:      number (1–100, default: 20),
}
```

### Slug Generation

```ts
// packages/shared/src/schemas/project.ts
generateProjectSlug(name: string): string
// "My Cool Project" → "my-cool-project"
// "API v2.0!"       → "api-v20"
```

---

## Frontend Implementation

### API Client

**File:** `apps/web/src/lib/project-api.ts`

All API functions target the `/api` base path and return `ApiResponse<T>`.

| Function                                        | Method | Endpoint                                 | Description              |
| ----------------------------------------------- | ------ | ---------------------------------------- | ------------------------ |
| `listProjects(wsId, params?)`                   | GET    | `/workspaces/:wsId/projects`             | Paginated project list   |
| `getProject(projId)`                            | GET    | `/projects/:projId`                      | Project detail + stats   |
| `createProject(wsId, data)`                     | POST   | `/workspaces/:wsId/projects`             | Create new project       |
| `updateProject(projId, data)`                   | PATCH  | `/projects/:projId`                      | Update project fields    |
| `deleteProject(projId)`                         | DELETE | `/projects/:projId`                      | Hard delete project      |
| `archiveProject(projId)`                        | POST   | `/projects/:projId/archive`              | Archive project          |
| `restoreProject(projId)`                        | POST   | `/projects/:projId/restore`              | Restore archived project |
| `listProjectMembers(projId)`                    | GET    | `/projects/:projId/members`              | List project members     |
| `addProjectMember(projId, data)`                | POST   | `/projects/:projId/members`              | Add member to project    |
| `removeProjectMember(projId, userId)`           | DELETE | `/projects/:projId/members/:userId`      | Remove member            |
| `updateProjectMemberRole(projId, userId, role)` | PATCH  | `/projects/:projId/members/:userId/role` | Change member role       |

#### Extended Types (API layer)

```ts
interface ProjectWithStats extends ProjectData {
  taskCount: number;
  memberCount: number;
}
```

### Query Key Factory

**File:** `apps/web/src/lib/query-keys.ts`

```ts
queryKeys.projects.all(wsId)                     // ['projects', wsId]
queryKeys.projects.list(wsId: string, filters?: Record<string, unknown>)  // ['projects', 'list', wsId, filters]
queryKeys.projects.detail(projId)                // ['project', projId]
queryKeys.projects.members(projId)               // ['project', projId, 'members']
queryKeys.projects.memberRole(projId, userId)    // ['project', projId, 'members', userId, 'role']
```

### Route Constants

**File:** `apps/web/src/lib/route-constants.ts`

```ts
ROUTES.project(wsId, projId); // /workspace/:wsId/project/:projId
ROUTES.projectBoards(wsId, projId); // /workspace/:wsId/project/:projId/boards
ROUTES.projectSprints(wsId, projId); // /workspace/:wsId/project/:projId/sprints
ROUTES.projectSettings(wsId, projId); // /workspace/:wsId/project/:projId/settings
ROUTES.projectSettingsTab(wsId, projId, tab); // /workspace/:wsId/project/:projId/settings/:tab
ROUTES.projectMembers(wsId, projId); // /workspace/:wsId/project/:projId/settings/members
```

### Redux Slice (UI State)

**File:** `apps/web/src/store/slices/projectSlice.ts`

Manages ephemeral UI state that does not belong in the server cache:

| State Field        | Type                       | Purpose                                |
| ------------------ | -------------------------- | -------------------------------------- |
| `activeTab`        | `ProjectSettingsTab`       | Current settings tab                   |
| `sidebarCollapsed` | `boolean`                  | Mobile sidebar state                   |
| `createDialogOpen` | `boolean`                  | Create project dialog visibility       |
| `selectedMemberId` | `string \| null`           | Member selected for role change/remove |
| `inviteDialogOpen` | `boolean`                  | Invite member dialog visibility        |
| `memberSearch`     | `string`                   | Member list search filter              |
| `memberRoleFilter` | `ProjectRole \| 'all'`     | Member list role filter                |
| `statusFilter`     | `ProjectStatus \| 'all'`   | Project list status filter             |
| `priorityFilter`   | `ProjectPriority \| 'all'` | Project list priority filter           |
| `projectSearch`    | `string`                   | Project list search term               |

**Exported Actions:**

```ts
(setActiveTab,
  toggleSidebar,
  setSidebarCollapsed,
  openCreateDialog,
  closeCreateDialog,
  selectMember,
  openInviteDialog,
  closeInviteDialog,
  setMemberSearch,
  setMemberRoleFilter,
  setStatusFilter,
  setPriorityFilter,
  setProjectSearch,
  resetProjectUI);
```

### TanStack Query Hooks

**File:** `apps/web/src/hooks/use-project-settings.ts`

#### Query Hooks

| Hook                | Input                 | Returns                          | Stale Time |
| ------------------- | --------------------- | -------------------------------- | ---------- |
| `useProjectList`    | `(wsId, params?)`     | `PaginatedResponse<ProjectData>` | 30s        |
| `useProjectDetail`  | `(projectId \| null)` | `ProjectWithStats`               | 30s        |
| `useProjectMembers` | `(projectId \| null)` | `ProjectMember[]`                | 30s        |

#### Mutation Hooks

| Hook                                 | Input                                                                         | Optimistic Update  | Toast         |
| ------------------------------------ | ----------------------------------------------------------------------------- | ------------------ | ------------- |
| `useCreateProject(wsId)`             | `{ name, slug?, description?, priority?, visibility?, startDate?, endDate? }` | ✅ (temp ID)       | success/error |
| `useUpdateProject(projId)`           | `{ name?, slug?, status?, ... }`                                              | ✅ (inline merge)  | success/error |
| `useArchiveProject(projId)`          | —                                                                             | ✅ (sets archived) | success/error |
| `useRestoreProject(projId)`          | —                                                                             | ✅ (sets active)   | success/error |
| `useDeleteProject(projId, wsId)`     | —                                                                             | ❌ (invalidates)   | success/error |
| `useAddProjectMember(projId)`        | `{ userId, role }`                                                            | ❌ (invalidates)   | success/error |
| `useRemoveProjectMember(projId)`     | `userId`                                                                      | ✅ (filters out)   | success/error |
| `useUpdateProjectMemberRole(projId)` | `{ userId, role }`                                                            | ✅ (maps role)     | success/error |

Most mutation hooks use optimistic updates: update cache in `onMutate`, rollback in `onError`, invalidate in `onSettled`, toast in `onSuccess`/`onError`. `useDeleteProject` and `useAddProjectMember` skip optimistic updates — they invalidate the cache in `onSuccess` and only show a toast on success/error.

---

## Frontend Types

**File:** `apps/web/src/types/project.ts`

### ProjectUIState

Type definition for the Redux slice's state shape. Covers all UI-level concerns: active settings tab, dialog visibility, sidebar collapse, member selection, and filter/search fields.

### ProjectContextData

```ts
interface ProjectContextData {
  project: Project;
  userRole: string;
  members: ProjectMembership[];
}
```

Used when providing project context to child components.

### ProjectMemberWithUser

```ts
interface ProjectMemberWithUser {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}
```

Extends `ProjectMembership` with joined user data for display in member lists.

### ProjectListFilters

```ts
interface ProjectListFilters {
  status?: ProjectStatus;
  priority?: ProjectPriority;
  visibility?: ProjectVisibility;
  search?: string;
  page?: number;
  limit?: number;
}
```

Frontend-facing filter type for project list views.

---

## Design Decisions

1. **Slug is workspace-scoped** — The unique constraint is `(workspace_id, slug)`, not a global slug. Two workspaces can have projects with the same slug.

2. **Soft delete via `deleted_at`** — Projects use `deleted_at` for soft deletion. Hard delete is available via the API but should be restricted to admins. Soft-deleted projects are excluded from default queries.

3. **`workspace_id` cascade** — Deleting a workspace cascades to all its projects. Deleting a project cascades to tasks and sprints. Boards and documents have `SET NULL` on their `project_id` FK.

4. **Optimistic updates** — Most mutation hooks use TanStack Query's `onMutate` pattern for instant UI feedback. Rollback is handled in `onError` using snapshot restoration. `useDeleteProject` and `useAddProjectMember` skip optimistic updates and rely on cache invalidation after success.

5. **Redux for UI only** — Server data lives exclusively in TanStack Query cache. Redux handles ephemeral UI state (open dialogs, active tabs, filter values) that would be wasteful to cache server-side.

6. **Three-tier role model** — Project roles (`admin`, `member`, `viewer`) are distinct from workspace roles (`owner`, `admin`, `member`, `guest`). The hierarchy is independent with its own numeric levels.

7. **Slug auto-generation** — The `generateProjectSlug()` helper converts names to URL-safe slugs. The frontend can call this for preview; the backend should validate uniqueness within the workspace.

---

## What's NOT Included (Future Work)

This is a **foundation only**. The following are explicitly out of scope:

### Backend

- Express routes, controllers, and services (`apps/backend/src/modules/project/`)
- Repository layer for project data access
- Authentication and authorization middleware integration
- Slug uniqueness validation at the database/service level
- Batch operations (bulk archive, bulk status change)
- Project duplication/forking

### Frontend

- Project list page and project detail page components
- Project settings page with tab navigation
- Member management UI (invite, remove, role change dialogs)
- Project creation form/dialog component
- Board and sprint management views within a project

### Domain

- Full RBAC permission enforcement (middleware integration)
- Audit logging for project changes
- Project templates
- Project archiving policies (auto-archive after N days of inactivity)
- Cross-workspace project linking
- Project-level notification preferences
