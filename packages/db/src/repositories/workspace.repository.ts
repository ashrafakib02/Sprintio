import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { workspaces, workspaceMembers } from '../schema/index.js';

// ============================================================
// Types
// ============================================================

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  organizationId: string | null;
  plan: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMemberRecord {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  createdAt: Date;
}

export interface CreateWorkspaceData {
  name: string;
  slug: string;
  description?: string | null;
  logo?: string | null;
  organizationId?: string | null;
  plan?: string;
  createdById: string;
}

export interface UpdateWorkspaceData {
  name?: string;
  description?: string | null;
  logo?: string | null;
  organizationId?: string | null;
  plan?: string;
}

// ============================================================
// Workspace CRUD
// ============================================================

/**
 * Find a workspace by its ID.
 */
export async function findById(
  db: PostgresJsDatabase,
  id: string,
): Promise<WorkspaceRecord | undefined> {
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);

  return workspace;
}

/**
 * Find a workspace by its slug.
 */
export async function findBySlug(
  db: PostgresJsDatabase,
  slug: string,
): Promise<WorkspaceRecord | undefined> {
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);

  return workspace;
}

/**
 * Find all workspaces belonging to an organization.
 */
export async function findByOrganizationId(
  db: PostgresJsDatabase,
  organizationId: string,
): Promise<WorkspaceRecord[]> {
  return db.select().from(workspaces).where(eq(workspaces.organizationId, organizationId));
}

/**
 * Find all workspaces a user belongs to.
 */
export async function findByUserId(
  db: PostgresJsDatabase,
  userId: string,
): Promise<WorkspaceRecord[]> {
  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      description: workspaces.description,
      logo: workspaces.logo,
      organizationId: workspaces.organizationId,
      plan: workspaces.plan,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
    })
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId));
}

/**
 * Create a new workspace. The creator is added as owner.
 */
export async function create(
  db: PostgresJsDatabase,
  data: CreateWorkspaceData,
): Promise<WorkspaceRecord> {
  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        logo: data.logo ?? null,
        organizationId: data.organizationId ?? null,
        plan: data.plan ?? 'free',
      })
      .returning();

    // Add the creator as owner
    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: data.createdById,
      role: 'owner',
    });

    return workspace;
  });
}

/**
 * Update a workspace by ID. Returns the updated record.
 */
export async function updateById(
  db: PostgresJsDatabase,
  id: string,
  data: UpdateWorkspaceData,
): Promise<WorkspaceRecord | undefined> {
  const [updated] = await db.update(workspaces).set(data).where(eq(workspaces.id, id)).returning();

  return updated;
}

/**
 * Delete a workspace by ID.
 * Cascading deletes will remove members.
 */
export async function deleteById(db: PostgresJsDatabase, id: string): Promise<boolean> {
  const [deleted] = await db
    .delete(workspaces)
    .where(eq(workspaces.id, id))
    .returning({ id: workspaces.id });

  return !!deleted;
}

// ============================================================
// Workspace Members
// ============================================================

/**
 * Add a member to a workspace.
 */
export async function addMember(
  db: PostgresJsDatabase,
  workspaceId: string,
  userId: string,
  role: string = 'member',
): Promise<WorkspaceMemberRecord> {
  const [member] = await db
    .insert(workspaceMembers)
    .values({ workspaceId, userId, role })
    .returning();

  return member;
}

/**
 * Remove a member from a workspace.
 */
export async function removeMember(
  db: PostgresJsDatabase,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const [deleted] = await db
    .delete(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .returning({ id: workspaceMembers.id });

  return !!deleted;
}

/**
 * Get all members of a workspace.
 */
export async function getMembers(
  db: PostgresJsDatabase,
  workspaceId: string,
): Promise<WorkspaceMemberRecord[]> {
  return db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId));
}

/**
 * Check if a user is a member of a workspace.
 */
export async function isMember(
  db: PostgresJsDatabase,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const [member] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);

  return !!member;
}

/**
 * Get a user's role in a workspace.
 */
export async function getMemberRole(
  db: PostgresJsDatabase,
  workspaceId: string,
  userId: string,
): Promise<string | undefined> {
  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);

  return member?.role;
}
