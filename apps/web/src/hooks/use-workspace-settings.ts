import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWorkspaceContext,
  updateWorkspaceSettings,
  listWorkspaceRoles,
  createWorkspaceRole,
  updateWorkspaceRoleApi,
  deleteWorkspaceRole,
  updateMemberRole,
  listPermissions,
  archiveWorkspace as archiveWorkspaceApi,
  restoreWorkspace as restoreWorkspaceApi,
  deleteWorkspacePermanently,
  type WorkspaceSettingsData,
  type WorkspaceRoleDefinition,
  type WorkspaceContextMember,
} from '@/lib/api';
import type { WorkspaceRole } from '@sprintio/shared';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';

// ── Query Key Factories (re-exported for backward compat) ───

export const WORKSPACE_CONTEXT_QUERY_KEY = queryKeys.workspaces.context;

export const WORKSPACE_ROLES_QUERY_KEY = (workspaceId: string) =>
  ['workspace', workspaceId, 'roles'] as const;

export const WORKSPACE_LIST_QUERY_KEY = queryKeys.workspaces.all;

export const PERMISSIONS_QUERY_KEY = ['workspace', 'permissions'] as const;

// ── Internal Types ──────────────────────────────────────────

interface WorkspaceContextResponse {
  workspace: WorkspaceSettingsData;
  userRole: WorkspaceRole;
  members: WorkspaceContextMember[];
}

interface RolesResponse {
  roles: WorkspaceRoleDefinition[];
}

// ── Workspace Context Hook ──────────────────────────────────

export function useWorkspaceContext(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.workspaces.context(workspaceId),
    queryFn: () => getWorkspaceContext(workspaceId),
    staleTime: 60_000,
    retry: false,
    select: (response) => ({
      workspace: response.data.workspace,
      userRole: response.data.userRole,
      members: response.data.members,
    }),
  });
}

// ── Update Workspace Settings Hook ──────────────────────────

export function useUpdateWorkspaceSettings(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name?: string;
      description?: string | null;
      logo?: string | null;
      brandColor?: string | null;
      customDomain?: string | null;
    }) => updateWorkspaceSettings(workspaceId, data),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.workspaces.context(workspaceId),
      });

      const previousData = queryClient.getQueryData<WorkspaceContextResponse>(
        queryKeys.workspaces.context(workspaceId),
      );

      queryClient.setQueryData<WorkspaceContextResponse>(
        queryKeys.workspaces.context(workspaceId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            workspace: {
              ...old.workspace,
              ...(variables.name !== undefined && { name: variables.name }),
              ...(variables.description !== undefined && { description: variables.description }),
              ...(variables.logo !== undefined && { logo: variables.logo }),
              ...(variables.brandColor !== undefined && { brandColor: variables.brandColor }),
              ...(variables.customDomain !== undefined && {
                customDomain: variables.customDomain,
              }),
            },
          };
        },
      );

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.workspaces.context(workspaceId), context.previousData);
      }
      toast.error('Failed to update settings', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.context(workspaceId),
      });
    },
    onSuccess: () => {
      toast.success('Workspace settings updated');
    },
  });
}

// ── Workspace Roles Hooks ───────────────────────────────────

export function useWorkspaceRoles(workspaceId: string) {
  return useQuery({
    queryKey: WORKSPACE_ROLES_QUERY_KEY(workspaceId),
    queryFn: () => listWorkspaceRoles(workspaceId),
    staleTime: 30_000,
  });
}

export function useCreateWorkspaceRole(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string; permissionIds?: string[] }) =>
      createWorkspaceRole(workspaceId, data),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: WORKSPACE_ROLES_QUERY_KEY(workspaceId),
      });

      const previousData = queryClient.getQueryData<RolesResponse>(
        WORKSPACE_ROLES_QUERY_KEY(workspaceId),
      );

      const temporaryRole: WorkspaceRoleDefinition = {
        id: `temp-${Date.now()}`,
        name: variables.name,
        description: variables.description ?? null,
        isSystem: false,
        permissions: variables.permissionIds ?? [],
      };

      queryClient.setQueryData<RolesResponse>(WORKSPACE_ROLES_QUERY_KEY(workspaceId), (old) => {
        if (!old) return old;
        return {
          ...old,
          roles: [...old.roles, temporaryRole],
        };
      });

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(WORKSPACE_ROLES_QUERY_KEY(workspaceId), context.previousData);
      }
      toast.error('Failed to create role', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: WORKSPACE_ROLES_QUERY_KEY(workspaceId),
      });
    },
    onSuccess: () => {
      toast.success('Role created');
    },
  });
}

export function useUpdateWorkspaceRole(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roleId,
      data,
    }: {
      roleId: string;
      data: { name?: string; description?: string | null; permissionIds?: string[] };
    }) => updateWorkspaceRoleApi(workspaceId, roleId, data),
    onMutate: async ({ roleId, data }) => {
      await queryClient.cancelQueries({
        queryKey: WORKSPACE_ROLES_QUERY_KEY(workspaceId),
      });

      const previousData = queryClient.getQueryData<RolesResponse>(
        WORKSPACE_ROLES_QUERY_KEY(workspaceId),
      );

      queryClient.setQueryData<RolesResponse>(WORKSPACE_ROLES_QUERY_KEY(workspaceId), (old) => {
        if (!old) return old;
        return {
          ...old,
          roles: old.roles.map((role) =>
            role.id === roleId
              ? {
                  ...role,
                  ...(data.name !== undefined && { name: data.name }),
                  ...(data.description !== undefined && { description: data.description }),
                  ...(data.permissionIds !== undefined && { permissions: data.permissionIds }),
                }
              : role,
          ),
        };
      });

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(WORKSPACE_ROLES_QUERY_KEY(workspaceId), context.previousData);
      }
      toast.error('Failed to update role', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: WORKSPACE_ROLES_QUERY_KEY(workspaceId),
      });
    },
    onSuccess: () => {
      toast.success('Role updated');
    },
  });
}

export function useDeleteWorkspaceRole(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleId: string) => deleteWorkspaceRole(workspaceId, roleId),
    onMutate: async (roleId) => {
      await queryClient.cancelQueries({
        queryKey: WORKSPACE_ROLES_QUERY_KEY(workspaceId),
      });

      const previousData = queryClient.getQueryData<RolesResponse>(
        WORKSPACE_ROLES_QUERY_KEY(workspaceId),
      );

      queryClient.setQueryData<RolesResponse>(WORKSPACE_ROLES_QUERY_KEY(workspaceId), (old) => {
        if (!old) return old;
        return {
          ...old,
          roles: old.roles.filter((role) => role.id !== roleId),
        };
      });

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(WORKSPACE_ROLES_QUERY_KEY(workspaceId), context.previousData);
      }
      toast.error('Failed to delete role', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: WORKSPACE_ROLES_QUERY_KEY(workspaceId),
      });
    },
    onSuccess: () => {
      toast.success('Role deleted');
    },
  });
}

// ── Permissions Hook ────────────────────────────────────────

export function usePermissions() {
  return useQuery({
    queryKey: PERMISSIONS_QUERY_KEY,
    queryFn: () => listPermissions(),
    staleTime: 300_000, // Permissions rarely change
  });
}

// ── Update Member Role Hook ─────────────────────────────────

export function useUpdateMemberRole(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) =>
      updateMemberRole(workspaceId, userId, role),
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.workspaces.context(workspaceId),
      });

      const previousData = queryClient.getQueryData<WorkspaceContextResponse>(
        queryKeys.workspaces.context(workspaceId),
      );

      queryClient.setQueryData<WorkspaceContextResponse>(
        queryKeys.workspaces.context(workspaceId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            members: old.members.map((member) =>
              member.userId === userId ? { ...member, role } : member,
            ),
          };
        },
      );

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.workspaces.context(workspaceId), context.previousData);
      }
      toast.error('Failed to update role', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.context(workspaceId),
      });
    },
    onSuccess: () => {
      toast.success('Member role updated');
    },
  });
}

// ── Workspace Archive / Restore Hooks ───────────────────────

export function useArchiveWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => archiveWorkspaceApi(workspaceId),
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.workspaces.context(workspaceId),
      });

      const previousData = queryClient.getQueryData<WorkspaceContextResponse>(
        queryKeys.workspaces.context(workspaceId),
      );

      queryClient.setQueryData<WorkspaceContextResponse>(
        queryKeys.workspaces.context(workspaceId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            workspace: {
              ...old.workspace,
              archivedAt: new Date().toISOString(),
            },
          };
        },
      );

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.workspaces.context(workspaceId), context.previousData);
      }
      toast.error('Failed to archive workspace', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.context(workspaceId),
      });
    },
    onSuccess: () => {
      toast.success('Workspace archived');
    },
  });
}

export function useRestoreWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => restoreWorkspaceApi(workspaceId),
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.workspaces.context(workspaceId),
      });

      const previousData = queryClient.getQueryData<WorkspaceContextResponse>(
        queryKeys.workspaces.context(workspaceId),
      );

      queryClient.setQueryData<WorkspaceContextResponse>(
        queryKeys.workspaces.context(workspaceId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            workspace: {
              ...old.workspace,
              archivedAt: null,
            },
          };
        },
      );

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.workspaces.context(workspaceId), context.previousData);
      }
      toast.error('Failed to restore workspace', { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.context(workspaceId),
      });
    },
    onSuccess: () => {
      toast.success('Workspace restored');
    },
  });
}

// ── Delete Workspace Hook ───────────────────────────────────

export function useDeleteWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteWorkspacePermanently(workspaceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.context(workspaceId),
      });
      toast.success('Workspace permanently deleted');
      // Navigate away after deletion
      window.location.href = '/';
    },
    onError: (error: Error) => {
      toast.error('Failed to delete workspace', { description: error.message });
    },
  });
}
