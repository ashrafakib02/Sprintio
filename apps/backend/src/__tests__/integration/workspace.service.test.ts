import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────

vi.mock('../../config/db-for-repos.js', () => ({
  repoDb: {},
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
    isMember: vi.fn(),
    getMemberRole: vi.fn(),
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
import { workspaceRepo, organizationRepo } from '@sprintio/db/repositories';
import { AppError } from '@sprintio/shared';

const repo = vi.mocked(workspaceRepo);
const orgRepo = vi.mocked(organizationRepo);

// ── Helpers ──────────────────────────────────────────────────

const WS_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440002';

function makeWs(
  overrides: Partial<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logo: string | null;
    brandColor: string | null;
    customDomain: string | null;
    organizationId: string;
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
    organizationId: 'org-test-001',
    plan: 'free',
    archivedAt: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
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
    id: 'org-test-001',
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

// ── Integration Tests ────────────────────────────────────────

describe('Workspace Service — Integration Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // Full CRUD lifecycle
  // ═══════════════════════════════════════════════════════════

  describe('Full CRUD lifecycle', () => {
    it('should create → get → update → archive → restore → delete', async () => {
      // CREATE
      repo.findBySlug.mockResolvedValue(undefined);
      orgRepo.findById.mockResolvedValue(makeOrg());
      orgRepo.isMember.mockResolvedValue(true);
      repo.create.mockResolvedValue(makeWs());
      const created = await workspaceService.createWorkspace(USER_ID, {
        name: 'Test Workspace',
        organizationId: 'org-test-001',
      });
      expect(created.id).toBe(WS_ID);

      // GET (as owner)
      vi.clearAllMocks();
      repo.findById.mockResolvedValue(makeWs());
      repo.isMember.mockResolvedValue(true);
      const fetched = await workspaceService.getWorkspace(WS_ID, USER_ID);
      expect(fetched.name).toBe('Test Workspace');

      // UPDATE (as owner)
      vi.clearAllMocks();
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('owner');
      repo.findBySlug.mockResolvedValue(undefined);
      repo.updateById.mockResolvedValue(makeWs({ name: 'Updated', slug: 'updated' }));
      const updated = await workspaceService.updateWorkspace(WS_ID, { name: 'Updated' }, USER_ID);
      expect(updated.name).toBe('Updated');

      // ARCHIVE (as owner)
      repo.findById.mockResolvedValue(makeWs({ name: 'Updated', slug: 'updated' }));
      repo.getMemberRole.mockResolvedValue('owner');
      repo.archiveById.mockResolvedValue(
        makeWs({ name: 'Updated', slug: 'updated', archivedAt: new Date() }),
      );
      const archived = await workspaceService.archiveWorkspace(WS_ID, USER_ID);
      expect(archived.archivedAt).toBeTruthy();

      // RESTORE (as owner)
      vi.clearAllMocks();
      repo.findById.mockResolvedValue(
        makeWs({ name: 'Updated', slug: 'updated', archivedAt: new Date() }),
      );
      repo.getMemberRole.mockResolvedValue('owner');
      repo.restoreById.mockResolvedValue(makeWs({ name: 'Updated', slug: 'updated' }));
      const restored = await workspaceService.restoreWorkspace(WS_ID, USER_ID);
      expect(restored.archivedAt).toBeNull();

      // DELETE (must archive first)
      vi.clearAllMocks();
      repo.findById.mockResolvedValue(
        makeWs({ name: 'Updated', slug: 'updated', archivedAt: new Date() }),
      );
      repo.getMemberRole.mockResolvedValue('owner');
      repo.deleteById.mockResolvedValue(true);
      await expect(workspaceService.deleteWorkspace(WS_ID, USER_ID)).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Member management lifecycle
  // ═══════════════════════════════════════════════════════════

  describe('Member management lifecycle', () => {
    it('should add → list → remove member', async () => {
      const ws = makeWs();

      // ADD MEMBER (as admin)
      repo.findById.mockResolvedValue(ws);
      repo.getMemberRole.mockResolvedValue('admin');
      repo.isMember.mockResolvedValue(false);
      repo.addMember.mockResolvedValue(makeMember({ userId: OTHER_USER_ID, role: 'member' }));
      const added = await workspaceService.addWorkspaceMember(
        WS_ID,
        OTHER_USER_ID,
        'member',
        USER_ID,
      );
      expect(added.userId).toBe(OTHER_USER_ID);

      // LIST MEMBERS (as member)
      repo.findById.mockResolvedValue(ws);
      repo.isMember.mockResolvedValue(true);
      repo.getMembers.mockResolvedValue([
        makeMember({ role: 'owner', userId: USER_ID }),
        makeMember({ id: 'm2', userId: OTHER_USER_ID, role: 'member' }),
      ]);
      const members = await workspaceService.getWorkspaceMembers(WS_ID, USER_ID);
      expect(members).toHaveLength(2);

      // REMOVE MEMBER (as admin)
      repo.findById.mockResolvedValue(ws);
      repo.getMemberRole.mockResolvedValueOnce('admin').mockResolvedValueOnce('member');
      repo.removeMember.mockResolvedValue(true);
      await expect(
        workspaceService.removeWorkspaceMember(WS_ID, OTHER_USER_ID, USER_ID),
      ).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Permission checks across operations
  // ═══════════════════════════════════════════════════════════

  describe('Permission checks across operations', () => {
    const ws = makeWs();

    it('should enforce role hierarchy on member management', async () => {
      // Owner can assign any role
      repo.findById.mockResolvedValue(ws);
      repo.getMemberRole.mockResolvedValue('owner');
      repo.isMember.mockResolvedValue(false);
      repo.addMember.mockResolvedValue(makeMember({ role: 'admin', userId: OTHER_USER_ID }));

      const admin = await workspaceService.addWorkspaceMember(
        WS_ID,
        OTHER_USER_ID,
        'admin',
        USER_ID,
      );
      expect(admin.role).toBe('admin');
    });

    it('should prevent member from performing admin actions', async () => {
      repo.findById.mockResolvedValue(ws);
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        workspaceService.addWorkspaceMember(WS_ID, OTHER_USER_ID, 'member', USER_ID),
      ).rejects.toThrow(AppError);

      await expect(workspaceService.updateWorkspace(WS_ID, { name: 'X' }, USER_ID)).rejects.toThrow(
        AppError,
      );

      await expect(workspaceService.archiveWorkspace(WS_ID, USER_ID)).rejects.toThrow(AppError);
    });

    it('should enforce membership check on read operations', async () => {
      repo.findById.mockResolvedValue(ws);
      repo.isMember.mockResolvedValue(false);

      await expect(workspaceService.getWorkspace(WS_ID, OTHER_USER_ID)).rejects.toThrow(AppError);

      await expect(workspaceService.getWorkspaceMembers(WS_ID, OTHER_USER_ID)).rejects.toThrow(
        AppError,
      );
    });

    it('should enforce archive-before-delete lifecycle', async () => {
      // Active workspace — cannot delete
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('owner');

      await expect(workspaceService.deleteWorkspace(WS_ID, USER_ID)).rejects.toThrow(AppError);

      // Archived workspace — can delete
      repo.findById.mockResolvedValue(makeWs({ archivedAt: new Date() }));
      repo.getMemberRole.mockResolvedValue('owner');
      repo.deleteById.mockResolvedValue(true);

      await expect(workspaceService.deleteWorkspace(WS_ID, USER_ID)).resolves.toBeUndefined();
    });
  });
});
