export const USER_ROLES = ['owner', 'admin', 'member', 'guest'] as const;
export const WORKSPACE_ROLES = ['owner', 'admin', 'member', 'guest'] as const;
export const ORGANIZATION_ROLES = ['owner', 'admin', 'member', 'guest'] as const;
export const PROJECT_ROLES = ['admin', 'member', 'viewer'] as const;

export const ROLE_HIERARCHY: Record<string, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  guest: 1,
};

/**
 * Numeric levels for project-scoped roles.
 * Used by assignRole to prevent assigning a role equal to or higher
 * than the assigner's own role within a project.
 */
export const PROJECT_ROLE_HIERARCHY: Record<string, number> = {
  admin: 3,
  member: 2,
  viewer: 1,
};
