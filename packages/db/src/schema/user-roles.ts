import { pgTable, uuid, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { roles } from './roles.js';

/**
 * User-Roles table — assigns roles to users within a specific scope.
 *
 * scope + scopeId define the context:
 *   - scope='organization', scopeId=<org_id>  → user is an org member with this role
 *   - scope='workspace',    scopeId=<ws_id>   → user is a workspace member with this role
 *   - scope='global',       scopeId=null       → platform-wide role (replaces users.role)
 *
 * This table replaces the role columns on organization_members, workspace_members,
 * and users — providing a single source of truth for RBAC.
 *
 * During migration, existing role data from membership tables is copied here.
 */
export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    /** 'global' | 'organization' | 'workspace' */
    scope: varchar('scope', { length: 20 }).notNull(),
    /** The ID of the org/workspace this role applies to. Null for global scope. */
    scopeId: uuid('scope_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    userScopeUnique: uniqueIndex('user_roles_user_scope_scope_id_role_id_idx').on(
      table.userId,
      table.scope,
      table.scopeId,
      table.roleId,
    ),
    userIdIdx: index('user_roles_user_id_idx').on(table.userId),
    roleIdIdx: index('user_roles_role_id_idx').on(table.roleId),
    scopeIdx: index('user_roles_scope_idx').on(table.scope, table.scopeId),
  }),
);
