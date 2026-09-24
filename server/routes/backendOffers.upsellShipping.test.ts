// The post-purchase upsells must not ask a backend buyer for an address she already
// gave at checkout (operator decision, Joel 2026-09-16: "skip").
//
//   npx vitest run server/routes/backendOffers.upsellShipping.test.ts
//
// The client half is client/src/lib/upsellShipping.test.ts. This is the server half —
// what the upsell endpoints must do so that SKIPPING the form loses nothing:
//
//  1. /upsell/user-data REPORTS THE BOOKING SESSION'S ADDRESS for a `collectsShipping`
//     offer, so the page knows it has one (hasShipping) without a U1 purchase.
//  2. /upsell/charge COPIES THAT ADDRESS ONTO THE UPSELL PaymentIntent — the same place
//     the manual shipper reads today (/upsell/shipping writes it there).
//  3. ⛔ A BACKEND OFFER WITHOUT `collectsShipping` (02, 03) IS UNCHANGED: no address is
//     invented for it, so its upsell still asks.
//  4. A BOOKING SESSION WITH NO USABLE ADDRESS falls back to today's behaviour.

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/db', () => ({ db: {} }));
vi.mock('../lib/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../lib/experiments', () => ({
  resolveBeBookingTreatment: vi.fn(async () => ({ treatment: 'page' })),
}));
vi.mock('../lib/beOrders', () => ({
  getBeOrderBySession: vi.fn(async () => null),
  writeToCustomerList: vi.fn(async (r: unknown) => r),
  recordBackendOrder: vi.fn(async () => null),
  saveOrderIntake: vi.fn(async () => true),
}));
vi.mock('../lib/beShipments', () => ({
  ensureBackendShipment: vi.fn(async () => null),
  publicShipping: vi.fn(() => ({ shipping: null, shippingAddress: null })),
}));
vi.mock('../lib/be08Editions', () => ({
  getBe08Edition: vi.fn(async () => null),
  listPublishedBe08Editions: vi.fn(async () => []),
}));
vi.mock('../lib/be08Draw', () => ({ BE_08_DECK: [] }));
// ⛔ backendCustomerList stays REAL — BACKEND_UPSELLS is what prices the charge.

const retrieveSession = vi.fn();
const createPI = vi.fn(async (params: Record<string, unknown>) => ({ id: 'pi_upsell_1', ...params }));
const listPIs = vi.fn(async () => ({ data: [] as Record<string, unknown>[] }));
vi.mock('../lib/stripeAccount', () => ({
  getStripe: () => ({
    checkout: { sessions: { retrieve: retrieveSession, create: vi.fn() } },
    paymentIntents: { create: createPI, list: listPIs, retrieve: vi.fn(), update: vi.fn() },
  }),
}));

const { default: router } = await import('./backendOffers');
const app = express();
app.use(express.json());
app.use('/api/backend', router);

const BOOKING = 'cs_test_booking_09';
const EMAIL = 'she@example.com';

const SHIPPING_DETAILS = {
  name: 'Sarah Rose',
  address: {
    line1: '1 Rose Lane',
    line2: 'Flat 2',
    city: 'Bath',
    state: 'Somerset',
    postal_code: 'BA1 1AA',
    country: 'GB',
  },
};

/** A PAID backend booking session, physical (09) unless told otherwise. */
function bookingSession(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING,
    payment_status: 'paid',
    customer: 'cus_09',
    customer_details: { email: EMAIL, name: 'Sarah Rose' },
    metadata: { product: 'be_heart_cleanser', offer: 'heart-cleanser', firstName: 'Sarah' },
    collected_information: { shipping_details: SHIPPING_DETAILS },
    payment_intent: { id: 'pi_booking_09', status: 'succeeded', payment_method: 'pm_card_1' },
    ...overrides,
  };
}

/** The same booking for a DIGITAL offer — Stripe collected no address. */
function digitalBookingSession(offer = 'twin-flame', product = 'be_twin_flame') {
  const s = bookingSession({ metadata: { product, offer, firstName: 'Sarah' } });
  delete (s as Record<string, unknown>).collected_information;
  return s;
}

beforeEach(() => {
  retrieveSession.mockReset();
  createPI.mockClear();
  listPIs.mockReset();
  listPIs.mockResolvedValue({ data: [] });
});

// ─── 1 · /upsell/user-data reports the address she already gave ─────────────────

describe('GET /api/backend/upsell/user-data', () => {
  it('reports the BOOKING session address for a physical offer, with no U1 purchase', async () => {
    retrieveSession.mockResolvedValue(bookingSession());
    const res = await request(app).get(`/api/backend/upsell/user-data?session_id=${BOOKING}`);
    expect(res.status).toBe(200);
    expect(res.body.hasShipping).toBe(true);
    expect(res.body.shipping).toEqual({
      name: 'Sarah Rose',
      line1: '1 Rose Lane',
      line2: 'Flat 2',
      city: 'Bath',
      state: 'Somerset',
      postal: 'BA1 1AA',
      country: 'GB',
    });
    // She has NOT bought Upsell 1 — the address came from the booking, not from a U1 PI.
    expect(res.body.upsellPurchased).toBe(false);
  });

  it('prefers an address she typed on the Upsell 1 form over the booking one', async () => {
    retrieveSession.mockResolvedValue(bookingSession());
    listPIs.mockResolvedValue({
      data: [
        {
          id: 'pi_u1',
          status: 'succeeded',
          metadata: { product: 'be_protection_ritual' },
          shipping: { name: 'Sarah At Work', address: { line1: '9 Office Way', city: 'Bristol', state: '', postal_code: 'BS1 1AA', country: 'GB' } },
        },
      ],
    });
    const res = await request(app).get(`/api/backend/upsell/user-data?session_id=${BOOKING}`);
    expect(res.body.upsellPurchased).toBe(true);
    expect(res.body.shipping.line1).toBe('9 Office Way');
  });

  it('⛔ a DIGITAL backend offer reports no address — its upsell must still ask', async () => {
    retrieveSession.mockResolvedValue(digitalBookingSession());
    const res = await request(app).get(`/api/backend/upsell/user-data?session_id=${BOOKING}`);
    expect(res.status).toBe(200);
    expect(res.body.hasShipping).toBe(false);
    expect(res.body.shipping).toBeNull();
  });

  it('falls back to no address when the physical booking carried none', async () => {
    const s = bookingSession();
    delete (s as Record<string, unknown>).collected_information;
    retrieveSession.mockResolvedValue(s);
    const res = await request(app).get(`/api/backend/upsell/user-data?session_id=${BOOKING}`);
    expect(res.body.hasShipping).toBe(false);
    expect(res.body.shipping).toBeNull();
  });

  it('⛔ never reports the BILLING address as somewhere to post a parcel', async () => {
    const s = bookingSession();
    delete (s as Record<string, unknown>).collected_information;
    (s as Record<string, unknown>).customer_details = {
      email: EMAIL,
      name: 'Sarah Rose',
      address: { line1: 'Billing Street', country: 'GB', postal_code: 'BA1 1AA' },
    };
    retrieveSession.mockResolvedValue(s);
    const res = await request(app).get(`/api/backend/upsell/user-data?session_id=${BOOKING}`);
    expect(res.body.shipping).toBeNull();
    expect(JSON.stringify(res.body)).not.toContain('Billing Street');
  });
});

// ─── 2–4 · /upsell/charge carries the address onto the upsell payment ───────────

describe('POST /api/backend/upsell/charge', () => {
  it('stamps the booking address onto the upsell PaymentIntent for a physical offer', async () => {
    retrieveSession.mockResolvedValue(bookingSession());
    const res = await request(app)
      .post('/api/backend/upsell/charge')
      .send({ checkoutSessionId: BOOKING, email: EMAIL });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(createPI).toHaveBeenCalledTimes(1);
    expect(createPI.mock.calls[0][0]).toMatchObject({
      shipping: {
        name: 'Sarah Rose',
        address: {
          line1: '1 Rose Lane',
          line2: 'Flat 2',
          city: 'Bath',
          state: 'Somerset',
          postal_code: 'BA1 1AA',
          country: 'GB',
        },
      },
      metadata: { product: 'be_protection_ritual', offer: 'heart-cleanser' },
    });
  });

  it('carries it onto the Upsell 2 bracelet charge too', async () => {
    retrieveSession.mockResolvedValue(bookingSession());
    await request(app)
      .post('/api/backend/upsell/charge')
      .send({ checkoutSessionId: BOOKING, email: EMAIL, product: 'be_bracelet', tier: 'downsell' });
    const params = createPI.mock.calls[0][0] as Record<string, any>;
    expect(params.shipping.address.line1).toBe('1 Rose Lane');
    expect(params.metadata).toMatchObject({ product: 'be_bracelet', type: 'downsell' });
  });

  it('an address posted by the page still wins (the form path is unchanged)', async () => {
    retrieveSession.mockResolvedValue(bookingSession());
    await request(app)
      .post('/api/backend/upsell/charge')
      .send({
        checkoutSessionId: BOOKING,
        email: EMAIL,
        shipping: { name: 'Typed In', line1: '2 Other Road', city: 'Leeds', state: '', postal: 'LS1 1AA', country: 'GB' },
      });
    const params = createPI.mock.calls[0][0] as Record<string, any>;
    expect(params.shipping.name).toBe('Typed In');
    expect(params.shipping.address.line1).toBe('2 Other Road');
  });

  it('⛔ a DIGITAL backend offer gets NO shipping on its upsell charge', async () => {
    retrieveSession.mockResolvedValue(digitalBookingSession());
    const res = await request(app)
      .post('/api/backend/upsell/charge')
      .send({ checkoutSessionId: BOOKING, email: EMAIL });
    expect(res.body.success).toBe(true);
    expect(createPI.mock.calls[0][0]).not.toHaveProperty('shipping');
  });

  it('⛔ never puts the BILLING address on the charge', async () => {
    const s = bookingSession();
    delete (s as Record<string, unknown>).collected_information;
    (s as Record<string, unknown>).customer_details = {
      email: EMAIL,
      name: 'Sarah Rose',
      address: { line1: 'Billing Street', country: 'GB' },
    };
    retrieveSession.mockResolvedValue(s);
    await request(app).post('/api/backend/upsell/charge').send({ checkoutSessionId: BOOKING, email: EMAIL });
    expect(createPI.mock.calls[0][0]).not.toHaveProperty('shipping');
  });

  it('charges her anyway when the physical booking carried no address', async () => {
    // A missing address must never fail a charge she asked for — fulfilment can chase it.
    const s = bookingSession();
    delete (s as Record<string, unknown>).collected_information;
    retrieveSession.mockResolvedValue(s);
    const res = await request(app)
      .post('/api/backend/upsell/charge')
      .send({ checkoutSessionId: BOOKING, email: EMAIL });
    expect(res.body.success).toBe(true);
    expect(createPI.mock.calls[0][0]).not.toHaveProperty('shipping');
  });
});
