import { useQuery } from '@tanstack/react-query';
import { mockBoards } from '@/lib/mock-data';
import type { BoardHealthData } from '@/types/dashboard';

export const BOARDS_QUERY_KEY = ['dashboard', 'boards'] as const;

/**
 * Fetches boards with column distribution for BoardHealthGrid.
 * Currently returns mock data — swap queryFn for real API call.
 */
export function useBoards() {
  return useQuery({
    queryKey: BOARDS_QUERY_KEY,
    queryFn: async (): Promise<BoardHealthData[]> => {
      // TODO: Replace with real API call
      // return api.get('/api/boards');
      return mockBoards;
    },
    staleTime: 60_000,
  });
}
