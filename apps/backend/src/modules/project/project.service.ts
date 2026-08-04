import { repoDb } from '../../config/db-for-repos.js';
import { projectRepo, workspaceRepo } from '@sprintio/db/repositories';
import { ProjectError } from '@sprintio/shared';
import type { CreateProjectForWorkspaceInput, UpdateProjectInput } from '@sprintio/shared';
import type { ProjectResult, ProjectWithStats } from './project.types.js';

// ============================================================
// Helpers
// ============================================================

function toProjectResult(project: projectRepo.ProjectRecord): ProjectResult {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    workspaceId: project.workspaceId,
    status: project.status,
    priority: project.priority,
    visibility: project.visibility,
    startDate: project.startDate ? project.startDate.toISOString() : null,
    endDate: project.endDate ? project.endDate.toISOString() : null,
    deletedAt: project.deletedAt ? project.deletedAt.toISOString() : null,
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
    throw ProjectError.notMemberOfWorkspace();
  }

  if (role === 'owner') {
    return;
  }

  const permissions = WORKSPACE_ROLE_PERMISSIONS[role] ?? [];
  if (!permissions.includes(permission)) {
    throw ProjectError.insufficientPermissions(permission.split(':')[1]);
  }
}

// ============================================================
// Service Methods
// ============================================================

/**
 * List all non-deleted projects in a workspace.
 * The requester must be a member of the workspace.
 */
export async function listProjects(workspaceId: string, userId: string): Promise<ProjectResult[]> {
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw ProjectError.notFound('Workspace');
  }

  const isMember = await workspaceRepo.isMember(repoDb, workspaceId, userId);
  if (!isMember) {
    throw ProjectError.notMemberOfWorkspace();
  }

  const projects = await projectRepo.findByWorkspaceId(repoDb, workspaceId);
  return projects.map(toProjectResult);
}

/**
 * List projects with pagination and optional filters.
 */
export async function listProjectsPaginated(
  workspaceId: string,
  userId: string,
  query: { page: number; limit: number; status?: string; priority?: string; search?: string },
): Promise<{ projects: ProjectResult[]; total: number; page: number; limit: number; totalPages: number }> {
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw ProjectError.notFound('Workspace');
  }

  const isMember = await workspaceRepo.isMember(repoDb, workspaceId, userId);
  if (!isMember) {
    throw ProjectError.notMemberOfWorkspace();
  }

  const result = await projectRepo.findByWorkspaceIdWithPagination(repoDb, workspaceId, query.page, query.limit);
  return {
    projects: result.projects.map(toProjectResult),
    total: result.total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(result.total / query.limit),
  };
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
  const workspace = await workspaceRepo.findById(repoDb, workspaceId);
  if (!workspace) {
    throw ProjectError.notFound('Workspace');
  }

  const role = await workspaceRepo.getMemberRole(repoDb, workspaceId, userId);
  assertPermission(role, 'project:create');

  if (workspace.archivedAt) {
    throw ProjectError.archivedWorkspace();
  }

  const project = await projectRepo.create(repoDb, {
    name: data.name,
    slug: data.slug,
    description: data.description,
    workspaceId,
    priority: data.priority,
    visibility: data.visibility,
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
    throw ProjectError.notFound(projectId);
  }

  const isMember = await workspaceRepo.isMember(repoDb, project.workspaceId, userId);
  if (!isMember) {
    throw ProjectError.notMemberOfWorkspace();
  }

  return toProjectResult(project);
}

/**
 * Get a project by ID with sprint/task counts.
 */
export async function getProjectWithStats(projectId: string, userId: string): Promise<ProjectWithStats> {
  const project = await projectRepo.findById(repoDb, projectId);
  if (!project) {
    throw ProjectError.notFound(projectId);
  }

  const isMember = await workspaceRepo.isMember(repoDb, project.workspaceId, userId);
  if (!isMember) {
    throw ProjectError.notMemberOfWorkspace();
  }

  const stats = await projectRepo.findByIdWithStats(repoDb, projectId);
  if (!stats) {
    throw ProjectError.notFound(projectId);
  }

  return {
    ...toProjectResult(project),
    sprintCount: stats.sprintCount,
    taskCount: stats.taskCount,
  };
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
    throw ProjectError.notFound(projectId);
  }

  const workspace = await workspaceRepo.findById(repoDb, project.workspaceId);
  if (!workspace) {
    throw ProjectError.notFound('Workspace');
  }

  const role = await workspaceRepo.getMemberRole(repoDb, workspace.id, userId);
  assertPermission(role, 'project:update');

  if (workspace.archivedAt) {
    throw ProjectError.archivedWorkspace();
  }

  const updated = await projectRepo.updateById(repoDb, projectId, {
    name: data.name,
    slug: data.slug,
    description: data.description,
    priority: data.priority,
    visibility: data.visibility,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : undefined,
  });

  if (!updated) {
    throw ProjectError.notFound(projectId);
  }

  return toProjectResult(updated);
}

/**
 * Soft-delete a project (sets deletedAt).
 * The requester must have project:delete permission.
 */
export async function deleteProject(projectId: string, userId: string): Promise<void> {
  const project = await projectRepo.findById(repoDb, projectId);
  if (!project) {
    throw ProjectError.notFound(projectId);
  }

  const workspace = await workspaceRepo.findById(repoDb, project.workspaceId);
  if (!workspace) {
    throw ProjectError.notFound('Workspace');
  }

  const role = await workspaceRepo.getMemberRole(repoDb, workspace.id, userId);
  assertPermission(role, 'project:delete');

  const deleted = await projectRepo.softDeleteById(repoDb, projectId);
  if (!deleted) {
    throw ProjectError.notFound(projectId);
  }
}

/**
 * Restore a soft-deleted project.
 * The requester must have project:update permission.
 */
export async function restoreProject(projectId: string, userId: string): Promise<ProjectResult> {
  const project = await projectRepo.findByIdIncludingDeleted(repoDb, projectId);
  if (!project) {
    throw ProjectError.notFound(projectId);
  }

  const workspace = await workspaceRepo.findById(repoDb, project.workspaceId);
  if (!workspace) {
    throw ProjectError.notFound('Workspace');
  }

  const role = await workspaceRepo.getMemberRole(repoDb, workspace.id, userId);
  assertPermission(role, 'project:update');

  const restored = await projectRepo.restoreById(repoDb, projectId);
  if (!restored) {
    throw ProjectError.notFound(projectId);
  }

  return toProjectResult(restored);
}

/**
 * Archive a project (sets status to 'archived').
 * The requester must have project:update permission.
 */
export async function archiveProject(projectId: string, userId: string): Promise<ProjectResult> {
  const project = await projectRepo.findById(repoDb, projectId);
  if (!project) {
    throw ProjectError.notFound(projectId);
  }

  const workspace = await workspaceRepo.findById(repoDb, project.workspaceId);
  if (!workspace) {
    throw ProjectError.notFound('Workspace');
  }

  const role = await workspaceRepo.getMemberRole(repoDb, workspace.id, userId);
  assertPermission(role, 'project:update');

  const archived = await projectRepo.archiveById(repoDb, projectId);
  if (!archived) {
    throw ProjectError.notFound(projectId);
  }

  return toProjectResult(archived);
}
