// Verification for the /fb-tarot Version B-vs-C test (v1_tarot_version_bc_2026).
//
// Exercises the REAL resolveTarotVersion against a REAL database, rather than
// asserting the config looks right. The unit tests already cover the pure logic; what
// this answers is "does the row that actually exists behave the way we intended".
//
//   npx tsx scripts/verify-tarot-version.ts                  # read-only
//   npx tsx scripts/verify-tarot-version.ts --simulate       # + assignment dry-run
//   npx tsx scripts/verify-tarot-version.ts --freeze-test    # + writes/deletes 2 rows
//
// SAFETY:
//   · default and --simulate are READ-ONLY. assign() never writes; only the caller
//     logs exposures, and this script does not. --simulate uses EXPERIMENT_FORCE_RUNNING,
//     which shouldForceRunning() only ever applies to a DRAFT row, so it cannot alter a
//     live test's behaviour even if pointed at production.
//   · --freeze-test DOES write. It inserts two exposures under a distinctive subject
//     prefix, proves the pin holds across a weight change, then deletes them and
//     asserts the count is back to zero. Refuses to run unless the test is still draft.

import 'dotenv/config';
import {
  resolveTarotVersion,
  invalidateExperiment,
  logExposure,
  V1_TAROT_VERSION_EXPERIMENT_KEY as KEY,
  type TarotVersion,
} from '../server/lib/experiments';
import { db } from '../server/lib/db';
import { experiments, experimentExposures } from '../shared/schema';
import { eq, and, like, sql } from 'drizzle-orm';

const SIMULATE = process.argv.includes('--simulate');
const FREEZE_TEST = process.argv.includes('--freeze-test');
const CANARY = 'verify-tarot-version-canary-';

// 🔴 Supabase's SESSION-mode pooler caps a project at 15 clients. The app's own pool
// is max:30, which is fine in production because those connections are spread across
// requests — but a script firing N assignments at once hits the cap and every query
// errors with EMAXCONNSESSION. Keep well under it.
const CONCURRENCY = 8;

/** Run `fn` over `n` indices, at most CONCURRENCY in flight. */
async function mapLimit<T>(n: number, fn: (i: number) => Promise<T>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < n; i += CONCURRENCY) {
    const size = Math.min(CONCURRENCY, n - i);
    out.push(...(await Promise.all(Array.from({ length: size }, (_, j) => fn(i + j)))));
  }
  return out;
}

let failures = 0;
const check = (pass: boolean, label: string, detail = '') => {
  console.log(`   ${pass ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!pass) failures++;
};

async function main() {
  // ── 1. THE ROW ───────────────────────────────────────────────────────────
  const [exp] = await db.select().from(experiments).where(eq(experiments.key, KEY)).limit(1);
  if (!exp) {
    console.error(`experiment ${KEY} not found — run create-tarot-version-experiment first`);
    process.exit(2);
  }
  const variants = exp.variants as Array<{ key: string; weight: number; payload?: any }>;
  const scope = exp.scope as any;

  console.log(`\n1. CONFIG (${KEY})`);
  console.log(`   status=${exp.status} subject_type=${exp.subjectType}`);
  check(exp.subjectType === 'visitor', 'subject is the visitor cookie (ab_visitor_id join)');
  check(variants[0]?.key === 'C', 'C is variants[0] — the control arm', `got ${variants[0]?.key}`);
  check(variants[0]?.payload?.version === 'c' && variants[1]?.payload?.version === 'b',
    'arm payloads carry the version they serve');
  check(scope?.freezeAssignment === true, 'assignments are pinned (required for live weight edits)');
  check(Array.isArray(scope?.landers) && scope.landers.length > 0,
    'lander scope is a non-empty list', `${scope?.landers?.length ?? 0} landers`);
  const weights = variants.map((v) => `${v.key}=${v.weight}`).join(' / ');
  console.log(`   weights: ${weights}`);

  // Defensive: an interrupted --freeze-test run could leave canary exposures behind,
  // and they would sit in the tally as real visitors. Clear any before doing anything
  // else, so a crashed run can never quietly pollute the denominator.
  const wiped = await db
    .delete(experimentExposures)
    .where(
      and(eq(experimentExposures.experimentKey, KEY), like(experimentExposures.subjectId, `${CANARY}%`)),
    );
  const wipedN = (wiped as unknown as { rowCount?: number }).rowCount ?? 0;
  if (wipedN > 0) console.log(`   ⚠️  cleared ${wipedN} leftover canary exposure(s) from an earlier run`);

  const inScope: Array<{ hook: string; deck: string }> = scope.landers;

  // ── 2. DRAFT IS INERT ────────────────────────────────────────────────────
  // The property the whole deploy rests on: with the test not running, every visitor
  // gets exactly the version her URL named, and nobody is enrolled.
  console.log(`\n2. INERT WHILE status=${exp.status}`);
  for (const url of ['c', 'b'] as TarotVersion[]) {
    const r = await resolveTarotVersion(`${CANARY}inert-${url}`, url, inScope[0].hook, inScope[0].deck);
    check(r.version === url && !r.enrolled && !r.applied,
      `URL version '${url}' is returned untouched, not enrolled`,
      `got version=${r.version} enrolled=${r.enrolled}`);
  }

  // ── 3. VERSION A IS NEVER ENROLLED ──────────────────────────────────────
  console.log('\n3. VERSION A IS NEVER IN THE TEST');
  const a = await resolveTarotVersion(`${CANARY}vA`, 'a', inScope[0].hook, inScope[0].deck);
  check(a.version === 'a' && !a.enrolled, "'/fb-tarot' (version A) stays version A");

  if (!SIMULATE && !FREEZE_TEST) {
    console.log('\n(pass --simulate to dry-run the assignment behaviour)');
    return;
  }

  // ── 4. ASSIGNMENT DRY-RUN ───────────────────────────────────────────────
  // shouldForceRunning() upgrades a DRAFT row to running for THIS process only, for
  // exactly the keys listed. Nothing is written: assign() reads, the caller logs.
  process.env.EXPERIMENT_FORCE_RUNNING = KEY;
  invalidateExperiment(KEY);

  console.log('\n4. ASSIGNMENT (draft force-run in-process; no writes)');
  // 🔴 Every call is a DB round trip, because scope.freezeAssignment makes assign()
  // look up the subject's first exposure before bucketing. That is one extra query per
  // chat start in production — fine there, but it means a naive sequential loop here
  // spends minutes on network latency. Batched, and N chosen so the 3-point tolerance
  // below is still comfortably outside normal sampling noise (sd of B% at N=600 is
  // ~1.9pp, so a correct split clears it and a broken one does not).
  const N = 600;
  const tally: Record<string, number> = {};
  const split = await mapLimit(N, (i) =>
    resolveTarotVersion(`${CANARY}split-${i}`, 'c', inScope[0].hook, inScope[0].deck),
  );
  for (const r of split) tally[r.version] = (tally[r.version] ?? 0) + 1;
  const bPct = ((tally.b ?? 0) / N) * 100;
  const wantB = (variants[1].weight / (variants[0].weight + variants[1].weight)) * 100;
  console.log(`   over ${N} visitors: C=${tally.c ?? 0} B=${tally.b ?? 0}  (B = ${bPct.toFixed(1)}%)`);
  check(Math.abs(bPct - wantB) < 3, `split matches the configured ${wantB.toFixed(0)}% B`,
    `observed ${bPct.toFixed(1)}%`);

  console.log('\n   stickiness:');
  const s1 = await resolveTarotVersion(`${CANARY}sticky`, 'c', inScope[0].hook, inScope[0].deck);
  const s2 = await resolveTarotVersion(`${CANARY}sticky`, 'c', inScope[0].hook, inScope[0].deck);
  check(s1.version === s2.version, 'the same visitor gets the same arm on every call');

  // ── 5. LANDER SCOPE ─────────────────────────────────────────────────────
  console.log('\n5. LANDER SCOPE (only the listed ad URLs enrol)');
  for (const l of inScope) {
    const rs = await mapLimit(20, (i) =>
      resolveTarotVersion(`${CANARY}scope-${l.hook}-${i}`, 'c', l.hook, l.deck),
    );
    const enrolled = rs.filter((r) => r.enrolled).length;
    check(enrolled === 20, `${l.hook} · ${l.deck} enrols`, `${enrolled}/20`);
  }
  // The face-up sibling URLs the operator deliberately excluded.
  for (const hook of inScope.map((l) => l.hook)) {
    const r = await resolveTarotVersion(`${CANARY}faceup-${hook}`, 'c', hook, 'arcana-mfh');
    check(r.version === 'c' && !r.enrolled, `${hook} · arcana-mfh (FACE-UP) stays control, not enrolled`);
  }
  // A live tarot hook that is not in the test at all.
  const off = await resolveTarotVersion(`${CANARY}offscope`, 'c', 'cards-honest', 'return-mhf');
  check(off.version === 'c' && !off.enrolled, 'cards-honest (not in the test) stays control');
  // Missing lander params must not fall into a scoped test.
  const bare = await resolveTarotVersion(`${CANARY}bare`, 'c', null, null);
  check(bare.version === 'c' && !bare.enrolled, 'a visitor with no hook/deck is never enrolled');

  if (!FREEZE_TEST) {
    console.log('\n(pass --freeze-test to prove the weight-change pin — DEV ONLY, writes 2 rows)');
    return;
  }

  // ── 6. THE PIN ──────────────────────────────────────────────────────────
  // The property that makes dashboard weight edits safe: a visitor who has already
  // been shown an arm keeps it when the split changes.
  if (exp.status !== 'draft') {
    console.error('\n6. SKIPPED — refusing to write exposures against a non-draft test.');
    process.exit(failures ? 1 : 0);
  }
  console.log('\n6. WEIGHT-CHANGE PIN (writes 1 canary exposure, then deletes it)');
  // 🔴 The subject MUST be one currently assigned to CONTROL (C), because the flip
  // below pushes almost everyone to B. Pinning a visitor who was already B against a
  // shift toward B proves nothing — she would land on B either way. Only a C visitor
  // who survives a 99%-B split actually demonstrates the pin.
  let subject = '';
  let first: Awaited<ReturnType<typeof resolveTarotVersion>> | null = null;
  for (let i = 0; i < 50 && !subject; i++) {
    const candidate = `${CANARY}freeze-${i}`;
    const r = await resolveTarotVersion(candidate, 'c', inScope[0].hook, inScope[0].deck);
    if (r.variant === 'C') {
      subject = candidate;
      first = r;
    }
  }
  if (!subject || !first) throw new Error('could not find a control-arm canary subject');
  await logExposure(KEY, subject, first.variant!, 'verify-canary', { canary: true });
  console.log(`   visitor was shown arm ${first.variant} (version ${first.version}) — the CONTROL arm`);

  // Flip the split hard the other way — the case that would reassign an unpinned test.
  const flipped = [
    { ...variants[0], weight: 1 },
    { ...variants[1], weight: 99 },
  ];
  await db.update(experiments).set({ variants: flipped as any }).where(eq(experiments.key, KEY));
  invalidateExperiment(KEY);
  const after = await resolveTarotVersion(subject, 'c', inScope[0].hook, inScope[0].deck);
  check(after.variant === 'C',
    'a CONTROL visitor KEEPS arm C after a 70/30 → 1/99-toward-B re-weight',
    `${first.variant} → ${after.variant}`);

  // The counter-check: without the pin she WOULD have moved. Proves the assertion
  // above is testing something — an unexposed twin under the same weights goes to B.
  const twin = await resolveTarotVersion(`${subject}-unpinned-twin`, 'c', inScope[0].hook, inScope[0].deck);
  check(twin.variant === 'B',
    'an identical but UNEXPOSED visitor does move to B — so the pin is what held',
    `twin got ${twin.variant}`);

  // A visitor with no exposure yet must follow the NEW weights.
  const postFlip = await mapLimit(200, (i) =>
    resolveTarotVersion(`${CANARY}postflip-${i}`, 'c', inScope[0].hook, inScope[0].deck),
  );
  const newB = postFlip.filter((r) => r.version === 'b').length;
  check(newB > 180, 'NEW visitors follow the new 99% B split', `${newB}/200 got B`);

  // Restore and clean up.
  await db.update(experiments).set({ variants: variants as any }).where(eq(experiments.key, KEY));
  invalidateExperiment(KEY);
  await db.delete(experimentExposures).where(
    and(eq(experimentExposures.experimentKey, KEY), like(experimentExposures.subjectId, `${CANARY}%`)),
  );
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(experimentExposures)
    .where(eq(experimentExposures.experimentKey, KEY));
  check(Number(n) === 0, 'canary exposures removed — the test is back to zero', `${n} remaining`);

  const [restored] = await db.select().from(experiments).where(eq(experiments.key, KEY)).limit(1);
  const rv = restored.variants as Array<{ key: string; weight: number }>;
  check(rv[0].weight === variants[0].weight && rv[1].weight === variants[1].weight,
    'original weights restored', rv.map((v) => `${v.key}=${v.weight}`).join(' / '));
}

main()
  .then(() => {
    console.log(failures === 0 ? '\n✅ ALL CHECKS PASSED\n' : `\n❌ ${failures} CHECK(S) FAILED\n`);
    process.exit(failures ? 1 : 0);
  })
  .catch((e) => {
    console.error('\nFAILED:', e);
    process.exit(2);
  });
