// GET /api/backend/order/:sessionId — the public order shape every receipt reads
// (server/routes/backendOffers.ts, `publicOrder`), with the DB, Stripe and the order
// helpers mocked — same style as server/routes/beFulfilment.test.ts.
//
//   npx vitest run server/routes/backendOffers.order.test.ts
//
// What these pin down:
//  1. THE 08 FIELDS ARE THERE and the old ones (02/03/06 receipts) are unchanged.
//  2. `deliveryHours` IS 12 WITH THE BUMP, 24 WITHOUT — the same rule that stamps due_at.
//  3. AN EDITION LOOKUP FAILURE NEVER BREAKS THE RECEIPT: `edition: null`, still 200.
//  4. NO PII IN THE PUBLIC SHAPE: no lens card, birth name, DOB, payment ids, notes.
//  5. THE STATUS CODES THE CLIENT POLLS ON: 402 unpaid, 404 not a backend order.

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SESSION = 'cs_test_08_order_1';

const state = {
  order: null as Record<string, unknown> | null,
  edition: null as Record<string, unknown> | null,
  editionThrows: false,
};

vi.mock('../lib/db', () => ({ db: {} }));

const logged = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
vi.mock('../lib/logger', () => ({ default: logged }));

const getBeOrderBySession = vi.fn(async (_s: string) => state.order);
const writeToCustomerList = vi.fn(async (row: unknown) => row);
const recordBackendOrder = vi.fn(async (_session: unknown) => state.order);
vi.mock('../lib/beOrders', () => ({
  getBeOrderBySession: (s: string) => getBeOrderBySession(s),
  writeToCustomerList: (r: unknown) => writeToCustomerList(r),
  recordBackendOrder: (s: unknown) => recordBackendOrder(s),
  saveOrderIntake: vi.fn(async () => true),
}));

const getBe08Edition = vi.fn(async (_id: string, _v?: number | null) => {
  if (state.editionThrows) throw new Error('relation "be_08_editions" does not exist');
  return state.edition;
});
vi.mock('../lib/be08Editions', () => ({
  getBe08Edition: (id: string, v?: number | null) => getBe08Edition(id, v),
  listPublishedBe08Editions: vi.fn(async () => []),
}));
vi.mock('../lib/be08Draw', () => ({ BE_08_DECK: [] }));

vi.mock('../lib/experiments', () => ({
  resolveBeBookingTreatment: vi.fn(async () => ({ treatment: 'page' })),
}));
vi.mock('../lib/backendCustomerList', () => ({ BACKEND_UPSELLS: {} }));

const retrieve = vi.fn();
const getStripe = vi.fn(() => ({ checkout: { sessions: { retrieve } } }));
vi.mock('../lib/stripeAccount', () => ({ getStripe: () => getStripe() }));

const { default: router } = await import('./backendOffers');

const app = express();
app.use(express.json());
app.use('/api/backend', router);

/** A paid 08 row as drizzle would hand it back — every PII column populated so the
 *  assertion that none of it leaks has something to catch. */
function paidOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-08-1',
    stripeSessionId: SESSION,
    stripePaymentIntentId: 'pi_secret_123',
    offer: 'marcus-reading',
    offerNumber: '08',
    treatment: 'page',
    status: 'paid',
    email: 'she@example.com',
    firstName: 'Sarah',
    amountCents: 4777,
    readingCents: 3500,
    bumpPurchased: true,
    bumpCents: 1277,
    bumpProductKey: 'marcus_speed',
    currency: 'usd',
    editionId: 'blind-spots-v1',
    editionVersion: 2,
    dueAt: new Date('2026-09-13T22:00:00.000Z'),
    deliveredAt: null,
    createdAt: new Date('2026-09-13T10:00:00.000Z'),
    updatedAt: new Date('2026-09-13T10:00:00.000Z'),
    lensCard: 'The Hermit',
    lensMethodVersion: 'lens-v1',
    fulfilmentNote: 'DOB_MISSING',
    readingBody: 'the whole reading',
    readingUrl: 'https://example.com/reading.pdf',
    customerListWrittenAt: new Date('2026-09-13T10:00:01.000Z'),
    customerListError: null,
    ...overrides,
  };
}

function edition() {
  return {
    id: 'blind-spots-v1',
    version: 2,
    slug: 'what-are-my-blind-spots',
    question: 'What are my blind spots?',
    theme: 'blind spots',
    spread: { id: 's', name: 'S', version: 1 },
    positions: [],
    freeEmailText: 'free',
    status: 'published',
  };
}

beforeEach(() => {
  state.order = null;
  state.edition = null;
  state.editionThrows = false;
  for (const fn of [getBeOrderBySession, writeToCustomerList, recordBackendOrder, getBe08Edition, retrieve])
    fn.mockClear();
  for (const fn of Object.values(logged)) fn.mockClear();
});

describe('GET /api/backend/order/:sessionId — the public shape', () => {
  it('keeps every field the 02/03/06 receipts already read', async () => {
    state.order = paidOrder();
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.status).toBe(200);
    expect(res.body.order).toMatchObject({
      reference: SESSION.slice(-8).toUpperCase(),
      offer: 'marcus-reading',
      offerNumber: '08',
      firstName: 'Sarah',
      email: 'she@example.com',
      amountCents: 4777,
      bumpPurchased: true,
      status: 'paid',
    });
  });

  it('adds the 08 fields, with the edition resolved by id + pinned version', async () => {
    state.order = paidOrder();
    state.edition = edition();
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.status).toBe(200);
    expect(res.body.order).toMatchObject({
      readingCents: 3500,
      bumpCents: 1277,
      bumpProductKey: 'marcus_speed',
      deliveryHours: 12,
      dueAt: '2026-09-13T22:00:00.000Z',
      deliveredAt: null,
      createdAt: '2026-09-13T10:00:00.000Z',
      editionId: 'blind-spots-v1',
      editionVersion: 2,
      edition: {
        id: 'blind-spots-v1',
        version: 2,
        slug: 'what-are-my-blind-spots',
        question: 'What are my blind spots?',
        theme: 'blind spots',
      },
      audio: { available: false, priceCents: 1700, purchased: false },
    });
    expect(getBe08Edition).toHaveBeenCalledWith('blind-spots-v1', 2);
    // Only the five public edition fields — never the positions / fixed cards.
    expect(Object.keys(res.body.order.edition).sort()).toEqual(['id', 'question', 'slug', 'theme', 'version']);
  });

  it('deliveryHours is 24 without the bump', async () => {
    state.order = paidOrder({ bumpPurchased: false, bumpCents: 0, bumpProductKey: null, amountCents: 3500 });
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.status).toBe(200);
    expect(res.body.order.deliveryHours).toBe(24);
    expect(res.body.order.bumpProductKey).toBeNull();
  });

  it('a failed edition lookup returns edition: null and still 200', async () => {
    state.order = paidOrder();
    state.editionThrows = true;
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.status).toBe(200);
    expect(res.body.order.edition).toBeNull();
    expect(res.body.order.editionId).toBe('blind-spots-v1');
    expect(logged.warn).toHaveBeenCalled();
  });

  it('an edition that is simply not found is also null', async () => {
    state.order = paidOrder();
    state.edition = null;
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.status).toBe(200);
    expect(res.body.order.edition).toBeNull();
  });

  it('does not look the edition up for a non-08 offer', async () => {
    state.order = paidOrder({ offer: 'twin-flame', offerNumber: '02', editionId: null, editionVersion: null, dueAt: null });
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.status).toBe(200);
    expect(getBe08Edition).not.toHaveBeenCalled();
    expect(res.body.order.edition).toBeNull();
    expect(res.body.order.dueAt).toBeNull();
  });

  it('carries NO PII or internal columns', async () => {
    state.order = paidOrder();
    state.edition = edition();
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    const keys = Object.keys(res.body.order);
    for (const banned of [
      'lensCard',
      'lensMethodVersion',
      'fullBirthName',
      'dateOfBirth',
      'stripeSessionId',
      'stripePaymentIntentId',
      'fulfilmentNote',
      'readingBody',
      'readingUrl',
      'customerListError',
      'customerListWrittenAt',
      'id',
    ]) {
      expect(keys).not.toContain(banned);
    }
    const flat = JSON.stringify(res.body);
    expect(flat).not.toContain('The Hermit');
    expect(flat).not.toContain('pi_secret_123');
    expect(flat).not.toContain('DOB_MISSING');
  });
});

describe('GET /api/backend/order/:sessionId — what the client polls on', () => {
  it('402 when Stripe says the session is not paid yet', async () => {
    retrieve.mockResolvedValueOnce({ payment_status: 'unpaid', metadata: { product: 'be_marcus_reading' } });
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.status).toBe(402);
    expect(recordBackendOrder).not.toHaveBeenCalled();
  });

  it('404 when the paid session is not a backend order', async () => {
    retrieve.mockResolvedValueOnce({ payment_status: 'paid', metadata: { product: 'energy_clearing_ritual' } });
    const res = await request(app).get(`/api/backend/order/${SESSION}`);
    expect(res.status).toBe(404);
  });

  it('400 for anything that is not a Checkout session id', async () => {
    const res = await request(app).get('/api/backend/order/not-a-session');
    expect(res.status).toBe(400);
  });
});
