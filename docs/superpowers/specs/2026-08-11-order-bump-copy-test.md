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

## Run plan (decided 2026-08-11)

**Straight 2-arm A/B: control vs variation A (double-strength ritual).**
Variation B is built and tested but PARKED — a later run, its own key.

Seed: `improve-v1/create-bump-copy-experiment-2026-08-11.sql`, key
`v1_bump_copy_2026`.

| Arm | Payload | Renders |
|---|---|---|
| A (control) | `{"bump": true}` | today's copy |
| B (treatment) | `{"bump": true, "copy": "A"}` | double-strength ritual |

⚠ Arm letters ≠ copy letters. "Variation A" (the ritual copy) is ARM B. The arm
keys are A/B because `tally()` defaults to `controlKey='A'`/`treatmentKey='B'`.

A 2-arm test is also what the stats code actually supports — `experiments.ts:563`
says "SRM + significance below are the 2-arm A/B case", and `significant` is a
plain `p < 0.05` with no multiple-comparison correction. A 3-way would have
needed both arms read at p < 0.025 and ~1.8× the volume.

## Test math

At a 30% control, 80% power, p<0.05:

| Lift to detect | Buyers per arm |
|---|---|
| 30% → 35% | ~1,374 |
| 30% → 40% | ~353 |
| 30% → 45% | ~157 |

⚠ **`targetN` is in LEADS, the numbers above are in BUYERS.** targetN gates on
exposures, and an exposure here is a lead (`resolveV1Bump` runs at lead capture).
So `targetN = (buyers per arm) / (leads→main-buyer rate)`. The old test's 1200 was
sized for a different question. Step 0 of the seed file has the query that
measures the ratio.

## STOPPING RULE — operator decision, 2026-08-11

**Evaluate at 100 total bump purchases across both arms.** Pre-registered here so
it is a rule and not a peek.

That is ~150 offered-and-paid buyers per arm, which powers a detectable lift of
roughly **30% → 45%** (80% power, p<0.05). Stated plainly:

| True lift | Readable at 100 bump purchases? |
|---|---|
| 30% → 45% | yes |
| 30% → 40% | borderline — expect ambiguity |
| 30% → 35% | no |

🔴 **A TIE AT 100 IS NOT "NO DIFFERENCE".** It rules out a big win; it says
nothing about a modest one. If the read comes back level and the arms look close,
the options are (a) keep running to ~250 bump purchases, which is what settles
30%→40%, or (b) call it "no big win" and move to variation B. Do not record a tie
here as "the ritual copy doesn't work".

Conversion for targetN: 100 bump purchases ≈ 150 buyers/arm ≈ `150 / (leads→buyer
rate)` exposures per arm. The take-rate query in step 5 of the seed file is what
actually counts the 100 — targetN only unlocks the dashboard verdict.

## Measurement

Existing `tallyV1BumpTakeRate()` already reports both rates. **Quote
`paidWithBump / offeredAndPaid`** (money), not `saidYes / offered` (intent) — an
abandoned $47.77 cart is not bump revenue.

## How an arm is selected

The copy arm lives in the experiment payload's `copy` key, NOT in the arm id:

```jsonc
{ "bump": true }               // → control (today's live payload)
{ "bump": true, "copy": "A" }  // → double-strength ritual
{ "bump": true, "copy": "B" }  // → the channel is already open
```

`bumpCopyFromPayload()` validates it and falls back to `control` on anything
unrecognised, so a typo degrades to the shipped copy rather than to a blank card.

⚠ The experiment's own arms are ALSO named A/B (they decide whether the bump is
offered at all). Two namespaces, same letters. Always read the copy arm from
`payload.copy`, never from `assignment.variant`.

**QA without starting the experiment:** set `V1_BUMP_QA_EMAILS` (existing) plus
`V1_BUMP_QA_COPY=A` or `=B` (new). Those testers see and can buy the chosen arm
on a real checkout while every real buyer stays on control.

## Status

- [x] Ground truth verified
- [x] Copy locked
- [x] Variants built — 48 unit tests, `npx tsx --test server/lib/orderBump.test.ts`
- [x] Seed written — `improve-v1/create-bump-copy-experiment-2026-08-11.sql`
- [x] Cutover made reversible — kill switch is arm B weight → 0 from
      /admin/experiments (needs `scope.freezeAssignment`, which the seed now sets)
- [x] Stopping rule decided — 100 total bump purchases (operator, 2026-08-11)
- [ ] targetN sized (run step 0 of the seed) — **freezes on start, cannot be
      changed later without a new experiment**
- [ ] Seeded + started in /admin/experiments — **on that environment's DB**
- [ ] Code deployed (that IS the cutover — no env var on any environment)
- [ ] Reviewed before go-live (use `V1_BUMP_QA_COPY=A` locally to eyeball it)

**Cutover procedure (revised 2026-08-11 — Mike).** The key is a hardcoded
constant in `shared/orderBump.ts`, exactly as `v1_order_bump_2026` shipped; no
Railway variable is set anywhere. What makes it safe is ORDER: seed + start the
experiment on that environment's database FIRST, deploy SECOND. The row is inert
until the code ships, so there is no window in either direction — but deploying
first would leave every checkout with no bump until the row is started.

Dev and Production are **separate databases** (they shared one until 2026-08), so
each needs its own seed + start before its own deploy.

Unlike the old plan, merging this DOES change behaviour once deployed: the
default key moves to `v1_bump_copy_2026`, so that experiment must exist and be
running on that DB first. The old env-var design deliberately made merging inert;
that reversibility now lives in the weights instead, which is a faster kill and
needs no restart.
