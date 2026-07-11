# Sprintio — Card Component

> Part of the Sprintio Design System
> Version: 1.0 | Date: 2026-07-08
> Surface container — the most versatile layout primitive

---

## Table of Contents

1. [Overview](#1-overview)
2. [Installation](#2-installation)
3. [Card Anatomy](#3-card-anatomy)
4. [Variants](#4-variants)
5. [Props API](#5-props-api)
6. [Spacing Reference](#6-spacing-reference)
7. [Usage Patterns](#7-usage-patterns)
8. [Sprintio-Specific Cards](#8-sprintio-specific-cards)
9. [Accessibility](#9-accessibility)
10. [Don'ts](#10-donts)

---

## 1. Overview

Cards are Sprintio's primary surface container. They group related content, create visual hierarchy through elevation, and provide consistent structure across the entire UI.

### Card Primitives

The card system is built from four composable primitives:

| Primitive     | Purpose                                            |
| ------------- | -------------------------------------------------- |
| `Card`        | Root container with border, background, and radius |
| `CardHeader`  | Top section — title, description, actions          |
| `CardContent` | Main content area                                  |
| `CardFooter`  | Bottom section — actions, metadata                 |

### When to Use a Card

| Scenario                 | Use Card?                  |
| ------------------------ | -------------------------- |
| Task in kanban/list view | ✅ Yes                     |
| Dashboard stat widget    | ✅ Yes                     |
| Project overview         | ✅ Yes                     |
| User profile summary     | ✅ Yes                     |
| Modal content            | ❌ No — use Dialog         |
| Simple text block        | ❌ No — use div            |
| Sidebar panel            | ✅ Yes (with flat variant) |

---

## 2. Installation

```bash
# From 21st.dev
npx shadcn@latest add "https://21st.dev/r/{author}/card?api_key=YOUR_KEY"

# Fallback — standard shadcn/ui
npx shadcn@latest add card
```

After installation, brand theming happens via CSS variables in `globals.css`:

```css
:root {
  --card: 0 0% 100%; /* white */
  --card-foreground: 224 71% 4%; /* gray-900 */
}
.dark {
  --card: 215 25% 17%; /* slate-800 */
  --card-foreground: 210 40% 98%;
}
```

---

## 3. Card Anatomy

### 3.1 Default Card

```
┌──────────────────────────────────────────────────────┐
│ ← p-6 (24px) padding all sides                      │
│                                                      │
│  CardHeader (if present)                             │
│  ┌────────────────────────────────────────────────┐  │
│  │  CardTitle     ← text-lg font-semibold         │  │
│  │  CardDescription  ← text-sm text-muted-fg      │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  CardContent                                         │
│  ┌────────────────────────────────────────────────┐  │
│  │  Main content area                             │  │
│  │  No additional padding (inherits from Card)    │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  CardFooter (if present)                             │
│  ┌────────────────────────────────────────────────┐  │
│  │  Actions, metadata, timestamps                 │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 3.2 Spacing Between Primitives

| Element Pair                   | Gap                          | Tailwind      |
| ------------------------------ | ---------------------------- | ------------- |
| Card → Card (grid)             | 16px                         | `gap-4`       |
| Card → Card (comfortable grid) | 24px                         | `gap-6`       |
| CardHeader → CardContent       | implicit (via padding areas) | —             |
| CardContent → CardFooter       | implicit (via padding areas) | —             |
| CardTitle → CardDescription    | 6px                          | `space-y-1.5` |

---

## 4. Variants

### 4.1 Default

Standard bordered card. Used for most surfaces.

| Property   | Value                              |
| ---------- | ---------------------------------- |
| Background | `bg-card`                          |
| Border     | `border border-border`             |
| Radius     | `rounded-lg`                       |
| Padding    | `p-6`                              |
| Shadow     | `shadow-sm`                        |
| Usage      | Task cards, project cards, widgets |

### 4.2 Compact

Reduced padding. For dense layouts or small widgets.

| Property   | Value                                       |
| ---------- | ------------------------------------------- |
| Background | `bg-card`                                   |
| Border     | `border border-border`                      |
| Radius     | `rounded-lg`                                |
| Padding    | `p-4`                                       |
| Shadow     | `shadow-sm`                                 |
| Usage      | Dashboard stat cards, compact sidebar items |

### 4.3 Flat (No Border)

Borderless. For content grouping without visual separation.

| Property   | Value                                  |
| ---------- | -------------------------------------- |
| Background | `bg-card`                              |
| Border     | none                                   |
| Radius     | `rounded-lg`                           |
| Padding    | `p-6`                                  |
| Shadow     | none                                   |
| Usage      | Sidebar sections, nested content areas |

### 4.4 Interactive (Hoverable)

Adds hover effect. For clickable cards.

| Property   | Value                                          |
| ---------- | ---------------------------------------------- |
| Background | `bg-card` → `hover:bg-card-hover`              |
| Border     | `border border-border` → `hover:border-strong` |
| Radius     | `rounded-lg`                                   |
| Padding    | `p-6`                                          |
| Shadow     | `shadow-sm` → `hover:shadow-md`                |
| Cursor     | `cursor-pointer`                               |
| Transition | `transition-all duration-200`                  |
| Usage      | Clickable project cards, task navigation       |

### 4.5 Selected

Indicates active selection. For selected task cards.

| Property   | Value                                                  |
| ---------- | ------------------------------------------------------ |
| Background | `bg-card-selected` (indigo-50 light / indigo-900 dark) |
| Border     | `border border-focus` (indigo-500)                     |
| Ring       | `ring-2 ring-ring ring-offset-2`                       |
| Radius     | `rounded-lg`                                           |
| Padding    | `p-6`                                                  |
| Usage      | Selected task in list view, selected board card        |

### 4.6 Elevated

No border, stronger shadow. For modal-like surfaces.

| Property   | Value                            |
| ---------- | -------------------------------- |
| Background | `bg-card`                        |
| Border     | none                             |
| Radius     | `rounded-xl`                     |
| Padding    | `p-6`                            |
| Shadow     | `shadow-lg`                      |
| Usage      | Floating panels, command palette |

---

## 5. Props API

### 5.1 Card Root

```tsx
import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Make card clickable with hover effects */
  interactive?: boolean;
  /** Show selected state */
  selected?: boolean;
  /** Compact padding variant */
  compact?: boolean;
  /** Flat (no border/shadow) variant */
  flat?: boolean;
  /** Elevated variant */
  elevated?: boolean;
}
```

### 5.2 CardHeader

```tsx
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Render actions in the header (right-aligned) */
  actions?: React.ReactNode;
}
```

### 5.3 CardTitle

```tsx
interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Render as specific heading level */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}
```

### 5.4 Variant Definitions (CVA)

```tsx
const cardVariants = cva('rounded-lg border bg-card text-card-foreground', {
  variants: {
    variant: {
      default: 'border-border shadow-sm',
      compact: 'border-border shadow-sm',
      flat: 'border-transparent shadow-none',
      interactive:
        'border-border shadow-sm cursor-pointer ' +
        'hover:bg-card-hover hover:border-strong hover:shadow-md ' +
        'transition-all duration-200',
      selected: 'border-focus shadow-sm ring-2 ring-ring ring-offset-2 bg-card-selected',
      elevated: 'border-transparent shadow-lg rounded-xl',
    },
    padding: {
      default: 'p-6',
      compact: 'p-4',
      none: 'p-0',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'default',
  },
});
```

---

## 6. Spacing Reference

### 6.1 Card Padding

| Variant | Padding        | Tailwind |
| ------- | -------------- | -------- |
| Default | 24px all sides | `p-6`    |
| Compact | 16px all sides | `p-4`    |
| None    | 0              | `p-0`    |

### 6.2 Internal Spacing

| Element                     | Spacing                      | Tailwind        |
| --------------------------- | ---------------------------- | --------------- |
| CardTitle → CardDescription | 6px                          | `space-y-1.5`   |
| CardHeader → CardContent    | implicit (via padding areas) | —               |
| CardContent → CardFooter    | implicit (via padding areas) | —               |
| Footer button gap           | 8px                          | `gap-2`         |
| Close button position       | 16px from edges              | `top-4 right-4` |

### 6.3 Grid Layout

| Pattern               | Columns            | Gap     | Responsive      |
| --------------------- | ------------------ | ------- | --------------- |
| Compact card grid     | `1 sm:2 lg:3 xl:4` | `gap-4` | 1→2→3→4 cols    |
| Comfortable card grid | `1 md:2 lg:3`      | `gap-6` | 1→2→3 cols      |
| Dashboard stats       | `2 lg:4`           | `gap-4` | 2→4 cols        |
| Settings 2-col        | `1 lg:[240px_1fr]` | `gap-8` | Stack → sidebar |

---

## 7. Usage Patterns

### 7.1 Basic Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>Project Alpha</CardTitle>
    <CardDescription>Website redesign for Q3</CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground">24 tasks · 3 members · Due Aug 15</p>
  </CardContent>
  <CardFooter className="gap-2">
    <Button size="sm">View Project</Button>
    <Button size="sm" variant="ghost">
      Settings
    </Button>
  </CardFooter>
</Card>
```

### 7.2 Card with Header Actions

```tsx
<Card>
  <CardHeader
    actions={
      <Button variant="ghost" size="icon-sm" aria-label="More options">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    }
  >
    <CardTitle>Dashboard</CardTitle>
  </CardHeader>
  <CardContent>{/* Dashboard content */}</CardContent>
</Card>
```

### 7.3 Interactive Card (Project Card)

```tsx
<Card interactive onClick={() => navigate(`/projects/${id}`)}>
  <CardContent className="p-4">
    <div className="flex items-start gap-3">
      <Avatar className="h-10 w-10">
        <AvatarImage src={project.icon} />
        <AvatarFallback>{project.name[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold truncate">{project.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {project.taskCount} tasks · {project.memberCount} members
        </p>
      </div>
    </div>
  </CardContent>
</Card>
```

### 7.4 Compact Stat Card (Dashboard)

```tsx
<Card compact>
  <CardContent className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-muted-foreground">Open Tasks</p>
        <p className="text-2xl font-bold mt-1">142</p>
      </div>
      <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
        <CheckSquare className="h-5 w-5 text-blue-500" />
      </div>
    </div>
    <div className="mt-3 flex items-center gap-1 text-xs">
      <span className="text-green-600">↑ 12%</span>
      <span className="text-muted-foreground">from last week</span>
    </div>
  </CardContent>
</Card>
```

### 7.5 Flat Section Card (Sidebar)

```tsx
<Card flat>
  <CardHeader>
    <CardTitle as="h4">Members</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      {members.map((member) => (
        <div key={member.id} className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={member.avatar} />
          </Avatar>
          <span className="text-sm">{member.name}</span>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

---

## 8. Sprintio-Specific Cards

### 8.1 Task Card (Kanban Board)

The most complex card in Sprintio — used in board view.

```
┌─────────────────────────────────────────────────┐
│ ← pl-1 via left border (status color)           │
│                                                  │
│  Priority P0 (left border: red-500)             │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │  Title line                                 │ │
│  │  "Fix login redirect bug"                   │ │
│  │  text-sm font-medium                        │ │
│  ├─────────────────────────────────────────────┤ │
│  │  (optional) Description                     │ │
│  │  text-xs text-muted-foreground              │ │
│  │  line-clamp-2                               │ │
│  ├─────────────────────────────────────────────┤ │
│  │  Bottom row:                                │ │
│  │  [Status Badge] [Avatar] [Comment] [Attach]│ │
│  │  ← space-between →                          │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
└─────────────────────────────────────────────────┘
```

```tsx
function TaskCard({ task }: { task: Task }) {
  const priorityBorderColor = {
    P0: 'border-l-red-500',
    P1: 'border-l-amber-500',
    P2: 'border-l-yellow-500',
    P3: 'border-l-blue-500',
    P4: 'border-l-transparent',
  };

  return (
    <Card interactive className={`border-l-4 ${priorityBorderColor[task.priority]}`}>
      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <h4 className="text-sm font-medium leading-snug">{task.title}</h4>

        {/* Description (optional) */}
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        {/* Tags */}
        {task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.labels.map((label) => (
              <Badge key={label.id} variant="secondary" className="text-[10px]">
                {label.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} size="sm" />
            {task.assignee && (
              <Avatar className="h-5 w-5">
                <AvatarImage src={task.assignee.avatar} />
                <AvatarFallback className="text-[10px]">{task.assignee.initials}</AvatarFallback>
              </Avatar>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {task.commentCount > 0 && (
              <span className="flex items-center gap-0.5 text-xs">
                <MessageSquare className="h-3 w-3" />
                {task.commentCount}
              </span>
            )}
            {task.attachmentCount > 0 && (
              <span className="flex items-center gap-0.5 text-xs">
                <Paperclip className="h-3 w-3" />
                {task.attachmentCount}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 8.2 Project Card

```tsx
<Card interactive onClick={() => navigate(`/projects/${project.id}`)}>
  <CardContent className="p-4">
    <div className="flex items-start gap-3">
      {/* Project icon */}
      <div
        className="h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold"
        style={{ backgroundColor: project.color + '20', color: project.color }}
      >
        {project.name[0]}
      </div>

      {/* Project info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold truncate">{project.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>
      </div>
    </div>

    {/* Stats bar */}
    <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <CheckSquare className="h-3 w-3" />
        {project.taskCount}
      </span>
      <span className="flex items-center gap-1">
        <Users className="h-3 w-3" />
        {project.memberCount}
      </span>
    </div>
  </CardContent>
</Card>
```

### 8.3 Dashboard Stat Card

```tsx
interface StatCardProps {
  title: string;
  value: string | number;
  change?: { value: number; label: string };
  icon: React.ReactNode;
  iconBg?: string;
}

function StatCard({ title, value, change, icon, iconBg }: StatCardProps) {
  return (
    <Card compact>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div
            className="rounded-lg p-2"
            style={{ backgroundColor: iconBg ?? 'hsl(var(--muted))' }}
          >
            {icon}
          </div>
        </div>
        {change && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            <span className={change.value >= 0 ? 'text-green-600' : 'text-red-600'}>
              {change.value >= 0 ? '↑' : '↓'} {Math.abs(change.value)}%
            </span>
            <span className="text-muted-foreground">{change.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 9. Accessibility

### 9.1 Requirements

| Requirement         | Implementation                                           |
| ------------------- | -------------------------------------------------------- |
| Semantic HTML       | Use `<article>` for standalone cards; `<div>` for layout |
| Heading hierarchy   | CardTitle uses correct heading level (don't skip h3→h1)  |
| Interactive cards   | Full `<button>` or `<a>` wrapping (not `div onClick`)    |
| Keyboard navigation | `Tab` to focus, `Enter`/`Space` to activate              |
| Focus ring          | `focus-visible:ring-2 focus-visible:ring-ring`           |
| Color contrast      | All text meets WCAG AA (4.5:1 minimum)                   |

### 9.2 Interactive Card — Full Keyboard Support

```tsx
// ✅ Correct — card is a button element
function InteractiveCard({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border bg-card p-6
                 hover:bg-card-hover hover:shadow-md
                 focus-visible:ring-2 focus-visible:ring-ring
                 focus-visible:ring-offset-2
                 transition-all duration-200 cursor-pointer"
    >
      {children}
    </button>
  );
}
```

### 9.3 Status Color Borders

Status-colored left borders on task cards must **not** be the only way to convey information. Always pair with a visible text label or badge.

| Color                       | Accompanied By            |
| --------------------------- | ------------------------- |
| `border-l-red-500` (P0)     | "Critical" priority badge |
| `border-l-amber-500` (P1)   | "High" priority badge     |
| `border-l-green-500` (Done) | "Done" status badge       |

---

## 10. Don'ts

| ❌ Don't                                        | ✅ Do Instead                                      |
| ----------------------------------------------- | -------------------------------------------------- |
| Nest cards inside cards                         | Use flat variant for nested content                |
| Add padding to both Card and CardContent        | Let Card handle padding, or use `p-0` on Card      |
| Make entire card interactive without `<button>` | Wrap in `<button>` or use `<a>`                    |
| Use card for small inline elements              | Use badge, chip, or inline element                 |
| Skip heading level in CardTitle                 | Maintain proper h1→h2→h3 hierarchy                 |
| Use heavy shadows everywhere                    | Reserve `shadow-lg` for modals/popovers only       |
| Put too much content in one card                | Split into multiple cards or use tabs              |
| Use arbitrary hex colors for card backgrounds   | Use `bg-card`, `bg-card-hover`, `bg-card-selected` |

---

> **Next:** [07-INPUTS.md](./07-INPUTS.md) — Input component specification
