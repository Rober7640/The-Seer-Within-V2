# PostHog link tracking — clicks & revenue per link

## What you get
For any link you mail, two numbers in PostHog: **clicks** and **revenue**, broken down
by the tag you put on the link. This replaces TrackDesk for backend offers.

## The tag you append
Add your tag to the link as a UTM parameter, in the form `offer_source`. You can use
**any** of the five standard UTM parameters — pick whichever you like and stay consistent:

    ?utm_campaign=twinflame_partnerA      ← or
    ?utm_source=twinflame_partnerA        ← or
    ?utm_medium=twinflame_partnerA        ← (utm_content / utm_term also work)

    https://theseerwithin.com/tarot/twin-flame?utm_campaign=twinflame_partnerA

- `twinflame_partnerA` — Twin Flame, mailed by partner A.
- `pixiu_aidenpowers` — Pixiu bracelet, Aiden Powers list.

Keep the value lowercase, no spaces. One value = one row in the report. Whichever UTM
parameter you put it in, PostHog captures it — just remember which one you used, because
that's the field you break the report down by.

**Put the tag on the entry link** — the one the buyer first clicks from your email. It's captured on their first pageload of the session, so tagging a later/mid-funnel link instead will show no attribution.

## Where to read it
Replace `utm_campaign` below with whichever UTM param you actually used.
- **Clicks:** PostHog → Product analytics → Trends → event `$pageview` (or `lander_view`),
  breakdown by your UTM param. Filter `funnel = twinflame` for Twin Flame only.
- **Revenue:** Trends → event `purchase_completed`, property `is_backend = true`,
  aggregation **Sum of `amount_cents`** (÷100 for dollars), breakdown by your UTM param.

## Cross-check against AWeber
AWeber's own click count for the broadcast should be close to PostHog's click count for
the same tag. A big gap (e.g. AWeber 3000 vs PostHog 2000) means something is broken — a
missing tag on the link, or a tracking outage. Check the tag first.

## Notes
- Revenue is captured server-side from Stripe, so a buyer who pays and closes the tab
  still counts.
- All five UTM params are captured, so it doesn't matter which one you choose — but use
  the same one across a campaign so its clicks and revenue line up on one row.
- Backend offers are invisible to Facebook/Google/TrackDesk by design — this PostHog
  view is the source of truth for them.

---

## The two saved insights (per BE offer)

Each backend offer gets **two** saved insights, both broken down by **UTM campaign**:

1. **`<Offer> — revenue per link by step`** (Trends) — money per link, split by step.
2. **`<Offer> — full funnel`** (Funnel) — lander_view → checkout → purchase → upsells.

Twin Flame's are the reference (`funnel = twinflame`). Every other offer is the **same two
insights with the funnel filter swapped** — the event names and `step` values are identical
across offers, so nothing else changes.

| offer | funnel filter | booking entry route |
|---|---|---|
| Twin Flame (02) | `twinflame` | `/tarot/twin-flame` |
| Judgement Day (03) | `judgement` | `/offers/wiccan/judgement-day` |
| Pixiu (06) | `pixiu` | `/offers/wiccan/pixiu-bracelet` |

`step` values (same for every offer): `sales` (initial reading), `upsell1`, `upsell2`.

### Insight 1 — revenue per link by step (Trends)
Three series, all event **`purchase_completed`**, measured **Property value sum → `amount_cents`**
(÷100 for dollars), each named + filtered by step:

| series name | filters |
|---|---|
| `(Initial)`  | `funnel = <name>` + `step = sales` |
| `(Upsell 1)` | `funnel = <name>` + `step = upsell1` |
| `(Upsell 2)` | `funnel = <name>` + `step = upsell2` |

Breakdown: **UTM campaign** · group remaining under "Other" · limit 50 · Last 30 days.

### Insight 2 — full funnel (7 steps)
`lander_view` → `checkout_initiated` → `purchase_completed`(step=sales) →
`upsell_accepted`(upsell1) → `purchase_completed`(upsell1) →
`upsell_accepted`(upsell2) → `purchase_completed`(upsell2). Every step filtered
`funnel = <name>`. Breakdown: **UTM campaign**, attribution **First touchpoint** · Last 30 days.

## Recipe: make a new offer's insights (e.g. Judgement Day 03)

Don't rebuild — **duplicate and swap one word**:

1. Open **`Twin Flame — revenue per link by step`** → **⋯ → Duplicate** → rename
   **`Judgement Day — revenue per link by step`**. In each of the 3 series change the
   `funnel` filter `twinflame → judgement`. Leave the `step` values and everything else. Save.
2. Open **`Twin Flame — full funnel`** → **⋯ → Duplicate** → rename
   **`Judgement Day — full funnel`**. In every step change `funnel` `twinflame → judgement`. Save.
3. Add both to the dashboard.

Judgement Day's operator link:
`https://www.theseerwithin.com/offers/wiccan/judgement-day?utm_campaign=judgement_<source>`
