import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────

vi.mock('../../config/db-for-repos.js', () => ({
  repoDb: {
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  },
}));

vi.mock('@sprintio/db/repositories', () => ({
  workspaceRepo: {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findByUserId: vi.fn(),
    findByUserIdFiltered: vi.fn(),
    findByOrganizationId: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    archiveById: vi.fn(),
    restoreById: vi.fn(),
    deleteById: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    getMembers: vi.fn(),
    getMembersWithUsers: vi.fn(),
    isMember: vi.fn(),
    getMemberRole: vi.fn(),
    createInvitation: vi.fn(),
    findInvitationByToken: vi.fn(),
    findInvitationByEmail: vi.fn(),
    getInvitations: vi.fn(),
    updateInvitationStatus: vi.fn(),
    deleteInvitation: vi.fn(),
    updateMemberRole: vi.fn(),
  },
  organizationRepo: {
    findById: vi.fn(),
    isMember: vi.fn(),
  },
}));

vi.mock('@sprintio/shared', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    slugify: vi.fn((name: string) =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    ),
  };
});

import * as workspaceService from '../../modules/workspace/workspace.service.js';
import { workspaceRepo } from '@sprintio/db/repositories';
import { repoDb } from '../../config/db-for-repos.js';
import { AppError } from '@sprintio/shared';

const repo = vi.mocked(workspaceRepo);
const _mockTransaction = vi.mocked(repoDb).transaction as ReturnType<typeof vi.fn>;

// ── Constants for two-workspace isolation testing ─────────────

const WS_A = '550e8400-e29b-41d4-a716-446655440000';
const WS_B = '550e8400-e29b-41d4-a716-446655440010';
const USER_A = '550e8400-e29b-41d4-a716-446655440001';
const USER_B = '550e8400-e29b-41d4-a716-446655440002';
const USER_C = '550e8400-e29b-41d4-a716-446655440003';

// ── Helpers ──────────────────────────────────────────────────

function makeWs(
  id: string,
  overrides: Partial<{
    name: string;
    slug: string;
    description: string | null;
    logo: string | null;
    brandColor: string | null;
    customDomain: string | null;
    organizationId: string | null;
    plan: string;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  return {
    id,
    name: `Workspace ${id.slice(-4)}`,
    slug: `workspace-${id.slice(-4)}`,
    description: null,
    logo: null,
    brandColor: null,
    customDomain: null,
    organizationId: null,
    plan: 'free',
    archivedAt: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeMember(wsId: string, userId: string, role: string, id?: string) {
  return {
    id: id ?? `member-${wsId.slice(-4)}-${userId.slice(-4)}`,
    workspaceId: wsId,
    userId,
    role,
    createdAt: new Date('2025-01-01T00:00:00Z'),
  };
}

function makeInvitation(
  wsId: string,
  overrides: Partial<{
    id: string;
    email: string;
    role: string;
    token: string;
    invitedById: string;
    status: string;
    expiresAt: Date;
    createdAt: Date;
  }> = {},
) {
  return {
    id: `inv-${wsId.slice(-4)}`,
    workspaceId: wsId,
    email: 'invitee@example.com',
    role: 'member',
    token: `token-${wsId.slice(-4)}`,
    invitedById: USER_A,
    status: 'pending',
    expiresAt: new Date('2027-02-01T00:00:00Z'),
    createdAt: new Date('2025-01-15T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Helper: configure mock responses for a workspace + role resolution sequence.
 * This sets up the mock chain for operations that call findById then getMemberRole.
 */
function _setupWsMocks(
  wsId: string,
  requesterRole: string,
  overrides: Partial<{
    ws: ReturnType<typeof makeWs>;
    targetRole: string;
  }> = {},
) {
  const ws = overrides.ws ?? makeWs(wsId);
  repo.findById.mockResolvedValue(ws);
  repo.getMemberRole.mockResolvedValue(requesterRole);
  return ws;
}

// ── Tests ────────────────────────────────────────────────────

describe('Workspace Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('should prevent cross-workspace data access via getWorkspace', () => {
    it('should deny access when user is not a member of the target workspace', async () => {
      // USER_A is a member of WS_A, but not WS_B
      repo.findById.mockResolvedValue(makeWs(WS_B));
      repo.isMember.mockResolvedValue(false);

      await expect(workspaceService.getWorkspace(WS_B, USER_A)).rejects.toThrow(AppError);
    });

    it('should allow access when user is a member of the target workspace', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_B));
      repo.isMember.mockResolvedValue(true);

      const result = await workspaceService.getWorkspace(WS_B, USER_A);
      expect(result.id).toBe(WS_B);
    });

    it('should only return the requested workspace, not a different one', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.isMember.mockResolvedValue(true);

      const result = await workspaceService.getWorkspace(WS_A, USER_A);
      expect(result.id).toBe(WS_A);
      expect(result.id).not.toBe(WS_B);
    });
  });

  describe('should prevent cross-workspace member listing', () => {
    it('should deny member listing when user is not a member', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_B));
      repo.isMember.mockResolvedValue(false);

      await expect(workspaceService.getWorkspaceMembers(WS_B, USER_A)).rejects.toThrow(AppError);
    });

    it('should return members only from the requested workspace', async () => {
      const wsMembers = [
        makeMember(WS_B, USER_B, 'owner', 'm-b-owner'),
        makeMember(WS_B, USER_C, 'member', 'm-b-member'),
      ];

      repo.findById.mockResolvedValue(makeWs(WS_B));
      repo.isMember.mockResolvedValue(true);
      repo.getMembers.mockResolvedValue(wsMembers);

      const result = await workspaceService.getWorkspaceMembers(WS_B, USER_A);

      expect(result).toHaveLength(2);
      result.forEach((m) => {
        expect(m.workspaceId).toBe(WS_B);
      });
    });
  });

  describe('should prevent cross-workspace role changes', () => {
    it('should deny updateMemberRole on a workspace where user is not admin', async () => {
      // USER_A is not a member of WS_B
      repo.findById.mockResolvedValue(makeWs(WS_B));
      repo.getMemberRole.mockResolvedValue(undefined);

      await expect(
        workspaceService.updateMemberRole(WS_B, USER_C, 'admin', USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should deny updateMemberRole when user has insufficient role', async () => {
      // USER_A is a member (not admin) of WS_B
      repo.findById.mockResolvedValue(makeWs(WS_B));
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        workspaceService.updateMemberRole(WS_B, USER_C, 'admin', USER_A),
      ).rejects.toThrow(AppError);
    });
  });

  describe('should prevent cross-workspace invitation listing', () => {
    it('should deny invitation listing when user is not an admin', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_B));
      repo.getMemberRole.mockResolvedValue('member');

      await expect(workspaceService.getWorkspaceInvitations(WS_B, USER_A)).rejects.toThrow(
        AppError,
      );
    });

    it('should deny invitation listing when user is not a member at all', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_B));
      repo.getMemberRole.mockResolvedValue(undefined);

      await expect(workspaceService.getWorkspaceInvitations(WS_B, USER_A)).rejects.toThrow(
        AppError,
      );
    });

    it('should return invitations only from the requested workspace', async () => {
      const wsInvitations = [
        makeInvitation(WS_B, { email: 'alice@example.com', role: 'member' }),
        makeInvitation(WS_B, { id: 'inv-2', email: 'bob@example.com', role: 'guest' }),
      ];

      repo.findById.mockResolvedValue(makeWs(WS_B));
      repo.getMemberRole.mockResolvedValue('admin');
      repo.getInvitations.mockResolvedValue(wsInvitations);

      const result = await workspaceService.getWorkspaceInvitations(WS_B, USER_A);

      expect(result).toHaveLength(2);
      result.forEach((inv) => {
        expect(inv.workspaceId).toBe(WS_B);
      });
    });
  });

  describe('isolated workspace member operations', () => {
    it('should add member to WS-A without affecting WS-B', async () => {
      // Setup: USER_A is admin of WS_A, adding USER_C
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('admin');
      repo.isMember.mockResolvedValue(false);
      repo.addMember.mockResolvedValue(makeMember(WS_A, USER_C, 'member'));

      const added = await workspaceService.addWorkspaceMember(WS_A, USER_C, 'member', USER_A);
      expect(added.workspaceId).toBe(WS_A);
      expect(added.userId).toBe(USER_C);
      expect(added.role).toBe('member');

      // Verify WS-B was never touched
      expect(repo.findById).toHaveBeenCalledWith(repoDb, WS_A);
    });

    it('should remove member from WS-A without affecting WS-B', async () => {
      // Setup: USER_A is admin of WS_A, removing USER_C
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole
        .mockResolvedValueOnce('admin') // requester role check
        .mockResolvedValueOnce('member'); // target role check
      repo.removeMember.mockResolvedValue(true);

      await expect(
        workspaceService.removeWorkspaceMember(WS_A, USER_C, USER_A),
      ).resolves.toBeUndefined();

      // Verify removeMember was called with WS_A, not WS_B
      expect(repo.removeMember).toHaveBeenCalledWith(repoDb, WS_A, USER_C);
    });

    it('should not allow a user to be removed from a workspace they belong to via cross-workspace attack', async () => {
      // Attempting to remove USER_B from WS_A — USER_B might not even be in WS_A
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole
        .mockResolvedValueOnce('admin') // requester role check
        .mockResolvedValueOnce(undefined); // target is not in WS_A

      await expect(workspaceService.removeWorkspaceMember(WS_A, USER_B, USER_A)).rejects.toThrow(
        AppError,
      );
    });
  });

  describe('isolated workspace settings updates', () => {
    it('should update WS-A settings without affecting WS-B', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('owner');
      repo.updateById.mockResolvedValue(
        makeWs(WS_A, { name: 'Updated WS-A', slug: 'updated-ws-a' }),
      );

      const result = await workspaceService.updateWorkspace(WS_A, { name: 'Updated WS-A' }, USER_A);
      expect(result.id).toBe(WS_A);
      expect(result.name).toBe('Updated WS-A');

      // Verify the DB call targeted WS_A
      expect(repo.updateById).toHaveBeenCalledWith(repoDb, WS_A, expect.anything());
    });

    it('should not allow updating WS-B when requester only has access to WS-A', async () => {
      // USER_A is not a member of WS_B
      repo.findById.mockResolvedValue(makeWs(WS_B));
      repo.getMemberRole.mockResolvedValue(undefined);

      await expect(
        workspaceService.updateWorkspace(WS_B, { name: 'Hacked' }, USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should archive WS-A without affecting WS-B', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('owner');
      repo.archiveById.mockResolvedValue(makeWs(WS_A, { archivedAt: new Date() }));

      const result = await workspaceService.archiveWorkspace(WS_A, USER_A);
      expect(result.archivedAt).toBeTruthy();

      expect(repo.archiveById).toHaveBeenCalledWith(repoDb, WS_A);
    });

    it('should require membership for all read operations across workspaces', async () => {
      // Verify that both getWorkspace and getWorkspaceMembers enforce isolation
      repo.findById.mockResolvedValue(makeWs(WS_B));
      repo.isMember.mockResolvedValue(false);

      await expect(workspaceService.getWorkspace(WS_B, USER_A)).rejects.toThrow(AppError);

      vi.clearAllMocks();

      repo.findById.mockResolvedValue(makeWs(WS_B));
      repo.isMember.mockResolvedValue(false);

      await expect(workspaceService.getWorkspaceMembers(WS_B, USER_A)).rejects.toThrow(AppError);
    });
  });
});

// ═════════════════════════════════════════════════════════════
// Permission Escalation Prevention
// ═════════════════════════════════════════════════════════════

describe('Permission Escalation Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('should prevent member from assigning admin role', () => {
    it('should reject member adding another user as admin', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        workspaceService.addWorkspaceMember(WS_A, USER_C, 'admin', USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should reject member inviting another user as admin', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        workspaceService.inviteWorkspaceMember(WS_A, 'new@example.com', 'admin', USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should reject member using updateMemberRole to promote to admin', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        workspaceService.updateMemberRole(WS_A, USER_C, 'admin', USER_A),
      ).rejects.toThrow(AppError);
    });
  });

  describe('should prevent member from assigning owner role', () => {
    it('should reject member adding another user as owner', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        workspaceService.addWorkspaceMember(WS_A, USER_C, 'owner', USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should reject admin adding another user as owner', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('admin');

      await expect(
        workspaceService.addWorkspaceMember(WS_A, USER_C, 'owner', USER_A),
      ).rejects.toThrow(AppError);
    });
  });

  describe('should prevent admin from assigning owner role', () => {
    it('should reject admin adding another user as owner via addWorkspaceMember', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('admin');

      await expect(
        workspaceService.addWorkspaceMember(WS_A, USER_C, 'owner', USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should reject admin inviting another user as owner', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('admin');

      await expect(
        workspaceService.inviteWorkspaceMember(WS_A, 'new@example.com', 'owner', USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should reject admin using updateMemberRole to promote to owner', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('admin');

      await expect(
        workspaceService.updateMemberRole(WS_A, USER_C, 'owner', USER_A),
      ).rejects.toThrow(AppError);
    });
  });

  describe('should prevent non-owner from transferring ownership', () => {
    it('should reject admin attempting ownership transfer', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('admin');

      await expect(
        workspaceService.transferOwnership(WS_A, { newOwnerId: USER_C }, USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should reject member attempting ownership transfer', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        workspaceService.transferOwnership(WS_A, { newOwnerId: USER_C }, USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should reject guest attempting ownership transfer', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('guest');

      await expect(
        workspaceService.transferOwnership(WS_A, { newOwnerId: USER_C }, USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should reject non-member attempting ownership transfer', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue(undefined);

      await expect(
        workspaceService.transferOwnership(WS_A, { newOwnerId: USER_C }, USER_A),
      ).rejects.toThrow(AppError);
    });
  });

  describe('should prevent member from updating workspace settings', () => {
    it('should reject member updating workspace via updateWorkspace', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        workspaceService.updateWorkspace(WS_A, { name: 'Hacked Name' }, USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should reject guest updating workspace', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('guest');

      await expect(
        workspaceService.updateWorkspace(WS_A, { name: 'Hacked Name' }, USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should reject non-member updating workspace', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue(undefined);

      await expect(
        workspaceService.updateWorkspace(WS_A, { name: 'Hacked Name' }, USER_A),
      ).rejects.toThrow(AppError);
    });
  });

  describe('should prevent guest from managing members', () => {
    it('should reject guest adding members', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('guest');

      await expect(
        workspaceService.addWorkspaceMember(WS_A, USER_C, 'member', USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should reject guest removing members', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('guest');

      await expect(workspaceService.removeWorkspaceMember(WS_A, USER_C, USER_A)).rejects.toThrow(
        AppError,
      );
    });

    it('should reject guest inviting members', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('guest');

      await expect(
        workspaceService.inviteWorkspaceMember(WS_A, 'new@example.com', 'member', USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should reject guest listing invitations', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('guest');

      await expect(workspaceService.getWorkspaceInvitations(WS_A, USER_A)).rejects.toThrow(
        AppError,
      );
    });

    it('should reject guest updating member roles', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('guest');

      await expect(
        workspaceService.updateMemberRole(WS_A, USER_C, 'admin', USER_A),
      ).rejects.toThrow(AppError);
    });
  });

  describe('owner should bypass all permission checks', () => {
    it('should allow owner to update workspace settings', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('owner');
      repo.updateById.mockResolvedValue(makeWs(WS_A, { name: 'Owner Updated' }));

      const result = await workspaceService.updateWorkspace(
        WS_A,
        { name: 'Owner Updated' },
        USER_A,
      );
      expect(result.name).toBe('Owner Updated');
    });

    it('should allow owner to archive workspace', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('owner');
      repo.archiveById.mockResolvedValue(makeWs(WS_A, { archivedAt: new Date() }));

      const result = await workspaceService.archiveWorkspace(WS_A, USER_A);
      expect(result.archivedAt).toBeTruthy();
    });

    it('should allow owner to add any role including admin', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('owner');
      repo.isMember.mockResolvedValue(false);
      repo.addMember.mockResolvedValue(makeMember(WS_A, USER_C, 'admin'));

      const result = await workspaceService.addWorkspaceMember(WS_A, USER_C, 'admin', USER_A);
      expect(result.role).toBe('admin');
    });

    it('should allow owner to transfer ownership', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole
        .mockResolvedValueOnce('owner') // requester
        .mockResolvedValueOnce('member'); // target
      repo.updateMemberRole
        .mockResolvedValueOnce(makeMember(WS_A, USER_A, 'admin'))
        .mockResolvedValueOnce(makeMember(WS_A, USER_C, 'owner'));

      const result = await workspaceService.transferOwnership(WS_A, { newOwnerId: USER_C }, USER_A);
      expect(result.previousOwner.role).toBe('admin');
      expect(result.newOwner.role).toBe('owner');
    });

    it('should allow owner to remove any non-owner member', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole
        .mockResolvedValueOnce('owner') // requester
        .mockResolvedValueOnce('admin'); // target is admin, not owner
      repo.removeMember.mockResolvedValue(true);

      await expect(
        workspaceService.removeWorkspaceMember(WS_A, USER_C, USER_A),
      ).resolves.toBeUndefined();
    });

    it('should allow owner to list invitations', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('owner');
      repo.getInvitations.mockResolvedValue([]);

      const result = await workspaceService.getWorkspaceInvitations(WS_A, USER_A);
      expect(result).toEqual([]);
    });

    it('should allow owner to update member roles', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('owner');
      // Target is not owner (can be changed)
      repo.getMemberRole.mockResolvedValueOnce('owner'); // requester role
      repo.getMemberRole.mockResolvedValueOnce('member'); // target role
      repo.updateMemberRole.mockResolvedValue(makeMember(WS_A, USER_C, 'admin'));

      const result = await workspaceService.updateMemberRole(WS_A, USER_C, 'admin', USER_A);
      expect(result.role).toBe('admin');
    });
  });

  describe('role hierarchy enforcement: admin > member > guest', () => {
    it('should allow admin to add members (role below admin)', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('admin');
      repo.isMember.mockResolvedValue(false);
      repo.addMember.mockResolvedValue(makeMember(WS_A, USER_C, 'member'));

      const result = await workspaceService.addWorkspaceMember(WS_A, USER_C, 'member', USER_A);
      expect(result.role).toBe('member');
    });

    it('should allow admin to add guests (role below admin)', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('admin');
      repo.isMember.mockResolvedValue(false);
      repo.addMember.mockResolvedValue(makeMember(WS_A, USER_C, 'guest'));

      const result = await workspaceService.addWorkspaceMember(WS_A, USER_C, 'guest', USER_A);
      expect(result.role).toBe('guest');
    });

    it('should prevent admin from adding another admin (equal role)', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('admin');

      await expect(
        workspaceService.addWorkspaceMember(WS_A, USER_C, 'admin', USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should prevent admin from removing owner', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole
        .mockResolvedValueOnce('admin') // requester
        .mockResolvedValueOnce('owner'); // target is owner

      await expect(workspaceService.removeWorkspaceMember(WS_A, USER_C, USER_A)).rejects.toThrow(
        AppError,
      );
    });

    it('should prevent member from adding any role (member level insufficient)', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('member');

      // Member cannot add anyone — MANAGE_MEMBERS requires admin+
      await expect(
        workspaceService.addWorkspaceMember(WS_A, USER_C, 'guest', USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should prevent member from removing another member', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('member');

      await expect(workspaceService.removeWorkspaceMember(WS_A, USER_C, USER_A)).rejects.toThrow(
        AppError,
      );
    });

    it('should prevent member from inviting anyone', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        workspaceService.inviteWorkspaceMember(WS_A, 'new@example.com', 'guest', USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should prevent guest from performing any management action', async () => {
      const ws = makeWs(WS_A);

      // Guest cannot add members
      repo.findById.mockResolvedValue(ws);
      repo.getMemberRole.mockResolvedValue('guest');
      await expect(
        workspaceService.addWorkspaceMember(WS_A, USER_C, 'member', USER_A),
      ).rejects.toThrow(AppError);

      // Guest cannot remove members
      vi.clearAllMocks();
      repo.findById.mockResolvedValue(ws);
      repo.getMemberRole.mockResolvedValue('guest');
      await expect(workspaceService.removeWorkspaceMember(WS_A, USER_C, USER_A)).rejects.toThrow(
        AppError,
      );

      // Guest cannot update workspace
      vi.clearAllMocks();
      repo.findById.mockResolvedValue(ws);
      repo.getMemberRole.mockResolvedValue('guest');
      await expect(workspaceService.updateWorkspace(WS_A, { name: 'X' }, USER_A)).rejects.toThrow(
        AppError,
      );

      // Guest cannot archive workspace
      vi.clearAllMocks();
      repo.findById.mockResolvedValue(ws);
      repo.getMemberRole.mockResolvedValue('guest');
      await expect(workspaceService.archiveWorkspace(WS_A, USER_A)).rejects.toThrow(AppError);

      // Guest cannot transfer ownership
      vi.clearAllMocks();
      repo.findById.mockResolvedValue(ws);
      repo.getMemberRole.mockResolvedValue('guest');
      await expect(
        workspaceService.transferOwnership(WS_A, { newOwnerId: USER_C }, USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should enforce full hierarchy: cannot self-promote by any role', async () => {
      const ws = makeWs(WS_A);

      // Member tries to make themselves admin
      repo.findById.mockResolvedValue(ws);
      repo.getMemberRole.mockResolvedValue('member');
      await expect(
        workspaceService.addWorkspaceMember(WS_A, USER_A, 'admin', USER_A),
      ).rejects.toThrow(AppError);

      // Admin tries to make themselves owner
      vi.clearAllMocks();
      repo.findById.mockResolvedValue(ws);
      repo.getMemberRole.mockResolvedValue('admin');
      await expect(
        workspaceService.addWorkspaceMember(WS_A, USER_A, 'owner', USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should validate role is a valid workspace role', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('owner');

      await expect(
        workspaceService.addWorkspaceMember(WS_A, USER_C, 'superadmin', USER_A),
      ).rejects.toThrow(AppError);

      await expect(
        workspaceService.addWorkspaceMember(WS_A, USER_C, 'moderator', USER_A),
      ).rejects.toThrow(AppError);

      await expect(workspaceService.addWorkspaceMember(WS_A, USER_C, '', USER_A)).rejects.toThrow(
        AppError,
      );
    });

    it('should prevent removing the workspace owner', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole
        .mockResolvedValueOnce('owner') // requester
        .mockResolvedValueOnce('owner'); // target is also owner

      await expect(workspaceService.removeWorkspaceMember(WS_A, USER_C, USER_A)).rejects.toThrow(
        AppError,
      );
    });

    it('should prevent changing the owner role via updateMemberRole', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('owner');
      // Target is the owner — cannot change owner's role
      repo.getMemberRole.mockResolvedValueOnce('owner'); // requester role
      repo.getMemberRole.mockResolvedValueOnce('owner'); // target is owner

      await expect(
        workspaceService.updateMemberRole(WS_A, USER_C, 'admin', USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should prevent transferring ownership to yourself', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole.mockResolvedValue('owner');

      await expect(
        workspaceService.transferOwnership(WS_A, { newOwnerId: USER_A }, USER_A),
      ).rejects.toThrow(AppError);
    });

    it('should prevent transferring ownership to a non-member', async () => {
      repo.findById.mockResolvedValue(makeWs(WS_A));
      repo.getMemberRole
        .mockResolvedValueOnce('owner') // requester
        .mockResolvedValueOnce(undefined); // target is not a member

      await expect(
        workspaceService.transferOwnership(WS_A, { newOwnerId: USER_C }, USER_A),
      ).rejects.toThrow(AppError);
    });
  });
});
