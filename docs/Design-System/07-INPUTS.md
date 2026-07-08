# Sprintio — Input Components

> Part of the Sprintio Design System
> Version: 1.0 | Date: 2026-07-08
> Form input system — text fields, selects, checkboxes, textareas

---

## Table of Contents

1. [Overview](#1-overview)
2. [Text Input](#2-text-input)
3. [Textarea](#3-textarea)
4. [Select](#4-select)
5. [Checkbox](#5-checkbox)
6. [Form Field Wrapper](#6-form-field-wrapper)
7. [Spacing Reference](#7-spacing-reference)
8. [Validation States](#8-validation-states)
9. [Usage Patterns](#9-usage-patterns)
10. [Accessibility](#10-accessibility)
11. [Don'ts](#11-donts)

---

## 1. Overview

Sprintio's input system is built from composable primitives. Every input follows the same visual language: consistent height, padding, border radius, and focus ring.

### Component Map

| Component | Source | Installation |
|-----------|--------|--------------|
| Input | 21st.dev | `npx shadcn@latest add "https://21st.dev/r/{author}/input?api_key=..."` |
| Textarea | 21st.dev | `npx shadcn@latest add "https://21st.dev/r/{author}/textarea?api_key=..."` |
| Select | 21st.dev | `npx shadcn@latest add "https://21st.dev/r/{author}/select?api_key=..."` |
| Checkbox | shadcn/ui | `npx shadcn@latest add checkbox` |
| Label | shadcn/ui | `npx shadcn@latest add label` |

### Input Sizes

| Size | Height | Padding (x) | Text Size | Tailwind |
|------|--------|-------------|-----------|----------|
| `sm` | 32px (h-8) | 12px (px-3) | 12px (`text-xs`) | `h-8 px-3 text-xs` |
| `md` (default) | 36px (h-9) | 12px (px-3) | 14px (`text-sm`) | `h-9 px-3 text-sm` |
| `lg` | 40px (h-10) | 16px (px-4) | 16px (`text-base`) | `h-10 px-4 text-base` |

---

## 2. Text Input

### 2.1 Anatomy

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  [ Leading Icon ]  text content...          [ Trailing ]   │
│   gap-2           (flex-1)                  [ Action  ]   │
│                                            gap-2           │
└────────────────────────────────────────────────────────────┘
      ↓                ↓                       ↓
   optional         required                  optional
```

| Zone | Required | Notes |
|------|----------|-------|
| Leading icon | No | Search icon, user icon, etc. |
| Input field | Yes | `flex-1` takes remaining width |
| Trailing action | No | Clear button, password toggle, copy button |

### 2.2 Default State

```tsx
<Input type="text" placeholder="Enter task name..." />
```

| Property | Value |
|----------|-------|
| Height | 36px (`h-9`) |
| Padding | `px-3 py-2` |
| Background | `bg-input` (white / slate-800) |
| Border | `border border-border` (gray-200 / slate-700) |
| Radius | `rounded-md` (6px) |
| Text | `text-sm text-foreground` |
| Placeholder | `placeholder:text-muted-foreground` (gray-400) |

### 2.3 States

| State | Background | Border | Text | Ring |
|-------|-----------|--------|------|------|
| Default | `bg-input` | `border-border` | `text-foreground` | — |
| Hover | `bg-input` | `border-strong` (gray-300) | `text-foreground` | — |
| Focus | `bg-input` | `border-focus` (indigo-500) | `text-foreground` | `ring-2 ring-ring ring-offset-2` |
| Disabled | `bg-muted` (gray-100) | `border-border` | `text-muted` (gray-400) | — |
| Error | `bg-input` | `border-destructive` (red-500) | `text-foreground` | `ring-destructive` |
| Success | `bg-input` | `border-success` (green-500) | `text-foreground` | — |

### 2.4 With Icons

```tsx
// Leading icon
<div className="relative">
  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  <Input className="pl-9" placeholder="Search tasks..." />
</div>

// Trailing action (password toggle)
<div className="relative">
  <Input type={showPassword ? "text" : "password"} className="pr-10" />
  <Button
    variant="ghost"
    size="icon-sm"
    className="absolute right-1 top-1/2 -translate-y-1/2"
    onClick={() => setShowPassword(!showPassword)}
  >
    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </Button>
</div>

// Leading icon + trailing action
<div className="relative">
  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  <Input type="email" className="px-9 pr-10" placeholder="name@company.com" />
  <Button
    variant="ghost"
    size="icon-sm"
    className="absolute right-1 top-1/2 -translate-y-1/2"
  >
    <Copy className="h-4 w-4" />
  </Button>
</div>
```

### 2.5 File Input

```tsx
<Input type="file" className="file:mr-4 file:border-0 file:bg-transparent
  file:text-sm file:font-medium file:text-foreground
  hover:file:text-primary" />
```

---

## 3. Textarea

### 3.1 Default

```tsx
<Textarea placeholder="Add a description..." rows={3} />
```

| Property | Value |
|----------|-------|
| Min height | 80px (`min-h-[80px]`) |
| Padding | `px-3 py-2` |
| Background | `bg-input` |
| Border | `border border-border` |
| Radius | `rounded-md` |
| Text | `text-sm text-foreground` |
| Resize | `resize-none` (default) or `resize-y` |

### 3.2 Auto-Expanding Textarea

```tsx
function AutoExpandingTextarea({ ...props }) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  return (
    <Textarea
      ref={ref}
      onInput={handleInput}
      className="min-h-[80px] resize-none overflow-hidden"
      {...props}
    />
  )
}
```

### 3.3 States

Same states as Input (see §2.3). Additional:

| State | Behavior |
|-------|----------|
| Character count | Show `current / max` in bottom-right corner |
| Disabled | Same as input disabled |
| Read-only | No border change, cursor: default |

### 3.4 With Character Counter

```tsx
<div className="space-y-2">
  <Textarea
    maxLength={500}
    value={text}
    onChange={e => setText(e.target.value)}
    rows={4}
    placeholder="Write a task description..."
  />
  <div className="flex justify-end">
    <span className={`text-xs ${text.length > 450 ? 'text-amber-600' : 'text-muted-foreground'}`}>
      {text.length}/500
    </span>
  </div>
</div>
```

---

## 4. Select

### 4.1 Installation

```bash
npx shadcn@latest add "https://21st.dev/r/{author}/select?api_key=YOUR_KEY"
```

### 4.2 Default

```tsx
<Select>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Select status..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="backlog">Backlog</SelectItem>
    <SelectItem value="todo">To Do</SelectItem>
    <SelectItem value="in-progress">In Progress</SelectItem>
    <SelectItem value="done">Done</SelectItem>
  </SelectContent>
</Select>
```

| Property | Value |
|----------|-------|
| Trigger height | 36px (`h-9`) — same as Input |
| Trigger padding | `px-3 py-2` |
| Trigger bg | `bg-input` |
| Trigger border | `border border-border` |
| Trigger radius | `rounded-md` |
| Chevron | `ChevronDown` right-aligned |
| Content bg | `bg-popover` (raised surface) |
| Content border | `border border-border` |
| Content shadow | `shadow-lg` |
| Content radius | `rounded-lg` |
| Item padding | `px-3 py-2` |
| Item selected | `bg-accent` with checkmark |
| Item hover | `bg-accent` |

### 4.3 Sprintio-Specific Selects

```tsx
// Status select (with colored dot)
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Set status..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="backlog">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-gray-400" />
        Backlog
      </div>
    </SelectItem>
    <SelectItem value="todo">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-blue-500" />
        To Do
      </div>
    </SelectItem>
    <SelectItem value="in-progress">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        In Progress
      </div>
    </SelectItem>
    <SelectItem value="done">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Done
      </div>
    </SelectItem>
  </SelectContent>
</Select>

// Priority select
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Set priority..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="p0">
      <div className="flex items-center gap-2">
        <Badge className="bg-red-50 text-red-700 text-[10px]">P0</Badge>
        Critical
      </div>
    </SelectItem>
    <SelectItem value="p1">
      <div className="flex items-center gap-2">
        <Badge className="bg-amber-50 text-amber-700 text-[10px]">P1</Badge>
        High
      </div>
    </SelectItem>
    <SelectItem value="p2">
      <div className="flex items-center gap-2">
        <Badge className="bg-yellow-50 text-yellow-700 text-[10px]">P2</Badge>
        Medium
      </div>
    </SelectItem>
  </SelectContent>
</Select>
```

---

## 5. Checkbox

### 5.1 Default

```tsx
<div className="flex items-center gap-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms" className="text-sm font-normal">
    I agree to the terms
  </Label>
</div>
```

| Property | Value |
|----------|-------|
| Size | 16px × 16px (`h-4 w-4`) |
| Border | `border border-border` |
| Checked bg | `bg-primary` (indigo-500) |
| Checked border | `border-primary` |
| Check icon | `Check` (white, 12px) |
| Focus | `ring-2 ring-ring ring-offset-2` |
| Radius | `rounded-sm` (2px) |

### 5.2 States

| State | Background | Border | Icon |
|-------|-----------|--------|------|
| Unchecked | transparent | `border-border` (gray-300) | — |
| Checked | `bg-primary` | `border-primary` | `Check` (white) |
| Indeterminate | `bg-primary` | `border-primary` | `Minus` (white) |
| Disabled | `bg-muted` | `border-border` | dimmed |
| Focus | — | — | + `ring-2 ring-ring ring-offset-2` |

### 5.3 Usage

```tsx
// Simple checkbox
<div className="flex items-center gap-2">
  <Checkbox id="notify" />
  <Label htmlFor="notify" className="text-sm font-normal">
    Email notifications
  </Label>
</div>

// Task subtask completion
<div className="flex items-center gap-3 py-2">
  <Checkbox
    id={`subtask-${subtask.id}`}
    checked={subtask.completed}
    onCheckedChange={checked => toggleSubtask(subtask.id, !!checked)}
  />
  <Label
    htmlFor={`subtask-${subtask.id}`}
    className={`text-sm ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}
  >
    {subtask.title}
  </Label>
</div>

// Indeterminate state (select all)
<div className="flex items-center gap-2">
  <Checkbox
    id="select-all"
    checked={someSelected ? 'indeterminate' : allSelected}
    onCheckedChange={toggleAll}
  />
  <Label htmlFor="select-all" className="text-sm font-medium">
    Select all ({totalCount})
  </Label>
</div>
```

---

## 6. Form Field Wrapper

A reusable wrapper that standardizes the label → input → helper/error pattern.

### 6.1 Anatomy

```
┌─────────────────────────────────────────────┐
│  Label            text-sm font-medium        │
│  (optional)      mt-0 (default margin)      │
├─────────────────────────────────────────────┤
│  Input / Select / Textarea                  │
│  (mt-2 = 8px from label)                   │
├─────────────────────────────────────────────┤
│  Helper text     text-xs text-muted-fg      │
│  OR Error msg    text-xs text-destructive   │
│  (mt-1.5 = 6px from input)                 │
└─────────────────────────────────────────────┘
```

### 6.2 Implementation

```tsx
interface FormFieldProps {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

function FormField({ label, error, helperText, required, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {helperText && !error && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  )
}
```

### 6.3 Usage

```tsx
<FormField label="Task Name" required error={errors.name?.message}>
  <Input placeholder="What needs to be done?" />
</FormField>

<FormField label="Description" helperText="Markdown supported">
  <Textarea rows={3} placeholder="Add more detail..." />
</FormField>

<FormField label="Status">
  <Select>
    <SelectTrigger>
      <SelectValue placeholder="Select status..." />
    </SelectTrigger>
    <SelectContent>
      {/* items */}
    </SelectContent>
  </Select>
</FormField>
```

### 6.4 Form Layout

```tsx
// Vertical form (default)
<form className="space-y-6">
  <FormField label="Project Name" required>
    <Input placeholder="My Project" />
  </FormField>
  <FormField label="Description">
    <Textarea rows={3} />
  </FormField>
  <FormField label="Status">
    <Select>...</Select>
  </FormField>
  <div className="flex justify-end gap-2">
    <Button variant="ghost">Cancel</Button>
    <Button type="submit">Create Project</Button>
  </div>
</form>

// Two-column form (settings)
<form className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <FormField label="First Name">
    <Input placeholder="John" />
  </FormField>
  <FormField label="Last Name">
    <Input placeholder="Doe" />
  </FormField>
</form>
```

---

## 7. Spacing Reference

### 7.1 Input Spacing

| Element | Spacing | Tailwind |
|---------|---------|----------|
| Label → Input | 8px | `space-y-2` or `mt-2` |
| Input → Helper/Error | 6px | `mt-1.5` or within `space-y-2` |
| Form field → Form field | 24px | `space-y-6` |
| Input + Leading icon gap | 8px | `gap-2` |
| Input + Trailing action gap | 8px | `gap-2` |

### 7.2 Select Dropdown Spacing

| Element | Spacing | Tailwind |
|---------|---------|----------|
| Trigger → Content | — | Radix handles positioning |
| Content padding | 4px | `p-1` |
| Item padding | 8px × 6px | `px-3 py-1.5` (sm) or `px-3 py-2` (md) |
| Item → Item | 2px | `gap-0.5` |
| Group label → items | 4px | — |

### 7.3 Checkbox Spacing

| Element | Spacing | Tailwind |
|---------|---------|----------|
| Checkbox → Label | 8px | `gap-2` |
| Checkbox → Checkbox | 12px | `space-y-3` |
| Checkbox size | 16px × 16px | `h-4 w-4` |

---

## 8. Validation States

### 8.1 Visual Treatment

| State | Border | Ring | Icon | Helper Text |
|-------|--------|------|------|-------------|
| Default | `border-border` | none | none | `text-muted-foreground` |
| Error | `border-destructive` | `ring-destructive` | `AlertCircle` (red) | `text-destructive` |
| Success | `border-success` | none | `CheckCircle` (green) | `text-success` |
| Warning | `border-warning` | none | `AlertTriangle` (amber) | `text-warning` |

### 8.2 Error State

```tsx
<FormField label="Email" error="Please enter a valid email address">
  <div className="relative">
    <Input
      type="email"
      value={email}
      onChange={handleChange}
      className="border-destructive focus-visible:ring-destructive pr-9"
    />
    <AlertCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
  </div>
</FormField>
```

### 8.3 Success State

```tsx
<FormField label="Email" helperText="Email is available">
  <div className="relative">
    <Input
      type="email"
      value={email}
      onChange={handleChange}
      className="border-green-500 pr-9"
    />
    <CheckCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
  </div>
</FormField>
```

---

## 9. Usage Patterns

### 9.1 Search Input

```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  <Input
    className="pl-9 bg-gray-100 dark:bg-gray-800 border-transparent
               focus:bg-white dark:focus:bg-gray-900"
    placeholder="Search tasks..."
  />
</div>
```

### 9.2 Inline Edit

```tsx
function InlineEdit({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    return (
      <span
        className="text-sm cursor-pointer hover:bg-gray-100 px-1 rounded"
        onClick={() => setEditing(true)}
      >
        {value}
      </span>
    )
  }

  return (
    <Input
      autoFocus
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { onSave(draft); setEditing(false) }}
      onKeyDown={e => {
        if (e.key === 'Enter') { onSave(draft); setEditing(false) }
        if (e.key === 'Escape') { setDraft(value); setEditing(false) }
      }}
      className="h-7 text-sm px-1"
    />
  )
}
```

### 9.3 Search with Keyboard Shortcut

```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  <Input className="pl-9 pr-20" placeholder="Search..." />
  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground
                   bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded border font-mono">
    ⌘K
  </kbd>
</div>
```

### 9.4 Search with Results Count

```tsx
<div className="space-y-4">
  <div className="relative">
    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input className="pl-9" placeholder="Filter tasks..." />
  </div>
  <p className="text-xs text-muted-foreground">
    Showing {filteredCount} of {totalCount} tasks
  </p>
</div>
```

---

## 10. Accessibility

### 10.1 Requirements

| Requirement | Implementation |
|-------------|---------------|
| Label association | `<Label htmlFor="id">` matches `<Input id="id">` |
| `aria-describedby` | Link error/helper text to input |
| `aria-invalid` | Set to `true` on error state |
| `aria-required` | Set when field is required |
| `aria-disabled` | Visually disabled but focusable (for tooltips) |
| Focus visible | `focus-visible:ring-2 ring-ring ring-offset-2` |

### 10.2 Full Accessibility Example

```tsx
<FormField
  label="Email Address"
  required
  error={errors.email?.message}
>
  <Input
    id="email"
    type="email"
    required
    aria-invalid={!!errors.email}
    aria-describedby={errors.email ? 'email-error' : undefined}
    aria-required
    placeholder="you@company.com"
  />
</FormField>

// When using aria-describedby, error needs matching id:
<p id="email-error" className="text-xs text-destructive" role="alert">
  {errors.email?.message}
</p>
```

### 10.3 Keyboard Navigation

| Key | Behavior |
|-----|----------|
| `Tab` | Move to next input |
| `Shift+Tab` | Move to previous input |
| `Enter` | Submit form (on submit button or single input) |
| `Escape` | Close dropdown (Select), cancel inline edit |
| `Arrow Up/Down` | Navigate Select options |
| `Space` | Toggle Checkbox |

### 10.4 Error Announcements

```tsx
// Use role="alert" for immediate error visibility
<p id="email-error" className="text-xs text-destructive" role="alert">
  Invalid email address
</p>

// Screen reader announces: "Invalid email address" immediately when error appears
```

---

## 11. Don'ts

| ❌ Don't | ✅ Do Instead |
|---------|-------------|
| Use placeholder as label | Always use a visible `<Label>` |
| Color-only error indication | Pair red border with error text + icon |
| Set `pointer-events: none` on disabled | Use `disabled` prop (browser handles it) |
| Skip `htmlFor` / `id` linking | Every input must have an associated label |
| Use `<div>` as input container | Use native `<input>` or `<textarea>` |
| Auto-focus multiple inputs | Only auto-focus the most relevant one (search) |
| Hide error text behind interaction | Show errors immediately on submit |
| Use `*` asterisk without `aria-required` | Always pair visual required with ARIA |

---

> **Next:** [08-MODALS.md](./08-MODALS.md) — Modal / Dialog component specification
