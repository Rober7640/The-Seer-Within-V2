---
name: evelyn-reframe
description: "Run a cycle of Evelyn Cross's daily 'reframe deck' emails end to end — plan a rotation-honoring slate from STATE.md, write each send-ready reframe email to the gold-standard shape, gate every one through the mechanical check + a judgment QA pass, render to AWeber HTML, and (only after an explicit human 'go') schedule them live to the theseerwithin_free + palm + tarot lists and log STATE. Use when the user says: run/write the next Evelyn reframe cycle, generate N Evelyn reframe or daily emails, build the next reframe batch. Single email = count 1. This RUNS Evelyn's already-built deck — to onboard a NEW persona's program use persona-email-kit; for Luna's astrology batch use luna-daily."
---

# Evelyn Reframe — run the cycle

Operator front-door for Evelyn Cross's **reframe deck** daily-email program. The engine is the deck itself: the written standards in `docs/aweber/evelyn-reframe-deck/` plus the pipeline scripts in that folder's `scripts/`. This skill orchestrates the human-in-the-loop run — **plan → write → check → QA → render → (human go) → schedule + log** — and reimplements nothing.

**Knowledge base (read, never rewrite):** `docs/aweber/evelyn-reframe-deck/`
- `PLAYBOOK.md` — the brand bible: spine (the reframe), audience, voice, substance, subject, formatting, guardrails, rotation, the pre-send checklist. The craft authority.
- `hooks.md` — the hook library + the 30-second hook check.
- `formats/NN-*.md` — the 7 format specs. `emails/NN-*.md` — the 7 gold emails (the quality bar + the check fixtures).
- `STATE.md` — the rolling sends log + rotation balance + no-repeat lists.

**Pipeline scripts** (run from `docs/aweber/evelyn-reframe-deck/scripts/`, Node ≥18, need `.env`): `check.mjs`, `render-aweber.mjs`, `aweber-ops.mjs`. `check.mjs` and `aweber-ops.mjs` run under plain `node`; **`render-aweber.mjs` must run under `tsx`** (it imports a TypeScript module to mint `/e/<code>` links) and **writes to the database named by `DATABASE_URL`** — see step 5.

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

Write `sends/<cycle>/schedule.json` as `{ "NN": "<ISO8601>" }` (one entry per send; NN = the draft's own zero-padded number, which must match the draft's filename, its `# NN` header line, and this key — number drafts in send-date order so a date can't attach to the wrong draft; e.g. `"01": "2026-08-01T10:30:00+00:00"`). **Present the slate table to the operator before writing any email.**

### 2. Write each email (parallel subagents)
Spawn **one writer subagent per slot**. Give each its slate row as a locked brief plus this instruction:

> Read `docs/aweber/evelyn-reframe-deck/PLAYBOOK.md`, your `formats/NN-*.md`, `hooks.md`, and your gold `emails/NN-*.md`. Then write ONE email — ~300–380 words of body, in Evelyn's voice — in the exact gold `.md` shape below, and save it to `docs/aweber/evelyn-reframe-deck/sends/<cycle>/NN-<slug>.md`. The deck docs are the sole craft authority; do not invoke a generic copy skill (it conflicts with the PLAYBOOK). Find the reframe first — write it as one clean "you think X → it's actually Y" sentence — then the hook, then draft to the format's skeleton. Keep the subject **≤120 bytes total**: the `{{ subscriber.first_name | capitalize }}` tag counts as 40 bytes, so everything after it must be ≤~78 bytes (~78 characters). The mechanical gate rejects anything over — the gold subjects run 90–119 B, so aim there.

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
Countable bars: `dear` 2–4, exactly one reframe marker, ≤2 body em-dash, tagged CTA slug + bold `**→` label, no underline, body 280–420 words, **subject 1–120 bytes** (the `{{ … }}` tag included — this is the earliest place the AWeber subject limit is caught, before render and before anything live). Any **FAIL** → fix that draft (targeted edit, or re-brief its writer) → re-run. Gate: **all PASS**.

### 4. Judgment QA (what the script can't measure)
Review the cycle against the PLAYBOOK bars a counter can't see — spawn a reviewer subagent (or do it inline) that reads `PLAYBOOK.md` + `hooks.md` + the drafts and reports blockers:
- **Cross-draft:** no repeated reframe or hook pattern across the cycle **and** vs `STATE.md`; the cast doesn't drift all-female.
- **Per-draft:** reframe true + non-obvious (a clean "you think X → it's actually Y"); hook alive (the 30-second hook check); substance = a real mechanism + why the obvious advice fails (or the hidden cost it exacts) + a do-today practice, passing the strip-the-CTA test; voice (no AI tells — em-dashes/banned words — reads aloud); gender-neutral reader.
- **Optional brand/compliance pass:** run the **`persona-email-qa`** agent on each draft (Evelyn is entirely non-astro, so that agent's ephemeris checks are inert — you're using it for the brand/compliance pass only: no names/dates, tendencies-not-promises, one tagged CTA → `/evelyn`, CAN-SPAM).

Any blocker → fix → re-run steps 3–4 on that draft.

### 5. Render — **local only, always**
```
npx tsx --env-file=../../../../.env.test render-aweber.mjs ../sends/<cycle>
```
Writes `../sends/<cycle>/_build/` (`NN-<slug>.html`, `.txt`, `index.json`) in the canonical white/Helvetica AWeber design (`↳ THE REFRAME.` marker stripped). Subject length is already enforced by the step-3 mechanical gate; `render-aweber.mjs` only **re-warns** on a `>120 B` subject (a `⚠` on stderr) and still **exits 0** — it does not block. So treat any such `⚠` as a hard blocker: it means a draft slipped the gate. Shorten the subject (`{{ … }}` tag ≈40 B → keep the rest ≤~80 B) and re-run **both** check and render before proceeding.

**Never render against production in this step.** Rendering used to be a pure local file operation; it now also mints `/e/<code>` rows for any draft carrying a `**Continue Seed:**`, and those rows are a production write. This step runs mid-cycle, before the human gate, so it stays pointed at the local database. Producing the codes that go live is step 6a, **after** the human says go. The script enforces this too: it refuses any non-local `DATABASE_URL` unless `--mint-production` is passed.

Read the `⚑ minting /e/ codes into database "…" @ host` line it prints — that names the target. With `DATABASE_URL` unset it exits 1 rather than guessing. Re-running is safe: codes are keyed on the campaign slug, so a re-render `reused`s the existing code or `updated`s its content in place — the URL inside an already-scheduled broadcast never changes.

**Writing the continuity frontmatter:** for a send you want on the Live Thread path, add three lines to the draft's frontmatter block (each one line, **no wrapping** — a wrapped value truncates at the newline, and the renderer will warn if it spots one):
- `- **Reading Recap:**` — 2–5 sentences: the exact reading this email delivered.
- `- **Open Loop:**` — the personal question the email left open.
- `- **Continue Seed:**` — Evelyn's turn-0 opener that picks the thread back up. **This one is the trigger** — omit it and the send stays on the legacy `?campaign=` link. Wrapping this one onto a second line is a hard render error (it would ship as half a sentence); wrapping the other two only warns.
- Optional `- **Bucket:**` — defaults to `love` for this deck. Must be exactly one of `love` / `money` / `purpose` / `specific`; anything else is a hard render error, because the lander discards the *whole* payload on a parse failure and the send would silently lose continuity, prefill and attribution together. It selects Drip 1's bucket-specific phrase, so change it only for a send that genuinely isn't love-weighted.

**Campaign slugs are globally unique, forever.** Codes are keyed on `(persona, campaign)` across all cycles, so never reuse a slug an earlier cycle used — it would repoint that cycle's live row and give a reader of the older, already-sent email the new cycle's continuation. Draft numbers restart each cycle, so include something cycle-distinct in the slug. The renderer checks every sibling directory under `sends/` and hard-fails on a collision.

**Declare the short-linked sends.** Write `../sends/<cycle>/short-links.json` = the draft numbers that must be short-linked, e.g. `["04", "07"]` (or `{ "note": "…", "sends": [...] }` if the file needs a comment). The renderer then hard-fails on any deviation in either direction, instead of burying a mistyped `**Continue Seed:**` label inside a warning block that fires on most sends anyway. Confirm the `✓ short links as declared` line before moving on.

### 6. Human gate → mint for production → schedule + log
Present the **review packet** and STOP:
- the rendered emails (open the `_build/*.html`),
- the slate table, and
- the `STATE.md` diff you are about to write.

**Do not schedule without an explicit in-turn "go" from the operator.** On "go":

0. **Re-render against production, but only if this cycle has short links** (`✓ short links as declared` listed any send in step 5). Skip this entirely for an all-legacy cycle — it needs no database at all.
   ```
   npx tsx --env-file=../../../../.env render-aweber.mjs ../sends/<cycle> --mint-production
   ```
   This is the production write, and `--mint-production` is required — the script refuses a non-local database without it. Confirm the `⚑ minting … @ …pooler.supabase.com` line names production, and that each short-linked send reports `created`/`reused`/`updated`. Skipping this step stops the pipeline rather than sending a broken link: `aweber-ops.mjs schedule` pre-flights `minted_into` **and** fetches each `/e/<code>` from the live site, requiring a `302` to `/evelyn?`. That live check also means an unapplied migration 020 or an undeployed `/e/` route surfaces here, before anything is created — and it blocks on a failed or unreachable check rather than passing.

1. `node aweber-ops.mjs schedule ../sends/<cycle>/_build` — **LIVE**: validates + creates + schedules one entry at a time, aborting on the first bad one (subject >120 B, missing `scheduled_for`, or an API failure) and verifying each reaches `status=scheduled`. **Since 2026-08-20 this writes one broadcast per list in `AWEBER_DAILY_LIST_IDS`** (shared free + palm + tarot), so an N-email cycle creates N x 3 broadcasts; `list`/`cancel` take `--list=<id>` to reach the non-default ones. **This is not atomic — a mid-batch abort leaves the already-scheduled earlier sends LIVE.** That's why the subject gate must be clean before "go". If an abort happens, run `node aweber-ops.mjs list` to see what went live, then `node aweber-ops.mjs cancel <id> …` to pull those back to draft. After a clean run, `node aweber-ops.mjs list` confirms the full schedule.
2. Log the cycle in `STATE.md`: append the sends-table rows (send#, date, fmt, type, reframe, cast, state, slug, AWeber id) and extend every no-repeat list (reframes, hooks, cards, euphemisms, maxims).
3. Commit the drafts + `STATE.md` (never `_build/`, which is gitignored).

## Rules
- **`aweber-ops schedule` is the only irreversible action — it fires only after an explicit human "go."** Default to stopping at the review packet.
- **Rendering is local. The only production write before scheduling is step 6a's `--mint-production` re-render, and it also fires only after "go."** Never pass `--env-file=.env` (or `--mint-production`) during step 5.
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
