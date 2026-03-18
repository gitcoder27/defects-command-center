# Team Tracker Manager Implementation Checklist

Date: 2026-03-17
Source review: [docs/team-tracker-manager-review.md](./team-tracker-manager-review.md)

## How to Use This Document

Work through the items in priority order unless we intentionally decide to reorder based on dependencies.

For each item:

- mark the main item complete when the change is fully implemented and validated
- use the planning checklist to capture the implementation plan before coding
- update notes with decisions, file targets, and test coverage

## Master Checklist

- [x] 1. Make the Team Tracker task lifecycle explicit. `Both`
- [ ] 2. Fix carry-forward so Team Tracker work carries forward predictably. `Backend-heavy, but Both`
- [ ] 3. Replace the split status/check-in flow with one unified action. `Both`
- [x] 4. Show check-in authorship and absolute timestamps. `Frontend-heavy, but Both`
- [x] 5. Fix title editing in the drawer. `Frontend`
- [x] 6. Add assignment-conflict visibility during Team Tracker task creation. `Both`
- [x] 7. Add search, sorting, grouping, and saved views. `Both`
- [x] 8. Add quick actions to attention cards. `Frontend-heavy, but Both`
- [ ] 9. Improve carry-forward UX with selective preview by developer/task. `Both`
- [ ] 10. Expand the inactive workflow with ranges, return dates, and reason presets. `Both`
- [ ] 11. Explain signal badges with thresholds and elapsed-time detail. `Both`
- [ ] 12. Add absolute timestamps across management history surfaces. `Frontend`
- [ ] 13. Fix narrow-layout behavior in the attention queue. `Frontend`
- [ ] 14. Optimize board loading for scale. `Backend`

---

## 1. Make the Team Tracker Task Lifecycle Explicit

Type: `Both`
Status: `Completed`

Planning checklist:

- [x] Confirm desired product model: always Manager Desk-backed vs tracker-local allowed
- [x] Identify all silent promotion/write-on-open paths
- [x] Define final user-facing behavior and copy
- [x] List backend contract and service changes
- [x] List frontend flow and state changes
- [x] Define validation and regression tests

Notes:

- Hidden cross-system behavior is the highest-risk workflow issue
- This decision affects carry-forward and assignment semantics downstream
- Final product model: Team Tracker is tracker-local first; Manager Desk linkage is explicit, not implicit
- Backend changes completed:
  - `TrackerWorkItem` now exposes lifecycle metadata
  - `GET /api/manager-desk/tracker-items/:trackerItemId/detail` is read-only and no longer creates Manager Desk data on open
  - `POST /api/manager-desk/tracker-items/:trackerItemId/promote` explicitly creates and links a Manager Desk follow-up
- Frontend changes completed:
  - Team Tracker add-task flows now create Team Tracker items directly instead of routing through Manager Desk creation
  - Task detail distinguishes tracker-only vs Manager Desk-linked work
  - Tracker-only detail exposes an explicit promote action instead of silent write-on-open behavior
- Backend validation completed:
  - `npm run test --workspace=server -- manager-desk.routes.test.ts`
  - `npm run test --workspace=server -- team-tracker.service.test.ts team-tracker.routes.test.ts`
  - `npm run typecheck`

## 2. Fix Carry-Forward So Team Tracker Work Carries Forward Predictably

Type: `Backend-heavy, but Both`
Status: `Backend complete, frontend pending`

Planning checklist:

- [x] Confirm desired carry-forward rules after item 1 is decided
- [x] Review preview and execution logic for Manager Desk-backed items
- [x] Define user-visible messaging for included/excluded work
- [x] List backend logic changes
- [x] List frontend preview/action updates
- [x] Define tests for mixed task types and edge cases

Notes:

- This should follow directly after item 1 because lifecycle rules determine carry-forward behavior
- Final carry-forward rule: Team Tracker now carries unfinished work regardless of whether the task is tracker-only or Manager Desk-linked
- Backend implementation completed:
  - Team Tracker carry-forward preview now counts unfinished linked tasks in addition to tracker-only tasks
  - Team Tracker carry-forward now routes linked tasks through `ManagerDeskService.carryForward(...)` so next-day tracker rows stay linked to new Manager Desk items instead of reusing the old link
  - Carry-forward dedupe now compares against all target-day tracker items, not only tracker-only rows
- Frontend follow-up remains:
  - align Team Tracker carry-forward copy/tests with the new inclusive behavior
  - no selective preview work here; that stays in item 9
- Backend validation completed:
  - `npm run test --workspace=server -- team-tracker.service.test.ts team-tracker.routes.test.ts manager-desk.routes.test.ts`
  - `npm run typecheck`
- Revalidated after item 3 backend changes:
  - `npm run test --workspace=server -- team-tracker.service.test.ts team-tracker.routes.test.ts`
  - `npm run typecheck`
- Frontend handoff prompt created:
  - `docs/team-tracker-carry-forward-predictable-frontend-agent.md`

## 3. Replace the Split Status/Check-In Flow With One Unified Action

Type: `Both`
Status: `Backend complete, frontend pending`

Planning checklist:

- [x] Define the target interaction for status, rationale, follow-up, and note capture
- [x] Decide which fields are required for `blocked` and `at_risk`
- [x] Review existing mutation/API support and gaps
- [x] List drawer UI/component changes
- [x] List backend validation and persistence changes
- [x] Define route/service and UI tests

Notes:

- The goal is to make risky status changes operationally complete in one step
- Decision: require a short rationale for `blocked` and `at_risk`; `waiting`, `on_track`, and `done_for_today` can be submitted without one
- Backend implementation completed:
  - added `POST /api/team-tracker/:accountId/status-update` for one manager action that records status, optional rationale, optional note, and optional next follow-up datetime together
  - unified status updates now create a structured Team Tracker check-in entry instead of relying on split `PATCH /day` plus optional note
  - `TrackerCheckIn` now includes optional `status`, `rationale`, and `nextFollowUpAt`
  - `TrackerDeveloperDay` now includes optional `nextFollowUpAt`
  - Team Tracker check-ins now persist manager authorship account ids from the manager route
  - any later check-in clears the pending `nextFollowUpAt` marker
- Frontend follow-up remains:
  - replace free-floating status pills with a single `Update Status` action flow in the drawer
  - route status changes through the new unified backend endpoint instead of split day/check-in mutations
  - keep or restyle general note-only check-ins separately as needed, but do not use them for status changes
- Backend validation completed:
  - `npm run test --workspace=server -- team-tracker.service.test.ts team-tracker.routes.test.ts`
  - `npm run typecheck`
- Frontend handoff prompt created:
  - `docs/team-tracker-unified-status-checkin-frontend-agent.md`

## 4. Show Check-In Authorship and Absolute Timestamps

Type: `Frontend-heavy, but Both`
Status: `Completed`

Planning checklist:

- [x] Confirm whether current API payload already includes required authorship/timestamp fields
- [x] Define how authorship should appear in the drawer and related surfaces
- [x] Decide where absolute timestamps are shown inline vs hover
- [x] List API changes if needed
- [x] List UI rendering changes
- [x] Define tests for manager-authored vs developer-authored check-ins

Notes:

- This improves trust in activity history with relatively low workflow risk
- Final scope: frontend-only for Team Tracker manager surfaces
- Check-ins now show role badges for `Manager` and `Developer` in the drawer, plus inline absolute timestamps alongside the relative time
- Existing relative `Last check-in` labels on Team Tracker cards and the attention queue now expose absolute timestamps via hover
- No API or shared contract changes were required because `TrackerCheckIn` already exposed `authorType`, `authorAccountId`, and `createdAt`
- Validation completed:
  - `npm run test --workspace=client -- TeamTracker.test.tsx utils.test.ts`
  - `npm run typecheck --workspace=client`

## 5. Fix Title Editing in the Drawer

Type: `Frontend`
Status: `Completed`

Planning checklist:

- [x] Confirm current row-open vs edit interaction conflict
- [x] Choose the replacement pattern: edit icon, menu action, or other explicit control
- [x] List affected drawer/task row components
- [x] Define keyboard and focus behavior
- [x] Define component tests

Notes:

- This was a contained frontend fix in the Team Tracker shared row component.
- Drawer rows now expose an explicit `Edit title` button so row click remains reserved for opening task detail.
- The main edits landed in:
  - `client/src/components/team-tracker/TrackerItemRow.tsx`
  - `client/src/components/team-tracker/TrackerItemRowActions.tsx`
  - `client/src/test/TeamTracker.test.tsx`
- Validation completed:
  - `npm run test --workspace=client -- TeamTracker.test.tsx MyDayPage.test.tsx`
  - `npm run typecheck`

## 6. Add Assignment-Conflict Visibility During Team Tracker Task Creation

Type: `Both`
Status: `Completed`

Planning checklist:

- [x] Identify existing issue-assignment lookup capabilities we can reuse
- [x] Define warning states and allowed manager actions
- [x] List API/query changes required in Team Tracker flows
- [x] List form/modal UI changes
- [x] Define tests for duplicate and reassignment scenarios

Notes:

- Added a shared Team Tracker conflict panel that reuses the existing assignment lookup hook and shows same-day Jira collisions when a Jira issue is selected.
- Both Team Tracker add-task entry points now surface the warning state and provide an `Open` action for existing assignments without blocking duplicate creation.
- The implementation stays read-only on the backend; it reuses the current `GET /api/team-tracker/issues/:jiraKey/assignment` contract.
- Validation completed:
  - `npm run test --workspace=client -- TeamTracker.test.tsx useTeamTracker.test.tsx`
  - `npm run typecheck --workspace=client`

## 7. Add Search, Sorting, Grouping, and Saved Views

Type: `Both`
Status: `Completed`

Planning checklist:

- [x] Define the minimum first slice: search, sort, grouping, and saved views together as the first scalability slice
- [x] Decide which controls are local UI state vs persisted view state
- [x] Review backend ordering/filter support and gaps
- [x] List board/query changes
- [x] List UI control and layout changes
- [x] Define tests for filtering/order stability

Notes:

- This is the main scalability improvement for larger teams
- Product decisions locked:
  - saved views are private per manager
  - backend is the source of truth for search, sorting, and grouping
  - default board sort is alphabetical by developer name
- Backend implementation completed:
  - `GET /api/team-tracker` now supports `q`, `summaryFilter`, `sortBy`, `groupBy`, and `viewId`
  - Team Tracker board responses now include resolved query metadata, grouped board data, and visible-summary counts
  - added manager-scoped saved-view CRUD endpoints at `/api/team-tracker/views`
  - added SQLite persistence for Team Tracker saved views
- Frontend implementation completed:
  - Team Tracker now exposes a board toolbar with debounced search, sort, grouping, and saved-view controls
  - summary chips now drive backend-backed `summaryFilter` state instead of only local board filtering
  - board rendering now supports grouped sections using backend `groups` while preserving flat rendering when grouping is disabled
  - saved views can be created, applied, updated, renamed, deleted, and cleared from the manager UI
  - board query state is now threaded through React Query so search/sort/group/view changes refetch stable server-backed results
- Backend validation completed:
  - `npm run test --workspace=server -- team-tracker.service.test.ts team-tracker.routes.test.ts`
  - `npm run typecheck`
- Frontend validation completed:
  - validated manually in the Team Tracker UI after frontend implementation
- Frontend handoff prompt created:
  - `agent/prompts/03-team-tracker-search-sorting-grouping-saved-views-frontend-prompt.md`

## 8. Add Quick Actions to Attention Cards

Type: `Frontend-heavy, but Both`
Status: `Completed`

Planning checklist:

- [x] Choose the initial set of quick actions
- [x] Confirm which existing mutations can be reused
- [x] Define card interaction design and loading/error states
- [x] List any missing backend endpoints or payload changes
- [x] Define tests for action availability and success/failure paths

Notes:

- This should reduce repetitive drawer-open triage work
- Initial shipped quick-action slice:
  - `update_status`
  - `set_current`
  - `mark_inactive`
  - `capture_follow_up`
- Frontend implementation completed:
  - attention cards now render an inline quick-action strip
  - `Update Status` opens a compact status sheet with rationale and optional follow-up time
  - `Set Current` uses the backend-provided candidate list and supports direct or menu-based selection
  - `Mark Inactive` reuses the existing inactive flow
  - `Capture Follow-Up` opens the existing Manager Desk capture dialog with developer linkage
- Backend implementation completed:
  - Team Tracker attention items now expose `availableQuickActions`, `setCurrentCandidates`, and `nextFollowUpAt`
  - `set_current` is only advertised when the developer has no current item and has at least one planned item
  - quick actions intentionally reuse existing backend APIs instead of adding new write endpoints
- Deferred from this slice:
  - `request_update`
  - `snooze`
  - `acknowledge`
- Frontend follow-up remains:
  - render inline actions on attention cards using the new attention metadata
  - use existing Team Tracker and Manager Desk mutations for execution
  - decide compact inline layout vs overflow menu, loading states, and error toasts
- Backend validation target:
  - `npm run test --workspace=server -- team-tracker.service.test.ts team-tracker.routes.test.ts`
  - `npm run typecheck`
- Frontend validation completed:
  - `npm run test --workspace=client -- AttentionCardQuickActions.test.tsx`
  - `npm run test --workspace=client -- TeamTracker.test.tsx`
  - `npm run typecheck`
- Frontend handoff prompt created:
  - `agent/prompts/03-team-tracker-attention-card-quick-actions-frontend-prompt.md`

## 9. Improve Carry-Forward UX With Selective Preview by Developer/Task

Type: `Both`
Status: `Not started`

Planning checklist:

- [ ] Define preview granularity and selection rules
- [ ] Review whether backend carry-forward logic can support partial selection
- [ ] Design the preview UI and selection behavior
- [ ] List API/service changes
- [ ] List modal/dialog UI changes
- [ ] Define tests for partial carry-forward scenarios

Notes:

- This should come after item 2 so the base carry-forward rules are already correct

## 10. Expand the Inactive Workflow With Ranges, Return Dates, and Reason Presets

Type: `Both`
Status: `Not started`

Planning checklist:

- [ ] Define supported availability states and date semantics
- [ ] Decide whether partial-day/OOO distinctions are needed in the first version
- [ ] List schema/API changes
- [ ] List dialog/tray/board UI changes
- [ ] Define tests for inactive and reactivation flows

Notes:

- This adds operational depth rather than fixing a core trust issue

## 11. Explain Signal Badges With Thresholds and Elapsed-Time Detail

Type: `Both`
Status: `Not started`

Planning checklist:

- [ ] Confirm which signal metadata is already available from the backend
- [ ] Define the explanation format for cards, queue items, and drawer surfaces
- [ ] List API enrichment changes if needed
- [ ] List tooltip/inline detail UI changes
- [ ] Define tests for signal explanation rendering

Notes:

- This should improve manager confidence in the attention model

## 12. Add Absolute Timestamps Across Management History Surfaces

Type: `Frontend`
Status: `Not started`

Planning checklist:

- [ ] Identify all relative-time-only surfaces
- [ ] Choose a consistent absolute timestamp format
- [ ] Define inline vs hover treatment
- [ ] List component updates
- [ ] Define UI tests if coverage is practical

Notes:

- Some of this may overlap with item 4 and can be combined if useful

## 13. Fix Narrow-Layout Behavior in the Attention Queue

Type: `Frontend`
Status: `Not started`

Planning checklist:

- [ ] Review current breakpoint behavior and cramped states
- [ ] Define the responsive card layout for narrow widths
- [ ] List component/style changes
- [ ] Validate desktop and mobile/narrow viewport behavior

Notes:

- This is lower priority unless current layouts are blocking real usage

## 14. Optimize Board Loading for Scale

Type: `Backend`
Status: `Not started`

Planning checklist:

- [ ] Profile or inspect the current sequential board build path
- [ ] Define the target query/data-loading strategy
- [ ] Review polling frequency assumptions after optimization
- [ ] List service/data-access changes
- [ ] Define performance validation approach
- [ ] Define regression coverage for board output integrity

Notes:

- This should be scheduled before larger-team rollout pressure makes board latency visible
