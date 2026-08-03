import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTask } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';
import type { TaskPriority } from '@sprintio/shared';

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      title,
      description,
      priority,
    }: {
      projectId: string;
      title: string;
      description?: string | null;
      priority?: TaskPriority;
    }) => createTask(projectId, { title, description, priority }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(variables.projectId) });
      toast.success('Task created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create task', { description: error.message });
    },
  });
}
