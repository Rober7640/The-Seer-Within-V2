# Shared Backend Upsell Engine — design

**Date:** 2026-09-01
**Branch:** `feat/be-02-golive` (worktree `../seer-be02-golive`)
**Status:** Design — awaiting review before implementation plan.

---

## Problem

Backend offer **02 (Twin Flame)** is live with a working upsell chain (Upsell 1
Protection Ritual, Upsell 2 Bracelet). Offer **03 (Judgement Day)** has its own
booking pages and its own *rewritten* upsell pitch copy
(`copy/03/03-U-upsell-beats.md`), but **no upsell code** — and Joel confirmed in
the 2026-08-12 call that the **physical products are the same across offers; only
the pitch changes.**

Two things block "add an offer without waiting on a dev to rebuild upsells":

1. **The upsell chain is hardcoded to twin-flame.** In
   `server/routes/backendOffers.ts` the charge stamps `offer: 'twin-flame'` and
   `description: 'BE 02 · …'` on **every** upsell PaymentIntent, regardless of
   which offer the buyer came from. The client picks the upsell copy off the
   `isTwinFlameOffer()` URL-prefix gate, which only knows twin-flame.

2. **Upsell purchases are not recorded per offer.** Only *booking* purchases are
   written to `be_orders`. Upsell purchases only get an AWeber list write (tagged
   per *product*, e.g. `be-02-upsell1-protection`), so a Judgement Day buyer who
   buys the bracelet is **indistinguishable** from a Twin Flame buyer who buys
   the bracelet. Offer-wise upsell stats are currently impossible.

## Goal

A **single shared upsell engine** every backend offer reuses. Adding an offer's
upsells becomes: (1) a booking page at the offer's URL, (2) a pitch module
registered by offer key, (3) one catalog row. No new upsell pages, no new
charge/webhook/product code, and **stats are automatically per-offer**.

## Non-goals

- **Twin Flame (02) is grandfathered and untouched.** It keeps its
  `/tarot/twin-flame` URLs and its existing upsell pages. We do not restructure a
  live funnel.
- We do **not** introduce new physical products. Upsell 1 = `be_protection_ritual`,
  Upsell 2 = `be_bracelet`, shared across offers (Joel's decision).
- Building 03's thank-you/Entry page ("A6") is a **separate task** (see
  Dependencies). This spec makes the upsell engine reusable; it does not finish
  03's tail.

---

## Design

### 1. URL + folder layout

New backend offers live under an `/offers/` umbrella:

| | URL |
|---|---|
| 03 booking (page) | `/offers/wiccan/judgement-day` |
| 03 booking (chat) | `/offers/wiccan/judgement-day/chat` |
| 03 thank-you / Entry | `/offers/wiccan/judgement-day/success` |
| **Shared upsell 1** | `/offers/upsell/welcome1` |
| **Shared upsell 2** | `/offers/upsell/welcome2` |

- Move 03's routes and the `JUDGEMENT_PREFIX` constant from `/wiccan/judgement-day`
  to `/offers/wiccan/judgement-day`. Safe — 03 is not live.
- Shared upsell pages live in a new `client/src/pages/offers/upsell/` folder.
- **Twin Flame is not moved.** It stays at `/tarot/twin-flame/*`.

### 2. New decoupled upsell pages

Build fresh backend-only upsell pages under `/offers/upsell/`, adapting the
proven twin-flame upsell logic but **cut free of V1's shared `UpsellPage` /
`Upsell2Page`**. Rationale: the chosen `/offers/` structure, and V1 can never be
affected by backend changes. The twin-flame pages stay exactly as they are.

The shared page resolves everything from the booking `session_id` it is entered
with:

```
/offers/upsell/welcome1?session_id=<booking cs_…>
  → GET /api/backend/upsell/user-data?session_id=…   (already returns `offer`)
  → pick pitch  = BACKEND_UPSELL_PITCH[offer]
  → charge      = POST /api/backend/upsell/charge  { checkoutSessionId, email, product }
```

### 3. Per-offer pitch registry (copy reuse)

A registry keyed by offer:

```ts
// client/src/lib/backendUpsellPitch.ts (new)
BACKEND_UPSELL_PITCH: Record<BackendOfferKey, UpsellPitch> = {
  'twin-flame':    twinFlameUpsellCopy,   // unchanged, still used by 02's own pages
  'judgement-day': judgementUpsellCopy,   // NEW — Joel's 03-U beats, coded
}
```

- The shared page selects the pitch by the offer returned from `user-data`.
- Offers with no custom pitch fall back to a shared default (so a new offer can go
  live on default copy before Joel rewrites the beats).
- `judgementUpsellCopy` is authored from `copy/03/03-U-upsell-beats.md`
  (partial rewrite: only the 03-specific beats; shared scaffolding stays shared).

### 4. Offer attribution — remove the hardcode

`server/routes/backendOffers.ts`, upsell charge:

- Read the originating offer from the booking session
  (`session.metadata.offer`), not a literal.
- Stamp `offer: <resolved>` and `description: 'BE ' + offer.number + ' · ' + …`
  (each catalog row already has `number`).
- AWeber tag becomes offer-aware:
  `upsellPurchaseTags(offerNumber, product)` → `be-03-upsell1-protection`.

### 5. Recording — DB + AWeber

**DB (new table `be_upsell_orders`):** one row per upsell PaymentIntent.

| column | note |
|---|---|
| `id` | pk |
| `stripe_payment_intent_id` | UNIQUE — idempotent on webhook retry |
| `booking_session_id` | FK-ish → the `be_orders.stripe_session_id` it came from |
| `offer` | `'twin-flame' \| 'judgement-day' \| …` — the attribution key |
| `product` | `be_protection_ritual \| be_bracelet` |
| `tier` | `'full' \| 'downsell'` |
| `amount_cents` | |
| `email` | |
| `created_at` | |

Written from the webhook's `payment_intent.succeeded` branch for `be_` upsell
products (the branch that already calls `addBackendUpsellCustomer`). Non-blocking
and idempotent, same discipline as `recordBackendOrder`.

**AWeber:** unchanged mechanism, but tags per offer (§4).

**Reporting:** per-offer stats come from one query — initial from `be_orders`
grouped by `offer`, U1/U2 from `be_upsell_orders` grouped by `offer` + `product`.
A dashboard tile is optional and out of scope here; correct *recording* is the
deliverable.

### 6. Turn upsells on for 03

- Set `upsellEntryPath: '/offers/upsell/welcome1'` on the `judgement-day` catalog
  row (currently undefined → "no upsells"). This deliberately overrides the old
  "ACT offer, straight to receipt" note.
- Flow: booking → pay → U1 → U2 → thank-you(=Entry). 03's own upsell copy already
  assumes the Entry is collected *after* the upsells ("the three nights start the
  moment your Entry reaches me"), so the order is consistent.

---

## What a new offer needs after this

1. A booking page at `/offers/<brand>/<slug>`.
2. A pitch module registered in `BACKEND_UPSELL_PITCH` (or use the default).
3. One catalog row: price model, bump, `upsellEntryPath: '/offers/upsell/welcome1'`.

No new upsell pages / charge / webhook / product / stats code.

---

## Dependencies & risks

- **A6 (03 thank-you = Entry form) is still unbuilt.** After Upsell 2, the buyer
  lands on 03's `/success`, which does not yet exist. The upsell engine is
  reusable immediately, but **03 cannot go fully live until its Entry page is
  built** (separate task). Until then, `/offers/upsell/*` can be exercised in
  preview/QA and by 02-style offers whose success page exists.
- **`be_upsell_orders` migration** must run on dev and prod (same discipline as the
  `be_orders` table that was missing on prod and silently dropped attribution —
  see `create-be-orders-table-2026-08-31.sql`). Do not repeat that: ship the
  migration with the code and verify `to_regclass` on prod.
- **Product not blocked by URLs:** reuse + stats do not depend on the `/offers/`
  layout; that layout is the chosen organization. If moving 03's routes proves
  noisy against Joel's in-progress work, the fallback is to keep 03 at `/wiccan/…`
  and only share the upsell route — same engine, different booking prefix.

## Confirmed refinements (2026-09-01, post-code-recon)

Three-agent read of the current branch settled open details:

- **Offer + copy are resolved from the booking SESSION, not the URL.** Because the
  shared `/offers/upsell/*` URL cannot itself say which offer it is, the pages read
  the offer from `GET /api/backend/upsell/user-data?session_id=` (which already
  returns `offer`). The pitch registry is therefore keyed by **offer key**, not by
  pathname:
  `BACKEND_UPSELL_PITCH: Record<BackendOfferKey, { upsell1: Upsell1Copy; upsell2: Upsell2Copy }>`.
  It reuses the EXISTING copy types `Upsell1Copy` / `Upsell2Copy`
  (`client/src/lib/upsellCopy/types.ts`); `judgementUpsellCopy` implements the same
  shape from `copy/03/03-U-upsell-beats.md`. (Note: the current pathname-based
  resolver `upsell1Copy()/upsell2Copy()` in `client/src/lib/backendOffers.ts` stays
  for 02's own pages; the new shared pages use the offer-keyed registry.)
- **Attribution is URL-independent** — it comes from the booking Stripe session
  (`session.metadata.offer`, else `backendOfferForStripeProduct(session.metadata.product).key`).
  So the server/data work below is identical regardless of the URL layout.
- **Reuse what's already generalized:** `funnel.ts` already has `isBackendOffer()`,
  `isJudgementOffer()`, `backendOfferPrefix()`, `BACKEND_OFFER_PREFIXES`. The charge
  already has `backendOrderDescriptor(key, bumpPurchased)` that builds `BE 03 · …`
  from the catalog `number` — the upsell charge will use the same rather than a new
  hardcode.
- **Two offer maps exist and both matter:** `BACKEND_OFFER_CATALOG`
  (`shared/backendOffers.ts`, pricing/routing) and `BACKEND_OFFERS`
  (`server/lib/backendCustomerList.ts`, AWeber lists/tags — already has a
  `judgement-day` entry with `be-03-*` tags but no upsell list wiring).

### Decomposition into two implementation plans

1. **`be-upsell-attribution-and-recording`** (server + data) — this spec's §3, §4,
   §5. Independently shippable; also corrects 02's upsell attribution.
2. **`shared-offers-upsell-pages`** (client) — this spec's §1, §2, §3-client, §6:
   the `/offers/upsell/*` pages, offer-keyed pitch registry, `judgementUpsellCopy`,
   and 03's `/offers/wiccan/judgement-day` URL move.

## Testing

- **Unit:** pitch registry resolves per offer + default fallback; `upsellPurchaseTags`
  emits `be-03-…`; charge builds `offer`/`description` dynamically from the booking
  session; `be_upsell_orders` insert is idempotent on PI id.
- **Route smoke:** `/offers/upsell/welcome1` with a bogus session → fallback, not
  500; with no session → 400 (mirrors existing endpoint guards).
- **Data smoke (dev, Stripe test):** a 03 test purchase + upsell writes a
  `be_upsell_orders` row with `offer='judgement-day'` and the AWeber tag
  `be-03-upsell1-protection`; a 02 purchase still records `offer='twin-flame'`
  (no regression).
- **Stats query:** returns correct per-offer counts for a mixed 02/03 test set.

## Rollout

- Behind the existing `BACKEND_CHECKOUT_LIVE` gate; prod stays dark until the
  migration is run and 03's Entry page exists.
- Twin Flame regression check: 02's own upsell pages and attribution unchanged.
