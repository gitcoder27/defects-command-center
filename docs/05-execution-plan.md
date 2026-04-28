# AI Developer Execution Plan

## Defect Management Command Dashboard

**Version:** 1.0
**Date:** March 5, 2026

---

## Purpose

This document breaks the entire Phase 1 build into **small, sequential, self-contained tasks** that an AI developer agent can execute one at a time. Each task produces a testable output and builds on the previous task.

---

## Prerequisites

- Node.js 20+ installed
- npm 10+ installed
- A Jira Cloud instance with API access (for integration testing)

---

## Execution Rules for the AI Agent

1. Complete each task fully before moving to the next.
2. After each task, verify the output (run, build, or test).
3. Do not skip tasks or combine tasks.
4. If a task fails, debug and fix before proceeding.
5. Follow the coding standards: TypeScript strict mode, Zod validation, proper error handling.
6. Add appropriate imports at the top of each file.
7. Use the shared types from `shared/types.ts` across client and server.

---

## Task Sequence

### PHASE A: Project Scaffolding (Tasks 1–6)

---

#### Task 1: Initialize Root Project

**Goal:** Create the monorepo root with npm workspaces.

**Steps:**
1. In the project root `defects-dashboard/`, create `package.json`:
   ```json
   {
     "name": "defects-dashboard",
     "version": "1.0.0",
     "private": true,
     "workspaces": ["client", "server", "shared"],
     "scripts": {
       "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
       "dev:server": "npm run dev --workspace=server",
       "dev:client": "npm run dev --workspace=client",
       "build": "npm run build --workspace=client && npm run build --workspace=server",
       "start": "npm run start --workspace=server",
       "test": "vitest run",
       "test:coverage": "vitest run --coverage"
     },
     "devDependencies": {
       "concurrently": "^8.2.0",
       "typescript": "^5.4.0",
       "vitest": "^1.6.0"
     }
   }
   ```
2. Create `tsconfig.base.json` with strict TypeScript config, paths for shared types.
3. Create `.gitignore` (node_modules, dist, data/*.db, .env).
4. Create `.env.example`:
   ```
   JIRA_BASE_URL=https://your-domain.atlassian.net
   JIRA_EMAIL=your-email@company.com
   JIRA_API_TOKEN=your-api-token
   JIRA_PROJECT_KEY=PROJ
   PORT=3001
   ```
5. Create `data/.gitkeep`.
6. Run `npm install`.

**Verify:** `npm run` shows all scripts. No errors.

---

#### Task 2: Set Up Server Package

**Goal:** Create a working Express + TypeScript server.

**Steps:**
1. Create `server/package.json`:
   ```json
   {
     "name": "server",
     "version": "1.0.0",
     "private": true,
     "scripts": {
       "dev": "tsx watch src/index.ts",
       "build": "tsc",
       "start": "node dist/index.js"
     },
     "dependencies": {
       "express": "^4.19.0",
       "better-sqlite3": "^11.0.0",
       "drizzle-orm": "^0.30.0",
       "node-cron": "^3.0.3",
       "pino": "^9.0.0",
       "pino-pretty": "^11.0.0",
       "zod": "^3.23.0",
       "dotenv": "^16.4.0"
     },
     "devDependencies": {
       "@types/express": "^4.17.21",
       "@types/better-sqlite3": "^7.6.9",
       "@types/node-cron": "^3.0.11",
       "tsx": "^4.7.0",
       "drizzle-kit": "^0.21.0"
     }
   }
   ```
2. Create `server/tsconfig.json` extending `../tsconfig.base.json`.
3. Create `server/src/index.ts`:
   - Load dotenv.
   - Import and start the Express app.
   - Listen on `PORT` (default 3001).
   - Log startup message.
4. Create `server/src/app.ts`:
   - Create Express app.
   - Add JSON body parser.
   - Add a health check route: `GET /api/health` → `{ status: "ok" }`.
   - Export the app.
5. Create `server/src/config.ts`:
   - Read from `process.env` using Zod schema validation.
   - Export typed config object.

**Verify:** Run `npm run dev:server`. Visit `http://localhost:3001/api/health` → returns `{"status":"ok"}`.

---

#### Task 3: Set Up Client Package

**Goal:** Create a working React + Vite + TypeScript frontend.

**Steps:**
1. Create `client/` with Vite + React + TypeScript template:
   - `client/package.json` with dependencies: react, react-dom, @tanstack/react-query, @tanstack/react-table, date-fns, lucide-react, framer-motion.
   - `client/vite.config.ts` with proxy: `/api` → `http://localhost:3001`.
   - `client/tsconfig.json` extending `../tsconfig.base.json`.
   - `client/index.html` with root div. Include Geist font loading (via `@fontsource-variable/geist-sans` and `@fontsource-variable/geist-mono`, or Vercel CDN link).
2. Create `client/src/main.tsx` rendering `<App />`.
3. Create `client/src/App.tsx` with a placeholder: `<h1>LeadOS</h1>`.

**Verify:** Run `npm run dev:client`. Visit `http://localhost:5173` → shows "LeadOS".

---

#### Task 4: Configure Tailwind CSS + shadcn/ui

**Goal:** Tailwind working with dark mode, Geist fonts, noise texture, and shadcn/ui components installed.

**Steps:**
1. Install Tailwind CSS, PostCSS, Autoprefixer in client.
2. Install font packages: `@fontsource-variable/geist-sans`, `@fontsource-variable/geist-mono`.
3. Create `client/tailwind.config.ts` with:
   - Dark mode: `class`.
   - Content paths for `./src/**/*.{ts,tsx}`.
   - Extended theme with the color tokens from the UI design doc (cyan accent, cool-tinted darks, etc.).
   - Custom `fontFamily`: `sans: ['Geist Variable', ...]`, `mono: ['Geist Mono Variable', ...]`.
4. Create `client/postcss.config.js`.
5. Create `client/src/index.css` with:
   - Tailwind directives (`@tailwind base/components/utilities`).
   - CSS custom properties for the full color palette (see 03-ux-ui-design.md §6.1).
   - Font imports: `@import '@fontsource-variable/geist-sans'` and `@import '@fontsource-variable/geist-mono'`.
   - Subtle noise grain overlay on `body::after` using an SVG noise filter (opacity ~0.02).
   - Base styles: `body { font-family: 'Geist Variable', sans-serif; background: var(--bg-primary); color: var(--text-primary); }`.
6. Initialize shadcn/ui:
   - Install: `npx shadcn-ui@latest init` (or manually configure `components.json`).
   - Install needed components: button, badge, select, popover, calendar, sheet, toast, skeleton, tooltip, dropdown-menu, separator.
7. Update `App.tsx` to use the dark background with noise texture and Geist font as a test.

**Verify:** Page renders with dark background (cool-tinted, not flat black), subtle noise grain visible on close inspection, Geist font rendering correctly, a shadcn `<Button>` renders correctly.

---

#### Task 5: Create Shared Types

**Goal:** Define all shared TypeScript interfaces used across client and server.

**Steps:**
1. Create `shared/package.json` (minimal, name: "shared").
2. Create `shared/types.ts` with these interfaces:

```typescript
// Issue as stored locally and served to frontend
export interface Issue {
  jiraKey: string;
  summary: string;
  description?: string;
  priorityName: string;    // 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest'
  priorityId: string;
  statusName: string;
  statusCategory: string;  // 'new' | 'indeterminate' | 'done'
  assigneeId?: string;
  assigneeName?: string;
  reporterName?: string;
  component?: string;
  labels: string[];
  dueDate?: string;        // ISO date string
  flagged: boolean;
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
}

export interface Developer {
  accountId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  isActive: boolean;
}

export interface DeveloperWorkload {
  developer: Developer;
  activeDefects: number;
  dueToday: number;
  blocked: number;
  score: number;
  level: 'light' | 'medium' | 'heavy';
}

export interface OverviewCounts {
  new: number;
  unassigned: number;
  dueToday: number;
  overdue: number;
  blocked: number;
  inProgress: number;
  total: number;
  lastSynced?: string;
}

export interface Alert {
  id: string;
  type: 'overdue' | 'stale' | 'blocked' | 'idle_developer' | 'high_priority_not_started';
  severity: 'high' | 'medium';
  issueKey?: string;
  developerAccountId?: string;
  developerName?: string;
  message: string;
  detectedAt: string;
}

export interface AssignmentSuggestion {
  developer: Developer;
  score: number;
  reason: string;
}

export interface SyncStatus {
  lastSyncedAt?: string;
  status: 'idle' | 'syncing' | 'error';
  issuesSynced?: number;
  errorMessage?: string;
}

export interface DashboardConfig {
  jiraBaseUrl: string;
  jiraEmail: string;
  jiraProjectKey: string;
  jiraLeadAccountId: string;
  syncIntervalMs: number;
  staleThresholdHours: number;
  isConfigured: boolean;
}

export type FilterType =
  | 'all'
  | 'unassigned'
  | 'dueToday'
  | 'dueThisWeek'
  | 'overdue'
  | 'blocked'
  | 'stale'
  | 'highPriority';

export interface IssueUpdate {
  assigneeId?: string;
  priorityName?: string;
  dueDate?: string;
  flagged?: boolean;
}

export interface PrioritySuggestion {
  suggested: string;
  reason: string;
}

export interface DueDateSuggestion {
  suggested: string;
  reason: string;
}
```

**Verify:** Both `client` and `server` can import from `shared/types` without errors.

---

#### Task 6: Set Up Database Schema

**Goal:** SQLite database with all tables, created automatically on server start.

**Steps:**
1. Create `server/src/db/connection.ts`:
   - Initialize better-sqlite3 with file path `./data/dashboard.db`.
   - Enable WAL mode for performance.
   - Export the database instance.
2. Create `server/src/db/schema.ts`:
   - Define Drizzle ORM schema for: `issues`, `developers`, `component_map`, `sync_log`, `config`.
   - Match the schema from the System Design doc exactly.
3. Create `server/src/db/migrate.ts`:
   - Auto-create tables on startup if they don't exist.
   - Use Drizzle's push or custom migration.
4. Call `migrate()` in `server/src/index.ts` before starting the server.

**Verify:** Server starts, `data/dashboard.db` is created, all tables exist (verify with a quick SQL query in the startup log).

---

### PHASE B: Jira Integration (Tasks 7–9)

---

#### Task 7: Implement Jira REST API Client

**Goal:** A reusable client class that can authenticate and call Jira endpoints.

**Steps:**
1. Create `server/src/jira/types.ts`:
   - Define TypeScript interfaces for Jira API responses: `JiraSearchResult`, `JiraIssue`, `JiraUser`, `JiraComponent`, `JiraComment`.
2. Create `server/src/jira/client.ts`:
   - Class `JiraClient` with constructor accepting `baseUrl`, `email`, `apiToken`.
   - Methods:
     - `searchIssues(jql: string, fields: string[], startAt?: number, maxResults?: number)` — handles pagination automatically, returns all matching issues.
     - `getIssue(issueKey: string)` — fetch single issue with all fields.
     - `updateIssue(issueKey: string, fields: object)` — PUT to update fields.
     - `addComment(issueKey: string, text: string)` — POST comment in ADF format.
     - `getAssignableUsers(projectKey: string)` — GET users assignable to project.
     - `testConnection()` — Call `/rest/api/3/myself`, return true/false.
   - Error handling: Throw descriptive errors for 401, 403, 404, 429.
   - Rate limit handling: Read `Retry-After` header on 429, wait and retry once.

**Verify:** Write a small test script or unit test that mocks fetch and verifies `searchIssues` paginates correctly.

---

#### Task 8: Implement Sync Engine

**Goal:** Background process that syncs Jira data to SQLite.

**Steps:**
1. Create `server/src/sync/engine.ts`:
   - Class `SyncEngine` with:
     - `constructor(jiraClient, db)`
     - `start(intervalMs)` — starts node-cron job.
     - `stop()` — stops the cron job.
     - `syncNow()` — manual trigger, returns `SyncResult`.
     - `getLastSyncTime()` — reads from `sync_log` table.
   - Sync logic:
     - Build JQL: `project = {key} AND issuetype = Bug AND statusCategory != Done`
     - If incremental: add `AND updated >= "{lastSyncTime}"`.
     - Fetch all matching issues via `jiraClient.searchIssues()`.
     - Map Jira issue fields to local `issues` table schema.
     - Upsert each issue into SQLite (INSERT OR REPLACE).
     - Write to `sync_log` table.
   - Handle errors gracefully — log and continue.
2. Initialize `SyncEngine` in `server/src/index.ts` after DB migration.
3. Run initial full sync on startup.

**Verify:** Start server with valid Jira credentials → sync_log shows a successful sync → issues table populated.

---

#### Task 9: Implement Sync API Routes

**Goal:** API endpoints for sync status and manual trigger.

**Steps:**
1. Create `server/src/routes/sync.ts`:
   - `POST /api/sync` — triggers `syncEngine.syncNow()`, returns sync result.
   - `GET /api/sync/status` — returns `{ lastSyncedAt, status, issuesSynced }`.
2. Register routes in `app.ts`.

**Verify:** `GET /api/sync/status` returns last sync info. `POST /api/sync` triggers a new sync.

---

### PHASE C: Backend API (Tasks 10–16)

---

#### Task 10: Implement Issue Service

**Goal:** Business logic layer for issue operations.

**Steps:**
1. Create `server/src/services/issue.service.ts`:
   - `getAll(filters)` — query issues table with optional filters (assignee, priority, status, flagged, due date ranges, stale detection).
   - `getById(jiraKey)` — return single issue.
   - `update(jiraKey, fields)` — update Jira via client, then update local DB.
   - `addComment(jiraKey, text)` — add comment to Jira.
   - `getOverviewCounts()` — compute all 6 overview card counts + total.
2. Filter logic:
   - `unassigned`: assignee_id = configured lead account ID.
   - `dueToday`: due_date = today's date.
   - `dueThisWeek`: due_date between today and end of week (Sunday).
   - `overdue`: due_date < today AND status_category != 'done'.
   - `blocked`: flagged = 1.
   - `stale`: updated_at < (now - 48h) AND status_category != 'done'.
   - `highPriority`: priority_name IN ('Highest', 'High').

**Verify:** Unit tests for filter logic and overview count computation.

---

#### Task 11: Implement Issue API Routes

**Goal:** REST endpoints for issues.

**Steps:**
1. Create `server/src/routes/issues.ts`:
   - `GET /api/issues` — accepts query params: `filter`, `assignee`, `priority`, `status`, `sort`, `order`.
   - `GET /api/issues/:key` — returns full issue detail.
   - `PATCH /api/issues/:key` — accepts body: `{ assigneeId?, priorityName?, dueDate?, flagged? }`. Validates with Zod.
   - `POST /api/issues/:key/comments` — accepts body: `{ text }`.
2. Create `server/src/middleware/validate.ts`:
   - Generic Zod validation middleware factory.
3. Register routes in `app.ts`.

**Verify:** `GET /api/issues` returns issue list. `GET /api/issues/PROJ-101` returns detail. `PATCH` with valid body succeeds.

---

#### Task 12: Implement Overview API Route

**Goal:** Single endpoint returning all overview card counts.

**Steps:**
1. Create `server/src/routes/overview.ts`:
   - `GET /api/overview` — calls `issueService.getOverviewCounts()`, returns JSON.
2. Register in `app.ts`.

**Verify:** `GET /api/overview` returns `{ new, unassigned, dueToday, overdue, blocked, inProgress, total, lastSynced }`.

---

#### Task 13: Implement Workload Service

**Goal:** Calculate per-developer workload scores.

**Steps:**
1. Create `server/src/services/workload.service.ts`:
   - `getTeamWorkload()` — for each developer in `developers` table:
     - Count active defects (assigned to them, status_category != 'done').
     - Count due today.
     - Count blocked (flagged).
     - Compute weighted score: `Σ PRIORITY_WEIGHTS[priority]` for each active defect.
     - Determine level: light (< 5), medium (5–11), heavy (≥ 12).
   - `suggestAssignee(issueKey)` — rank developers by lowest workload score.
   - `getIdleDevelopers()` — developers with 0 active defects.

**Verify:** Unit tests for score calculation, level thresholds, and ranking.

---

#### Task 14: Implement Team API Routes

**Goal:** Endpoints for team and workload data.

**Steps:**
1. Create `server/src/routes/team.ts`:
   - `GET /api/team/workload` — returns array of `DeveloperWorkload`.
   - `GET /api/team/developers` — returns configured developers.
   - `GET /api/team/:accountId/issues` — returns issues for a specific developer.
2. Register in `app.ts`.

**Verify:** `GET /api/team/workload` returns workload data for all developers.

---

#### Task 15: Implement Alert Service

**Goal:** Automatically detect and return active alerts.

**Steps:**
1. Create `server/src/services/alert.service.ts`:
   - `computeAlerts()` — runs all detection rules:
     - **Overdue:** due_date < today, status_category != 'done'.
     - **Stale:** updated_at < now() - 48h, status_category != 'done'.
     - **Blocked:** flagged = true.
     - **Idle developer:** developer with 0 active defects.
     - **High priority not started:** priority in (Highest, High), status = 'To Do', created_at < now() - 4h.
   - Returns `Alert[]` with unique IDs, severity, and descriptive messages.
2. Create `server/src/routes/alerts.ts`:
   - `GET /api/alerts` — returns computed alerts.
3. Register in `app.ts`.

**Verify:** With test data, alerts are correctly generated. Unit tests for each alert rule.

---

#### Task 16: Implement Automation Service

**Goal:** Priority and due date suggestion logic.

**Steps:**
1. Create `server/src/services/automation.service.ts`:
   - `suggestPriority(issue)`:
     - If labels include 'production' or 'prod-bug' → Highest.
     - If labels include 'customer' or 'client' → High.
     - Else → Medium.
     - Return `{ suggested, reason }`.
   - `suggestDueDate(priorityName, createdAt)`:
     - Highest → createdAt + 24h.
     - High → createdAt + 3 days.
     - Medium → createdAt + 7 days.
     - Low/Lowest → createdAt + 14 days.
     - Return `{ suggested, reason }`.
   - `suggestAssignee(issueKey)` — delegates to workload service, adds reasons.
2. Create `server/src/routes/suggestions.ts`:
   - `GET /api/suggestions/assignee/:key` — returns ranked developers.
   - `GET /api/suggestions/priority/:key` — returns priority suggestion.
   - `GET /api/suggestions/duedate/:priority` — returns due date suggestion.
3. Register in `app.ts`.

**Verify:** `GET /api/suggestions/priority/PROJ-101` returns a suggestion. Unit tests for all rules.

---

#### Task 17: Implement Config API Routes

**Goal:** Setup and configuration endpoints.

**Steps:**
1. Create `server/src/routes/config.ts`:
   - `GET /api/config` — returns current config (masking API token).
   - `PUT /api/config` — updates config in DB. Validates with Zod.
   - `POST /api/config/test` — tests Jira connection with provided credentials.
2. Register in `app.ts`.

**Verify:** `GET /api/config` returns config. `POST /api/config/test` with valid creds returns success.

---

#### Task 18: Add Error Handling Middleware

**Goal:** Global error handler for consistent API error responses.

**Steps:**
1. Create `server/src/middleware/errorHandler.ts`:
   - Catches all unhandled errors.
   - Returns JSON `{ error: message, status: code }`.
   - Logs errors with pino.
   - Does not leak stack traces in production.
2. Add as last middleware in `app.ts`.

**Verify:** An intentional error in a route returns a clean JSON error response.

---

### PHASE D: Frontend — Layout and Core (Tasks 19–24)

---

#### Task 19: Create Dashboard Layout

**Goal:** Main page structure with header, content area, and workload bar.

**Steps:**
1. Create `client/src/components/layout/DashboardLayout.tsx`:
   - Full-height flex column layout.
   - Header (fixed top, 48px).
   - Main content area (flex row: sidebar + center + optional right panel).
   - Workload bar (fixed bottom, 64px).
2. Create `client/src/components/layout/Header.tsx`:
   - App title: "LeadOS".
   - Sync status indicator (relative time, green/yellow dot).
   - Manual refresh button.
   - Theme toggle (dark/light).
3. Update `App.tsx` to use `DashboardLayout`.

**Verify:** Page shows header, main area, and bottom bar. Dark mode toggles.

---

#### Task 20: Set Up API Client and React Query Hooks

**Goal:** Frontend data fetching layer.

**Steps:**
1. Create `client/src/lib/api.ts`:
   - `fetchApi(path, options)` — wrapper around `fetch('/api' + path)`.
   - Handles JSON parsing and error responses.
2. Create all hooks in `client/src/hooks/`:
   - `useOverview()` — fetches `/api/overview`, refetchInterval: 30s.
   - `useIssues(filters)` — fetches `/api/issues`, refetchInterval: 30s.
   - `useIssueDetail(key)` — fetches `/api/issues/:key` on demand.
   - `useWorkload()` — fetches `/api/team/workload`, refetchInterval: 30s.
   - `useAlerts()` — fetches `/api/alerts`, refetchInterval: 30s.
   - `useSyncStatus()` — fetches `/api/sync/status`, refetchInterval: 10s.
   - `useSuggestions(key)` — fetches all 3 suggestion endpoints on demand.
   - `useUpdateIssue()` — mutation: `PATCH /api/issues/:key`, with optimistic update and cache invalidation.
   - `useAddComment()` — mutation: `POST /api/issues/:key/comments`.
   - `useTriggerSync()` — mutation: `POST /api/sync`.
3. Set up `QueryClientProvider` in `App.tsx`.

**Verify:** Hooks call the API and data appears in React DevTools / console.

---

#### Task 21: Implement Theme Context

**Goal:** Dark/light mode with persistence.

**Steps:**
1. Create `client/src/context/ThemeContext.tsx`:
   - Store theme in localStorage.
   - Apply `dark` class to `<html>` element.
   - Default to dark mode.
   - Export `useTheme()` hook.
2. Wire into `App.tsx` via `<ThemeProvider>`.
3. Header theme toggle button uses `useTheme()`.

**Verify:** Toggle switches between dark and light. Persists on refresh.

---

#### Task 22: Build Overview Cards

**Goal:** 6 clickable metric cards at the top of the dashboard.

**Steps:**
1. Create `client/src/components/overview/OverviewCard.tsx`:
   - Props: label, count, color, isActive, onClick.
   - Styled per the UI design doc: count (28px bold), label (12px muted), color accent.
   - States: default, hover, active/selected, zero.
2. Create `client/src/components/overview/OverviewCards.tsx`:
   - Uses `useOverview()` hook.
   - Renders 6 `OverviewCard` components.
   - Manages selected card state, calls `onFilterChange` callback.
   - Shows skeleton loaders while loading.
3. Wire into `DashboardLayout`.

**Verify:** Cards show real counts from API. Clicking a card highlights it.

---

#### Task 23: Build Filter Sidebar

**Goal:** Left sidebar with predefined filters and developer list.

**Steps:**
1. Create `client/src/components/filters/FilterButton.tsx`:
   - Props: label, count, isActive, onClick, variant (filter vs developer).
   - Shows count badge.
   - Idle warning icon for developers with 0 defects.
2. Create `client/src/components/filters/FilterSidebar.tsx`:
   - Lists predefined filters: All, Unassigned, Due Today, Due This Week, Overdue, Blocked, Stale, High Priority.
   - Lists developers from `useWorkload()` data.
   - Manages active filter state.
   - Emits filter changes to parent.
3. Wire into `DashboardLayout` main area (left column, 200px).

**Verify:** Filters render with counts. Clicking a filter highlights it.

---

#### Task 24: Build Defect Table

**Goal:** Main data table with all columns, sorting, and row selection.

**Steps:**
1. Create cell components:
   - `client/src/components/table/PriorityCell.tsx` — colored dot by priority.
   - `client/src/components/table/StatusBadge.tsx` — pill badge with status color.
   - `client/src/components/table/AssigneeCell.tsx` — avatar + name or "Unassigned".
   - `client/src/components/table/DueDateCell.tsx` — formatted date, red if overdue, orange if today.
2. Create `client/src/components/table/DefectTable.tsx`:
   - Uses TanStack Table with columns: Priority, Issue ID, Title, Assignee, Due Date, Status, Component, Updated, Blocked.
   - Default sort: priority desc, due date asc.
   - Row click selects row and emits `onSelectIssue(key)`.
   - Row styling: red left border for overdue, orange for due today, yellow for stale.
   - Uses `useIssues(activeFilter)` hook.
   - Skeleton loader while loading.
3. Wire into `DashboardLayout` main area (center, flex-fill).
4. Connect filter state from sidebar and overview cards to the table's filter parameter.

**Verify:** Table renders issues. Clicking column headers sorts. Row click selects. Filters change the displayed data.

---

### PHASE E: Frontend — Interactive Features (Tasks 25–31)

---

#### Task 25: Build Triage Panel

**Goal:** Right-side panel showing full defect details and actions.

**Steps:**
1. Create `client/src/components/triage/IssueDetails.tsx`:
   - Renders all issue fields: key, title, description, priority, status, component, assignee, due date, reporter, created, updated, labels.
   - Read-only fields styled as label-value pairs.
2. Create `client/src/components/triage/TriagePanel.tsx`:
   - Uses shadcn `Sheet` component (slides in from right, 400px wide).
   - Opens when `selectedIssueKey` is set.
   - Fetches full issue detail with `useIssueDetail(key)`.
   - Shows `IssueDetails` + editable fields:
     - Priority dropdown (shadcn Select).
     - Assignee dropdown (shadcn Select, populated from developers).
     - Due date picker (shadcn Calendar + Popover).
     - Blocked toggle.
   - "Open in Jira" external link button.
   - Close on X button or Escape.
3. Wire into `DashboardLayout` — opens when DefectTable emits `onSelectIssue`.

**Verify:** Click a table row → panel opens with correct data. Edit fields → changes post to API.

---

#### Task 26: Implement Inline Editing

**Goal:** Edit assignee, priority, and due date directly in the table or panel, synced to Jira.

**Steps:**
1. Update `AssigneeCell.tsx` — on click, show a dropdown of developers. On select, call `useUpdateIssue()`.
2. Update `PriorityCell.tsx` — on click, show a dropdown of priorities. On select, call `useUpdateIssue()`.
3. Update `DueDateCell.tsx` — on click, show a date picker popover. On select, call `useUpdateIssue()`.
4. `useUpdateIssue()` mutation:
   - Optimistic update: update local query cache immediately.
   - Call `PATCH /api/issues/:key` with changed field.
   - On error: rollback optimistic update, show error toast.
   - On success: invalidate related queries (issues, overview, workload).

**Verify:** Change assignee in table → Jira updated → counts refresh. Change priority → row styling updates. Set due date → date shows.

---

#### Task 27: Build Suggestion Bar

**Goal:** Show automation suggestions in the triage panel.

**Steps:**
1. Create `client/src/components/triage/SuggestionBar.tsx`:
   - Uses `useSuggestions(issueKey)`.
   - Shows:
     - Suggested priority with reason.
     - Suggested due date with reason.
     - Suggested assignee with workload info.
   - "Apply All Suggestions" button that fills all three fields.
   - Individual "Apply" buttons next to each suggestion.
2. Integrate into `TriagePanel` below the editable fields.

**Verify:** Open triage panel → suggestions appear. Click "Apply All" → fields are filled and saved.

---

#### Task 28: Build Workload Panel

**Goal:** Bottom bar showing per-developer workload visualization.

**Steps:**
1. Create `client/src/components/workload/DeveloperCard.tsx`:
   - Props: developer workload data.
   - Shows: avatar, name, progress bar (colored by level), score, active/due today/blocked counts.
   - Idle warning badge if score = 0.
   - Clickable → filters table to developer.
2. Create `client/src/components/workload/WorkloadBar.tsx`:
   - Uses `useWorkload()` hook.
   - Collapsed view: horizontal row of developer cards.
   - Expandable: click to expand to a taller view with more details.
3. Wire into `DashboardLayout` bottom section.

**Verify:** Workload bar shows all developers. Colors match workload levels. Click developer → table filters.

---

#### Task 29: Build Alert Banner

**Goal:** Alert bar that surfaces risks automatically.

**Steps:**
1. Create `client/src/components/alerts/AlertBanner.tsx`:
   - Uses `useAlerts()` hook.
   - If alerts exist: show summary bar "⚠ N alerts: X overdue · Y stale · Z idle".
   - "View All" button opens alert list.
   - Hidden when no alerts.
2. Create `client/src/components/alerts/AlertList.tsx`:
   - Popover or dropdown showing all alerts.
   - Each alert: icon (by severity), message, clickable (navigates to defect or developer).
3. Position between overview cards and defect table.

**Verify:** Alerts show when conditions are met. Click alert → table filters to relevant issue.

---

#### Task 30: Build Comment Form

**Goal:** Add comments from the triage panel, synced to Jira.

**Steps:**
1. Create `client/src/components/triage/CommentForm.tsx`:
   - Text area for entering comment.
   - Submit button.
   - Uses `useAddComment()` mutation.
   - Shows existing comments (most recent first) from issue detail.
2. Integrate into the bottom of `TriagePanel`.

**Verify:** Type comment → submit → appears in Jira. Recent comments from Jira show in panel.

---

#### Task 31: Build Setup Wizard

**Goal:** First-run configuration screen.

**Steps:**
1. Create `client/src/components/setup/SetupWizard.tsx`:
   - Form fields: Jira URL, Email, API Token, Project Key.
   - "Test Connection" button → calls `POST /api/config/test`.
   - On success: show green checkmark, enable "Save & Start".
   - "Save & Start" → calls `PUT /api/config`, triggers initial sync, redirects to dashboard.
   - Info link for API token creation.
2. Also add a step to select team developers:
   - After valid connection, fetch assignable users.
   - Show checkboxes to select the 5 team members.
3. Show the wizard in `App.tsx` when config endpoint reports `isConfigured: false`.

**Verify:** First run shows wizard. Complete setup → dashboard loads with synced data.

---

### PHASE F: Polish (Tasks 32–39)

---

#### Task 32: Add Keyboard Shortcuts

**Steps:**
1. Add keyboard event listeners to the dashboard:
   - `↑`/`↓`: navigate table rows.
   - `Enter`: open/close triage panel.
   - `Escape`: close triage panel.
   - `r`: trigger manual refresh.
   - `1`–`7`: activate filters.
   - `0`: clear filters.
2. Show keyboard shortcut hint on hover (tooltip on relevant elements).

**Verify:** All shortcuts work as expected. No conflicts with input fields.

---

#### Task 33: Add Loading States

**Steps:**
1. Add skeleton loaders to:
   - Overview cards (pulsing rectangles).
   - Defect table (skeleton rows).
   - Triage panel (skeleton fields).
   - Workload bar (skeleton bars).
2. Use shadcn `Skeleton` component.

**Verify:** On initial load (or simulated slow API), skeletons appear then resolve.

---

#### Task 34: Add Error and Empty States

**Steps:**
1. Error states:
   - API fetch error: yellow banner "Unable to reach server. Showing cached data."
   - Update error: red toast "Failed to update PROJ-101. Retry?".
   - Sync error: red dot on sync indicator.
2. Empty states:
   - No issues: "No defects found. Your project is clean! 🎉"
   - Filter returns 0: "No defects match this filter." + Clear Filter button.
   - No alerts: banner hidden.
3. Use shadcn `Toast` for notifications.

**Verify:** Trigger each state and verify correct UI.

---

#### Task 35: Production Build Configuration

**Steps:**
1. Update `server/src/app.ts`:
   - In production mode, serve static files from `../client/dist/`.
   - Fallback all non-API routes to `index.html` (SPA routing).
2. Update build scripts:
   - `npm run build` in root builds both client (Vite) and server (tsc).
3. Test: `npm run build && npm run start` serves the full app on port 3001.

**Verify:** Full app works from a single `npm run start` command.

---

#### Task 36: Write Backend Unit Tests

**Steps:**
1. Write tests for:
   - `workload.service.ts` — score calculation, level thresholds, ranking.
   - `alert.service.ts` — each alert rule detection.
   - `automation.service.ts` — priority suggestion rules, due date rules.
   - `issue.service.ts` — filter logic, overview counts.
2. Use Vitest with mocked database.
3. Aim for ≥ 80% coverage on service files.

**Verify:** `npm run test` passes. Coverage ≥ 80% on services.

---

#### Task 37: Write Frontend Component Tests

**Steps:**
1. Write tests for:
   - `OverviewCards` — renders correct counts, click triggers filter.
   - `DefectTable` — renders rows, sorting works, row selection works.
   - `FilterSidebar` — filter buttons render, click activates filter.
   - `WorkloadBar` — developer cards render, colors match levels.
2. Use Vitest + React Testing Library.
3. Mock API responses with MSW or TanStack Query test utils.

**Verify:** `npm run test` passes. Key interactions tested.

---

#### Task 38: Write README

**Steps:**
1. Create `README.md` with:
   - Project description and purpose.
   - Screenshots / layout diagram.
   - Prerequisites (Node.js 20+, Jira Cloud account).
   - Setup instructions (clone, install, configure .env, run).
   - Environment variables reference.
   - Development commands.
   - Production deployment.
   - Architecture overview (brief).
   - License.

**Verify:** A new developer can follow the README to set up and run the project.

---

#### Task 39: Final Integration Test

**Steps:**
1. Start the full application (`npm run dev`).
2. Complete the setup wizard with Jira credentials.
3. Verify:
   - Sync completes and issues appear.
   - Overview cards show correct counts.
   - Filters work correctly.
   - Triage panel opens and shows details.
   - Assign a developer → reflected in Jira.
   - Change priority → reflected in Jira.
   - Set due date → reflected in Jira.
   - Add comment → appears in Jira.
   - Workload bar shows correct scores.
   - Alerts appear for overdue/stale/blocked.
   - Suggestions appear in triage panel.
   - Auto-refresh updates data.
   - Dark/light mode works.
   - Keyboard shortcuts work.
4. Fix any issues found.

**Verify:** All features working end-to-end with a real Jira instance.

---

## Task Dependency Graph

```
Task 1 (Root setup)
  ├── Task 2 (Server setup)
  │     └── Task 6 (DB schema)
  │           └── Task 7 (Jira client)
  │                 ├── Task 8 (Sync engine)
  │                 │     └── Task 9 (Sync routes)
  │                 └── Task 10 (Issue service)
  │                       ├── Task 11 (Issue routes)
  │                       ├── Task 12 (Overview route)
  │                       ├── Task 13 (Workload service)
  │                       │     └── Task 14 (Team routes)
  │                       ├── Task 15 (Alert service)
  │                       └── Task 16 (Automation service)
  │                             └── Task 17 (Config routes)
  │                                   └── Task 18 (Error handler)
  ├── Task 3 (Client setup)
  │     └── Task 4 (Tailwind + shadcn)
  │           └── Task 19 (Dashboard layout)
  │                 ├── Task 20 (API hooks)
  │                 ├── Task 21 (Theme context)
  │                 ├── Task 22 (Overview cards)
  │                 ├── Task 23 (Filter sidebar)
  │                 └── Task 24 (Defect table)
  │                       ├── Task 25 (Triage panel)
  │                       │     ├── Task 27 (Suggestion bar)
  │                       │     └── Task 30 (Comment form)
  │                       ├── Task 26 (Inline editing)
  │                       ├── Task 28 (Workload panel)
  │                       └── Task 29 (Alert banner)
  └── Task 5 (Shared types)

Tasks 31–39 (Polish) depend on all above being complete.
```

---

## Summary

| Phase | Tasks | Description |
|---|---|---|
| A | 1–6 | Project scaffolding, tooling, database |
| B | 7–9 | Jira API client and sync engine |
| C | 10–18 | All backend API services and routes |
| D | 19–24 | Frontend layout, data hooks, core components |
| E | 25–31 | Interactive features: triage, editing, suggestions, alerts |
| F | 32–39 | Polish: shortcuts, states, tests, docs, integration test |

**Total: 39 tasks, executed sequentially, each producing a verifiable output.**
