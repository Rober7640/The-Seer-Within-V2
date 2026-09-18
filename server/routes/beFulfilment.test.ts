// n8n's fulfilment door (server/routes/beFulfilment.ts), with the DB, Stripe and the
// order helpers mocked — same style as server/lib/beOrders.test.ts.
//
//   npx vitest run server/routes/beFulfilment.test.ts
//
// What these pin down:
//  1. NO TOKEN CONFIGURED IS 503, NEVER 200. A wrong token is 401.
//  2. AN OFFER'S TOKEN READS ONLY ITS OWN ORDERS. Any mismatch is a 404.
//  3. IT REFUSES RATHER THAN GUESSES. For 08 every missing item is named in ONE 409.
//  4. FIRST DELIVERY WINS. A retried /delivered keeps the first delivered_at.
//  5. PII NEVER REACHES A LOG LINE. Birth name and DOB are in the body only.

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { be07ReadingGrades, be08Draws, beOrderIntake, beOrders, beSendAttempts } from '@shared/schema';

const TOKEN = 'test-fulfilment-token';
const SESSION = 'cs_test_08_session_1';
const BIRTH_NAME = 'Yan Wei Secretbirthname';
const DOB = '1987-04-21';

// ─── the fake database ─────────────────────────────────────────────────────────

const state = {
  order: null as Record<string, unknown> | null,
  intake: null as Record<string, unknown> | null,
  draw: null as Record<string, unknown> | null,
  inserts: [] as { table: unknown; values: Record<string, unknown>; conflict?: Record<string, unknown> }[],
  updates: [] as { table: unknown; set: Record<string, unknown> }[],
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
  if (table === be08Draws) return state.draw ? [state.draw] : [];
  if (table === beOrders) return state.order ? [state.order] : [];
  return [];
}

vi.mock('../lib/db', () => ({
  db: {
    select: () => ({ from: (table: unknown) => query(() => rowsFor(table)) }),
    insert: (table: unknown) => {
      const rec = { table, values: {} as Record<string, unknown>, conflict: undefined as Record<string, unknown> | undefined };
      state.inserts.push(rec);
      const b = query(() => []);
      b.values = (v: Record<string, unknown>) => { rec.values = v; return b; };
      b.onConflictDoUpdate = (c: Record<string, unknown>) => { rec.conflict = c; return b; };
      return b;
    },
    update: (table: unknown) => {
      const rec = { table, set: {} as Record<string, unknown> };
      state.updates.push(rec);
      const b = query(() => {
        if (!state.order) return [];
        const next = { ...state.order, ...rec.set };
        // Emulate `COALESCE(delivered_at, now())`: anything that is not a Date is the SQL
        // fragment, and it keeps the existing timestamp when there is one.
        if (!(rec.set.deliveredAt instanceof Date)) {
          next.deliveredAt = state.order.deliveredAt ?? new Date();
        }
        state.order = next;
        return [next];
      });
      b.set = (v: Record<string, unknown>) => { rec.set = v; return b; };
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
    editionId: 'what-are-my-blind-spots',
    editionVersion: 2,
    dueAt: new Date('2026-09-14T10:00:00.000Z'),
    createdAt: new Date('2026-09-13T10:00:00.000Z'),
    lensCard: 'The Hermit',
    lensMethodVersion: 'lens-v1',
    deliveredAt: null,
    readingUrl: null,
    ...overrides,
  };
}

function fullIntake(overrides: Record<string, unknown> = {}) {
  return {
    stripeSessionId: SESSION,
    offer: 'marcus-reading',
    displayFirstName: 'Sar',
    fullBirthName: BIRTH_NAME,
    dateOfBirth: DOB,
    speedBump: true,
    ...overrides,
  };
}

const DRAW_JSON = {
  contractVersion: 1,
  edition: { id: 'what-are-my-blind-spots', version: 2, slug: 'blind-spots', question: 'q', theme: 't', spread: 's', positions: [] },
  lens: 'The Hermit',
  positions: [{ number: 1, card: 'The Tower', reversed: false }],
  drawnAt: '2026-09-13T10:00:05.000Z',
};

function draw() {
  return {
    id: 'draw-1',
    orderId: 'order-08-1',
    drawJson: DRAW_JSON,
    drawMethodVersion: 'draw-v3',
    contextHash: 'abc123',
    createdAt: new Date('2026-09-13T10:00:05.000Z'),
  };
}

/** Every string that reached the logger, flattened, for the PII assertion. */
function everythingLogged(): string {
  return Object.values(logged)
    .flatMap((fn) => fn.mock.calls)
    .map((call) => JSON.stringify(call))
    .join('\n');
}

beforeEach(() => {
  process.env.BE_FULFILMENT_TOKEN = TOKEN;
  state.order = null;
  state.intake = null;
  state.draw = null;
  state.inserts = [];
  state.updates = [];
  for (const fn of Object.values(logged)) fn.mockReset();
  getBeOrderBySession.mockClear();
  recordBackendOrder.mockClear();
  retrieve.mockReset();
  getStripe.mockClear();
});

// ─── auth ──────────────────────────────────────────────────────────────────────

describe('the token', () => {
  it('is 503 (never 200) when BE_FULFILMENT_TOKEN is unset, and says so in the error log', async () => {
    delete process.env.BE_FULFILMENT_TOKEN;
    state.order = paidOrder();
    const res = await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`).set(auth());
    expect(res.status).toBe(503);
    expect(logged.error).toHaveBeenCalledWith(
      expect.stringContaining('BE_FULFILMENT_TOKEN is not configured — refusing every call'),
    );
  });

  it('is 401 on a wrong token', async () => {
    const res = await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`).set(auth('nope'));
    expect(res.status).toBe(401);
  });

  it('is 401 on a missing header', async () => {
    const res = await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`);
    expect(res.status).toBe(401);
  });

  it('is 401 before 404 — an unauthenticated caller learns nothing about which offers exist', async () => {
    const res = await request(app).get(`/api/be/not-an-offer/fulfilment/${SESSION}`);
    expect(res.status).toBe(401);
  });
});

// ─── GET /fulfilment ───────────────────────────────────────────────────────────

describe('GET /:offer/fulfilment/:sessionId', () => {
  it('is 404 on an unknown offer key', async () => {
    const res = await request(app).get(`/api/be/not-an-offer/fulfilment/${SESSION}`).set(auth());
    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
  });

  it('is 400 when the session id is not a Checkout session', async () => {
    const res = await request(app).get('/api/be/marcus-reading/fulfilment/pi_123').set(auth());
    expect(res.status).toBe(400);
  });

  it('is 402 when no row exists yet and Stripe says the session is unpaid', async () => {
    retrieve.mockResolvedValue({ payment_status: 'unpaid', metadata: { product: 'be_marcus_reading' } });
    const res = await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`).set(auth());
    expect(res.status).toBe(402);
    expect(recordBackendOrder).not.toHaveBeenCalled();
  });

  it('is 404 when the Stripe session was for a different product', async () => {
    retrieve.mockResolvedValue({ payment_status: 'paid', metadata: { product: 'be_twin_flame' } });
    const res = await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`).set(auth());
    expect(res.status).toBe(404);
    expect(recordBackendOrder).not.toHaveBeenCalled();
  });

  it('records the order off Stripe when n8n beats the webhook (the race backstop)', async () => {
    retrieve.mockResolvedValue({ payment_status: 'paid', metadata: { product: 'be_marcus_reading' } });
    getBeOrderBySession.mockResolvedValueOnce(null);
    recordBackendOrder.mockImplementationOnce(async () => {
      state.order = paidOrder();
      return state.order;
    });
    state.intake = fullIntake();
    state.draw = draw();
    const res = await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`).set(auth());
    expect(res.status).toBe(200);
    expect(recordBackendOrder).toHaveBeenCalledTimes(1);
  });

  it('is 404 when the row belongs to another offer (an 08 token cannot read a 07 order)', async () => {
    state.order = paidOrder({ offer: 'marcus-daily', offerNumber: '07' });
    const res = await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`).set(auth());
    expect(res.status).toBe(404);
  });

  it('is 409 on a refunded order', async () => {
    state.order = paidOrder({ status: 'refunded' });
    state.intake = fullIntake();
    state.draw = draw();
    const res = await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`).set(auth());
    expect(res.status).toBe(409);
    expect(res.body.status).toBe('refunded');
  });

  it('is 409 naming EVERY missing item for 08 when there is no intake and no draw', async () => {
    state.order = paidOrder();
    const res = await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`).set(auth());
    expect(res.status).toBe(409);
    expect(res.body.missing).toEqual(['intake', 'full_birth_name', 'date_of_birth', 'draw']);
  });

  it('is 409 naming just the holes when the intake exists but is incomplete', async () => {
    state.order = paidOrder();
    state.intake = fullIntake({ dateOfBirth: null });
    state.draw = draw();
    const res = await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`).set(auth());
    expect(res.status).toBe(409);
    expect(res.body.missing).toEqual(['date_of_birth']);
  });

  it('returns the full shape on the happy path', async () => {
    state.order = paidOrder();
    state.intake = fullIntake();
    state.draw = draw();
    const res = await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      offer: 'marcus-reading',
      offerNumber: '08',
      order: {
        id: 'order-08-1',
        stripeSessionId: SESSION,
        email: 'she@example.com',
        firstName: 'Sarah',
        displayFirstName: 'Sar',
        amountCents: 4700,
        readingCents: 4700,
        bumpPurchased: false,
        bumpProductKey: null,
        editionId: 'what-are-my-blind-spots',
        editionVersion: 2,
        dueAt: '2026-09-14T10:00:00.000Z',
        paidAt: '2026-09-13T10:00:00.000Z',
        lensCard: 'The Hermit',
        lensMethodVersion: 'lens-v1',
        deliveredAt: null,
        readingUrl: null,
      },
      intake: { fullBirthName: BIRTH_NAME, dateOfBirth: DOB, speedBump: true },
      draw: {
        drawJson: DRAW_JSON,
        drawMethodVersion: 'draw-v3',
        contextHash: 'abc123',
        createdAt: '2026-09-13T10:00:05.000Z',
      },
    });
  });

  it('passes drawJson through untouched — the edition snapshot lives inside it', async () => {
    state.order = paidOrder();
    state.intake = fullIntake();
    state.draw = draw();
    const res = await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`).set(auth());
    expect(res.body.draw.drawJson.edition).toEqual(DRAW_JSON.edition);
  });

  it('falls back to the ?fn= first name when the intake has no display name', async () => {
    state.order = paidOrder();
    state.intake = fullIntake({ displayFirstName: null });
    state.draw = draw();
    const res = await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`).set(auth());
    expect(res.body.order.displayFirstName).toBe('Sarah');
  });

  it('does not look up a draw for a non-08 offer', async () => {
    state.order = paidOrder({ offer: 'twin-flame', offerNumber: '02' });
    state.draw = draw();
    const res = await request(app).get(`/api/be/twin-flame/fulfilment/${SESSION}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.draw).toBeNull();
    expect(res.body.offerNumber).toBe('02');
  });

  it('is 500 with a clean error when the DB throws', async () => {
    state.order = paidOrder();
    getBeOrderBySession.mockRejectedValueOnce(new Error('connection reset'));
    const res = await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`).set(auth());
    expect(res.status).toBe(500);
  });
});

// ─── POST /grade-log ───────────────────────────────────────────────────────────

describe('POST /:offer/grade-log', () => {
  it('upserts into be_07_reading_grades keyed on (order_id, attempt)', async () => {
    state.order = paidOrder();
    const res = await request(app)
      .post('/api/be/marcus-reading/grade-log')
      .set(auth())
      .send({ sessionId: SESSION, attempt: 2, pass: false, failed: [3, 'x', 6], why: 'flat', reading: 'text' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, attempt: 2 });
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0].table).toBe(be07ReadingGrades);
    expect(state.inserts[0].values).toEqual({
      orderId: 'order-08-1', attempt: 2, pass: false, failed: [3, 6], why: 'flat', reading: 'text',
    });
    expect(state.inserts[0].conflict?.target).toEqual([be07ReadingGrades.orderId, be07ReadingGrades.attempt]);
    // A failed grade that ships is the one line an operator must be able to grep for.
    expect(logged.error).toHaveBeenCalledWith(
      expect.stringContaining('FAILED GRADE'),
      expect.objectContaining({ order: 'order-08-1', attempt: 2 }),
    );
  });

  it('is 400 on a bad body', async () => {
    state.order = paidOrder();
    for (const body of [
      { attempt: 1, pass: true },
      { sessionId: SESSION, pass: true },
      { sessionId: SESSION, attempt: 0, pass: true },
      { sessionId: SESSION, attempt: 1 },
    ]) {
      const res = await request(app).post('/api/be/marcus-reading/grade-log').set(auth()).send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    expect(state.inserts).toHaveLength(0);
  });

  it('is 404 when the order belongs to another offer', async () => {
    state.order = paidOrder({ offer: 'marcus-daily', offerNumber: '07' });
    const res = await request(app)
      .post('/api/be/marcus-reading/grade-log')
      .set(auth())
      .send({ sessionId: SESSION, attempt: 1, pass: true });
    expect(res.status).toBe(404);
    expect(state.inserts).toHaveLength(0);
  });
});

// ─── POST /delivered ───────────────────────────────────────────────────────────

describe('POST /:offer/delivered', () => {
  it('stamps delivered_at once and keeps it on a retry; reading_url is replaced', async () => {
    state.order = paidOrder();

    const first = await request(app)
      .post('/api/be/marcus-reading/delivered')
      .set(auth())
      .send({ sessionId: SESSION, readingUrl: 'https://cdn.example.com/r/1.pdf', readingBody: 'prose' });
    expect(first.status).toBe(200);
    expect(first.body.ok).toBe(true);
    expect(first.body.alreadyDelivered).toBe(false);
    expect(first.body.deliveredAt).toBeTruthy();
    const stamped = first.body.deliveredAt;

    // The write must COALESCE in SQL, not send a fresh Date the DB would overwrite with.
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].table).toBe(beOrders);
    expect(state.updates[0].set.deliveredAt).not.toBeInstanceOf(Date);
    expect(state.updates[0].set).toMatchObject({ readingUrl: 'https://cdn.example.com/r/1.pdf', readingBody: 'prose' });

    const second = await request(app)
      .post('/api/be/marcus-reading/delivered')
      .set(auth())
      .send({ sessionId: SESSION, readingUrl: 'https://cdn.example.com/r/1-resigned.pdf' });
    expect(second.status).toBe(200);
    expect(second.body.alreadyDelivered).toBe(true);
    expect(second.body.deliveredAt).toBe(stamped);
    expect(state.order?.readingUrl).toBe('https://cdn.example.com/r/1-resigned.pdf');
    // An omitted readingBody must not blank prose we already hold.
    expect(state.updates[1].set).not.toHaveProperty('readingBody');
    expect(state.order?.readingBody).toBe('prose');
  });

  it('is 400 unless readingUrl is https', async () => {
    state.order = paidOrder();
    for (const readingUrl of ['http://cdn.example.com/r.pdf', 'object/sign/r.pdf', '', undefined]) {
      const res = await request(app)
        .post('/api/be/marcus-reading/delivered')
        .set(auth())
        .send({ sessionId: SESSION, readingUrl });
      expect(res.status, String(readingUrl)).toBe(400);
    }
    expect(state.updates).toHaveLength(0);
  });

  it('is 404 when the order belongs to another offer', async () => {
    state.order = paidOrder({ offer: 'twin-flame', offerNumber: '02' });
    const res = await request(app)
      .post('/api/be/marcus-reading/delivered')
      .set(auth())
      .send({ sessionId: SESSION, readingUrl: 'https://cdn.example.com/r.pdf' });
    expect(res.status).toBe(404);
    expect(state.updates).toHaveLength(0);
  });
});

// ─── POST /send-attempt ────────────────────────────────────────────────────────

describe('POST /:offer/send-attempt', () => {
  it('upserts into be_send_attempts on (stripe_session_id, message_type)', async () => {
    state.order = paidOrder();
    const res = await request(app)
      .post('/api/be/marcus-reading/send-attempt')
      .set(auth())
      .send({
        sessionId: SESSION, messageType: 'written_delivery', provider: 'resend',
        status: 'failed', error: 'rate limited',
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0].table).toBe(beSendAttempts);
    expect(state.inserts[0].values).toMatchObject({
      offer: 'marcus-reading',
      stripeSessionId: SESSION,
      messageType: 'written_delivery',
      provider: 'resend',
      providerMessageId: null,
      status: 'failed',
      error: 'rate limited',
    });
    expect(state.inserts[0].values.attemptedAt).toBeInstanceOf(Date);
    expect(state.inserts[0].conflict?.target).toEqual([beSendAttempts.stripeSessionId, beSendAttempts.messageType]);
    // The retry must move status/error/id/attempted_at on the SAME row.
    expect(state.inserts[0].conflict?.set).toMatchObject({ status: 'failed', error: 'rate limited', provider: 'resend' });
    expect((state.inserts[0].conflict?.set as Record<string, unknown>).attemptedAt).toBeInstanceOf(Date);
  });

  it('is 400 on a messageType outside the BeSendMessageType union', async () => {
    state.order = paidOrder();
    const res = await request(app)
      .post('/api/be/marcus-reading/send-attempt')
      .set(auth())
      .send({ sessionId: SESSION, messageType: 'newsletter', provider: 'resend', status: 'sent' });
    expect(res.status).toBe(400);
    expect(state.inserts).toHaveLength(0);
  });

  it('is 400 on a bad status or a missing provider', async () => {
    state.order = paidOrder();
    for (const body of [
      { sessionId: SESSION, messageType: 'order_confirmation', provider: 'resend', status: 'bounced' },
      { sessionId: SESSION, messageType: 'order_confirmation', status: 'sent' },
    ]) {
      const res = await request(app).post('/api/be/marcus-reading/send-attempt').set(auth()).send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    expect(state.inserts).toHaveLength(0);
  });

  it('is 404 when the order belongs to another offer', async () => {
    state.order = paidOrder({ offer: 'marcus-daily', offerNumber: '07' });
    const res = await request(app)
      .post('/api/be/marcus-reading/send-attempt')
      .set(auth())
      .send({ sessionId: SESSION, messageType: 'order_confirmation', provider: 'resend', status: 'sent' });
    expect(res.status).toBe(404);
    expect(state.inserts).toHaveLength(0);
  });
});

// ─── PII ───────────────────────────────────────────────────────────────────────

describe('PII', () => {
  it('never logs the birth name or date of birth on any path', async () => {
    // Happy path, 409 path, and a DB failure — every branch that touches the intake.
    state.order = paidOrder();
    state.intake = fullIntake();
    state.draw = draw();
    await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`).set(auth());

    state.draw = null;
    await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`).set(auth());

    state.intake = fullIntake({ fullBirthName: null });
    await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`).set(auth());

    getBeOrderBySession.mockRejectedValueOnce(new Error('boom'));
    await request(app).get(`/api/be/marcus-reading/fulfilment/${SESSION}`).set(auth());

    const all = everythingLogged();
    expect(all.length).toBeGreaterThan(0);
    expect(all).not.toContain(BIRTH_NAME);
    expect(all).not.toContain('Secretbirthname');
    expect(all).not.toContain(DOB);
    // The names of the missing fields ARE allowed — that is what makes the 409 debuggable.
    expect(all).toContain('full_birth_name');
  });
});
