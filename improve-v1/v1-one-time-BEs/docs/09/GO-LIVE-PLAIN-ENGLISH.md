# Heart Cleanser (Offer 09) — plain-English go-live guide

_Written 2026-09-23 for the media buyer. Companion to the developer's `HANDOVER.md`._

## The short version

The offer is **fully built**. Joel wrote all the code and it is tested. Today I finished
the **one** piece of code that was still missing — a safe "test-mode" switch so a fake
order can be walked before real money is turned on. Nothing has been deployed, no database
was touched, no email was sent, no card was charged.

What is left is **setup work in your dashboards** (Stripe, AWeber) and **one database step
Joel must run**. None of that was done today, on purpose — you asked me to stay off the
databases, and those steps hit the shared live database.

---

## 1. Is the flow ready? — Yes, with one thing added today

| Part of the flow | State |
|---|---|
| Offer page + "tick four" + $59 price | Built |
| $11.11 Reiki add-on (order bump) | Built |
| Stripe checkout that also takes the shipping address | Built |
| The two after-sale upsells (Protection Ritual, Manifestation Bracelet) | Built |
| Receipt page with the address + "Added" line | Built |
| Parcel record + packer alert (leads with "⚡ REIKI CHARGE BEFORE PACKING") | Built |
| Tracking email when you mark it shipped | Built, but **unused** — support does tracking by hand |
| **Safe test-mode switch to trial an order before go-live** | **Added by me today** |

### What I added, in plain words
Before today, the code refused **all** checkout for offer 09 until the final "go live"
switch is flipped. That is correct — but it also meant you could not safely rehearse a fake
order first. I added a **development-only** switch that lets you run a **Stripe test-card**
order for 09 while the real switch stays off. It is deliberately harmless:

- It does **nothing** unless someone sets `BACKEND_CHECKOUT_TEST_MODE=true`.
- It **refuses** on the live/production site no matter what.
- It **refuses** unless the Stripe key is a **test** key (`sk_test_...`), so it can never
  take a real card.

The real "take live money" switch (`readyForMoney`) is untouched and still OFF.

---

## 2. How did the tests go?

**The 09 tests: all pass.** 24 of 24 in the heart-cleanser test file, including the 4 new
tests I wrote for the switch above. I checked the code before and after my change and my
work adds **zero** new problems. The type-check count is unchanged (46 warnings, all
pre-existing and known — the handover says to expect exactly that).

**The full test run:** 1,385 tests pass, 24 fail. **None of the 24 failures are ours.**
They are all in other parts of the app and fail for one of two boring reasons:
1. They need a database connection to run (they say `DATABASE_URL is not set`) — and you
   asked me to stay off the databases, so I did not give them one.
2. They check the wording of **other** funnels' pages (tarot landers), not offer 09.

I proved these 24 were already failing **before** I touched anything, so they are not
something I broke and not something blocking 09.

> Note: the code I wrote is saved on your machine but **not committed and not pushed**. It is
> waiting for you/Joel to review. Nothing has gone to the live site.

---

## 3. What you need to do in AWeber

Work on the **backend customer list `6972552`**.

> **How your team actually works (operator decision, 2026-09-23):** tracking is done by hand
> by the support team, **not** from AWeber. So you can **skip the 3 custom fields** and you do
> **not** build a tracking email. The **confirmation email is the only email AWeber sends** for
> this offer.

**Step A — build one Campaign (automation) on that list:**

| Campaign | Send it when this tag is added | Email to use |
|---|---|---|
| Order confirmation | `be-09-heart-cleanser` | `order-emails/09-T3-confirmation-email.html` (+ the `.txt`) |

In that email, replace `{{AWEBER_STRIPE_ORDER_ID}}` with the real field from AWeber's own field
picker. Then send yourself a seed test: once as a subscriber **with** a first name, once
**without**, to confirm both read correctly. _(This email only uses the order-ID field — none
of the tracking fields — so nothing else is needed to make it work.)_

**Skipped on purpose:**
- ❌ The 3 custom fields (`tracking_url`, `tracking_number`, `carrier`) — only the tracking
  email used them, and you're not sending it.
- ❌ The tracking / shipped Campaign (`09-T4-shipment-email`) — support sends tracking manually.

_Harmless leftover: the code still adds a `be-09-shipped` tag if a parcel is ever marked
shipped in the admin tool. With no Campaign listening for that tag, nothing happens — it just
sits on the record. No action needed._

**Step B — upload the 3 sales emails** as drafts (with their matching text parts), set the
timing between them, and suppress buyers from the rest of the sequence:

| # | Subject line | File |
|---|---|---|
| 1 | Wear this on your left wrist, {{first name}} | `sales-emails/09-E4-esl-v1-evelyn.html` (+ `.txt`) |
| 2 | Before you put his name inside, read this | `sales-emails/09-E4-esl-email-2-evelyn.html` (+ `.txt`) |
| 3 | She wrote his name. Then he called. | `sales-emails/09-E6-esl-email-3-anna-evelyn.html` (+ `.txt`) |

**Do NOT:**
- ❌ Do **not** build a Campaign on the tag `be-09-bump`. There is no Reiki email by design;
  the receipt's "Added" line is the only confirmation of the add-on.
- ❌ Do **not** add the confirmation Campaign on list `6972554` — it also gets the purchase
  tag, so a Campaign there would email the buyer twice. Keep it only on `6972552`.
- ❌ Do **not** upload any `-preview` files, and use only the files named above (older drafts
  in that folder were deleted; only the final ones remain).

---

## 4. What you need to do for the database

**Important: this is a developer step (Joel), not a dashboard step. I did not run it, because
it changes the shared live database.**

- Four migration files must be run **in this exact order**, **before** the branch is deployed:
  1. `migrations/2026-09-03-be-07-daily.sql`
  2. `migrations/2026-09-13-be-08-marcus.sql`
  3. `migrations/2026-09-13-be-08-editions.sql`
  4. `migrations/2026-09-15-be-shipments.sql`
- 🔴 **Never run `npm run db:push`.** Dev and production share one database and that command
  would apply everyone's half-finished work. Run the four SQL files by hand instead.
- **Why the order and the timing matter:** the new code expects columns and a new table that
  the live database does not have yet. If the code is deployed **before** the migrations run,
  it can break reads for existing buyers of offers 02/03/06 too — not just 09.

All four files exist in the repo and are safe to re-run.

---

## 5. The remaining go-live checklist (for the dev doing the deploy)

In order (full detail in `HANDOVER.md`):

1. Run the 4 migrations above on the shared database (do this **first**).
2. Set `ORDERS_NOTIFY_EMAIL` to whoever packs the parcels.
3. Stripe dashboard: turn on the **`charge.refunded`** webhook event (both accounts if B is used).
4. Do the AWeber setup in section 3.
5. Deploy the branch **with checkout still off**.
6. **Rehearse a full test order** using the new switch: set `BACKEND_CHECKOUT_TEST_MODE=true`
   on a non-production build with a Stripe **test** key, then walk one order end to end
   (offer → tick four → tick the bump → pay with a test card → upsell 1 → upsell 2 → receipt
   → check the parcel record and the "REIKI CHARGE BEFORE PACKING" alert → confirmation email
   arrives once → then refund it and check the parcel cancels). _You can skip the "mark shipped
   → tracking email" part, since tracking is handled manually by support._
7. Only after that passes: flip `readyForMoney: true` for `heart-cleanser` in
   `shared/backendOffers.ts`, set `VITE_BACKEND_CHECKOUT_LIVE=true`, rebuild, deploy.

Still waiting on **Joel's sign-off** (not on you): the email copy, the sequence plan, the
packing instructions, and the insert-card print size.

---

## 6. One thing to watch after launch
If a buyer ever refunds **only** the $11.11 Reiki add-on (not the whole order), nothing
happens automatically — the parcel still shows the add-on as bought. Someone has to tell the
packer by hand. Full orders refunded do cancel the parcel automatically.
