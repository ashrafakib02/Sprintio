import { eq, asc } from 'drizzle-orm';
import { repoDb } from '../../config/db-for-repos.js';
import { columns as columnsTable } from '@sprintio/db/schema';
import { taskRepo, boardRepo, projectRepo, workspaceRepo } from '@sprintio/db/repositories';
import { AppError } from '@sprintio/shared';
import type { CreateTaskForProjectInput, UpdateTaskInput } from '@sprintio/shared';

// ============================================================
// Types
// ============================================================

export interface TaskResult {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: string | null;
  boardId: string;
  columnId: string;
  sprintId: string | null;
  position: number;
  labels: string[] | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Helpers
// ============================================================

function toTaskResult(task: taskRepo.TaskRecord): TaskResult {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId,
    boardId: task.boardId,
    columnId: task.columnId,
    sprintId: task.sprintId,
    position: task.position,
    labels: task.labels,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
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
 * List all tasks in a project.
 * The requester must be a member of the workspace.
 */
export async function listTasks(projectId: string, userId: string): Promise<TaskResult[]> {
  // Validate project exists
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

  // Find all boards in the project and get their tasks
  const boards = await boardRepo.findByProjectId(repoDb, projectId);
  const allTasks: TaskResult[] = [];

  for (const board of boards) {
    const boardTasks = await taskRepo.findByBoardId(repoDb, board.id);
    allTasks.push(...boardTasks.map(toTaskResult));
  }

  return allTasks;
}

/**
 * Create a new task in a project.
 * The requester must have task:create permission.
 */
export async function createTask(
  projectId: string,
  data: CreateTaskForProjectInput,
  userId: string,
): Promise<TaskResult> {
  // Validate project exists
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
  assertPermission(role, 'task:create');

  // Archived workspaces cannot have tasks created
  if (workspace.archivedAt) {
    throw AppError.badRequest('Cannot create tasks in an archived workspace');
  }

  // Determine boardId and columnId
  let boardId: string | null = data.boardId ?? null;
  let columnId = data.columnId;

  if (!boardId) {
    // Find the first board in the project
    const boards = await boardRepo.findByProjectId(repoDb, projectId);
    if (boards.length === 0) {
      throw AppError.badRequest('No boards found in this project. Create a board first.');
    }
    boardId = boards[0].id;
  }

  if (!columnId) {
    // Find the first column for the board
    const boardColumns = await repoDb
      .select({ id: columnsTable.id })
      .from(columnsTable)
      .where(eq(columnsTable.boardId, boardId))
      .orderBy(asc(columnsTable.position))
      .limit(1);

    if (boardColumns.length === 0) {
      throw AppError.badRequest('Board has no columns. Create a column first.');
    }
    columnId = boardColumns[0].id;
  }

  if (!boardId) {
    throw AppError.badRequest('Board ID is required');
  }

  const task = await taskRepo.create(repoDb, {
    title: data.title,
    description: data.description,
    status: 'todo',
    priority: data.priority,
    assigneeId: data.assigneeId,
    boardId,
    columnId,
    sprintId: data.sprintId,
    position: data.position,
    labels: data.labels,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
  });

  return toTaskResult(task);
}

/**
 * Get a task by ID.
 * The requester must be a member of the workspace.
 */
export async function getTask(taskId: string, userId: string): Promise<TaskResult> {
  const task = await taskRepo.findById(repoDb, taskId);
  if (!task) {
    throw AppError.notFound('Task');
  }

  // Walk chain: task → board → workspace
  const board = await boardRepo.findById(repoDb, task.boardId);
  if (!board) {
    throw AppError.notFound('Board');
  }

  const workspace = await workspaceRepo.findById(repoDb, board.workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  // Check workspace membership
  const isMember = await workspaceRepo.isMember(repoDb, workspace.id, userId);
  if (!isMember) {
    throw AppError.forbidden('You are not a member of this workspace');
  }

  return toTaskResult(task);
}

/**
 * Update a task.
 * The requester must have task:update permission.
 */
export async function updateTask(
  taskId: string,
  data: UpdateTaskInput,
  userId: string,
): Promise<TaskResult> {
  const task = await taskRepo.findById(repoDb, taskId);
  if (!task) {
    throw AppError.notFound('Task');
  }

  // Walk chain: task → board → workspace
  const board = await boardRepo.findById(repoDb, task.boardId);
  if (!board) {
    throw AppError.notFound('Board');
  }

  const workspace = await workspaceRepo.findById(repoDb, board.workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  // Check permission
  const role = await workspaceRepo.getMemberRole(repoDb, workspace.id, userId);
  assertPermission(role, 'task:update');

  // Archived workspaces cannot have tasks updated
  if (workspace.archivedAt) {
    throw AppError.badRequest('Cannot update tasks in an archived workspace');
  }

  const updated = await taskRepo.updateById(repoDb, taskId, {
    title: data.title,
    description: data.description,
    priority: data.priority,
    assigneeId: data.assigneeId,
    columnId: data.columnId,
    sprintId: data.sprintId,
    position: data.position,
    labels: data.labels,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
  });

  if (!updated) {
    throw AppError.internal('Failed to update task');
  }

  return toTaskResult(updated);
}

/**
 * Delete a task.
 * The requester must have task:delete permission.
 */
export async function deleteTask(taskId: string, userId: string): Promise<void> {
  const task = await taskRepo.findById(repoDb, taskId);
  if (!task) {
    throw AppError.notFound('Task');
  }

  // Walk chain: task → board → workspace
  const board = await boardRepo.findById(repoDb, task.boardId);
  if (!board) {
    throw AppError.notFound('Board');
  }

  const workspace = await workspaceRepo.findById(repoDb, board.workspaceId);
  if (!workspace) {
    throw AppError.notFound('Workspace');
  }

  // Check permission
  const role = await workspaceRepo.getMemberRole(repoDb, workspace.id, userId);
  assertPermission(role, 'task:delete');

  const deleted = await taskRepo.deleteById(repoDb, taskId);
  if (!deleted) {
    throw AppError.internal('Failed to delete task');
  }
}
