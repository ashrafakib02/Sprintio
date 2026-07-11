import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { boards } from './boards.js';

export const columns = pgTable('board_columns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  boardId: uuid('board_id')
    .notNull()
    .references(() => boards.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0),
  color: varchar('color', { length: 7 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
