# Sprintio — Accessibility

> **Sprint fast. Ship together.**
> Document: 08 — Accessibility (a11y)
> Version: 1.0 | Date: 2026-07-08
> Scope: MVP — WCAG 2.1 AA compliance, ARIA patterns, keyboard navigation, screen reader support, motion preferences

---

## Table of Contents

1. [Accessibility Principles](#1-accessibility-principles)
2. [WCAG 2.1 AA Compliance Target](#2-wcag-21-aa-compliance-target)
3. [Keyboard Navigation](#3-keyboard-navigation)
4. [Focus Management](#4-focus-management)
5. [ARIA Patterns](#5-aria-patterns)
6. [Screen Reader Support](#6-screen-reader-support)
7. [Color & Contrast](#7-color--contrast)
8. [Motion & Animation](#8-motion--animation)
9. [Forms & Input Accessibility](#9-forms--input-accessibility)
10. [Semantic HTML](#10-semantic-html)
11. [Testing Strategy](#11-testing-strategy)
12. [Accessibility Component Checklist](#12-accessibility-component-checklist)

---

## 1. Accessibility Principles

| # | Principle | Application |
|---|-----------|-------------|
| A1 | **Perceivable** | All information and UI components are presentable to users in ways they can perceive |
| A2 | **Operable** | All UI components and navigation are operable via keyboard, mouse, touch, and assistive technology |
| A3 | **Understandable** | Information and UI operation are clear and predictable |
| A4 | **Robust** | Content is interpreted reliably by a wide variety of user agents, including assistive technologies |

### 1.1 Accessibility Commitment

| Metric | Target | Timeline |
|--------|--------|----------|
| WCAG 2.1 Level AA | Full compliance | MVP launch |
| Automated a11y test coverage | ≥90% of components | MVP launch |
| Manual keyboard testing | All critical flows | MVP launch |
| Screen reader testing | VoiceOver (macOS) + NVDA (Windows) | MVP launch |
| WCAG 2.1 Level AAA | Partial (color contrast, target size) | Phase 2 |
| Formal third-party audit | VPAT/ACR document | Phase 2 |

---

## 2. WCAG 2.1 AA Compliance Target

### 2.1 Success Criteria Map

| WCAG Criterion | Level | Status in MVP | Implementation |
|---------------|:-----:|:-------------:|----------------|
| **1.1.1 Non-text Content** | A | ✅ | All images have `alt` text; decorative images use `alt=""` |
| **1.3.1 Info and Relationships** | A | ✅ | Semantic HTML: headings, lists, tables, landmarks |
| **1.3.2 Meaningful Sequence** | A | ✅ | DOM order matches visual order |
| **1.3.4 Orientation** | AA | ✅ | Content works in both portrait and landscape |
| **1.3.5 Identify Input Purpose** | AA | ✅ | `autocomplete` attributes on form fields |
| **1.4.1 Use of Color** | A | ✅ | Color never the sole indicator (always + icon or text) |
| **1.4.3 Contrast Minimum** | AA | ✅ | 4.5:1 for normal text, 3:1 for large text |
| **1.4.4 Resize Text** | AA | ✅ | Text resizable to 200% without loss of content |
| **1.4.5 Images of Text** | AA | ✅ | No images of text (all text is real text) |
| **1.4.10 Reflow** | AA | ✅ | Content reflows at 320px width (no horizontal scroll for text) |
| **1.4.11 Non-text Contrast** | AA | ✅ | UI components and graphical objects ≥3:1 contrast |
| **1.4.12 Text Spacing** | AA | ✅ | Content adapts to user-adjusted text spacing |
| **1.4.13 Content on Hover or Focus** | AA | ✅ | Tooltips dismissible, hoverable, persistent |
| **2.1.1 Keyboard** | A | ✅ | All functionality via keyboard |
| **2.1.2 No Keyboard Trap** | A | ✅ | Focus can move away from any component |
| **2.1.4 Character Key Shortcuts** | A | ✅ | Single-character shortcuts remappable or disablable |
| **2.4.1 Bypass Blocks** | A | ✅ | Skip-to-content link; command palette for power users |
| **2.4.2 Page Titled** | A | ✅ | Descriptive page titles |
| **2.4.3 Focus Order** | A | ✅ | Logical tab order matching visual layout |
| **2.4.4 Link Purpose (In Context)** | A | ✅ | Link text is descriptive or has `aria-label` |
| **2.4.5 Multiple Ways** | AA | ✅ | Navigation + search + command palette |
| **2.4.6 Headings and Labels** | AA | ✅ | Descriptive headings and form labels |
| **2.4.7 Focus Visible** | AA | ✅ | Visible focus indicator on all interactive elements |
| **2.5.1 Pointer Gestures** | A | ✅ | Multipoint gestures have single-pointer alternatives |
| **2.5.3 Label in Name** | A | ✅ | Accessible name matches visible label |
| **2.5.4 Motion Actuation** | A | ✅ | Motion-triggered actions have UI alternatives |
| **3.1.1 Language of Page** | A | ✅ | `lang="en"` on `<html>` |
| **3.1.2 Language of Parts** | AA | ✅ | `lang` attribute on content with different languages |
| **3.2.1 On Focus** | A | ✅ | No unexpected context changes on focus |
| **3.2.2 On Input** | A | ✅ | No unexpected context changes on input |
| **3.2.3 Consistent Navigation** | AA | ✅ | Navigation is consistent across pages |
| **3.2.4 Consistent Identification** | AA | ✅ | Components with same function have same labels |
| **3.3.1 Error Identification** | A | ✅ | Errors described in text (not just color) |
| **3.3.2 Labels or Instructions** | A | ✅ | All form inputs have visible labels |
| **3.3.3 Error Suggestion** | AA | ✅ | Error messages include correction suggestions |
| **3.3.4 Error Prevention** | AA | ✅ | Submissions reversible or confirmed |
| **4.1.2 Name, Role, Value** | A | ✅ | All components have accessible names and roles |
| **4.1.3 Status Messages** | AA | ✅ | Toast notifications use `role="status"` or `role="alert"` |

### 2.2 Defer to Phase 2

| Criterion | Reason for Deferral |
|-----------|-------------------|
| 2.4.11 Focus Not Obscured (Minimum) — AAA | Complex with fixed panels; Phase 2 focus |
| 1.4.13 Content on Hover or Focus — AAA | Partially met (AA level met); AAA needs extensive testing |
| 2.1.1 Keyboard — AAA | Some advanced features (automation builder drag) may need workarounds |

---

## 3. Keyboard Navigation

### 3.1 Global Keyboard Shortcuts

| Shortcut | Action | Scope |
|----------|--------|-------|
| `Tab` | Move focus forward | Global |
| `Shift+Tab` | Move focus backward | Global |
| `Enter` | Activate focused element | Global |
| `Space` | Activate button / toggle checkbox | Global |
| `Escape` | Close panel / modal / dropdown / command palette | Global |
| `⌘K` (Mac) / `Ctrl+K` (Win) | Open command palette | Global |
| `G` then `H` | Go to Home | Global |
| `G` then `M` | Go to My Work | Global |
| `G` then `B` | Go to Board View | Global |
| `G` then `L` | Go to List View | Global |
| `G` then `D` | Go to Docs | Global |
| `N` | New task (context-aware) | Board / List views |
| `⌘N` (Mac) / `Ctrl+N` (Win) | New document | Global |
| `/` | Focus search input | Global |
| `?` | Show keyboard shortcuts help | Global |

### 3.2 View-Specific Keyboard Navigation

#### Board View

| Key | Action |
|-----|--------|
| `←` `→` | Move between columns |
| `↑` `↓` | Move between cards within column |
| `Enter` | Open task detail for focused card |
| `Space` | Select/deselect focused card |
| `Space` + `←` `→` | Move selected card to adjacent column (drag simulation) |
| `Ctrl+A` | Select all cards |
| `Delete` | Archive selected cards (with confirmation) |

#### List View

| Key | Action |
|-----|--------|
| `↑` `↓` | Move between rows |
| `Enter` | Open task detail for focused row |
| `Space` | Select/deselect focused row |
| `Ctrl+Space` | Toggle select focused row (add to selection) |
| `Shift+↑` `Shift+↓` | Extend selection |
| `Home` | Move to first row |
| `End` | Move to last row |
| `Page Up` | Move up 10 rows |
| `Page Down` | Move down 10 rows |

#### Task Detail Panel

| Key | Action |
|-----|--------|
| `Tab` | Move between interactive elements in panel |
| `↑` `↓` (in comments) | Navigate between comments |
| `Enter` (on comment) | Focus reply input |
| `Escape` | Close panel |
| `[` | Previous task (if panel opened from list/board) |
| `]` | Next task |
| `E` | Edit task title (inline) |
| `⌘Enter` (Mac) / `Ctrl+Enter` (Win) | Save changes |

#### Document Editor

| Key | Action |
|-----|--------|
| `/` | Open slash command menu |
| `[[` | Open wiki-link autocomplete |
| `@` | Open mention autocomplete |
| `⌘B` / `Ctrl+B` | Bold |
| `⌘I` / `Ctrl+I` | Italic |
| `⌘U` / `Ctrl+U` | Underline |
| `⌘K` / `Ctrl+K` | Insert link |
| `⌘Z` / `Ctrl+Z` | Undo |
| `⌘⇧Z` / `Ctrl+Shift+Z` | Redo |
| `Tab` | Indent (in code blocks, lists) |
| `Shift+Tab` | Outdent |

#### Command Palette

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate results |
| `Enter` | Execute selected command |
| `Escape` | Close palette |
| `Backspace` (on empty input) | Close palette |
| Type to filter | Real-time filtering of commands and results |

### 3.3 Focus Trapping Rules

| Context | Focus Trap Behavior |
|---------|-------------------|
| Modal (onboarding, confirm) | Focus trapped within modal; `Escape` closes |
| Task detail panel | Focus moves to panel on open; `Escape` returns focus to source |
| Command palette | Focus trapped in palette; `Escape` closes and returns focus |
| Dropdown menu | Focus trapped in menu; `Escape` closes and returns focus to trigger |
| Sidebar slide-over (mobile) | Focus trapped in sidebar; `Escape` or tap outside closes |
| Copilot panel | Focus moves to panel input on open; `Escape` returns focus |

### 3.4 Skip Links

```html
<!-- Skip to main content link (first focusable element on page) -->
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<!-- Skip link CSS (visible on focus only) -->
<style>
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--color-primary-500);
    color: var(--color-text-inverse);
    padding: 8px 16px;
    z-index: 9999;
    transition: top 0.15s;
  }
  .skip-link:focus {
    top: 0;
  }
</style>
```

---

## 4. Focus Management

### 4.1 Focus Indicator Specifications

| Property | Value | Token |
|----------|-------|-------|
| Style | Solid outline | — |
| Width | 2px | — |
| Offset | 2px | — |
| Color | `#6366F1` (primary-500) | `--color-border-focus` |
| Border-radius | Matches element | — |

### 4.2 Focus Indicator CSS

```css
/* Base focus style for all interactive elements */
:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

/* Remove default browser outline (replaced by :focus-visible) */
:focus:not(:focus-visible) {
  outline: none;
}

/* Focus within containers (modals, panels) */
.focus-within-container:focus-within {
  box-shadow: 0 0 0 2px var(--color-border-focus);
}
```

### 4.3 Focus Management on State Changes

| Event | Focus Behavior |
|-------|---------------|
| Panel opens (task detail) | Focus moves to panel header (close button or task title) |
| Panel closes | Focus returns to triggering element |
| Modal opens | Focus moves to first interactive element in modal |
| Modal closes | Focus returns to triggering element |
| Toast appears | Focus does NOT move (toast uses `role="status"`) |
| Dropdown opens | Focus moves to first dropdown item |
| Dropdown closes | Focus returns to trigger button |
| Command palette opens | Focus moves to search input |
| Command palette closes | Focus returns to previous element |
| Tab switch | Focus stays on tab bar, content updates |
| New task created | Focus moves to new task title (editable) |
| Error validation | Focus moves to first invalid field |
| Page navigation | Focus moves to `<main>` heading |
| Skeleton → content | Focus stays where it was; content replaces skeleton |

### 4.4 Roving Tabindex Pattern

Used for composite widgets where only one item should be in the tab order.

**Applied to:**
- Board columns (arrow keys to move between columns)
- Board cards within a column (arrow keys to move between cards)
- List view rows (arrow keys to move between rows)
- Tab groups (arrow keys to switch tabs)
- Sidebar navigation items (arrow keys to move between items)
- Command palette results (arrow keys to navigate)

```html
<!-- Roving tabindex example: Tab group -->
<div role="tablist" aria-label="View options">
  <button role="tab" id="tab-board" aria-selected="true" tabindex="0">Board</button>
  <button role="tab" id="tab-list" aria-selected="false" tabindex="-1">List</button>
</div>
<div role="tabpanel" aria-labelledby="tab-board">
  <!-- Board view content -->
</div>
```

---

## 5. ARIA Patterns

### 5.1 Landmark Regions

| Landmark | Element | Usage |
|----------|---------|-------|
| `banner` | `<header>` | Top bar (implicit with `<header>`) |
| `navigation` | `<nav>` | Sidebar navigation, top bar navigation |
| `main` | `<main>` | Primary content area |
| `complementary` | `<aside>` | Sidebar, copilot panel, doc sidebar |
| `contentinfo` | `<footer>` | Footer (settings, help) |
| `search` | `<form role="search">` | Search form in top bar |
| `region` | `<section aria-label="...">` | Named regions (board, list, task detail) |

### 5.2 Component ARIA Patterns

#### Tabs (Board/List toggle, Task detail tabs)

```html
<div role="tablist" aria-label="Project views">
  <button
    role="tab"
    id="tab-board"
    aria-selected="true"
    aria-controls="panel-board"
    tabindex="0"
  >
    Board
  </button>
  <button
    role="tab"
    id="tab-list"
    aria-selected="false"
    aria-controls="panel-list"
    tabindex="-1"
  >
    List
  </button>
</div>

<div
  role="tabpanel"
  id="panel-board"
  aria-labelledby="tab-board"
  tabindex="0"
>
  <!-- Board content -->
</div>
```

#### Modal / Dialog

```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">Create New Task</h2>
  <p id="dialog-description">Fill in the details below to create a new task.</p>
  <!-- Form content -->
  <button aria-label="Close dialog">✕</button>
</div>
```

#### Combobox (Assignee select, Sprint select)

```html
<div role="combobox" aria-expanded="false" aria-haspopup="listbox">
  <input
    aria-autocomplete="list"
    aria-controls="listbox-assignee"
    aria-activedescendant=""
    aria-label="Assignee"
  />
</div>
<ul role="listbox" id="listbox-assignee">
  <li role="option" aria-selected="false" id="option-marcus">
    <img alt="" src="marcus-avatar.jpg" />
    Marcus Lindqvist
  </li>
  <li role="option" aria-selected="true" id="option-priya">
    <img alt="" src="priya-avatar.jpg" />
    Priya Raman
  </li>
</ul>
```

#### Kanban Board (Complex composite widget)

```html
<div role="group" aria-label="Task board: Sprint 14">
  <div role="region" aria-label="Backlog, 6 items">
    <h3>Backlog <span aria-label="6 items">(6)</span></h3>
    <div role="list" aria-label="Backlog tasks">
      <div role="listitem" aria-label="SIO-231, Migrate DB schema, Priority P0, Assigned to Marcus, Due July 10">
        <!-- Card content -->
      </div>
    </div>
  </div>

  <div role="region" aria-label="In Progress, 4 items">
    <h3>In Progress <span aria-label="4 items">(4)</span></h3>
    <div role="list" aria-label="In Progress tasks">
      <!-- Cards -->
    </div>
  </div>
</div>
```

#### Toolbar (Doc editor floating toolbar)

```html
<div role="toolbar" aria-label="Formatting" aria-orientation="horizontal">
  <button aria-label="Bold" aria-pressed="false">
    <strong>B</strong>
  </button>
  <button aria-label="Italic" aria-pressed="false">
    <em>I</em>
  </button>
  <button aria-label="Underline" aria-pressed="false">
    <u>U</u>
  </button>
  <div role="separator" aria-orientation="vertical"></div>
  <button aria-label="Insert link">
    🔗
  </button>
</div>
```

#### Tree (Sidebar navigation)

```html
<nav aria-label="Workspace navigation">
  <ul role="tree">
    <li role="treeitem" aria-expanded="true">
      <span>Engineering</span>
      <ul role="group">
        <li role="treeitem">
          <a href="...">Frontend</a>
          <ul role="group">
            <li role="treeitem">
              <a href="..." aria-current="page">Auth Module</a>
            </li>
          </ul>
        </li>
      </ul>
    </li>
  </ul>
</nav>
```

#### Toast / Alert

```html
<!-- Informational toast (does not interrupt) -->
<div role="status" aria-live="polite">
  Task SIO-245 updated successfully.
</div>

<!-- Error toast (interrupts user) -->
<div role="alert" aria-live="assertive">
  Failed to save changes. Please try again.
</div>

<!-- Progress toast -->
<div role="status" aria-live="polite" aria-busy="true">
  Importing 150 tasks... (42% complete)
</div>
```

#### Drag and Drop (Board card)

```html
<div
  role="listitem"
  draggable="true"
  aria-roledescription="draggable"
  aria-label="SIO-231, Migrate DB schema, in Backlog. Press Space to grab, then arrow keys to move."
  aria-grabbed="false"
>
  <!-- Card content -->
</div>
```

**Screen reader announcement on grab:**
> "Grabbed SIO-231, Migrate DB schema. Use arrow keys to move, Space to drop, Escape to cancel."

**Screen reader announcement on drop:**
> "Dropped SIO-231, Migrate DB schema, in In Progress column."

---

## 6. Screen Reader Support

### 6.1 Screen Reader Testing Matrix

| Screen Reader | Browser | Platform | Priority |
|--------------|---------|----------|----------|
| VoiceOver | Safari | macOS | P0 (primary) |
| NVDA | Firefox | Windows | P0 (primary) |
| TalkBack | Chrome | Android | P1 |
| VoiceOver | Safari | iOS | P1 |

### 6.2 Live Regions

| Context | `aria-live` | `role` | Trigger |
|---------|------------|--------|---------|
| Toast notifications | `polite` | `status` | On toast appearance |
| Error toasts | `assertive` | `alert` | On error |
| Filter results update | `polite` | `status` | On filter change |
| Task count update | `polite` | `status` | On data change |
| Board card moved | `polite` | `status` | On drag-drop complete |
| Loading complete | `polite` | `status` | On skeleton → content transition |
| AI copilot response | `polite` | `log` | On AI message received |
| Form validation error | `assertive` | `alert` | On validation failure |
| Auto-save status | `polite` | `status` | On save complete |

### 6.3 Announcements by User Action

| User Action | Screen Reader Announcement |
|------------|---------------------------|
| Open task detail panel | "Task detail panel opened for SIO-245, Auth refresh token" |
| Close task detail panel | "Task detail panel closed" |
| Move card on board | "SIO-231 moved from Backlog to In Progress" |
| Create new task | "New task created: SIO-255. Title field focused." |
| Delete task | "Task SIO-255 deleted. Undo available." |
| Filter applied | "Filter applied. Showing 3 of 8 tasks." |
| Filter cleared | "All filters cleared. Showing 8 tasks." |
| Tab switch | "Board view selected" / "List view selected" |
| Comment posted | "Comment posted by Sarah." |
| AI suggestion accepted | "AI suggestion accepted. Task updated." |
| Form validation error | "Error: Title is required. Please enter a task title." |
| Command palette result | "3 results found. Type to filter." |
| Onboarding checklist item | "Checklist item completed: Create a task" |

### 6.4 Hidden Content Strategy

| Content | Treatment | Reason |
|---------|-----------|--------|
| Decorative icons | `aria-hidden="true"` | Reduces screen reader noise |
| Decorative avatars | `aria-hidden="true"` | Name is already in adjacent text |
| Duplicate text (icon + label) | Icon `aria-hidden="true"` | Avoid double announcement |
| Drag handles | `aria-hidden="true"` | Purpose communicated via `aria-roledescription` |
| Skeleton placeholders | `aria-hidden="true"` | Loading state communicated via `aria-busy` |
| Empty states | Keep text visible | Provides context to screen reader users |
| Focus-visible outlines | Visible to all users | Screen reader users who also use vision |

### 6.5 Image & Icon Alt Text Rules

| Image Type | Alt Text Strategy | Example |
|-----------|------------------|---------|
| User avatar | `alt=""` (decorative — name is in adjacent text) | `<img alt="" /> Marcus Lindqvist` |
| Status icon (🟢) | `alt=""` + adjacent text "Done" | `<img alt="" /> Done` |
| Empty state illustration | `alt="Illustration of an empty board"` | Descriptive alt |
| Figma embed | `alt="Figma design: Dashboard layout"` | Descriptive alt |
| Attachment thumbnail | `alt="auth-flow-diagram.png"` | Filename as alt |
| Brand logo | `alt="Sprintio"` | Brand name |
| Inline emoji (🔴 P0) | `aria-label="Priority P0"` on parent | Emoji has no meaning alone |

---

## 7. Color & Contrast

### 7.1 Contrast Requirements

| Element Type | Minimum Ratio | Sprintio Target |
|-------------|:-------------:|:---------------:|
| Normal text (<18px) on white | 4.5:1 | 5.0:1+ ✅ |
| Large text (≥18px bold, ≥24px) on white | 3:1 | 5.0:1+ ✅ |
| UI components (borders, icons) on white | 3:1 | 4.0:1+ ✅ |
| Focus indicators | 3:1 | 4.6:1+ ✅ |
| Placeholder text on white | 3:1 | 3.3:1 (large text) ✅ |

### 7.2 Color-Blind Safe Patterns

| Signal | Color | Redundant Indicator |
|--------|-------|-------------------|
| Status: Done | 🟢 Green | Checkmark icon + "Done" text |
| Status: Blocked | 🔴 Red | ⚠️ Warning icon + "Blocked" text |
| Status: In Progress | 🟡 Amber | 🔄 Spinner icon + "In Progress" text |
| Priority: P0 | 🔴 Red | "P0" text label |
| Priority: P1 | 🟡 Amber | "P1" text label |
| Error state | 🔴 Red border | Error icon + text message |
| Success state | 🟢 Green | Checkmark icon + text message |
| Link | Primary blue | Underline on hover/focus |

### 7.3 High Contrast Mode

| OS | Support Level | Implementation |
|----|:------------:|----------------|
| Windows High Contrast Mode | ✅ Full | Uses `forced-colors` media query |
| macOS Increase Contrast | ✅ Full | Uses `prefers-contrast: more` media query |

```css
/* Windows High Contrast Mode */
@media (forced-colors: active) {
  :root {
    --color-border-focus: Highlight;
    --color-text-link: LinkText;
  }

  /* Ensure borders are visible */
  .card,
  .input,
  .button {
    border: 1px solid ButtonText;
  }

  /* Ensure focus ring is visible */
  :focus-visible {
    outline: 2px solid Highlight;
    outline-offset: 2px;
  }
}

/* macOS Increase Contrast */
@media (prefers-contrast: more) {
  :root {
    --color-border-default: var(--color-neutral-400);
    --color-text-muted: var(--color-neutral-600);
    --color-text-tertiary: var(--color-neutral-700);
  }
}
```

---

## 8. Motion & Animation

### 8.1 Reduced Motion Support

Sprintio respects the user's motion preferences via `prefers-reduced-motion`.

| OS Setting | CSS Media Query | Behavior |
|-----------|----------------|----------|
| Windows: "Show animations" off | `prefers-reduced-motion: reduce` | All animations disabled |
| macOS: "Reduce motion" on | `prefers-reduced-motion: reduce` | All animations disabled |
| iOS: "Reduce Motion" on | `prefers-reduced-motion: reduce` | All animations disabled |
| Android: "Remove animations" on | `prefers-reduced-motion: reduce` | All animations disabled |

### 8.2 Animation Inventory

| Animation | Default Duration | Reduced Motion Alternative |
|-----------|:----------------:|---------------------------|
| Page transition (slide) | 200ms ease-out | Instant (no animation) |
| Panel slide-in (task detail) | 250ms ease-out | Instant (no animation) |
| Modal fade-in | 150ms ease-out | Instant (no animation) |
| Dropdown slide-down | 150ms ease-out | Instant (no animation) |
| Toast slide-in (right) | 300ms ease-out | Instant (no animation) |
| Toast fade-out | 200ms ease-in | Instant (no animation) |
| Card drag lift | 150ms ease-out | Instant (no animation) |
| Card drop settle | 200ms ease-out | Instant (no animation) |
| Skeleton shimmer | 1.5s infinite | Static gray (no shimmer) |
| Spinner rotate | 1s linear infinite | Static spinner (no rotation) |
| Focus ring transition | 100ms ease | Instant (no transition) |
| Sidebar expand/collapse | 200ms ease-out | Instant (no animation) |
| Tooltip fade-in | 150ms ease-out | Instant (no animation) |
| Copilot panel slide | 250ms ease-out | Instant (no animation) |
| AI response streaming | Text appears character-by-character | Text appears all at once |
| Progress bar fill | Continuous | Instant (shows final state) |

### 8.3 CSS Implementation

```css
/* Default: all transitions respect motion preference */
*:not([data-no-motion]) {
  transition-duration: 0ms; /* Override for reduced motion */
}

@media (prefers-reduced-motion: no-preference) {
  /* Only apply animations when user has NOT requested reduced motion */
  .panel-slide-in {
    animation: slide-in 250ms ease-out;
  }
  .modal-fade-in {
    animation: fade-in 150ms ease-out;
  }
  .skeleton-shimmer {
    animation: shimmer 1.5s infinite linear;
  }
}

@media (prefers-reduced-motion: reduce) {
  /* Disable all animations */
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Static spinner */
  .spinner {
    animation: none;
    border: 3px solid var(--color-neutral-300);
    border-top-color: var(--color-primary-500);
  }

  /* Static skeleton (no shimmer) */
  .skeleton {
    background: var(--color-neutral-200);
    animation: none;
  }
}
```

### 8.4 No Parallax or Auto-Scroll

| Prohibited Pattern | Reason |
|-------------------|--------|
| Parallax scrolling | Causes vestibular disorders |
| Auto-scrolling carousels | Disorienting; user must control |
| Auto-playing video | Unexpected motion; no autoplay |
| Auto-scrolling to content | User must initiate; provide anchor links instead |
| Flashing content (>3Hz) | May trigger seizures (WCAG 2.3.1) |

---

## 9. Forms & Input Accessibility

### 9.1 Form Label Pattern

Every form input MUST have a visible, associated label.

```html
<!-- Preferred: explicit <label> with htmlFor -->
<label for="task-title">Task title</label>
<input id="task-title" type="text" aria-required="true" />

<!-- Fallback: aria-label when visual label is not possible -->
<input type="text" aria-label="Search tasks" placeholder="Search tasks..." />

<!-- Never: placeholder as only label -->
<!-- ❌ <input type="text" placeholder="Task title" /> -->
```

### 9.2 Required Fields

```html
<div class="form-field">
  <label for="task-title">
    Task title
    <span aria-hidden="true">*</span>
  </label>
  <input
    id="task-title"
    type="text"
    aria-required="true"
    aria-describedby="task-title-hint"
  />
  <span id="task-title-hint" class="hint">
    Required. Max 256 characters.
  </span>
</div>
```

**Screen reader announcement:** "Task title, required, edit text"

### 9.3 Error States

```html
<div class="form-field" aria-invalid="true">
  <label for="task-title">
    Task title
    <span aria-hidden="true">*</span>
  </label>
  <input
    id="task-title"
    type="text"
    aria-required="true"
    aria-invalid="true"
    aria-describedby="task-title-error"
  />
  <span id="task-title-error" class="error" role="alert">
    ⚠ Task title is required. Please enter a title.
  </span>
</div>
```

**Screen reader announcement:** "Task title, required, error, Task title is required. Please enter a title."

### 9.4 Error Summary (Form-Level)

When a form has multiple errors, provide an error summary at the top:

```html
<div role="alert" aria-live="assertive" tabindex="-1" id="error-summary">
  <h3>Please fix 2 errors:</h3>
  <ul>
    <li><a href="#task-title">Task title is required</a></li>
    <li><a href="#due-date">Due date must be in the future</a></li>
  </ul>
</div>
```

### 9.5 Inline Validation Timing

| Validation Type | When to Validate | Pattern |
|----------------|-----------------|---------|
| Required field | On blur (first), then on input | Show error after first blur; clear when corrected |
| Format (email, URL) | On blur | Show error after blur |
| Max length | On input (real-time) | Show character count; warn at 90% |
| Duplicate check | On blur (debounced) | Async check after 300ms pause |
| Async validation | On blur | Show spinner, then result |

### 9.6 Form Accessible Names

| Input | Accessible Name | Method |
|-------|----------------|--------|
| Task title | "Task title" | `<label for>` |
| Task description | "Task description" | `<label for>` or `aria-label` |
| Search (global) | "Search Sprintio" | `aria-label` |
| Search (local) | "Search in [View Name]" | `aria-label` |
| Status dropdown | "Status" | `<label for>` or `aria-label` |
| Priority dropdown | "Priority" | `<label for>` or `aria-label` |
| Assignee dropdown | "Assignee" | `<label for>` or `aria-label` |
| Sprint dropdown | "Sprint" | `<label for>` or `aria-label` |
| Due date picker | "Due date" | `<label for>` or `aria-label` |
| Comment input | "Write a comment" | `aria-label` |
| Copilot input | "Ask AI Copilot" | `aria-label` |
| Filter dropdowns | "Filter by [Filter Name]" | `aria-label` |

---

## 10. Semantic HTML

### 10.1 HTML Element Usage

| Semantic Element | Usage in Sprintio | Anti-Pattern Avoided |
|-----------------|-------------------|---------------------|
| `<header>` | Top bar | `<div class="header">` |
| `<nav>` | Sidebar, top bar nav | `<div class="nav">` |
| `<main>` | Primary content area | `<div class="content">` |
| `<aside>` | Sidebar, copilot panel | `<div class="sidebar">` |
| `<section>` | Board view, list view, settings sections | `<div class="section">` |
| `<article>` | Document editor content | `<div class="doc">` |
| `<footer>` | Page footer | `<div class="footer">` |
| `<h1>`–`<h6>` | Heading hierarchy (never skip levels) | `<div class="heading">` |
| `<ul>` / `<ol>` | Task lists, navigation lists | `<div class="list">` |
| `<table>` | List view (tabular data) | `<div class="table">` |
| `<button>` | All interactive actions | `<div onclick="...">` |
| `<a>` | All navigation links | `<button onclick="navigate()">` |
| `<input>` | All text inputs | `<div contenteditable>` |
| `<form>` | Settings forms, search | `<div>` with manual submit |
| `<label>` | All form labels | `<span>` or `<div>` |

### 10.2 Heading Hierarchy

Every page must have a logical heading hierarchy with no skipped levels:

```
<h1> Page Title (one per page)
  <h2> Section Title
    <h3> Subsection Title
      <h4> Card Title / Group Title
  <h2> Another Section
    <h3> Another Subsection
```

| Page | h1 | h2 | h3 | h4 |
|------|----|----|----|----|
| Board View | Sprint name | Column headers | — | Card title (visually) |
| List View | Sprint/Filter name | Group headers (if grouped) | — | — |
| Task Detail | Task title | Tab labels | — | — |
| Doc Editor | Doc title | Section headings (from content) | — | — |
| Settings | "Settings" | Section names | Form group names | — |
| Onboarding | "Sprintio" | Step title | — | — |

### 10.3 List semantics

| List Type | HTML Element | Usage |
|-----------|-------------|-------|
| Navigation list | `<ul>` + `<li>` + `<a>` | Sidebar nav items |
| Task list (list view) | `<ul role="list">` + `<li role="listitem">` | Rows |
| Board cards (per column) | `<ul role="list">` + `<li role="listitem">` | Cards in column |
| Dropdown options | `<ul role="listbox">` + `<li role="option">` | Select options |
| Comment thread | `<ol>` + `<li>` | Ordered by time |
| Settings nav | `<ul>` + `<li>` + `<a>` | Settings sections |

---

## 11. Testing Strategy

### 11.1 Automated Testing

| Tool | Type | Frequency | Coverage |
|------|------|-----------|----------|
| **axe-core** | Unit/Integration tests | Every PR | All components |
| **axe-playwright** | E2E tests | Every PR | All critical user flows |
| **Lighthouse** | Performance + a11y audit | Weekly | Full application |
| **eslint-plugin-jsx-a11y** | Lint rules | Every keystroke | JSX a11y attributes |

### 11.2 Manual Testing

| Test | Frequency | Performer |
|------|-----------|-----------|
| Keyboard-only navigation (all critical flows) | Every sprint | QA engineer |
| Screen reader testing (VoiceOver + NVDA) | Every sprint | QA engineer |
| Zoom to 200% | Every sprint | QA engineer |
| Windows High Contrast Mode | Every sprint | QA engineer |
| Color contrast spot-check | Every PR | Designer |
| Focus indicator visibility | Every PR | Developer |

### 11.3 Critical User Flows to Test

| Flow | Keyboard Test | Screen Reader Test |
|------|:------------:|:-----------------:|
| Sign up → Onboarding → First task | ✅ | ✅ |
| Navigate sidebar → Open project → View board | ✅ | ✅ |
| Create task → Fill form → Submit | ✅ | ✅ |
| Drag card between columns | ✅ | ✅ |
| Open task detail → Edit fields → Close | ✅ | ✅ |
| Filter tasks → Clear filters | ✅ | ✅ |
| Create document → Write content → Add comments | ✅ | ✅ |
| Use command palette → Execute action | ✅ | ✅ |
| Use AI copilot → NL task creation → Accept | ✅ | ✅ |
| Create automation → Configure trigger → Save | ✅ | ✅ |
| Settings → Change workspace name → Save | ✅ | ✅ |
| Invite team member → Send invite | ✅ | ✅ |

### 11.4 CI/CD Integration

```yaml
# .github/workflows/a11y.yml (example)
name: Accessibility Tests
on: [pull_request]

jobs:
  axe-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Start server
        run: npm run preview &
      - name: Run axe tests
        run: npx playwright test --project=a11y
      - name: Lighthouse a11y audit
        run: npx lhci autorun --assert.assertions.accessibilities.score>=90
```

---

## 12. Accessibility Component Checklist

### 12.1 Atom-Level Checklist

| Component | Keyboard | ARIA | Contrast | Screen Reader |
|-----------|:--------:|:----:|:--------:|:-------------:|
| Button | ✅ Enter/Space | ✅ role, label | ✅ 4.5:1 | ✅ Name announced |
| IconButton | ✅ Enter/Space | ✅ aria-label required | ✅ 4.5:1 | ✅ Label announced |
| Input | ✅ Type, arrows | ✅ label, describedby | ✅ 4.5:1 | ✅ Name + state |
| Textarea | ✅ Type, arrows | ✅ label, describedby | ✅ 4.5:1 | ✅ Name + state |
| Checkbox | ✅ Space to toggle | ✅ role, aria-checked | ✅ 3:1 | ✅ Name + state |
| Radio | ✅ Arrows, Space | ✅ role="radiogroup" | ✅ 3:1 | ✅ Name + value |
| Toggle | ✅ Space to toggle | ✅ role="switch" | ✅ 3:1 | ✅ Name + on/off |
| Select | ✅ Arrows, Enter | ✅ combobox pattern | ✅ 4.5:1 | ✅ Name + value |
| Link | ✅ Enter | ✅ Semantic `<a>` | ✅ 4.5:1 | ✅ Purpose clear |
| Badge | — | ✅ aria-label if needed | ✅ 4.5:1 | ✅ Text content |
| Avatar | — | ✅ alt="" (decorative) | — | ✅ Name in adjacent text |
| Tooltip | ✅ Focus triggers | ✅ aria-describedby | ✅ 4.5:1 | ✅ Description read |
| Toast | — | ✅ role="status/alert" | ✅ 4.5:1 | ✅ Live region |
| Skeleton | — | ✅ aria-hidden="true" | — | ✅ Hidden from SR |
| Spinner | — | ✅ aria-label="Loading" | — | ✅ Loading announced |

### 12.2 Organism-Level Checklist

| Component | Keyboard | ARIA | Contrast | Screen Reader |
|-----------|:--------:|:----:|:--------:|:-------------:|
| TopBar | ✅ Tab navigation | ✅ Landmarks | ✅ | ✅ |
| Sidebar | ✅ Arrow keys, Enter | ✅ Tree pattern | ✅ | ✅ Current page announced |
| BoardView | ✅ Arrow keys, Space/Enter | ✅ Group + list | ✅ | ✅ Column + card announced |
| BoardColumn | ✅ Arrow keys within | ✅ Region + list | ✅ | ✅ "N items" announced |
| BoardCard | ✅ Enter to open, Space to select | ✅ Listitem | ✅ | ✅ Full card info announced |
| ListView | ✅ Arrow keys, Enter | ✅ Table or list | ✅ | ✅ Row info announced |
| TaskDetailPanel | ✅ Tab, Escape | ✅ Complementary | ✅ | ✅ Panel open/close announced |
| MetadataBar | ✅ Tab through fields | ✅ Group | ✅ | ✅ Each field announced |
| DocEditor | ✅ Rich text keys | ✅ Article | ✅ | ✅ Content readable |
| AutomationBuilder | ✅ Tab through cards | ✅ Group | ✅ | ✅ Flow announced |
| CopilotPanel | ✅ Input focus | ✅ Complementary | ✅ | ✅ Messages announced |
| NotificationPanel | ✅ Arrow keys, Enter | ✅ Feed pattern | ✅ | ✅ Notification read |
| OnboardingWizard | ✅ Tab, Enter | ✅ Dialog | ✅ | ✅ Step announced |
| SettingsPage | ✅ Tab navigation | ✅ Landmarks | ✅ | ✅ Section announced |

### 12.3 Accessibility Definition of Done

A component is "a11y done" when:

- [ ] All interactive elements are keyboard operable
- [ ] Focus indicator is visible on every focusable element
- [ ] Focus order matches visual order
- [ ] All form inputs have associated labels
- [ ] All images and icons have appropriate alt text or `aria-hidden`
- [ ] ARIA attributes are correct and complete
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 text, 3:1 UI)
- [ ] Color is never the sole indicator of state
- [ ] Screen reader announces all important state changes
- [ ] No content is inaccessible at 200% zoom
- [ ] No keyboard traps exist
- [ ] axe-core reports zero violations
- [ ] Tested with VoiceOver on macOS
- [ ] Tested with keyboard-only navigation
- [ ] Works with `prefers-reduced-motion: reduce`

---

## Appendix A: Accessibility Glossary

| Term | Definition |
|------|-----------|
| **WCAG** | Web Content Accessibility Guidelines — W3C standard for web accessibility |
| **ARIA** | Accessible Rich Internet Applications — HTML attributes that enhance accessibility of dynamic content |
| **AT** | Assistive Technology — screen readers, magnifiers, switch devices |
| **SR** | Screen Reader — VoiceOver, NVDA, TalkBack |
| **a11y** | Accessibility (11 letters between 'a' and 'y') |
| **VO** | VoiceOver — Apple's built-in screen reader |
| **VPAT** | Voluntary Product Accessibility Template — document reporting accessibility conformance |
| **ACR** | Accessibility Conformance Report — completed VPAT |
| **FOIT** | Flash of Invisible Text — fonts loading slowly, text invisible |
| **FOUT** | Flash of Unstyled Text — system font shows briefly before web font loads |
| **Roving Tabindex** | Pattern where only one item in a group is in the tab order; arrow keys move between items |
| **Live Region** | ARIA region that announces updates to screen readers |
| **Landmark** | HTML5 semantic elements that define page regions for screen reader navigation |

---

> **End of Sprintio UX Documentation Suite**
>
> Documents completed:
> 1. [01-USER-JOURNEY-MAPS.md](./01-USER-JOURNEY-MAPS.md) ✅
> 2. [02-WIREFRAMES.md](./02-WIREFRAMES.md) ✅
> 3. [03-INFORMATION-ARCHITECTURE.md](./03-INFORMATION-ARCHITECTURE.md) ✅
> 4. [04-COMPONENT-HIERARCHY.md](./04-COMPONENT-HIERARCHY.md) ✅
> 5. [05-COLOR-SYSTEM.md](./05-COLOR-SYSTEM.md) ✅
> 6. [06-TYPOGRAPHY.md](./06-TYPOGRAPHY.md) ✅
> 7. [07-RESPONSIVE-STRATEGY.md](./07-RESPONSIVE-STRATEGY.md) ✅
> 8. [08-ACCESSIBILITY.md](./08-ACCESSIBILITY.md) ✅
