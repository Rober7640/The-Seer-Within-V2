# U1/U2 System A/B Test — Spec

**Status:** SPEC for approval. No code changed yet. This is the build sheet for testing two
*complete upsell arcs* against each other on the V1 (Evelyn) funnel.

## 1. Objective & hypothesis
~100% of paid traffic is LOVE-intent (hope-frame). The current arc pivots to a PROTECTION
(fear-frame) U1. Funnel is underwater (true ROAS 0.69, AOV $58.86 down ~11%, U2 fatigued −24.8%).

**Hypothesis:** a love-congruent arc (clear → **open the heart** → **broadcast/amplify**) lifts
**combined upsell revenue per FE buyer** vs the current arc (clear → protect → attract), without
new SKUs or checkout changes.

**Unit of test = the whole arc, not one step.** We never run rose-U1 next to love-U2 (that would
just measure cannibalization). Each buyer sees one internally-coherent system end to end.

## 2. Arms

| Arm | U1 | U1 price | U2 | U2 price | FE price |
|-----|----|----|----|----|----|
| **A — control** | Protection Ritual + Black Lava | $47 | Manifestation Bracelet (current) | $47 / $30 ds | **$35 (fixed)** |
| **B — heart arc** | Heart-Opening Ritual + Rose Quartz | $47 | Manifestation Bracelet, **repositioned as outward "broadcast/amplify"** | $47 / $30 ds | **$35 (fixed)** |

- **FE price is held at $35 on both arms** so the system test does not confound with the FE
  price split test. (See §12 — the two tests share infrastructure and cannot both run live.)
- Phase 1 holds U1 at $47 on both arms (pure arc read). Price ($47→$57) is **Phase 2**, run only
  inside the winning arm (§10).
- 50/50 weight. Deterministic per email (idempotent) — a returning buyer always sees the same arm,
  so upsell pages, fallback checkout, and shipping stay consistent.

## 3. What ships in each arm

### U1 (Arm B only — Arm A is today's live code, untouched)
Per `docs/u1-heart-opening-rose-quartz-sidebyside.md`. Rose copy lives in a **new parallel module**
`client/src/lib/upsellMessagesRose.ts` exporting the **same constant names**; `useUpsellChat`
selects by `upsell1Theme`. Lava (`upsellMessages.ts`) is the control, byte-for-byte unchanged.
- Copy: all 20 stages re-themed (fear→hope+loss-aversion).
- Image: `lava-stone.jpg` → new `rose-quartz.jpg`.
- Accept self-msg, `detectQ3Intent` regex, `<img alt>` — per side-by-side doc's touchpoint table.

### U2 (Arm B only — the "broadcast" reposition; ~6–10 lines)
New parallel module `client/src/lib/upsell2MessagesBroadcast.ts` (same constant names),
selected by `upsell2Theme`. **Same physical SKU** (8-stone bracelet, right wrist, $47/$30). Changes:
1. **Path A opening + `UPSELL2_RITUAL_PATH_A_EXTRA`** — rewrite the lava "complete circuit" line.
   New handoff: *"Your heart is open now, {firstName}. This is how we send that out into the world."*
   (receiving → broadcasting, not filter-IN → broadcast-OUT).
2. **Hero stone** — lead the stone walkthrough with **Citrine / Clear Quartz (amplify & broadcast)**
   instead of Green Aventurine ("new love / new connections"), so U2 stops rhyming with rose-U1's
   "open to love." Aventurine stays in the set, just not the headline.
3. **Positioning line** — frame U2 as the *amplifier of an already-open heart*, not a second
   love-attraction object: "clearing opened the space, the ritual opened your heart — this makes
   sure the whole world can feel it."
4. Path B opening (declined U1) gets a parallel tweak so it doesn't reference protection/lava.

> Arm A's U2 (`upsell2Messages.ts`) is unchanged. If Arm A buyer bought lava (Path A), they still
> get the "complete circuit" line — correct, because in Arm A they *do* have the lava stone.

## 4. Variant pool (system_config `v1_price_variants`)

Phase 1 (replaces the active pool for the test window):
```json
{
  "variants": [
    { "id": "A_lava_47", "funnel": null, "weight": 1,
      "priceCents": 3500, "downsellCents": 2500,
      "upsell1Cents": 4700, "upsell1Theme": "lava",  "upsell2Theme": "manifest"  },
    { "id": "B_rose_47", "funnel": null, "weight": 1,
      "priceCents": 3500, "downsellCents": 2500,
      "upsell1Cents": 4700, "upsell1Theme": "rose",  "upsell2Theme": "broadcast" }
  ]
}
```
Phase 2 (price test inside winner — example if B wins): set `A_lava_47` weight 0, add
`B_rose_57` (`upsell1Cents: 5700`, themes rose/broadcast), split B_rose_47 / B_rose_57 50/50.

Kill switch: set Arm B weight 0 → 100% revert to lava+manifest. Config absent entirely → module
falls back to lava+manifest (ships dark).

## 5. Schema additions (additive, nullable — mirrors how `priceVariant` was added)
`conversations`:
- `upsell1_theme text` — `'lava' | 'rose'`, stamped at assignment (immutable per buyer).
- `upsell2_theme text` — `'manifest' | 'broadcast'`.

Stamping theme on the row (not deriving from variant id at read time) keeps a buyer's experience
stable even if the config pool is edited mid-test.

## 6. Where the arm is read (code routing)

| Touchpoint | File | Change |
|---|---|---|
| Assign arm at lead capture | `server/lib/priceVariant.ts` `assignVariantIfMissing` | also stamp `upsell1_theme`, `upsell2_theme` from picked variant |
| Read arm | `server/lib/priceVariant.ts` `getVariantForEmail` / `AssignedVariant` | return `upsell1Theme`, `upsell2Theme` |
| U1 page data | `server/routes.ts` `/api/upsell/user-data` (~875) | add `upsell1Theme` to response |
| U1 render | `pages/UpsellPage.tsx` + `hooks/useUpsellChat.ts` | select message module + image by `upsell1Theme`; set tracking `product` |
| U1 1-click charge | `server/routes.ts` `/api/upsell/charge` (~1232) | `metadata.product` = `heart_opening_ritual` when rose; add `upsell1Variant`; description "Rose Quartz Heart-Opening Ritual" |
| U1 fallback checkout | `server/routes.ts` `/api/upsell/fallback-checkout` (~1447) | same metadata + product_data name by theme |
| U1 fallback confirm gate | `server/routes.ts` `/api/upsell/confirm-fallback` (~1100) | **widen** `metadata.product` check to accept `heart_opening_ritual` OR `protection_ritual` |
| U2 page data | `server/routes.ts` `/api/upsell2/user-data` (1698) | add `upsell2Theme` to response |
| U2 render | `pages/Upsell2Page.tsx` + `hooks/useUpsell2Chat.ts` | select message module by `upsell2Theme` |
| U2 charge/fallback | `server/routes.ts` (~1891, ~2138) | add `metadata.upsell2Variant` (`manifest`/`broadcast`); product stays `manifestation_bracelet` |
| FB events | `server/lib/facebook.ts` | map `heart_opening_ritual` exactly like `protection_ritual` (name, `Upsell` event, `upsell_u1_*` id, `/welcome2` source url) |

## 7. Stripe metadata (for the sister-repo upsell tally)

| Event | `metadata.product` | extra keys | amount |
|---|---|---|---|
| U1 Arm A | `protection_ritual` *(unchanged)* | `upsell1Variant: lava_47` | 4700 |
| U1 Arm B | **`heart_opening_ritual`** | `upsell1Variant: rose_47` (or `rose_57`) | 4700 / 5700 |
| U2 Arm A | `manifestation_bracelet` *(unchanged)* | `upsell2Variant: manifest` | 4700 / 3000 |
| U2 Arm B | `manifestation_bracelet` *(unchanged)* | `upsell2Variant: broadcast` | 4700 / 3000 |

**Sister repo action:** add one mapping `heart_opening_ritual → U1`; optionally group attach/AOV by
`upsell1Variant` / `upsell2Variant`. U1 stays one logical line across both product values.

## 8. Analytics events
PostHog `upsell_accepted` / `upsell_declined` / `purchase_completed` — add properties `arm`
(`A`/`B`), `upsell1Theme`, `upsell2Theme`, `upsell1Variant`. Existing funnel/step/product retained.

## 9. Success metric & decision rule
**Primary: combined upsell revenue per FE buyer** = (U1 take × U1 price) + (U2 take × U2 effective
price). Because FE price is fixed at $35 on both arms, **this equals comparing AOV by arm** — the
sister session can read it straight off Stripe AOV-per-arm.

Control baseline (7d): AOV $58.86 − $35 FE ≈ **$23.86 combined upsell / FE buyer**
(U1 ≈ 0.33×$47 = $15.51 + U2 ≈ 0.21×~$40 ≈ $8.4).

**Decision:** Arm B wins if AOV_B > AOV_A by a real margin over the window (§10).

**Guardrails / secondary (watch, don't optimize):**
- **U1 attach** by arm (the congruence read).
- **U2 attach split by Path A / Path B** — the cannibalization watch. If Arm B's *Path-A* U2 attach
  craters vs Arm A's Path-A, the heart-arc is eating U2 and the reposition needs to go further.
- U1→U2 sequence completion, shipping-form completion, refund/chargeback rate by arm.

## 10. Sample size & duration
~709 FE buyers/wk → ~355/arm/wk at 50/50.
- Detecting a U1 attach lift of 33%→38% (Δ5pp, α .05, power .8): ≈1,350/arm → **~4 weeks**.
- A larger Δ (33%→40%) reads in ~700/arm → **~2 weeks**.
- **Plan:** first read at 2 weeks; call at ~3–4 weeks or ~1,300 buyers/arm, whichever first. Reuse
  the existing price-test significance machinery (`server/routes/admin/priceTest.ts`).
- **Phase 2** (price, inside winner): another ~2–4 weeks for $47 vs $57 on revenue/FE buyer
  (breakeven take at $57 = 27%, vs today's 33% → 6pt cushion).

## 11. Rollout & QA
- Ships dark: no config row / Arm B weight 0 → everyone gets today's lava+manifest.
- QA via demo mode per arm before turning weights on: `/welcome1?demo=true` and `/welcome2?demo=true`
  with a forced theme override (add `&theme=rose|lava` honoring it only in demo).
- Compliance pass on Arm B copy (no outcome claims; `someone` bucket especially) before live.
- Kill switch: Arm B weight → 0.

## 12. Coordination / blocking decisions
1. **FE price split test must be paused for this test.** Both use the same `v1_price_variants` pool
   and the single per-buyer `priceVariant` slot — they can't run cleanly at once. This spec holds FE
   at $35 across both arms. Confirm the FE price test is parked (sister session has Stripe view).
2. **Funnel scope:** spec uses `funnel: null` (serves `/`, `/gdn`, etc.). FB funnels (`/fb`, `/fb2`)
   currently have their own scoped FE-price variants — decide whether the system test runs on FB
   traffic too (recommended, since that's the love traffic) by adding `*_fb` arm variants, or starts
   on non-FB only.
3. **U2 scope for Arm B:** this spec assumes the "broadcast reposition" (~6–10 lines, same SKU). If
   you'd rather ship Arm B with **U1-rose only + U2 untouched**, say so — but that reintroduces the
   two-love-bracelets overlap and muddies the combined read.
4. **Ritual name** → `Heart-Opening Ritual` → `metadata.product: heart_opening_ritual` (locks once
   data flows; rename later fragments the tally).

## 13. Out of scope (unchanged)
FE chat + checkout, shipping flow, U2 price ($47/$30), physical SKUs, the 20-stage U1 / U2
structures, soulmate funnel.
