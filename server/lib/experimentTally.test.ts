// DB integration tests for the experiment framework's measurement + gating.
// Proves (a) the generic tally() reconciles with the legacy tallyPaywall.ts
// method on seeded data, and (b) assign() is OFF⇒everyone-control and, once
// running, sticky + ~50/50 + scope-aware. Seeds an isolated test experiment
// key + temp users and cleans everything up afterwards.
//
//   npx tsx --test server/lib/experimentTally.test.ts
//
// Requires DATABASE_URL (skips otherwise). Run the migration first so the
// experiment tables exist: npx tsx server/scripts/migrateExperiments.ts

import 'dotenv/config'; // must load DATABASE_URL before ./db builds the pool
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { eq, inArray, sql } from 'drizzle-orm';

import { db, pool } from './db';
import {
  experiments,
  experimentExposures,
  paywallViews,
  users,
  creditPurchases,
  personas,
} from '../../shared/schema';
import {
  assign,
  tally,
  _resetExperimentCache,
  invalidateExperiment,
  resolveUpsell1Cents,
  U1_PRICE_EXPERIMENT_KEY,
} from './experiments';

const STAMP = Date.now();
const TALLY_KEY = `recon_test_${STAMP}`;
const ASSIGN_KEY = `assign_test_${STAMP}`;
const T0 = new Date('2026-06-20T00:00:00.000Z');
const startISO = T0.toISOString();
const dayMs = 86_400_000;

// Populated in before(); cleaned in after().
let userIds: string[] = [];
let evelynId = '';
// A persona OTHER than Evelyn for the out-of-scope rows. Falls back to null
// (not evelynId) when the DB has only one persona — null is FK-safe for
// paywall_views.persona_id and still excluded by an Evelyn-scoped tally, so the
// reconciliation stays valid on a single-persona DB.
let otherPersonaId: string | null = null;
// Guaranteed-distinct id for the assign() out-of-scope assertion (no DB FK there).
const OUT_OF_SCOPE_PERSONA = '00000000-0000-0000-0000-0000000000ff';
const hasDb = !!process.env.DATABASE_URL;

type Norm = { variant: string; viewers: number; buyers: number; conversionPct: number; revenueUsd: number };
const norm = (r: Record<string, unknown>): Norm => ({
  variant: String(r.variant),
  viewers: Number(r.viewers) || 0,
  buyers: Number(r.buyers) || 0,
  conversionPct: Number(r.conversion_pct ?? r.conversionPct) || 0,
  revenueUsd: Number(r.revenue_usd ?? r.revenueUsd) || 0,
});
const byVariant = (rows: Norm[]) => Object.fromEntries(rows.map((r) => [r.variant, r]));

before(async () => {
  if (!hasDb) return;

  const ps = await db.select({ id: personas.id, slug: personas.slug }).from(personas);
  evelynId = ps.find((p) => p.slug === 'evelyn-cross')?.id ?? ps[0]?.id ?? '';
  otherPersonaId = ps.find((p) => p.id !== evelynId)?.id ?? null;
  assert.ok(evelynId, 'need at least one persona seeded');

  // 6 temp users (raw rows — bypasses app signup logic).
  const inserted = await db
    .insert(users)
    .values(
      Array.from({ length: 6 }, (_, i) => ({
        email: `recon-${STAMP}-${i}@test.invalid`,
        firstName: `Recon${i}`,
      })),
    )
    .returning({ id: users.id });
  userIds = inserted.map((r) => r.id);
  const [u1, u2, u3, u4, u5, u6] = userIds;

  // Scenario — exposures (generic) + paywall_views (legacy), same logical events:
  //   u1 A/evelyn buyer(+1d)  u2 A/evelyn non-buyer
  //   u3 B/evelyn buyer(+2d)  u4 B/evelyn buyer OUTSIDE 7d window (+10d → 0)
  //   u5 A/OTHER buyer        → excluded by persona scope
  //   u6 B/evelyn buyer       but exposed BEFORE start (−10d) → excluded by startISO
  const scen = [
    { uid: u1, variant: 'A', persona: evelynId, exposeAt: T0 },
    { uid: u2, variant: 'A', persona: evelynId, exposeAt: T0 },
    { uid: u3, variant: 'B', persona: evelynId, exposeAt: T0 },
    { uid: u4, variant: 'B', persona: evelynId, exposeAt: T0 },
    { uid: u5, variant: 'A', persona: otherPersonaId, exposeAt: T0 },
    { uid: u6, variant: 'B', persona: evelynId, exposeAt: new Date(T0.getTime() - 10 * dayMs) },
  ];

  await db.insert(experimentExposures).values(
    scen.map((s) => ({
      experimentKey: TALLY_KEY,
      subjectId: s.uid,
      variant: s.variant,
      surface: 'credits_page',
      context: { personaId: s.persona, isOutOfCredits: false },
      createdAt: s.exposeAt,
    })),
  );
  await db.insert(paywallViews).values(
    scen.map((s) => ({
      userId: s.uid,
      experimentKey: TALLY_KEY,
      variant: s.variant,
      surface: 'credits_page',
      personaId: s.persona,
      isOutOfCredits: false,
      createdAt: s.exposeAt,
    })),
  );

  // Completed purchases. u1/u3 inside window; u4 outside (10d); u5 persona-excluded;
  // u6 before start. u2 none.
  const purchase = (uid: string, at: Date, cents: number) => ({
    userId: uid,
    packageType: 'popular',
    coinsPurchased: 600,
    priceUsd: cents,
    status: 'completed',
    createdAt: at,
  });
  await db.insert(creditPurchases).values([
    purchase(u1, new Date(T0.getTime() + 1 * dayMs), 1999),
    purchase(u3, new Date(T0.getTime() + 2 * dayMs), 4999),
    purchase(u4, new Date(T0.getTime() + 10 * dayMs), 4999),
    purchase(u5, new Date(T0.getTime() + 1 * dayMs), 9999),
    purchase(u6, new Date(T0.getTime() - 9 * dayMs), 4999),
  ]);

  // A draft experiment for the assign() gating test.
  await db.insert(experiments).values({
    key: ASSIGN_KEY,
    name: 'assign gating test',
    status: 'draft',
    subjectType: 'user',
    variants: [
      { key: 'A', weight: 50 },
      { key: 'B', weight: 50 },
    ],
    scope: { personaId: evelynId },
    conversion: { type: 'credit_purchase', windowDays: 7 },
  });
});

after(async () => {
  if (hasDb) {
    await db.delete(experimentExposures).where(eq(experimentExposures.experimentKey, TALLY_KEY));
    await db.delete(paywallViews).where(eq(paywallViews.experimentKey, TALLY_KEY));
    if (userIds.length) {
      await db.delete(creditPurchases).where(inArray(creditPurchases.userId, userIds));
      await db.delete(users).where(inArray(users.id, userIds));
    }
    await db.delete(experiments).where(eq(experiments.key, ASSIGN_KEY));
  }
  await pool.end();
});

describe('tally() reconciles with the legacy tallyPaywall method', { skip: !hasDb }, () => {
  it('produces the expected per-arm conversion + revenue on seeded data', async () => {
    const res = await tally(TALLY_KEY, { startISO, personaId: evelynId, windowDays: 7 });
    const m = byVariant(res.rows.map(norm));
    // A: u1,u2 viewers; u1 buyer $19.99.  B: u3,u4 viewers; u3 buyer $49.99 (u4 outside window).
    assert.deepEqual(m.A, { variant: 'A', viewers: 2, buyers: 1, conversionPct: 50, revenueUsd: 19.99 });
    assert.deepEqual(m.B, { variant: 'B', viewers: 2, buyers: 1, conversionPct: 50, revenueUsd: 49.99 });
  });

  it('matches the legacy paywall_views SQL arm-for-arm (window, dedup, persona scope)', async () => {
    // Verbatim method of server/scripts/tallyPaywall.ts, pointed at the test key.
    const legacy = await db.execute(sql`
      WITH first_view AS (
        SELECT DISTINCT ON (user_id) user_id, variant, created_at AS first_view_at
        FROM paywall_views
        WHERE experiment_key = ${TALLY_KEY}
          AND created_at >= ${startISO}
          AND (${evelynId}::varchar IS NULL OR persona_id = ${evelynId})
        ORDER BY user_id, created_at
      ),
      conv AS (
        SELECT fv.variant,
          EXISTS (SELECT 1 FROM credit_purchases cp WHERE cp.user_id = fv.user_id AND cp.status = 'completed'
            AND cp.created_at >= fv.first_view_at
            AND cp.created_at < fv.first_view_at + ('7' || ' days')::interval) AS converted,
          COALESCE((SELECT sum(cp.price_usd) FROM credit_purchases cp WHERE cp.user_id = fv.user_id AND cp.status = 'completed'
            AND cp.created_at >= fv.first_view_at
            AND cp.created_at < fv.first_view_at + ('7' || ' days')::interval), 0) AS revenue_cents
        FROM first_view fv
      )
      SELECT variant, count(*) AS viewers, count(*) FILTER (WHERE converted) AS buyers,
        round(100.0 * count(*) FILTER (WHERE converted) / NULLIF(count(*),0), 2) AS conversion_pct,
        round(sum(revenue_cents)/100.0, 2) AS revenue_usd
      FROM conv GROUP BY variant ORDER BY variant;
    `);

    const res = await tally(TALLY_KEY, { startISO, personaId: evelynId, windowDays: 7 });
    const generic = byVariant(res.rows.map(norm));
    const legacyM = byVariant((legacy.rows as Record<string, unknown>[]).map(norm));
    assert.deepEqual(generic, legacyM, 'generic tally() must equal the legacy paywall tally');
  });
});

describe('assign() gating', { skip: !hasDb }, () => {
  it('OFF (draft) ⇒ everyone gets control A, not enrolled', async () => {
    _resetExperimentCache();
    for (let i = 0; i < 500; i++) {
      const a = await assignCached(`u-${i}`);
      assert.equal(a?.variant, 'A');
      assert.equal(a?.enrolled, false);
    }
  });

  it('RUNNING ⇒ sticky, ~50/50, scope-aware enrolment', async () => {
    await db.update(experiments).set({ status: 'running' }).where(eq(experiments.key, ASSIGN_KEY));
    _resetExperimentCache();

    let b = 0;
    const N = 500;
    for (let i = 0; i < N; i++) {
      const id = `u-${i}`;
      const first = await assign(ASSIGN_KEY, id, { personaId: evelynId });
      const second = await assign(ASSIGN_KEY, id, { personaId: evelynId });
      assert.equal(first?.variant, second?.variant, 'assignment must be sticky');
      assert.equal(first?.enrolled, true);
      assert.ok(first?.variant === 'A' || first?.variant === 'B');
      if (first?.variant === 'B') b++;
    }
    const share = b / N;
    assert.ok(share > 0.4 && share < 0.6, `B share ${share} not ~50%`);

    // Out-of-scope persona stays on control, not enrolled, even while running.
    const off = await assign(ASSIGN_KEY, 'u-1', { personaId: OUT_OF_SCOPE_PERSONA });
    assert.equal(off?.variant, 'A');
    assert.equal(off?.enrolled, false);

    // No subject id ⇒ null.
    assert.equal(await assign(ASSIGN_KEY, null, { personaId: evelynId }), null);
  });

  it('invalidateExperiment applies a pause kill-switch immediately (no 30s TTL wait)', async () => {
    // Precondition: running + enrolling (cache warm with the running row).
    const before = await assign(ASSIGN_KEY, 'kill-1', { personaId: evelynId });
    assert.equal(before?.enrolled, true);

    // Flip to paused in the DB and invalidate ONLY this key's cache entry.
    await db.update(experiments).set({ status: 'paused' }).where(eq(experiments.key, ASSIGN_KEY));
    invalidateExperiment(ASSIGN_KEY);

    // Next assign reads fresh → control, not enrolled — without the invalidate the
    // warm 'running' cache would still enrol for up to the TTL.
    const after = await assign(ASSIGN_KEY, 'kill-1', { personaId: evelynId });
    assert.equal(after?.variant, 'A');
    assert.equal(after?.enrolled, false);
  });

  it('DONE + winner rolls out ONLY to in-scope subjects (scoped winner)', async () => {
    await db
      .update(experiments)
      .set({ status: 'done', winnerVariant: 'B' })
      .where(eq(experiments.key, ASSIGN_KEY));
    invalidateExperiment(ASSIGN_KEY);
    // In scope (Evelyn) → winner B applied to everyone (not enrolled).
    const inScope = await assign(ASSIGN_KEY, 'x', { personaId: evelynId });
    assert.equal(inScope?.variant, 'B');
    assert.equal(inScope?.applied, true);
    assert.equal(inScope?.enrolled, false);
    // Out of scope → control 'A', NOT the winner — no leak to other personas.
    const offScope = await assign(ASSIGN_KEY, 'x', { personaId: OUT_OF_SCOPE_PERSONA });
    assert.equal(offScope?.variant, 'A');
    assert.equal(offScope?.applied, false);
  });
});

// Phase 3b — Upsell-1 price resolution. Tested against an ISOLATED temp experiment
// (via resolveUpsell1Cents' key override) so it never flips the live u1_price_2026
// running on the shared DB. U1_PRICE_EXPERIMENT_KEY is asserted to be the seeded key.
const U1_TEST_KEY = `u1_test_${STAMP}`;
describe('resolveUpsell1Cents (U1 price test)', { skip: !hasDb }, () => {
  before(async () => {
    await db.insert(experiments).values({
      key: U1_TEST_KEY,
      name: 'u1 price (isolated test)',
      status: 'draft',
      subjectType: 'email',
      variants: [
        { key: 'A', weight: 50, payload: { upsell1Cents: 4700 } },
        { key: 'B', weight: 50, payload: { upsell1Cents: 3700 } },
      ],
      scope: null,
      conversion: { type: 'upsell1_funnel' },
    });
  });
  after(async () => {
    await db.delete(experiments).where(eq(experiments.key, U1_TEST_KEY));
  });

  it('the live experiment key is u1_price_2026', () => {
    assert.equal(U1_PRICE_EXPERIMENT_KEY, 'u1_price_2026');
  });

  it('OFF (draft) ⇒ returns the legacy fallback price, not enrolled', async () => {
    invalidateExperiment(U1_TEST_KEY);
    const r = await resolveUpsell1Cents('u1-off@test.invalid', 4700, U1_TEST_KEY);
    assert.equal(r.cents, 4700);
    assert.equal(r.enrolled, false);
  });

  it('RUNNING ⇒ sticky per-email price ($47 / $37), ~50/50, matches the arm', async () => {
    await db.update(experiments).set({ status: 'running' }).where(eq(experiments.key, U1_TEST_KEY));
    invalidateExperiment(U1_TEST_KEY);

    let b = 0;
    const N = 400;
    for (let i = 0; i < N; i++) {
      const email = `u1-${i}@test.invalid`;
      const r1 = await resolveUpsell1Cents(email, 4700, U1_TEST_KEY);
      const r2 = await resolveUpsell1Cents(email, 4700, U1_TEST_KEY);
      assert.equal(r1.cents, r2.cents, 'sticky per email');
      assert.equal(r1.enrolled, true);
      // Charged price always matches the assigned arm's payload (A=$47, B=$37).
      if (r1.variant === 'B') {
        assert.equal(r1.cents, 3700);
        b++;
      } else {
        assert.equal(r1.cents, 4700);
      }
    }
    const share = b / N;
    assert.ok(share > 0.4 && share < 0.6, `B share ${share} not ~50%`);
  });

  it('DONE + winner ⇒ rolls the winner price out to everyone (not enrolled)', async () => {
    await db
      .update(experiments)
      .set({ status: 'done', winnerVariant: 'B' })
      .where(eq(experiments.key, U1_TEST_KEY));
    invalidateExperiment(U1_TEST_KEY);
    const r = await resolveUpsell1Cents('anyone@test.invalid', 4700, U1_TEST_KEY);
    assert.equal(r.cents, 3700); // winner B's $37 applied, not the legacy $47
    assert.equal(r.enrolled, false); // concluded — no new exposures logged
  });
});

// Helper that keeps the draft-phase loop readable.
async function assignCached(id: string) {
  return assign(ASSIGN_KEY, id, { personaId: evelynId });
}
