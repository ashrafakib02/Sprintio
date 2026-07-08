# Sprintio — Spacing System

> Part of the Sprintio Design System
> Version: 1.0 | Date: 2026-07-08
> 4px base grid · 24 tokens · Mobile-first

---

## Table of Contents

1. [Base Grid](#1-base-grid)
2. [Spacing Scale](#2-spacing-scale)
3. [Semantic Spacing Tokens](#3-semantic-spacing-tokens)
4. [Element Spacing Map](#4-element-spacing-map)
5. [Layout Spacing Patterns](#5-layout-spacing-patterns)
6. [Responsive Spacing](#6-responsive-spacing)
7. [Don'ts](#7-donts)

---

## 1. Base Grid

**4px base unit.** Every spacing value in Sprintio is a multiple of 4px. This creates visual rhythm, alignment consistency, and predictable layouts across all components and screens.

```
4px grid:
████  = 4px   (1 unit)
████████████████  = 16px  (4 units)
████████████████████████████████  = 32px  (8 units)
```

### Rules

| Rule | Details |
|------|---------|
| All padding/margins must be multiples of 4px | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96 |
| Half-units allowed for tight spacing | 2px (`space-0-5`), 6px (`space-1-5`) — only for icon gaps and badge padding |
| Never use arbitrary px values | Always reference a token: `space-3` not `12px` |
| Gap = consistent within a container | All siblings in a flex/grid share the same gap token |

---

## 2. Spacing Scale

### 2.1 Full Scale

| Token | Value | Pixels | Tailwind | Usage |
|-------|-------|--------|----------|-------|
| `--space-0` | 0 | 0px | `0` | Reset |
| `--space-px` | 1px | 1px | `px` | Hairline borders |
| `--space-0-5` | 0.125rem | 2px | `0.5` | Tight micro-spacing |
| `--space-1` | 0.25rem | 4px | `1` | Icon-to-text gap, compact padding |
| `--space-1-5` | 0.375rem | 6px | `1.5` | Small internal spacing, badge padding-y |
| `--space-2` | 0.5rem | 8px | `2` | Default icon padding, input y-padding, button gap |
| `--space-2-5` | 0.625rem | 10px | `2.5` | Badge padding-x |
| `--space-3` | 0.75rem | 12px | `3` | Input x-padding, button x-padding-sm, sidebar item |
| `--space-3-5` | 0.875rem | 14px | `3.5` | — |
| `--space-4` | 1rem | 16px | `4` | Card gap, button x-padding, base component padding |
| `--space-5` | 1.25rem | 20px | `5` | Medium gaps |
| `--space-6` | 1.5rem | 24px | `6` | Card padding, modal padding, section internal |
| `--space-7` | 1.75rem | 28px | `7` | — |
| `--space-8` | 2rem | 32px | `8` | Section gaps, large component spacing |
| `--space-9` | 2.25rem | 36px | `9` | — |
| `--space-10` | 2.5rem | 40px | `10` | Large internal spacing |
| `--space-12` | 3rem | 48px | `12` | Section spacing (default) |
| `--space-14` | 3.5rem | 56px | `14` | — |
| `--space-16` | 4rem | 64px | `16` | Page section margins |
| `--space-20` | 5rem | 80px | `20` | Hero spacing |
| `--space-24` | 6rem | 96px | `24` | Large section spacing |

### 2.2 Visual Scale

```
space-24  ████████████████████████████████████████████████████████  96px  Large section spacing
space-20  ██████████████████████████████████████████████            80px  Hero spacing
space-16  ████████████████████████████████                          64px  Page section margins
space-12  ████████████████████████████                              48px  Section spacing
space-10  ████████████████████████                                  40px  Large internal
space-8   ████████████████████                                      32px  Section gaps
space-6   ████████████████                                          24px  Card/modal padding
space-4   ████████████                                              16px  Base component padding
space-3   ██████████                                                12px  Input padding
space-2   ████████                                                   8px  Icon padding, button gap
space-1   ████                                                       4px  Icon-to-text
```

---

## 3. Semantic Spacing Tokens

Purpose-based aliases that reference the primitive scale. Use these in component code instead of raw `space-*` values.

### 3.1 Component Internal Spacing

| Token | Maps To | Pixels | Usage |
|-------|---------|--------|-------|
| `--spacing-component-xs` | `space-1` | 4px | Tight internal: icon padding within buttons |
| `--spacing-component-sm` | `space-2` | 8px | Small: input y-padding, badge padding, button gap |
| `--spacing-component` | `space-3` | 12px | Default component internal spacing |
| `--spacing-component-lg` | `space-4` | 16px | Large component padding |

### 3.2 Gaps & Margins

| Token | Maps To | Pixels | Usage |
|-------|---------|--------|-------|
| `--spacing-gutter` | `space-4` | 16px | Gap between sibling elements (default) |
| `--spacing-gutter-sm` | `space-2` | 8px | Compact gap between siblings |
| `--spacing-gutter-lg` | `space-6` | 24px | Large gap between sections |

### 3.3 Section Spacing

| Token | Maps To | Pixels | Usage |
|-------|---------|--------|-------|
| `--spacing-section-sm` | `space-8` | 32px | Small section gap |
| `--spacing-section` | `space-12` | 48px | Default section gap |
| `--spacing-section-lg` | `space-16` | 64px | Large section gap |

### 3.4 Page Spacing

| Token | Maps To | Pixels | Usage |
|-------|---------|--------|-------|
| `--spacing-page-x` | `space-4` / `space-6` | 16px / 24px | Page horizontal padding (mobile / desktop) |
| `--spacing-page-y` | `space-6` / `space-8` | 24px / 32px | Page vertical padding (mobile / desktop) |

---

## 4. Element Spacing Map

Precise spacing values for every Sprintio component. Use this as the single source of truth when building UI.

### 4.1 Buttons

| Element | Padding | Gap | Notes |
|---------|---------|-----|-------|
| Button (sm) | `px-3 py-1.5` | `gap-1.5` | 12px × 6px, 6px icon gap |
| Button (md/default) | `px-4 py-2` | `gap-2` | 16px × 8px, 8px icon gap |
| Button (lg) | `px-6 py-3` | `gap-2` | 24px × 12px, 8px icon gap |
| Button (icon) | `p-2.5` | — | 10px all sides |
| Button group | — | `gap-2` | 8px between buttons |

### 4.2 Inputs

| Element | Padding | Gap | Notes |
|---------|---------|-----|-------|
| Input (sm) | `px-3 py-1.5` | — | 12px × 6px |
| Input (md/default) | `px-3 py-2` | — | 12px × 8px |
| Input (lg) | `px-4 py-3` | — | 16px × 12px |
| Input + Leading icon | — | `gap-2` | 8px between icon and text |
| Input + Trailing action | — | `gap-2` | 8px between text and action |
| Label → Input | `mt-2` | — | 8px |
| Input → Helper text | `mt-1.5` | — | 6px |
| Input → Error message | `mt-1.5` | — | 6px |
| Form field → Form field | `space-y-6` | — | 24px between fields |

### 4.3 Cards

| Element | Padding | Gap | Notes |
|---------|---------|-----|-------|
| Card (default) | `p-6` | — | 24px all sides |
| Card (compact) | `p-4` | — | 16px all sides |
| CardHeader → CardContent | — | implicit | Separated by padding areas |
| CardTitle → CardDescription | `space-y-1.5` | — | 6px |
| CardContent → CardFooter | — | implicit | Separated by padding areas |
| Card grid gap | — | `gap-4` | 16px between cards |
| Task card status border | — | `pl-1` (via left border) | 4px implied by border-left-width |

### 4.4 Modal / Dialog

| Element | Padding | Gap | Notes |
|---------|---------|-----|-------|
| Modal content | `p-6` | — | 24px all sides |
| Modal compact (sm) | `p-4` | — | 16px all sides |
| Header → Description | `space-y-1.5` | — | 6px |
| Content → Footer | — | implicit | Separated by content areas |
| Footer button gap | — | `gap-2` | 8px between buttons |
| Close button position | `top-4 right-4` | — | 16px from edges |
| Modal overlay padding | `p-4` / `p-6` | — | 16px mobile, 24px desktop |

### 4.5 Badges

| Element | Padding | Gap | Notes |
|---------|---------|-----|-------|
| Badge (sm) | `px-2 py-0.5` | — | 8px × 2px |
| Badge (default) | `px-2.5 py-0.5` | — | 10px × 2px |
| Badge (lg) | `px-3 py-1` | — | 12px × 4px |
| Badge + dot | — | `gap-1.5` | 6px between dot and text |
| Badge + remove button | — | `gap-1` | 4px between text and × |

### 4.6 Table / List

| Element | Padding | Gap | Notes |
|---------|---------|-----|-------|
| Table header cell | `px-4 py-3` | — | 16px × 12px |
| Table body cell | `px-4 py-3` | — | 16px × 12px |
| Table compact cell | `px-3 py-2` | — | 12px × 8px |
| List row | `px-4 py-3` | — | 16px × 12px |
| List row → row | — | `gap-0` | Border-bottom separates rows |
| Table footer | `px-4 py-3` | — | 16px × 12px |

### 4.7 Sidebar

| Element | Padding | Gap | Notes |
|---------|---------|-----|-------|
| Sidebar item | `px-3 py-2` | — | 12px × 8px |
| Sidebar item → item | — | `gap-1` | 4px between items |
| Sidebar section → section | — | `space-y-6` | 24px between groups |
| Sidebar section label | `px-3 pt-4 pb-2` | — | 12px × 16px top, 8px bottom |
| Sidebar active indicator | — | `pl-0` (left border) | 3px left border |

### 4.8 Tooltips

| Element | Padding | Gap | Notes |
|---------|---------|-----|-------|
| Tooltip content | `px-3 py-1.5` | — | 12px × 6px |
| Tooltip arrow → content | — | `mt-1` | 4px gap |

### 4.9 Toasts / Notifications

| Element | Padding | Gap | Notes |
|---------|---------|-----|-------|
| Toast | `p-4` | `gap-3` | 16px padding, 12px between icon/text/actions |
| Toast icon → text | — | `gap-3` | 12px |
| Toast → toast | — | `gap-2` | 8px stacked toasts |
| Notification item | `px-4 py-3` | `gap-3` | 16px × 12px, 12px content gap |

### 4.10 Tabs

| Element | Padding | Gap | Notes |
|---------|---------|-----|-------|
| Tab trigger | `px-4 py-2` | — | 16px × 8px |
| Tab trigger → trigger | — | `gap-0` | Border/underline separates tabs |
| Tabs content | `pt-4` | — | 16px below tab bar |

### 4.11 Avatar

| Element | Size | Gap | Notes |
|---------|------|-----|-------|
| Avatar (sm) | `h-8 w-8` | — | 32px |
| Avatar (md/default) | `h-10 w-10` | — | 40px |
| Avatar (lg) | `h-12 w-12` | — | 48px |
| Avatar (xl) | `h-16 w-16` | — | 64px |
| Avatar group | — | `-space-x-2` | 8px overlap |

---

## 5. Layout Spacing Patterns

### 5.1 Page Layout

```
┌─────────────────────────────────────────────────────┐
│  ← page-x →│                              ← page-x →│
│  ┌─────────────────────────────────────────────────┐│
│  │                    Header                       ││  h-16 (64px)
│  ├────────┬────────────────────────────────────────┤│
│  │        │ ← space-y-6 (24px)                     ││
│  │  Side  │ ┌──────────────────────────────────┐   ││
│  │  bar   │ │         Page Content              │   ││
│  │        │ │                                   │   ││
│  │ w-64   │ └──────────────────────────────────┘   ││
│  │ (256px)│                                        ││
│  └────────┴────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

| Element | Spacing | Value |
|---------|---------|-------|
| Page horizontal padding | `px-4` mobile / `px-6` desktop | 16px / 24px |
| Page vertical padding | `py-6` mobile / `py-8` desktop | 24px / 32px |
| Sidebar width | `w-64` | 256px |
| Header height | `h-16` | 64px |
| Content max-width | `max-w-7xl` | 1280px |

### 5.2 Content Width Constraints

| Context | Max Width | Rationale |
|---------|-----------|-----------|
| Doc editor content | `max-w-[720px]` | Optimal reading width (~65–75 chars/line) |
| Settings forms | `max-w-[600px]` | Comfortable form width |
| Onboarding modal | `max-w-[560px]` | Focused wizard |
| Command palette | `max-w-[560px]` | Quick scan |
| Copilot panel | `w-[320px]` fixed | Narrow sidebar |
| Board card | `w-full` of column | Constrained by column width |

### 5.3 Grid Patterns

| Pattern | Columns | Gap | Responsive |
|---------|---------|-----|------------|
| Card grid (compact) | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` | `gap-4` | Mobile: 1, Tablet: 2, Desktop: 3, Wide: 4 |
| Card grid (comfortable) | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` | `gap-6` | Mobile: 1, Tablet: 2, Desktop: 3 |
| Dashboard stats | `grid-cols-2 lg:grid-cols-4` | `gap-4` | 2 cols → 4 cols |
| Settings 2-col | `grid-cols-1 lg:grid-cols-[240px_1fr]` | `gap-8` | Stack → sidebar layout |

---

## 6. Responsive Spacing

### 6.1 Breakpoint Behavior

| Breakpoint | Width | Spacing Adjustment |
|-----------|-------|-------------------|
| Mobile | <768px | Base spacing. Reduce padding by 4px where needed |
| Tablet | 768–1023px | Full desktop spacing. Same as desktop |
| Desktop | 1024–1439px | Full spacing scale |
| Desktop XL | ≥1440px | Full spacing scale, optional tighter max-width |

### 6.2 Responsive Patterns

```tsx
// Mobile-first: start with mobile, layer upward
<div className="p-4 md:p-6 lg:p-8">

// Gap scales with layout
<div className="flex gap-2 md:gap-4 lg:gap-6">

// Card grid scales columns + gap
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

// Page content padding
<main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
```

### 6.3 Mobile Spacing Adjustments

| Element | Desktop | Mobile | Change |
|---------|---------|--------|--------|
| Page padding-x | `px-6` (24px) | `px-4` (16px) | -8px |
| Card padding | `p-6` (24px) | `p-4` (16px) | -8px |
| Modal padding | `p-6` (24px) | `p-4` (16px) | -8px |
| Section gap | `space-y-12` (48px) | `space-y-8` (32px) | -16px |
| Grid gap | `gap-6` (24px) | `gap-4` (16px) | -8px |

---

## 7. Don'ts

| ❌ Don't | ✅ Do Instead |
|---------|-------------|
| Use hardcoded px/rem values (`12px`, `0.75rem`) | Use Tailwind classes: `p-3`, `gap-2` |
| Mix spacing scales in one container | Pick one gap token and apply it consistently |
| Use `margin` for gap between siblings | Use `gap` in flex/grid containers |
| Add padding to both parent and child for same gap | Choose one: either parent padding OR child margin |
| Use `auto` margins for visual alignment | Use flex/grid alignment: `items-center`, `justify-between` |
| Skip spacing tokens for "it's just one element" | Every space gets a token — consistency matters |
| Use spacing that's not on the 4px grid | Stick to the scale. Half-units (2px, 6px) only for micro-spacing |

---

> **Next:** [02-TOKENS.md](./02-TOKENS.md) — Color, typography, shadow, border, and motion design tokens
