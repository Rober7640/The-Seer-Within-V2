# FB-Palm Hook Pipeline — sourcing → ledger → images → live pages

**What this is:** a semi-automated pipeline for launching new **hooks** (love questions) across the existing `/fb-palm` sign matrix. The sign axis is complete (9 signs built); this scales the *question* axis. Built on the PRD (`fb-palm/docs/PRD-quiz-bridge.md`) — same param-driven architecture, no new routes.

**Operating mode (locked):** semi-auto **with a human review gate** · **full matrix** (every hook × all unique-read signs) · **structured ledger** (`fb-palm/ledger/hook-ledger.json`, supersedes `new-ads/STATUS.md`) · **manual images** (designer makes them; pipeline emits briefs + tracks links).

> A new hook = headline + `hook_pain` + Version-C opener question + **21 reads** (8 unique-read signs × their 2–3 options, 4 sentences each; the 2 `-alt` signs inherit). That read fan-out is the work this pipeline automates and gates.

---

## The 6 stages

```
0 SOURCE ─▶ 1 GENERATE ─▶ 2 REVIEW GATE ─▶ 3 WIRE ─▶ 4 IMAGES ─▶ 5 PUBLISH ─▶ 6 MEASURE
 (mining)    (Claude)       (human)        (code)    (designer)   (media buyer)  (PostHog)
```

### 0 · Source
Re-run the miner for fresh candidates (read-only): `node fb-palm/ledger/mine-questions.cjs deep` (per-segment question patterns + conv% + lift) and `… voc <bucket> <sub_bucket>` (verbatim VOC copy). The seeded ranking lives in `docs/v1-question-mining-findings.md`. **Brainstorm with the operator** which to queue — prefer high-*conversion* + specific + palm-legible questions, not just high-volume. Add chosen ones to the ledger with `status: "draft"`, `reads_status: "todo"`, a `headline`, and `frame` (`self` or `self-bridged` — see §Self-frame rule).

### 1 · Generate (semi-auto)
Run the generator for a queued hook. It produces, following the **generation spec** below:
- `headline` (hook-level), `hook_pain` (server, Version-C injection), Version-C `palm_question`.
- the **full read set** — `reads[hook][option]` for all 8 unique-read signs (4-beat build each).

Output is written to `fb-palm/ledger/drafts/<hook>.draft.md` (human-readable) — **not** to code. Set the hook `reads_status: "review"`.

### 2 · Review gate (human) — the hard stop
Joel reviews `drafts/<hook>.draft.md` for: voice (Evelyn), the 4-beat formula (Appendix B), **self-frame coherence** (the hand reads *her*, never him), archetype consistency, and **compliance** (no date/name/guarantee, no exclamations/emoji, empowerment-not-paranoia). Approve / edit-in-place / reject. **No code is touched until this passes.**

### 3 · Wire (scaffold into code)
On approval, inject the approved copy (Appendix C of the PRD is the runbook):
- `client/src/content/palmReads.ts` — extend the `PalmSign`… no: extend the **hook union**; add `reads[<hook>]` to **every unique-read SignConfig**; add the `headline`. `-alt` signs inherit via the existing `...SIBLING` spread.
- `server/lib/prompts.ts` — `PALM_HOOK_PAIN[<hook>]`, `PALM_QUESTION[<hook>]`.
- `server/routes.ts` — add `<hook>` to the hook validator/enum.
- **Verify:** `npx tsc --noEmit` (zero new errors in touched files) + `npx vite build`; open `/fb-palm?hook=<hook>&sign=thumb` (A), `/b`, `/c`.
- Ledger: `reads_status: "wired"`.

### 4 · Images (manual handoff)
`node fb-palm/ledger/render-ledger.cjs briefs <hook>` prints one **image brief per hook × sign**: the headline text to set + which `<sign>-strip.png` (with dims) to lay it over, mirroring the live `/fb-palm` art so message-match holds. Designer builds the FB creatives in Canva/Figma and returns links → log each as a row in the ledger `creatives` array (`{hook, sign, status:"ready", link}`).

### 5 · Publish
`node fb-palm/ledger/render-ledger.cjs urls <hook>` prints the **production URL matrix** (3 versions × every target sign) for the media buyer. A combination goes live when **both** its reads are `wired` **and** its creative is `ready`. Set hook `status: "live"`.

### 6 · Measure → prune
PostHog gives the `sign × hook × thumb × version` view; pair with the v1 purchase rate (`conversations`). Write results back to the hook/combo `perf`. Promote winners (more spend/signs), set losers `status: "killed"` (kept in the ledger as a record, never silently dropped).

---

## Generation spec (what stage 1 must obey)

This extends the PRD's **Appendix B** (the 4-beat read formula) with the new-frame rules.

**The 4-beat build (per option, one sentence each):** (1) name the mark + reading label · (2) mirror her question (acknowledge the wound if it hurts) · (3) the "yes" beat — affirm with certainty via the archetype, withhold specifics ("closer than you think", never a date/name) · (4) open loop ("let me look closer…").

**Self-frame rule (for `self-bridged` hooks — the "decode him" questions):**
- The thing the hand *reads* is **her** — her heart line, her intuition, her readiness. He may appear as the **object** of her feeling, never the **subject** the hand reads. (✅ "your heart still holds a door open for him" · ❌ "his thumb shows he's lying").
- Beat 3 affirms **her clarity / heart / knowing** with certainty — NOT a verdict on him. (✅ "your knowing is rarely wrong" · ❌ "yes, he's cheating").
- **Empowerment, not paranoia** (wellbeing guardrail): the read validates *her* intuition and worth; it never prosecutes or accuses the partner. The headline gets the coherent click; the reveal delivers the "decode him" payload as *her* insight.

**Headline register — RAW, not safespeak.** The ad headline is blunt, first/second-person, in the customer's own words (like the live winners "Will I love again?" / "When is my soulmate coming?") — never literary ("Is your heart still holding the door open?"). Stay self-frame for mechanic coherence, but say it raw. Evelyn's voice is for the reveal only; the headline is a punch, not a poem.

**Decode-him → first-person "I" (the preferred raw form).** Rotate an about-him question to *her experience* of it: "Is he lying to you?" → **"Am I being lied to?"**, "Is he the one?" → **"Am I settling?"**, "Is he coming back?" → **"Is it over for me?"**, "Is he playing you?" → **"Am I being played?"**. This is raw, matches the proven first-person register, AND keeps *her* as the grammatical subject — so the **thumb reveal stays coherent and no card device is needed**. Test these on the existing thumb signs first; reserve the card device for questions that are irreducibly about *him* as subject (e.g. "what is he hiding").

**Archetype consistency:** each option keeps its sign-level meaning across all hooks (thumb A = gathering/trident, B = reaching/fork-right, C = inward/fork-left), re-applied to the new question.

**Hard constraints:** no specific date/name/guaranteed outcome; no exclamation marks, emoji, price/offer/urgency; reference the **mark**, never the A/B/C letter; "Entertainment Purposes Only" stands.

---

## Ledger schema (`fb-palm/ledger/hook-ledger.json`)
- `signs[]` — id, tell, options, archetypes, strip+dims, `altOf` (alt signs inherit reads), status.
- `hooks[]` — id, question, **headline**, `frame`, `source` (mining ref), `mining_conv`, `status` (draft→review→wired→live | killed), `target_signs` ("all" | list), `reads_status` (todo→review→wired→live), `copy`, `perf`.
- `creatives[]` — sparse `{hook, sign, status, link}`; only populated as designers deliver. Everything else (URL matrix, outstanding briefs) is **derived** by the renderer, not stored.

## Renderer (`fb-palm/ledger/render-ledger.cjs`)
- `node … status` — board: every hook × its `reads_status`, creative coverage, live/blocked.
- `node … urls <hook>` — production URL matrix (stage 5).
- `node … briefs <hook>` — image briefs for the designer (stage 4).
- `node … queue` — hooks needing generation (`reads_status: todo`) or review.

## Invariants (never break)
1. Absent `sign` → `thumb` (original links byte-identical).
2. Client `SIGNS` registry ↔ server vocab/enums stay in sync (a hook added one place but not the other = Version-C breakage).
3. No code before the review gate.
