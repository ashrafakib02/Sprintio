import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';

// ── Mocks (must be before app import) ────────────────────────

vi.mock('../../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    CORS_ORIGIN: 'http://localhost:5173',
  },
}));

vi.mock('../../utils/cookie.js', () => ({
  getAccessTokenFromRequest: vi.fn(),
}));

vi.mock('../../utils/jwt.js', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../../cache/token-blacklist.js', () => ({
  isAccessTokenRevoked: vi.fn().mockResolvedValue(false),
  isUserRevoked: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../modules/auth/index.js', () => ({
  authRoutes: vi.fn(),
}));

vi.mock('../../modules/organization/index.js', () => ({
  organizationRoutes: vi.fn(),
}));

vi.mock('../../modules/workspace/index.js', () => ({
  workspaceRoutes: vi.fn(),
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../config/db-for-repos.js', () => ({
  repoDb: {},
}));

vi.mock('@sprintio/db/repositories', () => ({
  taskRepo: {
    create: vi.fn().mockImplementation((_db: unknown, data: Record<string, unknown>) =>
      Promise.resolve({
        id: 'task-1',
        title: data.title ?? 'mocked',
        description: data.description ?? null,
        status: 'todo',
        priority: data.priority ?? 'medium',
        assigneeId: data.assigneeId ?? null,
        projectId: data.projectId ?? 'project-abc',
        boardId: data.boardId ?? null,
        columnId: data.columnId ?? null,
        sprintId: data.sprintId ?? null,
        position: 0,
        labels: data.labels ?? [],
        dueDate: data.dueDate ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
  },
  projectRepo: {
    findById: vi.fn().mockImplementation((_db: unknown, id: string) => {
      if (id === '00000000-0000-0000-0000-000000000001') {
        return Promise.resolve({
          id: '00000000-0000-0000-0000-000000000001',
          workspaceId: 'workspace-1',
          name: 'Test Project',
        });
      }
      return Promise.resolve(null);
    }),
  },
  workspaceRepo: {
    findById: vi.fn().mockResolvedValue({
      id: 'workspace-1',
      name: 'Test Workspace',
      archivedAt: null,
    }),
    getMemberRole: vi.fn().mockResolvedValue('owner'),
  },
  boardRepo: {
    findByProjectId: vi.fn().mockResolvedValue([{ id: 'board-1', name: 'Main Board' }]),
  },
}));

vi.mock('@sprintio/db/schema', () => ({
  columns: {
    id: 'col-id',
    boardId: 'board-id',
    position: 'position',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => ({})),
  asc: vi.fn(() => ({})),
}));

// ── Mock middleware used by task-nested routes ────────────────
vi.mock('../../middleware/auth.js', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).user = {
      userId: 'user-123',
      email: 'test@test.com',
      role: 'member',
      jti: 'jti-1',
      deviceId: 'device-test-1',
    };
    next();
  },
}));

vi.mock('../../middleware/project-scoping.js', () => ({
  requireProject: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const projectId = req.params.projectId as string;
    if (!projectId) {
      _res.status(400).json({ error: 'Project ID is required' });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).projectId = projectId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).workspaceId = 'workspace-1';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).organizationId = 'org-1';
    next();
  },
}));

vi.mock('../../middleware/rbac.js', () => ({
  requireWorkspacePermission: (_permission: string) => {
    return (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (_req as any).workspaceRole = 'owner';
      next();
    };
  },
}));

// ── Project routes: need a real router with nested task routes ──
vi.mock('../../modules/project/index.js', async () => {
  const taskModule = await vi.importActual<typeof import('../../modules/task/index.js')>(
    '../../modules/task/index.js',
  );
  const router = express.Router();
  router.use('/:projectId/tasks', taskModule.taskNestedRoutes);
  return { projectRoutes: router, projectNestedRoutes: express.Router() };
});

vi.mock('helmet', () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('cors', () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('compression', () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('express-rate-limit', () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import request from 'supertest';
import app from '../../app.js';
import { getAccessTokenFromRequest } from '../../utils/cookie.js';
import { verifyAccessToken } from '../../utils/jwt.js';

const USER_ID = 'user-123';
const USER_EMAIL = 'test@test.com';
const PROJECT_ID = '00000000-0000-0000-0000-000000000001';

const MOCK_JWT_PAYLOAD = {
  userId: USER_ID,
  email: USER_EMAIL,
  role: 'member' as const,
  jti: 'jti-1',
  deviceId: 'device-test-1',
  iat: Math.floor(Date.now() / 1000),
};

describe('POST /api/projects/:projectId/tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should auto-assign creator when no assigneeId provided', async () => {
    vi.mocked(getAccessTokenFromRequest).mockReturnValue('valid-token');
    vi.mocked(verifyAccessToken).mockResolvedValue(MOCK_JWT_PAYLOAD);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/tasks`)
      .set('Origin', 'http://localhost:5173')
      .send({
        title: 'Test Task',
        description: 'desc',
        priority: 'medium',
        columnId: '00000000-0000-0000-0000-000000000099',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.task.title).toBe('Test Task');
    expect(res.body.data.task.description).toBe('desc');
    expect(res.body.data.task.priority).toBe('medium');
    expect(res.body.data.task.assigneeId).toBeNull();
  });

  it('should use explicit assigneeId when provided', async () => {
    vi.mocked(getAccessTokenFromRequest).mockReturnValue('valid-token');
    vi.mocked(verifyAccessToken).mockResolvedValue(MOCK_JWT_PAYLOAD);

    const explicitAssignee = '00000000-0000-0000-0000-000000000099';
    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/tasks`)
      .set('Origin', 'http://localhost:5173')
      .send({
        title: 'Assigned Task',
        assigneeId: explicitAssignee,
        columnId: '00000000-0000-0000-0000-000000000099',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.task.assigneeId).toBe(explicitAssignee);
    expect(res.body.data.task.assigneeId).not.toBe(USER_ID);
  });

  it('should return 400 when title is missing', async () => {
    vi.mocked(getAccessTokenFromRequest).mockReturnValue('valid-token');
    vi.mocked(verifyAccessToken).mockResolvedValue(MOCK_JWT_PAYLOAD);

    const res = await request(app)
      .post(`/api/projects/${PROJECT_ID}/tasks`)
      .set('Origin', 'http://localhost:5173')
      .send({ description: 'no title' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Required');
  });
});
