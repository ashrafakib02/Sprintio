import { eq, and, count, desc, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  projects,
  projectStatusEnum,
  projectPriorityEnum,
  projectVisibilityEnum,
  sprints,
  tasks,
} from '../schema/index.js';

// ============================================================
// Types
// ============================================================

export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
export type ProjectPriority = (typeof projectPriorityEnum.enumValues)[number];
export type ProjectVisibility = (typeof projectVisibilityEnum.enumValues)[number];

export interface ProjectRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  workspaceId: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  visibility: ProjectVisibility;
  startDate: Date | null;
  endDate: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectData {
  name: string;
  slug: string;
  description?: string | null;
  workspaceId: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  visibility?: ProjectVisibility;
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface UpdateProjectData {
  name?: string;
  slug?: string;
  description?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  visibility?: ProjectVisibility;
  startDate?: Date | null;
  endDate?: Date | null;
}

// ============================================================
// Project CRUD
// ============================================================

/**
 * Find a project by its ID (excludes soft-deleted).
 */
export async function findById(
  db: PostgresJsDatabase,
  id: string,
): Promise<ProjectRecord | undefined> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1);
  return project;
}

/**
 * Find a project by its ID, including soft-deleted.
 */
export async function findByIdIncludingDeleted(
  db: PostgresJsDatabase,
  id: string,
): Promise<ProjectRecord | undefined> {
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return project;
}

/**
 * Find all projects in a workspace, ordered by creation date (newest first).
 * Excludes soft-deleted projects.
 */
export async function findByWorkspaceId(
  db: PostgresJsDatabase,
  workspaceId: string,
): Promise<ProjectRecord[]> {
  return db
    .select()
    .from(projects)
    .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)))
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
  const baseWhere = and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt));

  const [projectRows, countRows] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(baseWhere)
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(projects).where(baseWhere),
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
    .where(
      and(
        eq(projects.workspaceId, workspaceId),
        eq(projects.status, 'active'),
        isNull(projects.deletedAt),
      ),
    )
    .orderBy(desc(projects.createdAt));
}

/**
 * Find projects in a workspace filtered by status.
 */
export async function findByWorkspaceIdAndStatus(
  db: PostgresJsDatabase,
  workspaceId: string,
  status: ProjectStatus,
): Promise<ProjectRecord[]> {
  return db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, workspaceId),
        eq(projects.status, status),
        isNull(projects.deletedAt),
      ),
    )
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
      slug: data.slug,
      description: data.description ?? null,
      workspaceId: data.workspaceId,
      status: data.status ?? 'active',
      priority: data.priority ?? 'none',
      visibility: data.visibility ?? 'workspace',
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
  if (data.slug !== undefined) cleaned.slug = data.slug;
  if (data.description !== undefined) cleaned.description = data.description;
  if (data.status !== undefined) cleaned.status = data.status;
  if (data.priority !== undefined) cleaned.priority = data.priority;
  if (data.visibility !== undefined) cleaned.visibility = data.visibility;
  if (data.startDate !== undefined) cleaned.startDate = data.startDate;
  if (data.endDate !== undefined) cleaned.endDate = data.endDate;

  if (Object.keys(cleaned).length === 0) {
    return findById(db, id);
  }

  const [updated] = await db.update(projects).set(cleaned).where(eq(projects.id, id)).returning();
  return updated;
}

/**
 * Soft-delete a project by setting deleted_at.
 */
export async function softDeleteById(
  db: PostgresJsDatabase,
  id: string,
): Promise<ProjectRecord | undefined> {
  const [deleted] = await db
    .update(projects)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();

  return deleted;
}

/**
 * Restore a soft-deleted project by clearing deleted_at.
 */
export async function restoreById(
  db: PostgresJsDatabase,
  id: string,
): Promise<ProjectRecord | undefined> {
  const [restored] = await db
    .update(projects)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();

  return restored;
}

/**
 * Hard-delete a project by ID. Cascades to sprints and tasks via FK constraints.
 */
export async function deleteById(db: PostgresJsDatabase, id: string): Promise<boolean> {
  const [deleted] = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning({ id: projects.id });

  return !!deleted;
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
 * Count non-deleted projects in a workspace.
 */
export async function countByWorkspaceId(
  db: PostgresJsDatabase,
  workspaceId: string,
): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(projects)
    .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)));

  return Number(result?.value ?? 0);
}

/**
 * Count non-deleted projects per status in a workspace.
 * Returns an array of { status, count } objects.
 */
export async function countByStatusInWorkspace(
  db: PostgresJsDatabase,
  workspaceId: string,
): Promise<Array<{ status: ProjectStatus; count: number }>> {
  const results = await db
    .select({
      status: projects.status,
      value: count(),
    })
    .from(projects)
    .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)))
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
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) return undefined;

  const [[sprintCountRow], [taskCountRow]] = await Promise.all([
    db.select({ value: count() }).from(sprints).where(eq(sprints.projectId, id)),
    db.select({ value: count() }).from(tasks).where(eq(tasks.projectId, id)),
  ]);

  return {
    ...project,
    sprintCount: Number(sprintCountRow?.value ?? 0),
    taskCount: Number(taskCountRow?.value ?? 0),
  };
}
