# Branch Protection Rules

> **Sprintio** — Branch protection and access control configuration guide.

```
Version : 1.0
Date    : 2026-07-09
Status  : DRAFT
```

---

## Table of Contents

1. [Overview](#1-overview)
2. [Main Branch Protection](#2-main-branch-protection)
3. [Develop Branch Protection](#3-develop-branch-protection)
4. [Release Branch Protection](#4-release-branch-protection)
5. [Admin Override Policy](#5-admin-override-policy)
6. [GitHub Configuration Steps](#6-github-configuration-steps)
7. [Branch Naming Conventions](#7-branch-naming-conventions)

---

## 1. Overview

Branch protection rules enforce quality gates at the Git hosting level, preventing direct pushes and ensuring all code changes go through the proper review and CI pipeline. These rules are configured in **Settings > Branches > Add rule** on GitHub.

### Protection Philosophy

| Principle                                  | Rationale                                          |
| ------------------------------------------ | -------------------------------------------------- |
| **No direct pushes to protected branches** | Every change must be reviewed and tested           |
| **CI must pass before merge**              | Prevents regressions from entering stable branches |
| **Approvals required**                     | At least one other engineer validates the change   |
| **Linear history**                         | Keeps git log clean and bisectable                 |

---

## 2. Main Branch Protection

The `main` branch represents production-ready code. It has the strictest protections.

### Rule: `main`

```
Branch name pattern:  main
```

| Setting                                   | Value                                                 | Rationale                                     |
| ----------------------------------------- | ----------------------------------------------------- | --------------------------------------------- |
| **Require a pull request before merging** | ✓                                                     | No direct pushes                              |
| **Required approvals**                    | 2                                                     | Two independent reviewers catch more issues   |
| **Dismiss stale pull request approvals**  | ✓                                                     | New pushes invalidate previous approvals      |
| **Require review from code owners**       | ✓                                                     | Domain experts validate changes in their area |
| **Require status checks before merging**  | ✓                                                     | CI must pass                                  |
| **Required status checks**                | `Quality Gate`, `lint`, `type-check`, `test`, `build` | All CI jobs                                   |
| **Require branches to be up to date**     | ✓                                                     | Prevents merge conflicts and stale merges     |
| **Require linear history**                | ✓                                                     | Enforce squash or rebase, no merge commits    |
| **Allow force pushes**                    | ✗                                                     | Never force push to main                      |
| **Allow deletions**                       | ✗                                                     | Never delete main                             |
| **Require conversation resolution**       | ✓                                                     | All review threads must be resolved           |
| **Require signed commits**                | ✓ (recommended)                                       | Cryptographic verification of authorship      |
| **Require deployments to succeed**        | ✓ (if applicable)                                     | Deployment checks must pass                   |

### Additional Restrictions

| Restriction                | Setting                         |
| -------------------------- | ------------------------------- |
| **Restrict who can push**  | No one (PRs only)               |
| **Allow force pushes**     | Disabled                        |
| **Require linear history** | Enabled (squash or rebase only) |

---

## 3. Develop Branch Protection

The `develop` branch is the integration branch for active development. Protection is lighter than `main` but still enforces quality.

### Rule: `develop`

```
Branch name pattern:  develop
```

| Setting                                   | Value                                                 | Rationale                                   |
| ----------------------------------------- | ----------------------------------------------------- | ------------------------------------------- |
| **Require a pull request before merging** | ✓                                                     | Code review is always required              |
| **Required approvals**                    | 1                                                     | Single reviewer sufficient for dev branch   |
| **Dismiss stale pull request approvals**  | ✓                                                     | Keeps approvals current                     |
| **Require status checks before merging**  | ✓                                                     | CI must pass                                |
| **Required status checks**                | `Quality Gate`, `lint`, `type-check`, `test`, `build` | Same CI as main                             |
| **Require branches to be up to date**     | ✓                                                     | Prevents integration issues                 |
| **Require linear history**                | ✓                                                     | Clean history                               |
| **Allow force pushes**                    | ✗                                                     | Even on develop, force pushes are dangerous |
| **Allow deletions**                       | ✗                                                     | Never delete develop                        |
| **Require conversation resolution**       | ✓                                                     | Clean up discussions                        |

### Why Not Lighter?

Even on `develop`, allowing broken code to merge means every developer who pulls gets a broken environment. Enforcing CI on develop catches issues early, before they reach the `main` → `release` pipeline.

---

## 4. Release Branch Protection

Release branches (`release/*`) are short-lived stabilization branches. They need protection during the release window but can be relaxed afterward.

### Rule: `release/**`

```
Branch name pattern:  release/**
```

| Setting                                   | Value          | Rationale                                    |
| ----------------------------------------- | -------------- | -------------------------------------------- |
| **Require a pull request before merging** | ✓              | Changes to release must be reviewed          |
| **Required approvals**                    | 2              | Same rigor as main (this becomes production) |
| **Require status checks**                 | ✓              | All CI must pass                             |
| **Required status checks**                | `Quality Gate` | Full gate                                    |
| **Allow force pushes**                    | ✗              | Release history must be preserved            |
| **Require linear history**                | ✓              | Clean history for hotfix tracking            |

---

## 5. Admin Override Policy

Administrators can bypass branch protection rules when necessary (e.g., urgent hotfixes). This must be done with accountability.

### Policy

| Scenario                      | Allow Bypass?   | Process                                                                                         |
| ----------------------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| **Urgent production hotfix**  | ✓ With approval | Admin force-pushes hotfix, documents reason in incident report, creates follow-up PR for review |
| **CI infrastructure failure** | ✓ Temporary     | Admin bypasses, CI is fixed immediately, retrospective conducted                                |
| **Revert a broken merge**     | ✓ With approval | Admin reverts via PR or direct push, documents in changelog                                     |
| **Routine development**       | ✗ Never         | Normal PR process applies regardless of role                                                    |

### Accountability Requirements

1. **Every bypass must be documented** in the release notes or incident log
2. **A follow-up PR** must be created within 24 hours for any bypassed code
3. **Post-incident review** is required if the bypass was due to a failure
4. **Admin access is limited** to repository owners and designated maintainers

### Bypass Process (Emergency Only)

```bash
# 1. Clone the repository
git clone https://github.com/ashrafakib02/Sprintio.git
cd Sprintio

# 2. Make your hotfix on a branch
git checkout -b hotfix/emergency-fix main

# 3. Commit the fix
git add .
git commit -m "fix: critical production issue description"

# 4. Merge directly (requires admin + branch protection bypass enabled)
git checkout main
git merge --no-ff hotfix/emergency-fix
git push origin main

# 5. Create a follow-up PR for review
# (The next PR will include the fix for proper code review)
```

---

## 6. GitHub Configuration Steps

### Step-by-Step Setup

1. Navigate to **Settings** > **Branches** > **Add rule**

2. **For `main`:**
   - Branch name pattern: `main`
   - Enable all settings from the [Main Branch Protection](#2-main-branch-protection) table
   - Add required status checks: `Quality Gate`, `lint`, `type-check`, `test`, `build`
   - Set required approvals to 2

3. **For `develop`:**
   - Branch name pattern: `develop`
   - Enable all settings from the [Develop Branch Protection](#3-develop-branch-protection) table
   - Set required approvals to 1

4. **For release branches:**
   - Branch name pattern: `release/**`
   - Configure per the [Release Branch Protection](#4-release-branch-protection) table

### Verification

After configuration, verify by:

1. Attempting to push directly to `main` — should be rejected
2. Attempting to merge a PR without CI passing — should be blocked
3. Attempting to merge without required approvals — should be blocked
4. Verifying that force push attempts are rejected

---

## 7. Branch Naming Conventions

Branch names must follow the conventions below. Branch protection rules can optionally enforce these via naming patterns.

| Pattern                          | Purpose                    | Example                     |
| -------------------------------- | -------------------------- | --------------------------- |
| `feature/<ticket>-<description>` | New features               | `feature/SR-123-user-auth`  |
| `fix/<ticket>-<description>`     | Bug fixes                  | `fix/SR-456-null-pointer`   |
| `hotfix/<description>`           | Emergency production fixes | `hotfix/auth-token-expiry`  |
| `release/<version>`              | Release stabilization      | `release/1.2.0`             |
| `chore/<description>`            | Maintenance tasks          | `chore/update-dependencies` |
| `docs/<description>`             | Documentation changes      | `docs/update-api-reference` |

### Branch Lifecycle

```
feature/xyz ──────► develop ──► main
                        │          ▲
                   PR + CI     PR + CI + 2 approvals
                   1 approval
```

---

_Document maintained by the Sprintio engineering team._
