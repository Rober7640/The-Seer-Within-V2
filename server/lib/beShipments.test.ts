// Backend-deck SHIPMENTS — the parcel a paid physical order (06, 09) owes, the operator
// alert that says "post this", and the refund that says "don't".
//
//   npx vitest run server/lib/beShipments.test.ts
//
// The database and Resend are mocked — this pins the DECISIONS, not the drivers.
//
// What these pin down:
//  1. ONLY PAID, PHYSICAL, BACKEND MAIN-OFFER SESSIONS get a row. A funnel product, a
//     digital offer, an upsell or an unpaid session never does.
//  2. ONE ROW AND ONE ALERT PER SESSION, however many times Stripe retries.
//  3. A PAID ORDER WITH NO ADDRESS STILL GETS A ROW, flagged, and a louder alert. The
//     billing address is never used in its place.
//  4. A FAILED ALERT IS RECORDED, NOT SWALLOWED, and a later call retries it.
//  5. THE DATABASE BEING DOWN DOES NOT SILENCE THE OPERATOR.
//  6. A FULL REFUND CANCELS A PENDING SHIPMENT AND SAYS "DO NOT SHIP" — for `be_*` only.
//  7. A 09 REIKI-CHARGING BUMP (09-C3) IS RECORDED ON THE PARCEL AND IMPOSSIBLE TO MISS in
//     the operator alert — and a text-instructional bump (06) never borrows that alarm.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { beOrders, beShipments } from '@shared/schema';

process.env.RESEND_API_KEY = 're_test_key';
process.env.ORDERS_NOTIFY_EMAIL = 'orders@example.com';

// ─── the fake database ─────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

const state = {
  shipment: null as Row | null,
  inserts: [] as Array<{ table: unknown; values: Row }>,
  upserts: [] as Array<{ table: unknown; target: unknown; set: Row }>,
  updates: [] as Array<{ table: unknown; set: Row }>,
  selects: [] as unknown[],
  insertThrows: null as Error | null,
  selectThrows: null as Error | null,
};

function builder(run: () => unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ['where', 'limit', 'orderBy', 'from', 'returning']) b[m] = () => b;
  b.then = (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) =>
    Promise.resolve().then(run).then(ok, fail);
  return b;
}

const NEW_ROW_DEFAULTS: Row = {
  id: 'ship-1',
  status: 'pending',
  quantity: 1,
  carrier: null,
  trackingNumber: null,
  trackingUrl: null,
  shippedAt: null,
  shippedListWrittenAt: null,
  shippedListError: null,
  operatorAlertedAt: null,
  operatorAlertError: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date('2026-09-15T10:00:00.000Z'),
  updatedAt: new Date('2026-09-15T10:00:00.000Z'),
};

vi.mock('./db', () => ({
  db: {
    insert: (table: unknown) => {
      const rec = { table, values: {} as Row };
      const b = builder(() => {
        if (state.insertThrows) throw state.insertThrows;
        state.inserts.push(rec);
        if (table !== beShipments) return [];
        if (!state.shipment) state.shipment = { ...NEW_ROW_DEFAULTS, ...rec.values };
        return [state.shipment];
      });
      b.values = (v: Row) => { rec.values = v; return b; };
      b.onConflictDoUpdate = (cfg: { target: unknown; set: Row }) => {
        state.upserts.push({ table, target: cfg.target, set: cfg.set });
        return b;
      };
      return b;
    },
    select: () => ({
      from: (table: unknown) =>
        builder(() => {
          if (state.selectThrows) throw state.selectThrows;
          state.selects.push(table);
          if (table === beShipments) return state.shipment ? [state.shipment] : [];
          return [];
        }),
    }),
    update: (table: unknown) => {
      const rec = { table, set: {} as Row };
      const b = builder(() => {
        state.updates.push(rec);
        if (table !== beShipments || !state.shipment) return [];
        state.shipment = { ...state.shipment, ...rec.set };
        return [state.shipment];
      });
      b.set = (v: Row) => { rec.set = v; return b; };
      return b;
    },
  },
}));

const logged = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
vi.mock('./logger', () => ({ default: logged }));

const send = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => send(...args) };
  },
}));

const {
  recordBackendShipment,
  ensureBackendShipment,
  handleBackendRefund,
  publicShipping,
} = await import('./beShipments');

// ─── fixtures ──────────────────────────────────────────────────────────────────

const ADDRESS = {
  line1: '1 Rose Lane',
  line2: 'Flat 2',
  city: 'Bath',
  state: 'Somerset',
  postal_code: 'BA1 1AA',
  country: 'GB',
};

function charmSession(overrides: Row = {}, metadata: Record<string, string> = {}) {
  return {
    id: 'cs_test_09_ship',
    payment_status: 'paid',
    payment_intent: 'pi_test_09',
    amount_total: 5900,
    currency: 'usd',
    customer_details: {
      email: 'she@example.com',
      name: 'Card Name',
      phone: '+44 7700 900000',
      // A BILLING address. ⛔ Never somewhere to post a parcel.
      address: { country: 'US', postal_code: '10001', line1: '9 Billing St' },
    },
    collected_information: { shipping_details: { name: 'Sarah <b>Rose</b>', address: ADDRESS } },
    metadata: { product: 'be_heart_cleanser', offer: 'heart-cleanser', ...metadata },
    ...overrides,
  } as never;
}

const sentMessages = () => send.mock.calls.map((c) => c[0] as { to: string; subject: string; html: string; text: string });
const shipmentUpdates = () => state.updates.filter((u) => u.table === beShipments).map((u) => u.set);

beforeEach(() => {
  process.env.RESEND_API_KEY = 're_test_key';
  state.shipment = null;
  state.inserts = [];
  state.upserts = [];
  state.updates = [];
  state.selects = [];
  state.insertThrows = null;
  state.selectThrows = null;
  send.mockReset();
  send.mockResolvedValue({ data: { id: 'email_1' }, error: null });
  for (const fn of Object.values(logged)) fn.mockReset();
});

// ─── 1 · which sessions get a row ──────────────────────────────────────────────

describe('recordBackendShipment — which sessions get a shipment row', () => {
  it('ignores a funnel product entirely — no row, no email', async () => {
    const r = await recordBackendShipment(charmSession({}, { product: 'energy_clearing_ritual' }));
    expect(r).toBeNull();
    expect(state.inserts).toHaveLength(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('ignores a DIGITAL backend offer (02) — nothing to post', async () => {
    expect(await recordBackendShipment(charmSession({}, { product: 'be_twin_flame', offer: 'twin-flame' }))).toBeNull();
    expect(state.inserts).toHaveLength(0);
  });

  it('ignores a backend UPSELL product — upsells are not catalog offers', async () => {
    expect(await recordBackendShipment(charmSession({}, { product: 'be_bracelet' }))).toBeNull();
    expect(state.inserts).toHaveLength(0);
  });

  it('ignores an unpaid session', async () => {
    expect(await recordBackendShipment(charmSession({ payment_status: 'unpaid' }))).toBeNull();
    expect(state.inserts).toHaveLength(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('records a paid 09 session with its shipping address, sku and quantity one', async () => {
    const row = await recordBackendShipment(charmSession(), { beOrderId: 'order-09' });
    expect(row).toBeTruthy();
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0].table).toBe(beShipments);
    expect(state.inserts[0].values).toMatchObject({
      stripeSessionId: 'cs_test_09_ship',
      stripePaymentIntentId: 'pi_test_09',
      beOrderId: 'order-09',
      offer: 'heart-cleanser',
      offerNumber: '09',
      sku: 'be_heart_cleanser',
      quantity: 1,
      email: 'she@example.com',
      recipientName: 'Sarah <b>Rose</b>',
      phone: '+44 7700 900000',
      line1: '1 Rose Lane',
      line2: 'Flat 2',
      city: 'Bath',
      state: 'Somerset',
      postalCode: 'BA1 1AA',
      country: 'GB',
      status: 'pending',
      addressMissing: false,
      bumpPurchased: false,
      bumpProductKey: null,
    });
  });

  it('records the 09 Reiki charging bump from the session metadata checkout wrote', async () => {
    await recordBackendShipment(charmSession({ amount_total: 7011 }, { bump: '1', bumpProduct: 'reiki_charge' }));
    expect(state.inserts[0].values).toMatchObject({ offer: 'heart-cleanser', bumpPurchased: true, bumpProductKey: 'reiki_charge' });
  });

  it('an unticked bump (metadata bump 0) records no bump', async () => {
    await recordBackendShipment(charmSession({}, { bump: '0' }));
    expect(state.inserts[0].values).toMatchObject({ bumpPurchased: false, bumpProductKey: null });
  });

  it('records 06\'s bump flag too, keyed from the catalog (closed_purse)', async () => {
    await recordBackendShipment(charmSession({}, { product: 'be_pixiu_bracelet', offer: 'pixiu-bracelet', bump: '1' }));
    expect(state.inserts[0].values).toMatchObject({ offer: 'pixiu-bracelet', bumpPurchased: true, bumpProductKey: 'closed_purse' });
  });

  it('records a paid 06 session too — every physical backend offer ships from this table', async () => {
    await recordBackendShipment(charmSession({}, { product: 'be_pixiu_bracelet', offer: 'pixiu-bracelet' }));
    expect(state.inserts[0].values).toMatchObject({ offer: 'pixiu-bracelet', offerNumber: '06', sku: 'be_pixiu_bracelet' });
  });

  it('records without a be_orders id — the shipment does not depend on that row existing', async () => {
    await recordBackendShipment(charmSession());
    expect(state.inserts[0].values.beOrderId).toBeNull();
  });

  it('upserts on the session and never rewrites status, address or tracking on a retry', async () => {
    await recordBackendShipment(charmSession(), { beOrderId: 'order-09' });
    const upsert = state.upserts.find((u) => u.table === beShipments);
    expect(upsert?.target).toBe(beShipments.stripeSessionId);
    for (const key of Object.keys(upsert!.set)) {
      expect(['stripePaymentIntentId', 'beOrderId', 'updatedAt']).toContain(key);
    }
  });

  it('a Stripe retry makes no second row and no second alert', async () => {
    await recordBackendShipment(charmSession());
    await recordBackendShipment(charmSession());
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('never throws when the database write fails', async () => {
    state.insertThrows = new Error('relation "be_shipments" does not exist');
    await expect(recordBackendShipment(charmSession())).resolves.toBeNull();
    expect(logged.error).toHaveBeenCalled();
  });
});

// ─── 2 · the operator alert ────────────────────────────────────────────────────

describe('the operator alert', () => {
  it('sends ONE email to ORDERS_NOTIFY_EMAIL with everything needed to pack and ship', async () => {
    await recordBackendShipment(charmSession());
    expect(send).toHaveBeenCalledTimes(1);
    const [msg] = sentMessages();
    expect(msg.to).toBe('orders@example.com');
    expect(msg.subject).toContain('BE 09');
    expect(msg.subject).toContain('Heart Cleanser Love Charm');
    for (const needle of [
      'be_heart_cleanser',
      'Quantity: 1',
      'Sarah <b>Rose</b>',
      '1 Rose Lane',
      'Flat 2',
      'Bath',
      'Somerset',
      'BA1 1AA',
      'GB',
      'she@example.com',
      'cs_test_09_ship',
      'pi_test_09',
      'ship-1',
      '2026-09-15',
      'POST /api/admin/shipments/ship-1/shipped',
    ]) {
      expect(msg.text, needle).toContain(needle);
    }
  });

  it('escapes what the buyer typed in the HTML version', async () => {
    await recordBackendShipment(charmSession());
    const [msg] = sentMessages();
    expect(msg.html).toContain('Sarah &lt;b&gt;Rose&lt;/b&gt;');
    expect(msg.html).not.toContain('<b>Rose</b>');
  });

  it('names the API route, never an admin UI page', async () => {
    await recordBackendShipment(charmSession());
    const [msg] = sentMessages();
    expect(msg.text).not.toMatch(/mark shipped at \/admin\/shipments/i);
    expect(msg.text).not.toMatch(/(^|\s)\/admin\/shipments/);
  });

  it('never uses the billing address in place of a shipping address', async () => {
    await recordBackendShipment(charmSession());
    expect(sentMessages()[0].text).not.toContain('9 Billing St');
  });

  it('stamps operator_alerted_at on success and clears any earlier error', async () => {
    await recordBackendShipment(charmSession());
    const stamped = shipmentUpdates().find((s) => s.operatorAlertedAt);
    expect(stamped?.operatorAlertedAt).toBeInstanceOf(Date);
    expect(stamped?.operatorAlertError).toBeNull();
  });

  it('stores a Resend API error, leaves the row unstamped, and logs loudly', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'rate limited', name: 'rate_limit_exceeded' } });
    await expect(recordBackendShipment(charmSession())).resolves.toBeTruthy();
    const updates = shipmentUpdates();
    expect(updates.some((s) => s.operatorAlertedAt)).toBe(false);
    expect(String(updates.at(-1)?.operatorAlertError)).toContain('rate limited');
    expect(logged.error).toHaveBeenCalled();
  });

  it('stores a THROWN send failure the same way', async () => {
    send.mockRejectedValue(new Error('socket hang up'));
    await expect(recordBackendShipment(charmSession())).resolves.toBeTruthy();
    expect(String(shipmentUpdates().at(-1)?.operatorAlertError)).toContain('socket hang up');
  });

  it('with no RESEND_API_KEY: a stored error, no send, no crash', async () => {
    delete process.env.RESEND_API_KEY;
    await expect(recordBackendShipment(charmSession())).resolves.toBeTruthy();
    expect(send).not.toHaveBeenCalled();
    expect(String(shipmentUpdates().at(-1)?.operatorAlertError)).toContain('RESEND_API_KEY');
  });

  it('a later call retries an alert that failed', async () => {
    send.mockResolvedValueOnce({ data: null, error: { message: 'down' } });
    await recordBackendShipment(charmSession());
    expect(state.shipment?.operatorAlertedAt).toBeFalsy();
    await recordBackendShipment(charmSession());
    expect(send).toHaveBeenCalledTimes(2);
    expect(state.shipment?.operatorAlertedAt).toBeInstanceOf(Date);
  });

  it('a paid order with NO shipping address: still a row, flagged, and a louder alert', async () => {
    await recordBackendShipment(charmSession({ collected_information: null }));
    expect(state.inserts[0].values).toMatchObject({
      addressMissing: true,
      line1: null,
      city: null,
      postalCode: null,
      country: null,
    });
    const [msg] = sentMessages();
    expect(msg.subject).toContain('NO SHIPPING ADDRESS');
    expect(msg.text).not.toContain('9 Billing St');
    expect(logged.error).toHaveBeenCalled();
  });

  it('the database being down does not silence the operator — an unrecorded alert still goes', async () => {
    state.insertThrows = new Error('connection refused');
    await recordBackendShipment(charmSession());
    expect(send).toHaveBeenCalledTimes(1);
    const [msg] = sentMessages();
    expect(msg.subject).toContain('NOT RECORDED');
    expect(msg.text).toContain('cs_test_09_ship');
    expect(msg.text).toContain('1 Rose Lane');
  });
});

// ─── 2b · the 09 Reiki charging bump in the operator alert ─────────────────────

describe('the operator alert — a bump someone must do before packing (09-C3)', () => {
  const REIKI = '⚡ REIKI CHARGE BEFORE PACKING';
  const reikiSession = (overrides: Row = {}) =>
    charmSession({ amount_total: 7011, ...overrides }, { bump: '1', bumpProduct: 'reiki_charge' });

  it('a bump order: the subject AND the first line lead with the Reiki alarm', async () => {
    await recordBackendShipment(reikiSession());
    const [msg] = sentMessages();
    expect(msg.subject.startsWith(REIKI)).toBe(true);
    expect(msg.subject).toContain('BE 09');
    expect(msg.text.split('\n')[0].startsWith(REIKI)).toBe(true);
    expect(msg.text).toContain('Reiki charging by Evelyn before packing: YES');
    expect(msg.text).toContain('reiki_charge');
    // The rest of the packing email is still there.
    expect(msg.text).toContain('1 Rose Lane');
    expect(msg.text).toContain('POST /api/admin/shipments/ship-1/shipped');
    expect(msg.html).toContain(REIKI);
  });

  it('a 09 order WITHOUT the bump: no alarm, and the body says plainly not to charge it', async () => {
    await recordBackendShipment(charmSession());
    const [msg] = sentMessages();
    expect(msg.subject).not.toMatch(/REIKI|⚡/);
    expect(msg.text.split('\n')[0]).toBe('A paid order is waiting to be packed and shipped.');
    expect(msg.text).toContain('Reiki charging by Evelyn before packing: NO');
  });

  it('06\'s text-instructional bump never borrows the alarm, and 06\'s email gains no Reiki line', async () => {
    await recordBackendShipment(charmSession({}, { product: 'be_pixiu_bracelet', offer: 'pixiu-bracelet', bump: '1' }));
    const [msg] = sentMessages();
    expect(msg.subject).not.toMatch(/REIKI|⚡/);
    expect(msg.text).not.toMatch(/reiki/i);
  });

  it('a bump order with NO address keeps both warnings in the subject', async () => {
    await recordBackendShipment(reikiSession({ collected_information: null }));
    const [msg] = sentMessages();
    expect(msg.subject.startsWith(REIKI)).toBe(true);
    expect(msg.subject).toContain('NO SHIPPING ADDRESS');
    expect(msg.text.split('\n')[0].startsWith(REIKI)).toBe(true);
  });

  it('the database being down still carries the alarm on the unrecorded alert', async () => {
    state.insertThrows = new Error('connection refused');
    await recordBackendShipment(reikiSession());
    const [msg] = sentMessages();
    expect(msg.subject.startsWith(REIKI)).toBe(true);
    expect(msg.subject).toContain('NOT RECORDED');
    expect(msg.text.split('\n')[0].startsWith(REIKI)).toBe(true);
  });

  it('a retried alert from an existing bump row still leads with the alarm', async () => {
    state.shipment = {
      ...NEW_ROW_DEFAULTS, offer: 'heart-cleanser', offerNumber: '09', sku: 'be_heart_cleanser',
      stripeSessionId: 'cs_test_09_ship', addressMissing: false, line1: '1 Rose Lane', country: 'GB',
      bumpPurchased: true, bumpProductKey: 'reiki_charge',
    };
    await ensureBackendShipment({ sessionId: 'cs_test_09_ship', offerKey: 'heart-cleanser' });
    expect(sentMessages()[0].subject.startsWith(REIKI)).toBe(true);
  });

  it('a refund of a bump order says DO NOT SHIP first, and notes the charging was paid for', async () => {
    state.shipment = {
      ...NEW_ROW_DEFAULTS, offer: 'heart-cleanser', offerNumber: '09', sku: 'be_heart_cleanser',
      stripeSessionId: 'cs_test_09_ship', stripePaymentIntentId: 'pi_test_09', addressMissing: false,
      line1: '1 Rose Lane', country: 'GB', bumpPurchased: true, bumpProductKey: 'reiki_charge',
    };
    await handleBackendRefund({ id: 'ch_1', refunded: true, amount: 7011, amount_refunded: 7011, payment_intent: 'pi_test_09', metadata: { product: 'be_heart_cleanser' } } as never);
    const [msg] = sentMessages();
    expect(msg.subject.startsWith('🛑 DO NOT SHIP')).toBe(true);
    expect(msg.text).toContain('Reiki charging by Evelyn before packing: YES');
  });

  it('the idempotent retry still never rewrites the bump flag', async () => {
    await recordBackendShipment(reikiSession());
    const upsert = state.upserts.find((u) => u.table === beShipments);
    expect(Object.keys(upsert!.set)).not.toContain('bumpPurchased');
    expect(Object.keys(upsert!.set)).not.toContain('bumpProductKey');
  });
});

describe('be_shipments bump columns — schema and the unapplied migration agree', () => {
  it('schema: bump_purchased BOOLEAN NOT NULL DEFAULT false, bump_product_key TEXT', () => {
    expect(beShipments.bumpPurchased.name).toBe('bump_purchased');
    expect(beShipments.bumpPurchased.notNull).toBe(true);
    expect(beShipments.bumpPurchased.default).toBe(false);
    expect(beShipments.bumpProductKey.name).toBe('bump_product_key');
    expect(beShipments.bumpProductKey.notNull).toBe(false);
  });

  it('migration: both columns in the CREATE, and an idempotent ADD COLUMN for a table created earlier', () => {
    const sql = readFileSync(path.resolve(__dirname, '../../migrations/2026-09-15-be-shipments.sql'), 'utf8')
      .replace(/--.*$/gm, '')
      .replace(/\s+/g, ' ');
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS be_shipments \(.*bump_purchased BOOLEAN NOT NULL DEFAULT false,.*\);/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS be_shipments \(.*bump_product_key TEXT,.*\);/i);
    expect(sql).toMatch(/ALTER TABLE be_shipments ADD COLUMN IF NOT EXISTS bump_purchased BOOLEAN NOT NULL DEFAULT false;/i);
    expect(sql).toMatch(/ALTER TABLE be_shipments ADD COLUMN IF NOT EXISTS bump_product_key TEXT;/i);
  });
});

// ─── 3 · the receipt page backstop ─────────────────────────────────────────────

describe('ensureBackendShipment — the order-lookup retry path', () => {
  it('does nothing for a digital offer', async () => {
    const retrieveSession = vi.fn();
    expect(await ensureBackendShipment({ sessionId: 'cs_x', offerKey: 'twin-flame', retrieveSession })).toBeNull();
    expect(state.selects).toHaveLength(0);
    expect(retrieveSession).not.toHaveBeenCalled();
  });

  it('does nothing for an unknown offer key', async () => {
    expect(await ensureBackendShipment({ sessionId: 'cs_x', offerKey: 'hex-her' })).toBeNull();
    expect(state.selects).toHaveLength(0);
  });

  it('returns an already-alerted shipment untouched', async () => {
    state.shipment = { ...NEW_ROW_DEFAULTS, offer: 'heart-cleanser', stripeSessionId: 'cs_test_09_ship', operatorAlertedAt: new Date() };
    const retrieveSession = vi.fn();
    const r = await ensureBackendShipment({ sessionId: 'cs_test_09_ship', offerKey: 'heart-cleanser', retrieveSession });
    expect(r?.id).toBe('ship-1');
    expect(retrieveSession).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('retries the alert on an existing row that was never alerted', async () => {
    state.shipment = {
      ...NEW_ROW_DEFAULTS, offer: 'heart-cleanser', offerNumber: '09', sku: 'be_heart_cleanser',
      stripeSessionId: 'cs_test_09_ship', addressMissing: false, line1: '1 Rose Lane', country: 'GB',
    };
    const retrieveSession = vi.fn();
    await ensureBackendShipment({ sessionId: 'cs_test_09_ship', offerKey: 'heart-cleanser', retrieveSession });
    expect(send).toHaveBeenCalledTimes(1);
    expect(retrieveSession).not.toHaveBeenCalled();
    expect(state.shipment?.operatorAlertedAt).toBeInstanceOf(Date);
  });

  it('records the shipment from Stripe when the row is missing', async () => {
    const retrieveSession = vi.fn(async () => charmSession());
    const r = await ensureBackendShipment({
      sessionId: 'cs_test_09_ship', offerKey: 'heart-cleanser', beOrderId: 'order-09', retrieveSession,
    });
    expect(retrieveSession).toHaveBeenCalledTimes(1);
    expect(r?.id).toBe('ship-1');
    expect(state.inserts[0].values).toMatchObject({ beOrderId: 'order-09', offer: 'heart-cleanser' });
  });

  it('uses a session already in hand instead of retrieving it again', async () => {
    const retrieveSession = vi.fn();
    await ensureBackendShipment({ sessionId: 'cs_test_09_ship', offerKey: 'heart-cleanser', session: charmSession(), retrieveSession });
    expect(retrieveSession).not.toHaveBeenCalled();
    expect(state.inserts).toHaveLength(1);
  });

  it('never throws — a receipt must render even when shipments are broken', async () => {
    state.selectThrows = new Error('relation "be_shipments" does not exist');
    await expect(
      ensureBackendShipment({ sessionId: 'cs_test_09_ship', offerKey: 'heart-cleanser' }),
    ).resolves.toBeNull();
    expect(logged.error).toHaveBeenCalled();
  });
});

// ─── 4 · the public shape on the receipt ───────────────────────────────────────

describe('publicShipping — what the thank-you page may show', () => {
  const row = {
    ...NEW_ROW_DEFAULTS,
    recipientName: 'Sarah Rose',
    line1: '1 Rose Lane',
    line2: 'Flat 2',
    city: 'Bath',
    state: 'Somerset',
    postalCode: 'BA1 1AA',
    country: 'GB',
    addressMissing: false,
    phone: '+44 7700 900000',
    email: 'she@example.com',
    stripePaymentIntentId: 'pi_secret',
  } as never;

  it('gives the pixiu page its string, one line per address line, and a structured copy', () => {
    const out = publicShipping(row);
    expect(out.shipping).toBe('Sarah Rose\n1 Rose Lane\nFlat 2\nBath, Somerset BA1 1AA\nGB');
    expect(out.shippingAddress).toEqual({
      recipientName: 'Sarah Rose',
      line1: '1 Rose Lane',
      line2: 'Flat 2',
      city: 'Bath',
      state: 'Somerset',
      postalCode: 'BA1 1AA',
      country: 'GB',
      status: 'pending',
      addressMissing: false,
    });
    expect(JSON.stringify(out)).not.toContain('pi_secret');
    expect(JSON.stringify(out)).not.toContain('+44');
  });

  it('prints no address string when the address is missing', () => {
    const out = publicShipping({ ...(row as object), line1: null, city: null, country: null, addressMissing: true } as never);
    expect(out.shipping).toBeNull();
    expect(out.shippingAddress?.addressMissing).toBe(true);
  });

  it('is null throughout when there is no shipment row', () => {
    expect(publicShipping(null)).toEqual({ shipping: null, shippingAddress: null });
  });
});

// ─── 5 · refunds ───────────────────────────────────────────────────────────────

describe('handleBackendRefund — charge.refunded', () => {
  const charge = (overrides: Row = {}) =>
    ({
      id: 'ch_test_1',
      object: 'charge',
      refunded: true,
      amount: 5900,
      amount_refunded: 5900,
      payment_intent: 'pi_test_09',
      metadata: { product: 'be_heart_cleanser', offer: 'heart-cleanser' },
      ...overrides,
    }) as never;

  const pendingShipment = () => ({
    ...NEW_ROW_DEFAULTS, offer: 'heart-cleanser', offerNumber: '09', sku: 'be_heart_cleanser',
    stripeSessionId: 'cs_test_09_ship', stripePaymentIntentId: 'pi_test_09', email: 'she@example.com',
    recipientName: 'Sarah Rose', line1: '1 Rose Lane', country: 'GB', addressMissing: false,
    operatorAlertedAt: new Date('2026-09-15T10:00:01.000Z'),
  });

  it('ignores a charge whose metadata names a non-backend product — no lookups at all', async () => {
    const retrievePaymentIntent = vi.fn();
    await handleBackendRefund(charge({ metadata: { product: 'energy_clearing_ritual' } }), { retrievePaymentIntent });
    expect(retrievePaymentIntent).not.toHaveBeenCalled();
    expect(state.updates).toHaveLength(0);
    expect(state.selects).toHaveLength(0);
    expect(send).not.toHaveBeenCalled();
  });

  it('reads the PaymentIntent when the charge carries no product, and still ignores a funnel product', async () => {
    const retrievePaymentIntent = vi.fn(async () => ({ metadata: { product: 'protection_ritual' } }));
    await handleBackendRefund(charge({ metadata: {} }), { retrievePaymentIntent });
    expect(retrievePaymentIntent).toHaveBeenCalledWith('pi_test_09');
    expect(state.updates).toHaveLength(0);
  });

  it('acts on a backend product found on the PaymentIntent', async () => {
    state.shipment = pendingShipment();
    const retrievePaymentIntent = vi.fn(async () => ({ metadata: { product: 'be_heart_cleanser' } }));
    await handleBackendRefund(charge({ metadata: {} }), { retrievePaymentIntent });
    expect(state.shipment?.status).toBe('cancelled');
  });

  it('a FULL refund marks the order refunded, cancels the pending shipment and says DO NOT SHIP', async () => {
    state.shipment = pendingShipment();
    await handleBackendRefund(charge());
    const orderUpdate = state.updates.find((u) => u.table === beOrders);
    expect(orderUpdate?.set).toMatchObject({ status: 'refunded' });
    expect(state.shipment).toMatchObject({ status: 'cancelled', cancelReason: 'refunded' });
    expect(state.shipment?.cancelledAt).toBeInstanceOf(Date);
    expect(send).toHaveBeenCalledTimes(1);
    const [msg] = sentMessages();
    expect(msg.to).toBe('orders@example.com');
    expect(msg.subject).toContain('DO NOT SHIP');
    expect(msg.text).toContain('ship-1');
    expect(msg.text).toContain('cs_test_09_ship');
  });

  it('leaves an already-SHIPPED shipment alone and sends no do-not-ship alert', async () => {
    state.shipment = { ...pendingShipment(), status: 'shipped', shippedAt: new Date() };
    await handleBackendRefund(charge());
    expect(state.shipment?.status).toBe('shipped');
    expect(send).not.toHaveBeenCalled();
    expect(state.updates.find((u) => u.table === beOrders)?.set).toMatchObject({ status: 'refunded' });
  });

  it('a PARTIAL refund changes nothing and is logged for a human', async () => {
    state.shipment = pendingShipment();
    await handleBackendRefund(charge({ refunded: false, amount_refunded: 1000 }));
    expect(state.updates).toHaveLength(0);
    expect(state.shipment?.status).toBe('pending');
    expect(logged.warn).toHaveBeenCalled();
  });

  it('never throws, even when the database does', async () => {
    state.selectThrows = new Error('boom');
    await expect(handleBackendRefund(charge())).resolves.toBeUndefined();
    expect(logged.error).toHaveBeenCalled();
  });
});
