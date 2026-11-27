// The Upsell 2 tally (conversion type `upsell2_funnel`, the /fb Upsell 2 copy test first):
// the pure half, assembleUpsell2Funnel, on fixture rows shaped like tallyUpsell2's SQL output.
// The SQL itself needs a database and is not run here.
//
//   npx vitest run server/lib/upsell2Funnel.test.ts

import { describe, expect, it } from 'vitest';
import { assembleUpsell2Funnel } from './experiments';

// pg hands counts back as strings; mix both on purpose.
const RAW = [
  { variant: 'A', path: 'A', exposures: '10', buyers: '3', full_buyers: '2', downsell_buyers: '1', revenue_cents: '12400' },
  { variant: 'A', path: 'B', exposures: 20, buyers: 2, full_buyers: 1, downsell_buyers: 1, revenue_cents: 7700 },
  { variant: 'B', path: 'A', exposures: '12', buyers: '5', full_buyers: '5', downsell_buyers: '0', revenue_cents: '23500' },
  { variant: 'B', path: 'B', exposures: 18, buyers: 3, full_buyers: 1, downsell_buyers: 2, revenue_cents: 10700 },
];

describe('assembleUpsell2Funnel', () => {
  const r = assembleUpsell2Funnel(RAW, 'A', 'B');

  it('pools both paths into the standard per-arm rows', () => {
    const a = r.rows.find((x) => x.variant === 'A')!;
    const b = r.rows.find((x) => x.variant === 'B')!;
    expect([a.viewers, a.buyers, a.revenueUsd]).toEqual([30, 5, 201]);
    expect([b.viewers, b.buyers, b.revenueUsd]).toEqual([30, 8, 342]);
    expect(a.revPerViewerUsd).toBeCloseTo(6.7, 2);
    expect(b.revPerViewerUsd).toBeCloseTo(11.4, 2);
    expect(r.rows.map((x) => x.variant)).toEqual(['A', 'B']);
  });

  it('runs SRM and significance on the pooled exposures', () => {
    expect(r.srm).toMatchObject({ aViewers: 30, bViewers: 30 });
    expect(r.significance).toBeDefined();
  });

  it('splits every arm into all / path A / path B, with $47 vs $30 buyers', () => {
    expect(r.upsell2Detail.map((d) => `${d.variant}:${d.path}`)).toEqual(['A:all', 'A:A', 'A:B', 'B:all', 'B:A', 'B:B']);
    const get = (v: string, p: string) => r.upsell2Detail.find((d) => d.variant === v && d.path === p)!;
    expect(get('A', 'all')).toEqual({
      variant: 'A', path: 'all', exposures: 30, buyers: 5, fullBuyers: 3, downsellBuyers: 2,
      revenueUsd: 201, revPerExposureUsd: 6.7, conversionPct: 16.67,
    });
    expect(get('A', 'A')).toEqual({
      variant: 'A', path: 'A', exposures: 10, buyers: 3, fullBuyers: 2, downsellBuyers: 1,
      revenueUsd: 124, revPerExposureUsd: 12.4, conversionPct: 30,
    });
    expect(get('B', 'B')).toEqual({
      variant: 'B', path: 'B', exposures: 18, buyers: 3, fullBuyers: 1, downsellBuyers: 2,
      revenueUsd: 107, revPerExposureUsd: 5.94, conversionPct: 16.67,
    });
    // Full + downsell always adds up to buyers.
    for (const d of r.upsell2Detail) expect(d.fullBuyers + d.downsellBuyers).toBe(d.buyers);
  });

  it('an arm with no exposures yet still gets its three zero rows', () => {
    const only = assembleUpsell2Funnel(RAW.filter((x) => x.variant === 'A'), 'A', 'B');
    const b = only.upsell2Detail.filter((d) => d.variant === 'B');
    expect(b.map((d) => d.path)).toEqual(['all', 'A', 'B']);
    for (const d of b) {
      expect([d.exposures, d.buyers, d.revenueUsd, d.revPerExposureUsd, d.conversionPct]).toEqual([0, 0, 0, 0, 0]);
    }
  });

  it('no rows at all: both arms at zero, no significance', () => {
    const empty = assembleUpsell2Funnel([], 'A', 'B');
    expect(empty.rows.map((x) => [x.variant, x.viewers])).toEqual([['A', 0], ['B', 0]]);
    expect(empty.upsell2Detail).toHaveLength(6);
    expect(empty.significance).toBeUndefined();
  });
});
