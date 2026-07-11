# Sprintio — Wireframes

> **Sprint fast. Ship together.**
> Document: 02 — Wireframes (ASCII)
> Version: 1.0 | Date: 2026-07-08
> Scope: MVP — All key screens with primary states
> Breakpoints: Desktop 1440px (primary), Tablet 768px, Mobile 375px noted inline

---

## Table of Contents

1. [Wireframe Conventions](#1-wireframe-conventions)
2. [WS-01 App Shell & Navigation](#2-ws-01-app-shell--navigation)
3. [WS-02 Board View (Kanban)](#3-ws-02-board-view-kanban)
4. [WS-03 List View](#4-ws-03-list-view)
5. [WS-04 Task Detail Panel](#5-ws-04-task-detail-panel)
6. [WS-05 Document Editor](#6-ws-05-document-editor)
7. [WS-06 Automation Builder](#7-ws-06-automation-builder)
8. [WS-07 AI Copilot Panel](#8-ws-07-ai-copilot-panel)
9. [WS-08 Notification Center](#9-ws-08-notification-center)
10. [WS-09 Onboarding Wizard](#10-ws-09-onboarding-wizard)
11. [WS-10 Settings & Workspace Admin](#11-ws-10-settings--workspace-admin)
12. [WS-11 Empty & Loading States](#12-ws-11-empty--loading-states)
13. [Responsive Behavior Notes](#13-responsive-behavior-notes)

---

## 1. Wireframe Conventions

```
Legend:
  ┌──────────────┐  Container / panel boundary
  │   Text       │  Content / label
  ├──────────────┤  Divider / section break
  │  [ btn ]     │  Button
  │  [_____]     │  Input field
  │  [search..]  │  Search input
  │  ◉ ○ ○       │  Radio / toggle
  │  □  ■        │  Checkbox
  │  ▼           │  Dropdown / expandable
  │  ●           │  Active indicator / selected
  │  ○           │  Inactive indicator
  │  ⋮           │  Overflow / more menu
  │  🔔 3        │  Icon with badge count
  │  +           │  Add / create action
  │  [>>>]       │  Drag handle
  │  ⟳           │  Loading spinner
  │  ✕           │  Close / dismiss
  │  👤          │  User avatar
  │  ▸  ▾        │  Collapse / expand tree
  │  ░░░         │  Skeleton / placeholder
  │  ║           │  Split pane divider
  │  ───         │  Horizontal rule
  │  │           │  Vertical divider

Interaction Notes:
  [KB] = Keyboard shortcut available
  (hover) = Shown on hover state
  (drag) = Draggable element
```

---

## 2. WS-01 App Shell & Navigation

The foundational layout. Every screen lives inside this shell.

### 2.1 Full App Shell — Desktop (1440px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ┌─Top Bar──────────────────────────────────────────────────────────────────┐ │
│ │ ≡  ⬡ Sprintio        [Search.............] ⌨[⌘K]    🔔3  👤Sarah ▾   │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ ┌─Sidebar──┐ ┌─Content Area───────────────────────────────────────────────┐ │
│ │          │ │                                                             │ │
│ │ 🏠 Home  │ │   (Active screen renders here)                              │ │
│ │ ─────── │ │                                                             │ │
│ │ ▾ Eng    │ │                                                             │ │
│ │  ▸ Front │ │                                                             │ │
│ │  ▸ Back  │ │                                                             │ │
│ │  ▸ DSys  │ │                                                             │ │
│ │ ─────── │ │                                                             │ │
│ │ 📄 Docs  │ │                                                             │ │
│ │ 🤖 Auto  │ │                                                             │ │
│ │ ─────── │ │                                                             │ │
│ │ 👥 Team  │ │                                                             │ │
│ │ ⚙ Settings│ │                                                             │ │
│ │          │ │                                                             │ │
│ │          │ │                                                             │ │
│ │ ─────── │ │                                                             │ │
│ │ □ Onboard│ │                                                             │ │
│ │  Checklist│ │                                                             │ │
│ └──────────┘ └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Sidebar — Collapsed State (icon-only, 64px)

```
┌──────┐
│  ≡   │
├──────┤
│  🏠  │
│  ──  │
│  📁  │   ← Workspace tree (icons only, tooltips on hover)
│  ──  │
│  📄  │
│  🤖  │
│  ──  │
│  👥  │
│  ⚙   │
│      │
│      │
│      │
│  ──  │
│  📋  │   ← Onboarding checklist badge
└──────┘
```

### 2.3 Sidebar — Workspace Tree Expanded

```
┌────────────┐
│            │
│  🏠 Home   │
│  ──────── │
│ ▾ Sprintio │
│  ▸ ▾ Eng   │
│    ▸ Front │
│    ▸ Back  │
│    📋 API  │   ← List item with task count badge "12"
│    📋 Auth │   ← List item with task count badge "8"
│    📋 Pay  │   ← List item with task count badge "5"
│  ▸ ▾ Design│
│    📋 UI   │
│    📋 UX   │
│  ▾ Marketing│
│    📋 Blog │
│    📋 Docs │
│  ──────── │
│  📄 Docs   │   ← First-class docs section
│   📄 RFC: Auth
│   📄 Spec: Dashboard
│   📄 + New Doc
│  ──────── │
│  🤖 Automations │
│   ● Stale Nudge │
│   ○ Auto-Assign │
│  ──────── │
│  👥 Team   │
│  ⚙ Settings│
│            │
│  ──────── │
│ ┌────────┐ │
│ │□Onboard│ │   ← Collapsible checklist widget
│ │ ■ Task │ │
│ │ ■ Assign│ │
│ │ □ Invite│ │
│ │ □ Board │ │
│ │ □ Comment│ │
│ │ □ Doc  │ │
│ └────────┘ │
└────────────┘
   240px
```

**Keyboard Shortcuts (Global):**

```
[G] [H]    →  Go to Home
[G] [M]    →  Go to My Work
[G] [B]    →  Go to Board View
[G] [L]    →  Go to List View
[G] [D]    →  Go to Docs
[G] [S]    →  Open Settings
[/]        →  Focus search
[⌘] [K]    →  Command palette
[N]        →  New task (context-aware)
[⌘] [N]    →  New document
```

---

## 3. WS-02 Board View (Kanban)

Sarah's primary screen for sprint planning and daily standups.

### 3.1 Board — Full View

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Sprint 14 — Engineering          [Board▾] [List] [⋯]    [+ New Task] [⋯]  │
│ ─────────────────────────────────────────────────────────────────────────── │
│ Filter: [Status▾] [Assignee▾] [Priority▾] [Label▾] [Search..]    Clear   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─BACKLOG──────┐ ┌─IN PROGRESS──┐ ┌─IN REVIEW─────┐ ┌─DONE────────────┐  │
│  │  6 items     │ │  4 items     │ │  3 items      │ │  8 items        │  │
│  │──────────────│ │──────────────│ │───────────────│ │─────────────────│  │
│  │              │ │              │ │               │ │                 │  │
│  │ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌───────────┐ │ │ ┌───────────┐  │  │
│  │ │[>>>] SIO │ │ │ │[>>>] SIO │ │ │ │[>>>] SIO  │ │ │ │[>>>] SIO  │  │  │
│  │ │  -231    │ │ │ │  -245    │ │ │ │  -228     │ │ │ │  -220     │  │  │
│  │ │ Migrate  │ │ │ │ Auth     │ │ │ │ Dashboard │ │ │ │ Landing   │  │  │
│  │ │ DB schema│ │ │ │ refresh  │ │ │ │ charts    │ │ │ │ page      │  │  │
│  │ │          │ │ │ │ token    │ │ │ │           │ │ │ │           │  │  │
│  │ │ 🔴 P0    │ │ │ │ 🟡 P1    │ │ │ │ 🟡 P1     │ │ │ │ 🟢 P2     │  │  │
│  │ │ 👤Marcus │ │ │ │ 👤Priya  │ │ │ │ 👤Alex    │ │ │ │ 👤Marcus  │  │  │
│  │ │ 🏷backend│ │ │ │ 🏷auth   │ │ │ │ 🏷frontend│ │ │ │ 🏷frontend│  │  │
│  │ │ 📅 Jul 10│ │ │ │ 📅 Jul 12│ │ │ │ 📅 Jul 08 │ │ │ │ 📅 Jul 05 │  │  │
│  │ │ 🔗 2     │ │ │ │ 🔗 1     │ │ │ │           │ │ │ │           │  │  │
│  │ └──────────┘ │ │ └──────────┘ │ │ └───────────┘ │ │ └───────────┘  │  │
│  │              │ │              │ │               │ │                 │  │
│  │ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌───────────┐ │ │ ┌───────────┐  │  │
│  │ │[>>>] SIO │ │ │ │[>>>] SIO │ │ │ │[>>>] SIO  │ │ │ │[>>>] SIO  │  │  │
│  │ │  -232    │ │ │ │  -246    │ │ │ │  -229     │ │ │ │  -221     │  │  │
│  │ │ Rate    │ │ │ │ Payment  │ │ │ │ Onboard   │ │ │ │ CI/CD     │  │  │
│  │ │ limiting│ │ │ │ webhook  │ │ │ │ flow      │ │ │ │ pipeline  │  │  │
│  │ └──────────┘ │ │ └──────────┘ │ │ └───────────┘ │ │ └───────────┘  │  │
│  │              │ │              │ │               │ │                 │  │
│  │  ... 4 more  │ │              │ │               │ │  ... 6 more     │  │
│  │              │ │              │ │               │ │                 │  │
│  │──────────────│ │──────────────│ │───────────────│ │─────────────────│  │
│  │ + Add task   │ │              │ │               │ │                 │  │
│  └──────────────┘ └──────────────┘ └───────────────┘ └─────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Board — Swimlane View (Grouped by Assignee)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Sprint 14         Group: [Assignee▾]        [ Ungroup ]                     │
├──────────────────────────────────────────────────────────────────────────────┤
│              │ BACKLOG        │ IN PROGRESS  │ IN REVIEW   │ DONE          │
│──────────────┼────────────────┼──────────────┼─────────────┼───────────────│
│ 👤 Marcus    │ ┌────────────┐ │ ┌──────────┐ │             │ ┌───────────┐ │
│   3 items    │ │ SIO-231    │ │ │ SIO-245  │ │             │ │ SIO-220   │ │
│              │ │ Migrate DB │ │ │ Auth     │ │             │ │ Landing   │ │
│              │ └────────────┘ │ └──────────┘ │             │ └───────────┘ │
│──────────────┼────────────────┼──────────────┼─────────────┼───────────────│
│ 👤 Priya     │                │ ┌──────────┐ │ ┌─────────┐ │               │
│   2 items    │                │ │ SIO-246  │ │ │ SIO-229 │ │               │
│              │                │ │ Payment  │ │ │ Onboard │ │               │
│              │                │ └──────────┘ │ └─────────┘ │               │
│──────────────┼────────────────┼──────────────┼─────────────┼───────────────│
│ 👤 Alex      │                │              │ ┌─────────┐ │               │
│   1 item     │                │              │ │ SIO-228 │ │               │
│              │                │              │ │ Charts  │ │               │
│              │                │              │ └─────────┘ │               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Board — Drag State

```
┌────────────────────────────────────┐
│  ┌──────────┐                      │
│  │ SIO-231  │  ← Card lifts with   │
│  │ Migrate  │    shadow + scale     │
│  │ DB schema│    transform          │
│  └──────────┘                      │
│         ╲                           │
│          ╲  (ghost placeholder      │
│           ╲  remains in source      │
│            ╲  column)               │
│  ┌ ─ ─ ─ ─ ┐                       │
│  │ ░░░░░░░░ │  ← Drop zone         │
│  │ ░░░░░░░░ │    highlights when    │
│  └ ─ ─ ─ ─ ┘    card hovers        │
└────────────────────────────────────┘
```

### 3.4 Board — WIP Limit Warning

```
┌─IN PROGRESS──┐
│  4 / 3 items │   ← Exceeds WIP limit
│──────────────│
│ ⚠ WIP limit  │   ← Warning banner
│   reached (3)│
│──────────────│
│ ┌──────────┐ │
│ │ SIO-245  │ │   ← New task highlighted in amber
│ │ Auth     │ │
│ │ refresh  │ │
│ │ ⚠ over   │ │
│ └──────────┘ │
│              │
│ [Move to     │   ← Quick action
│  Backlog]    │
└──────────────┘
```

---

## 4. WS-03 List View

Marcus's primary screen. Optimized for scanning, filtering, and bulk operations.

### 4.1 List View — Full

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ My Work                    [List●] [Board]              [+ New Task] [⋯]   │
├──────────────────────────────────────────────────────────────────────────────┤
│ Filter: [Assignee: Me▾] [Status▾] [Priority▾] [Due: This Sprint▾]  Clear  │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌──┬───────┬────────────────────┬────────┬───────┬──────┬────────┬────────┐ │
│ │☑ │ ID    │ Title              │Status  │Prior  │Due   │Assignee│Labels  │ │
│ ├──┼───────┼────────────────────┼────────┼───────┼──────┼────────┼────────┤ │
│ │□ │SIO-245│ Auth refresh token │ InProgr│ 🟡 P1 │ Jul12│ 👤Me   │ 🔵auth │ │
│ │  │       │                    │ ●●●○○  │       │      │        │        │ │
│ ├──┼───────┼────────────────────┼────────┼───────┼──────┼────────┼────────┤ │
│ │□ │SIO-231│ Migrate DB schema  │ Backlog│ 🔴 P0 │ Jul10│ 👤Me   │ 🔵back │ │
│ │  │       │                    │ ○○○○○  │       │      │        │        │ │
│ ├──┼───────┼────────────────────┼────────┼───────┼──────┼────────┼────────┤ │
│ │□ │SIO-246│ Payment webhook    │ InProgr│ 🟡 P1 │ Jul14│ 👤Me   │ 🔵pay  │ │
│ │  │       │ validation         │ ●●○○○  │       │      │        │        │ │
│ ├──┼───────┼────────────────────┼────────┼───────┼──────┼────────┼────────┤ │
│ │□ │SIO-250│ Write unit tests   │ Backlog│ 🟢 P2 │ Jul16│ 👤Me   │ 🔵test │ │
│ │  │       │ for auth module    │ ○○○○○  │       │      │        │        │ │
│ ├──┼───────┼────────────────────┼────────┼───────┼──────┼────────┼────────┤ │
│ │□ │SIO-251│ Update API docs    │ Backlog│ 🟢 P2 │ Jul18│ 👤Me   │ 🔵docs │ │
│ │  │       │ for v2 endpoints   │ ○○○○○  │       │      │        │        │ │
│ └──┴───────┴────────────────────┴────────┴───────┴──────┴────────┴────────┘ │
│                                                                              │
│ Showing 5 of 5 tasks                              Sort: [Priority ▾]        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 List View — Grouped by Status

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Sprint 14 — Engineering             Group: [Status▾]   Sort: [Priority ▾]  │
├──────────────────────────────────────────────────────────────────────────────┤
│ ▾ 🔴 Blocked (1)                                                          │
│   ├─ SIO-238  Payment gateway cert expired      P0  👤Marcus  Jul 08      │
│                                                                              │
│ ▾ 🟡 In Progress (4)                                                       │
│   ├─ SIO-245  Auth refresh token flow            P1  👤Priya   Jul 12      │
│   ├─ SIO-246  Payment webhook validation         P1  👤Marcus  Jul 14      │
│   ├─ SIO-247  Search indexing pipeline            P1  👤Marcus  Jul 13      │
│   └─ SIO-248  Dashboard chart components          P1  👤Alex    Jul 15      │
│                                                                              │
│ ▾ ⬜ Backlog (6)                                                           │
│   ├─ SIO-231  Migrate DB schema to v3             P0  👤Marcus  Jul 10      │
│   ├─ SIO-250  Unit tests for auth module          P2  👤Marcus  Jul 16      │
│   ├─ SIO-251  Update API docs for v2              P2  👤Marcus  Jul 18      │
│   └─ ... 3 more                                                           │
│                                                                              │
│ ▾ ✅ Done (8)                                                              │
│   ├─ SIO-220  Landing page                        P2  👤Marcus  Jul 05 ✓   │
│   ├─ SIO-221  CI/CD pipeline                      P1  👤Marcus  Jul 04 ✓   │
│   └─ ... 6 more                                                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 List View — Inline Edit

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ │□ │SIO-245│ Auth refresh token  │ InProgr│ 🟡 P1 │ Jul12│ 👤Me  │ 🔵auth│ │
│   │       │                     │ ●●●○○  │       │      │       │       │ │
│              ^^^^ Double-click   │                               │       │ │
│              to inline edit      │  ┌─────────────────┐          │       │ │
│                                  │  │ ○ Backlog       │          │       │ │
│                                  │  │ ● In Progress   │          │       │ │
│                                  │  │ ○ In Review     │          │       │ │
│                                  │  │ ○ Done          │          │       │ │
│                                  │  │ ○ Cancelled     │          │       │ │
│                                  │  └─────────────────┘          │       │ │
│                                  └───────────────────────────────┘       │ │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. WS-04 Task Detail Panel

Opens as a slide-in panel from the right (60% width) or as a full-screen modal. Preserves context — user can see the board/list behind.

### 5.1 Task Detail — Full

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ┌── Board/List ──────────┐ ║ ┌── Task Detail Panel (60%) ───────────────┐ │
│  │                        │ ║ │                                          │ │
│  │  (source view visible  │ ║ │  ✕                        [⋯]  [ ^ ] [ v ]│ │
│  │   at reduced opacity)  │ ║ │                                          │ │
│  │                        │ ║ │  SIO-245 ─ Auth refresh token flow       │ │
│  │  ┌──────────┐          │ ║ │  ─────────────────────────────────────── │ │
│  │  │ ░░░░░░░░ │← dimmed  │ ║ │                                          │ │
│  │  └──────────┘          │ ║ │  Status: [In Progress ▾]  Priority: [🟡 P1▾]│
│  │                        │ ║ │  Assignee: [👤Priya ▾]    Sprint: [Sprint14▾]│
│  │                        │ ║ │  Due: [Jul 12, 2026 ▾]    Labels: [+ add] │ │
│  │                        │ ║ │                                          │ │
│  └────────────────────────┘ ║ │  ── Description ──────────────────────── │ │
│                              │ ║ │                                          │ │
│                              │ ║ │  The current auth refresh token flow    │ │
│                              │ ║ │  uses short-lived tokens that expire    │ │
│                              │ ║ │  after 15 min. We need to implement     │ │
│                              │ ║ │  a sliding-window refresh mechanism...  │ │
│                              │ ║ │                                          │ │
│                              │ ║ │  ── Subtasks (2/4) ─────────────────── │ │
│                              │ ║ │  ■ Design token rotation strategy       │ │
│                              │ ║ │  ■ Implement refresh endpoint           │ │
│                              │ ║ │  □ Write integration tests              │ │
│                              │ ║ │  □ Update API documentation             │ │
│                              │ ║ │                                          │ │
│                              │ ║ │  ── Linked Items ────────────────────── │ │
│                              │ ║ │  🔗 Spec: Auth v2 Design Doc            │ │
│                              │ ║ │  🔗 SIO-231: Migrate DB schema          │ │
│                              │ ║ │  🔗 SIO-246: Payment webhook (blocks)   │ │
│                              │ ║ │                                          │ │
│                              │ ║ │  ── Comments (3) ────────────────────── │ │
│                              │ ║ │                                          │ │
│                              │ ║ │  👤Marcus  2h ago                        │ │
│                              │ ║ │  Started on the endpoint. Quick         │ │
│                              │ ║ │  question: should we support sliding    │ │
│                              │ ║ │  window or fixed expiry?                │ │
│                              │ ║ │                                          │ │
│                              │ ║ │  👤Sarah   1h ago                        │ │
│                              │ ║ │  Sliding window please. See the         │ │
│                              │ ║ │  RFC linked above. @Marcus              │ │
│                              │ ║ │                                          │ │
│                              │ ║ │  👤Priya   30m ago                       │ │
│                              │ ║ │  Updated the spec to reflect            │ │
│                              │ ║ │  sliding-window approach. ✓             │ │
│                              │ ║ │                                          │ │
│                              │ ║ │  ┌────────────────────────────────┐     │ │
│                              │ ║ │  │ Write a comment...             │     │ │
│                              │ ║ │  │ @mention /slash                │     │ │
│                              │ ║ │  └────────────────────────────────┘     │ │
│                              │ ║ │                              [Send]     │ │
│                              │ ║ │                                          │ │
│                              │ ║ │  ── Activity Log ────────────────────── │ │
│                              │ ║ │  👤Marcus moved to In Progress · 2h ago │ │
│                              │ ║ │  👤Sarah assigned to Priya · 1d ago     │ │
│                              │ ║ │  👤Priya created · 3d ago               │ │
│                              │ ║ │                                          │ │
│                              │ ║ │  ── Attachments ────────────────────── │ │
│                              │ ║ │  📎 auth-flow-diagram.png (245 KB)     │ │
│                              │ ║ │  📎 + Add attachment                    │ │
│                              │ ║ │                                          │ │
│                              │ ║ └──────────────────────────────────────────┘ │
│                              │ ║  640px                                      │
│                              │
│                              │  Total: 1440px
```

### 5.2 Task Detail — AI Triage Suggestion Banner

```
┌──────────────────────────────────────────────────────────────┐
│  ✕                                                          │
│                                                              │
│  SIO-255 ─ New task                                         │
│  ─────────────────────────────────────────────────────────── │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🤖 AI Triage Suggestion                          [Accept All]│  │
│  │                                                        │  │
│  │  Status:  In Progress  (suggested)    ○ ○ ○ ○ ●       │  │
│  │  Priority: P1  (suggested)            [Accept]         │  │
│  │  Assignee: @Marcus  (suggested)       [Accept]         │  │
│  │  Labels:   backend, auth              [Accept]         │  │
│  │  Sprint:   Sprint 14  (suggested)     [Accept]         │  │
│  │                                                        │  │
│  │  Confidence: 87% — high                                 │  │
│  │                                                        │  │
│  │  [Dismiss]  [Accept All]  [Edit & Accept]              │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Status: [In Progress ▾]  Priority: [🟡 P1 ▾]              │
│  ...                                                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. WS-05 Document Editor

Real-time collaborative editor (TipTap + Yjs). First-class document entity.

### 6.1 Doc Editor — Full View

````
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◄ Back to Docs    RFC: Auth v2 Refresh Token Design     Draft● In Review ○ │
│  ─────────────────────────────────────────────────────────────────────────── │
│  👤Sarah 👤Marcus 👤Priya (3 editing)                     [Share] [⋯]     │
├───────────────────────────────────────────────┬──────────────────────────────┤
│                                               │                              │
│  # RFC: Auth v2 Refresh Token Design          │  ── Outline ────────────    │
│                                               │  • Background               │
│  ## Background                                │  • Problem Statement        │
│                                               │  • Proposed Solution         │
│  Our current auth flow uses short-lived JWT   │  • Implementation Plan      │
│  tokens that expire after 15 minutes. This    │  • Alternatives              │
│  forces frequent re-authentication, which     │  • Security Considerations  │
│  degrades UX.                                 │  • Timeline                  │
│                                               │                              │
│  ## Problem Statement                         │  ── Comments (5) ────────   │
│                                               │  ○ Open (3)                 │
│  Users are prompted to re-login approximately │  ○ Resolved (2)             │
│  every 15 minutes during active sessions.     │                              │
│  This causes:                                 │  ── Backlinks ──────────    │
│  1. UX friction in long coding sessions       │  🔗 SIO-245 references this │
│  2. Lost work when session expires mid-edit   │  🔗 Sprint 14 spec doc      │
│  3. Support tickets about "random logouts"    │                              │
│                                               │                              │
│  ## Proposed Solution                          │                              │
│                                               │                              │
│  Implement sliding-window refresh tokens:     │                              │
│                                               │                              │
│  ```                                           │                              │
│  ACCESS_TOKEN_TTL = 15 min                    │                              │
│  REFRESH_TOKEN_TTL = 7 days                   │                              │
│  SLIDING_WINDOW = true                        │                              │
│  ```                                           │                              │
│                                               │                              │
│  ─── AI Writing Toolbar ────────────────      │                              │
│  │  [Continue] [Summarize] [Rewrite]         │                              │
│  │  [Fix Grammar] [Translate]                │                              │
│  ────────────────────────────────────────     │                              │
│                                               │                              │
│  ─── Version History ──────────────────       │                              │
│  │  v3 — Priya — 2h ago (current)            │                              │
│  │  v2 — Marcus — 1d ago                     │                              │
│  │  v1 — Sarah — 3d ago                      │                              │
│  └───────────────────────────────────────     │                              │
│                                               │                              │
├───────────────────────────────────────────────┴──────────────────────────────┤
│  ⌨ / for slash commands   [[ for wiki-links   @ to mention                  │
└──────────────────────────────────────────────────────────────────────────────┘
````

### 6.2 Doc Editor — Inline Comment

```
│                                               │
│  Users are prompted to re-login approximately │
│  every 15 minutes during active sessions.     │
│  ████████████████████████                     │ ← Highlighted text range
│  This causes:                                 │
│                                               │
│  ┌────────────────────────────────────────┐   │
│  │ 👤Marcus  1h ago                  [⋯]  │   │
│  │                                        │   │
│  │ Is this accurate? I thought it was     │   │
│  │ 30 min, not 15 min.                    │   │
│  │                                        │   │
│  │ 👤Sarah   45m ago                 [⋯]  │   │
│  │                                        │   │
│  │ @Marcus You're right, corrected.       │   │
│  │                                        │   │
│  │  ┌──────────────────────────────────┐  │   │
│  │  │ Reply...                         │  │   │
│  │  └──────────────────────────────────┘  │   │
│  │                           [Resolve]    │   │
│  └────────────────────────────────────────┘   │
│                                               │
```

### 6.3 Doc Editor — Slash Command Menu

```
│  Type / for commands...                      │
│  ─────────────────────────────────────────── │
│  │  🔍 Filter commands...                   │
│  │                                           │
│  │  ── Blocks ──                             │
│  │  │  Heading 1                            │
│  │  │  Heading 2                            │
│  │  │  Heading 3                            │
│  │  │  Bullet List                          │
│  │  │  Numbered List                        │
│  │  │  To-Do List                           │
│  │  │  Code Block                           │
│  │  │  Quote                                │
│  │  │  Divider                              │
│  │  │  Table                                │
│  │                                           │
│  │  ── Embeds ──                             │
│  │  │  /task   → Create linked task         │
│  │  │  /doc    → Embed document             │
│  │  │  /code   → Code block                 │
│  │  │  /embed  → External embed             │
│  │                                           │
│  │  ── Mention ──                            │
│  │  │  @user   → Mention teammate           │
│  │  │  #task   → Reference task             │
│  │  │  [[doc]] → Wiki-link to document      │
│  └───────────────────────────────────────────┘
```

---

## 7. WS-06 Automation Builder

Visual no-code builder. Opens as a slide-in panel or full-page view.

### 7.1 Automation Builder — Flow View

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◄ Automations    Stale Task Nudge              ● Active    [Run Now] [⋯]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ Trigger ──────────────┐                                                │
│  │  🔔 Task updated       │                                                │
│  │  Field: [any ▾]        │                                                │
│  │  Time elapsed: [7 days]│                                                │
│  └───────────┬────────────┘                                                │
│              │                                                               │
│              ▼                                                               │
│  ┌─ Condition ────────────┐                                                │
│  │  🔀 AND                 │                                                │
│  │  ├─ Status ≠ Done       │                                                │
│  │  ├─ Status ≠ Cancelled  │                                                │
│  │  └─ Status ≠ Archived   │                                                │
│  └───────────┬────────────┘                                                │
│              │                                                               │
│          ┌───┴───┐                                                          │
│          ▼       ▼                                                          │
│  ┌─ Action 1 ─┐  ┌─ Action 2 ─────────────┐                               │
│  │ 📧 Notify   │  │ 💬 Add comment          │                               │
│  │ To: assignee│  │ "@assignee This task    │                               │
│  │ + EM        │  │ has been idle for 7+    │                               │
│  │ Message:    │  │ days. Please update     │                               │
│  │ "This task  │  │ status or close."       │                               │
│  │  is stale"  │  │                         │                               │
│  └─────────────┘  └─────────────────────────┘                               │
│                                                                              │
│  ── Builder Controls ─────────────────────────────────────────────────────  │
│  [+ Trigger]  [+ Condition]  [+ Action]                                     │
│                                                                              │
│  ── Template Library ─────────────────────────────────────────────────────  │
│  │  📋 Auto-assign on status change                                          │
│  │  📋 Weekly digest summary                                                 │
│  │  📋 Blocker escalation                                                   │
│  │  📋 Sprint close reminder                                                │
│  │  [Browse all 50+ templates →]                                            │
│  └──────────────────────────────────────────────────────────────────────────│
│                                                                              │
│  ── Run History (Last 5 runs) ───────────────────────────────────────────  │
│  │  ✅  Run #47  SIO-238  2h ago       (success, notified Marcus + Sarah)  │
│  │  ✅  Run #46  SIO-215  1d ago       (success, notified Priya)           │
│  │  ⚠   Run #45  SIO-210  2d ago       (skipped: task already updated)    │
│  │  ✅  Run #44  SIO-203  3d ago       (success, notified Alex)            │
│  │  ✅  Run #43  SIO-199  4d ago       (success, notified Marcus)          │
│  └──────────────────────────────────────────────────────────────────────────│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Automation Builder — New Automation Modal

```
┌──────────────────────────────────────────────────────────┐
│  New Automation                                      ✕   │
│  ─────────────────────────────────────────────────────── │
│                                                          │
│  Name: [Stale Task Nudge________________________]        │
│                                                          │
│  Start from:                                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ○ Blank flow                                      │   │
│  │  ● Use a template                                 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ── Popular Templates ──────────────────────────────    │
│  │                                                      │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  │ 📋 Stale    │ │ 📋 Auto     │ │ 📋 Blocker  │   │
│  │  │ Task Nudge  │ │ Assign      │ │ Escalation  │   │
│  │  │             │ │             │ │             │   │
│  │  │ Notify when │ │ Assign on   │ │ Notify EM   │   │
│  │  │ task is     │ │ status      │ │ when task   │   │
│  │  │ idle 7+ days│ │ change      │ │ blocked 48h │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘   │
│  │                                                      │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  │ 📋 Weekly   │ │ 📋 Sprint   │ │ 📋 PR Auto  │   │
│  │  │ Digest      │ │ Close       │ │ Close       │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘   │
│  │                                                      │
│  │  [Browse all 50+ templates →]                        │
│  └──────────────────────────────────────────────────────│
│                                                          │
│                           [Cancel]  [Create]            │
└──────────────────────────────────────────────────────────┘
```

---

## 8. WS-07 AI Copilot Panel

Persistent sidebar panel. Accessible from any screen.

### 8.1 Copilot Panel — Empty State

```
┌──────────────────┐
│  🤖 AI Copilot   │
│  ──────────────  │
│                  │
│  👋 Hi Sarah!    │
│                  │
│  I can help you: │
│                  │
│  💬 Create tasks │
│  📊 Summarize    │
│     sprints      │
│  ✍️  Write &      │
│     edit docs    │
│  🔍 Triage new   │
│     tasks        │
│                  │
│  ┌──────────────┐│
│  │ Ask me       ││
│  │ anything...  ││
│  │              ││
│  └──────────────┘│
│          [Send]  │
│                  │
│  ⌨ Try:         │
│  "Create a P1    │
│   task for..."   │
│                  │
│  ──────────────  │
│  Recent:         │
│  ○ Sprint 14     │
│    summary       │
│  ○ What's        │
│    blocked?      │
│  ○ Status report │
│                  │
└──────────────────┘
  320px
```

### 8.2 Copilot Panel — NL Task Creation

```
┌──────────────────┐
│  🤖 AI Copilot   │
│  ──────────────  │
│                  │
│  👤 You          │
│  Create a P1     │
│  incident task   │
│  for checkout    │
│  latency, assign │
│  Marcus, link    │
│  the on-call doc │
│                  │
│  🤖 AI           │
│  ──────────────  │
│  Parsed:         │
│  ┌──────────────┐│
│  │ Title:       ││
│  │ Checkout     ││
│  │ latency      ││
│  │ incident     ││
│  │              ││
│  │ Priority: P1 ││
│  │ Assignee:    ││
│  │ Marcus       ││
│  │ Labels:      ││
│  │ incident     ││
│  │ Linked Doc:  ││
│  │ On-Call Run  ││
│  │ book         ││
│  └──────────────┘│
│                  │
│  ┌──────────────┐│
│  │ Anything to  ││
│  │ adjust?      ││
│  └──────────────┘│
│                  │
│  [Create Task]   │
│  [Edit Fields]   │
│  [Cancel]        │
│                  │
└──────────────────┘
```

### 8.3 Copilot Panel — Smart Summary

```
┌──────────────────┐
│  🤖 AI Copilot   │
│  ──────────────  │
│                  │
│  👤 You          │
│  Summarize       │
│  Sprint 14       │
│                  │
│  🤖 AI           │
│  ──────────────  │
│  📊 Sprint 14    │
│  Summary         │
│                  │
│  Duration:       │
│  Jul 1 - Jul 14  │
│                  │
│  Velocity:       │
│  34/38 pts (89%) │
│                  │
│  Done:     8     │
│  In Prog:  3     │
│  Carry:    2     │
│                  │
│  🔴 1 Blocker:   │
│  SIO-238:        │
│  Payment gateway │
│  cert expired.   │
│  Needs ops help. │
│                  │
│  ⚡ Highlight:   │
│  Auth refresh    │
│  token flow      │
│  shipped 2 days  │
│  early.          │
│                  │
│  [Copy] [Share]  │
│  [Export MD]     │
│                  │
│  Tone: [Profess] │
│  Length: [Medium]│
│                  │
└──────────────────┘
```

---

## 9. WS-08 Notification Center

Dropdown panel from the top bar bell icon.

### 9.1 Notification Bell — Badge

```
┌─────────────┐
│  🔔 3        │   ← Unread count badge (red circle)
└─────────────┘
```

### 9.2 Notification Center — Dropdown

```
┌────────────────────────────────────────────────┐
│  Notifications                    [Mark all read] │
│  ──────────────────────────────────────────────  │
│  Filter: [All▾] [Mentions] [Assignments] [AI]    │
│  ──────────────────────────────────────────────  │
│                                                  │
│  ── Today ──                                     │
│  │ 🔴 👤Marcus mentioned you in SIO-245          │
│  │    "Quick question: should we support..."     │
│  │    2h ago                                    │
│  │                                               │
│  │ 🔴 🤖 AI Sprint Summary ready                 │
│  │    Sprint 14 summary has been generated.      │
│  │    [View Summary]                             │
│  │    30m ago                                   │
│  │                                               │
│  │ 🔴 📧 Priya shared a doc with you             │
│  │    "Auth v2 Spec - Updated"                   │
│  │    [Open Doc]                                 │
│  │    15m ago                                   │
│  ──────────────────────────────────────────────  │
│                                                  │
│  ── Yesterday ──                                 │
│  │ ○ ✅ SIO-220 marked Done by Marcus            │
│  │    Landing page                               │
│  │    1d ago                                    │
│  │                                               │
│  │ ○ 🔔 SIO-231 is overdue                       │
│  │    Migrate DB schema was due Jul 10           │
│  │    [View Task]                                │
│  │    1d ago                                    │
│  ──────────────────────────────────────────────  │
│                                                  │
│  [View All Notifications]                        │
└────────────────────────────────────────────────┘
   400px wide
```

---

## 10. WS-09 Onboarding Wizard

First-time user experience. 3-step modal overlay.

### 10.1 Step 1 — Workspace Setup

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│            ⬡ Sprintio                                    │
│        Sprint fast. Ship together.                       │
│                                                          │
│  ── Step 1 of 3 ──────── ● ○ ○ ────────────────────    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                                                    │   │
│  │  Name your workspace                               │   │
│  │  [__________________________]                      │   │
│  │   e.g. "Acme Engineering"                         │   │
│  │                                                    │   │
│  │  Create your first Space                           │   │
│  │  [__________________________]                      │   │
│  │   e.g. "Engineering"                               │   │
│  │                                                    │   │
│  │  ── Or start from a template ──                    │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐    │   │
│  │  │ 🚀 Blank   │ │ 💻 Eng     │ │ 📈 Product │    │   │
│  │  │ Start fresh│ │ Sprint     │ │ Backlog    │    │   │
│  │  │            │ │ planning   │ │ template   │    │   │
│  │  └────────────┘ └────────────┘ └────────────┘    │   │
│  │                                                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│                                    [Skip for now]        │
│                                    [Continue →]          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 10.2 Step 2 — Invite Team

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│            ⬡ Sprintio                                    │
│                                                          │
│  ── Step 2 of 3 ──────── ● ● ○ ────────────────────    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                                                    │   │
│  │  Invite your team                                  │   │
│  │  (You can always invite later)                     │   │
│  │                                                    │   │
│  │  ┌────────────────────────────────────────────┐   │   │
│  │  │ marcus@acme.com, priya@acme.com,           │   │   │
│  │  │ alex@acme.com                              │   │   │
│  │  └────────────────────────────────────────────┘   │   │
│  │  Enter emails, separated by commas                │   │
│  │                                                    │   │
│  │  Role: [Member ▾]  (default for invited users)     │   │
│  │                                                    │   │
│  │  ── Or copy invite link ──                         │   │
│  │  [🔗 Copy Link]                                    │   │
│  │                                                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│              [← Back]  [Skip]  [Send Invites →]         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 10.3 Step 3 — Quick Tour

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ── Step 3 of 3 ──────── ● ● ● ────────────────────    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                                                    │   │
│  │  ┌──────────────────────────────────────────┐     │   │
│  │  │                                            │     │   │
│  │  │           (Board View Preview)             │     │   │
│  │  │                                            │     │   │
│  │  │   ┌─────────┐ ┌─────────┐ ┌─────────┐    │     │   │
│  │  │   │ Backlog  │ │ In Prog │ │  Done   │    │     │   │
│  │  │   │          │ │         │ │         │    │     │   │
│  │  │   │ ┌──────┐ │ │ ┌─────┐│ │ ┌─────┐ │    │     │   │
│  │  │   │ │Task 1│ │ │ │Task3││ │ │Task5│ │    │     │   │
│  │  │   │ └──────┘ │ │ └─────┘│ │ └─────┘ │    │     │   │
│  │  │   │ ┌──────┐ │ │ ┌─────┐│ │         │    │     │   │
│  │  │   │ │Task 2│ │ │ │Task4││ │         │    │     │   │
│  │  │   │ └──────┘ │ │ └─────┘│ │         │    │     │   │
│  │  │   └─────────┘ └─────────┘ └─────────┘    │     │   │
│  │  │                                            │     │   │
│  │  └──────────────────────────────────────────┘     │   │
│  │                                                    │   │
│  │  💡 Hotspot 1: Board View                         │   │
│  │  Drag tasks between columns to update status.     │   │
│  │                                                    │   │
│  │  💡 Hotspot 2: + New Task                         │   │
│  │  Click here or press N to create a task.          │   │
│  │                                                    │   │
│  │  💡 Hotspot 3: AI Copilot                         │   │
│  │  Ask me anything in natural language.             │   │
│  │                                                    │   │
│  │  [Next tip →]  [1/4]                              │   │
│  │                                                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│              [← Back]  [Skip Tour]  [Finish ✓]          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 11. WS-10 Settings & Workspace Admin

### 11.1 Settings — Workspace

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Settings                                                                  │
│  ─────────────────────────────────────────────────────────────────────────── │
│  ┌── Nav ──────┐ ┌── Content ─────────────────────────────────────────────┐ │
│  │             │ │                                                          │ │
│  │ ● Workspace │ │  Workspace Settings                                     │ │
│  │   General   │ │  ────────────────────────────────────────────────────── │ │
│  │   Members   │ │                                                          │ │
│  │   Billing   │ │  Workspace name:                                        │ │
│  │   Security  │ │  [Acme Engineering________________]                     │ │
│  │             │ │                                                          │ │
│  │ ────────   │ │  Workspace URL:                                         │ │
│  │   Profile   │ │  [sprintio.app/acme-engineering___]                     │ │
│  │   Prefs     │ │                                                          │ │
│  │   Notifs    │ │  Default view:  [Board ▾]                               │ │
│  │             │ │                                                          │ │
│  │ ────────   │ │  Timezone:       [UTC ▾]                                │ │
│  │   Help      │ │                                                          │ │
│  │             │ │  [Save Changes]                                          │ │
│  └─────────────┘ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Settings — Members

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ┌── Nav ──────┐ ┌── Members ──────────────────────────────────────────────┐ │
│  │             │ │                                                          │ │
│  │ ● Workspace │ │  Team Members (4)                  [Invite Member +]    │ │
│  │   General   │ │  ────────────────────────────────────────────────────── │ │
│  │ ● Members   │ │                                                          │ │
│  │   Billing   │ │  👤 Sarah Okafor          Owner     [Manage ▾]         │ │
│  │   Security  │ │     sarah@acme.com                                    │ │
│  │             │ │                                                          │ │
│  │             │ │  👤 Marcus Lindqvist      Admin     [Manage ▾]         │ │
│  │             │ │     marcus@acme.com                                    │ │
│  │             │ │                                                          │ │
│  │             │ │  👤 Priya Raman           Member    [Manage ▾]         │ │
│  │             │ │     priya@acme.com                                     │ │
│  │             │ │                                                          │ │
│  │             │ │  👤 Alex Mercer           Member    [Manage ▾]         │ │
│  │             │ │     alex@acme.com                                      │ │
│  │             │ │                                                          │ │
│  │             │ │  ── Roles ──                                            │ │
│  │             │ │  Owner: Full access, billing, delete workspace         │ │
│  │             │ │  Admin: Manage members, settings, all content          │ │
│  │             │ │  Member: Create, edit, comment on all content          │ │
│  │             │ │  Guest: Limited access to shared items only            │ │
│  └─────────────┘ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. WS-11 Empty & Loading States

### 12.1 Empty State — New Workspace

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Board View                                                                 │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│                                                                              │
│                    📋                                                        │
│                                                                              │
│                    Your board is empty                                        │
│                                                                              │
│                    Create your first task to get started.                    │
│                    Drag it between columns to update status.                 │
│                                                                              │
│                    ┌──────────────┐                                          │
│                    │ + New Task   │                                          │
│                    └──────────────┘                                          │
│                                                                              │
│                    or                                                        │
│                                                                              │
│                    📥 Import from CSV                                         │
│                                                                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Empty State — With Hint

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Board View                                                                 │
│  ─────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│                    ┌─────────┐                                               │
│                    │ ░░░░░░░ │  ← Skeleton card                              │
│                    │ ░░░░░░░ │                                               │
│                    └─────────┘                                               │
│                                                                              │
│                    💡 Tip: Press N to create a task, or ask the              │
│                       AI Copilot to create one for you.                      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 12.3 Loading State — Skeleton Screens

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Sprint 14                              [Board] [List]           [+ New]    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─BACKLOG──────┐ ┌─IN PROGRESS──┐ ┌─IN REVIEW─────┐ ┌─DONE────────────┐  │
│  │  ░ items     │ │  ░ items     │ │  ░ items      │ │  ░ items        │  │
│  │──────────────│ │──────────────│ │───────────────│ │─────────────────│  │
│  │ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌───────────┐ │ │ ┌───────────┐  │  │
│  │ │ ░░░░░░░░ │ │ │ │ ░░░░░░░░ │ │ │ │ ░░░░░░░░░ │ │ │ │ ░░░░░░░░░ │  │  │
│  │ │ ░░░░░░░░ │ │ │ │ ░░░░░░░░ │ │ │ │ ░░░░░░░░░ │ │ │ │ ░░░░░░░░░ │  │  │
│  │ │ ░░       │ │ │ │ ░░       │ │ │ │ ░░        │ │ │ │ ░░        │  │  │
│  │ └──────────┘ │ │ └──────────┘ │ │ └───────────┘ │ │ └───────────┘  │  │
│  │ ┌──────────┐ │ │ ┌──────────┐ │ │               │ │ ┌───────────┐  │  │
│  │ │ ░░░░░░░░ │ │ │ │ ░░░░░░░░ │ │ │               │ │ │ ░░░░░░░░░ │  │  │
│  │ │ ░░░░░░░░ │ │ │ │ ░░░░░░░░ │ │ │               │ │ │ ░░░░░░░░░ │  │  │
│  │ └──────────┘ │ │ └──────────┘ │ │               │ │ └───────────┘  │  │
│  └──────────────┘ └──────────────┘ └───────────────┘ └─────────────────┘  │
│                                                                              │
│                         ⟳ Loading board data...                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 12.4 Error State

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                                                                              │
│                    ⚠️                                                        │
│                                                                              │
│                    Something went wrong                                       │
│                                                                              │
│                    We couldn't load your board.                              │
│                    This might be a temporary issue.                          │
│                                                                              │
│                    ┌──────────────┐                                          │
│                    │ Try Again    │                                          │
│                    └──────────────┘                                          │
│                                                                              │
│                    Still not working?                                         │
│                    Check status.sprintio.app                                 │
│                                                                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Responsive Behavior Notes

### Breakpoint System

```
┌─────────────────────────────────────────────────────────────────┐
│  Breakpoint        Width          Layout Changes                │
├─────────────────────────────────────────────────────────────────┤
│  Desktop XL        >= 1440px      Full sidebar (240px)          │
│                                   Task detail: 60% slide-in     │
│                                   Board: 4 columns visible      │
│                                                                 │
│  Desktop           1024-1439px    Collapsed sidebar (64px)      │
│                                   Task detail: 50% slide-in     │
│                                   Board: 3 columns + scroll     │
│                                                                 │
│  Tablet            768-1023px     Hidden sidebar (hamburger)    │
│                                   Task detail: full-screen modal│
│                                   Board: 2 columns + scroll     │
│                                   Collapsible filter bar        │
│                                                                 │
│  Mobile            < 768px        Bottom tab bar                │
│                                   Task detail: full-screen      │
│                                   Board: single column scroll   │
│                                   Doc editor: full-screen       │
│                                   AI Copilot: full-screen sheet │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile — Bottom Tab Bar

```
┌──────────────────────────┐
│  Sprintio     🔔3  👤   │
├──────────────────────────┤
│                          │
│  (Content area)          │
│                          │
│                          │
│                          │
├──────────────────────────┤
│  🏠    📋    📄    🤖    │
│  Home  Board  Docs  AI   │
└──────────────────────────┘
```

### Mobile — Board View (Single Column)

```
┌──────────────────────────┐
│  Sprint 14    [Filter]   │
├──────────────────────────┤
│  Status: [In Progress ▾] │
│                          │
│  ┌────────────────────┐  │
│  │ SIO-245            │  │
│  │ Auth refresh token │  │
│  │ 🔴 P1 👤Priya      │  │
│  │ 📅 Jul 12          │  │
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │ SIO-246            │  │
│  │ Payment webhook    │  │
│  │ 🟡 P1 👤Marcus     │  │
│  │ 📅 Jul 14          │  │
│  └────────────────────┘  │
│                          │
│  [Swipe → to move task]  │
│                          │
├──────────────────────────┤
│  🏠    📋    📄    🤖    │
└──────────────────────────┘
```

---

> **Next Document:** [03-INFORMATION-ARCHITECTURE.md](./03-INFORMATION-ARCHITECTURE.md) — Navigation taxonomy, data hierarchy, content structure
