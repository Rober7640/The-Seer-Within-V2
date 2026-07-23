---
name: handoff
description: Use when a conversation is getting long or context-bloated and you want to continue the current work in a fresh chat or session without losing state. Triggers on "/handoff", "write me a handoff", "start this in a new chat", "hand this off", "we're running out of context", "hitting the context limit", "continue this later", or wrapping a long working session that resumes later.
---

# Handoff

## Overview

A handoff is a **resume pointer, not a transcript.** Goal: the *minimum* a fresh agent needs to continue THIS work at full fidelity. The failure mode is pasting conversation history — that bloats the new chat on turn one, defeating the purpose. **Point, don't paste:** lean on durable state (files, memory, git, artifacts); reproduce only what those don't already hold.

## When to use

- Context is long / bloated and you want a clean session
- Ending a work session that resumes later, or handing to another agent/person

Not for: quick one-off questions, or work with no continuation.

## The recipe (this is the skill)

Write the handoff as ONE copy-pasteable fenced block with these sections **in order** (drop any that are empty):

| Section | Contents |
|---|---|
| **Goal** | 1–2 lines: what we're doing and why. |
| **Read first** | The few files/notes/PRs/artifacts the next session opens, **ordered by what the NEXT ACTION needs first**. Cite the specific anchor — a section/heading for prose or docs, `file:line` for code (line numbers drift as text is edited) — not just the path. Flag anything large (e.g. "big file — open only at step N") so the reader loads it lazily, never all up front. |
| **State** | Done · in progress · **NEXT ACTION** (lead the next concrete step). |
| **Locked decisions** | The non-obvious calls already made, so they aren't relitigated. |
| **Open threads** | Unresolved questions still to decide. |
| **Guardrails** | Traps, must-nots, constraints not obvious from the files themselves (applies to any project — code, content, research). |

Then: **end on the NEXT ACTION** so the fresh session starts doing, not re-reading.

## Delivering the handoff

The copy-pasteable block in THIS chat **is** the deliverable. **Close by telling the user to copy the block and paste it into a fresh chat/window to continue** — nothing more.

By default, don't save the handoff to a file (`HANDOFF.md` or similar) — the in-chat block is the deliverable, and tacking on a "want me to save this too?" is usually just noise. If the user asks for it on disk, of course write it. Otherwise, just point them to the block and the paste.

## Keep the next session lean

The whole point is that pasting the handoff into a fresh chat costs almost nothing on turn 1. Two things blow that budget: a bloated block, and a reader that opens every referenced file at once.

- **Length: the block fits on roughly one screen.** If a section runs past a few lines, that's the signal to point to a file/memory instead of inlining it. A handoff that's itself long defeats its purpose.
- **The reader opens files lazily.** The NEXT ACTION says what to open first; everything else in "Read first" waits until a step needs it. Never instruct the reader to read a large file wholesale up front — cite the section or `file:line`. (Opening a 400 KB artifact on turn 1 IS the context climb this skill exists to prevent.)
- **Capture durable, non-obvious facts to memory** (decisions, constraints, state) — or *offer to*, if you're unsure they belong to this project, or if your setup has no persistent memory. Memory keeps the block short and survives even if the pasted prompt is lost.
- **Reference, don't reproduce.** "See `src/reports/exportCsv.ts:42`" beats pasting the file.

## Examples

The same recipe works whether the work is code, content, or research — point to whatever durable state that project keeps (source files, drafts, a research matrix, notes).

**A code project:**

```
# Handoff — Aurora: Reports CSV Export

## Goal
Add a CSV export to the reports page. Reports can be 500k+ rows, so it must scale.

## Read first
- src/reports/exportCsv.ts        — the streaming export (core of this work)
- src/reports/ReportsPage.tsx      — Export button wired here
- src/reports/useReportsFilters.ts — active filter state (NOT yet applied to export)

## State
- Done: streaming export; button wired; timezone bug fixed (formatInTimeZone).
- NEXT: make the export respect active filters — read useReportsFilters.ts, filter per-row in the stream.
- Then: add exportCsv.test.ts (CI fails without it).

## Locked decisions
- Streaming, NOT in-memory — the in-memory version OOM'd at 500k rows.
- Dates use the user's timezone (formatInTimeZone), not UTC.

## Open threads
- Include hidden columns or visible-only? User leaned visible-only, unconfirmed.

## Guardrails
- Every new file needs a matching .test.ts or CI fails.
- Keep it streaming — never collect rows into an array.
```

**A non-code project (research memo):**

```
# Handoff — Q3 Competitor Pricing Research

## Goal
Compare 6 competitors' pricing tiers to recommend our Q3 price change. Draft memo due Friday.

## Read first
- research/pricing-matrix.md      — the 6-competitor grid (4 of 6 rows filled; Vendor E & F empty)
- research/sources.md             — source links + who was contacted; NDA note on Vendor C
- notes/interview-vendorA.md      — the one completed customer interview

## State
- Done: 4/6 competitors captured; matrix columns agreed (tier, price, seat minimum, annual discount).
- NEXT: fill the Vendor E & F rows — their pricing is public on their sites (links in sources.md).
- Then: write the recommendation memo from the completed matrix.

## Locked decisions
- Compare on effective per-seat ANNUAL price, not list monthly — list prices hide the annual discount.
- Exclude enterprise "call us" tiers — not comparable, and outside our segment.

## Open threads
- Include Vendor C at all? Their pricing came up under NDA in the interview — cite their public page only, or drop them.

## Guardrails
- Never quote Vendor C's NDA'd numbers; public-site figures only.
- Every price needs a dated source link in sources.md, or it doesn't go in the matrix.
```

## Common mistakes

- **Pasting conversation history** → the new chat is bloated on turn 1. Point to files/memory.
- **No NEXT ACTION** → the fresh agent wastes turns re-deriving where to start.
- **Losing the *why*** → record the rationale behind decisions (the OOM reason), not just the decision, or they get relitigated.

## Quick check before you finish

Would a competent agent, given ONLY this handoff plus the files it points to (no chat history), resume correctly and know the very next step? If not, that gap is what's missing.
