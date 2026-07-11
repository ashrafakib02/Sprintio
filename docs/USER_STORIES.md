# Sprintio — User Stories

**Document Type:** User Stories (backlog organized by epic)  
**Product:** Sprintio — Sprint fast. Ship together.  
**Version:** 1.0  
**Status:** Finalized  
**Date:** 2026-07-07  
**Related Docs:** [PRD](./PRD.md), [User Personas](./USER_PERSONAS.md), [Functional Requirements](./FUNCTIONAL_REQUIREMENTS.md)

---

## 1. Introduction

This document is the canonical user-story backlog for Sprintio, organized by epic (E1–E11). It translates the functional requirements defined in the [PRD](./PRD.md) and the goals, pain points, and jobs-to-be-done described in the [User Personas](./USER_PERSONAS.md) into concrete, testable user stories. Every story is mapped to a functional requirement (FR) ID, tied to a primary persona, and annotated with its epic priority and cross-story dependencies.

The backlog is scoped to the full product vision (MVP + P1 + P2). Story counts per epic are fixed by the PRD and must not be rebalanced without a corresponding PRD change. The [MVP Definition](./MVP_DEFINITION.md) specifies which stories ship in v1.0.

### Epic Summary

| Epic                                      | Stories | Priority |
| ----------------------------------------- | ------- | -------- |
| **E1: Core Workspace & Data Model**       | 12      | P0       |
| **E2: Views & Visualization**             | 15      | P0       |
| **E3: Real-time Collaboration & Docs**    | 10      | P0       |
| **E4: Native Automation Engine**          | 18      | P0       |
| **E5: AI Copilot & Intelligence**         | 15      | P1       |
| **E6: Team & Workspace Management**       | 12      | P0       |
| **E7: Integrations & API**                | 12      | P1       |
| **E8: Admin, Security & Compliance**      | 10      | P1       |
| **E9: Billing & Subscription Management** | 8       | P1       |
| **E10: Mobile & Desktop Apps**            | 8       | P2       |
| **E11: Notifications & Onboarding**       | 6       | P0       |

**Total Stories: 126**

---

## 2. E1: Core Workspace & Data Model (12 stories, P0)

### US-E1-01 — Hierarchical workspace structure

- **Persona:** All users
- **Story:** As a user, I want to organize my work in a hierarchy of Workspace → Space → Folder → List → Task, so that I can model any team's structure in one consistent model.
- **Acceptance Criteria:**
  - Given a workspace, when I create a Space, then it nests under the workspace and is visible in the sidebar.
  - When I add a Folder inside a Space, then it nests under that Space.
  - When I add a List inside a Folder, then tasks created in it inherit the List/Space/Workspace path.
  - A Task can be moved between Lists/Folders and its ancestry updates without breaking references.
  - The hierarchy supports unlimited Spaces, Folders, and Lists (within plan limits).
- **Priority:** P0
- **Depends on:** None
- **Maps to FR:** FR-1.1

### US-E1-02 — Flexible custom task schema

- **Persona:** Priya
- **Story:** As a Product Manager, I want configurable task schemas with 15+ custom field types, custom statuses, and templates, so that my backlog can capture priority, value, and effort exactly the way my team thinks.
- **Acceptance Criteria:**
  - When I add a custom field, then I can choose from at least 15 types (text, number, select, multi-select, date, person, checkbox, URL, etc.).
  - When I define a custom status set, then the Board/List views render those statuses as columns/options.
  - Custom fields are filterable and sortable in views.
  - Schema changes apply to all tasks in the List without data loss.
  - Field configuration is savable as part of a task template.
- **Priority:** P0
- **Depends on:** US-E1-01
- **Maps to FR:** FR-1.2

### US-E1-03 — Task relationships and dependencies

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want subtasks, dependencies (blocked by / blocks), duplicates, and related links, so that I can see how work is connected and where blockers exist.
- **Acceptance Criteria:**
  - When I mark a task as blocked by another, then the dependent task shows a blocking indicator.
  - When a blocking task is completed, then the blocked task can transition out of its blocked state.
  - A task can have multiple subtasks that roll up completion to the parent.
  - I can mark a task as a duplicate of another and merge/route it.
  - Related-task links are bidirectional and visible on both sides.
- **Priority:** P0
- **Depends on:** US-E1-01
- **Maps to FR:** FR-1.3

### US-E1-04 — Rich text task description

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want a rich text description with mentions, slash commands, and embeds, so that I can write an RFC-style task brief without leaving the task.
- **Acceptance Criteria:**
  - When I type `@` in a description, then I can mention a teammate who receives a notification.
  - When I type `/`, then a slash-command menu appears for inserts (code, date, embed, etc.).
  - I can embed a Figma frame, link, or image inline.
  - Rich text (bold, lists, code blocks) renders consistently in List and Doc previews.
  - Editing resolves in real time with other viewers (see E3).
- **Priority:** P0
- **Depends on:** US-E1-01
- **Maps to FR:** FR-1.4

### US-E1-05 — Threaded comments with reactions and assignments

- **Persona:** Alex
- **Story:** As a Design Lead, I want threaded comments with reactions, assignments, rich text, and code blocks, so that design feedback lives in one thread of truth instead of scattering across tools.
- **Acceptance Criteria:**
  - When I comment, then I can reply in a thread and react with emoji.
  - I can assign a comment to a user, converting it into an action with notification.
  - Comments support rich text and code block formatting.
  - Comment threads are visible on the task and in the activity log.
  - I can resolve a thread to collapse it from the active view.
- **Priority:** P0
- **Depends on:** US-E1-01
- **Maps to FR:** FR-1.5

### US-E1-06 — Immutable activity log / audit trail

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want an immutable, filterable, exportable activity log, so that I can trust that the recorded history matches what actually happened.
- **Acceptance Criteria:**
  - When any task field, comment, or status changes, then an immutable entry is appended.
  - I can filter the log by actor, entity, action type, and date range.
  - The log can be exported to CSV/JSON.
  - Entries cannot be edited or deleted after creation.
  - Activity entries link through to the current state of the affected entity.
- **Priority:** P0
- **Depends on:** US-E1-01
- **Maps to FR:** FR-1.6

### US-E1-07 — Bulk operations on multi-selected tasks

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want multi-select bulk operations (move, assign, status, delete, duplicate), so that sprint setup doesn't mean editing tasks one at a time.
- **Acceptance Criteria:**
  - When I select multiple tasks, then a bulk-action bar appears.
  - I can change status, assignee, or move all selected tasks to another List in one action.
  - I can duplicate or delete all selected tasks with a single confirmation.
  - Bulk actions generate one audit-log entry per task.
  - Keyboard multi-select (shift/ctrl-click) is supported.
- **Priority:** P0
- **Depends on:** US-E1-01
- **Maps to FR:** FR-1.7

### US-E1-08 — Task templates with variable substitution

- **Persona:** Priya
- **Story:** As a Product Manager, I want task templates with variable substitution, so that recurring spec structures are consistent without copy-paste.
- **Acceptance Criteria:**
  - When I save a task as a template, then its fields, description, subtasks, and custom values are captured.
  - When I instantiate a template, then `{{variable}}` placeholders prompt for values and substitute them.
  - A template can include a predefined subtask checklist.
  - Templates are reusable across Lists in the same Space.
  - Template instantiation creates a normal task with full editability.
- **Priority:** P0
- **Depends on:** US-E1-02
- **Maps to FR:** FR-1.8

### US-E1-09 — Recurring tasks

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want recurring tasks via cron-style and natural-language schedules, so that chores like dependency bumps never get forgotten.
- **Acceptance Criteria:**
  - When I set a task to recur, then I can define the cadence with a cron expression or natural language ("every 2 weeks on Monday").
  - When the recurrence fires, then a new instance is created with the same template and assignments.
  - I can choose to carry over the previous instance's subtask completion state or reset it.
  - Recurring tasks do not stack duplicates if the prior instance is incomplete (configurable).
  - Recurrence is visible and editable from the task.
- **Priority:** P0
- **Depends on:** US-E1-08
- **Maps to FR:** FR-1.9

### US-E1-10 — Time tracking and estimates

- **Persona:** Casey
- **Story:** As an Agency PM, I want manual and automatic time tracking with estimates and time reports, so that every billable hour is captured and reconciled.
- **Acceptance Criteria:**
  - When I start a timer on a task, then elapsed time accrues and can be paused/resumed.
  - I can log time manually with a date, duration, and note.
  - Each task shows an estimate vs logged-time comparison.
  - A time report aggregates entries by person, task, List, and date range.
  - Time entries appear in the activity log and are exportable for billing.
- **Priority:** P1
- **Depends on:** US-E1-01
- **Maps to FR:** FR-1.10

### US-E1-11 — Goals / OKRs linked to tasks

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want Goals/OKRs linked to tasks with automatic progress rollup, so that I can see strategic alignment from daily work.
- **Acceptance Criteria:**
  - When I create a Goal, then I can link contributing tasks and sub-goals to it.
  - Progress of a goal rolls up from the completion of linked tasks.
  - I can set a target metric and current value per goal.
  - Goals are visible at Workspace and Portfolio altitude (see US-E2-15).
  - A goal's progress updates automatically when linked task statuses change.
- **Priority:** P1
- **Depends on:** US-E1-01, US-E1-03
- **Maps to FR:** FR-1.11

### US-E1-12 — Custom field formulas, rollups, and lookups

- **Persona:** Priya
- **Story:** As a Product Manager, I want formula, rollup, and lookup custom fields, so that backlog metrics compute themselves instead of me maintaining them by hand.
- **Acceptance Criteria:**
  - When I define a formula field, then it computes from other field values per row.
  - A rollup field aggregates a linked/child field (sum, count, average) across related tasks.
  - A lookup field pulls a value from a related task into the current row.
  - Formula/rollup/lookup fields recalculate automatically on source changes.
  - Invalid formulas surface a clear inline error rather than corrupting data.
- **Priority:** P1
- **Depends on:** US-E1-02, US-E1-03
- **Maps to FR:** FR-1.12

---

## 3. E2: Views & Visualization (15 stories, P0)

### US-E2-01 — List view

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want a sortable, groupable, filterable List view with column customization, so that my "My Work" list shows exactly what I need and nothing I don't.
- **Acceptance Criteria:**
  - When I open a List, then rows represent tasks and columns represent fields.
  - I can sort by any column and group by any select/custom field.
  - I can filter by field values, assignee, and label.
  - I can show/hide and reorder columns.
  - Inline editing of fields is supported from the row.
- **Priority:** P0
- **Depends on:** US-E1-02
- **Maps to FR:** FR-2.1

### US-E2-02 — Board / Kanban view

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want a Board view with swimlanes, WIP limits, drag-drop, and sub-columns, so that sprint planning and review routing feel visual and fast.
- **Acceptance Criteria:**
  - When I open Board, then columns map to a status (or other grouping) field.
  - I can drag a card between columns to change its status.
  - I can enable WIP limits per column that warn when exceeded.
  - Swimlanes group cards by assignee, priority, or another field.
  - Sub-columns (e.g., per-person) render within a column when configured.
- **Priority:** P0
- **Depends on:** US-E1-02
- **Maps to FR:** FR-2.2

### US-E2-03 — Table / Spreadsheet view

- **Persona:** Priya
- **Story:** As a Product Manager, I want a Table view with inline editing, frozen columns, formulas, and pivots, so that the backlog behaves like a spreadsheet I already know.
- **Acceptance Criteria:**
  - When I open Table, then I can edit any cell inline.
  - I can freeze one or more leading columns while scrolling.
  - Formula and rollup fields compute and display in cells (see US-E1-12).
  - I can create a pivot of tasks by two dimensions (e.g., owner × priority).
  - Bulk cell edits apply across selected ranges.
- **Priority:** P0
- **Depends on:** US-E1-12
- **Maps to FR:** FR-2.3

### US-E2-04 — Calendar view

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want a Calendar view (day/week/month) with drag-drop rescheduling and multi-calendar support, so that due dates are visible in time, not just in a list.
- **Acceptance Criteria:**
  - When I open Calendar, then tasks with dates appear on their due (and start) dates.
  - I can drag a task to a new date and its due date updates.
  - I can toggle multiple calendars (e.g., by assignee or List) on and off.
  - Day/week/month modes are switchable.
  - Tasks without dates are excluded but accessible from a sidebar.
- **Priority:** P0
- **Depends on:** US-E1-01
- **Maps to FR:** FR-2.4

### US-E2-05 — Timeline / Gantt view

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want a Timeline/Gantt view with dependencies, critical path, baseline, and milestones, so that I can plan cross-team sequencing.
- **Acceptance Criteria:**
  - When I open Timeline, then tasks plot as bars between start and due dates.
  - Dependency lines render between linked tasks (see US-E1-03).
  - The view highlights the critical path through dependent tasks.
  - I can set a baseline and see variance against it.
  - Milestone tasks render as diamond markers.
- **Priority:** P0
- **Depends on:** US-E1-03
- **Maps to FR:** FR-2.5

### US-E2-06 — Dashboard view with widgets

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want a Dashboard view with chart, metric, text, embed, and progress widgets, so that I can give leadership a one-screen status readout.
- **Acceptance Criteria:**
  - When I create a Dashboard, then I can add widgets from a palette.
  - Chart widgets bind to a List/filter and render counts by field.
  - Metric widgets show a single KPI with optional trend.
  - Embed and text widgets accept arbitrary content/links.
  - Progress widgets render completion % from a goal or filtered set (see US-E1-11).
- **Priority:** P0
- **Depends on:** US-E1-11
- **Maps to FR:** FR-2.6

### US-E2-07 — Workload / Capacity view

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want a Workload/Capacity view per person and per team, so that I can spot overallocation before it becomes a miss.
- **Acceptance Criteria:**
  - When I open Workload, then each person/team shows assigned effort vs capacity.
- **Acceptance Criteria (continued):**
  - Capacity is configurable per person (hours or points per period).
  - Overallocation (>100%) is visually flagged.
  - I can group the view by team and drill into an individual.
  - Filtering by date range reflects scheduled load over that window.
  - Rebalancing a task updates both sides' load immediately.
- **Priority:** P1
- **Depends on:** US-E2-01
- **Maps to FR:** FR-2.7

### US-E2-08 — Map view

- **Persona:** Casey
- **Story:** As an Agency PM, I want a Map view for location-based tasks, so that field/client visits are planned geographically.
- **Acceptance Criteria:**
  - When tasks have a location field, then they plot as pins on a map.
  - I can filter which tasks appear on the map.
  - Clicking a pin opens the task summary.
  - Map view respects the same permissions as other views.
  - A location custom field type supports geocoding.
- **Priority:** P2
- **Depends on:** US-E1-02
- **Maps to FR:** FR-2.8

### US-E2-09 — Whiteboard / infinite canvas

- **Persona:** Alex
- **Story:** As a Design Lead, I want a Whiteboard canvas with bidirectional task links, so that critique sessions and journey maps live next to the work.
- **Acceptance Criteria:**
  - When I open a Whiteboard, then I can draw, add shapes, sticky notes, and text freely.
  - I can drop a task/node that links bidirectionally to a real task.
  - Changes sync in real time with other viewers (see E3).
  - The canvas is zoomable and pannable (infinite).
  - Whiteboard content is saved with version history.
- **Priority:** P2
- **Depends on:** US-E1-03
- **Maps to FR:** FR-2.9

### US-E2-10 — Saved, personal, and shared views

- **Persona:** Priya
- **Story:** As a Product Manager, I want to save personal and shared views plus view templates, so that my backlog filters are one click away for the whole team.
- **Acceptance Criteria:**
  - When I configure a view, then I can save it with its filters/sorts/grouping.
  - I can mark a saved view as personal or shared with the Space/Workspace.
  - Shared views appear in the view switcher for all members.
  - A saved view can be published as a reusable template.
  - Editing a shared view updates it for everyone using it.
- **Priority:** P0
- **Depends on:** US-E2-01, US-E2-02, US-E2-03, US-E2-04, US-E2-05
- **Maps to FR:** FR-2.10

### US-E2-11 — Cross-workspace portfolio view

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want a cross-workspace Portfolio view that rolls up multiple workspaces, so that I see all teams in one trusted picture.
- **Acceptance Criteria:**
  - When I open Portfolio, then it aggregates selected workspaces/spaces into one view.
  - Rollup shows progress, status distribution, and risk per team.
  - I can drill from a portfolio row into the underlying workspace.
  - Portfolio respects each workspace's viewer permissions.
  - Filters apply across all included workspaces consistently.
- **Priority:** P1
- **Depends on:** US-E2-06, US-E1-11
- **Maps to FR:** FR-2.11

### US-E2-12 — Public/shareable view links

- **Persona:** Casey
- **Story:** As an Agency PM, I want to share a read-only view via a link, so that clients get a live window without a full seat.
- **Acceptance Criteria:**
  - When I share a view, then a public read-only link is generated.
  - The shared view respects a defined subset of fields (no hidden data leaks).
  - I can revoke the link at any time.
  - The shared view reflects live data (no stale snapshot).
  - Optional password protection is available.
- **Priority:** P1
- **Depends on:** US-E2-10
- **Maps to FR:** FR-2.10

### US-E2-13 — View-level filtering and saved filters

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want reusable saved filters (e.g., "My Work", "Blocked"), so that I land on the right subset without reconfiguring each visit.
- **Acceptance Criteria:**
  - When I build a filter, then I can save it independently of a view.
  - Saved filters are applicable across List/Board/Table views.
  - A filter can combine field, assignee, label, and date conditions with AND/OR.
  - I can pin a saved filter as my default landing filter.
  - Deleting a saved filter does not delete the underlying tasks.
- **Priority:** P0
- **Depends on:** US-E2-01
- **Maps to FR:** FR-2.1

### US-E2-14 — Inline view creation from any List

- **Persona:** All users
- **Story:** As a user, I want to create any view type (List/Board/Table/Calendar/Timeline/Dashboard) from any List, so that I can switch altitude without duplicating data.
- **Acceptance Criteria:**
  - When I add a view to a List, then all view types are offered.
  - Each view reads from the same underlying tasks (single source of truth).
  - Creating a view does not copy or fork task data.
  - I can reorder and rename views in the List's tab bar.
  - Views are permissioned the same as the List they belong to.
- **Priority:** P0
- **Depends on:** US-E2-01, US-E2-02, US-E2-03, US-E2-04, US-E2-05, US-E2-06
- **Maps to FR:** FR-2.1

### US-E2-15 — Goal/OKR rollup board

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want a board that rolls up Goals/OKRs and their linked tasks, so that strategic alignment is visible at a glance.
- **Acceptance Criteria:**
  - When I open the Goal board, then each Goal card shows rolled-up progress (see US-E1-11).
  - I can group goals by cycle, team, or owner.
  - Drilling into a Goal shows its contributing tasks and sub-goals.
  - Progress updates live as linked tasks change status.
  - The board filters by date/owner like other views.
- **Priority:** P1
- **Depends on:** US-E1-11, US-E2-02
- **Maps to FR:** FR-2.11

---

## 4. E3: Real-time Collaboration & Docs (10 stories, P0)

### US-E3-01 — Real-time collaborative rich text editor

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want a real-time collaborative rich text editor, so that my RFC can be edited by others without clobbering my changes.
- **Acceptance Criteria:**
  - When two people edit the same doc, then changes merge via CRDT with no lost edits.
  - I see the live cursors/presence of other editors.
  - Rich formatting (headings, lists, code, tables) is supported.
  - Edits sync with <100ms p95 latency (see NFR §6.1).
  - Disconnected edits reconcile on reconnect (offline-first).
- **Priority:** P0
- **Depends on:** None
- **Maps to FR:** FR-3.1

### US-E3-02 — Documents as first-class entities

- **Persona:** Priya
- **Story:** As a Product Manager, I want Documents to be first-class entities that can nest in tasks, folders, or stand alone, so that specs live with the work they describe.
- **Acceptance Criteria:**
  - When I create a doc, then I can place it in a Folder, List, Task, or as standalone.
  - A doc nested in a task is reachable from the task and the folder tree.
  - Moving a doc preserves its links and backlinks.
  - Docs appear in search and the activity log like other entities.
  - Permissions on a nested doc inherit from its parent unless overridden (see US-E3-09).
- **Priority:** P0
- **Depends on:** US-E1-01
- **Maps to FR:** FR-3.2

### US-E3-03 — Bidirectional links and backlinks

- **Persona:** Priya
- **Story:** As a Product Manager, I want bidirectional wiki-links ([[...]]), a backlinks graph, and transclusion, so that my spec and backlog stay one conversation.
- **Acceptance Criteria:**
  - When I add `[[Doc Name]]`, then it creates a link and the target shows a backlink.
  - A backlinks panel lists every doc referencing the current one.
  - Transclusion (`![[Doc]]`) embeds live content from another doc.
  - Renaming a doc updates all inbound links.
  - Orphaned links surface a clear "create or fix" prompt.
- **Priority:** P0
- **Depends on:** US-E3-02
- **Maps to FR:** FR-3.3

### US-E3-04 — Document templates with variables

- **Persona:** Alex
- **Story:** As a Design Lead, I want document templates with variables, so that handoff and design-system docs keep consistent structure.
- **Acceptance Criteria:**
  - When I save a doc as a template, then its blocks and `{{variables}}` are captured.
  - Instantiating a template prompts for variable values and substitutes them.
  - Templates are reusable across the workspace.
  - A template gallery is browsable from the new-doc menu.
  - Template docs render identically to normal docs after instantiation.
- **Priority:** P0
- **Depends on:** US-E3-02
- **Maps to FR:** FR-3.4

### US-E3-05 — Inline comments, suggestions, and threads

- **Persona:** Alex
- **Story:** As a Design Lead, I want inline comments, a suggestions mode, and threads, so that review feedback is captured in the doc, not in Slack.
- **Acceptance Criteria:**
  - When I select text, then I can add an inline comment thread anchored to it.
  - Suggestions mode lets edits be proposed and accepted/rejected.
  - Inline comment threads support replies and resolution.
  - Resolved threads collapse but remain in history.
  - Inline comments notify mentioned users.
- **Priority:** P0
- **Depends on:** US-E3-01
- **Maps to FR:** FR-3.5

### US-E3-06 — Slash commands and embeds

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want slash commands (/task, /doc, @mention, /date, /emoji, /code, /embed), so that I can do everything from the keyboard without menus.
- **Acceptance Criteria:**
  - When I type `/`, then a command menu offers task/doc/date/emoji/code/embed inserts.
  - `/task` creates a linked task inline from the doc.
  - `@mention` references a user with notification.
  - `/embed` inserts a Figma/link/iframe embed.
  - `/code` inserts a formatted code block.
- **Priority:** P0
- **Depends on:** US-E3-01
- **Maps to FR:** FR-3.6

### US-E3-07 — Document version history and restore

- **Persona:** Alex
- **Story:** As a Design Lead, I want version history with diff view and restore, so that design-system changes are auditable and reversible.
- **Acceptance Criteria:**
  - When a doc changes, then a version snapshot is recorded automatically.
  - I can open a diff between any two versions.
  - I can restore a previous version, which itself becomes a new version.
  - Version list shows author and timestamp.
  - Restore does not destroy the current version's history.
- **Priority:** P0
- **Depends on:** US-E3-01
- **Maps to FR:** FR-3.7

### US-E3-08 — Document export (PDF/MD/HTML/Notion)

- **Persona:** Priya
- **Story:** As a Product Manager, I want to export docs to PDF, MD, HTML, and Notion format and print to PDF, so that specs travel wherever stakeholders are.
- **Acceptance Criteria:**
  - When I export, then I can choose PDF, Markdown, HTML, or Notion export.
  - Exported Markdown preserves headings, lists, code, and links.
  - Print-to-PDF renders the doc cleanly with no editor chrome.
  - Embedded content is included or clearly referenced in export.
  - Export respects the doc's current published state.
- **Priority:** P1
- **Depends on:** US-E3-02
- **Maps to FR:** FR-3.8

### US-E3-09 — Document permissions

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want per-document permissions (view/comment/edit/admin), so that sensitive strategy docs aren't editable by everyone.
- **Acceptance Criteria:**
  - When I set doc permissions, then I can assign view/comment/edit/admin per user or group.
  - A user without edit rights cannot modify the doc.
  - Comment-only users can add inline comments but not change content.
  - Permissions override workspace defaults when explicitly set.
  - Admin rights include the ability to change permissions.
- **Priority:** P1
- **Depends on:** US-E3-02
- **Maps to FR:** FR-3.9

### US-E3-10 — Published docs (public link)

- **Persona:** Casey
- **Story:** As an Agency PM, I want to publish docs via a public link with password and SEO/custom-domain options, so that clients get a branded, self-serve status page.
- **Acceptance Criteria:**
  - When I publish a doc, then a public URL is generated.
  - I can require a password to view the published doc.
  - SEO metadata (title/description) is configurable.
  - Custom domain is supported where entitled (see US-E6-12).
  - Unpublishing immediately revokes public access.
- **Priority:** P2
- **Depends on:** US-E3-08
- **Maps to FR:** FR-3.10

---

## 5. E4: Native Automation Engine (18 stories, P0)

### US-E4-01 — Visual no-code automation builder

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want a visual no-code builder (trigger → condition → action), so that I can set up a blocked-task alert without engineering help.
- **Acceptance Criteria:**
  - When I open the builder, then I can add a trigger, one or more conditions, and actions in a linear flow.
  - Each step shows its configuration form inline.
  - I can reorder and delete steps.
  - The builder validates the flow before save (no dangling steps).
  - A saved automation can be toggled on/off.
- **Priority:** P0
- **Depends on:** US-E1-01
- **Maps to FR:** FR-4.1

### US-E4-02 — Native trigger library (50+)

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want 50+ native triggers (task created, status changed, comment added, date, webhook, schedule, AI trigger), so that any event I care about can start a workflow.
- **Acceptance Criteria:**
  - When I pick a trigger, then at least 50 trigger types are available.
  - Trigger types include task/comment/date/schedule/webhook/AI categories.
  - Each trigger exposes its event payload fields to later steps.
  - A trigger can be tested to emit a sample payload.
  - Triggers fire reliably on the defined event.
- **Priority:** P0
- **Depends on:** US-E4-01
- **Maps to FR:** FR-4.2

### US-E4-03 — Native action library (50+)

- **Persona:** Casey
- **Story:** As an Agency PM, I want 50+ native actions (create task, update field, comment, notify, webhook, AI action, create doc, move), so that I can assemble client-status and billing workflows end to end.
- **Acceptance Criteria:**
  - When I add an action, then at least 50 action types are available.
  - Actions include create/update/comment/notify/webhook/AI/doc/move categories.
  - An action can reference trigger/condition output via variables.
  - Action failures surface in run history (see US-E4-09).
  - Actions respect the acting user's permissions.
- **Priority:** P0
- **Depends on:** US-E4-01
- **Maps to FR:** FR-4.3

### US-E4-04 — Conditions and branching

- **Persona:** Priya
- **Story:** As a Product Manager, I want conditions (if/else, filters, field matching, formulas, AI classification), so that grooming rules only fire when they should.
- **Acceptance Criteria:**
  - When I add a condition, then I can match on field values and filters.
  - if/else branching routes the flow on a true/false outcome.
  - Formulas and AI classification are usable as condition inputs.
  - A condition can reference upstream step outputs.
  - Failing a condition stops or branches the flow as configured.
- **Priority:** P0
- **Depends on:** US-E4-02
- **Maps to FR:** FR-4.4

### US-E4-05 — Loops, batch, delay, and retry

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want loops (for each), batch operations, delay/wait, and retry logic, so that recurring chores and bulk updates run correctly.
- **Acceptance Criteria:**
  - When I add a loop, then it iterates "for each" item in a collection.
  - A delay/wait step pauses execution for a set duration.
  - Failed steps retry per a configured policy (count/backoff).
  - Batch operations act on multiple items atomically where possible.
  - Loop iteration count is bounded to prevent runaway execution.
- **Priority:** P0
- **Depends on:** US-E4-03
- **Maps to FR:** FR-4.5

### US-E4-06 — Automation versioning and rollback

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want automation versioning with draft/published states, rollback, and a change log, so that I can iterate safely.
- **Acceptance Criteria:**
  - When I edit a published automation, then changes save as a new draft until published.
  - Publishing creates a versioned snapshot with a change log.
  - I can roll back to any previous published version.
  - The change log records author and timestamp per version.
  - Only published versions execute.
- **Priority:** P0
- **Depends on:** US-E4-01
- **Maps to FR:** FR-4.6

### US-E4-07 — Automation templates library (50+)

- **Persona:** Alex
- **Story:** As a Design Lead, I want a 50+ template library (e.g., review routing), so that I start from a proven workflow instead of a blank canvas.
- **Acceptance Criteria:**
  - When I browse templates, then at least 50 pre-built automations are available.
  - Installing a template creates an editable draft in my workspace.
  - Templates are categorized by use case (PM, eng, design, agency).
  - Template variables map to my workspace's fields on install.
  - I can contribute a template back to the library (marketplace later, US-E4-12).
- **Priority:** P0
- **Depends on:** US-E4-01
- **Maps to FR:** FR-4.7

### US-E4-08 — AI-assisted automation builder

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want to describe a workflow in plain English and have it generated, so that I only use automations I can describe simply.
- **Acceptance Criteria:**
  - When I describe a workflow in natural language, then a draft automation is generated.
  - The generated flow shows trigger/conditions/actions I can review.
  - I can edit the generated steps before publishing.
  - Ambiguous descriptions prompt for clarification.
  - Generation respects available triggers/actions only.
- **Priority:** P1
- **Depends on:** US-E4-01, US-E5-10
- **Maps to FR:** FR-4.8

### US-E4-09 — Run history, debugging, and replay

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want run history with debugging, replay, logs, and error notifications, so that I can trust automations are actually running.
- **Acceptance Criteria:**
  - When an automation runs, then an execution record with steps and logs is stored.
  - I can replay a past run against current data.
  - Failed runs send an error notification to the owner.
  - Logs show input/output per step for debugging.
  - I can filter run history by automation, status, and date.
- **Priority:** P0
- **Depends on:** US-E4-01
- **Maps to FR:** FR-4.9

### US-E4-10 — Rate limiting and execution limits

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want rate limiting, concurrency control, and per-plan execution limits, so that one workspace can't starve others or blow the bill.
- **Acceptance Criteria:**
  - When executions exceed plan limits, then further runs are queued or rejected per policy.
  - Concurrency is capped per workspace/automation.
  - Limits are configurable per subscription tier (see E9).
  - Exceeding limits notifies the workspace admin.
  - Rate limiting is enforced at the gateway (see PRD §9.1).
- **Priority:** P1
- **Depends on:** US-E4-01, US-E9-01
- **Maps to FR:** FR-4.10

### US-E4-11 — Webhook receiver with HMAC verification

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want a public webhook receiver with HMAC verification, so that external systems can trigger Sprintio workflows securely.
- **Acceptance Criteria:**
  - When I create a webhook receiver, then a public endpoint URL is generated.
  - Incoming requests are verified against a signing secret (HMAC).
  - Unverified requests are rejected (401).
  - The receiver can act as a trigger in the builder (see US-E4-02).
  - I can rotate the signing secret without downtime.
- **Priority:** P1
- **Depends on:** US-E4-02
- **Maps to FR:** FR-4.11

### US-E4-12 — Automation marketplace

- **Persona:** Alex
- **Story:** As a Design Lead, I want an automation marketplace to share, install, and rate workflows, so that good patterns spread across the org.
- **Acceptance Criteria:**
  - When I publish an automation, then it appears in the marketplace for eligible users.
  - I can install a marketplace automation into my workspace.
  - Users can rate and review installed automations.
  - Marketplace installs respect field-mapping on install (see US-E4-07).
  - Private/unlisted sharing is supported for internal distribution.
- **Priority:** P2
- **Depends on:** US-E4-07
- **Maps to FR:** FR-4.12

### US-E4-13 — Stale-task nudge automation

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want a stale-task nudge automation, so that blocked or idle tickets surface without me hunting for them.
- **Acceptance Criteria:**
  - When a task is untouched beyond a configurable threshold, then a nudge is sent to the assignee and EM.
  - Threshold and message are configurable per automation.
  - Nudges do not fire on completed/archived tasks.
  - The trigger uses the activity log to compute "last touched" (see US-E1-06).
  - Nudge spam is throttled per task.
- **Priority:** P0
- **Depends on:** US-E4-02, US-E1-06
- **Maps to FR:** FR-4.2

### US-E4-14 — Auto-assign reviewers on status change

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want an automation that auto-assigns reviewers when a task enters "In Review", so that review routing is automatic.
- **Acceptance Criteria:**
  - When a task moves to "In Review", then reviewers are assigned per rules.
  - Assignment rules can use round-robin or workload (see US-E2-07).
  - The assigned reviewer is notified.
  - Rules respect user availability/permissions.
  - The automation is configurable per Space/List.
- **Priority:** P0
- **Depends on:** US-E4-03
- **Maps to FR:** FR-4.3

### US-E4-15 — Blocked-by alerting

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want blocked-by alerting, so that dependencies breaking is known the moment it happens.
- **Acceptance Criteria:**
  - When a task becomes blocked by another, then the assignee and EM are alerted.
  - When the blocker resolves, then a clearance notice is sent.
  - Alerts reference both tasks with deep links.
  - Alerts respect notification preferences.
  - The rule uses task dependency data (see US-E1-03).
- **Priority:** P0
- **Depends on:** US-E4-03, US-E1-03
- **Maps to FR:** FR-4.3

### US-E4-16 — Doc-from-template on event

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want an automation that creates a doc from a template when an event fires, so that RFCs and runbooks are scaffolded automatically.
- **Acceptance Criteria:**
  - When a trigger fires (e.g., task created with label "rfc"), then a doc is created from a chosen template.
  - The new doc links to the triggering task.
  - Template variables substitute from task fields.
  - The doc is placed per configuration (Folder/List/Task).
  - Creation is logged in the activity trail (see US-E1-06).
- **Priority:** P0
- **Depends on:** US-E4-03, US-E3-04
- **Maps to FR:** FR-4.3

### US-E4-17 — Time-entry reminder automation

- **Persona:** Casey
- **Story:** As an Agency PM, I want time-entry reminder automations, so that consultants never forget their timesheets.
- **Acceptance Criteria:**
  - When a user has no time entry by a daily cutoff, then a reminder is sent.
  - Reminders are configurable by schedule and audience.
  - The automation reads time-tracking data (see US-E1-10).
  - Reminders stop once an entry is logged.
  - Reminder volume is throttled per user/day.
- **Priority:** P1
- **Depends on:** US-E4-02, US-E1-10
- **Maps to FR:** FR-4.2

### US-E4-18 — SLA / budget alert automation

- **Persona:** Casey
- **Story:** As an Agency PM, I want SLA/budget alert automations, so that overruns are caught at 80% burn, not at month-end.
- **Acceptance Criteria:**
  - When tracked time or spend crosses a threshold (e.g., 80% of budget), then an alert fires.
  - Threshold and recipients are configurable per project/engagement.
  - The automation reads budget and time-report data (see US-E1-10).
  - Alerts include current burn vs budget.
  - Re-alerts are throttled until the next threshold band.
- **Priority:** P1
- **Depends on:** US-E4-04, US-E1-10
- **Maps to FR:** FR-4.4

---

## 6. E5: AI Copilot & Intelligence (15 stories, P1)

### US-E5-01 — Natural language task creation

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want to create tasks in natural language ("redesign dashboard, assign Alex, due Friday, high priority"), so that capturing work is one sentence, not a form.
- **Acceptance Criteria:**
  - When I type a natural-language command, then a task is created with parsed assignee, due date, and priority.
  - Unrecognized entities prompt for clarification rather than guessing silently.
  - The created task links to the conversation/source if applicable.
  - Parsing handles relative dates ("Friday", "next sprint").
  - The action is reversible/visible in the activity log.
- **Priority:** P0
- **Depends on:** US-E1-01
- **Maps to FR:** FR-5.1

### US-E5-02 — Smart task triage

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want smart triage that auto-categorizes and suggests assignee, priority, labels, and sprint, so that incoming bugs land in the right place.
- **Acceptance Criteria:**
  - When a task is created, then AI suggests category, assignee, priority, labels, and sprint.
  - Suggestions are editable before acceptance.
  - Triage learns from historical assignment patterns.
  - Low-confidence suggestions are flagged for human review.
  - Accepted triage updates the task and logs the change.
- **Priority:** P0
- **Depends on:** US-E5-01
- **Maps to FR:** FR-5.2

### US-E5-03 — Smart summaries

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want smart summaries (task thread, doc, sprint, weekly digest), so that reporting up takes minutes, not afternoons.
- **Acceptance Criteria:**
  - When I request a summary, then AI summarizes the selected scope (thread/doc/sprint/week).
  - Sprint and weekly summaries aggregate completed vs slipped work.
  - Summaries cite the source tasks/docs they draw from.
  - I can regenerate or adjust the summary length/tone.
  - Summaries are copyable and shareable.
- **Priority:** P0
- **Depends on:** US-E3-01, US-E1-06
- **Maps to FR:** FR-5.3

### US-E5-04 — AI writing assistant

- **Persona:** Priya
- **Story:** As a Product Manager, I want an AI writing assistant (continue, summarize, rewrite tone, translate, fix grammar), so that specs read cleanly without a separate tool.
- **Acceptance Criteria:**
  - When I invoke the assistant on selected text, then it can continue/summarize/rewrite/translate/fix grammar.
  - Rewrites preserve meaning and offer a diff to accept/reject.
  - Tone can be specified (e.g., client-friendly, technical).
  - Translation targets a chosen language from the i18n set.
  - The assistant is available in task descriptions and docs.
- **Priority:** P0
- **Depends on:** US-E1-04, US-E3-01
- **Maps to FR:** FR-5.4

### US-E5-05 — Smart semantic search

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want semantic search across tasks, docs, comments, and code, so that I find the RFC I half-remember without exact keywords.
- **Acceptance Criteria:**
  - When I search, then results rank by semantic relevance, not just keyword match.
  - Search covers tasks, docs, comments, and attached code/embeds.
  - Results return in <300ms p95 (see NFR §6.1).
  - Each result links to its source with a relevance snippet.
  - Search respects the user's permissions.
- **Priority:** P1
- **Depends on:** US-E3-02
- **Maps to FR:** FR-5.5

### US-E5-06 — Capacity planning & velocity forecasting

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want AI-powered capacity planning and velocity forecasting, so that the roadmap is sanity-checked against reality.
- **Acceptance Criteria:**
  - When I open forecasting, then AI projects velocity from historical completion data.
  - Capacity is planned against roadmap load per team.
  - Forecasts show confidence ranges, not single points.
  - Output feeds the Workload/Capacity view (see US-E2-07).
  - Forecasts update as new data arrives.
- **Priority:** P1
- **Depends on:** US-E2-07
- **Maps to FR:** FR-5.6

### US-E5-07 — Risk detection

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want AI risk detection (stalled tasks, scope creep, overallocation, dependency risks), so that I know by Monday which commitment will break.
- **Acceptance Criteria:**
  - When risks are computed, then stalled, scope-crept, overallocated, and dependency-risk items are flagged.
  - Each risk carries a reason and supporting evidence.
  - Risks surface in the Portfolio and Dashboard views.
  - Risk flags update as task state changes.
  - I can dismiss or acknowledge a risk with a note.
- **Priority:** P1
- **Depends on:** US-E2-11, US-E1-03
- **Maps to FR:** FR-5.7

### US-E5-08 — Automated standup summaries

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want automated standup summaries, so that standup is a 10-minute confirmation, not a status interrogation.
- **Acceptance Criteria:**
  - When standup runs, then AI summarizes yesterday/today/blockers per person from activity.
  - The summary aggregates each member's completed and in-progress work.
  - Blockers are explicitly called out.
  - The summary is deliverable to a channel/docs.
  - Members can correct the summary before broadcast.
- **Priority:** P1
- **Depends on:** US-E5-03, US-E1-06
- **Maps to FR:** FR-5.8

### US-E5-09 — Release notes generator

- **Persona:** Priya
- **Story:** As a Product Manager, I want release notes generated from completed tasks, so that I stop being the release-notes secretary.
- **Acceptance Criteria:**
  - When I generate release notes, then AI drafts them from completed tasks in a range.
  - Notes group changes by type (feature, fix, improvement).
  - I can edit and re-group before publishing.
  - Notes cite the source tasks.
  - Output exports to doc/MD (see US-E3-08).
- **Priority:** P1
- **Depends on:** US-E5-03, US-E3-08
- **Maps to FR:** FR-5.9

### US-E5-10 — AI automation builder (NL → workflow)

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want to describe a workflow in plain English and get a generated automation, so that I only use automations I can describe simply.
- **Acceptance Criteria:**
  - When I describe a workflow, then AI proposes a trigger/condition/action flow.
  - The proposal maps to available native triggers/actions only.
  - I can review and edit steps before saving as a draft automation.
  - Ambiguity prompts clarification.
  - The generated automation is editable in the visual builder (US-E4-01).
- **Priority:** P1
- **Depends on:** US-E4-01
- **Maps to FR:** FR-5.10

### US-E5-11 — Smart duplicate detection & merge

- **Persona:** Priya
- **Story:** As a Product Manager, I want smart duplicate detection and merge suggestions, so that the backlog stays under 5% duplicates.
- **Acceptance Criteria:**
  - When I run duplicate detection, then near-identical tasks are clustered with a confidence score.
  - I can merge selected duplicates, choosing the surviving task.
  - Merging preserves comments, attachments, and links on the survivor.
  - Detection runs on demand and can be scheduled.
  - False-positive rate is low enough to trust the suggestions.
- **Priority:** P1
- **Depends on:** US-E1-01
- **Maps to FR:** FR-5.11

### US-E5-12 — Context-aware Q&A

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want context-aware Q&A ("What's blocking the login refactor?"), so that I get a defensible answer without building a slide.
- **Acceptance Criteria:**
  - When I ask a question, then AI answers from workspace tasks/docs/activity.
  - Answers cite the specific tasks/docs they rely on.
  - The assistant respects my permissions on cited data.
  - Unanswerable questions say so rather than hallucinate.
  - Answers are grounded in current data (no stale cache).
- **Priority:** P2
- **Depends on:** US-E5-05
- **Maps to FR:** FR-5.12

### US-E5-13 — Custom AI instructions per workspace

- **Persona:** Priya
- **Story:** As a Product Manager, I want custom AI instructions per workspace (tone, terminology, workflows), so that the copilot writes like our team, not a generic bot.
- **Acceptance Criteria:**
  - When I set workspace AI instructions, then all copilot outputs follow them.
  - Instructions cover tone, preferred terminology, and workflow conventions.
  - Instructions are editable by workspace admins.
  - Changes apply to future generations without retro-editing history.
  - Instructions are scoped to the workspace, not global.
- **Priority:** P1
- **Depends on:** US-E5-01
- **Maps to FR:** FR-5.13

### US-E5-14 — Bring Your Own Key (BYOK)

- **Persona:** Jordan
- **Story:** As a VP Engineering/CTO, I want BYOK for enterprise, so that AI usage runs on our own model contract and keys.
- **Acceptance Criteria:**
  - When BYOK is enabled, then AI calls use the customer-provided key/model.
  - Workspace AI features function identically under BYOK.
  - Keys are stored encrypted and never logged.
  - Billing for AI credits is bypassed when BYOK is active (see US-E9-03).
  - Only entitled (Enterprise) workspaces can enable BYOK.
- **Priority:** P2
- **Depends on:** US-E9-07
- **Maps to FR:** FR-5.14

### US-E5-15 — AI usage analytics & cost controls

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want AI usage analytics and cost controls per workspace, so that AI spend stays predictable.
- **Acceptance Criteria:**
  - When AI features are used, then usage (requests, tokens, credits) is tracked per workspace.
- **Acceptance Criteria (continued):**
  - I can set per-workspace spend/credit caps.
  - A dashboard shows usage trends and top consumers.
  - Approaching-limit alerts fire before overage.
  - Analytics respect the workspace's data boundaries.
- **Priority:** P1
- **Depends on:** — (analytics is foundational; credits/billing builds on this)
- **Maps to FR:** FR-5.15

---

## 7. E6: Team & Workspace Management (12 stories, P0)

### US-E6-01 — Multi-workspace support

- **Persona:** Casey
- **Story:** As an Agency PM, I want multiple workspaces (personal + team/client), so that I can separate contexts without mixing data.
- **Acceptance Criteria:**
  - When I create a workspace, then it is isolated with its own members, billing, and settings.
  - I can switch between workspaces from a unified switcher.
  - A personal workspace exists by default for every user.
  - Data does not leak across workspace boundaries.
  - I can be a member of multiple workspaces simultaneously.
- **Priority:** P0
- **Depends on:** None
- **Maps to FR:** FR-6.1

### US-E6-02 — Role model (Owner/Admin/Member/Guest/Viewer)

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want roles (Owner, Admin, Member, Guest, Viewer), so that access matches responsibility without custom setup.
- **Acceptance Criteria:**
  - When I invite a user, then I assign one of Owner/Admin/Member/Guest/Viewer.
  - Each role has a defined, enforced permission set.
  - Viewers cannot edit; Guests are scoped to assigned resources.
  - Only Owners/Admins can manage members and settings.
  - Custom roles are available where entitled (P1, see US-E8-04).
- **Priority:** P0
- **Depends on:** US-E6-01
- **Maps to FR:** FR-6.2

### US-E6-03 — Teams & user groups

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want teams and nested user groups with team-level permissions, so that I can assign and notify by squad, not by individual.
- **Acceptance Criteria:**
  - When I create a team, then I can add members and nest sub-groups.
  - Team-level permissions apply to all members.
  - I can @mention and assign a whole team at once.
  - Removing a user from a team revokes team-scoped access.
  - Teams are usable as automation targets (see E4).
- **Priority:** P0
- **Depends on:** US-E6-02
- **Maps to FR:** FR-6.3

### US-E6-04 — Guest access (scoped & time-limited)

- **Persona:** Casey
- **Story:** As an Agency PM, I want scoped, time-limited guest access (task/list/folder level), so that clients see their project without a full seat.
- **Acceptance Criteria:**
  - When I invite a guest, then I scope access to task/list/folder level.
  - I can set an expiry date after which access auto-revokes.
  - Guests cannot see resources outside their scope.
  - Guests can be assigned a Guest role only.
  - I can extend or revoke guest access at any time.
- **Priority:** P0
- **Depends on:** US-E6-02
- **Maps to FR:** FR-6.4

### US-E6-05 — SSO (SAML/OIDC) & SCIM provisioning

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want SSO (SAML 2.0, OIDC) and SCIM 2.0 provisioning, so that joiners/leavers are managed from our IdP.
- **Acceptance Criteria:**
  - When SSO is configured, then members log in via the IdP (no password).
  - SCIM provisions/deprovisions users from the directory automatically.
  - Group mappings sync to Sprintio teams (see US-E6-03).
  - SSO enforcement can be required for the workspace.
  - Only entitled (Enterprise/mid-market) workspaces can enable SSO.
- **Priority:** P1
- **Depends on:** US-E6-02
- **Maps to FR:** FR-6.5

### US-E6-06 — Directory sync (Okta/Azure/Google/OneLogin)

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want directory sync with Okta, Azure AD, Google Workspace, and OneLogin, so that the user base stays in lockstep with HR systems.
- **Acceptance Criteria:**
  - When directory sync is enabled, then users/groups import from the provider.
  - Changes in the directory propagate on a sync schedule.
  - Deactivated directory users lose Sprintio access.
  - Sync status and errors are visible to admins.
  - Multiple providers are configurable per workspace.
- **Priority:** P1
- **Depends on:** US-E6-05
- **Maps to FR:** FR-6.6

### US-E6-07 — Audit logs with SIEM export & streaming

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want audit logs exportable to SIEM and streamable via webhook, so that security events land in our central pipeline.
- **Acceptance Criteria:**
  - When security-relevant events occur, then they are written to the audit log.
  - I can export the log to a SIEM (Splunk/Datadog/Sentinel) via integration.
  - A webhook streams events in near real time.
  - Log export respects data-residency constraints (see US-E8-02).
  - Only admins can configure SIEM/webhook streaming.
- **Priority:** P1
- **Depends on:** US-E1-06
- **Maps to FR:** FR-6.7

### US-E6-08 — Session management, device trust & IP allowlists

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want session management, device trust, and IP allowlists, so that access is controlled beyond just a password.
- **Acceptance Criteria:**
  - When I view sessions, then I can see active sessions and revoke any of them.
  - Devices can be marked trusted; untrusted devices require step-up auth.
  - An IP allowlist restricts access to approved ranges.
  - Revoking a session terminates it immediately.
  - These controls are admin-configurable per workspace.
- **Priority:** P1
- **Depends on:** US-E6-02
- **Maps to FR:** FR-6.8

### US-E6-09 — Workspace analytics

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want workspace analytics (adoption, activity, collaboration patterns), so that I can see whether the platform is actually being used.
- **Acceptance Criteria:**
  - When I open analytics, then I see adoption, activity, and collaboration metrics.
  - Metrics break down by team and over time.
  - Data reflects real events from the activity log.
  - Analytics respect privacy/permission scopes.
  - Dashboards are exportable for leadership.
- **Priority:** P1
- **Depends on:** US-E1-06
- **Maps to FR:** FR-6.9

### US-E6-10 — Custom branding

- **Persona:** Casey
- **Story:** As an Agency PM, I want custom branding (logo, colors, domain, email templates), so that client-facing views look like my agency, not Sprintio.
- **Acceptance Criteria:**
  - When I set branding, then logo and colors apply to client portals and emails.
  - A custom domain is configurable where entitled.
  - Email templates reflect the branding.
  - Branding is per-workspace, not global.
  - Non-client areas can retain product branding per policy.
- **Priority:** P1
- **Depends on:** US-E6-04
- **Maps to FR:** FR-6.10

### US-E6-11 — Invitation & onboarding flow

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want a guided invite and onboarding flow, so that new squad members are productive on day one.
- **Acceptance Criteria:**
  - When I invite by email, then the recipient gets a branded invite to join.
  - Accepting an invite assigns the chosen role automatically.
  - New users see a getting-started checklist on first login.
  - Invites expire if not accepted within a configurable window.
  - Bulk invite via CSV is supported for teams.
- **Priority:** P0
- **Depends on:** US-E6-02
- **Maps to FR:** FR-6.2

### US-E6-12 — Custom domain for published/client views

- **Persona:** Casey
- **Story:** As an Agency PM, I want a custom domain for published docs and client portals, so that clients see a fully branded URL.
- **Acceptance Criteria:**
  - When I configure a custom domain, then published docs and portals serve from it.
  - DNS verification is required before activation.
  - SSL is provisioned automatically for the domain.
  - The domain maps to the branded workspace (see US-E6-10).
  - Removing the domain reverts links to the default host.
- **Priority:** P1
- **Depends on:** US-E6-10, US-E3-10
- **Maps to FR:** FR-6.10

---

## 8. E7: Integrations & API (12 stories, P1)

### US-E7-01 — Public REST API (OpenAPI 3.1)

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want a versioned, rate-limited public REST API (OpenAPI 3.1), so that I can script Sprintio from my own tooling.
- **Acceptance Criteria:**
  - When I call the REST API, then it conforms to a published OpenAPI 3.1 spec.
  - The API is versioned (e.g., /v1) with a deprecation policy.
  - Requests are rate-limited and return standard limit headers.
  - Auth uses the workspace API token/OAuth.
  - All core entities (tasks, docs, automations) are addressable.
- **Priority:** P1
- **Depends on:** US-E1-01
- **Maps to FR:** FR-7.1

### US-E7-02 — GraphQL API with subscriptions

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want a GraphQL API with flexible queries and real-time subscriptions, so that I fetch exactly what I need and get live updates.
- **Acceptance Criteria:**
  - When I query GraphQL, then I can select arbitrary nested fields.
  - Subscriptions push real-time changes over WebSocket.
  - The schema is introspectable and documented.
  - GraphQL respects the same permissions as REST.
  - Errors return structured, typed error payloads.
- **Priority:** P1
- **Depends on:** US-E7-01
- **Maps to FR:** FR-7.2

### US-E7-03 — Webhooks (retry, signing, filtering, logs)

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want outbound webhooks with retry, signing, filtering, and delivery logs, so that external systems stay in sync with Sprintio.
- **Acceptance Criteria:**
  - When I register a webhook, then I can filter which events it receives.
  - Payloads are signed (HMAC) for verification.
  - Failed deliveries retry with backoff.
  - A delivery log shows attempts and outcomes.
  - I can pause/resume a webhook without deleting it.
- **Priority:** P1
- **Depends on:** US-E1-06
- **Maps to FR:** FR-7.3

### US-E7-04 — Native integrations library

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want native integrations (GitHub, GitLab, Slack, Teams, Discord, Figma, Notion, Drive, Jira, Linear, etc.), so that PR state and mentions flow into tasks automatically.
- **Acceptance Criteria:**
  - When I connect an integration, then auth is handled via OAuth and scoped.
  - At least the listed providers (GitHub, GitLab, Slack, Teams, Discord, Figma, Notion, Google Drive, OneDrive, Jira, Linear, Asana, Zendesk, Intercom, HubSpot, Salesforce) are connectable.
  - A connected integration can sync events into tasks (e.g., PR → status).
  - Disconnecting revokes the integration's access.
  - Connection status is visible and manageable per workspace.
- **Priority:** P1
- **Depends on:** US-E7-01
- **Maps to FR:** FR-7.4

### US-E7-05 — OAuth 2.0 / OIDC for third-party apps

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want OAuth 2.0 / OIDC for third-party app integration, so that external apps authenticate as my workspace securely.
- **Acceptance Criteria:**
  - When a third-party app requests access, then it authenticates via OAuth 2.0/OIDC.
  - Scopes are presented to the user for consent.
  - Tokens are revocable from the workspace settings.
  - Authorization follows standard redirect flows.
  - Granted authorizations are listed and manageable.
- **Priority:** P1
- **Depends on:** US-E7-01
- **Maps to FR:** FR-7.5

### US-E7-06 — App marketplace

- **Persona:** Alex
- **Story:** As a Design Lead, I want an app marketplace to install, configure, review, and share revenue on apps, so that the ecosystem extends Sprintio.
- **Acceptance Criteria:**
  - When I browse the marketplace, then I can install and configure published apps.
  - Users can rate and review installed apps.
  - A revenue-share model is defined for paid apps.
  - Installed apps appear in workspace settings.
  - Apps use the public API/OAuth (US-E7-01, US-E7-05).
- **Priority:** P2
- **Depends on:** US-E7-04, US-E7-05
- **Maps to FR:** FR-7.6

### US-E7-07 — Embedded iFrame views

- **Persona:** Priya
- **Story:** As a Product Manager, I want to embed Sprintio views in Confluence, Notion, or websites via iFrame, so that stakeholders see live data where they already are.
- **Acceptance Criteria:**
  - When I embed a view, then an iFrame snippet is generated.
  - The embed renders the live, permission-scoped view.
  - Embed access respects the underlying view's sharing settings.
  - The embed is responsive and theme-aware.
  - I can revoke an embed token.
- **Priority:** P2
- **Depends on:** US-E2-12
- **Maps to FR:** FR-7.7

### US-E7-08 — CLI tool (collabstack CLI)

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want a `collabstack` CLI for developers, so that I can create tasks and run automations from the terminal.
- **Acceptance Criteria:**
  - When I install the CLI, then I can authenticate via API token/OAuth.
  - The CLI supports creating/updating/querying tasks.
  - The CLI can trigger automations and read run history.
  - Output is script-friendly (JSON) where useful.
  - The CLI version is independent and documented.
- **Priority:** P2
- **Depends on:** US-E7-01, US-E4-09
- **Maps to FR:** FR-7.8

### US-E7-09 — Webhooks marketplace (pre-built receivers)

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want a webhooks marketplace of pre-built receivers, so that common external integrations are one click, not custom code.
- **Acceptance Criteria:**
  - When I browse receivers, then pre-built webhook receivers are listed.
  - Installing a receiver creates a configured webhook endpoint (see US-E4-11).
  - Receivers map inbound payloads to Sprintio actions.
  - I can customize a receiver's mapping before activating.
  - Receiver health is visible in delivery logs (see US-E7-03).
- **Priority:** P2
- **Depends on:** US-E4-11, US-E7-03
- **Maps to FR:** FR-7.9

### US-E7-10 — GitHub/GitLab PR ↔ task status sync

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want PR state to flow into task status automatically, so that I never manually flip a card to "In Review".
- **Acceptance Criteria:**
  - When a linked PR is opened, then the task moves to "In Review".
  - When the PR merges, then the task moves to "Done" (per mapping).
  - Linkage is via the integration (US-E7-04) or a task field.
  - Sync failures are logged and surfaced.
  - The mapping is configurable per workspace.
- **Priority:** P1
- **Depends on:** US-E7-04
- **Maps to FR:** FR-7.4

### US-E7-11 — Slack/Teams notifications & commands

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want Slack/Teams notifications and slash commands, so that standup summaries and alerts reach the team where they chat.
- **Acceptance Criteria:**
  - When an automation or AI summary fires, then it posts to the linked channel.
  - I can run Sprintio commands from the chat slash menu.
  - Notifications respect per-user preferences.
  - Connection uses OAuth (US-E7-05) and is revocable.
  - Message content is permission-scoped (no leaked data).
- **Priority:** P1
- **Depends on:** US-E7-04, US-E5-08
- **Maps to FR:** FR-7.4

### US-E7-12 — Figma embed & design-handoff link

- **Persona:** Alex
- **Story:** As a Design Lead, I want Figma embeds and design-handoff links in tasks, so that the handoff is one click from the task, not a rebuilt artifact.
- **Acceptance Criteria:**
  - When I paste a Figma link, then it embeds live in the task/doc.
  - The embed updates when the Figma file changes.
  - I can attach a handoff doc alongside the embed (see US-E3-02).
  - Embed access respects task permissions.
  - The integration uses OAuth (US-E7-05) and is revocable.
- **Priority:** P1
- **Depends on:** US-E7-04, US-E3-02
- **Maps to FR:** FR-7.4

---

## 9. E8: Admin, Security & Compliance (10 stories, P1)

### US-E8-01 — SOC 2 Type II, GDPR, CCPA compliance

- **Persona:** Jordan
- **Story:** As a VP Engineering/CTO, I want SOC 2 Type II, GDPR, and CCPA compliance, so that my board and customers accept Sprintio as a vendor.
- **Acceptance Criteria:**
  - When audited, then controls meet SOC 2 Type II, GDPR, and CCPA requirements.
  - A compliance/trust center publishes current certifications and reports.
  - Data-subject requests (GDPR/CCPA) are supportable via defined process.
  - Compliance status is tracked and reported to customers.
  - Evidence collection is automated where possible.
- **Priority:** P1
- **Depends on:** US-E8-04
- **Maps to FR:** FR-8.1

### US-E8-02 — Data residency (US/EU/AU)

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want data residency options (US, EU, AU), so that my data stays in the region my regulators require.
- **Acceptance Criteria:**
  - When a workspace selects a region, then its data is stored there.
  - Region is chosen at workspace creation and changeable per policy.
  - Cross-region data movement is prevented for the workspace.
  - Audit/SIEM export respects the region (see US-E6-07).
  - Region availability is shown before selection.
- **Priority:** P1
- **Depends on:** US-E6-01
- **Maps to FR:** FR-8.2

### US-E8-03 — Encryption at rest and in transit (+ CMK)

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want encryption at rest (AES-256) and in transit (TLS 1.3), plus customer-managed keys, so that data is protected and I control the keys.
- **Acceptance Criteria:**
  - When data is stored, then it is encrypted at rest with AES-256.
  - All transport uses TLS 1.3.
  - Enterprise workspaces can supply customer-managed keys (CMK).
  - Key rotation is supported without data loss.
  - Encryption status is verifiable/auditable.
- **Priority:** P0
- **Depends on:** None
- **Maps to FR:** FR-8.3

### US-E8-04 — Fine-grained permissions (resource & field level)

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want fine-grained, resource-level (and field-level) permissions, so that sensitive fields aren't visible to everyone.
- **Acceptance Criteria:**
  - When a permission rule is set, then it enforces access at the resource level.
  - Field-level permissions hide/disable specific fields for scoped roles.
  - Permissions compose with roles (US-E6-02) and teams (US-E6-03).
  - Denied access returns no data for the field/resource.
  - Permission changes are audited (see US-E1-06).
- **Priority:** P0
- **Depends on:** US-E6-02
- **Maps to FR:** FR-8.4

### US-E8-05 — Audit log API & SIEM integration

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want an audit-log API with SIEM integration (Splunk, Datadog, Sentinel), so that security events flow to our stack.
- **Acceptance Criteria:**
  - When I query the audit-log API, then I receive structured, filterable events.
  - SIEM integrations push events to Splunk/Datadog/Sentinel.
  - API access requires admin entitlement and is rate-limited.
  - Events are complete (actor, action, target, timestamp).
  - Integration health is monitored.
- **Priority:** P1
- **Depends on:** US-E1-06, US-E6-07
- **Maps to FR:** FR-8.5

### US-E8-06 — Data loss prevention (DLP) & watermarking

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want DLP rules and watermarking, so that sensitive content doesn't leave the workspace uncontrolled.
- **Acceptance Criteria:**
  - When DLP rules are configured, then policy violations are blocked or flagged.
  - Watermarking marks exported/shared documents with user identity.
  - Rules are scoped per workspace/resource.
  - Violations are logged to the audit trail.
  - DLP is admin-configurable and reportable.
- **Priority:** P2
- **Depends on:** US-E8-04, US-E3-08
- **Maps to FR:** FR-8.6

### US-E8-07 — Vulnerability management, pen testing & bug bounty

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want vulnerability management, penetration testing, and a bug bounty, so that the platform is continuously hardened.
- **Acceptance Criteria:**
  - When a vulnerability is found, then it enters a tracked remediation workflow.
  - Periodic penetration tests are conducted and documented.
  - A bug-bounty program accepts and triages external reports.
  - Remediation SLAs match severity.
  - Results feed the compliance evidence (US-E8-01).
- **Priority:** P1
- **Depends on:** US-E8-01
- **Maps to FR:** FR-8.7

### US-E8-08 — Backup & disaster recovery (RPO/RTO)

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want backup and disaster recovery with RPO < 1hr and RTO < 4hr, so that a failure doesn't lose my team's work.
- **Acceptance Criteria:**
  - When a backup runs, then recovery point objective is under 1 hour.
  - A full recovery completes within 4 hours (RTO).
  - Backups are encrypted and tested via restore drills.
  - Recovery is documented and rehearsed on a schedule.
  - Backup coverage includes all core entities and docs.
- **Priority:** P1
- **Depends on:** US-E8-03
- **Maps to FR:** FR-8.8

### US-E8-09 — Legal hold & e-discovery export

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want legal hold and e-discovery export, so that we can respond to legal requests without scrambling.
- **Acceptance Criteria:**
  - When legal hold is applied, then targeted data is preserved immutably.
  - An e-discovery export gathers held data into a reviewable package.
  - Hold scope is definable by workspace/entity/date.
  - Holds are auditable and removable when released.
  - Export respects region constraints (US-E8-02).
- **Priority:** P2
- **Depends on:** US-E1-06, US-E8-02
- **Maps to FR:** FR-8.9

### US-E8-10 — Accessibility (WCAG 2.1 AA)

- **Persona:** All users
- **Story:** As a user, I want the product to meet WCAG 2.1 AA, so that it's usable by everyone including assistive-tech users.
- **Acceptance Criteria:**
  - When navigating the app, then full keyboard navigation is supported.
  - Screen readers announce structure and state correctly.
  - High-contrast mode and reduced-motion are available.
  - Color is never the sole carrier of meaning.
  - Core flows pass automated + manual AA audits.
- **Priority:** P1
- **Depends on:** None
- **Maps to FR:** FR-8.10

---

## 10. E9: Billing & Subscription Management (8 stories, P1)

### US-E9-01 — Tiered plans (Free/Pro/Business/Enterprise)

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want tiered plans (Free, Pro $12/u/mo, Business $24/u/mo, Enterprise custom), so that I can pick a plan that fits my team's size and needs.
- **Acceptance Criteria:**
  - When I view plans, then Free/Pro/Business/Enterprise are listed with features and prices.
  - Plan entitlements gate features (e.g., SSO, data residency).
  - Upgrading/downgrading changes entitlements immediately on billing cycle.
  - Enterprise plan pricing is quote-based (custom).
  - Plan limits are enforced consistently across the app.
- **Priority:** P0
- **Depends on:** US-E6-01
- **Maps to FR:** FR-9.1

### US-E9-02 — Per-seat pricing with volume discounts

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want per-seat pricing with volume discounts, so that scaling the team doesn't blow the budget linearly.
- **Acceptance Criteria:**
  - When seats increase, then price computes per seat with applied volume discount.
  - Discount tiers are visible at checkout.
  - Seat count changes prorate on the next invoice.
  - Removing seats takes effect at renewal (per policy).
  - The seat total matches active members (see US-E6-02).
- **Priority:** P0
- **Depends on:** US-E9-01, US-E6-02
- **Maps to FR:** FR-9.2

### US-E9-03 — Usage-based AI credits

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want usage-based AI credits (included quota + overage), so that AI spend is bounded and predictable.
- **Acceptance Criteria:**
  - When AI features are used, then credits decrement from the included quota.
  - Overage is metered and billed at the plan rate.
  - Quota and usage are visible in-app (see US-E5-15).
  - BYOK bypasses credit metering where active (US-E5-14).
  - Overage caps are enforceable per workspace.
- **Priority:** P0
- **Depends on:** US-E5-15, US-E9-01
- **Maps to FR:** FR-9.3

### US-E9-04 — Stripe Billing integration

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want Stripe Billing for subscriptions, trials, proration, and dunning, so that billing is handled by a trusted processor.
- **Acceptance Criteria:**
  - When I subscribe, then Stripe manages the subscription lifecycle.
  - Trials convert to paid automatically at term end.
  - Plan changes prorate correctly via Stripe.
  - Failed payments enter dunning with retry/notify.
  - Subscription state stays in sync with Sprintio entitlements.
- **Priority:** P0
- **Depends on:** US-E9-01, US-E9-02
- **Maps to FR:** FR-9.4

### US-E9-05 — Customer billing portal

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want a customer portal for billing history, invoices, payment methods, and plan changes, so that I self-serve without contacting sales.
- **Acceptance Criteria:**
  - When I open the portal, then I see invoices and billing history.
  - I can update payment methods securely (via Stripe).
  - I can change plans and see the prorated impact.
  - Invoices are downloadable as PDF.
  - Portal actions are reflected in entitlements immediately.
- **Priority:** P0
- **Depends on:** US-E9-04
- **Maps to FR:** FR-9.5

### US-E9-06 — Usage analytics & limit alerts

- **Persona:** Jordan
- **Story:** As a VP Engineering, I want usage analytics and alerts (approaching limits, overage warnings), so that I'm never surprised by a bill.
- **Acceptance Criteria:**
  - When usage nears a limit, then a warning is sent before overage.
  - The portal shows seat, storage, and AI-credit usage vs limits.
  - Overage events are itemized on the invoice.
  - Alerts are configurable by recipient.
  - Analytics align with AI usage analytics (US-E5-15).
- **Priority:** P1
- **Depends on:** US-E9-03, US-E9-05
- **Maps to FR:** FR-9.6

### US-E9-07 — Enterprise contracts (annual/PO/custom)

- **Persona:** Jordan
- **Story:** As a VP Engineering/CTO, I want enterprise contracts (annual, PO, custom terms, SSO enforcement), so that procurement fits our process.
- **Acceptance Criteria:**
  - When an enterprise contract is signed, then annual/PO billing is supported.
  - Custom terms are recorded against the workspace.
  - SSO can be enforced as a contract condition (see US-E6-05).
  - Invoicing follows the contracted schedule.
  - Contract state gates Enterprise-only features.
- **Priority:** P1
- **Depends on:** US-E9-01, US-E6-05
- **Maps to FR:** FR-9.7

### US-E9-08 — Partner / affiliate program

- **Persona:** Casey
- **Story:** As an Agency PM, I want a partner/affiliate program with revenue share, so that referring clients earns my agency credit.
- **Acceptance Criteria:**
  - When a referral converts, then the partner earns revenue share per terms.
  - Partners can track referrals and earnings in a portal.
  - Revenue-share rates are defined and transparent.
  - Payouts follow a defined schedule.
  - Program terms are enforceable and auditable.
- **Priority:** P2
- **Depends on:** US-E9-04
- **Maps to FR:** FR-9.8

---

## 11. E10: Mobile & Desktop Apps (8 stories, P2)

### US-E10-01 — iOS app (native, offline-first, push)

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want a native iOS app that is offline-first with push notifications, so that I can capture and check work from my phone.
- **Acceptance Criteria:**
  - When I install the iOS app, then it is a native SwiftUI app.
  - Core views work offline and sync on reconnect (CRDT).
  - Push notifications arrive for assignments and mentions.
  - The app supports authentication including SSO where entitled.
  - Offline edits reconcile without data loss.
- **Priority:** P2
- **Depends on:** US-E2-14, US-E8-06
- **Maps to FR:** FR-10.1

### US-E10-02 — Android app (native, offline-first, push)

- **Persona:** Casey
- **Story:** As an Agency PM, I want a native Android app that is offline-first with push, so that I can check client status from anywhere.
- **Acceptance Criteria:**
  - When I install the Android app, then it is a native Kotlin app.
  - Core views work offline and sync on reconnect.
  - Push notifications arrive for assignments, mentions, and budget alerts.
  - The app supports authentication including SSO where entitled.
  - Offline edits reconcile without data loss.
- **Priority:** P2
- **Depends on:** US-E2-14, US-E4-18
- **Maps to FR:** FR-10.2

### US-E10-03 — Desktop apps (macOS/Windows/Linux)

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want desktop apps for macOS, Windows, and Linux, so that Sprintio lives in its own window, not a browser tab.
- **Acceptance Criteria:**
  - When I install the desktop app, then it runs natively on macOS/Windows/Linux (Tauri).
  - The app mirrors web functionality for core workflows.
  - It supports OS notifications and auto-update.
  - It shares the same data model and real-time sync as web.
  - It respects the same permissions as web.
- **Priority:** P1
- **Depends on:** US-E2-14
- **Maps to FR:** FR-10.3

### US-E10-04 — PWA with offline & push

- **Persona:** All users
- **Story:** As a user, I want a Progressive Web App with offline support and push notifications, so that I get an installable, app-like experience from the browser.
- **Acceptance Criteria:**
  - When I install the PWA, then it is launchable from the home screen/desktop.
  - Core views work offline and sync on reconnect.
  - Push notifications work where the platform allows.
  - The PWA shares the web app's data and permissions.
  - Updates apply automatically on next launch.
- **Priority:** P1
- **Depends on:** US-E2-14
- **Maps to FR:** FR-10.4

### US-E10-05 — Mobile-optimized responsive web

- **Persona:** Casey
- **Story:** As an Agency PM, I want a mobile-optimized responsive web, so that clients and I can use Sprintio from a phone browser cleanly.
- **Acceptance Criteria:**
  - When I open the web app on a phone, then layouts adapt touch-first.
  - Core views (List/Board/Calendar/Docs) are usable on small screens.
  - Tap targets meet accessibility sizing.
  - The responsive web shares the same data as desktop.
  - No functionality is blocked solely by screen size.
- **Priority:** P1
- **Depends on:** US-E2-14, US-E8-10
- **Maps to FR:** FR-10.5

### US-E10-06 — Offline-first architecture (CRDT sync)

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want an offline-first architecture with CRDT background sync and conflict resolution, so that I can work on a plane and merge cleanly later.
- **Acceptance Criteria:**
  - When I edit offline, then changes are queued locally via CRDT.
  - On reconnect, changes sync in the background without manual push.
  - Conflicts resolve automatically via CRDT merge semantics.
  - Sync status is visible to the user.
  - No edits are lost across reconnect.
- **Priority:** P1
- **Depends on:** US-E3-01
- **Maps to FR:** FR-10.6

### US-E10-07 — Mobile quick-capture & notifications

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want mobile quick-capture (NL task creation) and notification center, so that ideas and alerts are one tap away.
- **Acceptance Criteria:**
  - When I use quick-capture, then NL task creation runs from the widget/share sheet (see US-E5-01).
  - A notification center lists assignments, mentions, and alerts.
  - Tapping a notification opens the relevant task/doc.
  - I can act (complete, comment) from the notification where supported.
  - Quick-capture works offline and syncs later (see US-E10-06).
- **Priority:** P2
- **Depends on:** US-E5-01, US-E10-01
- **Maps to FR:** FR-10.1

### US-E10-08 — Cross-device continuity

- **Persona:** Casey
- **Story:** As an Agency PM, I want cross-device continuity (pick up on desktop where I left off on mobile), so that switching devices doesn't lose my place.
- **Acceptance Criteria:**
  - When I switch devices, then my open view and draft state resume.
  - Session state syncs across web/desktop/mobile.
  - In-progress doc edits are available on the other device (see US-E3-07).
  - Last-viewed context is restored on login.
  - Continuity respects per-device session trust (see US-E6-08).
- **Priority:** P2
- **Depends on:** US-E10-03, US-E10-04, US-E10-06
- **Maps to FR:** FR-10.6

---

## 12. E11: Notifications & Onboarding (6 stories, P0)

### US-E11-01 — In-app notification center

- **Persona:** Sarah
- **Story:** As an Engineering Manager, I want an in-app notification center so that I can see all activity requiring my attention (assignments, mentions, due dates) without leaving the app.
- **Acceptance Criteria:**
  - Bell icon in global header shows unread count badge.
  - Clicking bell opens notification feed with grouped items (today, yesterday, earlier).
  - Each notification shows: actor, action, target entity, timestamp.
  - I can mark individual or all notifications as read.
  - I can filter notifications by type (assignments, mentions, due dates).
  - Unread count updates in real-time via WebSocket.
- **Priority:** P0
- **Depends on:** US-E3-05 (comments), US-E1-02 (task assignment)
- **Maps to FR:** FR-11.1

### US-E11-02 — Email notifications

- **Persona:** Marcus
- **Story:** As a Senior Engineer, I want email notifications for assignments and mentions so that I stay informed even when I'm not actively in the app.
- **Acceptance Criteria:**
  - I receive an email when assigned a task (within 60 seconds).
  - I receive an email when @mentioned in a comment (within 60 seconds).
  - I receive an email 24 hours before a task due date.
  - Emails include a direct link to the relevant entity.
  - Emails include an unsubscribe link.
- **Priority:** P0
- **Depends on:** US-E11-03
- **Maps to FR:** FR-11.2

### US-E11-03 — Notification preferences

- **Persona:** Priya
- **Story:** As a Product Manager, I want to configure my notification preferences so that I only receive notifications for events I care about, through my preferred channel.
- **Acceptance Criteria:**
  - I can toggle each event type (assignment, mention, due date, status change) independently.
  - I can choose in-app, email, or off for each event type.
  - Default settings are applied to new accounts.
  - Changes take effect immediately.
- **Priority:** P0
- **Depends on:** None
- **Maps to FR:** FR-11.3

### US-E11-04 — Workspace setup wizard

- **Persona:** Sarah
- **Story:** As an Engineering Manager creating a new workspace, I want a guided setup wizard so that I can quickly set up my workspace with the right name, team members, and initial project structure.
- **Acceptance Criteria:**
  - Wizard triggers on first workspace creation.
  - Steps: name workspace → invite members → create first project → quick tour.
  - Wizard can be skipped at any step.
  - Wizard does not appear on subsequent workspace creations.
  - If I close mid-wizard, I resume on next visit.
- **Priority:** P0
- **Depends on:** US-E1-01, US-E6-01
- **Maps to FR:** FR-11.4

### US-E11-05 — Onboarding checklist

- **Persona:** Marcus
- **Story:** As a new user, I want an onboarding checklist so that I can discover key features by completing a guided set of actions.
- **Acceptance Criteria:**
  - Checklist appears for new users on first login.
  - Items: create task, assign task, invite teammate, use board view, comment on task, create doc.
  - Items check off automatically when I complete the action.
  - I can dismiss the checklist; it does not reappear.
  - Progress is tracked for analytics.
- **Priority:** P0
- **Depends on:** US-E1-01
- **Maps to FR:** FR-11.5

### US-E11-06 — CSV task import

- **Persona:** Priya
- **Story:** As a Product Manager migrating from another tool, I want to import tasks from a CSV file so that I can bring my existing backlog into Sprintio without manual re-entry.
- **Acceptance Criteria:**
  - I can upload a CSV file up to 10MB.
  - Columns are auto-detected and I can remap them to Sprintio fields.
  - I can preview the first 5 rows before confirming import.
  - Supported fields: title, description, status, assignee, due date, labels.
  - Import shows progress for large files and a summary on completion.
  - Errors (bad dates, unknown assignees) are logged and shown in the summary.
- **Priority:** P0
- **Depends on:** US-E1-01, US-E1-02
- **Maps to FR:** FR-11.6

---

**Document Status:** Finalized  
**Next Review:** 2026-07-14  
**Owner:** Product  
**Approvers:** [whom it may concern]
