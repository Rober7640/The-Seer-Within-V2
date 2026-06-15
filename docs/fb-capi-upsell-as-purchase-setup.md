# FB CAPI — Fold Upsells into `Purchase` (setup + verification)

**Goal:** upsell dollars enter Meta's Website Purchase ROAS, while FE vs upsell
counts stay separately visible. See the dev hand-off (`FB-CAPI-Notion instructions`)
for the business rationale.

**Branch:** `fix/fb-upsell-as-purchase`

---

## What the code now does

Every monetized Stripe charge — front-end, Upsell 1, Upsell 2, downsells, V2
credits, soulmate — fires as a **standard `Purchase`** event (browser Pixel +
server CAPI), carrying a `content_category` tag:

| Charge | event_name (wire) | event_id (unchanged) | content_category |
|---|---|---|---|
| Front-end ritual | `Purchase` | `purchase_<session>` | `frontend` |
| Upsell 1 (Protection Ritual) | `Purchase` | `upsell_u1_<session>` | `upsell` |
| Upsell 2 (Bracelet, V1-FB) | `Purchase` | `upsell2_<session>` | `upsell` |
| Upsell 2 (Bracelet, V1 email) | `Purchase` | `upsell_u2_<session>` | `upsell` |
| Soulmate bracelet / tuner | `Purchase` | `upsell_sm_*` / `upsell2_*` | `upsell` |
| V2 credit topup | `Purchase` | random | `frontend` |

**Why no double-counting:** every charge keeps its own unique `event_id`, so Meta
counts each once. The browser + server copies of the *same* charge share an
`event_id`, so Meta dedups them into one. Renaming the event did **not** touch the
event_id scheme — that's what makes this safe.

The old custom `Upsell` / `Upsell2` events are no longer sent.

---

## Meta Events Manager — REQUIRED (no code)

Without this step you'll see total purchases but not the FE/upsell split.

1. **Events Manager → Custom Conversions → Create.**
2. Create **"FE Purchases"**:
   - Data source: the funnel's pixel.
   - Rule: Event = `Purchase` **AND** `content_category` **equals** `frontend`.
3. Create **"Upsells"**:
   - Rule: Event = `Purchase` **AND** `content_category` **equals** `upsell`.
4. (Optional) If you later split downsells, add a third on `content_category = downsell`.
5. **Ads Manager → Columns → Customize** → add both Custom Conversions (count +
   value + cost-per). Pin them.
6. **Retire** the old upsell custom events / any Custom Conversions built on them
   (they stop receiving data after deploy).
7. **Optimization:** set purchase campaigns to optimize on `Purchase` with
   value / tROAS so Meta chases total order value.

> Repeat the two Custom Conversions per pixel (default `446814716830295` and
> soulmate `738651185965027`) if you want the split on each.

**After this:** default "Purchases" column = FE + upsells combined (e.g. 30);
"FE Purchases" and "Upsells" columns show the split; Website Purchase ROAS
reflects full value.

---

## Stape (server-side GTM `GTM-PRDKFSLC`) — VERIFY ONLY

CAPI routing is URL-based and forwards the event name + `custom_data` as-is, so
the rename needs no Stape change. One thing to confirm:

- Open the **Meta CAPI tag** in the Stape container.
- Confirm its `custom_data` is bound to the **whole** `{{Event Data - custom_data}}`
  object (not a hand-picked list of value/currency/content_name).
  - Whole object → `content_category` flows automatically. Done.
  - Field-by-field → add a `content_category` field to that mapping. 2-min edit.

(Google Ads web container `GTM-WVPGCFHW` is unrelated — no change.)

---

## Test Events verification (before scaling spend)

For each funnel, run a full purchase (FE → Upsell 1 → Upsell 2) with a Test Event
Code set on the Stape tag (per `fb-per-funnel-pixel-routing` note):

- [ ] FE charge shows **one** `Purchase`, `content_category=frontend`, real $ value.
- [ ] Upsell 1 shows **one** `Purchase`, `content_category=upsell`, real $ value.
- [ ] Upsell 2 shows **one** `Purchase`, `content_category=upsell`, real $ value.
- [ ] Each is "Browser + Server" **deduplicated** (not two separate rows).
- [ ] No event still labelled `Upsell` / `Upsell2`.
- [ ] Custom Conversions "FE Purchases" / "Upsells" tick up correctly.

> ⚠️ Known double-fire (fallback-checkout path): the **Test Events panel** may show
> 2 server copies of an upsell before dedup — Meta collapses them by event_id in
> real reporting, so ROAS stays correct. Recommend bundling the double-fire fix
> (see `upsell-webhook-double-fire-bug` note) so the panel reads clean.

## Expected post-launch movement
- Purchase count rises (now includes upsells).
- Avg Purchase value ~$35 → ~$64 AOV.
- Website Purchase ROAS ~doubles on upsell-heavy campaigns.
- Short tROAS re-learning window as true values flow.
