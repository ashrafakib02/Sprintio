import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReq, createMockRes, createMockNext } from '../../helpers.js';

import { requireRole } from '../../../middleware/role.js';

describe('requireRole middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when req.user is not set', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireRole('admin');
    middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when req.user has no userId', () => {
    const req = createMockReq({ user: { email: 'test@test.com' } });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireRole('admin');
    middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next and set req.userRole when role matches', () => {
    const req = createMockReq({
      user: { userId: 'user-123', email: 'test@test.com', role: 'admin' },
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireRole('admin');
    middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((req as any).userRole).toBe('admin');
  });

  it('should allow multiple accepted roles', () => {
    const req = createMockReq({
      user: { userId: 'user-123', email: 'test@test.com', role: 'member' },
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireRole('admin', 'member');
    middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should return 403 when role does not match', () => {
    const req = createMockReq({
      user: { userId: 'user-123', email: 'test@test.com', role: 'member' },
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireRole('admin');
    middleware(req, res as never, next);

    expect(res.status).toHaveBeenCalledWith(403);
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.code).toBe('FORBIDDEN');
    expect(body.error).toBe('Insufficient permissions');
    // Role info is no longer included in 403 responses (security fix)
  });

  it('should default to "member" role when user.role is undefined', () => {
    const req = createMockReq({
      user: { userId: 'user-123', email: 'test@test.com' },
    });
    const res = createMockRes();
    const next = createMockNext();

    const middleware = requireRole('member');
    middleware(req, res as never, next);

    expect(next).toHaveBeenCalledWith();
  });
});
