import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────

vi.mock('../../../../modules/organization/organization.service.js', () => ({
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

vi.mock('../../../../utils/response.js', () => ({
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

import * as organizationController from '../../../../modules/organization/organization.controller.js';
import * as organizationService from '../../../../modules/organization/organization.service.js';
import { createMockReq, createMockRes, createMockNext } from '../../../helpers.js';
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

// ── Tests ────────────────────────────────────────────────────

describe('Organization Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // createOrganization
  // ═══════════════════════════════════════════════════════════

  describe('createOrganization', () => {
    it('should return 201 with organization on success', async () => {
      const req = createMockReq({
        body: { name: 'Test Org' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(CreateOrganizationSchema.safeParse).mockReturnValue({
        success: true,
        data: { name: 'Test Org' },
      } as never);
      vi.mocked(organizationService.createOrganization).mockResolvedValue(ORG_RESULT as never);

      await organizationController.createOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 on validation failure', async () => {
      const req = createMockReq({ body: {}, user: { userId: USER_ID } });
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

    it('should pass userId from req.user to service', async () => {
      const req = createMockReq({
        body: { name: 'Test Org' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(CreateOrganizationSchema.safeParse).mockReturnValue({
        success: true,
        data: { name: 'Test Org' },
      } as never);
      vi.mocked(organizationService.createOrganization).mockResolvedValue(ORG_RESULT as never);

      await organizationController.createOrganization(req, res as never, createMockNext());

      expect(organizationService.createOrganization).toHaveBeenCalledWith(USER_ID, {
        name: 'Test Org',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getOrganization
  // ═══════════════════════════════════════════════════════════

  describe('getOrganization', () => {
    it('should return 200 with organization', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(organizationService.getOrganization).mockResolvedValue(ORG_RESULT as never);

      await organizationController.getOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on invalid UUID', async () => {
      const req = createMockReq({
        params: { organizationId: 'not-a-uuid' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await organizationController.getOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.error).toContain('Invalid');
    });

    it('should call next(error) on service errors (asyncHandler pattern)', async () => {
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

      // asyncHandler catches the error and calls next(err)
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // listOrganizations
  // ═══════════════════════════════════════════════════════════

  describe('listOrganizations', () => {
    it('should return 200 with organizations array', async () => {
      const req = createMockReq({
        query: {},
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(ListOrganizationsSchema.safeParse).mockReturnValue({
        success: true,
        data: { includeArchived: 'false' },
      } as never);
      vi.mocked(organizationService.getUserOrganizations).mockResolvedValue([ORG_RESULT] as never);

      await organizationController.listOrganizations(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should parse includeArchived query param', async () => {
      const req = createMockReq({
        query: { includeArchived: 'true' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(ListOrganizationsSchema.safeParse).mockReturnValue({
        success: true,
        data: { includeArchived: 'true' },
      } as never);
      vi.mocked(organizationService.getUserOrganizations).mockResolvedValue([]);

      await organizationController.listOrganizations(req, res as never, createMockNext());

      expect(organizationService.getUserOrganizations).toHaveBeenCalledWith(USER_ID, true);
    });

    it('should return 400 on invalid query', async () => {
      const req = createMockReq({
        query: { includeArchived: 'invalid' },
        user: { userId: USER_ID },
      });
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
  // updateOrganization
  // ═══════════════════════════════════════════════════════════

  describe('updateOrganization', () => {
    it('should return 200 with updated organization', async () => {
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

    it('should return 400 on invalid UUID', async () => {
      const req = createMockReq({
        params: { organizationId: 'bad-id' },
        body: { name: 'X' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await organizationController.updateOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // archiveOrganization
  // ═══════════════════════════════════════════════════════════

  describe('archiveOrganization', () => {
    it('should return 200 with archived organization', async () => {
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

    it('should return 400 on invalid UUID', async () => {
      const req = createMockReq({
        params: { organizationId: 'not-uuid' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await organizationController.archiveOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next(error) when service throws', async () => {
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
  // restoreOrganization
  // ═══════════════════════════════════════════════════════════

  describe('restoreOrganization', () => {
    it('should return 200 with restored organization', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(organizationService.restoreOrganization).mockResolvedValue(ORG_RESULT as never);

      await organizationController.restoreOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on invalid UUID', async () => {
      const req = createMockReq({
        params: { organizationId: 'bad' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await organizationController.restoreOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next(error) when service throws', async () => {
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
  // deleteOrganization
  // ═══════════════════════════════════════════════════════════

  describe('deleteOrganization', () => {
    it('should return 200 with success message', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(organizationService.deleteOrganization).mockResolvedValue(undefined);

      await organizationController.deleteOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on invalid UUID', async () => {
      const req = createMockReq({
        params: { organizationId: 'bad' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await organizationController.deleteOrganization(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next(error) when service throws', async () => {
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
  // addMember
  // ═══════════════════════════════════════════════════════════

  describe('addMember', () => {
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

    it('should return 400 on invalid org UUID', async () => {
      const req = createMockReq({
        params: { organizationId: 'bad' },
        body: { userId: OTHER_USER_ID, role: 'member' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await organizationController.addMember(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next(error) when service throws', async () => {
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
  // removeMember
  // ═══════════════════════════════════════════════════════════

  describe('removeMember', () => {
    it('should return 200 with success message', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID, userId: OTHER_USER_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(organizationService.removeOrganizationMember).mockResolvedValue(undefined);

      await organizationController.removeMember(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on invalid org UUID', async () => {
      const req = createMockReq({
        params: { organizationId: 'bad', userId: OTHER_USER_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await organizationController.removeMember(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on invalid user UUID', async () => {
      const req = createMockReq({
        params: { organizationId: ORG_ID, userId: 'bad' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await organizationController.removeMember(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next(error) when service throws', async () => {
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
  // listMembers
  // ═══════════════════════════════════════════════════════════

  describe('listMembers', () => {
    it('should return 200 with members array', async () => {
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
    });

    it('should return 400 on invalid UUID', async () => {
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
