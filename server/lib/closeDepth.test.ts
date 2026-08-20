// DB integration tests for the V1 CLOSE-DEPTH arm (v1_close_depth_2026) — the
// resolver that decides whether a lead reads today's 8-message close or the
// 25-message one. Proves the ship-dark invariant (no test / draft / out-of-scope
// ⇒ today's close, nothing enrolled), that a running test is sticky and
// payload-driven, and — the one that would otherwise be found only in production
// — that the assignment FREEZE actually binds, which it only can because the
// resolver buckets on hashEmail(email) rather than the raw address.
//
//   npm run test:experiments      (or: npm run test:local server/lib/closeDepth.test.ts)
//
// Requires DATABASE_URL (skips otherwise) and the experiment tables:
// npx tsx server/scripts/migrateExperiments.ts
//
// assertLocalDb() at module scope is load-bearing: `dotenv/config` loads .env,
// whose DATABASE_URL is PRODUCTION Supabase, and this file INSERTs experiment
// rows. Isolation (unique per-run keys, synthetic emails, full cleanup in after())
// bounds the blast radius; the guard is what keeps the writes off production at
// all. It never touches the real 'v1_close_depth_2026' key — every experiment here
// is created under a stamped key and the resolver is called with an explicit key
// override, so the live draft cannot be read or disturbed.

import 'dotenv/config'; // must load DATABASE_URL before ./db builds the pool
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { eq, inArray } from 'drizzle-orm';
import { assertLocalDb } from './testGuards';

assertLocalDb();

import { db, pool } from './db';
import { experiments, experimentExposures } from '../../shared/schema';
import {
  resolveV1CloseDepth,
  logExposure,
  hashEmail,
  _resetExperimentCache,
} from './experiments';

const hasDb = !!process.env.DATABASE_URL;
const STAMP = Date.now();

const CD_RUN = `close_depth_run_${STAMP}`;
const CD_DRAFT = `close_depth_draft_${STAMP}`;
const CD_FREEZE = `close_depth_freeze_${STAMP}`;
const ALL_KEYS = [CD_RUN, CD_DRAFT, CD_FREEZE];

const TAROT = 'v1-tarot';

// Mirrors the real arms: control carries NO payload, the treatment carries
// {close:'deep'}. The resolver reads the payload, never the arm key — an arm
// named B with an empty payload must not switch the close on.
const armsAB = () => [
  { key: 'A', weight: 50, payload: {} },
  { key: 'B', weight: 50, payload: { close: 'deep' } },
];

before(async () => {
  if (!hasDb) return;
  await db.insert(experiments).values([
    {
      key: CD_RUN,
      name: 'close depth (running)',
      status: 'running',
      startedAt: new Date(),
      subjectType: 'email',
      variants: armsAB(),
      scope: { funnel: [TAROT] },
      conversion: { type: 'v1_main_funnel', windowDays: 7, targetN: 7200 },
    },
    {
      key: CD_DRAFT,
      name: 'close depth (draft)',
      status: 'draft',
      subjectType: 'email',
      variants: armsAB(),
      scope: { funnel: [TAROT] },
      conversion: { type: 'v1_main_funnel', windowDays: 7, targetN: 7200 },
    },
    {
      key: CD_FREEZE,
      name: 'close depth (freeze)',
      status: 'running',
      startedAt: new Date(),
      subjectType: 'email',
      variants: armsAB(),
      scope: { funnel: [TAROT], freezeAssignment: true },
      conversion: { type: 'v1_main_funnel', windowDays: 7, targetN: 7200 },
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

describe('resolveV1CloseDepth — ship-dark invariant (OFF ⇒ today\'s close)', { skip: !hasDb }, () => {
  it('no such experiment ⇒ deep:false, no arm, not enrolled', async () => {
    const r = await resolveV1CloseDepth('nobody@example.com', TAROT, `close_depth_missing_${STAMP}`);
    assert.equal(r.deep, false);
    assert.equal(r.variant, null);
    assert.equal(r.enrolled, false);
  });

  it('a DRAFT experiment ⇒ deep:false, not enrolled — deploying the code changes nothing', async () => {
    const r = await resolveV1CloseDepth('draft@example.com', TAROT, CD_DRAFT);
    assert.equal(r.deep, false, 'a draft arm must never drive the close');
    assert.equal(r.enrolled, false, 'a draft must never log an exposure');
  });

  it('no email ⇒ no subject ⇒ control, never enrolled', async () => {
    for (const email of [null, undefined, '', '   ']) {
      const r = await resolveV1CloseDepth(email, TAROT, CD_RUN);
      assert.equal(r.deep, false);
      assert.equal(r.variant, null);
      assert.equal(r.enrolled, false);
    }
  });

  it('out-of-scope funnel ⇒ control arm, not enrolled (fb-palm and root keep today\'s close)', async () => {
    for (const funnel of ['v1-palm', null, undefined]) {
      const r = await resolveV1CloseDepth('offscope@example.com', funnel, CD_RUN);
      assert.equal(r.deep, false, `funnel ${funnel} must not get the deep close`);
      assert.equal(r.enrolled, false, `funnel ${funnel} must not count in the denominator`);
      assert.equal(r.variant, 'A', 'out of scope renders the control arm');
    }
  });
});

describe('resolveV1CloseDepth — running test', { skip: !hasDb }, () => {
  it('sticky per email; B ⇒ deep, A ⇒ today\'s close; both enrolled; ~50/50', async () => {
    let deepCount = 0;
    const N = 400;
    for (let i = 0; i < N; i++) {
      const email = `cd-${STAMP}-${i}@example.com`;
      const r1 = await resolveV1CloseDepth(email, TAROT, CD_RUN);
      const r2 = await resolveV1CloseDepth(email, TAROT, CD_RUN);
      assert.equal(r1.variant, r2.variant, 'same email must never switch arms');
      assert.equal(r1.deep, r2.deep, 'same email must never switch close');
      assert.equal(r1.enrolled, true, 'running + in scope ⇒ enrolled (the denominator)');
      // The payload drives the close, not the arm key.
      assert.equal(r1.deep, r1.variant === 'B');
      if (r1.deep) deepCount++;
    }
    // 50/50 on a hash: allow generous slack, this is a smoke test not a chi-square.
    assert.ok(deepCount > N * 0.35 && deepCount < N * 0.65, `~50/50 split, got ${deepCount}/${N}`);
  });

  it('normalises the email the same way the exposure log does (case + whitespace)', async () => {
    const a = await resolveV1CloseDepth('Mixed.Case@Example.com', TAROT, CD_RUN);
    const b = await resolveV1CloseDepth('  mixed.case@example.com  ', TAROT, CD_RUN);
    assert.equal(a.variant, b.variant, 'one woman, one arm, however she typed it');
  });
});

describe('resolveV1CloseDepth — assignment freeze binds to the exposure row', { skip: !hasDb }, () => {
  const EMAIL = `freeze-${STAMP}@example.com`;

  it('an exposure logged under hashEmail() pins the arm against the weights', async () => {
    // What the weights alone would give this email.
    const natural = await resolveV1CloseDepth(EMAIL, TAROT, CD_FREEZE);
    const opposite = natural.variant === 'B' ? 'A' : 'B';

    // Record her as having ALREADY SEEN the other arm — subject_id is the hash,
    // which is what priceVariant.ts writes.
    await logExposure(CD_FREEZE, hashEmail(EMAIL), opposite, 'close_depth_assigned', {
      conversationId: `conv-${STAMP}`,
    });
    _resetExperimentCache();

    const frozen = await resolveV1CloseDepth(EMAIL, TAROT, CD_FREEZE);
    assert.equal(frozen.variant, opposite, 'the freeze must return the arm she was recorded as seeing');
    assert.equal(frozen.deep, opposite === 'B', 'and the close must follow that arm');
    assert.equal(frozen.enrolled, true);
  });

  it('a weight flip cannot move a woman who has already read one close', async () => {
    // Re-weight so the pool would serve A to everyone — the mid-flight edit the
    // freeze exists to survive.
    await db
      .update(experiments)
      .set({ variants: [
        { key: 'A', weight: 100, payload: {} },
        { key: 'B', weight: 0, payload: { close: 'deep' } },
      ] })
      .where(eq(experiments.key, CD_FREEZE));
    _resetExperimentCache();

    const rows = await db
      .select({ variant: experimentExposures.variant })
      .from(experimentExposures)
      .where(eq(experimentExposures.subjectId, hashEmail(EMAIL)));
    const recorded = rows[0]?.variant;

    const after = await resolveV1CloseDepth(EMAIL, TAROT, CD_FREEZE);
    assert.equal(after.variant, recorded, 'still the arm on her exposure row, not the re-weighted one');
  });

  it('🔴 the RAW email is not a subject id — the freeze would silently never bind', async () => {
    // This is the bug the hashed subject prevents: exposures store the HASH, so a
    // resolver bucketing on the raw address looks up a subject that cannot exist.
    // Documented as a test because the failure is invisible — the test keeps
    // running, arms just quietly move under a re-weight.
    const rawRows = await db
      .select({ variant: experimentExposures.variant })
      .from(experimentExposures)
      .where(eq(experimentExposures.subjectId, EMAIL.trim().toLowerCase()));
    assert.equal(rawRows.length, 0, 'nothing is ever stored under the raw email');
  });
});
