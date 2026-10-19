# Evelyn VSL → Standalone Front-End Funnel — Implementation Plan

**Goal:** Turn the $19 Soulmate Initials funnel into a clean, standalone front-end funnel — scrub "BE" naming from its own identity, route its upsells through V1's existing pages, and give it its own AWeber list — without breaking the n8n delivery or disturbing any other funnel.

**Architecture:** Keep the funnel on the shared order/delivery plumbing (so the tested delivery keeps working), but rename everything that is *this funnel's own* off `be_*` / `be-10-*`, re-point its upsells to V1's `/welcome1|2`, and front the delivery endpoints with Evelyn-named aliases. All changes land on `feat/evelyn-standalone-frontend` as one cherry-pickable PR; nothing is merged or pushed automatically.

**Branch:** `feat/evelyn-standalone-frontend` (off `origin/development`)

## What STAYS (shared plumbing — renaming it = a full rebuild, ruled out)
- The order tables `be_orders` / `be_order_intake` (every reading product is filed here).
- The generic fulfilment router `/api/be/:offer/*` (shared). → We add Evelyn-named **aliases** in front of it so n8n + future readers see a clean path; the shared route stays.
- The offer's entry in `BACKEND_OFFER_CATALOG` and `backendCustomerList` (shared config files). Its *values* get scrubbed; the file it lives in is shared.

## What CHANGES (this funnel's own identity)
1. Its own AWeber list for the $19 buyers.
2. Upsells route to V1's live `/welcome1|2` (reuse, not rebuild).
3. `be_soulmate_initials` / `be_soulmate_initials_charge` → clean product keys.
4. `be-10-soulmate-initials` / `be-10-bump` / `be-10-delivered` → Evelyn-branded tags.
5. Evelyn-named alias endpoints for reading-html / delivered.
6. The n8n flow updated in lockstep (product filter, tags, endpoint URLs).
7. "BE"/"backend offer" scrubbed from this funnel's code comments.

## Global Constraints
- **Never break the n8n delivery** — every rename to a product key, tag, or endpoint is mirrored in the n8n workflow in the same change.
- **Touch no other offer** — 02/03/04/06/08/09 keep their current `be_*` keys and `be-10`≠theirs. Shared files are edited only in this offer's own rows.
- **Nothing merges** — all work stays on `feat/evelyn-standalone-frontend`; the user cherry-picks when ready.
- **readyForMoney stays false** on this branch.

## Open decisions (need from you before I execute)
- **D1 — New AWeber list:** the list id for the $19 buyers (you're creating it). Until then I leave `initialListId` as-is and flip it last.
- **D2 — New product keys:** propose `soulmate_initials` + `soulmate_initials_charge` (drop `be_`). OK?
- **D3 — New tags:** propose `evelyn-soulmate` / `evelyn-soulmate-bump` / `evelyn-soulmate-delivered` (drop `be-10`). OK? (You'll re-point the AWeber campaign triggers to the new tags.)
- **D4 — Upsell lists:** Evelyn upsell buyers go onto **V1's** upsell lists (6937139 / 6939683) and fire V1's upsell pixel — confirmed acceptable (upsell revenue reads as V1, main $19 stays Evelyn's).

---

## Task 1 — Own AWeber list for the $19 buyers
**Files:** `server/lib/backendCustomerList.ts` (soulmate-initials row).
- Change `initialListId: '6972552'` → the new list id (D1).
- Verify: a dev test purchase writes the buyer to the new list with the new tag (Task 3).
- **Risk:** low. Only this offer's row changes.

## Task 2 — Route upsells to V1's live pages
**Files:** `shared/backendOffers.ts` (soulmate-initials `upsellEntryPath`), the `/evelyn/checkout` success flow.
- Change `upsellEntryPath: '/offers/upsell/welcome1'` → `'/welcome1'` (V1's page), and confirm the checkout `success_url` carries the Stripe `session_id` V1's UpsellPage reads.
- Confirm V1's `UpsellPage` serves an Evelyn buyer: it already branches to `/api/backend/upsell/*` via `backendOverride`, so the saved-card 1-click works; verify the override is set for an Evelyn session.
- Verify: on dev, after the $19 purchase the buyer lands on `/welcome1`, the Protection Ritual 1-click charges the saved card, and `/welcome2` follows.
- **Risk:** medium — V1's pages are live; must confirm the Evelyn session is recognised and that nothing writes to V1's conversation rows. If the override path isn't clean, fall back to keeping the current separate upsell pages (renamed off `/offers`).

## Task 3 — Scrub product keys + tags (lockstep with n8n)
**Files:** `shared/backendOffers.ts`, `server/lib/backendCustomerList.ts`, `server/lib/facebook.ts` (+ its `resolveStripeEventName` test), `server/lib/backendPurchaseAnalytics.ts` (BACKEND_STEP product map), the checkout metadata writer, and the **n8n workflow** `77dFrpSGVLlfzwrK`.
- Rename `be_soulmate_initials`/`_charge` → D2 names everywhere they appear (catalog `stripeProduct`, bump `productKey`, the FB-pixel Purchase gate + its test, the product→offer and product→step maps, checkout `metadata.product`).
- Rename `be-10-*` tags → D3 names (catalog `tag`/`bumpTag`/`deliveredTag`).
- Update the n8n flow's IF filter (`metadata.product == <new>`), the `delivered_tag`, and the reading-field in the same step.
- Verify: typecheck + the offer's vitest suites green on this branch; a dev test purchase still records, delivers, and tags correctly end-to-end.
- **Risk:** medium-high — widest ripple (pixel gate, n8n matching, AWeber campaign triggers). Done as one lockstep change + full re-test.

## Task 4 — Evelyn-named alias endpoints
**Files:** `server/routes/beFulfilment.ts` (or a thin new router mounted at `/api/evelyn/*`).
- Add `/api/evelyn/soulmate/reading-html/:sessionId`, `/delivered` that call the same handlers (so the shared `/api/be/*` route is untouched and other offers are unaffected).
- Point the n8n flow at the new alias URLs.
- Verify: n8n execution hits the alias and succeeds.
- **Risk:** low-medium — additive; keeps the shared route intact.

## Task 5 — Scrub BE comments
**Files:** the evelyn-specific files touched above + `client/src/pages/evelyn/*`, `shared/evelynVsl.ts`.
- Reword comments that call it a "backend offer / BE funnel" to describe it as the standalone Evelyn front-end funnel. No behaviour change.
- **Risk:** none.

## Task 6 — Full dev verification
- One real test purchase on dev (card 4242) through the whole chain: checkout → V1 upsells → reading-html (alias) → PDFShift → Supabase → AWeber (new list + new tags) → PostHog `evelynvsl`.
- Confirm no other funnel's data moved.
- **Risk:** this is the gate before the PR is considered ready.

## Review Focus (most likely to bite)
- **n8n drift:** a renamed product/tag not mirrored in the workflow → silent "not this offer / not found." (Task 3/4 mirror every rename in the same step; Task 6 proves it.)
- **AWeber campaign triggers:** old campaigns fire on `be-10-*`; after the rename they must trigger on the new tags (operator re-points them).
- **V1 page bleed:** an Evelyn buyer writing to V1's conversation rows or firing V1's main-funnel pixel (Task 2 verifies the `backendOverride` path stays clean).
- **Shared-file edits:** editing another offer's row by mistake in `backendOffers.ts` / `backendCustomerList.ts` (edits scoped to the soulmate-initials row only).
- **Pixel gate test:** `resolveStripeEventName.test.ts` is locked to the old product name — it must be updated with the rename or the build fails.
