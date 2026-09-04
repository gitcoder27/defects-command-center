# LeadOS Upgrade Recommendations — Top 5

**Date:** 2026-08-28
**Source:** Full codebase analysis (frontend, backend, docs, git history)

This document summarizes a deep review of the LeadOS codebase and recommends the five upgrades with the highest payoff. It is written in plain language so both technical and non-technical readers can follow the reasoning.

---

## Where the product stands today

LeadOS has successfully pivoted from a Jira defect dashboard into a manager's daily operating workspace. The core loop — **Today → Work → Team → Desk → Follow-ups/Meetings** — is built, tested, and live in production. The codebase is well-organized with strong test coverage.

The analysis found that the biggest remaining problems are not missing screens — they are:

1. **Trust.** The app's own docs repeatedly say a manager would still "keep a parallel scratchpad" because follow-ups and next-day continuity are not fully reliable (docs/28, 30).
2. **Silence.** The app only speaks when you open it. Snoozed items, due follow-ups, and stale work never reach out to the manager.
3. **Speed.** There is no fast way (keyboard, search, shareable links) to jump to anything.
4. **Hindsight.** There is no way to look back: no weekly summary, no trends, no export.
5. **Weight.** Several very large files and dead code make the app harder and riskier to change.

The five recommendations below map to these problems in priority order.

---

## Recommendation 1 — Make commitments impossible to lose (Trust & Continuity)

**Type:** Improve / fix existing functionality
**Why first:** The product's own reviews call this "the main product gap." Every other improvement is wasted if managers don't trust the app to remember what they promised.

**Problems found:**

- The **Follow-ups and Meetings pages only show today's items** (`ManagerMemoryPage` reads only the current day's desk). A promise made yesterday silently disappears from view unless it happens to carry forward.
- **Carry-forward is fragile:** carried items land already overdue, times are not rebased to the new day, and there is no "you have unfinished items from yesterday" prompt (open items in docs/30).
- There are **two separate carry-forward implementations** (Manager Desk and Team Tracker, ~1,000 lines combined) that behave differently — a fix in one does not help the other.

**What to build:**

1. An **"All open follow-ups" view** — follow-ups and meetings should show everything still open across all days, not just today. Overdue items surface first.
2. **Automatic carry-forward with time rebasing** — when an item moves to a new day, its scheduled time is adjusted sensibly, and anything arriving overdue is clearly marked "overdue on arrival."
3. **One shared carry-forward engine** used by both Desk and Team Tracker, so behavior is identical everywhere.
4. A gentle **start-of-day prompt**: "You have 3 unfinished items from yesterday — carry them forward?"

**Effort:** Medium. **Impact:** Very high — this is the difference between "nice tool" and "tool I rely on."

---

## Recommendation 2 — Proactive notifications and reminders

**Type:** Add new functionality
**Why:** Today the app is silent. Snoozed actions, due follow-ups, stale check-ins, and blocked work are only visible if the manager happens to open the app. A productivity tool that never taps you on the shoulder is only half a tool.

**Problems found:**

- No notifications table, no reminder scheduler, no browser/push notifications anywhere in the backend or frontend.
- Snooze presets exist ("later today", "tomorrow", "next week") but **nothing tells you when the snooze expires**.
- An entire **alerts system exists but is switched off** — backend routes (`/api/alerts`), hooks (`useAlerts`), and UI (`AlertInbox`) are built and tested, yet mounted nowhere. This is free, finished work waiting to be used.

**What to build:**

1. **Decide the fate of the alerts system:** either wire the existing (already-built) alerts inbox back into the header, or delete it. Right now it is dead weight that confuses the codebase.
2. A lightweight **notifications table + scheduler** on the backend that scans for due follow-ups, expiring snoozes, stale check-ins, and blocked items.
3. **Browser push notifications** (with per-user opt-in) so alerts reach the manager even when the tab is in the background.
4. An optional **daily email digest** ("Your day at a glance") — high value, low complexity, and a natural fit for the existing backup-scheduler pattern.

**Effort:** Medium-high. **Impact:** Very high — turns LeadOS from a pull tool into a push tool.

---

## Recommendation 3 — Command palette, global search, and shareable views

**Type:** Add / enhance
**Why:** The app is designed for a manager's fast-paced day, but navigation is mouse-only and every surface is an island. Power users (the target audience) expect speed.

**Problems found:**

- **No global keyboard shortcut** — no `Cmd+K` palette, no quick-capture hotkey. Shortcuts exist only on the Work page and are nearly undiscoverable.
- **No global search** — each surface searches only its own data. You cannot search "that follow-up about the payment bug" from one place.
- **No deep links** — filters and views are not in the URL, so a manager cannot share or bookmark a filtered view ("all blocked items for Priya").
- **Saved views exist only for Team Tracker** — the Work dashboard, the most filter-heavy surface, cannot save filter sets.

**What to build:**

1. A **`Cmd+K` command palette**: jump to any surface, developer, issue, or desk item; run common actions (capture, check-in, start sync) from the keyboard.
2. **Global search** backed by SQLite FTS5 (full-text search) across issues, desk items, follow-ups, meetings, and check-ins.
3. **URL-driven filter state** on Work and Team, so views become shareable/bookmarkable links.
4. **Saved views for the Work dashboard**, reusing the proven Team Tracker saved-views pattern.

**Effort:** Medium. **Impact:** High — compounds every day, for every session.

---

## Recommendation 4 — Weekly review, trends, and export

**Type:** Add new functionality (kept deliberately lightweight)
**Why:** LeadOS helps managers run their day, but gives them nothing to run their *week*. Managers must answer "how is the team doing?" in 1:1s and staff meetings — right now that means leaving the app.

**Problems found:**

- No reporting or analytics endpoints; no cross-day view of anything (team history is read-only, one day at a time).
- No export of any kind (CSV/PDF) — data in LeadOS is trapped in LeadOS.
- The database **already collects useful history** (`issue_scope_history`, `manager_desk_item_history`) that no API exposes — the raw material for trends is being captured and thrown away.

**What to build (staying true to the "not heavy analytics" anti-goal):**

1. A **Weekly Review page**: promises made vs. kept, follow-ups closed, carry-forward rate (a high carry-forward rate is an early warning signal), check-in freshness per developer, and overdue/blocked trends.
2. **One-click CSV export** on Work, Team, and Follow-ups lists.
3. A **weekly digest** (in-app, optionally emailed — pairs with Recommendation 2): "This week: 12 follow-ups closed, 3 still open, 2 items carried forward 4+ days in a row."

**Effort:** Medium. **Impact:** High — gives managers the hindsight layer that completes the daily loop.

---

## Recommendation 5 — Simplify: remove dead code and split the giant files

**Type:** Simplify / upgrade maintainability
**Why:** This is the "pay down the mortgage" recommendation. Several files have grown so large that every future feature (including Recommendations 1–4) becomes slower and riskier to build.

**Problems found:**

**Dead code (safe to delete or must be wired in):**

- The entire alerts frontend + hooks (see Recommendation 2 — decide its fate).
- `OverviewCards.tsx` / `OverviewCard.tsx` — imported nowhere.
- `ManagerMyDayLanding.tsx` — imported nowhere.
- `node-cron` dependency — declared in `server/package.json` but never imported.
- `component_map` database table — written and read nowhere.

**Giant files that slow down all future work:**

| File | Size | Problem |
|---|---|---|
| `client/.../settings/SettingsPanel.tsx` | ~2,410 lines | Six major sections in one file |
| `server/.../services/team-tracker.service.ts` | ~3,240 lines | The domain core does everything |
| `server/.../services/manager-desk.service.ts` | ~2,290 lines | Second god-service |
| `client/.../setup/SetupWizard.tsx` | ~1,420 lines | Whole onboarding in one file |
| `client/.../table/DefectTable.tsx` | ~1,110 lines | Also renders all rows with no virtualization |

**Duplicated logic:**

- "What needs attention" is computed **twice** — once on the server (`/api/today`) and again in the browser (`lib/manager-attention.ts`, 604 lines). Two sources of truth will eventually disagree.
- The command-runner state machine is duplicated between `TodayPage` and `ManagerActionInbox`.
- Two parallel carry-forward UIs (see Recommendation 1).

**What to do:**

1. Delete (or wire in) the dead code listed above.
2. Split `SettingsPanel.tsx` into one file per section; split the two god-services by domain (board, items, check-ins, carry-forward).
3. Consolidate attention computation on the server only; make the client a consumer of `/api/today`.
4. While touching `DefectTable`, add row virtualization (the table renders every row today — a performance risk as the Jira scope grows).

**Effort:** Medium (can be done incrementally alongside other work). **Impact:** High over time — every subsequent feature ships faster and safer.

---

## Summary table

| # | Recommendation | Type | Effort | Impact | Core benefit |
|---|---|---|---|---|---|
| 1 | Commitments impossible to lose | Improve | Medium | Very high | Trust |
| 2 | Notifications & reminders | Add | Medium-high | Very high | Proactivity |
| 3 | Command palette, search, shareable views | Add / Enhance | Medium | High | Speed |
| 4 | Weekly review, trends, export | Add | Medium | High | Hindsight |
| 5 | Dead-code removal & file splits | Simplify | Medium | High (long-term) | Maintainability |

## Suggested order of execution

1. **Recommendation 1 first** — trust is the foundation; the docs explicitly warn that a better cockpit on an unreliable base "will amplify distrust."
2. **Recommendation 2 next** — notifications build naturally on the fixed follow-up model.
3. **Recommendation 5 in parallel** — dead-code removal is low-risk and can be interleaved; do the file splits before adding major new behavior to those areas.
4. **Recommendations 3 and 4** — once the foundation is trusted and reachable, add speed and hindsight.

## Notable ideas considered but not in the top 5

- **Calendar/Slack/email integrations** — valuable, but the product docs explicitly list "not a calendar, not chat" as anti-goals; a lightweight calendar *import* for meetings could be revisited after Recommendation 1.
- **Jira webhooks instead of polling** — nice efficiency win, but the current 5-minute poll is not a user-facing pain point.
- **SSO / password reset** — real friction, but affects setup more than daily use.
- **Two-way Jira status transitions** — useful for triage, but riskier and less central to the manager-workspace vision.
