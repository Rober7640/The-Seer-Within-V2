# V1 Main-Offer Price Split Test — PRD

**Status:** Draft
**Author:** Mike (with Claude)
**Date:** 2026-04-27
**Supersedes:** `docs/Front end Price-Split test`

---

## 1. Background & Motivation

The v1 funnel currently sells the "Energy Clearing Ritual" (main offer) at **$35** with a **$25** downsell after 3 objections. Two upsells follow ($47 Protection Ritual, $47/$30 Manifestation Bracelet).

**The problem:** Upsell take-rate has been weak. Most revenue is concentrated in the main offer, which means the price of the main offer is the single biggest lever on revenue per visitor. We have no data on whether $35 is the optimal price — we picked it once and never tested.

**The hypothesis:** A higher main-offer price ($45 or $59) may produce *similar* conversion rates (the audience is qualified by the time they reach pitch) and therefore higher revenue per visitor — without needing the upsell flow to perform better.

**The goal:** Run a 3-way price split test on the main offer. Find the price point that maximises **revenue per visitor** (not conversion rate alone — a higher price with slightly lower conversion can still win).

---

## 2. Variants

| Variant | Main Price | Downsell Price | Traffic Weight |
|---------|-----------|----------------|----------------|
| `35`    | $35       | $25            | 1 (~33%)       |
| `45`    | $45       | $32            | 1 (~33%)       |
| `59`    | $59       | $42            | 1 (~34%)       |

- **Downsell ratio:** ~71% of main, rounded to a clean dollar.
- **Weights are relative.** `1/1/1` = even thirds. A future change to `2/1/1` would shift to 50/25/25 with no code deploy.
- **Variants and weights live in `system_config`** (database), so the marketing team can adjust splits or end the test by zeroing weights without engineering work.

---

## 3. Success Metrics & End Criteria

**Primary metric:** revenue per visitor = `total_revenue_cents / total_conversations_assigned_to_variant`.

**Secondary metrics (reported but not decisional):**
- Main conversion rate (% of variant visitors who bought main)
- Downsell conversion rate (% of those who saw the pitch and took downsell)
- Total revenue per variant
- Sample size per variant

### Test duration: open-ended, manually ended

**The test has no scheduled end date.** It runs continuously from the moment the config row is inserted until a human decides to stop it. There is no automatic cut-off, no time-based expiry, and no engineering work required to end it.

The admin dashboard surfaces a **recommendation** as data accumulates ("Variant 59 leads at $X/visitor — 94% confidence, keep running" → "Variant 45 wins, 96% confidence — safe to call it"), but the recommendation is informational only. The system never auto-ends the test, never zeroes out a variant, and never alerts. The boss (or whoever owns the call) looks at the dashboard whenever they want, and decides on their own timeline whether to:

- **Keep running** — leave the config untouched. Test continues with current weights.
- **Adjust weights** — e.g. ramp the leader up to 60% while keeping the others alive for ongoing data.
- **End the test** — pick a winner and lock it in.

### Statistical guidance (informational, not enforced)

The dashboard treats two thresholds as guidance for the human making the call:

1. **Sample size floor — 100 visitors per variant.** Below this, variance estimates are unstable, so the dashboard shows "Not enough data" and suppresses confidence numbers regardless of where they happen to land. This is just a UI courtesy to prevent calling the test off a noisy 30-visitor sample.
2. **Confidence threshold — 95%.** Standard A/B-test convention. When the leader hits ≥95% confidence vs every other variant *and* sample sizes are above the floor, the dashboard shows a "Winner — safe to call" status badge. Even at this point, **no automatic action is taken** — the human still ends the test manually.

These thresholds inform the recommendation banner but never gate any system behavior.

### How to end the test (when the boss says to)

In the `system_config` row for `v1_price_variants`, set the winner's weight to `1` and the others to `0`:

```json
{
  "variants": [
    { "id": "35", "priceCents": 3500, "downsellCents": 2500, "weight": 0 },
    { "id": "45", "priceCents": 4500, "downsellCents": 3200, "weight": 1 },
    { "id": "59", "priceCents": 5900, "downsellCents": 4200, "weight": 0 }
  ]
}
```

New visitors get the winning price on their next page load. No code deploy. No restart. Existing in-progress conversations keep whatever variant they were assigned (preserving idempotency).

If the boss later wants to re-run the test or test new prices, the same config row gets edited — a fresh test starts immediately.

---

## 4. Current Code State (Verified 2026-04-27)

This section documents what exists *today* so the implementation plan is grounded in reality, not in stale PRD line numbers.

### Hard-coded prices that need to flow from the variant

| File | Line | What's hard-coded | New behavior |
|---|---|---|---|
| `server/routes.ts` | 431 | `priceAmount = type === "downsell" ? 2500 : 3500` in `/api/checkout` | Read variant from conversation row; resolve cents from `system_config` |
| `server/routes.ts` | 708 | Fallback `mainPurchaseAmount: stripeSession.amount_total \|\| 3500` in upsell user-data lookup | Keep — `amount_total` already reflects the variant. (No fallback change needed beyond cosmetic.) |
| `server/lib/prompts.ts` | 330, 345 | Evelyn's objection-handler lines: `"It's $35..."` × 2 | Replace literal with `{{price}}` placeholder; substitute server-side before sending to Claude (or pass via prompt context) |
| `client/src/hooks/useConversation.ts` | 1134 | Pitch copy: `"The sacred offering is $35..."` | Read price from variant data; interpolate |
| `client/src/hooks/useConversation.ts` | 1165–1167 | `const price = type === 'downsell' ? 25 : 35; trackInitiateCheckout(price); trackGAdsCheckout(price)` | Replace literal with variant price |
| `client/src/components/PurchaseCTA.tsx` | 12 | Button: `"Begin My Energy Clearing - $35"` | Accept `price` prop; render dynamically |
| `client/src/components/DownsellCTA.tsx` | 12 | Button: `"Get Your Written Reading - $25"` | Accept `price` prop; render dynamically |

### Things the prior PRD claimed but are already correct / no change needed

- **Webhook verification** (`server/routes/webhooks.ts:651`) uses `metadata.product` ("energy_clearing_ritual") to identify main purchases — **not** `amount_total === 3500`. Already variant-agnostic. No change needed.
- **`UpsellPage.tsx:81`** already reads `data.mainPurchaseAmount` for FB Pixel + GTM + Trackdesk tracking. Auto-adapts the moment checkout uses the variant amount.
- **`DownsellCTA.tsx`** already says `$25` (the prior PRD's `$17` reference is stale).
- **No email templates contain `$35`** — confirmed by codebase grep.

### Things the prior PRD missed

- **`server/lib/db.ts:73` `saveConversation`** has an insert path that does *not* include Stripe/variant fields. Adding columns to the schema isn't enough; the insert must be widened to set `priceVariant`.
- **`server/lib/supabase.ts`** also exports a `saveConversation` — this is dead code (not imported anywhere active). Leave alone, do not modify.
- **`prompts.ts:330,345` price strings are server-side** — they're not just displayed to the user, they're seeded into Claude's prompt context. Need a templating approach so Evelyn's *language* aligns with the *price the user sees*. Otherwise Evelyn might say "$35" while the button says "$45".

---

## 5. Design Decisions

### 5.1 Reuse `mainPurchaseAmount`, don't add `price_amount_cents`

The schema already has `conversations.mainPurchaseAmount` (integer cents). Today it's populated *after* checkout from the Stripe session. Going forward, we'll populate it *at checkout time* from the variant config. This makes "amount actually offered" and "amount actually charged" identical for V1, which is what we want.

A separate `price_amount_cents` column would just duplicate this. **Skip.**

### 5.2 Add only `priceVariant` (and optionally `downsellAmountCents`)

| Column | Type | Why |
|---|---|---|
| `priceVariant` | `text` | The variant label (`"35"`, `"45"`, `"59"`). The *grouping key* for analytics. |
| `downsellAmountCents` | `integer` (optional) | The downsell price for this visitor's variant. Strictly speaking we can derive it from `priceVariant` + config lookup, but storing it makes analytics queries trivial and is robust against future config edits. |

**Recommendation:** add both. Cost is one extra integer column; benefit is reproducible historical analysis.

### 5.3 No new client API endpoint — fold into `/api/lead`

The prior PRD proposed a new `GET /api/price-variant?email=...` endpoint. Simpler: have `/api/lead` return the assigned variant in its response body:

```json
{
  "success": true,
  "priceVariant": "45",
  "priceDollars": 45,
  "downsellDollars": 32
}
```

The client already calls `/api/lead` at email capture, *before* the pitch phase. The variant data arrives exactly when the client first needs it. One fewer endpoint, one fewer network round-trip, one fewer auth surface.

### 5.4 Variant assignment is idempotent

`/api/lead` is called every time an email is captured, including resumed conversations. The assignment logic must:

1. Look up the conversation by email.
2. If it already has a `priceVariant`, return that (don't re-roll).
3. Otherwise, roll the weighted random pick, persist it, return it.

This protects against a user clearing localStorage and starting over getting a *different* price than the one they were originally pitched.

### 5.5 Feature-flagged rollout via config absence

If `system_config.v1_price_variants` is missing or has only one variant with weight 1, behavior reverts to today's hard-coded $35/$25. This means:

- We can ship the code to production with the config row missing → zero behavior change.
- Insert the config row when ready to start the test.
- Zero out all weights but one to end the test.

No environment variables, no separate flag system.

---

## 6. Implementation Plan

Three PRs to keep each reviewable.

### PR 1 — Schema + Seed (additive, no behavior change)

**Files:**
- `shared/schema.ts` — add `priceVariant` and `downsellAmountCents` columns to `conversations`
- `server/scripts/seed.ts` — insert default `system_config.v1_price_variants` row (the marketing team can edit afterwards)

**Migration:** `npm run db:push`

**Risk:** None. Purely additive. Existing rows have `NULL` for the new columns.

**Test:** Run migration locally, confirm columns exist via `psql`. Run seed, confirm config row present.

### PR 2 — Variant Assignment + End-to-End Wiring

**New files:**
- `server/lib/priceVariant.ts` — exports `getActiveVariants()` (reads `system_config`), `pickWeighted(variants)`, `resolveCents(variantId)`. Includes a fallback to `[{ id: '35', priceCents: 3500, downsellCents: 2500, weight: 1 }]` when config is missing.

**Modified files (server):**
- `server/lib/db.ts` — extend `ConversationRecord` and `saveConversation` insert path to accept `priceVariant` and `downsellAmountCents`. Update path leaves variant fields untouched (idempotent).
- `server/routes.ts` `/api/lead` (line 512) — after `saveConversation`, look up the conversation, assign variant if missing, persist, return in response body.
- `server/routes.ts` `/api/checkout` (line 431) — replace hard-coded `2500/3500` with a lookup against the conversation row's variant; fall back to `2500/3500` if no variant. Stamp `priceVariant` on Stripe session metadata.
- `server/lib/prompts.ts` (lines 330, 345) — replace literal `$35` with `${price}` template or pass variant price via the prompt context object. Confirm both objection-handler lines are updated.

**Modified files (client):**
- `client/src/hooks/useConversation.ts`:
  - Store `priceVariant` / `priceDollars` / `downsellDollars` in chat state (or fetch from response when `/api/lead` returns).
  - Line 1134 pitch copy — interpolate price.
  - Lines 1165–1167 — use `priceDollars` (main) or `downsellDollars` (downsell) instead of `25/35`.
- `client/src/components/PurchaseCTA.tsx` — accept `price: number` prop; render `Begin My Energy Clearing - ${price}`.
- `client/src/components/DownsellCTA.tsx` — accept `price: number` prop; render `Get Your Written Reading - ${price}`.

**Risk:** Medium. Touches the live checkout flow.

**Test plan:**
- Local: confirm three variants render correctly (force assignment by manipulating DB).
- Stripe test mode: complete a purchase per variant, verify charge amount matches button text.
- Idempotency: clear localStorage mid-flow, refresh, confirm same variant.
- Fallback: delete `system_config` row, confirm app falls back to $35/$25.

### PR 3 — Admin Analytics Page

**New files:**
- `server/routes/admin/priceTest.ts` — `GET /api/admin/analytics/v1-price-test` (admin auth, same pattern as existing `analytics.ts`).
- `client/src/pages/admin/PriceTestDashboard.tsx` — UI consuming the endpoint.

**Wiring:**
- Mount route in `server/routes/admin/index.ts`.
- Add nav link in admin shell + route in `client/src/App.tsx`.

**Page behavior:** see Section 7.

**Risk:** Low. Read-only. Doesn't touch the checkout flow.

---

## 7. Admin Stats — What the User Asked For

> "How can we check the stats like how many landed on which version and which version converted sale and what's the total — at admin side?"

**Page:** `/admin/price-test` (admin auth required, same as the rest of the dashboard).

### Top-level summary

A plain-English banner at the top:
> *"Variant 59 leads at $4.89 revenue/visitor. 94% confidence vs $35 ($4.14). Keep running — aim for 95%."*
> or
> *"Not enough data yet — variant 35 has 84 conversations, need 100 minimum per variant."*

### Variants table (one row per variant)

| Column | Meaning |
|---|---|
| **Variant** | `35`, `45`, `59` (winning variant highlighted with a badge once 95% confidence is reached) |
| **Main price** | $35 / $45 / $59 |
| **Downsell price** | $25 / $32 / $42 |
| **Visitors assigned** | Count of conversations with this `priceVariant` |
| **Main purchases** | Count where `purchased = true AND purchaseType = 'main'` |
| **Downsell purchases** | Count where `purchased = true AND purchaseType = 'downsell'` |
| **Total purchases** | Main + downsell |
| **Main CR** | main purchases / visitors assigned (%) |
| **Downsell CR** | downsell purchases / visitors assigned (%) |
| **Overall CR** | total purchases / visitors assigned (%) |
| **Total revenue** | Sum of `mainPurchaseAmount` for purchasing rows in this variant ($) |
| **Revenue / visitor** | total revenue / visitors assigned (the decisional metric) |

### Pairwise significance table

For each pair of variants (35-vs-45, 35-vs-59, 45-vs-59):

| Comparison | Revenue/visitor A | Revenue/visitor B | Confidence | Significant? |
|---|---|---|---|---|
| 59 vs 35 | $4.89 | $4.14 | 94.2% | ❌ Keep running |
| 45 vs 35 | $4.45 | $4.14 | 71.3% | ❌ Keep running |
| 59 vs 45 | $4.89 | $4.45 | 78.1% | ❌ Keep running |

A row turns green ✅ once it hits 95%+ AND both variants have ≥100 visitors.

### API contract

```http
GET /api/admin/analytics/v1-price-test
Authorization: <admin session cookie>
```

Response:

```json
{
  "summary": {
    "leadingVariant": "59",
    "recommendation": "Variant 59 leads at $4.89/visitor. 94% confidence vs 35. Keep running — aim for 95%+.",
    "minimumSampleMet": true,
    "winnerCalled": false
  },
  "variants": [
    {
      "variant": "35",
      "mainPriceDollars": 35,
      "downsellPriceDollars": 25,
      "visitorsAssigned": 412,
      "mainPurchases": 38,
      "downsellPurchases": 15,
      "totalPurchases": 53,
      "mainConversionPct": 9.22,
      "downsellConversionPct": 3.64,
      "overallConversionPct": 12.86,
      "totalRevenueCents": 170500,
      "revenuePerVisitorCents": 414
    }
    // ...two more entries
  ],
  "pairwise": [
    {
      "a": "59",
      "b": "35",
      "revenuePerVisitorACents": 489,
      "revenuePerVisitorBCents": 414,
      "confidencePct": 94.2,
      "significant": false
    }
    // ...two more pairs
  ]
}
```

### Significance method

- **Statistic:** z-test on revenue per visitor between two variants. Treats per-visitor revenue as a continuous variable; computes mean + variance per variant, then a pooled z-statistic.
- **Confidence:** `1 - p_value` from the one-tailed test (probability that the higher mean is genuinely higher, not noise).
- **Significant:** confidence ≥ 95% **and** both variants have ≥ 100 visitors. Below that floor, even high confidence is suspect because variance estimates are unstable.
- **Edge case — zero purchases:** if a variant has zero purchases, mean = 0 and variance = 0; z-test denominator becomes 0. Handle by reporting `confidence: null, significant: false, note: "insufficient data"`.

### SQL sketch (per-variant aggregation)

```sql
SELECT
  price_variant,
  COUNT(*) AS visitors_assigned,
  COUNT(*) FILTER (WHERE purchased AND purchase_type = 'main') AS main_purchases,
  COUNT(*) FILTER (WHERE purchased AND purchase_type = 'downsell') AS downsell_purchases,
  COALESCE(SUM(main_purchase_amount) FILTER (WHERE purchased), 0) AS total_revenue_cents
FROM conversations
WHERE price_variant IS NOT NULL
GROUP BY price_variant;
```

---

## 8. Open Questions

Things to confirm with Joel/Robert before starting PR 2:

1. **Initial variant weights:** Even thirds (33/33/34), or should we ramp the high-price arm gradually (e.g. 60/20/20 for the first week, then re-balance) to limit downside if $59 tanks early?
2. **Cumulative-vs-windowed metrics:** Should the dashboard show all-time numbers from test kickoff, or also a "last 7 days" / "last 30 days" view? Useful if traffic mix shifts over time, but adds dashboard complexity.
3. **Should the admin page show conversion rate trendlines over time?** Out of scope for v1 of the dashboard, but worth flagging.
4. **Trackdesk affiliate revenue allocation:** If a $59 sale comes through an affiliate, the affiliate's commission scales with the sale amount. No code change needed (Trackdesk reads `amount_total` from Stripe), but worth informing affiliate partners.

---

## 9. Out of Scope

Explicitly NOT in this PRD:

- **V2 (multi-persona) credit pricing** — separate system, not part of this test.
- **Upsell pricing variants** — upsell prices stay as-is. Only the main offer + its downsell are being tested.
- **Returning-visitor logic** — visitors who clear localStorage and re-enter with the same email keep their original variant (already covered by idempotency rule).
- **Cohort-by-acquisition-channel analysis** — variant performance by traffic source (FB / Google / affiliate / organic) would be valuable but adds complexity. Defer to a v2 of the analytics page.
- **Automated test conclusion** — when significance is reached, the system *suggests* but does not *automatically zero out* losing variants. A human edits `system_config` to call the test. This is intentional (avoids misfires from confidence spikes).
