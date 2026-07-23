# evelyn-reframe skill — design

**Date:** 2026-07-23
**Status:** approved (brainstorm), pending implementation plan
**Owner:** operator + Claude

## Goal

Package the already-built **Evelyn "Reframe Deck"** daily-email program into a runnable
skill at `.claude/skills/evelyn-reframe/`, so that any future cycle of sends is produced
at the same quality bar without the drift that halved opens on the old program
(see memory `evelyn-email-audit`). The skill is the operator front-door to the deck; it
**orchestrates** existing assets and **reimplements nothing**.

**Non-goal:** new email design, letterhead decisions (parked), an A/B-test harness,
onboarding a *different* persona (that is `persona-email-kit`), or the Luna astrology
pipeline (that is `luna-daily`).

## Existing assets this skill drives (do not rebuild)

Knowledge base — `docs/aweber/evelyn-reframe-deck/`:
- `PLAYBOOK.md` — the brand bible (spine/reframe, audience, voice, substance, subject,
  formatting, guardrails, rotation, pre-send checklist). The craft authority.
- `hooks.md` — the hook library + 30-second hook check.
- `formats/NN-*.md` — the 7 full format specs (purpose · reframe mechanic · hook bank ·
  skeleton · subject bank · CTA · formatting · do/don't · gold ref · fill-in template).
- `emails/NN-*.md` — the 7 approved gold-standard emails (the quality bar + check fixtures).
- `STATE.md` — the rolling per-send tracker + rotation balance + no-repeat lists.

Pipeline — `docs/aweber/evelyn-reframe-deck/scripts/` (proven: scheduled cycle-1 live):
- `check.mjs <draft.md ...>` — mechanical pre-send gate (countable bars). Exit 1 on any fail.
- `render-aweber.mjs <sendsDir> [outDir]` — drafts (`NN-*.md` + `schedule.json`) →
  `_build/NN-<slug>.html`, `.txt`, `index.json` (canonical AWeber design). Warns subject >120 B.
- `aweber-ops.mjs list | cancel <ids> | schedule <buildDir>` — LIVE `theseerwithin_free`
  (6936953) operations, human-gated.
- `aweber-lib.mjs` — OAuth creds + `api()` with refresh-on-401 and `.env` backup/rotate.

Draft `.md` shape (what the writers must emit; matches the gold emails and `sends/cycle-1/`):
`# NN · Title` → frontmatter bullets (`Format`, `Type`, `Reframe`, `Cast`, `State`,
`Subject` in backticks with `{{ subscriber.first_name | capitalize }}`, `Preheader`,
`CTA … → campaign=<slug>`) → `---` → body containing the `> **↳ THE REFRAME.**` marker
(authoring tag, stripped at render).

## Invocation contract

- `/evelyn-reframe <start-date> <count>` — e.g. `2026-08-01 9`. Also triggers on
  "write/run the next reframe cycle", "generate N Evelyn reframe/daily emails",
  "build the next reframe batch."
- Missing args → ask (default `count` = the prior cycle's length; default `start-date` =
  the day after the last scheduled send in `STATE.md`).
- **Single email = `count` 1.** Cycle slug defaults to `cycle-<N>` (N from `STATE.md`).
- Distinct from `luna-daily` (Luna/astrology) and `persona-email-kit` (new-persona onboarding).

## Pipeline — 6 stages

1. **PLAN.** Read `STATE.md` (no-repeat lists + last cycle) + PLAYBOOK rotation rules →
   emit a **slate**: per slot `{send#, date, format, type, reframe-seed ("X→Y"),
   cast+gender, audience-state, slug}`, plus `sends/<cycle>/schedule.json` (`{"NN": ISO8601}`).
   Enforce every rotation rule: no format repeat within ~2 weeks; ~2 conversion beats/week
   (formats 01 & 05) not back-to-back; interactive beats (04 & 07) spaced ~2×/week;
   A/B/C/valve audience-state balance; **≥1 explicit male POV per cycle**; and nothing in
   STATE's no-repeat lists reused (reframe, hook, card [fmt 03], euphemism [fmt 05],
   maxim [fmt 06]). Present the slate table to the operator.
2. **WRITE.** Fan out **one writer subagent per slot** from a locked slot-brief. Each writer
   MUST read `PLAYBOOK.md` + its `formats/NN` + `hooks.md` + its gold `emails/NN`, then draft
   ~300–380 words of body in Evelyn's voice, in the exact gold `.md` shape, to
   `sends/<cycle>/NN-<slug>.md`. The deck docs are the sole craft authority (no generic copy
   skill, to avoid conflicting guidance).
3. **MECHANICAL CHECK.** `node check.mjs sends/<cycle>/*.md`. Countable bars: dear 2–4,
   exactly one reframe, ≤2 body em-dash, tagged CTA slug + bold "→" label, no underline,
   280–420 words. Any FAIL → fix that draft (targeted edit or re-brief its writer) → re-check.
   Gate: all PASS.
4. **JUDGMENT QA** (what a script cannot measure):
   - **Cross-draft dedup / coherence** — no repeated reframe or hook pattern across the cycle
     *and* vs STATE; cast does not drift to all-female.
   - **Per-draft judgment review** against the PLAYBOOK bars: reframe true + non-obvious
     (writable as a clean "you think X → it's actually Y"); hook alive (30-sec hook check);
     substance = mechanism + why-obvious-advice-fails (or the hidden cost) + a do-today
     practice, passing the strip-the-CTA test; voice / AI-tells (em-dashes, banned words,
     reads aloud); gender-neutral reader.
   - **Optional** `persona-email-qa` for the brand/compliance subset (no names/dates,
     tendencies-not-promises, correct tagged CTA, CAN-SPAM). Note: Evelyn has no ephemeris
     claims, so this is the non-astro subset only.
   - Any blocker → fix → re-run stages 3–4 for that draft.
5. **RENDER.** `node render-aweber.mjs sends/<cycle>` → `_build/`. Surface any subject
   >120-byte warning as a blocker (shorten the subject → re-render).
6. **HUMAN GATE → SCHEDULE.** Present a **review packet**: rendered HTML mockup (open the
   `_build/*.html`, or regenerate the deck artifact), the slate table, and a preview of the
   `STATE.md` diff. Then **STOP**. Only on an explicit in-turn "go":
   `node aweber-ops.mjs schedule sends/<cycle>/_build` → **log the cycle in `STATE.md`**
   (append the sends table rows + extend the no-repeat lists) → commit. Rollback path:
   `node aweber-ops.mjs cancel <ids>` reverts scheduled → draft (recoverable).

## The two-layer quality gate (the core bet)

Every email must clear **both** the mechanical gate (`check.mjs`, countables) and the
judgment gate (subagent review of the un-countable bars). Neither alone suffices: the
script can't see a dead hook or a false reframe; a human skims past a 5th "dear" or a
sneaky em-dash. This double gate is the insurance against the autopilot drift the audit
documented.

## Files & layout

- **Scripts stay in place** at `docs/aweber/evelyn-reframe-deck/scripts/` — they use relative
  paths to `../sends`, `../emails`, `../PLAYBOOK.md`; relocating breaks that, and referencing
  in place mirrors how `luna-daily` calls `scripts/` in situ. One cleanup: retire the
  "throwaway prototype / scratchpad" self-labels in the script headers — they are now the
  skill's proven engine.
- **Skill dir** holds just `SKILL.md` (the orchestration + the stage commands + the gates),
  pointing at the deck folder as its knowledge base. No copied rules, no duplicated pipeline.

## Validation (how we test it — no live send)

The skill is validated by a **dry run of a real "cycle 2"**, stopping before schedule:

1. **Regression fixtures (already green):** the 7 gold `emails/*.md` PASS `check.mjs`
   (`node check.mjs ../emails/*.md`), and the 9 `sends/cycle-1/*.md` PASS. The mechanical gate
   must keep passing these.
2. **Acceptance dry-run:** invoke `/evelyn-reframe <next-start> <count>` (start = day after the
   last cycle-1 send, count matching real cadence). Run stages 1–5 and **stop at the human
   gate — never call `aweber-ops schedule`.** Success criteria:
   - PLAN honored the rotation: no format/reframe/hook/card/euphemism/maxim repeated vs STATE,
     ≥1 male POV, balanced A/B/C/valve states, conversion beats not stacked.
   - Every draft PASSes `check.mjs`; JUDGMENT QA reports no blockers.
   - `render-aweber.mjs` produces clean `_build/` HTML that renders correctly in the mockup
     and matches the canonical design; no subject >120 B.
   - The output is **indistinguishable in quality from the gold deck** — real reframes, live
     hooks, Evelyn's voice, gender-neutral reader.
3. **Live path is exercised only when the operator gives an explicit "go"** on a cycle they
   actually intend to send; the dry run never touches the live list.

## Safety

- LIVE list: the only irreversible-ish action (`aweber-ops schedule`) fires **only** after an
  explicit in-turn human "go"; the skill defaults to stopping at the review packet.
- `STATE.md` is committed **only after** a successful schedule, so a plan that is never sent
  leaves no phantom rows.
- Rollback documented: `aweber-ops cancel <ids>` → back to draft.

## Open items (tracked, not blocking)

- Letterhead treatment A/B/C still parked (default A); not a gate on the skill.
- Reframe-deck-vs-literary-tarot A/B test is a separate future effort.
