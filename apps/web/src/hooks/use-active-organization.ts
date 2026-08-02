import { useRouterState } from '@tanstack/react-router';
import { useMemo } from 'react';
import { getStoredOrganizationId } from '@/lib/organization-storage';
import { useOrganizations } from '@/hooks/use-organization';

function extractOrganizationId(pathname: string): string | null {
  const match = pathname.match(/\/organization\/([^/]+)/);
  return match?.[1] ?? null;
}

export function useActiveOrganization() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: organizations } = useOrganizations();

  return useMemo(() => {
    const urlId = extractOrganizationId(pathname);
    if (urlId) return urlId;
    const storedId = getStoredOrganizationId();
    if (storedId) return storedId;
    if (organizations && organizations.length > 0) {
      return organizations[0].id;
    }
    return null;
  }, [pathname, organizations]);
}
