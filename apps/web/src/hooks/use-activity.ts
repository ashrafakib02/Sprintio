import { useQuery } from '@tanstack/react-query';
import { mockActivity } from '@/lib/mock-data';
import type { ActivityItem } from '@/types/dashboard';

export const ACTIVITY_QUERY_KEY = ['dashboard', 'activity'] as const;

/**
 * Fetches recent activity feed items.
 * Currently returns mock data — swap queryFn for real API call.
 */
export function useActivity(limit = 8) {
  return useQuery({
    queryKey: [...ACTIVITY_QUERY_KEY, limit],
    queryFn: async (): Promise<ActivityItem[]> => {
      // TODO: Replace with real API call
      // return api.get('/api/activity', { params: { limit } });
      return mockActivity.slice(0, limit);
    },
    staleTime: 30_000,
  });
}
