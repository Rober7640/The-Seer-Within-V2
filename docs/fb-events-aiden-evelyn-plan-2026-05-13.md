# FB Events Re-Enable Plan — `/aiden` and `/evelyn` Funnels

**Date:** 2026-05-13
**Author:** Joel (with Claude)
**For review by:** Robert / Lewis
**Status:** Implemented — all 5 phases committed. SQL migration must be run on Supabase before deploy; dev test pending.
**Baseline branch:** `feature/v1-fb-funnel` @ `321a444` (latest pull from `rober/Production`)

## Verification findings (post-codebase inspection)

Three of the five open questions are answered after reading the code:

1. **`signup_funnel` column did NOT exist.** Closest existing field was `migratedFromConversationId` (different purpose — V1→V2 migration). A new nullable text column `signup_funnel` has been added to the `users` schema (`shared/schema.ts`). **A `npm run db:push` is required before Phase 1 attribution wiring can run.**
2. **`client/index.html` does NOT contain a Pixel PageView auto-fire.** The base script has only `fbq('init', '446814716830295')` — no `fbq('track', 'PageView')`. Phase 2 was simplified accordingly: only the `App.tsx` allowlist was extended, no `index.html` edit needed.
3. **GTM (`GTM-WVPGCFHW`) IS loaded in `index.html`** (line 5) and is the **likely real source of the untraceable "random PageViews" with root-domain-only URLs**. GTM's auto-PageView tag, if configured, fires without an eventID and cannot be deduplicated with our CAPI events. **Fix lives in GTM console, not code** — recommend reviewing GTM tags for any active PageView triggers.

---

## Background

Commit `d20cb68` ("Remove all FB Pixel + CAPI events from V2 persona system", Lewis, 2026-05-12) intentionally stripped every Meta event from the V2 persona system surfaces:

- `/aiden`, `/evelyn`, `/login`, `/reading`, `/credits`, `/personas`
- All V2 payment flows (Stripe inline, Stripe Checkout, PayPal sync + webhooks)

The removal was correct — the prior implementation had two issues:

1. **`maybeFireFirstPurchaseEvent` gated Purchase/IC events to a user's first purchase only** (`server/lib/facebook.ts:149` — `if (completedCount !== 1) return;`). Meta's attribution model expects every Purchase event; gating distorts ROAS reporting.
2. **PageView was firing multiple times per page load**, with the URL showing as root domain instead of the full path, making testing impossible.

V1 funnel (`/`, `/chat`, `/welcome1`, `/welcome2`, `/success`, `/eve_1/*`) tracking was deliberately preserved and continues to work correctly.

## Goal

Re-enable the four standard Meta events for `/aiden` and `/evelyn` funnels:

- `PageView`
- `Lead`
- `InitiateCheckout`
- `Purchase`

**Constraints:**

- Zero changes to V1 funnel code paths
- IC and Purchase fire **unconditionally** (no first-purchase gate)
- Fix the PageView duplication at its root cause, not by masking
- Keep V2 routes other than `/aiden` and `/evelyn` quiet (do not re-enable PageView for `/reading`, `/credits`, `/personas`)
- No new custom event names — use only standard Meta events so the ad optimizer recognizes them

## Root-cause analysis of past issues

### Why "too many PageViews" were seen

Three sources fired simultaneously before the removal:

| # | Source | EventID? | De-dupes with CAPI? |
|---|---|---|---|
| 1 | `App.tsx` global useEffect on route change | Yes | Yes |
| 2 | `EvelynLanderPage` / `AidenQuizPage` per-page useEffect | Yes | Yes |
| 3 | Pixel base script auto-fire in `client/index.html` (`fbq('track', 'PageView')`) | **No** | **No** — cannot be deduplicated |

Commit `d20cb68` already removed source #2. Source #1 is now gated to V1 routes only. **Source #3 is the remaining suspect for the "root domain only" reports** — it fires before React mounts, so the URL is whatever the browser is on at that instant (often the root path before the SPA routes).

### Why `maybeFireFirstPurchaseEvent` was wrong

The helper explicitly returns early when a user has more than one completed purchase. Result: Meta only ever saw the first-ever purchase per user, missing every repeat purchase. Repeat purchases are critical signal for Meta's lookalike audience and ROAS attribution.

## Plan

### Phase 1 — Funnel attribution (single source of truth)

**Problem:** A `/evelyn` visitor signs up on `/login`, reads on `/reading`, pays on `/credits`. The server-side Purchase event has no way to know they started at `/evelyn`.

**Approach:** Persist the funnel attribution on the user record.

- **First step:** Verify whether a `signup_funnel` or `acquisition_source` column already exists on the `users` table.
  - If yes → reuse it. Zero schema change.
  - If no → add a nullable text column (small, safe migration).
- **`/aiden` visitor:** on quiz submit, attach `signup_funnel: 'aiden'`.
- **`/evelyn` visitor:** when `/evelyn` lander loads, set a `sessionStorage` flag. On signup submit (`/login`), read the flag and persist `signup_funnel: 'evelyn'`.

All downstream events (IC, Purchase) read this field to decide whether to fire and what `event_source_url` to set.

### Phase 2 — Add PageView for `/aiden` and `/evelyn` (✅ landed)

**Simplified after verification:** `client/index.html` has no Pixel PageView auto-fire, so no edit there. Only `App.tsx` change needed:

- Extended the route-allowlist in `App.tsx` route-change `useEffect` to include `/aiden` and `/evelyn`. Renamed the local variable from `isV1Funnel` to `isTrackedFunnel` to reflect that the allowlist now spans V1 + two V2 lander surfaces.
- Other V2 routes (`/login`, `/reading`, `/credits`, `/personas`) continue to fire no PageView.

**Result:** one deduped PageView per `/aiden` and `/evelyn` page load (Pixel + CAPI sharing eventID).

**GTM:** any "random PageViews" remaining after this change are likely from a GTM tag — needs review in the GTM console at `GTM-WVPGCFHW`. Out of scope for this codebase change.

### Phase 3 — Re-add Lead

**`/aiden`:** re-add `trackLead()` call in `AidenQuizPage.tsx` on quiz completion.

**`/evelyn`:** re-add `trackLead()` call in `LoginPage.tsx` on signup submit, **but gated** to only fire when `signup_funnel === 'evelyn'` (read from the sessionStorage flag). This prevents Lead from firing for non-`/evelyn` signups.

**No "first-time-only" gate** — Lead fires per attempt.

### Phase 4 — Re-add InitiateCheckout (unconditional)

Re-add `trackInitiateCheckout()` at the four sites stripped by `d20cb68`, each gated on `signup_funnel` being `'aiden'` or `'evelyn'`:

| File | Trigger |
|---|---|
| `client/src/components/StripeCardForm.tsx` | On card submit |
| `client/src/components/PayPalCreditButton.tsx` | In `createOrder` |
| `client/src/components/PaymentModal.tsx` | In `/credits` PayPal `createOrder` |
| `client/src/pages/AidenQuizPage.tsx` | Rescue-hatch checkout |

**Fires every time** the user attempts checkout — 1st, 2nd, 10th. No restrictions.

### Phase 5 — Re-add Purchase (unconditional)

Create a new helper `fireV2PurchaseEvent(purchaseId)` in `server/lib/facebook.ts`:

- Same body as `maybeFireFirstPurchaseEvent`, but **without** the `completedCount !== 1` check
- Reads `signup_funnel` from the user record
- Sets `event_source_url` to the funnel's entry URL (e.g. `${BASE_URL}/evelyn` or `${BASE_URL}/aiden`) so Meta reports segment cleanly even though the event originates server-side
- Sets `content_name` based on product purchased + funnel

Call it from the five sites stripped by `d20cb68`:

| File | Function |
|---|---|
| `server/routes/credits.ts` | `confirm-payment` |
| `server/routes/credits.ts` | `capture-order` |
| `server/routes/credits.ts` | `confirm-checkout` |
| `server/routes/credits.ts` | Stripe webhook |
| `server/routes/webhooks.ts` | PayPal webhook |

**Keep `maybeFireFirstPurchaseEvent` dormant in the codebase** — zero callers, but available if a "lifetime-first" custom event is ever wanted.

### Phase 6 — Meta Events Manager setup (no code, configuration only)

Once events are live:

1. Create **Custom Conversions** per funnel:
   - "Aiden Purchase" → `event_name = Purchase AND event_source_url contains "/aiden"`
   - "Evelyn Purchase" → `event_name = Purchase AND event_source_url contains "/evelyn"`
   - Repeat for `Lead` and `InitiateCheckout` per funnel
2. Use Meta's **Test Events tab** with `FB_TEST_EVENT_CODE` env var to validate before going live — that view shows the full URL and confirms dedup is working.
3. Verify in Events Manager that each event shows up exactly once per action (not duplicated).

## What this plan does NOT do (intentionally)

- No changes to V1 funnel code (`useConversation.ts`, `UpsellPage.tsx`, `SuccessPage.tsx`, `Upsell2Page.tsx`, `/eve_1/*`)
- No re-enabling of PageView for `/reading`, `/credits`, `/personas` (those V2 surfaces stay quiet)
- No revert of `d20cb68` — selective re-hook only at the sites we want
- No new event names — standard Pixel events only
- No removal of `maybeFireFirstPurchaseEvent` helper — kept dormant
- No changes to `/api/fb-event` endpoint or `server/lib/facebook.ts` `sendFacebookEvent()`

## Risk assessment

| Area | Risk | Mitigation |
|---|---|---|
| Breaking V1 events | None | No V1 file touched |
| Double-firing PageView | Low | Phase 2 removes the un-deduped base-script auto-fire |
| Firing events for non-`/aiden`/`/evelyn` users | Low | Phase 1 attribution gates everything |
| Schema migration | Low | Reuse existing column if present; otherwise nullable text column |
| `maybeFireFirstPurchaseEvent` regression | None | Helper left intact, just unused |
| FB API/quota impact | Low | Standard events at normal volumes — no batching changes |

## Open questions for Robert / Lewis

1. ~~Funnel attribution column — does `signup_funnel` (or equivalent) already exist on the `users` table?~~ **Resolved:** did not exist. New nullable text column `signupFunnel` (snake_case `signup_funnel`) added to `users` in `shared/schema.ts`. **Requires `npm run db:push`.**
2. **`/aiden` Lead frequency** — once per session, or once per quiz submission? Recommendation: per submission (so abandons-and-returns count).
3. ~~`client/index.html` Pixel auto-fire — OK to remove the `fbq('track', 'PageView')` line?~~ **Resolved:** no such line exists. Only `fbq('init')` is present. No edit needed.
4. **GTM auto-PageView** — `GTM-WVPGCFHW` is loaded and is the most likely source of past untraceable PageViews. Please verify in the GTM console whether any active tag fires PageView. If yes, disable it so Meta only sees the deduplicated Pixel+CAPI pair from `trackPageView()`.
5. **Per-purchase `event_source_url` value** — OK to set server-side Purchase events to `${BASE_URL}/{funnel}` (so `/aiden` purchases show source URL `https://…/aiden`)? This makes Custom Conversion rules clean. Alternative: include the page where checkout actually happened (`/credits`), but that loses funnel context server-side.

## Estimated scope

| Phase | Files touched | LOC est. |
|---|---|---|
| 1 — Attribution | `shared/schema.ts` (maybe), `EvelynLanderPage.tsx`, `AidenQuizPage.tsx`, `LoginPage.tsx` | ~30 |
| 2 — PageView fix | `client/index.html`, `App.tsx` | ~5 |
| 3 — Lead | `AidenQuizPage.tsx`, `LoginPage.tsx` | ~10 |
| 4 — IC | `StripeCardForm.tsx`, `PayPalCreditButton.tsx`, `PaymentModal.tsx`, `AidenQuizPage.tsx` | ~20 |
| 5 — Purchase | `server/lib/facebook.ts`, `server/routes/credits.ts`, `server/routes/webhooks.ts` | ~40 |
| 6 — Meta config | No code | — |

**Total estimate:** ~100 LOC across ~10 files. All additive or modifying only stripped lines.

## Next step

Once Robert/Lewis approve direction and answer the 5 open questions above, proceed phase-by-phase with each phase a separate commit so reverts are clean if Meta reporting shows anything unexpected.
