import { pgTable, uuid, varchar, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { boards } from './boards.js';
import { columns } from './columns.js';
import { users } from './users.js';

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 30 }).notNull().default('todo'),
  priority: varchar('priority', { length: 20 }).notNull().default('none'),
  assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  boardId: uuid('board_id')
    .notNull()
    .references(() => boards.id, { onDelete: 'cascade' }),
  columnId: uuid('column_id')
    .notNull()
    .references(() => columns.id, { onDelete: 'cascade' }),
  sprintId: uuid('sprint_id'),
  position: integer('position').notNull().default(0),
  labels: jsonb('labels').$type<string[]>().default([]),
  dueDate: timestamp('due_date', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});
