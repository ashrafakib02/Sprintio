import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProject,
  listProjects,
  createProject as createProjectApi,
  updateProject as updateProjectApi,
  archiveProject as archiveProjectApi,
  restoreProject as restoreProjectApi,
  deleteProject as deleteProjectApi,
  listProjectMembers,
  addProjectMember as addProjectMemberApi,
  removeProjectMember as removeProjectMemberApi,
  updateProjectMemberRole as updateProjectMemberRoleApi,
  type ProjectData,
  type ProjectWithStats,
  type ProjectMember,
  type ProjectListParams,
} from '@/lib/project-api';
import type {
  ProjectRole,
  ProjectStatus,
  ProjectPriority,
  ProjectVisibility,
} from '@sprintio/shared';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';

// ── Query Key Factories (re-exported for backward compat) ────

export const PROJECTS_LIST_QUERY_KEY = queryKeys.projects.all;
export const PROJECT_DETAIL_QUERY_KEY = queryKeys.projects.detail;
export const PROJECT_MEMBERS_QUERY_KEY = queryKeys.projects.members;

// ── Internal Types ────────────────────────────────────────────

interface ProjectDetailResponse {
  project: ProjectWithStats;
}

interface ProjectListResponse {
  projects: ProjectData[];
}

interface ProjectMembersResponse {
  members: ProjectMember[];
}

// ── Project List Hook ────────────────────────────────────────

export function useProjectList(workspaceId: string, params?: ProjectListParams) {
  return useQuery({
    queryKey: workspaceId
      ? queryKeys.projects.list(workspaceId, params as unknown as Record<string, unknown>)
      : ['projects', 'none'],
    queryFn: () => listProjects(workspaceId, params),
    enabled: !!workspaceId,
    staleTime: 30_000,
    select: (response) => response.data,
  });
}

// ── Project Detail Hook ──────────────────────────────────────

export function useProjectDetail(projectId: string | null) {
  return useQuery({
    queryKey: projectId ? queryKeys.projects.detail(projectId) : ['project', 'none'],
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
    staleTime: 30_000,
    select: (response) => response.data.project,
  });
}

// ── Create Project Hook ──────────────────────────────────────

export function useCreateProject(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      slug?: string;
      description?: string;
      priority?: ProjectPriority;
      visibility?: ProjectVisibility;
      startDate?: string;
      endDate?: string;
    }) => createProjectApi(workspaceId, data),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.all(workspaceId),
      });

      const previousData = queryClient.getQueryData<ProjectListResponse>(
        queryKeys.projects.all(workspaceId),
      );

      const temporaryProject: ProjectData = {
        id: `temp-${Date.now()}`,
        name: variables.name,
        slug: variables.slug || variables.name.toLowerCase().replace(/\s+/g, '-'),
        description: variables.description ?? null,
        workspaceId,
        status: 'active',
        priority: variables.priority || 'none',
        visibility: variables.visibility || 'workspace',
        startDate: variables.startDate ?? null,
        endDate: variables.endDate ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<ProjectListResponse>(queryKeys.projects.all(workspaceId), (old) => {
        if (!old) return old;
        return {
          ...old,
          projects: [...old.projects, temporaryProject],
        };
      });

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.projects.all(workspaceId), context.previousData);
      }
      toast.error('Failed to create project', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.all(workspaceId),
      });
    },
    onSuccess: () => {
      toast.success('Project created');
    },
  });
}

// ── Update Project Hook ──────────────────────────────────────

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name?: string;
      slug?: string;
      description?: string | null;
      status?: ProjectStatus;
      priority?: ProjectPriority;
      visibility?: ProjectVisibility;
      startDate?: string | null;
      endDate?: string | null;
    }) => updateProjectApi(projectId, data),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });

      const previousData = queryClient.getQueryData<ProjectDetailResponse>(
        queryKeys.projects.detail(projectId),
      );

      queryClient.setQueryData<ProjectDetailResponse>(
        queryKeys.projects.detail(projectId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            project: {
              ...old.project,
              ...(variables.name !== undefined && { name: variables.name }),
              ...(variables.slug !== undefined && { slug: variables.slug }),
              ...(variables.description !== undefined && { description: variables.description }),
              ...(variables.status !== undefined && { status: variables.status }),
              ...(variables.priority !== undefined && { priority: variables.priority }),
              ...(variables.visibility !== undefined && { visibility: variables.visibility }),
              ...(variables.startDate !== undefined && { startDate: variables.startDate }),
              ...(variables.endDate !== undefined && { endDate: variables.endDate }),
            },
          };
        },
      );

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.projects.detail(projectId), context.previousData);
      }
      toast.error('Failed to update project', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
    },
    onSuccess: () => {
      toast.success('Project updated');
    },
  });
}

// ── Archive Project Hook ─────────────────────────────────────

export function useArchiveProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => archiveProjectApi(projectId),
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });

      const previousData = queryClient.getQueryData<ProjectDetailResponse>(
        queryKeys.projects.detail(projectId),
      );

      queryClient.setQueryData<ProjectDetailResponse>(
        queryKeys.projects.detail(projectId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            project: {
              ...old.project,
              status: 'archived',
            },
          };
        },
      );

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.projects.detail(projectId), context.previousData);
      }
      toast.error('Failed to archive project', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
    },
    onSuccess: () => {
      toast.success('Project archived');
    },
  });
}

// ── Restore Project Hook ─────────────────────────────────────

export function useRestoreProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => restoreProjectApi(projectId),
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });

      const previousData = queryClient.getQueryData<ProjectDetailResponse>(
        queryKeys.projects.detail(projectId),
      );

      queryClient.setQueryData<ProjectDetailResponse>(
        queryKeys.projects.detail(projectId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            project: {
              ...old.project,
              status: 'active',
            },
          };
        },
      );

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.projects.detail(projectId), context.previousData);
      }
      toast.error('Failed to restore project', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
    },
    onSuccess: () => {
      toast.success('Project restored');
    },
  });
}

// ── Delete Project Hook ──────────────────────────────────────

export function useDeleteProject(projectId: string, workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteProjectApi(projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projects.all(workspaceId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(projectId),
      });
      toast.success('Project deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete project', { description: error.message });
    },
  });
}

// ── Project Members Hooks ─────────────────────────────────────

export function useProjectMembers(projectId: string | null) {
  return useQuery({
    queryKey: projectId ? queryKeys.projects.members(projectId) : ['project-members', 'none'],
    queryFn: () => listProjectMembers(projectId!),
    enabled: !!projectId,
    staleTime: 30_000,
    select: (response) => response.data.members,
  });
}

export function useAddProjectMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ProjectRole }) =>
      addProjectMemberApi(projectId, { userId, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.members(projectId),
      });
      toast.success('Member added to project');
    },
    onError: (error: Error) => {
      toast.error('Failed to add member', { description: error.message });
    },
  });
}

export function useRemoveProjectMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => removeProjectMemberApi(projectId, userId),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.members(projectId),
      });

      const previousData = queryClient.getQueryData<ProjectMembersResponse>(
        queryKeys.projects.members(projectId),
      );

      queryClient.setQueryData<ProjectMembersResponse>(
        queryKeys.projects.members(projectId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            members: old.members.filter((m) => m.userId !== userId),
          };
        },
      );

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.projects.members(projectId), context.previousData);
      }
      toast.error('Failed to remove member', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.members(projectId),
      });
    },
    onSuccess: () => {
      toast.success('Member removed from project');
    },
  });
}

export function useUpdateProjectMemberRole(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ProjectRole }) =>
      updateProjectMemberRoleApi(projectId, userId, role),
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.projects.members(projectId),
      });

      const previousData = queryClient.getQueryData<ProjectMembersResponse>(
        queryKeys.projects.members(projectId),
      );

      queryClient.setQueryData<ProjectMembersResponse>(
        queryKeys.projects.members(projectId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            members: old.members.map((m) => (m.userId === userId ? { ...m, role } : m)),
          };
        },
      );

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.projects.members(projectId), context.previousData);
      }
      toast.error('Failed to update member role', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.members(projectId),
      });
    },
    onSuccess: () => {
      toast.success('Member role updated');
    },
  });
}
