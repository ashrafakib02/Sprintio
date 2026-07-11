# 10 — CI/CD Architecture

> **Sprintio** — AI-Enhanced Collaborative Work Management Platform

```
Version : 1.0
Date    : 2026-07-09
Status  : DRAFT
```

---

## Table of Contents

1. [Pipeline Overview](#1-pipeline-overview)
2. [Branch Strategy](#2-branch-strategy)
3. [PR Pipeline](#3-pr-pipeline)
4. [Main Pipeline](#4-main-pipeline)
5. [Release Pipeline](#5-release-pipeline)
6. [Turborepo Integration](#6-turborepo-integration)
7. [Test Strategy](#7-test-strategy)
8. [Build Strategy](#8-build-strategy)
9. [Deploy Strategy](#9-deploy-strategy)
10. [Database Migrations](#10-database-migrations)
11. [Secrets Management](#11-secrets-management)
12. [Monitoring & Rollback](#12-monitoring--rollback)
13. [Quick Reference Cheat Sheet](#13-quick-reference-cheat-sheet)

---

## 1. Pipeline Overview

### 1.1 High-Level Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Sprintio CI/CD PIPELINES                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PR Pipeline          Main Pipeline          Release Pipeline               │
│  ───────────          ─────────────          ────────────────               │
│  ┌──────────┐         ┌──────────────┐       ┌──────────────────┐          │
│  │  Lint &  │         │  Full Lint & │       │  Version Bump    │          │
│  │ TypeCheck│         │  TypeCheck   │       │  Changelog Gen   │          │
│  └────┬─────┘         └──────┬───────┘       └────────┬─────────┘          │
│       │                      │                        │                     │
│  ┌────▼─────┐         ┌──────▼───────┐       ┌───────▼─────────┐          │
│  │  Unit    │         │  Unit + Int  │       │  Full Test Suite │          │
│  │  Tests   │         │  Tests       │       │  + E2E Tests     │          │
│  └────┬─────┘         └──────┬───────┘       └───────┬─────────┘          │
│       │                      │                        │                     │
│  ┌────▼─────┐         ┌──────▼───────┐       ┌───────▼─────────┐          │
│  │  Build   │         │  Build +     │       │  Build All       │          │
│  │  (cached)│         │  Migrations  │       │  Docker + Deploy │          │
│  └────┬─────┘         └──────┬───────┘       └───────┬─────────┘          │
│       │                      │                        │                     │
│  ┌────▼─────┐         ┌──────▼───────┐       ┌───────▼─────────┐          │
│  │   Gate   │         │  Deploy to   │       │  Deploy to       │          │
│  │  (merge) │         │  Staging     │       │  Production      │          │
│  └──────────┘         └──────┬───────┘       └───────┬─────────┘          │
│                              │                        │                     │
│                       ┌──────▼───────┐       ┌───────▼─────────┐          │
│                       │  E2E Tests   │       │  Health Check   │          │
│                       │  on Staging  │       │  + Smoke Tests  │          │
│                       └──────────────┘       └─────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Pipeline Trigger Matrix

```
┌─────────────────────┬──────────┬───────────┬──────────┬───────────┬──────────┐
│ Action              │ PR       │ Push Main │ Push Dev │ Tag Push  │ Manual   │
├─────────────────────┼──────────┼───────────┼──────────┼───────────┼──────────┤
│ Lint & TypeCheck    │   ✓      │    ✓      │    ✓     │    ✓      │    ✓     │
│ Unit Tests          │   ✓      │    ✓      │    ✓     │    ✓      │    ✓     │
│ Integration Tests   │   —      │    ✓      │    ✓     │    ✓      │    ✓     │
│ E2E Tests           │   —      │    ✓      │    ✓*    │    ✓      │    ✓     │
│ Build               │   ✓      │    ✓      │    ✓     │    ✓      │    ✓     │
│ DB Migrations       │   —      │    ✓      │    ✓     │    ✓      │    ✓     │
│ Deploy Staging      │   —      │    ✓      │    ✓     │    —      │    ✓     │
│ Deploy Production   │   —      │    —      │    —     │    ✓      │    ✓     │
│ Docker Build        │   —      │    ✓      │    ✓     │    ✓      │    ✓     │
│ Changelog           │   —      │    —      │    —     │    ✓      │    ✓     │
│ Version Bump        │   —      │    —      │    —     │    ✓      │    ✓     │
│ Deploy Notify       │   —      │    ✓      │    ✓     │    ✓      │    ✓     │
└─────────────────────┴──────────┴───────────┴──────────┴───────────┴──────────┘
  * E2E on develop: only when changed paths include frontend/* or backend/*
```

### 1.3 Monorepo Package Structure

```
sprintio/
├── apps/
│   ├── web/                  # React 18 + Vite frontend
│   ├── api/                  # Node.js + Express backend
│   ├── ai-sidecar/           # Python FastAPI service
│   └── e2e/                  # Playwright E2E tests
├── packages/
│   ├── ui/                   # Shared UI component library
│   ├── db/                   # Drizzle ORM + migrations
│   ├── shared/               # Shared types, utilities
│   ├── config/               # Shared configs (ESLint, TS)
│   └── eslint-config/        # ESLint configuration
├── infra/
│   ├── docker/               # Dockerfiles
│   ├── workers/              # Cloudflare Worker configs
│   └── pages/                # Cloudflare Pages configs
├── turbo.json                # Turborepo pipeline config
├── package.json              # Root package.json
├── pnpm-workspace.yaml       # pnpm workspace
└── .github/
    └── workflows/
        ├── ci-pr.yml         # PR pipeline
        ├── ci-main.yml       # Main branch pipeline
        ├── ci-release.yml    # Release pipeline
        └── ci-docker.yml     # Docker build pipeline
```

---

## 2. Branch Strategy

### 2.1 Branch Flow Diagram

```
  production (stable releases)
       ▲
       │ merge + tag
       │
  main ◄──────────────────────────────────────────────────────┐
       ▲                                                      │
       │ merge (after staging validation)                     │
       │                                                      │
  staging                                                    manual
       ▲                                                      │
       │ auto-deploy on push                                  │
       │                                                      │
  develop ◄───────────────────────────────────────────────────┘
       ▲
       │ merge PRs
       │
  feature/*  fix/*  chore/*  docs/*
       ▲
       │ create from develop
       │

  release/1.x.0 ───────────────────────────► production
       ▲                                          │
       │ branched from develop                    │
       │                                          │
       └────────── hotfix/* ─────────────────────┘
                      (emergency fixes)
```

### 2.2 Branch Naming Conventions

```
┌────────────────────┬───────────────────────────────────┬──────────────────────┐
│ Type               │ Pattern                           │ Example              │
├────────────────────┼───────────────────────────────────┼──────────────────────┤
│ Feature            │ feature/<ticket>-<slug>           │ feature/SPR-142-kanban│
│ Bug Fix            │ fix/<ticket>-<slug>               │ fix/SPR-87-auth-token │
│ Hotfix             │ hotfix/<ticket>-<slug>            │ hotfix/SPR-201-crash │
│ Chore              │ chore/<description>               │ chore/update-deps     │
│ Docs               │ docs/<description>                │ docs/api-reference    │
│ Refactor           │ refactor/<description>            │ refactor/auth-module  │
│ Release            │ release/<version>                 │ release/1.5.0         │
│ Dependency Update  │ deps/<package>                    │ deps/turborepo-2.0    │
└────────────────────┴───────────────────────────────────┴──────────────────────┘
```

### 2.3 Branch Protection Rules

```yaml
# .github/rules/main.yml — Branch protection configuration

branch_protection:
  main:
    required_reviews: 2
    dismiss_stale_reviews: true
    require_code_owner_reviews: true
    required_status_checks:
      - 'lint-typecheck'
      - 'unit-tests'
      - 'build'
      - 'integration-tests'
    enforce_admins: false
    restrictions: null

  staging:
    required_reviews: 1
    dismiss_stale_reviews: true
    required_status_checks:
      - 'lint-typecheck'
      - 'unit-tests'
      - 'integration-tests'
      - 'e2e-tests'
      - 'build'
```

---

## 3. PR Pipeline

### 3.1 PR Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      PR PIPELINE (Fast Feedback)                │
│                                                                 │
│  PR Opened / Updated                                           │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Detect     │    │  Turbo      │    │  Run        │         │
│  │  Affected   │───►│  Filter     │───►│  Parallel   │         │
│  │  Packages   │    │  Tasks      │    │  Jobs       │         │
│  └─────────────┘    └─────────────┘    └──────┬──────┘         │
│                                               │                 │
│                              ┌─────────────────┼─────────────┐  │
│                              │                 │             │  │
│                              ▼                 ▼             ▼  │
│                        ┌──────────┐    ┌──────────┐  ┌────────┐│
│                        │ Lint &   │    │  Unit    │  │ Build  ││
│                        │ TypeCheck│    │  Tests   │  │ Check  ││
│                        └────┬─────┘    └────┬─────┘  └───┬────┘│
│                             │               │            │     │
│                             └───────┬───────┘            │     │
│                                     │                    │     │
│                                     ▼                    │     │
│                              ┌──────────┐                │     │
│                              │ Coverage │◄───────────────┘     │
│                              │ Report   │                     │
│                              └────┬─────┘                     │
│                                   │                           │
│                                   ▼                           │
│                              ┌──────────┐                     │
│                              │  Gate    │                     │
│                              │  Pass ✓  │                     │
│                              └──────────┘                     │
│                                                               │
│  Target: < 5 minutes                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 PR Pipeline — GitHub Actions

```yaml
# .github/workflows/ci-pr.yml

name: 'CI — Pull Request'

on:
  pull_request:
    branches: [main, develop]
    types: [opened, synchronize, reopened]

concurrency:
  group: pr-${{ github.event.pull_request.number }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9'
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

jobs:
  # ─── Stage 1: Detect What Changed ────────────────────────────
  changes:
    name: 'Detect Changes'
    runs-on: ubuntu-latest
    outputs:
      web: ${{ steps.filter.outputs.web }}
      api: ${{ steps.filter.outputs.api }}
      db: ${{ steps.filter.outputs.db }}
      packages: ${{ steps.filter.outputs.packages }}
      ai: ${{ steps.filter.outputs.ai }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web:
              - 'apps/web/**'
              - 'packages/ui/**'
              - 'packages/shared/**'
            api:
              - 'apps/api/**'
              - 'packages/shared/**'
              - 'packages/config/**'
            db:
              - 'packages/db/**'
            packages:
              - 'packages/**'
            ai:
              - 'apps/ai-sidecar/**'

  # ─── Stage 2: Lint & Type Check (Parallel) ──────────────────
  lint:
    name: 'Lint & TypeCheck'
    needs: changes
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Turbo cache restore
        uses: actions/cache@v4
        with:
          path: .turbo
          key: lint-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ github.sha }}
          restore-keys: |
            lint-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}-
            lint-${{ runner.os }}-

      - name: ESLint
        run: pnpm turbo lint --filter='./packages/*' --filter='./apps/*'

      - name: TypeScript Check
        run: pnpm turbo typecheck --filter='./packages/*' --filter='./apps/*'

  # ─── Stage 2b: Unit Tests (Parallel) ────────────────────────
  unit-tests:
    name: 'Unit Tests'
    needs: changes
    runs-on: ubuntu-latest
    timeout-minutes: 8
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Turbo cache restore
        uses: actions/cache@v4
        with:
          path: .turbo
          key: test-unit-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ github.sha }}
          restore-keys: |
            test-unit-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}-
            test-unit-${{ runner.os }}-

      - name: Frontend Unit Tests
        if: needs.changes.outputs.web == 'true'
        run: pnpm turbo test --filter=web --filter=@sprintio/ui --filter=@sprintio/shared

      - name: Backend Unit Tests
        if: needs.changes.outputs.api == 'true'
        run: pnpm turbo test --filter=api

      - name: Coverage Upload
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: |
            apps/web/coverage/
            apps/api/coverage/
          retention-days: 5

  # ─── Stage 2c: Build Check (Parallel) ───────────────────────
  build:
    name: 'Build'
    needs: changes
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Turbo cache restore
        uses: actions/cache@v4
        with:
          path: |
            .turbo
            apps/web/dist
            apps/api/dist
          key: build-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ github.sha }}
          restore-keys: |
            build-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}-
            build-${{ runner.os }}-

      - name: Build all packages
        run: pnpm turbo build

  # ─── Stage 3: Python Sidecar Lint ───────────────────────────
  python-lint:
    name: 'Python Lint'
    needs: changes
    if: needs.changes.outputs.ai == 'true'
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install uv
        run: pip install uv

      - name: Install dependencies
        working-directory: apps/ai-sidecar
        run: uv sync --dev

      - name: Ruff Lint
        working-directory: apps/ai-sidecar
        run: uv run ruff check .

      - name: Ruff Format Check
        working-directory: apps/ai-sidecar
        run: uv run ruff format --check .

      - name: Mypy Type Check
        working-directory: apps/ai-sidecar
        run: uv run mypy .

  # ─── Stage 4: Coverage Report ───────────────────────────────
  coverage-report:
    name: 'Coverage Report'
    needs: [lint, unit-tests, build]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download coverage
        uses: actions/download-artifact@v4
        with:
          name: coverage-report
          path: ./coverage

      - name: Report Coverage
        run: |
          echo "## Coverage Summary" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          if [ -d "./coverage/apps/web/coverage" ]; then
            echo "### Frontend" >> $GITHUB_STEP_SUMMARY
            echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
            cat ./coverage/apps/web/coverage/coverage-summary.json | \
              jq '.total' >> $GITHUB_STEP_SUMMARY 2>/dev/null || \
              echo "No coverage data available" >> $GITHUB_STEP_SUMMARY
            echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
          fi

      - name: Comment on PR
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          message: |
            ## 🧪 Test Results

            | Check | Status |
            |-------|--------|
            | Lint & TypeCheck | ${{ needs.lint.result == 'success' && '✅' || '❌' }} |
            | Unit Tests | ${{ needs.unit-tests.result == 'success' && '✅' || '❌' }} |
            | Build | ${{ needs.build.result == 'success' && '✅' || '❌' }} |

---
## 4. Main Pipeline

### 4.1 Main Pipeline Flow
```

┌──────────────────────────────────────────────────────────────────────────┐
│ MAIN PIPELINE (Full Validation) │
│ │
│ Push to main │
│ │ │
│ ▼ │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│ │ Lint & │ │ Unit + │ │ Integration│ │ E2E Tests │ │
│ │ TypeCheck │ │ Unit Tests │ │ Tests │ │ (Playwright│ │
│ │ │ │ │ │ (Test DB) │ │ critical) │ │
│ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ │
│ │ │ │ │ │
│ └────────┬───────┘ │ │ │
│ │ │ │ │
│ ▼ ▼ ▼ │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Build All Packages │ │
│ └──────────────────────┬───────────────────────────┘ │
│ │ │
│ ▼ │
│ ┌──────────────────────────────────────────┐ │
│ │ Database Migrations (staging DB) │ │
│ └──────────────────────┬───────────────────┘ │
│ │ │
│ ┌────────────┼────────────┐ │
│ ▼ ▼ ▼ │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ Deploy │ │ Deploy │ │ Build │ │
│ │ Frontend│ │ Backend │ │ Docker │ │
│ │ (Pages) │ │ (Worker)│ │ Images │ │
│ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│ │ │ │ │
│ └────────┬───┘ │ │
│ ▼ ▼ │
│ ┌─────────────┐ ┌──────────────┐ │
│ │ Health Check│ │ Push to GHCR │ │
│ │ + Smoke │ │ + Docker Hub │ │
│ └──────┬──────┘ └──────────────┘ │
│ │ │
│ ▼ │
│ ┌──────────────┐ │
│ │ Notify │ │
│ │ (Slack/PR) │ │
│ └──────────────┘ │
│ │
│ Target: < 15 minutes │
└──────────────────────────────────────────────────────────────────────────┘

````

### 4.2 Main Pipeline — GitHub Actions

```yaml
# .github/workflows/ci-main.yml

name: "CI — Main Branch"

on:
  push:
    branches: [main]

concurrency:
  group: main-deploy
  cancel-in-progress: false  # Never cancel main deployments

env:
  NODE_VERSION: "20"
  PYTHON_VERSION: "3.12"
  PNPM_VERSION: "9"
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
  CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ─── Stage 1: Quality Gates ─────────────────────────────────
  lint:
    name: "Lint & TypeCheck"
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/cache@v4
        with:
          path: .turbo
          key: turbo-main-lint-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ github.sha }}
          restore-keys: turbo-main-lint-${{ hashFiles('**/pnpm-lock.yaml') }}-
      - run: pnpm turbo lint typecheck

  unit-tests:
    name: "Unit Tests"
    runs-on: ubuntu-latest
    timeout-minutes: 8
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/cache@v4
        with:
          path: .turbo
          key: turbo-main-test-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ github.sha }}
          restore-keys: turbo-main-test-${{ hashFiles('**/pnpm-lock.yaml') }}-
      - run: pnpm turbo test -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-main
          path: apps/*/coverage/
          retention-days: 14

  # ─── Stage 2: Integration Tests ─────────────────────────────
  integration-tests:
    name: "Integration Tests"
    needs: lint
    runs-on: ubuntu-latest
    timeout-minutes: 10
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: sprintio_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/sprintio_test
      NODE_ENV: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile

      - name: Run migrations
        run: pnpm --filter @sprintio/db migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/sprintio_test

      - name: Seed test database
        run: pnpm --filter @sprintio/db seed
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/sprintio_test

      - name: Run integration tests
        run: pnpm turbo test:integration --filter=api
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/sprintio_test

  # ─── Stage 2b: E2E Tests ────────────────────────────────────
  e2e-tests:
    name: "E2E Tests"
    needs: lint
    runs-on: ubuntu-latest
    timeout-minutes: 15
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: sprintio_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/sprintio_test
      NODE_ENV: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile

      - name: Run migrations & seed
        run: |
          pnpm --filter @sprintio/db migrate
          pnpm --filter @sprintio/db seed

      - name: Install Playwright browsers
        run: pnpm --filter @sprintio/e2e exec playwright install --with-deps chromium

      - name: Build apps for E2E
        run: |
          pnpm turbo build --filter=web --filter=api --filter=@sprintio/db

      - name: Run E2E tests
        run: pnpm --filter @sprintio/e2e test
        env:
          BASE_URL: http://localhost:5173
          API_URL: http://localhost:3001
          CI: true

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: apps/e2e/playwright-report/
          retention-days: 7

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-traces
          path: apps/e2e/test-results/
          retention-days: 7

  # ─── Stage 3: Build ─────────────────────────────────────────
  build:
    name: "Build All Packages"
    needs: lint
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/cache@v4
        with:
          path: |
            .turbo
            apps/web/dist
            apps/api/dist
          key: turbo-main-build-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ github.sha }}
          restore-keys: turbo-main-build-${{ hashFiles('**/pnpm-lock.yaml') }}-
      - run: pnpm turbo build
      - uses: actions/upload-artifact@v4
        with:
          name: build-artifacts
          path: |
            apps/web/dist/
            apps/api/dist/
          retention-days: 3

  # ─── Stage 4: Database Migration ────────────────────────────
  db-migrate:
    name: "Database Migrations"
    needs: [unit-tests, integration-tests]
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile

      - name: Run migrations on staging
        run: pnpm --filter @sprintio/db migrate
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}

  # ─── Stage 5: Deploy ────────────────────────────────────────
  deploy-frontend:
    name: "Deploy Frontend (Cloudflare Pages)"
    needs: [build, e2e-tests]
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-artifacts
          path: ./apps/web/dist

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: pages deploy ./apps/web/dist --project-name=sprintio-staging

  deploy-backend:
    name: "Deploy Backend (Cloudflare Worker)"
    needs: [build, db-migrate]
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4

      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          workingDirectory: apps/api
          command: deploy --env staging

  # ─── Stage 5b: Docker Build ─────────────────────────────────
  docker-build:
    name: "Build Docker Images"
    needs: build
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
      packages: write
    strategy:
      matrix:
        include:
          - context: apps/ai-sidecar
            image: sprintio-ai-sidecar
            context-file: Dockerfile
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: |
            ghcr.io/${{ github.repository }}/${{ matrix.image }}
            docker.io/sprintio/${{ matrix.image }}
          tags: |
            type=sha,prefix=
            type=ref,event=branch

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: ${{ matrix.context }}
          file: ${{ matrix.context-file }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ─── Stage 6: Health Check & Notify ─────────────────────────
  health-check:
    name: "Health Check"
    needs: [deploy-frontend, deploy-backend]
    runs-on: ubuntu-latest
    timeout-minutes: 3
    steps:
      - name: Wait for deployment propagation
        run: sleep 30

      - name: Check Backend Health
        run: |
          for i in {1..5}; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
              ${{ secrets.STAGING_API_URL }}/health)
            if [ "$STATUS" = "200" ]; then
              echo "✅ Backend is healthy"
              exit 0
            fi
            echo "Attempt $i: Status $STATUS, retrying in 10s..."
            sleep 10
          done
          echo "❌ Backend health check failed"
          exit 1

      - name: Check Frontend
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            ${{ secrets.STAGING_FRONTEND_URL }})
          if [ "$STATUS" = "200" ]; then
            echo "✅ Frontend is accessible"
          else
            echo "❌ Frontend returned status $STATUS"
            exit 1
          fi

  notify:
    name: "Deploy Notification"
    needs: [deploy-frontend, deploy-backend, health-check]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Notify Slack
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_DEPLOY_WEBHOOK }}
          webhook-type: incoming-webhook
          payload: |
            {
              "text": "🚀 Sprintio Staging Deploy",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*🚀 Staging Deploy*\n*Commit:* `${{ github.sha }}`\n*Branch:* `${{ github.ref_name }}`\n*Frontend:* ${{ needs.deploy-frontend.result == 'success' && '✅' || '❌' }}\n*Backend:* ${{ needs.deploy-backend.result == 'success' && '✅' || '❌' }}\n*Health:* ${{ needs.health-check.result == 'success' && '✅' || '❌' }}"
                  }
                }
              ]
            }
````

---

## 5. Release Pipeline

### 5.1 Release Pipeline Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    RELEASE PIPELINE (Production)                           │
│                                                                            │
│  Tag Push: v1.x.0                                                         │
│       │                                                                    │
│       ▼                                                                    │
│  ┌──────────────┐                                                         │
│  │ Validate Tag  │                                                        │
│  │ Format (semver)│                                                       │
│  └───────┬──────┘                                                         │
│          │                                                                 │
│          ▼                                                                 │
│  ┌──────────────┐                                                         │
│  │ Full Test    │                                                         │
│  │ Suite Run    │──► lint / typecheck / unit / integration / e2e          │
│  └───────┬──────┘                                                         │
│          │                                                                 │
│          ▼                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                  │
│  │ Generate     │   │ Build All    │   │ Docker Build │                  │
│  │ Changelog    │   │ Packages     │   │ + Version    │                  │
│  └───────┬──────┘   └───────┬──────┘   └───────┬──────┘                  │
│          │                  │                   │                         │
│          ▼                  │                   ▼                         │
│  ┌──────────────┐          │          ┌──────────────┐                   │
│  │ Create       │          │          │ Push Docker  │                   │
│  │ GitHub       │          │          │ Images with  │                   │
│  │ Release      │          │          │ version tag  │                   │
│  └───────┬──────┘          │          └───────┬──────┘                   │
│          │                  │                  │                         │
│          │                  ▼                  │                         │
│          │         ┌──────────────┐            │                         │
│          │         │ DB Migration │            │                         │
│          │         │ (production) │            │                         │
│          │         └───────┬──────┘            │                         │
│          │                 │                   │                         │
│          │     ┌───────────┼───────────────────┘                         │
│          │     │           │                                              │
│          ▼     ▼           ▼                                              │
│  ┌────────────────────────────────┐                                      │
│  │      Deploy to Production      │                                      │
│  │  Frontend ─► Backend ─► Docker │                                      │
│  └───────────────┬────────────────┘                                      │
│                  │                                                        │
│                  ▼                                                        │
│  ┌────────────────────────────────┐                                      │
│  │   Post-Deploy Validation       │                                      │
│  │   Health ─► Smoke ─► Lighthouse│                                      │
│  └───────────────┬────────────────┘                                      │
│                  │                                                        │
│          ┌───────┼───────┐                                                │
│          ▼       ▼       ▼                                                │
│    ┌────────┐ ┌──────┐ ┌──────────┐                                     │
│    │ Slack  │ │GH Rel│ │ Datadog  │                                     │
│    │ Notify │ │ Notes│ │ Tag      │                                     │
│    └────────┘ └──────┘ └──────────┘                                     │
│                                                                            │
│  Target: < 20 minutes                                                     │
└────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Release Pipeline — GitHub Actions

````yaml
# .github/workflows/ci-release.yml

name: 'CI — Release'

on:
  push:
    tags:
      - 'v*.*.*'

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9'
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
  REGISTRY: ghcr.io
  IMAGE_PREFIX: sprintio

jobs:
  # ─── Validate Tag ───────────────────────────────────────────
  validate:
    name: 'Validate Release Tag'
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.extract.outputs.version }}
      prerelease: ${{ steps.extract.outputs.prerelease }}
    steps:
      - name: Extract version from tag
        id: extract
        run: |
          TAG="${GITHUB_REF#refs/tags/v}"
          echo "version=$TAG" >> $GITHUB_OUTPUT
          if [[ "$TAG" == *"-"* ]]; then
            echo "prerelease=true" >> $GITHUB_OUTPUT
          else
            echo "prerelease=false" >> $GITHUB_OUTPUT
          fi
          echo "📦 Releasing version: $TAG"

      - name: Validate semver format
        run: |
          VERSION="${{ steps.extract.outputs.version }}"
          if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
            echo "❌ Invalid semver format: $VERSION"
            exit 1
          fi
          echo "✅ Valid semver format"

  # ─── Full Test Suite ────────────────────────────────────────
  test-suite:
    name: 'Full Test Suite'
    needs: validate
    uses: ./.github/workflows/_test-suite.yml
    secrets: inherit

  # ─── Build ──────────────────────────────────────────────────
  build:
    name: 'Build All'
    needs: test-suite
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/cache@v4
        with:
          path: |
            .turbo
            apps/web/dist
            apps/api/dist
          key: release-build-${{ needs.validate.outputs.version }}-${{ hashFiles('**/pnpm-lock.yaml') }}
      - run: pnpm turbo build
      - uses: actions/upload-artifact@v4
        with:
          name: release-build
          path: |
            apps/web/dist/
            apps/api/dist/

  # ─── Database Migration (Production) ────────────────────────
  db-migrate-production:
    name: 'Production DB Migration'
    needs: build
    runs-on: ubuntu-latest
    timeout-minutes: 5
    environment:
      name: production
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile

      - name: Create migration backup snapshot
        run: |
          echo "📸 Creating database snapshot before migration..."
          # Using pg_dump via connection string
          PGPASSWORD=${{ secrets.PROD_DB_PASSWORD }} pg_dump \
            -h ${{ secrets.PROD_DB_HOST }} \
            -U ${{ secrets.PROD_DB_USER }} \
            -d sprintio_prod \
            -Fc \
            --file="backup-${{ needs.validate.outputs.version }}.dump"

      - name: Upload backup artifact
        uses: actions/upload-artifact@v4
        with:
          name: db-backup-${{ needs.validate.outputs.version }}
          path: backup-*.dump
          retention-days: 30

      - name: Run production migrations
        run: pnpm --filter @sprintio/db migrate
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}

  # ─── Deploy Production ──────────────────────────────────────
  deploy-frontend-prod:
    name: 'Deploy Frontend → Production'
    needs: [build, db-migrate-production]
    runs-on: ubuntu-latest
    timeout-minutes: 5
    environment:
      name: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: release-build
          path: ./apps/web/dist

      - name: Deploy to Cloudflare Pages (production)
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: pages deploy ./apps/web/dist --project-name=sprintio

  deploy-backend-prod:
    name: 'Deploy Backend → Production'
    needs: [build, db-migrate-production]
    runs-on: ubuntu-latest
    timeout-minutes: 5
    environment:
      name: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy Worker (production)
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          workingDirectory: apps/api
          command: deploy --env production

  # ─── Docker Release ─────────────────────────────────────────
  docker-release:
    name: 'Docker Release Images'
    needs: build
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
      packages: write
    strategy:
      matrix:
        include:
          - context: apps/ai-sidecar
            image: sprintio-ai-sidecar
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: |
            ghcr.io/${{ github.repository }}/${{ matrix.image }}
            docker.io/sprintio/${{ matrix.image }}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - uses: docker/build-push-action@v6
        with:
          context: ${{ matrix.context }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ─── Post-Deploy Validation ─────────────────────────────────
  post-deploy:
    name: 'Post-Deploy Validation'
    needs: [deploy-frontend-prod, deploy-backend-prod]
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Wait for propagation
        run: sleep 60

      - name: Health Check — Backend
        run: |
          for i in {1..10}; do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
              ${{ secrets.PROD_API_URL }}/health)
            if [ "$STATUS" = "200" ]; then
              echo "✅ Backend healthy"
              exit 0
            fi
            echo "⏳ Attempt $i: $STATUS"
            sleep 15
          done
          echo "❌ Backend health check failed"
          exit 1

      - name: Health Check — Frontend
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            ${{ secrets.PROD_FRONTEND_URL }})
          [ "$STATUS" = "200" ] && echo "✅ Frontend accessible" || exit 1

      - name: Smoke Test — API Endpoints
        run: |
          # Core endpoint smoke tests
          endpoints=(
            "GET /api/v1/health"
            "GET /api/v1/workspaces"
            "GET /api/v1/auth/me"
          )
          for endpoint in "${endpoints[@]}"; do
            METHOD=$(echo $endpoint | cut -d' ' -f1)
            PATH=$(echo $endpoint | cut -d' ' -f2)
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
              -X $METHOD "${{ secrets.PROD_API_URL }}${PATH}")
            echo "$endpoint → $STATUS"
            if [ "$STATUS" -ge 500 ]; then
              echo "❌ Smoke test failed: $endpoint"
              exit 1
            fi
          done
          echo "✅ All smoke tests passed"

  # ─── Create GitHub Release ──────────────────────────────────
  github-release:
    name: 'Create GitHub Release'
    needs: [validate, post-deploy]
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate Changelog
        id: changelog
        run: |
          # Get previous tag
          PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
          if [ -n "$PREV_TAG" ]; then
            CHANGELOG=$(git log --pretty=format:"- %s (%h)" $PREV_TAG..HEAD)
          else
            CHANGELOG=$(git log --pretty=format:"- %s (%h)")
          fi
          echo "changelog<<EOF" >> $GITHUB_OUTPUT
          echo "$CHANGELOG" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          name: 'Release ${{ needs.validate.outputs.version }}'
          body: |
            ## Changes

            ${{ steps.changelog.outputs.changelog }}

            ## Docker Images

            ```
            docker.io/sprintio/sprintio-ai-sidecar:${{ needs.validate.outputs.version }}
            ghcr.io/${{ github.repository }}/sprintio-ai-sidecar:${{ needs.validate.outputs.version }}
            ```

            ## Deployment

            - Frontend: ${{ secrets.PROD_FRONTEND_URL }}
            - Backend API: ${{ secrets.PROD_API_URL }}
          draft: false
          prerelease: ${{ needs.validate.outputs.prerelease }}

  # ─── Notify ─────────────────────────────────────────────────
  notify:
    name: 'Release Notification'
    needs: [validate, post-deploy, github-release]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Slack Release Notification
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_DEPLOY_WEBHOOK }}
          webhook-type: incoming-webhook
          payload: |
            {
              "text": "🎉 Sprintio v${{ needs.validate.outputs.version }} Released!",
              "blocks": [
                {
                  "type": "header",
                  "text": {
                    "type": "plain_text",
                    "text": "🎉 Production Release"
                  }
                },
                {
                  "type": "section",
                  "fields": [
                    { "type": "mrkdwn", "text": "*Version:* v${{ needs.validate.outputs.version }}" },
                    { "type": "mrkdwn", "text": "*Status:* ${{ needs.post-deploy.result == 'success' && '✅ Healthy' || '⚠️ Check' }}" },
                    { "type": "mrkdwn", "text": "*Frontend:* ${{ needs.deploy-frontend-prod.result }}" },
                    { "type": "mrkdwn", "text": "*Backend:* ${{ needs.deploy-backend-prod.result }}" }
                  ]
                }
              ]
            }
````

### 5.3 Reusable Test Suite Workflow

```yaml
# .github/workflows/_test-suite.yml

name: '_Test Suite (Reusable)'

on:
  workflow_call:
    secrets:
      TURBO_TOKEN:
        required: true
      TURBO_TEAM:
        required: true

jobs:
  lint:
    name: 'Lint & TypeCheck'
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: '9'
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint typecheck

  unit-tests:
    name: 'Unit Tests'
    runs-on: ubuntu-latest
    timeout-minutes: 8
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: '9'
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo test -- --coverage

  integration-tests:
    name: 'Integration Tests'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: sprintio_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: '9'
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @sprintio/db migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/sprintio_test
      - run: pnpm --filter @sprintio/db seed
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/sprintio_test
      - run: pnpm turbo test:integration --filter=api
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/sprintio_test

  e2e-tests:
    name: 'E2E Tests'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: sprintio_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: '9'
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @sprintio/db migrate
        run: |
          pnpm --filter @sprintio/db migrate
          pnpm --filter @sprintio/db seed
      - run: pnpm --filter @sprintio/e2e exec playwright install --with-deps chromium
      - run: pnpm turbo build --filter=web --filter=api
      - run: pnpm --filter @sprintio/e2e test
```

---

## 6. Turborepo Integration

### 6.1 Pipeline Configuration

```jsonc
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "tsconfig.json", "tsconfig.build.json", "vite.config.*", "package.json"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "env": ["NODE_ENV"],
    },
    "lint": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", ".eslintrc*", "eslint.config.*"],
      "outputs": [],
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "tsconfig.json"],
      "outputs": [],
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "tests/**", "__tests__/**", "vitest.config.*", "jest.config.*"],
      "outputs": ["coverage/**"],
      "env": ["NODE_ENV", "DATABASE_URL"],
    },
    "test:integration": {
      "dependsOn": ["build", "^build"],
      "inputs": ["src/**", "tests/integration/**"],
      "outputs": ["coverage/integration/**"],
      "env": ["NODE_ENV", "DATABASE_URL"],
    },
    "test:e2e": {
      "dependsOn": ["build", "^build"],
      "inputs": ["tests/e2e/**", "playwright.config.*"],
      "outputs": ["test-results/**", "playwright-report/**"],
      "env": ["BASE_URL", "API_URL", "CI"],
    },
    "dev": {
      "cache": false,
      "persistent": true,
    },
    "clean": {
      "cache": false,
    },
    "migrate": {
      "inputs": ["src/**", "drizzle/**", "drizzle.config.*"],
      "outputs": [],
    },
    "seed": {
      "dependsOn": ["migrate"],
      "inputs": ["src/**", "seeds/**"],
      "outputs": [],
    },
    "deploy": {
      "dependsOn": ["build"],
      "inputs": ["wrangler.toml", "src/**"],
      "outputs": [],
    },
  },
  "globalDependencies": ["pnpm-lock.yaml", "pnpm-workspace.yaml"],
  "globalEnv": ["NODE_ENV", "CI"],
  "remoteCache": {
    "signature": true,
  },
}
```

### 6.2 Turborepo Caching Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                 TURBOREPO CACHING ARCHITECTURE                      │
│                                                                     │
│  ┌───────────────┐                                                  │
│  │   Local Cache  │  (.turbo/ in each package)                     │
│  │   Fast reads   │  First line of defense                         │
│  └───────┬───────┘                                                  │
│          │ miss                                                     │
│          ▼                                                          │
│  ┌───────────────┐                                                  │
│  │  Remote Cache  │  (Turborepo Cloud / Self-hosted)               │
│  │  Team-shared   │  Shared across CI runs & developers            │
│  └───────┬───────┘                                                  │
│          │ miss                                                     │
│          ▼                                                          │
│  ┌───────────────┐                                                  │
│  │   Execute      │  Actually run the task                         │
│  │   Task         │  Store result in both caches                   │
│  └───────────────┘                                                  │
│                                                                     │
│  Cache Key = task + inputs hash + OS + Node version + env vars     │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Cache Hit Rates (Target)                                    │   │
│  │                                                              │   │
│  │ PR Pipeline:     ████████████████████░░░░░  ~80%            │   │
│  │ Main Pipeline:   █████████████████████░░░░  ~85%            │   │
│  │ Release Pipeline:██████████████████████░░░  ~90%            │   │
│  │ Local Dev:       █████████████████████████  ~95%            │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Affected-Only Execution

```bash
# PR Pipeline: Only build/test what changed
pnpm turbo lint typecheck test build \
  --filter="...[origin/main]"

# Main Pipeline: Everything (for staging deploy confidence)
pnpm turbo lint typecheck test build

# Local development: Only what changed since main
pnpm turbo dev --filter="...[origin/main]"

# Find what's affected without running
pnpm turbo run build --dry --filter="...[origin/main]"
```

### 6.4 Package-Level Turbo Config Overrides

```jsonc
// apps/web/package.json — override specific tasks
{
  "scripts": {
    "build": "vite build",
    "test": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:e2e": "playwright test",
    "lint": "eslint src/ --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
  },
}
```

```jsonc
// apps/api/package.json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "jest --coverage",
    "test:integration": "jest --config jest.integration.config.js",
    "lint": "eslint src/ --ext .ts",
    "typecheck": "tsc --noEmit",
    "migrate": "drizzle-kit migrate",
    "deploy": "wrangler deploy",
  },
}
```

```jsonc
// apps/ai-sidecar/pyproject.toml — Python tasks
{
  "tool.turbo": {
    "tasks": {
      "build": {
        "dependsOn": ["^build"],
        "inputs": ["src/**/*.py", "pyproject.toml", "uv.lock"],
        "outputs": ["dist/**"],
      },
      "lint": {
        "inputs": ["src/**/*.py", "pyproject.toml"],
        "outputs": [],
      },
      "test": {
        "inputs": ["src/**/*.py", "tests/**/*.py"],
        "outputs": ["coverage/**"],
      },
    },
  },
}
```

---

## 7. Test Strategy

### 7.1 Test Pyramid

```
                          ╱╲
                         ╱  ╲
                        ╱ E2E╲              5% of tests
                       ╱ Tests ╲            Playwright
                      ╱──────────╲          Critical user flows
                     ╱            ╲         ~20 test cases
                    ╱ Integration  ╲
                   ╱    Tests       ╲       15% of tests
                  ╱──────────────────╲      API + DB tests
                 ╱                    ╲     ~80 test cases
                ╱    Unit Tests        ╲
               ╱  (Frontend + Backend)  ╲   80% of tests
              ╱──────────────────────────╲  Isolated, fast
             ╱                            ╲ ~500 test cases
            ╱______________________________╲
```

### 7.2 Test Distribution by Pipeline

```
┌──────────────────────────────────────────────────────────────────────┐
│                        TEST DISTRIBUTION                             │
│                                                                      │
│  PR Pipeline (Fast Feedback < 5 min)                                │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  ✓ Unit Tests (Vitest frontend, Jest backend)             │     │
│  │  ✓ Lint & Type Check                                      │     │
│  │  ✓ Build Verification                                     │     │
│  │  ✗ Integration Tests                                      │     │
│  │  ✗ E2E Tests                                              │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  Main Pipeline (Full Validation < 15 min)                           │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  ✓ Unit Tests                                              │     │
│  │  ✓ Integration Tests (with test DB)                       │     │
│  │  ✓ E2E Tests — Critical Flows Only                        │     │
│  │  ✓ Lint & Type Check                                      │     │
│  │  ✓ Build                                                  │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  Release Pipeline (Complete Validation < 20 min)                    │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  ✓ Unit Tests (all packages)                              │     │
│  │  ✓ Integration Tests (full suite)                         │     │
│  │  ✓ E2E Tests (full suite)                                 │     │
│  │  ✓ Lint & Type Check                                      │     │
│  │  ✓ Build + Docker                                         │     │
│  │  ✓ Post-Deploy Smoke Tests                                │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 7.3 Test Configuration

```typescript
// apps/web/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['src/**/*.e2e.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      exclude: ['node_modules/', 'src/types/', '**/*.d.ts', '**/*.config.*', 'src/main.tsx'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

```typescript
// apps/api/jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '!**/*.integration.test.ts'],
  setupFilesAfterSetup: ['./tests/setup.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/types/**', '!src/**/*.d.ts'],
  coverageThresholds: {
    global: {
      statements: 75,
      branches: 70,
      functions: 75,
      lines: 75,
    },
  },
};

export default config;
```

```typescript
// apps/api/jest.integration.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/*.integration.test.ts'],
  setupFilesAfterSetup: ['./tests/integration/setup.ts'],
  testTimeout: 30000,
};

export default config;
```

```typescript
// apps/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: !CI,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 1 : undefined,
  reporter: CI ? [['html', { open: 'never' }], ['github']] : [['html', { open: 'on-failure' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: CI ? 'on-first-retry' : 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: CI
    ? undefined // In CI, apps are built and started separately
    : [
        {
          command: 'pnpm --filter web dev',
          url: 'http://localhost:5173',
          reuseExistingServer: true,
        },
        {
          command: 'pnpm --filter api dev',
          url: 'http://localhost:3001',
          reuseExistingServer: true,
        },
      ],
});
```

### 7.4 Critical E2E Flows

```typescript
// apps/e2e/tests/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('user can sign up and access workspace', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('[data-testid="email"]', 'test@sprintio.dev');
    await page.fill('[data-testid="password"]', 'SecureP@ss123');
    await page.click('[data-testid="signup-button"]');

    await expect(page).toHaveURL(/\/onboarding/);
  });

  test('user can log in with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'existing@sprintio.dev');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});

// apps/e2e/tests/workspace.spec.ts
test.describe('Workspace Management', () => {
  test('user can create workspace and add tasks', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('[data-testid="create-workspace"]');
    await page.fill('[data-testid="workspace-name"]', 'Sprint Sprintio');
    await page.click('[data-testid="save-workspace"]');

    await page.click('[data-testid="add-task"]');
    await page.fill('[data-testid="task-title"]', 'Ship CI/CD pipeline');
    await page.click('[data-testid="save-task"]');

    await expect(
      page.locator('[data-testid="task-item"]').filter({ hasText: 'Ship CI/CD' }),
    ).toBeVisible();
  });
});
```

---

## 8. Build Strategy

### 8.1 Build Pipeline Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       BUILD STRATEGY                                     │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                  Dependency Graph (Turborepo)                    │   │
│  │                                                                  │   │
│  │   @sprintio/config ──► @sprintio/shared ──┐                     │   │
│  │                           │                │                     │   │
│  │   @sprintio/eslint-config│                ├──► @sprintio/web    │   │
│  │           │              │                │    (Vite → dist/)   │   │
│  │           ▼              │                │                     │   │
│  │   @sprintio/ui ──────────┘                │                     │   │
│  │                                           │                     │   │
│  │   @sprintio/db ──────────────────────────►├──► @sprintio/api    │   │
│  │   (Drizzle migrations)                    │    (tsc → dist/)   │   │
│  │                                           │                     │   │
│  │                                           │                     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Parallel execution where possible:                                     │
│                                                                          │
│  Time ──────────────────────────────────────────────────────────►       │
│                                                                          │
│  Layer 1:  [config] [eslint-config] [shared] [db]                       │
│            ~5s      ~3s            ~5s      ~8s                         │
│                                                                          │
│  Layer 2:  [ui]    (depends on config, shared, eslint-config)           │
│            ~12s                                                             │
│                                                                          │
│  Layer 3:  [web]               [api]            [ai-sidecar]            │
│            (Vite: ~15s)        (tsc: ~10s)      (Python: ~20s)         │
│                                                                          │
│  Total (no cache): ~45s  │  Total (full cache): ~3s                     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Build Artifact Strategy

```yaml
# Artifact naming convention
artifacts:
  frontend:
    path: apps/web/dist/
    name: web-dist-${{ github.sha }}
    retention: 3 days

  backend:
    path: apps/api/dist/
    name: api-dist-${{ github.sha }}
    retention: 3 days

  docker:
    registry: ghcr.io/sprintio/
    tag: ${{ github.sha }}
    retention: tagged only

  turbo-cache:
    path: .turbo/
    name: turbo-${{ github.sha }}
    retention: 7 days
```

### 8.3 Docker Build Strategy

```dockerfile
# infra/docker/ai-sidecar.Dockerfile
# ─── Multi-stage build for Python FastAPI ─────────────────────

# Stage 1: Dependencies
FROM python:3.12-slim AS deps
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install uv && uv sync --no-dev --no-install-project

# Stage 2: Runtime
FROM python:3.12-slim AS runtime
WORKDIR /app

# Security: non-root user
RUN groupadd -r sprintio && useradd -r -g sprintio sprintio

COPY --from=deps /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

COPY src/ ./src/
COPY alembic/ ./alembic/
COPY alembic.ini ./

USER sprintio

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```dockerfile
# infra/docker/api.Dockerfile
# ─── Multi-stage build for Node.js Express ────────────────────

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/

RUN pnpm install --frozen-lockfile --filter=@sprintio/api...

COPY apps/api/tsconfig*.json ./apps/api/
COPY packages/shared/ ./packages/shared/
COPY packages/db/ ./packages/db/
COPY apps/api/src/ ./apps/api/src/

RUN pnpm --filter @sprintio/api build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

RUN groupadd -r sprintio && useradd -r -g sprintio sprintio

COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist/ ./apps/api/dist/

RUN pnpm install --frozen-lockfile --prod --filter=@sprintio/api

USER sprintio

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "apps/api/dist/index.js"]
```

---

## 9. Deploy Strategy

### 9.1 Cloudflare Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE DEPLOYMENT                                  │
│                                                                          │
│                        ┌──────────────┐                                 │
│                        │  Cloudflare  │                                 │
│                        │     CDN      │                                 │
│                        └──────┬───────┘                                 │
│                               │                                         │
│              ┌────────────────┼────────────────┐                        │
│              ▼                                 ▼                        │
│   ┌──────────────────┐             ┌──────────────────┐                │
│   │  Cloudflare      │             │  Cloudflare      │                │
│   │  Pages           │             │  Workers         │                │
│   │  (Frontend)      │             │  (Backend API)   │                │
│   │                  │             │                  │                │
│   │  • React SPA     │             │  • Express.js    │                │
│   │  • Static assets │             │  • API routes    │                │
│   │  • SPA routing   │             │  • Auth/middleware│                │
│   │  • Edge-cached   │             │  • Edge compute  │                │
│   └────────┬─────────┘             └────────┬─────────┘                │
│            │                                │                          │
│            │        ┌──────────────┐        │                          │
│            │        │              │        │                          │
│            └────────┤  Workers KV  ├────────┘                          │
│                     │  (Sessions)  │                                    │
│                     └──────────────┘                                    │
│                                                                          │
│   ┌──────────────────────────────────────────┐                         │
│   │           Cloudflare R2                   │                         │
│   │  (File Storage: attachments, exports)     │                         │
│   └──────────────────────────────────────────┘                         │
│                                                                          │
│   ┌──────────────────────────────────────────┐                         │
│   │      External: PostgreSQL (Supabase)      │                         │
│   │      (Drizzle migrations on deploy)       │                         │
│   └──────────────────────────────────────────┘                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Wrangler Configuration

```toml
# apps/api/wrangler.toml

name = "sprintio-api"
main = "dist/index.js"
compatibility_date = "2026-07-01"
compatibility_flags = ["nodejs_compat"]
no_bundle = false

[env.staging]
name = "sprintio-api-staging"
routes = [
  { pattern = "api-staging.sprintio.dev/*", zone_name = "sprintio.dev" }
]

[env.staging.vars]
ENVIRONMENT = "staging"
LOG_LEVEL = "debug"

[env.staging.secrets]
DATABASE_URL = "staging-database-url"

[env.production]
name = "sprintio-api"
routes = [
  { pattern = "api.sprintio.dev/*", zone_name = "sprintio.dev" }
]

[env.production.vars]
ENVIRONMENT = "production"
LOG_LEVEL = "info"

[env.production.secrets]
DATABASE_URL = "production-database-url"

# KV Namespaces for session storage
[[kv_namespaces]]
binding = "SESSIONS"
id = "staging-kv-sessions-id"

[[env.production.kv_namespaces]]
binding = "SESSIONS"
id = "production-kv-sessions-id"

# R2 Buckets for file storage
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "sprintio-staging"

[[env.production.r2_buckets]]
binding = "STORAGE"
bucket_name = "sprintio-production"
```

### 9.3 Cloudflare Pages Deploy

```yaml
# apps/web/wrangler.toml (Cloudflare Pages)

name = "sprintio"
compatibility_date = "2024-09-23"
# Cloudflare Pages is configured via the dashboard or
# the wrangler CLI in the deploy workflow
```

```yaml
# Deploy commands used in CI:

# Staging
wrangler pages deploy ./dist --project-name=sprintio-staging

# Production
wrangler pages deploy ./dist --project-name=sprintio
```

### 9.4 Deploy Flow — Step by Step

```
┌──────────────────────────────────────────────────────────────────────┐
│                     DEPLOY SEQUENCE                                  │
│                                                                      │
│  1. PRE-DEPLOY                                                       │
│     ├── Verify all tests passed                                      │
│     ├── Verify build artifacts exist                                 │
│     └── Verify DB migrations are ready                               │
│                                                                      │
│  2. DATABASE                                                         │
│     ├── Create pg_dump backup                                        │
│     ├── Run pending migrations                                       │
│     ├── Verify migration status                                      │
│     └── (Rollback plan: restore from backup)                         │
│                                                                      │
│  3. BACKEND (Cloudflare Worker)                                      │
│     ├── Push new Worker version (instant propagation)                │
│     ├── Worker starts handling requests immediately                  │
│     └── Old version continues until new version is active            │
│                                                                      │
│  4. FRONTEND (Cloudflare Pages)                                      │
│     ├── Upload static assets                                         │
│     ├── Deploy to preview URL (staging)                              │
│     ├── Promote preview to production domain                         │
│     └── CDN cache invalidation (automatic on deploy)                 │
│                                                                      │
│  5. POST-DEPLOY                                                      │
│     ├── Health check — backend endpoint                              │
│     ├── Health check — frontend loads                                │
│     ├── Smoke test — core API routes                                 │
│     ├── Notify team (Slack)                                          │
│     └── Create deployment record                                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 10. Database Migrations

### 10.1 Migration Strategy

```
┌──────────────────────────────────────────────────────────────────────┐
│                   DATABASE MIGRATION STRATEGY                        │
│                                                                      │
│  Development                                                         │
│  ─────────────                                                       │
│  drizzle-kit generate ──► SQL files in drizzle/                      │
│  drizzle-kit migrate   ──► Apply to local DB                         │
│                                                                      │
│  CI (PR Pipeline)                                                    │
│  ─────────────────                                                   │
│  drizzle-kit migrate ──► Test DB ──► Run integration tests           │
│                                                                      │
│  CI (Main Pipeline)                                                  │
│  ──────────────────                                                  │
│  drizzle-kit migrate ──► Staging DB                                  │
│                                                                      │
│  CI (Release Pipeline)                                               │
│  ─────────────────────                                               │
│  pg_dump (backup) ──► drizzle-kit migrate ──► Production DB         │
│                        └── On failure: restore from backup           │
│                                                                      │
│  Migration Rules:                                                    │
│  • Every migration must be backward-compatible (expand/contract)     │
│  • No destructive operations without backup                          │
│  • Large tables: use batched migrations                              │
│  • Rollback scripts must exist for every migration                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 10.2 Drizzle Migration Setup

```typescript
// packages/db/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

```typescript
// packages/db/package.json scripts
{
  "scripts": {
    "generate": "drizzle-kit generate",
    "migrate": "drizzle-kit migrate",
    "migrate:status": "drizzle-kit migrate --help",
    "push": "drizzle-kit push",
    "studio": "drizzle-kit studio",
    "seed": "tsx ./seeds/index.ts",
    "backup": "pg_dump -Fc -f ./backups/manual.dump"
  }
}
```

### 10.3 Safe Migration Example

```sql
-- drizzle/0001_add_workspace_members.sql
-- ─── Safe migration: expand phase ────────────────────────────

-- Step 1: Create new table (no impact on existing queries)
CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Step 2: Create indexes concurrently (non-blocking)
CREATE INDEX CONCURRENTLY idx_workspace_members_workspace_id
    ON workspace_members(workspace_id);
CREATE INDEX CONCURRENTIX CONCURRENTLY idx_workspace_members_user_id
    ON workspace_members(user_id);

-- Step 3: Backfill data from existing columns (if migrating from old schema)
INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
SELECT id, owner_id, 'owner', created_at
FROM workspaces
WHERE owner_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ─── NOT doing drop in this migration ────────────────────────
-- The old columns stay until a follow-up "contract" migration
-- confirms no code references them anymore.
```

### 10.4 Rollback Strategy

```typescript
// packages/db/rollback.config.ts

export const rollbackStrategies = {
  // Automatic: detect destructive operations
  destructive_check: {
    // Warn or fail if migration drops tables/columns
    enabled: true,
    blocks: ['DROP TABLE', 'DROP COLUMN', 'TRUNCATE'],
  },

  // Manual: provide rollback SQL for each migration
  rollback_scripts: {
    enabled: true,
    directory: './drizzle/rollbacks/',
  },

  // Backup: always before production
  backup_before_migrate: {
    enabled: true,
    retention_days: 30,
  },
};
```

```bash
# Manual rollback procedure
# 1. Stop the application (Cloudflare: remove routes temporarily)
# 2. Restore database from backup
PGPASSWORD=$PROD_PASSWORD pg_restore \
  -h $PROD_DB_HOST \
  -U $PROD_DB_USER \
  -d sprintio_prod \
  --clean \
  --if-exists \
  backup-1.5.0.dump

# 3. Redeploy previous version
git checkout v1.4.0
pnpm turbo build
wrangler deploy --env production
```

---

## 11. Secrets Management

### 11.1 Secrets Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    SECRETS MANAGEMENT                                 │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   GitHub Secrets                             │    │
│  │                                                              │    │
│  │  Repository Secrets:                                         │    │
│  │  ├── TURBO_TOKEN          — Turborepo remote cache          │    │
│  │  ├── TURBO_TEAM           — Turborepo team ID               │    │
│  │  ├── CF_API_TOKEN         — Cloudflare API token            │    │
│  │  ├── CF_ACCOUNT_ID        — Cloudflare account ID           │    │
│  │  ├── DOCKERHUB_USERNAME   — Docker Hub username             │    │
│  │  ├── DOCKERHUB_TOKEN      — Docker Hub access token         │    │
│  │  └── SLACK_DEPLOY_WEBHOOK — Slack webhook URL               │    │
│  │                                                              │    │
│  │  Environment: staging                                       │    │
│  │  ├── STAGING_DATABASE_URL — PostgreSQL connection string    │    │
│  │  ├── STAGING_API_URL      — Backend API URL                 │    │
│  │  └── STAGING_FRONTEND_URL— Frontend URL                     │    │
│  │                                                              │    │
│  │  Environment: production                                    │    │
│  │  ├── PROD_DATABASE_URL    — PostgreSQL connection string    │    │
│  │  ├── PROD_API_URL         — Backend API URL                 │    │
│  │  ├── PROD_FRONTEND_URL   — Frontend URL                     │    │
│  │  ├── PROD_DB_HOST         — Database host                   │    │
│  │  ├── PROD_DB_USER         — Database user                   │    │
│  │  └── PROD_DB_PASSWORD     — Database password               │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │               Cloudflare Secrets (wrangler secret)          │    │
│  │                                                              │    │
│  │  Worker: sprintio-api-staging                               │    │
│  │  ├── DATABASE_URL    — Staging DB connection                │    │
│  │  ├── JWT_SECRET      — JWT signing key (staging)            │    │
│  │  ├── R2_ACCESS_KEY   — R2 storage access key                │    │
│  │  └── R2_SECRET_KEY   — R2 storage secret key                │    │
│  │                                                              │    │
│  │  Worker: sprintio-api (production)                          │    │
│  │  ├── DATABASE_URL    — Production DB connection             │    │
│  │  ├── JWT_SECRET      — JWT signing key (production)         │    │
│  │  ├── R2_ACCESS_KEY   — R2 storage access key                │    │
│  │  └── R2_SECRET_KEY   — R2 storage secret key                │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                 Local Development                            │    │
│  │                                                              │    │
│  │  .env.local          — Local overrides (git-ignored)        │    │
│  │  .env.example        — Template (committed)                 │    │
│  │  .env.test           — Test overrides (committed)           │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 11.2 Wrangler Secrets Commands

```bash
# ─── Setting Cloudflare Worker Secrets ───────────────────────

# Staging
wrangler secret put DATABASE_URL --env staging
wrangler secret put JWT_SECRET --env staging
wrangler secret put R2_ACCESS_KEY --env staging
wrangler secret put R2_SECRET_KEY --env staging

# Production
wrangler secret put DATABASE_URL --env production
wrangler secret put JWT_SECRET --env production
wrangler secret put R2_ACCESS_KEY --env production
wrangler secret put R2_SECRET_KEY --env production

# ─── Listing secrets (names only, values are hidden) ─────────
wrangler secret list --env staging
wrangler secret list --env production
```

### 11.3 GitHub Environment Configuration

```yaml
# .github/environments/staging.yml
protection_rules:
  - required_reviewers: []  # Auto-deploy on main push
  deployment_branch_policy:
    protected_branches: false
    custom_branch_policies:
      - main

# .github/environments/production.yml
protection_rules:
  - required_reviewers:
      - deploy-team
  deployment_branch_policy:
    protected_branches: false
    custom_branch_policies:
      - main
      - "release/*"
```

---

## 12. Monitoring & Rollback

### 12.1 Deploy Monitoring Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    DEPLOY MONITORING                                      │
│                                                                          │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐         │
│  │  Deploy Event  │───►│ Health Checks  │───►│  Notification  │         │
│  │  (GitHub)      │    │ (Post-deploy)  │    │  (Slack)       │         │
│  └────────────────┘    └────────┬───────┘    └────────────────┘         │
│                                 │                                        │
│                          ┌──────┴──────┐                                │
│                          │             │                                │
│                     ┌────▼────┐  ┌─────▼─────┐                         │
│                     │  PASS   │  │   FAIL    │                         │
│                     └────┬────┘  └─────┬─────┘                         │
│                          │             │                                │
│                          ▼             ▼                                │
│                   ┌──────────┐  ┌──────────────┐                       │
│                   │ ✅ Done  │  │ 🚨 Auto      │                       │
│                   │ Notify   │  │ Rollback     │                       │
│                   │ Success  │  │ + Alert      │                       │
│                   └──────────┘  └──────────────┘                       │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │                    Rollback Triggers                          │       │
│  │                                                              │       │
│  │  Automatic Rollback:                                        │       │
│  │  ├── Health check fails 3 consecutive times                 │       │
│  │  ├── Error rate > 5% for 2 minutes post-deploy             │       │
│  │  ├── Response time p99 > 5s for 2 minutes                  │       │
│  │  └── 5xx rate > 10% for 1 minute                           │       │
│  │                                                              │       │
│  │  Manual Rollback:                                           │       │
│  │  ├── Run rollback workflow via GitHub Actions                │       │
│  │  ├── Select target version from dropdown                    │       │
│  │  └── Confirm with team lead                                 │       │
│  │                                                              │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Rollback Workflow

```yaml
# .github/workflows/rollback.yml

name: 'Rollback'

on:
  workflow_dispatch:
    inputs:
      service:
        description: 'Service to rollback'
        required: true
        type: choice
        options:
          - frontend
          - backend
          - all
      version:
        description: 'Target version (git tag or commit SHA)'
        required: true
        type: string
      reason:
        description: 'Rollback reason'
        required: true
        type: string

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9'

jobs:
  validate:
    name: 'Validate Rollback'
    runs-on: ubuntu-latest
    environment:
      name: production
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.version }}

      - name: Validate version exists
        run: |
          if ! git rev-parse "${{ inputs.version }}" >/dev/null 2>&1; then
            echo "❌ Version ${{ inputs.version }} not found"
            exit 1
          fi
          echo "✅ Version validated"

  rollback-backend:
    name: 'Rollback Backend'
    if: inputs.service == 'backend' || inputs.service == 'all'
    needs: validate
    runs-on: ubuntu-latest
    environment:
      name: production
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.version }}

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build --filter=api

      - name: Deploy previous version
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          workingDirectory: apps/api
          command: deploy --env production

  rollback-frontend:
    name: 'Rollback Frontend'
    if: inputs.service == 'frontend' || inputs.service == 'all'
    needs: validate
    runs-on: ubuntu-latest
    environment:
      name: production
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.version }}

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build --filter=web

      - name: Rollback Frontend
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: pages deploy ./apps/web/dist --project-name=sprintio

  db-rollback:
    name: 'Database Rollback'
    if: inputs.service == 'all'
    needs: validate
    runs-on: ubuntu-latest
    environment:
      name: production
    steps:
      - name: Download backup
        uses: actions/download-artifact@v4
        with:
          name: db-backup-${{ inputs.version }}
          path: ./

      - name: Restore database
        run: |
          echo "⚠️ Restoring database from backup..."
          PGPASSWORD=${{ secrets.PROD_DB_PASSWORD }} pg_restore \
            -h ${{ secrets.PROD_DB_HOST }} \
            -U ${{ secrets.PROD_DB_USER }} \
            -d sprintio_prod \
            --clean \
            --if-exists \
            --no-owner \
            backup-${{ inputs.version }}.dump

  notify:
    name: 'Rollback Notification'
    needs: [rollback-backend, rollback-frontend]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Slack Rollback Alert
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_DEPLOY_WEBHOOK }}
          webhook-type: incoming-webhook
          payload: |
            {
              "text": "⚠️ Sprintio Production Rollback",
              "blocks": [
                {
                  "type": "header",
                  "text": { "type": "plain_text", "text": "⚠️ Production Rollback" }
                },
                {
                  "type": "section",
                  "fields": [
                    { "type": "mrkdwn", "text": "*Rolled back to:* ${{ inputs.version }}" },
                    { "type": "mrkdwn", "text": "*Service:* ${{ inputs.service }}" },
                    { "type": "mrkdwn", "text": "*Reason:* ${{ inputs.reason }}" },
                    { "type": "mrkdwn", "text": "*Triggered by:* ${{ github.actor }}" }
                  ]
                }
              ]
            }
```

### 12.3 Health Check Implementation

```typescript
// apps/api/src/health.ts

import { Router } from 'express';
import { db } from '@sprintio/db';

const router = Router();

// Basic liveness check
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || 'unknown',
    environment: process.env.ENVIRONMENT || 'development',
  });
});

// Readiness check (includes DB connectivity)
router.get('/health/ready', async (_req, res) => {
  const checks: Record<string, { status: string; latencyMs: number }> = {};

  // Database check
  const dbStart = Date.now();
  try {
    await db.execute(`SELECT 1`);
    checks.database = {
      status: 'ok',
      latencyMs: Date.now() - dbStart,
    };
  } catch {
    checks.database = {
      status: 'error',
      latencyMs: Date.now() - dbStart,
    };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === 'ok');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };
```

---

## 13. Quick Reference Cheat Sheet

### 13.1 Pipeline Commands

```bash
# ─── Local Development ────────────────────────────────────────
pnpm turbo lint typecheck              # Lint + typecheck all
pnpm turbo test                        # Run all unit tests
pnpm turbo test --filter=web           # Run frontend tests only
pnpm turbo test --filter=api           # Run backend tests only
pnpm turbo test:integration --filter=api  # Run integration tests
pnpm turbo build                       # Build all packages
pnpm turbo dev                         # Start all dev servers

# ─── Affected-Only Execution ─────────────────────────────────
pnpm turbo lint typecheck test build \
  --filter="...[origin/main]"          # Only what changed since main

pnpm turbo run build --dry \
  --filter="...[origin/main]"          # Preview what would run

# ─── Database Migrations ─────────────────────────────────────
pnpm --filter @sprintio/db generate    # Generate migration from schema changes
pnpm --filter @sprintio/db migrate     # Apply pending migrations
pnpm --filter @sprintio/db seed        # Seed database
pnpm --filter @sprintio/db push        # Push schema directly (dev only)

# ─── Cloudflare Deploy ───────────────────────────────────────
wrangler deploy --env staging          # Deploy backend to staging
wrangler deploy --env production       # Deploy backend to production
wrangler pages deploy ./dist \
  --project-name=sprintio-staging      # Deploy frontend to staging

# ─── Docker ──────────────────────────────────────────────────
docker build -f infra/docker/ai-sidecar.Dockerfile \
  -t sprintio-ai-sidecar:local .       # Build AI sidecar locally
docker build -f infra/docker/api.Dockerfile \
  -t sprintio-api:local apps/api/      # Build API locally

# ─── Turborepo Cache ─────────────────────────────────────────
pnpm turbo login                       # Login to Turborepo remote cache
pnpm turbo logout
pnpm turbo run build --force           # Force rebuild (ignore cache)
```

### 13.2 Pipeline Stage Matrix

```
┌─────────────────────┬───────────┬──────────────┬──────────────┬──────────────┐
│ Stage               │ PR        │ Main         │ Release      │ Time Target  │
├─────────────────────┼───────────┼──────────────┼──────────────┼──────────────┤
│ Change Detection    │ ✓         │ —            │ —            │ < 10s        │
│ Lint & TypeCheck    │ ✓         │ ✓            │ ✓ (reuse)    │ < 2min       │
│ Unit Tests          │ ✓         │ ✓            │ ✓ (reuse)    │ < 3min       │
│ Integration Tests   │ —         │ ✓            │ ✓ (reuse)    │ < 5min       │
│ E2E Tests           │ —         │ ✓            │ ✓ (reuse)    │ < 8min       │
│ Build               │ ✓         │ ✓            │ ✓            │ < 5min       │
│ DB Migrations       │ —         │ ✓ (staging)  │ ✓ (prod)     │ < 1min       │
│ Deploy Frontend     │ —         │ ✓ (staging)  │ ✓ (prod)     │ < 2min       │
│ Deploy Backend      │ —         │ ✓ (staging)  │ ✓ (prod)     │ < 2min       │
│ Docker Build        │ —         │ ✓            │ ✓            │ < 5min       │
│ Health Check        │ —         │ ✓            │ ✓            │ < 2min       │
│ Notification        │ —         │ ✓            │ ✓            │ < 30s        │
├─────────────────────┼───────────┼──────────────┼──────────────┼──────────────┤
│ TOTAL               │ < 5min    │ < 15min      │ < 20min      │              │
└─────────────────────┴───────────┴──────────────┴──────────────┴──────────────┘
```

### 13.3 Secrets Quick Reference

```
┌──────────────────────────┬────────────────────────────┬──────────────────────┐
│ Secret                   │ Where                      │ How to Update        │
├──────────────────────────┼────────────────────────────┼──────────────────────┤
│ TURBO_TOKEN              │ GitHub Repository Secrets   │ GitHub UI / CLI      │
│ TURBO_TEAM               │ GitHub Repository Secrets   │ GitHub UI / CLI      │
│ CF_API_TOKEN             │ GitHub Repository Secrets   │ GitHub UI / CLI      │
│ CF_ACCOUNT_ID            │ GitHub Repository Secrets   │ GitHub UI / CLI      │
│ DOCKERHUB_USERNAME       │ GitHub Repository Secrets   │ GitHub UI / CLI      │
│ DOCKERHUB_TOKEN          │ GitHub Repository Secrets   │ GitHub UI / CLI      │
│ SLACK_DEPLOY_WEBHOOK     │ GitHub Repository Secrets   │ GitHub UI / CLI      │
│ STAGING_DATABASE_URL     │ GitHub Env: staging         │ GitHub UI / CLI      │
│ PROD_DATABASE_URL        │ GitHub Env: production      │ GitHub UI / CLI      │
│ DATABASE_URL (staging)   │ Cloudflare Worker Secrets   │ wrangler secret put  │
│ JWT_SECRET (staging)     │ Cloudflare Worker Secrets   │ wrangler secret put  │
│ DATABASE_URL (prod)      │ Cloudflare Worker Secrets   │ wrangler secret put  │
│ JWT_SECRET (prod)        │ Cloudflare Worker Secrets   │ wrangler secret put  │
│ R2_ACCESS_KEY            │ Cloudflare Worker Secrets   │ wrangler secret put  │
│ R2_SECRET_KEY            │ Cloudflare Worker Secrets   │ wrangler secret put  │
└──────────────────────────┴────────────────────────────┴──────────────────────┘
```

### 13.4 File Structure Reference

```
.github/
├── workflows/
│   ├── ci-pr.yml              # PR pipeline (lint, test, build)
│   ├── ci-main.yml            # Main pipeline (full + deploy staging)
│   ├── ci-release.yml         # Release pipeline (deploy production)
│   ├── ci-docker.yml          # Docker build workflow (reusable)
│   ├── _test-suite.yml        # Reusable test suite
│   └── rollback.yml           # Manual rollback workflow
├── environments/
│   ├── staging.yml            # Staging environment config
│   └── production.yml         # Production environment config
└── CODEOWNERS                 # Code review assignments

turbo.json                     # Turborepo pipeline configuration
pnpm-workspace.yaml            # pnpm workspace definition
.env.example                   # Environment variable template
.env.test                      # Test environment variables
```

---

> **Document Version History**
>
> | Version | Date       | Author   | Changes                    |
> | ------- | ---------- | -------- | -------------------------- |
> | 1.0     | 2026-07-09 | Sprintio | Initial CI/CD architecture |
