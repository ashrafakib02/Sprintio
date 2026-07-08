# Sprintio — Color System

> **Sprint fast. Ship together.**
> Document: 05 — Color System
> Version: 1.0 | Date: 2026-07-08
> Scope: MVP — Complete palette, semantic tokens, dark mode, usage guidelines

---

## Table of Contents

1. [Color System Principles](#1-color-system-principles)
2. [Brand Colors](#2-brand-colors)
3. [Primary Scale](#3-primary-scale)
4. [Neutral Scale](#4-neutral-scale)
5. [Semantic Colors](#5-semantic-colors)
6. [Surface & Background Colors](#6-surface--background-colors)
7. [Text Colors](#7-text-colors)
8. [Border & Divider Colors](#8-border--divider-colors)
9. [Status & Priority Colors](#9-status--priority-colors)
10. [Label Colors](#10-label-colors)
11. [Dark Mode Mapping](#11-dark-mode-mapping)
12. [Color Usage by Component](#12-color-usage-by-component)
13. [Contrast & Accessibility](#13-contrast--accessibility)
14. [Color Don'ts](#14-color-donts)

---

## 1. Color System Principles

| # | Principle | Application |
|---|-----------|-------------|
| C1 | **Token-first, never raw** | Every color reference uses a semantic token (`--color-primary-600`), never a hex literal in component code |
| C2 | **One brand accent** | Sprintio has one brand color (indigo). Every other color is functional. Brand color appears ≤15% of any screen |
| C3 | **Status colors are sacred** | Red = danger/blocker. Amber = warning/P1. Green = success/done. Blue = info/link. These never change |
| C4 | **Neutral dominance** | 70%+ of every screen is neutral grays. Color is used sparingly to draw attention, not to decorate |
| C5 | **Dark mode = same tokens, different values** | Component code never changes for dark mode; only CSS custom property values swap |

---

## 2. Brand Colors

The Sprintio brand identity is built on a single primary accent — a modern indigo-violet that communicates intelligence, focus, and velocity.

### 2.1 Brand Palette

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        SPRINTIO BRAND COLORS                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  PRIMARY (Indigo)                                                        │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│  │████████│ │████████│ │████████│ │████████│ │████████│ │████████│    │
│  │████████│ │████████│ │████████│ │████████│ │████████│ │████████│    │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘    │
│   50          100         300         500         600         700        │
│   #EEF2FF    #E0E7FF    #A5B4FC    #6366F1    #4F46E5    #4338CA    │
│                                                                           │
│  ACCENT (Violet) — used for AI features only                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│  │████████│ │████████│ │████████│ │████████│ │████████│ │████████│    │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘    │
│   50          100         300         500         600         700        │
│   #F5F3FF    #EDE9FE    #C4B5FD    #8B5CF6    #7C3AED    #6D28D9    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Primary Scale

Full 10-step indigo scale. Used for interactive elements, links, and brand emphasis.

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-primary-50` | `#EEF2FF` | 238, 242, 255 | Lightest tint — background for selected items, hover hints |
| `--color-primary-100` | `#E0E7FF` | 224, 231, 255 | Light tint — selected row background, focus rings |
| `--color-primary-200` | `#C7D2FE` | 199, 210, 254 | Borders on selected items |
| `--color-primary-300` | `#A5B4FC` | 165, 180, 252 | Disabled interactive borders |
| `--color-primary-400` | `#818CF8` | 129, 140, 248 | Secondary buttons, icons |
| `--color-primary-500` | `#6366F1` | 99, 102, 241 | **Primary** — buttons, links, active states, focus rings |
| `--color-primary-600` | `#4F46E5` | 79, 70, 229 | Primary button hover |
| `--color-primary-700` | `#4338CA` | 67, 56, 202 | Primary button active/pressed |
| `--color-primary-800` | `#3730A3` | 55, 48, 163 | Dark text on primary backgrounds |
| `--color-primary-900` | `#312E81` | 49, 46, 129 | Deepest — unused in MVP |

### 3.1 Primary Usage Rules

| Element | Token | Do | Don't |
|---------|-------|----|-------|
| Primary button (default) | `primary-500` bg, white text | Use for the single most important action per screen | Use for secondary actions |
| Primary button hover | `primary-600` bg | Darken on hover | Use `primary-400` (too light) |
| Link text | `primary-500` | Use for all clickable text links | Use for static text |
| Focus ring | `primary-500` | 2px offset ring on all interactive elements | Use browser default outline |
| Selected row | `primary-50` bg | Light background tint | Use `primary-100` (too strong) |
| Icon accent | `primary-500` | For the one brand-colored icon per section | Color every icon |

---

## 4. Neutral Scale

The backbone of the UI. Grays that work in both light and dark modes.

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-neutral-50` | `#F9FAFB` | 249, 250, 251 | Page background (light mode) |
| `--color-neutral-100` | `#F3F4F6` | 243, 244, 246 | Card backgrounds, sidebar bg, input bg |
| `--color-neutral-200` | `#E5E7EB` | 229, 231, 235 | Borders, dividers, disabled elements |
| `--color-neutral-300` | `#D1D5DB` | 209, 213, 219 | Skeleton placeholders, muted borders |
| `--color-neutral-400` | `#9CA3AF` | 156, 163, 175 | Placeholder text, disabled text, icons |
| `--color-neutral-500` | `#6B7280` | 107, 114, 128 | Secondary text, captions, timestamps |
| `--color-neutral-600` | `#4B5563` | 75, 85, 99 | Body text (muted), descriptions |
| `--color-neutral-700` | `#374151` | 55, 65, 81 | Body text (default), labels |
| `--color-neutral-800` | `#1F2937` | 31, 41, 55 | Headings, primary text |
| `--color-neutral-900` | `#111827` | 17, 24, 39 | Deepest text, high-contrast headings |

### 4.1 Neutral Usage Rules

| Context | Token | Example |
|---------|-------|---------|
| Page background | `neutral-50` | Main content area |
| Card/surface | `neutral-100` | Task cards, sidebar, panels |
| Borders | `neutral-200` | Input borders, dividers, card borders |
| Placeholder | `neutral-400` | Input placeholder text |
| Captions | `neutral-500` | Timestamps, metadata, "Showing 5 of 10" |
| Body text | `neutral-700` | Task descriptions, comments |
| Headings | `neutral-900` | Page titles, section headings |

---

## 5. Semantic Colors

Colors that communicate meaning. Used for status, feedback, and system states.

### 5.1 Green (Success / Done / Positive)

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-green-50` | `#F0FDF4` | 240, 253, 244 | Success background tint |
| `--color-green-100` | `#DCFCE7` | 220, 252, 231 | Success banner bg |
| `--color-green-200` | `#BBF7D0` | 187, 247, 208 | Success border |
| `--color-green-500` | `#22C55E` | 34, 197, 94 | Status "Done", success toasts, positive indicators |
| `--color-green-600` | `#16A34A` | 22, 163, 74 | Success text on light bg, "Approved" doc status |
| `--color-green-700` | `#15803D` | 21, 128, 61 | Dark green text on success backgrounds |

### 5.2 Red (Danger / Error / Blocked / Critical)

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-red-50` | `#FEF2F2` | 254, 242, 242 | Error background tint |
| `--color-red-100` | `#FEE2E2` | 254, 226, 226 | Error banner bg |
| `--color-red-200` | `#FECACA` | 254, 202, 202 | Error border |
| `--color-red-500` | `#EF4444` | 239, 68, 68 | Status "Blocked", error toasts, P0 priority, overdue |
| `--color-red-600` | `#DC2626` | 220, 38, 38 | Error text, destructive action text |
| `--color-red-700` | `#B91C1C` | 185, 28, 28 | Dark red text on error backgrounds |

### 5.3 Amber (Warning / P1 / Attention)

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-amber-50` | `#FFFBEB` | 255, 251, 235 | Warning background tint |
| `--color-amber-100` | `#FEF3C7` | 254, 243, 199 | Warning banner bg |
| `--color-amber-200` | `#FDE68A` | 253, 230, 138 | Warning border |
| `--color-amber-500` | `#F59E0B` | 245, 158, 11 | P1 priority, warning toasts, WIP limit warnings |
| `--color-amber-600` | `#D97706` | 217, 119, 6 | Warning text |
| `--color-amber-700` | `#B45309` | 180, 83, 9 | Dark amber text on warning backgrounds |

### 5.4 Blue (Info / Link / In Progress)

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-blue-50` | `#EFF6FF` | 239, 246, 255 | Info background tint |
| `--color-blue-100` | `#DBEAFE` | 219, 234, 254 | Info banner bg |
| `--color-blue-200` | `#BFDBFE` | 191, 219, 254 | Info border |
| `--color-blue-500` | `#3B82F6` | 59, 130, 246 | Status "In Progress", info toasts, secondary links |
| `--color-blue-600` | `#2563EB` | 37, 99, 235 | Link hover, info text |
| `--color-blue-700` | `#1D4ED8` | 29, 78, 216 | Active link text |

### 5.5 Purple (AI / Copilot)

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-purple-50` | `#FAF5FF` | 250, 245, 255 | AI feature background tint |
| `--color-purple-100` | `#F3E8FF` | 243, 232, 255 | AI suggestion banner bg |
| `--color-purple-200` | `#E9D5FF` | 233, 213, 255 | AI suggestion border |
| `--color-purple-500` | `#A855F7` | 168, 85, 247 | AI Copilot icon, AI badges, AI-generated indicators |
| `--color-purple-600` | `#9333EA` | 147, 51, 234 | AI action buttons |
| `--color-purple-700` | `#7E22CE` | 126, 34, 206 | AI text on light backgrounds |

---

## 6. Surface & Background Colors

The layering system that creates depth and hierarchy.

### 6.1 Light Mode Surfaces

| Token | Hex | Usage | Elevation |
|-------|-----|-------|-----------|
| `--color-bg-page` | `#F9FAFB` (neutral-50) | Page background | 0 |
| `--color-bg-surface` | `#FFFFFF` | Cards, panels, modals | 1 |
| `--color-bg-surface-raised` | `#FFFFFF` | Dropdowns, tooltips, popovers | 2 |
| `--color-bg-sidebar` | `#F9FAFB` | Sidebar background | 0 |
| `--color-bg-sidebar-hover` | `#F3F4F6` | Sidebar item hover | — |
| `--color-bg-sidebar-active` | `#E0E7FF` (primary-100) | Sidebar active item | — |
| `--color-bg-input` | `#FFFFFF` | Text inputs, textareas | — |
| `--color-bg-input-disabled` | `#F3F4F6` | Disabled input | — |
| `--color-bg-overlay` | `rgba(0, 0, 0, 0.5)` | Modal backdrop, panel overlay | — |

### 6.2 Light Mode Surfaces — Board / List

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg-board` | `#F3F4F6` (neutral-100) | Board background (between columns) |
| `--color-bg-column` | `#F9FAFB` (neutral-50) | Column background |
| `--color-bg-card` | `#FFFFFF` | Task card background |
| `--color-bg-card-hover` | `#F9FAFB` | Task card hover |
| `--color-bg-card-selected` | `#EEF2FF` (primary-50) | Selected task card |
| `--color-bg-row` | `#FFFFFF` | List row background |
| `--color-bg-row-hover` | `#F9FAFB` | List row hover |
| `--color-bg-row-selected` | `#EEF2FF` (primary-50) | Selected list row |
| `--color-bg-row-stripe` | `#F9FAFB` | Alternating row stripe (optional) |

---

## 7. Text Colors

### 7.1 Text Color Scale

| Token | Hex | Usage | WCAG on White |
|-------|-----|-------|---------------|
| `--color-text-primary` | `#111827` (neutral-900) | Headings, primary content, titles | 17.4:1 ✅ AAA |
| `--color-text-secondary` | `#374151` (neutral-700) | Body text, descriptions, comments | 11.9:1 ✅ AAA |
| `--color-text-tertiary` | `#6B7280` (neutral-500) | Captions, timestamps, metadata | 5.4:1 ✅ AA |
| `--color-text-muted` | `#9CA3AF` (neutral-400) | Placeholder text, disabled labels | 3.3:1 ⚠️ Large text only |
| `--color-text-inverse` | `#FFFFFF` | Text on dark/colored backgrounds | — |
| `--color-text-link` | `#4F46E5` (primary-600) | Clickable text links | 5.9:1 ✅ AA |
| `--color-text-link-hover` | `#4338CA` (primary-700) | Link hover state | 7.4:1 ✅ AAA |
| `--color-text-success` | `#16A34A` (green-600) | Success messages, done labels | 5.0:1 ✅ AA |
| `--color-text-error` | `#DC2626` (red-600) | Error messages, validation | 5.5:1 ✅ AA |
| `--color-text-warning` | `#D97706` (amber-600) | Warning messages | 4.6:1 ✅ AA |
| `--color-text-info` | `#2563EB` (blue-600) | Info messages | 5.8:1 ✅ AA |
| `--color-text-ai` | `#7E22CE` (purple-700) | AI-generated content labels | 8.0:1 ✅ AAA |

---

## 8. Border & Divider Colors

### 8.1 Border Scale

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-border-default` | `#E5E7EB` (neutral-200) | Standard borders: cards, inputs, dividers |
| `--color-border-light` | `#F3F4F6` (neutral-100) | Subtle dividers, section separators |
| `--color-border-strong` | `#D1D5DB` (neutral-300) | Emphasized borders: focused inputs, active cards |
| `--color-border-focus` | `#6366F1` (primary-500) | Focus ring for interactive elements |
| `--color-border-error` | `#EF4444` (red-500) | Error state borders |
| `--color-border-success` | `#22C55E` (green-500) | Success state borders |

### 8.2 Border Usage Rules

| Context | Token | Thickness | Radius |
|---------|-------|-----------|--------|
| Card | `border-default` | 1px | 8px |
| Input (default) | `border-default` | 1px | 6px |
| Input (focus) | `border-focus` | 2px | 6px |
| Input (error) | `border-error` | 1px | 6px |
| Button (secondary) | `border-default` | 1px | 6px |
| Modal | `border-default` | 1px | 12px |
| Sidebar | `border-light` | 1px (right) | 0 |
| Table row | `border-light` | 1px (bottom) | 0 |
| Dropdown | `border-default` | 1px | 8px |
| Tooltip | `border-default` | 1px | 6px |

---

## 9. Status & Priority Colors

### 9.1 Task Status Colors

| Status | Color Token | Hex | Dot | Usage |
|--------|-------------|-----|-----|-------|
| **Backlog** | `neutral-400` | `#9CA3AF` | ⚪ Gray | Default / not started |
| **To Do** | `blue-500` | `#3B82F6` | 🔵 Blue | Ready to start |
| **In Progress** | `amber-500` | `#F59E0B` | 🟡 Amber | Actively being worked on |
| **In Review** | `purple-500` | `#A855F7` | 🟣 Purple | Awaiting review |
| **Done** | `green-500` | `#22C55E` | 🟢 Green | Completed |
| **Cancelled** | `red-500` | `#EF4444` | 🔴 Red | No longer relevant |

### 9.2 Priority Colors

| Priority | Color Token | Hex | Badge | Badge BG |
|----------|-------------|-----|-------|----------|
| **P0 — Critical** | `red-500` | `#EF4444` | 🔴 P0 | `red-50` |
| **P1 — High** | `amber-500` | `#F59E0B` | 🟡 P1 | `amber-50` |
| **P2 — Medium** | `yellow-500` | `#EAB308` | 🟨 P2 | `yellow-50` (`#FEFCE8`) |
| **P3 — Low** | `blue-500` | `#3B82F6` | 🔵 P3 | `blue-50` |
| **P4 — None** | `neutral-400` | `#9CA3AF` | ⚪ P4 | `neutral-100` |

### 9.3 Status Color Usage Map

| Where | How Status Color Appears |
|-------|-------------------------|
| Board column header | Colored dot + text label |
| Board card | Left border accent (2px solid) |
| List view status cell | Colored dot + text label |
| Task detail status badge | Colored background badge |
| Notification indicator | Colored dot |
| Onboarding checklist | Green check on complete |

---

## 10. Label Colors

User-assignable label colors for workspace-specific categorization.

### 10.1 Label Color Palette (12 Options)

| Label | Hex | Example Usage |
|-------|-----|---------------|
| 🔵 Blue | `#3B82F6` | "frontend" |
| 🟢 Green | `#22C55E` | "backend" |
| 🟡 Yellow | `#EAB308` | "design" |
| 🟠 Orange | `#F97316` | "devops" |
| 🔴 Red | `#EF4444` | "incident" |
| 🟣 Purple | `#A855F7` | "feature" |
| 🩷 Pink | `#EC4899` | "bug" |
| 🩵 Cyan | `#06B6D4` | "documentation" |
| 🫒 Olive | `#84CC16` | "testing" |
| 🩶 Gray | `#6B7280` | "tech-debt" |
| 🤎 Brown | `#92400E` | "research" |
| ⬛ Black | `#1F2937` | "security" |

### 10.2 Label Display Rules

| Element | Appearance |
|---------|-----------|
| Board card | Small colored dot (6px) + text label |
| List row | Colored pill badge (dot + label text) |
| Task detail | Colored pill badge with × remove button |
| Filter | Colored dot in filter dropdown |
| Label picker | Grid of colored dots; click to select/deselect |

---

## 11. Dark Mode Mapping

Dark mode swaps CSS custom property values; component code never changes.

### 11.1 Dark Mode Token Mapping

| Light Token | Light Value | Dark Token | Dark Value |
|-------------|-------------|------------|------------|
| `--color-bg-page` | `#F9FAFB` | `--color-bg-page` | `#0F172A` (slate-900) |
| `--color-bg-surface` | `#FFFFFF` | `--color-bg-surface` | `#1E293B` (slate-800) |
| `--color-bg-surface-raised` | `#FFFFFF` | `--color-bg-surface-raised` | `#334155` (slate-700) |
| `--color-bg-sidebar` | `#F9FAFB` | `--color-bg-sidebar` | `#0F172A` (slate-900) |
| `--color-bg-sidebar-hover` | `#F3F4F6` | `--color-bg-sidebar-hover` | `#1E293B` (slate-800) |
| `--color-bg-sidebar-active` | `#E0E7FF` | `--color-bg-sidebar-active` | `#312E81` (primary-900) |
| `--color-bg-input` | `#FFFFFF` | `--color-bg-input` | `#1E293B` (slate-800) |
| `--color-bg-card` | `#FFFFFF` | `--color-bg-card` | `#1E293B` (slate-800) |
| `--color-bg-card-hover` | `#F9FAFB` | `--color-bg-card-hover` | `#334155` (slate-700) |
| `--color-bg-card-selected` | `#EEF2FF` | `--color-bg-card-selected` | `#312E81` (primary-900) |
| `--color-bg-overlay` | `rgba(0,0,0,0.5)` | `--color-bg-overlay` | `rgba(0,0,0,0.7)` |
| `--color-text-primary` | `#111827` | `--color-text-primary` | `#F9FAFB` (neutral-50) |
| `--color-text-secondary` | `#374151` | `--color-text-secondary` | `#E5E7EB` (neutral-200) |
| `--color-text-tertiary` | `#6B7280` | `--color-text-tertiary` | `#9CA3AF` (neutral-400) |
| `--color-text-muted` | `#9CA3AF` | `--color-text-muted` | `#6B7280` (neutral-500) |
| `--color-text-link` | `#4F46E5` | `--color-text-link` | `#818CF8` (primary-400) |
| `--color-border-default` | `#E5E7EB` | `--color-border-default` | `#334155` (slate-700) |
| `--color-border-light` | `#F3F4F6` | `--color-border-light` | `#1E293B` (slate-800) |
| `--color-border-strong` | `#D1D5DB` | `--color-border-strong` | `#475569` (slate-600) |

### 11.2 Dark Mode — Colors That Do NOT Change

| Color | Reason |
|-------|--------|
| Status colors (red, amber, green, blue, purple) | Semantic meaning is invariant |
| Priority colors | Same reason — universal signal |
| Label colors | User-chosen; must be consistent |
| Brand primary-500 (`#6366F1`) | Brand identity |
| White text on dark backgrounds | Already accessible |

### 11.3 Dark Mode — Surface Elevation System

```
Level 0:  Page bg        → #0F172A (darkest)
Level 1:  Card bg        → #1E293B (one step lighter)
Level 2:  Dropdown bg    → #334155 (two steps lighter)
Level 3:  Tooltip bg     → #475569 (three steps lighter)

Depth is communicated by lightness, NOT by box-shadow.
Box-shadow is removed in dark mode — use brightness steps instead.
```

---

## 12. Color Usage by Component

### 12.1 Component → Color Token Map

| Component | Background | Border | Text | Accent |
|-----------|-----------|--------|------|--------|
| **Primary Button** | `primary-500` | none | `text-inverse` | — |
| **Primary Button Hover** | `primary-600` | none | `text-inverse` | — |
| **Secondary Button** | `bg-surface` | `border-default` | `text-secondary` | — |
| **Ghost Button** | transparent | none | `text-secondary` | — |
| **Danger Button** | `red-500` | none | `text-inverse` | — |
| **Input (default)** | `bg-input` | `border-default` | `text-primary` | — |
| **Input (focus)** | `bg-input` | `border-focus` | `text-primary` | `primary-500` ring |
| **Input (error)** | `bg-input` | `border-error` | `text-primary` | `red-500` ring |
| **Input (disabled)** | `bg-input-disabled` | `border-default` | `text-muted` | — |
| **Card (task)** | `bg-card` | `border-default` | `text-primary` | status-colored left border |
| **Card (hover)** | `bg-card-hover` | `border-strong` | `text-primary` | — |
| **Card (selected)** | `bg-card-selected` | `border-focus` | `text-primary` | `primary-500` left border |
| **Sidebar item** | transparent | none | `text-secondary` | — |
| **Sidebar item (hover)** | `bg-sidebar-hover` | none | `text-primary` | — |
| **Sidebar item (active)** | `bg-sidebar-active` | none | `primary-600` | `primary-500` left indicator |
| **Badge (status)** | status-colored bg | none | status-colored text | status dot |
| **Badge (count)** | `primary-100` | none | `primary-700` | — |
| **Badge (label)** | label-colored bg | none | label-colored text | label dot |
| **Toast (success)** | `green-50` | `green-200` | `green-700` | `green-500` icon |
| **Toast (error)** | `red-50` | `red-200` | `red-700` | `red-500` icon |
| **Toast (warning)** | `amber-50` | `amber-200` | `amber-700` | `amber-500` icon |
| **Toast (info)** | `blue-50` | `blue-200` | `blue-700` | `blue-500` icon |
| **Copilot panel** | `bg-surface` | left: `border-default` | `text-primary` | `purple-500` accent |
| **Modal overlay** | `bg-overlay` | none | — | — |
| **Modal content** | `bg-surface` | `border-default` | `text-primary` | — |
| **Skeleton** | `neutral-200` | none | — | — |
| **Tooltip** | `neutral-800` | none | `text-inverse` | — |

### 12.2 Board View — Color Flow

```
Board Background:     neutral-100 (#F3F4F6)
Column Background:    neutral-50  (#F9FAFB)
Card Background:      white       (#FFFFFF)
Card Border:          neutral-200 (#E5E7EB)

Card Left Border (by status):
  Backlog:     neutral-400 (#9CA3AF)
  In Progress: amber-500   (#F59E0B)
  In Review:   purple-500  (#A855F7)
  Done:        green-500   (#22C55E)

Card Hover:    neutral-50 bg, neutral-300 border
Card Selected: primary-50 bg, primary-500 border

Drag Ghost:    white bg, primary-200 border, shadow-xl, scale(1.02)
Drop Zone:     primary-100 bg, primary-300 dashed border
```

### 12.3 List View — Color Flow

```
Table Background:     white (#FFFFFF)
Table Header:         neutral-50 bg, neutral-700 text, neutral-200 border-bottom
Table Row:            white bg, neutral-200 border-bottom
Table Row Hover:      neutral-50 bg
Table Row Selected:   primary-50 bg, primary-200 border-left

Alternating Stripe:   (disabled in MVP — solid white rows)

Status Dots:          (matches status color table above)
Priority Badges:      (matches priority color table above)
Due Date:             neutral-500 text, red-500 text if overdue
```

---

## 13. Contrast & Accessibility

### 13.1 WCAG 2.1 AA Compliance Matrix

| Foreground | Background | Ratio | Normal Text | Large Text | UI Components |
|-----------|-----------|-------|:-----------:|:----------:|:-------------:|
| `text-primary` (#111827) | white (#FFFFFF) | 17.4:1 | ✅ AAA | ✅ AAA | ✅ |
| `text-secondary` (#374151) | white (#FFFFFF) | 11.9:1 | ✅ AAA | ✅ AAA | ✅ |
| `text-tertiary` (#6B7280) | white (#FFFFFF) | 5.4:1 | ✅ AA | ✅ AA | ✅ |
| `text-muted` (#9CA3AF) | white (#FFFFFF) | 3.3:1 | ❌ | ✅ AA | ❌ |
| `text-inverse` (#FFFFFF) | `primary-500` (#6366F1) | 4.6:1 | ✅ AA | ✅ AA | ✅ |
| `text-inverse` (#FFFFFF) | `primary-600` (#4F46E5) | 6.1:1 | ✅ AA | ✅ AA | ✅ |
| `text-inverse` (#FFFFFF) | `red-500` (#EF4444) | 4.0:1 | ⚠️ Large | ✅ AA | ✅ |
| `text-inverse` (#FFFFFF) | `green-500` (#22C55E) | 3.2:1 | ❌ | ⚠️ Large | ⚠️ |
| `text-inverse` (#FFFFFF) | `amber-500` (#F59E0B) | 2.5:1 | ❌ | ❌ | ❌ |
| `green-600` (#16A34A) | white (#FFFFFF) | 5.0:1 | ✅ AA | ✅ AA | ✅ |
| `red-600` (#DC2626) | white (#FFFFFF) | 5.5:1 | ✅ AA | ✅ AA | ✅ |
| `amber-600` (#D97706) | white (#FFFFFF) | 4.6:1 | ✅ AA | ✅ AA | ✅ |
| `blue-600` (#2563EB) | white (#FFFFFF) | 5.8:1 | ✅ AA | ✅ AA | ✅ |

### 13.2 Accessibility Rules

| Rule | Implementation |
|------|---------------|
| **Never use color alone to convey meaning** | Status indicators always include text label + icon + color dot |
| **4.5:1 minimum for normal text** | All body text, labels, and captions meet AA |
| **3:1 minimum for large text (18px+ bold, 24px+ regular)** | All headings meet AA |
| **3:1 minimum for UI components** | Focus rings, borders, icons meet AA against their backgrounds |
| **Focus ring visibility** | 2px `primary-500` ring with 2px offset — visible on both light and dark backgrounds |
| **Link distinction** | Links are always `primary-600` + underline on hover (never color alone) |
| **Error messages** | Always include `red-500` icon + `red-600` text + error description |
| **Status colors in text** | Always paired with a text label: "Done" with green dot, never green dot alone |

### 13.3 Color-Blind Safe Design

| Color Pair | Risk | Mitigation |
|-----------|------|------------|
| Red ↔ Green | Deuteranopia/Protanopia | Status uses dot + text label; never color-only |
| Red ↔ Amber | Tritanopia | Different brightness + different icons |
| Blue ↔ Purple | Tritanopia | Used in different contexts (info vs AI); rarely adjacent |
| Green ↔ Blue | Tritanopia | Different shapes: checkmark vs circle |

---

## 14. Color Don'ts

### 14.1 Anti-Patterns to Avoid

| ❌ Don't | ✅ Do Instead |
|---------|-------------|
| Use brand purple for buttons, cards, or decorative elements | Reserve purple-500 exclusively for AI-related features |
| Use `text-muted` (#9CA3AF) for required labels | Use `text-tertiary` (#6B7280) minimum for readable text |
| Put white text on `amber-500` background | Use amber-700 text on amber-50 background for readable labels |
| Use red for non-critical warnings | Use amber for warnings; reserve red for errors and blockers |
| Apply gradient backgrounds to cards | Use solid neutral-50 or white backgrounds for readability |
| Use colored backgrounds for entire pages | Page backgrounds are always neutral-50 (light) or slate-900 (dark) |
| Color-code without text labels | Always pair color with text: "🔴 P0 Critical" not just "🔴" |
| Use more than 3 accent colors per screen | One brand (indigo), one semantic (status), one neutral — that's it |
| Hard-code hex values in components | Always reference CSS custom property tokens |
| Change border-radius per component | Use consistent radius: 6px inputs, 8px cards, 12px modals |

### 14.2 Color Density Limits

| Screen Area | Max % Colored | Rationale |
|-------------|:------------:|-----------|
| Page background | 0% | Always neutral |
| Sidebar | 5% | Only active indicator + workspace icon |
| Board / List | 15% | Status dots + priority badges + labels |
| Task detail panel | 20% | Metadata badges + status + priority |
| Doc editor | 5% | Status badge + link color only |
| Empty states | 10% | Illustration accent only |
| Onboarding | 15% | Progress bar + template highlights |

---

## Appendix A: CSS Custom Property Definitions

### Light Mode (Default)

```css
:root {
  /* Brand */
  --color-primary-50:  #EEF2FF;
  --color-primary-100: #E0E7FF;
  --color-primary-200: #C7D2FE;
  --color-primary-300: #A5B4FC;
  --color-primary-400: #818CF8;
  --color-primary-500: #6366F1;
  --color-primary-600: #4F46E5;
  --color-primary-700: #4338CA;
  --color-primary-800: #3730A3;
  --color-primary-900: #312E81;

  /* Accent (AI) */
  --color-accent-50:   #F5F3FF;
  --color-accent-100:  #EDE9FE;
  --color-accent-300:  #C4B5FD;
  --color-accent-500:  #8B5CF6;
  --color-accent-600:  #7C3AED;
  --color-accent-700:  #6D28D9;

  /* Neutral */
  --color-neutral-50:  #F9FAFB;
  --color-neutral-100: #F3F4F6;
  --color-neutral-200: #E5E7EB;
  --color-neutral-300: #D1D5DB;
  --color-neutral-400: #9CA3AF;
  --color-neutral-500: #6B7280;
  --color-neutral-600: #4B5563;
  --color-neutral-700: #374151;
  --color-neutral-800: #1F2937;
  --color-neutral-900: #111827;

  /* Semantic — Green */
  --color-green-50:  #F0FDF4;
  --color-green-100: #DCFCE7;
  --color-green-200: #BBF7D0;
  --color-green-500: #22C55E;
  --color-green-600: #16A34A;
  --color-green-700: #15803D;

  /* Semantic — Red */
  --color-red-50:  #FEF2F2;
  --color-red-100: #FEE2E2;
  --color-red-200: #FECACA;
  --color-red-500: #EF4444;
  --color-red-600: #DC2626;
  --color-red-700: #B91C1C;

  /* Semantic — Amber */
  --color-amber-50:  #FFFBEB;
  --color-amber-100: #FEF3C7;
  --color-amber-200: #FDE68A;
  --color-amber-500: #F59E0B;
  --color-amber-600: #D97706;
  --color-amber-700: #B45309;

  /* Semantic — Blue */
  --color-blue-50:  #EFF6FF;
  --color-blue-100: #DBEAFE;
  --color-blue-200: #BFDBFE;
  --color-blue-500: #3B82F6;
  --color-blue-600: #2563EB;
  --color-blue-700: #1D4ED8;

  /* Semantic — Purple (AI) */
  --color-purple-50:  #FAF5FF;
  --color-purple-100: #F3E8FF;
  --color-purple-200: #E9D5FF;
  --color-purple-500: #A855F7;
  --color-purple-600: #9333EA;
  --color-purple-700: #7E22CE;

  /* Surface */
  --color-bg-page:             var(--color-neutral-50);
  --color-bg-surface:          #FFFFFF;
  --color-bg-surface-raised:   #FFFFFF;
  --color-bg-sidebar:          var(--color-neutral-50);
  --color-bg-sidebar-hover:    var(--color-neutral-100);
  --color-bg-sidebar-active:   var(--color-primary-100);
  --color-bg-input:            #FFFFFF;
  --color-bg-input-disabled:   var(--color-neutral-100);
  --color-bg-overlay:          rgba(0, 0, 0, 0.5);

  /* Text */
  --color-text-primary:    var(--color-neutral-900);
  --color-text-secondary:  var(--color-neutral-700);
  --color-text-tertiary:   var(--color-neutral-500);
  --color-text-muted:      var(--color-neutral-400);
  --color-text-inverse:    #FFFFFF;
  --color-text-link:       var(--color-primary-600);
  --color-text-link-hover: var(--color-primary-700);

  /* Borders */
  --color-border-default:  var(--color-neutral-200);
  --color-border-light:    var(--color-neutral-100);
  --color-border-strong:   var(--color-neutral-300);
  --color-border-focus:    var(--color-primary-500);
  --color-border-error:    var(--color-red-500);
  --color-border-success:  var(--color-green-500);

  /* Shadows */
  --shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg:  0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl:  0 20px 25px -5px rgba(0, 0, 0, 0.1);
  --shadow-drag: 0 12px 24px rgba(0, 0, 0, 0.15);
}
```

### Dark Mode

```css
[data-theme="dark"] {
  --color-bg-page:             #0F172A;
  --color-bg-surface:          #1E293B;
  --color-bg-surface-raised:   #334155;
  --color-bg-sidebar:          #0F172A;
  --color-bg-sidebar-hover:    #1E293B;
  --color-bg-sidebar-active:   var(--color-primary-900);
  --color-bg-input:            #1E293B;
  --color-bg-input-disabled:   #334155;
  --color-bg-overlay:          rgba(0, 0, 0, 0.7);

  --color-text-primary:    #F9FAFB;
  --color-text-secondary:  #E5E7EB;
  --color-text-tertiary:   #9CA3AF;
  --color-text-muted:      #6B7280;
  --color-text-inverse:    #111827;
  --color-text-link:       var(--color-primary-400);
  --color-text-link-hover: var(--color-primary-300);

  --color-border-default:  #334155;
  --color-border-light:    #1E293B;
  --color-border-strong:   #475569;

  --shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg:  0 10px 15px -3px rgba(0, 0, 0, 0.4);
  --shadow-xl:  0 20px 25px -5px rgba(0, 0, 0, 0.4);
  --shadow-drag: 0 12px 24px rgba(0, 0, 0, 0.5);
}
```

---

> **Next Document:** [06-TYPOGRAPHY.md](./06-TYPOGRAPHY.md) — Font families, type scale, line heights, and responsive typography rules
