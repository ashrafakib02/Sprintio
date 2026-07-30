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
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    ),
  };
});

import * as workspaceService from '../../modules/workspace/workspace.service.js';
import { workspaceRepo } from '@sprintio/db/repositories';
import { AppError } from '@sprintio/shared';

const repo = vi.mocked(workspaceRepo);

// ── Helpers ──────────────────────────────────────────────────

const WS_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440002';
const THIRD_USER_ID = '550e8400-e29b-41d4-a716-446655440004';
const ORG_ID = '550e8400-e29b-41d4-a716-446655440003';

function makeWs(overrides: Partial<{
  id: string; name: string; slug: string; description: string | null;
  logo: string | null; brandColor: string | null; customDomain: string | null;
  organizationId: string | null; plan: string;
  archivedAt: Date | null; createdAt: Date; updatedAt: Date;
}> = {}) {
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

function makeMember(overrides: Partial<{
  id: string; workspaceId: string; userId: string; role: string; createdAt: Date;
}> = {}) {
  return {
    id: 'member-1',
    workspaceId: WS_ID,
    userId: USER_ID,
    role: 'member',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeMemberWithUser(overrides: Partial<{
  id: string; workspaceId: string; userId: string; role: string; createdAt: Date;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}> = {}) {
  return {
    id: 'member-1',
    workspaceId: WS_ID,
    userId: USER_ID,
    role: 'member',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    user: {
      id: USER_ID,
      name: 'Test User',
      email: 'test@example.com',
      avatarUrl: null,
    },
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────

describe('Workspace Switching Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // resolveWorkspaceContext (switch)
  // ═══════════════════════════════════════════════════════════

  describe('resolveWorkspaceContext (switch)', () => {
    it('should return workspace, role, and members for valid member', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('admin');
      repo.getMembersWithUsers.mockResolvedValue([makeMemberWithUser()]);

      const result = await workspaceService.resolveWorkspaceContext(WS_ID, USER_ID);

      expect(result.workspace).toBeDefined();
      expect(result.workspace.name).toBe('Test Workspace');
      expect(result.userRole).toBe('admin');
      expect(result.members).toBeDefined();
      expect(Array.isArray(result.members)).toBe(true);
    });

    it('should return all member details including user info', async () => {
      const members = [
        makeMemberWithUser({
          id: 'm1',
          userId: USER_ID,
          role: 'owner',
          user: { id: USER_ID, name: 'Owner User', email: 'owner@example.com', avatarUrl: null },
        }),
        makeMemberWithUser({
          id: 'm2',
          userId: OTHER_USER_ID,
          role: 'admin',
          user: { id: OTHER_USER_ID, name: 'Admin User', email: 'admin@example.com', avatarUrl: 'https://avatar.example.com/admin.jpg' },
        }),
        makeMemberWithUser({
          id: 'm3',
          userId: THIRD_USER_ID,
          role: 'member',
          user: { id: THIRD_USER_ID, name: 'Member User', email: 'member@example.com', avatarUrl: null },
        }),
      ];

      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('owner');
      repo.getMembersWithUsers.mockResolvedValue(members);

      const result = await workspaceService.resolveWorkspaceContext(WS_ID, USER_ID);

      expect(result.members).toHaveLength(3);
      expect(result.members[0].user.name).toBe('Owner User');
      expect(result.members[0].user.email).toBe('owner@example.com');
      expect(result.members[1].user.name).toBe('Admin User');
      expect(result.members[1].user.avatarUrl).toBe('https://avatar.example.com/admin.jpg');
      expect(result.members[2].user.name).toBe('Member User');
      expect(result.members[2].user.email).toBe('member@example.com');
    });

    it('should throw NOT_FOUND for non-existent workspace', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(
        workspaceService.resolveWorkspaceContext(WS_ID, USER_ID),
      ).rejects.toThrow(AppError);

      try {
        await workspaceService.resolveWorkspaceContext(WS_ID, USER_ID);
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(404);
      }
    });

    it('should throw FORBIDDEN for non-member', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue(undefined);

      await expect(
        workspaceService.resolveWorkspaceContext(WS_ID, OTHER_USER_ID),
      ).rejects.toThrow(AppError);

      try {
        await workspaceService.resolveWorkspaceContext(WS_ID, OTHER_USER_ID);
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(403);
      }
    });

    it('should return correct role for each role level', async () => {
      const roles = ['owner', 'admin', 'member', 'guest'] as const;

      for (const role of roles) {
        vi.clearAllMocks();
        repo.findById.mockResolvedValue(makeWs());
        repo.getMemberRole.mockResolvedValue(role);
        repo.getMembersWithUsers.mockResolvedValue([makeMemberWithUser({ role })]);

        const result = await workspaceService.resolveWorkspaceContext(WS_ID, USER_ID);
        expect(result.userRole).toBe(role);
      }
    });

    it('should handle workspace with organization context', async () => {
      repo.findById.mockResolvedValue(makeWs({ organizationId: ORG_ID }));
      repo.getMemberRole.mockResolvedValue('member');
      repo.getMembersWithUsers.mockResolvedValue([makeMemberWithUser({ role: 'member' })]);

      const result = await workspaceService.resolveWorkspaceContext(WS_ID, USER_ID);

      expect(result.workspace.organizationId).toBe(ORG_ID);
      expect(result.userRole).toBe('member');
    });

    it('should include workspace metadata in the context result', async () => {
      const ws = makeWs({
        name: 'My Dev Workspace',
        slug: 'my-dev-workspace',
        description: 'Development workspace for the team',
        logo: 'https://logo.example.com/ws.png',
        brandColor: '#3b82f6',
        customDomain: 'dev.sprintio.app',
        plan: 'pro',
        organizationId: ORG_ID,
      });

      repo.findById.mockResolvedValue(ws);
      repo.getMemberRole.mockResolvedValue('owner');
      repo.getMembersWithUsers.mockResolvedValue([]);

      const result = await workspaceService.resolveWorkspaceContext(WS_ID, USER_ID);

      expect(result.workspace.name).toBe('My Dev Workspace');
      expect(result.workspace.slug).toBe('my-dev-workspace');
      expect(result.workspace.description).toBe('Development workspace for the team');
      expect(result.workspace.logo).toBe('https://logo.example.com/ws.png');
      expect(result.workspace.brandColor).toBe('#3b82f6');
      expect(result.workspace.customDomain).toBe('dev.sprintio.app');
      expect(result.workspace.plan).toBe('pro');
    });

    it('should return empty members list for workspace with only one member', async () => {
      repo.findById.mockResolvedValue(makeWs());
      repo.getMemberRole.mockResolvedValue('owner');
      repo.getMembersWithUsers.mockResolvedValue([]);

      const result = await workspaceService.resolveWorkspaceContext(WS_ID, USER_ID);

      expect(result.members).toHaveLength(0);
    });

    it('should serialize dates as ISO strings in context result', async () => {
      const ws = makeWs({
        archivedAt: null,
        createdAt: new Date('2025-06-15T10:30:00Z'),
        updatedAt: new Date('2025-07-01T14:00:00Z'),
      });

      repo.findById.mockResolvedValue(ws);
      repo.getMemberRole.mockResolvedValue('admin');
      repo.getMembersWithUsers.mockResolvedValue([
        makeMemberWithUser({
          createdAt: new Date('2025-06-20T08:00:00Z'),
        }),
      ]);

      const result = await workspaceService.resolveWorkspaceContext(WS_ID, USER_ID);

      expect(result.workspace.createdAt).toBe('2025-06-15T10:30:00.000Z');
      expect(result.workspace.updatedAt).toBe('2025-07-01T14:00:00.000Z');
      expect(result.members[0].createdAt).toBe('2025-06-20T08:00:00.000Z');
    });
  });
});
