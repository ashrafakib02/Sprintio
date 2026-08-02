import { eq, asc, desc, count, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../schema/index.js';
import { projects, sprints, boards, columns, tasks, workspaces } from '../schema/index.js';

// ── Import types for local use in interface contracts ──────────
import type {
  ProjectRecord,
  CreateProjectData,
  UpdateProjectData,
} from './project.repository.js';
import type {
  SprintRecord,
  CreateSprintData,
  UpdateSprintData,
} from './sprint.repository.js';
import type {
  BoardRecord,
  CreateBoardData,
  UpdateBoardData,
} from './board.repository.js';
import type {
  ColumnRecord,
  CreateColumnData,
  UpdateColumnData,
  ColumnReorderItem,
} from './column.repository.js';
import type {
  TaskRecord,
  CreateTaskData,
  UpdateTaskData,
  TaskMoveData,
} from './task.repository.js';

// ============================================================
// Re-export from individual repositories
// This preserves backward compatibility with existing imports like:
//   import { hierarchyRepo } from '@sprintio/db';
//   hierarchyRepo.findProjectById(db, id);
// ============================================================

// Re-export types (from local imports above)
export type {
  ProjectRecord,
  CreateProjectData,
  UpdateProjectData,
  SprintRecord,
  CreateSprintData,
  UpdateSprintData,
  BoardRecord,
  CreateBoardData,
  UpdateBoardData,
  ColumnRecord,
  CreateColumnData,
  UpdateColumnData,
  ColumnReorderItem,
  TaskRecord,
  CreateTaskData,
  UpdateTaskData,
  TaskMoveData,
};

// Re-export functions with legacy names (from source modules)
export {
  findById as findProjectById,
  findByWorkspaceId as findProjectsByWorkspaceId,
  findByWorkspaceIdWithPagination as findProjectsByWorkspaceIdWithPagination,
  create as createProject,
  updateById as updateProjectById,
  archiveById as archiveProjectById,
  deleteById as deleteProjectById,
  countByWorkspaceId as countProjectsByWorkspaceId,
} from './project.repository.js';

export {
  findById as findSprintById,
  findByProjectId as findSprintsByProjectId,
  create as createSprint,
  updateById as updateSprintById,
  deleteById as deleteSprintById,
} from './sprint.repository.js';

export {
  findById as findBoardById,
  findByWorkspaceId as findBoardsByWorkspaceId,
  create as createBoard,
  updateById as updateBoardById,
  deleteById as deleteBoardById,
} from './board.repository.js';

export {
  findByBoardId as findColumnsByBoardId,
  create as createColumn,
  updateById as updateColumnById,
  deleteById as deleteColumnById,
  reorder as reorderColumns,
} from './column.repository.js';

export {
  create as createTask,
  findByProjectId as findTasksByProjectId,
  findByAssignee as findTasksByAssignee,
  findById as findTaskById,
  updateById as updateTaskById,
  deleteById as deleteTaskById,
  moveToColumn as moveTaskToColumn,
  findByIds as findTasksByIds,
  bulkUpdateSprint as bulkUpdateTaskSprint,
  archiveByProjectId as archiveTasksByProjectId,
} from './task.repository.js';

// ============================================================
// Repository Interface Contracts
// These TypeScript interfaces define the shape of each repository.
// They are kept here for backward compatibility and can be used
// for dependency injection / testing.
// ============================================================

/** Database type with schema — required for relational query API (db.query.*) */
type SchemaDb = PostgresJsDatabase<typeof schema>;

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
// Relational Query Patterns (Drizzle Query API)
// ============================================================
// These functions use Drizzle's relational query API (db.query.*)
// for eager-loading related entities in a single round-trip.
// They require the schema-aware db instance (SchemaDb type).

/**
 * Get a project with its sprints and tasks (eager loaded).
 * Use case: Project detail / overview page.
 *
 * Query path: project → { sprints, tasks }
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
 * Use case: Task detail view, breadcrumbs, permissions chain.
 *
 * Query path: task → { project → { workspace → { organization } }, board, column, sprint, assignee }
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
 * Use case: Workspace project list with task/sprint counts and previews.
 *
 * Query path: workspace → { projects → { sprints, tasks } }
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
 * Get a workspace with all its projects and their task counts.
 * Uses the relational query API — each project includes its tasks
 * array, so counts can be derived client-side, or this can be used
 * as a lighter alternative to findWorkspaceWithProjects.
 * Use case: Workspace overview dashboard with project cards.
 *
 * Query path: workspace → { projects (with tasks) }
 */
export async function findWorkspaceWithProjectCounts(db: SchemaDb, workspaceId: string) {
  return db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    with: {
      projects: {
        orderBy: [desc(projects.createdAt)],
        with: {
          tasks: true,
        },
      },
    },
  });
}

/**
 * Get task count per project in a workspace using the query builder.
 * Returns an array of { projectId, taskCount } objects.
 * Use case: Efficient project card views without loading task rows.
 */
export async function getTaskCountsByWorkspace(
  db: SchemaDb,
  workspaceId: string,
): Promise<Array<{ projectId: string; taskCount: number }>> {
  const projectRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId));

  if (projectRows.length === 0) return [];

  const projectIds = projectRows.map((p) => p.id);

  const counts = await db
    .select({
      projectId: tasks.projectId,
      count: count(tasks.id),
    })
    .from(tasks)
    .where(inArray(tasks.projectId, projectIds))
    .groupBy(tasks.projectId);

  // Merge to include projects with 0 tasks
  const countMap = new Map(counts.map((c) => [c.projectId, Number(c.count)]));
  return projectIds.map((id) => ({
    projectId: id,
    taskCount: countMap.get(id) ?? 0,
  }));
}

/**
 * Get a board with its columns and tasks (for rendering a board view).
 * Use case: Kanban board view — columns as lanes, tasks as cards.
 *
 * Query path: board → { columns (ordered by position), tasks (ordered by position) }
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
 * Use case: Sprint board, sprint review, backlog grooming.
 *
 * Query path: sprint → { tasks → { assignee (profile only) } }
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
 * Use case: Main workspace dashboard — shows projects and board structure.
 *
 * Query path: workspace → { projects, boards → { columns } }
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
