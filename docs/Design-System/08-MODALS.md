# Sprintio — Modal / Dialog Component

> Part of the Sprintio Design System
> Version: 1.0 | Date: 2026-07-08
> Modal overlays — focused tasks, confirmations, settings

---

## Table of Contents

1. [Overview](#1-overview)
2. [Installation](#2-installation)
3. [Dialog Anatomy](#3-dialog-anatomy)
4. [Variants](#4-variants)
5. [Props API](#5-props-api)
6. [Spacing Reference](#6-spacing-reference)
7. [Content Patterns](#7-content-patterns)
8. [Command Palette (⌘K)](#8-command-palette-k)
9. [Confirmation Dialogs](#9-confirmation-dialogs)
10. [Accessibility](#10-accessibility)
11. [Don'ts](#11-donts)

---

## 1. Overview

Modals (dialogs) create focused, temporary contexts. They interrupt the user flow for a specific task and should be used sparingly — only when the action requires full attention or cannot be done inline.

### When to Use a Modal

| Scenario | Use Modal? |
|----------|-----------|
| Create/edit a task | ✅ Yes — focused form |
| Confirm destructive action | ✅ Yes — requires explicit consent |
| Settings panel | ⚠️ Maybe — consider slide-over instead |
| Quick info display | ❌ No — use tooltip or inline |
| Inline editing | ❌ No — edit in place |
| Long forms (>4 fields) | ⚠️ Maybe — consider dedicated page |
| Command palette (⌘K) | ✅ Yes — command palette pattern |

### Modal Hierarchy

```
┌─────────────────────────────────────────────────────┐
│  Overlay (z-50)                                     │
│  bg-black/50 light · bg-black/70 dark               │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Modal Content (z-50)                         │  │
│  │  max-w-lg (512px)                             │  │
│  │  bg-card · rounded-xl · shadow-lg             │  │
│  │                                               │  │
│  │  Header                                        │  │
│  │  Content                                       │  │
│  │  Footer                                        │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 2. Installation

```bash
# From 21st.dev
npx shadcn@latest add "https://21st.dev/r/{author}/dialog?api_key=YOUR_KEY"

# Fallback — standard shadcn/ui (uses Radix UI Dialog)
npx shadcn@latest add dialog
```

### Dependencies

| Package | Purpose |
|---------|---------|
| `@radix-ui/react-dialog` | Accessible dialog primitive |
| `class-variance-authority` | Variant management |
| `tailwind-merge` | Class merging |
| `lucide-react` | Close icon |

---

## 3. Dialog Anatomy

### 3.1 Standard Dialog

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Overlay                          [×] Close (top-right)  │
│  bg-black/50                       top-4 right-4         │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  ← p-6 (24px) padding all sides                   │  │
│  │                                                    │  │
│  │  DialogHeader                                     │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │  DialogTitle    text-lg font-semibold        │  │  │
│  │  │  DialogDescription  text-sm text-muted-fg    │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  │         ↓ space-y-1.5 (6px)                        │  │
│  │  DialogContent                                     │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │  Main content area                           │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  │         ↓ implicit                                 │  │
│  │  DialogFooter                                     │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │  [ Cancel (ghost) ]  [ Action (primary) ]    │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Radix UI Primitives

```tsx
import * as Dialog from '@radix-ui/react-dialog'

<Dialog.Root>
  <Dialog.Trigger asChild>
    <Button>Open Dialog</Button>
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />      {/* backdrop */}
    <Dialog.Content>         {/* modal box */}
      <Dialog.Header>
        <Dialog.Title />
        <Dialog.Description />
      </Dialog.Header>
      {/* body content */}
      <Dialog.Footer />
      <Dialog.Close />       {/* close button */}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

---

## 4. Variants

### 4.1 Default

Standard centered dialog.

| Property | Value |
|----------|-------|
| Max width | `max-w-lg` (512px) |
| Padding | `p-6` |
| Radius | `rounded-xl` |
| Shadow | `shadow-lg` |
| Overlay | `bg-black/50 dark:bg-black/70` |
| Position | Centered, `top-[50%] translate-y-[-50%]` |
| Usage | Create task, edit task, settings forms |

### 4.2 Compact (Small)

For quick confirmations and small forms.

| Property | Value |
|----------|-------|
| Max width | `max-w-sm` (384px) |
| Padding | `p-4` |
| Radius | `rounded-xl` |
| Shadow | `shadow-lg` |
| Usage | Confirm delete, quick prompt, alert |

### 4.3 Wide (Large)

For complex forms, multi-step flows, or content-heavy modals.

| Property | Value |
|----------|-------|
| Max width | `max-w-2xl` (672px) |
| Padding | `p-6` |
| Radius | `rounded-xl` |
| Shadow | `shadow-lg` |
| Usage | Onboarding wizard, detailed settings, report view |

### 4.4 Full-Screen

Maximum focus. Reserved for immersive tasks.

| Property | Value |
|----------|-------|
| Width | `w-[calc(100vw-32px)]` |
| Height | `h-[calc(100vh-32px)]` |
| Margin | `m-4` (16px inset) |
| Padding | `p-6` |
| Radius | `rounded-xl` |
| Usage | Document editor, full report, complex board configuration |

### 4.5 Slide-Over (Panel)

Slides in from the right. Best for detail views and settings.

| Property | Value |
|----------|-------|
| Width | `w-[400px]` |
| Position | `fixed right-0 top-0 h-full` |
| Radius | `rounded-l-xl` (left side only) |
| Shadow | `shadow-xl` |
| Overlay | `bg-black/50` |
| Animation | `translate-x-full → translate-x-0` |
| Usage | Task detail, member list, AI copilot panel |

---

## 5. Props API

### 5.1 Dialog Root

```tsx
interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}
```

### 5.2 Dialog Content

```tsx
interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size preset */
  size?: 'sm' | 'default' | 'lg' | 'xl' | 'full'
  /** Show close button in top-right */
  showClose?: boolean
  /** Disable overlay click-to-close */
  preventOverlayClose?: boolean
  /** Custom overlay class */
  overlayClassName?: string
}
```

### 5.3 Variant Definitions

```tsx
const dialogContentVariants = cva(
  'fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%]' +
  ' gap-4 bg-card p-6 shadow-lg duration-200' +
  ' data-[state=open]:animate-in data-[state=closed]:animate-out' +
  ' data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0' +
  ' data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95' +
  ' data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]' +
  ' data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]' +
  ' sm:rounded-xl',
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        default: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'm-4 h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)
```

### 5.4 Overlay

```tsx
const dialogOverlayVariants = cva(
  'fixed inset-0 z-50 bg-black/50' +
  ' data-[state=open]:animate-in data-[state=closed]:animate-out' +
  ' data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0' +
  ' dark:bg-black/70'
)
```

---

## 6. Spacing Reference

### 6.1 Dialog Internal Spacing

| Element | Spacing | Tailwind |
|---------|---------|----------|
| Dialog padding | 24px all sides | `p-6` |
| Compact dialog padding | 16px all sides | `p-4` |
| Close button position | 16px from edges | `top-4 right-4` |
| Header → Content | 6px | `space-y-1.5` |
| Content → Footer | implicit (via padding areas) | — |
| Footer button gap | 8px | `gap-2` |
| Overlay backdrop blur | — | `backdrop-blur-sm` (optional) |

### 6.2 Overlay Spacing

| Screen Size | Overlay Padding | Modal Position |
|-------------|----------------|----------------|
| Mobile (<768px) | 16px (`p-4`) | Full width minus padding |
| Desktop (≥768px) | auto-center | Centered, max-width set |

### 6.3 Modal → Modal Stacking

When a modal opens another modal (e.g., confirm inside create):

```
z-index:
  1st modal overlay:   z-50
  1st modal content:   z-50
  2nd modal overlay:   z-[60]
  2nd modal content:   z-[60]
```

Radix UI handles stacking automatically.

---

## 7. Content Patterns

### 7.1 Create Task Dialog

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>
      <Plus className="h-4 w-4" />
      Create Task
    </Button>
  </DialogTrigger>
  <DialogContent size="default">
    <DialogHeader>
      <DialogTitle>Create New Task</DialogTitle>
      <DialogDescription>
        Add a new task to your project board.
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4 py-2">
      <FormField label="Title" required>
        <Input placeholder="What needs to be done?" autoFocus />
      </FormField>

      <FormField label="Description">
        <Textarea rows={3} placeholder="Add more detail..." />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Status">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>{/* items */}</SelectContent>
          </Select>
        </FormField>

        <FormField label="Priority">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>{/* items */}</SelectContent>
          </Select>
        </FormField>
      </div>
    </div>

    <DialogFooter>
      <DialogClose asChild>
        <Button variant="ghost">Cancel</Button>
      </DialogClose>
      <Button type="submit">Create Task</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 7.2 Task Detail Slide-Over

```tsx
<Dialog>
  <DialogContent size="xl" className="right-0 top-0 h-full w-full max-w-[400px]
    translate-x-0 translate-y-0 rounded-l-xl
    data-[state=closed]:slide-out-to-right
    data-[state=open]:slide-in-from-right">
    <DialogHeader>
      <DialogTitle>Task Details</DialogTitle>
    </DialogHeader>

    <ScrollArea className="flex-1 -mx-6 px-6">
      <div className="space-y-6 py-2">
        <FormField label="Title">
          <Input defaultValue="Fix login redirect bug" />
        </FormField>

        <FormField label="Description">
          <AutoExpandingTextarea defaultValue="Users are..." />
        </FormField>

        <FormField label="Assignee">
          <Select defaultValue="user-1">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{/* team members */}</SelectContent>
          </Select>
        </FormField>

        <FormField label="Subtasks">
          <div className="space-y-2">
            {subtasks.map(sub => (
              <div key={sub.id} className="flex items-center gap-2">
                <Checkbox checked={sub.done} />
                <span className="text-sm">{sub.title}</span>
              </div>
            ))}
          </div>
        </FormField>
      </div>
    </ScrollArea>

    <DialogFooter>
      <DialogClose asChild>
        <Button variant="ghost">Cancel</Button>
      </DialogClose>
      <Button>Save Changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 7.3 Settings Dialog (Wide)

```tsx
<Dialog>
  <DialogContent size="lg">
    <DialogHeader>
      <DialogTitle>Project Settings</DialogTitle>
      <DialogDescription>
        Manage your project configuration.
      </DialogDescription>
    </DialogHeader>

    <Tabs defaultValue="general" className="py-2">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-4 pt-4">
        <FormField label="Project Name" required>
          <Input defaultValue="Sprintio" />
        </FormField>
        <FormField label="Description">
          <Textarea defaultValue="AI-enhanced work management" rows={3} />
        </FormField>
      </TabsContent>

      <TabsContent value="members" className="pt-4">
        {/* Members list */}
      </TabsContent>

      <TabsContent value="integrations" className="pt-4">
        {/* Integrations */}
      </TabsContent>
    </Tabs>

    <DialogFooter>
      <DialogClose asChild>
        <Button variant="ghost">Cancel</Button>
      </DialogClose>
      <Button>Save Settings</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 8. Command Palette (⌘K)

A specialized modal for quick actions. Appears centered with a search input.

### 8.1 Anatomy

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  Overlay                                             │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  ← max-w-[560px]                              │  │
│  │  rounded-xl · shadow-xl                        │  │
│  │                                                │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │  🔍  Search commands...           ⌘K     │  │  │
│  │  │  Input: px-4 py-3, border-none           │  │  │
│  │  ├──────────────────────────────────────────┤  │  │
│  │  │  Suggestions                             │  │  │
│  │  │  ┌────────────────────────────────────┐  │  │  │
│  │  │  │ 📋 Create Task          ⌘ N        │  │  │  │
│  │  │  ├────────────────────────────────────┤  │  │  │
│  │  │  │ 🔍 Search Tasks        ⌘ F        │  │  │  │
│  │  │  ├────────────────────────────────────┤  │  │  │
│  │  │  │ ⚙️  Open Settings       ⌘ ,        │  │  │  │
│  │  │  ├────────────────────────────────────┤  │  │  │
│  │  │  │ ✨ AI: Summarize Board  ⌘ I        │  │  │  │
│  │  │  └────────────────────────────────────┘  │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  │                                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 8.2 Command Palette Spacing

| Element | Spacing | Tailwind |
|---------|---------|----------|
| Max width | 560px | `max-w-[560px]` |
| Input padding | 12px × 16px | `px-4 py-3` |
| Input → Results | 0 (border separator) | `border-t` |
| Result item padding | 8px × 12px | `px-3 py-2` |
| Result → Result | 2px | `gap-0.5` |
| Result icon → text | 8px | `gap-2` |
| Result text → shortcut | flex-1 (pushed right) | `ml-auto` |
| Shortcut key style | `kbd` | `text-[10px] px-1.5 py-0.5 bg-muted rounded` |

### 8.3 Implementation

```tsx
import { Command } from 'cmdk'

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 max-w-[560px]">
        <Command className="rounded-lg border border-border">
          {/* Search input */}
          <div className="flex items-center border-b px-4">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              placeholder="Search commands..."
              className="flex-1 bg-transparent py-3 px-3 text-sm outline-none
                         placeholder:text-muted-foreground"
            />
            <kbd className="text-[10px] text-muted-foreground bg-muted
                           px-1.5 py-0.5 rounded border font-mono">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[300px] overflow-y-auto p-1">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group heading="Actions" className="px-2">
              <Command.Item className="flex items-center gap-2 px-3 py-2 rounded-md text-sm
                                       cursor-pointer data-[selected]:bg-accent">
                <Plus className="h-4 w-4" />
                Create Task
                <kbd className="ml-auto text-[10px] text-muted-foreground bg-muted
                               px-1.5 py-0.5 rounded border font-mono">
                  ⌘N
                </kbd>
              </Command.Item>

              <Command.Item className="flex items-center gap-2 px-3 py-2 rounded-md text-sm
                                       cursor-pointer data-[selected]:bg-accent">
                <Search className="h-4 w-4" />
                Search Tasks
                <kbd className="ml-auto text-[10px] text-muted-foreground bg-muted
                               px-1.5 py-0.5 rounded border font-mono">
                  ⌘F
                </kbd>
              </Command.Item>
            </Command.Group>

            <Command.Separator className="my-1 h-px bg-border" />

            <Command.Group heading="AI" className="px-2">
              <Command.Item className="flex items-center gap-2 px-3 py-2 rounded-md text-sm
                                       cursor-pointer data-[selected]:bg-accent
                                       text-violet-600 dark:text-violet-400">
                <Sparkles className="h-4 w-4" />
                Summarize Board
                <kbd className="ml-auto text-[10px] text-muted-foreground bg-muted
                               px-1.5 py-0.5 rounded border font-mono">
                  ⌘I
                </kbd>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
```

### 8.4 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `⌘K` / `Ctrl+K` | Open command palette |
| `Escape` | Close command palette |
| `↑` / `↓` | Navigate results |
| `Enter` | Execute selected command |
| Type to filter | Real-time fuzzy search |

---

## 9. Confirmation Dialogs

### 9.1 Destructive Confirmation

Always confirm destructive actions. Never allow single-click delete.

```tsx
function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => void
  itemName: string
}) {
  const [loading, setLoading] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Delete Task</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>"{itemName}"</strong>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={loading}>Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={async () => {
              setLoading(true)
              await onConfirm()
              setLoading(false)
              onOpenChange(false)
            }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### 9.2 Compact Confirm Pattern

```tsx
// Quick confirmation with less detail
<DialogContent size="sm">
  <DialogHeader>
    <DialogTitle>Unsaved Changes</DialogTitle>
    <DialogDescription>
      You have unsaved changes. Discard them?
    </DialogDescription>
  </DialogHeader>
  <DialogFooter>
    <DialogClose asChild>
      <Button variant="ghost">Keep Editing</Button>
    </DialogClose>
    <Button variant="destructive">Discard</Button>
  </DialogFooter>
</DialogContent>
```

### 9.3 Confirmation Rules

| Rule | Details |
|------|---------|
| Always show item name | "Delete **Task A**?" not just "Delete?" |
| State irreversibility | "This action cannot be undone." |
| Destructive button = red | `variant="destructive"` |
| Cancel is always safe | `variant="ghost"` — easy to dismiss |
| Loading on confirm | Disable both buttons, show spinner on confirm |
| Never auto-focus destructive | Focus Cancel button by default |

---

## 10. Accessibility

### 10.1 Requirements

| Requirement | Implementation |
|-------------|---------------|
| Focus trapped | Radix UI handles automatically |
| Focus returns on close | Radix UI handles automatically |
| `aria-labelledby` | `DialogTitle` provides this |
| `aria-describedby` | `DialogDescription` provides this |
| `aria-modal="true"` | Radix UI handles automatically |
| Escape to close | Built-in |
| Click overlay to close | Built-in (can disable) |
| Scroll lock on body | Radix UI handles automatically |

### 10.2 Focus Management

```
Open modal →
  Focus moves to first focusable element (auto-focus Input)
  or Dialog.Content if no auto-focus

Tab through modal →
  Focus wraps within modal (focus trap)

Close modal →
  Focus returns to trigger element
```

### 10.3 Screen Reader Announcements

```
On open:
  "Create New Task, dialog"

On close:
  Focus returns to trigger button
  Screen reader: "Create Task, button" (trigger element)
```

### 10.4 Keyboard Navigation

| Key | Behavior |
|-----|----------|
| `Escape` | Close modal, return focus to trigger |
| `Tab` | Move to next focusable element within modal |
| `Shift+Tab` | Move to previous focusable element within modal |
| `Enter` | Activate focused button/link |
| `Arrow keys` | Navigate within Select dropdowns, Command palette |

---

## 11. Don'ts

| ❌ Don't | ✅ Do Instead |
|---------|-------------|
| Open modal from modal (deep nesting) | Use slide-over, or navigate to new page |
| Use modal for simple alerts | Use toast notification |
| Auto-focus destructive action button | Focus cancel/safe option |
| Skip confirmation on destructive actions | Always confirm delete, archive, remove |
| Make modal scroll beyond viewport height | Use scroll area within content, cap at `max-h-[85vh]` |
| Close modal on background click for unsaved data | Disable overlay close with `onInteractOutside` |
| Use modal for full-page workflows | Use dedicated route/page |
| Skip close button | Always show `×` button alongside Escape |
| Use long forms in small modal | Use wide variant or dedicated page |

---

> **End of Sprintio Design System**
>
> All 8 files:
> 1. [01-SPACING.md](./01-SPACING.md) — Spacing system
> 2. [02-TOKENS.md](./02-TOKENS.md) — Design tokens
> 3. [03-TAILWIND-CONFIG.md](./03-TAILWIND-CONFIG.md) — Tailwind configuration
> 4. [04-21ST-DEV-STRATEGY.md](./04-21ST-DEV-STRATEGY.md) — 21st.dev integration
> 5. [05-BUTTONS.md](./05-BUTTONS.md) — Button component
> 6. [06-CARDS.md](./06-CARDS.md) — Card component
> 7. [07-INPUTS.md](./07-INPUTS.md) — Input components
> 8. [08-MODALS.md](./08-MODALS.md) — Modal / Dialog component
