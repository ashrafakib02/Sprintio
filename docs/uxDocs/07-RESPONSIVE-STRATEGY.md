# Sprintio — Responsive Strategy

> **Sprint fast. Ship together.**
> Document: 07 — Responsive Strategy
> Version: 1.0 | Date: 2026-07-08
> Scope: MVP — Breakpoint system, layout adaptation, touch targets, mobile-first patterns

---

## Table of Contents

1. [Responsive Principles](#1-responsive-principles)
2. [Breakpoint System](#2-breakpoint-system)
3. [Layout Strategy](#3-layout-strategy)
4. [Navigation Adaptation](#4-navigation-adaptation)
5. [Board View Responsive Behavior](#5-board-view-responsive-behavior)
6. [List View Responsive Behavior](#6-list-view-responsive-behavior)
7. [Task Detail Responsive Behavior](#7-task-detail-responsive-behavior)
8. [Document Editor Responsive Behavior](#8-document-editor-responsive-behavior)
9. [AI Copilot Responsive Behavior](#9-ai-copilot-responsive-behavior)
10. [Touch Targets & Interaction](#10-touch-targets--interaction)
11. [PWA & Mobile Constraints](#11-pwa--mobile-constraints)
12. [Responsive Component Table](#12-responsive-component-table)

---

## 1. Responsive Principles

| #   | Principle                                      | Application                                                                                        |
| --- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| R1  | **Desktop-first, mobile-usable**               | Sprintio is a power tool — desktop is the primary experience. Mobile is usable, not feature-parity |
| R2  | **Content never reflows to cards on mobile**   | Board becomes single-column scroll, not card grid — preserves spatial mental model                 |
| R3  | **Progressive disclosure, not feature hiding** | Mobile gets the same features via panels and sheets, not removed entirely                          |
| R4  | **Touch targets ≥44px**                        | Every tappable element on mobile is at least 44×44px (Apple HIG) / 48×48dp (Material)              |
| R5  | **No hover-dependent interactions**            | Every hover effect has a tap/click equivalent; no information revealed only on hover               |

---

## 2. Breakpoint System

### 2.1 Breakpoint Definitions

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BREAKPOINT SCALE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Mobile        Tablet          Desktop         Desktop XL                │
│  <768px        768-1023px      1024-1439px     ≥1440px                   │
│  ├─────────────┼───────────────┼───────────────┼──────────────►          │
│  0             768             1024            1440            px        │
│                                                                           │
│  ┌────────┐   ┌──────────┐    ┌───────────┐   ┌───────────┐            │
│  │Mobile  │   │ Tablet   │    │ Desktop   │   │Desktop XL │            │
│  │375px   │   │ 768px    │    │ 1024px    │   │ 1440px    │            │
│  │(iPhone │   │(iPad)    │    │(Laptop)   │   │(Monitor)  │            │
│  │ SE)    │   │          │    │           │   │           │            │
│  └────────┘   └──────────┘    └───────────┘   └───────────┘            │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Breakpoint Tokens (CSS)

```css
/* Breakpoint tokens — used in media queries */
--bp-mobile: 0px; /* Base (mobile-first) */
--bp-tablet: 768px;
--bp-desktop: 1024px;
--bp-desktop-xl: 1440px;
```

### 2.3 Breakpoint Behavior Summary

| Property         |   Mobile (<768)    |   Tablet (768–1023)    |  Desktop (1024–1439)   |   Desktop XL (≥1440)   |
| ---------------- | :----------------: | :--------------------: | :--------------------: | :--------------------: |
| Sidebar          | Hidden (hamburger) |   Hidden (hamburger)   |    Collapsed (64px)    |    Expanded (240px)    |
| Copilot          | Full-screen sheet  | Slide-in panel (320px) | Slide-in panel (320px) | Slide-in panel (320px) |
| Task detail      |    Full-screen     |   Full-screen modal    |  Slide-in panel (50%)  |  Slide-in panel (60%)  |
| Board columns    |     1 (scroll)     |       2 (scroll)       |       3 (scroll)       |      4 (visible)       |
| Doc sidebar      |  Hidden (drawer)   |    Hidden (drawer)     |  Collapsible (240px)   |  Collapsible (240px)   |
| Filter bar       |    Collapsible     |      Collapsible       |     Always visible     |     Always visible     |
| Top bar height   |        48px        |          56px          |          56px          |          56px          |
| Min touch target |        48px        |          44px          |          40px          |          40px          |

---

## 3. Layout Strategy

### 3.1 App Shell Layout Adaptation

#### Desktop XL (≥1440px) — Full Experience

```
┌──────────────────────────────────────────────────────────────┐
│ ┌─TopBar (56px)────────────────────────────────────────────┐ │
│ │ Logo   Search    Shortcuts   Notifications  User         │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌────────┬─────────────────────────────┬──────────────────┐ │
│ │Sidebar │                             │ Copilot          │ │
│ │        │                             │ (toggleable)     │ │
│ │ 240px  │    Content Area             │ 320px            │ │
│ │(expand)│    (flex: 1)                │                  │ │
│ │        │                             │                  │ │
│ │        │                             │                  │ │
│ └────────┴─────────────────────────────┴──────────────────┘ │
│                                                              │
│  Total: ≥1440px                                             │
│  Content: ≥880px (1440 - 240 - 320)                         │
└──────────────────────────────────────────────────────────────┘
```

#### Desktop (1024–1439px) — Collapsed Sidebar

```
┌──────────────────────────────────────────────────────────────┐
│ ┌─TopBar (56px)────────────────────────────────────────────┐ │
│ │ Logo   Search    Notifications  User                     │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌──────┬──────────────────────────────┬───────────────────┐ │
│ │Side  │                              │ Copilot           │ │
│ │bar   │   Content Area               │ (toggleable)      │ │
│ │      │   (flex: 1)                  │ 320px             │ │
│ │ 64px │                              │                   │ │
│ │(coll)│                              │                   │ │
│ └──────┴──────────────────────────────┴───────────────────┘ │
│                                                              │
│  Total: 1024-1439px                                         │
│  Content: ≥640px (min)                                      │
└──────────────────────────────────────────────────────────────┘
```

#### Tablet (768–1023px) — No Sidebar

```
┌──────────────────────────────────────────────────────────────┐
│ ┌─TopBar (56px)────────────────────────────────────────────┐ │
│ │ ☰   Logo      Search     Notifications  User            │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │                                                          │ │
│ │   Content Area (full width)                              │ │
│ │                                                          │ │
│ │   Sidebar accessed via hamburger (☰) → slide-over panel  │ │
│ │   Task detail: full-screen modal overlay                 │ │
│ │   Copilot: slide-in panel from right                     │ │
│ │                                                          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│  Total: 768-1023px                                          │
└──────────────────────────────────────────────────────────────┘
```

#### Mobile (<768px) — Bottom Tabs

```
┌──────────────────────────┐
│ ┌─TopBar (48px)────────┐ │
│ │ ☰   Sprintio   🔔 👤 │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │                      │ │
│ │  Content Area        │ │
│ │  (full width)        │ │
│ │                      │ │
│ │  Bottom padding:     │ │
│ │  64px (tab bar)      │ │
│ │                      │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ 🏠   📋   📄   🤖    │ │
│ │ Home Board Docs  AI  │ │
│ │     (64px tab bar)   │ │
│ └──────────────────────┘ │
│                           │
│  Total: <768px           │
│  Min width: 320px        │
└──────────────────────────┘
```

---

## 4. Navigation Adaptation

### 4.1 Sidebar Behavior

| Breakpoint          | State                   | Trigger            | Width         | Content                       |
| ------------------- | ----------------------- | ------------------ | ------------- | ----------------------------- |
| Desktop XL (≥1440)  | **Expanded** (default)  | Always visible     | 240px         | Full labels + icons           |
| Desktop (1024–1439) | **Collapsed** (default) | Always visible     | 64px          | Icons only, tooltips on hover |
| Desktop (1024–1439) | **Expanded**            | Hover or toggle    | 240px         | Full labels + icons           |
| Tablet (768–1023)   | **Hidden** (default)    | —                  | 0px           | —                             |
| Tablet (768–1023)   | **Slide-over**          | Hamburger tap (☰) | 280px overlay | Full labels + icons           |
| Mobile (<768)       | **Hidden** (default)    | —                  | 0px           | —                             |
| Mobile (<768)       | **Slide-over**          | Hamburger tap (☰) | 280px overlay | Full labels + icons           |

### 4.2 Sidebar Mobile Slide-Over

```
┌──────────────────────────┐
│ ┌──────────┐             │
│ │ Sidebar  │ ◄── Overlay │
│ │ (280px)  │     behind  │
│ │          │     (dark   │
│ │ 🏠 Home  │     scrim)  │
│ │ 📁 Space │             │
│ │ 📄 Docs  │             │
│ │ 🤖 Auto  │             │
│ │ 👥 Team  │             │
│ │ ⚙ Settings│             │
│ └──────────┘             │
│                           │
│  Tap outside to close     │
│  Swipe left to close      │
└──────────────────────────┘
```

### 4.3 Mobile Bottom Tab Bar

| Tab   | Icon | Route                  | Badge                 |
| ----- | ---- | ---------------------- | --------------------- |
| Home  | 🏠   | `/home`                | —                     |
| Board | 📋   | `/:wsId/:listId/board` | Task count (optional) |
| Docs  | 📄   | `/:wsId/docs`          | —                     |
| AI    | 🤖   | Opens Copilot sheet    | Unread indicator      |

**Tab Bar Specs:**

- Height: 64px (including safe area on iPhone)
- Background: `bg-surface` with top border `border-default`
- Active state: `primary-500` icon + label
- Inactive state: `neutral-400` icon + label
- Touch target: entire tab area (flex: 1 each)
- Safe area: `env(safe-area-inset-bottom)` padding

### 4.4 Top Bar Adaptation

| Element            | Desktop XL               | Desktop              | Tablet                         | Mobile                         |
| ------------------ | ------------------------ | -------------------- | ------------------------------ | ------------------------------ |
| Logo               | Icon + text "Sprintio"   | Icon + text          | Icon + text                    | Text only                      |
| Search             | Full input + ⌘K hint     | Full input + ⌘K hint | Collapsed (icon tap to expand) | Collapsed (icon tap to expand) |
| Hamburger          | Hidden                   | Hidden               | Visible (left)                 | Visible (left)                 |
| Keyboard shortcuts | Shown                    | Shown                | Hidden                         | Hidden                         |
| Notifications      | Bell + badge             | Bell + badge         | Bell + badge                   | Bell + badge                   |
| User menu          | Avatar + name + dropdown | Avatar + dropdown    | Avatar + dropdown              | Avatar + dropdown              |

---

## 5. Board View Responsive Behavior

### 5.1 Column Visibility

| Breakpoint          | Columns Visible | Scroll           | Column Min Width |
| ------------------- | :-------------: | ---------------- | :--------------: |
| Desktop XL (≥1440)  |        4        | Horizontal if >4 |      280px       |
| Desktop (1024–1439) |        3        | Horizontal       |      260px       |
| Tablet (768–1023)   |        2        | Horizontal       |      260px       |
| Mobile (<768)       |        1        | Horizontal swipe |  100% viewport   |

### 5.2 Board Card Adaptation

| Element         | Desktop             | Tablet              | Mobile                 |
| --------------- | ------------------- | ------------------- | ---------------------- |
| Card width      | 100% of column      | 100% of column      | calc(100vw - 32px)     |
| Card padding    | 12px                | 12px                | 16px                   |
| Task ID         | Visible             | Visible             | Visible                |
| Title           | Full (2-line clamp) | Full (2-line clamp) | Full (2-line clamp)    |
| Priority badge  | Visible             | Visible             | Visible                |
| Assignee avatar | Visible             | Visible             | Visible                |
| Due date        | Visible             | Visible             | Visible                |
| Labels          | Visible (2 max)     | Visible (1 max)     | Hidden                 |
| Drag handle     | Visible             | Visible             | Hidden (swipe actions) |

### 5.3 Mobile Board — Single Column

```
┌──────────────────────────┐
│ Sprint 14    [Filter] [⋯] │
├──────────────────────────┤
│                           │
│ Status: [In Progress ▾]  │
│ ← Swipe to change →      │
│                           │
│ ┌──────────────────────┐ │
│ │ SIO-245              │ │
│ │ Auth refresh token   │ │
│ │ 🟡 P1  👤Priya       │ │
│ │ 📅 Jul 12            │ │
│ └──────────────────────┘ │
│                           │
│ ┌──────────────────────┐ │
│ │ SIO-246              │ │
│ │ Payment webhook      │ │
│ │ 🟡 P1  👤Marcus      │ │
│ │ 📅 Jul 14            │ │
│ └──────────────────────┘ │
│                           │
│ Status: [In Review ▾]    │
│                           │
│ ┌──────────────────────┐ │
│ │ SIO-228              │ │
│ │ Dashboard charts     │ │
│ │ 🟡 P1  👤Alex        │ │
│ └──────────────────────┘ │
│                           │
├──────────────────────────┤
│ 🏠   📋   📄   🤖        │
└──────────────────────────┘
```

**Mobile Board Interactions:**

- Status dropdown at top filters which column group to show
- Cards are stacked vertically within each status group
- Swipe left/right on a card → quick status change (toast confirmation)
- Long press on card → context menu (Edit, Assign, Change Priority, Move)
- Tap on card → full-screen task detail

### 5.4 Board Header Adaptation

| Element           | Desktop                  | Tablet                      | Mobile                       |
| ----------------- | ------------------------ | --------------------------- | ---------------------------- |
| Breadcrumb        | Full path                | Truncated                   | Hidden (title only)          |
| View toggle       | Board / List tabs        | Board / List tabs           | Hidden (use bottom tab)      |
| Filter bar        | Always visible           | Collapsible (tap to expand) | Collapsible (tap to expand)  |
| New Task button   | Text button "+ New Task" | Icon button "+"             | FAB (floating action button) |
| Overflow menu (⋯) | Visible                  | Visible                     | Visible                      |

---

## 6. List View Responsive Behavior

### 6.1 Table Layout

| Breakpoint          | Layout                | Columns Shown                                   |
| ------------------- | --------------------- | ----------------------------------------------- |
| Desktop XL (≥1440)  | Full table            | All columns visible                             |
| Desktop (1024–1439) | Full table            | All columns visible                             |
| Tablet (768–1023)   | Full table            | Essential columns (ID, Title, Status, Priority) |
| Mobile (<768)       | Card list (not table) | Task cards with key metadata                    |

### 6.2 Column Visibility by Breakpoint

| Column   | Desktop XL | Desktop | Tablet |      Mobile      |
| -------- | :--------: | :-----: | :----: | :--------------: |
| Checkbox |     ✅     |   ✅    |   ✅   | ❌ (long-press)  |
| Task ID  |     ✅     |   ✅    |   ✅   |        ✅        |
| Title    |     ✅     |   ✅    |   ✅   | ✅ (full width)  |
| Status   |     ✅     |   ✅    |   ✅   |        ✅        |
| Priority |     ✅     |   ✅    |   ✅   |        ✅        |
| Due Date |     ✅     |   ✅    |   ❌   |        ❌        |
| Assignee |     ✅     |   ✅    |   ❌   | ✅ (avatar only) |
| Labels   |     ✅     |   ✅    |   ❌   |        ❌        |

### 6.3 Mobile List — Card Layout

```
┌──────────────────────────┐
│ My Work     [Filter] [⋯] │
├──────────────────────────┤
│                           │
│ ┌──────────────────────┐ │
│ │ SIO-245              │ │
│ │ Auth refresh token   │ │
│ │                      │ │
│ │ 🟡 In Progress  P1   │ │
│ │ 📅 Jul 12  👤 Priya  │ │
│ └──────────────────────┘ │
│                           │
│ ┌──────────────────────┐ │
│ │ SIO-231              │ │
│ │ Migrate DB schema    │ │
│ │                      │ │
│ │ ⚪ Backlog      P0   │ │
│ │ 📅 Jul 10  👤 Marcus │ │
│ └──────────────────────┘ │
│                           │
│ Showing 5 of 5 tasks     │
│                           │
├──────────────────────────┤
│ 🏠   📋   📄   🤖        │
└──────────────────────────┘
```

---

## 7. Task Detail Responsive Behavior

### 7.1 Presentation Mode by Breakpoint

| Breakpoint          | Presentation              | Width                    | Dismiss                        |
| ------------------- | ------------------------- | ------------------------ | ------------------------------ |
| Desktop XL (≥1440)  | Slide-in panel from right | 60% viewport (max 864px) | ✕ button, `Esc`, click outside |
| Desktop (1024–1439) | Slide-in panel from right | 50% viewport (max 720px) | ✕ button, `Esc`, click outside |
| Tablet (768–1023)   | Full-screen modal         | 100% viewport            | ✕ button, `Esc`, swipe right   |
| Mobile (<768)       | Full-screen page          | 100% viewport            | ← back button, swipe right     |

### 7.2 Task Detail Layout Adaptation

```
Desktop XL (≥1440px):
┌──────────────────────┬──────────────────────────────────┐
│ Board/List (40%)     │ Task Detail Panel (60%)          │
│ (dimmed)             │ ┌─MetadataBar──────────────────┐ │
│                      │ │ Status  Priority  Assignee   │ │
│                      │ │ Sprint  Due Date  Labels     │ │
│                      │ ├─Tabs────────────────────────┤ │
│                      │ │ Desc │ Comments │ Activity   │ │
│                      │ ├─Content─────────────────────┤ │
│                      │ │ (scrollable)                 │ │
│                      │ └─────────────────────────────┘ │
└──────────────────────┴──────────────────────────────────┘

Tablet (768-1023px):
┌──────────────────────────────────────────────────────────┐
│ ← Back    SIO-245 ─ Auth refresh token         [⋯] [✕] │
├──────────────────────────────────────────────────────────┤
│ Status [In Progress ▾]  Priority [🟡 P1 ▾]              │
│ Assignee [Priya ▾]     Sprint [Sprint 14 ▾]            │
├──────────────────────────────────────────────────────────┤
│ [Description] [Comments (3)] [Activity] [Subtasks]      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ (Content — full width, scrollable)                       │
│                                                          │
└──────────────────────────────────────────────────────────┘

Mobile (<768px):
┌──────────────────────┐
│ ←  SIO-245     [⋯]  │
├──────────────────────┤
│ Auth refresh token   │
│ (title — prominent)  │
├──────────────────────┤
│ Status [In Progress] │
│ Priority [🟡 P1]     │
│ Assignee [Priya]     │
│ Due [Jul 12]         │
├──────────────────────┤
│ [Desc] [Comments] [ACT]│
├──────────────────────┤
│ (Content — full      │
│  width, scrollable)  │
│                      │
└──────────────────────┘
```

### 7.3 MetadataBar Stacking

| Breakpoint | Layout                            | Items Per Row |
| ---------- | --------------------------------- | :-----------: |
| Desktop XL | Single row, all fields inline     |       6       |
| Desktop    | Single row, fields wrap if needed |      4–6      |
| Tablet     | Two rows, fields wrap             |  3–4 per row  |
| Mobile     | Stacked vertically, full width    |   1 per row   |

---

## 8. Document Editor Responsive Behavior

### 8.1 Editor Layout

| Breakpoint          | Editor Width                 | Doc Sidebar                  | Toolbar          |
| ------------------- | ---------------------------- | ---------------------------- | ---------------- |
| Desktop XL (≥1440)  | 720px (centered) + sidebar   | Visible (240px, collapsible) | Floating toolbar |
| Desktop (1024–1439) | 720px (centered) + sidebar   | Collapsed by default         | Floating toolbar |
| Tablet (768–1023)   | 100% (padded 24px each side) | Hidden (drawer via icon)     | Floating toolbar |
| Mobile (<768)       | 100% (padded 16px each side) | Hidden (drawer via icon)     | Bottom toolbar   |

### 8.2 Doc Sidebar Behavior

| Breakpoint | Default State | Access                                 | Width          |
| ---------- | ------------- | -------------------------------------- | -------------- |
| Desktop XL | Visible       | Toggle button                          | 240px          |
| Desktop    | Collapsed     | Toggle button                          | 240px (expand) |
| Tablet     | Hidden        | Icon in doc header → slide-over        | 280px overlay  |
| Mobile     | Hidden        | Icon in doc header → full-screen sheet | 100%           |

### 8.3 Mobile Doc Toolbar

```
Desktop: Floating toolbar (appears on text selection)
┌──────────────────────────────────┐
│                                  │
│  Selected text...                │
│  ┌────────────────────────────┐ │
│  │ B  I  U  S  ~  🔗  💬  🤖 │ │
│  └────────────────────────────┘ │
│                                  │
└──────────────────────────────────┘

Mobile: Fixed bottom toolbar (always visible when editing)
┌──────────────────────────┐
│                          │
│  (Doc content — scroll)  │
│                          │
│                          │
├──────────────────────────┤
│ B  I  U  S  ~  🔗  💬  🤖 │  ← Fixed bottom toolbar
└──────────────────────────┘
```

---

## 9. AI Copilot Responsive Behavior

### 9.1 Presentation Mode

| Breakpoint          | Presentation                | Width | Trigger                     |
| ------------------- | --------------------------- | ----- | --------------------------- |
| Desktop XL (≥1440)  | Slide-in panel (right side) | 320px | Toggle button in top bar    |
| Desktop (1024–1439) | Slide-in panel (right side) | 320px | Toggle button in top bar    |
| Tablet (768–1023)   | Slide-in panel (right side) | 320px | Toggle button in top bar    |
| Mobile (<768)       | Full-screen bottom sheet    | 100%  | Bottom tab "🤖" or swipe up |

### 9.2 Mobile Copilot Sheet

```
┌──────────────────────────┐
│  ━━━━  (drag handle)     │
│                           │
│  🤖 AI Copilot           │
│  ─────────────────────── │
│                           │
│  (Chat messages)          │
│                           │
│  ─────────────────────── │
│  [Ask me anything... ]    │
│                   [Send]  │
│                           │
└──────────────────────────┘

Swipe down to dismiss
```

### 9.3 Copilot Input Adaptation

| Breakpoint | Input Position  | Height             | Keyboard Behavior              |
| ---------- | --------------- | ------------------ | ------------------------------ |
| Desktop    | Bottom of panel | 80px (auto-resize) | Panel stays fixed              |
| Tablet     | Bottom of panel | 80px (auto-resize) | Panel stays fixed              |
| Mobile     | Bottom of sheet | 48px (auto-resize) | Sheet scrolls up with keyboard |

---

## 10. Touch Targets & Interaction

### 10.1 Minimum Touch Target Sizes

| Element         | Desktop     | Tablet      | Mobile      | Standard      |
| --------------- | ----------- | ----------- | ----------- | ------------- |
| Button          | 32px height | 36px height | 44px height | WCAG 2.5.5    |
| Icon button     | 32×32px     | 36×36px     | 44×44px     | Apple HIG     |
| Navigation item | 40px height | 44px height | 48px height | Material 48dp |
| Tab bar item    | —           | —           | 48×64px     | Material      |
| Checkbox        | 16×16px     | 20×20px     | 24×24px     | WCAG          |
| Toggle          | 36×20px     | 40×22px     | 44×24px     | Apple HIG     |
| Dropdown item   | 32px height | 36px height | 44px height | Apple HIG     |
| Filter chip     | 28px height | 32px height | 36px height | —             |
| Drag handle     | 24×24px     | 32×32px     | 44×44px     | —             |

### 10.2 Interaction Modality by Breakpoint

| Interaction        | Desktop                  | Tablet                | Mobile                             |
| ------------------ | ------------------------ | --------------------- | ---------------------------------- |
| Drag and drop      | Mouse drag               | Touch drag            | Swipe actions (替代)               |
| Right-click        | Context menu             | Context menu          | Long-press context menu            |
| Hover              | Tooltip, hover preview   | ❌ Not available      | ❌ Not available                   |
| Double-click       | Inline edit              | Inline edit           | Tap to open edit                   |
| Scroll             | Mouse wheel              | Touch scroll          | Touch scroll                       |
| Pinch-to-zoom      | ❌ Not supported         | ❌ Not supported      | ❌ Not supported (prevented)       |
| Keyboard shortcuts | Full support             | Limited (external KB) | ❌ Not available                   |
| Multi-select       | Ctrl+Click / Shift+Click | Tap checkboxes        | Long-press to enter selection mode |

### 10.3 Swipe Actions (Mobile Only)

| Screen       | Swipe Left                        | Swipe Right                           |
| ------------ | --------------------------------- | ------------------------------------- |
| Board card   | Quick status change (next status) | Quick status change (previous status) |
| List card    | Quick status change (next status) | Quick status change (previous status) |
| Task detail  | Back to previous screen           | Back to previous screen               |
| Notification | Mark as read                      | Dismiss                               |
| Doc sidebar  | Close                             | —                                     |

### 10.4 Long Press Context Menu (Mobile)

```
┌──────────────────────────┐
│ ┌──────────────────────┐ │
│ │  Edit Task           │ │
│ │  ─────────────────── │ │
│ │  Change Status ▸     │ │
│ │  Change Priority ▸   │ │
│ │  Assign To ▸         │ │
│ │  ─────────────────── │ │
│ │  Duplicate           │ │
│ │  Delete              │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

---

## 11. PWA & Mobile Constraints

### 11.1 PWA Configuration

| Setting          | Value                                         |
| ---------------- | --------------------------------------------- |
| Display          | `standalone` (full-screen, no browser chrome) |
| Theme color      | `#6366F1` (primary-500)                       |
| Background color | `#F9FAFB` (neutral-50)                        |
| Orientation      | `any` (portrait preferred for mobile)         |
| Icons            | 192×192, 512×512, maskable                    |
| Start URL        | `/home`                                       |
| Scope            | `/`                                           |

### 11.2 Mobile Viewport

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no"
/>
```

| Setting              | Value                  | Rationale                |
| -------------------- | ---------------------- | ------------------------ |
| `width=device-width` | Device width           | Standard responsive      |
| `initial-scale=1`    | No zoom on load        | Prevents accidental zoom |
| `viewport-fit=cover` | Extend into safe areas | iPhone notch support     |
| `maximum-scale=1`    | Prevent pinch zoom     | App-like experience      |
| `user-scalable=no`   | Prevent user zoom      | App-like experience      |

### 11.3 Safe Area Handling

```css
/* Safe area insets for notched devices */
--safe-area-top: env(safe-area-inset-top); /* ~47px on iPhone notch */
--safe-area-bottom: env(safe-area-inset-bottom); /* ~34px on iPhone */
--safe-area-left: env(safe-area-inset-left); /* 0px in portrait */
--safe-area-right: env(safe-area-inset-right); /* 0px in portrait */

/* Application */
body {
  padding-top: var(--safe-area-top);
}

.mobile-tab-bar {
  padding-bottom: var(--safe-area-bottom);
  height: calc(64px + var(--safe-area-bottom));
}

.mobile-top-bar {
  height: calc(48px + var(--safe-area-top));
  padding-top: var(--safe-area-top);
}
```

### 11.4 Mobile Performance Constraints

| Constraint        | Target             | Strategy                                 |
| ----------------- | ------------------ | ---------------------------------------- |
| First paint       | <2s on 3G          | Skeleton screens, code splitting         |
| Interaction ready | <3s on 3G          | Critical CSS inline, deferred JS         |
| Bundle size       | <200KB initial     | Tree shaking, lazy loading views         |
| Images            | WebP with fallback | Responsive `srcset`, lazy load           |
| Animations        | 60fps              | CSS transforms only, no layout thrashing |
| Offline           | Read-only cache    | Service worker caches static assets      |

### 11.5 Mobile Keyboard Handling

| Behavior               | Implementation                                    |
| ---------------------- | ------------------------------------------------- |
| Virtual keyboard opens | Content scrolls up, input stays visible           |
| Keyboard dismiss       | Tap "Done" or tap outside input                   |
| Command palette (⌘K)   | Not available on mobile; use search icon          |
| Keyboard shortcuts     | Not available; use hamburger menu + context menus |
| Text selection         | Native OS text selection handles                  |
| Rich text formatting   | Bottom toolbar (always visible)                   |

---

## 12. Responsive Component Table

### 12.1 Component Visibility by Breakpoint

| Component                   |    Mobile    |   Tablet    |   Desktop    |      Desktop XL       |
| --------------------------- | :----------: | :---------: | :----------: | :-------------------: |
| Sidebar (expanded)          |      ❌      |     ❌      |      ❌      |          ✅           |
| Sidebar (collapsed)         |      ❌      |     ❌      |      ✅      | ✅ (default expanded) |
| Hamburger menu              |      ✅      |     ✅      |      ❌      |          ❌           |
| Mobile tab bar              |      ✅      |     ❌      |      ❌      |          ❌           |
| Top bar search (full)       |      ❌      |     ❌      |      ✅      |          ✅           |
| Top bar search (icon)       |      ✅      |     ✅      |      ❌      |          ❌           |
| Filter bar (always visible) |      ❌      |     ❌      |      ✅      |          ✅           |
| Filter bar (collapsible)    |      ✅      |     ✅      |      ❌      |          ❌           |
| Board columns (4+)          |    1 col     |    2 col    |    3 col     |         4 col         |
| Board card labels           |      ❌      |    1 max    |    2 max     |         2 max         |
| List table columns          | Card layout  |   4 cols    |    6 cols    |        7 cols         |
| Task detail panel           | Full screen  | Full screen | 50% slide-in |     60% slide-in      |
| Task detail metadata        |   Stacked    |   2 rows    |    1 row     |         1 row         |
| Doc sidebar                 |    Drawer    |   Drawer    | Collapsible  |      Collapsible      |
| Doc floating toolbar        | Bottom fixed |  Floating   |   Floating   |       Floating        |
| Copilot panel               |  Full sheet  |  Slide-in   |   Slide-in   |       Slide-in        |
| New task FAB                |      ✅      |     ❌      |      ❌      |          ❌           |
| New task text button        |      ❌      |     ✅      |      ✅      |          ✅           |
| Keyboard shortcut hints     |      ❌      |     ❌      |      ✅      |          ✅           |
| Drag handles                |      ❌      |     ✅      |      ✅      |          ✅           |
| Swipe actions               |      ✅      |     ❌      |      ❌      |          ❌           |
| Long press menus            |      ✅      |     ✅      |      ❌      |          ❌           |

### 12.2 Spacing Scale by Breakpoint

| Token        | Mobile | Tablet | Desktop | Desktop XL |
| ------------ | ------ | ------ | ------- | ---------- |
| `space-xs`   | 4px    | 4px    | 4px     | 4px        |
| `space-sm`   | 8px    | 8px    | 8px     | 8px        |
| `space-md`   | 12px   | 16px   | 16px    | 16px       |
| `space-lg`   | 16px   | 20px   | 24px    | 24px       |
| `space-xl`   | 20px   | 24px   | 32px    | 32px       |
| `space-2xl`  | 24px   | 32px   | 40px    | 48px       |
| Page padding | 16px   | 24px   | 32px    | 40px       |
| Card padding | 12px   | 12px   | 12px    | 12px       |
| Section gap  | 16px   | 20px   | 24px    | 24px       |

### 12.3 Elevation (Shadow) by Breakpoint

| Element            | Desktop       | Mobile            | Rationale                                |
| ------------------ | ------------- | ----------------- | ---------------------------------------- |
| Card               | `shadow-sm`   | `shadow-sm`       | Same — subtle elevation                  |
| Card (hover)       | `shadow-md`   | —                 | No hover on mobile                       |
| Card (drag)        | `shadow-drag` | —                 | No drag on mobile                        |
| Dropdown/popover   | `shadow-lg`   | `shadow-lg`       | Elevated above content                   |
| Modal              | `shadow-xl`   | —                 | Full-screen on mobile (no shadow needed) |
| Sidebar slide-over | `shadow-xl`   | `shadow-xl`       | Overlay on content                       |
| Bottom tab bar     | —             | `shadow-md` (top) | Elevated above content                   |

---

## Appendix A: Responsive Testing Checklist

### Desktop XL (≥1440px)

- [ ] Sidebar expanded with full labels
- [ ] Board shows 4+ columns
- [ ] Task detail opens as 60% slide-in panel
- [ ] Copilot panel toggleable at 320px
- [ ] Doc sidebar visible at 240px
- [ ] All keyboard shortcuts functional
- [ ] Command palette (⌘K) opens and works

### Desktop (1024–1439px)

- [ ] Sidebar collapsed to 64px icons
- [ ] Sidebar expands on hover/toggle
- [ ] Board shows 3 columns with horizontal scroll
- [ ] Task detail opens as 50% slide-in panel
- [ ] All keyboard shortcuts functional

### Tablet (768–1023px)

- [ ] Sidebar hidden; hamburger menu opens slide-over
- [ ] Board shows 2 columns with horizontal scroll
- [ ] Task detail opens as full-screen modal
- [ ] Filter bar collapsible
- [ ] Doc sidebar accessible via drawer icon
- [ ] Touch interactions work (no hover-dependent features)
- [ ] Copilot panel slides in from right

### Mobile (<768px)

- [ ] Bottom tab bar visible with correct icons
- [ ] Sidebar accessible via hamburger menu
- [ ] Board shows single-column with status grouping
- [ ] Swipe actions work on task cards
- [ ] Long-press context menus appear on task cards
- [ ] Task detail opens as full-screen page
- [ ] Copilot opens as bottom sheet
- [ ] Touch targets ≥44px on all interactive elements
- [ ] Doc editor shows fixed bottom toolbar
- [ ] Virtual keyboard doesn't obscure inputs
- [ ] Safe area insets applied (iPhone notch)
- [ ] PWA install prompt appears
- [ ] No horizontal scroll (except board columns, code blocks)

---

> **Next Document:** [08-ACCESSIBILITY.md](./08-ACCESSIBILITY.md) — WCAG compliance, ARIA patterns, keyboard navigation, screen reader support, and motion preferences
