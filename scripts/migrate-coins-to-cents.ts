// One-time data migration: coin(=second) wallet → cent (dollar) wallet.
//
//   Dry run (counts only, no writes):   npx tsx scripts/migrate-coins-to-cents.ts
//   Apply:                              npx tsx scripts/migrate-coins-to-cents.ts --apply
//
// WHY: as of 2026-07-23 a "coin" is a CENT (dollar wallet), and personas.coins_per_minute
// is cents/min ($/min × 100). Existing rows were written in the OLD unit where a coin was
// a SECOND at 60/min. This converts them so nobody's TIME changes (decision D2 = preserve
// minutes): a wallet holding N coins (= N/60 minutes) becomes ROUND(N × 299 / 60) cents,
// which is the same N/60 minutes at the new $2.99/min default rate.
//
// Idempotent: guarded by system_config('wallet_unit'). Running twice is a safe no-op.
//
// DEPLOY ORDER (learned 2026-07-14): run this migration BEFORE the new code is serving
// traffic, and confirm the running instance picked it up before enabling any non-default
// rate. For PROD, the equivalent raw SQL is printed at the end of a dry run — hand that to
// whoever runs prod migrations rather than running this script against prod.

import 'dotenv/config';
import { db } from '../server/lib/db';
import { sql } from 'drizzle-orm';
import { CENTS_PER_MINUTE_DEFAULT } from '../shared/types';

const APPLY = process.argv.includes('--apply');
const R = CENTS_PER_MINUTE_DEFAULT; // 299 — the default cents/min rate
const WALLET_FLAG = 'wallet_unit';

// preserve-minutes conversion factor: old_coins (seconds @ 60/min) → cents @ R/min
const factor = (col: string) => sql.raw(`ROUND(${col}::numeric * ${R} / 60)`);

async function alreadyMigrated(): Promise<boolean> {
  const rows = await db.execute(
    sql`SELECT config_value FROM system_config WHERE config_key = ${WALLET_FLAG} LIMIT 1`,
  );
  return (rows.rows[0] as any)?.config_value === 'cents';
}

async function counts() {
  const users = await db.execute(sql`SELECT COUNT(*)::int n, COALESCE(SUM(coin_balance),0)::bigint total FROM users WHERE coin_balance > 0`);
  const personas = await db.execute(sql`SELECT COUNT(*)::int n FROM personas WHERE coins_per_minute = 60`);
  const promos = await db.execute(sql`SELECT COUNT(*)::int n, COALESCE(SUM(coins_remaining),0)::bigint total FROM promo_grants WHERE coins_remaining > 0`);
  return {
    users: users.rows[0] as any,
    personas: personas.rows[0] as any,
    promos: promos.rows[0] as any,
  };
}

function printProdSql() {
  console.log(`
-- ─── PROD SQL (run inside one transaction) ─────────────────────────────────
BEGIN;
-- 1. Wallets: preserve minutes (N coins → N/60 min → same minutes at ${R}¢/min)
UPDATE users SET
  coin_balance    = ROUND(coin_balance::numeric    * ${R} / 60),
  total_coins_used = ROUND(total_coins_used::numeric * ${R} / 60);
-- 2. Personas: legacy 60 coins/min → ${R}¢/min ($2.99); free grant preserves minutes
UPDATE personas SET
  free_coins       = ROUND(free_coins::numeric * ${R} / 60),
  coins_per_minute = ${R}
WHERE coins_per_minute = 60;
-- 3. Promo grants: preserve promo minutes
UPDATE promo_grants SET
  coins_granted   = ROUND(coins_granted::numeric   * ${R} / 60),
  coins_remaining = ROUND(coins_remaining::numeric * ${R} / 60),
  coins_spent     = ROUND(coins_spent::numeric     * ${R} / 60);
-- 4. Mark migrated so app + this script never double-convert
INSERT INTO system_config (config_key, config_value, config_type)
  VALUES ('${WALLET_FLAG}', 'cents', 'text')
  ON CONFLICT (config_key) DO UPDATE SET config_value = 'cents';
COMMIT;
-- ───────────────────────────────────────────────────────────────────────────
`);
}

async function main() {
  if (await alreadyMigrated()) {
    console.log('✅ Already migrated (system_config.wallet_unit = cents). No-op.');
    return;
  }

  const before = await counts();
  console.log('Rows to convert (preserve minutes, factor ×' + R + '/60):');
  console.log(`  users with balance:  ${before.users.n} (sum ${before.users.total}¢ before)`);
  console.log(`  personas @ 60/min:   ${before.personas.n} → ${R}/min`);
  console.log(`  promo grants active: ${before.promos.n} (sum ${before.promos.total} before)`);

  if (!APPLY) {
    console.log('\n(dry run — nothing written. Re-run with --apply to migrate this DB.)');
    printProdSql();
    return;
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`UPDATE users SET coin_balance = ${factor('coin_balance')}, total_coins_used = ${factor('total_coins_used')}`);
    await tx.execute(sql`UPDATE personas SET free_coins = ${factor('free_coins')}, coins_per_minute = ${R} WHERE coins_per_minute = 60`);
    await tx.execute(sql`UPDATE promo_grants SET coins_granted = ${factor('coins_granted')}, coins_remaining = ${factor('coins_remaining')}, coins_spent = ${factor('coins_spent')}`);
    await tx.execute(sql`INSERT INTO system_config (config_key, config_value, config_type) VALUES (${WALLET_FLAG}, 'cents', 'text') ON CONFLICT (config_key) DO UPDATE SET config_value = 'cents'`);
  });

  const after = await counts();
  console.log('\n✅ Migrated to the cent (dollar) wallet.');
  console.log(`  users still @60: ${after.personas.n} (expect 0)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
