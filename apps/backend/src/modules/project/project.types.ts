import type { ProjectStatus, ProjectPriority, ProjectVisibility } from '@sprintio/shared';

// ============================================================
// Service Result Types
// ============================================================

/** Serialized project returned by all service methods. */
export interface ProjectResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  workspaceId: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  visibility: ProjectVisibility;
  startDate: string | null;
  endDate: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Project with aggregate stats (used by detail/get-with-stats). */
export interface ProjectWithStats extends ProjectResult {
  sprintCount: number;
  taskCount: number;
}

// ============================================================
// Service Contract
// ============================================================

/**
 * Defines every operation the Project service exposes.
 * Controllers depend on this interface — never on the concrete
 * implementation — so the service can be swapped or mocked in tests.
 */
export interface IProjectService {
  /** List all non-deleted projects in a workspace. */
  listProjects(workspaceId: string, userId: string): Promise<ProjectResult[]>;

  /** List projects with pagination and optional filters. */
  listProjectsPaginated(
    workspaceId: string,
    userId: string,
    query: { page: number; limit: number; status?: string; priority?: string; search?: string },
  ): Promise<{
    projects: ProjectResult[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /** Get a single project by ID. */
  getProject(projectId: string, userId: string): Promise<ProjectResult>;

  /** Get a project by ID with sprint/task counts. */
  getProjectWithStats(projectId: string, userId: string): Promise<ProjectWithStats>;

  /** Create a new project in a workspace. */
  createProject(
    workspaceId: string,
    data: {
      name: string;
      slug: string;
      description?: string;
      priority?: string;
      visibility?: string;
      startDate?: string;
      endDate?: string;
    },
    userId: string,
  ): Promise<ProjectResult>;

  /** Update an existing project. */
  updateProject(
    projectId: string,
    data: {
      name?: string;
      slug?: string;
      description?: string | null;
      priority?: string;
      visibility?: string;
      startDate?: string | null;
      endDate?: string | null;
    },
    userId: string,
  ): Promise<ProjectResult>;

  /** Soft-delete a project (sets deletedAt). */
  deleteProject(projectId: string, userId: string): Promise<void>;

  /** Restore a soft-deleted project. */
  restoreProject(projectId: string, userId: string): Promise<ProjectResult>;

  /** Archive a project (sets status to 'archived'). */
  archiveProject(projectId: string, userId: string): Promise<ProjectResult>;
}
