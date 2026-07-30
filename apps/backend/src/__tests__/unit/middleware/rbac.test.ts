import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReq, createMockRes, createMockNext } from '../../helpers.js';

// ── Mocks ─────────────────────────────────────────────────────

vi.mock('../../../config/env.js', () => ({
  env: { DEFAULT_USER_ROLE: 'member' },
}));

vi.mock('../../../config/db-for-repos.js', () => ({
  repoDb: {},
}));

vi.mock('@sprintio/db/repositories', () => ({
  workspaceRepo: {
    getMemberRole: vi.fn(),
    isMember: vi.fn(),
    findById: vi.fn(),
  },
  organizationRepo: {
    getMemberRole: vi.fn(),
    isMember: vi.fn(),
    findById: vi.fn(),
  },
}));

import { requireWorkspacePermission } from '../../../middleware/rbac.js';
import { workspaceRepo } from '@sprintio/db/repositories';

// ── Tests ─────────────────────────────────────────────────────

describe('requireWorkspacePermission middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when req.user is not set', async () => {
    const req = createMockReq({ workspaceId: 'ws-1' });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireWorkspacePermission('workspace:update');
    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 400 when workspaceId is not set', async () => {
    const req = createMockReq({ user: { userId: 'user-1' } });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireWorkspacePermission('workspace:update');
    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.code).toBe('BAD_REQUEST');
  });

  it('should return 403 when user is not a workspace member', async () => {
    vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue(null as never);

    const req = createMockReq({
      user: { userId: 'user-1' },
      workspaceId: 'ws-1',
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireWorkspacePermission('workspace:update');
    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.code).toBe('FORBIDDEN');
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow owner to bypass all permission checks', async () => {
    vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue('owner' as never);

    const req = createMockReq({
      user: { userId: 'user-1' },
      workspaceId: 'ws-1',
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireWorkspacePermission('workspace:delete', 'workspace:manage_members');
    await middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((req as any).workspaceRole).toBe('owner');
  });

  it('should allow admin to access workspace:update permission', async () => {
    vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue('admin' as never);

    const req = createMockReq({
      user: { userId: 'user-1' },
      workspaceId: 'ws-1',
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireWorkspacePermission('workspace:update');
    await middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should allow admin to access workspace:manage_members permission', async () => {
    vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue('admin' as never);

    const req = createMockReq({
      user: { userId: 'user-1' },
      workspaceId: 'ws-1',
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireWorkspacePermission('workspace:manage_members');
    await middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should deny member from workspace:update permission', async () => {
    vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue('member' as never);

    const req = createMockReq({
      user: { userId: 'user-1' },
      workspaceId: 'ws-1',
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireWorkspacePermission('workspace:update');
    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should deny guest from task:update permission', async () => {
    vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue('guest' as never);

    const req = createMockReq({
      user: { userId: 'user-1' },
      workspaceId: 'ws-1',
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireWorkspacePermission('task:update');
    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should allow member to access board:create permission', async () => {
    vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue('member' as never);

    const req = createMockReq({
      user: { userId: 'user-1' },
      workspaceId: 'ws-1',
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireWorkspacePermission('board:create');
    await middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should use cached workspaceRole when available', async () => {
    const req = createMockReq({
      user: { userId: 'user-1' },
      workspaceId: 'ws-1',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).workspaceRole = 'admin';
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireWorkspacePermission('workspace:update');
    await middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
    // Should NOT have called getMemberRole since role was cached
    expect(workspaceRepo.getMemberRole).not.toHaveBeenCalled();
  });

  it('should require ALL permissions when multiple are specified', async () => {
    vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue('member' as never);

    const req = createMockReq({
      user: { userId: 'user-1' },
      workspaceId: 'ws-1',
    });
    const res = createMockRes();
    const next = createMockNext();

    // Member has board:create but NOT workspace:update
    const middleware = requireWorkspacePermission('board:create', 'workspace:update');
    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should pass when admin has all required permissions', async () => {
    vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue('admin' as never);

    const req = createMockReq({
      user: { userId: 'user-1' },
      workspaceId: 'ws-1',
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireWorkspacePermission('workspace:update', 'workspace:manage_members');
    await middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(workspaceRepo.getMemberRole).mockRejectedValue(new Error('DB connection failed'));

    const req = createMockReq({
      user: { userId: 'user-1' },
      workspaceId: 'ws-1',
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireWorkspacePermission('workspace:update');
    await middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  // ── Additional workspace permission tests ─────────────────

  it('should return 403 when guest lacks workspace:update permission', async () => {
    vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue('guest' as never);

    const req = createMockReq({
      user: { userId: 'user-1' },
      workspaceId: 'ws-1',
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireWorkspacePermission('workspace:update');
    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.code).toBe('FORBIDDEN');
    expect(body.error).toBe('Insufficient workspace permissions');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 with FORBIDDEN code when user is not a workspace member', async () => {
    vi.mocked(workspaceRepo.getMemberRole).mockResolvedValue(null as never);

    const req = createMockReq({
      user: { userId: 'user-1' },
      workspaceId: 'ws-1',
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireWorkspacePermission('workspace:update');
    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.code).toBe('FORBIDDEN');
    expect(body.error).toBe('You are not a member of this workspace');
    expect(next).not.toHaveBeenCalled();
  });

  it('should use cached owner role to bypass permission checks without DB lookup', async () => {
    const req = createMockReq({
      user: { userId: 'user-1' },
      workspaceId: 'ws-1',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).workspaceRole = 'owner';
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireWorkspacePermission(
      'workspace:delete',
      'workspace:manage_members',
      'workspace:settings',
    );
    await middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
    expect(workspaceRepo.getMemberRole).not.toHaveBeenCalled();
  });

  it('should deny non-member even with cached empty role', async () => {
    const req = createMockReq({
      user: { userId: 'user-1' },
      workspaceId: 'ws-1',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).workspaceRole = '';
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireWorkspacePermission('workspace:update');
    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
