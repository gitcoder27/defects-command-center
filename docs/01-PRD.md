# Product Requirements Document (PRD)

## Defect Management Command Dashboard

**Version:** 1.0
**Date:** March 5, 2026
**Author:** Engineering Lead
**Status:** Approved for Implementation

---

## 1. Problem Statement

### Current Situation

A team lead managing 5 developers during a defect-fixing phase uses Jira as the defect tracker. By process, every defect is initially assigned to the lead. The lead must:

- Review and triage new defects daily
- Understand each issue, set priority, assign developers
- Track progress across the team
- Ensure balanced workload and no idle developers
- Ensure due dates are met

### Pain Points

| Pain Point | Impact |
|---|---|
| No single operational view | Lead must open multiple Jira views, filters, and boards to get a full picture |
| Manual triage is slow | Reviewing, prioritizing, and assigning defects takes 30+ minutes daily |
| Workload imbalance is invisible | Jira does not surface per-developer workload at a glance |
| Risk detection is reactive | Overdue, stale, and blocked defects are discovered late |
| No idle-developer detection | Developers finishing work early sit idle until the next standup |
| Context switching | Constant jumping between Jira views, spreadsheets, and Slack |

### Desired Outcome

A single-screen **Command Dashboard** that replaces all manual Jira triage workflows, surfaces risks automatically, and enables the lead to manage the entire defect-fixing stage in under 10 minutes each morning.

---

## 2. Goals

### Primary Goals

1. **Reduce morning triage time** from 30+ minutes to under 10 minutes.
2. **Provide real-time operational visibility** across all defects and team members.
3. **Automate risk detection** — surface overdue, stale, blocked, and unstarted high-priority defects.
4. **Balance workload** — show per-developer load with weighted scoring.
5. **Eliminate idle time** — detect developers with no active work.

### Non-Goals (Out of Scope)

- Replacing Jira as the system of record.
- Sprint planning or backlog grooming.
- Non-defect work items (stories, tasks, epics).
- Multi-project support (single Jira project for MVP).
- Mobile app (responsive web is sufficient).

### Success Metrics

| Metric | Target |
|---|---|
| Morning triage time | < 10 minutes |
| Dashboard load time | < 2 seconds |
| Defect assignment time (per defect) | < 30 seconds |
| Risk detection latency | Real-time (on each data refresh) |
| Data freshness | ≤ 5 minutes behind Jira |
| User satisfaction (lead self-assessment) | Replaces all other Jira views for daily work |

---

## 3. User Personas

### Primary Persona: Engineering Team Lead

- **Name:** The Lead
- **Role:** Software engineer and team lead managing 5 developers
- **Context:** In the defect-fixing stage of a project; all defects flow through them first
- **Daily workflow:** Triage → Assign → Monitor → Adjust
- **Needs:** Speed, clarity, automation, single-screen management
- **Frustrations:** Too many clicks in Jira, no workload view, risks discovered too late

### Secondary Persona: Developer (View Only — Phase 2)

- **Role:** Team member working on assigned defects
- **Need:** See their own assigned defects and priorities (addressed via Developer Daily View)

---

## 4. Workflows

### 4.1 Morning Triage (Daily — ~10 minutes)

```
Open Dashboard
    → See overview cards (new, unassigned, due today, overdue, blocked)
    → Click "Unassigned" card to filter defect table
    → For each unassigned defect:
        → Click row to open triage panel
        → Read description
        → Set priority (system suggests based on labels/type)
        → Set due date (system suggests based on priority)
        → Assign developer (system suggests based on workload + component)
        → Confirm assignment
    → Review "Overdue" and "Due Today" cards
    → Done
```

### 4.2 Midday Monitoring (Ad-hoc — ~2 minutes)

```
Glance at Dashboard
    → Check team workload panel for imbalance
    → Check alerts for blocked/stale/overdue
    → Click any alert to see the defect
    → Take action if needed (reassign, escalate, unblock)
```

### 4.3 Risk Monitoring (Continuous — passive)

```
Dashboard auto-refreshes
    → Alert badges update on overview cards
    → Alert list highlights:
        - Overdue defects
        - Stale defects (no update > 48h)
        - Blocked issues
        - Idle developers (0 active defects)
        - High-priority defects not started
```

### 4.4 Standup Preparation (Daily — ~3 minutes)

```
Open Developer Daily View
    → Select developer
    → See their active defects, priorities, due dates, blocked items
    → Use as standup discussion guide
```

---

## 5. Feature Specifications

### F1: Command Center Overview Cards

**Purpose:** Instant situational awareness.

| Card | Definition | Color |
|---|---|---|
| New | Defects created in last 24h assigned to lead | Blue |
| Unassigned | Defects with no developer assignee (still assigned to lead) | Yellow |
| Due Today | Defects with due date = today | Orange |
| Overdue | Defects past due date and not resolved | Red |
| Blocked | Defects with "Blocked" status or flag | Red |
| In Progress | Defects actively being worked on | Green |

**Behavior:**
- Cards are clickable; clicking filters the defect table to that subset.
- Counts refresh with each data sync.

---

### F2: Defect Table

**Purpose:** Primary operational interface for viewing and acting on defects.

**Columns:**

| Column | Source | Notes |
|---|---|---|
| Issue ID | Jira key (e.g., PROJ-123) | Linked to Jira |
| Title | Jira summary (truncated to 1 line) | Tooltip shows full title |
| Priority | Jira priority field | Editable inline |
| Assignee | Jira assignee | Editable inline (dropdown) |
| Due Date | Jira due date | Editable inline (date picker) |
| Status | Jira status | Read-only |
| Component | Jira component field | Read-only |
| Last Updated | Jira `updated` timestamp | Relative time (e.g., "2h ago") |
| Blocked | Jira flagged or blocked status | Icon indicator |

**Behavior:**
- Default sort: Priority (desc), then Due Date (asc), then Created (desc).
- Inline editing pushes changes to Jira via API.
- Row click opens triage panel.
- Row highlights: red for overdue, yellow for due today, grey for stale.

---

### F3: Triage Panel (Side Panel)

**Purpose:** Full defect context and quick actions without leaving the dashboard.

**Display Fields:**
- Issue ID + link to Jira
- Full title
- Full description (rendered markdown)
- Priority
- Status
- Component
- Assignee
- Due date
- Created date
- Last updated
- Reporter
- Labels

**Actions:**
- Assign developer (dropdown with suggestion highlighted)
- Change priority (dropdown)
- Set due date (date picker)
- Add comment/note (synced to Jira)
- Toggle blocked flag
- Open in Jira (external link)

---

### F4: Team Workload Panel

**Purpose:** At-a-glance view of team capacity and balance.

**Per Developer Card:**

| Field | Definition |
|---|---|
| Name | Developer name + avatar |
| Active Defects | Count of open defects assigned |
| Due Today | Count due today |
| Blocked | Count of blocked defects |
| Workload Score | Weighted sum (see below) |
| Workload Level | Light / Medium / Heavy (color-coded bar) |

**Workload Score Calculation:**

```
Score = Σ (weight × count_per_priority)

Priority weights:
  P0 (Critical/Highest) = 5
  P1 (High)             = 3
  P2 (Medium)           = 1
  P3+ (Low/Lowest)      = 0.5

Thresholds:
  Light:  score < 5
  Medium: 5 ≤ score < 12
  Heavy:  score ≥ 12
```

**Behavior:**
- Clicking a developer card filters the defect table to their defects.
- Idle developers (score = 0, no active defects) are flagged with an alert badge.

---

### F5: Assignment Suggestions

**Purpose:** Reduce decision fatigue when assigning defects.

**Suggestion Logic (ordered by priority):**

1. **Component match** — Developer has previously fixed defects in the same component.
2. **Lowest workload** — Developer with lowest current workload score.
3. **Historical fit** — Developer has fixed the most defects of this type historically.

**Behavior:**
- When a defect is selected for assignment, a ranked list of developers is shown.
- Top suggestion is highlighted.
- Lead confirms or overrides.

**Phase:** Basic (workload-only) in Phase 1. Component + historical in Phase 2.

---

### F6: Alert System

**Purpose:** Proactive risk detection without manual scanning.

| Alert Type | Trigger | Severity |
|---|---|---|
| Overdue | Due date passed, defect not resolved | High |
| Stale | No update for > 48 hours | Medium |
| Blocked | Defect flagged as blocked | High |
| Idle Developer | Developer has 0 active defects | Medium |
| High Priority Not Started | P0/P1 defect in "To Do" status for > 4 hours | High |

**Display:**
- Alert count badge on overview cards.
- Dedicated alert section/list with grouped alerts.
- Visual indicators on affected defect rows and developer cards.

---

### F7: Smart Filters

**Purpose:** Quick access to common views without building custom queries.

**Predefined Filters:**

| Filter | JQL / Logic |
|---|---|
| Unassigned | Assignee = current user (lead) |
| Due Today | Due date = today |
| Due This Week | Due date between today and end of week |
| Overdue | Due date < today AND status ≠ Done |
| Blocked | Flagged or status = Blocked |
| Stale | Updated < now() - 48h AND status ≠ Done |
| High Priority | Priority in (Highest, High) |
| By Developer | Assignee = {selected developer} |

**Behavior:**
- Filters displayed as buttons/chips in a sidebar or top bar.
- Only one filter active at a time (or combined with a developer filter).
- Active filter is visually highlighted.

---

### F8: Developer Daily View

**Purpose:** Focused view per developer for standups and planning.

**Content:**
- Selected developer's name and workload score.
- List of their active defects sorted by priority then due date.
- Each defect shows: ID, title, priority, due date, status, blocked flag.
- Summary: total active, due today, overdue, blocked.

**Access:**
- Click developer name in workload panel.
- Or select from a developer dropdown.

---

### F9: Automation Rules

**Purpose:** Reduce manual decisions with smart defaults.

| Rule | Logic | Output |
|---|---|---|
| Priority Suggestion | Label contains "production" or type = "Production Bug" → P0; Label contains "customer" → P1; Otherwise → P2 | Suggested priority shown in triage panel |
| Due Date Suggestion | P0 → created + 24h; P1 → created + 3 days; P2 → created + 7 days | Suggested due date shown in triage panel |
| Stale Detection | `updated` timestamp > 48h ago AND status ∉ {Done, Closed} | Stale alert raised |

**Behavior:**
- Suggestions are shown as pre-filled defaults; lead can override.
- Stale detection runs on every data refresh.

---

## 6. Data Requirements

### From Jira (Read)

- Issues: key, summary, description, priority, status, assignee, reporter, components, labels, due date, created, updated, flagged
- Transitions: status change history (for cycle time — Phase 2)
- Comments: latest comment (for staleness context)

### To Jira (Write)

- Update assignee
- Update priority
- Update due date
- Add comment
- Update flagged status

---

## 7. Constraints and Assumptions

### Constraints

- Uses only free Jira Cloud REST API (v3).
- Authentication via email + API token (Basic Auth).
- Single Jira project scope for MVP.
- Maximum ~2,000 open defects at any time.

### Assumptions

- All defects are initially assigned to the lead in Jira.
- The team uses standard Jira statuses (To Do, In Progress, Done) or a simple workflow.
- Developers are a known, configured list (5 developers for MVP).
- The dashboard is used by a single user (the lead) — no multi-tenancy required.

---

## 8. Phasing

### Phase 1 — MVP

- Jira integration (fetch + update)
- Command Center Overview Cards
- Defect Table with inline actions
- Triage Panel
- Smart Filters
- Team Workload Panel
- Alert System
- Automation Rules (priority + due date suggestions)
- Basic assignment suggestion (workload-only)
- Auto-refresh

### Phase 2 — Enhanced Intelligence

- Component ownership mapping
- Historical fix analysis for assignment suggestions
- Cycle time metrics
- Defect trend charts
- Developer Daily View (standalone page)
- SLA tracking

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Jira API rate limits | Cache data locally; batch requests; respect rate headers |
| Jira API latency | Background sync with local cache; show cached data immediately |
| Data staleness | Show "last synced" timestamp; allow manual refresh |
| Incorrect automation suggestions | Always show as suggestions, never auto-apply |
| Scope creep | Strict Phase 1 / Phase 2 boundary |
