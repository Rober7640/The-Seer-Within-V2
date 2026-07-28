#!/usr/bin/env node
/**
 * palm-gate-by-sign — the commitment-gate A/B, BROKEN DOWN BY fb-palm SIGN.
 *
 *   node scripts/palm-gate-by-sign.mjs
 *   node scripts/palm-gate-by-sign.mjs --min 40     # hide signs with < 40 exposures
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 * /admin/experiments shows ONE pooled A vs B for the whole test, because
 * tallyV1Main groups by `e.variant` alone. That pooled read is the CORRECT one to
 * decide the test on — assignment is sha256(email+key), independent of sign, so
 * both arms carry the same mix of signs and the comparison is apples-to-apples.
 * Pooling only costs precision, not correctness, and it is the only way the test
 * ever reaches significance (thumb-angle alone is ~4% of palm volume).
 *
 * This script is the DIAGNOSTIC view underneath it: same numbers, split by the
 * sign recorded on each exposure. Use it to answer "did the gate behave
 * differently on hand-size than on thumb?" — never to pick a winner from the
 * best-looking sign. Per-sign arms are small; see the warning printed at the end.
 *
 * It reads the same two sources as the dashboard, with the same definition of a
 * buyer (purchased AND upsell_offered — `purchased` alone is set optimistically
 * at checkout), so the per-sign rows always sum to what /admin/experiments shows.
 *
 * STRICTLY READ-ONLY — SELECT only. Safe against production.
 */
import 'dotenv/config';
import pg from 'pg';

const KEY = 'v1_palm_commitment_gate_2026';
const CONTROL = 'A';
const TREATMENT = 'B';

const argv = process.argv.slice(2);
let MIN = 0;
for (let i = 0; i < argv.length; i++) if (argv[i] === '--min') MIN = Number(argv[++i]) || 0;

const raw = process.env.DATABASE_URL;
if (!raw) { console.error('No DATABASE_URL'); process.exit(2); }
const url = raw.replace(':6543/', ':5432/'); // session pooler — :6543 serves an empty search_path
const isLocal = /@(localhost|127\.0\.0\.1)\b/.test(url);
const pool = new pg.Pool({ connectionString: url, ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }) });

if ((await pool.query('SELECT 25006 AS k')).rows[0].k !== 25006) { console.error('canary failed'); process.exit(2); }

const { rows: [exp] } = await pool.query(
  `SELECT status, to_char(started_at,'YYYY-MM-DD HH24:MI') AS started, conversion
     FROM experiments WHERE key = $1`, [KEY]);
if (!exp) { console.error(`no experiment '${KEY}' — has migrateExperiments been run?`); process.exit(2); }
if (!exp.started) {
  console.log(`\n  '${KEY}' is ${exp.status} and has never been started — no exposures yet.\n`);
  await pool.end(); process.exit(0);
}
const targetN = Number(exp.conversion?.targetN ?? 0);

// Same join + same buyer definition as tallyV1Main, with sign added.
const { rows } = await pool.query(`
  SELECT COALESCE(e.context->>'sign', '(unrecorded)')                       AS sign,
         e.variant                                                          AS variant,
         count(*)::int                                                      AS viewers,
         count(*) FILTER (WHERE c.purchased AND c.upsell_offered)::int      AS buyers,
         COALESCE(sum(c.main_purchase_amount)
                  FILTER (WHERE c.purchased AND c.upsell_offered), 0)::int  AS revenue_cents
    FROM experiment_exposures e
    LEFT JOIN conversations c ON c.id = e.context->>'conversationId'
   WHERE e.experiment_key = $1
   GROUP BY 1, 2`, [KEY]);

const bySign = new Map();
for (const r of rows) {
  if (!bySign.has(r.sign)) bySign.set(r.sign, {});
  bySign.get(r.sign)[r.variant] = r;
}

const pct = (n, d) => (d ? (n / d) * 100 : 0);
const $ = (c) => `$${(c / 100).toFixed(2)}`;
const z = (a, b) => {
  // Two-proportion z on conversion rate. Same statistic the dashboard reports.
  const [na, nb] = [a.viewers, b.viewers];
  if (!na || !nb) return null;
  const [pa, pb] = [a.buyers / na, b.buyers / nb];
  const p = (a.buyers + b.buyers) / (na + nb);
  const se = Math.sqrt(p * (1 - p) * (1 / na + 1 / nb));
  return se > 0 ? (pb - pa) / se : null;
};

console.log(`\n  ${KEY}  ·  status=${exp.status}  ·  started ${exp.started}`);
console.log(`  A = control (plain button)   B = commitment gate\n`);
console.log(`  ${'sign'.padEnd(20)} ${'arm'.padEnd(4)} ${'viewers'.padStart(8)} ${'buyers'.padStart(7)} ${'CR'.padStart(7)} ${'revenue'.padStart(10)} ${'rev/viewer'.padStart(11)}`);
console.log(`  ${'-'.repeat(72)}`);

const totals = { A: { viewers: 0, buyers: 0, revenue_cents: 0 }, B: { viewers: 0, buyers: 0, revenue_cents: 0 } };
const hidden = [];

for (const [sign, arms] of [...bySign.entries()].sort()) {
  const a = arms[CONTROL] ?? { viewers: 0, buyers: 0, revenue_cents: 0 };
  const b = arms[TREATMENT] ?? { viewers: 0, buyers: 0, revenue_cents: 0 };
  for (const k of ['viewers', 'buyers', 'revenue_cents']) { totals.A[k] += a[k]; totals.B[k] += b[k]; }

  if (a.viewers + b.viewers < MIN) { hidden.push(sign); continue; }

  for (const [name, r] of [[CONTROL, a], [TREATMENT, b]]) {
    console.log(
      `  ${(name === CONTROL ? sign : '').padEnd(20)} ${name.padEnd(4)} ` +
      `${String(r.viewers).padStart(8)} ${String(r.buyers).padStart(7)} ` +
      `${pct(r.buyers, r.viewers).toFixed(2).padStart(6)}% ${$(r.revenue_cents).padStart(10)} ` +
      `${$(r.viewers ? r.revenue_cents / r.viewers : 0).padStart(11)}`,
    );
  }
  const zs = z(a, b);
  const lift = a.viewers && b.viewers && a.buyers ? pct(b.buyers, b.viewers) / pct(a.buyers, a.viewers) * 100 - 100 : null;
  console.log(`  ${''.padEnd(20)} ${'→'.padEnd(4)} gate lift ${lift === null ? '—' : `${lift >= 0 ? '+' : ''}${lift.toFixed(1)}%`}` +
              `${zs === null ? '' : `   z=${zs.toFixed(2)}`}   (per-sign — diagnostic only)\n`);
}

console.log(`  ${'-'.repeat(72)}`);
for (const [name, t] of [[CONTROL, totals.A], [TREATMENT, totals.B]]) {
  console.log(
    `  ${(name === CONTROL ? 'ALL SIGNS (pooled)' : '').padEnd(20)} ${name.padEnd(4)} ` +
    `${String(t.viewers).padStart(8)} ${String(t.buyers).padStart(7)} ` +
    `${pct(t.buyers, t.viewers).toFixed(2).padStart(6)}% ${$(t.revenue_cents).padStart(10)} ` +
    `${$(t.viewers ? t.revenue_cents / t.viewers : 0).padStart(11)}`,
  );
}
const zAll = z(totals.A, totals.B);
const liftAll = totals.A.buyers ? pct(totals.B.buyers, totals.B.viewers) / pct(totals.A.buyers, totals.A.viewers) * 100 - 100 : null;
console.log(`  ${''.padEnd(20)} ${'→'.padEnd(4)} gate lift ${liftAll === null ? '—' : `${liftAll >= 0 ? '+' : ''}${liftAll.toFixed(1)}%`}` +
            `${zAll === null ? '' : `   z=${zAll.toFixed(2)}`}   ⟵ THIS is the decision number`);

if (hidden.length) console.log(`\n  (hidden, under --min ${MIN}: ${hidden.join(', ')})`);

if (targetN) {
  const minArm = Math.min(totals.A.viewers, totals.B.viewers);
  console.log(`\n  pre-registered targetN: ${minArm}/${targetN} on the smaller arm` +
              `${minArm >= targetN ? '  ✅ reached — the verdict is unlocked' : '  ⏳ NOT reached — do not call the test yet'}`);
}

console.log(`\n  ⚠ Per-sign rows are a DIAGNOSTIC, not a decision tool. With ~10 signs, the`);
console.log(`    best-looking one will show a large "lift" by chance alone — that is the`);
console.log(`    multiple-comparisons trap. Decide the test on the pooled row only.\n`);

await pool.end();
