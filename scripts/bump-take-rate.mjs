// Order-bump take rate for v1_order_bump_2026 — the number Joel asked for.
//
// READ-ONLY (read-only txn + write canary that hard-exits if writes are accepted).
//
// Scoped to the EXPERIMENT COHORT: every figure joins through experiment_exposures,
// so V1_BUMP_QA_EMAILS testers and any dev walk (enrolled:false ⇒ no exposure row)
// are excluded. Counted separately at the end so we can see they're being excluded.
//
// 🔑 TWO take rates, deliberately. bump_offered/bump_purchased are written when the
// Stripe SESSION is created (routes.ts:862), BEFORE payment. The confirmed-payment
// signal is `purchased AND upsell_offered` (purchased alone is optimistic).
//   - "said yes"   = clicked [Yes, double it]      → intent
//   - "paid w/bump"= clicked yes AND payment cleared → money
// Only the second one is revenue.
import pg from 'pg';
import fs from 'node:fs';

const KEY = 'v1_order_bump_2026';
// env var first, then an ACTIVE (uncommented) .env line. Commented-out lines are
// deliberately ignored — silently reviving one is how you end up pointed at a
// database you didn't mean to read.
const fromEnv = process.env.DATABASE_URL;
const m = fromEnv
  ? null
  : [...fs.readFileSync('.env', 'utf8').matchAll(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/gm)].pop();
const conn = fromEnv ?? m?.[1]?.trim().replace(/^["']|["']$/g, '');
if (!conn) {
  console.error(
    'No DATABASE_URL.\n' +
    '  .env has it commented out, so pass it explicitly for this one command:\n' +
    '    DATABASE_URL="postgresql://..." node scripts/bump-take-rate.mjs\n' +
    '  (read-only — the canary below aborts if the connection can write)');
  process.exit(1);
}
const c = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await c.connect();

// ── Canary: prove the connection cannot write before reading anything. ──
await c.query('BEGIN TRANSACTION READ ONLY');
let canary = 'NOT RUN';
try { await c.query('UPDATE conversations SET id=id WHERE false'); canary = 'WRITE ACCEPTED'; }
catch (e) { canary = e.code === '25006' ? 'rejected (25006) ✔' : 'unexpected ' + e.code; }
finally { await c.query('ROLLBACK'); }
console.log('Canary:', canary);
if (!canary.startsWith('rejected')) process.exit(1);

await c.query('BEGIN TRANSACTION READ ONLY');

const usd = (cents) => '$' + (cents / 100).toFixed(2);
const pct = (n, d) => (d ? (100 * n / d).toFixed(1) + '%' : '—');

// ── The experiment + its cohort anchor. ──
const { rows: [exp] } = await c.query(
  `SELECT status, started_at, to_char(started_at,'YYYY-MM-DD HH24:MI') AS started_fmt,
          (EXTRACT(EPOCH FROM (now()-started_at))/3600)::int AS hours_live
     FROM experiments WHERE key = $1`, [KEY]);
if (!exp) { console.log(`No experiment row for ${KEY}.`); process.exit(1); }

// started_at is the anchor; fall back to first exposure if it was never stamped.
const { rows: [anch] } = await c.query(
  `SELECT COALESCE($2::timestamp, MIN(created_at)) AS start_at
     FROM experiment_exposures WHERE experiment_key = $1`, [KEY, exp.started_at]);
const START = anch.start_at;

console.log(`\n${KEY} — status=${exp.status}, started ${exp.started_fmt} UTC (${exp.hours_live}h live)`);

// ── 1. HEADLINE A/B — identical to tallyV1Main (experiments.ts:810). ──
const { rows: arms } = await c.query(`
  SELECT e.variant,
         count(*)::int                                                       AS viewers,
         count(*) FILTER (WHERE c.purchased AND c.upsell_offered)::int       AS buyers,
         COALESCE(sum(c.main_purchase_amount + COALESCE(c.bump_amount_cents,0))
                  FILTER (WHERE c.purchased AND c.upsell_offered), 0)::int   AS revenue_cents
    FROM experiment_exposures e
    LEFT JOIN conversations c ON c.id = e.context->>'conversationId'
   WHERE e.experiment_key = $1 AND e.created_at >= $2
   GROUP BY e.variant ORDER BY e.variant`, [KEY, START]);

console.log('\n── HEADLINE A/B (the number that decides the test) ──');
console.log('arm  visitors  buyers   CR      revenue     $/visitor');
for (const r of arms) {
  console.log(
    `${r.variant.padEnd(4)} ${String(r.viewers).padStart(8)} ${String(r.buyers).padStart(7)}` +
    ` ${pct(r.buyers, r.viewers).padStart(7)} ${usd(r.revenue_cents).padStart(11)}` +
    ` ${usd(r.viewers ? r.revenue_cents / r.viewers : 0).padStart(11)}`);
}
const A = arms.find(r => r.variant === 'A'), B = arms.find(r => r.variant === 'B');
if (A?.viewers && B?.viewers) {
  const rpvA = A.revenue_cents / A.viewers, rpvB = B.revenue_cents / B.viewers;
  console.log(`\n  B vs A on $/visitor: ${rpvA ? ((rpvB / rpvA - 1) * 100).toFixed(1) + '%' : '—'}` +
              `   (${usd(rpvB)} vs ${usd(rpvA)})`);
  const smaller = Math.min(A.viewers, B.viewers);
  console.log(`  progress to the pre-registered 1200/arm: ${smaller}/1200 (${pct(smaller, 1200)})` +
              `${smaller < 1200 ? '  ⓘ too early to call a winner' : '  ✔ target reached'}`);
}

// ── 2. TAKE RATE — arm B only, split by funnel. ──
const { rows: tr } = await c.query(`
  SELECT COALESCE(e.context->>'funnel','(unrecorded)')                        AS funnel,
         count(*) FILTER (WHERE c.bump_offered)::int                          AS offered,
         count(*) FILTER (WHERE c.bump_purchased)::int                        AS said_yes,
         count(*) FILTER (WHERE c.bump_offered AND c.purchased
                                AND c.upsell_offered)::int                    AS offered_paid,
         count(*) FILTER (WHERE c.bump_purchased AND c.purchased
                                AND c.upsell_offered)::int                    AS paid_with_bump,
         COALESCE(sum(c.bump_amount_cents) FILTER (WHERE c.bump_purchased
                  AND c.purchased AND c.upsell_offered), 0)::int              AS bump_revenue_cents
    FROM experiment_exposures e
    JOIN conversations c ON c.id = e.context->>'conversationId'
   WHERE e.experiment_key = $1 AND e.created_at >= $2 AND e.variant = 'B'
   GROUP BY 1 ORDER BY 1`, [KEY, START]);

const sum = (f) => tr.reduce((s, r) => s + r[f], 0);
console.log('\n── TAKE RATE (arm B — the number Joel asked for) ──');
console.log('funnel        offered  said yes  intent%   paid+bump  of paid  bump revenue');
for (const r of [...tr, {
  funnel: 'TOTAL', offered: sum('offered'), said_yes: sum('said_yes'),
  offered_paid: sum('offered_paid'), paid_with_bump: sum('paid_with_bump'),
  bump_revenue_cents: sum('bump_revenue_cents'),
}]) {
  console.log(
    `${r.funnel.padEnd(13)} ${String(r.offered).padStart(7)} ${String(r.said_yes).padStart(9)}` +
    ` ${pct(r.said_yes, r.offered).padStart(8)} ${String(r.paid_with_bump).padStart(10)}` +
    ` ${pct(r.paid_with_bump, r.offered_paid).padStart(8)} ${usd(r.bump_revenue_cents).padStart(13)}`);
}
console.log('\n  intent%  = clicked [Yes, double it] ÷ everyone who reached checkout having seen the offer');
console.log('  of paid  = paid WITH the bump ÷ all confirmed buyers who were offered it');
console.log('  ⚠ "offered" is only written once she reaches checkout, so anyone who saw the');
console.log('    offer and left the page entirely is NOT in the denominator — take rate reads');
console.log('    slightly high. Those visitors ARE in the headline A/B above.');

// ── 3. Rows carrying a bump but OUTSIDE the cohort (QA testers / dev walks). ──
const { rows: [off] } = await c.query(`
  SELECT count(*)::int AS rows,
         count(*) FILTER (WHERE bump_purchased)::int AS said_yes,
         COALESCE(sum(bump_amount_cents) FILTER (WHERE bump_purchased
                  AND purchased AND upsell_offered), 0)::int AS revenue_cents
    FROM conversations c
   WHERE c.bump_offered = true
     AND NOT EXISTS (SELECT 1 FROM experiment_exposures e
                      WHERE e.experiment_key = $1
                        AND e.context->>'conversationId' = c.id)`, [KEY]);
console.log(`\n── excluded from everything above ──`);
console.log(`  ${off.rows} bump row(s) outside the cohort (QA testers / dev walks),` +
            ` ${off.said_yes} said yes, ${usd(off.revenue_cents)} — correctly NOT in the test.`);

await c.query('ROLLBACK');
await c.end();
