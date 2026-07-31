import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────

vi.mock('../../config/db-for-repos.js', () => ({
  repoDb: {},
}));

vi.mock('@sprintio/db/repositories', () => ({
  organizationRepo: {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findByUserId: vi.fn(),
    findByUserIdFiltered: vi.fn(),
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

import * as organizationService from '../../modules/organization/organization.service.js';
import { organizationRepo } from '@sprintio/db/repositories';
import { AppError } from '@sprintio/shared';

const repo = vi.mocked(organizationRepo);

// ── Helpers ──────────────────────────────────────────────────

const ORG_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440002';

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
    description: 'A test org',
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
    organizationId: string;
    userId: string;
    role: string;
    createdAt: Date;
  }> = {},
) {
  return {
    id: 'member-1',
    organizationId: ORG_ID,
    userId: USER_ID,
    role: 'member',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

// ── Integration Tests ────────────────────────────────────────

describe('Organization Service — Integration Flows', () => {
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
      repo.create.mockResolvedValue(makeOrg());
      const created = await organizationService.createOrganization(USER_ID, { name: 'Test Org' });
      expect(created.id).toBe(ORG_ID);

      // GET (as owner)
      vi.clearAllMocks();
      repo.findById.mockResolvedValue(makeOrg());
      repo.isMember.mockResolvedValue(true);
      const fetched = await organizationService.getOrganization(ORG_ID, USER_ID);
      expect(fetched.name).toBe('Test Org');

      // UPDATE (as owner)
      vi.clearAllMocks();
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('owner');
      repo.findBySlug.mockResolvedValue(undefined);
      repo.updateById.mockResolvedValue(makeOrg({ name: 'Updated Org', slug: 'updated-org' }));
      const result = await organizationService.updateOrganization(
        ORG_ID,
        { name: 'Updated Org' },
        USER_ID,
      );
      expect(result.name).toBe('Updated Org');

      // ARCHIVE (as owner)
      repo.findById.mockResolvedValue(makeOrg({ name: 'Updated Org', slug: 'updated-org' }));
      repo.getMemberRole.mockResolvedValue('owner');
      repo.archiveById.mockResolvedValue(
        makeOrg({ name: 'Updated Org', slug: 'updated-org', archivedAt: new Date() }),
      );
      const archivedResult = await organizationService.archiveOrganization(ORG_ID, USER_ID);
      expect(archivedResult.archivedAt).toBeTruthy();

      // RESTORE (as owner)
      repo.findById.mockResolvedValue(
        makeOrg({ name: 'Updated Org', slug: 'updated-org', archivedAt: new Date() }),
      );
      repo.getMemberRole.mockResolvedValue('owner');
      repo.restoreById.mockResolvedValue(makeOrg({ name: 'Updated Org', slug: 'updated-org' }));
      const restoredResult = await organizationService.restoreOrganization(ORG_ID, USER_ID);
      expect(restoredResult.archivedAt).toBeNull();

      // DELETE (must archive first)
      repo.findById.mockResolvedValue(
        makeOrg({ name: 'Updated Org', slug: 'updated-org', archivedAt: new Date() }),
      );
      repo.getMemberRole.mockResolvedValue('owner');
      repo.deleteById.mockResolvedValue(true);
      await expect(
        organizationService.deleteOrganization(ORG_ID, USER_ID),
      ).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Member management lifecycle
  // ═══════════════════════════════════════════════════════════

  describe('Member management lifecycle', () => {
    it('should add → list → remove member', async () => {
      const org = makeOrg();

      // ADD MEMBER (as admin)
      repo.findById.mockResolvedValue(org);
      repo.getMemberRole.mockResolvedValue('admin');
      repo.isMember.mockResolvedValue(false);
      repo.addMember.mockResolvedValue(makeMember({ userId: OTHER_USER_ID, role: 'member' }));
      const added = await organizationService.addOrganizationMember(
        ORG_ID,
        OTHER_USER_ID,
        'member',
        USER_ID,
      );
      expect(added.userId).toBe(OTHER_USER_ID);

      // LIST MEMBERS (as member)
      repo.findById.mockResolvedValue(org);
      repo.isMember.mockResolvedValue(true);
      repo.getMembers.mockResolvedValue([
        makeMember({ role: 'owner', userId: USER_ID }),
        makeMember({ id: 'm2', userId: OTHER_USER_ID, role: 'member' }),
      ]);
      const members = await organizationService.getOrganizationMembers(ORG_ID, USER_ID);
      expect(members).toHaveLength(2);

      // REMOVE MEMBER (as admin)
      repo.findById.mockResolvedValue(org);
      repo.getMemberRole.mockResolvedValueOnce('admin').mockResolvedValueOnce('member');
      repo.removeMember.mockResolvedValue(true);
      await expect(
        organizationService.removeOrganizationMember(ORG_ID, OTHER_USER_ID, USER_ID),
      ).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Permission checks across operations
  // ═══════════════════════════════════════════════════════════

  describe('Permission checks across operations', () => {
    const org = makeOrg();

    it('should enforce role hierarchy on member management', async () => {
      // Owner can assign any role
      repo.findById.mockResolvedValue(org);
      repo.getMemberRole.mockResolvedValue('owner');
      repo.isMember.mockResolvedValue(false);
      repo.addMember.mockResolvedValue(makeMember({ role: 'admin', userId: OTHER_USER_ID }));

      const admin = await organizationService.addOrganizationMember(
        ORG_ID,
        OTHER_USER_ID,
        'admin',
        USER_ID,
      );
      expect(admin.role).toBe('admin');
    });

    it('should prevent member from performing admin actions', async () => {
      repo.findById.mockResolvedValue(org);
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        organizationService.addOrganizationMember(ORG_ID, OTHER_USER_ID, 'member', USER_ID),
      ).rejects.toThrow(AppError);

      await expect(
        organizationService.updateOrganization(ORG_ID, { name: 'X' }, USER_ID),
      ).rejects.toThrow(AppError);

      await expect(organizationService.archiveOrganization(ORG_ID, USER_ID)).rejects.toThrow(
        AppError,
      );
    });

    it('should enforce membership check on read operations', async () => {
      repo.findById.mockResolvedValue(org);
      repo.isMember.mockResolvedValue(false);

      await expect(organizationService.getOrganization(ORG_ID, OTHER_USER_ID)).rejects.toThrow(
        AppError,
      );

      await expect(
        organizationService.getOrganizationMembers(ORG_ID, OTHER_USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should enforce archive-before-delete lifecycle', async () => {
      // Active org — cannot delete
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('owner');

      await expect(organizationService.deleteOrganization(ORG_ID, USER_ID)).rejects.toThrow(
        AppError,
      );

      // Archived org — can delete
      repo.findById.mockResolvedValue(makeOrg({ archivedAt: new Date() }));
      repo.getMemberRole.mockResolvedValue('owner');
      repo.deleteById.mockResolvedValue(true);

      await expect(
        organizationService.deleteOrganization(ORG_ID, USER_ID),
      ).resolves.toBeUndefined();
    });
  });
});
