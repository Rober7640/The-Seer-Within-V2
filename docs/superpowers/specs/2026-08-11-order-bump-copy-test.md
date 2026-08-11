# V1 Order Bump — Copy Split Test

Branch: `orderbump-test` (off `be-offers`)
Date: 2026-08-11
Supersedes the "copy is a placeholder" open question in
`docs/superpowers/specs/2026-07-26-v1-reading-bump-design.md`.

## Why now

The bump ships live at **30%+ take rate**. This is a test to beat a strong
control, not a fix for a broken one. Everything below treats the current copy as
the incumbent and changes exactly one thing per arm.

## Ground truth (verified 2026-08-11)

| Fact | Evidence |
|---|---|
| Bump runs on fb-palm + fb-tarot ONLY | `experiments.ts` — `scope.funnel = ['v1-palm','v1-tarot']` |
| Both funnels skip the topic picker, hardcode love | `palmReads.ts:1080`, `tarotReads.ts:2636` — `hookToBucket() { return 'love' }` |
| Therefore every live buyer is paired to Money | `BUMP_PAIRINGS.love = 'money'` |
| Live copy == this branch's copy | `git diff origin/Production HEAD -- shared/orderBump.ts` is empty |

**Consequence:** the four-branch pairing table has never fired anything but the
`love → money` path on real traffic. `pairedBumpBucket()` stays in place as a
safety net for a future root-funnel rollout, but no arm below depends on it
varying.

## The product being bumped

The $35 main offer is an **Energy Clearing Ritual** — an act Evelyn performs
(`server/routes.ts:653`, pitch at `useConversation.ts:1811`). The 5-7 page
reading emailed within 24h is the deliverable/receipt of that act, not the
product. This distinction is what separates the two variants:

- **Variation A** bumps the ACT (a stronger clearing).
- **Variation B** bumps nothing — same offer as control, better description.

## Arms

### Control — live, unchanged

```
Before I prepare your clearing… I'm also sensing something blocking your
Money path. Want me to reveal that too? Just $12.77 more for the double reading.
```

### Variation A — double-strength ritual

Sells a stronger act. Drops the second reading entirely.

```
Before I begin, {firstName} — one thing.

A shadow this old has roots. Three hours gets its hold. It doesn't always get
the root.

For $12.77 I'll go twice as deep tonight. Six hours instead of three, double the
force, all the way down.

It drains me more. But nothing gets left in you.
```

### Variation B — the channel is already open

Same offer as control. Description only.

```
I'm already in your energy tonight — the channel's open, and I can see a second
thread pulling at your Money side. Reading it now costs $12.77 because I don't
have to open the way twice. Tomorrow it's a new reading at full price.
```

## Surface matrix

| Surface | Control | A | B |
|---|---|---|---|
| Accept button | Yes, double it | Yes — go all the way down | *= control* |
| Decline button | No, just my reading | No, the standard clearing is enough | *= control* |
| Price row | + $12.77 · $47.77 total | *= control* | *= control* |
| Trust row | 🔒 30-Day Guarantee · 100% Secure | *= control* | *= control* |
| Stripe line name | + Double Your Reading Add-On | + Double-Strength Clearing | *= control* |
| Stripe line desc | Your second reading — Money path | Twice the depth on tonight's clearing | *= control* |
| Offer sold | 2nd reading (Money) | Stronger clearing | 2nd reading (Money) |
| Fulfilment | Mike writes a 2nd reading | **Removes** the 2nd reading | unchanged |
| Code delta | — | 2 strings + retire `BUMP_PAIRINGS` | **1 string** (`bumpOfferCopy`) |

B is a pure description test: same buttons, same Stripe line, same fulfilment.
A win is attributable to the copy alone.

## What each arm is betting on

| Arm | Bet |
|---|---|
| Control | More reading = more value. |
| A | She is buying the act, so sell a stronger act. |
| B | The price needs a reason and the offer needs a clock. Control has neither. |

Note B deliberately does NOT argue *why Money* — it argues why cheap ("the
channel's open") and why now ("tomorrow it's a new reading at full price"). Read
the result accordingly.

## Guardrails

**Do not move `V1_BUMP_PRODUCT_KEY = 'double_reading'`.** Mike's n8n filter
exact-matches it. Customer-facing names are free to change; that metadata key is
not.

**Variation A must stay in the DEPTH lane.** Upsell 1 (Protection Ritual, $47)
owns durability — its entire gap is "removal is only half the work, your field
rebuilds raw for 30 days and shadows creep back"
(`client/src/lib/upsellMessages.ts`). If the bump promises "so it won't come
back", U1 has nothing left to sell. A's copy says "nothing gets left in you"
(depth, tonight) on purpose.

**Two open decisions on A, for Joel + Mike — not blockers, but decide before
go-live:**
1. Does the "six hours instead of three" claim match what is actually performed?
2. Dropping the second written reading changes what the 30-day guarantee covers.

## Test math

At a 30% control:

| Lift to detect | Buyers per arm |
|---|---|
| 30% → 35% | ~1,350 |
| 30% → 40% | ~340 |
| 30% → 45% | ~150 |

Only large swings are readable in reasonable time. Three-way splits divide
traffic three ways — prefer Control vs B first unless volume supports more.

## Measurement

Existing `tallyV1BumpTakeRate()` already reports both rates. **Quote
`paidWithBump / offeredAndPaid`** (money), not `saidYes / offered` (intent) — an
abandoned $47.77 cart is not bump revenue.

## Status

- [x] Ground truth verified
- [x] Copy locked
- [ ] Variants built
- [ ] Seeded DRAFT/OFF
- [ ] Reviewed before go-live
