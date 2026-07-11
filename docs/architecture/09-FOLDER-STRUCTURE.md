# 09 — Project Folder Structure

> **Sprintio** — AI-Enhanced Collaborative Work Management Platform
> Architecture Document v1.0

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Complete Monorepo Tree](#2-complete-monorepo-tree)
3. [Top-Level Directory Breakdown](#3-top-level-directory-breakdown)
4. [Monorepo Root Layout](#4-monomorepo-root-layout)
5. [Frontend — `packages/web/`](#5-frontend--packagesweb)
6. [Backend — `packages/api/`](#6-backend--packagesapi)
7. [Shared — `packages/shared/`](#7-shared--packagesshared)
8. [Database — `packages/db/`](#8-database--packagesdb)
9. [AI Sidecar — `packages/ai/`](#9-ai-sidecar--packagesai)
10. [Config — `packages/config/`](#10-config--packagesconfig)
11. [Infrastructure — `infrastructure/`](#11-infrastructure--infrastructure)
12. [Scripts — `scripts/`](#12-scripts--scripts)
13. [Testing Structure](#13-testing-structure)
14. [Naming Conventions](#14-naming-conventions)
15. [Import Alias Configuration](#15-import-alias-configuration)
16. [Quick Reference Cheat Sheet](#16-quick-reference-cheat-sheet)

---

## 1. Design Principles

| Principle                  | Rule                                                                       |
| -------------------------- | -------------------------------------------------------------------------- |
| **Flat over nested**       | No directory deeper than 4 levels unless unavoidable                       |
| **Domain-first grouping**  | Files grouped by feature/domain, not by technical role                     |
| **Co-location**            | Tests sit next to source; types live with consumers                        |
| **Single source of truth** | Shared types in `packages/shared`; never duplicate across packages         |
| **Explicit barrels**       | Every directory has an `index.ts` exporting its public surface             |
| **Config isolation**       | All config packages are publishable; consumed via workspace protocol       |
| **Screaming architecture** | Directory names reveal intent (`billing/`, `collaboration/`, not `utils/`) |

---

## 2. Complete Monorepo Tree

```
sprintio/
│
├─── .github/                              # GitHub-specific config
│   ├─── workflows/
│   │   ├─── ci.yml                        # Main CI pipeline
│   │   ├─── cd-staging.yml                # Deploy to staging
│   │   ├─── cd-production.yml             # Deploy to production
│   │   ├─── pr-checks.yml                 # PR validation (lint, typecheck, test)
│   │   ├─── release-please.yml            # Automated releases
│   │   └─── ai-model-sync.yml             # Sync AI model artifacts
│   ├─── CODEOWNERS
│   ├─── PULL_REQUEST_TEMPLATE.md
│   └─── ISSUE_TEMPLATE/
│       ├─── bug_report.md
│       ├─── feature_request.md
│       └─── architecture_decision.md
│
├─── .husky/                               # Git hooks
│   ├─── pre-commit                        # Lint-staged on commit
│   ├─── commit-msg                        # Commitlint validation
│   └─── pre-push                          # Type check + unit tests
│
├─── docs/                                 # Project documentation
│   ├─── architecture/
│   │   ├─── 01-FRONTEND.md
│   │   ├─── 02-BACKEND.md
│   │   ├─── 03-DATABASE.md
│   │   ├─── 04-AI-SIDECAR.md
│   │   ├─── 05-REAL-TIME.md
│   │   ├─── 06-FILE-STORAGE.md
│   │   ├─── 07-CICD.md
│   │   ├─── 08-SECURITY.md
│   │   └─── 09-FOLDER-STRUCTURE.md
│   ├─── api/
│   │   ├─── OPENAPI-SPEC.yaml
│   │   ├─── AUTH.md
│   │   └─── WEBHOOKS.md
│   ├─── guides/
│   │   ├─── DEVELOPMENT.md
│   │   ├─── DEPLOYMENT.md
│   │   ├─── LOCAL-SETUP.md
│   │   └─── CONTRIBUTING.md
│   └─── adr/                              # Architecture Decision Records
│       ├─── 001-monorepo-with-turborepo.md
│       ├─── 002-drizzle-over-prisma.md
│       ├─── 003-yjs-for-collaboration.md
│       └─── 004-python-ai-sidecar.md
│
├─── apps/                                 # Runnable applications
│   │
│   ├─── web/                              # React SPA (Vite)
│   │   ├─── public/
│   │   │   ├─── favicon.svg
│   │   │   ├─── robots.txt
│   │   │   └─── assets/
│   │   │       ├─── icons/                # App icons (various sizes)
│   │   │       └─── images/               # Static images
│   │   │
│   │   ├─── src/
│   │   │   │
│   │   │   ├─── main.tsx                  # Application entry point
│   │   │   ├─── App.tsx                   # Root component + providers
│   │   │   ├─── vite-env.d.ts            # Vite environment type declarations
│   │   │   │
│   │   │   ├─── routes/                   # TanStack Router file-based routes
│   │   │   │   ├─── __root.tsx            # Root layout (providers, sidebar)
│   │   │   │   ├─── _auth.tsx             # Auth layout wrapper
│   │   │   │   ├─── _auth.login.tsx       # /login
│   │   │   │   ├─── _auth.register.tsx    # /register
│   │   │   │   ├─── _auth.forgot-password.tsx
│   │   │   │   ├─── _auth.reset-password.tsx
│   │   │   │   ├─── _dashboard.tsx        # Dashboard layout (sidebar + header)
│   │   │   │   ├─── _dashboard.index.tsx  # /dashboard (home)
│   │   │   │   ├─── _dashboard.settings.tsx       # /settings
│   │   │   │   ├─── _dashboard.settings_.tsx      # /settings/$tab
│   │   │   │   ├─── _workspace.tsx        # Workspace layout
│   │   │   │   ├─── _workspace.$workspaceId.tsx
│   │   │   │   ├─── _workspace.$workspaceId.boards.tsx
│   │   │   │   ├─── _workspace.$workspaceId.boards_.$boardId.tsx
│   │   │   │   ├─── _workspace.$workspaceId.projects.tsx
│   │   │   │   ├─── _workspace.$workspaceId.projects_.$projectId.tsx
│   │   │   │   ├─── _workspace.$workspaceId.documents.tsx
│   │   │   │   ├─── _workspace.$workspaceId.documents_.$docId.tsx
│   │   │   │   ├─── _workspace.$workspaceId.reports.tsx
│   │   │   │   ├─── _workspace.$workspaceId.members.tsx
│   │   │   │   ├─── _workspace.$workspaceId.automation.tsx
│   │   │   │   ├─── _workspace.$workspaceId.integrations.tsx
│   │   │   │   ├─── _workspace.$workspaceId.billing.tsx
│   │   │   │   ├─── _workspace_.$workspaceId.settings.tsx
│   │   │   │   └─── routeTree.gen.ts      # Auto-generated route tree
│   │   │   │
│   │   │   ├─── components/               # UI components
│   │   │   │   ├─── ui/                   # Primitive / design-system components
│   │   │   │   │   ├─── index.ts
│   │   │   │   │   ├─── button.tsx
│   │   │   │   │   ├─── input.tsx
│   │   │   │   │   ├─── select.tsx
│   │   │   │   │   ├─── dialog.tsx
│   │   │   │   │   ├─── dropdown-menu.tsx
│   │   │   │   │   ├─── popover.tsx
│   │   │   │   │   ├─── tooltip.tsx
│   │   │   │   │   ├─── badge.tsx
│   │   │   │   │   ├─── avatar.tsx
│   │   │   │   │   ├─── card.tsx
│   │   │   │   │   ├─── tabs.tsx
│   │   │   │   │   ├─── accordion.tsx
│   │   │   │   │   ├─── toast.tsx
│   │   │   │   │   ├─── skeleton.tsx
│   │   │   │   │   ├─── separator.tsx
│   │   │   │   │   └─── scroll-area.tsx
│   │   │   │   │
│   │   │   │   ├─── layout/               # Layout shell components
│   │   │   │   │   ├─── index.ts
│   │   │   │   │   ├─── app-shell.tsx
│   │   │   │   │   ├─── sidebar.tsx
│   │   │   │   │   ├─── header.tsx
│   │   │   │   │   ├─── command-palette.tsx
│   │   │   │   │   ├─── breadcrumbs.tsx
│   │   │   │   │   ├─── notifications-panel.tsx
│   │   │   │   │   ├─── search-overlay.tsx
│   │   │   │   │   └─── theme-toggle.tsx
│   │   │   │   │
│   │   │   │   ├─── board/                # Board (Kanban/Spreadsheet) components
│   │   │   │   │   ├─── index.ts
│   │   │   │   │   ├─── board-view.tsx
│   │   │   │   │   ├─── board-column.tsx
│   │   │   │   │   ├─── board-card.tsx
│   │   │   │   │   ├─── board-card-modal.tsx
│   │   │   │   │   ├─── board-filters.tsx
│   │   │   │   │   ├─── board-toolbar.tsx
│   │   │   │   │   ├─── spreadsheet-view.tsx
│   │   │   │   │   ├─── gantt-view.tsx
│   │   │   │   │   ├─── timeline-view.tsx
│   │   │   │   │   ├─── calendar-view.tsx
│   │   │   │   │   └─── board-settings-panel.tsx
│   │   │   │   │
│   │   │   │   ├─── document/             # Collaborative document editor
│   │   │   │   │   ├─── index.ts
│   │   │   │   │   ├─── editor.tsx
│   │   │   │   │   ├─── editor-toolbar.tsx
│   │   │   │   │   ├─── block-menu.tsx
│   │   │   │   │   ├─── slash-commands.tsx
│   │   │   │   │   ├─── mention-input.tsx
│   │   │   │   │   ├─── table-block.tsx
│   │   │   │   │   ├─── code-block.tsx
│   │   │   │   │   ├─── image-block.tsx
│   │   │   │   │   ├─── collaboration-cursors.tsx
│   │   │   │   │   ├─── version-history.tsx
│   │   │   │   │   └─── comment-thread.tsx
│   │   │   │   │
│   │   │   │   ├─── dashboard/            # Dashboard widgets
│   │   │   │   │   ├─── index.ts
│   │   │   │   │   ├─── activity-feed.tsx
│   │   │   │   │   ├─── stat-card.tsx
│   │   │   │   │   ├─── chart-widget.tsx
│   │   │   │   │   ├─── recent-items.tsx
│   │   │   │   │   ├─── my-tasks-widget.tsx
│   │   │   │   │   └─── team-status.tsx
│   │   │   │   │
│   │   │   │   ├─── project/              # Project management components
│   │   │   │   │   ├─── index.ts
│   │   │   │   │   ├─── project-list.tsx
│   │   │   │   │   ├─── project-card.tsx
│   │   │   │   │   ├─── project-create-dialog.tsx
│   │   │   │   │   ├─── task-list.tsx
│   │   │   │   │   ├─── task-card.tsx
│   │   │   │   │   ├─── task-detail-panel.tsx
│   │   │   │   │   ├─── task-create-form.tsx
│   │   │   │   │   ├─── milestone-tracker.tsx
│   │   │   │   │   └─── sprint-board.tsx
│   │   │   │   │
│   │   │   │   ├─── workspace/            # Workspace management
│   │   │   │   │   ├─── index.ts
│   │   │   │   │   ├─── workspace-switcher.tsx
│   │   │   │   │   ├─── workspace-create-dialog.tsx
│   │   │   │   │   ├─── member-list.tsx
│   │   │   │   │   ├─── invite-dialog.tsx
│   │   │   │   │   ├─── role-selector.tsx
│   │   │   │   │   └─── billing-panel.tsx
│   │   │   │   │
│   │   │   │   ├─── ai/                   # AI feature components
│   │   │   │   │   ├─── index.ts
│   │   │   │   │   ├─── ai-chat-panel.tsx
│   │   │   │   │   ├─── ai-summary.tsx
│   │   │   │   │   ├─── ai-suggestions.tsx
│   │   │   │   │   ├─── ai-auto-fill.tsx
│   │   │   │   │   ├─── ai-search.tsx
│   │   │   │   │   ├─── ai-smart-assign.tsx
│   │   │   │   │   └─── ai-loading-skeleton.tsx
│   │   │   │   │
│   │   │   │   ├─── notifications/        # Notification components
│   │   │   │   │   ├─── index.ts
│   │   │   │   │   ├─── notification-bell.tsx
│   │   │   │   │   ├─── notification-list.tsx
│   │   │   │   │   ├─── notification-item.tsx
│   │   │   │   │   └─── notification-preferences.tsx
│   │   │   │   │
│   │   │   │   ├─── forms/                # Shared form components
│   │   │   │   │   ├─── index.ts
│   │   │   │   │   ├─── form-field.tsx
│   │   │   │   │   ├─── date-picker.tsx
│   │   │   │   │   ├─── file-upload.tsx
│   │   │   │   │   ├─── color-picker.tsx
│   │   │   │   │   ├─── rich-text-input.tsx
│   │   │   │   │   └─── tag-input.tsx
│   │   │   │   │
│   │   │   │   └─── shared/               # Shared compound components
│   │   │   │       ├─── index.ts
│   │   │   │       ├─── data-table.tsx
│   │   │   │       ├─── empty-state.tsx
│   │   │   │       ├─── error-boundary.tsx
│   │   │   │       ├─── loading-overlay.tsx
│   │   │   │       ├─── pagination.tsx
│   │   │   │       ├─── confirmation-dialog.tsx
│   │   │   │       ├─── infinite-scroll.tsx
│   │   │   │       ├─── virtual-list.tsx
│   │   │   │       └─── sortable-list.tsx
│   │   │   │
│   │   │   ├─── hooks/                    # Custom React hooks
│   │   │   │   ├─── index.ts
│   │   │   │   ├─── use-auth.ts
│   │   │   │   ├─── use-workspace.ts
│   │   │   │   ├─── use-board.ts
│   │   │   │   ├─── use-task.ts
│   │   │   │   ├─── use-debounce.ts
│   │   │   │   ├─── use-media-query.ts
│   │   │   │   ├─── use-keyboard-shortcut.ts
│   │   │   │   ├─── use-click-outside.ts
│   │   │   │   ├─── use-local-storage.ts
│   │   │   │   ├─── use-websocket.ts
│   │   │   │   ├─── use-collaboration.ts
│   │   │   │   ├─── use-ai.ts
│   │   │   │   ├─── use-infinite-query.ts
│   │   │   │   └─── use-clipboard.ts
│   │   │   │
│   │   │   ├─── store/                     # Redux Toolkit slices & store config
│   │   │   │   ├─── index.ts
│   │   │   │   ├─── authSlice.ts
│   │   │   │   ├─── workspaceSlice.ts
│   │   │   │   ├─── boardSlice.ts
│   │   │   │   ├─── uiSlice.ts
│   │   │   │   ├─── notificationSlice.ts
│   │   │   │   ├─── collaborationSlice.ts
│   │   │   │   ├─── aiSlice.ts
│   │   │   │   └─── store.ts
│   │   │   │
│   │   │   ├─── lib/                      # Library wrappers & utilities
│   │   │   │   ├─── index.ts
│   │   │   │   ├─── api-client.ts         # Axios/fetch wrapper
│   │   │   │   ├─── query-client.ts       # TanStack Query config
│   │   │   │   ├─── router.ts             # TanStack Router config
│   │   │   │   ├─── yjs-provider.ts       # Yjs WebSocket provider
│   │   │   │   ├─── date.ts               # Date formatting utils
│   │   │   │   ├─── cn.ts                 # clsx + tailwind-merge helper
│   │   │   │   └─── validators.ts         # Zod schemas for client validation
│   │   │   │
│   │   │   ├─── services/                 # API service layer (TanStack Query hooks)
│   │   │   │   ├─── index.ts
│   │   │   │   ├─── auth.service.ts
│   │   │   │   ├─── workspace.service.ts
│   │   │   │   ├─── board.service.ts
│   │   │   │   ├─── task.service.ts
│   │   │   │   ├─── document.service.ts
│   │   │   │   ├─── user.service.ts
│   │   │   │   ├─── notification.service.ts
│   │   │   │   └─── ai.service.ts
│   │   │   │
│   │   │   ├─── types/                    # Frontend-only type declarations
│   │   │   │   ├─── index.ts
│   │   │   │   ├─── env.ts                # Vite env types
│   │   │   │   ├─── route-params.ts       # Typed route params
│   │   │   │   └─── socket-events.ts      # Client-side socket event types
│   │   │   │
│   │   │   └─── styles/                   # Global styles
│   │   │       ├─── globals.css           # Tailwind directives + CSS reset
│   │   │       ├─── editor.css            # Tiptap/ProseMirror editor styles
│   │   │       └─── board.css             # Board-specific overrides
│   │   │
│   │   ├─── index.html                    # Vite HTML entry
│   │   ├─── vite.config.ts
│   │   ├─── tsconfig.json
│   │   ├─── tailwind.config.ts
│   │   ├─── postcss.config.js
│   │   ├─── components.json               # 21st.dev / shadcn/ui config
│   │   └─── package.json
│   │
│   └─── ai/                               # Python FastAPI AI Sidecar
│       │
│       ├─── app/
│       │   ├─── __init__.py
│       │   ├─── main.py                   # FastAPI app entry + lifespan
│       │   │
│       │   ├─── core/                     # Core configuration
│       │   │   ├─── __init__.py
│       │   │   ├─── config.py             # Pydantic Settings (env vars)
│       │   │   ├─── security.py           # JWT validation, API key auth
│       │   │   └─── dependencies.py       # FastAPI dependency injection
│       │   │
│       │   ├─── routers/                  # API route handlers
│       │   │   ├─── __init__.py
│       │   │   ├─── health.py             # /health, /ready
│       │   │   ├─── chat.py               # /ai/chat (conversational AI)
│       │   │   ├─── summarize.py          # /ai/summarize
│       │   │   ├─── suggest.py            # /ai/suggest (task suggestions)
│       │   │   ├─── assign.py             # /ai/auto-assign
│       │   │   ├─── search.py             # /ai/search (semantic search)
│       │   │   ├─── extract.py            # /ai/extract (entity extraction)
│       │   │   └─── embeddings.py         # /ai/embeddings
│       │   │
│       │   ├─── services/                 # Business logic
│       │   │   ├─── __init__.py
│       │   │   ├─── llm.py               # LLM client abstraction (OpenAI/Anthropic)
│       │   │   ├─── embeddings.py         # Embedding generation & storage
│       │   │   ├─── prompts.py            # Prompt templates (Jinja2)
│       │   │   ├─── rag.py               # RAG pipeline (retrieve-augment-generate)
│       │   │   └─── queue_handlers.py     # BullMQ job processing (via Python)
│       │   │
│       │   ├─── models/                   # Pydantic models
│       │   │   ├─── __init__.py
│       │   │   ├─── requests.py           # Request body schemas
│       │   │   ├─── responses.py          # Response body schemas
│       │   │   └─── events.py             # Event/message schemas
│       │   │
│       │   ├─── storage/                  # Vector DB / file references
│       │   │   ├─── __init__.py
│       │   │   ├─── vector_store.py       # pgvector or external vector store
│       │   │   └─── cache.py              # Redis caching layer
│       │   │
│       │   └─── middleware/
│       │       ├─── __init__.py
│       │       ├─── logging.py            # Structured JSON logging
│       │       ├─── rate_limiter.py       # Token-based rate limiting
│       │       └─── error_handler.py      # Global exception handler
│       │
│       ├─── prompts/                      # Prompt template files
│       │   ├─── system.jinja2
│       │   ├─── summarize.jinja2
│       │   ├─── suggest.jinja2
│       │   └─── extract.jinja2
│       │
│       ├─── tests/
│       │   ├─── __init__.py
│       │   ├─── conftest.py               # Shared fixtures
│       │   ├─── test_chat.py
│       │   ├─── test_summarize.py
│       │   ├─── test_embeddings.py
│       │   └─── test_rag.py
│       │
│       ├─── requirements.txt
│       ├─── requirements-dev.txt
│       ├─── pyproject.toml
│       ├─── Dockerfile
│       ├─── .env.example
│       └─── README.md
│
├─── packages/                             # Shared workspace packages
│   │
│   ├─── shared/                           # Shared types, schemas, utils
│   │   │
│   │   ├─── src/
│   │   │   ├─── index.ts                  # Root barrel export
│   │   │   │
│   │   │   ├─── types/                    # Shared TypeScript types
│   │   │   │   ├─── index.ts
│   │   │   │   ├─── user.ts               # User, UserRole, UserProfile
│   │   │   │   ├─── workspace.ts          # Workspace, WorkspaceMembership
│   │   │   │   ├─── board.ts              # Board, Column, Card, View
│   │   │   │   ├─── task.ts               # Task, Subtask, TaskComment
│   │   │   │   ├─── document.ts           # Document, DocumentBlock
│   │   │   │   ├─── project.ts            # Project, Milestone, Sprint
│   │   │   │   ├─── notification.ts       # Notification, NotificationPref
│   │   │   │   ├─── ai.ts                 # AI-related types
│   │   │   │   ├─── integration.ts        # Integration, Webhook
│   │   │   │   ├─── billing.ts            # Plan, Subscription, Invoice
│   │   │   │   ├─── common.ts             # Pagination, ApiResponse, Error
│   │   │   │   └─── socket.ts             # WebSocket event types
│   │   │   │
│   │   │   ├─── schemas/                  # Zod validation schemas
│   │   │   │   ├─── index.ts
│   │   │   │   ├─── user.ts               # User input validation
│   │   │   │   ├─── auth.ts               # Login, register, reset
│   │   │   │   ├─── workspace.ts          # Create/update workspace
│   │   │   │   ├─── board.ts              # Board operations
│   │   │   │   ├─── task.ts               # Task CRUD
│   │   │   │   ├─── document.ts           # Document operations
│   │   │   │   ├─── project.ts            # Project operations
│   │   │   │   ├─── invitation.ts         # Invite members
│   │   │   │   └─── common.ts             # Shared schemas (pagination, id)
│   │   │   │
│   │   │   ├─── constants/                # Shared constants
│   │   │   │   ├─── index.ts
│   │   │   │   ├─── roles.ts              # UserRole enum values
│   │   │   │   ├─── permissions.ts        # Permission matrix
│   │   │   │   ├─── limits.ts             # Plan limits (members, storage)
│   │   │   │   ├─── events.ts             # Socket event names
│   │   │   │   └─── status.ts             # Task/Card status values
│   │   │   │
│   │   │   ├─── utils/                    # Shared pure utilities
│   │   │   │   ├─── index.ts
│   │   │   │   ├─── slug.ts               # URL-safe slug generation
│   │   │   │   ├─── color.ts              # Color palette generation
│   │   │   │   ├─── string.ts             # String manipulation
│   │   │   │   ├─── date.ts               # Date helpers
│   │   │   │   ├─── array.ts              # Array manipulation
│   │   │   │   └─── sanitize.ts           # HTML/markdown sanitization
│   │   │   │
│   │   │   └─── errors/                   # Shared error classes
│   │   │       ├─── index.ts
│   │   │       ├─── app-error.ts          # Base application error
│   │   │       ├─── auth-error.ts         # Authentication errors
│   │   │       ├─── validation-error.ts   # Validation errors
│   │   │       └─── not-found-error.ts    # Resource not found
│   │   │
│   │   ├─── tsconfig.json
│   │   └─── package.json
│   │
│   ├─── db/                               # Database package
│   │   │
│   │   ├─── src/
│   │   │   ├─── index.ts                  # Barrel export
│   │   │   │
│   │   │   ├─── connection.ts             # Drizzle connection factory
│   │   │   ├─── client.ts                 # Database client singleton
│   │   │   │
│   │   │   ├─── schema/                   # Drizzle schema definitions
│   │   │   │   ├─── index.ts              # Re-exports all tables
│   │   │   │   ├─── users.ts              # users table
│   │   │   │   ├─── workspaces.ts         # workspaces table
│   │   │   │   ├─── workspace-members.ts  # workspace_members (join)
│   │   │   │   ├─── boards.ts             # boards table
│   │   │   │   ├─── columns.ts            # board_columns table
│   │   │   │   ├─── cards.ts              # cards table
│   │   │   │   ├─── card-labels.ts        # card_labels (join)
│   │   │   │   ├─── labels.ts             # labels table
│   │   │   │   ├─── tasks.ts              # tasks table
│   │   │   │   ├─── subtasks.ts           # subtasks table
│   │   │   │   ├─── comments.ts           # comments table
│   │   │   │   ├─── documents.ts          # documents table
│   │   │   │   ├─── document-versions.ts  # document_versions table
│   │   │   │   ├─── projects.ts           # projects table
│   │   │   │   ├─── sprints.ts            # sprints table
│   │   │   │   ├─── milestones.ts         # milestones table
│   │   │   │   ├─── attachments.ts        # attachments table
│   │   │   │   ├─── notifications.ts      # notifications table
│   │   │   │   ├─── integrations.ts       # integrations table
│   │   │   │   ├─── webhooks.ts           # webhooks table
│   │   │   │   ├─── subscriptions.ts      # subscriptions table
│   │   │   │   ├─── ai-interactions.ts    # ai_interactions table (logging)
│   │   │   │   └─── relations.ts          # Drizzle relations definitions
│   │   │   │
│   │   │   ├─── migrations/               # Generated migration files
│   │   │   │   ├─── 0000_initial.sql
│   │   │   │   ├─── 0001_add_board_views.sql
│   │   │   │   ├─── 0002_add_documents.sql
│   │   │   │   └─── ...
│   │   │   │
│   │   │   ├─── seed/                     # Seed scripts
│   │   │   │   ├─── index.ts              # Seed orchestrator
│   │   │   │   ├─── users.ts              # Seed users
│   │   │   │   ├─── workspaces.ts         # Seed workspaces
│   │   │   │   ├─── boards.ts             # Seed boards + cards
│   │   │   │   └─── demo-data.ts          # Full demo dataset
│   │   │   │
│   │   │   └─── utils/
│   │   │       ├─── index.ts
│   │   │       ├─── migration-runner.ts   # Migration execution helper
│   │   │       └─── query-builder.ts      # Drizzle query helpers
│   │   │
│   │   ├─── drizzle.config.ts             # Drizzle Kit config
│   │   ├─── tsconfig.json
│   │   └─── package.json
│   │
│   └─── config/                           # Shared configuration packages
│       │
│       ├─── eslint-config/                # Shared ESLint config
│       │   ├─── base.js                   # Base ESLint config
│       │   ├─── react.js                  # React-specific rules
│       │   ├─── typescript.js             # TypeScript rules
│       │   └─── package.json
│       │
│       ├─── tsconfig/                     # Shared TypeScript configs
│       │   ├─── base.json                 # Base tsconfig
│       │   ├─── react.json                # React config
│       │   ├─── node.json                 # Node.js config
│       │   ├─── python.json               # For type checking .py stubs
│       │   └─── package.json
│       │
│       ├─── tailwind-config/              # Shared Tailwind preset
│       │   ├─── preset.ts                 # Tailwind theme preset
│       │   ├─── colors.ts                 # Sprintio color tokens
│       │   ├─── typography.ts             # Typography scale
│       │   └─── package.json
│       │
│       ├─── vite-config/                  # Shared Vite plugins/presets
│       │   ├─── base.ts                   # Base Vite config
│       │   ├─── plugins.ts                # Shared plugin set
│       │   └─── package.json
│       │
│       └─── turbo/                        # Turborepo pipeline configs
│           ├─── base.json                 # Base pipeline definitions
│           └─── package.json
│
├─── infrastructure/                       # Infrastructure as Code
│   │
│   ├─── terraform/
│   │   ├─── environments/
│   │   │   ├─── staging/
│   │   │   │   ├─── main.tf
│   │   │   │   ├─── variables.tf
│   │   │   │   ├─── outputs.tf
│   │   │   │   ├─── terraform.tfvars
│   │   │   │   └─── backend.tf
│   │   │   └─── production/
│   │   │       ├─── main.tf
│   │   │       ├─── variables.tf
│   │   │       ├─── outputs.tf
│   │   │       ├─── terraform.tfvars
│   │   │       └─── backend.tf
│   │   ├─── modules/
│   │   │   ├─── cloudflare-workers/
│   │   │   │   ├─── main.tf
│   │   │   │   ├─── variables.tf
│   │   │   │   └─── outputs.tf
│   │   │   ├─── cloudflare-d1/
│   │   │   │   ├─── main.tf
│   │   │   │   ├─── variables.tf
│   │   │   │   └─── outputs.tf
│   │   │   ├─── cloudflare-r2/
│   │   │   │   ├─── main.tf
│   │   │   │   ├─── variables.tf
│   │   │   │   └─── outputs.tf
│   │   │   ├─── cloudflare-kv/
│   │   │   │   ├─── main.tf
│   │   │   │   ├─── variables.tf
│   │   │   │   └─── outputs.tf
│   │   │   ├─── cloudflare-durable-objects/
│   │   │   │   ├─── main.tf
│   │   │   │   ├─── variables.tf
│   │   │   │   └─── outputs.tf
│   │   │   ├─── cloudflare-pages/
│   │   │   │   ├─── main.tf
│   │   │   │   ├─── variables.tf
│   │   │   │   └─── outputs.tf
│   │   │   ├─── cloudflare-ai-gateway/
│   │   │   │   ├─── main.tf
│   │   │   │   ├─── variables.tf
│   │   │   │   └─── outputs.tf
│   │   │   └─── cloudflare-access/
│   │   │       ├─── main.tf
│   │   │       ├─── variables.tf
│   │   │       └─── outputs.tf
│   │   └─── global.tf                     # Provider config, remote state
│   │
│   ├─── docker/
│   │   ├─── api.Dockerfile                # Backend API container
│   │   ├─── ai.Dockerfile                 # AI sidecar container
│   │   ├─── docker-compose.yml            # Local development stack
│   │   ├─── docker-compose.prod.yml       # Production overrides
│   │   └─── .dockerignore
│   │
│   └─── k8s/                              # Kubernetes manifests (if self-hosting)
│       ├─── base/
│       │   ├─── kustomization.yaml
│       │   ├─── namespace.yaml
│       │   ├─── api-deployment.yaml
│       │   ├─── api-service.yaml
│       │   ├─── ai-deployment.yaml
│       │   ├─── ai-service.yaml
│       │   ├─── hpa.yaml                  # Horizontal Pod Autoscaler
│       │   ├─── ingress.yaml
│       │   └─── configmap.yaml
│       └─── overlays/
│           ├─── staging/
│           │   └─── kustomization.yaml
│           └─── production/
│               └─── kustomization.yaml
│
├─── scripts/                              # Development & operational scripts
│   │
│   ├─── dev/
│   │   ├─── start-all.sh                  # Start all services locally
│   │   ├─── start-api.sh                  # Start backend only
│   │   ├─── start-web.sh                  # Start frontend only
│   │   ├─── start-ai.sh                   # Start AI sidecar only
│   │   ├─── setup-local.sh                # One-time local dev setup
│   │   └─── teardown.sh                   # Clean local state
│   │
│   ├─── db/
│   │   ├─── migrate.sh                    # Run pending migrations
│   │   ├─── migrate-fresh.sh              # Drop + recreate + seed
│   │   ├─── migrate-status.sh             # Show migration status
│   │   ├─── seed.sh                       # Run seed scripts
│   │   ├─── generate-migration.sh         # Generate new migration
│   │   └─── studio.sh                     # Open Drizzle Studio
│   │
│   ├─── build/
│   │   ├─── build-all.sh                  # Build all packages
│   │   ├─── build-web.sh                  # Build frontend
│   │   ├─── build-api.sh                  # Build backend
│   │   └─── build-shared.sh               # Build shared packages
│   │
│   ├─── deploy/
│   │   ├─── deploy-staging.sh             # Deploy to staging
│   │   ├─── deploy-production.sh          # Deploy to production
│   │   ├─── rollback.sh                   # Rollback last deployment
│   │   └─── health-check.sh              # Post-deploy health check
│   │
│   ├─── ci/
│   │   ├─── lint.sh                       # Run linters
│   │   ├─── typecheck.sh                  # Run type checking
│   │   ├─── test.sh                       # Run all tests
│   │   ├─── test-unit.sh                  # Unit tests only
│   │   ├─── test-integration.sh           # Integration tests only
│   │   └─── test-e2e.sh                   # E2E tests only
│   │
│   └─── utils/
│       ├─── generate-types.sh             # Generate shared types
│       ├─── clean.sh                      # Remove node_modules, dist, etc.
│       ├─── update-deps.sh                # Update all dependencies
│       └─── check-deps.sh                 # Check for unused/dead deps
│
├─── tests/                                # Top-level test infrastructure
│   │
│   ├─── e2e/                              # End-to-end tests (Playwright)
│   │   ├─── playwright.config.ts
│   │   ├─── fixtures/
│   │   │   ├─── auth.fixture.ts           # Auth helper (login as user)
│   │   │   ├─── database.fixture.ts       # DB reset between tests
│   │   │   ├─── test-data.fixture.ts      # Test data generator
│   │   │   └─── base.ts                   # Extended test fixtures
│   │   ├─── pages/                        # Page Object Models
│   │   │   ├─── login.page.ts
│   │   │   ├─── dashboard.page.ts
│   │   │   ├─── board.page.ts
│   │   │   ├─── workspace.page.ts
│   │   │   ├─── document.page.ts
│   │   │   └─── settings.page.ts
│   │   ├─── auth/
│   │   │   ├─── login.spec.ts
│   │   │   ├─── register.spec.ts
│   │   │   └─── password-reset.spec.ts
│   │   ├─── workspace/
│   │   │   ├─── create-workspace.spec.ts
│   │   │   ├─── invite-members.spec.ts
│   │   │   └─── workspace-settings.spec.ts
│   │   ├─── board/
│   │   │   ├─── create-board.spec.ts
│   │   │   ├─── drag-drop-card.spec.ts
│   │   │   ├─── board-filters.spec.ts
│   │   │   └─── board-views.spec.ts
│   │   ├─── document/
│   │   │   ├─── create-document.spec.ts
│   │   │   ├─── collaborative-editing.spec.ts
│   │   │   └─── document-permissions.spec.ts
│   │   ├─── ai/
│   │   │   ├─── ai-chat.spec.ts
│   │   │   ├─── ai-suggestions.spec.ts
│   │   │   └─── ai-summary.spec.ts
│   │   └─── visual/                       # Visual regression tests
│   │       ├─── __snapshots__/
│   │       ├─── landing.spec.ts
│   │       ├─── dashboard.spec.ts
│   │       └─── board.spec.ts
│   │
│   └─── fixtures/                         # Shared test fixtures
│       ├─── users.json                    # Test user data
│       ├─── workspaces.json               # Test workspace data
│       └─── boards.json                   # Test board data
│
├─── packages/                             # (continued from above)
│   │
│   └─── ai/                               # Python AI sidecar (also here)
│       └─── (see apps/ai/ for full tree — same structure)
│       # NOTE: If the AI sidecar is a workspace package,
│       # move it here. The apps/ location is for when it
│       # is a standalone deployable service.
│
├─── turbo.json                            # Turborepo pipeline config
├─── pnpm-workspace.yaml                   # pnpm workspace definition
├─── package.json                          # Root package.json
├─── tsconfig.json                         # Root TypeScript config (references)
├─── .prettierrc                           # Prettier config
├─── .prettierignore
├─── .eslintrc.cjs                         # Root ESLint config
├─── .eslintignore
├─── .gitignore
├─── .env.example                          # Environment variable template
├─── .env.local                            # Local overrides (gitignored)
├─── biome.json                            # Biome (optional: faster lint/format)
├─── lefthook.yml                          # Git hooks config (alternative to husky)
├─── renovate.json                         # Dependency update automation
├─── LICENSE
└─── README.md
```

---

## 3. Top-Level Directory Breakdown

| Directory         | Purpose                                      | Consumers                |
| ----------------- | -------------------------------------------- | ------------------------ |
| `.github/`        | CI/CD workflows, issue templates, CODEOWNERS | GitHub, developers       |
| `.husky/`         | Git hooks for commit validation              | Developer machines       |
| `apps/`           | Deployable application packages              | Turborepo, CI/CD         |
| `packages/`       | Shared, consumable workspace packages        | `apps/*`, other packages |
| `infrastructure/` | IaC for Cloudflare, Docker, K8s              | DevOps, CI/CD            |
| `scripts/`        | Operational shell scripts                    | Developers, CI/CD        |
| `tests/`          | Cross-package E2E tests                      | CI/CD, QA                |
| `docs/`           | Architecture docs, ADRs, guides              | All team members         |

---

## 4. Monorepo Root Layout

### Root `package.json`

```jsonc
{
  "name": "sprintio",
  "private": true,
  "packageManager": "pnpm@9.1.0",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "test:unit": "turbo test --filter='./packages/*'",
    "test:integration": "turbo test:integration",
    "test:e2e": "playwright test",
    "db:migrate": "pnpm --filter @sprintio/db migrate",
    "db:seed": "pnpm --filter @sprintio/db seed",
    "db:studio": "pnpm --filter @sprintio/db studio",
    "prepare": "husky",
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "husky": "^9.1.0",
    "lint-staged": "^15.2.0",
    "@commitlint/cli": "^19.4.0",
    "typescript": "^5.6.0",
  },
}
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'packages/config/*'
```

### `turbo.json`

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
    },
    "dev": {
      "cache": false,
      "persistent": true,
    },
    "lint": {
      "dependsOn": ["^build"],
    },
    "typecheck": {
      "dependsOn": ["^build"],
    },
    "test": {
      "dependsOn": ["build"],
    },
    "test:integration": {
      "dependsOn": ["build"],
      "env": ["DATABASE_URL", "REDIS_URL"],
    },
    "clean": {
      "cache": false,
    },
    "db:migrate": {
      "cache": false,
    },
  },
}
```

---

## 5. Frontend — `packages/web/`

### Architecture Pattern

```
Route File (page) → Components → Hooks → Services → API Client → Backend
                          ↓
                      Redux Store ← WebSocket Events
```

### Key Directories Explained

| Directory              | Role                                      | Rule                                                |
| ---------------------- | ----------------------------------------- | --------------------------------------------------- |
| `routes/`              | TanStack Router file-based routes         | One file per route; layouts use `_` prefix          |
| `components/ui/`       | 21st.dev / shadcn/ui primitives           | Install via 21st.dev marketplace                    |
| `components/layout/`   | App shell, sidebar, header                | Layout-specific; not reusable outside this app      |
| `components/<domain>/` | Domain components (board, document, etc.) | One directory per business domain                   |
| `hooks/`               | Custom React hooks                        | Max 1 hook per file; prefix with `use`              |
| `store/`               | Redux Toolkit slices                      | One slice per domain; use `redux-persist` sparingly |
| `services/`            | TanStack Query hooks wrapping API calls   | One service file per API resource                   |
| `lib/`                 | Utility wrappers, config, helpers         | No business logic; pure helpers only                |
| `types/`               | Frontend-specific types                   | Types that are NOT shared with backend              |

### File Patterns

```
routes/_dashboard.index.tsx        → Route components: kebab-case with route params
components/board/board-card.tsx    → Domain components: kebab-case, noun-first
hooks/use-board.ts                 → Hooks: camelCase, use- prefix
store/slices/boardSlice.ts         → Slices: camelCase, -Slice suffix
services/board.service.ts          → Services: kebab-case, .service.ts suffix
lib/query-client.ts               → Lib files: kebab-case, descriptive name
```

### Service Layer Pattern (`services/board.service.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Board, CreateBoardInput } from '@sprintio/shared';

export function useBoard(boardId: string) {
  return useQuery({
    queryKey: ['boards', boardId],
    queryFn: () => api.get<Board>(`/boards/${boardId}`).then((r) => r.data),
  });
}

export function useCreateBoard(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBoardInput) =>
      api.post<Board>(`/workspaces/${workspaceId}/boards`, input).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });
}
```

### Store Pattern (`store/slices/boardSlice.ts`)

```typescript
import { configureStore } from '@reduxjs/toolkit';
import sidebarReducer from './slices/sidebarSlice';
import boardReducer from './slices/boardSlice';

export const store = configureStore({
  reducer: {
    sidebar: sidebarReducer,
    board: boardReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

---

## 6. Backend — `packages/api/`

### Architecture Pattern

```
Request → Router → Controller → Service → Repository → Database
                  ↓                              ↑
            Middleware                   Cache (Redis)
                  ↓
            Validator (Zod)
```

### Package Layout

```
packages/api/
│
├── src/
│   │
│   ├── app.ts                             # Express app factory
│   ├── server.ts                           # HTTP server bootstrap
│   ├── config/
│   │   ├── index.ts
│   │   ├── env.ts                          # Zod-validated env vars
│   │   └── cors.ts
│   │
│   ├── modules/                            # Feature modules (domain-first)
│   │   ├── index.ts                        # Aggregated route registration
│   │   │
│   │   ├── auth/
│   │   │   ├── index.ts                    # Module barrel
│   │   │   ├── auth.routes.ts              # Route definitions
│   │   │   ├── auth.controller.ts          # Request handlers
│   │   │   ├── auth.service.ts             # Business logic
│   │   │   ├── auth.repository.ts          # Database queries
│   │   │   ├── auth.types.ts               # Module-specific types
│   │   │   └── auth.test.ts               # Co-located tests
│   │   │
│   │   ├── users/
│   │   │   ├── index.ts
│   │   │   ├── users.routes.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   ├── users.types.ts
│   │   │   └── users.test.ts
│   │   │
│   │   ├── workspaces/
│   │   │   ├── index.ts
│   │   │   ├── workspaces.routes.ts
│   │   │   ├── workspaces.controller.ts
│   │   │   ├── workspaces.service.ts
│   │   │   ├── workspaces.repository.ts
│   │   │   └── workspaces.types.ts
│   │   │
│   │   ├── boards/
│   │   │   ├── index.ts
│   │   │   ├── boards.routes.ts
│   │   │   ├── boards.controller.ts
│   │   │   ├── boards.service.ts
│   │   │   ├── boards.repository.ts
│   │   │   ├── boards.types.ts
│   │   │   ├── boards.events.ts           # Socket event handlers
│   │   │   └── boards.permissions.ts      # Permission checks
│   │   │
│   │   ├── cards/
│   │   │   ├── index.ts
│   │   │   ├── cards.routes.ts
│   │   │   ├── cards.controller.ts
│   │   │   ├── cards.service.ts
│   │   │   ├── cards.repository.ts
│   │   │   └── cards.types.ts
│   │   │
│   │   ├── tasks/
│   │   │   ├── index.ts
│   │   │   ├── tasks.routes.ts
│   │   │   ├── tasks.controller.ts
│   │   │   ├── tasks.service.ts
│   │   │   ├── tasks.repository.ts
│   │   │   └── tasks.types.ts
│   │   │
│   │   ├── documents/
│   │   │   ├── index.ts
│   │   │   ├── documents.routes.ts
│   │   │   ├── documents.controller.ts
│   │   │   ├── documents.service.ts
│   │   │   ├── documents.repository.ts
│   │   │   └── documents.types.ts
│   │   │
│   │   ├── projects/
│   │   │   ├── index.ts
│   │   │   ├── projects.routes.ts
│   │   │   ├── projects.controller.ts
│   │   │   ├── projects.service.ts
│   │   │   ├── projects.repository.ts
│   │   │   └── projects.types.ts
│   │   │
│   │   ├── notifications/
│   │   │   ├── index.ts
│   │   │   ├── notifications.routes.ts
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   ├── notifications.repository.ts
│   │   │   ├── notifications.events.ts
│   │   │   └── notifications.types.ts
│   │   │
│   │   ├── billing/
│   │   │   ├── index.ts
│   │   │   ├── billing.routes.ts
│   │   │   ├── billing.controller.ts
│   │   │   ├── billing.service.ts
│   │   │   ├── billing.repository.ts
│   │   │   └── billing.types.ts
│   │   │
│   │   ├── ai/
│   │   │   ├── index.ts
│   │   │   ├── ai.routes.ts
│   │   │   ├── ai.controller.ts
│   │   │   ├── ai.service.ts              # Proxy to Python sidecar
│   │   │   ├── ai.types.ts
│   │   │   └── ai.events.ts
│   │   │
│   │   ├── integrations/
│   │   │   ├── index.ts
│   │   │   ├── integrations.routes.ts
│   │   │   ├── integrations.controller.ts
│   │   │   ├── integrations.service.ts
│   │   │   └── integrations.types.ts
│   │   │
│   │   └── uploads/
│   │       ├── index.ts
│   │       ├── uploads.routes.ts
│   │       ├── uploads.controller.ts      # Presigned R2 URLs
│   │       └── uploads.types.ts
│   │
│   ├── middleware/
│   │   ├── index.ts
│   │   ├── auth.middleware.ts              # JWT verification
│   │   ├── workspace.middleware.ts         # Workspace context
│   │   ├── permission.middleware.ts        # RBAC enforcement
│   │   ├── validate.middleware.ts          # Zod schema validation
│   │   ├── rate-limit.middleware.ts        # Rate limiting (Redis)
│   │   ├── cors.middleware.ts             # CORS configuration
│   │   ├── logger.middleware.ts           # Request logging
│   │   ├── error-handler.middleware.ts    # Global error handler
│   │   └── request-id.middleware.ts       # Unique request ID
│   │
│   ├── queues/                             # BullMQ job definitions
│   │   ├── index.ts
│   │   ├── email.queue.ts                 # Email sending jobs
│   │   ├── notification.queue.ts          # Push notification jobs
│   │   ├── ai-analysis.queue.ts           # Async AI processing
│   │   ├── document-export.queue.ts       # Document export jobs
│   │   ├── cleanup.queue.ts              # Cron-like cleanup jobs
│   │   └── webhook-queue.ts              # Outgoing webhook dispatch
│   │
│   ├── workers/                            # BullMQ worker processors
│   │   ├── index.ts
│   │   ├── email.worker.ts
│   │   ├── notification.worker.ts
│   │   ├── ai-analysis.worker.ts
│   │   ├── document-export.worker.ts
│   │   └── cleanup.worker.ts
│   │
│   ├── websocket/
│   │   ├── index.ts                        # WebSocket server setup
│   │   ├── ws-auth.ts                      # WS authentication
│   │   ├── ws-router.ts                    # Event routing
│   │   ├── events/                         # WebSocket event handlers
│   │   │   ├── board.events.ts
│   │   │   ├── document.events.ts
│   │   │   ├── notification.events.ts
│   │   │   └── presence.events.ts
│   │   └── yjs/                            # Yjs server integration
│   │       ├── yjs-server.ts              # Y-WebSocket server
│   │       ├── yjs-sync.ts                # Document sync
│   │       └── yjs-awareness.ts           # Awareness (cursors)
│   │
│   ├── lib/
│   │   ├── index.ts
│   │   ├── redis.ts                        # Redis client
│   │   ├── r2.ts                           # Cloudflare R2 client
│   │   ├── mailer.ts                       # Email client (Resend/SES)
│   │   ├── pdf.ts                          # PDF generation
│   │   ├── export.ts                       # Data export utilities
│   │   └── logger.ts                       # Pino logger config
│   │
│   └── types/
│       ├── index.ts
│       ├── express.d.ts                    # Express type augmentations
│       └── env.d.ts                        # Process.env types
│
├── tsconfig.json
├── drizzle.config.ts                       # Points to packages/db
└── package.json
```

### Module Pattern — Controller Example

```typescript
// modules/boards/boards.controller.ts
import { Request, Response, NextFunction } from 'express';
import { boardsService } from './boards.service';
import { CreateBoardSchema, UpdateBoardSchema } from '@sprintio/shared';

export class BoardsController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = CreateBoardSchema.parse(req.body);
      const board = await boardsService.create(input, req.user.id);
      res.status(201).json({ data: board });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const board = await boardsService.getById(req.params.boardId, req.user.id);
      if (!board) {
        return res.status(404).json({ error: 'Board not found' });
      }
      res.json({ data: board });
    } catch (error) {
      next(error);
    }
  }

  // ... update, delete, list, etc.
}
```

### Module Pattern — Repository Example

```typescript
// modules/boards/boards.repository.ts
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@sprintio/db';
import { boards, columns, cards } from '@sprintio/db/schema';

export const boardsRepository = {
  async findById(id: string) {
    return db.query.boards.findFirst({
      where: eq(boards.id, id),
      with: {
        columns: { orderBy: asc(columns.position) },
      },
    });
  },

  async findManyByWorkspace(workspaceId: string, limit: number, offset: number) {
    return db.query.boards.findMany({
      where: eq(boards.workspaceId, workspaceId),
      orderBy: desc(boards.createdAt),
      limit,
      offset,
    });
  },

  async create(data: typeof boards.$inferInsert) {
    return db.insert(boards).values(data).returning();
  },

  // ...
};
```

---

## 7. Shared — `packages/shared/`

### Package Purpose

The **single source of truth** for types, schemas, and utilities shared between frontend, backend, and AI sidecar (via type stubs).

### Key Principles

1. **Zod schemas** define the canonical shape; TypeScript types are **derived** from them
2. **No side effects** — this package is pure data definitions
3. **Tree-shakeable** — every export path is granular

### Schema-First Pattern

```typescript
// packages/shared/src/schemas/task.ts
import { z } from 'zod';

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  priority: z.enum(['none', 'low', 'medium', 'high', 'urgent']).default('none'),
  dueDate: z.string().datetime().optional(),
  labels: z.array(z.string().uuid()).optional(),
  sprintId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().optional(),
  position: z.number().optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = CreateTaskSchema.partial();
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

// packages/shared/src/types/task.ts
import { type CreateTaskInput, type UpdateTaskInput } from '../schemas/task';

// Full task type (what comes back from API)
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
  priority: 'none' | 'low' | 'medium' | 'high' | 'urgent';
  assigneeId: string | null;
  boardId: string;
  columnId: string;
  sprintId: string | null;
  position: number;
  labels: string[];
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// Re-export schemas and input types for convenience
export { CreateTaskSchema, UpdateTaskSchema };
export type { CreateTaskInput, UpdateTaskInput };
```

### Error Classes

```typescript
// packages/shared/src/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static notFound(resource: string) {
    return new AppError('NOT_FOUND', `${resource} not found`, 404);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'Insufficient permissions') {
    return new AppError('FORBIDDEN', message, 403);
  }

  static validation(details: Record<string, unknown>) {
    return new AppError('VALIDATION_ERROR', 'Validation failed', 422, details);
  }
}
```

---

## 8. Database — `packages/db/`

### Schema Organization

Each schema file maps to **one database table** and contains:

- Table definition (`pgTable`)
- Column types and constraints
- Indexes
- Relations (in `relations.ts`)

### Connection Pattern

```typescript
// packages/db/src/connection.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });

// Graceful shutdown
process.on('SIGTERM', () => pool.end());
```

### Migration Workflow

```bash
# Generate migration from schema changes
pnpm db generate-migration

# Apply pending migrations
pnpm db migrate

# Reset database (drop + recreate + migrate + seed)
pnpm db migrate-fresh

# Open Drizzle Studio
pnpm db studio
```

---

## 9. AI Sidecar — `apps/ai/`

### Why `apps/` not `packages/`

The AI sidecar is a **standalone Python FastAPI service** — it runs as its own process, has its own runtime (Python 3.12+), and is deployed independently. It belongs in `apps/`.

### Directory Rationale

| Directory         | Purpose                                            |
| ----------------- | -------------------------------------------------- |
| `app/core/`       | Config, security, DI — the infrastructure layer    |
| `app/routers/`    | HTTP endpoint handlers — thin controllers          |
| `app/services/`   | Business logic — LLM calls, RAG, prompt management |
| `app/models/`     | Pydantic schemas (request/response validation)     |
| `app/storage/`    | Vector DB, Redis cache access                      |
| `app/middleware/` | Cross-cutting: logging, rate limiting, errors      |
| `prompts/`        | Jinja2 templates — externalized from code          |

### Inter-Service Communication

```
Frontend ──HTTP──→ Node.js API ──HTTP/Queue──→ Python AI Sidecar
                                    ↑
                            BullMQ Job Queue (Redis)

Node.js API ──gRPC/WebSocket──→ Yjs Durable Object
```

### Prompt Management Pattern

```python
# app/services/prompts.py
from jinja2 import Environment, FileSystemLoader

env = Environment(loader=FileSystemLoader("prompts/"))

def render_prompt(template_name: str, **kwargs) -> str:
    template = env.get_template(f"{template_name}.jinja2")
    return template.render(**kwargs)

# Usage
system_prompt = render_prompt("system", user_name="Alice", workspace="Acme")
```

---

## 10. Config — `packages/config/`

### Why Separate Config Packages

1. **Reusability** — Each config can be consumed independently
2. **Versioning** — Config changes are tracked in the monorepo
3. **Consistency** — One source of truth for linting, types, styling

### Package Naming Convention

```
@sprintio/eslint-config    → packages/config/eslint-config/
@sprintio/tsconfig         → packages/config/tsconfig/
@sprintio/tailwind-config  → packages/config/tailwind-config/
@sprintio/vite-config      → packages/config/vite-config/
@sprintio/turbo            → packages/config/turbo/
```

### TypeScript Config Inheritance

```jsonc
// packages/config/tsconfig/base.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}

// packages/config/tsconfig/react.json
{
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "module": "ESNext",
    "target": "ES2022",
    "noEmit": true
  }
}

// packages/config/tsconfig/node.json
{
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "module": "NodeNext",
    "target": "ES2022",
    "moduleResolution": "NodeNext"
  }
}
```

---

## 11. Infrastructure — `infrastructure/`

### Cloudflare-First Architecture

```
Cloudflare Pages       → Static frontend hosting
Cloudflare Workers     → API server (or origin server via tunnel)
PostgreSQL 16         → Primary relational database (with TimescaleDB + pgvector extensions)
Cloudflare R2          → Object storage (files, uploads)
Cloudflare KV          → Key-value cache (sessions, rate limits)
Cloudflare Durable Objects → Real-time WebSocket coordination (Yjs)
Cloudflare AI Gateway  → LLM API proxy (rate limit, cache, logs)
Cloudflare Access      → Zero-trust authentication for admin
Cloudflare Tunnel      → Expose local/origin servers
```

### Docker Compose (Local Development)

```yaml
# infrastructure/docker/docker-compose.yml
services:
  api:
    build:
      context: ../..
      dockerfile: infrastructure/docker/api.Dockerfile
    ports:
      - '3001:3001'
    environment:
      - DATABASE_URL=postgresql://sprintio:sprintio@db:5432/sprintio
      - REDIS_URL=redis://redis:6379
      - AI_SIDECAR_URL=http://ai:8000
    volumes:
      - ../../packages:/app/packages
    depends_on:
      - db
      - redis

  ai:
    build:
      context: ../..
      dockerfile: infrastructure/docker/ai.Dockerfile
    ports:
      - '8000:8000'
    environment:
      - DATABASE_URL=postgresql://sprintio:sprintio@db:5432/sprintio
      - REDIS_URL=redis://redis:6379
    volumes:
      - ../../apps/ai:/app

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

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

volumes:
  pgdata:
```

### K8s Note

Kubernetes manifests are included for **self-hosted** deployments. The primary deployment target is Cloudflare's edge infrastructure; K8s serves as an alternative.

---

## 12. Scripts — `scripts/`

### Script Naming Convention

```
scripts/<category>/<action>.sh
```

| Category  | Purpose                     |
| --------- | --------------------------- |
| `dev/`    | Local development lifecycle |
| `db/`     | Database operations         |
| `build/`  | Build pipeline              |
| `deploy/` | Deployment operations       |
| `ci/`     | CI-specific commands        |
| `utils/`  | Miscellaneous utilities     |

### Script Requirements

1. **All scripts** start with `#!/usr/bin/env bash` and `set -euo pipefail`
2. **All scripts** are executable (`chmod +x`)
3. **All scripts** support `--help` flag
4. **All scripts** use `pnpm` as the package manager
5. **All scripts** output colored status messages to stdout

---

## 13. Testing Structure

### Test Pyramid

```
          ┌─────────┐
          │  E2E    │        Slow, expensive, high confidence
         ┌┴─────────┴┐
         │Integration │     Medium speed, tests real I/O
        ┌┴─────────────┴┐
        │    Unit Tests   │  Fast, isolated, high volume
        └─────────────────┘
```

### Test File Locations

| Test Type             | Location                                    | Runner     | Naming                            |
| --------------------- | ------------------------------------------- | ---------- | --------------------------------- |
| **Unit (frontend)**   | `apps/web/src/**/*.test.tsx`                | Vitest     | `component-name.test.tsx`         |
| **Unit (backend)**    | `packages/api/src/**/*.test.ts`             | Vitest     | `module-name.test.ts`             |
| **Unit (shared)**     | `packages/shared/src/**/*.test.ts`          | Vitest     | `util-name.test.ts`               |
| **Unit (AI)**         | `apps/ai/tests/*.py`                        | pytest     | `test_feature_name.py`            |
| **Integration (API)** | `packages/api/src/**/*.integration.test.ts` | Vitest     | `module-name.integration.test.ts` |
| **Integration (DB)**  | `packages/db/src/**/*.integration.test.ts`  | Vitest     | `schema-name.integration.test.ts` |
| **E2E (Web)**         | `tests/e2e/**/*.spec.ts`                    | Playwright | `feature-name.spec.ts`            |
| **Visual Regression** | `tests/e2e/visual/**/*.spec.ts`             | Playwright | `page-name.spec.ts`               |

### Vitest Config (API)

```typescript
// packages/api/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/types/**'],
    },
    setupFiles: ['./tests/setup.ts'],
  },
});
```

### Test Fixture Pattern

```typescript
// packages/api/tests/fixtures/users.ts
import { db } from '@sprintio/db';
import { users } from '@sprintio/db/schema';

export async function createTestUser(overrides?: Partial<typeof users.$inferInsert>) {
  const user = {
    id: crypto.randomUUID(),
    email: `test-${Date.now()}@sprintio.dev`,
    name: 'Test User',
    passwordHash: 'hashed_password_placeholder',
    ...overrides,
  };
  await db.insert(users).values(user);
  return user;
}

export async function cleanupTestData() {
  // Truncate in correct order (respect FKs)
  await db.execute(/* ... */);
}
```

---

## 14. Naming Conventions

### Files & Directories

| Category              | Convention                            | Example                                    |
| --------------------- | ------------------------------------- | ------------------------------------------ |
| **Directories**       | kebab-case                            | `board-components/`, `auth-middleware/`    |
| **React components**  | kebab-case, noun-first                | `board-card.tsx`, `workspace-switcher.tsx` |
| **React hooks**       | camelCase, `use-` prefix              | `use-auth.ts`, `use-debounce.ts`           |
| **Stores**            | camelCase, `-Slice` suffix            | `authSlice.ts`, `boardSlice.ts`            |
| **Services (FE)**     | kebab-case, `.service.ts`             | `board.service.ts`                         |
| **Routes (FE)**       | TanStack file routing convention      | `_dashboard.settings.tsx`                  |
| **Modules (BE)**      | kebab-case, plural noun               | `boards/`, `workspaces/`, `cards/`         |
| **Controllers (BE)**  | kebab-case, `.controller.ts`          | `boards.controller.ts`                     |
| **Services (BE)**     | kebab-case, `.service.ts`             | `boards.service.ts`                        |
| **Repositories (BE)** | kebab-case, `.repository.ts`          | `boards.repository.ts`                     |
| **Middleware (BE)**   | kebab-case, `.middleware.ts`          | `auth.middleware.ts`                       |
| **Schemas (shared)**  | kebab-case, `.schema.ts` pattern      | `schemas/task.ts`                          |
| **Types (shared)**    | kebab-case, `.ts`                     | `types/task.ts`                            |
| **Constants**         | kebab-case, `.ts`                     | `constants/roles.ts`                       |
| **Errors**            | kebab-case, `-error.ts`               | `app-error.ts`, `auth-error.ts`            |
| **Python files**      | snake_case                            | `queue_handlers.py`, `vector_store.py`     |
| **Test files**        | `*.test.ts` (unit), `*.spec.ts` (e2e) | `boards.test.ts`, `login.spec.ts`          |
| **Config files**      | lowercase, no prefix                  | `vite.config.ts`, `tailwind.config.ts`     |
| **Shell scripts**     | kebab-case                            | `start-all.sh`, `deploy-staging.sh`        |

### Variables & Functions

| Category                  | Convention                  | Example                                 |
| ------------------------- | --------------------------- | --------------------------------------- |
| **Variables**             | camelCase                   | `boardId`, `isActive`, `userProfile`    |
| **Functions**             | camelCase                   | `createBoard()`, `fetchUserData()`      |
| **React components**      | PascalCase                  | `BoardCard`, `WorkspaceSwitcher`        |
| **Zod schemas**           | PascalCase, `Schema` suffix | `CreateBoardSchema`, `UpdateTaskSchema` |
| **TypeScript types**      | PascalCase                  | `Board`, `CreateTaskInput`, `UserRole`  |
| **Interfaces**            | PascalCase, no `I` prefix   | `Board`, `UserPreferences`              |
| **Enums**                 | PascalCase                  | `UserRole`, `TaskPriority`              |
| **Constants**             | UPPER_SNAKE_CASE            | `MAX_FILE_SIZE`, `DEFAULT_PAGE_SIZE`    |
| **Database tables**       | snake_case, plural          | `board_columns`, `workspace_members`    |
| **Database columns**      | snake_case                  | `created_at`, `workspace_id`            |
| **Env vars**              | UPPER_SNAKE_CASE            | `DATABASE_URL`, `REDIS_URL`             |
| **CSS classes**           | Tailwind utility classes    | `flex`, `items-center`, `gap-2`         |
| **CSS custom properties** | `--` prefix, kebab-case     | `--color-primary`, `--spacing-md`       |

### Import Ordering

```typescript
// 1. Node built-ins
import { randomUUID } from 'node:crypto';

// 2. External packages
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// 3. Internal workspace packages (with alias)
import { db } from '@sprintio/db';
import { AppError, CreateBoardSchema } from '@sprintio/shared';

// 4. Relative imports (within same package)
import { authMiddleware } from '../middleware/auth.middleware';
import type { BoardsController } from './boards.controller';
```

---

## 15. Import Alias Configuration

### Frontend (Vite + TypeScript)

```typescript
// apps/web/tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@store/*": ["./src/store/*"],
      "@lib/*": ["./src/lib/*"],
      "@services/*": ["./src/services/*"],
      "@routes/*": ["./src/routes/*"]
    }
  }
}

// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
});
```

### Backend (TypeScript + Node)

```typescript
// packages/api/tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@modules/*": ["./src/modules/*"],
      "@middleware/*": ["./src/middleware/*"],
      "@queues/*": ["./src/queues/*"],
      "@lib/*": ["./src/lib/*"]
    }
  }
}
```

### Workspace Package Aliases

```typescript
// Consumed via package.json workspace protocol
// packages/api/package.json
{
  "dependencies": {
    "@sprintio/shared": "workspace:*",
    "@sprintio/db": "workspace:*"
  }
}

// apps/web/package.json
{
  "dependencies": {
    "@sprintio/shared": "workspace:*"
  }
}
```

### Alias Summary Table

| Alias              | Resolves To            | Available In            |
| ------------------ | ---------------------- | ----------------------- |
| `@sprintio/shared` | `packages/shared/src/` | All packages            |
| `@sprintio/db`     | `packages/db/src/`     | Backend, AI (via types) |
| `@/*`              | `src/*` (app-specific) | Frontend, Backend       |
| `@components/*`    | `src/components/*`     | Frontend                |
| `@hooks/*`         | `src/hooks/*`          | Frontend                |
| `@store/*`         | `src/store/*`          | Frontend                |
| `@services/*`      | `src/services/*`       | Frontend                |
| `@modules/*`       | `src/modules/*`        | Backend                 |
| `@middleware/*`    | `src/middleware/*`     | Backend                 |

---

## 16. Quick Reference Cheat Sheet

### Package Names

| Package           | npm Name                    | Path                               |
| ----------------- | --------------------------- | ---------------------------------- |
| Web (Frontend)    | `@sprintio/web`             | `apps/web/`                        |
| API (Backend)     | `@sprintio/api`             | `packages/api/`                    |
| AI Sidecar        | `@sprintio/ai`              | `apps/ai/`                         |
| Shared            | `@sprintio/shared`          | `packages/shared/`                 |
| Database          | `@sprintio/db`              | `packages/db/`                     |
| ESLint Config     | `@sprintio/eslint-config`   | `packages/config/eslint-config/`   |
| TypeScript Config | `@sprintio/tsconfig`        | `packages/config/tsconfig/`        |
| Tailwind Config   | `@sprintio/tailwind-config` | `packages/config/tailwind-config/` |
| Vite Config       | `@sprintio/vite-config`     | `packages/config/vite-config/`     |
| Turbo Config      | `@sprintio/turbo`           | `packages/config/turbo/`           |

### Directory Purpose Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                        sprintio/                                 │
├─────────────────────────────────────────────────────────────────┤
│  apps/           │ Deployable services                          │
│    web/          │ React + Vite frontend                        │
│    ai/           │ Python FastAPI AI sidecar                    │
├─────────────────────────────────────────────────────────────────┤
│  packages/       │ Shared workspace packages                    │
│    shared/       │ Types, schemas, constants, utils             │
│    db/           │ Drizzle schema, migrations, seeds            │
│    config/       │ ESLint, TS, Tailwind, Vite, Turbo           │
├─────────────────────────────────────────────────────────────────┤
│  infrastructure/ │ Infrastructure as Code                       │
│    terraform/    │ Cloudflare provider configs                  │
│    docker/       │ Dockerfiles + Compose                        │
│    k8s/          │ Kubernetes manifests (self-host)             │
├─────────────────────────────────────────────────────────────────┤
│  scripts/        │ Operational shell scripts                    │
│    dev/          │ Local dev lifecycle                           │
│    db/           │ Database operations                          │
│    build/        │ Build commands                               │
│    deploy/       │ Deployment commands                          │
│    ci/           │ CI-specific commands                         │
├─────────────────────────────────────────────────────────────────┤
│  tests/          │ Cross-package tests                          │
│    e2e/          │ Playwright E2E tests                         │
│    fixtures/     │ Shared test data                             │
├─────────────────────────────────────────────────────────────────┤
│  docs/           │ Documentation                                │
│    architecture/ │ Architecture decision records                │
│    api/          │ API documentation                            │
│    guides/       │ Developer guides                             │
└─────────────────────────────────────────────────────────────────┘
```

### New File Checklist

```
✓ Is the file in the right package?     → apps/ for services, packages/ for libraries
✓ Is the name kebab-case?               → my-component.tsx (not MyComponent.tsx)
✓ Does it have a barrel export?          → Add export to nearest index.ts
✓ Are types imported from @sprintio/shared? → Never redefine shared types
✓ Is validation via Zod schemas?         → Derive TS types from schemas
✓ Is there a co-located test?            → Same dir, same name + .test.ts suffix
✓ Are imports ordered correctly?         → Builtins → External → Internal → Relative
```

### Tech Stack at a Glance

```
Frontend:    React 18 | TypeScript | Vite | TanStack Router/Query | Redux Toolkit | Tailwind CSS
Backend:     Node.js 20 | Express.js | TypeScript | Drizzle ORM | BullMQ
Database:    PostgreSQL 16 | Redis 7 | Drizzle migrations
AI:          Python 3.12 | FastAPI | Pydantic | Jinja2 | pgvector
Real-time:   Yjs | WebSocket (ws) | Durable Objects
Storage:     Cloudflare R2
Cloud:       Cloudflare Workers | Pages | R2 | KV | AI Gateway | Access
Monorepo:    pnpm workspaces | Turborepo
Testing:     Vitest | Playwright | pytest
CI/CD:       GitHub Actions
IaC:         Terraform (Cloudflare provider) | Docker Compose | K8s (optional)
Linting:     ESLint | Prettier | Biome (optional)
```

---

_Document Version: 1.0 | Last Updated: July 2026_
_Architecture: Sprintio — AI-Enhanced Collaborative Work Management Platform_
