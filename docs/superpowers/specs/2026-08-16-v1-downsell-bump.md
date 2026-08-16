# V1 downsell bump — offer the double reading at $9.77 on the $25 path

**Status:** specced, not built.
**Type:** shipped change, **not an experiment**. See §2 for why it cannot be tested.
**Independent of** `v1_close_depth_2026` — different beat, not an arm, immaterial size (§3).
**Queue entry:** `docs/v1-test-queue.md` item 4.

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

This adds it, priced at **$9.77** rather than the main path's $12.77.

⚠ **That comment is a deliberate decision, not an oversight.** "Already the cheaper branch"
is a real argument: she has now told you twice that money is tight, and a third ask can
read as grabby on a funnel that has already retired one test for exactly that
(sliding-scale, 2026-07-22). This spec reverses that call — knowingly, and with a guardrail
(§6) rather than an assumption that it is fine.

---

## 2. Why $9.77, and why it is not a test

**Match the ratio, not the absolute.** $12.77 is a third of a $35 order but **half** of a
$25 one:

| Bump   | on  | uplift on her order |
|--------|-----|---------------------|
| $12.77 | $35 | 36.5%               |
| $12.77 | $25 | **51.1%** ← disproportionate |
| $9.77  | $25 | **39.1%** ← near parity |

Exact parity is $9.12. **$9.77** is within 7% and keeps the `.77` charm shape used
everywhere else in the funnel.

**It cannot be A/B tested.** ~34 downsell bump offers a month; detecting $9.77 vs $12.77
there needs **10–17 months**. So the choice is a documented decision or nothing.

**Weak supporting evidence, recorded as weak:** downsell buyers who happened to see the
bump on their *main* attempt took it at **33.3% (n=9)** vs 37–50% on the main path.
Directionally consistent; proves nothing at that n. The ratio argument carries this.

---

## 3. Why it does not disturb `v1_close_depth_2026`

| | |
|---|---|
| Different beat | Close depth rewrites the pitch bubbles; the bump is the row before Stripe |
| Not an arm | Shipped to everyone, so it lands identically on both close-depth arms |
| Immaterial | ~$130/month over ~430 buyers = **$0.30/buyer** against $59/buyer |

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

🔴 **Resolve the tier server-side from `req.body.type`, never from a client-sent price.**
The existing bump already re-resolves its arm on the server for exactly this reason; a
client-supplied amount is a free discount for anyone with dev tools.

```ts
const bumpTier: BumpTier = type === 'downsell' ? 'downsell' : 'main';
const bumpCentsResolved = bumpCents(bumpTier);
```

---

## 5. Tests

`server/lib/orderBump.test.ts:116` asserts `V1_BUMP_CENTS === 1277`. Keep it, and add:

- `bumpCents('downsell') === 977` and `bumpPriceLabel('downsell') === '$9.77'`
- `bumpCents()` and `bumpPriceLabel()` still return the main values (default unchanged)
- the copy functions with no tier argument return byte-identical strings to today
- a checkout with `type: 'downsell'` + bump produces a **977** Stripe line, not 1277

That last one is the one that matters: a mismatch between what she was shown and what she
is charged is the failure mode this whole tier-threading exists to avoid.

---

## 6. Guardrail after shipping

**Watch downsell completion, not bump take.** The risk is not that few people take the
bump — it is that the third ask costs a $25 sale worth twice the bump.

| Metric | Where | Stop if |
|---|---|---|
| Downsell completion | `purchase_type='downsell'` buyers / downsell CTA shown | drops >10% |
| Downsell bump take | `bump_purchased` among downsell buyers | (information only) |

At ~38 downsell buyers/month a 10% drop is ~4 buyers — **below the noise floor for weeks.**
So this guardrail cannot be automated into a stopping rule; it is a monthly eyeball, and if
downsell buyers visibly fall, revert first and ask questions after. Reverting is a
one-constant change.

---

## 7. Worth

~$130/month at a 27% take on 34 offers. **The reason to do it is that the current price is
disproportionate, not that the money is meaningful** — do not let it displace anything in
the queue.
