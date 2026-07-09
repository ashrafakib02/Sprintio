# Branching Strategy

> Sprintio follows **Git Flow** — a branching model designed around project releases that provides a robust framework for managing larger projects.

---

## Table of Contents

- [Branch Types](#branch-types)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Branch Lifecycle](#branch-lifecycle)
- [Merge Strategy](#merge-strategy)
- [Example Workflows](#example-workflows)
- [Rules](#rules)

---

## Branch Types

```
main (production)
│
├── release/v1.2.0 ──────────────────────► (merge + tag)
│
└── develop (integration)
    │
    ├── feat/user-auth ─────────────────► (squash merge)
    ├── feat/dark-mode ─────────────────► (squash merge)
    ├── fix/sprint-timer ───────────────► (squash merge)
    └── docs/api-reference ─────────────► (squash merge)
```

### `main` — Production

| Property       | Value                                    |
| -------------- | ---------------------------------------- |
| **Purpose**    | Reflects the production-ready state     |
| **Protected**  | Yes — no direct commits                  |
| **Receives**   | Merge commits from `release/*` and `hotfix/*` |
| **Deploys**    | Auto-deploys to production               |

### `develop` — Integration

| Property       | Value                                    |
| -------------- | ---------------------------------------- |
| **Purpose**    | Integration branch for next release      |
| **Protected**  | Recommended — PRs only                   |
| **Receives**   | Squash merges from `feature/*`, `bugfix/*`, `docs/*`, `chore/*` |
| **Deploys**    | Auto-deploys to staging/preview          |

### `feature/*` — New Features

| Property       | Value                                    |
| -------------- | ---------------------------------------- |
| **Purpose**    | Develop new features                     |
| **Branches from** | `develop`                             |
| **Merges into** | `develop` (squash merge)                |
| **Naming**     | `feat/<short-description>`               |

### `bugfix/*` — Bug Fixes (non-urgent)

| Property       | Value                                    |
| -------------- | ---------------------------------------- |
| **Purpose**    | Fix non-critical bugs on develop         |
| **Branches from** | `develop`                             |
| **Merges into** | `develop` (squash merge)                |
| **Naming**     | `fix/<short-description>`                |

### `release/*` — Release Preparation

| Property       | Value                                    |
| -------------- | ---------------------------------------- |
| **Purpose**    | Finalize a release (version bump, changelog, QA) |
| **Branches from** | `develop`                             |
| **Merges into** | `main` AND back-merges into `develop`  |
| **Naming**     | `release/v<semver>`                      |
| **Tagged**     | Yes — creates a Git tag                  |

### `hotfix/*` — Emergency Fixes

| Property       | Value                                    |
| -------------- | ---------------------------------------- |
| **Purpose**    | Fix critical bugs in production          |
| **Branches from** | `main`                               |
| **Merges into** | `main` AND back-merges into `develop`  |
| **Naming**     | `hotfix/<short-description>`             |
| **Tagged**     | Yes — creates a Git tag                  |

---

## Branch Naming Conventions

### Format

```
<type>/<short-description>
```

### Rules

1. **Type** must be one of: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `release`, `hotfix`
2. **Description** uses lowercase kebab-case
3. **Description** should be 2-4 words max
4. **No** special characters other than hyphens
5. **No** trailing slashes

### Examples

| Good                        | Bad                              |
| --------------------------- | -------------------------------- |
| `feat/user-authentication`  | `feat/User_Authentication`      |
| `fix/sprint-timer-drift`    | `fix sprint timer`              |
| `docs/api-rate-limiting`     | `docs/API Rate Limiting`        |
| `chore/update-dependencies` | `chore/update_deps!!`           |
| `release/v1.2.0`            | `release/v1.2`                  |

---

## Branch Lifecycle

### Feature Branch

```
1. git checkout develop && git pull origin develop
2. git checkout -b feat/my-feature
3. [develop — commit, push, create PR]
4. PR review & approval
5. Squash merge into develop
6. Delete feature branch
```

### Release Branch

```
1. git checkout develop && git pull origin develop
2. git checkout -b release/v1.2.0
3. [QA, bugfixes, version bump, changelog]
4. PR to main → merge commit
5. Tag: git tag v1.2.0
6. Back-merge into develop
7. Delete release branch
```

### Hotfix Branch

```
1. git checkout main && git pull origin main
2. git checkout -b hotfix/critical-fix
3. [Fix — commit, push, create PR]
4. PR to main → merge commit
5. Tag: git tag v1.2.1
6. Back-merge into develop
7. Delete hotfix branch
```

---

## Merge Strategy

| Source Branch      | Target Branch | Strategy          | Rationale                          |
| ------------------ | ------------- | ----------------- | ---------------------------------- |
| `feat/*`           | `develop`     | **Squash merge**  | Clean, atomic commits on develop   |
| `fix/*`            | `develop`     | **Squash merge**  | Same as feature                    |
| `docs/*`           | `develop`     | **Squash merge**  | Same as feature                    |
| `chore/*`          | `develop`     | **Squash merge**  | Same as feature                    |
| `release/*`        | `main`        | **Merge commit**  | Preserve full release history      |
| `release/*`        | `develop`     | **Merge commit**  | Sync release changes back          |
| `hotfix/*`         | `main`        | **Merge commit**  | Preserve hotfix history            |
| `hotfix/*`         | `develop`     | **Merge commit**  | Sync hotfix changes back           |

### Why Squash for Features?

- Keeps `develop` history linear and clean
- Each feature = one meaningful commit
- Easy to revert entire features
- Avoids noise from WIP/fixup commits

### Why Merge for Releases & Hotfixes?

- Preserves the full history of what happened during the release
- Hotfixes need clear traceability to production incidents
- Release branches may contain many small commits that are meaningful together

---

## Example Workflows

### Scenario 1: Building a New Feature

```bash
# 1. Start from develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feat/sprint-reporting

# 3. Develop (multiple commits ok)
git add .
git commit -m "feat(reports): scaffold report generation module"
git push -u origin feat/sprint-reporting

# ... more work ...

git add .
git commit -m "feat(reports): implement burndown chart generation"
git push

# 4. Create PR → develop
#    Fill out PR template, request review

# 5. After approval, squash merge via GitHub

# 6. Clean up
git checkout develop
git pull origin develop
git branch -d feat/sprint-reporting
```

### Scenario 2: Preparing a Release

```bash
# 1. Create release branch from develop
git checkout develop
git checkout -b release/v1.0.0

# 2. Bump version
pnpm version 1.0.0 --no-git-tag-version
git add package.json
git commit -m "chore(release): bump version to v1.0.0"

# 3. QA and final bugfixes on this branch
git commit -m "fix(reports): correct timezone offset in charts"

# 4. Create PR → main
#    After approval, merge commit

# 5. Tag the release
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# 6. Back-merge into develop
git checkout develop
git merge main
git push origin develop

# 7. Clean up
git branch -d release/v1.0.0
```

### Scenario 3: Emergency Hotfix

```bash
# 1. Create hotfix from main
git checkout main
git checkout -b hotfix/fix-login-crash

# 2. Fix and test
git add .
git commit -m "fix(auth): prevent crash on malformed JWT token"

# 3. Create PR → main
#    After approval, merge commit

# 4. Tag
git checkout main
git tag -a v1.0.1 -m "Hotfix v1.0.1: Fix login crash"
git push origin v1.0.1

# 5. Back-merge into develop
git checkout develop
git merge main
git push origin develop

# 6. Clean up
git branch -d hotfix/fix-login-crash
```

---

## Rules

1. **Never commit directly to `main` or `develop`** — always use PRs
2. **Always branch from the correct parent**:
   - Features, bugfixes, chores → from `develop`
   - Releases → from `develop`
   - Hotfixes → from `main`
3. **Keep feature branches short-lived** — aim for < 1 week
4. **Rebase before requesting review** — ensure no merge conflicts
5. **Delete branches after merge** — keeps the repo clean
6. **Tag every release** — use [Semantic Versioning](https://semver.org/):
   - `vMAJOR.MINOR.PATCH` (e.g., `v1.2.3`)
7. **Update documentation** as part of your PR, not in a separate PR
8. **One concern per PR** — don't bundle unrelated changes

---

## Quick Reference

```
main        ← production releases (merge commit from release/* and hotfix/*)
  │
  └─ develop ← integration (squash merge from feat/*, fix/*, docs/*)
       │
       ├─ feat/*       → develop  (squash)
       ├─ fix/*        → develop  (squash)
       ├─ docs/*       → develop  (squash)
       ├─ chore/*      → develop  (squash)
       ├─ release/*    → main + develop  (merge)
       └─ hotfix/*     → main + develop  (merge)
```
