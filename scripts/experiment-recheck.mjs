// Re-measure any v1_main_funnel experiment under the CORRECTED buyer definition,
// with significance on BOTH conversion rate and revenue per visitor.
//
//   DATABASE_URL="postgresql://..." node scripts/experiment-recheck.mjs <experiment_key>
//
// READ-ONLY. Exists because /admin/experiments reports conversion significance only,
// while revenue per visitor is the metric these tests are actually judged on — and a
// concluded test needs re-checking against the corrected definition (a buyer is
// someone who PAID at or after their exposure; see V1_IN_TEST_PURCHASE in
// server/lib/experiments.ts).
//
// ⚠ Run the backfill for the cohort FIRST or both arms are under-counted:
//   node scripts/backfill-main-paid-at.mjs --cohort-only --key=<key> --apply
import pg from 'pg';

const KEY = process.argv[2];
if (!KEY) { console.error('usage: node scripts/experiment-recheck.mjs <experiment_key>'); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error('No DATABASE_URL.'); process.exit(1); }

const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
await c.query('BEGIN TRANSACTION READ ONLY');

const { rows: [x] } = await c.query(
  'SELECT status, winner_variant, started_at FROM experiments WHERE key=$1', [KEY]);
if (!x) { console.error(`No experiment "${KEY}".`); process.exit(1); }

const { rows } = await c.query(`
  SELECT variant,
         count(*)::int                          AS viewers,
         count(*) FILTER (WHERE paid)::int      AS buyers,
         COALESCE(sum(rev),0)::float            AS total_rev,
         COALESCE(sum(rev::float*rev),0)::float AS sumsq
  FROM (
    SELECT e.variant AS variant,
           (c.main_paid_at IS NOT NULL AND c.main_paid_at >= e.created_at) AS paid,
           CASE WHEN c.main_paid_at IS NOT NULL AND c.main_paid_at >= e.created_at
                THEN COALESCE(c.main_purchase_amount,0) + COALESCE(c.bump_amount_cents,0)
                ELSE 0 END AS rev
      FROM experiment_exposures e
      LEFT JOIN conversations c ON c.id = e.context->>'conversationId'
     WHERE e.experiment_key = $1 AND e.created_at >= $2
  ) s GROUP BY variant ORDER BY variant`, [KEY, x.started_at]);

// Two-sided normal p (Abramowitz-Stegun), mirroring twoSidedP in experiments.ts.
const P = (z) => {
  const a = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * a);
  const erf = 1 - ((((1.061405429*t - 1.453152027)*t + 1.421413741)*t - 0.284496736)*t + 0.254829592)
    * t * Math.exp(-1 * a * a);
  return 2 * (1 - 0.5 * (1 + erf));
};

console.log(`${KEY} — status=${x.status}, declared winner=${x.winner_variant ?? '(none)'}`);
console.log(`cohort anchored at ${new Date(x.started_at).toISOString()}\n`);
console.log('arm  visitors  buyers      CR      revenue    $/visitor');
for (const r of rows) {
  console.log(`${r.variant}    ${String(r.viewers).padStart(7)} ${String(r.buyers).padStart(7)}` +
    ` ${(100*r.buyers/r.viewers).toFixed(2).padStart(7)}% $${(r.total_rev/100).toFixed(2).padStart(9)}` +
    ` $${(r.total_rev/r.viewers/100).toFixed(4).padStart(8)}`);
}

const A = rows.find((r) => r.variant === 'A'), B = rows.find((r) => r.variant === 'B');
if (A && B) {
  const p1 = A.buyers/A.viewers, p2 = B.buyers/B.viewers;
  const pp = (A.buyers + B.buyers) / (A.viewers + B.viewers);
  const se = Math.sqrt(pp*(1-pp)*(1/A.viewers + 1/B.viewers));
  const z = (p2 - p1) / se;
  console.log(`\nCONVERSION   B ${(100*p2).toFixed(2)}% vs A ${(100*p1).toFixed(2)}%` +
    `   rel ${(((p2/p1)-1)*100).toFixed(1)}%   z=${z.toFixed(2)}  p=${P(z).toFixed(3)}` +
    `  ${P(z) < 0.05 ? 'SIGNIFICANT' : 'not significant'}`);

  // Welch on per-visitor revenue — the metric these tests are judged on. Revenue is
  // heavily zero-inflated, so this is approximate, but it is the honest denominator.
  const stat = (r) => {
    const n = r.viewers, m = r.total_rev / n;
    return { n, m, v: Math.max(0, (r.sumsq - n*m*m) / (n - 1)) };
  };
  const a = stat(A), b = stat(B);
  const seR = Math.sqrt(a.v/a.n + b.v/b.n);
  const zR = (b.m - a.m) / seR;
  console.log(`REV/VISITOR  B $${(b.m/100).toFixed(4)} vs A $${(a.m/100).toFixed(4)}` +
    `   rel ${(((b.m/a.m)-1)*100).toFixed(1)}%   t=${zR.toFixed(2)}  p=${P(zR).toFixed(3)}` +
    `  ${P(zR) < 0.05 ? 'SIGNIFICANT' : 'not significant'}`);
  console.log(`             95% CI on the difference: ` +
    `$${(((b.m-a.m) - 1.96*seR)/100).toFixed(4)} to $${(((b.m-a.m) + 1.96*seR)/100).toFixed(4)} per visitor`);
}
await c.query('ROLLBACK');
await c.end();
