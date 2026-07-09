import { pgTable, uuid, varchar, text, bigint, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const attachments = pgTable('attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: varchar('filename', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),
  url: text('url').notNull(),
  uploaderId: uuid('uploader_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
