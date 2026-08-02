import { eq, and, asc, count, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { tasks, users } from '../schema/index.js';

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
  status?: string;
  priority?: string;
  projectId: string;
  assigneeId?: string | null;
  boardId?: string | null;
  columnId?: string | null;
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
  boardId?: string | null;
  columnId?: string | null;
  sprintId?: string | null;
  position?: number;
  labels?: string[] | null;
  dueDate?: Date | null;
}

export interface TaskMoveData {
  boardId: string;
  columnId: string;
  position: number;
}

export interface TaskWithAssigneeRecord extends TaskRecord {
  assigneeName: string | null;
  assigneeEmail: string | null;
  assigneeAvatarUrl: string | null;
}

// ============================================================
// Task CRUD
// ============================================================

/**
 * Create a task. Requires projectId. Auto-assigns assigneeId to the
 * provided userId if not specified. boardId/columnId/sprintId are optional.
 */
export async function create(
  db: PostgresJsDatabase,
  data: CreateTaskData,
  userId?: string,
): Promise<TaskRecord> {
  const now = new Date();
  const [task] = await db
    .insert(tasks)
    .values({
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? 'todo',
      priority: data.priority ?? 'medium',
      projectId: data.projectId,
      assigneeId: data.assigneeId ?? userId ?? null,
      boardId: data.boardId ?? null,
      columnId: data.columnId ?? null,
      sprintId: data.sprintId ?? null,
      position: data.position ?? 0,
      labels: data.labels ?? [],
      dueDate: data.dueDate ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return task as TaskRecord;
}

/**
 * Find a task by its ID.
 */
export async function findById(
  db: PostgresJsDatabase,
  id: string,
): Promise<TaskRecord | undefined> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return task as TaskRecord | undefined;
}

/**
 * Find a task by ID with its assignee's profile data.
 */
export async function findByIdWithAssignee(
  db: PostgresJsDatabase,
  id: string,
): Promise<TaskWithAssigneeRecord | undefined> {
  const [row] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      assigneeId: tasks.assigneeId,
      projectId: tasks.projectId,
      boardId: tasks.boardId,
      columnId: tasks.columnId,
      sprintId: tasks.sprintId,
      position: tasks.position,
      labels: tasks.labels,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      assigneeName: users.name,
      assigneeEmail: users.email,
      assigneeAvatarUrl: users.avatarUrl,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(tasks.id, id))
    .limit(1);

  return row as TaskWithAssigneeRecord | undefined;
}

/**
 * Find all tasks in a project, ordered by position then creation date.
 */
export async function findByProjectId(
  db: PostgresJsDatabase,
  projectId: string,
): Promise<TaskRecord[]> {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.position), asc(tasks.createdAt)) as Promise<TaskRecord[]>;
}

/**
 * Find all tasks in a project with assignee profile data.
 */
export async function findByProjectIdWithAssignees(
  db: PostgresJsDatabase,
  projectId: string,
): Promise<TaskWithAssigneeRecord[]> {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      assigneeId: tasks.assigneeId,
      projectId: tasks.projectId,
      boardId: tasks.boardId,
      columnId: tasks.columnId,
      sprintId: tasks.sprintId,
      position: tasks.position,
      labels: tasks.labels,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      assigneeName: users.name,
      assigneeEmail: users.email,
      assigneeAvatarUrl: users.avatarUrl,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.position), asc(tasks.createdAt));

  return rows as TaskWithAssigneeRecord[];
}

/**
 * Find tasks in a project filtered by status.
 */
export async function findByProjectIdAndStatus(
  db: PostgresJsDatabase,
  projectId: string,
  status: string,
): Promise<TaskRecord[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, status)))
    .orderBy(asc(tasks.position), asc(tasks.createdAt)) as Promise<TaskRecord[]>;
}

/**
 * Find tasks in a project filtered by priority.
 */
export async function findByProjectIdAndPriority(
  db: PostgresJsDatabase,
  projectId: string,
  priority: string,
): Promise<TaskRecord[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.priority, priority)))
    .orderBy(asc(tasks.position), asc(tasks.createdAt)) as Promise<TaskRecord[]>;
}

/**
 * Find tasks assigned to a user across all their projects.
 */
export async function findByAssignee(
  db: PostgresJsDatabase,
  assigneeId: string,
): Promise<TaskRecord[]> {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.assigneeId, assigneeId))
    .orderBy(asc(tasks.createdAt)) as Promise<TaskRecord[]>;
}

/**
 * Find tasks assigned to a user within a specific project.
 */
export async function findByProjectAndAssignee(
  db: PostgresJsDatabase,
  projectId: string,
  assigneeId: string,
): Promise<TaskRecord[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.assigneeId, assigneeId)))
    .orderBy(asc(tasks.position), asc(tasks.createdAt)) as Promise<TaskRecord[]>;
}

/**
 * Find all tasks in a sprint.
 */
export async function findBySprintId(
  db: PostgresJsDatabase,
  sprintId: string,
): Promise<TaskRecord[]> {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.sprintId, sprintId))
    .orderBy(asc(tasks.position), asc(tasks.createdAt)) as Promise<TaskRecord[]>;
}

/**
 * Find tasks in a specific board column.
 */
export async function findByColumnId(
  db: PostgresJsDatabase,
  columnId: string,
): Promise<TaskRecord[]> {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.columnId, columnId))
    .orderBy(asc(tasks.position), asc(tasks.createdAt)) as Promise<TaskRecord[]>;
}

/**
 * Find tasks on a specific board.
 */
export async function findByBoardId(
  db: PostgresJsDatabase,
  boardId: string,
): Promise<TaskRecord[]> {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.boardId, boardId))
    .orderBy(asc(tasks.position), asc(tasks.createdAt)) as Promise<TaskRecord[]>;
}

/**
 * Update a task by ID. Only updates explicitly provided (non-undefined) fields.
 */
export async function updateById(
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
    return findById(db, id);
  }

  cleaned.updatedAt = new Date();
  const [updated] = await db.update(tasks).set(cleaned).where(eq(tasks.id, id)).returning();

  return updated as TaskRecord | undefined;
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
export async function getBoardId(db: PostgresJsDatabase, taskId: string): Promise<string | null> {
  const [task] = await db
    .select({ boardId: tasks.boardId })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  return task?.boardId ?? null;
}

// ============================================================
// Task Movement
// ============================================================

/**
 * Move a task to a different column/board position. Updates boardId,
 * columnId, and position in a single operation.
 */
export async function moveToColumn(
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

  return updated as TaskRecord | undefined;
}

/**
 * Move a task to a different sprint. Setting sprintId to null removes
 * the task from any sprint.
 */
export async function moveToSprint(
  db: PostgresJsDatabase,
  taskId: string,
  sprintId: string | null,
): Promise<TaskRecord | undefined> {
  const [updated] = await db
    .update(tasks)
    .set({ sprintId, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning();

  return updated as TaskRecord | undefined;
}

/**
 * Reassign a task to a different user. Setting assigneeId to null
 * unassigns the task.
 */
export async function reassign(
  db: PostgresJsDatabase,
  taskId: string,
  assigneeId: string | null,
): Promise<TaskRecord | undefined> {
  const [updated] = await db
    .update(tasks)
    .set({ assigneeId, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning();

  return updated as TaskRecord | undefined;
}

/**
 * Batch update positions for multiple tasks within a column.
 * Used for drag-and-drop reordering within a column.
 */
export async function batchUpdatePositions(
  db: PostgresJsDatabase,
  items: Array<{ id: string; position: number }>,
): Promise<void> {
  if (items.length === 0) return;

  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(tasks)
        .set({ position: item.position, updatedAt: new Date() })
        .where(eq(tasks.id, item.id));
    }
  });
}

// ============================================================
// Bulk Operations
// ============================================================

/**
 * Find multiple tasks by their IDs (for batch operations).
 */
export async function findByIds(db: PostgresJsDatabase, ids: string[]): Promise<TaskRecord[]> {
  if (ids.length === 0) return [];
  return db.select().from(tasks).where(inArray(tasks.id, ids)) as Promise<TaskRecord[]>;
}

/**
 * Update the sprint assignment for multiple tasks in a single transaction.
 * Used when adding/removing tasks from a sprint.
 */
export async function bulkUpdateSprint(
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
 * Update the assignee for multiple tasks in a single transaction.
 */
export async function bulkReassign(
  db: PostgresJsDatabase,
  taskIds: string[],
  assigneeId: string | null,
): Promise<void> {
  if (taskIds.length === 0) return;

  await db.transaction(async (tx) => {
    for (const taskId of taskIds) {
      await tx.update(tasks).set({ assigneeId, updatedAt: new Date() }).where(eq(tasks.id, taskId));
    }
  });
}

/**
 * Archive all tasks in a project by setting their status to 'archived'.
 */
export async function archiveByProjectId(db: PostgresJsDatabase, projectId: string): Promise<void> {
  await db
    .update(tasks)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(tasks.projectId, projectId));
}

// ============================================================
// Counting / Aggregation
// ============================================================

/**
 * Count tasks in a project.
 */
export async function countByProjectId(db: PostgresJsDatabase, projectId: string): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  return Number(result?.value ?? 0);
}

/**
 * Count tasks in a project by status.
 * Returns an array of { status, count } objects.
 */
export async function countByStatusInProject(
  db: PostgresJsDatabase,
  projectId: string,
): Promise<Array<{ status: string; count: number }>> {
  const results = await db
    .select({
      status: tasks.status,
      value: count(),
    })
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .groupBy(tasks.status);

  return results.map((r) => ({ status: r.status, count: Number(r.value) }));
}

/**
 * Count tasks assigned to a user across all their projects.
 */
export async function countByAssignee(db: PostgresJsDatabase, assigneeId: string): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(tasks)
    .where(eq(tasks.assigneeId, assigneeId));

  return Number(result?.value ?? 0);
}

/**
 * Count tasks in a sprint.
 */
export async function countBySprintId(db: PostgresJsDatabase, sprintId: string): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(tasks)
    .where(eq(tasks.sprintId, sprintId));

  return Number(result?.value ?? 0);
}
