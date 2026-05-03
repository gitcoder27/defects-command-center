# LeadOS Senior Engineering Code Review

Review date: 2026-05-03  
Repository: `/home/ubuntu/Development/lead-os`  
Branch reviewed: `main`  
Review style: static code review, architecture review, screen-level UX/accessibility review, and validation through the existing local test/build commands.

## Executive Summary

LeadOS is a credible and useful application with clear product direction, good monorepo boundaries, broad route/service coverage, and a healthy amount of frontend and backend tests. The app generally follows its intended architecture: client data access is centralized around TanStack Query and `client/src/lib/api.ts`, backend routes use service classes, shared contracts live in `shared/types.ts`, and manager/developer role boundaries are explicit in the route mounting model.

The codebase is not yet at an industry-standard production hardening bar. The largest gaps are secret/data handling, migration discipline, accessibility semantics, deterministic quality gates, and maintainability of several oversized screen/service modules. No P0 launch-stopping defects were found, but several P1 issues should be addressed before the project is treated as production-hardened.

## Validation Results

Commands run from the repository root:

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run test --workspace=server` | Passed, 22 files and 238 tests |
| `npm run test --workspace=client` | Passed, 38 files and 324 tests |
| `npm run build:check` | Passed |

Additional sub-agent validation reported `npm audit --omit=dev --workspaces` passed with 0 vulnerabilities.

## Severity Scale

| Severity | Meaning |
| --- | --- |
| P0 | Immediate blocker, data loss/security exploit very likely, or app cannot run |
| P1 | High-risk production issue, security/data/accessibility failure, or major user-impacting defect |
| P2 | Important quality, correctness, accessibility, or maintainability issue |
| P3 | Lower-risk polish, robustness, testing, or long-term maintainability issue |

## What Meets The Standard

- The monorepo boundaries are clear: `client`, `server`, and `shared` are separated with an understandable contract layer.
- Canonical product screens are easy to locate and custom route normalization is explicit in `client/src/App.tsx`.
- Most frontend data access uses hooks plus `client/src/lib/api.ts`; ad hoc `fetch` usage is not spread through screen components.
- Backend route mounting mostly enforces manager/developer boundaries at the right level. `/api/my-day` is developer-focused, while manager surfaces are protected by manager middleware.
- Backend uses Zod broadly for validating mutating routes.
- SQLite is configured with WAL and foreign keys enabled.
- Auth cookies use `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- Jira client behavior includes base URL normalization, timeout handling, one 429 retry, and Pino redaction of auth headers.
- Test coverage is meaningful for a project of this size, especially Team Tracker, Manager Desk, Settings, routes, Jira sync, and backend services.
- Follow-ups and Meetings are comparatively clean screen implementations and can serve as a reference for focused, accessible workflows.

## Highest Priority Findings

### P1-01: Runtime SQLite Backups Are Tracked

Evidence:

- `git ls-files data` reports tracked SQLite backup files:
  - `data/dashboard.db.bak.2026-04-18-003305`
  - `data/dashboard.sandbox.db.bak.2026-04-18-003555`
- The schema includes app user password hashes, sessions, Jira issue data, and persisted config values in `server/src/db/schema.ts`.

Why this does not meet standard:

Runtime database snapshots should not be committed. Even if the current files contain only development data, this pattern can leak password hashes, session material, Jira metadata, and persisted configuration.

Recommendation:

Remove the DB backup files from git history or at minimum from the current index, rotate any exposed credentials if the repository crossed a trust boundary, and add a pre-commit or CI guard that rejects SQLite/database artifacts under `data/`.

### P1-02: Jira API Token Is Stored In Plaintext And Copied Into Backups

Evidence:

- `server/src/routes/config.ts:177` writes `jira_api_token` into persisted config.
- `server/src/routes/config.ts:317` updates the same token from settings.
- `server/src/services/backup.service.ts:182` backs up the SQLite database as a whole.

Why this does not meet standard:

Operational secrets should not be stored as plaintext database rows and then replicated into backup files. Backups usually have wider retention, wider access, and weaker rotation practices than live secrets.

Recommendation:

Move Jira credentials to environment/secret storage or encrypt them with a key outside the database. Encrypt or exclude secrets in backups. Document the rotation procedure.

### P1-03: Constraint Migrations Can Drift On Existing Databases

Evidence:

- Unique constraints for tracker and desk day upserts are defined in `CREATE TABLE IF NOT EXISTS` DDL in `server/src/db/migrate.ts:126` and nearby table creation blocks.
- Existing databases created before those constraints will not necessarily receive the unique indexes.
- Services depend on `ON CONFLICT` behavior for those day records.

Why this does not meet standard:

Schema constraints that service code depends on must be versioned and idempotently applied to existing databases. `CREATE TABLE IF NOT EXISTS` only protects fresh databases.

Recommendation:

Introduce versioned migrations or explicit `CREATE UNIQUE INDEX IF NOT EXISTS` migrations with duplicate cleanup before applying constraints. Align Drizzle schema declarations with runtime DDL.

### P1-04: Work Global Shortcuts Hijack Browser Shortcuts

Evidence:

- `client/src/components/layout/DashboardLayout.tsx:86` handles keydown shortcuts by plain `event.key`.
- Modifier keys are not guarded before handling `r`, arrows, digits, and Enter.

Why this does not meet standard:

Plain key handlers should not intercept `Ctrl`, `Cmd`, `Alt`, or other platform/browser shortcuts. `Ctrl/Cmd+R` can be prevented and mapped to Jira sync instead of browser refresh.

Recommendation:

Ignore shortcuts when `event.ctrlKey`, `event.metaKey`, `event.altKey`, or relevant composition/input states are active. Add tests for modifier shortcuts.

### P1-05: My Day Read-Only Mode Is Only Visual

Evidence:

- Historical/inactive My Day controls are wrapped in `pointer-events-none` in `client/src/components/my-day/MyDayLeftColumn.tsx:70` and `client/src/components/my-day/MyDayRightColumn.tsx:56`.
- Child controls and mutation handlers remain focusable/callable for keyboard and assistive technology users.

Why this does not meet standard:

Read-only and disabled states must be enforced semantically in controls and handlers, not only with pointer CSS. CSS pointer blocking does not reliably prevent keyboard activation or screen reader operation.

Recommendation:

Pass `readOnly` or `disabled` into child controls, disable submit buttons and inputs, and guard mutation handlers directly. Keep server-side protection as the final backstop.

### P1-06: Settings Can Collapse On Narrow Screens

Evidence:

- `client/src/components/settings/SettingsPanel.tsx:779` renders a fixed 214px sidebar beside the main settings content.
- There is no responsive collapse path for mobile/narrow desktop layouts.

Why this does not meet standard:

Settings contains forms, tables, team lists, credentials, and maintenance controls. A fixed sidebar can leave too little content width, producing horizontal overflow or unusable controls on narrow screens.

Recommendation:

Switch settings navigation to tabs, a select, or a drawer below a breakpoint. Test at 320px, 768px, and desktop widths.

### P1-07: Work Table Primary Actions Are Mouse-Only

Evidence:

- `client/src/components/table/DefectTable.tsx:966` opens triage from clickable rows.
- Rows are not focusable and do not have keyboard activation or accessible action semantics.

Why this does not meet standard:

The Work screen is a core workflow. Keyboard and screen reader users need a discoverable, operable path to open the triage action.

Recommendation:

Prefer an explicit action button in the first cell or add focusable row action semantics with Enter/Space support while preserving table semantics.

### P1-08: Availability Dialog Lacks Modal Semantics And Focus Management

Evidence:

- `client/src/components/team-tracker/AvailabilityDialog.tsx:30` renders an overlay-like dialog without `role="dialog"`, `aria-modal`, Escape handling, focus trap, initial focus, or focus restoration.

Why this does not meet standard:

Dialogs and drawers need consistent focus behavior. Without it, keyboard and assistive technology users can lose context or interact with background content.

Recommendation:

Standardize on Radix Dialog or a shared modal/drawer primitive for all dialog and drawer surfaces.

## P2 Findings

### P2-01: Issue And Team Query Failures Can Render As Empty Data

Evidence:

- `client/src/components/table/DefectTable.tsx:177` consumes issue data but does not surface `error`/`isError` states; empty fallback copy appears later around `DefectTable.tsx:831`.
- `client/src/components/team-tracker/TeamTrackerPage.tsx:273` reads only data/loading/fetching from `useTeamTracker`, with empty copy around `TeamTrackerPage.tsx:495`.

Recommendation:

Render explicit error and retry states for failed queries. Do not let failed API calls become "No open defects" or "No tracker data."

### P2-02: Setup Saved-Token Jira Test Is A No-Op

Evidence:

- `client/src/components/setup/SetupWizard.tsx:277` returns early unless `jiraApiToken` input is non-empty.
- The Test Connection button can be enabled when a saved token exists around `SetupWizard.tsx:858`.

Recommendation:

Allow test connection to use the saved token path or disable the button with clear state until a new token is supplied.

### P2-03: Today Capture Actions Use Native Prompts

Evidence:

- `client/src/hooks/useTodayActions.ts:158` uses `window.prompt` for follow-up and meeting outcome capture.

Recommendation:

Replace native prompts with existing capture/dialog components so validation, accessibility, focus management, and tests are consistent with the rest of the app.

### P2-04: Work Table Sort And Inline Edit Controls Are Not Fully Accessible

Evidence:

- Sortable headers are clickable `th` elements without `aria-sort` or nested button semantics in `client/src/components/table/DefectTable.tsx:888`.
- Inline assignee and due-date edit affordances are clickable spans around `DefectTable.tsx:473`.

Recommendation:

Use buttons inside sortable headers, set `aria-sort`, preserve visible focus states, and convert inline edit spans to buttons with labels.

### P2-05: Quick Capture And Task Forms Rely On Placeholders Instead Of Programmatic Labels

Evidence:

- `client/src/components/capture/DeskCaptureForm.tsx:90`
- `client/src/components/manager-desk/QuickCapture.tsx:80`
- `client/src/components/my-day/AddTaskForm.tsx:88`

Recommendation:

Add `label`/`htmlFor` pairs or `aria-label`s, and use radio/pressed/selected semantics for segmented choices.

### P2-06: Setup Wizard Step Props Are Untyped

Evidence:

- `client/src/components/setup/SetupWizard.tsx:763` and `SetupWizard.tsx:1127` use explicit `any` prop plumbing for `StepContent` and `StepFooter`.

Recommendation:

Replace `any` with explicit step prop types or a discriminated step model. This is a high-risk onboarding surface that deserves strict typing.

### P2-07: Toggle Chips Expose State Visually Only

Evidence:

- `client/src/components/settings/SettingsPanel.tsx:2240` defines `ToggleChip` as a button-like state control without selected/pressed semantics.

Recommendation:

Use `aria-pressed`, checkbox semantics, or radio semantics depending on intent. Use real `disabled` behavior instead of only styling unavailable states.

### P2-08: Issue Query Validation Can Turn Bad Input Into 500s

Evidence:

- `server/src/routes/issues.ts:49` casts query params with `as any`.
- Invalid filters can reach downstream switch logic without a defensive default.

Recommendation:

Validate `filter`, `sort`, and `order` with Zod enums and return 400 for invalid input. Add a defensive default in service/query logic.

### P2-09: Global Error Handler Drops Some HTTP Statuses

Evidence:

- `server/src/middleware/errorHandler.ts:19` recognizes Zod and `HttpError`, but does not consistently preserve `status`, `statusCode`, or `expose` from parser and wrapped domain errors.

Recommendation:

Handle body-parser errors, payload-too-large errors, and user-facing domain failures explicitly. Avoid converting known client errors into 500s.

### P2-10: GET Team Endpoints Mutate Data

Evidence:

- `server/src/routes/team.ts:140` calls `normalizeLegacyDevelopers`, which can delete legacy `dev-1` and `lead-1` records during a read path.

Recommendation:

Move cleanup into a one-time migration or explicit maintenance command. GET endpoints should be safe and repeatable.

### P2-11: Reset Flows Are Not Transactional

Evidence:

- `server/src/services/workspace-maintenance.service.ts:68` deletes across multiple tables without a single transaction and without consistent coordination with background sync.

Recommendation:

Wrap destructive resets in a transaction, coordinate backup and sync lifecycle, and require typed confirmation for all destructive workspace resets.

### P2-12: Auth Lacks Throttling And Uses Sync Password Hashing

Evidence:

- `server/src/services/auth.service.ts:42` uses `scryptSync`.
- Login and password change paths have no rate limiting or backoff.
- `server/src/routes/auth.ts:126` exposes change password by username/current password instead of requiring an authenticated session.

Recommendation:

Add IP/user throttling and backoff. Prefer async password hashing or a hardened auth library. Consider making password change session-bound for logged-in users, with a separate recovery flow if needed.

### P2-13: Admin-Controlled External And File Targets Lack Guardrails

Evidence:

- Managers can configure arbitrary Jira base URLs consumed by `server/src/jira/client.ts:52`.
- Managers can configure backup directories through settings in `server/src/routes/config.ts`.

Recommendation:

Restrict Jira hosts to approved domains or add explicit allow-listing. Constrain backup directories to approved app-owned paths.

### P2-14: Root Test Gate Skips Client Tests

Evidence:

- `package.json:22` runs only `npm run test --workspace=server`.
- `package.json:23` coverage is server-only.

Recommendation:

Make root `test` run both client and server. Add `test:client`, `test:server`, and client coverage thresholds for critical screens/hooks.

### P2-15: No Lint, Format, Or CI Quality Gate Is Present

Evidence:

- No `.github/workflows` files were found.
- Root scripts do not include lint or format checks.
- `client/tsconfig.json:15` and `client/tsconfig.json:16` disable unused local/parameter checks.

Recommendation:

Add ESLint with TypeScript, React Hooks, JSX a11y, import rules, and a formatter such as Prettier or Biome. Add CI that runs `npm ci`, typecheck, tests, audit, lint, and build.

### P2-16: Production Deploy Is Not Deterministic

Evidence:

- `scripts/deploy.sh:143` uses `npm install` before building.

Recommendation:

Use `npm ci` for lockfile-deterministic installs. Run the same validation gate used in CI before restart.

### P2-17: Production Environment Loading Can Be Overridden By Development Local Env

Evidence:

- `server/src/load-env.ts:14` loads `.env.development.local` regardless of `NODE_ENV`.
- `server/src/load-env.ts:17` uses `override: true`.

Recommendation:

Only load development local files in development. Avoid overriding system/platform env vars in production.

### P2-18: Oversized Core Screens And Services Are Past Maintainable Boundaries

Evidence from `wc -l`:

| File | Lines |
| --- | ---: |
| `server/src/services/team-tracker.service.ts` | 2729 |
| `client/src/components/settings/SettingsPanel.tsx` | 2265 |
| `server/src/services/manager-desk.service.ts` | 2117 |
| `client/src/components/setup/SetupWizard.tsx` | 1332 |
| `client/src/components/table/DefectTable.tsx` | 1006 |
| `shared/types.ts` | 949 |

Recommendation:

Split by use case and ownership boundary: settings sections, setup step models, table subcomponents, service policy modules, persistence mappers, query builders, carry-forward logic, and attention signal calculators.

## P3 Findings

### P3-01: Shared Comment Response Contract Is Inconsistent

Evidence:

- `shared/types.ts:420` declares `IssueCommentResponse`.
- `server/src/routes/issues.ts:90` returns a different shape.

Recommendation:

Align shared contract, route response, and client tests.

### P3-02: Concurrent Sync Reports Success Without Syncing

Evidence:

- `server/src/sync/engine.ts:54` returns success with zero work when sync is already running.

Recommendation:

Return `skipped`, 202, or 409 with current sync status so operators can distinguish "already running" from "completed successfully."

### P3-03: Route Schemas And UI Props Still Use `any`

Evidence:

- `client/src/components/my-day/MyDayLeftColumn.tsx:20`
- `client/src/components/my-day/MyDayRightColumn.tsx:12`
- `client/src/components/setup/SetupWizard.tsx:763`
- Several backend routes use `z.any().optional()` and casts in request parsing.

Recommendation:

Replace `any` with shared types, route-specific Zod enums, and discriminated unions where appropriate.

### P3-04: Update Endpoints Accept Empty Patch Bodies Inconsistently

Evidence:

- Manager Desk update schemas include stronger object validation.
- My Day and Team Tracker update schemas do not consistently reject empty bodies.

Recommendation:

Standardize PATCH schemas so empty updates return 400 and do not silently no-op.

### P3-05: Team/My Day Titles Can Be Whitespace-Only Through The API

Evidence:

- Team/My Day create schemas use `z.string().min(1)` without trimming in some paths.
- Manager Desk has stronger title normalization.

Recommendation:

Use `z.string().trim().min(1)` and normalize service inputs consistently.

### P3-06: Client API Wrapper Assumes JSON For All Successful Responses

Evidence:

- `client/src/lib/api.ts:28` calls `res.json()` for successful responses.

Recommendation:

Handle 204/no-content and non-JSON successful responses defensively, or document JSON-only as an API invariant.

### P3-07: Unknown Routes Silently Resolve To Today

Evidence:

- `client/src/App.tsx:72` maps route paths to views, with unknown paths falling back to Today.

Recommendation:

Render a 404/not-found state or redirect with clear intent, especially for mistyped URLs and broken links.

### P3-08: Active Navigation And Status Announcements Need ARIA Polish

Evidence:

- `client/src/components/layout/WorkspaceNavLink.tsx:40` styles active nav state visually but does not expose `aria-current="page"`.
- `client/src/components/setup/SetupWizard.tsx:614` renders prominent errors without an explicit live/alert role.
- `client/src/context/ToastContext.tsx:54` renders toasts without an obvious live region.

Recommendation:

Add `aria-current`, `role="alert"`, and `role="status"` where appropriate.

### P3-09: Reduced Motion Is Not Systematically Supported

Evidence:

- The app uses motion, spin, pulse, and animation classes, but `client/src/index.css` does not define a `prefers-reduced-motion` baseline.

Recommendation:

Add a global reduced-motion policy and audit animated components for motion alternatives.

### P3-10: Test Globals Leak Into Production TypeScript Configs

Evidence:

- `client/tsconfig.json:12` includes `vitest/globals`.
- `server/tsconfig.json:8` includes `vitest/globals`.

Recommendation:

Move test globals into Vitest-only or test-specific TypeScript configs.

### P3-11: Follow-Ups And Meetings Need Direct Screen Tests

Evidence:

- `client/src/components/manager-memory/ManagerMemoryPage.tsx:47` is the real screen.
- Existing App routing tests mock this page rather than exercising its user flows.

Recommendation:

Add tests for loading, error, empty, create, search, status change, and filter flows for `/follow-ups` and `/meetings`.

### P3-12: Build-Check Scripts Write Artifacts

Evidence:

- Client and server `build:check` scripts emit `.build-check` output directories.

Recommendation:

Keep `typecheck` as the no-write validation path. Make build-check clean its output, use temp directories, or document that it writes ignored artifacts.

## Screen-By-Screen Assessment

### App Shell And Routing

Status: mostly meets standard.

Strengths:

- Routes are centralized and easy to understand in `client/src/App.tsx`.
- Legacy paths normalize to canonical product routes.
- Manager/developer routing is explicit and tested.

Gaps:

- Unknown paths fall through to Today instead of a not-found route.
- Work still uses a separate `DashboardLayout` path while other screens use `WorkspaceShell`, which increases shell drift risk.
- Active navigation needs `aria-current`.
- More menu and icon-only controls should be checked for labels and keyboard behavior.

### Today

Status: meets product intent, with accessibility and interaction gaps.

Strengths:

- Clear daily command orientation.
- Good hook-driven data model.
- Useful action workflow around check-ins, follow-ups, meetings, and carry-forward.

Gaps:

- `useTodayActions.ts` uses native prompts for some capture actions.
- Dialogs should share the same accessible modal primitive used elsewhere.
- Action rows can create multiple tab stops for a single logical action.

### Work

Status: feature-rich but below standard for keyboard accessibility and shortcut safety.

Strengths:

- High-density triage surface with filters, table, Jira sync, quick actions, and tests.
- Useful global shortcuts when focused on Work.

Gaps:

- Global shortcuts can intercept browser shortcuts.
- Failed issue queries can look like empty issue lists.
- Table rows are mouse-only primary actions.
- Sort headers and inline edit controls lack button/ARIA semantics.
- `DefectTable.tsx` is too large at 1006 lines.
- `TriageQuickActions.tsx` nests inputs/selects inside a `role="button"` chip pattern, which is fragile for keyboard and assistive technology users.

### Team Tracker

Status: strong domain coverage, but key accessibility and maintainability risks remain.

Strengths:

- Good manager board concept with day plans, developer status, saved views, attention signals, and carry-forward.
- `RosterRow` and view switching patterns are stronger than many other screens.
- Tests cover a meaningful portion of behavior.

Gaps:

- Top-level query failures can render as empty tracker states.
- Availability dialog lacks modal semantics and focus management.
- Some card and row patterns nest interactive buttons inside clickable containers.
- `TeamTrackerPage.tsx` and `team-tracker.service.ts` are too large for easy review.
- Domain logic should be split into board read models, mutation use cases, attention signals, saved views, and carry-forward modules.

### Manager Desk

Status: one of the stronger screens, with service-size and shared modal concerns.

Strengths:

- Good alignment with LeadOS product direction: capture, planning, decisions, linked people, linked Jira issues, and carry-forward.
- Better loading/error/retry handling than several other surfaces.
- Drawer and detail workflows are more structured than the Work table flows.

Gaps:

- `manager-desk.service.ts` is 2117 lines and should be split by domain use case.
- `CarryForwardDialog.tsx` is also large and deserves extraction.
- Drawer/dialog focus restoration should be standardized through a shared primitive.
- Quick capture needs stronger labels and selected-state semantics.

### Follow-Ups

Status: comparatively clean, but under-tested.

Strengths:

- Focused workflow backed by the Manager Desk data model.
- Search and composer patterns are cleaner than many other screens.
- Avoids overloading entire rows as hidden primary actions.

Gaps:

- Direct screen tests are shallow or absent.
- Needs explicit tests for create, mark done, search, empty, loading, and error states.
- Should inherit shared dialog/form accessibility improvements.

### Meetings

Status: comparatively clean, but under-tested.

Strengths:

- Reuses Manager Desk model without creating a separate data island.
- Workflow is focused and easier to reason about than larger dashboard screens.

Gaps:

- Needs direct tests for meeting note/action flows.
- Should share the same form labeling and status-announcement conventions as Follow-ups and Desk.

### Settings

Status: feature-complete but not maintainable or responsive enough.

Strengths:

- Covers Jira configuration, field discovery, team membership, app users, backups, and maintenance.
- Password generation uses `crypto.getRandomValues`, which is the right primitive.
- Settings behavior has meaningful test coverage.

Gaps:

- `SettingsPanel.tsx` is 2265 lines and carries too much state, layout, and business flow in one component.
- Fixed sidebar risks narrow-screen failure.
- Toggle chips expose selected state visually only.
- Some destructive settings flows use weaker confirmation patterns than the dedicated maintenance reset flow.
- Jira token handling does not meet secret-management standards.

### My Day

Status: useful developer surface, but read-only and typing need tightening.

Strengths:

- Clear developer-only route and API boundary.
- Good separation from manager surfaces.
- Login fields are better handled than many internal forms.

Gaps:

- Read-only/historical state is enforced with pointer CSS instead of disabled semantics and guarded handlers.
- Add task and quick update forms need programmatic labels.
- Components use `any` for important day/update props.
- Status and error banners should be announced.

### Setup Wizard

Status: complete onboarding flow, but high-risk implementation details need hardening.

Strengths:

- Covers manager account creation, Jira connection, manager mapping, team selection, and developer access.
- Skip paths and guided setup are product-appropriate.
- First account must be manager, which matches the domain.

Gaps:

- `SetupWizard.tsx` is 1332 lines.
- `StepContent` and `StepFooter` use `any` in a critical onboarding surface.
- Saved Jira token test button can appear enabled but do nothing.
- Error banners should use alert/live semantics.
- Some setup selections are visual-only and need selected/pressed semantics.

### Global Capture And Shared UI

Status: visually consistent, but shared accessibility primitives are missing.

Strengths:

- Capture flows are consistent with the LeadOS product direction.
- Capture forms avoid spreading raw network calls through arbitrary UI code.

Gaps:

- Quick capture controls need labels and selected-state semantics.
- Toasts need live-region semantics and safer button defaults.
- The app should have one shared accessible Dialog/Drawer primitive for focus trap, Escape close, `aria-modal`, initial focus, and restoration.

## Backend And Data Assessment

Status: functional and well tested, but not production-hardened enough for secrets, migrations, and destructive operations.

Strengths:

- Routes are generally thin enough to see the HTTP boundary.
- Business logic lives in services.
- Manager/developer auth boundaries are explicit.
- Zod validation is common.
- Jira sync has a concurrency guard.
- Backup service verifies generated backups.

Gaps:

- Secret storage and backup behavior do not meet production standards.
- Existing database migration drift can undermine service assumptions.
- Some GET endpoints mutate data.
- Reset flows should be transactional.
- Error handling should preserve known HTTP statuses.
- Route query validation should reject bad input before service logic.
- Auth needs throttling/backoff and async hashing.
- Admin-controlled Jira URLs and backup paths need guardrails.
- Very large services should be decomposed by domain use case.

## Testing, Tooling, And Operations Assessment

Status: good local test assets, incomplete automated quality gate.

Strengths:

- Typecheck, backend tests, frontend tests, and build-check pass.
- Backend tests are extensive for routes/services/Jira/sync.
- Client tests cover many important screens and hooks.
- Deploy script has useful production checkout and dirty-tree guards.

Gaps:

- Root `npm test` excludes client tests.
- No lint/format/JSX accessibility quality gate is present.
- No GitHub Actions workflow is present.
- Production deploy uses `npm install` instead of `npm ci`.
- Environment loading can let development local files override production settings.
- Test globals are included in production tsconfigs.
- Build-check emits artifacts.
- Follow-ups and Meetings need direct screen tests.

## Recommended Remediation Plan

### First Priority

1. Remove tracked SQLite backup files and add a database-artifact guard.
2. Move or encrypt Jira API token storage and update backup handling.
3. Add versioned migrations or explicit unique-index migrations for existing DBs.
4. Fix Work global shortcut modifier handling.
5. Make My Day read-only state semantic and handler-enforced.
6. Fix Work table keyboard access for row actions, sorting, and inline edits.
7. Replace `AvailabilityDialog` and similar overlays with a shared accessible dialog primitive.

### Second Priority

1. Add lint/format/JSX a11y tooling and CI.
2. Make root `npm test` run both workspaces.
3. Add auth throttling/backoff and move password hashing off synchronous request paths.
4. Make reset flows transactional.
5. Fix query error states in Work and Team.
6. Fix Setup saved-token test behavior.
7. Add responsive navigation for Settings.

### Third Priority

1. Split oversized screen components and services.
2. Replace `any` and weak route casts with explicit shared types and Zod enums.
3. Add direct tests for Follow-ups and Meetings.
4. Add reduced-motion and live-region polish.
5. Align shared response contracts.
6. Harden sync status reporting and API no-content handling.

## Overall Assessment

LeadOS meets a solid internal-tool engineering baseline: it builds, typechecks, has meaningful automated tests, and the product surfaces are coherently organized. It does not yet meet a mature industry production standard in security/secret handling, migration safety, accessibility, CI/tooling, and long-term maintainability.

The most important theme is not that the product is disorganized. It is that several high-value workflows have grown faster than the guardrails around them. The next engineering push should focus less on adding features and more on hardening the operational foundation, accessibility model, and module boundaries.
