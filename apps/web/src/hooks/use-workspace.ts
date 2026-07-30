import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listWorkspaces, createWorkspace } from '@/lib/api';
import { toast } from 'sonner';

// ── Query Key Factories ─────────────────────────────────────

export const WORKSPACE_LIST_QUERY_KEY = ['workspaces'] as const;
export const WORKSPACE_DETAIL_QUERY_KEY = (workspaceId: string) =>
  ['workspace', workspaceId] as const;

// ── List Workspaces ─────────────────────────────────────────

export function useListWorkspaces(includeArchived = false) {
  return useQuery({
    queryKey: [...WORKSPACE_LIST_QUERY_KEY, { includeArchived }],
    queryFn: () => listWorkspaces(includeArchived),
    staleTime: 30_000,
    select: (response) => response.data.workspaces,
  });
}

/**
 * Get the current user's first (default) workspace.
 * Used by the dashboard which doesn't have a workspaceId in the route.
 */
export function useWorkspace() {
  return useQuery({
    queryKey: WORKSPACE_LIST_QUERY_KEY,
    queryFn: () => listWorkspaces(),
    staleTime: 60_000,
    select: (response) => response.data.workspaces[0] ?? null,
  });
}

// ── Get Single Workspace ────────────────────────────────────

export function useWorkspaceById(workspaceId: string) {
  return useQuery({
    queryKey: WORKSPACE_DETAIL_QUERY_KEY(workspaceId),
    queryFn: () => listWorkspaces().then((res) => {
      const ws = res.data.workspaces.find((w) => w.id === workspaceId);
      if (!ws) throw new Error('Workspace not found');
      return ws;
    }),
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
      queryClient.invalidateQueries({ queryKey: WORKSPACE_LIST_QUERY_KEY });
      toast.success('Workspace created', {
        description: `${response.data.workspace.name} is ready to use`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create workspace', { description: error.message });
    },
  });
}
