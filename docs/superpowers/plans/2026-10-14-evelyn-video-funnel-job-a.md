# Evelyn Video Funnel (Job A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Facebook-ad video funnel where a viewer watches two Evelyn videos, taps one of three stones inside the welcome video, watches the pitch, and buys a **$19 Soulmate Initials Reading** (+ optional **$11.11** "charge my stone" add-on), then flows through the existing backend upsells to a thank-you page.

**Architecture:** Three new mobile-first client pages (`/evelyn/reading`, `/evelyn/checkout`, `/evelyn/thank-you`) plus one new catalog row in the existing backend-offer system. Checkout, order recording, the shared `/offers/upsell/welcome1|2` pages, the Stripe webhook, and the `GET /api/be/:offer/fulfilment/:sessionId` endpoint are **reused**, not rebuilt — this plan adds a new offer to those systems and wires its tracking. Product *delivery* (writing + emailing the reading) is out of scope here; it is Job B (n8n).

**Tech Stack:** React 18 + Vite + wouter (client), Tailwind v4, Express + Drizzle ORM + Supabase/Postgres (server), Stripe Checkout (test mode locally), Meta Pixel + Conversions API, PostHog. Tests: Vitest (unit) + Playwright (e2e).

**Spec:** `docs/superpowers/specs/2026-10-12-evelyn-video-funnel-design.md` (Job A). Start context: `HANDOFF-evelyn-video-funnel.md` (repo root). Job B: `docs/superpowers/specs/2026-10-12-evelyn-soulmate-initials-n8n-delivery-design.md`.

## Global Constraints

Copied verbatim from the spec/hand-off. Every task's requirements implicitly include these.

- **Never touch the live V1 `/welcome1` or `/welcome2`.** This funnel's upsells are the backend pages `/offers/upsell/welcome1|2` (session-resolved, no V1 tracking).
- **`readyForMoney` gate stays `false`** for `soulmate-initials` until the operator says go. Local checkout works only via the test-mode bypass: `BACKEND_CHECKOUT_TEST_MODE=true` **and** a `sk_test_` Stripe key (`server/routes/backendOffers.ts:156-160, 766-769`).
- **Birth date and first name never go into Stripe `metadata`** (spec §5). Stripe metadata carries only non-personal keys: `product`, `offer`, `funnel: evelyn_vsl`, `stone`, `bump`, UTMs, posthog id.
- **Meta Purchase events go only to this funnel's products.** `be_` products stay walled off from pixel Purchase except `be_soulmate_initials`, its bump, and U1/U2 **when `metadata.funnel = evelyn_vsl`**.
- **No countdown timer, no pre-ticked boxes, no subscription, no reviews** until real ones exist.
- **Copy rule:** say "cards", never "tarot", in buyer-facing funnel copy.
- **One delivery promise constant** `DELIVERY_PROMISE = "by email within 24 hours"` — used identically on checkout FAQ and thank-you.
- **Stripe product ids are immutable and n8n exact-matches them:** `be_soulmate_initials` (reading), `be_soulmate_initials_charge` (bump). Add keys; never rename.
- **Video asset keys on S3 are immutable.** `EVELYN_VSL_ASSET_BASE = https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/vsl/v1` until CloudFront exists. A new cut goes to a new prefix (`v2/`), never over these.
- **Every new test case is also added to `docs/test-ideas.md`** (project rule, `CLAUDE.md`).
- **Local only:** local Postgres via `DATABASE_URL`, Stripe test mode, no CloudFront/n8n/real-DB/real-pixel writes. Pixel + PostHog may run against test keys or no-op.

## Review Focus

Inputs/failure modes the spec implies but that no single task's happy-path test exercises. Each has a test pinned to the owning task.

- **Autoplay blocked on the welcome video** (iOS low-power / data-saver): the player must fall back to poster + big ▶, not a dead black box. → Task 7.
- **Buyer reloads mid-pitch or returns next day on the same device:** stone + CTA-shown + resume position must survive via `localStorage`; she must not be forced back through the welcome video. → Task 7 / Task 8.
- **Stripe Checkout Session created but the intake DB write fails** (`saveOrderIntake` returns false): she must still reach payment; the order simply arrives without stone/DOB (fulfilment 409 later). Checkout must not 500. → Task 5.
- **Under-18 or malformed birth date in the pop-up:** inline rejection, pop-up stays open, no checkout call fires. → Task 9.
- **`stone` query param missing/garbage at `/evelyn/checkout`** (direct link, truncated URL): fall back to `localStorage`, then to the neutral word "your stone"; never render `undefined` or crash. → Task 9.

---

## File Structure

**New files**
- `shared/evelynVsl.ts` — funnel constants: `EVELYN_VSL_ASSET_BASE`, `DELIVERY_PROMISE`, the stone map (`rose-quartz|jade|garnet` → display label), tap-zone rectangles, key timestamps (48.6s, 368.2s). Pure data; imported by client + tests.
- `client/src/lib/upsellCopy/soulmateInitials.ts` — `SOULMATE_INITIALS_UPSELL1` / `_UPSELL2`, modelled on `heartCleanser.ts`.
- `client/src/components/evelyn/VslVideoPlayer.tsx` — the custom `<video>` player (muted autoplay, sound badge, tap zones, progress line, failure fallback).
- `client/src/pages/evelyn/ReadingPage.tsx` — `/evelyn/reading` (two videos, stone pick, CTA).
- `client/src/pages/evelyn/CheckoutPage.tsx` — `/evelyn/checkout` (sales page + intake pop-up).
- `client/src/pages/evelyn/ThankYouPage.tsx` — `/evelyn/thank-you`.
- Test files colocated / under `tests/` as named per task.

**Modified files**
- `shared/backendOffers.ts` — extend `BackendOfferKey` + `number` union; add price/bump constants; add `soulmate-initials` catalog row; add `piiOutOfStripe?: boolean` to the `BackendOffer` interface.
- `shared/schema.ts` — add `stone`, `firstName`, `email` columns to `be_order_intake` (`dateOfBirth` already exists).
- `client/src/lib/backendCheckout.ts` — extend `BackendCheckoutRequest` with optional `dateOfBirth`, `stone`, `email`.
- `server/routes/backendOffers.ts` — accept + validate the new intake fields; honour `piiOutOfStripe` (omit `firstName` from Stripe metadata, add `funnel`/`stone` keys, persist PII to intake only).
- `server/lib/beOrders.ts` — widen the `saveOrderIntake` conflict-update `set` to include `stone`, `firstName`, `email`.
- `server/routes/beFulfilment.ts` — allow `soulmate-initials`; include `stone` + intake PII in the response.
- `client/src/lib/backendOffers.ts` — register `soulmate-initials` in `BACKEND_UPSELL_PITCH`.
- `shared/fbPixelConfig.ts` — add an `evelyn` pixel entry (routes `['/evelyn']`).
- `client/src/lib/funnel.ts` — flesh out `getPostHogStep()` for the evelyn paths.
- `client/src/lib/facebook.ts` — add a `trackViewContent` helper; gate the main Purchase browser fire.
- `client/src/App.tsx` — lazy-import + register the three routes.
- `client/src/pages/Refund.tsx` (or the refund route component) — add the 60-day money-back rule for this product.
- `docs/test-ideas.md` — append every test case added here.

---

## Task 1: Catalog row for `soulmate-initials`

**Files:**
- Modify: `shared/backendOffers.ts` (key union ~32-38; number union; constants ~47-143; `BackendOffer` interface ~192-271; catalog ~285+)
- Test: `server/routes/backendOffers.soulmateInitials.test.ts` (new)

**Interfaces:**
- Produces: catalog entry `BACKEND_OFFER_CATALOG['soulmate-initials']` with `pricing: { model: 'fixed', priceCents: 1900 }`, `bump: { productKey: 'be_soulmate_initials_charge', cents: 1111, stripeName: '+ Charge my stone under tonight\'s moon' }`, `stripeProduct: 'be_soulmate_initials'`, `upsellEntryPath: '/offers/upsell/welcome1'`, `successPath: '/evelyn/thank-you'`, `readyForMoney: false`, `piiOutOfStripe: true`, `number: '10'`. `resolveBackendCharge({ offer: 'soulmate-initials', bump: true })` → `readingCents: 1900`, `bumpCents: 1111`, `totalCents: 3011`.

- [ ] **Step 1: Write the failing test**

```ts
// server/routes/backendOffers.soulmateInitials.test.ts
import { describe, it, expect } from 'vitest';
import { BACKEND_OFFER_CATALOG, resolveBackendCharge } from '../../shared/backendOffers';

describe('soulmate-initials catalog row', () => {
  const offer = BACKEND_OFFER_CATALOG['soulmate-initials'];

  it('is a $19 fixed-price offer with an $11.11 stone-charge bump', () => {
    expect(offer).toBeDefined();
    expect(offer.pricing).toEqual({ model: 'fixed', priceCents: 1900 });
    expect(offer.stripeProduct).toBe('be_soulmate_initials');
    expect(offer.bump?.productKey).toBe('be_soulmate_initials_charge');
    expect(offer.bump?.cents).toBe(1111);
  });

  it('keeps PII out of Stripe and routes into the shared upsell chain', () => {
    expect(offer.piiOutOfStripe).toBe(true);
    expect(offer.upsellEntryPath).toBe('/offers/upsell/welcome1');
    expect(offer.successPath).toBe('/evelyn/thank-you');
  });

  it('is gated off until the operator flips it, and resolves $19 + $11.11', () => {
    expect(offer.readyForMoney).toBe(false);
    const charge = resolveBackendCharge({ offer: 'soulmate-initials', bump: true } as any);
    // not_ready is enforced at the checkout layer, not here; the math must still be right
    if (charge.ok) {
      expect(charge.readingCents).toBe(1900);
      expect(charge.bumpCents).toBe(1111);
      expect(charge.totalCents).toBe(3011);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/routes/backendOffers.soulmateInitials.test.ts`
Expected: FAIL — `offer` is `undefined` (key not in catalog) and `piiOutOfStripe` not on the interface.

- [ ] **Step 3: Implement**

In `shared/backendOffers.ts`:
1. Add `| 'soulmate-initials'` to the `BackendOfferKey` union (~line 32-38).
2. Add `| '10'` to the `number` union on the `BackendOffer` interface.
3. Add `piiOutOfStripe?: boolean;` to the `BackendOffer` interface with a doc comment: `/** When true, firstName/DOB are persisted to intake only and kept OUT of Stripe metadata (spec §5). */`
4. Add constants near the other offer constants:
```ts
export const SOULMATE_INITIALS_PRICE_CENTS = 1900;
export const SOULMATE_INITIALS_BUMP_CENTS = 1111;
export const SOULMATE_INITIALS_BUMP_PRODUCT_KEY = 'be_soulmate_initials_charge';
```
5. Add the catalog row (follow the `heart-cleanser` row shape at ~488-521, but no shipping at the front end):
```ts
'soulmate-initials': {
  key: 'soulmate-initials',
  number: '10',
  stripeName: 'Soulmate Initials Reading',
  stripeDescription: "Your soulmate's initials, written for you and sent by email within 24 hours.",
  stripeProduct: 'be_soulmate_initials',
  pricing: { model: 'fixed', priceCents: SOULMATE_INITIALS_PRICE_CENTS },
  bump: {
    productKey: SOULMATE_INITIALS_BUMP_PRODUCT_KEY,
    cents: SOULMATE_INITIALS_BUMP_CENTS,
    stripeName: '+ Charge my stone under tonight\'s moon',
  },
  bookingPath: { page: '/evelyn/checkout', chat: '/evelyn/checkout' },
  successPath: '/evelyn/thank-you',
  upsellEntryPath: '/offers/upsell/welcome1',
  readyForMoney: false,
  piiOutOfStripe: true,
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/routes/backendOffers.soulmateInitials.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/backendOffers.ts server/routes/backendOffers.soulmateInitials.test.ts
git commit -m "feat(evelyn-vsl): add soulmate-initials backend catalog row (\$19 + \$11.11 bump)"
```

---

## Task 2: Funnel constants module (`shared/evelynVsl.ts`)

**Files:**
- Create: `shared/evelynVsl.ts`
- Test: `shared/evelynVsl.test.ts`

**Interfaces:**
- Produces: `EVELYN_VSL_ASSET_BASE: string`; `DELIVERY_PROMISE = 'by email within 24 hours'`; `STONES` = `[{ key:'rose-quartz', label:'Rose Quartz' }, { key:'jade', label:'Jade' }, { key:'garnet', label:'Garnet' }]`; `isStone(x): x is StoneKey`; `stoneLabel(key): string` (unknown → `'your stone'`); `WELCOME_STONES_LIVE_AT = 48.6`; `PITCH_CTA_AT = 368.2`; `TAP_ZONES: Record<StoneKey, { x0:number; x1:number; y0:number; y1:number }>` (fractions 0-1, from spec §3); `VIDEO = { welcome: { src, poster }, pitch: { src, poster } }` built from `EVELYN_VSL_ASSET_BASE`.

- [ ] **Step 1: Write the failing test**

```ts
// shared/evelynVsl.test.ts
import { describe, it, expect } from 'vitest';
import { STONES, isStone, stoneLabel, TAP_ZONES, WELCOME_STONES_LIVE_AT, PITCH_CTA_AT, VIDEO, EVELYN_VSL_ASSET_BASE } from './evelynVsl';

describe('evelyn vsl constants', () => {
  it('has exactly the three stones in deck order', () => {
    expect(STONES.map(s => s.key)).toEqual(['rose-quartz', 'jade', 'garnet']);
    expect(stoneLabel('jade')).toBe('Jade');
  });
  it('falls back to "your stone" for anything unknown', () => {
    expect(isStone('amethyst')).toBe(false);
    expect(stoneLabel('amethyst' as any)).toBe('your stone');
    expect(stoneLabel(undefined as any)).toBe('your stone');
  });
  it('pins the key moments and tap zones from the spec', () => {
    expect(WELCOME_STONES_LIVE_AT).toBeCloseTo(48.6);
    expect(PITCH_CTA_AT).toBeCloseTo(368.2);
    expect(TAP_ZONES['rose-quartz']).toMatchObject({ x0: 0.043, x1: 0.333, y0: 0.76, y1: 0.925 });
    expect(TAP_ZONES['garnet'].x1).toBeCloseTo(0.972);
  });
  it('builds video URLs under the immutable v1 prefix', () => {
    expect(EVELYN_VSL_ASSET_BASE).toContain('/evelyn/vsl/v1');
    expect(VIDEO.welcome.src).toBe(`${EVELYN_VSL_ASSET_BASE}/evelyn-welcome-v2-720p.mp4`);
    expect(VIDEO.pitch.poster).toBe(`${EVELYN_VSL_ASSET_BASE}/evelyn-pitch-v2-720p-poster.jpg`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run shared/evelynVsl.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `shared/evelynVsl.ts`

```ts
export const EVELYN_VSL_ASSET_BASE =
  'https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/vsl/v1';
export const DELIVERY_PROMISE = 'by email within 24 hours';

export const STONES = [
  { key: 'rose-quartz', label: 'Rose Quartz' },
  { key: 'jade', label: 'Jade' },
  { key: 'garnet', label: 'Garnet' },
] as const;
export type StoneKey = (typeof STONES)[number]['key'];

export function isStone(x: unknown): x is StoneKey {
  return typeof x === 'string' && STONES.some(s => s.key === x);
}
export function stoneLabel(key: unknown): string {
  const s = STONES.find(s => s.key === key);
  return s ? s.label : 'your stone';
}

export const WELCOME_STONES_LIVE_AT = 48.6; // seconds — "these three stones have been waiting for you"
export const PITCH_CTA_AT = 368.2;          // seconds — she says "$19"; CTA slides in

// Fractions of the 9:16 video box, measured from scene_03-tap-zones-source.jpg (spec §3).
export const TAP_ZONES: Record<StoneKey, { x0: number; x1: number; y0: number; y1: number }> = {
  'rose-quartz': { x0: 0.043, x1: 0.333, y0: 0.76, y1: 0.925 },
  jade:          { x0: 0.374, x1: 0.637, y0: 0.76, y1: 0.925 },
  garnet:        { x0: 0.689, x1: 0.972, y0: 0.76, y1: 0.925 },
};

export const VIDEO = {
  welcome: {
    src: `${EVELYN_VSL_ASSET_BASE}/evelyn-welcome-v2-720p.mp4`,
    poster: `${EVELYN_VSL_ASSET_BASE}/evelyn-welcome-v2-720p-poster.jpg`,
  },
  pitch: {
    src: `${EVELYN_VSL_ASSET_BASE}/evelyn-pitch-v2-720p.mp4`,
    poster: `${EVELYN_VSL_ASSET_BASE}/evelyn-pitch-v2-720p-poster.jpg`,
  },
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run shared/evelynVsl.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/evelynVsl.ts shared/evelynVsl.test.ts
git commit -m "feat(evelyn-vsl): funnel constants (asset base, stones, tap zones, key moments)"
```

---

## Task 3: Intake schema — add `stone`, `firstName`, `email` to `be_order_intake`

**Files:**
- Modify: `shared/schema.ts` (`beOrderIntake` table ~2005-2040)
- Modify: `server/lib/beOrders.ts` (`saveOrderIntake` conflict `set` ~95-111)
- Test: `server/lib/beOrders.soulmateInitials.test.ts` (new) — follow the mocking style of `server/lib/beOrders.test.ts`

**Interfaces:**
- Produces: `beOrderIntake.stone: text`, `.firstName: text`, `.email: text` (all nullable); `InsertBeOrderIntake` widens accordingly. `saveOrderIntake` persists these and refreshes them on a retried same-session POST.

- [ ] **Step 1: Write the failing test**

```ts
// server/lib/beOrders.soulmateInitials.test.ts  (mirror beOrders.test.ts harness)
// Asserts saveOrderIntake accepts { stripeSessionId, offer:'soulmate-initials',
// stone:'jade', dateOfBirth:'1990-05-15', firstName:'Sarah', email:'s@x.com' }
// and that a retry with a different stone overwrites it (onConflictDoUpdate set includes stone).
```
Write the concrete body against the same `db` mock `beOrders.test.ts` uses (import map at its top). Assert the insert `values` carry `stone`/`firstName`/`email` and the `onConflictDoUpdate.set` includes `stone`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/lib/beOrders.soulmateInitials.test.ts`
Expected: FAIL — `stone` not a column / not in the `set`.

- [ ] **Step 3: Implement**

In `shared/schema.ts` `beOrderIntake` table, add after the 08 fields:
```ts
// Evelyn VSL (soulmate-initials): written by POST /checkout before Stripe. Kept out of
// Stripe metadata (spec §5); fulfilment (Job B) reads them from here.
stone: text("stone"),
firstName: text("first_name"),
email: text("email"),
```
In `server/lib/beOrders.ts` `saveOrderIntake` `onConflictDoUpdate.set`, add:
```ts
stone: intake.stone ?? null,
firstName: intake.firstName ?? null,
email: intake.email ?? null,
```
Then push the schema to local Postgres: `npm run db:push`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/lib/beOrders.soulmateInitials.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/schema.ts server/lib/beOrders.ts server/lib/beOrders.soulmateInitials.test.ts
git commit -m "feat(evelyn-vsl): intake columns for stone + firstName + email (PII out of Stripe)"
```

---

## Task 4: Extend the checkout request contract (`BackendCheckoutRequest`)

**Files:**
- Modify: `client/src/lib/backendCheckout.ts` (interface ~36-47; body it posts ~82-100)
- Test: `client/src/lib/backendCheckout.soulmateInitials.test.ts` (new)

**Interfaces:**
- Produces: `BackendCheckoutRequest` gains `dateOfBirth?: string | null` (ISO `YYYY-MM-DD`), `stone?: string | null`, `email?: string | null`. `beginBackendCheckout` includes them in the POST body when present.

- [ ] **Step 1: Write the failing test**

```ts
// client/src/lib/backendCheckout.soulmateInitials.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('beginBackendCheckout carries evelyn-vsl intake', () => {
  beforeEach(() => { vi.stubEnv('VITE_BACKEND_CHECKOUT_LIVE', 'true'); });

  it('posts stone, dateOfBirth and email in the body', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ url: 'https://stripe.test/cs' }) }));
    vi.stubGlobal('fetch', fetchMock);
    // jsdom: stub window.location.href assignment
    const { beginBackendCheckout } = await import('./backendCheckout');
    await beginBackendCheckout({
      offer: 'soulmate-initials', treatment: 'page', bump: true,
      firstName: 'Sarah', email: 's@x.com', dateOfBirth: '1990-05-15', stone: 'jade',
    } as any);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ offer: 'soulmate-initials', bump: true, stone: 'jade', dateOfBirth: '1990-05-15', email: 's@x.com' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run client/src/lib/backendCheckout.soulmateInitials.test.ts`
Expected: FAIL — `stone`/`dateOfBirth` not in the posted body.

- [ ] **Step 3: Implement**

Add to `BackendCheckoutRequest`:
```ts
/** Evelyn VSL: stored in intake, kept OUT of Stripe metadata (spec §5). */
dateOfBirth?: string | null;
stone?: string | null;
email?: string | null;
```
In the POST body `beginBackendCheckout` builds, spread these through when defined (match the existing `...(firstName ? { firstName } : {})` style):
```ts
...(req.dateOfBirth ? { dateOfBirth: req.dateOfBirth } : {}),
...(req.stone ? { stone: req.stone } : {}),
...(req.email ? { email: req.email } : {}),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run client/src/lib/backendCheckout.soulmateInitials.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/backendCheckout.ts client/src/lib/backendCheckout.soulmateInitials.test.ts
git commit -m "feat(evelyn-vsl): carry stone/DOB/email through beginBackendCheckout"
```

---

## Task 5: Server — validate intake, honour `piiOutOfStripe`, write intake

**Files:**
- Modify: `server/routes/backendOffers.ts` (checkout handler ~683-984: request parse, metadata build ~884-918, `saveOrderIntake` call ~947-965)
- Test: `server/routes/backendOffers.soulmateIntake.test.ts` (new) — follow `backendOffers.order.test.ts` mocking (it already mocks `saveOrderIntake`).

**Interfaces:**
- Consumes: `BACKEND_OFFER_CATALOG['soulmate-initials']` (Task 1), `saveOrderIntake` (Task 3).
- Produces: for `piiOutOfStripe` offers, Stripe session `metadata` gets `funnel: 'evelyn_vsl'`, `stone`, and does **not** get `firstName`; `saveOrderIntake` is called with `{ stripeSessionId, offer, stone, dateOfBirth, firstName, email }`. Invalid DOB (`<18` / unparseable) or bad `stone` → `400` before any Stripe call. Intake write failure is non-fatal (checkout still returns the Stripe url).

- [ ] **Step 1: Write the failing tests**

Add tests asserting:
1. A `soulmate-initials` checkout with `stone:'jade'`, `dateOfBirth:'1990-05-15'`, `firstName:'Sarah'` creates a Stripe session whose `metadata` contains `funnel:'evelyn_vsl'` and `stone:'jade'` and **no** `firstName` key, and whose `payment_intent_data.metadata` omits PII.
2. `saveOrderIntake` is called once with `{ offer:'soulmate-initials', stone:'jade', dateOfBirth:'1990-05-15', firstName:'Sarah', email:… }`.
3. `dateOfBirth` of a 17-year-old → `400`, Stripe `checkout.sessions.create` **not** called.
4. `stone:'amethyst'` → `400`.
5. `saveOrderIntake` mocked to return `false` → response still `200` with a `url` (non-fatal).

Use the existing Stripe mock in `backendOffers.order.test.ts` as the template.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run server/routes/backendOffers.soulmateIntake.test.ts`
Expected: FAIL — `funnel`/`stone` absent, `firstName` still present, no DOB validation.

- [ ] **Step 3: Implement**

In the checkout handler:
1. Parse the new fields from `req.body`: `dateOfBirth`, `stone`, `email`.
2. Add a validation helper (reuse `isStone` from `shared/evelynVsl.ts`; write an `isAdultISODate(dob)` that parses `YYYY-MM-DD`, rejects NaN, requires age ≥ 18). If the offer `piiOutOfStripe` and either check fails → `return res.status(400).json({ error: 'invalid_intake' })` before creating the session.
3. When building `metadata`, branch on `offer.piiOutOfStripe`:
   - if true: add `funnel: 'evelyn_vsl'` and `stone`, and **do not** spread `firstName`;
   - else: keep the current behaviour.
4. After the session is created, call `saveOrderIntake` with the extra fields for this offer:
```ts
await saveOrderIntake({
  stripeSessionId: session.id,
  offer: offer.key,
  stone: stone ?? null,
  dateOfBirth: dateOfBirth ?? null,
  firstName: firstName ?? null,
  email: email ?? null,
});
```
(keep the existing non-fatal `.catch`/return-false handling).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run server/routes/backendOffers.soulmateIntake.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/routes/backendOffers.ts server/routes/backendOffers.soulmateIntake.test.ts
git commit -m "feat(evelyn-vsl): validate DOB/stone, keep PII out of Stripe, write intake"
```

---

## Task 6: Fulfilment endpoint exposes stone + intake PII

**Files:**
- Modify: `server/routes/beFulfilment.ts` (offer allowlist ~164-167; response build ~237-290)
- Test: `server/routes/beFulfilment.soulmateInitials.test.ts` (new) — mirror `beFulfilment.test.ts`

**Interfaces:**
- Consumes: `be_orders` row + `be_order_intake` row for a `soulmate-initials` session.
- Produces: `GET /api/be/soulmate-initials/fulfilment/:sessionId` returns `200` with `offer:'soulmate-initials'`, `order.stone`, and `intake: { stone, dateOfBirth, firstName, email }`; unknown session → `404`; non-`cs_` id → `400`.

- [ ] **Step 1: Write the failing test**

Assert the route accepts `soulmate-initials`, and that for a seeded order+intake the JSON includes `stone` and the intake PII block. (Seed via the same DB mock the sibling test uses.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/routes/beFulfilment.soulmateInitials.test.ts`
Expected: FAIL — offer rejected by the allowlist / `stone` absent from the response.

- [ ] **Step 3: Implement**

Ensure `soulmate-initials` passes the `:offer` validation (it is already in `BACKEND_OFFER_CATALOG` after Task 1 — confirm the validation reads the catalog keys, not a hardcoded list; if hardcoded, add the key). In the response builder, include `stone` from the order/intake and add the intake fields `{ stone, dateOfBirth, firstName, email }` to the `intake` object (mirroring how the 08 branch adds `fullBirthName`/`dateOfBirth`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/routes/beFulfilment.soulmateInitials.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/routes/beFulfilment.ts server/routes/beFulfilment.soulmateInitials.test.ts
git commit -m "feat(evelyn-vsl): fulfilment endpoint returns stone + intake for Job B"
```

---

## Task 7: Video player component (`VslVideoPlayer`)

**Files:**
- Create: `client/src/components/evelyn/VslVideoPlayer.tsx`
- Create: `client/src/components/evelyn/vslPlayerLogic.ts` (pure helpers, unit-tested)
- Test: `client/src/components/evelyn/vslPlayerLogic.test.ts`

**Interfaces:**
- Produces, from `vslPlayerLogic.ts`:
  - `zonesActive(currentTime: number): boolean` → `currentTime >= WELCOME_STONES_LIVE_AT`.
  - `stoneAtPoint(xFrac: number, yFrac: number): StoneKey | null` → which tap zone a normalized click falls in (null if none).
  - `ctaVisible(currentTime: number, everShown: boolean): boolean` → `everShown || currentTime >= PITCH_CTA_AT`.
  - `progressPct(currentTime, duration): number` (0-100, clamped).
- `VslVideoPlayer` props: `{ kind: 'welcome' | 'pitch'; onStonePick?(stone, via:'video'|'button'): void; onCtaShown?(): void; onProgress?(pct:25|50|75|100): void; onSoundOn?(): void; resumeAt?: number }`.

- [ ] **Step 1: Write the failing test** (pure logic only — the DOM player is covered by Playwright in Task 12)

```ts
// client/src/components/evelyn/vslPlayerLogic.test.ts
import { describe, it, expect } from 'vitest';
import { zonesActive, stoneAtPoint, ctaVisible, progressPct } from './vslPlayerLogic';

describe('vsl player logic', () => {
  it('stones are inert before 48.6s and live after', () => {
    expect(zonesActive(48.5)).toBe(false);
    expect(zonesActive(48.6)).toBe(true);
  });
  it('maps a tap in the middle deck to jade', () => {
    expect(stoneAtPoint(0.5, 0.85)).toBe('jade');
    expect(stoneAtPoint(0.15, 0.85)).toBe('rose-quartz');
    expect(stoneAtPoint(0.80, 0.85)).toBe('garnet');
    expect(stoneAtPoint(0.5, 0.2)).toBeNull(); // above the decks
  });
  it('CTA appears at 368.2s and stays once shown', () => {
    expect(ctaVisible(100, false)).toBe(false);
    expect(ctaVisible(368.2, false)).toBe(true);
    expect(ctaVisible(0, true)).toBe(true); // return visit
  });
  it('clamps progress', () => {
    expect(progressPct(30, 60)).toBe(50);
    expect(progressPct(90, 60)).toBe(100);
    expect(progressPct(5, 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run client/src/components/evelyn/vslPlayerLogic.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `vslPlayerLogic.ts` (pure) then `VslVideoPlayer.tsx`:
- `vslPlayerLogic.ts`: implement the four helpers using `TAP_ZONES`, `WELCOME_STONES_LIVE_AT`, `PITCH_CTA_AT` from `shared/evelynVsl.ts`.
- `VslVideoPlayer.tsx`: a `<video playsInline>` with:
  - **Welcome:** muted autoplay + "🔊 Tap for sound" badge; first tap unmutes and restarts at 0, fires `onSoundOn`. On `error`/stall > 8s, raise a flag the page reads to show backup buttons (expose via `onError`-style prop or a render-prop; simplest: call `onCtaShown`-equivalent `onFailure`). Tap toggles play/pause except on a live stone zone. Three absolutely-positioned invisible buttons sized from `TAP_ZONES` (as `%`); inert (pointer-events none) until `zonesActive(currentTime)`, then a pulsing glow ring + `aria-label`. On pick → brief glow → `onStonePick(stone,'video')`.
  - **Pitch:** no zones; when `ctaVisible` first becomes true, call `onCtaShown` once. `onProgress` at 25/50/75/100. `resumeAt` seeks on mount.
  - Thin progress line along the bottom; no native controls, no seek bar.
- Keep the component dumb about localStorage/routing — the page owns that.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run client/src/components/evelyn/vslPlayerLogic.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/evelyn/
git commit -m "feat(evelyn-vsl): video player with timed stone tap-zones + CTA logic"
```

---

## Task 8: `/evelyn/reading` page

**Files:**
- Create: `client/src/pages/evelyn/ReadingPage.tsx`
- Test: covered by Playwright in Task 12 (DOM/video timing). Add a small unit test for the localStorage helper if one is extracted.

**Interfaces:**
- Consumes: `VslVideoPlayer` (Task 7), `shared/evelynVsl.ts`, `trackPH` (posthog), `trackViewContent` (Task 11).
- Produces: route component rendered at `/evelyn/reading`.

- [ ] **Step 1 (behaviour, pinned by Task 12 Playwright):** Build the page:
  - Header copy above the box: "Ready to learn your soulmate's initials?" + "Press play — Evelyn has a message for you." (copy rule: "cards", not "tarot").
  - Welcome `VslVideoPlayer`; backup stone buttons under the video that appear at `WELCOME_STONES_LIVE_AT` **or** immediately on welcome-video failure.
  - On stone pick (video or button): persist `localStorage['evelyn_vsl_v1'] = { stone, ctaShown:false, pitchPos:0 }`, fire PostHog `vsl_stone_pick {stone, via}`, swap to the pitch player and play with sound (the tap is the gesture), fire `trackViewContent` + PostHog `vsl_view`/`sound_on` as appropriate.
  - Pitch player: `onCtaShown` → render CTA "Get my reading — ~~$74~~ $19" linking to `/evelyn/checkout?stone=<stone>`; persist `ctaShown:true`; fire `vsl_cta_shown`. Save pitch position every 5s. On pitch failure > 8s, show CTA at once.
  - **Return visits:** if `localStorage` has a stone → skip the welcome video, mount the pitch player with `resumeAt = pitchPos`, CTA shown if it was shown before.
  - Fire `vsl_progress {video, pct}` from the player's `onProgress`.

- [ ] **Step 2:** `npm run build` (typecheck) — Expected: compiles.
- [ ] **Step 3: Commit**

```bash
git add client/src/pages/evelyn/ReadingPage.tsx
git commit -m "feat(evelyn-vsl): /evelyn/reading page (welcome→pick→pitch→CTA, resume)"
```

---

## Task 9: `/evelyn/checkout` page + intake pop-up

**Files:**
- Create: `client/src/pages/evelyn/CheckoutPage.tsx`
- Create: `client/src/pages/evelyn/checkoutIntake.ts` (pure validation, unit-tested)
- Test: `client/src/pages/evelyn/checkoutIntake.test.ts`

**Interfaces:**
- Consumes: `beginBackendCheckout` (Task 4), `shared/evelynVsl.ts` (`isStone`, `stoneLabel`), query/localStorage stone.
- Produces, from `checkoutIntake.ts`: `resolveStone(query: string|null, stored: string|null): StoneKey | null`; `validateIntake({ email, firstName, dateOfBirth }): { ok: true } | { ok: false; field: 'email'|'firstName'|'dateOfBirth'; message: string }` (DOB must parse and age ≥ 18 → message "This reading is for adults 18 and over").

- [ ] **Step 1: Write the failing test**

```ts
// client/src/pages/evelyn/checkoutIntake.test.ts
import { describe, it, expect } from 'vitest';
import { resolveStone, validateIntake } from './checkoutIntake';

describe('checkout intake', () => {
  it('resolves stone from query, then storage, then null', () => {
    expect(resolveStone('jade', null)).toBe('jade');
    expect(resolveStone('garbage', 'garnet')).toBe('garnet');
    expect(resolveStone(null, null)).toBeNull();
  });
  it('rejects under-18 and malformed birth dates', () => {
    const minor = new Date(); minor.setFullYear(minor.getFullYear() - 17);
    const dob = minor.toISOString().slice(0, 10);
    const r = validateIntake({ email: 'a@b.com', firstName: 'Sue', dateOfBirth: dob });
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.field).toBe('dateOfBirth'); expect(r.message).toMatch(/18/); }
    expect(validateIntake({ email: 'a@b.com', firstName: 'Sue', dateOfBirth: 'not-a-date' }).ok).toBe(false);
  });
  it('accepts a valid adult', () => {
    expect(validateIntake({ email: 'a@b.com', firstName: 'Sue', dateOfBirth: '1990-05-15' }).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run client/src/pages/evelyn/checkoutIntake.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `checkoutIntake.ts` (pure) then `CheckoutPage.tsx`:
- `checkoutIntake.ts`: `resolveStone` uses `isStone`; `validateIntake` does the checks above (age via date math; today is computed at call time).
- `CheckoutPage.tsx` — Mia's structure, our words (spec §4): headline + product image placeholder (operator open item #5); offer box ~~$74~~ **$19 today · one payment · no subscription**; sticky top "Get my reading" bar on scroll; "What's inside" list; 60-day guarantee; FAQ (Who is Evelyn / delivery `DELIVERY_PROMISE` / no monthly fee / 60-day refund); reviews block **not rendered** (empty data array); footer (support email, entertainment-only disclaimer, Terms · Privacy · Refund).
- **Pop-up** from any "Get my reading": Email, First name, Birth date (native `<input type="date">`), add-on checkbox **unticked** with stone-aware label `YES, charge my {stoneLabel(stone)} for me … Only $11.11` (falls back to "your stone"). On submit: run `validateIntake`; on failure show the inline message and keep the pop-up open (no network call). On success call `beginBackendCheckout({ offer:'soulmate-initials', treatment:'page', bump, firstName, email, dateOfBirth, stone })`; fire PostHog `checkout_initiated {price_cents, bump}` + Meta `trackInitiateCheckout`. On `{status:'error'}` keep the pop-up open with "Something went wrong — please try again."
- Fire PostHog `checkout_view` on mount.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run client/src/pages/evelyn/checkoutIntake.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/evelyn/CheckoutPage.tsx client/src/pages/evelyn/checkoutIntake.ts client/src/pages/evelyn/checkoutIntake.test.ts
git commit -m "feat(evelyn-vsl): /evelyn/checkout sales page + validated intake pop-up"
```

---

## Task 10: `/evelyn/thank-you` page + routes + upsell copy

**Files:**
- Create: `client/src/pages/evelyn/ThankYouPage.tsx`
- Create: `client/src/lib/upsellCopy/soulmateInitials.ts`
- Modify: `client/src/lib/backendOffers.ts` (`BACKEND_UPSELL_PITCH` ~60-65)
- Modify: `client/src/App.tsx` (lazy imports ~37-88; routes — register `/evelyn/*` near the other `/evelyn` route ~315)
- Test: `client/src/lib/upsellCopy/soulmateInitials.test.ts` (walk every reachable string, mirror the heart-cleanser copy test)

**Interfaces:**
- Consumes: `upsell1CopyForOffer`/`upsell2CopyForOffer` resolve `'soulmate-initials'`.
- Produces: `SOULMATE_INITIALS_UPSELL1`/`_UPSELL2`; three registered routes.

- [ ] **Step 1: Write the failing test** — a copy test that imports `SOULMATE_INITIALS_UPSELL1/2`, asserts they exist in `BACKEND_UPSELL_PITCH['soulmate-initials']`, and walks every string field asserting none contains the word "tarot" and no clearing-ritual leftovers (model: the heart-cleanser copy test).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run client/src/lib/upsellCopy/soulmateInitials.test.ts`
Expected: FAIL — module / registry entry missing.

- [ ] **Step 3: Implement**
- `soulmateInitials.ts`: copy modelled on `heartCleanser.ts` — universal love bucket; every "clearing ritual" line replaced with "your Soulmate Initials Reading"; static U2 reveal/personalise lines (bracelet stones stay rose quartz/jade/garnet as-is). Export `SOULMATE_INITIALS_UPSELL1` / `_UPSELL2`.
- Register in `BACKEND_UPSELL_PITCH`: `'soulmate-initials': { upsell1: SOULMATE_INITIALS_UPSELL1, upsell2: SOULMATE_INITIALS_UPSELL2 },` + import.
- `ThankYouPage.tsx` (spec §6): "Thank you, {firstName}. Your Soulmate Initials Reading is being prepared." + her stone line (+ "your {stone} will be charged tonight" if the add-on was bought — read from the fulfilment endpoint by `?s=` session, or from localStorage), U1/U2 purchases if any, `DELIVERY_PROMISE`, check-spam line, support email. Reads `s` (session) from the query to resolve details; tolerant if absent.
- `App.tsx`: `const EvelynReadingPage = lazyWithRetry(() => import("@/pages/evelyn/ReadingPage"));` (and Checkout, ThankYou). Register **before** any `/evelyn` catch-all:
```tsx
<Route path="/evelyn/reading" component={EvelynReadingPage} />
<Route path="/evelyn/checkout" component={EvelynCheckoutPage} />
<Route path="/evelyn/thank-you" component={EvelynThankYouPage} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run client/src/lib/upsellCopy/soulmateInitials.test.ts` then `npm run build`
Expected: PASS + compiles.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/evelyn/ThankYouPage.tsx client/src/lib/upsellCopy/soulmateInitials.ts client/src/lib/upsellCopy/soulmateInitials.test.ts client/src/lib/backendOffers.ts client/src/App.tsx
git commit -m "feat(evelyn-vsl): thank-you page, upsell copy, and /evelyn routes"
```

---

## Task 11: Tracking — Meta pixel + CAPI + PostHog for `evelyn_vsl`

**Files:**
- Modify: `shared/fbPixelConfig.ts` (add `evelyn` entry)
- Modify: `client/src/lib/funnel.ts` (`getPostHogStep` evelyn branch ~389-390)
- Modify: `client/src/lib/facebook.ts` (add `trackViewContent`)
- Test: `shared/fbPixelConfig.evelyn.test.ts`, `client/src/lib/funnel.evelyn.test.ts`

**Interfaces:**
- Produces: `resolveFunnelFromUrl('/evelyn/reading') === 'evelyn'`; `getPostHogStep('/evelyn/reading') === 'reading'`, `/evelyn/checkout → 'checkout'`, `/evelyn/thank-you → 'thank_you'`; `trackViewContent(contentName, email?, sessionId?)` mirroring `trackInitiateCheckout`.

- [ ] **Step 1: Write the failing tests**

```ts
// shared/fbPixelConfig.evelyn.test.ts
import { describe, it, expect } from 'vitest';
import { resolveFunnelFromUrl } from './fbPixelConfig';
describe('evelyn pixel routing', () => {
  it('routes /evelyn paths to the evelyn funnel entry', () => {
    expect(resolveFunnelFromUrl('/evelyn/reading')).toBe('evelyn');
    expect(resolveFunnelFromUrl('/evelyn/checkout')).toBe('evelyn');
  });
});
```
```ts
// client/src/lib/funnel.evelyn.test.ts
import { describe, it, expect } from 'vitest';
import { getPostHogFunnel, getPostHogStep } from './funnel';
describe('evelyn posthog steps', () => {
  it('names the three funnel steps', () => {
    expect(getPostHogFunnel('/evelyn/reading')).toBe('evelyn');
    expect(getPostHogStep('/evelyn/reading')).toBe('reading');
    expect(getPostHogStep('/evelyn/checkout')).toBe('checkout');
    expect(getPostHogStep('/evelyn/thank-you')).toBe('thank_you');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run shared/fbPixelConfig.evelyn.test.ts client/src/lib/funnel.evelyn.test.ts`
Expected: FAIL — no `evelyn` pixel entry; `getPostHogStep` returns only "landing" for evelyn.

- [ ] **Step 3: Implement**
- `fbPixelConfig.ts`: add an `evelyn` entry with `routes: ['/evelyn']`. **`pixelId` is an operator open item** — until the operator supplies the ad account's pixel, point it at the existing default pixel id (so events still fire in test) and leave a `// TODO(operator): evelyn ad-account pixel id` comment.
- `funnel.ts` `getPostHogStep` evelyn branch:
```ts
case "evelyn":
  if (p === "/evelyn/reading") return "reading";
  if (p === "/evelyn/checkout") return "checkout";
  if (p === "/evelyn/thank-you") return "thank_you";
  if (p === "/evelyn") return "landing";
  return "unknown";
```
- `facebook.ts`: add `trackViewContent(contentName='Soulmate Initials Reading', email?, sessionId?)` mirroring `trackInitiateCheckout` (fire pixel + server event with a `viewcontent_<sessionId>` id).
- **Main $19 Purchase browser fire:** on `/offers/upsell/welcome1` load, fire `trackPurchase(19 (+11.11 if bump), 'USD', email, 'Soulmate Initials Reading', mainSessionId, { skipServerRelay: true })` **only when** the resolved session's `metadata.funnel === 'evelyn_vsl'` (read via the existing `/api/backend/upsell/user-data` payload — extend it to surface `funnel` if not already present). This keeps every other `be_` product walled off. Dedup via `sessionStorage` exactly like `SoulmateUpsellPage.tsx:67-81`.
- Wire the PostHog custom events (`vsl_view`, `vsl_sound_on`, `vsl_stone_pick`, `vsl_progress`, `vsl_cta_shown`, `vsl_cta_click`, `checkout_view`, `checkout_initiated`, `upsell_accepted|declined`) into the page components via `trackPH(name, props)` (done in Tasks 8-10; this task adds any still missing).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run shared/fbPixelConfig.evelyn.test.ts client/src/lib/funnel.evelyn.test.ts && npm run build`
Expected: PASS + compiles.

- [ ] **Step 5: Commit**

```bash
git add shared/fbPixelConfig.ts client/src/lib/funnel.ts client/src/lib/facebook.ts shared/fbPixelConfig.evelyn.test.ts client/src/lib/funnel.evelyn.test.ts
git commit -m "feat(evelyn-vsl): pixel routing, PostHog steps, ViewContent + gated Purchase"
```

---

## Task 12: Refund policy + end-to-end Playwright + test-ideas

**Files:**
- Modify: the refund-policy page component (find via `grep -rn "30 days" client/src/pages`), add the 60-day rule
- Create: `tests/evelyn-vsl-funnel.spec.ts`
- Modify: `docs/test-ideas.md`

**Interfaces:**
- Consumes: everything above, running against local server + local Postgres + Stripe test mode (`BACKEND_CHECKOUT_TEST_MODE=true`, `sk_test_` key, `VITE_BACKEND_CHECKOUT_LIVE=true`).

- [ ] **Step 1: Write the failing e2e spec** — assert, using `page.evaluate` to drive `video.currentTime`:
  - Tap zones inert before 48.6s, active after; each stone → pitch; backup buttons work.
  - Stone carried to `/evelyn/checkout`: add-on label shows the right stone; a missing stone shows "your stone".
  - CTA appears at 368.2s and persists across reload; forcing a video `error` shows CTA / backup buttons at once.
  - Birth-date validation (invalid, under-18, valid).
  - Full Stripe **test-mode** path: $19 + bump → U1 accept → U2 decline/downsell → `/evelyn/thank-you`; assert the `be_orders`/`be_order_intake` rows carry firstName, DOB, stone, bump; assert Stripe session metadata has **no** firstName and **does** have `funnel`/`stone` (read via the fulfilment endpoint or a test hook).
  - Regression: load `/welcome1` and `/welcome2` (V1) and another backend offer and assert they are unchanged (existing suites stay green: `npx vitest run` + the relevant `tests/*.spec.ts`).

- [ ] **Step 2: Run to verify it fails** — `npx playwright test tests/evelyn-vsl-funnel.spec.ts` → FAIL (pages/behaviour not all wired, or refund text missing).

- [ ] **Step 3: Implement** — add the 60-day money-back rule for the Soulmate Initials Reading to the refund page (today it says 30 days on unused minutes, which contradicts the video — spec §9). Fix any gaps the spec surfaced.

- [ ] **Step 4: Run to verify it passes** — `npx playwright test tests/evelyn-vsl-funnel.spec.ts` → PASS. Then run the full suite `npx vitest run` and the V1 regression specs → green.

- [ ] **Step 5:** Append every test case above to `docs/test-ideas.md` under an "Evelyn video funnel" heading (project rule). Commit.

```bash
git add tests/evelyn-vsl-funnel.spec.ts docs/test-ideas.md client/src/pages/*efund*
git commit -m "feat(evelyn-vsl): refund 60-day rule + end-to-end funnel e2e, test-ideas"
```

---

## Operator open items (not code — surface to the operator before go-live)

1. **CloudFront** in front of the Sydney S3 bucket (US traffic). Our key can't create it; give console steps, then switch `EVELYN_VSL_ASSET_BASE`.
2. **Evelyn ad-account Pixel id** (Task 11 placeholder until supplied).
3. **Checkout product image** (spec §4 item 1) — not made yet.
4. **Flip `readyForMoney: true`** only after the operator confirms Job B delivery + AWeber list exist and a test-mode order was walked end-to-end.
5. Welcome video last line "pick" vs "picked" — operator to confirm (does not block code).
6. Pitch third-party claims + "over six thousand women" — operator chose to **keep** (decided, not open).

## Out of scope (Job A)
Writing/sending the reading (Job B, n8n) · answering buyer email · reviews (none yet) · A/B tests.
