# My Day Developer Workspace Review

**Date:** March 17, 2026  
**Scope reviewed:** `client/src/components/my-day/**`, related shared UI used by My Day, `client/src/hooks/useMyDay.ts`, `server/src/routes/my-day.ts`, `server/src/services/my-day.service.ts`, the underlying Team Tracker and Manager Desk sync paths, and the current My Day tests.

## Findings

### P0. Date handling is wrong for US time zones, so developers can see and edit the wrong day

- `MyDayDateControl` parses `YYYY-MM-DD` with `new Date(date)` and uses that for display and prev/next navigation. See `client/src/components/my-day/MyDayDateControl.tsx:17-22`.
- My Day due-date rendering does the same thing through `formatDate`, which also uses `new Date(dateStr)`. See `client/src/lib/utils.ts:49-57`, used in `client/src/components/my-day/AddTaskForm.tsx:226-235`.
- I verified this locally with `TZ=America/Los_Angeles`: `new Date('2026-03-07')` renders as **March 6, 2026**, and the "previous day" calculation becomes **2026-03-05**.
- Impact: a US-based developer can land on the wrong displayed date, navigate to the wrong day, and see Jira due dates shifted backward by one day.
- Recommendation: stop using `new Date('YYYY-MM-DD')` for local-day strings. Use `parseISO`, `shiftLocalIsoDate`, and explicit local-date formatting everywhere My Day handles day-only values.

### P1. Manager-to-developer handoff context is not reliably preserved for Manager Desk-backed work

- Manager Desk items have `contextNote`, but the main create/update/link sync paths call `syncTrackerAssignment` without passing any note. See `server/src/services/manager-desk.service.ts:241-248`, `server/src/services/manager-desk.service.ts:330-337`, and `server/src/services/manager-desk.service.ts:393-400`.
- The sync helper can pass a note, but only if a caller supplies it. See `server/src/services/manager-desk.service.ts:1036-1054`.
- On the Team Tracker side, when a linked item already exists for the same developer/date, sync updates only `itemType`, `jiraKey`, and `title`; it does not update `note`. See `server/src/services/team-tracker.service.ts:519-534`.
- Impact: the developer can receive assigned work in My Day without the latest manager context, or keep seeing stale context after the manager changes it.
- Recommendation: always sync `contextNote` into the tracker item for Manager Desk-backed assignments, update it on subsequent edits, and surface that the task came from a manager handoff.

### P1. A developer can mark themselves `blocked` or `waiting` without giving any reason

- The status UI is only a button set. See `client/src/components/my-day/StatusSelector.tsx:28-60`.
- The My Day status patch contract accepts only `date` and `status`. See `server/src/routes/my-day.ts:17-26`.
- The quick update flow can theoretically send a status with a check-in, but the UI never offers that combined action. `QuickUpdates` only submits text. See `client/src/components/my-day/QuickUpdates.tsx:14-18`. The handler supports an optional status, but the UI never uses it. See `client/src/components/my-day/useMyDayHandlers.ts:64-68`.
- Impact: the manager sees a red state change with no explanation, which weakens the screen's core job as the bridge between developer and manager.
- Recommendation: combine risky status changes with a reason field, or at minimum require/suggest an immediate check-in when switching to `blocked`, `waiting`, or `at_risk`.

### P1. "Recent Activity" is not actually a day activity log; it only shows check-ins

- My Day renders `RecentActivity` from `day.checkIns` only. See `client/src/components/my-day/MyDayRightColumn.tsx:82-91`.
- The shared contract carries author attribution only for `TrackerCheckIn`; task adds, task state changes, and status changes have no equivalent activity model. See `shared/types.ts:256-263` and `shared/types.ts:347-361`.
- The backend implementation notes explicitly called out broader audit/activity as desirable, but it was not built. See the absence of any activity data in `server/src/services/my-day.service.ts:32-46`.
- Impact: for an all-day workspace, developers and managers cannot reconstruct what changed, who changed it, or when major task transitions happened.
- Recommendation: add a tracker activity stream for task adds, current-task switches, done/drop actions, status changes, and manager-driven assignment edits, then render that in My Day instead of check-ins alone.

### P1. Activity order is undefined, but the UI treats the first entry as the newest

- `buildDeveloperDay` loads check-ins with no explicit ordering. See `server/src/services/team-tracker.service.ts:1049-1052`.
- `RecentActivity` visually highlights `idx === 0` as the lead item. See `client/src/components/my-day/RecentActivity.tsx:24-40`.
- Impact: the page can present the oldest update as the most important/latest one depending on database return order.
- Recommendation: sort check-ins by `createdAt DESC` in the backend and keep the UI consistent with that ordering.

### P1. Developers do not see the same freshness/risk signals the manager uses to judge them

- `TrackerDeveloperDay` includes `signals` and `statusUpdatedAt`. See `shared/types.ts:284-300`.
- `MyDayResponse` strips that down to `isStale` only. See `shared/types.ts:347-361` and `server/src/services/my-day.service.ts:32-46`.
- The My Day UI does not visibly use `isStale` either; it only shows the last check-in timestamp in the header. See `client/src/components/my-day/MyDayHeader.tsx:73-84`.
- Impact: the manager can see "stale", "no current item", "status changed without follow-up", or "overdue linked work", while the developer gets no actionable prompt to fix those states.
- Recommendation: expose the relevant signals in `MyDayResponse` and show lightweight nudges such as "No active task selected", "Manager will see this as stale", or "Add a follow-up to explain the blocked status."

### P1. Failed add-task and quick-update submissions discard what the developer typed

- `AddTaskForm` clears and closes itself immediately after calling `onAdd`, before any success is confirmed. See `client/src/components/my-day/AddTaskForm.tsx:44-56`.
- `QuickUpdates` clears its draft immediately after calling `onAddCheckIn`. See `client/src/components/my-day/QuickUpdates.tsx:14-19`.
- The handlers fire async mutations and only show toast feedback later. See `client/src/components/my-day/useMyDayHandlers.ts:60-68`.
- Impact: on a transient network or validation error, the developer loses the text they just typed and has to re-enter it.
- Recommendation: only clear drafts on mutation success, or preserve the failed draft and reopen the form with inline error state.

### P2. The backend supports task deletion, but My Day gives developers no way to remove accidental tasks

- The My Day API exposes `DELETE /api/my-day/items/:itemId`. See `server/src/routes/my-day.ts:134-143`.
- The My Day task actions only support set current, edit note, mark done, and drop. See `client/src/components/team-tracker/TrackerItemRowActions.tsx:92-173`.
- Impact: mistaken custom tasks, duplicates, and temporary scratch items can only be "dropped", which pollutes the rest of the day view.
- Recommendation: allow delete for eligible items, ideally with an undo toast for safety. Keep `drop` for intentional pauses or abandoned work.

### P2. The Jira picker is weak for fast daily capture

- It only renders results when the user has typed a search and there are matches. See `client/src/components/my-day/AddTaskForm.tsx:172-241`.
- There is no default suggestion list, no empty-state text when nothing matches, and results are capped to six client-filtered issues. See `client/src/components/my-day/AddTaskForm.tsx:23-33` and `client/src/components/my-day/AddTaskForm.tsx:194-240`.
- Impact: the developer has to remember keys or exact summaries, which is slower than it needs to be for a page intended for repeated use all day.
- Recommendation: show recent/assigned suggestions on open, add a no-results message, and move to server-side search if assignee issue counts get large.

### P2. Day-to-day continuity is still manager-driven, so My Day can feel empty the next morning

- My Day has a date picker, but no carry-forward awareness or unfinished-work prompt. See `client/src/components/my-day/MyDayPage.tsx:18-20` and `client/src/components/my-day/MyDayRightColumn.tsx:49-54`.
- Team Tracker carry-forward explicitly excludes Manager Desk-backed tasks by filtering out `managerDeskItemId !== null`. See `server/src/services/team-tracker.service.ts:871-876` and `server/src/services/team-tracker.service.ts:919-923`.
- Impact: a developer can end the day with legitimate open work and return the next morning to a board that does not explain where that work went or whether it still needs carrying forward.
- Recommendation: at minimum show a My Day continuity banner for unfinished prior-day work. Longer term, align carry-forward behavior across tracker-native and Manager Desk-linked items.

### P2. Discoverability and accessibility are weaker than they should be for an all-day workspace

- Several important controls are icon-only and rely on `title` instead of a robust accessible name. See `client/src/components/my-day/MyDayHeader.tsx:94-123` and `client/src/components/my-day/MyDayDateControl.tsx:27-45`.
- Planned/current task actions are mostly hover-revealed. See `client/src/components/team-tracker/TrackerItemRowActions.tsx:47-53`.
- Impact: keyboard users, touch users, and anyone learning the screen has to guess more than they should.
- Recommendation: add explicit `aria-label`s, improve focus styling, and keep primary task actions visible on touch/mobile breakpoints.

### P3. My Day test coverage does not cover the riskiest behaviors

- Existing frontend tests cover note/title edits and Jira issue loading, but not date handling, failed submissions retaining drafts, activity ordering, blocked-status reasoning, or deletion. See `client/src/test/MyDayPage.test.tsx`, `client/src/test/AddTaskForm.test.tsx`, and `client/src/test/PlannedQueue.test.tsx`.
- Existing route tests do not cover the cross-role handoff gaps, activity sequencing, or date-navigation correctness. See `server/tests/my-day.routes.test.ts`.
- Recommendation: add targeted tests for:
  - local-date parsing/navigation in US time zones
  - draft preservation on failed add/check-in
  - server ordering of check-ins
  - blocked/waiting flows requiring explanation
  - delete/undo task behavior
  - Manager Desk note sync into My Day

## What Works Well

- The page correctly enforces developer-only access and hides manager-only notes. See `server/src/routes/my-day.ts:79-80` and `server/src/services/my-day.service.ts:27-46`.
- The overall information architecture is close to the intended lightweight workflow: status, current task, planned queue, quick updates, completed work, dropped work, and recent activity are all present.
- Read-only handling for inactive days is clear and consistent, which is important for avoiding accidental edits. See `server/src/services/my-day.service.ts:113-117` and `client/src/components/my-day/MyDayInactiveBanner.tsx`.

## Recommended Sequence

1. Fix the timezone/date parsing bug first. It is a correctness issue for US users, not just a UX improvement.
2. Fix manager-to-developer handoff note sync so assigned work arrives with the right context.
3. Tighten the blocked/waiting flow by pairing status changes with explanation.
4. Preserve draft text on failed submissions and add delete/undo for accidental tasks.
5. Upgrade Recent Activity into a true activity stream and expose the same freshness/risk signals developers need to stay aligned with the manager view.
