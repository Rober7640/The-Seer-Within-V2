# Coin → Minute / Per-Minute Pricing — Build Plan

**Status:** ✅ IMPLEMENTED (Path A) on branch `feat/per-minute-pricing`, LOCAL ONLY — not committed,
not pushed. Typechecks clean (no new `tsc` errors). Behavioral test on the running app still pending.

## Implementation log (2026-07-16)

**Pricing (source of truth):**
- `shared/types.ts` — `DEFAULT_PRICING.tiers` → flat $2.99/min packs $10/$20/$30(MOST POPULAR)/$50
  (coins 201/401/602/1003, `bonusCoins:0`); added `PRICE_PER_MINUTE_USD = 2.99`. Free trial stays 180 = 3 min.
- `server/scripts/seed.ts` — added blanket `personas.customPricing = null` so every guide inherits the
  flat default. (Note: existing stored `customPricing` is old-format and already rejected by
  `getPersonaPricing`, so the running dev DB already serves flat pricing via fallback — no re-seed needed to test.)

**Relabel coins → minutes/$ (customer-facing):**
- `client/src/components/CreditBadge.tsx` — header badge: `X coins` → `X min`, Coins→Clock icon.
- `client/src/pages/ChatServicePage.tsx` — live in-chat meter + paused pill now a ticking **M:SS** clock
  (Clock icon); receipt/refill/idle/purchase toasts, banners, dividers, "Get More Minutes" all de-coined.
- `client/src/components/BuyCreditsModal.tsx` (primary live buy modal) — flat tiers, grid shows **min** not
  coins, header/subhead → minutes, bonus block removed.
- `client/src/components/PaymentModal.tsx` — order summary shows minutes.
- `client/src/pages/CreditsPage.tsx` (variant-A layout) — balance/rate/promo/grid/footer → minutes + $/min.
- `client/src/components/paywall/*` (CreditsStoreView, PaymentSheetView, PaywallCard, paywallCopy) — variant-B
  paywall copy + tile math; `toTierView` shows 1-decimal minutes and computes $/min from exact minutes.
- `client/src/pages/PersonasDirectory.tsx` — card + detail pricing badges show `$2.99/min` (Clock icon).
- `client/src/components/ChatServiceNav.tsx` — nav "Credits" → "Minutes". `PreReadingWelcome.tsx`,
  `WelcomeChatPage.tsx` — button/copy → minutes. `OutOfCreditsModal.tsx` (dead code) — relabeled for safety.

**Left untouched (as planned):** billing engine `creditTracking.ts`, caps, `secondsToCoins`,
`COINS_PER_MINUTE`, promo wallet, `personas.coins_per_minute` (all still 60). Admin/dev screens still say
"coins" (internal, staff-facing) — intentional.

**Verified (2026-07-16, live on localhost dev):**
- `tsc` adds no new errors on touched files; tier math = $2.99/min on all packs, 3 free min.
- Pricing API (`/api/credits/pricing`) returns flat $2.99/min for every persona (via DEFAULT_PRICING fallback).
- Playwright walkthrough (new user, 3 free min): personas cards show **$2.99/min · 3 mins free**; header badge
  **🕐 5 min**; nav **Minutes**; promo **3 FREE minutes**; /credits balance **5 minutes**, tiers
  **3.3/6.6/10/16.7 min @ $2.99/min** (MOST POPULAR on $30), buttons **Buy Minutes**, footer **unused minutes**;
  in-chat meter renders as a ticking **M:SS clock** and counted **5:00 → 4:45** (15s billing-block cadence,
  same as before — only the display format changed). Fixed a missed **"Buy Coins"→"Buy Minutes"** button +
  purchase-history "coins"→minutes on CreditsPage during this pass.
- Remaining "coins" strings are admin/dev-only (UserDetail, PersonaEditor, Analytics, DebugOverlay) —
  intentionally staff-facing.

---

**Author:** Claude (for Joel / Mike)
**Date:** 2026-07-16
**Where we're building:** this repo, on a dedicated branch (NOT `Production`).
**DB during build:** localhost dev only (repo `.env` = localhost seed data, never prod).

---

## 1. What Joel actually wants (plain language)

1. **Stop showing "coins." Show time and money.** A customer should see *"4 minutes left"* / a
   dollar value — never a coin count.
2. **Charge a real price per minute.** Evelyn starts at **$2.99/min**, with room to push toward
   **$9.99/min** later. Setting/raising the price should be easy.
3. **Show the time ticking in the chat** so the customer watches their minutes go down while they talk.
4. **When time runs out → paywall to top up.** *"Add more minutes: $10 / $20 / $30."* Buy → minutes
   refill → keep chatting.
5. **(Deferred)** True one-click auto-recharge (saved card / PayPal billing agreement). Not in v1 —
   needs stored payment methods we don't have set up and PayPal capabilities we haven't confirmed.

---

## 2. Key finding — most of this is ALREADY BUILT

Traced the live billing path 2026-07-16. Inventory of what exists today:

| Piece Joel wants | Already there? | Where |
|---|---|---|
| Paywall leads with "X minutes left" | ✅ yes | `client/src/components/paywall/CreditsStoreView.tsx:63-66` |
| Countdown ring + "[persona] will wait for you" | ✅ yes | `client/src/components/OutOfCreditsModal.tsx:201-206` |
| Inline PayPal + card top-up (tap to pay) | ✅ yes | `OutOfCreditsModal.tsx:210-229` |
| Tiers shown in minutes + $/min | ✅ yes | `paywallCopy.ts:27-40` (`toTierView`) |
| Per-persona pricing fields in DB | ✅ yes | `personas.coinsPerMinute`, `personas.freeCoins`, `personas.customPricing` |
| Engine already bills by **time** (per-second, 15s blocks) | ✅ yes | `server/lib/creditTracking.ts` (checkpoint/heartbeat) |
| The word "coins" still leaks in a few places | ❌ needs relabel | see §5.B |
| Packages priced as **bulk coin bundles w/ bonus** (bulk discount) | ❌ needs reprice to flat $/min | `shared/types.ts:174-182` `DEFAULT_PRICING` |
| Live minute-ticker **inside the chat** | ⚠️ verify/enhance | `client/src/pages/ChatServicePage.tsx`, `CreditBadge.tsx` |
| Price set to $2.99/min | ❌ config change | pricing tiers |

**Conclusion: this is config + relabel + a small in-chat timer, not a rebuild.**

---

## 3. How the billing engine works today (so we don't break it)

- A user's wallet is `users.coin_balance` (an integer). **1 coin currently = 1 second of chat**
  (because `COINS_PER_MINUTE = 60`, `shared/types.ts:138`).
- While chatting, a heartbeat every 30s + checkpoints bill in **15-second blocks** at a per-persona
  rate `personas.coins_per_minute` (default **60**). See `checkpointSession` / `endChatSession` /
  `cleanupInactiveSessions` in `server/lib/creditTracking.ts`.
- `secondsToCoins(seconds, rate)` = `floor(seconds/15) * (rate/4)` — the single conversion used
  everywhere (`shared/types.ts:151`).
- Free trial = `freeCoins = 180` = 3 minutes (`shared/schema.ts:114`).
- Promo credits live in a **separate pot** spent before the real balance (`promoWallet.ts`).
- Safety brakes (all currently correct **because rate = 60**):
  - `MAX_BILLABLE_SECONDS = 1800` (30 min) — time-based, `creditTracking.ts:16`
  - `MAX_COINS_PER_DEDUCTION = 180` (3 min @ 60) — **coin-based**, `creditTracking.ts:20`
  - post-commit `maxBillableCoins = secondsToCoins(1800)` — **defaults rate to 60**, `creditTracking.ts:311`
- This path is heavily hardened (dead-air refunds, invariant alerts, tz-safe SQL). **Do not refactor it.**

---

## 4. Chosen approach

### ✅ Path A — "Reprice + Relabel" (RECOMMENDED for first ship)

**Idea:** keep the engine exactly as-is. A "coin" stays an internal second-of-time the customer never
sees. **All pricing is expressed as the dollar price of a minute-package.** The customer only ever sees
minutes and dollars.

- Rate stays **60** for every persona (do **not** touch `coins_per_minute`).
- A minute-package = `minutes × 60` coins, priced to hit the target $/min.
  - e.g. at **$2.99/min**: 3 min = 180 coins for $8.99, 6 min = 360 coins for $17.99,
    10 min = 600 coins for $29.90/$29.99.
  - To push to **$9.99/min** later: same coin amounts, just raise the dollar prices. One edit.
- Free trial stays **180 coins = 3 min** (unchanged).
- **No balance migration** — a coin still means the same second, so every existing wallet keeps its
  exact minute value.
- **No cap changes** — every safety brake stays valid because the rate stays 60.

**Why this is the right first ship:** it delivers everything in §1 (items 1–4) with the smallest possible
blast radius and **zero risk to existing customer balances**. The scary parts (migration, resizing the
billing safety caps, per-block rounding) are all avoided.

**The one limitation (honest):** with a shared wallet burning at a uniform 60/min, you can't make
*different personas* cost *different* $/min at the same time — all personas burn the same wallet at the
same speed. For the **Evelyn price test that's fine** (we're pricing one persona / one flat rate). A
differently-priced roster (deferred) is what forces Path B.

### ⏸ Path B — "Coin = Cent" dollar wallet (DEFERRED — do later)

Redefine 1 coin = 1 cent so the wallet becomes real dollars and `coins_per_minute` becomes cents/min
(Evelyn = 299). Cleaner long-term and required for a differently-priced 10–20 persona roster and for
auto-recharge. **But it requires all three scary things**, so it is NOT in this ship:

1. **Migrate every existing balance + promo grant** (×~5 to preserve minutes) — risk of robbing or
   over-crediting real customers.
2. **Resize the safety caps in time, not coins** — `MAX_COINS_PER_DEDUCTION` and the post-commit
   `maxBillableCoins` (`creditTracking.ts:311` currently hardcodes rate 60) would otherwise trip on a
   normal session and silently **under-bill**.
3. **Handle per-block rounding** (299 ÷ 4 = 74.75 isn't a whole cent).

Trigger to revisit Path B: the multi-priced persona roster, or true saved-card/PayPal auto-recharge.

---

## 5. Path A — exact changes (this is the checklist)

### A. Pricing config → flat $/min  **(CONFIRMED: $2.99/min, round-dollar packs, ALL personas)**
- [ ] Replace `DEFAULT_PRICING.tiers` (`shared/types.ts:174-182`) with **flat** packages,
      `bonusCoins: 0`, at **$2.99/min** (coins = `round(dollars / 2.99 * 60)`):
  | Price | coins (`totalCoins`) | `priceUsd` (cents) | shown as | badge | $/min |
  |--:|--:|--:|--:|--|--:|
  | $10 | 201  | 1000 | ~3.3 min  |               | $2.99 |
  | $20 | 401  | 2000 | ~6.7 min  |               | $2.99 |
  | $30 | 602  | 3000 | ~10 min   | MOST POPULAR  | $2.99 |
  | $50 | 1003 | 5000 | ~16.7 min |               | $2.99 |
- [ ] **Display fix:** `toTierView` (`paywallCopy.ts:27-40`) floors minutes to a whole number — with
      round-dollar packs that makes $/min read as $3.33 instead of $2.99. Show **one decimal** (or a
      rate line "$2.99/min") so the tiles are honest.
- [ ] Scope = **ALL personas** (uniform 60/min burn, uniform price). Do NOT set per-persona rates —
      per-persona *different* $/min is the deferred Path B. Raising the whole platform to $9.99/min
      later = re-price these same coin amounts (one edit).
- [ ] Mirror these into `OutOfCreditsModal.tsx` `FALLBACK_TIERS` (`:21-26`) so the modal never shows
      stale bundles if the pricing fetch fails.
- [ ] Confirm the Stripe/PayPal grant paths credit `totalCoins` on purchase (they already key off the
      tier's `totalCoins` / `priceUsd`): `server/routes/webhooks.ts`, `server/routes/credits.ts`,
      `server/routes/chatService.ts`. **No logic change expected — verify only.**
- [ ] (Optional, if per-persona price wanted now) set the same tiers as each persona's
      `customPricing` JSON via `/admin` or `updatePersonaPricing` — but for a single flat test the
      default is enough.

### B. Kill every remaining "coins" in the UI (relabel only)
- [ ] `client/src/components/CreditBadge.tsx` — shows `"{coins} coins"` (`:66-69`). Change to minutes
      (e.g. `~{minutes} min`). This is the persistent header badge — highest-visibility leak.
- [ ] `CreditsStoreView.tsx:67-69` — remove/replace the `"{coins} coins"` subline under the minutes.
- [ ] `OutOfCreditsModal.tsx:190-197` — the "Top up {coins} coins for {price}" offer line → minutes.
- [ ] `client/src/components/paywall/paywallCopy.ts` — variant **B** strings still say "coins":
      `commit` (`:89`), `store.balanceValue` (`:102-103`), `store.rateLine` "60 coins = 1 minute" (`:110`),
      `refundLine` "unused coins" (`:112`), and `valueBody`/`valueHeader` promise **bonus/bulk-discount**
      minutes (`:106-107`) which is **false under flat pricing** — rewrite to a flat-rate value prop.
- [ ] Grep sweep for any other `coins` user-facing copy: `ChatServiceNav`, `Dashboard`, `CreditsPage`,
      `PaymentModal`, `PreReadingWelcome`, success/low-balance banners.

### C. Live in-chat minute meter
- [ ] Verify what `ChatServicePage.tsx` shows during an active chat. If there's no visible, live-ticking
      "minutes remaining" indicator, add one that decrements as the session bills (drive it off the
      balance + the same 15s cadence the server uses — display only, server remains the source of truth).
- [ ] Keep it honest: "you only spend during a live reading, idle is free" is already true and already
      messaged (`CreditsStoreView` idleNote) — mirror that in-chat.

### D. Paywall trigger / top-up flow
- [ ] Confirm the 402 `OUT_OF_CREDITS` gate opens `OutOfCreditsModal` and that a successful top-up
      refills and lets the chat resume without a reload (`ChatServicePage.tsx`). This already works —
      verify after the relabel.

### E. Do NOT touch (explicit)
- [ ] `server/lib/creditTracking.ts` billing math, caps, refund paths — **leave as-is**.
- [ ] `personas.coins_per_minute` — **leave at 60 for all personas** (changing it is what would
      trip the latent cap bug at `creditTracking.ts:311` and turn this into Path B).
- [ ] `shared/types.ts:138` `COINS_PER_MINUTE` and `secondsToCoins` — **leave as-is**.
- [ ] Promo wallet / promo grants — **leave as-is** (still minute-valued, still correct).

---

## 6. What we're explicitly NOT doing in this ship
- Coin = cent dollar-wallet redefinition (Path B) + its balance migration.
- Different $/min per persona at the same time (needs Path B).
- True one-click / auto-recharge with stored card or PayPal billing agreement.
- Free-form "type any top-up amount" input (fixed packages only for v1).

---

## 7. Testing (all on localhost dev DB + Stripe test keys)
- [ ] New account → confirm 3 free minutes shown as **minutes**, no "coins" anywhere.
- [ ] Chat until free minutes run down → confirm live meter ticks → paywall fires at 0.
- [ ] Buy the $10 pack (Stripe test card) → confirm balance refills to the right **minutes** and chat resumes.
- [ ] Same for PayPal sandbox.
- [ ] Confirm billing amount unchanged vs today for the same elapsed time (relabel must not change what's charged).
- [ ] Run the V2 eval + the existing playwright billing smoke; confirm no regression.
- [ ] Confirm an existing seeded user's balance still shows the same minutes as before (no migration = no change).

---

## 8. Rollout / safety
- Build on a branch (e.g. `feat/per-minute-pricing`). Never commit to `Production` directly.
- Nothing reaches live customers until Joel OKs a push to `rober/development` → then to `Production`,
  same as every other change.
- Kill-switch: because Path A changes **only pricing data + copy**, reverting = revert the branch /
  reset the pricing tiers. No customer balances were altered, so there's nothing to un-migrate.

---

## 9. Decisions — RESOLVED 2026-07-16
1. ✅ **Path A** (reprice + relabel, no migration).
2. ✅ **$2.99/min flat**, round-dollar packs **$10 / $20 / $30 / $50** (§5.A table). $30 = MOST POPULAR.
3. ✅ **All personas** at the one flat price. Per-persona *different* $/min deferred to Path B.

**Note for the future (Path B trigger):** when a differently-priced roster or auto-recharge is wanted,
that's the dollar-wallet upgrade. It needs: balance migration, time-based caps, and a fix to
`creditTracking.ts:311` (post-commit `maxBillableCoins` hardcodes rate 60 — it will corrupt billing for
any persona whose `coins_per_minute` ≠ 60, so that line MUST take the persona rate before any per-persona
rate is set).
