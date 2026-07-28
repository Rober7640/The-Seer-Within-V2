/**
 * Post-migration / post-deploy wallet integrity check.
 *
 *   npx tsx scripts/verify-wallet-rates.ts            # assert against defaults
 *   npx tsx scripts/verify-wallet-rates.ts --expect luna-voss=350,marcus-stone=425
 *
 * WHY THIS EXISTS (2026-07-27). Two failure modes conspire silently:
 *
 *  1. The seed script that shipped until 8947624 ran
 *     `UPDATE personas SET coins_per_minute = 60`  -- no WHERE clause
 *     so EVERY run wiped every admin-set rate back to 60. Under the dollar
 *     wallet a coin is a CENT, so a leftover 60 does not mean "legacy default",
 *     it means **$0.60/min** — an ~80% revenue cut — and, paired with an
 *     already-migrated free_coins of 897, a 14.9-minute free trial instead of 3:00.
 *
 *  2. scripts/migrate-coins-to-cents.ts short-circuits on
 *     system_config.wallet_unit='cents' ("Already migrated. No-op."), so once the
 *     flag is set the migration can NEVER repair a rate that drifts back to 60.
 *
 * Together: the damage is invisible and the obvious fix does nothing. Hence a
 * standalone assertion. Run it immediately after migrating AND after every deploy.
 * Exits non-zero on any failure so it can gate a release.
 */
import 'dotenv/config';
import { db } from '../server/lib/db';
import { sql } from 'drizzle-orm';
import {
  CENTS_PER_MINUTE_DEFAULT,
  FREE_TRIAL_MINUTES,
  minutesToCoins,
} from '../shared/types';

const LEGACY_RATE = 60; // the pre-dollar-wallet value; now means $0.60/min

/** --expect luna-voss=350,marcus-stone=425 */
function parseExpected(): Map<string, number> {
  const i = process.argv.indexOf('--expect');
  const m = new Map<string, number>();
  if (i === -1 || !process.argv[i + 1]) return m;
  for (const pair of process.argv[i + 1].split(',')) {
    const [slug, rate] = pair.split('=');
    if (slug && rate) m.set(slug.trim(), Number(rate));
  }
  return m;
}

async function main() {
  const expected = parseExpected();
  const problems: string[] = [];
  const warnings: string[] = [];

  // ── 1. the wallet must actually be migrated ────────────────────────────────
  const flag = await db.execute(
    sql`SELECT config_value FROM system_config WHERE config_key = 'wallet_unit' LIMIT 1`,
  );
  const unit = (flag.rows[0] as any)?.config_value;
  if (unit !== 'cents') {
    problems.push(
      `wallet_unit is ${unit ?? '(unset)'} — expected 'cents'. The migration has NOT run; ` +
      `app code reads balances as cents and will misprice every session.`,
    );
  }

  // ── 2. per-guide rates ─────────────────────────────────────────────────────
  const rows = (await db.execute(sql`
    SELECT slug, coins_per_minute, free_coins, is_active FROM personas ORDER BY slug
  `)).rows as any[];

  if (rows.length === 0) problems.push('no personas found — is this the right database?');

  console.log('guide                     $/min    free trial   status');
  for (const p of rows) {
    const slug = String(p.slug);
    const rate = Number(p.coins_per_minute);
    const free = Number(p.free_coins);
    const active = p.is_active;
    const freeMin = rate > 0 ? free / rate : 0;
    const notes: string[] = [];

    // 2a. the legacy sentinel — the single most damaging drift
    if (rate === LEGACY_RATE) {
      notes.push('LEGACY 60');
      if (active) {
        problems.push(
          `${slug}: coins_per_minute=60 → billing at $0.60/min (expected $${(CENTS_PER_MINUTE_DEFAULT / 100).toFixed(2)}). ` +
          `This is the unguarded-seed wipe. Re-running the migration will NOT fix it.`,
        );
      }
    }

    // 2b. an explicitly pinned rate must match exactly
    const want = expected.get(slug);
    if (want !== undefined && rate !== want) {
      notes.push(`want ${want}`);
      if (active) problems.push(`${slug}: coins_per_minute=${rate}, expected ${want}.`);
    }

    // 2c. implausible rates (guards typos like 2.99 stored as 3, or $/min vs ¢/min mixups)
    if (active && rate !== LEGACY_RATE && (rate < 50 || rate > 2000)) {
      problems.push(`${slug}: coins_per_minute=${rate} is outside the sane 50–2000¢/min range.`);
    }

    // 2d. free_coins must still buy the promised free trial at THIS guide's rate.
    //     The admin editor changes the rate but never rescales free_coins, so this
    //     drifts quietly every time someone reprices a guide.
    if (active && rate > 0) {
      const wantFree = minutesToCoins(FREE_TRIAL_MINUTES, rate);
      if (free !== wantFree) {
        notes.push(`free ${freeMin.toFixed(2)}min`);
        warnings.push(
          `${slug}: free_coins=${free} gives ${freeMin.toFixed(2)} min at ${rate}¢/min; ` +
          `${wantFree} would give exactly ${FREE_TRIAL_MINUTES}:00.`,
        );
      }
    }

    const mm = Math.floor(freeMin);
    const ss = Math.round((freeMin - mm) * 60);
    console.log(
      slug.padEnd(25),
      ('$' + (rate / 100).toFixed(2)).padEnd(8),
      `${mm}:${String(ss).padStart(2, '0')}`.padEnd(12),
      (active ? '' : '(inactive) ') + notes.join(', '),
    );
  }

  // ── 3. balances should look like cents, not legacy seconds ─────────────────
  const bal = (await db.execute(sql`
    SELECT COUNT(*)::int n FROM users WHERE coin_balance > 0
  `)).rows[0] as any;
  console.log(`\nusers with a balance: ${bal.n}`);

  // ── report ─────────────────────────────────────────────────────────────────
  if (warnings.length) {
    console.log('\n⚠️  WARNINGS (free-trial drift — not revenue-affecting):');
    warnings.forEach(w => console.log('   - ' + w));
  }
  if (problems.length) {
    console.log('\n❌ FAILED:');
    problems.forEach(p => console.log('   - ' + p));
    console.log('\nDo NOT ship in this state.');
    process.exit(1);
  }
  console.log('\n✅ wallet integrity OK');
  process.exit(0);
}

main().catch(e => {
  console.error('verify-wallet-rates crashed:', e?.message ?? e);
  process.exit(1);
});
