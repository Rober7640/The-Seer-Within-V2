// 04 · The Turn — the in-app delivery job (server/lib/be04Delivery.ts), with every dependency
// faked: an in-memory be_orders, a Stripe session lookup, the AWeber write, and the clock.
//
//   npx vitest run server/lib/be04Delivery.test.ts
//
// What these pin down:
//  1. DUE MEANS PAID, UNDELIVERED AND PAST THE DELAY. Not before, and never twice.
//  2. HER DRAWN CUP DECIDES HER READING (checkout draws it, metadata `cup`). A missing cup is
//     the default; an UNREADABLE cup is not guessed — the order waits for the next tick.
//  3. NO LINK, NO SEND. A cup whose link is unset or not https is skipped, loudly.
//  4. ONE FAILURE NEVER STOPS THE OTHERS, and anything still undelivered at 23 hours is an
//     error-level log line on every tick.
//  5. OFF BY DEFAULT. The timer is not registered unless BE04_DELIVERY_ENABLED is 'true'.

import { beforeEach, describe, expect, it, vi } from 'vitest';

// The real deps' wiring is checked against these recording fakes at the bottom of the file.
const fakeDb = vi.hoisted(() => ({}) as Record<string, unknown>);
vi.mock('./db', () => ({ db: fakeDb }));
const logged = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
vi.mock('./logger', () => ({ default: logged }));
const stripeRetrieve = vi.hoisted(() => vi.fn());
vi.mock('./stripeAccount', () => ({
  getStripe: () => ({ checkout: { sessions: { retrieve: stripeRetrieve } } }),
}));
const markBackendReadingDelivered = vi.hoisted(() => vi.fn(async () => ({ success: true })));
vi.mock('./aweber', () => ({ markBackendReadingDelivered }));

const {
  BE04_DELIVERY_CRON,
  be04DeliveryConfig,
  be04DeliveryEnabled,
  be04ReadingUrlEnv,
  defaultBe04DeliveryDeps,
  deliverDueTeaReadings,
  startBe04DeliveryJob,
} = await import('./be04Delivery');
type Deps = Parameters<typeof deliverDueTeaReadings>[0];

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse('2026-10-14T12:00:00Z');

const URLS = {
  'turned-handle': 'https://files.example.com/04/turned-handle-a1b2.pdf',
  'divided-rim': 'https://files.example.com/04/divided-rim-c3d4.pdf',
  'sunken-leaf': 'https://files.example.com/04/sunken-leaf-e5f6.pdf',
};

interface FakeOrder {
  id: string;
  stripeSessionId: string;
  offer: string;
  status: string;
  email: string | null;
  createdAt: Date;
  deliveredAt: Date | null;
  readingUrl: string | null;
}

/** A paid 04 order created `hoursAgo` before NOW. */
function order(id: string, hoursAgo: number, overrides: Partial<FakeOrder> = {}): FakeOrder {
  return {
    id,
    stripeSessionId: `cs_test_${id}`,
    offer: 'tea-reading',
    status: 'paid',
    email: `${id}@example.com`,
    createdAt: new Date(NOW - hoursAgo * HOUR),
    deliveredAt: null,
    readingUrl: null,
    ...overrides,
  };
}

/**
 * Fakes that behave like the real deps: `findUndelivered` applies the same WHERE clause the
 * SQL does, and `stampDelivered` COALESCEs delivered_at, so re-runs are honest.
 */
function harness(orders: FakeOrder[], cups: Record<string, unknown> = {}) {
  const calls = { marked: [] as Array<Record<string, string>>, lookups: [] as string[] };
  let nowMs = NOW;
  const deps: Deps = {
    findUndelivered: vi.fn(async (paidBefore: Date) =>
      orders
        .filter((o) => o.offer === 'tea-reading' && o.status === 'paid' && o.deliveredAt === null)
        .filter((o) => o.createdAt.getTime() <= paidBefore.getTime())
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map(({ id, stripeSessionId, email, createdAt }) => ({ id, stripeSessionId, email, createdAt })),
    ),
    lookupCup: vi.fn(async (sessionId: string) => {
      calls.lookups.push(sessionId);
      const cup = cups[sessionId];
      if (cup instanceof Error) throw cup;
      return cup ?? null;
    }),
    markDelivered: vi.fn(async (params) => {
      calls.marked.push(params);
      return { success: true };
    }),
    stampDelivered: vi.fn(async (orderId: string, readingUrl: string) => {
      const row = orders.find((o) => o.id === orderId)!;
      row.readingUrl = readingUrl;
      row.deliveredAt = row.deliveredAt ?? new Date(nowMs);
      return row.deliveredAt;
    }),
    now: () => nowMs,
    config: { delayHours: 12, readingUrls: { ...URLS } },
  };
  return { deps, calls, setNow: (ms: number) => (nowMs = ms) };
}

beforeEach(() => {
  for (const fn of Object.values(logged)) fn.mockClear();
});

describe('deliverDueTeaReadings — which orders are due', () => {
  it('delivers an order past the delay and leaves a younger one alone', async () => {
    const orders = [order('due', 12.5), order('young', 11.5)];
    const { deps, calls } = harness(orders, { cs_test_due: 'sunken-leaf' });
    const result = await deliverDueTeaReadings(deps);
    expect(result).toEqual({ due: 1, delivered: 1, skipped: 0, failed: 0, overdue: 0 });
    expect(calls.marked).toEqual([
      { email: 'due@example.com', offer: 'tea-reading', stripeOrderId: 'cs_test_due', readingUrl: URLS['sunken-leaf'] },
    ]);
    expect(orders[0].readingUrl).toBe(URLS['sunken-leaf']);
    expect(orders[0].deliveredAt).not.toBeNull();
    expect(orders[1].deliveredAt).toBeNull();
  });

  it('asks the database for orders paid at or before now − delay', async () => {
    const { deps } = harness([]);
    deps.config.delayHours = 6;
    await deliverDueTeaReadings(deps);
    expect(deps.findUndelivered).toHaveBeenCalledWith(new Date(NOW - 6 * HOUR));
  });

  it('never delivers a refunded order or another offer\'s order', async () => {
    const orders = [
      order('refunded', 20, { status: 'refunded' }),
      order('other', 20, { offer: 'judgement-day' }),
    ];
    const { deps, calls } = harness(orders);
    const result = await deliverDueTeaReadings(deps);
    expect(result.due).toBe(0);
    expect(calls.marked).toEqual([]);
  });

  it('is idempotent — a second run sends nothing and does not move delivered_at', async () => {
    const orders = [order('a', 13), order('b', 14)];
    const { deps, calls, setNow } = harness(orders, { cs_test_a: 'turned-handle', cs_test_b: 'divided-rim' });
    await deliverDueTeaReadings(deps);
    const firstStamp = orders.map((o) => o.deliveredAt?.getTime());
    expect(calls.marked).toHaveLength(2);

    setNow(NOW + 10 * 60 * 1000);
    const again = await deliverDueTeaReadings(deps);
    expect(again).toEqual({ due: 0, delivered: 0, skipped: 0, failed: 0, overdue: 0 });
    expect(calls.marked).toHaveLength(2);
    expect(orders.map((o) => o.deliveredAt?.getTime())).toEqual(firstStamp);
  });
});

describe('deliverDueTeaReadings — her cup and its link', () => {
  it('sends each cup its own reading', async () => {
    const orders = [order('t', 13), order('d', 13.5), order('s', 14)];
    const { deps, calls } = harness(orders, {
      cs_test_t: 'turned-handle',
      cs_test_d: 'divided-rim',
      cs_test_s: 'sunken-leaf',
    });
    await deliverDueTeaReadings(deps);
    expect(Object.fromEntries(calls.marked.map((m) => [m.stripeOrderId, m.readingUrl]))).toEqual({
      cs_test_t: URLS['turned-handle'],
      cs_test_d: URLS['divided-rim'],
      cs_test_s: URLS['sunken-leaf'],
    });
  });

  it('a session with no cup (or an invalid one) gets the default — the divided rim', async () => {
    const orders = [order('none', 13), order('junk', 13)];
    const { deps, calls } = harness(orders, { cs_test_junk: 'teacup-of-doom' });
    await deliverDueTeaReadings(deps);
    expect(calls.marked.map((m) => m.readingUrl)).toEqual([URLS['divided-rim'], URLS['divided-rim']]);
  });

  it('⛔ an UNREADABLE cup is not guessed — the order waits, and the others still go', async () => {
    const orders = [order('stripe-down', 14), order('fine', 13)];
    const { deps, calls } = harness(orders, {
      cs_test_fine: 'sunken-leaf',
      'cs_test_stripe-down': new Error('Stripe 503'),
    });
    const result = await deliverDueTeaReadings(deps);
    expect(result).toMatchObject({ due: 2, delivered: 1, failed: 1 });
    expect(calls.marked.map((m) => m.stripeOrderId)).toEqual(['cs_test_fine']);
    expect(orders[0].deliveredAt).toBeNull();
  });

  it('skips a cup with no link — never sends an empty or wrong reading_url — and logs it', async () => {
    const orders = [order('s', 14), order('t', 13)];
    const { deps, calls } = harness(orders, { cs_test_s: 'sunken-leaf', cs_test_t: 'turned-handle' });
    deps.config.readingUrls['sunken-leaf'] = null;
    const result = await deliverDueTeaReadings(deps);
    expect(result).toMatchObject({ delivered: 1, skipped: 1 });
    expect(calls.marked.map((m) => m.readingUrl)).toEqual([URLS['turned-handle']]);
    expect(orders[0].deliveredAt).toBeNull();
    expect(logged.error).toHaveBeenCalledWith(
      expect.stringContaining('no https reading link'),
      expect.objectContaining({ cup: 'sunken-leaf', env: 'BE04_READING_URL_SUNKEN_LEAF' }),
    );
  });

  it('skips an order with no email, without calling AWeber', async () => {
    const orders = [order('anon', 14, { email: null })];
    const { deps, calls } = harness(orders);
    const result = await deliverDueTeaReadings(deps);
    expect(result).toMatchObject({ skipped: 1, delivered: 0 });
    expect(calls.marked).toEqual([]);
    expect(deps.lookupCup).not.toHaveBeenCalled();
  });
});

describe('deliverDueTeaReadings — failures', () => {
  it('one AWeber failure (or throw) does not stop the others, and is not stamped', async () => {
    const orders = [order('fails', 15), order('throws', 14), order('ok', 13)];
    const { deps } = harness(orders);
    vi.mocked(deps.markDelivered).mockImplementation(async (p) => {
      if (p.stripeOrderId === 'cs_test_fails') return { success: false, error: 'AWeber API error: 500' };
      if (p.stripeOrderId === 'cs_test_throws') throw new Error('socket hang up');
      return { success: true };
    });
    const result = await deliverDueTeaReadings(deps);
    expect(result).toMatchObject({ due: 3, delivered: 1, failed: 2 });
    expect(orders.map((o) => o.deliveredAt !== null)).toEqual([false, false, true]);
  });

  it('a stamp failure after AWeber said yes is a failure, but not an OVERDUE one — the email went', async () => {
    const orders = [order('late', 30)];
    const { deps } = harness(orders);
    vi.mocked(deps.stampDelivered).mockRejectedValue(new Error('db down'));
    const result = await deliverDueTeaReadings(deps);
    expect(result).toMatchObject({ failed: 1, overdue: 0 });
    expect(deps.markDelivered).toHaveBeenCalledTimes(1);
  });

  it('logs OVERDUE at error level for an order still undelivered past 23 hours', async () => {
    const orders = [order('stuck', 23.5), order('young-stuck', 15)];
    const { deps } = harness(orders);
    deps.config.readingUrls['divided-rim'] = null;
    const result = await deliverDueTeaReadings(deps);
    expect(result).toMatchObject({ skipped: 2, overdue: 1 });
    const overdue = logged.error.mock.calls.filter(([msg]) => String(msg).includes('OVERDUE'));
    expect(overdue).toHaveLength(1);
    expect(overdue[0][1]).toMatchObject({ session: 'cs_test_stuck', reason: 'no_reading_url' });
  });

  it('an order delivered late is delivered, not logged as overdue', async () => {
    const orders = [order('very-late', 40)];
    const { deps } = harness(orders);
    const result = await deliverDueTeaReadings(deps);
    expect(result).toMatchObject({ delivered: 1, overdue: 0 });
  });
});

describe('be04DeliveryConfig — read from env', () => {
  const full = {
    BE04_READING_URL_TURNED_HANDLE: URLS['turned-handle'],
    BE04_READING_URL_DIVIDED_RIM: URLS['divided-rim'],
    BE04_READING_URL_SUNKEN_LEAF: URLS['sunken-leaf'],
  };

  it('names one env var per cup', () => {
    expect(be04ReadingUrlEnv('turned-handle')).toBe('BE04_READING_URL_TURNED_HANDLE');
    expect(be04ReadingUrlEnv('divided-rim')).toBe('BE04_READING_URL_DIVIDED_RIM');
    expect(be04ReadingUrlEnv('sunken-leaf')).toBe('BE04_READING_URL_SUNKEN_LEAF');
  });

  it('defaults the delay to 12 hours and clamps it to 1–23', () => {
    expect(be04DeliveryConfig({}).delayHours).toBe(12);
    expect(be04DeliveryConfig({ BE04_DELIVERY_DELAY_HOURS: '' }).delayHours).toBe(12);
    expect(be04DeliveryConfig({ BE04_DELIVERY_DELAY_HOURS: 'soon' }).delayHours).toBe(12);
    expect(be04DeliveryConfig({ BE04_DELIVERY_DELAY_HOURS: '6' }).delayHours).toBe(6);
    expect(be04DeliveryConfig({ BE04_DELIVERY_DELAY_HOURS: '0' }).delayHours).toBe(1);
    expect(be04DeliveryConfig({ BE04_DELIVERY_DELAY_HOURS: '48' }).delayHours).toBe(23);
  });

  it('keeps https links and drops anything else', () => {
    expect(be04DeliveryConfig(full).readingUrls).toEqual(URLS);
    const bad = be04DeliveryConfig({
      BE04_READING_URL_TURNED_HANDLE: 'http://files.example.com/x.pdf',
      BE04_READING_URL_DIVIDED_RIM: 'javascript:alert(1)',
      BE04_READING_URL_SUNKEN_LEAF: '',
    });
    expect(bad.readingUrls).toEqual({ 'turned-handle': null, 'divided-rim': null, 'sunken-leaf': null });
    expect(be04DeliveryConfig({}).readingUrls['divided-rim']).toBeNull();
  });
});

describe('startBe04DeliveryJob — OFF by default', () => {
  it('registers nothing when BE04_DELIVERY_ENABLED is unset or anything but "true"', () => {
    const schedule = vi.fn();
    for (const env of [{}, { BE04_DELIVERY_ENABLED: 'false' }, { BE04_DELIVERY_ENABLED: '1' }, { BE04_DELIVERY_ENABLED: 'TRUE' }]) {
      expect(be04DeliveryEnabled(env)).toBe(false);
      expect(startBe04DeliveryJob(schedule, env)).toBe(false);
    }
    expect(schedule).not.toHaveBeenCalled();
  });

  it('registers one every-10-minutes timer when it is exactly "true", and a tick delivers', async () => {
    const schedule = vi.fn();
    const orders = [order('due', 13)];
    const { deps, calls } = harness(orders, { cs_test_due: 'sunken-leaf' });
    expect(startBe04DeliveryJob(schedule, { BE04_DELIVERY_ENABLED: 'true' }, () => deps)).toBe(true);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule.mock.calls[0][0]).toBe(BE04_DELIVERY_CRON);
    expect(BE04_DELIVERY_CRON).toBe('*/10 * * * *');

    const tick = schedule.mock.calls[0][1] as () => Promise<void>;
    await tick();
    expect(calls.marked).toHaveLength(1);
  });

  it('a tick that finds the previous one still running does nothing', async () => {
    const schedule = vi.fn();
    let release!: () => void;
    const { deps } = harness([]);
    deps.findUndelivered = vi.fn(() => new Promise<never[]>((resolve) => { release = () => resolve([]); }));
    startBe04DeliveryJob(schedule, { BE04_DELIVERY_ENABLED: 'true' }, () => deps);
    const tick = schedule.mock.calls[0][1] as () => Promise<void>;
    const first = tick();
    await tick();
    expect(deps.findUndelivered).toHaveBeenCalledTimes(1);
    release();
    await first;
  });

  it('a tick that throws is logged, and the next tick runs', async () => {
    const schedule = vi.fn();
    const { deps } = harness([]);
    deps.findUndelivered = vi.fn().mockRejectedValueOnce(new Error('db down')).mockResolvedValue([]);
    startBe04DeliveryJob(schedule, { BE04_DELIVERY_ENABLED: 'true' }, () => deps);
    const tick = schedule.mock.calls[0][1] as () => Promise<void>;
    await tick();
    expect(logged.error).toHaveBeenCalledWith(expect.stringContaining('tick FAILED'), expect.anything());
    await tick();
    expect(deps.findUndelivered).toHaveBeenCalledTimes(2);
  });
});

describe('defaultBe04DeliveryDeps — the real database, Stripe and AWeber wiring', () => {
  it('reads her cup off the Stripe session metadata, and throws when Stripe cannot be read', async () => {
    const deps = defaultBe04DeliveryDeps({});
    stripeRetrieve.mockResolvedValueOnce({ id: 'cs_test_x', metadata: { cup: 'sunken-leaf' } });
    await expect(deps.lookupCup('cs_test_x')).resolves.toBe('sunken-leaf');
    expect(stripeRetrieve).toHaveBeenCalledWith('cs_test_x');
    stripeRetrieve.mockResolvedValueOnce({ id: 'cs_test_y', metadata: {} });
    await expect(deps.lookupCup('cs_test_y')).resolves.toBeNull();
    stripeRetrieve.mockRejectedValueOnce(new Error('No such checkout.session'));
    await expect(deps.lookupCup('cs_test_z')).rejects.toThrow('No such checkout.session');
  });

  it('selects only base be_orders columns — production may lack the 07/08 ones', async () => {
    const rows = [{ id: 'o1', stripeSessionId: 'cs_test_o1', email: 'a@example.com', createdAt: new Date() }];
    const chain = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(async () => rows),
    };
    fakeDb.select = vi.fn(() => chain);
    const deps = defaultBe04DeliveryDeps({});
    await expect(deps.findUndelivered(new Date(NOW))).resolves.toBe(rows);
    const columns = vi.mocked(fakeDb.select as (c: Record<string, unknown>) => unknown).mock.calls[0][0];
    expect(Object.keys(columns).sort()).toEqual(['createdAt', 'email', 'id', 'stripeSessionId']);
    expect(chain.where).toHaveBeenCalledTimes(1);
    expect(chain.limit).toHaveBeenCalledWith(50);
  });

  it('stamps reading_url and a COALESCEd delivered_at, returning only delivered_at', async () => {
    const stamped = new Date(NOW);
    const captured: { set?: Record<string, unknown>; returning?: Record<string, unknown> } = {};
    fakeDb.update = vi.fn(() => ({
      set: (values: Record<string, unknown>) => {
        captured.set = values;
        return {
          where: () => ({
            returning: async (cols: Record<string, unknown>) => {
              captured.returning = cols;
              return [{ deliveredAt: stamped }];
            },
          }),
        };
      },
    }));
    const deps = defaultBe04DeliveryDeps({});
    await expect(deps.stampDelivered('o1', URLS['divided-rim'])).resolves.toBe(stamped);
    expect(captured.set?.readingUrl).toBe(URLS['divided-rim']);
    // An SQL expression (COALESCE), never a plain Date that would move the first delivery.
    expect(captured.set?.deliveredAt).not.toBeInstanceOf(Date);
    expect(captured.set?.deliveredAt).toBeTruthy();
    expect(Object.keys(captured.returning ?? {})).toEqual(['deliveredAt']);
  });

  it('hands AWeber exactly the delivery params', async () => {
    const deps = defaultBe04DeliveryDeps({});
    const params = {
      email: 'she@example.com',
      offer: 'tea-reading' as const,
      stripeOrderId: 'cs_test_a',
      readingUrl: URLS['turned-handle'],
    };
    await expect(deps.markDelivered(params)).resolves.toEqual({ success: true });
    expect(markBackendReadingDelivered).toHaveBeenCalledWith(params);
  });

  it('reads its config from the env it is given', () => {
    const deps = defaultBe04DeliveryDeps({ BE04_DELIVERY_DELAY_HOURS: '3', BE04_READING_URL_DIVIDED_RIM: URLS['divided-rim'] });
    expect(deps.config.delayHours).toBe(3);
    expect(deps.config.readingUrls['divided-rim']).toBe(URLS['divided-rim']);
    expect(deps.config.readingUrls['sunken-leaf']).toBeNull();
  });
});
