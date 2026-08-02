import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    create: vi.fn().mockImplementation((_db: unknown, data: Record<string, unknown>, userId: string) =>
      Promise.resolve({
        id: 'task-1',
        title: data.title ?? 'mocked',
        description: data.description ?? null,
        status: 'todo',
        priority: data.priority ?? 'medium',
        assigneeId: data.assigneeId ?? userId,
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
}));

vi.mock('helmet', () => ({ default: () => (_req: unknown, _res: unknown, next: () => void) => next() }));
vi.mock('cors', () => ({ default: () => (_req: unknown, _res: unknown, next: () => void) => next() }));
vi.mock('compression', () => ({ default: () => (_req: unknown, _res: unknown, next: () => void) => next() }));
vi.mock('express-rate-limit', () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import request from 'supertest';
import app from '../../app.js';
import { getAccessTokenFromRequest } from '../../utils/cookie.js';
import { verifyAccessToken } from '../../utils/jwt.js';

const USER_ID = 'user-123';
const USER_EMAIL = 'test@test.com';
const PROJECT_ID = 'project-abc';

const MOCK_JWT_PAYLOAD = {
  userId: USER_ID,
  email: USER_EMAIL,
  role: 'member' as const,
  jti: 'jti-1',
  deviceId: 'device-test-1',
  iat: Math.floor(Date.now() / 1000),
};

describe('POST /api/tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should auto-assign creator when no assigneeId provided', async () => {
    vi.mocked(getAccessTokenFromRequest).mockReturnValue('valid-token');
    vi.mocked(verifyAccessToken).mockResolvedValue(MOCK_JWT_PAYLOAD);

    const res = await request(app)
      .post('/api/tasks')
      .set('Origin', 'http://localhost:5173')
      .send({ title: 'Test Task', description: 'desc', priority: 'medium', projectId: PROJECT_ID });

    expect(res.status).toBe(201);
    expect(res.body.data.task.title).toBe('Test Task');
    expect(res.body.data.task.description).toBe('desc');
    expect(res.body.data.task.priority).toBe('medium');
    expect(res.body.data.task.assigneeId).toBe(USER_ID);
  });

  it('should use explicit assigneeId when provided', async () => {
    vi.mocked(getAccessTokenFromRequest).mockReturnValue('valid-token');
    vi.mocked(verifyAccessToken).mockResolvedValue(MOCK_JWT_PAYLOAD);

    const explicitAssignee = 'other-user-456';
    const res = await request(app)
      .post('/api/tasks')
      .set('Origin', 'http://localhost:5173')
      .send({ title: 'Assigned Task', projectId: PROJECT_ID, assigneeId: explicitAssignee });

    expect(res.status).toBe(201);
    expect(res.body.data.task.assigneeId).toBe(explicitAssignee);
    expect(res.body.data.task.assigneeId).not.toBe(USER_ID);
  });

  it('should return 401 without auth', async () => {
    vi.mocked(getAccessTokenFromRequest).mockReturnValue(undefined);

    const res = await request(app)
      .post('/api/tasks')
      .set('Origin', 'http://localhost:5173')
      .send({ title: 'No Auth Task' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authentication required');
  });

  it('should return 400 when title is missing', async () => {
    vi.mocked(getAccessTokenFromRequest).mockReturnValue('valid-token');
    vi.mocked(verifyAccessToken).mockResolvedValue(MOCK_JWT_PAYLOAD);

    const res = await request(app)
      .post('/api/tasks')
      .set('Origin', 'http://localhost:5173')
      .send({ description: 'no title' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Title is required');
  });
});
