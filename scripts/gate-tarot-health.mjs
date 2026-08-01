// Post-go-live health check for the commitment gate after it was extended to
// /fb-tarot (2026-07-31). READ-ONLY — no writes, safe to run against production.
//
//   node scripts/gate-tarot-health.mjs
//
// Answers the three things that can only be confirmed on real traffic:
//   1. Is tarot enrolling at all, and near the 30% target?
//   2. Is every tarot exposure attributed to one of the four landers? The number
//      that matters is `unattributed` — a tarot row with no facing means the
//      visitor reached /fb-tarot/chat without passing through the bridge, so
//      tarotEventProps() had nothing in sessionStorage. Near zero = attribution
//      is working end to end. Exposures are unique(key, subject_id) and written
//      once, so a row that lands here can never be attributed later.
//   3. Is palm still enrolling exactly as before?
import 'dotenv/config';
import pg from 'pg';

const KEY = 'v1_palm_commitment_gate_2026';
const raw = process.env.DATABASE_URL;
if (!raw) { console.error('No DATABASE_URL'); process.exit(2); }

// 🔴 Never the transaction pooler (:6543) — it hands out an empty search_path and
// unqualified table names fail with 42P01. See the 2026-07-10 prod outage.
const url = new URL(raw);
url.port = '5432';
const pool = new pg.Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });

const { rows: [exp] } = await pool.query(
  `SELECT status, scope::text AS scope, started_at FROM experiments WHERE key = $1`, [KEY]);
if (!exp) { console.error(`experiment ${KEY} not found`); process.exit(2); }
console.log(`\n  ${KEY}  ·  status=${exp.status}`);
console.log(`  scope: ${exp.scope}`);
console.log(`  cohort start: ${exp.started_at?.toISOString()}\n`);

const { rows } = await pool.query(`
  SELECT COALESCE(context->>'funnel', '(pre-funnel-capture)')        AS funnel,
         CASE WHEN context->>'facing' IS NOT NULL
              THEN (CASE context->>'facing' WHEN 'up' THEN 'Face Up' ELSE 'Face Down' END)
                   || ' - ' || COALESCE(context->>'angle', '?')
              ELSE COALESCE(context->>'sign', '(unattributed)') END  AS lander,
         variant,
         count(*)::int                                               AS exposures,
         max(created_at)                                             AS latest
    FROM experiment_exposures
   WHERE experiment_key = $1
   GROUP BY 1, 2, 3
   ORDER BY 1, 2, 3`, [KEY]);

const pad = (s, n) => String(s).padEnd(n);
console.log(`  ${pad('funnel', 22)} ${pad('lander', 26)} ${pad('arm', 4)} ${'n'.padStart(6)}   latest`);
console.log(`  ${'-'.repeat(78)}`);
for (const r of rows) {
  console.log(`  ${pad(r.funnel, 22)} ${pad(r.lander, 26)} ${pad(r.variant, 4)} ${String(r.exposures).padStart(6)}   ${r.latest?.toISOString().slice(0, 16).replace('T', ' ')}`);
}

const tot = (pred) => rows.filter(pred).reduce((s, r) => s + r.exposures, 0);
const tarotAll = tot((r) => r.funnel === 'v1-tarot');
const tarotUnattributed = tot((r) => r.funnel === 'v1-tarot' && r.lander === '(unattributed)');
const tarotB = tot((r) => r.funnel === 'v1-tarot' && r.variant === 'B');
const palmAll = tot((r) => r.funnel !== 'v1-tarot');
const palmB = tot((r) => r.funnel !== 'v1-tarot' && r.variant === 'B');
const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '—');

console.log(`\n  TAROT  ${tarotAll} exposures · B share ${pct(tarotB, tarotAll)} (target 30%)`);
console.log(`  PALM   ${palmAll} exposures · B share ${pct(palmB, palmAll)} (target 30%)`);
console.log(`  targetN 1200 on arm B: ${tarotB + palmB}/1200`);

if (tarotAll === 0) {
  console.log(`\n  ⏳ No tarot exposures yet. Expected until a tarot visitor captures an email.`);
} else if (tarotUnattributed === 0) {
  console.log(`\n  ✅ Every tarot exposure is attributed to a lander.`);
} else {
  console.log(`\n  🔴 ${tarotUnattributed}/${tarotAll} tarot exposures (${pct(tarotUnattributed, tarotAll)}) have NO lander.`);
  console.log(`     Those visitors reached /fb-tarot/chat without the bridge setting attribution.`);
  console.log(`     Cannot be backfilled — exposures are written once per subject.`);
}
await pool.end();
