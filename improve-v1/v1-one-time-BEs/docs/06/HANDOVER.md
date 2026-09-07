# Handover — Offer 06, the Wishing Bracelet

**For:** the developer picking up the build. **From:** a content/copy pass that finished
2026-09-02. **Status:** every decision is made and every piece of copy is written. Zero
application code exists yet. This doc is the bridge between those two facts.

Read `docs/06/0-WORKFLOW-06.md` for the full decision history and reasoning if you want it — this
doc only gives you what you need to start building, not the "why."

---

## 1. What this offer is, in one paragraph

A $49 fixed-price physical product — a black agate bracelet with a cast two-horned Pixiu (Bixie)
figure and a sealed wish capsule. Sold through an AWeber email (already written, not your concern)
that drives to a booking page. No chat conversation, no AI-generated personalization, no reply
needed from the buyer at any point — she reads five statements, pays, gives a shipping address,
sees two upsells (both are V1's existing products, reused verbatim), and gets a receipt. The
product ships for real, so there's a real multi-week wait and a tracking-number delivery email
instead of the instant-PDF pattern every other backend offer uses.

---

## 2. Everything is decided. Here's the list.

| Decision | Value |
|---|---|
| Root URL (D1) | `/wiccan/wishing-bracelet` |
| Main price | $49 fixed (no PWYW, no ladder) |
| Order bump price | $11.11 |
| Fulfillment | our own sourced unit, not dropship |
| Funnel archetype | **Reading-shaped** — no reply needed, thank-you page is a receipt (contrast 03/Judgement Day, which is Act-shaped and its thank-you screen is an intake form) |
| Product archetype | **Object-shaped** — Phase B has no PDF/document step. The "product" is: package the physical item, ship it |
| Insert cards | box ships with 4–5 blank paper inserts; buyer picks one to write on and seal in the capsule. Not personalized, not something the funnel needs to generate |
| The "A" clasp logo in the product photo | confirmed to be our own logo, no compliance issue |
| Free gift (P3-equivalent) | explicitly skipped for this offer |
| Upsells | V1's actual Protection Ritual (U1) and Manifestation Bracelet (U2), reused **verbatim** past their opening beats — same pattern 02 already uses |

None of these are open questions any more. If you think one should be revisited, that's a product
call, not a build call — flag it, don't just change it.

---

## 3. Every piece of copy is written. Here's where.

All in `improve-v1/v1-one-time-BEs/copy/06/`:

| File | What it's for | Feeds into |
|---|---|---|
| `06-E2-esl-product-creature-a-close-c.md` | the sales letter (sent by AWeber, not built by you) | nothing you build — reference only for tone/facts |
| `06-C1-booking-page.md` | the booking page's 5 statements + shipping-wait consent + button | your booking page component |
| `06-C3-order-bump.md` | "The Closed Purse" order bump, renders on the booking page | your booking page component |
| `06-U1a-upsell1-opening-beats.md` | U1's opening beats only — reuses V1's `SOLUTION` onward unchanged | `client/src/lib/upsellMessages.ts`-equivalent for offer 06 |
| `06-U2a-upsell2-opening-beats.md` | U2's opening beats, both Path A and Path B — reuses V1's `UPSELL2_GAP` onward unchanged | `client/src/lib/upsell2Messages.ts`-equivalent for offer 06 |
| `06-T1-thank-you-page.md` | the on-screen receipt page's copy | your thank-you page component |
| `06-T3-confirmation-email.md` | sends immediately on payment | AWeber campaign, once built |
| `06-T4-delivery-email.md` | sends when the order actually ships, carries a `{{AWEBER_TRACKING_URL}}` placeholder | AWeber campaign, once built |

Every file passes `node improve-v1/v1-one-time-BEs/scripts/copy-check.cjs <file>` clean and every
file's own frontmatter table + Build notes explain what it reuses vs. rewrites, and why. Read the
frontmatter table before you start wiring any one of them — it tells you exactly which parts of an
existing offer's code you're cloning vs. writing fresh.

---

## 4. What to actually build (Phase A + Phase C)

Nothing exists in `client/`, `server/`, or `shared/` for offer 06 yet — confirmed by grep, not
assumed. Build order, cloning from 02 (Twin Flame) wherever the pattern is shared:

### 4.1 The catalog row — do this first

`shared/backendOffers.ts` is the one place a backend offer's price, Stripe product key, and route
map live. Read its header comment (it explains the security model: the browser never sends a
price). You need to:
1. Add `'wishing-bracelet'` to the `BackendOfferKey` union.
2. Add `'06'` to `BackendOffer['number']`'s union type.
3. Add a `PRICE_CENTS` / `BUMP_CENTS` export pair (`4900`, `1111`), same pattern as
   `TWIN_FLAME_PRICE_CENTS`.
4. Add the catalog entry itself to `BACKEND_OFFER_CATALOG`, with `readyForMoney: false` until your
   thank-you screen actually renders — that flag is the existing safety gate that stops a buyer
   from paying for something that can't be fulfilled yet, use it, don't skip it.
5. `stripeProduct` must start with `be_` (e.g. `be_wishing_bracelet`) — every branch of the live
   webhook skips anything that doesn't match that prefix, which is what keeps 6 other funnels safe
   from a new offer's mistakes. Read the header comment's warning about `trackdeskClickId` too —
   never add it to this offer's checkout metadata.

### 4.2 Shipping — don't build this from scratch

The address-collection pattern already exists, generically, in `server/routes/backendOffers.ts`'s
`POST /api/backend/upsell/shipping` endpoint, and in `server/lib/braceletOrders.ts` /
`client/src/components/upsell/ShippingForm.tsx` — this is the exact V1 Manifestation Bracelet
pattern the 06 decisions already call for reusing. Read those three files before writing anything
new. The shipping form is deferred to AFTER Stripe succeeds (not bolted onto the booking page) —
that's a locked decision (§2), not a suggestion.

### 4.3 Screens to build

| Screen | Clone from | Notes |
|---|---|---|
| Booking page | `02`'s booking page component | Page treatment only — no chat variant is called for; 06 has no AI-driven conversation, just 5 static statements + a bump |
| Order bump | `02`'s bump rendering, plus its own product-code path | Master workflow's build order flags this explicitly: "its OWN product code," not shared with the main checkout |
| Upsell 1 & 2 | `client/src/hooks/useUpsellChat.ts` / `useUpsell2Chat.ts`, config-driven | `06-U1a`/`06-U2a`'s own frontmatter tables name the exact source line ranges in `upsellMessages.ts`/`upsell2Messages.ts` that stay unchanged |
| Thank-you page | `client/src/pages/TwinFlameThankYouPage.tsx` | Receipt only — no intake form, no "reading is being prepared" language (06-T1's copy enforces this explicitly) |

### 4.4 Then

- Wiring + tests (A7) — prove the live V1/02/03 funnels are untouched, same as every prior offer.
- Walk it in a browser, screenshot every screen (A8) — same convention every offer in this deck
  follows; add offer 06's screens to the "every screen we have built" table in the master
  `docs/0-WORKFLOW.md`.
- Phase C: add `06` to the shared customer list (`be-customer` + a new `be-06` tag), then wire
  `06-T3`/`06-T4` into an actual AWeber campaign once one exists.

---

## 5. Things only a human can do — not blocked on code, but blocking a real launch

- **Real Stripe price IDs** for $49 and $11.11 (test mode first, same as every other offer). Build
  dark behind `BACKEND_CHECKOUT_LIVE` (`client/src/lib/backendCheckout.ts`) until these exist —
  every other offer in this deck ships this way, don't invent a different pattern for 06.
- **The definitive product photo.** The letter currently ships with an interim, Codex-edited photo
  (`assets/06-pixiu-product-angle-fixed.png`) that the operator explicitly acknowledged is not
  pixel-faithful on fine text/logo detail. A real photo of the actual sourced unit should replace
  it before this goes live — the untouched original crop is still on disk
  (`06-pixiu-product-real-cropped.png`) as a fallback if a new shoot isn't ready in time.
- **The AWeber campaign itself** — building the sends, swapping every `%FIRSTNAME%`/`{{AWEBER_…}}`
  placeholder for the real merge fields and tracking-URL custom field, seed-testing it. `06-T3`'s
  and `06-T4`'s own Build notes list every placeholder that needs swapping.

---

## 6. Rules that will break something if you don't follow them

- **Verb is never "buy."** Every piece of copy uses "send"/"ship"/"secure" — matches the deck-wide
  convention, already baked into the copy, don't introduce "buy" in any new UI strings either.
- **The upsells use nothing collected about the buyer.** No situation, no name, no personal detail
  — by design, and 06's booking page collects nothing that could leak in anyway.
- **Never write to the `evelyn/tarot/` S3 prefix.** Unrelated to this offer's own assets, but
  `host-be-asset.cjs` (used to host 06's images) shares that guard rail with the live tarot
  broadcast pipeline — don't work around it if you ever touch that script.
- **Don't touch `06-E2-esl-kaucim.md` / `06-E2-esl-iching.md`.** Two losing candidates kept
  deliberately as reference (see `0-WORKFLOW-06.md`'s Fourth-round note) — not dead code to clean
  up, not part of what you're building.
- **The 12 letter images are already hosted on S3** (`06-creature-a-images.json` has the URLs) —
  you don't need to re-source or re-upload anything for the letter itself. The definitive product
  photo (§5) is the one real image gap.

---

## 7. How to verify your own work as you go

- `node improve-v1/v1-one-time-BEs/scripts/copy-check.cjs <file>` — run against any copy file you
  touch. Should always print `PASS`.
- `node improve-v1/v1-one-time-BEs/scripts/render-be-esl-preview.mjs improve-v1/v1-one-time-BEs/copy/06/06-E2-esl-product-creature-a-close-c.md improve-v1/v1-one-time-BEs/copy/06/06-creature-a-images.json`
  — regenerates the letter's HTML preview if you ever need to eyeball it again.
- Once screens exist: walk the whole funnel in a browser end to end (A8) and confirm the existing
  V1/02/03 funnels still work — that's the actual acceptance bar this deck has used for every prior
  offer, not a 06-specific requirement.
