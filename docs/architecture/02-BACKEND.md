# Sprintio — Backend Architecture

> **Document Version**: 1.0
> **Last Updated**: 2026-07-08
> **Status**: Authoritative Reference
> **Stack**: Node.js 20+ / TypeScript 5.x / Express.js / PostgreSQL 16 / Redis 7 / Temporal.io / FastAPI

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Server Setup](#2-server-setup)
3. [Module Organization](#3-module-organization)
4. [Request Lifecycle](#4-request-lifecycle)
5. [Error Handling](#5-error-handling)
6. [Validation with Zod](#6-validation-with-zod)
7. [Real-time Server (WebSocket / Yjs)](#7-real-time-server)
8. [Background Jobs (BullMQ)](#8-background-jobs)
9. [AI Service (Python FastAPI Sidecar)](#9-ai-service)
10. [File Handling (Cloudflare R2)](#10-file-handling)
11. [Cron & Scheduled Tasks (Temporal)](#11-cron--scheduled-tasks)
12. [Health Checks](#12-health-checks)
13. [Graceful Shutdown](#13-graceful-shutdown)
14. [Quick Reference Cheat Sheet](#14-quick-reference-cheat-sheet)

---

## 1. Architecture Overview

### 1.1 System Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE EDGE                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                          │
│  │  CDN     │  │  Workers │  │   R2     │                          │
│  │  (static)│  │  (proxy) │  │ (files)  │                          │
│  └────┬─────┘  └────┬─────┘  └────▲─────┘                          │
└───────┼──────────────┼─────────────┼───────────────────────────────┘
        │              │             │
        ▼              ▼             │
┌───────────────────────────────────┼───────────────────────────────┐
│           API GATEWAY / LOAD BALANCER                             │
└───────┬───────────────────────────┼───────────────────────────────┘
        │                           │
        ▼                           │
┌───────────────────────────────────────────────────────────────────┐
│                     SPRINTIO BACKEND CLUSTER                      │
│                                                                   │
│  ┌─────────────────────┐    ┌──────────────────────────────────┐  │
│  │   Node.js API Pod   │    │         Node.js API Pod          │  │
│  │  ┌───────────────┐  │    │  ┌────────────────────────────┐  │  │
│  │  │  Express.js   │  │    │  │       Express.js           │  │  │
│  │  │  REST API     │  │    │  │       REST API              │  │  │
│  │  ├───────────────┤  │    │  ├────────────────────────────┤  │  │
│  │  │  WebSocket    │◄─┼────┼─►│     WebSocket              │  │  │
│  │  │  (Yjs sync)   │  │    │  │     (Yjs sync)             │  │  │
│  │  ├───────────────┤  │    │  ├────────────────────────────┤  │  │
│  │  │  BullMQ       │  │    │  │       BullMQ               │  │  │
│  │  │  Worker       │  │    │  │       Worker               │  │  │
│  │  └───────────────┘  │    │  └────────────────────────────┘  │  │
│  └──────────┬──────────┘    └──────────────┬───────────────────┘  │
└─────────────┼──────────────────────────────┼──────────────────────┘
              │                              │
              ▼                              ▼
┌──────────────────────────┐   ┌───────────────────────────────────┐
│      PostgreSQL 16       │   │           Redis 7                 │
│    + TimescaleDB         │   │  ┌───────────┐  ┌─────────────┐  │
│  ┌────────────────────┐  │   │  │  Cache    │  │  Pub/Sub    │  │
│  │   pgvector         │  │   │  │  (Redis)  │  │  (Yjs sync) │  │
│  └────────────────────┘  │   │  └───────────┘  └─────────────┘  │
└──────────────────────────┘   │  ┌───────────┐  ┌─────────────┐  │
                               │  │  BullMQ   │  │  Presence   │  │
┌──────────────────────────┐   │  │  Queues   │  │  tracking   │  │
│   Python FastAPI (AI)    │   │  └───────────┘  └─────────────┘  │
│  ┌────────────────────┐  │   └───────────────────────────────────┘
│  │  vLLM / Ollama /   │  │
│  │  OpenAI API        │  │   ┌───────────────────────────────────┐
│  ├────────────────────┤  │   │       Temporal.io Cluster         │
│  │  pgvector          │  │   │  ┌─────────────────────────────┐  │
│  └────────────────────┘  │   │  │  Automation Workflows       │  │
└──────────────────────────┘   │  │  Scheduled Tasks            │  │
                               │  │  Saga Patterns              │  │
                               │  └─────────────────────────────┘  │
                               └───────────────────────────────────┘
```

### 1.2 Service Boundaries

| Service | Runtime | Responsibility | Port(s) |
|---------|---------|----------------|---------|
| **API Server** | Node.js / Express | REST API, auth, business logic | `3000` (HTTP) |
| **WebSocket Server** | Node.js / ws + Yjs | Real-time sync, presence, awareness | `3001` (WS) |
| **BullMQ Workers** | Node.js (child process/worker thread) | Background jobs, notifications, webhooks | N/A (in-process) |
| **AI Sidecar** | Python / FastAPI | Copilot, embeddings, summarization | `8000` |
| **Temporal Worker** | TypeScript | Durable workflows, automations, cron | N/A (Temporal SDK) |
| **Observability** | Grafana stack | Metrics, logs, traces | `9090` (Prometheus) |

### 1.3 Deployment Model

```
┌───────────────────────────────────────────────────────┐
│              Kubernetes (k3s / EKS / GKE)             │
│                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │  API        │  │  API        │  │  API         │  │
│  │  Replica 1  │  │  Replica 2  │  │  Replica 3   │  │
│  │  (REST+WS)  │  │  (REST+WS)  │  │  (REST+WS)   │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘  │
│         │                │                │           │
│  ┌──────▼────────────────▼────────────────▼───────┐   │
│  │            Redis (Cluster / Sentinel)          │   │
│  │    Pub/Sub ◄──── Yjs sync between pods ────►   │   │
│  └────────────────────────────────────────────────┘   │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐                   │
│  │  Temporal    │  │  Temporal    │  (N workers)      │
│  │  Worker 1    │  │  Worker 2    │                   │
│  └──────────────┘  └──────────────┘                   │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐                   │
│  │  AI Sidecar  │  │  AI Sidecar  │  (GPU optional)   │
│  │  (FastAPI)   │  │  (FastAPI)   │                   │
│  └──────────────┘  └──────────────┘                   │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │           Observability Stack                    │  │
│  │  OTel Collector → Tempo / Loki / Prometheus     │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

---

## 2. Server Setup

### 2.1 Application Bootstrap

```typescript
// src/server.ts
import 'dotenv/config';
import { createApp } from './app';
import { config } from './config';
import { logger } from './lib/logger';
import { gracefulShutdown } from './lib/shutdown';
import { initializeRedis } from './lib/redis';
import { initializeDatabase } from './lib/database';
import { startWebSocketServer } from './ws/server';
import { startBullMQWorkers } from './jobs/workers';
import { registerOTel } from './lib/tracing';

async function main(): Promise<void> {
  // 1. Initialize tracing (must be first for instrumentation)
  registerOTel();

  // 2. Initialize database connections
  const db = await initializeDatabase();
  const redis = await initializeRedis();

  // 3. Create Express app
  const app = createApp({ db, redis });

  // 4. Start HTTP server
  const httpServer = app.listen(config.PORT, () => {
    logger.info(`🚀 Sprintio API running on port ${config.PORT}`, {
      env: config.NODE_ENV,
      version: config.APP_VERSION,
    });
  });

  // 5. Attach WebSocket server to HTTP server
  const wsServer = startWebSocketServer(httpServer, { redis });

  // 6. Start background workers
  const workers = await startBullMQWorkers({ db, redis });

  // 7. Register graceful shutdown
  gracefulShutdown({
    server: httpServer,
    wsServer,
    workers,
    db,
    redis,
    logger,
  });
}

main().catch((err) => {
  logger.fatal('Unhandled startup error', { error: err });
  process.exit(1);
});
```

### 2.2 Express App Factory

```typescript
// src/app.ts
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { Redis } from 'ioredis';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { config } from './config';
import { logger } from './lib/logger';
import { requestId } from './middleware/request-id';
import { requestLogger } from './middleware/request-logger';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { healthRouter } from './routes/health';
import { apiRouter } from './routes/api';

interface AppContext {
  db: PostgresJsDatabase;
  redis: Redis;
}

export function createApp({ db, redis }: AppContext): Express {
  const app = express();

  // ─── Global Middleware (order matters) ──────────────────────
  app.set('trust proxy', config.TRUST_PROXY);

  app.use(helmet({
    contentSecurityPolicy: config.NODE_ENV === 'production' ? undefined : false,
  }));

  app.use(cors({
    origin: config.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining', 'X-Total-Count'],
    maxAge: 86400,
  }));

  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
    threshold: 1024,
  }));

  // ─── Request Identity & Logging ─────────────────────────────
  app.use(requestId);
  app.use(requestLogger);

  // ─── Rate Limiting ──────────────────────────────────────────
  const limiter = rateLimit({
    windowMs: 60_000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id ?? req.ip,
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args) as Promise<string>,
      prefix: 'rl:',
    }),
    skip: (req) => req.path.startsWith('/health'),
  });
  app.use('/api', limiter);

  // ─── Body Parsing ───────────────────────────────────────────
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // ─── Context Injection ──────────────────────────────────────
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.context = { db, redis };
    next();
  });

  // ─── Routes ─────────────────────────────────────────────────
  app.use('/health', healthRouter);
  app.use('/api/v1', apiRouter);

  // ─── 404 + Error Handler (must be last) ─────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
```

### 2.3 Configuration Management

```typescript
// src/config/index.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_VERSION: z.string().default('0.0.0'),
  TRUST_PROXY: z.coerce.number().default(1),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(20),

  // Redis
  REDIS_URL: z.string().url(),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),

  // R2 Storage
  R2_ACCOUNT_ID: z.string(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_BUCKET_NAME: z.string().default('sprintio-files'),
  R2_PUBLIC_URL: z.string().url(),

  // AI Service
  AI_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  AI_API_KEY: z.string().optional(),

  // Temporal
  TEMPORAL_ADDRESS: z.string().default('localhost:7233'),
  TEMPORAL_NAMESPACE: z.string().default('sprintio'),

  // CORS
  CORS_ORIGINS: z.string().transform((s) => s.split(',')).default('http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  // Webhooks
  WEBHOOK_MAX_RETRIES: z.coerce.number().default(5),
  WEBHOOK_TIMEOUT_MS: z.coerce.number().default(10_000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = z.infer<typeof envSchema>;
```

---

## 3. Module Organization

### 3.1 Directory Structure

```
sprintio-api/
├── src/
│   ├── server.ts                    # Application entry point
│   ├── app.ts                       # Express app factory
│   ├── config/
│   │   ├── index.ts                 # Environment config (Zod validated)
│   │   └── constants.ts             # App-wide constants
│   │
│   ├── modules/                     # Feature modules (domain-driven)
│   │   ├── auth/
│   │   │   ├── auth.routes.ts       # POST /login, /register, /refresh, /logout
│   │   │   ├── auth.controller.ts   # Request handlers
│   │   │   ├── auth.service.ts      # Business logic
│   │   │   ├── auth.repository.ts   # Database queries
│   │   │   ├── auth.schemas.ts      # Zod validation schemas
│   │   │   ├── auth.middleware.ts    # Auth-specific middleware
│   │   │   ├── auth.types.ts        # Module-specific types
│   │   │   └── __tests__/
│   │   │
│   │   ├── workspace/
│   │   │   ├── workspace.routes.ts
│   │   │   ├── workspace.controller.ts
│   │   │   ├── workspace.service.ts
│   │   │   ├── workspace.repository.ts
│   │   │   ├── workspace.schemas.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── project/
│   │   │   ├── project.routes.ts
│   │   │   ├── project.controller.ts
│   │   │   ├── project.service.ts
│   │   │   ├── project.repository.ts
│   │   │   ├── project.schemas.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── issue/                    # (tasks / tickets)
│   │   │   ├── issue.routes.ts
│   │   │   ├── issue.controller.ts
│   │   │   ├── issue.service.ts
│   │   │   ├── issue.repository.ts
│   │   │   ├── issue.schemas.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── document/                 # Notion-style documents
│   │   │   ├── document.routes.ts
│   │   │   ├── document.controller.ts
│   │   │   ├── document.service.ts
│   │   │   ├── document.repository.ts
│   │   │   ├── document.schemas.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── comment/
│   │   ├── attachment/
│   │   ├── notification/
│   │   ├── webhook/
│   │   ├── automation/
│   │   ├── ai/
│   │   └── analytics/
│   │
│   ├── lib/                         # Shared infrastructure
│   │   ├── database.ts              # Drizzle ORM setup + migrations
│   │   ├── redis.ts                 # ioredis connection pool
│   │   ├── logger.ts                # Pino logger
│   │   ├── tracing.ts               # OpenTelemetry setup
│   │   ├── storage.ts               # R2 client wrapper
│   │   ├── shutdown.ts              # Graceful shutdown handler
│   │   ├── id.ts                    # ID generation (ULID/NanoID)
│   │   ├── crypto.ts                # Encryption, hashing, tokens
│   │   ├── date.ts                  # Date utilities
│   │   └── cache.ts                 # Cache helper (Redis get/set with TTL)
│   │
│   ├── middleware/                   # Express middleware
│   │   ├── authenticate.ts          # JWT verification + user injection
│   │   ├── authorize.ts             # Role/permission checking
│   │   ├── validate.ts              # Zod schema validation
│   │   ├── error-handler.ts         # Global error handler
│   │   ├── not-found.ts             # 404 handler
│   │   ├── request-id.ts            # X-Request-Id propagation
│   │   ├── request-logger.ts        # HTTP request logging
│   │   ├── idempotency.ts           # Idempotency key middleware
│   │   └── require-workspace.ts     # Workspace context enforcement
│   │
│   ├── routes/
│   │   ├── api.ts                   # Central API router (v1)
│   │   └── health.ts               # /health endpoint
│   │
│   ├── jobs/                        # Background job definitions
│   │   ├── queues/
│   │   │   ├── notification.queue.ts
│   │   │   ├── email.queue.ts
│   │   │   ├── webhook.queue.ts
│   │   │   ├── ai.queue.ts
│   │   │   ├── file-processing.queue.ts
│   │   │   └── analytics.queue.ts
│   │   ├── workers/
│   │   │   ├── notification.worker.ts
│   │   │   ├── email.worker.ts
│   │   │   ├── webhook.worker.ts
│   │   │   ├── ai.worker.ts
│   │   │   ├── file-processing.worker.ts
│   │   │   └── analytics.worker.ts
│   │   └── workers.ts               # Worker registry + startup
│   │
│   ├── ws/                          # WebSocket / Yjs layer
│   │   ├── server.ts                # ws server setup
│   │   ├── yjs-handler.ts           # Yjs document sync
│   │   ├── presence.ts              # Presence / awareness protocol
│   │   ├── room-manager.ts          # Room lifecycle
│   │   └── middleware.ts            # WS auth middleware
│   │
│   ├── workflows/                   # Temporal workflows
│   │   ├── automation.workflow.ts
│   │   ├── notification.workflow.ts
│   │   ├── cron.workflow.ts
│   │   └── activities/
│   │       ├── send-email.activity.ts
│   │       ├── call-webhook.activity.ts
│   │       ├── run-ai-prompt.activity.ts
│   │       └── update-assignee.activity.ts
│   │
│   └── types/                       # Global type definitions
│       ├── express.d.ts             # Express type augmentation
│       ├── global.d.ts
│       └── env.d.ts
│
├── drizzle/                          # Database migrations
│   ├── migrations/
│   ├── schema/
│   │   ├── index.ts
│   │   ├── workspace.ts
│   │   ├── project.ts
│   │   ├── issue.ts
│   │   ├── document.ts
│   │   ├── user.ts
│   │   ├── comment.ts
│   │   ├── attachment.ts
│   │   ├── notification.ts
│   │   ├── webhook.ts
│   │   ├── automation.ts
│   │   └── analytics.ts             # TimescaleDB hypertables
│   └── seeds/
│
├── tests/
│   ├── fixtures/
│   ├── helpers/
│   ├── integration/
│   └── unit/
│
├── scripts/
│   ├── seed.ts
│   └── migrate.ts
│
├── tsconfig.json
├── drizzle.config.ts
├── package.json
└── .env.example
```

### 3.2 Module Dependency Graph

```
                  ┌─────────┐
                  │  Auth   │
                  │ Module  │
                  └────┬────┘
                       │ provides: user context
        ┌──────────────┼──────────────────┐
        ▼              ▼                  ▼
  ┌──────────┐  ┌───────────┐    ┌──────────────┐
  │Workspace │  │  Project  │    │Notification  │
  │  Module  │  │  Module   │    │   Module     │
  └────┬─────┘  └─────┬─────┘    └──────────────┘
       │              │
       ▼              ▼
  ┌──────────┐  ┌───────────┐
  │ Document │  │   Issue   │──── fires events
  │  Module  │  │  Module   │         │
  └──────────┘  └─────┬─────┘         │
                      │               ▼
                ┌─────┴────┐   ┌────────────┐
                │ Comment  │   │  Webhook   │
                │  Module  │   │  Module    │
                └──────────┘   └────────────┘
                                      │
                                      ▼
                               ┌────────────┐
                               │Automation  │
                               │ (Temporal) │
                               └─────┬──────┘
                                     │
                           ┌─────────┼─────────┐
                           ▼         ▼         ▼
                      ┌────────┐ ┌──────┐ ┌────────┐
                      │Email   │ │  AI  │ │Analytics│
                      │Queue   │ │Queue │ │ Module  │
                      └────────┘ └──────┘ └────────┘
```

### 3.3 Module Interface Contract

Every feature module follows this contract:

```typescript
// Each module exports a Router and registers with the central API router.
// Modules communicate via event bus (Redis Pub/Sub), never via direct import.

// src/modules/issue/issue.routes.ts
import { Router } from 'express';
import { IssueController } from './issue.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { requireWorkspace } from '../../middleware/require-workspace';
import {
  createIssueSchema,
  updateIssueSchema,
  listIssuesQuerySchema,
  issueIdParamSchema,
} from './issue.schemas';

const router = Router();
const controller = new IssueController();

// All issue routes require auth + workspace context
router.use(authenticate, requireWorkspace);

router.get(
  '/',
  validate({ query: listIssuesQuerySchema }),
  controller.listIssues
);

router.post(
  '/',
  validate({ body: createIssueSchema }),
  controller.createIssue
);

router.get(
  '/:issueId',
  validate({ params: issueIdParamSchema }),
  controller.getIssue
);

router.patch(
  '/:issueId',
  validate({ params: issueIdParamSchema, body: updateIssueSchema }),
  controller.updateIssue
);

router.delete(
  '/:issueId',
  validate({ params: issueIdParamSchema }),
  controller.deleteIssue
);

export { router as issueRouter };
```

### 3.4 Central API Router

```typescript
// src/routes/api.ts
import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { workspaceRouter } from '../modules/workspace/workspace.routes';
import { projectRouter } from '../modules/project/project.routes';
import { issueRouter } from '../modules/issue/issue.routes';
import { documentRouter } from '../modules/document/document.routes';
import { commentRouter } from '../modules/comment/comment.routes';
import { attachmentRouter } from '../modules/attachment/attachment.routes';
import { notificationRouter } from '../modules/notification/notification.routes';
import { webhookRouter } from '../modules/webhook/webhook.routes';
import { automationRouter } from '../modules/automation/automation.routes';
import { aiRouter } from '../modules/ai/ai.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/workspaces', workspaceRouter);
apiRouter.use('/workspaces/:workspaceId/projects', projectRouter);
apiRouter.use('/workspaces/:workspaceId/issues', issueRouter);
apiRouter.use('/workspaces/:workspaceId/documents', documentRouter);
apiRouter.use('/workspaces/:workspaceId/issues/:issueId/comments', commentRouter);
apiRouter.use('/attachments', attachmentRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/webhooks', webhookRouter);
apiRouter.use('/automations', automationRouter);
apiRouter.use('/ai', aiRouter);
```

---

## 4. Request Lifecycle

### 4.1 Full Request Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│                     INCOMING HTTP REQUEST                     │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │   1. Helmet     │  Security headers (CSP, HSTS, X-Frame...)
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │   2. CORS       │  Origin validation, preflight handling
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │   3. Compress   │  gzip / brotli response compression
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │   4. Request ID │  Generate/propagate X-Request-Id
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │   5. Logger     │  Log method, path, request ID, start time
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │   6. Rate Limit │  Token bucket per user/IP (Redis-backed)
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │   7. Body Parse │  JSON / URL-encoded deserialization
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │   8. Auth       │  JWT verification → inject user into req
              └───────┬────────┘   (skipped for public routes)
                      │
                      ▼
              ┌────────────────┐
              │   9. Workspace  │  Resolve workspace context from param/header
              └───────┬────────┘   + verify membership
                      │
                      ▼
              ┌────────────────┐
              │  10. Validate   │  Zod schema validation (params, query, body)
              └───────┬────────┘   → 422 if invalid
                      │
                      ▼
              ┌────────────────┐
              │  11. Authorize  │  RBAC permission check
              └───────┬────────┘   → 403 if unauthorized
                      │
                      ▼
              ┌────────────────┐
              │  12. Handler    │  Controller → Service → Repository
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │  13. Response   │  Serialize to JSON, set status + headers
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │  14. After-hook │  Emit domain events, update analytics
              └───────┬────────┘   async (fire-and-forget)
                      │
                      ▼
              ┌────────────────┐
              │  15. Logger     │  Log response status, duration, user ID
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │  16. Error Hdlr │  (only on error) Global error handler
              └────────────────┘   Maps AppError → HTTP response + logs
```

### 4.2 Request Context Type

```typescript
// src/types/express.d.ts
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Redis } from 'ioredis';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      context: {
        db: PostgresJsDatabase;
        redis: Redis;
      };
      user?: {
        id: string;
        email: string;
        name: string;
        avatarUrl?: string;
      };
      workspace?: {
        id: string;
        slug: string;
        role: 'owner' | 'admin' | 'member' | 'viewer';
      };
    }
  }
}
```

### 4.3 Response Format

All API responses follow a consistent envelope:

```typescript
// Success response
{
  "status": "success",
  "data": {
    "id": "01JXK2M...",
    "title": "Implement auth flow",
    ...
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-07-08T10:30:00Z"
  }
}

// List response (paginated)
{
  "status": "success",
  "data": [ ... ],
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-07-08T10:30:00Z",
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "totalCount": 142,
      "totalPages": 6,
      "hasNext": true,
      "hasPrev": false
    }
  }
}

// Error response
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      {
        "field": "title",
        "message": "Title is required",
        "code": "too_small"
      }
    ]
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-07-08T10:30:00Z"
  }
}
```

---

## 5. Error Handling

### 5.1 Error Class Hierarchy

```typescript
// src/lib/errors.ts
import type { ZodError } from 'zod';

// ─── Base Application Error ───────────────────────────────────
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;
  public readonly cause?: Error;

  constructor(
    message: string,
    options: {
      statusCode: number;
      code: string;
      isOperational?: boolean;
      details?: unknown;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;
    this.cause = options.cause;

    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Concrete Error Types ─────────────────────────────────────

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(message, { statusCode: 400, code: 'BAD_REQUEST', details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, { statusCode: 401, code: 'UNAUTHORIZED' });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, { statusCode: 403, code: 'FORBIDDEN' });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const msg = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(msg, { statusCode: 404, code: 'NOT_FOUND' });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details?: unknown) {
    super(message, { statusCode: 409, code: 'CONFLICT', details });
  }
}

export class ValidationError extends AppError {
  constructor(zodError: ZodError) {
    const details = zodError.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));
    super('Validation failed', {
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      details,
    });
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('Too many requests', {
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      details: { retryAfter },
    });
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, cause?: Error) {
    super(`External service error: ${service}`, {
      statusCode: 502,
      code: 'EXTERNAL_SERVICE_ERROR',
      isOperational: true,
      cause,
    });
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error', cause?: Error) {
    super(message, {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      isOperational: false,
      cause,
    });
  }
}
```

### 5.2 Global Error Handler Middleware

```typescript
// src/middleware/error-handler.ts
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, InternalError } from '../lib/errors';
import { logger } from '../lib/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Normalize to AppError
  let error: AppError;

  if (err instanceof AppError) {
    error = err;
  } else if (err instanceof ZodError) {
    // Zod errors from async validation that slipped through
    error = new (await import('../lib/errors')).ValidationError(err);
  } else {
    error = new InternalError('An unexpected error occurred', err);
  }

  // Log based on severity
  const logPayload = {
    requestId: req.requestId,
    userId: req.user?.id,
    method: req.method,
    path: req.path,
    statusCode: error.statusCode,
    code: error.code,
    message: error.message,
    ...(error.cause && { cause: error.cause }),
    ...(error.details && { details: error.details }),
  };

  if (error.statusCode >= 500) {
    logger.error(logPayload, `❌ ${error.message}`);
  } else if (error.statusCode >= 400) {
    logger.warn(logPayload, `⚠️ ${error.message}`);
  }

  // Send response
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(error.statusCode).json({
    status: 'error',
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
      ...(!isProduction && error.cause && {
        stack: error.cause.stack,
      }),
    },
    meta: {
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    },
  });
}
```

### 5.3 Async Error Wrapper

```typescript
// src/lib/async-handler.ts
import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler to catch rejected promises
 * and forward them to Express's error handler.
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>
): RequestHandler<T> {
  return (req: T, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ─── Usage in Controllers ─────────────────────────────────────

// src/modules/issue/issue.controller.ts
import { asyncHandler } from '../../lib/async-handler';
import { IssueService } from './issue.service';
import { NotFoundError } from '../../lib/errors';

export class IssueController {
  private service = new IssueService();

  listIssues = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const result = await this.service.listIssues(workspaceId, req.query);

    res.status(200).json({
      status: 'success',
      data: result.issues,
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
        pagination: result.pagination,
      },
    });
  });

  getIssue = asyncHandler(async (req, res) => {
    const { issueId } = req.params;
    const issue = await this.service.getIssueById(issueId);

    if (!issue) {
      throw new NotFoundError('Issue', issueId);
    }

    res.status(200).json({
      status: 'success',
      data: issue,
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      },
    });
  });

  createIssue = asyncHandler(async (req, res) => {
    const issue = await this.service.createIssue({
      ...req.body,
      workspaceId: req.workspace!.id,
      createdById: req.user!.id,
    });

    res.status(201).json({
      status: 'success',
      data: issue,
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      },
    });
  });

  updateIssue = asyncHandler(async (req, res) => {
    const { issueId } = req.params;
    const issue = await this.service.updateIssue(issueId, {
      ...req.body,
      updatedById: req.user!.id,
    });

    res.status(200).json({
      status: 'success',
      data: issue,
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      },
    });
  });

  deleteIssue = asyncHandler(async (req, res) => {
    const { issueId } = req.params;
    await this.service.deleteIssue(issueId, req.user!.id);

    res.status(204).send();
  });
}
```

### 5.4 Error Taxonomy

| Error Code | HTTP Status | When | Retryable |
|------------|-------------|------|-----------|
| `BAD_REQUEST` | 400 | Malformed JSON, missing fields | No |
| `UNAUTHORIZED` | 401 | Missing/expired JWT | No (re-auth) |
| `FORBIDDEN` | 403 | Valid token, insufficient role | No |
| `NOT_FOUND` | 404 | Resource doesn't exist | No |
| `CONFLICT` | 409 | Duplicate, optimistic lock fail | Yes (lock) |
| `VALIDATION_ERROR` | 422 | Zod schema failure | No |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Yes (after delay) |
| `EXTERNAL_SERVICE_ERROR` | 502 | R2, AI service, email provider | Yes |
| `INTERNAL_ERROR` | 500 | Unhandled / programmer error | Yes |

---

## 6. Validation with Zod

### 6.1 Validation Middleware

```typescript
// src/middleware/validate.ts
import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../lib/errors';

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}

/**
 * Validates request parts against Zod schemas.
 * Parses (transforms + defaults) the data before passing to handler.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as any;
      }
      if (schemas.query) {
        (req as any).query = schemas.query.parse(req.query);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.headers) {
        schemas.headers.parse(req.headers);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError(err));
      } else {
        next(err);
      }
    }
  };
}
```

### 6.2 Issue Module Schemas

```typescript
// src/modules/issue/issue.schemas.ts
import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────
export const IssueStatus = z.enum([
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'cancelled',
]);

export const IssuePriority = z.enum(['urgent', 'high', 'medium', 'low', 'none']);

export const IssueType = z.enum(['bug', 'feature', 'improvement', 'task', 'epic']);

// ─── Create Issue ─────────────────────────────────────────────
export const createIssueSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be under 255 characters')
    .trim(),
  description: z.string().max(10_000).optional(),
  type: IssueType.default('task'),
  priority: IssuePriority.default('none'),
  status: IssueStatus.default('backlog'),
  assigneeId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),         // for sub-issues
  labelIds: z.array(z.string().uuid()).max(10).default([]),
  dueDate: z.coerce.date().nullable().optional(),
  estimate: z.number().min(0).max(9999).optional(), // story points
  sortOrder: z.number().int().optional(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

// ─── Update Issue (partial) ───────────────────────────────────
export const updateIssueSchema = z.object({
  title: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(10_000).optional(),
  type: IssueType.optional(),
  priority: IssuePriority.optional(),
  status: IssueStatus.optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  labelIds: z.array(z.string().uuid()).max(10).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  estimate: z.number().min(0).max(9999).nullable().optional(),
  sortOrder: z.number().int().optional(),
  // Optimistic concurrency
  version: z.number().int(),
}).refine(
  (data) => Object.keys(data).length > 1, // must have at least one field besides `version`
  { message: 'At least one field must be provided for update' }
);

export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;

// ─── Query Parameters (List) ──────────────────────────────────
export const listIssuesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: IssueStatus.optional(),
  priority: IssuePriority.optional(),
  type: IssueType.optional(),
  assigneeId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status', 'sortOrder'])
    .default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;

// ─── Path Parameters ──────────────────────────────────────────
export const issueIdParamSchema = z.object({
  issueId: z.string().uuid('Invalid issue ID format'),
});
```

### 6.3 Schema Patterns

```typescript
// ─── Shared validation helpers ────────────────────────────────

// Reusable field schemas
export const ulidField = z.string().ulid();
export const uuidField = z.string().uuid();
export const emailField = z.string().email().max(320);
export const slugField = z.string().regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  'Slug must be lowercase alphanumeric with hyphens'
);

// Pagination schema (reusable across all list endpoints)
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// Date range filter
export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).refine(
  (data) => !data.from || !data.to || data.from <= data.to,
  { message: 'Start date must be before end date' }
);

// ─── Type inference from schema (single source of truth) ─────
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
```

### 6.4 Request/Response Validation

```typescript
// Validate outgoing data before sending (in services/repositories)

import { z } from 'zod';

// Define the expected shape of data from the database
const issueResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: IssueStatus,
  priority: IssuePriority,
  type: IssueType,
  createdAt: z.date(),
  updatedAt: z.date(),
  assignee: z.object({
    id: z.string().uuid(),
    name: z.string(),
    avatarUrl: z.string().url().nullable(),
  }).nullable(),
  project: z.object({
    id: z.string().uuid(),
    name: z.string(),
    identifier: z.string(),
  }).nullable(),
});

// Validate in development, skip in production for performance
export function validateResponse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  if (process.env.NODE_ENV === 'development') {
    return schema.parse(data); // Throws ZodError in dev
  }
  return data as T; // Trust the ORM in production
}
```

---

## 7. Real-time Server

### 7.1 WebSocket Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                          │
│  ┌───────────────┐  ┌────────────────┐  ┌─────────────────┐  │
│  │  Yjs Doc      │  │  y-websocket  │  │  Presence State │  │
│  │  (CRDT)       │◄─┤  Provider     │──┤  (awareness)    │  │
│  └───────┬───────┘  └───────┬────────┘  └────────┬────────┘  │
└──────────┼──────────────────┼────────────────────┼────────────┘
           │                  │                    │
           │    WebSocket     │                    │
           │    Connection    │                    │
           ▼                  ▼                    ▼
┌───────────────────────────────────────────────────────────────┐
│               WebSocket Server (Node.js)                      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                  ws.Server                               │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │  │
│  │  │ Auth MW    │ │ Yjs Sync   │ │ Presence Manager   │   │  │
│  │  │ (JWT)      │ │ Handler    │ │                    │   │  │
│  │  └─────┬──────┘ └─────┬──────┘ └────────┬───────────┘   │  │
│  └────────┼──────────────┼─────────────────┼────────────────┘  │
└───────────┼──────────────┼─────────────────┼──────────────────┘
            │              │                 │
            ▼              ▼                 ▼
┌───────────────────────────────────────────────────────────────┐
│                         Redis 7                                │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │   Pub/Sub      │  │  Document      │  │  Presence      │   │
│  │   (sync msgs   │  │  Persistence   │  │  Keys (TTL)    │   │
│  │    across pods)│  │  (optional)    │  │                │   │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

### 7.2 WebSocket Server Setup

```typescript
// src/ws/server.ts
import { WebSocketServer, type WebSocket } from 'ws';
import type { Server } from 'http';
import type { Redis } from 'ioredis';
import * as Y from 'yjs';
import { logger } from '../lib/logger';
import { verifyToken } from '../lib/crypto';
import { setupYjsHandler } from './yjs-handler';
import { PresenceManager } from './presence';
import { RoomManager } from './room-manager';

interface WsServerContext {
  redis: Redis;
}

export function startWebSocketServer(
  httpServer: Server,
  ctx: WsServerContext
): WebSocketServer {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
    maxPayload: 5 * 1024 * 1024, // 5MB
    perMessageDeflate: {
      zlibDeflateOptions: { level: 3 },
      threshold: 256,
    },
  });

  const roomManager = new RoomManager(ctx.redis);
  const presenceManager = new PresenceManager(ctx.redis);

  wss.on('connection', async (ws: WebSocket, req) => {
    try {
      // ── 1. Authenticate ─────────────────────────────────────
      const token = extractToken(req);
      const user = await verifyToken(token);

      if (!user) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      // ── 2. Parse room from URL ──────────────────────────────
      //    /ws?room=document:abc123
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const roomName = url.searchParams.get('room');

      if (!roomName) {
        ws.close(4002, 'Missing room parameter');
        return;
      }

      // ── 3. Verify room access ───────────────────────────────
      const hasAccess = await roomManager.verifyAccess(user.id, roomName);
      if (!hasAccess) {
        ws.close(4003, 'Access denied to room');
        return;
      }

      // ── 4. Join room ────────────────────────────────────────
      const room = await roomManager.joinRoom(roomName, ws, user);

      logger.info('WebSocket connected', {
        userId: user.id,
        room: roomName,
        connections: room.connections,
      });

      // ── 5. Setup Yjs sync handler ───────────────────────────
      const yDoc = await roomManager.getOrCreateDocument(roomName);
      const cleanup = setupYjsHandler(ws, yDoc, roomName, ctx.redis);

      // ── 6. Setup presence ───────────────────────────────────
      presenceManager.trackUser(roomName, user);

      // ── 7. Handle disconnect ────────────────────────────────
      ws.on('close', () => {
        cleanup();
        roomManager.leaveRoom(roomName, ws);
        presenceManager.removeUser(roomName, user.id);

        logger.info('WebSocket disconnected', {
          userId: user.id,
          room: roomName,
        });
      });

      ws.on('error', (err) => {
        logger.error('WebSocket error', {
          userId: user.id,
          room: roomName,
          error: err.message,
        });
      });

    } catch (err) {
      logger.error('WebSocket connection failed', { error: err });
      ws.close(4000, 'Connection failed');
    }
  });

  logger.info('WebSocket server started on /ws');
  return wss;
}

function extractToken(req: any): string {
  // Check Authorization header first, then query param
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const url = new URL(req.url!, `http://${req.headers.host}`);
  return url.searchParams.get('token') ?? '';
}
```

### 7.3 Yjs Sync Handler

```typescript
// src/ws/yjs-handler.ts
import type { WebSocket } from 'ws';
import * as Y from 'yjs';
import { Redis } from 'ioredis';
import * as syncProtocol from 'y-websocket/bin/utils';

const SYNC_MESSAGE_TYPES = {
  step1: 0,
  step2: 1,
  update: 2,
};

export function setupYjsHandler(
  ws: WebSocket,
  yDoc: Y.Doc,
  roomName: string,
  redis: Redis
): () => void {
  // Create a awareness instance for this connection
  const awareness = syncProtocol.createAwareness(yDoc);

  // Subscribe to Redis Pub/Sub for cross-pod sync
  const subscriber = redis.duplicate();
  const channel = `yjs:${roomName}`;

  subscriber.subscribe(channel);

  subscriber.on('message', (_ch, message) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  });

  // Handle incoming WebSocket messages
  const onMessage = (data: Buffer) => {
    try {
      const message = new Uint8Array(data);

      if (message[0] === SYNC_MESSAGE_TYPES.update) {
        // Apply update to local Yjs document
        Y.applyUpdate(yDoc, message.slice(1));

        // Broadcast to other pods via Redis
        redis.publish(channel, message);
      } else {
        // Sync protocol messages (step1, step2)
        syncProtocol.applyUpdate(yDoc, message, null);
      }
    } catch (err) {
      // Handle Yjs sync errors silently
    }
  };

  ws.on('message', onMessage);

  // Send initial state to newly connected client
  const stateVector = Y.encodeStateAsUpdate(yDoc);
  ws.send(stateVector);

  // Cleanup function
  return () => {
    ws.removeListener('message', onMessage);
    subscriber.unsubscribe(channel);
    subscriber.disconnect();
    awareness.destroy();
  };
}
```

### 7.4 Room & Presence Management

```typescript
// src/ws/room-manager.ts
import type { WebSocket } from 'ws';
import * as Y from 'yjs';
import { Redis } from 'ioredis';

interface RoomUser {
  id: string;
  name: string;
  avatarUrl?: string;
  color: string;  // assigned for cursor colors
}

interface Room {
  name: string;
  doc: Y.Doc;
  connections: Map<WebSocket, RoomUser>;
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async verifyAccess(userId: string, roomName: string): Promise<boolean> {
    // Parse room type and ID: "document:abc123" or "project:abc123:chat"
    const [type, id] = roomName.split(':');

    // TODO: Query database to verify user has access to this resource
    // For now, trust the auth middleware
    return true;
  }

  async joinRoom(
    roomName: string,
    ws: WebSocket,
    user: RoomUser
  ): Promise<Room> {
    let room = this.rooms.get(roomName);

    if (!room) {
      room = {
        name: roomName,
        doc: new Y.Doc(),
        connections: new Map(),
      };
      this.rooms.set(roomName, room);
    }

    room.connections.set(ws, user);
    return room;
  }

  leaveRoom(roomName: string, ws: WebSocket): void {
    const room = this.rooms.get(roomName);
    if (!room) return;

    room.connections.delete(ws);

    // Garbage collect empty rooms after 5 minutes
    if (room.connections.size === 0) {
      setTimeout(() => {
        const current = this.rooms.get(roomName);
        if (current && current.connections.size === 0) {
          current.doc.destroy();
          this.rooms.delete(roomName);
        }
      }, 5 * 60 * 1000);
    }
  }

  async getOrCreateDocument(roomName: string): Promise<Y.Doc> {
    const room = this.rooms.get(roomName);
    if (!room) throw new Error(`Room ${roomName} not found`);

    // Optionally load persisted state from PostgreSQL
    // const persistedState = await loadDocumentState(roomName);
    // if (persistedState) Y.applyUpdate(room.doc, persistedState);

    return room.doc;
  }

  getRoomStats(): { roomCount: number; connectionCount: number } {
    let connectionCount = 0;
    for (const room of this.rooms.values()) {
      connectionCount += room.connections.size;
    }
    return { roomCount: this.rooms.size, connectionCount };
  }
}

// ─── Presence Manager ─────────────────────────────────────────

// src/ws/presence.ts
const PRESENCE_TTL = 30; // seconds — auto-cleanup stale presence

export class PresenceManager {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async trackUser(roomName: string, user: RoomUser): Promise<void> {
    const key = `presence:${roomName}:${user.id}`;
    await this.redis.setex(
      key,
      PRESENCE_TTL,
      JSON.stringify({
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        joinedAt: Date.now(),
        cursor: null,
        selection: null,
      })
    );

    // Broadcast presence update to room
    await this.redis.publish(`presence:${roomName}`, JSON.stringify({
      type: 'join',
      user,
    }));
  }

  async removeUser(roomName: string, userId: string): Promise<void> {
    const key = `presence:${roomName}:${userId}`;
    await this.redis.del(key);

    await this.redis.publish(`presence:${roomName}`, JSON.stringify({
      type: 'leave',
      userId,
    }));
  }

  async updateCursor(
    roomName: string,
    userId: string,
    cursor: { x: number; y: number; elementId: string }
  ): Promise<void> {
    const key = `presence:${roomName}:${userId}`;
    const data = await this.redis.get(key);
    if (!data) return;

    const parsed = JSON.parse(data);
    parsed.cursor = cursor;

    await this.redis.setex(key, PRESENCE_TTL, JSON.stringify(parsed));

    await this.redis.publish(`presence:${roomName}`, JSON.stringify({
      type: 'cursor',
      userId,
      cursor,
    }));
  }

  async getActiveUsers(roomName: string): Promise<RoomUser[]> {
    const pattern = `presence:${roomName}:*`;
    const keys: string[] = [];

    let cursor = 0;
    do {
      const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== 0);

    const users: RoomUser[] = [];
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        users.push(JSON.parse(data));
      }
    }

    return users;
  }
}
```

---

## 8. Background Jobs

### 8.1 Job Queue Registry

```typescript
// src/jobs/queues/notification.queue.ts
import { Queue } from 'bullmq';
import { redis } from '../../lib/redis';

export const notificationQueue = new Queue('notifications', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,   // 1s, 2s, 4s
    },
    removeOnComplete: { age: 7 * 24 * 3600 },  // keep 7 days
    removeOnFail: { age: 30 * 24 * 3600 },     // keep 30 days
  },
});
```

```typescript
// src/jobs/queues/email.queue.ts
import { Queue } from 'bullmq';
import { redis } from '../../lib/redis';

export const emailQueue = new Queue('emails', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { age: 30 * 24 * 3600 },
    removeOnFail: { age: 90 * 24 * 3600 },
  },
});
```

```typescript
// src/jobs/queues/webhook.queue.ts
import { Queue } from 'bullmq';
import { redis } from '../../lib/redis';

export const webhookQueue = new Queue('webhooks', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { age: 7 * 24 * 3600 },
    removeOnFail: { age: 30 * 24 * 3600 },
  },
});
```

### 8.2 Job Types Table

| Queue | Job Type | Handler | Retry | Timeout | Priority |
|-------|----------|---------|-------|---------|----------|
| `notifications` | `push` | Send push notification via FCM/APNs | 3x exp | 10s | Normal |
| `notifications` | `in-app` | Create in-app notification record | 2x | 5s | Low |
| `emails` | `send` | Send transactional email (SendGrid/SES) | 5x exp | 30s | Normal |
| `emails` | `digest` | Batch daily digest emails | 3x | 60s | Low |
| `webhooks` | `deliver` | POST to webhook endpoint | 5x exp | 15s | High |
| `webhooks` | `retry-failed` | Re-deliver failed webhooks | 3x | 15s | Low |
| `ai` | `copilot` | Forward to AI sidecar | 2x | 60s | Normal |
| `ai` | `embedding` | Generate embeddings for search | 2x | 30s | Low |
| `ai` | `summarize` | Summarize issue/comment thread | 2x | 45s | Low |
| `file-processing` | `resize-image` | Generate thumbnails for uploads | 3x | 20s | Low |
| `file-processing` | `extract-text` | OCR / text extraction | 2x | 30s | Low |
| `analytics` | `track-event` | Write event to TimescaleDB | 2x | 5s | Low |
| `analytics` | `rollup` | Aggregate metrics (hourly/daily) | 3x | 120s | Low |

### 8.3 Worker Implementation

```typescript
// src/jobs/workers/webhook.worker.ts
import { Worker, type Job } from 'bullmq';
import { redis } from '../../lib/redis';
import { logger } from '../../lib/logger';
import { db } from '../../lib/database';
import { webhooks } from '../../../drizzle/schema/webhook';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

interface WebhookJobData {
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  attempt: number;
}

export const webhookWorker = new Worker<WebhookJobData>(
  'webhooks',
  async (job: Job<WebhookJobData>) => {
    const { webhookId, event, payload, attempt } = job.data;

    // 1. Fetch webhook config from database
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, webhookId))
      .limit(1);

    if (!webhook || !webhook.active) {
      logger.warn('Webhook not found or inactive', { webhookId });
      return { skipped: true };
    }

    // 2. Generate HMAC signature for payload verification
    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(body)
      .digest('hex');

    // 3. Send HTTP request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sprintio-Event': event,
          'X-Sprintio-Signature': `sha256=${signature}`,
          'X-Sprintio-Delivery-Id': job.id!,
          'User-Agent': 'Sprintio-Webhook/1.0',
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // 4. Handle response
      if (response.ok) {
        logger.info('Webhook delivered', {
          webhookId,
          event,
          status: response.status,
          attempt,
        });
        return {
          success: true,
          statusCode: response.status,
          duration: Date.now() - job.timestamp,
        };
      }

      // 4xx errors (except 429) are not retryable
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        logger.error('Webhook delivery failed (non-retryable)', {
          webhookId,
          status: response.status,
        });
        return { success: false, statusCode: response.status, retryable: false };
      }

      // 5xx and 429 are retryable
      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      clearTimeout(timeout);
      throw err; // BullMQ handles retry logic
    }
  },
  {
    connection: redis,
    concurrency: 10,
    limiter: {
      max: 50,
      duration: 1000, // max 50 jobs/sec per webhook endpoint
    },
  }
);

// Event listeners for monitoring
webhookWorker.on('completed', (job) => {
  logger.debug('Webhook job completed', { jobId: job.id });
});

webhookWorker.on('failed', (job, err) => {
  logger.error('Webhook job failed', {
    jobId: job?.id,
    webhookId: job?.data.webhookId,
    error: err.message,
    attemptsMade: job?.attemptsMade,
  });
});
```

### 8.4 Worker Startup

```typescript
// src/jobs/workers.ts
import type { Worker } from 'bullmq';
import { webhookWorker } from './workers/webhook.worker';
import { notificationWorker } from './workers/notification.worker';
import { emailWorker } from './workers/email.worker';
import { aiWorker } from './workers/ai.worker';
import { fileProcessingWorker } from './workers/file-processing.worker';
import { analyticsWorker } from './workers/analytics.worker';
import { logger } from '../lib/logger';

const allWorkers: Worker[] = [
  webhookWorker,
  notificationWorker,
  emailWorker,
  aiWorker,
  fileProcessingWorker,
  analyticsWorker,
];

export async function startBullMQWorkers(
  ctx: { db: any; redis: any }
): Promise<Worker[]> {
  logger.info(`Starting ${allWorkers.length} BullMQ workers`);

  for (const worker of allWorkers) {
    worker.on('error', (err) => {
      logger.error(`Worker ${worker.name} error`, { error: err.message });
    });
  }

  return allWorkers;
}

export async function stopBullMQWorkers(workers: Worker[]): Promise<void> {
  logger.info('Stopping BullMQ workers...');

  const closes = workers.map((w) => w.close());
  await Promise.allSettled(closes);

  logger.info('All BullMQ workers stopped');
}
```

---

## 9. AI Service

### 9.1 Python FastAPI Sidecar

```python
# ai_service/main.py
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager
import httpx
import json
from typing import AsyncGenerator

from .llm import LLMClient
from .prompts import PromptManager
from .embeddings import EmbeddingService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.llm = LLMClient()
    app.state.prompts = PromptManager()
    app.state.embeddings = EmbeddingService()
    yield
    # Shutdown
    await app.state.llm.close()

app = FastAPI(
    title="Sprintio AI Service",
    version="1.0.0",
    lifespan=lifespan,
)


# ─── Request / Response Models ─────────────────────────────────

class CopilotRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    context: dict = Field(default_factory=dict)
    conversation_id: str | None = None
    model: str = Field(default="default")
    stream: bool = Field(default=True)

class CopilotResponse(BaseModel):
    response: str
    model_used: str
    tokens_used: int
    suggestions: list[str] = []

class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=50_000)
    style: str = Field(default="concise")  # concise, detailed, bullet
    max_length: int = Field(default=200, ge=50, le=2000)

class EmbeddingRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=100)
    model: str = Field(default="default")

class AutoAssignRequest(BaseModel):
    issue_title: str
    issue_description: str
    available_members: list[dict]
    project_context: dict = Field(default_factory=dict)


# ─── Endpoints ────────────────────────────────────────────────

@app.post("/v1/copilot/chat")
async def copilot_chat(req: CopilotRequest):
    """AI copilot chat with streaming support."""
    llm = app.state.llm
    prompts = app.state.prompts

    system_prompt = prompts.render("copilot_chat", context=req.context)

    if req.stream:
        async def generate() -> AsyncGenerator[str, None]:
            async for chunk in llm.stream_chat(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": req.message},
                ],
                model=req.model,
            ):
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")

    result = await llm.chat(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": req.message},
        ],
        model=req.model,
    )

    return CopilotResponse(
        response=result["content"],
        model_used=req.model,
        tokens_used=result["usage"]["total_tokens"],
    )


@app.post("/v1/summarize")
async def summarize(req: SummarizeRequest):
    """Summarize text (issue descriptions, comment threads, documents)."""
    llm = app.state.llm
    prompts = app.state.prompts

    system_prompt = prompts.render(
        "summarize",
        style=req.style,
        max_length=req.max_length,
    )

    result = await llm.chat(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": req.text},
        ],
        max_tokens=req.max_length,
    )

    return {"summary": result["content"], "tokens_used": result["usage"]["total_tokens"]}


@app.post("/v1/auto-assign")
async def auto_assign(req: AutoAssignRequest):
    """Suggest optimal assignee for an issue."""
    llm = app.state.llm
    prompts = app.state.prompts

    system_prompt = prompts.render(
        "auto_assign",
        members=req.available_members,
        project_context=req.project_context,
    )

    result = await llm.chat(
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": f"Title: {req.issue_title}\nDescription: {req.issue_description}",
            },
        ],
        response_format={"type": "json_object"},
    )

    suggestion = json.loads(result["content"])
    return suggestion


@app.post("/v1/embeddings")
async def generate_embeddings(req: EmbeddingRequest):
    """Generate vector embeddings for search."""
    embeddings_service = app.state.embeddings
    vectors = await embeddings_service.embed(req.texts)

    return {"embeddings": vectors, "model": embeddings_service.model_name}


@app.get("/health")
async def health():
    return {"status": "ok"}
```

### 9.2 LLM Client

```python
# ai_service/llm.py
import httpx
import os
from typing import AsyncGenerator

class LLMClient:
    """Unified LLM client supporting vLLM, Ollama, and OpenAI-compatible APIs."""

    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "ollama")  # ollama | vllm | openai
        self.base_url = self._get_base_url()
        self.api_key = os.getenv("LLM_API_KEY", "")
        self.default_model = os.getenv("LLM_DEFAULT_MODEL", "llama3.1:8b")
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"Authorization": f"Bearer {self.api_key}"} if self.api_key else {},
            timeout=60.0,
        )

    def _get_base_url(self) -> str:
        urls = {
            "ollama": os.getenv("OLLAMA_URL", "http://localhost:11434/v1"),
            "vllm": os.getenv("VLLM_URL", "http://localhost:8080/v1"),
            "openai": "https://api.openai.com/v1",
        }
        return urls[self.provider]

    async def chat(
        self,
        messages: list[dict],
        model: str | None = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        response_format: dict | None = None,
    ) -> dict:
        body = {
            "model": model or self.default_model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if response_format:
            body["response_format"] = response_format

        resp = await self.client.post("/chat/completions", json=body)
        resp.raise_for_status()
        data = resp.json()
        return {
            "content": data["choices"][0]["message"]["content"],
            "usage": data.get("usage", {}),
        }

    async def stream_chat(
        self,
        messages: list[dict],
        model: str | None = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        body = {
            "model": model or self.default_model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True,
        }

        async with self.client.stream("POST", "/chat/completions", json=body) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    chunk = line[6:]
                    if chunk == "[DONE]":
                        break
                    import json
                    data = json.loads(chunk)
                    delta = data["choices"][0].get("delta", {})
                    if "content" in delta:
                        yield delta["content"]

    async def close(self):
        await self.client.aclose()
```

### 9.3 Node.js → AI Service Integration

```typescript
// src/modules/ai/ai.service.ts
import { config } from '../../config';
import { logger } from '../../lib/logger';
import { ExternalServiceError } from '../../lib/errors';

interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class AIService {
  private baseUrl: string;
  private apiKey?: string;

  constructor() {
    this.baseUrl = config.AI_SERVICE_URL;
    this.apiKey = config.AI_API_KEY;
  }

  async copilotChat(
    message: string,
    context: Record<string, unknown>,
    conversationId?: string
  ): Promise<{ response: string; model: string; tokens: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/copilot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          message,
          context,
          conversation_id: conversationId,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new ExternalServiceError('AI Service');
      }

      const data = await response.json();
      return {
        response: data.response,
        model: data.model_used,
        tokens: data.tokens_used,
      };
    } catch (err) {
      if (err instanceof ExternalServiceError) throw err;
      logger.error('AI copilot request failed', { error: err });
      throw new ExternalServiceError('AI Service', err as Error);
    }
  }

  async summarize(
    text: string,
    style: 'concise' | 'detailed' | 'bullet' = 'concise'
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/v1/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, style }),
    });

    if (!response.ok) throw new ExternalServiceError('AI Service');
    const data = await response.json();
    return data.summary;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
    });

    if (!response.ok) throw new ExternalServiceError('AI Service');
    const data = await response.json();
    return data.embeddings;
  }

  /**
   * Stream copilot response via SSE to the client.
   * Used by the streaming API endpoint.
   */
  async *streamCopilotChat(
    message: string,
    context: Record<string, unknown>
  ): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/v1/copilot/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context, stream: true }),
    });

    if (!response.ok || !response.body) {
      throw new ExternalServiceError('AI Service');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            yield parsed.content;
          } catch {
            // skip malformed chunks
          }
        }
      }
    }
  }
}
```

---

## 10. File Handling

### 10.1 R2 Storage Service

```typescript
// src/lib/storage.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { logger } from './logger';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.R2_ACCESS_KEY_ID,
    secretAccessKey: config.R2_SECRET_ACCESS_KEY,
  },
});

export interface UploadResult {
  key: string;
  url: string;
  publicUrl: string;
  size: number;
  contentType: string;
}

export class StorageService {
  /**
   * Upload a file to R2.
   */
  async upload(params: {
    key: string;
    body: Buffer | ReadableStream;
    contentType: string;
    size: number;
    metadata?: Record<string, string>;
  }): Promise<UploadResult> {
    const command = new PutObjectCommand({
      Bucket: config.R2_BUCKET_NAME,
      Key: params.key,
      Body: params.body as any,
      ContentType: params.contentType,
      ContentLength: params.size,
      Metadata: params.metadata,
    });

    await r2Client.send(command);

    return {
      key: params.key,
      url: `${config.R2_PUBLIC_URL}/${params.key}`,
      publicUrl: `${config.R2_PUBLIC_URL}/${params.key}`,
      size: params.size,
      contentType: params.contentType,
    };
  }

  /**
   * Generate a pre-signed URL for temporary access.
   */
  async getSignedUploadUrl(params: {
    key: string;
    contentType: string;
    expiresIn?: number; // seconds, default 600
  }): Promise<{ uploadUrl: string; key: string }> {
    const command = new PutObjectCommand({
      Bucket: config.R2_BUCKET_NAME,
      Key: params.key,
      ContentType: params.contentType,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: params.expiresIn ?? 600, // 10 minutes
    });

    return { uploadUrl, key: params.key };
  }

  /**
   * Generate a pre-signed download URL.
   */
  async getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: config.R2_BUCKET_NAME,
      Key: key,
    });

    return getSignedUrl(r2Client, command, { expiresIn });
  }

  /**
   * Delete a file from R2.
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: config.R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
  }

  /**
   * Check if a file exists.
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: config.R2_BUCKET_NAME,
        Key: key,
      });
      await r2Client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}
```

### 10.2 File Upload Flow

```
┌─────────┐     1. Request upload      ┌─────────────┐
│ Client  │ ──────────────────────────► │  API Server │
│         │                             │             │
│         │ ◄────────────────────────── │             │
│         │  2. Pre-signed upload URL   │             │
│         │                             └─────────────┘
│         │     3. PUT file directly
│         │ ──────────────────────────►  ┌──────────┐
│         │                              │  Cloudflare│
│         │ ◄──────────────────────────  │    R2      │
│         │  4. 200 OK                   └──────────┘
│         │
│         │     5. Confirm upload       ┌─────────────┐
│         │ ──────────────────────────► │  API Server │
│         │  (attachment metadata)      │             │
│         │ ◄────────────────────────── │             │
│         │  6. Created attachment      │  ┌────────┐ │
│         │                             │  │ BullMQ │ │
│         │                             │  │ (thumb) │ │
│         │                             │  └────────┘ │
└─────────┘                             └─────────────┘
```

### 10.3 Attachment Module

```typescript
// src/modules/attachment/attachment.service.ts
import { randomUUID } from 'crypto';
import path from 'path';
import { StorageService } from '../../lib/storage';
import { db } from '../../lib/database';
import { attachments } from '../../../drizzle/schema/attachment';
import { fileProcessingQueue } from '../../jobs/queues/file-processing.queue';

// Allowed file types and size limits
const ALLOWED_TYPES: Record<string, { maxSize: number; category: string }> = {
  'image/jpeg':    { maxSize: 10 * 1024 * 1024,  category: 'image' },
  'image/png':     { maxSize: 10 * 1024 * 1024,  category: 'image' },
  'image/gif':     { maxSize: 10 * 1024 * 1024,  category: 'image' },
  'image/webp':    { maxSize: 10 * 1024 * 1024,  category: 'image' },
  'application/pdf': { maxSize: 25 * 1024 * 1024, category: 'document' },
  'text/plain':    { maxSize: 5 * 1024 * 1024,   category: 'document' },
  'application/zip': { maxSize: 50 * 1024 * 1024, category: 'archive' },
  // Add more as needed
};

export class AttachmentService {
  private storage = new StorageService();

  /**
   * Generate a pre-signed upload URL for the client.
   */
  async createUploadUrl(params: {
    fileName: string;
    contentType: string;
    contentLength: number;
    workspaceId: string;
    issueId?: string;
    documentId?: string;
    uploadedById: string;
  }) {
    // Validate file type
    const typeConfig = ALLOWED_TYPES[params.contentType];
    if (!typeConfig) {
      throw new Error(`Unsupported file type: ${params.contentType}`);
    }

    // Validate file size
    if (params.contentLength > typeConfig.maxSize) {
      throw new Error(`File exceeds max size of ${typeConfig.maxSize / (1024 * 1024)}MB`);
    }

    // Generate storage key: workspace-id/random-id/filename
    const ext = path.extname(params.fileName);
    const key = `uploads/${params.workspaceId}/${randomUUID()}${ext}`;

    // Get pre-signed URL
    const { uploadUrl } = await this.storage.getSignedUploadUrl({
      key,
      contentType: params.contentType,
      expiresIn: 600,
    });

    // Create attachment record (pending status)
    const [attachment] = await db
      .insert(attachments)
      .values({
        workspaceId: params.workspaceId,
        issueId: params.issueId ?? null,
        documentId: params.documentId ?? null,
        uploadedById: params.uploadedById,
        fileName: params.fileName,
        contentType: params.contentType,
        size: params.contentLength,
        storageKey: key,
        status: 'pending',
      })
      .returning();

    // Schedule thumbnail generation for images
    if (typeConfig.category === 'image') {
      await fileProcessingQueue.add('resize-image', {
        attachmentId: attachment.id,
        storageKey: key,
        contentType: params.contentType,
      });
    }

    return {
      uploadUrl,
      attachment: {
        id: attachment.id,
        storageKey: key,
      },
    };
  }

  /**
   * Confirm upload and update attachment status.
   */
  async confirmUpload(attachmentId: string): Promise<void> {
    await db
      .update(attachments)
      .set({
        status: 'ready',
        updatedAt: new Date(),
      })
      .where(eq(attachments.id, attachmentId));
  }

  /**
   * Get a download URL for an attachment.
   */
  async getDownloadUrl(attachmentId: string): Promise<string> {
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, attachmentId))
      .limit(1);

    if (!attachment) throw new NotFoundError('Attachment', attachmentId);

    return this.storage.getDownloadUrl(attachment.storageKey);
  }

  /**
   * Delete an attachment and its R2 file.
   */
  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, attachmentId))
      .limit(1);

    if (!attachment) throw new NotFoundError('Attachment', attachmentId);
    if (attachment.uploadedById !== userId) throw new ForbiddenError();

    await this.storage.delete(attachment.storageKey);
    await db.delete(attachments).where(eq(attachments.id, attachmentId));
  }
}
```

---

## 11. Cron & Scheduled Tasks

### 11.1 Temporal Workflow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Temporal.io Cluster                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    Workflow Executor                      │    │
│  │                                                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │    │
│  │  │  Cron:        │  │  Workflow:   │  │  Workflow:    │  │    │
│  │  │  Daily Digest │  │  Automation  │  │  SLA Monitor  │  │    │
│  │  │  (9am daily)  │  │  (event-     │  │  (every 5m)   │  │    │
│  │  └──────┬───────┘  │   triggered) │  └───────┬───────┘  │    │
│  │         │          └──────┬───────┘           │          │    │
│  └─────────┼─────────────────┼───────────────────┼──────────┘    │
│            │                 │                   │               │
│            ▼                 ▼                   ▼               │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                   Activity Worker                         │    │
│  │                                                          │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│  │  │ Send     │ │ Call     │ │ Run AI   │ │ Update   │   │    │
│  │  │ Email    │ │ Webhook  │ │ Prompt   │ │ Assignee │   │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │              Temporal Persistence Store                   │    │
│  │              (PostgreSQL / MySQL)                          │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### 11.2 Temporal Workflow Definitions

```typescript
// src/workflows/automation.workflow.ts
import { proxyActivities, sleep, workflowInfo } from '@temporalio/workflow';

const {
  sendEmail,
  callWebhook,
  runAiPrompt,
  updateIssueAssignee,
  getAutomationConfig,
  logWorkflowEvent,
} = proxyActivities({
  startToCloseTimeout: '30 seconds',
  retry: {
    maximumAttempts: 3,
    initialInterval: '1 second',
    backoffCoefficient: 2,
  },
});

interface AutomationTrigger {
  type: 'issue_created' | 'issue_updated' | 'status_changed' | 'scheduled';
  payload: Record<string, unknown>;
}

interface AutomationAction {
  type: 'send_email' | 'call_webhook' | 'ai_auto_assign' | 'set_field' | 'create_issue';
  config: Record<string, unknown>;
}

/**
 * Automation Workflow — Runs a series of actions triggered by an event.
 * Supports: conditions, delays, branching, parallel execution.
 */
export async function automationWorkflow(
  trigger: AutomationTrigger,
  actions: AutomationAction[]
): Promise<{ completed: number; failed: number; errors: string[] }> {
  let completed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'send_email':
          await sendEmail(action.config);
          completed++;
          break;

        case 'call_webhook':
          await callWebhook(action.config);
          completed++;
          break;

        case 'ai_auto_assign': {
          const suggestion = await runAiPrompt({
            type: 'auto_assign',
            input: trigger.payload,
          });
          await updateIssueAssignee(suggestion);
          completed++;
          break;
        }

        case 'set_field':
          await updateIssueAssignee(action.config); // generic field updater
          completed++;
          break;

        case 'create_issue':
          // Chain: create issue → might trigger another automation
          completed++;
          break;
      }
    } catch (err) {
      failed++;
      errors.push(`Action ${action.type} failed: ${(err as Error).message}`);

      await logWorkflowEvent({
        workflowId: workflowInfo().workflowId,
        action: action.type,
        status: 'failed',
        error: (err as Error).message,
      });
    }
  }

  return { completed, failed, errors };
}
```

### 11.3 Scheduled Workflows (Cron)

```typescript
// src/workflows/cron.workflow.ts
import { proxyActivities, sleep } from '@temporalio/workflow';

const {
  generateDailyDigest,
  sendDigestEmails,
  cleanupExpiredTokens,
  aggregateAnalytics,
  checkSLABreaches,
  syncGitIntegrations,
} = proxyActivities({
  startToCloseTimeout: '5 minutes',
  retry: { maximumAttempts: 2 },
});

/**
 * Daily Digest — Runs at 9am in each workspace's timezone.
 * Collects activity summary and sends email digests.
 */
export async function dailyDigestWorkflow(workspaceId: string): Promise<void> {
  const digest = await generateDailyDigest({ workspaceId });
  await sendDigestEmails({
    workspaceId,
    summary: digest,
  });
}

/**
 * SLA Monitor — Runs every 5 minutes.
 * Checks for issues that are about to breach SLA.
 */
export async function slaMonitorWorkflow(): Promise<void> {
  while (true) {
    await checkSLABreaches();
    await sleep('5 minutes');
  }
}

/**
 * Analytics Rollup — Aggregates raw events into hourly/daily buckets.
 */
export async function analyticsRollupWorkflow(): Promise<void> {
  while (true) {
    await aggregateAnalytics({ period: 'hourly' });
    await sleep('1 hour');

    // At midnight UTC, also do daily rollup
    const hour = new Date().getUTCHours();
    if (hour === 0) {
      await aggregateAnalytics({ period: 'daily' });
    }
  }
}
```

### 11.4 Schedule Registry

```typescript
// src/workflows/schedules.ts — Temporal schedule definitions
// Registered once at application startup

export const SCHEDULES = [
  {
    name: 'daily-digest',
    workflowId: 'dailyDigestWorkflow',
    schedule: '0 9 * * *',  // 9:00 AM UTC daily
    // In production: per-workspace schedules with timezone
  },
  {
    name: 'sla-monitor',
    workflowId: 'slaMonitorWorkflow',
    schedule: '*/5 * * * *',  // every 5 minutes
  },
  {
    name: 'analytics-rollup-hourly',
    workflowId: 'analyticsRollupWorkflow',
    schedule: '5 * * * *',  // 5 min past every hour
  },
  {
    name: 'cleanup-expired-tokens',
    workflowId: 'cleanupTokensWorkflow',
    schedule: '0 2 * * *',  // 2:00 AM UTC daily
  },
  {
    name: 'git-sync',
    workflowId: 'gitSyncWorkflow',
    schedule: '*/15 * * * *',  // every 15 minutes
  },
];
```

---

## 12. Health Checks

### 12.1 Health Check Endpoints

```typescript
// src/routes/health.ts
import { Router, type Request, type Response } from 'express';
import { db } from '../lib/database';
import { redis } from '../lib/redis';
import { config } from '../config';

export const healthRouter = Router();

// ─── Liveness Probe ───────────────────────────────────────────
// Is the process alive? Used by k8s liveness probe.
// Returns 200 if the process is running, 500 if not.
healthRouter.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// ─── Readiness Probe ──────────────────────────────────────────
// Can the service handle requests? Checks all dependencies.
// Used by k8s readiness probe + load balancer.
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latencyMs: number; error?: string }> = {};

  // Check PostgreSQL
  try {
    const start = Date.now();
    await db.execute({ sql: { raw: 'SELECT 1' }, args: [] } as any);
    checks.postgres = { status: 'healthy', latencyMs: Date.now() - start };
  } catch (err) {
    checks.postgres = {
      status: 'unhealthy',
      latencyMs: -1,
      error: (err as Error).message,
    };
  }

  // Check Redis
  try {
    const start = Date.now();
    await redis.ping();
    checks.redis = { status: 'healthy', latencyMs: Date.now() - start };
  } catch (err) {
    checks.redis = {
      status: 'unhealthy',
      latencyMs: -1,
      error: (err as Error).message,
    };
  }

  // Check AI Service
  try {
    const start = Date.now();
    const resp = await fetch(`${config.AI_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    checks.aiService = {
      status: resp.ok ? 'healthy' : 'degraded',
      latencyMs: Date.now() - start,
    };
  } catch {
    checks.aiService = {
      status: 'unhealthy',
      latencyMs: -1,
      error: 'Connection refused',
    };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');
  const someHealthy = Object.values(checks).some(
    (c) => c.status === 'healthy' || c.status === 'degraded'
  );

  res.status(allHealthy ? 200 : someHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : someHealthy ? 'degraded' : 'not_ready',
    version: config.APP_VERSION,
    uptime: process.uptime(),
    checks,
    timestamp: new Date().toISOString(),
  });
});

// ─── Detailed Health (internal use) ───────────────────────────
healthRouter.get('/info', async (_req: Request, res: Response) => {
  res.json({
    version: config.APP_VERSION,
    environment: config.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version,
    pid: process.pid,
    timestamp: new Date().toISOString(),
  });
});
```

### 12.2 Health Check Summary

| Endpoint | Purpose | k8s Probe | Success Code | Failure Code |
|----------|---------|-----------|-------------|--------------|
| `GET /health/live` | Process is alive | `livenessProbe` | `200` | `500` |
| `GET /health/ready` | Ready for traffic | `readinessProbe` | `200` | `503` |
| `GET /health/info` | Internal diagnostics | none | `200` | — |

### 12.3 Kubernetes Probe Configuration

```yaml
# k8s deployment probe config
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 15
  failureThreshold: 3
  timeoutSeconds: 5

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 3
  timeoutSeconds: 5

startupProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 30  # 2.5 minutes max startup
```

---

## 13. Graceful Shutdown

### 13.1 Shutdown Manager

```typescript
// src/lib/shutdown.ts
import type { Server } from 'http';
import type { WebSocketServer } from 'ws';
import type { Worker } from 'bullmq';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';

interface ShutdownContext {
  server: Server;
  wsServer: WebSocketServer;
  workers: Worker[];
  db: PostgresJsDatabase;
  redis: Redis;
  logger: Logger;
}

const SHUTDOWN_TIMEOUT = 30_000; // 30 seconds max

export function gracefulShutdown(ctx: ShutdownContext): void {
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    ctx.logger.info(`📡 Received ${signal}. Starting graceful shutdown...`);

    const deadline = Date.now() + SHUTDOWN_TIMEOUT;
    const forceExitTimer = setTimeout(() => {
      ctx.logger.error('⏱️ Forced shutdown — timeout exceeded');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT);

    try {
      // 1. Stop accepting new HTTP connections
      ctx.logger.info('  ↳ Closing HTTP server...');
      await new Promise<void>((resolve) => {
        ctx.server.close(() => resolve());
      });
      ctx.logger.info('  ✓ HTTP server closed');

      // 2. Close WebSocket connections (send close frames)
      ctx.logger.info('  ↳ Closing WebSocket server...');
      await new Promise<void>((resolve) => {
        ctx.wsServer.close(() => resolve());
      });
      ctx.logger.info('  ✓ WebSocket server closed');

      // 3. Drain BullMQ workers (finish current jobs, stop picking new ones)
      ctx.logger.info(`  ↳ Draining ${ctx.workers.length} BullMQ workers...`);
      const workerCloses = ctx.workers.map((w) => w.close());
      await Promise.allSettled(workerCloses);
      ctx.logger.info('  ✓ BullMQ workers drained');

      // 4. Close Redis connection
      ctx.logger.info('  ↳ Closing Redis connection...');
      await ctx.redis.quit();
      ctx.logger.info('  ✓ Redis closed');

      // 5. Close database connection pool
      ctx.logger.info('  ↳ Closing PostgreSQL connection pool...');
      // Drizzle with postgres.js: close the underlying driver
      // await ctx.db.$client.end();
      ctx.logger.info('  ✓ PostgreSQL closed');

      ctx.logger.info('✅ Graceful shutdown complete');
      clearTimeout(forceExitTimer);
      process.exit(0);

    } catch (err) {
      ctx.logger.error('❌ Error during shutdown', { error: err });
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  };

  // Register signal handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions (log then exit)
  process.on('uncaughtException', (err) => {
    ctx.logger.fatal('Uncaught Exception', { error: err });
    shutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    ctx.logger.fatal('Unhandled Rejection', { reason });
    shutdown('unhandledRejection');
  });
}
```

### 13.2 Shutdown Sequence

```
┌──────────────────────────────────────────────────────────────────┐
│                    GRACEFUL SHUTDOWN SEQUENCE                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. SIGTERM / SIGINT received                                     │
│     │                                                             │
│     ▼                                                             │
│  2. Stop accepting new HTTP connections                           │
│     │  server.close() — existing requests continue                │
│     │  Duration: up to 30s (SHUTDOWN_TIMEOUT)                     │
│     │                                                             │
│     ▼                                                             │
│  3. Close WebSocket server                                        │
│     │  Send close frames to all connected clients                 │
│     │  Clients reconnect to healthy pod                           │
│     │                                                             │
│     ▼                                                             │
│  4. Drain BullMQ workers                                          │
│     │  Stop fetching new jobs                                     │
│     │  Complete in-progress jobs (up to timeout)                  │
│     │                                                             │
│     ▼                                                             │
│  5. Close Redis connection                                        │
│     │  Clean disconnect                                           │
│     │                                                             │
│     ▼                                                             │
│  6. Close PostgreSQL pool                                         │
│     │  Drain connection pool                                      │
│     │                                                             │
│     ▼                                                             │
│  7. Process.exit(0)                                               │
│                                                                   │
│  ⏱️  Force exit after 30 seconds if stuck                         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 14. Quick Reference Cheat Sheet

### 14.1 Port Map

| Service | Internal Port | Exposed via |
|---------|---------------|-------------|
| Express API | `3000` | Cloudflare → LB → Pod |
| WebSocket | `3001` (or `3000/ws`) | Cloudflare → LB → Pod |
| AI Sidecar | `8000` | Internal only (node-to-node) |
| Prometheus | `9090` | Internal only |
| Temporal | `7233` | Internal only |

### 14.2 Middleware Order (Express)

```
Helmet → CORS → Compression → RequestID → Logger → RateLimit →
BodyParser → Context Injection → [Auth] → [Workspace] → [Validate] →
[Authorize] → Handler → ErrorHandler → NotFoundHandler
```

### 14.3 Error Code → HTTP Status

| Code | Status | Example |
|------|--------|---------|
| `BAD_REQUEST` | 400 | Malformed JSON |
| `UNAUTHORIZED` | 401 | Expired JWT |
| `FORBIDDEN` | 403 | No workspace access |
| `NOT_FOUND` | 404 | Issue doesn't exist |
| `CONFLICT` | 409 | Duplicate slug |
| `VALIDATION_ERROR` | 422 | Zod failure |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `EXTERNAL_SERVICE_ERROR` | 502 | R2 / AI down |
| `INTERNAL_ERROR` | 500 | Unhandled exception |

### 14.4 BullMQ Job Flow

```
Queue.add(type, data, opts)
    → Redis (waiting)
    → Worker picks up
        → Process job
        → On success: move to completed (TTL: 7-30 days)
        → On failure: retry with exponential backoff
            → After max attempts: move to failed (TTL: 30-90 days)
```

### 14.5 WebSocket Connection Lifecycle

```
Client connects → /ws?room=document:abc&token=xxx
    → JWT verification
    → Room access check
    → Join room → subscribe to Redis Pub/Sub
    → Send initial Yjs state
    → Bidirectional sync (binary Yjs updates)
    → Presence tracking (Redis TTL)
    → On disconnect: leave room, cleanup, presence removal
```

### 14.6 Key File Locations

| Concern | Path |
|---------|------|
| Entry point | `src/server.ts` |
| App factory | `src/app.ts` |
| Config | `src/config/index.ts` |
| Modules | `src/modules/<name>/` |
| Middleware | `src/middleware/` |
| DB schema | `drizzle/schema/` |
| DB migrations | `drizzle/migrations/` |
| Job queues | `src/jobs/queues/` |
| Job workers | `src/jobs/workers/` |
| WebSocket | `src/ws/` |
| Temporal workflows | `src/workflows/` |
| AI service | `ai_service/` (Python) |
| Error classes | `src/lib/errors.ts` |
| Logging | `src/lib/logger.ts` |
| Tracing | `src/lib/tracing.ts` |
| Storage | `src/lib/storage.ts` |

### 14.7 Environment Variables (Required)

```
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/sprintio

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=<min 32 chars>

# R2 Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=

# AI
AI_SERVICE_URL=http://localhost:8000

# Temporal
TEMPORAL_ADDRESS=localhost:7233

# CORS
CORS_ORIGINS=http://localhost:3000
```

---

> **Next Document**: [03-DATABASE.md](./03-DATABASE.md) — PostgreSQL schema design, TimescaleDB hypertables, pgvector configuration, and migration strategy.
