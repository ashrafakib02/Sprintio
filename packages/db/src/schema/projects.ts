import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces.js';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  startDate: timestamp('start_date', { withTimezone: true, mode: 'date' }),
  endDate: timestamp('end_date', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});
