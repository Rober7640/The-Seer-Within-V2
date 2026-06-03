// Integration test for the promo wallet against the LOCAL Postgres DB.
// Exercises spendCoins / refundCoins / getPromoBalance with real rows + transactions
// to prove the promo-first spend and real-first refund behave end-to-end (SQL, locking,
// expiry filtering) — complements the pure-math unit tests in promoWallet.test.ts.
//
// Run with: npx tsx scripts/test-promo-wallet-integration.ts
// Creates a throwaway user + promo grant, then deletes them at the end.

import "dotenv/config";
import { db } from '../server/lib/db';
import { users, personas, promoGrants } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { spendCoins, refundCoins, getPromoBalance } from '../server/lib/promoWallet';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.error(`  ✗ ${name}`, extra ?? ''); }
}

async function colExists(table: string, col: string): Promise<boolean> {
  const r = await db.execute(sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = ${table} AND column_name = ${col} LIMIT 1`);
  return r.rows.length > 0;
}
async function tableExists(table: string): Promise<boolean> {
  const r = await db.execute(sql`
    SELECT 1 FROM information_schema.tables WHERE table_name = ${table} LIMIT 1`);
  return r.rows.length > 0;
}

async function realBalance(userId: string): Promise<number> {
  const r = await db.execute(sql`SELECT coin_balance FROM users WHERE id = ${userId}`);
  return Number((r.rows[0] as any)?.coin_balance ?? 0);
}

async function main() {
  console.log('\n=== Promo wallet integration test (local DB) ===\n');

  console.log('Schema:');
  check('promo_grants table exists', await tableExists('promo_grants'));
  check('chat_sessions.promo_coins_charged exists', await colExists('chat_sessions', 'promo_coins_charged'));

  // Need a persona to reference (FK). Use any existing one.
  const persona = (await db.select({ id: personas.id }).from(personas).limit(1))[0];
  if (!persona) { console.error('No persona in DB — run `npm run seed` first.'); process.exit(1); }
  const otherPersona = (await db.select({ id: personas.id }).from(personas).limit(2))[1]?.id ?? persona.id;

  // Throwaway user with a small REAL balance of 50.
  const user = (await db.insert(users).values({
    email: `promo-test-${Date.now()}@example.test`,
    firstName: 'PromoTest',
    coinBalance: 50,
  }).returning())[0];

  // 360-coin promo for `persona`, expiring in 14 days.
  await db.insert(promoGrants).values({
    userId: user.id, personaId: persona.id, campaignTag: 'promo-6-6-test',
    coinsGranted: 360, coinsRemaining: 360,
    expiresAt: sql`(NOW() AT TIME ZONE 'UTC') + INTERVAL '14 days'` as any,
  });
  // An EXPIRED promo for the other persona — must be ignored.
  await db.insert(promoGrants).values({
    userId: user.id, personaId: otherPersona, campaignTag: 'promo-expired-test',
    coinsGranted: 360, coinsRemaining: 360,
    expiresAt: sql`(NOW() AT TIME ZONE 'UTC') - INTERVAL '1 day'` as any,
  });

  try {
    console.log('\nReads:');
    check('getPromoBalance returns 360 for active grant', await getPromoBalance(user.id, persona.id) === 360);
    check('getPromoBalance ignores expired grant (other persona)',
      await getPromoBalance(user.id, otherPersona) === 0);

    console.log('\nSpend #1 — 100 coins, fully covered by promo:');
    const s1 = await db.transaction(tx => spendCoins(tx, user.id, persona.id, 100));
    check('fromPromo=100, fromReal=0', s1.fromPromo === 100 && s1.fromReal === 0, s1);
    check('real balance untouched (50)', await realBalance(user.id) === 50);
    check('promo remaining = 260', await getPromoBalance(user.id, persona.id) === 260);

    console.log('\nSpend #2 — 300 coins, promo runs out mid-deduction (260 promo + 40 real):');
    const s2 = await db.transaction(tx => spendCoins(tx, user.id, persona.id, 300));
    check('fromPromo=260, fromReal=40', s2.fromPromo === 260 && s2.fromReal === 40, s2);
    check('real balance now 10', await realBalance(user.id) === 10);
    check('promo remaining = 0', await getPromoBalance(user.id, persona.id) === 0);

    console.log('\nSpend #3 — 100 coins, only 10 real left (capped, no negative):');
    const s3 = await db.transaction(tx => spendCoins(tx, user.id, persona.id, 100));
    check('fromPromo=0, fromReal=10, total=10', s3.fromPromo === 0 && s3.fromReal === 10 && s3.total === 10, s3);
    check('real balance now 0', await realBalance(user.id) === 0);

    console.log('\nRefund — give back 50 from a session charged 260 promo + 40 real (real-first):');
    // Simulate refunding 50 against the spend #2 split.
    const rf = await db.transaction(tx => refundCoins(tx, user.id, persona.id, 50, 260, 40));
    check('toReal=40, toPromo=10', rf.toReal === 40 && rf.toPromo === 10, rf);
    check('real balance restored to 40', await realBalance(user.id) === 40);
    check('promo restored to 10', await getPromoBalance(user.id, persona.id) === 10);

    console.log('\ncoins_spent audit on the grant:');
    const grant = await db.execute(sql`SELECT coins_spent, coins_remaining FROM promo_grants
      WHERE user_id = ${user.id} AND campaign_tag = 'promo-6-6-test'`);
    const g = grant.rows[0] as any;
    // spent 360 then refunded 10 → coins_spent = 350, coins_remaining = 10
    check('coins_spent=350, coins_remaining=10', Number(g.coins_spent) === 350 && Number(g.coins_remaining) === 10, g);
  } finally {
    // Cleanup
    await db.delete(promoGrants).where(eq(promoGrants.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
    console.log('\n(cleaned up test user + grants)');
  }

  console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
