// 04 · The Turn on the backend checkout router (server/routes/backendOffers.ts), with Stripe
// and the order helpers mocked — same style as backendOffers.heartCleanser.test.ts.
//
//   npx vitest run server/routes/backendOffers.teaReading.test.ts
//
// What these pin down:
//  1. CHECKOUT CHARGES THE SERVER'S RUNG, writes `rung` / `cup` / `cupChosen` to Stripe
//     metadata, and refuses an expired quoted price with a 409 `price_changed` that carries
//     today's price. Nothing posted — amountCents, tier, an invalid cup — changes the price or
//     blocks the sale.
//  2. THE QUOTE ENDPOINT prints today's price; its `?day=` preview is display-only and never
//     reaches what checkout charges.
//  3. THE RECEIPT: 04 is always 24 hours (the Still Cup is not a speed bump) while 08 keeps
//     12 with its bump; 04's receipt names her cup.
//  4. OTHER OFFERS ARE UNTOUCHED: no rung/cup on their metadata, no cup on their receipt.

import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SESSION = 'cs_test_04_order_1';
const START = '2026-10-12T10:30:00Z';
const START_MS = Date.parse(START);
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const state = {
  liftGate: true,
  created: null as Record<string, unknown> | null,
  order: null as Record<string, unknown> | null,
};

vi.mock('../lib/db', () => ({ db: {} }));
vi.mock('../lib/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../lib/experiments', () => ({
  resolveBeBookingTreatment: vi.fn(async () => ({ treatment: 'page' })),
}));
vi.mock('../lib/backendCustomerList', () => ({
  BACKEND_UPSELLS: { be_08_marcus_audio: { productKey: 'be_08_marcus_audio', priceCents: 1700 } },
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
const retrieve = vi.fn();
vi.mock('../lib/stripeAccount', () => ({
  getStripe: () => ({ checkout: { sessions: { create, retrieve } } }),
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

const { BACKEND_OFFER_CATALOG } = await import('@shared/backendOffers');
const { default: router } = await import('./backendOffers');
const app = express();
app.use(express.json());
app.use('/api/backend', router);

const ORIGINAL_START = process.env.BE04_LADDER_START;

/** Freeze the server's clock `offsetMs` after the letter went out. Only Date is faked. */
function at(offsetMs: number) {
  vi.setSystemTime(new Date(START_MS + offsetMs));
}

const checkout = (body: Record<string, unknown>) =>
  request(app).post('/api/backend/checkout').send({ offer: 'tea-reading', treatment: 'page', ...body });

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
    bumpProductKey: 'still_cup',
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
  vi.useFakeTimers({ toFake: ['Date'] });
  at(HOUR);
  process.env.BE04_LADDER_START = START;
  state.liftGate = true;
  state.created = null;
  state.order = null;
  for (const fn of [getBeOrderBySession, writeToCustomerList, recordBackendOrder, saveOrderIntake, create]) {
    fn.mockClear();
  }
  retrieve.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  if (ORIGINAL_START === undefined) delete process.env.BE04_LADDER_START;
  else process.env.BE04_LADDER_START = ORIGINAL_START;
});

// ─── 1 · checkout ──────────────────────────────────────────────────────────────

describe('POST /api/backend/checkout — 04', () => {
  it('opens a one-line, no-shipping session at the server\'s day-1 price', async () => {
    const res = await checkout({ quotedDay: 1, cup: 'sunken-leaf' });
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
      rung: '1',
      cup: 'sunken-leaf',
      cupChosen: '1',
    });
    expect(p.metadata).not.toHaveProperty('bumpProduct');
    expect(p.metadata).not.toHaveProperty('tier');
    expect(p.payment_intent_data.description).toBe('BE 04 · The Turn — tea-leaf reading by Evelyn Cross');
    expect(p.success_url).toMatch(/\/offers\/upsell\/welcome1\?session_id=\{CHECKOUT_SESSION_ID\}$/);
    expect(p.cancel_url).toMatch(/\/offers\/wiccan\/tea-reading\?cancelled=1$/);
    // 04 parks nothing on be_order_intake — the cup rides Stripe metadata.
    expect(saveOrderIntake).not.toHaveBeenCalled();
  });

  it('the chat treatment cancels back to the chat', async () => {
    await checkout({ treatment: 'chat' });
    expect((state.created as any).cancel_url).toMatch(/\/offers\/wiccan\/tea-reading\/chat\?cancelled=1$/);
  });

  it('charges each day\'s rung and stamps it on metadata', async () => {
    for (const [offset, rung, cents] of [[DAY + 3 * HOUR, '2', 4700], [2 * DAY + 3 * HOUR, '3', 5700], [30 * DAY, '4', 6700]] as const) {
      at(offset);
      const res = await checkout({});
      expect(res.status).toBe(200);
      const p = state.created as any;
      expect(p.line_items[0].price_data.unit_amount, rung).toBe(cents);
      expect(p.metadata.rung).toBe(rung);
      expect(p.metadata.readingCents).toBe(String(cents));
    }
  });

  it('adds The Still Cup as a second line under its own key, at every rung', async () => {
    at(DAY + 3 * HOUR);
    const res = await checkout({ bump: true });
    expect(res.status).toBe(200);
    const p = state.created as any;
    expect(p.line_items.map((l: any) => [l.price_data.product_data.name, l.price_data.unit_amount])).toEqual([
      ['The Turn — tea-leaf reading by Evelyn Cross', 4700],
      ['The Still Cup', 1277],
    ]);
    expect(p.metadata).toMatchObject({ bump: '1', bumpProduct: 'still_cup', rung: '2' });
    expect(p.payment_intent_data.description).toBe('BE 04 · The Turn — tea-leaf reading by Evelyn Cross + The Still Cup');
  });

  it('a missing cup is the divided rim, cupChosen 0', async () => {
    await checkout({});
    expect((state.created as any).metadata).toMatchObject({ cup: 'divided-rim', cupChosen: '0' });
  });

  it('an invalid cup never blocks the sale — it becomes the default', async () => {
    const res = await checkout({ cup: '<script>' });
    expect(res.status).toBe(200);
    expect((state.created as any).metadata).toMatchObject({ cup: 'divided-rim', cupChosen: '0' });
  });

  it('a tampered amountCents / tier cannot change the ladder price', async () => {
    at(DAY + 3 * HOUR);
    const res = await checkout({ amountCents: 1, tier: 'spread', quotedDay: 2 });
    expect(res.status).toBe(200);
    expect((state.created as any).line_items[0].price_data.unit_amount).toBe(4700);
    expect((state.created as any).metadata).not.toHaveProperty('tier');
  });

  it('honours yesterday\'s price inside the grace window (+119 min)', async () => {
    at(DAY + 119 * MIN);
    const res = await checkout({ quotedDay: 1 });
    expect(res.status).toBe(200);
    expect((state.created as any).line_items[0].price_data.unit_amount).toBe(3500);
    expect((state.created as any).metadata.rung).toBe('1');
  });

  it('refuses it past the window (+121 min) with 409 price_changed and today\'s price', async () => {
    at(DAY + 121 * MIN);
    const res = await checkout({ quotedDay: 1 });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'price_changed', current: { day: 2, cents: 4700, label: '$47' } });
    expect(typeof res.body.error).toBe('string');
    expect(create).not.toHaveBeenCalled();
  });

  it('a quotedDay higher than today is charged today\'s lower rung', async () => {
    const res = await checkout({ quotedDay: 4 });
    expect(res.status).toBe(200);
    expect((state.created as any).line_items[0].price_data.unit_amount).toBe(3500);
  });

  it('an unset start charges day 1, however late it is', async () => {
    delete process.env.BE04_LADDER_START;
    at(30 * DAY);
    const res = await checkout({});
    expect(res.status).toBe(200);
    expect((state.created as any).line_items[0].price_data.unit_amount).toBe(3500);
  });

  it('reads the start at call time — a changed env var moves the next charge', async () => {
    at(DAY + 3 * HOUR);
    await checkout({});
    expect((state.created as any).metadata.rung).toBe('2');
    process.env.BE04_LADDER_START = new Date(START_MS + DAY).toISOString();
    await checkout({});
    expect((state.created as any).metadata.rung).toBe('1');
  });

  it('is refused outright by committed code — readyForMoney is false', async () => {
    state.liftGate = false;
    const res = await checkout({ quotedDay: 1 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('not_ready');
    expect(create).not.toHaveBeenCalled();
  });
});

describe('POST /api/backend/checkout — other offers are untouched by the 04 fields', () => {
  it('02 ignores quotedDay and cup: same price, no rung, no cup on metadata', async () => {
    const res = await request(app)
      .post('/api/backend/checkout')
      .send({ offer: 'twin-flame', treatment: 'page', quotedDay: 3, cup: 'sunken-leaf' });
    expect(res.status).toBe(200);
    const p = state.created as any;
    expect(p.line_items[0].price_data.unit_amount).toBe(3500);
    expect(p.metadata).not.toHaveProperty('rung');
    expect(p.metadata).not.toHaveProperty('cup');
    expect(p.metadata).not.toHaveProperty('cupChosen');
  });

  it('03 still floor-checks its pay-what-you-want amount', async () => {
    const res = await request(app)
      .post('/api/backend/checkout')
      .send({ offer: 'judgement-day', treatment: 'page', amountCents: 2200, quotedDay: 1 });
    expect(res.status).toBe(200);
    expect((state.created as any).line_items[0].price_data.unit_amount).toBe(2200);
    expect((state.created as any).metadata).not.toHaveProperty('rung');
  });
});

// ─── 2 · the quote endpoint ────────────────────────────────────────────────────

describe('GET /api/backend/offers/:offer/price', () => {
  it('prints today\'s rung, uncached', async () => {
    at(DAY + 3 * HOUR);
    const res = await request(app).get('/api/backend/offers/tea-reading/price');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ offer: 'tea-reading', day: 2, cents: 4700, label: '$47', startSet: true });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('says startSet:false and day 1 when the start is unset', async () => {
    delete process.env.BE04_LADDER_START;
    at(30 * DAY);
    const res = await request(app).get('/api/backend/offers/tea-reading/price');
    expect(res.body).toEqual({ offer: 'tea-reading', day: 1, cents: 3500, label: '$35', startSet: false });
  });

  it('?day=N previews another rung while the offer is not open for money, flagged preview', async () => {
    const res = await request(app).get('/api/backend/offers/tea-reading/price?day=3');
    expect(res.body).toEqual({ offer: 'tea-reading', day: 3, cents: 5700, label: '$57', startSet: true, preview: true });
    const past = await request(app).get('/api/backend/offers/tea-reading/price?day=9');
    expect(past.body).toMatchObject({ day: 4, cents: 6700, preview: true });
  });

  it('ignores a nonsense ?day=', async () => {
    for (const day of ['0', '-2', '1.5', 'abc', '']) {
      const res = await request(app).get(`/api/backend/offers/tea-reading/price?day=${day}`);
      expect(res.body, day).toEqual({ offer: 'tea-reading', day: 1, cents: 3500, label: '$35', startSet: true });
    }
  });

  it('⛔ ignores ?day= once the offer is open for money', async () => {
    const offer = BACKEND_OFFER_CATALOG['tea-reading'];
    offer.readyForMoney = true;
    try {
      const res = await request(app).get('/api/backend/offers/tea-reading/price?day=3');
      expect(res.body).toEqual({ offer: 'tea-reading', day: 1, cents: 3500, label: '$35', startSet: true });
    } finally {
      offer.readyForMoney = false;
    }
  });

  it('⛔ the preview never reaches checkout — a previewed day-3 page is charged the real day-1 rung', async () => {
    const quote = await request(app).get('/api/backend/offers/tea-reading/price?day=3');
    expect(quote.body.cents).toBe(5700);
    const res = await checkout({ quotedDay: quote.body.day });
    expect(res.status).toBe(200);
    expect((state.created as any).line_items[0].price_data.unit_amount).toBe(3500);
    expect((state.created as any).metadata.rung).toBe('1');
  });

  it('404s an unknown offer and an offer with no ladder', async () => {
    expect((await request(app).get('/api/backend/offers/hex-her/price')).status).toBe(404);
    expect((await request(app).get('/api/backend/offers/twin-flame/price')).status).toBe(404);
  });
});

// ─── 3 · the receipt ───────────────────────────────────────────────────────────

describe('GET /api/backend/order/:sessionId — 04 receipt', () => {
  it('is always 24 hours — the Still Cup is not a speed bump — and names her cup', async () => {
    state.order = paidRow({ bumpPurchased: true });
    retrieve.mockResolvedValue({ id: SESSION, metadata: { product: 'be_tea_reading', cup: 'turned-handle' } });
    const res = await request(app).get(`/api/backend/order/${SESSION}?offer=tea-reading`);
    expect(res.status).toBe(200);
    expect(res.body.order).toMatchObject({
      offer: 'tea-reading',
      offerNumber: '04',
      bumpPurchased: true,
      bumpProductKey: 'still_cup',
      deliveryHours: 24,
      cup: 'turned-handle',
    });
  });

  it('24 hours without the bump too', async () => {
    state.order = paidRow({ bumpPurchased: false, bumpCents: 0, bumpProductKey: null, amountCents: 3500 });
    retrieve.mockResolvedValue({ id: SESSION, metadata: { cup: 'divided-rim' } });
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.body.order).toMatchObject({ deliveryHours: 24, bumpPurchased: false, cup: 'divided-rim' });
  });

  it('a Stripe failure costs only the cup line — null, never a guessed cup', async () => {
    state.order = paidRow();
    retrieve.mockRejectedValue(new Error('stripe down'));
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.status).toBe(200);
    expect(res.body.order.cup).toBeNull();
    expect(res.body.order.deliveryHours).toBe(24);
  });

  it('when the redirect beats the webhook, reads the cup off the session it already has', async () => {
    state.order = null;
    recordBackendOrder.mockResolvedValueOnce(paidRow() as never);
    retrieve.mockResolvedValue({
      id: SESSION,
      payment_status: 'paid',
      metadata: { product: 'be_tea_reading', offer: 'tea-reading', cup: 'sunken-leaf' },
    });
    const res = await request(app).get(`/api/backend/order/${SESSION}?offer=tea-reading`);
    expect(res.status).toBe(200);
    expect(res.body.order.cup).toBe('sunken-leaf');
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
