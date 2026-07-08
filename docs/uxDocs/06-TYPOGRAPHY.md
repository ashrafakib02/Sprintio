# Sprintio — Typography System

> **Sprint fast. Ship together.**
> Document: 06 — Typography System
> Version: 1.0 | Date: 2026-07-08
> Scope: MVP — Font families, type scale, line heights, spacing, and responsive rules

---

## Table of Contents

1. [Typography Principles](#1-typography-principles)
2. [Font Families](#2-font-families)
3. [Type Scale](#3-type-scale)
4. [Line Height Scale](#4-line-height-scale)
5. [Font Weight Scale](#5-font-weight-scale)
6. [Letter Spacing](#6-letter-spacing)
7. [Typography Tokens](#7-typography-tokens)
8. [Component Typography Map](#8-component-typography-map)
9. [Responsive Typography](#9-responsive-typography)
10. [Monospace & Code Typography](#10-monospace--code-typography)
11. [Typography Don'ts](#11-typography-donts)

---

## 1. Typography Principles

| # | Principle | Application |
|---|-----------|-------------|
| T1 | **Two-font system** | Inter for UI, JetBrains Mono for code — nothing else |
| T2 | **Vertical rhythm** | Every line height is a multiple of the 4px base grid |
| T3 | **Progressive hierarchy** | The eye should scan: heading → subheading → body → caption, in that order of visual weight |
| T4 | **Minimum 14px body text** | Never smaller than 14px for any readable content |
| T5 | **Consistent density** | Font sizes and spacing stay the same across light and dark mode |

---

## 2. Font Families

### 2.1 Primary — Inter

| Property | Value | Usage |
|----------|-------|-------|
| Family | `Inter` | All UI text: headings, body, labels, buttons, navigation |
| Fallback | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | System font fallback for performance |
| Source | Google Fonts / self-hosted | Variable font (wght 100–900) |

**Why Inter:**
- Designed specifically for screens at small sizes
- Excellent legibility at 12–16px
- Open counters prevent letters from blurring
- Variable font = one file, all weights

### 2.2 Secondary — JetBrains Mono

| Property | Value | Usage |
|----------|-------|-------|
| Family | `JetBrains Mono` | Code blocks, task identifiers, API references, terminal output |
| Fallback | `"Fira Code", "Cascadia Code", "SF Mono", Consolas, monospace` | System monospace fallback |
| Source | Google Fonts / self-hosted | Variable font (wght 100–800) |

**Why JetBrains Mono:**
- Designed for developers — high legibility in code
- Distinct `0` and `O`, `1` and `l` — critical for task IDs like "SIO-245"
- Ligatures for common code patterns (`=>`, `!==`, `>=`)

### 2.3 Font Loading Strategy

```
1. Preload:  Inter (400, 500, 600, 700) + JetBrains Mono (400, 500)
2. Load:     Inter variable font as primary
3. Fallback: System font stack renders immediately
4. Swap:     Inter replaces system font once loaded (font-display: swap)
5. Cache:    fonts.googleapis.com with 1-year cache header
```

**Font-display:** `swap` for all fonts — prevents invisible text (FOIT).

---

## 3. Type Scale

A modular scale based on a 1.250 (Major Third) ratio, anchored at 16px base.

### 3.1 Desktop Type Scale (≥768px)

| Token | Size | px | Rem | Line Height | Usage |
|-------|------|----|-----|-------------|-------|
| `text-2xs` | 10px | 10 | 0.625 | 16px (1.6) | Badge counts, very small labels |
| `text-xs` | 12px | 12 | 0.75 | 16px (1.333) | Captions, timestamps, helper text |
| `text-sm` | 14px | 14 | 0.875 | 20px (1.429) | Body small, table cells, sidebar items |
| `text-base` | 16px | 16 | 1.0 | 24px (1.5) | **Body text default**, input text |
| `text-lg` | 18px | 18 | 1.125 | 28px (1.556) | Body large, card titles |
| `text-xl` | 20px | 20 | 1.25 | 28px (1.4) | Section headings, panel titles |
| `text-2xl` | 24px | 24 | 1.5 | 32px (1.333) | Page titles, h2 headings |
| `text-3xl` | 30px | 30 | 1.875 | 36px (1.2) | h1 headings, hero text |
| `text-4xl` | 36px | 36 | 2.25 | 40px (1.111) | Marketing headlines (onboarding) |

### 3.2 Mobile Type Scale (<768px)

| Token | Size | px | Rem | Line Height | Notes |
|-------|------|----|-----|-------------|-------|
| `text-2xs` | 10px | 10 | 0.625 | 14px | Same as desktop |
| `text-xs` | 12px | 12 | 0.75 | 16px | Same as desktop |
| `text-sm` | 13px | 13 | 0.8125 | 18px | 1px smaller than desktop |
| `text-base` | 15px | 15 | 0.9375 | 22px | 1px smaller than desktop |
| `text-lg` | 17px | 17 | 1.0625 | 24px | 1px smaller than desktop |
| `text-xl` | 19px | 19 | 1.1875 | 26px | 1px smaller than desktop |
| `text-2xl` | 22px | 22 | 1.375 | 28px | 2px smaller than desktop |
| `text-3xl` | 28px | 28 | 1.75 | 34px | 2px smaller than desktop |
| `text-4xl` | 34px | 34 | 2.125 | 38px | 2px smaller than desktop |

### 3.3 Scale Visualization

```
text-4xl  ████████████████████████████████████████  36px  Marketing / Onboarding
text-3xl  ██████████████████████████████████        30px  h1 Page Title
text-2xl  ████████████████████████████              24px  h2 Section Title
text-xl   ████████████████████████                  20px  h3 / Panel Title
text-lg   ██████████████████████                    18px  Card Title / Body Large
text-base ████████████████████                      16px  Body Text (Default)
text-sm   ██████████████████                        14px  Table Cells / Sidebar
text-xs   ████████████████                          12px  Captions / Timestamps
text-2xs  ██████████████                            10px  Badge Counts
```

---

## 4. Line Height Scale

### 4.1 Line Height Token Map

| Token | Value | Ratio | Usage |
|-------|-------|-------|-------|
| `leading-none` | 1 | 1.0 | Display text only (text-4xl) |
| `leading-tight` | 1.2 | 1.2 | Headings (text-3xl, text-2xl) |
| `leading-snug` | 1.375 | 1.375 | Subheadings, short text |
| `leading-normal` | 1.5 | 1.5 | **Body text default** |
| `leading-relaxed` | 1.625 | 1.625 | Long-form reading, doc content |
| `leading-loose` | 2 | 2.0 | Sparse content, captions |

### 4.2 Line Height by Context

| Context | Token | Rationale |
|---------|-------|-----------|
| Page title (text-3xl) | `leading-tight` (1.2) | Large text needs tighter spacing |
| Section heading (text-2xl) | `leading-tight` (1.2) | Same reason |
| Subheading (text-xl) | `leading-snug` (1.375) | Moderate density |
| Card title (text-lg) | `leading-snug` (1.375) | Compact display |
| Body text (text-base) | `leading-normal` (1.5) | Optimal readability for paragraphs |
| Doc content (text-base) | `leading-relaxed` (1.625) | Long-form reading comfort |
| Table cells (text-sm) | `leading-normal` (1.5) | Compact but readable |
| Captions (text-xs) | `leading-normal` (1.5) | Small but clear |
| Badge count (text-2xs) | `leading-none` (1) | Single character, no wrap |

---

## 5. Font Weight Scale

### 5.1 Weight Token Map

| Token | Value | CSS | Usage |
|-------|-------|-----|-------|
| `font-thin` | 100 | `font-weight: 100` | ❌ Not used in UI |
| `font-extralight` | 200 | `font-weight: 200` | ❌ Not used in UI |
| `font-light` | 300 | `font-weight: 300` | ❌ Not used in UI |
| `font-regular` | 400 | `font-weight: 400` | **Body text**, descriptions, comments, inputs |
| `font-medium` | 500 | `font-weight: 500` | **Labels**, buttons, navigation, table headers |
| `font-semibold` | 600 | `font-weight: 600` | **Headings** (h3, h4), card titles, emphasis |
| `font-bold` | 700 | `font-weight: 700` | **Page titles** (h1, h2), strong emphasis |
| `font-extrabold` | 800 | `font-weight: 800` | ❌ Not used in UI |
| `font-black` | 900 | `font-weight: 900` | ❌ Not used in UI |

### 5.2 Weight Usage Map

| Element | Weight | Token |
|---------|--------|-------|
| h1 (page title) | Bold | `font-bold` (700) |
| h2 (section title) | Bold | `font-bold` (700) |
| h3 (subsection) | Semibold | `font-semibold` (600) |
| h4 (card title) | Semibold | `font-semibold` (600) |
| Body text | Regular | `font-regular` (400) |
| Button text | Medium | `font-medium` (500) |
| Input text | Regular | `font-regular` (400) |
| Input label | Medium | `font-medium` (500) |
| Navigation item | Medium | `font-medium` (500) |
| Table header | Medium | `font-medium` (500) |
| Table cell | Regular | `font-regular` (400) |
| Badge/label text | Medium | `font-medium` (500) |
| Caption/timestamp | Regular | `font-regular` (400) |
| Task identifier (SIO-245) | Medium | `font-medium` (500) |
| Code text | Regular | `font-regular` (400) (JetBrains Mono) |
| Placeholder text | Regular | `font-regular` (400) |

---

## 6. Letter Spacing

### 6.1 Letter Spacing Token Map

| Token | Value | Usage |
|-------|-------|-------|
| `tracking-tighter` | -0.05em | Large display text (text-4xl only) |
| `tracking-tight` | -0.025em | Headings (text-3xl, text-2xl) |
| `tracking-normal` | 0em | **Body text default** |
| `tracking-wide` | 0.025em | Button text, navigation labels |
| `tracking-wider` | 0.05em | All-caps labels, overlines |
| `tracking-widest` | 0.1em | Small-caps, very small all-caps text |

### 6.2 Letter Spacing by Context

| Context | Token | Example |
|---------|-------|---------|
| Page title | `tracking-tight` | "Board View" |
| Section heading | `tracking-tight` | "Sprint 14 — Engineering" |
| Body text | `tracking-normal` | Task descriptions, comments |
| Button | `tracking-wide` | "Create Task" |
| Navigation | `tracking-wide` | "Home", "Docs", "Automations" |
| Badge count | `tracking-normal` | "3", "12" |
| All-caps label | `tracking-wider` | "IN PROGRESS", "P0 CRITICAL" |
| Overline | `tracking-widest` | "SPRINT 14" |

---

## 7. Typography Tokens

### 7.1 Composite Typography Tokens

Each token combines size, weight, line height, and letter spacing into a single reusable class.

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| `display-lg` | 36px | 700 | 40px | -0.025em | Onboarding hero text |
| `display-md` | 30px | 700 | 36px | -0.025em | Empty state headings |
| `heading-xl` | 24px | 700 | 32px | -0.025em | h1 — page titles |
| `heading-lg` | 20px | 600 | 28px | -0.025em | h2 — section titles |
| `heading-md` | 18px | 600 | 28px | 0em | h3 — subsection titles |
| `heading-sm` | 16px | 600 | 24px | 0em | h4 — card titles, panel titles |
| `body-lg` | 18px | 400 | 28px | 0em | Large body text (doc content) |
| `body-md` | 16px | 400 | 24px | 0em | **Default body text** |
| `body-sm` | 14px | 400 | 20px | 0em | Table cells, sidebar items |
| `body-xs` | 12px | 400 | 16px | 0em | Captions, timestamps |
| `label-lg` | 16px | 500 | 24px | 0.025em | Section labels |
| `label-md` | 14px | 500 | 20px | 0.025em | Input labels, form labels |
| `label-sm` | 12px | 500 | 16px | 0.025em | Small labels, filter chips |
| `button-lg` | 16px | 500 | 24px | 0.025em | Large buttons |
| `button-md` | 14px | 500 | 20px | 0.025em | Default buttons |
| `button-sm` | 12px | 500 | 16px | 0.025em | Small buttons, icon buttons |
| `code-md` | 14px | 400 | 20px | 0em | Inline code, identifiers |
| `code-sm` | 12px | 400 | 16px | 0em | Code blocks, terminal |
| `caption` | 12px | 400 | 16px | 0.025em | Timestamps, helper text |
| `overline` | 10px | 500 | 16px | 0.1em | Section overlines, ALL-CAPS labels |
| `badge` | 10px | 600 | 14px | 0.025em | Badge counts, small indicators |

### 7.2 CSS Implementation

```css
/* Typography Token Classes */
.display-lg   { font-size: 2.25rem; font-weight: 700; line-height: 1.111; letter-spacing: -0.025em; }
.display-md   { font-size: 1.875rem; font-weight: 700; line-height: 1.2; letter-spacing: -0.025em; }
.heading-xl   { font-size: 1.5rem; font-weight: 700; line-height: 1.333; letter-spacing: -0.025em; }
.heading-lg   { font-size: 1.25rem; font-weight: 600; line-height: 1.4; letter-spacing: -0.025em; }
.heading-md   { font-size: 1.125rem; font-weight: 600; line-height: 1.556; letter-spacing: 0em; }
.heading-sm   { font-size: 1rem; font-weight: 600; line-height: 1.5; letter-spacing: 0em; }
.body-lg      { font-size: 1.125rem; font-weight: 400; line-height: 1.556; letter-spacing: 0em; }
.body-md      { font-size: 1rem; font-weight: 400; line-height: 1.5; letter-spacing: 0em; }
.body-sm      { font-size: 0.875rem; font-weight: 400; line-height: 1.429; letter-spacing: 0em; }
.body-xs      { font-size: 0.75rem; font-weight: 400; line-height: 1.333; letter-spacing: 0em; }
.label-lg     { font-size: 1rem; font-weight: 500; line-height: 1.5; letter-spacing: 0.025em; }
.label-md     { font-size: 0.875rem; font-weight: 500; line-height: 1.429; letter-spacing: 0.025em; }
.label-sm     { font-size: 0.75rem; font-weight: 500; line-height: 1.333; letter-spacing: 0.025em; }
.button-lg    { font-size: 1rem; font-weight: 500; line-height: 1.5; letter-spacing: 0.025em; }
.button-md    { font-size: 0.875rem; font-weight: 500; line-height: 1.429; letter-spacing: 0.025em; }
.button-sm    { font-size: 0.75rem; font-weight: 500; line-height: 1.333; letter-spacing: 0.025em; }
.code-md      { font-family: "JetBrains Mono", monospace; font-size: 0.875rem; font-weight: 400; line-height: 1.429; }
.code-sm      { font-family: "JetBrains Mono", monospace; font-size: 0.75rem; font-weight: 400; line-height: 1.333; }
.caption      { font-size: 0.75rem; font-weight: 400; line-height: 1.333; letter-spacing: 0.025em; }
.overline     { font-size: 0.625rem; font-weight: 500; line-height: 1.6; letter-spacing: 0.1em; text-transform: uppercase; }
.badge-text   { font-size: 0.625rem; font-weight: 600; line-height: 1.4; letter-spacing: 0.025em; }
```

---

## 8. Component Typography Map

### 8.1 App Shell

| Element | Token | Font | Size | Weight | Color Token |
|---------|-------|------|------|--------|-------------|
| Logo text "Sprintio" | `heading-md` | Inter | 18px | 600 | `text-primary` |
| Sidebar section label | `overline` | Inter | 10px | 500 | `text-muted` |
| Sidebar nav item | `label-md` | Inter | 14px | 500 | `text-secondary` |
| Sidebar nav item (active) | `label-md` | Inter | 14px | 500 | `primary-600` |
| Sidebar task count | `badge-text` | Inter | 10px | 600 | `text-tertiary` |
| Search placeholder | `body-sm` | Inter | 14px | 400 | `text-muted` |
| Top bar user name | `label-md` | Inter | 14px | 500 | `text-secondary` |

### 8.2 Board View

| Element | Token | Font | Size | Weight | Color Token |
|---------|-------|------|------|--------|-------------|
| Sprint title | `heading-lg` | Inter | 20px | 600 | `text-primary` |
| View toggle label | `label-md` | Inter | 14px | 500 | `text-secondary` |
| Column header | `label-md` | Inter | 14px | 500 | `text-secondary` |
| Column item count | `body-xs` | Inter | 12px | 400 | `text-tertiary` |
| Card task ID | `code-md` | JetBrains Mono | 14px | 500 | `text-tertiary` |
| Card title | `body-sm` | Inter | 14px | 400 | `text-primary` |
| Card priority | `badge-text` | Inter | 10px | 600 | status color |
| Card due date | `body-xs` | Inter | 12px | 400 | `text-tertiary` |
| Card label text | `label-sm` | Inter | 12px | 500 | label color |
| "Add task" button | `label-md` | Inter | 14px | 500 | `text-tertiary` |

### 8.3 List View

| Element | Token | Font | Size | Weight | Color Token |
|---------|-------|------|------|--------|-------------|
| Table header | `label-md` | Inter | 14px | 500 | `text-secondary` |
| Task identifier | `code-md` | JetBrains Mono | 14px | 500 | `text-tertiary` |
| Task title | `body-sm` | Inter | 14px | 400 | `text-primary` |
| Status text | `label-sm` | Inter | 12px | 500 | status color |
| Priority badge | `badge-text` | Inter | 10px | 600 | priority color |
| Due date | `body-xs` | Inter | 12px | 400 | `text-tertiary` |
| Due date (overdue) | `body-xs` | Inter | 12px | 400 | `red-500` |
| Footer count | `body-xs` | Inter | 12px | 400 | `text-tertiary` |

### 8.4 Task Detail Panel

| Element | Token | Font | Size | Weight | Color Token |
|---------|-------|------|------|--------|-------------|
| Task ID | `code-md` | JetBrains Mono | 14px | 500 | `text-tertiary` |
| Task title | `heading-md` | Inter | 18px | 600 | `text-primary` |
| Metadata label | `label-sm` | Inter | 12px | 500 | `text-tertiary` |
| Metadata value | `body-sm` | Inter | 14px | 400 | `text-primary` |
| Tab label | `label-md` | Inter | 14px | 500 | `text-secondary` |
| Tab label (active) | `label-md` | Inter | 14px | 500 | `primary-600` |
| Description text | `body-md` | Inter | 16px | 400 | `text-secondary` |
| Comment author | `label-md` | Inter | 14px | 500 | `text-primary` |
| Comment timestamp | `caption` | Inter | 12px | 400 | `text-tertiary` |
| Comment body | `body-sm` | Inter | 14px | 400 | `text-secondary` |
| Comment input | `body-sm` | Inter | 14px | 400 | `text-primary` |
| Activity log text | `body-xs` | Inter | 12px | 400 | `text-tertiary` |
| AI suggestion confidence | `label-sm` | Inter | 12px | 500 | `purple-600` |
| Subtask text | `body-sm` | Inter | 14px | 400 | `text-secondary` |
| Subtask text (done) | `body-sm` | Inter | 14px | 400 | `text-muted` + strikethrough |

### 8.5 Document Editor

| Element | Token | Font | Size | Weight | Color Token |
|---------|-------|------|------|--------|-------------|
| Doc title | `heading-xl` | Inter | 24px | 700 | `text-primary` |
| Doc status badge | `label-sm` | Inter | 12px | 500 | status color |
| H1 in doc | `heading-xl` | Inter | 24px | 700 | `text-primary` |
| H2 in doc | `heading-lg` | Inter | 20px | 600 | `text-primary` |
| H3 in doc | `heading-md` | Inter | 18px | 600 | `text-primary` |
| Body paragraph | `body-md` | Inter | 16px | 400 | `text-secondary` |
| Code block | `code-md` | JetBrains Mono | 14px | 400 | `text-primary` on `neutral-100` bg |
| Inline code | `code-md` | JetBrains Mono | 14px | 400 | `primary-600` on `primary-50` bg |
| Wiki-link | `body-md` | Inter | 16px | 500 | `primary-600` with underline |
| Outline item | `body-xs` | Inter | 12px | 400 | `text-tertiary` |
| Outline item (active) | `body-xs` | Inter | 12px | 500 | `primary-600` |
| Version entry name | `label-sm` | Inter | 12px | 500 | `text-primary` |
| Version entry time | `caption` | Inter | 12px | 400 | `text-tertiary` |
| Slash command label | `label-md` | Inter | 14px | 500 | `text-primary` |
| Slash command description | `body-xs` | Inter | 12px | 400 | `text-tertiary` |

### 8.6 AI Copilot Panel

| Element | Token | Font | Size | Weight | Color Token |
|---------|-------|------|------|--------|-------------|
| Panel title | `heading-sm` | Inter | 16px | 600 | `text-primary` |
| AI message body | `body-sm` | Inter | 14px | 400 | `text-secondary` |
| User message body | `body-sm` | Inter | 14px | 400 | `text-primary` |
| AI suggestion label | `label-sm` | Inter | 12px | 500 | `purple-600` |
| AI parsed field key | `label-sm` | Inter | 12px | 500 | `text-tertiary` |
| AI parsed field value | `body-sm` | Inter | 14px | 400 | `text-primary` |
| Confidence percentage | `label-sm` | Inter | 12px | 600 | `purple-600` |
| Input placeholder | `body-sm` | Inter | 14px | 400 | `text-muted` |
| Keyboard hint | `caption` | Inter | 12px | 400 | `text-muted` |

### 8.7 Onboarding

| Element | Token | Font | Size | Weight | Color Token |
|---------|-------|------|------|--------|-------------|
| Logo | `heading-lg` | Inter | 20px | 600 | `primary-600` |
| Tagline | `body-lg` | Inter | 18px | 400 | `text-tertiary` |
| Step indicator | `label-md` | Inter | 14px | 500 | `text-secondary` |
| Step title | `heading-lg` | Inter | 20px | 600 | `text-primary` |
| Step description | `body-md` | Inter | 16px | 400 | `text-secondary` |
| Template card title | `label-md` | Inter | 14px | 500 | `text-primary` |
| Template card description | `body-xs` | Inter | 12px | 400 | `text-tertiary` |

### 8.8 Notifications

| Element | Token | Font | Size | Weight | Color Token |
|---------|-------|------|------|--------|-------------|
| Group header ("Today") | `overline` | Inter | 10px | 500 | `text-muted` |
| Notification message | `body-sm` | Inter | 14px | 400 | `text-primary` |
| Notification task reference | `code-md` | JetBrains Mono | 14px | 500 | `text-tertiary` |
| Notification timestamp | `caption` | Inter | 12px | 400 | `text-tertiary` |
| Badge count | `badge-text` | Inter | 10px | 600 | `text-inverse` on `red-500` |

### 8.9 Settings

| Element | Token | Font | Size | Weight | Color Token |
|---------|-------|------|------|--------|-------------|
| Page title | `heading-xl` | Inter | 24px | 700 | `text-primary` |
| Section heading | `heading-md` | Inter | 18px | 600 | `text-primary` |
| Settings nav item | `label-md` | Inter | 14px | 500 | `text-secondary` |
| Settings nav item (active) | `label-md` | Inter | 14px | 500 | `primary-600` |
| Form label | `label-md` | Inter | 14px | 500 | `text-secondary` |
| Form input text | `body-sm` | Inter | 14px | 400 | `text-primary` |
| Form helper text | `caption` | Inter | 12px | 400 | `text-tertiary` |
| Form error text | `caption` | Inter | 12px | 400 | `red-600` |
| Member name | `body-sm` | Inter | 14px | 500 | `text-primary` |
| Member email | `body-xs` | Inter | 12px | 400 | `text-tertiary` |
| Role badge | `label-sm` | Inter | 12px | 500 | `neutral-500` |

---

## 9. Responsive Typography

### 9.1 Breakpoint Behavior

| Breakpoint | Width | Type Scale | Notes |
|-----------|-------|-----------|-------|
| Desktop XL | ≥1440px | Full desktop scale | — |
| Desktop | 1024–1439px | Full desktop scale | — |
| Tablet | 768–1023px | Full desktop scale | Same sizes, tighter spacing |
| Mobile | <768px | Mobile scale (1–2px smaller) | Heading sizes drop more aggressively |

### 9.2 Responsive Typography Rules

| Rule | Desktop | Tablet | Mobile |
|------|---------|--------|--------|
| Page title (h1) | 24px / 32px LH | 24px / 32px LH | 22px / 28px LH |
| Section title (h2) | 20px / 28px LH | 20px / 28px LH | 19px / 26px LH |
| Subsection (h3) | 18px / 28px LH | 18px / 28px LH | 17px / 24px LH |
| Body text | 16px / 24px LH | 16px / 24px LH | 15px / 22px LH |
| Small body | 14px / 20px LH | 14px / 20px LH | 13px / 18px LH |
| Caption | 12px / 16px LH | 12px / 16px LH | 12px / 16px LH |
| Task card title | 14px / 20px LH | 14px / 20px LH | 14px / 20px LH (no change) |

### 9.3 Mobile Typography Adjustments

```
Mobile-specific rules:
├── Max content width: 100vw (no horizontal scroll)
├── Body text max-width: none (full width, natural wrap)
├── Heading max-width: none
├── Code blocks: horizontal scroll, no font size reduction
├── Table cells: truncate with ellipsis, no wrap
├── Doc editor: full-width, comfortable reading width (max-width: 720px centered)
└── Onboarding text: slightly smaller headings, same body text
```

### 9.4 Content Width Constraints

| Context | Max Width | Rationale |
|---------|-----------|-----------|
| Doc editor content | 720px (centered) | Optimal reading width (~65–75 characters per line) |
| Task description | 100% of panel (60% of viewport) | Panel context, not standalone reading |
| Settings forms | 600px (centered) | Form usability at comfortable width |
| Onboarding modal | 560px (centered) | Focused wizard, not overwhelming |
| Command palette | 560px (centered) | Quick scan, not deep reading |
| Copilot panel | 320px (fixed) | Narrow sidebar, compact text |
| Board card | 100% of column width | Constrained by column |

---

## 10. Monospace & Code Typography

### 10.1 Code Font Stack

```css
--font-mono: "JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
```

### 10.2 Code Typography Tokens

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `code-inline` | 14px | 400 | 1.429 | Inline code in text: `variable` |
| `code-block` | 14px | 400 | 1.6 | Code blocks in doc editor |
| `code-identifier` | 14px | 500 | 1.429 | Task IDs: SIO-245 |
| `code-small` | 12px | 400 | 1.333 | Small code snippets, terminal output |

### 10.3 Code Rendering Rules

| Rule | Implementation |
|------|---------------|
| Inline code background | `primary-50` (light) / `neutral-800` (dark) |
| Inline code border | `primary-200` (light) / `neutral-700` (dark) |
| Inline code border-radius | 4px |
| Inline code padding | 2px 6px |
| Code block background | `neutral-100` (light) / `neutral-900` (dark) |
| Code block padding | 16px |
| Code block border-radius | 8px |
| Code block overflow | horizontal scroll |
| Code block line numbers | Optional, `text-muted` color, right-aligned |
| Ligatures | Enabled for `=>`, `!==`, `>=`, `<=`, `===` |
| Task identifier (SIO-245) | `code-identifier` token, clickable, primary-600 text on hover |

---

## 11. Typography Don'ts

### 11.1 Anti-Patterns

| ❌ Don't | ✅ Do Instead |
|---------|-------------|
| Use more than 2 font families | Inter + JetBrains Mono only |
| Go below 12px for any interactive text | 12px minimum for buttons, labels, navigation |
| Use bold (700) for body text | Reserve bold for headings; use semibold (600) for emphasis |
| Use ALL-CAPS for body text or labels longer than 3 words | ALL-CAPS only for short overlines: "IN PROGRESS", "P0" |
| Use italic for emphasis in UI text | Use semibold (600) for emphasis; italic only in doc editor content |
| Use underlined text for non-links | Underline only for clickable links |
| Mix font weights within a single element | One weight per text node |
| Use `text-4xl` (36px) outside onboarding/marketing | Max heading size in app is `text-2xl` (24px) |
| Set custom line-heights per element | Use composite tokens (heading-lg, body-md) that include line height |
| Apply letter-spacing to body text | Letter spacing is only for headings (tight) and labels (wide) |

### 11.2 Common Mistakes

| Mistake | Why It's Wrong | Fix |
|---------|---------------|-----|
| Using 13px body text on desktop | Falls between standard sizes, feels unintentional | Use 14px (text-sm) or 16px (text-base) |
| Centering multi-line body text | Left-aligned is faster to read for >2 lines | Left-align all body text |
| Justifying text | Creates uneven word spacing, hurts readability | Left-align, never justify |
| Using font-weight: 300 (light) | Too thin on most screens, accessibility risk | Minimum weight: 400 (regular) |
| Adding text-shadow to headings | Dated look, reduces legibility | Flat text, use color contrast for emphasis |
| Using 100% opacity white on dark bg for body | Too harsh, eye strain | Use neutral-200 or neutral-300 for body on dark |

---

## Appendix A: Typography CSS Variables

```css
:root {
  /* Font Families */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;

  /* Font Sizes */
  --text-2xs: 0.625rem;   /* 10px */
  --text-xs:  0.75rem;    /* 12px */
  --text-sm:  0.875rem;   /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg:  1.125rem;   /* 18px */
  --text-xl:  1.25rem;    /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */

  /* Font Weights */
  --font-regular: 400;
  --font-medium:  500;
  --font-semibold: 600;
  --font-bold:    700;

  /* Line Heights */
  --leading-none:    1;
  --leading-tight:   1.2;
  --leading-snug:    1.375;
  --leading-normal:  1.5;
  --leading-relaxed: 1.625;
  --leading-loose:   2;

  /* Letter Spacing */
  --tracking-tighter: -0.05em;
  --tracking-tight:   -0.025em;
  --tracking-normal:  0em;
  --tracking-wide:    0.025em;
  --tracking-wider:   0.05em;
  --tracking-widest:  0.1em;
}

/* Mobile Overrides */
@media (max-width: 767px) {
  :root {
    --text-sm:  0.8125rem;  /* 13px */
    --text-base: 0.9375rem; /* 15px */
    --text-lg:  1.0625rem;  /* 17px */
    --text-xl:  1.1875rem;  /* 19px */
    --text-2xl: 1.375rem;   /* 22px */
    --text-3xl: 1.75rem;    /* 28px */
    --text-4xl: 2.125rem;   /* 34px */
  }
}
```

---

> **Next Document:** [07-RESPONSIVE-STRATEGY.md](./07-RESPONSIVE-STRATEGY.md) — Breakpoint system, layout adaptation, touch targets, and mobile-first patterns
