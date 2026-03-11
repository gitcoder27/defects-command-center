# Repository Guidelines

## Project Structure & Module Organization
This repository is a TypeScript monorepo with three workspaces:
- `client/`: React + Vite SPA. Entry points are `src/main.tsx` and `src/App.tsx`. The UI is organized by feature under `src/components/`:
  - `layout/`, `overview/`, `filters/`, `table/`, `triage/`, `alerts/`, `workload/` for the manager dashboard
  - `team-tracker/` for the manager team tracker board
  - `my-day/` for the developer daily workspace and shared login screen
  - `manager-desk/` for the manager task-planning workspace
  - `settings/` and `setup/` for configuration, bootstrap, and onboarding
- `client/src/context/`: app-wide providers for auth, theme, and toast state.
- `client/src/hooks/`: React Query-based data hooks and mutations. Prefer adding data access here rather than inside components.
- `client/src/lib/`: shared client utilities, constants, and the centralized API client in `lib/api.ts`.
- `client/src/test/`: frontend Vitest coverage for views, hooks, and utilities.
- `server/`: Express backend. Runtime entry is `src/index.ts`; `src/app.ts` builds the app for runtime and tests.
  - `src/routes/`: API route modules for `auth`, `config`, `issues`, `overview`, `team`, `team-tracker`, `my-day`, `manager-desk`, `alerts`, `suggestions`, `sync`, `tags`, and `backups`
  - `src/services/`: domain logic and orchestration
  - `src/db/`: SQLite connection, schema, migrations, and path helpers
  - `src/jira/`: Jira client, JQL helpers, and Jira-facing types
  - `src/sync/`: scheduled Jira sync engine
  - `src/middleware/`, `src/utils/`, `src/types/`, `src/scripts/`: shared server plumbing, logging, typed Express extensions, and CLI utilities
- `server/tests/`: backend Vitest route/service coverage plus `tests/helpers/`.
- `shared/`: cross-layer contracts in `shared/types.ts`. This file now includes dashboard, auth, Team Tracker, My Day, and Manager Desk types.

Supporting folders:
- `data/`: runtime SQLite data and operational artifacts. Expect `dashboard.db`, `backups/`, and `manual-snapshots/` here.
- `server/data/`: server-only test fixtures such as backup/config test assets, not the primary runtime DB.
- `docs/`: product, architecture, implementation, handoff, and deployment/runbook documents.
- `agent/`: repo-local prompts and skills used for agent workflows.

## Current Application Surface
The app is no longer a single dashboard. Current top-level surfaces are:
- Manager dashboard: overview cards, alerts, filter sidebar, defect table, triage panel, and workload bar
- Team Tracker: manager view of developer day plans, status, check-ins, current work, and carry-forward flows
- My Day: developer-only daily workspace for current/planned/completed/dropped work and check-ins
- Manager Desk: manager-only daily planning/capture workspace with linked issues and developers
- Settings: Jira configuration, field discovery, team membership management, and app user management
- Setup Wizard: first-run bootstrap for manager account creation, Jira connection, manager mapping, team selection, and developer access

Routing is handled inside `client/src/App.tsx` with `window.history.pushState` and `popstate`; the app does not use React Router. Current paths are `/`, `/team-tracker`, `/my-day`, `/manager-desk`, and `/settings`.

Authentication is cookie-based:
- `dcc_session` is the session cookie
- the first account must be a manager
- most API routes are manager-only
- developer access is primarily through `/api/my-day`

## Build, Test, and Development Commands
Run from repo root unless noted:
- `npm install`: install all workspace dependencies
- `npm run dev`: run backend and frontend concurrently
- `npm run dev:server`: backend only
- `npm run dev:client`: frontend only
- `npm run build`: build client then server
- `npm run typecheck`: run TypeScript validation in both workspaces without emitting production build artifacts
- `npm run build:check`: perform a full build validation into temporary `.build-check/` folders without touching `client/dist` or `server/dist`
- `npm run start`: start the compiled backend, which also serves `client/dist` in production when present
- `npm run test`: run backend Vitest suite
- `npm run test --workspace=client`: run frontend Vitest suite
- `npm run test:coverage`: backend coverage report with thresholds
- `npm run backup:restore -- <path-to-backup-db>`: restore a SQLite backup through the server workspace script
- `npm run auth:create-user --workspace=server -- --username <name> --password <password> --display-name <display> --role <manager|developer> [--developer-account-id <id>]`: create an app user from the CLI
- `npm run preview --workspace=client`: preview the built frontend
- `npm run test:watch --workspace=client`: frontend watch mode

Windows users can use `run-node20.ps1` modes:
- `all`, `install`, `build`, `test`, `dev`, `client-dev`, `client-build`, `client-test`

## Coding Style & Naming Conventions
- Use strict TypeScript patterns and reuse `shared/types.ts` instead of redefining API payloads locally.
- Follow existing file-local formatting conventions. The frontend mostly uses single quotes; the backend mostly uses double quotes.
- Frontend imports should prefer the `@/` alias and `shared/types` path alias where applicable.
- Keep data fetching and mutations in hooks and `client/src/lib/api.ts`; avoid ad hoc `fetch` calls inside components.
- React components use `PascalCase` filenames; hooks use `useX.ts`; feature folders are preferred over generic dumping grounds.
- Server routes should stay thin. Put validation in Zod schemas and business logic in `src/services/`.
- When adding a new backend capability, update the relevant route, service, and shared contract together.
- Be careful with auth and role expectations. Manager-only and developer-only flows are intentionally separated.
- Never create a component longer than 150 lines. If it exceeds this, split it into smaller components automatically. Always separate UI from logic.

## Testing Guidelines
- Framework: Vitest in both workspaces.
- Backend tests live in `server/tests/**/*.test.ts` and run in a Node environment.
- Frontend tests live in `client/src/test/**/*.test.tsx?` and run in `jsdom` with `client/src/test/setup.ts`.
- Backend coverage thresholds in `server/vitest.config.ts` remain 80% lines/statements/functions and 70% branches for `src/services/**/*.ts`.
- When changing route behavior, prefer route-level tests in addition to service coverage.
- When changing shared view logic, add or update frontend tests near the affected feature area.

## Operational Notes
- Runtime config is a mix of environment variables and persisted settings in SQLite. Jira API tokens are managed through runtime credentials and config flows.
- The backend performs startup migration, backup initialization, and scheduled Jira sync bootstrapping in `server/src/index.ts`.
- Default runtime storage lives under repo-root `data/`, not `server/data/`.
- Production backend serves the built SPA for non-API routes when `client/dist` exists.
- On this VPS, this checkout at `/home/ubuntu/Development/defects-command-center` is the development workspace. The live production checkout is `/home/ubuntu/apps/defects-command-center-prod`.
- Development and production are intentionally separated by both working directory and SQLite path. Development uses this checkout's local `data/` area, while production uses the production checkout's `data/` area.
- Safe local validation in the development workspace should prefer `npm run typecheck` or `npm run build:check`. Production deploys should be run only from `/home/ubuntu/apps/defects-command-center-prod`.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style (`feat:`, `fix:`, `chore:`) with concise imperative summaries.
- PRs should include:
  - clear workspace scope (`client`, `server`, `shared`, or `docs`)
  - test commands run and outcomes
  - screenshots/GIFs for UI changes
  - linked issue(s) and any config, auth, backup, or schema impacts
- Do not commit secrets; use `.env.example` as the template for local `.env`.

## Worktree Workflow
- Main integration workspace: `/home/ubuntu/Development/defects-command-center` on `main`. Keep this as the Cursor/testing workspace.
- Codex worktree A: `/home/ubuntu/Development/defects-command-center-codex-a` on `task/codex-a`.
- Codex worktree B: `/home/ubuntu/Development/defects-command-center-codex-b` on `task/codex-b`.
- Start each checkout from its own root with `npm run dev`; ports come from that checkout's root `.env` and optional `.env.local`.
- Safe validation: `npm run typecheck`, `npm run build:check`, `npm run test`, `npm run test --workspace=client`.
- Keep branches task-scoped and small. Do not broaden a worktree change beyond the assigned task.
