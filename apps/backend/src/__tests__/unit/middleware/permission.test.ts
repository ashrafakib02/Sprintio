import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReq, createMockRes, createMockNext } from '../../helpers.js';

vi.mock('../../../config/env.js', () => ({
  env: {},
}));

vi.mock('../../../config/database.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../db/schema/users.js', () => ({
  users: { id: 'id', role: 'role' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

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

import { requirePermission } from '../../../middleware/permission.js';
import { db } from '../../../config/database.js';

describe('requirePermission middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when req.user is not set', async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requirePermission('workspace:create');
    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when user not found in database', async () => {
    const req = createMockReq({ user: { userId: 'user-1' } });
    const res = createMockRes();
    const next = createMockNext();

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const middleware = requirePermission('workspace:create');
    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should allow owner to bypass all permission checks', async () => {
    const req = createMockReq({ user: { userId: 'user-1' } });
    const res = createMockRes();
    const next = createMockNext();

    // Owner should bypass even without DB lookup (but code still queries if no cached role)
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ role: 'owner' }]),
        }),
      }),
    });

    const middleware = requirePermission('workspace:create', 'workspace:delete');
    await middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should skip DB lookup when role is already cached on req.userRole', async () => {
    const req = createMockReq({ user: { userId: 'user-1' } });
    (req as Record<string, unknown>).userRole = 'owner';
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requirePermission('workspace:create');
    await middleware(req, res as never, next);

    // Should NOT call db.select since role is cached
    expect(db.select).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it('should allow member to access board:create permission', async () => {
    const req = createMockReq({ user: { userId: 'user-1' } });
    const res = createMockRes();
    const next = createMockNext();

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ role: 'member' }]),
        }),
      }),
    });

    const middleware = requirePermission('board:create');
    await middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should deny member from workspace:create permission', async () => {
    const req = createMockReq({ user: { userId: 'user-1' } });
    const res = createMockRes();
    const next = createMockNext();

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ role: 'member' }]),
        }),
      }),
    });

    const middleware = requirePermission('workspace:create');
    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.code).toBe('FORBIDDEN');
    expect(body.required).toContain('workspace:create');
  });

  it('should deny guest from task:update permission', async () => {
    const req = createMockReq({ user: { userId: 'user-1' } });
    const res = createMockRes();
    const next = createMockNext();

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ role: 'guest' }]),
        }),
      }),
    });

    const middleware = requirePermission('task:update');
    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should require ALL permissions when multiple are specified', async () => {
    const req = createMockReq({ user: { userId: 'user-1' } });
    const res = createMockRes();
    const next = createMockNext();

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ role: 'guest' }]),
        }),
      }),
    });

    // Guest has board:create and task:create, but NOT task:update
    const middleware = requirePermission('board:create', 'task:update');
    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should pass when admin has required workspace permissions', async () => {
    const req = createMockReq({ user: { userId: 'user-1' } });
    const res = createMockRes();
    const next = createMockNext();

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ role: 'admin' }]),
        }),
      }),
    });

    const middleware = requirePermission('workspace:update', 'workspace:manage_members');
    await middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should default to member role when user.role is null', async () => {
    const req = createMockReq({ user: { userId: 'user-1' } });
    const res = createMockRes();
    const next = createMockNext();

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ role: null }]),
        }),
      }),
    });

    const middleware = requirePermission('board:create');
    await middleware(req, res as never, next);

    // null role defaults to 'member', which has board:create
    expect(next).toHaveBeenCalledWith();
  });
});
