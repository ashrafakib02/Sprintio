import { eq, asc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { columns } from '../schema/index.js';

// ============================================================
// Types
// ============================================================

export interface ColumnRecord {
  id: string;
  name: string;
  boardId: string;
  position: number;
  color: string | null;
  createdAt: Date;
}

export interface CreateColumnData {
  name: string;
  boardId: string;
  position: number;
  color?: string | null;
}

export interface UpdateColumnData {
  name?: string;
  position?: number;
  color?: string | null;
}

export interface ColumnReorderItem {
  id: string;
  position: number;
}

// ============================================================
// Column CRUD
// ============================================================

/**
 * Find a column by its ID.
 */
export async function findById(
  db: PostgresJsDatabase,
  id: string,
): Promise<ColumnRecord | undefined> {
  const [col] = await db.select().from(columns).where(eq(columns.id, id)).limit(1);
  return col;
}

/**
 * Find all columns in a board, ordered by position (ascending).
 */
export async function findByBoardId(
  db: PostgresJsDatabase,
  boardId: string,
): Promise<ColumnRecord[]> {
  return db
    .select()
    .from(columns)
    .where(eq(columns.boardId, boardId))
    .orderBy(asc(columns.position));
}

/**
 * Create a new column in a board.
 */
export async function create(
  db: PostgresJsDatabase,
  data: CreateColumnData,
): Promise<ColumnRecord> {
  const [col] = await db
    .insert(columns)
    .values({
      name: data.name,
      boardId: data.boardId,
      position: data.position,
      color: data.color ?? null,
    })
    .returning();

  return col;
}

/**
 * Update a column by ID. Only updates explicitly provided (non-undefined) fields.
 */
export async function updateById(
  db: PostgresJsDatabase,
  id: string,
  data: UpdateColumnData,
): Promise<ColumnRecord | undefined> {
  const cleaned: Record<string, unknown> = {};
  if (data.name !== undefined) cleaned.name = data.name;
  if (data.position !== undefined) cleaned.position = data.position;
  if (data.color !== undefined) cleaned.color = data.color;

  if (Object.keys(cleaned).length === 0) {
    return findById(db, id);
  }

  const [updated] = await db.update(columns).set(cleaned).where(eq(columns.id, id)).returning();
  return updated;
}

/**
 * Delete a column by ID. Cascades to tasks (tasks in this column are deleted).
 *
 * WARNING: Consider reassigning tasks to another column before deleting,
 * as this will cascade-delete all tasks in the column.
 */
export async function deleteById(db: PostgresJsDatabase, id: string): Promise<boolean> {
  const [deleted] = await db
    .delete(columns)
    .where(eq(columns.id, id))
    .returning({ id: columns.id });

  return !!deleted;
}

/**
 * Reorder columns within a board. Updates the position of each column
 * in a single transaction.
 */
export async function reorder(db: PostgresJsDatabase, items: ColumnReorderItem[]): Promise<void> {
  if (items.length === 0) return;

  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx.update(columns).set({ position: item.position }).where(eq(columns.id, item.id));
    }
  });
}

/**
 * Create a standard set of columns for a new board (To Do, In Progress, Done).
 * Returns the IDs of the created columns.
 */
export async function createDefaults(
  db: PostgresJsDatabase,
  boardId: string,
): Promise<ColumnRecord[]> {
  const defaultColumns = [
    { name: 'To Do', position: 0 },
    { name: 'In Progress', position: 1 },
    { name: 'Done', position: 2 },
  ];

  const created = await db
    .insert(columns)
    .values(
      defaultColumns.map((col) => ({
        name: col.name,
        boardId,
        position: col.position,
      })),
    )
    .returning();

  return created;
}
