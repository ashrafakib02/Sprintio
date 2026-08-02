/**
 * Sprintio Hierarchy Schema Redesign
 * ===================================
 *
 * Target hierarchy: Organization → Workspace → Project → Task
 *
 * This file documents:
 *  1. Schema modifications (Drizzle ORM definitions)
 *  2. Updated Drizzle relation definitions for the full entity graph
 *  3. Raw SQL for foreign-key changes
 *  4. Cascade rules table
 *
 * IMPORTANT: This file is a design document / reference. It does NOT alter
 * existing schema files at import time. Apply the changes to the actual
 * schema files, then run drizzle-kit generate to produce migration files.
 */

// ---------------------------------------------------------------------------
// 1. SCHEMA MODIFICATIONS
// ---------------------------------------------------------------------------
//
// For each changed table: current excerpt → new definition + migration notes.

// ──────────────────────────────────────────────────────────────────────────────
// 1a. workspaces.organizationId  (NULLABLE → NOT NULL)
// ──────────────────────────────────────────────────────────────────────────────

// CURRENT  (packages/db/src/schema/workspaces.ts, line 12-14)
// -----------------------------------------------------------------------
// organizationId: uuid('organization_id').references(() => organizations.id, {
//   onDelete: 'cascade',
// }),

// NEW
// -----------------------------------------------------------------------
// organizationId: uuid('organization_id')
//   .notNull()                                          // ← added
//   .references(() => organizations.id, {
//     onDelete: 'cascade',
//   }),

// MIGRATION NOTES
// -----------------------------------------------------------------------
// Before running ALTER TABLE ... SET NOT NULL, back-fill any rows where
// organization_id IS NULL.  Options:
//   a) Delete orphan workspaces:   DELETE FROM workspaces WHERE organization_id IS NULL;
//   b) Assign a default org:       UPDATE workspaces SET organization_id = '<uuid>' WHERE organization_id IS NULL;
// After back-fill:
//   ALTER TABLE workspaces ALTER COLUMN organization_id SET NOT NULL;

// ──────────────────────────────────────────────────────────────────────────────
// 1b. tasks  —  ADD projectId FK
// ──────────────────────────────────────────────────────────────────────────────

// CURRENT  (packages/db/src/schema/tasks.ts, lines 16-59)
// -----------------------------------------------------------------------
// tasks has: boardId, columnId, sprintId, assigneeId — but NO projectId.

// NEW  (full replacement excerpt)
// -----------------------------------------------------------------------
// The table gains a new required column and a new index.
//
//   projectId: uuid('project_id')
//     .notNull()
//     .references(() => projects.id, { onDelete: 'cascade' }),
//
// Index to add:
//   projectIdIdx: index('tasks_project_id_idx').on(table.projectId),
//
// KEEP existing FKs:
//   boardId   → boards.id   (CASCADE)   — optional, task can exist without a board
//   columnId  → columns.id  (CASCADE)   — required, task must live in a column
//   sprintId  → sprints.id  (SET NULL)  — optional, task may be outside a sprint
//   assigneeId → users.id   (SET NULL)  — optional
//
// RATIONALE for keeping boardId/columnId/sprintId:
//   - boardId + columnId model the Kanban/Scrum board layout (position within a column).
//   - sprintId ties a task to a sprint timebox. SET NULL keeps the task alive if
//     its sprint is deleted.
//   - projectId is the new authoritative ownership link in the hierarchy.
//     A task belongs to exactly one project; board/column/sprint are views on it.

// MIGRATION NOTES
// -----------------------------------------------------------------------
// 1. Add the column as nullable first:
//    ALTER TABLE tasks ADD COLUMN project_id UUID;
//
// 2. Back-fill from board → project mapping (if a project FK exists on boards,
//    or from a column → board → project chain). If no mapping exists, create a
//    default project and assign:
//    UPDATE tasks SET project_id = '<default-project-uuid>' WHERE project_id IS NULL;
//
// 3. Enforce NOT NULL + FK:
//    ALTER TABLE tasks
//      ALTER COLUMN project_id SET NOT NULL,
//      ADD CONSTRAINT tasks_project_id_fk
//        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
//
// 4. Add index:
//    CREATE INDEX tasks_project_id_idx ON tasks(project_id);

// ──────────────────────────────────────────────────────────────────────────────
// 1c. boards  —  ADD optional projectId FK  (design decision)
// ──────────────────────────────────────────────────────────────────────────────

// Boards currently reference workspaceId directly.  To connect a board to a
// specific project within that workspace, add an OPTIONAL projectId:
//
//   projectId: uuid('project_id')
//     .references(() => projects.id, { onDelete: 'set null' }),
//
// This lets a board be scoped to a project.  When NULL the board is a
// workspace-level board.  Keeping it optional avoids breaking existing boards.
//
// Index:  boardProjectIdIdx: index('boards_project_id_idx').on(table.projectId),

// ──────────────────────────────────────────────────────────────────────────────
// 1d. documents  —  ADD optional projectId FK
// ──────────────────────────────────────────────────────────────────────────────

// CURRENT: documents references workspaceId + authorId only.
// NEW: add optional link to project:
//
//   projectId: uuid('project_id')
//     .references(() => projects.id, { onDelete: 'set null' }),
//
// Index:  documentProjectIdIdx: index('documents_project_id_idx').on(table.projectId),

// ============================================================================
// 2. DRIZZLE RELATION DEFINITIONS
// ============================================================================
//
// These are the complete relation blocks for every entity in the hierarchy.
// Import them into packages/db/src/schema/relations.ts.

import { relations } from 'drizzle-orm';

// ── Table imports ────────────────────────────────────────────────────────────
// Adjust import paths to match your project structure.
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

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

export const organizationsHierarchyRelations = relations(organizations, ({ many }) => ({
  /** org owns many workspaces */
  workspaces: many(workspaces),
  /** org membership list */
  members: many(organizationMembers),
}));

// ---------------------------------------------------------------------------
// Organization Members
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

export const workspacesHierarchyRelations = relations(workspaces, ({ one, many }) => ({
  /** each workspace belongs to exactly one organization */
  organization: one(organizations, {
    fields: [workspaces.organizationId],
    references: [organizations.id],
  }),
  /** workspace membership list */
  members: many(workspaceMembers),
  /** workspace invitations */
  invitations: many(workspaceInvitations),
  /** a workspace contains many projects */
  projects: many(projects),
  /** a workspace may have many boards (workspace-level) */
  boards: many(boards),
  /** a workspace may have many documents */
  documents: many(documents),
}));

// ---------------------------------------------------------------------------
// Workspace Members
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Workspace Invitations
// ---------------------------------------------------------------------------

export const workspaceInvitationsHierarchyRelations = relations(workspaceInvitations, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceInvitations.workspaceId],
    references: [workspaces.id],
  }),
  invitedBy: one(users, {
    fields: [workspaceInvitations.invitedById],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// Project  (Workspace → Project)
// ---------------------------------------------------------------------------

export const projectsHierarchyRelations = relations(projects, ({ one, many }) => ({
  /** project belongs to exactly one workspace */
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  /** project has many sprints */
  sprints: many(sprints),
  /** project owns many tasks */
  tasks: many(tasks),
  /** project may have scoped boards */
  boards: many(boards),
  /** project may have scoped documents */
  documents: many(documents),
}));

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

export const boardsHierarchyRelations = relations(boards, ({ one, many }) => ({
  /** board belongs to a workspace */
  workspace: one(workspaces, {
    fields: [boards.workspaceId],
    references: [workspaces.id],
  }),
  /** board optionally scoped to a project */
  project: one(projects, {
    fields: [boards.projectId],
    references: [projects.id],
    relationName: 'projectBoards',
  }),
  /** board has ordered columns */
  columns: many(columns),
  /** board has many tasks displayed on it */
  tasks: many(tasks),
}));

// ---------------------------------------------------------------------------
// Column (Board Column)
// ---------------------------------------------------------------------------

export const columnsHierarchyRelations = relations(columns, ({ one, many }) => ({
  /** column belongs to a board */
  board: one(boards, {
    fields: [columns.boardId],
    references: [boards.id],
  }),
  /** column contains ordered tasks */
  tasks: many(tasks),
}));

// ---------------------------------------------------------------------------
// Sprint
// ---------------------------------------------------------------------------

export const sprintsHierarchyRelations = relations(sprints, ({ one, many }) => ({
  /** sprint belongs to a project */
  project: one(projects, {
    fields: [sprints.projectId],
    references: [projects.id],
  }),
  /** sprint contains many tasks */
  tasks: many(tasks),
}));

// ---------------------------------------------------------------------------
// Task  (Project → Task)
// ---------------------------------------------------------------------------

export const tasksHierarchyRelations = relations(tasks, ({ one }) => ({
  /** task belongs to exactly one project (NEW) */
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  /** task optionally displayed on a board */
  board: one(boards, {
    fields: [tasks.boardId],
    references: [boards.id],
    relationName: 'boardTasks',
  }),
  /** task lives in a specific column */
  column: one(columns, {
    fields: [tasks.columnId],
    references: [columns.id],
  }),
  /** task optionally assigned to a sprint */
  sprint: one(sprints, {
    fields: [tasks.sprintId],
    references: [sprints.id],
  }),
  /** task optionally assigned to a user */
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
    relationName: 'assignee',
  }),
}));

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export const documentsHierarchyRelations = relations(documents, ({ one, many }) => ({
  /** document belongs to a workspace */
  workspace: one(workspaces, {
    fields: [documents.workspaceId],
    references: [workspaces.id],
  }),
  /** document optionally scoped to a project */
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
    relationName: 'projectDocuments',
  }),
  /** document has an author */
  author: one(users, {
    fields: [documents.authorId],
    references: [users.id],
  }),
  /** document may have attachments */
  attachments: many(attachments),
}));

// ---------------------------------------------------------------------------
// Attachment
// ---------------------------------------------------------------------------

export const attachmentsHierarchyRelations = relations(attachments, ({ one }) => ({
  /** attachment optionally linked to a task */
  task: one(tasks, {
    fields: [attachments.taskId],
    references: [tasks.id],
  }),
  /** attachment optionally linked to a document */
  document: one(documents, {
    fields: [attachments.documentId],
    references: [documents.id],
  }),
  /** attachment uploaded by a user */
  uploader: one(users, {
    fields: [attachments.uploaderId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

export const notificationsHierarchyRelations = relations(notifications, ({ one }) => ({
  /** notification belongs to a user */
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// User  (reverse lookups)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// RBAC
// ---------------------------------------------------------------------------

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

// ============================================================================
// 3. FOREIGN KEY CHANGES  (raw SQL)
// ============================================================================
//
// Execute these in order.  All statements assume PostgreSQL.

/*
-- ──────────────────────────────────────────────────────────────────────────────
-- 3a. workspaces.organization_id  NULLABLE → NOT NULL
-- ──────────────────────────────────────────────────────────────────────────────
-- STEP 1: back-fill orphans (choose one)
DELETE FROM workspaces WHERE organization_id IS NULL;
-- OR: UPDATE workspaces SET organization_id = '<default-org-uuid>' WHERE organization_id IS NULL;

-- STEP 2: enforce
ALTER TABLE workspaces
  ALTER COLUMN organization_id SET NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3b. tasks  —  ADD project_id
-- ──────────────────────────────────────────────────────────────────────────────
-- STEP 1: add nullable column
ALTER TABLE tasks
  ADD COLUMN project_id UUID;

-- STEP 2: back-fill
-- Option A: derive from board → project (if boards gain projectId)
UPDATE tasks t
SET    project_id = b.project_id
FROM   boards b
WHERE  t.board_id = b.id
  AND  b.project_id IS NOT NULL;

-- Option B: assign all to a default project
-- UPDATE tasks SET project_id = '<default-project-uuid>';

-- STEP 3: enforce NOT NULL + FK
ALTER TABLE tasks
  ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_project_id_fk
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- STEP 4: index
CREATE INDEX tasks_project_id_idx ON tasks(project_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3c. boards  —  ADD optional project_id  (optional design choice)
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE boards
  ADD COLUMN project_id UUID
  REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX boards_project_id_idx ON boards(project_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3d. documents  —  ADD optional project_id  (optional design choice)
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE documents
  ADD COLUMN project_id UUID
  REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX documents_project_id_idx ON documents(project_id);
*/

// ============================================================================
// 4. CASCADE RULES TABLE
// ============================================================================
//
// | #  | Parent       | Child        | FK Column             | On Delete   | Rationale                                                |
// |----|--------------|--------------|-----------------------|-------------|----------------------------------------------------------|
// |  1 | organizations| workspaces   | organization_id       | CASCADE     | Deleting an org removes all its workspaces.              |
// |  2 | organizations| org_members  | organization_id       | CASCADE     | Deleting an org removes its membership records.         |
// |  3 | workspaces   | projects     | workspace_id          | CASCADE     | Deleting a workspace removes all its projects.          |
// |  4 | workspaces   | boards       | workspace_id          | CASCADE     | Deleting a workspace removes its boards.                |
// |  5 | workspaces   | documents    | workspace_id          | CASCADE     | Deleting a workspace removes its documents.             |
// |  6 | workspaces   | ws_members   | workspace_id          | CASCADE     | Deleting a workspace removes its membership records.    |
// |  7 | workspaces   | ws_invite    | workspace_id          | CASCADE     | Deleting a workspace removes its pending invitations.   |
// |  8 | projects     | sprints      | project_id            | CASCADE     | Deleting a project removes its sprints.                 |
// |  9 | projects     | tasks        | project_id            | CASCADE     | Deleting a project removes all its tasks.               |
// | 10 | projects     | boards       | project_id            | SET NULL    | Board outlives project; scope becomes workspace-wide.   |
// | 11 | projects     | documents    | project_id            | SET NULL    | Document outlives project; scope becomes workspace-wide.|
// | 12 | boards       | columns      | board_id              | CASCADE     | Deleting a board removes its columns.                   |
// | 13 | boards       | tasks        | board_id              | SET NULL    | Task survives board deletion; task still in project.    |
// | 14 | columns      | tasks        | column_id             | CASCADE     | Deleting a column removes tasks in that column.         |
// | 15 | sprints      | tasks        | sprint_id             | SET NULL    | Task survives sprint deletion; sprint is a timebox.     |
// | 16 | users        | tasks        | assignee_id           | SET NULL    | Task survives user deletion; assignment cleared.        |
// | 17 | users        | attachments  | uploader_id           | CASCADE     | Deleting a user removes their uploads.                  |
// | 18 | users        | notifications| user_id               | CASCADE     | Deleting a user removes their notifications.            |
// | 19 | users        | documents    | author_id             | CASCADE     | Deleting a user removes their authored documents.       |
// | 20 | tasks        | attachments  | task_id               | SET NULL    | Attachment survives task deletion; keeps the file.      |
// | 21 | documents    | attachments  | document_id           | SET NULL    | Attachment survives document deletion; keeps the file.  |
// | 22 | users        | org_members  | user_id               | CASCADE     | Deleting a user removes their org memberships.         |
// | 23 | users        | ws_members   | user_id               | CASCADE     | Deleting a user removes their workspace memberships.   |
// | 24 | users        | ws_invite    | invited_by_id         | SET NULL    | Invitation stays; inviter reference cleared.            |
// | 25 | roles        | role_perms   | role_id               | CASCADE     | Deleting a role removes its permission mappings.        |
// | 26 | permissions  | role_perms   | permission_id         | CASCADE     | Deleting a permission removes its role mappings.        |
// | 27 | users        | user_roles   | user_id               | CASCADE     | Deleting a user removes their role assignments.        |
// | 28 | roles        | user_roles   | role_id               | CASCADE     | Deleting a role removes all user assignments of it.     |
