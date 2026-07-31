import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { authRoutes } from './modules/auth/index.js';
import { organizationRoutes } from './modules/organization/index.js';
import { workspaceRoutes } from './modules/workspace/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { authenticate } from './middleware/auth.js';

const app: express.Express = express();

// ── Trust proxy (required behind load balancers/reverse proxies) ──
app.set('trust proxy', 1);

// ── Security middleware ──────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

// ── Rate limiting (global) ───────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

app.use(limiter as unknown as express.RequestHandler);
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── CSRF protection (Origin/Referer header validation) ────────
function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Only apply to state-changing methods
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  // Allow health check and public auth endpoints (login, register, refresh)
  const path = req.path;
  if (
    path === '/health' ||
    path.startsWith('/api/auth/login') ||
    path.startsWith('/api/auth/register') ||
    path.startsWith('/api/auth/google') ||
    path === '/api/auth/refresh'
  ) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const expectedOrigin = env.CORS_ORIGIN;

  // If no Origin or Referer is present, reject state-changing requests.
  // Legitimate browser requests always include one of these headers.
  if (!origin && !referer) {
    res.status(403).json({
      error: 'CSRF validation failed: missing Origin and Referer headers',
      code: 'CSRF_MISSING_HEADER',
    });
    return;
  }

  const source = origin ?? referer;
  if (!source || !source.startsWith(expectedOrigin)) {
    res.status(403).json({
      error: 'CSRF validation failed: origin mismatch',
      code: 'CSRF_ORIGIN_MISMATCH',
    });
    return;
  }

  next();
}

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API routes ───────────────────────────────────────────────
app.use(csrfProtection);
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/workspaces', workspaceRoutes);

// ── Task routes (minimal — full task module pending) ─────────
const taskRouter = express.Router();
taskRouter.use(authenticate);

taskRouter.get('/my', (_req, res) => {
  res.json({ data: { tasks: [] }, success: true });
});

taskRouter.post('/', (req: Request, res: Response) => {
  const { title, description, priority } = req.body as {
    title?: string;
    description?: string;
    priority?: string;
  };
  if (!title || typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }
  const now = new Date().toISOString();
  const task = {
    id: `task-${Date.now()}`,
    title: title.trim(),
    description: description ?? null,
    status: 'todo' as const,
    priority: priority ?? 'medium',
    assigneeId: null,
    boardId: 'board-default',
    columnId: 'col-todo',
    sprintId: null,
    position: 0,
    labels: [],
    dueDate: null,
    createdAt: now,
    updatedAt: now,
  };
  res.status(201).json({ data: { task }, success: true });
});

app.use('/api/tasks', taskRouter);

// ── 404 handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler ────────────────────────────────────────────
app.use(errorHandler);

export default app;
