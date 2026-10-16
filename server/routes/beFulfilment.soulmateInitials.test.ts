// Job B's door into the soulmate-initials (10) order: GET /:offer/fulfilment/:sessionId
// with offer = 'soulmate-initials'. Mirrors server/routes/beFulfilment.test.ts's harness —
// same DB mock, same Stripe mock — scoped to the one thing Task 6 adds:
//
//   1. 'soulmate-initials' passes the :offer validation (it is catalog-driven already).
//   2. The response's `intake` block carries { stone, dateOfBirth, firstName, email } —
//      the PII Job B reads to send her reading. `stone` lives ONLY on be_order_intake,
//      never on be_orders, so this is the join the brief calls out.
//   3. An unknown session is 404; a sessionId not starting with cs_ is 400 — same as
//      every other offer on this endpoint.
//
//   npx vitest run server/routes/beFulfilment.soulmateInitials.test.ts

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { beOrderIntake, beOrders } from '@shared/schema';

const TOKEN = 'test-fulfilment-token';
const SESSION = 'cs_test_soulmate_session_1';

const state = {
  order: null as Record<string, unknown> | null,
  intake: null as Record<string, unknown> | null,
};

/** A thenable builder: every drizzle query here is awaited straight off the chain. */
function query(resolve: () => unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ['where', 'limit', 'returning', 'values', 'set', 'onConflictDoUpdate', 'from']) {
    b[m] = () => b;
  }
  b.then = (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) =>
    Promise.resolve().then(resolve).then(ok, fail);
  return b;
}

function rowsFor(table: unknown): unknown[] {
  if (table === beOrderIntake) return state.intake ? [state.intake] : [];
  if (table === beOrders) return state.order ? [state.order] : [];
  return [];
}

vi.mock('../lib/db', () => ({
  db: {
    select: () => ({ from: (table: unknown) => query(() => rowsFor(table)) }),
    insert: () => {
      const b = query(() => []);
      b.values = () => b;
      b.onConflictDoUpdate = () => b;
      return b;
    },
    update: () => {
      const b = query(() => []);
      b.set = () => b;
      return b;
    },
  },
}));

const logged = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
vi.mock('../lib/logger', () => ({ default: logged }));

const getBeOrderBySession = vi.fn(async (_s: string) => state.order);
const recordBackendOrder = vi.fn(async (_session: unknown) => state.order);
vi.mock('../lib/beOrders', () => ({
  getBeOrderBySession: (s: string) => getBeOrderBySession(s),
  recordBackendOrder: (s: unknown) => recordBackendOrder(s),
}));

const retrieve = vi.fn();
const getStripe = vi.fn(() => ({ checkout: { sessions: { retrieve } } }));
vi.mock('../lib/stripeAccount', () => ({ getStripe: () => getStripe() }));

const { default: router } = await import('./beFulfilment');

const app = express();
app.use(express.json());
app.use('/api/be', router);

const auth = (t: string = TOKEN) => ({ Authorization: `Bearer ${t}` });

function paidOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-soulmate-1',
    stripeSessionId: SESSION,
    offer: 'soulmate-initials',
    offerNumber: '10',
    status: 'paid',
    email: 'her@example.com',
    firstName: 'Priya',
    amountCents: 2700,
    readingCents: 2700,
    bumpPurchased: false,
    bumpProductKey: null,
    editionId: null,
    editionVersion: null,
    dueAt: new Date('2026-10-15T10:00:00.000Z'),
    createdAt: new Date('2026-10-14T10:00:00.000Z'),
    lensCard: null,
    lensMethodVersion: null,
    deliveredAt: null,
    readingUrl: null,
    ...overrides,
  };
}

function fullIntake(overrides: Record<string, unknown> = {}) {
  return {
    stripeSessionId: SESSION,
    offer: 'soulmate-initials',
    displayFirstName: null,
    stone: 'rose quartz',
    firstName: 'Priya',
    email: 'her@example.com',
    dateOfBirth: '1992-03-18',
    speedBump: false,
    ...overrides,
  };
}

beforeEach(() => {
  process.env.BE_FULFILMENT_TOKEN = TOKEN;
  state.order = null;
  state.intake = null;
  for (const fn of Object.values(logged)) fn.mockReset();
  getBeOrderBySession.mockClear();
  recordBackendOrder.mockClear();
  retrieve.mockReset();
  getStripe.mockClear();
});

describe('GET /soulmate-initials/fulfilment/:sessionId', () => {
  it('passes the :offer validation — soulmate-initials is a known catalog key', async () => {
    state.order = paidOrder();
    state.intake = fullIntake();
    const res = await request(app).get(`/api/be/soulmate-initials/fulfilment/${SESSION}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.offer).toBe('soulmate-initials');
  });

  it('returns stone + the intake PII block Job B needs', async () => {
    state.order = paidOrder();
    state.intake = fullIntake();
    const res = await request(app).get(`/api/be/soulmate-initials/fulfilment/${SESSION}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.intake).toMatchObject({
      stone: 'rose quartz',
      dateOfBirth: '1992-03-18',
      firstName: 'Priya',
      email: 'her@example.com',
    });
  });

  it('is 404 on an unknown session', async () => {
    state.order = null;
    retrieve.mockResolvedValue({ payment_status: 'paid', metadata: { product: 'be_soulmate_initials' } });
    getBeOrderBySession.mockResolvedValueOnce(null);
    recordBackendOrder.mockResolvedValueOnce(null);
    const res = await request(app).get(`/api/be/soulmate-initials/fulfilment/${SESSION}`).set(auth());
    expect(res.status).toBe(404);
  });

  it('is 400 when the session id does not start with cs_', async () => {
    const res = await request(app).get('/api/be/soulmate-initials/fulfilment/pi_123').set(auth());
    expect(res.status).toBe(400);
  });

  it('does not break other offers — 08 still has no stone field and gets its own intake shape', async () => {
    state.order = {
      id: 'order-08-1',
      stripeSessionId: SESSION,
      offer: 'marcus-reading',
      offerNumber: '08',
      status: 'paid',
      email: 'she@example.com',
      firstName: 'Sarah',
      amountCents: 4700,
      readingCents: 4700,
      bumpPurchased: false,
      bumpProductKey: null,
      editionId: null,
      editionVersion: null,
      dueAt: null,
      createdAt: new Date('2026-09-13T10:00:00.000Z'),
      lensCard: null,
      lensMethodVersion: null,
      deliveredAt: null,
      readingUrl: null,
    };
    state.intake = null;
    const res = await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`).set(auth());
    // 08 still refuses without a full birth name / dob / draw — untouched by this change.
    expect(res.status).toBe(409);
    expect(res.body.missing).toContain('full_birth_name');
  });
});
