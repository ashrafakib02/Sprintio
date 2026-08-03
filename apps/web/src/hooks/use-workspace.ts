import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listWorkspaces, listWorkspacesByOrganization, createWorkspace } from '@/lib/api';
import { useActiveOrganization } from '@/hooks/use-active-organization';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';

// ── Query Key Factories (re-exported for backward compat) ───

export const WORKSPACE_LIST_QUERY_KEY = queryKeys.workspaces.all;
export const WORKSPACE_DETAIL_QUERY_KEY = queryKeys.workspaces.detail;

// ── List Workspaces ─────────────────────────────────────────

export function useListWorkspaces(includeArchived = false) {
  const { activeOrganizationId } = useActiveOrganization();
  return useQuery({
    queryKey: [
      ...queryKeys.workspaces.all,
      { organizationId: activeOrganizationId, includeArchived },
    ],
    queryFn: () => {
      if (activeOrganizationId) {
        return listWorkspacesByOrganization(activeOrganizationId, includeArchived);
      }
      return listWorkspaces(includeArchived);
    },
    enabled: !!activeOrganizationId,
    staleTime: 30_000,
    select: (response) => response.data.workspaces,
  });
}

/**
 * Get the current user's first (default) workspace.
 * Used by the dashboard which doesn't have a workspaceId in the route.
 */
export function useWorkspace() {
  const { activeOrganizationId } = useActiveOrganization();
  return useQuery({
    queryKey: [...queryKeys.workspaces.all, { organizationId: activeOrganizationId }],
    queryFn: () => {
      if (activeOrganizationId) {
        return listWorkspacesByOrganization(activeOrganizationId);
      }
      return listWorkspaces();
    },
    enabled: true,
    staleTime: 60_000,
    select: (response) => response.data.workspaces[0] ?? null,
  });
}

// ── Get Single Workspace ────────────────────────────────────

export function useWorkspaceById(workspaceId: string) {
  const { activeOrganizationId } = useActiveOrganization();
  return useQuery({
    queryKey: queryKeys.workspaces.detail(workspaceId),
    queryFn: () => {
      const fetcher = activeOrganizationId
        ? listWorkspacesByOrganization(activeOrganizationId)
        : listWorkspaces();
      return fetcher.then((res) => {
        const ws = res.data.workspaces.find((w) => w.id === workspaceId);
        if (!ws) throw new Error('Workspace not found');
        return ws;
      });
    },
    staleTime: 60_000,
  });
}

// ── Create Workspace ────────────────────────────────────────

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string; organizationId?: string }) =>
      createWorkspace(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
      toast.success('Workspace created', {
        description: `${response.data.workspace.name} is ready to use`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create workspace', { description: error.message });
    },
  });
}
