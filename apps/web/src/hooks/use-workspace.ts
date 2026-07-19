import { useQuery } from '@tanstack/react-query';
import { mockWorkspace } from '@/lib/mock-data';
import type { WorkspaceData } from '@/types/dashboard';

export const WORKSPACE_QUERY_KEY = ['dashboard', 'workspace'] as const;

/**
 * Fetches current workspace info including plan and usage.
 * Currently returns mock data — swap queryFn for real API call.
 */
export function useWorkspace() {
  return useQuery({
    queryKey: WORKSPACE_QUERY_KEY,
    queryFn: async (): Promise<WorkspaceData> => {
      // TODO: Replace with real API call
      // return api.get('/api/workspaces/current');
      return mockWorkspace;
    },
    staleTime: 120_000,
  });
}
