import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────

vi.mock('../../../../config/db-for-repos.js', () => ({
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
    findByUserIdAndOrganizationId: vi.fn(),
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

import * as workspaceService from '../../../../modules/workspace/workspace.service.js';
import { workspaceRepo, organizationRepo } from '@sprintio/db/repositories';
import { repoDb } from '../../../../config/db-for-repos.js';
import { AppError } from '@sprintio/shared';

const repo = vi.mocked(workspaceRepo);
const orgRepo = vi.mocked(organizationRepo);

// ── Helpers ──────────────────────────────────────────────────

const WS_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440002';
const ORG_ID = '550e8400-e29b-41d4-a716-446655440003';

function makeWs(
  overrides: Partial<{
    id: string;
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
    id: WS_ID,
    name: 'Test Workspace',
    slug: 'test-workspace',
    description: 'A test workspace',
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

function makeMember(
  overrides: Partial<{
    id: string;
    workspaceId: string;
    userId: string;
    role: string;
    createdAt: Date;
  }> = {},
) {
  return {
    id: 'member-1',
    workspaceId: WS_ID,
    userId: USER_ID,
    role: 'member',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeOrg(
  overrides: Partial<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logo: string | null;
    website: string | null;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
  }> = {},
) {
  return {
    id: ORG_ID,
    name: 'Test Org',
    slug: 'test-org',
    description: null,
    logo: null,
    website: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    archivedAt: null,
    ...overrides,
  };
}

function makeInvitation(
  overrides: Partial<{
    id: string;
    workspaceId: string;
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
    id: 'inv-1',
    workspaceId: WS_ID,
    email: 'invitee@example.com',
    role: 'member',
    token: 'test-token-abc123',
    invitedById: USER_ID,
    status: 'pending',
    expiresAt: new Date('2027-02-01T00:00:00Z'),
    createdAt: new Date('2025-01-15T00:00:00Z'),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────

describe('Workspace Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // createWorkspace
  // ═══════════════════════════════════════════════════════════

  describe('createWorkspace', () => {
    it('should create workspace and return result with ISO dates', async () => {
      repo.findBySlug.mockResolvedValue(undefined);
      repo.create.mockResolvedValue(makeWs());

      const result = await workspaceService.createWorkspace(USER_ID, { name: 'Test Workspace' });

      expect(result.id).toBe(WS_ID);
      expect(result.slug).toBe('test-workspace');
      expect(result.createdAt).toBe('2025-01-01T00:00:00.000Z');
      expect(repo.create).toHaveBeenCalledWith(
        repoDb,
        expect.objectContaining({
          name: 'Test Workspace',
          slug: 'test-workspace',
          createdById: USER_ID,
        }),
      );
    });

    it('should throw CONFLICT for duplicate slug', async () => {
      repo.findBySlug.mockResolvedValue(makeWs());

      await expect(
        workspaceService.createWorkspace(USER_ID, { name: 'Test Workspace' }),
      ).rejects.toThrow(AppError);
    });

    it('should handle PG 23505 race condition on slug', async () => {
      repo.findBySlug.mockResolvedValue(undefined);
      const pgError = new Error('duplicate key') as Error & { code: string };
      pgError.code = '23505';
      repo.create.mockRejectedValue(pgError);

      await expect(
        workspaceService.createWorkspace(USER_ID, { name: 'Test Workspace' }),
      ).rejects.toThrow(AppError);
    });

    it('should re-throw non-PG errors', async () => {
      repo.findBySlug.mockResolvedValue(undefined);
      repo.create.mockRejectedValue(new Error('DB connection lost'));

      await expect(
        workspaceService.createWorkspace(USER_ID, { name: 'Test Workspace' }),
      ).rejects.toThrow('DB connection lost');
    });

    it('should validate org exists when organizationId provided', async () => {
      repo.findBySlug.mockResolvedValue(undefined);
      orgRepo.findById.mockResolvedValue(undefined);

      await expect(
        workspaceService.createWorkspace(USER_ID, { name: 'Ws', organizationId: ORG_ID }),
      ).rejects.toThrow(AppError);
    });

    it('should check org membership when organizationId provided', async () => {
      repo.findBySlug.mockResolvedValue(undefined);
      orgRepo.findById.mockResolvedValue(makeOrg());
      orgRepo.isMember.mockResolvedValue(false);

      await expect(
        workspaceService.createWorkspace(USER_ID, { name: 'Ws', organizationId: ORG_ID }),
      ).rejects.toThrow(AppError);
    });

    it('should create with organizationId when org is valid and user is member', async () => {
      repo.findBySlug.mockResolvedValue(undefined);
      orgRepo.findById.mockResolvedValue(makeOrg());
      orgRepo.isMember.mockResolvedValue(true);
      repo.create.mockResolvedValue(makeWs({ organizationId: ORG_ID }));

      const result = await workspaceService.createWorkspace(USER_ID, {
        name: 'Ws',
        organizationId: ORG_ID,
      });
      expect(result.organizationId).toBe(ORG_ID);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getWorkspace
  // ═══════════════════════════════════════════════════════════

  describe('getWorkspace', () => {
    it('should return workspace for member', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.isMember.mockResolvedValue(true);

      const result = await workspaceService.getWorkspace(WS_ID, USER_ID);
      expect(result.name).toBe('Test Workspace');
    });

    it('should throw NOT_FOUND when workspace does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(workspaceService.getWorkspace(WS_ID, USER_ID)).rejects.toThrow(AppError);
    });

    it('should throw FORBIDDEN when user is not a member', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.isMember.mockResolvedValue(false);

      await expect(workspaceService.getWorkspace(WS_ID, OTHER_USER_ID)).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getUserWorkspaces
  // ═══════════════════════════════════════════════════════════

  describe('getUserWorkspaces', () => {
    beforeEach(() => {
      orgRepo.findById.mockResolvedValue({ id: ORG_ID } as never);
      orgRepo.isMember.mockResolvedValue(true);
    });

    it('should return filtered workspaces (default excludes archived)', async () => {
      repo.findByUserIdAndOrganizationId.mockResolvedValue([makeWs()]);

      const result = await workspaceService.getUserWorkspaces(USER_ID, ORG_ID);
      expect(result).toHaveLength(1);
      expect(repo.findByUserIdAndOrganizationId).toHaveBeenCalledWith(
        repoDb,
        USER_ID,
        ORG_ID,
        false,
      );
    });

    it('should include archived when includeArchived is true', async () => {
      repo.findByUserIdAndOrganizationId.mockResolvedValue([]);

      await workspaceService.getUserWorkspaces(USER_ID, ORG_ID, true);
      expect(repo.findByUserIdAndOrganizationId).toHaveBeenCalledWith(
        repoDb,
        USER_ID,
        ORG_ID,
        true,
      );
    });

    it('should return empty array when user has no workspaces', async () => {
      repo.findByUserIdAndOrganizationId.mockResolvedValue([]);

      const result = await workspaceService.getUserWorkspaces(USER_ID, ORG_ID);
      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getOrganizationWorkspaces
  // ═══════════════════════════════════════════════════════════

  describe('getOrganizationWorkspaces', () => {
    it('should return workspaces for an organization', async () => {
      orgRepo.findById.mockResolvedValue(makeOrg());
      repo.findByOrganizationId.mockResolvedValue([makeWs()]);

      const result = await workspaceService.getOrganizationWorkspaces(ORG_ID);
      expect(result).toHaveLength(1);
    });

    it('should throw NOT_FOUND when organization does not exist', async () => {
      orgRepo.findById.mockResolvedValue(undefined);

      await expect(workspaceService.getOrganizationWorkspaces(ORG_ID)).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // updateWorkspace
  // ═══════════════════════════════════════════════════════════

  describe('updateWorkspace', () => {
    it('should update workspace name and slug', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('owner');
      repo.findBySlug.mockResolvedValue(undefined);
      repo.updateById.mockResolvedValue(makeWs({ name: 'Updated', slug: 'updated' }));

      const result = await workspaceService.updateWorkspace(WS_ID, { name: 'Updated' }, USER_ID);
      expect(result.name).toBe('Updated');
      expect(result.slug).toBe('updated');
    });

    it('should update description and website', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('admin');
      repo.updateById.mockResolvedValue(makeWs({ description: 'New desc' }));

      const result = await workspaceService.updateWorkspace(
        WS_ID,
        { description: 'New desc' },
        USER_ID,
      );
      expect(result.description).toBe('New desc');
    });

    it('should throw NOT_FOUND when workspace does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(workspaceService.updateWorkspace(WS_ID, { name: 'X' }, USER_ID)).rejects.toThrow(
        AppError,
      );
    });

    it('should throw FORBIDDEN for non-owner/admin', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('member');

      await expect(workspaceService.updateWorkspace(WS_ID, { name: 'X' }, USER_ID)).rejects.toThrow(
        AppError,
      );
    });

    it('should throw FORBIDDEN when role is undefined', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue(undefined);

      await expect(workspaceService.updateWorkspace(WS_ID, { name: 'X' }, USER_ID)).rejects.toThrow(
        AppError,
      );
    });

    it('should throw BAD_REQUEST when workspace is archived', async () => {
      repo.findById.mockResolvedValue(makeWs({ archivedAt: new Date() }));
      repo.getMemberRole.mockResolvedValue('owner');

      await expect(workspaceService.updateWorkspace(WS_ID, { name: 'X' }, USER_ID)).rejects.toThrow(
        AppError,
      );
    });

    it('should throw CONFLICT for duplicate slug', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('owner');
      repo.findBySlug.mockResolvedValue(makeWs({ id: 'other-id' }));

      await expect(
        workspaceService.updateWorkspace(WS_ID, { name: 'Taken' }, USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should skip slug check when name is unchanged', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('owner');
      repo.updateById.mockResolvedValue(makeWs());

      await workspaceService.updateWorkspace(WS_ID, { description: 'x' }, USER_ID);
      expect(repo.findBySlug).not.toHaveBeenCalled();
    });

    it('should handle PG 23505 race condition on update', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('owner');
      repo.findBySlug.mockResolvedValue(undefined);
      const pgError = new Error('duplicate key') as Error & { code: string };
      pgError.code = '23505';
      repo.updateById.mockRejectedValue(pgError);

      await expect(
        workspaceService.updateWorkspace(WS_ID, { name: 'Race' }, USER_ID),
      ).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // archiveWorkspace
  // ═══════════════════════════════════════════════════════════

  describe('archiveWorkspace', () => {
    it('should archive workspace', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('owner');
      repo.archiveById.mockResolvedValue(makeWs({ archivedAt: new Date() }));

      const result = await workspaceService.archiveWorkspace(WS_ID, USER_ID);
      expect(result.archivedAt).toBeTruthy();
    });

    it('should throw NOT_FOUND when workspace does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(workspaceService.archiveWorkspace(WS_ID, USER_ID)).rejects.toThrow(AppError);
    });

    it('should throw FORBIDDEN for non-owner/admin', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('member');

      await expect(workspaceService.archiveWorkspace(WS_ID, USER_ID)).rejects.toThrow(AppError);
    });

    it('should throw BAD_REQUEST when already archived', async () => {
      repo.findById.mockResolvedValue(makeWs({ archivedAt: new Date() }));
      repo.getMemberRole.mockResolvedValue('owner');

      await expect(workspaceService.archiveWorkspace(WS_ID, USER_ID)).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // restoreWorkspace
  // ═══════════════════════════════════════════════════════════

  describe('restoreWorkspace', () => {
    it('should restore archived workspace', async () => {
      repo.findById.mockResolvedValue(makeWs({ archivedAt: new Date() }));
      repo.getMemberRole.mockResolvedValue('owner');
      repo.restoreById.mockResolvedValue(makeWs());

      const result = await workspaceService.restoreWorkspace(WS_ID, USER_ID);
      expect(result.archivedAt).toBeNull();
    });

    it('should throw NOT_FOUND when workspace does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(workspaceService.restoreWorkspace(WS_ID, USER_ID)).rejects.toThrow(AppError);
    });

    it('should throw BAD_REQUEST when not archived', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('owner');

      await expect(workspaceService.restoreWorkspace(WS_ID, USER_ID)).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // deleteWorkspace
  // ═══════════════════════════════════════════════════════════

  describe('deleteWorkspace', () => {
    it('should delete archived workspace', async () => {
      repo.findById.mockResolvedValue(makeWs({ archivedAt: new Date() }));
      repo.getMemberRole.mockResolvedValue('owner');
      repo.deleteById.mockResolvedValue(true);

      await expect(workspaceService.deleteWorkspace(WS_ID, USER_ID)).resolves.toBeUndefined();
    });

    it('should throw BAD_REQUEST when not archived', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('owner');

      await expect(workspaceService.deleteWorkspace(WS_ID, USER_ID)).rejects.toThrow(AppError);
    });

    it('should throw NOT_FOUND when workspace does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(workspaceService.deleteWorkspace(WS_ID, USER_ID)).rejects.toThrow(AppError);
    });

    it('should throw FORBIDDEN for non-owner (DELETE requires owner)', async () => {
      repo.findById.mockResolvedValue(makeWs({ archivedAt: new Date() }));
      repo.getMemberRole.mockResolvedValue('admin');

      await expect(workspaceService.deleteWorkspace(WS_ID, USER_ID)).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // addWorkspaceMember
  // ═══════════════════════════════════════════════════════════

  describe('addWorkspaceMember', () => {
    it('should add member with default role', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('admin');
      repo.isMember.mockResolvedValue(false);
      repo.addMember.mockResolvedValue(makeMember({ userId: OTHER_USER_ID }));

      const result = await workspaceService.addWorkspaceMember(
        WS_ID,
        OTHER_USER_ID,
        'member',
        USER_ID,
      );
      expect(result.userId).toBe(OTHER_USER_ID);
      expect(result.role).toBe('member');
    });

    it('should add member with specific role', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('owner');
      repo.isMember.mockResolvedValue(false);
      repo.addMember.mockResolvedValue(makeMember({ role: 'admin', userId: OTHER_USER_ID }));

      const result = await workspaceService.addWorkspaceMember(
        WS_ID,
        OTHER_USER_ID,
        'admin',
        USER_ID,
      );
      expect(result.role).toBe('admin');
    });

    it('should throw CONFLICT for existing member', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('admin');
      repo.isMember.mockResolvedValue(true);

      await expect(
        workspaceService.addWorkspaceMember(WS_ID, OTHER_USER_ID, 'member', USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw FORBIDDEN for non-admin requester', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        workspaceService.addWorkspaceMember(WS_ID, OTHER_USER_ID, 'member', USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw FORBIDDEN when requester role is undefined', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue(undefined);

      await expect(
        workspaceService.addWorkspaceMember(WS_ID, OTHER_USER_ID, 'member', USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw FORBIDDEN when member tries to assign admin role', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        workspaceService.addWorkspaceMember(WS_ID, OTHER_USER_ID, 'admin', USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw FORBIDDEN when non-owner tries to assign owner role', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('admin');

      await expect(
        workspaceService.addWorkspaceMember(WS_ID, OTHER_USER_ID, 'owner', USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw BAD_REQUEST for invalid role', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('owner');

      await expect(
        workspaceService.addWorkspaceMember(WS_ID, OTHER_USER_ID, 'superadmin', USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw NOT_FOUND when workspace does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(
        workspaceService.addWorkspaceMember(WS_ID, OTHER_USER_ID, 'member', USER_ID),
      ).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // removeWorkspaceMember
  // ═══════════════════════════════════════════════════════════

  describe('removeWorkspaceMember', () => {
    it('should remove member successfully', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValueOnce('admin').mockResolvedValueOnce('member');
      repo.removeMember.mockResolvedValue(true);

      await expect(
        workspaceService.removeWorkspaceMember(WS_ID, OTHER_USER_ID, USER_ID),
      ).resolves.toBeUndefined();
    });

    it('should throw NOT_FOUND when member does not exist', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValueOnce('admin').mockResolvedValueOnce(undefined);

      await expect(
        workspaceService.removeWorkspaceMember(WS_ID, OTHER_USER_ID, USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw BAD_REQUEST when trying to remove owner', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValueOnce('admin').mockResolvedValueOnce('owner');

      await expect(
        workspaceService.removeWorkspaceMember(WS_ID, OTHER_USER_ID, USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw FORBIDDEN for non-admin requester', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        workspaceService.removeWorkspaceMember(WS_ID, OTHER_USER_ID, USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw NOT_FOUND when workspace does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(
        workspaceService.removeWorkspaceMember(WS_ID, OTHER_USER_ID, USER_ID),
      ).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getWorkspaceMembers
  // ═══════════════════════════════════════════════════════════

  describe('getWorkspaceMembers', () => {
    it('should return members for workspace', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.isMember.mockResolvedValue(true);
      repo.getMembers.mockResolvedValue([
        makeMember(),
        makeMember({ id: 'm2', userId: OTHER_USER_ID }),
      ]);

      const result = await workspaceService.getWorkspaceMembers(WS_ID, USER_ID);
      expect(result).toHaveLength(2);
    });

    it('should throw FORBIDDEN for non-member', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.isMember.mockResolvedValue(false);

      await expect(workspaceService.getWorkspaceMembers(WS_ID, OTHER_USER_ID)).rejects.toThrow(
        AppError,
      );
    });

    it('should throw NOT_FOUND when workspace does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(workspaceService.getWorkspaceMembers(WS_ID, USER_ID)).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getUserWorkspaceRole
  // ═══════════════════════════════════════════════════════════

  describe('getUserWorkspaceRole', () => {
    it('should return user role', async () => {
      repo.getMemberRole.mockResolvedValue('admin');

      const result = await workspaceService.getUserWorkspaceRole(WS_ID, USER_ID);
      expect(result).toBe('admin');
    });

    it('should return undefined for non-member', async () => {
      repo.getMemberRole.mockResolvedValue(undefined);

      const result = await workspaceService.getUserWorkspaceRole(WS_ID, OTHER_USER_ID);
      expect(result).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // resolveWorkspaceContext
  // ═══════════════════════════════════════════════════════════

  describe('resolveWorkspaceContext', () => {
    it('should return workspace and role for member', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('admin');
      repo.getMembersWithUsers.mockResolvedValue([]);

      const result = await workspaceService.resolveWorkspaceContext(WS_ID, USER_ID);
      expect(result.workspace.name).toBe('Test Workspace');
      expect(result.userRole).toBe('admin');
    });

    it('should throw NOT_FOUND when workspace does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(workspaceService.resolveWorkspaceContext(WS_ID, USER_ID)).rejects.toThrow(
        AppError,
      );
    });

    it('should throw FORBIDDEN for non-member', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue(undefined);

      await expect(workspaceService.resolveWorkspaceContext(WS_ID, OTHER_USER_ID)).rejects.toThrow(
        AppError,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // inviteWorkspaceMember
  // ═══════════════════════════════════════════════════════════

  describe('inviteWorkspaceMember', () => {
    it('should create invitation successfully', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('admin');
      repo.findInvitationByEmail.mockResolvedValue(undefined);
      repo.createInvitation.mockResolvedValue(makeInvitation());

      const result = await workspaceService.inviteWorkspaceMember(
        WS_ID,
        'invitee@example.com',
        'member',
        USER_ID,
      );
      expect(result.email).toBe('invitee@example.com');
      expect(result.status).toBe('pending');
    });

    it('should throw CONFLICT for existing pending invitation', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('admin');
      repo.findInvitationByEmail.mockResolvedValue(makeInvitation());

      await expect(
        workspaceService.inviteWorkspaceMember(WS_ID, 'invitee@example.com', 'member', USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw FORBIDDEN for non-admin requester', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        workspaceService.inviteWorkspaceMember(WS_ID, 'invitee@example.com', 'member', USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw NOT_FOUND when workspace does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(
        workspaceService.inviteWorkspaceMember(WS_ID, 'invitee@example.com', 'member', USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw BAD_REQUEST for invalid role', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('admin');

      await expect(
        workspaceService.inviteWorkspaceMember(
          WS_ID,
          'invitee@example.com',
          'invalid-role',
          USER_ID,
        ),
      ).rejects.toThrow(AppError);
    });

    it('should throw FORBIDDEN when member tries to assign admin role', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        workspaceService.inviteWorkspaceMember(WS_ID, 'invitee@example.com', 'admin', USER_ID),
      ).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // acceptInvitation
  // ═══════════════════════════════════════════════════════════

  describe('acceptInvitation', () => {
    it('should accept invitation and create member', async () => {
      const invitation = makeInvitation();
      repo.findInvitationByToken.mockResolvedValue(invitation);
      repo.isMember.mockResolvedValue(false);
      repo.addMember.mockResolvedValue(makeMember({ userId: OTHER_USER_ID }));
      repo.updateInvitationStatus.mockResolvedValue({ ...invitation, status: 'accepted' });

      const result = await workspaceService.acceptInvitation(
        'test-token-abc123',
        OTHER_USER_ID,
        'invitee@example.com',
      );
      expect(result.userId).toBe(OTHER_USER_ID);
    });

    it('should throw NOT_FOUND for invalid token', async () => {
      repo.findInvitationByToken.mockResolvedValue(undefined);

      await expect(
        workspaceService.acceptInvitation('invalid-token', OTHER_USER_ID, 'invitee@example.com'),
      ).rejects.toThrow(AppError);
    });

    it('should throw FORBIDDEN when email does not match', async () => {
      repo.findInvitationByToken.mockResolvedValue(makeInvitation());

      await expect(
        workspaceService.acceptInvitation('test-token-abc123', OTHER_USER_ID, 'wrong@email.com'),
      ).rejects.toThrow(AppError);
    });

    it('should throw BAD_REQUEST for expired invitation', async () => {
      repo.findInvitationByToken.mockResolvedValue(
        makeInvitation({ expiresAt: new Date('2024-01-01T00:00:00Z') }),
      );

      await expect(
        workspaceService.acceptInvitation(
          'test-token-abc123',
          OTHER_USER_ID,
          'invitee@example.com',
        ),
      ).rejects.toThrow(AppError);
    });

    it('should throw BAD_REQUEST for non-pending invitation', async () => {
      repo.findInvitationByToken.mockResolvedValue(makeInvitation({ status: 'accepted' }));

      await expect(
        workspaceService.acceptInvitation(
          'test-token-abc123',
          OTHER_USER_ID,
          'invitee@example.com',
        ),
      ).rejects.toThrow(AppError);
    });

    it('should throw CONFLICT when user is already a member', async () => {
      repo.findInvitationByToken.mockResolvedValue(makeInvitation());
      repo.isMember.mockResolvedValue(true);

      await expect(
        workspaceService.acceptInvitation(
          'test-token-abc123',
          OTHER_USER_ID,
          'invitee@example.com',
        ),
      ).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // rejectInvitation
  // ═══════════════════════════════════════════════════════════

  describe('rejectInvitation', () => {
    it('should reject invitation successfully', async () => {
      repo.findInvitationByToken.mockResolvedValue(makeInvitation());
      repo.updateInvitationStatus.mockResolvedValue({ ...makeInvitation(), status: 'rejected' });

      await expect(
        workspaceService.rejectInvitation(
          'test-token-abc123',
          OTHER_USER_ID,
          'invitee@example.com',
        ),
      ).resolves.toBeUndefined();
    });

    it('should throw NOT_FOUND for invalid token', async () => {
      repo.findInvitationByToken.mockResolvedValue(undefined);

      await expect(
        workspaceService.rejectInvitation('invalid-token', OTHER_USER_ID, 'invitee@example.com'),
      ).rejects.toThrow(AppError);
    });

    it('should throw FORBIDDEN when email does not match', async () => {
      repo.findInvitationByToken.mockResolvedValue(makeInvitation());

      await expect(
        workspaceService.rejectInvitation('test-token-abc123', OTHER_USER_ID, 'wrong@email.com'),
      ).rejects.toThrow(AppError);
    });

    it('should throw BAD_REQUEST for non-pending invitation', async () => {
      repo.findInvitationByToken.mockResolvedValue(makeInvitation({ status: 'rejected' }));

      await expect(
        workspaceService.rejectInvitation(
          'test-token-abc123',
          OTHER_USER_ID,
          'invitee@example.com',
        ),
      ).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // transferOwnership
  // ═══════════════════════════════════════════════════════════

  describe('transferOwnership', () => {
    it('should transfer ownership successfully', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValueOnce('owner').mockResolvedValueOnce('member');
      repo.updateMemberRole
        .mockResolvedValueOnce(makeMember({ role: 'admin' }))
        .mockResolvedValueOnce(makeMember({ userId: OTHER_USER_ID, role: 'owner' }));

      const result = await workspaceService.transferOwnership(
        WS_ID,
        { newOwnerId: OTHER_USER_ID },
        USER_ID,
      );
      expect(result.previousOwner.role).toBe('admin');
      expect(result.newOwner.role).toBe('owner');
    });

    it('should throw FORBIDDEN for non-owner requester', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('admin');

      await expect(
        workspaceService.transferOwnership(WS_ID, { newOwnerId: OTHER_USER_ID }, USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw NOT_FOUND when target is not a member', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValueOnce('owner').mockResolvedValueOnce(undefined);

      await expect(
        workspaceService.transferOwnership(WS_ID, { newOwnerId: OTHER_USER_ID }, USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw BAD_REQUEST when transferring to yourself', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('owner');

      await expect(
        workspaceService.transferOwnership(WS_ID, { newOwnerId: USER_ID }, USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw NOT_FOUND when workspace does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(
        workspaceService.transferOwnership(WS_ID, { newOwnerId: OTHER_USER_ID }, USER_ID),
      ).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getWorkspaceInvitations
  // ═══════════════════════════════════════════════════════════

  describe('getWorkspaceInvitations', () => {
    it('should return invitations for workspace', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('admin');
      repo.getInvitations.mockResolvedValue([makeInvitation()]);

      const result = await workspaceService.getWorkspaceInvitations(WS_ID, USER_ID);
      expect(result).toHaveLength(1);
    });

    it('should throw FORBIDDEN for non-admin requester', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('member');

      await expect(workspaceService.getWorkspaceInvitations(WS_ID, USER_ID)).rejects.toThrow(
        AppError,
      );
    });

    it('should throw NOT_FOUND when workspace does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(workspaceService.getWorkspaceInvitations(WS_ID, USER_ID)).rejects.toThrow(
        AppError,
      );
    });
  });
});
