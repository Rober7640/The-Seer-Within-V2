# V1 Close — "The Hours Are Mine to Give" ($55 cost / $35 help)

**Date:** 2026-08-11 · **Status:** design, approved for spec · **Ships dark.**

---

## Decisions (operator, 2026-08-11)

| | |
|---|---|
| **Funnel** | **fb-tarot** (`v1-tarot`) |
| **Timing** | **after `v1_bump_copy_2026` is called** — review-gate option 1. Both fb-tarot tests (bump copy, opener B-vs-C) are expected called by **Mon 2026-08-17**, so the earliest realistic start is that week |
| **Variant id** | `hours-55-35_tarot`, scoped `"funnel": "v1-tarot"` |
| **Effect on §4** | the bump test will be closed by then, so the bump **does** move into the card as designed |

fb-tarot is a bump funnel, so option 2 (a bump-free funnel) does not apply and
the wait is what keeps the bump test clean.

---

## ⚠ REVIEW GATE — re-check immediately before implementation

**Resolved in principle (wait for the bump test), but both items below must be
re-verified against live state on the day work starts.** Experiment status
changes in the database, not in this document.

### Gate 1 — the order-bump copy test *(resolved: wait)*

**This design moves the order bump, and the order bump is mid-test. Do not start
building until it is called.**

`v1_bump_copy_2026` (spec: `2026-08-11-order-bump-copy-test.md`) is a 2-arm test
— today's bump copy vs. variation A ("double-strength ritual") — with a
**pre-registered stopping rule: evaluate at 100 total bump purchases across both
arms.** It runs on **fb-palm and fb-tarot**.

What collides:

| | Bump today | Under this design |
|---|---|---|
| Surface | a chat turn **after** the buy CTA | a row **inside** the checkout card |
| When she sees it | after committing to buy | before committing |
| Who sees it | main-tier buyers only | both tiers |
| Choice shape | two buttons, accept / decline | a checkbox alongside a tier radio |

Take-rate is measured against exposures. Changing where and when the offer
appears changes the take-rate itself, so bump numbers from before and after the
change are not comparable. Shipping this mid-flight would contaminate a test
that already has a stopping rule pre-registered against peeking.

**Three ways out — ✅ option 1 chosen:**

1. ✅ **Wait.** Hold this build until `v1_bump_copy_2026` reaches its
   100-purchase stopping rule and is called. Cleanest; costs time.
2. ~~Run on a funnel the bump isn't on~~ — n/a, fb-tarot is a bump funnel.
3. ~~Ship the card without the bump row~~ — unnecessary once the test is called.

**Pre-flight check:** confirm `v1_bump_copy_2026` is `completed` (not `running`)
and that its result has been recorded, before the first commit of this build.

**Second, smaller interaction, same gate:** this design puts the $35 help tier on
a normal `main` checkout, which makes help-tier buyers **bump-eligible** —
whereas the retired sliding arm's $35 rode `type: 'downsell'` and was silently
excluded. That is the correct behaviour, but it changes the bump's eligible
population, so the bump baseline measured before this arm is not comparable to
the one after it. Record the switchover date with the readout.

### Gate 2 — the fb-tarot opener test *(expected clear by Mon 2026-08-17)*

**Operator, 2026-08-11: the B-vs-C test is expected to be called by Monday
2026-08-17**, around the same time as the bump copy test. The intended state at
go-live is therefore **both gates clear and this close test runs alone on
fb-tarot** — no crossed factors, no stratified readout needed. The fallback
below applies only if that slips.

`v1_tarot_version_bc_2026` (seed:
`improve-v1/create-tarot-version-experiment-2026-08-10.sql`) splits the
**/fb-tarot opener** — Version B (smart template) vs Version C (LLM, incumbent)
— scoped to funnel `v1-tarot` across 4 (hook, deck) landers, with
`freezeAssignment`. It was seeded 2026-08-10, one day before this design.

That test lives **upstream** of this one: it changes the opening reading, this
changes the close. They are crossed factors, not competing surfaces, so they can
run together — but a different opener can plausibly change how the close lands,
and running both multiplies the variance on a single funnel.

**Before go-live, check its status and pick:**

- **Called or draft** → nothing to do, run the close test alone.
- **Still running** → either hold this arm until it finishes, or accept the
  crossed design and **stratify the readout by version arm** (report
  revenue/visitor for close × opener, not close alone). Do not report a headline
  close result that silently averages over two openers.

Whichever is chosen, record it here before the first commit.

---

## Background

The V1 funnel pitches a flat **$35 Energy Clearing Ritual**, framed as a "sacred
offering", with the price hidden until the permission gate. A previous two-tier
attempt — the **sliding-scale close** (`55-35*` variants, built 2026-07-13,
retired 2026-07-22) — ported the Lourdes prayer-candle close: pitch $55, offer
$35 "so money is never in the way". It did not reproduce the Lourdes result.

A beat-by-beat diff against the Lourdes original found four load-bearing
divergences. All four pushed the close from *giving* toward *shopping*:

| # | Lourdes | TSW as shipped | Effect |
|---|---|---|---|
| 2 | "costs **our small team** about $55" | "The **full offering for this work** is $55" | a cost you can fall short of → a price she charges |
| 3 | candle, printed petition card, journey to France | "the hours in ritual tonight, the tracing and sealing, every page" | external objects → the seller's own time |
| 4 | hand-labour + photo, "**by a person, not a machine**" | "It comes with my **30-day guarantee**", then "hundreds of seekers" | labour legitimacy → two transaction signals, immediately before a generosity ask |
| 6 | "give **a little less** if things are tight" (never numbered) | "there is a second offering — **$35**" | an unshaped concession → a published second price |

Plus three card-level defects: the `RECOMMENDED` badge is a seller's
instruction where Lourdes uses `MOST CHOSEN` (herd evidence); the $35 note
*equalizes* ("the clearing is the same") where Lourdes *absolves* ("we'll cover
the rest"); and the $55 tier is the only element written as a seller imperative
("Cover the Full Offering") while the $35 tier speaks in her first person — so
the one option that sounds like *her* is the discount.

Beat 4 was skipped deliberately: "by a person, not a machine" was not a claim
this business would make at the charge moment. That left the close running
without its justification.

## Goal

Fill beat 4 with a claim this business *can* make — **Evelyn does not charge for
her hours** — and rebuild the close and card to the Lourdes structure.

This changes what the money *is*. It stops being payment for a service and
becomes reimbursement for what the night consumes. The $20 gap between the tiers
becomes visible and concrete: it is Evelyn's night.

Second-order effects, all wanted:

- **$35 loses its shame.** It is what she actually asks for, not a confession of
  hardship. (The Lourdes identity label is kept anyway — see Open Questions.)
- **$55 becomes gratitude, not compliance.** "I won't let her work a night for
  nothing" is status-positive for a 55–75 female audience, where "I qualify for
  a discount" is not.
- **The guarantee becomes credible.** Returning money that only ever covered
  materials is an easy promise.
- **It differentiates against the category.** This audience has been worked by
  $3/minute readers. "I don't sell my hours by the minute" is a direct hit.

**Primary metric:** revenue per visitor measured **through `/success`** (not
checkout conversion), plus the $55/$35 tier mix and downstream U1/U2 take.

## Scope

**In:** a new price-variant close for the V1 chat funnel — pitch bubbles, a new
checkout card, a tier-aware checkout, the order-bump row moved inside the card,
and removal of the objection step-down within this arm.

**Out:** any change to the product, fulfilment, upsells 1 and 2, the landing
pages, the classic `35`/`45`/`59` arms, or the retired `55-35*` arm (left
untouched and unreachable).

**Ships dark:** with no `hours-55-35*` variant in `system_config.v1_price_variants`,
every path is byte-identical to today.

---

## The copy

### The seven bubbles

Delivered at pitch step 5 (`useConversation.ts` `handlePermission`), replacing
the classic 3-bubble price block. Each maps to a Lourdes beat.

| # | Job |
|---|---|
| 1 | Frame what follows as disclosure, not an ask |
| 2 | The anchor enters as a **cost** |
| 3 | Itemize what that cost covers |
| 4 | **Labour legitimacy — the hours are given, not sold** |
| 5 | The permission line |
| 6 | The choice, and decouple price from fulfilment |
| 7 | Unity |

> Before I begin, {firstName}, let me be honest with you about how this works.
>
> A night of this work costs about $55.
>
> That's the candle that burns from dusk until it's finished, the salt and the oils, your pages written out after — and the hours themselves.
>
> But the hours are mine to give. What I have was given to me, and I've never sold it back — so I don't ask you to cover them.
>
> And money should never be what keeps a woman from her clearing.
>
> So choose what's right for you: cover the full cost, or give only what the night burns — your clearing is carried just the same.
>
> Whatever you choose, I begin tonight, and we walk it together. 🤍

**$35 is never spoken.** It exists in the bubbles only as *"what the night
burns"*; the card puts the number on it. This mirrors the Lourdes original,
where the lesser tier is never numbered in conversation.

**Ordering change within this arm:** the 30-day guarantee and the social-proof
line ("hundreds of seekers…") move **above** bubble 1, so the run ends on the
offering rather than on refund terms. In the classic arms they stay where they
are.

### The checkout card

```
┌─ CHECKOUT CARD ──────────────────────────────────────────
│
│  ╭─ clearing-summary ───────────────────────────
│  │  🕯️  What I'll do for you tonight
│  │   • Your clearing performed by hand, from
│  │     dusk until it's finished — 2-3 hours
│  │   • The block traced to its root and sealed
│  │     so it can't return
│  │   • Your 5-7 page reading in your inbox
│  │     within 24 hours — what I found, what
│  │     I cleared, and your next 30 days
│  ╰──────────────────────────────────────────────
│
│  ╭─ paypanel ───────────────────────────────────
│  │
│  │   Begin my clearing
│  │   Choose what's right for you — your
│  │   clearing is carried just the same.
│  │
│  │   ╭─ radio ──────────────────────────────
│  │   │  I Need a Little Help          $35
│  │   │
│  │   │  "Please begin my clearing tonight.
│  │   │   I can't cover the full cost right
│  │   │   now, but I still want this work
│  │   │   done for me."                      ← HER words, first person
│  │   │
│  │   │  I'm honoured to carry you — the
│  │   │  hours are mine to give.             ← absolution, not a discount
│  │   ╰──────────────────────────────────────
│  │
│  │   ╭─ radio ────────────[MOST CHOSEN]*
│   │                    *badge OFF at launch —
│   │                     see card rule 5
│  │   │  Cover the Full Cost           $55
│  │   │
│  │   │  "I'm covering the full cost of the
│  │   │   night. Thank you for giving me
│  │   │   your hours."
│  │   │
│  │   │  This is what a night of this work
│  │   │  actually costs.                     ← re-states the anchor
│  │   ╰──────────────────────────────────────
│  ╰──────────────────────────────────────────────
│
│  ╭─ paypanel · bump ────────────────────────────
│  │   Something women often add. It's yours if
│  │   you want it — it doesn't change how your
│  │   clearing is carried.
│  │
│  │   [ ] Read my Money path as well   + $12.77
│  │       While I'm already in your field, I'll
│  │       read the second thread too.
│  ╰──────────────────────────────────────────────
│
│            ( no CTA until a tier is picked )
│
│   🔒 Secure checkout · your reading stays between us
│
└──────────────────────────────────────────────────────────
```

Four layers per tier, each doing a distinct job:

| Layer | $35 | $55 |
|---|---|---|
| **Identity label** | I Need a Little Help | Cover the Full Cost |
| **Price** | $35 | $55 · `MOST CHOSEN` |
| **Her words** (first person) | "Please begin my clearing tonight. I can't cover the full cost right now, but I still want this work done for me." | "I'm covering the full cost of the night. Thank you for giving me your hours." |
| **Note** | *absolves* — "I'm honoured to carry you — the hours are mine to give." | *re-anchors* — "This is what a night of this work actually costs." |

Rules the card must hold to:

1. **Nothing is pre-selected.** `pickedTier = null` on mount. She must tap.
2. **A tier tap is a statement, not a charge.** Only the gold CTA commits.
3. **The CTA does not render until a tier is picked.**
4. **The bump row sits below both tiers,** so it is seen before commitment —
   and is offered on **both** tiers.
5. **`MOST CHOSEN` renders only when true.** Until the mix is known, ship with
   no badge (`badge: null`). Flip it on once the readout supports it.

---

## Architecture

### 1. Variant gating

New prefix in `shared/types.ts`, alongside the existing sliding-close helper:

```ts
export const HOURS_CLOSE_VARIANT_PREFIX = 'hours-55-35'

export function isHoursCloseVariant(id?: string | null): boolean {
  return !!id && id.startsWith(HOURS_CLOSE_VARIANT_PREFIX)
}
```

The prefix deliberately does **not** begin with `55-35`, so
`isSlidingCloseVariant()` (a `startsWith('55-35')` match) stays false for these
ids and the retired arm can never co-fire. Funnel scoping composes as usual:
`hours-55-35`, `hours-55-35_palm`, `hours-55-35_tarot`.

Pool entry shape (`priceCents` = full tier, `downsellCents` = help tier):

```json
{"id":"hours-55-35","weight":1,"priceCents":5500,"downsellCents":3500}
```

### 2. Client

| Piece | File | Behavior |
|---|---|---|
| Pitch bubbles | `useConversation.ts` `handlePermission` | third branch on `isHoursCloseVariant(userData.priceVariantId)`; guarantee + proof hoisted above bubble 1 |
| Card | **new** `client/src/components/ClearingOfferCard.tsx` | the wireframe above; owns `pickedTier` and `bumpTicked` local state |
| Render | `ChatPage.tsx` | new branch **before** the `isSlidingCloseVariant` branch |
| Objection step-down | `useConversation.ts` `handlePitchResponse` | suppressed in this arm (see §5) |

`ClearingChoiceCard.tsx` is **not modified**. The retired arm keeps its exact
behaviour.

### 3. Checkout — the tier field

Today `/api/checkout` prices from `type`:
`priceAmount = type === "downsell" ? downsellCents : mainCents` (`routes.ts:738`).
The retired sliding arm reused `type: 'downsell'` for its $35, which today would
mean a help-tier buyer is **excluded from the order bump** (bump is main-only,
`routes.ts:~672`) and is recorded as `purchase_type = 'downsell'`
(`markPurchased`). Both are wrong for this design.

Instead the client sends `type: 'main'` plus a new optional field:

```ts
tier?: 'help' | 'full'   // only honoured for hours-close variants
```

Server rules:

- Resolve the stored variant for the email, as today. If
  `isHoursCloseVariant(variant.variant)` is **false**, `tier` is ignored
  entirely — every existing arm is byte-identical.
- If true: `priceAmount = tier === 'help' ? variant.downsellCents : variant.priceCents`.
  An absent or unrecognised `tier` falls back to `'full'` (the anchor), never to
  a price the client asked for. Prices still come only from the stored variant —
  a tampered client can never name its own amount.
- `type` stays `'main'`, so `markPurchased(email, 'main')`, the bump resolution,
  and the `/welcome1` success path all behave normally for both tiers.
- Stripe metadata gains `offeringTier: 'help' | 'full'` (absent on every other
  arm) so the mix is readable without inferring it from the amount.
- Client-side FB `InitiateCheckout` / PostHog `checkout_initiated` values use
  the **actual tier amount**, not `priceDollars`.

### 4. The order bump inside the card

> ⚠ **Conditional on Gate 1.** Build this section only once
> `v1_bump_copy_2026` is called. It is live on fb-palm and fb-tarot with a
> pre-registered stopping rule, and fb-tarot is this arm's funnel.

The bump row renders only when `userData.orderBump === true` — the same
experiment gate as today — so the bump test's population is unchanged. What
changes is **where** the choice is made: inside the card, before commitment,
available on both tiers, instead of as a chat turn after the CTA.

`startPurchase` keeps its current contract: the CTA calls it with the picked
tier, and it forwards `bumpOffered` / `bumpAccepted` / `bumpBucket` exactly as
the chat-turn version does. The server continues to re-resolve the arm and
ignore `bumpAccepted` from anyone not in it.

`bump_offered` fires when the card renders with the row visible;
`bump_accepted` / `bump_declined` fire on commit, both carrying
`offering_tier` so take-rate can be read per tier.

**Default tick state:** `false` (unticked) — the wireframe's row copy ("It's
yours if you want it") is written for that default. If the flag is flipped to
ticked, the copy must change with it, to Lourdes' wording: *"It's ticked —
untick it if you'd rather not."* Lourdes defaults its bump ticked;
pre-ticked boxes that add a charge are prohibited in the EU and UK (Consumer
Rights Directive art. 22) and are exposed under FTC negative-option rules. The
default is a single constant so it can be flipped for US-only traffic as an
explicit, recorded decision.

### 5. Objection handling — no step-down

Within this arm the three-objection fallback is **removed**. Both offerings are
already on screen and she has already been told money will not close the door; a
cheaper price introduced after a "no" reads as a haggle.

Two consequences:

- The **$25 written-reading downsell must not fire.** It also directly
  contradicts the itemized story — if a night burns $35 of materials, a $25
  offer says the list was invented.
- On the third objection she gets a short re-statement and the card stays
  visible. `DownsellCTA` never renders in this arm.

`buildObjectionPrompt` (`server/lib/prompts.ts`) gains an hours-close branch:
the $35 is **what the night costs in materials**, the hours are **given**, and
the model must never invent a lower number or imply the help tier is a lesser
clearing.

### 6. Preview

`/chat?close=hours` forces the copy and card without enrolling anyone.
**Copy-only**, exactly like the existing `?close=55`: the charge and the LLM
objection turns still use the stored variant (server authority), so do not
complete checkout or judge objection turns from a preview session.

---

## Data flow

```
/api/lead → assigns hours-55-35* → userData.priceVariantId
  → handlePermission: guarantee + proof, then the 7 bubbles
  → ClearingOfferCard renders (nothing selected, no CTA)
  → she taps a tier            → CTA appears
  → she ticks / unticks bump   → (only if in the bump arm)
  → CTA → startPurchase(tier)  → POST /api/checkout {type:'main', tier, bump*}
  → server re-resolves variant + bump arm, prices from stored cents
  → Stripe session (1 or 2 line items, metadata.offeringTier)
  → /welcome1 → /welcome2 → /success   (identical for both tiers)
```

## Analytics

- `/admin/price-test` picks the variant up automatically by id.
- Tier mix from Stripe `metadata.offeringTier`.
- PostHog: `offering_tier` on `checkout_initiated`, `bump_offered`,
  `bump_accepted`, `bump_declined`.
- **Judge on revenue per visitor through `/success`.** A $55 buyer may have less
  wallet left for the $47 upsells; a front-end-only readout would miss it.

## Testing

- Unit: `isHoursCloseVariant` — true for `hours-55-35*`, false for `55-35*`,
  `35`, `35_palm`, `''`, `undefined`; and `isSlidingCloseVariant` false for
  every `hours-55-35*` id.
- Unit: tier → cents mapping, including `tier` present on a non-hours variant
  (must be ignored) and an unrecognised `tier` (must resolve to `full`).
- Unit: help-tier checkout still resolves the bump arm and still writes
  `purchase_type = 'main'`.
- Flow eval (`improve-v1/evidence/`): full run on the arm — verbatim transcript,
  dead-air audit, screenshots of the card in all three states (nothing picked /
  help picked / full picked).
- Manual: preview both tiers on mobile and desktop before any traffic.
- Add cases to `docs/test-ideas.md` § "V1 hours-are-given close".

## Risks / open questions

1. **The $35 identity label.** Kept as Lourdes' circumstance framing ("I Need a
   Little Help") for fidelity. The alternative — gratitude framing ("The
   Materials Are Mine to Cover" / "I Won't Let You Work a Night for Nothing") —
   removes the last trace of shame from the cheap tier and may fit a love
   audience better, but departs from the pattern known to convert. **Decision:
   run the faithful version first;** the hours-are-given gift is already carried
   by bubble 4 and the absolving note.
2. **No proof artifact.** Lourdes' "a photo, so you can see your candle burning"
   is the strongest trust element on its card and TSW has no equivalent — the
   summary is all promises. Nothing fakeable belongs here. Open product
   question, out of scope for this build.
3. **"About $55" is a cost claim at the charge moment.** Keep the hedge
   ("about") and the item list non-numeric. Do not price items individually.
4. **Two live tests on one screen.** Escalated to the **review gate** at the top
   of this document — it blocks implementation rather than being managed during
   it.
5. **Upsell-2 prompt context** tells the LLM the user "purchased the clearing
   ($priceDollars)" — for a help-tier buyer that reads $55 though she paid $35.
   Pre-existing behaviour class (classic $25 downsell buyers already see "$35"
   there) and the prompt never instructs quoting it. Fix only if it surfaces in
   transcripts.
6. **Sizing.** Funnel is decided (fb-tarot); run length is not. Size it from
   fb-tarot's own main-purchase volume — it is the newest funnel and thinner
   than fb-palm, and the metric is revenue per visitor, which needs more traffic
   than a conversion-rate read. The live `35`-vs-`45` arms on fb/fb2 are the
   nearest elasticity evidence available before committing.
7. **Three tests on one funnel.** With the bump copy test called and this arm
   live, fb-tarot may still carry `v1_tarot_version_bc_2026`. See Gate 2.

## Go-live

Code deploys dark. To start the test, add the variant to `system_config` key
`v1_price_variants` and weight it 50/50 against fb-tarot's current control.

**Read the live pool first** — the array below is illustrative, not the live
state. Whatever `v1-tarot` variants exist today are the control, and every
funnel-scoped variant already in the array (fb, fb2, gdn, palm) must be carried
over untouched.

```json
{"variants":[
  { "...every existing variant, unchanged..." },
  {"id":"35_tarot","funnel":"v1-tarot","priceCents":3500,"downsellCents":2500,"upsell1Cents":4700,"weight":1},
  {"id":"hours-55-35_tarot","funnel":"v1-tarot","priceCents":5500,"downsellCents":3500,"upsell1Cents":4700,"weight":1}
]}
```

If fb-tarot currently has **no** funnel-scoped variant, it is falling back to
the hard-coded $35/$25 default — in which case the control arm must be added
explicitly at the same time, or the test has nothing to measure against.

Assignment is sticky per email; pool cache TTL is 60s.

Verify on the Railway dev service with `V1_PRICE_VARIANTS_JSON` **before**
touching the production `system_config` row — dev and production share one
database, so a config edit is instantly live to real traffic.
