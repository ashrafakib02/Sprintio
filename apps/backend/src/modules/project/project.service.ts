import { repoDb } from '../../config/db-for-repos.js';
import { projectRepo, workspaceRepo } from '@sprintio/db/repositories';
import { AppError } from '@sprintio/shared';
import type { CreateProjectForWorkspaceInput, UpdateProjectInput } from '@sprintio/shared';

// ============================================================
// Types
// ============================================================

export interface ProjectResult {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Helpers
// ============================================================

function toProjectResult(project: projectRepo.ProjectRecord): ProjectResult {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    workspaceId: project.workspaceId,
    status: project.status,
    startDate: project.startDate ? project.startDate.toISOString() : null,
    endDate: project.endDate ? project.endDate.toISOString() : null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

// ============================================================
// Permission Map
// ============================================================

const WORKSPACE_ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: [
    'workspace:update',
    'workspace:delete',
    'workspace:manage_members',
    'workspace:manage_billing',
    'workspace:settings',
    'workspace:manage_roles',
    'board:create',
    'board:update',
    'board:delete',
    'project:create',
    'project:update',
    'project:delete',
    'task:create',
    'task:update',
    'task:delete',
    'task:assign',
    'document:create',
    'document:update',
    'document:delete',
  ],
  admin: [
    'workspace:update',
    'workspace:manage_members',
    'workspace:manage_billing',
    'workspace:settings',
    'workspace:manage_roles',
    'board:create',
    'board:update',
    'board:delete',
    'project:create',
    'project:update',
    'project:delete',
    'task:create',
    'task:update',
    'task:delete',
    'task:assign',
    'document:create',
    'document:update',
    'document:delete',
  ],
  member: [
    'board:create',
    'board:update',
    'board:delete',
    'project:create',
    'project:update',
    'project:delete',
    'task:create',
    'task:update',
    'task:delete',
    'task:assign',
    'document:create',
    'document:update',
    'document:delete',
  ],
  guest: ['board:create', 'task:create', 'document:create'],
};

function assertPermission(role: string | undefined, permission: string): void {
  if (!role) {
    throw AppError.forbidden('You are not a member of this workspace');
  }

  if (role === 'owner') {
    return;
  }

  const permissions = WORKSPACE_ROLE_PERMISSIONS[role] ?? [];
  if (!permissions.includes(permission)) {
    throw AppError.forbidden('Insufficient workspace permissions');
  }
}

// ============================================================
// Service Methods
// ============================================================

/**
 * List all projects in a workspace.
 * The requester must be a member of the workspace.
 */
export async function listProjects(workspaceId: string, userId: string): Promise<ProjectResult[]> {
  // Validate workspace exists
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  // Check workspace membership
  const isMember = await workspaceRepo.isMember(repoDb, workspaceId, userId);
  if (!isMember) {
    throw AppError.forbidden('You are not a member of this workspace');
  }

  const projects = await projectRepo.findByWorkspaceId(repoDb, workspaceId);
  return projects.map(toProjectResult);
}

/**
 * Create a new project in a workspace.
 * The requester must have project:create permission.
 */
export async function createProject(
  workspaceId: string,
  data: CreateProjectForWorkspaceInput,
  userId: string,
): Promise<ProjectResult> {
  // Validate workspace exists
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  // Check permission
  const role = await workspaceRepo.getMemberRole(repoDb, workspaceId, userId);
  assertPermission(role, 'project:create');

  // Archived workspaces cannot have projects created
  if (workspace.archivedAt) {
    throw AppError.badRequest('Cannot create projects in an archived workspace');
  }

  const project = await projectRepo.create(repoDb, {
    name: data.name,
    description: data.description,
    workspaceId,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : undefined,
  });

  return toProjectResult(project);
}

/**
 * Get a project by ID.
 * The requester must be a member of the workspace.
 */
export async function getProject(projectId: string, userId: string): Promise<ProjectResult> {
  const project = await projectRepo.findById(repoDb, projectId);
  if (!project) {
    throw AppError.notFound('Project');
  }

  // Walk chain: project → workspace
  const workspace = await workspaceRepo.findById(repoDb, project.workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  // Check workspace membership
  const isMember = await workspaceRepo.isMember(repoDb, workspace.id, userId);
  if (!isMember) {
    throw AppError.forbidden('You are not a member of this workspace');
  }

  return toProjectResult(project);
}

/**
 * Update a project.
 * The requester must have project:update permission.
 */
export async function updateProject(
  projectId: string,
  data: UpdateProjectInput,
  userId: string,
): Promise<ProjectResult> {
  const project = await projectRepo.findById(repoDb, projectId);
  if (!project) {
    throw AppError.notFound('Project');
  }

  // Walk chain: project → workspace
  const workspace = await workspaceRepo.findById(repoDb, project.workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  // Check permission
  const role = await workspaceRepo.getMemberRole(repoDb, workspace.id, userId);
  assertPermission(role, 'project:update');

  // Archived workspaces cannot have projects updated
  if (workspace.archivedAt) {
    throw AppError.badRequest('Cannot update projects in an archived workspace');
  }

  const updated = await projectRepo.updateById(repoDb, projectId, {
    name: data.name,
    description: data.description,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : undefined,
  });

  if (!updated) {
    throw AppError.internal('Failed to update project');
  }

  return toProjectResult(updated);
}

/**
 * Delete a project.
 * The requester must have project:delete permission.
 */
export async function deleteProject(projectId: string, userId: string): Promise<void> {
  const project = await projectRepo.findById(repoDb, projectId);
  if (!project) {
    throw AppError.notFound('Project');
  }

  // Walk chain: project → workspace
  const workspace = await workspaceRepo.findById(repoDb, project.workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  // Check permission
  const role = await workspaceRepo.getMemberRole(repoDb, workspace.id, userId);
  assertPermission(role, 'project:delete');

  const deleted = await projectRepo.deleteById(repoDb, projectId);
  if (!deleted) {
    throw AppError.internal('Failed to delete project');
  }
}

/**
 * Archive a project (soft-delete).
 * The requester must have project:update permission.
 */
export async function archiveProject(projectId: string, userId: string): Promise<ProjectResult> {
  const project = await projectRepo.findById(repoDb, projectId);
  if (!project) {
    throw AppError.notFound('Project');
  }

  // Walk chain: project → workspace
  const workspace = await workspaceRepo.findById(repoDb, project.workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  // Check permission
  const role = await workspaceRepo.getMemberRole(repoDb, workspace.id, userId);
  assertPermission(role, 'project:update');

  const archived = await projectRepo.archiveById(repoDb, projectId);
  if (!archived) {
    throw AppError.internal('Failed to archive project');
  }

  return toProjectResult(archived);
}
