import { pgTable, uuid, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { workspaces } from './workspaces.js';

export const workspaceInvitations = pgTable(
  'workspace_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull().default('member'),
    token: varchar('token', { length: 64 }).notNull().unique(),
    invitedById: uuid('invited_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    workspaceEmailUnique: uniqueIndex('workspace_invitations_workspace_id_email_idx').on(
      table.workspaceId,
      table.email,
    ),
    tokenIdx: uniqueIndex('workspace_invitations_token_idx').on(table.token),
    workspaceIdIdx: index('workspace_invitations_workspace_id_idx').on(table.workspaceId),
    emailIdx: index('workspace_invitations_email_idx').on(table.email),
  }),
);
