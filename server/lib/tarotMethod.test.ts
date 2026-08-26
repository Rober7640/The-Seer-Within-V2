// DB integration tests for the /fb-tarot INHERITED SHADOW arm (v1_tarot_shadow_2026) —
// the resolver that decides whether a Version-B visitor reads today's natural cut or
// the shadow one. The whole point of this test is the SAFE DEFAULT: every path that is
// not "running, in scope, valid payload, version B" must hand back `natural`, because
// natural is byte-identical to today's funnel and shadow has never served a live visitor.
//
//   npm run test:experiments      (or: npm run test:local server/lib/tarotMethod.test.ts)
//
// Requires DATABASE_URL (skips otherwise) and the experiment tables:
// npx tsx server/scripts/migrateExperiments.ts
//
// assertLocalDb() at module scope is load-bearing, exactly as in closeDepth.test.ts:
// `dotenv/config` loads .env, whose DATABASE_URL is PRODUCTION Supabase, and this file
// INSERTs experiment rows. Every experiment here is created under a stamped key and the
// resolver is always called with an explicit key override, so the real
// 'v1_tarot_shadow_2026' can never be read or disturbed by this file.

import 'dotenv/config'; // must load DATABASE_URL before ./db builds the pool
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { inArray } from 'drizzle-orm';
import { assertLocalDb } from './testGuards';

assertLocalDb();

import { db, pool } from './db';
import { experiments, experimentExposures } from '../../shared/schema';
import { resolveTarotMethod, _resetExperimentCache } from './experiments';

const hasDb = !!process.env.DATABASE_URL;
const STAMP = Date.now();

const SH_RUN = `tarot_shadow_run_${STAMP}`;
const SH_DRAFT = `tarot_shadow_draft_${STAMP}`;
const SH_BADPAY = `tarot_shadow_badpay_${STAMP}`;
const SH_DONE = `tarot_shadow_done_${STAMP}`;
const ALL_KEYS = [SH_RUN, SH_DRAFT, SH_BADPAY, SH_DONE];

const DECK = 'return-mhf';
const IN_SCOPE = 'cards-will-commit'; // one of the 37 approved shadow landers
const OFF_SCOPE = 'cards-return'; // a protected control — never armed, never enrolled

// Mirrors the real arms. CONTROL IS FIRST and carries method:'natural': the framework
// hands variants[0] back as the control arm on every not-applicable path, so listing
// natural first is what makes "out of scope" render today's read rather than the
// unproven one. 70/30 is the live split.
const armsAB = () => [
  { key: 'natural', weight: 30, payload: { method: 'natural' } },
  { key: 'shadow', weight: 70, payload: { method: 'shadow' } },
];

const landerScope = () => ({
  funnel: ['v1-tarot'],
  landers: [{ hook: IN_SCOPE, deck: DECK }],
});

const conversion = { type: 'v1_main_funnel', windowDays: 7, targetN: 7200 } as const;

before(async () => {
  if (!hasDb) return;
  await db.insert(experiments).values([
    {
      key: SH_RUN,
      name: 'tarot shadow (running)',
      status: 'running',
      startedAt: new Date(),
      subjectType: 'visitor',
      variants: armsAB(),
      scope: landerScope(),
      conversion,
    },
    {
      key: SH_DRAFT,
      name: 'tarot shadow (draft)',
      status: 'draft',
      subjectType: 'visitor',
      variants: armsAB(),
      scope: landerScope(),
      conversion,
    },
    {
      // Arms named the right things, carrying payloads that mean nothing. The resolver
      // reads the PAYLOAD, never the arm key, so this must serve natural to everyone.
      key: SH_BADPAY,
      name: 'tarot shadow (malformed payload)',
      status: 'running',
      startedAt: new Date(),
      subjectType: 'visitor',
      variants: [
        { key: 'natural', weight: 30, payload: {} },
        { key: 'shadow', weight: 70, payload: { method: 'inherited-shadow' } },
      ],
      scope: landerScope(),
      conversion,
    },
    {
      key: SH_DONE,
      name: 'tarot shadow (concluded, shadow won)',
      status: 'done',
      startedAt: new Date(),
      subjectType: 'visitor',
      variants: armsAB(),
      scope: landerScope(),
      conversion,
      winnerVariant: 'shadow',
    },
  ]);
  _resetExperimentCache();
});

after(async () => {
  if (hasDb) {
    await db.delete(experimentExposures).where(inArray(experimentExposures.experimentKey, ALL_KEYS));
    await db.delete(experiments).where(inArray(experiments.key, ALL_KEYS));
  }
  await pool.end();
});

describe('resolveTarotMethod — ship-dark invariant (anything unexpected ⇒ natural)', { skip: !hasDb }, () => {
  it('no such experiment ⇒ natural, no arm, not enrolled', async () => {
    const r = await resolveTarotMethod('vid-nobody', 'b', IN_SCOPE, DECK, `tarot_shadow_missing_${STAMP}`);
    assert.equal(r.method, 'natural');
    assert.equal(r.variant, null);
    assert.equal(r.enrolled, false);
    assert.equal(r.applied, false);
  });

  it('a DRAFT experiment ⇒ natural, not enrolled — deploying the code changes nothing', async () => {
    const r = await resolveTarotMethod('vid-draft', 'b', IN_SCOPE, DECK, SH_DRAFT);
    assert.equal(r.method, 'natural', 'a draft arm must never change the read');
    assert.equal(r.enrolled, false, 'a draft must never log an exposure');
    assert.equal(r.applied, false);
  });

  it('no visitor id ⇒ no subject ⇒ natural, never enrolled', async () => {
    for (const vid of [null, undefined, '', '   ']) {
      const r = await resolveTarotMethod(vid, 'b', IN_SCOPE, DECK, SH_RUN);
      assert.equal(r.method, 'natural', `visitor ${JSON.stringify(vid)} must get today's read`);
      assert.equal(r.variant, null);
      assert.equal(r.enrolled, false);
    }
  });

  it('an out-of-scope lander ⇒ the CONTROL arm, not enrolled (the other 67 hooks are untouched)', async () => {
    const r = await resolveTarotMethod('vid-offscope', 'b', OFF_SCOPE, DECK, SH_RUN);
    assert.equal(r.method, 'natural', 'a lander with no approved shadow read must never serve one');
    assert.equal(r.enrolled, false, 'and must never count in the denominator');
    assert.equal(r.variant, 'natural', 'out of scope renders variants[0] — which is why control is first');
  });

  it('a lander with no hook/deck at all ⇒ natural, not enrolled', async () => {
    for (const [hook, deck] of [[null, DECK], [IN_SCOPE, null], [null, null]] as const) {
      const r = await resolveTarotMethod('vid-bare', 'b', hook, deck, SH_RUN);
      assert.equal(r.method, 'natural');
      assert.equal(r.enrolled, false);
    }
  });

  it('a MALFORMED payload ⇒ natural and NOT enrolled, however the arm is named', async () => {
    // 'inherited-shadow' is not 'shadow'. An arm nobody configured correctly must not
    // serve copy, and must not be counted either — a counted visitor who saw the control
    // read would silently dilute the treatment arm.
    let sawShadowArm = false;
    for (let i = 0; i < 60; i++) {
      const r = await resolveTarotMethod(`vid-badpay-${STAMP}-${i}`, 'b', IN_SCOPE, DECK, SH_BADPAY);
      assert.equal(r.method, 'natural', 'an unrecognised payload must never select a method');
      assert.equal(r.enrolled, false, 'and must never be counted');
      assert.equal(r.applied, false);
      if (r.variant === 'shadow') sawShadowArm = true;
    }
    assert.ok(sawShadowArm, 'the 70%-weighted arm was reached — so natural came from the payload, not from luck');
  });
});

describe('resolveTarotMethod — the method only exists on Version B', { skip: !hasDb }, () => {
  it("version 'a' and 'c' ⇒ natural, no arm, not enrolled — returned BEFORE assignment", async () => {
    for (const v of ['a', 'c'] as const) {
      const r = await resolveTarotMethod('vid-version', v, IN_SCOPE, DECK, SH_RUN);
      assert.equal(r.method, 'natural', `version ${v} cannot serve a pre-written shadow read`);
      assert.equal(r.variant, null, `version ${v} must not even reach the arm — no exposure to mint`);
      assert.equal(r.enrolled, false);
      assert.equal(r.applied, false);
    }
  });

  it('the SAME visitor is enrolled on b and not on c — the version decides, not the cookie', async () => {
    const vid = `vid-crossver-${STAMP}`;
    const onB = await resolveTarotMethod(vid, 'b', IN_SCOPE, DECK, SH_RUN);
    const onC = await resolveTarotMethod(vid, 'c', IN_SCOPE, DECK, SH_RUN);
    assert.equal(onB.enrolled, true);
    assert.equal(onC.enrolled, false);
    assert.equal(onC.method, 'natural');
  });
});

describe('resolveTarotMethod — running test', { skip: !hasDb }, () => {
  it('sticky per visitor; the PAYLOAD drives the read; both arms enrolled; ~70/30', async () => {
    let shadowCount = 0;
    const N = 400;
    for (let i = 0; i < N; i++) {
      const vid = `vid-${STAMP}-${i}`;
      const r1 = await resolveTarotMethod(vid, 'b', IN_SCOPE, DECK, SH_RUN);
      const r2 = await resolveTarotMethod(vid, 'b', IN_SCOPE, DECK, SH_RUN);
      assert.equal(r1.variant, r2.variant, 'same visitor must never switch arms');
      assert.equal(r1.method, r2.method, 'same visitor must never switch read mid-session');
      assert.equal(r1.enrolled, true, 'running + in scope ⇒ enrolled, control included (the denominator)');
      assert.equal(r1.applied, true);
      assert.equal(r1.method, r1.variant, 'the payload drives the read; here the arm is named after it');
      if (r1.method === 'shadow') shadowCount++;
    }
    // 70/30 on a hash: generous slack, this is a smoke test not a chi-square.
    assert.ok(
      shadowCount > N * 0.6 && shadowCount < N * 0.8,
      `~70/30 split, got ${shadowCount}/${N} shadow`,
    );
  });

  it('the visitor id is trimmed the same way the exposure log keys it', async () => {
    const a = await resolveTarotMethod(`vid-trim-${STAMP}`, 'b', IN_SCOPE, DECK, SH_RUN);
    const b = await resolveTarotMethod(`  vid-trim-${STAMP}  `, 'b', IN_SCOPE, DECK, SH_RUN);
    assert.equal(a.variant, b.variant, 'one visitor, one arm, however the cookie arrives');
  });
});

describe('resolveTarotMethod — a concluded test rolls its winner out without counting', { skip: !hasDb }, () => {
  it('done + winnerVariant ⇒ the winning read applies, but nobody is enrolled', async () => {
    const r = await resolveTarotMethod(`vid-done-${STAMP}`, 'b', IN_SCOPE, DECK, SH_DONE);
    assert.equal(r.method, 'shadow', 'a declared winner keeps driving the read after the test ends');
    assert.equal(r.applied, true);
    assert.equal(r.enrolled, false, 'the test is over — no more exposures');
  });

  it('and it still cannot reach a lander outside its scope', async () => {
    const r = await resolveTarotMethod(`vid-done-off-${STAMP}`, 'b', OFF_SCOPE, DECK, SH_DONE);
    assert.equal(r.method, 'natural', 'scope is checked before the winner rollout');
    assert.equal(r.enrolled, false);
  });
});
