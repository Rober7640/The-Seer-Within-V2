// Correctness check for a LIVE V1 price split test. READ-ONLY.
//
// This checks the things that are BUGS AT ANY SAMPLE SIZE — not the split ratio.
// A 50/50 assignment ratio needs ~100+ leads per arm before it means anything
// (at n=20 a healthy 50/50 routinely looks like 30/70), so judging the ratio early
// is how you talk yourself into rolling back a working test. This script deliberately
// reports the ratio as INFORMATIONAL ONLY and never fails on it.
//
// What it DOES fail on (each is deterministic — one bad row is a real bug):
//   • a 55-35_palm row whose main != $55 or grace != $35, or a NULL grace
//     (NULL grace = corrupted config key ⇒ the $35 grace CHARGE is broken)
//   • any assignment on the root '55-35' arm (root is deliberately OUT of the test)
//   • the sliding arm drawing ZERO times after enough thumb leads to rule out chance
//   • a control row whose price drifted off $35/$25
//
// It CANNOT check `sign=thumb` — there is no sign column on conversations. That one
// check must come from the Railway prod logs (`priceVariant: assigned`).
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
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const SLIDING = '55-35_palm';
const CONTROL = '35_palm_u47';
const EXPECT = {
  [SLIDING]: { main: 5500, grace: 3500 },
  [CONTROL]: { main: 3500, grace: 2500 },
};

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
if (!cfg.config_value.includes(SLIDING)) {
  console.log(`\n  ⚠️  '${SLIDING}' is NOT in the live pool — the test is OFF (rolled back?). Nothing to check.\n`);
  await pool.end();
  process.exit(0);
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

// The arm must actually be drawing. Zero sliding after 40 thumb-eligible leads is ~1-in-a-trillion
// under a true 50/50 — that is a broken pool, not bad luck.
const sliding = by[SLIDING]?.n ?? 0;
if (total >= 40 && sliding === 0) fail.push(`🔴 ${total} palm leads and ZERO sliding assignments — the arm is not drawing. Check the pool.`);

// ── Ratio: INFORMATIONAL ONLY. Never a failure. ──────────────────────────────
if (total > 0) {
  const share = (sliding / total) * 100;
  console.log(`\n   split: ${share.toFixed(0)}% sliding / ${(100 - share).toFixed(0)}% control  (n=${total})`);
  if (total < 100) {
    console.log(`   ⓘ  n=${total} is TOO SMALL to judge the 50/50. A healthy 50/50 at this n can look`);
    console.log(`      like 30/70 purely by chance. Do NOT roll back on the ratio. Re-check at n≥100.`);
  } else if (share < 40 || share > 60) {
    warn.push(`split is ${share.toFixed(0)}% at n=${total} — outside 40-60%. Worth a look, but still not proof of a bug.`);
  } else {
    console.log(`   ✅ n≥100 and the split sits in 40-60% — consistent with a working 50/50.`);
  }
}

console.log('');
for (const w of warn) console.log(`   ⚠️  ${w}`);
if (fail.length) {
  console.log(`\n   ROLLBACK: set '55-35_palm' weight → 0 in system_config.v1_price_variants (60s cache).`);
  console.log(`   Previous config: improve-v1/ROLLBACK-config-before-golive.json\n`);
  for (const f of fail) console.log(`   ${f}`);
  console.log('');
  process.exitCode = 1;
} else {
  console.log(`   ✅ CORRECTNESS: PASS — prices, grace, and scoping are all sound.`);
  console.log(`   ⓘ  Still unverifiable from the DB: that every 55-35_palm visitor came from sign=thumb.`);
  console.log(`      There is no sign column — check the Railway logs for 'priceVariant: assigned'.\n`);
}
await pool.end();
