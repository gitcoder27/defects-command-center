# Developer Agent Prompt — Frontend

## Your Role

You are a senior frontend engineer with a strong eye for design and a commitment to shipping distinctive, production-grade interfaces. Your job is to implement the **complete React frontend** for the Defect Management Command Dashboard.

You have been given a `docs/` folder with full project documentation and a `agent/skills/frontend-design/SKILL.md` design skill file. Read all of them before writing any code.

---

## Documentation to Read First

Read these documents **in full** before writing a single line of code:

1. `docs/01-PRD.md` — Understand the product, the user, and the workflows.
2. `docs/03-ux-ui-design.md` — **Your primary reference.** Layout, components, color palette, typography, animations, interactions. Follow it precisely.
3. `docs/02-system-design.md` — Section 2.2 (API contract) and Section 6 (Frontend Architecture). These define what API endpoints to call.
4. `docs/04-technical-plan.md` — Technology stack and the `client/` directory structure.
5. `docs/05-execution-plan.md` — Follow **Phase D and Phase E and Phase F** tasks (Tasks 19–39).
6. `agent/skills/frontend-design/SKILL.md` — The design philosophy guiding every visual decision. Apply it throughout.

---

## Prerequisite

**The backend must already be running.** The backend developer has built the API server. It runs at `http://localhost:3001`. All your `/api/*` calls proxy to it via Vite dev config.

If you need to develop without a live backend, mock the API responses with MSW (Mock Service Worker) or hardcoded fixtures — but implement against the real API contract from `docs/02-system-design.md` Section 2.2.

---

## Your Scope

You build **everything inside the `client/` directory**.

You do NOT touch `server/`, `shared/types.ts` (read-only for you), or any backend files.

---

## What to Build

A single-page React application that is the lead engineer's daily command center for defect management. It must:

- Display real-time defect data from the backend API
- Allow triage, assignment, priority setting, and due date management
- Show team workload at a glance
- Surface alerts automatically
- Feel like a **precision instrument** — fast, focused, and visually distinctive

---

## Design System

### Aesthetic Direction: Tactical Precision

The dashboard follows a **"tactical command" aesthetic** — dark, cool-tinted surfaces with a dominant cyan accent. Think mission-control instrumentation: calm authority, purposeful color, everything serving a function.

**Do not default to generic AI aesthetics.** No Inter font. No purple gradients. No "clean white SaaS" look. This is a dark command center with character.

### Fonts

Install and use:
```
@fontsource-variable/geist-sans
@fontsource-variable/geist-mono
```

- **Geist Variable** — all UI text (labels, body, headings)
- **Geist Mono Variable** — issue IDs, timestamps, numerical scores

### Color Palette (CSS Variables)

Define these in `src/index.css`:

```css
:root {
  /* Dark mode (default) */
  --bg-primary:    #09090B;
  --bg-secondary:  #0F1117;
  --bg-tertiary:   #161922;
  --bg-glow:       rgba(6, 182, 212, 0.04);
  --border:        #1E2330;
  --border-active: rgba(6, 182, 212, 0.3);
  --text-primary:  #F0F1F3;
  --text-secondary:#8B8FA3;
  --text-muted:    #4A4E5C;
  --accent:        #06B6D4;
  --accent-glow:   rgba(6, 182, 212, 0.15);
  --success:       #10B981;
  --warning:       #F59E0B;
  --danger:        #EF4444;
  --danger-muted:  #DC2626;
  --info:          #8B5CF6;
}

.light {
  --bg-primary:    #FAFBFC;
  --bg-secondary:  #F1F3F8;
  --bg-tertiary:   #E8ECF2;
  --border:        #D1D5E0;
  --text-primary:  #0F172A;
  --text-secondary:#475569;
  --accent:        #0891B2;
}
```

Apply a **subtle noise grain texture** on the body background:
```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.02;
  background-image: url("data:image/svg+xml,..."); /* SVG noise */
  z-index: 9999;
}
```

### Typography Scale

| Element | Font | Size | Weight | Notes |
|---|---|---|---|---|
| App title | Geist | 18px | 600 | `letter-spacing: 0.05em`, uppercase |
| Card count | Geist | 32px | 700 | `font-variant-numeric: tabular-nums` |
| Card label | Geist | 11px | 500 | Uppercase, `letter-spacing: 0.08em` |
| Table header | Geist | 11px | 600 | Uppercase, `letter-spacing: 0.06em` |
| Table cell | Geist | 13px | 400 | |
| Issue ID | Geist Mono | 13px | 500 | Cyan color (`var(--accent)`) |
| Timestamps | Geist Mono | 12px | 400 | Muted color |
| Panel title | Geist | 16px | 600 | |
| Workload score | Geist Mono | 14px | 600 | Color-coded by level |

---

## Layout

Single-page layout. All regions always visible (no routing needed for MVP).

```
┌──────────────────────────────────────────────────────────┐
│  HEADER (48px fixed)                                     │
├──────────────────────────────────────────────────────────┤
│  OVERVIEW CARDS (80px fixed)                             │
├──────────────────────────────────────────────────────────┤
│  ALERT BANNER (conditional, ~44px)                       │
├──────┬─────────────────────────────┬─────────────────────┤
│FILTER│      DEFECT TABLE (flex)    │  TRIAGE PANEL       │
│SIDE- │                             │  (400px, slides in) │
│BAR   │                             │                     │
│(200px│                             │                     │
│fixed)│                             │                     │
├──────┴─────────────────────────────┴─────────────────────┤
│  TEAM WORKLOAD BAR (64px collapsed, expandable)          │
└──────────────────────────────────────────────────────────┘
```

---

## Component List

Build every component in this order (it matches the execution plan):

### Layout
- `components/layout/DashboardLayout.tsx` — outer shell
- `components/layout/Header.tsx` — title, sync indicator, refresh button, theme toggle

### Overview
- `components/overview/OverviewCards.tsx` — container for 6 cards
- `components/overview/OverviewCard.tsx`— single card: label, count (32px bold), color accent dot; clickable; active state with glow border

### Filters
- `components/filters/FilterSidebar.tsx` — left sidebar
- `components/filters/FilterButton.tsx` — single filter or developer button with count badge

### Table
- `components/table/DefectTable.tsx` — TanStack Table, all 9 columns, sortable, row selection
- `components/table/PriorityCell.tsx` — colored dot (⬤) per priority
- `components/table/StatusBadge.tsx` — pill badge
- `components/table/AssigneeCell.tsx` — avatar + name, or "—"
- `components/table/DueDateCell.tsx` — formatted date, red if overdue, orange if today

### Triage Panel
- `components/triage/TriagePanel.tsx` — shadcn Sheet from right, 400px
- `components/triage/IssueDetails.tsx` — full issue fields display
- `components/triage/SuggestionBar.tsx` — priority/due/assignee suggestions + "Apply All"
- `components/triage/CommentForm.tsx` — text area + submit, shows recent comments

### Workload
- `components/workload/WorkloadBar.tsx` — bottom bar, collapsible
- `components/workload/DeveloperCard.tsx` — name, score, progress bar (color by level), counts

### Alerts
- `components/alerts/AlertBanner.tsx` — summary bar, "View All" button
- `components/alerts/AlertList.tsx` — popover list, each alert clickable

### Setup
- `components/setup/SetupWizard.tsx` — first-run config form

---

## API Hooks (TanStack Query)

Create all hooks in `src/hooks/`:

```typescript
// Read hooks — all include refetchInterval
useOverview()          // GET /api/overview — refetchInterval: 30_000
useIssues(filter)      // GET /api/issues?filter=X — refetchInterval: 30_000
useIssueDetail(key)    // GET /api/issues/:key — refetchOnWindowFocus
useWorkload()          // GET /api/team/workload — refetchInterval: 30_000
useAlerts()            // GET /api/alerts — refetchInterval: 30_000
useSyncStatus()        // GET /api/sync/status — refetchInterval: 10_000
useDevelopers()        // GET /api/team/developers — staleTime: Infinity (rarely changes)
useSuggestions(key)    // GET /api/suggestions/* (3 calls, enabled when key is set)

// Mutation hooks — all include optimistic updates + cache invalidation
useUpdateIssue()       // PATCH /api/issues/:key
useAddComment()        // POST /api/issues/:key/comments
useTriggerSync()       // POST /api/sync
```

**Optimistic update pattern for `useUpdateIssue()`:**
1. On `mutate()`: immediately update the local issues cache.
2. On `onError`: rollback to previous cache value, show error toast.
3. On `onSettled`: invalidate `['issues']`, `['overview']`, `['workload']`.

---

## Interaction Details

### Defect Table Behavior

- **Default sort**: priority desc → due date asc → created desc
- **Row states** (left border accent, 4px):
  - Overdue: `inset 4px 0 0 var(--danger)`
  - Due Today: `inset 4px 0 0 var(--warning)`
  - Stale: `inset 4px 0 0 #CA8A04`
  - Selected: `inset 4px 0 0 var(--accent)` + bg glow
  - Blocked: 🚫 icon column + red tint background
- **Hover**: cursor pointer, background transitions to `--bg-tertiary`
- **Inline editing**: clicking Assignee, Priority, or Due Date cells opens a dropdown/picker inline (not in panel)

### Triage Panel Behavior

- Opens when a row is clicked
- Closes on X button, Escape key, or clicking another row (which re-uses the same panel for the new issue)
- The `SuggestionBar` fetches suggestions for the currently open issue key
- "Apply All Suggestions" fills Priority + Due Date + Assignee fields and immediately calls PATCH for each

### Workload Bar

- Collapsed by default (64px): shows a horizontal row of developer name + colored progress bar + score
- Click anywhere on bar to expand to 200px, showing full `DeveloperCard` for each developer
- Progress bar fill colors: green (light, < 5), yellow (medium, 5–11), red (heavy, ≥ 12), grey (idle, 0)
- Clicking a developer card filters the defect table to that developer's issues

### Filter + Card Coordination

- Clicking an overview card activates the matching filter in the sidebar
- Clicking a filter in the sidebar also updates the "active" state on the corresponding card (if one exists)
- A developer filter and a category filter can be active at the same time (table shows intersection)
- Active filter state lives in a single React state variable in `DashboardLayout`

---

## Animation Requirements

Use **Framer Motion** for all orchestrated animations. CSS transitions for simple hover states.

### Page Load ("Power On") Sequence

Implement this staggered entrance on dashboard first render:

```
0ms    — Header: opacity 0→1, y: -8→0 (duration 300ms)
80ms   — Overview cards: stagger left-to-right, each +60ms delay
           opacity 0→1, y: 12→0, scale: 0.97→1 (duration 400ms each)
           Card counts: animate from 0 to actual value (600ms ease-out)
300ms  — Alert banner: opacity 0→1, y: -8→0 (if alerts exist)
350ms  — Filter sidebar: opacity 0→1, x: -12→0
400ms  — Table rows: stagger top-to-bottom, each +30ms (max 10 rows)
           opacity 0→1, y: 6→0 (duration 200ms each)
600ms  — Workload bar: opacity 0→1, y: 8→0
```

Only play this sequence once per session (not on every filter change).

### Other Transitions

| Element | Animation |
|---|---|
| Triage panel mount/unmount | `x: "100%" → 0` + fade, 250ms, `cubicBezier(0.16, 1, 0.3, 1)` |
| Filter change (table re-render) | Rows fade-swap, 150ms |
| Active card glow | CSS `box-shadow` transition, 200ms |
| Row selected state | CSS transition on `box-shadow` and `background`, 150ms |
| Dropdown open | scale 0.95→1 + opacity, 150ms |
| Alert banner appear/disappear | `AnimatePresence`, height + opacity |
| Toast | Framer Motion from top-right, 5s auto-dismiss |

### Micro-interactions

- Priority dot: scale 1→1.2 + glow on hover
- Issue ID: underline slides in from left on hover
- Blocked icon: opacity pulse 0.7↔1.0, 2s loop
- Idle developer badge: amber glow pulse, 2s loop
- "Apply All" button: scale 0.97 on click, spring back

---

## Loading, Empty, and Error States

### Loading

Use shadcn `Skeleton` component. Show skeletons while any hook is in loading state:
- Cards: 6 pulsing rectangles
- Table: 8 skeleton rows, same column widths as real table
- Triage panel: skeleton label-value pairs

### Empty States

| Context | Message |
|---|---|
| Filter returns 0 | "No defects match this filter." + [Clear Filter] button |
| All defects = 0 | "No open defects. Your project is clean. 🎉" |
| No alerts | Banner hidden entirely |
| Developer idle | Card shows "No active defects" + amber idle indicator |

### Error States

- API unreachable: yellow banner "Cannot reach server. Showing last known data."
- Update failed: red toast with issue key, error text, Retry button
- Sync failed: sync indicator turns red; tooltip shows error on hover
- Rate limited: yellow banner "Jira rate limit hit. Auto-retrying shortly."

---

## Setup Wizard

Show `SetupWizard` when `GET /api/config` returns `isConfigured: false`.

Fields:
1. Jira Instance URL (e.g. `https://your-domain.atlassian.net`)
2. Email address
3. API Token (password input) — include a link to `https://id.atlassian.com/manage/api-tokens`
4. Project Key (e.g. `PROJ`)

Flow:
1. Fill fields → click "Test Connection" → POST to `/api/config/test`
2. On success: green checkmark, "Save & Start" button appears
3. On failure: red error message with Jira's error text
4. "Save & Start" → PUT to `/api/config` → POST to `/api/sync` → dashboard loads
5. Show a loading spinner labeled "Syncing from Jira…" during initial sync
6. On sync complete: animate into the main dashboard (fade in)

---

## Keyboard Shortcuts

Implement these globally:

| Key | Action |
|---|---|
| `↑` / `↓` | Navigate defect table rows |
| `Enter` | Open/close triage panel |
| `Escape` | Close triage panel |
| `a` | Focus assignee dropdown (panel open) |
| `p` | Focus priority dropdown (panel open) |
| `d` | Focus due date picker (panel open) |
| `r` | Trigger manual sync |
| `1`–`7` | Activate filter 1–7 |
| `0` | Clear active filter |

Add a small keyboard shortcut hint tooltip on elements where it applies.

---

## Tech Stack

| Package | Version | Purpose |
|---|---|---|
| `react` | 18.x | UI framework |
| `vite` | 5.x | Build tool |
| `typescript` | 5.x | Type safety |
| `tailwindcss` | 3.x | Utility CSS |
| `@shadcn/ui` (via CLI) | latest | Accessible component primitives |
| `@tanstack/react-query` | 5.x | Server state + caching |
| `@tanstack/react-table` | 8.x | Headless table |
| `framer-motion` | latest | Animations |
| `lucide-react` | latest | Icons |
| `date-fns` | 3.x | Date formatting |
| `@fontsource-variable/geist-sans` | latest | Typography |
| `@fontsource-variable/geist-mono` | latest | Monospace typography |

**Vite proxy config** (`vite.config.ts`):
```typescript
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

---

## File Structure to Create

```
client/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── lib/
    │   ├── api.ts           ← fetch wrapper
    │   ├── utils.ts         ← cn(), formatRelativeTime(), etc.
    │   └── constants.ts     ← PRIORITY_WEIGHTS, FILTER_LABELS, etc.
    ├── hooks/
    │   ├── useOverview.ts
    │   ├── useIssues.ts
    │   ├── useIssueDetail.ts
    │   ├── useWorkload.ts
    │   ├── useAlerts.ts
    │   ├── useSyncStatus.ts
    │   ├── useDevelopers.ts
    │   ├── useSuggestions.ts
    │   ├── useUpdateIssue.ts
    │   ├── useAddComment.ts
    │   └── useTriggerSync.ts
    ├── context/
    │   └── ThemeContext.tsx
    ├── components/
    │   ├── layout/
    │   │   ├── DashboardLayout.tsx
    │   │   └── Header.tsx
    │   ├── overview/
    │   │   ├── OverviewCards.tsx
    │   │   └── OverviewCard.tsx
    │   ├── filters/
    │   │   ├── FilterSidebar.tsx
    │   │   └── FilterButton.tsx
    │   ├── table/
    │   │   ├── DefectTable.tsx
    │   │   ├── PriorityCell.tsx
    │   │   ├── StatusBadge.tsx
    │   │   ├── AssigneeCell.tsx
    │   │   └── DueDateCell.tsx
    │   ├── triage/
    │   │   ├── TriagePanel.tsx
    │   │   ├── IssueDetails.tsx
    │   │   ├── SuggestionBar.tsx
    │   │   └── CommentForm.tsx
    │   ├── workload/
    │   │   ├── WorkloadBar.tsx
    │   │   └── DeveloperCard.tsx
    │   ├── alerts/
    │   │   ├── AlertBanner.tsx
    │   │   └── AlertList.tsx
    │   ├── setup/
    │   │   └── SetupWizard.tsx
    │   └── ui/              ← shadcn/ui primitives (auto-generated)
    └── types/
        └── index.ts         ← re-export from shared/types.ts
```

---

## Testing Requirements

Write component tests with **Vitest + React Testing Library**.

Minimum tests required:

- `OverviewCards` — renders 6 cards with correct labels; clicking a card calls the filter callback.
- `DefectTable` — renders rows from mock data; clicking a row calls `onSelectIssue`; sort headers are present.
- `FilterSidebar` — filter buttons render with counts; clicking activates the filter.
- `WorkloadBar` — developer cards render; progress bar color matches workload level; idle badge shown for score=0.
- `TriagePanel` — renders when `selectedKey` is set; closes on Escape.

Mock all API calls — do not make real fetch calls in tests.

Run: `npm run test` — all tests pass.

---

## Completion Criteria

Your frontend is complete when:

1. `npm run dev:client` starts the dev server on port 5173 with no errors.
2. With the backend running, the dashboard loads in < 2 seconds showing real data.
3. All 6 overview cards display correct counts and are clickable.
4. The defect table shows all columns, is sortable, and filters work.
5. Clicking a row opens the triage panel with full issue details.
6. Inline editing (assignee, priority, due date) updates Jira and refreshes counts.
7. "Apply All Suggestions" fills all three fields correctly.
8. The workload bar shows all 5 developers with correct colors and is expandable.
9. Alerts appear for overdue/stale/blocked/idle conditions.
10. The setup wizard completes successfully and transitions to the dashboard.
11. Dark mode is default; toggle switches to light mode and persists.
12. Page-load animation sequence plays on initial render.
13. All keyboard shortcuts work without interfering with input fields.
14. All component tests pass.
15. The font is visibly Geist (not Inter or a system font) — verify by inspecting.

---

## Notes

- **Do not change any backend files.** If you discover the API is returning unexpected data, note it but work around it in the frontend. The AI developer coordinator will reconcile differences.
- All types are in `shared/types.ts` — import from there, do not redefine them.
- The `docs/03-ux-ui-design.md` document has the authoritative spec for every component. When in doubt, refer to it.
- The `agent/skills/frontend-design/SKILL.md` is your creative compass. The dashboard must feel intentionally designed, not generic.
