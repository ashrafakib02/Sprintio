# Release Strategy

> **Sprintio** — Versioning, branching, release cadence, and deployment procedures.

```
Version : 1.0
Date    : 2026-07-09
Status  : DRAFT
```

---

## Table of Contents

1. [Overview](#1-overview)
2. [Semantic Versioning](#2-semantic-versioning)
3. [Branching Model](#3-branching-model)
4. [Release Process](#4-release-process)
5. [Hotfix Process](#5-hotfix-process)
6. [Changelog Maintenance](#6-changelog-maintenance)
7. [Release Cadence](#7-release-cadence)
8. [Environment Promotion](#8-environment-promotion)
9. [Rollback Procedures](#9-rollback-procedures)

---

## 1. Overview

Sprintio follows a **trunk-based development** model with automated releases powered by [Semantic Release](https://github.com/semantic-release/semantic-release) and [Conventional Commits](https://www.conventionalcommits.org/).

### Key Principles

| Principle | Description |
|-----------|-------------|
| **Automated versioning** | Version numbers are determined by commit messages, not manual decisions |
| **Every merge to main is releasable** | The main branch is always in a deployable state |
| **Changelog is auto-generated** | Derived from conventional commits, reviewed before release |
| **Rollback is fast** | Any release can be rolled back in under 5 minutes |

---

## 2. Semantic Versioning

Sprintio strictly follows [Semantic Versioning 2.0.0](https://semver.org/).

### Version Format

```
MAJOR.MINOR.PATCH
```

| Component | Incremented When | Example |
|-----------|-----------------|---------|
| **MAJOR** | Breaking changes (incompatible API changes, data migrations, removed features) | `1.0.0` → `2.0.0` |
| **MINOR** | New features (backward-compatible) | `1.0.0` → `1.1.0` |
| **PATCH** | Bug fixes (backward-compatible) | `1.0.0` → `1.0.1` |

### Pre-release Versions

| Type | Format | Example | When |
|------|--------|---------|------|
| **Alpha** | `X.Y.Z-alpha.N` | `2.0.0-alpha.1` | Internal testing only |
| **Beta** | `X.Y.Z-beta.N` | `2.0.0-beta.3` | Limited external testing |
| **Release Candidate** | `X.Y.Z-rc.N` | `2.0.0-rc.1` | Final testing before stable |
| **Stable** | `X.Y.Z` | `2.0.0` | Production release |

### How Commits Drive Versioning

| Commit Type | Version Impact | Example |
|-------------|---------------|---------|
| `fix: ...` | PATCH bump | `1.0.0` → `1.0.1` |
| `feat: ...` | MINOR bump | `1.0.0` → `1.1.0` |
| `feat!: ...` or `BREAKING CHANGE:` | MAJOR bump | `1.0.0` → `2.0.0` |
| `chore: ...`, `docs: ...`, `ci: ...` | No bump | — |

---

## 3. Branching Model

### Branch Types

```
main ──────────────────────────────────────────────── Production releases
  ▲
  │ (squash merge)
  │
develop ────────────────────────────────────────────── Integration branch
  ▲         ▲
  │         │
  │         └── release/1.2.0 ──► release stabilization
  │
  ├── feature/SR-123-auth
  ├── feature/SR-124-dashboard
  ├── fix/SR-125-null-pointer
  └── chore/update-deps
```

### Branch Descriptions

| Branch | Purpose | Lifetime | Protection |
|--------|---------|----------|------------|
| `main` | Production-ready code | Permanent | Strictest (2 approvals, all CI) |
| `develop` | Integration of completed features | Permanent | Standard (1 approval, all CI) |
| `feature/*` | Individual feature development | Until merged to develop | None |
| `fix/*` | Bug fix development | Until merged to develop | None |
| `release/*` | Release stabilization | Until merged to main + develop | Standard (2 approvals) |
| `hotfix/*` | Emergency production fix | Until merged to main + develop | Expedited |

### Branch Lifecycle

```
1. Create feature branch from develop
2. Develop on the feature branch
3. Open PR → develop
4. CI passes + review approval
5. Squash merge to develop
6. Delete feature branch

...

7. When ready for release:
8. Create release/X.Y.Z from develop
9. Stabilize (only bugfix commits)
10. Open PR → main (2 approvals required)
11. Squash merge to main
12. Semantic-release creates version tag + GitHub Release
13. Merge release branch back to develop
14. Delete release branch
```

---

## 4. Release Process

### Automated Release (Default)

The automated release pipeline runs on every push to `main`:

```
PR merged to main
       │
       ▼
┌──────────────────┐
│  CI Gate         │  Lint + Typecheck + Test + Build
│  (all must pass) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Semantic Release │  Analyzes commits since last tag
│                  │  Determines version bump
└────────┬─────────┘
         │
         ├──── No releasable commits → No release
         │
         ▼
┌──────────────────┐
│  Version Bump    │  Updates package.json version
│  Changelog       │  Generates CHANGELOG.md from commits
│  Git Tag         │  Creates vX.Y.Z tag
│  GitHub Release  │  Publishes release with notes
└──────────────────┘
```

### Manual Release (Emergency / Override)

For cases where the automated pipeline cannot run:

```bash
# 1. Ensure you're on main and up-to-date
git checkout main
git pull origin main

# 2. Create a release branch from main
git checkout -b release/1.2.0

# 3. Run the release locally
npx semantic-release

# 4. Or manually:
#    a. Update version in package.json
#    b. Update CHANGELOG.md
#    c. Commit: "chore(release): 1.2.0"
#    d. Tag: git tag v1.2.0
#    e. Push: git push origin main --tags

# 5. Create GitHub Release manually
gh release create v1.2.0 --title "v1.2.0" --generate-notes
```

### Release Verification

After any release, verify:

- [ ] GitHub Release page shows the new version
- [ ] CHANGELOG.md is updated with all changes
- [ ] Git tag exists and points to the correct commit
- [ ] Deployment to staging succeeded
- [ ] Smoke tests pass on staging
- [ ] No errors in monitoring dashboards (5 minutes post-deploy)

---

## 5. Hotfix Process

Hotfixes address critical production issues and follow an expedited process.

### When to Hotfix

| Severity | Example | Process |
|----------|---------|---------|
| **P0 — Critical** | Service down, data loss, security breach | Hotfix immediately |
| **P1 — High** | Major feature broken, significant performance degradation | Hotfix within 4 hours |
| **P2 — Medium** | Minor feature broken, workaround available | Fix in next regular release |

### Hotfix Procedure

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/fix-critical-auth-bug

# 2. Make the minimal fix
# (smallest possible change to address the issue)
git add .
git commit -m "fix(auth): prevent token validation bypass

This fixes a critical vulnerability where expired tokens
were not properly rejected during validation.

Closes #789"

# 3. Open PR → main (use expedited review — 1 approval minimum)
# 4. After merge, semantic-release automatically:
#    - Bumps the patch version
#    - Creates a new tag (e.g., v1.2.1)
#    - Publishes a GitHub Release
#    - Triggers deployment
```

### Hotfix Rules

1. **Minimal change only** — fix the bug, no refactoring
2. **Expedited review** — 1 approval from any team member (vs. 2 for normal releases)
3. **Test the fix** — unit test for the specific bug must be included
4. **Cherry-pick back** — if the bug exists on develop, cherry-pick the fix
5. **Document the incident** — write a brief incident report

---

## 6. Changelog Maintenance

The CHANGELOG.md is **auto-generated** by semantic-release but can be manually curated for major releases.

### Auto-Generated Format

```markdown
# Changelog

## [2.0.0](https://github.com/ashrafakib02/Sprintio/compare/v1.5.0...v2.0.0) (2026-07-09)

### ⚠ BREAKING CHANGES

* **api:** Remove legacy v1 endpoints (#456)
* **auth:** Switch from JWT to opaque tokens (#460)

### Features

* **auth:** Add MFA support with TOTP (#440)
* **web:** Implement real-time collaboration with Yjs (#445)

### Bug Fixes

* **api:** Fix race condition in workspace creation (#448)
* **web:** Fix memory leak in rich text editor (#452)

---

## [1.5.0](https://github.com/ashrafakib02/Sprintio/compare/v1.4.2...v1.5.0) (2026-06-15)

### Features

* **dashboard:** Add burndown chart widget (#420)
* **search:** Implement full-text search with pgvector (#425)
```

### Changelog Sections

| Section | Commit Types |
|---------|-------------|
| **Breaking Changes** | `feat!:` or `BREAKING CHANGE:` footer |
| **Features** | `feat:` commits |
| **Bug Fixes** | `fix:` commits |
| **Performance** | `perf:` commits |
| **Documentation** | `docs:` commits (included in changelog but below the fold) |
| **Other** | `chore:`, `refactor:`, `test:`, `ci:` (linked in release, not detailed) |

### Manual Changelog Edits

For major releases, maintainers may manually edit CHANGELOG.md to:

- Add migration guides
- Highlight key changes for users
- Add screenshots or demo links
- Credit contributors

---

## 7. Release Cadence

### Recommended Cadence

| Release Type | Frequency | Target |
|-------------|-----------|--------|
| **Major** | As needed | Major milestones, breaking changes |
| **Minor** | Every 2-4 weeks | End of sprint |
| **Patch** | As needed | Bug fixes, security updates |
| **Hotfix** | Immediately | Critical production issues |

### Sprint-Based Releases

Sprintio follows a 2-week sprint cadence:

```
Sprint 1 (Jan 1-14)     → Release v1.1.0 (Jan 15)
Sprint 2 (Jan 15-28)    → Release v1.2.0 (Jan 29)
Sprint 3 (Jan 29-Feb 11) → Release v1.3.0 (Feb 12)
...
```

### Release Freeze Periods

| Period | Duration | Rule |
|--------|----------|------|
| **Holiday freeze** | Dec 20 - Jan 2 | No non-critical releases |
| **Quarterly review** | Last week of quarter | Stabilization only, no new features |
| **Post-major release** | 1 week after major | Monitor, no new majors |

---

## 8. Environment Promotion

Code flows through environments in order, with gates at each stage.

### Environment Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Local      │────►│   Staging    │────►│  Production  │
│   Dev        │     │              │     │              │
│              │     │  Deployed on │     │  Deployed on │
│  pnpm dev    │     │  every push  │     │  every tag   │
│  to main     │     │  to main     │     │  release     │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                            │                     │
                     Smoke tests           Health checks
                     E2E tests             Monitoring
                     Manual QA             User traffic
```

### Environment Details

| Environment | URL | Deploy Trigger | Data |
|-------------|-----|----------------|------|
| **Local** | `localhost:5173` | Manual | Seed data |
| **Staging** | `staging.sprintio.app` | Push to `main` | Anonymized production data |
| **Production** | `sprintio.app` | Semantic release (tag) | Real production data |

### Promotion Gates

#### Staging Deployment (Automatic)

Triggered on every push to `main`:

1. CI passes (all checks green)
2. Build succeeds
3. Database migrations run successfully
4. Application starts without errors
5. Smoke tests pass (basic API health, page loads)
6. **Auto-deploy** — no manual gate needed

#### Production Deployment (Semi-Automatic)

Triggered on semantic release (tag creation):

1. Staging deployment succeeded
2. E2E tests pass on staging
3. Manual QA sign-off (optional, recommended for minors/majors)
4. **Auto-deploy** for patch releases
5. **Manual approval** for minor/major releases (configurable)

### Deployment Verification

After deployment to any environment, verify:

```bash
# Health check
curl -f https://sprintio.app/api/health

# Response should be:
# {"status":"ok","version":"X.Y.Z","uptime":"..."}

# Quick smoke test
curl -s https://sprintio.app/api/v1/users/me | jq .
# Should return 401 (not found/error — proves API is responding)
```

---

## 9. Rollback Procedures

When a release causes issues, follow these procedures to roll back quickly.

### Rollback Decision Matrix

| Severity | Detection | Action | Timeline |
|----------|-----------|--------|----------|
| **Critical** (service down) | Monitoring alert | Roll back immediately | < 5 minutes |
| **High** (major regression) | User reports | Roll back within 30 minutes | < 30 minutes |
| **Medium** (minor regression) | Internal QA | Fix forward in next patch | Next release |
| **Low** (cosmetic issue) | User feedback | Fix forward | Backlog |

### Application Rollback (Cloudflare Pages/Workers)

#### Fast Rollback via Cloudflare Dashboard

1. Go to Cloudflare Dashboard → Pages/Workers
2. Select the Sprintio project
3. Navigate to **Deployments**
4. Find the last known good deployment
5. Click **...** → **Roll back to this deployment**

#### Rollback via Wrangler CLI

```bash
# List recent deployments
npx wrangler pages deployment list

# Roll back to a specific deployment
npx wrangler pages deployment rollback <deployment-id>

# Verify rollback
curl -f https://sprintio.app/api/health
```

#### Rollback via Git

```bash
# Find the last good release tag
git tag --sort=-v:refname | head -5
# v1.2.0
# v1.1.0
# v1.0.0

# Create a revert commit on main
git checkout main
git revert HEAD   # Revert the bad commit
git push origin main

# This triggers:
# 1. CI pipeline runs
# 2. Semantic-release creates a new patch (e.g., v1.2.1)
# 3. New deployment is triggered
```

### Database Rollback

Database rollbacks are more complex and must be planned.

#### Migration Rollback

```bash
# Rollback the last migration
pnpm --filter @sprintio/db migrate:rollback

# Or rollback to a specific migration
pnpm --filter @sprintio/db migrate:rollback --to <migration-name>
```

#### Point-in-Time Recovery (Neon DB)

For PostgreSQL (Neon):

1. Go to Neon Dashboard → Select project
2. Navigate to **Reset**
3. Choose **Reset to specific time** (before the bad migration)
4. Confirm the rollback

> **Warning:** Point-in-time recovery restores the entire database to the chosen time. Any data written after that time is lost. Use with caution.

### Rollback Checklist

- [ ] Identify the failing release/commit
- [ ] Notify the team (Slack/Teams)
- [ ] Execute application rollback
- [ ] Execute database rollback if needed
- [ ] Verify health checks pass
- [ ] Monitor error rates for 15 minutes
- [ ] Write incident report (if P0/P1)
- [ ] Create fix or revert PR for develop branch
- [ ] Post-mortem if customer impact occurred

### Rollback Communication

| Stakeholder | Channel | Message Template |
|-------------|---------|-----------------|
| **Engineering** | Slack #incidents | "⚠️ Rolling back v1.2.0 to v1.1.0 due to [issue]. ETA: 5 minutes." |
| **Support** | Slack #support | "We're rolling back a recent update. Known issues: [list]. Workaround: [if any]." |
| **Users** | Status page | "We identified an issue and have rolled back to a stable version. All services are operational." |

---

## Quick Reference

| Concept | Sprintio Convention |
|---------|-------------------|
| **Versioning** | Semantic Versioning 2.0.0 |
| **Commit format** | Conventional Commits |
| **Version automation** | semantic-release |
| **Release trigger** | Push to `main` (squash merge from develop) |
| **Changelog** | Auto-generated by semantic-release |
| **Tag format** | `vX.Y.Z` |
| **Deployment** | Cloudflare Pages (web) + Workers (API) |
| **Rollback** | Cloudflare dashboard or `git revert` |
| **Hotfix** | Branch from `main`, expedited review (1 approval) |
| **Cadence** | Biweekly minor releases, patches as needed |

---

*Document maintained by the Sprintio engineering team.*
