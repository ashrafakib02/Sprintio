# Sprintio

> **AI-enhanced collaborative work management platform** — project management, knowledge base, and workflow automation in one place, powered by AI.

---

## What is Sprintio?

Sprintio unifies the tools your team already uses — task tracking, docs, and automation — into a single, fast, intelligent platform. Built with a modern TypeScript stack and self-hostable architecture, it gives you the power of Linear, Notion, and Zapier without the context-switching.

---

## Tech Stack

### Frontend

| | |
|-|-|
| **Framework** | React 18 + Vite + TypeScript |
| **Styling** | Tailwind CSS v4 |
| **Components** | [21st.dev](https://21st.dev) (shadcn/ui-compatible marketplace) |
| **Routing** | TanStack Router (file-based) |
| **Server State** | TanStack Query |
| **Client State** | Redux Toolkit |
| **Rich Text** | TipTap (ProseMirror) |
| **Real-time** | Yjs (CRDT) — collaborative editing & live cursors |

### Backend

| | |
|-|-|
| **Runtime** | Express.js + Zod + Drizzle ORM |
| **Database** | PostgreSQL 16 + TimescaleDB + pgvector |
| **Auth** | JWT (ES256) + refresh tokens + OAuth + MFA (TOTP) |
| **Queues** | BullMQ (Redis) + Temporal.io (durable workflows) |
| **Storage** | Cloudflare R2 (S3-compatible, zero egress) |
| **Caching** | Redis Cluster + Cloudflare CDN |

### Platform

| | |
|-|-|
| **AI** | Python FastAPI sidecar (Ollama / vLLM) |
| **Infrastructure** | Cloudflare (Pages, Workers, R2, CDN, DDoS) |
| **Monorepo** | Turborepo + pnpm workspaces |

### Observability

| | |
|-|-|
| **Logging** | Pino (structured JSON) → OpenTelemetry → Loki |
| **Metrics** | Prometheus + Grafana dashboards |
| **Tracing** | OpenTelemetry → Tempo |
| **Errors** | Sentry (frontend + backend) |
| **Analytics** | PostHog (events, feature flags, session replay) |
| **Uptime** | Better Uptime (synthetic checks + status page) |

---

## Quick Start

Get Sprintio running locally in under two minutes.

**Prerequisites:** Node.js 20+ · pnpm 9+ · PostgreSQL 16 · Redis 7+

```bash
git clone https://github.com/your-org/sprintio.git
cd sprintio
pnpm install
cp .env.example .env                    # configure your DB and Redis URLs
pnpm --filter @sprintio/db migrate
pnpm dev                                # starts web + api + ai
```

### Scripts

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Start all apps (web, api, ai) |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type-check all packages |

---

## Project Structure

```
sprintio/
├── apps/
│   ├── web/                    # React SPA (Vite + TanStack Router)
│   ├── api/                    # Express.js backend
│   └── ai/                     # Python FastAPI AI sidecar
├── packages/
│   ├── shared/                 # Zod schemas, types, utilities
│   ├── db/                     # Drizzle schema, migrations
│   ├── eslint-config/          # Shared ESLint config
│   ├── tsconfig/               # Shared TypeScript config
│   ├── tailwind-config/        # Tailwind theme & plugins
│   ├── vite-config/            # Vite base config
│   └── turbo-config/           # Turborepo pipeline config
├── docs/
│   ├── architecture/           # 11 architecture documents
│   └── *.md                    # PRD, MVP, NFRs, personas
└── Design-System/              # Tokens, components, Tailwind
```

---

## Documentation

New here? Start with the product docs. Building something? Head to the architecture guides.

### Getting Started

| | |
|-|-|
| [Product Requirements (PRD)](docs/PRD.md) | What Sprintio is and why it exists |
| [MVP Definition](docs/MVP_DEFINITION.md) | Scope, milestones, and success metrics |
| [Functional Requirements](docs/FUNCTIONAL_REQUIREMENTS.md) | Feature specifications |
| [User Personas](docs/USER_PERSONAS.md) | Who we're building for |

### Deep Dive — Architecture

| | |
|-|-|
| [Frontend](docs/architecture/01-FRONTEND.md) | React SPA, component system, state management, real-time collaboration |
| [Backend](docs/architecture/02-BACKEND.md) | Express.js service, middleware, domain modules, error handling |
| [Database](docs/architecture/03-DATABASE.md) | PostgreSQL schema, Drizzle ORM, TimescaleDB, pgvector, RLS |
| [Authentication](docs/architecture/04-AUTHENTICATION.md) | JWT, OAuth, MFA, RBAC, API keys, session management |
| [Queues](docs/architecture/05-QUEUES.md) | BullMQ jobs, Temporal workflows, priority tiers, dead letter queue |
| [Storage](docs/architecture/06-STORAGE.md) | Cloudflare R2, file uploads, image processing, CDN |
| [Caching](docs/architecture/07-CACHING.md) | Three-tier cache, Redis, SWR, invalidation, anti-patterns |
| [API](docs/architecture/08-API.md) | REST design, 120+ endpoints, pagination, versioning, WebSockets |
| [Folder Structure](docs/architecture/09-FOLDER-STRUCTURE.md) | Monorepo layout, naming conventions, import aliases |
| [CI/CD](docs/architecture/10-CICD.md) | GitHub Actions, Turborepo pipelines, test strategy, auto-rollback |
| [Deployment](docs/architecture/11-DEPLOYMENT.md) | Cloudflare Pages/Workers, Neon DB, Upstash Redis, monitoring |
| [Architecture Index](docs/architecture/README.md) | Cross-reference map and architecture principles |

### Deep Dive — Design System

| | |
|-|-|
| [Design System Index](docs/Design-System/README.md) | Full overview |
| [Spacing](docs/Design-System/01-SPACING.md) | 4px base grid, spacing scale |
| [Tokens](docs/Design-System/02-TOKENS.md) | Three-layer token architecture |
| [Tailwind Config](docs/Design-System/03-TAILWIND-CONFIG.md) | Tailwind CSS v4 + `@theme` setup |
| [21st.dev Strategy](docs/Design-System/04-21ST-DEV-STRATEGY.md) | Component marketplace integration |
| [Buttons](docs/Design-System/05-BUTTONS.md) | 7 variants, 7 sizes, CVA definitions |
| [Cards](docs/Design-System/06-CARDS.md) | 6 variants, Sprintio compositions |
| [Inputs](docs/Design-System/07-INPUTS.md) | Text, textarea, select, checkbox, validation |
| [Modals](docs/Design-System/08-MODALS.md) | Dialogs, command palette, confirmations |

### Reference

| | |
|-|-|
| [Non-Functional Requirements](docs/NON_FUNCTIONAL_REQUIREMENTS.md) | Performance, security, scalability targets |
| [Future Roadmap](docs/FUTURE_ROADMAP.md) | Post-MVP phases |

---

## Architecture Principles

| Principle | One-liner |
|-----------|-----------|
| **Cloudflare-First** | Pages, Workers, R2, CDN, DDoS — minimal vendor sprawl. |
| **PostgreSQL as Source of Truth** | Redis is for cache, sessions, and queues only. |
| **Monorepo with Turborepo** | Shared types, isolated builds, affected-only CI. |
| **API-First** | Zod schemas generate OpenAPI docs, TypeScript clients, and validation. |
| **Zero-Trust Security** | RLS in DB, JWT rotation, workspace isolation at every layer. |
| **Observable by Default** | Structured logging, Prometheus metrics, Sentry, PostHog. |

---

## License

Proprietary — All rights reserved.
