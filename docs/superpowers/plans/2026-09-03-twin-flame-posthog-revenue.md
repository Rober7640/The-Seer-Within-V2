# Twin Flame PostHog Revenue Tracking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Twin Flame (`be_*`) purchase — booking, order-bump, and both upsells — emit a PostHog `purchase_completed` event carrying its dollar amount and the marketing link's UTM tag, so Joel can read **clicks + revenue per link** as a TrackDesk replacement.

**Architecture:** Twin Flame is deliberately walled off from all V1/soulmate tracking (Meta CAPI, Google Ads, Trackdesk, and the current PostHog builder) via its `be_*` product prefix. This plan adds a **PostHog-only, BE-isolated** revenue path: a separate `buildBackendPurchaseEvent()` builder (never touching the six-product V1 builder), fired server-side from the Stripe webhook next to the existing BE list-writes (browser-independent), plus client threading of the PostHog distinct-id + UTM tag through Stripe metadata so revenue attributes to the link the buyer clicked. Clicks are made groupable by registering `/tarot/twin-flame` as its own PostHog funnel.

**Tech Stack:** TypeScript, Express, Stripe (Checkout Sessions + off-session PaymentIntents), `posthog-node` (server capture), `posthog-js` (client), `node:test` + `tsx --test` for unit tests.

**Spec:** No standalone spec file. Requirements are Joel's 3-Sep-2026 call (captured in memory `posthog-partner-tracking-ask.md`) and the verified code findings in this session. The relevant requirement subset is copied verbatim into Global Constraints below.

## Global Constraints

- **The wall must not move.** BE stays invisible to Meta CAPI, Google Ads, and Trackdesk. This change is **PostHog-only**. `be_*` products must NOT be added to `TRACKED_PRODUCTS` (that builder feeds nothing but is shared with six V1/soulmate products), to `resolveStripeEventName`, or to `gadsStepForProduct`. (Documented at `server/routes/backendOffers.ts:28-39`.)
- **🔴 NEVER add `trackdeskClickId` to `be_*` metadata.** The webhook's Trackdesk branch defaults an unrecognised product to conversionType `'sale'`, which would book a backend reading as a main-funnel affiliate sale and corrupt attribution.
- **Accept ALL five UTM params; Joel picks which one.** We do NOT force a convention. Joel appends his tag (form `offer_source`, e.g. `twinflame_partnerA` / `pixiu_aidenpowers`) to **whichever** UTM parameter he chooses, and the data must appear in PostHog regardless. So capture and stamp all five standard UTMs — `utm_campaign`, `utm_source`, `utm_medium`, `utm_content`, `utm_term` — on every revenue event as present-or-null properties. No single key is "primary"; Joel breaks down by whichever one he used. This matches what the client's existing `registerUTMs()` already registers, so clicks and revenue read the same set.
- **Revenue must be browser-independent.** Fire from the Stripe webhook (server-side, retried by Stripe), never only from the browser — a buyer who pays and closes the tab must still count. Mirrors the existing BE list-write placement.
- **Events must be idempotent.** Stripe retries webhooks and the thank-you page re-records; pass a deterministic `uuid` to `posthog.capture` (`= stripe_session_id` for booking/hosted, `= payment_intent_id` for 1-click) so PostHog dedupes.
- **Amounts come from Stripe, in cents.** Use `session.amount_total` / `pi.amount` (what was actually charged), never a catalog price.

---

## File Structure

- **Create** `server/lib/backendPurchaseAnalytics.ts` — the BE-only `purchase_completed` builder (isolated from `purchaseAnalytics.ts`).
- **Create** `server/lib/backendPurchaseAnalytics.test.ts` — unit tests pinning the emitted event for booking + both upsells.
- **Modify** `client/src/lib/posthog.ts` — add `getUTMs()` reader (persisted super-properties).
- **Modify** `client/src/lib/backendCheckout.ts` — send `posthogDistinctId` + `utm` in the checkout body.
- **Modify** `server/routes/backendOffers.ts` — stamp `posthogDistinctId` + UTM onto booking session metadata (`/checkout`); copy them onto the 1-click upsell PI metadata (`/upsell/charge`).
- **Modify** `server/routes/webhooks.ts` — fire the BE revenue event in three branches (booking, hosted-fallback upsell, 1-click upsell).
- **Modify** `client/src/lib/funnel.ts` — register `/tarot/twin-flame` as PostHog funnel `"twinflame"` (`getPostHogFunnel` + `getPostHogStep` + type).
- **Create** `docs/posthog-utm-tracking.md` — operator/Joel how-to (UTM scheme + PostHog readout + AWeber cross-check); source for the Notion page.

---

### Task 1: BE-only purchase-event builder

**Files:**
- Create: `server/lib/backendPurchaseAnalytics.ts`
- Test: `server/lib/backendPurchaseAnalytics.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces:
  - `buildBackendPurchaseEvent(input: BackendPurchaseInput): BackendPurchaseEvent`
  - `utmsFromMetadata(meta: Record<string, string | undefined> | null | undefined): Utms` — pull the five UTM keys off a Stripe metadata bag (used by both webhook branches).
  - `type Utms = Partial<Record<'utm_campaign' | 'utm_source' | 'utm_medium' | 'utm_content' | 'utm_term', string>>`
  - `interface BackendPurchaseInput { product?: string; offer?: string; amountCents: number; email: string; distinctId?: string; utm?: Utms; dedupeId: string; bumpProduct?: string; }`
  - `interface BackendPurchaseEvent { distinctId: string; event: 'purchase_completed'; uuid: string; properties: Record<string, unknown>; }`

- [ ] **Step 1: Write the failing test**

```typescript
// server/lib/backendPurchaseAnalytics.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildBackendPurchaseEvent } from './backendPurchaseAnalytics';

describe('buildBackendPurchaseEvent', () => {
  it('booking sale → funnel twinflame, step sales, amount + utm on the event', () => {
    const ev = buildBackendPurchaseEvent({
      product: 'be_twin_flame',
      offer: 'twin-flame',
      amountCents: 3500,
      email: 'her@example.com',
      distinctId: 'ph_abc',
      utm: { utm_campaign: 'twinflame_partnerA', utm_source: 'aweber' },
      dedupeId: 'cs_test_123',
      bumpProduct: undefined,
    });
    assert.equal(ev.event, 'purchase_completed');
    assert.equal(ev.distinctId, 'ph_abc');
    assert.equal(ev.uuid, 'cs_test_123');
    assert.equal(ev.properties.funnel, 'twinflame');
    assert.equal(ev.properties.step, 'sales');
    assert.equal(ev.properties.product, 'be_twin_flame');
    assert.equal(ev.properties.amount_cents, 3500);
    assert.equal(ev.properties.utm_campaign, 'twinflame_partnerA');
    assert.equal(ev.properties.utm_source, 'aweber');
    // The three Joel didn't use are still present as null (always filterable).
    assert.equal(ev.properties.utm_medium, null);
    assert.equal(ev.properties.utm_content, null);
    assert.equal(ev.properties.utm_term, null);
    assert.equal(ev.properties.is_backend, true);
    assert.equal(ev.properties.bump, false);
  });

  it('tag in ANY utm param lands on the event — here utm_source only', () => {
    const ev = buildBackendPurchaseEvent({
      product: 'be_twin_flame', offer: 'twin-flame', amountCents: 3500,
      email: 'x@y.com', dedupeId: 'cs_3',
      utm: { utm_source: 'twinflame_partnerB' },
    });
    assert.equal(ev.properties.utm_source, 'twinflame_partnerB');
    assert.equal(ev.properties.utm_campaign, null);
    assert.equal(ev.properties.utm_content, null);
  });

  it('protection-ritual upsell → step upsell1', () => {
    const ev = buildBackendPurchaseEvent({
      product: 'be_protection_ritual', offer: 'twin-flame',
      amountCents: 4700, email: 'x@y.com', dedupeId: 'pi_1',
    });
    assert.equal(ev.properties.step, 'upsell1');
    assert.equal(ev.properties.amount_cents, 4700);
  });

  it('bracelet upsell → step upsell2', () => {
    const ev = buildBackendPurchaseEvent({
      product: 'be_bracelet', offer: 'twin-flame',
      amountCents: 3000, email: 'x@y.com', dedupeId: 'pi_2',
    });
    assert.equal(ev.properties.step, 'upsell2');
  });

  it('falls back to email as distinctId when none threaded', () => {
    const ev = buildBackendPurchaseEvent({
      product: 'be_twin_flame', offer: 'twin-flame',
      amountCents: 3500, email: 'fallback@y.com', dedupeId: 'cs_1',
    });
    assert.equal(ev.distinctId, 'fallback@y.com');
    assert.equal(ev.properties.utm_campaign, null);
  });

  it('bumpProduct present → bump true and bump_product set', () => {
    const ev = buildBackendPurchaseEvent({
      product: 'be_twin_flame', offer: 'twin-flame', amountCents: 4477,
      email: 'x@y.com', dedupeId: 'cs_2', bumpProduct: 'be_astro_force',
    });
    assert.equal(ev.properties.bump, true);
    assert.equal(ev.properties.bump_product, 'be_astro_force');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test server/lib/backendPurchaseAnalytics.test.ts`
Expected: FAIL — cannot find module `./backendPurchaseAnalytics`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// server/lib/backendPurchaseAnalytics.ts
//
// PostHog `purchase_completed` for BACKEND (`be_*`) offers ONLY. Kept in its own file,
// deliberately separate from purchaseAnalytics.ts: that builder is shared across six
// V1/soulmate products and BE must never perturb it. This is the ONLY PostHog emitter
// for backend revenue — Meta CAPI, Google Ads and Trackdesk stay blind to `be_*` by
// design (see server/routes/backendOffers.ts header). PostHog-only, on purpose.

export interface BackendPurchaseInput {
  /** Stripe metadata.product, e.g. 'be_twin_flame' | 'be_protection_ritual' | 'be_bracelet'. */
  product?: string;
  /** Backend offer key, e.g. 'twin-flame'. */
  offer?: string;
  /** Amount ACTUALLY charged, in cents (session.amount_total / pi.amount). */
  amountCents: number;
  email: string;
  /** Browser PostHog distinct id, threaded through Stripe metadata. Falls back to email. */
  distinctId?: string;
  /** Marketing link UTMs, threaded through Stripe metadata. Joel may put his tag in ANY of
   *  them — we don't force a convention, so all five are captured. */
  utm?: Utms;
  /** Deterministic PostHog dedupe id: stripe_session_id (booking/hosted) or pi.id (1-click). */
  dedupeId: string;
  /** The bump's product code, present only when the order bump was bought (booking only). */
  bumpProduct?: string;
}

/** The five standard UTM params. Joel's link may carry his tag in any one of them. */
export type Utms = Partial<
  Record<'utm_campaign' | 'utm_source' | 'utm_medium' | 'utm_content' | 'utm_term', string>
>;
const UTM_KEYS = ['utm_campaign', 'utm_source', 'utm_medium', 'utm_content', 'utm_term'] as const;

/** Extract the five UTMs off a Stripe metadata bag (threaded there at checkout/charge). */
export function utmsFromMetadata(
  meta: Record<string, string | undefined> | null | undefined,
): Utms {
  const m = meta ?? {};
  const out: Utms = {};
  for (const k of UTM_KEYS) {
    const v = m[k];
    if (typeof v === 'string' && v) out[k] = v;
  }
  return out;
}

export interface BackendPurchaseEvent {
  distinctId: string;
  event: 'purchase_completed';
  uuid: string;
  properties: Record<string, unknown>;
}

// be_* product → funnel step. Unknown be_ products still emit (revenue is never dropped)
// with step 'other'.
const BACKEND_STEP: Record<string, string> = {
  be_twin_flame: 'sales',
  be_judgement_day: 'sales',
  be_protection_ritual: 'upsell1',
  be_bracelet: 'upsell2',
};

// offer key → PostHog funnel name (matches Joel's `twinflame_...` tag family).
const BACKEND_FUNNEL: Record<string, string> = {
  'twin-flame': 'twinflame',
  'judgement-day': 'judgement',
};

export function buildBackendPurchaseEvent(input: BackendPurchaseInput): BackendPurchaseEvent {
  const step = (input.product && BACKEND_STEP[input.product]) || 'other';
  const funnel = (input.offer && BACKEND_FUNNEL[input.offer]) || input.offer || 'backend';
  const utm = input.utm ?? {};
  // All five UTMs, present-or-null, so whichever one Joel used is always a filterable
  // property (and the four he didn't use are explicitly null, never missing).
  const utmProps: Record<string, string | null> = {};
  for (const k of UTM_KEYS) utmProps[k] = utm[k] ?? null;
  return {
    distinctId: input.distinctId || input.email,
    event: 'purchase_completed',
    uuid: input.dedupeId,
    properties: {
      funnel,
      step,
      product: input.product ?? null,
      payment_method: 'stripe',
      amount_cents: input.amountCents,
      email: input.email,
      is_backend: true,
      bump: !!input.bumpProduct,
      bump_product: input.bumpProduct ?? null,
      ...utmProps,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test server/lib/backendPurchaseAnalytics.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add server/lib/backendPurchaseAnalytics.ts server/lib/backendPurchaseAnalytics.test.ts
git commit -m "feat(be-posthog): BE-only purchase_completed builder for twin flame revenue"
```

---

### Task 2: Client — read distinct-id + UTM and send them through BE checkout

**Files:**
- Modify: `client/src/lib/posthog.ts` (add `getUTMs`, after `getDistinctId` at line 72-79)
- Modify: `client/src/lib/backendCheckout.ts:80-89` (checkout body)

**Interfaces:**
- Consumes: `getDistinctId()` (existing, `posthog.ts:72`).
- Produces: `getUTMs(): Record<string, string>` — reads ALL FIVE UTMs already registered as PostHog super-properties by `registerUTMs()` on entry (same five keys `registerUTMs` uses), so whichever param Joel used survives in-funnel navigation and the Stripe redirect. Only present keys are returned.

- [ ] **Step 1: Add `getUTMs()` to `client/src/lib/posthog.ts`**

Add after `getDistinctId()` (currently ends at line 79). Note the shared `UTM_PARAMS` list — reuse it in `registerUTMs` too so the captured set can never drift from the read set:

```typescript
/** The five standard UTM params. Single source of truth for register + read. */
export const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

/**
 * The UTMs registered as super-properties on entry (registerUTMs). Read from PostHog's
 * persistence, NOT window.location — the entry URL's utm_* survive navigation to the
 * booking screen and the Stripe redirect. Joel may put his tag in ANY of the five, so
 * all five are read; only present keys are returned.
 */
export function getUTMs(): Record<string, string> {
  if (!initialized) return {};
  try {
    const out: Record<string, string> = {};
    for (const key of UTM_PARAMS) {
      const value = posthog.get_property(key);
      if (typeof value === 'string' && value) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}
```

Then refactor `registerUTMs` (line 62) to iterate `UTM_PARAMS` instead of its own inline array, so register and read share one list:

```typescript
    for (const key of UTM_PARAMS) {
      const value = params.get(key);
      if (value) utm[key] = value;
    }
```

- [ ] **Step 2: Send them in the BE checkout body**

In `client/src/lib/backendCheckout.ts`, add the import at the top (after line 2):

```typescript
import { getDistinctId, getUTMs } from './posthog';
```

Then extend the `body` object in the `fetch('/api/backend/checkout')` call (currently lines 80-89) — add these two fields alongside `expSubject`:

```typescript
        expSubject: getBackendVisitorId(),
        // PostHog attribution: the browser distinct id + the entry link's UTM tag, so
        // the server-side revenue event stitches to her click and lands on the right
        // link in Joel's clicks+revenue readout. Both optional; absent → no-op.
        posthogDistinctId: getDistinctId(),
        utm: getUTMs(),
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "posthog.ts|backendCheckout.ts" || echo "clean"`
Expected: `clean` (no new errors in these two files).

- [ ] **Step 4: Commit**

```bash
git add client/src/lib/posthog.ts client/src/lib/backendCheckout.ts
git commit -m "feat(be-posthog): thread distinct-id + UTM through backend checkout"
```

---

### Task 3: Server — stamp distinct-id + UTM onto booking metadata, carry to the 1-click PI

**Files:**
- Modify: `server/routes/backendOffers.ts:409-427` (booking session metadata)
- Modify: `server/routes/backendOffers.ts:248-261` (1-click upsell PI metadata)

**Interfaces:**
- Consumes: `req.body.posthogDistinctId`, `req.body.utm` (from Task 2); `session.metadata` (the booking session read in `/upsell/charge`).
- Produces: Stripe metadata keys `posthogDistinctId`, `utm_campaign`, `utm_source`, `utm_medium` on both the booking Checkout Session and the 1-click upsell PaymentIntent. Consumed by Task 4 + Task 5.

- [ ] **Step 1: Add a metadata helper near the top of the route file**

In `server/routes/backendOffers.ts`, after `MAX_FIRST_NAME` (line 45), add:

```typescript
// The attribution metadata keys we carry through Stripe. All five UTMs, because Joel
// may put his tag in any one of them, plus the browser distinct id.
const PH_UTM_KEYS = ['utm_campaign', 'utm_source', 'utm_medium', 'utm_content', 'utm_term'] as const;

/** Pull the PostHog attribution fields off a request body (checkout) into a flat,
 *  length-capped metadata patch. Only present keys are emitted, so Stripe metadata
 *  stays lean and the purchase event's props are present-or-absent cleanly. */
function posthogMetaFromBody(body: unknown): Record<string, string> {
  const b = (body ?? {}) as { posthogDistinctId?: unknown; utm?: Record<string, unknown> };
  const out: Record<string, string> = {};
  if (typeof b.posthogDistinctId === 'string' && b.posthogDistinctId)
    out.posthogDistinctId = b.posthogDistinctId.slice(0, 200);
  const utm = b.utm && typeof b.utm === 'object' ? (b.utm as Record<string, unknown>) : {};
  for (const k of PH_UTM_KEYS) {
    const v = utm[k];
    if (typeof v === 'string' && v) out[k] = v.slice(0, 200);
  }
  return out;
}

/** The same keys, copied off an existing Stripe metadata bag (the booking session),
 *  so the 1-click upsell PI carries attribution without the browser re-sending it. */
function posthogMetaFromStripe(meta: Record<string, string | undefined> | null | undefined): Record<string, string> {
  const m = meta ?? {};
  const out: Record<string, string> = {};
  for (const k of ['posthogDistinctId', ...PH_UTM_KEYS]) {
    const v = m[k];
    if (typeof v === 'string' && v) out[k] = v;
  }
  return out;
}
```

- [ ] **Step 2: Stamp them onto the booking session metadata**

In the `stripe.checkout.sessions.create` call, extend the `metadata` object (currently lines 409-427). Add the spread as the last entry, immediately before the closing `},` of `metadata`:

```typescript
        ...(typeof req.body?.expSubject === 'string' && req.body.expSubject
          ? { expSubject: req.body.expSubject.slice(0, 64) }
          : {}),
        // PostHog attribution — distinct id + link UTM, read back by the webhook's
        // BE revenue event. NOT a product/behaviour key; nothing branches on these.
        ...posthogMetaFromBody(req.body),
```

- [ ] **Step 3: Carry them onto the 1-click upsell PaymentIntent**

In the `/upsell/charge` route's `stripe.paymentIntents.create` call, extend the `metadata` object (currently lines 248-261). Add the spread as the last entry, immediately before the closing `},` of `metadata`:

```typescript
        ...(buyerName ? { firstName: buyerName } : {}),
        // Attribution copied off the booking session so payment_intent.succeeded can
        // fire the BE revenue event with the same distinct id + UTM as the booking.
        ...posthogMetaFromStripe(session.metadata),
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "backendOffers.ts" || echo "clean"`
Expected: `clean` (no new errors in `backendOffers.ts`).

- [ ] **Step 5: Commit**

```bash
git add server/routes/backendOffers.ts
git commit -m "feat(be-posthog): carry distinct-id + UTM into BE Stripe metadata"
```

---

### Task 4: Server — fire the booking + hosted-fallback revenue events

**Files:**
- Modify: `server/routes/webhooks.ts` (imports near line 16; `checkout.session.completed` BE branch, lines 1031-1055)

**Interfaces:**
- Consumes: `buildBackendPurchaseEvent` (Task 1); the attribution metadata on the session (Task 3); `posthog` (already imported in `webhooks.ts`).
- Produces: one `purchase_completed` per BE booking and per hosted-fallback BE upsell.

- [ ] **Step 1: Add the import**

Near the other BE imports in `server/routes/webhooks.ts` (after line 18):

```typescript
import { buildBackendPurchaseEvent, utmsFromMetadata } from '../lib/backendPurchaseAnalytics';
```

- [ ] **Step 2: Fire in the BE branch of `checkout.session.completed`**

In the `if (product?.startsWith(BACKEND_STRIPE_PRODUCT_PREFIX)) {` block (starts line 1031), fire the revenue event for BOTH sub-cases. Replace the block's body so the capture happens for the upsell-fallback and the booking:

```typescript
    if (product?.startsWith(BACKEND_STRIPE_PRODUCT_PREFIX)) {
      const beUpsell = backendUpsellFor(product);

      // PostHog revenue (BE-only; Meta/GAds/Trackdesk stay blind by design). Deterministic
      // uuid = session.id so Stripe retries + the thank-you re-record dedupe. Browser-
      // independent: a buyer who closes the tab still counts.
      if ((session.amount_total ?? 0) > 0 && email) {
        posthog.capture(
          buildBackendPurchaseEvent({
            product,
            offer: resolveOfferKey(metadata) ?? 'twin-flame',
            amountCents: session.amount_total ?? 0,
            email,
            distinctId: metadata.posthogDistinctId,
            utm: utmsFromMetadata(metadata),
            dedupeId: session.id,
            bumpProduct: metadata.bumpProduct,
          }),
        );
      }

      if (beUpsell) {
        // A BE UPSELL bought via HOSTED checkout (the 1-click fallback). The 1-click
        // happy path writes from payment_intent.succeeded; this covers the fallback.
        // recordBackendOrder is for BOOKING offers only and does not know upsell keys.
        const upsellEmail =
          session.customer_details?.email || session.customer_email || metadata.email || null;
        if (upsellEmail) {
          const offer = resolveOfferKey(metadata) ?? 'twin-flame';
          await addBackendUpsellCustomer({
            email: upsellEmail,
            firstName: metadata.firstName,
            productKey: beUpsell.productKey,
            offer,
          }).catch((err) =>
            logger.error('BE upsell fallback list write FAILED — buyer paid:', err),
          );
        }
      } else {
        await recordBackendOrder(session).catch((err) =>
          logger.error('recordBackendOrder failed (non-blocking):', err),
        );
      }
    }
```

> Note: `resolveOfferKey` is already imported/used in this file (it appears at lines 1040 and 1236). `email` is defined at the top of the handler (line 856). `metadata` is defined at line 853. No new imports beyond Step 1.

- [ ] **Step 3: Verify existing webhook tests still pass**

Run: `npx tsx --test server/lib/beOrders.test.ts server/lib/backendCustomerList.test.ts`
Expected: PASS (no regressions; these don't exercise the webhook capture but confirm the BE order/list logic is untouched).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "webhooks.ts" || echo "clean"`
Expected: `clean`.

- [ ] **Step 5: Commit**

```bash
git add server/routes/webhooks.ts
git commit -m "feat(be-posthog): fire booking + hosted-fallback revenue events"
```

---

### Task 5: Server — fire the 1-click upsell revenue event

**Files:**
- Modify: `server/routes/webhooks.ts` (`payment_intent.succeeded` BE-upsell branch, lines 1232-1250)

**Interfaces:**
- Consumes: `buildBackendPurchaseEvent` (Task 1, imported in Task 4); the attribution metadata copied onto the PI (Task 3).
- Produces: one `purchase_completed` per 1-click BE upsell charge.

- [ ] **Step 1: Fire in the `beUpsell` branch of `payment_intent.succeeded`**

In the `const beUpsell = backendUpsellFor(metadata.product); if (beUpsell) {` block (line 1232), add the capture as the FIRST statement inside the `if (beUpsell)` block, before `recordBackendUpsellOrder(pi)`:

```typescript
    const beUpsell = backendUpsellFor(metadata.product);
    if (beUpsell) {
      // PostHog revenue (BE-only). Deterministic uuid = pi.id dedupes Stripe retries.
      if (pi.amount > 0 && metadata.email) {
        posthog.capture(
          buildBackendPurchaseEvent({
            product: metadata.product,
            offer: resolveOfferKey(metadata) ?? 'twin-flame',
            amountCents: pi.amount,
            email: metadata.email,
            distinctId: metadata.posthogDistinctId,
            utm: utmsFromMetadata(metadata),
            dedupeId: pi.id,
          }),
        );
      }
      await recordBackendUpsellOrder(pi); // idempotent, self-logging, never throws
      // ...existing addBackendUpsellCustomer block unchanged...
```

> Leave the rest of the block (`recordBackendUpsellOrder`, `addBackendUpsellCustomer`) exactly as-is.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "webhooks.ts" || echo "clean"`
Expected: `clean`.

- [ ] **Step 3: Full backend test sweep (no regressions)**

Run: `npm run test:price && npx tsx --test server/lib/backendPurchaseAnalytics.test.ts server/lib/beOrders.test.ts server/lib/backendCustomerList.test.ts`
Expected: all PASS (existing `purchaseAnalytics.test.ts` REGRESSION block still green → V1 builder untouched; new BE builder green).

- [ ] **Step 4: Commit**

```bash
git add server/routes/webhooks.ts
git commit -m "feat(be-posthog): fire 1-click upsell revenue event"
```

---

### Task 6: Client — register `/tarot/twin-flame` as a PostHog funnel (clicks)

**Files:**
- Modify: `client/src/lib/funnel.ts:205-207` (type), `:223-239` (`getPostHogFunnel`), `:246-291` (`getPostHogStep`)

**Interfaces:**
- Consumes: `TWIN_FLAME_PREFIX` (existing, `funnel.ts:103`).
- Produces: `getPostHogFunnel('/tarot/twin-flame...')` → `"twinflame"`; `getPostHogStep` maps its sub-paths. This makes `App.tsx`'s existing `lander_view` block fire on Twin Flame pages so **clicks** group under one funnel alongside the revenue events. (Does NOT touch `isTrackedFunnel` — the Meta pixel stays blind to BE by design.)

- [ ] **Step 1: Write the failing test**

```typescript
// client/src/lib/funnel.twinflame.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getPostHogFunnel, getPostHogStep } from './funnel';

describe('twin-flame PostHog funnel', () => {
  it('roots + sub-paths resolve to the twinflame funnel', () => {
    assert.equal(getPostHogFunnel('/tarot/twin-flame'), 'twinflame');
    assert.equal(getPostHogFunnel('/tarot/twin-flame/welcome1'), 'twinflame');
    assert.equal(getPostHogFunnel('/tarot/twin-flame/success?s=cs_1'), 'twinflame');
  });
  it('steps map to the shared funnel vocabulary', () => {
    assert.equal(getPostHogStep('/tarot/twin-flame'), 'booking');
    assert.equal(getPostHogStep('/tarot/twin-flame/welcome1'), 'upsell1');
    assert.equal(getPostHogStep('/tarot/twin-flame/welcome2'), 'upsell2');
    assert.equal(getPostHogStep('/tarot/twin-flame/success'), 'thank_you');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test client/src/lib/funnel.twinflame.test.ts`
Expected: FAIL — `getPostHogFunnel('/tarot/twin-flame')` returns `null`.

- [ ] **Step 3: Add `"twinflame"` to the funnel type**

In `client/src/lib/funnel.ts`, extend `PostHogFunnel` (lines 205-207):

```typescript
export type PostHogFunnel =
  | "soulmate" | "fb" | "fb2" | "gdn" | "palm" | "tarot" | "v1" | "evelyn" | "aiden"
  | "marcus" | "luna" | "nova" | "maren" | "seven-seven" | "twinflame";
```

- [ ] **Step 4: Resolve the funnel in `getPostHogFunnel`**

In `getPostHogFunnel` (line 223), add this line immediately after `const p = normalize(...)` (line 224), before the `funnelDefForPath` lookup:

```typescript
  if (p === TWIN_FLAME_PREFIX || p.startsWith(`${TWIN_FLAME_PREFIX}/`)) return "twinflame";
```

- [ ] **Step 5: Map steps in `getPostHogStep`**

In the `switch (funnel)` of `getPostHogStep`, add a case (e.g. after the `case "v1":` block, before `case "fb":`):

```typescript
    case "twinflame": {
      const sub = p.slice(TWIN_FLAME_PREFIX.length); // "" at the booking root
      if (sub === "" || sub === "/preview-page" || sub === "/preview-chat") return "booking";
      if (sub === "/welcome1") return "upsell1";
      if (sub === "/welcome2") return "upsell2";
      if (sub === "/success") return "thank_you";
      return "unknown";
    }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx tsx --test client/src/lib/funnel.twinflame.test.ts`
Expected: PASS.

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "funnel.ts" || echo "clean"`
Expected: `clean`.

- [ ] **Step 8: Commit**

```bash
git add client/src/lib/funnel.ts client/src/lib/funnel.twinflame.test.ts
git commit -m "feat(be-posthog): register /tarot/twin-flame as a PostHog funnel"
```

---

### Task 7: Docs — the UTM how-to for Joel (Notion source) + operator readout

**Files:**
- Create: `docs/posthog-utm-tracking.md`

**Interfaces:**
- Consumes: the event shape from Task 1 (`utm_campaign`, `amount_cents`, `funnel: 'twinflame'`).
- Produces: the operator/Joel-facing doc; content is pasted into Notion by Lewis (Joel's ask #1 close).

- [ ] **Step 1: Write the doc**

```markdown
# PostHog link tracking — clicks & revenue per link

## What you get
For any link you mail, two numbers in PostHog: **clicks** and **revenue**, broken down
by the tag you put on the link. This replaces TrackDesk for backend offers.

## The tag you append
Add your tag to the link as a UTM parameter, in the form `offer_source`. You can use
**any** of the five standard UTM parameters — pick whichever you like and stay consistent:

    ?utm_campaign=twinflame_partnerA      ← or
    ?utm_source=twinflame_partnerA        ← or
    ?utm_medium=twinflame_partnerA        ← (utm_content / utm_term also work)

    https://theseerwithin.com/tarot/twin-flame?utm_campaign=twinflame_partnerA

- `twinflame_partnerA` — Twin Flame, mailed by partner A.
- `pixiu_aidenpowers` — Pixiu bracelet, Aiden Powers list.

Keep the value lowercase, no spaces. One value = one row in the report. Whichever UTM
parameter you put it in, PostHog captures it — just remember which one you used, because
that's the field you break the report down by.

## Where to read it
Replace `utm_campaign` below with whichever UTM param you actually used.
- **Clicks:** PostHog → Product analytics → Trends → event `$pageview` (or `lander_view`),
  breakdown by your UTM param. Filter `funnel = twinflame` for Twin Flame only.
- **Revenue:** Trends → event `purchase_completed`, property `is_backend = true`,
  aggregation **Sum of `amount_cents`** (÷100 for dollars), breakdown by your UTM param.

## Cross-check against AWeber
AWeber's own click count for the broadcast should be close to PostHog's click count for
the same tag. A big gap (e.g. AWeber 3000 vs PostHog 2000) means something is broken — a
missing tag on the link, or a tracking outage. Check the tag first.

## Notes
- Revenue is captured server-side from Stripe, so a buyer who pays and closes the tab
  still counts.
- All five UTM params are captured, so it doesn't matter which one you choose — but use
  the same one across a campaign so its clicks and revenue line up on one row.
- Backend offers are invisible to Facebook/Google/TrackDesk by design — this PostHog
  view is the source of truth for them.
```

- [ ] **Step 2: Commit**

```bash
git add docs/posthog-utm-tracking.md
git commit -m "docs(be-posthog): UTM link-tracking how-to for Joel/Notion"
```

---

## Self-Review

**1. Spec coverage (Joel's asks):**
- Clicks per link → Task 6 (funnel registration makes `lander_view`/`$pageview` group by `utm_campaign`). ✅
- Revenue per link → Tasks 1, 4, 5 (booking, hosted-fallback, 1-click all emit `purchase_completed` with `amount_cents` + `utm_campaign`). ✅
- The `offer_source` tag in ANY UTM param → all five captured (Task 1 builder, Task 2 `getUTMs`, Task 3 threading) + Task 7 doc. Joel picks the param; no convention forced. ✅
- AWeber cross-check → Task 7 doc (operational, not code). ✅
- Notion how-to → Task 7. ✅
- Twin Flame first (Pixiu/all-funnels later) → this plan is Twin Flame-scoped; the builder (`BACKEND_FUNNEL`/`BACKEND_STEP`) already generalizes to `judgement-day` and any `be_*` offer, so Pixiu is a follow-on config addition, not a rebuild. Noted, out of scope here.
- Keep the wall intact (no Meta/GAds/Trackdesk) → Global Constraints + BE-isolated builder; no changes to `TRACKED_PRODUCTS`/`resolveStripeEventName`/`gadsStepForProduct`/Trackdesk branch. ✅

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to Task N". All code steps carry real code. ✅

**3. Type consistency:** `buildBackendPurchaseEvent` signature (Task 1) is used with the same fields in Tasks 4 and 5, both feeding `utm` via `utmsFromMetadata` (Task 1). `getUTMs()` returns `Record<string, string>` (Task 2), assignable to the `utm?: Utms` field (Task 1). The five-key list is defined once per layer and kept identical: `UTM_PARAMS` (client, Task 2), `PH_UTM_KEYS` (route threading, Task 3), `UTM_KEYS` (builder, Task 1) — all five: campaign/source/medium/content/term. `"twinflame"` funnel string is consistent across Task 1 (`BACKEND_FUNNEL['twin-flame']`) and Task 6 (`getPostHogFunnel`). ✅

## Resolved decision
- **UTM convention** — RESOLVED: no convention forced. The system accepts Joel's tag in **any** of the five UTM params and surfaces it in PostHog either way; Joel chooses which one at send time and breaks the report down by that field. All five are captured end-to-end (link → super-props → Stripe metadata → revenue event). The only ask of Joel is to stay consistent within a campaign so its clicks and revenue land on the same row.
```
