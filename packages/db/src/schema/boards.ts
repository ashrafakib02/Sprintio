import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces.js';
import { projects } from './projects.js';

export const boards = pgTable(
  'boards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    workspaceIdIdx: index('boards_workspace_id_idx').on(table.workspaceId),
    projectIdIdx: index('boards_project_id_idx').on(table.projectId),
  }),
);
