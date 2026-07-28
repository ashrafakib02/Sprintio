export const USER_ROLES = ['owner', 'admin', 'member', 'guest'] as const;
export const WORKSPACE_ROLES = ['owner', 'admin', 'member', 'guest'] as const;
export const ORGANIZATION_ROLES = ['owner', 'admin', 'member', 'guest'] as const;

export const ROLE_HIERARCHY: Record<string, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  guest: 1,
};
