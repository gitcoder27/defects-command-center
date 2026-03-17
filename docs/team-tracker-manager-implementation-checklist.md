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
- [ ] 4. Show check-in authorship and absolute timestamps. `Frontend-heavy, but Both`
- [ ] 5. Fix title editing in the drawer. `Frontend`
- [ ] 6. Add assignment-conflict visibility during Team Tracker task creation. `Both`
- [ ] 7. Add search, sorting, grouping, and saved views. `Both`
- [ ] 8. Add quick actions to attention cards. `Frontend-heavy, but Both`
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
Status: `Not started`

Planning checklist:

- [ ] Confirm desired carry-forward rules after item 1 is decided
- [ ] Review preview and execution logic for Manager Desk-backed items
- [ ] Define user-visible messaging for included/excluded work
- [ ] List backend logic changes
- [ ] List frontend preview/action updates
- [ ] Define tests for mixed task types and edge cases

Notes:

- This should follow directly after item 1 because lifecycle rules determine carry-forward behavior

## 3. Replace the Split Status/Check-In Flow With One Unified Action

Type: `Both`
Status: `Not started`

Planning checklist:

- [ ] Define the target interaction for status, rationale, follow-up, and note capture
- [ ] Decide which fields are required for `blocked` and `at_risk`
- [ ] Review existing mutation/API support and gaps
- [ ] List drawer UI/component changes
- [ ] List backend validation and persistence changes
- [ ] Define route/service and UI tests

Notes:

- The goal is to make risky status changes operationally complete in one step

## 4. Show Check-In Authorship and Absolute Timestamps

Type: `Frontend-heavy, but Both`
Status: `Not started`

Planning checklist:

- [ ] Confirm whether current API payload already includes required authorship/timestamp fields
- [ ] Define how authorship should appear in the drawer and related surfaces
- [ ] Decide where absolute timestamps are shown inline vs hover
- [ ] List API changes if needed
- [ ] List UI rendering changes
- [ ] Define tests for manager-authored vs developer-authored check-ins

Notes:

- This improves trust in activity history with relatively low workflow risk

## 5. Fix Title Editing in the Drawer

Type: `Frontend`
Status: `Not started`

Planning checklist:

- [ ] Confirm current row-open vs edit interaction conflict
- [ ] Choose the replacement pattern: edit icon, menu action, or other explicit control
- [ ] List affected drawer/task row components
- [ ] Define keyboard and focus behavior
- [ ] Define component tests

Notes:

- This is likely an isolated UI fix and a good contained change

## 6. Add Assignment-Conflict Visibility During Team Tracker Task Creation

Type: `Both`
Status: `Not started`

Planning checklist:

- [ ] Identify existing issue-assignment lookup capabilities we can reuse
- [ ] Define warning states and allowed manager actions
- [ ] List API/query changes required in Team Tracker flows
- [ ] List form/modal UI changes
- [ ] Define tests for duplicate and reassignment scenarios

Notes:

- This becomes more important once task lifecycle behavior is explicit

## 7. Add Search, Sorting, Grouping, and Saved Views

Type: `Both`
Status: `Not started`

Planning checklist:

- [ ] Define the minimum first slice: search, sort, grouping, or saved views
- [ ] Decide which controls are local UI state vs persisted view state
- [ ] Review backend ordering/filter support and gaps
- [ ] List board/query changes
- [ ] List UI control and layout changes
- [ ] Define tests for filtering/order stability

Notes:

- This is the main scalability improvement for larger teams

## 8. Add Quick Actions to Attention Cards

Type: `Frontend-heavy, but Both`
Status: `Not started`

Planning checklist:

- [ ] Choose the initial set of quick actions
- [ ] Confirm which existing mutations can be reused
- [ ] Define card interaction design and loading/error states
- [ ] List any missing backend endpoints or payload changes
- [ ] Define tests for action availability and success/failure paths

Notes:

- This should reduce repetitive drawer-open triage work

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
