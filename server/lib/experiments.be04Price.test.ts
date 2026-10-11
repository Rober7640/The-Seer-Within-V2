// 04's price split test in the experiment framework (server/lib/experiments.ts):
// resolveBe04Price, and the conversions that score it — against an in-memory fake of the three
// experiment tables. No database is touched.
//
//   npx vitest run server/lib/experiments.be04Price.test.ts
//
// What these pin down:
//  1. FAILS SAFE TO $35. No row, a draft, a paused test, no visitor id, a DB read error, or a
//     payload outside {3500, 4500} ⇒ arm A, $35, and NO exposure.
//  2. RUNNING ⇒ A STICKY 50/50 SPLIT. Each visitor always gets the same arm (and its price);
//     both arms are dealt; the exposure is logged once (surface be_04_price).
//  3. CONVERSIONS. The booking writes one row (amount_total, bump included) and each upsell
//     product one more, all on the arm she was exposed to — once per (visitor, event), so Stripe
//     retries are no-ops. No exposure ⇒ nothing written. 02's booking conversion is unchanged.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { experiments, experimentConversions, experimentExposures } from '@shared/schema';

type Row = Record<string, unknown>;

const store = {
  experiment: null as Row | null,
  exposures: [] as Row[],
  conversions: [] as Row[],
  failReads: false,
};

/** The last `where(...)` filter, read back as { column-name: value } pairs. */
function filterOf(cond: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const walk = (node: unknown) => {
    const chunks = (node as { queryChunks?: unknown[] } | null)?.queryChunks;
    if (!Array.isArray(chunks)) return;
    let column: string | null = null;
    for (const chunk of chunks) {
      const c = chunk as { name?: unknown; value?: unknown; queryChunks?: unknown };
      if (c && typeof c === 'object' && 'queryChunks' in c) walk(c);
      else if (c && typeof c === 'object' && typeof c.name === 'string' && 'columnType' in c) column = c.name;
      else if (c && typeof c === 'object' && 'value' in c && column && !Array.isArray(c.value)) {
        out[column] = c.value;
        column = null;
      }
    }
  };
  walk(cond);
  return out;
}

function matches(row: Row, filter: Record<string, unknown>): boolean {
  const keyOf: Record<string, string> = {
    key: 'key',
    experiment_key: 'experimentKey',
    subject_id: 'subjectId',
    event: 'event',
  };
  return Object.entries(filter).every(([col, v]) => row[keyOf[col] ?? col] === v);
}

vi.mock('./db', () => ({
  db: {
    select: () => ({
      from: (table: unknown) => ({
        where: (cond: unknown) => ({
          limit: async () => {
            if (store.failReads) throw new Error('connection refused');
            const filter = filterOf(cond);
            if (table === experiments) return store.experiment && matches(store.experiment, filter) ? [store.experiment] : [];
            if (table === experimentExposures) return store.exposures.filter((r) => matches(r, filter)).slice(0, 1);
            if (table === experimentConversions) return store.conversions.filter((r) => matches(r, filter)).slice(0, 1);
            return [];
          },
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: (v: Row) => {
        const done = (async () => {
          if (table === experimentConversions) store.conversions.push(v);
        })();
        return {
          then: (resolve: (x: unknown) => void, reject: (e: unknown) => void) => done.then(resolve, reject),
          onConflictDoNothing: async () => {
            if (table !== experimentExposures) return;
            const dup = store.exposures.some((r) => r.experimentKey === v.experimentKey && r.subjectId === v.subjectId);
            if (!dup) store.exposures.push(v);
          },
        };
      },
    }),
  },
}));
vi.mock('./logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const {
  BE_04_PRICE_KEY,
  BE_04_BOOKING_EVENT,
  _resetExperimentCache,
  be04UpsellEvent,
  logBe04UpsellConversion,
  logBeBookingConversion,
  resolveBe04Price,
} = await import('./experiments');

const KEY = 'be_04_price_2026';

function experimentRow(overrides: Row = {}): Row {
  return {
    key: KEY,
    status: 'running',
    subjectType: 'visitor',
    variants: [
      { key: 'A', weight: 50, payload: { priceCents: 3500 } },
      { key: 'B', weight: 50, payload: { priceCents: 4500 } },
    ],
    scope: { freezeAssignment: true },
    conversion: { type: 'event', name: 'be_04_purchased', windowDays: 7 },
    winnerVariant: null,
    ...overrides,
  };
}

beforeEach(() => {
  _resetExperimentCache();
  store.experiment = null;
  store.exposures = [];
  store.conversions = [];
  store.failReads = false;
  delete process.env.EXPERIMENT_FORCE_RUNNING;
});

describe('resolveBe04Price — fails safe to $35', () => {
  it('is keyed be_04_price_2026', () => {
    expect(BE_04_PRICE_KEY).toBe(KEY);
  });

  it('no experiment row ⇒ arm A, $35, nothing logged', async () => {
    expect(await resolveBe04Price('v-1')).toMatchObject({ key: KEY, arm: 'A', cents: 3500, enrolled: false });
    expect(store.exposures).toHaveLength(0);
  });

  it('⭐ DRAFT (as shipped) ⇒ everyone gets $35, nobody is enrolled', async () => {
    store.experiment = experimentRow({ status: 'draft' });
    for (let i = 0; i < 50; i++) {
      expect(await resolveBe04Price(`v-${i}`)).toMatchObject({ arm: 'A', cents: 3500, enrolled: false });
    }
    expect(store.exposures).toHaveLength(0);
  });

  it('paused ⇒ $35 for everyone', async () => {
    store.experiment = experimentRow({ status: 'paused' });
    for (let i = 0; i < 20; i++) expect((await resolveBe04Price(`v-${i}`)).cents).toBe(3500);
    expect(store.exposures).toHaveLength(0);
  });

  it('a DB read error ⇒ $35, never a throw', async () => {
    store.experiment = experimentRow();
    store.failReads = true;
    expect(await resolveBe04Price('v-1')).toMatchObject({ arm: 'A', cents: 3500, enrolled: false });
  });

  it('no visitor id ⇒ $35', async () => {
    store.experiment = experimentRow();
    for (const none of [null, undefined, '']) {
      expect(await resolveBe04Price(none)).toMatchObject({ arm: 'A', cents: 3500, enrolled: false });
    }
    expect(store.exposures).toHaveLength(0);
  });

  it('⛔ a payload outside {3500, 4500} ⇒ $35, and the visitor is NOT counted', async () => {
    for (const bad of [4700, 6700, 1, 0, '4500', null, undefined, 45]) {
      _resetExperimentCache();
      store.exposures = [];
      store.experiment = experimentRow({
        variants: [
          { key: 'A', weight: 0, payload: { priceCents: 3500 } },
          { key: 'B', weight: 100, payload: { priceCents: bad } },
        ],
      });
      expect(await resolveBe04Price('v-bad'), String(bad)).toMatchObject({ arm: 'A', cents: 3500, enrolled: false });
      expect(store.exposures, String(bad)).toHaveLength(0);
    }
  });
});

describe('resolveBe04Price — running, a sticky 50/50 split', () => {
  it('deals both arms, each at its own price', async () => {
    store.experiment = experimentRow();
    const seen: Record<string, number> = {};
    for (let i = 0; i < 200; i++) {
      const r = await resolveBe04Price(`visitor-${i}`);
      expect(r.cents).toBe(r.arm === 'B' ? 4500 : 3500);
      expect(r.enrolled).toBe(true);
      seen[r.arm] = (seen[r.arm] ?? 0) + 1;
    }
    expect(Object.keys(seen).sort()).toEqual(['A', 'B']);
    // sha256 buckets: roughly even, never one-sided.
    expect(seen.A).toBeGreaterThan(60);
    expect(seen.B).toBeGreaterThan(60);
  });

  it('is sticky: the same visitor always gets the same arm, and one exposure', async () => {
    store.experiment = experimentRow();
    const first = await resolveBe04Price('visitor-sticky');
    for (let i = 0; i < 10; i++) {
      _resetExperimentCache();
      expect(await resolveBe04Price('visitor-sticky')).toMatchObject({ arm: first.arm, cents: first.cents });
    }
    expect(store.exposures).toHaveLength(1);
    expect(store.exposures[0]).toMatchObject({
      experimentKey: KEY,
      subjectId: 'visitor-sticky',
      variant: first.arm,
      surface: 'be_04_price',
      context: { priceCents: first.cents },
    });
  });

  it('freezeAssignment: re-weighting after her exposure never moves her', async () => {
    store.experiment = experimentRow({
      variants: [
        { key: 'A', weight: 0, payload: { priceCents: 3500 } },
        { key: 'B', weight: 100, payload: { priceCents: 4500 } },
      ],
    });
    expect((await resolveBe04Price('visitor-frozen')).arm).toBe('B');
    _resetExperimentCache();
    store.experiment = experimentRow({
      variants: [
        { key: 'A', weight: 100, payload: { priceCents: 3500 } },
        { key: 'B', weight: 0, payload: { priceCents: 4500 } },
      ],
    });
    expect(await resolveBe04Price('visitor-frozen')).toMatchObject({ arm: 'B', cents: 4500 });
    expect((await resolveBe04Price('visitor-new')).arm).toBe('A');
  });

  it('buckets on the id exactly as checkout writes it (capped at 64 characters)', async () => {
    store.experiment = experimentRow();
    const long = `v-${'x'.repeat(100)}`;
    const r = await resolveBe04Price(long);
    expect(store.exposures[0].subjectId).toBe(long.slice(0, 64));
    expect((await resolveBe04Price(long.slice(0, 64))).arm).toBe(r.arm);
  });

  it('a concluded test rolls its declared winner out (applied, not enrolled) — like every framework test', async () => {
    store.experiment = experimentRow({ status: 'done', winnerVariant: 'B' });
    expect(await resolveBe04Price('v-after')).toMatchObject({ arm: 'B', cents: 4500, enrolled: false });
    expect(store.exposures).toHaveLength(0);
  });
});

describe('04 conversions — booking + each upsell, on the exposed arm, once each', () => {
  const exposed = (subject: string, variant: string) =>
    store.exposures.push({ experimentKey: KEY, subjectId: subject, variant, surface: 'be_04_price' });

  it('the booking logs amount_total under be_04_booking_purchased; a retry is a no-op', async () => {
    exposed('v-buyer', 'B');
    await logBeBookingConversion('v-buyer', 5777, BE_04_PRICE_KEY, BE_04_BOOKING_EVENT);
    await logBeBookingConversion('v-buyer', 5777, BE_04_PRICE_KEY, BE_04_BOOKING_EVENT);
    expect(store.conversions).toEqual([
      { experimentKey: KEY, subjectId: 'v-buyer', variant: 'B', event: 'be_04_booking_purchased', value: 5777 },
    ]);
  });

  it('each upsell product adds its own row; a Stripe retry of either is a no-op', async () => {
    exposed('v-buyer', 'A');
    const meta = { priceExp: KEY, expSubject: 'v-buyer', priceArm: 'A' };
    await logBeBookingConversion('v-buyer', 3500, BE_04_PRICE_KEY, BE_04_BOOKING_EVENT);
    await logBe04UpsellConversion(meta, 'be_protection_ritual', 4700);
    await logBe04UpsellConversion(meta, 'be_protection_ritual', 4700);
    await logBe04UpsellConversion(meta, 'be_bracelet', 3000);
    expect(store.conversions.map((c) => [c.event, c.variant, c.value])).toEqual([
      ['be_04_booking_purchased', 'A', 3500],
      ['be_04_upsell_purchased:be_protection_ritual', 'A', 4700],
      ['be_04_upsell_purchased:be_bracelet', 'A', 3000],
    ]);
    expect(be04UpsellEvent('be_bracelet')).toBe('be_04_upsell_purchased:be_bracelet');
  });

  it('no exposure (a preview URL, or before the start) ⇒ nothing written', async () => {
    await logBeBookingConversion('v-never', 3500, BE_04_PRICE_KEY, BE_04_BOOKING_EVENT);
    await logBe04UpsellConversion({ priceExp: KEY, expSubject: 'v-never' }, 'be_bracelet', 4700);
    expect(store.conversions).toHaveLength(0);
  });

  it('an upsell from a booking not under the price test (no priceExp, another key, no subject) is a no-op', async () => {
    exposed('v-buyer', 'A');
    await logBe04UpsellConversion({ expSubject: 'v-buyer' }, 'be_bracelet', 4700);
    await logBe04UpsellConversion({ priceExp: 'be_02_booking_treatment_2026', expSubject: 'v-buyer' }, 'be_bracelet', 4700);
    await logBe04UpsellConversion({ priceExp: KEY }, 'be_bracelet', 4700);
    await logBe04UpsellConversion(null, 'be_bracelet', 4700);
    expect(store.conversions).toHaveLength(0);
  });

  it('02\'s booking conversion is unchanged: its key, its event, once per visitor', async () => {
    store.exposures.push({ experimentKey: 'be_02_booking_treatment_2026', subjectId: 'v-02', variant: 'B', surface: 'be_02_booking' });
    await logBeBookingConversion('v-02', 4777);
    await logBeBookingConversion('v-02', 4777);
    expect(store.conversions).toEqual([
      { experimentKey: 'be_02_booking_treatment_2026', subjectId: 'v-02', variant: 'B', event: 'be_02_booking_purchased', value: 4777 },
    ]);
  });

  it('a DB failure is swallowed — a measurement miss never fails a paid order', async () => {
    exposed('v-buyer', 'A');
    store.failReads = true;
    await expect(logBeBookingConversion('v-buyer', 3500, BE_04_PRICE_KEY, BE_04_BOOKING_EVENT)).resolves.toBeUndefined();
    await expect(logBe04UpsellConversion({ priceExp: KEY, expSubject: 'v-buyer' }, 'be_bracelet', 4700)).resolves.toBeUndefined();
  });
});
