# Sprintio — Design Tokens

> Part of the Sprintio Design System
> Version: 1.0 | Date: 2026-07-08
> Three-layer architecture: Primitive → Semantic → Component

---

## Table of Contents

1. [Token Architecture](#1-token-architecture)
2. [Primitive Color Tokens](#2-primitive-color-tokens)
3. [Semantic Color Tokens](#3-semantic-color-tokens)
4. [Component Color Tokens](#4-component-color-tokens)
5. [Typography Tokens](#5-typography-tokens)
6. [Shadow & Elevation Tokens](#6-shadow--elevation-tokens)
7. [Border & Radius Tokens](#7-border--radius-tokens)
8. [Motion Tokens](#8-motion-tokens)
9. [CSS Custom Properties](#9-css-custom-properties)

---

## 1. Token Architecture

### Three-Layer System

```
┌──────────────────────────────────────────────────────────────┐
│  Component Tokens                                             │  --button-bg: var(--color-primary)
│  Per-component overrides                                      │  --card-padding: var(--space-6)
├──────────────────────────────────────────────────────────────┤
│  Semantic Tokens                                              │  --color-primary: var(--color-indigo-500)
│  Purpose-based aliases                                        │  --spacing-section: var(--space-12)
├──────────────────────────────────────────────────────────────┤
│  Primitive Tokens                                             │  --color-indigo-500: #6366F1
│  Raw design values                                            │  --space-4: 1rem
└──────────────────────────────────────────────────────────────┘
```

### Why Three Layers?

| Layer | Purpose | When to Change |
|-------|---------|----------------|
| **Primitive** | Base values (colors, sizes, fonts) | Rarely — foundational |
| **Semantic** | Meaning-based aliases | Theme switching (light ↔ dark) |
| **Component** | Component-specific overrides | Per-component needs |

### Naming Convention

```
--{category}-{item}-{variant}-{state}

Examples:
--color-primary              # category-item
--color-primary-hover        # category-item-state
--button-bg-hover            # component-property-state
--spacing-section-sm         # category-semantic-variant
```

---

## 2. Primitive Color Tokens

### 2.1 Brand — Indigo (Primary)

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-indigo-50` | `#EEF2FF` | 238, 242, 255 | Lightest tint — selected items, hover hints |
| `--color-indigo-100` | `#E0E7FF` | 224, 231, 255 | Light tint — selected row bg, focus rings |
| `--color-indigo-200` | `#C7D2FE` | 199, 210, 254 | Borders on selected items |
| `--color-indigo-300` | `#A5B4FC` | 165, 180, 252 | Disabled interactive borders |
| `--color-indigo-400` | `#818CF8` | 129, 140, 248 | Secondary buttons, icons |
| `--color-indigo-500` | `#6366F1` | 99, 102, 241 | **Primary** — buttons, links, active, focus |
| `--color-indigo-600` | `#4F46E5` | 79, 70, 229 | Primary button hover |
| `--color-indigo-700` | `#4338CA` | 67, 56, 202 | Primary button active/pressed |
| `--color-indigo-800` | `#3730A3` | 55, 48, 163 | Dark text on primary backgrounds |
| `--color-indigo-900` | `#312E81` | 49, 46, 129 | Deepest — dark mode sidebar active |

#### Primary Usage Rules

| Element | Token | Do | Don't |
|---------|-------|----|-------|
| Primary button (default) | `indigo-500` bg, white text | Single most important action per screen | Use for secondary actions |
| Primary button hover | `indigo-600` bg | Darken on hover | Use `indigo-400` (too light) |
| Link text | `indigo-500` | All clickable text links | Use for static text |
| Focus ring | `indigo-500` | 2px offset ring on all interactive elements | Use browser default outline |
| Selected row | `indigo-50` bg | Light background tint | Use `indigo-100` (too strong) |

### 2.2 Accent — Violet (AI Features Only)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-violet-50` | `#F5F3FF` | AI feature background tint |
| `--color-violet-100` | `#EDE9FE` | AI suggestion banner bg |
| `--color-violet-200` | `#E9D5FF` | AI suggestion border |
| `--color-violet-300` | `#C4B5FD` | AI icon secondary |
| `--color-violet-500` | `#8B5CF6` | AI Copilot icon, AI badges |
| `--color-violet-600` | `#7C3AED` | AI action buttons |
| `--color-violet-700` | `#6D28D9` | AI text on light bg |

**Rule:** Violet is reserved exclusively for AI/Copilot features. Never use for standard UI.

### 2.3 Neutral — Grays (UI Backbone)

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-gray-50` | `#F9FAFB` | 249, 250, 251 | Page bg (light mode) |
| `--color-gray-100` | `#F3F4F6` | 243, 244, 246 | Card bg, sidebar bg, input bg |
| `--color-gray-200` | `#E5E7EB` | 229, 231, 235 | Borders, dividers, disabled |
| `--color-gray-300` | `#D1D5DB` | 209, 213, 219 | Skeleton placeholders, muted borders |
| `--color-gray-400` | `#9CA3AF` | 156, 163, 175 | Placeholder text, disabled text, icons |
| `--color-gray-500` | `#6B7280` | 107, 114, 128 | Secondary text, captions, timestamps |
| `--color-gray-600` | `#4B5563` | 75, 85, 99 | Body text (muted), descriptions |
| `--color-gray-700` | `#374151` | 55, 65, 81 | Body text (default), labels |
| `--color-gray-800` | `#1F2937` | 31, 41, 55 | Headings, primary text |
| `--color-gray-900` | `#111827` | 17, 24, 39 | Deepest text, high-contrast headings |

#### Neutral Usage Rules

| Context | Token | Example |
|---------|-------|---------|
| Page background | `gray-50` | Main content area |
| Card/surface | `gray-100` | Task cards, sidebar, panels |
| Borders | `gray-200` | Input borders, dividers, card borders |
| Placeholder | `gray-400` | Input placeholder text |
| Captions | `gray-500` | Timestamps, metadata |
| Body text | `gray-700` | Task descriptions, comments |
| Headings | `gray-900` | Page titles, section headings |

### 2.4 Semantic Status Colors

| Color Family | Purpose | 50 (bg) | 100 (banner) | 200 (border) | 500 (dot/badge) | 600 (text) | 700 (text on bg) |
|-------------|---------|---------|--------------|--------------|-----------------|------------|-------------------|
| **Green** | Success / Done | `#F0FDF4` | `#DCFCE7` | `#BBF7D0` | `#22C55E` | `#16A34A` | `#15803D` |
| **Red** | Error / Blocked / P0 | `#FEF2F2` | `#FEE2E2` | `#FECACA` | `#EF4444` | `#DC2626` | `#B91C1C` |
| **Amber** | Warning / P1 | `#FFFBEB` | `#FEF3C7` | `#FDE68A` | `#F59E0B` | `#D97706` | `#B45309` |
| **Blue** | Info / In Progress | `#EFF6FF` | `#DBEAFE` | `#BFDBFE` | `#3B82F6` | `#2563EB` | `#1D4ED8` |
| **Purple** | AI / Copilot | `#FAF5FF` | `#F3E8FF` | `#E9D5FF` | `#A855F7` | `#9333EA` | `#7E22CE` |

---

## 3. Semantic Color Tokens

These map primitives to purpose. Theme switching = swap these values only.

### 3.1 Backgrounds & Surfaces

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--color-bg-page` | `gray-50` (#F9FAFB) | `#0F172A` (slate-900) | Page background |
| `--color-bg-surface` | `#FFFFFF` | `#1E293B` (slate-800) | Cards, panels, modals |
| `--color-bg-surface-raised` | `#FFFFFF` | `#334155` (slate-700) | Dropdowns, tooltips, popovers |
| `--color-bg-sidebar` | `gray-50` | `#0F172A` | Sidebar background |
| `--color-bg-sidebar-hover` | `gray-100` | `#1E293B` | Sidebar item hover |
| `--color-bg-sidebar-active` | `indigo-100` | `indigo-900` | Sidebar active item |
| `--color-bg-input` | `#FFFFFF` | `#1E293B` | Text inputs |
| `--color-bg-input-disabled` | `gray-100` | `#334155` | Disabled input |
| `--color-bg-overlay` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` | Modal backdrop |

### 3.2 Board & List Surfaces

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--color-bg-board` | `gray-100` | `#0F172A` | Board background (between columns) |
| `--color-bg-column` | `gray-50` | `#1E293B` | Column background |
| `--color-bg-card` | `#FFFFFF` | `#1E293B` | Task card |
| `--color-bg-card-hover` | `gray-50` | `#334155` | Task card hover |
| `--color-bg-card-selected` | `indigo-50` | `indigo-900` | Selected task card |
| `--color-bg-row` | `#FFFFFF` | `#1E293B` | List row |
| `--color-bg-row-hover` | `gray-50` | `#334155` | List row hover |
| `--color-bg-row-selected` | `indigo-50` | `indigo-900` | Selected list row |

### 3.3 Text Colors

| Token | Light Mode | Dark Mode | WCAG Ratio (light) | Usage |
|-------|-----------|-----------|---------------------|-------|
| `--color-text-primary` | `gray-900` (#111827) | `gray-50` (#F9FAFB) | 17.4:1 ✅ AAA | Headings, primary content |
| `--color-text-secondary` | `gray-700` (#374151) | `gray-200` (#E5E7EB) | 11.9:1 ✅ AAA | Body text, descriptions |
| `--color-text-tertiary` | `gray-500` (#6B7280) | `gray-400` (#9CA3AF) | 5.4:1 ✅ AA | Captions, timestamps |
| `--color-text-muted` | `gray-400` (#9CA3AF) | `gray-500` (#6B7280) | 3.3:1 ⚠️ | Placeholder, disabled labels |
| `--color-text-inverse` | `#FFFFFF` | `gray-900` (#111827) | — | Text on colored backgrounds |
| `--color-text-link` | `indigo-600` | `indigo-400` | 5.9:1 ✅ AA | Clickable text links |
| `--color-text-link-hover` | `indigo-700` | `indigo-300` | 7.4:1 ✅ AAA | Link hover state |

### 3.4 Border Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--color-border-default` | `gray-200` (#E5E7EB) | `#334155` (slate-700) | Standard borders: cards, inputs |
| `--color-border-light` | `gray-100` (#F3F4F6) | `#1E293B` (slate-800) | Subtle dividers, section separators |
| `--color-border-strong` | `gray-300` (#D1D5DB) | `#475569` (slate-600) | Emphasized borders, active cards |
| `--color-border-focus` | `indigo-500` | `indigo-500` | Focus ring for interactive elements |
| `--color-border-error` | `red-500` | `red-500` | Error state borders |
| `--color-border-success` | `green-500` | `green-500` | Success state borders |

---

## 4. Component Color Tokens

### 4.1 Buttons

| Element | Background | Border | Text |
|---------|-----------|--------|------|
| Primary (default) | `indigo-500` | none | `text-inverse` |
| Primary (hover) | `indigo-600` | none | `text-inverse` |
| Primary (active) | `indigo-700` | none | `text-inverse` |
| Secondary | `bg-surface` | `border-default` | `text-secondary` |
| Ghost | transparent | none | `text-secondary` |
| Danger | `red-500` | none | `text-inverse` |
| AI Copilot | `violet-500` | none | `text-inverse` |
| Disabled (any) | `gray-100` | `border-default` | `text-muted` |

### 4.2 Inputs

| Element | Background | Border | Text | Ring |
|---------|-----------|--------|------|------|
| Default | `bg-input` | `border-default` | `text-primary` | none |
| Hover | `bg-input` | `border-strong` | `text-primary` | none |
| Focus | `bg-input` | `border-focus` | `text-primary` | `indigo-500` |
| Error | `bg-input` | `border-error` | `text-primary` | `red-500` |
| Disabled | `bg-input-disabled` | `border-default` | `text-muted` | none |

### 4.3 Cards

| Element | Background | Border | Text |
|---------|-----------|--------|------|
| Default | `bg-card` | `border-default` | `text-primary` |
| Hover (interactive) | `bg-card-hover` | `border-strong` | `text-primary` |
| Selected | `bg-card-selected` | `border-focus` | `text-primary` |
| Status left border | — | status color | — |

### 4.4 Status & Priority Colors

| Status | Color | Hex | Badge BG | Badge Text |
|--------|-------|-----|----------|------------|
| Backlog | `gray-400` | `#9CA3AF` | `gray-100` | `gray-700` |
| To Do | `blue-500` | `#3B82F6` | `blue-50` | `blue-700` |
| In Progress | `amber-500` | `#F59E0B` | `amber-50` | `amber-700` |
| In Review | `purple-500` | `#A855F7` | `purple-50` | `purple-700` |
| Done | `green-500` | `#22C55E` | `green-50` | `green-700` |
| Cancelled | `red-500` | `#EF4444` | `red-50` | `red-700` |

### 4.5 Priority Colors

| Priority | Color | Badge BG |
|----------|-------|----------|
| P0 — Critical | `red-500` | `red-50` |
| P1 — High | `amber-500` | `amber-50` |
| P2 — Medium | `yellow-500` | `yellow-50` (`#FEFCE8`) |
| P3 — Low | `blue-500` | `blue-50` |
| P4 — None | `gray-400` | `gray-100` |

### 4.6 Toast Colors

| Type | Background | Border | Text | Icon |
|------|-----------|--------|------|------|
| Success | `green-50` | `green-200` | `green-700` | `green-500` |
| Error | `red-50` | `red-200` | `red-700` | `red-500` |
| Warning | `amber-50` | `amber-200` | `amber-700` | `amber-500` |
| Info | `blue-50` | `blue-200` | `blue-700` | `blue-500` |

### 4.7 Other Components

| Component | Background | Border | Text |
|-----------|-----------|--------|------|
| Tooltip | `gray-800` | none | `text-inverse` |
| Skeleton | `gray-200` | none | — |
| Modal overlay | `bg-overlay` | none | — |
| Modal content | `bg-surface` | `border-default` | `text-primary` |
| Badge (default) | `indigo-500` | none | `text-inverse` |
| Badge (secondary) | `gray-100` | none | `gray-700` |
| Badge (outline) | transparent | `border-default` | `text-primary` |

---

## 5. Typography Tokens

### 5.1 Font Families

| Token | Stack | Usage |
|-------|-------|-------|
| `--font-sans` | `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | All UI text |
| `--font-mono` | `"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Consolas, monospace` | Code, task IDs, terminal |

### 5.2 Type Scale

| Token | Size (px) | Rem | Tailwind | Line Height | Usage |
|-------|-----------|-----|----------|-------------|-------|
| `text-2xs` | 10px | 0.625rem | `text-[10px]` | 16px (1.6) | Badge counts |
| `text-xs` | 12px | 0.75rem | `text-xs` | 16px (1.333) | Captions, timestamps, helper text |
| `text-sm` | 14px | 0.875rem | `text-sm` | 20px (1.429) | Body small, table cells, sidebar |
| `text-base` | 16px | 1rem | `text-base` | 24px (1.5) | **Body text default**, inputs |
| `text-lg` | 18px | 1.125rem | `text-lg` | 28px (1.556) | Card titles, body large |
| `text-xl` | 20px | 1.25rem | `text-xl` | 28px (1.4) | Section headings, panel titles |
| `text-2xl` | 24px | 1.5rem | `text-2xl` | 32px (1.333) | Page titles, h1 headings |
| `text-3xl` | 30px | 1.875rem | `text-3xl` | 36px (1.2) | h1 headings, hero text |
| `text-4xl` | 36px | 2.25rem | `text-4xl` | 40px (1.111) | Marketing (onboarding only) |

#### Mobile Type Scale

| Token | Desktop → Mobile | Delta |
|-------|-----------------|-------|
| `text-sm` | 14px → 13px | -1px |
| `text-base` | 16px → 15px | -1px |
| `text-lg` | 18px → 17px | -1px |
| `text-xl` | 20px → 19px | -1px |
| `text-2xl` | 24px → 22px | -2px |
| `text-3xl` | 30px → 28px | -2px |
| `text-4xl` | 36px → 34px | -2px |

### 5.3 Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `font-normal` | 400 | Body text, descriptions, inputs |
| `font-medium` | 500 | Labels, buttons, nav, table headers |
| `font-semibold` | 600 | Subheadings (h3, h4), card titles |
| `font-bold` | 700 | Page titles (h1, h2) |

### 5.4 Letter Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `tracking-tighter` | -0.05em | Display text only (text-4xl) |
| `tracking-tight` | -0.025em | Headings (text-3xl, text-2xl) |
| `tracking-normal` | 0em | Body text |
| `tracking-wide` | 0.025em | Button text, nav labels |
| `tracking-wider` | 0.05em | All-caps labels |
| `tracking-widest` | 0.1em | Overlines |

### 5.5 Composite Typography Tokens

| Token | Size | Weight | Line Height | Letter Spacing |
|-------|------|--------|-------------|----------------|
| `display-lg` | 36px | 700 | 40px | -0.025em |
| `display-md` | 30px | 700 | 36px | -0.025em |
| `heading-xl` | 24px | 700 | 32px | -0.025em |
| `heading-lg` | 20px | 600 | 28px | -0.025em |
| `heading-md` | 18px | 600 | 28px | 0em |
| `heading-sm` | 16px | 600 | 24px | 0em |
| `body-lg` | 18px | 400 | 28px | 0em |
| `body-md` | 16px | 400 | 24px | 0em |
| `body-sm` | 14px | 400 | 20px | 0em |
| `body-xs` | 12px | 400 | 16px | 0em |
| `label-lg` | 16px | 500 | 24px | 0.025em |
| `label-md` | 14px | 500 | 20px | 0.025em |
| `label-sm` | 12px | 500 | 16px | 0.025em |
| `button-lg` | 16px | 500 | 24px | 0.025em |
| `button-md` | 14px | 500 | 20px | 0.025em |
| `button-sm` | 12px | 500 | 16px | 0.025em |
| `code-md` | 14px | 400 | 20px | 0em |
| `code-sm` | 12px | 400 | 16px | 0em |
| `caption` | 12px | 400 | 16px | 0.025em |
| `overline` | 10px | 500 | 16px | 0.1em |
| `badge-text` | 10px | 600 | 14px | 0.025em |

---

## 6. Shadow & Elevation Tokens

### 6.1 Shadow Scale

| Token | CSS Value | Tailwind | Usage |
|-------|----------|----------|-------|
| `--shadow-none` | `none` | `shadow-none` | — |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | `shadow-sm` | Subtle card lift |
| `--shadow-default` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)` | `shadow` | Default cards |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` | `shadow-md` | Cards on hover, dropdowns |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` | `shadow-lg` | Modals, popovers |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` | `shadow-xl` | Command palette |
| `--shadow-2xl` | `0 25px 50px -12px rgba(0,0,0,0.25)` | `shadow-2xl` | Maximum elevation |
| `--shadow-drag` | `0 12px 24px rgba(0,0,0,0.15)` | custom | Drag ghost |
| `--shadow-inner` | `inset 0 2px 4px 0 rgba(0,0,0,0.05)` | `shadow-inner` | Inset states |

### 6.2 Dark Mode Shadow Adjustments

| Token | Light | Dark |
|-------|-------|------|
| `--shadow-sm` | `rgba(0,0,0, 0.05)` | `rgba(0,0,0, 0.3)` |
| `--shadow-md` | `rgba(0,0,0, 0.1)` | `rgba(0,0,0, 0.4)` |
| `--shadow-lg` | `rgba(0,0,0, 0.1)` | `rgba(0,0,0, 0.4)` |
| `--shadow-xl` | `rgba(0,0,0, 0.1)` | `rgba(0,0,0, 0.4)` |

### 6.3 Elevation Map

```
Level 0:  Page bg              → shadow: none
Level 1:  Card / Panel         → shadow: shadow-sm
Level 2:  Dropdown / Tooltip   → shadow: shadow-md
Level 3:  Modal / Popover      → shadow: shadow-lg
Level 4:  Command Palette      → shadow: shadow-xl
Level 5:  Drag Ghost           → shadow: shadow-drag
```

---

## 7. Border & Radius Tokens

### 7.1 Border Radius

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `--radius-none` | 0 | `rounded-none` | — |
| `--radius-sm` | 2px | `rounded-sm` | Tight elements |
| `--radius-default` | 4px | `rounded` | — |
| `--radius-md` | 6px | `rounded-md` | Inputs, buttons, badges |
| `--radius-lg` | 8px | `rounded-lg` | Cards, dropdowns |
| `--radius-xl` | 12px | `rounded-xl` | Modals |
| `--radius-2xl` | 16px | `rounded-2xl` | — |
| `--radius-full` | 9999px | `rounded-full` | Avatars, pills, dots |

### 7.2 Component → Radius Map

| Component | Radius | Tailwind |
|-----------|--------|----------|
| Button | 6px | `rounded-md` |
| Input | 6px | `rounded-md` |
| Card | 8px | `rounded-lg` |
| Badge | 9999px | `rounded-full` |
| Modal | 12px | `rounded-xl` |
| Dropdown | 8px | `rounded-lg` |
| Tooltip | 6px | `rounded-md` |
| Toast | 8px | `rounded-lg` |
| Avatar (round) | 9999px | `rounded-full` |
| Checkbox | 4px | `rounded` |
| Status dot | 9999px | `rounded-full` |

---

## 8. Motion Tokens

### 8.1 Duration

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 150ms | Hover, focus, color transitions |
| `--duration-normal` | 200ms | Standard transitions |
| `--duration-slow` | 300ms | Panel slide, modal fade |
| `--duration-slower` | 500ms | — |
| `--duration-slowest` | 700ms | Complex animations |

### 8.2 Easing

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | All transitions |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Entering elements |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Exiting elements |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy effects |

### 8.3 Transition Map

| Property | Duration | Easing | Usage |
|----------|----------|--------|-------|
| Color | 150ms | ease-in-out | Text, bg color |
| Background | 150ms | ease-in-out | Button hover, card hover |
| Border | 150ms | ease-in-out | Focus ring |
| Box Shadow | 200ms | ease-out | Card hover lift |
| Transform | 200ms | ease-out | Scale, translate |
| Opacity | 150ms | ease | Fade in/out |
| Width/Height | 300ms | ease-in-out | Panel expand |

---

## 9. CSS Custom Properties

### 9.1 Complete CSS Variables File

```css
/* src/styles/globals.css */

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* ── Primitive: Brand ──────────────────────────────── */
    --color-indigo-50:  #EEF2FF;
    --color-indigo-100: #E0E7FF;
    --color-indigo-200: #C7D2FE;
    --color-indigo-300: #A5B4FC;
    --color-indigo-400: #818CF8;
    --color-indigo-500: #6366F1;
    --color-indigo-600: #4F46E5;
    --color-indigo-700: #4338CA;
    --color-indigo-800: #3730A3;
    --color-indigo-900: #312E81;

    /* ── Primitive: Accent (AI) ────────────────────────── */
    --color-violet-50:  #F5F3FF;
    --color-violet-100: #EDE9FE;
    --color-violet-200: #E9D5FF;
    --color-violet-300: #C4B5FD;
    --color-violet-500: #8B5CF6;
    --color-violet-600: #7C3AED;
    --color-violet-700: #6D28D9;

    /* ── Semantic: shadcn/ui layer ─────────────────────── */
    --background: 236 39% 97%;        /* gray-50 */
    --foreground: 224 71% 4%;         /* gray-900 */
    --card: 0 0% 100%;
    --card-foreground: 224 71% 4%;
    --popover: 0 0% 100%;
    --popover-foreground: 224 71% 4%;
    --primary: 239 84% 67%;           /* indigo-500 */
    --primary-foreground: 0 0% 100%;
    --secondary: 220 14% 96%;         /* gray-100 */
    --secondary-foreground: 224 71% 4%;
    --muted: 220 14% 96%;
    --muted-foreground: 220 9% 46%;   /* gray-500 */
    --accent: 220 14% 96%;
    --accent-foreground: 224 71% 4%;
    --destructive: 0 84% 60%;         /* red-500 */
    --destructive-foreground: 0 0% 100%;

    /* ── Sprintio: Status ──────────────────────────────── */
    --success: 142 71% 45%;           /* green-500 */
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;            /* amber-500 */
    --warning-foreground: 224 71% 4%;
    --error: 0 84% 60%;               /* red-500 */
    --error-foreground: 0 0% 100%;
    --info: 217 91% 60%;              /* blue-500 */
    --info-foreground: 0 0% 100%;

    /* ── Sprintio: AI ──────────────────────────────────── */
    --ai: 263 70% 50%;                /* violet-500 */
    --ai-foreground: 0 0% 100%;

    /* ── Semantic: Borders & Ring ──────────────────────── */
    --border: 220 13% 91%;            /* gray-200 */
    --input: 220 13% 91%;
    --ring: 239 84% 67%;              /* indigo-500 */
    --radius: 0.5rem;

    /* ── Primitive: Shadows ────────────────────────────── */
    --shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg:  0 10px 15px -3px rgba(0, 0, 0, 0.1);
    --shadow-xl:  0 20px 25px -5px rgba(0, 0, 0, 0.1);
    --shadow-drag: 0 12px 24px rgba(0, 0, 0, 0.15);
  }

  .dark {
    --background: 222 47% 6%;         /* slate-900 */
    --foreground: 210 40% 98%;
    --card: 215 25% 17%;              /* slate-800 */
    --card-foreground: 210 40% 98%;
    --popover: 215 25% 17%;
    --popover-foreground: 210 40% 98%;
    --primary: 239 84% 67%;
    --primary-foreground: 0 0% 100%;
    --secondary: 215 25% 17%;
    --secondary-foreground: 210 40% 98%;
    --muted: 215 25% 17%;
    --muted-foreground: 215 20% 55%;
    --accent: 215 25% 17%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 63% 31%;
    --destructive-foreground: 210 40% 98%;
    --success: 142 71% 45%;
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;
    --warning-foreground: 224 71% 4%;
    --error: 0 63% 31%;
    --error-foreground: 210 40% 98%;
    --info: 217 91% 60%;
    --info-foreground: 0 0% 100%;
    --ai: 263 70% 50%;
    --ai-foreground: 0 0% 100%;
    --border: 215 25% 27%;            /* slate-700 */
    --input: 215 25% 27%;
    --ring: 239 84% 67%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}
```

---

> **Next:** [03-TAILWIND-CONFIG.md](./03-TAILWIND-CONFIG.md) — Complete Tailwind CSS configuration
