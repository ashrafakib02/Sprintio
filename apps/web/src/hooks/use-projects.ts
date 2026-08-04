import { useQuery } from '@tanstack/react-query';
import { listProjects } from '@/lib/project-api';
import { useAppSelector } from '@/store/hooks';
import { queryKeys } from '@/lib/query-keys';

/**
 * Fetches all projects for the currently active workspace.
 * Uses the centralized query key factory for cache consistency.
 */
export function useProjects() {
  const workspaceId = useAppSelector((s) => s.activeWorkspace.workspaceId);

  return useQuery({
    queryKey: workspaceId ? queryKeys.projects.all(workspaceId) : ['projects', 'none'],
    queryFn: () => listProjects(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 30_000,
    select: (response) => response.data.data,
  });
}
