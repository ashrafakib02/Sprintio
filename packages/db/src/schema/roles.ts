import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Roles table — defines available roles within a scope (organization or workspace).
 *
 * System roles (isSystem=true) are seeded at migration time and cannot be deleted.
 * Custom roles can be created per-organization or per-workspace.
 */
export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 50 }).notNull(),
    description: text('description'),
    /** 'organization' | 'workspace' — determines where this role can be assigned */
    scope: varchar('scope', { length: 20 }).notNull(),
    /** System roles cannot be modified or deleted by users */
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    nameScopeUnique: uniqueIndex('roles_name_scope_idx').on(table.name, table.scope),
    scopeIdx: index('roles_scope_idx').on(table.scope),
  }),
);
