import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTask } from '@/lib/api';
import { TASKS_QUERY_KEY } from './use-tasks';
import { toast } from 'sonner';
import type { TaskPriority } from '@sprintio/shared';

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { title: string; description?: string | null; priority?: TaskPriority }) =>
      createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      toast.success('Task created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create task', { description: error.message });
    },
  });
}
