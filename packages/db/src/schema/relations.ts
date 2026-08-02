import { relations } from 'drizzle-orm';
import { organizations } from './organizations.js';
import { organizationMembers } from './organization-members.js';
import { workspaces } from './workspaces.js';
import { workspaceMembers } from './workspace-members.js';
import { workspaceInvitations } from './workspace-invitations.js';
import { users } from './users.js';
import { roles } from './roles.js';
import { permissions } from './permissions.js';
import { rolePermissions } from './role-permissions.js';
import { userRoles } from './user-roles.js';
import { projects } from './projects.js';
import { sprints } from './sprints.js';
import { boards } from './boards.js';
import { columns } from './columns.js';
import { tasks } from './tasks.js';

// ============================================================
// Organization Relations
// ============================================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  workspaces: many(workspaces),
}));

// ============================================================
// Organization Member Relations
// ============================================================

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}));

// ============================================================
// Workspace Relations
// ============================================================

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [workspaces.organizationId],
    references: [organizations.id],
  }),
  members: many(workspaceMembers),
  invitations: many(workspaceInvitations),
  projects: many(projects),
  boards: many(boards),
}));

// ============================================================
// Workspace Member Relations
// ============================================================

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}));

// ============================================================
// Workspace Invitation Relations
// ============================================================

export const workspaceInvitationsRelations = relations(workspaceInvitations, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceInvitations.workspaceId],
    references: [workspaces.id],
  }),
  invitedBy: one(users, {
    fields: [workspaceInvitations.invitedById],
    references: [users.id],
  }),
}));

// ============================================================
// Project Relations
// ============================================================

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  sprints: many(sprints),
  tasks: many(tasks),
}));

// ============================================================
// Sprint Relations
// ============================================================

export const sprintsRelations = relations(sprints, ({ one, many }) => ({
  project: one(projects, {
    fields: [sprints.projectId],
    references: [projects.id],
  }),
  tasks: many(tasks),
}));

// ============================================================
// Board Relations
// ============================================================

export const boardsRelations = relations(boards, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [boards.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [boards.projectId],
    references: [projects.id],
  }),
  columns: many(columns),
  tasks: many(tasks),
}));

// ============================================================
// Column Relations
// ============================================================

export const columnsRelations = relations(columns, ({ one, many }) => ({
  board: one(boards, {
    fields: [columns.boardId],
    references: [boards.id],
  }),
  tasks: many(tasks),
}));

// ============================================================
// Task Relations
// ============================================================

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  board: one(boards, {
    fields: [tasks.boardId],
    references: [boards.id],
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
  }),
}));

// ============================================================
// RBAC Relations
// ============================================================

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

// ============================================================
// User Relations (reverse lookups)
// ============================================================

export const usersRelations = relations(users, ({ many }) => ({
  organizationMemberships: many(organizationMembers),
  workspaceMemberships: many(workspaceMembers),
  workspaceInvitations: many(workspaceInvitations),
  userRoles: many(userRoles),
  assignedTasks: many(tasks),
}));
