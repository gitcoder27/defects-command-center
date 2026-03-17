# Manager Workflow Review

**Date:** March 17, 2026  
**Perspective:** Full-day manager usage  
**Scope:** Manager dashboard, Team Tracker, Manager Desk, and the workflow bridges between them

## Verdict

The product is already a strong operational MVP for a manager. It has the right three surfaces:

- the dashboard for issue triage
- Team Tracker for developer execution
- Manager Desk for manager-owned work

The problem is not that these surfaces are missing. The problem is that the handoffs between them are still fragile enough that a manager could not safely treat the system as the single source of truth for the whole day.

The main trust gaps are:

1. delegated work does not stay synchronized across Manager Desk and Team Tracker
2. carry-forward behavior is split and can break continuity
3. some actions create or delete shared work too implicitly
4. issue and developer context is still lost at important bridge points
5. the manager still has to manually stitch together "what needs me now" across separate pages

## What Already Works Well

- The top-level split is correct. Keeping the dashboard, Team Tracker, and Manager Desk as separate manager surfaces is the right information architecture for a busy lead. See `client/src/App.tsx:16-69` and `client/src/App.tsx:337-374`.
- The header-level manager capture is useful. A manager can create a Manager Desk item from anywhere except the desk itself. See `client/src/components/layout/Header.tsx:28-29` and `client/src/components/layout/Header.tsx:177-185`.
- Dashboard triage already bridges into both execution and manager follow-up flows. See `client/src/components/triage/TriagePanel.tsx:223-238` and `client/src/components/triage/TriagePanel.tsx:269-283`.
- Team Tracker and Manager Desk do share a detail model when a task is linked, which is the right direction. See `client/src/components/team-tracker/TrackerTaskDetailDrawer.tsx:38-74`.
- Team Tracker attention modeling is materially better than a plain board. The route and service already compute an attention queue and richer signals. See `server/src/services/team-tracker.service.ts:169-238` and `docs/26-team-tracker-manager-review-and-enhancement-roadmap.md`.

## Priority Findings

### P1. Delegated work is not trustworthy across Manager Desk and Team Tracker

**Why this matters**

If a manager assigns a Manager Desk item to a developer, that item becomes shared operational work. At that point, the manager needs one consistent lifecycle across:

- Manager Desk
- Team Tracker
- My Day

Today that lifecycle is only partially shared.

**Evidence**

- Manager Desk pushes assignment changes into Team Tracker through `syncTrackerAssignment`. See `server/src/services/manager-desk.service.ts:241-248`, `server/src/services/manager-desk.service.ts:330-337`, and `server/src/services/manager-desk.service.ts:1035-1054`.
- Team Tracker state changes only mutate `teamTrackerItems`; they do not update the linked Manager Desk item status, next action, or outcome. See `server/src/services/team-tracker.service.ts:547-586`.
- The shared detail drawer renders both contexts together, but the synchronization is still UI-level, not lifecycle-level. See `client/src/components/team-tracker/TrackerTaskDetailDrawer.tsx:38-74`.

**Workflow impact**

- A developer can finish or drop work in Team Tracker / My Day and the linked Manager Desk item can still look open.
- A manager cannot trust the desk as the authoritative list of delegated follow-ups.
- End-of-day review becomes manual reconciliation instead of a true review.

**Enhancement**

Create an explicit "shared delegated task" lifecycle:

- define which fields are manager-owned vs developer-owned
- propagate tracker state changes back to Manager Desk
- show divergence if the two sides intentionally differ

### P1. Carry-forward continuity is split and can silently fail

**Why this matters**

Carry-forward is not a nice-to-have in this product. It is one of the core behaviors that determines whether the manager can rely on the system day after day.

**Evidence**

- Team Tracker carry-forward explicitly excludes Manager Desk-backed items by filtering out `managerDeskItemId !== null`. See `server/src/services/team-tracker.service.ts:856-902` and `server/src/services/team-tracker.service.ts:904-934`.
- Manager Desk carry-forward clones the original `plannedStartAt`, `plannedEndAt`, and `followUpAt` values without rebasing them to the new day. See `server/src/services/manager-desk.service.ts:499-520`.
- Manager Desk only computes `carryableItems` from the currently viewed day and exposes carry-forward from that same day; it does not preview unfinished work from the previous day the way Team Tracker does. See `client/src/components/manager-desk/ManagerDeskPage.tsx:60-63` and `client/src/components/manager-desk/ManagerDeskPage.tsx:202-212`, compared with `client/src/components/team-tracker/TeamTrackerPage.tsx:64-67` and `client/src/components/team-tracker/TeamTrackerPage.tsx:380-421`.

**Workflow impact**

- If a delegated task originated from Manager Desk, the team cannot carry it forward through the normal Team Tracker carry-forward flow.
- Continuity depends on the manager remembering to carry that item from Manager Desk instead.
- Carried items can land on the new day already overdue or still timed for yesterday's meeting slot.
- A manager opening today's desk gets no prompt that yesterday still has unfinished manager-owned work.

**Enhancement**

- Unify carry-forward rules for desk-backed and tracker-native work.
- Rebase carried times by default, or force the manager to confirm how each time field should move.
- Show "will become overdue on carry-forward" warnings before confirming.
- Add the same first-visit carry-forward prompt to Manager Desk that Team Tracker already uses.

### P1. Dashboard alerts can become noisy or misleading for live management

**Why this matters**

The dashboard is supposed to be the manager's fast operational radar. If alerts are noisy or the "idle developer" signal is wrong, the manager will stop trusting the page and go back to manual checking.

**Evidence**

- Issue alerts are generated by iterating every row in `issues` without applying `isActiveTeamIssue`, so out-of-team and excluded issues can still produce overdue, stale, or blocked alerts. See `server/src/services/alert.service.ts:15-47`, compared with the active-team rules in `server/src/services/issue-rules.ts:15-24`.
- Idle-developer alerts come from `getIdleDevelopers()`, which defines idle as `activeDefects === 0`. It does not require `assignedTodayCount === 0`, so a developer with tracker work but no active Jira defects still looks idle. See `server/src/services/alert.service.ts:49-60` and `server/src/services/workload.service.ts:144-146`.
- The workload score itself is still derived only from Jira priorities, even though same-day assignment decisions also depend on Team Tracker load and custom work. See `server/src/services/workload.service.ts:87-137` and `server/src/services/workload.service.ts:195-197`.

**Workflow impact**

- Managers can get risk noise for issues that should not be in the live command view anymore.
- Developers doing valid tracker work can still be surfaced as idle.
- Assignment suggestions can look more precise than they really are because they still anchor heavily on Jira backlog rather than full-day execution reality.

**Enhancement**

- Generate issue alerts only from active in-team issues.
- Redefine "idle developer" as no current item, no planned work, and no valid availability override.
- Make the workload widget and assignment suggestions explicitly show both backlog pressure and today's planned load instead of letting the Jira score dominate.

### P1. Simply opening a Team Tracker task can create a Manager Desk item

**Why this matters**

Reviewing a task should be a read action. It should not mutate the manager's private workspace unless the manager explicitly promotes that task.

**Evidence**

- If a tracker item has no `managerDeskItemId`, opening shared task detail hits `/manager-desk/tracker-items/:trackerItemId/detail`. See `client/src/hooks/useManagerDesk.ts:26-42`.
- That server path creates a new Manager Desk item on demand through `createManagerDeskItemFromTrackerItem`. See `server/src/services/manager-desk.service.ts:639-659` and `server/src/services/manager-desk.service.ts:1080-1128`.

**Workflow impact**

- Passive inspection can pollute the manager's desk.
- The manager can accumulate unintended desk items just by reviewing developer tasks.
- The desk stops meaning "things I chose to own or track personally."

**Enhancement**

Replace implicit creation with an explicit action:

- `Open task detail` for read-only tracker context
- `Promote to shared manager task` when the manager wants the item in Manager Desk

### P1. Deleting a Manager Desk item also deletes the linked Team Tracker task

**Why this matters**

For shared delegated work, deleting the manager-side record is not the same thing as cancelling the developer's execution task.

**Evidence**

- Deleting a Manager Desk item calls `trackerService.syncManagerDeskItem` with `assigneeDeveloperAccountId: null`, which deletes the linked tracker item when it exists. See `server/src/services/manager-desk.service.ts:342-353` and `server/src/services/team-tracker.service.ts:493-500`.
- The Team Tracker detail drawer exposes that delete action directly from the shared detail surface. See `client/src/components/team-tracker/TrackerTaskDetailDrawer.tsx:49-50`.

**Workflow impact**

- A manager can unintentionally erase active developer work while trying to clean up the desk.
- This is especially dangerous if the developer has already added note context or changed execution state.

**Enhancement**

- Split `Remove from my desk` from `Cancel delegated task`.
- If a linked tracker item exists, require an explicit secondary confirmation with clear impact language.

### P1. Multi-issue manager tasks lose structured issue context when delegated

**Why this matters**

Manager work often spans several defects. If the manager delegates that work, the developer-side execution item should still preserve the relevant issue context.

**Evidence**

- `syncManagerDeskItem` collapses linked issue context to a single Jira key only when exactly one issue is linked; otherwise it clears Jira linkage and creates a generic custom task. See `server/src/services/team-tracker.service.ts:504-505` and `server/src/services/team-tracker.service.ts:527-544`.

**Workflow impact**

- A manager can keep multiple issue links on the desk item, but the delegated Team Tracker item loses structured Jira linkage.
- The tracker then becomes weaker exactly when the work is more cross-cutting and more manager-sensitive.

**Enhancement**

- Support multi-issue context on tracker items, or
- preserve one primary issue plus a visible "also related to" list, or
- convert the remaining links into explicit tracker note metadata instead of dropping them

### P1. Dashboard triage still forces a split decision between "delegate" and "track personally"

**Why this matters**

In real manager flow, triage often means both:

- assign execution to a developer
- keep a manager-owned follow-up open until the result comes back

**Evidence**

- Triage has one flow that adds a task directly to Team Tracker. See `client/src/components/triage/TriageTrackerSection.tsx:62-67` and `client/src/components/triage/TriageTrackerSection.tsx:177-193`.
- It has a separate flow that creates a Manager Desk item with issue linkage. See `client/src/components/triage/TriageDeskSection.tsx:10-58` and `client/src/components/triage/TriagePanel.tsx:269-283`.
- There is no combined action that creates a manager-tracked delegated task in one step.

**Workflow impact**

- The manager must decide which surface to use first and then manually recreate context in the other one.
- This increases duplicate entry and weakens follow-up discipline during live triage.

**Enhancement**

- Add `Delegate and track on my desk`.
- Let the manager choose developer, create the shared task, and keep the desk item as the manager-owned wrapper.

### P2. Tracker-to-desk capture loses structured Jira linkage

**Why this matters**

When a manager captures a follow-up from a developer drawer, the current Jira issue is often the most important piece of context.

**Evidence**

- The Team Tracker drawer shows current tracker Jira context. See `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx:430-437`.
- But the capture dialog only persists a developer link in `initialLinks`; the Jira issue is shown only as a display chip and note text. See `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx:559-570`.

**Workflow impact**

- The desk item looks connected during capture, but the Jira link is not actually stored unless the manager adds it later.
- Follow-up items created from Team Tracker can become harder to reopen from issue context.

**Enhancement**

- When `day.currentItem?.jiraKey` exists, store it as an actual Manager Desk issue link by default.

### P2. Manager Desk does not show the daily summary strip even though the data and component already exist

**Why this matters**

The product requirement for Manager Desk explicitly asks for a 10-second understanding of the day. The current page makes the manager scan sections instead of reading the summary first.

**Evidence**

- The day API already returns `summary`. See `server/src/services/manager-desk.service.ts:175-179`.
- A dedicated `SummaryStrip` component already exists. See `client/src/components/manager-desk/SummaryStrip.tsx:34-82`.
- `ManagerDeskPage` does not import or render that component. See `client/src/components/manager-desk/ManagerDeskPage.tsx:14-33` and `client/src/components/manager-desk/ManagerDeskPage.tsx:200-257`.

**Workflow impact**

- The manager cannot quickly answer: "How many open items, how many overdue follow-ups, how many meetings, how much inbox?"
- This weakens morning planning and end-of-day closure.

**Enhancement**

- Render the summary strip directly under the header or command bar.
- Make the summary tiles clickable filters.

### P2. Team Tracker check-ins do not show who authored the update

**Why this matters**

For a manager supervising throughout the day, "what changed" is not enough. "Who said it" matters too.

**Evidence**

- The shared model includes `authorType` and `authorAccountId`. See `shared/types.ts:281-286`.
- The Team Tracker drawer check-in list only renders summary and relative time. See `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx:496-516`.
- Existing roadmap notes already call out update attribution as incomplete. See `docs/26-team-tracker-manager-review-and-enhancement-roadmap.md`.

**Workflow impact**

- The manager cannot quickly distinguish a developer update from a manager-entered note.
- Trust and freshness become harder to interpret during follow-up.

**Enhancement**

- Show author badges on each check-in.
- Separate "developer update" from "manager note" visually.

## Structural Enhancements

These are not single bugs. They are the next-level improvements that would materially increase manager productivity.

### 1. Add a unified "Manager Now" layer

The system currently makes the manager choose between three routes and mentally combine them:

- dashboard
- Team Tracker
- Manager Desk

See `client/src/App.tsx:55-69` and `client/src/App.tsx:337-374`.

What is still missing is one manager-first answer to:

> What needs me right now across issues, people, and my own desk?

Suggested shape:

- overdue Manager Desk follow-ups
- Team Tracker attention queue
- dashboard alerts for blocked / overdue / stale defects
- recently changed delegated tasks

### 2. Define first-class "shared delegated task" semantics

Right now the product has:

- manager-only desk items
- tracker-native execution items
- a partial bridge between them

What it needs is a deliberate object model for work that is:

- initiated by the manager
- executed by the developer
- still manager-owned for follow-up and closure

Without that model, the system will keep drifting into one-way sync behavior.

### 3. Add stronger meeting and follow-up behavior in Manager Desk

Manager Desk can already represent meetings and waiting items, but it still behaves mostly like a task board.

Recommended improvements:

- meeting prep checklist
- post-meeting follow-up creation
- waiting-on owner and expected unblock date
- "next follow-up due" distinct from generic `followUpAt`
- decision log view across days

### 4. Add a cross-day manager backlog

Manager Desk is very day-scoped today. That is useful, but a manager who depends on the system for all work needs more than a single-day lens.

Recommended additions:

- backlog view
- this week / next week follow-ups
- overdue unresolved decisions and waiting items
- saved filters like `Waiting on others`, `Need manager action`, `Upcoming meetings`

## Recommended Implementation Order

### Must Have

1. synchronize Manager Desk and Team Tracker lifecycle for delegated work
2. fix carry-forward continuity for desk-backed tasks
3. stop implicit Manager Desk creation from passive task viewing
4. separate desk deletion from execution-task deletion

### Should Have

1. add combined `Delegate and track on my desk` from triage
2. preserve issue linkage when capturing from Team Tracker
3. render Manager Desk summary strip
4. show check-in authorship

### High Leverage Next Phase

1. unified `Manager Now` cross-surface view
2. structured blocker / waiting-on model
3. cross-day backlog and decision review

## Bottom Line

If I were the manager using this all day, I would use it now for real work, but I would still keep a parallel scratchpad because I would not fully trust the system to preserve delegated follow-ups and next-day continuity without manual intervention.

That is the main product gap.

The application is close to being a real manager operating system, but the next step is not more UI polish. The next step is making cross-surface workflow ownership explicit, synchronized, and safe.
