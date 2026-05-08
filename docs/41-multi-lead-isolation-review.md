# LeadOS Multi-Lead Isolation Review

Date: 2026-05-07

## Executive Summary

LeadOS is not currently safe as an independent multi-lead workspace system.

The application has authentication and role boundaries, and newer Manager Desk data has partial manager scoping. But the core product data model is still mostly global: Jira config, Jira token, synced issues, team members, tags, Team Tracker, My Day, sync state, backups, and many settings are shared across all manager accounts.

That means if Lead 1 and Lead 2 both have manager accounts in the same LeadOS instance, Lead 1 can see or affect data that Lead 2 would expect to be private.

## What Is Isolated Today

Some boundaries are present and useful:

- Sessions are tied to authenticated users.
- Manager-only routes reject developer users.
- Developer-only My Day routes reject manager users.
- Manager Desk item CRUD checks `managerAccountId` through the owning day.
- Team Tracker saved views are scoped by `managerAccountId`.
- Alert dismissals are scoped by `managerAccountId`.

These are good building blocks, but they do not create separate lead workspaces.

## Tenancy Matrix

| Area | Current Model | Isolation Status |
| --- | --- | --- |
| App users | Global username list | Not workspace-scoped |
| Jira config/token | One global `config` table and runtime token | Not isolated |
| Sync engine | One global scheduled sync | Not isolated |
| Jira issues | Global `issues` table keyed by `jira_key` | Not isolated |
| Team members | Global `developers` table keyed by `account_id` | Not isolated |
| Work dashboard | Reads global issues/team data | Not isolated |
| Team Tracker | Global developer/date rows | Not isolated |
| My Day | Scoped only by developer account | Not lead/workspace isolated |
| Manager Desk | Manager-owned days/items | Partially isolated |
| Follow-ups/Meetings | Manager Desk-backed | Mostly manager-scoped, but linked data is global |
| Tags | Global tag names and issue-tag links | Not isolated |
| Alerts/Suggestions | Computed from global issues/team | Not isolated |
| Backups | Whole SQLite database | Global/admin concern |
| Frontend cache | Query keys omit account/workspace identity | Cross-login risk |

## Findings

### P0: No Workspace/Tenant Boundary

The auth model identifies a manager by username/accountId, but most core tables do not carry `managerAccountId` or `workspaceId`.

Evidence:

- `server/src/services/auth.service.ts` maps manager `accountId` to username.
- `server/src/middleware/auth.ts` only verifies `role === "manager"`.
- `server/src/db/schema.ts` has global `issues`, `developers`, `config`, tags, and Team Tracker tables.

Impact:

Lead 1 and Lead 2 share the same core workspace data. Role-based auth prevents developers from entering manager screens, but it does not separate one manager from another.

Recommended direction:

Add a first-class workspace/tenant model. Every manager and developer user should belong to a workspace, and every workspace-owned table should include `workspaceId`.

### P0: Jira Settings, Token, and Sync Are Global

Jira config is stored as one value per key, and the Jira token is stored under one global `jira_api_token` key. The sync engine also runs as one global process over the shared configuration.

Evidence:

- `server/src/db/schema.ts` defines `config` as `{ key, value }`.
- `server/src/services/settings.service.ts` reads Jira settings without user/workspace input.
- `server/src/services/jira-credentials.service.ts` stores one persisted Jira token.
- `server/src/runtime-credentials.ts` keeps one in-memory Jira token.
- `server/src/sync/engine.ts` builds one scoped JQL from global config and global team members.

Impact:

Any manager can replace the Jira connection and token for every other manager. Sync results from one lead's Jira configuration become the Work data seen by all managers.

Recommended direction:

Make config and credentials workspace-scoped, for example `(workspaceId, key)`. Run sync per workspace/Jira connection and stamp synced rows with `workspaceId`.

### P0: Work/Jira Issue APIs Are Globally Readable and Mutable

The Work dashboard routes call issue services without passing the authenticated manager or workspace. Issue reads and mutations operate directly by Jira key over the global `issues` table.

Evidence:

- `server/src/routes/issues.ts` calls `issueService.getAll()`, `getById(key)`, `update(key)`, `addComment(key)`, `excludeIssue(key)`, and `restoreIssue(key)` with no owner scope.
- `server/src/services/issue.service.ts` selects all issues and updates by `jiraKey`.
- `server/src/routes/overview.ts` uses global issue counts.

Impact:

Lead 1 can see, edit, comment on, exclude, restore, and tag issue data that belongs to Lead 2's intended workspace.

Recommended direction:

Change issue identity from `jiraKey` to `(workspaceId, jiraKey)` and require workspace scope for every issue query and mutation.

### P0: Team and Team Tracker Are Global

Team membership and Team Tracker are modeled around global developers. Tracker days are unique by `(date, developerAccountId)`, not by manager or workspace.

Evidence:

- `server/src/routes/team.ts` lists and mutates global developers.
- `server/src/services/workload.service.ts` reads all active developers and all issues.
- `server/src/routes/team-tracker.ts` updates any `:accountId/day`, availability, check-in, or item ID.
- `server/src/services/team-tracker.service.ts` builds the board from all active developers and global tracker days/items.
- `server/src/db/schema.ts` defines `team_tracker_days` unique on date plus developer only.

Impact:

Lead 1 and Lead 2 cannot independently manage the same developer/date. Planning, status, manager notes, availability, current work, check-ins, and carry-forward state are shared.

Recommended direction:

Separate global person identity from workspace team membership. Scope Team Tracker days/items/check-ins/availability by workspace, and verify item ownership on every item ID mutation.

### P1: Today Mixes Scoped Desk Data With Global Work and Team Data

The Today screen receives a manager account ID, but only some downstream calls use it. Work counts, issue actions, and team signals still come from global services.

Evidence:

- `server/src/services/today.service.ts` combines `teamTrackerService.getBoard(date, { managerAccountId })`, `managerDeskService.getDay(managerAccountId, date)`, and global issue service data.
- Team Tracker itself is global except saved-view resolution.

Impact:

Today can show Lead 2's work/team signals inside Lead 1's command view.

Recommended direction:

After workspace scoping exists, Today should compose only workspace-scoped services.

### P1: Manager Desk Is Only Partially Isolated

Manager Desk days/items are manager-scoped, but links and delegated execution connect to global issues, global developers, and global Team Tracker items.

Evidence:

- `server/src/services/manager-desk.service.ts` protects owned Desk items with `getOwnedItemRow`.
- Desk issue/developer lookups search global `issues` and `developers`.
- Tracker item detail/promotion can load a global Team Tracker item by raw tracker ID.
- Desk item assignment syncs into global Team Tracker state.

Impact:

Lead 1's Desk is mostly private, but linked issue/developer/task data can come from the shared workspace. Promoting or delegating work can affect shared Team Tracker rows.

Recommended direction:

Keep manager ownership, add workspace ownership, and validate every linked issue, developer, tracker item, and delegated task belongs to the same workspace.

### P1: Tags, Alerts, and Suggestions Are Global

Tag definitions and issue-tag assignments are global. Alert dismissals are per manager, but alert computation reads global issues and global team/workload data.

Evidence:

- `server/src/services/tag.service.ts` lists all tags and sets issue tags by Jira key.
- `server/src/services/alert.service.ts` computes alerts from all issues.
- Suggestions use global issue and workload services.

Impact:

Lead 1 can see or delete tags used by Lead 2, and Lead 1 can receive alerts or assignment suggestions based on Lead 2's issues/team.

Recommended direction:

Scope tags, tag usage, alerts, and suggestions by workspace.

### P1: Settings Reset and Maintenance Can Affect Everyone

There are two reset paths. The newer maintenance reset partially scopes Manager Desk but clears global Team Tracker tables. The older config reset deletes global Jira/team/work data outright.

Evidence:

- `server/src/services/workspace-maintenance.service.ts` clears Team Tracker/check-ins/items/days/availability globally.
- `server/src/routes/config.ts` `/reset` deletes global issues, developers, sync log, config, component map, tags, and issue history.

Impact:

A manager using settings reset can erase data for every lead in the instance.

Recommended direction:

Make manager-facing reset workspace-scoped. Reserve full database/Jira configuration reset for an application admin role.

### P1: Frontend Query Cache Is Not Account-Scoped

The app creates one module-level React Query client above auth state. Query keys do not include `user.accountId` or `workspaceId`.

Evidence:

- `client/src/App.tsx` creates one `QueryClient` at module scope.
- `client/src/context/AuthContext.tsx` login/logout only update user state.
- Hooks such as `useToday`, `useIssues`, `useTeamTracker`, `useManagerDesk`, `useMyDay`, and `useConfig` use account-agnostic query keys.

Impact:

After account switching in the same browser session, the next user can briefly see cached data from the previous user before refetch. Config/setup gating can also reuse another manager's cached config.

Recommended direction:

Clear the query cache centrally on login/logout/user change, and ideally include workspace identity in sensitive query keys once workspace scoping exists.

### P2: Backups and User Administration Are Global

Backups operate on the whole SQLite database. User listing and account creation/deletion are manager-only but not workspace-aware.

Evidence:

- `server/src/routes/backups.ts` lists backups for the full DB.
- `server/src/services/backup.service.ts` creates full database backups.
- `server/src/services/auth.service.ts` lists all active users.
- `server/src/routes/auth.ts` lets any manager create users after bootstrap.

Impact:

Lead 1 can enumerate app users and trigger backups that contain all leads' data. Developer account management is global.

Recommended direction:

Introduce an admin role for application-level operations. Managers should manage users only inside their workspace.

### P2: Browser-Local UI State Is Global

Some local UI state is stored without user/workspace namespacing.

Evidence:

- `client/src/components/table/DefectTable.tsx` stores hidden statuses under one key.
- `client/src/components/capture/GlobalCaptureDialog.tsx` stores last capture target under one key.
- `client/src/context/ToastContext.tsx` can keep toasts/actions across auth changes.

Impact:

Lower-risk preference leakage can still make one user's browser state affect another user's view. Toast action callbacks can retain old issue/task IDs after account changes.

Recommended direction:

Namespace local storage by workspace/user where appropriate, and clear transient toasts on auth changes.

## Suggested Fix Order

1. Add a `workspaces` table and attach `workspaceId` to authenticated users.
2. Add workspace-scoped request context, for example `req.auth.user.workspaceId`.
3. Scope Jira config, credentials, and sync by workspace.
4. Scope `issues`, issue history, tags, and issue mutations by workspace.
5. Scope developers/team membership and Team Tracker by workspace.
6. Update My Day to use developer plus workspace membership.
7. Tighten Manager Desk linked issue/developer/tracker validation.
8. Rebuild Today, alerts, suggestions, overview, and workload from scoped services.
9. Split manager workspace settings from application-admin settings.
10. Clear or namespace frontend query cache and local storage by workspace/user.

## Checklist

- [ ] P0: Add a first-class workspace/tenant model.
- [ ] P0: Add `workspaceId` to auth/session context.
- [ ] P0: Scope Jira config, Jira token, and sync engine per workspace.
- [ ] P0: Scope issues, issue history, issue tags, and Work dashboard APIs.
- [ ] P0: Scope team membership, developer mappings, availability, Team Tracker, and My Day.
- [ ] P1: Rebuild Today from scoped data only.
- [ ] P1: Tighten Manager Desk linked issue/developer/tracker ownership checks.
- [ ] P1: Scope tags, alerts, suggestions, overview, and workload.
- [ ] P1: Make maintenance reset workspace-safe.
- [ ] P1: Clear or namespace frontend query cache on auth changes.
- [ ] P2: Move global backups and global user admin behind an app-admin boundary.
- [ ] P2: Namespace localStorage preferences and clear transient toasts on auth changes.

