// Pure-logic unit tests for the V1 price-variant pool: parsing/validation and
// funnel + sign scoping. No DB, no network.
//
//   npm run test:price
//
// The load-bearing property under test is the one the business asked for on the
// 2026-07-14 call: the $55/$35 sliding close runs on the fb-palm THUMB ads and
// NOWHERE ELSE. Every other palm sign (hand-size, finger-shape, decode-him …)
// must stay 100% on the $35 control until Ruby confirms that lander converts.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DEFAULT_PALM_SIGN,
  normalizeSign,
  parseVariantPool,
  pickWeighted,
  scopeVariantsToFunnel,
  scopeVariantsToSign,
  DEFAULT_UPSELL1_CENTS,
  selectVariant,
  type PriceVariant,
} from './priceVariantPool';

// These tests run against the REAL shipping artifacts, not a copy of them — so they
// cannot pass while the thing we actually deploy says something different.
//   go-live-pool.json          → loaded into V1_PRICE_VARIANTS_JSON on dev/local
//   go-live-55-35-config.sql   → run against production's system_config row
// The drift test below proves the two are the same pool.
const ROOT = join(import.meta.dirname, '..', '..');
const GO_LIVE_POOL = readFileSync(join(ROOT, 'improve-v1', 'go-live-pool.json'), 'utf8');
const GO_LIVE_SQL = readFileSync(join(ROOT, 'improve-v1', 'go-live-55-35-config.sql'), 'utf8');

// Pull the JSON literal out of `SET config_value = '{…}',`
function poolFromSql(sql: string): string {
  const m = sql.match(/SET config_value = '([\s\S]*?)',\s*\n\s*updated_at/);
  assert.ok(m, 'could not find the config_value literal in the go-live SQL');
  return m![1];
}

const pool = () => parseVariantPool(GO_LIVE_POOL).variants;

// Every non-thumb sign that has a live/possible ad lander.
const OTHER_SIGNS = [
  'hand-size',
  'finger-shape',
  'finger-lock',
  'palms',
  'palm-signs',
  'thumb-curve',
  'thumb-curve-alt',
  'finger-length',
  'finger-length-alt',
];

// Draw many times so a "never assigned" claim is not a fluke of one roll.
function draws(funnel: string | null, sign: string | null, n = 4000): Record<string, number> {
  const tally: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const v = selectVariant(pool(), funnel, sign);
    tally[v.id] = (tally[v.id] ?? 0) + 1;
  }
  return tally;
}

describe('the shipping artifacts (go-live-pool.json ↔ go-live-55-35-config.sql)', () => {
  it('the SQL and the env-override JSON are the SAME pool — dev cannot test a different config than prod gets', () => {
    const fromJson = parseVariantPool(GO_LIVE_POOL).variants;
    const fromSql = parseVariantPool(poolFromSql(GO_LIVE_SQL)).variants;
    assert.deepEqual(
      fromSql,
      fromJson,
      'go-live-55-35-config.sql and go-live-pool.json have DRIFTED — dev would rehearse a pool that production never gets',
    );
  });

  it('the go-live pool is valid — nothing silently dropped, no corrupted keys', () => {
    const { variants, dropped, unknownKeys } = parseVariantPool(GO_LIVE_POOL);
    assert.equal(dropped.length, 0, `unexpected drops: ${JSON.stringify(dropped)}`);
    assert.equal(unknownKeys.length, 0, `unexpected keys: ${JSON.stringify(unknownKeys)}`);
    assert.equal(variants.length, 14);
  });

  it('the sliding arm is thumb-scoped, $55 main, $35 grace', () => {
    const sliding = pool().find((v) => v.id === '55-35_palm')!;
    assert.deepEqual(sliding.signs, ['thumb'], 'the sliding close must be scoped to thumb ONLY');
    assert.equal(sliding.funnel, 'v1-palm');
    assert.equal(sliding.weight, 1);
    assert.equal(sliding.priceCents, 5500);
    assert.equal(sliding.downsellCents, 3500); // the GRACE charge — must be $35, not the legacy $25
    assert.equal(sliding.upsell1Cents, 4700); // U1 held equal on both arms
  });

  it('root is NOT in the test, and its control is honest', () => {
    const vs = pool();
    assert.equal(vs.find((v) => v.id === '55-35')!.weight, 0, 'root must not be enrolled in the sliding test');
    assert.equal(vs.find((v) => v.id === '35')!.weight, 1, 'root control must be live');
    assert.equal(vs.find((v) => v.id === '45')!.weight, 0, 'the corrupted root 45 arm must be parked');
  });

  it('the control arm is untouched at $35/$25/$47', () => {
    const control = pool().find((v) => v.id === '35_palm_u47')!;
    assert.equal(control.weight, 1);
    assert.equal(control.priceCents, 3500);
    assert.equal(control.downsellCents, 2500);
    assert.equal(control.upsell1Cents, 4700);
    assert.ok(!control.signs?.length, 'the control must be unscoped so it serves EVERY sign');
  });
});

// The config row EXACTLY as it is live in production right now (read 2026-07-14).
// Note `45` is weight 1 WITH the corrupted "down  sellCents" key, and there is no
// 55-35 anywhere. This is what the newly-deployed code will meet BEFORE the go-live
// SQL is run — the deploy→SQL window.
const LIVE_PROD_POOL_TODAY = JSON.stringify({
  variants: [
    { id: '35', weight: 0, priceCents: 3500, downsellCents: 2500 },
    { id: '45', weight: 1, priceCents: 4500, 'down  sellCents': 3200 },
    { id: '59', weight: 0, priceCents: 5900, downsellCents: 4200 },
    { id: '45_fb', funnel: 'v1-fb', weight: 1, priceCents: 4500, upsell1Cents: 4700, downsellCents: 3200 },
    { id: '35_fb', funnel: 'v1-fb', weight: 1, priceCents: 3500, upsell1Cents: 3700, downsellCents: 2500 },
    { id: '35_fb2', funnel: 'v1-fb2', weight: 1, priceCents: 3500, downsellCents: 2500, upsell1Cents: 3700 },
    { id: '45_fb2', funnel: 'v1-fb2', weight: 1, priceCents: 4500, downsellCents: 3200, 'upsell1Ce  nts': 4700 },
    { id: '35_gdn', funnel: 'v1-gdn', weight: 1, priceCents: 3500, downsellCents: 2500, upsell1Cents: 3700 },
    { id: '45_gdn', funnel: 'v1-gdn', weight: 1, priceCents: 4500, downsellCents: 3200, upsell1Cents: 4700 },
    { id: '35_palm', funnel: 'v1-palm', weight: 0, priceCents: 3500, downsellCents: 2500, upsell1Cents: 3700 },
    { id: '35_palm_u47', funnel: 'v1-palm', weight: 1, priceCents: 3500, downsellCents: 2500, upsell1Cents: 4700 },
    { id: '45_palm', funnel: 'v1-palm', weight: 0, priceCents: 4500, downsellCents: 3200, upsell1Cents: 4700 },
  ],
});

describe('DEPLOY→SQL WINDOW — shipping the code alone must not disturb live traffic', () => {
  const live = () => parseVariantPool(LIVE_PROD_POOL_TODAY).variants;

  it('fb-palm is COMPLETELY unchanged — every sign still gets the $35/$25 control', () => {
    for (const sign of ['thumb', 'hand-size', 'finger-shape', 'palms', 'finger-lock', null]) {
      for (let i = 0; i < 200; i++) {
        const v = selectVariant(live(), 'v1-palm', sign);
        assert.equal(v.id, '35_palm_u47', `palm sign=${sign} drew ${v.id}`);
        assert.equal(v.priceCents, 3500);
        assert.equal(v.downsellCents, 2500);
        assert.equal(v.upsell1Cents, 4700);
      }
    }
  });

  it('there is no way to reach a $55 price before the SQL runs — the code is DARK', () => {
    for (const funnel of [null, 'v1-fb', 'v1-fb2', 'v1-gdn', 'v1-palm']) {
      for (const sign of ['thumb', 'hand-size', null]) {
        for (let i = 0; i < 100; i++) {
          const v = selectVariant(live(), funnel, sign);
          assert.notEqual(v.priceCents, 5500, `${funnel}/${sign} reached $55 with no 55-35 configured`);
          assert.ok(!v.id.startsWith('55-35'), `${funnel}/${sign} drew ${v.id}`);
        }
      }
    }
  });

  it('fb / fb2 / gdn keep their exact 50/50s and prices', () => {
    for (const [funnel, ids] of [
      ['v1-fb', ['35_fb', '45_fb']],
      ['v1-fb2', ['35_fb2', '45_fb2']],
      ['v1-gdn', ['35_gdn', '45_gdn']],
    ] as const) {
      const seen = new Set<string>();
      for (let i = 0; i < 400; i++) seen.add(selectVariant(live(), funnel, null).id);
      assert.deepEqual([...seen].sort(), [...ids].sort(), `${funnel} pool changed`);
    }
  });

  it('45_fb2 survives its corrupted upsell1 key and still charges the same $47 U1 (fallback = intended value)', () => {
    const v = live().find((x) => x.id === '45_fb2')!;
    assert.equal(v.priceCents, 4500);
    assert.equal(v.downsellCents, 3200);
    assert.equal(v.upsell1Cents, undefined); // key was mistyped → falls back…
    assert.equal(v.upsell1Cents ?? DEFAULT_UPSELL1_CENTS, 4700); // …to exactly what it meant to be
  });

  it('ROOT: the corrupted 45 is now DROPPED — same $35/$25 price as today, but honestly labelled', () => {
    // Today: `45` (w1) is picked, its NULL downsell makes getVariantForEmail fall back,
    // so root visitors are ALREADY served $35/$25 while the row says '45'.
    // After the deploy: `45` is dropped, root draws '35' → the SAME $35/$25, correct label.
    for (let i = 0; i < 200; i++) {
      const v = selectVariant(live(), null, null);
      assert.equal(v.id, '35');
      assert.equal(v.priceCents, 3500);
      assert.equal(v.downsellCents, 2500);
    }
    // The drop is LOUD, not silent — that was the whole bug.
    const { dropped } = parseVariantPool(LIVE_PROD_POOL_TODAY);
    assert.deepEqual(dropped.map((d) => d.id), ['45']);
  });
});

describe('parseVariantPool — validation', () => {

  it('DROPS a variant whose downsellCents key is corrupted — the bug that silently killed the $45 test', () => {
    // This is the live row today: `"down  sellCents"` (§3.3 of the pre-flight).
    // Old validator passed it → NULL downsell → users pitched $35 while labelled 45.
    const raw = JSON.stringify({
      variants: [
        { id: '35', weight: 1, priceCents: 3500, downsellCents: 2500 },
        { id: '45', weight: 1, priceCents: 4500, 'down  sellCents': 3200 },
      ],
    });
    const { variants, dropped, unknownKeys } = parseVariantPool(raw);

    assert.deepEqual(variants.map((v) => v.id), ['35'], '45 must not be servable');
    assert.equal(dropped.length, 1);
    assert.equal(dropped[0].id, '45');
    assert.match(dropped[0].reason, /downsellCents/);
    // …and the typo itself is reported, so the cause is obvious in the logs.
    assert.deepEqual(unknownKeys, [{ id: '45', key: 'down  sellCents' }]);
  });

  it('would DROP a sliding variant with a corrupted grace price rather than charge the wrong amount', () => {
    // The same typo class on 55-35_palm would break the $35 GRACE charge. Loud, not silent.
    const raw = JSON.stringify({
      variants: [
        { id: '35_palm_u47', funnel: 'v1-palm', weight: 1, priceCents: 3500, downsellCents: 2500 },
        { id: '55-35_palm', funnel: 'v1-palm', weight: 1, priceCents: 5500, 'downsell Cents': 3500, signs: ['thumb'] },
      ],
    });
    const { variants, dropped } = parseVariantPool(raw);
    assert.deepEqual(variants.map((v) => v.id), ['35_palm_u47']);
    assert.equal(dropped[0].id, '55-35_palm');
  });

  it('flags an unknown key without dropping when the value is optional (upsell1Ce  nts)', () => {
    const raw = JSON.stringify({
      variants: [{ id: '45_fb2', funnel: 'v1-fb2', weight: 1, priceCents: 4500, downsellCents: 3200, 'upsell1Ce  nts': 4700 }],
    });
    const { variants, dropped, unknownKeys } = parseVariantPool(raw);
    assert.equal(dropped.length, 0);
    assert.equal(variants.length, 1);
    assert.deepEqual(unknownKeys, [{ id: '45_fb2', key: 'upsell1Ce  nts' }]);
  });

  it('rejects a malformed signs array rather than serving it to everyone', () => {
    const raw = JSON.stringify({
      variants: [
        { id: 'ok', weight: 1, priceCents: 3500, downsellCents: 2500 },
        { id: 'bad', weight: 1, priceCents: 5500, downsellCents: 3500, signs: 'thumb' },
      ],
    });
    const { variants, dropped } = parseVariantPool(raw);
    assert.deepEqual(variants.map((v) => v.id), ['ok']);
    assert.match(dropped[0].reason, /signs/);
  });
});

describe('normalizeSign', () => {
  it('treats palm traffic with no sign as thumb (a bare /fb-palm visit IS the thumb lander)', () => {
    assert.equal(normalizeSign('v1-palm', undefined), 'thumb');
    assert.equal(normalizeSign('v1-palm', null), 'thumb');
    assert.equal(normalizeSign('v1-palm', ''), 'thumb');
    assert.equal(DEFAULT_PALM_SIGN, 'thumb');
  });

  it('lower-cases and trims, and leaves non-palm funnels sign-less', () => {
    assert.equal(normalizeSign('v1-palm', '  Hand-Size '), 'hand-size');
    assert.equal(normalizeSign('v1-fb', undefined), null);
    assert.equal(normalizeSign(null, undefined), null);
  });
});

describe('scopeVariantsToSign', () => {
  const vs: PriceVariant[] = [
    { id: 'control', weight: 1, priceCents: 3500, downsellCents: 2500 },
    { id: 'thumb-only', weight: 1, priceCents: 5500, downsellCents: 3500, signs: ['thumb'] },
  ];

  it('is a FILTER, not a partition — the unscoped control always survives', () => {
    assert.deepEqual(scopeVariantsToSign(vs, 'thumb').map((v) => v.id), ['control', 'thumb-only']);
    assert.deepEqual(scopeVariantsToSign(vs, 'hand-size').map((v) => v.id), ['control']);
  });

  it('never returns an empty pool', () => {
    const onlyScoped: PriceVariant[] = [{ id: 'x', weight: 1, priceCents: 1, downsellCents: 1, signs: ['thumb'] }];
    assert.equal(scopeVariantsToSign(onlyScoped, 'hand-size').length, 1);
  });
});

describe('the sliding close is THUMB-ONLY (the business requirement)', () => {
  it('thumb gets a clean 50/50 between the control and the sliding close', () => {
    const t = draws('v1-palm', 'thumb');
    assert.deepEqual(Object.keys(t).sort(), ['35_palm_u47', '55-35_palm']);
    const share = t['55-35_palm'] / 4000;
    assert.ok(share > 0.45 && share < 0.55, `expected ~50% sliding, got ${(share * 100).toFixed(1)}%`);
  });

  it('palm traffic with NO sign param is thumb → also in the 50/50 (the thumb ad URLs omit &sign=)', () => {
    const t = draws('v1-palm', null);
    assert.deepEqual(Object.keys(t).sort(), ['35_palm_u47', '55-35_palm']);
  });

  for (const sign of OTHER_SIGNS) {
    it(`sign="${sign}" NEVER sees the sliding close — 100% control`, () => {
      const t = draws('v1-palm', sign);
      assert.equal(t['55-35_palm'], undefined, `${sign} was assigned the sliding close`);
      assert.equal(t['35_palm_u47'], 4000);
    });
  }

  it('an unknown / spoofed sign falls through to the control, never to the $55 arm', () => {
    for (const sign of ['', 'THUMBS', 'thumb2', '../thumb', 'nonsense']) {
      const t = draws('v1-palm', sign, 500);
      if (sign === '') continue; // '' normalizes to thumb — covered above
      assert.equal(t['55-35_palm'], undefined, `spoofed sign "${sign}" reached the $55 arm`);
    }
  });

  it('is case/whitespace insensitive on the real thumb value', () => {
    const t = draws('v1-palm', ' Thumb ');
    assert.ok(t['55-35_palm'] > 0, 'a whitespace/case variant of thumb was excluded from its own test');
  });
});

describe('no collateral damage to other funnels', () => {
  it('root stays on the $35 control — root is NOT in the sliding test', () => {
    const t = draws(null, null);
    assert.deepEqual(Object.keys(t), ['35']);
  });

  it('fb / fb2 / gdn keep their existing 50/50s, untouched by sign scoping', () => {
    assert.deepEqual(Object.keys(draws('v1-fb', null)).sort(), ['35_fb', '45_fb']);
    assert.deepEqual(Object.keys(draws('v1-fb2', null)).sort(), ['35_fb2', '45_fb2']);
    assert.deepEqual(Object.keys(draws('v1-gdn', null)).sort(), ['35_gdn', '45_gdn']);
  });

  it('a sign value on a non-palm funnel changes nothing (no non-palm variant declares signs)', () => {
    assert.deepEqual(Object.keys(draws('v1-fb', 'thumb')).sort(), ['35_fb', '45_fb']);
  });

  it('funnel scoping is still a hard partition — palm never draws a root/fb variant', () => {
    const palmIds = new Set([...Object.keys(draws('v1-palm', 'thumb')), ...Object.keys(draws('v1-palm', 'hand-size'))]);
    for (const id of palmIds) assert.ok(id.endsWith('_palm') || id.endsWith('_palm_u47'), `palm drew ${id}`);
  });
});

describe('extending the test to a new sign is a CONFIG change, not a code change', () => {
  it('appending "hand-size" to signs immediately puts hand-size into the 50/50', () => {
    // This is exactly what we do once Ruby confirms the hand-size lander converts.
    const extended = pool().map((v) =>
      v.id === '55-35_palm' ? { ...v, signs: ['thumb', 'hand-size'] } : v,
    );
    const tally: Record<string, number> = {};
    for (let i = 0; i < 2000; i++) {
      const v = selectVariant(extended, 'v1-palm', 'hand-size');
      tally[v.id] = (tally[v.id] ?? 0) + 1;
    }
    assert.deepEqual(Object.keys(tally).sort(), ['35_palm_u47', '55-35_palm']);
    const share = tally['55-35_palm'] / 2000;
    assert.ok(share > 0.44 && share < 0.56, `expected ~50%, got ${(share * 100).toFixed(1)}%`);

    // …and finger-shape is STILL excluded until it too is added.
    const fs = selectVariant(extended, 'v1-palm', 'finger-shape');
    assert.equal(fs.id, '35_palm_u47');
  });
});

describe('rollback', () => {
  it('setting the sliding weight to 0 reverts thumb to 100% control', () => {
    const rolledBack = pool().map((v) => (v.id === '55-35_palm' ? { ...v, weight: 0 } : v));
    for (let i = 0; i < 500; i++) {
      assert.equal(selectVariant(rolledBack, 'v1-palm', 'thumb').id, '35_palm_u47');
    }
  });
});

describe('pickWeighted', () => {
  it('never returns a zero-weight variant when a positive-weight one exists', () => {
    const vs: PriceVariant[] = [
      { id: 'off', weight: 0, priceCents: 4500, downsellCents: 3200 },
      { id: 'on', weight: 1, priceCents: 3500, downsellCents: 2500 },
    ];
    for (let i = 0; i < 500; i++) assert.equal(pickWeighted(vs).id, 'on');
  });

  it('falls back to the first variant when every weight is 0 (never returns undefined)', () => {
    const vs: PriceVariant[] = [
      { id: 'a', weight: 0, priceCents: 3500, downsellCents: 2500 },
      { id: 'b', weight: 0, priceCents: 4500, downsellCents: 3200 },
    ];
    assert.equal(pickWeighted(vs).id, 'a');
  });
});

describe('scopeVariantsToFunnel (unchanged behaviour — regression guard)', () => {
  it('falls back to the full pool when no variant matches the funnel', () => {
    const vs: PriceVariant[] = [{ id: '35', weight: 1, priceCents: 3500, downsellCents: 2500 }];
    assert.deepEqual(scopeVariantsToFunnel(vs, 'v1-unknown').map((v) => v.id), ['35']);
  });
});
