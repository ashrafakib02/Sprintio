import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { mockTasks } from '@/lib/mock-data';
import type { TaskWithAssignee, DashboardFilters } from '@/types/dashboard';
const EMPTY_ARRAY: never[] = Object.freeze([]) as never[];

export const TASKS_QUERY_KEY = ['dashboard', 'tasks'] as const;

/**
 * Fetches tasks for the dashboard.
 * Currently returns mock data — swap queryFn for real API call.
 */
export function useTasks(filters?: Partial<DashboardFilters>) {
  const query = useQuery({
    queryKey: [...TASKS_QUERY_KEY, filters],
    queryFn: async (): Promise<TaskWithAssignee[]> => {
      // TODO: Replace with real API call
      // return api.get('/api/tasks/my', { params: filters });
      return mockTasks;
    },
    staleTime: 30_000,
  });

  const filteredTasks = useMemo(() => {
    if (!query.data) return EMPTY_ARRAY;
    let tasks = query.data;

    if (filters?.priority && filters.priority.length > 0) {
      tasks = tasks.filter((t) => filters.priority!.includes(t.priority));
    }
    if (filters?.status && filters.status.length > 0) {
      tasks = tasks.filter((t) => filters.status!.includes(t.status));
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      tasks = tasks.filter((t) => t.title.toLowerCase().includes(q));
    }
    if (filters?.assigneeId) {
      tasks = tasks.filter((t) => t.assigneeId === filters.assigneeId);
    }

    return tasks;
  }, [query.data, filters]);

  const taskSummary = useMemo(() => {
    if (!query.data) return { assigned: 0, dueToday: 0, dueThisWeek: 0, overdue: 0 };
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    let dueToday = 0;
    let dueThisWeek = 0;
    let overdue = 0;

    for (const task of query.data) {
      if (!task.dueDate) continue;
      const due = new Date(task.dueDate);
      if (due < today) {
        overdue++;
      } else if (due < weekEnd) {
        dueThisWeek++;
      }
      if (due >= today && due < new Date(today.getTime() + 86400000)) {
        dueToday++;
      }
    }

    return {
      assigned: query.data.length,
      dueToday,
      dueThisWeek,
      overdue,
    };
  }, [query.data]);

  return {
    ...query,
    tasks: query.data ?? EMPTY_ARRAY,
    filteredTasks,
    taskSummary,
  };
}
