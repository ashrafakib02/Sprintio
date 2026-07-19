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

import { requireRole } from '../../../middleware/role.js';
import { db } from '../../../config/database.js';

describe('requireRole middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when req.user is not set', async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireRole('admin');
    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when user is not found in database', async () => {
    const req = createMockReq({ user: { userId: 'user-123', email: 'test@test.com' } });
    const res = createMockRes();
    const next = createMockNext();

    // Mock DB returning empty result
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]), // no user found
        }),
      }),
    });

    const middleware = requireRole('admin');
    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      error: 'User not found',
      code: 'UNAUTHORIZED',
    });
  });

  it('should call next and set req.userRole when role matches', async () => {
    const req = createMockReq({ user: { userId: 'user-123', email: 'test@test.com' } });
    const res = createMockRes();
    const next = createMockNext();

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ role: 'admin' }]),
        }),
      }),
    });

    const middleware = requireRole('admin');
    await middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((req as any).userRole).toBe('admin');
  });

  it('should allow multiple accepted roles', async () => {
    const req = createMockReq({ user: { userId: 'user-123', email: 'test@test.com' } });
    const res = createMockRes();
    const next = createMockNext();

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ role: 'member' }]),
        }),
      }),
    });

    const middleware = requireRole('admin', 'member');
    await middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should return 403 when role does not match', async () => {
    const req = createMockReq({ user: { userId: 'user-123', email: 'test@test.com' } });
    const res = createMockRes();
    const next = createMockNext();

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ role: 'member' }]),
        }),
      }),
    });

    const middleware = requireRole('admin');
    await middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.code).toBe('FORBIDDEN');
    expect(body.error).toBe('Insufficient permissions');
    // Role info is no longer included in 403 responses (security fix)
  });

  it('should default to "member" role when user.role is null', async () => {
    const req = createMockReq({ user: { userId: 'user-123', email: 'test@test.com' } });
    const res = createMockRes();
    const next = createMockNext();

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ role: null }]),
        }),
      }),
    });

    const middleware = requireRole('member');
    await middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
  });
});
