import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { tasks, boards } from '../schema/index.js';

// ============================================================
// Types
// ============================================================

export interface TaskRecord {
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
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskData {
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  boardId: string;
  columnId: string;
  sprintId?: string | null;
  position?: number;
  labels?: string[] | null;
  dueDate?: Date | null;
}

export interface UpdateTaskData {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  columnId?: string;
  sprintId?: string | null;
  position?: number;
  labels?: string[] | null;
  dueDate?: Date | null;
}

// ============================================================
// Task CRUD
// ============================================================

/**
 * Find a task by its ID.
 */
export async function findById(
  db: PostgresJsDatabase,
  id: string,
): Promise<TaskRecord | undefined> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);

  return task;
}

/**
 * Find all tasks belonging to a board.
 */
export async function findByBoardId(
  db: PostgresJsDatabase,
  boardId: string,
): Promise<TaskRecord[]> {
  return db.select().from(tasks).where(eq(tasks.boardId, boardId));
}

/**
 * Find all tasks belonging to a project (via boards).
 * Joins tasks → boards where boards.projectId = projectId.
 */
export async function findByProjectId(
  db: PostgresJsDatabase,
  projectId: string,
): Promise<TaskRecord[]> {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      assigneeId: tasks.assigneeId,
      boardId: tasks.boardId,
      columnId: tasks.columnId,
      sprintId: tasks.sprintId,
      position: tasks.position,
      labels: tasks.labels,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .innerJoin(boards, eq(tasks.boardId, boards.id))
    .where(eq(boards.projectId, projectId));

  return rows;
}

/**
 * Find all tasks belonging to a sprint.
 */
export async function findBySprintId(
  db: PostgresJsDatabase,
  sprintId: string,
): Promise<TaskRecord[]> {
  return db.select().from(tasks).where(eq(tasks.sprintId, sprintId));
}

/**
 * Find all tasks assigned to a user.
 */
export async function findByAssignee(
  db: PostgresJsDatabase,
  assigneeId: string,
): Promise<TaskRecord[]> {
  return db.select().from(tasks).where(eq(tasks.assigneeId, assigneeId));
}

/**
 * Create a new task.
 */
export async function create(db: PostgresJsDatabase, data: CreateTaskData): Promise<TaskRecord> {
  const [task] = await db
    .insert(tasks)
    .values({
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? 'todo',
      priority: data.priority ?? 'none',
      assigneeId: data.assigneeId ?? null,
      boardId: data.boardId,
      columnId: data.columnId,
      sprintId: data.sprintId ?? null,
      position: data.position ?? 0,
      labels: data.labels ?? [],
      dueDate: data.dueDate ?? null,
    })
    .returning();

  return task;
}

/**
 * Update a task by ID. Returns the updated record.
 */
export async function updateById(
  db: PostgresJsDatabase,
  id: string,
  data: UpdateTaskData,
): Promise<TaskRecord | undefined> {
  const [updated] = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();

  return updated;
}

/**
 * Delete a task by ID.
 */
export async function deleteById(db: PostgresJsDatabase, id: string): Promise<boolean> {
  const [deleted] = await db.delete(tasks).where(eq(tasks.id, id)).returning({ id: tasks.id });

  return !!deleted;
}

/**
 * Get the boardId for a task. Used by middleware for scoping checks.
 */
export async function getBoardId(
  db: PostgresJsDatabase,
  taskId: string,
): Promise<string | undefined> {
  const [task] = await db
    .select({ boardId: tasks.boardId })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  return task?.boardId;
}
