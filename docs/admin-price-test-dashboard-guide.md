# FE Price Test (V1) — Admin Dashboard Guide

How to read the price-split-test dashboard, what each number means, and when to act on what you see.

---

## What this dashboard is for

The V1 funnel runs three prices at once — `$35` / `$45` / `$59` — and randomly assigns each new visitor to one of them. This dashboard tells you:

- How many visitors got each price
- How many of them actually paid
- Which price makes the most money per visitor (the metric that wins A/B tests)
- Whether you have enough data to safely declare a winner

Until you've decided a winner, the dashboard exists to answer one question: **"Should I keep running, or am I done?"**

---

## How to access it

1. Go to `https://www.theseerwithin.com/admin/login` (production) or `http://localhost:5000/admin/login` (local)
2. Log in with your admin credentials
3. Click **"FE Price Test (v1)"** in the left sidebar (the `$` icon)

URL: `/admin/price-test`

---

## Page sections

The page has four sections from top to bottom:

1. **Date filter** — limit results to a specific window
2. **Recommendation banner** — plain-English summary of where you are
3. **Per-variant performance table** — the main numbers per price tier
4. **Pairwise significance table** — statistical comparisons between price tiers

---

## 1. Date filter

Two date pickers (From / To), an **Apply** button, and an **All time** button.

**By default:** the dashboard shows all-time data from the moment the test started.

**To filter:**
- Pick a From date and a To date (either or both)
- Click **Apply**
- Numbers refresh to only count visitors and purchases that landed inside that window

**To reset to all-time:**
- Click **All time** — clears both dates and refreshes

**When to use it:**
- Compare last 7 days vs last 30 days to see if the leader is consistent over time
- After a marketing change (new ad creative, traffic source change), filter to the date range *after* the change to see if results shifted
- Before declaring a winner, check that the leader is also winning in the most recent window — not just leading on stale early data

---

## 2. Recommendation banner

A single-line plain-English summary at the top of the page. It changes as data accumulates:

| Banner says | What it means | What to do |
|---|---|---|
| *"No variant data yet…"* | Test hasn't started or no traffic has hit it | Confirm the `system_config.v1_price_variants` row exists and traffic is flowing |
| *"Not enough data yet — smallest variant has X visitors, need 100 per variant"* | At least one variant has < 100 visitors | Keep running. Don't trust the numbers below this threshold |
| *"Variant X leads at $Y/visitor. Z% confidence vs A. Keep running"* | Math computed but confidence < 95% | Keep running. The leader might just be lucky |
| *"Variant X wins at $Y/visitor — Z% confidence. Safe to call it"* | Confidence ≥ 95% AND ≥100 visitors per variant | You can now end the test (see "How to end the test" below) |

The banner is **informational only** — the system never auto-ends the test. A human decides when to call it.

---

## 3. Per-variant performance table

One row per variant. The columns:

| Column | What it means | How it's calculated |
|---|---|---|
| **Variant** | The price tier label (`35`, `45`, `59`). The current leader gets a green "Leader" badge | The `id` from `system_config.v1_price_variants` |
| **Main** | Main offer price the user sees | `priceCents / 100` from config |
| **Downsell** | Downsell price (offered after 3 objections) | `downsellCents / 100` from config |
| **Visitors** | Real conversations assigned to this variant. Your **denominator** for conversion math | Count of `conversations` rows with this `price_variant` |
| **Main buys** | Confirmed main purchases (Stripe paid + landed on `/welcome1`) | See "What counts as a purchase" below |
| **Downsell buys** | Confirmed downsell purchases | Same logic, downsell type |
| **Main CR** | Main conversion rate | `main_buys / visitors × 100` |
| **Overall CR** | Total conversion rate (main + downsell) | `(main_buys + downsell_buys) / visitors × 100` |
| **Revenue** | Total dollars actually charged for this variant | `SUM(main_purchase_amount)` for confirmed rows |
| **$ / visitor** | **The decisional metric.** How much revenue each visitor on this variant generated on average | `revenue / visitors` |

### Why $/visitor is the metric, not conversion rate

A higher price with slightly lower conversion can still beat a lower price with higher conversion. Example:

| Variant | Visitors | CR | Revenue | $/visitor |
|---|---|---|---|---|
| $35 | 1000 | 12% | $4,200 | $4.20 |
| $59 | 1000 | 8% | $4,720 | $4.72 |

$59 wins despite the lower CR. That's the whole reason to run a price test.

### What counts as a purchase (important)

A row is counted as a confirmed purchase **only when both** are true:
- `purchased = true` (the user clicked the button and Stripe checkout was created)
- `upsell_offered = true` (the user actually completed Stripe payment and landed on `/welcome1`)

This filter exists because V1 marks `purchased = true` *optimistically* — the moment the user clicks the button, before Stripe confirms anything. Abandoned-cart visitors would otherwise inflate the purchase count. Only payments that completed end-to-end (and produced an `upsell_offered = true` flip on the welcome page) are counted here.

---

## 4. Pairwise significance table

For every pair of variants (35-vs-45, 35-vs-59, 45-vs-59), one row.

| Column | What it means |
|---|---|
| **Higher** | The variant in this pair with the higher $/visitor |
| **vs** | The other variant in the pair |
| **$/v (higher)** | The leader's $/visitor — same number as the top table |
| **$/v (lower)** | The trailing variant's $/visitor |
| **Confidence** | "% chance the higher one is *really* better, vs just luck" — calculated by a z-test on the gap |
| **Status** | "Winner ≥95%" (green badge), "Keep running", or "insufficient data" |

### How to read each status

| Status | Meaning | What to do |
|---|---|---|
| **Winner ≥95%** (green) | Confidence ≥ 95% AND both variants in the pair have ≥ 100 visitors | Safe to call — the leader is genuinely better, not luck |
| **Keep running** (amber) | Math computed a confidence number but it's below 95% | Wait for more traffic before deciding |
| **insufficient data** (gray) | Both variants in this pair have zero confirmed purchases — math can't compute a meaningful gap | Wait for at least one purchase to land on either side |

### Worked example

Suppose after a week you see:

| Higher | vs | $/v (higher) | $/v (lower) | Confidence | Status |
|---|---|---|---|---|---|
| 59 | 35 | $4.89 | $4.14 | 96.2% | Winner ≥95% ✓ |
| 59 | 45 | $4.89 | $4.45 | 78.3% | Keep running |
| 45 | 35 | $4.45 | $4.14 | 71.8% | Keep running |

Reading this:
- $59 beats $35 with high confidence — that comparison is settled
- $59 might still beat $45 but you can't prove it yet — the gap is too small relative to the noise
- $45 vs $35 is essentially a coin flip

**Decision:** keep running until either $59 vs $45 also hits 95%, OR you decide $59 is good enough on the $35 comparison alone.

---

## How to make decisions

### "When can I end the test?"

You can safely call a winner when **all** of these are true:

1. The leader has the highest **$/visitor** in the per-variant table
2. The pairwise table shows **Winner ≥95%** for the leader vs at least one other variant
3. Each variant has at least 100 visitors (the dashboard enforces this by suppressing confidence below the threshold)

Optional fourth check:
4. Run the same query with the **last 7 days** date filter — confirm the leader is also winning recently, not just on stale early data

### "How do I act on the result?"

End the test by editing the variant config so only the winner has weight:

```sql
-- Example: declare $59 the winner
UPDATE system_config
SET config_value = '{"variants":[
  {"id":"35","priceCents":3500,"downsellCents":2500,"weight":0},
  {"id":"45","priceCents":4500,"downsellCents":3200,"weight":0},
  {"id":"59","priceCents":5900,"downsellCents":4200,"weight":1}
]}',
    updated_at = NOW()
WHERE config_key = 'v1_price_variants';
```

Effect within 60 seconds (server cache TTL). New visitors get the winning price. Existing visitors keep their original assigned variant. No code deploy needed.

### "How do I change the traffic split mid-test?"

Edit the same row, change the `weight` numbers. Weights are relative:

| Weights | Resulting split |
|---|---|
| `1 / 1 / 1` | 33% / 33% / 34% (even) |
| `2 / 1 / 1` | 50% / 25% / 25% |
| `3 / 1 / 1` | 60% / 20% / 20% |

Common reason to change mid-test: ramp the unproven variant down if it looks like it's tanking early, or ramp the leader up to accelerate decision-making.

### "How do I keep running but stop one variant?"

Set its weight to `0`. New visitors won't get that variant. Existing visitors keep their original assignment.

---

## Common scenarios

### "Variant X has 0 visitors"

Either traffic hasn't reached that variant yet (early days) or its weight is 0 in the config. Run:
```sql
SELECT config_value FROM system_config WHERE config_key = 'v1_price_variants';
```
to confirm the weights.

### "Variant X has visitors but 0 confirmed purchases"

Either no one's bought yet (early days) or visitors are bouncing on Stripe. Compare the optimistic vs confirmed counts:

```sql
SELECT
  price_variant,
  COUNT(*) FILTER (WHERE purchased = true) AS optimistic_buys,
  COUNT(*) FILTER (WHERE purchased = true AND upsell_offered = true) AS confirmed_buys
FROM conversations
WHERE price_variant IS NOT NULL
GROUP BY price_variant;
```

If `optimistic_buys` is much higher than `confirmed_buys`, lots of people are clicking the button but not completing on Stripe. Could indicate Stripe page issue, payment friction, or just normal abandon rate.

### "Recommendation banner says 'No variant data yet' but the table shows variants"

Cosmetic edge case — fires when the leader has zero visitors. Won't affect data. The variants and stats below are accurate.

### "$/visitor is unreasonably high or low for one variant"

Could be a single outlier purchase warping the small-sample average. Check the raw data:

```sql
SELECT email, main_purchase_amount, purchased, upsell_offered, created_at
FROM conversations
WHERE price_variant = '<variant_id>' AND purchased = true
ORDER BY created_at DESC;
```

With a small sample, one weird row can dominate. The 100-visitor floor exists to mitigate this.

---

## Looking at raw data directly

Sometimes the dashboard isn't enough. Useful queries:

**All variant assignments:**
```sql
SELECT email, first_name, price_variant, price_amount_cents, downsell_amount_cents,
       purchased, purchase_type, upsell_offered, created_at
FROM conversations
WHERE price_variant IS NOT NULL
ORDER BY created_at DESC
LIMIT 100;
```

**Per-variant aggregate (matches dashboard math):**
```sql
SELECT
  price_variant,
  COUNT(*) AS visitors,
  COUNT(*) FILTER (WHERE purchased AND upsell_offered AND purchase_type = 'main') AS main_buys,
  COUNT(*) FILTER (WHERE purchased AND upsell_offered AND purchase_type = 'downsell') AS downsell_buys,
  COALESCE(SUM(main_purchase_amount) FILTER (WHERE purchased AND upsell_offered), 0) / 100.0 AS revenue_dollars,
  ROUND(COALESCE(SUM(main_purchase_amount) FILTER (WHERE purchased AND upsell_offered), 0) / NULLIF(COUNT(*), 0) / 100.0, 2) AS revenue_per_visitor_dollars
FROM conversations
WHERE price_variant IS NOT NULL
GROUP BY price_variant
ORDER BY price_variant;
```

**Find the row for a specific email:**
```sql
SELECT email, price_variant, price_amount_cents, downsell_amount_cents,
       purchased, purchase_type, upsell_offered, stripe_session_id, created_at
FROM conversations
WHERE email = '<the email>';
```

---

## Troubleshooting

### Dashboard shows nothing / errors

- Confirm you're logged in as admin (the page should redirect to `/admin/login` if not authenticated)
- Open DevTools → Network → look at the `/api/admin/price-test/v1` request
- If 401: log in again
- If 500: backend error — check server logs

### Dashboard variant prices look wrong (e.g. `$` with no number, or `$0`)

The `system_config.v1_price_variants` row has a typo or missing field. Run:

```sql
SELECT config_value FROM system_config WHERE config_key = 'v1_price_variants';
```

Verify each variant has all four fields: `id`, `priceCents`, `downsellCents`, `weight`. Field names must match exactly (case-sensitive, plural where plural).

### Numbers don't change after running an UPDATE on the config row

Server caches the config for 60 seconds. Wait a minute and refresh, or restart the production server.

### A purchase landed but doesn't show in the table

Check the `conversations` row for that email — is `upsell_offered = true`? If `false`, the user clicked the button but never landed on `/welcome1`. The dashboard intentionally excludes those (treats as abandoned cart). If you believe the payment was real, check the Stripe dashboard with the `stripe_session_id` from the row to confirm.

---

## Where the data lives

| Item | Location |
|---|---|
| Variant assignments | `conversations.price_variant`, `price_amount_cents`, `downsell_amount_cents` |
| Variant config (prices + weights) | `system_config` row where `config_key = 'v1_price_variants'` |
| Confirmed purchase signal | `conversations.purchased = true AND conversations.upsell_offered = true` |
| Charge amount | `conversations.main_purchase_amount` (in cents, set by Stripe webhook / `/welcome1` verification) |
| Stripe receipt for any row | `conversations.stripe_session_id` → look up in Stripe dashboard |

---

## Quick reference card

| You want to… | Do this |
|---|---|
| See current state | `/admin/price-test` |
| Filter to last 7 days | Set From=7-days-ago, To=today, click Apply |
| Change traffic split | UPDATE `system_config.v1_price_variants` weights, wait 60s |
| End the test | Set winning weight = 1, others = 0 |
| Pause one variant | Set its weight to 0, leave others as-is |
| Restart the test from scratch | Set all weights back to your starting values |
| Verify a specific purchase | Look up the email in `conversations`, check `upsell_offered` and `stripe_session_id` |
| Disable the test entirely | DELETE the config row — code falls back to historical $35/$25 |
