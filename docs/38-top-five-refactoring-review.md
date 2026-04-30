# Top Five Refactoring Review

Date: 2026-04-30

This review was performed with parallel sub-agent passes over:

- Frontend app shell, dashboard, table, triage, filters, settings, alerts, and workload
- Workflow-heavy frontend surfaces: Team Tracker, My Day, and Manager Desk
- Backend routes, services, sync, database, and Jira integration
- Shared contracts, API client, hooks, and data access

The goal is not broad cleanup. The goal is to reduce the files most likely to slow future changes or hide defects, while keeping each change small and behavior-preserving.

## Executive Summary

The codebase is functional and has useful coverage, but maintainability pressure is concentrated in a small number of files. The strongest signals are:

- Large UI orchestration files mix data access, workflow state, rendering, and side effects.
- A few backend services own several bounded contexts at once.
- Some client/server API contracts still drift because request and response envelopes are not consistently shared.
- The highest-risk user-visible issues are small and should be fixed before larger refactoring.

## Immediate Fixes Before Refactoring

These should be handled first because they are correctness issues, not taste issues.

### Critical: Fix Jira Comment Request Contract

Primary file:

- `client/src/hooks/useAddComment.ts`

Supporting file:

- `server/src/routes/issues.ts`

Finding:

`useAddComment` sends `{ body }` to `POST /issues/:key/comments`, while the backend validates `{ text }`. Comment submission will be rejected before the service can post to Jira.

Recommended change:

- Change the hook to send `{ text: body }`.
- Add shared request/response types, for example `IssueCommentRequest` and `IssueCommentResponse`, in `shared/types.ts`.
- Add a focused hook or route test so this drift cannot return.

Priority: Critical / Immediate

Why this stays simple:

This is a one-contract fix. Do not redesign comments or the issue service around it.

### Critical: Align Dashboard Keyboard Navigation With Visible Table Rows

Primary files:

- `client/src/components/table/DefectTable.tsx`
- `client/src/components/layout/DashboardLayout.tsx`

Finding:

`DashboardLayout` gets keyboard navigation keys from `useTableIssueKeys(...)`, while `DefectTable` applies its own local search, status exclusions, and TanStack sorting before rendering. After sorting or filtering, pressing Enter can open a different issue than the currently visible focused row.

Recommended change:

- Let `DefectTable` report its visible sorted row keys upward through a callback such as `onVisibleIssueKeysChange`.
- Keep the keyboard state in `DashboardLayout`, but make it use the table's rendered row order.
- Add a regression test for Enter after search, status exclusion, and sorting.

Priority: Critical / Immediate

Why this stays simple:

Prefer passing visible row keys upward over introducing a full table state framework.

## Top Five Refactoring Files

### 1. `client/src/components/settings/SettingsPanel.tsx`

Priority: High

Category: Maintainability, data-access boundary, readability

Why it is in the top five:

- The file is 2,178 lines.
- It owns many unrelated workflows: Jira connection, sync settings, field discovery, manager identity, team discovery, manual team members, app users, password generation, logout, data maintenance navigation, and section rendering.
- It makes direct API calls from the component, which goes against the project convention that data access belongs in hooks and `client/src/lib/api.ts`.
- It has 40+ local state values, making small changes hard to reason about.

Recommended refactor:

- Split by the existing settings sections:
  - `ConnectionSettings`
  - `SyncSettings`
  - `TeamSettings`
  - `AccessSettings`
- Move transport and mutation flows into narrow hooks:
  - `useAppUsers`
  - `useJiraFieldDiscovery`
  - `useTeamDirectory`
  - `useSettingsConfigActions`
- Keep layout and section navigation in `SettingsPanel`.
- Gate Jira directory discovery so it does not run on settings mount unless the section or search needs it.

Avoid:

- Do not introduce a generic settings framework.
- Do not rewrite all settings UI at once.
- Do not move every helper into a shared file unless more than one section needs it.

Suggested tests:

- Existing `SettingsPanel.test.tsx` flows should keep passing.
- Add hook tests for app user CRUD, field discovery, team discovery/add/remove, and save-then-sync failure handling.

### 2. `client/src/components/table/DefectTable.tsx`

Priority: High

Category: Correctness, table model clarity, UI maintainability

Why it is in the top five:

- The file is 949 lines.
- It combines data fetching, persisted status exclusions, search state, status filter popover state, TanStack column definitions, inline edit orchestration, toolbar rendering, row rendering, and table empty states.
- Its internal visible-row model is currently disconnected from dashboard keyboard navigation.

Recommended refactor:

- First fix the visible-row key issue described above.
- Extract a small table model hook:
  - search query
  - status exclusions
  - filtered rows
  - visible sorted row keys
- Extract presentational pieces:
  - `DefectTableToolbar`
  - `StatusFilterPopover`
  - `DefectTableRows`
- Keep TanStack Table in the table feature folder. No new table abstraction is needed.

Avoid:

- Do not replace TanStack Table.
- Do not move issue fetching into each row or cell.
- Do not split cells that are already clear and reusable.

Suggested tests:

- Pressing Enter opens the visible focused row after sorting.
- Pressing Enter opens the visible focused row after search filtering.
- Pressing Enter opens the visible focused row after status exclusion.
- Existing inline edit tests should still pass.

### 3. `client/src/components/layout/DashboardLayout.tsx`

Priority: Medium-High

Category: App shell state orchestration

Why it is in the top five:

- The layout owns filters, selected issue state, highlighted issue timers, keyboard shortcuts, sidebar behavior, sync shortcuts, and table navigation.
- It is the companion file for the visible-row keyboard issue.
- The responsibilities are individually understandable, but the combined file makes shell behavior fragile.

Recommended refactor:

- Extract `useDashboardFilters` for filter state and reset behavior.
- Extract `useIssueSelection` for selected/highlighted issue and timers.
- Extract `useDashboardShortcuts` for keyboard navigation and input/contenteditable guards.
- Keep the visual shell in `DashboardLayout`.

Avoid:

- Do not add React Router or global state just for this.
- Do not move dashboard-specific state into app-wide context.

Suggested tests:

- Shortcut behavior ignores inputs and contenteditable elements.
- Highlight clear timers still behave as expected.
- Keyboard navigation uses the visible table row keys from `DefectTable`.

### 4. `client/src/components/team-tracker/TeamTrackerPage.tsx`

Priority: Medium-High

Category: Workflow orchestration, readability

Why it is in the top five:

- The page owns date state, board query state, attention enrichment, mutation side effects, read-only gating, developer drawer state, task detail state, availability dialogs, and manager follow-up capture.
- The file is not as large as Settings, but it is a high-change workflow surface.
- The current shape makes small behavior changes require reading too much page-level code.

Recommended refactor:

- Extract `useTeamTrackerWorkflow(date, board, readOnly)` for:
  - finding tracker items
  - set-current, mark-done, drop, reactivate, inactive handling
  - follow-up target handling
  - task-detail open/close handling
- Extract a small header/date-controls component.
- Keep existing mutation hooks; do not move transport logic back into the page.

Avoid:

- Do not create a generic workflow engine.
- Do not combine Manager Desk and Team Tracker hooks.
- Do not refactor all child components in the same pass.

Suggested tests:

- Mark done and undo.
- History/read-only mode blocks mutations.
- Availability/inactive dialog behavior.
- Follow-up capture uses the selected board date.

### 5. `server/src/services/team-tracker.service.ts`

Priority: Medium-High

Category: Backend service size, domain boundary clarity

Why it is in the top five:

- The file is 2,741 lines.
- It owns board rendering, saved views, availability integration, tracker items, manager-desk synchronization, carry-forward, attention queue, issue assignment summaries, and query grouping.
- It is central to both manager and developer workflows, so future feature work will keep touching it.

Recommended refactor:

- Extract pure helpers first, where behavior is easiest to preserve:
  - board query normalization
  - sorting/grouping/filtering helpers
  - signal/attention calculation
  - carry-forward planning
- Keep database write use cases visible in the service until extracted helpers prove stable.
- Keep transaction wrappers around linked workflows.

Avoid:

- Do not introduce a repository layer just to reduce line count.
- Do not split every private method into a class.
- Do not change the API shape while extracting pure helpers.

Suggested tests:

- Existing Team Tracker service and route tests.
- Carry-forward selection and duplicate prevention.
- Attention sorting and reasons.
- Live vs history board behavior.

## Secondary Watchlist

These are worth addressing after the top five or alongside related work.

| File | Priority | Reason | Recommended action |
|---|---|---|---|
| `client/src/hooks/useManagerDesk.ts` | Medium | Writes an impossible `TrackerSharedTaskDetailResponse` shape into cache after canceling delegated work. | Remove/invalidate the detail cache or model the response as a real union. |
| `client/src/components/my-day/MyDayDateControl.tsx` | Medium | Uses `new Date('yyyy-MM-dd')`, which can shift local display dates in US time zones. | Use local date helpers or `date-fns/parseISO`; add a date regression test. |
| `server/src/services/manager-desk.service.ts` | Medium | 2,101-line service spanning CRUD, links, history, carry-forward, lookups, and tracker sync. | Extract link handling, carry-forward planning, and history snapshot helpers after Team Tracker stabilization. |
| `server/src/routes/config.ts` | Medium | Route owns config persistence, Jira client creation, sync/backup startup, and destructive reset behavior. | Move use cases into a `ConfigService`; keep route as validate-call-respond. |
| `server/src/routes/team.ts` | Medium | Route performs Jira discovery, developer inserts/updates, ID generation, and cleanup orchestration. | Introduce `TeamService` and `TeamDiscoveryService`. |
| `shared/types.ts` | Medium | Domain contracts are shared, but many response envelopes remain local in hooks. | Promote common request/response envelopes as endpoints are touched. |
| `client/src/lib/api.ts` | Low-Medium | Falsy request bodies are dropped; empty/non-JSON responses are not explicitly handled. | Use `data === undefined ? undefined : JSON.stringify(data)` and add API client tests. |
| `client/src/components/setup/SetupWizard.tsx` | Medium | Large onboarding component with `any` props in step components. | Type `StepContent` and `StepFooter`, then split by wizard step only if active onboarding work resumes. |

## Suggested Execution Order

1. Fix `useAddComment.ts` contract and add a test.
2. Fix visible-row keyboard navigation between `DefectTable` and `DashboardLayout`.
3. Extract settings hooks from `SettingsPanel`, starting with app users and Jira field discovery.
4. Split `DefectTable` toolbar/filter/model pieces after the visible-row fix is covered.
5. Extract `TeamTrackerPage` workflow handlers into a hook.
6. Extract pure board and carry-forward helpers from `team-tracker.service.ts`.

## Validation Plan

Use narrow validation first, then broaden:

- `npm run typecheck`
- `npm run test --workspace=client -- SettingsPanel DefectTable DashboardLayout TeamTracker`
- `npm run test -- team-tracker.routes team-tracker.service manager-desk.routes issues`
- `npm run build:check`

The shared-contract sub-agent reported these commands passed during review:

- `npm run typecheck`
- `npm run test --workspace=client -- useTeamTracker useTags useUpdateIssue useSyncRefreshCoordinator`
- `npm run test -- manager-desk.routes team-tracker.routes my-day.routes tags.routes alerts.routes team.routes config.routes issues`

## Guiding Principle

Refactor only where it lowers the amount of context required to make the next change. The best changes here are small extractions around existing responsibilities, not new frameworks or broad rewrites.
