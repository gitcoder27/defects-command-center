# Frontend Requirement Handoff

## Triage Notes Redesign

**Date:** March 17, 2026  
**Audience:** Frontend implementation / design owner  
**Related files:** `client/src/components/triage/TriagePanel.tsx`, `client/src/components/triage/TriageNotesEditor.tsx`, `client/src/components/triage/TriageNotesTextArea.tsx`, `client/src/components/triage/triage-notes.ts`

---

## 1. Purpose

This document defines the redesign requirement for the **Notes** area inside the defect triage panel on the manager defects dashboard.

The current behavior is functionally correct, but the UI/UX is not acceptable for real usage over multiple days.

Your job is to redesign this note experience so it remains compact, readable, fast to use, and sustainable when the same defect is worked across many days.

You own the design decision. Do not treat the current UI as something to preserve visually.

---

## 2. Problem Summary

Today, each dated note entry renders as its own large note block.

That means:

- the notes area becomes visually heavy very quickly
- every additional day adds another full-sized block
- a defect that stays open for many days creates excessive vertical growth
- the user has to scroll too much inside the triage panel
- the note history feels fragmented instead of continuous
- the most important task, writing today’s note, competes with a pile of oversized historical blocks

This is not the intended experience.

---

## 3. Current Functional Behavior

The existing implementation already does the following correctly:

- the triage panel opens from the right side when a defect row is selected
- notes are stored in the issue `analysisNotes` field as a single string
- dated sections are parsed from headings like `Mar 17, 2026:`
- the UI automatically recognizes the local current date
- if today does not already have an entry, the UI creates a new empty section for today
- when the local date changes, a new date section is created for the new day
- historical dated notes remain visible and editable
- notes autosave after edit
- legacy plain-text notes without dated headings are still supported

These behaviors must continue to work after the redesign unless there is a very strong reason to improve them without breaking existing data.

---

## 4. Current Relevant Implementation

You should inspect these files before making changes:

- `client/src/components/triage/TriagePanel.tsx`
- `client/src/components/triage/TriageNotesEditor.tsx`
- `client/src/components/triage/TriageNotesTextArea.tsx`
- `client/src/components/triage/triage-notes.ts`
- `client/src/test/TriageNotesEditor.test.tsx`
- `client/src/test/TriagePanel.test.tsx`

Current note behavior summary:

- `TriagePanel` renders the notes area near the top of the triage panel
- `TriageNotesEditor` parses the stored string into `legacyBody` plus dated sections
- each dated section currently renders as a separate `TriageNotesTextArea`
- today’s section gets a stronger visual treatment and a `Today` badge
- non-today dated sections get an `Entry` badge
- new date sections are added automatically based on local date rollover
- serialization writes the notes back into one string with date headings

---

## 5. Product Intent

The intended experience is closer to a **single note workspace with built-in daily chronology**, not a stack of equally heavy note cards.

The user should feel like they are working in one continuous note surface for the defect, while still being able to clearly distinguish what was written on each day.

The notes area must scale well if the same defect accumulates notes across 5 to 10 days or more.

---

## 6. Directional UX Requirement

The user’s preferred direction is:

- one primary expandable note area rather than multiple big note blocks
- dates inserted automatically inside that note experience
- each day visually separated in a lightweight way, such as a divider, header row, timestamp marker, separator line, or another compact pattern
- historical notes should remain available, but should not dominate the panel

This is a directional requirement, not a rigid layout prescription.

If you believe a better UX exists, you should use it.

Your redesign may be different from the user’s initial idea as long as it clearly solves the density, readability, and long-history usability problem better than the current implementation.

---

## 7. What Must Improve

The redesign must materially improve all of the following:

- vertical compactness
- readability across many days of notes
- clarity of where today’s note belongs
- scannability of older notes
- ease of continuing the same defect on a new day
- reduced visual repetition
- reduced need for excessive scrolling
- overall polish inside the existing triage panel

---

## 8. Non-Negotiable Functional Requirements

Preserve these behaviors:

1. The notes remain part of the triage panel for a selected defect.
2. The stored backend field remains compatible with the existing `analysisNotes` string format unless you have a compelling migration-safe reason not to.
3. Existing notes with headings like `Mar 17, 2026:` must continue to render correctly.
4. Legacy plain-text notes must continue to be handled safely.
5. The current local date must still be recognized automatically.
6. A new current-day note area must appear automatically when the date changes and today has no entry yet.
7. Historical notes must remain visible or easily accessible without losing data.
8. Editing must remain straightforward.
9. Autosave behavior must remain reliable.
10. The component must continue to fit naturally within the existing triage panel flow.

---

## 9. Design Freedom

You are explicitly allowed to choose the final interaction model.

Possible patterns include, but are not limited to:

- a single rich textarea-like surface with inline dated dividers
- a composer for today plus a compressed history stream
- one active editing area and collapsed read-only historical day sections
- a timeline-style note stream
- a split between “today” and “history” with history compact by default
- progressive disclosure for older days

These are examples only. You are not required to use any of them.

Choose the pattern that gives the best real UX in this product.

---

## 10. Quality Bar

The final result should feel:

- deliberate
- compact
- high-signal
- easy to scan
- calm rather than noisy
- appropriate for repeated daily use by a manager in an operational dashboard

Avoid:

- repeated bulky cards
- duplicated chrome around each dated entry
- excessive padding
- heavy visual nesting
- designs that look clever but are slower to use

---

## 11. Integration Context

This redesign lives inside the existing triage panel, which currently contains:

- issue header
- issue title
- notes
- tags
- team tracker section
- manager desk section
- properties
- suggestions
- description
- comment form

The notes area is near the top and acts as a primary triage workspace.

That means the notes redesign should:

- deserve that prominent placement
- remain immediately useful on open
- not push the rest of the triage panel too far down
- work well in the fixed-width right-side panel layout

---

## 12. Technical Guardrails

Follow repository conventions:

- keep TypeScript strict
- prefer existing patterns already used in `client/`
- do not move data-fetching logic into random UI components
- preserve the current dashboard and triage architecture unless needed for the redesign
- use the existing `@/` imports
- avoid introducing unnecessary complexity
- do not create oversized components; split UI and logic when needed

If the best redesign requires refactoring the notes area into smaller subcomponents, do that.

---

## 13. Suggested Implementation Scope

You may change:

- `client/src/components/triage/TriageNotesEditor.tsx`
- `client/src/components/triage/TriageNotesTextArea.tsx`
- styling in related triage components or shared CSS if needed
- tests covering note rendering and autosave behavior

You may introduce new small components if that leads to a cleaner implementation.

Avoid unrelated product changes outside this notes redesign.

---

## 14. Acceptance Criteria

The redesign is successful if all of the following are true:

1. A defect with notes across many days no longer creates a stack of large repetitive note blocks.
2. Today’s note is obvious and easy to continue writing.
3. Older dates remain understandable and accessible.
4. The note area is meaningfully more compact than the current design.
5. Automatic daily date handling still works.
6. Existing stored note content still renders correctly.
7. Autosave still works.
8. The UI feels better in the triage panel without making editing harder.
9. The result looks intentional and production-grade, not like a temporary compromise.

---

## 15. Required Validation

Before considering the work complete, validate at least these scenarios:

1. No prior notes.
2. Only legacy plain-text notes.
3. One dated note for today.
4. Several dated notes across multiple days.
5. A long-running defect with many daily entries.
6. Local date rollover creating a new daily entry.
7. Editing an older entry.
8. Editing today’s entry.
9. Autosave after typing.

Update or add frontend tests as needed to cover the redesigned behavior.

---

## 16. Deliverable

Deliver a complete frontend redesign of the triage notes experience that preserves the working behavior but substantially improves the UI/UX.

You are the design owner for this task. Make the final design choice based on what will work best in this application, not based on preserving the current structure.
