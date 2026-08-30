// DB integration tests for the ROOT funnel sentinel (v1-root).
//
// Root V1 sends no funnel param, so before this every funnel-scoped test skipped
// it. These prove the two halves of the contract: a test that LISTS 'v1-root'
// enrols root traffic, and a test that does not is completely unaffected — which
// is what makes deploying the sentinel a no-op until a row's scope is widened.
//
//   npm run test:local server/lib/rootFunnelScope.test.ts
//
// Requires DATABASE_URL (skips otherwise). assertLocalDb() is load-bearing:
// dotenv loads .env, whose DATABASE_URL is PRODUCTION, and this file INSERTs
// experiment rows. Every key is stamped per-run and cleaned up in after().

import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, inArray } from 'drizzle-orm';
import { assertLocalDb } from './testGuards';

assertLocalDb();

import { db, pool } from './db';
import { experiments, experimentExposures } from '../../shared/schema';
import {
  resolvePalmGate,
  resolveV1Bump,
  resolveV1DownsellBumpPrice,
  resolveV1CloseDepth,
  logExposure,
  hashEmail,
  experimentFunnel,
  ROOT_FUNNEL,
  _resetExperimentCache,
} from './experiments';

const hasDb = !!process.env.DATABASE_URL;
const STAMP = Date.now();

const GATE_ROOT = `root_gate_${STAMP}`;
const GATE_TAROT_ONLY = `root_gate_tarot_only_${STAMP}`;
const BUMP_ROOT = `root_bump_${STAMP}`;
const DOWNSELL_ROOT = `root_downsell_${STAMP}`;
const CLOSE_ROOT = `root_close_${STAMP}`;
const GATE_DONE_ROOT = `root_gate_done_${STAMP}`;
const EXPOSURE_KEY = `root_exposure_${STAMP}`;
const ALL_KEYS = [
  GATE_ROOT,
  GATE_TAROT_ONLY,
  BUMP_ROOT,
  DOWNSELL_ROOT,
  CLOSE_ROOT,
  GATE_DONE_ROOT,
  EXPOSURE_KEY,
];

// Every arm carries its payload so the resolver has something to apply. Weight is
// 100 on the single arm: these tests assert ENROLMENT and SCOPE, not the split.
const oneArm = (payload: Record<string, unknown>) => [{ key: 'B', weight: 100, payload }];

const running = (key: string, variants: ReturnType<typeof oneArm>, funnels: string[]) => ({
  key,
  name: key,
  status: 'running',
  startedAt: new Date(),
  subjectType: 'email',
  variants,
  scope: { funnel: funnels },
  conversion: { type: 'v1_main_funnel', windowDays: 7, targetN: 1000 },
});

// Same shape as `running`, but concluded with a declared winner — the combination
// that actually ships a feature to root (see ship-gate-bump-to-root-2026-08-18.sql):
// assign()'s status==='done' && winnerVariant branch (experiments.ts:419) applies
// the winning arm's payload to everyone in scope, with enrolled:false, because a
// concluded test logs no new exposures anywhere.
const doneWithWinner = (
  key: string,
  variants: ReturnType<typeof oneArm>,
  funnels: string[],
  winner: string,
) => ({
  key,
  name: key,
  status: 'done',
  startedAt: new Date(),
  endedAt: new Date(),
  subjectType: 'email',
  variants,
  scope: { funnel: funnels },
  winnerVariant: winner,
  conversion: { type: 'v1_main_funnel', windowDays: 7, targetN: 1000 },
});

before(async () => {
  if (!hasDb) return;
  await db.insert(experiments).values([
    running(GATE_ROOT, oneArm({ gate: true }), ['v1-tarot', ROOT_FUNNEL]),
    running(GATE_TAROT_ONLY, oneArm({ gate: true }), ['v1-tarot']),
    running(BUMP_ROOT, oneArm({ bump: true, copy: 'A' }), ['v1-tarot', ROOT_FUNNEL]),
    running(DOWNSELL_ROOT, oneArm({ bumpCents: 977 }), ['v1-tarot', ROOT_FUNNEL]),
    running(CLOSE_ROOT, oneArm({ close: 'deep' }), ['v1-tarot', ROOT_FUNNEL]),
    doneWithWinner(GATE_DONE_ROOT, oneArm({ gate: true }), ['v1-tarot', ROOT_FUNNEL], 'B'),
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

describe('root enrols when the scope lists v1-root', { skip: !hasDb }, () => {
  it('resolvePalmGate — root traffic (no funnel) gets the gate', async () => {
    const r = await resolvePalmGate('root-gate@example.com', undefined, null, GATE_ROOT);
    assert.equal(r.gate, true, 'root must see the gate once its scope lists v1-root');
    assert.equal(r.enrolled, true, 'root must count in the denominator');
  });

  it('resolveV1Bump — root traffic gets the bump and the copy arm', async () => {
    const r = await resolveV1Bump('root-bump@example.com', null, null, BUMP_ROOT);
    assert.equal(r.bump, true);
    assert.equal(r.copy, 'A');
    assert.equal(r.enrolled, true);
  });

  it('resolveV1DownsellBumpPrice — root traffic resolves the arm price', async () => {
    // Returns { cents, variant, enrolled } since 2026-08-26 (development) — the
    // arm id and enrolment are needed at checkout, not just the price.
    const r = await resolveV1DownsellBumpPrice('root-ds@example.com', undefined, DOWNSELL_ROOT);
    assert.equal(r.cents, 977);
    assert.equal(r.enrolled, true);
  });

  it('resolveV1CloseDepth — root traffic resolves the deep arm', async () => {
    const r = await resolveV1CloseDepth('root-close@example.com', null, CLOSE_ROOT);
    assert.equal(r.deep, true);
    assert.equal(r.enrolled, true);
  });
});

describe('a scope WITHOUT v1-root still skips root', { skip: !hasDb }, () => {
  it('root gets the control arm and is never enrolled', async () => {
    for (const funnel of [null, undefined]) {
      const r = await resolvePalmGate('root-offscope@example.com', funnel, null, GATE_TAROT_ONLY);
      assert.equal(r.gate, false, 'a tarot-only test must never reach root');
      assert.equal(r.enrolled, false, 'root must not pollute a tarot-only denominator');
    }
  });

  it('tarot itself is unaffected by the sentinel', async () => {
    const r = await resolvePalmGate('tarot-still-works@example.com', 'v1-tarot', null, GATE_TAROT_ONLY);
    assert.equal(r.gate, true);
    assert.equal(r.enrolled, true);
  });

  it('an unrelated funnel still cannot reach a root-scoped test', async () => {
    const r = await resolvePalmGate('fb-user@example.com', 'v1-fb', null, GATE_ROOT);
    assert.equal(r.gate, false, 'v1-fb is not in scope and must stay out');
    assert.equal(r.enrolled, false);
  });
});

// This is the mechanism that actually ships a feature to root — see
// improve-v1/ship-gate-bump-to-root-2026-08-18.sql. Marking a row `done` with a
// winner is not just "a running test with one arm at weight 100"; it is a
// DIFFERENT branch in assign() (status==='done' && winnerVariant, above the
// assignment-freeze check) that applies the payload to everyone in scope while
// enrolling nobody, forever.
describe('a concluded test applies its winner to root without enrolling anyone', { skip: !hasDb }, () => {
  it('resolvePalmGate — a done row with a declared winner still gates root, but stops counting', async () => {
    const r = await resolvePalmGate('root-done@example.com', undefined, null, GATE_DONE_ROOT);
    assert.equal(r.gate, true, 'a concluded test must still apply its winning payload to root');
    assert.equal(r.enrolled, false, 'a concluded test never adds to the denominator, root included');
  });
});

describe('exposure context identifies root rows', { skip: !hasDb }, () => {
  it('an exposure written for root carries funnel=v1-root, not null', async () => {
    const subject = hashEmail('root-exposure@example.com');
    await logExposure(EXPOSURE_KEY, subject, 'B', 'gate_assigned', {
      conversationId: 'test-conversation',
      funnel: experimentFunnel(undefined),
    });

    const [row] = await db
      .select()
      .from(experimentExposures)
      .where(
        and(
          eq(experimentExposures.experimentKey, EXPOSURE_KEY),
          eq(experimentExposures.subjectId, subject),
        ),
      );

    assert.ok(row, 'the exposure must have been written');
    // The tally reads e.context->>'funnel'; a null there reports as unrecorded, so
    // root's rows would be invisible in the per-funnel breakdown.
    assert.equal((row.context as { funnel?: string } | null)?.funnel, 'v1-root');
  });
});
