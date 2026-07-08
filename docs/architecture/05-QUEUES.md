# 05 — Queue & Job Processing Architecture

> **Sprintio** — AI-Enhanced Collaborative Work Management Platform
> Last updated: 2026-07-08

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Queue Architecture](#4-queue-architecture)
5. [Job Types Catalog](#5-job-types-catalog)
6. [Worker Patterns](#6-worker-patterns)
7. [Retry Strategy](#7-retry-strategy)
8. [Priority Queues](#8-priority-queues)
9. [Temporal Workflows](#9-temporal-workflows)
10. [Monitoring & Observability](#10-monitoring--observability)
11. [Graceful Shutdown](#11-graceful-shutdown)
12. [Advanced Patterns](#12-advanced-patterns)
13. [Testing Strategy](#13-testing-strategy)
14. [Configuration Reference](#14-configuration-reference)
15. [Quick Reference Cheat Sheet](#15-quick-reference-cheat-sheet)

---

## 1. Overview

Sprintio's asynchronous processing backbone is built on **BullMQ** (Redis-backed) for standard job processing and **Temporal.io** for durable, multi-step workflow orchestration. Every non-latency-critical operation — emails, file processing, AI inference, webhooks, exports — flows through this system, keeping the request/response path fast and resilient.

### Design Principles

| Principle | Rationale |
|---|---|
| **Fail fast, retry smart** | No silent failures. Every job has an exhaustively defined retry policy with dead-letter fallback. |
| **Isolation by concern** | Each job category lives in its own queue with independent concurrency and rate limits. |
| **Observe everything** | Every job emits structured telemetry — progress, timing, errors, payload hash. |
| **Graceful degradation** | A failed email job never blocks webhook delivery. Queue failures are contained. |
| **Idempotent by default** | Every job handler must be safe to re-execute. Idempotency keys are enforced. |
| **Durable workflows for the rest** | Simple fan-out → BullMQ. Multi-step, conditional, long-running → Temporal. |

### When to Use What

```
┌─────────────────────────────────────────────────────────────┐
│                    Incoming Work Request                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Single step │──── Yes ──▶  BullMQ Queue
                    │  job?        │
                    └──────┬──────┘
                           │ No
                    ┌──────▼──────┐
                    │  Multi-step │──── Yes ──▶  Temporal Workflow
                    │  workflow?  │              (may enqueue BullMQ jobs
                    └──────┬──────┘               as activities)
                           │ No
                    ┌──────▼──────┐
                    │  Long-running│──── Yes ──▶  Temporal Workflow
                    │  (>5 min)?  │              with heartbeat
                    └──────┬──────┘
                           │ No
                    Inline processing
```

---

## 2. Technology Stack

| Component | Technology | Version | Purpose |
|---|---|---|---|
| **Job Queue** | BullMQ | ^5.x | Redis-backed job queue with Redis Streams |
| **Message Broker** | Redis | 7.2+ | Queue backend, pub/sub, caching |
| **Workflow Engine** | Temporal.io | 1.24+ | Durable execution for complex workflows |
| **Workflow SDK** | @temporalio/workflow + /activity | 1.11+ | TypeScript workflow/activity definitions |
| **Worker Runtime** | @temporalio/worker | 1.11+ | Temporal worker processes |
| **Scheduler** | node-cron / BullMQ repeat | — | Cron-based recurring jobs |
| **Monitoring** | BullMQ Board (Pro) / Bull Board (OSS) | — | Dashboard for queue inspection |
| **Metrics** | Prometheus + Grafana | — | Queue depth, throughput, latency |

---

## 3. Architecture Diagram

```
                          ┌─────────────────────────────────────────┐
                          │           Application Layer             │
                          │   (Express.js / API Controllers)        │
                          └────────────┬───────────┬───────────────┘
                                       │           │
                          ┌────────────▼───┐  ┌────▼──────────────┐
                          │   BullMQ       │  │   Temporal Client  │
                          │   Producers    │  │   (Workflow Start) │
                          └────┬───────────┘  └────┬──────────────┘
                               │                    │
              ┌────────────────┼────────────┐       │
              │    Redis Cluster (7.2+)     │       │
              │  ┌─────┐ ┌─────┐ ┌─────┐   │       │
              │  │Q:eml│ │Q:whk│ │Q:ai │   │       │
              │  │Q:fil│ │Q:exp│ │Q:idx│   │       │
              │  │Q:act│ │Q:not│ │Q:cln│   │       │
              │  │Q:rec│ │Q:cro│ │Q:dlt│   │       │
              │  └─────┘ └─────┘ └─────┘   │       │
              └───────────┬────────────────┘       │
                          │                        │
         ┌────────────────┼────────────────────────┼──────────────────┐
         │              Worker Layer                │                  │
         │  ┌──────────┐ ┌──────────┐ ┌──────────┐│  ┌────────────┐ │
         │  │ Email    │ │ File     │ │ Webhook  ││  │ Temporal   │ │
         │  │ Worker   │ │ Worker   │ │ Worker   ││  │ Workers    │ │
         │  └──────────┘ └──────────┘ └──────────┘│  │            │ │
         │  ┌──────────┐ ┌──────────┐ ┌──────────┐│  │ Automation │ │
         │  │ AI       │ │ Search   │ │ Export   ││  │ Workflows  │ │
         │  │ Worker   │ │ Worker   │ │ Worker   ││  │            │ │
         │  └──────────┘ └──────────┘ └──────────┘│  └────────────┘ │
         │  ┌──────────┐ ┌──────────┐ ┌──────────┐│                  │
         │  │ Activity │ │ Cron     │ │ Cleanup  ││                  │
         │  │ Worker   │ │ Worker   │ │ Worker   ││                  │
         │  └──────────┘ └──────────┘ └──────────┘│                  │
         └────────────────────┬───────────────────┘                  │
                              │                                      │
         ┌────────────────────┼──────────────────────────────────────┘
         │                    │
         │  ┌─────────────────┼──────────────────────────────┐
         │  │              External Services                  │
         │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │
         │  │  │SMTP/   │ │S3/R2   │ │Python  │ │Search  │  │
         │  │  │Resend  │ │Storage │ │FastAPI │ │Meilis. │  │
         │  │  └────────┘ └────────┘ └────────┘ └────────┘  │
         │  └────────────────────────────────────────────────┘
         │
    ┌────▼────────────────────┐
    │    PostgreSQL 16        │
    │  (job metadata, audit)  │
    └─────────────────────────┘
```

---

## 4. Queue Architecture

### 4.1 Connection & Shared Configuration

```typescript
// src/queues/connection.ts

import { Queue, QueueOptions, WorkerOptions, ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';

// ─── Redis Connection Pool ───────────────────────────────────────
export const REDIS_CONNECTION_OPTIONS: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_QUEUE_DB || '0', 10),
  maxRetriesPerRequest: null,          // Required by BullMQ
  enableReadyCheck: true,
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
};

// ─── Reusable Blocking Connection (for Workers) ──────────────────
export function createWorkerRedisConnection(): Redis {
  return new Redis(REDIS_CONNECTION_OPTIONS, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  });
}

// ─── Reusable Non-Blocking Connection (for Producers) ────────────
export function createProducerRedisConnection(): Redis {
  return new Redis(REDIS_CONNECTION_OPTIONS, {
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
  });
}

// ─── Shared Queue Options Factory ────────────────────────────────
export function createQueueOptions(
  queueName: string,
  overrides: Partial<QueueOptions> = {},
): QueueOptions {
  return {
    connection: createProducerRedisConnection(),
    prefix: `sprintio:${queueName}`,
    defaultJobOptions: {
      removeOnComplete: { age: 7 * 24 * 3600, count: 1000 },   // Keep 7 days or 1000 jobs
      removeOnFail: { age: 30 * 24 * 3600, count: 5000 },      // Keep 30 days or 5000 jobs
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
    ...overrides,
  };
}

// ─── Shared Worker Options Factory ───────────────────────────────
export function createWorkerOptions(
  queueName: string,
  overrides: Partial<WorkerOptions> = {},
): WorkerOptions {
  return {
    connection: createWorkerRedisConnection(),
    prefix: `sprintio:${queueName}`,
    concurrency: 5,
    limiter: undefined,  // Set per-queue in queue definitions
    lockDuration: 30_000,
    lockRenewTime: 15_000,
    stalledInterval: 30_000,
    maxStalledCount: 3,
    settings: {
      stalledInterval: 30_000,
      maxStalledCount: 3,
    },
    ...overrides,
  };
}
```

### 4.2 Queue Registry

```typescript
// src/queues/registry.ts

import { Queue } from 'bullmq';
import {
  createQueueOptions,
  createProducerRedisConnection,
} from './connection';

// ─── Queue Name Constants ────────────────────────────────────────
export const QUEUES = {
  EMAIL:          'email',
  FILE_PROCESS:   'file-process',
  WEBHOOK:        'webhook',
  AI_PROCESS:     'ai-process',
  SEARCH_INDEX:   'search-index',
  EXPORT:         'export',
  ACTIVITY_LOG:   'activity-log',
  NOTIFICATION:   'notification',
  CRON_TASKS:     'cron-tasks',
  CLEANUP:        'cleanup',
  // Dead Letter Queue (one per critical queue)
  DLQ_EMAIL:      'dlq:email',
  DLQ_WEBHOOK:    'dlq:webhook',
  DLQ_AI:         'dlq:ai-process',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

// ─── Singleton Queue Instances ────────────────────────────────────
const connection = createProducerRedisConnection();
const queueInstances = new Map<string, Queue>();

export function getQueue(name: QueueName): Queue {
  if (!queueInstances.has(name)) {
    const queue = new Queue(name, createQueueOptions(name));
    queueInstances.set(name, queue);
  }
  return queueInstances.get(name)!;
}

// ─── Queue Health Check ──────────────────────────────────────────
export interface QueueHealth {
  name: string;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
  isPaused: boolean;
}

export async function getQueuesHealth(): Promise<QueueHealth[]> {
  const criticalQueues = [
    QUEUES.EMAIL,
    QUEUES.FILE_PROCESS,
    QUEUES.WEBHOOK,
    QUEUES.AI_PROCESS,
    QUEUES.EXPORT,
    QUEUES.CLEANUP,
  ];

  return Promise.all(
    criticalQueues.map(async (name) => {
      const queue = getQueue(name);
      const counts = await queue.getJobCounts(
        'waiting', 'active', 'completed', 'failed', 'delayed', 'paused',
      );
      const isPaused = await queue.isPaused();
      return { name, counts, isPaused };
    }),
  );
}

// ─── Graceful Queue Closure ──────────────────────────────────────
export async function closeAllQueues(): Promise<void> {
  await Promise.all(
    Array.from(queueInstances.values()).map((q) => q.close()),
  );
  await connection.quit();
}
```

### 4.3 Queue Definitions

Each queue gets its own configuration tuned for its workload:

| Queue | Concurrency | Rate Limit | Lock Duration | Timeout | Backoff |
|---|---|---|---|---|---|
| `email` | 10 | 100/min | 30s | 30s | Exponential, 3 attempts |
| `file-process` | 3 | 20/min | 120s | 120s | Exponential, 5 attempts |
| `webhook` | 10 | 200/min | 15s | 15s | Exponential, 8 attempts |
| `ai-process` | 2 | 10/min | 300s | 300s | Exponential, 4 attempts |
| `search-index` | 5 | — | 30s | 30s | Exponential, 3 attempts |
| `export` | 2 | 5/min | 300s | 600s | Linear, 3 attempts |
| `activity-log` | 10 | — | 15s | 10s | Exponential, 5 attempts |
| `notification` | 5 | — | 30s | 15s | Exponential, 4 attempts |
| `cron-tasks` | 2 | — | 60s | 120s | Exponential, 3 attempts |
| `cleanup` | 1 | 1/min | 300s | 600s | Linear, 2 attempts |

---

## 5. Job Types Catalog

### 5.1 Email Jobs

```typescript
// src/queues/jobs/email.job.ts

import { Job } from 'bullmq';

export interface EmailJobData {
  idempotencyKey: string;          // Ensures deduplication
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  template: EmailTemplate;
  variables: Record<string, unknown>;
  organizationId: string;
  scheduledAt?: Date;              // For delayed sends
  priority?: number;               // 1 (highest) — 25 (lowest)
}

export type EmailTemplate =
  | 'welcome'
  | 'invite-member'
  | 'task-assigned'
  | 'task-completed'
  | 'comment-mention'
  | 'digest-daily'
  | 'digest-weekly'
  | 'password-reset'
  | 'magic-link'
  | 'export-ready'
  | 'trial-ending'
  | 'workspace-invitation';

// Handler
export async function processEmailJob(job: Job<EmailJobData>): Promise<{ messageId: string }> {
  const { to, cc, bcc, template, variables, idempotencyKey } = job.data;

  // Step 1: Check idempotency
  const alreadySent = await checkIdempotency(idempotencyKey);
  if (alreadySent) {
    job.log('Duplicate job detected, skipping');
    return { messageId: 'duplicate-skipped' };
  }

  // Step 2: Render template
  await job.updateProgress(20);
  const { subject, html, text } = await renderEmailTemplate(template, variables);

  // Step 3: Send via provider (Resend / AWS SES)
  await job.updateProgress(60);
  const messageId = await sendEmail({
    to: Array.isArray(to) ? to : [to],
    cc,
    bcc,
    subject,
    html,
    text,
    organizationId: job.data.organizationId,
  });

  // Step 4: Record idempotency
  await job.updateProgress(90);
  await recordIdempotency(idempotencyKey, messageId);

  // Step 5: Mark complete
  await job.updateProgress(100);
  return { messageId };
}

// Queue configuration for email jobs
export const EMAIL_JOB_CONFIG = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2_000 },
  timeout: 30_000,
  removeOnComplete: { age: 7 * 24 * 3600, count: 500 },
  removeOnFail: { age: 30 * 24 * 3600, count: 2000 },
};
```

### 5.2 File Processing Jobs

```typescript
// src/queues/jobs/file-process.job.ts

import { Job } from 'bullmq';
import { Readable } from 'stream';

export interface FileProcessJobData {
  idempotencyKey: string;
  fileId: string;
  organizationId: string;
  operations: FileOperation[];
  sourceUrl: string;                // S3/R2 signed URL or internal path
  metadata: {
    originalName: string;
    mimeType: string;
    size: number;
  };
}

export type FileOperation =
  | { type: 'resize'; width: number; height: number; fit?: 'cover' | 'contain' | 'fill' }
  | { type: 'thumbnail'; width: number; height: number }
  | { type: 'extract-preview'; format: 'pdf' | 'video'; page?: number; timestamp?: number }
  | { type: 'convert'; targetFormat: 'webp' | 'avif' | 'mp4' | 'mov' }
  | { type: 'strip-metadata' }
  | { type: 'compress'; quality: number };

export interface FileProcessJobResult {
  fileId: string;
  outputs: Array<{
    operation: FileOperation['type'];
    url: string;
    size: number;
    mimeType: string;
  }>;
  processingTimeMs: number;
}

export async function processFileJob(
  job: Job<FileProcessJobData>,
): Promise<FileProcessJobResult> {
  const { fileId, operations, sourceUrl, metadata } = job.data;
  const startTime = Date.now();
  const totalOps = operations.length;

  // Step 1: Download source file
  await job.updateProgress(5);
  const sourceBuffer = await downloadFile(sourceUrl);

  // Step 2: Execute each operation sequentially, reporting progress
  const outputs: FileProcessJobResult['outputs'] = [];

  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i];
    const baseProgress = 10 + ((i / totalOps) * 85);

    await job.updateProgress(Math.round(baseProgress));
    job.log(`Executing operation ${i + 1}/${totalOps}: ${operation.type}`);

    const result = await executeFileOperation(sourceBuffer, operation, metadata);
    outputs.push(result);
  }

  // Step 3: Upload processed files to storage
  await job.updateProgress(98);
  const uploadedOutputs = await Promise.all(
    outputs.map((out) => uploadToStorage(out, fileId)),
  );

  await job.updateProgress(100);

  return {
    fileId,
    outputs: uploadedOutputs,
    processingTimeMs: Date.now() - startTime,
  };
}

export const FILE_PROCESS_JOB_CONFIG = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 5_000 },
  timeout: 120_000,
  removeOnComplete: { age: 3 * 24 * 3600, count: 200 },
  removeOnFail: { age: 30 * 24 * 3600, count: 500 },
};
```

### 5.3 Webhook Delivery Jobs

```typescript
// src/queues/jobs/webhook.job.ts

import { Job } from 'bullmq';
import crypto from 'crypto';

export interface WebhookJobData {
  idempotencyKey: string;
  webhookId: string;
  organizationId: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  payload: Record<string, unknown>;
  secret: string;                   // For HMAC signature
  attempt?: number;                 // Current attempt number (for manual retries)
  timeout?: number;                 // Per-request timeout, default 10s
}

export interface WebhookJobResult {
  statusCode: number;
  responseBody: string;
  durationMs: number;
  success: boolean;
}

export async function processWebhookJob(
  job: Job<WebhookJobData>,
): Promise<WebhookJobResult> {
  const { url, method, headers, payload, secret, timeout = 10_000 } = job.data;
  const startTime = Date.now();

  // Step 1: Generate HMAC signature
  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  // Step 2: Fire webhook with timeout
  await job.updateProgress(10);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Sprintio-Signature': `sha256=${signature}`,
        'X-Sprintio-Event': payload.event as string || 'unknown',
        'X-Sprintio-Delivery': job.data.idempotencyKey,
        'User-Agent': 'Sprintio-Webhook/1.0',
        ...headers,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timer);
    await job.updateProgress(80);

    const responseBody = await response.text();
    const durationMs = Date.now() - startTime;
    const success = response.status >= 200 && response.status < 300;

    // Log delivery for audit
    await logWebhookDelivery({
      webhookId: job.data.webhookId,
      statusCode: response.status,
      durationMs,
      success,
      attemptNumber: job.attemptsMade + 1,
    });

    await job.updateProgress(100);

    return { statusCode: response.status, responseBody, durationMs, success };
  } catch (error) {
    clearTimeout(timer);
    const durationMs = Date.now() - startTime;

    await logWebhookDelivery({
      webhookId: job.data.webhookId,
      statusCode: 0,
      durationMs,
      success: false,
      error: (error as Error).message,
      attemptNumber: job.attemptsMade + 1,
    });

    throw error; // Let BullMQ handle retry
  }
}

export const WEBHOOK_JOB_CONFIG = {
  attempts: 8,                       // Webhooks get more retries — external services are flaky
  backoff: { type: 'exponential' as const, delay: 5_000 },
  timeout: 30_000,
  removeOnComplete: { age: 14 * 24 * 3600, count: 1000 },
  removeOnFail: { age: 30 * 24 * 3600, count: 5000 },
};
```

### 5.4 AI Processing Jobs

```typescript
// src/queues/jobs/ai-process.job.ts

import { Job } from 'bullmq';

export interface AIProcessJobData {
  idempotencyKey: string;
  taskId?: string;
  organizationId: string;
  userId: string;
  operation: AIOperation;
  model?: string;                   // Optional model override
  timeout?: number;
}

export type AIOperation =
  | {
      type: 'summarize';
      content: string;
      maxLength?: number;
      language?: string;
    }
  | {
      type: 'auto-assign';
      projectId: string;
      taskTitle: string;
      taskDescription: string;
      availableMembers: Array<{ id: string; role: string; skills: string[] }>;
    }
  | {
      type: 'semantic-search-index';
      entityId: string;
      entityType: 'task' | 'comment' | 'document';
      text: string;
      metadata: Record<string, unknown>;
    }
  | {
      type: 'smart-categorize';
      title: string;
      description: string;
      existingCategories: Array<{ id: string; name: string }>;
    };

export interface AIProcessJobResult {
  operation: AIOperation['type'];
  result: unknown;
  model: string;
  tokensUsed: number;
  durationMs: number;
}

export async function processAIJob(
  job: Job<AIProcessJobData>,
): Promise<AIProcessJobResult> {
  const { operation, organizationId, userId } = job.data;
  const startTime = Date.now();

  // Step 1: Check rate limits for the organization
  await checkAIRateLimit(organizationId);
  await job.updateProgress(5);

  // Step 2: Route to the appropriate AI handler
  let result: unknown;
  let model: string;
  let tokensUsed: number;

  switch (operation.type) {
    case 'summarize':
      await job.updateProgress(10);
      ({ result, model, tokensUsed } = await handleSummarize(job, operation));
      break;

    case 'auto-assign':
      await job.updateProgress(10);
      ({ result, model, tokensUsed } = await handleAutoAssign(job, operation));
      break;

    case 'semantic-search-index':
      await job.updateProgress(10);
      ({ result, model, tokensUsed } = await handleSemanticIndex(job, operation));
      break;

    case 'smart-categorize':
      await job.updateProgress(10);
      ({ result, model, tokensUsed } = await handleSmartCategorize(job, operation));
      break;

    default:
      throw new Error(`Unknown AI operation: ${(operation as any).type}`);
  }

  // Step 3: Log token usage for billing
  await job.updateProgress(90);
  await logTokenUsage({
    organizationId,
    userId,
    operation: operation.type,
    model,
    tokensUsed,
    durationMs: Date.now() - startTime,
  });

  await job.updateProgress(100);

  return {
    operation: operation.type,
    result,
    model,
    tokensUsed,
    durationMs: Date.now() - startTime,
  };
}

async function handleSummarize(
  job: Job<AIProcessJobData>,
  op: Extract<AIOperation, { type: 'summarize' }>,
): Promise<{ result: string; model: string; tokensUsed: number }> {
  // Call Python FastAPI sidecar for AI inference
  const response = await callAISidecar('/v1/summarize', {
    content: op.content,
    max_length: op.maxLength ?? 200,
    language: op.language,
  });

  await job.updateProgress(60);

  return {
    result: response.summary,
    model: response.model,
    tokensUsed: response.usage.total_tokens,
  };
}

export const AI_PROCESS_JOB_CONFIG = {
  attempts: 4,
  backoff: { type: 'exponential' as const, delay: 10_000 },
  timeout: 300_000,                 // 5 minutes — AI inference can be slow
  removeOnComplete: { age: 7 * 24 * 3600, count: 500 },
  removeOnFail: { age: 30 * 24 * 3600, count: 1000 },
};
```

### 5.5 Remaining Jobs (Summary)

```typescript
// src/queues/jobs/search-index.job.ts
export interface SearchIndexJobData {
  idempotencyKey: string;
  operation: 'index' | 'update' | 'delete';
  entityType: 'task' | 'comment' | 'document' | 'project';
  entityId: string;
  organizationId: string;
  data?: Record<string, unknown>;     // Full data for index/update, omitted for delete
}

// src/queues/jobs/export.job.ts
export interface ExportJobData {
  idempotencyKey: string;
  userId: string;
  organizationId: string;
  format: 'csv' | 'pdf' | 'xlsx';
  resourceType: 'tasks' | 'projects' | 'time-entries' | 'reports';
  filters: Record<string, unknown>;
  dateRange?: { from: string; to: string };
}

// src/queues/jobs/activity-log.job.ts
export interface ActivityLogJobData {
  organizationId: string;
  userId: string;
  action: string;                    // e.g., 'task.created', 'comment.added'
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  timestamp: string;                 // ISO timestamp from the originating request
}

// src/queues/jobs/notification.job.ts
export interface NotificationJobData {
  idempotencyKey: string;
  userId: string;
  organizationId: string;
  type: 'in-app' | 'push' | 'digest-batch';
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

// src/queues/jobs/cron-tasks.job.ts
export interface CronTaskJobData {
  idempotencyKey: string;
  organizationId: string;
  cronExpression: string;            // Standard cron syntax
  action: CronAction;
  enabled: boolean;
}

export type CronAction =
  | { type: 'create-task'; template: Record<string, unknown>; assignTo?: string }
  | { type: 'send-reminder'; taskId: string; userId: string }
  | { type: 'run-report'; reportId: string; recipients: string[] };

// src/queues/jobs/cleanup.job.ts
export interface CleanupJobData {
  type: 'expired-sessions' | 'soft-deleted' | 'temp-files' | 'orphaned-uploads';
  organizationId?: string;           // Scoped cleanup, or undefined for global
  olderThanDays?: number;
  batchSize?: number;
}

// All job configs
export const JOB_CONFIGS = {
  'email':           { attempts: 3, backoff: { type: 'exponential' as const, delay: 2_000 },  timeout: 30_000 },
  'file-process':    { attempts: 5, backoff: { type: 'exponential' as const, delay: 5_000 },  timeout: 120_000 },
  'webhook':         { attempts: 8, backoff: { type: 'exponential' as const, delay: 5_000 },  timeout: 30_000 },
  'ai-process':      { attempts: 4, backoff: { type: 'exponential' as const, delay: 10_000 }, timeout: 300_000 },
  'search-index':    { attempts: 3, backoff: { type: 'exponential' as const, delay: 2_000 },  timeout: 30_000 },
  'export':          { attempts: 3, backoff: { type: 'linear' as const, delay: 10_000 },      timeout: 600_000 },
  'activity-log':    { attempts: 5, backoff: { type: 'exponential' as const, delay: 1_000 },  timeout: 10_000 },
  'notification':    { attempts: 4, backoff: { type: 'exponential' as const, delay: 2_000 },  timeout: 15_000 },
  'cron-tasks':      { attempts: 3, backoff: { type: 'exponential' as const, delay: 5_000 },  timeout: 120_000 },
  'cleanup':         { attempts: 2, backoff: { type: 'linear' as const, delay: 30_000 },      timeout: 600_000 },
};
```

### 5.6 Complete Job Configuration Reference

| Job Type | Attempts | Backoff | Delay | Timeout | Max Memory | DLQ |
|---|---|---|---|---|---|---|
| Email | 3 | Exponential | 2s → 4s → 8s | 30s | 50MB | Yes |
| File Processing | 5 | Exponential | 5s → 10s → … → 80s | 120s | 512MB | No |
| Webhook | 8 | Exponential | 5s → 10s → … → 640s | 30s | 20MB | Yes |
| AI Processing | 4 | Exponential | 10s → 20s → … → 80s | 300s | 256MB | Yes |
| Search Index | 3 | Exponential | 2s → 4s → 8s | 30s | 50MB | No |
| Export | 3 | Linear | 10s → 20s → 30s | 600s | 256MB | No |
| Activity Log | 5 | Exponential | 1s → 2s → … → 16s | 10s | 10MB | No |
| Notification | 4 | Exponential | 2s → 4s → … → 16s | 15s | 20MB | No |
| Cron Tasks | 3 | Exponential | 5s → 10s → 20s | 120s | 50MB | No |
| Cleanup | 2 | Linear | 30s → 60s | 600s | 128MB | No |

---

## 6. Worker Patterns

### 6.1 Worker Factory

```typescript
// src/workers/worker-factory.ts

import { Worker, Job } from 'bullmq';
import { createWorkerRedisConnection } from '../queues/connection';
import { JOB_CONFIGS } from '../queues/jobs';
import { QUEUES } from '../queues/registry';
import { logger } from '../lib/logger';
import { metrics } from '../lib/metrics';

interface WorkerDefinition {
  queueName: string;
  handler: (job: Job) => Promise<unknown>;
  concurrency: number;
  rateLimit?: {
    max: number;
    duration: number;  // milliseconds
  };
}

export function createWorker(definition: WorkerDefinition): Worker {
  const { queueName, handler, concurrency, rateLimit } = definition;
  const config = JOB_CONFIGS[queueName as keyof typeof JOB_CONFIGS];

  const worker = new Worker(
    queueName,
    async (job: Job) => {
      const startTime = Date.now();
      const labels = { queue: queueName, jobType: job.name || queueName };

      logger.info(`Processing job ${job.id} in queue ${queueName}`, {
        jobId: job.id,
        queue: queueName,
        data: sanitizeJobData(job.data),
        attempt: job.attemptsMade + 1,
      });

      // Increment active jobs metric
      metrics.activeJobs.inc(labels);

      try {
        const result = await handler(job);

        const durationMs = Date.now() - startTime;
        metrics.jobDuration.observe(labels, durationMs / 1000);
        metrics.jobsCompleted.inc(labels);

        logger.info(`Job ${job.id} completed in ${durationMs}ms`, {
          jobId: job.id,
          queue: queueName,
          durationMs,
          result: typeof result === 'object' ? '(object)' : result,
        });

        return result;
      } catch (error) {
        const durationMs = Date.now() - startTime;
        metrics.jobDuration.observe(labels, durationMs / 1000);
        metrics.jobsFailed.inc(labels);

        logger.error(`Job ${job.id} failed (attempt ${job.attemptsMade + 1})`, {
          jobId: job.id,
          queue: queueName,
          error: (error as Error).message,
          stack: (error as Error).stack,
          attempt: job.attemptsMade + 1,
          maxAttempts: config?.attempts ?? 3,
          willRetry: job.attemptsMade + 1 < (config?.attempts ?? 3),
        });

        throw error; // BullMQ handles retry logic
      }
    },
    {
      connection: createWorkerRedisConnection(),
      prefix: `sprintio`,
      concurrency,
      lockDuration: config?.timeout ?? 30_000,
      lockRenewTime: 15_000,
      stalledInterval: 30_000,
      maxStalledCount: 3,
      limiter: rateLimit
        ? { max: rateLimit.max, duration: rateLimit.duration }
        : undefined,
      settings: {
        stalledInterval: 30_000,
        maxStalledCount: 3,
      },
    },
  );

  // ─── Worker Event Listeners ──────────────────────────────────
  worker.on('failed', (job, err) => {
    if (job) {
      logger.error(`Job ${job.id} failed permanently`, {
        jobId: job.id,
        queue: queueName,
        error: err.message,
        attemptsMade: job.attemptsMade,
      });
    }
  });

  worker.on('stalled', (jobId) => {
    logger.warn(`Job ${jobId} stalled in queue ${queueName}`, { jobId, queue: queueName });
    metrics.jobsStalled.inc({ queue: queueName });
  });

  worker.on('error', (err) => {
    logger.error(`Worker error in queue ${queueName}`, { queue: queueName, error: err.message });
    metrics.workerErrors.inc({ queue: queueName });
  });

  return worker;
}
```

### 6.2 Worker Definitions

```typescript
// src/workers/workers.ts

import { createWorker } from './worker-factory';
import { processEmailJob } from '../queues/jobs/email.job';
import { processFileJob } from '../queues/jobs/file-process.job';
import { processWebhookJob } from '../queues/jobs/webhook.job';
import { processAIJob } from '../queues/jobs/ai-process.job';
import { QUEUES } from '../queues/registry';

export const WORKERS = [
  createWorker({
    queueName: QUEUES.EMAIL,
    handler: processEmailJob,
    concurrency: 10,
    rateLimit: { max: 100, duration: 60_000 },   // 100 emails/minute
  }),

  createWorker({
    queueName: QUEUES.FILE_PROCESS,
    handler: processFileJob,
    concurrency: 3,                               // CPU-intensive, keep low
    // No rate limit — throughput-limited by concurrency
  }),

  createWorker({
    queueName: QUEUES.WEBHOOK,
    handler: processWebhookJob,
    concurrency: 10,
    rateLimit: { max: 200, duration: 60_000 },   // 200 webhooks/minute
  }),

  createWorker({
    queueName: QUEUES.AI_PROCESS,
    handler: processAIJob,
    concurrency: 2,                               // AI inference is expensive
    rateLimit: { max: 10, duration: 60_000 },    // 10 AI jobs/minute
  }),

  createWorker({
    queueName: QUEUES.SEARCH_INDEX,
    handler: processSearchIndexJob,
    concurrency: 5,
  }),

  createWorker({
    queueName: QUEUES.EXPORT,
    handler: processExportJob,
    concurrency: 2,                               // Memory-intensive
  }),

  createWorker({
    queueName: QUEUES.ACTIVITY_LOG,
    handler: processActivityLogJob,
    concurrency: 10,
  }),

  createWorker({
    queueName: QUEUES.NOTIFICATION,
    handler: processNotificationJob,
    concurrency: 5,
  }),

  createWorker({
    queueName: QUEUES.CRON_TASKS,
    handler: processCronTaskJob,
    concurrency: 2,
  }),

  createWorker({
    queueName: QUEUES.CLEANUP,
    handler: processCleanupJob,
    concurrency: 1,                               // Only one cleanup at a time
    rateLimit: { max: 1, duration: 60_000 },      // Max once per minute
  }),
];
```

### 6.3 Progress Reporting Pattern

```typescript
// src/workers/progress.ts

import { Job } from 'bullmq';

/**
 * Helper for structured progress reporting with stages.
 * Jobs report progress as a number 0–100 with named stages
 * for monitoring and debugging.
 */
export class JobProgress {
  private stages: Array<{ name: string; weight: number }> = [];
  private currentStageIndex = 0;

  constructor(
    private job: Job,
    private stageDefinitions: Array<{ name: string; weight: number }>,
  ) {
    this.stages = stageDefinitions;
  }

  async advance(stageName?: string): Promise<void> {
    if (stageName) {
      const idx = this.stages.findIndex((s) => s.name === stageName);
      if (idx !== -1) this.currentStageIndex = idx;
    }

    const totalWeight = this.stages.reduce((sum, s) => sum + s.weight, 0);
    const completedWeight = this.stages
      .slice(0, this.currentStageIndex)
      .reduce((sum, s) => sum + s.weight, 0);
    const progress = Math.round((completedWeight / totalWeight) * 100);

    this.job.log(`[${this.stages[this.currentStageIndex].name}] ${progress}%`);
    await this.job.updateProgress(progress);

    this.currentStageIndex = Math.min(
      this.currentStageIndex + 1,
      this.stages.length - 1,
    );
  }
}

// Usage in a worker:
async function processExportJob(job: Job<ExportJobData>): Promise<ExportResult> {
  const progress = new JobProgress(job, [
    { name: 'validating',   weight: 5 },
    { name: 'querying',     weight: 25 },
    { name: 'generating',   weight: 50 },
    { name: 'uploading',    weight: 15 },
    { name: 'notifying',    weight: 5 },
  ]);

  await progress.advance('validating');
  const config = await validateExportRequest(job.data);

  await progress.advance('querying');
  const data = await queryExportData(config);

  await progress.advance('generating');
  const file = await generateExportFile(data, job.data.format);

  await progress.advance('uploading');
  const downloadUrl = await uploadExport(file, job.data);

  await progress.advance('notifying');
  await notifyExportReady(job.data.userId, downloadUrl);

  await progress.advance();
  return { downloadUrl, recordCount: data.length };
}
```

---

## 7. Retry Strategy

### 7.1 Exponential Backoff Configuration

```
Attempt 1 → immediate
Attempt 2 → delay: baseDelay
Attempt 3 → delay: baseDelay × 2
Attempt 4 → delay: baseDelay × 4
Attempt N → delay: baseDelay × 2^(N-2)

Jitter: ±20% random variance applied to prevent thundering herd
```

### 7.2 Retry Decision Tree

```
Job Fails
    │
    ├── Is error retryable? (network timeout, 5xx, rate limit)
    │     │
    │     ├── Yes → attempts remaining?
    │     │           │
    │     │           ├── Yes → Schedule with backoff
    │     │           │
    │     │           └── No → Move to Dead Letter Queue
    │     │
    │     └── No → (validation error, 4xx, auth failure)
    │               │
    │               └── Immediately move to DLQ (no retry)
    │
    └── Is payload corrupt / unparseable?
          │
          └── Move to DLQ immediately
```

### 7.3 Dead Letter Queue Implementation

```typescript
// src/queues/dlq.ts

import { Queue, Job } from 'bullmq';
import { getQueue, QUEUES } from './registry';
import { logger } from '../lib/logger';
import { metrics } from '../lib/metrics';

interface DLQEntry {
  originalQueue: string;
  jobId: string;
  jobName: string;
  data: unknown;
  error: {
    message: string;
    stack?: string;
    code?: string;
  };
  attempts: number;
  failedAt: string;
  originalCreatedAt: string;
}

const DLQ_QUEUE_MAP: Record<string, string> = {
  [QUEUES.EMAIL]:     QUEUES.DLQ_EMAIL,
  [QUEUES.WEBHOOK]:   QUEUES.DLQ_WEBHOOK,
  [QUEUES.AI_PROCESS]: QUEUES.DLQ_AI,
};

/**
 * Move a permanently failed job to the Dead Letter Queue.
 * Called from worker `failed` event when attempts are exhausted.
 */
export async function moveToDLQ(job: Job, error: Error): Promise<void> {
  const dlqName = DLQ_QUEUE_MAP[job.queueName];

  if (!dlqName) {
    // Queue doesn't have a DLQ — log and discard
    logger.error('Job failed with no DLQ configured', {
      queue: job.queueName,
      jobId: job.id,
      error: error.message,
    });
    metrics.jobsLost.inc({ queue: job.queueName });
    return;
  }

  const dlq = getQueue(dlqName as any);

  const entry: DLQEntry = {
    originalQueue: job.queueName,
    jobId: job.id!,
    jobName: job.name || 'unknown',
    data: job.data,
    error: {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    },
    attempts: job.attemptsMade + 1,
    failedAt: new Date().toISOString(),
    originalCreatedAt: new Date(job.timestamp).toISOString(),
  };

  await dlq.add('failed-job', entry, {
    removeOnComplete: { age: 90 * 24 * 3600 },  // Keep DLQ entries for 90 days
    removeOnFail: false,                          // Never auto-remove failed DLQ entries
  });

  logger.warn('Job moved to DLQ', {
    originalQueue: job.queueName,
    dlqName,
    jobId: job.id,
    error: error.message,
    attempts: job.attemptsMade + 1,
  });

  metrics.jobsMovedToDLQ.inc({ queue: job.queueName });
  metrics.dlqDepth.inc({ dlq: dlqName });
}

/**
 * Retry a job from the Dead Letter Queue.
 * Manually triggered via admin API.
 */
export async function retryFromDLQ(
  dlqName: string,
  jobId: string,
  options: { modifyData?: Partial<unknown> } = {},
): Promise<void> {
  const dlq = getQueue(dlqName as any);
  const job = await dlq.getJob(jobId);

  if (!job) {
    throw new Error(`DLQ job ${jobId} not found in ${dlqName}`);
  }

  const entry = job.data as DLQEntry;
  const originalQueue = getQueue(entry.originalQueue as any);

  // Re-add to the original queue
  await originalQueue.add(entry.jobName, {
    ...entry.data,
    ...options.modifyData,
  }, {
    attempts: 3,                                // Fresh retry count
    backoff: { type: 'exponential', delay: 2_000 },
  });

  // Remove from DLQ
  await job.remove();

  logger.info('Job retried from DLQ', {
    originalQueue: entry.originalQueue,
    dlqName,
    jobId: entry.jobId,
  });
}

/**
 * List all jobs in a DLQ for admin inspection.
 */
export async function listDLQJobs(
  dlqName: string,
  start = 0,
  end = 50,
): Promise<DLQEntry[]> {
  const dlq = getQueue(dlqName as any);
  const jobs = await dlq.getJobs(['waiting'], start, end);

  return jobs.map((job) => job.data as DLQEntry);
}
```

### 7.4 Non-Retryable Error Classification

```typescript
// src/workers/error-classification.ts

export enum ErrorClassification {
  RETRYABLE      = 'retryable',
  NON_RETRYABLE  = 'non-retryable',
  TRANSIENT      = 'transient',        // Retryable, but alert on repeated occurrence
}

const NON_RETRYABLE_PATTERNS = [
  /invalid[_\-]?email/i,
  /email[_\-]?not[_\-]?found/i,
  /bounced/i,
  /unsubscribed/i,
  /invalid[_\-]?signature/i,
  /unauthorized/i,
  /forbidden/i,
  /not[_\-]?found/i,
  /validation[_\-]?error/i,
  /bad[_\-]?request/i,
  /422/i,
  /401/i,
  /403/i,
  /404/i,
];

const TRANSIENT_PATTERNS = [
  /rate[_\-]?limit/i,
  /429/i,
  /timeout/i,
  /econnreset/i,
  /econnrefused/i,
  /socket[_\-]?hang[_\-]?up/i,
  /503/i,
  /502/i,
];

export function classifyError(error: Error): ErrorClassification {
  const message = error.message || '';

  for (const pattern of NON_RETRYABLE_PATTERNS) {
    if (pattern.test(message)) return ErrorClassification.NON_RETRYABLE;
  }

  for (const pattern of TRANSIENT_PATTERNS) {
    if (pattern.test(message)) return ErrorClassification.TRANSIENT;
  }

  return ErrorClassification.RETRYABLE;
}

/**
 * Wrap job handler to apply error classification.
 * Prevents wasting retry attempts on permanent failures.
 */
export function withRetryClassification<T>(
  handler: (job: any) => Promise<T>,
): (job: any) => Promise<T> {
  return async (job) => {
    try {
      return await handler(job);
    } catch (error) {
      const classification = classifyError(error as Error);

      if (classification === ErrorClassification.NON_RETRYABLE) {
        // Mark as failed without retry by throwing a non-retryable error
        const nonRetryable = Object.assign(error as Error, {
          [Symbol.for('bullmq:skipRetry')]: true,
        });
        throw nonRetryable;
      }

      throw error; // Let BullMQ handle retry for RETRYABLE and TRANSIENT
    }
  };
}
```

---

## 8. Priority Queues

### 8.1 Priority Levels

```typescript
// src/queues/priority.ts

/**
 * Priority levels for BullMQ jobs (1 = highest, 255 = lowest).
 * Lower number = higher priority.
 */
export const JOB_PRIORITIES = {
  CRITICAL:      1,    // Password reset, security alerts, account lockout
  HIGH:          5,    // Webhook delivery (first attempt), AI task assignment
  NORMAL:        10,   // Email notifications, search indexing, activity logs
  LOW:           15,   // Digest emails, bulk exports, analytics events
  BACKGROUND:    20,   // Cleanup jobs, cache warming, telemetry aggregation
} as const;

export type JobPriority = (typeof JOB_PRIORITIES)[keyof typeof JOB_PRIORITIES];

// Helper to determine priority from job data
export function resolvePriority(jobType: string, context?: Record<string, unknown>): JobPriority {
  switch (jobType) {
    case 'email':
      if (context?.template === 'password-reset') return JOB_PRIORITIES.CRITICAL;
      if (context?.template === 'magic-link')      return JOB_PRIORITIES.CRITICAL;
      if (context?.template === 'welcome')          return JOB_PRIORITIES.HIGH;
      if (context?.template?.includes('digest'))    return JOB_PRIORITIES.LOW;
      return JOB_PRIORITIES.NORMAL;

    case 'webhook':
      return JOB_PRIORITIES.HIGH;

    case 'ai-process':
      if (context?.type === 'auto-assign') return JOB_PRIORITIES.HIGH;
      return JOB_PRIORITIES.NORMAL;

    case 'search-index':
      return JOB_PRIORITIES.NORMAL;

    case 'export':
      return JOB_PRIORITIES.LOW;

    case 'activity-log':
      return JOB_PRIORITIES.NORMAL;

    case 'notification':
      return JOB_PRIORITIES.NORMAL;

    case 'cleanup':
      return JOB_PRIORITIES.BACKGROUND;

    default:
      return JOB_PRIORITIES.NORMAL;
  }
}
```

### 8.2 Priority-Aware Queue Producer

```typescript
// src/queues/producer.ts

import { getQueue, QUEUES } from './registry';
import { resolvePriority, JOB_PRIORITIES } from './priority';
import { logger } from '../lib/logger';

export interface EnqueueOptions {
  delay?: number;
  priority?: number;
  jobId?: string;                    // Custom job ID for deduplication
  attempts?: number;
  backoff?: { type: string; delay: number };
  removeOnComplete?: boolean | { age?: number; count?: number };
  removeOnFail?: boolean | { age?: number; count?: number };
}

/**
 * Central producer for enqueuing jobs with automatic priority resolution.
 */
export class JobProducer {
  /**
   * Enqueue an email job.
   */
  static async enqueueEmail(data: EmailJobData, options: EnqueueOptions = {}) {
    const queue = getQueue(QUEUES.EMAIL);
    const priority = options.priority ?? resolvePriority('email', data);

    return queue.add('send-email', data, {
      priority,
      delay: options.delay,
      jobId: options.jobId || `email:${data.idempotencyKey}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2_000 },
      ...options,
    });
  }

  /**
   * Enqueue a file processing job.
   */
  static async enqueueFileProcess(data: FileProcessJobData, options: EnqueueOptions = {}) {
    const queue = getQueue(QUEUES.FILE_PROCESS);
    const priority = options.priority ?? resolvePriority('file-process');

    return queue.add('process-file', data, {
      priority,
      jobId: `file:${data.fileId}:${data.operations.map((o) => o.type).join(',')}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5_000 },
      timeout: 120_000,
      ...options,
    });
  }

  /**
   * Enqueue a webhook delivery job.
   */
  static async enqueueWebhook(data: WebhookJobData, options: EnqueueOptions = {}) {
    const queue = getQueue(QUEUES.WEBHOOK);
    const priority = options.priority ?? resolvePriority('webhook');

    return queue.add('deliver-webhook', data, {
      priority,
      jobId: `wh:${data.webhookId}:${data.idempotencyKey}`,
      attempts: 8,
      backoff: { type: 'exponential', delay: 5_000 },
      ...options,
    });
  }

  /**
   * Enqueue an AI processing job.
   */
  static async enqueueAI(data: AIProcessJobData, options: EnqueueOptions = {}) {
    const queue = getQueue(QUEUES.AI_PROCESS);
    const priority = options.priority ?? resolvePriority('ai-process', data.operation);

    return queue.add('ai-process', data, {
      priority,
      jobId: `ai:${data.idempotencyKey}`,
      attempts: 4,
      backoff: { type: 'exponential', delay: 10_000 },
      timeout: 300_000,
      ...options,
    });
  }

  /**
   * Enqueue a search index update.
   */
  static async enqueueSearchIndex(data: SearchIndexJobData, options: EnqueueOptions = {}) {
    const queue = getQueue(QUEUES.SEARCH_INDEX);

    return queue.add('index-update', data, {
      jobId: `idx:${data.entityType}:${data.entityId}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2_000 },
      ...options,
    });
  }

  /**
   * Enqueue an export job.
   */
  static async enqueueExport(data: ExportJobData, options: EnqueueOptions = {}) {
    const queue = getQueue(QUEUES.EXPORT);
    const priority = options.priority ?? resolvePriority('export');

    return queue.add('generate-export', data, {
      priority,
      jobId: `export:${data.idempotencyKey}`,
      attempts: 3,
      backoff: { type: 'linear', delay: 10_000 },
      timeout: 600_000,
      ...options,
    });
  }

  /**
   * Enqueue an activity log entry.
   */
  static async enqueueActivityLog(data: ActivityLogJobData, options: EnqueueOptions = {}) {
    const queue = getQueue(QUEUES.ACTIVITY_LOG);

    return queue.add('log-activity', data, {
      jobId: `act:${data.entityType}:${data.entityId}:${data.action}:${Date.now()}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 1_000 },
      ...options,
    });
  }

  /**
   * Enqueue a notification job.
   */
  static async enqueueNotification(data: NotificationJobData, options: EnqueueOptions = {}) {
    const queue = getQueue(QUEUES.NOTIFICATION);
    const priority = options.priority ?? resolvePriority('notification');

    return queue.add('send-notification', data, {
      priority,
      jobId: `notif:${data.idempotencyKey}`,
      attempts: 4,
      backoff: { type: 'exponential', delay: 2_000 },
      ...options,
    });
  }
}
```

---

## 9. Temporal Workflows

### 9.1 When to Use Temporal

| Scenario | BullMQ | Temporal |
|---|---|---|
| Single-step email send | ✅ | |
| Single webhook delivery | ✅ | |
| Multi-step automation trigger | | ✅ |
| Project import (validate → parse → create → index → notify) | | ✅ |
| AI pipeline (analyze → suggest → apply → confirm) | | ✅ |
| Onboarding workflow (invite → wait → remind → escalate) | | ✅ |
| Scheduled report generation with branching logic | | ✅ |
| Long-running export with progress tracking | | ✅ |

### 9.2 Temporal Setup

```typescript
// src/temporal/client.ts

import { Client } from '@temporalio/client';
import { Connection } from '@temporalio/client';

let temporalClient: Client | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (temporalClient) return temporalClient;

  const connection = await Connection.connect({
    address: process.env.TEMPORAL_HOST || 'localhost:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'sprintio',
    tls: process.env.TEMPORAL_TLS === 'true'
      ? {}
      : undefined,
  });

  temporalClient = new Client({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE || 'sprintio',
  });

  return temporalClient;
}
```

### 9.3 Automation Workflow (Complex Multi-Step)

```typescript
// src/temporal/workflows/automation.workflow.ts

import {
  proxyActivities,
  sleep,
  workflowInfo,
  makeContinueAsNewFunc,
  CancellationScope,
  condition,
} from '@temporalio/workflows';

// ─── Activity Imports (proxy) ────────────────────────────────────
const {
  evaluateTrigger,
  executeAutomationActions,
  sendAutomationNotification,
  logAutomationExecution,
  acquireLock,
  releaseLock,
} = proxyActivities({
  startToCloseTimeout: '5 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '1s',
    backoffCoefficient: 2,
  },
});

const {
  sendEmail,
  processAIOperation,
  updateSearchIndex,
  deliverWebhook,
} = proxyActivities({
  startToCloseTimeout: '2 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '1s',
    backoffCoefficient: 2,
  },
});

// ─── Workflow Input/Output Types ─────────────────────────────────
export interface AutomationWorkflowInput {
  automationId: string;
  organizationId: string;
  triggerEvent: string;              // e.g., 'task.status_changed'
  triggerData: {
    entityType: string;
    entityId: string;
    changes: Record<string, { before: unknown; after: unknown }>;
  };
  rules: AutomationRule[];
  userId: string;
}

export interface AutomationRule {
  id: string;
  condition: {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'changed_to';
    value: unknown;
  };
  actions: AutomationAction[];
  enabled: boolean;
}

export type AutomationAction =
  | { type: 'assign-task'; userId: string }
  | { type: 'move-to-status'; statusId: string }
  | { type: 'send-email'; template: string; recipients: string[]; variables: Record<string, unknown> }
  | { type: 'send-notification'; userId: string; title: string; body: string }
  | { type: 'create-subtask'; title: string; assignTo?: string }
  | { type: 'call-webhook'; url: string; payload: Record<string, unknown> }
  | { type: 'run-ai-operation'; operation: string; input: Record<string, unknown> }
  | { type: 'add-label'; labelId: string }
  | { type: 'wait'; duration: string }      // e.g., '24h'
  | { type: 'condition'; condition: AutomationRule['condition']; then: AutomationAction[]; else: AutomationAction[] };

export interface AutomationWorkflowResult {
  automationId: string;
  rulesEvaluated: number;
  rulesMatched: number;
  actionsExecuted: number;
  errors: Array<{ ruleId: string; actionType: string; error: string }>;
  durationMs: number;
}

// ─── Main Workflow ───────────────────────────────────────────────
export async function automationWorkflow(
  input: AutomationWorkflowInput,
): Promise<AutomationWorkflowResult> {
  const startTime = Date.now();
  const startTimeStr = new Date(startTime).toISOString();
  const result: AutomationWorkflowResult = {
    automationId: input.automationId,
    rulesEvaluated: 0,
    rulesMatched: 0,
    actionsExecuted: 0,
    errors: [],
    durationMs: 0,
  };

  // ─── Step 1: Acquire execution lock (prevent concurrent runs) ──
  const lockAcquired = await acquireLock(
    `automation:${input.automationId}`,
    30,  // seconds
  );

  if (!lockAcquired) {
    workflowInfo().log.warn('Could not acquire lock, skipping execution');
    return { ...result, durationMs: Date.now() - startTime };
  }

  try {
    // ─── Step 2: Evaluate each rule against the trigger ───────────
    const matchedRules: AutomationRule[] = [];

    for (const rule of input.rules) {
      if (!rule.enabled) continue;
      result.rulesEvaluated++;

      const matches = await evaluateTrigger({
        rule: rule.condition,
        triggerEvent: input.triggerEvent,
        triggerData: input.triggerData,
      });

      if (matches) {
        matchedRules.push(rule);
        result.rulesMatched++;
        workflowInfo().log.info(`Rule ${rule.id} matched`);
      }
    }

    // ─── Step 3: Execute actions for each matched rule ────────────
    for (const rule of matchedRules) {
      for (const action of rule.actions) {
        try {
          await executeAction(rule.id, action, input);
          result.actionsExecuted++;
        } catch (error) {
          result.errors.push({
            ruleId: rule.id,
            actionType: action.type,
            error: (error as Error).message,
          });
          workflowInfo().log.error(
            `Action ${action.type} failed for rule ${rule.id}: ${(error as Error).message}`,
          );
          // Continue with remaining actions — one failure shouldn't block others
        }
      }
    }

    // ─── Step 4: Log execution for audit ──────────────────────────
    await logAutomationExecution({
      automationId: input.automationId,
      organizationId: input.organizationId,
      triggerEvent: input.triggerEvent,
      result,
      executedAt: startTimeStr,
    });

  } finally {
    // ─── Step 5: Release lock ─────────────────────────────────────
    await releaseLock(`automation:${input.automationId}`);
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

// ─── Action Router ───────────────────────────────────────────────
async function executeAction(
  ruleId: string,
  action: AutomationAction,
  input: AutomationWorkflowInput,
): Promise<void> {
  switch (action.type) {
    case 'send-email':
      await sendEmail({
        to: action.recipients,
        template: action.template,
        variables: {
          ...action.variables,
          organizationId: input.organizationId,
          triggerData: input.triggerData,
        },
        organizationId: input.organizationId,
      });
      break;

    case 'send-notification':
      await sendNotification({
        userId: action.userId,
        organizationId: input.organizationId,
        title: action.title,
        body: action.body,
        entityType: input.triggerData.entityType,
        entityId: input.triggerData.entityId,
      });
      break;

    case 'call-webhook':
      await deliverWebhook({
        url: action.url,
        method: 'POST',
        payload: {
          event: input.triggerEvent,
          automationId: input.automationId,
          ...action.payload,
        },
        organizationId: input.organizationId,
      });
      break;

    case 'run-ai-operation':
      await processAIOperation({
        operation: action.operation as any,
        input: action.input,
        organizationId: input.organizationId,
        userId: input.userId,
      });
      break;

    case 'wait':
      // Temporal native sleep — survives worker restarts
      const durationMs = parseDuration(action.duration);
      await sleep(durationMs);
      break;

    case 'condition':
      const conditionMet = await evaluateTrigger({
        rule: action.condition,
        triggerEvent: input.triggerEvent,
        triggerData: input.triggerData,
      });
      if (conditionMet) {
        for (const thenAction of action.then) {
          await executeAction(ruleId, thenAction, input);
        }
      } else if (action.else) {
        for (const elseAction of action.else) {
          await executeAction(ruleId, elseAction, input);
        }
      }
      break;

    default:
      await executeAutomationActions({
        action,
        organizationId: input.organizationId,
        triggerData: input.triggerData,
      });
  }
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * multipliers[unit];
}
```

### 9.4 Onboarding / Invitation Workflow

```typescript
// src/temporal/workflows/onboarding.workflow.ts

import { proxyActivities, sleep, condition } from '@temporalio/workflows';

const {
  sendInvitationEmail,
  checkInvitationStatus,
  sendReminderEmail,
  escalateToAdmin,
  activateMemberAccount,
  grantWorkspaceAccess,
  sendWelcomeEmail,
  createDefaultPreferences,
} = proxyActivities({
  startToCloseTimeout: '2 minutes',
  retry: { maximumAttempts: 3 },
});

export interface OnboardingWorkflowInput {
  invitationId: string;
  organizationId: string;
  inviterUserId: string;
  inviteeEmail: string;
  inviteeName?: string;
  role: string;
  workspaceId: string;
}

export async function onboardingWorkflow(
  input: OnboardingWorkflowInput,
): Promise<{ status: 'accepted' | 'expired' | 'cancelled'; durationMs: number }> {
  const startTime = Date.now();

  // Step 1: Send initial invitation
  await sendInvitationEmail({
    invitationId: input.invitationId,
    email: input.inviteeEmail,
    name: input.inviteeName,
    organizationId: input.organizationId,
    inviterUserId: input.inviterUserId,
    role: input.role,
  });

  // Step 2: Wait up to 7 days for acceptance (or cancellation)
  const accepted = await condition(
    () => false, // Placeholder — in reality this would check a signal or external event
    // Temporal signals would be used to update this state
    7 * 24 * 60 * 60 * 1000,  // 7 days timeout
  );

  if (!accepted) {
    // Step 3a: Not accepted — send reminder after 3 days, then expire
    await sleep(3 * 24 * 60 * 60 * 1000); // Wait 3 days

    await sendReminderEmail({
      invitationId: input.invitationId,
      email: input.inviteeEmail,
      daysRemaining: 4,
    });

    // Wait remaining 4 days
    const acceptedAfterReminder = await condition(
      () => false,
      4 * 24 * 60 * 60 * 1000,
    );

    if (!acceptedAfterReminder) {
      // Step 4: Expire — notify inviter
      await escalateToAdmin({
        organizationId: input.organizationId,
        adminUserId: input.inviterUserId,
        inviteeEmail: input.inviteeEmail,
        reason: 'invitation_expired',
      });

      return {
        status: 'expired',
        durationMs: Date.now() - startTime,
      };
    }
  }

  // Step 5: Invitation accepted — onboard
  const memberId = await activateMemberAccount({
    invitationId: input.invitationId,
    email: input.inviteeEmail,
    organizationId: input.organizationId,
  });

  await grantWorkspaceAccess({
    memberId,
    workspaceId: input.workspaceId,
    role: input.role,
    organizationId: input.organizationId,
  });

  await createDefaultPreferences({
    memberId,
    organizationId: input.organizationId,
  });

  await sendWelcomeEmail({
    email: input.inviteeEmail,
    name: input.inviteeName,
    organizationId: input.organizationId,
    workspaceId: input.workspaceId,
  });

  return {
    status: 'accepted',
    durationMs: Date.now() - startTime,
  };
}
```

### 9.5 Temporal Worker Bootstrap

```typescript
// src/temporal/worker.ts

import { Worker } from '@temporalio/worker';
import { NativeConnection } from '@temporalio/worker';
import { Runtime, logger as temporalLogger } from '@temporalio/worker';
import { logger } from '../lib/logger';

export async function startTemporalWorker(): Promise<Worker> {
  // Configure Temporal runtime logging
  Runtime.install({
    logger: {
      debug: (msg, ...args) => temporalLogger.debug(msg, ...args),
      info: (msg, ...args) => logger.info(`[Temporal] ${msg}`, ...args),
      warn: (msg, ...args) => logger.warn(`[Temporal] ${msg}`, ...args),
      error: (msg, ...args) => logger.error(`[Temporal] ${msg}`, ...args),
    },
  });

  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_HOST || 'localhost:7233',
    tls: process.env.TEMPORAL_TLS === 'true' ? {} : undefined,
  });

  const worker = await Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE || 'sprintio',
    taskQueue: 'sprintio-default',
    workflowsPath: require.resolve('./workflows'),
    activities: require.resolve('./activities'),
    maxConcurrentActivityTaskExecutions: 20,
    maxConcurrentWorkflowTaskExecutions: 10,
    stickyQueueScheduleStartTimeout: '10s',
    isolateExecutionTimeout: '60s',
    maxHeartbeatThrottleInterval: '30s',
    shutdownGraceTime: '30s',
  });

  logger.info('Temporal worker started', {
    namespace: process.env.TEMPORAL_NAMESPACE || 'sprintio',
    taskQueue: 'sprintio-default',
  });

  // Start in background — do not await
  worker.run().catch((err) => {
    logger.error('Temporal worker fatal error', { error: err.message });
    process.exit(1);
  });

  return worker;
}
```

---

## 10. Monitoring & Observability

### 10.1 Metrics Collection

```typescript
// src/lib/metrics.ts

import { Counter, Histogram, Gauge } from 'prom-client';

export const metrics = {
  // ─── Job Lifecycle Metrics ──────────────────────────────────────
  jobsCompleted: new Counter({
    name: 'sprintio_jobs_completed_total',
    help: 'Total completed jobs',
    labelNames: ['queue', 'jobType'] as const,
  }),

  jobsFailed: new Counter({
    name: 'sprintio_jobs_failed_total',
    help: 'Total failed jobs',
    labelNames: ['queue', 'jobType'] as const,
  }),

  jobsStalled: new Counter({
    name: 'sprintio_jobs_stalled_total',
    help: 'Total stalled jobs',
    labelNames: ['queue'] as const,
  }),

  jobsMovedToDLQ: new Counter({
    name: 'sprintio_jobs_dlq_total',
    help: 'Total jobs moved to dead letter queue',
    labelNames: ['queue'] as const,
  }),

  jobsLost: new Counter({
    name: 'sprintio_jobs_lost_total',
    help: 'Total jobs lost (no DLQ configured)',
    labelNames: ['queue'] as const,
  }),

  // ─── Active Work Metrics ───────────────────────────────────────
  activeJobs: new Gauge({
    name: 'sprintio_jobs_active',
    help: 'Currently processing jobs',
    labelNames: ['queue', 'jobType'] as const,
  }),

  // ─── Duration Metrics ──────────────────────────────────────────
  jobDuration: new Histogram({
    name: 'sprintio_job_duration_seconds',
    help: 'Job processing duration in seconds',
    labelNames: ['queue', 'jobType'] as const,
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
  }),

  // ─── Queue Depth Metrics ───────────────────────────────────────
  queueDepth: new Gauge({
    name: 'sprintio_queue_depth',
    help: 'Number of jobs waiting in queue',
    labelNames: ['queue', 'status'] as const,  // status: waiting|active|delayed|failed
  }),

  dlqDepth: new Gauge({
    name: 'sprintio_dlq_depth',
    help: 'Number of jobs in dead letter queue',
    labelNames: ['dlq'] as const,
  }),

  // ─── Worker Metrics ────────────────────────────────────────────
  workerErrors: new Counter({
    name: 'sprintio_worker_errors_total',
    help: 'Total worker connection/process errors',
    labelNames: ['queue'] as const,
  }),

  // ─── Rate Limiting Metrics ─────────────────────────────────────
  jobsRateLimited: new Counter({
    name: 'sprintio_jobs_rate_limited_total',
    help: 'Total jobs rejected by rate limiter',
    labelNames: ['queue'] as const,
  }),
};
```

### 10.2 Queue Depth Collector (for Prometheus)

```typescript
// src/monitoring/queue-collector.ts

import { Registry, Gauge } from 'prom-client';
import { getQueuesHealth } from '../queues/registry';

/**
 * Registers a custom collector that polls queue depths every 10 seconds
 * and exposes them as Prometheus gauges.
 */
export function registerQueueCollector(registry: Registry): void {
  const queueDepthGauge = new Gauge({
    name: 'sprintio_queue_depth_current',
    help: 'Current number of jobs in queue by status',
    labelNames: ['queue', 'status'] as const,
    registers: [registry],
  });

  const queueRateGauge = new Gauge({
    name: 'sprintio_queue_throughput_per_minute',
    help: 'Jobs completed per minute per queue',
    labelNames: ['queue'] as const,
    registers: [registry],
  });

  // Poll every 10 seconds
  setInterval(async () => {
    try {
      const healths = await getQueuesHealth();

      for (const { name, counts } of healths) {
        queueDepthGauge.set({ queue: name, status: 'waiting' }, counts.waiting);
        queueDepthGauge.set({ queue: name, status: 'active' }, counts.active);
        queueDepthGauge.set({ queue: name, status: 'delayed' }, counts.delayed);
        queueDepthGauge.set({ queue: name, status: 'failed' }, counts.failed);
      }
    } catch (error) {
      // Don't crash the collector on transient errors
    }
  }, 10_000);
}
```

### 10.3 Alert Rules (Prometheus/Grafana)

```yaml
# monitoring/alerts/queue-alerts.yml

groups:
  - name: sprintio-queue-alerts
    rules:
      # ─── High Failure Rate ───────────────────────────────────
      - alert: QueueHighFailureRate
        expr: |
          rate(sprintio_jobs_failed_total[5m])
          / rate(sprintio_jobs_completed_total[5m] + sprintio_jobs_failed_total[5m])
          > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High failure rate in queue {{ $labels.queue }}"
          description: "Failure rate is {{ $value | humanizePercentage }} over the last 5 minutes"

      # ─── Queue Depth Warning ─────────────────────────────────
      - alert: QueueDepthHigh
        expr: sprintio_queue_depth_current{status="waiting"} > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Queue {{ $labels.queue }} has {{ $value }} waiting jobs"
          description: "Queue backlog is growing — investigate worker health"

      # ─── Queue Depth Critical ────────────────────────────────
      - alert: QueueDepthCritical
        expr: sprintio_queue_depth_current{status="waiting"} > 5000
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Queue {{ $labels.queue }} critically backed up with {{ $value }} jobs"

      # ─── DLQ Growing ────────────────────────────────────────
      - alert: DLQDepthGrowing
        expr: increase(sprintio_dlq_depth[1h]) > 10
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "DLQ for {{ $labels.dlq }} grew by {{ $value }} jobs in the last hour"

      # ─── Worker Stalled ──────────────────────────────────────
      - alert: JobsStalled
        expr: increase(sprintio_jobs_stalled_total[5m]) > 3
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "Jobs stalling in queue {{ $labels.queue }}"
          description: "{{ $value }} jobs stalled in the last 5 minutes"

      # ─── No Workers Active ───────────────────────────────────
      - alert: QueueNoWorkers
        expr: sprintio_jobs_active == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "No active workers for queue {{ $labels.queue }}"
          description: "Queue has been idle for 2+ minutes despite pending jobs"
```

### 10.4 Grafana Dashboard Specification

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    Sprintio Queue Monitoring Dashboard                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Row 1: Summary Cards]                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Total   │ │ Active  │ │ Failed  │ │ DLQ     │ │ Avg     │           │
│  │ Jobs/h  │ │ Jobs    │ │ (1h)    │ │ Depth   │ │ Latency │           │
│  │ 12,450  │ │ 47      │ │ 23      │ │ 156     │ │ 1.2s    │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                                          │
│  [Row 2: Queue Depths — Time Series]                                     │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Queue Depth Over Time (stacked area)                             │  │
│  │  email: ▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░                               │  │
│  │  webhook: ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░                               │  │
│  │  ai-process: ▓▓▓▓░░░░░░░░░░░░░░░░░░                               │  │
│  │  file-process: ▓▓░░░░░░░░░░░░░░░░░░                               │  │
│  │  search-index: ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                               │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  [Row 3: Throughput + Failures]                                          │
│  ┌──────────────────────────────┐ ┌────────────────────────────────┐    │
│  │  Jobs Completed/min (line)   │ │  Failure Rate % (gauge)       │    │
│  │  ~~~~~~~~~~~~~~~~~~~~~~~~   │ │                                │    │
│  │  email: 45/min              │ │  email:    0.8% ✅             │    │
│  │  webhook: 120/min           │ │  webhook:  2.1% ⚠️             │    │
│  │  search: 80/min             │ │  ai:       5.3% 🔴             │    │
│  │  activity: 200/min          │ │  export:   0.2% ✅             │    │
│  └──────────────────────────────┘ └────────────────────────────────┘    │
│                                                                          │
│  [Row 4: Job Duration Heatmap]                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Processing Time Distribution (heatmap by queue)                  │  │
│  │  email:    [0.1s-1s ████████] [1s-5s █]                          │  │
│  │  webhook:  [0.1s-1s ██████] [1s-5s ███] [5s-30s █]              │  │
│  │  ai:       [1s-5s ████] [5s-30s ████████] [30s+ ███]            │  │
│  │  export:   [30s+ ████████████████]                                │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  [Row 5: DLQ Table]                                                      │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Queue      │ Failed │ Top Error              │ Oldest │ Actions │  │
│  │  ───────────┼────────┼────────────────────────┼────────┼─────────│  │
│  │  dlq:email  │  45    │ "bounce detected"      │ 2h ago │ [Retry] │  │
│  │  dlq:webhook│  112   │ "timeout after 10s"    │ 30m ago│ [Retry] │  │
│  │  dlq:ai     │  23    │ "model overloaded"     │ 5m ago │ [Retry] │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  [Row 6: Worker Health]                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Worker Status:                                                    │  │
│  │  email-worker:    ✅ Healthy  │  8/10 active  │ 0 stalled         │  │
│  │  file-worker:     ✅ Healthy  │  2/3 active   │ 0 stalled         │  │
│  │  webhook-worker:  ⚠️ Warning  │ 10/10 active  │ 1 stalled         │  │
│  │  ai-worker:       ✅ Healthy  │  1/2 active   │ 0 stalled         │  │
│  │  export-worker:   ✅ Healthy  │  1/2 active   │ 0 stalled         │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Graceful Shutdown

### 11.1 Signal Handling & Drain

```typescript
// src/workers/shutdown.ts

import { Worker } from 'bullmq';
import { getQueue, QUEUES } from '../queues/registry';
import { logger } from '../lib/logger';

const DRAIN_TIMEOUT_MS = 30_000;  // 30 seconds to drain before force stop

interface ShutdownManager {
  workers: Worker[];
  shutdownPromise: Promise<void> | null;
}

export function createShutdownManager(workers: Worker[]): ShutdownManager {
  const manager: ShutdownManager = {
    workers,
    shutdownPromise: null,
  };

  // Register signal handlers
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

  for (const signal of signals) {
    process.on(signal, () => {
      logger.info(`Received ${signal}, initiating graceful shutdown...`);
      manager.shutdownPromise = gracefulShutdown(manager);
    });
  }

  // Handle uncaught exceptions — attempt graceful shutdown
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception, initiating emergency shutdown', {
      error: error.message,
      stack: error.stack,
    });
    manager.shutdownPromise = gracefulShutdown(manager, true);
  });

  return manager;
}

async function gracefulShutdown(
  manager: ShutdownManager,
  emergency = false,
): Promise<void> {
  const deadline = Date.now() + (emergency ? 10_000 : DRAIN_TIMEOUT_MS);

  logger.info('Starting graceful shutdown', {
    workerCount: manager.workers.length,
    deadline: new Date(deadline).toISOString(),
    emergency,
  });

  // ─── Step 1: Close all BullMQ producers (stop enqueuing) ────────
  try {
    const { closeAllQueues } = await import('../queues/registry');
    await closeAllQueues();
    logger.info('All queue producers closed');
  } catch (error) {
    logger.error('Error closing queue producers', { error: (error as Error).message });
  }

  // ─── Step 2: Close all workers (drain active jobs) ──────────────
  const workerClosePromises = manager.workers.map(async (worker, index) => {
    const queueName = worker.name || `worker-${index}`;
    try {
      logger.info(`Draining worker ${queueName}...`);

      await Promise.race([
        worker.close(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Drain timeout')), Math.max(0, deadline - Date.now())),
        ),
      ]);

      logger.info(`Worker ${queueName} drained successfully`);
    } catch (error) {
      logger.warn(`Worker ${queueName} drain failed, force-closing`, {
        error: (error as Error).message,
      });
      await worker.close().catch(() => {});  // Force close, ignore errors
    }
  });

  await Promise.allSettled(workerClosePromises);

  // ─── Step 3: Close Temporal worker ──────────────────────────────
  try {
    const { stopTemporalWorker } = await import('../temporal/worker');
    await stopTemporalWorker();
    logger.info('Temporal worker stopped');
  } catch (error) {
    logger.error('Error stopping Temporal worker', { error: (error as Error).message });
  }

  // ─── Step 4: Close Redis connections ────────────────────────────
  try {
    const { createProducerRedisConnection } = await import('../queues/connection');
    // Any remaining connections will timeout naturally
  } catch (error) {
    // Ignore
  }

  logger.info('Graceful shutdown complete');

  // Exit with success if clean shutdown, or error if emergency
  process.exit(emergency ? 1 : 0);
}
```

### 11.2 Health Check Integration

```typescript
// src/workers/health-check.ts

import { getQueuesHealth } from '../queues/registry';
import { logger } from '../lib/logger';

/**
 * Liveness probe: Can the worker process jobs?
 * Returns 503 if critical queues are blocked.
 */
export async function livenessCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: Record<string, unknown>;
}> {
  const health = await getQueuesHealth();
  const blockedQueues = health.filter((q) => q.counts.waiting > 10_000);

  if (blockedQueues.length > 0) {
    return {
      status: 'unhealthy',
      details: {
        blockedQueues: blockedQueues.map((q) => ({
          name: q.name,
          waiting: q.counts.waiting,
        })),
      },
    };
  }

  return { status: 'healthy', details: { queues: health.length } };
}

/**
 * Readiness probe: Can the worker accept new work?
 * Returns 503 if Redis is unreachable or workers are all stalled.
 */
export async function readinessCheck(): Promise<{
  status: 'ready' | 'not_ready';
  details: Record<string, unknown>;
}> {
  const health = await getQueuesHealth();
  const allPaused = health.every((q) => q.isPaused);

  if (allPaused) {
    return {
      status: 'not_ready',
      details: { reason: 'All queues are paused' },
    };
  }

  return { status: 'ready', details: { queues: health.length } };
}
```

---

## 12. Advanced Patterns

### 12.1 Debouncing

Prevent duplicate work when rapid events fire (e.g., multiple saves triggering reindex).

```typescript
// src/patterns/debounce.ts

import { Queue } from 'bullmq';

/**
 * Debounce jobs by a key — if a new job with the same key arrives
 * before the delay, the old job is removed and replaced.
 */
export class DebouncedProducer {
  private pendingTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private queue: Queue,
    private delayMs: number = 2000,
  ) {}

  async add(
    jobName: string,
    key: string,
    data: unknown,
    options?: { priority?: number; jobId?: string },
  ): Promise<void> {
    // Cancel any pending job with the same key
    const existingTimer = this.pendingTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new job after debounce delay
    const timer = setTimeout(async () => {
      this.pendingTimers.delete(key);

      // Remove any previously queued job with this debounced key
      const existingJobs = await this.queue.getJobs(['waiting', 'delayed']);
      for (const job of existingJobs) {
        if (job.data?._debounceKey === key) {
          await job.remove();
        }
      }

      // Add the new debounced job
      await this.queue.add(jobName, { ...data, _debounceKey: key }, {
        jobId: options?.jobId || `debounced:${key}`,
        priority: options?.priority,
      });
    }, this.delayMs);

    this.pendingTimers.set(key, timer);
  }

  cancel(key: string): boolean {
    const timer = this.pendingTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.pendingTimers.delete(key);
      return true;
    }
    return false;
  }
}

// Usage:
// const debouncedSearch = new DebouncedProducer(searchIndexQueue, 3000);
// await debouncedSearch.add('reindex', `project:${projectId}`, { projectId });
```

### 12.2 Batching

Group multiple small operations into single bulk operations.

```typescript
// src/patterns/batch.ts

import { Queue, Job } from 'bullmq';

/**
 * Accumulate individual items and flush as a batch when either:
 * - Batch size threshold is reached
 * - Flush interval elapses
 *
 * Ideal for: search indexing, activity logging, email digests.
 */
export class BatchProcessor<T> {
  private buffer: T[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(
    private queue: Queue,
    private jobName: string,
    private options: {
      batchSize: number;
      flushIntervalMs: number;
      maxWaitMs?: number;
    },
  ) {}

  async add(item: T): Promise<void> {
    this.buffer.push(item);

    // Flush if batch is full
    if (this.buffer.length >= this.options.batchSize) {
      await this.flush();
      return;
    }

    // Start flush timer if not already running
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(async () => {
        await this.flush();
      }, this.options.flushIntervalMs);
    }
  }

  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.buffer.length === 0) return;

    const batch = [...this.buffer];
    this.buffer = [];

    await this.queue.add(this.jobName, {
      items: batch,
      count: batch.length,
      batchedAt: new Date().toISOString(),
    });
  }

  get pendingCount(): number {
    return this.buffer.length;
  }
}

// Usage:
// const searchBatcher = new BatchProcessor(searchQueue, 'batch-index', {
//   batchSize: 50,
//   flushIntervalMs: 5000,
// });
// await searchBatcher.add({ entityType: 'task', entityId: '123', text: '...' });
```

### 12.3 Throttling

Rate-limit job production to respect downstream service limits.

```typescript
// src/patterns/throttle.ts

import { Queue } from 'bullmq';

/**
 * Throttle job production — allows `maxJobs` jobs per `windowMs` period.
 * Excess jobs are delayed rather than dropped.
 */
export class ThrottledProducer {
  private windowStart = Date.now();
  private windowCount = 0;

  constructor(
    private queue: Queue,
    private options: {
      maxJobs: number;
      windowMs: number;
    },
  ) {}

  async add(
    jobName: string,
    data: unknown,
    options?: { priority?: number; jobId?: string },
  ): Promise<void> {
    const now = Date.now();

    // Reset window if elapsed
    if (now - this.windowStart >= this.options.windowMs) {
      this.windowStart = now;
      this.windowCount = 0;
    }

    this.windowCount++;

    // If within limit, add immediately
    if (this.windowCount <= this.options.maxJobs) {
      await this.queue.add(jobName, data, options);
      return;
    }

    // Otherwise, delay to the next window
    const delayMs = this.options.windowMs - (now - this.windowStart);
    await this.queue.add(jobName, data, {
      ...options,
      delay: delayMs,
    });
  }
}

// Usage:
// const throttledEmails = new ThrottledProducer(emailQueue, {
//   maxJobs: 100,
//   windowMs: 60_000,
// });
```

### 12.4 Scheduled / Cron Jobs

```typescript
// src/patterns/scheduled.ts

import { Queue, QueueScheduler } from 'bullmq';

/**
 * Register repeatable (cron) jobs using BullMQ's repeat option.
 * These are equivalent to cron jobs but backed by Redis.
 */
export async function registerScheduledJobs(queue: Queue): Promise<void> {
  // ─── Daily Digest (8:00 AM UTC) ─────────────────────────────
  await queue.add(
    'daily-digest',
    { type: 'daily-digest' },
    {
      jobId: 'cron:daily-digest',
      repeat: {
        pattern: '0 8 * * *',           // 8:00 AM UTC daily
        tz: 'UTC',
      },
      removeOnComplete: true,
      removeOnFail: { age: 30 * 24 * 3600 },
    },
  );

  // ─── Weekly Summary (Monday 9:00 AM UTC) ────────────────────
  await queue.add(
    'weekly-summary',
    { type: 'weekly-summary' },
    {
      jobId: 'cron:weekly-summary',
      repeat: {
        pattern: '0 9 * * 1',           // Monday 9:00 AM UTC
        tz: 'UTC',
      },
      removeOnComplete: true,
      removeOnFail: { age: 30 * 24 * 3600 },
    },
  );

  // ─── Cleanup: Expired Sessions (every hour) ──────────────────
  const cleanupQueue = /* getQueue(QUEUES.CLEANUP) */;
  await cleanupQueue.add(
    'cleanup-expired-sessions',
    {
      type: 'expired-sessions',
      olderThanDays: 30,
      batchSize: 1000,
    },
    {
      jobId: 'cron:cleanup-sessions',
      repeat: {
        pattern: '0 * * * *',           // Every hour
        tz: 'UTC',
      },
    },
  );

  // ─── Cleanup: Soft-Deleted Data (daily at 2 AM) ──────────────
  await cleanupQueue.add(
    'cleanup-soft-deleted',
    {
      type: 'soft-deleted',
      olderThanDays: 90,
      batchSize: 500,
    },
    {
      jobId: 'cron:cleanup-soft-deleted',
      repeat: {
        pattern: '0 2 * * *',           // 2:00 AM UTC daily
        tz: 'UTC',
      },
    },
  );

  // ─── Cleanup: Temp Files (every 6 hours) ─────────────────────
  await cleanupQueue.add(
    'cleanup-temp-files',
    {
      type: 'temp-files',
      olderThanDays: 1,
      batchSize: 200,
    },
    {
      jobId: 'cron:cleanup-temp-files',
      repeat: {
        pattern: '0 */6 * * *',         // Every 6 hours
        tz: 'UTC',
      },
    },
  );

  // ─── Notification Digest Aggregation (every 15 min) ──────────
  const notifQueue = /* getQueue(QUEUES.NOTIFICATION) */;
  await notifQueue.add(
    'aggregate-notifications',
    {
      type: 'digest-batch',
    },
    {
      jobId: 'cron:aggregate-notifications',
      repeat: {
        pattern: '*/15 * * * *',        // Every 15 minutes
        tz: 'UTC',
      },
    },
  );
}
```

### 12.5 Idempotency

```typescript
// src/patterns/idempotency.ts

import { Redis } from 'ioredis';

/**
 * Redis-backed idempotency guard.
 * Prevents duplicate job execution across worker restarts.
 */
export class IdempotencyGuard {
  constructor(
    private redis: Redis,
    private prefix: string = 'idempotency',
    private ttlSeconds: number = 86400,   // 24 hours default
  ) {}

  /**
   * Try to acquire an idempotency key.
   * Returns true if this is the first execution, false if duplicate.
   */
  async tryAcquire(key: string): Promise<boolean> {
    const redisKey = `${this.prefix}:${key}`;
    const result = await this.redis.set(
      redisKey,
      JSON.stringify({
        acquiredAt: new Date().toISOString(),
        pid: process.pid,
      }),
      'EX',
      this.ttlSeconds,
      'NX',   // Only set if Not eXists
    );
    return result === 'OK';
  }

  /**
   * Mark an idempotency key as completed (stores the result).
   */
  async complete(key: string, result: unknown): Promise<void> {
    const redisKey = `${this.prefix}:${key}:result`;
    await this.redis.set(
      redisKey,
      JSON.stringify({ result, completedAt: new Date().toISOString() }),
      'EX',
      this.ttlSeconds,
    );
  }

  /**
   * Check if a job was already completed and return the result.
   */
  async getCompletedResult<T = unknown>(key: string): Promise<T | null> {
    const redisKey = `${this.prefix}:${key}:result`;
    const raw = await this.redis.get(redisKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.result as T;
  }

  /**
   * Release the idempotency key (for manual retries).
   */
  async release(key: string): Promise<void> {
    await this.redis.del(`${this.prefix}:${key}`);
    await this.redis.del(`${this.prefix}:${key}:result`);
  }
}

// Usage in worker:
async function processEmailJob(job: Job<EmailJobData>): Promise<unknown> {
  const guard = new IdempotencyGuard(redis);
  const key = `email:${job.data.idempotencyKey}`;

  // Check if already completed
  const previousResult = await guard.getCompletedResult(key);
  if (previousResult) {
    job.log('Job already completed (idempotent skip)');
    return previousResult;
  }

  // Acquire lock
  const acquired = await guard.tryAcquire(key);
  if (!acquired) {
    job.log('Another worker is processing this job (duplicate skip)');
    return { skipped: true };
  }

  try {
    const result = await actuallySendEmail(job.data);
    await guard.complete(key, result);
    return result;
  } catch (error) {
    // Release on failure so retries can proceed
    await guard.release(key);
    throw error;
  }
}
```

### 12.6 Rate Limiting (Token Bucket)

```typescript
// src/patterns/rate-limit.ts

/**
 * BullMQ's built-in limiter configuration patterns.
 */

// Pattern 1: Fixed Window — max N jobs per time window
const fixedWindowWorker = {
  limiter: {
    max: 100,        // 100 jobs
    duration: 60000, // per 60 seconds
  },
};

// Pattern 2: Sliding Window — smoother distribution
const slidingWindowWorker = {
  limiter: {
    max: 10,
    duration: 1000,  // 10 jobs per second (effectively 10/sec average)
  },
};

// Pattern 3: Group-based — rate limit per organization
const groupRateLimitWorker = {
  limiter: {
    max: 5,
    duration: 60000,
    groupKey: 'organizationId',  // Each org gets its own limit
  },
};

// Pattern 4: External API rate limit matching
const externalAPILimit = {
  limiter: {
    max: 10,         // OpenAI: 10 RPM for standard tier
    duration: 60000,
  },
};
```

---

## 13. Testing Strategy

### 13.1 Unit Testing Workers

```typescript
// tests/workers/email.worker.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processEmailJob } from '../../src/queues/jobs/email.job';
import { createMockJob } from '../helpers/mock-job';

// Mock external dependencies
vi.mock('../../src/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ messageId: 'msg-123' }),
  renderEmailTemplate: vi.fn().mockResolvedValue({
    subject: 'Test Subject',
    html: '<p>Test</p>',
    text: 'Test',
  }),
}));

vi.mock('../../src/lib/idempotency', () => ({
  checkIdempotency: vi.fn().mockResolvedValue(false),
  recordIdempotency: vi.fn().mockResolvedValue(undefined),
}));

describe('Email Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send email and report progress', async () => {
    const job = createMockJob({
      idempotencyKey: 'test-key-123',
      to: 'user@example.com',
      template: 'welcome',
      variables: { name: 'John', workspace: 'My Workspace' },
      organizationId: 'org-123',
    });

    const result = await processEmailJob(job);

    expect(result.messageId).toBe('msg-123');
    expect(job.updateProgress).toHaveBeenCalledWith(20);  // Template rendered
    expect(job.updateProgress).toHaveBeenCalledWith(60);  // Email sent
    expect(job.updateProgress).toHaveBeenCalledWith(90);  // Idempotency recorded
    expect(job.updateProgress).toHaveBeenCalledWith(100); // Done
  });

  it('should skip duplicate emails (idempotency)', async () => {
    const { checkIdempotency } = await import('../../src/lib/idempotency');
    vi.mocked(checkIdempotency).mockResolvedValue(true);  // Already sent

    const job = createMockJob({
      idempotencyKey: 'duplicate-key',
      to: 'user@example.com',
      template: 'welcome',
      variables: { name: 'John' },
      organizationId: 'org-123',
    });

    const result = await processEmailJob(job);

    expect(result.messageId).toBe('duplicate-skipped');
    expect(job.log).toHaveBeenCalledWith('Duplicate job detected, skipping');
  });

  it('should handle template rendering failure', async () => {
    const { renderEmailTemplate } = await import('../../src/lib/email');
    vi.mocked(renderEmailTemplate).mockRejectedValue(
      new Error('Template not found: unknown-template'),
    );

    const job = createMockJob({
      idempotencyKey: 'fail-key',
      to: 'user@example.com',
      template: 'unknown-template' as any,
      variables: {},
      organizationId: 'org-123',
    });

    await expect(processEmailJob(job)).rejects.toThrow('Template not found');
  });

  it('should support batch email recipients', async () => {
    const job = createMockJob({
      idempotencyKey: 'batch-key',
      to: ['a@test.com', 'b@test.com', 'c@test.com'],
      template: 'digest-daily',
      variables: { tasks: [] },
      organizationId: 'org-123',
    });

    const { sendEmail } = await import('../../src/lib/email');
    const result = await processEmailJob(job);

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['a@test.com', 'b@test.com', 'c@test.com'],
      }),
    );
  });
});
```

### 13.2 Mock Job Factory

```typescript
// tests/helpers/mock-job.ts

import { Job } from 'bullmq';
import { vi } from 'vitest';

export function createMockJob<T>(data: T, overrides?: Partial<Job<T>>): Job<T> {
  const updateProgress = vi.fn().mockResolvedValue(undefined);
  const log = vi.fn();

  return {
    id: `test-job-${Date.now()}`,
    name: 'test-job',
    data,
    progress: 0,
    queueName: 'test-queue',
    timestamp: Date.now(),
    attemptsMade: 0,
    opts: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
    updateProgress,
    log,
    updateData: vi.fn().mockResolvedValue(undefined),
    moveToCompleted: vi.fn().mockResolvedValue(undefined),
    moveToFailed: vi.fn().mockResolvedValue(undefined),
    retry: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    isActive: vi.fn().mockReturnValue(true),
    isCompleted: vi.fn().mockReturnValue(false),
    isFailed: vi.fn().mockReturnValue(false),
    isDelayed: vi.fn().mockReturnValue(false),
    ...overrides,
  } as Job<T>;
}
```

### 13.3 Integration Testing with Redis

```typescript
// tests/integration/webhook.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { processWebhookJob } from '../../src/queues/jobs/webhook.job';

let redis: Redis;
let queue: Queue;
let worker: Worker;

// Use a dedicated test Redis DB to avoid polluting dev data
const TEST_REDIS_DB = 15;

beforeAll(async () => {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    db: TEST_REDIS_DB,
    maxRetriesPerRequest: null,
  });

  await redis.flushdb();

  queue = new Queue('test-webhook', {
    connection: redis,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 1000 },
    },
  });

  worker = new Worker('test-webhook', processWebhookJob as any, {
    connection: redis,
    concurrency: 1,
  });
});

afterEach(async () => {
  await queue.clean(0, 100, 'completed');
  await queue.clean(0, 100, 'failed');
  await queue.clean(0, 100, 'waiting');
});

afterAll(async () => {
  await worker.close();
  await queue.close();
  await redis.flushdb();
  await redis.quit();
});

describe('Webhook Integration', () => {
  it('should deliver webhook and record success', async () => {
    const job = await queue.add('deliver-webhook', {
      idempotencyKey: 'test-wh-001',
      webhookId: 'wh-001',
      organizationId: 'org-001',
      url: 'https://httpbin.org/post',
      method: 'POST',
      headers: {},
      payload: { event: 'task.created', taskId: 'task-001' },
      secret: 'test-secret',
    });

    const result = await job.waitUntilFinished(worker.events, 30_000);

    expect(result.statusCode).toBe(200);
    expect(result.success).toBe(true);
  }, 30_000);

  it('should retry on 5xx errors', async () => {
    // httpbin returns 500 at /status/500
    const job = await queue.add('deliver-webhook', {
      idempotencyKey: 'test-wh-002',
      webhookId: 'wh-002',
      organizationId: 'org-001',
      url: 'https://httpbin.org/status/500',
      method: 'POST',
      headers: {},
      payload: { event: 'task.created' },
      secret: 'test-secret',
      timeout: 5_000,
    });

    // Should fail after retries
    await expect(
      job.waitUntilFinished(worker.events, 15_000),
    ).rejects.toThrow();

    expect(job.attemptsMade).toBe(2); // Initial + 1 retry
  }, 20_000);

  it('should respect timeout', async () => {
    // httpbin delay endpoint — takes 10 seconds
    const job = await queue.add('deliver-webhook', {
      idempotencyKey: 'test-wh-003',
      webhookId: 'wh-003',
      organizationId: 'org-001',
      url: 'https://httpbin.org/delay/10',
      method: 'POST',
      headers: {},
      payload: { event: 'task.created' },
      secret: 'test-secret',
      timeout: 2_000,  // 2 second timeout
    });

    await expect(
      job.waitUntilFinished(worker.events, 10_000),
    ).rejects.toThrow();
  }, 15_000);
});
```

### 13.4 Test Helpers for Rate Limiting & Priority

```typescript
// tests/integration/priority.integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

describe('Priority Queue Ordering', () => {
  let redis: Redis;
  let queue: Queue;

  beforeAll(async () => {
    redis = new Redis({ db: 15, maxRetriesPerRequest: null });
    await redis.flushdb();
    queue = new Queue('test-priority', { connection: redis });
  });

  afterAll(async () => {
    await queue.close();
    await redis.flushdb();
    await redis.quit();
  });

  it('should process higher priority jobs first', async () => {
    const processingOrder: number[] = [];

    const worker = new Worker('test-priority', async (job: Job) => {
      processingOrder.push(job.data.priority);
      return true;
    }, {
      connection: redis,
      concurrency: 1,
    });

    // Add jobs out of priority order
    await queue.add('low',    { priority: 20 }, { priority: 20 });
    await queue.add('high',   { priority: 1 },  { priority: 1 });
    await queue.add('normal', { priority: 10 }, { priority: 10 });
    await queue.add('crit',   { priority: 1 },  { priority: 1 });

    // Wait for all jobs to complete
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await worker.close();

    expect(processingOrder).toEqual([1, 1, 10, 20]);
  }, 10_000);
});
```

---

## 14. Configuration Reference

### 14.1 Environment Variables

```env
# ─── Redis ─────────────────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
REDIS_QUEUE_DB=0

# ─── Temporal ─────────────────────────────────────────────────
TEMPORAL_HOST=localhost:7233
TEMPORAL_NAMESPACE=sprintio
TEMPORAL_TLS=false

# ─── Worker Configuration ─────────────────────────────────────
WORKER_CONCURRENCY_EMAIL=10
WORKER_CONCURRENCY_FILE=3
WORKER_CONCURRENCY_WEBHOOK=10
WORKER_CONCURRENCY_AI=2
WORKER_CONCURRENCY_SEARCH=5
WORKER_CONCURRENCY_EXPORT=2
WORKER_CONCURRENCY_ACTIVITY=10
WORKER_CONCURRENCY_NOTIFICATION=5
WORKER_CONCURRENCY_CRON=2
WORKER_CONCURRENCY_CLEANUP=1

# ─── Rate Limits (per minute) ─────────────────────────────────
RATE_LIMIT_EMAIL=100
RATE_LIMIT_WEBHOOK=200
RATE_LIMIT_AI=10
RATE_LIMIT_FILE=20
RATE_LIMIT_EXPORT=5
RATE_LIMIT_CLEANUP=1

# ─── Monitoring ───────────────────────────────────────────────
PROMETHEUS_PORT=9090
ENABLE_BULL_BOARD=true
BULL_BOARD_PORT=3001
```

### 14.2 Production Scaling Guide

| Metric | Small (<1K jobs/hr) | Medium (1K-50K/hr) | Large (50K+/hr) |
|---|---|---|---|
| **Redis** | Single instance | Redis Sentinel (3 nodes) | Redis Cluster (6+ nodes) |
| **Worker Instances** | 1 | 2-3 | 5+ (auto-scaled) |
| **Concurrency per Worker** | Default (5) | Tuned per queue | Aggressively tuned |
| **Temporal Workers** | 1 | 2-3 | 5+ |
| **BullMQ Board** | Embedded | Separate process | Dedicated service |
| **Monitoring** | Logs only | Prometheus + Grafana | Full observability stack |

---

## 15. Quick Reference Cheat Sheet

### Enqueueing Jobs

```typescript
// Email
await JobProducer.enqueueEmail({
  idempotencyKey: `welcome:${userId}`,
  to: user.email,
  template: 'welcome',
  variables: { name: user.name },
  organizationId: org.id,
});

// File Processing
await JobProducer.enqueueFileProcess({
  idempotencyKey: `resize:${fileId}`,
  fileId: file.id,
  organizationId: org.id,
  operations: [
    { type: 'resize', width: 800, height: 600 },
    { type: 'thumbnail', width: 200, height: 200 },
  ],
  sourceUrl: file.url,
  metadata: { originalName: file.name, mimeType: file.mimeType, size: file.size },
});

// Webhook
await JobProducer.enqueueWebhook({
  idempotencyKey: `wh:${webhookId}:${eventId}`,
  webhookId: webhook.id,
  organizationId: org.id,
  url: webhook.url,
  method: 'POST',
  headers: {},
  payload: { event: 'task.created', data: task },
  secret: webhook.secret,
});

// AI Processing
await JobProducer.enqueueAI({
  idempotencyKey: `ai:${entityId}:${operation}`,
  organizationId: org.id,
  userId: user.id,
  operation: {
    type: 'summarize',
    content: longText,
    maxLength: 200,
  },
});

// Export
await JobProducer.enqueueExport({
  idempotencyKey: `export:${userId}:${Date.now()}`,
  userId: user.id,
  organizationId: org.id,
  format: 'csv',
  resourceType: 'tasks',
  filters: { projectId: 'proj-123' },
  dateRange: { from: '2026-01-01', to: '2026-07-01' },
});

// Activity Log
await JobProducer.enqueueActivityLog({
  organizationId: org.id,
  userId: user.id,
  action: 'task.created',
  entityType: 'task',
  entityId: task.id,
  metadata: { title: task.title, projectId: task.projectId },
  timestamp: new Date().toISOString(),
});
```

### Useful Redis Commands

```bash
# Check queue depths
redis-cli LLEN "sprintio:email:waiting"
redis-cli LLEN "sprintio:webhook:waiting"
redis-cli LLEN "sprintio:ai-process:waiting"

# List stalled jobs
redis-cli ZRANGE "sprintio:email:stalled" 0 -1

# Check DLQ depth
redis-cli LLEN "sprintio:dlq:email:waiting"

# Pause/unpause a queue (via BullMQ CLI)
npx bullmq pause --queue email --queue webhook
npx bullmq unpause --queue email --queue webhook

# Clean old jobs
npx bullmq clean --queue email --grace 24h --limit 100
```

### Job Lifecycle State Diagram

```
                     ┌──────────┐
          add() ───▶ │ WAITING  │
                     └────┬─────┘
                          │ (worker picks up)
                     ┌────▼─────┐
                     │  ACTIVE  │◀──────┐
                     └────┬─────┘       │
                          │             │ (stalled + retried)
              ┌───────────┤             │
              │           │             │
         success      failure           │
              │           │             │
         ┌────▼─────┐ ┌───▼──────┐     │
         │COMPLETED │ │  FAILED  │─────┘
         └──────────┘ └───┬──────┘
                          │ (exhausted retries)
                     ┌────▼──────┐
                     │   DLQ     │ (if configured)
                     └───────────┘

     Also:
     ┌──────────┐
     │ DELAYED  │ ──▶ (delay elapsed) ──▶ WAITING
     └──────────┘
     ┌──────────┐
     │  PAUSED  │ ──▶ (unpause) ──▶ WAITING
     └──────────┘
```

### Command Reference

| Command | Description |
|---|---|
| `JobProducer.enqueueEmail(data)` | Add email job with auto-priority |
| `JobProducer.enqueueWebhook(data)` | Add webhook delivery job |
| `JobProducer.enqueueAI(data)` | Add AI processing job |
| `JobProducer.enqueueFileProcess(data)` | Add file processing job |
| `JobProducer.enqueueExport(data)` | Add export generation job |
| `getQueuesHealth()` | Get health status for all critical queues |
| `moveToDLQ(job, error)` | Move failed job to dead letter queue |
| `retryFromDLQ(dlqName, jobId)` | Retry a job from DLQ |
| `listDLQJobs(dlqName)` | List jobs in DLQ for inspection |
| `DebouncedProducer.add(key, data)` | Debounce rapid-fire jobs |
| `BatchProcessor.add(item)` | Batch items for bulk processing |
| `IdempotencyGuard.tryAcquire(key)` | Acquire idempotency lock |

---

> **Document maintained by:** Sprintio Backend Team
> **Review cycle:** Monthly or when job types / queue topology changes
> **Related docs:** `01-FRONTEND.md` · `02-API.md` · `03-AUTH.md` · `04-DATABASE.md`
