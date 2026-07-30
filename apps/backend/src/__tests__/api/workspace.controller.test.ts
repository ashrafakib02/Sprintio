import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────

vi.mock('../../modules/workspace/workspace.service.js', () => ({
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
    CreateWorkspaceSchema: { safeParse: vi.fn() },
    UpdateWorkspaceSchema: { safeParse: vi.fn() },
    AddWorkspaceMemberSchema: { safeParse: vi.fn() },
    ListWorkspacesSchema: { safeParse: vi.fn() },
    UuidSchema: {
      safeParse: vi.fn((val: string) => {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(val)) return { success: true, data: val };
        return { success: false, error: { errors: [{ message: 'Invalid UUID' }] } };
      }),
    },
  };
});

import * as workspaceController from '../../modules/workspace/workspace.controller.js';
import * as workspaceService from '../../modules/workspace/workspace.service.js';
import { createMockReq, createMockRes, createMockNext } from '../helpers.js';
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
  organizationId: null,
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

// ── API Tests (full request → validation → service → response cycle) ──

describe('Workspace API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/workspaces
  // ═══════════════════════════════════════════════════════════

  describe('POST /workspaces', () => {
    it('should return 201 on success', async () => {
      const req = createMockReq({
        body: { name: 'New Workspace' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      vi.mocked(CreateWorkspaceSchema.safeParse).mockReturnValue({
        success: true,
        data: { name: 'New Workspace' },
      } as never);
      vi.mocked(workspaceService.createWorkspace).mockResolvedValue(WS_RESULT as never);

      await workspaceController.createWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(201);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.workspace.name).toBe('Test Workspace');
    });

    it('should return 400 when name is empty', async () => {
      const req = createMockReq({
        body: {},
        user: { userId: USER_ID },
      });
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

    it('should return 409 on conflict', async () => {
      const req = createMockReq({
        body: { name: 'Existing Workspace' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      const next = createMockNext();

      vi.mocked(CreateWorkspaceSchema.safeParse).mockReturnValue({
        success: true,
        data: { name: 'Existing Workspace' },
      } as never);
      vi.mocked(workspaceService.createWorkspace).mockRejectedValue(
        AppError.conflict('A workspace with a similar name already exists'),
      );

      await workspaceController.createWorkspace(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/workspaces
  // ═══════════════════════════════════════════════════════════

  describe('GET /workspaces', () => {
    it('should return 200 with workspaces', async () => {
      const req = createMockReq({ query: {}, user: { userId: USER_ID } });
      const res = createMockRes();

      vi.mocked(ListWorkspacesSchema.safeParse).mockReturnValue({
        success: true,
        data: { includeArchived: 'false' },
      } as never);
      vi.mocked(workspaceService.getUserWorkspaces).mockResolvedValue(
        [WS_RESULT] as never,
      );

      await workspaceController.listWorkspaces(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.workspaces).toHaveLength(1);
    });

    it('should return 400 on invalid includeArchived', async () => {
      const req = createMockReq({ query: { includeArchived: 'bad' }, user: { userId: USER_ID } });
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
  // GET /api/workspaces/:id
  // ═══════════════════════════════════════════════════════════

  describe('GET /workspaces/:id', () => {
    it('should return 200 with workspace', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(workspaceService.getWorkspace).mockResolvedValue(WS_RESULT as never);

      await workspaceController.getWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.workspace.id).toBe(WS_ID);
    });

    it('should return 400 for invalid UUID', async () => {
      const req = createMockReq({
        params: { workspaceId: 'not-a-uuid' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await workspaceController.getWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next(err) on 404 not found', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      const next = createMockNext();
      vi.mocked(workspaceService.getWorkspace).mockRejectedValue(
        AppError.notFound('Workspace'),
      );

      await workspaceController.getWorkspace(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PATCH /api/workspaces/:id
  // ═══════════════════════════════════════════════════════════

  describe('PATCH /workspaces/:id', () => {
    it('should return 200 on success', async () => {
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
      vi.mocked(workspaceService.updateWorkspace).mockResolvedValue(
        { ...WS_RESULT, name: 'Updated' } as never,
      );

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
  // POST /api/workspaces/:id/archive
  // ═══════════════════════════════════════════════════════════

  describe('POST /workspaces/:id/archive', () => {
    it('should return 200 on success', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(workspaceService.archiveWorkspace).mockResolvedValue(
        { ...WS_RESULT, archivedAt: '2025-07-01T00:00:00.000Z' } as never,
      );

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
  // POST /api/workspaces/:id/restore
  // ═══════════════════════════════════════════════════════════

  describe('POST /workspaces/:id/restore', () => {
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
  });

  // ═══════════════════════════════════════════════════════════
  // DELETE /api/workspaces/:id
  // ═══════════════════════════════════════════════════════════

  describe('DELETE /workspaces/:id', () => {
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
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/workspaces/:id/members
  // ═══════════════════════════════════════════════════════════

  describe('POST /workspaces/:id/members', () => {
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
      vi.mocked(workspaceService.addWorkspaceMember).mockResolvedValue(
        MEMBER_RESULT as never,
      );

      await workspaceController.addMember(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(201);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.member.userId).toBe(OTHER_USER_ID);
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

    it('should call next(err) on 409 conflict', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        body: { userId: OTHER_USER_ID, role: 'member' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      const next = createMockNext();

      vi.mocked(AddWorkspaceMemberSchema.safeParse).mockReturnValue({
        success: true,
        data: { userId: OTHER_USER_ID, role: 'member' },
      } as never);
      vi.mocked(workspaceService.addWorkspaceMember).mockRejectedValue(
        AppError.conflict('User is already a member of this workspace'),
      );

      await workspaceController.addMember(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // DELETE /api/workspaces/:id/members/:userId
  // ═══════════════════════════════════════════════════════════

  describe('DELETE /workspaces/:id/members/:userId', () => {
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
  // GET /api/workspaces/:id/members
  // ═══════════════════════════════════════════════════════════

  describe('GET /workspaces/:id/members', () => {
    it('should return 200 with members', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(workspaceService.getWorkspaceMembers).mockResolvedValue(
        [MEMBER_RESULT] as never,
      );

      await workspaceController.listMembers(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.members).toHaveLength(1);
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
  // POST /api/workspaces/:id/switch
  // ═══════════════════════════════════════════════════════════

  describe('POST /workspaces/:id/switch', () => {
    it('should return 200 with workspace context on successful switch', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(workspaceService.resolveWorkspaceContext).mockResolvedValue({
        workspace: WS_RESULT,
        userRole: 'admin',
        members: [],
      } as never);

      await workspaceController.switchWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(body.data.workspace).toEqual(WS_RESULT);
      expect(body.data.userRole).toBe('admin');
      expect(body.data.members).toEqual([]);
    });

    it('should return 400 for invalid workspace UUID', async () => {
      const req = createMockReq({
        params: { workspaceId: 'not-a-uuid' },
        user: { userId: USER_ID },
      });
      const res = createMockRes();

      await workspaceController.switchWorkspace(req, res as never, createMockNext());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next(err) when workspace not found (404)', async () => {
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

    it('should call next(err) when user is not a member (403)', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      const next = createMockNext();
      vi.mocked(workspaceService.resolveWorkspaceContext).mockRejectedValue(
        AppError.forbidden('You are not a member'),
      );

      await workspaceController.switchWorkspace(req, res as never, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should pass correct workspaceId and userId to service', async () => {
      const req = createMockReq({
        params: { workspaceId: WS_ID },
        user: { userId: USER_ID },
      });
      const res = createMockRes();
      vi.mocked(workspaceService.resolveWorkspaceContext).mockResolvedValue({
        workspace: WS_RESULT,
        userRole: 'admin',
        members: [],
      } as never);

      await workspaceController.switchWorkspace(req, res as never, createMockNext());

      expect(workspaceService.resolveWorkspaceContext).toHaveBeenCalledWith(WS_ID, USER_ID);
    });
  });
});
