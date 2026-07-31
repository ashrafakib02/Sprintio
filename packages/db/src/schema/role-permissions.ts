import { pgTable, uuid, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { roles } from './roles.js';
import { permissions } from './permissions.js';

/**
 * Role-Permissions junction table — maps roles to their allowed permissions.
 *
 * A role can have many permissions, and a permission can belong to many roles.
 */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    rolePermissionUnique: uniqueIndex('role_permissions_role_id_permission_id_idx').on(
      table.roleId,
      table.permissionId,
    ),
    roleIdIdx: index('role_permissions_role_id_idx').on(table.roleId),
    permissionIdIdx: index('role_permissions_permission_id_idx').on(table.permissionId),
  }),
);
