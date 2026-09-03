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
