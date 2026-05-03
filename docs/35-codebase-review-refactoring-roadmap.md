# Codebase Review And Refactoring Roadmap

Date: 2026-04-27

This document is the source-of-truth handoff for maintainability, architecture, and correctness work discovered during a senior engineering review of the repository. It is intended for human engineers and AI agents working in this codebase.

The goal is not broad cosmetic refactoring. The goal is to fix real maintainability and correctness risks while preserving existing behavior.

## Agent Instructions

Before implementing any item from this document:

- Work from `/home/ubuntu/Development/lead-os` unless explicitly told otherwise.
- Keep changes task-scoped and small.
- Do not refactor unrelated files.
- Do not split simple logic just to make files smaller.
- Prefer existing project patterns over new abstractions.
- Add or update tests for behavior changes, especially server workflow changes and frontend interaction bugs.
- Validate with the narrowest useful command first, then broaden as needed:
  - `npm run typecheck`
  - `npm run build:check`
  - `npm run test`
  - `npm run test --workspace=client`
- For frontend fixes, add focused Vitest coverage where practical.
- For server route/service behavior, prefer route-level tests plus service tests where the behavior crosses module boundaries.
- Do not deploy production from this development checkout.

## Executive Summary

The codebase is functional and has meaningful test coverage around newer workflow surfaces, but it shows signs of rapid AI-assisted growth:

- large feature services
- very large React pages
- duplicated API contracts
- repeated UI workflows
- direct API orchestration inside UI components
- several hidden correctness risks around linked Team Tracker and Manager Desk workflows

The codebase is acceptable for continued development, but more feature work in Team Tracker, Manager Desk, Settings, or onboarding should be preceded by a focused stabilization pass.

## Overall Assessment

| Area | Rating | Notes |
|---|---|---|
| Maintainability | Needs Improvement | Main risk is concentrated feature files and duplicated contracts. |
| Readability | Acceptable | Most code is readable locally, but large files require too much context. |
| Architecture | Needs Improvement | Service and route boundaries are uneven; some UI owns data workflows. |
| File organization | Acceptable | Feature folders exist and are mostly useful. |
| Component/class/function size | Needs Improvement | Several files are too large for safe continued growth. |
| Duplication | Needs Improvement | Shared types, date helpers, Jira pickers, settings/setup workflows repeat. |
| Risk of bugs | Needs Improvement | Several concrete correctness bugs were found. |
| Ease of future development | Needs Improvement | New changes in key surfaces will be slower until hotspots are stabilized. |

## Top Priorities

These are the highest-value fixes. Do these before broad cleanup.

- [x] Add transactions around linked Manager Desk and Team Tracker write workflows.
- [x] Fix Team Tracker current-item behavior so it does not rewrite historical rows.
- [x] Enable SQLite foreign keys and tighten migration error handling.
- [x] Migrate client API contracts from local copies to `shared/types`.
- [x] Fix frontend workflow bugs:
  - [x] Team Tracker drawer reorder can move the wrong item.
  - [x] Tracker notes cannot be cleared.
  - [x] Manager Desk optional fields cannot be cleared.
  - [x] Team Tracker follow-up capture uses today instead of selected board date.
  - [x] Manager Desk datetime fields can shift between local time and UTC.
- [x] Make Zod validation middleware use parsed output.

## Critical Refactoring Needed

### 1. Make Linked Manager Desk / Team Tracker Writes Atomic

Files:

- `server/src/services/manager-desk.service.ts`
- `server/src/services/team-tracker.service.ts`

Problem:

Manager Desk and Team Tracker workflows perform multi-table writes through separate awaits. Examples include:

- create Manager Desk item
- update Manager Desk item
- add/delete Manager Desk links
- delete Manager Desk item
- cancel delegated task
- carry Manager Desk items forward
- sync Manager Desk items into Team Tracker
- carry Team Tracker items forward when linked to Manager Desk

Why it matters:

A mid-flow error can leave inconsistent state:

- Manager Desk item exists but tracker item was not synced.
- Link was written but history was not recorded.
- Tracker item was deleted but Manager Desk was not updated.
- Carry-forward partially moved some rows but not related records.

Recommended refactor:

- Introduce explicit transactions around each use case that touches multiple tables or surfaces.
- Keep domain logic visible; do not hide everything behind a generic repository layer.
- Prefer small transaction wrappers around concrete use cases.
- Add regression tests that simulate failure where feasible, or assert linked state after workflow completion.

Suggested implementation checklist:

- [x] Identify write workflows in `ManagerDeskService` that touch more than one table/service.
- [x] Identify linked write workflows in `TeamTrackerService`.
- [x] Add transaction helper using the existing SQLite/Drizzle setup.
- [x] Wrap Manager Desk create/update/link/delete/carry-forward workflows.
- [x] Wrap Team Tracker carry-forward and Manager Desk sync workflows.
- [ ] Add tests for successful linked state.
- [ ] Add at least one test proving partial state is not persisted on a forced failure, if practical.

Risk level: Critical

Estimated difficulty: Medium

Timing: Now

### 2. Fix Historical Mutation When Setting Current Work

File:

- `server/src/services/team-tracker.service.ts`

Problem:

`setSingleInProgressThroughDate` demotes every in-progress item for a developer on all days up to `throughDate`. Setting today's current item can mutate yesterday's stored item state.

Why it matters:

History should be stable. If historical tracker rows are changed by future actions, past board views and audit/debugging behavior become untrustworthy.

Recommended refactor:

- Add a cross-day regression test first.
- Clarify the desired product rule:
  - If history must be immutable, only mutate the active day.
  - If live carry-over is intended, compute that as a read-model/projection instead of rewriting older rows.
- Narrow the mutation scope or introduce a dedicated live-workspace state model.

Suggested implementation checklist:

- [x] Add a service test with yesterday and today both containing work.
- [x] Set a current item for today.
- [x] Assert yesterday's in-progress item remains unchanged.
- [x] Refactor `setSingleInProgressThroughDate` to avoid mutating historical days.
- [x] Re-run Team Tracker service and route tests.

Risk level: High

Estimated difficulty: Medium

Timing: Now

### 3. Remove Client / Shared Type Drift

Files:

- `shared/types.ts`
- `client/src/types/index.ts`
- `client/src/types/manager-desk.ts`
- client files importing from `@/types`

Problem:

The client has local copies of API contracts that overlap with `shared/types.ts`. These have already drifted. Examples found during review:

- shared `TrackerCheckIn` contains fields that the client copy omits or weakens
- shared `TrackerWorkItem.lifecycle` is stricter than the client copy
- Manager Desk types are mirrored locally even though shared versions exist

Why it matters:

The shared contract boundary is weakened. TypeScript may say code is safe while client and server actually disagree.

Recommended refactor:

- Migrate client imports to `shared/types` for API/domain contracts.
- Keep local client types only for UI-only state, labels, and view models.
- Avoid a big-bang change if it becomes risky; migrate by feature area.

Suggested implementation checklist:

- [x] Inventory imports from `@/types`.
- [x] Identify types that are pure API/domain contracts.
- [x] Replace those imports with `shared/types`.
- [x] Keep UI-specific types in `client/src/types`.
- [x] Delete duplicated local types once unused.
- [x] Run `npm run typecheck`.
- [x] Update tests if stricter shared types expose real assumptions.

Risk level: High

Estimated difficulty: Medium

Timing: Now

### 4. Enable SQLite Foreign Keys And Tighten Migrations

Files:

- `server/src/db/connection.ts`
- `server/src/db/migrate.ts`

Problem:

SQLite foreign keys are declared in migrations, but foreign key enforcement is not enabled with `PRAGMA foreign_keys = ON`.

The migration loop also catches all alter statement failures and treats them as expected duplicate-column cases.

Why it matters:

- Declared foreign keys may not actually protect data integrity.
- Real migration failures can be silently ignored, creating schema drift.

Recommended refactor:

- Enable `foreign_keys = ON` during connection setup.
- Confirm existing tests and data do not rely on orphan rows.
- Narrow migration error handling:
  - ignore known duplicate-column/index cases only
  - log or throw unexpected failures

Suggested implementation checklist:

- [x] Add `sqlite.pragma("foreign_keys = ON")` in connection setup.
- [x] Run backend tests.
- [x] Confirm backend tests do not fail due to delete ordering.
- [x] Replace broad migration catch with known-error handling.
- [ ] Add a migration test if existing test setup supports it.

Risk level: High

Estimated difficulty: Small to Medium

Timing: Now

### 5. Use Parsed Zod Validation Output

File:

- `server/src/middleware/validate.ts`

Problem:

The validation middleware parses `{ body, params, query }` but discards the sanitized/defaulted/coerced values. Route handlers continue using raw Express values.

Why it matters:

This makes `.trim()`, `.default()`, transforms, and future `z.coerce` schemas misleading. A route can appear validated but still operate on the unparsed request data.

Recommended refactor:

- After successful validation, assign parsed `body`, `params`, and `query` back to the request.
- Or store parsed values in a typed location such as `res.locals.validated`.
- Keep implementation simple.

Suggested implementation checklist:

- [x] Update validation middleware to preserve parsed output.
- [x] Run route tests.
- [x] Check routes that rely on optional/default values.
- [ ] Add or update one test proving a trimmed/defaulted value is used.

Risk level: Medium

Estimated difficulty: Small

Timing: Now

### 6. Split Settings Into Workflow Hooks And Sections

File:

- `client/src/components/settings/SettingsPanel.tsx`

Problem:

`SettingsPanel.tsx` is about 1,961 lines and owns too many concerns:

- settings navigation
- Jira config form
- custom field discovery
- team discovery
- team add/remove mutations
- app-user CRUD
- password generation
- sync/reset/logout side effects
- cache invalidation
- six major UI sections

Why it matters:

Any Settings change risks unrelated behavior. The component bypasses the existing hook pattern by doing many direct `api.*` calls inside the component.

Recommended refactor:

Keep a thin `SettingsShell`, then extract:

- `ConnectionSection`
- `SyncSection`
- `TeamSection`
- `TagsSection` already exists through `TagManagementSection`
- `MaintenanceSection` already exists through `SettingsMaintenanceSection`
- `AccessSection`

Extract hooks:

- `useSettingsConfigForm`
- `useJiraFieldPicker`
- `useTeamMembershipSettings`
- `useAppUsers`
- shared invalidation helper for team-scope data

Suggested implementation checklist:

- [ ] Extract data hooks first without changing UI.
- [ ] Move auth-user list/create/delete calls out of component.
- [ ] Move Jira field discovery out of component.
- [ ] Move team discovery/pagination/selection/mutation state out of component.
- [ ] Extract one section at a time.
- [ ] Keep `TagManagementSection` and `SettingsMaintenanceSection` as examples of the desired split.
- [ ] Update `SettingsPanel.test.tsx` incrementally.

Risk level: High

Estimated difficulty: Medium to Large

Timing: Now, especially before adding more Settings behavior

### 7. Reduce Team Tracker And Manager Desk Service Overload

Files:

- `server/src/services/team-tracker.service.ts`
- `server/src/services/manager-desk.service.ts`

Problem:

`TeamTrackerService` is about 2,723 lines and mixes:

- board assembly
- saved views
- day CRUD
- item lifecycle
- issue assignment lookup
- carry-forward
- Manager Desk sync
- ordering rules

`ManagerDeskService` is about 2,082 lines and mixes:

- day views
- item CRUD
- link normalization
- history snapshots
- carry-forward
- lineage cleanup
- tracker promotion/sync
- lookups

Why it matters:

Future changes require loading thousands of lines and understanding cross-surface coupling. The services are currently doing too many use cases.

Recommended refactor:

Do not create a generic abstract engine. Extract focused, domain-named modules:

- shared date helpers
- carry-forward planning
- desk-tracker linkage/sync
- Team Tracker board query/read-model helpers
- Manager Desk link normalization
- Manager Desk history writer

Suggested implementation checklist:

- [ ] Extract date helpers first.
- [ ] Extract Team Tracker carry-forward planning into a focused module.
- [ ] Extract Manager Desk carry-forward/lineage planning into a focused module.
- [ ] Extract Manager Desk link normalization.
- [ ] Extract Manager Desk history persistence.
- [ ] Extract Team Tracker issue assignment read model or query helper.
- [ ] Keep public service methods stable during extraction.
- [ ] Run backend tests after each extraction.

Risk level: High

Estimated difficulty: Large

Timing: Phased, starting now with date/carry-forward/linkage extraction

## Concrete Frontend Bugs To Fix

### Team Tracker Drawer Reorder Can Move The Wrong Item

File:

- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx`

Problem:

The reorder handler compares the first changed index after a drag. If the user moves `B` from `[A, B, C, D]` to `[A, C, D, B]`, the code can identify `C` as the moved item.

Recommended fix:

- Track the dragged item id.
- Reuse the safer pattern in `client/src/components/my-day/PlannedQueue.tsx`.
- Add a regression test for dragging an item downward by more than one slot.

Checklist:

- [x] Track dragged item id in `DeveloperTrackerDrawer`.
- [x] Send the dragged item id with the new target position.
- [ ] Add regression test.
- [x] Run frontend tests for Team Tracker.

Risk level: High

Difficulty: Small to Medium

Timing: Now

### Tracker Notes Cannot Be Cleared

File:

- `client/src/components/team-tracker/TrackerItemRow.tsx`

Problem:

Saving an empty note sends `undefined`. `JSON.stringify` omits `undefined`, and the backend updates note only when the field is present. The old note returns after invalidation.

Recommended fix:

- Standardize clear semantics.
- Use `null` or empty string intentionally.
- Update route/service types if needed so clearing is explicit and tested.

Checklist:

- [x] Decide whether clear means `null` or `""`.
- [x] Update frontend payload.
- [x] Update route schema/service input if required.
- [x] Add test for clearing tracker note.

Risk level: High

Difficulty: Small to Medium

Timing: Now

### Manager Desk Optional Fields Cannot Be Cleared

File:

- `client/src/components/manager-desk/ItemDetailDrawer.tsx`

Problem:

Blank values are converted to `undefined`. `JSON.stringify` drops them, so optional fields are not cleared on the server.

Affected fields include:

- context note
- next action
- participants
- outcome
- planned dates/times
- follow-up date/time

Recommended fix:

- Send explicit `null` for cleared optional fields.
- Align frontend payloads with server update semantics.
- Add tests for clearing optional fields.

Checklist:

- [x] Audit all optional field saves in Manager Desk detail drawer.
- [x] Send `null` for intentional clears.
- [x] Add frontend test for clearing at least one text field and one date/time field.
- [ ] Add route/service test if coverage is missing.

Risk level: High

Difficulty: Medium

Timing: Now

### Follow-Up Capture Uses Today Instead Of Selected Tracker Date

File:

- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx`

Problem:

The follow-up capture dialog does not pass the drawer or board date, so `ManagerDeskCaptureDialog` falls back to local today. Future-date Team Tracker follow-ups can land on the wrong date.

Recommended fix:

- Pass the selected board/drawer date into the capture dialog.
- Add a regression test for a non-today board date.

Checklist:

- [x] Pass `date={date}` or equivalent to the capture dialog.
- [ ] Add test with future date.

Risk level: Medium

Difficulty: Small

Timing: Now

### Datetime Fields Can Shift After Save

File:

- `client/src/components/manager-desk/DrawerProperties.tsx`

Problem:

`datetime-local` values are displayed by slicing a UTC ISO string and saved with `toISOString()`. In non-UTC browsers, a local 10:00 value can come back displayed as a shifted UTC time.

Recommended fix:

- Add local datetime conversion helpers.
- Do not use raw `slice(0, 16)` for datetime-local display.
- Do not use `toISOString()` unless the product explicitly wants UTC storage/display.

Checklist:

- [x] Add helper for ISO-to-local-input value.
- [x] Add helper for local-input-to-stored value.
- [x] Update `DrawerProperties`.
- [ ] Add timezone-sensitive tests if practical.

Risk level: Medium

Difficulty: Small to Medium

Timing: Now

## High-Value Improvements

### Validate Developer App Users Against Active Developers

File:

- `server/src/services/auth.service.ts`

Problem:

Developer user creation accepts any `developerAccountId`.

Why it matters:

My Day and Team Tracker flows assume developer app users map to real active developers. A bad account id can create confusing failures later.

Checklist:

- [x] On developer user creation, verify `developerAccountId` exists.
- [x] Decide whether inactive developers are allowed. Default recommendation: require active developer.
- [ ] Add auth route/service tests.

Risk level: Medium

Difficulty: Small to Medium

Timing: Now

### Team Tracker Carry-Forward Needs Date-Order Validation

File:

- `server/src/services/team-tracker.service.ts`

Problem:

Manager Desk rejects same-day or backwards carry-forward, but Team Tracker only validates date shape.

Checklist:

- [ ] Add shared date-order helper.
- [x] Reject `toDate <= fromDate`.
- [x] Add service and route tests.

Risk level: Medium

Difficulty: Small

Timing: Now

### Missing Team Tracker Items Should Return 404

File:

- `server/src/services/team-tracker.service.ts`

Problem:

`getItemRow` throws a plain `Error` when an item is missing. Route-level update/delete/set-current can return 500 instead of 404.

Checklist:

- [x] Throw `HttpError(404, "Item not found")`.
- [x] Add/update route tests.

Risk level: Medium

Difficulty: Small

Timing: Now

### Move Config And Team Route DB Orchestration Into Services

Files:

- `server/src/routes/config.ts`
- `server/src/routes/team.ts`

Problem:

Routes directly perform config DB reads/writes, Jira client setup, team persistence, legacy cleanup, and broad destructive reset behavior.

Recommended refactor:

- Create or expand settings/config/team services.
- Keep route handlers thin.
- Move legacy `/api/config/reset` behavior behind `WorkspaceMaintenanceService` or clearly mark/deprecate it.

Checklist:

- [ ] Extract config value helpers from route.
- [ ] Centralize Jira credential lookup.
- [ ] Move team discovery and save/remove behavior into a service.
- [ ] Review `/api/config/reset` against newer maintenance reset flow.

Risk level: Medium

Difficulty: Medium

Timing: Later unless touching config/team behavior

### Repeated Jira Task Picker

Files:

- `client/src/components/my-day/AddTaskForm.tsx`
- `client/src/components/team-tracker/AddTrackerItemForm.tsx`
- `client/src/components/team-tracker/QuickAddTaskModal.tsx`
- `client/src/components/capture/TrackerCaptureForm.tsx`

Problem:

Task/Jira issue picker state and rendering are duplicated. Behavior has already diverged between My Day and Team Tracker.

Recommended refactor:

- Extract `useIssuePicker`.
- Extract selected issue chip and issue result list components.
- Keep workflow-specific conflict handling configurable.

Checklist:

- [ ] Identify common picker state.
- [ ] Extract hook.
- [ ] Extract presentational picker pieces.
- [ ] Migrate one flow at a time.
- [ ] Add tests around selection/reset behavior.

Risk level: Medium

Difficulty: Small to Medium

Timing: Now or when touching task entry flows

## Large Files And Responsibility Boundaries

| File | Size | Responsibility Problem | Should Split? | Suggested Split |
|---|---:|---|---|---|
| `server/src/services/team-tracker.service.ts` | approx. 2,723 lines | Board, saved views, day CRUD, item lifecycle, assignment lookup, carry-forward, Manager Desk sync. | Yes | Date helpers, carry-forward planner, board query/read model, desk linkage, assignment read model. |
| `server/src/services/manager-desk.service.ts` | approx. 2,082 lines | Desk CRUD, links, history, carry-forward, lineage, tracker promotion/sync, lookups. | Yes | Carry-forward/lineage planner, link normalization, history writer, tracker sync adapter. |
| `client/src/components/settings/SettingsPanel.tsx` | approx. 1,961 lines | Settings navigation, forms, discovery, mutations, cache invalidation, app users, UI sections. | Yes | Shell plus section components and workflow hooks. |
| `client/src/components/setup/SetupWizard.tsx` | approx. 1,321 lines | Wizard state, Jira setup, manager/team mapping, developer accounts, sync. Uses `any` prop bags. | Yes | Typed step components and `useSetupWizardFlow`. |
| `client/src/components/table/DefectTable.tsx` | approx. 950 lines | Table state, columns, status filter, row indicators, search, inline edit wiring. | Later | Column factory, status filter popover, row-state helper. |
| `client/src/components/layout/DashboardLayout.tsx` | approx. 464 lines | Dashboard shell, filters, keyboard nav, highlight timers, sidebar state. | Later only | Extract hooks only when touching behavior. |

## Duplication And Repeated Patterns

### Remove Now

- Client copies of shared API types.
- Date/date-order helpers in server services.
- Settings and setup direct API workflow duplication.
- Task/Jira picker state and rendering, if task-entry work is planned.

### Tolerate For Now

- `shared/types.ts` as a single file.
- Small UI duplication in simple work-list components.
- Large pure helper blocks for Team Tracker sorting and attention logic.
- Large test files, unless they become too hard to navigate during active work.

### Clean Opportunistically

- Inline style repetition.
- Decorative section comments.
- Repeated route schema envelopes.
- Repeated small loading/error UI.

## Architecture And Structure Issues

### Route Boundaries

Routes should stay thin, but some routes still own too much:

- `server/src/routes/config.ts`
- `server/src/routes/team.ts`

Refactor when touching those areas. Do not do a broad route rewrite by itself.

### Service Boundaries

Team Tracker and Manager Desk services are acting as large use-case containers. Extract concrete submodules only where they reduce real complexity:

- date helpers
- carry-forward planning
- history writer
- link normalizer
- desk-tracker sync adapter
- issue assignment read model

Avoid abstract repositories or generic workflow engines unless repeated behavior clearly justifies them.

### Read Paths That Write

Some read/preview paths call `ensureDay`, which writes rows. This is convenient but surprising.

Leave this alone for now unless:

- auditability becomes important
- empty days clutter data
- previews create unwanted rows
- production debugging shows confusion

### Multi-Manager Semantics

Linked tracker tasks currently assume a Manager Desk item can be resolved by the active manager context. If the product supports multiple managers, clarify ownership and access rules.

Checklist:

- [ ] Confirm whether multi-manager use is supported.
- [ ] If single-manager is an invariant, document/enforce it.
- [ ] If multi-manager is real, add ownership-aware linking semantics.

## Code That Should Not Be Refactored Right Now

Do not spend time on these unless a related feature requires touching them:

- `shared/types.ts` file split. First remove duplicate client types.
- `client/src/App.tsx`. It is acceptable for the current route count.
- `client/src/components/layout/DashboardLayout.tsx`. Dense but cohesive.
- Team Tracker pure sorting/attention helper blocks.
- Legacy carry-forward cleanup code, unless changing carry-forward lineage.
- Large test files, unless adding tests becomes painful.

## Recommended Refactoring Roadmap

### Phase 1 - Must Fix

Primary objective: stabilize correctness and contracts.

- [x] Add DB transaction coverage for linked Manager Desk and Team Tracker workflows.
- [x] Fix `setSingleInProgressThroughDate` historical mutation.
- [x] Enable SQLite foreign keys.
- [x] Tighten migration alter error handling.
- [x] Migrate client contracts to `shared/types`.
- [x] Update validation middleware to use parsed Zod output.
- [x] Fix Team Tracker drawer reorder bug.
- [x] Fix tracker note clearing.
- [x] Fix Manager Desk optional field clearing.
- [x] Fix Team Tracker follow-up capture date.
- [x] Fix Manager Desk datetime local/UTC conversion.
- [x] Add date-order validation for Team Tracker carry-forward.
- [x] Return 404 for missing Team Tracker item operations.
- [x] Validate developer app users against active developers.

Suggested validation for Phase 1:

- [x] `npm run typecheck`
- [x] `npm run build:check`
- [x] `npm run test`
- [x] `npm run test --workspace=client`

### Phase 2 - Should Fix

Primary objective: reduce future change cost in active feature areas.

- [ ] Extract shared server date helpers.
- [ ] Extract Team Tracker carry-forward planning.
- [ ] Extract Manager Desk carry-forward/lineage planning.
- [ ] Extract Manager Desk link normalization.
- [ ] Extract Manager Desk history writer.
- [ ] Extract Team Tracker issue assignment read model/query helper.
- [ ] Split Settings data workflows into hooks.
- [ ] Split Settings UI into section components.
- [ ] Add shared Zod schemas for:
  - [ ] ISO date
  - [ ] date order
  - [ ] item id params
  - [ ] tracker status
  - [ ] manager desk status/category/priority/kind
- [ ] Move config/team route DB orchestration into services.
- [ ] Consolidate Jira task picker hook/components.

Suggested validation for Phase 2:

- [ ] Targeted backend service/route tests for extracted modules.
- [ ] `npm run test`
- [ ] Relevant frontend tests.
- [ ] `npm run typecheck`
- [ ] `npm run build:check`

### Phase 3 - Optional Cleanup

Primary objective: improve navigation and polish after correctness work is stable.

- [ ] Split `SetupWizard` into typed step components.
- [ ] Extract `useSetupWizardFlow`.
- [ ] Reuse Settings hooks in Setup where appropriate.
- [ ] Extract DefectTable column factory.
- [ ] Extract DefectTable status filter popover.
- [ ] Extract DefectTable row-state calculation.
- [ ] Split very large test files by behavior area.
- [ ] Reduce inline style repetition while touching affected components.
- [ ] Remove stale/orphaned UI if product confirms it is unused:
  - [ ] Manager Desk carry-forward dialog/prompt remnants.
  - [ ] unused draft section surfaces.

## Suggested Work Packages For AI Agents

Use these as independent task briefs.

### Work Package A - DB Integrity And Transactions

Scope:

- `server/src/db/connection.ts`
- `server/src/db/migrate.ts`
- `server/src/services/manager-desk.service.ts`
- `server/src/services/team-tracker.service.ts`
- backend tests

Checklist:

- [x] Enable foreign keys.
- [x] Tighten migration error handling.
- [x] Add transaction wrapper/helper.
- [x] Wrap linked write workflows.
- [ ] Add tests.
- [x] Run backend tests.

Do not:

- Rewrite all services.
- Change unrelated schema.

### Work Package B - Team Tracker Correctness Fixes

Scope:

- `server/src/services/team-tracker.service.ts`
- `server/src/routes/team-tracker.ts`
- Team Tracker tests
- related frontend only if needed

Checklist:

- [x] Fix historical mutation from current-item updates.
- [x] Add date-order validation for carry-forward.
- [x] Return 404 for missing item operations.
- [ ] Add regression tests.

Do not:

- Redesign board sorting or attention scoring.

### Work Package C - Client Shared Type Migration

Scope:

- `shared/types.ts`
- `client/src/types/index.ts`
- `client/src/types/manager-desk.ts`
- client imports

Checklist:

- [x] Replace API/domain imports with `shared/types`.
- [x] Preserve client-only UI types.
- [x] Remove duplicate local definitions.
- [x] Run typecheck.
- [x] Fix legitimate type mismatches.

Do not:

- Split `shared/types.ts` during this work.

### Work Package D - Frontend Workflow Bug Fixes

Scope:

- `client/src/components/team-tracker/DeveloperTrackerDrawer.tsx`
- `client/src/components/team-tracker/TrackerItemRow.tsx`
- `client/src/components/manager-desk/ItemDetailDrawer.tsx`
- `client/src/components/manager-desk/DrawerProperties.tsx`
- related hooks/tests

Checklist:

- [x] Fix reorder moved-item identity.
- [x] Fix tracker note clearing.
- [x] Fix Manager Desk optional field clearing.
- [x] Pass selected date into follow-up capture.
- [x] Add local datetime helpers.
- [x] Add focused tests.

Do not:

- Redesign UI layout.

### Work Package E - Settings Split

Scope:

- `client/src/components/settings/SettingsPanel.tsx`
- `client/src/components/settings/*`
- `client/src/hooks/*`
- `client/src/lib/api.ts`
- Settings tests

Checklist:

- [ ] Extract app-user hooks.
- [ ] Extract Jira field discovery hook.
- [ ] Extract team discovery/membership hook.
- [ ] Extract config form hook.
- [ ] Extract section components.
- [ ] Keep behavior unchanged.
- [ ] Update tests.

Do not:

- Combine this with visual redesign.

### Work Package F - Service Decomposition

Scope:

- `server/src/services/team-tracker.service.ts`
- `server/src/services/manager-desk.service.ts`
- new focused service/helper modules
- backend tests

Checklist:

- [ ] Extract shared date helpers.
- [ ] Extract carry-forward planning modules.
- [ ] Extract link normalization/history writer.
- [ ] Keep public service methods stable.
- [ ] Run tests after each extraction.

Do not:

- Create a generic repository layer.
- Create a generic carry-forward engine unless concrete duplication remains after smaller extractions.

## Final Recommendation

The safest next step is a focused stabilization pass, not a broad rewrite.

Fix these first:

1. transactions
2. historical Team Tracker mutation
3. SQLite foreign key and migration safety
4. client/shared type drift
5. validation parsed output
6. frontend workflow bugs

Leave these for later:

1. broad UI polish
2. generic abstractions
3. splitting `shared/types.ts`
4. large test-file reshuffling
5. DefectTable extraction unless table behavior is already being changed

Once Phase 1 is complete, the codebase should be much safer for continued feature development.
