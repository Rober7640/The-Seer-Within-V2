// The admin shipments API (server/routes/admin/shipments.ts + server/lib/beShipmentAdmin.ts):
// list, mark shipped, cancel. Database and AWeber mocked.
//
//   npx vitest run server/routes/admin/shipments.test.ts
//
// What these pin down:
//  1. IT SITS BEHIND THE ADMIN AUTH MIDDLEWARE (mounted after requireAdmin in index.ts).
//  2. BAD INPUT IS A 400 AND WRITES NOTHING. Tracking links are https only.
//  3. MARK SHIPPED WRITES THE TRACKING, THEN THE AWEBER SHIPPED TAG. A failed AWeber write
//     is recorded and a re-POST retries it WITHOUT re-stamping shipped_at.
//  4. ONCE HER TRACKING EMAIL HAS GONE, THE TRACKING IS LOCKED. Same values = a no-op.
//  5. ONLY A PENDING SHIPMENT CAN BE CANCELLED, and a cancelled one cannot be shipped.

import express from 'express';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { beShipments } from '@shared/schema';

type Row = Record<string, unknown>;

const state = {
  shipment: null as Row | null,
  updates: [] as Row[],
  updateReturnsNothing: false,
};

function builder(run: () => unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ['where', 'limit', 'orderBy', 'returning']) b[m] = () => b;
  b.then = (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) =>
    Promise.resolve().then(run).then(ok, fail);
  return b;
}

vi.mock('../../lib/db', () => ({
  db: {
    select: () => ({
      from: (table: unknown) => builder(() => (table === beShipments && state.shipment ? [state.shipment] : [])),
    }),
    update: (table: unknown) => {
      let set: Row = {};
      const b = builder(() => {
        state.updates.push(set);
        if (table !== beShipments || !state.shipment || state.updateReturnsNothing) return [];
        state.shipment = { ...state.shipment, ...set };
        return [state.shipment];
      });
      b.set = (v: Row) => { set = v; return b; };
      return b;
    },
  },
}));

const logged = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
vi.mock('../../lib/logger', () => ({ default: logged }));

const markBackendOrderShipped = vi.fn(async (_p: Row) => ({ success: true }) as { success: boolean; error?: string });
vi.mock('../../lib/aweber', () => ({
  markBackendOrderShipped: (p: Row) => markBackendOrderShipped(p),
}));

const { default: router } = await import('./shipments');
const app = express();
app.use(express.json());
app.use('/api/admin/shipments', router);

const TRACKING = {
  carrier: 'Royal Mail',
  trackingNumber: 'RM123456789GB',
  trackingUrl: 'https://www.royalmail.com/track-your-item#/tracking-results/RM123456789GB',
};

function pending(overrides: Row = {}): Row {
  return {
    id: 'ship-1',
    stripeSessionId: 'cs_test_09_ship',
    stripePaymentIntentId: 'pi_test_09',
    beOrderId: null,
    offer: 'heart-cleanser',
    offerNumber: '09',
    sku: 'be_heart_cleanser',
    quantity: 1,
    email: 'she@example.com',
    recipientName: 'Sarah Rose',
    line1: '1 Rose Lane',
    country: 'GB',
    addressMissing: false,
    status: 'pending',
    carrier: null,
    trackingNumber: null,
    trackingUrl: null,
    shippedAt: null,
    shippedListWrittenAt: null,
    shippedListError: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: new Date('2026-09-15T10:00:00.000Z'),
    ...overrides,
  };
}

beforeEach(() => {
  state.shipment = null;
  state.updates = [];
  state.updateReturnsNothing = false;
  markBackendOrderShipped.mockReset();
  markBackendOrderShipped.mockResolvedValue({ success: true });
  for (const fn of Object.values(logged)) fn.mockReset();
});

// ─── 1 · auth ──────────────────────────────────────────────────────────────────

describe('mounting', () => {
  it('is mounted under /api/admin AFTER the admin auth middleware', () => {
    const src = readFileSync(path.resolve(__dirname, './index.ts'), 'utf8');
    const auth = src.indexOf('router.use(requireAdmin);');
    const mount = src.indexOf("router.use('/shipments', shipmentRoutes);");
    expect(auth).toBeGreaterThan(0);
    expect(mount).toBeGreaterThan(auth);
    expect(src).toContain("import shipmentRoutes from './shipments';");
  });
});

// ─── list ──────────────────────────────────────────────────────────────────────

describe('GET /api/admin/shipments', () => {
  it('lists shipments', async () => {
    state.shipment = pending();
    const res = await request(app).get('/api/admin/shipments?status=pending&offer=heart-cleanser');
    expect(res.status).toBe(200);
    expect(res.body.shipments).toHaveLength(1);
    expect(res.body.shipments[0].id).toBe('ship-1');
  });

  it('returns the bump flag and key on every row, so the packer can see a Reiki charge', async () => {
    state.shipment = pending({ bumpPurchased: true, bumpProductKey: 'reiki_charge' });
    const res = await request(app).get('/api/admin/shipments?status=pending&offer=heart-cleanser');
    expect(res.status).toBe(200);
    expect(res.body.shipments[0]).toMatchObject({ bumpPurchased: true, bumpProductKey: 'reiki_charge' });
  });

  it('is 400 on an unknown status or offer', async () => {
    expect((await request(app).get('/api/admin/shipments?status=lost')).status).toBe(400);
    expect((await request(app).get('/api/admin/shipments?offer=hex-her')).status).toBe(400);
  });
});

// ─── 2–4 · mark shipped ────────────────────────────────────────────────────────

describe('POST /api/admin/shipments/:id/shipped', () => {
  it('is 400 on a missing or non-https tracking link, a missing carrier or tracking number — nothing written', async () => {
    state.shipment = pending();
    for (const body of [
      { ...TRACKING, trackingUrl: undefined },
      { ...TRACKING, trackingUrl: 'http://www.royalmail.com/track' },
      { ...TRACKING, trackingUrl: 'javascript:alert(1)' },
      { ...TRACKING, trackingUrl: 'not a url' },
      { ...TRACKING, carrier: '' },
      { ...TRACKING, trackingNumber: '   ' },
    ]) {
      const res = await request(app).post('/api/admin/shipments/ship-1/shipped').send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    expect(state.updates).toHaveLength(0);
    expect(markBackendOrderShipped).not.toHaveBeenCalled();
  });

  it('is 404 for a shipment that does not exist', async () => {
    const res = await request(app).post('/api/admin/shipments/nope/shipped').send(TRACKING);
    expect(res.status).toBe(404);
  });

  it('is 409 for a cancelled shipment', async () => {
    state.shipment = pending({ status: 'cancelled', cancelReason: 'refunded' });
    const res = await request(app).post('/api/admin/shipments/ship-1/shipped').send(TRACKING);
    expect(res.status).toBe(409);
    expect(markBackendOrderShipped).not.toHaveBeenCalled();
    expect(state.updates).toHaveLength(0);
  });

  it('stamps shipped + tracking, then writes the AWeber shipped tag, then stamps that write', async () => {
    state.shipment = pending();
    const res = await request(app).post('/api/admin/shipments/ship-1/shipped').send(TRACKING);
    expect(res.status).toBe(200);
    expect(res.body.listWritten).toBe(true);
    expect(state.shipment).toMatchObject({ status: 'shipped', ...TRACKING, shippedListError: null });
    expect(state.shipment?.shippedAt).toBeInstanceOf(Date);
    expect(state.shipment?.shippedListWrittenAt).toBeInstanceOf(Date);
    expect(markBackendOrderShipped).toHaveBeenCalledWith({
      email: 'she@example.com',
      offer: 'heart-cleanser',
      stripeOrderId: 'cs_test_09_ship',
      ...TRACKING,
    });
  });

  it('a failed AWeber write is 502 and recorded; a re-POST retries it without re-stamping shipped_at', async () => {
    state.shipment = pending();
    markBackendOrderShipped.mockResolvedValueOnce({ success: false, error: 'AWeber API error: 500' });
    const first = await request(app).post('/api/admin/shipments/ship-1/shipped').send(TRACKING);
    expect(first.status).toBe(502);
    expect(first.body.shipment.status).toBe('shipped');
    expect(state.shipment?.shippedListError).toContain('500');
    expect(state.shipment?.shippedListWrittenAt).toBeNull();
    const shippedAt = state.shipment?.shippedAt as Date;
    expect(shippedAt).toBeInstanceOf(Date);

    state.updates = [];
    const second = await request(app).post('/api/admin/shipments/ship-1/shipped').send(TRACKING);
    expect(second.status).toBe(200);
    expect(markBackendOrderShipped).toHaveBeenCalledTimes(2);
    for (const set of state.updates) expect(set).not.toHaveProperty('shippedAt');
    expect(state.shipment?.shippedAt).toBe(shippedAt);
    expect(state.shipment?.shippedListWrittenAt).toBeInstanceOf(Date);
    expect(state.shipment?.shippedListError).toBeNull();
  });

  it('a THROWN AWeber failure is recorded the same way', async () => {
    state.shipment = pending();
    markBackendOrderShipped.mockRejectedValueOnce(new Error('socket hang up'));
    const res = await request(app).post('/api/admin/shipments/ship-1/shipped').send(TRACKING);
    expect(res.status).toBe(502);
    expect(state.shipment?.shippedListError).toContain('socket hang up');
  });

  it('once her tracking email has gone: the same tracking is a no-op, different tracking is 409', async () => {
    state.shipment = pending({
      status: 'shipped', ...TRACKING, shippedAt: new Date(), shippedListWrittenAt: new Date(),
    });
    const same = await request(app).post('/api/admin/shipments/ship-1/shipped').send(TRACKING);
    expect(same.status).toBe(200);
    expect(same.body.alreadyShipped).toBe(true);
    const different = await request(app)
      .post('/api/admin/shipments/ship-1/shipped')
      .send({ ...TRACKING, trackingNumber: 'RM000000000GB' });
    expect(different.status).toBe(409);
    expect(markBackendOrderShipped).not.toHaveBeenCalled();
    expect(state.updates).toHaveLength(0);
  });

  it('is 409 when the shipment changed underneath the request', async () => {
    state.shipment = pending();
    state.updateReturnsNothing = true;
    const res = await request(app).post('/api/admin/shipments/ship-1/shipped').send(TRACKING);
    expect(res.status).toBe(409);
    expect(markBackendOrderShipped).not.toHaveBeenCalled();
  });
});

// ─── 5 · cancel ────────────────────────────────────────────────────────────────

describe('POST /api/admin/shipments/:id/cancel', () => {
  it('is 400 without a reason', async () => {
    state.shipment = pending();
    const res = await request(app).post('/api/admin/shipments/ship-1/cancel').send({ reason: '  ' });
    expect(res.status).toBe(400);
    expect(state.updates).toHaveLength(0);
  });

  it('cancels a pending shipment with its reason', async () => {
    state.shipment = pending();
    const res = await request(app).post('/api/admin/shipments/ship-1/cancel').send({ reason: 'Buyer asked to cancel' });
    expect(res.status).toBe(200);
    expect(state.shipment).toMatchObject({ status: 'cancelled', cancelReason: 'Buyer asked to cancel' });
    expect(state.shipment?.cancelledAt).toBeInstanceOf(Date);
  });

  it('is 409 for a shipment that is not pending', async () => {
    state.shipment = pending({ status: 'shipped' });
    const res = await request(app).post('/api/admin/shipments/ship-1/cancel').send({ reason: 'too late' });
    expect(res.status).toBe(409);
    expect(state.updates).toHaveLength(0);
  });

  it('is 404 for a shipment that does not exist', async () => {
    const res = await request(app).post('/api/admin/shipments/nope/cancel').send({ reason: 'x' });
    expect(res.status).toBe(404);
  });
});
