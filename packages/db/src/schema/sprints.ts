import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';

export const sprints = pgTable(
  'sprints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    goal: text('goal'),
    startDate: timestamp('start_date', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true, mode: 'date' }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('planned'),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    projectIdIdx: index('sprints_project_id_idx').on(table.projectId),
  }),
);
