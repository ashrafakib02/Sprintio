import { eq, count } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { projects } from '../schema/index.js';

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
 * Find all projects belonging to a workspace.
 */
export async function findByWorkspaceId(
  db: PostgresJsDatabase,
  workspaceId: string,
): Promise<ProjectRecord[]> {
  return db.select().from(projects).where(eq(projects.workspaceId, workspaceId));
}

/**
 * Create a new project.
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
 * Update a project by ID. Returns the updated record.
 */
export async function updateById(
  db: PostgresJsDatabase,
  id: string,
  data: UpdateProjectData,
): Promise<ProjectRecord | undefined> {
  const [updated] = await db.update(projects).set(data).where(eq(projects.id, id)).returning();

  return updated;
}

/**
 * Delete a project by ID.
 */
export async function deleteById(db: PostgresJsDatabase, id: string): Promise<boolean> {
  const [deleted] = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning({ id: projects.id });

  return !!deleted;
}

/**
 * Archive a project by setting its status to 'archived'.
 */
export async function archiveById(
  db: PostgresJsDatabase,
  id: string,
): Promise<ProjectRecord | undefined> {
  const [archived] = await db
    .update(projects)
    .set({ status: 'archived' })
    .where(eq(projects.id, id))
    .returning();

  return archived;
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

  return result?.value ?? 0;
}
