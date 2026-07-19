import { useQuery } from '@tanstack/react-query';
import { mockActiveSprint } from '@/lib/mock-data';
import type { SprintWithProgress } from '@/types/dashboard';

export const SPRINT_QUERY_KEY = ['dashboard', 'sprint', 'active'] as const;

/**
 * Fetches the active sprint for the dashboard.
 * Currently returns mock data — swap queryFn for real API call.
 */
export function useActiveSprint() {
  return useQuery({
    queryKey: SPRINT_QUERY_KEY,
    queryFn: async (): Promise<SprintWithProgress> => {
      // TODO: Replace with real API call
      // return api.get('/api/sprints/active');
      return mockActiveSprint;
    },
    staleTime: 60_000,
  });
}
