// Correctness check for a LIVE V1 price split test. READ-ONLY.
//
// This checks the things that are BUGS AT ANY SAMPLE SIZE — not the split ratio.
// A 50/50 assignment ratio needs ~100+ leads per arm before it means anything
// (at n=20 a healthy 50/50 routinely looks like 30/70), so judging the ratio early
// is how you talk yourself into rolling back a working test. This script deliberately
// reports the ratio as INFORMATIONAL ONLY and never fails on it.
//
// What it DOES fail on (each is deterministic — one bad row is a real bug):
//   • a test-arm row whose main/grace != the prices configured for it, or a NULL grace
//     (NULL grace = corrupted config key ⇒ the grace CHARGE is broken)
//   • any assignment on the root '55-35' arm (root is deliberately OUT of the test)
//   • the test arm drawing ZERO times after enough leads to rule out chance
//   • a control row whose price drifted off $35/$25
//
// ⚠ WHICH ARM IS "THE TEST" IS READ FROM THE LIVE POOL, NOT HARDCODED. It was
//   '55-35_palm' (the $55/$35 sliding close, thumb-scoped) and becomes '35_palm_gate'
//   (the 3-checkbox commitment gate, every sign) when that flip is run. Both the
//   expected prices and the expected split come from the pool, so retiring one test
//   and starting another cannot turn this script into a false alarm.
//
// It CANNOT check a variant's `sign` scoping — there is no sign column on
// conversations. That check must come from the Railway prod logs
// (`priceVariant: assigned`), and it only matters for a variant that declares `signs`.
//
// ⚠ The window is anchored to system_config.updated_at — the moment the pool was flipped —
//   NOT to "the last N hours". Counting leads from BEFORE the flip sweeps in control-only
//   traffic that could never have drawn the sliding arm, which silently craters the apparent
//   split (the first run of this script showed a fake "8% sliding" that way). Pre-flip leads
//   are not part of the experiment and must never be in its denominator.
//
// Usage:  npx tsx scripts/price-test-correctness-check.mjs

import pg from 'pg';
import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf8');
const url = [...env.matchAll(/^DATABASE_URL=(.+)$/gm)].pop()[1].trim().replace(/^["']|["']$/g, '');
// SSL for the hosted DB; local sandbox Postgres (127.0.0.1:5433) doesn't speak it,
// and refusing to connect there made this script impossible to rehearse offline.
const isLocal = /@(localhost|127\.0\.0\.1)\b/.test(url);
const pool = new pg.Pool({ connectionString: url, ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }) });

// The palm TEST arm is whatever currently has weight > 0 alongside the control —
// it is NOT hardcoded. It was '55-35_palm' (the $55/$35 sliding close) and is now
// '35_palm_gate' (the 3-checkbox commitment gate). Deriving it from the live pool
// means retiring one test and starting another does not turn this script into a
// false alarm: with the sliding close parked at weight 0, a hardcoded check would
// report "ZERO sliding assignments — the arm is not drawing" forever, which reads
// as a broken pool and invites a panicked rollback of a perfectly healthy test.
const CONTROL = '35_palm_u47';
// Expected prices are read from the pool itself (below) so they can never drift
// from what is actually configured.
const EXPECT = {};

const fail = [];
const warn = [];

// The experiment started the instant the pool was flipped. Anchor everything to that.
//
// ⚠ created_at / updated_at are `timestamp WITHOUT time zone`. Reading one into JS and passing
//   it back as a parameter makes node-postgres reinterpret a naive timestamp across timezones —
//   it reported the flip as "343 minutes ago" when Postgres said 13. NEVER round-trip these
//   through JS. Compare column-to-column inside SQL, where both sides are the same naive type.
const FLIP_SQL = `(SELECT updated_at FROM system_config WHERE config_key = 'v1_price_variants')`;

const { rows: [cfg] } = await pool.query(
  `SELECT config_value,
          to_char(updated_at, 'YYYY-MM-DD HH24:MI')                AS flip_at,
          (EXTRACT(EPOCH FROM (now() - updated_at)) / 60)::int      AS mins_ago
   FROM system_config WHERE config_key = 'v1_price_variants'`,
);
// ── Work out which palm test is actually live, from the pool itself ──────────
const poolCfg = typeof cfg.config_value === 'string' ? JSON.parse(cfg.config_value) : cfg.config_value;
const palmLive = (poolCfg.variants ?? []).filter((v) => v.funnel === 'v1-palm' && Number(v.weight) > 0);
const control = palmLive.find((v) => v.id === CONTROL);
const testArm = palmLive.find((v) => v.id !== CONTROL);

if (!testArm) {
  console.log(`\n  ⚠️  No palm TEST arm has weight > 0 — only the control (${CONTROL}) is drawing.`);
  console.log(`      No experiment is running on v1-palm, so there is nothing to check.\n`);
  await pool.end();
  process.exit(0);
}

const SLIDING = testArm.id;                  // the arm under test, whatever it is
const WEIGHTS = { ctl: Number(control?.weight ?? 0), test: Number(testArm.weight) };
const EXPECT_SHARE = (WEIGHTS.test / (WEIGHTS.ctl + WEIGHTS.test)) * 100;
for (const v of palmLive) EXPECT[v.id] = { main: v.priceCents, grace: v.downsellCents };

console.log(`\n  live palm test: ${CONTROL} (w${WEIGHTS.ctl}) vs ${SLIDING} (w${WEIGHTS.test})` +
            `  → expect ~${EXPECT_SHARE.toFixed(0)}% on ${SLIDING}`);
if (EXPECT[SLIDING].main === EXPECT[CONTROL]?.main) {
  console.log(`  ⓘ  Both arms carry the SAME price ($${EXPECT[SLIDING].main / 100}) — this is a UI/copy test,`);
  console.log(`     not a price test. The price checks below still apply to both arms.`);
}

const { rows } = await pool.query(
  `SELECT price_variant,
          COUNT(*)::int                                              AS n,
          COUNT(*) FILTER (WHERE downsell_amount_cents IS NULL)::int AS null_grace,
          COUNT(DISTINCT price_amount_cents)::int                    AS distinct_main,
          COUNT(DISTINCT downsell_amount_cents)::int                 AS distinct_grace,
          MIN(price_amount_cents)                                    AS main_cents,
          MIN(downsell_amount_cents)                                 AS grace_cents,
          COUNT(*) FILTER (WHERE purchased)::int                     AS buyers,
          COALESCE(SUM(main_purchase_amount) FILTER (WHERE purchased), 0)::int AS revenue_cents
   FROM conversations
   WHERE created_at > ${FLIP_SQL}
     AND price_variant IN ($1, $2)
   GROUP BY 1 ORDER BY 1`,
  [CONTROL, SLIDING],
);

console.log(`\n  ══ PRICE-TEST CORRECTNESS CHECK ══`);
console.log(`  since the flip: ${cfg.flip_at} (${cfg.mins_ago} min ago)\n`);

const by = Object.fromEntries(rows.map((r) => [r.price_variant, r]));
const total = rows.reduce((s, r) => s + r.n, 0);

for (const [id, exp] of Object.entries(EXPECT)) {
  const r = by[id];
  if (!r) { console.log(`   ${id.padEnd(13)} no assignments in window`); continue; }
  console.log(
    `   ${id.padEnd(13)} n=${String(r.n).padEnd(5)} main=$${(r.main_cents ?? 0) / 100}  ` +
    `grace=${r.grace_cents === null ? 'NULL' : '$' + r.grace_cents / 100}  ` +
    `buyers=${r.buyers}  revenue=$${(r.revenue_cents / 100).toFixed(2)}`
  );
  if (r.null_grace > 0)              fail.push(`🔴 ${id}: ${r.null_grace} row(s) with NULL grace_cents — corrupted config, the grace CHARGE is broken. ROLL BACK.`);
  if (r.main_cents !== exp.main)     fail.push(`🔴 ${id}: main = ${r.main_cents}c, expected ${exp.main}c`);
  if (r.grace_cents !== exp.grace)   fail.push(`🔴 ${id}: grace = ${r.grace_cents}c, expected ${exp.grace}c`);
  if (r.distinct_main > 1)           fail.push(`🔴 ${id}: ${r.distinct_main} different main prices in one arm — the pool changed mid-test`);
  if (r.distinct_grace > 1)          fail.push(`🔴 ${id}: ${r.distinct_grace} different grace prices in one arm`);
}

// Root must never be assigned the sliding arm.
const { rows: [root] } = await pool.query(
  `SELECT COUNT(*)::int AS n FROM conversations
   WHERE created_at > ${FLIP_SQL} AND price_variant = '55-35'`,
);
if (root.n > 0) fail.push(`🔴 root '55-35' was assigned to ${root.n} visitor(s) — root is supposed to be OUT of the test (weight 0)`);

// The arm must actually be drawing. Zero draws after enough leads to rule out chance
// is a broken pool, not bad luck. The threshold scales with the configured weight:
// a 30%-weighted arm needs more leads than a 50% one before silence is damning.
// (p(zero) < 1e-6 ⇒ n > ln(1e-6) / ln(1 - share).)
const sliding = by[SLIDING]?.n ?? 0;
const share = EXPECT_SHARE / 100;
const silenceThreshold = Math.ceil(Math.log(1e-6) / Math.log(1 - share));
if (total >= silenceThreshold && sliding === 0) {
  fail.push(`🔴 ${total} palm leads and ZERO '${SLIDING}' assignments (expected ~${EXPECT_SHARE.toFixed(0)}%) — the arm is not drawing. Check the pool.`);
}

// ── Ratio: INFORMATIONAL ONLY. Never a failure. ──────────────────────────────
if (total > 0) {
  const observed = (sliding / total) * 100;
  const lo = Math.max(0, EXPECT_SHARE - 10), hi = Math.min(100, EXPECT_SHARE + 10);
  console.log(`\n   split: ${observed.toFixed(0)}% ${SLIDING} / ${(100 - observed).toFixed(0)}% control  (n=${total}, configured ${EXPECT_SHARE.toFixed(0)}%)`);
  if (total < 100) {
    console.log(`   ⓘ  n=${total} is TOO SMALL to judge the split. A healthy ${EXPECT_SHARE.toFixed(0)}% at this n can`);
    console.log(`      swing wildly by chance. Do NOT roll back on the ratio. Re-check at n≥100.`);
  } else if (observed < lo || observed > hi) {
    warn.push(`split is ${observed.toFixed(0)}% at n=${total} — outside ${lo.toFixed(0)}-${hi.toFixed(0)}%. Worth a look, but still not proof of a bug.`);
  } else {
    console.log(`   ✅ n≥100 and the split sits within ±10pts of the configured ${EXPECT_SHARE.toFixed(0)}%.`);
  }
}

console.log('');
for (const w of warn) console.log(`   ⚠️  ${w}`);
if (fail.length) {
  console.log(`\n   ROLLBACK: set '${SLIDING}' weight → 0 in system_config.v1_price_variants (60s cache).`);
  console.log(`   Restore the snapshot taken by the go-live script: improve-v1/ROLLBACK-config-before-*.json\n`);
  for (const f of fail) console.log(`   ${f}`);
  console.log('');
  process.exitCode = 1;
} else {
  console.log(`   ✅ CORRECTNESS: PASS — prices, grace, and scoping are all sound.`);
  if (testArm.signs?.length) {
    console.log(`   ⓘ  Still unverifiable from the DB: that every '${SLIDING}' visitor came from`);
    console.log(`      sign=${testArm.signs.join('/')}. No sign column — check the Railway logs`);
    console.log(`      for 'priceVariant: assigned'.\n`);
  } else {
    console.log(`   ⓘ  '${SLIDING}' is unscoped (no 'signs' key) — it is EXPECTED on every palm sign,`);
    console.log(`      so there is no sign-scoping invariant to verify for it.\n`);
  }
}
await pool.end();
