import { eq, and, isNull, count, asc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { boards } from '../schema/index.js';

// ============================================================
// Types
// ============================================================

export interface BoardRecord {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBoardData {
  name: string;
  description?: string | null;
  workspaceId: string;
  projectId?: string | null;
}

export interface UpdateBoardData {
  name?: string;
  description?: string | null;
  projectId?: string | null;
}

// ============================================================
// Board CRUD
// ============================================================

/**
 * Find a board by its ID.
 */
export async function findById(
  db: PostgresJsDatabase,
  id: string,
): Promise<BoardRecord | undefined> {
  const [board] = await db.select().from(boards).where(eq(boards.id, id)).limit(1);
  return board;
}

/**
 * Find all boards in a workspace, ordered by creation date (oldest first).
 */
export async function findByWorkspaceId(
  db: PostgresJsDatabase,
  workspaceId: string,
): Promise<BoardRecord[]> {
  return db
    .select()
    .from(boards)
    .where(eq(boards.workspaceId, workspaceId))
    .orderBy(asc(boards.createdAt));
}

/**
 * Find all boards scoped to a specific project within a workspace.
 */
export async function findByProjectId(
  db: PostgresJsDatabase,
  projectId: string,
): Promise<BoardRecord[]> {
  return db
    .select()
    .from(boards)
    .where(eq(boards.projectId, projectId))
    .orderBy(asc(boards.createdAt));
}

/**
 * Find workspace-level boards (not scoped to any project).
 */
export async function findWorkspaceLevelByWorkspaceId(
  db: PostgresJsDatabase,
  workspaceId: string,
): Promise<BoardRecord[]> {
  return db
    .select()
    .from(boards)
    .where(and(eq(boards.workspaceId, workspaceId), isNull(boards.projectId)))
    .orderBy(asc(boards.createdAt));
}

/**
 * Create a new board in a workspace. Optionally scope it to a project.
 */
export async function create(db: PostgresJsDatabase, data: CreateBoardData): Promise<BoardRecord> {
  const [board] = await db
    .insert(boards)
    .values({
      name: data.name,
      description: data.description ?? null,
      workspaceId: data.workspaceId,
      projectId: data.projectId ?? null,
    })
    .returning();

  return board;
}

/**
 * Update a board by ID. Only updates explicitly provided (non-undefined) fields.
 */
export async function updateById(
  db: PostgresJsDatabase,
  id: string,
  data: UpdateBoardData,
): Promise<BoardRecord | undefined> {
  const cleaned: Record<string, unknown> = {};
  if (data.name !== undefined) cleaned.name = data.name;
  if (data.description !== undefined) cleaned.description = data.description;
  if (data.projectId !== undefined) cleaned.projectId = data.projectId;

  if (Object.keys(cleaned).length === 0) {
    return findById(db, id);
  }

  const [updated] = await db.update(boards).set(cleaned).where(eq(boards.id, id)).returning();
  return updated;
}

/**
 * Delete a board by ID. Cascades to columns. Tasks have their boardId
 * set to NULL via the SET NULL cascade rule.
 */
export async function deleteById(db: PostgresJsDatabase, id: string): Promise<boolean> {
  const [deleted] = await db.delete(boards).where(eq(boards.id, id)).returning({ id: boards.id });
  return !!deleted;
}

/**
 * Count boards in a workspace.
 */
export async function countByWorkspaceId(
  db: PostgresJsDatabase,
  workspaceId: string,
): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(boards)
    .where(eq(boards.workspaceId, workspaceId));

  return Number(result?.value ?? 0);
}
