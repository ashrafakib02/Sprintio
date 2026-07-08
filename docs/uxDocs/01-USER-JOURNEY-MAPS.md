# Sprintio — User Journey Maps

> **Sprint fast. Ship together.**
> Document: 01 — User Journey Maps
> Version: 1.0 | Date: 2026-07-08
> Scope: MVP (4 personas: Sarah, Marcus, Priya, Alex)

---

## Table of Contents

1. [Journey Map Conventions](#1-journey-map-conventions)
2. [Sarah Okafor — Engineering Manager](#2-sarah-okafor--engineering-manager)
3. [Marcus Lindqvist — Senior Engineer](#3-marcus-lindqvist--senior-engineer)
4. [Priya Raman — Product Manager](#4-priya-raman--product-manager)
5. [Alex Mercer — Design Lead](#5-alex-mercer--design-lead)
6. [Shared Journey: New Workspace Onboarding](#6-shared-journey-new-workspace-onboarding)
7. [Shared Journey: AI Copilot Adoption](#7-shared-journey-ai-copilot-adoption)
8. [Journey Cross-Reference Matrix](#8-journey-cross-reference-matrix)

---

## 1. Journey Map Conventions

Each journey map follows this structure:

```
Phase:     [Name] → [Name] → [Name] → [Name] → [Name]
User Act:  What the user does at each step
System:    What Sprintio shows / does in response
Emotion:   😫 Frustrated → 😐 Neutral → 🙂 Satisfied → 😍 Delighted
Touch:     UI element / screen / interaction
Time:      Approximate time spent
Friction:  What could go wrong
Opp:       Design opportunity
```

**Emotion Scale:**
- 😫 Frustrated — blocking friction, workaround needed
- 😐 Neutral — functional but unremarkable
- 🙂 Satisfied — task completed efficiently
- 😍 Delighted — exceeded expectations, "wow" moment

---

## 2. Sarah Okafor — Engineering Manager

### Primary Journey: Sprint Planning → Execution → Summary

**Context:** Sarah manages an 8-person squad. She runs bi-weekly sprints. Her morning ritual is checking who's blocked and prepping a leadership update. She currently spends 2-3 hours/week on status reporting.

---

#### Journey 2.1 — Sprint Planning (Weekly, ~45 min)

```
Phase:       Prepare → Prioritize → Assign → Commit → Confirm
───────────── ──────── ─────────── ─────── ──────── ────────
User Act:    Review    Drag tasks    Assign     Set       Review
             backlog   to sprint     to team    sprint    board
             for next  board col     members    dates     as a
             sprint                               & scope  whole
───────────── ──────── ─────────── ─────── ──────── ────────
System:      Shows     Auto-sorts    Shows      Links     Calculates
             filtered  by priority   team      sprint    total
             backlog   + due date    capacity  to epic   story pts
             with                   badges    timeline  & warns
             velocity                                      if over
───────────── ──────── ─────────── ─────── ──────── ────────
Emotion:     😐        🙂            🙂        😐        🙂→😍
Screen:      List View Board View   Board     Board     Board
             (filter)  (drag-drop)  (assign   (date     (summary
                                    modal)    picker)   panel)
───────────── ──────── ─────────── ─────── ──────── ────────
Time:        10 min    15 min       10 min    5 min     5 min
───────────── ──────── ─────────── ─────── ──────── ────────
Friction:    Too many  Hard to see   Can't     Sprint    Manual
             items in  dependency    gauge     dates     math on
             backlog   chains on     workload  don't     capacity
                       the board               link to   (Phase 2)
                                               roadmap
───────────── ──────── ─────────── ─────── ──────── ────────
Opp:         AI        Dependency    Workload  Auto-     One-click
             suggests  lines on      badge     suggest   "Sprint
             which     board view    per       date      is ready"
             to pull   (Phase 2)     person    range     summary
```

**Key Moments:**
- **"Aha" #1:** Dragging a task from backlog to the sprint board and seeing the capacity badge update in real-time
- **"Aha" #2:** AI warns "This sprint is 15% over your team's historical velocity" — prevents overcommitment
- **Delight:** One-click sprint summary that auto-generates "Sprint 14: 34/38 pts delivered, 2 carry-forwards"

---

#### Journey 2.2 — Daily Standup Preparation (~5 min/day)

```
Phase:       Open → Scan → Identify → Act → Done
───────────── ────── ────── ────────── ──── ─────
User Act:     Open    Scan    Click on   Post   Move
              app     board   blocked    standup on
              AM      for    items,     note   with
                      red    ask in     or     day
                      flags  comment    assign
───────────── ────── ────── ────────── ──── ─────
System:       Loads   Shows   Opens      Logs   Returns
              board   task    task in    in     to
              <500ms  status  side       act.   board
                      with    panel,    log    view
                      color   posts
                      coding  comment
───────────── ────── ────── ────────── ──── ─────
Emotion:      🙂      😐→🙂   😐         🙂     🙂
Screen:       Board   Board   Task       Task   Board
              (saved  (group  Detail     Detail (saved
              view)   by                (commt view)
                      status)           tab)
───────────── ────── ────── ────────── ──── ─────
Time:         30s     2 min   1 min      1 min  30s
```

**Key Moments:**
- **"Aha":** Board loads instantly with yesterday's view preserved — no re-filtering
- **Delight:** AI summary of overnight activity: "3 tasks moved to In Review, 1 blocker reported on payments-service"

---

#### Journey 2.3 — Leadership Status Report (~20 min, was 2-3 hours)

```
Phase:       Trigger → Gather → Draft → Polish → Send
───────────── ──────── ──────── ────── ─────── ─────
User Act:     Friday   AI      Review   Add     Share
              PM,      genera  auto-    context link
              opens    tes     generated or      in
              summary  draft   summary  edit    Slack
              page                            or
                                              email
───────────── ──────── ──────── ────── ─────── ─────
System:       Shows    Pulls   Presents Copy-   Generates
              summary  from    draft    to-     shareable
              template sprint  in       clip    link +
                      data:   rich     ready   markdown
                      comps,  text              export
                      done,
                      risks,
                      carry-
                      forwards
───────────── ──────── ──────── ────── ─────── ─────
Emotion:      😐       🙂      🙂      😐      😍
Screen:       Summary  Summary Summary Summary Summary
              page     page    page    page    page +
                      (AI     (edit   (edit   share
                      loading mode)   mode)   modal)
                      state)
───────────── ──────── ──────── ────── ─────── ─────
Time:         1 min    30s     10 min  5 min   1 min
```

**Key Moments:**
- **Delight:** AI generates a polished sprint summary with velocity charts, completion rates, and risk flags — Sarah just reviews and sends
- **Before/After:** 2-3 hours manually stitching slides → 20 minutes reviewing AI draft

---

### Sarah's Emotional Arc (Full Week)

```
Mon  Tue  Wed  Thu  Fri
──────────────────────────────
😀   🙂   😐   😐   😍
│    │    │    │    │
│    │    │    │    └── Sprint summary generated in 20 min
│    │    │    └── Standup: same as yesterday, no blockers
│    │    └── Engineer unblocked, good progress
│    └── Board shows 60% done, on track
└── Sprint planning done, feels realistic
```

---

## 3. Marcus Lindqvist — Senior Engineer

### Primary Journey: "My Work" Daily Flow

**Context:** Marcus is keyboard-first. He hates context-switching. His ideal day: open one view, see exactly what to work on, update status as a byproduct of coding (via GitHub PR), and never open the PM tool unless he chooses to.

---

#### Journey 3.1 — Daily Work Selection (~2 min/day)

```
Phase:       Open → Filter → Select → Work → Update
───────────── ────── ──────── ─────── ───── ───────
User Act:     Open   Type     Pick     Code   PR
              app    "my      task     for    merged
              (PWA   work"    from     the    → auto
              or     filter   list,    day    status
              KB                                   update
              shortcut)
───────────── ────── ──────── ─────── ───── ───────
System:       Shows  Filters  Opens    N/A    Detects
              My     to       task         PR link,
              Work   tasks    detail       moves
              view   assigned panel        task to
              auto   to me,          (in   Done,
              saved  due          back)  logs
                     today,               activity
                     sorted
                     by
                     priority
───────────── ────── ──────── ─────── ───── ───────
Emotion:      🙂     😍       🙂       😐    😍
Screen:       List   List     Task     IDE   GitHub
              View   View     Detail        + Sprintio
              (My    (filter  (split                  (auto
              Work)  bar)     panel)                  update)
───────────── ────── ──────── ─────── ───── ───────
Time:         15s    15s      30s      hrs   0s
                                    (auto)
```

**Key Moments:**
- **"Aha" #1:** Keyboard shortcut `G M` (Go → My Work) instantly shows filtered tasks — no clicking through menus
- **"Aha" #2:** PR gets merged on GitHub → task automatically moves to Done → Marcus never touches Sprintio UI
- **Delight:** Status updates happen as a byproduct of actual work, not as a separate chore

---

#### Journey 3.2 — Writing an RFC Document (~30 min)

```
Phase:       Create → Write → Link → Review → Publish
───────────── ─────── ────── ────── ─────── ────────
User Act:     Cmd+K   Type    Use     Share   Mark
              "new    RFC     [[      link    as
              doc"    content wiki    in      "Ready
              or /doc in      links   Slack   for
                      editor  to      for     Review"
                      from    tasks   team
                      task            review
───────────── ─────── ────── ────── ─────── ────────
System:       Opens   Rich    Auto-   Generates Tracks
              blank   text    links   preview   status
              doc     editor  to      card in   on doc
              in      with    related Slack     (Draft
              sidebar slash   tasks   thread    → In
              panel   cmds            with      Review
                      avail           embed     → Approved)
───────────── ─────── ────── ────── ─────── ────────
Emotion:      🙂      🙂      😍      😐      🙂
Screen:       Doc     Doc     Doc     Doc +   Doc
              Editor  Editor  Editor  Slack   (status
                                      (ext)   badge)
───────────── ─────── ────── ────── ─────── ────────
Time:         30s     20 min  5 min   2 min   1 min
```

**Key Moments:**
- **Delight:** Typing `[[` shows autocomplete of all tasks and docs — bidirectional linking feels like a personal wiki
- **Delight:** Task linked to the RFC auto-shows the doc embed in its detail panel — no copy-paste

---

#### Journey 3.3 — GitHub PR ↔ Status Sync

```
Phase:       Code → PR → Link → Auto-Update → Done
───────────── ────── ──── ───── ──────────── ─────
User Act:     Push   Open  Add   (nothing)   (nothing)
              code   PR    "Fixes
              to     on    #SIO-
              branch GitHub 123"
                      repo
───────────── ────── ──── ───── ──────────── ─────
System:       N/A    N/A   Links Detects     Moves
                            PR to PR merge    task to
                            task  event       Done,
                            auto  via         adds
                            if    webhook     activity
                            commit            entry
                            msg
                            contains
                            task ID
───────────── ────── ──── ───── ──────────── ─────
Emotion:      😐     😐    🙂    😍          😍
Screen:       IDE    GH    GH    Sprintio    Sprintio
              only   PR    PR    (bg)        (bg)
              (no    form  form
              Sprintio
              needed)
───────────── ────── ──── ───── ──────────── ─────
Time:         hrs    2 min 10s   0s (auto)   0s
```

**Key Moments:**
- **Delight:** Marcus never opens Sprintio to update task status. GitHub PR merge → task done. Zero UI overhead.
- **Trust Builder:** Activity log shows "PR #456 merged → moved to Done by GitHub integration" — full audit trail without manual work

---

### Marcus's Emotional Arc (Full Day)

```
9am   10am   12pm   2pm   4pm   5pm
──────────────────────────────────────
🙂    😍     😐     😍    😐    😍
│     │      │      │     │     │
│     │      │      │     │     └── End of day: 0 status updates made manually
│     │      │      │     └── Afternoon standup: just checks board, posts comment
│     │      │      └── PR merged → task auto-completes → dopamine hit
│     │      └── Lunch: no PM tool anxiety
│     └── My Work shows exactly 3 tasks, sorted by priority
└── Keyboard shortcut gets me to work in 15 seconds
```

---

## 4. Priya Raman — Product Manager

### Primary Journey: Backlog → Spec → Status Report

**Context:** Priya owns the roadmap narrative. She writes specs that engineers execute without clarification loops. She communicates status without being a full-time broadcaster. She lives in docs and metrics.

---

#### Journey 4.1 — Backlog Grooming (~1 hr, weekly)

```
Phase:       Review → Triage → Prioritize → Link → Confirm
───────────── ─────── ─────── ─────────── ────── ────────
User Act:     Open    Review   Drag to    Link   Review
              backlog new      priority   spec   with
              view    items,   rows,      doc    team
              (Board  flag     set value  to     on
              view)   stale    & effort   each   Board
                      items    fields     epic
───────────── ─────── ─────── ─────────── ────── ────────
System:       Shows   Highlights AI        Auto-  Shows
              all     items     suggests  links  board
              tasks   with no   priority  spec   with
              in      activity  based on  to     updated
              list    in 30+    value/    epic   priorities
              view    days     effort              & linked
              (Phase 2: Table)                    status
───────────── ─────── ─────── ─────────── ────── ────────
Emotion:      😐      😐→🙂    🙂        😍     🙂
Screen:       Board   Board    Board/    Board  Board
              view    (filter  Table     (link  (overview
                      stale)   (inline   modal) panel)
                               edit)
───────────── ─────── ─────── ─────────── ────── ────────
Time:         5 min   15 min   25 min    10 min 5 min
```

**Key Moments:**
- **"Aha":** AI highlights 7 stale items Priya forgot about — prevents backlog rot
- **Delight:** Every epic in the backlog has a linked spec document — engineers can self-serve clarification
- **Friction (Phase 2):** Table view for backlog is deferred — Board view is less efficient for bulk prioritization

---

#### Journey 4.2 — Spec Writing (~45 min per feature)

```
Phase:       Create → Write → Embed → Link → Distribute
───────────── ─────── ────── ────── ────── ───────────
User Act:     Create  Write   Embed   Link   Share
              new     spec    Figma   to     spec
              doc     content embed,  tasks  via
              from    in      /task   in     link
              List    rich    cmd to  backlog
              context text    create
              menu    editor  linked
                      with    task
                      slash
                      cmds
───────────── ─────── ────── ────── ────── ───────────
System:       Opens   TipTap  Renders Engineers can
              editor  with    Figma   see spec         copy
              inline  slash   preview embedded         link
              or as   cmds   inline  in task           or
              new     avail          detail            markdown
              doc                                         export
───────────── ─────── ────── ────── ────── ───────────
Emotion:      🙂      🙂      😍      😍     🙂
Screen:       Doc     Doc     Doc     Doc +  Doc
              Editor  Editor  Editor  Task   (share
                                      Detail modal)
───────────── ─────── ────── ────── ────── ───────────
Time:         30s     30 min  5 min   5 min  1 min
```

**Key Moments:**
- **Delight:** Spec and tasks are bidirectionally linked — no more "where's the spec?" questions
- **Delight:** AI writing assistant helps rewrite acceptance criteria for clarity

---

#### Journey 4.3 — Stakeholder Status Report (~15 min, was 1+ hour)

```
Phase:       Trigger → Generate → Review → Customize → Share
───────────── ──────── ────────── ─────── ────────── ──────
User Act:     Weekly  AI auto-   Review   Add       Send
              prompt  generates  draft,   context,  to
              (or     roadmap    fix      update    stakeholders
              auto-   health     errors   timelines
              trig)   report
───────────── ──────── ────────── ─────── ────────── ──────
System:       N/A     Pulls      Rich     Editable  Shareable
                      roadmap    text     draft     link or
                      data:      draft    with      markdown
                      epics,               inline    export
                      progress,            edit
                      blockers,
                      velocity
───────────── ──────── ────────── ─────── ────────── ──────
Emotion:      😐      🙂        😐       🙂        😍
Screen:       N/A     Summary   Summary  Summary  Summary
                      page      page     page     + share
                      (loading) (view)   (edit)   modal
───────────── ──────── ────────── ─────── ────────── ──────
Time:         1 min   30s       5 min    5 min    1 min
```

---

### Priya's Emotional Arc (Full Week)

```
Mon    Tue    Wed    Thu    Fri
──────────────────────────────────
😐     🙂     😍     😐     😍
│      │      │      │      │
│      │      │      │      └── Status report: 15 min vs 1+ hour
│      │      │      └── Mid-week check: epics on track
│      │      └── Spec linked to 3 tasks, team self-serves
│      └── Backlog groomed, 7 stale items cleaned
└── Monday morning: too many tabs open (no Table view yet)
```

---

## 5. Alex Mercer — Design Lead

### Primary Journey: Design Review → Feedback → Handoff

**Context:** Alex runs design reviews, collects feedback from scattered sources, and hands off implementation-ready specs. In the MVP, Sprintio replaces the feedback-tracking and handoff parts (Figma remains the primary design tool).

---

#### Journey 5.1 — Design Review Cycle (~30 min per review)

```
Phase:       Prepare → Present → Collect → Resolve → Ship
───────────── ──────── ──────── ──────── ──────── ─────
User Act:     Link     Share    Team     Alex     Mark
              Figma    doc      comments responds  design
              embed    link     on       and      as
              in       in       doc      resolves "Ready
              Sprintio sprint   ranges   threads  for
              doc      review                          Dev"
                      meeting
───────────── ──────── ──────── ──────── ──────── ─────
System:       Embeds   Tracks   Anchors  Tracks   Updates
              Figma    doc      comment  comment  doc
              preview  access   to text  status   status
              inline   + read   ranges   (Open →  badge
                       receipt           Resolved  to
                                         → Done)   "Ready
                                                    for
                                                    Dev")
───────────── ──────── ──────── ──────── ──────── ─────
Emotion:      🙂      😐       😍       😐       😍
Screen:       Doc     Doc +    Doc      Doc      Doc
              Editor  Calendar (commt   (commt   (status
                      (meeting tabs)   tabs)    badge)
                      invite)
───────────── ──────── ──────── ──────── ──────── ─────
Time:         5 min   20 min   varies   5-10     30s
                                     min
```

**Key Moments:**
- **Delight:** Inline comments anchored to text ranges — feedback is contextual, not scattered across Slack/email
- **Delight:** Comment resolution tracking — Alex can see "3 open, 5 resolved, 12 total" at a glance
- **Friction (Phase 2):** AI comment clustering for long threads is deferred

---

#### Journey 5.2 — Handoff Spec (~20 min)

```
Phase:       Draft → Embed → Annotate → Publish → Track
───────────── ────── ────── ──────── ──────── ──────
User Act:     Write   Link    Add      Set      Link to
              impl.   Figma   margin   status   dev
              spec    frames  notes,   to       tasks
              in      + dev   "See     "Ready
              Doc     notes   Figma    for
                      embed   for      Dev"
                              anim."
───────────── ────── ────── ──────── ──────── ──────
System:       Rich    Renders Auto-    Tracks   Creates
              text    frames  saves    doc      bi-dir
              editor  inline  margin   status   link
              with              notes          between
              version                       spec &
              history                       dev tasks
───────────── ────── ────── ──────── ──────── ──────
Emotion:      🙂      😍      🙂       😐      😍
Screen:       Doc     Doc     Doc      Doc     Doc +
              Editor  Editor  Editor   (status  Task
                              (margin  badge)  Detail
                              mode)            (linked
                                               spec)
───────────── ────── ────── ──────── ──────── ──────
Time:         10 min  5 min   3 min    1 min   30s
```

---

### Alex's Emotional Arc (Full Sprint)

```
Day 1   Day 3   Day 5   Day 7   Day 10  Day 14
───────────────────────────────────────────────────
😐      🙂      😍      😐      😍      😍
│       │       │       │       │       │
│       │       │       │       │       └── Sprint end: 100% shipped UI has linked spec
│       │       │       │       └── Handoff spec linked to 4 dev tasks, all started
│       │       │       └── Review: all feedback resolved in-thread
│       │       └── First review: inline comments feel organized (vs Slack chaos)
│       └── Prep: Figma embed + doc in one place
└── Sprint start: "where did that feedback go?" (old pain, gone now)
```

---

## 6. Shared Journey: New Workspace Onboarding

**Goal:** Get from "just signed up" to "created first task and felt productive" in < 10 minutes.

### Journey 6.1 — First-Time User Experience

```
Phase:     Sign Up → Setup Wizard → First Task → Invite → Aha Moment
────────── ──────── ───────────── ─────────── ────── ────────────
User Act:  Email/   Name WS,      Click "+",  Invite  Board loads
           Google   invite        type task   1-2     with
           SSO      members       title,      team    populated
           signup   (skip ok),    assign,     members tasks
                    create 1st    set due               & team
                    Space+List    date                  sees it
────────── ──────── ───────────── ─────────── ────── ────────────
System:    Sends    Creates       Creates     Sends   Board
           magic    workspace     task via    email   view
           link,    with          modal,      invite  shows
           verif    default       adds to     with    tasks +
           email    "Getting      list,       quick   status
                    Started"      shows       setup   columns
                    Space+List    in list     guide
────────── ──────── ───────────── ─────────── ────── ────────────
Emotion:   😐      😐→🙂         🙂          😐      😍
Screen:    Auth     Setup         List View   Invite  Board
           page     Wizard        (first      modal   View
           (magic   (3-step       task                 (first
           link)    modal)        created)             team
                                                       view)
────────── ──────── ───────────── ─────────── ────── ────────────
Time:      1 min   2-3 min       2 min       1-2     1 min
                                            min
```

**Onboarding Checklist** (collapsible in sidebar):
```
□ Create a task              (auto-checks on first task)
□ Assign a task to someone   (auto-checks on first assign)
□ Invite a teammate          (auto-checks on invite sent)
□ Switch to Board view       (auto-checks on view switch)
□ Comment on a task          (auto-checks on first comment)
□ Create a document          (auto-checks on first doc)
```

**Key Moments:**
- **Friction:** If wizard asks too many questions, user drops. Keep to 3 steps max.
- **"Aha" Moment:** Board view loads with the user's first task visible and assigned — "this is my team's workspace"
- **Delight:** Onboarding checklist auto-checks items as the user naturally explores — gamification without being cheesy

---

### Journey 6.2 — CSV Import (Migrating from Another Tool)

```
Phase:     Upload → Map → Preview → Import → Validate
────────── ─────── ───── ──────── ─────── ──────────
User Act:  Upload   Map   Review   Confirm  Check
           CSV      cols  first    import   results,
           file     to    5 rows   button   fix
           (≤10MB)  Sprint                  errors
                    io
                    fields
────────── ─────── ───── ──────── ─────── ──────────
System:    Parses   Auto- Shows    Runs     Shows
           CSV,     detect preview import   summary:
           detects  cols,  table   async    X
           headers  offer  with    in       imported,
           (<10MB)  remap  color-  back-    Y
                    suggestions coding    errors,
                    user   mismatch      Z
                    confirms             skipped
────────── ─────── ───── ──────── ─────── ──────────
Emotion:   😐      😐→🙂  🙂      😐       🙂→😍
Screen:    Import   Import Import  Loading  Import
           page     page   page    (prog.   Summary
           (upload  (col   (table  bar)     page
           drop-    map)   preview)
           zone)
────────── ─────── ───── ──────── ─────── ──────────
Time:      1 min   2 min  1 min   30s-5min 1 min
                                  (async)
```

---

## 7. Shared Journey: AI Copilot Adoption

**Goal:** Users discover AI features organically, try them once, and build trust through consistent quality.

### Journey 7.1 — First AI Interaction

```
Phase:     Discover → Try → Evaluate → Trust → Habit
────────── ───────── ──── ───────── ────── ────────
User Act:  Notices   Uses  Reviews   Uses    Daily
           AI        NL    AI's      AI for  habit:
           copilot   task  output    sum-    starts
           in        crea- (accept/  maries  day
           sidebar   tion  reject/   & tri-  with
           or via    for   edit)     age     AI
           slash     first             prompt
           cmd       task
────────── ───────── ──── ───────── ────── ────────
System:    Shows     NL    Streams   Auto-   Saves
           copilot   →     response  suggests preferences
           icon/     parsed in <500ms, triage  (tone,
           hint      task  with     on new  length)
           (tooltip  fields diff    tasks,
           on first  →     to       user
           visit)    review accept/ reviews
                     modal reject/
                             edit
────────── ───────── ──── ───────── ────── ────────
Emotion:   😐       🙂    😍        😍      😍
Screen:    Copilot   Task  Copilot   Task    Copilot
           panel     crea- panel     Detail  panel
           (hint)    tion  (stream   (triage (saved
                     modal ing       banner) prefs)
                     with  text +
                     NL    diff
                     input UI)
────────── ───────── ──── ───────── ────── ────────
Time:      0s        30s   10s       30s     1 min
           (notice)  (NL    (review)  (1-tap  (daily
                     type)          accept)  habit)
```

**Trust-Building Moments:**
1. **First NL task creation:** "Create a P1 incident task for checkout latency" → AI parses correctly → user thinks "it understood me"
2. **Smart triage:** AI suggests priority P1, assignee = me, label = "incident" → user accepts with one tap → "it learned my patterns"
3. **Smart summary:** One-click sprint summary that's actually useful → user shares with leadership → "this saved me an hour"

**Anti-Patterns to Avoid:**
- AI that gets it wrong on the first try → user never trusts it again
- AI that requires too many clarification steps → defeats the purpose
- AI that's hidden behind too many clicks → nobody discovers it
- AI that feels like a separate product → should feel like a natural extension of the current screen

---

### Journey 7.2 — AI Writing Assistant in Docs

```
Phase:     Select → Choose Action → Review Diff → Accept/Reject
────────── ─────── ────────────── ──────────── ──────────────
User Act:  Select   Click AI      Review      Accept
           text in  popup:        word-by-    all,
           doc,     Continue,     word diff   accept
           trigger  Summarize,    with        partial,
           AI       Rewrite,      green/red   or
           popup    Fix Grammar,  highlights  reject
                    Translate
────────── ───────── ────────────── ──────────── ──────────────
System:    Shows    Sends to      Streams     Applies
           context- LLM,          diff in     accepted
           aware    streams       editor,     changes,
           popup    response      preserves   logs in
           near     in <500ms     original    activity
           selection                                         
────────── ───────── ────────────── ──────────── ──────────────
Emotion:   😐      🙂              😍          😍
Screen:    Doc      AI Action      Doc         Doc
           Editor   Popup (small   Editor      Editor
           (text    floating       (inline     (clean
           select)  menu with      diff        text,
                    5 actions)     view)       changes
                                                 applied)
────────── ───────── ────────────── ──────────── ──────────────
Time:      5s       5s             15s         5s
```

---

## 8. Journey Cross-Reference Matrix

### Screens Accessed Per Persona

| Screen | Sarah | Marcus | Priya | Alex |
|--------|-------|--------|-------|------|
| Board View | ⭐ Primary | ◐ Occasional | ◐ Occasional | ○ Rare |
| List View | ◐ Secondary | ⭐ Primary | ◐ Secondary | ○ Rare |
| Task Detail | ⭐ Daily | ⭐ Daily | ◐ During grooming | ⭐ For feedback |
| Doc Editor | ○ Rare | ⭐ RFCs | ⭐ Specs | ⭐ Handoff |
| Automation Builder | ⭐ Power user | ◐ Personal auto | ⭐ Process auto | ○ Rare |
| Copilot Panel | ⭐ Summaries | ⭐ NL create | ⭐ NL create + writing | ○ Rare |
| Settings | ◐ Admin tasks | ○ Rare | ◐ Workspace config | ○ Rare |
| Notifications | ⭐ Daily | ◐ As needed | ⭐ Daily | ⭐ Review cycle |

### Emotion Comparison Across Key Flows

| Flow | Sarah | Marcus | Priya | Alex |
|------|-------|--------|-------|------|
| **Onboarding** | 😐→🙂 (wants team onboarded fast) | 😫→😐 (hates another tool) | 🙂 (organizing comes naturally) | 😐→🙂 (wants Figma integration) |
| **Daily work** | 😍 (board saves hours) | 😍 (auto-update = no UI tax) | 🙂 (backlog is clean) | 🙂 (feedback is organized) |
| **Status reporting** | 😍 (20 min vs 3 hours) | N/A (doesn't report) | 😍 (15 min vs 1 hour) | 😍 (review cycle < 3 days) |
| **AI features** | 😍 (summaries) | 😍 (NL create + triage) | 😍 (writing assistant) | 😐 (less AI-dependent) |
| **Automation** | 😍 (sprint nudges) | 😍 (chore automation) | 😍 (process automation) | 😐 (less needed) |

### Friction Points to Design For (MVP)

| # | Friction | Persona | Severity | Design Response |
|---|----------|---------|----------|-----------------|
| F1 | Too many items in backlog, hard to triage | Priya | High | Smart filtering, AI stale-item detection, quick-archive |
| F2 | Status updates feel like theater | Marcus | Critical | GitHub/GitLab auto-sync, NL updates, activity-as-byproduct |
| F3 | Can't see who's blocked without asking | Sarah | High | Board color-coding for blocked tasks, dependency indicators |
| F4 | Docs rot because they're disconnected from tasks | Alex | High | Bidirectional wiki-links, orphan detection, status badges |
| F5 | Onboarding requires too many steps | All | High | 3-step wizard, auto-checking checklist, progressive disclosure |
| F6 | AI copilot hidden or undiscoverable | All | Medium | Persistent sidebar panel, slash commands in every text field, contextual hints |
| F7 | Table view missing for bulk operations | Priya | Medium | Board+List views serve most needs; Table is Phase 2 priority |
| F8 | No native mobile app | Marcus | Low (MVP) | PWA with install prompt, touch-friendly targets |

---

> **Next Document:** [02-WIREFRAMES.md](./02-WIREFRAMES.md) — ASCII wireframes for every key screen
