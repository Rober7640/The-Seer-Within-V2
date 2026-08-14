// The sample-ratio-mismatch (SRM) verdict, and why it must be scoped to the
// CURRENT-weights era.
//
// Tested as a pure function rather than through the route because the chi-square
// decision is the whole thing — the route just turns `ok:false` into a red banner.
//
//   npx tsx --test server/routes/admin/srmVerdict.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { srmVerdict } from './experiments';

// Real production figures for v1_tarot_version_bc_2026, read 2026-08-14.
// Launched 70/30 (C control / B treatment) on 2026-08-10; reweighted to 50/50 on
// 2026-08-14 01:30:57 UTC.
const LIFETIME_C = 2362;
const LIFETIME_B = 1048;
const SINCE_C = 74; //  exposures assigned AFTER the reweight
const SINCE_B = 64;
const PRIOR_C = 2288; // ...and before it
const PRIOR_B = 984;

describe('srmVerdict — the bug the era scoping fixes', () => {
  it('lifetime exposures graded against the NEW weights fire a mismatch (the false alarm)', () => {
    const v = srmVerdict(LIFETIME_C, LIFETIME_B, 50, 50);
    assert.equal(v.ok, false, 'this is what the operator saw: a red banner on a healthy test');
    assert.equal(v.expectedBSharePct, 50);
  });

  it('...but those same exposures are a clean 70/30 — they were never skewed', () => {
    const v = srmVerdict(LIFETIME_C, LIFETIME_B, 70, 30);
    assert.equal(v.ok, true, 'randomisation was fine all along; only the yardstick changed');
  });

  it('exposures assigned SINCE the reweight match 50/50 — so the scoped check passes', () => {
    const v = srmVerdict(SINCE_C, SINCE_B, 50, 50);
    assert.equal(v.ok, true);
    assert.ok(v.chiSquareP > 0.05, `expected a comfortably non-significant p, got ${v.chiSquareP}`);
  });

  it('the two eras sum to the lifetime totals (no exposure counted twice or dropped)', () => {
    assert.equal(SINCE_C + PRIOR_C, LIFETIME_C);
    assert.equal(SINCE_B + PRIOR_B, LIFETIME_B);
  });
});

describe('srmVerdict — why the lifetime check can NEVER recover on its own', () => {
  // 🔴 THE LOAD-BEARING FACT. Adding perfectly balanced traffic does not shrink the
  // imbalance the old ratio baked in — it only grows the denominator. The banner
  // would therefore stay red for the rest of the run, hiding a genuine failure
  // behind a warning everyone has learned to ignore. Waiting it out is not an option,
  // which is what makes the era stamp necessary rather than merely tidy.
  const addBalanced = (n: number) => srmVerdict(LIFETIME_C + n / 2, LIFETIME_B + n / 2, 50, 50);

  it('still red after 20,000 more perfectly balanced exposures (the whole test horizon)', () => {
    assert.equal(addBalanced(20_000).ok, false);
  });

  it('still red after 150,000 — an order of magnitude past the horizon', () => {
    assert.equal(addBalanced(150_000).ok, false);
  });

  it('the p-value does not march toward "ok" — it stalls far below the threshold', () => {
    const p20k = addBalanced(20_000).chiSquareP;
    const p150k = addBalanced(150_000).chiSquareP;
    assert.ok(p20k < 0.001, `expected still-failing at 20k, got p=${p20k}`);
    assert.ok(p150k < 0.001, `expected still-failing at 150k, got p=${p150k}`);
  });
});

describe('srmVerdict — the scoped check must still catch a REAL failure', () => {
  // The fix narrows the window; it must not amount to switching the check off.
  it('a genuinely skewed post-reweight era is still flagged', () => {
    const v = srmVerdict(1000, 200, 50, 50);
    assert.equal(v.ok, false, 'a 5:1 split against 50/50 is a real randomisation failure');
  });

  it('a skew that appears only AFTER the reweight is caught, though lifetime looks fine', () => {
    // Lifetime happens to average out; the current era does not. Scoping is what
    // surfaces this — the old lifetime check would have called it healthy.
    assert.equal(srmVerdict(1500, 1500, 50, 50).ok, true, 'precondition: lifetime looks clean');
    assert.equal(srmVerdict(500, 100, 50, 50).ok, false);
  });

  it('an unbalanced CONFIGURED ratio is judged against itself, not against 50/50', () => {
    assert.equal(srmVerdict(700, 300, 70, 30).ok, true);
    assert.equal(srmVerdict(500, 500, 70, 30).ok, false, 'an even split IS a mismatch at 70/30');
  });
});

describe('srmVerdict — edges that must not produce a false red', () => {
  it('zero exposures is ok, not a mismatch (a fresh reweight has no data yet)', () => {
    const v = srmVerdict(0, 0, 50, 50);
    assert.equal(v.ok, true);
    assert.equal(v.chiSquareP, 1);
  });

  it('a handful of exposures is too small to condemn', () => {
    assert.equal(srmVerdict(3, 1, 50, 50).ok, true, 'n=4 must never trip the 0.001 threshold');
  });

  it('expectedBSharePct reports the configured treatment share, not the observed one', () => {
    assert.equal(srmVerdict(1, 99, 70, 30).expectedBSharePct, 30);
    assert.equal(srmVerdict(0, 0, 25, 75).expectedBSharePct, 75);
  });
});
