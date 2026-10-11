# 04 The Turn — handover to dev

**Branch:** `04-tea-reading` (pushed, based on `development` `48a7ded1`). **State:** built and
tested in preview. **Dark:** `readyForMoney: false`, so nothing can charge. Nothing is deployed.

Full record of what was built and why: [`04-DELIVERABLES.md`](./04-DELIVERABLES.md). Tick sheet:
[`0-WORKFLOW-04.md`](./0-WORKFLOW-04.md).

---

## In plain English

The whole funnel exists: a booking page at one fixed price (split-tested: half the visitors see $35,
half $45 — once the test is switched on), an order bump, two upsells, a thank-you page, three
versions of the reading as PDFs, and the emails.
It works on a laptop with fake payments. **What's left is switching it on**: put the PDFs online,
build the emails in AWeber, do one real test purchase, then flip the switch. A few copy reviews and
two decisions come first, and they're Joel's.

---

## 1. Joel — before dev starts

| # | What | Where |
|---|---|---|
| J1 | **Read the three readings** (the product — what she pays for) | `docs/04/product/pdf/04-the-turn-{divided-rim,turned-handle,sunken-leaf}.pdf` |
| J2 | **Read the funnel copy**: booking page, booking chat, receipt, upsells | `copy/04/04-C1-booking-page-v2.md`, `04-C2-booking-chat.md`, `04-T1-thank-you-page.md`, `04-U-upsell-copy-v2.md`. Screenshots: `improve-v1/evidence/04-tea-reading-2026-10-11/` |
| J3 | **Read the two emails** | `copy/04/04-T3-confirmation-email`, `04-T4-delivery-email` (.html/.txt), also `~/Desktop/04-tea-reading-emails/`. (The bump is intangible, so there is no bump email — the old `04-T5` Still Cup email is deleted) |
| J6 | **Which sales letter sends?** The source letter or the rewrite `copy/04/04-E2-esl.md`. ⛔ Either way it must show **the source letter's cup photo** with the seven numbered marks, because all three readings read that exact cup. ⚠ **No price hike any more** (2026-10-11): the rewrite's beat 14 (*"a later turning costs more than an early one"*) and the abandon nudges' P.S. (`04-E6`) still sell a price that rises — cut that before either sends. The day-2/3/4 ladder emails (`04-E5`) are retired with the ladder: don't send them | `docs/04/product/images/esl/esl-cup-original.jpg` |
| J7 | **OK to put the PDFs online.** The links will be public but unguessable | step D3 |

---

## 2. Dev — go-live, in this order

| # | Step | Detail |
|---|---|---|
| D1 | **Open a PR** `04-tea-reading` → `development` | `origin/development` was still at the base commit when pushed |
| D2 | **Database: no new migration for 04.** ⚠ But check that production `be_orders` has **every column `shared/schema.ts` names**. Then run `improve-v1/create-be-04-price-experiment-2026-10-11.sql` **once** — it creates the price test as a **draft** (everyone still pays $35). It uses the existing experiment tables; dev and prod share one database, so once is enough | The 07/08 columns were missing from production on 2026-09-13. If a column is missing, the order insert fails: she still gets her confirmation email, but **her reading is never auto-delivered** (no row for the job to find). Apply the pending `be-07` / `be-08` / `be-shipments` migrations first. ⛔ Never `db:push` |
| D3 | **Upload the three PDFs** at unguessable keys | e.g. `node improve-v1/v1-one-time-BEs/scripts/host-be-asset.cjs file docs/…/04-the-turn-divided-rim.pdf evelyn/backend-04/<random>/04-the-turn-divided-rim.pdf`. ⛔ Never under `evelyn/tarot/` |
| D4 | **Environment variables** (production) | `BE04_READING_URL_TURNED_HANDLE` / `_DIVIDED_RIM` / `_SUNKEN_LEAF` — the three https links from D3. `BE04_DELIVERY_ENABLED=true` on the instance that runs cron jobs (not where `DISABLE_CRONS=true`). `BE04_DELIVERY_DELAY_HOURS` (default 12, allowed 1–23). Confirm the client build has `VITE_BACKEND_CHECKOUT_LIVE=true` (it must already, for 03/06 to take money). There is **no price setting** — the price lives in the experiment row (D2) |
| D5 | **AWeber, by hand** (the API can't build Campaigns) | **T3 confirmation** — list `6972552`, trigger tag `be-04-tea-reading`, no wait. ⛔ Not on `6972554`: bump buyers get `be-04-tea-reading` there too, so it would send twice. **T4 delivery** — list `6972552`, trigger `be-04-delivered`, no wait; swap `{{AWEBER_READING_URL}}` for the `reading_url` custom field (HTML *and* text); subject `{{ subscriber.first_name \| default: "dear" }} — your cup is turned`. **No bump Campaign:** the bump (the Double Turning) is intangible — nothing to send. `be-04-bump` on `6972554` stays as a segment only. Check `reading_url` exists as a custom field on `6972552` (02 uses it). Seed-test each with and without a first name |
| D6 | **One real test purchase** on dev (`BACKEND_CHECKOUT_TEST_MODE=true` + a `sk_test_` key) | Run the checklist in `docs/test-ideas.md` → "Backend offer 04". The ones that matter most: a drawn cup is in Stripe metadata · bump adds "The Double Turning" $12.77 (`bumpProduct=double_turning`) · pay → upsell 1 → upsell 2 → receipt shows *her* order · the confirmation email lands once · with the delay set to 1 hour, the delivery email arrives once with **her cup's** PDF link · the live V1 funnel `/` and offers 03/06/09 unchanged |
| D7 | **Switch it on** | `readyForMoney: true` for `'tea-reading'` in `shared/backendOffers.ts`, then deploy |
| D8 | **On the day the letter sends** | **To split-test the price, press Start on `be_04_price_2026` in `/admin/experiments`** (before the send, so every visitor is in it). Leave it as a draft to sell at $35 to everyone. Letter button → `https://theseerwithin.com/offers/wiccan/tea-reading?c=61&fn=<first name, URL-encoded>`. Codes: `61–67` the letter, `71–73` abandon nudges (`81–83` belonged to the retired ladder emails) |

---

## 3. How it works (the parts that are new)

| Part | What to know | Code |
|---|---|---|
| **The price test** | **No price hike** (operator 2026-10-11 — the old day ladder is gone). One fixed price, split 50/50: arm **A $35** (control) vs arm **B $45**, experiment `be_04_price_2026`. **The server decides**, never the browser, and a visitor keeps her arm (sticky on her browser's visitor id, frozen at first sight). **To start it:** run the SQL file once (D2), then press **Start** in `/admin/experiments`. **To stop it:** press Pause — everyone is back on $35 within 30 seconds. **Results:** `/admin/experiments` → `be_04_price_2026`; read **revenue per viewer** — it counts the reading, the bump and both upsells for each arm (one conversion row for the booking and one per upsell). PostHog `purchase_completed` also carries `price_arm`. **Fails safe:** a draft, a paused test, a database error or a bad setting all mean $35. The page shows her arm's price and sends back the arm it showed (`quotedArm`); checkout works out her arm again and, if they differ (e.g. the test started while her page was open), answers `409 price_changed` with the right price instead of charging. Stripe metadata: `priceExp`, `priceArm` (both upsell charges carry them too) | `server/lib/experiments.ts` (`resolveBe04Price`), `shared/backendOffers.ts` (`TEA_READING_PRICE_ARMS`), `GET /api/backend/offers/tea-reading/price?subject=…` |
| **The cup draw** | No pick (operator 2026-10-11). At checkout the server draws Turned Handle / Divided Rim / Sunken Leaf uniformly at random (`crypto.randomInt`) and writes it to Stripe as `metadata.cup` (+ `cupDrawn: '1'`). A `cup` the browser sends is ignored. Decides which PDF she gets; the receipt doesn't name it — the reading is the reveal. No database column — the job reads it back from Stripe | `client/src/pages/offers/tea-reading/`, `server/routes/backendOffers.ts` |
| **Delivery** | A cron job every 10 minutes (off unless `BE04_DELIVERY_ENABLED=true`): paid, undelivered 04 orders older than the delay get their cup's link sent to AWeber (`be-04-delivered` + `reading_url`), then `reading_url` / `delivered_at` are stamped. No link or Stripe unreadable → skipped and retried, never a guessed link. Still undelivered at 23 hours → an error log every run | `server/lib/be04Delivery.ts`, registered in `server/lib/cronJobs.ts` |
| **AWeber tags** | `be-04-tea-reading`, `be-04-bump`, `be-04-delivered`, upsells `be-04-upsell1-protection` / `be-04-upsell2-bracelet`. ⛔ Add tags, never rename (Campaigns and n8n match them exactly) | `server/lib/backendCustomerList.ts` |
| **Upsells** | The shared `/offers/upsell/welcome1` → `welcome2` chain, 04's copy plugged in. No `?demo=true` on these pages: they need a real paid session | `client/src/lib/upsellCopy/teaReading.ts` |
| **The PDFs** | Built from markdown by a script; one real cup photo throughout | `node improve-v1/v1-one-time-BEs/scripts/build-04-pdf.mjs` (gate: `scripts/check-04-pdf.py`) |

---

## 4. Proven, and not proven

| Proven (in preview) | Not proven yet |
|---|---|
| 1,617 unit tests pass; the 28 failures are the same as on `development` | Anything against real Stripe, AWeber or the database |
| Type check at its 46-error baseline; production build passes | The delivery job running for real |
| Booking walk-through 210/210 (both price arms) and upsell walk-through 36/36 (server calls faked in the browser) | The price test running on real traffic: the split, the `409 price_changed` path and the conversion rows against a real server and database (proven only with fakes) |
| PDF gate 21/21 (no leftovers, every image, calendar last, layout, fonts, size) | PDFs on a phone and printed; the `.docx` opened in Word; seed emails in Gmail/Outlook |

Re-run the walk-throughs (client only, no `.env` needed):

```
npx vite dev --port 5094 &
VITE_BACKEND_CHECKOUT_LIVE=true npx vite dev --port 5095 &
BASE=http://localhost:5094 LIVE_BASE=http://localhost:5095 node improve-v1/v1-one-time-BEs/scripts/walk-04-smoke.mjs
BASE=http://localhost:5094 node improve-v1/v1-one-time-BEs/scripts/walk-04-upsells.mjs   # the plain (dark) Vite
```

---

## 5. Known gaps and risks

- **Two Stripe accounts (A/B).** The job reads the cup from the Stripe session on the active account.
  If the active account changes, sessions from the other one can't be read: those orders wait and log
  an overdue error every 10 minutes until someone delivers them by hand.
- **Delivery only runs where cron jobs run.** If no deployed instance runs crons, nothing is delivered.
- **Upsell 2** still uses V1's shared questions (the "calling something in" one, US spelling "recognized"). There is no stone question: the bracelet is charged to all three leaves at once (closed 2026-10-11).
- **The bump is the Double Turning** (operator, 2026-10-11): Evelyn reads her cup a second time — an
  intangible, **nothing to fulfil**. No page, no email, no link; the delivery time doesn't change
  (24 hours). Its only trace is one P.S. on the receipt for bump buyers. It replaced the Still Cup
  (a delivered nightly instructional); that page, its route and its `04-T5` email are gone.
- **Desktop booking page:** the button sits just below the first screen (885px on 1280×800). Phones are fine (811 of 844).
- **Not 04's:** 28 tests already fail on `development`; walk scripts for 03/06/09 have stale URLs/prices.

---

## 6. Where things are

| What | Path |
|---|---|
| Server | `shared/backendOffers.ts`, `server/routes/backendOffers.ts`, `server/lib/be04Delivery.ts`, `server/lib/backendCustomerList.ts`, `server/lib/cronJobs.ts` |
| Client | `client/src/pages/offers/tea-reading/`, `client/src/lib/{teaReadingPrice,teaReadingBooking,teaReadingReceipt,backendVisitor}.ts`, `client/src/lib/upsellCopy/teaReading.ts`, `client/public/tea-reading/` |
| Price test | `improve-v1/create-be-04-price-experiment-2026-10-11.sql` (run once), `server/lib/experiments.ts` (`resolveBe04Price`, the conversion loggers) |
| Tests | `server/lib/backendOffers.teaReading.test.ts`, `server/routes/backendOffers.teaReading.test.ts`, `server/lib/experiments.be04Price.test.ts`, `server/lib/be04Delivery.test.ts`, `client/src/lib/{teaReadingBooking,teaReadingReceipt,funnel.teaReading,backendVisitor}.test.ts`, `client/src/lib/upsellCopy/teaReading.test.ts` |
| Copy specs | `improve-v1/v1-one-time-BEs/copy/04/` (old drafts are marked *Superseded*) |
| Product | `copy/04/product/` (readings + calendars), `docs/04/product/` (images, cup map, fonts, PDFs) |
| Env vars | `.env.example` → `BE04_*` |
| Evidence | `improve-v1/evidence/04-tea-reading-2026-10-11/` |
