# French (fr-FR) Finish-and-Ship — Design

**Status:** Draft for approval · **Date:** 2026-11-24 · **Branch:** `translations-dev` (local only, not pushed)
**Owner decisions settled:** market = France/EUR (Joel), same-number euro pricing, Stripe EUR confirmed available.

## Intent & why

Joel built a complete French localization of the V1 `/fb` + `/fb-tarot` funnel (17 commits on `translations-dev`). It is verified English-safe and behind an off-switch (`live: false`), so **nothing is live yet**. This plan takes that built-but-dormant work and finishes the launch plumbing so a French visitor can go end-to-end: French pages → French checkout in EUR → French reading delivered → tracked → safety intact. French is also the proven template we will later copy for Spanish (`es-US`), so finishing it correctly de-risks that.

## Goals

- A visitor on `/fb?lang=fr` / `/fb-tarot?lang=fr` completes the whole funnel in French.
- Checkout charges in **EUR** (same numbers as USD: €35 / €47 / €30 …), hosted page renders in French.
- French orders deliver the **French reading** (via n8n), and land on the **French AWeber** list/tag.
- French buyers can enter a **French shipping address** on the physical upsells.
- The locale goes live only when every gate is green; the switch is a one-line flip.

## Non-goals (this launch)

- Spanish `es-US` — separate project, starts after French is live.
- Tarot coverage beyond the **top 20 landers** already translated (untranslated hooks safely fall back to all-English — no mixed page).
- V2 chat-app localization; belief-lane translation (deliberately English-fallback for non-English visitors).
- True FX pricing — we charge the same *numbers* in euros by decision, not a converted amount.

## Anti-goals (what makes this a failure even if it "works")

- **Any** change to English behavior (English must stay byte-identical — currently 42/42 snapshots).
- A currency mismatch: a French order whose 1-click upsell charge fails or charges the wrong currency.
- A French buyer hitting an English checkout page, or receiving an English reading.
- A French crisis/refund message not handled by the French safety pack.

## Constraints

- **English untouched** — every change gated behind `requestLocale() !== 'en'` or locale-derived values that are empty for English.
- **Stripe rule:** an off-session (1-click) charge must use the **same currency as the original order** — can't create a EUR customer order then charge it in USD.
- **Safety first:** `shared/lang/fr.ts` tests (`tests/l10n/lang-fr.test.ts`) must pass before any live French traffic (already green; keep green).
- **Local only** — no commits/pushes until Joel/you approve; some steps need Joel/Pauline (AWeber, n8n access, ad links).

## Approaches considered

**A — Finish Joel's built work + wire the remaining launch plumbing (chosen).** The 17 commits are done and proven; what's missing is EUR payment wiring, n8n routing, AWeber, shipping countries, and the go-live flip. Lowest risk, reuses everything proven, and is the template for Spanish.

**B — Ship French at USD now, add EUR later.** Rejected by Joel — he confirmed EUR. Would also mean a French page showing "35 €" while Stripe charges $35, which is incoherent.

**C — Rebuild/re-translate.** Wasteful — the translation is reviewed, tested, and English-safe already.

→ **A.** There is genuinely one sensible path; B and C are ruled out above.

## The work (by stream)

### 1. EUR payment wiring  *(code — the biggest piece)*
Today every checkout path hardcodes `currency: "usd"`; the locale's `market.currency` (`eur`) and `stripeLocale` (`fr`) are declared but unused. **This is a per-site allow-list, NOT a centralized helper** (see the hard rule below).

**Exactly 6 V1 sites in scope** (`server/routes.ts`), confirmed by code review:
- Main checkout line `price_data.currency` (~1443) + its Checkout Session.
- Order bump line `price_data.currency` (~1464).
- Upsell 1 **1-click** PaymentIntent (~2866) and Upsell 1 **fallback hosted checkout** (~3106).
- Upsell 2 **1-click** PaymentIntent (~3592) and Upsell 2 **fallback hosted checkout** (~3926).

Rules:
- **Keep `unit_amount` cents as-is** → `3500` renders as **€35.00**, matching the French copy exactly. No new price table. (EUR and USD are both 2-decimal; smallest amount €25–€30 is well above Stripe's €0.50 EUR minimum — no amount math changes.)
- **Hosted pages in French:** pass `locale: 'fr'` (from `market.stripeLocale`) to the main + both fallback Checkout Sessions.
- **Currency source of truth = the ORIGINAL order, not `requestLocale()`.** The two 1-click charges already `stripe.checkout.sessions.retrieve(..., expand:["payment_intent"])`, so `session.currency` is right there — mirror it. ⚠️ Using `requestLocale()` instead is a latent money bug: if the `seer_locale` cookie is missing/stale on that request (other device, cleared cookie, direct hit), the code would try to charge USD against a EUR customer → **Stripe rejects the off-session charge and the 1-click silently fails.** Same rule for the two fallback hosted checkouts: read `orig.currency` off the already-retrieved session (today they only read `noemail/src/device` from it).
- **Upsell orders must also carry `metadata.locale`**, inherited from the retrieved original session — the 1-click PIs and fallback checkouts build their own metadata blocks today and do NOT include it. Without this, n8n routes the French *upsell* reading to the English flow (see stream 3).
- **Price-variant A/B pool + sliding close** produce cent integers with no currency attached — they ride through unchanged as EUR (verified).

- **PAI path (Decision 1 — LOCKED to the split):** thread `currency: "EUR"` through the PAI charge path (`paiLive.ts` 1-click + fallback, `paymentsai.ts`) and carry `metadata.locale` on PAI orders, mirroring the 6 Stripe sites. French rides the same 50/50 gateway split already running on `/fb` + `/fb-tarot`.

**🚫 HARD RULE — do NOT centralize currency into a shared helper.** The Soulmate funnel (`/api/soulmate/*`, ~8 `currency:"usd"` sites at 4620–5135) and the PAI / credits / backend-offers / paypal paths MUST stay hardcoded USD — they never carry `?lang=fr`, and the English-byte-identical guarantee depends on them being untouched. Currency is derived only inside the 6 V1 sites above, keyed on the V1 order's locale/currency. Any temptation to "flip currency everywhere" breaks English.

### 2. Shipping countries  *(code — small)*
`shipping_address_collection.allowed_countries` is `["US","CA","GB","AU","NZ","SG"]` (±IE) and omits **FR**. Add `"FR"` (France only — decided) to the V1 upsell checkout sessions so French buyers can enter a shipping address on the physical upsells (bracelet / lava stone). Gate so English countries are unchanged.

### 3. n8n reading routing  *(n8n — Joel applies to live; I prep the exact change)*
The French reading flow already exists and was proven on a Stripe **test** order (flow `gJ5ZPAQzJxk3OYyw`, path `the-seer-within-v1-v2-stripe-fr`). Only the **router line** is missing: in the Live Stripe Router, send orders where `metadata.locale === 'fr-FR'` to that French flow (English matches on `product`, unchanged). The **main** checkout already writes `metadata.locale` to both the session and PI — but the **upsell** PIs and fallback checkouts do not yet (fixed in stream 1), so French upsell orders only route correctly once stream 1's locale-propagation is in.

### 4. AWeber French list  *(Joel/Pauline own)*
French orders get the `-fr` tag suffix. Needs a **French list + delivery campaign** so French buyers get French follow-up/delivery emails, not the English ones.

### 4b. Downstream reporting currency  *(code — small, my call to include)*
Trackdesk (`server/lib/trackdesk.ts`) and Facebook CAPI (`server/lib/facebook.ts`) hard-code `currency: 'USD'` on every V1 conversion; PostHog logs `amount_cents`. None touch the charge, so none can break English or mischarge — but a €35 order reported to Meta/Trackdesk as **$35** skews ROAS and affiliate attribution. Included in scope: report the **order's** currency for French orders. (If you'd rather defer this, it's cosmetic to revenue data, not to buyers — say so and it drops out.)

### 5. QA / tests  *(code + manual)*
- Convert the 31 French items in `docs/test-ideas.md` into Playwright specs.
- A full manual French walk of `/fb` and `/fb-tarot` (greeting → close → both upsells).
- **One real EUR test charge** end-to-end (checkout → upsell 1-click → n8n French reading → AWeber) — the acceptance gate.
- Spot-check the **quality of the French reading Evelyn actually generates** (live Claude output), not just the static copy.

### 6. Go-live  *(one line, last)*
Flip `fr-FR.live` `false → true` in `shared/locales.ts` only after 1–5 are green.

### 7. Ad traffic  *(media buyer — you)*
French ads point at `/fb?lang=fr` (or `/fb-tarot?lang=fr`). The `?lang=fr` is orthogonal — it appends to any existing funnel URL.

## Decisions settled (2026-11-24)

1. **Payment gateway → French rides the normal Stripe+PAI 50/50 split (LOCKED 2026-11-27).** Joel confirmed PAI is **live in production** and the Stripe-vs-PAI split test is **already running on `/fb` and `/fb-tarot`** — the exact funnels French targets. So EUR is wired on **both** paths: the 6 Stripe sites **and** the PAI charge path (`paiLive.ts` 1-click + fallback, `paymentsai.ts`). PAI support confirmed EUR is fully enabled (pass `currency: "EUR"`, no setup; splits/reserve work in EUR; €0.50 min; refunds in EUR; 3DS set up for the EU). French PAI orders must also carry `metadata.locale`. Note: EU buyers hit **3DS/SCA**, so an off-session 1-click upsell may require authentication (`needs_action`) on either gateway — the funnel already has that fallback path; verify in EUR during QA.
2. **Shipping → France only.** Add `"FR"` to `allowed_countries` on the physical upsells; no EU-wide expansion this launch.
3. **Ownership → I write all code locally; Joel owns the live/production actions.** I do the EUR wiring, shipping, reporting-currency, QA/tests, and **prep** the n8n router change as a ready-to-apply note. Joel applies the live n8n router line, sets up the AWeber French list, and confirms Stripe live.
4. **Coverage → launch with `/fb` + top-20 tarot.** Untranslated tarot hooks fall back to all-English; more landers are a later run, not a launch blocker.

## What's left to the builder

Follow the French commits as the reference implementation. Order of build: **EUR wiring (1) + shipping (2) → verify with a real EUR test order → n8n (3) → AWeber (4) → QA (5) → flip live (6).** English-unchanged snapshot + `lang-fr` safety tests must stay green throughout. Nothing merges to `development`/`Production` until Joel signs off; keep it on `translations-dev` locally.
