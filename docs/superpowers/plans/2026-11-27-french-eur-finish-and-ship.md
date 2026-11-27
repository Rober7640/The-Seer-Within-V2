# French EUR Finish-and-Ship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a French (`fr-FR`) visitor's V1 `/fb` + `/fb-tarot` order charge in EUR — on BOTH the Stripe and Payments.AI gateways — render the checkout in French, accept a French shipping address, carry its locale to n8n, and report EUR to the pixels, with English byte-identical throughout.

**Architecture:** The locale is already resolved per-request (`requestLocale()` from the `seer_locale` cookie) and per-order (`metadata.locale`). This plan threads **currency** the same way: NEW orders (main line, bump) take currency from the *visitor's* locale; off-session *upsell* charges take currency from the *original order* (never the live cookie — it may be stale). Changes are a per-site allow-list, never a shared global helper, so the Soulmate/credits/backend-offers/PayPal paths stay hardcoded USD.

**Tech Stack:** Node/Express, Stripe SDK (`price_data` inline + `paymentIntents`), Payments.AI REST client (`paymentsai.ts`), Drizzle, Playwright, vitest.

**Spec:** `docs/superpowers/specs/2026-11-24-french-finish-and-ship-design.md`

## Global Constraints

- **English byte-identical.** Every change is gated on a non-English locale/currency; English keeps `currency:"usd"`, no Stripe `locale`, no `FR` shipping, no `locale` metadata. Gate (English snapshots 42/42, `lang-fr` safety tests) must stay green.
- **Pricing = same numbers in euros.** `unit_amount` cents are UNCHANGED (`3500` → €35.00). No new price table, no FX conversion. (EUR & USD both 2-decimal; min amount €25–30 > Stripe/PAI €0.50 min.)
- **Scope = exactly these payment sites.** Stripe: main line (~1443), bump (~1464), upsell1 1-click (~2866) + fallback (~3106), upsell2 1-click (~3592) + fallback (~3926). PAI: `chargeUpsell1Pai`, `chargeUpsell2Pai`, and the PAI main-order create. **DO NOT touch** Soulmate (`/api/soulmate/*`, 4620–5135), `credits.ts`, `products.ts`, `backendOffers.ts`, `paypal.ts` — they never carry `?lang=fr`.
- **Off-session currency source = the original order**, not `requestLocale()`. Read `session.currency` (Stripe) / the PAI order's currency.
- **Local only.** Work on branch `feat/french-eur-finish` off `translations-dev`, in an isolated worktree. No push/merge until Joel signs off.
- **Legal copy / tarot names / French voice:** unchanged — already shipped and reviewed on `translations-dev`.

## Review Focus

- **Stale/missing `seer_locale` cookie on an upsell charge** (other device, cleared cookie, direct hit): the EUR customer must still be charged EUR, not USD → Stripe/PAI reject an off-session currency mismatch and the 1-click silently fails. Covered by Task 4/5/6 tests (charge with no request locale still uses order currency).
- **English order unchanged:** USD, no `locale` param, no FR shipping, no `locale` metadata, pixels still USD. Covered by Task 2 + Task 7 English-path tests.
- **Soulmate/other funnels stay USD:** a shared helper must not leak EUR into them. Covered by Task 1 test (helper is locale-keyed) + a Task 2 assertion that `/api/soulmate` currency is untouched.
- **EU 3DS/`needs_action` on an off-session EUR upsell:** the existing fallback path must trigger, not crash. Exercised in Task 8 (live EUR test order with the auth-required EU test card).
- **EUR purchase misreported as USD** to Trackdesk/Meta (ROAS/attribution bug): covered by Task 7.

---

### Task 1: Currency + Stripe-locale helpers (locale-keyed, English-safe)

**Files:**
- Modify: `server/lib/locale.ts`
- Test: `tests/l10n/locale-currency.test.ts` (create)

**Interfaces:**
- Consumes: `requestLocale()`, `localeDef()` (existing), `LocaleCode`.
- Produces:
  - `requestCurrency(locale?: LocaleCode): "usd" | "eur"` → `localeDef(locale ?? requestLocale()).market.currency`.
  - `requestStripeLocale(locale?: LocaleCode): "fr" | "es" | "en" | undefined` → `localeDef(...).market.stripeLocale` (undefined for English = today's behavior).

- [ ] **Step 1: Write failing tests**

```ts
// English is the default and MUST stay USD / no stripe locale
test("requestCurrency defaults to usd outside a request", () => {
  expect(requestCurrency("en")).toBe("usd");
  expect(requestStripeLocale("en")).toBeUndefined();
});
test("French locale is eur + fr", () => {
  expect(requestCurrency("fr-FR")).toBe("eur");
  expect(requestStripeLocale("fr-FR")).toBe("fr");
});
```

- [ ] **Step 2: Run — expect FAIL** (`requestCurrency is not a function`). Run: `npx vitest run tests/l10n/locale-currency.test.ts`
- [ ] **Step 3: Implement** `requestCurrency` and `requestStripeLocale` in `server/lib/locale.ts` (read straight off `localeDef().market`).
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** `feat(l10n): currency + stripe-locale helpers off the request locale`.

---

### Task 2: Main checkout line + order bump — EUR + French Stripe page

**Files:**
- Modify: `server/routes.ts` (main `price_data.currency` ~1443, Checkout Session create, bump `price_data.currency` ~1464)
- Test: `tests/l10n/checkout-currency.test.ts` (create — assert on the Stripe params object; stub `stripe.checkout.sessions.create`)

**Interfaces:**
- Consumes: `requestCurrency()`, `requestStripeLocale()` (Task 1), existing `localeMetadata()`.
- Produces: the main Checkout Session for a French order has `currency:"eur"` on both line items, `locale:"fr"`, `metadata.locale:"fr-FR"`; `unit_amount` unchanged.

- [ ] **Step 1: Write failing tests** — with request locale `fr-FR`: both `line_items[].price_data.currency === "eur"`, session `locale === "fr"`, `metadata.locale === "fr-FR"`, and `unit_amount` equals the same cents as the English path. With locale `en`: `currency === "usd"`, `locale` undefined, no `metadata.locale`. Add one assertion that a `/api/soulmate` checkout session is still `usd` (import/exercise its builder or assert the soulmate code path is untouched).
- [ ] **Step 2: Run — expect FAIL.** Run: `npx vitest run tests/l10n/checkout-currency.test.ts`
- [ ] **Step 3: Implement** — replace the two hardcoded `currency:"usd"` at the main + bump `price_data` with `requestCurrency()`; add `locale: requestStripeLocale()` to the Session create. Leave `unit_amount` and everything else untouched.
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** `feat(l10n): main + bump checkout charge EUR and render French`.

---

### Task 3: Upsell 1 (Stripe) — 1-click PI + fallback checkout in order currency, FR shipping, locale metadata

**Files:**
- Modify: `server/routes.ts` — `/api/upsell/charge` 1-click PI (~2866); upsell1 fallback checkout endpoint (~3031) incl. `price_data.currency` ~3106, `shipping_address_collection.allowed_countries` ~3130
- Test: `tests/l10n/upsell1-currency.test.ts` (create)

**Interfaces:**
- Consumes: the original Stripe session is already retrieved in both handlers (`stripe.checkout.sessions.retrieve(..., expand:["payment_intent"])`) — read `origSession.currency` and `origSession.metadata?.locale`.
- Produces: a French upsell-1 charge/checkout uses the ORIGINAL order's currency; fallback checkout adds `"FR"` to shipping countries and `locale:"fr"`; PI/session metadata carries `locale`.

- [ ] **Step 1: Write failing tests** — (a) 1-click PI for a EUR original order creates a PaymentIntent with `currency:"eur"` **even when the request has no `seer_locale` cookie** (stale-cookie guard). (b) A USD original order → PI `currency:"usd"` (unchanged). (c) The fallback checkout for a French order has `allowed_countries` including `"FR"`, `locale:"fr"`, `metadata.locale:"fr-FR"`; an English order's `allowed_countries` is exactly the current list (no `FR`) and no `locale`.
- [ ] **Step 2: Run — expect FAIL.** Run: `npx vitest run tests/l10n/upsell1-currency.test.ts`
- [ ] **Step 3: Implement** — PI `currency` = `origSession.currency`; fallback `price_data.currency` = `origSession.currency`; append `"FR"` to `allowed_countries` only when the order locale resolves to a non-US market; add `locale: requestStripeLocale(resolveLocale(origSession.metadata?.locale))` and `...localeMetadata(resolveLocale(origSession.metadata?.locale))`.
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** `feat(l10n): upsell 1 charges in the order currency, French shipping + locale`.

---

### Task 4: Upsell 2 (Stripe) — same treatment as Task 3

**Files:**
- Modify: `server/routes.ts` — `/api/upsell2/charge` 1-click PI (~3592); upsell2 fallback checkout (~3859) incl. `price_data.currency` ~3926, `allowed_countries` ~3952
- Test: `tests/l10n/upsell2-currency.test.ts` (create)

**Interfaces:**
- Consumes: same pattern as Task 3 (`origSession.currency`, `origSession.metadata?.locale`).
- Produces: upsell-2 1-click + fallback mirror Task 3 behaviour.

- [ ] **Step 1: Write failing tests** mirroring Task 3 for the upsell-2 routes (EUR 1-click incl. the no-cookie guard; USD unchanged; FR shipping + `locale` + `metadata.locale` on the French fallback; English fallback unchanged).
- [ ] **Step 2: Run — expect FAIL.** Run: `npx vitest run tests/l10n/upsell2-currency.test.ts`
- [ ] **Step 3: Implement** the same edits on the upsell-2 PI + fallback checkout.
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** `feat(l10n): upsell 2 charges in the order currency, French shipping + locale`.

---

### Task 5: Payments.AI path — EUR currency + locale metadata on the split arm

**Files:**
- Modify: `server/lib/paiLive.ts` (PAI main-order create; `chargeUpsell1Pai`; `chargeUpsell2Pai`), `server/lib/paymentsai.ts` (pass `currency` on the transaction create — the request type already has `currency?: string`)
- Test: `server/lib/paiLive.test.ts` (extend)

**Interfaces:**
- Consumes: `requestCurrency()` for a NEW PAI main order; the stored PAI order's currency for the off-session upsell charges; `localeMetadata()`.
- Produces: a French PAI order creates the transaction with `currency:"EUR"` and `metadata.locale:"fr-FR"`; PAI upsell charges reuse the order's currency. English PAI orders send no currency (today's behaviour) / `usd` and no locale.

- [ ] **Step 1: Write failing tests** — a French PAI main-order create call includes `currency:"EUR"` and `metadata.locale`; a French PAI upsell charge uses EUR; an English PAI order is unchanged (no `currency` field / `usd`, no `locale`). Assert at the `paymentsai.ts` call boundary (stub `fetch`/`call`).
- [ ] **Step 2: Run — expect FAIL.** Run: `npx vitest run server/lib/paiLive.test.ts`
- [ ] **Step 3: Implement** — thread an order-currency value into the PAI charge functions and the main-order create; set `currency` (uppercased per PAI, `"EUR"`) and add `localeMetadata()` to the transaction metadata. Gate so English PAI orders are byte-identical.
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** `feat(l10n): Payments.AI charges French orders in EUR with locale`.

---

### Task 6: Pixel/affiliate reporting in the order currency

**Files:**
- Modify: `server/lib/facebook.ts` (`StripeFbEventParams` + `fireStripePurchaseEvent` ~366/413 — add a `currency` field, default `"USD"`); `server/routes.ts` (the `fireStripePurchaseEvent(...)` and `reportTrackdeskConversion(...)` V1 call sites — pass the order currency, uppercased)
- Test: `tests/l10n/reporting-currency.test.ts` (create)

**Interfaces:**
- Consumes: `reportTrackdeskConversion({ currency })` (already supports it, defaults `'USD'`); `sendFacebookEvent({ currency })` (already supported). Out of scope: `fireV2PurchaseEvent` / `maybeFireFirstPurchaseEvent` (V2 app).
- Produces: a French V1 purchase reports `currency:"EUR"` to Meta and Trackdesk; English reports `"USD"` unchanged.

- [ ] **Step 1: Write failing tests** — `fireStripePurchaseEvent` with a EUR order passes `currency:"EUR"` to `sendFacebookEvent`; the Trackdesk call for a EUR order passes `currency:"EUR"`; English → `"USD"` both.
- [ ] **Step 2: Run — expect FAIL.** Run: `npx vitest run tests/l10n/reporting-currency.test.ts`
- [ ] **Step 3: Implement** — add `currency?: string` to `StripeFbEventParams`, use it (default `"USD"`) at line ~413; at the V1 call sites pass the order's currency (from the webhook/session) uppercased.
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** `feat(l10n): report French orders to Meta + Trackdesk in EUR`.

---

### Task 7: English-unchanged gate + French Playwright specs

**Files:**
- Create: `tests/l10n/french-funnel.spec.ts` (Playwright — from the 31 items in `docs/test-ideas.md`)
- Run: `scripts/l10n/en-snapshot.sh` **compared against `origin/development`** (the branch's true base — NOT the stale Production merge-base the script defaults to; see spec note)

**Interfaces:**
- Consumes: the whole funnel after Tasks 1–6.
- Produces: proof English renders identically and the French happy path (no `$`, prices read `35 €`, no English bubble, French crisis → 3114, FR checkout in EUR) holds.

- [ ] **Step 1:** Write the Playwright spec covering the test-ideas checklist (no `$` on French pages; `?lang=fr` sets cookie + `<html lang=fr>`; an untranslated tarot hook stays all-English; French crisis → 3114 not 988; name capture "Je m'appelle Marie" → "Marie").
- [ ] **Step 2:** Run the English snapshot compare (branch vs `development`). Expected: **42/42 identical.**
- [ ] **Step 3:** Run `npx vitest run tests/l10n` + `npm run check`. Expected: l10n green; tsc = 46 (pre-existing), none in l10n files.
- [ ] **Step 4: Commit** `test(l10n): French funnel specs + English-unchanged gate`.

---

### Task 8: Live EUR test order end-to-end (manual acceptance gate — not a code task)

Not a commit; the go/no-go gate before Joel's live steps. Run a real **sandbox/test** EUR order on BOTH gateways:
- Stripe test: main + bump + upsell1 1-click + upsell2 — all charge **EUR**, hosted page in French, FR shipping accepted, **the auth-required EU test card drives the `needs_action` fallback** without crashing.
- Force a PAI order (`txn_…`) in sandbox: same walk, EUR, €0.50-min respected.
- Confirm each order carries `metadata.locale:"fr-FR"` (so Joel's n8n router line will route it) and that the reading flow `the-seer-within-v1-v2-stripe-fr` fires on a test event.

Then hand Joel: the n8n router-line note, the AWeber French-list need, and the final `live:false → true` flip (spec streams 3, 4, 6).
