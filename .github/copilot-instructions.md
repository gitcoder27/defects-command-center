# Project Guidelines

## Scope
These instructions apply across the `client/`, `server/`, and `shared/` workspaces in this monorepo.

## Code Style
- Use strict TypeScript patterns already present in the repo (`tsconfig.base.json`, workspace `tsconfig.json` files).
- Keep service and UI logic modular; prefer small functions/components with clear names.
- Reuse shared contracts from `shared/types.ts` instead of redefining API shapes in multiple places.
- Follow existing import aliases and file organization patterns in each workspace.

## Architecture
- Frontend: React + Vite in `client/`; server state via TanStack Query hooks in `client/src/hooks/`, UI composition in `client/src/components/`.
- Backend: Express app in `server/src/app.ts`, route handlers in `server/src/routes/`, business logic in `server/src/services/`.
- Persistence: SQLite via Drizzle schema in `server/src/db/schema.ts` and connection in `server/src/db/connection.ts`.
- Sync: Jira integration and sync flow in `server/src/jira/` and `server/src/sync/engine.ts`.
- Cross-layer contracts: `shared/types.ts` is the source of truth for shared domain types.

## Build And Test
- Preferred on Windows: run commands through `run-node20.ps1` from repo root.
- Install: `./run-node20.ps1 -Mode install`
- Full local check: `./run-node20.ps1 -Mode all`
- Backend dev: `./run-node20.ps1 -Mode dev`
- Frontend dev: `./run-node20.ps1 -Mode client-dev`
- Backend tests: `./run-node20.ps1 -Mode test`
- Frontend tests: `./run-node20.ps1 -Mode client-test`
- Root npm alternatives:
  - `npm run dev`
  - `npm run build`
  - `npm run test`
  - `npm run test:coverage`

## Conventions
- Validate request payloads with Zod on write endpoints (`server/src/middleware/validate.ts`).
- Preserve backend error contract: JSON responses in `{ error, status }` shape (see `server/src/middleware/errorHandler.ts`).
- Keep route files thin and push domain logic into services.
- Frontend data-fetching should use existing query-hook patterns rather than ad hoc fetch calls in components.
- In frontend tests, use the existing `client/src/test/wrapper.tsx` provider setup.
- In backend tests, keep tests hermetic by mocking Jira/DB boundaries where possible.

## Environment Pitfalls
- Node 20 is expected. Newer Node versions (notably v25) can fail on `better-sqlite3` native installs.
- If native sqlite install fails for test-only validation, `npm install --ignore-scripts` can still support TypeScript and Vitest runs with mocked DB tests.
- Jira credentials and JQL come from `.env`; do not hardcode or commit secrets.

## Key References
- `README.md`
- `docs/02-system-design.md`
- `docs/04-technical-plan.md`
- `server/tests/`
- `client/src/test/`
