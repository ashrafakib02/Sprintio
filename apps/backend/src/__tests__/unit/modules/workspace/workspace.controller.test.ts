import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────

vi.mock('../../../../modules/workspace/workspace.service.js', () => ({
  createWorkspace: vi.fn(),
  getWorkspace: vi.fn(),
  getUserWorkspaces: vi.fn(),
  getOrganizationWorkspaces: vi.fn(),
  updateWorkspace: vi.fn(),
  archiveWorkspace: vi.fn(),
  restoreWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  addWorkspaceMember: vi.fn(),
  removeWorkspaceMember: vi.fn(),
  getWorkspaceMembers: vi.fn(),
  getUserWorkspaceRole: vi.fn(),
  resolveWorkspaceContext: vi.fn(),
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
    CreateWorkspaceSchema: { safeParse: vi.fn() },
    UpdateWorkspaceSchema: { safeParse: vi.fn() },
    AddWorkspaceMemberSchema: { safeParse: vi.fn() },
    ListWorkspacesSchema: { safeParse: vi.fn() },
    UuidSchema: {
      safeParse: vi.fn((val: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(val)) return { success: true, data: val };
        return { success: false, error: { errors: [{ message: 'Invalid UUID' }] } };
      }),
    },
  };
});

import * as workspaceController from '../../../../modules/workspace/workspace.controller.js';
import * as workspaceService from '../../../../modules/workspace/workspace.service.js';
import { createMockReq, createMockRes, createMockNext } from '../../../helpers.js';
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  AddWorkspaceMemberSchema,
  ListWorkspacesSchema,
} from '@sprintio/shared';
import { AppError } from '@sprintio/shared';

const WS_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440002';

const WS_RESULT = {
  id: WS_ID,
  name: 'Test Workspace',
  slug: 'test-workspace',
  description: null,
  logo: null,
  brandColor: null,
  customDomain: null,
  organizationId: 'org-test-001',
  plan: 'free',
  archivedAt: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const MEMBER_RESULT = {
  id: 'member-1',
  workspaceId: WS_ID,
  userId: OTHER_USER_ID,
  role: 'member',
  createdAt: '2025-01-01T00:00:00.000Z',
};

// ── Tests ────────────────────────────────────────────────────

describe('Workspace Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // createWorkspace
  // ═══════════════════════════════════════════════════════════

  describe('createWorkspace', () => {
    it('should return 201 with workspace on success', async () => {
      const req = createMockReq({
        body: { name: 'Test Workspace' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(CreateWorkspaceSchema.safeParse).mockReturnValue({
        success: true,
        data: { name: 'Test Workspace' },
      } as never);
      vi.mocked(workspaceService.createWorkspace).mockResolvedValue(WS_RESULT as never);

      await workspaceController.createWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 on validation failure', async () => {
      const req = createMockReq({ body: {}, user: { userId: USER_ID } });
      const res = createMockRes();

      vi.mocked(CreateWorkspaceSchema.safeParse).mockReturnValue({
        success: false,
        error: { errors: [{ message: 'Name is required' }] },
      } as never);

      await workspaceController.createWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.error).toContain('Name is required');
    });

    it('should pass userId and organizationId to service', async () => {
      const req = createMockReq({
        body: { name: 'Ws', organizationId: 'org-123' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(CreateWorkspaceSchema.safeParse).mockReturnValue({
        success: true,
        data: { name: 'Ws', organizationId: 'org-123' },
      } as never);
      vi.mocked(workspaceService.createWorkspace).mockResolvedValue(WS_RESULT as never);

      await workspaceController.createWorkspace(req, res as never, createMockNext());

      expect(workspaceService.createWorkspace).toHaveBeenCalledWith(USER_ID, {
        name: 'Ws',
        organizationId: 'org-123',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getWorkspace
  // ═══════════════════════════════════════════════════════════

  describe('getWorkspace', () => {
    it('should return 200 with workspace', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(workspaceService.getWorkspace).mockResolvedValue(WS_RESULT as never);

      await workspaceController.getWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid UUID', async () => {
      const req = createMockReq({
        params: { workspaceId: 'not-a-uuid' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await workspaceController.getWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.error).toContain('Invalid');
    });

    it('should call next(error) on service errors (asyncHandler pattern)', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      const next = createMockNext();
      vi.mocked(workspaceService.getWorkspace).mockRejectedValue(AppError.notFound('Workspace'));

      await workspaceController.getWorkspace(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // listWorkspaces
  // ═══════════════════════════════════════════════════════════

  describe('listWorkspaces', () => {
    it('should return 200 with workspaces array', async () => {
      const req = createMockReq({ query: {}, user: { userId: USER_ID } });
      const res = createMockRes();

      vi.mocked(ListWorkspacesSchema.safeParse).mockReturnValue({
        success: true,
        data: { includeArchived: 'false' },
      } as never);
      vi.mocked(workspaceService.getUserWorkspaces).mockResolvedValue([WS_RESULT] as never);

      await workspaceController.listWorkspaces(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should parse includeArchived query param', async () => {
      const req = createMockReq({
        query: { includeArchived: 'true' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(ListWorkspacesSchema.safeParse).mockReturnValue({
        success: true,
        data: { includeArchived: 'true' },
      } as never);
      vi.mocked(workspaceService.getUserWorkspaces).mockResolvedValue([]);

      await workspaceController.listWorkspaces(req, res as never, createMockNext());

      expect(workspaceService.getUserWorkspaces).toHaveBeenCalledWith(USER_ID, true);
    });

    it('should return 400 on invalid query', async () => {
      const req = createMockReq({
        query: { includeArchived: 'invalid' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(ListWorkspacesSchema.safeParse).mockReturnValue({
        success: false,
        error: { errors: [{ message: 'Invalid value' }] },
      } as never);

      await workspaceController.listWorkspaces(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getWorkspaceContext
  // ═══════════════════════════════════════════════════════════

  describe('getWorkspaceContext', () => {
    it('should return 200 with context', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(workspaceService.resolveWorkspaceContext).mockResolvedValue({
        workspace: WS_RESULT as never,
        userRole: 'admin',
        members: [],
      });

      await workspaceController.getWorkspaceContext(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid UUID', async () => {
      const req = createMockReq({
        params: { workspaceId: 'bad' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await workspaceController.getWorkspaceContext(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // updateWorkspace
  // ═══════════════════════════════════════════════════════════

  describe('updateWorkspace', () => {
    it('should return 200 with updated workspace', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        body: { name: 'Updated' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(UpdateWorkspaceSchema.safeParse).mockReturnValue({
        success: true,
        data: { name: 'Updated' },
      } as never);
      vi.mocked(workspaceService.updateWorkspace).mockResolvedValue({
        ...WS_RESULT,
        name: 'Updated',
      } as never);

      await workspaceController.updateWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 on validation failure', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        body: {},
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(UpdateWorkspaceSchema.safeParse).mockReturnValue({
        success: false,
        error: { errors: [{ message: 'Invalid' }] },
      } as never);

      await workspaceController.updateWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on invalid UUID', async () => {
      const req = createMockReq({
        params: { workspaceId: 'bad-id' },
        body: { name: 'X' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await workspaceController.updateWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next(err) on 403 authorization error', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        body: { name: 'X' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      const next = createMockNext();

      vi.mocked(UpdateWorkspaceSchema.safeParse).mockReturnValue({
        success: true,
        data: { name: 'X' },
      } as never);
      vi.mocked(workspaceService.updateWorkspace).mockRejectedValue(
        AppError.forbidden('Insufficient workspace permissions'),
      );

      await workspaceController.updateWorkspace(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // archiveWorkspace
  // ═══════════════════════════════════════════════════════════

  describe('archiveWorkspace', () => {
    it('should return 200 on success', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(workspaceService.archiveWorkspace).mockResolvedValue({
        ...WS_RESULT,
        archivedAt: '2025-07-01T00:00:00.000Z',
      } as never);

      await workspaceController.archiveWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid UUID', async () => {
      const req = createMockReq({
        params: { workspaceId: 'bad' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await workspaceController.archiveWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // restoreWorkspace
  // ═══════════════════════════════════════════════════════════

  describe('restoreWorkspace', () => {
    it('should return 200 on success', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(workspaceService.restoreWorkspace).mockResolvedValue(WS_RESULT as never);

      await workspaceController.restoreWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid UUID', async () => {
      const req = createMockReq({
        params: { workspaceId: 'bad' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await workspaceController.restoreWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // deleteWorkspace
  // ═══════════════════════════════════════════════════════════

  describe('deleteWorkspace', () => {
    it('should return 200 with success message', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(workspaceService.deleteWorkspace).mockResolvedValue(undefined);

      await workspaceController.deleteWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.message).toBe('Workspace deleted');
    });

    it('should return 400 on invalid UUID', async () => {
      const req = createMockReq({
        params: { workspaceId: 'bad' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await workspaceController.deleteWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // addMember
  // ═══════════════════════════════════════════════════════════

  describe('addMember', () => {
    it('should return 201 with member', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        body: { userId: OTHER_USER_ID, role: 'member' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(AddWorkspaceMemberSchema.safeParse).mockReturnValue({
        success: true,
        data: { userId: OTHER_USER_ID, role: 'member' },
      } as never);
      vi.mocked(workspaceService.addWorkspaceMember).mockResolvedValue(MEMBER_RESULT as never);

      await workspaceController.addMember(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 on validation failure', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        body: {},
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(AddWorkspaceMemberSchema.safeParse).mockReturnValue({
        success: false,
        error: { errors: [{ message: 'userId is required' }] },
      } as never);

      await workspaceController.addMember(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 on invalid UUID', async () => {
      const req = createMockReq({
        params: { workspaceId: 'bad' },
        body: { userId: OTHER_USER_ID, role: 'member' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await workspaceController.addMember(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // removeMember
  // ═══════════════════════════════════════════════════════════

  describe('removeMember', () => {
    it('should return 200 with success message', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID, userId: OTHER_USER_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(workspaceService.removeWorkspaceMember).mockResolvedValue(undefined);

      await workspaceController.removeMember(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.message).toBe('Member removed');
    });

    it('should return 400 for invalid workspace UUID', async () => {
      const req = createMockReq({
        params: { workspaceId: 'bad', userId: OTHER_USER_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await workspaceController.removeMember(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid user UUID', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID, userId: 'bad' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await workspaceController.removeMember(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // listMembers
  // ═══════════════════════════════════════════════════════════

  describe('listMembers', () => {
    it('should return 200 with members array', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(workspaceService.getWorkspaceMembers).mockResolvedValue([MEMBER_RESULT] as never);

      await workspaceController.listMembers(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid UUID', async () => {
      const req = createMockReq({
        params: { workspaceId: 'bad' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await workspaceController.listMembers(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // switchWorkspace
  // ═══════════════════════════════════════════════════════════

  describe('switchWorkspace', () => {
    it('should return 200 with workspace context on success', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(workspaceService.resolveWorkspaceContext).mockResolvedValue({
        workspace: WS_RESULT as never,
        userRole: 'admin',
        members: [],
      });

      await workspaceController.switchWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid UUID', async () => {
      const req = createMockReq({
        params: { workspaceId: 'not-a-uuid' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await workspaceController.switchWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.error).toContain('Invalid');
    });

    it('should call next(error) when service throws (e.g., NOT_FOUND, FORBIDDEN)', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      const next = createMockNext();
      vi.mocked(workspaceService.resolveWorkspaceContext).mockRejectedValue(
        AppError.notFound('Workspace'),
      );

      await workspaceController.switchWorkspace(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should pass workspaceId and userId to resolveWorkspaceContext', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(workspaceService.resolveWorkspaceContext).mockResolvedValue({
        workspace: WS_RESULT as never,
        userRole: 'member',
        members: [],
      });

      await workspaceController.switchWorkspace(req, res as never, createMockNext());

      expect(workspaceService.resolveWorkspaceContext).toHaveBeenCalledWith(WS_ID, USER_ID);
    });
  });
});
