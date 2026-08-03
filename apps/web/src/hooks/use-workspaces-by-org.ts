import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listWorkspacesByOrganization, createWorkspace } from '@/lib/api';
import { useAppSelector } from '@/store/hooks';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';

// ── Query Key Factories (re-exported for backward compat) ───

export const WORKSPACES_BY_ORG_QUERY_KEY = queryKeys.workspaces.byOrganization;

// ── List Workspaces (org-scoped) ────────────────────────────

/**
 * Fetch all workspaces belonging to the currently active organization.
 * Uses the Redux state for the active organization ID.
 * Only runs when an organization ID is available.
 */
export function useWorkspacesByOrganization(organizationId?: string | null) {
  // Allow explicit override, fall back to Redux state
  const reduxOrgId = useAppSelector((s) => s.activeOrganization.organizationId);
  const orgId = organizationId ?? reduxOrgId;

  return useQuery({
    queryKey: queryKeys.workspaces.byOrganization(orgId ?? ''),
    queryFn: () => listWorkspacesByOrganization(orgId!),
    enabled: !!orgId,
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
