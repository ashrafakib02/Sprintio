import { useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
const EMPTY_ARRAY: never[] = Object.freeze([]) as never[];
import { useTasks } from './use-tasks';
import { useActiveSprint } from './use-sprints';
import { useBoards } from './use-boards';
import { useActivity } from './use-activity';
import { useWorkspace } from './use-workspace';
import { useBurndownData, useVelocityData, useTeamWorkload } from './use-analytics';
import {
  togglePriorityFilter,
  toggleStatusFilter,
  setSearchFilter,
  setAssigneeFilter,
  clearFilters,
  selectTask,
  toggleSectionVisibility,
  toggleCollapsedSection,
  setLayout,
  toggleSidebar,
} from '@/store/slices/dashboardSlice';

/**
 * Single entry point for the dashboard page.
 * Combines Redux UI state with TanStack Query data.
 */
export function useDashboardState() {
  const dispatch = useAppDispatch();

  // ─── Redux State ─────────────────────────────────────────────────────
  const filters = useAppSelector((s) => s.dashboard.filters);
  const viewPreferences = useAppSelector((s) => s.dashboard.viewPreferences);
  const selectedTaskId = useAppSelector((s) => s.dashboard.selectedTaskId);
  const sidebarCollapsed = useAppSelector((s) => s.dashboard.sidebarCollapsed);

  // ─── TanStack Query Hooks ────────────────────────────────────────────
  const tasksQuery = useTasks(filters);
  const sprintQuery = useActiveSprint();
  const boardsQuery = useBoards();
  const activityQuery = useActivity();
  const workspaceQuery = useWorkspace();
  const burndownQuery = useBurndownData();
  const velocityQuery = useVelocityData();
  const teamWorkloadQuery = useTeamWorkload();

  // ─── Derived State ───────────────────────────────────────────────────
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasksQuery.tasks.find((t) => t.id === selectedTaskId) ?? null;
  }, [selectedTaskId, tasksQuery.tasks]);

  // ─── Actions ─────────────────────────────────────────────────────────
  const actions = useMemo(
    () => ({
      // Filters
      togglePriority: (p: Parameters<typeof togglePriorityFilter>[0]) =>
        dispatch(togglePriorityFilter(p)),
      toggleStatus: (s: Parameters<typeof toggleStatusFilter>[0]) =>
        dispatch(toggleStatusFilter(s)),
      setSearch: (q: string) => dispatch(setSearchFilter(q)),
      setAssignee: (id: string | null) => dispatch(setAssigneeFilter(id)),
      resetFilters: () => dispatch(clearFilters()),

      // View
      toggleSection: (key: Parameters<typeof toggleSectionVisibility>[0]) =>
        dispatch(toggleSectionVisibility(key)),
      toggleCollapse: (id: string) => dispatch(toggleCollapsedSection(id)),
      setLayout: (l: 'grid' | 'list') => dispatch(setLayout(l)),

      // Selection
      selectTask: (id: string | null) => dispatch(selectTask(id)),

      // Sidebar
      toggleSidebar: () => dispatch(toggleSidebar()),
    }),
    [dispatch],
  );

  return {
    // Data
    tasks: tasksQuery.filteredTasks,
    allTasks: tasksQuery.tasks,
    taskSummary: tasksQuery.taskSummary,
    sprint: sprintQuery.data ?? null,
    boards: boardsQuery.data ?? EMPTY_ARRAY,
    activity: activityQuery.data ?? EMPTY_ARRAY,
    workspace: workspaceQuery.data ?? null,
    burndown: burndownQuery.data ?? EMPTY_ARRAY,
    velocity: velocityQuery.data ?? EMPTY_ARRAY,
    teamWorkload: teamWorkloadQuery.data ?? EMPTY_ARRAY,

    // Loading
    isLoading: {
      tasks: tasksQuery.isLoading,
      sprint: sprintQuery.isLoading,
      boards: boardsQuery.isLoading,
      activity: activityQuery.isLoading,
      workspace: workspaceQuery.isLoading,
      analytics: burndownQuery.isLoading || velocityQuery.isLoading || teamWorkloadQuery.isLoading,
    },

    // UI State (from Redux)
    filters,
    viewPreferences,
    selectedTask,
    selectedTaskId,
    sidebarCollapsed,

    // Actions
    actions,
  };
}
