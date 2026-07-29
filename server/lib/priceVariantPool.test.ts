// Pure-logic unit tests for the V1 price-variant pool: parsing/validation and
// funnel + sign scoping. No DB, no network.
//
//   npm run test:price
//
// The load-bearing property under test: after the $55/$35 sliding close is
// retired (parked at weight 0, never deleted), the fb-palm pool has exactly ONE
// drawing arm — the $35/$25 control (35_palm_u47) — on EVERY sign, so no palm
// visitor can be shown $55 again. This supersedes the 2026-07-14 thumb-only
// sliding-close rule.
//
// ⚠ THE COMMITMENT GATE IS NOT IN THIS FILE, AND THAT IS DELIBERATE. It was
// originally built as a `35_palm_gate` pool arm; it is now the
// `v1_palm_commitment_gate_2026` EXPERIMENT (server/lib/experiments.ts). A pool
// arm can only ever be drawn for an email with no stored variant, so every
// returning visitor would have kept the control id — and on live fb-palm those
// are 23% of sessions but 57% of main buys (14.5% vs 3.3% CR). The gate would
// have been measured against a control inflated with all of them. Bucketing on
// the email hash under an experiment key re-splits the whole population instead.
// Gate coverage lives in tests/fb-palm-commitment-gate.spec.ts.

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

// These tests run against the REAL shipping artifact, not a copy of it — so they
// cannot pass while the thing we actually deploy says something different.
//   go-live-pool.json → loaded into V1_PRICE_VARIANTS_JSON on dev/local
//
// There is no longer a paired go-live SQL file to drift-check against: the flip is
// applied by scripts/retire-sliding-close.mjs, which makes a TARGETED jsonb edit to
// the one weight it changes rather than retyping the whole row. That is what removes
// the drift risk this pair of files used to be checked for (a hand-retyped blob is
// how `"down  sellCents"` once got in and silently killed the root $45 test).
const ROOT = join(import.meta.dirname, '..', '..');
const GO_LIVE_POOL = readFileSync(join(ROOT, 'improve-v1', 'go-live-pool.json'), 'utf8');

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
  // thumb-angle. NOTE: the spec this work started from claimed thumb-angle was
  // mid-way through its own concurrent $55/$35 test via the experiment framework
  // (v1_main_price_2026) and that the overlap was accepted. Checked against the
  // live experiments table on 2026-07-28: that experiment is status='draft' with
  // started_at NULL — it has never run. There is no overlap.
  'thumb-angle',
  // heart-line — photographed creative for the same tell as palm-signs.
  'heart-line',
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

describe('the shipping artifact (go-live-pool.json)', () => {
  it('the go-live pool is valid — nothing silently dropped, no corrupted keys', () => {
    const { variants, dropped, unknownKeys } = parseVariantPool(GO_LIVE_POOL);
    assert.equal(dropped.length, 0, `unexpected drops: ${JSON.stringify(dropped)}`);
    assert.equal(unknownKeys.length, 0, `unexpected keys: ${JSON.stringify(unknownKeys)}`);
    assert.equal(variants.length, 14);
  });

  it('carries NO commitment-gate arm — the gate is an experiment, not a price variant', () => {
    assert.equal(
      pool().find((v) => v.id === '35_palm_gate'),
      undefined,
      'a 35_palm_gate pool arm would be a SECOND source of truth for who sees the gate, ' +
        'and could never be drawn for a returning visitor — see the header note',
    );
  });

  it('the sliding close (55-35_palm) is PARKED at weight 0 — retired by the commitment-gate test, not deleted', () => {
    const sliding = pool().find((v) => v.id === '55-35_palm')!;
    assert.deepEqual(sliding.signs, ['thumb'], 'its historical thumb-only scoping stays on the row for the record');
    assert.equal(sliding.funnel, 'v1-palm');
    assert.equal(sliding.weight, 0, '55-35_palm must never be drawn again — parked, not deleted (matches how 45/59/55-35 are handled at the root)');
    assert.equal(sliding.priceCents, 5500);
    assert.equal(sliding.downsellCents, 3500);
  });

  it('root is NOT in the test, and its control is honest', () => {
    const vs = pool();
    assert.equal(vs.find((v) => v.id === '55-35')!.weight, 0, 'root must not be enrolled in the sliding test');
    assert.equal(vs.find((v) => v.id === '35')!.weight, 1, 'root control must be live');
    assert.equal(vs.find((v) => v.id === '45')!.weight, 0, 'the corrupted root 45 arm must be parked');
  });

  it('the control arm keeps its $35/$25/$47 economics and its weight — retiring the sliding close does not re-price anyone', () => {
    const control = pool().find((v) => v.id === '35_palm_u47')!;
    assert.equal(control.weight, 9, 'the control weight is deliberately UNCHANGED by the flip — only the sliding weight moves');
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

describe('retiring the sliding close leaves ONE price on every fb-palm sign', () => {
  it('thumb draws only the $35 control — the sign the $55 close used to run on', () => {
    const t = draws('v1-palm', 'thumb');
    assert.deepEqual(Object.keys(t), ['35_palm_u47']);
  });

  it('palm traffic with NO sign param is thumb → also 100% control (the thumb ad URLs omit &sign=)', () => {
    const t = draws('v1-palm', null);
    assert.deepEqual(Object.keys(t), ['35_palm_u47']);
  });

  for (const sign of OTHER_SIGNS) {
    it(`sign="${sign}" draws only the $35 control`, () => {
      const t = draws('v1-palm', sign);
      assert.deepEqual(Object.keys(t), ['35_palm_u47']);
    });
  }

  it('the retired 55-35_palm is never drawn on any sign, including thumb', () => {
    for (const sign of ['thumb', ...OTHER_SIGNS, null]) {
      const t = draws('v1-palm', sign, 500);
      assert.equal(t['55-35_palm'], undefined, `${sign ?? '(none)'} drew the retired sliding close`);
    }
  });

  it('NOBODY on fb-palm can be shown $55 or $45 any more', () => {
    for (const sign of ['thumb', ...OTHER_SIGNS, null]) {
      for (let i = 0; i < 200; i++) {
        const v = selectVariant(pool(), 'v1-palm', sign);
        assert.equal(v.priceCents, 3500, `${sign ?? '(none)'} drew ${v.id} at $${v.priceCents / 100}`);
        assert.equal(v.downsellCents, 2500);
      }
    }
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
    for (const id of palmIds) {
      assert.ok(id.endsWith('_palm') || id.endsWith('_palm_u47'), `palm drew ${id}`);
    }
  });
});

describe('extending a sign-scoped variant is a CONFIG change, not a code change', () => {
  it('appending "hand-size" to signs immediately puts hand-size into that variant\'s split', () => {
    // Illustrates the general mechanism using the (now-parked) 55-35_palm as the
    // example subject, restoring a positive weight locally so the mechanism is
    // demonstrated independent of its real weight:0 parked state in the live pool.
    const extended = pool().map((v) =>
      v.id === '55-35_palm' ? { ...v, weight: 1, signs: ['thumb', 'hand-size'] } : v,
    );
    const tally: Record<string, number> = {};
    for (let i = 0; i < 2000; i++) {
      const v = selectVariant(extended, 'v1-palm', 'hand-size');
      tally[v.id] = (tally[v.id] ?? 0) + 1;
    }
    // hand-size now draws from TWO live arms: the control, and the re-enabled
    // sliding close (freshly scoped to hand-size for this test).
    assert.deepEqual(Object.keys(tally).sort(), ['35_palm_u47', '55-35_palm']);

    // …and finger-shape is STILL excluded from it (control only).
    const fsTally: Record<string, number> = {};
    for (let i = 0; i < 500; i++) {
      const v = selectVariant(extended, 'v1-palm', 'finger-shape');
      fsTally[v.id] = (fsTally[v.id] ?? 0) + 1;
    }
    assert.deepEqual(Object.keys(fsTally), ['35_palm_u47']);
  });
});

describe('rollback', () => {
  it('restoring the sliding close weight brings it back on thumb ONLY — the retirement is reversible', () => {
    const restored = pool().map((v) => (v.id === '55-35_palm' ? { ...v, weight: 1 } : v));

    const thumb = new Set<string>();
    for (let i = 0; i < 2000; i++) thumb.add(selectVariant(restored, 'v1-palm', 'thumb').id);
    assert.deepEqual([...thumb].sort(), ['35_palm_u47', '55-35_palm']);

    // Every other sign stays on the control — the restored arm keeps its thumb scoping.
    for (const sign of OTHER_SIGNS) {
      for (let i = 0; i < 100; i++) {
        assert.equal(selectVariant(restored, 'v1-palm', sign).id, '35_palm_u47');
      }
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
