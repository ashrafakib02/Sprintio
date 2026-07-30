import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────

vi.mock('../../../../config/db-for-repos.js', () => ({
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
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    ),
  };
});

import * as organizationService from '../../../../modules/organization/organization.service.js';
import { organizationRepo } from '@sprintio/db/repositories';
import { AppError } from '@sprintio/shared';

const repo = vi.mocked(organizationRepo);

// ── Helpers ──────────────────────────────────────────────────

const ORG_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440002';

function makeOrg(overrides: Partial<{
  id: string; name: string; slug: string; description: string | null;
  logo: string | null; website: string | null; createdAt: Date;
  updatedAt: Date; archivedAt: Date | null;
}> = {}) {
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

function makeMember(overrides: Partial<{
  id: string; organizationId: string; userId: string; role: string; createdAt: Date;
}> = {}) {
  return {
    id: 'member-1',
    organizationId: ORG_ID,
    userId: USER_ID,
    role: 'member',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────

describe('Organization Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // createOrganization
  // ═══════════════════════════════════════════════════════════

  describe('createOrganization', () => {
    it('should create an organization with slugified name', async () => {
      repo.findBySlug.mockResolvedValue(undefined);
      repo.create.mockResolvedValue(makeOrg());

      const result = await organizationService.createOrganization(USER_ID, {
        name: 'Test Org',
      });

      expect(result.name).toBe('Test Org');
      expect(result.slug).toBe('test-org');
      expect(result.id).toBe(ORG_ID);
      expect(repo.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ slug: 'test-org', name: 'Test Org' }),
      );
    });

    it('should return ISO date strings', async () => {
      repo.findBySlug.mockResolvedValue(undefined);
      repo.create.mockResolvedValue(makeOrg());

      const result = await organizationService.createOrganization(USER_ID, {
        name: 'Test Org',
      });

      expect(typeof result.createdAt).toBe('string');
      expect(typeof result.updatedAt).toBe('string');
      expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should throw CONFLICT when slug already exists (optimistic check)', async () => {
      repo.findBySlug.mockResolvedValue(makeOrg());

      await expect(
        organizationService.createOrganization(USER_ID, { name: 'Test Org' }),
      ).rejects.toThrow(AppError);

      try {
        await organizationService.createOrganization(USER_ID, { name: 'Test Org' });
      } catch (err) {
        expect((err as AppError).code).toBe('CONFLICT');
        expect((err as AppError).statusCode).toBe(409);
      }
    });

    it('should throw CONFLICT on PG 23505 race condition', async () => {
      repo.findBySlug.mockResolvedValue(undefined);
      const pgError = Object.assign(new Error('duplicate key'), { code: '23505' });
      repo.create.mockRejectedValue(pgError);

      await expect(
        organizationService.createOrganization(USER_ID, { name: 'Test Org' }),
      ).rejects.toThrow(AppError);

      try {
        await organizationService.createOrganization(USER_ID, { name: 'Test Org' });
      } catch (err) {
        expect((err as AppError).code).toBe('CONFLICT');
      }
    });

    it('should re-throw non-PG errors', async () => {
      repo.findBySlug.mockResolvedValue(undefined);
      const dbError = new Error('connection lost');
      repo.create.mockRejectedValue(dbError);

      await expect(
        organizationService.createOrganization(USER_ID, { name: 'Test Org' }),
      ).rejects.toThrow('connection lost');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getOrganization
  // ═══════════════════════════════════════════════════════════

  describe('getOrganization', () => {
    it('should return organization when requester is a member', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.isMember.mockResolvedValue(true);

      const result = await organizationService.getOrganization(ORG_ID, USER_ID);

      expect(result.id).toBe(ORG_ID);
      expect(result.name).toBe('Test Org');
      expect(repo.isMember).toHaveBeenCalledWith(expect.anything(), ORG_ID, USER_ID);
    });

    it('should throw NOT_FOUND when organization does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(
        organizationService.getOrganization(ORG_ID, USER_ID),
      ).rejects.toThrow(AppError);

      try {
        await organizationService.getOrganization(ORG_ID, USER_ID);
      } catch (err) {
        expect((err as AppError).code).toBe('NOT_FOUND');
        expect((err as AppError).statusCode).toBe(404);
      }
    });

    it('should throw FORBIDDEN when requester is not a member', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.isMember.mockResolvedValue(false);

      await expect(
        organizationService.getOrganization(ORG_ID, OTHER_USER_ID),
      ).rejects.toThrow(AppError);

      try {
        await organizationService.getOrganization(ORG_ID, OTHER_USER_ID);
      } catch (err) {
        expect((err as AppError).code).toBe('FORBIDDEN');
        expect((err as AppError).statusCode).toBe(403);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getUserOrganizations
  // ═══════════════════════════════════════════════════════════

  describe('getUserOrganizations', () => {
    it('should return user organizations filtered by default', async () => {
      repo.findByUserIdFiltered.mockResolvedValue([makeOrg()]);

      const result = await organizationService.getUserOrganizations(USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Org');
      expect(repo.findByUserIdFiltered).toHaveBeenCalledWith(
        expect.anything(), USER_ID, false,
      );
    });

    it('should include archived when includeArchived is true', async () => {
      const archived = makeOrg({ archivedAt: new Date('2025-06-01T00:00:00Z') });
      repo.findByUserIdFiltered.mockResolvedValue([archived]);

      const result = await organizationService.getUserOrganizations(USER_ID, true);

      expect(result).toHaveLength(1);
      expect(result[0].archivedAt).toBe('2025-06-01T00:00:00.000Z');
      expect(repo.findByUserIdFiltered).toHaveBeenCalledWith(
        expect.anything(), USER_ID, true,
      );
    });

    it('should return empty array when user has no organizations', async () => {
      repo.findByUserIdFiltered.mockResolvedValue([]);

      const result = await organizationService.getUserOrganizations(USER_ID);

      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // updateOrganization
  // ═══════════════════════════════════════════════════════════

  describe('updateOrganization', () => {
    it('should update name and regenerate slug', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('owner');
      repo.findBySlug.mockResolvedValue(undefined);
      repo.updateById.mockResolvedValue(makeOrg({ name: 'New Name', slug: 'new-name' }));

      const result = await organizationService.updateOrganization(
        ORG_ID, { name: 'New Name' }, USER_ID,
      );

      expect(result.name).toBe('New Name');
      expect(result.slug).toBe('new-name');
    });

    it('should update description and website', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('admin');
      repo.updateById.mockResolvedValue(
        makeOrg({ description: 'Updated', website: 'https://example.com' }),
      );

      const result = await organizationService.updateOrganization(
        ORG_ID, { description: 'Updated', website: 'https://example.com' }, USER_ID,
      );

      expect(result.description).toBe('Updated');
      expect(result.website).toBe('https://example.com');
    });

    it('should throw NOT_FOUND when organization does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(
        organizationService.updateOrganization(ORG_ID, { name: 'X' }, USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw FORBIDDEN for non-owner/admin', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        organizationService.updateOrganization(ORG_ID, { name: 'X' }, USER_ID),
      ).rejects.toThrow(AppError);

      try {
        await organizationService.updateOrganization(ORG_ID, { name: 'X' }, USER_ID);
      } catch (err) {
        expect((err as AppError).code).toBe('FORBIDDEN');
      }
    });

    it('should throw FORBIDDEN for undefined role (non-member)', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue(undefined);

      await expect(
        organizationService.updateOrganization(ORG_ID, { name: 'X' }, USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw BAD_REQUEST for archived organization', async () => {
      const archived = makeOrg({ archivedAt: new Date() });
      repo.findById.mockResolvedValue(archived);
      repo.getMemberRole.mockResolvedValue('owner');

      await expect(
        organizationService.updateOrganization(ORG_ID, { name: 'X' }, USER_ID),
      ).rejects.toThrow(AppError);

      try {
        await organizationService.updateOrganization(ORG_ID, { name: 'X' }, USER_ID);
      } catch (err) {
        expect((err as AppError).code).toBe('BAD_REQUEST');
      }
    });

    it('should throw CONFLICT on slug collision', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('owner');
      repo.findBySlug.mockResolvedValue(makeOrg({ id: 'other-id', slug: 'new-name' }));

      await expect(
        organizationService.updateOrganization(ORG_ID, { name: 'New Name' }, USER_ID),
      ).rejects.toThrow(AppError);

      try {
        await organizationService.updateOrganization(ORG_ID, { name: 'New Name' }, USER_ID);
      } catch (err) {
        expect((err as AppError).code).toBe('CONFLICT');
      }
    });

    it('should handle PG 23505 race condition on update', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('owner');
      repo.findBySlug.mockResolvedValue(undefined);
      const pgError = Object.assign(new Error('duplicate key'), { code: '23505' });
      repo.updateById.mockRejectedValue(pgError);

      await expect(
        organizationService.updateOrganization(ORG_ID, { name: 'New' }, USER_ID),
      ).rejects.toThrow(AppError);

      try {
        await organizationService.updateOrganization(ORG_ID, { name: 'New' }, USER_ID);
      } catch (err) {
        expect((err as AppError).code).toBe('CONFLICT');
      }
    });

    it('should not check slug when name is not changing', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('owner');
      repo.updateById.mockResolvedValue(makeOrg());

      await organizationService.updateOrganization(
        ORG_ID, { description: 'Updated desc' }, USER_ID,
      );

      expect(repo.findBySlug).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // archiveOrganization
  // ═══════════════════════════════════════════════════════════

  describe('archiveOrganization', () => {
    it('should archive an active organization', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('owner');
      repo.archiveById.mockResolvedValue(
        makeOrg({ archivedAt: new Date('2025-07-01T00:00:00Z') }),
      );

      const result = await organizationService.archiveOrganization(ORG_ID, USER_ID);

      expect(result.archivedAt).toBeTruthy();
      expect(repo.archiveById).toHaveBeenCalledWith(expect.anything(), ORG_ID);
    });

    it('should throw BAD_REQUEST when already archived', async () => {
      repo.findById.mockResolvedValue(makeOrg({ archivedAt: new Date() }));
      repo.getMemberRole.mockResolvedValue('owner');

      await expect(
        organizationService.archiveOrganization(ORG_ID, USER_ID),
      ).rejects.toThrow(AppError);

      try {
        await organizationService.archiveOrganization(ORG_ID, USER_ID);
      } catch (err) {
        expect((err as AppError).code).toBe('BAD_REQUEST');
        expect((err as AppError).message).toContain('already archived');
      }
    });

    it('should throw FORBIDDEN for member role', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        organizationService.archiveOrganization(ORG_ID, USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw NOT_FOUND when org does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(
        organizationService.archiveOrganization(ORG_ID, USER_ID),
      ).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // restoreOrganization
  // ═══════════════════════════════════════════════════════════

  describe('restoreOrganization', () => {
    it('should restore an archived organization', async () => {
      const archived = makeOrg({ archivedAt: new Date() });
      repo.findById.mockResolvedValue(archived);
      repo.getMemberRole.mockResolvedValue('owner');
      repo.restoreById.mockResolvedValue(makeOrg());

      const result = await organizationService.restoreOrganization(ORG_ID, USER_ID);

      expect(result.archivedAt).toBeNull();
      expect(repo.restoreById).toHaveBeenCalledWith(expect.anything(), ORG_ID);
    });

    it('should throw BAD_REQUEST when not archived', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('owner');

      await expect(
        organizationService.restoreOrganization(ORG_ID, USER_ID),
      ).rejects.toThrow(AppError);

      try {
        await organizationService.restoreOrganization(ORG_ID, USER_ID);
      } catch (err) {
        expect((err as AppError).code).toBe('BAD_REQUEST');
        expect((err as AppError).message).toContain('not archived');
      }
    });

    it('should throw FORBIDDEN for member role', async () => {
      const archived = makeOrg({ archivedAt: new Date() });
      repo.findById.mockResolvedValue(archived);
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        organizationService.restoreOrganization(ORG_ID, USER_ID),
      ).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // deleteOrganization
  // ═══════════════════════════════════════════════════════════

  describe('deleteOrganization', () => {
    it('should delete an archived organization', async () => {
      repo.findById.mockResolvedValue(makeOrg({ archivedAt: new Date() }));
      repo.getMemberRole.mockResolvedValue('owner');
      repo.deleteById.mockResolvedValue(true);

      await expect(
        organizationService.deleteOrganization(ORG_ID, USER_ID),
      ).resolves.toBeUndefined();
      expect(repo.deleteById).toHaveBeenCalledWith(expect.anything(), ORG_ID);
    });

    it('should throw BAD_REQUEST if not archived (must archive first)', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('owner');

      await expect(
        organizationService.deleteOrganization(ORG_ID, USER_ID),
      ).rejects.toThrow(AppError);

      try {
        await organizationService.deleteOrganization(ORG_ID, USER_ID);
      } catch (err) {
        expect((err as AppError).code).toBe('BAD_REQUEST');
        expect((err as AppError).message).toContain('archived');
      }
    });

    it('should throw FORBIDDEN for admin role (only owner can delete)', async () => {
      repo.findById.mockResolvedValue(makeOrg({ archivedAt: new Date() }));
      repo.getMemberRole.mockResolvedValue('admin');

      await expect(
        organizationService.deleteOrganization(ORG_ID, USER_ID),
      ).rejects.toThrow(AppError);

      try {
        await organizationService.deleteOrganization(ORG_ID, USER_ID);
      } catch (err) {
        expect((err as AppError).code).toBe('FORBIDDEN');
      }
    });

    it('should throw NOT_FOUND when org does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(
        organizationService.deleteOrganization(ORG_ID, USER_ID),
      ).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // addOrganizationMember
  // ═══════════════════════════════════════════════════════════

  describe('addOrganizationMember', () => {
    it('should add a member with default role', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('admin');
      repo.isMember.mockResolvedValue(false);
      repo.addMember.mockResolvedValue(makeMember({ userId: OTHER_USER_ID, role: 'member' }));

      const result = await organizationService.addOrganizationMember(
        ORG_ID, OTHER_USER_ID, 'member', USER_ID,
      );

      expect(result.userId).toBe(OTHER_USER_ID);
      expect(result.role).toBe('member');
    });

    it('should add a member with specific role', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('owner');
      repo.isMember.mockResolvedValue(false);
      repo.addMember.mockResolvedValue(makeMember({ role: 'admin' }));

      const result = await organizationService.addOrganizationMember(
        ORG_ID, OTHER_USER_ID, 'admin', USER_ID,
      );

      expect(result.role).toBe('admin');
    });

    it('should throw CONFLICT if user is already a member', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('admin');
      repo.isMember.mockResolvedValue(true);

      await expect(
        organizationService.addOrganizationMember(ORG_ID, OTHER_USER_ID, 'member', USER_ID),
      ).rejects.toThrow(AppError);

      try {
        await organizationService.addOrganizationMember(ORG_ID, OTHER_USER_ID, 'member', USER_ID);
      } catch (err) {
        expect((err as AppError).code).toBe('CONFLICT');
      }
    });

    it('should throw FORBIDDEN for non-admin requester', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        organizationService.addOrganizationMember(ORG_ID, OTHER_USER_ID, 'member', USER_ID),
      ).rejects.toThrow(AppError);

      try {
        await organizationService.addOrganizationMember(ORG_ID, OTHER_USER_ID, 'member', USER_ID);
      } catch (err) {
        expect((err as AppError).code).toBe('FORBIDDEN');
      }
    });

    it('should throw FORBIDDEN when member tries to assign admin', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        organizationService.addOrganizationMember(ORG_ID, OTHER_USER_ID, 'admin', USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw FORBIDDEN when non-owner tries to assign owner', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('admin');

      await expect(
        organizationService.addOrganizationMember(ORG_ID, OTHER_USER_ID, 'owner', USER_ID),
      ).rejects.toThrow(AppError);

      try {
        await organizationService.addOrganizationMember(ORG_ID, OTHER_USER_ID, 'owner', USER_ID);
      } catch (err) {
        expect((err as AppError).message).toContain('owner');
      }
    });

    it('should throw BAD_REQUEST for invalid role string', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('owner');

      await expect(
        organizationService.addOrganizationMember(ORG_ID, OTHER_USER_ID, 'superadmin', USER_ID),
      ).rejects.toThrow(AppError);

      try {
        await organizationService.addOrganizationMember(ORG_ID, OTHER_USER_ID, 'superadmin', USER_ID);
      } catch (err) {
        expect((err as AppError).code).toBe('BAD_REQUEST');
      }
    });

    it('should throw NOT_FOUND when org does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(
        organizationService.addOrganizationMember(ORG_ID, OTHER_USER_ID, 'member', USER_ID),
      ).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // removeOrganizationMember
  // ═══════════════════════════════════════════════════════════

  describe('removeOrganizationMember', () => {
    it('should remove a member', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole
        .mockResolvedValueOnce('admin')  // requester
        .mockResolvedValueOnce('member'); // target
      repo.removeMember.mockResolvedValue(true);

      await expect(
        organizationService.removeOrganizationMember(ORG_ID, OTHER_USER_ID, USER_ID),
      ).resolves.toBeUndefined();
      expect(repo.removeMember).toHaveBeenCalledWith(expect.anything(), ORG_ID, OTHER_USER_ID);
    });

    it('should throw NOT_FOUND when target is not a member', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      // Use mockImplementation to control each call sequentially:
      // Call 1 (requester): 'admin' → passes permission check
      // Call 2 (target): undefined → not a member → NOT_FOUND
      let callCount = 0;
      repo.getMemberRole.mockImplementation(async () => {
        callCount++;
        return callCount === 1 ? 'admin' : undefined;
      });

      try {
        await organizationService.removeOrganizationMember(ORG_ID, OTHER_USER_ID, USER_ID);
        expect.fail('Expected AppError to be thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('NOT_FOUND');
        expect((err as AppError).message).toContain('Member');
      }
    });

    it('should throw BAD_REQUEST when trying to remove the owner', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      let callCount = 0;
      repo.getMemberRole.mockImplementation(async () => {
        callCount++;
        return callCount === 1 ? 'admin' : 'owner';
      });

      try {
        await organizationService.removeOrganizationMember(ORG_ID, OTHER_USER_ID, USER_ID);
        expect.fail('Expected AppError to be thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('BAD_REQUEST');
        expect((err as AppError).message).toContain('owner');
      }
    });

    it('should throw FORBIDDEN for non-admin requester', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.getMemberRole.mockResolvedValue('member');

      await expect(
        organizationService.removeOrganizationMember(ORG_ID, OTHER_USER_ID, USER_ID),
      ).rejects.toThrow(AppError);
    });

    it('should throw NOT_FOUND when org does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(
        organizationService.removeOrganizationMember(ORG_ID, OTHER_USER_ID, USER_ID),
      ).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getOrganizationMembers
  // ═══════════════════════════════════════════════════════════

  describe('getOrganizationMembers', () => {
    it('should return member list for authorized requester', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.isMember.mockResolvedValue(true);
      repo.getMembers.mockResolvedValue([
        makeMember({ role: 'owner', userId: USER_ID }),
        makeMember({ id: 'm2', userId: OTHER_USER_ID, role: 'member' }),
      ]);

      const result = await organizationService.getOrganizationMembers(ORG_ID, USER_ID);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('owner');
      expect(result[1].role).toBe('member');
    });

    it('should throw FORBIDDEN when requester is not a member', async () => {
      repo.findById.mockResolvedValue(makeOrg());
      repo.isMember.mockResolvedValue(false);

      await expect(
        organizationService.getOrganizationMembers(ORG_ID, OTHER_USER_ID),
      ).rejects.toThrow(AppError);

      try {
        await organizationService.getOrganizationMembers(ORG_ID, OTHER_USER_ID);
      } catch (err) {
        expect((err as AppError).code).toBe('FORBIDDEN');
      }
    });

    it('should throw NOT_FOUND when org does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(
        organizationService.getOrganizationMembers(ORG_ID, USER_ID),
      ).rejects.toThrow(AppError);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getUserOrganizationRole
  // ═══════════════════════════════════════════════════════════

  describe('getUserOrganizationRole', () => {
    it('should return the user role', async () => {
      repo.getMemberRole.mockResolvedValue('admin');

      const result = await organizationService.getUserOrganizationRole(ORG_ID, USER_ID);

      expect(result).toBe('admin');
    });

    it('should return undefined for non-member', async () => {
      repo.getMemberRole.mockResolvedValue(undefined);

      const result = await organizationService.getUserOrganizationRole(ORG_ID, OTHER_USER_ID);

      expect(result).toBeUndefined();
    });
  });
});
