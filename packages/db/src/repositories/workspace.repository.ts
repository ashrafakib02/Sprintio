import { eq, and, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { workspaces, workspaceMembers, workspaceInvitations, users } from '../schema/index.js';

// ============================================================
// Types
// ============================================================

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  brandColor: string | null;
  customDomain: string | null;
  organizationId: string;
  plan: string;
  archivedAt: Date | null;
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

export interface WorkspaceInvitationRecord {
  id: string;
  workspaceId: string;
  email: string;
  role: string;
  token: string;
  invitedById: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateWorkspaceData {
  name: string;
  slug: string;
  description?: string | null;
  logo?: string | null;
  organizationId: string;
  plan?: string;
  createdById: string;
}

export interface UpdateWorkspaceData {
  name?: string;
  description?: string | null;
  logo?: string | null;
  brandColor?: string | null;
  customDomain?: string | null;
  organizationId?: string;
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
      brandColor: workspaces.brandColor,
      customDomain: workspaces.customDomain,
      organizationId: workspaces.organizationId,
      plan: workspaces.plan,
      archivedAt: workspaces.archivedAt,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
    })
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId));
}

/**
 * Find workspaces a user belongs to, optionally filtered by archive status.
 */
export async function findByUserIdFiltered(
  db: PostgresJsDatabase,
  userId: string,
  includeArchived: boolean,
): Promise<WorkspaceRecord[]> {
  const baseQuery = db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      description: workspaces.description,
      logo: workspaces.logo,
      brandColor: workspaces.brandColor,
      customDomain: workspaces.customDomain,
      organizationId: workspaces.organizationId,
      plan: workspaces.plan,
      archivedAt: workspaces.archivedAt,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
    })
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId));

  if (includeArchived) {
    return baseQuery;
  }

  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      description: workspaces.description,
      logo: workspaces.logo,
      brandColor: workspaces.brandColor,
      customDomain: workspaces.customDomain,
      organizationId: workspaces.organizationId,
      plan: workspaces.plan,
      archivedAt: workspaces.archivedAt,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
    })
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.userId, userId), isNull(workspaces.archivedAt)));
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
        organizationId: data.organizationId,
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

/**
 * Archive a workspace (soft-delete). Sets archivedAt to the current time.
 */
export async function archiveById(
  db: PostgresJsDatabase,
  id: string,
): Promise<WorkspaceRecord | undefined> {
  const [archived] = await db
    .update(workspaces)
    .set({ archivedAt: new Date() })
    .where(eq(workspaces.id, id))
    .returning();

  return archived;
}

/**
 * Restore an archived workspace. Clears archivedAt.
 */
export async function restoreById(
  db: PostgresJsDatabase,
  id: string,
): Promise<WorkspaceRecord | undefined> {
  const [restored] = await db
    .update(workspaces)
    .set({ archivedAt: null })
    .where(eq(workspaces.id, id))
    .returning();

  return restored;
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

export interface WorkspaceMemberWithUserRecord {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

/**
 * Get all members of a workspace with their user data (name, email, avatar).
 */
export async function getMembersWithUsers(
  db: PostgresJsDatabase,
  workspaceId: string,
): Promise<WorkspaceMemberWithUserRecord[]> {
  const rows = await db
    .select({
      id: workspaceMembers.id,
      workspaceId: workspaceMembers.workspaceId,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      createdAt: workspaceMembers.createdAt,
      userName: users.name,
      userEmail: users.email,
      userAvatarUrl: users.avatarUrl,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  return rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    role: row.role,
    createdAt: row.createdAt,
    user: {
      id: row.userId,
      name: row.userName,
      email: row.userEmail,
      avatarUrl: row.userAvatarUrl,
    },
  }));
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

// ============================================================
// Workspace Invitations
// ============================================================

/**
 * Create a workspace invitation.
 */
export async function createInvitation(
  db: PostgresJsDatabase,
  data: {
    workspaceId: string;
    email: string;
    role: string;
    token: string;
    invitedById: string;
    expiresAt: Date;
  },
): Promise<WorkspaceInvitationRecord> {
  const [invitation] = await db
    .insert(workspaceInvitations)
    .values({
      workspaceId: data.workspaceId,
      email: data.email,
      role: data.role,
      token: data.token,
      invitedById: data.invitedById,
      expiresAt: data.expiresAt,
    })
    .returning();

  return invitation;
}

/**
 * Find a workspace invitation by token.
 */
export async function findInvitationByToken(
  db: PostgresJsDatabase,
  token: string,
): Promise<WorkspaceInvitationRecord | undefined> {
  const [invitation] = await db
    .select()
    .from(workspaceInvitations)
    .where(eq(workspaceInvitations.token, token))
    .limit(1);

  return invitation;
}

/**
 * Find pending invitations for a workspace by email.
 */
export async function findInvitationByEmail(
  db: PostgresJsDatabase,
  workspaceId: string,
  email: string,
): Promise<WorkspaceInvitationRecord | undefined> {
  const [invitation] = await db
    .select()
    .from(workspaceInvitations)
    .where(
      and(
        eq(workspaceInvitations.workspaceId, workspaceId),
        eq(workspaceInvitations.email, email),
        eq(workspaceInvitations.status, 'pending'),
      ),
    )
    .limit(1);

  return invitation;
}

/**
 * Get all invitations for a workspace.
 */
export async function getInvitations(
  db: PostgresJsDatabase,
  workspaceId: string,
): Promise<WorkspaceInvitationRecord[]> {
  return db
    .select()
    .from(workspaceInvitations)
    .where(
      and(
        eq(workspaceInvitations.workspaceId, workspaceId),
        eq(workspaceInvitations.status, 'pending'),
      ),
    );
}

/**
 * Update invitation status.
 */
export async function updateInvitationStatus(
  db: PostgresJsDatabase,
  token: string,
  status: string,
): Promise<WorkspaceInvitationRecord | undefined> {
  const [updated] = await db
    .update(workspaceInvitations)
    .set({ status })
    .where(eq(workspaceInvitations.token, token))
    .returning();

  return updated;
}

/**
 * Delete a workspace invitation.
 */
export async function deleteInvitation(
  db: PostgresJsDatabase,
  workspaceId: string,
  email: string,
): Promise<boolean> {
  const [deleted] = await db
    .delete(workspaceInvitations)
    .where(
      and(eq(workspaceInvitations.workspaceId, workspaceId), eq(workspaceInvitations.email, email)),
    )
    .returning({ id: workspaceInvitations.id });

  return !!deleted;
}

/**
 * Update a member's role in a workspace.
 */
export async function updateMemberRole(
  db: PostgresJsDatabase,
  workspaceId: string,
  userId: string,
  role: string,
): Promise<WorkspaceMemberRecord | undefined> {
  const [updated] = await db
    .update(workspaceMembers)
    .set({ role })
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .returning();

  return updated;
}
