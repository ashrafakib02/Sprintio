export const PERMISSIONS = {
  ORGANIZATION: {
    CREATE: 'organization:create',
    UPDATE: 'organization:update',
    DELETE: 'organization:delete',
    MANAGE_MEMBERS: 'organization:manage_members',
    MANAGE_BILLING: 'organization:manage_billing',
    SETTINGS: 'organization:settings',
  },
  WORKSPACE: {
    CREATE: 'workspace:create',
    UPDATE: 'workspace:update',
    DELETE: 'workspace:delete',
    MANAGE_MEMBERS: 'workspace:manage_members',
    MANAGE_BILLING: 'workspace:manage_billing',
    SETTINGS: 'workspace:settings',
    MANAGE_ROLES: 'workspace:manage_roles',
  },
  BOARD: {
    CREATE: 'board:create',
    UPDATE: 'board:update',
    DELETE: 'board:delete',
  },
  TASK: {
    CREATE: 'task:create',
    UPDATE: 'task:update',
    DELETE: 'task:delete',
    ASSIGN: 'task:assign',
  },
  DOCUMENT: {
    CREATE: 'document:create',
    UPDATE: 'document:update',
    DELETE: 'document:delete',
  },
} as const;
