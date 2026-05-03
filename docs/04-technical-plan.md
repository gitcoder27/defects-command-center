# Technical Implementation Plan

## Defect Management Command Dashboard

**Version:** 1.0
**Date:** March 5, 2026

---

## 1. Technology Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| **Frontend** | React | 18.x | Mature ecosystem, component model, hooks |
| **Build tool** | Vite | 5.x | Fast HMR, optimized builds, ESM-native |
| **Language** | TypeScript | 5.x | Type safety across full stack |
| **UI framework** | Tailwind CSS | 3.x | Utility-first, rapid styling, dark mode built-in |
| **UI components** | shadcn/ui | latest | Accessible, composable, Tailwind-native |
| **Table** | TanStack Table | 8.x | Headless, virtualized, feature-rich |
| **Server state** | TanStack Query | 5.x | Caching, auto-refresh, optimistic mutations |
| **Icons** | Lucide React | latest | Clean, consistent icon set |
| **Animation** | Framer Motion (motion) | latest | Orchestrated page-load sequence, layout animations, mount/unmount |
| **Fonts** | Geist + Geist Mono | latest | Distinctive, technical typography (via @fontsource or Vercel CDN) |
| **Date handling** | date-fns | 3.x | Lightweight, tree-shakeable |
| **Backend** | Node.js + Express | 20.x / 4.x | Simple, lightweight REST API |
| **Database** | SQLite | via better-sqlite3 | Zero-config, file-based, single-user |
| **ORM** | Drizzle ORM | latest | Type-safe, lightweight, great SQLite support |
| **HTTP client** | node-fetch / native fetch | — | For Jira API calls |
| **Scheduler** | node-cron | 3.x | For sync interval scheduling |
| **Validation** | Zod | 3.x | Schema validation for API inputs |
| **Logging** | pino | 8.x | Fast, structured logging |
| **Testing** | Vitest + Testing Library | latest | Fast, Vite-native, React component tests |

---

## 2. Repository Structure

```
lead-os/
├── docs/                          # Project documentation
│   ├── 01-PRD.md
│   ├── 02-system-design.md
│   ├── 03-ux-ui-design.md
│   ├── 04-technical-plan.md
│   └── 05-execution-plan.md
│
├── client/                        # React frontend
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.js
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.tsx               # App entry point
│       ├── App.tsx                # Root component
│       ├── index.css              # Tailwind directives + globals
│       ├── lib/
│       │   ├── api.ts             # API client (fetch wrapper)
│       │   ├── utils.ts           # Utility functions
│       │   └── constants.ts       # Colors, thresholds, mappings
│       ├── hooks/
│       │   ├── useIssues.ts       # TanStack Query: issues
│       │   ├── useOverview.ts     # TanStack Query: overview counts
│       │   ├── useWorkload.ts     # TanStack Query: team workload
│       │   ├── useAlerts.ts       # TanStack Query: alerts
│       │   ├── useSuggestions.ts  # TanStack Query: assignment suggestions
│       │   ├── useSyncStatus.ts   # TanStack Query: sync status
│       │   └── useUpdateIssue.ts  # TanStack Mutation: update issue
│       ├── components/
│       │   ├── layout/
│       │   │   ├── DashboardLayout.tsx
│       │   │   └── Header.tsx
│       │   ├── overview/
│       │   │   ├── OverviewCards.tsx
│       │   │   └── OverviewCard.tsx
│       │   ├── table/
│       │   │   ├── DefectTable.tsx
│       │   │   ├── DefectRow.tsx
│       │   │   ├── PriorityCell.tsx
│       │   │   ├── AssigneeCell.tsx
│       │   │   ├── DueDateCell.tsx
│       │   │   └── StatusBadge.tsx
│       │   ├── triage/
│       │   │   ├── TriagePanel.tsx
│       │   │   ├── IssueDetails.tsx
│       │   │   ├── SuggestionBar.tsx
│       │   │   └── CommentForm.tsx
│       │   ├── filters/
│       │   │   ├── FilterSidebar.tsx
│       │   │   └── FilterButton.tsx
│       │   ├── workload/
│       │   │   ├── WorkloadBar.tsx
│       │   │   └── DeveloperCard.tsx
│       │   ├── alerts/
│       │   │   ├── AlertBanner.tsx
│       │   │   └── AlertList.tsx
│       │   ├── setup/
│       │   │   └── SetupWizard.tsx
│       │   └── ui/                # shadcn/ui primitives
│       │       ├── button.tsx
│       │       ├── badge.tsx
│       │       ├── select.tsx
│       │       ├── popover.tsx
│       │       ├── calendar.tsx
│       │       ├── toast.tsx
│       │       ├── skeleton.tsx
│       │       ├── sheet.tsx
│       │       └── tooltip.tsx
│       ├── types/
│       │   └── index.ts           # Shared TypeScript interfaces
│       └── context/
│           └── ThemeContext.tsx    # Dark/light mode context
│
├── server/                        # Node.js backend
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts               # Server entry point
│       ├── app.ts                 # Express app setup
│       ├── config.ts              # Environment config loader
│       ├── db/
│       │   ├── connection.ts      # SQLite connection (better-sqlite3)
│       │   ├── schema.ts          # Drizzle schema definitions
│       │   └── migrate.ts         # Auto-migration on startup
│       ├── jira/
│       │   ├── client.ts          # Jira REST API client
│       │   └── types.ts           # Jira API response types
│       ├── sync/
│       │   └── engine.ts          # Sync engine (scheduler + logic)
│       ├── services/
│       │   ├── issue.service.ts   # Issue business logic
│       │   ├── workload.service.ts# Workload calculations
│       │   ├── alert.service.ts   # Alert detection
│       │   └── automation.service.ts # Priority/due date suggestions
│       ├── routes/
│       │   ├── issues.ts          # /api/issues routes
│       │   ├── overview.ts        # /api/overview routes
│       │   ├── team.ts            # /api/team routes
│       │   ├── alerts.ts          # /api/alerts routes
│       │   ├── suggestions.ts     # /api/suggestions routes
│       │   ├── sync.ts            # /api/sync routes
│       │   └── config.ts          # /api/config routes
│       ├── middleware/
│       │   ├── errorHandler.ts    # Global error handler
│       │   └── validate.ts        # Zod validation middleware
│       └── utils/
│           └── date.ts            # Date utility functions
│
├── shared/                        # Shared types between client/server
│   └── types.ts                   # Common interfaces (Issue, Developer, etc.)
│
├── data/                          # SQLite database file (gitignored)
│   └── .gitkeep
│
├── .env.example                   # Environment variable template
├── .gitignore
├── package.json                   # Root package.json (workspaces)
├── tsconfig.base.json             # Shared TypeScript config
└── README.md
```

---

## 3. Development Phases

### Phase 1 — MVP (Target: Fully Functional Dashboard)

#### Sprint 1: Foundation (Steps 1–8)
- Project scaffolding and tooling
- Database schema and migrations
- Jira API client
- Sync engine
- Basic API routes

#### Sprint 2: Core UI (Steps 9–15)
- Dashboard layout
- Overview cards
- Defect table with sorting
- Filter sidebar
- Triage panel

#### Sprint 3: Intelligence (Steps 16–21)
- Team workload panel
- Alert system
- Automation rules (priority/due date suggestions)
- Assignment suggestions (workload-based)
- Inline editing with Jira write-back

#### Sprint 4: Polish (Steps 22–25)
- Dark mode
- Keyboard shortcuts
- Error handling and edge cases
- Setup wizard
- Testing

### Phase 2 — Enhanced Intelligence (Future)
- Component ownership mapping
- Historical fix analysis
- Cycle time metrics
- Trend charts
- SLA tracking

---

## 4. Implementation Tasks (Phase 1)

### 4.1 Project Setup

| # | Task | Output |
|---|---|---|
| 1 | Initialize monorepo with npm workspaces | `package.json` with `client/` and `server/` workspaces |
| 2 | Set up server with TypeScript + Express | Working Express server on port 3001 |
| 3 | Set up client with Vite + React + TypeScript | Working Vite dev server on port 5173 |
| 4 | Configure Tailwind CSS + shadcn/ui | Tailwind working, shadcn components installed |
| 5 | Configure Vite proxy for dev (`/api` → `localhost:3001`) | Frontend can call backend APIs |
| 6 | Create `.env.example` and `config.ts` | Environment-based configuration |

### 4.2 Database

| # | Task | Output |
|---|---|---|
| 7 | Set up SQLite with better-sqlite3 + Drizzle ORM | DB connection working |
| 8 | Define schema (issues, developers, component_map, sync_log, config) | Tables created on startup |

### 4.3 Jira Integration

| # | Task | Output |
|---|---|---|
| 9 | Implement Jira REST API client | `JiraClient` class with auth, pagination, error handling |
| 10 | Implement sync engine (full + incremental) | Syncs Jira data to SQLite on interval |
| 11 | Add manual sync trigger endpoint | `POST /api/sync` |

### 4.4 Backend API

| # | Task | Output |
|---|---|---|
| 12 | Implement Issue Service + routes | `GET /api/issues`, `GET /api/issues/:key`, `PATCH /api/issues/:key` |
| 13 | Implement Overview endpoint | `GET /api/overview` with computed counts |
| 14 | Implement Workload Service + routes | `GET /api/team/workload`, workload scoring |
| 15 | Implement Alert Service + routes | `GET /api/alerts` with all alert rules |
| 16 | Implement Automation Service + routes | `GET /api/suggestions/*` endpoints |
| 17 | Implement Team routes | `GET /api/team/developers`, `GET /api/team/:id/issues` |
| 18 | Implement Config routes + setup validation | `GET /api/config`, `PUT /api/config`, `POST /api/config/test` |

### 4.5 Frontend — Layout and Structure

| # | Task | Output |
|---|---|---|
| 19 | Create `DashboardLayout` + `Header` | Main page layout with header |
| 20 | Install and configure shadcn/ui components | Button, Badge, Select, Popover, Calendar, Sheet, Toast, Skeleton, Tooltip |
| 21 | Set up TanStack Query client and hooks structure | `QueryClientProvider` in App, hook files created |
| 22 | Implement theme context (dark/light) | Theme toggle working |

### 4.6 Frontend — Features

| # | Task | Output |
|---|---|---|
| 23 | Build `OverviewCards` component | 6 cards with counts from `/api/overview`, clickable |
| 24 | Build `DefectTable` with TanStack Table | Sortable, styled table with all columns |
| 25 | Build `FilterSidebar` | Predefined filter buttons + developer list |
| 26 | Build `TriagePanel` (side sheet) | Opens on row click, shows issue detail + editable fields |
| 27 | Implement inline editing (assignee, priority, due date) | Dropdowns/pickers in table + Jira write-back |
| 28 | Build `WorkloadBar` / `WorkloadPanel` | Developer workload visualization |
| 29 | Build `AlertBanner` + `AlertList` | Alert display with clickable items |
| 30 | Build `SuggestionBar` in triage panel | Shows priority/due/assignee suggestions with "Apply All" |
| 31 | Build `SetupWizard` | First-run configuration form |
| 32 | Build comment form in triage panel | Add comment functionality |

### 4.7 Polish and Testing

| # | Task | Output |
|---|---|---|
| 33 | Add keyboard shortcuts | Arrow keys, Enter, Escape, shortcut keys |
| 34 | Add loading states (skeleton loaders) | Skeletons for cards, table, panel |
| 35 | Add error states and toast notifications | Error handling for all API calls |
| 36 | Add empty states | Messages for zero-result screens |
| 37 | Production build configuration | `npm run build` serves client from Express |
| 38 | Write unit tests (backend services) | Tests for workload, alerts, automation logic |
| 39 | Write component tests (frontend) | Tests for key components |

---

## 5. Jira Integration Steps

### 5.1 Prerequisites

1. **Jira Cloud account** with access to the target project.
2. **API Token** generated at `https://id.atlassian.com/manage/api-tokens`.
3. **Project key** (e.g., `PROJ`).
4. **Issue type** for defects (typically `Bug`).

### 5.2 Environment Variables

```env
# .env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=PROJ
PORT=3001
```

### 5.3 API Authentication

```typescript
// Base64-encoded email:token
const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

const headers = {
  'Authorization': `Basic ${auth}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};
```

### 5.4 Key API Calls

**Search for defects:**
```
GET /rest/api/3/search
?jql=project = PROJ AND issuetype = Bug AND statusCategory != Done
&fields=summary,description,priority,status,assignee,reporter,
        components,labels,duedate,created,updated,flagged
&startAt=0
&maxResults=100
```

**Update issue fields:**
```
PUT /rest/api/3/issue/PROJ-123
Body: { "fields": { "assignee": { "accountId": "..." } } }
```

**Add comment:**
```
POST /rest/api/3/issue/PROJ-123/comment
Body: {
  "body": {
    "type": "doc",
    "version": 1,
    "content": [{
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Comment text" }]
    }]
  }
}
```

### 5.5 Handling Jira Specifics

| Concern | Approach |
|---|---|
| **Flagged field** | Jira doesn't have a standard "blocked" field. Use `customfield_10021` (flagged) or check for "Impediment" flag. Discovery needed per instance. |
| **Priority mapping** | Map Jira priority names to internal P0–P4. Configurable in settings. |
| **Status mapping** | Use `statusCategory` (To Do / In Progress / Done) for universal compatibility. |
| **Pagination** | Iterate with `startAt` until `total` is reached. Max `maxResults = 100`. |
| **Rate limits** | Check `X-RateLimit-Remaining` header. Back off on 429 with `Retry-After`. |
| **ADF format** | Jira v3 uses Atlassian Document Format for descriptions and comments. Parse for display, construct for writes. |

---

## 6. Configuration Management

### 6.1 Startup Flow

```
1. Server starts
2. Check if .env has JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN
   ├── YES → Check DB for config
   │   ├── Config exists → Start sync engine → Serve dashboard
   │   └── No config → Serve setup wizard
   └── NO → Serve setup wizard
3. Setup wizard collects:
   - Jira URL, email, token (validates connection)
   - Project key (validates project exists)
   - Discovers team members (searchable user list)
   - Saves to DB (config table) + env
4. Initial full sync runs
5. Dashboard loads with data
```

### 6.2 Developer Configuration

Developers are configured during setup:
1. System fetches users assignable to the project from Jira.
2. Lead selects the 5 team members.
3. Stored in `developers` table.
4. Can be updated later via settings.

---

## 7. Build and Run Commands

```bash
# Install all dependencies
npm install

# Development (concurrent frontend + backend)
npm run dev

# Backend only
npm run dev:server

# Frontend only
npm run dev:client

# Build for production
npm run build

# Start production server
npm run start

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage
```

### Package Scripts (root `package.json`)

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "npm run dev --workspace=server",
    "dev:client": "npm run dev --workspace=client",
    "build": "npm run build --workspace=client && npm run build --workspace=server",
    "start": "npm run start --workspace=server",
    "test": "npm run test --workspace=server && npm run test --workspace=client",
    "test:coverage": "npm run test:coverage --workspace=server"
  }
}
```
