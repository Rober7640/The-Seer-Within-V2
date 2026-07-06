# Clearing-Theme Coherence — is Act 1 of the trilogy clearly expressed?

**Date:** 2026-07-05 · Evidence / recommendation only — **no code changed.**

## The structure behind V1 (the trilogy)

| Act | Product | Theme | Tense |
|---|---|---|---|
| **1** | Main **$35** | **CLEAR** the block/shadow | past — undo what's stuck |
| **2** | U1 **$47** | **PROTECT** what was cleared (lava stone) | present — guard the open field |
| **3** | U2 **$47/$30** | **ATTRACT / MANIFEST** (bracelet) | future — call it in |

For the trilogy to hold, **Act 1 must be unmistakable** — U1 literally sells *"protect what we cleared"* and
U2's engine assumes it (`prompts.ts:1116`: *"Reference their desire, NOT the block — the clearing handles
that"*). If "clearing" is fuzzy in the main flow, both upsells build on sand.

## Verdict

**Partially expressed. The theme is present and correctly named, but it drifted from "woven throughout" to
"named at the end" — and its crispest articulation is dead code.** The *problem* (a block/shadow) is built hard
across the entire crisis arc; "clearing" as the *resolution* lives in ~3 static lines at the very end plus the
CTA label. Nearly all the LLM-generated conversation — most of what the user reads — never says "clearing."

## Where clearing lives (map)

| Beat | Clearing expressed? | Evidence |
|---|:--:|---|
| Deepening readings (reading1/2) | ❌ | pure emotional cold-read; no theme |
| Crisis (reveal/cost/urgency) | ⚠️ faint | builds *block/shadow* heavily (35+ mentions); "clear" only at `prompts.ts:611,656` |
| `shadowSummary` (pitch Step 2, LLM) | ❌ by design | *"do NOT mention ritual… just the diagnosis"* (`prompts.ts:714`) → names the block, not the cure |
| Permission | ✅ | *"I know exactly what needs to be cleared"* (`useConversation.ts:1007`) |
| **Pitch Step 3 (static) — the one strong beat** | ✅✅ | *"trace the roots of this block, sever its hold, and seal the clearing so it can't return"* (`:1336`) |
| Pitch Step 4 (static) | ✅ | *"what I found, what I cleared, 3 steps"* (`:1343`) |
| `valueExplain` (pitch Step 6 close, LLM) | ❌ | paints vision + crossroads only (`prompts.ts:949-963`) — no clearing |
| CTA button / tracking | ✅ | "Energy Clearing Ritual" (`:1395`) |

## Root cause of the drift

1. **The pitch was hardcoded; the canonical clearing copy was orphaned.** `getOfferExplanation`
   (`prompts.ts:325-334`) holds the crispest statement in the codebase —
   *"I'll perform an Energy Clearing Ritual — focusing my energy entirely on removing the shadow that's
   blocking your path"* — and `getPitchMessages` (`:340-368`) has *"To seal the clearing, a Sacred Offering
   is required."* **Both are dead** (never called). The live hardcoded pitch *describes* the mechanism well
   but **never names "an Energy Clearing Ritual" in Evelyn's voice** — that label only appears on the button.
2. **A phantom reference:** the objection/value path instructs the model to *"Explain clearly (use
   OFFER_EXPLANATION content)"* (`prompts.ts:1027`) — but that content is never injected, so the model
   improvises the offer framing without the canonical clearing language.
3. **The LLM beats don't echo the theme.** `shadowSummary` = diagnosis (block), `valueExplain` = vision.
   Since these + the readings are most of the words, the clearing throughline rests on ~3 static lines.
4. **The problem is over-built vs. the solution.** The crisis arc spends many turns making the *block* vivid,
   but "clearing" is *sprung* at the pitch rather than seeded as the inevitable resolution.

## The fix — weave clearing through, and un-orphan the canonical copy

### Change 1 — Name the ritual in the live pitch (not just describe it)
`useConversation.ts:1334-1338` (pitch Step 3). Prepend an explicit naming line so the user hears the product
in Evelyn's voice, tying the whole conversation to the CTA:
> *"What you need, ${firstName}, is an Energy Clearing Ritual."* → then the existing "trace the roots… seal
> the clearing" lines.

### Change 2 — Let `shadowSummary` foreshadow that the block is *clearable*
`prompts.ts:714`. Change *"Do NOT mention price, ritual, or offer yet"* → *"Do NOT mention price or the offer
yet — but END message 3 by signalling this block CAN be cleared (you've done it before)."* Bridges diagnosis →
clearing so Step 3 isn't a cold spring.

### Change 3 — `valueExplain` close echoes clearing
`prompts.ts:949-963`. Add to message 1: tie the vision to *"once this is cleared…"* so the close reinforces
the mechanism (the vision lives on the far side of the clearing), not just the dream.

### Change 4 — Un-orphan the canonical copy (kills the drift)
Make `getOfferExplanation`/`getPitchMessages` the single source of truth: either (a) **inject** them into the
live pitch / `valueExplain` so the hardcoded pitch and canonical copy can't diverge and the `:1027` phantom
resolves, or (b) **delete** them if the hardcoded pitch stays authoritative. Recommend (a) — it strengthens
clearing *and* removes dead code in one move.

### Change 5 — Canonical vocabulary
Standardize the **solution verb = "clear/clearing"** everywhere (the *problem* stays "block/shadow"). Today
the resolution drifts across "sever / seal / release / lift." Pick **CLEAR** as the through-verb so Act 1 is
unmistakable and *"protect what we **cleared**"* (U1) / *"the **clearing** handles the block"* (U2) land.

## Sequencing / risk

- Changes 1, 3, 5 are low-risk wording edits. Change 2 slightly softens the crisis (foreshadows relief) — keep
  it a *single* end-line so it doesn't deflate urgency before the pitch. Change 4 is a small refactor.
- All are `prompts.ts` + one `useConversation.ts` block — the same hot path as the vague-questions fix (`06`),
  so batch them into one review pass.
- Verify by re-running `evidence/flow-transcript.mjs` and reading the crisis→permission→pitch stretch: "clear"
  should now appear as a *building* thread, not a single late beat.
