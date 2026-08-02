import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { boards, workspaceMembers } from '../schema/index.js';

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
 * Find all boards belonging to a workspace.
 */
export async function findByWorkspaceId(
  db: PostgresJsDatabase,
  workspaceId: string,
): Promise<BoardRecord[]> {
  return db.select().from(boards).where(eq(boards.workspaceId, workspaceId));
}

/**
 * Find all boards belonging to a project.
 */
export async function findByProjectId(
  db: PostgresJsDatabase,
  projectId: string,
): Promise<BoardRecord[]> {
  return db.select().from(boards).where(eq(boards.projectId, projectId));
}

/**
 * Create a new board.
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
 * Update a board by ID. Returns the updated record.
 */
export async function updateById(
  db: PostgresJsDatabase,
  id: string,
  data: UpdateBoardData,
): Promise<BoardRecord | undefined> {
  const [updated] = await db.update(boards).set(data).where(eq(boards.id, id)).returning();

  return updated;
}

/**
 * Delete a board by ID.
 * Cascading deletes will remove columns and tasks.
 */
export async function deleteById(db: PostgresJsDatabase, id: string): Promise<boolean> {
  const [deleted] = await db.delete(boards).where(eq(boards.id, id)).returning({ id: boards.id });

  return !!deleted;
}

/**
 * Check if a user is a member of the board's workspace.
 * Joins boards → workspaceMembers on workspaceId.
 */
export async function isMemberOfBoardWorkspace(
  db: PostgresJsDatabase,
  boardId: string,
  userId: string,
): Promise<boolean> {
  const [result] = await db
    .select({ id: workspaceMembers.id })
    .from(boards)
    .innerJoin(workspaceMembers, eq(boards.workspaceId, workspaceMembers.workspaceId))
    .where(and(eq(boards.id, boardId), eq(workspaceMembers.userId, userId)))
    .limit(1);

  return !!result;
}
