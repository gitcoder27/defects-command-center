# UX / UI Design Document

## Defect Management Command Dashboard

**Version:** 1.0
**Date:** March 5, 2026

---

## 1. Design Principles

| Principle | Description |
|---|---|
| **Scannable** | The lead should understand the full situation within 5 seconds of looking at the dashboard. |
| **Action-dense** | Every visible element must serve a decision or action. No decorative content. |
| **Keyboard-first** | Common actions accessible via keyboard shortcuts. |
| **Minimal clicks** | Triage a defect in ≤ 3 clicks (open → set fields → confirm). |
| **Dark-mode native** | Designed dark-first, with light mode as alternate theme. |
| **Distinctive craft** | Every visual detail must feel intentionally designed — not generated. Typography, color, motion, and texture must have a clear point of view. |

### Aesthetic Direction: Tactical Precision

The dashboard follows a **"tactical command"** aesthetic — inspired by mission-control interfaces, radar displays, and high-end aviation instrumentation, but rendered with modern refinement. Think: calm authority, not flashy dashboards.

**Tone:** Industrial precision meets refined minimalism. Cool, dark environments with sharp, purposeful color accents that signal urgency and status. The feeling of a well-built instrument — every element serves a function, nothing is decorative, but everything is beautiful because of its intentionality.

**Defining characteristics:**
- Deep, layered dark surfaces with subtle texture (noise grain) — never flat solid colors
- A dominant **cyan/teal accent** for selections and active states — the "command signal"
- Warm danger tones (amber → red) for urgency escalation
- Crisp, geometric typography with a technical character
- Glow effects on interactive elements indicating "live" data
- Staggered reveal animations that feel like instruments powering on

**What makes it unforgettable:** The dashboard should feel like opening a cockpit — calm, dark, precise, and immediately informative. A single glance tells the whole story.

### Visual Inspiration

- **Linear** — Keyboard-first, dense data, fast navigation.
- **Vercel Dashboard** — Monospaced IDs, status indicators, deployment feel.
- **Bloomberg Terminal** — Dense information architecture, every pixel is data.
- **Aircraft cockpit HUDs** — Layered translucency, glow accents, status-by-color.

---

## 2. Layout Structure

### Main Dashboard (Single Page)

```
┌──────────────────────────────────────────────────────────────────┐
│  HEADER                                                          │
│  [Logo/Title]              [Last synced: 2m ago] [⟳] [🌙/☀️]    │
├──────────────────────────────────────────────────────────────────┤
│  OVERVIEW CARDS                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────┐ │
│  │  New   │ │Unassign│ │Due     │ │Overdue │ │Blocked │ │In  │ │
│  │   3    │ │   5    │ │Today 2 │ │   1    │ │   2    │ │Prog│ │
│  │        │ │        │ │        │ │        │ │        │ │  8 │ │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────┘ │
├──────┬───────────────────────────────────┬───────────────────────┤
│FILTER│          DEFECT TABLE             │    TRIAGE PANEL       │
│      │                                   │    (conditional)      │
│[Unass]│ ID    Title   Pri  Assignee Due  │                       │
│[Today]│ P-101 Login.. P0   —       3/5   │  PROJ-101             │
│[Week ]│ P-102 Cart .. P1   Alice   3/7   │  Login page crash     │
│[Overd]│ P-103 Search  P2   Bob     3/10  │  ────────────────     │
│[Block]│ P-104 Export  P1   —       3/6   │  Priority: [P0 ▼]    │
│[Stale]│ ...                              │  Assignee: [Alice ▼]  │
│[HiPri]│                                  │  Due Date: [3/6  📅]  │
│      │                                   │  Status: In Progress  │
│──────│                                   │  Component: Auth      │
│DEV   │                                   │  ────────────────     │
│[Alice]│                                  │  Description:         │
│[Bob  ]│                                  │  Users report crash   │
│[Carol]│                                  │  when clicking...     │
│[Dave ]│                                  │  ────────────────     │
│[Eve  ]│                                  │  [Add Comment]        │
│      │                                   │  [🔗 Open in Jira]   │
├──────┴───────────────────────────────────┴───────────────────────┤
│  TEAM WORKLOAD BAR                                               │
│  Alice ████████░░ 9  │ Bob ████░░░░░░ 4  │ Carol ██████████ 14  │
│  Dave  ██░░░░░░░░ 2  │ Eve ░░░░░░░░░░ 0 ⚠                      │
└──────────────────────────────────────────────────────────────────┘
```

### Layout Regions

| Region | Position | Height | Behavior |
|---|---|---|---|
| Header | Top | 48px fixed | Always visible |
| Overview Cards | Below header | 80px fixed | Always visible; clickable |
| Filter Sidebar | Left | Fill remaining | Scrollable if needed; collapsible on small screens |
| Defect Table | Center | Fill remaining | Scrollable; virtual rows for performance |
| Triage Panel | Right | Fill remaining | Slides in when a defect is selected; closable |
| Workload Bar | Bottom | 64px fixed | Always visible; expandable to full panel |

### Responsive Behavior

| Breakpoint | Layout Change |
|---|---|
| ≥ 1440px | Full layout as shown above |
| 1024–1439px | Triage panel overlays table (slide-over) |
| < 1024px | Filter sidebar collapses to dropdown; workload bar stacks vertically |

---

## 3. Component Definitions

### 3.1 Header

```
┌──────────────────────────────────────────────────────────┐
│ 🔧 LeadOS     Last synced: 2m ago [⟳] [🌙]│
└──────────────────────────────────────────────────────────┘
```

| Element | Details |
|---|---|
| Title | "LeadOS" — fixed text |
| Sync indicator | Relative time since last sync (e.g., "2m ago"), green dot if < 5min, yellow if > 5min |
| Refresh button | Manual sync trigger; shows spinner while syncing |
| Theme toggle | Dark/Light mode switch |

---

### 3.2 Overview Cards

Each card is a clickable metric tile.

**Card Anatomy:**

```
┌──────────┐
│ label    │    ← "Unassigned" (muted text, 12px)
│    5     │    ← count (bold, 28px)
│ ●        │    ← accent color dot
└──────────┘
```

| Card | Color | Active State |
|---|---|---|
| New | Violet (#8B5CF6) | Violet glow border when filter active |
| Unassigned | Amber (#F59E0B) | Amber glow border |
| Due Today | Orange (#F97316) | Orange glow border |
| Overdue | Red (#EF4444) | Red glow border |
| Blocked | Rose (#E11D48) | Rose glow border |
| In Progress | Emerald (#10B981) | Emerald glow border |

**States:**
- Default: Subtle background, muted border.
- Hover: Slight elevation, brighter border.
- Active/Selected: Full color border, highlighted background.
- Zero state: Count shows "0", card is dimmed.

---

### 3.3 Defect Table

**Column Layout:**

| Column | Width | Alignment | Notes |
|---|---|---|---|
| Priority | 40px | Center | Colored dot or icon |
| Issue ID | 100px | Left | Monospaced font, clickable link |
| Title | Flex (fill) | Left | Truncated with ellipsis, tooltip on hover |
| Assignee | 120px | Left | Avatar + name; "Unassigned" if empty |
| Due Date | 100px | Left | Relative or absolute; red if overdue |
| Status | 100px | Left | Badge/pill with status color |
| Component | 100px | Left | Text, truncated |
| Updated | 80px | Right | Relative time ("2h ago") |
| Blocked | 40px | Center | 🚫 icon if blocked, empty otherwise |

**Row States:**

| State | Visual Treatment |
|---|---|
| Default | Standard row |
| Overdue | Left red border accent (4px) |
| Due Today | Left orange border accent (4px) |
| Stale (no update > 48h) | Left yellow border accent (4px) |
| Blocked | 🚫 icon + subtle red background tint |
| Selected | Blue background highlight |
| Hover | Subtle background change |
| Unassigned | Assignee column shows "—" in muted text |

**Priority Indicators:**

| Priority | Visual |
|---|---|
| P0 (Highest) | 🔴 Red filled circle |
| P1 (High) | 🟠 Orange filled circle |
| P2 (Medium) | 🟡 Yellow filled circle |
| P3 (Low) | 🔵 Blue filled circle |
| P4 (Lowest) | ⚪ Grey circle |

**Inline Actions (on hover or selection):**

- Assignee cell → click to open developer dropdown.
- Priority cell → click to open priority dropdown.
- Due Date cell → click to open date picker.
- Issue ID → click to open in Jira (external link icon).

---

### 3.4 Triage Panel (Side Panel)

**Width:** 400px fixed (right side).
**Trigger:** Click a defect row in the table.
**Close:** Click X, press Escape, or click outside.

**Panel Layout:**

```
┌─────────────────────────────┐
│ ✕                    [🔗]   │  ← Close button + Open in Jira
│                             │
│ PROJ-101                    │  ← Issue key (monospaced, 14px)
│ Login page crashes on       │  ← Full title (16px, bold)
│ submit with special chars   │
│                             │
│ ┌─────────────────────────┐ │
│ │ Priority   [Highest ▼]  │ │  ← Editable dropdown
│ │ Assignee   [Alice   ▼]  │ │  ← With suggestion badge
│ │ Due Date   [2026-03-06📅]│ │  ← Date picker
│ │ Status     In Progress   │ │  ← Read-only badge
│ │ Component  Auth          │ │  ← Read-only text
│ │ Reporter   John          │ │  ← Read-only text
│ │ Created    Mar 4, 9:00am │ │  ← Read-only
│ │ Updated    2 hours ago   │ │  ← Read-only
│ │ Blocked    [Toggle ☐]   │ │  ← Toggle switch
│ └─────────────────────────┘ │
│                             │
│ ── Suggestions ──────────── │
│ 📌 Suggested Priority: P0   │  ← From automation rules
│ 📅 Suggested Due: Mar 6     │  ← From automation rules
│ 👤 Suggested: Alice (load:4)│  ← From workload engine
│   [Apply All Suggestions]   │  ← One-click apply
│                             │
│ ── Description ──────────── │
│ Users report that the login │
│ page crashes when special   │
│ characters are entered...   │
│                             │
│ ── Comments ─────────────── │
│ [Add a comment...]          │  ← Text input + submit
│                             │
│ John (Mar 4):               │
│ "Reproduced on Chrome 120"  │
└─────────────────────────────┘
```

**Suggestion Section Behavior:**
- Suggestions are shown with a subtle highlight background.
- "Apply All Suggestions" button fills Priority + Due Date + Assignee in one click.
- Lead can override any individual field after applying.

---

### 3.5 Filter Sidebar

**Width:** 200px fixed (left side).

```
FILTERS
────────────
[  All (24)         ]   ← default active
[  Unassigned (5)   ]
[  Due Today (2)    ]
[  Due This Week (7)]
[  Overdue (1)      ]
[  Blocked (2)      ]
[  Stale (3)        ]
[  High Priority (4)]

DEVELOPERS
────────────
[  Alice (4)        ]
[  Bob (3)          ]
[  Carol (5)        ]
[  Dave (2)         ]
[  Eve (0) ⚠       ]
```

| Element | Behavior |
|---|---|
| Filter button | Click to filter table; active filter is highlighted |
| Count badge | Shows matching issue count |
| Developer button | Click to filter table to that developer's issues |
| Idle warning | ⚠ icon next to developers with 0 active defects |
| Multiple selection | Filter + Developer can be combined |

---

### 3.6 Team Workload Bar

**Height:** 64px collapsed, 200px expanded.

**Collapsed View (default):**

```
┌──────────────────────────────────────────────────────┐
│ 👤 Alice ████████░░ 9  │ 👤 Bob ████░░░░░░ 4        │
│ 👤 Carol █████████▓ 14 │ 👤 Dave ██░░░░░░░░ 2       │
│ 👤 Eve   ░░░░░░░░░░ 0 ⚠│                            │
└──────────────────────────────────────────────────────┘
```

**Bar Colors:**
- Light (< 5): Green
- Medium (5–11): Yellow
- Heavy (≥ 12): Red
- Idle (0): Grey with warning icon

**Expanded View (click to expand):**

Each developer shows a mini card:

```
┌──────────────────┐
│ 👤 Alice          │
│ Active: 4         │
│ Due Today: 1      │
│ Blocked: 0        │
│ Score: 9 (Medium) │
│ ████████░░        │
└──────────────────┘
```

**Click developer card** → Filters defect table to their issues (same as clicking developer in sidebar).

---

### 3.7 Alert Banner

**Position:** Inline between overview cards and table, or as a dismissible banner.

**Visible only when alerts exist.**

```
┌──────────────────────────────────────────────────────────┐
│ ⚠ 3 alerts: 1 overdue · 1 stale · 1 idle developer      │
│                                              [View All ▸] │
└──────────────────────────────────────────────────────────┘
```

**Alert detail popover (on "View All"):**

```
┌─────────────────────────────────────┐
│ 🔴 PROJ-101 is overdue (due Mar 3)  │
│ 🟡 PROJ-105 is stale (no update 3d) │
│ 🟡 Eve has no active defects         │
└─────────────────────────────────────┘
```

Each alert is clickable → navigates to the relevant defect or developer.

---

## 4. Interaction Flows

### 4.1 Triage a New Defect

```
1. Lead opens dashboard
2. Sees "Unassigned: 5" card highlighted
3. Clicks "Unassigned" card
4. Table filters to unassigned defects
5. Clicks first defect row
6. Triage panel slides in from right
7. Panel shows:
   - Full description
   - Suggested priority (P1)
   - Suggested due date (Mar 8)
   - Suggested assignee (Bob — lowest load)
8. Lead clicks "Apply All Suggestions"
   → Priority, Due Date, Assignee auto-filled
9. Lead optionally adjusts (e.g., changes assignee to Alice)
10. Changes are saved to Jira automatically on field change
11. Lead clicks next defect row (or uses ↓ arrow key)
12. Repeats until unassigned count = 0
```

### 4.2 Reassign a Blocked Defect

```
1. Alert banner shows "1 blocked"
2. Lead clicks alert → PROJ-104 highlighted in table
3. Opens triage panel
4. Reads description, sees it's blocked on API dependency
5. Adds comment: "Reassigning to Carol who owns the API module"
6. Changes assignee to Carol
7. Toggles blocked flag off (if unblocked)
8. Changes saved to Jira
```

### 4.3 Standup Prep — Developer View

```
1. Lead clicks "Alice" in sidebar developer list
2. Table filters to Alice's defects
3. Sees: 4 active, 1 due today, 0 blocked
4. Reviews each defect's status and last updated time
5. Prepares discussion points for standup
6. Clicks "Bob" to repeat for next developer
```

---

## 5. UI States

### 5.1 Loading State

- Skeleton loaders for overview cards (pulsing rectangles).
- Skeleton rows for defect table.
- "Connecting to Jira..." message on first load.

### 5.2 Empty States

| Context | Empty State Message |
|---|---|
| No defects at all | "No defects found. Your project is clean! 🎉" |
| Filter returns 0 | "No defects match this filter." with a [Clear Filter] button |
| No alerts | Alert banner hidden entirely |
| Developer has 0 defects | Developer card shows "No active defects" + idle warning |

### 5.3 Error States

| Error | UI Treatment |
|---|---|
| Jira connection failed | Yellow banner: "Unable to reach Jira. Showing cached data from {time}." |
| Update failed | Red toast notification: "Failed to update PROJ-101. Retry?" with Retry button |
| Sync error | Sync indicator turns red, shows "Sync failed" on hover |
| Rate limited | Yellow banner: "Jira rate limit reached. Data will refresh shortly." |

### 5.4 First Run / Setup

```
┌───────────────────────────────────┐
│        Welcome to Defect          │
│        Command Center             │
│                                   │
│  Let's connect to Jira.           │
│                                   │
│  Jira URL:    [____________]      │
│  Email:       [____________]      │
│  API Token:   [____________]      │
│  Project Key: [____________]      │
│                                   │
│         [Test Connection]         │
│         [Save & Start ▸]         │
│                                   │
│  ℹ API token: Create at           │
│    id.atlassian.com/manage/       │
│    api-tokens                     │
└───────────────────────────────────┘
```

After setup, the dashboard runs initial sync and loads.

---

## 6. Visual Design Specifications

### 6.1 Color Palette

**Design rationale:** The palette is built around a dominant **cyan/teal accent** (`--accent`) as the "command signal" — the color of active, selected, and interactive states. It is the most visually prominent chromatic color on screen. Danger states escalate from amber to red. The background layers use cool-tinted darks with subtle blue undertones to create depth and separation without relying on borders alone.

**Dark Mode (Primary):**

| Token | Value | Usage |
|---|---|---|
| `--bg-primary` | `#09090B` | Main background (near-black with cool tint) |
| `--bg-secondary` | `#0F1117` | Cards, panels (subtle blue undertone) |
| `--bg-tertiary` | `#161922` | Table rows (alt), inputs, elevated surfaces |
| `--bg-glow` | `rgba(6, 182, 212, 0.04)` | Subtle ambient glow under active elements |
| `--border` | `#1E2330` | Borders, dividers (cool-tinted, not pure grey) |
| `--border-active` | `rgba(6, 182, 212, 0.3)` | Borders on focused/active elements |
| `--text-primary` | `#F0F1F3` | Primary text (slightly warm white) |
| `--text-secondary` | `#8B8FA3` | Secondary text, labels |
| `--text-muted` | `#4A4E5C` | Muted text, timestamps |
| `--accent` | `#06B6D4` | **Dominant accent** — links, selections, active states (cyan-500) |
| `--accent-glow` | `rgba(6, 182, 212, 0.15)` | Glow aura around accent elements |
| `--success` | `#10B981` | In Progress, healthy (emerald — warmer than pure green) |
| `--warning` | `#F59E0B` | Due Today, medium load (amber) |
| `--danger` | `#EF4444` | Overdue, critical (red) |
| `--danger-muted` | `#DC2626` | Danger backgrounds, blocked tints |
| `--info` | `#8B5CF6` | New items, informational (violet) |

**Light Mode:**

| Token | Value | Usage |
|---|---|---|
| `--bg-primary` | `#FAFBFC` | Main background (cool off-white, not pure white) |
| `--bg-secondary` | `#F1F3F8` | Cards, panels (blue-tinted grey) |
| `--bg-tertiary` | `#E8ECF2` | Table rows (alt), inputs |
| `--border` | `#D1D5E0` | Borders, dividers |
| `--text-primary` | `#0F172A` | Primary text (slate-900) |
| `--text-secondary` | `#475569` | Secondary text (slate-600) |
| `--accent` | `#0891B2` | Dominant accent (cyan-600 — darker for contrast on light) |

### 6.2 Typography

**Font strategy:** A distinctive two-font pairing that reflects the tactical-precision aesthetic. Avoid generic fonts (Inter, Roboto, Arial, system-ui). Instead, use characterful fonts that feel technical and intentional.

**Font pairing:**
- **Display / Headings:** `Geist` (Vercel's variable font) — geometric, technical, crisp. Loaded via `@fontsource/geist-sans` or Vercel's CDN. Fallback: `Satoshi` or `General Sans`.
- **Monospace / Data:** `Geist Mono` — for issue IDs, timestamps, and numerical data. Gives a unified feel with the display font. Fallback: `JetBrains Mono`.

**Why Geist:** Geometric precision with distinctive character — subtle quirks in letterforms (the lowercase 'a', the 'g') that set it apart from the Inter/Roboto generic tier. It was designed for developer dashboards and pairs perfectly with the command-center aesthetic.

| Element | Font | Size | Weight | Notes |
|---|---|---|---|---|
| App title | Geist | 18px | 600 | Uppercase tracking +0.05em |
| Overview card count | Geist | 32px | 700 | Tabular numerals for alignment |
| Overview card label | Geist | 11px | 500 | Uppercase, tracking +0.08em, muted color |
| Table header | Geist | 11px | 600 | Uppercase, tracking +0.06em |
| Table cell | Geist | 13px | 400 | Default body text |
| Issue ID | Geist Mono | 13px | 500 | Cyan accent color, clickable |
| Timestamps | Geist Mono | 12px | 400 | Muted color, tabular nums |
| Triage panel title | Geist | 16px | 600 | — |
| Triage panel body | Geist | 14px | 400 | — |
| Filter label | Geist | 13px | 500 | — |
| Alert text | Geist | 13px | 500 | — |
| Workload score | Geist Mono | 14px | 600 | Color-coded by level |

### 6.3 Spacing System

Base unit: 4px. Use multiples: 4, 8, 12, 16, 20, 24, 32, 40, 48.

| Context | Spacing |
|---|---|
| Card padding | 16px |
| Card gap | 12px |
| Table row height | 44px |
| Table cell padding | 12px horizontal, 8px vertical |
| Panel padding | 20px |
| Section gap | 24px |

### 6.4 Border Radius

| Element | Radius |
|---|---|
| Cards | 8px |
| Buttons | 6px |
| Inputs | 6px |
| Badges/pills | 9999px (full round) |
| Panels | 0px (flush to edge) |

### 6.5 Atmosphere and Depth

**Design rationale:** Flat solid-color surfaces feel lifeless and generic. The command-center aesthetic requires *layered depth* — subtle texture and glow that make the interface feel alive with data, like instruments humming in a cockpit.

**Background texture:**
- Apply a subtle **noise grain overlay** on `--bg-primary` (opacity 0.015–0.03). Use a CSS noise pattern via SVG filter or a tiny repeating PNG.
- This adds tactile depth without visual clutter. The grain should be barely perceptible — felt more than seen.

**Glow effects:**
- Active/selected overview cards receive a `box-shadow` glow in their accent color: `0 0 20px rgba(accent, 0.15)`.
- The selected defect row gets a subtle left-edge glow: `inset 4px 0 0 var(--accent)` + `box-shadow: 0 0 12px var(--accent-glow)`.
- The sync indicator pulses with a soft glow animation when data is fresh.

**Surface layering (dark mode):**
- Background layers create a 3-tier depth system: `--bg-primary` → `--bg-secondary` → `--bg-tertiary`.
- Higher surfaces have a *very subtle* lighter border (`--border`) to create separation. No heavy box shadows.
- The triage panel has a left-edge shadow + a 1px border to separate from the table.

**Shadows:**

| Element | Shadow |
|---|---|
| Overview cards (default) | `0 1px 3px rgba(0,0,0,0.3), 0 0 1px rgba(6,182,212,0.05)` |
| Overview cards (active) | `0 0 20px rgba(accent-color, 0.15), 0 1px 3px rgba(0,0,0,0.3)` |
| Triage panel | `−8px 0 24px rgba(0,0,0,0.5)` |
| Dropdowns / popovers | `0 8px 24px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.05)` |
| Selected row | `inset 4px 0 0 var(--accent)` |
| Alerts | None (use colored left border + background tint) |

---

## 7. Keyboard Shortcuts

| Key | Action |
|---|---|
| `↑` / `↓` | Navigate defect table rows |
| `Enter` | Open/close triage panel for selected row |
| `Escape` | Close triage panel |
| `a` | Focus assignee dropdown (when panel open) |
| `p` | Focus priority dropdown (when panel open) |
| `d` | Focus due date picker (when panel open) |
| `r` | Trigger manual refresh |
| `1`–`7` | Activate filter 1–7 |
| `0` | Clear all filters |
| `/` | Focus search (future feature) |

---

## 8. Animations and Transitions

**Design rationale:** Motion should feel like instruments powering on — purposeful, staggered, precise. One well-orchestrated page-load sequence creates more delight than scattered micro-interactions. Use the Motion library (Framer Motion) in React for orchestrated sequences; CSS transitions for simple state changes.

### 8.1 Page Load Sequence ("Power On")

When the dashboard first loads (or data arrives after sync), elements appear in a staggered cascade:

```
0ms    — Header fades in (opacity 0→1, translateY -8→0)
80ms   — Overview cards stagger in left-to-right (each card delayed +60ms)
         Cards: opacity 0→1, translateY 12→0, scale 0.97→1
         Card counts animate from 0 to actual value (count-up)
300ms  — Alert banner slides down (if alerts exist)
350ms  — Filter sidebar fades in (opacity 0→1, translateX -12→0)
400ms  — Table rows stagger in top-to-bottom (each row delayed +30ms, max 10 rows animated)
         Rows: opacity 0→1, translateY 6→0
600ms  — Workload bar slides up from bottom
```

Total orchestrated entrance: ~700ms. Feels snappy but alive.

### 8.2 Component Transitions

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Triage panel open/close | Slide from right (translateX 100%→0) + fade | 250ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Filter activation | Table re-renders with row fade-swap | 150ms | ease-out |
| Overview card hover | Background brightens, border glows, translateY -1px | 150ms | ease-out |
| Overview card active | Glow shadow expands, border becomes accent color | 200ms | ease-out |
| Row hover | Background color transition, subtle translateX +2px | 100ms | ease-out |
| Row selection | Left accent border slides in, background tints | 150ms | ease-out |
| Sync spinner | Rotate 360° continuous, pulse glow | Continuous | linear |
| Alert banner appear | Fade in + slideY -8→0 | 250ms | ease-out-expo |
| Toast notification | Slide from right + fade in, auto-dismiss | 300ms in, 5s hold, 200ms out | ease-out-expo |
| Workload bar expand | Height transition + content fade-in | 250ms | ease-out |
| Dropdown open | Scale 0.95→1 + fade in, transformOrigin top | 150ms | ease-out |
| Count-up (card numbers) | Animated counter from 0 to value | 600ms | ease-out |

### 8.3 Micro-interactions

| Interaction | Effect |
|---|---|
| Priority dot hover | Slight scale-up (1.2×) with color glow |
| Issue ID hover | Underline slides in from left, color shifts to accent |
| Blocked icon | Subtle continuous pulse animation (opacity 0.7↔1.0, 2s cycle) |
| Idle developer badge | Amber glow pulse (matches blocked timing) |
| "Apply All Suggestions" button | On hover: glow aura expands. On click: brief scale-down (0.97) then bounce back |
| Assignee avatar | Subtle ring border appears on hover |
| Workload bar fill | Width animates from 0 to target on load (400ms, staggered per developer) |

### 8.4 Motion Library

Use **Framer Motion** (`motion` package) for:
- Page load orchestration (`AnimatePresence`, `staggerChildren`)
- Triage panel mount/unmount
- Layout animations (when table re-sorts or filters change)

Use **CSS transitions** for:
- Hover states (background, border, color)
- Simple state changes (active filter highlight)
- Glow and shadow transitions
