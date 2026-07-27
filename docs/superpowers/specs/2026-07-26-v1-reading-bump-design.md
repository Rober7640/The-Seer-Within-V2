# fb-palm Order Bump — "Double Your Reading"

**Date:** 2026-07-26
**Status:** Design approved by operator, pending implementation plan

## Background

Operator inspiration: a newsletter case study on a classic checkout "order bump" (a single checkbox add-on shown at the point of purchase). The example ran a $17 front-end offer with a $12.77 "double the power of the enchantment" bump, landing at ~$50 AOV.

TSW's V1 funnel has no equivalent pre-checkout add-on today — the existing Upsell 1 (Protection Ritual, $47) and Upsell 2 (Manifestation Bracelet, $47/$30) are both *post-purchase* 1-click offers on separate pages (`/welcome1`, `/welcome2`), not a bump at the moment of the original purchase decision.

The literal "double the power" framing doesn't map to Evelyn's reading (it isn't a spell with an intensity dial), but the funnel already has a structural equivalent: the bucket picker (love / money / purpose / someone specific). A buyer commits to one bucket at the start of the session; the bump offers a second bucket's complete reading, in the same spirit as "double" the value delivered.

## Goal

Increase AOV on the fb-palm (`v1-palm`) funnel by offering a $12 "Double Your Reading" add-on — a second complete reading on an adjacent topic — as one additional chat turn inserted between purchase intent and the Stripe checkout redirect.

## Scope

**In scope:**
- `v1-palm` funnel only (`funnel === 'v1-palm'`). No other funnel (base Evelyn, `/fb`, `/fb2`, `/gdn`) is touched.
- Main $35 offer only. Applies uniformly after **any** of the three purchase-CTA variants currently live on this funnel — plain `PurchaseCTA`, `ClearingChoiceCard` (sliding-close), or the new `CommitmentGateCard` (commitment-gate test) — since all three already funnel into the same `handlePurchase("main")` call site.
- A new `BUMP_OFFER` chat phase: one Evelyn message + two quick-reply choices, inserted before that call site fires.
- A static bucket-pairing table deciding which second bucket is offered.
- A second Stripe line item + expanded checkout metadata.
- New columns on `conversations` to record bump state.
- A `system_config` feature flag, default OFF — this ships dark.
- Extending the existing `/admin/price-test` v1-palm view with bump stats.

**Out of scope (explicitly not part of this design):**
- The base Evelyn funnel and the `/fb`, `/fb2`, `/gdn` traffic clones.
- The $25 downsell CTA — never offered the bump. Downsell is for recovering a wavering buyer at a reduced price; stacking an upsell there works against that framing.
- Actually generating and emailing the second bucket's reading. This codebase has **no existing mechanism at all** that generates or sends the promised "$35 reading arrives by email in 24 hours" — that is fulfilled by a process/tool entirely outside this repo. This spec guarantees the bump selection reaches Stripe metadata; making the external fulfillment process consume `bumpBucket` and produce a second reading is a **separate, external dependency** the operator must coordinate.
- Per-arm targeting between `35_palm_u47` and `35_palm_gate`. The bump wraps the shared `handlePurchase("main")` call site uniformly — no special-casing per price-variant arm.
- Adding bump stats to the general `/admin/analytics` dashboard. That page does no funnel- or variant-scoped reporting anywhere today (confirmed: it queries `users`/`chatSessions`/`personas`/etc., never `conversations.funnel` or `conversations.priceVariant`), and has explicit precedent for keeping experiment-specific metrics out of it — a prior prompt A/B view was deliberately retired from `/admin/analytics` in favor of the dedicated `/admin/experiments` page. `/admin/price-test` is the established, funnel-aware home for fb-palm experiment metrics instead.
- Running concurrently with the live `35_palm_u47` / `35_palm_gate` 70/30 test. The bump ships dark and stays off until the operator manually enables it after that test concludes, so it never contaminates those results.

## Architecture

### 1. Insertion point in the chat flow

Today, every purchase-CTA variant on this funnel calls `handlePurchase("main")` directly on click (`client/src/hooks/useConversation.ts:1641-1692`), which POSTs to `/api/checkout` and then does `window.location.href = url` — a full-page redirect to Stripe's hosted checkout, with zero intervening chat turns. This is true regardless of which CTA rendered the button: plain `PurchaseCTA`, `ClearingChoiceCard`, or the new `CommitmentGateCard` (`client/src/pages/ChatPage.tsx:241-260`, confirm button wired at `:252`) — all three converge on the same call.

New behavior: when `funnel === 'v1-palm'` and the bump feature flag is on and the click is a `"main"`-type purchase, the click no longer calls `handlePurchase` immediately. Instead it transitions the chat to a new `BUMP_OFFER` phase:

1. Evelyn sends one message (bucket-pair-specific copy, see below) plus two quick-reply choices: **"Yes, double it — $12 more"** / **"No thanks, just my reading."**
2. The user's choice sets `userData.addBump` (boolean) and, if yes, `userData.bumpBucket` (from the static pairing table).
3. `handlePurchase("main")` then fires exactly as it does today, now carrying the bump fields.

This is a client-side phase addition only — it does not touch `handlePurchase`'s Stripe/redirect logic itself, only what runs immediately before it.

### 2. Which second bucket gets offered

A static pairing table — no live AI call, kept predictable and cheap, matching how `BUCKET_PROMPTS` is already a static dictionary:

| Current bucket | Bump bucket offered |
|---|---|
| love | money |
| money | love |
| purpose | love |
| someone specific | love |

Bump copy is a small set of 4 templated messages (one per pairing), written in Evelyn's existing voice, referencing the *other* block she's "also sensing." Exact copy is a placeholder pending a copywriting pass (see Risks).

### 3. Checkout & Stripe changes

`POST /api/checkout` (`server/routes.ts:585-753`) gains two optional request fields: `addBump: boolean`, `bumpBucket: string`. The server is authoritative — it only honors these fields when the resolved `funnel === 'v1-palm'` **and** the `v1_palm_bump_enabled` flag (see below) is on, regardless of what the client sends. This prevents a stale client (e.g. a cached page from before a rollback) from adding a bump line item after the operator disables the feature.

When honored, the existing single-item `line_items` array (`server/routes.ts:652-664`) gains a second entry:

```
{
  price_data: {
    currency: "usd",
    product_data: { name: "Double Your Reading Add-On" },
    unit_amount: 1200,
  },
  quantity: 1,
}
```

Both metadata blocks that already carry `bucket` (`payment_intent_data.metadata` at `:673-683`, and top-level session `metadata` at `:687-706`) gain `bumpBucket` and `bumpAmountCents` fields, following the exact same pattern used for `bucket` today. This is the handoff point for whatever external process turns `bucket` metadata into the emailed reading — it would need to start reading `bumpBucket` too, to produce a second reading. That update happens outside this repo and outside this spec's scope.

### 4. Schema changes

New columns on `conversations` (`shared/schema.ts`):
- `bumpOffered` (boolean) — whether this session reached the `BUMP_OFFER` phase, for funnel-analytics/take-rate denominators.
- `bumpPurchased` (boolean) — whether they said yes.
- `bumpBucket` (text, nullable) — which second bucket, if purchased.
- `bumpAmountCents` (integer, nullable) — amount charged for the bump.

Written at the same point `markPurchased()` runs today (`server/lib/db.ts:179-192`, called from `server/routes.ts:609-611`).

### 5. Feature flag / rollout

A new `system_config` entry, `v1_palm_bump_enabled` (boolean-style, following this codebase's existing flag conventions — exact serialization to confirm against how other dark-shipped flags are stored, e.g. the Problem-4 paywall redesign's disabled A/B flag). Checked in two places:
- Client: whether to route a `v1-palm` main-offer click into `BUMP_OFFER` at all, versus today's direct `handlePurchase` call.
- Server: whether `/api/checkout` honors `addBump`/`bumpBucket` (authoritative check, independent of the client).

Default is off at merge. The operator turns it on once the current `35_palm_u47` / `35_palm_gate` 70/30 test concludes.

### 6. Admin dashboard

Extends the existing funnel-scoped `/admin/price-test` page (`client/src/pages/admin/PriceTestDashboard.tsx`, backed by `GET /api/admin/price-test/v1?funnel=v1-palm` in `server/routes/admin/priceTest.ts`) rather than the general `/admin/analytics` dashboard. Adds a bump block to the existing `v1-palm`-scoped view: bump offered count, bump accepted count, take rate %, and bump revenue — queried from the new `conversations.bumpOffered`/`bumpPurchased`/`bumpAmountCents` columns, same table this page already reads for its per-variant breakdown.

## Data Flow

1. Visitor on `/fb-palm` reaches the pitch/purchase-CTA moment; `v1_palm_bump_enabled` is on.
2. Visitor clicks whichever purchase button is live for their assigned price-variant arm.
3. Client checks `funnel === 'v1-palm'` + flag on + `type === 'main'` → routes to `BUMP_OFFER` phase instead of calling `handlePurchase` immediately.
4. Evelyn sends the bump message (bucket-paired copy) + two quick replies. `bumpOffered` will be recorded as true regardless of the outcome.
5. User picks yes/no → `userData.addBump`/`userData.bumpBucket` set → `handlePurchase("main")` fires, now passing the bump fields to `/api/checkout`.
6. Server validates funnel + flag, optimistically writes `bumpOffered`/`bumpPurchased`/`bumpBucket`/`bumpAmountCents` on the `conversations` row (alongside the existing `markPurchased()` call), builds the Stripe session with one or two line items, and appends `bumpBucket`/`bumpAmountCents` to metadata when applicable.
7. Browser redirects to Stripe's hosted checkout exactly as today. One charge, one session, up to two line items.
8. `/admin/price-test` (`v1-palm` view) reads the new columns to report take rate and bump revenue.

## Error Handling

- **Stripe session creation failure:** no new failure mode — the bump line item is built with the same `price_data` pattern as the existing main line item, so it fails (or succeeds) the same way the current single-item session does today.
- **Checkout cancelled at Stripe:** nothing is charged; no separate bump artifact to reconcile since it's one session with up to two line items, not a separate transaction.
- **Flag flipped mid-session:** the flag is read live at click time on both client and server, not persisted with the price-variant assignment. A session already past the `BUMP_OFFER` phase when the flag flips is unaffected; a session that hasn't reached checkout yet simply sees whatever state is live at the moment of the click.

## Analytics

New PostHog events — `bump_offered`, `bump_accepted`, `bump_declined` — following the existing `purchase_completed` event pattern, in addition to the `/admin/price-test` dashboard extension described above.

## Testing

Add corresponding entries to `docs/test-ideas.md` per this repo's convention:
- Bump phase appears only on `v1-palm` with the flag on, never on other funnels or with the flag off.
- Bump phase never appears on the $25 downsell path.
- Both quick-reply outcomes produce the correct Stripe session (one vs. two line items) and correct metadata.
- `conversations.bumpOffered`/`bumpPurchased`/`bumpBucket`/`bumpAmountCents` populate correctly for both outcomes.
- A stale/tampered client cannot force a bump line item when the server-side flag is off.
- `/admin/price-test` v1-palm view renders bump stats correctly, including the zero-data case before any bump has been offered.

## Risks / Open Questions

- **Copy is a placeholder.** The 4 bucket-paired bump messages are directional, not final — a real copywriting pass is expected before shipping live.
- **Bucket-pairing table is a first guess.** love→money, money→love, purpose→love, someone-specific→love is a simple default, open to change if a different pairing logic is preferred.
- **External fulfillment coordination.** This spec makes `bumpBucket`/`bumpAmountCents` reach Stripe metadata; it does not make any second reading actually get written or sent. Whoever/whatever produces the emailed reading today must be separately updated to consume this field. Until that happens, a bump purchase would take the customer's $12 without a second reading being fulfilled — this must be resolved before `v1_palm_bump_enabled` is turned on in production.
- **Exact `system_config` flag serialization** to be confirmed against existing dark-ship flag conventions during implementation planning, not assumed here.
