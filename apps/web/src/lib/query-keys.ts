/**
 * Centralized TanStack Query key factory.
 *
 * Every query in the app should reference a key from here so that
 * cache invalidation / removal is consistent and type-safe.
 */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  organizations: {
    all: ['organizations'] as const,
  },
  workspaces: {
    all: ['workspaces'] as const,
    byOrganization: (orgId: string) => ['workspaces', 'byOrganization', orgId] as const,
    list: (orgId: string) => ['workspaces', 'list', orgId] as const,
    detail: (wsId: string) => ['workspace', wsId] as const,
    context: (wsId: string) => ['workspace', wsId, 'context'] as const,
  },
  projects: {
    all: (wsId: string) => ['projects', wsId] as const,
    detail: (projId: string) => ['project', projId] as const,
  },
  tasks: {
    byProject: (projId: string) => ['tasks', 'project', projId] as const,
    my: ['tasks', 'my'] as const,
  },
} as const;
