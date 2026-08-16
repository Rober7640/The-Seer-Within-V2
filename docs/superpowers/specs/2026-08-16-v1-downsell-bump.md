# V1 downsell bump — add it to the $25 path, split $12.77 vs $9.77

**Status:** specced, not built.
**Type:** A/B, but with a **DATE-based stopping rule** — it will never reach significance.
Read §2 before touching the numbers.
**Independent of** `v1_close_depth_2026` — different beat, not an arm, immaterial size (§3).
**Queue entry:** `docs/v1-test-queue.md` item 2.

---

## 1. What this is

Today the downsell **never carries a bump**. `useConversation.ts:2093`:

```js
// MAIN ONLY: the $25/$35 downsell is already the cheaper branch and never
// carries a bump, so it goes straight through.
if (type !== 'main' || chat.userData.orderBump !== true) {
  await handlePurchase(type)
  return
}
```

This adds it, and splits the price: **$12.77 (arm A) vs $9.77 (arm B)**.

⚠ **That comment is a deliberate decision, not an oversight.** "Already the cheaper branch"
is a real argument: she has now told you twice that money is tight, and a third ask can
read as grabby on a funnel that has already retired one test for exactly that
(sliding-scale, 2026-07-22). This spec reverses that call — knowingly, and with a guardrail
(§6) rather than an assumption that it is fine.

---

## 2. 🔴 THIS TEST WILL NOT REACH SIGNIFICANCE. Read this before looking at it.

|                                     |                           |
|-------------------------------------|---------------------------|
| Downsell buyers                     | ~60/month at current pace |
| Lift $9.77 needs just to BREAK EVEN | **+31% relative** on take |
| Sample to detect that at 80% power  | 295/arm = **590 offers**  |
| Time to get there                   | **~10 months**            |

**So the stopping rule is a DATE, not a p-value.** Stop at **2026-11-17** (3 months), take
whichever arm has higher revenue per downsell buyer, and ship it. It will not be
significant. That is the design, not a failure of it.

**Why that is defensible here and not generally.** Significance exists to stop an expensive
mistake. This whole item is worth ~$130/month, so being wrong costs about **$65/month**.
Paying seven extra months of indecision to avoid a $65 risk is the worse trade. On anything
larger, run it properly.

⚠ **Do not extend it when it is not significant at the stop date.** It never will be. The
extension is how a 3-month test becomes a permanent one, and this funnel has already
produced three component-metric winners read off noise.

### Why $9.77 is the challenger

**Match the ratio, not the absolute.** $12.77 is a third of a $35 order but **half** of a
$25 one:

| Bump   | on  | uplift on her order          |
|--------|-----|------------------------------|
| $12.77 | $35 | 36.5%                        |
| $12.77 | $25 | **51.1%** ← disproportionate |
| $9.77  | $25 | **39.1%** ← near parity      |

Exact parity is $9.12. **$9.77** is within 7% and keeps the `.77` charm shape used
everywhere else in the funnel.

**Weak prior evidence, recorded as weak:** downsell buyers who happened to see the bump on
their *main* attempt took it at **33.3% (n=9)** vs 37–50% on the main path. Directionally
consistent with "$12.77 is too much there"; proves nothing at that n.

---

## 2b. Experiment definition

```jsonc
{
  "key": "v1_downsell_bump_price_2026",
  "status": "draft",
  "subjectType": "email",
  "variants": [
    { "key": "A", "weight": 50, "payload": { "bumpCents": 1277 } },
    { "key": "B", "weight": 50, "payload": { "bumpCents": 977 } }
  ],
  "scope": { "funnel": ["v1-tarot"] }
}
```

| Parameter   | Value                                                                                                                                           |
|-------------|-------------------------------------------------------------------------------------------------------------------------------------------------|
| **Primary** | **Revenue per downsell buyer** — never take-rate. $9.77 will win take almost by definition; at a 37% baseline it needs 48.6% just to draw level |
| Guardrail   | **Downsell completion.** The risk is the third ask costing a $25 sale worth twice the bump                                                      |
| Stop        | **Date: 2026-11-17.** Not a p-value                                                                                                             |
| Decide      | Higher revenue per downsell buyer. Accept it is not significant                                                                                 |
| Revert      | One constant — if downsell buyers visibly fall, revert first and investigate after                                                              |

⚠ **May collide with `hours-55-35_tarot` later** — that test moves the bump row inside its
new offer card. Verify the downsell render is genuinely separate before starting 55/35
while this is live. Believed separate; not confirmed.

---

## 3. Why it does not disturb `v1_close_depth_2026`

|                |                                                                           |
|----------------|---------------------------------------------------------------------------|
| Different beat | Close depth rewrites the pitch bubbles; the bump is the row before Stripe |
| Not an arm     | Shipped to everyone, so it lands identically on both close-depth arms     |
| Immaterial     | ~$130/month over ~430 buyers = **$0.30/buyer** against $59/buyer          |

The arm-vs-arm comparison is untouched. **One caveat:** shipping mid-test means pooled
before/after revenue is not comparable across the ship date. The A/B read is fine; a
period-over-period read is not.

---

## 4. Code changes

`V1_BUMP_CENTS` is one constant with ~10 consumers. The work is threading a tier through
them, not the pricing itself.

### 4.1 `shared/orderBump.ts` — make the price tier-aware

```ts
/** Main-path bump price, in cents. */
export const V1_BUMP_CENTS = 1277;

/**
 * Downsell-path bump price. Lower on purpose: $12.77 is 36.5% of a $35 order but
 * 51.1% of a $25 one, and she reached the downsell by saying $35 was too much.
 * $9.77 restores near-parity at 39.1% (exact parity would be $9.12).
 */
export const V1_BUMP_CENTS_DOWNSELL = 977;

export type BumpTier = 'main' | 'downsell';

export function bumpCents(tier: BumpTier = 'main'): number {
  return tier === 'downsell' ? V1_BUMP_CENTS_DOWNSELL : V1_BUMP_CENTS;
}
export function bumpPriceLabel(tier: BumpTier = 'main'): string {
  return `$${(bumpCents(tier) / 100).toFixed(2)}`;
}
```

**Keep `V1_BUMP_PRICE_LABEL` exported and unchanged** so nothing that does not care about
tier has to be touched. New callers use `bumpPriceLabel(tier)`.

### 4.2 The three copy functions take a tier

`bumpOfferCopy`, `variationAOffer`, `variationBOffer` interpolate `V1_BUMP_PRICE_LABEL`.
Add `tier: BumpTier = 'main'` as a trailing parameter and swap to `bumpPriceLabel(tier)`.
Defaulting to `'main'` keeps every existing call site byte-identical.

### 4.3 `client/src/hooks/useConversation.ts` — let the downsell through

```ts
const startPurchase = useCallback(async (type: 'main' | 'downsell' = 'main') => {
  if (chat.userData.orderBump !== true) {          // was: type !== 'main' || ...
    await handlePurchase(type)
    return
  }
  updateUserData({ bumpBucket: paired, bumpTier: type })   // stash for the card + checkout
  trackPH('bump_offered', { ..., price_cents: bumpCents(type), bump_tier: type })
  ...
```

`answerBump` must pass the same tier to `/api/checkout`, and `bumpTier` needs adding to
`UserData` in `client/src/types/chat.ts`.

### 4.4 `client/src/components/BumpOfferCard.tsx`

Takes `tier` and renders `bumpPriceLabel(tier)` instead of the constant.

### 4.5 `server/routes.ts` — three uses, all must agree with what she was shown

Lines ~821 (`bumpAmount` metadata), ~917 (Stripe `unit_amount`), ~1009 (`bumpAmountCents`
on the conversation row).

🔴 **Resolve BOTH the tier and the arm server-side. Never trust a client-sent price.**
The existing bump already re-resolves its arm on the server for exactly this reason; a
client-supplied amount is a free discount for anyone with dev tools.

```ts
const bumpTier: BumpTier = type === 'downsell' ? 'downsell' : 'main';
// Main path keeps the flat constant. Only the downsell is under test, so only it
// reads an arm — and if the experiment is draft/OFF the arm is absent and it falls
// back to 1277, i.e. today's behaviour for a path that has no bump at all yet.
const priceArm = bumpTier === 'downsell'
  ? await assign('v1_downsell_bump_price_2026', hashEmail(email), { conversationId })
  : null;
const bumpCentsResolved = bumpTier === 'downsell'
  ? (priceArm?.bumpCents === 977 ? 977 : V1_BUMP_CENTS)
  : V1_BUMP_CENTS;
```

**Validate the arm value against a closed set** (`977 | 1277`) rather than reading it
straight from the payload — it reaches a Stripe line item, and the same rule already
governs `bumpBucket` and `bumpCopy`.

---

## 5. Tests

`server/lib/orderBump.test.ts:116` asserts `V1_BUMP_CENTS === 1277`. Keep it, and add:

- `bumpCents()` and `bumpPriceLabel()` still return the main values (default unchanged)
- the copy functions with no tier argument return byte-identical strings to today
- a downsell checkout in **arm B** produces a **977** Stripe line
- a downsell checkout in **arm A** produces a **1277** Stripe line
- a downsell checkout with the experiment **draft/OFF** produces **1277** — the arm is
  absent and it must fall back, not throw or charge zero
- a junk `bumpCents` in the payload falls back to 1277, never reaches Stripe

That last one is the one that matters: a mismatch between what she was shown and what she
is charged is the failure mode this whole tier-threading exists to avoid.

---

## 6. Guardrail while it runs

**Watch downsell completion, not bump take.** The risk is not that few people take the
bump — it is that the third ask costs a $25 sale worth twice the bump. This applies to
BOTH arms: the failure mode is adding a bump at all, not which price it carries.

| Metric              | Where                                                  | Stop if            |
|---------------------|--------------------------------------------------------|--------------------|
| Downsell completion | `purchase_type='downsell'` buyers / downsell CTA shown | drops >10%         |
| Downsell bump take  | `bump_purchased` among downsell buyers                 | (information only) |

At ~38 downsell buyers/month a 10% drop is ~4 buyers — **below the noise floor for weeks.**
So this guardrail cannot be automated into a stopping rule; it is a monthly eyeball, and if
downsell buyers visibly fall, revert first and ask questions after. Reverting is a
one-constant change.

---

## 7. Worth

~$130/month at a 27% take. **Do it because the downsell currently carries no bump at all,
not because the money is meaningful** — and do not let it displace anything in the queue.
The price split rides along for the cost of one extra arm, since the tier is being threaded
through regardless.
