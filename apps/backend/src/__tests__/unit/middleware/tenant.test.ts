import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockReq, createMockRes, createMockNext } from '../../helpers.js';

// ── Mocks ─────────────────────────────────────────────────────

vi.mock('../../../config/db-for-repos.js', () => ({
  repoDb: {},
}));

vi.mock('@sprintio/db/repositories', () => ({
  workspaceRepo: {
    findById: vi.fn(),
    isMember: vi.fn(),
  },
}));

vi.mock('@sprintio/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sprintio/shared')>();
  return {
    ...actual,
  };
});

import { extractWorkspaceContext, requireWorkspace } from '../../../middleware/tenant.js';
import { workspaceRepo } from '@sprintio/db/repositories';
import { AppError } from '@sprintio/shared';

const repo = vi.mocked(workspaceRepo);

// ── extractWorkspaceContext ───────────────────────────────────

describe('extractWorkspaceContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract workspaceId from x-workspace-id header', async () => {
    const req = createMockReq({ headers: { 'x-workspace-id': 'ws-header' } });
    const res = createMockRes();
    const next = createMockNext();

    extractWorkspaceContext(req, res, next);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((req as any).workspaceId).toBe('ws-header');
    expect(next).toHaveBeenCalledWith();
  });

  it('should extract workspaceId from req.params.workspaceId', async () => {
    const req = createMockReq({ params: { workspaceId: 'ws-param' } });
    const res = createMockRes();
    const next = createMockNext();

    extractWorkspaceContext(req, res, next);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((req as any).workspaceId).toBe('ws-param');
    expect(next).toHaveBeenCalledWith();
  });

  it('should extract workspaceId from req.query.workspaceId', async () => {
    const req = createMockReq({ query: { workspaceId: 'ws-query' } });
    const res = createMockRes();
    const next = createMockNext();

    extractWorkspaceContext(req, res, next);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((req as any).workspaceId).toBe('ws-query');
    expect(next).toHaveBeenCalledWith();
  });

  it('should prefer header over params over query (priority order)', async () => {
    const req = createMockReq({
      headers: { 'x-workspace-id': 'ws-header' },
      params: { workspaceId: 'ws-param' },
      query: { workspaceId: 'ws-query' },
    });
    const res = createMockRes();
    const next = createMockNext();

    extractWorkspaceContext(req, res, next);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((req as any).workspaceId).toBe('ws-header');
    expect(next).toHaveBeenCalledWith();
  });

  it('should not set workspaceId if none provided (still calls next)', async () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    extractWorkspaceContext(req, res, next);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((req as any).workspaceId).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });
});

// ── requireWorkspace ──────────────────────────────────────────

describe('requireWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call next() when workspace exists and user is member', async () => {
    repo.findById.mockResolvedValue({
      id: 'ws-1',
      organizationId: 'org-1',
    } as never);
    repo.isMember.mockResolvedValue(true as never);

    const req = createMockReq({
      headers: { 'x-workspace-id': 'ws-1' },
      user: { userId: 'user-1' },
    });
    const res = createMockRes();
    const next = createMockNext();

    await requireWorkspace(req, res, next);

    expect(next).toHaveBeenCalledWith();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((req as any).workspaceId).toBe('ws-1');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((req as any).organizationId).toBe('org-1');
  });

  it('should call next(AppError) when no workspaceId provided', async () => {
    const req = createMockReq({ user: { userId: 'user-1' } });
    const res = createMockRes();
    const next = createMockNext();

    await requireWorkspace(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('should call next(AppError) when workspace not found', async () => {
    repo.findById.mockResolvedValue(null as never);

    const req = createMockReq({
      headers: { 'x-workspace-id': 'ws-nonexistent' },
      user: { userId: 'user-1' },
    });
    const res = createMockRes();
    const next = createMockNext();

    await requireWorkspace(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('should call next(AppError) when user is not authenticated (no userId)', async () => {
    repo.findById.mockResolvedValue({
      id: 'ws-1',
      organizationId: 'org-1',
    } as never);

    const req = createMockReq({
      headers: { 'x-workspace-id': 'ws-1' },
    });
    const res = createMockRes();
    const next = createMockNext();

    await requireWorkspace(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('should call next(AppError) when user is not a member', async () => {
    repo.findById.mockResolvedValue({
      id: 'ws-1',
      organizationId: 'org-1',
    } as never);
    repo.isMember.mockResolvedValue(false as never);

    const req = createMockReq({
      headers: { 'x-workspace-id': 'ws-1' },
      user: { userId: 'user-nonmember' },
    });
    const res = createMockRes();
    const next = createMockNext();

    await requireWorkspace(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('should propagate database errors via next(error)', async () => {
    repo.findById.mockRejectedValue(new Error('DB connection failed'));

    const req = createMockReq({
      headers: { 'x-workspace-id': 'ws-1' },
      user: { userId: 'user-1' },
    });
    const res = createMockRes();
    const next = createMockNext();

    await requireWorkspace(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
