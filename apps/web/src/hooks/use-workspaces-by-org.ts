import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listWorkspacesByOrganization, createWorkspace } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';

// ── Query Key Factories (re-exported for backward compat) ───

export const WORKSPACES_BY_ORG_QUERY_KEY = queryKeys.workspaces.byOrganization;

// ── List Workspaces (org-scoped) ────────────────────────────

/**
 * Fetch all workspaces belonging to a specific organization.
 * Only runs when `organizationId` is provided.
 */
export function useWorkspacesByOrganization(organizationId: string | null) {
  return useQuery({
    queryKey: queryKeys.workspaces.byOrganization(organizationId ?? ''),
    queryFn: () => listWorkspacesByOrganization(organizationId!),
    enabled: !!organizationId,
    staleTime: 30_000,
    select: (response) => response.data.workspaces,
  });
}

// ── Create Workspace (org-scoped) ───────────────────────────

/**
 * Create a new workspace within an organization.
 * Invalidates both the org-scoped workspace list and the organization context.
 */
export function useCreateWorkspaceForOrganization(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      createWorkspace({ ...data, organizationId }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.byOrganization(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.all,
      });
      toast.success('Workspace created', {
        description: `${response.data.workspace.name} is ready to use`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create workspace', { description: error.message });
    },
  });
}
