import { pgTable, uuid, varchar, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { columns } from './columns.js';

export const cards = pgTable('cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  columnId: uuid('column_id').notNull().references(() => columns.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0),
  priority: varchar('priority', { length: 20 }).notNull().default('none'),
  assigneeIds: jsonb('assignee_ids').$type<string[]>().default([]),
  labelIds: jsonb('label_ids').$type<string[]>().default([]),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
