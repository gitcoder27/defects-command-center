# Backend Review Findings

Date: 2026-03-07

## Scope

This note captures the backend correctness issues identified during review of the Jira configuration, sync, issue, workload, and alert flows. The common pattern across these findings is that configuration values are persisted through `/api/config`, but several runtime paths either cache stale dependencies or ignore the persisted settings entirely.

## Summary

The backend is not correct as currently implemented. Five user-visible defects were identified:

1. `IssueService` keeps using a stale Jira client after runtime Jira reconfiguration.
2. The persisted `sync_interval_ms` setting is ignored by cron scheduling.
3. The persisted `stale_threshold_hours` setting is ignored by stale issue and alert logic.
4. Excluded issues are still counted by workload and developer issue endpoints.
5. Overdue alerts use `dueDate` instead of the app's effective due date.

## Findings

### P1: Refresh `IssueService` Jira client after config changes

Affected code:

- `server/src/index.ts:55-57`
- `server/src/services/issue.service.ts:20-21`
- `server/src/services/issue.service.ts:79-80`
- `server/src/services/issue.service.ts:119-120`
- `server/src/routes/config.ts:88-137`

Analysis:

- During bootstrap, the server creates one `JiraClient` instance and injects it into `IssueService`.
- `IssueService` stores that client in its constructor and reuses it for `updateIssue()` and `addComment()`.
- The config route later updates persisted Jira credentials and the in-memory token, and restarts sync via `syncEngine.start()` / `syncEngine.syncNow()`.
- Nothing rebuilds the `IssueService` dependency graph after those config changes.

Why this is incorrect:

- `SyncEngine` avoids the problem because it fetches config on demand and constructs its Jira client at runtime.
- `IssueService` does not. If the server starts with missing credentials, or the token/base URL/email is changed later, issue edits and comments still target the bootstrap-era client.

User-visible impact:

- `PATCH /api/issues/:key` can keep failing after the user finishes setup successfully.
- `POST /api/issues/:key/comments` can keep failing after token rotation.
- Sync may appear healthy while edit/comment actions remain broken until process restart.

Likely remediation:

- Stop holding a long-lived Jira client inside `IssueService`, or add a way to refresh it when config changes.
- Align `IssueService` with `SyncEngine` by resolving Jira credentials at call time.

### P2: Honor the persisted sync interval when scheduling cron

Affected code:

- `server/src/routes/config.ts:64`
- `server/src/routes/config.ts:91-92`
- `server/src/routes/config.ts:119`
- `server/src/sync/engine.ts:31-35`

Analysis:

- The config API reads and writes `sync_interval_ms`.
- `SyncEngine.start()` always schedules cron with the hardcoded expression `*/5 * * * *`.
- The config route calls `syncEngine.start()` after saving settings, but `start()` has no input and does not read persisted interval state.

Why this is incorrect:

- The dashboard exposes a configurable sync interval, and the server persists that value.
- The runtime scheduler ignores the persisted value and continues syncing every five minutes.

User-visible impact:

- The saved interval is misleading after restart and after settings updates.
- UI state can show a custom interval while the backend still executes on the fixed five-minute cadence.

Likely remediation:

- Derive the cron schedule from persisted `sync_interval_ms` inside `SyncEngine.start()`, or pass the resolved interval into `start()`.
- Validate supported interval granularity so saved values map cleanly to the scheduler.

### P2: Use the configured stale threshold instead of a hardcoded 48 hours

Affected code:

- `server/src/routes/config.ts:65`
- `server/src/routes/config.ts:92`
- `server/src/routes/config.ts:120`
- `server/src/services/issue.service.ts:243-244`
- `server/src/services/alert.service.ts:19-20`

Analysis:

- The config API reads and writes `stale_threshold_hours`.
- Issue filtering uses `isOlderThanHours(issue.updatedAt, 48, context.now)` for the `stale` filter.
- Alert generation uses the same `48` hour constant for stale alerts.
- Neither service reads the configured threshold from persisted config.

Why this is incorrect:

- The application presents `stale_threshold_hours` as a real setting, but the backend behavior never changes.
- Two separate backend surfaces, issue queries and alerts, are both locked to the default threshold.

User-visible impact:

- `/api/issues?filter=stale` ignores the saved threshold.
- Overview counts returned by `getOverviewCounts()` ignore the saved threshold.
- `/api/alerts` stale alerts disagree with the user’s configured policy.

Likely remediation:

- Resolve the stale threshold from config in both `IssueService` and `AlertService`.
- Centralize effective settings lookup so issue filters, counts, and alerts use the same threshold.

### P2: Exclude hidden issues from workload calculations

Affected code:

- `server/src/services/issue.service.ts:123-129`
- `server/src/services/issue.service.ts:328-333`
- `server/src/services/workload.service.ts:27-49`
- `server/src/services/workload.service.ts:81-85`

Analysis:

- `excludeIssue()` and `restoreIssue()` toggle the persisted `excluded` flag.
- `IssueService.isActiveTeamIssue()` correctly omits excluded issues from main issue queries.
- `WorkloadService.isActiveTeamIssue()` does not check `excluded`.
- Workload APIs and idle-developer alerts depend on `WorkloadService`, not on `IssueService`.

Why this is incorrect:

- The backend has two different definitions of an "active" issue.
- Exclusion works in issue views but not in workload-derived endpoints.

User-visible impact:

- `/api/team/workload` still counts excluded issues as active work.
- `/api/team/:accountId/issues` still returns excluded issues.
- Idle-developer alerts can be suppressed by issues the user explicitly hid from scope.

Likely remediation:

- Make `WorkloadService.isActiveTeamIssue()` honor `excluded`.
- Consider sharing a single issue-activity predicate across services to avoid further drift.

### P2: Base overdue alerts on the effective due date

Affected code:

- `server/src/services/issue.service.ts:215`
- `server/src/services/issue.service.ts:236-240`
- `server/src/services/workload.service.ts:87-88`
- `server/src/services/alert.service.ts:15-17`

Analysis:

- Issue queries treat `developmentDueDate ?? dueDate` as the effective deadline.
- Workload calculations also use `developmentDueDate ?? dueDate`.
- Overdue alerts only check `row.dueDate`.

Why this is incorrect:

- The backend already established the effective due-date rule everywhere else.
- Alert generation diverges from that rule, so the same issue can be overdue in issue APIs but not overdue in alerts.

User-visible impact:

- Issues with only `developmentDueDate` can show as overdue in `/api/issues` but never trigger an overdue alert.
- Issues with both dates can alert too late if the development due date is earlier than the Jira due date.

Likely remediation:

- Compute overdue alerts from `row.developmentDueDate ?? row.dueDate`.
- Reuse the same effective due-date helper across issue, workload, and alert logic.

## Cross-Cutting Theme

These issues are not isolated. They indicate two broader backend consistency problems:

1. Runtime configuration is not modeled as a first-class dependency.
   Services either cache bootstrap-time state or each resolve settings independently, which causes drift.

2. Business rules are duplicated across services.
   "Active issue", "stale issue", and "effective due date" each have more than one implementation, and those implementations have already diverged.

## Recommended Follow-Up

1. Introduce a small configuration/settings accessor that resolves effective values from persisted config plus environment fallback.
2. Stop storing a long-lived Jira client in `IssueService`; resolve or refresh it from current settings.
3. Centralize shared predicates/helpers for:
   - effective due date
   - active team issue
   - stale threshold evaluation
4. Add backend tests covering:
   - config changes without process restart
   - non-default sync intervals
   - non-default stale thresholds
   - excluded issues in workload endpoints
   - overdue alerts when only `developmentDueDate` is set
