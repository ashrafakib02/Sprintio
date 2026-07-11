# Product Requirements Document (PRD)

**Product Name:** Sprintio — Sprint fast. Ship together.  
**Version:** 1.0  
**Status:** Finalized  
**Date:** 2026-07-07  
**Author:** Lead AI Engineer  
**Document Status:** Finalized

---

## 1. Executive Summary

### 1.1 Product Vision

**Sprintio** is a modern, AI-enhanced collaborative work management platform that unifies project management, team collaboration, and intelligent automation into a single, intuitive platform. We empower modern teams to plan, execute, and deliver work with clarity, speed, and intelligence.

### 1.2 Problem Statement

Modern teams struggle with:

- **Fragmented tooling** — Project management, docs, chat, and automation live in separate tools
- **Context switching** — Context switching costs teams 40% of productive time
- **Lack of intelligence** — Existing tools are passive trackers, not intelligent partners
- **Rigid workflows** — One-size-fits-all workflows don't match how modern teams actually work
- **Poor visibility** — Leadership lacks real-time visibility into progress, blockers, and capacity

### 1.3 Solution

Sprintio unifies **Projects + Docs + Automation + Intelligence** in one platform:

- **Flexible Workspaces** — Spaces, folders, lists, boards, tables, calendars, Gantt, timeline views
- **Living Documents** — Rich docs embedded in tasks, bidirectional links, real-time collaboration
- **Native Automation** — No-code automation builder with 100+ triggers/actions, AI-assisted workflow builder
- **AI Copilot** — Natural language task creation, smart summaries, auto-triage, capacity planning, risk detection
- **Unified Intelligence** — Cross-workspace insights, capacity planning, risk detection, velocity forecasting

### 1.4 Target Market

| Segment                     | Size      | Pain Points                                                       |
| --------------------------- | --------- | ----------------------------------------------------------------- |
| **SMB Tech Teams** (10-200) | Primary   | Tool sprawl, no PM tool fits, need automation without engineering |
| **Mid-Market** (200-2000)   | Secondary | Cross-team visibility, portfolio view, compliance, SSO/SCIM       |
| **Agencies/Consultancies**  | Tertiary  | Client portals, time tracking, billing integration, white-label   |

### 1.5 Success Metrics (North Star Metrics)

> **This is the single source of truth for all Sprintio success metrics.** The [MVP Definition](./MVP_DEFINITION.md) and [Future Roadmap](./FUTURE_ROADMAP.md) reference these targets. Do not modify targets here without updating all downstream documents.

#### Metrics Master Table

| Metric                         | Month 5 (Private Beta) | Month 6 (GA) | Month 12 (Phase 2) | Measurement                  |
| ------------------------------ | ---------------------- | ------------ | ------------------ | ---------------------------- |
| **Weekly Active Workspaces**   | 50                     | 500          | 3,000              | Admin dashboard              |
| **Daily Active Users (total)** | ~100                   | 500+         | 2,100+             | PostHog analytics            |
| **DAU / Workspace**            | —                      | >60%         | >70%               | PostHog analytics            |
| **Automation Adoption**        | —                      | >25%         | >65%               | Automation created/workspace |
| **AI Copilot Adoption**        | —                      | >20%         | >55%               | AI command usage tracking    |
| **Net Revenue Retention**      | —                      | —            | >115%              | Stripe billing analytics     |
| **Net Promoter Score (NPS)**   | Baseline               | >30          | >55                | In-app survey (PostHog)      |
| **System Uptime**              | —                      | >99.5%       | >99.9%             | Uptime monitoring            |
| **Onboarding Completion**      | —                      | >80%         | >90%               | Analytics funnel             |
| **P0 Bugs at Launch**          | —                      | 0            | —                  | Bug tracker                  |
| **Enterprise Deals**           | —                      | —            | 10+                | CRM                          |

#### Milestone Definitions

| Milestone                | Date             | Criteria                                                                               |
| ------------------------ | ---------------- | -------------------------------------------------------------------------------------- |
| **Private Beta**         | Month 5          | 50 beta workspaces onboarded; core workflows validated; critical bugs resolved         |
| **Public Beta**          | Month 6 (wk 1-2) | Self-serve signup live; onboarding flow validated; public feedback channel established |
| **General Availability** | Month 6 (wk 3-4) | GA launch; marketing push; SLA commitments active; support channels operational        |
| **Phase 2 Complete**     | Month 12         | Full feature set shipped; enterprise features live; SOC 2 certified                    |

---

## 2. Product Strategy

### 2.1 Positioning Statement

> **For modern tech-enabled teams (10-500 people) who are frustrated by rigid, fragmented work tools, Sprintio is the AI-native work platform that unifies projects, docs, and automation — because work shouldn't require context-switching between five tools to get one thing done.**

### 2.2 Competitive Landscape

| Competitor                   | Strengths                      | Weaknesses                                   | Our Wedge                                |
| ---------------------------- | ------------------------------ | -------------------------------------------- | ---------------------------------------- |
| **Linear**                   | Speed, UX, dev-focused         | No docs, no automation, no portfolio view    | Docs + Automation + Portfolio            |
| **Notion**                   | Docs, flexibility              | Slow, no native PM views, weak automation    | Native PM views + Native Automation + AI |
| **Asana**                    | Enterprise features, portfolio | Heavy, slow, expensive, weak docs            | Speed + Native Docs + AI Copilot         |
| **ClickUp**                  | Feature breadth                | Bloated, buggy, performance issues           | Speed + Quality + AI-Native              |
| **Monday.com**               | Visual, customizable           | Expensive, rigid, weak automation            | Flexible + AI-Native Automation          |
| **Linear + Notion + Zapier** | Best-of-breed                  | Context switching, $$, integration fragility | **Unified platform**                     |

### 2.3 Strategic Differentiators (Moats)

1. **AI-Native Architecture** — Not bolted on; AI is the substrate (task creation, triage, summaries, forecasting)
2. **Unified Data Model** — Tasks, docs, automations, goals share a single graph — no sync lag
3. **Native Automation Engine** — Not Zapier/Make wrapper; native, type-safe, version-controlled, testable
4. **Local-First Architecture** — Instant UI, offline-first, real-time sync (CRDT-based)

-

---

## 3. User Personas

_See [User Personas](./USER_PERSONAS.md) for detailed personas._

| Persona    | Role                     | Primary Jobs-to-be-Done                                                    | MVP Phase |
| ---------- | ------------------------ | -------------------------------------------------------------------------- | --------- |
| **Sarah**  | Engineering Manager      | Plan sprints, track velocity, unblock team, report to leadership           | ✅ MVP    |
| **Marcus** | Senior Engineer          | Pick up work, update status, write docs, automate repetitive tasks         | ✅ MVP    |
| **Priya**  | Product Manager          | Prioritize backlog, write specs, track progress, communicate status        | ✅ MVP    |
| **Alex**   | Design Lead              | Manage design reviews, handoff specs, track feedback, manage design system | ✅ MVP    |
| **Jordan** | VP Engineering / CTO     | Portfolio view, capacity planning, risk detection, strategic alignment     | ⏸ Phase 2 |
| **Casey**  | Project Manager (Agency) | Client portals, time tracking, billing integration, multi-client portfolio | ⏸ Phase 2 |

> **MVP Persona Scope:** The MVP is designed for team leads and individual contributors — the people doing the daily work. Sarah, Marcus, Priya, and Alex are the primary MVP personas. Jordan (executive) and Casey (agency) are explicitly deferred to Phase 2. The adoption hypothesis is: if the team uses Sprintio daily, leadership (Jordan) and adjacent roles (Casey) will follow.

---

## 4. User Stories

_See [User Stories](./USER_STORIES.md) for complete backlog organized by epic._

### Epic Summary

| Epic                                      | Stories | Priority |
| ----------------------------------------- | ------- | -------- |
| **E1: Core Workspace & Data Model**       | 12      | P0       |
| **E2: Views & Visualization**             | 15      | P0       |
| **E3: Real-time Collaboration & Docs**    | 10      | P0       |
| **E4: Native Automation Engine**          | 18      | P0       |
| **E5: AI Copilot & Intelligence**         | 15      | P1       |
| **E6: Team & Workspace Management**       | 12      | P0       |
| **E7: Integrations & API**                | 12      | P1       |
| **E8: Admin, Security & Compliance**      | 10      | P1       |
| **E9: Billing & Subscription Management** | 8       | P1       |
| **E10: Mobile & Desktop Apps**            | 8       | P2       |
| **E11: Notifications & Onboarding**       | 5       | P0       |

**Total Stories: 117**

> **Note:** P0/P1/P2 priorities above reflect the full product vision. The MVP ships a reduced scope (~49 features) as defined in [MVP Definition](./MVP_DEFINITION.md). Key cuts: only Board+List views, reduced automation triggers/actions, free-tier billing only, PWA only (no desktop app). E11 (Notifications & Onboarding) is a foundational epic added to address MVP gaps.

---

## 5. Functional Requirements

_See [Functional Requirements](./FUNCTIONAL_REQUIREMENTS.md) for detailed specifications._

### 5.1 Core Workspace & Data Model (E1)

| ID      | Requirement                                                                         | Priority |
| ------- | ----------------------------------------------------------------------------------- | -------- |
| FR-1.1  | Hierarchical workspaces: Workspace → Space → Folder → List → Task                   | P0       |
| FR-1.2  | Flexible task schema: Custom fields (15+ types), custom statuses, templates         | P0       |
| FR-1.3  | Task relationships: Subtasks, dependencies (blocked by/blocks), duplicates, related | P0       |
| FR-1.4  | Rich text task description with mentions, slash commands, embeds                    | P0       |
| FR-1.5  | Comments with threads, reactions, assignments, rich text, code blocks               | P0       |
| FR-1.6  | Activity log / audit trail (immutable, filterable, exportable)                      | P0       |
| FR-1.7  | Bulk operations (multi-select: move, assign, status, delete, duplicate)             | P1       |
| FR-1.8  | Task templates with variable substitution                                           | P1       |
| FR-1.9  | Recurring tasks (cron-style, natural language)                                      | P1       |
| FR-1.10 | Time tracking (manual + automatic), estimates, time reports                         | P1       |
| FR-1.11 | Goals/OKRs linked to tasks, progress rollup                                         | P1       |
| FR-1.12 | Custom field formulas, rollups, lookups                                             | P1       |
| FR-1.13 | Data export (JSON, CSV, PDF), full workspace export                                 | P1       |

### 5.2 Views & Visualization (E2)

| ID      | Requirement                                                             | Priority |
| ------- | ----------------------------------------------------------------------- | -------- |
| FR-2.1  | List view (sortable, groupable, filterable, column customization)       | P0       |
| FR-2.2  | Board/Kanban view (swimlanes, WIP limits, drag-drop, sub-columns)       | P0       |
| FR-2.3  | Table/Spreadsheet view (inline edit, frozen cols, formulas, pivot)      | P1       |
| FR-2.4  | Calendar view (day/week/month, drag-drop reschedule, multi-calendar)    | P1       |
| FR-2.5  | Timeline/Gantt view (dependencies, critical path, baseline, milestones) | P1       |
| FR-2.6  | Dashboard view (widgets: charts, metrics, text, embeds, progress)       | P1       |
| FR-2.7  | Workload/Capacity view (per person, per team, capacity planning)        | P1       |
| FR-2.8  | Map view (location-based tasks)                                         | P2       |
| FR-2.9  | Whiteboard / Infinite canvas (Figma-style, bidir task links)            | P2       |
| FR-2.10 | Saved views (personal + shared), view templates, view sharing           | P1       |
| FR-2.11 | Cross-workspace portfolio view (multi-workspace rollup)                 | P1       |

### 5.3 Real-time Collaboration & Documents (E3)

| ID      | Requirement                                                               | Priority |
| ------- | ------------------------------------------------------------------------- | -------- |
| FR-3.1  | Real-time collaborative rich text editor (TipTap/ProseMirror + Yjs)       | P0       |
| FR-3.2  | Documents as first-class entities (nest in tasks, folders, or standalone) | P0       |
| FR-3.3  | Bidirectional links ([[wiki-links]], backlinks graph, transclusion)       | P0       |
| FR-3.4  | Document templates with variables                                         | P1       |
| FR-3.5  | Inline comments, suggestions mode, threads                                | P0       |
| FR-3.6  | Slash commands: /task, /doc, @mention, /date, /emoji, /code, /embed       | P0       |
| FR-3.7  | Document version history, diff view, restore                              | P0       |
| FR-3.8  | Export (PDF, MD, HTML, Notion export), print to PDF                       | P1       |
| FR-3.9  | Document permissions (view/comment/edit/admin per doc)                    | P1       |
| FR-3.10 | Published docs (public link, password, SEO, custom domain)                | P2       |
| FR-3.11 | AI writing assistant (continue, summarize, rewrite, translate)            | P1       |

### 5.4 Native Automation Engine (E4)

| ID      | Requirement                                                                                            | Priority |
| ------- | ------------------------------------------------------------------------------------------------------ | -------- |
| FR-4.1  | Visual no-code automation builder (trigger → condition → action)                                       | P0       |
| FR-4.2  | 50+ native triggers (task created, status changed, comment added, date, webhook, schedule, AI trigger) | P0       |
| FR-4.3  | 50+ native actions (create task, update field, comment, notify, webhook, AI action, create doc, move)  | P0       |
| FR-4.4  | Conditions: if/else, filters, field matching, formulas, AI classification                              | P0       |
| FR-4.5  | Loops (for each), batch operations, delay/wait, retry logic                                            | P1       |
| FR-4.6  | Automation versioning, draft/published, rollback, change log                                           | P1       |
| FR-4.7  | Automation templates library (50+ pre-built)                                                           | P0       |
| FR-4.8  | AI-assisted automation builder (natural language → workflow)                                           | P1       |
| FR-4.9  | Run history, debugging, replay, logs, error notifications                                              | P0       |
| FR-4.10 | Rate limiting, concurrency control, execution limits per plan                                          | P1       |
| FR-4.11 | Webhook receiver (public endpoints, HMAC verification)                                                 | P1       |
| FR-4.12 | Automation marketplace (share, install, rate)                                                          | P2       |

### 5.5 AI Copilot & Intelligence (E5)

| ID      | Requirement                                                                                                               | Priority |
| ------- | ------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-5.1  | Natural language task creation ("Create a task for redesigning the dashboard, assign to Alex, due Friday, high priority") | P0       |
| FR-5.2  | Smart task triage (auto-categorize, suggest assignee, priority, labels, sprint)                                           | P0       |
| FR-5.3  | Smart summaries (task thread summary, doc summary, sprint summary, weekly digest)                                         | P0       |
| FR-5.4  | AI Writing Assistant (continue writing, summarize, rewrite tone, translate, fix grammar)                                  | P0       |
| FR-5.5  | Smart search (semantic search across tasks, docs, comments, code)                                                         | P1       |
| FR-5.6  | Capacity planning & velocity forecasting (AI-powered)                                                                     | P1       |
| FR-5.7  | Risk detection (stalled tasks, scope creep, overallocated people, dependency risks)                                       | P1       |
| FR-5.8  | Automated standup / standup summary generation                                                                            | P1       |
| FR-5.9  | Release notes generator (from completed tasks)                                                                            | P1       |
| FR-5.10 | AI Automation Builder (describe workflow in plain English → generate automation)                                          | P1       |
| FR-5.11 | Smart duplicate detection & merge suggestions                                                                             | P1       |
| FR-5.12 | Context-aware Q&A ("What's blocking the login refactor?", "Summarize last week's progress")                               | P2       |
| FR-5.13 | Custom AI instructions per workspace (tone, terminology, workflows)                                                       | P1       |
| FR-5.14 | BYOK (Bring Your Own Key) for enterprise                                                                                  | P2       |
| FR-5.15 | AI usage analytics & cost controls per workspace                                                                          | P1       |

### 5.6 Team & Workspace Management (E6)

| ID      | Requirement                                                       | Priority |
| ------- | ----------------------------------------------------------------- | -------- |
| FR-6.1  | Multi-workspace support (personal + team workspaces)              | P0       |
| FR-6.2  | Roles: Owner, Admin, Member, Guest, Viewer (custom roles P1)      | P0       |
| FR-6.3  | Teams & user groups (nested groups, team-level permissions)       | P0       |
| FR-6.4  | Guest access (task-level, list-level, folder-level, time-limited) | P0       |
| FR-6.5  | SSO (SAML 2.0, OIDC, SCIM 2.0 provisioning)                       | P1       |
| FR-6.6  | Directory sync (Okta, Azure AD, Google Workspace, OneLogin)       | P1       |
| FR-6.7  | Audit logs (SIEM export, webhook streaming)                       | P1       |
| FR-6.8  | Session management, device trust, IP allowlists                   | P1       |
| FR-6.9  | Workspace analytics (adoption, activity, collaboration patterns)  | P1       |
| FR-6.10 | Custom branding (logo, colors, domain, email templates)           | P1       |

### 5.7 Integrations & API (E7)

| ID     | Requirement                                                                                                                                                               | Priority |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-7.1 | Public REST API (OpenAPI 3.1, versioned, rate-limited)                                                                                                                    | P1       |
| FR-7.2 | GraphQL API (flexible queries, subscriptions for real-time)                                                                                                               | P1       |
| FR-7.3 | Webhooks (retry, signing, filtering, delivery logs)                                                                                                                       | P1       |
| FR-7.4 | Native integrations: GitHub, GitLab, Bitbucket, Slack, Teams, Discord, Figma, Notion, Google Drive, OneDrive, Jira, Linear, Asana, Zendesk, Intercom, HubSpot, Salesforce | P1       |
| FR-7.5 | OAuth 2.0 / OIDC for 3rd party app integration                                                                                                                            | P1       |
| FR-7.6 | App marketplace (install, configure, review, revenue share)                                                                                                               | P2       |
| FR-7.7 | Embedded iFrame views (embed views in Confluence, Notion, websites)                                                                                                       | P2       |
| FR-7.8 | CLI tool (collabstack CLI) for developers                                                                                                                                 | P2       |
| FR-7.9 | Webhooks marketplace (pre-built webhook receivers)                                                                                                                        | P2       |

### 5.8 Admin, Security & Compliance (E8)

| ID      | Requirement                                                                    | Priority |
| ------- | ------------------------------------------------------------------------------ | -------- |
| FR-8.1  | SOC 2 Type II, GDPR, CCPA compliance                                           | P1       |
| FR-8.2  | Data residency (US, EU, AU regions)                                            | P1       |
| FR-8.3  | Encryption at rest (AES-256), in transit (TLS 1.3), customer-managed keys (P1) | P0/P1    |
| FR-8.4  | Fine-grained permissions (resource-level, field-level P1)                      | P0       |
| FR-8.5  | Audit log API, SIEM integration (Splunk, Datadog, Sentinel)                    | P1       |
| FR-8.6  | Data loss prevention (DLP) rules, watermarking                                 | P2       |
| FR-8.7  | Vulnerability management, pen testing, bug bounty                              | P1       |
| FR-8.8  | Backup & disaster recovery (RPO < 1hr, RTO < 4hr)                              | P1       |
| FR-8.9  | Legal hold, e-discovery export                                                 | P2       |
| FR-8.10 | Accessibility (WCAG 2.1 AA)                                                    | P1       |

### 5.9 Billing & Subscription (E9)

| ID     | Requirement                                                                  | Priority |
| ------ | ---------------------------------------------------------------------------- | -------- |
| FR-9.1 | Tiered plans: Free, Pro ($12/u/mo), Business ($24/u/mo), Enterprise (custom) | P1       |
| FR-9.2 | Per-seat pricing with volume discounts                                       | P1       |
| FR-9.3 | Usage-based AI credits (included quota + overage)                            | P1       |
| FR-9.4 | Stripe Billing integration (subscriptions, trials, proration, dunning)       | P1       |
| FR-9.5 | Customer portal (billing history, invoices, payment methods, plan changes)   | P1       |
| FR-9.6 | Usage analytics & alerts (approaching limits, overage warnings)              | P1       |
| FR-9.7 | Enterprise contracts (annual, PO, custom terms, SSO enforcement)             | P1       |
| FR-9.8 | Partner/affiliate program, revenue share                                     | P2       |

### 5.10 Mobile & Desktop (E10)

| ID      | Requirement                                                             | Priority |
| ------- | ----------------------------------------------------------------------- | -------- |
| FR-10.1 | iOS app (native SwiftUI, offline-first, push notifications)             | P2       |
| FR-10.2 | Android app (native Kotlin, offline-first, push notifications)          | P2       |
| FR-10.3 | Desktop apps (Tauri/Electron: macOS, Windows, Linux)                    | P1       |
| FR-10.4 | PWA with offline support, push notifications                            | P1       |
| FR-10.5 | Mobile-optimized web (responsive, touch-friendly)                       | P1       |
| FR-10.6 | Offline-first architecture (CRDT, background sync, conflict resolution) | P1       |

### 5.11 Notifications & Onboarding (E11)

| ID      | Requirement                                                                                           | Priority |
| ------- | ----------------------------------------------------------------------------------------------------- | -------- |
| FR-11.1 | In-app notification center (bell icon, feed, unread count, mark read, filter by type)                 | P0       |
| FR-11.2 | Email notifications (assignment, @mention, due date, status change — configurable per user)           | P0       |
| FR-11.3 | Notification preferences (per-user toggle: which events, email vs in-app vs off)                      | P0       |
| FR-11.4 | Workspace setup wizard (guided first-time flow: name workspace, invite members, create first project) | P0       |
| FR-11.5 | User onboarding checklist (progressive checklist for new users: create task, invite teammate, etc.)   | P0       |
| FR-11.6 | CSV task import (upload CSV, column mapping for title, status, assignee, due date, labels)            | P0       |

---

## 6. Non-Functional Requirements

_See [Non-Functional Requirements](./NON_FUNCTIONAL_REQUIREMENTS.md) for detailed specifications._

### 6.1 Performance

| Metric                         | Target                               |
| ------------------------------ | ------------------------------------ |
| **App Load (cold)**            | < 2s (p95)                           |
| **App Load (warm)**            | < 500ms (p95)                        |
| **Time to Interactive**        | < 1.5s (p95)                         |
| **API p95 Latency**            | < 200ms (p95), < 500ms (p99)         |
| **Real-time Latency**          | < 100ms (p95) for presence/cursors   |
| **Automation Execution**       | < 500ms (p95) for simple automations |
| **AI Response (streaming)**    | First token < 500ms, complete < 10s  |
| **Search Latency**             | < 300ms (p95) for semantic search    |
| **Concurrent Users/Workspace** | 500+ concurrent, 10k+ total          |

### 6.2 Reliability

| Metric                      | Target                                    |
| --------------------------- | ----------------------------------------- |
| **Uptime (SLA)**            | 99.9% (Pro/Business), 99.95% (Enterprise) |
| **RPO**                     | < 1 hour                                  |
| **RTO**                     | < 4 hours                                 |
| **Error Rate**              | < 0.1% (API), < 0.01% (data loss)         |
| **Automation Success Rate** | > 99.5%                                   |

### 6.3 Scalability

| Dimension                 | Target              |
| ------------------------- | ------------------- |
| **Workspaces**            | 100,000+            |
| **Users**                 | 1M+                 |
| **Tasks**                 | 1B+                 |
| **Automations**           | 10M+ executions/day |
| **API Requests**          | 1B+/day             |
| **Real-time Connections** | 500k+ concurrent    |

### 6.4 Security

- SOC 2 Type II, GDPR, CCPA compliant
- End-to-end encryption option (client-side encryption) for Enterprise
- Regular penetration testing, bug bounty program
- SAML/OIDC/SCIM for Enterprise
- Fine-grained RBAC + ABAC

### 6.5 Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation, screen reader support
- High contrast mode, reduced motion
- Internationalization (i18n) ready (EN, ES, FR, DE, JP, PT, ZH)

---

## 7. MVP Definition (v1.0 — Month 6)

### 7.1 Scope: Must Have (P0 Only)

| Epic                         | Stories Included                  | Out of Scope (Post-MVP)         |
| ---------------------------- | --------------------------------- | ------------------------------- |
| **E1: Core Workspace**       | FR-1.1 through FR-1.9             | FR-1.10 through FR-1.13         |
| **E2: Views**                | FR-2.1 through FR-2.6, FR-2.10    | FR-2.7 through FR-2.11          |
| **E3: Docs & Collaboration** | FR-3.1 through FR-3.7             | FR-3.8 through FR-3.11          |
| **E4: Automation**           | FR-4.1 through FR-4.7, FR-4.9     | FR-4.8, FR-4.10 through FR-4.12 |
| **E5: AI Copilot**           | FR-5.1 through FR-5.4             | FR-5.5 through FR-5.15          |
| **E6: Team & Workspace**     | FR-6.1 through FR-6.4             | FR-6.5 through FR-6.10          |
| **E7: Integrations**         | FR-7.1 through FR-7.3 (core only) | FR-7.4 through FR-7.9           |
| **E8: Security**             | FR-8.1, FR-8.3, FR-8.4            | FR-8.2, FR-8.5 through FR-8.10  |
| **E9: Billing**              | FR-9.1 through FR-9.5             | FR-9.6 through FR-9.8           |
| **E10: Platform**            | FR-10.3, FR-10.4, FR-10.5         | FR-10.1, FR-10.2, FR-10.6       |

**MVP Story Count: ~55 stories (P0 only)**

### 7.2 MVP Success Criteria

| Criterion                | Target                                       |
| ------------------------ | -------------------------------------------- |
| **Launch Date**          | Month 6                                      |
| **Beta Workspaces**      | 50+ active beta workspaces                   |
| **Daily Active Users**   | >500                                         |
| **Automation Adoption**  | >25% of workspaces have ≥1 active automation |
| **AI Feature Adoption**  | >20% of active users use AI features weekly  |
| **NPS (Beta)**           | >30                                          |
| **Critical Bugs (P0)**   | Zero at launch                               |
| **Uptime (Beta Period)** | >99.5%                                       |

### 7.3 MVP Exclusions (Explicitly Out of Scope)

- ❌ Native mobile apps (iOS/Android)
- ❌ Native desktop apps (Tauri/Electron) — PWA only
- ❌ SSO/SCIM (Enterprise only, post-MVP)
- ❌ Advanced AI (smart search, forecasting, risk detection, Q&A)
- ❌ AI Automation Builder (natural language → workflow)
- ❌ Custom roles, field-level permissions
- ❌ Data residency (EU/AU) — US only at launch
- ❌ Native integrations beyond GitHub, Slack, GitLab (webhook-based only)
- ❌ App marketplace, CLI, embedded views
- ❌ White-label, custom domains
- ❌ Advanced compliance (SOC 2 Type II in progress, not complete)
- ❌ Enterprise billing (PO, annual contracts, custom terms)

---

## 8. Future Roadmap

_See [Future Roadmap](./FUTURE_ROADMAP.md) for detailed quarterly roadmap._

### 8.1 Phase 1: Foundation & Launch (Months 1-6) — MVP

- Core workspace, views, docs, basic automation, basic AI, team management, billing, web/PWA
- **Launch:** Private beta → Public beta → General Availability

### 8.2 Phase 2: Intelligence & Automation Maturity (Months 7-12)

- **AI:** Smart search, forecasting, risk detection, standup summaries, release notes, Q&A
- **Automation:** AI builder, marketplace, advanced debugging, webhook marketplace
- **Views:** Workload view, portfolio view, whiteboard
- **Platform:** Desktop apps (Tauri), CLI, better offline
- **Enterprise:** SSO/SCIM, audit logs, custom roles, data residency (EU), SOC 2 Type II

### 8.3 Phase 3: Platform & Ecosystem (Months 13-18)

- **Platform:** Public API v2, GraphQL, App Marketplace, OAuth apps, Embedded views
- **AI:** Custom AI instructions, BYOK, AI analytics, custom models fine-tuning
- **Mobile:** Native iOS/Android apps (offline-first)
- **Enterprise:** DLP, legal hold, advanced compliance, dedicated support
- **Ecosystem:** Partner program, template marketplace, consultant certification

### 8.4 Phase 4: Intelligence Platform & Verticalization (Months 19-30)

- **Vertical Solutions:** Agency OS, DevOps Edition, Product OS templates
- **AI Agents:** Autonomous agents for triage, planning, reporting
- **Intelligence Layer:** Cross-workspace benchmarking, industry benchmarks
- **Platform:** White-label, custom domains, advanced embedding
- **Scale:** Multi-region active-active, 1M+ users

---

## 9. Technical Architecture Overview

_See [Architecture Decision Records](./adr/) for detailed ADRs._

### 9.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Web     │  │  PWA     │  │  Desktop │  │  Mobile (later)│  │
│  │  (React) │  │  (SWA)   │  │  (Tauri) │  │  (React Native)│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬────────┘  │
└───────┼──────────────┼─────────────┼────────────────┼──────────┘
        │              │             │                │
        ▼              ▼             ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY (Kong/Envoy)                  │
│              Rate Limiting │ Auth │ Routing │ Observability      │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  CORE API     │  │  REALTIME     │  │  AI/ML        │
│  (Node/TS     │  │  (Node/TS +   │  │  (Python/Go   │
│   Express.js)  │  │   Yjs/WS)     │  │   + vLLM/     │
│               │  │               │  │   OpenAI API) │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  POSTGRESQL   │  │  REDIS        │  │  VECTOR DB    │
│  (Primary)    │  │  (Cache,      │  │  (pgvector/   │
│  + TimescaleDB│  │   Pub/Sub,    │  │   Pinecone/   │
│  for analytics)│  │   Sessions)   │  │   Weaviate)   │
└───────────────┘  └───────────────┘  └───────────────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EVENT BUS (Kafka / Redpanda)                  │
│         Task Events │ Automation Events │ AI Events │ Audit     │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AUTOMATION WORKER FLEET                       │
│         (Temporal / BullMQ / custom workflow engine)             │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Technology Stack

| Layer              | Technology                                                                                                                    | Rationale                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Frontend**       | React 18, TypeScript, Vite, TanStack Router, TanStack Query, Redux Toolkit, Tailwind CSS, Radix UI, TipTap (ProseMirror), Yjs | Modern, performant, great DX, real-time ready        |
| **Desktop**        | Tauri (Rust + WebView)                                                                                                        | Small binary, secure, native performance             |
| **Mobile**         | React Native (Expo), Expo Router, React Native Reanimated                                                                     | Code sharing with web, fast iteration                |
| **API Gateway**    | Kong / Envoy                                                                                                                  | Rate limiting, auth, observability, plugin ecosystem |
| **Core API**       | Node.js 20+, TypeScript, Express.js, Zod                                                                                      | Lightweight, flexible, great ecosystem               |
| **Real-time**      | Yjs + y-websocket / WebRTC, Redis Pub/Sub                                                                                     | CRDT-based, offline-first, conflict-free             |
| **Automation**     | Temporal.io (workflow engine) + custom DSL                                                                                    | Durable execution, retries, visibility, testing      |
| **AI/ML**          | Python (FastAPI), vLLM / Ollama / OpenAI API, pgvector                                                                        | Flexible model serving, vector search, streaming     |
| **Primary DB**     | PostgreSQL 16 + TimescaleDB (hypertables)                                                                                     | Relational + time-series, JSONB, row-level security  |
| **Cache/Queue**    | Redis 7 (Cluster), BullMQ, Dragonfly                                                                                          | High perf, streams, pub/sub                          |
| **Vector Search**  | pgvector (primary) + Pinecone (scale)                                                                                         | PostgreSQL-native, hybrid search                     |
| **Search**         | Typesense / Meilisearch                                                                                                       | Fast, typo-tolerant, faceted search                  |
| **Object Storage** | Cloudflare R2 (S3-compatible, zero egress fees)                                                                               | Cost-effective, no egress fees                       |
| **Observability**  | OpenTelemetry, Grafana, Loki, Tempo, Prometheus                                                                               | Vendor-neutral, full stack                           |
| **CI/CD**          | GitHub Actions, ArgoCD, Terraform                                                                                             | GitOps, progressive delivery                         |
| **Infrastructure** | Kubernetes (EKS/GKE), Terraform, Helm                                                                                         | Cloud-agnostic, scalable                             |

### 9.3 Data Model (Core Entities)

```
Workspace
  └── Space (Project/Department)
        └── Folder
              └── List (Board/Table/Calendar/Timeline view config)
                    └── Task
                          ├── Subtasks
                          ├── Custom Fields (values)
                          ├── Comments (threads)
                          ├── Attachments
                          ├── Activity Log
                          ├── Dependencies (blocked by / blocks)
                          ├── Assignees (many-to-many via User)
                          ├── Labels/Tags
                          ├── Time Entries
                          └── Automations (triggered by this task)

Document (first-class, can live in Folder/List/Task or standalone)
  ├── Blocks (TipTap JSON content: JSON (TipTap/ProseMirror)
  ├── Version History
  ├── Backlinks
  ├── Comments
  └── Permissions

Automation (Workspace-level)
  ├── Trigger
  ├── Conditions
  ├── Actions
  ├── Version History
  └── Execution History

User / Member / Team / Role / Permission
```

---

## 10. Risk Assessment & Mitigation

| Risk                              | Likelihood  | Impact       | Mitigation                                                                                 |
| --------------------------------- | ----------- | ------------ | ------------------------------------------------------------------------------------------ |
| **AI Cost Overruns**              | High        | High         | Strict per-workspace quotas, caching, model routing (cheap→expensive), BYOK for Enterprise |
| **Real-time Sync Complexity**     | High        | High         | Yjs/CRDT expertise, extensive conflict testing, offline-first from day 1                   |
| **Automation Engine Reliability** | Medium      | High         | Temporal.io for durability, extensive testing, observability, gradual rollout              |
| **Performance at Scale**          | Medium      | High         | Load testing from day 1, TimescaleDB for analytics, read replicas, caching strategy        |
| **AI Quality/Hallucination**      | Medium      | Medium       | Evaluation pipeline, human feedback loops, confidence thresholds, citations                |
| **Competitive Response**          | High        | Medium       | Speed of execution, AI-native differentiation, community building                          |
| **Talent Acquisition**            | Medium      | High         | Remote-first, strong engineering brand, equity, interesting technical challenges           |
| **Enterprise Sales Cycle**        | Low (early) | High (later) | Product-led growth first, PLG motion, self-serve, then sales-assisted                      |

---

## 11. Go-to-Market Strategy (High Level)

### 11.1 Phase 1: Product-Led Growth (Months 1-12)

- **Free Tier:** Generous (unlimited personal workspaces, 5-member teams, core features)
- **Viral Loops:** Guest invites, shared views, public docs, automation templates
- **Content:** Engineering blog, automation templates gallery, AI prompts library
- **Community:** Discord, templates marketplace, automation marketplace
- **Target:** Individual contributors → team adoption → workspace upgrade

### 11.2 Phase 2: Sales-Assisted (Months 10-18)

- **Product-Qualified Leads:** Workspaces >10 users, >50% adoption, automation/AI usage
- **Enterprise Features:** SSO, SCIM, audit logs, data residency, custom contracts
- **Team:** 2 AEs, 1 SE, 1 CSM by Month 18

### 11.3 Phase 3: Ecosystem & Vertical (Month 18+)

- **App Marketplace:** Revenue share, certified partners
- **Vertical Templates:** Agency OS, DevOps, Product, Marketing
- **Integrations:** Deep native integrations (not just webhooks)
- **Professional Services:** Certified partners for implementation

---

## 12. Appendix

### 12.1 Glossary

| Term                       | Definition                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------- |
| **Workspace**              | Top-level container for billing, members, settings                                  |
| **Space**                  | Top-level project/area within a workspace (e.g., "Engineering", "Marketing")        |
| **Folder**                 | Organizational container within a Space                                             |
| **List**                   | Container of tasks with a specific view configuration                               |
| **Task**                   | Atomic unit of work (can be subtask, recurring, template)                           |
| **View**                   | Visual representation of a List (List, Board, Table, Calendar, Timeline, Dashboard) |
| **Automation**             | Trigger → Condition → Action workflow                                               |
| **Space/Folder/List/Task** | Hierarchical data model (4 levels)                                                  |
| **CRDT**                   | Conflict-free Replicated Data Type (for real-time sync)                             |
| **Yjs**                    | CRDT implementation used for real-time collaboration                                |
| **Express.js**             | Lightweight Node.js web framework for building APIs                                 |
| **Temporal**               | Durable execution platform for workflows                                            |

### 12.2 References

- [Linear Method](https://linear.app/method) — Product building philosophy
- [Notion Data Model](https://www.notion.so/data-model) — Block-based document model
- [Temporal.io](https://temporal.io) — Durable execution
- [Yjs](https://yjs.dev) — CRDT framework
- [TipTap](https://tiptap.dev) — Headless editor framework
- [Typesense](https://typesense.org) — Search engine

---

**Document Status:** Finalized  
**Next Review:** 2026-07-14  
**Approvers:** [whom it may concern]
