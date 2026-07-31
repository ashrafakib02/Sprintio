import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────

vi.mock('../../modules/organization/organization.service.js', () => ({
  createOrganization: vi.fn(),
  getOrganization: vi.fn(),
  getUserOrganizations: vi.fn(),
  updateOrganization: vi.fn(),
  archiveOrganization: vi.fn(),
  restoreOrganization: vi.fn(),
  deleteOrganization: vi.fn(),
  addOrganizationMember: vi.fn(),
  removeOrganizationMember: vi.fn(),
  getOrganizationMembers: vi.fn(),
  getUserOrganizationRole: vi.fn(),
}));

vi.mock('../../utils/response.js', () => ({
  sendSuccess: vi.fn((res: unknown, data: unknown, statusCode = 200) => {
    (res as { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> })
      .status(statusCode)
      .json({ data });
  }),
}));

vi.mock('@sprintio/shared', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    CreateOrganizationSchema: { safeParse: vi.fn() },
    UpdateOrganizationSchema: { safeParse: vi.fn() },
    AddOrganizationMemberSchema: { safeParse: vi.fn() },
    ListOrganizationsSchema: { safeParse: vi.fn() },
    UuidSchema: {
      safeParse: vi.fn((val: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(val)) return { success: true, data: val };
        return { success: false, error: { errors: [{ message: 'Invalid UUID' }] } };
      }),
    },
  };
});

import * as organizationController from '../../modules/organization/organization.controller.js';
import * as organizationService from '../../modules/organization/organization.service.js';
import { createMockReq, createMockRes, createMockNext } from '../helpers.js';
import {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  AddOrganizationMemberSchema,
  ListOrganizationsSchema,
} from '@sprintio/shared';
import { AppError } from '@sprintio/shared';

const ORG_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440002';

const ORG_RESULT = {
  id: ORG_ID,
  name: 'Test Org',
  slug: 'test-org',
  description: null,
  logo: null,
  website: null,
  archivedAt: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const MEMBER_RESULT = {
  id: 'member-1',
  organizationId: ORG_ID,
  userId: OTHER_USER_ID,
  role: 'member',
  createdAt: '2025-01-01T00:00:00.000Z',
};

// ── API Tests (full request → validation → service → response cycle) ──

describe('Organization API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/organizations
  // ═══════════════════════════════════════════════════════════

  describe('POST /organizations', () => {
    it('should return 201 on success', async () => {
      const req = createMockReq({
        body: { name: 'New Org' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(CreateOrganizationSchema.safeParse).mockReturnValue({
        success: true,
        data: { name: 'New Org' },
      } as never);
      vi.mocked(organizationService.createOrganization).mockResolvedValue(ORG_RESULT as never);

      await organizationController.createOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(201);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.organization.name).toBe('Test Org');
    });

    it('should return 400 when name is empty', async () => {
      const req = createMockReq({
        body: {},
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(CreateOrganizationSchema.safeParse).mockReturnValue({
        success: false,
        error: { errors: [{ message: 'Name is required' }] },
      } as never);

      await organizationController.createOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.error).toContain('Name is required');
    });

    it('should return 409 on conflict', async () => {
      const req = createMockReq({
        body: { name: 'Existing Org' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      const next = createMockNext();

      vi.mocked(CreateOrganizationSchema.safeParse).mockReturnValue({
        success: true,
        data: { name: 'Existing Org' },
      } as never);
      vi.mocked(organizationService.createOrganization).mockRejectedValue(
        AppError.conflict('An organization with a similar name already exists'),
      );

      await organizationController.createOrganization(req, res as never, next);

      // asyncHandler catches the error and calls next(err)
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/organizations
  // ═══════════════════════════════════════════════════════════

  describe('GET /organizations', () => {
    it('should return 200 with organizations', async () => {
      const req = createMockReq({ query: {}, user: { userId: USER_ID } });
      const res = createMockRes();

      vi.mocked(ListOrganizationsSchema.safeParse).mockReturnValue({
        success: true,
        data: { includeArchived: 'false' },
      } as never);
      vi.mocked(organizationService.getUserOrganizations).mockResolvedValue([ORG_RESULT] as never);

      await organizationController.listOrganizations(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.organizations).toHaveLength(1);
    });

    it('should return 400 on invalid includeArchived', async () => {
      const req = createMockReq({ query: { includeArchived: 'bad' }, user: { userId: USER_ID } });
      const res = createMockRes();

      vi.mocked(ListOrganizationsSchema.safeParse).mockReturnValue({
        success: false,
        error: { errors: [{ message: 'Invalid value' }] },
      } as never);

      await organizationController.listOrganizations(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/organizations/:id
  // ═══════════════════════════════════════════════════════════

  describe('GET /organizations/:id', () => {
    it('should return 200 with organization', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(organizationService.getOrganization).mockResolvedValue(ORG_RESULT as never);

      await organizationController.getOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.organization.id).toBe(ORG_ID);
    });

    it('should return 400 for invalid UUID', async () => {
      const req = createMockReq({
        params: { organizationId: 'not-a-uuid' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await organizationController.getOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next(err) on 404 not found', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      const next = createMockNext();
      vi.mocked(organizationService.getOrganization).mockRejectedValue(
        AppError.notFound('Organization'),
      );

      await organizationController.getOrganization(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PATCH /api/organizations/:id
  // ═══════════════════════════════════════════════════════════

  describe('PATCH /organizations/:id', () => {
    it('should return 200 on success', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID },
        body: { name: 'Updated' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(UpdateOrganizationSchema.safeParse).mockReturnValue({
        success: true,
        data: { name: 'Updated' },
      } as never);
      vi.mocked(organizationService.updateOrganization).mockResolvedValue({
        ...ORG_RESULT,
        name: 'Updated',
      } as never);

      await organizationController.updateOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on validation failure', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID },
        body: {},
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(UpdateOrganizationSchema.safeParse).mockReturnValue({
        success: false,
        error: { errors: [{ message: 'Invalid' }] },
      } as never);

      await organizationController.updateOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next(err) on 403 authorization error', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID },
        body: { name: 'X' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      const next = createMockNext();

      vi.mocked(UpdateOrganizationSchema.safeParse).mockReturnValue({
        success: true,
        data: { name: 'X' },
      } as never);
      vi.mocked(organizationService.updateOrganization).mockRejectedValue(
        AppError.forbidden('Insufficient organization permissions'),
      );

      await organizationController.updateOrganization(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/organizations/:id/archive
  // ═══════════════════════════════════════════════════════════

  describe('POST /organizations/:id/archive', () => {
    it('should return 200 on success', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(organizationService.archiveOrganization).mockResolvedValue({
        ...ORG_RESULT,
        archivedAt: '2025-07-01T00:00:00.000Z',
      } as never);

      await organizationController.archiveOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid UUID', async () => {
      const req = createMockReq({
        params: { organizationId: 'bad' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await organizationController.archiveOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next(err) when service throws', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      const next = createMockNext();
      vi.mocked(organizationService.archiveOrganization).mockRejectedValue(
        AppError.badRequest('Organization is already archived'),
      );

      await organizationController.archiveOrganization(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/organizations/:id/restore
  // ═══════════════════════════════════════════════════════════

  describe('POST /organizations/:id/restore', () => {
    it('should return 200 on success', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(organizationService.restoreOrganization).mockResolvedValue(ORG_RESULT as never);

      await organizationController.restoreOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid UUID', async () => {
      const req = createMockReq({
        params: { organizationId: 'bad' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await organizationController.restoreOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next(err) when service throws', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      const next = createMockNext();
      vi.mocked(organizationService.restoreOrganization).mockRejectedValue(
        AppError.badRequest('Organization is not archived'),
      );

      await organizationController.restoreOrganization(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // DELETE /api/organizations/:id
  // ═══════════════════════════════════════════════════════════

  describe('DELETE /organizations/:id', () => {
    it('should return 200 with success message', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(organizationService.deleteOrganization).mockResolvedValue(undefined);

      await organizationController.deleteOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.message).toBe('Organization deleted');
    });

    it('should return 400 for invalid UUID', async () => {
      const req = createMockReq({
        params: { organizationId: 'bad' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await organizationController.deleteOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next(err) when service throws', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      const next = createMockNext();
      vi.mocked(organizationService.deleteOrganization).mockRejectedValue(
        AppError.badRequest('Organization must be archived before it can be permanently deleted'),
      );

      await organizationController.deleteOrganization(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/organizations/:id/members
  // ═══════════════════════════════════════════════════════════

  describe('POST /organizations/:id/members', () => {
    it('should return 201 with member', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID },
        body: { userId: OTHER_USER_ID, role: 'member' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(AddOrganizationMemberSchema.safeParse).mockReturnValue({
        success: true,
        data: { userId: OTHER_USER_ID, role: 'member' },
      } as never);
      vi.mocked(organizationService.addOrganizationMember).mockResolvedValue(
        MEMBER_RESULT as never,
      );

      await organizationController.addMember(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(201);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.member.userId).toBe(OTHER_USER_ID);
    });

    it('should return 400 on validation failure', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID },
        body: {},
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(AddOrganizationMemberSchema.safeParse).mockReturnValue({
        success: false,
        error: { errors: [{ message: 'userId is required' }] },
      } as never);

      await organizationController.addMember(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next(err) on 409 conflict', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID },
        body: { userId: OTHER_USER_ID, role: 'member' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      const next = createMockNext();

      vi.mocked(AddOrganizationMemberSchema.safeParse).mockReturnValue({
        success: true,
        data: { userId: OTHER_USER_ID, role: 'member' },
      } as never);
      vi.mocked(organizationService.addOrganizationMember).mockRejectedValue(
        AppError.conflict('User is already a member of this organization'),
      );

      await organizationController.addMember(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // DELETE /api/organizations/:id/members/:userId
  // ═══════════════════════════════════════════════════════════

  describe('DELETE /organizations/:id/members/:userId', () => {
    it('should return 200 with success message', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID, userId: OTHER_USER_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(organizationService.removeOrganizationMember).mockResolvedValue(undefined);

      await organizationController.removeMember(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.message).toBe('Member removed');
    });

    it('should return 400 for invalid org UUID', async () => {
      const req = createMockReq({
        params: { organizationId: 'bad', userId: OTHER_USER_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await organizationController.removeMember(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid user UUID', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID, userId: 'bad' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await organizationController.removeMember(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next(err) when service throws', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID, userId: OTHER_USER_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      const next = createMockNext();
      vi.mocked(organizationService.removeOrganizationMember).mockRejectedValue(
        AppError.notFound('Member'),
      );

      await organizationController.removeMember(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/organizations/:id/members
  // ═══════════════════════════════════════════════════════════

  describe('GET /organizations/:id/members', () => {
    it('should return 200 with members', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(organizationService.getOrganizationMembers).mockResolvedValue([
        MEMBER_RESULT,
      ] as never);

      await organizationController.listMembers(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.members).toHaveLength(1);
    });

    it('should return 400 for invalid UUID', async () => {
      const req = createMockReq({
        params: { organizationId: 'bad' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await organizationController.listMembers(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
