// The live-edit guard for a RUNNING experiment's scope.
//
// This is the rule that stands between the dashboard and a corrupted money test.
// Once a test has started, two scope edits are permitted and everything else must be
// refused: APPENDING a lander, and switching freezeAssignment ON. Every other change
// re-partitions who is in the test while it is running.
//
// Tested here rather than through the route because it is the whole decision — the
// route just turns a non-null return into a 409.
//
//   npx tsx --test server/routes/admin/scopeEdit.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { scopeEditError, stableJson } from './experiments';
import type { ExperimentScope } from '../../../shared/schema';

describe('stableJson — jsonb key order must not read as a change', () => {
  // 🔴 THE BUG THIS PINS (found 2026-08-10, after the test was already live).
  // jsonb stores keys sorted by length then bytewise, so `conversion` comes back
  // from Postgres as {type, targetN, windowDays}. The dashboard rebuilds it from
  // form fields as {type, windowDays, targetN} and re-sends it on EVERY save.
  // Compared with JSON.stringify those differ, so the frozen-field guard rejected
  // every live weight edit with "cannot change conversion" — blocking the exact
  // feature the guard was relaxed for, for a reason having nothing to do with weights.
  const AS_STORED = { type: 'v1_main_funnel', targetN: 11000, windowDays: 7 };
  const AS_SENT = { type: 'v1_main_funnel', windowDays: 7, targetN: 11000 };

  it('the live experiment\'s conversion round-trips as UNCHANGED', () => {
    assert.notEqual(JSON.stringify(AS_STORED), JSON.stringify(AS_SENT), 'precondition: raw order differs');
    assert.equal(stableJson(AS_STORED), stableJson(AS_SENT));
  });

  it('a REAL conversion change is still detected', () => {
    assert.notEqual(stableJson(AS_STORED), stableJson({ ...AS_STORED, targetN: 5000 }));
    assert.notEqual(stableJson(AS_STORED), stableJson({ ...AS_STORED, type: 'credit_purchase' }));
    // A dropped field is a change, not a reorder.
    assert.notEqual(stableJson(AS_STORED), stableJson({ type: 'v1_main_funnel', targetN: 11000 }));
  });

  it('array ORDER is preserved — variants[0] is the control arm', () => {
    const cFirst = [{ key: 'C' }, { key: 'B' }];
    const bFirst = [{ key: 'B' }, { key: 'C' }];
    assert.notEqual(stableJson(cFirst), stableJson(bFirst), 're-ordering arms must never look unchanged');
  });

  it('normalises nested objects too (arm payloads are jsonb as well)', () => {
    assert.equal(
      stableJson([{ key: 'C', payload: { version: 'c', note: 'x' } }]),
      stableJson([{ key: 'C', payload: { note: 'x', version: 'c' } }]),
    );
  });

  it('treats undefined and absent alike, and null as itself', () => {
    assert.equal(stableJson({ a: 1, b: undefined }), stableJson({ a: 1 }));
    assert.notEqual(stableJson({ a: 1, b: null }), stableJson({ a: 1 }));
    assert.equal(stableJson(null), 'null');
  });
});

// The live shape of the /fb-tarot version test.
const BASE: ExperimentScope = {
  funnel: 'v1-tarot',
  freezeAssignment: true,
  landers: [
    { hook: 'cards-will-commit', deck: 'return-mhf' },
    { hook: 'cards-return', deck: 'return-mhf' },
    { hook: 'cards-who-he-is', deck: 'return-mhf' },
    { hook: 'cards-feels', deck: 'return-mhf' },
  ],
};

const clone = (s: ExperimentScope): ExperimentScope => JSON.parse(JSON.stringify(s));

describe('scopeEditError — permitted live edits', () => {
  it('an unchanged scope is not an edit', () => {
    assert.equal(scopeEditError(BASE, clone(BASE)), null);
  });

  it('key ORDER does not count as a change', () => {
    // The dashboard rebuilds scope from form fields, so it can legitimately serialise
    // the same object with its keys in a different order. Treating that as an edit
    // would 409 every save, including a pure weight change.
    const reordered = {
      landers: BASE.landers,
      freezeAssignment: true,
      funnel: 'v1-tarot',
    } as ExperimentScope;
    assert.equal(scopeEditError(BASE, reordered), null);
  });

  it('APPENDING a lander is allowed (this is the "add more hooks later" ask)', () => {
    const extended = clone(BASE);
    extended.landers!.push({ hook: 'cards-cheating', deck: 'return-mhf' });
    assert.equal(scopeEditError(BASE, extended), null);
  });

  it('appending the FACE-UP version of a hook already in the test is allowed', () => {
    const extended = clone(BASE);
    extended.landers!.push({ hook: 'cards-return', deck: 'arcana-mfh' });
    assert.equal(scopeEditError(BASE, extended), null);
  });

  it('switching freezeAssignment ON mid-flight is allowed', () => {
    // Pinning to the exposure log can only ever stop future drift — the log is the
    // record of what a subject actually saw.
    const unfrozen = { ...clone(BASE), freezeAssignment: false };
    assert.equal(scopeEditError(unfrozen, clone(BASE)), null);
    const absent = clone(BASE);
    delete absent.freezeAssignment;
    assert.equal(scopeEditError(absent, clone(BASE)), null);
  });
});

describe('scopeEditError — refused live edits', () => {
  it('🔴 REMOVING a lander is refused, and names the lander', () => {
    // Its exposures would stay in the tally with nothing in scope explaining them,
    // moving the denominator under a running test.
    const shrunk = clone(BASE);
    shrunk.landers = shrunk.landers!.filter((l) => l.hook !== 'cards-feels');
    const err = scopeEditError(BASE, shrunk);
    assert.ok(err, 'removing a lander must be refused');
    assert.match(err!, /cards-feels/);
    assert.match(err!, /append-only/);
  });

  it('🔴 REPLACING the lander list wholesale is refused, not treated as an append', () => {
    const swapped = clone(BASE);
    swapped.landers = [{ hook: 'cards-honest', deck: 'return-mhf' }];
    assert.ok(scopeEditError(BASE, swapped));
  });

  it('🔴 switching freezeAssignment OFF is refused', () => {
    // Otherwise: unpin, re-weight, and every already-exposed visitor is reshuffled.
    const unfrozen = { ...clone(BASE), freezeAssignment: false };
    const err = scopeEditError(BASE, unfrozen);
    assert.ok(err);
    assert.match(err!, /never off/);
  });

  it('🔴 DROPPING the lander list is refused — it would enrol every tarot lander', () => {
    const noLanders = clone(BASE);
    delete noLanders.landers;
    const err = scopeEditError(BASE, noLanders);
    assert.ok(err);
    assert.match(err!, /every lander/);
  });

  it('🔴 ADDING a lander list to an unscoped running test is refused — it would narrow it', () => {
    const unscoped: ExperimentScope = { funnel: 'v1-tarot' };
    const err = scopeEditError(unscoped, clone(BASE));
    assert.ok(err);
    assert.match(err!, /narrow/);
  });

  it('changing the funnel is still frozen', () => {
    const moved = { ...clone(BASE), funnel: 'v1-palm' };
    assert.equal(scopeEditError(BASE, moved), 'scope');
  });

  it('changing sign / personaId is still frozen', () => {
    assert.equal(scopeEditError(BASE, { ...clone(BASE), sign: 'thumb' }), 'scope');
    assert.equal(scopeEditError(BASE, { ...clone(BASE), personaId: 'x' }), 'scope');
  });

  it('nulling the whole scope on a scoped test is refused', () => {
    assert.ok(scopeEditError(BASE, null));
  });
});
