import { repoDb } from '../../config/db-for-repos.js';
import { workspaceRepo, organizationRepo } from '@sprintio/db/repositories';
import { slugify, AppError, PERMISSIONS } from '@sprintio/shared';
import type { CreateWorkspaceInput } from '@sprintio/shared';

// ============================================================
// Types
// ============================================================

export interface WorkspaceResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  organizationId: string | null;
  plan: string;
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
    organizationId: ws.organizationId,
    plan: ws.plan,
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

/**
 * Checks if the requester has the required permission within a workspace.
 * Owner always passes.
 */
function assertPermission(role: string | undefined, permission: string): void {
  if (!role) {
    throw AppError.forbidden('You are not a member of this workspace');
  }

  if (role === 'owner') {
    return;
  }

  const WORKSPACE_ROLE_PERMISSIONS: Record<string, string[]> = {
    admin: [
      PERMISSIONS.WORKSPACE.UPDATE,
      PERMISSIONS.WORKSPACE.MANAGE_MEMBERS,
      PERMISSIONS.WORKSPACE.MANAGE_BILLING,
    ],
    member: [],
    guest: [],
  };

  const permissions = WORKSPACE_ROLE_PERMISSIONS[role] ?? [];
  if (!permissions.includes(permission)) {
    throw AppError.forbidden('Insufficient workspace permissions');
  }
}

// ============================================================
// Service Methods
// ============================================================

/**
 * Create a new workspace. The creator is added as owner.
 * Optionally associates the workspace with an organization.
 */
export async function createWorkspace(
  userId: string,
  data: CreateWorkspaceInput & { organizationId?: string },
): Promise<WorkspaceResult> {
  const slug = slugify(data.name);

  // Check for slug uniqueness
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

  const workspace = await workspaceRepo.create(repoDb, {
    name: data.name,
    slug,
    description: data.description,
    organizationId: data.organizationId,
    createdById: userId,
  });

  return toWorkspaceResult(workspace);
}

/**
 * Get a workspace by ID.
 */
export async function getWorkspace(workspaceId: string): Promise<WorkspaceResult> {
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  return toWorkspaceResult(workspace);
}

/**
 * List all workspaces a user belongs to.
 */
export async function getUserWorkspaces(userId: string): Promise<WorkspaceResult[]> {
  const workspaces = await workspaceRepo.findByUserId(repoDb, userId);
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
 * Add a member to a workspace.
 * The requester must have MANAGE_MEMBERS permission.
 */
export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: string,
  requestedBy: string,
): Promise<WorkspaceMemberResult> {
  // Check the workspace exists
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  // Check requester's permission
  const requesterRole = await workspaceRepo.getMemberRole(repoDb, workspaceId, requestedBy);
  assertPermission(requesterRole, PERMISSIONS.WORKSPACE.MANAGE_MEMBERS);

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

  // Cannot remove the owner
  const targetRole = await workspaceRepo.getMemberRole(repoDb, workspaceId, userId);
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
 */
export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberResult[]> {
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
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

  return {
    workspace: toWorkspaceResult(workspace),
    userRole: role,
  };
}
