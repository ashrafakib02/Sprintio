import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReq, createMockRes, createMockNext } from '../../helpers.js';

vi.mock('@sprintio/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sprintio/shared')>();
  return {
    ...actual,
    PERMISSIONS: {
      WORKSPACE: {
        CREATE: 'workspace:create',
        UPDATE: 'workspace:update',
        DELETE: 'workspace:delete',
        MANAGE_MEMBERS: 'workspace:manage_members',
        MANAGE_BILLING: 'workspace:manage_billing',
      },
      BOARD: {
        CREATE: 'board:create',
        UPDATE: 'board:update',
        DELETE: 'board:delete',
      },
      TASK: {
        CREATE: 'task:create',
        UPDATE: 'task:update',
        DELETE: 'task:delete',
        ASSIGN: 'task:assign',
      },
      DOCUMENT: {
        CREATE: 'document:create',
        UPDATE: 'document:update',
        DELETE: 'document:delete',
      },
    },
  };
});

vi.mock('../../../config/env.js', () => ({
  env: {
    DEFAULT_USER_ROLE: 'member',
  },
}));

import { requirePermission } from '../../../middleware/permission.js';

describe('requirePermission middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when req.user is not set', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requirePermission('workspace:create');
    middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when req.user has no userId', () => {
    const req = createMockReq({ user: { email: 'test@test.com' } });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requirePermission('workspace:create');
    middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow owner to bypass all permission checks', () => {
    const req = createMockReq({
      user: { userId: 'user-1', role: 'owner' },
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requirePermission('workspace:create', 'workspace:delete');
    middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should skip role lookup when role is already cached on req.userRole', () => {
    const req = createMockReq({ user: { userId: 'user-1' } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).userRole = 'owner';
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requirePermission('workspace:create');
    middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should allow member to access board:create permission', () => {
    const req = createMockReq({
      user: { userId: 'user-1', role: 'member' },
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requirePermission('board:create');
    middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should deny member from workspace:create permission', () => {
    const req = createMockReq({
      user: { userId: 'user-1', role: 'member' },
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requirePermission('workspace:create');
    middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.code).toBe('FORBIDDEN');
    // Permission info is no longer included in 403 responses (security fix)
  });

  it('should deny guest from task:update permission', () => {
    const req = createMockReq({
      user: { userId: 'user-1', role: 'guest' },
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requirePermission('task:update');
    middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should require ALL permissions when multiple are specified', () => {
    const req = createMockReq({
      user: { userId: 'user-1', role: 'guest' },
    });
    const res = createMockRes();
    const next = createMockNext();

    // Guest has board:create and task:create, but NOT task:update
    const middleware = requirePermission('board:create', 'task:update');
    middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should pass when admin has required workspace permissions', () => {
    const req = createMockReq({
      user: { userId: 'user-1', role: 'admin' },
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requirePermission('workspace:update', 'workspace:manage_members');
    middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should default to member role when user.role is undefined', () => {
    const req = createMockReq({
      user: { userId: 'user-1' },
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requirePermission('board:create');
    middleware(req, res as never, next);

    // undefined role defaults to 'member', which has board:create
    expect(next).toHaveBeenCalledWith();
  });
});
