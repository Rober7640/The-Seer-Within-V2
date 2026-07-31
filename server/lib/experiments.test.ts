// Pure-logic unit tests for the experiment framework assignment primitives.
// No DB — proves the audit-checklist properties "deterministic + sticky over
// 1000 calls" and the weight-walk / control-fallback behaviour in isolation.
//   npx tsx --test server/lib/experiments.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

import { experimentBucket, pickVariant, twoSidedP, shouldForceRunning, matchesFunnelScope, PAYWALL_EXPERIMENT_KEY } from './experiments';
import type { ExperimentVariant } from '../../shared/schema';

const ref = (id: string, key: string) =>
  parseInt(crypto.createHash('sha256').update(id + key).digest('hex').slice(0, 8), 16) % 100;

describe('experimentBucket', () => {
  it('is deterministic + sticky over 1000 ids (same id → same bucket, range 0..99)', () => {
    let below = 0;
    let above = 0;
    for (let i = 0; i < 1000; i++) {
      const id = `user-${i}`;
      const a = experimentBucket(id, PAYWALL_EXPERIMENT_KEY);
      const b = experimentBucket(id, PAYWALL_EXPERIMENT_KEY);
      assert.equal(a, b, 'bucket must be stable across calls');
      assert.ok(a >= 0 && a <= 99, `bucket ${a} out of range`);
      if (a < 50) below++;
      else above++;
    }
    // Not degenerate — both halves are populated for a 50/50 split.
    assert.ok(below > 350 && above > 350, `lopsided split: below=${below} above=${above}`);
  });

  it('matches the original paywallBucket formula byte-for-byte (no cohort shift)', () => {
    for (const id of ['abc', 'a-very-long-uuid-1234', '🧿', 'Évelyn']) {
      assert.equal(experimentBucket(id, PAYWALL_EXPERIMENT_KEY), ref(id, PAYWALL_EXPERIMENT_KEY));
    }
  });

  it('is namespaced by experiment key (same id, different key → independent bucket)', () => {
    // Different keys should generally not produce identical buckets for all ids.
    let differ = 0;
    for (let i = 0; i < 200; i++) {
      const id = `u${i}`;
      if (experimentBucket(id, 'exp_one') !== experimentBucket(id, 'exp_two')) differ++;
    }
    assert.ok(differ > 150, `keys not independent enough: ${differ}/200 differed`);
  });
});

describe('pickVariant', () => {
  const AB: ExperimentVariant[] = [
    { key: 'A', weight: 50 },
    { key: 'B', weight: 50 },
  ];

  it('walks weights in listed order with A (control) first', () => {
    assert.equal(pickVariant(0, AB), 'A');
    assert.equal(pickVariant(49, AB), 'A');
    assert.equal(pickVariant(50, AB), 'B');
    assert.equal(pickVariant(99, AB), 'B');
  });

  it('honours uneven weights (70/30)', () => {
    const v: ExperimentVariant[] = [
      { key: 'A', weight: 70 },
      { key: 'B', weight: 30 },
    ];
    assert.equal(pickVariant(69, v), 'A');
    assert.equal(pickVariant(70, v), 'B');
  });

  it('supports >2 arms and covers every arm across 0..99', () => {
    const three: ExperimentVariant[] = [
      { key: 'A', weight: 1 },
      { key: 'B', weight: 1 },
      { key: 'C', weight: 1 },
    ];
    const seen = new Set<string>();
    for (let b = 0; b < 100; b++) {
      const k = pickVariant(b, three);
      assert.ok(['A', 'B', 'C'].includes(k));
      seen.add(k);
    }
    assert.deepEqual([...seen].sort(), ['A', 'B', 'C']);
  });

  it('falls back to control when there are no positive weights or no variants', () => {
    assert.equal(pickVariant(42, []), 'A');
    assert.equal(pickVariant(42, [{ key: 'A', weight: 0 }, { key: 'B', weight: 0 }]), 'A');
    assert.equal(pickVariant(42, [{ key: 'only', weight: 100 }]), 'only');
  });

  it('never assigns a zero-weight (paused) arm', () => {
    const v: ExperimentVariant[] = [
      { key: 'A', weight: 100 },
      { key: 'B', weight: 0 },
    ];
    for (let b = 0; b < 100; b++) assert.equal(pickVariant(b, v), 'A');
  });
});

describe('shouldForceRunning (dev/QA force-running gate)', () => {
  const KEY = PAYWALL_EXPERIMENT_KEY;

  it('is INERT by default — unset/empty env never forces anything', () => {
    assert.equal(shouldForceRunning(KEY, 'draft', undefined), false);
    assert.equal(shouldForceRunning(KEY, 'draft', ''), false);
    assert.equal(shouldForceRunning(KEY, 'draft', '   '), false);
  });

  it('forces ONLY a listed key, and ONLY when status is draft', () => {
    assert.equal(shouldForceRunning(KEY, 'draft', KEY), true);
    // Listed among several keys (whitespace tolerated).
    assert.equal(shouldForceRunning(KEY, 'draft', ` other , ${KEY} `), true);
    // Unlisted key → never forced.
    assert.equal(shouldForceRunning('some_other_key', 'draft', KEY), false);
  });

  it('only upgrades draft → running (never touches paused/done/running)', () => {
    for (const status of ['paused', 'done', 'running']) {
      assert.equal(shouldForceRunning(KEY, status, KEY), false, `status=${status} must not be forced`);
    }
  });
});

describe('matchesFunnelScope (funnel enrolment filter)', () => {
  // Every V1 funnel, so "does this leak?" is asked against the real roster rather
  // than a token other-funnel. Mirrors shared/funnelConfig.ts.
  const V1_FUNNELS = ['v1-fb', 'v1-fb2', 'v1-gdn', 'v1-palm', 'v1-tarot'];

  it('no scope → enrols every funnel (a global test is unfiltered)', () => {
    for (const f of [...V1_FUNNELS, null, undefined]) {
      assert.equal(matchesFunnelScope(null, f), true);
      assert.equal(matchesFunnelScope(undefined, f), true);
    }
  });

  it('a STRING scope still enrols exactly that one funnel (unchanged behaviour)', () => {
    assert.equal(matchesFunnelScope('v1-palm', 'v1-palm'), true);
    for (const f of V1_FUNNELS.filter((f) => f !== 'v1-palm')) {
      assert.equal(matchesFunnelScope('v1-palm', f), false, `${f} must not enrol`);
    }
    // A funnel-scoped test never enrols traffic that carries no funnel at all
    // (the base Evelyn funnel `/` passes null).
    assert.equal(matchesFunnelScope('v1-palm', null), false);
    assert.equal(matchesFunnelScope('v1-palm', undefined), false);
  });

  it('an ARRAY scope enrols every listed funnel and NOTHING else', () => {
    // The live shape after the commitment gate was extended to /fb-tarot.
    const scope = ['v1-palm', 'v1-tarot'];
    assert.equal(matchesFunnelScope(scope, 'v1-palm'), true);
    assert.equal(matchesFunnelScope(scope, 'v1-tarot'), true);
    for (const f of ['v1-fb', 'v1-fb2', 'v1-gdn']) {
      assert.equal(matchesFunnelScope(scope, f), false, `${f} must not leak into the gate test`);
    }
    assert.equal(matchesFunnelScope(scope, null), false);
    assert.equal(matchesFunnelScope(scope, undefined), false);
  });

  it('a single-entry array behaves exactly like the bare string', () => {
    for (const f of [...V1_FUNNELS, null, undefined]) {
      assert.equal(
        matchesFunnelScope(['v1-palm'], f),
        matchesFunnelScope('v1-palm', f),
        `['v1-palm'] and 'v1-palm' must agree for funnel=${f}`,
      );
    }
  });

  it('an empty / all-junk array is treated as NO filter, never as "no traffic"', () => {
    // [] is truthy, so the old `if (scope.funnel && ...)` check would have skipped the
    // filter anyway; this pins that a config mistake can never silently scope a running
    // test to zero traffic. /start rejects it outright — see admin/experiments.ts.
    for (const bad of [[], ['', '  '.trim()], [null, undefined, 42] as unknown as string[]]) {
      assert.equal(matchesFunnelScope(bad, 'v1-palm'), true);
      assert.equal(matchesFunnelScope(bad, 'v1-tarot'), true);
    }
  });

  it('ignores junk entries but still honours the real ones alongside them', () => {
    const scope = [null, 'v1-tarot', 42, ''] as unknown as string[];
    assert.equal(matchesFunnelScope(scope, 'v1-tarot'), true);
    assert.equal(matchesFunnelScope(scope, 'v1-palm'), false);
  });
});

describe('twoSidedP', () => {
  it('z=0 → p≈1, |z|=1.96 → p≈0.05, and is symmetric', () => {
    assert.ok(twoSidedP(0) > 0.99);
    const p = twoSidedP(1.959963985);
    assert.ok(p > 0.04 && p < 0.06, `p=${p}`);
    assert.ok(Math.abs(twoSidedP(2.3) - twoSidedP(-2.3)) < 1e-9);
  });
});
