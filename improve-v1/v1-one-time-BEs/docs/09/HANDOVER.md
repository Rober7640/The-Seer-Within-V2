# Handover — offer 09, the Heart Cleanser Love Charm

**For:** the developer taking this live. **From:** the build, finished 2026-09-17.
**Branch:** `09-heart-cleanser` (pushed). **State:** everything is written and wired; checkout is off, nothing is deployed, no email has been uploaded or sent, no card has been charged.

The long tick sheet is [`0-WORKFLOW-09.md`](0-WORKFLOW-09.md), and every decision and its reason lives there. This page is only what you do next, in order.

---

## 1. The offer, in one paragraph

A $59 physical product: one pink quartz bracelet with a wish capsule, free shipping worldwide, packed and posted by us within 2 business days. Sold by three Evelyn emails that land on `/offers/heart-cleanser`. She ticks four statements, may add **Reiki charging by Evelyn, $11.11**, and pays on Stripe Checkout, which also takes her shipping address. Then the two V1 upsells run (Protection Ritual + lava stone, Manifestation Bracelet), then a receipt. A paid order writes a parcel row and emails whoever packs. When someone marks it shipped, she gets a tracking email.

---

## 2. Traps — read these first

1. 🔴 **Apply the migrations BEFORE you deploy this branch.** The branch's `schema.ts` carries 07 and 08 columns that production does not have yet, and it adds a new table. Drizzle names every column it knows about, so deploying first breaks reads for 02/03/06 buyers too. In order, on the shared database:
   `migrations/2026-09-03-be-07-daily.sql` → `2026-09-13-be-08-marcus.sql` → `2026-09-13-be-08-editions.sql` → `2026-09-15-be-shipments.sql`. All are additive and safe to re-run.
2. ⛔ **Never `npm run db:push`.** Dev and production share one database, and push applies every difference it finds, including other people's unfinished work.
3. ⚠ **`be_upsell_orders` has no CREATE migration anywhere** — it exists only in `schema.ts`. Check whether production actually has that table before relying on upsell order rows.
4. ⚠ **06 rides along.** Offer 06 (the Pixiu Wishing Bracelet) can already take money and shares this code, so it starts writing parcel rows the moment this ships. Without the new table, every 06 sale emails "NOT RECORDED" instead of a parcel.

---

## 3. Do it in this order

**Step 1 — database.** Apply the four migrations above. Verify:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'be_shipments';
```

**Step 2 — environment.** `ORDERS_NOTIFY_EMAIL` = whoever packs (falls back to hi@theseerwithin.com). `RESEND_API_KEY` already exists. Leave `VITE_BACKEND_CHECKOUT_LIVE` alone for now — it is read when the site is BUILT, so turning it on later needs a rebuild.

**Step 3 — Stripe.** Enable **`charge.refunded`** on the webhook endpoint (both accounts, if B is in use). `checkout.session.completed` is already enabled. ⛔ Nothing to create in the Stripe dashboard: the server sends the amount itself ($59, plus $11.11 when the bump is ticked), so there is no price object to mistype.

**Step 4 — AWeber.** On the backend customer list **6972552**, add three custom fields, spelled exactly: `tracking_url`, `tracking_number`, `carrier`. Then build two Campaigns on that list:

| Campaign | Trigger tag | Body |
|---|---|---|
| Order confirmation | `be-09-heart-cleanser` | [`order-emails/09-T3-confirmation-email.html`](order-emails/09-T3-confirmation-email.html) + `.txt` |
| Tracking | `be-09-shipped` | [`order-emails/09-T4-shipment-email.html`](order-emails/09-T4-shipment-email.html) + `.txt` |

Swap `{{AWEBER_STRIPE_ORDER_ID}}` and `{{AWEBER_TRACKING_URL}}` for the real fields from AWeber's own picker, then prove both on a seed send — one subscriber with a first name, one without.

⛔ **No Campaign on `be-09-bump`.** There is no Reiki email (Joel, 2026-09-16); the receipt's "Added" line is the only confirmation.
⛔ **Keep both Campaigns on 6972552.** List **6972554** also receives the purchase tag, so a Campaign there would send the confirmation twice.

**Step 5 — the sales emails.** Wait for Joel's approval (see §6), then upload emails 1–3 as drafts with their matching text parts, set the sequence timing, and suppress buyers from the rest of it. Files and subjects: [`sales-emails/AWeber-handoff.md`](sales-emails/AWeber-handoff.md). ⛔ That page names two superseded drafts sitting in the same folder — do not upload those.

**Step 6 — deploy, then prove it.** Deploy the branch with checkout still off. Then open 09 for a **Stripe test-mode** order only. Nothing in the code does that yet; building that switch is your call, and the shape agreed is: an env var checked in the checkout route only, refusing unless `NODE_ENV` is not production **and** the Stripe key starts with `sk_test_`, off by default.

Walk one test order all the way: an email link with its `?c=` → the offer page → tick four → tick the bump → pay → upsell 1 yes → upsell 2 yes → receipt shows the address and the "Added" line → a parcel row exists → the packing alert arrives leading with **⚡ REIKI CHARGE BEFORE PACKING** → the confirmation email arrives once → `POST /api/admin/shipments/:id/shipped` → the tracking email arrives with a working link. Then refund it and check the parcel is cancelled and a "DO NOT SHIP" alert arrives.

**Step 7 — open it.** Set `readyForMoney: true` for `heart-cleanser` in `shared/backendOffers.ts` (the comment above it repeats these conditions), set `VITE_BACKEND_CHECKOUT_LIVE=true`, rebuild, deploy. Watch payments, the parcel queue and failed AWeber writes.

---

## 4. What already exists

| Thing | Where |
|---|---|
| Offer page + receipt | `client/src/pages/offers/heart-cleanser/`, copy in `client/src/lib/heartCleanserBooking.ts` / `heartCleanserReceipt.ts` |
| Catalog row, price, bump, countries | `shared/backendOffers.ts` (`heart-cleanser`, `be_heart_cleanser`, 5900, `reiki_charge` 1111) |
| Upsell copy for 09 | `client/src/lib/upsellCopy/heartCleanser.ts` |
| Address form skipped when checkout already took one | `client/src/lib/upsellShipping.ts` |
| Parcel row, alert, admin actions | `server/lib/beShipments.ts`, `beShipmentAlerts.ts`, `beShipmentAdmin.ts`, `server/routes/admin/shipments.ts` |
| Checkout, receipt lookup, webhook branches | `server/routes/backendOffers.ts`, `server/routes/webhooks.ts` |
| Tags and the shipped-tag write | `server/lib/backendCustomerList.ts`, `server/lib/aweber.ts` |
| All copy | this folder — see [`README.md`](README.md) |

**Admin API** (behind the existing admin login, no screen by decision):

```
GET  /api/admin/shipments?status=pending&offer=heart-cleanser
POST /api/admin/shipments/:id/shipped   { carrier, trackingNumber, trackingUrl }   # https only
POST /api/admin/shipments/:id/cancel    { reason }
```

Marking shipped is what sends her tracking email. Re-posting the same values does nothing; different values give a 409. A failed AWeber write returns 502, is stored, and re-posting retries it.

---

## 5. Do not

- Do not change V1's own funnel. It is live and takes money; its upsell pages keep their seven shipping countries on purpose.
- Do not flip `readyForMoney` before step 6 is proved.
- Do not make the confirmation email mention Reiki. It is one email for every buyer.
- Do not add tags or rename them. Three things match the literal strings and none of them live in this repo: the two Campaigns and the fulfilment filter.

---

## 6. Waiting on Joel, not on you

Read and approve email 3, the confirmation and shipment emails, the receipt page and the insert card · whether email 3 keeps its two "in this story" lines · the sequence plan (list, exclusions, gaps) · packing instructions · the insert card's print size.

⚠ Refunding **only** the $11.11 bump changes nothing automatically — the parcel stays pending and still says the bump was bought, so the packer has to be told by hand.

---

## 7. Verify your own work

```bash
npx vitest run server/lib/backendOffers.test.ts server/lib/beShipments.test.ts \
  server/routes/backendOffers.heartCleanser.test.ts client/src/lib/heartCleanserBooking.test.ts
npx tsc --noEmit -p .        # 46 errors is the existing baseline — add none
BASE=http://localhost:5000 node improve-v1/v1-one-time-BEs/scripts/walk-09-smoke.mjs
```

Some test files in this repo are written for Node's own runner, not vitest (`paiFunnel.test.ts`, `backendPurchaseAnalytics.test.ts`). Vitest says "No test suite found" for them; run those with `npx tsx --test <file>`.

Screenshots of every screen: `improve-v1/evidence/09-booking-2026-09-15/`.
