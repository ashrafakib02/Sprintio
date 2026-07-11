# Sprintio — Architecture Documentation

> Single source of truth for all architectural decisions, patterns, and conventions.

## Tech Stack

| Layer             | Technology                                                                        |
| ----------------- | --------------------------------------------------------------------------------- |
| **Frontend**      | React 18, Vite, TypeScript, TanStack Router/Query, Redux Toolkit, Tailwind CSS v4 |
| **UI Components** | 21st.dev (shadcn/ui-compatible marketplace)                                       |
| **Rich Text**     | TipTap (ProseMirror)                                                              |
| **Real-time**     | Yjs (CRDT)                                                                        |
| **Backend**       | Express.js, Zod, Drizzle ORM                                                      |
| **Database**      | PostgreSQL 16 + TimescaleDB + pgvector                                            |
| **Auth**          | JWT (ES256), OAuth, MFA (TOTP)                                                    |
| **Queues**        | BullMQ (Redis), Temporal.io (workflows)                                           |
| **Storage**       | Cloudflare R2                                                                     |
| **Caching**       | Redis Cluster (ioredis), Cloudflare CDN                                           |
| **AI**            | Python FastAPI sidecar                                                            |
| **Infra**         | Cloudflare (Pages, Workers, R2, CDN, DDoS)                                        |
| **CI/CD**         | GitHub Actions, Turborepo                                                         |

---

## Document Index

| #   | Document                                              | Description                                                                                                                                                                            |
| --- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | [Frontend Architecture](./01-FRONTEND.md)             | React SPA architecture, component system (21st.dev), state management, routing, real-time collaboration (Yjs), TipTap editor, performance targets                                      |
| 02  | [Backend Architecture](./02-BACKEND.md)               | Express.js service architecture, middleware chain, domain modules (12), error handling, logging, graceful shutdown                                                                     |
| 03  | [Database Architecture](./03-DATABASE.md)             | PostgreSQL schema, Drizzle ORM, TimescaleDB hypertables, pgvector semantic search, Row-Level Security, migrations, connection pooling                                                  |
| 04  | [Authentication Architecture](./04-AUTHENTICATION.md) | JWT + refresh tokens, OAuth (Google/GitHub), magic links, MFA (TOTP), RBAC (4 roles, 30+ permissions), API key auth, session management                                                |
| 05  | [Queue & Workflow Architecture](./05-QUEUES.md)       | BullMQ job queues (10 types), Temporal.io durable workflows, 5 priority tiers, dead letter queue, metrics & monitoring                                                                 |
| 06  | [Storage Architecture](./06-STORAGE.md)               | Cloudflare R2 (3-bucket strategy), presigned uploads, image processing (Sharp), CDN cache rules, SQL schema, cleanup jobs                                                              |
| 07  | [Caching Architecture](./07-CACHING.md)               | Three-tier cache (L1 in-process → L2 Redis Cluster → L3 CDN), cache-aside/write-through/write-behind, 30+ key patterns, SWR, event-driven invalidation, anti-patterns                  |
| 08  | [API Architecture](./08-API.md)                       | REST API design (120+ endpoints, 17 resources), cursor-based pagination, versioning, error format, rate limiting, WebSocket events, webhooks                                           |
| 09  | [Folder Structure](./09-FOLDER-STRUCTURE.md)          | Turborepo monorepo layout, frontend/backend/shared/db/AI packages, naming conventions, import aliases                                                                                  |
| 10  | [CI/CD Architecture](./10-CICD.md)                    | GitHub Actions pipelines (PR/Main/Release), Turborepo task graphs, test pyramid, Cloudflare Pages/Workers deploys, expand/contract migrations, auto-rollback                           |
| 11  | [Deployment Architecture](./11-DEPLOYMENT.md)         | 4-environment strategy, Cloudflare Pages/Workers deploy config, Neon DB branching, Upstash Redis, Railway AI, DNS/SSL, monitoring (5-layer observability), DR runbook, cost estimation |

---

## Architecture Principles

1. **Cloudflare-First** — Pages, Workers, R2, CDN, DDoS protection — minimize vendor sprawl
2. **PostgreSQL as Source of Truth** — All application data in Postgres; Redis for cache/sessions/queues only
3. **Monorepo with Turborepo** — Shared types, isolated builds, affected-only CI
4. **21st.dev Components** — shadcn/ui-compatible marketplace; style via CSS variables, modify .tsx only for behavior
5. **API-First** — Zod schemas generate OpenAPI docs, TypeScript clients, and validation simultaneously
6. **Zero-Trust Security** — RLS in DB, JWT rotation with reuse detection, workspace isolation at every layer
7. **Observable by Default** — Structured logging, Prometheus metrics, Sentry error tracking, PostHog analytics
8. **Progressive Enhancement** — MVP ships email/password + RBAC; Phase 2 adds SSO/SAML/SCIM

---

## Cross-Reference Map

```
01-FRONTEND ──────→ 04-AUTH (AuthContext, protected routes)
        │          → 07-CACHING (TanStack Query config)
        │          → 08-API (REST client, WebSocket)
        │          → 09-FOLDER (frontend package structure)
        │
02-BACKEND ───────→ 03-DATABASE (Drizzle ORM queries)
        │          → 04-AUTH (middleware chain)
        │          → 05-QUEUES (job producers)
        │          → 06-STORAGE (R2 uploads)
        │          → 07-CACHING (Redis operations)
        │          → 08-API (Express routes)
        │
03-DATABASE ──────→ 05-QUEUES (migration jobs)
        │          → 10-CICD (expand/contract migrations)
        │
04-AUTH ──────────→ 02-BACKEND (middleware)
        │          → 07-CACHING (session store)
        │          → 11-DEPLOY (secrets)
        │
05-QUEUES ────────→ 02-BACKEND (BullMQ producers)
        │          → 11-DEPLOY (Temporal config)
        │
06-STORAGE ───────→ 02-BACKEND (R2 client)
        │          → 11-DEPLOY (bucket config)
        │
07-CACHING ───────→ 02-BACKEND (Redis client)
        │          → 01-FRONTEND (query invalidation)
        │
08-API ───────────→ 01-FRONTEND (API client)
        │          → 02-BACKEND (Express routes)
        │
10-CICD ──────────→ 11-DEPLOY (pipeline → deploy)
```

---

## Related Documentation

| Document                                                         | Location                                     |
| ---------------------------------------------------------------- | -------------------------------------------- |
| [PRD](../PRD.md)                                                 | Product requirements                         |
| [MVP Definition](../MVP_DEFINITION.md)                           | MVP scope & milestones                       |
| [Functional Requirements](../FUNCTIONAL_REQUIREMENTS.md)         | Feature specs                                |
| [Non-Functional Requirements](../NON_FUNCTIONAL_REQUIREMENTS.md) | Performance, security, scalability targets   |
| [User Personas](../USER_PERSONAS.md)                             | Target user profiles                         |
| [Design System](../../Design-System/README.md)                   | Tokens, components, spacing, Tailwind config |
