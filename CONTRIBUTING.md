# Contributing to Sprintio

Thank you for your interest in contributing to Sprintio! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Branch Naming](#branch-naming)
- [Commit Message Format](#commit-message-format)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Code Style Guidelines](#code-style-guidelines)
- [Review Process](#review-process)
- [Issue Guidelines](#issue-guidelines)

---

## Prerequisites

Ensure you have the following installed:

- **Node.js** >= 20.x
- **pnpm** >= 9.x (we use pnpm as the package manager)
- **Git** >= 2.40
- A GitHub account

### Recommended Tools

- [VS Code](https://code.visualstudio.com/) with recommended extensions (check `.vscode/extensions.json`)
- [EditorConfig](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig) extension
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension

---

## Getting Started

### 1. Fork & Clone

```bash
# Fork the repo on GitHub first, then:
git clone https://github.com/<your-username>/Sprintio.git
cd Sprintio
git remote add upstream https://github.com/ashrafakib02/Sprintio.git
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Create a Branch

Always branch off `develop`:

```bash
git checkout develop
git pull upstream develop
git checkout -b feat/your-feature-name
```

### 4. Start Developing

```bash
pnpm dev
```

---

## Branch Naming

We follow **Git Flow** conventions. See [docs/development/branching-strategy.md](docs/development/branching-strategy.md) for full details.

| Branch Type       | Pattern                  | Example                        |
| ----------------- | ------------------------ | ------------------------------ |
| Feature           | `feat/<short-description>` | `feat/user-auth-flow`        |
| Bugfix            | `fix/<short-description>`  | `fix/sprint-timer-drift`     |
| Documentation     | `docs/<short-description>` | `docs/api-rate-limiting`     |
| Hotfix            | `hotfix/<short-description>`| `hotfix/login-500-error`   |
| Release           | `release/<version>`        | `release/v1.2.0`             |
| Refactor          | `refactor/<short-description>`| `refactor/auth-module`  |
| Test              | `test/<short-description>` | `test/payment-edge-cases`    |
| Chore             | `chore/<short-description>`| `chore/update-deps`          |

**Rules:**

- Use lowercase kebab-case (`feat/add-user-search`, not `Feat/Add_User_Search`)
- Keep descriptions short but meaningful (2-4 words)
- Use a scope that matches the module/area affected

---

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/). Every commit **must** follow this format:

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Examples

```
feat(auth): add OAuth2 login with Google

Implements Google OAuth2 flow using passport-google-oauth20.
Adds callback route and session handling.

Closes #42
```

```
fix(api): resolve race condition in sprint timer

Fixed concurrent state update causing timer to skip seconds
under heavy load.

Fixes #128
```

```
docs(api): update authentication endpoints
```

```
chore(deps): bump typescript to 5.4
```

### Allowed Types

| Type       | Description                                        |
| ---------- | -------------------------------------------------- |
| `feat`     | A new feature                                      |
| `fix`      | A bug fix                                          |
| `docs`     | Documentation only changes                         |
| `style`    | Code style (formatting, semicolons, etc.)          |
| `refactor` | Code change that neither fixes nor adds a feature  |
| `perf`     | Performance improvement                            |
| `test`     | Adding or correcting tests                         |
| `build`    | Build process or external dependency changes       |
| `ci`       | CI configuration changes                           |
| `chore`    | Other changes (non-src, non-test)                  |
| `revert`   | Reverts a previous commit                          |

### Enforced Rules

Commitlint is configured to enforce these rules automatically via the `commit-msg` hook:

- **Type** is required and must be one of the allowed types
- **Scope** is encouraged (warns if missing) and must be lowercase
- **Subject** is required, must not end with a period, and max 72 characters
- **Header** (full first line) max 100 characters
- **Body** must be preceded by a blank line; max 200 characters per line
- **Issue references** are encouraged (warns if missing)

---

## Making Changes

### Code Quality

Before committing, ensure your code passes all checks:

```bash
# Lint
pnpm lint

# Type check
pnpm type-check

# Tests
pnpm test

# Build
pnpm build
```

### Working with Monorepo

Sprintio is a Turborepo monorepo. Common patterns:

```bash
# Run a specific package's dev server
pnpm --filter @sprintio/web dev
pnpm --filter @sprintio/api dev

# Run a command across all packages
pnpm turbo lint
pnpm turbo test
```

### Keeping Your Branch Updated

```bash
git fetch upstream
git rebase upstream/develop
# Resolve conflicts if any
git push --force-with-lease  # Safe force push after rebase
```

---

## Pull Request Process

### 1. Push Your Branch

```bash
git push origin feat/your-feature-name
```

### 2. Create a PR

- Go to the GitHub repository and click **"New Pull Request"**
- Ensure the base branch is `develop`
- Fill out the PR template completely
- Link the related issue(s)

### 3. PR Requirements

Before a PR can be merged, it must meet these criteria:

- [ ] All CI checks pass (lint, test, build)
- [ ] Code has been reviewed and approved by at least 1 maintainer
- [ ] Branch is up to date with `develop` (no merge conflicts)
- [ ] Commit messages follow conventional commit format
- [ ] New/updated code has appropriate test coverage
- [ ] Documentation is updated if behavior changed
- [ ] No console logs, debug statements, or TODO comments left behind

### 4. Merge Strategy

- **Features / Bugfixes**: Squash and merge (clean history on develop)
- **Release / Hotfix branches**: Merge commit (preserve full history)

---

## Code Style Guidelines

### General

- **Indentation**: 2 spaces (enforced by `.editorconfig`)
- **Line endings**: LF (enforced by `.editorconfig`)
- **Trailing whitespace**: Trimmed automatically
- **Final newline**: Always present
- **Max line length**: 100 for code, 120 for HTML/templates/markdown

### TypeScript / JavaScript

- Use **TypeScript** for all new code
- Prefer `const` over `let`; never use `var`
- Use **named exports** over default exports
- Prefer **async/await** over raw Promises
- Use **optional chaining** (`?.`) and **nullish coalescing** (`??`)
- No unused variables or imports (enforced by ESLint)

### Naming Conventions

| Element        | Convention     | Example               |
| -------------- | -------------- | --------------------- |
| Variables      | camelCase      | `sprintDuration`      |
| Functions      | camelCase      | `calculateVelocity()` |
| Classes        | PascalCase     | `SprintManager`       |
| Interfaces     | PascalCase     | `ISprintConfig`       |
| Constants      | SCREAMING_SNAKE| `MAX_RETRY_COUNT`     |
| Files          | kebab-case     | `sprint-manager.ts`   |
| React Components | PascalCase  | `SprintCard.tsx`      |

### Git

- Never commit directly to `main` or `develop`
- Keep commits atomic and focused
- Write meaningful commit messages (see [Commit Message Format](#commit-message-format))
- Rebase feature branches before requesting review (avoid merge commits on features)

---

## Review Process

### As a Reviewer

- Review within **24 hours** of being assigned
- Be constructive and specific in feedback
- Use GitHub's suggestion feature for small changes
- Approve with comments or request changes — be clear about blocking issues

### As an Author

- Respond to all review comments
- Mark conversations as resolved after pushing fixes
- Don't take feedback personally — we're all building quality together
- Squash fixup commits before requesting re-review

---

## Issue Guidelines

### Bug Reports

- Use the **Bug Report** issue template
- Include steps to reproduce, expected vs actual behavior
- Add screenshots or logs if applicable
- Tag with appropriate labels (`bug`, `priority:high`, etc.)

### Feature Requests

- Use the **Feature Request** issue template
- Describe the problem you're trying to solve, not just the solution
- Include use cases and user stories if possible
- Discuss large features in a discussion or issue before starting work

### Claiming Issues

- Comment on the issue to indicate you're working on it
- Reference the issue number in your PR (`Closes #123`)
- If you can't complete it, unclaim and provide context for the next person

---

## Questions?

If you have questions about contributing:

1. Check existing documentation in `docs/`
2. Search existing issues and discussions
3. Open a new discussion or issue with the `question` label

Thank you for contributing to Sprintio! 🚀
