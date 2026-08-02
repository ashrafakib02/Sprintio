import { eq, asc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  tasks,
  boards,
  columns,
  workspaceMembers,
  workspaces,
  organizationMembers,
} from '../schema/index.js';

// ============================================================
// Helpers
// ============================================================

function _slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

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
  priority?: string;
  projectId: string;
  assigneeId?: string | null;
  boardId?: string | null;
  columnId?: string | null;
  sprintId?: string | null;
  dueDate?: Date | null;
  labels?: string[];
}

// ============================================================
// Task CRUD
// ============================================================

/**
 * Create a task. Requires projectId. Auto-assigns assigneeId to userId
 * if not specified. boardId/columnId/sprintId are optional.
 */
export async function create(
  db: PostgresJsDatabase,
  data: CreateTaskData,
  userId: string,
): Promise<TaskRecord> {
  const now = new Date();
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
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return task as TaskRecord;
}

/**
 * Find tasks assigned to a user across all their workspaces.
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
 * Find a task by ID.
 */
export async function findById(
  db: PostgresJsDatabase,
  id: string,
): Promise<TaskRecord | undefined> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return task as TaskRecord | undefined;
}

/**
 * Update a task.
 */
export async function update(
  db: PostgresJsDatabase,
  id: string,
  data: Partial<CreateTaskData>,
): Promise<TaskRecord | undefined> {
  const [task] = await db
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  return task as TaskRecord | undefined;
}

/**
 * Delete a task.
 */
export async function remove(
  db: PostgresJsDatabase,
  id: string,
): Promise<boolean> {
  const [deleted] = await db.delete(tasks).where(eq(tasks.id, id)).returning({ id: tasks.id });
  return deleted !== undefined;
}

// ============================================================
// Helpers
// ============================================================

/**
 * Find the first board and first column in the user's workspace.
 * Bootstraps the full chain if anything is missing:
 *   organization → workspace → board → columns
 */
async function _findDefaultBoardAndColumn(
  db: PostgresJsDatabase,
  userId: string,
): Promise<{ boardId: string; columnId: string }> {
  const now = new Date();

  // 1. Find or create a workspace membership for this user
  let [membership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  if (!membership) {
    // Find the user's first organization
    const [orgMember] = await db
      .select({ organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId))
      .limit(1);

    const orgId = orgMember?.organizationId ?? null;

    // Create a default workspace
    const slug = `workspace-${Date.now()}`;
    const [ws] = await db
      .insert(workspaces)
      .values({
        name: 'My Workspace',
        slug,
        organizationId: orgId,
        plan: 'free',
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: workspaces.id });

    if (!ws) throw new Error('Failed to create default workspace');

    // Add user as owner
    await db.insert(workspaceMembers).values({
      workspaceId: ws.id,
      userId,
      role: 'owner',
      createdAt: now,
    });

    membership = { workspaceId: ws.id };
  }

  // 2. Find or create a board in the workspace
  let [board] = await db
    .select({ id: boards.id })
    .from(boards)
    .where(eq(boards.workspaceId, membership.workspaceId))
    .limit(1);

  if (!board) {
    const [newBoard] = await db
      .insert(boards)
      .values({
        name: 'Main Board',
        workspaceId: membership.workspaceId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: boards.id });

    if (!newBoard) throw new Error('Failed to create default board');
    board = newBoard;

    // Create standard columns
    const [todoCol] = await db
      .insert(columns)
      .values([
        { name: 'To Do', boardId: board.id, position: 0, createdAt: now },
        { name: 'In Progress', boardId: board.id, position: 1, createdAt: now },
        { name: 'Done', boardId: board.id, position: 2, createdAt: now },
      ])
      .returning({ id: columns.id });

    if (todoCol) {
      return { boardId: board.id, columnId: todoCol.id };
    }
  }

  // 3. Find the first column in the board
  const [col] = await db
    .select({ id: columns.id })
    .from(columns)
    .where(eq(columns.boardId, board.id))
    .orderBy(asc(columns.position))
    .limit(1);

  if (!col) throw new Error('No columns found in board');
  return { boardId: board.id, columnId: col.id };
}
