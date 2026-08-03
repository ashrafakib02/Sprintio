import { useCallback, useEffect, useMemo } from 'react';
import {
  getStoredWorkspaceId,
  setStoredWorkspaceId,
  clearStoredWorkspaceId,
} from '@/lib/workspace-storage';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setActiveWorkspace } from '@/store/slices/activeWorkspaceSlice';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Manages the active workspace selection for the current session.
 *
 * Resolution order:
 *  1. localStorage
 *  2. First workspace from the provided list
 *
 * Returns the resolved `activeWorkspaceId` and a `setActiveWorkspace`
 * setter that persists the selection, updates Redux state, and clears
 * downstream caches (projects, tasks) scoped to the previous workspace.
 */
export function useActiveWorkspace(workspaces: { id: string }[] | undefined) {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  const activeWorkspaceId = useMemo(() => {
    const stored = getStoredWorkspaceId();
    if (stored && workspaces?.some((w) => w.id === stored)) return stored;
    if (workspaces && workspaces.length > 0) return workspaces[0].id;
    return null;
  }, [workspaces]);

  // Sync resolved workspace ID to Redux store
  const reduxWsId = useAppSelector((s) => s.activeWorkspace.workspaceId);
  if (activeWorkspaceId !== reduxWsId) {
    dispatch(setActiveWorkspace(activeWorkspaceId));
  }

  const setActiveWorkspaceCallback = useCallback(
    (workspaceId: string | null) => {
      const previousId = activeWorkspaceId;

      if (workspaceId) {
        setStoredWorkspaceId(workspaceId);
      } else {
        clearStoredWorkspaceId();
      }

      // When switching workspace, remove downstream caches (project, task data)
      // so the UI starts fresh with the new workspace's data.
      if (previousId && previousId !== workspaceId) {
        // Remove all project and task caches for the previous workspace
        queryClient.removeQueries({ queryKey: ['projects'] });
        queryClient.removeQueries({ queryKey: ['tasks'] });
      }

      // Update Redux selection state
      dispatch(setActiveWorkspace(workspaceId));
    },
    [activeWorkspaceId, queryClient, dispatch],
  );

  useEffect(() => {
    return () => {
      // Don't clear on unmount — workspace persists in localStorage
    };
  }, []);

  return {
    activeWorkspaceId,
    setActiveWorkspace: setActiveWorkspaceCallback,
    clearStoredWorkspaceId,
  };
}
