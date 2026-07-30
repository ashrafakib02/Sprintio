import { pgTable, uuid, varchar, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

/**
 * Permissions table — defines all available permissions in the system.
 *
 * Each permission is a `resource:action` pair (e.g. 'workspace:update').
 * Seeded at migration time from the shared PERMISSIONS constant.
 */
export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Unique permission identifier, e.g. 'workspace:update' */
    name: varchar('name', { length: 100 }).notNull().unique(),
    /** The resource this permission applies to, e.g. 'workspace' */
    resource: varchar('resource', { length: 50 }).notNull(),
    /** The action allowed, e.g. 'update' */
    action: varchar('action', { length: 50 }).notNull(),
    /** Human-readable description */
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    resourceIdx: index('permissions_resource_idx').on(table.resource),
    resourceActionUnique: uniqueIndex('permissions_resource_action_idx').on(table.resource, table.action),
  }),
);
