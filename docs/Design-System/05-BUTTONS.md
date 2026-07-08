# Sprintio — Button Component

> Part of the Sprintio Design System
> Version: 1.0 | Date: 2026-07-08
> Primary interactive element — the most-used component in Sprintio

---

## Table of Contents

1. [Overview](#1-overview)
2. [Installation](#2-installation)
3. [Variants](#3-variants)
4. [Sizes](#4-sizes)
5. [States](#5-states)
6. [Props API](#6-props-api)
7. [Spacing Reference](#7-spacing-reference)
8. [Usage Patterns](#8-usage-patterns)
9. [Composition Examples](#9-composition-examples)
10. [Accessibility](#10-accessibility)
11. [Don'ts](#11-donts)

---

## 1. Overview

Buttons are the primary interactive element in Sprintio. Every button must:

- Use a **single primary action per screen**
- Have a clear, actionable label (verb + noun)
- Include loading states for async actions
- Support keyboard and screen reader navigation

### Anatomy

```
┌──────────────────────────────────────┐
│  [  Leading Icon  ]  Label  [ Trailing ] │
│  [ optional      ]         [ Icon     ] │
└──────────────────────────────────────┘
        ↓          ↓           ↓
   gap: 2 (8px)  text       gap: 2 (8px)
```

| Zone | Required | Notes |
|------|----------|-------|
| Leading icon | No | Usually an action-related Lucide icon |
| Label | Yes | Verb + noun ("Create Task") |
| Trailing icon | No | For dropdowns, external links |
| Loading spinner | No | Replaces leading icon during async |

---

## 2. Installation

```bash
# From 21st.dev (recommended — UntitledUI variant for extra polish)
npx shadcn@latest add "https://21st.dev/r/untitledui/button?api_key=YOUR_KEY"

# Fallback — standard shadcn/ui
npx shadcn@latest add button
```

After installation, customize via the CSS variable layer in `globals.css` — not by editing the component file.

---

## 3. Variants

### 3.1 Primary (Default)

The most prominent button. One per screen/view.

| Property | Value |
|----------|-------|
| Background | `bg-primary` (`hsl(var(--primary))` → indigo-500) |
| Text | `text-primary-foreground` (white) |
| Border | none |
| Usage | Primary CTA — "Create Task", "Save Changes", "Submit" |

```tsx
<Button>Create Task</Button>
```

### 3.2 Secondary

Medium emphasis. For secondary actions alongside primary.

| Property | Value |
|----------|-------|
| Background | `bg-secondary` (gray-100 light / slate-800 dark) |
| Text | `text-secondary-foreground` (gray-900 / gray-50) |
| Border | none |
| Usage | "Cancel", "Skip", "Export", "View All" |

```tsx
<Button variant="secondary">Cancel</Button>
```

### 3.3 Ghost

Minimal emphasis. For actions inside toolbars or alongside primary buttons.

| Property | Value |
|----------|-------|
| Background | transparent |
| Text | `text-muted-foreground` (gray-500) |
| Border | none |
| Usage | Toolbar actions, icon buttons, inline actions |

```tsx
<Button variant="ghost">Copy</Button>
```

### 3.4 Destructive

Danger actions — delete, remove, archive. Always with confirmation.

| Property | Value |
|----------|-------|
| Background | `bg-destructive` (red-500) |
| Text | `text-destructive-foreground` (white) |
| Border | none |
| Usage | "Delete Task", "Remove Member", "Archive Project" |

```tsx
<Button variant="destructive">Delete Task</Button>
```

### 3.5 Outline

Bordered but no fill. For tertiary actions or toggled states.

| Property | Value |
|----------|-------|
| Background | transparent |
| Text | `text-foreground` |
| Border | `border border-border` (gray-200) |
| Usage | "Download", toggled filter chips |

```tsx
<Button variant="outline">Download</Button>
```

### 3.6 AI / Copilot

Reserved for AI-related actions. Uses violet brand.

| Property | Value |
|----------|-------|
| Background | `bg-violet-500` |
| Text | `text-white` |
| Border | none |
| Usage | "Generate with AI", "Auto-assign", "AI Summary" |

```tsx
<Button variant="ai">
  <Sparkles className="h-4 w-4" />
  Generate with AI
</Button>
```

### 3.7 Link

Looks like a text link. For inline navigation.

| Property | Value |
|----------|-------|
| Background | transparent |
| Text | `text-primary underline-offset-4 hover:underline` |
| Border | none |
| Usage | Inline text links, "Learn more" |

```tsx
<Button variant="link">Learn more</Button>
```

---

## 4. Sizes

### 4.1 Size Scale

| Size | Height | Padding (x) | Gap | Text Size | Tailwind Classes |
|------|--------|-------------|-----|-----------|------------------|
| `sm` | 32px (h-8) | 12px (px-3) | 6px (gap-1.5) | 12px (`text-xs`) | `h-8 px-3 gap-1.5 text-xs` |
| `md` (default) | 36px (h-9) | 16px (px-4) | 8px (gap-2) | 14px (`text-sm`) | `h-9 px-4 gap-2 text-sm` |
| `lg` | 40px (h-10) | 24px (px-6) | 8px (gap-2) | 16px (`text-base`) | `h-10 px-6 gap-2 text-base` |
| `xl` | 48px (h-12) | 32px (px-8) | 8px (gap-2) | 18px (`text-lg`) | `h-12 px-8 gap-2 text-lg` |
| `icon` | 36px (h-9) | 0 (p-0) | — | — | `h-9 w-9` |
| `icon-sm` | 32px (h-8) | 0 (p-0) | — | — | `h-8 w-8` |
| `icon-lg` | 40px (h-10) | 0 (p-0) | — | — | `h-10 w-10` |

### 4.2 Icon-Only Buttons

For icon-only buttons, always add `aria-label`:

```tsx
<Button variant="ghost" size="icon" aria-label="More options">
  <MoreHorizontal className="h-4 w-4" />
</Button>
```

| Icon Size | Button Size | Icon Class |
|-----------|------------|------------|
| Small | `icon-sm` (h-8) | `h-3.5 w-3.5` |
| Default | `icon` (h-9) | `h-4 w-4` |
| Large | `icon-lg` (h-10) | `h-5 w-5` |

---

## 5. States

### 5.1 State Matrix

| State | Background | Text | Border | Cursor |
|-------|-----------|------|--------|--------|
| Default | variant color | variant text | variant border | pointer |
| Hover | variant color **darkened** | same | same | pointer |
| Focus | same | same | + `ring-2 ring-ring ring-offset-2` | pointer |
| Active/Pressed | variant color **darkest** | same | same | pointer |
| Disabled | `bg-muted` (gray-100) | `text-muted` (gray-400) | `border-border` | not-allowed |
| Loading | same as default | same | same | wait |

### 5.2 Hover States (Color Shifts)

| Variant | Default BG | Hover BG | Active BG |
|---------|-----------|----------|-----------|
| Primary | indigo-500 | indigo-600 | indigo-700 |
| Secondary | gray-100 | gray-200 | gray-300 |
| Ghost | transparent | gray-100 | gray-200 |
| Destructive | red-500 | red-600 | red-700 |
| Outline | transparent | gray-50 | gray-100 |
| AI | violet-500 | violet-600 | violet-700 |

### 5.3 Focus Ring Specification

```
Ring color:     ring-ring (indigo-500)
Ring width:     2px (ring-2)
Ring offset:    2px (ring-offset-2)
Ring offset bg: ring-offset-background (page bg)
```

Visible on all variants in both light and dark mode.

### 5.4 Loading State

```tsx
<Button disabled>
  <Loader2 className="h-4 w-4 animate-spin" />
  Saving...
</Button>
```

| Property | Value |
|----------|-------|
| Spinner | `Loader2` from lucide-react with `animate-spin` |
| Spinner size | Same as icon size (h-4 w-4 for md) |
| Label | Changed to progressive verb: "Saving...", "Creating...", "Deleting..." |
| Button | `disabled` (prevents double-click) |
| Cursor | `wait` |

---

## 6. Props API

### 6.1 TypeScript Interface

```tsx
import { ButtonHTMLAttributes } from 'react'
import { VariantProps } from 'class-variance-authority'

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Show loading spinner and disable button */
  loading?: boolean
  /** Render as icon-only button (auto-adds aria-label requirement) */
  icon?: boolean
  /** Icon to show before label */
  leftIcon?: React.ReactNode
  /** Icon to show after label */
  rightIcon?: React.ReactNode
}
```

### 6.2 Variant Definitions (CVA)

```tsx
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  /* Base classes — shared across all variants */
  'inline-flex items-center justify-center whitespace-nowrap rounded-md
   text-sm font-medium transition-colors duration-150
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
   focus-visible:ring-offset-2 focus-visible:ring-offset-background
   disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground',
        link:
          'text-primary underline-offset-4 hover:underline',
        ai:
          'bg-violet-500 text-white hover:bg-violet-600',
      },
      size: {
        default: 'h-9 px-4 gap-2 text-sm',
        sm: 'h-8 px-3 gap-1.5 text-xs',
        lg: 'h-10 px-6 gap-2 text-base',
        xl: 'h-12 px-8 gap-2 text-lg',
        icon: 'h-9 w-9',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)
```

---

## 7. Spacing Reference

### 7.1 Internal Padding

| Size | Padding Y | Padding X | Gap (icon↔text) |
|------|----------|-----------|-----------------|
| `sm` | 6px | 12px | 6px |
| `md` | 8px | 16px | 8px |
| `lg` | 12px | 24px | 8px |
| `xl` | 16px | 32px | 8px |
| `icon` | 0 | 0 | — |
| `icon-sm` | 0 | 0 | — |
| `icon-lg` | 0 | 0 | — |

### 7.2 Border Radius

| Element | Radius | Tailwind |
|---------|--------|----------|
| Button (all sizes) | 6px | `rounded-md` |

### 7.3 Button Group Spacing

When buttons appear together (e.g., "Cancel" + "Save"):

| Pattern | Gap | Tailwind |
|---------|-----|----------|
| Horizontal button group | 8px | `gap-2` |
| Stacked buttons | 8px | `space-y-2` |
| Modal footer | 8px | `gap-2` |
| Toolbar buttons | 4px | `gap-1` |

---

## 8. Usage Patterns

### 8.1 Primary Action Placement

```
┌─────────────────────────────────────────┐
│  Page Header                            │
│  ┌──────────────────┐ ┌──────────────┐  │
│  │  ← Secondary    │  │ + Primary    │  │
│  │  (ghost: Export) │  │ (Create Task)│  │
│  └──────────────────┘ └──────────────┘  │
└─────────────────────────────────────────┘

Rule: Primary button is ALWAYS rightmost in a horizontal layout.
```

### 8.2 Modal Button Layout

```
┌──────────────────────────────────────┐
│  Modal Title                    [ × ]│
│                                      │
│  Content...                          │
│                                      │
│  ─────────────────────────────────── │
│  [ Cancel (ghost) ] [ Save (primary) ]│
└──────────────────────────────────────┘

Footer: gap-2, justify-end (right-aligned)
```

### 8.3 Form Submit

```tsx
// Full-width primary for single-action forms
<div className="space-y-4">
  <Input placeholder="Task name" />
  <Button className="w-full">Create Task</Button>
</div>
```

### 8.4 Toolbar

```tsx
// Compact ghost buttons in toolbar
<div className="flex items-center gap-1 border-b px-4 py-2">
  <Button variant="ghost" size="icon-sm">
    <Bold className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon-sm">
    <Italic className="h-4 w-4" />
  </Button>
  <Separator orientation="vertical" className="h-4" />
  <Button variant="ghost" size="icon-sm">
    <List className="h-4 w-4" />
  </Button>
</div>
```

### 8.5 With Icons

```tsx
// Leading icon
<Button>
  <Plus className="h-4 w-4" />
  Create Task
</Button>

// Trailing icon (for dropdowns / external links)
<Button variant="secondary">
  Export
  <ChevronDown className="h-4 w-4" />
</Button>

// Loading state (replaces leading icon)
<Button loading>
  <Loader2 className="h-4 w-4 animate-spin" />
  Creating...
</Button>
```

---

## 9. Composition Examples

### 9.1 Task Card Actions

```tsx
<div className="flex items-center gap-2">
  <Button size="sm" variant="ghost" className="text-gray-500">
    <MessageSquare className="h-3.5 w-3.5" />
    3
  </Button>
  <Button size="sm" variant="ghost" className="text-gray-500">
    <Paperclip className="h-3.5 w-3.5" />
    2
  </Button>
</div>
```

### 9.2 Board Column Header

```tsx
<div className="flex items-center justify-between px-3 py-2">
  <div className="flex items-center gap-2">
    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
    <span className="text-sm font-medium">In Progress</span>
    <span className="text-xs text-gray-500">12</span>
  </div>
  <Button variant="ghost" size="icon-sm" aria-label="Column options">
    <MoreHorizontal className="h-4 w-4" />
  </Button>
</div>
```

### 9.3 Danger Zone

```tsx
<div className="rounded-lg border border-red-200 bg-red-50 p-4">
  <h3 className="text-sm font-semibold text-red-700">Danger Zone</h3>
  <p className="mt-1 text-xs text-red-600">
    Once you delete this project, there is no going back.
  </p>
  <Button variant="destructive" size="sm" className="mt-3">
    <Trash2 className="h-3.5 w-3.5" />
    Delete Project
  </Button>
</div>
```

### 9.4 AI Action Button

```tsx
<Button variant="ai" size="sm">
  <Sparkles className="h-3.5 w-3.5" />
  Auto-assign with AI
</Button>
```

---

## 10. Accessibility

### 10.1 Requirements

| Requirement | Implementation |
|-------------|---------------|
| Keyboard accessible | Native `<button>` element |
| Focus visible | `ring-2 ring-ring ring-offset-2` |
| `aria-label` | Required for icon-only buttons |
| `aria-busy` | Set to `true` when loading |
| `aria-disabled` | Set when loading (button remains focusable) |
| `role="button"` | Implicit on `<button>` — never use `<div>` |
| Disabled state | Use `disabled` prop (not just visual `opacity-50`) |

### 10.2 Screen Reader Patterns

```tsx
// Icon-only button
<Button variant="ghost" size="icon" aria-label="More options">
  <MoreHorizontal className="h-4 w-4" />
</Button>
{/* Announced as: "More options, button" */}

// Loading button
<Button disabled aria-busy="true">
  <Loader2 className="h-4 w-4 animate-spin" />
  Saving...
</Button>
{/* Announced as: "Saving..., button, busy" */}
```

### 10.3 Contrast Requirements

| Variant | Text | BG | Ratio | WCAG |
|---------|------|----|-------|------|
| Primary | white (#FFF) | indigo-500 (#6366F1) | 4.56:1 | AA ✅ |
| Destructive | white (#FFF) | red-500 (#EF4444) | 4.63:1 | AA ✅ |
| AI | white (#FFF) | violet-500 (#8B5CF6) | 4.46:1 | AA ✅ |
| Secondary | gray-900 | gray-100 | 17.4:1 | AAA ✅ |
| Ghost | gray-500 | transparent (on gray-50) | 5.4:1 | AA ✅ |

### 10.4 Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus to next interactive element |
| `Shift+Tab` | Move focus to previous |
| `Enter` / `Space` | Activate button |
| `Escape` | Dismiss any open tooltip/popover |

---

## 11. Don'ts

| ❌ Don't | ✅ Do Instead |
|---------|-------------|
| Multiple primary buttons on one screen | One primary, rest secondary/ghost |
| "Click here" / "Submit" labels | Verb + noun: "Create Task", "Save Changes" |
| Use `<div onClick>` as button | Always use `<Button>` or `<button>` |
| Missing `aria-label` on icon buttons | Always add descriptive `aria-label` |
| Disable without explanation | Show loading state, not just disabled |
| Use destructive for non-danger actions | Reserve red for true danger (delete, remove) |
| Put primary action on left in modals | Primary on right, cancel on left |
| Use `w-full` on desktop buttons | Full-width only on mobile or single-action forms |
| Skip loading state on async actions | Always show feedback for >300ms actions |

---

> **Next:** [06-CARDS.md](./06-CARDS.md) — Card component specification
