# evelyn-reframe Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package Evelyn Cross's already-built "reframe deck" daily-email program into a runnable skill at `.claude/skills/evelyn-reframe/` that plans a rotation, writes send-ready emails, gates them, renders to AWeber HTML, and schedules live only after an explicit human "go".

**Architecture:** A single orchestration `SKILL.md` (sibling to `luna-daily`) that drives the *existing* deck — the written standards and the proven pipeline scripts already in `docs/aweber/evelyn-reframe-deck/`. It reimplements no writing rules and no pipeline code; it wires plan → write (parallel subagents) → mechanical check → judgment QA → render → human-gated live schedule → STATE log.

**Tech Stack:** Markdown skill file; Node ≥18 pipeline scripts (`check.mjs`, `render-aweber.mjs`, `aweber-ops.mjs`) run from the deck's `scripts/` dir; AWeber broadcast API; the `persona-email-qa` agent (optional brand/compliance pass).

## Global Constraints

- **Deck root:** `docs/aweber/evelyn-reframe-deck/` — knowledge base (`PLAYBOOK.md`, `hooks.md`, `formats/NN-*.md`, `emails/NN-*.md`, `STATE.md`) + `scripts/`.
- **Scripts stay in place** and are run from `docs/aweber/evelyn-reframe-deck/scripts/` (they use relative paths `../sends`, `../emails`, `../PLAYBOOK.md`; Node ≥18, need `.env`). The skill dir holds **only `SKILL.md`**.
- **Live list:** `theseerwithin_free` (`6936953`); one send/day at `10:30 UTC` (= 6:30pm SGT). `aweber-ops.mjs schedule` is the only irreversible action.
- **Draft `.md` shape:** `# NN · <title>` → frontmatter bullets (`Format`, `Type`, `Reframe`, `Cast`, `State`, `Subject` in backticks using `{{ subscriber.first_name | capitalize }}`, `Preheader`, `CTA … → campaign=<slug>`) → `---` → body containing the `> **↳ THE REFRAME.**` marker (stripped at render).
- **Mechanical bars** (`check.mjs`): `dear` 2–4, exactly one reframe marker, ≤2 body em-dash, tagged CTA slug + bold `**→` label, no underline, body 280–420 words.
- **Subject ≤120 bytes** including the `{{ … }}` tag (tag ≈40 B → keep the rest ≤~80 B).
- **Schedule only after an explicit in-turn human "go";** commit `STATE.md` only *after* a successful schedule; rollback = `aweber-ops.mjs cancel <ids>` → draft.
- **Voice/design are fixed:** subjects personalize with `{{ subscriber.first_name | capitalize }}`, bodies keep "dear"; email design comes from the canonical render — never hand-edit HTML.
- **Sibling skills:** `luna-daily` = Luna astrology batch; `persona-email-kit` = onboard a NEW persona. This skill only *runs Evelyn's existing deck.*

---

### Task 1: De-prototype the pipeline scripts

The scripts are now the skill's engine (they scheduled cycle-1 live), but `check.mjs` and `scripts/README.md` still self-label as "throwaway prototype / scratchpad / seed of a future skill." Retire those labels. Pure comment/prose edits — **no behavior change**, proven by the fixtures staying green.

**Files:**
- Modify: `docs/aweber/evelyn-reframe-deck/scripts/check.mjs:1-5` (header comment)
- Modify: `docs/aweber/evelyn-reframe-deck/scripts/README.md:1-6` (intro framing)

**Interfaces:**
- Consumes: nothing.
- Produces: the same three CLI scripts, unchanged in behavior — `node check.mjs <paths>`, `node render-aweber.mjs <sendsDir> [outDir]`, `node aweber-ops.mjs list|cancel|schedule`.

- [ ] **Step 1: Establish the green baseline**

Run:
```bash
cd "docs/aweber/evelyn-reframe-deck/scripts" && node check.mjs ../emails/*.md
```
Expected: 7 lines all `PASS`, process exits 0.

- [ ] **Step 2: Re-label `check.mjs` header**

In `docs/aweber/evelyn-reframe-deck/scripts/check.mjs`, replace the first comment line:
```js
// Throwaway prototype of the reframe-deck mechanical self-check (scratchpad only).
```
with:
```js
// The reframe-deck mechanical pre-send gate (the evelyn-reframe skill's engine).
```
Leave the rest of the file (lines 2 onward) exactly as-is.

- [ ] **Step 3: Re-frame `scripts/README.md`**

In `docs/aweber/evelyn-reframe-deck/scripts/README.md`, replace the opening paragraph:
```
Prototype tooling that generates, checks, renders, and schedules reframe-deck emails to the
Evelyn AWeber list. Built for **cycle 1** (Jul 23–31 2026); these are the seed of a future
`.claude/skills/evelyn-reframe/`. Node ≥ 18 (uses global `fetch`). No deps.
```
with:
```
The reframe-deck pipeline — checks, renders, and schedules reframe-deck emails to the
Evelyn AWeber list. This is the engine the **`evelyn-reframe` skill** (`.claude/skills/evelyn-reframe/`)
orchestrates; first proven on **cycle 1** (Jul 23–31 2026). Node ≥ 18 (uses global `fetch`). No deps.
```

- [ ] **Step 4: Confirm still green (no behavior change)**

Run:
```bash
cd "docs/aweber/evelyn-reframe-deck/scripts" && node check.mjs ../emails/*.md && node check.mjs ../sends/cycle-1/*.md
```
Expected: all 7 golds `PASS` then all 9 cycle-1 drafts `PASS`; exit 0.

- [ ] **Step 5: Commit**

```bash
git add "docs/aweber/evelyn-reframe-deck/scripts/check.mjs" "docs/aweber/evelyn-reframe-deck/scripts/README.md"
git commit -m "chore(reframe): de-prototype pipeline scripts (now the evelyn-reframe engine)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Author `SKILL.md`

The skill file itself — frontmatter (trigger phrases) + the 6-stage orchestration + the two-layer gate + safety + the no-send validation note. This is the whole deliverable; the content below is complete and final.

**Files:**
- Create: `.claude/skills/evelyn-reframe/SKILL.md`

**Interfaces:**
- Consumes: the deck knowledge base + the Task-1 scripts (by documented command, run from `docs/aweber/evelyn-reframe-deck/scripts/`).
- Produces: a discoverable skill invoked as `/evelyn-reframe <start-date> <count>` (or by the trigger phrases in the description).

- [ ] **Step 1: Create the skill file with this exact content**

Create `.claude/skills/evelyn-reframe/SKILL.md`:

````markdown
---
name: evelyn-reframe
description: "Run a cycle of Evelyn Cross's daily 'reframe deck' emails end to end — plan a rotation-honoring slate from STATE.md, write each send-ready reframe email to the gold-standard shape, gate every one through the mechanical check + a judgment QA pass, render to AWeber HTML, and (only after an explicit human 'go') schedule them live to the theseerwithin_free list and log STATE. Use when the user says: run/write the next Evelyn reframe cycle, generate N Evelyn reframe or daily emails, build the next reframe batch. Single email = count 1. This RUNS Evelyn's already-built deck — to onboard a NEW persona's program use persona-email-kit; for Luna's astrology batch use luna-daily."
---

# Evelyn Reframe — run the cycle

Operator front-door for Evelyn Cross's **reframe deck** daily-email program. The engine is the deck itself: the written standards in `docs/aweber/evelyn-reframe-deck/` plus the pipeline scripts in that folder's `scripts/`. This skill orchestrates the human-in-the-loop run — **plan → write → check → QA → render → (human go) → schedule + log** — and reimplements nothing.

**Knowledge base (read, never rewrite):** `docs/aweber/evelyn-reframe-deck/`
- `PLAYBOOK.md` — the brand bible: spine (the reframe), audience, voice, substance, subject, formatting, guardrails, rotation, the pre-send checklist. The craft authority.
- `hooks.md` — the hook library + the 30-second hook check.
- `formats/NN-*.md` — the 7 format specs. `emails/NN-*.md` — the 7 gold emails (the quality bar + the check fixtures).
- `STATE.md` — the rolling sends log + rotation balance + no-repeat lists.

**Pipeline scripts** (run from `docs/aweber/evelyn-reframe-deck/scripts/`, Node ≥18, need `.env`): `check.mjs`, `render-aweber.mjs`, `aweber-ops.mjs`.

## Inputs
- **start date** (the first send's day; sends go one/day at 10:30 UTC = 6:30pm SGT) and **count** (how many emails). Ask if not given.
- Defaults: start = the day after the last scheduled send in `STATE.md`; count = the last cycle's length. **Single email = count 1.**
- Cycle slug = `cycle-<N>` (next N per `STATE.md`); drafts land in `docs/aweber/evelyn-reframe-deck/sends/<cycle>/`.

## Steps

### 1. Plan the slate
Read `STATE.md` (the sends log + the no-repeat lists) and PLAYBOOK → "Rotation & cadence". Emit a **slate** — one row per send: `send# · date · format · type · reframe-seed (one line "you think X → it's actually Y") · cast (+gender) · audience-state · slug`. Honor every rule:
- No format repeated within ~2 weeks; rotate all 7.
- ~2 conversion beats/week (formats **01** & **05**), never back-to-back.
- Interactive beats (**04** & **07**) spaced so a reply-ask lands ~2×/week.
- Balance audience-states A (uncertain) / B (waiting) / C (bereft) / valve across the cycle.
- **At least one explicit male POV** per cycle (format 01 is its natural home).
- Reuse nothing from STATE's no-repeat lists: reframe, hook, card (fmt 03), euphemism (fmt 05), maxim (fmt 06).

Write `sends/<cycle>/schedule.json` as `{ "NN": "<ISO8601>" }` (one entry per send; NN = zero-padded send#; e.g. `"01": "2026-08-01T10:30:00+00:00"`). **Present the slate table to the operator before writing any email.**

### 2. Write each email (parallel subagents)
Spawn **one writer subagent per slot**. Give each its slate row as a locked brief plus this instruction:

> Read `docs/aweber/evelyn-reframe-deck/PLAYBOOK.md`, your `formats/NN-*.md`, `hooks.md`, and your gold `emails/NN-*.md`. Then write ONE email — ~300–380 words of body, in Evelyn's voice — in the exact gold `.md` shape below, and save it to `docs/aweber/evelyn-reframe-deck/sends/<cycle>/NN-<slug>.md`. The deck docs are the sole craft authority; do not invoke a generic copy skill (it conflicts with the PLAYBOOK). Find the reframe first — write it as one clean "you think X → it's actually Y" sentence — then the hook, then draft to the format's skeleton.

The `.md` shape (match the gold emails exactly):
```
# NN · <Format title>

- **Format:** <format>
- **Type:** <conversion beat|insight|interactive>
- **Reframe:** "<surface>" → "<real>"
- **Cast:** <who, + gender/POV>
- **State:** <A|B|C|valve> — <label>
- **Subject:** `<emoji?> {{ subscriber.first_name | capitalize }}, <tease the turn>`
- **Preheader:** <Evelyn-voice whisper>
- **CTA:** <benefit label> → `campaign=<slug>`

---

<body: hook … then the one turn as `> **↳ THE REFRAME.** <the turn>` … a do-today practice … the CTA line `**→ <label>**` … then `— Evelyn`>
```

### 3. Mechanical check
```
cd docs/aweber/evelyn-reframe-deck/scripts && node check.mjs ../sends/<cycle>/*.md
```
Countable bars: `dear` 2–4, exactly one reframe marker, ≤2 body em-dash, tagged CTA slug + bold `**→` label, no underline, body 280–420 words. Any **FAIL** → fix that draft (targeted edit, or re-brief its writer) → re-run. Gate: **all PASS**.

### 4. Judgment QA (what the script can't measure)
Review the cycle against the PLAYBOOK bars a counter can't see — spawn a reviewer subagent (or do it inline) that reads `PLAYBOOK.md` + `hooks.md` + the drafts and reports blockers:
- **Cross-draft:** no repeated reframe or hook pattern across the cycle **and** vs `STATE.md`; the cast doesn't drift all-female.
- **Per-draft:** reframe true + non-obvious (a clean "you think X → it's actually Y"); hook alive (the 30-second hook check); substance = a real mechanism + why the obvious advice fails (or the hidden cost it exacts) + a do-today practice, passing the strip-the-CTA test; voice (no AI tells — em-dashes/banned words — reads aloud); gender-neutral reader.
- **Optional brand/compliance pass:** run the **`persona-email-qa`** agent on each draft for the non-astro subset — no names/dates, tendencies-not-promises, one tagged CTA → `/evelyn`, CAN-SPAM. (Evelyn makes no ephemeris claims, so the astrology checks don't apply.)

Any blocker → fix → re-run steps 3–4 on that draft.

### 5. Render
```
node render-aweber.mjs ../sends/<cycle>
```
Writes `../sends/<cycle>/_build/` (`NN-<slug>.html`, `.txt`, `index.json`) in the canonical white/Helvetica AWeber design (`↳ THE REFRAME.` marker stripped). A subject **>120 bytes** is a **blocker** (the `{{ … }}` tag ≈40 B → keep the rest ≤~80 B) → shorten the subject → re-render.

### 6. Human gate → schedule + log
Present the **review packet** and STOP:
- the rendered emails (open the `_build/*.html`),
- the slate table, and
- the `STATE.md` diff you are about to write.

**Do not schedule without an explicit in-turn "go" from the operator.** On "go":
1. `node aweber-ops.mjs schedule ../sends/<cycle>/_build` — **LIVE**: creates each broadcast then schedules it; the script stops on any subject >120 B or missing `scheduled_for`, and verifies each reaches `status=scheduled`.
2. Log the cycle in `STATE.md`: append the sends-table rows (send#, date, fmt, type, reframe, cast, state, slug, AWeber id) and extend every no-repeat list (reframes, hooks, cards, euphemisms, maxims).
3. Commit the drafts + `STATE.md` (never `_build/`, which is gitignored).

## Rules
- **`aweber-ops schedule` is the only irreversible action — it fires only after an explicit human "go."** Default to stopping at the review packet.
- **Never schedule a draft that failed either gate.** Both `check.mjs` (mechanical) and the judgment QA must be clean.
- **Commit `STATE.md` only after a successful schedule** — a planned-but-unsent cycle leaves no rows.
- **Rollback:** `node aweber-ops.mjs cancel <id> <id> …` reverts scheduled → draft (recoverable, not deleted).
- Subjects personalize with `{{ subscriber.first_name | capitalize }}`; bodies keep "dear". Design/sender/footer come from the canonical render — don't hand-edit the HTML.
- This is the **run** skill for Evelyn's deck. New persona program → **`persona-email-kit`**. Luna's astrology batch → **`luna-daily`**.

## Validate without sending
To smoke-test the pipeline, run steps 1–5 for a small count into a **scratch** cycle dir and **stop before step 6** — never call `aweber-ops schedule`, don't write `STATE.md`. Regression fixtures that must always pass:
```
cd docs/aweber/evelyn-reframe-deck/scripts
node check.mjs ../emails/*.md        # the 7 golds — all PASS
node check.mjs ../sends/cycle-1/*.md # the 9 shipped — all PASS
```
````

- [ ] **Step 2: Verify the frontmatter is valid and the name matches the dir**

Run:
```bash
cd "/Users/joel/Library/CloudStorage/OneDrive-altius/Fun Projects/The-Seer-Within-V2-Production-joel-chue/The-Seer-Within-V2-Production"
awk '/^---$/{n++; next} n==1{print}' .claude/skills/evelyn-reframe/SKILL.md | grep -E '^(name|description):'
```
Expected: exactly two lines — `name: evelyn-reframe` and a `description:` line. The `name` must equal the directory name `evelyn-reframe`.

- [ ] **Step 3: Verify every script/path the skill references actually exists**

Run:
```bash
cd "/Users/joel/Library/CloudStorage/OneDrive-altius/Fun Projects/The-Seer-Within-V2-Production-joel-chue/The-Seer-Within-V2-Production/docs/aweber/evelyn-reframe-deck"
ls PLAYBOOK.md hooks.md STATE.md formats/ emails/ scripts/check.mjs scripts/render-aweber.mjs scripts/aweber-ops.mjs
```
Expected: every path lists with no "No such file" error.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/evelyn-reframe/SKILL.md
git commit -m "feat(skill): add evelyn-reframe — run Evelyn's reframe-deck email cycle

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Acceptance dry-run (no live send)

Prove the whole skill end to end on a real 2-email cycle into a throwaway dir, stopping before schedule. Catches wiring bugs (cwd, draft-shape mismatch, render breakage) before the operator relies on it. Nothing here touches the live list or `STATE.md`; the scratch dir is deleted at the end.

**Files:**
- Create (temporary): `docs/aweber/evelyn-reframe-deck/sends/_smoketest/` (drafts + `schedule.json` + `_build/`) — removed in the last step.

**Interfaces:**
- Consumes: the `SKILL.md` from Task 2 and the scripts from Task 1.
- Produces: a PASS/FAIL confirmation the skill works; no committed artifacts.

- [ ] **Step 1: Confirm the fixtures are green (baseline)**

Run:
```bash
cd "docs/aweber/evelyn-reframe-deck/scripts" && node check.mjs ../emails/*.md
```
Expected: 7 × `PASS`, exit 0.

- [ ] **Step 2: Follow the skill for a 2-email scratch cycle through render**

Invoke the skill's own steps 1–5 with `start = 2026-08-01`, `count = 2`, `cycle = _smoketest`:
- **Plan** a 2-slot slate honoring rotation vs `STATE.md` (two different formats not used in the last ~2 weeks; a reframe/hook/card/euphemism/maxim not in the no-repeat lists; ≥1 male POV; balanced states). Write `sends/_smoketest/schedule.json`:
```json
{ "01": "2026-08-01T10:30:00+00:00", "02": "2026-08-02T10:30:00+00:00" }
```
- **Write** the two emails via two parallel writer subagents (each reads PLAYBOOK + its format + hooks + its gold), saved as `sends/_smoketest/01-<slug>.md` and `02-<slug>.md` in the gold `.md` shape.
- **Do NOT proceed to step 6 (schedule).**

- [ ] **Step 3: Mechanical gate on the new drafts**

Run:
```bash
cd "docs/aweber/evelyn-reframe-deck/scripts" && node check.mjs ../sends/_smoketest/*.md
```
Expected: 2 × `PASS`, exit 0. Any FAIL → fix the draft and re-run before continuing.

- [ ] **Step 4: Render and verify the build**

Run:
```bash
cd "docs/aweber/evelyn-reframe-deck/scripts" && node render-aweber.mjs ../sends/_smoketest && ls ../sends/_smoketest/_build/
```
Expected: no `subject … > 120` warning; `_build/` contains `01-<slug>.html`, `01-<slug>.txt`, `02-<slug>.html`, `02-<slug>.txt`, and `index.json`.

- [ ] **Step 5: Spot-check rotation integrity + render fidelity**

- Confirm the two chosen formats/reframes/hooks are **not** in `STATE.md`'s no-repeat lists and not equal to each other.
- Open one `_build/*.html` and confirm the canonical design rendered (white bg, Helvetica, "Seer Within" banner, the reframe in its plum pull-quote with **no literal "THE REFRAME" label**, blue underlined CTA link, `140 Broadway` + Unsubscribe footer).

Expected: both true. This is the judgment gate in miniature; a real cycle would also run the full step-4 QA.

- [ ] **Step 6: Tear down the scratch cycle (no commit)**

Run:
```bash
rm -rf "docs/aweber/evelyn-reframe-deck/sends/_smoketest"
git status --short docs/aweber/evelyn-reframe-deck/sends/
```
Expected: no `_smoketest` paths remain and nothing staged. The acceptance test leaves no artifacts; the first *real* cycle is a normal `/evelyn-reframe <start> <count>` invocation that ends at the human "go".

---

## Notes for the executor

- **No unit-test framework here.** The deliverable is a skill file + light script cleanup; "tests" are the `check.mjs` fixture runs (Tasks 1 & 3) and the end-to-end dry-run (Task 3). Treat a red fixture or a render warning exactly like a failing test — stop and fix before commit.
- **Task 2 embeds the complete `SKILL.md`.** Copy it verbatim; do not paraphrase or trim the stage instructions.
- **The live list is never touched by this plan.** `aweber-ops.mjs schedule` appears only inside the skill's step 6, which is gated on a human "go" and is intentionally *not* exercised by Task 3.
