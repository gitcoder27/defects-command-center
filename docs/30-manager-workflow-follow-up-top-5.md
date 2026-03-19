# Manager Workflow Follow-Up: Top 5 Fixes

**Date:** March 19, 2026  
**Source:** `docs/28-manager-workflow-review.md`  
**Audit basis:** current workspace implementation as of March 19, 2026

## Audit Summary

After re-checking the original review against the current codebase, a few points no longer belong in the "must fix" list:

- **Already handled:** passive Team Tracker inspection no longer creates a Manager Desk item. The read path is now `GET /manager-desk/tracker-items/:trackerItemId/detail`, and promotion is a separate explicit `POST /manager-desk/tracker-items/:trackerItemId/promote` action. This is implemented in `server/src/routes/manager-desk.ts`, `server/src/services/manager-desk.service.ts`, `client/src/hooks/useManagerDesk.ts`, and `client/src/components/team-tracker/TrackerTaskDetailDrawer.tsx`.
- **Already handled:** Team Tracker check-ins now show author attribution. `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx` renders author badges from `authorType`.
- **Already handled:** delegated task lifecycle synchronization now keeps linked Manager Desk, Team Tracker, and My Day state aligned, so this no longer belongs in the remaining top-priority fix list.
- **Partially handled and narrowed:** Team Tracker carry-forward now includes Manager Desk-linked work through the `carryManagerDeskItems` callback path in `server/src/routes/team-tracker.ts` and `server/src/services/team-tracker.service.ts`. The remaining carry-forward problem is now on the Manager Desk side: time rebasing, overdue-on-arrival behavior, and previous-day continuity.

The items below are the highest-value remaining fixes from the original review. Delegated lifecycle synchronization is left in the checklist as completed recordkeeping, but it is no longer an open follow-up item.

## Top 5 To Pick Up

### 1. Delegated task lifecycle synchronization across Manager Desk, Team Tracker, and My Day

Status: Completed

This follow-up is complete and should no longer be treated as an open trust gap. Keep it here only as a closed item tied back to the original review.

**Change nature:** Both frontend and backend

Outcome:

- Linked delegated work now synchronizes lifecycle changes across Manager Desk, Team Tracker, and My Day.
- This removes the original state-divergence gap where developer execution changes could bypass the linked Manager Desk item lifecycle.

### 2. Split "delete desk item" from "cancel delegated work"

Status: Completed

This follow-up is complete and should no longer be treated as an open safety gap.

**Change nature:** Both frontend and backend

Outcome:

- `Remove from my desk` now removes only the Manager Desk item and preserves linked developer execution work by unlinking it from Manager Desk.
- `Cancel delegated task` is now the explicit destructive path that deletes the linked Team Tracker/My Day execution item and keeps the Manager Desk item as `cancelled`.
- Linked delegated items now use explicit UI actions and confirmation copy instead of a generic shared delete path.
- Backend protections reject implicit linked-task cancellation through generic `status: "cancelled"` updates or assignee clearing.

This removes the original data-loss risk where desk cleanup could silently erase active delegated work.

### 3. Finish Manager Desk carry-forward continuity

This item is still valid, but its scope is narrower than the original review. Team Tracker mixed-source carry-forward is now covered. Manager Desk continuity is not.

**Change nature:** Both frontend and backend

Current evidence:

- `server/src/services/manager-desk.service.ts` still carries `plannedStartAt`, `plannedEndAt`, and `followUpAt` forward without rebasing them to the target day.
- `client/src/components/manager-desk/ManagerDeskPage.tsx` only offers carry-forward from the currently viewed day's open items.
- Unlike `client/src/components/team-tracker/TeamTrackerPage.tsx`, Manager Desk still has no first-visit prompt for unfinished work from the previous day.

What to implement:

- Rebase time fields to the target date by default, or force the manager to choose how those fields move.
- Warn before carry-forward if the carried item will land already overdue.
- Add a previous-day continuity prompt in Manager Desk similar to Team Tracker's prompt.

Why this is top 3:

- Day-to-day continuity is core product behavior, and the remaining gap is now concentrated in one surface.

### 4. Clean up dashboard alerts and workload trust signals

Status: Completed

This follow-up is complete and should no longer be treated as an open dashboard trust gap.

**Change nature:** Both frontend and backend

Outcome:

- Issue alerts now generate only from active in-team issues, so excluded, out-of-team, and sync-inactive rows no longer pollute dashboard risk signals.
- Idle developer detection now follows same-day tracker reality instead of only Jira defect count, including suppression for developers already marked `done_for_today`.
- Workload payloads and assignment suggestions now surface tracker load alongside Jira backlog pressure, so the dashboard and triage suggestion UI no longer overstate confidence from one backlog number.

Why this is top 4:

- If the manager stops trusting the dashboard radar, they will stop using one of the product's main surfaces.

### 5. Preserve structured issue context when work crosses surfaces

This is still a real data-quality gap, and it shows up in two places from the original review.

**Change nature:** Both frontend and backend

Current evidence:

- `server/src/services/team-tracker.service.ts` keeps a structured Jira key only when exactly one issue is linked; multi-issue Manager Desk work becomes a generic tracker task.
- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx` still opens Manager Desk capture with only a developer link in `initialLinks`; the current Jira issue is shown as context but not stored as an actual issue link.

What to implement:

- Preserve multi-issue context for delegated work. Minimum acceptable fallback: one primary issue plus visible related issues metadata.
- When capturing a Manager Desk follow-up from Team Tracker, store `day.currentItem?.jiraKey` as a real issue link by default.
- Surface related issue context consistently in shared detail views.

Why this is top 5:

- Cross-surface tasks lose important context right when the work becomes more complex and more manager-sensitive.

## Valid But Not In The Top 5

These are still worthwhile, but they should follow the trust and safety fixes above:

- Add a combined triage action for `Delegate and track on my desk` so managers do not have to create the two sides separately.
- Render the existing `SummaryStrip` in Manager Desk so the page answers the daily "what matters today?" question faster.

## Implementation Checklist

### Feature 1. Delegated lifecycle synchronization

- [x] Confirm the linked-task lifecycle model and document field ownership for Manager Desk vs Team Tracker/My Day.
- [x] Decide the exact back-sync rules for linked task execution states: `planned`, `in_progress`, `done`, and `dropped`.
- [x] Implement backend synchronization from Team Tracker item changes back into the linked Manager Desk item.
- [x] Ensure My Day mutations follow the same linked-task synchronization path.
- [x] Update shared detail UI to reflect linked lifecycle state clearly when execution changes.
- [x] Add or update backend tests for linked lifecycle sync.
- [x] Add or update frontend tests for linked lifecycle display behavior.

### Feature 2. Safe deletion and cancellation semantics

- [x] Define the product behavior difference between `Remove from my desk` and `Cancel delegated task`.
- [x] Update backend delete/cancel flows so removing a desk item does not implicitly delete active execution work unless explicitly requested.
- [x] Add a dedicated destructive path for true delegated-task cancellation.
- [x] Update Manager Desk and shared detail UI to expose the two actions separately.
- [x] Add explicit confirmation copy describing the impact on developer-facing work.
- [x] Add or update backend tests for removal vs cancellation behavior.
- [x] Add or update frontend tests for action labels, visibility, and confirmation flows.

### Feature 3. Manager Desk carry-forward continuity

- [ ] Decide the carry-forward rule for time fields: automatic rebase, explicit confirmation, or per-field choice.
- [ ] Update backend carry-forward logic so carried Manager Desk items no longer silently preserve stale day-bound times.
- [ ] Add overdue-on-arrival detection for carried items.
- [ ] Update the carry-forward dialog to show warnings and the selected time-handling behavior.
- [ ] Add a previous-day continuity prompt to Manager Desk similar to Team Tracker's first-visit prompt.
- [ ] Add or update backend tests for carry-forward rebasing and warnings.
- [ ] Add or update frontend tests for the prompt and carry-forward dialog behavior.

### Feature 4. Dashboard alert and workload trust cleanup

- [x] Update backend alert generation to only use active in-team issues.
- [x] Redefine idle developer detection using tracker assignments and availability, not only Jira active defects.
- [x] Review workload scoring and suggestion text so tracker load is visible alongside Jira backlog pressure.
- [x] Update frontend dashboard messaging to reflect the refined alert and workload semantics.
- [x] Add or update backend tests for alert filtering and idle-developer logic.
- [x] Add or update frontend tests for workload and alert presentation where applicable.

### Feature 5. Structured issue context preservation

- [ ] Decide the cross-surface issue-link model for multi-issue delegated work.
- [ ] Update backend linked-task sync so multi-issue Manager Desk items retain structured issue context instead of collapsing to a generic tracker task.
- [ ] Update Team Tracker to Manager Desk capture so the current tracker Jira issue is stored as a real issue link by default.
- [ ] Update shared detail surfaces to display primary and related issue context consistently.
- [ ] Add or update backend tests for multi-issue linkage and tracker-to-desk capture defaults.
- [ ] Add or update frontend tests for capture defaults and related-issue rendering.
