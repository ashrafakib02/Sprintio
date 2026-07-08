# Sprintio — User Personas

**Document Type:** User Personas (detailed)  
**Product:** Sprintio — Sprint fast. Ship together.  
**Version:** 1.0  
**Status:** Finalized  
**Date:** 2026-07-07  
**Related Docs:** [PRD](./PRD.md), [User Stories](./USER_STORIES.md), [Functional Requirements](./FUNCTIONAL_REQUIREMENTS.md)

---

## 1. Why Personas Matter for Sprintio

Sprintio is an AI-native platform that unifies projects, documents, native automation, and an AI copilot into a single workspace. It has to serve very different people — an individual contributor who just wants to pick up a ticket and stop copy-pasting status updates, a design lead managing a living design system, a VP who needs portfolio-level risk visibility, and an agency PM who must bill clients accurately across a dozen engagements.

Personas keep us honest about that range. They are the bridge between the PRD's abstract "Jobs-to-be-Done" and concrete product decisions: which views we prioritize, how the AI copilot should phrase a summary, which automations we ship as templates, and what "success" looks like for each kind of user. Every feature we build should be able to answer *"which persona is this for, and what job does it do for them?"* If a capability only serves the power user and actively scares the pragmatic IC, or only impresses the executive and ignores the people doing the work, we have a design problem worth catching early.

These six personas are not exhaustive, but they span the primary segments in the PRD — SMB tech teams (the IC/EM/PM/Design core), mid-market leadership (VP/CTO), and agencies/consultancies (the multi-client PM). They should be referenced during discovery, prioritization, UX review, and success-metric definition.

---

## 2. Persona Summary Table

| Persona | Role / Seniority | MVP Phase | Primary Workspace Area | AI Features They Care About Most | Automation Use Cases |
|---------|------------------|-----------|------------------------|----------------------------------|----------------------|
| **Sarah** — Engineering Manager | Manager / Lead, 8-person squad | ✅ MVP | Boards, Sprints, Dashboard, Timeline | Smart summaries (sprint/standup), smart triage, AI standup generator | Auto-assign reviewers, stale-task nudge, sprint-report assembly, blocked-task alerting |
| **Marcus** — Senior Engineer | IC / Senior, individual contributor | ✅ MVP | List/Board (My Work), Docs, Calendar | NL task capture, AI writing assistant, smart search | Auto-triage incoming bugs, recurring task creation, PR→status sync, doc-from-template |
| **Priya** — Product Manager | Manager / IC-level PM, cross-functional | ✅ MVP | Docs (specs), Table/Board (backlog), Timeline | Smart summaries, NL task creation, AI writing assistant, release-notes gen | Backlog grooming rules, spec→task breakdown, status-digest broadcast, duplicate detection |
| **Alex** — Design Lead | Lead / Senior IC, design org | ✅ MVP | Docs (design system), Board (reviews), Whiteboard, Table | AI writing assistant, smart summaries, design-feedback clustering | Review-state routing, handoff-doc generation, feedback→task creation, design-system changelog |
| **Jordan** — VP Engineering / CTO | Executive, multi-team portfolio | ⏸ Phase 2 | Portfolio view, Workload/Capacity, Dashboard, Risk | Capacity planning & velocity forecasting, risk detection, strategic Q&A | Cross-team risk alerts, capacity rebalancing nudges, exec weekly digest, OKR rollups |
| **Casey** — Agency Project Manager | Manager / Client-facing PM, agency | ⏸ Phase 2 | Client Portals, Time Tracking, Table/Billing, Multi-client portfolio | NL task creation, smart summaries (client-ready), AI status drafts | Time-entry reminders, invoice-ready reports, client-status auto-publish, SLA/budget alerts |

> **MVP Persona Scope:** The MVP serves Sarah, Marcus, Priya, and Alex — the team leads and individual contributors who do the daily work. Jordan (executive) and Casey (agency) are Phase 2 personas.

---

## 3. Detailed Personas

### 3.1 Sarah — Engineering Manager

**Name:** Sarah Okafor  
**Role:** Engineering Manager  
**Seniority:** Mid-level people manager (5 years IC, 2 years managing)  
**Team / Company Context:** Manages an 8-person full-stack squad at a 140-person B2B SaaS company. Reports to the VP Engineering. Works in 2-week agile sprints. Owns delivery of the platform's billing and notifications domains.

#### Demographics & Background
Sarah, 34, studied computer science and spent five years as a backend engineer before stepping into management. She's technical enough to review architecture but no longer writes production code daily. She leads standups, plans sprints, runs retros, and is the primary interface between her team and product/leadership. She's comfortable with tooling but resents "admin work" that pulls her away from her team. Outside work she mentors early-career engineers and listens to engineering-leadership podcasts.

#### Goals
- Plan realistic sprints that the team can actually finish.
- Keep a steady, predictable velocity and protect the team from overcommitment.
- Unblock engineers quickly when they're stuck.
- Give leadership an accurate, low-effort read on progress and risk.
- Grow her people and keep them engaged (not burnt out).

#### Pain Points
- Spreadsheets + Jira + Slack + a wiki means status lives in five places; by Friday it's all stale.
- Building the sprint report eats 2–3 hours she'd rather spend with the team.
- She can't easily see *who's blocked* vs *who's idle* without asking around.
- Leadership asks "is the Q3 launch on track?" and she has to manually stitch together evidence.
- Retrospective action items get lost between tools.

#### Jobs-to-be-Done (expanded from PRD)
- **Plan sprints:** Turn a prioritized backlog into a committed sprint with balanced load.
- **Track velocity:** Monitor completed vs committed, spot trends before they become misses.
- **Unblock team:** Surface blockers and dependencies the moment they appear.
- **Report to leadership:** Produce a credible, current status narrative without manual assembly.

#### Key Tasks & Workflows in Sprintio
- Runs sprint planning in a **Board view** grouped by assignee, using **capacity/workload** to balance commits.
- Uses **Timeline/Gantt** for cross-team dependencies that touch other squads.
- Watches an **AI risk detector** flag stalled and overdue tasks automatically.
- Generates a **sprint summary** with one click and forwards it to her skip-level.
- Captures retro action items as tasks with owners and due dates via **NL task creation**.

#### What Success Looks Like
- Sprint commitment accuracy > 85% (committed vs delivered).
- < 30 minutes/week spent compiling leadership status.
- Zero "surprise" blockers reaching leadership unannounced.
- Team eNPS stable or improving; no one chronically over allocated.
- Standup stays under 15 minutes because the AI pre-summarizes yesterday/today.

#### Preferred Features / Capabilities Leaned On Most
- **Board, Timeline, Dashboard, Workload views** (FR-2.2, FR-2.5, FR-2.6, FR-2.7)
- **Smart summaries** + **AI standup generator** (FR-5.3, FR-5.8)
- **Smart triage** for incoming bugs/requests (FR-5.2)
- **Automation:** stale-task nudges, blocked-by alerts, auto-assembled sprint reports (FR-4.x)

#### Day in the Life
Sarah opens Sprintio at 8:50 for standup. The AI standup summary already lists what each engineer shipped yesterday and what's planned — standup is a 10-minute confirmation, not a status interrogation. At 10 she pulls up the Sprint Board; the risk detector has flagged two tasks stalled >3 days and one engineer showing as 120% allocated. She rebalances a ticket and pings the blocked engineer. Friday, she clicks "Generate Sprint Summary," tweaks two sentences, and posts it to the leadership channel — a 4-minute job that used to take her most of the afternoon.

#### Quotes
- *"I don't need another tracker. I need something that tells me when my team is about to miss, before leadership emails me asking why."*
- *"If I can plan a sprint and report up without leaving one tab, that's the whole job solved."*

---

### 3.2 Marcus — Senior Engineer

**Name:** Marcus Lindqvist  
**Role:** Senior Software Engineer  
**Seniority:** Senior IC (8 years experience)  
**Team / Company Context:** Senior backend engineer on Sarah's squad. Owns the payments service end-to-end. Heavy GitHub/GitLab user, lives in the terminal, allergic to process overhead.

#### Demographics & Background
Marcus, 31, is a distributed-systems generalist who takes pride in shipping reliable code fast. He prefers keyboards over mice, docs over meetings, and automation over repetition. He's the go-to person for gnarly incidents and a quiet advocate for developer experience. He contributes to open source and writes internal RFCs. He'll adopt a tool only if it respects his time; if it adds clicks, he'll route around it.

#### Goals
- Pick up well-scoped work without a planning meeting.
- Update status with minimal friction (ideally zero extra steps).
- Write clear technical docs and RFCs others can act on.
- Automate the repetitive parts of his job (triage, reminders, changelogs).
- Stay in flow; avoid context-switching into project-management UI.

#### Pain Points
- Status updates feel like theater — he updates a tool so a manager can read it.
- Bug reports arrive as vague Slack messages with no owner or acceptance criteria.
- Recurring chores (dependency bumps, on-call handoffs) are easy to forget.
- Docs rot; by the time someone reads the RFC it's already out of date.
- He wants to script things but the PM tool is a walled garden.

#### Jobs-to-be-Done (expanded from PRD)
- **Pick up work:** Find the next highest-value, well-defined task and start.
- **Update status:** Reflect progress as a natural byproduct of doing the work.
- **Write docs:** Produce specs/RFCs/runbooks that stay linked to the work.
- **Automate repetitive tasks:** Replace manual toil with triggers and scripts.

#### Key Tasks & Workflows in Sprintio
- Works from a personalized **"My Work" List/Board** filtered to his assignments.
- Uses **NL task creation** ("add a task to bump pg to 16, assign me, due next sprint") from chat or the copilot.
- Writes RFCs as **living Documents** nested under the related task, with bidirectional links.
- Connects **GitHub/GitLab** so PR state flows into task status automatically.
- Builds **automations** for recurring chores and bug triage via the no-code builder (and CLI later).

#### What Success Looks Like
- < 2 minutes/day on explicit status updating (status rides on real events).
- Zero forgotten recurring chores in a quarter.
- His docs are referenced, not rewritten, by teammates.
- He has ≥3 personal automations saving him weekly toil.
- He opens the PM UI only when he chooses to, not because he's forced.

#### Preferred Features / Capabilities Leaned On Most
- **List/Board "My Work", Calendar** (FR-2.1, FR-2.2, FR-2.4)
- **NL task creation, smart search, AI writing assistant** (FR-5.1, FR-5.5, FR-5.4)
- **Living Docs + wiki-links + version history** (FR-3.2, FR-3.3, FR-3.7)
- **Native Automation builder + templates + GitHub/GitLab integration** (FR-4.1, FR-4.7, FR-7.4)

#### Day in the Life
Marcus gets a Slack ping: a production alert. He types into the Sprintio copilot, *"Create a P1 incident task for checkout latency, assign me, link the on-call doc, notify Sarah."* It's done before he's even looked at the dashboard. He fixes the issue, opens a PR, and the linked task flips to "In Review" on its own. That evening a recurring automation reminds him it's his turn for the dependency-bump chore and pre-creates the task with the checklist. He never opened a Kanban board all day.

#### Quotes
- *"The best project tool is the one I don't have to open. If updating status means doing my actual job, we're good."*
- *"Let me describe a workflow in plain English and have it just run. That's the only automation I'll actually use."*

---

### 3.3 Priya — Product Manager

**Name:** Priya Raman  
**Role:** Product Manager  
**Seniority:** Mid-level PM (4 years), works across engineering + design + GTM  
**Team / Company Context:** PM for the growth and activation area at the same 140-person SaaS company. Partners daily with Sarah (eng) and Alex (design). Owns the roadmap narrative and stakeholder communication.

#### Demographics & Background
Priya, 30, came up through customer-success and UX research before moving into product. She's intensely customer-focused and allergic to building the wrong thing. She lives in docs — specs, PRDs, opportunity briefs — and is the hub of cross-functional communication. She's fluent in metrics and loves a clean backlog. She presents to leadership weekly and to customers occasionally. Her weakness is that her specs and her tracking often live in different tools, so "done" is ambiguous.

#### Goals
- Keep a prioritized, defensible backlog everyone trusts.
- Write specs that engineers and designers can execute without clarification loops.
- Track progress against the roadmap and communicate it credibly.
- Make trade-off decisions with real evidence, not vibes.
- Keep stakeholders aligned without becoming a full-time status broadcaster.

#### Pain Points
- Backlog grooming is endless; duplicate and stale items accumulate.
- Specs in the wiki drift from the tasks in the tracker — two sources of truth.
- Progress reporting is manual and out of date the moment it's sent.
- Stakeholders ask "when's X shipping?" and she has to reconstruct the answer.
- Release notes are written by hand from scattered commits.

#### Jobs-to-be-Done (expanded from PRD)
- **Prioritize backlog:** Continuously rank work by value, effort, and risk.
- **Write specs:** Produce clear, linked specifications tied to the work.
- **Track progress:** Know roadmap health at a glance.
- **Communicate status:** Broadcast accurate updates to stakeholders effortlessly.

#### Key Tasks & Workflows in Sprintio
- Maintains the backlog in a **Table view** with custom priority/value/effort fields and saved filters.
- Authors specs as **Documents** linked bidirectionally to the epic and its tasks.
- Uses **Timeline** to visualize roadmap sequencing and dependencies.
- Runs **duplicate detection** to keep the backlog clean (FR-5.11).
- Drafts **release notes** from completed tasks with one click (FR-5.9).

#### What Success Looks Like
- Backlog hygiene: < 5% duplicate/stale items at any time.
- Spec-to-task traceability: 100% of epics have a linked spec doc.
- Stakeholder status takes < 15 min/week to produce.
- Roadmap slippage is forecast, not discovered, at least one sprint early.
- Fewer than 1 clarification-round per spec on average.

#### Preferred Features / Capabilities Leaned On Most
- **Table, Board, Timeline views** (FR-2.3, FR-2.2, FR-2.5)
- **NL task creation, smart summaries, AI writing assistant, release-notes gen** (FR-5.1, FR-5.3, FR-5.4, FR-5.9)
- **Living Docs + wiki-links + templates** (FR-3.2, FR-3.3, FR-3.4)
- **Smart duplicate detection** (FR-5.11)

#### Day in the Life
Priya starts with the AI weekly digest summarizing what shipped and what slipped. She opens the backlog Table, runs duplicate detection, and merges three near-identical requests. She writes a new spec as a Document, links it to the Q3 epic, and uses a template so structure is consistent. She breaks the spec into tasks with NL commands (*"from this doc, create tasks for each acceptance criterion, assign owners"*). At end of sprint she clicks "Generate Release Notes," edits lightly, and posts to the changelog — stakeholders get a clean update without a meeting.

#### Quotes
- *"My spec and my backlog should be the same conversation, not two tabs I reconcile every Friday."*
- *"If the tool can tell me 'this shipped, here's the note,' I stop being the release-notes secretary."*

---

### 3.4 Alex — Design Lead

**Name:** Alex Mercer  
**Role:** Design Lead  
**Seniority:** Senior IC / Lead (9 years design, 2 leading a small team)  
**Team / Company Context:** Leads a 4-person product-design team. Owns the design system and the quality bar for UX. Works closely with Priya (specs) and Marcus (implementation). Heavy Figma user.

#### Demographics & Background
Alex, 33, is a product designer who grew into a lead role without giving up hands-on craft. They care deeply about consistency, accessibility, and the handoff moment where design meets engineering. They run design reviews, maintain the component library, and chase feedback across many threads. They're visual-first and prefer canvases and docs over spreadsheets. Their frustration is that feedback and decisions scatter across Figma comments, Slack, and email, so the "why" behind a design decision gets lost.

#### Goals
- Run efficient, decision-oriented design reviews.
- Hand off specs engineers can implement without ambiguity.
- Capture and act on feedback systematically.
- Keep the design system living, versioned, and adopted.
- Protect design quality amid fast shipping.

#### Pain Points
- Design feedback lives in Figma, Slack, and email — no single thread of truth.
- Handoff specs are rebuilt by hand for every feature.
- Design-system changes aren't communicated; adoption lags.
- Review states (draft → review → approved → built) are tracked informally.
- Decisions made in review are forgotten by implementation time.

#### Jobs-to-be-Done (expanded from PRD)
- **Manage design reviews:** Move work cleanly through review stages with clear verdicts.
- **Handoff specs:** Produce implementation-ready specs linked to the design.
- **Track feedback:** Collect, cluster, and resolve feedback in one place.
- **Manage design system:** Version, document, and drive adoption of components.

#### Key Tasks & Workflows in Sprintio
- Runs design reviews in a **Board with review-state swimlanes** and WIP limits.
- Attaches **Figma embeds** and **living Docs** as handoff specs under each task.
- Uses the **Whiteboard/canvas** for critique sessions and journey mapping.
- Maintains the **design system as a Docs + Table** with version history and changelog.
- Clusters feedback using **AI summaries** of comment threads.

#### What Success Looks Like
- Review cycle time < 3 business days per artifact.
- 100% of shipped UI has a linked handoff spec.
- Design-system adoption measured and trending up quarter over quarter.
- Feedback resolved rate > 90% within the sprint it's raised.
- Zero "why did we decide that?" moments in implementation.

#### Preferred Features / Capabilities Leaned On Most
- **Board (swimlanes/WIP), Whiteboard, Table, Docs** (FR-2.2, FR-2.9, FR-2.3, FR-3.2)
- **AI writing assistant + smart summaries** (FR-5.4, FR-5.3)
- **Doc templates, version history, bidirectional links** (FR-3.4, FR-3.7, FR-3.3)
- **Figma integration + automation for review routing** (FR-7.4, FR-4.x)

#### Day in the Life
Alex opens the Design Review Board: three items sit in "In Review." They open one, see the Figma embed and the linked handoff doc, and run the AI summary of the 40-comment thread — it clusters feedback into "accessibility (3)", "copy (2)", "layout (5)". Alex resolves them, drags the card to "Approved," and an automation notifies Marcus and posts the handoff doc to the engineering channel. Later, Alex updates a button component in the design-system doc; version history captures it and an automation drafts the changelog entry for the weekly design-system digest.

#### Quotes
- *"The handoff shouldn't be a separate artifact I rebuild. It should be the design, with the 'why' attached, one click from the task."*
- *"If the AI can tell me what 40 comments actually disagree about, my review meetings get 10 minutes shorter."*

---

### 3.5 Jordan — VP Engineering / CTO

**Name:** Jordan Vasquez  
**Role:** VP Engineering / CTO (varies by company size)  
**Seniority:** Executive (15+ years, 4 in leadership)  
**Team / Company Context:** Owns engineering across 6 squads (~70 engineers) at a Series B/C startup. Reports to the CEO. Accountable for delivery, capacity, hiring, and technical strategy. Board-facing on engineering health.

#### Demographics & Background
Jordan, 41, is a former staff engineer who scaled from IC to director to VP. They think in portfolios, not tasks. Their calendar is meetings; their real job is allocation, risk, and alignment. They want signal, not noise — a weekly truthful picture of whether the org is on track, where it's exposed, and whether capacity matches ambition. They're skeptical of dashboards that lie by being out of date. They care about strategy, hiring plans, and not getting surprised in the board meeting.

#### Goals
- See portfolio health across all teams in one trusted view.
- Plan capacity against roadmap and hiring reality.
- Detect risk (stalls, overload, dependency pile-ups) early.
- Align engineering effort with company strategy/OKRs.
- Walk into any exec or board meeting with a defensible narrative.

#### Pain Points
- Status comes from managers' manually assembled slides — always optimistic, always late.
- No single place to compare team capacity and load.
- Risks surface in 1:1s, not in any dashboard.
- Tool sprawl means "the truth" is reconstructed per audience.
- Forecasting is spreadsheet guesswork.

#### Jobs-to-be-Done (expanded from PRD)
- **Portfolio view:** Roll up all teams/projects into one coherent picture.
- **Capacity planning:** Match people and skills to the roadmap realistically.
- **Risk detection:** Surface stalls, overload, and dependency risks automatically.
- **Strategic alignment:** Tie daily work to OKRs and company priorities.

#### Key Tasks & Workflows in Sprintio
- Opens the **cross-workspace Portfolio view** each morning (FR-2.11).
- Reviews the **Workload/Capacity view** per team and rebalances via nudges (FR-2.7).
- Relies on **AI risk detection** for stalled/overallocated/dependency risks (FR-5.7).
- Uses **velocity forecasting** to sanity-check the roadmap (FR-5.6).
- Asks the copilot **strategic Q&A** ("Which Q3 commitments are at risk and why?").

#### What Success Looks Like
- One source of truth for portfolio health; zero manual status decks.
- Risk surfaced ≥1 week earlier than via 1:1s.
- Capacity plan accurate within 10% of actual delivery.
- Every major initiative traceable to an OKR.
- Board/exec prep drops from hours to minutes.

#### Preferred Features / Capabilities Leaned On Most
- **Portfolio, Workload/Capacity, Dashboard views** (FR-2.11, FR-2.7, FR-2.6)
- **Capacity planning & velocity forecasting, risk detection, strategic Q&A** (FR-5.6, FR-5.7, FR-5.12)
- **Goals/OKRs linked to tasks** (FR-1.10)
- **Automation:** cross-team risk alerts, exec weekly digest, OKR rollups (FR-4.x)

#### Day in the Life
Jordan's Monday starts with the AI-exec digest: portfolio health, three flagged risks, and a capacity warning on the platform team. They open the Portfolio view, drill into the platform squad, and see two engineers at 130% with a critical-path dependency on another team. They forward the risk card to that team's EM with a note. Before the leadership meeting they ask the copilot, *"Summarize Q3 engineering risk and confidence by initiative,"* and paste the answer into the exec doc. No slide built by hand.

#### Quotes
- *"I don't want a prettier Jira. I want to know by Monday morning which commitment is going to break and why."*
- *"If the number on the dashboard doesn't match reality, the dashboard is worthless to me. Trust is the feature."*

---

### 3.6 Casey — Agency Project Manager

**Name:** Casey Donovan  
**Role:** Project Manager (Agency)  
**Seniority:** Mid-level PM / client-facing delivery lead  
**Team / Company Context:** PM at a 40-person digital agency running 10–14 concurrent client engagements (web, brand, product). Owns delivery, time tracking, and the client relationship. Bills by the hour and by the milestone.

#### Demographics & Background
Casey, 29, is a delivery-focused PM who lives at the intersection of client expectation and team capacity. They manage portals, timesheets, and invoices — and the constant tension between "scope" and "what we agreed." They're organized to a fault and rely on transparency to keep clients happy and profitable. Their nightmare is an unbilled hour or an over-budget project discovered at closeout. They juggle more contexts in a day than any other persona here.

#### Goals
- Run multiple client portfolios without losing track of any.
- Give clients a transparent, branded window into their project.
- Track time accurately so billing is correct and defensible.
- Catch budget/SLA overruns before they hit margin.
- Communicate client-ready status without rewriting it per account.

#### Pain Points
- Client comms live in email; project data lives in the tool — constant translation.
- Time tracking is manual and forgotten, so invoices are guesses.
- No clean client portal; screenshots get sent instead of living views.
- Budget burn is discovered at month-end, not in real time.
- Switching between 12 client spaces is mentally exhausting.

#### Jobs-to-be-Done (expanded from PRD)
- **Client portals:** Give each client a secure, branded view of their work.
- **Time tracking:** Capture effort accurately for billing and utilization.
- **Billing integration:** Turn tracked time and milestones into invoices.
- **Multi-client portfolio:** Oversee all engagements and their health at once.

#### Key Tasks & Workflows in Sprintio
- Runs each engagement as its own **Space** with a **client portal** (guest access, branding).
- Uses **Time Tracking** (manual + automatic) on tasks and reviews **time reports** (FR-1.9).
- Maintains a **multi-client portfolio Table** with budget, burn, and SLA columns.
- Publishes **client-ready status docs** with one click (white-label, custom domain later).
- Connects **billing integration** to push invoice-ready reports.

#### What Success Looks Like
- 100% of billable hours tracked and reconciled monthly.
- Zero budget overruns discovered after the fact (alerted at 80% burn).
- Client portal adoption: clients self-serve status, fewer "where's my update?" emails.
- Utilization per consultant visible and optimized (target 70–80%).
- Invoice prep time cut from days to hours.

#### Preferred Features / Capabilities Leaned On Most
- **Client Portals / Guest access, Time Tracking, Table/Billing views** (FR-6.4, FR-1.9, FR-2.3)
- **NL task creation, smart summaries (client-ready), AI status drafts** (FR-5.1, FR-5.3, FR-5.4)
- **Multi-workspace portfolio + custom branding** (FR-2.11, FR-6.10)
- **Automation:** time-entry reminders, SLA/budget alerts, auto-published client status (FR-4.x)

#### Day in the Life
Casey opens the multi-client portfolio and immediately sees one project at 82% of budget with two weeks left — an automation already alerted the account lead. They open that client's portal, review the AI-drafted status update (rewritten in client-friendly, non-jargon tone), approve it, and publish it; the client gets a branded link instead of an email thread. At 5pm a gentle automation reminds three consultants who forgot their timesheets. Month-end, Casey exports invoice-ready reports per client and pushes them to billing — no reconstruction, no guesswork.

#### Quotes
- *"An hour I didn't track is an hour I didn't get paid for. The tool has to make tracking effortless or it doesn't happen."*
- *"My clients don't want a login to my internal tool. They want a clean, branded window that says 'here's your project, here's the truth.'"*

---

## 4. Cross-Persona Themes

A few patterns cut across all six personas and should guide product priorities:

1. **One tab, one truth.** Every persona — from Marcus (who refuses to open a PM UI) to Jordan (who won't trust a stale dashboard) — needs the same live data presented at the right altitude. The unified data model (FR-1.x) is what makes this possible.
2. **AI as a reduction of toil, not a novelty.** The highest-value AI features are the ones that delete a recurring manual job: sprint summaries, standup gen, release notes, risk detection, client-status drafts. Personas adopt AI when it saves time, not when it's impressive.
3. **Automation is the great equalizer.** Sarah, Marcus, Priya, Alex, and Casey all lean on the no-code automation builder, but for different jobs (unblocking, triage, grooming, review-routing, billing). A strong template library (FR-4.7) accelerates every segment.
4. **Altitude scales with seniority.** Marcus lives at the task; Sarah at the sprint; Priya at the roadmap; Alex at the artifact; Jordan at the portfolio; Casey at the client. Views must serve all altitudes without forcing anyone into someone else's.
5. **Trust is a feature.** Jordan and Casey explicitly won't use a view they don't believe. Real-time, audit-logged, single-source data is a prerequisite, not a nice-to-have.

---

**Document Status:** Finalized  
**Next Review:** 2026-07-14  
**Owner:** Product  
**Approvers:** [whom it may concern]
