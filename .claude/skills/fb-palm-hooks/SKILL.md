---
name: fb-palm-hooks
description: "Source, draft, review-gate, and ship new /fb-palm quiz hooks (the love-question axis) across the existing palm-sign matrix. Use when the user says: mine new palm/ad questions, brainstorm fb-palm angles, draft a new palm hook, wire the approved hook into palmReads.ts, give me the URL matrix / image briefs for a hook, scale the fb-palm questions. This RUNS the proven pipeline (mine v1 conversations → brainstorm → generate 4-beat reads → human review gate → wire code → emit image briefs + URLs → measure). Interactive by design: brainstorming which questions to pursue and reviewing drafts happens live. Reference: fb-palm/docs/hook-pipeline.md (full spec), fb-palm/docs/PRD-quiz-bridge.md (architecture + Appendix B copy formula), docs/v1-question-mining-findings.md (the data)."
---

# /fb-palm-hooks — launch new question-hooks on the palm funnel

The operator front-door for scaling the **hook axis** (love questions) of `/fb-palm`. The sign axis (thumb, finger-length, …) is already complete — this adds new *questions* across the full sign matrix. Do not reinvent the architecture: it's param-driven (`/fb-palm/{v}?hook=X&sign=Y`), no new routes. The engine is this recipe + four repo assets:

- **Ledger (source of truth):** `fb-palm/ledger/hook-ledger.json` — hooks × signs × versions, status, creatives, perf.
- **Miner (sourcing):** `node fb-palm/ledger/mine-questions.cjs <overview|deep|voc>` — read-only v1 `conversations` pull.
- **Renderer (outputs):** `node fb-palm/ledger/render-ledger.cjs <status|queue|urls <hook>|briefs <hook>>`.
- **Drafts (review gate):** `fb-palm/ledger/drafts/<hook>.draft.md`.

Full spec: `fb-palm/docs/hook-pipeline.md`. Copy formula: PRD Appendix B. Data + caveats: `docs/v1-question-mining-findings.md`.

## Operating mode (locked)
Semi-auto **with a human review gate** · **full matrix** (each hook × all 8 unique-read signs; the 2 `-alt` signs inherit) · **manual images** (emit briefs, track links — never generate art). **No code is written until a draft passes the gate.**

## The 6 stages
`0 source → 1 generate → 2 REVIEW GATE → 3 wire → 4 images → 5 publish → 6 measure`

### 0 · Source (interactive)
The ranked backlog lives in **`fb-palm/docs/headline-roadmap.md`** (waves, raw headlines). Work *down the waves* — don't hand-pick 5 ad-hoc. Refresh/explore with the **Methods catalog** in that doc — all read-only `node fb-palm/ledger/mine-questions.cjs <method>`:
- Targeting: `buckets` (rank by freq×conv) → `phrases <bucket> <sub>` (questions surfacing) → `voc <bucket> <sub>` (verbatim copy).
- Lenses: `revenue` (ROAS / EV-per-visitor) · `momentum` (demand trend). Triangulate all three before committing; don't pick on frequency×conversion alone.
- Selection bar: **big AND above-baseline (lift > 1.1)**, specific (a real situation/person), not already live, and **legible to the mechanic** (`[thumb]` self-frame now; `[card]` decode-him needs the parked device). Confirm the wave with the user, then ensure the chosen hooks are in the ledger (`status:"draft", reads_status:"todo"`) with a **raw** `headline` (no safespeak), `frame`, `wave`, `source`.

### 1 · Generate
For a queued hook, write to `fb-palm/ledger/drafts/<hook>.draft.md` (NOT code):
- hook-level: `headline`, Version-A `CTA`, `hook_pain` (server injection), Version-C `palm_question`.
- the **full read set**: `reads[hook][option]` for all 8 unique-read signs (thumb, finger-lock, finger-shape, palms, palm-signs, thumb-curve, hand-size, finger-length), 4-beat build each (21 reads total). Set `reads_status:"review"`.

### 2 · REVIEW GATE — hard stop
Present the draft; the user approves / edits / rejects. Nothing proceeds to code until approved.

### 3 · Wire (only after approval)
Per PRD Appendix C: add the hook to the `PalmSign`-adjacent **hook union** + `reads[<hook>]` in every unique-read `SignConfig` in `client/src/content/palmReads.ts` (+ `headline`); `PALM_HOOK_PAIN[<hook>]` + `PALM_QUESTION[<hook>]` in `server/lib/prompts.ts`; the hook in `server/routes.ts` validator. **Verify:** `npx tsc --noEmit` (zero new errors in touched files) + `npx vite build`; open A/B/C URLs. Set `reads_status:"wired"`. Keep client registry ↔ server vocab in sync.

### 4 · Images (handoff)
`render-ledger.cjs briefs <hook>` → one brief per `hook × sign` (headline over the existing `<sign>-strip.png`). User's designer builds the FB creatives; log each as `{hook, sign, status:"ready", link}` in the ledger `creatives` array.

### 5 · Publish
`render-ledger.cjs urls <hook>` → the production URL matrix (3 versions × every sign) for the media buyer. A combo goes live when its reads are `wired` AND its creative is `ready`. Set hook `status:"live"`.

### 6 · Measure → prune
PostHog (`sign × hook × thumb × version`) + v1 purchase rate → write back to `perf`. Promote winners; set losers `status:"killed"` (kept as a record, never silently dropped).

## Generation spec (obey in stage 1)
Extends PRD **Appendix B** (the 4-beat read formula: name the mark → mirror her question → the certain "yes" beat, withhold specifics → open loop).

**Self-frame rule** — for `self-bridged` hooks (the "decode him" questions, which convert best):
- The hand reads **her** (heart line, intuition, readiness). He may be the **object** of her feeling, never the **subject** the hand reads. ✅ "your heart still holds a door open for him" · ❌ "his thumb shows he's lying."
- Beat 3 affirms **her** clarity/knowing with certainty — never a verdict on him.
- **Empowerment, not paranoia** (wellbeing guardrail): validate her intuition and worth; never prosecute the partner. The self-frame headline earns the coherent click; the reveal delivers the "decode him" payload as *her* insight.

**Headline register — RAW, not safespeak.** The ad headline is blunt, visceral, first/second-person, matched to the customer's own words (VOC) — like the live winners ("Will I love again?", "When is my soulmate coming?"). Never literary/poetic ("Is your heart still holding the door open?"). Keep it **self-frame** for mechanic coherence (the hand reads *her*), but say it raw. Evelyn's warm/mystical voice lives ONLY in the reveal/reads — the headline is a punch, not a poem.

**Decode-him → first-person "I" (preferred raw form).** Rotate the about-him question to her experience: "Is he lying to you?" → "Am I being lied to?" · "Is he the one?" → "Am I settling?" · "Is he coming back?" → "Is it over for me?" · "Is he playing you?" → "Am I being played?". Raw + proven register + keeps *her* the subject → **runs coherently on the existing thumb signs, no card device.** Test "I"-on-thumb first; the card device is only for questions irreducibly about *him* as subject ("what is he hiding").

**Always:** archetype consistency (each option keeps its sign-level meaning across hooks); no date/name/guaranteed outcome; no exclamation/emoji/price/urgency; reference the **mark**, never the A/B/C letter; "Entertainment Purposes Only" stands. For wounded hooks (heartbreak), acknowledge the wound before the yes.

## Inputs
- **action** — `mine` / `draft <hook|batch>` / `wire <hook>` / `urls <hook>` / `briefs <hook>` / `status`. Ask if unclear.
- Hooks already seeded: `is-he-true` (at review gate, thumb drafted), `door-open`, `heart-safe`, `why-him`, `tired-waiting` (todo). Live: `soulmate-timing`, `already-met`, `love-again`.

## Invariants
1. Absent `sign` → `thumb` (original links byte-identical). 2. Client registry ↔ server vocab/enums in sync. 3. No code before the review gate. 4. Manual images only — never generate hand art.
