import { useRouterState } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import {
  getStoredOrganizationId,
  setStoredOrganizationId,
  clearStoredOrganizationId,
} from '@/lib/organization-storage';
import { clearStoredWorkspaceId } from '@/lib/workspace-storage';
import { useOrganizations } from '@/hooks/use-organization';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setActiveOrganization } from '@/store/slices/activeOrganizationSlice';
import { queryKeys } from '@/lib/query-keys';

function extractOrganizationId(pathname: string): string | null {
  const match = pathname.match(/\/organization\/([^/]+)/);
  return match?.[1] ?? null;
}

/**
 * Manages the active organization for the current session.
 *
 * Resolution order:
 *  1. URL param (`/organization/:orgId/...`)
 *  2. localStorage
 *  3. First organization from the user's list
 *
 * Returns the resolved `activeOrganizationId` and a `setActiveOrganization`
 * setter that persists the selection, updates Redux state, and clears
 * downstream caches (workspaces, projects, tasks) scoped to the previous
 * organization.
 */
export function useActiveOrganization() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: organizations } = useOrganizations();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  const activeOrganizationId = useMemo(() => {
    const urlId = extractOrganizationId(pathname);
    if (urlId) return urlId;
    const storedId = getStoredOrganizationId();
    if (storedId) return storedId;
    if (organizations && organizations.length > 0) {
      return organizations[0].id;
    }
    return null;
  }, [pathname, organizations]);

  // Sync resolved org ID to Redux store
  const reduxOrgId = useAppSelector((s) => s.activeOrganization.organizationId);
  if (activeOrganizationId !== reduxOrgId) {
    dispatch(setActiveOrganization(activeOrganizationId));
  }

  const setActiveOrganizationCallback = useCallback(
    (organizationId: string | null) => {
      const previousId = activeOrganizationId;

      if (organizationId) {
        setStoredOrganizationId(organizationId);
      } else {
        clearStoredOrganizationId();
      }

      // When switching organization, cancel in-flight queries and
      // remove all downstream caches (workspace, project, task data)
      // so the UI starts fresh with the new org's data.
      if (previousId && previousId !== organizationId) {
        // Clear stored workspace — it belongs to the old org
        clearStoredWorkspaceId();

        // Cancel any in-flight requests to prevent stale data from arriving
        // after we've already cleared the caches.
        queryClient.cancelQueries({ queryKey: queryKeys.workspaces.all });

        // Remove workspace lists for both old and new org
        queryClient.removeQueries({ queryKey: queryKeys.workspaces.byOrganization(previousId) });
        if (organizationId) {
          queryClient.removeQueries({
            queryKey: queryKeys.workspaces.byOrganization(organizationId),
          });
        }

        // Remove all workspace contexts, project lists, and task caches
        queryClient.removeQueries({ queryKey: ['workspace'] });
        queryClient.removeQueries({ queryKey: ['projects'] });
        queryClient.removeQueries({ queryKey: ['tasks'] });
      }

      // Update Redux selection state
      dispatch(setActiveOrganization(organizationId));
    },
    [activeOrganizationId, queryClient, dispatch],
  );

  return { activeOrganizationId, setActiveOrganization: setActiveOrganizationCallback };
}
