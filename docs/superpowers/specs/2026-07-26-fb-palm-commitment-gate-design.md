# fb-palm Commitment Gate A/B Test

**Date:** 2026-07-26
**Status:** Design approved by operator, pending implementation plan

## Background

Competitor intel (`docs/intel/how-i-built-a-60k-per-month-astrology-offer.md`) describes a "CRO booster" popup used right before a checkout ask: the visitor must check 3 commitment/agreement statements before the purchase button is reachable. The source frames this as the single biggest conversion lift the author found on that offer.

This design adapts that mechanism into a real A/B test on the fb-palm funnel, replacing the currently-live `55-35_palm` sliding-close experiment.

## Goal

Test whether a pre-purchase commitment gate (3 checkboxes, no new data capture) lifts front-end conversion on fb-palm's flat $35 offer, using the same variant-pool infrastructure and analytics that measured the outgoing `55-35_palm` test — so results are directly comparable to it.

## Scope

**In scope:**
- fb-palm funnel only (`currentFunnel() === 'v1-palm'`), across **all** palm signs (thumb, hand-size, finger-shape, decode-him, etc.) — not scoped to a single sign.
- Retiring the `55-35_palm` variant entirely (its `system_config` pool entry is removed, not just zero-weighted) and replacing its slot with a new `35_palm_gate` variant.
- A single new UI element: a 3-checkbox commitment gate rendered in place of the existing $35 `PurchaseCTA`, only for visitors assigned to `35_palm_gate`.

**Out of scope (explicitly not part of this design):**
- The main Evelyn funnel, and the `/fb`, `/fb2`, `/gdn` traffic clones — untouched.
- The $25 downsell CTA (`DownsellCTA`, shown after 3 objections) — **never gated**, on either arm. Only the initial $35 ask is gated.
- Any new data capture (name/email/target-person's-name) — the gate is affirmation-only. All of that data already exists on the conversation row by this point in the chat.
- A modal/popup implementation — the gate renders in place of the CTA, not as an overlay.
- Any change to `handlePurchase`, Stripe checkout, webhooks, or Upsell 1/Upsell 2.

## Experiment Design

Variant pool (`system_config` → `v1_price_variants`, parsed by `server/lib/priceVariantPool.ts`) changes from:

| id | priceCents | downsellCents | weight | funnel | signs |
|---|---|---|---|---|---|
| `35_palm_u47` | 3500 | 2500 | 1 | `v1-palm` | *(none — all signs)* |
| `55-35_palm` | 5500 | 3500 | 1 | `v1-palm` | `["thumb"]` |

to:

| id | priceCents | downsellCents | weight | funnel | signs |
|---|---|---|---|---|---|
| `35_palm_u47` | 3500 | 2500 | **70** | `v1-palm` | *(none — all signs)* |
| `35_palm_gate` | 3500 | 2500 | **30** | `v1-palm` | *(none — all signs)* |

Pricing is identical between the two live variants — the only difference between `35_palm_u47` and `35_palm_gate` is whether the commitment gate renders before the purchase button. This keeps it a clean single-variable test.

Whether `55-35_palm` is removed outright or kept at weight 0 is an implementation-time decision, not settled here — see the in-flight-session risk below.

This is a config-only change to the pool shape (no change to `priceVariantPool.ts`'s parsing/scoping logic — `signs` being absent already means "every sign," which is exactly the desired behavior here).

## UX Design

### Where it renders

`client/src/pages/ChatPage.tsx` (~line 237) currently branches on `isSlidingCloseVariant(chat.userData.priceVariantId)` to choose between `ClearingChoiceCard` and `PurchaseCTA`. This adds a third branch: when `chat.userData.priceVariantId === '35_palm_gate'`, render a new `CommitmentGateCard` instead. `55-35_palm` no longer exists, so the `isSlidingCloseVariant` branch becomes dead code for fb-palm traffic going forward (left as-is — it's shared with other funnels/variants and not part of this change).

The gate occupies the same slot in the "Interactive Elements" region that `PurchaseCTA` normally would — not a modal, not an overlay. The purchase button itself does not appear until all 3 checkboxes are checked.

### Copy (illustrative draft, in Evelyn's existing "ritual" voice — the deliverable is already named `energy_clearing_ritual` in the codebase)

> *"[FirstName], before I prepare this for you — I need to know you're truly ready."*
>
> - [ ] I understand belief is required for this to work
> - [ ] I won't tell anyone else about this reading — it weakens it
> - [ ] I understand once this is done, there's no undoing it
>
> *(button appears once all 3 are checked)* → **Get My Reading — $35**

Exact copy is expected to be refined during implementation/review — the structural requirement is 3 checkboxes + a header line addressing the visitor by name, gating a single confirm action.

### Interaction

- All 3 checkboxes must be checked for the confirm button to appear/enable.
- Confirming calls the same `handlePurchase("main")` used by today's `PurchaseCTA` — no new checkout logic.
- No server-side changes: `handlePurchase` already tags every purchase with `funnel: currentFunnel()` and reads price from `chat.userData.priceDollars`, both unaffected by this change.

## Analytics

`35_palm_gate` flows through the same purchase-event pipeline (`buildPurchaseEvent` → PostHog) that `35_palm_u47` and the retired `55-35_palm` already used, carrying `price_variant` on every purchase event. Comparing `35_palm_gate` vs `35_palm_u47` conversion is expected to work with existing dashboards/queries with no new instrumentation — this should be confirmed during implementation rather than assumed, since it wasn't independently re-verified for this design.

## Risks / Open Questions

- **In-flight sessions on `55-35_palm` at cutover time.** A visitor already mid-conversation when the pool config changes may have `55-35_palm` stored as their assigned `priceVariantId`. If that id is removed from the pool entirely, whatever code path re-resolves a variant by id for an existing conversation (vs. just reading the price already stamped on that conversation's row) needs to degrade sensibly rather than error. Needs a decision at implementation time: keep `55-35_palm` at weight 0 for a transition window (still resolvable for existing sessions, never newly assigned) vs. remove it outright and confirm in-flight sessions are unaffected because their price was already persisted at lead-capture time.
- **Copy is a placeholder.** The 3 statements above are directional, not final — real copywriting pass may be warranted before shipping live.
- **First name availability.** The gate's header line assumes `chat.userData.firstName` is reliably populated by the time the pitch/CTA renders. This is expected (name capture is the very first conversation step) but should be double-checked in implementation.
- **No plan yet for a formal significance threshold or test duration** — this design covers the mechanism and scoping, not the statistical stopping rule. That should be decided (or explicitly deferred to operator judgment) before the test goes live.
