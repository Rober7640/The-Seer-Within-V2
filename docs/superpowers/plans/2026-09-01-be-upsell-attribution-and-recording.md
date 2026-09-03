# Backend Upsell Attribution & Recording — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record every backend-offer upsell purchase in the DB stamped with its originating offer, tag AWeber per-offer, and stop the charge hardcoding `offer:'twin-flame'`/`"BE 02"` — so upsell stats are correct per lander (initial + U1 + U2).

**Architecture:** Server + data only; no client change. The upsell charge resolves the originating offer from the booking Stripe session (`metadata.offer`, else the product), stamps it on the upsell PaymentIntent, and the webhook writes it to a new `be_upsell_orders` table and to the offer's AWeber tag. Pure helpers hold the logic so they unit-test cleanly.

**Tech Stack:** TypeScript, Drizzle ORM (Postgres), Stripe, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-01-shared-backend-upsell-engine-design.md` (this is plan 1 of 2 — the server/data half; §3, §4, §5 of the spec).

**Worktree:** At execution, create branch `feat/be-upsell-attribution` off `feat/be-02-golive` via the superpowers:using-git-worktrees skill. All paths below are relative to the repo root.

## Global Constraints

- **Physical upsell products are shared and unchanged:** `be_protection_ritual` ($4700), `be_bracelet` ($4700 / $3000 downsell). Do NOT add products.
- **Twin Flame (02) behaviour must not change.** Its tags stay exactly `be-02-twin-flame`, `be-02-upsell1-protection`, `be-02-upsell2-bracelet`. Any test that asserts a 02 tag must still pass.
- **AWeber tag strings are load-bearing** (they trigger AWeber Campaigns) — emit exact strings, never rename.
- **Recording is idempotent and non-blocking:** keyed on the Stripe PaymentIntent id (UNIQUE + `onConflictDoNothing`); a DB failure logs and returns, never throws into the webhook.
- **Migration ships two ways:** the Drizzle table in `shared/schema.ts` (applied on dev via `npm run db:push`) AND a hand-written idempotent SQL file for prod (mirrors the schema exactly). Both must exist before go-live — do not repeat the missing-`be_orders` silent drop.
- **Test runners:** backend libs use **vitest** — run a single file with `npx vitest run <path>`. Typecheck with `npm run check`.

---

### Task 1: `be_upsell_orders` table (schema + prod SQL)

**Files:**
- Modify: `shared/schema.ts` (append after the `beOrders` block, which ends ~line 1626)
- Create: `improve-v1/create-be-upsell-orders-table-2026-09-01.sql`
- Test: `shared/beUpsellOrders.schema.test.ts`

**Interfaces:**
- Produces: `beUpsellOrders` (Drizzle table), `type BeUpsellOrder`, `type InsertBeUpsellOrder` — exported from `@shared/schema`. Columns: `stripePaymentIntentId` (unique), `bookingSessionId`, `offer`, `offerNumber`, `product`, `tier`, `amountCents`, `currency`, `email`, `firstName`, `createdAt`.

- [ ] **Step 1: Write the failing test**

Create `shared/beUpsellOrders.schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { beUpsellOrders } from './schema';

describe('be_upsell_orders schema', () => {
  it('is named be_upsell_orders and carries the attribution columns', () => {
    const cfg = getTableConfig(beUpsellOrders);
    expect(cfg.name).toBe('be_upsell_orders');
    const cols = Object.fromEntries(cfg.columns.map((c) => [c.name, c]));
    expect(cols['offer']).toBeTruthy();
    expect(cols['offer_number']).toBeTruthy();
    expect(cols['product']).toBeTruthy();
    expect(cols['tier']).toBeTruthy();
    expect(cols['amount_cents']).toBeTruthy();
    // The idempotency key must be unique.
    expect(cols['stripe_payment_intent_id'].isUnique).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/beUpsellOrders.schema.test.ts`
Expected: FAIL — `beUpsellOrders` is not exported from `./schema`.

- [ ] **Step 3: Add the table to `shared/schema.ts`**

Append immediately after the `export type InsertBeOrder = ...` line:

```ts
// ============================================================================
// BACKEND DECK UPSELL ORDERS (be_upsell_orders)
// One row per upsell PaymentIntent (Protection Ritual / Bracelet). Unlike
// be_orders (one row per BOOKING checkout session), upsells are separate 1-click
// PaymentIntents, so they get their own table keyed on the PI id. The `offer`
// column is the whole point: it attributes the upsell to the lander it came from
// (twin-flame vs judgement-day), which the shared physical product cannot.
// ============================================================================
export const beUpsellOrders = pgTable("be_upsell_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Stripe is the source of truth for money. UNIQUE => idempotent on webhook retry.
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull().unique(),
  // The booking checkout session this upsell was charged off (metadata.originalSession).
  bookingSessionId: text("booking_session_id"),

  // The originating offer, in the deck's vocabulary — the attribution key.
  offer: text("offer").notNull(),               // twin-flame | judgement-day
  offerNumber: text("offer_number").notNull(),  // 02 | 03

  // Which physical upsell, and whether it was the downsell price.
  product: text("product").notNull(),           // be_protection_ritual | be_bracelet
  tier: text("tier").notNull().default("full"), // full | downsell

  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("usd"),

  email: text("email"),
  firstName: text("first_name"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_be_upsell_orders_offer").on(table.offer, table.createdAt),
  index("idx_be_upsell_orders_product").on(table.product),
]);

export type BeUpsellOrder = typeof beUpsellOrders.$inferSelect;
export type InsertBeUpsellOrder = typeof beUpsellOrders.$inferInsert;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run shared/beUpsellOrders.schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the prod migration SQL (mirrors the schema exactly)**

Create `improve-v1/create-be-upsell-orders-table-2026-09-01.sql`:

```sql
-- ============================================================================
-- CREATE the be_upsell_orders table. One row per backend upsell PaymentIntent,
-- stamped with the originating offer so upsell revenue attributes to its lander.
-- Mirrors shared/schema.ts (beUpsellOrders). Idempotent. Run ONCE on PROD.
-- (Dev gets it via `npm run db:push`.)
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS be_upsell_orders (
  id                       varchar PRIMARY KEY DEFAULT gen_random_uuid(),

  stripe_payment_intent_id text NOT NULL UNIQUE,
  booking_session_id       text,

  offer                    text NOT NULL,
  offer_number             text NOT NULL,

  product                  text NOT NULL,
  tier                     text NOT NULL DEFAULT 'full',

  amount_cents             integer NOT NULL,
  currency                 text NOT NULL DEFAULT 'usd',

  email                    text,
  first_name               text,

  created_at               timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_be_upsell_orders_offer   ON be_upsell_orders (offer, created_at);
CREATE INDEX IF NOT EXISTS idx_be_upsell_orders_product ON be_upsell_orders (product);

SELECT to_regclass('public.be_upsell_orders') AS be_upsell_orders_exists; -- expect 'be_upsell_orders'

COMMIT;
```

- [ ] **Step 6: Apply on dev**

Run: `npm run db:push`
Expected: drizzle-kit reports the `be_upsell_orders` table created (no destructive prompts on other tables — if it prompts to drop anything, STOP and abort).

- [ ] **Step 7: Commit**

```bash
git add shared/schema.ts shared/beUpsellOrders.schema.test.ts improve-v1/create-be-upsell-orders-table-2026-09-01.sql
git commit -m "feat(be): add be_upsell_orders table for per-offer upsell attribution"
```

---

### Task 2: Catalog helpers — resolve offer, build upsell description

**Files:**
- Modify: `shared/backendOffers.ts` (add helpers near `backendOrderDescriptor`, ~line 210)
- Test: `server/lib/backendOffers.test.ts` (append a describe block)

**Interfaces:**
- Consumes: `BACKEND_OFFER_CATALOG`, `isBackendOfferKey`, `backendOfferForStripeProduct`, `type BackendOfferKey` (all already in this file).
- Produces:
  - `resolveOfferKey(meta: { offer?: string | null; product?: string | null } | null | undefined): BackendOfferKey | null`
  - `backendUpsellDescriptor(key: BackendOfferKey, upsellName: string, isDownsell: boolean): string`
  - `upsellChargeFields(meta, upsellName: string, isDownsell: boolean): { offer: BackendOfferKey; description: string }`

- [ ] **Step 1: Write the failing test**

Append to `server/lib/backendOffers.test.ts`:

```ts
import {
  resolveOfferKey,
  backendUpsellDescriptor,
  upsellChargeFields,
} from '@shared/backendOffers';

describe('upsell offer resolution + description', () => {
  it('resolves the offer from metadata.offer when valid', () => {
    expect(resolveOfferKey({ offer: 'judgement-day' })).toBe('judgement-day');
  });

  it('falls back to the offer that owns the Stripe product', () => {
    expect(resolveOfferKey({ product: 'be_judgement_day' })).toBe('judgement-day');
    expect(resolveOfferKey({ product: 'be_twin_flame' })).toBe('twin-flame');
  });

  it('returns null when nothing resolves', () => {
    expect(resolveOfferKey({ offer: 'nope', product: 'be_unknown' })).toBeNull();
    expect(resolveOfferKey(null)).toBeNull();
  });

  it('builds the BE <number> description per offer', () => {
    expect(backendUpsellDescriptor('twin-flame', 'Protection Ritual', false))
      .toBe('BE 02 · Protection Ritual');
    expect(backendUpsellDescriptor('judgement-day', 'Manifestation Bracelet', true))
      .toBe('BE 03 · Manifestation Bracelet (downsell)');
  });

  it('upsellChargeFields resolves offer + description together, defaulting to twin-flame', () => {
    expect(upsellChargeFields({ offer: 'judgement-day' }, 'Protection Ritual', false))
      .toEqual({ offer: 'judgement-day', description: 'BE 03 · Protection Ritual' });
    // Unresolvable → the historical default, so a mis-stamped session never 500s.
    expect(upsellChargeFields({}, 'Protection Ritual', false))
      .toEqual({ offer: 'twin-flame', description: 'BE 02 · Protection Ritual' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/lib/backendOffers.test.ts`
Expected: FAIL — the three helpers are not exported.

- [ ] **Step 3: Add the helpers to `shared/backendOffers.ts`**

Insert after `backendOrderDescriptor` (the existing `BE <number> · …` booking-descriptor helper):

```ts
/**
 * The originating offer for a set of Stripe metadata: the explicit `offer` key if
 * it is a known offer, else the offer that owns the `product`. Null when neither
 * resolves — callers decide the fallback rather than guessing here.
 */
export function resolveOfferKey(
  meta: { offer?: string | null; product?: string | null } | null | undefined,
): BackendOfferKey | null {
  const offer = meta?.offer;
  if (isBackendOfferKey(offer)) return offer;
  return backendOfferForStripeProduct(meta?.product ?? null)?.key ?? null;
}

/** The Stripe-dashboard description for an UPSELL charge: `BE 03 · Protection Ritual`. */
export function backendUpsellDescriptor(
  key: BackendOfferKey,
  upsellName: string,
  isDownsell: boolean,
): string {
  const offer = BACKEND_OFFER_CATALOG[key];
  return `BE ${offer.number} · ${upsellName}${isDownsell ? ' (downsell)' : ''}`;
}

/**
 * Resolve the offer + build the upsell charge description in one call. Defaults to
 * twin-flame when the session metadata does not resolve, preserving the old
 * behaviour rather than failing a charge she is entitled to.
 */
export function upsellChargeFields(
  meta: { offer?: string | null; product?: string | null } | null | undefined,
  upsellName: string,
  isDownsell: boolean,
): { offer: BackendOfferKey; description: string } {
  const offer = resolveOfferKey(meta) ?? 'twin-flame';
  return { offer, description: backendUpsellDescriptor(offer, upsellName, isDownsell) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/lib/backendOffers.test.ts`
Expected: PASS (existing tests in the file still pass).

- [ ] **Step 5: Commit**

```bash
git add shared/backendOffers.ts server/lib/backendOffers.test.ts
git commit -m "feat(be): resolveOfferKey + per-offer upsell descriptor helpers"
```

---

### Task 3: `be_upsell_orders` recorder (pure mapping + DB write)

**Files:**
- Create: `server/lib/beUpsellOrders.ts`
- Test: `server/lib/beUpsellOrders.test.ts`

**Interfaces:**
- Consumes: `BACKEND_OFFER_CATALOG`, `isBackendOfferKey` (`@shared/backendOffers`); `backendUpsellFor` (`./backendCustomerList`); `beUpsellOrders`, `type InsertBeUpsellOrder` (`@shared/schema`); `db` (`./db`).
- Produces:
  - `type UpsellPILike = { id: string; amount?: number | null; amount_received?: number | null; currency?: string | null; metadata?: Record<string, string | undefined> | null }`
  - `upsellOrderValuesFromPI(pi: UpsellPILike): InsertBeUpsellOrder | null`
  - `recordBackendUpsellOrder(pi: UpsellPILike): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `server/lib/beUpsellOrders.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { upsellOrderValuesFromPI } from './beUpsellOrders';

const basePI = {
  id: 'pi_123',
  amount: 4700,
  amount_received: 4700,
  currency: 'usd',
};

describe('upsellOrderValuesFromPI', () => {
  it('maps a judgement-day Protection Ritual PI to insert values', () => {
    const v = upsellOrderValuesFromPI({
      ...basePI,
      metadata: {
        product: 'be_protection_ritual',
        offer: 'judgement-day',
        originalSession: 'cs_booking_1',
        flow: '1click',
        email: 'her@example.com',
        firstName: 'Sarah',
      },
    });
    expect(v).toEqual({
      stripePaymentIntentId: 'pi_123',
      bookingSessionId: 'cs_booking_1',
      offer: 'judgement-day',
      offerNumber: '03',
      product: 'be_protection_ritual',
      tier: 'full',
      amountCents: 4700,
      currency: 'usd',
      email: 'her@example.com',
      firstName: 'Sarah',
    });
  });

  it('reads tier=downsell from metadata.type and offerNumber 02 for twin-flame', () => {
    const v = upsellOrderValuesFromPI({
      ...basePI,
      amount: 3000,
      amount_received: 3000,
      metadata: {
        product: 'be_bracelet',
        offer: 'twin-flame',
        originalSession: 'cs_booking_2',
        type: 'downsell',
      },
    });
    expect(v?.offerNumber).toBe('02');
    expect(v?.tier).toBe('downsell');
    expect(v?.amountCents).toBe(3000);
    expect(v?.email).toBeNull();
  });

  it('returns null when the product is not a BE upsell', () => {
    expect(upsellOrderValuesFromPI({ ...basePI, metadata: { product: 'be_twin_flame', offer: 'twin-flame' } })).toBeNull();
    expect(upsellOrderValuesFromPI({ ...basePI, metadata: {} })).toBeNull();
  });

  it('returns null when the offer does not resolve (never misattribute)', () => {
    expect(upsellOrderValuesFromPI({ ...basePI, metadata: { product: 'be_protection_ritual', offer: 'bogus' } })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/lib/beUpsellOrders.test.ts`
Expected: FAIL — `./beUpsellOrders` does not exist.

- [ ] **Step 3: Write `server/lib/beUpsellOrders.ts`**

```ts
import { BACKEND_OFFER_CATALOG, isBackendOfferKey } from '@shared/backendOffers';
import { beUpsellOrders, type InsertBeUpsellOrder } from '@shared/schema';
import { backendUpsellFor } from './backendCustomerList';
import { db } from './db';
import logger from './logger';

// The shape we need off a Stripe PaymentIntent — narrowed so the mapping is a pure
// function testable with a plain object (no Stripe client).
export type UpsellPILike = {
  id: string;
  amount?: number | null;
  amount_received?: number | null;
  currency?: string | null;
  metadata?: Record<string, string | undefined> | null;
};

/**
 * Insert values for a backend upsell PI, or null when it is not an attributable
 * BE upsell (wrong product, or an offer we cannot resolve — better a missing row
 * than a mis-attributed one).
 */
export function upsellOrderValuesFromPI(pi: UpsellPILike): InsertBeUpsellOrder | null {
  const meta = pi.metadata ?? {};
  const listing = backendUpsellFor(meta.product);
  if (!listing) return null;
  if (!isBackendOfferKey(meta.offer)) return null;
  const offer = meta.offer;
  return {
    stripePaymentIntentId: pi.id,
    bookingSessionId: meta.originalSession ?? null,
    offer,
    offerNumber: BACKEND_OFFER_CATALOG[offer].number,
    product: listing.productKey,
    tier: meta.type === 'downsell' ? 'downsell' : 'full',
    amountCents: pi.amount_received ?? pi.amount ?? 0,
    currency: pi.currency ?? 'usd',
    email: meta.email ?? null,
    firstName: meta.firstName ?? null,
  };
}

/**
 * Record an upsell purchase. Idempotent on the PI id (Stripe retries the event),
 * non-blocking (the buyer has paid; a bookkeeping miss must not fail the webhook).
 */
export async function recordBackendUpsellOrder(pi: UpsellPILike): Promise<void> {
  const values = upsellOrderValuesFromPI(pi);
  if (!values) return;
  try {
    await db
      .insert(beUpsellOrders)
      .values(values)
      .onConflictDoNothing({ target: beUpsellOrders.stripePaymentIntentId });
  } catch (err) {
    logger.error('be_upsell_order: DB write failed (buyer paid; attribution lost)', {
      pi: pi.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/lib/beUpsellOrders.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/lib/beUpsellOrders.ts server/lib/beUpsellOrders.test.ts
git commit -m "feat(be): record backend upsell purchases per offer (be_upsell_orders)"
```

---

### Task 4: Per-offer upsell AWeber tags

**Files:**
- Modify: `server/lib/backendCustomerList.ts` (`BackendUpsellListing`, `BACKEND_UPSELLS`, `upsellPurchaseTags`)
- Modify: `server/lib/aweber.ts` (`addBackendUpsellCustomer` signature + call)
- Test: `server/lib/backendCustomerList.test.ts` (append)

**Interfaces:**
- Consumes: `BACKEND_OFFERS`, `BE_CUSTOMER_TAG`, `type BackendOfferKey` (already in `backendCustomerList.ts`).
- Produces (changed signatures):
  - `upsellPurchaseTags(offer: BackendOfferKey, productKey: string): string[]`
  - `BackendUpsellListing` gains `tagSuffix: string`
  - `addBackendUpsellCustomer(params: { email: string; firstName?: string; productKey: string; offer: BackendOfferKey }): Promise<{ success: boolean; error?: string }>`

- [ ] **Step 1: Write the failing test**

Append to `server/lib/backendCustomerList.test.ts`:

```ts
describe('per-offer upsell tags', () => {
  it('keeps 02 tags byte-identical', () => {
    expect(upsellPurchaseTags('twin-flame', 'be_protection_ritual'))
      .toEqual(['be-customer', 'be-02-twin-flame', 'be-02-upsell1-protection']);
    expect(upsellPurchaseTags('twin-flame', 'be_bracelet'))
      .toEqual(['be-customer', 'be-02-twin-flame', 'be-02-upsell2-bracelet']);
  });

  it('emits be-03 tags for a judgement-day upsell buyer', () => {
    expect(upsellPurchaseTags('judgement-day', 'be_protection_ritual'))
      .toEqual(['be-customer', 'be-03-judgement-day', 'be-03-upsell1-protection']);
    expect(upsellPurchaseTags('judgement-day', 'be_bracelet'))
      .toEqual(['be-customer', 'be-03-judgement-day', 'be-03-upsell2-bracelet']);
  });

  it('returns [] for an unknown product', () => {
    expect(upsellPurchaseTags('twin-flame', 'be_nope')).toEqual([]);
  });
});
```

Note: `upsellPurchaseTags` is already imported at the top of this test file. If not, add it to the existing import from `./backendCustomerList`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/lib/backendCustomerList.test.ts`
Expected: FAIL — `upsellPurchaseTags` currently takes one arg and returns the hardcoded `be-02` tag.

- [ ] **Step 3: Add `tagSuffix` and rewrite `upsellPurchaseTags`**

In `server/lib/backendCustomerList.ts`, add `tagSuffix` to the interface:

```ts
export interface BackendUpsellListing {
  /** The `be_` Stripe product key. ⛔ Never one of V1's keys. */
  productKey: string;
  name: string;
  listId: string;
  tag: string;
  /** The product half of the tag (`upsell1-protection`), joined to the offer's
   *  number to make a per-offer tag: `be-03-upsell1-protection`. */
  tagSuffix: string;
  /** Full price in cents. Same as V1's ($47 / $47). */
  priceCents: number;
  /** The downsell price in cents, where the offer has one (Bracelet: $30). */
  downsellCents?: number;
}
```

Add `tagSuffix` to both `BACKEND_UPSELLS` entries:

```ts
  be_protection_ritual: {
    productKey: 'be_protection_ritual',
    name: 'Protection Ritual',
    listId: '6972555',
    tag: 'be-02-upsell1-protection',
    tagSuffix: 'upsell1-protection',
    priceCents: 4700,
  },
  be_bracelet: {
    productKey: 'be_bracelet',
    name: 'Manifestation Bracelet',
    listId: '6972556',
    tag: 'be-02-upsell2-bracelet',
    tagSuffix: 'upsell2-bracelet',
    priceCents: 4700,
    downsellCents: 3000,
  },
```

Replace `upsellPurchaseTags`:

```ts
/** Tags for a BE upsell buyer: the shared tag, her ORIGINATING offer's tag, and the
 *  per-offer product tag (`be-03-upsell1-protection`). */
export function upsellPurchaseTags(offer: BackendOfferKey, productKey: string): string[] {
  const listing = BACKEND_UPSELLS[productKey];
  if (!listing) return [];
  const offerListing = BACKEND_OFFERS[offer];
  return [BE_CUSTOMER_TAG, offerListing.tag, `be-${offerListing.number}-${listing.tagSuffix}`];
}
```

- [ ] **Step 4: Update `addBackendUpsellCustomer` to take + pass the offer**

In `server/lib/aweber.ts`, change the signature and the `upsellPurchaseTags` call:

```ts
export async function addBackendUpsellCustomer(params: {
  email: string;
  firstName?: string;
  productKey: string;
  offer: BackendOfferKey;
}): Promise<{ success: boolean; error?: string }> {
  const listing = backendUpsellFor(params.productKey);
  if (!listing) {
    logger.error('AWeber BE upsell: unknown product, refusing to write', {
      product: params.productKey,
    });
    return { success: false, error: `unknown upsell product: ${params.productKey}` };
  }

  return writeBackendCustomer({
    label: `BE upsell (${listing.name})`,
    listId: listing.listId,
    email: params.email,
    name: params.firstName,
    customFields: {},
    tags: upsellPurchaseTags(params.offer, params.productKey),
  });
}
```

Ensure `BackendOfferKey` is imported in `aweber.ts` (it already imports from `./backendCustomerList`; add `type BackendOfferKey` to that import if absent).

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run server/lib/backendCustomerList.test.ts`
Expected: PASS. Then `npm run check` — the two webhook call sites of `addBackendUpsellCustomer` now fail typecheck (missing `offer`). That is expected; Task 5 fixes them. If you want a green typecheck at this commit, do Step 6 then proceed straight to Task 5 (they are one logical change; committing between is fine because tests pass and the type errors are only in the not-yet-touched webhook).

- [ ] **Step 6: Commit**

```bash
git add server/lib/backendCustomerList.ts server/lib/aweber.ts server/lib/backendCustomerList.test.ts
git commit -m "feat(be): per-offer upsell tags; addBackendUpsellCustomer takes the offer"
```

---

### Task 5: Wire dynamic offer into the charge + record/tag in the webhook

**Files:**
- Modify: `server/routes/backendOffers.ts` (the `POST /upsell/charge` handler, ~lines 230–252)
- Modify: `server/routes/webhooks.ts` (the `payment_intent.succeeded` BE upsell branch ~1225–1241, and the `checkout.session.completed` BE upsell branch ~1033–1046)
- Test: covered by Tasks 2–4 unit tests + the data smoke in Task 6.

**Interfaces:**
- Consumes: `upsellChargeFields`, `resolveOfferKey` (`@shared/backendOffers`); `recordBackendUpsellOrder` (`../lib/beUpsellOrders`); `addBackendUpsellCustomer` (already imported in webhooks).

- [ ] **Step 1: Charge — resolve the offer instead of hardcoding**

In `server/routes/backendOffers.ts`, import the helper at the top (alongside the existing `@shared/backendOffers` import):

```ts
import { upsellChargeFields } from '@shared/backendOffers';
```

Immediately before the `const charge = await stripe.paymentIntents.create({` call, add:

```ts
    // Attribute the upsell to the offer she actually booked (from the booking
    // session), not a hardcoded '02'. Defaults to twin-flame if unresolved.
    const { offer: chargeOffer, description: chargeDescription } = upsellChargeFields(
      session.metadata,
      upsell.name,
      isDownsell,
    );
```

Then in the `paymentIntents.create` call, replace the hardcoded `description` and `offer`:

```ts
      description: chargeDescription,
```
```ts
        offer: chargeOffer,
```

(Leave every other metadata field — `product`, `originalSession`, `flow`, `type`, `email`, `firstName` — exactly as is.)

- [ ] **Step 2: Verify the charge still typechecks + unit tests green**

Run: `npm run check` (the charge file now has no type error) and `npx vitest run server/lib/backendOffers.test.ts`
Expected: typecheck clean for `backendOffers.ts`; tests PASS.

- [ ] **Step 3: Webhook — record + per-offer tag on the 1-click path**

In `server/routes/webhooks.ts`, add imports near the other backend imports:

```ts
import { recordBackendUpsellOrder } from '../lib/beUpsellOrders';
import { resolveOfferKey } from '@shared/backendOffers';
```

Replace the `payment_intent.succeeded` BE upsell branch (~1225–1241) with:

```ts
    // Backend upsell (1-click): record the sale (per offer) and put her on the
    // upsell's own list with her originating offer's tag. The tracking above
    // no-opped (a `be_` product is unknown to those mappers), and V1's own upsell
    // products never match backendUpsellFor — so V1's flow is untouched.
    const beUpsell = backendUpsellFor(metadata.product);
    if (beUpsell) {
      await recordBackendUpsellOrder(pi); // idempotent, self-logging, never throws
      if (metadata.email) {
        const offer = resolveOfferKey(metadata) ?? 'twin-flame';
        await addBackendUpsellCustomer({
          email: metadata.email,
          firstName: metadata.firstName,
          productKey: beUpsell.productKey,
          offer,
        }).catch((err) =>
          logger.error('BE upsell list write FAILED — buyer paid, may miss her email', {
            pi: pi.id,
            product: metadata.product,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    }
```

- [ ] **Step 4: Webhook — pass the offer on the hosted-checkout fallback**

In the `checkout.session.completed` BE branch (~1033–1046), inside `if (beUpsell) { ... }`, update the `addBackendUpsellCustomer` call to pass the offer:

```ts
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
```

(DB recording for the hosted-checkout fallback is intentionally NOT added here — the 1-click path is the live path, and the hosted fallback (A7) is not built. The 1-click `payment_intent.succeeded` recording above is authoritative and idempotent.)

- [ ] **Step 5: Typecheck the whole change**

Run: `npm run check`
Expected: no NEW errors (pre-existing baseline errors unrelated to backend upsells may remain — compare against `git stash` baseline if unsure).

- [ ] **Step 6: Run the full backend test set (no regressions)**

Run: `npx vitest run server/lib/backendCustomerList.test.ts server/lib/backendOffers.test.ts server/lib/beUpsellOrders.test.ts shared/beUpsellOrders.schema.test.ts`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add server/routes/backendOffers.ts server/routes/webhooks.ts
git commit -m "feat(be): stamp the real offer on upsell charges; record + tag per offer in the webhook"
```

---

### Task 6: Per-offer stats query + dev data smoke

**Files:**
- Create: `server/scripts/be-upsell-stats.ts`

**Interfaces:**
- Consumes: `pool` (`../lib/db`).

- [ ] **Step 1: Write the stats script**

Create `server/scripts/be-upsell-stats.ts`:

```ts
// Per-offer backend stats: initial purchases (be_orders) + U1/U2 (be_upsell_orders).
//   RUN: DOTENV_CONFIG_PATH=<env> npx tsx server/scripts/be-upsell-stats.ts
import 'dotenv/config';
import { pool } from '../lib/db';

async function main() {
  const sql = `
    SELECT
      COALESCE(i.offer, u.offer)                              AS offer,
      COALESCE(i.initial, 0)                                  AS initial,
      COALESCE(u.u1, 0)                                       AS upsell1,
      COALESCE(u.u2, 0)                                       AS upsell2,
      COALESCE(u.upsell_cents, 0)                             AS upsell_cents
    FROM (
      SELECT offer, COUNT(*)::int AS initial
      FROM be_orders WHERE status = 'paid' GROUP BY offer
    ) i
    FULL JOIN (
      SELECT offer,
             COUNT(*) FILTER (WHERE product = 'be_protection_ritual')::int AS u1,
             COUNT(*) FILTER (WHERE product = 'be_bracelet')::int          AS u2,
             SUM(amount_cents)::int                                        AS upsell_cents
      FROM be_upsell_orders GROUP BY offer
    ) u ON u.offer = i.offer
    ORDER BY offer;`;
  const { rows } = await pool.query(sql);
  console.table(rows);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run it against dev (empty is fine)**

Run: `npx tsx server/scripts/be-upsell-stats.ts`
Expected: prints a table (possibly empty on dev) without error — proves the query + both tables exist.

- [ ] **Step 3: Data smoke (manual, dev, Stripe TEST) — record in the plan checklist, run when the dev funnel is available**

With `BACKEND_CHECKOUT_LIVE=true` on dev and Stripe TEST keys, complete a twin-flame booking + an upsell, then re-run the stats script. Expected: `be_upsell_orders` has a row with `offer='twin-flame'`, `product='be_protection_ritual'`, and the AWeber tag applied was `be-02-upsell1-protection` (unchanged for 02). This confirms no 02 regression; 03 attribution is exercised in Plan 2 once 03's booking reaches the shared upsell.

- [ ] **Step 4: Commit**

```bash
git add server/scripts/be-upsell-stats.ts
git commit -m "feat(be): per-offer upsell stats query script"
```

---

## Self-Review

**Spec coverage (server/data half):**
- §4 "kill the hardcode" → Task 2 (helpers) + Task 5 Step 1 (charge). ✅
- §5 DB recording (`be_upsell_orders`) → Task 1 (table) + Task 3 (recorder) + Task 5 Step 3 (webhook). ✅
- §5 AWeber per-offer tags → Task 4. ✅
- §5 reporting query → Task 6. ✅
- Migration on dev AND prod → Task 1 Steps 5–6 (SQL file + db:push). ✅ (prod run is an operator step at go-live, flagged in the spec's Dependencies.)

**Placeholder scan:** none — every step has concrete code or an exact command.

**Type consistency:** `upsellPurchaseTags(offer, productKey)` used consistently in Task 4 (definition + aweber call) and Task 5 (webhook path via `addBackendUpsellCustomer`). `recordBackendUpsellOrder(pi)` / `upsellOrderValuesFromPI(pi)` names match across Tasks 3 and 5. `upsellChargeFields` / `resolveOfferKey` names match across Tasks 2 and 5. `UpsellPILike` fields (`amount_received`, `amount`, `metadata`) match what `pi` provides in the webhook.

**Out of scope (Plan 2):** the `/offers/upsell/*` pages, the offer-keyed pitch registry + `judgementUpsellCopy`, and 03's `/offers/wiccan/judgement-day` URL move.
