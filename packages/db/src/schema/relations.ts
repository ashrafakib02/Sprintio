import { relations } from 'drizzle-orm';
import { organizations } from './organizations.js';
import { organizationMembers } from './organization-members.js';
import { workspaces } from './workspaces.js';
import { workspaceMembers } from './workspace-members.js';
import { users } from './users.js';

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
// User Relations (reverse lookups)
// ============================================================

export const usersRelations = relations(users, ({ many }) => ({
  organizationMemberships: many(organizationMembers),
  workspaceMemberships: many(workspaceMembers),
}));
