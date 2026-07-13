# 10 — Sliding-Scale Close: $55 Anchor / $35 Grace

**Status: built, ships dark. 2026-07-13.**

## The angle

Instead of pitching the clearing flat at $35, Evelyn pitches the **full offering
at $55** — justified by the labor (hours of ritual + the full written reading) —
and then concludes with grace: *"I have never turned a seeker away over money.
If $55 would strain you, offer $35 instead. The clearing is the same — every
step of it."*

Same product, same ritual, same post-purchase upsell path. Only the offering
differs. The seeker self-selects: anyone who can pay $55 is invited to; anyone
who can't still converts at the proven $35.

Why this can win: the $55 anchor raises perceived value of the $35 (it's now a
kindness, not a price tag), the "I turn no one away" beat is high-trust and
deeply in-voice for Evelyn, and every buyer who takes $55 is +$20 pure margin.
Why it can lose: everyone takes $35 (revenue flat, extra friction from a
two-price decision) — which is exactly what the A/B readout will show.

## How it works (all gated on the variant id)

Everything branches on `isSlidingCloseVariant(priceVariantId)` —
`shared/types.ts`, prefix match on **`55-35`** (so funnel-scoped ids
`55-35_fb`, `55-35_palm` inherit the close). **No `55-35*` variant assigned ⇒
every path is byte-identical to today.** No experiment-framework changes, no
checkout/Stripe changes.

| Piece | File | Behavior on the sliding arm |
|---|---|---|
| Variant id → client | `server/routes.ts` `/api/lead` (already returned it); stashed in `handleEmailCapture` → `userData.priceVariantId` | Close style known at pitch time |
| Step-5 pitch | `client/src/hooks/useConversation.ts` `handlePermission` | 8-message HONEST OFFERING close (honesty preface → fact-price $55 → what it carries → guarantee → proof → grace doctrine → causal bridge "that is exactly why there is a second offering — $35" → equality + unity) |
| Choice card | `client/src/components/ClearingChoiceCard.tsx`, rendered from `ChatPage.tsx` | Two-tier checkout card (Lourdes architecture): deliverables checklist, quiet "$35 · I need a little grace" option FIRST, "$55 · Cover the Full Offering · RECOMMENDED" candle-glow button LAST; grace → `handlePurchase('downsell')` |
| 3-objection fallback | `useConversation.ts` `handlePitchResponse` | Written-reading script replaced with the $35 grace reminder; `DownsellCTA` relabeled "Begin My Energy Clearing - $35" |
| LLM objection turns | `server/lib/prompts.ts` `buildObjectionPrompt` | Price line: $35 is the SAME clearing, never a downgrade/"written reading"; count≥3 hint = grace reminder |
| Server authority | `server/routes.ts` `/api/chat` | `priceVariantId` (like the prices) is overwritten from the conversation row per request — client can't spoof the close style |

The $35 charge rides the existing `type: 'downsell'` checkout: server-side that
is already the same "Energy Clearing Ritual" product with the same
`/welcome1` success URL, so grace buyers see Upsell 1/2 exactly like main
buyers. `/admin/price-test` picks the variant up automatically (id `55-35`,
conversion + revenue/visitor + z-test vs `35`).

## Preview (before any traffic)

`/chat?close=55` forces the sliding copy + both CTAs without enrolling anyone.
**Copy-only**: checkout still charges whatever variant is actually stored for
the email, and LLM objection turns use the stored variant too (server
authority) — so don't complete checkout and don't judge objection turns from a
preview session. Full-fidelity test = flip the config in a staging/canary env.

## Go-live (operator)

Add the variant to `system_config` key `v1_price_variants` and weight it, e.g.
a 50/50 against control on the root funnel:

```json
{"variants":[
  {"id":"35","priceCents":3500,"downsellCents":2500,"weight":1},
  {"id":"55-35","priceCents":5500,"downsellCents":3500,"weight":1}
]}
```

(Keep any live funnel-scoped variants — `35_fb2`/`45_fb2` etc. — in the array
untouched. For a funnel-scoped run use `"id":"55-35_fb", "funnel":"v1-fb"`.
Assignment is sticky per email; cache TTL 60s or hit the admin cache
invalidation.)

Readout: `/admin/price-test` — watch **revenue per visitor** (not conversion
rate; the arm is designed to trade a lower $55-take rate for higher AOV), plus
the $55-vs-$35 take mix within the arm (Stripe metadata `priceVariant=55-35` +
session `type` main/downsell).

## Known nuances

- **Upsell-2 prompt context** (`buildManifestRevealPrompt`) tells the LLM the
  user "purchased the clearing ($priceDollars)" — for a grace buyer that reads
  $55 though they paid $35. Pre-existing behavior class (classic $25 downsell
  buyers already get "$35" there); the prompt never instructs quoting it. Fix
  only if it ever surfaces in transcripts.
- Legacy `getOfferExplanation` / `getPitchMessages` in `prompts.ts` still carry
  the classic wording — both are dead code (no callers), untouched.
- The pre-pitch price-question deflection (`getPriceQuestionResponse`) is
  unchanged — she still doesn't name a price before the pitch, either arm.

Test backlog: `docs/test-ideas.md` § "V1 sliding-scale close".

## Evidence (2026-07-13)

`improve-v1/evidence/sliding-close/` — `transcript-eval.mjs` (flow eval: word-
for-word transcript + dead-air audit + per-turn screenshots + stitched
full-conversation PNG; run per arm against a local dev server), plus
`card-shot.mjs` (fast card design shots via a restored PITCH session).
Sliding-arm run: dead air CLEAN (max quiet gap 14.5s, LLM latency), 0 empty
bubbles, all locked beats verbatim, LLM objection turns framed the $35 as the
same clearing.
