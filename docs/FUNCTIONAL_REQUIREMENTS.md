# Sprintio — Functional Requirements

**Document Type:** Functional Requirements (detailed specifications)  
**Product:** Sprintio — Sprint fast. Ship together.  
**Version:** 1.0  
**Status:** Finalized  
**Date:** 2026-07-07  
**Related Docs:** [PRD](./PRD.md), [User Stories](./USER_STORIES.md), [User Personas](./USER_PERSONAS.md)

---

## 1. Introduction

This document is the canonical detailed specification of every Functional Requirement (FR) in Sprintio, expanded from the short requirement tables in **PRD §5 (Functional Requirements)**. Each FR block below expands a single PRD §5 ID into a product-level description, concrete functional behaviors, testable acceptance criteria, dependency references, and the user stories that map to it.

The companion documents provide the upstream context:

- **[PRD](./PRD.md)** — vision, strategy, NFRs, MVP scope, and the authoritative §5 requirement tables that this document expands. Every FR below maps 1:1 to a PRD §5 ID.
- **[User Stories](./USER_STORIES.md)** — the testable backlog (US-E*-NN) that realizes these FRs; referenced per-FR under "Related User Stories."
- **[User Personas](./USER_PERSONAS.md)** — the six personas (Sarah, Marcus, Priya, Alex, Jordan, Casey) whose jobs-to-be-done motivate each requirement.

### Scope & Conventions

- **Priority** values (P0 / P1 / P2) are taken verbatim from the PRD §5 tables and are not re-derived here. Note: the [MVP Definition](./MVP_DEFINITION.md) further scopes which P0 FRs ship in v1.0 — some P0 FRs are deferred from the MVP to reduce scope (e.g., Timeline/Gantt, Dashboard, Table view, billing, desktop app). Refer to the MVP Definition for the authoritative "what ships" list.
- **Counts** are fixed by the PRD: E1=12, E2=11, E3=11, E4=12, E5=15, E6=10, E7=9, E8=10, E9=8, E10=6, E11=6 — **110 FRs total**. The USER_STORIES backlog carries additional stories beyond these FRs (e.g., saved filters, shareable view links, invitation flow, native integration specifics); those are referenced where they inform acceptance criteria but do not add FRs.
- Where the PRD is silent, behavior is inferred conservatively and noted inline (e.g., recurrency stacking defaults, field-error handling). No net-new features beyond the PRD's intent are introduced.

### ID-numbering note (resolved ambiguity)

The PRD §5.1 table lists two rows labeled "FR-1.6" (activity log, then bulk operations). To keep IDs contiguous and match the task's mandated count (E1=12, FR-1.1–FR-1.12), bulk operations is treated as **FR-1.7** and all subsequent E1 IDs shift down by one (templates → FR-1.8, recurring → FR-1.9, time tracking → FR-1.10, goals → FR-1.11, formulas → FR-1.12). The underlying requirement content is unchanged.

---

## E1: Core Workspace & Data Model (FR-1.1 – FR-1.12)

### FR-1.1 — Hierarchical workspaces: Workspace → Space → Folder → List → Task

- **Priority:** P0
- **Description:** The unified data model is the foundation of Sprintio — a single, consistent hierarchy (Workspace → Space → Folder → List → Task) that every view, doc, automation, and AI feature reads from. It lets any team model its structure without fragmenting work across tools.
- **Detailed Requirements:**
  - A **Workspace** is the top-level container owning members, billing, settings, and all nested content.
  - A **Space** is a top-level project/area within a workspace (e.g., "Engineering", "Client A"); unlimited Spaces per workspace within plan limits.
  - A **Folder** organizes content within a Space; **Lists** hold tasks and carry a view configuration.
  - A **Task** is the atomic unit of work; it always carries a resolvable ancestry path (Workspace/Space/Folder/List).
  - Moving a task between Lists/Folders must update its ancestry and preserve all references (comments, links, automations) without breaking them.
  - The hierarchy must support deep nesting (unlimited Spaces/Folders/Lists) subject only to plan-imposed storage/member limits.
- **Acceptance Criteria:**
  - Given a workspace, when a user creates a Space, the Space nests under the workspace and is visible in the sidebar.
  - When a Folder is added inside a Space, it nests under that Space; when a List is added inside a Folder, tasks created in it inherit the full path.
  - When a task is moved across Lists/Folders, its ancestry updates and inbound references remain valid.
  - The hierarchy accepts unlimited Spaces/Folders/Lists within plan limits (no hard-coded shallow cap).
- **Dependencies:** None
- **Related User Stories:** US-E1-01

### FR-1.2 — Flexible task schema: Custom fields (15+ types), custom statuses, templates

- **Priority:** P0
- **Description:** Tasks must be adaptable to how each team actually works. A configurable schema — 15+ custom field types, customizable status sets, and reusable templates — lets teams capture priority, value, and effort in their own terms rather than a rigid default.
- **Detailed Requirements:**
  - Provide at least 15 custom field types, including: text, long text, number, select, multi-select, date, person, checkbox, URL, email, phone, status, rating, formula, rollup, lookup, and location (location required for Map view, FR-2.8).
  - Allow definition of a custom status set per List/Space; statuses render as columns/options in Board and List views.
  - Custom fields must be filterable and sortable in all views (FR-2.x).
  - Schema changes apply to all existing tasks in the List without data loss; new/removed fields backfill sensibly (e.g., empty for new required fields).
  - Field configuration must be savable as part of a task template (FR-1.7).
  - Default field types (e.g., assignee, due date, priority) ship pre-configured for instant use.
- **Acceptance Criteria:**
  - When a user adds a custom field, they can choose from at least 15 distinct types.
  - When a custom status set is defined, Board/List views render those statuses as columns/options.
  - Custom fields are filterable and sortable in views.
  - Schema changes apply to all tasks in the List without data loss.
  - Field configuration is savable as part of a task template.
- **Dependencies:** FR-1.1
- **Related User Stories:** US-E1-02

### FR-1.3 — Task relationships: Subtasks, dependencies (blocked by/blocks), duplicates, related

- **Priority:** P0
- **Description:** Work is connected. Subtasks, blocking dependencies, duplicate markers, and related-task links make those connections explicit so blockers and structure are visible rather than inferred.
- **Detailed Requirements:**
  - **Subtasks:** a task may have many subtasks; subtask completion rolls up to the parent's completion percentage.
  - **Dependencies:** a task may be marked `blocked by` and/or `blocks` other tasks; both directions render a blocking indicator on the dependent task.
  - When a blocking task completes, the blocked task can transition out of its blocked state (state change surfaced, not automatic unless configured).
  - **Duplicate:** a task can be marked as a duplicate of another; the system supports routing/merging (survivor selection, link preservation — see FR-5.11 for AI-assisted merge).
  - **Related:** related-task links are bidirectional and visible on both sides.
  - Dependency data feeds the Timeline/Gantt critical-path and risk detection (FR-2.5, FR-5.7).
- **Acceptance Criteria:**
  - When a task is marked blocked by another, the dependent task shows a blocking indicator.
  - When the blocking task is completed, the blocked task can transition out of its blocked state.
  - A task can have multiple subtasks that roll up completion to the parent.
  - A task can be marked a duplicate of another and merged/routed.
  - Related-task links are bidirectional and visible on both sides.
- **Dependencies:** FR-1.1
- **Related User Stories:** US-E1-03

### FR-1.4 — Rich text task description with mentions, slash commands, embeds

- **Priority:** P0
- **Description:** The task description is a lightweight document surface — rich text with @mentions, slash-command inserts, and embeds — so an engineer can write an RFC-style brief without leaving the task.
- **Detailed Requirements:**
  - Rich formatting: bold, italic, headings, lists, code blocks, tables, links.
  - `@mention` a teammate triggers a notification to that user.
  - `/` slash-command menu offers inserts (code, date, embed, etc.) — see also FR-3.6 for the doc editor's slash set.
  - Inline embeds of Figma frames, links, and images.
  - Edits resolve in real time with other viewers (collaboration substrate described in E3; FR-3.1).
  - Rendering must be consistent between the task card, List preview, and Doc preview.
- **Acceptance Criteria:**
  - When a user types `@` in a description, a teammate can be mentioned and receives a notification.
  - When a user types `/`, a slash-command menu appears for inserts.
  - A Figma frame, link, or image can be embedded inline.
  - Rich text renders consistently in List and Doc previews.
  - Editing resolves in real time with other viewers (FR-3.1).
- **Dependencies:** FR-1.1
- **Related User Stories:** US-E1-04

### FR-1.5 — Comments with threads, reactions, assignments, rich text, code blocks

- **Priority:** P0
- **Description:** Comments are the conversation layer on a task — threaded, reactable, assignable, and richly formatted — so feedback and decisions stay attached to the work instead of scattering across chat.
- **Detailed Requirements:**
  - Threaded replies; a comment can be replied to within a thread and reacted to with emoji.
  - A comment can be **assigned** to a user, converting it into an action with notification.
  - Rich text and code-block formatting are supported in comment bodies.
  - Threads are visible on the task and recorded in the activity log (FR-1.6).
  - A thread can be **resolved** to collapse it from the active view (resolution retained in history).
  - Comment notifications respect per-user notification preferences.
- **Acceptance Criteria:**
  - When a user comments, they can reply in a thread and react with emoji.
  - A comment can be assigned to a user, becoming an action with notification.
  - Comments support rich text and code blocks.
  - Comment threads are visible on the task and in the activity log.
  - A thread can be resolved to collapse it from the active view.
- **Dependencies:** FR-1.1
- **Related User Stories:** US-E1-05

### FR-1.6 — Activity log / audit trail (immutable, filterable, exportable)

- **Priority:** P0
- **Description:** Every meaningful change is recorded in an immutable, append-only audit trail. Leadership and security teams rely on it as the single source of truth for "what actually happened."
- **Detailed Requirements:**
  - An immutable entry is appended for any task field, comment, status, or structural change.
  - Entries cannot be edited or deleted after creation.
  - Entries link through to the current state of the affected entity.
  - Filterable by actor, entity, action type, and date range.
  - Exportable to CSV/JSON for downstream use (billing, SIEM, e-discovery).
  - Forms the backbone for stale-task nudges (FR-4.2 trigger), workspace analytics (FR-6.9), and SIEM export (FR-6.7 / FR-8.5).
- **Acceptance Criteria:**
  - When any task field, comment, or status changes, an immutable entry is appended.
  - The log can be filtered by actor, entity, action type, and date range.
  - The log can be exported to CSV/JSON.
  - Entries cannot be edited or deleted after creation.
  - Entries link through to the current state of the affected entity.
- **Dependencies:** FR-1.1
- **Related User Stories:** US-E1-06

### FR-1.7 — Bulk operations (multi-select: move, assign, status, delete, duplicate)

- **Priority:** P0
- **Description:** Bulk operations let managers act on many tasks at once — sprint setup, re-assignment, status changes — instead of editing one row at a time.
- **Detailed Requirements:**
  - Multi-select via checkboxes and keyboard (shift/ctrl-click) surfaces a bulk-action bar.
  - Supported bulk actions: change status, change assignee, move to another List, duplicate, delete.
  - Each affected task generates its own entry in the activity log (FR-1.6).
  - Destructive actions (delete, move) require a single confirmation step.
  - Bulk actions respect the acting user's permissions per task.
- **Acceptance Criteria:**
  - When multiple tasks are selected, a bulk-action bar appears.
  - Status, assignee, or move-to-List can be applied to all selected tasks in one action.
  - Selected tasks can be duplicated or deleted with a single confirmation.
  - Bulk actions generate one audit-log entry per task.
  - Keyboard multi-select (shift/ctrl-click) is supported.
- **Dependencies:** FR-1.1
- **Related User Stories:** US-E1-07

### FR-1.8 — Task templates with variable substitution

- **Priority:** P0
- **Description:** Task templates capture recurring structures (fields, description, subtasks, custom values) with `{{variable}}` placeholders so teams get consistent specs without copy-paste.
- **Detailed Requirements:**
  - Saving a task as a template captures its fields, description, subtasks, and custom field values.
  - Instantiating a template prompts for `{{variable}}` values and substitutes them into the output.
  - A template may include a predefined subtask checklist.
  - Templates are reusable across Lists in the same Space.
  - Instantiation produces a normal, fully-editable task.
  - Template configuration may include a custom-field schema (FR-1.2).
- **Acceptance Criteria:**
  - When a task is saved as a template, its fields, description, subtasks, and custom values are captured.
  - When a template is instantiated, `{{variable}}` placeholders prompt for values and substitute them.
  - A template can include a predefined subtask checklist.
  - Templates are reusable across Lists in the same Space.
  - Template instantiation creates a normal task with full editability.
- **Dependencies:** FR-1.2
- **Related User Stories:** US-E1-08

### FR-1.9 — Recurring tasks (cron-style, natural language)

- **Priority:** P0
- **Description:** Recurring tasks ensure chores (dependency bumps, timesheet reminders, on-call handoffs) never get forgotten, scheduled via either cron expressions or natural-language cadences.
- **Detailed Requirements:**
  - A task can be set to recur by a cron expression or by natural language (e.g., "every 2 weeks on Monday").
  - On firing, a new instance is created with the same template content and assignments.
  - User can choose to carry over the previous instance's subtask completion state or reset it.
  - Configurable anti-stacking: by default, a new instance is not created if the prior instance is still incomplete (toggleable). _(Inferred conservative default — PRD silent.)_
  - Recurrence schedule is visible and editable from the task.
  - Recurrence respects the workspace timezone.
- **Acceptance Criteria:**
  - When a task is set to recur, the cadence can be defined by cron expression or natural language.
  - When the recurrence fires, a new instance is created with the same template and assignments.
  - The user can choose to carry over or reset the prior instance's subtask state.
  - Recurring tasks do not stack duplicates if the prior instance is incomplete (configurable).
  - Recurrence is visible and editable from the task.
- **Dependencies:** FR-1.8
- **Related User Stories:** US-E1-09

### FR-1.10 — Time tracking (manual + automatic), estimates, time reports

- **Priority:** P1
- **Description:** Accurate effort capture underpins billing (Casey) and utilization. Time tracking supports manual and automatic timers, estimates, and aggregated reporting.
- **Detailed Requirements:**
  - A start/pause/resume timer accrues elapsed time against a task; manual entries accept date, duration, and note.
  - Each task shows an estimate-vs-logged-time comparison.
  - A time report aggregates entries by person, task, List, and date range.
  - Time entries appear in the activity log (FR-1.6) and are exportable for billing.
  - Automatic tracking may accrue time while a task is in an "active" status (configurable). _(Inferred — PRD silent on exact auto trigger.)_
  - Feeds SLA/budget alerts and time-entry reminders (FR-4.18, FR-4.17).
- **Acceptance Criteria:**
  - When a timer is started on a task, elapsed time accrues and can be paused/resumed.
  - Time can be logged manually with date, duration, and note.
  - Each task shows an estimate vs logged-time comparison.
  - A time report aggregates entries by person, task, List, and date range.
  - Time entries appear in the activity log and are exportable for billing.
- **Dependencies:** FR-1.1
- **Related User Stories:** US-E1-10

### FR-1.11 — Goals/OKRs linked to tasks, progress rollup

- **Priority:** P1
- **Description:** Goals/OKRs connect daily work to strategy. A goal links contributing tasks and sub-goals, and its progress rolls up automatically as linked work changes state.
- **Detailed Requirements:**
  - A Goal can link contributing tasks and sub-goals.
  - Progress rolls up from the completion of linked tasks (and sub-goal progress).
  - A goal supports a target metric and a current value.
  - Goals are visible at Workspace and Portfolio altitude (FR-2.11).
  - A goal's progress updates automatically when linked task statuses change.
  - Goals are usable as progress widgets in Dashboards (FR-2.6) and the Goal/OKR rollup board (FR-2.11).
- **Acceptance Criteria:**
  - When a Goal is created, contributing tasks and sub-goals can be linked to it.
  - Progress of a goal rolls up from the completion of linked tasks.
  - A target metric and current value can be set per goal.
  - Goals are visible at Workspace and Portfolio altitude (FR-2.11).
  - A goal's progress updates automatically when linked task statuses change.
- **Dependencies:** FR-1.1, FR-1.3
- **Related User Stories:** US-E1-11

### FR-1.12 — Custom field formulas, rollups, lookups

- **Priority:** P1
- **Description:** Computed fields let backlog metrics maintain themselves — formula fields compute per row, rollups aggregate across related/child tasks, and lookups pull values from related tasks.
- **Detailed Requirements:**
  - A **formula** field computes from other field values per row (arithmetic, conditionals).
  - A **rollup** field aggregates a linked/child field (sum, count, average) across related tasks.
  - A **lookup** field pulls a value from a related task into the current row.
  - All three recalculate automatically when source values change.
  - Invalid formulas surface a clear inline error rather than corrupting data.
  - Computed fields are read-only in inline editing and excluded from manual entry.
- **Acceptance Criteria:**
  - When a formula field is defined, it computes from other field values per row.
  - A rollup field aggregates a linked/child field (sum, count, average) across related tasks.
  - A lookup field pulls a value from a related task into the current row.
  - Formula/rollup/lookup fields recalculate automatically on source changes.
  - Invalid formulas surface a clear inline error rather than corrupting data.
- **Dependencies:** FR-1.2, FR-1.3
- **Related User Stories:** US-E1-12

---

## E2: Views & Visualization (FR-2.1 – FR-2.11)

### FR-2.1 — List view (sortable, groupable, filterable, column customization)

- **Priority:** P0
- **Description:** The List view is the default task surface — rows are tasks, columns are fields — with sort, group, filter, and column control so each user sees exactly their work.
- **Detailed Requirements:**
  - Rows represent tasks; columns represent fields (including custom fields, FR-1.2).
  - Sort by any column; group by any select/custom field.
  - Filter by field values, assignee, and label.
  - Show/hide and reorder columns; inline field editing from the row.
  - Reusable saved filters (e.g., "My Work", "Blocked") apply across List/Board/Table views (see US-E2-13).
  - Any List can spawn additional view types from the same data (FR-2.10; see US-E2-14).
- **Acceptance Criteria:**
  - When a List is opened, rows represent tasks and columns represent fields.
  - The user can sort by any column and group by any select/custom field.
  - The user can filter by field values, assignee, and label.
  - Columns can be shown/hidden and reordered.
  - Fields can be edited inline from the row.
- **Dependencies:** FR-1.2
- **Related User Stories:** US-E2-01, US-E2-13, US-E2-14

### FR-2.2 — Board/Kanban view (swimlanes, WIP limits, drag-drop, sub-columns)

- **Priority:** P0
- **Description:** The Board view makes status flow visual and fast, with swimlanes, WIP limits, drag-and-drop, and optional per-person sub-columns for review routing.
- **Detailed Requirements:**
  - Columns map to a status (or other grouping) field.
  - Drag a card between columns to change its status.
  - WIP limits per column warn (non-blocking) when exceeded.
  - Swimlanes group cards by assignee, priority, or another field.
  - Sub-columns (e.g., per-person) render within a column when configured.
  - Drag-drop changes are recorded in the activity log (FR-1.6).
- **Acceptance Criteria:**
  - When Board is opened, columns map to a status (or other grouping) field.
  - A card can be dragged between columns to change its status.
  - WIP limits per column warn when exceeded.
  - Swimlanes group cards by assignee, priority, or another field.
  - Sub-columns render within a column when configured.
- **Dependencies:** FR-1.2
- **Related User Stories:** US-E2-02

### FR-2.3 — Table/Spreadsheet view (inline edit, frozen cols, formulas, pivot)

- **Priority:** P0
- **Description:** The Table view behaves like a spreadsheet teams already know — inline cell editing, frozen columns, computed fields, and pivots — for backlog math and bulk review.
- **Detailed Requirements:**
  - Any cell is editable inline.
  - One or more leading columns can be frozen while scrolling.
  - Formula, rollup, and lookup fields compute and display in cells (FR-1.12).
  - A pivot of tasks by two dimensions (e.g., owner × priority) can be created.
  - Bulk cell edits apply across selected ranges.
  - Keyboard navigation and paste semantics mirror common spreadsheet UX.
- **Acceptance Criteria:**
  - When Table is opened, any cell can be edited inline.
  - One or more leading columns can be frozen while scrolling.
  - Formula and rollup fields compute and display in cells (FR-1.12).
  - A pivot of tasks by two dimensions can be created.
  - Bulk cell edits apply across selected ranges.
- **Dependencies:** FR-1.12
- **Related User Stories:** US-E2-03

### FR-2.4 — Calendar view (day/week/month, drag-drop reschedule, multi-calendar)

- **Priority:** P0
- **Description:** The Calendar view puts due (and start) dates in time, with day/week/month modes, drag-to-reschedule, and multiple toggleable calendars.
- **Detailed Requirements:**
  - Tasks with dates appear on their due and/or start dates.
  - Drag a task to a new date updates its due date.
  - Multiple calendars (by assignee or List) can be toggled on/off.
  - Day/week/month modes are switchable.
  - Tasks without dates are excluded from the grid but accessible from a sidebar.
  - Reschedule actions are recorded in the activity log (FR-1.6).
- **Acceptance Criteria:**
  - When Calendar is opened, tasks with dates appear on their due (and start) dates.
  - Dragging a task to a new date updates its due date.
  - Multiple calendars (by assignee or List) can be toggled on/off.
  - Day/week/month modes are switchable.
  - Tasks without dates are excluded but accessible from a sidebar.
- **Dependencies:** FR-1.1
- **Related User Stories:** US-E2-04

### FR-2.5 — Timeline/Gantt view (dependencies, critical path, baseline, milestones)

- **Priority:** P0
- **Description:** The Timeline/Gantt view supports cross-team sequencing — tasks plot as bars, dependency lines render, the critical path is highlighted, and baselines show variance.
- **Detailed Requirements:**
  - Tasks plot as bars between start and due dates.
  - Dependency lines render between linked tasks (FR-1.3).
  - The view highlights the critical path through dependent tasks.
  - A baseline can be set and variance against it displayed.
  - Milestone tasks render as diamond markers.
  - Timeline respects the same permissions as the source List.
- **Acceptance Criteria:**
  - When Timeline is opened, tasks plot as bars between start and due dates.
  - Dependency lines render between linked tasks (FR-1.3).
  - The critical path through dependent tasks is highlighted.
  - A baseline can be set and variance against it viewed.
  - Milestone tasks render as diamond markers.
- **Dependencies:** FR-1.3
- **Related User Stories:** US-E2-05

### FR-2.6 — Dashboard view (widgets: charts, metrics, text, embeds, progress)

- **Priority:** P0
- **Description:** The Dashboard view gives leadership a one-screen readout via a palette of widgets — charts, single KPIs, text, embeds, and progress.
- **Detailed Requirements:**
  - A Dashboard is composed of widgets from a palette.
  - Chart widgets bind to a List/filter and render counts by field.
  - Metric widgets show a single KPI with optional trend.
  - Embed and text widgets accept arbitrary content/links.
  - Progress widgets render completion % from a goal or filtered set (FR-1.11).
  - Dashboards are permissioned like their underlying data; shared dashboards respect viewer scope.
- **Acceptance Criteria:**
  - When a Dashboard is created, widgets can be added from a palette.
  - Chart widgets bind to a List/filter and render counts by field.
  - Metric widgets show a single KPI with optional trend.
  - Embed and text widgets accept arbitrary content/links.
  - Progress widgets render completion % from a goal or filtered set (FR-1.11).
- **Dependencies:** FR-1.11
- **Related User Stories:** US-E2-06

### FR-2.7 — Workload/Capacity view (per person, per team, capacity planning)

- **Priority:** P1
- **Description:** The Workload/Capacity view surfaces overallocation before it becomes a miss — assigned effort vs configurable capacity, per person and per team.
- **Detailed Requirements:**
  - Each person/team shows assigned effort vs capacity.
  - Capacity is configurable per person (hours or points per period).
  - Overallocation (>100%) is visually flagged.
  - The view can be grouped by team with drill-down to an individual.
  - Filtering by date range reflects scheduled load over that window.
  - Rebalancing a task updates both sides' load immediately.
  - Feeds AI capacity planning/forecasting (FR-5.6).
- **Acceptance Criteria:**
  - When Workload is opened, each person/team shows assigned effort vs capacity.
  - Capacity is configurable per person (hours or points per period).
  - Overallocation (>100%) is visually flagged.
  - The view can be grouped by team with drill-down to an individual.
  - Filtering by date range reflects scheduled load over that window.
  - Rebalancing a task updates both sides' load immediately.
- **Dependencies:** FR-2.1
- **Related User Stories:** US-E2-07

### FR-2.8 — Map view (location-based tasks)

- **Priority:** P2
- **Description:** The Map view plots location-tagged tasks as pins for field/client visit planning, using a location custom field type with geocoding.
- **Detailed Requirements:**
  - Tasks with a location field plot as pins on a map.
  - The map supports filtering which tasks appear.
  - Clicking a pin opens the task summary.
  - Map view respects the same permissions as other views.
  - A location custom field type supports geocoding (requires FR-1.2 location field).
- **Acceptance Criteria:**
  - When tasks have a location field, they plot as pins on a map.
  - The user can filter which tasks appear on the map.
  - Clicking a pin opens the task summary.
  - Map view respects the same permissions as other views.
  - A location custom field type supports geocoding.
- **Dependencies:** FR-1.2
- **Related User Stories:** US-E2-08

### FR-2.9 — Whiteboard / Infinite canvas (Figma-style, bidir task links)

- **Priority:** P2
- **Description:** The Whiteboard is a Figma-style infinite canvas for critique sessions and journey maps, with bidirectional links to real tasks.
- **Detailed Requirements:**
  - Free drawing, shapes, sticky notes, and text on a zoomable/pannable infinite canvas.
  - A task/node can be dropped that links bidirectionally to a real task (FR-1.3 related-link semantics).
  - Changes sync in real time with other viewers (FR-3.1).
  - Canvas content is saved with version history.
  - Whiteboard respects workspace permissions and is referenceable from search/activity.
- **Acceptance Criteria:**
  - When a Whiteboard is opened, the user can draw, add shapes, sticky notes, and text freely.
  - A task/node can be dropped that links bidirectionally to a real task.
  - Changes sync in real time with other viewers (FR-3.1).
  - The canvas is zoomable and pannable (infinite).
  - Whiteboard content is saved with version history.
- **Dependencies:** FR-1.3
- **Related User Stories:** US-E2-09

### FR-2.10 — Saved views (personal + shared), view templates, view sharing

- **Priority:** P0
- **Description:** Saved views let a configured filter/sort/grouping be one click away — personal or shared, publishable as a template, and shareable via link.
- **Detailed Requirements:**
  - A configured view (filters/sorts/grouping) can be saved.
  - Saved views can be marked personal or shared with the Space/Workspace.
  - Shared views appear in the view switcher for all members; editing a shared view updates it for everyone.
  - A saved view can be published as a reusable template.
  - A view can be shared as a read-only link with optional password (subset of fields exposed; see US-E2-12).
  - Views are permissioned the same as the List they belong to.
- **Acceptance Criteria:**
  - When a view is configured, it can be saved with its filters/sorts/grouping.
  - A saved view can be marked personal or shared with the Space/Workspace.
  - Shared views appear in the view switcher for all members.
  - A saved view can be published as a reusable template.
  - Editing a shared view updates it for everyone using it.
- **Dependencies:** FR-2.1, FR-2.2, FR-2.3, FR-2.4, FR-2.5
- **Related User Stories:** US-E2-10, US-E2-12

### FR-2.11 — Cross-workspace portfolio view (multi-workspace rollup)

- **Priority:** P1
- **Description:** The Portfolio view rolls up multiple workspaces into one trusted picture for leadership — progress, status distribution, and risk per team.
- **Detailed Requirements:**
  - Aggregates selected workspaces/spaces into one view.
  - Rollup shows progress, status distribution, and risk per team.
  - Drill-down from a portfolio row into the underlying workspace.
  - Respects each workspace's viewer permissions.
  - Filters apply consistently across all included workspaces.
  - Surfaces AI risk flags (FR-5.7) and Goal/OKR rollups (FR-1.11; see US-E2-15).
- **Acceptance Criteria:**
  - When Portfolio is opened, it aggregates selected workspaces/spaces into one view.
  - Rollup shows progress, status distribution, and risk per team.
  - The user can drill from a portfolio row into the underlying workspace.
  - Portfolio respects each workspace's viewer permissions.
  - Filters apply across all included workspaces consistently.
- **Dependencies:** FR-2.6, FR-1.11
- **Related User Stories:** US-E2-11, US-E2-15

---

## E3: Real-time Collaboration & Documents (FR-3.1 – FR-3.11)

### FR-3.1 — Real-time collaborative rich text editor (TipTap/ProseMirror + Yjs)

- **Priority:** P0
- **Description:** Documents are authored in a real-time collaborative rich text editor (TipTap/ProseMirror + Yjs CRDT) so multiple people can edit without clobbering each other.
- **Detailed Requirements:**
  - Concurrent edits merge via CRDT with no lost edits.
  - Live cursors/presence of other editors are visible.
  - Rich formatting supported: headings, lists, code, tables, embeds.
  - Edits sync with <100ms p95 latency (NFR §6.1).
  - Disconnected edits reconcile on reconnect (offline-first, FR-10.6).
  - Editor is the substrate for task descriptions (FR-1.4) and docs alike.
- **Acceptance Criteria:**
  - When two people edit the same doc, changes merge via CRDT with no lost edits.
  - Live cursors/presence of other editors are shown.
  - Rich formatting (headings, lists, code, tables) is supported.
  - Edits sync with <100ms p95 latency (NFR §6.1).
  - Disconnected edits reconcile on reconnect (offline-first).
- **Dependencies:** None
- **Related User Stories:** US-E3-01

### FR-3.2 — Documents as first-class entities (nest in tasks, folders, or standalone)

- **Priority:** P0
- **Description:** Documents are first-class entities that can nest in tasks, folders, or stand alone — specs live with the work they describe.
- **Detailed Requirements:**
  - A doc can be placed in a Folder, List, Task, or as standalone.
  - A doc nested in a task is reachable from the task and the folder tree.
  - Moving a doc preserves its links and backlinks (FR-3.3).
  - Docs appear in search and the activity log like other entities.
  - Permissions on a nested doc inherit from its parent unless overridden (FR-3.9).
- **Acceptance Criteria:**
  - When a doc is created, it can be placed in a Folder, List, Task, or standalone.
  - A doc nested in a task is reachable from the task and the folder tree.
  - Moving a doc preserves its links and backlinks.
  - Docs appear in search and the activity log like other entities.
  - Permissions on a nested doc inherit from its parent unless overridden (FR-3.9).
- **Dependencies:** FR-1.1
- **Related User Stories:** US-E3-02

### FR-3.3 — Bidirectional links ([[wiki-links]], backlinks graph, transclusion)

- **Priority:** P0
- **Description:** Bidirectional wiki-links keep specs and backlog as one conversation — `[[Doc Name]]` links, a backlinks graph, and `![[...]]` transclusion.
- **Detailed Requirements:**
  - `[[Doc Name]]` creates a link and the target shows a backlink.
  - A backlinks panel lists every doc referencing the current one.
  - Transclusion (`![[Doc]]`) embeds live content from another doc.
  - Renaming a doc updates all inbound links.
  - Orphaned links surface a clear "create or fix" prompt.
- **Acceptance Criteria:**
  - When `[[Doc Name]]` is added, it creates a link and the target shows a backlink.
  - A backlinks panel lists every doc referencing the current one.
  - Transclusion (`![[Doc]]`) embeds live content from another doc.
  - Renaming a doc updates all inbound links.
  - Orphaned links surface a clear "create or fix" prompt.
- **Dependencies:** FR-3.2
- **Related User Stories:** US-E3-03

### FR-3.4 — Document templates with variables

- **Priority:** P0
- **Description:** Document templates with `{{variables}}` keep handoff and design-system docs structurally consistent across the workspace.
- **Detailed Requirements:**
  - Saving a doc as a template captures its blocks and `{{variables}}`.
  - Instantiating a template prompts for variable values and substitutes them.
  - Templates are reusable across the workspace.
  - A template gallery is browsable from the new-doc menu.
  - Template docs render identically to normal docs after instantiation.
  - Usable as an automation action target (FR-4.3 / US-E4-16).
- **Acceptance Criteria:**
  - When a doc is saved as a template, its blocks and `{{variables}}` are captured.
  - Instantiating a template prompts for variable values and substitutes them.
  - Templates are reusable across the workspace.
  - A template gallery is browsable from the new-doc menu.
  - Template docs render identically to normal docs after instantiation.
- **Dependencies:** FR-3.2
- **Related User Stories:** US-E3-04

### FR-3.5 — Inline comments, suggestions mode, threads

- **Priority:** P0
- **Description:** Inline comments, suggestions mode, and threads capture review feedback in the doc rather than in chat.
- **Detailed Requirements:**
  - Selecting text anchors an inline comment thread to it.
  - Suggestions mode lets edits be proposed and accepted/rejected.
  - Inline comment threads support replies and resolution.
  - Resolved threads collapse but remain in history.
  - Inline comments notify mentioned users.
  - Distinct from task comments (FR-1.5) — anchored to doc ranges.
- **Acceptance Criteria:**
  - When text is selected, an inline comment thread can be added anchored to it.
  - Suggestions mode lets edits be proposed and accepted/rejected.
  - Inline comment threads support replies and resolution.
  - Resolved threads collapse but remain in history.
  - Inline comments notify mentioned users.
- **Dependencies:** FR-3.1
- **Related User Stories:** US-E3-05

### FR-3.6 — Slash commands: /task, /doc, @mention, /date, /emoji, /code, /embed

- **Priority:** P0
- **Description:** Slash commands let users do everything from the keyboard — create tasks/docs, mention, insert dates/emoji/code/embeds — without menus.
- **Detailed Requirements:**
  - Typing `/` opens a command menu offering task/doc/date/emoji/code/embed inserts.
  - `/task` creates a linked task inline from the doc.
  - `@mention` references a user with notification.
  - `/embed` inserts a Figma/link/iframe embed.
  - `/code` inserts a formatted code block.
  - Slash commands integrate with the AI writing assistant (FR-3.11 / FR-5.4).
- **Acceptance Criteria:**
  - When `/` is typed, a command menu offers task/doc/date/emoji/code/embed inserts.
  - `/task` creates a linked task inline from the doc.
  - `@mention` references a user with notification.
  - `/embed` inserts a Figma/link/iframe embed.
  - `/code` inserts a formatted code block.
- **Dependencies:** FR-3.1
- **Related User Stories:** US-E3-06

### FR-3.7 — Document version history, diff view, restore

- **Priority:** P0
- **Description:** Version history with diff and restore makes design-system and spec changes auditable and reversible.
- **Detailed Requirements:**
  - A version snapshot is recorded automatically on change.
  - The user can open a diff between any two versions.
  - A previous version can be restored; restore itself becomes a new version.
  - Version list shows author and timestamp.
  - Restore does not destroy the current version's history.
- **Acceptance Criteria:**
  - When a doc changes, a version snapshot is recorded automatically.
  - A diff can be opened between any two versions.
  - A previous version can be restored, which itself becomes a new version.
  - The version list shows author and timestamp.
  - Restore does not destroy the current version's history.
- **Dependencies:** FR-3.1
- **Related User Stories:** US-E3-07

### FR-3.8 — Export (PDF, MD, HTML, Notion export), print to PDF

- **Priority:** P1
- **Description:** Documents export to PDF, Markdown, HTML, and Notion format, plus print-to-PDF, so specs travel wherever stakeholders are.
- **Detailed Requirements:**
  - Export targets: PDF, Markdown, HTML, Notion export.
  - Exported Markdown preserves headings, lists, code, and links.
  - Print-to-PDF renders the doc cleanly with no editor chrome.
  - Embedded content is included or clearly referenced in export.
  - Export respects the doc's current published state (FR-3.10).
  - Underpins release-notes export (FR-5.9) and DLP watermarking (FR-8.6).
- **Acceptance Criteria:**
  - When exporting, the user can choose PDF, Markdown, HTML, or Notion export.
  - Exported Markdown preserves headings, lists, code, and links.
  - Print-to-PDF renders the doc cleanly with no editor chrome.
  - Embedded content is included or clearly referenced in export.
  - Export respects the doc's current published state.
- **Dependencies:** FR-3.2
- **Related User Stories:** US-E3-08

### FR-3.9 — Document permissions (view/comment/edit/admin per doc)

- **Priority:** P1
- **Description:** Per-document permissions (view/comment/edit/admin) keep sensitive strategy docs from being editable by everyone.
- **Detailed Requirements:**
  - Per-user or per-group assignment of view/comment/edit/admin on a doc.
  - A user without edit rights cannot modify the doc.
  - Comment-only users can add inline comments but not change content.
  - Explicit doc permissions override workspace defaults.
  - Admin rights include the ability to change permissions.
  - Composes with resource/field-level permissions (FR-8.4).
- **Acceptance Criteria:**
  - When doc permissions are set, view/comment/edit/admin can be assigned per user or group.
  - A user without edit rights cannot modify the doc.
  - Comment-only users can add inline comments but not change content.
  - Permissions override workspace defaults when explicitly set.
  - Admin rights include the ability to change permissions.
- **Dependencies:** FR-3.2
- **Related User Stories:** US-E3-09

### FR-3.10 — Published docs (public link, password, SEO, custom domain)

- **Priority:** P2
- **Description:** Published docs give clients a branded, self-serve status page via a public link with password, SEO, and custom-domain options.
- **Detailed Requirements:**
  - Publishing generates a public URL.
  - An optional password can be required to view the published doc.
  - SEO metadata (title/description) is configurable.
  - Custom domain is supported where entitled (FR-6.10 / US-E6-12).
  - Unpublishing immediately revokes public access.
  - Published content reflects live data at publish time per export state (FR-3.8).
- **Acceptance Criteria:**
  - When a doc is published, a public URL is generated.
  - A password can be required to view the published doc.
  - SEO metadata (title/description) is configurable.
  - Custom domain is supported where entitled (FR-6.10).
  - Unpublishing immediately revokes public access.
- **Dependencies:** FR-3.8
- **Related User Stories:** US-E3-10

### FR-3.11 — AI writing assistant (continue, summarize, rewrite, translate)

- **Priority:** P1
- **Description:** The in-doc AI writing assistant continues, summarizes, rewrites tone, and translates selected text so specs read cleanly without a separate tool.
- **Detailed Requirements:**
  - Invoking the assistant on selected text can continue/summarize/rewrite/translate/fix grammar.
  - Rewrites preserve meaning and offer a diff to accept/reject.
  - Tone can be specified (e.g., client-friendly, technical).
  - Translation targets a language from the i18n set (NFR §6.5).
  - Available in task descriptions (FR-1.4) and docs.
  - Aligns with the broader AI writing assistant (FR-5.4) and workspace AI instructions (FR-5.13).
- **Acceptance Criteria:**
  - When the assistant is invoked on selected text, it can continue/summarize/rewrite/translate/fix grammar.
  - Rewrites preserve meaning and offer a diff to accept/reject.
  - Tone can be specified (e.g., client-friendly, technical).
  - Translation targets a chosen language from the i18n set.
  - The assistant is available in task descriptions and docs.
- **Dependencies:** FR-3.1
- **Related User Stories:** (US-E5-04 covers the broader AI writing assistant; doc-surface behavior shared here)

---

## E4: Native Automation Engine (FR-4.1 – FR-4.12)

### FR-4.1 — Visual no-code automation builder (trigger → condition → action)

- **Priority:** P0
- **Description:** A visual no-code builder lets non-engineers assemble automations as a linear trigger → condition → action flow without writing code.
- **Detailed Requirements:**
  - A builder where the user adds a trigger, one or more conditions, and actions in a linear flow.
  - Each step shows its configuration form inline.
  - Steps can be reordered and deleted.
  - The builder validates the flow before save (no dangling steps).
  - A saved automation can be toggled on/off.
  - The builder is the editing surface for template-installed and AI-generated automations (FR-4.7, FR-4.8/FR-5.10).
- **Acceptance Criteria:**
  - When the builder is opened, a trigger, conditions, and actions can be added in a linear flow.
  - Each step shows its configuration form inline.
  - Steps can be reordered and deleted.
  - The builder validates the flow before save (no dangling steps).
  - A saved automation can be toggled on/off.
- **Dependencies:** FR-1.1
- **Related User Stories:** US-E4-01

### FR-4.2 — 50+ native triggers (task created, status changed, comment added, date, webhook, schedule, AI trigger)

- **Priority:** P0
- **Description:** A library of 50+ native triggers — task/comment/date/schedule/webhook/AI categories — so any event a team cares about can start a workflow.
- **Detailed Requirements:**
  - At least 50 trigger types available.
  - Trigger categories include task, comment, date, schedule, webhook, and AI.
  - Each trigger exposes its event payload fields to later steps.
  - A trigger can be tested to emit a sample payload.
  - Triggers fire reliably on the defined event (durable execution via the automation worker fleet, PRD §9.1).
  - Powers example automations: stale-task nudge (US-E4-13), time-entry reminder (US-E4-17).
- **Acceptance Criteria:**
  - When a trigger is picked, at least 50 trigger types are available.
  - Trigger types include task/comment/date/schedule/webhook/AI categories.
  - Each trigger exposes its event payload fields to later steps.
  - A trigger can be tested to emit a sample payload.
  - Triggers fire reliably on the defined event.
- **Dependencies:** FR-4.1
- **Related User Stories:** US-E4-02, US-E4-13, US-E4-17

### FR-4.3 — 50+ native actions (create task, update field, comment, notify, webhook, AI action, create doc, move)

- **Priority:** P0
- **Description:** A library of 50+ native actions — create/update/comment/notify/webhook/AI/doc/move — so workflows can be assembled end to end.
- **Detailed Requirements:**
  - At least 50 action types available.
  - Action categories include create, update, comment, notify, webhook, AI, doc, move.
  - An action can reference trigger/condition output via variables.
  - Action failures surface in run history (FR-4.9).
  - Actions respect the acting user's/automation's permissions.
  - Powers automations: auto-assign reviewers (US-E4-14), blocked-by alerting (US-E4-15), doc-from-template (US-E4-16), SLA/budget alerts (US-E4-18).
- **Acceptance Criteria:**
  - When an action is added, at least 50 action types are available.
  - Actions include create/update/comment/notify/webhook/AI/doc/move categories.
  - An action can reference trigger/condition output via variables.
  - Action failures surface in run history (FR-4.9).
  - Actions respect the acting user's permissions.
- **Dependencies:** FR-4.1
- **Related User Stories:** US-E4-03, US-E4-14, US-E4-15, US-E4-16, US-E4-18

### FR-4.4 — Conditions: if/else, filters, field matching, formulas, AI classification

- **Priority:** P0
- **Description:** Conditions — if/else branching, filters, field matching, formulas, and AI classification — ensure automations only fire when they should.
- **Detailed Requirements:**
  - A condition can match on field values and filters.
  - if/else branching routes the flow on a true/false outcome.
  - Formulas and AI classification are usable as condition inputs.
  - A condition can reference upstream step outputs.
  - A failing condition stops or branches the flow as configured.
  - Underpins SLA/budget alert logic (US-E4-18).
- **Acceptance Criteria:**
  - When a condition is added, it can match on field values and filters.
  - if/else branching routes the flow on a true/false outcome.
  - Formulas and AI classification are usable as condition inputs.
  - A condition can reference upstream step outputs.
  - A failing condition stops or branches the flow as configured.
- **Dependencies:** FR-4.2
- **Related User Stories:** US-E4-04, US-E4-18

### FR-4.5 — Loops (for each), batch operations, delay/wait, retry logic

- **Priority:** P0
- **Description:** Loops, batch operations, delay/wait, and retry logic let recurring chores and bulk updates run correctly and resiliently.
- **Detailed Requirements:**
  - A loop iterates "for each" item in a collection.
  - A delay/wait step pauses execution for a set duration.
  - Failed steps retry per a configured policy (count/backoff).
  - Batch operations act on multiple items atomically where possible.
  - Loop iteration count is bounded to prevent runaway execution. _(Inferred safety cap — PRD silent on exact bound.)_
  - Retry/durability handled by the workflow engine (Temporal, PRD §9.2).
- **Acceptance Criteria:**
  - When a loop is added, it iterates "for each" item in a collection.
  - A delay/wait step pauses execution for a set duration.
  - Failed steps retry per a configured policy (count/backoff).
  - Batch operations act on multiple items atomically where possible.
  - Loop iteration count is bounded to prevent runaway execution.
- **Dependencies:** FR-4.3
- **Related User Stories:** US-E4-05

### FR-4.6 — Automation versioning, draft/published, rollback, change log

- **Priority:** P0
- **Description:** Automation versioning with draft/published states, rollback, and a change log lets teams iterate safely.
- **Detailed Requirements:**
  - Editing a published automation saves changes as a new draft until published.
  - Publishing creates a versioned snapshot with a change log.
  - Any previous published version can be rolled back to.
  - The change log records author and timestamp per version.
  - Only published versions execute.
- **Acceptance Criteria:**
  - When a published automation is edited, changes save as a new draft until published.
  - Publishing creates a versioned snapshot with a change log.
  - Any previous published version can be rolled back to.
  - The change log records author and timestamp per version.
  - Only published versions execute.
- **Dependencies:** FR-4.1
- **Related User Stories:** US-E4-06

### FR-4.7 — Automation templates library (50+ pre-built)

- **Priority:** P0
- **Description:** A 50+ template library gives teams a proven workflow to start from instead of a blank canvas.
- **Detailed Requirements:**
  - At least 50 pre-built automations available, categorized by use case (PM, eng, design, agency).
  - Installing a template creates an editable draft in the workspace.
  - Template variables map to the workspace's fields on install.
  - Users can contribute a template back to the library (marketplace later, FR-4.12).
  - Installed templates respect field-mapping on install.
- **Acceptance Criteria:**
  - When templates are browsed, at least 50 pre-built automations are available.
  - Installing a template creates an editable draft in the workspace.
  - Templates are categorized by use case (PM, eng, design, agency).
  - Template variables map to the workspace's fields on install.
  - A template can be contributed back to the library (marketplace later, FR-4.12).
- **Dependencies:** FR-4.1
- **Related User Stories:** US-E4-07

### FR-4.8 — AI-assisted automation builder (natural language → workflow)

- **Priority:** P1
- **Description:** The AI-assisted builder turns a plain-English workflow description into a draft automation the user can review and edit.
- **Detailed Requirements:**
  - Describing a workflow in natural language generates a draft automation.
  - The generated flow shows trigger/conditions/actions for review.
  - The user can edit generated steps before publishing.
  - Ambiguous descriptions prompt for clarification.
  - Generation is limited to available triggers/actions only.
  - Shares generation behavior with FR-5.10 (AI Automation Builder); this FR is the automation-surface realization.
- **Acceptance Criteria:**
  - When a workflow is described in natural language, a draft automation is generated.
  - The generated flow shows trigger/conditions/actions for review.
  - The user can edit the generated steps before publishing.
  - Ambiguous descriptions prompt for clarification.
  - Generation respects available triggers/actions only.
- **Dependencies:** FR-4.1, FR-5.10
- **Related User Stories:** US-E4-08

### FR-4.9 — Run history, debugging, replay, logs, error notifications

- **Priority:** P0
- **Description:** Run history with debugging, replay, logs, and error notifications let teams trust that automations are actually running.
- **Detailed Requirements:**
  - Each run stores an execution record with steps and logs.
  - A past run can be replayed against current data.
  - Failed runs send an error notification to the owner.
  - Logs show input/output per step for debugging.
  - Run history is filterable by automation, status, and date.
  - Consumed by the CLI run-history reader (FR-7.8 / US-E7-08).
- **Acceptance Criteria:**
  - When an automation runs, an execution record with steps and logs is stored.
  - A past run can be replayed against current data.
  - Failed runs send an error notification to the owner.
  - Logs show input/output per step for debugging.
  - Run history can be filtered by automation, status, and date.
- **Dependencies:** FR-4.1
- **Related User Stories:** US-E4-09

### FR-4.10 — Rate limiting, concurrency control, execution limits per plan

- **Priority:** P1
- **Description:** Rate limiting, concurrency control, and per-plan execution limits keep one workspace from starving others or blowing the bill.
- **Detailed Requirements:**
  - When executions exceed plan limits, further runs are queued or rejected per policy.
  - Concurrency is capped per workspace/automation.
  - Limits are configurable per subscription tier (FR-9.1).
  - Exceeding limits notifies the workspace admin.
  - Rate limiting is enforced at the API gateway (PRD §9.1).
- **Acceptance Criteria:**
  - When executions exceed plan limits, further runs are queued or rejected per policy.
  - Concurrency is capped per workspace/automation.
  - Limits are configurable per subscription tier (FR-9.1).
  - Exceeding limits notifies the workspace admin.
  - Rate limiting is enforced at the gateway (PRD §9.1).
- **Dependencies:** FR-4.1, FR-9.1
- **Related User Stories:** US-E4-10

### FR-4.11 — Webhook receiver (public endpoints, HMAC verification)

- **Priority:** P1
- **Description:** A public webhook receiver with HMAC verification lets external systems trigger Sprintio workflows securely.
- **Detailed Requirements:**
  - Creating a webhook receiver generates a public endpoint URL.
  - Incoming requests are verified against a signing secret (HMAC); unverified requests are rejected (401).
  - The receiver can act as a trigger in the builder (FR-4.2).
  - The signing secret can be rotated without downtime.
  - Receivers are manageable (list, regenerate secret, delete).
- **Acceptance Criteria:**
  - When a webhook receiver is created, a public endpoint URL is generated.
  - Incoming requests are verified against a signing secret (HMAC).
  - Unverified requests are rejected (401).
  - The receiver can act as a trigger in the builder (FR-4.2).
  - The signing secret can be rotated without downtime.
- **Dependencies:** FR-4.2
- **Related User Stories:** US-E4-11

### FR-4.12 — Automation marketplace (share, install, rate)

- **Priority:** P2
- **Description:** An automation marketplace lets teams share, install, and rate workflows so good patterns spread.
- **Detailed Requirements:**
  - Publishing an automation makes it appear in the marketplace for eligible users.
  - A marketplace automation can be installed into a workspace.
  - Users can rate and review installed automations.
  - Marketplace installs respect field-mapping on install (FR-4.7).
  - Private/unlisted sharing is supported for internal distribution.
- **Acceptance Criteria:**
  - When an automation is published, it appears in the marketplace for eligible users.
  - A marketplace automation can be installed into a workspace.
  - Users can rate and review installed automations.
  - Marketplace installs respect field-mapping on install (FR-4.7).
  - Private/unlisted sharing is supported for internal distribution.
- **Dependencies:** FR-4.7
- **Related User Stories:** US-E4-12

---

## E5: AI Copilot & Intelligence (FR-5.1 – FR-5.15)

### FR-5.1 — Natural language task creation

- **Priority:** P0
- **Description:** Natural-language task creation ("create a task for redesigning the dashboard, assign to Alex, due Friday, high priority") turns capturing work into one sentence.
- **Detailed Requirements:**
  - A natural-language command creates a task with parsed assignee, due date, and priority.
  - Unrecognized entities prompt for clarification rather than guessing silently.
  - The created task links to the conversation/source if applicable.
  - Parsing handles relative dates ("Friday", "next sprint").
  - The action is reversible/visible in the activity log (FR-1.6).
  - Honors workspace AI instructions (FR-5.13).
- **Acceptance Criteria:**
  - When a natural-language command is typed, a task is created with parsed assignee, due date, and priority.
  - Unrecognized entities prompt for clarification rather than guessing silently.
  - The created task links to the conversation/source if applicable.
  - Parsing handles relative dates ("Friday", "next sprint").
  - The action is reversible/visible in the activity log.
- **Dependencies:** FR-1.1
- **Related User Stories:** US-E5-01

### FR-5.2 — Smart task triage (auto-categorize, suggest assignee, priority, labels, sprint)

- **Priority:** P0
- **Description:** Smart triage auto-categorizes and suggests assignee, priority, labels, and sprint so incoming work lands in the right place.
- **Detailed Requirements:**
  - On task creation, AI suggests category, assignee, priority, labels, and sprint.
  - Suggestions are editable before acceptance.
  - Triage learns from historical assignment patterns.
  - Low-confidence suggestions are flagged for human review.
  - Accepted triage updates the task and logs the change (FR-1.6).
- **Acceptance Criteria:**
  - When a task is created, AI suggests category, assignee, priority, labels, and sprint.
  - Suggestions are editable before acceptance.
  - Triage learns from historical assignment patterns.
  - Low-confidence suggestions are flagged for human review.
  - Accepted triage updates the task and logs the change.
- **Dependencies:** FR-5.1
- **Related User Stories:** US-E5-02

### FR-5.3 — Smart summaries (task thread summary, doc summary, sprint summary, weekly digest)

- **Priority:** P0
- **Description:** Smart summaries — task thread, doc, sprint, weekly digest — cut reporting time from afternoons to minutes.
- **Detailed Requirements:**
  - Summaries cover the selected scope (thread/doc/sprint/week).
  - Sprint and weekly summaries aggregate completed vs slipped work.
  - Summaries cite the source tasks/docs they draw from.
  - The user can regenerate or adjust length/tone.
  - Summaries are copyable and shareable.
  - Feeds automated standup summaries (FR-5.8) and release notes (FR-5.9).
- **Acceptance Criteria:**
  - When a summary is requested, AI summarizes the selected scope (thread/doc/sprint/week).
  - Sprint and weekly summaries aggregate completed vs slipped work.
  - Summaries cite the source tasks/docs they draw from.
  - The summary length/tone can be regenerated or adjusted.
  - Summaries are copyable and shareable.
- **Dependencies:** FR-3.1, FR-1.6
- **Related User Stories:** US-E5-03

### FR-5.4 — AI Writing Assistant (continue writing, summarize, rewrite tone, translate, fix grammar)

- **Priority:** P0
- **Description:** The AI writing assistant (continue, summarize, rewrite tone, translate, fix grammar) keeps specs clean without a separate tool — available in task descriptions and docs.
- **Detailed Requirements:**
  - On selected text, the assistant can continue/summarize/rewrite/translate/fix grammar.
  - Rewrites preserve meaning and offer a diff to accept/reject.
  - Tone can be specified (e.g., client-friendly, technical).
  - Translation targets a language from the i18n set (NFR §6.5).
  - Available in task descriptions (FR-1.4) and docs (FR-3.11).
  - Honors workspace AI instructions (FR-5.13).
- **Acceptance Criteria:**
  - When the assistant is invoked on selected text, it can continue/summarize/rewrite/translate/fix grammar.
  - Rewrites preserve meaning and offer a diff to accept/reject.
  - Tone can be specified (e.g., client-friendly, technical).
  - Translation targets a chosen language from the i18n set.
  - The assistant is available in task descriptions and docs.
- **Dependencies:** FR-1.4, FR-3.1
- **Related User Stories:** US-E5-04

### FR-5.5 — Smart search (semantic search across tasks, docs, comments, code)

- **Priority:** P1
- **Description:** Semantic search across tasks, docs, comments, and code lets users find the half-remembered RFC without exact keywords.
- **Detailed Requirements:**
  - Results rank by semantic relevance, not just keyword match (vector DB, PRD §9.2).
  - Search covers tasks, docs, comments, and attached code/embeds.
  - Results return in <300ms p95 (NFR §6.1).
  - Each result links to its source with a relevance snippet.
  - Search respects the user's permissions.
  - Underpins context-aware Q&A (FR-5.12).
- **Acceptance Criteria:**
  - When a search is run, results rank by semantic relevance, not just keyword match.
  - Search covers tasks, docs, comments, and attached code/embeds.
  - Results return in <300ms p95 (NFR §6.1).
  - Each result links to its source with a relevance snippet.
  - Search respects the user's permissions.
- **Dependencies:** FR-3.2
- **Related User Stories:** US-E5-05

### FR-5.6 — Capacity planning & velocity forecasting (AI-powered)

- **Priority:** P1
- **Description:** AI-powered capacity planning and velocity forecasting sanity-check the roadmap against reality.
- **Detailed Requirements:**
  - Forecasting projects velocity from historical completion data.
  - Capacity is planned against roadmap load per team.
  - Forecasts show confidence ranges, not single points.
  - Output feeds the Workload/Capacity view (FR-2.7).
  - Forecasts update as new data arrives.
- **Acceptance Criteria:**
  - When forecasting is opened, AI projects velocity from historical completion data.
  - Capacity is planned against roadmap load per team.
  - Forecasts show confidence ranges, not single points.
  - Output feeds the Workload/Capacity view (FR-2.7).
  - Forecasts update as new data arrives.
- **Dependencies:** FR-2.7
- **Related User Stories:** US-E5-06

### FR-5.7 — Risk detection (stalled tasks, scope creep, overallocated people, dependency risks)

- **Priority:** P1
- **Description:** AI risk detection flags stalled tasks, scope creep, overallocation, and dependency risks so commitments that will break are known early.
- **Detailed Requirements:**
  - Risk computation flags stalled, scope-crept, overallocated, and dependency-risk items.
  - Each risk carries a reason and supporting evidence.
  - Risks surface in the Portfolio and Dashboard views (FR-2.11, FR-2.6).
  - Risk flags update as task state changes.
  - A risk can be dismissed or acknowledged with a note.
  - Uses dependency data (FR-1.3) and activity log (FR-1.6).
- **Acceptance Criteria:**
  - When risks are computed, stalled/scope-crept/overallocated/dependency-risk items are flagged.
  - Each risk carries a reason and supporting evidence.
  - Risks surface in the Portfolio and Dashboard views.
  - Risk flags update as task state changes.
  - A risk can be dismissed or acknowledged with a note.
- **Dependencies:** FR-2.11, FR-1.3
- **Related User Stories:** US-E5-07

### FR-5.8 — Automated standup / standup summary generation

- **Priority:** P1
- **Description:** Automated standup summaries turn standup into a 10-minute confirmation by aggregating yesterday/today/blockers per person from activity.
- **Detailed Requirements:**
  - Standup run summarizes yesterday/today/blockers per person from activity (FR-1.6).
  - The summary aggregates each member's completed and in-progress work.
  - Blockers are explicitly called out.
  - The summary is deliverable to a channel/docs (FR-7.4 notifications).
  - Members can correct the summary before broadcast.
  - Built on smart summaries (FR-5.3).
- **Acceptance Criteria:**
  - When standup runs, AI summarizes yesterday/today/blockers per person from activity.
  - The summary aggregates each member's completed and in-progress work.
  - Blockers are explicitly called out.
  - The summary is deliverable to a channel/docs.
  - Members can correct the summary before broadcast.
- **Dependencies:** FR-5.3, FR-1.6
- **Related User Stories:** US-E5-08

### FR-5.9 — Release notes generator (from completed tasks)

- **Priority:** P1
- **Description:** Release notes generated from completed tasks stop the PM from being the release-notes secretary.
- **Detailed Requirements:**
  - Release notes are drafted from completed tasks in a date/range.
  - Notes group changes by type (feature, fix, improvement).
  - The user can edit and re-group before publishing.
  - Notes cite the source tasks.
  - Output exports to doc/MD (FR-3.8).
  - Built on smart summaries (FR-5.3).
- **Acceptance Criteria:**
  - When release notes are generated, AI drafts them from completed tasks in a range.
  - Notes group changes by type (feature, fix, improvement).
  - The user can edit and re-group before publishing.
  - Notes cite the source tasks.
  - Output exports to doc/MD (FR-3.8).
- **Dependencies:** FR-5.3, FR-3.8
- **Related User Stories:** US-E5-09

### FR-5.10 — AI Automation Builder (describe workflow in plain English → generate automation)

- **Priority:** P1
- **Description:** The AI Automation Builder turns a plain-English workflow description into a proposed trigger/condition/action flow — the intelligence layer behind FR-4.8.
- **Detailed Requirements:**
  - Describing a workflow proposes a trigger/condition/action flow.
  - The proposal maps to available native triggers/actions only (FR-4.2, FR-4.3).
  - The user can review and edit steps before saving as a draft automation.
  - Ambiguity prompts clarification.
  - The generated automation is editable in the visual builder (FR-4.1).
- **Acceptance Criteria:**
  - When a workflow is described, AI proposes a trigger/condition/action flow.
  - The proposal maps to available native triggers/actions only.
  - The user can review and edit steps before saving as a draft automation.
  - Ambiguity prompts clarification.
  - The generated automation is editable in the visual builder (FR-4.1).
- **Dependencies:** FR-4.1
- **Related User Stories:** US-E5-10

### FR-5.11 — Smart duplicate detection & merge suggestions

- **Priority:** P1
- **Description:** Smart duplicate detection and merge suggestions keep the backlog under 5% duplicates.
- **Detailed Requirements:**
  - Duplicate detection clusters near-identical tasks with a confidence score.
  - The user can merge selected duplicates, choosing the surviving task.
  - Merging preserves comments, attachments, and links on the survivor.
  - Detection runs on demand and can be scheduled.
  - False-positive rate is low enough to trust the suggestions.
- **Acceptance Criteria:**
  - When duplicate detection runs, near-identical tasks are clustered with a confidence score.
  - The user can merge selected duplicates, choosing the surviving task.
  - Merging preserves comments, attachments, and links on the survivor.
  - Detection runs on demand and can be scheduled.
  - The false-positive rate is low enough to trust the suggestions.
- **Dependencies:** FR-1.1
- **Related User Stories:** US-E5-11

### FR-5.12 — Context-aware Q&A ("What's blocking the login refactor?", "Summarize last week's progress")

- **Priority:** P2
- **Description:** Context-aware Q&A answers questions from workspace tasks/docs/activity so leaders get a defensible answer without building a slide.
- **Detailed Requirements:**
  - Questions are answered from workspace tasks/docs/activity.
  - Answers cite the specific tasks/docs they rely on.
  - The assistant respects the user's permissions on cited data.
  - Unanswerable questions say so rather than hallucinate.
  - Answers are grounded in current data (no stale cache).
  - Built on smart search (FR-5.5).
- **Acceptance Criteria:**
  - When a question is asked, AI answers from workspace tasks/docs/activity.
  - Answers cite the specific tasks/docs they rely on.
  - The assistant respects the user's permissions on cited data.
  - Unanswerable questions say so rather than hallucinate.
  - Answers are grounded in current data (no stale cache).
- **Dependencies:** FR-5.5
- **Related User Stories:** US-E5-12

### FR-5.13 — Custom AI instructions per workspace (tone, terminology, workflows)

- **Priority:** P1
- **Description:** Custom AI instructions per workspace (tone, terminology, workflows) make the copilot write like the team, not a generic bot.
- **Detailed Requirements:**
  - Setting workspace AI instructions makes all copilot outputs follow them.
  - Instructions cover tone, preferred terminology, and workflow conventions.
  - Instructions are editable by workspace admins.
  - Changes apply to future generations without retro-editing history.
  - Instructions are scoped to the workspace, not global.
- **Acceptance Criteria:**
  - When workspace AI instructions are set, all copilot outputs follow them.
  - Instructions cover tone, preferred terminology, and workflow conventions.
  - Instructions are editable by workspace admins.
  - Changes apply to future generations without retro-editing history.
  - Instructions are scoped to the workspace, not global.
- **Dependencies:** FR-5.1
- **Related User Stories:** US-E5-13

### FR-5.14 — BYOK (Bring Your Own Key) for enterprise

- **Priority:** P2
- **Description:** BYOK lets enterprise customers run AI features on their own model contract and keys.
- **Detailed Requirements:**
  - When BYOK is enabled, AI calls use the customer-provided key/model.
  - Workspace AI features function identically under BYOK.
  - Keys are stored encrypted and never logged.
  - Billing for AI credits is bypassed when BYOK is active (FR-9.3).
  - Only entitled (Enterprise) workspaces can enable BYOK (FR-9.7).
- **Acceptance Criteria:**
  - When BYOK is enabled, AI calls use the customer-provided key/model.
  - Workspace AI features function identically under BYOK.
  - Keys are stored encrypted and never logged.
  - Billing for AI credits is bypassed when BYOK is active (FR-9.3).
  - Only entitled (Enterprise) workspaces can enable BYOK.
- **Dependencies:** FR-9.7
- **Related User Stories:** US-E5-14

### FR-5.15 — AI usage analytics & cost controls per workspace

- **Priority:** P1
- **Description:** Per-workspace AI usage analytics and cost controls keep AI spend predictable.
- **Detailed Requirements:**
  - AI usage (requests, tokens, credits) is tracked per workspace.
  - Per-workspace spend/credit caps can be set.
  - A dashboard shows usage trends and top consumers.
  - Approaching-limit alerts fire before overage.
  - Analytics respect the workspace's data boundaries.
  - Connects to usage-based AI credits (FR-9.3) and billing alerts (FR-9.6).
- **Acceptance Criteria:**
  - When AI features are used, usage (requests, tokens, credits) is tracked per workspace.
  - Per-workspace spend/credit caps can be set.
  - A dashboard shows usage trends and top consumers.
  - Approaching-limit alerts fire before overage.
  - Analytics respect the workspace's data boundaries.
- **Dependencies:** FR-9.3
- **Related User Stories:** US-E5-15

---

## E6: Team & Workspace Management (FR-6.1 – FR-6.10)

### FR-6.1 — Multi-workspace support (personal + team workspaces)

- **Priority:** P0
- **Description:** Multi-workspace support lets users separate contexts (personal + team/client) without mixing data — each workspace is isolated with its own members, billing, and settings.
- **Detailed Requirements:**
  - Creating a workspace isolates it with its own members, billing, and settings.
  - Users can switch between workspaces from a unified switcher.
  - A personal workspace exists by default for every user.
  - Data does not leak across workspace boundaries.
  - A user can be a member of multiple workspaces simultaneously.
- **Acceptance Criteria:**
  - When a workspace is created, it is isolated with its own members, billing, and settings.
  - The user can switch between workspaces from a unified switcher.
  - A personal workspace exists by default for every user.
  - Data does not leak across workspace boundaries.
  - A user can be a member of multiple workspaces simultaneously.
- **Dependencies:** None
- **Related User Stories:** US-E6-01

### FR-6.2 — Roles: Owner, Admin, Member, Guest, Viewer (custom roles P1)

- **Priority:** P0
- **Description:** A default role model (Owner, Admin, Member, Guest, Viewer) maps access to responsibility without custom setup; custom roles are entitled at higher tiers.
- **Detailed Requirements:**
  - Inviting a user assigns one of Owner/Admin/Member/Guest/Viewer.
  - Each role has a defined, enforced permission set.
  - Viewers cannot edit; Guests are scoped to assigned resources (FR-6.4).
  - Only Owners/Admins can manage members and settings.
  - Custom roles are available where entitled (P1; see FR-8.4 / US-E8-04).
  - Underpins the invitation/onboarding flow (US-E6-11).
- **Acceptance Criteria:**
  - When a user is invited, one of Owner/Admin/Member/Guest/Viewer is assigned.
  - Each role has a defined, enforced permission set.
  - Viewers cannot edit; Guests are scoped to assigned resources.
  - Only Owners/Admins can manage members and settings.
  - Custom roles are available where entitled (P1; FR-8.4).
- **Dependencies:** FR-6.1
- **Related User Stories:** US-E6-02, US-E6-11

### FR-6.3 — Teams & user groups (nested groups, team-level permissions)

- **Priority:** P0
- **Description:** Teams and nested user groups with team-level permissions let managers assign and notify by squad, not by individual.
- **Detailed Requirements:**
  - Creating a team lets the user add members and nest sub-groups.
  - Team-level permissions apply to all members.
  - A whole team can be @mentioned and assigned at once.
  - Removing a user from a team revokes team-scoped access.
  - Teams are usable as automation targets (E4).
  - Composes with fine-grained permissions (FR-8.4).
- **Acceptance Criteria:**
  - When a team is created, members can be added and sub-groups nested.
  - Team-level permissions apply to all members.
  - A whole team can be @mentioned and assigned at once.
  - Removing a user from a team revokes team-scoped access.
  - Teams are usable as automation targets (E4).
- **Dependencies:** FR-6.2
- **Related User Stories:** US-E6-03

### FR-6.4 — Guest access (task-level, list-level, folder-level, time-limited)

- **Priority:** P0
- **Description:** Scoped, time-limited guest access (task/list/folder level) lets clients see their project without a full seat.
- **Detailed Requirements:**
  - Inviting a guest scopes access to task/list/folder level.
  - An expiry date can be set, after which access auto-revokes.
  - Guests cannot see resources outside their scope.
  - Guests can be assigned the Guest role only.
  - Guest access can be extended or revoked at any time.
  - Connects to client portals and custom branding (FR-6.10).
- **Acceptance Criteria:**
  - When a guest is invited, access is scoped to task/list/folder level.
  - An expiry date can be set, after which access auto-revokes.
  - Guests cannot see resources outside their scope.
  - Guests can be assigned the Guest role only.
  - Guest access can be extended or revoked at any time.
- **Dependencies:** FR-6.2
- **Related User Stories:** US-E6-04

### FR-6.5 — SSO (SAML 2.0, OIDC, SCIM 2.0 provisioning)

- **Priority:** P1
- **Description:** SSO (SAML 2.0, OIDC) and SCIM 2.0 provisioning let joiners/leavers be managed from the customer's IdP.
- **Detailed Requirements:**
  - When SSO is configured, members log in via the IdP (no password).
  - SCIM provisions/deprovisions users from the directory automatically.
  - Group mappings sync to Sprintio teams (FR-6.3).
  - SSO enforcement can be required for the workspace.
  - Only entitled (Enterprise/mid-market) workspaces can enable SSO.
  - Prerequisite for enterprise contracts (FR-9.7).
- **Acceptance Criteria:**
  - When SSO is configured, members log in via the IdP (no password).
  - SCIM provisions/deprovisions users from the directory automatically.
  - Group mappings sync to Sprintio teams (FR-6.3).
  - SSO enforcement can be required for the workspace.
  - Only entitled (Enterprise/mid-market) workspaces can enable SSO.
- **Dependencies:** FR-6.2
- **Related User Stories:** US-E6-05

### FR-6.6 — Directory sync (Okta, Azure AD, Google Workspace, OneLogin)

- **Priority:** P1
- **Description:** Directory sync with Okta, Azure AD, Google Workspace, and OneLogin keeps the user base in lockstep with HR systems.
- **Detailed Requirements:**
  - When directory sync is enabled, users/groups import from the provider.
  - Changes in the directory propagate on a sync schedule.
  - Deactivated directory users lose Sprintio access.
  - Sync status and errors are visible to admins.
  - Multiple providers are configurable per workspace.
  - Requires SSO (FR-6.5).
- **Acceptance Criteria:**
  - When directory sync is enabled, users/groups import from the provider.
  - Changes in the directory propagate on a sync schedule.
  - Deactivated directory users lose Sprintio access.
  - Sync status and errors are visible to admins.
  - Multiple providers are configurable per workspace.
- **Dependencies:** FR-6.5
- **Related User Stories:** US-E6-06

### FR-6.7 — Audit logs (SIEM export, webhook streaming)

- **Priority:** P1
- **Description:** Audit logs exportable to SIEM and streamable via webhook land security events in the customer's central pipeline.
- **Detailed Requirements:**
  - Security-relevant events are written to the audit log (FR-1.6 basis).
  - Export to a SIEM (Splunk/Datadog/Sentinel) via integration.
  - A webhook streams events in near real time.
  - Log export respects data-residency constraints (FR-8.2).
  - Only admins can configure SIEM/webhook streaming.
  - Surfaced via the audit-log API (FR-8.5).
- **Acceptance Criteria:**
  - When security-relevant events occur, they are written to the audit log.
  - The log can be exported to a SIEM (Splunk/Datadog/Sentinel) via integration.
  - A webhook streams events in near real time.
  - Log export respects data-residency constraints (FR-8.2).
  - Only admins can configure SIEM/webhook streaming.
- **Dependencies:** FR-1.6
- **Related User Stories:** US-E6-07

### FR-6.8 — Session management, device trust, IP allowlists

- **Priority:** P1
- **Description:** Session management, device trust, and IP allowlists control access beyond just a password.
- **Detailed Requirements:**
  - Active sessions are viewable and any can be revoked.
  - Devices can be marked trusted; untrusted devices require step-up auth.
  - An IP allowlist restricts access to approved ranges.
  - Revoking a session terminates it immediately.
  - These controls are admin-configurable per workspace.
  - Relevant to cross-device continuity trust (FR-10.6 / US-E10-08).
- **Acceptance Criteria:**
  - When sessions are viewed, active sessions are shown and any can be revoked.
  - Devices can be marked trusted; untrusted devices require step-up auth.
  - An IP allowlist restricts access to approved ranges.
  - Revoking a session terminates it immediately.
  - These controls are admin-configurable per workspace.
- **Dependencies:** FR-6.2
- **Related User Stories:** US-E6-08

### FR-6.9 — Workspace analytics (adoption, activity, collaboration patterns)

- **Priority:** P1
- **Description:** Workspace analytics (adoption, activity, collaboration patterns) show whether the platform is actually being used.
- **Detailed Requirements:**
  - Analytics show adoption, activity, and collaboration metrics.
  - Metrics break down by team and over time.
  - Data reflects real events from the activity log (FR-1.6).
  - Analytics respect privacy/permission scopes.
  - Dashboards are exportable for leadership.
- **Acceptance Criteria:**
  - When analytics are opened, adoption, activity, and collaboration metrics are shown.
  - Metrics break down by team and over time.
  - Data reflects real events from the activity log.
  - Analytics respect privacy/permission scopes.
  - Dashboards are exportable for leadership.
- **Dependencies:** FR-1.6
- **Related User Stories:** US-E6-09

### FR-6.10 — Custom branding (logo, colors, domain, email templates)

- **Priority:** P1
- **Description:** Custom branding (logo, colors, domain, email templates) makes client-facing views look like the agency, not Sprintio.
- **Detailed Requirements:**
  - Setting branding applies logo and colors to client portals and emails.
  - A custom domain is configurable where entitled (US-E6-12).
  - Email templates reflect the branding.
  - Branding is per-workspace, not global.
  - Non-client areas may retain product branding per policy.
  - Custom domain also serves published docs (FR-3.10).
- **Acceptance Criteria:**
  - When branding is set, logo and colors apply to client portals and emails.
  - A custom domain is configurable where entitled.
  - Email templates reflect the branding.
  - Branding is per-workspace, not global.
  - Non-client areas can retain product branding per policy.
- **Dependencies:** FR-6.4
- **Related User Stories:** US-E6-10, US-E6-12

---

## E7: Integrations & API (FR-7.1 – FR-7.9)

### FR-7.1 — Public REST API (OpenAPI 3.1, versioned, rate-limited)

- **Priority:** P1
- **Description:** A versioned, rate-limited public REST API (OpenAPI 3.1) lets developers script Sprintio from their own tooling.
- **Detailed Requirements:**
  - The API conforms to a published OpenAPI 3.1 spec.
  - The API is versioned (e.g., /v1) with a deprecation policy.
  - Requests are rate-limited and return standard limit headers.
  - Auth uses workspace API token / OAuth (FR-7.5).
  - All core entities (tasks, docs, automations) are addressable.
- **Acceptance Criteria:**
  - When the REST API is called, it conforms to a published OpenAPI 3.1 spec.
  - The API is versioned (e.g., /v1) with a deprecation policy.
  - Requests are rate-limited and return standard limit headers.
  - Auth uses the workspace API token/OAuth.
  - All core entities (tasks, docs, automations) are addressable.
- **Dependencies:** FR-1.1
- **Related User Stories:** US-E7-01

### FR-7.2 — GraphQL API (flexible queries, subscriptions for real-time)

- **Priority:** P1
- **Description:** A GraphQL API with flexible queries and real-time subscriptions lets developers fetch exactly what they need and get live updates.
- **Detailed Requirements:**
  - Queries allow selecting arbitrary nested fields.
  - Subscriptions push real-time changes over WebSocket (real-time layer, PRD §9.1).
  - The schema is introspectable and documented.
  - GraphQL respects the same permissions as REST (FR-7.1).
  - Errors return structured, typed error payloads.
- **Acceptance Criteria:**
  - When GraphQL is queried, arbitrary nested fields can be selected.
  - Subscriptions push real-time changes over WebSocket.
  - The schema is introspectable and documented.
  - GraphQL respects the same permissions as REST.
  - Errors return structured, typed error payloads.
- **Dependencies:** FR-7.1
- **Related User Stories:** US-E7-02

### FR-7.3 — Webhooks (retry, signing, filtering, delivery logs)

- **Priority:** P1
- **Description:** Outbound webhooks with retry, signing, filtering, and delivery logs keep external systems in sync with Sprintio.
- **Detailed Requirements:**
  - Registering a webhook allows filtering which events it receives.
  - Payloads are signed (HMAC) for verification.
  - Failed deliveries retry with backoff.
  - A delivery log shows attempts and outcomes.
  - A webhook can be paused/resumed without deletion.
  - Built on the activity log event stream (FR-1.6).
- **Acceptance Criteria:**
  - When a webhook is registered, events it receives can be filtered.
  - Payloads are signed (HMAC) for verification.
  - Failed deliveries retry with backoff.
  - A delivery log shows attempts and outcomes.
  - A webhook can be paused/resumed without deletion.
- **Dependencies:** FR-1.6
- **Related User Stories:** US-E7-03

### FR-7.4 — Native integrations: GitHub, GitLab, Bitbucket, Slack, Teams, Discord, Figma, Notion, Google Drive, OneDrive, Jira, Linear, Asana, Zendesk, Intercom, HubSpot, Salesforce

- **Priority:** P1
- **Description:** A native-integration library (the listed 16 providers) flows PR state, mentions, and files into tasks automatically via scoped OAuth.
- **Detailed Requirements:**
  - Connecting an integration uses OAuth with scoped access.
  - At least the listed providers are connectable (GitHub, GitLab, Bitbucket, Slack, Teams, Discord, Figma, Notion, Google Drive, OneDrive, Jira, Linear, Asana, Zendesk, Intercom, HubSpot, Salesforce).
  - A connected integration can sync events into tasks (e.g., PR → status).
  - Disconnecting revokes the integration's access.
  - Connection status is visible and manageable per workspace.
  - Specific sync behaviors covered by US-E7-10 (GitHub/GitLab PR↔status), US-E7-11 (Slack/Teams), US-E7-12 (Figma).
- **Acceptance Criteria:**
  - When an integration is connected, auth is handled via OAuth and scoped.
  - At least the listed providers are connectable.
  - A connected integration can sync events into tasks (e.g., PR → status).
  - Disconnecting revokes the integration's access.
  - Connection status is visible and manageable per workspace.
- **Dependencies:** FR-7.1
- **Related User Stories:** US-E7-04, US-E7-10, US-E7-11, US-E7-12

### FR-7.5 — OAuth 2.0 / OIDC for 3rd party app integration

- **Priority:** P1
- **Description:** OAuth 2.0 / OIDC for third-party apps lets external apps authenticate as a workspace securely.
- **Detailed Requirements:**
  - When a third-party app requests access, it authenticates via OAuth 2.0/OIDC.
  - Scopes are presented to the user for consent.
  - Tokens are revocable from workspace settings.
  - Authorization follows standard redirect flows.
  - Granted authorizations are listed and manageable.
  - Underpins app marketplace (FR-7.6) and native integrations (FR-7.4).
- **Acceptance Criteria:**
  - When a third-party app requests access, it authenticates via OAuth 2.0/OIDC.
  - Scopes are presented to the user for consent.
  - Tokens are revocable from workspace settings.
  - Authorization follows standard redirect flows.
  - Granted authorizations are listed and manageable.
- **Dependencies:** FR-7.1
- **Related User Stories:** US-E7-05

### FR-7.6 — App marketplace (install, configure, review, revenue share)

- **Priority:** P2
- **Description:** An app marketplace lets users install, configure, review apps, and share revenue — extending the ecosystem.
- **Detailed Requirements:**
  - Browsing the marketplace allows installing and configuring published apps.
  - Users can rate and review installed apps.
  - A revenue-share model is defined for paid apps.
  - Installed apps appear in workspace settings.
  - Apps use the public API/OAuth (FR-7.1, FR-7.5).
- **Acceptance Criteria:**
  - When the marketplace is browsed, published apps can be installed and configured.
  - Users can rate and review installed apps.
  - A revenue-share model is defined for paid apps.
  - Installed apps appear in workspace settings.
  - Apps use the public API/OAuth (FR-7.1, FR-7.5).
- **Dependencies:** FR-7.4, FR-7.5
- **Related User Stories:** US-E7-06

### FR-7.7 — Embedded iFrame views (embed views in Confluence, Notion, websites)

- **Priority:** P2
- **Description:** Embedded iFrame views let stakeholders see live data where they already are — in Confluence, Notion, or websites.
- **Detailed Requirements:**
  - Embedding a view generates an iFrame snippet.
  - The embed renders the live, permission-scoped view.
  - Embed access respects the underlying view's sharing settings (FR-2.10).
  - The embed is responsive and theme-aware.
  - An embed token can be revoked.
- **Acceptance Criteria:**
  - When a view is embedded, an iFrame snippet is generated.
  - The embed renders the live, permission-scoped view.
  - Embed access respects the underlying view's sharing settings.
  - The embed is responsive and theme-aware.
  - An embed token can be revoked.
- **Dependencies:** FR-2.10 (US-E2-12)
- **Related User Stories:** US-E7-07

### FR-7.8 — CLI tool (collabstack CLI) for developers

- **Priority:** P2
- **Description:** A `collabstack` CLI lets developers create tasks and run automations from the terminal.
- **Detailed Requirements:**
  - Installing the CLI allows authentication via API token/OAuth (FR-7.1/FR-7.5).
  - The CLI supports creating/updating/querying tasks.
  - The CLI can trigger automations and read run history (FR-4.9).
  - Output is script-friendly (JSON) where useful.
  - The CLI version is independent and documented.
- **Acceptance Criteria:**
  - When the CLI is installed, it authenticates via API token/OAuth.
  - The CLI supports creating/updating/querying tasks.
  - The CLI can trigger automations and read run history.
  - Output is script-friendly (JSON) where useful.
  - The CLI version is independent and documented.
- **Dependencies:** FR-7.1, FR-4.9
- **Related User Stories:** US-E7-08

### FR-7.9 — Webhooks marketplace (pre-built webhook receivers)

- **Priority:** P2
- **Description:** A webhooks marketplace of pre-built receivers makes common external integrations one click, not custom code.
- **Detailed Requirements:**
  - Browsing receivers lists pre-built webhook receivers.
  - Installing a receiver creates a configured webhook endpoint (FR-4.11).
  - Receivers map inbound payloads to Sprintio actions.
  - A receiver's mapping can be customized before activation.
  - Receiver health is visible in delivery logs (FR-7.3).
- **Acceptance Criteria:**
  - When receivers are browsed, pre-built webhook receivers are listed.
  - Installing a receiver creates a configured webhook endpoint (FR-4.11).
  - Receivers map inbound payloads to Sprintio actions.
  - A receiver's mapping can be customized before activation.
  - Receiver health is visible in delivery logs (FR-7.3).
- **Dependencies:** FR-4.11, FR-7.3
- **Related User Stories:** US-E7-09

---

## E8: Admin, Security & Compliance (FR-8.1 – FR-8.10)

### FR-8.1 — SOC 2 Type II, GDPR, CCPA compliance

- **Priority:** P1
- **Description:** SOC 2 Type II, GDPR, and CCPA compliance let boards and customers accept Sprintio as a vendor.
- **Detailed Requirements:**
  - Controls meet SOC 2 Type II, GDPR, and CCPA requirements when audited.
  - A compliance/trust center publishes current certifications and reports.
  - Data-subject requests (GDPR/CCPA) are supportable via a defined process.
  - Compliance status is tracked and reported to customers.
  - Evidence collection is automated where possible (feeds from FR-8.7, FR-8.5).
- **Acceptance Criteria:**
  - When audited, controls meet SOC 2 Type II, GDPR, and CCPA requirements.
  - A compliance/trust center publishes current certifications and reports.
  - Data-subject requests (GDPR/CCPA) are supportable via a defined process.
  - Compliance status is tracked and reported to customers.
  - Evidence collection is automated where possible.
- **Dependencies:** FR-8.4
- **Related User Stories:** US-E8-01

### FR-8.2 — Data residency (US, EU, AU regions)

- **Priority:** P1
- **Description:** Data residency options (US, EU, AU) keep a workspace's data in the region its regulators require.
- **Detailed Requirements:**
  - When a workspace selects a region, its data is stored there.
  - Region is chosen at workspace creation and changeable per policy. _(Inferred — PRD silent on changeability; conservative: settable at creation, changeable via supported migration per policy.)_
  - Cross-region data movement is prevented for the workspace.
  - Audit/SIEM export respects the region (FR-6.7).
  - Region availability is shown before selection.
- **Acceptance Criteria:**
  - When a workspace selects a region, its data is stored there.
  - Region is chosen at workspace creation and changeable per policy.
  - Cross-region data movement is prevented for the workspace.
  - Audit/SIEM export respects the region (FR-6.7).
  - Region availability is shown before selection.
- **Dependencies:** FR-6.1
- **Related User Stories:** US-E8-02

### FR-8.3 — Encryption at rest (AES-256), in transit (TLS 1.3), customer-managed keys (P1)

- **Priority:** P0/P1
- **Description:** Encryption at rest (AES-256) and in transit (TLS 1.3), plus customer-managed keys, protect data and let enterprises control their keys.
- **Detailed Requirements:**
  - Data at rest is encrypted with AES-256.
  - All transport uses TLS 1.3.
  - Enterprise workspaces can supply customer-managed keys (CMK).
  - Key rotation is supported without data loss.
  - Encryption status is verifiable/auditable.
  - CMK listed as P1 in PRD; base encryption is P0.
- **Acceptance Criteria:**
  - When data is stored, it is encrypted at rest with AES-256.
  - All transport uses TLS 1.3.
  - Enterprise workspaces can supply customer-managed keys (CMK).
  - Key rotation is supported without data loss.
  - Encryption status is verifiable/auditable.
- **Dependencies:** None
- **Related User Stories:** US-E8-03

### FR-8.4 — Fine-grained permissions (resource-level, field-level P1)

- **Priority:** P0
- **Description:** Fine-grained, resource-level (and field-level) permissions keep sensitive fields from being visible to everyone.
- **Detailed Requirements:**
  - A permission rule enforces access at the resource level.
  - Field-level permissions hide/disable specific fields for scoped roles (P1 entitlement).
  - Permissions compose with roles (FR-6.2) and teams (FR-6.3).
  - Denied access returns no data for the field/resource.
  - Permission changes are audited (FR-1.6).
  - Prerequisite for compliance (FR-8.1) and custom roles (FR-6.2 P1).
- **Acceptance Criteria:**
  - When a permission rule is set, it enforces access at the resource level.
  - Field-level permissions hide/disable specific fields for scoped roles.
  - Permissions compose with roles (FR-6.2) and teams (FR-6.3).
  - Denied access returns no data for the field/resource.
  - Permission changes are audited (FR-1.6).
- **Dependencies:** FR-6.2
- **Related User Stories:** US-E8-04

### FR-8.5 — Audit log API, SIEM integration (Splunk, Datadog, Sentinel)

- **Priority:** P1
- **Description:** An audit-log API with SIEM integration (Splunk, Datadog, Sentinel) flows security events to the customer's stack.
- **Detailed Requirements:**
  - Querying the audit-log API returns structured, filterable events.
  - SIEM integrations push events to Splunk/Datadog/Sentinel.
  - API access requires admin entitlement and is rate-limited.
  - Events are complete (actor, action, target, timestamp).
  - Integration health is monitored.
  - Shares the audit-log foundation with FR-6.7.
- **Acceptance Criteria:**
  - When the audit-log API is queried, structured, filterable events are returned.
  - SIEM integrations push events to Splunk/Datadog/Sentinel.
  - API access requires admin entitlement and is rate-limited.
  - Events are complete (actor, action, target, timestamp).
  - Integration health is monitored.
- **Dependencies:** FR-1.6, FR-6.7
- **Related User Stories:** US-E8-05

### FR-8.6 — Data loss prevention (DLP) rules, watermarking

- **Priority:** P2
- **Description:** DLP rules and watermarking keep sensitive content from leaving the workspace uncontrolled.
- **Detailed Requirements:**
  - When DLP rules are configured, policy violations are blocked or flagged.
  - Watermarking marks exported/shared documents with user identity.
  - Rules are scoped per workspace/resource.
  - Violations are logged to the audit trail (FR-1.6).
  - DLP is admin-configurable and reportable.
  - Watermarking applies to exported docs (FR-3.8).
- **Acceptance Criteria:**
  - When DLP rules are configured, policy violations are blocked or flagged.
  - Watermarking marks exported/shared documents with user identity.
  - Rules are scoped per workspace/resource.
  - Violations are logged to the audit trail.
  - DLP is admin-configurable and reportable.
- **Dependencies:** FR-8.4, FR-3.8
- **Related User Stories:** US-E8-06

### FR-8.7 — Vulnerability management, pen testing, bug bounty

- **Priority:** P1
- **Description:** Vulnerability management, penetration testing, and a bug bounty continuously harden the platform.
- **Detailed Requirements:**
  - When a vulnerability is found, it enters a tracked remediation workflow.
  - Periodic penetration tests are conducted and documented.
  - A bug-bounty program accepts and triages external reports.
  - Remediation SLAs match severity.
  - Results feed compliance evidence (FR-8.1).
- **Acceptance Criteria:**
  - When a vulnerability is found, it enters a tracked remediation workflow.
  - Periodic penetration tests are conducted and documented.
  - A bug-bounty program accepts and triages external reports.
  - Remediation SLAs match severity.
  - Results feed the compliance evidence (FR-8.1).
- **Dependencies:** FR-8.1
- **Related User Stories:** US-E8-07

### FR-8.8 — Backup & disaster recovery (RPO < 1hr, RTO < 4hr)

- **Priority:** P1
- **Description:** Backup and disaster recovery with RPO < 1hr and RTO < 4hr ensure a failure doesn't lose the team's work.
- **Detailed Requirements:**
  - Backup runs keep recovery point objective under 1 hour.
  - A full recovery completes within 4 hours (RTO).
  - Backups are encrypted and tested via restore drills.
  - Recovery is documented and rehearsed on a schedule.
  - Backup coverage includes all core entities and docs.
  - Depends on encryption at rest (FR-8.3).
- **Acceptance Criteria:**
  - When a backup runs, recovery point objective is under 1 hour.
  - A full recovery completes within 4 hours (RTO).
  - Backups are encrypted and tested via restore drills.
  - Recovery is documented and rehearsed on a schedule.
  - Backup coverage includes all core entities and docs.
- **Dependencies:** FR-8.3
- **Related User Stories:** US-E8-08

### FR-8.9 — Legal hold, e-discovery export

- **Priority:** P2
- **Description:** Legal hold and e-discovery export let the org respond to legal requests without scrambling.
- **Detailed Requirements:**
  - When legal hold is applied, targeted data is preserved immutably.
  - An e-discovery export gathers held data into a reviewable package.
  - Hold scope is definable by workspace/entity/date.
  - Holds are auditable and removable when released.
  - Export respects region constraints (FR-8.2).
- **Acceptance Criteria:**
  - When legal hold is applied, targeted data is preserved immutably.
  - An e-discovery export gathers held data into a reviewable package.
  - Hold scope is definable by workspace/entity/date.
  - Holds are auditable and removable when released.
  - Export respects region constraints (FR-8.2).
- **Dependencies:** FR-1.6, FR-8.2
- **Related User Stories:** US-E8-09

### FR-8.10 — Accessibility (WCAG 2.1 AA)

- **Priority:** P1
- **Description:** WCAG 2.1 AA accessibility makes the product usable by everyone, including assistive-tech users.
- **Detailed Requirements:**
  - Full keyboard navigation is supported.
  - Screen readers announce structure and state correctly.
  - High-contrast mode and reduced-motion are available.
  - Color is never the sole carrier of meaning.
  - Core flows pass automated + manual AA audits.
  - Surfaced in the mobile-responsive web (FR-10.5).
- **Acceptance Criteria:**
  - When navigating the app, full keyboard navigation is supported.
  - Screen readers announce structure and state correctly.
  - High-contrast mode and reduced-motion are available.
  - Color is never the sole carrier of meaning.
  - Core flows pass automated + manual AA audits.
- **Dependencies:** None
- **Related User Stories:** US-E8-10

---

## E9: Billing & Subscription Management (FR-9.1 – FR-9.8)

### FR-9.1 — Tiered plans: Free, Pro ($12/u/mo), Business ($24/u/mo), Enterprise (custom)

- **Priority:** P0
- **Description:** Tiered plans (Free, Pro $12/u/mo, Business $24/u/mo, Enterprise custom) let teams pick a plan that fits size and needs.
- **Detailed Requirements:**
  - Plan listing shows Free/Pro/Business/Enterprise with features and prices.
  - Plan entitlements gate features (e.g., SSO, data residency).
  - Upgrading/downgrading changes entitlements immediately on the billing cycle.
  - Enterprise pricing is quote-based (custom).
  - Plan limits are enforced consistently across the app.
  - Per-workspace (FR-6.1); gating for E6/E7/E8 entitlements.
- **Acceptance Criteria:**
  - When plans are viewed, Free/Pro/Business/Enterprise are listed with features and prices.
  - Plan entitlements gate features (e.g., SSO, data residency).
  - Upgrading/downgrading changes entitlements immediately on the billing cycle.
  - Enterprise plan pricing is quote-based (custom).
  - Plan limits are enforced consistently across the app.
- **Dependencies:** FR-6.1
- **Related User Stories:** US-E9-01

### FR-9.2 — Per-seat pricing with volume discounts

- **Priority:** P0
- **Description:** Per-seat pricing with volume discounts keeps scaling the team from blowing the budget linearly.
- **Detailed Requirements:**
  - Seat increases compute per seat with applied volume discount.
  - Discount tiers are visible at checkout.
  - Seat count changes prorate on the next invoice.
  - Removing seats takes effect at renewal (per policy).
  - The seat total matches active members (FR-6.2).
- **Acceptance Criteria:**
  - When seats increase, price computes per seat with applied volume discount.
  - Discount tiers are visible at checkout.
  - Seat count changes prorate on the next invoice.
  - Removing seats takes effect at renewal (per policy).
  - The seat total matches active members (FR-6.2).
- **Dependencies:** FR-9.1, FR-6.2
- **Related User Stories:** US-E9-02

### FR-9.3 — Usage-based AI credits (included quota + overage)

- **Priority:** P0
- **Description:** Usage-based AI credits (included quota + overage) bound and predict AI spend.
- **Detailed Requirements:**
  - AI usage decrements credits from the included quota.
  - Overage is metered and billed at the plan rate.
  - Quota and usage are visible in-app (FR-5.15).
  - BYOK bypasses credit metering where active (FR-5.14).
  - Overage caps are enforceable per workspace.
- **Acceptance Criteria:**
  - When AI features are used, credits decrement from the included quota.
  - Overage is metered and billed at the plan rate.
  - Quota and usage are visible in-app (FR-5.15).
  - BYOK bypasses credit metering where active (FR-5.14).
  - Overage caps are enforceable per workspace.
- **Dependencies:** FR-5.15, FR-9.1
- **Related User Stories:** US-E9-03

### FR-9.4 — Stripe Billing integration (subscriptions, trials, proration, dunning)

- **Priority:** P0
- **Description:** Stripe Billing handles subscriptions, trials, proration, and dunning so billing runs on a trusted processor.
- **Detailed Requirements:**
  - Subscribing manages the subscription lifecycle via Stripe.
  - Trials convert to paid automatically at term end.
  - Plan changes prorate correctly via Stripe.
  - Failed payments enter dunning with retry/notify.
  - Subscription state stays in sync with Sprintio entitlements (FR-9.1).
- **Acceptance Criteria:**
  - When a user subscribes, Stripe manages the subscription lifecycle.
  - Trials convert to paid automatically at term end.
  - Plan changes prorate correctly via Stripe.
  - Failed payments enter dunning with retry/notify.
  - Subscription state stays in sync with Sprintio entitlements.
- **Dependencies:** FR-9.1, FR-9.2
- **Related User Stories:** US-E9-04

### FR-9.5 — Customer portal (billing history, invoices, payment methods, plan changes)

- **Priority:** P0
- **Description:** A customer portal for billing history, invoices, payment methods, and plan changes lets customers self-serve without contacting sales.
- **Detailed Requirements:**
  - The portal shows invoices and billing history.
  - Payment methods can be updated securely (via Stripe).
  - Plans can be changed with prorated impact shown.
  - Invoices are downloadable as PDF.
  - Portal actions are reflected in entitlements immediately.
- **Acceptance Criteria:**
  - When the portal is opened, invoices and billing history are shown.
  - Payment methods can be updated securely (via Stripe).
  - Plans can be changed with prorated impact shown.
  - Invoices are downloadable as PDF.
  - Portal actions are reflected in entitlements immediately.
- **Dependencies:** FR-9.4
- **Related User Stories:** US-E9-05

### FR-9.6 — Usage analytics & alerts (approaching limits, overage warnings)

- **Priority:** P1
- **Description:** Usage analytics and alerts (approaching limits, overage warnings) keep customers from being surprised by a bill.
- **Detailed Requirements:**
  - When usage nears a limit, a warning is sent before overage.
  - The portal shows seat, storage, and AI-credit usage vs limits.
  - Overage events are itemized on the invoice.
  - Alerts are configurable by recipient.
  - Analytics align with AI usage analytics (FR-5.15).
- **Acceptance Criteria:**
  - When usage nears a limit, a warning is sent before overage.
  - The portal shows seat, storage, and AI-credit usage vs limits.
  - Overage events are itemized on the invoice.
  - Alerts are configurable by recipient.
  - Analytics align with AI usage analytics (FR-5.15).
- **Dependencies:** FR-9.3, FR-9.5
- **Related User Stories:** US-E9-06

### FR-9.7 — Enterprise contracts (annual, PO, custom terms, SSO enforcement)

- **Priority:** P1
- **Description:** Enterprise contracts (annual, PO, custom terms, SSO enforcement) let procurement fit the customer's process.
- **Detailed Requirements:**
  - When an enterprise contract is signed, annual/PO billing is supported.
  - Custom terms are recorded against the workspace.
  - SSO can be enforced as a contract condition (FR-6.5).
  - Invoicing follows the contracted schedule.
  - Contract state gates Enterprise-only features.
- **Acceptance Criteria:**
  - When an enterprise contract is signed, annual/PO billing is supported.
  - Custom terms are recorded against the workspace.
  - SSO can be enforced as a contract condition (FR-6.5).
  - Invoicing follows the contracted schedule.
  - Contract state gates Enterprise-only features.
- **Dependencies:** FR-9.1, FR-6.5
- **Related User Stories:** US-E9-07

### FR-9.8 — Partner/affiliate program, revenue share

- **Priority:** P2
- **Description:** A partner/affiliate program with revenue share lets referrers earn credit when clients convert.
- **Detailed Requirements:**
  - When a referral converts, the partner earns revenue share per terms.
  - Partners can track referrals and earnings in a portal.
  - Revenue-share rates are defined and transparent.
  - Payouts follow a defined schedule.
  - Program terms are enforceable and auditable.
- **Acceptance Criteria:**
  - When a referral converts, the partner earns revenue share per terms.
  - Partners can track referrals and earnings in a portal.
  - Revenue-share rates are defined and transparent.
  - Payouts follow a defined schedule.
  - Program terms are enforceable and auditable.
- **Dependencies:** FR-9.4
- **Related User Stories:** US-E9-08

---

## E10: Mobile & Desktop Apps (FR-10.1 – FR-10.6)

### FR-10.1 — iOS app (native SwiftUI, offline-first, push notifications)

- **Priority:** P2
- **Description:** A native iOS app (SwiftUI), offline-first with push notifications, lets users capture and check work from their phone.
- **Detailed Requirements:**
  - The iOS app is a native SwiftUI app.
  - Core views work offline and sync on reconnect (CRDT, FR-10.6).
  - Push notifications arrive for assignments and mentions.
  - The app supports authentication including SSO where entitled (FR-6.5).
  - Offline edits reconcile without data loss.
  - Connects to quick-capture (US-E10-07).
- **Acceptance Criteria:**
  - When the iOS app is installed, it is a native SwiftUI app.
  - Core views work offline and sync on reconnect (CRDT).
  - Push notifications arrive for assignments and mentions.
  - The app supports authentication including SSO where entitled.
  - Offline edits reconcile without data loss.
- **Dependencies:** FR-2.10 (US-E2-14), FR-8.6
- **Related User Stories:** US-E10-01, US-E10-07

### FR-10.2 — Android app (native Kotlin, offline-first, push notifications)

- **Priority:** P2
- **Description:** A native Android app (Kotlin), offline-first with push, lets users check client status from anywhere.
- **Detailed Requirements:**
  - The Android app is a native Kotlin app.
  - Core views work offline and sync on reconnect.
  - Push notifications arrive for assignments, mentions, and budget alerts.
  - The app supports authentication including SSO where entitled (FR-6.5).
  - Offline edits reconcile without data loss.
- **Acceptance Criteria:**
  - When the Android app is installed, it is a native Kotlin app.
  - Core views work offline and sync on reconnect.
  - Push notifications arrive for assignments, mentions, and budget alerts.
  - The app supports authentication including SSO where entitled.
  - Offline edits reconcile without data loss.
- **Dependencies:** FR-2.10 (US-E2-14), FR-4.18
- **Related User Stories:** US-E10-02

### FR-10.3 — Desktop apps (Tauri/Electron: macOS, Windows, Linux)

- **Priority:** P1
- **Description:** Desktop apps for macOS, Windows, and Linux (Tauri) give Sprintio its own window, not a browser tab.
- **Detailed Requirements:**
  - The desktop app runs natively on macOS/Windows/Linux (Tauri).
  - It mirrors web functionality for core workflows.
  - It supports OS notifications and auto-update.
  - It shares the same data model and real-time sync as web.
  - It respects the same permissions as web.
- **Acceptance Criteria:**
  - When the desktop app is installed, it runs natively on macOS/Windows/Linux (Tauri).
  - It mirrors web functionality for core workflows.
  - It supports OS notifications and auto-update.
  - It shares the same data model and real-time sync as web.
  - It respects the same permissions as web.
- **Dependencies:** FR-2.10 (US-E2-14)
- **Related User Stories:** US-E10-03

### FR-10.4 — PWA with offline support, push notifications

- **Priority:** P1
- **Description:** A Progressive Web App with offline support and push notifications gives an installable, app-like experience from the browser.
- **Detailed Requirements:**
  - Installing the PWA makes it launchable from home screen/desktop.
  - Core views work offline and sync on reconnect.
  - Push notifications work where the platform allows.
  - The PWA shares the web app's data and permissions.
  - Updates apply automatically on next launch.
- **Acceptance Criteria:**
  - When the PWA is installed, it is launchable from home screen/desktop.
  - Core views work offline and sync on reconnect.
  - Push notifications work where the platform allows.
  - The PWA shares the web app's data and permissions.
  - Updates apply automatically on next launch.
- **Dependencies:** FR-2.10 (US-E2-14)
- **Related User Stories:** US-E10-04

### FR-10.5 — Mobile-optimized web (responsive, touch-friendly)

- **Priority:** P1
- **Description:** A mobile-optimized responsive web lets clients and users work from a phone browser cleanly.
- **Detailed Requirements:**
  - On a phone, layouts adapt touch-first.
  - Core views (List/Board/Calendar/Docs) are usable on small screens.
  - Tap targets meet accessibility sizing.
  - The responsive web shares the same data as desktop.
  - No functionality is blocked solely by screen size.
  - Honors WCAG 2.1 AA (FR-8.10).
- **Acceptance Criteria:**
  - When the web app is opened on a phone, layouts adapt touch-first.
  - Core views (List/Board/Calendar/Docs) are usable on small screens.
  - Tap targets meet accessibility sizing.
  - The responsive web shares the same data as desktop.
  - No functionality is blocked solely by screen size.
- **Dependencies:** FR-2.10 (US-E2-14), FR-8.10
- **Related User Stories:** US-E10-05

### FR-10.6 — Offline-first architecture (CRDT, background sync, conflict resolution)

- **Priority:** P1
- **Description:** An offline-first architecture with CRDT background sync and conflict resolution lets users work on a plane and merge cleanly later.
- **Detailed Requirements:**
  - Offline edits are queued locally via CRDT.
  - On reconnect, changes sync in the background without manual push.
  - Conflicts resolve automatically via CRDT merge semantics.
  - Sync status is visible to the user.
  - No edits are lost across reconnect.
  - Built on the real-time editor substrate (FR-3.1).
- **Acceptance Criteria:**
  - When editing offline, changes are queued locally via CRDT.
  - On reconnect, changes sync in the background without manual push.
  - Conflicts resolve automatically via CRDT merge semantics.
  - Sync status is visible to the user.
  - No edits are lost across reconnect.
- **Dependencies:** FR-3.1
- **Related User Stories:** US-E10-06, US-E10-08

---

## E11: Notifications & Onboarding (FR-11.1 – FR-11.6)

### FR-11.1 — In-app notification center (bell icon, feed, unread count, mark read, filter by type)

- **Priority:** P0
- **Description:** An in-app notification center gives users a centralized place to see all activity that requires their attention — assignments, mentions, due dates, status changes — without leaving the app.
- **Detailed Requirements:**
  - A bell icon in the global header shows an unread count badge.
  - Clicking the bell opens a notification panel/popover with a scrollable feed.
  - Notifications are grouped by recency (today, yesterday, earlier).
  - Each notification shows: actor, action, target entity, timestamp.
  - Users can mark individual notifications as read, or mark all as read.
  - Users can filter notifications by type (assignments, mentions, due dates, all).
  - Unread count is updated in real-time via WebSocket.
  - Notifications persist for 90 days; older notifications are archived.
- **Acceptance Criteria:**
  - When a user is assigned a task, they receive an in-app notification within 5 seconds.
  - When a user is @mentioned in a comment, they receive an in-app notification within 5 seconds.
  - The unread count badge accurately reflects unread notifications.
  - Mark-all-as-read clears the badge and marks all visible notifications as read.
  - Notification filtering correctly shows only the selected type.
- **Dependencies:** FR-3.5 (comments for @mention), FR-1.2 (task assignment)
- **Related User Stories:** US-E11-01

### FR-11.2 — Email notifications (assignment, @mention, due date, status change)

- **Priority:** P0
- **Description:** Email notifications ensure users stay informed even when they're not actively in the app. Critical events (assignments, mentions, approaching due dates) trigger email notifications.
- **Detailed Requirements:**
  - Email notifications are sent for: task assigned, @mentioned in comment, task due date approaching (24h before), task status changed by another user.
  - Emails include a direct link to the relevant entity (task, comment, doc).
  - Emails are branded with Sprintio styling and include unsubscribe link.
  - Email delivery uses a transactional email provider (e.g., Postmark, SendGrid).
  - Bounced/failed emails are logged and surfaced to the user.
- **Acceptance Criteria:**
  - When a user is assigned a task, they receive an email within 60 seconds.
  - The email contains a working link directly to the assigned task.
  - Users can unsubscribe from email notifications via the unsubscribe link.
  - Email delivery failures are logged in the notification system.
- **Dependencies:** FR-11.3 (notification preferences)
- **Related User Stories:** US-E11-02

### FR-11.3 — Notification preferences (per-user toggle: which events, email vs in-app vs off)

- **Priority:** P0
- **Description:** Notification preferences let each user control which events generate notifications and through which channel (in-app, email, or off).
- **Detailed Requirements:**
  - A Notification Preferences page accessible from user settings.
  - Per-event toggles: Assignment, @Mention, Due Date, Status Change, Comment Added.
  - Per-channel toggles: In-App, Email (each event can be configured independently).
  - Default settings: All events → In-App + Email (for new users).
  - Changes take effect immediately (no restart required).
- **Acceptance Criteria:**
  - When a user disables email for "Due Date" notifications, they no longer receive due-date emails.
  - When a user disables in-app for "Status Change," status change notifications do not appear in the bell feed.
  - Default preferences are applied to new user accounts on first login.
  - Preference changes are persisted and survive logout/login.
- **Dependencies:** None
- **Related User Stories:** US-E11-03

### FR-11.4 — Workspace setup wizard (guided first-time flow)

- **Priority:** P0
- **Description:** A workspace setup wizard guides new workspace creators through the essential first steps: naming the workspace, inviting team members, and creating the first project/list.
- **Detailed Requirements:**
  - Triggered on first workspace creation (not on subsequent workspaces).
  - Step 1: Name your workspace (text input, pre-filled with company name if available).
  - Step 2: Invite team members (email input, bulk paste, skip option).
  - Step 3: Create your first project (name + default list, or choose a template).
  - Step 4: Quick tour overlay (3-4 hotspots highlighting key UI areas).
  - Wizard can be skipped at any step; skipped steps are marked complete.
  - Wizard state is persisted (if user closes browser mid-wizard, they resume on next visit).
- **Acceptance Criteria:**
  - A new workspace creator sees the setup wizard immediately after workspace creation.
  - Completing all wizard steps results in: named workspace, invited members (pending), one project with one list.
  - Skipping the wizard does not block workspace access.
  - The wizard does not appear on subsequent workspace creations.
- **Dependencies:** FR-1.1 (workspace hierarchy), FR-6.1 (multi-workspace)
- **Related User Stories:** US-E11-04

### FR-11.5 — User onboarding checklist (progressive checklist for new users)

- **Priority:** P0
- **Description:** An onboarding checklist helps new users discover key features by guiding them through a series of actions (create a task, invite a teammate, use a view, etc.).
- **Detailed Requirements:**
  - A collapsible checklist widget appears in the sidebar or as a floating card for new users.
  - Checklist items: Create a task, Assign a task, Invite a teammate, Use board view, Comment on a task, Create a doc.
  - Each item shows a checkmark when completed; items complete automatically based on user actions.
  - Checklist is dismissible; once dismissed, it does not reappear.
  - Checklist progress is per-user (not per-workspace).
  - Checklist items are ordered by complexity (simple → complex).
- **Acceptance Criteria:**
  - A new user sees the onboarding checklist on their first login.
  - When the user creates their first task, "Create a task" is automatically checked off.
  - When the user dismisses the checklist, it does not reappear.
  - Checklist completion rate is tracked (for product analytics).
- **Dependencies:** FR-1.1 (workspace), FR-1.2 (task creation)
- **Related User Stories:** US-E11-05

### FR-11.6 — CSV task import (upload CSV, column mapping)

- **Priority:** P0
- **Description:** CSV task import lets users migrate from existing tools (Jira, Asana, Trello, spreadsheets) by uploading a CSV file and mapping columns to Sprintio fields.
- **Detailed Requirements:**
  - Upload interface accepts .csv files up to 10MB (≤ 10,000 rows).
  - Auto-detect column headers; allow manual remapping of columns to Sprintio fields.
  - Supported mapping targets: Title (required), Description, Status, Assignee, Due Date, Labels/Priority.
  - Preview first 5 rows before import; show mapping confirmation.
  - Import runs asynchronously for large files; user sees progress indicator.
  - Imported tasks are created in the selected list with default values for unmapped fields.
  - Import summary shows: total rows, imported, skipped (duplicates/errors), errors.
- **Acceptance Criteria:**
  - User can upload a CSV and see column auto-detection within 3 seconds.
  - User can remap any column to any supported Sprintio field.
  - Preview shows the first 5 rows with mapped field names.
  - Import of 1,000 rows completes within 30 seconds.
  - Import errors (bad date format, unknown assignee) are logged and shown in the summary.
- **Dependencies:** FR-1.1 (workspace/list hierarchy), FR-1.2 (task schema)
- **Related User Stories:** US-E11-06

---

**Document Status:** Finalized  
**Next Review:** 2026-07-14  
**Owner:** Product  
**Approvers:** [whom it may concern]
