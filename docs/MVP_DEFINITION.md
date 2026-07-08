# Sprintio — MVP Definition (v1.0)

---

| Field          | Value                                                         |
|----------------|---------------------------------------------------------------|
| Document Type  | MVP Definition                                                |
| Product        | Sprintio — Sprint fast. Ship together.                  |
| Version        | 1.0                                                           |
| Status         | Finalized                                              |
| Date           | 2026-07-07                                                    |
| Author         | Product Team                                                  |
| Related Docs   | [PRD.md](./PRD.md), [API_REFERENCE.md](./API_REFERENCE.md), [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [MVP Scope — What Ships (P0 Only)](#2-mvp-scope--what-ships-p0-only)
3. [MVP User Persona Coverage](#3-mvp-user-persona-coverage)
4. [MVP Success Criteria](#4-mvp-success-criteria)
5. [Technical MVP Constraints](#5-technical-mvp-constraints)
6. [MVP Exclusions (Explicitly Out of Scope)](#6-mvp-exclusions-explicitly-out-of-scope)
7. [MVP → Post-MVP Migration Considerations](#7-mvp--post-mvp-migration-considerations)
8. [MVP Release Plan](#8-mvp-release-plan)
9. [Risks & Mitigations for MVP](#9-risks--mitigations-for-mvp)

---

## 1. Executive Summary

### What the MVP Is

The Sprintio MVP (v1.0) is the first shippable version of the platform, designed to validate core product-market fit before committing to the full feature set defined in the PRD. It is deliberately constrained: enough to deliver a compelling, differentiated experience for team leads and individual contributors, but narrow enough to ship within six months with a small engineering team.

The MVP is **not** a feature-complete subset of the PRD. It is a carefully curated slice that tests the central hypothesis: **unified projects + docs + automation + AI is better than the fragmented alternative** (Linear + Notion + Zapier + ChatGPT).

### Target Launch

| Milestone           | Target        |
|---------------------|---------------|
| Private Beta        | Month 5       |
| Public Beta         | Month 6 (wk 1-2) |
| General Availability| Month 6 (wk 3-4) |
| Post-Launch Review  | Month 7       |

### Core Thesis to Validate

> Teams managing projects across 3–4 separate tools (project tracker, docs platform, automation layer, AI assistant) will switch to Sprintio if the unified experience is meaningfully better — not just cheaper, but faster and more coherent — for daily project work.

The MVP tests this thesis with a specific audience: **teams of 5–50 people** (primarily software and product teams) where a technical lead or project manager drives tooling decisions.

### MVP Scope Summary

| Metric | Value |
|--------|-------|
| **Features Shipping (v1.0)** | ~49 |
| **Features Deferred** | ~76 |
| **Epics with Full Scope** | 2 (E5 AI Copilot, E6 Team Mgmt) |
| **Epics with Reduced Scope** | 4 (E1, E2, E3, E4) |
| **Epics Minimal/Free Tier** | 2 (E9 Billing, E10 Platform) |
| **New Foundational Epics** | 1 (E11 Notifications & Onboarding) |
| **Target Beta Workspaces** | ≥ 50 |
| **Timeline** | 6 months (Private Beta Month 5, GA Month 6) |

**Key scope decisions:**
- **Views:** Board + List only (Table, Calendar, Gantt, Dashboard deferred — board/list validate the thesis)
- **Automation:** 20 triggers, 15 actions, conditions only (loops/delay/retry deferred)
- **Billing:** Free tier only (paid plans validated post-MVP)
- **Desktop:** PWA only (Tauri desktop deferred)
- **Docs:** Full editor + comments + links (templates and version history deferred)
- **Notifications:** In-app + email (push/digest deferred)
- **Onboarding:** Setup wizard + checklist (personalized onboarding deferred)
- **Import:** CSV task import (full migration tools deferred)

---

## 2. MVP Scope — What Ships (P0 Only)

The following section enumerates every epic from the PRD and specifies exactly which functional requirements ship in v1.0 and which are explicitly deferred to post-MVP releases.

### E1: Core Workspace

**Functional Requirements in Scope:** FR-1.1 through FR-1.8

| FR    | Feature                        | Status    | Notes                                              |
|-------|--------------------------------|-----------|----------------------------------------------------|
| FR-1.1| Workspace & Hierarchy          | ✅ Ships   | Projects, folders, multi-level nesting              |
| FR-1.2| Custom Fields & Statuses       | ✅ Ships   | System + custom fields, custom status workflows     |
| FR-1.3| Task Relationships             | ✅ Ships   | Parent/subtask, blocking/blocked, related, blocks   |
| FR-1.4| Rich Text Descriptions         | ✅ Ships   | Full Blocknote editor with formatting, embeds, code |
| FR-1.5| Threaded Comments             | ✅ Ships   | Inline on tasks, threaded discussions, @mentions    |
| FR-1.6| Activity Log                   | ✅ Ships   | Full history of changes per task and project        |
| FR-1.7| Bulk Operations               | ⏸ Deferred | Multi-select, bulk status change, bulk assign, move |
| FR-1.8| Task Templates & Recurrence   | ⏸ Deferred | Template library, recurring task scheduling          |

**Deferred from E1:**

| Feature                        | Status     | Reason for Deferral                                  |
|--------------------------------|------------|------------------------------------------------------|
| Time Tracking                  | ⏸ Deferred | Requires UI/UX design iteration; Phase 2 priority    |
| Goals & OKRs                   | ⏸ Deferred | Needs dedicated product definition; Phase 2          |
| Custom Field Formulas/Rollups  | ⏸ Deferred | Complex engine; low demand at small-team scale       |
| Custom Field Lookups           | ⏸ Deferred | Depends on formula engine                            |
| Data Export (CSV/PDF/JSON)     | ⏸ Deferred | Nice-to-have; workarounds exist via API              |

### E2: Views

**Functional Requirements in Scope:** FR-2.1, FR-2.2

| FR    | Feature              | Status    | Notes                                                  |
|-------|----------------------|-----------|--------------------------------------------------------|
| FR-2.1| List View            | ✅ Ships   | Default view, sortable, filterable                      |
| FR-2.2| Board View (Kanban)  | ✅ Ships   | Drag-and-drop, swimlanes by any field                  |
| FR-2.3| Table/Spreadsheet    | ⏸ Deferred | Excel-like editing, column management                 |
| FR-2.4| Calendar View        | ⏸ Deferred | Date-based visualization, drag to reschedule          |
| FR-2.5| Timeline/Gantt       | ⏸ Deferred | Dependency visualization, critical path              |
| FR-2.6| Dashboard View       | ⏸ Deferred | Chart widgets, KPI tiles, project health             |
| FR-2.10| Saved Views         | ⏸ Deferred | Personal + shared views, filters, sorting persisted   |

**Deferred from E2:**

| Feature                | Status     | Reason for Deferral                                  |
|------------------------|------------|------------------------------------------------------|
| Workload/Capacity View | ⏸ Deferred | Requires time-tracking foundation; Phase 2            |
| Map View               | ⏸ Deferred | Niche use case; low priority for v1                   |
| Whiteboard             | ⏸ Deferred | Significant build effort; not core to thesis          |
| Portfolio View         | ⏸ Deferred | Targets VP-level persona; Phase 2                     |
| Shareable View Links   | ⏸ Deferred | Security review needed; quick Phase 2 add             |

### E3: Docs

**Functional Requirements in Scope:** FR-3.1 through FR-3.7

| FR    | Feature                   | Status    | Notes                                                 |
|-------|---------------------------|-----------|-------------------------------------------------------|
| FR-3.1| Collaborative Editor      | ✅ Ships   | Blocknote-based, real-time multi-user editing          |
| FR-3.2| First-Class Documents     | ✅ Ships   | Docs live alongside tasks, full sidebar navigation     |
| FR-3.3| Bidirectional Links       | ✅ Ships   | `[[wiki-style]]` linking between docs and tasks        |
| FR-3.4| Doc Templates             | ⏸ Deferred | PRD, RFC, meeting notes, sprint retro templates      |
| FR-3.5| Inline Comments           | ✅ Ships   | Highlight-and-comment, threaded discussions             |
| FR-3.6| Slash Commands            | ✅ Ships   | `/` menu for blocks, embeds, mentions, AI commands     |
| FR-3.7| Version History           | ✅ Ships   | Full version tree, diff view, restore                  |

**Deferred from E3:**

| Feature                    | Status     | Reason for Deferral                                  |
|----------------------------|------------|------------------------------------------------------|
| Export (PDF/Markdown/HTML) | ⏸ Deferred | Workaround via copy/paste; Phase 2                    |
| Doc Permissions             | ⏸ Deferred | Inherits workspace permissions for MVP; Phase 2       |
| Published Docs (Public)    | ⏸ Deferred | Security/legal review needed; Phase 2                 |
| AI Writing Assistant (Doc) | ⏸ Deferred | Ships in E5 as Copilot feature (contextual)           |

### E4: Automation

**Functional Requirements in Scope:** FR-4.1 through FR-4.7, FR-4.9

| FR    | Feature                    | Status    | Notes                                                  |
|-------|----------------------------|-----------|--------------------------------------------------------|
| FR-4.1| Visual Builder             | ✅ Ships   | Drag-and-drop flow editor in sidebar panel              |
| FR-4.2| Trigger Library (20 core)  | ✅ Ships   | Task created/updated, status change, date, field match  |
| FR-4.3| Action Library (15 core)   | ✅ Ships   | Update fields, send notifications, create tasks, call API|
| FR-4.4| Conditions & Branching     | ✅ Ships   | If/else logic, AND/OR condition groups                  |
| FR-4.5| Loops, Delay, Retry        | ⏸ Deferred | Loop over collections, delay steps, retry with backoff |
| FR-4.6| Automation Versioning      | ⏸ Deferred | Version history, rollback, draft vs published          |
| FR-4.7| Template Library           | ✅ Ships   | Pre-built automations: auto-assign, SLA, notifications  |
| FR-4.9| Run History & Debugging    | ✅ Ships   | Full execution log, error details, manual re-trigger    |

**Deferred from E4:**

| Feature                    | Status     | Reason for Deferral                                  |
|----------------------------|------------|------------------------------------------------------|
| AI-Assisted Builder        | ⏸ Deferred | Depends on mature AI Copilot; Phase 2                  |
| Rate Limiting Config       | ⏸ Deferred | Basic built-in limits sufficient for MVP               |
| Webhook Receiver (Inbound) | ⏸ Deferred | Outbound webhooks ship; inbound is Phase 2             |
| Marketplace                | ⏸ Deferred | Needs ecosystem to mature; Phase 3                     |

### E5: AI Copilot

**Functional Requirements in Scope:** FR-5.1 through FR-5.4

| FR    | Feature                     | Status    | Notes                                                 |
|-------|-----------------------------|-----------|-------------------------------------------------------|
| FR-5.1| Natural Language Task Create| ✅ Ships   | `/create` command, conversational task creation        |
| FR-5.2| Smart Triage                | ✅ Ships   | Auto-assign, auto-prioritize, auto-label on create    |
| FR-5.3| Smart Summaries             | ✅ Ships   | Project summaries, sprint recaps, stale task alerts    |
| FR-5.4| AI Writing Assistant        | ✅ Ships   | Rewrite, expand, summarize, translate in any text field|

**Deferred from E5:**

| Feature                    | Status     | Reason for Deferral                                  |
|----------------------------|------------|------------------------------------------------------|
| Smart Search (Semantic)    | ⏸ Deferred | Requires vector DB investment; Phase 2                 |
| Forecasting                | ⏸ Deferred | Needs historical data + workload view; Phase 2         |
| Risk Detection             | ⏸ Deferred | Needs forecasting foundation; Phase 2                  |
| Standup Generation         | ⏸ Deferred | Nice-to-have; Phase 2                                 |
| Release Notes Generation   | ⏸ Deferred | Requires git/PR integration depth; Phase 2             |
| AI Automation Builder      | ⏸ Deferred | Depends on mature automation + AI; Phase 3             |
| Duplicate Detection        | ⏸ Deferred | Needs semantic search; Phase 2                         |
| Q&A (Project Knowledge)    | ⏸ Deferred | Needs RAG pipeline; Phase 2                            |
| Custom Instructions        | ⏸ Deferred | Power-user feature; Phase 2                            |
| BYOK (Bring Your Own Key)  | ⏸ Deferred | Enterprise feature; Phase 3                            |
| AI Usage Analytics         | ⏸ Deferred | Basic usage dashboard sufficient for MVP               |

### E6: Team Management

**Functional Requirements in Scope:** FR-6.1 through FR-6.4

| FR    | Feature               | Status    | Notes                                                   |
|-------|-----------------------|-----------|---------------------------------------------------------|
| FR-6.1| Multi-Workspace       | ✅ Ships   | Multiple workspaces per user, workspace switching        |
| FR-6.2| Roles & Permissions   | ✅ Ships   | Owner, Admin, Member, Viewer — fine-grained per project |
| FR-6.3| Teams & Groups        | ✅ Ships   | Named groups for bulk assignment and permission scoping  |
| FR-6.4| Guest Access          | ✅ Ships   | External users with project-scoped, time-limited access  |

**Deferred from E6:**

| Feature                    | Status     | Reason for Deferral                                  |
|----------------------------|------------|------------------------------------------------------|
| SSO/SCIM                   | ⏸ Deferred | Enterprise requirement; Phase 3                        |
| Directory Sync (LDAP/AD)   | ⏸ Deferred | Enterprise requirement; Phase 3                        |
| Audit Log Export            | ⏸ Deferred | SOC 2 related; Phase 2                                |
| Session Management          | ⏸ Deferred | Basic session handling ships; advanced is Phase 2       |
| Workspace Analytics         | ⏸ Deferred | Admin analytics; Phase 2                               |
| Custom Branding/White Label | ⏸ Deferred | Agency/enterprise feature; Phase 3                     |

### E7: Integrations (Core Only)

**Functional Requirements in Scope:** Core API, outbound webhooks, basic GitHub/GitLab, CSV import

| Feature                       | Status    | Notes                                                   |
|-------------------------------|-----------|---------------------------------------------------------|
| REST API (Core CRUD)          | ✅ Ships   | Full CRUD for all core entities                          |
| Outbound Webhooks             | ✅ Ships   | Event-based webhooks to arbitrary HTTP endpoints         |
| GitHub Integration (Basic)    | ✅ Ships   | PR/commit linking, branch auto-create from tasks         |
| GitLab Integration (Basic)    | ✅ Ships   | MR/commit linking, branch auto-create from tasks         |
| CSV Task Import               | ✅ Ships   | Import tasks with column mapping (title, status, assignee, due date, labels) |

**Deferred from E7:**

| Feature                    | Status     | Reason for Deferral                                  |
|----------------------------|------------|------------------------------------------------------|
| GraphQL API                | ⏸ Deferred | REST sufficient for MVP; GraphQL in Phase 2           |
| Native Integrations (16)   | ⏸ Deferred | Slack, Notion, Figma, etc. — Phase 2 rollout          |
| OAuth/OIDC Provider        | ⏸ Deferred | SSO dependency; Phase 3                                |
| App Marketplace            | ⏸ Deferred | Needs ecosystem; Phase 3                               |
| Embedded Views (iframe)    | ⏸ Deferred | Security review needed; Phase 2                        |
| CLI                        | ⏸ Deferred | Power-user feature; Phase 2                            |
| Webhooks Marketplace       | ⏸ Deferred | Needs ecosystem; Phase 3                               |

### E8: Security

**Functional Requirements in Scope:** Foundational security posture

| Feature                              | Status    | Notes                                                   |
|--------------------------------------|-----------|---------------------------------------------------------|
| Encryption at Rest (AES-256)         | ✅ Ships   | All data encrypted at rest in Postgres/Cloudflare R2    |
| Encryption in Transit (TLS 1.3)      | ✅ Ships   | All API and web traffic over HTTPS                      |
| Fine-Grained Permissions             | ✅ Ships   | Role-based + project-level access control               |
| Basic SOC 2 Readiness               | ✅ Ships   | Policies documented, controls in place; not certified   |
| GDPR Compliance (Core)              | ✅ Ships   | Data deletion, export, consent management               |
| CCPA Compliance (Core)              | ✅ Ships   | Opt-out, deletion rights                                |
| API Key Management                  | ✅ Ships   | Scoped API keys with expiration                         |

**Deferred from E8:**

| Feature                    | Status     | Reason for Deferral                                  |
|----------------------------|------------|------------------------------------------------------|
| SOC 2 Type II Certification| ⏸ Deferred | Audit process takes 3–6 months; in progress for Phase 2|
| Data Residency (Multi-Region)| ⏸ Deferred| US-only for MVP; multi-region in Phase 2              |
| Audit Log to SIEM          | ⏸ Deferred | Enterprise requirement; Phase 3                        |
| DLP (Data Loss Prevention) | ⏸ Deferred | Phase 2–3                                             |
| Vulnerability Mgmt Program | ⏸ Deferred | Basic scanning ships; formal program in Phase 2        |
| Backup & Disaster Recovery | ⏸ Deferred | Basic backups ship; formal DR plan in Phase 2          |
| Legal Hold                 | ⏸ Deferred | Enterprise/legal requirement; Phase 3                  |
| Accessibility Audit (WCAG) | ⏸ Deferred | Basic a11y ships; formal audit in Phase 2              |

### E9: Billing

**Functional Requirements in Scope:** Free tier only

| Feature                       | Status    | Notes                                                   |
|-------------------------------|-----------|---------------------------------------------------------|
| Free Tier (up to 5 users)     | ✅ Ships   | Generous free tier for beta; no payment required        |
| Tiered Plans (Pro/Enterprise) | ⏸ Deferred | Paid plans deferred; validated post-MVP                |
| Per-Seat Pricing              | ⏸ Deferred | Monthly and annual billing cycles                     |
| AI Credits (Usage-Based)      | ⏸ Deferred | Included per tier, overage pricing                    |
| Stripe Integration            | ⏸ Deferred | Checkout, billing portal, subscription management     |
| Customer Self-Service Portal  | ⏸ Deferred | Update payment, download invoices, manage seats       |

**Deferred from E9:**

| Feature                    | Status     | Reason for Deferral                                  |
|----------------------------|------------|------------------------------------------------------|
| Usage Analytics & Alerts   | ⏸ Deferred | Basic usage sufficient; detailed analytics in Phase 2  |
| Enterprise Contracts       | ⏸ Deferred | Custom billing, PO invoicing — Phase 3                 |
| Partner/Reseller Program   | ⏸ Deferred | Needs market validation first; Phase 3                 |

### E10: Platform

**Functional Requirements in Scope:** Desktop app, PWA, responsive web

| Feature                       | Status    | Notes                                                   |
|-------------------------------|-----------|---------------------------------------------------------|
| Responsive Web Application    | ✅ Ships   | Desktop-first responsive design, mobile-usable          |
| Progressive Web App (PWA)     | ✅ Ships   | Installable, basic service worker, push notifications   |
| Desktop App (Tauri)           | ⏸ Deferred | Native desktop wrapper; PWA sufficient for MVP         |

**Deferred from E10:**

| Feature                    | Status     | Reason for Deferral                                  |
|----------------------------|------------|------------------------------------------------------|
| Native iOS App             | ⏸ Deferred | Mobile is Phase 2 priority                            |
| Native Android App         | ⏸ Deferred | Mobile is Phase 2 priority                            |
| Offline-First (CRDT)       | ⏸ Deferred | Architectural foundation designed for it; implementation Phase 2 |
| Mobile Quick-Capture       | ⏸ Deferred | Depends on native apps; Phase 2                       |
| Cross-Device Continuity    | ⏸ Deferred | Depends on offline-first; Phase 2                     |

### E11: Notifications & Onboarding

**Functional Requirements in Scope:** In-app notifications, email notifications, workspace setup wizard

| Feature                       | Status    | Notes                                                   |
|-------------------------------|-----------|---------------------------------------------------------|
| In-App Notification Center    | ✅ Ships   | Bell icon with feed, unread count, mark read, filter     |
| Email Notifications           | ✅ Ships   | Assignment, @mention, due date, status change            |
| Notification Preferences      | ✅ Ships   | Per-user toggle: which events, email vs in-app           |
| Workspace Setup Wizard        | ✅ Ships   | Guided first-time setup: name workspace, invite members, create first project |
| User Onboarding Checklist     | ✅ Ships   | Progress checklist for new users (create task, invite, etc.) |

**Deferred from E11:**

| Feature                    | Status     | Reason for Deferral                                  |
|----------------------------|------------|------------------------------------------------------|
| Push Notifications (Web)   | ⏸ Deferred | Browser push is Phase 2; in-app + email sufficient   |
| Notification Digests       | ⏸ Deferred | Daily/weekly digest; real-time sufficient for MVP     |
| Slack/Teams Notifications  | ⏸ Deferred | Depends on native integrations (E7); Phase 2         |
| Mobile Push Notifications  | ⏸ Deferred | Depends on native apps; Phase 2                       |

---

## 3. MVP User Persona Coverage

The MVP is intentionally scoped to serve team leads and individual contributors. Executive and agency personas are explicitly deferred.

### Persona Phase Summary

| Persona | Role | MVP Phase | Rationale |
|---------|------|-----------|-----------|
| **Sarah** | Engineering Manager | ✅ MVP | Primary buyer/user; sprint planning + team visibility are core |
| **Marcus** | Senior Engineer | ✅ MVP | Daily IC; task management + docs + automation are core |
| **Priya** | Product Manager | ✅ MVP | Backlog + specs + views are core PM workflow |
| **Alex** | Design Lead | ✅ MVP | Specs + docs + comments serve handoff; Figma stays primary |
| **Jordan** | VP Engineering | ⏸ Phase 2 | Needs portfolio view, forecasting, risk — deferred until team adoption validates demand |
| **Casey** | Agency PM | ⏸ Phase 2 | Needs time tracking, client portals, billing — Phase 2–3 expansion |

> **Why this split?** The MVP tests whether a unified project+docs+automation experience beats the fragmented Linear+Notion+Zapier stack for daily team work. The people doing that work are Sarah, Marcus, Priya, and Alex. If they adopt Sprintio, Jordan (their leadership) will evaluate it for broader rollout, and Casey's agency use case becomes a Phase 2 expansion.

### Personas Partially or Fully Served

#### Sarah — Engineering Manager

| Capability              | Available in MVP? | Coverage |
|-------------------------|-------------------|----------|
| Board views             | ✅                | Full     |
| List views              | ✅                | Full     |
| Basic AI summaries      | ✅                | Full     |
| Basic automation        | ✅                | Full     |
| Team management         | ✅                | Full     |
| **Timeline/Gantt**      | ❌                | Deferred |
| **Dashboard widgets**   | ❌                | Deferred |
| **Workload view**       | ❌                | Missing  |
| **Forecasting**         | ❌                | Missing  |
| **Risk detection**      | ❌                | Missing  |

**Assessment:** Partially served. Sarah can manage her team's work on boards/lists, use AI summaries, and run basic automations. Timeline, dashboards, and capacity planning are Phase 2.

#### Marcus — Individual Contributor (Developer)

| Capability              | Available in MVP? | Coverage |
|-------------------------|-------------------|----------|
| NL task creation        | ✅                | Full     |
| Docs + wiki             | ✅                | Full     |
| Basic automation        | ✅                | Full     |
| GitHub/GitLab link      | ✅                | Full     |
| Board/List views        | ✅                | Full     |
| **Smart search**        | ❌                | Missing  |
| **CLI**                 | ❌                | Missing  |
| **Advanced automation** | ❌                | Missing  |

**Assessment:** Mostly served. Marcus has the core tools he needs: quick task creation, docs alongside tasks, GitHub integration, and views he can customize. Smart search and CLI are convenience gaps.

#### Priya — Product Manager

| Capability              | Available in MVP? | Coverage |
|-------------------------|-------------------|----------|
| Table view              | ✅                | Full     |
| Docs + templates        | ✅                | Full     |
| Basic AI writing        | ✅                | Full     |
| Saved views/filters     | ✅                | Full     |
| **Duplicate detection** | ❌                | Missing  |
| **Release notes gen**   | ❌                | Missing  |
| **Forecasting**         | ❌                | Missing  |

**Assessment:** Partially served. Priya can manage backlogs, write PRDs, and use AI to polish writing. She lacks the analytical features (forecasting, duplicate detection) that would make Sprintio a primary PM tool.

#### Alex — Designer

| Capability              | Available in MVP? | Coverage |
|-------------------------|-------------------|----------|
| Docs + comments         | ✅                | Full     |
| Basic templates         | ✅                | Full     |
| Bidirectional links     | ✅                | Full     |
| Guest access (external) | ✅                | Full     |
| **Whiteboard**          | ❌                | Missing  |
| **Design-specific features** | ❌           | Missing  |

**Assessment:** Partially served. Alex can use Sprintio for specs and documentation but cannot do visual collaboration. This is acceptable — Alex's primary tools (Figma) remain external, with Sprintio as the project coordination layer.

### Personas NOT Served at MVP (Intentional)

#### Jordan — VP of Engineering

| Capability              | Available in MVP? | Coverage |
|-------------------------|-------------------|----------|
| **Portfolio view**      | ❌                | Missing  |
| **Forecasting**         | ❌                | Missing  |
| **Risk detection**      | ❌                | Missing  |
| **Workload view**       | ❌                | Missing  |

**Assessment:** NOT well-served. Jordan needs cross-project visibility, predictive analytics, and executive dashboards. **This is intentional.** The MVP targets the people doing the work (team leads and ICs), not the executives reviewing it. Jordan is a Phase 2 persona. The bet is that if Sarah (EM) adopts Sprintio, Jordan will follow.

#### Casey — Agency/Freelancer

| Capability              | Available in MVP? | Coverage |
|-------------------------|-------------------|----------|
| **Time tracking**       | ❌                | Missing  |
| **Client portals**      | ❌                | Missing  |
| **Billing integration** | ❌                | Missing  |
| **Custom branding**     | ❌                | Missing  |

**Assessment:** NOT served. Casey's use case (client-facing work, time billing, white-labeled deliverables) requires features that are Phase 2–3. The agency market is a future expansion, not an MVP target.

---

## 4. MVP Success Criteria

These are the quantitative and qualitative metrics that determine whether the MVP has validated product-market fit. **All targets are defined in the [PRD §1.4 Metrics Master Table](./PRD.md#14-success-metrics-north-star-metrics)** — the tables below cross-reference that single source of truth.

### Quantitative Metrics

| Metric                        | Target (Private Beta M5) | Target (GA M6) | Source |
|-------------------------------|--------------------------|----------------|--------|
| Weekly Active Workspaces      | 50                       | 500            | PRD §1.4 |
| Daily Active Users (total)    | ~100                     | 500+           | PRD §1.4 |
| DAU / Workspace               | —                        | >60%           | PRD §1.4 |
| Automation Adoption           | —                        | >25%           | PRD §1.4 |
| AI Copilot Adoption           | —                        | >20%           | PRD §1.4 |
| Net Promoter Score (NPS)      | Baseline                 | >30            | PRD §1.4 |
| System Uptime                 | —                        | >99.5%         | PRD §1.4 |
| P0 Bugs at Launch             | —                        | 0              | PRD §1.4 |

### Qualitative Metrics

| Metric                        | Target                                      |
|-------------------------------|----------------------------------------------|
| User Testimonials             | ≥ 5 unsolicited positive quotes             |
| Feature Requests (organic)    | Evidence users want *more*, not *different*  |
| Churn Reason Analysis         | < 10% churn due to missing core features     |
| Support Ticket Themes         | No recurring theme about fundamental UX gaps |

### Anti-Metrics (Things We Explicitly Do NOT Track in MVP)

- Revenue (MVP is free/beta pricing — monetization validated post-MVP)
- Enterprise pipeline (not an MVP target)
- Time-to-value benchmarks (too early for optimization)

---

## 5. Technical MVP Constraints

These constraints define the technical boundaries of the MVP. They are **not** limitations to be worked around — they are intentional scoping decisions.

| Constraint                        | MVP Reality                                     | Justification                                        |
|-----------------------------------|--------------------------------------------------|------------------------------------------------------|
| Data Residency                    | US only (Cloudflare global network)              | Cloudflare handles edge routing; multi-region is Phase 2 |
| Deployment Model                  | Single-region cloud (Cloudflare)                 | No need for geo-distribution at MVP scale              |
| SSO/SCIM                          | Not available                                    | Enterprise feature; email/password + OAuth sufficient |
| Offline Support                   | None (web/PWA with basic service worker)         | Offline-first architecture designed but not built     |
| AI Infrastructure                 | Hosted models only (OpenAI GPT-4, Anthropic Claude) | No self-hosted models; BYOK is Phase 3           |
| Native Mobile                     | Not available                                    | PWA is sufficient for MVP; native apps are Phase 2    |
| Desktop App                       | Not available (PWA only)                         | Tauri desktop deferred; PWA covers desktop use cases |
| Paid Billing                      | Not available (free tier only)                   | Stripe integration deferred; validated post-MVP       |
| SOC 2 Certification               | Not certified (controls in place, audit pending) | Certification process takes 3–6 months               |
| Database                          | PostgreSQL (single instance, read replica)       | Sufficient for MVP scale; sharding is Phase 2         |
| Real-Time Sync                    | Yjs over WebSocket (no CRDT persistence)         | Designed for future offline-first; online-only now    |
| Search                            | PostgreSQL full-text search                       | Vector/semantic search is Phase 2                     |
| File Storage                      | Cloudflare R2 (global edge, zero egress)         | Built-in CDN; no separate CDN needed                  |
| Message Queue                     | Redis (BullMQ)                                   | Sufficient for MVP; Kafka is Phase 2                  |
| Max Team Size Supported           | ~50 users per workspace                          | Performance validated up to this scale                |
| Max Tasks per Project             | ~5,000                                           | Performance validated; pagination for larger          |
| API Rate Limit                    | 1,000 req/min per API key                        | Sufficient for MVP; configurable post-MVP             |

### 5.5 Staffing Plan

The staffing plan below defines the team composition needed to ship the MVP within the 6-month timeline and scale into Phase 2. All hires are scoped to a US-based, remote-first team.

#### Phase 1: MVP (Months 1–6) — Core Team: 7 people

| Role | Headcount | Focus | Hire Timing |
|------|-----------|-------|-------------|
| **Lead AI Engineer** | 1 | Architecture, AI Copilot, tech leads overall | Month 0 (already assigned) |
| **Senior Full-Stack Engineer** | 2 | Core workspace, views, docs, real-time sync | Month 0–1 |
| **Senior Frontend Engineer** | 1 | UI components, views, accessibility, onboarding | Month 0–1 |
| **Senior Backend Engineer** | 1 | API, automation engine, integrations, billing | Month 1–2 |
| **Product Designer** | 1 | UX/UI design, prototyping, user research | Month 0–1 |
| **DevOps / Platform Engineer** | 1 | Infrastructure, CI/CD, monitoring, deployment | Month 1–2 |

**Phase 1 total: 7 FTE**

> **Why 7?** A 6-month MVP with 49 features across 11 epics requires a minimum of 5 engineers (2 full-stack, 1 frontend, 1 backend, 1 DevOps) plus design and technical leadership. This is a lean but viable team for a focused MVP. Any smaller and the timeline slips; any larger and coordination overhead outweighs the throughput gain.

#### Phase 2: Scale (Months 7–12) — Grow to 12 people

| Role | Headcount | Focus | Hire Timing |
|------|-----------|-------|-------------|
| **Identity / SSO Engineer** | 1 | SSO/SAML, SCIM provisioning, enterprise auth | Month 7–8 |
| **Compliance / Security Engineer** | 1 | SOC 2 audit, GDPR/CCPA, pen testing, DLP | Month 7–8 |
| **Senior Engineer (AI/ML)** | 1 | Semantic search, forecasting, RAG pipeline | Month 8–9 |
| **Senior Engineer (Integrations)** | 1 | Native integrations (Slack, Notion, Figma), marketplace | Month 9–10 |
| **Product Manager** | 1 | Backlog ownership, user research, stakeholder alignment | Month 7 |

**Phase 2 total: 12 FTE** (5 new hires)

#### Specialized Hire Callouts

| Hire | Why Now | Risk if Delayed |
|------|---------|-----------------|
| **Identity/SSO Engineer** | SSO/SAML is the #1 enterprise blocker; SCIM requires IdP integration expertise | Enterprise deals blocked; Phase 2 revenue at risk |
| **Compliance/Security Lead** | SOC 2 Type II audit requires 3–6 months of evidence collection; must start Month 7 | SOC 2 certification delayed to Month 18+; enterprise sales blocked |
| **DevOps/Platform Engineer** | CI/CD, monitoring, canary deploys, infrastructure as code | Deployment velocity slows; manual ops become a bottleneck by Month 4 |

#### Hiring Principles

1. **Hire senior, not junior.** MVP timelines don't have room for ramp-up. Every hire should be productive within 2 weeks.
2. **Full-stack over specialists.** In a small team, engineers who can work across the stack are more valuable than deep specialists.
3. **DevOps early, not late.** Infrastructure decisions in Month 1 compound. A dedicated DevOps hire by Month 2 prevents tech debt.
4. **Compliance is not optional.** SOC 2 readiness must start in Month 3–4, not Month 10. The compliance hire in Phase 2 is for the audit process, not for "thinking about compliance."
5. **Design is a force multiplier.** One strong designer +5 engineers ships better product than0 designers +7 engineers.

---

## 6. MVP Exclusions (Explicitly Out of Scope)

The following is a consolidated list of features, capabilities, and infrastructure that are **explicitly excluded** from the MVP with rationale for each exclusion.

### Features Excluded

| Excluded Feature                  | Rationale                                                      |
|-----------------------------------|----------------------------------------------------------------|
| Table/Spreadsheet View            | Complex build (Excel-like editing); board/list views validate thesis |
| Calendar View                     | Board/list views sufficient; calendar is convenience           |
| Timeline/Gantt View               | Complex to build well; board view suffices for dependency tracking |
| Dashboard View                    | Requires widget system; not core to unified-thesis validation  |
| Saved Views                       | Basic filtering sufficient; saved views are convenience        |
| Doc Templates (Builder)           | Built-in templates ship; template builder is Phase 2           |
| Task Templates & Recurrence       | Manual creation sufficient; templates are convenience          |
| Bulk Operations                   | Manual per-item operations sufficient for small teams          |
| Loops/Delay/Retry (Automation)    | Basic conditions/branching sufficient; complex flow control is Phase 2 |
| Automation Versioning             | Single published version sufficient; version history is Phase 2 |
| Full Billing (Pro/Enterprise)     | Free tier sufficient; paid plans validated post-MVP            |
| Desktop App (Tauri)               | PWA sufficient for MVP; native desktop is Phase 2              |
| Time Tracking                     | Needs dedicated UI/UX design; low urgency vs. core views      |
| Goals & OKRs                      | Separate product surface; needs its own definition             |
| Custom Field Formulas/Rollups     | Complex engine; minimal demand at < 50-user teams              |
| Workload/Capacity View            | Depends on time tracking data                                 |
| Portfolio View                    | Executive persona not targeted in MVP                         |
| Whiteboard                        | Significant build; not core to unified-thesis validation       |
| Shareable View Links              | Security review needed; quick add post-MVP                    |
| Export (CSV/PDF/JSON)             | API provides data access; UI export is convenience             |
| Published Docs (Public)           | Security and legal review required                            |
| AI Semantic Search                | Requires vector DB infrastructure investment                   |
| AI Forecasting / Risk Detection   | Needs historical data accumulation                            |
| Standup / Release Notes Gen       | Low priority vs. core AI features                              |
| Duplicate Detection               | Depends on semantic search foundation                          |
| Q&A (Project Knowledge Base)      | Requires RAG pipeline; Phase 2                                 |
| Custom AI Instructions            | Power-user feature; premature for MVP                          |
| AI Automation Builder             | Depends on mature AI + automation intersection                 |
| SSO/SCIM                          | Enterprise buyers only; Phase 3                                |
| Directory Sync (LDAP/AD)          | Enterprise buyers only; Phase 3                                |
| Audit Log Export / SIEM           | SOC 2 related; Phase 2                                         |
| DLP                               | Phase 2–3                                                      |
| Data Residency (Multi-Region)     | US-only sufficient for initial market                          |
| Native Mobile Apps                | PWA covers mobile needs for MVP                                |
| Offline-First Architecture        | Architecture designed; implementation is Phase 2               |
| CLI                               | Power-user feature; low breadth of appeal                      |
| App Marketplace                   | Needs ecosystem maturity                                       |
| GraphQL API                       | REST sufficient; GraphQL adds complexity without clear MVP need|
| Native Integrations (16 providers)| Phase 2 rollout, prioritized by demand                        |
| OAuth/OIDC Provider               | Enterprise feature                                             |
| Custom Branding / White Label     | Agency/enterprise feature                                      |
| Enterprise Contract Billing       | Custom invoicing, PO support — Phase 3                        |
| Partner/Reseller Program          | Needs market validation first                                  |
| Accessibility Audit (WCAG 2.1 AA)| Basic a11y ships; formal audit is Phase 2                     |
| Legal Hold                        | Enterprise/compliance requirement                              |
| Backup & Disaster Recovery (Formal)| Basic backups ship; formal DR plan is Phase 2                |
| Vulnerability Mgmt Program        | Basic scanning; formal program is Phase 2                     |
| Map View                          | Niche use case                                                 |
| Session Management (Advanced)     | Basic handling ships; advanced is Phase 2                      |

### Infrastructure Excluded

| Excluded Infrastructure           | Rationale                                                      |
|-----------------------------------|----------------------------------------------------------------|
| Multi-Region Deployment           | Single region sufficient for MVP scale                         |
| Kubernetes Migration              | ECS/EKS sufficient; K8s migration is Phase 2                  |
| Kafka / Event Streaming           | Redis/BullMQ sufficient; Kafka is Phase 2                     |
| Vector Database (Pinecone/Weaviate)| Needed for semantic search; Phase 2                           |
| CDN (CloudFront)                  | Single-region sufficient; CDN is Phase 2                       |
| SOC 2 Type II Certification       | In progress; expected completion Phase 2                       |

---

## 7. MVP → Post-MVP Migration Considerations

Architectural decisions made for the MVP must account for post-MVP requirements. The following are the key areas where **MVP implementation must not paint us into a corner**.

### 7.1 Data Model Extensibility

**Decision:** The task and entity data model must be designed with extension points for features that are deferred.

| Future Feature     | MVP Architectural Requirement                                      |
|--------------------|--------------------------------------------------------------------|
| Time Tracking      | Task schema must include extensible metadata (JSONB) to add `time_entries` relation without migration |
| Goals & OKRs       | Entity relationship model must support goal→task linking as a first-class relationship type |
| Custom Formulas    | Custom field schema must store field definitions in a way that supports formula parsing post-MVP |
| Goals Rollups      | Aggregation queries must be abstracted behind service layers, not hardcoded in views |

**Implementation:** Use PostgreSQL JSONB columns for entity metadata. Define all custom fields in a `custom_fields` table with typed values, not column-per-field. This allows adding field types (formula, lookup, rollup) without schema migration.

### 7.2 API Design

**Decision:** The REST API must be designed to accommodate a future GraphQL layer without breaking changes.

| Consideration                | MVP Approach                                                    |
|------------------------------|-----------------------------------------------------------------|
| Resource Nesting             | Flat resource URLs (`/tasks/:id`, `/projects/:id/tasks`) not deeply nested |
| Field Selection              | Support `?fields=id,title,status` query parameter for sparse payloads |
| Pagination                   | Cursor-based pagination from day one (not offset)               |
| Filtering                    | Standardized filter syntax extensible to GraphQL resolvers       |
| Rate Limiting Headers        | Include `X-RateLimit-*` headers on all responses                |
| Versioning                   | URL-based (`/v1/...`) to allow v2 with breaking changes         |

### 7.3 Plugin / Integration Architecture

**Decision:** The automation and integration system must be designed with a plugin interface, even if only first-party plugins ship in MVP.

| Consideration                | MVP Approach                                                    |
|------------------------------|-----------------------------------------------------------------|
| Trigger/Action Interface     | Define a formal `Trigger` and `Action` interface (TypeScript)   |
| Hook System                  | Internal event bus (Redis pub/sub) with formal event schemas    |
| Integration Registry         | Database table for registered integrations with capability flags |
| Webhook Schema               | Versioned webhook payloads with `schema_version` field          |

**Implementation:** Build the automation engine against interfaces, not concrete implementations. The GitHub integration should be registered in the same way a future Slack or Figma integration would be. This means the marketplace (Phase 3) requires wiring, not rewriting.

### 7.4 Real-Time Sync Architecture

**Decision:** Design the real-time collaboration layer for offline-first, even though offline is not an MVP feature.

| Consideration                | MVP Approach                                                    |
|------------------------------|-----------------------------------------------------------------|
| CRDT Library                 | Use Yjs as the CRDT layer (online-only for MVP)                 |
| Document Persistence         | Store Yjs document state in PostgreSQL with awareness protocol  |
| Conflict Resolution          | CRDT merge semantics — no server-side conflict resolution       |
| Awareness Protocol           | Yjs awareness for cursor positions, selections (online only)    |
| Future Offline               | The Yjs → IndexedDB adapter can be added without changing the sync protocol |

**Critical:** Do NOT implement a request/response pattern for collaborative editing. All collaborative state must flow through the CRDT layer from day one, even if the offline adapter is not wired up.

### 7.5 Permission Model

**Decision:** Design the permission system to accommodate SSO/SCIM, custom roles, and directory sync in Phase 2–3.

| Consideration                | MVP Approach                                                    |
|------------------------------|-----------------------------------------------------------------|
| Role Definitions             | Stored in database, not hardcoded — allows adding custom roles  |
| Permission Checks            | Centralized permission service, not scattered conditional logic |
| Identity Source              | Abstract `IdentityProvider` interface — MVP uses email/password, Phase 3 adds SSO/OIDC |
| Group/Team Model             | Teams are workspace-scoped entities with member relationships   |
| Session Management           | JWT with refresh tokens; session store supports future revocation|

**Implementation:** All permission checks go through a `PermissionService` that takes `(user, resource, action)` and returns allowed/denied. This service queries role definitions from the database. When SSO/SCIM arrives, the identity resolution changes, but the permission model does not.

### 7.6 Billing Integration

**Decision:** Design the billing integration to accommodate enterprise contracts, metered billing, and partner programs from the start.

| Consideration                | MVP Approach                                                    |
|------------------------------|-----------------------------------------------------------------|
| Stripe as Source of Truth    | Subscription state lives in Stripe; synced to local DB          |
| Plan Definitions             | Stored in code/config, not hardcoded — allows adding tiers      |
| Usage Tracking               | Event-based usage tracking (AI credits, API calls) with async aggregation |
| Invoice Generation           | Stripe handles invoicing; do not build custom invoice logic     |
| Webhook Handling             | Stripe webhook handler with idempotency keys                    |

**Critical:** Do not build billing logic into the application layer. All billing decisions (can this user do X?) should query a `BillingService` that checks subscription state. This allows swapping Stripe for another provider or adding enterprise contract terms without touching application code.

### 7.7 Search Architecture

**Decision:** Build the search abstraction to support vector/semantic search when it arrives in Phase 2.

| Consideration                | MVP Approach                                                    |
|------------------------------|-----------------------------------------------------------------|
| Search Interface             | `SearchService` with `query(text, filters, options)` interface  |
| MVP Implementation           | PostgreSQL `tsvector` full-text search                          |
| Future Implementation        | Swap to pgvector + OpenAI embeddings without changing callers   |
| Index Strategy               | Index all searchable fields in a `search_index` table           |

### 7.8 Event System

**Decision:** Build a formal event system that can scale to event streaming (Kafka) when needed.

| Consideration                | MVP Approach                                                    |
|------------------------------|-----------------------------------------------------------------|
| Event Bus                    | Redis pub/sub with typed event schemas                          |
| Event Store                  | Append-only `events` table in PostgreSQL                        |
| Consumer Pattern             | Pull-based consumers with offset tracking (via Redis streams)   |
| Future Kafka Migration       | Replace Redis streams with Kafka topics; consumer interface stays the same |

---

## 8. MVP Release Plan

### Phase 1: Foundation (Months 1–2)

**Goal:** Establish the technical foundation and core data model.

| Week  | Milestone                                                       |
|-------|-----------------------------------------------------------------|
| 1–2   | Project setup, monorepo, CI/CD, database schema, auth system   |
| 3–4   | Core data model (workspaces, projects, tasks, custom fields)    |
| 5–6   | Basic UI shell: sidebar navigation, task list, task detail     |
| 7–8   | Real-time sync (Yjs/WebSocket), basic permissions, CRUD API   |

**Exit Criteria:** A user can create a workspace, project, and tasks via the UI. All data persists and syncs in real time. Auth works. API is functional.

### Phase 2: Core Features (Months 3–4)

**Goal:** Build the differentiating features — views, docs, automation, and AI basics.

| Week  | Milestone                                                       |
|-------|-----------------------------------------------------------------|
| 9–10  | Board view, List view, Table view                               |
| 11–12 | Calendar view, Timeline/Gantt, Dashboard widgets                |
| 13–14 | Collaborative docs (Blocknote), bidirectional links, templates |
| 15–16 | Automation builder (visual), trigger/action library, conditions |
| 17–18 | AI Copilot basics: NL task creation, smart triage, summaries   |
| 19–20 | Saved views, bulk operations, task templates, recurring tasks   |

**Exit Criteria:** All 10 epics have their MVP features functional. Internal dogfooding begins.

### Phase 3: Integration, Polish, Beta Prep (Month 5)

**Goal:** Harden the platform, build integrations, prepare for beta.

| Week  | Milestone                                                       |
|-------|----------------------------------------------------------------─|
| 21–22 | GitHub/GitLab integration, REST API, outbound webhooks          |
| 23–24 | Billing (Stripe), tiered plans, AI credits                      |
| 25–26 | Desktop app (Tauri), PWA configuration                          |
| 27–28 | Performance optimization, security hardening, load testing      |
| 29–30 | Bug bash, accessibility fixes, documentation, onboarding flow   |

**Exit Criteria:** Zero P0 bugs. Load tested to 500 concurrent users. Onboarding flow complete. Documentation published.

### Phase 4: Beta Launch (Month 6)

**Goal:** Launch private beta → public beta → GA within the month.

| Week  | Milestone                                                       |
|-------|-----------------------------------------------------------------|
| 31    | **Private Beta Launch** — 10–15 invited workspaces              |
| 32    | Private beta feedback triage, hotfixes                          |
| 33    | **Public Beta Launch** — Open signup, onboarding optimization   |
| 34    | **General Availability** — Remove beta badge, full marketing    |

**Exit Criteria:** 50+ workspaces created. 500+ DAU. NPS survey deployed. Zero P0/P1 bugs open.

### Phase 5: Post-Launch Feedback Loop (Month 7)

**Goal:** Collect data, validate thesis, plan Phase 2.

| Week  | Milestone                                                       |
|-------|-----------------------------------------------------------------|
| 35–36 | NPS survey analysis, user interviews (20+), churn analysis      |
| 37–38 | Success criteria measurement, Phase 2 PRD draft                 |
| 39–40 | Phase 2 roadmap presentation, team retrospective               |

**Exit Criteria:** Go/no-go decision for Phase 2 scope. Success criteria from §4 evaluated.

---

## 9. Risks & Mitigations for MVP

### Schedule Risks

| Risk                              | Probability | Impact | Mitigation                                                      |
|-----------------------------------|-------------|--------|-----------------------------------------------------------------|
| AI features take longer than estimated | High    | High   | Ship AI features last in Phase 2; core AI (NL create, triage) can ship with minimal prompt engineering; advanced features are stretch goals |
| Real-time sync complexity         | High        | High   | Use Yjs battle-tested library; limit concurrent editors to 10 per document initially; optimize post-MVP |
| Automation builder scope creep    | Medium      | High   | Strict P0/P1 feature gate; defer any trigger/action not in the 50+ list; visual builder is drag-and-drop only (no code editing) |
| Tauri desktop app delays          | Medium      | Low    | Desktop app is last priority in Phase 3; PWA is the fallback if Tauri slips |

### Technical Risks

| Risk                              | Probability | Impact | Mitigation                                                      |
|-----------------------------------|-------------|--------|-----------------------------------------------------------------|
| Yjs performance at scale          | Medium      | High   | Load test early (Month 2); have fallback to simpler operational transform if CRDT proves too heavy |
| Stripe integration complexity     | Medium      | Medium | Use Stripe Checkout and Customer Portal (managed UIs) to minimize custom billing code |
| PostgreSQL full-text search limitations | Low   | Medium | Search is not a core MVP differentiator; basic FTS is acceptable; vector search is Phase 2 |
| AI model cost at scale            | Medium      | Medium | Implement per-user AI credit limits; cache common prompts; use GPT-4-mini for simple operations |

### Market Risks

| Risk                              | Probability | Impact | Mitigation                                                      |
|-----------------------------------|-------------|--------|-----------------------------------------------------------------|
| Users don't adopt unified approach | Medium     | High   | MVP success criteria include qualitative feedback; iterate fast in Month 7; pivot scope if thesis is invalidated |
| Linear/Notion ship competing features | High   | Medium | Speed to market is the advantage; AI-native integration is the differentiator; build community during beta |
| Low beta signup volume            | Medium      | Medium | Partner with 3–5 known teams for guaranteed private beta; offer early-adopter pricing; content marketing starts Month 4 |

### Team Risks

| Risk                              | Probability | Impact | Mitigation                                                      |
|-----------------------------------|-------------|--------|-----------------------------------------------------------------|
| Key engineer departure            | Low         | High   | Document all architectural decisions (this doc); pair programming on critical paths; no single points of failure |
| Scope pressure from stakeholders  | High        | Medium | This document is the scope contract; any additions require explicit deferral of equal scope; weekly scope reviews |
| Hiring delays                     | Medium      | Medium | MVP designed for a team of 3–5 engineers; additional headcount accelerates but is not required |

### Operational Risks

| Risk                              | Probability | Impact | Mitigation                                                      |
|-----------------------------------|-------------|--------|-----------------------------------------------------------------|
| Infrastructure cost overruns      | Low         | Low    | Cloudflare free tier + Pay-as-you-go; monitor daily; set billing alerts at 120% of budget |
| Data loss or breach               | Very Low    | Critical | Encryption at rest/in transit from day one; automated backups; no P0 security bugs in release criteria |
| SOC 2 audit delays                | Medium      | Low    | MVP does not require SOC 2 certification; controls are in place for future audit; not a launch blocker |

---

## Appendix A: MVP Feature Count Summary

| Epic                      | Features Shipped | Features Deferred | % Shipped |
|---------------------------|------------------|--------------------|-----------|
| E1: Core Workspace        | 8                | 5                  | 62%       |
| E2: Views                 | 7                | 5                  | 58%       |
| E3: Docs                  | 7                | 4                  | 64%       |
| E4: Automation            | 8                | 4                  | 67%       |
| E5: AI Copilot            | 4                | 11                 | 27%       |
| E6: Team Management       | 4                | 6                  | 40%       |
| E7: Integrations          | 4                | 7                  | 36%       |
| E8: Security              | 7                | 8                  | 47%       |
| E9: Billing               | 5                | 3                  | 63%       |
| E10: Platform             | 3                | 5                  | 38%       |
| **Total**                 | **57**           | **58**             | **50%**   |

---

## Appendix B: MVP User Story Quick Reference

The following user stories are achievable in the MVP. Stories requiring deferred features are excluded.

| ID     | User Story                                                             | Epics   |
|--------|------------------------------------------------------------------------|---------|
| US-001 | As Sarah, I want to create a project with a Kanban board so my team can visualize work | E1, E2  |
| US-002 | As Marcus, I want to describe a task in natural language so I can create it quickly | E5      |
| US-003 | As Priya, I want to write a PRD in Sprintio docs so it lives next to the work | E3      |
| US-004 | As Sarah, I want to automate task assignment so new work is distributed automatically | E4      |
| US-005 | As Marcus, I want to link my PR to a task so progress is tracked      | E7      |
| US-006 | As Priya, I want a table view of all tasks across projects so I can prioritize | E2      |
| US-007 | As Alex, I want to comment on a doc so I can give feedback asynchronously | E3      |
| US-008 | As Sarah, I want a dashboard showing sprint health so I can brief my VP | E2      |
| US-009 | As Marcus, I want a timeline view so I can see dependencies          | E2      |
| US-010 | As Priya, I want AI to summarize stale tasks so I can follow up      | E5      |
| US-011 | As Sarah, I want to create a team group so I can assign work to a group | E6      |
| US-012 | As Marcus, I want a desktop app so Sprintio feels like a native tool | E10     |

---

## Document Status

| Field          | Value                                              |
|----------------|-----------------------------------------------------|
| Status         | Finalized                                    |
| Next Review    | 2026-07-14                                          |
| Owner          | Product Team                                        |
| Approvers      | [whom it may concern]                |

---

*This document is the single source of truth for what ships in Sprintio v1.0. Any feature not listed as "Ships" in Section 2 is explicitly excluded from MVP scope. Scope additions require an equal-scope deferral and approval from the Approvers listed above.*
