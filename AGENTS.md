# Repository Guidelines

## Project Structure & Module Organization
This repository is a TypeScript monorepo with three workspaces:
- `client/`: React + Vite frontend (`src/components`, `src/hooks`, `src/context`, `src/test`)
- `server/`: Express backend (`src/routes`, `src/services`, `src/db`, `src/jira`, `src/sync`, `tests`)
- `shared/`: cross-layer contracts in `types.ts`

Supporting folders:
- `data/` for the SQLite database file at runtime
- `docs/` for product and system design references

## Build, Test, and Development Commands
Run from repo root unless noted:
- `npm install`: install all workspace dependencies
- `npm run dev`: run backend and frontend concurrently
- `npm run dev:server`: backend only (`server`)
- `npm run dev:client`: frontend only (`client`)
- `npm run build`: build client then server
- `npm run start`: start compiled backend
- `npm run test`: run backend Vitest suite
- `npm run test --workspace=client`: run frontend Vitest suite
- `npm run test:coverage`: backend coverage report with thresholds

Windows users can use `run-node20.ps1` modes (for example `-Mode all`, `-Mode client-test`).

## Coding Style & Naming Conventions
- Use strict TypeScript patterns and reuse `shared/types.ts` rather than redefining API shapes.
- Follow existing file-local formatting (2-space indent, semicolons, quote style already used in each workspace).
- React components use `PascalCase` filenames (for example `DefectTable.tsx`); hooks use `useX.ts` names.
- Backend services follow `*.service.ts`; route modules are domain-focused in `server/src/routes/`.
- Keep route handlers thin; place domain logic in services. In the frontend, prefer query hooks and `client/src/lib/api.ts` over ad hoc `fetch` in components.

## Testing Guidelines
- Framework: Vitest in both workspaces.
- Backend tests live in `server/tests/**/*.test.ts`.
- Frontend tests live in `client/src/test/**/*.test.tsx?`.
- Backend coverage thresholds (see `server/vitest.config.ts`): 80% lines/statements/functions, 70% branches for `src/services/**/*.ts`.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style seen in history (`feat:`, `fix:`, `chore:`) with concise imperative summaries.
- PRs should include:
  - clear scope (`client`, `server`, `shared`)
  - test commands run and outcomes
  - screenshots/GIFs for UI changes
  - linked issue(s) and any config/schema impacts
- Do not commit secrets; use `.env.example` as the template for local `.env`.
