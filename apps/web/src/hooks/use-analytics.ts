import { useQuery } from '@tanstack/react-query';
import { mockBurndownData, mockVelocityData, mockTeamWorkload } from '@/lib/mock-data';
import type { BurndownPoint, VelocityPoint, MemberWorkload } from '@/types/dashboard';

export const BURNDOWN_QUERY_KEY = ['dashboard', 'analytics', 'burndown'] as const;
export const VELOCITY_QUERY_KEY = ['dashboard', 'analytics', 'velocity'] as const;
export const TEAM_WORKLOAD_QUERY_KEY = ['dashboard', 'analytics', 'team-workload'] as const;

/**
 * Fetches burndown chart data for the active sprint.
 * Currently returns mock data — swap queryFn for real API call.
 */
export function useBurndownData() {
  return useQuery({
    queryKey: BURNDOWN_QUERY_KEY,
    queryFn: async (): Promise<BurndownPoint[]> => {
      // TODO: Replace with real API call
      // return api.get('/api/analytics/burndown');
      return mockBurndownData;
    },
    staleTime: 60_000,
  });
}

/**
 * Fetches velocity trend data across recent sprints.
 * Currently returns mock data — swap queryFn for real API call.
 */
export function useVelocityData() {
  return useQuery({
    queryKey: VELOCITY_QUERY_KEY,
    queryFn: async (): Promise<VelocityPoint[]> => {
      // TODO: Replace with real API call
      // return api.get('/api/analytics/velocity');
      return mockVelocityData;
    },
    staleTime: 120_000,
  });
}

/**
 * Fetches team workload data (admin/owner only).
 * Currently returns mock data — swap queryFn for real API call.
 */
export function useTeamWorkload() {
  return useQuery({
    queryKey: TEAM_WORKLOAD_QUERY_KEY,
    queryFn: async (): Promise<MemberWorkload[]> => {
      // TODO: Replace with real API call
      // return api.get('/api/analytics/team-workload');
      return mockTeamWorkload;
    },
    staleTime: 60_000,
  });
}
