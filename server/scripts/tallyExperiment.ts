// Generic experiment tally (read-only) — the dashboard-bound `tally()` over the
// CLI. Generalizes tallyPaywall.ts to any credit_purchase experiment.
//   npx tsx server/scripts/tallyExperiment.ts <key> <startISO> [personaId] [windowDays]
//   e.g. npx tsx server/scripts/tallyExperiment.ts paywall_copy_2026 2026-06-30 \
//        7f03b55e-9a35-4bb7-ac80-a5dff7228910 7
//
// startISO   = when the test was flipped on (cohort start). REQUIRED.
// personaId  = scope filter on context->>'personaId' (default: none).
// windowDays = attribution window after each subject's first exposure (default 7).

import 'dotenv/config';
import { tally } from '../lib/experiments';
import { pool } from '../lib/db';

const key = process.argv[2];
const startISO = process.argv[3];
const personaId = process.argv[4] || null;
const windowArg = process.argv[5];
const windowDays = windowArg === undefined ? 7 : parseInt(windowArg, 10);

if (!key || !startISO) {
  console.error('Usage: tsx server/scripts/tallyExperiment.ts <key> <startISO> [personaId] [windowDays]');
  process.exit(1);
}
if (!Number.isFinite(windowDays) || windowDays <= 0) {
  console.error(`windowDays must be a positive integer (got "${windowArg}")`);
  process.exit(1);
}

async function main() {
  const res = await tally(key, { startISO, personaId, windowDays });

  console.log(
    `\nExperiment ${key} — since ${startISO}` +
      (personaId ? ` · persona ${personaId}` : '') +
      ` · ${windowDays}-day window\n`,
  );
  console.table(res.rows);

  if (res.srm && res.significance) {
    const { aViewers, bViewers, bSharePct } = res.srm;
    const { z, p, liftPct, significant } = res.significance;
    console.log(`Viewer split: A=${aViewers} B=${bViewers} (B share ${bSharePct.toFixed(1)}% — expect ≈ configured weight)`);
    console.log(`B lift ${liftPct >= 0 ? '+' : ''}${liftPct.toFixed(1)}%`);
    console.log(`Two-proportion z = ${z.toFixed(2)}, p ≈ ${p.toFixed(4)} ${significant ? '→ SIGNIFICANT at 0.05' : '→ not yet significant'}`);
    console.log(`(Pre-register N before peeking. Paywall target ≈ 1,500 viewers/arm.)`);
  } else {
    console.log('Need both A and B arms with viewers to compute significance — is the experiment running yet?');
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
