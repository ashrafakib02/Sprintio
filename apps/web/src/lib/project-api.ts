import type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  ProjectStatus,
  ProjectPriority,
  ProjectVisibility,
  ProjectRole,
} from '@sprintio/shared';

const API_BASE = '/api';

export interface ApiError {
  error: string;
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
    ...options,
  });

  const contentType = res.headers.get('content-type') || '';
  let body: unknown;

  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    const text = await res.text();
    const err = new Error(text || `Request failed (${res.status})`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status = res.status;
    throw err;
  }

  if (!res.ok) {
    const error = body as ApiError;
    const err = new Error(error.error || 'Request failed');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status = res.status;
    throw err;
  }

  return body as ApiResponse<T>;
}

// ── Project Types ─────────────────────────────────────────────

export interface ProjectData {
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
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithStats extends ProjectData {
  taskCount: number;
  memberCount: number;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: string;
}

// ── Project List ───────────────────────────────────────────────

export interface ProjectListParams extends PaginationParams {
  status?: ProjectStatus;
  priority?: ProjectPriority;
  visibility?: ProjectVisibility;
  search?: string;
}

export async function listProjects(
  workspaceId: string,
  params?: ProjectListParams,
): Promise<ApiResponse<PaginatedResponse<ProjectData>>> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.priority) searchParams.set('priority', params.priority);
  if (params?.visibility) searchParams.set('visibility', params.visibility);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const qs = searchParams.toString();
  return apiRequest<PaginatedResponse<ProjectData>>(
    `/workspaces/${workspaceId}/projects${qs ? `?${qs}` : ''}`,
  );
}

// ── Project Detail ─────────────────────────────────────────────

export async function getProject(
  projectId: string,
): Promise<ApiResponse<{ project: ProjectWithStats }>> {
  return apiRequest<{ project: ProjectWithStats }>(`/projects/${projectId}`);
}

// ── Create Project ─────────────────────────────────────────────

export async function createProject(
  workspaceId: string,
  data: {
    name: string;
    slug?: string;
    description?: string;
    priority?: ProjectPriority;
    visibility?: ProjectVisibility;
    startDate?: string;
    endDate?: string;
  },
): Promise<ApiResponse<{ project: ProjectData }>> {
  return apiRequest<{ project: ProjectData }>(`/workspaces/${workspaceId}/projects`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Update Project ─────────────────────────────────────────────

export async function updateProject(
  projectId: string,
  data: {
    name?: string;
    slug?: string;
    description?: string | null;
    status?: ProjectStatus;
    priority?: ProjectPriority;
    visibility?: ProjectVisibility;
    startDate?: string | null;
    endDate?: string | null;
  },
): Promise<ApiResponse<{ project: ProjectData }>> {
  return apiRequest<{ project: ProjectData }>(`/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ── Delete Project ─────────────────────────────────────────────

export async function deleteProject(
  projectId: string,
): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/projects/${projectId}`, {
    method: 'DELETE',
  });
}

// ── Archive / Restore Project ──────────────────────────────────

export async function archiveProject(
  projectId: string,
): Promise<ApiResponse<{ project: ProjectData }>> {
  return apiRequest<{ project: ProjectData }>(`/projects/${projectId}/archive`, {
    method: 'POST',
  });
}

export async function restoreProject(
  projectId: string,
): Promise<ApiResponse<{ project: ProjectData }>> {
  return apiRequest<{ project: ProjectData }>(`/projects/${projectId}/restore`, {
    method: 'POST',
  });
}

// ── Project Members ────────────────────────────────────────────

export async function listProjectMembers(
  projectId: string,
): Promise<ApiResponse<{ members: ProjectMember[] }>> {
  return apiRequest<{ members: ProjectMember[] }>(`/projects/${projectId}/members`);
}

export async function addProjectMember(
  projectId: string,
  data: { userId: string; role: ProjectRole },
): Promise<ApiResponse<{ member: ProjectMember }>> {
  return apiRequest<{ member: ProjectMember }>(`/projects/${projectId}/members`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function removeProjectMember(
  projectId: string,
  userId: string,
): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/projects/${projectId}/members/${userId}`, {
    method: 'DELETE',
  });
}

export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: ProjectRole,
): Promise<ApiResponse<{ member: ProjectMember }>> {
  return apiRequest<{ member: ProjectMember }>(`/projects/${projectId}/members/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}
