import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { boards } from './boards.js';
import { columns } from './columns.js';
import { users } from './users.js';
import { sprints } from './sprints.js';
import { projects } from './projects.js';

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 30 }).notNull().default('todo'),
    priority: varchar('priority', { length: 20 }).notNull().default('none'),
    assigneeId: uuid('assignee_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    boardId: uuid('board_id').references(() => boards.id, {
      onDelete: 'set null',
    }),
    columnId: uuid('column_id').references(() => columns.id, {
      onDelete: 'set null',
    }),
    sprintId: uuid('sprint_id').references(() => sprints.id, {
      onDelete: 'set null',
    }),
    position: integer('position').notNull().default(0),
    labels: jsonb('labels').$type<string[]>().default([]),
    dueDate: timestamp('due_date', { withTimezone: true, mode: 'date' }),
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
    projectIdIdx: index('tasks_project_id_idx').on(table.projectId),
    boardIdIdx: index('tasks_board_id_idx').on(table.boardId),
    columnIdIdx: index('tasks_column_id_idx').on(table.columnId),
    sprintIdIdx: index('tasks_sprint_id_idx').on(table.sprintId),
    assigneeIdIdx: index('tasks_assignee_id_idx').on(table.assigneeId),
  }),
);
