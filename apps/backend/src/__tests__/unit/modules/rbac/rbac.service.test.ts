import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────

vi.mock('../../../../config/db-for-repos.js', () => ({
  repoDb: {},
}));

vi.mock('../../../../config/redis.js', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    keys: vi.fn().mockResolvedValue([]),
    del: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock('../../../../utils/redis-keys.js', () => ({
  rbacPermissionsKey: (userId: string, scope: string, scopeId?: string | null) =>
    `rbac:perms:${userId}:${scope}:${scopeId ?? 'global'}`,
  rbacRoleKey: (userId: string, scope: string, scopeId?: string | null) =>
    `rbac:role:${userId}:${scope}:${scopeId ?? 'global'}`,
}));

vi.mock('@sprintio/db/repositories', () => ({
  rbacRepo: {
    getUserPermissionNames: vi.fn().mockResolvedValue([]),
    getUserPrimaryRole: vi.fn().mockResolvedValue(undefined),
    getUserRoles: vi.fn().mockResolvedValue([]),
    findRoleByName: vi.fn().mockResolvedValue(null),
    assignUserRole: vi.fn().mockResolvedValue({ id: 'ur-1' }),
    revokeUserRole: vi.fn().mockResolvedValue(true),
  },
  workspaceRepo: {
    getMemberRole: vi.fn().mockResolvedValue(null),
  },
  organizationRepo: {
    getMemberRole: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@sprintio/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sprintio/shared')>();
  return {
    ...actual,
    PERMISSIONS: {
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
    },
  };
});

import { redis } from '../../../../config/redis.js';
import { rbacRepo, workspaceRepo } from '@sprintio/db/repositories';
import * as rbacService from '../../../../modules/rbac/rbac.service.js';

// ── Tests ─────────────────────────────────────────────────────

describe('RBAC Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redis.get).mockResolvedValue(null);
  });

  // ── getUserPermissions ──────────────────────────────────────

  describe('getUserPermissions', () => {
    it('should return cached permissions when available', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(['workspace:update']));

      const perms = await rbacService.getUserPermissions('user-1', 'workspace', 'ws-1');

      expect(perms).toEqual(['workspace:update']);
      // Should not hit DB
      expect(rbacRepo.getUserPermissionNames).not.toHaveBeenCalled();
    });

    it('should query DB when cache is empty', async () => {
      vi.mocked(rbacRepo.getUserPermissionNames).mockResolvedValue([
        'workspace:update',
        'workspace:manage_members',
      ]);

      const perms = await rbacService.getUserPermissions('user-1', 'workspace', 'ws-1');

      expect(perms).toEqual(['workspace:update', 'workspace:manage_members']);
      expect(rbacRepo.getUserPermissionNames).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        'workspace',
        'ws-1',
      );
    });

    it('should use fallback when DB returns empty and membership role exists', async () => {
      vi.mocked(rbacRepo.getUserPermissionNames).mockResolvedValue([]);
      vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue('admin' as never);

      const perms = await rbacService.getUserPermissions('user-1', 'workspace', 'ws-1');

      // Admin should have workspace:update, workspace:manage_members
      expect(perms).toContain('workspace:update');
      expect(perms).toContain('workspace:manage_members');
      expect(perms).toContain('board:create');
    });

    it('should return empty array when no membership and no DB roles', async () => {
      vi.mocked(rbacRepo.getUserPermissionNames).mockResolvedValue([]);
      vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue(undefined);

      const perms = await rbacService.getUserPermissions('user-1', 'workspace', 'ws-1');

      expect(perms).toEqual([]);
    });

    it('should give owner all permissions via fallback', async () => {
      vi.mocked(rbacRepo.getUserPermissionNames).mockResolvedValue([]);
      vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue('owner' as never);

      const perms = await rbacService.getUserPermissions('user-1', 'workspace', 'ws-1');

      expect(perms).toContain('workspace:update');
      expect(perms).toContain('workspace:delete');
      expect(perms).toContain('workspace:manage_members');
      expect(perms).toContain('board:create');
      expect(perms).toContain('task:assign');
      expect(perms).toContain('document:delete');
    });
  });

  // ── hasPermission ───────────────────────────────────────────

  describe('hasPermission', () => {
    it('should return true when user has the permission', async () => {
      vi.mocked(redis.get).mockResolvedValue(
        JSON.stringify(['workspace:update', 'workspace:manage_members']),
      );

      const result = await rbacService.hasPermission(
        'user-1',
        'workspace:update',
        'workspace',
        'ws-1',
      );

      expect(result).toBe(true);
    });

    it('should return false when user lacks the permission', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(['board:create']));

      const result = await rbacService.hasPermission(
        'user-1',
        'workspace:update',
        'workspace',
        'ws-1',
      );

      expect(result).toBe(false);
    });
  });

  // ── hasAllPermissions ───────────────────────────────────────

  describe('hasAllPermissions', () => {
    it('should return true when user has all permissions', async () => {
      vi.mocked(redis.get).mockResolvedValue(
        JSON.stringify(['workspace:update', 'workspace:manage_members']),
      );

      const result = await rbacService.hasAllPermissions(
        'user-1',
        ['workspace:update', 'workspace:manage_members'],
        'workspace',
        'ws-1',
      );

      expect(result).toBe(true);
    });

    it('should return false when user is missing one permission', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(['workspace:update']));

      const result = await rbacService.hasAllPermissions(
        'user-1',
        ['workspace:update', 'workspace:delete'],
        'workspace',
        'ws-1',
      );

      expect(result).toBe(false);
    });
  });

  // ── getUserPrimaryRole ──────────────────────────────────────

  describe('getUserPrimaryRole', () => {
    it('should return cached role when available', async () => {
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify('admin'));

      const role = await rbacService.getUserPrimaryRole('user-1', 'workspace', 'ws-1');

      expect(role).toBe('admin');
      expect(rbacRepo.getUserPrimaryRole).not.toHaveBeenCalled();
    });

    it('should query DB when cache is empty', async () => {
      vi.mocked(rbacRepo.getUserPrimaryRole).mockResolvedValue('member');

      const role = await rbacService.getUserPrimaryRole('user-1', 'workspace', 'ws-1');

      expect(role).toBe('member');
    });

    it('should fallback to workspace membership table', async () => {
      vi.mocked(rbacRepo.getUserPrimaryRole).mockResolvedValue(undefined);
      vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue('admin' as never);

      const role = await rbacService.getUserPrimaryRole('user-1', 'workspace', 'ws-1');

      expect(role).toBe('admin');
    });

    it('should return undefined when no role found', async () => {
      vi.mocked(rbacRepo.getUserPrimaryRole).mockResolvedValue(undefined);
      vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue(undefined);

      const role = await rbacService.getUserPrimaryRole('user-1', 'workspace', 'ws-1');

      expect(role).toBeUndefined();
    });
  });

  // ── assignRole ──────────────────────────────────────────────

  describe('assignRole', () => {
    it('should assign a role successfully', async () => {
      vi.mocked(rbacRepo.findRoleByName).mockResolvedValue({
        id: 'role-1',
        name: 'member',
        description: null,
        scope: 'workspace',
        isSystem: true,
        createdAt: new Date(),
      });
      // getUserPermissions for revoker (user-1) — cache miss → fallback → admin
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(rbacRepo.getUserPermissionNames).mockResolvedValue([]);
      vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue('admin' as never);
      vi.mocked(rbacRepo.getUserRoles).mockResolvedValue([]);

      await rbacService.assignRole('user-2', 'member', 'workspace', 'ws-1', 'user-1');

      expect(rbacRepo.assignUserRole).toHaveBeenCalled();
    });

    it('should throw when role does not exist', async () => {
      vi.mocked(rbacRepo.findRoleByName).mockResolvedValue(undefined as never);

      await expect(
        rbacService.assignRole('user-2', 'superadmin', 'workspace', 'ws-1', 'user-1'),
      ).rejects.toThrow('does not exist');
    });

    it('should throw when assigner lacks manage_members permission', async () => {
      vi.mocked(rbacRepo.findRoleByName).mockResolvedValue({
        id: 'role-1',
        name: 'admin',
        description: null,
        scope: 'workspace',
        isSystem: true,
        createdAt: new Date(),
      });
      // getUserPermissions: cache miss → DB fallback → member role (no manage_members)
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(rbacRepo.getUserPermissionNames).mockResolvedValue([]);
      vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue('member' as never);

      await expect(
        rbacService.assignRole('user-2', 'admin', 'workspace', 'ws-1', 'user-1'),
      ).rejects.toThrow('permission to assign roles');
    });
  });

  // ── revokeRole ──────────────────────────────────────────────

  describe('revokeRole', () => {
    it('should revoke a role successfully', async () => {
      // getUserPermissions for revoker (user-1) — cache miss → DB fallback
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(rbacRepo.getUserPermissionNames).mockResolvedValue([]);
      vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue('admin' as never);

      // getUserPrimaryRole for target user (user-2) — cache miss → DB
      vi.mocked(rbacRepo.getUserPrimaryRole).mockResolvedValue('member');
      vi.mocked(rbacRepo.getUserRoles).mockResolvedValue([
        {
          id: 'ur-1',
          userId: 'user-2',
          roleId: 'role-2',
          scope: 'workspace',
          scopeId: 'ws-1',
          createdAt: new Date(),
        },
      ]);

      await rbacService.revokeRole('user-2', 'workspace', 'ws-1', 'user-1');

      expect(rbacRepo.revokeUserRole).toHaveBeenCalled();
    });

    it('should throw when trying to revoke owner role', async () => {
      // getUserPermissions for revoker (user-1) — cache miss → DB fallback
      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(rbacRepo.getUserPermissionNames).mockResolvedValue([]);
      vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue('admin' as never);

      // getUserPrimaryRole for target user → returns 'owner'
      vi.mocked(rbacRepo.getUserPrimaryRole).mockResolvedValue('owner');

      await expect(rbacService.revokeRole('user-2', 'workspace', 'ws-1', 'user-1')).rejects.toThrow(
        'Cannot revoke the owner role',
      );
    });
  });

  // ── invalidateUserCache ─────────────────────────────────────

  describe('invalidateUserCache', () => {
    it('should invalidate all cache keys for a user', async () => {
      vi.mocked(redis.keys).mockResolvedValue(['rbac:perms:user-1:workspace:ws-1']);

      await rbacService.invalidateUserCache('user-1');

      expect(redis.keys).toHaveBeenCalledWith('rbac:*:user-1:*');
      expect(redis.del).toHaveBeenCalledWith('rbac:perms:user-1:workspace:ws-1');
    });

    it('should handle Redis errors gracefully', async () => {
      vi.mocked(redis.keys).mockRejectedValue(new Error('Redis down'));

      // Should not throw
      await rbacService.invalidateUserCache('user-1');
    });
  });
});
