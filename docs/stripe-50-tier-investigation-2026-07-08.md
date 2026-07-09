# "$50 Stripe Sales Failing" — Investigation Result (Task 2.5)

**Date:** 2026-07-08 · **Method:** read-only query on `credit_purchases` (last 90 days) + code review of the Stripe payment path.

## Short answer
There is **no $49.99 ("~$50") failure problem.** On card, $49.99 is the **best-completing tier we have (93.5%).**
The real, severe payment leak is the **$99.99 tier** (card 35%, PayPal 11%).

## The data — completion rate by rail and price

| Price | Package | Stripe card | PayPal |
|------:|---------|------------:|-------:|
| $2.99  | (rescue/legacy) | 50.0% (n=26)  | 30.8% |
| $9.99  | (rescue/legacy) | 85.9% (n=78)  | 59.4% |
| $19.99 | popular         | 77.0% (n=213) | 66.9% |
| $29.99 | best_value      | 63.8% (n=105) | 39.7% |
| **$49.99** | **premium ("MOST POPULAR")** | **93.5% (n=31)** ✅ | 66.5% |
| **$99.99** | **whale ("BEST DEAL")**       | **35.0% (n=20)** 🔴 | **11.0%** 🔴 |

## Why it was likely reported as "~$50"
- **Volume, not failure rate.** $49.99 carries the **"MOST POPULAR"** badge, so it gets the most attempts.
  In the Stripe/PayPal dashboards that means the most *absolute* failed-payment events — which reads as
  "lots of ~$50 failures" even though the *rate* is the best of any tier.
- The amount that genuinely breaks ($99.99) is "near $100," easy to approximate or conflate with the popular $49.99.

## What's actually broken
- **$99.99 completion is the leak** — card 35%, PayPal 11%. Consistent with larger charges triggering more
  SCA/3-D-Secure challenges, more issuer declines, and (on PayPal) more login/redirect abandonment.
- Secondary: **$29.99** dips (card 63.8%) below both neighbors — possibly noise, worth a later glance.

## Recommendation
Don't spend effort on a $49.99 Stripe bug — there isn't one. Point the fix at **$99.99 completion**, which is the
same work as **Task 0.2** (robust PayPal capture + stuck-`pending` audit) and **Task 2.4** (Apple Pay / Google Pay
express buttons + re-test the PayPal default). That's where the recoverable revenue is.

## Caveats
- "Non-completion" here lumps together *abandoned* checkouts and *declined* cards; the DB can't separate them.
  Stripe's decline-code report would confirm the split, but $49.99 shows only 2 non-completions of 31 either way.
- Top-tier card sample sizes are small (n=31 / n=20) — directional. PayPal volumes are larger and tell the same story.
