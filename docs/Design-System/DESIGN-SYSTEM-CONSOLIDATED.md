# Sprintio Design System — Consolidated Reference

> **Sprint fast. Ship together.**
> Version: 1.0 | Date: 2026-07-08
> Stack: React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui (Radix UI)

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Token Architecture](#2-token-architecture)
3. [Spacing System](#3-spacing-system)
4. [Color Tokens](#4-color-tokens)
5. [Typography Tokens](#5-typography-tokens)
6. [Shadow & Elevation Tokens](#6-shadow--elevation-tokens)
7. [Border & Radius Tokens](#7-border--radius-tokens)
8. [Motion Tokens](#8-motion-tokens)
9. [Tailwind Configuration](#9-tailwind-configuration)
10. [shadcn/ui Strategy](#10-shadcnui-strategy)
11. [Component: Button](#11-component-button)
12. [Component: Card](#12-component-card)
13. [Component: Input](#13-component-input)
14. [Component: Modal (Dialog)](#14-component-modal-dialog)
15. [Dark Mode Strategy](#15-dark-mode-strategy)
16. [File Structure](#16-file-structure)

---

## 1. Design Principles

| #   | Principle                                     | Application                                                                                                            |
| --- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| P1  | **Token-first, never raw**                    | Every color/spacing/sizing reference uses a design token — never a hardcoded hex, px, or rem in component code         |
| P2  | **Three-layer token architecture**            | Primitive → Semantic → Component. Change a primitive, every layer updates. Theme switching = swap semantic values only |
| P3  | **One brand accent**                          | Indigo is the brand. Violet is AI-only. Everything else is functional (neutral + semantic status)                      |
| P4  | **Neutral dominance**                         | 70%+ of every screen is neutral grays. Color is used sparingly to draw attention                                       |
| P5  | **Dark mode = same tokens, different values** | Component code never changes for dark mode — only CSS custom property values swap                                      |
| P6  | **Accessibility is not optional**             | WCAG 2.1 AA minimum. Focus rings on all interactive elements. Never use color alone to convey meaning                  |
| P7  | **Mobile-first responsive**                   | Start with mobile styles, layer responsive variants upward                                                             |

---

## 2. Token Architecture

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

| Layer         | Purpose                            | When to Change                 |
| ------------- | ---------------------------------- | ------------------------------ |
| **Primitive** | Base values (colors, sizes, fonts) | Rarely — foundational          |
| **Semantic**  | Meaning-based aliases              | Theme switching (light ↔ dark) |
| **Component** | Component-specific overrides       | Per-component needs            |

### Naming Convention

```
--{category}-{item}-{variant}-{state}

Examples:
--color-primary                 # category-item
--color-primary-hover           # category-item-state
--button-bg-hover               # component-property-state
--spacing-section-sm            # category-semantic-variant
```

---

## 3. Spacing System

### 3.1 Base Grid

**4px base unit.** All spacing values are multiples of 4px. This creates visual rhythm and alignment consistency.

### 3.2 Spacing Scale

| Token         | Value    | Pixels | Tailwind | Usage                                              |
| ------------- | -------- | ------ | -------- | -------------------------------------------------- |
| `--space-0`   | 0        | 0px    | `0`      | Reset                                              |
| `--space-px`  | 1px      | 1px    | `px`     | Hairline borders                                   |
| `--space-0-5` | 0.125rem | 2px    | `0.5`    | Tight micro-spacing                                |
| `--space-1`   | 0.25rem  | 4px    | `1`      | Icon-to-text gap, compact padding                  |
| `--space-1-5` | 0.375rem | 6px    | `1.5`    | Small internal spacing                             |
| `--space-2`   | 0.5rem   | 8px    | `2`      | Default icon padding, input y-padding              |
| `--space-2-5` | 0.625rem | 10px   | `2.5`    | Badge padding                                      |
| `--space-3`   | 0.75rem  | 12px   | `3`      | Input x-padding, button x-padding-sm               |
| `--space-3-5` | 0.875rem | 14px   | `3.5`    | —                                                  |
| `--space-4`   | 1rem     | 16px   | `4`      | Card gap, button x-padding, base component padding |
| `--space-5`   | 1.25rem  | 20px   | `5`      | Medium gaps                                        |
| `--space-6`   | 1.5rem   | 24px   | `6`      | Card padding, section internal spacing             |
| `--space-7`   | 1.75rem  | 28px   | `7`      | —                                                  |
| `--space-8`   | 2rem     | 32px   | `8`      | Section gaps, large component spacing              |
| `--space-9`   | 2.25rem  | 36px   | `9`      | —                                                  |
| `--space-10`  | 2.5rem   | 40px   | `10`     | Large internal spacing                             |
| `--space-12`  | 3rem     | 48px   | `12`     | Section spacing                                    |
| `--space-14`  | 3.5rem   | 56px   | `14`     | —                                                  |
| `--space-16`  | 4rem     | 64px   | `16`     | Page section margins                               |
| `--space-20`  | 5rem     | 80px   | `20`     | Hero spacing                                       |
| `--space-24`  | 6rem     | 96px   | `24`     | Large section spacing                              |

### 3.3 Semantic Spacing Tokens

| Token                    | Maps To               | Usage                                      |
| ------------------------ | --------------------- | ------------------------------------------ |
| `--spacing-component-xs` | `space-1` (4px)       | Tight internal: icon padding               |
| `--spacing-component-sm` | `space-2` (8px)       | Small: input y-padding, badge padding      |
| `--spacing-component`    | `space-3` (12px)      | Default component internal spacing         |
| `--spacing-component-lg` | `space-4` (16px)      | Large component padding                    |
| `--spacing-gutter`       | `space-4` (16px)      | Gap between sibling elements               |
| `--spacing-section-sm`   | `space-8` (32px)      | Small section gap                          |
| `--spacing-section`      | `space-12` (48px)     | Default section gap                        |
| `--spacing-section-lg`   | `space-16` (64px)     | Large section gap                          |
| `--spacing-page-x`       | `space-4` / `space-6` | Page horizontal padding (mobile / desktop) |
| `--spacing-page-y`       | `space-6` / `space-8` | Page vertical padding (mobile / desktop)   |

### 3.4 Spacing Usage Map

| Element             | Padding                    | Gap/Margin        | Notes                  |
| ------------------- | -------------------------- | ----------------- | ---------------------- |
| Button (sm)         | `3` (12px) x `1.5` (6px)   | —                 | Small buttons          |
| Button (md)         | `4` (16px) x `2` (8px)     | —                 | Default buttons        |
| Button (lg)         | `6` (24px) x `3` (12px)    | —                 | Large buttons          |
| Input               | `3` (12px) x `2` (8px)     | —                 | Text inputs            |
| Card                | `6` (24px)                 | —                 | Card padding           |
| Card compact        | `4` (16px)                 | —                 | Compact card variant   |
| Badge               | `2.5` (10px) x `0.5` (2px) | —                 | Badge padding          |
| Modal               | `6` (24px)                 | —                 | Modal content padding  |
| Table cell          | `4` (16px) x `3` (12px)    | —                 | Table cell padding     |
| Sidebar item        | `3` (12px) x `2` (8px)     | `1` (4px) between | Nav items              |
| List row            | `4` (16px) x `3` (12px)    | `0` (0px) between | List rows              |
| Section → Section   | —                          | `12` (48px)       | Between major sections |
| Card → Card         | —                          | `4` (16px)        | Card grid gap          |
| Form → Form element | —                          | `6` (24px)        | Between form fields    |

---

## 4. Color Tokens

### 4.1 Primitive Color Tokens (Sprintio Brand)

#### Primary — Indigo

| Token                | Hex       | RGB           | Usage                                       |
| -------------------- | --------- | ------------- | ------------------------------------------- |
| `--color-indigo-50`  | `#EEF2FF` | 238, 242, 255 | Lightest tint — selected items, hover hints |
| `--color-indigo-100` | `#E0E7FF` | 224, 231, 255 | Light tint — selected row bg, focus rings   |
| `--color-indigo-200` | `#C7D2FE` | 199, 210, 254 | Borders on selected items                   |
| `--color-indigo-300` | `#A5B4FC` | 165, 180, 252 | Disabled interactive borders                |
| `--color-indigo-400` | `#818CF8` | 129, 140, 248 | Secondary buttons, icons                    |
| `--color-indigo-500` | `#6366F1` | 99, 102, 241  | **Primary** — buttons, links, active, focus |
| `--color-indigo-600` | `#4F46E5` | 79, 70, 229   | Primary button hover                        |
| `--color-indigo-700` | `#4338CA` | 67, 56, 202   | Primary button active/pressed               |
| `--color-indigo-800` | `#3730A3` | 55, 48, 163   | Dark text on primary backgrounds            |
| `--color-indigo-900` | `#312E81` | 49, 46, 129   | Deepest — dark mode sidebar active          |

#### Accent — Violet (AI features only)

| Token                | Hex       | Usage                      |
| -------------------- | --------- | -------------------------- |
| `--color-violet-50`  | `#F5F3FF` | AI feature background tint |
| `--color-violet-100` | `#EDE9FE` | AI suggestion banner bg    |
| `--color-violet-200` | `#E9D5FF` | AI suggestion border       |
| `--color-violet-300` | `#C4B5FD` | AI icon secondary          |
| `--color-violet-500` | `#8B5CF6` | AI Copilot icon, AI badges |
| `--color-violet-600` | `#7C3AED` | AI action buttons          |
| `--color-violet-700` | `#6D28D9` | AI text on light bg        |

#### Neutral — Grays (UI backbone)

| Token              | Hex       | Usage                                  |
| ------------------ | --------- | -------------------------------------- |
| `--color-gray-50`  | `#F9FAFB` | Page bg (light)                        |
| `--color-gray-100` | `#F3F4F6` | Card bg, sidebar bg, input bg          |
| `--color-gray-200` | `#E5E7EB` | Borders, dividers, disabled            |
| `--color-gray-300` | `#D1D5DB` | Skeleton placeholders, muted borders   |
| `--color-gray-400` | `#9CA3AF` | Placeholder text, disabled text, icons |
| `--color-gray-500` | `#6B7280` | Secondary text, captions, timestamps   |
| `--color-gray-600` | `#4B5563` | Body text (muted), descriptions        |
| `--color-gray-700` | `#374151` | Body text (default), labels            |
| `--color-gray-800` | `#1F2937` | Headings, primary text                 |
| `--color-gray-900` | `#111827` | Deepest text, high-contrast headings   |

#### Semantic Status Colors

| Color Family             | 50 (bg)   | 100 (banner) | 500 (dot/badge) | 600 (text) | 700 (text on bg) |
| ------------------------ | --------- | ------------ | --------------- | ---------- | ---------------- |
| **Green** (Success/Done) | `#F0FDF4` | `#DCFCE7`    | `#22C55E`       | `#16A34A`  | `#15803D`        |
| **Red** (Error/Blocked)  | `#FEF2F2` | `#FEE2E2`    | `#EF4444`       | `#DC2626`  | `#B91C1C`        |
| **Amber** (Warning/P1)   | `#FFFBEB` | `#FEF3C7`    | `#F59E0B`       | `#D97706`  | `#B45309`        |
| **Blue** (Info/Link)     | `#EFF6FF` | `#DBEAFE`    | `#3B82F6`       | `#2563EB`  | `#1D4ED8`        |
| **Purple** (AI/Copilot)  | `#FAF5FF` | `#F3E8FF`    | `#A855F7`       | `#9333EA`  | `#7E22CE`        |

### 4.2 Semantic Color Tokens

These map primitives to purpose. Theme switching = swap these values.

#### Backgrounds & Surfaces

| Token                       | Light Mode          | Dark Mode             | Usage                         |
| --------------------------- | ------------------- | --------------------- | ----------------------------- |
| `--color-bg-page`           | `gray-50` (#F9FAFB) | `#0F172A` (slate-900) | Page background               |
| `--color-bg-surface`        | `#FFFFFF`           | `#1E293B` (slate-800) | Cards, panels, modals         |
| `--color-bg-surface-raised` | `#FFFFFF`           | `#334155` (slate-700) | Dropdowns, tooltips, popovers |
| `--color-bg-sidebar`        | `gray-50`           | `#0F172A`             | Sidebar background            |
| `--color-bg-sidebar-hover`  | `gray-100`          | `#1E293B`             | Sidebar item hover            |
| `--color-bg-sidebar-active` | `indigo-100`        | `indigo-900`          | Sidebar active item           |
| `--color-bg-input`          | `#FFFFFF`           | `#1E293B`             | Text inputs                   |
| `--color-bg-input-disabled` | `gray-100`          | `#334155`             | Disabled input                |
| `--color-bg-overlay`        | `rgba(0,0,0,0.5)`   | `rgba(0,0,0,0.7)`     | Modal backdrop                |

#### Board & List Surfaces

| Token                      | Light Mode  | Dark Mode    | Usage                              |
| -------------------------- | ----------- | ------------ | ---------------------------------- |
| `--color-bg-board`         | `gray-100`  | `#0F172A`    | Board background (between columns) |
| `--color-bg-column`        | `gray-50`   | `#1E293B`    | Column background                  |
| `--color-bg-card`          | `#FFFFFF`   | `#1E293B`    | Task card                          |
| `--color-bg-card-hover`    | `gray-50`   | `#334155`    | Task card hover                    |
| `--color-bg-card-selected` | `indigo-50` | `indigo-900` | Selected task card                 |
| `--color-bg-row`           | `#FFFFFF`   | `#1E293B`    | List row                           |
| `--color-bg-row-hover`     | `gray-50`   | `#334155`    | List row hover                     |
| `--color-bg-row-selected`  | `indigo-50` | `indigo-900` | Selected list row                  |

#### Text

| Token                     | Light Mode           | Dark Mode            | Usage                        |
| ------------------------- | -------------------- | -------------------- | ---------------------------- |
| `--color-text-primary`    | `gray-900` (#111827) | `gray-50` (#F9FAFB)  | Headings, primary content    |
| `--color-text-secondary`  | `gray-700` (#374151) | `gray-200` (#E5E7EB) | Body text, descriptions      |
| `--color-text-tertiary`   | `gray-500` (#6B7280) | `gray-400` (#9CA3AF) | Captions, timestamps         |
| `--color-text-muted`      | `gray-400` (#9CA3AF) | `gray-500` (#6B7280) | Placeholder, disabled labels |
| `--color-text-inverse`    | `#FFFFFF`            | `gray-900` (#111827) | Text on colored backgrounds  |
| `--color-text-link`       | `indigo-600`         | `indigo-400`         | Clickable text links         |
| `--color-text-link-hover` | `indigo-700`         | `indigo-300`         | Link hover state             |

#### Borders

| Token                    | Light Mode   | Dark Mode             | Usage                               |
| ------------------------ | ------------ | --------------------- | ----------------------------------- |
| `--color-border-default` | `gray-200`   | `#334155` (slate-700) | Standard borders: cards, inputs     |
| `--color-border-light`   | `gray-100`   | `#1E293B` (slate-800) | Subtle dividers, section separators |
| `--color-border-strong`  | `gray-300`   | `#475569` (slate-600) | Emphasized borders, active cards    |
| `--color-border-focus`   | `indigo-500` | `indigo-500`          | Focus ring for interactive elements |
| `--color-border-error`   | `red-500`    | `red-500`             | Error state borders                 |
| `--color-border-success` | `green-500`  | `green-500`           | Success state borders               |

### 4.3 Component Color Tokens

| Component                 | Background          | Border           | Text             | Accent                     |
| ------------------------- | ------------------- | ---------------- | ---------------- | -------------------------- |
| **Primary Button**        | `indigo-500`        | none             | `text-inverse`   | —                          |
| **Primary Button Hover**  | `indigo-600`        | none             | `text-inverse`   | —                          |
| **Primary Button Active** | `indigo-700`        | none             | `text-inverse`   | —                          |
| **Secondary Button**      | `bg-surface`        | `border-default` | `text-secondary` | —                          |
| **Ghost Button**          | transparent         | none             | `text-secondary` | —                          |
| **Danger Button**         | `red-500`           | none             | `text-inverse`   | —                          |
| **Input (default)**       | `bg-input`          | `border-default` | `text-primary`   | —                          |
| **Input (focus)**         | `bg-input`          | `border-focus`   | `text-primary`   | `indigo-500` ring          |
| **Input (error)**         | `bg-input`          | `border-error`   | `text-primary`   | `red-500` ring             |
| **Input (disabled)**      | `bg-input-disabled` | `border-default` | `text-muted`     | —                          |
| **Card**                  | `bg-card`           | `border-default` | `text-primary`   | status-colored left border |
| **Card Hover**            | `bg-card-hover`     | `border-strong`  | `text-primary`   | —                          |
| **Card Selected**         | `bg-card-selected`  | `border-focus`   | `text-primary`   | `indigo-500` left border   |
| **Modal Overlay**         | `bg-overlay`        | none             | —                | —                          |
| **Modal Content**         | `bg-surface`        | `border-default` | `text-primary`   | —                          |
| **Toast (success)**       | `green-50`          | `green-200`      | `green-700`      | `green-500` icon           |
| **Toast (error)**         | `red-50`            | `red-200`        | `red-700`        | `red-500` icon             |
| **Tooltip**               | `gray-800`          | none             | `text-inverse`   | —                          |
| **Skeleton**              | `gray-200`          | none             | —                | —                          |

---

## 5. Typography Tokens

### 5.1 Font Families

| Token         | Font Stack                                                                                                 | Usage                    |
| ------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------ |
| `--font-sans` | `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`      | All UI text              |
| `--font-mono` | `"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace` | Code, task IDs, terminal |

### 5.2 Type Scale (Desktop ≥768px)

| Token       | Size | Rem      | Tailwind      | Line Height  | Usage                             |
| ----------- | ---- | -------- | ------------- | ------------ | --------------------------------- |
| `text-2xs`  | 10px | 0.625rem | `text-[10px]` | 16px (1.6)   | Badge counts                      |
| `text-xs`   | 12px | 0.75rem  | `text-xs`     | 16px (1.333) | Captions, timestamps, helper text |
| `text-sm`   | 14px | 0.875rem | `text-sm`     | 20px (1.429) | Body small, table cells, sidebar  |
| `text-base` | 16px | 1rem     | `text-base`   | 24px (1.5)   | **Body text default**, inputs     |
| `text-lg`   | 18px | 1.125rem | `text-lg`     | 28px (1.556) | Card titles, body large           |
| `text-xl`   | 20px | 1.25rem  | `text-xl`     | 28px (1.4)   | Section headings, panel titles    |
| `text-2xl`  | 24px | 1.5rem   | `text-2xl`    | 32px (1.333) | Page titles, h1 headings          |
| `text-3xl`  | 30px | 1.875rem | `text-3xl`    | 36px (1.2)   | h1 headings, hero text            |
| `text-4xl`  | 36px | 2.25rem  | `text-4xl`    | 40px (1.111) | Marketing (onboarding only)       |

### 5.3 Mobile Type Scale (<768px)

| Token       | Desktop → Mobile | Delta |
| ----------- | ---------------- | ----- |
| `text-2xs`  | 10px → 10px      | 0     |
| `text-xs`   | 12px → 12px      | 0     |
| `text-sm`   | 14px → 13px      | -1px  |
| `text-base` | 16px → 15px      | -1px  |
| `text-lg`   | 18px → 17px      | -1px  |
| `text-xl`   | 20px → 19px      | -1px  |
| `text-2xl`  | 24px → 22px      | -2px  |
| `text-3xl`  | 30px → 28px      | -2px  |
| `text-4xl`  | 36px → 34px      | -2px  |

### 5.4 Font Weights

| Token           | Value | Usage                               |
| --------------- | ----- | ----------------------------------- |
| `font-normal`   | 400   | Body text, descriptions, inputs     |
| `font-medium`   | 500   | Labels, buttons, nav, table headers |
| `font-semibold` | 600   | Subheadings (h3, h4), card titles   |
| `font-bold`     | 700   | Page titles (h1, h2)                |

### 5.5 Composite Typography Tokens

| Token        | Size | Weight | Line Height | Letter Spacing | Tailwind Classes                                         |
| ------------ | ---- | ------ | ----------- | -------------- | -------------------------------------------------------- |
| `display-lg` | 36px | 700    | 40px        | -0.025em       | `text-[2.25rem] font-bold leading-[40px] tracking-tight` |
| `display-md` | 30px | 700    | 36px        | -0.025em       | `text-3xl font-bold leading-tight tracking-tight`        |
| `heading-xl` | 24px | 700    | 32px        | -0.025em       | `text-2xl font-bold leading-tight tracking-tight`        |
| `heading-lg` | 20px | 600    | 28px        | -0.025em       | `text-xl font-semibold leading-snug tracking-tight`      |
| `heading-md` | 18px | 600    | 28px        | 0              | `text-lg font-semibold leading-snug`                     |
| `heading-sm` | 16px | 600    | 24px        | 0              | `text-base font-semibold leading-normal`                 |
| `body-lg`    | 18px | 400    | 28px        | 0              | `text-lg font-normal leading-snug`                       |
| `body-md`    | 16px | 400    | 24px        | 0              | `text-base font-normal leading-normal`                   |
| `body-sm`    | 14px | 400    | 20px        | 0              | `text-sm font-normal leading-normal`                     |
| `body-xs`    | 12px | 400    | 16px        | 0              | `text-xs font-normal leading-normal`                     |
| `label-lg`   | 16px | 500    | 24px        | 0.025em        | `text-base font-medium leading-normal tracking-wide`     |
| `label-md`   | 14px | 500    | 20px        | 0.025em        | `text-sm font-medium leading-normal tracking-wide`       |
| `label-sm`   | 12px | 500    | 16px        | 0.025em        | `text-xs font-medium leading-normal tracking-wide`       |
| `button-lg`  | 16px | 500    | 24px        | 0.025em        | `text-base font-medium leading-normal tracking-wide`     |
| `button-md`  | 14px | 500    | 20px        | 0.025em        | `text-sm font-medium leading-normal tracking-wide`       |
| `button-sm`  | 12px | 500    | 16px        | 0.025em        | `text-xs font-medium leading-normal tracking-wide`       |
| `code-md`    | 14px | 400    | 20px        | 0              | `font-mono text-sm`                                      |
| `code-sm`    | 12px | 400    | 16px        | 0              | `font-mono text-xs`                                      |
| `caption`    | 12px | 400    | 16px        | 0.025em        | `text-xs font-normal tracking-wide`                      |
| `overline`   | 10px | 500    | 16px        | 0.1em          | `text-[10px] font-medium tracking-[0.1em] uppercase`     |
| `badge-text` | 10px | 600    | 14px        | 0.025em        | `text-[10px] font-semibold tracking-wide`                |

### 5.6 Letter Spacing

| Token              | Value    | Usage                           |
| ------------------ | -------- | ------------------------------- |
| `tracking-tighter` | -0.05em  | Display text only (text-4xl)    |
| `tracking-tight`   | -0.025em | Headings (text-3xl, text-2xl)   |
| `tracking-normal`  | 0em      | Body text                       |
| `tracking-wide`    | 0.025em  | Button text, nav labels, labels |
| `tracking-wider`   | 0.05em   | All-caps labels                 |
| `tracking-widest`  | 0.1em    | Overlines, small-caps           |

---

## 6. Shadow & Elevation Tokens

### 6.1 Shadow Scale

| Token              | CSS Value                                                           | Tailwind       | Usage                           |
| ------------------ | ------------------------------------------------------------------- | -------------- | ------------------------------- |
| `--shadow-none`    | `none`                                                              | `shadow-none`  | —                               |
| `--shadow-sm`      | `0 1px 2px rgba(0,0,0,0.05)`                                        | `shadow-sm`    | Subtle card lift, flat elements |
| `--shadow-default` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)`         | `shadow`       | Default cards, inputs           |
| `--shadow-md`      | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)`    | `shadow-md`    | Cards on hover, dropdowns       |
| `--shadow-lg`      | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)`  | `shadow-lg`    | Modals, popovers                |
| `--shadow-xl`      | `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` | `shadow-xl`    | Command palette, drag ghost     |
| `--shadow-2xl`     | `0 25px 50px -12px rgba(0,0,0,0.25)`                                | `shadow-2xl`   | Maximum elevation               |
| `--shadow-drag`    | `0 12px 24px rgba(0,0,0,0.15)`                                      | custom         | Drag ghost on board             |
| `--shadow-inner`   | `inset 0 2px 4px 0 rgba(0,0,0,0.05)`                                | `shadow-inner` | Inset states                    |

### 6.2 Dark Mode Shadow Adjustments

In dark mode, shadows are increased for visibility against dark surfaces:

| Token         | Light Mode          | Dark Mode          |
| ------------- | ------------------- | ------------------ |
| `--shadow-sm` | `rgba(0,0,0, 0.05)` | `rgba(0,0,0, 0.3)` |
| `--shadow-md` | `rgba(0,0,0, 0.1)`  | `rgba(0,0,0, 0.4)` |
| `--shadow-lg` | `rgba(0,0,0, 0.1)`  | `rgba(0,0,0, 0.4)` |
| `--shadow-xl` | `rgba(0,0,0, 0.1)`  | `rgba(0,0,0, 0.4)` |

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

| Token              | Value  | Tailwind       | Usage                       |
| ------------------ | ------ | -------------- | --------------------------- |
| `--radius-none`    | 0      | `rounded-none` | —                           |
| `--radius-sm`      | 2px    | `rounded-sm`   | Tight elements              |
| `--radius-default` | 4px    | `rounded`      | —                           |
| `--radius-md`      | 6px    | `rounded-md`   | Inputs, buttons, badges     |
| `--radius-lg`      | 8px    | `rounded-lg`   | Cards, dropdowns, sidebar   |
| `--radius-xl`      | 12px   | `rounded-xl`   | Modals, large panels        |
| `--radius-2xl`     | 16px   | `rounded-2xl`  | —                           |
| `--radius-full`    | 9999px | `rounded-full` | Avatars, pills, status dots |

### 7.2 Component Border Radius

| Component       | Radius | Token          |
| --------------- | ------ | -------------- |
| Button          | 6px    | `rounded-md`   |
| Input           | 6px    | `rounded-md`   |
| Select          | 6px    | `rounded-md`   |
| Card            | 8px    | `rounded-lg`   |
| Badge           | 9999px | `rounded-full` |
| Modal           | 12px   | `rounded-xl`   |
| Dropdown        | 8px    | `rounded-lg`   |
| Tooltip         | 6px    | `rounded-md`   |
| Toast           | 8px    | `rounded-lg`   |
| Avatar (square) | 8px    | `rounded-lg`   |
| Avatar (round)  | 9999px | `rounded-full` |
| Skeleton        | 6px    | `rounded-md`   |
| Checkbox        | 4px    | `rounded`      |
| Status dot      | 9999px | `rounded-full` |

### 7.3 Border Usage Rules

| Context              | Token            | Thickness | Notes           |
| -------------------- | ---------------- | --------- | --------------- |
| Card                 | `border-default` | 1px       |                 |
| Input (default)      | `border-default` | 1px       |                 |
| Input (focus)        | `border-focus`   | 2px       | 2px ring offset |
| Input (error)        | `border-error`   | 1px       |                 |
| Button (secondary)   | `border-default` | 1px       |                 |
| Modal                | `border-default` | 1px       |                 |
| Sidebar (right)      | `border-light`   | 1px       |                 |
| Table row (bottom)   | `border-light`   | 1px       |                 |
| Dropdown             | `border-default` | 1px       |                 |
| Divider              | `border-light`   | 1px       |                 |
| Selected card (left) | `border-focus`   | 2px       | 2px left border |
| Status card (left)   | status color     | 2px       | 2px left border |

---

## 8. Motion Tokens

### 8.1 Duration Scale

| Token             | Value  | Usage                                      |
| ----------------- | ------ | ------------------------------------------ |
| `--duration-75`   | 75ms   | —                                          |
| `--duration-100`  | 100ms  | Micro interactions                         |
| `--duration-150`  | 150ms  | **Fast** — hover, focus, color transitions |
| `--duration-200`  | 200ms  | **Normal** — standard transitions          |
| `--duration-300`  | 300ms  | **Slow** — panel slide, modal fade         |
| `--duration-500`  | 500ms  | —                                          |
| `--duration-700`  | 700ms  | Complex animations                         |
| `--duration-1000` | 1000ms | Page transitions                           |

### 8.2 Easing

| Token            | Value                               | Usage                                  |
| ---------------- | ----------------------------------- | -------------------------------------- |
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)`      | Default easing for all transitions     |
| `--ease-in`      | `cubic-bezier(0.4, 0, 1, 1)`        | Entering elements                      |
| `--ease-out`     | `cubic-bezier(0, 0, 0.2, 1)`        | Exiting elements                       |
| `--ease-in-out`  | `cubic-bezier(0.4, 0, 0.2, 1)`      | State changes                          |
| `--ease-spring`  | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy effects (badges, notifications) |

### 8.3 Transition Properties

| Property     | Duration | Easing      | Usage                    |
| ------------ | -------- | ----------- | ------------------------ |
| Color        | 150ms    | ease-in-out | Text, bg color changes   |
| Background   | 150ms    | ease-in-out | Button hover, card hover |
| Border       | 150ms    | ease-in-out | Focus ring appearance    |
| Box Shadow   | 200ms    | ease-out    | Card hover lift          |
| Transform    | 200ms    | ease-out    | Scale, translate         |
| Opacity      | 150ms    | ease        | Fade in/out              |
| Width/Height | 300ms    | ease-in-out | Panel expand/collapse    |
| All          | 200ms    | ease-in-out | Generic transition       |

---

## 9. Tailwind Configuration

### 9.1 `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'], // .dark class toggled on <html>
  content: ['./src/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      // ── COLORS ──────────────────────────────────────────
      colors: {
        // shadcn/ui semantic layer (maps to CSS vars)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Sprintio brand (direct access when needed)
        indigo: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        violet: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#E9D5FF',
          300: '#C4B5FD',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
        },
        // Semantic status (direct access)
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        error: {
          DEFAULT: 'hsl(var(--error))',
          foreground: 'hsl(var(--error-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
      },

      // ── FONT FAMILY ─────────────────────────────────────
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', 'Consolas', 'monospace'],
      },

      // ── BORDER RADIUS ───────────────────────────────────
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      // ── CUSTOM SPACING ──────────────────────────────────
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        // Semantic spacing (optional Tailwind access)
        'section-sm': '2rem',
        section: '3rem',
        'section-lg': '4rem',
      },

      // ── KEYFRAMES ───────────────────────────────────────
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'slide-in-from-bottom': {
          from: { transform: 'translateY(10px)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-in-from-top': {
          from: { transform: 'translateY(-10px)' },
          to: { transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },

      // ── ANIMATIONS ──────────────────────────────────────
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.15s ease-in',
        'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
        'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },

      // ── TRANSITION DURATION ─────────────────────────────
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

---

## 10. shadcn/ui Strategy

### 10.1 Installation

```bash
# Initialize shadcn/ui (select: React + Vite, TypeScript, src/components, CSS variables, New York style)
npx shadcn@latest init

# Add required components
npx shadcn@latest add button card input dialog label select textarea checkbox switch avatar badge separator sheet tabs tooltip form
```

### 10.2 `components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### 10.3 CSS Variables (HSL format for shadcn/ui)

shadcn/ui uses HSL values **without** the `hsl()` wrapper so opacity modifiers work.

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* ── Primitive colors (Sprintio brand → shadcn mapping) ── */
    --background: 236 39% 97%; /* gray-50 #F9FAFB */
    --foreground: 224 71% 4%; /* gray-900 #111827 */

    --card: 0 0% 100%; /* white */
    --card-foreground: 224 71% 4%;

    --popover: 0 0% 100%;
    --popover-foreground: 224 71% 4%;

    --primary: 239 84% 67%; /* indigo-500 #6366F1 */
    --primary-foreground: 0 0% 100%; /* white */

    --secondary: 220 14% 96%; /* gray-100 #F3F4F6 */
    --secondary-foreground: 224 71% 4%;

    --muted: 220 14% 96%;
    --muted-foreground: 220 9% 46%; /* gray-500 #6B7280 */

    --accent: 220 14% 96%;
    --accent-foreground: 224 71% 4%;

    --destructive: 0 84% 60%; /* red-500 #EF4444 */
    --destructive-foreground: 0 0% 100%;

    /* Sprintio-specific */
    --success: 142 71% 45%; /* green-500 */
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%; /* amber-500 */
    --warning-foreground: 224 71% 4%;
    --error: 0 84% 60%; /* red-500 */
    --error-foreground: 0 0% 100%;
    --info: 217 91% 60%; /* blue-500 */
    --info-foreground: 0 0% 100%;

    --border: 220 13% 91%; /* gray-200 #E5E7EB */
    --input: 220 13% 91%;
    --ring: 239 84% 67%; /* indigo-500 */
    --radius: 0.5rem; /* 8px — default radius */

    /* Status-specific direct tokens */
    --success-bg: 142 76% 94%; /* green-50 */
    --success-border: 142 72% 85%; /* green-200 */
    --success-text: 142 70% 30%; /* green-700 */
    --error-bg: 0 86% 97%; /* red-50 */
    --error-border: 0 84% 90%; /* red-200 */
    --error-text: 0 72% 36%; /* red-700 */
    --warning-bg: 48 96% 95%; /* amber-50 */
    --warning-border: 48 95% 86%; /* amber-200 */
    --warning-text: 32 95% 30%; /* amber-700 */
    --info-bg: 217 91% 95%; /* blue-50 */
    --info-border: 217 91% 85%; /* blue-200 */
    --info-text: 224 76% 40%; /* blue-700 */

    /* AI (Violet) */
    --ai: 263 70% 50%; /* violet-500 #8B5CF6 */
    --ai-foreground: 0 0% 100%;
    --ai-bg: 270 100% 97%; /* violet-50 */
    --ai-border: 270 87% 93%; /* violet-100 */
    --ai-text: 270 79% 34%; /* violet-700 */
  }

  .dark {
    --background: 222 47% 6%; /* slate-900 #0F172A */
    --foreground: 210 40% 98%; /* gray-50 #F9FAFB */

    --card: 215 25% 17%; /* slate-800 #1E293B */
    --card-foreground: 210 40% 98%;

    --popover: 215 25% 17%;
    --popover-foreground: 210 40% 98%;

    --primary: 239 84% 67%; /* indigo-500 (unchanged) */
    --primary-foreground: 0 0% 100%;

    --secondary: 215 25% 17%; /* slate-800 */
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
    --error-foreground: 0 0% 100%;
    --info: 217 91% 60%;
    --info-foreground: 0 0% 100%;

    --border: 215 25% 27%; /* slate-700 #334155 */
    --input: 215 25% 27%;
    --ring: 239 84% 67%;

    --success-bg: 142 76% 94%;
    --success-border: 142 72% 85%;
    --success-text: 142 70% 30%;
    --error-bg: 0 86% 97%;
    --error-border: 0 84% 90%;
    --error-text: 0 72% 36%;
    --warning-bg: 48 96% 95%;
    --warning-border: 48 95% 86%;
    --warning-text: 32 95% 30%;
    --info-bg: 217 91% 95%;
    --info-border: 217 91% 85%;
    --info-text: 224 76% 40%;

    --ai: 263 70% 50%;
    --ai-foreground: 0 0% 100%;
    --ai-bg: 270 100% 97%;
    --ai-border: 270 87% 93%;
    --ai-text: 270 79% 34%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings:
      'rlig' 1,
      'calt' 1;
  }
}
```

### 10.4 `cn()` Utility

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 10.5 Component Strategy Rules

| Rule                   | Details                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------- |
| **Style: New York**    | Sharper, higher contrast. Better for SaaS tools                                     |
| **Base Color: Slate**  | Cool grays. Aligns with Sprintio neutral palette                                    |
| **CSS Variables: Yes** | Enables runtime theme switching                                                     |
| **Dark Mode: class**   | Toggled via `document.documentElement.classList.toggle('dark')`                     |
| **Component Location** | `src/components/ui/` for shadcn primitives. `src/components/` for Sprintio-specific |
| **Customization**      | Modify shadcn components in-place (they live in your codebase)                      |
| **Composition**        | Build complex UIs from composable shadcn primitives                                 |
| **Never wrap twice**   | If shadcn has it, use it. Don't create Sprintio wrappers for shadcn components      |

---

## 11. Component: Button

### 11.1 Variants

| Variant       | Background    | Text                     | Border   | Use Case                            |
| ------------- | ------------- | ------------------------ | -------- | ----------------------------------- |
| `default`     | `primary`     | `primary-foreground`     | none     | Primary CTA — one per screen        |
| `secondary`   | `secondary`   | `secondary-foreground`   | none     | Secondary actions                   |
| `destructive` | `destructive` | `destructive-foreground` | none     | Dangerous/destructive actions       |
| `outline`     | transparent   | `foreground`             | `border` | Tertiary actions, form cancel       |
| `ghost`       | transparent   | `foreground`             | none     | Subtle: toolbar, sidebar hover      |
| `link`        | transparent   | `primary`                | none     | Inline navigation                   |
| `ai`          | `ai`          | `ai-foreground`          | none     | AI Copilot actions (custom variant) |

### 11.2 Sizes

| Size      | Height | Padding X | Padding Y | Font Size | Icon Size | Tailwind                   |
| --------- | ------ | --------- | --------- | --------- | --------- | -------------------------- |
| `sm`      | 32px   | 12px      | 6px       | 12px      | 16px      | `h-8 px-3 py-1.5 text-xs`  |
| `default` | 40px   | 16px      | 8px       | 14px      | 18px      | `h-10 px-4 py-2 text-sm`   |
| `lg`      | 48px   | 24px      | 12px      | 16px      | 20px      | `h-12 px-6 py-3 text-base` |
| `icon`    | 40px   | 0         | 0         | —         | 18px      | `h-10 w-10`                |

### 11.3 States

| State              | Visual Change                            | Accessibility                                                                                         |
| ------------------ | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **default**        | Base appearance                          | —                                                                                                     |
| **hover**          | Background darkens one step              | `cursor: pointer`                                                                                     |
| **active/pressed** | Background darkens two steps             | —                                                                                                     |
| **focus-visible**  | 2px ring, 2px offset (`ring` color)      | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` |
| **disabled**       | Opacity 0.5, `cursor: not-allowed`       | `disabled:pointer-events-none disabled:opacity-50`                                                    |
| **loading**        | Spinner replaces icon/label, opacity 0.7 | `aria-busy="true"`, screen reader: "Loading..."                                                       |

### 11.4 Anatomy

```
┌─────────────────────────────────────────┐
│  [icon-leading]  Label Text  [icon-trailing]  │
└─────────────────────────────────────────┘
     ↑                            ↑
  optional                  optional
```

### 11.5 shadcn/ui Implementation

```tsx
// components/ui/button.tsx — shadcn default + Sprintio customizations
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // Sprintio custom: AI Copilot button
        ai: 'bg-ai text-ai-foreground shadow-sm hover:bg-ai/90',
      },
      size: {
        sm: 'h-8 rounded-md px-3 text-xs',
        default: 'h-10 px-4 py-2',
        lg: 'h-12 rounded-md px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

### 11.6 Usage Examples

```tsx
// Primary CTA
<Button>Create Task</Button>

// Loading state
<Button loading>Saving...</Button>

// Destructive
<Button variant="destructive">Delete Sprint</Button>

// Icon button
<Button variant="ghost" size="icon"><Plus className="h-4 w-4" /></Button>

// AI Copilot action
<Button variant="ai"><Sparkles className="h-4 w-4" /> Generate Summary</Button>

// As child (composable with router Link)
<Button asChild><Link to="/settings">Settings</Link></Button>
```

### 11.7 Button Spacing Summary

| Element             | Margin/Padding | Value       |
| ------------------- | -------------- | ----------- |
| Icon ↔ Label gap    | `gap-2`        | 8px         |
| Button (sm) padding | `px-3 py-1.5`  | 12px × 6px  |
| Button (md) padding | `px-4 py-2`    | 16px × 8px  |
| Button (lg) padding | `px-6 py-3`    | 24px × 12px |
| Button group gap    | `gap-2`        | 8px         |
| Button → below text | `mt-2`         | 8px         |

---

## 12. Component: Card

### 12.1 Variants

| Variant       | Shadow                             | Border               | Background         | Use Case                             |
| ------------- | ---------------------------------- | -------------------- | ------------------ | ------------------------------------ |
| `default`     | `shadow-sm`                        | 1px `border-default` | `card` (white)     | Standard task card, content card     |
| `elevated`    | `shadow-md`                        | none                 | `card`             | Prominent content, dashboard widgets |
| `outline`     | none                               | 1px `border-default` | transparent        | Subtle container, grouped content    |
| `interactive` | `shadow-sm` → `shadow-md` on hover | 1px `border-default` | `card`             | Clickable card (task card on board)  |
| `selected`    | `shadow-sm`                        | 2px `border-focus`   | `bg-card-selected` | Selected task card                   |

### 12.2 Anatomy

```
┌─────────────────────────────────────────┐
│ CardHeader                              │
│   CardTitle          [optional actions] │
│   CardDescription                       │
├─────────────────────────────────────────┤
│ CardContent                             │
│   Main content area                     │
│                                         │
├─────────────────────────────────────────┤
│ CardFooter                              │
│              [Cancel] [Save]            │
└─────────────────────────────────────────┘
```

### 12.3 Spacing

| Element                     | Padding                       | Value                   |
| --------------------------- | ----------------------------- | ----------------------- |
| Card padding                | `p-6`                         | 24px                    |
| Card compact                | `p-4`                         | 16px                    |
| CardHeader → CardContent    | `gap-4` (via `space-y-0`)     | 16px implied by padding |
| CardTitle → CardDescription | `gap-1.5` (via `space-y-1.5`) | 6px                     |
| CardContent → CardFooter    | `gap-4` (via `space-y-0`)     | 16px implied by padding |
| Card horizontal gap (grid)  | `gap-4`                       | 16px                    |

### 12.4 States

| State               | Background           | Border             | Shadow      | Cursor      |
| ------------------- | -------------------- | ------------------ | ----------- | ----------- |
| default             | `card`               | `border-default`   | `shadow-sm` | default     |
| hover (interactive) | `card-hover`         | `border-strong`    | `shadow-md` | pointer     |
| selected            | `bg-card-selected`   | 2px `border-focus` | `shadow-sm` | pointer     |
| disabled            | `card` + opacity 0.5 | `border-default`   | none        | not-allowed |

### 12.5 Sprintio Task Card Specific

```
┌─────────────────────────────────────────┐
│ ┃ SIO-245                               │  ← 2px left border (status color)
│                                          │
│ Implement user authentication            │  ← body-sm, text-primary
│                                          │
│ 🔵 frontend  🟣 feature                 │  ← label pills
│                                          │
│ ○ Due: Jul 15              ← P1         │  ← body-xs, text-tertiary
└─────────────────────────────────────────┘

Status → Left border color:
  Backlog:     gray-400 (#9CA3AF)
  To Do:       blue-500 (#3B82F6)
  In Progress: amber-500 (#F59E0B)
  In Review:   purple-500 (#A855F7)
  Done:        green-500 (#22C55E)
  Cancelled:   red-500 (#EF4444)
```

### 12.6 shadcn/ui Implementation

```tsx
// components/ui/card.tsx — Sprintio version
import * as React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'elevated' | 'outline' | 'interactive' | 'selected';
  }
>(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border bg-card text-card-foreground shadow-sm',
      {
        'shadow-md border-0': variant === 'elevated',
        'border shadow-none bg-transparent': variant === 'outline',
        'hover:shadow-md hover:border-border-strong transition-all duration-200 cursor-pointer':
          variant === 'interactive',
        'border-2 border-ring bg-primary/5': variant === 'selected',
      },
      className,
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```

### 12.7 Usage Examples

```tsx
// Standard card
<Card>
  <CardHeader>
    <CardTitle>Analytics</CardTitle>
    <CardDescription>View your sprint metrics</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Content here</p>
  </CardContent>
</Card>

// Interactive task card (board view)
<Card variant="interactive" className="border-l-4 border-l-amber-500">
  <CardContent className="p-4">
    <span className="font-mono text-xs text-muted-foreground">SIO-245</span>
    <p className="text-sm mt-1">Implement auth flow</p>
    <div className="flex gap-2 mt-3">
      <Badge variant="secondary">frontend</Badge>
      <Badge variant="outline">P1</Badge>
    </div>
  </CardContent>
</Card>

// Elevated dashboard card
<Card variant="elevated">
  <CardContent className="p-6">
    <h3 className="text-2xl font-bold">42</h3>
    <p className="text-sm text-muted-foreground">Tasks completed</p>
  </CardContent>
</Card>
```

---

## 13. Component: Input

### 13.1 Variants

| Variant     | Description                      | Use Case                     |
| ----------- | -------------------------------- | ---------------------------- |
| `default`   | Standard text input              | Forms, search, settings      |
| `with-icon` | Input with leading/trailing icon | Search, email                |
| `textarea`  | Multi-line text                  | Descriptions, comments, docs |
| `select`    | Dropdown selection               | Status, priority, assignee   |
| `checkbox`  | Boolean toggle                   | Filters, settings            |
| `radio`     | Single selection                 | Option groups                |
| `switch`    | Toggle switch                    | On/off settings              |

### 13.2 Sizes

| Size      | Height | Padding   | Font Size | Tailwind                   |
| --------- | ------ | --------- | --------- | -------------------------- |
| `sm`      | 32px   | 8px 12px  | 14px      | `h-8 px-3 py-1 text-sm`    |
| `default` | 40px   | 8px 12px  | 14px      | `h-10 px-3 py-2 text-sm`   |
| `lg`      | 48px   | 12px 16px | 16px      | `h-12 px-4 py-3 text-base` |

### 13.3 States

| State        | Border                      | Background                     | Ring                                                      | Text Color     |
| ------------ | --------------------------- | ------------------------------ | --------------------------------------------------------- | -------------- |
| **default**  | `border-default` (gray-200) | `bg-input` (white)             | none                                                      | `text-primary` |
| **hover**    | `border-strong` (gray-300)  | `bg-input`                     | none                                                      | `text-primary` |
| **focus**    | `border-focus` (indigo-500) | `bg-input`                     | `ring focus-visible:ring-2 focus-visible:ring-ring/20`    | `text-primary` |
| **error**    | `border-error` (red-500)    | `bg-input`                     | `ring focus-visible:ring-2 focus-visible:ring-red-500/20` | `text-primary` |
| **disabled** | `border-default`            | `bg-input-disabled` (gray-100) | none                                                      | `text-muted`   |

### 13.4 Anatomy

```
Label (optional)              ← label-md (14px, medium, text-secondary)
  ┌─────────────────────────────────────────┐
  │ [icon] Placeholder/Value     [action]   │
  └─────────────────────────────────────────┘
Helper text or error message   ← body-xs (12px, text-tertiary or red-600)
```

### 13.5 Spacing

| Element                   | Spacing     | Value      |
| ------------------------- | ----------- | ---------- |
| Label → Input             | `mt-2`      | 8px        |
| Input padding             | `px-3 py-2` | 12px × 8px |
| Input → Helper/Error      | `mt-1.5`    | 6px        |
| Form field → Form field   | `space-y-6` | 24px       |
| Leading icon → Input text | `gap-2`     | 8px        |
| Input → Trailing action   | `gap-2`     | 8px        |

### 13.6 Border Radius

| Element    | Radius                |
| ---------- | --------------------- |
| Text input | `rounded-md` (6px)    |
| Textarea   | `rounded-md` (6px)    |
| Select     | `rounded-md` (6px)    |
| Checkbox   | `rounded` (4px)       |
| Switch     | `rounded-full` (pill) |

### 13.7 Focus Ring Specification

```css
/* Standard focus ring — all interactive elements */
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2

/* Error focus ring */
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20
```

| Property         | Value                      |
| ---------------- | -------------------------- |
| Ring width       | 2px                        |
| Ring offset      | 2px (background color gap) |
| Ring color       | `ring` (indigo-500)        |
| Error ring color | `red-500` at 20% opacity   |

### 13.8 shadcn/ui Implementation

```tsx
// components/ui/input.tsx — Sprintio version
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border bg-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive/20',
          className,
        )}
        ref={ref}
        aria-invalid={error || undefined}
        aria-describedby={error ? `${props.id}-error` : undefined}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

// Textarea — same styling, multi-line
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
>(({ className, error, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border bg-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-destructive focus-visible:ring-destructive/20',
        className,
      )}
      ref={ref}
      aria-invalid={error || undefined}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Input, Textarea };
```

### 13.9 Form Pattern with Validation

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  assignee: z.string().email('Invalid email'),
});

export function CreateTaskForm() {
  const form = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', description: '', assignee: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(console.log)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Implement dark mode toggle" {...field} />
              </FormControl>
              <FormDescription className="text-xs text-muted-foreground">
                Be specific — "Fix login bug" not "Fix things"
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Create Task</Button>
      </form>
    </Form>
  );
}
```

### 13.10 Input Accessibility

| Rule                     | Implementation                                                         |
| ------------------------ | ---------------------------------------------------------------------- |
| **Label always present** | Visually hidden `<FormLabel>` or `aria-label` — never placeholder-only |
| **Error messaging**      | `aria-invalid="true"` + `aria-describedby` pointing to error message   |
| **Error role**           | `<FormMessage>` has implicit `role="alert"`                            |
| **Required fields**      | `aria-required="true"` + visual asterisk `*` in label                  |
| **Disabled state**       | `disabled` attr + `opacity-50` + `cursor-not-allowed`                  |
| **Autocomplete**         | `autocomplete` attribute on all common fields                          |

---

## 14. Component: Modal (Dialog)

### 14.1 Sizes

| Size      | Max Width          | Use Case                     | Tailwind                   |
| --------- | ------------------ | ---------------------------- | -------------------------- |
| `sm`      | 384px              | Simple confirmations, alerts | `max-w-sm`                 |
| `default` | 512px              | Standard dialogs, forms      | `max-w-lg`                 |
| `lg`      | 640px              | Complex forms, detail views  | `max-w-2xl`                |
| `xl`      | 768px              | Data-heavy dialogs, reports  | `max-w-3xl`                |
| `full`    | calc(100vw - 32px) | Mobile full-screen           | `max-w-[calc(100vw-2rem)]` |

### 14.2 Anatomy

```
┌───────────────────────────────────────────┐
│ Dialog Header                          [×]│
│   Title                                   │  ← heading-lg (20px, semibold)
│   Description                             │  ← body-sm (14px, text-secondary)
├───────────────────────────────────────────┤
│ Dialog Content                            │  ← scrollable if overflow
│                                           │
│   (scrollable area with padding)          │
│                                           │
├───────────────────────────────────────────┤
│ Dialog Footer                             │
│                     [Cancel] [Confirm]     │  ← secondary + primary buttons
└───────────────────────────────────────────┘
```

### 14.3 Spacing

| Element                  | Spacing                  | Value                                 |
| ------------------------ | ------------------------ | ------------------------------------- |
| Dialog padding           | `p-6`                    | 24px                                  |
| Header → Content gap     | implicit (p-6 on each)   | 0 (separated by header/content areas) |
| Title → Description      | `mt-1.5`                 | 6px                                   |
| Content internal padding | `py-4`                   | 16px top/bottom                       |
| Footer internal padding  | `py-4`                   | 16px top/bottom                       |
| Footer button gap        | `gap-2`                  | 8px                                   |
| Close button position    | `absolute top-4 right-4` | 16px from top-right                   |
| Modal overlay → Content  | `p-4 sm:p-6`             | 16px mobile, 24px desktop             |

### 14.4 Overlay

| Property       | Value                                                           |
| -------------- | --------------------------------------------------------------- |
| Background     | `bg-overlay` (`rgba(0,0,0,0.5)` light / `rgba(0,0,0,0.7)` dark) |
| Backdrop blur  | `backdrop-blur-sm` (optional)                                   |
| Click behavior | Clicking overlay closes dialog                                  |
| Animation      | `fade-in` 200ms + `scale-in` 200ms                              |

### 14.5 States

| Element        | State   | Visual                 |
| -------------- | ------- | ---------------------- |
| Overlay        | visible | `animate-fade-in`      |
| Content        | visible | `animate-scale-in`     |
| Close button   | default | ghost button, `X` icon |
| Close button   | hover   | `bg-accent` background |
| Close button   | focus   | ring ring-offset-2     |
| Confirm button | loading | Spinner + disabled     |

### 14.6 Focus Management

```
1. Dialog opens → focus moves to first focusable element (typically close button or first input)
2. Tab cycles through dialog content only (focus trap)
3. Escape key closes dialog
4. Dialog closes → focus returns to trigger element
```

### 14.7 Alert Dialog (Confirmation)

```
┌───────────────────────────────────────────┐
│ ⚠️  Are you absolutely sure?              │  ← warning icon + heading
│                                           │
│ This action cannot be undone. This will   │
│ permanently delete your account and       │
│ remove all data from servers.             │  ← body-sm, text-secondary
│                                           │
├───────────────────────────────────────────┤
│                     [Cancel] [Continue]    │  ← outline + destructive
└───────────────────────────────────────────┘
```

### 14.8 shadcn/ui Implementation

```tsx
// components/ui/dialog.tsx — Sprintio version
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    size?: 'sm' | 'default' | 'lg' | 'xl';
  }
>(({ className, children, size = 'default', ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-scale-in data-[state=closed]:animate-fade-out sm:rounded-xl',
        {
          'max-w-sm': size === 'sm',
          'max-w-lg': size === 'default',
          'max-w-2xl': size === 'lg',
          'max-w-3xl': size === 'xl',
        },
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
```

### 14.9 Usage Examples

```tsx
// Standard dialog (create task form)
<Dialog>
  <DialogTrigger asChild>
    <Button>Create Task</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create New Task</DialogTitle>
      <DialogDescription>Add a task to your sprint backlog.</DialogDescription>
    </DialogHeader>
    {/* Form content here */}
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button type="submit">Create</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Alert dialog (destructive confirmation)
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete Sprint</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently delete "Sprint 14" and all 42 tasks. This cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        Delete Sprint
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

// Large dialog (task detail view)
<Dialog>
  <DialogContent size="lg">
    {/* Full task detail form */}
  </DialogContent>
</Dialog>
```

### 14.10 Dialog Accessibility

| Rule                       | Implementation                                                   |
| -------------------------- | ---------------------------------------------------------------- |
| **Focus trap**             | Radix UI handles automatically — Tab cycles within dialog only   |
| **Escape to close**        | Radix UI handles automatically                                   |
| **Return focus**           | Radix UI returns focus to trigger element on close               |
| **Overlay click to close** | Clicking overlay triggers close                                  |
| **Screen reader**          | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` to title |
| **Close button**           | `sr-only` text "Close" for screen readers                        |
| **Heading hierarchy**      | DialogTitle is a single heading within the dialog landmark       |

---

## 15. Dark Mode Strategy

### 15.1 Implementation

```typescript
// Toggle dark mode
function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('sprintio-theme', isDark ? 'dark' : 'light');
}

// Initialize on load (before paint)
if (
  localStorage.getItem('sprintio-theme') === 'dark' ||
  (!('sprintio-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
  document.documentElement.classList.add('dark');
}
```

### 15.2 Dark Mode Rules

| Rule                            | Details                                                                    |
| ------------------------------- | -------------------------------------------------------------------------- |
| **CSS vars swap, code stays**   | Component JSX never changes — only `:root` vs `.dark` variable values swap |
| **Shadows increase**            | Dark bg absorbs light; shadows need more opacity (see §6.2)                |
| **Status colors are invariant** | Red, green, amber, blue, purple stay the same in dark mode                 |
| **Brand colors are invariant**  | `indigo-500` stays `#6366F1` in both modes                                 |
| **Body text softens**           | Pure white on dark bg is harsh → use `gray-50` or `gray-200`               |
| **Borders lighten slightly**    | Dark borders need to be slightly brighter to be visible                    |
| **Depth = brightness**          | Elevation communicated by lighter shades, NOT box-shadow                   |

### 15.3 Surface Elevation (Dark Mode)

```
Level 0:  Page bg        → #0F172A (slate-900) — darkest
Level 1:  Card bg        → #1E293B (slate-800) — one step lighter
Level 2:  Dropdown bg    → #334155 (slate-700) — two steps lighter
Level 3:  Tooltip bg     → #475569 (slate-600) — three steps lighter
```

---

## 16. File Structure

### 16.1 Design System Files (this document + future splits)

```
Design-System/
├── DESIGN-SYSTEM-CONSOLIDATED.md   ← THIS FILE (master reference)
├── 01-SPACING.md                   ← (future) Spacing tokens + usage
├── 02-TOKENS.md                    ← (future) All design tokens
├── 03-TAILWIND-CONFIG.md           ← (future) tailwind.config.ts
├── 04-SHADCN-STRATEGY.md           ← (future) shadcn/ui setup + patterns
├── 05-BUTTONS.md                   ← (future) Button component spec
├── 06-CARDS.md                     ← (future) Card component spec
├── 07-INPUTS.md                    ← (future) Input component spec
└── 08-MODALS.md                    ← (future) Modal/Dialog component spec
```

### 16.2 Project File Structure (after scaffolding)

```
src/
├── components/
│   ├── ui/                          ← shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── select.tsx
│   │   ├── checkbox.tsx
│   │   ├── switch.tsx
│   │   ├── dialog.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── sheet.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── tabs.tsx
│   │   ├── tooltip.tsx
│   │   ├── separator.tsx
│   │   └── ...
│   └── sprintio/                    ← Sprintio-specific components
│       ├── task-card.tsx
│       ├── board-column.tsx
│       ├── status-badge.tsx
│       ├── priority-badge.tsx
│       ├── label-pill.tsx
│       ├── sidebar.tsx
│       └── ...
├── lib/
│   └── utils.ts                     ← cn() utility
├── hooks/
│   ├── use-theme.ts                 ← Dark mode hook
│   └── ...
├── styles/
│   └── globals.css                  ← CSS variables (light + dark)
└── ...
```

---

## Appendix A: Quick Reference Card

### CSS Variable → Tailwind Mapping

| CSS Variable                | Tailwind Class            | Example                   |
| --------------------------- | ------------------------- | ------------------------- |
| `var(--background)`         | `bg-background`           | `bg-background`           |
| `var(--foreground)`         | `text-foreground`         | `text-foreground`         |
| `var(--primary)`            | `bg-primary`              | `bg-primary`              |
| `var(--primary)`            | `text-primary`            | `text-primary`            |
| `var(--primary-foreground)` | `text-primary-foreground` | `text-primary-foreground` |
| `var(--muted)`              | `bg-muted`                | `bg-muted`                |
| `var(--muted-foreground)`   | `text-muted-foreground`   | `text-muted-foreground`   |
| `var(--border)`             | `border-border`           | `border border-border`    |
| `var(--ring)`               | `ring-ring`               | `ring-2 ring-ring`        |
| `var(--destructive)`        | `bg-destructive`          | `bg-destructive`          |
| `var(--card)`               | `bg-card`                 | `bg-card`                 |
| `var(--accent)`             | `bg-accent`               | `hover:bg-accent`         |

### Status → Color Quick Map

| Status      | Dot Color    | Badge BG    | Badge Text   | Left Border  |
| ----------- | ------------ | ----------- | ------------ | ------------ |
| Backlog     | `gray-400`   | `gray-100`  | `gray-700`   | `gray-400`   |
| To Do       | `blue-500`   | `blue-50`   | `blue-700`   | `blue-500`   |
| In Progress | `amber-500`  | `amber-50`  | `amber-700`  | `amber-500`  |
| In Review   | `purple-500` | `purple-50` | `purple-700` | `purple-500` |
| Done        | `green-500`  | `green-50`  | `green-700`  | `green-500`  |
| Cancelled   | `red-500`    | `red-50`    | `red-700`    | `red-500`    |

### Focus Ring Quick Reference

```tsx
// All interactive elements:
className =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

// Error state:
className = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/20';
```

---

> **Status:** Ready for review. After approval, this can be split into 8 individual files.
