import { eq, asc, desc, count, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../schema/index.js';
import { projects, sprints, boards, columns, tasks, workspaces } from '../schema/index.js';

/** Database type with schema — required for relational query API (db.query.*) */
type SchemaDb = PostgresJsDatabase<typeof schema>;

// ============================================================
// Repository Interface Contracts
// ============================================================

// ── Project ─────────────────────────────────────────────────

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

export interface ProjectRepository {
  findById(db: PostgresJsDatabase, id: string): Promise<ProjectRecord | undefined>;
  findByWorkspaceId(db: PostgresJsDatabase, workspaceId: string): Promise<ProjectRecord[]>;
  findByWorkspaceIdWithPagination(
    db: PostgresJsDatabase,
    workspaceId: string,
    page: number,
    limit: number,
  ): Promise<{ projects: ProjectRecord[]; total: number }>;
  create(db: PostgresJsDatabase, data: CreateProjectData): Promise<ProjectRecord>;
  updateById(
    db: PostgresJsDatabase,
    id: string,
    data: UpdateProjectData,
  ): Promise<ProjectRecord | undefined>;
  archiveById(db: PostgresJsDatabase, id: string): Promise<ProjectRecord | undefined>;
  deleteById(db: PostgresJsDatabase, id: string): Promise<boolean>;
  countByWorkspaceId(db: PostgresJsDatabase, workspaceId: string): Promise<number>;
}

// ── Sprint ──────────────────────────────────────────────────

export interface SprintRecord {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
  createdAt: Date;
}

export interface CreateSprintData {
  name: string;
  goal?: string | null;
  projectId: string;
  startDate: Date;
  endDate: Date;
  status?: string;
}

export interface UpdateSprintData {
  name?: string;
  goal?: string | null;
  startDate?: Date;
  endDate?: Date;
  status?: string;
}

export interface SprintRepository {
  findById(db: PostgresJsDatabase, id: string): Promise<SprintRecord | undefined>;
  findByProjectId(db: PostgresJsDatabase, projectId: string): Promise<SprintRecord[]>;
  create(db: PostgresJsDatabase, data: CreateSprintData): Promise<SprintRecord>;
  updateById(
    db: PostgresJsDatabase,
    id: string,
    data: UpdateSprintData,
  ): Promise<SprintRecord | undefined>;
  deleteById(db: PostgresJsDatabase, id: string): Promise<boolean>;
}

// ── Board ───────────────────────────────────────────────────

export interface BoardRecord {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBoardData {
  name: string;
  description?: string | null;
  workspaceId: string;
}

export interface UpdateBoardData {
  name?: string;
  description?: string | null;
}

export interface BoardRepository {
  findById(db: PostgresJsDatabase, id: string): Promise<BoardRecord | undefined>;
  findByWorkspaceId(db: PostgresJsDatabase, workspaceId: string): Promise<BoardRecord[]>;
  create(db: PostgresJsDatabase, data: CreateBoardData): Promise<BoardRecord>;
  updateById(
    db: PostgresJsDatabase,
    id: string,
    data: UpdateBoardData,
  ): Promise<BoardRecord | undefined>;
  deleteById(db: PostgresJsDatabase, id: string): Promise<boolean>;
}

// ── Column ──────────────────────────────────────────────────

export interface ColumnRecord {
  id: string;
  name: string;
  boardId: string;
  position: number;
  color: string | null;
  createdAt: Date;
}

export interface CreateColumnData {
  name: string;
  boardId: string;
  position: number;
  color?: string | null;
}

export interface UpdateColumnData {
  name?: string;
  position?: number;
  color?: string | null;
}

export interface ColumnReorderItem {
  id: string;
  position: number;
}

export interface ColumnRepository {
  findByBoardId(db: PostgresJsDatabase, boardId: string): Promise<ColumnRecord[]>;
  create(db: PostgresJsDatabase, data: CreateColumnData): Promise<ColumnRecord>;
  updateById(
    db: PostgresJsDatabase,
    id: string,
    data: UpdateColumnData,
  ): Promise<ColumnRecord | undefined>;
  deleteById(db: PostgresJsDatabase, id: string): Promise<boolean>;
  reorder(db: PostgresJsDatabase, columns: ColumnReorderItem[]): Promise<void>;
}

// ── Task (updated) ──────────────────────────────────────────

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: string | null;
  projectId: string;
  boardId: string | null;
  columnId: string | null;
  sprintId: string | null;
  position: number;
  labels: string[] | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskData {
  title: string;
  description?: string | null;
  priority?: string;
  projectId: string;
  assigneeId?: string | null;
  boardId?: string | null;
  columnId?: string | null;
  sprintId?: string | null;
  dueDate?: Date | null;
  labels?: string[];
}

export interface UpdateTaskData {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  boardId?: string | null;
  columnId?: string | null;
  sprintId?: string | null;
  position?: number;
  labels?: string[];
  dueDate?: Date | null;
}

export interface TaskMoveData {
  boardId: string;
  columnId: string;
  position: number;
}

export interface TaskRepository {
  create(db: PostgresJsDatabase, data: CreateTaskData, userId: string): Promise<TaskRecord>;
  findByProjectId(db: PostgresJsDatabase, projectId: string): Promise<TaskRecord[]>;
  findByAssignee(db: PostgresJsDatabase, assigneeId: string): Promise<TaskRecord[]>;
  findById(db: PostgresJsDatabase, id: string): Promise<TaskRecord | undefined>;
  updateById(
    db: PostgresJsDatabase,
    id: string,
    data: UpdateTaskData,
  ): Promise<TaskRecord | undefined>;
  deleteById(db: PostgresJsDatabase, id: string): Promise<boolean>;
  moveToColumn(
    db: PostgresJsDatabase,
    taskId: string,
    data: TaskMoveData,
  ): Promise<TaskRecord | undefined>;
}

// ============================================================
// Project Repository
// ============================================================

/**
 * Find a project by its ID.
 */
export async function findProjectById(
  db: PostgresJsDatabase,
  id: string,
): Promise<ProjectRecord | undefined> {
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return project;
}

/**
 * Find all projects in a workspace.
 */
export async function findProjectsByWorkspaceId(
  db: PostgresJsDatabase,
  workspaceId: string,
): Promise<ProjectRecord[]> {
  return db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(desc(projects.createdAt));
}

/**
 * Find projects in a workspace with pagination.
 */
export async function findProjectsByWorkspaceIdWithPagination(
  db: PostgresJsDatabase,
  workspaceId: string,
  page: number,
  limit: number,
): Promise<{ projects: ProjectRecord[]; total: number }> {
  const offset = (page - 1) * limit;

  const [projectRows, countRows] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(projects).where(eq(projects.workspaceId, workspaceId)),
  ]);

  return {
    projects: projectRows,
    total: Number(countRows[0]?.value ?? 0),
  };
}

/**
 * Create a new project in a workspace.
 */
export async function createProject(
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
 * Update a project by ID.
 */
export async function updateProjectById(
  db: PostgresJsDatabase,
  id: string,
  data: UpdateProjectData,
): Promise<ProjectRecord | undefined> {
  const cleaned: Record<string, unknown> = {};
  if (data.name !== undefined) cleaned.name = data.name;
  if (data.description !== undefined) cleaned.description = data.description;
  if (data.status !== undefined) cleaned.status = data.status;
  if (data.startDate !== undefined) cleaned.startDate = data.startDate;
  if (data.endDate !== undefined) cleaned.endDate = data.endDate;

  if (Object.keys(cleaned).length === 0) {
    return findProjectById(db, id);
  }

  const [updated] = await db.update(projects).set(cleaned).where(eq(projects.id, id)).returning();

  return updated;
}

/**
 * Archive a project (soft-delete via status change).
 */
export async function archiveProjectById(
  db: PostgresJsDatabase,
  id: string,
): Promise<ProjectRecord | undefined> {
  const [archived] = await db
    .update(projects)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();

  return archived;
}

/**
 * Delete a project by ID (hard delete). Cascades to sprints and tasks.
 */
export async function deleteProjectById(db: PostgresJsDatabase, id: string): Promise<boolean> {
  const [deleted] = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning({ id: projects.id });

  return !!deleted;
}

/**
 * Count projects in a workspace.
 */
export async function countProjectsByWorkspaceId(
  db: PostgresJsDatabase,
  workspaceId: string,
): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId));

  return Number(result?.value ?? 0);
}

// ============================================================
// Sprint Repository
// ============================================================

/**
 * Find a sprint by its ID.
 */
export async function findSprintById(
  db: PostgresJsDatabase,
  id: string,
): Promise<SprintRecord | undefined> {
  const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id)).limit(1);
  return sprint;
}

/**
 * Find all sprints in a project, ordered by start date.
 */
export async function findSprintsByProjectId(
  db: PostgresJsDatabase,
  projectId: string,
): Promise<SprintRecord[]> {
  return db
    .select()
    .from(sprints)
    .where(eq(sprints.projectId, projectId))
    .orderBy(asc(sprints.startDate));
}

/**
 * Create a new sprint in a project.
 */
export async function createSprint(
  db: PostgresJsDatabase,
  data: CreateSprintData,
): Promise<SprintRecord> {
  const [sprint] = await db
    .insert(sprints)
    .values({
      name: data.name,
      goal: data.goal ?? null,
      projectId: data.projectId,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status ?? 'planned',
    })
    .returning();

  return sprint;
}

/**
 * Update a sprint by ID.
 */
export async function updateSprintById(
  db: PostgresJsDatabase,
  id: string,
  data: UpdateSprintData,
): Promise<SprintRecord | undefined> {
  const cleaned: Record<string, unknown> = {};
  if (data.name !== undefined) cleaned.name = data.name;
  if (data.goal !== undefined) cleaned.goal = data.goal;
  if (data.startDate !== undefined) cleaned.startDate = data.startDate;
  if (data.endDate !== undefined) cleaned.endDate = data.endDate;
  if (data.status !== undefined) cleaned.status = data.status;

  if (Object.keys(cleaned).length === 0) {
    return findSprintById(db, id);
  }

  const [updated] = await db.update(sprints).set(cleaned).where(eq(sprints.id, id)).returning();

  return updated;
}

/**
 * Delete a sprint by ID.
 */
export async function deleteSprintById(db: PostgresJsDatabase, id: string): Promise<boolean> {
  const [deleted] = await db
    .delete(sprints)
    .where(eq(sprints.id, id))
    .returning({ id: sprints.id });

  return !!deleted;
}

// ============================================================
// Board Repository
// ============================================================

/**
 * Find a board by its ID.
 */
export async function findBoardById(
  db: PostgresJsDatabase,
  id: string,
): Promise<BoardRecord | undefined> {
  const [board] = await db.select().from(boards).where(eq(boards.id, id)).limit(1);
  return board;
}

/**
 * Find all boards in a workspace.
 */
export async function findBoardsByWorkspaceId(
  db: PostgresJsDatabase,
  workspaceId: string,
): Promise<BoardRecord[]> {
  return db
    .select()
    .from(boards)
    .where(eq(boards.workspaceId, workspaceId))
    .orderBy(asc(boards.createdAt));
}

/**
 * Create a new board in a workspace.
 */
export async function createBoard(
  db: PostgresJsDatabase,
  data: CreateBoardData,
): Promise<BoardRecord> {
  const [board] = await db
    .insert(boards)
    .values({
      name: data.name,
      description: data.description ?? null,
      workspaceId: data.workspaceId,
    })
    .returning();

  return board;
}

/**
 * Update a board by ID.
 */
export async function updateBoardById(
  db: PostgresJsDatabase,
  id: string,
  data: UpdateBoardData,
): Promise<BoardRecord | undefined> {
  const cleaned: Record<string, unknown> = {};
  if (data.name !== undefined) cleaned.name = data.name;
  if (data.description !== undefined) cleaned.description = data.description;

  if (Object.keys(cleaned).length === 0) {
    return findBoardById(db, id);
  }

  const [updated] = await db.update(boards).set(cleaned).where(eq(boards.id, id)).returning();

  return updated;
}

/**
 * Delete a board by ID. Cascades to columns and unlinks tasks.
 */
export async function deleteBoardById(db: PostgresJsDatabase, id: string): Promise<boolean> {
  const [deleted] = await db.delete(boards).where(eq(boards.id, id)).returning({ id: boards.id });

  return !!deleted;
}

// ============================================================
// Column Repository
// ============================================================

/**
 * Find all columns in a board, ordered by position.
 */
export async function findColumnsByBoardId(
  db: PostgresJsDatabase,
  boardId: string,
): Promise<ColumnRecord[]> {
  return db
    .select()
    .from(columns)
    .where(eq(columns.boardId, boardId))
    .orderBy(asc(columns.position));
}

/**
 * Create a new column in a board.
 */
export async function createColumn(
  db: PostgresJsDatabase,
  data: CreateColumnData,
): Promise<ColumnRecord> {
  const [col] = await db
    .insert(columns)
    .values({
      name: data.name,
      boardId: data.boardId,
      position: data.position,
      color: data.color ?? null,
    })
    .returning();

  return col;
}

/**
 * Update a column by ID.
 */
export async function updateColumnById(
  db: PostgresJsDatabase,
  id: string,
  data: UpdateColumnData,
): Promise<ColumnRecord | undefined> {
  const cleaned: Record<string, unknown> = {};
  if (data.name !== undefined) cleaned.name = data.name;
  if (data.position !== undefined) cleaned.position = data.position;
  if (data.color !== undefined) cleaned.color = data.color;

  if (Object.keys(cleaned).length === 0) {
    const [existing] = await db.select().from(columns).where(eq(columns.id, id)).limit(1);
    return existing;
  }

  const [updated] = await db.update(columns).set(cleaned).where(eq(columns.id, id)).returning();

  return updated;
}

/**
 * Delete a column by ID. Cascades to tasks (tasks are deleted).
 */
export async function deleteColumnById(db: PostgresJsDatabase, id: string): Promise<boolean> {
  const [deleted] = await db
    .delete(columns)
    .where(eq(columns.id, id))
    .returning({ id: columns.id });

  return !!deleted;
}

/**
 * Reorder columns within a board. Updates the position of each column
 * in a single transaction.
 */
export async function reorderColumns(
  db: PostgresJsDatabase,
  items: ColumnReorderItem[],
): Promise<void> {
  if (items.length === 0) return;

  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx.update(columns).set({ position: item.position }).where(eq(columns.id, item.id));
    }
  });
}

// ============================================================
// Task Repository (updated — no bootstrap logic)
// ============================================================

/**
 * Create a task. Requires projectId. Auto-assigns assigneeId to the
 * provided userId if not specified. boardId/columnId/sprintId are optional.
 */
export async function createTask(
  db: PostgresJsDatabase,
  data: CreateTaskData,
  userId: string,
): Promise<TaskRecord> {
  const [task] = await db
    .insert(tasks)
    .values({
      title: data.title,
      description: data.description ?? null,
      priority: data.priority ?? 'medium',
      projectId: data.projectId,
      assigneeId: data.assigneeId ?? userId,
      boardId: data.boardId ?? null,
      columnId: data.columnId ?? null,
      sprintId: data.sprintId ?? null,
      position: 0,
      labels: data.labels ?? [],
      dueDate: data.dueDate ?? null,
    })
    .returning();

  return task;
}

/**
 * Find all tasks in a project.
 */
export async function findTasksByProjectId(
  db: PostgresJsDatabase,
  projectId: string,
): Promise<TaskRecord[]> {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.position), asc(tasks.createdAt));
}

/**
 * Find tasks assigned to a user across all their projects.
 */
export async function findTasksByAssignee(
  db: PostgresJsDatabase,
  assigneeId: string,
): Promise<TaskRecord[]> {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.assigneeId, assigneeId))
    .orderBy(asc(tasks.createdAt));
}

/**
 * Find a task by ID.
 */
export async function findTaskById(
  db: PostgresJsDatabase,
  id: string,
): Promise<TaskRecord | undefined> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return task;
}

/**
 * Update a task by ID.
 */
export async function updateTaskById(
  db: PostgresJsDatabase,
  id: string,
  data: UpdateTaskData,
): Promise<TaskRecord | undefined> {
  const cleaned: Record<string, unknown> = {};
  if (data.title !== undefined) cleaned.title = data.title;
  if (data.description !== undefined) cleaned.description = data.description;
  if (data.status !== undefined) cleaned.status = data.status;
  if (data.priority !== undefined) cleaned.priority = data.priority;
  if (data.assigneeId !== undefined) cleaned.assigneeId = data.assigneeId;
  if (data.boardId !== undefined) cleaned.boardId = data.boardId;
  if (data.columnId !== undefined) cleaned.columnId = data.columnId;
  if (data.sprintId !== undefined) cleaned.sprintId = data.sprintId;
  if (data.position !== undefined) cleaned.position = data.position;
  if (data.labels !== undefined) cleaned.labels = data.labels;
  if (data.dueDate !== undefined) cleaned.dueDate = data.dueDate;

  if (Object.keys(cleaned).length === 0) {
    return findTaskById(db, id);
  }

  const [updated] = await db.update(tasks).set(cleaned).where(eq(tasks.id, id)).returning();

  return updated;
}

/**
 * Delete a task by ID.
 */
export async function deleteTaskById(db: PostgresJsDatabase, id: string): Promise<boolean> {
  const [deleted] = await db.delete(tasks).where(eq(tasks.id, id)).returning({ id: tasks.id });

  return !!deleted;
}

/**
 * Move a task to a different column/board position. Updates boardId,
 * columnId, and position in a single operation.
 */
export async function moveTaskToColumn(
  db: PostgresJsDatabase,
  taskId: string,
  data: TaskMoveData,
): Promise<TaskRecord | undefined> {
  const [updated] = await db
    .update(tasks)
    .set({
      boardId: data.boardId,
      columnId: data.columnId,
      position: data.position,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId))
    .returning();

  return updated;
}

// ============================================================
// Query Patterns — Eager Loading Examples
// ============================================================

/**
 * Get a project with its sprints and tasks (eager loaded).
 * Uses Drizzle's relational query API.
 */
export async function findProjectWithDetails(db: SchemaDb, projectId: string) {
  const [result] = await db.query.projects.findMany({
    where: eq(projects.id, projectId),
    with: {
      sprints: {
        orderBy: [asc(sprints.startDate)],
      },
      tasks: {
        orderBy: [asc(tasks.position)],
      },
    },
  });

  return result;
}

/**
 * Get a task with its full hierarchy chain:
 *   task → project → workspace → organization
 * Also loads the board, column, sprint, and assignee.
 */
export async function findTaskWithHierarchy(db: SchemaDb, taskId: string) {
  return db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      project: {
        with: {
          workspace: {
            with: {
              organization: true,
            },
          },
        },
      },
      board: true,
      column: true,
      sprint: true,
      assignee: {
        columns: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });
}

/**
 * Get a workspace with all its projects, and each project's tasks + sprints.
 */
export async function findWorkspaceWithProjects(db: SchemaDb, workspaceId: string) {
  return db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    with: {
      projects: {
        orderBy: [desc(projects.createdAt)],
        with: {
          sprints: {
            orderBy: [asc(sprints.startDate)],
          },
          tasks: {
            orderBy: [asc(tasks.position)],
          },
        },
      },
    },
  });
}

/**
 * Get a board with its columns and tasks (for rendering a board view).
 */
export async function findBoardWithColumns(db: SchemaDb, boardId: string) {
  return db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    with: {
      columns: {
        orderBy: [asc(columns.position)],
      },
      tasks: {
        orderBy: [asc(tasks.position)],
      },
    },
  });
}

/**
 * Get a sprint with its tasks (for sprint planning / review views).
 */
export async function findSprintWithTasks(db: SchemaDb, sprintId: string) {
  return db.query.sprints.findFirst({
    where: eq(sprints.id, sprintId),
    with: {
      tasks: {
        orderBy: [asc(tasks.position)],
        with: {
          assignee: {
            columns: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Get a workspace with its boards (each with columns) and projects.
 * This is the main "workspace dashboard" query.
 */
export async function findWorkspaceFull(db: SchemaDb, workspaceId: string) {
  return db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    with: {
      projects: {
        orderBy: [desc(projects.createdAt)],
      },
      boards: {
        orderBy: [asc(boards.createdAt)],
        with: {
          columns: {
            orderBy: [asc(columns.position)],
          },
        },
      },
    },
  });
}

// ============================================================
// Bulk Operations
// ============================================================

/**
 * Find multiple tasks by their IDs (for batch operations).
 */
export async function findTasksByIds(db: PostgresJsDatabase, ids: string[]): Promise<TaskRecord[]> {
  if (ids.length === 0) return [];
  return db.select().from(tasks).where(inArray(tasks.id, ids));
}

/**
 * Update the sprint assignment for multiple tasks in a single transaction.
 * Used when adding/removing tasks from a sprint.
 */
export async function bulkUpdateTaskSprint(
  db: PostgresJsDatabase,
  taskIds: string[],
  sprintId: string | null,
): Promise<void> {
  if (taskIds.length === 0) return;

  await db.transaction(async (tx) => {
    for (const taskId of taskIds) {
      await tx.update(tasks).set({ sprintId, updatedAt: new Date() }).where(eq(tasks.id, taskId));
    }
  });
}

/**
 * Archive all tasks in a project by setting their status to 'archived'.
 */
export async function archiveTasksByProjectId(
  db: PostgresJsDatabase,
  projectId: string,
): Promise<void> {
  await db
    .update(tasks)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(tasks.projectId, projectId));
}
