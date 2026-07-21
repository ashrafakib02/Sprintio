import { pgTable, uuid, varchar, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { boards } from './boards.js';

export const columns = pgTable(
  'board_columns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    boardId: uuid('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    color: varchar('color', { length: 7 }),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    boardIdIdx: index('board_columns_board_id_idx').on(table.boardId),
  }),
);
