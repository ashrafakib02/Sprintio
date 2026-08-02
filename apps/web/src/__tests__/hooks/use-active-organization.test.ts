import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { setStoredOrganizationId } from '@/lib/organization-storage';
import type { Organization } from '@sprintio/shared';

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

function setupMocks(pathname: string, organizations: Organization[] = []) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockUseRouterState.mockImplementation((opts: any) => {
    if (opts?.select) return opts.select({ location: { pathname } });
    return pathname;
  });

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe('useActiveOrganization', () => {
  const ORG_1: Organization = {
    id: 'org-111',
    name: 'Org One',
    slug: 'org-one',
    description: null,
    logo: null,
    website: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    archivedAt: null,
  };
  const ORG_2: Organization = {
    id: 'org-222',
    name: 'Org Two',
    slug: 'org-two',
    description: null,
    logo: null,
    website: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    archivedAt: null,
  };

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
