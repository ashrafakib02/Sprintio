# Sprintio — Component Hierarchy

> **Sprint fast. Ship together.**
> Document: 04 — Component Hierarchy (Atomic Design System)
> Version: 1.0 | Date: 2026-07-08
> Scope: MVP — Full component tree from atoms to pages, with composition patterns

---

## Table of Contents

1. [Design System Principles](#1-design-system-principles)
2. [Atomic Level Map](#2-atomic-level-map)
3. [Level 1 — Atoms](#3-level-1--atoms)
4. [Level 2 — Molecules](#4-level-2--molecules)
5. [Level 3 — Organisms](#5-level-3--organisms)
6. [Level 4 — Templates](#6-level-4--templates)
7. [Level 5 — Pages](#7-level-5--pages)
8. [Component State Catalog](#8-component-state-catalog)
9. [Composition Patterns](#9-composition-patterns)
10. [Component ↔ Screen Mapping](#10-component--screen-mapping)

---

## 1. Design System Principles

| # | Principle | Application |
|---|-----------|-------------|
| D1 | **Composable over monolithic** | Build small pieces that combine; never build a component that does one thing with one prop |
| D2 | **Controlled by default** | Every component accepts its state via props; internal state only for uncontrolled convenience wrappers |
| D3 | **Polymorphic rendering** | Core components (`Button`, `Card`, `Badge`) accept `as` prop for semantic HTML elements |
| D4 | **Accessible-first** | Every component ships with correct ARIA attributes, keyboard navigation, and focus management built in |
| D5 | **Dark mode invariant** | Components are defined by tokens, not hardcoded colors — dark mode is a token swap, not a rewrite |

---

## 2. Atomic Level Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ATOMIC DESIGN LEVELS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  LEVEL 1 — ATOMS                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  The smallest building blocks. No composition dependencies.       │   │
│  │  Each atom is a single-purpose, stateless element.                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│         │                                                                │
│         ▼                                                                │
│  LEVEL 2 — MOLECULES                                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Atoms combined into functional groups. Each molecule performs    │   │
│  │  a single action or displays a single piece of information.      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│         │                                                                │
│         ▼                                                                │
│  LEVEL 3 — ORGANISMS                                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Complex UI sections. Multiple molecules + atoms. Can contain    │   │
│  │  state, manage sub-component communication, handle interactions. │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│         │                                                                │
│         ▼                                                                │
│  LEVEL 4 — TEMPLATES                                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Page-level layout skeletons. Define where organisms go, but     │   │
│  │  contain no real content. Placeholder data only.                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│         │                                                                │
│         ▼                                                                │
│  LEVEL 5 — PAGES                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Templates with real data. What the user actually sees.          │   │
│  │  Connected to state management, routing, data fetching.          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Level 1 — Atoms

The smallest possible units. Each has zero composition dependencies.

### 3.1 Typography Atoms

| Atom | Usage | Rendered As | Props |
|------|-------|-------------|-------|
| `Heading` | Section titles, page headings | h1–h4 | `level: 1-4`, `children`, `className` |
| `Text` | Body text, paragraphs | span / p | `size: xs-sm-md-lg-xl`, `weight`, `color`, `as` |
| `Code` | Inline code, identifiers | code | `children`, `variant: inline-block` |
| `Caption` | Timestamps, metadata, hints | span | `children`, `color: muted` |

### 3.2 Icon Atoms

| Atom | Usage | Notes |
|------|-------|-------|
| `Icon` | Universal icon wrapper | Accepts icon name + size; renders Lucide icons |
| `EmojiIcon` | Sidebar section icons, workspace icons | Renders emoji as icon (supports skin tone) |

**Icon Size Scale:**

| Token | Size | Usage |
|-------|------|-------|
| `icon-xs` | 12px | Inline badges, counters |
| `icon-sm` | 16px | Button icons, filter chips |
| `icon-md` | 20px | Sidebar nav, card icons |
| `icon-lg` | 24px | Page headers, empty states |
| `icon-xl` | 32px | Feature highlights, onboarding |

### 3.3 Interactive Atoms

| Atom | Variants | Keyboard | ARIA |
|------|----------|----------|------|
| `Button` | `primary`, `secondary`, `ghost`, `danger`, `link` | `Enter` / `Space` | `role="button"` |
| `IconButton` | `primary`, `ghost`, `danger` | `Enter` / `Space` | `aria-label` required |
| `Input` | `text`, `email`, `password`, `number` | Full keyboard | `aria-label` or associated `<label>` |
| `Textarea` | Auto-resize variant | Full keyboard | `aria-label` |
| `Checkbox` | Checked / unchecked / indeterminate | `Space` to toggle | `role="checkbox"`, `aria-checked` |
| `Radio` | Grouped radio set | Arrow keys to navigate group | `role="radiogroup"` |
| `Toggle` | On / off | `Space` to toggle | `role="switch"`, `aria-checked` |
| `Select` | Single / multi | Arrow keys, `Enter` to select | `role="listbox"` |
| `Link` | External / internal | `Enter` | Semantic `<a>` tag |

### 3.4 Data Display Atoms

| Atom | Usage | Notes |
|------|-------|-------|
| `Badge` | Status, priority, count | Variants: `status` (colored dot + label), `count` (number), `label` (text chip) |
| `Avatar` | User identity | Sizes: sm (24px), md (32px), lg (40px); fallback to initials |
| `AvatarGroup` | Multiple assignees | Shows first 2-3 avatars + "+N" overflow |
| `Tooltip` | Hover/focus help text | Delay: 400ms. Position: auto. Max width: 240px |
| `Divider` | Section separator | `horizontal` / `vertical` |
| `Skeleton` | Loading placeholder | Variants: `text`, `circle`, `rect`, `card` |
| `Spinner` | Loading indicator | Sizes: sm, md, lg |
| `EmptyState` | No data placeholder | `icon`, `title`, `description`, `action` slot |

### 3.5 Feedback Atoms

| Atom | Variants | Duration | Stacking |
|------|----------|----------|----------|
| `Toast` | `success`, `error`, `warning`, `info` | Auto-dismiss: 5s (success/info), manual (error) | Stacks top-right, max 3 |
| `BadgeDot` | Colored indicator dot | Persistent | — |
| `Progress` | Bar / circle | — | Used in onboarding, imports |

---

## 4. Level 2 — Molecules

Atoms combined into functional units.

### 4.1 Form Molecules

| Molecule | Composition | Usage |
|----------|-------------|-------|
| `FormField` | Label + Input + Error/Help text | Wraps every form input with label + validation |
| `SearchInput` | Input + Icon (magnifier) + Clear button | Global search, local search |
| `FilterChip` | Label + Value + Remove (×) | Active filter display in filter bar |
| `FilterDropdown` | Button + Dropdown + Checkbox group | Single filter selection |
| `DateRangePicker` | Two Inputs + Calendar popover | Due date, sprint date range |
| `ColorPicker` | Swatches + Custom input | Space, folder, label color |
| `RichTextToolbar` | Button group (bold, italic, link, code, list) | Document editor toolbar |
| `CommandPaletteInput` | Input + Results list + Keyboard hints | ⌘K command palette |

### 4.2 Task Molecules

| Molecule | Composition | Usage |
|----------|-------------|-------|
| `TaskIdentifier` | Code + Link | "SIO-245" — clickable, opens task detail |
| `TaskTitle` | Text + Editable | Inline-editable task title |
| `TaskMeta` | Badge (priority) + Avatar (assignee) + Date | Compact task metadata row |
| `TaskCard` | Identifier + Title + Meta + Labels | Board View card |
| `TaskRow` | Checkbox + Identifier + Title + Status + Meta | List View row |
| `TaskStatusDropdown` | Select + Status badges | Status picker in task detail |
| `PriorityBadge` | Badge + color mapping | P0=red, P1=amber, P2=yellow, P3=blue, P4=gray |
| `SubtaskItem` | Checkbox + Text | Individual subtask line |
| `LinkedItem` | Icon + Type label + Title + Link | Doc/task reference in linked items list |
| `AttachmentItem` | Icon + Filename + Size + Remove | File attachment row |
| `AIMetadataCard` | Confidence % + Field suggestions + Accept/Reject | AI triage suggestion banner |

### 4.3 Document Molecules

| Molecule | Composition | Usage |
|----------|-------------|-------|
| `DocTitle` | Heading + Editable | Inline-editable doc title |
| `DocStatusBadge` | Badge + Status (Draft / In Review / Approved) | Doc lifecycle indicator |
| `WikiLink` | `[[` trigger + Autocomplete + Linked entity | Bidirectional wiki-link |
| `InlineComment` | Anchor highlight + Comment thread + Resolve button | Doc inline comment |
| `VersionEntry` | Avatar + Name + Timestamp + Restore button | Version history item |
| `BacklinkItem` | Icon + Entity type + Title + Link | Reference pointing to current doc |
| `SlashMenuItem` | Icon + Label + Description + Shortcut | Single item in slash command menu |
| `AIPopupMenu` | AI actions (Continue, Summarize, Rewrite, Fix Grammar, Translate) | Floating AI toolbar on text selection |

### 4.4 Automation Molecules

| Molecule | Composition | Usage |
|----------|-------------|-------|
| `TriggerCard` | Icon + Trigger type + Config summary | Single trigger in flow |
| `ConditionCard` | Logic operator (AND/OR) + Condition list | Condition block in flow |
| `ActionCard` | Icon + Action type + Config summary | Single action in flow |
| `FlowConnector` | Vertical line + Arrow | Visual connection between cards |
| `RunHistoryItem` | Status icon + Task ID + Timestamp + Details | Single run log entry |
| `TemplateCard` | Icon + Name + Description | Template selection card |

### 4.5 Navigation Molecules

| Molecule | Composition | Usage |
|----------|-------------|-------|
| `NavItem` | Icon + Label + Badge (optional) | Sidebar navigation item |
| `NavItemGroup` | Toggle + Label + Children | Collapsible sidebar section (Spaces) |
| `Breadcrumb` | Segmented links with separators | Path indicator at top of views |
| `TabItem` | Label + Active indicator | View tabs (Board / List, Description / Comments) |
| `TabGroup` | Multiple TabItems | Tab bar component |
| `WorkspaceSwitcher` | Avatar + Name + Dropdown | Workspace selector in sidebar top |
| `UserMenu` | Avatar + Name + Dropdown | Profile menu in top bar |

### 4.6 AI Copilot Molecules

| Molecule | Composition | Usage |
|----------|-------------|-------|
| `CopilotMessage` | Avatar + Message content + Timestamp | Single chat message |
| `CopilotSuggestion` | Suggested action + Preview + Accept/Edit/Reject | AI suggestion card |
| `CopilotInput` | Textarea + Send button + Keyboard hint | Chat input at bottom of copilot panel |
| `CopilotTaskPreview` | Parsed fields (title, priority, assignee, labels) | NL task creation preview |

---

## 5. Level 3 — Organisms

Complex sections that combine molecules into functional UI regions.

### 5.1 Shell & Layout Organisms

| Organism | Contains | Notes |
|----------|----------|-------|
| `AppShell` | TopBar + Sidebar + ContentArea + CopilotPanel | Root layout; manages sidebar state, copilot toggle |
| `TopBar` | Logo + SearchInput + ShortcutHint + NotificationBell + UserMenu | Fixed top bar; height: 56px |
| `Sidebar` | WorkspaceSwitcher + NavItemGroups + NavItems + OnboardingWidget | Width: 240px expanded, 64px collapsed; scrollable |
| `ContentArea` | Router outlet; wraps page content | Flexible flex-1 area |
| `CopilotPanel` | CopilotHeader + MessageList + CopilotInput | Width: 320px; slide-in from right; toggleable |

### 5.2 Board View Organisms

| Organism | Contains | Notes |
|----------|----------|-------|
| `BoardHeader` | Breadcrumb + ViewToggle + FilterBar + NewTaskButton + OverflowMenu | Top section of board |
| `BoardView` | BoardColumn[] + horizontal scroll | Scrollable board container |
| `BoardColumn` | ColumnHeader + TaskCard[] + AddTaskButton | Single status column; scrollable vertically |
| `ColumnHeader` | StatusBadge + Count + OverflowMenu | Fixed header per column |
| `BoardCard` | TaskCard + DragHandle | Wraps TaskCard with drag-and-drop |
| `BoardSwimlane` | SwimlaneHeader + BoardColumn[] | Grouped board (by assignee) |

### 5.3 List View Organisms

| Organism | Contains | Notes |
|----------|----------|-------|
| `ListHeader` | Breadcrumb + ViewToggle + FilterBar + SortControl + NewTaskButton | Top section of list |
| `ListView` | TableHeader + TaskRow[] | Full-width table view |
| `TableHeader` | Checkbox + Column headers (sortable) | Column labels with sort indicators |
| `TaskRow` | Checkbox + TaskMeta + inline-editable fields | Single task row; double-click to inline edit |
| `ListGroup` | GroupHeader + TaskRow[] | Collapsible group (by status, assignee, etc.) |
| `ListGroupHeader` | Toggle + GroupName + Count | Group section header |

### 5.4 Task Detail Organisms

| Organism | Contains | Notes |
|----------|----------|-------|
| `TaskDetailPanel` | PanelHeader + MetadataBar + Tabs[] | 60% width slide-in panel |
| `PanelHeader` | Identifier + Title + Close + Nav (↑↓) + OverflowMenu | Top of task panel |
| `MetadataBar` | StatusDropdown + PriorityBadge + AssigneeSelect + SprintSelect + DueDatePicker + LabelPicker | Compact metadata row |
| `TaskTabs` | TabGroup + Tab content panels | Description / Comments / Activity / Subtasks |
| `DescriptionPanel` | RichTextEditor (read-only or edit mode) | Task description content |
| `CommentsPanel` | Comment[] + CommentInput | Threaded comment list |
| `ActivityPanel` | ActivityLog[] | Chronological activity feed |
| `SubtasksPanel` | SubtaskItem[] + AddSubtask | Subtask checklist |
| `LinkedItemsPanel` | LinkedItem[] + AddLink | References to docs and other tasks |
| `AttachmentsPanel` | AttachmentItem[] + UploadButton | File attachments |
| `AITriageBanner` | AIMetadataCard + Field suggestions | AI suggestion overlay |

### 5.5 Document Editor Organisms

| Organism | Contains | Notes |
|----------|----------|-------|
| `DocPage` | DocHeader + EditorArea + DocSidebar | Full document page |
| `DocHeader` | BackLink + DocTitle + DocStatusBadge + Collaborators + ShareButton + OverflowMenu | Top of doc page |
| `EditorArea` | TipTapEditor + FloatingToolbar + SlashCommandMenu + AIPopupMenu | Rich text editing area |
| `DocSidebar` | OutlinePanel + CommentsPanel + BacklinksPanel | Right sidebar (collapsible); 240px wide |
| `OutlinePanel` | Heading tree (auto-generated from doc content) | Jump-to-section navigation |
| `CommentsPanel` | Comment[] (filtered to open/resolved) | Doc-level comment list |
| `BacklinksPanel` | BacklinkItem[] | Tasks and docs referencing this doc |

### 5.6 Automation Builder Organisms

| Organism | Contains | Notes |
|----------|----------|-------|
| `AutomationPage` | AutomationHeader + BuilderCanvas + SidePanels | Full automation page |
| `AutomationHeader` | BackLink + Name + StatusToggle + RunNowButton + OverflowMenu | Top of automation page |
| `BuilderCanvas` | TriggerCard + FlowConnector + ConditionCard + FlowConnector + ActionCard[] | Visual flow editor |
| `BuilderControls` | AddTrigger + AddCondition + AddAction | Bottom action bar |
| `TemplateBrowser` | TemplateCard[] + Search | Template selection grid |
| `RunHistoryList` | RunHistoryItem[] | Execution log |

### 5.7 Notification Organisms

| Organism | Contains | Notes |
|----------|----------|-------|
| `NotificationBell` | BellIcon + BadgeDot(count) | Top bar notification trigger |
| `NotificationPanel` | FilterTabs + NotificationGroup[] + ViewAllLink | Dropdown panel (400px wide) |
| `NotificationGroup` | GroupHeader (Today / Yesterday / Earlier) + NotificationItem[] | Time-grouped sections |
| `NotificationItem` | Icon + Message + Timestamp + ActionButton | Single notification |

### 5.8 Onboarding Organisms

| Organism | Contains | Notes |
|----------|----------|-------|
| `OnboardingWizard` | ProgressBar + StepContent + NavigationButtons | 3-step modal overlay |
| `OnboardingChecklist` | ChecklistItem[] (auto-checking) | Collapsible widget in sidebar bottom |

### 5.9 Settings Organisms

| Organism | Contains | Notes |
|----------|----------|-------|
| `SettingsPage` | SettingsNav + SettingsContent | Full settings layout |
| `SettingsNav` | NavItem[] (grouped by section) | Left sidebar in settings |
| `SettingsContent` | Form fields for current section | Right content area |
| `MemberList` | MemberRow[] + InviteButton | Team members management |
| `MemberRow` | Avatar + Name + Email + RoleBadge + ManageMenu | Single member display |

---

## 6. Level 4 — Templates

Page-level layout skeletons with placeholder content.

### 6.1 App Template

```
┌──────────────────────────────────────────────────────────────┐
│  ┌─ TopBar ──────────────────────────────────────────────┐  │
│  │  [Logo] [Search] [Shortcuts] [Notifications] [User]   │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌──────┬─────────────────────────────┬─────────────────┐   │
│  │      │                             │                 │   │
│  │  S   │                             │                 │   │
│  │  i   │     ContentArea             │   CopilotPanel  │   │
│  │  d   │     (Router Outlet)          │   (optional)    │   │
│  │  e   │                             │                 │   │
│  │  b   │                             │   320px         │   │
│  │  a   │                             │                 │   │
│  │  r   │                             │                 │   │
│  │      │                             │                 │   │
│  │ 240  │     flex: 1                 │                 │   │
│  └──────┴─────────────────────────────┴─────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Board View Template

```
┌──────────────────────────────────────────────────────────────┐
│  BoardHeader (Breadcrumb + ViewToggle + FilterBar + Actions) │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Column 1 │ │ Column 2 │ │ Column 3 │ │ Column 4 │       │
│  │          │ │          │ │          │ │          │       │
│  │ [Cards]  │ │ [Cards]  │ │ [Cards]  │ │ [Cards]  │       │
│  │          │ │          │ │          │ │          │       │
│  │ + Add    │ │          │ │          │ │          │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 List View Template

```
┌──────────────────────────────────────────────────────────────┐
│  ListHeader (Breadcrumb + ViewToggle + FilterBar + Actions)  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ TableHeader ───────────────────────────────────────────┐ │
│  │ ☑ │ ID │ Title │ Status │ Priority │ Due │ Assignee │…  │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ [TaskRow]                                               │ │
│  │ [TaskRow]                                               │ │
│  │ [TaskRow]                                               │ │
│  │ [TaskRow]                                               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Footer: Showing N of N tasks    Sort: [Priority ▾]         │
└──────────────────────────────────────────────────────────────┘
```

### 6.4 Task Detail Template (Panel Overlay)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ┌── Source View ───┐ ║ ┌── Task Detail Panel ──────────────────────┐  │
│  │  (dimmed)         │ ║ │  PanelHeader (ID + Title + Close + Nav)  │  │
│  │                   │ ║ │  MetadataBar (Status + Priority + ...)   │  │
│  │                   │ ║ │  ─────────────────────────────────────── │  │
│  │                   │ ║ │  TaskTabs                                │  │
│  │                   │ ║ │  ┌─────────────────────────────────────┐ │  │
│  │                   │ ║ │  │ Tab Content Area                    │ │  │
│  │                   │ ║ │  │ (Description / Comments / Activity) │ │  │
│  │                   │ ║ │  └─────────────────────────────────────┘ │  │
│  └───────────────────┘ ║ └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.5 Document Editor Template

```
┌──────────────────────────────────────────────────────────────────────────┐
│  DocHeader (Back + Title + Status + Collaborators + Share + Actions)     │
├──────────────────────────────────────────────────────┬───────────────────┤
│                                                      │  DocSidebar       │
│  EditorArea (TipTap + FloatingToolbar)               │  (collapsible)    │
│                                                      │                   │
│  # Doc Title                                         │  ── Outline ──   │
│  ## Section 1                                        │  • Section 1      │
│  Content...                                          │  • Section 2      │
│  ## Section 2                                        │  • Section 3      │
│  Content...                                          │                   │
│                                                      │  ── Comments ──  │
│                                                      │  3 open, 2 done  │
│                                                      │                   │
│                                                      │  ── Backlinks ── │
│                                                      │  2 references    │
├──────────────────────────────────────────────────────┴───────────────────┤
│  ShortcutBar (/ for commands, [[ for wiki-links, @ to mention)          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.6 Settings Template

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Settings                                                                │
├──────────────┬───────────────────────────────────────────────────────────┤
│              │                                                           │
│  SettingsNav │  SettingsContent                                          │
│              │                                                           │
│  ● Workspace │  Section Title                                           │
│    General   │  ───────────────────────────────────────────────────────  │
│    Members   │                                                           │
│    Billing   │  [Form fields for current section]                        │
│    Security  │                                                           │
│              │                                                           │
│  ────────── │  [Save Changes]                                            │
│    Profile   │                                                           │
│    Prefs     │                                                           │
│    Notifs    │                                                           │
│              │                                                           │
└──────────────┴───────────────────────────────────────────────────────────┘
```

### 6.7 Onboarding Wizard Template

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  [Logo]                                                  │
│  Sprint fast. Ship together.                            │
│                                                          │
│  ── Step N of 3 ──── ● ● ○ ──────────────────────      │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                                                    │   │
│  │  (Step-specific content)                           │   │
│  │                                                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│                   [Back]  [Skip]  [Continue →]           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 6.8 Automation Builder Template

```
┌──────────────────────────────────────────────────────────────────────────┐
│  AutomationHeader (Back + Name + Toggle + RunNow + Actions)              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  BuilderCanvas                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  [TriggerCard]                                                    │   │
│  │       │                                                            │   │
│  │       ▼                                                            │   │
│  │  [ConditionCard]                                                   │   │
│  │       │                                                            │   │
│  │   ┌───┴───┐                                                        │   │
│  │   ▼       ▼                                                        │   │
│  │ [Action] [Action]                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  BuilderControls [+ Trigger] [+ Condition] [+ Action]                   │
│                                                                          │
│  ── Templates ──────────────────────────────────────────────────────    │
│  [TemplateCard] [TemplateCard] [TemplateCard]                           │
│                                                                          │
│  ── Run History ────────────────────────────────────────────────────    │
│  [RunHistoryItem] [RunHistoryItem] [RunHistoryItem]                     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Level 5 — Pages

Templates connected to real data, state management, and routing.

### 7.1 Page Inventory

| Page | Route | Template | Primary Data Source |
|------|-------|----------|-------------------|
| `HomePage` | `/home` | App Template (content: dashboard) | User tasks, recent activity |
| `BoardPage` | `/:wsId/:listId/board` | Board View Template | Tasks filtered by sprint + filters |
| `ListPage` | `/:wsId/:listId/list` | List View Template | Tasks filtered by sprint + filters |
| `TaskDetailPage` | (overlay, no standalone route) | Task Detail Template | Single task + comments + activity |
| `DocsListPage` | `/:wsId/docs` | App Template (content: doc list) | User's docs, sorted by recent |
| `DocEditorPage` | `/:wsId/docs/:docId` | Document Editor Template | Single doc + comments + backlinks |
| `AutomationsPage` | `/:wsId/automations` | App Template (content: automation list) | Workspace automations |
| `AutomationBuilderPage` | `/:wsId/automations/:autoId` | Automation Builder Template | Single automation + run history |
| `TeamPage` | `/:wsId/team` | App Template (content: member list) | Workspace members + groups |
| `SettingsPage` | `/:wsId/settings/*` | Settings Template | Workspace + user settings |
| `OnboardingPage` | `/onboarding` | Onboarding Wizard Template | Empty state (first-time) |
| `AuthPage` | `/auth/*` | Auth Template (standalone, no shell) | — |

### 7.2 Page → Organism Dependency Map

```
HomePage
├── TopBar (from AppShell)
├── Sidebar (from AppShell)
├── CopilotPanel (from AppShell, toggleable)
└── ContentArea
    └── HomeDashboard
        ├── TaskSummaryCards
        ├── RecentActivityFeed
        └── QuickActions

BoardPage
├── AppShell (wrapping)
└── ContentArea
    └── BoardHeader
    │   ├── Breadcrumb
    │   ├── ViewToggle (Board ● | List)
    │   ├── FilterBar
    │   └── NewTaskButton
    └── BoardView
        └── BoardColumn[] (draggable)
            ├── ColumnHeader
            ├── BoardCard[] (draggable)
            │   └── TaskCard
            └── AddTaskButton

ListPage
├── AppShell (wrapping)
└── ContentArea
    └── ListHeader
    │   ├── Breadcrumb
    │   ├── ViewToggle (Board | List ●)
    │   ├── FilterBar
    │   ├── SortControl
    │   └── NewTaskButton
    └── ListView (or ListGroup[])
        ├── TableHeader
        └── TaskRow[]

TaskDetailPage (overlay)
├── PanelHeader
├── MetadataBar
│   ├── TaskStatusDropdown
│   ├── PriorityBadge
│   ├── AssigneeSelect
│   ├── SprintSelect
│   ├── DueDatePicker
│   └── LabelPicker
└── TaskTabs
    ├── DescriptionPanel
    │   └── RichTextEditor
    ├── CommentsPanel
    │   ├── Comment[]
    │   └── CommentInput
    ├── ActivityPanel
    │   └── ActivityLog[]
    ├── SubtasksPanel
    │   ├── SubtaskItem[]
    │   └── AddSubtask
    └── LinkedItemsPanel
        ├── LinkedItem[]
        └── AddLink

DocEditorPage
├── AppShell (wrapping)
└── ContentArea
    └── DocHeader
    │   ├── BackLink
    │   ├── DocTitle
    │   ├── DocStatusBadge
    │   ├── CollaboratorAvatars
    │   └── ShareButton
    └── EditorArea
    │   ├── TipTapEditor
    │   ├── FloatingToolbar
    │   ├── SlashCommandMenu
    │   └── AIPopupMenu
    └── DocSidebar (collapsible)
        ├── OutlinePanel
        ├── CommentsPanel
        └── BacklinksPanel

AutomationBuilderPage
├── AppShell (wrapping)
└── ContentArea
    └── AutomationHeader
    └── BuilderCanvas
    │   ├── TriggerCard
    │   ├── FlowConnector
    │   ├── ConditionCard
    │   ├── FlowConnector
    │   └── ActionCard[]
    └── BuilderControls
    └── TemplateBrowser
    └── RunHistoryList
```

---

## 8. Component State Catalog

### 8.1 Universal Component States

Every interactive component must implement these states:

| State | Visual Change | Trigger |
|-------|--------------|---------|
| **Default** | Base appearance | Initial render |
| **Hover** | Background darken / border color change | Mouse hover |
| **Focused** | Focus ring (2px offset, brand color) | Keyboard `Tab` or programmatic focus |
| **Active/Pressed** | Slight scale down (0.98) or darken | Mouse down |
| **Disabled** | 50% opacity, no pointer events | `disabled` prop |
| **Loading** | Spinner replaces content, interactive disabled | `loading` prop |

### 8.2 Task-Specific States

| State | Board Card | List Row | Detail Panel |
|-------|-----------|----------|--------------|
| Default | White bg, border | White bg, border-bottom | Full panel |
| Selected (multi-select) | Blue left border, blue bg tint | Blue bg tint | — |
| Being Dragged | Scale 1.02, shadow-2xl, rotated 2° | — | — |
| Drop Target (column) | Dashed border, bg tint | — | — |
| Overdue | Red left border | Red due-date text | Red due-date badge |
| Blocked | Red dot indicator | Red status badge | Red blocked banner |

### 8.3 Document States

| State | Editor | Status Badge |
|-------|--------|--------------|
| Draft | Editable, no publish button | Gray "Draft" |
| In Review | Read-only for non-editors | Blue "In Review" |
| Approved | Read-only for all | Green "Approved" |
| Loading | Skeleton placeholder | Skeleton |
| Offline | Read-only, "Offline" banner | Normal |

### 8.4 Automation States

| State | Builder | Toggle | Run History |
|-------|---------|--------|-------------|
| Active | Full edit access | Green toggle ON | Live updates |
| Inactive | Full edit access | Gray toggle OFF | Shows last runs |
| Running | Read-only (during execution) | Green + spinner | Shows current run |
| Error | Full edit access, error banner | Red toggle + error | Shows failed runs |

---

## 9. Composition Patterns

### 9.1 Pattern: Compound Components

Used for components with internal sub-parts that need coordinated state.

```
<BoardView>
  <BoardView.Column status="backlog">
    <BoardView.Card taskId="SIO-231" />
    <BoardView.Card taskId="SIO-232" />
  </BoardView.Column>
  <BoardView.Column status="in_progress">
    <BoardView.Card taskId="SIO-245" />
  </BoardView.Column>
</BoardView>
```

**Components using this pattern:**

| Parent | Children | Shared State |
|--------|----------|--------------|
| `BoardView` | `Column`, `Card` | Drag state, drop zones |
| `ListView` | `TableHeader`, `Row`, `Group` | Sort state, selection |
| `TaskDetailPanel` | `PanelHeader`, `MetadataBar`, `Tabs` | Current task ID |
| `DocEditor` | `Editor`, `Toolbar`, `Sidebar` | Current doc, collaborators |
| `AutomationBuilder` | `TriggerCard`, `ConditionCard`, `ActionCard` | Flow state, validation |

### 9.2 Pattern: Render Props / Compound Context

Used when a parent needs to expose data to arbitrary child renderers.

```
<FilterBar>
  {({ filters, addFilter, removeFilter }) => (
    <>
      {filters.map(f => (
        <FilterChip key={f.id} label={f.label} onRemove={() => removeFilter(f.id)} />
      ))}
      <FilterDropdown onAdd={addFilter} />
    </>
  )}
</FilterBar>
```

### 9.3 Pattern: Portal Rendering

Used for overlays that must escape their parent's overflow/positioning.

| Component | Portal Target | Trigger |
|-----------|--------------|---------|
| `TaskDetailPanel` | `document.body` (overlay) | Click task card/row |
| `CommandPalette` | `document.body` (modal) | `⌘K` |
| `Tooltip` | `document.body` (floating) | Hover / focus |
| `NotificationPanel` | Top bar (dropdown) | Click bell |
| `Dropdown menus` | Near trigger element | Click trigger |
| `OnboardingWizard` | `document.body` (modal) | First login |
| `Toast` | `document.body` (fixed top-right) | Any toast trigger |

### 9.4 Pattern: Layout Slots

Used for page templates with swappable content regions.

```
<PageTemplate
  header={<BoardHeader />}
  sidebar={<Sidebar />}
  content={<BoardView />}
  panel={<CopilotPanel />}
/>
```

| Template | Slots |
|----------|-------|
| `AppShell` | `topbar`, `sidebar`, `content`, `panel` (optional copilot) |
| `BoardPage` | inherits AppShell slots + `content` = BoardView |
| `DocEditorPage` | inherits AppShell slots + `content` = DocHeader + EditorArea + DocSidebar |
| `SettingsPage` | inherits AppShell slots + `content` = SettingsNav + SettingsContent |

### 9.5 Pattern: Controlled / Uncontrolled Duality

Components support both controlled (parent manages state) and uncontrolled (internal state) usage.

| Component | Controlled Prop | Uncontrolled Default |
|-----------|----------------|---------------------|
| `Input` | `value` + `onChange` | Empty string, internal state |
| `Select` | `value` + `onSelect` | No selection, internal state |
| `Toggle` | `checked` + `onToggle` | Off, internal state |
| `Checkbox` | `checked` + `onCheck` | Unchecked, internal state |
| `TaskStatusDropdown` | `status` + `onStatusChange` | Task's current status |
| `FilterBar` | `filters` + `onFilterChange` | Empty array, internal state |

### 9.6 Pattern: Composition Over Configuration

Prefer composing small components over passing many props to a large one.

**❌ Anti-pattern:**
```
<TaskCard
  id="SIO-245"
  title="Auth refresh token"
  status="in_progress"
  priority="P1"
  assignee={priya}
  dueDate="2026-07-12"
  labels={["auth"]}
  showDragHandle
  showPriority
  showAssignee
  showDueDate
  showLabels
  compact={false}
  onClick={handleClick}
/>
```

**✅ Correct pattern:**
```
<BoardCard taskId="SIO-245" onDragStart={handleDrag}>
  <TaskCard>
    <TaskIdentifier id="SIO-245" />
    <TaskTitle>Auth refresh token</TaskTitle>
    <TaskMeta>
      <PriorityBadge level="P1" />
      <Avatar name="Priya" size="sm" />
      <Badge variant="date" value="Jul 12" />
      <Badge variant="label" value="auth" />
    </TaskMeta>
  </TaskCard>
</BoardCard>
```

---

## 10. Component ↔ Screen Mapping

### 10.1 Components Per Screen

| Screen | Atoms Used | Molecules Used | Organisms Used |
|--------|-----------|---------------|----------------|
| **App Shell** | Icon, Avatar, Button, Tooltip, Skeleton | NavItem, NavItemGroup, SearchInput, UserMenu, WorkspaceSwitcher | TopBar, Sidebar, ContentArea, CopilotPanel |
| **Board View** | Icon, Badge, Avatar, Button, Tooltip, Skeleton | TaskCard, TaskMeta, PriorityBadge, TaskIdentifier | BoardHeader, BoardView, BoardColumn, ColumnHeader, BoardCard, BoardSwimlane |
| **List View** | Icon, Badge, Avatar, Checkbox, Button, Skeleton | TaskRow, TaskMeta, PriorityBadge, TaskIdentifier, FilterChip | ListHeader, ListView, TableHeader, TaskRow, ListGroup, ListGroupHeader |
| **Task Detail** | Icon, Badge, Avatar, Button, Input, Toggle, Skeleton | TaskTitle, TaskStatusDropdown, PriorityBadge, SubtaskItem, LinkedItem, AttachmentItem, Comment, AIMetadataCard | TaskDetailPanel, PanelHeader, MetadataBar, TaskTabs, DescriptionPanel, CommentsPanel, ActivityPanel, SubtasksPanel, LinkedItemsPanel, AITriageBanner |
| **Doc Editor** | Icon, Badge, Avatar, Button, Heading, Text, Code, Skeleton | DocTitle, DocStatusBadge, WikiLink, InlineComment, VersionEntry, BacklinkItem, SlashMenuItem, AIPopupMenu | DocPage, DocHeader, EditorArea, DocSidebar, OutlinePanel, CommentsPanel, BacklinksPanel |
| **Automations** | Icon, Badge, Button, Toggle, Skeleton | TriggerCard, ConditionCard, ActionCard, FlowConnector, RunHistoryItem, TemplateCard | AutomationPage, AutomationHeader, BuilderCanvas, BuilderControls, TemplateBrowser, RunHistoryList |
| **Notifications** | Icon, Badge, Button, Avatar, Skeleton | NotificationItem | NotificationBell, NotificationPanel, NotificationGroup |
| **Settings** | Icon, Button, Input, Select, Toggle, Skeleton, Avatar | FormField, MemberRow, NavItem | SettingsPage, SettingsNav, SettingsContent, MemberList |
| **Onboarding** | Icon, Button, Input, Progress, Skeleton | FormField | OnboardingWizard, OnboardingChecklist |

### 10.2 Component Reuse Frequency

| Component | Screens Used | Priority |
|-----------|-------------|----------|
| `Avatar` | All screens | P0 |
| `Badge` | All screens | P0 |
| `Button` | All screens | P0 |
| `Icon` | All screens | P0 |
| `Tooltip` | All screens | P0 |
| `Skeleton` | All screens | P0 |
| `SearchInput` | App Shell, Board, List, Docs | P0 |
| `TaskCard` | Board View | P0 |
| `TaskRow` | List View | P0 |
| `PriorityBadge` | Board, List, Task Detail | P0 |
| `TaskIdentifier` | Board, List, Task Detail | P0 |
| `FilterChip` | Board, List | P0 |
| `FilterDropdown` | Board, List | P0 |
| `Comment` | Task Detail, Doc Editor | P0 |
| `FormField` | Settings, Onboarding, Modals | P0 |
| `NavItem` | Sidebar, Settings Nav | P0 |
| `RichTextEditor` | Task Detail, Doc Editor | P0 |
| `SlashMenuItem` | Doc Editor | P0 |
| `AIPopupMenu` | Doc Editor | P0 |
| `CopilotMessage` | Copilot Panel | P0 |
| `TriggerCard` | Automation Builder | P0 |
| `ActionCard` | Automation Builder | P0 |
| `FlowConnector` | Automation Builder | P0 |

---

## Appendix A: Component File Structure

```
src/components/
├── atoms/
│   ├── Avatar/
│   │   ├── Avatar.tsx
│   │   ├── Avatar.test.tsx
│   │   ├── Avatar.stories.tsx
│   │   └── index.ts
│   ├── Badge/
│   ├── Button/
│   ├── Checkbox/
│   ├── Code/
│   ├── Divider/
│   ├── Heading/
│   ├── Icon/
│   ├── IconButton/
│   ├── Input/
│   ├── Link/
│   ├── Progress/
│   ├── Radio/
│   ├── Select/
│   ├── Skeleton/
│   ├── Spinner/
│   ├── Text/
│   ├── Textarea/
│   ├── Toggle/
│   ├── Tooltip/
│   ├── Toast/
│   └── EmptyState/
├── molecules/
│   ├── AICopilotMessage/
│   ├── AICopilotInput/
│   ├── AICopilotSuggestion/
│   ├── AIMetadataCard/
│   ├── AIPopupMenu/
│   ├── AttachmentItem/
│   ├── AutomationTemplateCard/
│   ├── Breadcrumb/
│   ├── CollaboratorAvatars/
│   ├── Comment/
│   ├── CommandPaletteInput/
│   ├── ConditionCard/
│   ├── DateRangePicker/
│   ├── DocStatusBadge/
│   ├── DocTitle/
│   ├── FilterChip/
│   ├── FilterDropdown/
│   ├── FlowConnector/
│   ├── FormField/
│   ├── InlineComment/
│   ├── LinkedItem/
│   ├── NavItem/
│   ├── NavItemGroup/
│   ├── NotificationItem/
│   ├── PriorityBadge/
│   ├── RichTextToolbar/
│   ├── RunHistoryItem/
│   ├── SearchInput/
│   ├── SlashMenuItem/
│   ├── SubtaskItem/
│   ├── TabGroup/
│   ├── TaskIdentifier/
│   ├── TaskMeta/
│   ├── TaskRow/
│   ├── TaskTitle/
│   ├── TemplateCard/
│   ├── TriggerCard/
│   ├── UserMenu/
│   ├── VersionEntry/
│   ├── ViewToggle/
│   ├── WikiLink/
│   └── WorkspaceSwitcher/
├── organisms/
│   ├── AppShell/
│   ├── AutomationBuilder/
│   ├── AutomationHeader/
│   ├── AutomationPage/
│   ├── BoardCard/
│   ├── BoardColumn/
│   ├── BoardHeader/
│   ├── BoardSwimlane/
│   ├── BoardView/
│   ├── BuilderCanvas/
│   ├── BuilderControls/
│   ├── ColumnHeader/
│   ├── CopilotPanel/
│   ├── DescriptionPanel/
│   ├── DocEditor/
│   ├── DocHeader/
│   ├── DocPage/
│   ├── DocSidebar/
│   ├── ListGroup/
│   ├── ListGroupHeader/
│   ├── ListHeader/
│   ├── ListView/
│   ├── MetadataBar/
│   ├── NotificationBell/
│   ├── NotificationGroup/
│   ├── NotificationPanel/
│   ├── OnboardingChecklist/
│   ├── OnboardingWizard/
│   ├── OutlinePanel/
│   ├── PanelHeader/
│   ├── RunHistoryList/
│   ├── SettingsContent/
│   ├── SettingsNav/
│   ├── SettingsPage/
│   ├── Sidebar/
│   ├── SubtasksPanel/
│   ├── TableHeader/
│   ├── TemplateBrowser/
│   ├── TaskDetailPanel/
│   ├── TaskTabs/
│   ├── TopBar/
│   └── CommentsPanel/
├── templates/
│   ├── AppShellTemplate.tsx
│   ├── BoardViewTemplate.tsx
│   ├── DocEditorTemplate.tsx
│   ├── ListViewTemplate.tsx
│   ├── AutomationBuilderTemplate.tsx
│   ├── SettingsTemplate.tsx
│   └── OnboardingWizardTemplate.tsx
└── pages/
    ├── HomePage.tsx
    ├── BoardPage.tsx
    ├── ListPage.tsx
    ├── DocsListPage.tsx
    ├── DocEditorPage.tsx
    ├── AutomationsPage.tsx
    ├── AutomationBuilderPage.tsx
    ├── TeamPage.tsx
    ├── SettingsPage.tsx
    ├── OnboardingPage.tsx
    └── AuthPage.tsx
```

---

> **Next Document:** [05-COLOR-SYSTEM.md](./05-COLOR-SYSTEM.md) — Complete color palette, semantic tokens, dark mode, and usage guidelines
