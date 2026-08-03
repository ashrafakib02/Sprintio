import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setActiveProject } from '@/store/slices/activeProjectSlice';
import { queryKeys } from '@/lib/query-keys';

const STORAGE_KEY = 'sprintio:activeProjectId';

function getStoredProjectId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredProjectId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // silent
  }
}

function clearStoredProjectId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent
  }
}

/**
 * Manages the active project selection for the current workspace.
 *
 * Resolution order:
 *  1. localStorage
 *  2. First project from the list
 *
 * When the active project changes, task queries for the previous project
 * are removed from the cache and task queries for the new project are
 * invalidated so fresh data is fetched.
 */
export function useActiveProject(projects: { id: string }[] | undefined) {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  const activeProjectId = useMemo(() => {
    const stored = getStoredProjectId();
    if (stored && projects?.some((p) => p.id === stored)) return stored;
    if (projects && projects.length > 0) return projects[0].id;
    return null;
  }, [projects]);

  // Sync resolved project ID to Redux store
  const reduxProjId = useAppSelector((s) => s.activeProject.projectId);
  if (activeProjectId !== reduxProjId) {
    dispatch(setActiveProject(activeProjectId));
  }

  const setActiveProjectCallback = useCallback(
    (projectId: string | null) => {
      const previousId = activeProjectId;

      if (projectId) {
        setStoredProjectId(projectId);
      } else {
        clearStoredProjectId();
      }

      // Only clear task queries when project changes (not project list)
      if (previousId && previousId !== projectId) {
        queryClient.removeQueries({ queryKey: queryKeys.tasks.byProject(previousId) });
        // Refresh tasks for new project
        if (projectId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) });
        }
      }

      // Update Redux selection state
      dispatch(setActiveProject(projectId));
    },
    [activeProjectId, queryClient, dispatch],
  );

  useEffect(() => {
    return () => {
      // Don't clear on unmount — project persists in localStorage
    };
  }, []);

  return { activeProjectId, setActiveProject: setActiveProjectCallback, clearStoredProjectId };
}
