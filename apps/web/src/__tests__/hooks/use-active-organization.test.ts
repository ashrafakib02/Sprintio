import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { setStoredOrganizationId } from '@/lib/organization-storage';

// Mocks must be at the top, BEFORE imports
vi.mock('@tanstack/react-router', () => ({
  useRouterState: vi.fn(),
}));

vi.mock('@/hooks/use-organization', () => ({
  useOrganizations: vi.fn(),
}));

import { useRouterState } from '@tanstack/react-router';
import { useOrganizations } from '@/hooks/use-organization';
import { useActiveOrganization } from '@/hooks/use-active-organization';

const mockUseRouterState = vi.mocked(useRouterState);
const mockUseOrganizations = vi.mocked(useOrganizations);

function setupMocks(
  pathname: string,
  organizations: Array<{ id: string; name: string }> = [],
) {
  mockUseRouterState.mockImplementation(({ select }: { select?: (v: unknown) => unknown }) =>
    select ? select({ location: { pathname } }) : pathname,
  );
  mockUseOrganizations.mockReturnValue({
    data: organizations,
    isLoading: false,
    isSuccess: true,
    isError: false,
    isPending: false,
    isFetching: false,
    isRefetching: false,
    refetch: vi.fn(),
    error: null,
    status: 'success',
    fetchStatus: 'idle',
  });
}

describe('useActiveOrganization', () => {
  const ORG_1 = { id: 'org-111', name: 'Org One' };
  const ORG_2 = { id: 'org-222', name: 'Org Two' };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('returns org ID from URL when on an organization route', () => {
    setupMocks('/organization/org-111', [ORG_1, ORG_2]);
    const { result } = renderHook(() => useActiveOrganization());
    expect(result.current).toBe('org-111');
  });

  it('returns org ID from localStorage when URL has no org', () => {
    setStoredOrganizationId('org-222');
    setupMocks('/dashboard', [ORG_1, ORG_2]);
    const { result } = renderHook(() => useActiveOrganization());
    expect(result.current).toBe('org-222');
  });

  it('returns first org as fallback when no URL and no localStorage', () => {
    setupMocks('/dashboard', [ORG_1, ORG_2]);
    const { result } = renderHook(() => useActiveOrganization());
    expect(result.current).toBe('org-111');
  });

  it('returns null when no organizations exist', () => {
    setupMocks('/dashboard', []);
    const { result } = renderHook(() => useActiveOrganization());
    expect(result.current).toBeNull();
  });

  it('URL takes precedence over localStorage', () => {
    setStoredOrganizationId('org-222');
    setupMocks('/organization/org-111', [ORG_1, ORG_2]);
    const { result } = renderHook(() => useActiveOrganization());
    expect(result.current).toBe('org-111');
  });
});
