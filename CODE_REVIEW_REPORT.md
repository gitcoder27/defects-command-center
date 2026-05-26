# Code Review Report

## 1. Executive Summary

Overall rating: Risky.

The codebase has a solid foundation: a TypeScript monorepo, clear client/server/shared workspaces, broad feature coverage, Zod validation on many write paths, a central frontend API client, TanStack Query hooks, an Express app factory, SQLite backups, and meaningful documentation. The product direction is also reflected in the module names and route surfaces.

The risk comes from a recently grown project starting to accumulate high-change logic in a few very large files, plus several security and reliability issues that should be fixed before more feature work. Most concerning are the public first-run bootstrap path, the async SQLite transaction helper, a legacy destructive reset endpoint, multi-workspace Jira config leakage, manual migration drift, and a currently failing backend test suite.

Validation snapshot:

- `npm run typecheck`: passed.
- `npm run build:check`: passed.
- `npm run format:check`: passed.
- `npm audit --omit=dev --workspaces`: passed with 0 vulnerabilities.
- `npm run lint`: completed with 0 errors and 176 warnings.
- `npm run test`: failed in the server workspace before the root command reached client tests. Local run showed 2 failed server tests and 314 passing server tests. A parallel test review saw broader cascading failures from the same shared SQLite reset/isolation area. Direct client test run passed with 48 files and 383 tests.

Recommendation: continue development only after Phase 1 fixes in this report. Do not start broad new feature work on Team Tracker, Manager Desk, Settings, migrations, or auth/bootstrap until the top reliability and security issues are addressed.

Biggest strengths:

- Clear npm workspace split: `client`, `server`, `shared`.
- Centralized frontend network access through `client/src/lib/api.ts`.
- Extensive route/service/component test suite compared with project age.
- Good use of shared contracts and TanStack Query.
- Deployment scripts include guardrails for production checkout, database artifacts, production encryption secret, typecheck, tests, lint, format, build, and audit.

Biggest risks:

- Backend tests are red and server tests share one persistent SQLite file.
- SQLite transactions can hold an async boundary on a singleton connection.
- First-run setup can be claimed if production is exposed before a manager account exists.
- Manager-owned destructive reset endpoint has no typed confirmation.
- Large services/components will slow future work and raise merge conflict risk.
- Schema is maintained in both Drizzle declarations and handwritten SQL migrations.

## 2. Project Overview

Tech stack detected:

- Monorepo: npm workspaces.
- Language: TypeScript.
- Frontend: React 18, Vite, Tailwind CSS, TanStack Query, TanStack Table, Radix UI, Framer Motion, lucide-react, Vitest/jsdom.
- Backend: Express 4, SQLite through `better-sqlite3`, Drizzle ORM, Zod, Pino, node-cron, Vitest/node.
- Shared contracts: `shared/types.ts`.
- CI: GitHub Actions in `.github/workflows/quality.yml`.
- Runtime data: SQLite under repo-root `data/`.

Main folders/modules:

- `client/src/App.tsx`: custom SPA routing, lazy page loading, auth/bootstrap route gates.
- `client/src/components`: feature folders for Today, Work, Team Tracker, Manager Desk, Manager Memory, Settings, Setup, My Day, capture, table, layout.
- `client/src/hooks`: TanStack Query hooks and mutations.
- `client/src/lib/api.ts`: sole frontend `fetch` wrapper.
- `server/src/app.ts`: Express app factory and route mounting.
- `server/src/index.ts`: migration, service construction, backup startup, sync startup, app listen.
- `server/src/routes`: API route handlers.
- `server/src/services`: business logic and integrations.
- `server/src/db`: Drizzle schema, connection, migration, transaction helpers.
- `server/src/jira`: Jira client/JQL/types.
- `server/src/sync`: scheduled Jira sync engine.
- `shared/types.ts`: API/domain DTOs for all product areas.

Main application flow:

1. `server/src/index.ts` loads env, runs migrations, seeds/pulls runtime Jira credentials, creates services, starts backups/sync, and starts Express.
2. `server/src/app.ts` mounts API routers under `/api` and serves `client/dist` in production.
3. `client/src/main.tsx` renders `App`.
4. `client/src/App.tsx` resolves the browser path to a custom app view, gates by bootstrap/auth/role/config state, and renders the appropriate page.
5. Feature components call hooks in `client/src/hooks`, which use `client/src/lib/api.ts`.
6. Backend routes validate with Zod, adapt `req.auth`, and call services.
7. Services use Drizzle/SQLite, Jira clients, sync engine, backups, and shared DTOs.

Key architectural patterns found:

- Thin-ish route/service separation exists in many areas, but is inconsistent.
- Shared DTOs are used across client and server.
- TanStack Query is the frontend state/data layer.
- Auth is cookie session based with `dcc_session`.
- Workspace scoping is represented in most database tables.
- Migrations are handwritten and idempotent-style rather than generated Drizzle migrations.

## 3. High-Level Architecture Review

The high-level structure is understandable and suitable for a full-stack TypeScript product. The repository has clear workspace boundaries and generally predictable feature folders. Future developers can find the main surfaces quickly.

The architecture is currently at an inflection point. Newer manager workflows have expanded faster than module boundaries. Team Tracker, Manager Desk, Settings, and Today now contain domain policy, persistence, UI orchestration, historical/carry-forward behavior, and cross-feature synchronization in a few large files. That is the main maintainability risk.

Separation of concerns:

- Good: `server/src/app.ts` is an app factory and many routes delegate to services.
- Weak: `server/src/routes/team.ts` and `server/src/routes/config.ts` directly import DB schema, Jira clients, credentials, and reset logic.
- Good: frontend API access is centralized.
- Weak: frontend routing, auth gates, legacy path normalization, preload logic, and Today cross-navigation all live in `client/src/App.tsx`.

Dependency flow:

- Intended flow is client hooks -> API wrapper -> routes -> services -> DB/Jira.
- Actual flow is sometimes route -> DB/Jira directly.
- Some services instantiate collaborators internally, making runtime wiring less explicit. Examples include `IssueService`, `ManagerDeskService`, and default collaborators created in service constructors.

Scalability:

- The folder structure can scale.
- The current file/module sizes will not scale without a phased extraction plan.
- The handwritten migration file will become increasingly risky as schema churn continues.

Good practices observed:

- App factory accepts service dependencies.
- Routes commonly validate writes with Zod.
- Auth role boundaries are represented in middleware.
- Workspace scoping is included in table keys/indexes.
- Production deployment has guardrails and validates before restart.
- There are many targeted tests for a young project.

## 4. Critical Findings

### Finding: Public First-Run Bootstrap Can Be Claimed By Any Visitor

- Severity: Critical
- Location: `server/src/routes/auth.ts:88`, `server/src/services/auth.service.ts:119`
- Problem: `/api/auth/bootstrap` and `/api/auth/register` allow unauthenticated first-account setup. The first account must be a manager, but no production setup token or invite secret is required.
- Why it matters: If production is exposed with `userCount === 0`, any visitor can create the first manager account and take over the workspace.
- Recommended fix: Require a one-time setup token or invite secret in production, or restrict bootstrap registration to localhost/private admin access. Disable bootstrap registration permanently once an account exists.
- Suggested priority: Must fix before any new production deploy or public first-run instance.

### Finding: Async Transaction Helper Is Unsafe On A Singleton SQLite Connection

- Severity: Critical
- Location: `server/src/db/transaction.ts:5`, callers in `server/src/services/manager-desk.service.ts:394`, `server/src/services/team-tracker.service.ts:1410`, `server/src/services/workspace-maintenance.service.ts:71`
- Problem: `runInTransaction` opens `BEGIN IMMEDIATE`, awaits arbitrary async work, and checks `rawDb.inTransaction` on the singleton `better-sqlite3` connection.
- Why it matters: If another request runs DB work while the first transaction is open, unrelated writes can be included in the wrong transaction or savepoint. This can cause incorrect commits/rollbacks and long lock windows.
- Recommended fix: Use `better-sqlite3` synchronous transaction APIs for transaction bodies with no `await`, or introduce a transaction mutex/context that prevents unrelated requests from entering the same connection transaction.
- Suggested priority: Must fix before expanding multi-step write workflows.

### Finding: Backend Test Suite Is Red And Database Reset Is Fragile

- Severity: Critical
- Location: `server/tests/helpers/db.ts:4`, `server/src/db/migrate.ts:932`, `server/tests/developer-availability.service.test.ts:37`, `server/tests/manager-desk.service.test.ts:53`
- Problem: `npm run test` fails in the server workspace. Local run showed migration/reset failure with `no such column: workspace_id` after partial table drops and a Manager Desk developer lookup expectation failure. A parallel review also observed cascading failures from self-referential Manager Desk cleanup.
- Why it matters: The CI workflow runs `npm test`; current root validation is not green. The shared DB cleanup model can leak state across tests and make failures order-dependent.
- Recommended fix: First make `resetDatabase()` FK-safe and migration-safe. Then move server tests toward per-file temp DBs or a connection factory instead of one repo-root test database.
- Suggested priority: Must fix before relying on CI or accepting feature PRs.

## 5. High Priority Findings

### Finding: Legacy Config Reset Endpoint Can Wipe Core Workspace Data Without Confirmation

- Severity: High
- Location: `server/src/routes/config.ts:431`
- Problem: `POST /api/config/reset` deletes issues, developers, sync log, config, local tags, component map, and token runtime state with no schema or confirmation text. A safer typed maintenance reset already exists at `server/src/routes/config.ts:401`.
- Why it matters: Any manager session can wipe core workspace data with a single POST. Even if backups run, this is too much blast radius for an unconfirmed endpoint.
- Recommended fix: Remove or deprecate `/api/config/reset`, or require the same preview, typed confirmation, and backup path as `/api/config/maintenance/reset`. Consider admin-only access.
- Suggested priority: Fix now.

### Finding: Team Discovery Can Leak Global Jira Config Across Workspaces

- Severity: High
- Location: `server/src/routes/team.ts:177`
- Problem: `/api/team/discover` falls back to `config.JIRA_*` for any workspace. Other settings paths restrict env fallback to the default workspace through `SettingsService.envFallback`.
- Why it matters: A manager in a secondary workspace can enumerate assignable Jira users from the default/global Jira tenant.
- Recommended fix: Route discovery through `SettingsService` or a dedicated `JiraConnectionService` with default-workspace-only env fallback. Add a multi-workspace isolation test.
- Suggested priority: Fix now.

### Finding: Non-Default Jira Tokens May Remain Plaintext After Migration

- Severity: High
- Location: `server/src/db/migrate.ts:947`
- Problem: `migrateSecretConfigValues` only encrypts the `jira_api_token` row for `DEFAULT_WORKSPACE_ID`.
- Why it matters: Existing token rows for other workspaces can remain plaintext in SQLite and backups.
- Recommended fix: Migrate all `config` rows where `key = 'jira_api_token'` and `value` is not encrypted. Add a non-default workspace migration test.
- Suggested priority: Fix now.

### Finding: Team Tracker Service Is A Multi-Responsibility Class

- Severity: High
- Location: `server/src/services/team-tracker.service.ts:933`
- Problem: One large service handles board building, saved views, day plans, check-ins, availability, issue assignments, attention signals, Manager Desk sync, and carry-forward.
- Why it matters: Changes are hard to localize, merge conflicts will grow, and bugs in one workflow can affect unrelated paths.
- Recommended fix: Keep the current public facade initially, but extract focused collaborators for board queries, saved views, day/item mutations, issue assignment, attention signals, and carry-forward.
- Suggested priority: Start after critical fixes and before adding major Team Tracker features.

### Finding: Manager Desk Service Is Overloaded And Tightly Coupled To Team Tracker

- Severity: High
- Location: `server/src/services/manager-desk.service.ts:369`, sync logic at `server/src/services/manager-desk.service.ts:1970`
- Problem: One service owns Desk CRUD, links, history, carry-forward, cleanup, lookups, tracker promotion, and direct Team Tracker synchronization.
- Why it matters: Desk item changes can mutate Team Tracker state directly, making side effects difficult to reason about or test.
- Recommended fix: Introduce a delegated-task sync service or explicit domain event boundary. Extract history, carry-forward, lookup, and cleanup modules behind a stable facade.
- Suggested priority: Start after critical fixes.

### Finding: Settings Page Is A God Component

- Severity: High
- Location: `client/src/components/settings/SettingsPanel.tsx:60`
- Problem: The component is about 2,269 lines and owns Jira connection, sync settings, field discovery, team membership, developer access, backups, maintenance, many handlers, and large JSX sections.
- Why it matters: Settings will keep changing, and this file is already difficult to review safely.
- Recommended fix: Split into a shell plus section components and hooks such as `ConnectionSettingsSection`, `TeamMembersSection`, `DeveloperAccessSection`, `BackupSettingsSection`, `MaintenanceSection`, `useJiraSettingsForm`, and `useAccessManagement`.
- Suggested priority: Start before significant Settings or onboarding work.

### Finding: Route Layer Owns Persistence And External Integration

- Severity: High
- Location: `server/src/routes/team.ts:7`, `server/src/routes/config.ts:4`
- Problem: Routes directly import DB schema, Drizzle connection, Jira clients, credentials, transaction helpers, and destructive reset logic.
- Why it matters: Routes stop being a thin API boundary, rules are harder to reuse, and route tests must cover business logic that belongs in services.
- Recommended fix: Extract `TeamMemberService`, `JiraConnectionService`, `ConfigService`, and `WorkspaceResetService`. Keep routes focused on validation, auth adaptation, and response shaping.
- Suggested priority: Start before adding new backend endpoints.

### Finding: Schema And Migrations Have Multiple Sources Of Truth

- Severity: High
- Location: `server/src/db/schema.ts:1`, `server/src/db/migrate.ts:6`, alter statements at `server/src/db/migrate.ts:303`
- Problem: Drizzle schema, fresh DDL, alter statements, rebuild specs, and repair statements must all be kept in sync manually. Example: a unique index on `team_tracker_items.manager_desk_item_id` appears in migrations but not the Drizzle declaration.
- Why it matters: Schema drift is easy, migrations are hard for agents to change safely, and reset/migration tests are already failing.
- Recommended fix: Do not rewrite migration history immediately. Add schema drift checks, migration tests for critical indexes/constraints, and a documented migration update checklist. Consider generated Drizzle migrations for future changes.
- Suggested priority: Start after test suite is green.

### Finding: Server Tests Share One Persistent SQLite File

- Severity: High
- Location: `server/vitest.config.ts:8`, `server/vitest.config.ts:10`, `server/src/db/connection.ts:7`
- Problem: Server tests disable file parallelism and point all tests at `../data/dashboard.test.db`, while the DB connection opens at module load.
- Why it matters: One failed cleanup can poison following tests, tests are slow, and cleanup must know every FK/table shape.
- Recommended fix: Move to per-file temp DBs or a connection factory that initializes after each test chooses `DASHBOARD_DB_PATH`.
- Suggested priority: Fix with the current red tests.

## 6. Medium Priority Findings

### Finding: Missing Issue Mutations Return 500 Or False Success

- Severity: Medium
- Location: `server/src/services/issue.service.ts:103`, `server/src/services/issue.service.ts:187`, `server/src/services/issue.service.ts:195`
- Problem: Missing issues throw plain `Error("Issue not found")`, which becomes a 500. Exclude/restore mutations do not verify affected rows.
- Why it matters: Clients get incorrect API contracts and cannot distinguish missing records from server failures.
- Recommended fix: Throw `HttpError(404, ...)` and verify returning rows or affected changes. Add route tests for patch/comment/exclude/restore on missing issues.
- Suggested priority: Fix soon.

### Finding: Full Config Writes Are Non-Atomic

- Severity: Medium
- Location: `server/src/routes/config.ts:210`
- Problem: Full config saves write the Jira token and many config keys one by one. Later validation can fail after partial persistence.
- Why it matters: A failed request can leave mixed old/new configuration and runtime credentials.
- Recommended fix: Validate all inputs first, then persist DB changes in a transaction and update runtime token only after commit.
- Suggested priority: Fix soon.

### Finding: Runtime Enums And Validators Are Duplicated

- Severity: Medium
- Location: `shared/types.ts:521`, `server/src/routes/team-tracker.ts:8`, `server/src/routes/manager-desk.ts:11`
- Problem: Shared union types and Zod `z.enum` values are defined separately.
- Why it matters: Valid server/client states can drift, causing valid client states to be rejected or dead states to linger.
- Recommended fix: Export runtime const arrays from shared/server contract modules and derive TypeScript unions and Zod schemas from the same values.
- Suggested priority: Fix during contract cleanup.

### Finding: Route Validation Patterns Are Loose And Inconsistent

- Severity: Medium
- Location: `server/src/middleware/validate.ts:1`, `server/src/routes/manager-desk.ts:89`, `server/src/routes/team-tracker.ts:41`
- Problem: Many schemas include `z.any().optional()` for unused `body`, `params`, or `query`, and handlers cast values manually.
- Why it matters: Unknown request data survives validation, route types are weaker than they appear, and casts hide drift.
- Recommended fix: Add route schema helpers with strict empty objects by default and typed handler helpers that infer validated request shapes.
- Suggested priority: Fix incrementally.

### Finding: Frontend Jira Link State Marker Is Not Forwarded

- Severity: Medium
- Location: `client/src/components/table/DefectTable.tsx:446`, `client/src/components/JiraIssueLink.tsx:12`
- Problem: `DefectTable` passes `data-jira-link`, but `JiraIssueLink` expects `dataJiraLink` and only renders `data-jira-link` from that prop.
- Why it matters: The row click handler cannot reliably detect Jira-link clicks, so the "last opened in Jira" highlight can clear incorrectly.
- Recommended fix: Change the call site to `dataJiraLink` and add a regression test for successive Jira-link clicks.
- Suggested priority: Fix soon.

### Finding: Closed Triage Panel Still Starts Data Hooks

- Severity: Medium
- Location: `client/src/components/layout/DashboardLayout.tsx:538`, `client/src/components/triage/TriagePanel.tsx:98`
- Problem: `DashboardLayout` always renders `TriagePanel`; inside it, config/developer/tag/assignment hooks start before the `issueKey` render guard.
- Why it matters: Work page loads hidden observers and can make avoidable `/team/developers`, `/tags`, and config requests.
- Recommended fix: Render `TriagePanel` only when `selectedIssueKey` exists, or add `enabled` options to its data hooks.
- Suggested priority: Fix soon.

### Finding: Dialog Accessibility Is Inconsistent

- Severity: Medium
- Location: `client/src/components/team-tracker/AvailabilityDialog.tsx:29`, `client/src/components/capture/GlobalCaptureDialog.tsx:83`, `client/src/components/team-tracker/QuickAddTaskModal.tsx:77`, `client/src/components/manager-desk/ManagerDeskCaptureDialog.tsx:112`, `client/src/components/triage/TriagePanel.tsx:101`
- Problem: `AvailabilityDialog` has focus capture/trapping/restore, while other dialogs mostly handle Escape and body scroll. `TriagePanel` behaves like a modal drawer but lacks consistent dialog semantics/focus management.
- Why it matters: Keyboard and screen reader behavior will be inconsistent across core workflows.
- Recommended fix: Standardize dialogs/drawers on Radix Dialog or a shared local dialog primitive.
- Suggested priority: Fix incrementally with new dialog work.

### Finding: Query Keys And Invalidation Rules Are Scattered

- Severity: Medium
- Location: `client/src/hooks/useManagerDesk.ts:19`, `client/src/hooks/useTeamTrackerMutations.ts:37`, `client/src/hooks/useMyDay.ts:29`
- Problem: Raw string query keys and broad invalidation calls are spread across hooks.
- Why it matters: Cache dependencies are hard to audit, and future agents may miss related invalidation.
- Recommended fix: Add `queryKeys` factories and feature invalidation helpers. Remove unused mutation parameters or use them for targeted invalidation.
- Suggested priority: Fix incrementally.

### Finding: Date Helpers Are Duplicated With Different Semantics

- Severity: Medium
- Location: `server/src/services/manager-desk.service.ts:141`, `server/src/services/team-tracker.service.ts:108`, `server/src/utils/date.ts:1`
- Problem: Similar helpers such as `localTodayIso`, `parseIsoDate`, `addDaysToIsoDate`, and `endOfIsoDate` exist in multiple places with different return types and assumptions.
- Why it matters: Carry-forward, Today, My Day, and history behavior are sensitive to day boundaries and timezone semantics.
- Recommended fix: Consolidate into `server/src/utils/date.ts` with explicit names and tests around local and UTC day boundaries.
- Suggested priority: Fix before more date-heavy features.

### Finding: Coverage Gates Exclude Critical Backend Surfaces

- Severity: Medium
- Location: `server/vitest.config.ts:15`, `client/vitest.config.ts:21`
- Problem: Server coverage thresholds only include `src/services/**/*.ts`. Routes, middleware, migrations, Jira client, sync engine, runtime credentials, and app mounting are excluded. Client coverage excludes `App.tsx` and contexts while thresholds are low.
- Why it matters: API/auth/migration regressions can pass coverage gates.
- Recommended fix: Add separate coverage projects or include route/middleware/db/sync/jira files with realistic thresholds raised over time.
- Suggested priority: Fix after current tests are green.

## 7. Low Priority / Cleanup Findings

### Finding: Lint Warnings Are Allowed To Accumulate

- Severity: Low
- Location: `eslint.config.mjs:43`, lint output across client/server/tests
- Problem: Lint reports 176 warnings, including hook dependency warnings, duplicate imports, `no-unsafe-finally`, type-only import hygiene, and explicit `any` usage in tests.
- Why it matters: Warnings lose signal when they are accepted indefinitely.
- Recommended fix: Convert selected rules to errors over time. Start with `react-hooks/exhaustive-deps`, `no-unsafe-finally`, and production-code `no-explicit-any`.
- Suggested priority: Later, but track.

### Finding: Icon-Only Controls Need More Explicit Accessible Names

- Severity: Low
- Location: `client/src/components/layout/Header.tsx:192`, `client/src/components/layout/Header.tsx:206`, `client/src/components/triage/TriagePanelHeader.tsx:32`, `client/src/components/triage/TriagePanelHeader.tsx:59`
- Problem: Some icon-only controls rely on `title` or do not consistently expose `aria-label`.
- Why it matters: Assistive technology support is inconsistent.
- Recommended fix: Add explicit `aria-label`s and enable stricter jsx-a11y checks for interactive names.
- Suggested priority: Later.

### Finding: My Day Error Recovery Button Is Misleading

- Severity: Low
- Location: `client/src/components/my-day/MyDayPage.tsx:76`, redirect logic at `client/src/App.tsx:428`
- Problem: The error action pushes `/` and reloads, but authenticated developers are redirected back to `/my-day`.
- Why it matters: The UI appears to navigate away but returns to the failing surface.
- Recommended fix: Replace with "Reload My Day", "Sign out", or a role-switch path.
- Suggested priority: Later.

### Finding: Duplicate Unique Records Bubble As Generic 500s

- Severity: Low
- Location: `server/src/services/auth.service.ts:153`, `server/src/services/tag.service.ts:23`
- Problem: Duplicate username/tag constraints can surface as generic server errors.
- Why it matters: Clients get unstable UX and cannot offer precise recovery.
- Recommended fix: Catch SQLite constraint errors or pre-check and return 409 with stable error messages.
- Suggested priority: Later.

### Finding: Magic Numbers And Product Policy Are Embedded In Logic

- Severity: Low
- Location: `server/src/services/today.service.ts:99`, `server/src/services/issue.service.ts:123`
- Problem: Limits, priority weights, rhythm hours, snooze values, and Jira custom field defaults are embedded inline.
- Why it matters: Product policy becomes hard to audit and tune.
- Recommended fix: Introduce named constants such as `TODAY_ACTION_LIMITS`, `TODAY_PRIORITY_WEIGHTS`, `RHYTHM_HOURS`, and Jira field config constants.
- Suggested priority: Later.

### Finding: Documentation And Environment Examples Are Slightly Stale

- Severity: Low
- Location: `README.md`, `.env.example`
- Problem: `README.md` says Jira API token is never stored in the database, but current code supports encrypted persisted tokens. `.env.example` includes organization-specific sample JQL and account IDs.
- Why it matters: Setup guidance can mislead new developers and agents.
- Recommended fix: Update docs to explain encrypted token storage and replace org-specific JQL with a neutral example.
- Suggested priority: Later.

## 8. File-Level Findings

| File/Folder | Issue | Severity | Recommendation |
|---|---|---:|---|
| `server/src/db/transaction.ts` | Async transaction helper on singleton SQLite connection | Critical | Replace with sync transactions or serialized transaction context |
| `server/src/routes/auth.ts` | Public bootstrap registration and unbounded in-memory throttle | Critical/Medium | Add setup token for production; cap/prune throttle map |
| `server/tests/helpers/db.ts` | Cleanup is fragile with FK/self-FK and partial table drops | Critical | Make reset FK-safe and move toward per-file temp DBs |
| `server/src/db/migrate.ts` | Handwritten DDL/alter/rebuild drift; failing migration path; token migration only default workspace | Critical/High | Add migration tests and drift checks; encrypt all workspace tokens |
| `server/src/routes/config.ts` | Route owns config persistence, Jira calls, resets, credentials, transactions | High | Extract config/Jira/reset services; make writes atomic |
| `server/src/routes/team.ts` | Route owns team persistence and Jira discovery | High | Extract team member and discovery services; fix env fallback isolation |
| `server/src/services/team-tracker.service.ts` | Large multi-responsibility service | High | Extract board, saved views, day/item mutation, assignment, carry-forward modules |
| `server/src/services/manager-desk.service.ts` | Large service with direct Team Tracker sync and cleanup/history/linking | High | Extract delegated sync, history, carry-forward, lookup, cleanup modules |
| `client/src/components/settings/SettingsPanel.tsx` | Large god component | High | Split into section components and form/access hooks |
| `client/src/components/table/DefectTable.tsx` | Large table component and incorrect `data-jira-link` prop | Medium | Fix prop bug; split table state/columns/filter controls |
| `client/src/components/JiraIssueLink.tsx` | Expects `dataJiraLink`, not the passed dashed prop | Medium | Use typed prop at call sites and test |
| `client/src/components/layout/DashboardLayout.tsx` | Always renders closed `TriagePanel` | Medium | Conditional render or enabled hooks |
| `client/src/components/triage/TriagePanel.tsx` | Hidden hooks before guard; drawer accessibility incomplete | Medium | Gate hooks and standardize drawer semantics |
| `shared/types.ts` | Cross-domain contract monolith | Medium | Split gradually into bounded contract files with barrel export |
| `client/src/App.tsx` | Routing/bootstrap/auth/cross-navigation all centralized | Medium | Introduce route manifest and extracted route gates |
| `.github/workflows/quality.yml` | Good validation workflow, currently blocked by red `npm test` | High | Fix server test suite so CI can pass |
| `.env.example` | Org-specific sample JQL; docs mismatch persisted tokens | Low | Use generic examples and document encrypted token storage |

## 9. Large / Complex Files

| File | Approx Concern | Why It Is Risky | Suggested Refactor |
|---|---|---|---|
| `server/src/services/team-tracker.service.ts` | 3,086 lines; class starts around line 933 | Many domains in one service; high merge conflict and side-effect risk | Keep facade, extract board query, saved views, day items, issue assignments, attention, carry-forward |
| `client/src/components/settings/SettingsPanel.tsx` | 2,269 lines | Jira settings, users, team, backups, maintenance, and JSX are mixed | Split shell/sections and form hooks |
| `server/src/services/manager-desk.service.ts` | 2,232 lines | CRUD, links, history, carry-forward, cleanup, Team Tracker sync in one file | Extract history, linking, carry-forward, cleanup, delegated task sync |
| `client/src/components/setup/SetupWizard.tsx` | 1,417 lines | Onboarding flow state and UI are difficult to review | Split into step components and setup form hook |
| `client/src/components/table/DefectTable.tsx` | 1,107 lines | Table state, columns, inline edit, filtering, row effects mixed | Extract column definitions, status filter, visited Jira state, table toolbar |
| `server/src/services/today.service.ts` | 1,063 lines | Action ranking, commands, summary, pulse, prompts, date policy mixed | Extract action builders and command handlers after tests |
| `shared/types.ts` | 1,003 lines | All domains share one conflict surface | Split by bounded context, keep barrel export |
| `server/src/db/migrate.ts` | 959 lines | Fresh DDL, alters, rebuild specs, repairs, secret migration in one file | Add drift checks first, then split future migrations by domain |
| `client/src/components/team-tracker/TeamTrackerPage.tsx` | 653 lines | Page orchestration and workflows mixed | Extract workflow state hook and page sections |
| `server/src/sync/engine.ts` | 608 lines | Sync orchestration, Jira mapping, runtime status together | Extract mapping and workspace sync state when changing sync behavior |

## 10. Duplicate or Repeated Logic

- Date helpers are duplicated in `team-tracker.service.ts`, `manager-desk.service.ts`, `today.service.ts`, and `server/src/utils/date.ts`. Extraction is important before more carry-forward/date behavior. Suggested utility: domain-specific `server/src/utils/date.ts` with explicit local/UTC naming.
- Runtime enums are duplicated between `shared/types.ts` and route-local Zod schemas. Extraction is important to prevent API drift. Suggested module: shared const arrays such as `TRACKER_STATUSES`, `MANAGER_DESK_STATUSES`, and Zod schema derivation.
- Config persistence is duplicated between full settings save and lightweight settings save in `server/src/routes/config.ts`. Extraction is important because writes are non-atomic. Suggested service: `ConfigService` plus `JiraConnectionService`.
- Jira credential fallback logic exists in `SettingsService`, `config.ts`, and `team.ts`. Extraction is urgent because `team.ts` leaks env fallback across workspaces.
- Query invalidation is repeated across manager desk, team tracker, my day, and settings hooks. Extraction is useful but not urgent. Suggested module: `client/src/lib/queryKeys.ts` and feature invalidation helpers.
- Dialog behavior is repeated with different completeness. Extraction is useful for accessibility. Suggested component: shared `DialogShell` or Radix-based primitives.
- Manager attention logic appears both in `client/src/lib/manager-attention.ts` and server Today action logic in `server/src/services/today.service.ts`. Extraction should wait until product semantics are compared; do not delete either yet.

## 11. Naming and Readability Issues

- `shared/types.ts` is too broad for the name "shared"; it is really a set of bounded API contracts. Keep the barrel name but split implementation files.
- `config.ts` route helpers such as `getConfigValue`, `upsertConfig`, `getConfiguredJiraToken`, and `validateJiraBaseUrl` are service-level concerns inside a route file.
- `TeamTrackerService` and `ManagerDeskService` names are accurate but too broad for their current responsibilities. A facade can keep those names while internal modules get specific names.
- Date helper names such as `endOfIsoDate` are ambiguous because one version returns `Date` and another returns string-like date boundaries.
- Some hook parameters are misleading. Example: Manager Desk mutation hooks accept `date` even when the value is not used for targeted invalidation.
- `dcc_session` is a legacy cookie name for a LeadOS product. This is not urgent, but it is a readability/product consistency issue.

## 12. Error Handling and Logging Review

Good:

- Global API error shape `{ error, status }` is mostly preserved.
- `HttpError` allows intentional status codes.
- Jira dependency errors are mapped to dependency-style status in `errorHandler`.
- Pino logging exists and deploy/backup/sync paths log important events.

Problems:

- Plain `Error("Issue not found")` becomes a 500 for some issue mutations.
- Duplicate unique constraints for usernames/tags can bubble as generic 500s.
- Config test endpoints return raw dependency messages, which may expose too much from hostile or misconfigured Jira endpoints.
- Jira client includes non-401/403/404 response bodies in thrown errors.
- Some frontend localStorage parse/write failures are silently ignored. That is acceptable for optional preferences, but not for any future critical state.
- Lint warns about `no-unsafe-finally` in `SettingsPanel.tsx`, which should be treated as a bug risk.

Recommendations:

- Standardize service-level not-found/conflict errors on `HttpError`.
- Add a SQLite constraint error mapper.
- Sanitize dependency response bodies in user-facing errors and log full details server-side.
- Add route-level tests for error contracts on high-value APIs.

## 13. Security Review

Critical/high concerns:

- First-run bootstrap can be claimed if exposed before manager creation.
- Legacy `/api/config/reset` can wipe core data without typed confirmation.
- Non-default workspace Jira tokens may remain plaintext after migration.
- `/api/team/discover` can use default/global Jira env config outside the default workspace.

Medium concerns:

- Jira outbound requests are SSRF-capable unless production `JIRA_ALLOWED_HOSTS` is configured. HTTPS-only is not enough by itself for a compromised manager account.
- Jira `Retry-After` is trusted without a cap and can stall requests.
- Raw session IDs are stored as bearer secrets in SQLite. A leaked DB/backup can replay active sessions until expiry.
- Password changes do not appear to invalidate other sessions.
- Auth throttling is in memory and can grow without bound.
- Expensive manager operations such as sync/test/discover lack durable rate limits or cooldowns.

Low concerns:

- App-level browser security headers are incomplete unless reverse proxy supplies them. `server/src/app.ts` sets limited static cache/nosniff headers, but no Helmet/CSP/frame-ancestors/HSTS/referrer policy is configured in app code.
- `.env.example` contains organization-specific JQL/account identifiers. Not a secret, but not ideal as a public setup template.

Recommendations:

- Add production setup token.
- Remove or harden legacy reset.
- Encrypt all persisted Jira token rows.
- Make Jira host allowlisting mandatory in production or restrict to expected Atlassian domains.
- Hash session IDs at rest and prune expired sessions.
- Add `helmet` or document/test equivalent proxy headers.
- Add durable or proxy-backed rate limits for auth and expensive manager operations.

## 14. Performance Review

Backend:

- The biggest backend performance risk is not raw query cost yet; it is lock behavior. Async transactions on one SQLite connection can hold locks across awaits.
- Team Tracker and Manager Desk board construction do many in-memory maps/sorts. This is acceptable for current likely team sizes, but should be measured before expanding to many workspaces or large teams.
- Index coverage is mostly thoughtful, but schema/migration drift makes it hard to trust that all important indexes exist in every DB state.
- `LIKE '%query%'` lookups in Manager Desk/Jira issue search are acceptable for small SQLite data. If issue volume grows materially, consider FTS indexes.
- Sync interval accepts any positive integer. Very low values can create avoidable load on Jira and SQLite.

Frontend:

- Build output is reasonable but has large chunks: `index` about 383 kB, `radix` about 198 kB, `motion` about 156 kB, `TeamTrackerPage` about 91 kB, `SettingsPanel` about 90 kB before gzip.
- Lazy loading in `App.tsx` is a good practice and should be preserved.
- Hidden `TriagePanel` hooks cause avoidable observers/requests.
- Broad query invalidation can trigger more refetching than necessary.
- Large component files increase render/debug complexity even if runtime performance is currently acceptable.

Avoid premature optimization:

- Do not add aggressive memoization everywhere.
- Prioritize fixing hidden data hooks, transaction lock behavior, and query key factories before micro-optimizing render paths.

## 15. Testing Review

Current coverage impression:

- The project has unusually broad tests for a young app: backend service/route tests and frontend component/hook tests are present.
- Client tests pass when run directly.
- Server tests are currently not reliable enough because the shared SQLite DB and cleanup helper can fail and poison later tests.

Validation evidence:

- Root `npm run test` failed in the server workspace.
- Local server result: 2 failed tests, 314 passed.
- Direct client result: 48 test files passed, 383 tests passed.
- A parallel review observed a larger cascade of server failures, consistent with shared DB cleanup/isolation fragility.

High-priority missing tests:

1. `resetDatabase()` after Manager Desk source/carry-forward chains exist.
2. Migration test for partial table drops and workspace-owned table rebuilds.
3. Non-default workspace Jira token encryption migration.
4. `/api/team/discover` multi-workspace env fallback isolation.
5. Transaction concurrency/rollback leakage around overlapping reset/carry-forward operations.
6. Real HTTP auth/cookie/login/change-password flow through `createApp`.
7. Missing issue mutation route contracts for patch/comment/exclude/restore.
8. Workspace maintenance reset with carried-forward Manager Desk chains.
9. Frontend regression for `JiraIssueLink` `dataJiraLink`.
10. Hook tests for `useWorkspaceMaintenance`, `useExcludeIssue`, and `useBoardQueryState`.

Test structure concerns:

- `server/tests/helpers/http.ts` is a useful fast helper, but it is not a true HTTP boundary. It injects request bodies and parses responses manually. Keep it, but add real `app.listen(0)` + `fetch` integration tests for auth/cookie/config/reset/backup paths.
- Server coverage thresholds exclude routes, middleware, migrations, Jira client, sync engine, app factory, and runtime credentials.
- Test data setup currently depends on a cleanup helper knowing every table and FK shape.

## 16. Frontend Review

Good:

- Feature folders are understandable.
- API access is centralized in `client/src/lib/api.ts`.
- TanStack Query hooks are the main data access layer.
- Query keys commonly include `authScopeKey`; `AuthProvider` clears cache on auth scope changes.
- Custom routing and role redirects are tested.
- Major surfaces have loading/error/empty states.
- Reduced-motion handling exists globally.
- Some newer dialogs show good focus-management patterns.

Issues:

- `client/src/App.tsx` centralizes too much routing/bootstrap/auth/cross-navigation behavior.
- `SettingsPanel.tsx`, `SetupWizard.tsx`, and `DefectTable.tsx` are too large.
- `DefectTable` passes `data-jira-link` to a custom component that expects `dataJiraLink`.
- `TriagePanel` starts hooks even when no issue is selected.
- Dialog/drawer accessibility is inconsistent.
- Query invalidation uses repeated raw string keys.
- Lint warnings include React hook dependency warnings.
- My Day error recovery button is misleading for developer users.

Recommendations:

- Introduce a route manifest before adding more views.
- Split Settings and Setup into section components/hooks.
- Add a dialog primitive and apply it to capture/modals/drawers.
- Add `queryKeys` factories.
- Fix the Jira link bug with a regression test.

## 17. Backend Review

Good:

- App factory with injected services is a strong foundation.
- Most route groups have Zod validation.
- Role middleware is explicit.
- Global error handler provides consistent JSON responses.
- Workspace scoping is widely present.
- Jira client has timeout and one 429 retry.
- Backup/deploy paths show operational care.

Issues:

- `config.ts` and `team.ts` routes are too thick.
- Service dependencies are partly hidden through constructor defaults.
- Transaction helper is unsafe for async work.
- Config writes are non-atomic.
- Missing issue mutations can return 500/false success.
- Unique constraint errors are not mapped to stable 409s.
- Auth throttle is in-memory and unbounded.
- Sync/test/discover operations need cooldown/config bounds.

Recommendations:

- Keep routes thin and extract service modules.
- Make service dependencies explicit from a composition root.
- Replace async transaction pattern.
- Add stable error mapping for not found/conflict/dependency failures.
- Bound expensive operations and config values.

## 18. Database / Data Model Review

Good:

- Workspace IDs are represented across most domain tables.
- Composite keys and indexes exist for important workspace-scoped lookups.
- Backups use native `better-sqlite3` backup API and verify core tables.
- `foreign_keys = ON` is enabled.

Issues:

- Schema/migration sources are duplicated.
- Migration/reset path is currently failing in tests.
- `manager_desk_items.source_item_id` is self-referential and cleanup/reset code does not consistently account for that.
- Some constraints/indexes exist only in migration SQL, not Drizzle declarations.
- Non-default Jira token encryption migration is incomplete.
- App sessions store raw session tokens.
- Several JSON-ish fields are stored as text (`labels`, `related_jira_keys`, history snapshots). This is acceptable for SQLite now, but should remain encapsulated behind typed mappers.

Recommendations:

- Add migration tests for fresh DB, existing old DB, partial old DB, and schema drift.
- Make reset/cleanup FK-safe.
- Document the migration update path.
- Hash session IDs at rest.
- Keep JSON parsing/serialization in mapper helpers, not scattered.

## 19. DevOps / Config / Environment Review

Good:

- `.github/workflows/quality.yml` runs install, DB guard, typecheck, tests, lint, format check, build check, and production dependency audit.
- `scripts/deploy.sh` refuses unsafe production checkout states, requires production encryption secret, validates before restart, and runs health checks.
- `.gitignore` excludes env files, runtime DBs, backups, build output, data secrets, and tsbuildinfo.
- `scripts/check-db-artifacts.sh` protects against committed runtime DB files.
- Vite dev proxy has local-target safety checks.

Issues:

- Current `npm test` failure blocks the quality workflow.
- Lint allows many warnings.
- `README.md` token-storage guidance is stale.
- `.env.example` includes organization-specific JQL.
- Server test DB lives under repo-root `data/`, which makes local state and test state easier to confuse.
- Production security headers depend on app/proxy configuration that is not fully documented.

Recommendations:

- Fix tests first so CI is meaningful.
- Add `--max-warnings=0` after reducing current lint warning count.
- Update README and `.env.example`.
- Move test DBs to temp directories.
- Document required production headers or add Helmet.

## 20. AI-Agent Friendliness Review

Strengths:

- `AGENTS.md` gives a strong high-level briefing.
- Feature folders are named by product area.
- Commands and validation scripts are documented.
- The workspace split is easy for agents to understand.
- Shared contracts reduce guesswork for API payloads.

Risks for future coding agents:

- Very large files make local reasoning and safe patching harder.
- Route/service boundaries are inconsistent, so agents may add logic to the wrong layer.
- `shared/types.ts` is a high-conflict file touched by many unrelated changes.
- Manual migrations require agents to update several parallel schema representations.
- Query keys are raw strings in many files, so agents may miss invalidation.
- Hidden service dependencies make tests less predictable.
- Red tests reduce confidence and make it harder for agents to know whether their changes caused failures.

Agent-friendly improvements:

- Create a short "how to add a backend capability" checklist covering route schema, shared type, service, migration, tests.
- Create a migration checklist near `server/src/db/migrate.ts`.
- Split large files along feature boundaries.
- Add route manifests and query key factories.
- Keep public facades stable while extracting internal modules.
- Add focused tests before refactoring high-change areas.

## 21. Recommended Refactoring Roadmap

### Phase 1: Must Fix Before More Features

- Add production setup token/invite guard for first-run bootstrap.
- Remove or harden legacy `/api/config/reset`.
- Replace or serialize async SQLite transaction helper.
- Fix server test suite and `resetDatabase()`/migration fragility.
- Fix `/api/team/discover` workspace env fallback leakage.
- Encrypt all non-default workspace persisted Jira tokens.
- Add tests for the above.

### Phase 2: Improve Maintainability

- Extract service logic from `server/src/routes/config.ts` and `server/src/routes/team.ts`.
- Split `TeamTrackerService` behind a stable facade.
- Split `ManagerDeskService` behind a stable facade.
- Split `SettingsPanel.tsx` into sections/hooks.
- Add `queryKeys` factories and invalidation helpers.
- Consolidate date helpers and runtime enum constants.
- Add migration drift checks and document migration workflow.

### Phase 3: Cleanup and Polish

- Reduce lint warnings and turn selected warnings into errors.
- Standardize dialogs/drawers on a shared primitive.
- Add missing aria-labels.
- Fix My Day error recovery wording/behavior.
- Update README and `.env.example`.
- Broaden coverage gates gradually.
- Add Helmet or document/test reverse proxy security headers.

## 22. Top 10 Action Items

| Rank | Action | Why | Estimated Risk | Suggested Priority |
|---:|---|---|---|---|
| 1 | Fix server test suite and DB reset/migration fragility | CI/root validation is red | Medium | Immediate |
| 2 | Add production setup token for first-run bootstrap | Prevents takeover of public fresh install | Medium | Immediate |
| 3 | Replace async SQLite transaction helper | Prevents cross-request transaction contamination | High | Immediate |
| 4 | Remove or harden `/api/config/reset` | Prevents unconfirmed destructive wipe | Low/Medium | Immediate |
| 5 | Fix multi-workspace Jira discovery env fallback | Prevents tenant/config leakage | Medium | Immediate |
| 6 | Encrypt all persisted Jira token rows | Prevents plaintext secrets in DB/backups | Low/Medium | Immediate |
| 7 | Extract config/team route service logic | Restores route/service layering | Medium | High |
| 8 | Split Team Tracker and Manager Desk services behind facades | Reduces long-term change risk | High | High |
| 9 | Split `SettingsPanel.tsx` | Makes Settings safe to extend | Medium | High |
| 10 | Add query key factories and enum/date shared constants | Reduces drift and missed invalidations | Low/Medium | Medium |

## 23. What Not To Refactor Yet

- Do not replace the custom router with React Router now. Custom routing is documented product behavior; first introduce a route manifest and tests if routing changes are needed.
- Do not split `shared/types.ts` blindly in one large PR. Start by adding runtime constants and bounded-context files with a barrel export.
- Do not delete `client/src/lib/manager-attention.ts` yet. Compare its semantics with `TodayService` before consolidation.
- Do not rewrite `server/src/db/migrate.ts` wholesale. Add coverage and drift checks first, then improve future migration structure.
- Do not mass-format or mass-import-fix the whole repository while critical fixes are pending. It will create noise and hide behavioral changes.
- Do not deeply refactor Team Tracker or Manager Desk before the test suite is green and high-risk transaction/reset issues are fixed.
- Do not optimize frontend chunks before fixing hidden data hooks and maintainability boundaries.

## 24. Final Recommendation

The codebase is healthy enough to continue as a product only if the Phase 1 reliability and security fixes happen first. It is not healthy enough for broad new feature work today because root tests are red and several high-blast-radius backend paths need hardening.

Best next step: fix the backend test/migration/reset failure, add production bootstrap protection, harden or remove the legacy reset endpoint, and replace the async transaction helper. After those are covered by tests, proceed with incremental refactors around `config.ts`, `team.ts`, `TeamTrackerService`, `ManagerDeskService`, and `SettingsPanel.tsx`.
