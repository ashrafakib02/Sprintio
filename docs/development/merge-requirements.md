# Merge Requirements

> **Sprintio** — Mandatory requirements that must be satisfied before any pull request can be merged.

```
Version : 1.0
Date    : 2026-07-09
Status  : DRAFT
```

---

## Table of Contents

1. [Overview](#1-overview)
2. [CI Checks](#2-ci-checks)
3. [Code Review](#3-code-review)
4. [Branch Hygiene](#4-branch-hygiene)
5. [Commit Standards](#5-commit-standards)
6. [Test Coverage](#6-test-coverage)
7. [Merge Strategy](#7-merge-strategy)
8. [Checklist](#8-merge-checklist)

---

## 1. Overview

Every pull request in Sprintio must satisfy all requirements below before it can be merged. These are enforced by GitHub branch protection rules, CI automation, and code review policies.

### Merge Policy by Branch

| Requirement             | `develop`   | `main`      |
| ----------------------- | ----------- | ----------- |
| CI passes (all jobs)    | Required    | Required    |
| Code review approval    | 1 approval  | 2 approvals |
| No merge conflicts      | Required    | Required    |
| Branch up-to-date       | Required    | Required    |
| Linear history          | Required    | Required    |
| Commit convention       | Enforced    | Enforced    |
| Coverage threshold      | 80% minimum | 80% minimum |
| Conversation resolution | Required    | Required    |

---

## 2. CI Checks

All CI jobs must pass before a PR can be merged. This is enforced by GitHub branch protection rules.

### Required Status Checks

| Job                | What It Validates                  | Failure Means                          |
| ------------------ | ---------------------------------- | -------------------------------------- |
| **`lint`**         | ESLint rules + Prettier formatting | Code style violations                  |
| **`type-check`**   | TypeScript strict type checking    | Type errors in the codebase            |
| **`test`**         | Unit tests pass + 80% coverage     | Failing tests or insufficient coverage |
| **`build`**        | Production build succeeds          | Build-breaking changes                 |
| **`Quality Gate`** | All of the above passed            | Aggregate gate failure                 |

### What Happens on Failure

1. The merge button is **greyed out** — merging is blocked
2. CI will **re-run automatically** when new commits are pushed
3. Stale CI results from old commits are **dismissed automatically**
4. Authors must **fix the failure** before requesting review

### Skipping CI (Never Recommended)

There is **no valid reason** to skip CI on Sprintio. If CI is broken due to infrastructure, escalate to the team rather than bypassing.

---

## 3. Code Review

Code review is mandatory for all changes. No exceptions.

### Approval Requirements

| Target Branch | Required Approvals | Who Can Approve                                     |
| ------------- | ------------------ | --------------------------------------------------- |
| `develop`     | 1                  | Any team member with write access                   |
| `main`        | 2                  | At least 1 must be a CODEOWNERS-designated reviewer |

### Review Quality Standards

A code review must evaluate:

| Category           | What to Check                                         |
| ------------------ | ----------------------------------------------------- |
| **Correctness**    | Does the code do what the PR description says?        |
| **Security**       | No SQL injection, XSS, auth bypass, secrets in code   |
| **Performance**    | No N+1 queries, unnecessary re-renders, memory leaks  |
| **Testing**        | Adequate test coverage for new code paths             |
| **Readability**    | Clear naming, appropriate comments, simple logic      |
| **Architecture**   | Follows established patterns, no unnecessary coupling |
| **Error handling** | Edge cases handled, graceful degradation              |

### Review Process

1. **Author** opens PR with clear description and links to issue
2. **CI runs** all quality checks (lint, types, tests, build)
3. **Reviewer(s)** examine code, leave comments
4. **Author** addresses feedback, pushes new commits
5. **Reviewer(s)** approve once satisfied
6. **All conversations** must be resolved
7. **Squash or rebase** merge is performed

### Review Turnaround

| Priority                  | Expected Turnaround                 |
| ------------------------- | ----------------------------------- |
| **Hotfix**                | Within 1 hour during business hours |
| **Regular PR**            | Within 4 business hours             |
| **Large PR (>500 lines)** | Within 8 business hours             |
| **Documentation**         | Within 24 hours                     |

---

## 4. Branch Hygiene

A PR must be in a clean, mergeable state.

### No Merge Conflicts

- PRs with merge conflicts **cannot be merged**
- Authors must **rebase or merge** the target branch into their PR branch
- CI re-runs automatically after conflict resolution
- Use `git rebase develop` (preferred) or merge `develop` into the feature branch

### Branch Must Be Up-to-Date

- GitHub enforces "Require branches to be up to date before merging"
- This ensures the PR is tested against the **latest** target branch
- Update with:

```bash
# Preferred: rebase (cleaner history)
git fetch origin
git rebase origin/develop

# Alternative: merge (if rebase is complex)
git merge origin/develop
```

### Stale PR Policy

| Age           | Action                                                    |
| ------------- | --------------------------------------------------------- |
| **< 7 days**  | Normal — author may be working on it                      |
| **7-14 days** | Bot comments: "This PR is stale — please update or close" |
| **> 14 days** | Auto-close if no activity (author can reopen)             |

---

## 5. Commit Standards

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This is enforced during code review and used by the automated release pipeline.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Allowed Types

| Type       | When to Use                       | Example                                  |
| ---------- | --------------------------------- | ---------------------------------------- |
| `feat`     | New feature                       | `feat(auth): add MFA support`            |
| `fix`      | Bug fix                           | `fix(api): handle null user in profile`  |
| `docs`     | Documentation only                | `docs: update deployment guide`          |
| `style`    | Formatting (no logic change)      | `style: fix indentation in config`       |
| `refactor` | Code restructure (no feature/fix) | `refactor(db): extract query builder`    |
| `perf`     | Performance improvement           | `perf(query): add index for user search` |
| `test`     | Adding or updating tests          | `test(auth): add token refresh tests`    |
| `chore`    | Build, deps, tooling              | `chore: update eslint to v9`             |
| `ci`       | CI/CD changes                     | `ci: add release workflow`               |
| `revert`   | Revert a previous commit          | `revert: feat(auth): add MFA support`    |

### Commit Message Rules

1. **Subject line** must be lowercase: `fix:` not `Fix:`
2. **Subject line** must end without a period
3. **Subject line** must be ≤ 72 characters
4. **Scope** is optional but recommended: `feat(web):`, `fix(api):`
5. **Body** is optional, wrapped at 80 characters
6. **Footer** must include `BREAKING CHANGE:` for breaking changes
7. **Footer** can reference issues: `Closes #123`, `Fixes #456`

### Examples

```bash
# Good
feat(auth): implement OAuth2 login with Google and GitHub
fix(api): prevent race condition in workspace creation
docs(architecture): add caching strategy diagram
chore(deps): bump @tanstack/react-query to v5.12.0

# Bad — these will be rejected in review
Fixed the login bug                    # No type, capitalized, no scope
update code                            # Meaningless description
feat: added new feature.               # Has trailing period
```

---

## 6. Test Coverage

Maintaining adequate test coverage prevents regressions and ensures code quality.

### Thresholds

| Metric                | Minimum | Target |
| --------------------- | ------- | ------ |
| **Line coverage**     | 80%     | 90%    |
| **Branch coverage**   | 80%     | 85%    |
| **Function coverage** | 80%     | 95%    |

### Enforcement

- Coverage is measured in the `test` CI job
- Coverage summary is generated as `coverage/coverage-summary.json`
- The pipeline **fails** if any metric drops below 80%
- Coverage reports are uploaded as artifacts for 14 days

### What Counts as Covered

- **Unit tests** — Direct function/method testing
- **Integration tests** — Database, API endpoint testing
- **Component tests** — React component rendering and interaction

### Coverage Exceptions

| Exception               | Process                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| **Generated code**      | Exclude from coverage via config (Drizzle, auto-generated types) |
| **Configuration files** | Exclude `*.config.*` from coverage                               |
| **Type definitions**    | Exclude `*.d.ts` — no runtime code                               |
| **Test helpers**        | Exclude test utilities from coverage calculation                 |

---

## 7. Merge Strategy

Sprintio uses **squash merge** as the default merge strategy to maintain a clean, linear git history.

### Why Squash Merge?

| Benefit            | Explanation                                           |
| ------------------ | ----------------------------------------------------- |
| **Clean history**  | One commit per feature/fix on the main/develop branch |
| **Easy revert**    | Each feature is a single commit to revert             |
| **Linear history** | No merge commit pollution                             |
| **CI-friendly**    | Each commit is independently testable                 |

### When to Use Each Strategy

| Strategy         | When                                                     |
| ---------------- | -------------------------------------------------------- |
| **Squash merge** | Default for all PRs (features, fixes, chores)            |
| **Rebase merge** | Rare — when preserving individual commits is important   |
| **Merge commit** | Never — prohibited by branch protection (linear history) |

### Squash Commit Message

When squash-merging, the resulting commit message follows the conventional commit format:

```
feat(auth): implement OAuth2 login (#123)

Adds Google and GitHub OAuth2 login support using passport.js.
Includes PKCE flow, token refresh, and account linking.

Closes #100
Closes #101
```

---

## 8. Merge Checklist

Use this checklist before approving a PR. All items must pass.

### For the Author

- [ ] PR description clearly explains the change and its motivation
- [ ] PR is linked to an issue or task (e.g., `Closes #123`)
- [ ] All CI checks are passing (lint, type-check, test, build)
- [ ] Branch is up-to-date with target (no merge conflicts)
- [ ] Commit messages follow conventional commit format
- [ ] New code has adequate test coverage (≥ 80%)
- [ ] No secrets, credentials, or API keys in the diff
- [ ] Breaking changes are documented in the PR description

### For the Reviewer

- [ ] Code does what the PR description claims
- [ ] No security vulnerabilities introduced
- [ ] No performance regressions (N+1 queries, unnecessary renders)
- [ ] Error handling is appropriate
- [ ] Tests cover the new logic paths
- [ ] Code follows established patterns and conventions
- [ ] Documentation is updated if behavior changed
- [ ] All conversations are resolved before approving

### For the Merger

- [ ] Required approvals are met (1 for develop, 2 for main)
- [ ] All status checks are green
- [ ] Use squash merge (default)
- [ ] Squash commit message is descriptive and follows convention

---

_Document maintained by the Sprintio engineering team._
