// ⚠️ DEPRECATED — reads the legacy `paywall_views` table, which is NO LONGER
// WRITTEN. The paywall test was folded into the unified experiment framework
// (server/lib/experiments.ts); exposures now land in `experiment_exposures`.
// Use the generic tally instead — it reconciles arm-for-arm with this script:
//   npx tsx server/scripts/tallyExperiment.ts paywall_copy_2026 <startISO> [personaId] [windowDays]
// This file is kept only to tally pre-migration `paywall_views` data and will be
// removed in Phase 5. (Original docs below.)
//
// Tally the Problem-4 paywall A/B test (read-only). See findings §3.13–3.15.
//   npx tsx server/scripts/tallyPaywall.ts <startISO> [personaId] [windowDays]
//   e.g. npx tsx server/scripts/tallyPaywall.ts 2026-06-30 7f03b55e-9a35-4bb7-ac80-a5dff7228910 7
//
// startISO   = the moment you flipped the experiment on (cohort start). REQUIRED.
// personaId  = scope (default Evelyn Cross — Phase 1).
// windowDays = attribution window after a user's FIRST in-test view (default 7).
//
// Method: cohort = each user's FIRST paywall_views row in-window; a user
// "converted" if they have a completed credit_purchases within windowDays of
// that first view. Sticky per user, first-view deduped — no double counting.

import 'dotenv/config';
import pg from 'pg';

const EVELYN = '7f03b55e-9a35-4bb7-ac80-a5dff7228910';
const EXPERIMENT = 'paywall_copy_2026';

const startISO = process.argv[2];
const personaId = process.argv[3] || EVELYN;
const windowDays = parseInt(process.argv[4] || '7', 10);

if (!startISO) {
  console.error('Usage: tsx server/scripts/tallyPaywall.ts <startISO> [personaId] [windowDays]');
  process.exit(1);
}

// Standard normal two-sided p-value (Abramowitz-Stegun erf approximation).
function twoSidedP(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return 2 * (1 - (0.5 * (1 + erf)));
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const sql = `
    WITH first_view AS (
      SELECT DISTINCT ON (user_id) user_id, variant, created_at AS first_view_at
      FROM paywall_views
      WHERE experiment_key = $1
        AND created_at >= $2
        AND ($3::varchar IS NULL OR persona_id = $3)
      ORDER BY user_id, created_at
    ),
    conv AS (
      SELECT fv.variant,
             EXISTS (
               SELECT 1 FROM credit_purchases cp
               WHERE cp.user_id = fv.user_id AND cp.status = 'completed'
                 AND cp.created_at >= fv.first_view_at
                 AND cp.created_at <  fv.first_view_at + ($4 || ' days')::interval
             ) AS converted,
             COALESCE((
               SELECT sum(cp.price_usd) FROM credit_purchases cp
               WHERE cp.user_id = fv.user_id AND cp.status = 'completed'
                 AND cp.created_at >= fv.first_view_at
                 AND cp.created_at <  fv.first_view_at + ($4 || ' days')::interval
             ), 0) AS revenue_cents
      FROM first_view fv
    )
    SELECT variant,
           count(*)                                   AS viewers,
           count(*) FILTER (WHERE converted)          AS buyers,
           round(100.0 * count(*) FILTER (WHERE converted) / NULLIF(count(*),0), 2) AS conversion_pct,
           round(sum(revenue_cents)/100.0, 2)         AS revenue_usd,
           round((sum(revenue_cents)/100.0) / NULLIF(count(*),0), 2) AS rev_per_viewer_usd,
           round((sum(revenue_cents)/100.0) / NULLIF(count(*) FILTER (WHERE converted),0), 2) AS arppu_usd
    FROM conv GROUP BY variant ORDER BY variant;
  `;
  const { rows } = await pool.query(sql, [EXPERIMENT, startISO, personaId, String(windowDays)]);
  await pool.end();

  console.log(`\nPaywall A/B — since ${startISO} · persona ${personaId} · ${windowDays}-day window\n`);
  console.table(rows);

  const A = rows.find((r) => r.variant === 'A');
  const B = rows.find((r) => r.variant === 'B');
  if (A && B) {
    const nA = +A.viewers, nB = +B.viewers, xA = +A.buyers, xB = +B.buyers;
    // Sample-ratio (SRM) sanity check
    const ratio = nB / (nA + nB);
    console.log(`Viewer split: A=${nA} B=${nB} (B share ${(ratio * 100).toFixed(1)}% — expect ≈ percentB)`);
    // Two-proportion z-test on conversion
    const pA = xA / nA, pB = xB / nB, p = (xA + xB) / (nA + nB);
    const se = Math.sqrt(p * (1 - p) * (1 / nA + 1 / nB));
    const z = se > 0 ? (pB - pA) / se : 0;
    const pv = twoSidedP(z);
    const lift = pA > 0 ? ((pB - pA) / pA) * 100 : 0;
    console.log(`Conversion: A=${(pA * 100).toFixed(2)}%  B=${(pB * 100).toFixed(2)}%  (B lift ${lift >= 0 ? '+' : ''}${lift.toFixed(1)}%)`);
    console.log(`Two-proportion z = ${z.toFixed(2)}, p ≈ ${pv.toFixed(4)} ${pv < 0.05 ? '→ SIGNIFICANT at 0.05' : '→ not yet significant'}`);
    console.log(`(Pre-register N before peeking. Target ≈ 1,500 viewers/arm.)`);
  } else {
    console.log('Need both arms with data to compute significance — is the experiment enabled yet?');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
