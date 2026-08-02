import { eq, and, count, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { projects, sprints, tasks } from '../schema/index.js';

// ============================================================
// Types
// ============================================================

export interface ProjectRecord {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectData {
  name: string;
  description?: string | null;
  workspaceId: string;
  status?: string;
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface UpdateProjectData {
  name?: string;
  description?: string | null;
  status?: string;
  startDate?: Date | null;
  endDate?: Date | null;
}

// ============================================================
// Project CRUD
// ============================================================

/**
 * Find a project by its ID.
 */
export async function findById(
  db: PostgresJsDatabase,
  id: string,
): Promise<ProjectRecord | undefined> {
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return project;
}

/**
 * Find all projects in a workspace, ordered by creation date (newest first).
 */
export async function findByWorkspaceId(
  db: PostgresJsDatabase,
  workspaceId: string,
): Promise<ProjectRecord[]> {
  return db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(desc(projects.createdAt));
}

/**
 * Find projects in a workspace with pagination.
 */
export async function findByWorkspaceIdWithPagination(
  db: PostgresJsDatabase,
  workspaceId: string,
  page: number,
  limit: number,
): Promise<{ projects: ProjectRecord[]; total: number }> {
  const offset = (page - 1) * limit;

  const [projectRows, countRows] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(projects).where(eq(projects.workspaceId, workspaceId)),
  ]);

  return {
    projects: projectRows,
    total: Number(countRows[0]?.value ?? 0),
  };
}

/**
 * Find active projects in a workspace.
 */
export async function findActiveByWorkspaceId(
  db: PostgresJsDatabase,
  workspaceId: string,
): Promise<ProjectRecord[]> {
  return db
    .select()
    .from(projects)
    .where(and(eq(projects.workspaceId, workspaceId), eq(projects.status, 'active')))
    .orderBy(desc(projects.createdAt));
}

/**
 * Find projects in a workspace filtered by status.
 */
export async function findByWorkspaceIdAndStatus(
  db: PostgresJsDatabase,
  workspaceId: string,
  status: string,
): Promise<ProjectRecord[]> {
  return db
    .select()
    .from(projects)
    .where(and(eq(projects.workspaceId, workspaceId), eq(projects.status, status)))
    .orderBy(desc(projects.createdAt));
}

/**
 * Create a new project in a workspace.
 */
export async function create(
  db: PostgresJsDatabase,
  data: CreateProjectData,
): Promise<ProjectRecord> {
  const [project] = await db
    .insert(projects)
    .values({
      name: data.name,
      description: data.description ?? null,
      workspaceId: data.workspaceId,
      status: data.status ?? 'active',
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
    })
    .returning();

  return project;
}

/**
 * Update a project by ID. Only updates explicitly provided (non-undefined) fields.
 */
export async function updateById(
  db: PostgresJsDatabase,
  id: string,
  data: UpdateProjectData,
): Promise<ProjectRecord | undefined> {
  const cleaned: Record<string, unknown> = {};
  if (data.name !== undefined) cleaned.name = data.name;
  if (data.description !== undefined) cleaned.description = data.description;
  if (data.status !== undefined) cleaned.status = data.status;
  if (data.startDate !== undefined) cleaned.startDate = data.startDate;
  if (data.endDate !== undefined) cleaned.endDate = data.endDate;

  if (Object.keys(cleaned).length === 0) {
    return findById(db, id);
  }

  const [updated] = await db.update(projects).set(cleaned).where(eq(projects.id, id)).returning();
  return updated;
}

/**
 * Archive a project by setting status to 'archived'.
 */
export async function archiveById(
  db: PostgresJsDatabase,
  id: string,
): Promise<ProjectRecord | undefined> {
  const [archived] = await db
    .update(projects)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();

  return archived;
}

/**
 * Delete a project by ID. Cascades to sprints and tasks via FK constraints.
 */
export async function deleteById(db: PostgresJsDatabase, id: string): Promise<boolean> {
  const [deleted] = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning({ id: projects.id });

  return !!deleted;
}

/**
 * Count projects in a workspace.
 */
export async function countByWorkspaceId(
  db: PostgresJsDatabase,
  workspaceId: string,
): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId));

  return Number(result?.value ?? 0);
}

/**
 * Count projects per status in a workspace.
 * Returns an array of { status, count } objects.
 */
export async function countByStatusInWorkspace(
  db: PostgresJsDatabase,
  workspaceId: string,
): Promise<Array<{ status: string; count: number }>> {
  const results = await db
    .select({
      status: projects.status,
      value: count(),
    })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId))
    .groupBy(projects.status);

  return results.map((r) => ({ status: r.status, count: Number(r.value) }));
}

/**
 * Find a project by ID with its sprints and task count.
 * Useful for project detail views.
 */
export async function findByIdWithStats(
  db: PostgresJsDatabase,
  id: string,
): Promise<
  | (ProjectRecord & {
      sprintCount: number;
      taskCount: number;
    })
  | undefined
> {
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);

  if (!project) return undefined;

  const [[sprintCountRow], [taskCountRow]] = await Promise.all([
    db
      .select({ value: count() })
      .from(sprints)
      .where(eq(sprints.projectId, id)),
    db
      .select({ value: count() })
      .from(tasks)
      .where(eq(tasks.projectId, id)),
  ]);

  return {
    ...project,
    sprintCount: Number(sprintCountRow?.value ?? 0),
    taskCount: Number(taskCountRow?.value ?? 0),
  };
}
