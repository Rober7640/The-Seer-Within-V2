# V1 Funnel Audit — Stock-take & Drift Report

**Date:** 2026-07-05
**Scope:** All V1 conversion funnels — `root` (`/`), `fb`, `fb2`, `fb-palm` (+ `/b`, `/c`), `gdn` — plus the shared chat engine and the two upsells.
**Question asked:** *Have we drifted from the original V1 conversation flow?*

**Reading order:** this file is the synthesis. Evidence lives in four section reports:
- [`00-baseline-v1-flow.md`](./00-baseline-v1-flow.md) — the intended flow, reconstructed from docs only (spec-of-record)
- [`01-current-v1-engine.md`](./01-current-v1-engine.md) — how the engine actually behaves today (file:line)
- [`02-funnel-attribution-map.md`](./02-funnel-attribution-map.md) — the 5 funnels side-by-side + divergences
- [`03-fb-palm-deepdive.md`](./03-fb-palm-deepdive.md) — the palm quiz bridge vs its own design docs

---

## 1. Headline verdict

**The core V1 conversion flow has NOT drifted. The money-path invariants all hold.** What has changed is *additive*: the original single linear funnel now has five attribution wrappers and several A/B/variant layers stacked on top of it, all of which default back to the original behavior. Drift is real but concentrated in **(a) tracking/pixel plumbing, (b) dead/legacy code that contradicts the live path, and (c) documentation that no longer matches the code** — not in what a converting user actually experiences.

| Area | Verdict |
|---|---|
| Conversation state machine (greet→bucket→deepen→crisis→pitch) | ✅ Intact — matches baseline, just renamed phases |
| Pricing invariants ($35/$25, $47, $47/$30) | ✅ Intact — defaults preserved; the old $17 bug is gone |
| Upsell 1 / Upsell 2 mechanics | ✅ Intact |
| Funnel parallelism (root/fb/fb2/gdn are clean clones) | ⚠️ Mostly — one real pixel bug (fb2), some dead helpers |
| fb-palm bridge | ⚠️ Works, but 90% of its documented ambition is unbuilt + context is dropped after the opener |
| Docs / dead code hygiene | ❌ Drifted — stale model, orphan prompt copy, legacy branches, stale counts |

---

## 2. Baseline invariant check (the 5 things most worth verifying)

From `00-baseline-v1-flow.md §invariants`, checked directly against code:

| # | Invariant | Verdict | Evidence |
|---|---|---|---|
| 1 | **Downsell = $25, not the old $17 bug** | ✅ **PASS** | `priceVariant.ts:46` `downsellCents: 2500`; `routes.ts:611` fallback `?? 2500`. No surviving `1700`/`$17` in checkout or CTA. |
| 2 | **Objection thresholds differ: main funnel = 3, Upsell 2 = 2** | ✅ **PASS** | Main: `useConversation.ts:1110` "After 3 objections, offer downsell". U2: `useUpsell2Chat.ts:348,487` downsell on the 2nd objection. Correctly *not* unified. |
| 3 | **Pitch is 30-day guarantee (not 60)** | ✅ **PASS** | Live pitch `useConversation.ts:1350` + `prompts.ts:331,357` all say 30-day. The only 60-day strings are in the **Soulmate** funnel (`SoulmateSalesPage.tsx` etc.) — a different system, not V1. The baseline's flagged "60-day conflict" is a cross-funnel false alarm. |
| 4 | **Price-variant assignment is sticky & idempotent per email, and flows identically to Stripe + CTA + pitch + FB value** | 🟡 **NEEDS LIVE TEST** | Mechanism exists and ships dark (`priceVariant.ts`, `system_config.v1_price_variants`), defaulting to $35/$25. Static read looks correct but stickiness/idempotency across a real session can only be confirmed by running it. |
| 5 | **Upsell prices server-enforced ($47 / $47 / $30), Path A reuses U1 shipping, canonical routes `/welcome1` `/welcome2`** | ✅ **PASS** | U2 `4700` full / `3000` downsell hardcoded (`Upsell2Page.tsx:138`, `Upsell2DownsellCTA.tsx:32` "for $30"). Routes confirmed in `App.tsx:152-153`. |

**4 of 5 invariants PASS on static inspection; 1 requires a live run to fully close.**

---

## 3. Drift findings, consolidated by severity

### 🔴 P1 — real bugs / risk (fix)

- **F1 — fb2 fires the *Soulmate* pixel.** `fb2` is documented as "clone of fb on its own pixel," but `fbPixelConfig.ts:35-40` points it at the soulmate pixel (`738…027`) instead of a dedicated fb2 pixel. Browser-side, fb2 conversion data pollutes soulmate's pixel. *(This is the single most consequential divergence — it corrupts attribution for two funnels at once.)* — `02-funnel-attribution-map.md` D1.
- **F2 — "own pixel per funnel" is a myth.** root/fb/fb-palm/gdn all share the **default** pixel (`446…295`); only fb2 differs (and wrongly, per F1). If per-funnel pixel separation was ever the intent, it was never implemented. Confirm whether shared-pixel-with-funnel-param is the deliberate model. — `02` D1.

### 🟠 P2 — dead / legacy code that contradicts the live path (clean up)

- **F3 — legacy `crisis` server branch still wired.** `generateCrisis`/`buildCrisisPrompt` use the banned "But… hold on" pattern-interrupt that the *current* crisis prompt explicitly forbids. Unreachable from the live client, but a live contradiction waiting to be re-invoked. — `01-current-v1-engine.md` drift #4.
- **F4 — orphan `client/src/lib/prompts.ts`.** A full second copy of the prompts, imported by nothing. Free to silently drift from the server source of truth. — `01` drift #3.
- **F5 — dead pitch builders.** `getPitchMessages` / `getOfferExplanation` in `prompts.ts` are unused; the real pitch is hardcoded inline in `handlePermission` (`useConversation.ts:~1343`). Two pitch definitions, one live. — `01` drift #2.
- **F6 — `palmOpener` LLM path is dead code.** Fully wired server-side (`routes.ts:451`, `claude.ts:153`, `prompts.ts:844`) but the client never calls it; palm Versions A/B use static client reads, only Version C hits the server. — `03-fb-palm-deepdive.md` #1.
- **F7 — dead client `isFbFunnel()`** (`funnel.ts:21`) whose comment contradicts live behavior and which name-collides with a *different-semantics* server `isFbFunnel()` (`routes.ts:189`). — `02` D2/D3.
- **F8 — leftover backups:** `useUpsell2Chat.ts.backup`, `SuccessPage.tsx.backup`, `routes.ts.backup` in the tree.

### 🟡 P3 — documentation drift (reconcile)

- **F9 — stale model in docs.** Live model is `claude-sonnet-4-5-20250929`; `CLAUDE.md` still says `claude-sonnet-4-20250514`. — `01` drift #1.
- **F10 — fb-palm count drift across docs.** `hook-pipeline.md` says "9 signs", PRD says "11 signs" then lists 10, code has **10**. PRD still cites `new-ads/STATUS.md` as source-of-truth while the ledger claims to supersede it → dual SoT. — `03` #3.
- **F11 — U1 product name diverges beyond the Stripe suffix** (`routes.ts:1392`) and palm's tag token is `palm` everywhere except `fb-palm` in Resend (`02` D4/D6). Minor, but they're the kind of one-off that compounds.

### 🔵 P4 — product gaps (decide, not necessarily bugs)

- **F12 — fb-palm is ~10% built vs its documentation.** Live matrix = **10 signs × 3 hooks × 3 versions**. Documented ambition ≈ 5× larger: the `cards`/decode-him 11th sign is fully spec'd but has **zero code + no art**; 12 of 15 love-question hooks are unbuilt (consistent with their `todo`/`review` ledger status + the "no code before the review gate" rule). Not drift so much as backlog — but the docs read as if it exists. — `03` matrix.
- **F13 — palm context is front-loaded then dropped.** The sign/hook archetype is used only at the opener/reflect; after name capture the chat is generic love-deepening. Only Version C's typed answer survives into `userData.concern`; Version A's read never enters the conversation. The "personalized palm reading" promise decays to a generic Evelyn reading within ~2 turns. — `03` #2.
- **F14 — GDN (Google traffic) fully fires the FB pixel + CAPI.** Confirm this is intended cross-tracking and not an oversight. — `02` D7.

---

## 4. Did each funnel drift? (the direct answer)

| Funnel | Entry | Drift status |
|---|---|---|
| **root** `/` | LandingPage | ✅ Clean. The reference implementation. |
| **fb** | LandingPage | ✅ Clean clone. Correct suffix `- FB`, shared default pixel (by design). |
| **fb2** | LandingPage | 🔴 **Drifted — wrong pixel (F1).** Otherwise a clean clone. |
| **gdn** | LandingPage | ⚠️ Clean clone, but fires FB pixel+CAPI on Google traffic — confirm intent (F14). |
| **fb-palm** (+`/b`,`/c`) | **PalmBridge** | ⚠️ Structurally forked *by design* (bridge lander, extra routes, `PALM_REFLECT` turn). Works, but under-built vs docs (F12) and drops palm context after the opener (F13). |

**Bottom line:** every funnel still delivers the intact core flow. Only **fb2** has a functional bug (pixel). **fb-palm** is the biggest *structural* divergence but that's intentional; its issue is unfinished ambition + context drop, not a broken money path.

---

## 5. How to actually TEST each funnel for drift (proposed, needs your go-ahead)

Static audit is done. To *prove* behavior, three tiers — cheapest first:

**Tier 1 — Route/mount smoke (cheap, no API cost).** Run the existing `tests/v1-landers-smoke.spec.ts` — it already covers `/`, `/fb`, `/fb2`, `/gdn`, `/fb-palm`. Confirms every funnel still mounts and renders without hitting the ErrorBoundary. *Needs: dev server + DB. No Anthropic calls.*

**Tier 2 — Conversation-flow assertions (moderate, some API cost).** The `tests/evelyn-cross/` suite (EVE-005 buckets, EVE-006 intents, EVE-007 character-rules) + `tests/bucket-transitions.spec.ts` + `tests/intent-detection.spec.ts` exercise the shared chat engine. Running these validates the state machine against the baseline. *Some hit `/api/chat` → real Anthropic tokens.*

**Tier 3 — Close invariant #4 (targeted).** A short scripted run that assigns a price variant to a test email and asserts the *same* number flows to the Stripe session, the CTA, Evelyn's pitch copy, and the FB event value — the one invariant static analysis can't close.

**Recommendation:** run **Tier 1 now** (free, catches gross drift immediately), and only spend Tier 2/3 API budget on your say-so. I can wire a per-funnel test matrix if you want each funnel asserted independently rather than just the shared engine once.

---

## 6. Suggested next actions

1. **Fix F1 (fb2 pixel)** — highest-value, smallest change; it's silently corrupting attribution today.
2. **Decide F14 / confirm the shared-pixel model (F2)** — a 5-minute product call that resolves several "is this drift?" questions at once.
3. **Delete the dead code (F3–F8)** — one cleanup pass removes the contradictions that make future audits noisy.
4. **Reconcile docs (F9–F11)** — update `CLAUDE.md` model + fb-palm counts; pick one fb-palm source-of-truth.
5. **fb-palm product call (F12/F13)** — decide whether to build out the sign×hook matrix and carry palm context deeper into chat, or trim the docs to match what's shipped.

*Nothing here is on fire. The V1 money path is intact; this is a tidy-up-and-decide list, with one genuine pixel bug worth fixing this week.*
