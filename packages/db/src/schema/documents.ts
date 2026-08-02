import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces.js';
import { users } from './users.js';
import { projects } from './projects.js';

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    content: jsonb('content').$type<Record<string, unknown>>().default({}),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
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
    workspaceIdIdx: index('documents_workspace_id_idx').on(table.workspaceId),
    projectIdIdx: index('documents_project_id_idx').on(table.projectId),
    authorIdIdx: index('documents_author_id_idx').on(table.authorId),
  }),
);
