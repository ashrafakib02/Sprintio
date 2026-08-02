import { eq, and, count, asc, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sprints } from '../schema/index.js';

// ============================================================
// Types
// ============================================================

export interface SprintRecord {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
  createdAt: Date;
}

export interface CreateSprintData {
  name: string;
  goal?: string | null;
  projectId: string;
  startDate: Date;
  endDate: Date;
  status?: string;
}

export interface UpdateSprintData {
  name?: string;
  goal?: string | null;
  startDate?: Date;
  endDate?: Date;
  status?: string;
}

// ============================================================
// Sprint CRUD
// ============================================================

/**
 * Find a sprint by its ID.
 */
export async function findById(
  db: PostgresJsDatabase,
  id: string,
): Promise<SprintRecord | undefined> {
  const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id)).limit(1);
  return sprint;
}

/**
 * Find all sprints in a project, ordered by start date (earliest first).
 */
export async function findByProjectId(
  db: PostgresJsDatabase,
  projectId: string,
): Promise<SprintRecord[]> {
  return db
    .select()
    .from(sprints)
    .where(eq(sprints.projectId, projectId))
    .orderBy(asc(sprints.startDate));
}

/**
 * Find sprints in a project filtered by status.
 */
export async function findByProjectIdAndStatus(
  db: PostgresJsDatabase,
  projectId: string,
  status: string,
): Promise<SprintRecord[]> {
  return db
    .select()
    .from(sprints)
    .where(and(eq(sprints.projectId, projectId), eq(sprints.status, status)))
    .orderBy(asc(sprints.startDate));
}

/**
 * Find the most recent sprint in a project (by start date).
 */
export async function findLatestByProjectId(
  db: PostgresJsDatabase,
  projectId: string,
): Promise<SprintRecord | undefined> {
  const [sprint] = await db
    .select()
    .from(sprints)
    .where(eq(sprints.projectId, projectId))
    .orderBy(desc(sprints.startDate))
    .limit(1);

  return sprint;
}

/**
 * Find the active sprint in a project (status = 'active').
 * Returns undefined if no sprint is currently active.
 */
export async function findActiveByProjectId(
  db: PostgresJsDatabase,
  projectId: string,
): Promise<SprintRecord | undefined> {
  const [sprint] = await db
    .select()
    .from(sprints)
    .where(and(eq(sprints.projectId, projectId), eq(sprints.status, 'active')))
    .limit(1);

  return sprint;
}

/**
 * Create a new sprint in a project.
 */
export async function create(
  db: PostgresJsDatabase,
  data: CreateSprintData,
): Promise<SprintRecord> {
  const [sprint] = await db
    .insert(sprints)
    .values({
      name: data.name,
      goal: data.goal ?? null,
      projectId: data.projectId,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status ?? 'planned',
    })
    .returning();

  return sprint;
}

/**
 * Update a sprint by ID. Only updates explicitly provided (non-undefined) fields.
 */
export async function updateById(
  db: PostgresJsDatabase,
  id: string,
  data: UpdateSprintData,
): Promise<SprintRecord | undefined> {
  const cleaned: Record<string, unknown> = {};
  if (data.name !== undefined) cleaned.name = data.name;
  if (data.goal !== undefined) cleaned.goal = data.goal;
  if (data.startDate !== undefined) cleaned.startDate = data.startDate;
  if (data.endDate !== undefined) cleaned.endDate = data.endDate;
  if (data.status !== undefined) cleaned.status = data.status;

  if (Object.keys(cleaned).length === 0) {
    return findById(db, id);
  }

  const [updated] = await db.update(sprints).set(cleaned).where(eq(sprints.id, id)).returning();
  return updated;
}

/**
 * Delete a sprint by ID. Tasks in the sprint have their sprintId set to NULL
 * via the SET NULL cascade rule.
 */
export async function deleteById(db: PostgresJsDatabase, id: string): Promise<boolean> {
  const [deleted] = await db.delete(sprints).where(eq(sprints.id, id)).returning({ id: sprints.id });
  return !!deleted;
}

/**
 * Count sprints in a project.
 */
export async function countByProjectId(
  db: PostgresJsDatabase,
  projectId: string,
): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(sprints)
    .where(eq(sprints.projectId, projectId));

  return Number(result?.value ?? 0);
}
