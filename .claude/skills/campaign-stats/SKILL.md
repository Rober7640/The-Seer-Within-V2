---
name: campaign-stats
description: "Pull the REAL clicks + conversions + revenue for an email or ad campaign straight from PostHog — just paste the link that was used in the email (the one with ?...utm_campaign=...). Use when someone asks for the stats / clicks / sales / revenue / conversions of an email send, a Lucky Numbers or other BE-offer send, an fb-tarot send, or pastes a theseerwithin.com link with utm params and wants the numbers; or says 'how did that email do', 'stats for this link', 'how many bought from this'. Reports from PostHog (lander_view → checkout_initiated → purchase_completed), NOT AWeber — AWeber's click tracking is blind/unreliable for these funnels."
---

# campaign-stats — clicks, conversions & revenue from a campaign link

Give this skill the exact link used in the email or ad, e.g.

```
https://theseerwithin.com/numerology/lucky-numbers?c=1&fn=Joel&utm_source=aweber&utm_medium=email&utm_campaign=be12_lucky_a
```

and it returns, for that campaign: how many people **clicked/landed**, how many **started checkout**, how many **bought**, the **revenue** (main offer + each upsell), and the **conversion + upsell-take rates** — real numbers from PostHog, not AWeber.

## Step 1 — get the campaign from the link
Parse the URL's query string. The only field that matters is **`utm_campaign`** (e.g. `be12_lucky_a`). Everything below filters on it. Other params (`c`, `fn`, `utm_source`, `utm_medium`) are cosmetic — ignore them. If the link has **no `utm_campaign`**, stop and ask for the correct link; without it there's nothing to filter on.

## Step 2 — data source
PostHog **project 426879** (the live Seer Within project). Query through the **PostHog MCP** `exec` tool. First confirm the project is active with `call project-get {}` (it returns `id: 426879`); if the MCP connects to a different project, switch to 426879 before querying. If the PostHog MCP is not connected, say so — this skill needs it.

The relevant events (all carry `properties.utm_campaign`):
- **`lander_view`** — fires when someone lands on the funnel page = a click that actually arrived. **Unique people = clickers.**
- **`checkout_initiated`** — reached the checkout step.
- **`purchase_completed`** — a paid order. Split by **`properties.step`**: `sales` = the main offer, `upsell1` / `upsell2` = the upsells. Revenue = **`properties.amount_cents` ÷ 100** (USD). `properties.product` names the item (e.g. `be_lucky_numbers`, `be_citrine_wish_ritual`, `be_bracelet`).

## Step 3 — run these two queries
Use a 30-day window and let the data's first/last `timestamp` reveal the real send window. Substitute `<UTM>` with the campaign from Step 1.

**A) Funnel**
```sql
SELECT event, count() AS events, count(DISTINCT person_id) AS people,
       min(timestamp) AS first_seen, max(timestamp) AS last_seen
FROM events
WHERE timestamp >= now() - INTERVAL 30 DAY
  AND properties.utm_campaign = '<UTM>'
  AND event IN ('lander_view','checkout_initiated','purchase_completed')
GROUP BY event ORDER BY events DESC
```

**B) Revenue by product / step**
```sql
SELECT properties.product AS product, properties.step AS step,
       count() AS purchases, count(DISTINCT person_id) AS buyers,
       round(sum(toFloat(properties.amount_cents))/100, 2) AS revenue_usd
FROM events
WHERE event = 'purchase_completed'
  AND properties.utm_campaign = '<UTM>'
  AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY product, step ORDER BY revenue_usd DESC
```

## Step 4 — compute
From **A**: clicks = `lander_view` unique people · checkout = `checkout_initiated` unique people · main buyers = the `step='sales'` buyers from **B** (DISTINCT people).

Rates:
- click → checkout = checkout people / clicks
- checkout → buy = main buyers / checkout people
- click → buyer = main buyers / clicks

From **B**: total revenue = sum of `revenue_usd` · upsell take = upsell buyers / main buyers · AOV = total revenue / main buyers · revenue-per-click = total revenue / clicks.

## Step 5 — report
Present exactly this shape:
1. **Funnel table** — Clicks (views + unique people) / Checkout / Purchases, plus the 3 rates.
2. **Revenue table** — main offer + each upsell + **total**, with each upsell's take %.
3. **Headline line** — AOV, revenue-per-click, and the **send window** (first → last seen) with a one-line read: still converting, or burned through? (Purchases stopped = done; clicks still arriving but no new buys = tail. Compare the last `purchase_completed` date vs the last `lander_view` date.)

## Notes / gotchas (learned the hard way)
- **Clicks = `lander_view` unique people** (clicked the email AND landed). Do NOT use AWeber's click % — it reads ~0 / blind on these funnels.
- `purchase_completed` fires **once per line item**, so total purchase events > unique buyers (main + upsells). ALWAYS split by `step` and count buyers with `DISTINCT person_id` per step — never report the raw event count as "buyers".
- Property is **`utm_campaign`** (no `$` prefix). `$utm_campaign` returns nothing (PostHog warns about this).
- Revenue is **`amount_cents`**. The properties `amount`, `price`, `revenue`, `value` do NOT exist — using them yields nulls.
- If query A returns **zero rows**, do NOT report "0 sales". Say which is true: the `utm_campaign` is likely mistyped, the send hasn't driven traffic yet, or that funnel isn't PostHog-tracked.
- A campaign may have arms (`_a`, `_b`, …). Report only the utm given, then offer to pull the sibling arm(s) if they exist.
- Timezone of the project is `America/Los_Angeles`; timestamps in results are already in it.

## Example output (for `be12_lucky_a`, Nov 7–15)
Funnel: 2,683 clickers → 124 checkouts (4.6%) → 51 buyers (41% of checkouts, 1.9% of clicks).
Revenue: $3,044.56 total = main $2,142.56 (51) + Citrine upsell $637 (15, 29% take) + Bracelet upsell $265 (6, 12% take). AOV ≈ $59.70, ~$1.13 per click. Last purchase Nov 13 → selling window Nov 8–13, tail clicks to Nov 15.
