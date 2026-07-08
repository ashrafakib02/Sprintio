# Sprintio — 21st.dev Component Library Strategy

> Part of the Sprintio Design System
> Version: 1.0 | Date: 2026-07-08
> 21st.dev — Curated shadcn/ui-compatible components

---

## Table of Contents

1. [Why 21st.dev](#1-why-21stdev)
2. [Installation Workflow](#2-installation-workflow)
3. [Component Selection Strategy](#3-component-selection-strategy)
4. [Component Inventory](#4-component-inventory)
5. [Brand Customization](#5-brand-customization)
6. [Dark Mode Integration](#6-dark-mode-integration)
7. [Component File Structure](#7-component-file-structure)
8. [Customization Rules](#8-customization-rules)
9. [Version Management](#9-version-management)

---

## 1. Why 21st.dev

| Aspect | 21st.dev | shadcn/ui CLI |
|--------|----------|---------------|
| Component source | Community marketplace with curated alternatives | Official shadcn/ui library |
| Compatibility | **Identical** — uses same Tailwind + CSS variable architecture | — |
| Installation | `npx shadcn@latest add "https://21st.dev/r/{author}/{slug}?api_key=..."` | `npx shadcn@latest add button` |
| Token system | Same CSS variable foundation (HSL) | Same |
| Dark mode | Same `.dark` class mechanism | Same |
| Tailwind classes | Same utility classes | Same |
| Radix UI underneath | Yes — same primitives | Yes |
| Extra options | Multiple design variants per component (e.g., UntitledUI, shadcn default) | Single style |
| MCP connected | ✅ Yes — install via Claude Code directly | ✅ Yes |

**Key insight:** 21st.dev components are **drop-in compatible** with our token system. The Tailwind utility classes, CSS variables, and dark mode mechanism are all identical. No architectural changes needed.

---

## 2. Installation Workflow

### 2.1 Install via MCP (Recommended)

When installing a component from 21st.dev, use the MCP search → get_component → copy install command flow:

```
1. Search for component on 21st.dev (via MCP)
2. Review variants (each component may have multiple author styles)
3. Get component code via MCP
4. Run the install command provided by 21st.dev
```

### 2.2 Install Command Format

```bash
# Generic format
npx shadcn@latest add "https://21st.dev/r/{author}/{component-slug}?api_key=YOUR_KEY"

# Example — installing a specific variant
npx shadcn@latest add "https://21st.dev/r/untitledui/button?api_key=YOUR_KEY"

# Example — default shadcn component (if no 21st.dev variant needed)
npx shadcn@latest add button
```

### 2.3 Local Override Strategy

After installation, components live in your codebase and can be customized:

```
src/
├── components/
│   └── ui/
│       ├── button.tsx        ← installed from 21st.dev or shadcn
│       ├── input.tsx         ← installed from 21st.dev or shadcn
│       └── ...
├── components/
│   └── sprintio/
│       ├── task-card.tsx     ← Sprintio-specific composed component
│       └── board-column.tsx  ← Sprintio-specific composed component
```

**Rule:** Base UI primitives in `components/ui/`, Sprintio-specific compositions in `components/sprintio/`.

---

## 3. Component Selection Strategy

### 3.1 Decision Matrix

For each component need, follow this priority:

| Step | Action |
|------|--------|
| 1 | Search 21st.dev for the component |
| 2 | If a suitable variant exists → install it |
| 3 | If no good 21st.dev variant → fall back to standard `npx shadcn@latest add {name}` |
| 4 | After install, customize via CSS variables (NOT component code) |
| 5 | Only modify component `.tsx` if absolutely necessary |

### 3.2 Variant Selection Criteria

When 21st.dev has multiple variants of the same component:

| Factor | Preference |
|--------|-----------|
| Design match to Sprintio style | Closer to our clean, minimal aesthetic |
| Bundle size | Lighter = better |
| Accessibility | Full Radix UI a11y support |
| TypeScript | Full type coverage |
| Dark mode | Built-in `.dark` class support |
| Props API | Standardized (same as shadcn/ui for consistency) |

---

## 4. Component Inventory

### 4.1 Core Primitives (Install First)

| Component | Priority | Source | Notes |
|-----------|----------|--------|-------|
| Button | 🔴 Critical | 21st.dev | Primary action element; get UntitledUI variant for extra polish |
| Input | 🔴 Critical | 21st.dev | Text fields; get shadcn default or UntitledUI |
| Dialog / Modal | 🔴 Critical | 21st.dev | Task creation, settings, confirmations |
| Card | 🔴 Critical | 21st.dev | Task cards, project cards, dashboard widgets |
| Badge | 🔴 Critical | 21st.dev | Status/priority badges |
| Select | 🔴 Critical | 21st.dev | Status dropdown, priority dropdown |
| Tabs | 🔴 High | 21st.dev | Board / List / Timeline views |
| Tooltip | 🟡 Medium | 21st.dev | Icon tooltips, action hints |
| Dropdown Menu | 🟡 Medium | 21st.dev | Task actions, more menu |
| Avatar | 🟡 Medium | 21st.dev | User avatars, assignees |
| Checkbox | 🟡 Medium | 21st.dev | Subtask completion |
| Label | 🟢 Low | shadcn | Simple — standard install fine |
| Separator | 🟢 Low | shadcn | Simple — standard install fine |
| Scroll Area | 🟢 Low | shadcn | Custom scrollbar for panels |

### 4.2 Sprintio-Specific Compositions (Build In-House)

| Component | Built From | Notes |
|-----------|-----------|-------|
| TaskCard | Card + Badge + Avatar + Checkbox | Drag-and-drop ready |
| BoardColumn | Card container + Header + Scroll Area | Kanban columns |
| StatusBadge | Badge + status color tokens | Standardized status display |
| PriorityBadge | Badge + priority color tokens | Standardized priority display |
| Sidebar | Navigation Menu + Avatar + Separator | Sprintio navigation |
| CommandPalette | Dialog + Input + Scroll Area | ⌘K quick actions |
| CopilotPanel | Slide-over panel + Input + Scroll Area | AI chat sidebar |
| Toast | Toast + status colors | Notifications |
| DataTable | Table + Tabs + Pagination | List view |
| OnboardingWizard | Dialog + Steps + Form | First-time user flow |

### 4.3 Future Components (Phase 2+)

| Component | Phase | Notes |
|-----------|-------|-------|
| Calendar | Phase 2 | Sprint planning |
| Gantt Chart | Phase 2 | Timeline view |
| KanbanBoard (DnD) | Phase 2 | Drag-and-drop with @dnd-kit |
| Rich Text Editor | Phase 3 | Document editing |
| File Upload | Phase 3 | Attachments |

---

## 5. Brand Customization

### 5.1 CSS Variable Layering Strategy

21st.dev/shadcn components use CSS variables. Sprintio's brand is applied by overriding these variables in `globals.css` — **never modify the component .tsx files** for color/styling.

```
┌─────────────────────────────────────────────────┐
│  Sprintio Brand Layer (globals.css)             │
│  --primary: 239 84% 67%;  ← indigo-500         │
│  --background: 236 39% 97%; ← gray-50           │
│  --border: 220 13% 91%;   ← gray-200           │
├─────────────────────────────────────────────────┤
│  shadcn/ui Default Layer (component code)       │
│  uses: bg-primary, text-primary-foreground      │
└─────────────────────────────────────────────────┘
```

### 5.2 HSL Format

All color variables use HSL **without** the `hsl()` wrapper — the wrapper is applied in the Tailwind config:

```css
/* globals.css — variable defined as raw HSL components */
--primary: 239 84% 67%;

/* tailwind.config.ts — wrapper applied */
primary: {
  DEFAULT: 'hsl(var(--primary))',
  foreground: 'hsl(var(--primary-foreground))',
}

/* Usage in components */
className="bg-primary text-primary-foreground"
```

### 5.3 What Branding Controls

| Variable | Controls | Sprintio Value |
|----------|---------|----------------|
| `--primary` | Buttons, links, active states, focus rings | `239 84% 67%` (indigo-500) |
| `--background` | Page background | `236 39% 97%` (gray-50) |
| `--card` | Card/panel surfaces | `0 0% 100%` (white) |
| `--border` | All standard borders | `220 13% 91%` (gray-200) |
| `--muted` | Secondary surfaces, disabled bg | `220 14% 96%` (gray-100) |
| `--destructive` | Delete, danger actions | `0 84% 60%` (red-500) |
| `--radius` | Base border radius | `0.5rem` (8px) |

---

## 6. Dark Mode Integration

### 6.1 How 21st.dev Components Handle Dark Mode

Components automatically respond to the `.dark` class on `<html>`:

```tsx
// Component code (unchanged for dark mode)
<Button className="bg-primary text-primary-foreground">
  Create Task
</Button>

// CSS variables swap when .dark is present
:root { --primary: 239 84% 67%; }    /* light */
.dark { --primary: 239 84% 67%; }    /* dark — same for Sprintio primary */

:root { --background: 236 39% 97%; } /* light: gray-50 */
.dark { --background: 222 47% 6%; }  /* dark: slate-900 */
```

### 6.2 Dark Mode Checklist

After installing any 21st.dev component:

| Step | Check |
|------|-------|
| 1 | Verify component reads from CSS variables (not hardcoded colors) |
| 2 | Toggle `.dark` class — verify background/foreground swap |
| 3 | Check borders visible in both modes |
| 4 | Verify text contrast in dark mode (WCAG AA) |
| 5 | Test focus ring visibility in dark mode |

---

## 7. Component File Structure

### 7.1 Generated File Layout

After installing from 21st.dev:

```
src/
├── components/
│   └── ui/
│       ├── button.tsx              ← from 21st.dev / shadcn
│       ├── button.test.tsx         ← (optional) tests
│       ├── input.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── badge.tsx
│       ├── select.tsx
│       ├── tabs.tsx
│       ├── tooltip.tsx
│       ├── dropdown-menu.tsx
│       ├── avatar.tsx
│       ├── checkbox.tsx
│       ├── label.tsx
│       ├── separator.tsx
│       ├── scroll-area.tsx
│       └── index.ts               ← barrel exports
├── components/
│   └── sprintio/
│       ├── task-card.tsx           ← composed from ui primitives
│       ├── board-column.tsx
│       ├── status-badge.tsx
│       ├── sidebar.tsx
│       └── command-palette.tsx
├── styles/
│   └── globals.css                ← CSS variables + brand layer
└── lib/
    └── utils.ts                   ← cn() helper
```

### 7.2 Component Export Pattern

```ts
// src/components/ui/index.ts

export { Button } from './button'
export type { ButtonProps } from './button'

export { Input } from './input'
export type { InputProps } from './input'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
  from './card'

// ... etc
```

---

## 8. Customization Rules

### 8.1 The Golden Rule

> **Style via CSS variables and Tailwind classes. Only modify component `.tsx` files for behavior (new props, new variants, accessibility fixes).**

### 8.2 Allowed Customizations (CSS Variables)

```css
/* ✅ OK — Change brand colors */
--primary: 239 84% 67%;     /* Change primary to any color */

/* ✅ OK — Change radius globally */
--radius: 0.5rem;

/* ✅ OK — Dark mode surface colors */
.dark { --card: 215 25% 17%; }
```

### 8.3 Allowed Customizations (Tailwind Classes on Usage)

```tsx
/* ✅ OK — Override classes at usage site */
<Button className="bg-violet-500 hover:bg-violet-600">
  AI Action
</Button>

/* ✅ OK — Size adjustments */
<Dialog className="max-w-2xl">
```

### 8.4 Allowed Customizations (Component .tsx)

```tsx
/* ✅ OK — Add a new variant */
const buttonVariants = cva("...", {
  variants: {
    variant: {
      default: "bg-primary ...",
      ai: "bg-violet-500 ...",   // ← new Sprintio-specific variant
    },
  },
})

/* ✅ OK — Add new prop */
interface ButtonProps extends VariantProps<typeof buttonVariants> {
  loading?: boolean    // ← new Sprintio prop
}
```

### 8.5 Forbidden Customizations

| ❌ Don't | Why |
|---------|-----|
| Hardcode hex colors in component files | Breaks theming |
| Add `!important` to classes | Signals specificity problem |
| Remove Radix UI a11y props | Breaks accessibility |
| Modify component API in breaking ways | Makes future updates difficult |
| Copy entire component to create a variant | Use variant system instead |
| Install same component from multiple sources | Causes conflicts |

---

## 9. Version Management

### 9.1 Tracking Installed Components

```bash
# List all installed shadcn/21st components
cat components.json
```

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

### 9.2 Updating Components

```bash
# Update a specific component (pulls latest from 21st.dev)
npx shadcn@latest add "https://21st.dev/r/{author}/{component}?api_key=YOUR_KEY" --overwrite

# Update all components
npx shadcn@latest diff
```

### 9.3 Component Checklist Before Merging

| Check | Status |
|-------|--------|
| Component installs without errors | ☐ |
| Uses CSS variables (no hardcoded colors) | ☐ |
| Dark mode works | ☐ |
| Focus ring visible | ☐ |
| Keyboard navigable | ☐ |
| `cn()` used for class merging | ☐ |
| Types exported | ☐ |
| No `any` types | ☐ |

---

> **Next:** [05-BUTTONS.md](./05-BUTTONS.md) — Button component specification
