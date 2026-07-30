import { eq, and, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { organizations, organizationMembers } from '../schema/index.js';

// ============================================================
// Types
// ============================================================

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface OrganizationMemberRecord {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: Date;
}

export interface CreateOrganizationData {
  name: string;
  slug: string;
  description?: string | null;
  website?: string | null;
  createdById: string;
}

export interface UpdateOrganizationData {
  name?: string;
  description?: string | null;
  website?: string | null;
}

// ============================================================
// Organization CRUD
// ============================================================

/**
 * Find an organization by its ID.
 */
export async function findById(
  db: PostgresJsDatabase,
  id: string,
): Promise<OrganizationRecord | undefined> {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);

  return org;
}

/**
 * Find an organization by its slug.
 */
export async function findBySlug(
  db: PostgresJsDatabase,
  slug: string,
): Promise<OrganizationRecord | undefined> {
  const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);

  return org;
}

/**
 * Find all organizations a user belongs to.
 */
export async function findByUserId(
  db: PostgresJsDatabase,
  userId: string,
): Promise<OrganizationRecord[]> {
  const results = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      description: organizations.description,
      logo: organizations.logo,
      website: organizations.website,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
      archivedAt: organizations.archivedAt,
    })
    .from(organizations)
    .innerJoin(organizationMembers, eq(organizations.id, organizationMembers.organizationId))
    .where(eq(organizationMembers.userId, userId));

  return results;
}

/**
 * Find organizations a user belongs to, with optional archive filter.
 */
export async function findByUserIdFiltered(
  db: PostgresJsDatabase,
  userId: string,
  includeArchived: boolean = false,
): Promise<OrganizationRecord[]> {
  const conditions = [eq(organizationMembers.userId, userId)];
  if (!includeArchived) {
    conditions.push(isNull(organizations.archivedAt));
  }

  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      description: organizations.description,
      logo: organizations.logo,
      website: organizations.website,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
      archivedAt: organizations.archivedAt,
    })
    .from(organizations)
    .innerJoin(organizationMembers, eq(organizations.id, organizationMembers.organizationId))
    .where(and(...conditions));
}

/**
 * Create a new organization. The creator is added as owner.
 */
export async function create(
  db: PostgresJsDatabase,
  data: CreateOrganizationData,
): Promise<OrganizationRecord> {
  return db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        website: data.website ?? null,
      })
      .returning();

    // Add the creator as owner
    await tx.insert(organizationMembers).values({
      organizationId: org.id,
      userId: data.createdById,
      role: 'owner',
    });

    return org;
  });
}

/**
 * Update an organization by ID. Returns the updated record.
 * Only updates fields that are explicitly provided (non-undefined).
 */
export async function updateById(
  db: PostgresJsDatabase,
  id: string,
  data: UpdateOrganizationData,
): Promise<OrganizationRecord | undefined> {
  // Filter out undefined values so Drizzle .set() doesn't overwrite
  // existing columns with NULL. Only explicitly-provided fields are updated.
  const cleaned: Record<string, unknown> = {};
  if (data.name !== undefined) cleaned.name = data.name;
  if (data.description !== undefined) cleaned.description = data.description;
  if (data.website !== undefined) cleaned.website = data.website;

  // Nothing to update — return current record as-is
  if (Object.keys(cleaned).length === 0) {
    return findById(db, id);
  }

  const [updated] = await db
    .update(organizations)
    .set(cleaned)
    .where(eq(organizations.id, id))
    .returning();

  return updated;
}

/**
 * Archive an organization by setting archivedAt timestamp.
 * Returns the archived record, or undefined if not found.
 */
export async function archiveById(
  db: PostgresJsDatabase,
  id: string,
): Promise<OrganizationRecord | undefined> {
  const [archived] = await db
    .update(organizations)
    .set({ archivedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning();

  return archived;
}

/**
 * Restore an archived organization by clearing archivedAt.
 * Returns the restored record, or undefined if not found.
 */
export async function restoreById(
  db: PostgresJsDatabase,
  id: string,
): Promise<OrganizationRecord | undefined> {
  const [restored] = await db
    .update(organizations)
    .set({ archivedAt: null })
    .where(eq(organizations.id, id))
    .returning();

  return restored;
}

/**
 * Delete an organization by ID.
 * Cascading deletes will remove members and workspaces.
 */
export async function deleteById(db: PostgresJsDatabase, id: string): Promise<boolean> {
  const [deleted] = await db
    .delete(organizations)
    .where(eq(organizations.id, id))
    .returning({ id: organizations.id });

  return !!deleted;
}

// ============================================================
// Organization Members
// ============================================================

/**
 * Add a member to an organization.
 *
 * If the user is already a member (unique-index violation on
 * organization_id + user_id), the existing row is returned instead of
 * throwing — callers that need to distinguish should check `isMember`
 * first.
 */
export async function addMember(
  db: PostgresJsDatabase,
  organizationId: string,
  userId: string,
  role: string = 'member',
): Promise<OrganizationMemberRecord> {
  try {
    const [member] = await db
      .insert(organizationMembers)
      .values({ organizationId, userId, role })
      .returning();

    return member;
  } catch (err: unknown) {
    // PostgreSQL unique_violation (23505) — user is already a member.
    // Fetch and return the existing row so the caller isn't forced to
    // handle an uncaught exception.
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
      const existing = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.userId, userId),
          ),
        )
        .limit(1);

      if (existing[0]) {
        return existing[0];
      }
    }
    throw err;
  }
}

/**
 * Remove a member from an organization.
 */
export async function removeMember(
  db: PostgresJsDatabase,
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const [deleted] = await db
    .delete(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
      ),
    )
    .returning({ id: organizationMembers.id });

  return !!deleted;
}

/**
 * Get all members of an organization.
 */
export async function getMembers(
  db: PostgresJsDatabase,
  organizationId: string,
): Promise<OrganizationMemberRecord[]> {
  return db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, organizationId));
}

/**
 * Check if a user is a member of an organization.
 */
export async function isMember(
  db: PostgresJsDatabase,
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const [member] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
      ),
    )
    .limit(1);

  return !!member;
}

/**
 * Get a user's role in an organization.
 */
export async function getMemberRole(
  db: PostgresJsDatabase,
  organizationId: string,
  userId: string,
): Promise<string | undefined> {
  const [member] = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
      ),
    )
    .limit(1);

  return member?.role;
}
