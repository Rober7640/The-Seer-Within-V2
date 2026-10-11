// 04 · The Turn on the backend checkout router (server/routes/backendOffers.ts), with Stripe,
// the order helpers and the experiment resolver mocked — same style as
// backendOffers.heartCleanser.test.ts.
//
//   npx vitest run server/routes/backendOffers.teaReading.test.ts
//
// What these pin down:
//  1. CHECKOUT CHARGES THE SERVER'S PRICE ARM (operator 2026-10-11: no price hike — one fixed
//     price, split-tested $35 vs $45). It re-resolves her arm from `expSubject`, charges that arm
//     and stamps `priceExp` / `priceArm` (no `rung`) on Stripe metadata. A page that printed
//     another arm — or none — gets a 409 `price_changed` carrying the server's price, and
//     nothing is created or drawn. Nothing posted — amountCents, tier, quotedDay, a `cup` —
//     changes the price or the cup (operator 2026-10-11: no pick, a random draw).
//  2. THE PRICE ENDPOINT prints her arm's price, uncached; its `?arm=` preview is display-only,
//     enrols nobody, and never reaches what checkout charges.
//  3. BOTH UPSELL CHARGE PATHS carry the booking's `expSubject` / `priceExp` / `priceArm`, so
//     upsell revenue lands on her arm — and only for 04.
//  4. THE RECEIPT: 04 is always 24 hours (the Double Turning is not a speed bump) while 08 keeps
//     12 with its bump; 04's receipt never names the drawn cup (the reading is the reveal).
//  5. OTHER OFFERS ARE UNTOUCHED: no price arm/rung/cup on their metadata, no draw, no resolve.

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SESSION = 'cs_test_04_order_1';
const SUBJECT = 'visitor-0f3c9a52';

type Be04Price = { key: string; arm: string; cents: number; variant: string | null; enrolled: boolean };
const ARM_A: Be04Price = { key: 'be_04_price_2026', arm: 'A', cents: 3500, variant: null, enrolled: false };
const ARM_B: Be04Price = { key: 'be_04_price_2026', arm: 'B', cents: 4500, variant: 'B', enrolled: true };

const state = {
  liftGate: true,
  created: null as Record<string, unknown> | null,
  piCreated: null as Record<string, unknown> | null,
  order: null as Record<string, unknown> | null,
  /** What the (mocked) experiment resolver answers for 04. */
  price: ARM_A as Be04Price,
  /** Pins the draw for a test; null = the real draw (crypto.randomInt). */
  drawn: null as string | null,
  draws: 0,
};

vi.mock('../lib/db', () => ({ db: {} }));
vi.mock('../lib/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
const resolveBe04Price = vi.fn(async (_subject: unknown) => state.price);
vi.mock('../lib/experiments', () => ({
  resolveBeBookingTreatment: vi.fn(async () => ({ treatment: 'page' })),
  resolveBe04Price: (subject: unknown) => resolveBe04Price(subject),
}));
vi.mock('../lib/backendCustomerList', () => ({
  BACKEND_UPSELLS: {
    be_08_marcus_audio: { productKey: 'be_08_marcus_audio', name: 'Audio', priceCents: 1700 },
    be_protection_ritual: { productKey: 'be_protection_ritual', name: 'Protection Ritual', priceCents: 4700 },
    be_bracelet: { productKey: 'be_bracelet', name: 'Manifestation Bracelet', priceCents: 4700, downsellCents: 3000 },
  },
}));
vi.mock('../lib/be08Editions', () => ({
  getBe08Edition: vi.fn(async () => null),
  listPublishedBe08Editions: vi.fn(async () => []),
}));
vi.mock('../lib/be08Draw', () => ({ BE_08_DECK: [] }));
vi.mock('../lib/beUpsellOrders', () => ({ paidUpsellAmountCents: vi.fn(async () => null) }));
vi.mock('../lib/beShipments', () => ({
  publicShipping: vi.fn(() => ({})),
  ensureBackendShipment: vi.fn(async () => null),
}));
// The draw stays real unless a test pins `state.drawn`; every call is counted.
vi.mock('../lib/be04Draw', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/be04Draw')>();
  return {
    ...actual,
    drawTeaCup: (...args: Parameters<typeof actual.drawTeaCup>) => {
      state.draws++;
      return (state.drawn as ReturnType<typeof actual.drawTeaCup> | null) ?? actual.drawTeaCup(...args);
    },
  };
});

const getBeOrderBySession = vi.fn(async (_s: string) => state.order);
const writeToCustomerList = vi.fn(async (row: unknown) => row);
const recordBackendOrder = vi.fn(async (_session: unknown) => state.order);
const saveOrderIntake = vi.fn(async () => true);
vi.mock('../lib/beOrders', () => ({
  getBeOrderBySession: (s: string) => getBeOrderBySession(s),
  writeToCustomerList: (r: unknown) => writeToCustomerList(r),
  recordBackendOrder: (s: unknown) => recordBackendOrder(s),
  saveOrderIntake: () => saveOrderIntake(),
}));

const create = vi.fn(async (params: Record<string, unknown>) => {
  state.created = params;
  return { id: 'cs_test_created', url: 'https://checkout.stripe.test/cs_test_created' };
});
const piCreate = vi.fn(async (params: Record<string, unknown>) => {
  state.piCreated = params;
  return { id: 'pi_test_upsell_1' };
});
const retrieve = vi.fn();
vi.mock('../lib/stripeAccount', () => ({
  getStripe: () => ({ checkout: { sessions: { create, retrieve } }, paymentIntents: { create: piCreate } }),
  getActiveStripeSecretKey: () => 'sk_test_placeholder_04',
}));

// The catalog stays real. The readiness gate is lifted per test (04 is readyForMoney:false in
// committed code) so the Stripe call itself can be observed — the same pure rules price it.
vi.mock('@shared/backendOffers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/backendOffers')>();
  return {
    ...actual,
    resolveBackendCharge: (req: Parameters<typeof actual.resolveBackendCharge>[0]) => {
      const offer = actual.BACKEND_OFFER_CATALOG[req.offer];
      if (!state.liftGate || !offer) return actual.resolveBackendCharge(req);
      return actual.priceBackendOffer(offer, req);
    },
  };
});

const { BACKEND_OFFER_CATALOG, TEA_CUPS } = await import('@shared/backendOffers');
const { default: router } = await import('./backendOffers');
const app = express();
app.use(express.json());
app.use('/api/backend', router);

/** A 04 checkout as the booking page posts it: her visitor id and the arm the page printed. */
const checkout = (body: Record<string, unknown>) =>
  request(app)
    .post('/api/backend/checkout')
    .send({ offer: 'tea-reading', treatment: 'page', expSubject: SUBJECT, quotedArm: state.price.arm, ...body });

function paidRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-04-1',
    stripeSessionId: SESSION,
    stripePaymentIntentId: 'pi_secret_04',
    offer: 'tea-reading',
    offerNumber: '04',
    status: 'paid',
    email: 'she@example.com',
    firstName: 'Sarah',
    amountCents: 4777,
    readingCents: 3500,
    bumpPurchased: true,
    bumpCents: 1277,
    bumpProductKey: 'double_turning',
    editionId: null,
    editionVersion: null,
    dueAt: null,
    deliveredAt: null,
    createdAt: new Date('2026-10-12T12:00:00.000Z'),
    customerListWrittenAt: new Date('2026-10-12T12:00:01.000Z'),
    ...overrides,
  };
}

beforeEach(() => {
  state.liftGate = true;
  state.created = null;
  state.piCreated = null;
  state.order = null;
  state.price = ARM_A;
  state.drawn = null;
  state.draws = 0;
  for (const fn of [getBeOrderBySession, writeToCustomerList, recordBackendOrder, saveOrderIntake, create, piCreate, resolveBe04Price]) {
    fn.mockClear();
  }
  retrieve.mockReset();
});

// ─── 1 · checkout ──────────────────────────────────────────────────────────────

describe('POST /api/backend/checkout — 04', () => {
  it('opens a one-line, no-shipping session at arm A\'s $35, stamped with the price experiment', async () => {
    state.drawn = 'sunken-leaf';
    const res = await checkout({});
    expect(res.status).toBe(200);
    const p = state.created as any;
    expect(p).not.toHaveProperty('shipping_address_collection');
    expect(p.line_items).toHaveLength(1);
    expect(p.line_items[0].price_data).toMatchObject({
      currency: 'usd',
      unit_amount: 3500,
      product_data: {
        name: 'The Turn — tea-leaf reading by Evelyn Cross',
        description: 'Your 21-day reading, delivered within 24 hours.',
      },
    });
    expect(p.metadata).toMatchObject({
      product: 'be_tea_reading',
      offer: 'tea-reading',
      readingCents: '3500',
      bump: '0',
      priceExp: 'be_04_price_2026',
      priceArm: 'A',
      expSubject: SUBJECT,
      cup: 'sunken-leaf',
      cupDrawn: '1',
    });
    expect(p.metadata).not.toHaveProperty('rung');
    expect(p.metadata).not.toHaveProperty('cupChosen');
    expect(p.metadata).not.toHaveProperty('bumpProduct');
    expect(p.metadata).not.toHaveProperty('tier');
    expect(p.payment_intent_data.description).toBe('BE 04 · The Turn — tea-leaf reading by Evelyn Cross');
    expect(p.success_url).toMatch(/\/offers\/upsell\/welcome1\?session_id=\{CHECKOUT_SESSION_ID\}$/);
    expect(p.cancel_url).toMatch(/\/offers\/wiccan\/tea-reading\?cancelled=1$/);
    // 04 parks nothing on be_order_intake — the drawn cup rides Stripe metadata.
    expect(saveOrderIntake).not.toHaveBeenCalled();
  });

  it('re-resolves her arm on the server, from the visitor id she posted', async () => {
    await checkout({});
    expect(resolveBe04Price).toHaveBeenCalledTimes(1);
    expect(resolveBe04Price).toHaveBeenCalledWith(SUBJECT);
  });

  it('charges arm B\'s $45 when the server puts her in B, and says so on metadata', async () => {
    state.price = ARM_B;
    const res = await checkout({});
    expect(res.status).toBe(200);
    const p = state.created as any;
    expect(p.line_items[0].price_data.unit_amount).toBe(4500);
    expect(p.metadata).toMatchObject({ readingCents: '4500', priceExp: 'be_04_price_2026', priceArm: 'B', expSubject: SUBJECT });
  });

  it('the chat treatment cancels back to the chat', async () => {
    await checkout({ treatment: 'chat' });
    expect((state.created as any).cancel_url).toMatch(/\/offers\/wiccan\/tea-reading\/chat\?cancelled=1$/);
  });

  it('adds The Double Turning as a second line under its own key, at either price', async () => {
    for (const price of [ARM_A, ARM_B]) {
      state.price = price;
      const res = await checkout({ bump: true });
      expect(res.status).toBe(200);
      const p = state.created as any;
      expect(p.line_items.map((l: any) => [l.price_data.product_data.name, l.price_data.unit_amount])).toEqual([
        ['The Turn — tea-leaf reading by Evelyn Cross', price.cents],
        ['The Double Turning', 1277],
      ]);
      expect(p.metadata).toMatchObject({ bump: '1', bumpProduct: 'double_turning', priceArm: price.arm });
      expect(p.payment_intent_data.description).toBe('BE 04 · The Turn — tea-leaf reading by Evelyn Cross + The Double Turning');
    }
  });

  it('⛔ a page that printed another arm gets 409 price_changed with the server\'s price — nothing charged, nothing drawn', async () => {
    state.price = ARM_B;
    const res = await checkout({ quotedArm: 'A' });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'price_changed', current: { arm: 'B', cents: 4500, label: '$45' } });
    expect(typeof res.body.error).toBe('string');
    expect(res.body.error).not.toMatch(/today/i);
    expect(create).not.toHaveBeenCalled();
    expect(state.draws).toBe(0);
  });

  it('…and the other way: a page still showing $45 after the test is paused is told $35', async () => {
    state.price = ARM_A;
    const res = await checkout({ quotedArm: 'B' });
    expect(res.status).toBe(409);
    expect(res.body.current).toEqual({ arm: 'A', cents: 3500, label: '$35' });
    expect(create).not.toHaveBeenCalled();
  });

  it('⛔ a page that quoted NO arm (or junk) is refused the same way — never charged blind', async () => {
    for (const quotedArm of [undefined, null, '', 'b', 'C', 3500, { arm: 'A' }]) {
      const res = await checkout({ quotedArm });
      expect(res.status, JSON.stringify(quotedArm)).toBe(409);
      expect(res.body.current, JSON.stringify(quotedArm)).toEqual({ arm: 'A', cents: 3500, label: '$35' });
    }
    // An old ladder page posting only `quotedDay` is one of those.
    const old = await request(app)
      .post('/api/backend/checkout')
      .send({ offer: 'tea-reading', treatment: 'page', expSubject: SUBJECT, quotedDay: 1 });
    expect(old.status).toBe(409);
    expect(create).not.toHaveBeenCalled();
  });

  it('the re-press with the server\'s arm goes through', async () => {
    state.price = ARM_B;
    const refused = await checkout({ quotedArm: 'A' });
    const res = await checkout({ quotedArm: refused.body.current.arm });
    expect(res.status).toBe(200);
    expect((state.created as any).line_items[0].price_data.unit_amount).toBe(4500);
  });

  it('⛔ a tampered amountCents / tier / quotedDay / price cannot change what she is charged', async () => {
    for (const price of [ARM_A, ARM_B]) {
      state.price = price;
      const res = await checkout({ amountCents: 1, tier: 'spread', quotedDay: 4, cents: 1, priceCents: 1, armCents: 1 });
      expect(res.status).toBe(200);
      expect((state.created as any).line_items[0].price_data.unit_amount).toBe(price.cents);
      expect((state.created as any).metadata).not.toHaveProperty('tier');
      expect((state.created as any).metadata).not.toHaveProperty('rung');
    }
  });

  it('the catalog\'s closed set is the last word — a resolver price outside {3500, 4500} charges $35', async () => {
    state.price = { key: 'be_04_price_2026', arm: 'B', cents: 9900, variant: 'B', enrolled: true };
    const res = await checkout({});
    expect(res.status).toBe(200);
    expect((state.created as any).line_items[0].price_data.unit_amount).toBe(3500);
  });

  it('no visitor id: the resolver is asked with none, and a $35 page still checks out', async () => {
    const res = await request(app).post('/api/backend/checkout').send({ offer: 'tea-reading', treatment: 'page', quotedArm: 'A' });
    expect(res.status).toBe(200);
    expect(resolveBe04Price).toHaveBeenCalledWith(undefined);
    expect((state.created as any).metadata).not.toHaveProperty('expSubject');
    expect((state.created as any).metadata).toMatchObject({ priceExp: 'be_04_price_2026', priceArm: 'A' });
  });

  it('⛔ draws her cup on the server — a cup the client sends is ignored, never a 400', async () => {
    state.drawn = 'turned-handle';
    for (const sent of ['sunken-leaf', 'divided-rim', '<script>', 42, null]) {
      const res = await checkout({ cup: sent });
      expect(res.status, String(sent)).toBe(200);
      expect((state.created as any).metadata, String(sent)).toMatchObject({ cup: 'turned-handle', cupDrawn: '1' });
    }
  });

  it('with the real draw, every session carries a valid cup — one draw per checkout', async () => {
    const seen = new Set<string>();
    for (let k = 0; k < 12; k++) {
      const res = await checkout({});
      expect(res.status).toBe(200);
      const meta = (state.created as any).metadata;
      expect(TEA_CUPS as readonly string[]).toContain(meta.cup);
      expect(meta.cupDrawn).toBe('1');
      expect(meta).not.toHaveProperty('cupChosen');
      seen.add(meta.cup);
    }
    expect(state.draws).toBe(12);
    expect(seen.size).toBeGreaterThanOrEqual(1);
  });

  it('is refused outright by committed code — readyForMoney is false', async () => {
    state.liftGate = false;
    const res = await checkout({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('not_ready');
    expect(create).not.toHaveBeenCalled();
    expect(state.draws).toBe(0);
  });
});

describe('POST /api/backend/checkout — other offers are untouched by the 04 fields', () => {
  it('02 ignores quotedArm, quotedDay and cup: same price, no price arm, no rung, no cup, no resolve', async () => {
    const res = await request(app)
      .post('/api/backend/checkout')
      .send({ offer: 'twin-flame', treatment: 'page', quotedArm: 'B', quotedDay: 3, cup: 'sunken-leaf', expSubject: SUBJECT });
    expect(res.status).toBe(200);
    const p = state.created as any;
    expect(p.line_items[0].price_data.unit_amount).toBe(3500);
    for (const key of ['priceExp', 'priceArm', 'rung', 'cup', 'cupDrawn', 'cupChosen']) {
      expect(p.metadata, key).not.toHaveProperty(key);
    }
    // 02's own booking-treatment subject still rides, exactly as before.
    expect(p.metadata.expSubject).toBe(SUBJECT);
    expect(state.draws).toBe(0);
    expect(resolveBe04Price).not.toHaveBeenCalled();
  });

  it('03 still floor-checks its pay-what-you-want amount', async () => {
    const res = await request(app)
      .post('/api/backend/checkout')
      .send({ offer: 'judgement-day', treatment: 'page', amountCents: 2200, quotedArm: 'B' });
    expect(res.status).toBe(200);
    expect((state.created as any).line_items[0].price_data.unit_amount).toBe(2200);
    expect((state.created as any).metadata).not.toHaveProperty('priceArm');
    expect(resolveBe04Price).not.toHaveBeenCalled();
  });
});

// ─── 2 · the price endpoint ────────────────────────────────────────────────────

describe('GET /api/backend/offers/tea-reading/price', () => {
  it('prints her arm\'s price for her visitor id, uncached', async () => {
    const res = await request(app).get(`/api/backend/offers/tea-reading/price?subject=${SUBJECT}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ offer: 'tea-reading', arm: 'A', cents: 3500, label: '$35' });
    expect(res.headers['cache-control']).toBe('no-store');
    expect(resolveBe04Price).toHaveBeenCalledWith(SUBJECT);
  });

  it('arm B prints $45', async () => {
    state.price = ARM_B;
    const res = await request(app).get(`/api/backend/offers/tea-reading/price?subject=${SUBJECT}`);
    expect(res.body).toEqual({ offer: 'tea-reading', arm: 'B', cents: 4500, label: '$45' });
  });

  it('no subject → the resolver is asked with none (and answers the control)', async () => {
    const res = await request(app).get('/api/backend/offers/tea-reading/price');
    expect(res.body).toEqual({ offer: 'tea-reading', arm: 'A', cents: 3500, label: '$35' });
    expect(resolveBe04Price).toHaveBeenCalledWith(null);
  });

  it('?arm=A|B previews either price while the offer is not open for money — flagged, and enrols nobody', async () => {
    const b = await request(app).get(`/api/backend/offers/tea-reading/price?subject=${SUBJECT}&arm=B`);
    expect(b.body).toEqual({ offer: 'tea-reading', arm: 'B', cents: 4500, label: '$45', preview: true });
    expect(b.headers['cache-control']).toBe('no-store');
    const a = await request(app).get('/api/backend/offers/tea-reading/price?arm=a');
    expect(a.body).toEqual({ offer: 'tea-reading', arm: 'A', cents: 3500, label: '$35', preview: true });
    expect(resolveBe04Price).not.toHaveBeenCalled();
  });

  it('ignores a nonsense ?arm=', async () => {
    for (const arm of ['C', 'AB', '1', '', '4500']) {
      const res = await request(app).get(`/api/backend/offers/tea-reading/price?arm=${arm}`);
      expect(res.body, arm).toEqual({ offer: 'tea-reading', arm: 'A', cents: 3500, label: '$35' });
    }
  });

  it('⛔ ignores ?arm= once the offer is open for money', async () => {
    const offer = BACKEND_OFFER_CATALOG['tea-reading'];
    offer.readyForMoney = true;
    try {
      const res = await request(app).get(`/api/backend/offers/tea-reading/price?subject=${SUBJECT}&arm=B`);
      expect(res.body).toEqual({ offer: 'tea-reading', arm: 'A', cents: 3500, label: '$35' });
      expect(resolveBe04Price).toHaveBeenCalledWith(SUBJECT);
    } finally {
      offer.readyForMoney = false;
    }
  });

  it('⛔ the preview never reaches checkout — a previewed $45 page is refused with the real $35', async () => {
    const quote = await request(app).get('/api/backend/offers/tea-reading/price?arm=B');
    expect(quote.body.cents).toBe(4500);
    const res = await checkout({ quotedArm: quote.body.arm });
    expect(res.status).toBe(409);
    expect(res.body.current).toEqual({ arm: 'A', cents: 3500, label: '$35' });
    expect(create).not.toHaveBeenCalled();
  });

  it('404s an unknown offer and an offer with no price test', async () => {
    expect((await request(app).get('/api/backend/offers/hex-her/price')).status).toBe(404);
    expect((await request(app).get('/api/backend/offers/twin-flame/price')).status).toBe(404);
    expect(resolveBe04Price).not.toHaveBeenCalled();
  });
});

// ─── 3 · the upsells carry her arm ─────────────────────────────────────────────

function paidBooking(metadata: Record<string, string>) {
  return {
    id: SESSION,
    payment_status: 'paid',
    customer: 'cus_04',
    customer_details: { email: 'she@example.com', name: 'Sarah Smith' },
    payment_intent: { status: 'succeeded', payment_method: 'pm_04' },
    metadata,
  };
}
const BOOKING_04 = {
  product: 'be_tea_reading',
  offer: 'tea-reading',
  firstName: 'Sarah',
  expSubject: SUBJECT,
  priceExp: 'be_04_price_2026',
  priceArm: 'B',
  posthogDistinctId: 'ph_04',
};

describe('the upsell charges carry 04\'s price arm', () => {
  it('1-click: the PaymentIntent carries expSubject / priceExp / priceArm off the booking', async () => {
    retrieve.mockResolvedValue(paidBooking(BOOKING_04));
    const res = await request(app)
      .post('/api/backend/upsell/charge')
      .send({ checkoutSessionId: SESSION, email: 'she@example.com' });
    expect(res.body).toMatchObject({ success: true });
    expect((state.piCreated as any).metadata).toMatchObject({
      product: 'be_protection_ritual',
      offer: 'tea-reading',
      originalSession: SESSION,
      flow: '1click',
      expSubject: SUBJECT,
      priceExp: 'be_04_price_2026',
      priceArm: 'B',
      posthogDistinctId: 'ph_04',
    });
  });

  it('hosted fallback: the Checkout session carries them too', async () => {
    retrieve.mockResolvedValue(paidBooking(BOOKING_04));
    const res = await request(app)
      .post('/api/backend/upsell/fallback-checkout')
      .send({ checkoutSessionId: SESSION, email: 'she@example.com', product: 'be_bracelet' });
    expect(res.status).toBe(200);
    expect((state.created as any).metadata).toMatchObject({
      product: 'be_bracelet',
      offer: 'tea-reading',
      originalSession: SESSION,
      expSubject: SUBJECT,
      priceExp: 'be_04_price_2026',
      priceArm: 'B',
    });
  });

  it('another offer\'s upsell metadata is unchanged — no price arm, no subject', async () => {
    retrieve.mockResolvedValue(paidBooking({ product: 'be_twin_flame', offer: 'twin-flame', expSubject: SUBJECT }));
    await request(app).post('/api/backend/upsell/charge').send({ checkoutSessionId: SESSION, email: 'she@example.com' });
    const meta = (state.piCreated as any).metadata;
    for (const key of ['priceExp', 'priceArm', 'expSubject']) expect(meta, key).not.toHaveProperty(key);

    await request(app)
      .post('/api/backend/upsell/fallback-checkout')
      .send({ checkoutSessionId: SESSION, email: 'she@example.com' });
    const hosted = (state.created as any).metadata;
    for (const key of ['priceExp', 'priceArm', 'expSubject']) expect(hosted, key).not.toHaveProperty(key);
  });
});

// ─── 4 · the receipt ───────────────────────────────────────────────────────────

describe('GET /api/backend/order/:sessionId — 04 receipt', () => {
  it('is always 24 hours — the Double Turning is not a speed bump — and never names the drawn cup', async () => {
    state.order = paidRow({ bumpPurchased: true });
    const res = await request(app).get(`/api/backend/order/${SESSION}?offer=tea-reading`);
    expect(res.status).toBe(200);
    expect(res.body.order).toMatchObject({
      offer: 'tea-reading',
      offerNumber: '04',
      bumpPurchased: true,
      bumpProductKey: 'double_turning',
      deliveryHours: 24,
    });
    expect(res.body.order).not.toHaveProperty('cup');
    // The receipt no longer needs the session's metadata at all.
    expect(retrieve).not.toHaveBeenCalled();
  });

  it('24 hours without the bump too', async () => {
    state.order = paidRow({ bumpPurchased: false, bumpCents: 0, bumpProductKey: null, amountCents: 3500 });
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.body.order).toMatchObject({ deliveryHours: 24, bumpPurchased: false });
    expect(res.body.order).not.toHaveProperty('cup');
  });

  it('a Stripe outage cannot touch a receipt whose order is on record', async () => {
    state.order = paidRow();
    retrieve.mockRejectedValue(new Error('stripe down'));
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.status).toBe(200);
    expect(res.body.order.deliveryHours).toBe(24);
    expect(res.body.order).not.toHaveProperty('cup');
  });

  it('when the redirect beats the webhook: one Stripe read (the payment), still no cup', async () => {
    state.order = null;
    recordBackendOrder.mockResolvedValueOnce(paidRow() as never);
    retrieve.mockResolvedValue({
      id: SESSION,
      payment_status: 'paid',
      metadata: { product: 'be_tea_reading', offer: 'tea-reading', cup: 'sunken-leaf', cupDrawn: '1' },
    });
    const res = await request(app).get(`/api/backend/order/${SESSION}?offer=tea-reading`);
    expect(res.status).toBe(200);
    expect(res.body.order).not.toHaveProperty('cup');
    expect(retrieve).toHaveBeenCalledTimes(1);
  });

  it('08 keeps its 12-hour bump rule, and carries no cup', async () => {
    state.order = paidRow({
      offer: 'marcus-reading',
      offerNumber: '08',
      bumpPurchased: true,
      bumpProductKey: 'marcus_speed',
    });
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.body.order.deliveryHours).toBe(12);
    expect(res.body.order).not.toHaveProperty('cup');
    expect(retrieve).not.toHaveBeenCalled();

    state.order = paidRow({ offer: 'marcus-reading', offerNumber: '08', bumpPurchased: false });
    const noBump = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(noBump.body.order.deliveryHours).toBe(24);
  });

  it('another offer\'s receipt cannot be read through ?offer=tea-reading', async () => {
    state.order = paidRow({ offer: 'twin-flame', offerNumber: '02' });
    const res = await request(app).get(`/api/backend/order/${SESSION}?offer=tea-reading`);
    expect(res.status).toBe(404);
  });
});
