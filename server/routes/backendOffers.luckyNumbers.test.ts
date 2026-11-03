// 12 Lucky Numbers on the backend checkout router (server/routes/backendOffers.ts), with Stripe,
// the DB helpers and the catalog gate mocked — the same style as backendOffers.unsentLetter.test.ts.
// BACKEND_UPSELLS is the REAL table, so the Wish Ritual's prices are the ones that would charge.
//
//   npx vitest run server/routes/backendOffers.luckyNumbers.test.ts
//
// What these pin down:
//  1. THE GATE REFUSES MONEY. `readyForMoney: false`.
//  2. HER BIRTH DETAILS AND FIRST NAME NEVER REACH STRIPE. ?c= does ride, for both letter arms.
//  3. INVALID FIELDS ARE REFUSED BEFORE STRIPE (11's rules, shared through takesBirthIntake).
//  4. THE BUMP ARITHMETIC: $35, or $47.77 with The Full Year, as two Stripe lines.
//  5. THE INTAKE ROW, and the upsells use ?fn= from it, never the name on the card.
//  6. U1 IS 12's OWN PRODUCT: user-data names it with $47 / $30, Path A is found by it, and the
//     charge bills $47 or $30 on it. Every other offer still gets the Protection Ritual, unchanged.
//  7. THE RECEIPT IS ALWAYS 24 HOURS.
//  8. THE GIFT HANDOFF ANSWERS FOR A PAID 12 ORDER ONLY, from the order's own email. 11's handoff
//     still answers for 11 only.

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SESSION = 'cs_test_lucky_1';

const state = {
  liftGate: true,
  created: null as Record<string, any> | null,
  order: null as Record<string, unknown> | null,
  pis: [] as Record<string, unknown>[],
};

vi.mock('../lib/db', () => ({ db: {} }));
vi.mock('../lib/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../lib/experiments', () => ({
  resolveBeBookingTreatment: vi.fn(async () => ({ treatment: 'page' })),
  resolveBe04Price: vi.fn(async () => null),
}));
vi.mock('../lib/be08Editions', () => ({
  getBe08Edition: vi.fn(async () => null),
  listPublishedBe08Editions: vi.fn(async () => []),
}));
vi.mock('../lib/be08Draw', () => ({ BE_08_DECK: [] }));
const giftHandoff = vi.fn(async (email: string, firstName: string | null) => ({ mode: 'signup', email, firstName }));
vi.mock('../lib/evelynThankyouGift', () => ({
  EVELYN_TY_FREE_COINS: 1495,
  resolveEvelynTyHandoff: (email: string, firstName: string | null) => giftHandoff(email, firstName),
  loadEvelynTyBrief: vi.fn(),
  buildEvelynTyBriefSection: vi.fn(),
  buildEvelynTyGreetingInstruction: vi.fn(),
}));

const saveOrderIntake = vi.fn(async (_intake: Record<string, unknown>) => true);
const intakeFirstName = vi.fn(async (_session: string) => null as string | null);
vi.mock('../lib/beOrders', () => ({
  getBeOrderBySession: vi.fn(async () => state.order),
  writeToCustomerList: vi.fn(async (row: unknown) => row),
  recordBackendOrder: vi.fn(async () => null),
  saveOrderIntake: (intake: Record<string, unknown>) => saveOrderIntake(intake),
  intakeFirstName: (session: string) => intakeFirstName(session),
}));

const create = vi.fn(async (params: Record<string, any>) => {
  state.created = params;
  return { id: SESSION, url: `https://checkout.stripe.test/${SESSION}` };
});
const retrieve = vi.fn();
const piList = vi.fn(async () => ({ data: state.pis }));
const piCreate = vi.fn(async (params: Record<string, any>) => ({ id: 'pi_upsell_1', ...params }));
vi.mock('../lib/stripeAccount', () => ({
  getStripe: () => ({
    checkout: { sessions: { create, retrieve } },
    paymentIntents: { list: piList, create: piCreate },
  }),
  getActiveStripeSecretKey: () => 'sk_test_placeholder_lucky',
}));

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
const { BACKEND_UPSELLS } = await import('../lib/backendCustomerList');
const { default: router } = await import('./backendOffers');
const app = express();
app.use(express.json());
app.use('/api/backend', router);

beforeEach(() => {
  state.liftGate = true;
  state.created = null;
  state.order = null;
  state.pis = [];
  for (const fn of [saveOrderIntake, intakeFirstName, create, retrieve, piList, piCreate]) fn.mockClear();
  retrieve.mockReset();
  intakeFirstName.mockResolvedValue(null);
});

const checkoutBody = (overrides: Record<string, unknown> = {}) => ({
  offer: 'lucky-numbers',
  treatment: 'page',
  bump: false,
  firstName: 'Sarah',
  letterCode: '3',
  fullBirthName: 'Sarah Jane Miller',
  dateOfBirth: '1961-03-14',
  ...overrides,
});

const post = (overrides?: Record<string, unknown>) =>
  request(app).post('/api/backend/checkout').send(checkoutBody(overrides));

describe('1 · the gate', () => {
  it('12 is not ready for money, in the real catalog', () => {
    expect(BACKEND_OFFER_CATALOG['lucky-numbers'].readyForMoney).toBe(false);
  });

  it('refuses a perfect checkout, and nothing reaches Stripe or the intake', async () => {
    state.liftGate = false;
    const res = await post();
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(create).not.toHaveBeenCalled();
    expect(saveOrderIntake).not.toHaveBeenCalled();
  });
});

describe('2 · her details stay off Stripe', () => {
  it('nothing she typed, and not her ?fn= name, is anywhere in what Stripe receives', async () => {
    const res = await post({ bump: true });
    expect(res.status).toBe(200);
    const sent = JSON.stringify(state.created);
    for (const secret of ['Sarah', 'Miller', '1961', '03-14']) expect(sent).not.toContain(secret);
    expect(state.created!.custom_fields).toBeUndefined();
    expect(state.created!.shipping_address_collection).toBeUndefined();
  });

  it.each([['arm A', '3'], ['arm B', '13']])('?c= rides on the metadata (%s)', async (_arm, c) => {
    await post({ letterCode: c });
    expect(state.created!.metadata).toMatchObject({ product: 'be_lucky_numbers', offer: 'lucky-numbers', c });
    expect(state.created!.metadata).not.toHaveProperty('funnel');
  });
});

describe('3 · invalid fields are refused before Stripe', () => {
  it.each([
    ['no birth name', { fullBirthName: undefined }, 'birth_name_missing'],
    ['one word', { fullBirthName: 'Sarah' }, 'birth_name_invalid'],
    ['no date', { dateOfBirth: undefined }, 'dob_missing'],
    ['31 February', { dateOfBirth: '1961-02-31' }, 'dob_invalid'],
    ['under 18', { dateOfBirth: '2015-01-01' }, 'dob_underage'],
  ])('%s', async (_name, overrides, code) => {
    const res = await post(overrides);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(code);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('4 · the money', () => {
  const lines = () =>
    state.created!.line_items.map((l: any) => ({
      name: l.price_data.product_data.name,
      cents: l.price_data.unit_amount,
    }));

  it('$35 with no bump, one line', async () => {
    await post({ bump: false });
    expect(lines()).toEqual([{ name: 'Lucky Numbers — a reading by Evelyn Cross', cents: 3500 }]);
  });

  it('$47.77 with The Full Year, on its own line and its own product key', async () => {
    await post({ bump: true });
    expect(lines()).toEqual([
      { name: 'Lucky Numbers — a reading by Evelyn Cross', cents: 3500 },
      { name: 'The Full Year', cents: 1277 },
    ]);
    expect(state.created!.metadata).toMatchObject({ bump: '1', bumpProduct: 'full_year' });
  });

  it('a price from the browser changes nothing', async () => {
    await post({ amountCents: 1, priceCents: 1 });
    expect(lines().reduce((s: number, l: { cents: number }) => s + l.cents, 0)).toBe(3500);
  });

  it('a cancel returns to the booking page; payment goes to the shared upsells', async () => {
    await post();
    expect(state.created!.cancel_url).toMatch(/\/numerology\/lucky-numbers\?cancelled=1$/);
    expect(state.created!.success_url).toContain('/offers/upsell/welcome1');
  });
});

describe('5 · the intake row, and the name the upsells use', () => {
  it('parks her birth name, date and ?fn= name', async () => {
    await post();
    expect(saveOrderIntake.mock.calls[0][0]).toMatchObject({
      stripeSessionId: SESSION,
      offer: 'lucky-numbers',
      fullBirthName: 'Sarah Jane Miller',
      dateOfBirth: '1961-03-14',
      firstName: 'Sarah',
    });
  });

  it('user-data reads the ?fn= name from the intake, never the card', async () => {
    retrieve.mockResolvedValue({
      id: SESSION,
      payment_status: 'paid',
      customer_details: { name: 'Robert Q Cardholder', email: 'she@example.com' },
      metadata: { product: 'be_lucky_numbers', offer: 'lucky-numbers' },
    });
    intakeFirstName.mockResolvedValue('Sarah');
    const res = await request(app).get(`/api/backend/upsell/user-data?session_id=${SESSION}`);
    expect(res.body.firstName).toBe('Sarah');
    expect(JSON.stringify(res.body)).not.toContain('Cardholder');
  });
});

describe("6 · U1 is 12's own product, and nobody else's changes", () => {
  it('the Wish Ritual is its own be_ row: $47, downsell $30, its own tag', () => {
    expect(BACKEND_OFFER_CATALOG['lucky-numbers'].upsell1Product).toBe('be_citrine_wish_ritual');
    expect(BACKEND_UPSELLS.be_citrine_wish_ritual).toMatchObject({
      productKey: 'be_citrine_wish_ritual',
      priceCents: 4700,
      downsellCents: 3000,
      tagSuffix: 'upsell1-wish-ritual',
    });
    // The Protection Ritual is untouched: still no downsell.
    expect(BACKEND_UPSELLS.be_protection_ritual.downsellCents).toBeUndefined();
    // Only 12 names an own U1 product.
    const named = Object.values(BACKEND_OFFER_CATALOG).filter((o) => o.upsell1Product);
    expect(named.map((o) => o.key)).toEqual(['lucky-numbers']);
  });

  const paid = (product: string, offer: string) => ({
    id: SESSION,
    payment_status: 'paid',
    customer: 'cus_1',
    customer_details: { email: 'she@example.com' },
    metadata: { product, offer, firstName: 'Ann' },
  });

  it('user-data on 12 names the product and both prices', async () => {
    retrieve.mockResolvedValue(paid('be_lucky_numbers', 'lucky-numbers'));
    const res = await request(app).get(`/api/backend/upsell/user-data?session_id=${SESSION}`);
    expect(res.body).toMatchObject({
      upsell1Product: 'be_citrine_wish_ritual',
      upsell1PriceCents: 4700,
      upsell1DownsellCents: 3000,
      upsellPurchased: false,
    });
  });

  it('Path A on 12 is found by the Wish Ritual payment, not the Protection Ritual', async () => {
    retrieve.mockResolvedValue(paid('be_lucky_numbers', 'lucky-numbers'));
    state.pis = [{ status: 'succeeded', metadata: { product: 'be_protection_ritual' } }];
    let res = await request(app).get(`/api/backend/upsell/user-data?session_id=${SESSION}`);
    expect(res.body.upsellPurchased).toBe(false);

    state.pis = [{ status: 'succeeded', metadata: { product: 'be_citrine_wish_ritual' } }];
    res = await request(app).get(`/api/backend/upsell/user-data?session_id=${SESSION}`);
    expect(res.body.upsellPurchased).toBe(true);
  });

  it.each([
    ['be_unsent_letter', 'unsent-letter'],
    ['be_tea_reading', 'tea-reading'],
    ['be_twin_flame', 'twin-flame'],
  ])('%s: no upsell1Product key, the Protection Ritual price, Path A by the Protection Ritual', async (product, offer) => {
    retrieve.mockResolvedValue(paid(product, offer));
    state.pis = [{ status: 'succeeded', metadata: { product: 'be_protection_ritual' } }];
    const res = await request(app).get(`/api/backend/upsell/user-data?session_id=${SESSION}`);
    expect(res.body).not.toHaveProperty('upsell1Product');
    expect(res.body).not.toHaveProperty('upsell1DownsellCents');
    expect(res.body.upsell1PriceCents).toBe(4700);
    expect(res.body.upsellPurchased).toBe(true);
  });

  const paidWithCard = {
    ...paid('be_lucky_numbers', 'lucky-numbers'),
    payment_intent: { status: 'succeeded', payment_method: 'pm_1' },
  };
  const charge = (body: Record<string, unknown>) =>
    request(app)
      .post('/api/backend/upsell/charge')
      .send({ checkoutSessionId: SESSION, email: 'she@example.com', ...body });

  it('the Wish Ritual charges $47, or $30 on the downsell tier', async () => {
    retrieve.mockResolvedValue(paidWithCard);
    let res = await charge({ product: 'be_citrine_wish_ritual' });
    expect(res.body.success).toBe(true);
    expect(piCreate.mock.calls[0][0]).toMatchObject({ amount: 4700, metadata: { product: 'be_citrine_wish_ritual' } });

    res = await charge({ product: 'be_citrine_wish_ritual', tier: 'downsell' });
    expect(piCreate.mock.calls[1][0]).toMatchObject({
      amount: 3000,
      metadata: { product: 'be_citrine_wish_ritual', type: 'downsell' },
    });
  });

  it('the lean body (every offer before 12) is still the Protection Ritual at $47', async () => {
    retrieve.mockResolvedValue(paidWithCard);
    await charge({});
    expect(piCreate.mock.calls[0][0]).toMatchObject({ amount: 4700, metadata: { product: 'be_protection_ritual' } });
    // …and a downsell tier on it can't lower the price: it has no downsell.
    await charge({ tier: 'downsell' });
    expect(piCreate.mock.calls[1][0].amount).toBe(4700);
  });
});

describe('7 · the receipt', () => {
  const paidRow = (overrides: Record<string, unknown> = {}) => ({
    stripeSessionId: SESSION,
    offer: 'lucky-numbers',
    offerNumber: '12',
    status: 'paid',
    firstName: 'Sarah',
    bumpPurchased: false,
    bumpCents: 0,
    bumpProductKey: null,
    amountCents: 3500,
    readingCents: 3500,
    deliveredAt: null,
    createdAt: new Date(),
    ...overrides,
  });

  it('is 24 hours with or without The Full Year', async () => {
    state.order = paidRow({ bumpPurchased: true, bumpCents: 1277, bumpProductKey: 'full_year', amountCents: 4777 });
    let res = await request(app).get(`/api/backend/order/${SESSION}?offer=lucky-numbers`);
    expect(res.body.order).toMatchObject({ offer: 'lucky-numbers', bumpPurchased: true, deliveryHours: 24 });
    state.order = paidRow();
    res = await request(app).get(`/api/backend/order/${SESSION}?offer=lucky-numbers`);
    expect(res.body.order.deliveryHours).toBe(24);
  });

  it("another offer's order cannot be read through ?offer=lucky-numbers", async () => {
    state.order = paidRow({ offer: 'unsent-letter', offerNumber: '11' });
    const res = await request(app).get(`/api/backend/order/${SESSION}?offer=lucky-numbers`);
    expect(res.status).toBe(404);
  });
});

describe('8 · the gift handoff', () => {
  const paidOrder = { offer: 'lucky-numbers', status: 'paid', email: 'sarah@example.com', firstName: 'Sarah' };
  const post = (body: unknown, offer = 'lucky-numbers') =>
    request(app).post(`/api/backend/${offer}/gift-handoff`).send(body as object);

  beforeEach(() => giftHandoff.mockClear());

  it('a paid 12 order gets its handoff, from the order’s own email', async () => {
    state.order = paidOrder;
    const res = await post({ sessionId: SESSION, email: 'someone-else@example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mode: 'signup', email: 'sarah@example.com', firstName: 'Sarah' });
  });

  it('no session id: 400', async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ sessionId: 7 })).status).toBe(400);
  });

  it.each([
    ['no order', null],
    ['11’s order', { ...paidOrder, offer: 'unsent-letter' }],
    ['refunded', { ...paidOrder, status: 'refunded' }],
    ['no email', { ...paidOrder, email: null }],
  ])('%s: 404, and no login token is minted', async (_name, row) => {
    state.order = row;
    expect((await post({ sessionId: SESSION })).status).toBe(404);
    expect(giftHandoff).not.toHaveBeenCalled();
  });

  it('a failure is a 500, not a crash', async () => {
    state.order = paidOrder;
    giftHandoff.mockRejectedValueOnce(new Error('db down'));
    expect((await post({ sessionId: SESSION })).status).toBe(500);
  });

  it('11’s handoff will not answer for a 12 order', async () => {
    state.order = paidOrder;
    expect((await post({ sessionId: SESSION }, 'unsent-letter')).status).toBe(404);
    expect(giftHandoff).not.toHaveBeenCalled();
  });
});
