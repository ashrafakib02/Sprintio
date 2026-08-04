import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { workspaces } from './workspaces.js';

// ── Enums ────────────────────────────────────────────────────────
export const projectStatusEnum = pgEnum('project_status', [
  'active',
  'on_hold',
  'completed',
  'archived',
]);

export const projectPriorityEnum = pgEnum('project_priority', [
  'none',
  'low',
  'medium',
  'high',
  'urgent',
]);

export const projectVisibilityEnum = pgEnum('project_visibility', ['workspace', 'public']);

// ── Table ────────────────────────────────────────────────────────
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    description: text('description'),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    status: projectStatusEnum('status').notNull().default('active'),
    priority: projectPriorityEnum('priority').notNull().default('none'),
    visibility: projectVisibilityEnum('visibility').notNull().default('workspace'),
    startDate: timestamp('start_date', { withTimezone: true, mode: 'date' }),
    endDate: timestamp('end_date', { withTimezone: true, mode: 'date' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
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
    workspaceIdIdx: index('projects_workspace_id_idx').on(table.workspaceId),
    workspaceStatusIdx: index('projects_workspace_id_status_idx').on(
      table.workspaceId,
      table.status,
    ),
    workspaceSlugUnique: uniqueIndex('projects_workspace_id_slug_idx').on(
      table.workspaceId,
      table.slug,
    ),
    statusCheck: sql`CHECK (${table.status} IN ('active', 'on_hold', 'completed', 'archived'))`,
    priorityCheck: sql`CHECK (${table.priority} IN ('none', 'low', 'medium', 'high', 'urgent'))`,
    visibilityCheck: sql`CHECK (${table.visibility} IN ('workspace', 'public'))`,
  }),
);
