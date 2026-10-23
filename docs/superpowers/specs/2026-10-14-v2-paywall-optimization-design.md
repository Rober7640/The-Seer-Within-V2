# V2 Paywall Optimization — Design Spec

**Date:** 2026-10-14
**Branch:** `feat/v2-paywall-optimization` (off `development`)
**Scope:** V2 multi-persona chat service paywall only. V1 Evelyn funnel (`/` → `/chat` → $35 ritual/upsells) is explicitly **out of scope**.
**Environment:** Localhost only. No deploy, no production DB, no external sends. Experiment stays `draft` for real users.

---

## 1. Goal & success

**Business goal (from the media buyer, relaying Joel):** more buyers. Too many V2 users hit the paywall when their free minutes run out and bounce — they don't buy, or "don't bother to look" at what's offered. Lift the **paywall-view → purchase** conversion rate.

**This week's deliverable:** both levers, together, working and verified on localhost:
- **Workstream A** — enable + harden the already-built redesigned paywall (experiment Variant "B") so it can be turned on confidently, and verify conversion tracking works.
- **Workstream B** — fix the per-guide pricing format bug so each guide's configured prices actually load instead of silently falling back to global defaults.

**Success looks like:**
- Variant B renders correctly and *truthfully* across all paywall surfaces and all trigger moments, locally, through a real browser, with checkout completing in Stripe + PayPal sandbox.
- A persona with custom pricing shows **its own** prices end-to-end (admin → API → user paywall → purchase), while personas without custom pricing still fall back cleanly to defaults.
- Conversion tracking (`paywall_views` → `credit_purchases`) is verified correct on local data.
- Existing behaviour for real users is **unchanged** until someone deliberately starts the experiment (kill-switch intact).

**Non-goals (deliberately deferred):** checkout-rail changes (Apple/Google Pay, PayPal-default re-test — §3.10 of the PostHog doc); lander/quiz mechanic changes (§3.7–3.9); Resend drip tracking fix (§3.6); low-balance banner *timing* change (§3.14.A, needs sign-off). These confound the conversion read or are separate problems.

---

## 2. Current state (verified in code on this branch)

### 2.1 The redesign is built AND wired behind a disabled flag
- Variant "B" components exist: `client/src/components/paywall/` (`PaywallCard.tsx`, `CreditsStoreView.tsx`, `LowBalanceBanner.tsx`, `PaymentSheetView.tsx`), copy in `paywallCopy.ts`, shared tier logic in `shared/paywall.ts` (`applyBVariantBadges`, `defaultTier`).
- Live surfaces branch to B only when `variant === 'B'`: `BuyCreditsModal.tsx`, `CreditsPage.tsx`, `PaymentModal.tsx`, and the `ChatServicePage.tsx` refill banner. Variant A renders today's markup verbatim.
- **Flag mechanism (changed since the June doc):** controlled by the experiments framework, key **`paywall_copy_2026`**, currently status **`draft`** → everyone resolves to A. Resolution: `paywallVariant(userId, personaId)` / `resolvePaywallVariant()` in `server/lib/experiments.ts`; `GET /api/credits/pricing` returns `variant`, `experimentKey`, variant-shaped `tiers`; `POST /api/credits/checkout-view` logs a `paywall_views` row with the server-authoritative variant.
- **QA override (non-prod only):** `?paywallVariant=A|B` forces the arm, inert in production.
- Tests: `tests/paywall-experiment.spec.ts` exists.

### 2.2 Residual Variant-B correctness bugs (must fix before enabling)
The June redesign assumed a tiered model with bonus minutes and bulk discounts. The live model is now **flat $10/$20/$30 at $2.99/min, no bonuses**. Two B strings/derivations are now misleading or broken under flat pricing:
1. **Ladder line** (`paywallCopy.ts` `B.modal.ladder`): *"As low as $X/min on bigger packs."* — implies a bulk discount that does not exist (flat rate). Under flat pricing `lowestPerMinuteLabel` returns the same $2.99 for every pack, so the line is misleading.
2. **Bonus minutes** (`toTierView` in `paywallCopy.ts`): `bonusMinutes` is derived from `tier.bonusCoins`. Current default tiers carry **no `bonusCoins`**, risking `NaN` / "+0 free" rendering wherever B shows bonus minutes. Must be verified in the live B UI and handled (show nothing when there is no bonus).

### 2.3 Per-guide pricing format bug
- Schema: `personas.customPricing` (text/JSON), `personas.freeCoins`, `personas.coinsPerMinute` (`shared/schema.ts`).
- Runtime loader `getPersonaPricing()` (`server/lib/personaPricing.ts:27-44`) requires a **`PricingTier[]`** array where each item has `packageType`, numeric `totalCoins`, numeric `priceUsd`. Anything else → falls back to `DEFAULT_PRICING`.
- **Two writers produce the wrong shape:**
  - **Admin editor** (`client/src/pages/admin/PersonaEditor.tsx`) saves `{ freeCoins, packages: [{ id, label, minutes, priceUsd, popular, savings }] }` — an object with a `packages` key, items keyed by `id`/`minutes`, no `packageType`/`totalCoins`.
  - **Seed** (`server/lib/seedPersona.ts`) writes an array like `{ packageType, minutes, priceUsd, label }` — missing `coins`/`bonusCoins`/`totalCoins`.
- **Net effect:** every persona (incl. Evelyn's intended $15/15min, $25/30min) fails validation → all 6 guides show the global default $10/$20/$30. Documented in `docs/credit-package-fix-guide.md`.

---

## 3. Design

### Workstream A — Enable + harden Variant B (conversion lever)

**A1. Fix the two residual B correctness bugs** (`paywallCopy.ts` / `shared/paywall.ts` as appropriate):
- Ladder line: under a flat per-minute rate, drop the "on bigger packs" bulk-discount framing; show an honest flat-rate line (or omit the ladder entirely when all tiers share one rate). Keep it data-driven so it auto-corrects if a future guide *does* get bonus tiers.
- Bonus minutes: when a tier has no `bonusCoins` (or `0`), render no bonus line and never emit `NaN`. Verify every B surface that references minutes/bonus.

**A2. Verify B end-to-end locally via the QA override** (`?paywallVariant=B`), through a real browser, covering:
- All 4 surfaces: in-chat `BuyCreditsModal`, out-of-credits modal, `/credits` `CreditsStoreView`, `PaymentSheetView`.
- All 3 trigger moments: (a) time hits 0:00 mid-chat; (b) low-balance banner / buy-button tap; (c) "Continue Reading" with no time left — correct headers + close-button labels per variant.
- Checkout completes under **both** rails (Stripe + PayPal sandbox); coins granted; reading resumes.
- "non-refundable" appears **nowhere** in B; the single money-back-guarantee line is consistent across modal + store + payment sheet.

**A3. Define the "turn it on" procedure (local).** Document the exact switch to move `paywall_copy_2026` from `draft` → `running` with a persona scope + `percentB`, and the instant kill (`draft`/disable). For real prod users it stays `draft`. (We do not start a live experiment in this task; we prove it's ready.)

### Workstream B — Fix per-guide pricing format

**Approach: Option A from the fix guide** — make both writers save the canonical `PricingTier[]` the loader already understands. This leaves the proven purchase pipeline untouched.

**B1. Canonical format.** `PricingTier[]` with `packageType`, `coins`, `bonusCoins`, `totalCoins` (`= coins + bonusCoins`), `priceUsd` (cents), `label`, optional `badge`/`recommended`. A single shared helper converts human inputs (minutes + price) → a `PricingTier` using the persona's `coinsPerMinute`, so admin and seed produce identical shapes.

**B2. Admin editor** (`PersonaEditor.tsx`): save the canonical `PricingTier[]` (flat array) instead of `{ freeCoins, packages }`. Editor continues to let the admin enter minutes + price; derive `coins`/`totalCoins` via the shared helper. Load/round-trip existing data.

**B3. Seed** (`seedPersona.ts`): emit canonical tiers (incl. Evelyn's $15/15min, $25/30min with correct `totalCoins`).

**B4. Data migration (local).** One-off idempotent local script/transform: read each persona's `customPricing`, detect legacy shapes (`{packages}` object, or arrays missing `totalCoins`), convert to canonical `PricingTier[]`, write back. Personas with no custom pricing are left null (fall back to defaults). Dry-run output before writing.

**B5. Loader hardening (defensive):** optionally teach `getPersonaPricing()` to accept-and-normalize legacy shapes so a stray old row degrades gracefully instead of silently reverting to defaults. Decide during planning whether this is in-scope or redundant after B4.

### Cross-cutting — Conversion tracking verification
- Confirm one `paywall_views` row per modal open with correct `{ user_id, variant, surface, persona_id, is_out_of_credits }`.
- Run the view→purchase conversion query (PostHog doc §3.13) on seeded local data (incl. 7-day window + first-view-per-user dedup) and confirm correct numbers.
- Measurement source of truth is the **app DB** (`credit_purchases`), not PostHog, per the doc.

---

## 4. Data & interfaces touched

| Area | File(s) | Change |
|---|---|---|
| B copy correctness | `client/src/components/paywall/paywallCopy.ts`, `shared/paywall.ts` | Ladder + bonus-minutes fixes |
| Pricing format (canonical + helper) | `shared/types.ts` (PricingTier), new/updated shared helper | Minutes+price → PricingTier |
| Admin editor | `client/src/pages/admin/PersonaEditor.tsx`, `server/lib/personaManager.ts` | Save canonical array |
| Seed | `server/lib/seedPersona.ts` | Canonical tiers |
| Migration | new `server/scripts/*.ts` (local, idempotent, dry-run) | Convert legacy → canonical |
| Loader (optional) | `server/lib/personaPricing.ts` | Normalize legacy defensively |
| Tests | `tests/paywall-experiment.spec.ts`, pricing tests, `docs/test-ideas.md` | Extend/add |

No change to: the purchase pipeline (`server/routes/credits.ts` tier resolution), coin/billing model, Stripe/PayPal endpoints, or the experiment framework itself.

---

## 5. Testing strategy

- **Unit:** the minutes+price→`PricingTier` helper; `toTierView` with zero/absent `bonusCoins`; `lowestPerMinuteLabel` under flat pricing; legacy→canonical conversion.
- **Integration/API:** `GET /api/credits/pricing?personaId=…` returns a persona's custom tiers (not defaults) after fix; returns defaults when none set; returns correct `variant` under the QA override.
- **E2E (Playwright, local):** keep `paywall-experiment.spec.ts` green; add coverage for B truthful copy (no "non-refundable", no NaN/bonus artifacts, honest rate line) and for a custom-priced persona showing its prices. Note pre-existing stale failures in `tests/credits.spec.ts` (old $15/"15 Minutes" assertions) — update to current model as part of this work.
- **Manual (real browser, local):** the A2 and trigger-moment walkthrough; Stripe + PayPal sandbox purchases; tracking-row spot check.

---

## 6. Acceptance criteria (Definition of Done)

- [ ] Variant B renders correctly on all 4 surfaces and all 3 trigger moments locally; checkout completes on Stripe **and** PayPal sandbox; coins granted; reading resumes.
- [ ] In B: "non-refundable" appears nowhere; one consistent money-back line; no NaN/"+0 free"/false bulk-discount copy; rate line is honest under flat pricing.
- [ ] A persona with custom pricing shows **its own** prices in admin, in `GET /api/credits/pricing`, on the user paywall, and on purchase; personas without custom pricing fall back to defaults.
- [ ] Admin can create/edit per-guide packages; saved rows are canonical `PricingTier[]`; migration converts existing legacy rows idempotently (dry-run reviewed first).
- [ ] Exactly one correct `paywall_views` row per modal open; the §3.13 conversion query returns correct numbers on seeded local data.
- [ ] Real-user behaviour unchanged: experiment stays `draft`; kill-switch flips everyone to A; the documented local "turn on" procedure works.
- [ ] Existing paywall/credits tests green (stale `credits.spec.ts` assertions updated); new test cases added to `docs/test-ideas.md`.
- [ ] Everything on `feat/v2-paywall-optimization`; nothing merged/deployed; no prod DB touched.

---

## 7. Risks & open questions

- **Variant B copy vs flat pricing** — primary risk; A1 addresses it, A2 verifies it. There may be more stale B strings than the two found; A2's full walkthrough is the backstop.
- **Admin editor migration round-trip** — changing the saved shape must not corrupt existing persona rows; dry-run + idempotent migration + backup of `customPricing` values first.
- **Loader defensive normalization (B5)** — include or skip? Decide in planning (redundant if B4 is clean, but cheap insurance).
- **"Turn on" authority** — this task proves readiness on localhost only; actually starting the live A/B is a separate, explicit go decision (Joel's), not part of this work.
