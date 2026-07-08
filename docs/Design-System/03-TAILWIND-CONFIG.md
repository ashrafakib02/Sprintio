# Sprintio — Tailwind CSS Configuration

> Part of the Sprintio Design System
> Version: 1.0 | Date: 2026-07-08
> Tailwind CSS v4 + Vite plugin

---

## Table of Contents

1. [Setup & Installation](#1-setup--installation)
2. [Project Structure](#2-project-structure)
3. [Vite Configuration](#3-vite-configuration)
4. [Tailwind Configuration](#4-tailwind-configuration)
5. [Global Styles](#5-global-styles)
6. [Theme Mapping](#6-theme-mapping)
7. [Custom Utilities](#7-custom-utilities)
8. [Component Classes](#8-component-classes)
9. [Dark Mode Strategy](#9-dark-mode-strategy)
10. [Responsive System](#10-responsive-system)
11. [Developer Cheatsheet](#11-developer-cheatsheet)

---

## 1. Setup & Installation

### Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool |
| Tailwind CSS | 4.x | Utility-first CSS |
| Radix UI | latest | Accessible primitives |
| **@tailwindcss/vite** | latest | Vite plugin (replaces postcss) |

### Install Commands

```bash
# Create project (if starting fresh)
npm create vite@latest sprintio -- --template react-ts
cd sprintio

# Install Tailwind CSS v4 with Vite plugin
npm install tailwindcss @tailwindcss/vite

# Install dependencies for our component library
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-popover @radix-ui/react-tooltip \
  @radix-ui/react-tabs @radix-ui/react-select \
  class-variance-authority clsx tailwind-merge \
  lucide-react

# Install fonts
npm install @fontsource/inter @fontsource/jetbrains-mono
```

---

## 2. Project Structure

```
src/
├── styles/
│   └── globals.css          # CSS variables + Tailwind imports
├── lib/
│   └── utils.ts             # cn() helper (merges classnames)
├── components/
│   └── ui/                  # Reusable primitives (from 21st.dev / shadcn)
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ...
└── app/
    ├── layouts/
    ├── routes/
    └── pages/
```

---

## 3. Vite Configuration

```ts
// vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
```

### Key Change from v3

Tailwind v4 uses a **Vite plugin** instead of a PostCSS plugin. This means:
- No `postcss.config.js` needed
- No `tailwind.config.js` needed for basic setup
- Configuration moves into CSS via `@theme`

---

## 4. Tailwind Configuration

Tailwind v4 moves theme configuration from `tailwind.config.js` into CSS via the `@theme` directive.

### 4.1 Core Theme (in CSS)

```css
/* src/styles/globals.css — theme tokens */

@import "tailwindcss";

@theme {
  /* ── Colors ──────────────────────────────────────────── */

  /* Brand */
  --color-indigo-50: #EEF2FF;
  --color-indigo-100: #E0E7FF;
  --color-indigo-200: #C7D2FE;
  --color-indigo-300: #A5B4FC;
  --color-indigo-400: #818CF8;
  --color-indigo-500: #6366F1;
  --color-indigo-600: #4F46E5;
  --color-indigo-700: #4338CA;
  --color-indigo-800: #3730A3;
  --color-indigo-900: #312E81;

  /* Accent (AI) */
  --color-violet-50: #F5F3FF;
  --color-violet-100: #EDE9FE;
  --color-violet-200: #E9D5FF;
  --color-violet-300: #C4B5FD;
  --color-violet-500: #8B5CF6;
  --color-violet-600: #7C3AED;
  --color-violet-700: #6D28D9;

  /* Neutral */
  --color-gray-50: #F9FAFB;
  --color-gray-100: #F3F4F6;
  --color-gray-200: #E5E7EB;
  --color-gray-300: #D1D5DB;
  --color-gray-400: #9CA3AF;
  --color-gray-500: #6B7280;
  --color-gray-600: #4B5563;
  --color-gray-700: #374151;
  --color-gray-800: #1F2937;
  --color-gray-900: #111827;

  /* Status */
  --color-green-50: #F0FDF4;
  --color-green-100: #DCFCE7;
  --color-green-200: #BBF7D0;
  --color-green-500: #22C55E;
  --color-green-600: #16A34A;
  --color-green-700: #15803D;

  --color-red-50: #FEF2F2;
  --color-red-100: #FEE2E2;
  --color-red-200: #FECACA;
  --color-red-500: #EF4444;
  --color-red-600: #DC2626;
  --color-red-700: #B91C1C;

  --color-amber-50: #FFFBEB;
  --color-amber-100: #FEF3C7;
  --color-amber-200: #FDE68A;
  --color-amber-500: #F59E0B;
  --color-amber-600: #D97706;
  --color-amber-700: #B45309;

  --color-blue-50: #EFF6FF;
  --color-blue-100: #DBEAFE;
  --color-blue-200: #BFDBFE;
  --color-blue-500: #3B82F6;
  --color-blue-600: #2563EB;
  --color-blue-700: #1D4ED8;

  --color-purple-50: #FAF5FF;
  --color-purple-100: #F3E8FF;
  --color-purple-200: #E9D5FF;
  --color-purple-500: #A855F7;
  --color-purple-600: #9333EA;
  --color-purple-700: #7E22CE;

  --color-slate-700: #334155;
  --color-slate-800: #1E293B;
  --color-slate-900: #0F172A;

  /* ── Typography ──────────────────────────────────────── */

  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI",
    Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", "Cascadia Code",
    "SF Mono", Consolas, monospace;

  --text-2xs: 0.625rem;     /* 10px */
  --text-2xs-leading: 1rem;

  /* ── Radius ──────────────────────────────────────────── */

  --radius-sm: 2px;
  --radius-default: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-2xl: 16px;

  /* ── Shadows ─────────────────────────────────────────── */

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-drag: 0 12px 24px rgba(0, 0, 0, 0.15);
  --shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05);

  /* ── Motion ──────────────────────────────────────────── */

  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --duration-slower: 500ms;

  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### 4.2 Extended Tailwind Config

When you need additional JS-level configuration (plugins, custom utilities), create this file:

```ts
// tailwind.config.ts (optional — only for advanced config)

import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Map shadcn CSS vars to Tailwind
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
        // Sprintio-specific
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
        ai: {
          DEFAULT: 'hsl(var(--ai))',
          foreground: 'hsl(var(--ai-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
    },
  },
  plugins: [],
}

export default config
```

---

## 5. Global Styles

```css
/* src/styles/globals.css */

@import "tailwindcss";

/* Theme tokens (from section 4.1 above)
   go here — @theme { ... } block */

/* ── Shadcn-compatible layer ───────────────────────────── */
@layer base {
  :root {
    --background: 236 39% 97%;
    --foreground: 224 71% 4%;
    --card: 0 0% 100%;
    --card-foreground: 224 71% 4%;
    --popover: 0 0% 100%;
    --popover-foreground: 224 71% 4%;
    --primary: 239 84% 67%;
    --primary-foreground: 0 0% 100%;
    --secondary: 220 14% 96%;
    --secondary-foreground: 224 71% 4%;
    --muted: 220 14% 96%;
    --muted-foreground: 220 9% 46%;
    --accent: 220 14% 96%;
    --accent-foreground: 224 71% 4%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 239 84% 67%;
    --radius: 0.5rem;

    /* Sprintio */
    --success: 142 71% 45%;
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;
    --warning-foreground: 224 71% 4%;
    --error: 0 84% 60%;
    --error-foreground: 0 0% 100%;
    --info: 217 91% 60%;
    --info-foreground: 0 0% 100%;
    --ai: 263 70% 50%;
    --ai-foreground: 0 0% 100%;
  }

  .dark {
    --background: 222 47% 6%;
    --foreground: 210 40% 98%;
    --card: 215 25% 17%;
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
    --border: 215 25% 27%;
    --input: 215 25% 27%;
    --ring: 239 84% 67%;

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
  }

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

## 6. Theme Mapping

How design tokens map to Tailwind classes:

### 6.1 Background Colors

| Token | Tailwind Class | Usage |
|-------|---------------|-------|
| `--color-bg-page` | `bg-background` | Page background |
| `--color-bg-surface` | `bg-card` | Cards, panels |
| `--color-bg-surface-raised` | `bg-popover` | Dropdowns, tooltips |
| `--color-bg-input` | `bg-input` | Text inputs |
| `--color-bg-overlay` | `bg-black/50 dark:bg-black/70` | Modal backdrop |

### 6.2 Text Colors

| Token | Tailwind Class |
|-------|---------------|
| `--color-text-primary` | `text-foreground` |
| `--color-text-secondary` | `text-muted-foreground` |
| `--color-text-muted` | `text-gray-400 dark:text-gray-500` |
| `--color-text-inverse` | `text-primary-foreground` |
| `--color-text-link` | `text-primary` |

### 6.3 Border Colors

| Token | Tailwind Class |
|-------|---------------|
| `--color-border-default` | `border-border` |
| `--color-border-focus` | `ring-ring` |
| `--color-border-error` | `border-error` |

### 6.4 Status Colors

| Status | Dot/Badge | Background | Text |
|--------|-----------|------------|------|
| Done | `bg-green-500` | `bg-green-50` | `text-green-700` |
| Blocked | `bg-red-500` | `bg-red-50` | `text-red-700` |
| Warning | `bg-amber-500` | `bg-amber-50` | `text-amber-700` |
| Info | `bg-blue-500` | `bg-blue-50` | `text-blue-700` |
| AI | `bg-violet-500` | `bg-violet-50` | `text-violet-700` |

---

## 7. Custom Utilities

```css
/* src/styles/globals.css — add at bottom */

@layer utilities {
  /* ── Focus ────────────────────────────────────────────── */
  .ring-focus {
    @apply outline-none ring-2 ring-ring ring-offset-2 ring-offset-background;
  }

  /* ── Skeleton loading ─────────────────────────────────── */
  .animate-skeleton {
    @apply relative overflow-hidden bg-gray-200 dark:bg-gray-700;
  }
  .animate-skeleton::after {
    content: "";
    @apply absolute inset-0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    animation: shimmer 1.5s infinite;
  }
  .dark .animate-skeleton::after {
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.05),
      transparent
    );
  }

  /* ── Scrollbar styling ────────────────────────────────── */
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: theme("colors.gray.300") transparent;
  }
  .dark .scrollbar-thin {
    scrollbar-color: theme("colors.gray.600") transparent;
  }
  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: theme("colors.gray.300");
    border-radius: 3px;
  }
  .dark .scrollbar-thin::-webkit-scrollbar-thumb {
    background: theme("colors.gray.600");
  }

  /* ── Drag states ──────────────────────────────────────── */
  .ring-focus {
    @apply outline-none ring-2 ring-ring ring-offset-2 ring-offset-background;
  }
}
```

---

## 8. Component Classes

Extracted reusable patterns using `@apply`:

```css
@layer components {
  /* ── Card ─────────────────────────────────────────────── */
  .card {
    @apply rounded-lg border border-border bg-card p-6 shadow-sm
           transition-shadow duration-200;
  }
  .card-interactive {
    @apply card cursor-pointer hover:shadow-md;
  }
  .card-selected {
    @apply card-interactive ring-2 ring-ring ring-offset-2;
  }

  /* ── Form field ───────────────────────────────────────── */
  .form-field {
    @apply space-y-2;
  }
  .form-field > label {
    @apply text-sm font-medium text-foreground;
  }
  .form-field > .helper-text {
    @apply text-xs text-muted-foreground;
  }
  .form-field > .error-text {
    @apply text-xs text-destructive;
  }

  /* ── Status badge base ────────────────────────────────── */
  .status-badge {
    @apply inline-flex items-center gap-1.5 rounded-full
           px-2.5 py-0.5 text-xs font-medium;
  }
}
```

---

## 9. Dark Mode Strategy

### Toggle Mechanism

```tsx
// src/lib/theme.ts

type Theme = 'light' | 'dark' | 'system'

export function setTheme(theme: Theme) {
  const root = document.documentElement

  if (theme === 'system') {
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches
    root.classList.toggle('dark', prefersDark)
  } else {
    root.classList.toggle('dark', theme === 'dark')
  }

  localStorage.setItem('sprintio-theme', theme)
}

export function getTheme(): Theme {
  return (localStorage.getItem('sprintio-theme') as Theme) || 'system'
}
```

### How It Works

```
User clicks toggle
       ↓
Toggle .dark class on <html>
       ↓
CSS variables swap (globals.css .dark block)
       ↓
All Tailwind classes update instantly
       ↓
Component code is UNCHANGED
```

### What Changes (Theme-Aware)

| Token | Light | Dark |
|-------|-------|------|
| `background` | gray-50 | slate-900 |
| `card` | white | slate-800 |
| `primary` | indigo-500 | indigo-500 |
| `border` | gray-200 | slate-700 |
| `muted-foreground` | gray-500 | gray-400 |

### What Never Changes

| Token | Stays Same |
|-------|-----------|
| Status colors (green, red, amber, blue, purple) | Always same HSL |
| Brand (indigo primary, violet AI) | Always same HSL |
| Focus ring | Always indigo-500 |
| Destructive/error | Adjusts saturation only |

---

## 10. Responsive System

### Breakpoints

| Prefix | Width | Target |
|--------|-------|--------|
| (base) | <640px | Mobile phones |
| `sm:` | ≥640px | Large phones |
| `md:` | ≥768px | Tablets |
| `lg:` | ≥1024px | Small laptops |
| `xl:` | ≥1280px | Desktops |
| `2xl:` | ≥1536px | Large screens |

### Mobile-First Patterns

```tsx
// Page content padding
<main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

// Card grid — responsive columns
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">

// Sidebar → drawer on mobile
<aside className="hidden lg:block w-64">

// Stack horizontal items on mobile
<div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
```

### Key Responsive Rules

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Page padding | `px-4` (16px) | `px-6` (24px) | `px-8` (32px) |
| Card padding | `p-4` (16px) | `p-6` (24px) | `p-6` (24px) |
| Section gap | `space-y-8` | `space-y-10` | `space-y-12` |
| Grid gap | `gap-4` | `gap-5` | `gap-6` |
| Content max-width | full | `max-w-7xl` | `max-w-7xl` |
| Modal width | `w-[calc(100%-2rem)]` | `max-w-lg` | `max-w-lg` |

---

## 11. Developer Cheatsheet

### Quick Reference — Common Patterns

```tsx
// Primary button
<Button size="lg" className="w-full">
  Create Workspace
</Button>

// Ghost icon button
<Button variant="ghost" size="icon">
  <MoreHorizontal className="h-4 w-4" />
</Button>

// Card with interactive hover
<div className="card-interactive p-4">
  <h3 className="text-lg font-semibold">Task Title</h3>
</div>

// Input with label and error
<div className="form-field">
  <Label>Email</Label>
  <Input type="email" placeholder="name@company.com" />
  <p className="error-text">Invalid email</p>
</div>

// Status badge
<span className="status-badge bg-green-50 text-green-700">
  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
  Done
</span>

// Skeleton loading
<div className="animate-skeleton h-4 w-3/4 rounded" />

// Dark mode specific
<div className="text-gray-700 dark:text-gray-300">

// Theme-aware background
<div className="bg-white dark:bg-gray-800">

// Scrollbar styling
<div className="scrollbar-thin max-h-[400px] overflow-y-auto">
```

### Don'ts

| ❌ Don't | ✅ Do Instead |
|---------|-------------|
| Use arbitrary values `bg-[#6366F1]` | Use `bg-indigo-500` or CSS vars |
| Hardcode `12px` font size | Use `text-xs`, `text-sm`, etc. |
| Use inline `style={{ }}` | Use Tailwind classes |
| Bypass `cn()` for class merging | Always use the utility |
| Use `!important` | Restructure specificity |
| Write CSS files for new components | Use utility classes + component layers |

---

> **Next:** [04-21ST-DEV-STRATEGY.md](./04-21ST-DEV-STRATEGY.md) — 21st.dev integration and component library strategy
