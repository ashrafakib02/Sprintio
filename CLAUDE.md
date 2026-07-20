# Sprintio

Sprint management platform — pnpm monorepo with Turborepo.

## Quick Commands

```bash
pnpm dev            # Start all apps in parallel
pnpm build          # Build all packages
pnpm typecheck      # Type-check all packages
pnpm test -- --coverage  # Run tests with coverage
pnpm lint           # ESLint
pnpm format:check   # Prettier check
pnpm format         # Prettier write (auto-fix)
```

## Project Structure

- `apps/backend` — Express API server
- `apps/web` — React + TanStack Router frontend
- `apps/ai` — Python FastAPI AI service
- `packages/db` — Drizzle ORM schemas, connection, and migrations
- `packages/shared` — Shared types, schemas, utils, errors
- `packages/config` — Shared tsconfig, eslint, turbo configs

## Key Rules

1. **Conventional commits** — `fix(api): ...`, `feat(auth): ...` (subject ≤72 chars)
2. **Prettier locked** — semi, singleQuote, trailingComma: all, printWidth: 100
3. **TypeScript strict** — all packages use NodeNext module resolution
4. **packages/api typecheck** — must build shared first: `pnpm --filter @sprintio/shared build && tsc --noEmit`
5. **CI gate** — lint + typecheck + test + build must all pass

## Detailed Config

See `.claude/memory/MEMORY.md` for full locked settings and rationale.
