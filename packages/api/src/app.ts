import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { loggerMiddleware } from './middleware/logger.middleware.js';

export const app: express.Express = express();

// ─── Global Middleware ───────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(loggerMiddleware);

// ─── Health Check ────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ──────────────────────────────────────────
// TODO: Register route modules
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/users', userRoutes);
// app.use('/api/v1/workspaces', workspaceRoutes);
// app.use('/api/v1/boards', boardRoutes);
// app.use('/api/v1/tasks', taskRoutes);
// app.use('/api/v1/documents', documentRoutes);

// ─── 404 Handler ─────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// ─── Error Handler ───────────────────────────────────
app.use(errorHandler);
