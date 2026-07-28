import { repoDb } from '../../config/db-for-repos.js';
import { organizationRepo } from '@sprintio/db/repositories';
import { slugify, AppError, PERMISSIONS } from '@sprintio/shared';
import type { CreateOrganizationInput, UpdateOrganizationInput } from '@sprintio/shared';

// ============================================================
// Types
// ============================================================

export interface OrganizationResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMemberResult {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: string;
}

// ============================================================
// Helpers
// ============================================================

function toOrganizationResult(org: organizationRepo.OrganizationRecord): OrganizationResult {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    description: org.description,
    logo: org.logo,
    website: org.website,
    archivedAt: org.archivedAt ? org.archivedAt.toISOString() : null,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}

function toMemberResult(
  member: organizationRepo.OrganizationMemberRecord,
): OrganizationMemberResult {
  return {
    id: member.id,
    organizationId: member.organizationId,
    userId: member.userId,
    role: member.role,
    createdAt: member.createdAt.toISOString(),
  };
}

/**
 * Checks if the requester has the required permission within an organization.
 * Owner always passes.
 */
function assertPermission(role: string | undefined, permission: string): void {
  if (!role) {
    throw AppError.forbidden('You are not a member of this organization');
  }

  if (role === 'owner') {
    return;
  }

  const ORG_ROLE_PERMISSIONS: Record<string, string[]> = {
    admin: [
      PERMISSIONS.ORGANIZATION.UPDATE,
      PERMISSIONS.ORGANIZATION.MANAGE_MEMBERS,
      PERMISSIONS.ORGANIZATION.SETTINGS,
    ],
    member: [],
    guest: [],
  };

  const permissions = ORG_ROLE_PERMISSIONS[role] ?? [];
  if (!permissions.includes(permission)) {
    throw AppError.forbidden('Insufficient organization permissions');
  }
}

// ============================================================
// Service Methods
// ============================================================

/**
 * Create a new organization. The creator is added as owner.
 */
export async function createOrganization(
  userId: string,
  data: CreateOrganizationInput,
): Promise<OrganizationResult> {
  const slug = slugify(data.name);

  // Check for slug uniqueness
  const existing = await organizationRepo.findBySlug(repoDb, slug);
  if (existing) {
    throw AppError.conflict('An organization with a similar name already exists');
  }

  const org = await organizationRepo.create(repoDb, {
    name: data.name,
    slug,
    description: data.description,
    website: data.website,
    createdById: userId,
  });

  return toOrganizationResult(org);
}

/**
 * Get an organization by ID.
 */
export async function getOrganization(orgId: string): Promise<OrganizationResult> {
  const org = await organizationRepo.findById(repoDb, orgId);
  if (!org) {
    throw AppError.notFound('Organization');
  }

  return toOrganizationResult(org);
}

/**
 * List all organizations a user belongs to.
 */
export async function getUserOrganizations(
  userId: string,
  includeArchived: boolean = false,
): Promise<OrganizationResult[]> {
  const orgs = await organizationRepo.findByUserIdFiltered(repoDb, userId, includeArchived);
  return orgs.map(toOrganizationResult);
}

/**
 * Update an organization by ID.
 * The requester must have UPDATE permission (owner or admin).
 */
export async function updateOrganization(
  orgId: string,
  data: UpdateOrganizationInput,
  requestedBy: string,
): Promise<OrganizationResult> {
  const org = await organizationRepo.findById(repoDb, orgId);
  if (!org) {
    throw AppError.notFound('Organization');
  }

  // Check authorization
  const role = await organizationRepo.getMemberRole(repoDb, orgId, requestedBy);
  assertPermission(role, PERMISSIONS.ORGANIZATION.UPDATE);

  // If name is changing, check slug uniqueness
  if (data.name && data.name !== org.name) {
    const newSlug = slugify(data.name);
    const existing = await organizationRepo.findBySlug(repoDb, newSlug);
    if (existing && existing.id !== orgId) {
      throw AppError.conflict('An organization with a similar name already exists');
    }
  }

  const updated = await organizationRepo.updateById(repoDb, orgId, {
    name: data.name,
    description: data.description,
    website: data.website,
  });

  if (!updated) {
    throw AppError.internal('Failed to update organization');
  }

  return toOrganizationResult(updated);
}

/**
 * Archive an organization (soft-delete).
 * The requester must have UPDATE permission.
 */
export async function archiveOrganization(
  orgId: string,
  requestedBy: string,
): Promise<OrganizationResult> {
  const org = await organizationRepo.findById(repoDb, orgId);
  if (!org) {
    throw AppError.notFound('Organization');
  }

  const role = await organizationRepo.getMemberRole(repoDb, orgId, requestedBy);
  assertPermission(role, PERMISSIONS.ORGANIZATION.UPDATE);

  if (org.archivedAt) {
    throw AppError.badRequest('Organization is already archived');
  }

  const archived = await organizationRepo.archiveById(repoDb, orgId);
  if (!archived) {
    throw AppError.internal('Failed to archive organization');
  }

  return toOrganizationResult(archived);
}

/**
 * Restore an archived organization.
 * The requester must have UPDATE permission.
 */
export async function restoreOrganization(
  orgId: string,
  requestedBy: string,
): Promise<OrganizationResult> {
  const org = await organizationRepo.findById(repoDb, orgId);
  if (!org) {
    throw AppError.notFound('Organization');
  }

  const role = await organizationRepo.getMemberRole(repoDb, orgId, requestedBy);
  assertPermission(role, PERMISSIONS.ORGANIZATION.UPDATE);

  if (!org.archivedAt) {
    throw AppError.badRequest('Organization is not archived');
  }

  const restored = await organizationRepo.restoreById(repoDb, orgId);
  if (!restored) {
    throw AppError.internal('Failed to restore organization');
  }

  return toOrganizationResult(restored);
}

/**
 * Permanently delete an organization.
 * The requester must have DELETE permission.
 */
export async function deleteOrganization(
  orgId: string,
  requestedBy: string,
): Promise<void> {
  const org = await organizationRepo.findById(repoDb, orgId);
  if (!org) {
    throw AppError.notFound('Organization');
  }

  const role = await organizationRepo.getMemberRole(repoDb, orgId, requestedBy);
  assertPermission(role, PERMISSIONS.ORGANIZATION.DELETE);

  const deleted = await organizationRepo.deleteById(repoDb, orgId);
  if (!deleted) {
    throw AppError.internal('Failed to delete organization');
  }
}

/**
 * Add a member to an organization.
 * The requester must have MANAGE_MEMBERS permission.
 */
export async function addOrganizationMember(
  orgId: string,
  userId: string,
  role: string,
  requestedBy: string,
): Promise<OrganizationMemberResult> {
  // Check the organization exists
  const org = await organizationRepo.findById(repoDb, orgId);
  if (!org) {
    throw AppError.notFound('Organization');
  }

  // Check requester's permission
  const requesterRole = await organizationRepo.getMemberRole(repoDb, orgId, requestedBy);
  assertPermission(requesterRole, PERMISSIONS.ORGANIZATION.MANAGE_MEMBERS);

  // Check if user is already a member
  const existingMember = await organizationRepo.isMember(repoDb, orgId, userId);
  if (existingMember) {
    throw AppError.conflict('User is already a member of this organization');
  }

  const member = await organizationRepo.addMember(repoDb, orgId, userId, role);

  return toMemberResult(member);
}

/**
 * Remove a member from an organization.
 * The requester must have MANAGE_MEMBERS permission.
 */
export async function removeOrganizationMember(
  orgId: string,
  userId: string,
  requestedBy: string,
): Promise<void> {
  // Check the organization exists
  const org = await organizationRepo.findById(repoDb, orgId);
  if (!org) {
    throw AppError.notFound('Organization');
  }

  // Check requester's permission
  const requesterRole = await organizationRepo.getMemberRole(repoDb, orgId, requestedBy);
  assertPermission(requesterRole, PERMISSIONS.ORGANIZATION.MANAGE_MEMBERS);

  // Cannot remove the owner
  const targetRole = await organizationRepo.getMemberRole(repoDb, orgId, userId);
  if (targetRole === 'owner') {
    throw AppError.badRequest('Cannot remove the organization owner');
  }

  const removed = await organizationRepo.removeMember(repoDb, orgId, userId);
  if (!removed) {
    throw AppError.notFound('Member');
  }
}

/**
 * Get all members of an organization.
 */
export async function getOrganizationMembers(orgId: string): Promise<OrganizationMemberResult[]> {
  const org = await organizationRepo.findById(repoDb, orgId);
  if (!org) {
    throw AppError.notFound('Organization');
  }

  const members = await organizationRepo.getMembers(repoDb, orgId);
  return members.map(toMemberResult);
}

/**
 * Get a user's role in an organization.
 */
export async function getUserOrganizationRole(
  orgId: string,
  userId: string,
): Promise<string | undefined> {
  return organizationRepo.getMemberRole(repoDb, orgId, userId);
}
