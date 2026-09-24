// 09 · the Heart Cleanser Love Charm on the backend checkout router
// (server/routes/backendOffers.ts), with Stripe, the order helpers and the shipment
// helpers mocked — same style as backendOffers.marcus.test.ts / .order.test.ts.
//
//   npx vitest run server/routes/backendOffers.heartCleanser.test.ts
//
// What these pin down:
//  1. 09 OPENS A WORLDWIDE, ONE-LINE STRIPE SESSION when the bump is unticked, and adds the
//     Reiki charging bump (09-C3) as a second line with `bumpProduct: reiki_charge` when it is
//     ticked. Committed code refuses 09 outright (not_ready).
//  2. 06 KEEPS ITS SEVEN COUNTRIES and 02 KEEPS ITS BUMP.
//  3. `?offer=` ON THE ORDER LOOKUP: another offer's order is a 404; no param = today.
//  4. THE RECEIPT CARRIES SHIPPING FOR PHYSICAL OFFERS ONLY, as the string the 06 page
//     already renders; digital receipts are unchanged.
//  5. THE SHIPMENT BACKSTOP RUNS EVEN WHEN THE be_orders WRITE FAILED.

import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STRIPE_CHECKOUT_SHIPPING_COUNTRIES } from '@shared/shippingCountries';

const SESSION = 'cs_test_09_order_1';

const state = {
  liftGate: true,
  // 09 is now readyForMoney:true (live). To keep testing the dev-only test-mode gate — which
  // only engages on a `not_ready` charge — a test can force resolveBackendCharge to report
  // not_ready, simulating a still-dark offer, without depending on 09's real catalog flag.
  forceNotReady: false,
  created: null as Record<string, unknown> | null,
  order: null as Record<string, unknown> | null,
  shipment: null as Record<string, unknown> | null,
  // The active Stripe secret key the test-mode gate reads. A test key by default so the
  // gate's key-prefix check does not spuriously block a test that turns the gate on.
  stripeSecretKey: 'sk_test_placeholder_09' as string | undefined,
};

vi.mock('../lib/db', () => ({ db: {} }));
vi.mock('../lib/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../lib/experiments', () => ({
  resolveBeBookingTreatment: vi.fn(async () => ({ treatment: 'page' })),
}));
vi.mock('../lib/backendCustomerList', () => ({ BACKEND_UPSELLS: {} }));
vi.mock('../lib/be08Editions', () => ({
  getBe08Edition: vi.fn(async () => null),
  listPublishedBe08Editions: vi.fn(async () => []),
}));
vi.mock('../lib/be08Draw', () => ({ BE_08_DECK: [] }));

const getBeOrderBySession = vi.fn(async (_s: string) => state.order);
const writeToCustomerList = vi.fn(async (row: unknown) => row);
const recordBackendOrder = vi.fn(async (_session: unknown) => state.order);
vi.mock('../lib/beOrders', () => ({
  getBeOrderBySession: (s: string) => getBeOrderBySession(s),
  writeToCustomerList: (r: unknown) => writeToCustomerList(r),
  recordBackendOrder: (s: unknown) => recordBackendOrder(s),
  saveOrderIntake: vi.fn(async () => true),
}));

const ensureBackendShipment = vi.fn(async (_opts: Record<string, unknown>) => state.shipment);
vi.mock('../lib/beShipments', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/beShipments')>();
  return {
    publicShipping: actual.publicShipping,
    ensureBackendShipment: (opts: Record<string, unknown>) => ensureBackendShipment(opts),
  };
});

const create = vi.fn(async (params: Record<string, unknown>) => {
  state.created = params;
  return { id: 'cs_test_created', url: 'https://checkout.stripe.test/cs_test_created' };
});
const retrieve = vi.fn();
vi.mock('../lib/stripeAccount', () => ({
  getStripe: () => ({ checkout: { sessions: { create, retrieve } } }),
  getActiveStripeSecretKey: () => state.stripeSecretKey,
}));

// The catalog stays real. The readiness gate is lifted per test (09 is readyForMoney:false
// in committed code) so the Stripe call itself can be observed.
vi.mock('@shared/backendOffers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/backendOffers')>();
  return {
    ...actual,
    resolveBackendCharge: (req: Parameters<typeof actual.resolveBackendCharge>[0]) => {
      // Simulate a still-dark offer so the test-mode gate has a `not_ready` to lift.
      if (state.forceNotReady) return { ok: false as const, code: 'not_ready' as const, message: 'not open yet' };
      const offer = actual.BACKEND_OFFER_CATALOG[req.offer];
      if (!state.liftGate || !offer) return actual.resolveBackendCharge(req);
      return actual.priceBackendOffer(offer, req);
    },
  };
});

const { default: router } = await import('./backendOffers');
const app = express();
app.use(express.json());
app.use('/api/backend', router);

function paidRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-09-1',
    stripeSessionId: SESSION,
    stripePaymentIntentId: 'pi_secret_09',
    offer: 'heart-cleanser',
    offerNumber: '09',
    status: 'paid',
    email: 'she@example.com',
    firstName: 'Sarah',
    amountCents: 5900,
    readingCents: 5900,
    bumpPurchased: false,
    bumpCents: 0,
    bumpProductKey: null,
    editionId: null,
    editionVersion: null,
    dueAt: null,
    deliveredAt: null,
    createdAt: new Date('2026-09-15T10:00:00.000Z'),
    customerListWrittenAt: new Date('2026-09-15T10:00:01.000Z'),
    ...overrides,
  };
}

function shipmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ship-1',
    stripeSessionId: SESSION,
    stripePaymentIntentId: 'pi_secret_09',
    offer: 'heart-cleanser',
    offerNumber: '09',
    sku: 'be_heart_cleanser',
    quantity: 1,
    email: 'she@example.com',
    phone: '+44 7700 900000',
    recipientName: 'Sarah Rose',
    line1: '1 Rose Lane',
    line2: null,
    city: 'Bath',
    state: null,
    postalCode: 'BA1 1AA',
    country: 'GB',
    addressMissing: false,
    status: 'pending',
    ...overrides,
  };
}

beforeEach(() => {
  state.liftGate = true;
  state.forceNotReady = false;
  state.created = null;
  state.order = null;
  state.shipment = null;
  state.stripeSecretKey = 'sk_test_placeholder_09';
  for (const fn of [getBeOrderBySession, writeToCustomerList, recordBackendOrder, ensureBackendShipment, create, retrieve]) {
    fn.mockClear();
  }
  retrieve.mockReset();
});

// ─── 1–2 · checkout ────────────────────────────────────────────────────────────

describe('POST /api/backend/checkout — 09', () => {
  it('opens a worldwide-shipping, one-line, no-bump Stripe session', async () => {
    const res = await request(app).post('/api/backend/checkout').send({ offer: 'heart-cleanser', treatment: 'page' });
    expect(res.status).toBe(200);
    expect(res.body.url).toContain('checkout.stripe.test');
    const p = state.created as any;
    expect(p.shipping_address_collection).toEqual({ allowed_countries: [...STRIPE_CHECKOUT_SHIPPING_COUNTRIES] });
    expect(p.line_items).toHaveLength(1);
    expect(p.line_items[0]).toMatchObject({
      quantity: 1,
      price_data: { currency: 'usd', unit_amount: 5900, product_data: { name: 'Heart Cleanser Love Charm' } },
    });
    expect(p.metadata).toMatchObject({ product: 'be_heart_cleanser', offer: 'heart-cleanser', bump: '0', readingCents: '5900' });
    expect(p.metadata).not.toHaveProperty('bumpProduct');
    expect(p.payment_intent_data.description).toBe('BE 09 · Heart Cleanser Love Charm');
    expect(p.payment_intent_data.metadata).toEqual({ product: 'be_heart_cleanser', offer: 'heart-cleanser' });
    expect(p.success_url).toMatch(/\/offers\/upsell\/welcome1\?session_id=\{CHECKOUT_SESSION_ID\}$/);
    expect(p.cancel_url).toMatch(/\/offers\/heart-cleanser\?cancelled=1$/);
    expect(p).not.toHaveProperty('custom_fields');
  });

  it('bump: true adds Reiki charging as a SECOND line at the catalog price, with its own key', async () => {
    const res = await request(app).post('/api/backend/checkout').send({ offer: 'heart-cleanser', treatment: 'page', bump: true });
    expect(res.status).toBe(200);
    const p = state.created as any;
    expect(p.line_items).toHaveLength(2);
    expect(p.line_items[0].price_data).toMatchObject({ unit_amount: 5900, product_data: { name: 'Heart Cleanser Love Charm' } });
    expect(p.line_items[1]).toMatchObject({
      quantity: 1,
      price_data: { currency: 'usd', unit_amount: 1111, product_data: { name: '+ Reiki charging by Evelyn before packing' } },
    });
    // The webhook and be_shipments read these two keys to flag the parcel.
    expect(p.metadata).toMatchObject({ product: 'be_heart_cleanser', offer: 'heart-cleanser', bump: '1', bumpProduct: 'reiki_charge', readingCents: '5900' });
    expect(p.payment_intent_data.description).toBe('BE 09 · Heart Cleanser Love Charm + Reiki charging by Evelyn before packing');
    // Still the one worldwide address collection — the bump ships inside the same parcel.
    expect(p.shipping_address_collection).toEqual({ allowed_countries: [...STRIPE_CHECKOUT_SHIPPING_COUNTRIES] });
  });

  it('a browser-posted amount cannot change either line', async () => {
    const res = await request(app)
      .post('/api/backend/checkout')
      .send({ offer: 'heart-cleanser', treatment: 'page', bump: true, amountCents: 1 });
    expect(res.status).toBe(200);
    expect((state.created as any).line_items.map((l: any) => l.price_data.unit_amount)).toEqual([5900, 1111]);
  });

  it('is OPEN in committed code — readyForMoney is true (live on Production)', async () => {
    // No gate lift, real catalog: 09 is now live, so committed code prices it directly.
    state.liftGate = false;
    const res = await request(app).post('/api/backend/checkout').send({ offer: 'heart-cleanser', treatment: 'page' });
    expect(res.status).toBe(200);
    expect((state.created as any).line_items[0].price_data.unit_amount).toBe(5900);
  });
});

// ─── 09 · the Stripe TEST-MODE gate (HANDOVER §3 Step 6) ────────────────────────
// A dev-only override that lets a `readyForMoney: false` offer open a Stripe TEST-mode
// checkout, so the end-to-end walk can be proved before the offer is opened for real
// money. OFF by default; even when on it refuses in production and refuses a live key.
describe('POST /api/backend/checkout — 09 test-mode gate', () => {
  const ORIGINAL_TEST_MODE = process.env.BACKEND_CHECKOUT_TEST_MODE;
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

  afterEach(() => {
    if (ORIGINAL_TEST_MODE === undefined) delete process.env.BACKEND_CHECKOUT_TEST_MODE;
    else process.env.BACKEND_CHECKOUT_TEST_MODE = ORIGINAL_TEST_MODE;
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  });

  // 🔬 The DEPLOYED dev site runs `NODE_ENV=production` (the start script forces it), so the
  // gate must NOT hinge on NODE_ENV. Its real guard is the TEST Stripe key: a test key cannot
  // charge a real card, and production uses a LIVE key, so the gate stays shut there.
  it('opens a not-ready offer with the env var on + a TEST key — even under NODE_ENV=production (deployed-dev case)', async () => {
    // Simulate a still-dark offer so the gate has a not_ready to lift.
    state.forceNotReady = true;
    process.env.BACKEND_CHECKOUT_TEST_MODE = 'true';
    process.env.NODE_ENV = 'production';
    state.stripeSecretKey = 'sk_test_abc123';

    const res = await request(app).post('/api/backend/checkout').send({ offer: 'heart-cleanser', treatment: 'page' });
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(1);
    expect((state.created as any).line_items[0].price_data.unit_amount).toBe(5900);
  });

  it('also opens under NODE_ENV=development with a TEST key (NODE_ENV is irrelevant)', async () => {
    state.forceNotReady = true;
    process.env.BACKEND_CHECKOUT_TEST_MODE = 'true';
    process.env.NODE_ENV = 'development';
    state.stripeSecretKey = 'sk_test_abc123';

    const res = await request(app).post('/api/backend/checkout').send({ offer: 'heart-cleanser', treatment: 'page' });
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('stays refused with a LIVE key even with the env var on (the production guard)', async () => {
    state.forceNotReady = true;
    process.env.BACKEND_CHECKOUT_TEST_MODE = 'true';
    process.env.NODE_ENV = 'production';
    state.stripeSecretKey = 'sk_live_realmoney';

    const res = await request(app).post('/api/backend/checkout').send({ offer: 'heart-cleanser', treatment: 'page' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('not_ready');
    expect(create).not.toHaveBeenCalled();
  });

  it('stays refused when the env var is off (default), even with a test key', async () => {
    state.forceNotReady = true;
    delete process.env.BACKEND_CHECKOUT_TEST_MODE;
    process.env.NODE_ENV = 'production';
    state.stripeSecretKey = 'sk_test_abc123';

    const res = await request(app).post('/api/backend/checkout').send({ offer: 'heart-cleanser', treatment: 'page' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('not_ready');
    expect(create).not.toHaveBeenCalled();
  });
});

describe('POST /api/backend/checkout — the offers that came before 09', () => {
  it('06 keeps its seven-country shipping list', async () => {
    const res = await request(app).post('/api/backend/checkout').send({ offer: 'pixiu-bracelet', treatment: 'page' });
    expect(res.status).toBe(200);
    expect((state.created as any).shipping_address_collection).toEqual({
      allowed_countries: ['US', 'CA', 'GB', 'AU', 'NZ', 'IE', 'SG'],
    });
  });

  it('02 still sells its bump as a second line, and collects no address', async () => {
    const res = await request(app).post('/api/backend/checkout').send({ offer: 'twin-flame', treatment: 'page', bump: true });
    expect(res.status).toBe(200);
    const p = state.created as any;
    expect(p.line_items).toHaveLength(2);
    expect(p.metadata).toMatchObject({ bump: '1', bumpProduct: 'astro_force' });
    expect(p.payment_intent_data.description).toBe('BE 02 · The Twin Flame Tarot Reading + Astro Force instructional');
    expect(p).not.toHaveProperty('shipping_address_collection');
  });
});

// ─── 3 · ?offer= on the order lookup ───────────────────────────────────────────

describe('GET /api/backend/order/:sessionId?offer=', () => {
  it('answers when the order belongs to the named offer', async () => {
    state.order = paidRow();
    const res = await request(app).get(`/api/backend/order/${SESSION}?offer=heart-cleanser`);
    expect(res.status).toBe(200);
    expect(res.body.order.offer).toBe('heart-cleanser');
  });

  it('is 404 when the order belongs to ANOTHER offer — and does no work for it', async () => {
    state.order = paidRow({ offer: 'twin-flame', offerNumber: '02' });
    const res = await request(app).get(`/api/backend/order/${SESSION}?offer=heart-cleanser`);
    expect(res.status).toBe(404);
    expect(writeToCustomerList).not.toHaveBeenCalled();
    expect(ensureBackendShipment).not.toHaveBeenCalled();
  });

  it('is 404 for an offer key that does not exist', async () => {
    state.order = paidRow();
    const res = await request(app).get(`/api/backend/order/${SESSION}?offer=hex-her`);
    expect(res.status).toBe(404);
  });

  it('without the param behaves exactly as today', async () => {
    state.order = paidRow({ offer: 'twin-flame', offerNumber: '02' });
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.status).toBe(200);
    expect(res.body.order.offer).toBe('twin-flame');
    expect(writeToCustomerList).toHaveBeenCalledTimes(1);
  });

  it('is 404 when the STRIPE session belongs to another offer — nothing is recorded', async () => {
    retrieve.mockResolvedValueOnce({ id: SESSION, payment_status: 'paid', metadata: { product: 'be_twin_flame', offer: 'twin-flame' } });
    const res = await request(app).get(`/api/backend/order/${SESSION}?offer=heart-cleanser`);
    expect(res.status).toBe(404);
    expect(recordBackendOrder).not.toHaveBeenCalled();
    expect(ensureBackendShipment).not.toHaveBeenCalled();
  });

  it('records from Stripe when the session matches the named offer', async () => {
    retrieve.mockResolvedValueOnce({ id: SESSION, payment_status: 'paid', metadata: { product: 'be_heart_cleanser', offer: 'heart-cleanser' } });
    recordBackendOrder.mockImplementationOnce(async () => paidRow());
    const res = await request(app).get(`/api/backend/order/${SESSION}?offer=heart-cleanser`);
    expect(res.status).toBe(200);
    expect(recordBackendOrder).toHaveBeenCalledTimes(1);
  });
});

// ─── 4–5 · shipping on the receipt ─────────────────────────────────────────────

describe('GET /api/backend/order/:sessionId — shipping', () => {
  it('a 09 receipt carries the address string the 06 page renders, and a structured copy', async () => {
    state.order = paidRow();
    state.shipment = shipmentRow();
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.status).toBe(200);
    expect(res.body.order.shipping).toBe('Sarah Rose\n1 Rose Lane\nBath, BA1 1AA\nGB');
    expect(res.body.order.shippingAddress).toEqual({
      recipientName: 'Sarah Rose',
      line1: '1 Rose Lane',
      line2: null,
      city: 'Bath',
      state: null,
      postalCode: 'BA1 1AA',
      country: 'GB',
      status: 'pending',
      addressMissing: false,
    });
    const flat = JSON.stringify(res.body);
    expect(flat).not.toContain('pi_secret_09');
    expect(flat).not.toContain('+44');
  });

  it('runs the shipment backstop with the order id and a way to fetch the session', async () => {
    state.order = paidRow();
    state.shipment = shipmentRow();
    await request(app).get(`/api/backend/order/${SESSION}`);
    expect(ensureBackendShipment).toHaveBeenCalledTimes(1);
    const opts = ensureBackendShipment.mock.calls[0][0];
    expect(opts).toMatchObject({ sessionId: SESSION, offerKey: 'heart-cleanser', beOrderId: 'order-09-1' });
    expect(typeof opts.retrieveSession).toBe('function');
    retrieve.mockResolvedValueOnce({ id: SESSION });
    await (opts.retrieveSession as () => Promise<unknown>)();
    expect(retrieve).toHaveBeenCalledWith(SESSION);
  });

  it('a 06 receipt gets the same shipping string', async () => {
    state.order = paidRow({ offer: 'pixiu-bracelet', offerNumber: '06' });
    state.shipment = shipmentRow({ offer: 'pixiu-bracelet', offerNumber: '06', sku: 'be_pixiu_bracelet' });
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.body.order.shipping).toBe('Sarah Rose\n1 Rose Lane\nBath, BA1 1AA\nGB');
  });

  it('a broken shipment lookup still renders the receipt, with shipping null', async () => {
    state.order = paidRow();
    state.shipment = null;
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.status).toBe(200);
    expect(res.body.order.shipping).toBeNull();
    expect(res.body.order.shippingAddress).toBeNull();
  });

  it('a DIGITAL receipt is unchanged — no shipping keys, no shipment lookup', async () => {
    for (const offer of ['twin-flame', 'marcus-reading']) {
      state.order = paidRow({ offer, offerNumber: offer === 'twin-flame' ? '02' : '08' });
      const res = await request(app).get(`/api/backend/order/${SESSION}`);
      expect(res.status, offer).toBe(200);
      expect(res.body.order, offer).not.toHaveProperty('shipping');
      expect(res.body.order, offer).not.toHaveProperty('shippingAddress');
    }
    expect(ensureBackendShipment).not.toHaveBeenCalled();
  });

  it('records the shipment from the Stripe session even when the be_orders write failed', async () => {
    const session = { id: SESSION, payment_status: 'paid', metadata: { product: 'be_heart_cleanser', offer: 'heart-cleanser' } };
    retrieve.mockResolvedValueOnce(session);
    recordBackendOrder.mockImplementationOnce(async () => null);
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    // The receipt answers exactly as before (no order row → 404)…
    expect(res.status).toBe(404);
    // …but the parcel was still recorded from the session.
    expect(ensureBackendShipment).toHaveBeenCalledTimes(1);
    expect(ensureBackendShipment.mock.calls[0][0]).toMatchObject({
      sessionId: SESSION,
      offerKey: 'heart-cleanser',
      beOrderId: null,
      session,
    });
  });

  it('passes the recorded order id when the Stripe path succeeds', async () => {
    const session = { id: SESSION, payment_status: 'paid', metadata: { product: 'be_heart_cleanser', offer: 'heart-cleanser' } };
    retrieve.mockResolvedValueOnce(session);
    recordBackendOrder.mockImplementationOnce(async () => paidRow());
    state.shipment = shipmentRow();
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.status).toBe(200);
    expect(ensureBackendShipment.mock.calls[0][0]).toMatchObject({ beOrderId: 'order-09-1', session });
    expect(res.body.order.shipping).toContain('1 Rose Lane');
  });

  it('does not run the backstop for a digital offer on the Stripe path', async () => {
    retrieve.mockResolvedValueOnce({ id: SESSION, payment_status: 'paid', metadata: { product: 'be_twin_flame', offer: 'twin-flame' } });
    recordBackendOrder.mockImplementationOnce(async () => paidRow({ offer: 'twin-flame', offerNumber: '02' }));
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.status).toBe(200);
    expect(ensureBackendShipment).not.toHaveBeenCalled();
    expect(res.body.order).not.toHaveProperty('shipping');
  });
});
