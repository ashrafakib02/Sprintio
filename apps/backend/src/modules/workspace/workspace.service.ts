import { repoDb } from '../../config/db-for-repos.js';
import { workspaceRepo, organizationRepo } from '@sprintio/db/repositories';
import {
  slugify,
  AppError,
  PERMISSIONS,
  WORKSPACE_ROLES,
  ROLE_HIERARCHY,
  WORKSPACE_ROLE_PERMISSIONS,
} from '@sprintio/shared';
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  TransferOwnershipInput,
} from '@sprintio/shared';
import { randomBytes } from 'node:crypto';

/** Helper to detect PostgreSQL unique-constraint violation (error code 23505). */
function isPgUniqueViolation(err: unknown): boolean {
  return err instanceof Error && 'code' in err && (err as { code: string }).code === '23505';
}

/**
 * Validates that the requested role is a valid workspace role.
 * Defense-in-depth: the Zod schema should already enforce this,
 * but the service should not blindly trust the input layer.
 */
function validateRole(role: string): void {
  if (!(WORKSPACE_ROLES as readonly string[]).includes(role)) {
    throw AppError.badRequest(
      `Invalid role '${role}'. Must be one of: ${WORKSPACE_ROLES.join(', ')}`,
    );
  }
}

/**
 * Validates that an assigner can grant a target role.
 * - Only the owner can assign the 'owner' role.
 * - A user cannot assign a role equal to or higher than their own.
 * This prevents privilege escalation and owner hijacking.
 */
function assertCanAssignRole(assignerRole: string, targetRole: string): void {
  const assignerLevel = ROLE_HIERARCHY[assignerRole] ?? 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] ?? 0;

  if (targetRole === 'owner' && assignerRole !== 'owner') {
    throw AppError.forbidden('Only the workspace owner can assign the owner role');
  }

  if (targetLevel >= assignerLevel) {
    throw AppError.forbidden(
      `Cannot assign a role equal to or higher than your own (${assignerRole})`,
    );
  }
}

// ============================================================
// Types
// ============================================================

export interface WorkspaceResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  brandColor: string | null;
  customDomain: string | null;
  organizationId: string | null;
  plan: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberResult {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  createdAt: string;
}

export interface WorkspaceContextResult {
  workspace: WorkspaceResult;
  userRole: string;
  members: WorkspaceMemberWithUserResult[];
}

export interface WorkspaceMemberWithUserResult {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface WorkspaceInvitationResult {
  id: string;
  workspaceId: string;
  email: string;
  role: string;
  invitedById: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface WorkspaceOwnershipResult {
  previousOwner: WorkspaceMemberResult;
  newOwner: WorkspaceMemberResult;
}

// ============================================================
// Helpers
// ============================================================

function toWorkspaceResult(ws: workspaceRepo.WorkspaceRecord): WorkspaceResult {
  return {
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    description: ws.description,
    logo: ws.logo,
    brandColor: ws.brandColor ?? null,
    customDomain: ws.customDomain ?? null,
    organizationId: ws.organizationId,
    plan: ws.plan,
    archivedAt: ws.archivedAt ? ws.archivedAt.toISOString() : null,
    createdAt: ws.createdAt.toISOString(),
    updatedAt: ws.updatedAt.toISOString(),
  };
}

function toMemberResult(member: workspaceRepo.WorkspaceMemberRecord): WorkspaceMemberResult {
  return {
    id: member.id,
    workspaceId: member.workspaceId,
    userId: member.userId,
    role: member.role,
    createdAt: member.createdAt.toISOString(),
  };
}

function toMemberWithUserResult(
  member: workspaceRepo.WorkspaceMemberWithUserRecord,
): WorkspaceMemberWithUserResult {
  return {
    id: member.id,
    workspaceId: member.workspaceId,
    userId: member.userId,
    role: member.role,
    createdAt: member.createdAt.toISOString(),
    user: member.user,
  };
}

function toInvitationResult(
  invitation: workspaceRepo.WorkspaceInvitationRecord,
): WorkspaceInvitationResult {
  return {
    id: invitation.id,
    workspaceId: invitation.workspaceId,
    email: invitation.email,
    role: invitation.role,
    invitedById: invitation.invitedById,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
  };
}

function generateInvitationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Checks if the requester has the required permission within a workspace.
 * Owner always passes. Uses the centralized permission map from the RBAC middleware.
 * Returns the validated role string, eliminating the need for non-null assertions downstream.
 */
function assertPermission(role: string | undefined, permission: string): string {
  if (!role) {
    throw AppError.forbidden('You are not a member of this workspace');
  }

  if (role === 'owner') {
    return role;
  }

  const permissions = WORKSPACE_ROLE_PERMISSIONS[role] ?? [];
  if (!permissions.includes(permission)) {
    throw AppError.forbidden('Insufficient workspace permissions');
  }

  return role;
}

// ============================================================
// Service Methods
// ============================================================

/**
 * NOTE (P-C02): Nearly every service method runs 1. findById(workspaceId),
 * 2. getMemberRole(workspaceId, requestedBy), then the actual work query.
 * This results in 2–3 DB queries before every mutation. This pattern is
 * INTENTIONAL defense-in-depth: the middleware catches gross violations,
 * but the service must independently verify workspace existence and
 * membership to prevent TOCTOU race conditions and information disclosure.
 * Do NOT remove these checks — the extra queries are the price of security.

/**
 * Create a new workspace. The creator is added as owner.
 * Optionally associates the workspace with an organization.
 */
export async function createWorkspace(
  userId: string,
  data: CreateWorkspaceInput,
): Promise<WorkspaceResult> {
  const slug = slugify(data.name);

  // Check for slug uniqueness (optimistic check before insert)
  const existing = await workspaceRepo.findBySlug(repoDb, slug);
  if (existing) {
    throw AppError.conflict('A workspace with a similar name already exists');
  }

  // If associating with an organization, validate it exists and user is a member
  if (data.organizationId) {
    const org = await organizationRepo.findById(repoDb, data.organizationId);
    if (!org) {
      throw AppError.notFound('Organization');
    }

    const isOrgMember = await organizationRepo.isMember(repoDb, data.organizationId, userId);
    if (!isOrgMember) {
      throw AppError.forbidden(
        'You must be a member of the organization to create a workspace under it',
      );
    }
  }

  try {
    const workspace = await workspaceRepo.create(repoDb, {
      name: data.name,
      slug,
      description: data.description,
      organizationId: data.organizationId,
      createdById: userId,
    });

    return toWorkspaceResult(workspace);
  } catch (err: unknown) {
    // Handle race condition: another request may have inserted the same slug
    // between our check and insert. PostgreSQL error code 23505 = unique_violation.
    if (isPgUniqueViolation(err)) {
      throw AppError.conflict('A workspace with a similar name already exists');
    }
    throw err;
  }
}

/**
 * Get a workspace by ID.
 * The requester must be a member of the workspace.
 */
export async function getWorkspace(
  workspaceId: string,
  requestedBy: string,
): Promise<WorkspaceResult> {
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  // Verify the requester is a member
  const isMember = await workspaceRepo.isMember(repoDb, workspaceId, requestedBy);
  if (!isMember) {
    throw AppError.forbidden('You are not a member of this workspace');
  }

  return toWorkspaceResult(workspace);
}

/**
 * List all workspaces a user belongs to.
 */
export async function getUserWorkspaces(
  userId: string,
  includeArchived: boolean = false,
): Promise<WorkspaceResult[]> {
  const workspaces = await workspaceRepo.findByUserIdFiltered(repoDb, userId, includeArchived);
  return workspaces.map(toWorkspaceResult);
}

/**
 * List all workspaces in an organization.
 */
export async function getOrganizationWorkspaces(
  organizationId: string,
): Promise<WorkspaceResult[]> {
  const org = await organizationRepo.findById(repoDb, organizationId);
  if (!org) {
    throw AppError.notFound('Organization');
  }

  const workspaces = await workspaceRepo.findByOrganizationId(repoDb, organizationId);
  return workspaces.map(toWorkspaceResult);
}

/**
 * Update a workspace by ID.
 * The requester must have UPDATE permission (owner or admin).
 */
export async function updateWorkspace(
  workspaceId: string,
  data: UpdateWorkspaceInput,
  requestedBy: string,
): Promise<WorkspaceResult> {
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  // Check authorization
  const role = await workspaceRepo.getMemberRole(repoDb, workspaceId, requestedBy);
  assertPermission(role, PERMISSIONS.WORKSPACE.UPDATE);

  // Archived workspaces cannot be updated
  if (workspace.archivedAt) {
    throw AppError.badRequest('Cannot update an archived workspace. Restore it first.');
  }

  // If name is changing, check slug uniqueness
  if (data.name && data.name !== workspace.name) {
    const newSlug = slugify(data.name);
    const existing = await workspaceRepo.findBySlug(repoDb, newSlug);
    if (existing && existing.id !== workspaceId) {
      throw AppError.conflict('A workspace with a similar name already exists');
    }
  }

  let updated;
  try {
    updated = await workspaceRepo.updateById(repoDb, workspaceId, {
      name: data.name,
      description: data.description,
    });
  } catch (err: unknown) {
    if (isPgUniqueViolation(err)) {
      throw AppError.conflict('A workspace with a similar name already exists');
    }
    throw err;
  }

  if (!updated) {
    throw AppError.internal('Failed to update workspace');
  }

  return toWorkspaceResult(updated);
}

/**
 * Update workspace settings (branding, custom domain).
 * The requester must have SETTINGS permission (owner or admin).
 */
export async function updateWorkspaceSettings(
  workspaceId: string,
  data: {
    name?: string;
    description?: string | null;
    logo?: string | null;
    brandColor?: string | null;
    customDomain?: string | null;
  },
  requestedBy: string,
): Promise<WorkspaceResult> {
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  const role = await workspaceRepo.getMemberRole(repoDb, workspaceId, requestedBy);
  assertPermission(role, PERMISSIONS.WORKSPACE.SETTINGS);

  if (workspace.archivedAt) {
    throw AppError.badRequest('Cannot update an archived workspace. Restore it first.');
  }

  // If name is changing, check slug uniqueness
  if (data.name && data.name !== workspace.name) {
    const newSlug = slugify(data.name);
    const existing = await workspaceRepo.findBySlug(repoDb, newSlug);
    if (existing && existing.id !== workspaceId) {
      throw AppError.conflict('A workspace with a similar name already exists');
    }
  }

  let updated;
  try {
    updated = await workspaceRepo.updateById(repoDb, workspaceId, {
      name: data.name,
      description: data.description,
      logo: data.logo,
      brandColor: data.brandColor,
      customDomain: data.customDomain,
    });
  } catch (err: unknown) {
    if (isPgUniqueViolation(err)) {
      throw AppError.conflict('A workspace with a similar name already exists');
    }
    throw err;
  }

  if (!updated) {
    throw AppError.internal('Failed to update workspace settings');
  }

  return toWorkspaceResult(updated);
}

// ============================================================
// Role Management Methods
// ============================================================

/**
 * List all custom roles for a workspace scope.
 */
export async function getWorkspaceRoles(
  workspaceId: string,
  requestedBy: string,
): Promise<
  Array<{
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    permissions: string[];
  }>
> {
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  const role = await workspaceRepo.getMemberRole(repoDb, workspaceId, requestedBy);
  assertPermission(role, PERMISSIONS.WORKSPACE.MANAGE_ROLES);

  // Query roles scoped to this workspace from the roles table
  const {
    roles: rolesTable,
    rolePermissions: rpTable,
    permissions: permsTable,
  } = await import('@sprintio/db/schema');
  const { eq: eqOp, and: andOp } = await import('drizzle-orm');

  // Single query with LEFT JOIN to fetch all roles and their permissions at once.
  // This replaces the previous N+1 pattern (1 query for roles + N queries for permissions).
  const rows = await repoDb
    .select({
      roleId: rolesTable.id,
      name: rolesTable.name,
      description: rolesTable.description,
      isSystem: rolesTable.isSystem,
      permName: permsTable.name,
    })
    .from(rolesTable)
    .leftJoin(rpTable, eqOp(rolesTable.id, rpTable.roleId))
    .leftJoin(permsTable, eqOp(rpTable.permissionId, permsTable.id))
    .where(andOp(eqOp(rolesTable.scope, 'workspace')));

  // Group permissions by role in memory
  const roleMap = new Map<
    string,
    {
      id: string;
      name: string;
      description: string | null;
      isSystem: boolean;
      permissions: string[];
    }
  >();

  for (const row of rows) {
    if (!roleMap.has(row.roleId)) {
      roleMap.set(row.roleId, {
        id: row.roleId,
        name: row.name,
        description: row.description,
        isSystem: row.isSystem,
        permissions: [],
      });
    }
    if (row.permName) {
      roleMap.get(row.roleId)!.permissions.push(row.permName);
    }
  }

  return Array.from(roleMap.values());
}

/**
 * Create a custom role for a workspace.
 */
export async function createWorkspaceRole(
  workspaceId: string,
  data: { name: string; description?: string; permissionIds?: string[] },
  requestedBy: string,
): Promise<{ id: string; name: string; description: string | null; isSystem: boolean }> {
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  const role = await workspaceRepo.getMemberRole(repoDb, workspaceId, requestedBy);
  assertPermission(role, PERMISSIONS.WORKSPACE.MANAGE_ROLES);

  const {
    roles: rolesTable,
    rolePermissions: rpTable,
    permissions: permsTable,
  } = await import('@sprintio/db/schema');
  const { eq: eqOp, inArray } = await import('drizzle-orm');

  // Check for duplicate name
  const existing = await repoDb
    .select()
    .from(rolesTable)
    .where(eqOp(rolesTable.name, data.name))
    .limit(1);

  if (existing.length > 0) {
    throw AppError.conflict(`A role named '${data.name}' already exists`);
  }

  // Validate that all permissionIds correspond to real rows in the permissions table
  if (data.permissionIds && data.permissionIds.length > 0) {
    const validPerms = await repoDb
      .select({ id: permsTable.id })
      .from(permsTable)
      .where(inArray(permsTable.id, data.permissionIds));
    if (validPerms.length !== data.permissionIds.length) {
      throw AppError.badRequest('One or more permission IDs are invalid');
    }
  }

  const result = await repoDb.transaction(async (tx) => {
    const [newRole] = await tx
      .insert(rolesTable)
      .values({
        name: data.name,
        description: data.description ?? null,
        scope: 'workspace',
        isSystem: false,
      })
      .returning();

    if (data.permissionIds && data.permissionIds.length > 0) {
      await tx.insert(rpTable).values(
        data.permissionIds.map((permId) => ({
          roleId: newRole.id,
          permissionId: permId,
        })),
      );
    }

    return newRole;
  });

  return {
    id: result.id,
    name: result.name,
    description: result.description,
    isSystem: result.isSystem,
  };
}

/**
 * Update a custom role for a workspace.
 */
export async function updateWorkspaceRole(
  workspaceId: string,
  roleId: string,
  data: { name?: string; description?: string | null; permissionIds?: string[] },
  requestedBy: string,
): Promise<{ id: string; name: string; description: string | null; isSystem: boolean }> {
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  const role = await workspaceRepo.getMemberRole(repoDb, workspaceId, requestedBy);
  assertPermission(role, PERMISSIONS.WORKSPACE.MANAGE_ROLES);

  const {
    roles: rolesTable,
    rolePermissions: rpTable,
    permissions: permsTable,
  } = await import('@sprintio/db/schema');
  const { eq: eqOp, inArray } = await import('drizzle-orm');

  // Verify role exists and is not a system role
  const [existingRole] = await repoDb
    .select()
    .from(rolesTable)
    .where(eqOp(rolesTable.id, roleId))
    .limit(1);

  if (!existingRole) {
    throw AppError.notFound('Role');
  }

  if (existingRole.isSystem) {
    throw AppError.badRequest('Cannot modify a system role');
  }

  // Validate that all permissionIds correspond to real rows in the permissions table
  if (data.permissionIds !== undefined && data.permissionIds.length > 0) {
    const validPerms = await repoDb
      .select({ id: permsTable.id })
      .from(permsTable)
      .where(inArray(permsTable.id, data.permissionIds));
    if (validPerms.length !== data.permissionIds.length) {
      throw AppError.badRequest('One or more permission IDs are invalid');
    }
  }

  const result = await repoDb.transaction(async (tx) => {
    const [updated] = await tx
      .update(rolesTable)
      .set({
        name: data.name,
        description: data.description,
      })
      .where(eqOp(rolesTable.id, roleId))
      .returning();

    // Sync permissions if provided
    if (data.permissionIds !== undefined) {
      await tx.delete(rpTable).where(eqOp(rpTable.roleId, roleId));

      if (data.permissionIds.length > 0) {
        await tx.insert(rpTable).values(
          data.permissionIds.map((permId) => ({
            roleId,
            permissionId: permId,
          })),
        );
      }
    }

    return updated;
  });

  return {
    id: result.id,
    name: result.name,
    description: result.description,
    isSystem: result.isSystem,
  };
}

/**
 * Delete a custom role from a workspace.
 */
export async function deleteWorkspaceRole(
  workspaceId: string,
  roleId: string,
  requestedBy: string,
): Promise<void> {
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  const role = await workspaceRepo.getMemberRole(repoDb, workspaceId, requestedBy);
  assertPermission(role, PERMISSIONS.WORKSPACE.MANAGE_ROLES);

  const { roles: rolesTable, userRoles: urTable } = await import('@sprintio/db/schema');
  const { eq: eqOp, and: andOp } = await import('drizzle-orm');

  const [existingRole] = await repoDb
    .select()
    .from(rolesTable)
    .where(eqOp(rolesTable.id, roleId))
    .limit(1);

  if (!existingRole) {
    throw AppError.notFound('Role');
  }

  if (existingRole.isSystem) {
    throw AppError.badRequest('Cannot delete a system role');
  }

  // Check if any users are assigned this role
  const assignments = await repoDb
    .select()
    .from(urTable)
    .where(
      andOp(
        eqOp(urTable.roleId, roleId),
        eqOp(urTable.scope, 'workspace'),
        eqOp(urTable.scopeId, workspaceId),
      ),
    )
    .limit(1);

  if (assignments.length > 0) {
    throw AppError.badRequest(
      'Cannot delete a role that is assigned to users. Reassign them first.',
    );
  }

  await repoDb.delete(rolesTable).where(eqOp(rolesTable.id, roleId));
}

/**
 * List all available permissions.
 */
export async function listPermissions(): Promise<
  Array<{ id: string; name: string; resource: string; action: string; description: string | null }>
> {
  const { permissions: permsTable } = await import('@sprintio/db/schema');

  const perms = await repoDb.select().from(permsTable);
  return perms.map((p) => ({
    id: p.id,
    name: p.name,
    resource: p.resource,
    action: p.action,
    description: p.description,
  }));
}

/**
 * Update a member's role in a workspace.
 */
export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  newRole: string,
  requestedBy: string,
): Promise<WorkspaceMemberResult> {
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  const requesterRole = await workspaceRepo.getMemberRole(repoDb, workspaceId, requestedBy);
  const validatedRole = assertPermission(requesterRole, PERMISSIONS.WORKSPACE.MANAGE_MEMBERS);

  // Cannot change the owner's role
  const targetRole = await workspaceRepo.getMemberRole(repoDb, workspaceId, userId);
  if (targetRole === 'owner') {
    throw AppError.badRequest('Cannot change the role of the workspace owner');
  }

  // Validate role hierarchy
  assertCanAssignRole(validatedRole, newRole);

  const updated = await workspaceRepo.updateMemberRole(repoDb, workspaceId, userId, newRole);
  if (!updated) {
    throw AppError.notFound('Member');
  }

  return toMemberResult(updated);
}

/**
 * Archive a workspace (soft-delete).
 * The requester must have UPDATE permission.
 */
export async function archiveWorkspace(
  workspaceId: string,
  requestedBy: string,
): Promise<WorkspaceResult> {
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  const role = await workspaceRepo.getMemberRole(repoDb, workspaceId, requestedBy);
  assertPermission(role, PERMISSIONS.WORKSPACE.UPDATE);

  if (workspace.archivedAt) {
    throw AppError.badRequest('Workspace is already archived');
  }

  const archived = await workspaceRepo.archiveById(repoDb, workspaceId);
  if (!archived) {
    throw AppError.internal('Failed to archive workspace');
  }

  return toWorkspaceResult(archived);
}

/**
 * Restore an archived workspace.
 * The requester must have UPDATE permission.
 */
export async function restoreWorkspace(
  workspaceId: string,
  requestedBy: string,
): Promise<WorkspaceResult> {
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  const role = await workspaceRepo.getMemberRole(repoDb, workspaceId, requestedBy);
  assertPermission(role, PERMISSIONS.WORKSPACE.UPDATE);

  if (!workspace.archivedAt) {
    throw AppError.badRequest('Workspace is not archived');
  }

  const restored = await workspaceRepo.restoreById(repoDb, workspaceId);
  if (!restored) {
    throw AppError.internal('Failed to restore workspace');
  }

  return toWorkspaceResult(restored);
}

/**
 * Permanently delete a workspace.
 * The requester must have DELETE permission.
 * The workspace must be archived first (enforces archive → delete lifecycle).
 */
export async function deleteWorkspace(workspaceId: string, requestedBy: string): Promise<void> {
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  if (!workspace.archivedAt) {
    throw AppError.badRequest('Workspace must be archived before it can be permanently deleted');
  }

  const role = await workspaceRepo.getMemberRole(repoDb, workspaceId, requestedBy);
  assertPermission(role, PERMISSIONS.WORKSPACE.DELETE);

  const deleted = await workspaceRepo.deleteById(repoDb, workspaceId);
  if (!deleted) {
    throw AppError.internal('Failed to delete workspace');
  }
}

/**
 * Add a member to a workspace.
 * The requester must have MANAGE_MEMBERS permission.
 */
export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: string,
  requestedBy: string,
): Promise<WorkspaceMemberResult> {
  // Defense-in-depth: validate role is a valid workspace role
  validateRole(role);

  // Check the workspace exists
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  // Check requester's permission
  const requesterRole = await workspaceRepo.getMemberRole(repoDb, workspaceId, requestedBy);
  const validatedRole = assertPermission(requesterRole, PERMISSIONS.WORKSPACE.MANAGE_MEMBERS);

  // Validate role hierarchy: prevent privilege escalation and owner hijacking
  assertCanAssignRole(validatedRole, role);

  // Check if user is already a member
  const existingMember = await workspaceRepo.isMember(repoDb, workspaceId, userId);
  if (existingMember) {
    throw AppError.conflict('User is already a member of this workspace');
  }

  const member = await workspaceRepo.addMember(repoDb, workspaceId, userId, role);

  return toMemberResult(member);
}

/**
 * Remove a member from a workspace.
 * The requester must have MANAGE_MEMBERS permission.
 */
export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string,
  requestedBy: string,
): Promise<void> {
  // Check the workspace exists
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  // Check requester's permission
  const requesterRole = await workspaceRepo.getMemberRole(repoDb, workspaceId, requestedBy);
  assertPermission(requesterRole, PERMISSIONS.WORKSPACE.MANAGE_MEMBERS);

  // Check target exists and is a member
  const targetRole = await workspaceRepo.getMemberRole(repoDb, workspaceId, userId);
  if (!targetRole) {
    throw AppError.notFound('Member');
  }

  // Cannot remove the owner
  if (targetRole === 'owner') {
    throw AppError.badRequest('Cannot remove the workspace owner');
  }

  const removed = await workspaceRepo.removeMember(repoDb, workspaceId, userId);
  if (!removed) {
    throw AppError.notFound('Member');
  }
}

/**
 * Get all members of a workspace.
 * The requester must be a member of the workspace.
 */
export async function getWorkspaceMembers(
  workspaceId: string,
  requestedBy: string,
): Promise<WorkspaceMemberResult[]> {
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  // Verify the requester is a member — prevents information disclosure
  const isMember = await workspaceRepo.isMember(repoDb, workspaceId, requestedBy);
  if (!isMember) {
    throw AppError.forbidden('You are not a member of this workspace');
  }

  const members = await workspaceRepo.getMembers(repoDb, workspaceId);
  return members.map(toMemberResult);
}

/**
 * Get a user's role in a workspace.
 */
export async function getUserWorkspaceRole(
  workspaceId: string,
  userId: string,
): Promise<string | undefined> {
  return workspaceRepo.getMemberRole(repoDb, workspaceId, userId);
}

/**
 * Resolve workspace context: validate user access and return workspace + role.
 * Used by the getWorkspaceContext controller endpoint.
 */
export async function resolveWorkspaceContext(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceContextResult> {
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  const role = await workspaceRepo.getMemberRole(repoDb, workspaceId, userId);
  if (!role) {
    throw AppError.forbidden('You are not a member of this workspace');
  }

  const members = await workspaceRepo.getMembersWithUsers(repoDb, workspaceId);

  return {
    workspace: toWorkspaceResult(workspace),
    userRole: role,
    members: members.map(toMemberWithUserResult),
  };
}

// ============================================================
// Invitation Methods
// ============================================================

/**
 * Invite a user to a workspace by email.
 * Creates a pending invitation with a token that expires in 7 days.
 * The requester must have MANAGE_MEMBERS permission.
 */
export async function inviteWorkspaceMember(
  workspaceId: string,
  email: string,
  role: string,
  requestedBy: string,
): Promise<WorkspaceInvitationResult> {
  // Defense-in-depth: validate role
  if (!(WORKSPACE_ROLES as readonly string[]).includes(role)) {
    throw AppError.badRequest(
      `Invalid role '${role}'. Must be one of: ${WORKSPACE_ROLES.join(', ')}`,
    );
  }

  // Check the workspace exists
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  // Check requester's permission
  const requesterRole = await workspaceRepo.getMemberRole(repoDb, workspaceId, requestedBy);
  const validatedRole = assertPermission(requesterRole, PERMISSIONS.WORKSPACE.MANAGE_MEMBERS);

  // Validate role hierarchy: prevent privilege escalation
  assertCanAssignRole(validatedRole, role);

  // Check if user is already a member (by userId lookup if they exist)
  // Note: we can't check by email directly since we'd need to look up the user first
  // The unique constraint on (workspaceId, email) will prevent duplicate invitations

  // Check for existing pending invitation
  const existingInvitation = await workspaceRepo.findInvitationByEmail(repoDb, workspaceId, email);
  if (existingInvitation) {
    throw AppError.conflict('An invitation has already been sent to this email');
  }

  // Generate token and expiration (7 days)
  const token = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await workspaceRepo.createInvitation(repoDb, {
    workspaceId,
    email,
    role,
    token,
    invitedById: requestedBy,
    expiresAt,
  });

  return toInvitationResult(invitation);
}

/**
 * Accept a workspace invitation by token.
 * The invited user must be authenticated.
 * Creates the membership and marks the invitation as accepted.
 */
export async function acceptInvitation(
  token: string,
  userId: string,
  email: string,
): Promise<WorkspaceMemberResult> {
  // Find the invitation
  const invitation = await workspaceRepo.findInvitationByToken(repoDb, token);
  if (!invitation) {
    throw AppError.notFound('Invitation');
  }

  // Verify the email matches the authenticated user
  if (invitation.email !== email) {
    throw AppError.forbidden('This invitation was sent to a different email address');
  }

  // Check if invitation has expired
  if (new Date() > invitation.expiresAt) {
    throw AppError.badRequest('This invitation has expired');
  }

  // Check if invitation is still pending
  if (invitation.status !== 'pending') {
    throw AppError.badRequest(`This invitation has already been ${invitation.status}`);
  }

  // Check if user is already a member
  const alreadyMember = await workspaceRepo.isMember(repoDb, invitation.workspaceId, userId);
  if (alreadyMember) {
    throw AppError.conflict('You are already a member of this workspace');
  }

  // Add the user as a member
  const member = await workspaceRepo.addMember(
    repoDb,
    invitation.workspaceId,
    userId,
    invitation.role,
  );

  // Mark invitation as accepted
  await workspaceRepo.updateInvitationStatus(repoDb, token, 'accepted');

  return toMemberResult(member);
}

/**
 * Reject a workspace invitation by token.
 * The invited user must be authenticated.
 */
export async function rejectInvitation(
  token: string,
  userId: string,
  email: string,
): Promise<void> {
  // Find the invitation
  const invitation = await workspaceRepo.findInvitationByToken(repoDb, token);
  if (!invitation) {
    throw AppError.notFound('Invitation');
  }

  // Verify the email matches the authenticated user
  if (invitation.email !== email) {
    throw AppError.forbidden('This invitation was sent to a different email address');
  }

  // Check if invitation is still pending
  if (invitation.status !== 'pending') {
    throw AppError.badRequest(`This invitation has already been ${invitation.status}`);
  }

  // Mark invitation as rejected
  await workspaceRepo.updateInvitationStatus(repoDb, token, 'rejected');
}

/**
 * Transfer workspace ownership to another member.
 * Only the current owner can perform this action.
 * Both role changes happen in a transaction.
 */
export async function transferOwnership(
  workspaceId: string,
  data: TransferOwnershipInput,
  requestedBy: string,
): Promise<WorkspaceOwnershipResult> {
  // Check the workspace exists
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  // Verify requester is the owner
  const requesterRole = await workspaceRepo.getMemberRole(repoDb, workspaceId, requestedBy);
  if (requesterRole !== 'owner') {
    throw AppError.forbidden('Only the workspace owner can transfer ownership');
  }

  // Verify the target is a member
  const targetRole = await workspaceRepo.getMemberRole(repoDb, workspaceId, data.newOwnerId);
  if (!targetRole) {
    throw AppError.notFound('Target user is not a member of this workspace');
  }

  // Can't transfer to yourself
  if (data.newOwnerId === requestedBy) {
    throw AppError.badRequest('Cannot transfer ownership to yourself');
  }

  // Perform both role changes in a transaction to prevent inconsistent state
  const result = await repoDb.transaction(async (tx) => {
    const previousOwner = await workspaceRepo.updateMemberRole(
      tx,
      workspaceId,
      requestedBy,
      'admin',
    );
    const newOwner = await workspaceRepo.updateMemberRole(
      tx,
      workspaceId,
      data.newOwnerId,
      'owner',
    );

    if (!previousOwner || !newOwner) {
      throw AppError.internal('Failed to transfer ownership');
    }

    return { previousOwner, newOwner };
  });

  return {
    previousOwner: toMemberResult(result.previousOwner),
    newOwner: toMemberResult(result.newOwner),
  };
}

/**
 * List pending invitations for a workspace.
 * The requester must have MANAGE_MEMBERS permission.
 */
export async function getWorkspaceInvitations(
  workspaceId: string,
  requestedBy: string,
): Promise<WorkspaceInvitationResult[]> {
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  const role = await workspaceRepo.getMemberRole(repoDb, workspaceId, requestedBy);
  assertPermission(role, PERMISSIONS.WORKSPACE.MANAGE_MEMBERS);

  const invitations = await workspaceRepo.getInvitations(repoDb, workspaceId);
  return invitations.map(toInvitationResult);
}
