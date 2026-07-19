# Dashboard Specification

> Sprintio Sprint Management Platform — Dashboard Experience Design
> Version: 1.0 | Date: 2026-07-18

---

## Table of Contents

1. [Product Context](#1-product-context)
2. [Information Architecture](#2-information-architecture)
3. [User Flows](#3-user-flows)
4. [Widget Hierarchy](#4-widget-hierarchy)
5. [Desktop Layout](#5-desktop-layout)
6. [Mobile Layout](#6-mobile-layout)
7. [Responsive Behavior](#7-responsive-behavior)
8. [Navigation](#8-navigation)
9. [Empty States](#9-empty-states)
10. [Error States](#10-error-states)
11. [Loading Strategy](#11-loading-strategy)
12. [Accessibility](#12-accessibility)
13. [Data Sources & API Contracts](#13-data-sources--api-contracts)
14. [Design Tokens & Visual System](#14-design-tokens--visual-system)
15. [Interaction Patterns](#15-interaction-patterns)

---

## 1. Product Context

Sprintio is a sprint management platform for software teams. The dashboard is the **primary landing page after login** — the command center where team members get an at-a-glance view of their work across projects, boards, and sprints.

### User Roles

| Role       | Dashboard Focus                                                     |
| ---------- | ------------------------------------------------------------------- |
| **Owner**  | Full workspace health: team velocity, project status, billing usage |
| **Admin**  | Team performance, board activity, sprint progress                   |
| **Member** | Personal task queue, assigned sprint work, upcoming deadlines       |
| **Guest**  | Read-only overview of assigned tasks only                           |

### Core Dashboard Questions (answered in <3 seconds)

1. **What do I need to do right now?** → My tasks due today/this week
2. **How is the current sprint going?** → Sprint progress bar, burndown
3. **What's happening across the workspace?** → Recent activity, board overview
4. **Are there blockers?** → Overdue tasks, stalled items flagged prominently

---

## 2. Information Architecture

```
Dashboard (/dashboard)
├── Greeting & Context Bar
│   ├── Personalized greeting ("Good morning, Alex")
│   ├── Active sprint indicator (name + countdown)
│   └── Quick actions (New task, New board)
│
├── My Work Section
│   ├── Task Summary Cards (4 mini-cards)
│   │   ├── Assigned to me (total count)
│   │   ├── Due today
│   │   ├── Due this week
│   │   └── Overdue
│   ├── My Tasks List (prioritized, max 8)
│   │   └── Each: title, priority badge, due date, project tag
│   └── "View all tasks" link → /tasks
│
├── Sprint Overview Section
│   ├── Active Sprint Card
│   │   ├── Sprint name + goal
│   │   ├── Date range + days remaining
│   │   ├── Progress bar (done vs total)
│   │   └── Status badge (On track / At risk / Behind)
│   ├── Burndown Chart (line chart, 14-day window)
│   │   └── Ideal line vs actual line
│   └── Sprint Health Indicators
│       ├── Tasks completed today
│       ├── Tasks in progress
│       └── Blocked items count
│
├── Workspace Activity Section
│   ├── Activity Feed (last 20 events, scrollable)
│   │   └── Each: avatar, action verb, target, timestamp
│   ├── Board Health Grid
│   │   └── Per board: card count, columns status distribution
│   └── "View all boards" link → /boards
│
├── Team Section (owner/admin only)
│   ├── Member Workload Chart (horizontal bar)
│   │   └── Per member: tasks assigned vs completed
│   ├── Velocity Trend (bar chart, last 5 sprints)
│   └── "Manage team" link → /settings/members
│
└── Plan Usage Section (owner only)
    ├── Storage usage bar
    ├── Members count vs limit
    ├── Boards count vs limit
    └── "Upgrade plan" CTA (if near limits)
```

### Data Dependencies

```
Dashboard
├── /api/workspaces/current → workspace context, plan, member count
├── /api/sprints/active → current sprint details
├── /api/tasks/my → user's assigned tasks (filtered, paginated)
├── /api/tasks/stats → aggregate counts (assigned, due today, overdue)
├── /api/boards → board list with card counts
├── /api/boards/:id/stats → per-board column distribution
├── /api/activity → recent activity feed
├── /api/analytics/velocity → velocity data for chart
└── /api/analytics/burndown → burndown data for chart
```

---

## 3. User Flows

### Flow 1: Morning Stand-up Prep

```
User logs in
  → Dashboard loads with greeting + active sprint context
  → Sees "My Work" section: 3 tasks due today, 1 overdue
  → Clicks overdue task → task detail modal/page opens
  → Updates status to "in_progress"
  → Returns to dashboard → overdue count decrements
```

### Flow 2: Sprint Health Check (Admin/Owner)

```
Admin opens dashboard
  → Scans sprint progress bar (65% complete, 4 days left)
  → Notices "At risk" status badge
  → Checks burndown chart — actual line above ideal (good)
  → Reviews team workload chart — one member overloaded
  → Clicks member bar → filters task list to that member
  → Reassigns 2 tasks via drag or bulk action
```

### Flow 3: New Team Member Onboarding

```
New member logs in first time
  → Dashboard shows empty states for all sections
  → "No tasks assigned yet" with link to boards
  → "No active sprint" with link to project setup
  → Empty activity feed with welcome message
  → Workspace admin gets notification: "New member joined"
```

### Flow 4: Quick Task Creation

```
User clicks "New task" quick action in greeting bar
  → Task creation modal opens (not full page navigation)
  → Pre-fills: assignee = current user, board = most recent
  → User fills title, priority, due date
  → Submits → modal closes → task appears in "My Tasks" list
  → Toast confirmation: "Task created"
```

### Flow 5: Mobile Morning Check

```
User opens on phone
  → Dashboard loads single-column layout
  → Sees greeting + sprint countdown at top
  → Scrolls to "My Work" — 2 cards visible
  → Taps a task → navigates to task detail
  → Taps back → returns to dashboard, scroll position preserved
```

---

## 4. Widget Hierarchy

### Priority Tiers

| Tier   | Widget                      | Width | Min Height | Load Priority |
| ------ | --------------------------- | ----- | ---------- | ------------- |
| **T1** | Greeting & Context Bar      | Full  | 80px       | Immediate     |
| **T1** | Task Summary Cards (4)      | Full  | 100px      | Immediate     |
| **T2** | My Tasks List               | 2/3   | 320px      | Concurrent    |
| **T2** | Active Sprint Card          | 1/3   | 280px      | Concurrent    |
| **T3** | Burndown Chart              | 1/2   | 260px      | Deferred      |
| **T3** | Activity Feed               | 1/2   | 320px      | Deferred      |
| **T4** | Board Health Grid           | Full  | 200px      | Deferred      |
| **T4** | Team Workload (role-gated)  | 1/2   | 280px      | Deferred      |
| **T4** | Velocity Trend (role-gated) | 1/2   | 260px      | Deferred      |
| **T5** | Plan Usage (owner-gated)    | Full  | 120px      | On-demand     |

### Widget Sizing Rules

- **Desktop (>1280px):** 12-column grid, 24px gutters, max-width 1280px centered
- **Tablet (768–1280px):** 8-column grid, 16px gutters, full-width with 16px padding
- **Mobile (<768px):** Single column, 16px horizontal padding, stacked widgets

### Card Dimensions

| Card Type         | Desktop         | Tablet     | Mobile          |
| ----------------- | --------------- | ---------- | --------------- |
| Summary mini-card | 200×100px       | 180×90px   | Full width×80px |
| Sprint card       | 380×280px       | Full×260px | Full×240px      |
| Task list item    | Full width×56px | Full×52px  | Full×56px       |
| Activity item     | Full width×48px | Full×48px  | Full×52px       |
| Board health card | 280×200px       | 180×180px  | Full×160px      |

---

## 5. Desktop Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar (240px)  │          Main Content Area                   │
│                   │                                              │
│  ┌─────────────┐  │  ┌──────────────────────────────────────┐   │
│  │ Sprintio    │  │  │  Good morning, Alex        [Sprint 3] │   │
│  │             │  │  │  Active sprint ends in 4 days  [+ New]│   │
│  │ • Dashboard │  │  └──────────────────────────────────────┘   │
│  │ • Boards    │  │                                              │
│  │ • Projects  │  │  ┌─────────┬─────────┬─────────┬─────────┐  │
│  │ • My Tasks  │  │  │ Assigned│  Today  │ This Wk │ Overdue │  │
│  │ • Documents │  │  │    12   │    3    │    7    │    1    │  │
│  │             │  │  └─────────┴─────────┴─────────┴─────────┘  │
│  │             │  │                                              │
│  │             │  │  ┌────────────────────┬──────────────────┐  │
│  │             │  │  │   My Tasks (2/3)   │  Sprint Overview  │  │
│  │             │  │  │                    │                    │  │
│  │             │  │  │  ○ Fix auth bug    │  Sprint 3         │  │
│  │             │  │  │    urgent · today  │  ████████░░ 65%   │  │
│  │             │  │  │                    │  4 days left      │  │
│  │             │  │  │  ○ Add dark mode   │  On track         │  │
│  │             │  │  │    high · Fri      │                    │  │
│  │             │  │  │                    │  [Burndown Chart]  │  │
│  │             │  │  │  ○ Write tests     │                    │  │
│  │             │  │  │    medium · Mon    │                    │  │
│  │             │  │  │                    │                    │  │
│  │             │  │  │  View all tasks →  │                    │  │
│  │             │  │  └────────────────────┴──────────────────┘  │
│  │             │  │                                              │
│  │             │  │  ┌────────────────────┬──────────────────┐  │
│  │             │  │  │  Activity Feed      │  Board Health     │  │
│  │             │  │  │                    │                    │  │
│  │ ┌─────────┐│  │  │  🟢 Alex completed  │  ┌─────┐ ┌─────┐ │  │
│  │ │ Avatar  ││  │  │     "Fix auth bug"  │  │ Board│ │Board│ │  │
│  │ │ Name    ││  │  │     2 min ago       │  │  12  │ │  8  │ │  │
│  │ │ Email   ││  │  │                     │  └─────┘ └─────┘ │  │
│  │ │ Signout ││  │  │  🔵 Sam started     │  ┌─────┐ ┌─────┐ │  │
│  └─────────┘│  │  │     "API refactor"   │  │Board│ │Board│ │  │
│             │  │  │     15 min ago       │  │  5  │ │  3  │ │  │
│             │  │  └────────────────────┴──────────────────┘  │
│             │  │                                              │
│             │  │  ┌──────────────────────────────────────┐   │
│             │  │  │  Team Workload ···  (admin/owner)     │   │
│             │  │  │  Alex  ████████░░ 8 tasks             │   │
│             │  │  │  Sam   ██████░░░░ 6 tasks             │   │
│             │  │  │  Jordan ████░░░░░░ 4 tasks            │   │
│             │  │  └──────────────────────────────────────┘   │
│             │  │                                              │
│             │  │  ┌──────────────────────────────────────┐   │
│             │  │  │  Plan Usage ··· (owner only)          │   │
│             │  │  │  Members: 3/5 · Boards: 2/3 · 12%    │   │
│             │  │  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Desktop Grid Specification

- **Grid system:** 12-column CSS Grid
- **Column width:** Flexible (min 60px, max 120px)
- **Gutter:** 24px
- **Page padding:** 32px (left/right of main content)
- **Max content width:** 1280px (centered)
- **Sidebar:** Fixed 240px, does not scroll with content
- **Main content:** Scrollable, full height of viewport minus top bar (if any)

---

## 6. Mobile Layout

```
┌──────────────────────┐
│ ☰  Sprintio     🔔  │  ← Top bar (fixed)
├──────────────────────┤
│                      │
│  Good morning, Alex  │
│  Sprint 3 · 4d left  │
│                      │
│ ┌──────┬──────┐      │
│ │  12  │  3   │      │  ← 2-column mini-cards
│ │To-do │ Today│      │
│ ├──────┼──────┤      │
│ │  7   │  1   │      │
│ │ Week │ Over │      │
│ └──────┴──────┘      │
│                      │
│ ┌──────────────────┐ │
│ │ My Tasks (3)     │ │  ← Stacked cards, full width
│ │                  │ │
│ │ ○ Fix auth bug   │ │
│ │   urgent · today │ │
│ │                  │ │
│ │ ○ Add dark mode  │ │
│ │   high · Fri     │ │
│ │                  │ │
│ │ View all →       │ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │ Sprint 3         │ │  ← Sprint card, full width
│ │ ████████░░ 65%   │ │
│ │ 4 days left      │ │
│ │ On track         │ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │ Burndown Chart   │ │  ← Chart, full width
│ │ [line chart]     │ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │ Recent Activity  │ │  ← Activity feed
│ │ ...              │ │
│ └──────────────────┘ │
│                      │
├──────────────────────┤
│ 📋  📊  📁  👤  ⚙️  │  ← Bottom nav (5 items)
└──────────────────────┘
```

### Mobile Top Bar

- **Height:** 56px
- **Background:** `bg-background` with `border-b`
- **Left:** Hamburger menu (opens sidebar as overlay drawer)
- **Center:** "Sprintio" brand text
- **Right:** Notification bell with unread badge

### Mobile Bottom Navigation

- **Height:** 64px (48px icons + 16px safe area)
- **Items (5 max):**
  1. 📋 My Tasks (link to /tasks)
  2. 📊 Dashboard (current)
  3. 📁 Boards (link to /boards)
  4. 👤 Profile (link to /settings)
  5. ⚙️ More (opens action sheet)
- **Active state:** Filled icon + primary color + label
- **Inactive state:** Outline icon + muted-foreground + label
- **Touch target:** Minimum 44×44pt

### Mobile Sidebar (Drawer)

- **Trigger:** Hamburger menu icon in top bar
- **Behavior:** Slides in from left, overlays content
- **Backdrop:** `bg-black/50` with click-to-close
- **Width:** 280px max (85% viewport)
- **Content:** Same nav items as desktop sidebar
- **Close:** Swipe left, tap backdrop, or tap close icon
- **Scroll:** Independent scroll within drawer

---

## 7. Responsive Behavior

### Breakpoints

| Name        | Range       | Layout                                        |
| ----------- | ----------- | --------------------------------------------- |
| **Mobile**  | <768px      | Single column, bottom nav, drawer sidebar     |
| **Tablet**  | 768–1024px  | 2-column grid, collapsed sidebar (icons only) |
| **Desktop** | 1024–1280px | Full sidebar, 12-column grid                  |
| **Wide**    | >1280px     | Max-width container centered, same as desktop |

### Breakpoint Transitions

```
Mobile → Tablet (768px)
  - Summary cards: 2×2 grid → 4×1 row
  - My Tasks + Sprint: stack → side-by-side (6/6)
  - Sidebar: hidden → collapsed (icons only, 64px)
  - Bottom nav: visible → hidden
  - Top bar: always visible

Tablet → Desktop (1024px)
  - Sidebar: collapsed → expanded (240px)
  - My Tasks + Sprint: 6/6 → 8/4 split
  - Activity + Board Health: stack → side-by-side (6/6)
  - Content padding: 16px → 32px
```

### Widget Reordering (Mobile)

Widgets stack vertically in priority order:

1. Greeting & Context Bar (always first)
2. Task Summary Cards (2×2 grid)
3. My Tasks List
4. Active Sprint Card
5. Burndown Chart
6. Activity Feed
7. Board Health Grid
8. Team Workload (role-gated)
9. Velocity Trend (role-gated)
10. Plan Usage (owner-gated)

### Chart Responsive Behavior

| Chart    | Desktop                         | Tablet                    | Mobile                               |
| -------- | ------------------------------- | ------------------------- | ------------------------------------ |
| Burndown | Full line chart, 14 data points | Simplified, 7 data points | Horizontal sparkline, no axes labels |
| Velocity | Vertical bar, 5 sprints         | Vertical bar, 3 sprints   | Horizontal bar, 3 sprints            |
| Workload | Horizontal bar, all members     | Horizontal bar, top 5     | Horizontal bar, top 3                |

---

## 8. Navigation

### Desktop Sidebar Navigation

```
Sprintio (brand)          → /
────────────────────────
📊 Dashboard              → /dashboard (current)
🗂️ Boards                 → /boards
📁 Projects               → /projects
✅ My Tasks               → /tasks
📄 Documents              → /documents
────────────────────────
👤 User section
   Avatar · Name · Email
   [Sign out]
```

### Sidebar States

| State         | Width     | Content                            | Trigger             |
| ------------- | --------- | ---------------------------------- | ------------------- |
| **Expanded**  | 240px     | Icons + labels + brand text        | Desktop (≥1024px)   |
| **Collapsed** | 64px      | Icons only, labels hidden on hover | Tablet (768–1024px) |
| **Drawer**    | 280px max | Full content, overlay              | Mobile toggle       |
| **Hidden**    | 0px       | —                                  | Mobile default      |

### Active State Styling

- **Background:** `bg-accent` (HSL: 210 40% 96.1%)
- **Text:** `text-accent-foreground`
- **Left border:** 2px solid `primary` (HSL: 238.7 83.5% 66.7%)
- **Font weight:** `font-medium` (500)
- **Transition:** `transition-colors duration-150`

### Breadcrumbs (Sub-pages)

When navigating deeper from dashboard:

```
Dashboard > Boards > Sprint Board > Task: "Fix auth bug"
```

- Breadcrumbs appear below the top bar
- Each segment is a clickable link
- Current page is not a link (last segment)

---

## 9. Empty States

### 9.1 No Workspace

```
┌──────────────────────────────────────────┐
│                                          │
│         [Workspace icon]                 │
│                                          │
│      No workspace yet                    │
│                                          │
│   Create your first workspace to         │
│   start managing sprints.               │
│                                          │
│   [Create Workspace]                     │
│                                          │
│   Or ask your team lead to invite you.   │
│                                          │
└──────────────────────────────────────────┘
```

- **Icon:** Building/office icon (Lucide: `Building2`)
- **Primary action:** "Create Workspace" button (if user has `workspace:create` permission)
- **Secondary text:** "Or ask your team lead to invite you" (for members/guests)

### 9.2 No Active Sprint

```
┌──────────────────────────────────────────┐
│                                          │
│         [Calendar icon]                  │
│                                          │
│      No active sprint                    │
│                                          │
│   Your workspace doesn't have an         │
│   active sprint right now.              │
│                                          │
│   [Create Sprint] · [View all sprints]   │
│                                          │
└──────────────────────────────────────────┘
```

- **Icon:** Calendar off icon (Lucide: `CalendarOff`)
- **Primary action:** "Create Sprint" (admin/owner only)
- **Secondary action:** "View all sprints" link
- **For members:** Shows "Waiting for admin to start a sprint"

### 9.3 No Tasks Assigned

```
┌──────────────────────────────────────────┐
│                                          │
│         [CheckCircle icon]               │
│                                          │
│      You're all caught up!               │
│                                          │
│   No tasks are currently assigned        │
│   to you. Check the boards to            │
│   pick up new work.                      │
│                                          │
│   [Browse Boards]                        │
│                                          │
└──────────────────────────────────────────┘
```

- **Icon:** Check circle (Lucide: `CheckCircle2`)
- **Tone:** Positive — "caught up" not "empty"
- **Action:** "Browse Boards" link to `/boards`

### 9.4 No Activity

```
┌──────────────────────────────────────────┐
│                                          │
│         [Activity icon]                  │
│                                          │
│      No recent activity                  │
│                                          │
│   Activity will appear here as your      │
│   team creates and updates tasks.        │
│                                          │
└──────────────────────────────────────────┘
```

- **Icon:** Activity icon (Lucide: `Activity`)
- **No action** — purely informational
- **Text is muted** to de-emphasize

### 9.5 New User (First Login)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   Welcome to Sprintio, Alex! 🎉                             │
│                                                              │
│   Here's how to get started:                                │
│                                                              │
│   1. Create or join a workspace                             │
│   2. Set up your first board                                │
│   3. Add tasks and start a sprint                           │
│                                                              │
│   [Create Workspace]  [Take a tour]                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- **Full-width hero card** at top of dashboard
- **Dismissable:** "X" button, once dismissed never shows again (stored in localStorage)
- **Progress indicator:** Checkmarks for completed steps

---

## 10. Error States

### 10.1 Network Error (API fetch fails)

```
┌──────────────────────────────────────────┐
│                                          │
│         [WifiOff icon]                   │
│                                          │
│      Unable to load dashboard            │
│                                          │
│   We couldn't fetch your data.           │
│   Check your connection and try again.   │
│                                          │
│   [Retry]                                │
│                                          │
│   Last updated: 2 min ago (cached)       │
│                                          │
└──────────────────────────────────────────┘
```

- **Icon:** Wifi off (Lucide: `WifiOff`)
- **Primary action:** "Retry" button
- **Secondary info:** Shows last cached timestamp if available
- **Retry behavior:** Exponential backoff (1s, 2s, 4s, max 3 retries)

### 10.2 Partial Load Failure

When some widgets fail but others succeed:

```
┌──────────────────────────────────────────┐
│  [Widgets that loaded OK render normally] │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │  ⚠️ Couldn't load sprint data    │    │
│  │                                  │    │
│  │  [Retry]                         │    │
│  └──────────────────────────────────┘    │
│                                          │
│  [Other widgets render normally]         │
└──────────────────────────────────────────┘
```

- **Failed widget shows inline error** with retry
- **Other widgets unaffected** — independent loading
- **No full-page error** — graceful degradation

### 10.3 Authentication Expired

```
┌──────────────────────────────────────────┐
│                                          │
│         [Lock icon]                      │
│                                          │
│      Session expired                     │
│                                          │
│   Your session has expired.              │
│   Please sign in again.                  │
│                                          │
│   [Sign In]                              │
│                                          │
└──────────────────────────────────────────┘
```

- **Auto-redirect** to `/login` after 5 seconds
- **Query param:** `?reason=session_expired`

### 10.4 Permission Denied

```
┌──────────────────────────────────────────┐
│                                          │
│         [ShieldAlert icon]               │
│                                          │
│      Access restricted                   │
│                                          │
│   You don't have permission to           │
│   view this section.                     │
│                                          │
│   Contact your workspace admin           │
│   to request access.                     │
│                                          │
└──────────────────────────────────────────┘
```

- **Icon:** Shield alert (Lucide: `ShieldAlert`)
- **No action** for the user — contact admin
- **Tone:** Informative, not punitive

---

## 11. Loading Strategy

### Skeleton Loading Pattern

All widgets use **skeleton placeholders** (shimmer effect) during load. No spinners in the main content area.

```
┌──────────────────────────────────────────┐
│                                          │
│  Good morning, ████                     │  ← Skeleton text
│  ████ · █ days left                     │
│                                          │
│  ┌────────┬────────┬────────┬────────┐  │
│  │ ░░░░░░ │ ░░░░░░ │ ░░░░░░ │ ░░░░░░ │  │  ← Skeleton cards
│  └────────┴────────┴────────┴────────┘  │
│                                          │
│  ┌───────────────────┬────────────────┐  │
│  │ ░░░░░░░░░░░░░░░░░ │ ░░░░░░░░░░░░░ │  │  ← Skeleton widgets
│  │ ░░░░░░░░░░░░░░░░░ │ ░░░░░░░░░░░░░ │  │
│  │ ░░░░░░░░░░░░░░░░░ │ ░░░░░░░░░░░░░ │  │
│  └───────────────────┴────────────────┘  │
└──────────────────────────────────────────┘
```

### Loading Phases

| Phase       | Widgets                     | Timing     | Strategy             |
| ----------- | --------------------------- | ---------- | -------------------- |
| **Phase 1** | Greeting bar, summary cards | 0–200ms    | Skeleton → real data |
| **Phase 2** | My Tasks, Sprint card       | 200–500ms  | Skeleton → real data |
| **Phase 3** | Charts, Activity feed       | 500–1000ms | Skeleton → real data |
| **Phase 4** | Team workload, Plan usage   | 1000ms+    | Skeleton → real data |

### Staggered Reveal

Widgets enter with a staggered fade-in animation:

- **Delay:** 50ms between each widget
- **Duration:** 200ms
- **Easing:** ease-out
- **Transform:** `translateY(8px)` → `translateY(0)` + `opacity 0→1`
- **Respects:** `prefers-reduced-motion` — instant display if reduced

### Data Freshness

| Data Type     | Stale Time | Refetch            | Cache       |
| ------------- | ---------- | ------------------ | ----------- |
| User profile  | 5 min      | On mount           | React Query |
| Task counts   | 30s        | Auto-refetch       | React Query |
| Task list     | 1 min      | On mount + refetch | React Query |
| Sprint data   | 2 min      | On mount           | React Query |
| Activity feed | 30s        | On mount + refetch | React Query |
| Charts        | 5 min      | On mount           | React Query |

### Optimistic Updates

- **Task status change:** Update UI immediately, sync in background
- **Task completion:** Move to "done" instantly, show undo toast (3s)
- **New task creation:** Add to list optimistically, remove on failure

---

## 12. Accessibility

### Keyboard Navigation

| Element         | Behavior                                                                           |
| --------------- | ---------------------------------------------------------------------------------- |
| **Tab order**   | Sidebar nav → Greeting bar → Summary cards → My Tasks → Sprint → Charts → Activity |
| **Enter/Space** | Activates links, buttons, task items                                               |
| **Arrow keys**  | Navigates within task list, summary cards                                          |
| **Escape**      | Closes modals, drawers, tooltips                                                   |
| **Home/End**    | Jump to first/last item in lists                                                   |

### Focus Management

- **Focus ring:** 2px solid `ring` (HSL: 238.7 83.5% 66.7%) with 2px offset
- **Focus-visible only:** No focus ring on mouse click (Tailwind `focus-visible:`)
- **Skip link:** "Skip to main content" — first element in DOM, visible on focus
- **Focus restoration:** After modal close, focus returns to trigger element

### Screen Reader Support

| Widget          | ARIA                                                                                 |
| --------------- | ------------------------------------------------------------------------------------ |
| Summary cards   | `role="region"` + `aria-label="Task summary"`                                        |
| Task list       | `role="list"` + each item `role="listitem"`                                          |
| Sprint progress | `role="progressbar"` + `aria-valuenow` + `aria-valuemin="0"` + `aria-valuemax="100"` |
| Charts          | `role="img"` + `aria-label` with text summary of data                                |
| Activity feed   | `role="log"` + `aria-label="Recent activity"`                                        |
| Navigation      | `role="navigation"` + `aria-label="Main navigation"`                                 |
| Notifications   | `aria-live="polite"` for count updates                                               |

### Color & Contrast

| Element        | Foreground                             | Background                    | Ratio  | WCAG           |
| -------------- | -------------------------------------- | ----------------------------- | ------ | -------------- |
| Body text      | `foreground` (222.2 84% 4.9%)          | `background` (0 0% 100%)      | 17.4:1 | AAA            |
| Muted text     | `muted-foreground` (215.4 16.3% 46.9%) | `background`                  | 5.2:1  | AA             |
| Primary button | `primary-foreground` (210 40% 98%)     | `primary` (238.7 83.5% 66.7%) | 7.1:1  | AAA            |
| Border         | `border` (214.3 31.8% 91.4%)           | `background`                  | 1.3:1  | — (decorative) |

### Task Priority Color Encoding

Priority is **never conveyed by color alone** — always paired with a text label and icon:

| Priority | Color                     | Icon         | Text Label |
| -------- | ------------------------- | ------------ | ---------- |
| Urgent   | Red (`destructive`)       | ⚠ Triangle   | "Urgent"   |
| High     | Orange (`#f97316`)        | ↑ Arrow up   | "High"     |
| Medium   | Yellow (`#eab308`)        | — Dash       | "Medium"   |
| Low      | Blue (`primary`)          | ↓ Arrow down | "Low"      |
| None     | Gray (`muted-foreground`) | ○ Circle     | "None"     |

### Reduced Motion

When `prefers-reduced-motion: reduce` is active:

- All skeleton shimmer animations: **disabled** (solid gray placeholder)
- Staggered widget reveal: **instant** (no transition)
- Chart entrance animations: **disabled** (immediate render)
- Hover effects: **reduced** (opacity change only, no transform)
- Sprint progress bar: **instant fill** (no animation)

### Dynamic Type / Text Scaling

- All text uses `rem` units (base 16px)
- Layout uses CSS Grid (not fixed pixel widths)
- Test at 200% browser zoom — no content truncation or overlap
- Long task titles wrap to 2 lines max, then truncate with ellipsis + tooltip

---

## 13. Data Sources & API Contracts

### 13.1 Dashboard Summary Endpoint

```
GET /api/dashboard/summary
```

**Response:**

```json
{
  "data": {
    "user": {
      "name": "Alex",
      "greeting": "Good morning"
    },
    "activeSprint": {
      "id": "uuid",
      "name": "Sprint 3",
      "goal": "Ship auth system",
      "startDate": "2026-07-14T00:00:00Z",
      "endDate": "2026-07-25T23:59:59Z",
      "daysRemaining": 4,
      "progress": {
        "total": 20,
        "done": 13,
        "percentage": 65
      },
      "status": "on_track"
    },
    "taskCounts": {
      "assigned": 12,
      "dueToday": 3,
      "dueThisWeek": 7,
      "overdue": 1
    }
  }
}
```

### 13.2 My Tasks Endpoint

```
GET /api/tasks/my?limit=8&sort=priority
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Fix auth bug",
      "status": "in_progress",
      "priority": "urgent",
      "dueDate": "2026-07-18T23:59:59Z",
      "board": { "id": "uuid", "name": "Sprint Board" },
      "project": { "id": "uuid", "name": "Auth System" },
      "assignee": { "id": "uuid", "name": "Alex" }
    }
  ],
  "meta": { "total": 12, "page": 1, "pageSize": 8, "totalPages": 2 }
}
```

### 13.3 Activity Feed Endpoint

```
GET /api/activity?limit=20
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "actor": { "id": "uuid", "name": "Alex", "avatar": null },
      "action": "completed",
      "target": { "type": "task", "id": "uuid", "title": "Fix auth bug" },
      "timestamp": "2026-07-18T14:30:00Z"
    }
  ]
}
```

### 13.4 Burndown Endpoint

```
GET /api/analytics/burndown?sprintId=uuid
```

**Response:**

```json
{
  "data": {
    "sprintId": "uuid",
    "startDate": "2026-07-14",
    "endDate": "2026-07-25",
    "ideal": [
      { "date": "2026-07-14", "remaining": 20 },
      { "date": "2026-07-15", "remaining": 18.2 },
      { "date": "2026-07-25", "remaining": 0 }
    ],
    "actual": [
      { "date": "2026-07-14", "remaining": 20 },
      { "date": "2026-07-15", "remaining": 18 },
      { "date": "2026-07-16", "remaining": 15 },
      { "date": "2026-07-17", "remaining": 9 }
    ]
  }
}
```

### 13.5 Velocity Endpoint

```
GET /api/analytics/velocity?limit=5
```

**Response:**

```json
{
  "data": [
    { "sprintName": "Sprint 2", "committed": 18, "completed": 16, "velocity": 16 },
    { "sprintName": "Sprint 1", "committed": 15, "completed": 14, "velocity": 14 }
  ]
}
```

### 13.6 Team Workload Endpoint

```
GET /api/analytics/workload
```

**Response:**

```json
{
  "data": [
    {
      "userId": "uuid",
      "name": "Alex",
      "avatar": null,
      "assigned": 8,
      "completed": 5,
      "inProgress": 3
    },
    {
      "userId": "uuid",
      "name": "Sam",
      "avatar": null,
      "assigned": 6,
      "completed": 4,
      "inProgress": 2
    }
  ]
}
```

### 13.7 Board Stats Endpoint

```
GET /api/boards/stats
```

**Response:**

```json
{
  "data": [
    {
      "boardId": "uuid",
      "name": "Sprint Board",
      "totalCards": 12,
      "columns": [
        { "name": "To Do", "count": 3, "color": "#6b7280" },
        { "name": "In Progress", "count": 5, "color": "#3b82f6" },
        { "name": "Review", "count": 2, "color": "#f59e0b" },
        { "name": "Done", "count": 2, "color": "#22c55e" }
      ]
    }
  ]
}
```

---

## 14. Design Tokens & Visual System

### Color Tokens (from existing globals.css)

| Token                | Light Value         | Usage              |
| -------------------- | ------------------- | ------------------ |
| `--background`       | `0 0% 100%`         | Page background    |
| `--foreground`       | `222.2 84% 4.9%`    | Primary text       |
| `--primary`          | `238.7 83.5% 66.7%` | Brand blue, CTAs   |
| `--secondary`        | `210 40% 96.1%`     | Card backgrounds   |
| `--muted`            | `210 40% 96.1%`     | Subtle backgrounds |
| `--muted-foreground` | `215.4 16.3% 46.9%` | Secondary text     |
| `--accent`           | `210 40% 96.1%`     | Hover states       |
| `--destructive`      | `0 84.2% 60.2%`     | Errors, overdue    |
| `--border`           | `214.3 31.8% 91.4%` | Borders, dividers  |

### Additional Dashboard Tokens

```css
:root {
  /* Sprint status colors */
  --sprint-on-track: 142 76% 36%; /* Green */
  --sprint-at-risk: 38 92% 50%; /* Amber */
  --sprint-behind: 0 84% 60%; /* Red */

  /* Priority colors */
  --priority-urgent: 0 84% 60%; /* Red */
  --priority-high: 25 95% 53%; /* Orange */
  --priority-medium: 48 96% 53%; /* Yellow */
  --priority-low: 238.7 83.5% 66.7%; /* Primary blue */
  --priority-none: 215.4 16.3% 46.9%; /* Muted */

  /* Chart colors */
  --chart-1: 238.7 83.5% 66.7%; /* Primary blue */
  --chart-2: 142 76% 36%; /* Green */
  --chart-3: 38 92% 50%; /* Amber */
  --chart-4: 0 84% 60%; /* Red */
  --chart-5: 280 65% 60%; /* Purple */

  /* Spacing scale (8px base) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

### Typography Scale

| Token       | Size | Weight | Line Height | Usage                |
| ----------- | ---- | ------ | ----------- | -------------------- |
| `text-xs`   | 12px | 400    | 16px        | Metadata, timestamps |
| `text-sm`   | 14px | 400    | 20px        | Body text, labels    |
| `text-base` | 16px | 400    | 24px        | Primary body         |
| `text-lg`   | 18px | 500    | 28px        | Card titles          |
| `text-xl`   | 20px | 600    | 28px        | Section headers      |
| `text-2xl`  | 24px | 700    | 32px        | Page title           |
| `text-3xl`  | 30px | 700    | 36px        | Greeting             |

### Shadow Scale

| Level       | Value                          | Usage               |
| ----------- | ------------------------------ | ------------------- |
| `shadow-sm` | `0 1px 2px rgb(0 0 0 / 0.05)`  | Cards, panels       |
| `shadow-md` | `0 4px 6px rgb(0 0 0 / 0.07)`  | Dropdowns, popovers |
| `shadow-lg` | `0 10px 15px rgb(0 0 0 / 0.1)` | Modals, drawers     |

### Border Radius

| Token          | Value  | Usage           |
| -------------- | ------ | --------------- |
| `rounded`      | 6px    | Buttons, inputs |
| `rounded-lg`   | 8px    | Cards           |
| `rounded-xl`   | 12px   | Modals          |
| `rounded-full` | 9999px | Avatars, badges |

---

## 15. Interaction Patterns

### 15.1 Task Item Interactions

| Action              | Trigger              | Feedback                               |
| ------------------- | -------------------- | -------------------------------------- |
| **View task**       | Click/tap task row   | Navigate to task detail                |
| **Quick complete**  | Checkmark icon hover | Strike-through animation, move to done |
| **Change priority** | Priority badge click | Dropdown with priority options         |
| **Reassign**        | Avatar click         | Member picker popover                  |

### 15.2 Sprint Card Interactions

| Action            | Trigger                   | Feedback                     |
| ----------------- | ------------------------- | ---------------------------- |
| **View sprint**   | Click sprint name         | Navigate to sprint detail    |
| **Edit goal**     | Pencil icon (admin/owner) | Inline edit with save/cancel |
| **View burndown** | Click chart area          | Expand chart in modal        |

### 15.3 Activity Feed Interactions

| Action        | Trigger            | Feedback                         |
| ------------- | ------------------ | -------------------------------- |
| **View item** | Click activity row | Navigate to target entity        |
| **Load more** | Scroll to bottom   | Infinite scroll with sentinel    |
| **Filter**    | Filter icon        | Dropdown: All, My activity, Team |

### 15.4 Summary Card Interactions

| Card          | Click Behavior                          |
| ------------- | --------------------------------------- |
| **Assigned**  | Navigate to `/tasks?filter=assigned`    |
| **Today**     | Navigate to `/tasks?filter=dueToday`    |
| **This week** | Navigate to `/tasks?filter=dueThisWeek` |
| **Overdue**   | Navigate to `/tasks?filter=overdue`     |

### 15.5 Chart Interactions

| Chart        | Desktop                             | Mobile                     |
| ------------ | ----------------------------------- | -------------------------- |
| **Burndown** | Hover tooltip with exact values     | Tap data point for tooltip |
| **Burndown** | Legend click to toggle ideal/actual | Always show both lines     |
| **Velocity** | Hover for sprint details            | Tap bar for details        |
| **Workload** | Click bar to filter tasks           | Tap bar to filter tasks    |

### 15.6 Toast Notifications

| Event          | Toast                             | Duration | Position     |
| -------------- | --------------------------------- | -------- | ------------ |
| Task completed | "Task marked as done" + undo      | 5s       | Bottom-right |
| Task created   | "Task created" + view             | 3s       | Bottom-right |
| Sprint started | "Sprint started"                  | 3s       | Bottom-right |
| Error loading  | "Failed to load [widget]" + retry | 5s       | Bottom-right |

### 15.7 Keyboard Shortcuts

| Shortcut     | Action                          |
| ------------ | ------------------------------- |
| `g` then `d` | Go to Dashboard                 |
| `g` then `b` | Go to Boards                    |
| `g` then `t` | Go to My Tasks                  |
| `n`          | New task (opens modal)          |
| `/`          | Focus search (when implemented) |
| `?`          | Show keyboard shortcuts panel   |

---

## Appendix A: Component Inventory (New)

### New Components Required

| Component           | Path                                          | Dependencies          | Priority |
| ------------------- | --------------------------------------------- | --------------------- | -------- |
| `GreetingBar`       | `components/dashboard/greeting-bar.tsx`       | Card, Button          | P0       |
| `TaskSummaryCards`  | `components/dashboard/task-summary-cards.tsx` | Card                  | P0       |
| `MyTaskList`        | `components/dashboard/my-task-list.tsx`       | Card, Badge, Button   | P0       |
| `SprintOverview`    | `components/dashboard/sprint-overview.tsx`    | Card, Badge, Progress | P0       |
| `BurndownChart`     | `components/dashboard/burndown-chart.tsx`     | Chart library         | P1       |
| `ActivityFeed`      | `components/dashboard/activity-feed.tsx`      | Card, Avatar, Badge   | P1       |
| `BoardHealthGrid`   | `components/dashboard/board-health-grid.tsx`  | Card                  | P1       |
| `TeamWorkload`      | `components/dashboard/team-workload.tsx`      | Card, Chart library   | P2       |
| `VelocityTrend`     | `components/dashboard/velocity-trend.tsx`     | Card, Chart library   | P2       |
| `PlanUsage`         | `components/dashboard/plan-usage.tsx`         | Card, Progress        | P2       |
| `DashboardSkeleton` | `components/dashboard/skeleton.tsx`           | —                     | P0       |
| `EmptyState`        | `components/ui/empty-state.tsx`               | Lucide icons          | P0       |
| `ErrorState`        | `components/ui/error-state.tsx`               | Button, Lucide icons  | P0       |
| `Badge`             | `components/ui/badge.tsx`                     | cn utility            | P0       |
| `Avatar`            | `components/ui/avatar.tsx`                    | —                     | P0       |
| `Progress`          | `components/ui/progress.tsx`                  | cn utility            | P0       |
| `Skeleton`          | `components/ui/skeleton.tsx`                  | —                     | P0       |

### New Hooks Required

| Hook                  | Path                             | Purpose                               |
| --------------------- | -------------------------------- | ------------------------------------- |
| `useDashboardSummary` | `hooks/use-dashboard-summary.ts` | Fetch greeting, sprint, task counts   |
| `useMyTasks`          | `hooks/use-my-tasks.ts`          | Fetch user's assigned tasks           |
| `useBurndown`         | `hooks/use-burndown.ts`          | Fetch burndown chart data             |
| `useActivityFeed`     | `hooks/use-activity-feed.ts`     | Fetch activity feed (infinite scroll) |
| `useBoardStats`       | `hooks/use-board-stats.ts`       | Fetch board health data               |
| `useVelocity`         | `hooks/use-velocity.ts`          | Fetch velocity trend data             |
| `useWorkload`         | `hooks/use-workload.ts`          | Fetch team workload data              |

### New API Functions Required

| Function                | Path         | Endpoint                      |
| ----------------------- | ------------ | ----------------------------- |
| `fetchDashboardSummary` | `lib/api.ts` | `GET /api/dashboard/summary`  |
| `fetchMyTasks`          | `lib/api.ts` | `GET /api/tasks/my`           |
| `fetchBurndown`         | `lib/api.ts` | `GET /api/analytics/burndown` |
| `fetchActivity`         | `lib/api.ts` | `GET /api/activity`           |
| `fetchBoardStats`       | `lib/api.ts` | `GET /api/boards/stats`       |
| `fetchVelocity`         | `lib/api.ts` | `GET /api/analytics/velocity` |
| `fetchWorkload`         | `lib/api.ts` | `GET /api/analytics/workload` |

---

## Appendix B: Chart Library Decision

### Recommended: Recharts

**Why Recharts over alternatives:**

| Criterion      | Recharts | Chart.js     | Victory | Nivo   |
| -------------- | -------- | ------------ | ------- | ------ |
| React-first    | ✅       | ❌ (wrapper) | ✅      | ✅     |
| Bundle size    | ~45KB    | ~60KB        | ~80KB   | ~120KB |
| SVG rendering  | ✅       | ❌ (Canvas)  | ✅      | ✅     |
| Accessibility  | Good     | Fair         | Good    | Good   |
| Customization  | High     | Medium       | High    | High   |
| Learning curve | Low      | Medium       | Medium  | High   |
| SSR support    | ✅       | ❌           | ✅      | ✅     |

**Install:** `pnpm add recharts`

**Charts to implement:**

1. **Burndown** — `LineChart` with two `Line` components (ideal + actual)
2. **Velocity** — `BarChart` with one `Bar` component
3. **Workload** — `BarChart` (horizontal) with stacked `Bar` components
4. **Board Health** — Simple colored `Bar` segments (CSS, no chart library needed)

---

## Appendix C: Implementation Phases

### Phase 1: Foundation (Week 1)

- [ ] Create skeleton components (Skeleton, Badge, Avatar, Progress)
- [ ] Create EmptyState and ErrorState components
- [ ] Create dashboard API hooks and functions
- [ ] Build GreetingBar widget
- [ ] Build TaskSummaryCards widget
- [ ] Build MyTaskList widget
- [ ] Build SprintOverview widget
- [ ] Integrate into existing `_authenticated.dashboard.tsx`

### Phase 2: Charts & Activity (Week 2)

- [ ] Install Recharts
- [ ] Build BurndownChart widget
- [ ] Build ActivityFeed widget with infinite scroll
- [ ] Build BoardHealthGrid widget
- [ ] Implement staggered loading animation

### Phase 3: Role-Gated Sections (Week 3)

- [ ] Build TeamWorkload widget (admin/owner)
- [ ] Build VelocityTrend widget (admin/owner)
- [ ] Build PlanUsage widget (owner)
- [ ] Implement role-based widget visibility
- [ ] Implement keyboard shortcuts

### Phase 4: Mobile & Polish (Week 4)

- [ ] Mobile bottom navigation bar
- [ ] Mobile drawer sidebar
- [ ] Responsive breakpoint testing
- [ ] Reduced motion support
- [ ] Screen reader testing
- [ ] Performance audit (CLS, LCP)

---

_This specification is a living document. Update as implementation progresses._
