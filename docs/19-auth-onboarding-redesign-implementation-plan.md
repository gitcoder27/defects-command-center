# Auth and Onboarding Redesign Implementation Plan

## Manager and Developer Flow Reset

**Date:** March 8, 2026  
**Audience:** Full-stack implementation handoff for a future AI agent  
**Status:** Approved direction, not yet implemented  
**Related docs:** `docs/12-developer-workspace-requirements.md`, `docs/13-developer-workspace-frontend-handoff.md`, `docs/14-developer-workspace-backend-implementation.md`, `docs/15-manager-desk-requirements.md`, `docs/16-manager-desk-frontend-handoff.md`, `docs/17-manager-desk-backend-requirements.md`

---

## 1. Purpose

This document defines the planned redesign of authentication, onboarding, role-based entry flows, and Jira setup.

It exists so a new AI agent can pick up implementation work in a fresh session without needing to reconstruct the product decisions from scratch.

This redesign is not a cosmetic tweak. It changes the mental model of the app:

- the manager experience becomes the primary application surface
- the developer experience becomes a separate, focused `My Day` surface
- self-service signup is removed from the developer login flow
- manager identity is separated from Jira identity
- Jira connection is separated from manager account creation

---

## 2. Product Decision Summary

### 2.1 Core Model

The app should operate as two distinct surfaces sharing one auth/session system:

- **Manager surface** at `/`
  - dashboard
  - team tracker
  - manager desk
  - settings
  - Jira configuration
  - user management

- **Developer surface** at `/my-day`
  - personal daily workspace only

### 2.2 Account Model

There are three separate concepts. They must not be conflated:

1. **App manager account**
   - used to log into the app
   - can administer settings, Jira sync, team roster, and developer access
   - does not require any Jira identity

2. **Jira connection account**
   - the Jira email/token used by the backend to sync and update Jira
   - may be the manager's Jira account
   - may be a shared service account
   - is not the same thing as the app manager account

3. **Optional manager Jira identity**
   - used only if the manager also exists in Jira and wants their own assigned issues included in sync scope
   - must be optional

### 2.3 Manager as Jira User

A manager being a Jira user is optional.

The system must work when:

- the manager has no Jira user
- the Jira sync account is a service account
- only developers are tracked as Jira assignees

If the manager does have a Jira identity, the system may include it in issue sync scope, but that should be an explicit option, not a requirement.

---

## 3. Current Repo Findings

These observations were confirmed from the current codebase and are the reason this redesign is needed.

### 3.1 `My Day` currently acts as both developer workspace and public login entry

Relevant files:

- `client/src/App.tsx`
- `client/src/components/my-day/LoginPage.tsx`
- `client/src/components/my-day/ManagerMyDayLanding.tsx`

Current behavior:

- unauthenticated users hitting `/my-day` get the login page
- the login page also exposes signup UI
- managers can sign in through the same `My Day` screen
- managers are then redirected away from `My Day`

This creates a broken mental model because the developer workspace is also acting as the most visible auth entry point.

### 3.2 Signup exists in the wrong place

Relevant file:

- `client/src/components/my-day/LoginPage.tsx`

Problems:

- developers should not self-register
- the signup UI currently allows choosing `developer` or `manager`
- the product direction is manager-created accounts, not self-service account creation

### 3.3 Manager-created users already exist in Settings

Relevant file:

- `client/src/components/settings/SettingsPanel.tsx`

This is the correct long-term model:

- manager creates developer access accounts
- manager shares `/my-day` login link
- developer signs in only to their own workspace

### 3.4 Manager identity is mixed with Jira lead identity

Relevant file:

- `server/src/routes/config.ts`

Current behavior:

- setup/config treats `jiraLeadAccountId` as effectively required for a configured system
- Jira setup derives the lead account from Jira `/myself` when absent

This is too rigid for the desired product model because the manager may not be a Jira user.

### 3.5 Role enforcement is partial

Relevant files:

- `server/src/middleware/auth.ts`
- `server/src/app.ts`
- `server/src/routes/config.ts`
- `server/src/routes/team.ts`

Current state:

- `My Day` is properly developer-gated
- `Manager Desk` is properly manager-gated
- several manager-facing API surfaces still appear mounted without consistent auth protection

Specific current observation from repo review:

- in `server/src/app.ts`, multiple manager-facing route groups are mounted directly, including issues, overview, team, alerts, suggestions, sync, config, backups, tags, and team-tracker
- `server/src/routes/config.ts` currently exposes config endpoints without route-level `requireManager` wrapping at router creation
- `server/src/routes/team.ts` currently exposes team discovery and team roster mutation endpoints without route-level `requireManager` wrapping at router creation

This does not prove every route is exploitable in practice, but it is a strong enough signal that the implementation must begin with an explicit authorization audit and lock-down pass.

This must be fixed as part of the redesign.

---

## 4. Target User Flows

## 4.1 Day-Zero Flow

Fresh install with zero app users:

1. Show first-run bootstrap flow.
2. Create the first manager account.
3. Sign the manager into the app automatically.
4. Connect Jira using any valid Jira account with sufficient permissions.
5. Ask whether the manager also wants to include their own Jira assignments in the workspace.
6. If yes, allow selecting an optional manager Jira identity.
7. Select tracked developers from Jira.
8. Optionally create developer access accounts now.
9. Finish setup and land the manager in the manager surface.

### 4.1.1 Important Rule

Manager account creation must happen **before** Jira mapping.

Reason:

- app identity and Jira identity are separate concerns
- the app must work even if the manager has no Jira user

## 4.2 Ongoing Manager Flow

Manager visits `/`:

- if authenticated as manager, show manager surface
- if unauthenticated, show manager login
- if authenticated as developer, redirect to `/my-day`

Manager can later:

- edit Jira connection
- change sync scope
- manage tracked team members
- create developer access accounts
- optionally map or unmap their Jira identity

## 4.3 Ongoing Developer Flow

Developer visits `/my-day`:

- if authenticated as developer, show `My Day`
- if unauthenticated, show developer login only
- if authenticated as manager, redirect to `/`

Developers should never see:

- signup
- Jira configuration
- dashboard
- team tracker
- manager desk
- settings

---

## 5. UX and Routing Rules

## 5.1 Route Model

Recommended route behavior:

- `/` -> manager surface
- `/my-day` -> developer surface
- `/manager-desk` -> manager-only
- `/team-tracker` -> manager-only

No new routing library is required for this work unless implementation complexity forces it. The current lightweight path-to-view approach can be kept if it remains maintainable.

## 5.2 Login Screen Separation

Create two role-aware entry experiences:

- **manager login** for `/`
- **developer login** for `/my-day`

They may share form internals and auth API, but the UX copy and permitted outcomes should differ.

### Manager login copy should communicate:

- this is the manager/admin workspace
- use this login to access dashboard, team tracker, manager desk, and settings

### Developer login copy should communicate:

- this is the developer workspace
- use this login only for `My Day`
- contact your manager if you do not have an account

## 5.3 Remove Signup from `My Day`

The current signup UI in `client/src/components/my-day/LoginPage.tsx` should be removed.

Replace it with:

- login form only
- helpful explanatory copy
- possibly a note such as "Accounts are created by your manager"

## 5.4 Remove Manager Bounce Experience

The current `ManagerMyDayLanding` redirect screen should become unnecessary.

Preferred behavior:

- manager never lands inside `My Day`
- manager hitting `/my-day` gets an immediate redirect to `/`

---

## 6. Domain and Data Model Changes

## 6.1 Keep App User Roles as They Are

Current role model is sound:

- `manager`
- `developer`

Developer users should continue requiring `developerAccountId`.

Manager users should continue **not** requiring `developerAccountId`.

## 6.2 Add Optional Manager Jira Mapping

Introduce a new optional config concept, for example:

- `manager_jira_account_id`

This should represent the Jira identity of the manager only when they choose to include their own assignments in sync scope.

This must not be required for configuration completeness.

## 6.3 Decouple Jira Connection from Manager Jira Mapping

Jira configuration should succeed with:

- Jira base URL
- Jira email
- Jira API token
- Jira project key

Optional fields may include:

- manager Jira account ID
- Jira sync JQL
- custom field mappings

## 6.4 Separate Sync Scope from Team Roster

These are different concepts and should be modeled separately.

### Sync scope

Defines which Jira assignees' issues are included in the dashboard sync.

Should be composed from:

- tracked developers
- optional manager Jira identity, if enabled

### Team roster

Defines which developers:

- appear in Team Tracker
- can receive `My Day` developer accounts
- are treated as tracked team members in manager workflows

The manager Jira identity should not automatically become part of the tracked developer roster.

---

## 7. Day-Zero Bootstrap Requirements

The current `SetupWizard` should be redesigned into a staged bootstrap flow.

Recommended steps:

1. **Create Manager Account**
   - username
   - display name
   - password

2. **Connect Jira**
   - Jira URL
   - Jira email
   - Jira API token
   - Jira project key
   - test connection

3. **Optional Manager Jira Mapping**
   - question: "Include your own Jira assignments in this workspace?"
   - if yes, select Jira user identity
   - if no, continue without manager Jira mapping

4. **Select Tracked Developers**
   - discover Jira users
   - choose tracked team members

5. **Optional Developer Access Setup**
   - create developer app accounts now, or skip for later

6. **Finish**
   - land the manager in the app

### 7.1 Bootstrap Access Rule

Open registration should remain allowed only while there are zero app users.

Once the first manager exists:

- public bootstrap manager creation disappears
- later user creation becomes manager-only

The current backend behavior in `/api/auth/register` already partially follows this rule and should be retained, but the UI must be reworked around it.

---

## 8. Settings Redesign Requirements

The Settings panel should be reorganized around four clear sections.

## 8.1 Jira Connection

Contains:

- Jira base URL
- Jira email
- Jira API token
- Jira project key
- test connection

## 8.2 Sync Scope

Contains:

- base JQL
- optional manager Jira identity toggle/select
- explanation of who is included in sync
- custom field mappings

## 8.3 Team Members

Contains:

- tracked developer roster
- discover Jira users
- add/remove tracked developers

## 8.4 Developer Access

Contains:

- developer login link (`/my-day`)
- existing app users
- create developer accounts
- optionally create additional manager accounts later if desired

The existing Settings user-management work can be reused and refined rather than replaced.

---

## 9. Security and Authorization Requirements

## 9.1 Manager-Only Backend Surfaces

Manager-facing routes must require manager auth consistently.

This likely includes at minimum:

- config routes
- sync routes
- team roster management
- team tracker
- issue management routes used by manager UI
- backups
- tags if they are manager-owned
- alerts and suggestions if they should not be visible to developers

An implementation agent must review each route explicitly rather than assume current behavior is safe.

## 9.2 Developer-Only Backend Surfaces

Developer-only routes must remain developer-scoped:

- `My Day` APIs

Developers must not be able to:

- read manager-only notes
- access team-wide views
- access Jira/config/admin routes

## 9.3 Frontend Route Guards

Frontend should mirror backend rules:

- manager cannot meaningfully enter `My Day`
- developer cannot access manager surface
- unauthenticated users see the correct role-specific login screen

---

## 10. Proposed Backend Work

## 10.1 Auth and Registration

- retain session-based auth model
- keep `POST /api/auth/login`
- keep `GET /api/auth/me`
- keep `POST /api/auth/logout`
- retain `POST /api/auth/register` bootstrap rule:
  - open when zero users exist
  - manager-only otherwise

### Required changes

- ensure only bootstrap manager creation is public
- ensure post-bootstrap developer creation remains manager-only
- consider whether manager creation after bootstrap should also remain manager-only

## 10.2 Config Contract Changes

Update config completeness rules so the app is considered configured without a mandatory manager Jira identity.

Likely changes:

- stop treating `jiraLeadAccountId` as required for configuration completeness
- stop auto-deriving lead identity from Jira `/myself` as a setup prerequisite
- add optional manager Jira identity storage

## 10.3 Sync Scope Logic

Refactor Jira sync scope composition so it is derived from:

- tracked developers
- optional manager Jira identity

Do not hardcode the assumption that a manager lead account must always exist.

## 10.4 Route Protection Pass

Audit all routes mounted in `server/src/app.ts` and apply `requireManager`, `requireAuth`, or `requireDeveloper` as appropriate.

This should be treated as a distinct work item with tests.

---

## 11. Proposed Frontend Work

## 11.1 App Shell and Routing

Update the app entry logic so:

- `/` is the manager starting point
- `/my-day` is the developer starting point
- developers logging in on `/` are redirected to `/my-day`
- managers hitting `/my-day` are redirected to `/`

## 11.2 Login Screens

Split the current shared login/signup screen into:

- manager login screen
- developer login screen

These may reuse a shared credential form component but must not share the current ambiguous messaging.

## 11.3 Remove Public Signup UI

Delete the signup tab and signup form from the current `My Day` login experience.

Bootstrap manager creation should move into first-run onboarding only.

## 11.4 Setup Wizard Rewrite

Replace the current `SetupWizard` flow with the day-zero bootstrap flow described earlier.

The implementation may:

- extend the existing wizard
- or replace it with a new bootstrap component

Either is acceptable as long as the resulting flow matches the approved product direction.

## 11.5 Settings Information Architecture

Reorganize settings so the manager can clearly understand:

- Jira connection
- sync scope
- tracked team members
- developer access accounts

The current panel already contains useful building blocks and should not be discarded unnecessarily.

---

## 12. Proposed File Touch List

This list is a starting point, not a complete guarantee.

### Frontend likely files

- `client/src/App.tsx`
- `client/src/context/AuthContext.tsx`
- `client/src/components/my-day/LoginPage.tsx`
- `client/src/components/my-day/ManagerMyDayLanding.tsx`
- `client/src/components/setup/SetupWizard.tsx`
- `client/src/components/settings/SettingsPanel.tsx`
- `client/src/components/layout/Header.tsx`
- `client/src/test/App.test.tsx`
- `client/src/test/Header.test.tsx`
- `client/src/test/SettingsPanel.test.tsx`
- add new auth/bootstrap tests as needed

### Backend likely files

- `server/src/app.ts`
- `server/src/routes/auth.ts`
- `server/src/routes/config.ts`
- `server/src/routes/team.ts`
- `server/src/routes/issues.ts`
- `server/src/routes/overview.ts`
- `server/src/routes/sync.ts`
- `server/src/routes/backups.ts`
- `server/src/routes/tags.ts`
- `server/src/routes/alerts.ts`
- `server/src/routes/suggestions.ts`
- `server/src/services/settings.service.ts`
- `server/src/jira/jql.ts`
- `shared/types.ts`
- backend auth/config/sync tests

---

## 13. Implementation Sequence

Recommended order of execution:

1. Lock down backend authorization.
2. Refactor config completeness and optional manager Jira mapping.
3. Refactor sync scope composition.
4. Rework app entry routing and redirects.
5. Remove signup from `My Day`.
6. Implement day-zero bootstrap flow.
7. Reorganize settings.
8. Add or update tests.
9. Run end-to-end validation of bootstrap, manager login, developer login, and route guards.

Reason for this order:

- backend permissions are the highest-risk issue
- config and sync semantics should be corrected before polishing onboarding UI
- frontend flow changes will otherwise be built on unstable backend assumptions

---

## 14. Acceptance Criteria

This redesign is complete when all of the following are true:

- a fresh install with zero users starts with manager account creation
- the first manager account can be created without any Jira identity mapping
- Jira can be connected using a service account or any valid Jira account
- including the manager's own Jira assignments is optional
- developers cannot self-register from `My Day`
- manager-created developer accounts work from `/my-day`
- managers log in through the manager surface, not `My Day`
- developers are redirected away from manager-only pages
- managers are redirected away from `My Day`
- manager-only backend routes reject non-manager access
- developer routes reject manager access where appropriate
- settings clearly expose Jira connection, sync scope, team members, and developer access

---

## 15. Risks and Watchouts

## 15.1 `jiraLeadAccountId` Legacy Assumptions

There may be downstream services or tests that assume:

- a lead account always exists
- sync scope always includes a lead account

These assumptions must be found and removed carefully.

## 15.2 Current Setup Coupling

The current `SetupWizard` directly saves config and discovers users in a tight sequence.

The new bootstrap flow introduces:

- auth creation
- login state transition
- optional Jira mapping
- optional developer account creation

State management will need a cleaner step model.

## 15.3 Existing Docs Are Older Than Current Auth Work

Some earlier docs in this repo describe a pre-auth world.

An implementation agent should treat this document as the current source of truth for the auth/onboarding redesign.

## 15.4 Public Route Exposure

Do not assume frontend redirects are sufficient.

Backend authorization must be enforced independently.

---

## 16. Progress Checklist

Update this section during implementation. Keep completed items checked and add brief notes if scope changes.

### 16.1 Discovery and Planning

- [x] Confirm exact route-by-route authorization matrix for all backend endpoints
- [x] Confirm final config field naming for optional manager Jira identity
  Note: frontend/backend contract now uses `managerJiraAccountId`; persisted config key is `manager_jira_account_id` with fallback from legacy `jira_lead_account_id`.
- [x] Confirm whether additional manager accounts are supported post-bootstrap
  Note: post-bootstrap `POST /api/auth/register` remains manager-only and still supports `role: "manager"`.

### 16.2 Backend Authorization

- [x] Audit all routes mounted in `server/src/app.ts`
- [x] Protect manager-only routes with `requireManager`
- [x] Keep developer-only routes protected with `requireDeveloper`
- [x] Add or update backend tests for unauthorized access

### 16.3 Backend Config and Sync

- [x] Remove hard requirement that configuration must include manager Jira identity
- [x] Add optional manager Jira identity storage
- [x] Refactor sync scope composition around tracked developers plus optional manager Jira identity
- [x] Update config-related tests
- [x] Update sync-related tests

### 16.4 Bootstrap and Auth UX

- [x] Redesign first-run onboarding to start with manager account creation
- [x] Auto-login manager after bootstrap account creation
- [x] Add Jira connection step
- [x] Add optional manager Jira mapping step
- [x] Add tracked developer selection step
- [x] Add optional developer account creation step

### 16.5 Frontend Route and Login Flow

- [x] Make `/` the manager-first entry surface
- [x] Make `/my-day` the developer-only surface
- [x] Redirect authenticated developers from `/` to `/my-day`
- [x] Redirect authenticated managers from `/my-day` to `/`
- [x] Replace shared login/signup UI with role-appropriate login experiences
- [x] Remove self-service signup from developer login

### 16.6 Settings Redesign

- [x] Reorganize settings into Jira Connection, Sync Scope, Team Members, and Developer Access
- [x] Preserve or improve existing developer account creation tools
- [x] Preserve developer login link copy/share action
- [x] Add manager Jira identity control to settings

### 16.7 Validation and QA

- [ ] Test fresh install bootstrap flow
- [ ] Test manager flow without any Jira identity mapping
- [ ] Test manager flow with optional Jira identity mapping enabled
- [x] Test developer login from `/my-day`
- [x] Test manager login from `/`
- [x] Test role redirects
- [x] Test unauthorized backend access cases
- [x] Run backend test suite
- [x] Run frontend test suite

### 16.8 Documentation

- [x] Update this document with implementation notes as work progresses
- [ ] Update any related docs that become stale after the redesign lands

---

## 17. Suggested Handoff Prompt for a Future Agent

Use this document as the primary source of truth for the auth/onboarding redesign.

Recommended prompt:

> Implement the approved auth and onboarding redesign described in `docs/19-auth-onboarding-redesign-implementation-plan.md`. Start by auditing and hardening backend route authorization, then update config/sync semantics so manager Jira identity is optional, then rework frontend routing, login, bootstrap onboarding, and settings. Update the progress checklist in the doc as you complete items.
