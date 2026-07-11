# Sprintio — Deployment Architecture

---

| Field         | Value                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Document Type | Deployment Architecture                                                                                                                                |
| Product       | Sprintio — Sprint fast. Ship together.                                                                                                                 |
| Version       | 1.0                                                                                                                                                    |
| Status        | Finalized                                                                                                                                              |
| Date          | 2026-07-08                                                                                                                                             |
| Author        | Engineering Team                                                                                                                                       |
| Related Docs  | [Frontend](01-FRONTEND.md), [Backend](02-BACKEND.md), [Database](03-DATABASE.md), [Storage](06-STORAGE.md), [Folder Structure](09-FOLDER-STRUCTURE.md) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Environment Strategy](#3-environment-strategy)
4. [Frontend Deploy (Cloudflare Pages)](#4-frontend-deploy-cloudflare-pages)
5. [Backend Deploy (Cloudflare Workers)](#5-backend-deploy-cloudflare-workers)
6. [Database Deploy (Neon PostgreSQL)](#6-database-deploy-neon-postgresql)
7. [Redis Deploy (Upstash)](#7-redis-deploy-upstash)
8. [AI Service Deploy (Railway)](#8-ai-service-deploy-railway)
9. [Storage Deploy (Cloudflare R2)](#9-storage-deploy-cloudflare-r2)
10. [DNS & SSL (Cloudflare)](#10-dns--ssl-cloudflare)
11. [Environment Variables & Secrets](#11-environment-variables--secrets)
12. [Monitoring & Observability](#12-monitoring--observability)
13. [Scaling Strategy](#13-scaling-strategy)
14. [Disaster Recovery & Backups](#14-disaster-recovery--backups)
15. [Cost Estimation](#15-cost-estimation)
16. [CI/CD Pipeline](#16-cicd-pipeline)
17. [Quick Reference Cheat Sheet](#17-quick-reference-cheat-sheet)

---

## 1. Executive Summary

This document defines the complete deployment architecture for Sprintio — covering every environment from local development through production, all infrastructure services, secrets management, monitoring, scaling, disaster recovery, and cost estimation.

Sprintio deploys on **Cloudflare's edge infrastructure** as the primary platform: Cloudflare Pages for the SPA frontend, Cloudflare Workers for the API backend, R2 for file storage, and DDoS/WAF protection at the edge. External managed services (Neon PostgreSQL, Upstash Redis) provide the database and cache layers. A separate **AI sidecar** runs on Railway for LLM-powered features.

### Design Principles

| #   | Principle                       | Application                                                                                                      |
| --- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | **Edge-first, origin-fallback** | Static assets and API routes run on Cloudflare's edge. Origin servers are the exception, not the rule.           |
| 2   | **Environment parity**          | Dev, staging, and production use identical infrastructure stacks — only scale and data differ.                   |
| 3   | **Zero-downtime deploys**       | All deploys use rolling or instant-swap strategies. No maintenance windows for code changes.                     |
| 4   | **Secrets are never in code**   | Environment variables are injected at build/runtime via Cloudflare dashboard, wrangler secrets, or CI/CD vaults. |
| 5   | **Infrastructure as Code**      | Every resource is defined in `wrangler.toml`, `docker-compose.yml`, or Terraform. No manual console clicks.      |
| 6   | **Defense in depth**            | DDoS at the edge, WAF rules, CORS at the API, RBAC at the service layer, encryption at rest.                     |

### Technology Choices

| Layer            | Technology                       | Rationale                                                           |
| ---------------- | -------------------------------- | ------------------------------------------------------------------- |
| Frontend Hosting | Cloudflare Pages                 | Zero-config SPA hosting, preview deploys, edge CDN, free bandwidth  |
| Backend Runtime  | Cloudflare Workers (V8 isolates) | Sub-50ms cold starts, global edge execution, DDoS built-in          |
| Database         | Neon PostgreSQL 16               | Serverless Postgres, branching for previews, autoscaling, free tier |
| Cache            | Upstash Redis 7                  | Serverless Redis, per-command pricing, global replication           |
| Queue            | Upstash Redis + BullMQ           | Compatible with existing Redis, no separate queue infra             |
| AI Sidecar       | Railway (containerized)          | Managed containers, GPU support, simple scaling                     |
| File Storage     | Cloudflare R2                    | Zero egress, S3-compatible, native CDN                              |
| DNS/SSL          | Cloudflare DNS                   | Instant propagation, free SSL, DDoS protection                      |
| CI/CD            | GitHub Actions                   | Native integration, free minutes, matrix builds                     |

---

## 2. Architecture Overview

### 2.1 Full System Topology

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              USERS / CLIENTS                                            │
│                                                                                         │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────────────────┐ │
│   │  Web Browser │   │  Mobile App  │   │  Desktop App │   │  External Integrations   │ │
│   │  (SPA)       │   │  (Future)    │   │  (Future)    │   │  (Slack, GitHub, etc.)   │ │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └────────────┬─────────────┘ │
└──────────┼──────────────────┼──────────────────┼─────────────────────────┼───────────────┘
           │                  │                  │                         │
           ▼                  ▼                  ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          CLOUDFLARE EDGE NETWORK                                        │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              DNS: sprintio.app                                      │ │
│  │                    A/CNAME → Cloudflare Proxy (Orange Cloud)                         │ │
│  └─────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────────────┐   │
│  │   DDoS Protection │  │   WAF Rules      │  │   SSL/TLS (Full Strict)             │   │
│  │   (L3/L4/L7)     │  │   (Rate Limit)   │  │   Universal + Custom Certificates   │   │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────────────┬───────────────────┘   │
│           └──────────────────────┼───────────────────────────────┘                       │
│                                  ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                           CLOUDFLARE CDN (Edge Cache)                               │ │
│  │  ┌────────────────────────────────────────────────────────────────────────────────┐  │ │
│  │  │  Cache Rules:                                                                  │  │ │
│  │  │  • /assets/*     → Cache 1 year (immutable)                                    │  │ │
│  │  │  • /fonts/*      → Cache 1 year (immutable)                                    │  │ │
│  │  │  • /images/*     → Cache 30 days                                               │  │ │
│  │  │  /*.html         → Cache 5 minutes (revalidate)                                │  │ │
│  │  │  /api/*          → Bypass cache (always origin)                                │  │ │
│  │  └────────────────────────────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────────────────────┐ │
│  │    CLOUDFLARE PAGES          │  │           CLOUDFLARE WORKERS                     │ │
│  │    (Frontend SPA)            │  │           (Backend API)                          │ │
│  │                              │  │                                                  │ │
│  │  ┌────────────────────────┐  │  │  ┌────────────────────────────────────────────┐  │ │
│  │  │  Built React App       │  │  │  │  sprintio-api (production)                 │  │ │
│  │  │  dist/                 │  │  │  │                                            │  │ │
│  │  │  ├── index.html        │  │  │  │  Routes:                                  │  │ │
│  │  │  ├── assets/           │  │  │  │  • /api/v1/auth/*     → Auth service      │  │ │
│  │  │  │   ├── chunk-*.js    │  │  │  │  • /api/v1/workspaces/* → Workspace svc   │  │ │
│  │  │  │   └── style-*.css   │  │  │  │  • /api/v1/projects/*  → Project svc      │  │ │
│  │  │  └── _routes.json      │  │  │  │  • /api/v1/tasks/*    → Task service      │  │ │
│  │  └────────────────────────┘  │  │  │  • /api/v1/ai/*       → AI proxy          │  │ │
│  │                              │  │  │  • /api/v1/files/*    → File service       │  │ │
│  │  Preview Deploys:            │  │  │  • /api/v1/ws         → WebSocket upgrade  │  │ │
│  │  • *.sprintio.pages.dev     │  │  │  • /api/health        → Health check       │  │ │
│  │  • PR-specific URLs         │  │  │                                            │  │ │
│  └──────────────────────────────┘  │  └────────────────────────────────────────────┘  │ │
│                                    │                                                  │ │
│                                    │  Bindings:                                       │ │
│                                    │  • Postgres (primary DB)                          │ │
│                                    │  • R2  (file uploads)                            │ │
│                                    │  • KV  (rate limiting)                           │ │
│                                    │  • AI Gateway (LLM proxy)                        │ │
│                                    └──────────────────────────────────────────────────┘ │
└──────────────────────────────────┬──────────────────────────────────────────────────────┘
                                   │
                     ┌─────────────┼─────────────┐
                     ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL MANAGED SERVICES                                     │
│                                                                                         │
│  ┌────────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │   Neon PostgreSQL 16   │  │   Upstash Redis 7    │  │   Railway                    │ │
│  │                        │  │                      │  │   (AI Sidecar)               │ │
│  │  ┌──────────────────┐  │  │  ┌────────────────┐  │  │                              │ │
│  │  │  Primary Branch   │  │  │  │  Cache         │  │  │  ┌────────────────────────┐  │ │
│  │  │  (production)     │  │  │  │  (TTL-based)   │  │  │  │  FastAPI + Uvicorn     │  │ │
│  │  ├──────────────────┤  │  │  ├────────────────┤  │  │  │                        │  │ │
│  │  │  Staging Branch   │  │  │  │  Session Store │  │  │  │  • Summarization       │  │ │
│  │  │  (staging)        │  │  │  │  (Hash)        │  │  │  │  • Priority Suggest    │  │ │
│  │  ├──────────────────┤  │  │  ├────────────────┤  │  │  │  • Search (pgvector)   │  │ │
│  │  │  Preview Branches │  │  │  │  BullMQ Queues │  │  │  │  • Status Updates      │  │ │
│  │  │  (per PR)         │  │  │  │  (Streams)     │  │  │  │  • Embeddings          │  │ │
│  │  └──────────────────┘  │  │  ├────────────────┤  │  │  └────────────────────────┘  │ │
│  │                        │  │  │  Presence       │  │  │                              │ │
│  │  Connection:           │  │  │  (Sorted Sets)  │  │  │  Scalers:                   │ │
│  │  • Pooled (PgBouncer)  │  │  ├────────────────┤  │  │  • Min: 0 (sleep)           │ │
│  │  • SSL required        │  │  │  Rate Limiting  │  │  │  • Max: 2 instances         │ │
│  │  • IPv4/IPv6           │  │  │  (Sliding Window)│ │  │  • GPU: T4 (on-demand)      │ │
│  └────────────────────────┘  │  └────────────────┘  │  └──────────────────────────────┘ │
│                              └──────────────────────┘                                    │
│                                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                     Cloudflare R2 (Object Storage)                                 │  │
│  │                                                                                    │  │
│  │  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────┐  │  │
│  │  │ sprintio-production   │  │ sprintio-staging      │  │ sprintio-temp            │  │  │
│  │  │ (user files)          │  │ (staging files)       │  │ (upload staging, 24h TTL)│  │  │
│  │  │ Lifecycle: none       │  │ Lifecycle: 30d rotate │  │ Lifecycle: 24h delete    │  │  │
│  │  └──────────────────────┘  └──────────────────────┘  └──────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌────────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │  GitHub Actions        │  │  Cloudflare Analytics │  │  Cloudflare Logs            │ │
│  │  (CI/CD)               │  │  (Web Analytics)      │  │  (Workers Logs)             │ │
│  └────────────────────────┘  └──────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Request Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Browser  │────▶│ CF Edge  │────▶│ CF Pages │     │   Neon   │     │ Upstash  │
│  (SPA)    │     │  (WAF)   │     │ (static) │     │  (Postgres)│    │  (Redis) │
└────┬─────┘     └────┬─────┘     └──────────┘     └──────────┘     └──────────┘
     │                │
     │  API Call       │
     ▼                ▼
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  CF CDN  │────▶│ CF Worker │────▶│  Neon    │     │ Upstash  │     │ R2 (files)│
│ (cache)  │     │  (API)   │     │  (DB)    │     │ (cache)  │     │           │
└──────────┘     └────┬─────┘     └──────────┘     └──────────┘     └──────────┘
                      │
                      │  AI Request
                      ▼
                 ┌──────────┐
                 │ Railway  │
                 │ (AI)     │
                 └──────────┘
```

---

## 3. Environment Strategy

### 3.1 Environment Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENVIRONMENT SEPARATION                               │
│                                                                             │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌──────────────┐  │
│   │    LOCAL     │   │    DEV      │   │  STAGING    │   │  PRODUCTION  │  │
│   │             │   │             │   │             │   │              │  │
│   │ Docker      │   │ CF Workers  │   │ CF Workers  │   │ CF Workers   │  │
│   │ Compose     │   │ (preview)   │   │ (staging)   │   │ (production) │  │
│   │             │   │             │   │             │   │              │  │
│   │ Local PG    │   │ Neon Dev    │   │ Neon Stage  │   │ Neon Prod    │  │
│   │ Local Redis │   │ Upstash Dev │   │ Upstash Stg │   │ Upstash Prod │  │
│   │ Local R2    │   │ R2 Dev      │   │ R2 Staging  │   │ R2 Prod      │  │
│   │ Local AI    │   │ Railway Dev │   │ Railway Stg │   │ Railway Prod │  │
│   │             │   │             │   │             │   │              │  │
│   │ localhost   │   │ *.dev       │   │ staging.    │   │ sprintio.app │  │
│   │ :3001       │   │ .sprintio.  │   │ sprintio.   │   │              │  │
│   │             │   │ pages.dev   │   │ app         │   │              │  │
│   └─────────────┘   └─────────────┘   └─────────────┘   └──────────────┘  │
│                                                                             │
│   Trigger:        Trigger:          Trigger:           Trigger:             │
│   docker          push to           merge to           merge to main +     │
│   compose up      feature branch    staging branch     manual approval     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Environment Details

| Property           | Local                   | Development                    | Staging                            | Production                 |
| ------------------ | ----------------------- | ------------------------------ | ---------------------------------- | -------------------------- |
| **Frontend URL**   | `http://localhost:5173` | `*.sprintio.pages.dev`         | `staging.sprintio.app`             | `sprintio.app`             |
| **API URL**        | `http://localhost:3001` | `api-dev.sprintio.workers.dev` | `api-staging.sprintio.workers.dev` | `api.sprintio.app`         |
| **Database**       | Docker PostgreSQL       | Neon branch (dev)              | Neon branch (staging)              | Neon main branch           |
| **Redis**          | Docker Redis            | Upstash (dev tenant)           | Upstash (staging tenant)           | Upstash (prod tenant)      |
| **AI Sidecar**     | Docker container        | Railway (dev)                  | Railway (staging)                  | Railway (prod)             |
| **File Storage**   | Local volume            | R2 bucket (dev)                | R2 bucket (staging)                | R2 bucket (prod)           |
| **DNS**            | localhost               | Cloudflare Pages preview       | CNAME to Pages                     | A + CNAME proxy            |
| **SSL**            | Self-signed / http      | Auto (Cloudflare)              | Auto (Cloudflare)                  | Auto (Cloudflare)          |
| **Data**           | Seed scripts            | Test data                      | Anonymized prod clone              | Real data                  |
| **Access**         | Open                    | Team only                      | Team + QA                          | Public + Auth              |
| **Deploy Trigger** | Manual                  | Branch push                    | Merge to `staging`                 | Merge to `main` + approval |
| **Uptime SLA**     | N/A                     | Best effort                    | 99.5%                              | 99.99%                     |

### 3.3 Branch Strategy

```
main (production)
  │
  ├── staging (staging environment)
  │     │
  │     ├── feat/xyz (development preview)
  │     ├── fix/abc (development preview)
  │     └── ...
  │
  └── feat/big-feature (development preview)
```

| Branch    | Environment | Database Branch                | Auto-Deploy              |
| --------- | ----------- | ------------------------------ | ------------------------ |
| `main`    | Production  | `main`                         | Yes (with approval gate) |
| `staging` | Staging     | `staging`                      | Yes (automatic)          |
| `feat/*`  | Dev Preview | `preview/<branch>` (ephemeral) | Yes (automatic)          |
| `fix/*`   | Dev Preview | `preview/<branch>` (ephemeral) | Yes (automatic)          |

---

## 4. Frontend Deploy (Cloudflare Pages)

### 4.1 Build & Deploy Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  git push    │────▶│  GitHub      │────▶│  Build       │────▶│  Deploy to   │
│              │     │  Actions     │     │  (Vite)      │     │  CF Pages    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                          │                     │                     │
                          │                     │                     │
                     CI triggers          pnpm build           Static assets
                     on PR/push           → dist/              served from
                                           → validate           CF edge
                                           → bundle analyze
```

### 4.2 Pages Configuration

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                          │
│                                                             │
│  Project: sprintio-web                                      │
│  Production Branch: main                                    │
│  Build Command: pnpm --filter @sprintio/web build           │
│  Build Output: packages/web/dist                            │
│  Node.js Version: 20                                        │
│                                                             │
│  Custom Domains:                                            │
│  • sprintio.app          (production)                       │
│  • staging.sprintio.app  (staging)                          │
│                                                             │
│  Preview Deployments:                                       │
│  • <hash>--sprintio-web.pages.dev (per PR)                  │
│                                                             │
│  Build Caches:                                              │
│  • node_modules (pnpm store)                                │
│  • .vite cache                                              │
│  • .turbo cache                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 SPA Routing ( `_routes.json`)

```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": [
    "/api/*",
    "/assets/*",
    "/fonts/*",
    "/images/*",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/manifest.json"
  ],
  "rules": [
    {
      "glob": "/assets/*.js",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    },
    {
      "glob": "/assets/*.css",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    },
    {
      "glob": "/fonts/*",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    }
  ]
}
```

### 4.4 Environment Variables (Frontend)

Set in Cloudflare Pages dashboard under **Settings → Environment Variables**:

| Variable             | Preview                                | Staging                                    | Production                     | Description            |
| -------------------- | -------------------------------------- | ------------------------------------------ | ------------------------------ | ---------------------- |
| `VITE_API_URL`       | `https://api-dev.sprintio.workers.dev` | `https://api-staging.sprintio.workers.dev` | `https://api.sprintio.app`     | Backend API base URL   |
| `VITE_WS_URL`        | `wss://api-dev.sprintio.workers.dev`   | `wss://api-staging.sprintio.workers.dev`   | `wss://api.sprintio.app`       | WebSocket endpoint     |
| `VITE_APP_URL`       | Auto (preview URL)                     | `https://staging.sprintio.app`             | `https://sprintio.app`         | Application base URL   |
| `VITE_SENTRY_DSN`    | _(empty)_                              | Sentry staging DSN                         | Sentry production DSN          | Error tracking DSN     |
| `VITE_POSTHOG_KEY`   | _(empty)_                              | PostHog staging key                        | PostHog production key         | Analytics key          |
| `VITE_FEATURE_FLAGS` | `{"ai":true,"analytics":true}`         | `{"ai":true,"analytics":true}`             | `{"ai":true,"analytics":true}` | Feature flag overrides |

> **Note:** Vite prefix `VITE_` is required for client-exposed variables. Never expose secrets (API keys, tokens) in frontend env vars — they are embedded in the bundle.

### 4.5 Vite Configuration for Deploy

```typescript
// packages/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [react(), TanStackRouterVite()],
  build: {
    outDir: 'dist',
    sourcemap: true, // Source maps for error tracking
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          editor: ['@tiptap/react', '@tiptap/starter-kit'],
          collab: ['yjs', 'y-websocket'],
          query: ['@tanstack/react-query'],
        },
      },
    },
    chunkSizeWarningLimit: 500, // KB
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
```

---

## 5. Backend Deploy (Cloudflare Workers)

### 5.1 Worker Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE WORKER                         │
│                                                             │
│  Worker Name: sprintio-api                                  │
│  Runtime: V8 Isolates (Workers runtime)                     │
│  Compatibility Date: 2026-07-01                             │
│  Compatibility Flags: nodejs_compat                         │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Request Router (Hono)                                │  │
│  │                                                       │  │
│  │  /api/v1/auth/*        → authHandler                  │  │
│  │  /api/v1/workspaces/*  → workspaceHandler             │  │
│  │  /api/v1/projects/*    → projectHandler               │  │
│  │  /api/v1/tasks/*       → taskHandler                  │  │
│  │  /api/v1/ai/*          → aiHandler (→ Railway)        │  │
│  │  /api/v1/files/*       → fileHandler (→ R2)           │  │
│  │  /api/v1/search/*      → searchHandler                │  │
│  │  /api/v1/webhooks/*    → webhookHandler               │  │
│  │  /api/health           → healthHandler                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Bindings                                             │  │
│  │                                                       │  │
│  │  PostgreSQL → sprintio (primary database)              │  │
│  │  R2        → sprintio_files (file storage)             │  │
│  │  KV      → sprintio_cache (rate limiting, cache)      │  │
│  │  AI GW   → sprintio_ai_gateway (LLM proxy)            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Environment Secrets (encrypted at rest)              │  │
│  │                                                       │  │
│  │  DATABASE_URL     → Neon PostgreSQL connection string  │  │
│  │  REDIS_URL        → Upstash Redis connection string    │  │
│  │  JWT_SECRET       → Session signing key                │  │
│  │  R2_ACCESS_KEY    → R2 API credentials                 │  │
│  │  R2_SECRET_KEY    → R2 API credentials                 │  │
│  │  AI_SIDECAR_URL   → Railway service URL                │  │
│  │  AI_API_KEY       → Shared auth for AI sidecar         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 wrangler.toml Configuration

```toml
# packages/api/wrangler.toml
# Sprintio API — Cloudflare Workers Configuration

name = "sprintio-api"
main = "src/index.ts"
compatibility_date = "2026-07-01"
compatibility_flags = ["nodejs_compat"]

# ─── General Settings ──────────────────────────────────────
account_id = "your-cloudflare-account-id"
no_bundle = false                   # Bundle dependencies for smaller cold starts
minify = true                       # Minify production builds
node_compat = true                  # Node.js compatibility layer

# ─── Build Configuration ───────────────────────────────────
[build]
command = "pnpm --filter @sprintio/api build"

[build.cwd]
# Build from the API package directory

# ─── Environment: Development ──────────────────────────────
[env.dev]
name = "sprintio-api-dev"
compatibility_date = "2026-07-01"
routes = [
  { pattern = "api-dev.sprintio.workers.dev", zone_name = "sprintio.workers.dev" }
]

[env.dev.vars]
ENVIRONMENT = "development"
LOG_LEVEL = "debug"
CORS_ORIGIN = "http://localhost:5173"

# PostgreSQL via Neon (D1 replaced — backend uses Express.js + Drizzle ORM)
# DATABASE_URL is set in .env, not in wrangler.toml

[env.dev.r2_buckets]
binding = "R2"
bucket_name = "sprintio-dev"

[env.dev.kv_namespaces]
binding = "KV"
id = "<dev-kv-namespace-id>"

# ─── Environment: Staging ─────────────────────────────────
[env.staging]
name = "sprintio-api-staging"
compatibility_date = "2026-07-01"
routes = [
  { pattern = "api-staging.sprintio.app", zone_name = "sprintio.app" }
]

[env.staging.vars]
ENVIRONMENT = "staging"
LOG_LEVEL = "info"
CORS_ORIGIN = "https://staging.sprintio.app"

# PostgreSQL via Neon — DATABASE_URL set in Cloudflare Secrets or .env

[env.staging.r2_buckets]
binding = "R2"
bucket_name = "sprintio-staging"

[env.staging.kv_namespaces]
binding = "KV"
id = "<staging-kv-namespace-id>"

# ─── Environment: Production ───────────────────────────────
[env.production]
name = "sprintio-api"
compatibility_date = "2026-07-01"
routes = [
  { pattern = "api.sprintio.app", zone_name = "sprintio.app" }
]

[env.production.vars]
ENVIRONMENT = "production"
LOG_LEVEL = "warn"
CORS_ORIGIN = "https://sprintio.app"

# PostgreSQL via Neon — DATABASE_URL set in deployment environment

[env.production.r2_buckets]
binding = "R2"
bucket_name = "sprintio-production"

[env.production.kv_namespaces]
binding = "KV"
id = "<production-kv-namespace-id>"

# ─── Cron Triggers (Production Only) ──────────────────────
[env.production.triggers]
crons = [
  "0 */6 * * *",    # Every 6 hours: cleanup expired sessions
  "0 2 * * *",      # Daily 2 AM: aggregate analytics
  "0 3 * * 0",      # Weekly Sunday 3 AM: generate reports
]

# ─── Limits ────────────────────────────────────────────────
[limits]
cpu_ms = 50          # Max CPU time per request (ms)
max_cpu_time = 30    # Default CPU limit

# ─── Observability ─────────────────────────────────────────
[observability]
enabled = true
head_sampling_rate = 0.1    # 10% trace sampling in production
```

### 5.3 Wrangler Commands Reference

```bash
# ─── Local Development ─────────────────────────────────────
pnpm dev                           # Start wrangler dev (hot reload)
pnpm dev:local                     # Start with --local (PostgreSQL via Docker)

# ─── Environment Operations ────────────────────────────────
wrangler dev                       # Local dev server
wrangler dev --env staging         # Dev with staging bindings

# ─── Secrets Management ────────────────────────────────────
wrangler secret put DATABASE_URL --env production
wrangler secret put REDIS_URL --env production
wrangler secret put JWT_SECRET --env production
wrangler secret put R2_ACCESS_KEY --env production
wrangler secret put R2_SECRET_KEY --env production
wrangler secret put AI_SIDECAR_URL --env production
wrangler secret put AI_API_KEY --env production

# ─── Deployment ────────────────────────────────────────────
wrangler deploy                     # Deploy to production
wrangler deploy --env staging       # Deploy to staging
wrangler deploy --env dev           # Deploy to dev

# ─── PostgreSQL Database Operations ───────────────────────
npx drizzle-kit push --name production  # Push schema to production
psql $DATABASE_URL -f migrations/001_initial.sql  # Run migration
psql $DATABASE_URL -c "SELECT count(*) FROM sessions"  # Verify data

# ─── KV Operations ────────────────────────────────────────
wrangler kv:namespace list          # List KV namespaces
wrangler kv:key list --namespace-id=<id>  # List keys

# ─── R2 Operations ────────────────────────────────────────
wrangler r2 bucket list             # List R2 buckets
wrangler r2 object list sprintio-production  # List objects

# ─── Tail (Live Logs) ─────────────────────────────────────
wrangler tail --env production      # Live log stream
wrangler tail --env staging         # Live staging logs

# ─── Rollback ─────────────────────────────────────────────
wrangler rollback --env production <version-id>  # Rollback to specific version
```

### 5.4 Worker Source Structure

```
packages/api/
├── src/
│   ├── index.ts                    # Worker entry point (Hono app)
│   ├── router.ts                   # Route definitions
│   ├── middleware/
│   │   ├── auth.ts                 # JWT verification
│   │   ├── cors.ts                 # CORS configuration
│   │   ├── rate-limit.ts           # Rate limiting (KV-based)
│   │   ├── logging.ts              # Request/response logging
│   │   └── error-handler.ts        # Global error handling
│   ├── handlers/
│   │   ├── auth.ts                 # Authentication endpoints
│   │   ├── workspaces.ts           # Workspace CRUD
│   │   ├── projects.ts             # Project CRUD
│   │   ├── tasks.ts                # Task CRUD
│   │   ├── files.ts                # File upload/download
│   │   ├── ai.ts                   # AI feature proxy
│   │   ├── search.ts               # Full-text search
│   │   └── health.ts               # Health check
│   ├── services/
│   │   ├── db.ts                   # PostgreSQL (Neon) client
│   │   ├── redis.ts                # Upstash Redis client
│   │   ├── r2.ts                   # R2 operations
│   │   ├── ai.ts                   # AI sidecar client
│   │   └── queue.ts                # BullMQ queue client
│   ├── types/
│   │   ├── env.ts                  # Cloudflare env types
│   │   └── api.ts                  # API response types
│   └── utils/
│       ├── jwt.ts                  # JWT utilities
│       ├── validation.ts           # Zod schemas
│       └── response.ts             # Response helpers
├── wrangler.toml
├── wrangler.toml.example           # Template with placeholders
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### 5.5 Hono Entry Point

```typescript
// packages/api/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Env } from './types/env';
import { authRoutes } from './handlers/auth';
import { workspaceRoutes } from './handlers/workspaces';
import { projectRoutes } from './handlers/projects';
import { taskRoutes } from './handlers/tasks';
import { fileRoutes } from './handlers/files';
import { aiRoutes } from './handlers/ai';
import { healthRoutes } from './handlers/health';
import { rateLimiter } from './middleware/rate-limit';
import { errorHandler } from './middleware/error-handler';

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (c) => c.env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use('/api/*', rateLimiter);
app.onError(errorHandler);

// Health check (no auth)
app.route('/api/health', healthRoutes);

// Protected routes
app.use('/api/v1/*', async (c, next) => {
  // JWT verification middleware
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  // Verify token...
  await next();
});

app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/workspaces', workspaceRoutes);
app.route('/api/v1/projects', projectRoutes);
app.route('/api/v1/tasks', taskRoutes);
app.route('/api/v1/files', fileRoutes);
app.route('/api/v1/ai', aiRoutes);

export default app;

export type AppType = typeof app;
```

### 5.6 Cloudflare Bindings TypeScript Types

```typescript
// packages/api/src/types/env.ts
export interface Env {
  // Bindings
  DB: PostgresClient;
  R2: R2Bucket;
  KV: KVNamespace;

  // Environment variables (non-secret)
  ENVIRONMENT: 'development' | 'staging' | 'production';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  CORS_ORIGIN: string;

  // Secrets (set via wrangler secret put)
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  AI_SIDECAR_URL: string;
  AI_API_KEY: string;

  // AI Gateway
  AI_GATEWAY: AiGateway;
}
```

---

## 6. Database Deploy (Neon PostgreSQL)

### 6.1 Neon Project Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     NEON PROJECT                             │
│                     sprintio-db                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Region: AWS us-east-1 (primary)                        ││
│  │          AWS eu-west-1 (read replica — production only)  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌──────────────────────┐  ┌─────────────────────────────┐ │
│  │  Branch: main         │  │  Branch: staging             │ │
│  │  (production)         │  │  (staging)                   │ │
│  │                       │  │                               │ │
│  │  Compute:             │  │  Compute:                     │ │
│  │  • Min: 0.25 CU       │  │  • Min: 0.25 CU              │ │
│  │  • Max: 4 CU          │  │  • Max: 1 CU                 │ │
│  │                       │  │                               │ │
│  │  Storage:             │  │  Storage:                     │ │
│  │  • 10 GB (included)   │  │  • 5 GB (included)           │ │
│  │  • Autoscale          │  │  • Autoscale                 │ │
│  │                       │  │                               │ │
│  │  Connection:          │  │  Connection:                  │ │
│  │  • pooled (PgBouncer) │  │  • pooled (PgBouncer)        │ │
│  │  • direct (migrations)│  │  • direct (migrations)       │ │
│  └──────────────────────┘  └─────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────┐  ┌─────────────────────────────┐ │
│  │  Branch: feat/*       │  │  Branch: feat/*              │ │
│  │  (per PR — ephemeral) │  │  (per PR — ephemeral)        │ │
│  │                       │  │                               │ │
│  │  Compute:             │  │  Compute:                     │ │
│  │  • Min: 0.25 CU       │  │  • Min: 0.25 CU              │ │
│  │  • Max: 0.5 CU        │  │  • Max: 0.5 CU               │ │
│  │                       │  │                               │ │
│  │  Auto-delete:         │  │  Auto-delete:                 │ │
│  │  • 7 days inactive    │  │  • 7 days inactive            │ │
│  └──────────────────────┘  └─────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Connection Pooling (PgBouncer)                          ││
│  │                                                          ││
│  │  Pooled URL:     postgresql://user:pass@ep-xxx.cloud    ││
│  │                  -neon.tech/sprintio?sslmode=require    ││
│  │  Direct URL:     postgresql://user:pass@ep-xxx.cloud    ││
│  │                  -neon.tech/sprintio?sslmode=require    ││
│  │                  &channel_binding=require               ││
│  │                                                          ││
│  │  Pool Mode: Transaction                                  ││
│  │  Max Connections: 64 (per compute)                       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Migration Strategy

```bash
# packages/db/

# ─── Migration Tool: Drizzle Kit ──────────────────────────

# Generate migration from schema changes
pnpm drizzle-kit generate

# Apply migrations to local database
pnpm drizzle-kit migrate --config=./drizzle.config.ts

# Apply migrations to remote (Neon) database
DATABASE_URL=<neon-pooled-url> pnpm drizzle-kit migrate

# Push schema directly (dev/preview only — no migration file)
DATABASE_URL=<neon-preview-url> pnpm drizzle-kit push

# Open Drizzle Studio (visual DB browser)
DATABASE_URL=<neon-pooled-url> pnpm drizzle-kit studio
```

### 6.3 Database Connection in Workers

```typescript
// packages/api/src/services/db.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@sprintio/db/schema';

let db: ReturnType<typeof drizzle>;

export function getDb(env: Env) {
  if (!db) {
    // Use the pooled URL for normal queries
    const sql = neon(env.DATABASE_URL, {
      fullResults: false,
    });
    db = drizzle(sql, { schema });
  }
  return db;
}

// For migrations — use direct connection (not pooled)
export function getDbDirect(env: Env) {
  const directUrl = env.DATABASE_URL.replace(/\.cloudneon\.tech/, '.cloudneon.tech');
  const sql = neon(directUrl);
  return drizzle(sql, { schema });
}
```

### 6.4 Environment-Specific Database Config

| Environment | Neon Branch        | Compute Size | Auto-Suspend | Max Connections |
| ----------- | ------------------ | ------------ | ------------ | --------------- |
| Production  | `main`             | 0.25–4 CU    | 5 min idle   | 64              |
| Staging     | `staging`          | 0.25–1 CU    | 2 min idle   | 32              |
| Dev Preview | `preview/<branch>` | 0.25–0.5 CU  | 30s idle     | 16              |

---

## 7. Redis Deploy (Upstash)

### 7.1 Upstash Configuration

```
┌─────────────────────────────────────────────────────────────┐
│                      UPSTASH REDIS                          │
│                                                             │
│  ┌──────────────────────┐  ┌─────────────────────────────┐ │
│  │  Instance: Production │  │  Instance: Staging          │ │
│  │                       │  │                             │ │
│  │  Region: us-east-1    │  │  Region: us-east-1          │ │
│  │  Tier: Pay-as-you-go  │  │  Tier: Pay-as-you-go       │ │
│  │  Replication: Yes     │  │  Replication: No            │ │
│  │                       │  │                             │ │
│  │  Daily Commands:      │  │  Daily Commands:            │ │
│  │  • 500K free          │  │  • 500K free                │ │
│  │  • Pay $0.30/1M over  │  │  • Included in free tier    │ │
│  │                       │  │                             │ │
│  │  Max Memory: 256 MB   │  │  Max Memory: 64 MB          │ │
│  │  Eviction: allkeys-lru│  │  Eviction: allkeys-lru      │ │
│  │                       │  │                             │ │
│  │  TLS: Required        │  │  TLS: Required              │ │
│  │  Auth: Strong password│  │  Auth: Strong password      │ │
│  └──────────────────────┘  └─────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Namespace/Database Layout (using DB indexes)            ││
│  │                                                          ││
│  │  DB 0: Cache (general purpose, TTL-based)                ││
│  │  DB 1: Sessions (hash, 24h TTL)                          ││
│  │  DB 2: Queues (BullMQ — streams + sorted sets)           ││
│  │  DB 3: Presence (sorted sets, real-time)                 ││
│  │  DB 4: Rate Limiting (sliding window counters)           ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Redis Client in Workers

```typescript
// packages/api/src/services/redis.ts
import { Redis } from '@upstash/redis';

let redis: Redis;

export function getRedis(env: Env): Redis {
  if (!redis) {
    redis = new Redis({
      url: env.REDIS_URL,
      // Upstash provides the token in the URL or separately
      automaticDeserialization: false, // Better performance
      enableAutoPipelining: true, // Batch commands automatically
    });
  }
  return redis;
}

// Specific database selectors
export function getCacheRedis(env: Env) {
  return getRedis(env).select(0);
}

export function getSessionRedis(env: Env) {
  return getRedis(env).select(1);
}

export function getQueueRedis(env: Env) {
  return getRedis(env).select(2);
}

export function getPresenceRedis(env: Env) {
  return getRedis(env).select(3);
}

export function getRateLimitRedis(env: Env) {
  return getRedis(env).select(4);
}
```

### 7.3 Redis Usage Patterns

| Use Case            | Data Structure      | TTL             | Key Pattern               |
| ------------------- | ------------------- | --------------- | ------------------------- |
| API Response Cache  | String (JSON)       | 5 min           | `cache:api:{hash}`        |
| User Session        | Hash                | 24 hours        | `session:{sessionId}`     |
| BullMQ Job Queue    | Stream              | None            | `bull:{queueName}:*`      |
| Online Presence     | Sorted Set          | 60s (heartbeat) | `presence:{workspaceId}`  |
| Rate Limit Counter  | String (sorted set) | 60s window      | `ratelimit:{ip}:{window}` |
| CSRF Token          | String              | 1 hour          | `csrf:{token}`            |
| Email Verification  | String              | 24 hours        | `verify:{token}`          |
| Password Reset      | String              | 1 hour          | `reset:{token}`           |
| Feature Flags Cache | Hash                | 5 min           | `features:{workspaceId}`  |

---

## 8. AI Service Deploy (Railway)

### 8.1 Railway Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     RAILWAY PROJECT                          │
│                     sprintio-ai                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Service: sprintio-ai-service                           ││
│  │                                                          ││
│  │  Runtime: Docker (Python 3.12)                          ││
│  │  Framework: FastAPI + Uvicorn                           ││
│  │  Port: 8000                                              ││
│  │                                                          ││
│  │  Build:                                                  ││
│  │  • Dockerfile: packages/ai/Dockerfile                   ││
│  │  • Build context: packages/ai/                           ││
│  │                                                          ││
│  │  Resources:                                              ││
│  │  • CPU: 4 vCPU                                           ││
│  │  • RAM: 8 GB                                             ││
│  │  • Disk: 10 GB (for model cache)                         ││
│  │                                                          ││
│  │  Scaling:                                                ││
│  │  • Min instances: 0 (sleeps when idle)                   ││
│  │  • Max instances: 2                                       ││
│  │  • Startup timeout: 120s                                 ││
│  │                                                          ││
│  │  Health Check:                                           ││
│  │  • Path: /health                                         ││
│  │  • Interval: 30s                                         ││
│  │                                                          ││
│  │  Cron:                                                   ││
│  │  • Keep-warm ping: every 10 minutes (production)         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Environment Variables                                   ││
│  │                                                          ││
│  │  DATABASE_URL      → Neon PostgreSQL (read/write)       ││
│  │  REDIS_URL         → Upstash Redis                      ││
│  │  AI_API_KEY        → Shared secret with CF Worker        ││
│  │  OPENAI_API_KEY    → OpenAI (for embeddings)             ││
│  │  ANTHROPIC_API_KEY → Anthropic (for chat)                ││
│  │  MODEL_CACHE_DIR   → /app/.cache/models                 ││
│  │  ENVIRONMENT       → production                          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Dockerfile

```dockerfile
# packages/ai/Dockerfile
FROM python:3.12-slim AS base

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY src/ ./src/
COPY tests/ ./tests/

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run
EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### 8.3 FastAPI Application

```python
# packages/ai/src/main.py
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(
    title="Sprintio AI Service",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
)

# CORS (only allow CF Worker)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://api.sprintio.app"],
    allow_methods=["POST"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}

@app.post("/api/v1/ai/summarize")
async def summarize_task(request: SummarizeRequest):
    """Summarize a task or project."""
    # Implementation...
    pass

@app.post("/api/v1/ai/suggest-priority")
async def suggest_priority(request: PriorityRequest):
    """AI-suggested priority for a task."""
    # Implementation...
    pass

@app.post("/api/v1/ai/search")
async def semantic_search(request: SearchRequest):
    """Semantic search across tasks and documents."""
    # Implementation...
    pass
```

### 8.4 AI Service Scaling Strategy

| Metric            | Production     | Staging |
| ----------------- | -------------- | ------- |
| Min instances     | 0 (sleep mode) | 0       |
| Max instances     | 2              | 1       |
| CPU               | 4 vCPU         | 2 vCPU  |
| RAM               | 8 GB           | 4 GB    |
| Sleep timeout     | 10 min         | 5 min   |
| Keep-warm cron    | Every 10 min   | None    |
| Cold start time   | 30–60s         | 30–60s  |
| Avg response time | 1–5s           | 1–5s    |

---

## 9. Storage Deploy (Cloudflare R2)

### 9.1 R2 Bucket Configuration

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE R2                             │
│                                                             │
│  Account: Sprintio                                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Bucket: sprintio-production                             ││
│  │  Region: auto (nearest edge)                             ││
│  │  Storage Class: Standard                                 ││
│  │                                                          ││
│  │  Lifecycle Rules:                                        ││
│  │  • None (all files retained)                              ││
│  │                                                          ││
│  │  CORS Policy:                                            ││
│  │  • Allowed Origins: https://sprintio.app                 ││
│  │  • Allowed Methods: GET, PUT, POST, DELETE               ││
│  │  • Allowed Headers: Content-Type, Authorization          ││
│  │  • Max Age: 3600                                         ││
│  │                                                          ││
│  │  Public Access:                                           ││
│  │  • Public R2 subdomain: disabled (presigned URLs only)   ││
│  │  • Exception: /avatars/* (public read via CDN)           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Bucket: sprintio-staging                                ││
│  │  Region: auto                                            ││
│  │                                                          ││
│  │  Lifecycle Rules:                                        ││
│  │  • Delete objects older than 30 days                      ││
│  │                                                          ││
│  │  CORS Policy:                                            ││
│  │  • Allowed Origins: https://staging.sprintio.app         ││
│  │                                                          ││
│  │  Public Access: disabled                                  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Bucket: sprintio-temp                                   ││
│  │  Region: auto                                            ││
│  │                                                          ││
│  │  Lifecycle Rules:                                        ││
│  │  • Delete incomplete multipart uploads after 1 day       ││
│  │  • Delete all objects after 1 day                        ││
│  │                                                          ││
│  │  Purpose: Upload staging, temporary processing files     ││
│  │  Public Access: disabled                                  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 9.2 R2 Presigned URL Flow

```
┌──────────┐          ┌──────────┐          ┌──────────┐
│  Browser  │────1────▶│  CF      │────2────▶│  R2      │
│  (SPA)    │          │  Worker  │          │  (R2)    │
│           │◀──4──────│  (API)   │◀──3──────│          │
└──────────┘          └──────────┘          └──────────┘

1. POST /api/v1/files/upload { name, size, type }
2. Worker generates presigned PUT URL
3. Presigned URL returned to client
4. Client uploads directly to R2 (no server intermediary)
```

---

## 10. DNS & SSL (Cloudflare)

### 10.1 DNS Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE DNS                            │
│                    Zone: sprintio.app                        │
│                                                             │
│  Type    Name                  Content              TTL     │
│  ─────   ────                  ───────              ───     │
│  A       @                     192.0.2.1 (proxy)    Auto    │
│  CNAME   www                   sprintio.app         Auto    │
│  CNAME   api                   sprintio-api.xxx     Auto    │
│                                   .workers.dev       (proxy)│
│  CNAME   staging               <pages-deploy-url>   Auto    │
│                                   .pages.dev         (proxy)│
│  CNAME   api-staging           sprintio-api-stg     Auto    │
│                                   .xxx.workers.dev   (proxy)│
│  MX      @                     mx1.mailprovider     3600    │
│  TXT     _dmarc                v=DMARC1; p=quarantine  3600  │
│  TXT     @                     v=spf1 include:...  3600    │
│                                                             │
│  DNS Settings:                                              │
│  • Proxy status: Proxied (orange cloud) for all A/CNAME    │
│  • DNSSEC: Enabled                                          │
│  • CAA Records: 0 issue "letsencrypt.org"                   │
│  • Always Use HTTPS: Enabled                                │
│  • Minimum TLS Version: 1.2                                 │
│  • Automatic HTTPS Rewrites: Enabled                        │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 SSL/TLS Configuration

```
┌─────────────────────────────────────────────────────────────┐
│                    SSL/TLS SETTINGS                          │
│                                                             │
│  Mode: Full (Strict)                                        │
│  • Encrypts end-to-end (client ↔ CF edge ↔ origin)        │
│  • Validates origin certificates                           │
│                                                             │
│  Certificate: Universal SSL (free)                          │
│  • Covers *.sprintio.app                                    │
│  • Auto-renews                                              │
│  • Wildcard support: Yes (with proxy)                       │
│                                                             │
│  Additional Settings:                                       │
│  • Minimum TLS: 1.2                                         │
│  • SSL/TLS: Full (Strict)                                   │
│  • Always Use HTTPS: On                                     │
│  • Automatic HTTPS Rewrites: On                             │
│  • HSTS: Enabled (max-age=31536000)                        │
│  • Early Hints: Enabled                                     │
│  • TLS 1.3: Enabled                                         │
│                                                             │
│  Security Headers (via CF Transform Rules):                 │
│  • Strict-Transport-Security: max-age=31536000; includeSub  │
│  • X-Content-Type-Options: nosniff                         │
│  • X-Frame-Options: DENY                                    │
│  • Referrer-Policy: strict-origin-when-cross-origin        │
│  • Permissions-Policy: camera=(), microphone=(), geoloc=() │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Environment Variables & Secrets

### 11.1 Secrets Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    SECRETS MANAGEMENT                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Tier 1: Build-Time (Vite / bundler)                  │  │
│  │                                                       │  │
│  │  Injected into frontend bundle at build time          │  │
│  │  MUST be prefixed with VITE_                          │  │
│  │  NEVER contains secrets (visible in browser)          │  │
│  │  Source: CF Pages dashboard env vars                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Tier 2: Runtime (Cloudflare Worker env)               │  │
│  │                                                       │  │
│  │  Non-secret config set in wrangler.toml [vars]        │  │
│  │  Examples: ENVIRONMENT, LOG_LEVEL, CORS_ORIGIN        │  │
│  │  Source: wrangler.toml [env.X.vars]                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Tier 3: Secrets (encrypted at rest)                   │  │
│  │                                                       │  │
│  │  Sensitive values stored encrypted in Cloudflare      │  │
│  │  Injected at runtime (never in wrangler.toml)         │  │
│  │  Source: `wrangler secret put <NAME>`                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Tier 4: External Service Config                       │  │
│  │                                                       │  │
│  │  Secrets managed by the service provider              │  │
│  │  Neon, Upstash, Railway — set via their dashboards    │  │
│  │  Source: Service provider dashboards / CLI            │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 11.2 Complete Environment Variables Table

#### Frontend (Vite — Client-Side)

| Variable            | Type    | Description           | Example                     |
| ------------------- | ------- | --------------------- | --------------------------- |
| `VITE_API_URL`      | Runtime | Backend API base URL  | `https://api.sprintio.app`  |
| `VITE_WS_URL`       | Runtime | WebSocket URL         | `wss://api.sprintio.app`    |
| `VITE_APP_URL`      | Runtime | App base URL          | `https://sprintio.app`      |
| `VITE_SENTRY_DSN`   | Runtime | Sentry DSN            | `https://xxx@sentry.io/xxx` |
| `VITE_POSTHOG_KEY`  | Runtime | PostHog analytics key | `phc_xxx`                   |
| `VITE_POSTHOG_HOST` | Runtime | PostHog endpoint      | `https://app.posthog.com`   |
| `VITE_BUILD_TIME`   | Build   | Build timestamp       | Auto-generated              |
| `VITE_APP_VERSION`  | Build   | Package version       | From package.json           |

#### Backend (Cloudflare Worker — Non-Secret)

| Variable           | Environment | Description                                               |
| ------------------ | ----------- | --------------------------------------------------------- |
| `ENVIRONMENT`      | All         | Environment name (`development`, `staging`, `production`) |
| `LOG_LEVEL`        | All         | Logging level (`debug`, `info`, `warn`, `error`)          |
| `CORS_ORIGIN`      | All         | Allowed CORS origin                                       |
| `AI_MODEL_DEFAULT` | All         | Default AI model for requests                             |

#### Backend (Cloudflare Worker — Secrets)

| Variable                 | Environment | Description                         | Rotation  |
| ------------------------ | ----------- | ----------------------------------- | --------- |
| `DATABASE_URL`           | All         | Neon PostgreSQL connection string   | Quarterly |
| `DATABASE_URL_DIRECT`    | All         | Neon direct connection (migrations) | Quarterly |
| `REDIS_URL`              | All         | Upstash Redis connection string     | Quarterly |
| `JWT_SECRET`             | All         | JWT signing secret (256-bit)        | Monthly   |
| `JWT_REFRESH_SECRET`     | All         | Refresh token signing secret        | Monthly   |
| `R2_ACCESS_KEY_ID`       | All         | R2 API access key                   | Quarterly |
| `R2_SECRET_ACCESS_KEY`   | All         | R2 API secret key                   | Quarterly |
| `AI_SIDECAR_URL`         | All         | Railway service URL                 | On change |
| `AI_API_KEY`             | All         | Shared auth for AI sidecar          | Monthly   |
| `SENTRY_DSN`             | All         | Sentry error tracking DSN           | On change |
| `STRIPE_SECRET_KEY`      | Production  | Stripe API key                      | Quarterly |
| `STRIPE_WEBHOOK_SECRET`  | Production  | Stripe webhook signing secret       | Quarterly |
| `RESEND_API_KEY`         | All         | Resend email API key                | Quarterly |
| `GITHUB_APP_PRIVATE_KEY` | Production  | GitHub integration private key      | Annually  |
| `SLACK_BOT_TOKEN`        | Production  | Slack integration token             | Quarterly |

#### AI Sidecar (Railway)

| Variable            | Description                            |
| ------------------- | -------------------------------------- |
| `DATABASE_URL`      | Neon PostgreSQL (read/write)           |
| `REDIS_URL`         | Upstash Redis                          |
| `AI_API_KEY`        | Shared auth key (matches Worker)       |
| `OPENAI_API_KEY`    | OpenAI API key (embeddings)            |
| `ANTHROPIC_API_KEY` | Anthropic API key (chat)               |
| `MODEL_CACHE_DIR`   | Local model cache path                 |
| `ENVIRONMENT`       | `development`, `staging`, `production` |
| `LOG_LEVEL`         | Logging verbosity                      |

### 11.3 Secrets Rotation Procedure

```bash
# ─── Rotation Script ───────────────────────────────────────

# 1. Generate new secret
NEW_JWT_SECRET=$(openssl rand -base64 32)

# 2. Update in Cloudflare Workers
echo "$NEW_JWT_SECRET" | wrangler secret put JWT_SECRET --env production

# 3. Update in Railway (if applicable)
railway variables set JWT_SECRET="$NEW_JWT_SECRET" --service sprintio-ai-service

# 4. Verify new secret works (health check)
curl -s https://api.sprintio.app/api/health | jq .

# 5. Old secret is immediately invalidated (no grace period)
# All existing sessions will be invalidated — users must re-authenticate
```

---

## 12. Monitoring & Observability

### 12.1 Monitoring Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STACK                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Layer 1: Cloudflare Analytics (Built-in)             │  │
│  │                                                       │  │
│  │  • Web Analytics (frontend)                           │  │
│  │  • Workers Analytics (API performance)                │  │
│  │  • Security Events (DDoS, WAF)                        │  │
│  │  • R2 Analytics (storage)                             │  │
│  │  • Neon Analytics (database queries)                  │  │
│  │  • Real-time metrics dashboard                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Layer 2: Error Tracking (Sentry)                     │  │
│  │                                                       │  │
│  │  • Frontend: @sentry/react                            │  │
│  │  • Backend: @sentry/cloudflare-workers                │  │
│  │  • AI: sentry-sdk (Python)                            │  │
│  │  • Source maps uploaded at build time                 │  │
│  │  • Release tracking                                   │  │
│  │  • Performance tracing (Web Vitals, API latency)      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Layer 3: Application Analytics (PostHog)             │  │
│  │                                                       │  │
│  │  • Feature flag evaluation tracking                   │  │
│  │  • User action analytics                              │  │
│  │  • Funnel analysis                                    │  │
│  │  • Session replay                                     │  │
│  │  • Cohort analysis                                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Layer 4: Uptime Monitoring (Better Uptime)           │  │
│  │                                                       │  │
│  │  • HTTP health checks (every 30s)                     │  │
│  │  • SSL certificate monitoring                         │  │
│  │  • Status page: status.sprintio.app                   │  │
│  │  • Slack/PagerDuty alerts                             │  │
│  │  • Incident management                                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Layer 5: Log Aggregation (Cloudflare Logpush)        │  │
│  │                                                       │  │
│  │  • Workers logs → Cloudflare R2 (30-day retention)    │  │
│  │  • Structured JSON logging                            │  │
│  │  • Query via Cloudflare Log Explorer                  │  │
│  │  • Export to external SIEM (optional)                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 12.2 Health Check Endpoints

```typescript
// GET /api/health
{
  "status": "healthy",       // "healthy" | "degraded" | "unhealthy"
  "version": "1.2.3",
  "uptime": 86400,
  "checks": {
    "database": {
      "status": "healthy",
      "latency_ms": 12,
      "message": "Connected to Neon"
    },
    "redis": {
      "status": "healthy",
      "latency_ms": 3,
      "message": "Connected to Upstash"
    },
    "r2": {
      "status": "healthy",
      "latency_ms": 8,
      "message": "R2 accessible"
    },
    "ai": {
      "status": "healthy",
      "latency_ms": 45,
      "message": "AI sidecar responding"
    }
  },
  "timestamp": "2026-07-08T12:00:00Z"
}
```

### 12.3 Alert Rules

| Alert                | Condition                       | Severity | Channel   |
| -------------------- | ------------------------------- | -------- | --------- |
| API Error Rate       | > 5% of requests (5 min window) | Critical | PagerDuty |
| API Latency P99      | > 2000ms (5 min window)         | Warning  | Slack     |
| Database CPU         | > 80% (10 min window)           | Warning  | Slack     |
| Database Connections | > 50 (5 min window)             | Warning  | Slack     |
| Redis Memory         | > 80% (15 min window)           | Warning  | Slack     |
| AI Service Down      | Health check fails 3x           | Critical | PagerDuty |
| SSL Certificate      | Expires in < 14 days            | Warning  | Email     |
| DDoS Attack          | Activated Cloudflare mitigation | Critical | PagerDuty |
| Deployment Failed    | CI/CD pipeline failure          | Warning  | Slack     |
| Error Budget Burn    | > 10% in 1 hour                 | Critical | PagerDuty |

### 12.4 Structured Logging

```typescript
// packages/api/src/middleware/logging.ts
import { logger } from 'hono/logger';

export const structuredLogger = logger((c, next) => {
  const start = Date.now();

  return next().then(() => {
    const duration = Date.now() - start;

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: c.res.status >= 500 ? 'error' : 'info',
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        duration_ms: duration,
        request_id: c.req.header('x-request-id'),
        user_id: c.get('userId'),
        environment: c.env.ENVIRONMENT,
      }),
    );
  });
});
```

---

## 13. Scaling Strategy

### 13.1 Auto-Scaling Matrix

```
┌─────────────────────────────────────────────────────────────┐
│                    SCALING STRATEGY                          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Cloudflare Workers (API)                             │  │
│  │                                                       │  │
│  │  Model: Automatic (serverless)                        │  │
│  │  Min Instances: 0                                     │  │
│  │  Max Instances: 1000 (CF limit)                       │  │
│  │  Typical: 5–20 instances                              │  │
│  │  Cold Start: < 50ms                                   │  │
│  │  CPU Limit: 50ms per request                          │  │
│  │  Memory Limit: 128 MB per isolate                     │  │
│  │                                                       │  │
│  │  Scaling Trigger:                                     │  │
│  │  • Concurrent requests → new isolates spun up          │  │
│  │  • No traffic → isolates released (0 cost)            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Cloudflare Pages (Frontend)                          │  │
│  │                                                       │  │
│  │  Model: CDN (inherently scalable)                     │  │
│  │  Bandwidth: Unlimited (free)                          │  │
│  │  Requests: Unlimited (free)                           │  │
│  │  Edge Locations: 300+ globally                        │  │
│  │  Cache Hit Rate Target: > 90%                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Neon PostgreSQL (Database)                           │  │
│  │                                                       │  │
│  │  Model: Autoscaling (CU-based)                        │  │
│  │  Min Compute: 0.25 CU                                 │  │
│  │  Max Compute: 10 CU (production)                      │  │
│  │  Storage: Autoscale (pay per GB)                      │  │
│  │  Read Replicas: 1 (production)                        │  │
│  │                                                       │  │
│  │  Scaling Trigger:                                     │  │
│  │  • Connection pool exhaustion → scale up CU           │  │
│  │  • Query latency > threshold → scale up CU            │  │
│  │  • Auto-suspend on idle (save cost)                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Upstash Redis (Cache)                                │  │
│  │                                                       │  │
│  │  Model: Pay-as-you-go                                 │  │
│  │  Max Commands/Day: Unlimited (pay per 1M)             │  │
│  │  Max Memory: 256 MB (production)                       │  │
│  │  Max Connections: 1000                                │  │
│  │                                                       │  │
│  │  Scaling Trigger:                                     │  │
│  │  • Commands/day → auto-scales (cost increases)         │  │
│  │  • No instance scaling needed (serverless)             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Railway (AI Sidecar)                                 │  │
│  │                                                       │  │
│  │  Model: Horizontal pod autoscaling                    │  │
│  │  Min Instances: 0 (sleep when idle)                   │  │
│  │  Max Instances: 2 (production)                         │  │
│  │  CPU: 4 vCPU per instance                             │  │
│  │  RAM: 8 GB per instance                               │  │
│  │                                                       │  │
│  │  Scaling Trigger:                                     │  │
│  │  • CPU > 70% → scale up                               │  │
│  │  • Queue depth > 10 → scale up                        │  │
│  │  • CPU < 20% for 10 min → scale down                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Cloudflare R2 (Storage)                              │  │
│  │                                                       │  │
│  │  Model: Unlimited (auto-scaling)                      │  │
│  │  Storage: Unlimited (pay per GB)                       │  │
│  │  Bandwidth: Unlimited (free)                          │  │
│  │  Requests: Unlimited (pay per 1M)                     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 13.2 Platform Limits

| Resource                    | Free Tier   | Paid Tier (Recommended) | Hard Limit    |
| --------------------------- | ----------- | ----------------------- | ------------- |
| CF Workers Request Duration | 10ms CPU    | 50ms CPU (paid)         | 30s wall time |
| CF Workers Memory           | 128 MB      | 128 MB                  | 128 MB        |
| CF Workers Size             | 1 MB        | 10 MB (bundled)         | 10 MB         |
| CF Workers Cron             | 1/day       | Unlimited               | N/A           |
| CF Pages Bandwidth          | 100 GB/mo   | Unlimited               | N/A           |
| CF Pages Build Minutes      | 500/mo      | 5000/mo                 | N/A           |
| R2 Storage                  | 10 GB       | Pay per GB ($0.015/GB)  | Unlimited     |
| R2 Requests                 | 10M/mo free | Pay per 1M              | Unlimited     |
| Neon Compute Hours          | 191.9 hr/mo | Pay per CU-hour         | N/A           |
| Neon Storage                | 0.5 GB      | Pay per GB ($0.35/GB)   | N/A           |
| Upstash Commands            | 500K/day    | Pay per 1M ($0.30)      | Unlimited     |
| Upstash Storage             | 256 MB      | Pay per GB ($0.25/GB)   | N/A           |
| Railway CPU                 | N/A         | $20/mo per vCPU         | 32 vCPU       |
| Railway RAM                 | N/A         | $20/mo per GB           | 64 GB         |

---

## 14. Disaster Recovery & Backups

### 14.1 Backup Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKUP ARCHITECTURE                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Database (Neon)                                       │  │
│  │                                                       │  │
│  │  • Neon automatic backups: Daily (7-day retention)     │  │
│  │  • Point-in-time recovery: Enabled (7-day window)     │  │
│  │  • Manual pg_dump: Daily to R2 (90-day retention)     │  │
│  │  • Branch snapshots: Before migrations                 │  │
│  │  • Cross-region: WAL shipping to secondary region     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  File Storage (R2)                                     │  │
│  │                                                       │  │
│  │  • R2 Versioning: Enabled (production bucket)         │  │
│  │  • Cross-region replication: Not needed (CF edge)     │  │
│  │  • Lifecycle: Non-current versions retained 30 days   │  │
│  │  • Snapshot: Weekly export to cold storage (optional) │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Redis (Upstash)                                       │  │
│  │                                                       │  │
│  │  • Upstash automatic snapshots: Daily                │  │
│  │  • RDB persistence: Enabled                           │  │
│  │  • No manual backup needed (ephemeral data)           │  │
│  │  • Session data: Regenerated on login                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Application Code & Config                             │  │
│  │                                                       │  │
│  │  • Git: All code in GitHub (git history)              │  │
│  │  • Wrangler: Deployment history (previous versions)   │  │
│  │  • CI/CD: Build artifacts stored in GitHub Actions    │  │
│  │  • Secrets: Documented rotation schedule              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 14.2 Recovery Objectives

| Component            | RTO (Recovery Time Objective) | RPO (Recovery Point Objective) |
| -------------------- | ----------------------------- | ------------------------------ |
| Frontend (Pages)     | < 5 minutes                   | 0 (in Git)                     |
| Backend (Workers)    | < 5 minutes (rollback)        | 0 (in Git)                     |
| Database (Neon)      | < 15 minutes                  | < 5 minutes (PITR)             |
| Cache (Redis)        | < 5 minutes (cold cache)      | N/A (ephemeral)                |
| File Storage (R2)    | < 30 minutes                  | < 24 hours (versioning)        |
| AI Service (Railway) | < 10 minutes                  | 0 (stateless)                  |

### 14.3 Failover Procedures

```bash
# ─── Emergency Rollback (Backend Worker) ───────────────────

# List recent deployments
wrangler deployments list --env production

# Rollback to previous version
wrangler rollback --env production <version-id>

# Verify health after rollback
curl -s https://api.sprintio.app/api/health | jq .

# ─── Database Failover (Neon) ─────────────────────────────

# Neon handles failover automatically (HA plan)
# Manual intervention for region failure:
# 1. Check Neon status: https://status.neon.tech
# 2. If primary down, Neon promotes read replica automatically
# 3. Update DATABASE_URL if region changed

# ─── AI Service Failover (Railway) ────────────────────────

# Railway handles restarts automatically
# Manual intervention:
railway service restart --service sprintio-ai-service

# Scale up if needed:
railway scale --cpu 8 --memory 16 --service sprintio-ai-service
```

### 14.4 Disaster Recovery Runbook

| Scenario               | Detection             | Response                                     | Recovery             |
| ---------------------- | --------------------- | -------------------------------------------- | -------------------- |
| **Worker crash**       | Health check fails    | CF auto-restarts (seconds)                   | Automatic            |
| **Database outage**    | Health check DB fails | Neon auto-failover                           | < 15 min             |
| **Redis outage**       | Cache misses spike    | App degrades gracefully                      | < 5 min (cold cache) |
| **AI service down**    | Health check AI fails | Disable AI features (feature flag)           | < 10 min             |
| **DDoS attack**        | CF security dashboard | CF auto-mitigates                            | Automatic            |
| **Bad deployment**     | Error rate spike      | Rollback via wrangler                        | < 5 min              |
| **R2 outage**          | Upload failures       | Queue retries                                | < 30 min             |
| **Full region outage** | All services down     | Neon promotes replica; Railway region switch | < 30 min             |

---

## 15. Cost Estimation

### 15.1 Monthly Cost Breakdown

#### Production Environment

| Service                   | Tier            | Monthly Cost    | Notes                              |
| ------------------------- | --------------- | --------------- | ---------------------------------- |
| **Cloudflare Workers**    | Paid ($5/mo)    | **$5.00**       | Includes 10M requests/mo           |
| CF Workers (overage)      | Pay-as-you-go   | **$0.30**       | $0.30/1M requests (est. 10M extra) |
| **Cloudflare Pages**      | Free            | **$0.00**       | Unlimited bandwidth                |
| **Cloudflare R2**         | Pay-as-you-go   | **$5.00**       | ~200 GB storage + requests         |
| **Cloudflare DDoS/WAF**   | Free + Pro      | **$0.00**       | Included with Workers              |
| **Neon PostgreSQL**       | Launch ($19/mo) | **$19.00**      | 300 compute hours, 10 GB storage   |
| Neon compute overage      | Pay-as-you-go   | **$5.00**       | Extra CU-hours                     |
| **Upstash Redis**         | Pay-as-you-go   | **$10.00**      | ~1M commands/day, 256 MB           |
| **Railway**               | Pro ($20/mo)    | **$20.00**      | 4 vCPU, 8 GB RAM (AI sidecar)      |
| Railway usage             | Pay-as-you-go   | **$15.00**      | ~500 hours/mo (sleep+active)       |
| **Sentry**                | Team ($26/mo)   | **$26.00**      | 50K events, 1 GB attachments       |
| **PostHog**               | Free tier       | **$0.00**       | 1M events/mo free                  |
| **Better Uptime**         | Free tier       | **$0.00**       | 5 monitors free                    |
| **GitHub Actions**        | Free tier       | **$0.00**       | 2000 min/mo free                   |
| **Domain (sprintio.app)** | Annual          | **$1.50**       | ~$18/year ÷ 12                     |
|                           |                 |                 |                                    |
| **Production Total**      |                 | **~$107/month** |                                    |

#### Staging Environment

| Service            | Tier          | Monthly Cost  | Notes                 |
| ------------------ | ------------- | ------------- | --------------------- |
| Cloudflare Workers | Included      | $0.00         | Share paid plan       |
| Cloudflare Pages   | Free          | $0.00         | Free tier             |
| Cloudflare R2      | Pay-as-you-go | $1.00         | Small staging data    |
| Neon PostgreSQL    | Free tier     | $0.00         | 0.5 GB included       |
| Upstash Redis      | Free tier     | $0.00         | 10K commands/day free |
| Railway            | Pay-as-you-go | $5.00         | Minimal compute       |
|                    |               |               |                       |
| **Staging Total**  |               | **~$6/month** |                       |

#### Development (Preview)

| Service            | Tier      | Monthly Cost  | Notes                |
| ------------------ | --------- | ------------- | -------------------- |
| Cloudflare Workers | Included  | $0.00         | Share paid plan      |
| Cloudflare Pages   | Free      | $0.00         | Preview deploys free |
| Neon PostgreSQL    | Free tier | $0.00         | Ephemeral branches   |
| Upstash Redis      | Free tier | $0.00         | Per-PR not used      |
|                    |           |               |                      |
| **Dev Total**      |           | **~$0/month** |                      |

#### Local Development

| Service          | Tier | Monthly Cost | Notes            |
| ---------------- | ---- | ------------ | ---------------- |
| Docker Desktop   | Free | $0.00        | Personal use     |
| Local PostgreSQL | Free | $0.00        | Docker container |
| Local Redis      | Free | $0.00        | Docker container |
|                  |      |              |                  |
| **Local Total**  |      | **$0/month** |                  |

### 15.2 Total Monthly Cost Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    MONTHLY COST SUMMARY                      │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Environment       │  Monthly Cost  │  % of Total     │  │
│  │  ─────────────────  │  ────────────  │  ──────────     │  │
│  │  Production         │  $107.00       │  94.7%          │  │
│  │  Staging            │    $6.00       │   5.3%          │  │
│  │  Development        │    $0.00       │   0.0%          │  │
│  │  Local              │    $0.00       │   0.0%          │  │
│  │  ─────────────────  │  ────────────  │  ──────────     │  │
│  │  TOTAL              │  $113.00/mo    │  100%           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Annual Estimate:  $113 × 12 = $1,356/year                 │
│                                                             │
│  Cost at Scale (10K users):                                 │
│  • Workers overage: +$30/mo                                 │
│  • Neon scaling: +$30/mo                                    │
│  • Upstash scaling: +$20/mo                                 │
│  • Railway scaling: +$40/mo                                 │
│  • Scaled Total: ~$233/month                                │
└─────────────────────────────────────────────────────────────┘
```

### 15.3 Cost Optimization Strategies

| Strategy                 | Savings | Implementation                              |
| ------------------------ | ------- | ------------------------------------------- |
| Upstash free tier        | $10/mo  | Stay within 10K commands/day for staging    |
| Neon branching (preview) | $5/mo   | Auto-delete branches after PR merge         |
| Railway sleep mode       | $15/mo  | AI sidecar sleeps when idle (min=0)         |
| R2 lifecycle policies    | $3/mo   | Auto-delete temp files and old staging data |
| CF Workers paid plan     | N/A     | Worth $5/mo for 10M free requests           |
| Cache aggressively       | $20/mo  | Reduce DB queries with Redis + CF CDN       |
| Bundle optimization      | $5/mo   | Smaller Worker bundles = faster, cheaper    |

---

## 16. CI/CD Pipeline

### 16.1 Pipeline Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CI/CD PIPELINE                            │
│                                                             │
│  ┌──────────────┐                                           │
│  │  git push    │                                           │
│  │  (feature)   │                                           │
│  └──────┬───────┘                                           │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Stage 1: Validation (< 2 min)                        │   │
│  │                                                       │   │
│  │  ├── Lint (ESLint + Prettier)                         │   │
│  │  ├── Type Check (TypeScript)                           │   │
│  │  ├── Unit Tests (Vitest)                               │   │
│  │  └── Security Audit (npm audit)                        │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Stage 2: Build & Test (< 5 min)                      │   │
│  │                                                       │   │
│  │  ├── Build frontend (Vite)                            │   │
│  │  ├── Build backend (esbuild/wrangler)                 │   │
│  │  ├── Integration tests (against Neon preview branch)  │   │
│  │  └── Bundle size check                                │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Stage 3: Preview Deploy (< 3 min)                    │   │
│  │                                                       │   │
│  │  ├── Deploy frontend → CF Pages preview               │   │
│  │  ├── Deploy backend → CF Workers preview              │   │
│  │  ├── Create Neon preview branch (if schema changed)   │   │
│  │  ├── Run DB migrations on preview branch              │   │
│  │  ├── Run Playwright E2E tests                         │   │
│  │  └── Comment PR with preview URLs                     │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                   │
│              ┌──────────┴──────────┐                        │
│              ▼                     ▼                         │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Merge to staging │  │  Merge to main   │                │
│  │                   │  │                  │                │
│  │  Deploy to:       │  │  Deploy to:      │                │
│  │  • CF Pages       │  │  • CF Pages      │                │
│  │    (staging)      │  │    (production)  │                │
│  │  • CF Workers     │  │  • CF Workers    │                │
│  │    (staging)      │  │    (production)  │                │
│  │  • Neon           │  │  • Neon          │                │
│  │    (staging branch)│ │    (main branch) │                │
│  │  • Run smoke tests│  │  • Run smoke tests│               │
│  └──────────────────┘  │  • Manual approval│                │
│                        │  • Notify #deploy │                │
│                        └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### 16.2 GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main, staging]

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9'

jobs:
  # ─── Stage 1: Validation ────────────────────────────────
  validate:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm audit --audit-level=high

  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: validate
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  # ─── Stage 2: Build ─────────────────────────────────────
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [validate, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: packages/*/dist/

  # ─── Stage 3: Preview Deploy ────────────────────────────
  deploy-preview:
    name: Deploy Preview
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      # Frontend preview
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          workingDirectory: packages/web
          command: pages deploy dist --project-name=sprintio-web --branch=pr-${{ github.event.pull_request.number }}

      # Backend preview
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          workingDirectory: packages/api
          command: deploy --env=dev

      # Neon preview branch
      - name: Create Neon Branch
        run: |
          npx neonctl branches create \
            --project-id ${{ secrets.NEON_PROJECT_ID }} \
            --name preview-pr-${{ github.event.pull_request.number }} \
            --parent main

      # Comment on PR
      - name: Comment PR with preview URLs
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 Preview deployed!\n\n- Frontend: https://pr-${{ github.event.pull_request.number }}.sprintio-web.pages.dev\n- API: https://api-dev.sprintio.workers.dev`
            })

  # ─── Stage 4: Staging Deploy ────────────────────────────
  deploy-staging:
    name: Deploy Staging
    runs-on: ubuntu-latest
    needs: [validate, test, build]
    if: github.ref == 'refs/heads/staging'
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Deploy Frontend to Staging
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          workingDirectory: packages/web
          command: pages deploy dist --project-name=sprintio-web --branch=staging

      - name: Deploy Backend to Staging
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          workingDirectory: packages/api
          command: deploy --env=staging

      - name: Run DB Migrations (Staging)
        run: pnpm --filter @sprintio/db migrate:staging

      - name: Smoke Tests
        run: pnpm test:smoke -- --env=staging

  # ─── Stage 5: Production Deploy ─────────────────────────
  deploy-production:
    name: Deploy Production
    runs-on: ubuntu-latest
    needs: [validate, test, build]
    if: github.ref == 'refs/heads/main'
    environment: production # Requires manual approval
    steps:
      - uses: actions/checkout@v4

      - name: Deploy Frontend to Production
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          workingDirectory: packages/web
          command: pages deploy dist --project-name=sprintio-web --branch=main

      - name: Deploy Backend to Production
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          workingDirectory: packages/api
          command: deploy --env=production

      - name: Run DB Migrations (Production)
        run: pnpm --filter @sprintio/db migrate:production

      - name: Smoke Tests
        run: pnpm test:smoke -- --env=production

      - name: Notify Deploy
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"✅ Sprintio production deployed: ${{ github.sha }}"}'
```

---

## 17. Quick Reference Cheat Sheet

### Local Development

```bash
# Start full stack
docker compose up -d              # PostgreSQL, Redis, API, AI
pnpm dev                          # Frontend (Vite) + Backend (Wrangler)

# Database
pnpm db:push                      # Push schema to local DB
pnpm db:seed                      # Seed test data
pnpm db:studio                    # Open Drizzle Studio

# API
pnpm dev:api                      # Wrangler dev server (port 3001)
pnpm dev:api:local                # Wrangler dev with local bindings
```

### Deployment Commands

```bash
# Deploy to staging
pnpm deploy:staging

# Deploy to production
pnpm deploy:production

# Deploy specific service
pnpm --filter @sprintio/web deploy:pages
pnpm --filter @sprintio/api deploy:workers

# Rollback
wrangler rollback --env production <version-id>
```

### Secrets Management

```bash
# Set a secret
wrangler secret put DATABASE_URL --env production

# List secrets (names only, not values)
wrangler secret list --env production

# Delete a secret
wrangler secret delete DATABASE_URL --env production
```

### Database Operations

```bash
# Run migrations
pnpm db:migrate:production
pnpm db:migrate:staging

# Create Neon branch (for preview)
neonctl branches create --project-id <id> --name preview-<branch>

# Delete Neon branch
neonctl branches delete <branch-id>

# Connect to database
psql "postgresql://user:pass@ep-xxx.cloudneon.tech/sprintio?sslmode=require"
```

### Monitoring

```bash
# Live logs (Workers)
wrangler tail --env production

# Health check
curl -s https://api.sprintio.app/api/health | jq .

# Check Worker metrics
open "https://dash.cloudflare.com/<account-id>/workers/services/view/sprintio-api/production"
```

### Docker Compose (Full Local Stack)

```yaml
# infrastructure/docker/docker-compose.yml
services:
  # ─── Frontend ──────────────────────────────────────────
  web:
    build:
      context: ../..
      dockerfile: infrastructure/docker/web.Dockerfile
    ports:
      - '5173:5173'
    environment:
      - VITE_API_URL=http://localhost:3001
      - VITE_WS_URL=ws://localhost:3001
      - VITE_APP_URL=http://localhost:5173
    volumes:
      - ../../packages/web:/app/packages/web
      - /app/node_modules

  # ─── Backend API ──────────────────────────────────────
  api:
    build:
      context: ../..
      dockerfile: infrastructure/docker/api.Dockerfile
    ports:
      - '3001:3001'
    environment:
      - ENVIRONMENT=development
      - LOG_LEVEL=debug
      - CORS_ORIGIN=http://localhost:5173
      - DATABASE_URL=postgresql://sprintio:sprintio@db:5432/sprintio
      - DATABASE_URL_DIRECT=postgresql://sprintio:sprintio@db:5432/sprintio
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=local-dev-jwt-secret-not-for-production
      - JWT_REFRESH_SECRET=local-dev-refresh-secret-not-for-production
      - R2_ACCESS_KEY_ID=minioadmin
      - R2_SECRET_ACCESS_KEY=minioadmin
      - AI_SIDECAR_URL=http://ai:8000
      - AI_API_KEY=local-dev-ai-api-key
    volumes:
      - ../../packages/api:/app/packages/api
      - /app/node_modules
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy

  # ─── AI Sidecar ───────────────────────────────────────
  ai:
    build:
      context: ../..
      dockerfile: infrastructure/docker/ai.Dockerfile
    ports:
      - '8000:8000'
    environment:
      - ENVIRONMENT=development
      - LOG_LEVEL=debug
      - DATABASE_URL=postgresql://sprintio:sprintio@db:5432/sprintio
      - REDIS_URL=redis://redis:6379
      - AI_API_KEY=local-dev-ai-api-key
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
      - MODEL_CACHE_DIR=/app/.cache/models
    volumes:
      - ../../packages/ai:/app
      - ai-model-cache:/app/.cache/models
    depends_on:
      db:
        condition: service_healthy

  # ─── PostgreSQL 16 ────────────────────────────────────
  db:
    image: postgres:16-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_DB: sprintio
      POSTGRES_USER: sprintio
      POSTGRES_PASSWORD: sprintio
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ../../packages/db/src/migrations/init.sql:/docker-entrypoint-initdb.d/01-init.sql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U sprintio']
      interval: 5s
      timeout: 5s
      retries: 5

  # ─── Redis 7 ──────────────────────────────────────────
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redisdata:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5

  # ─── MinIO (R2-compatible local storage) ──────────────
  minio:
    image: minio/minio:latest
    ports:
      - '9000:9000'
      - '9001:9001'
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - miniodata:/data
    healthcheck:
      test: ['CMD', 'mc', 'ready', 'local']
      interval: 10s
      timeout: 5s
      retries: 5

  # ─── Adminer (DB GUI) ────────────────────────────────
  adminer:
    image: adminer:latest
    ports:
      - '8080:8080'
    environment:
      ADMINER_DEFAULT_SERVER: db
      ADMINER_DESIGN: pepa-linha-dark
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
  redisdata:
  miniodata:
  ai-model-cache:
```

### Environment Variable Cheat Sheet

```bash
# ─── Frontend (.env) ──────────────────────────────────────
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_APP_URL=http://localhost:5173
VITE_SENTRY_DSN=
VITE_POSTHOG_KEY=

# ─── Backend (.env / wrangler secret) ────────────────────
ENVIRONMENT=development
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://sprintio:sprintio@localhost:5432/sprintio
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-production
JWT_REFRESH_SECRET=change-me-in-production
R2_ACCESS_KEY_ID=minioadmin
R2_SECRET_ACCESS_KEY=minioadmin
AI_SIDECAR_URL=http://localhost:8000
AI_API_KEY=local-dev-key

# ─── AI Sidecar (.env) ───────────────────────────────────
DATABASE_URL=postgresql://sprintio:sprintio@localhost:5432/sprintio
REDIS_URL=redis://localhost:6379
AI_API_KEY=local-dev-key
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
MODEL_CACHE_DIR=./.cache/models
ENVIRONMENT=development
LOG_LEVEL=debug
```

### URL Reference

| Service        | Local                             | Staging                              | Production                   |
| -------------- | --------------------------------- | ------------------------------------ | ---------------------------- |
| Frontend       | `http://localhost:5173`           | `staging.sprintio.app`               | `sprintio.app`               |
| API            | `http://localhost:3001`           | `api-staging.sprintio.app`           | `api.sprintio.app`           |
| WebSocket      | `ws://localhost:3001`             | `wss://api-staging.sprintio.app`     | `wss://api.sprintio.app`     |
| AI Service     | `http://localhost:8000`           | `sprintio-ai-staging.up.railway.app` | `sprintio-ai.up.railway.app` |
| DB Admin       | `http://localhost:8080` (Adminer) | Neon Dashboard                       | Neon Dashboard               |
| Redis          | `redis-cli -p 6379`               | Upstash Console                      | Upstash Console              |
| Object Storage | `http://localhost:9001` (MinIO)   | R2 Dashboard                         | R2 Dashboard                 |
| Monitoring     | —                                 | Cloudflare Dashboard                 | Cloudflare Dashboard         |
| Status Page    | —                                 | —                                    | `status.sprintio.app`        |

---

## Document Revision History

| Version | Date       | Author           | Changes                         |
| ------- | ---------- | ---------------- | ------------------------------- |
| 1.0     | 2026-07-08 | Engineering Team | Initial deployment architecture |

---

> **This document is the single source of truth for Sprintio's deployment architecture. All infrastructure changes must be reflected here. For questions, contact the Engineering Team.**
