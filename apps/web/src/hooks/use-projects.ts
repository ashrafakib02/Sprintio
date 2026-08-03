import { useQuery } from '@tanstack/react-query';
import { listProjects } from '@/lib/api';
import { useWorkspace } from '@/hooks/use-workspace';
import { queryKeys } from '@/lib/query-keys';

export function useProjects() {
  const { data: workspace } = useWorkspace();
  const workspaceId = workspace?.id;

  return useQuery({
    queryKey: workspaceId ? queryKeys.projects.all(workspaceId) : ['projects', 'none'],
    queryFn: () => listProjects(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 30_000,
    select: (response) => response.data.projects,
  });
}
