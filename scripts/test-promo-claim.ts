// Integration test for claimPromoForUser against the local DB.
// Covers: grant-on-arrival, idempotency (no stacking), and buyer refusal.
// Run with: npx tsx scripts/test-promo-claim.ts

import "dotenv/config";
import { db } from '../server/lib/db';
import { users, personas, promoGrants, creditPurchases } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { claimPromoForUser, ACTIVE_PROMO_CAMPAIGN } from '../server/lib/promoCampaign';
import { getPromoBalancesByPersona } from '../server/lib/promoWallet';

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, extra?: unknown) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.error(`  ✗ ${n}`, JSON.stringify(extra) ?? '')); };

async function mkUser(email: string) {
  return (await db.insert(users).values({ email, firstName: 'ClaimTest', coinBalance: 0 }).returning())[0];
}
async function cleanup(userId: string) {
  await db.delete(promoGrants).where(eq(promoGrants.userId, userId));
  await db.delete(creditPurchases).where(eq(creditPurchases.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

async function main() {
  console.log('\n=== claimPromoForUser integration test ===\n');
  const activeCount = (await db.select({ id: personas.id }).from(personas).where(eq(personas.isActive, true))).length;
  console.log(`active personas: ${activeCount}, campaign: ${ACTIVE_PROMO_CAMPAIGN.tag}, expires ${ACTIVE_PROMO_CAMPAIGN.expiresAt.toISOString()}\n`);

  // 1. Non-buyer first claim → grants all active personas
  const u1 = await mkUser(`claim-nonbuyer-${Date.now()}@example.test`);
  try {
    console.log('Non-buyer, first claim:');
    const r1 = await claimPromoForUser(u1.id);
    ok('claimed=true, not alreadyHad', r1.claimed === true && (r1 as any).alreadyHad === false, r1);
    ok('granted every active persona', (r1 as any).grantedPersonas === activeCount, r1);
    const bal = await getPromoBalancesByPersona(u1.id);
    const vals = Object.values(bal);
    ok('all balances = 360', vals.length === activeCount && vals.every(v => v === 360), bal);

    console.log('\nSame user, claims again (idempotent):');
    const r2 = await claimPromoForUser(u1.id);
    ok('claimed=true, alreadyHad=true', r2.claimed === true && (r2 as any).alreadyHad === true, r2);
    const bal2 = await getPromoBalancesByPersona(u1.id);
    ok('balances unchanged (still 360, no stacking)', Object.values(bal2).every(v => v === 360), bal2);
    const totalGrants = await db.execute(sql`SELECT COUNT(*)::int AS n FROM promo_grants WHERE user_id=${u1.id}`);
    ok('grant rows == active personas (not doubled)', Number((totalGrants.rows[0] as any).n) === activeCount, totalGrants.rows[0]);
  } finally {
    await cleanup(u1.id);
  }

  // 2. Buyer → refused
  const u2 = await mkUser(`claim-buyer-${Date.now()}@example.test`);
  try {
    const persona = (await db.select({ id: personas.id }).from(personas).limit(1))[0];
    await db.insert(creditPurchases).values({
      userId: u2.id, personaId: persona.id, packageType: 'starter',
      coinsPurchased: 900, priceUsd: 999, status: 'completed',
    });
    console.log('\nBuyer (has completed purchase), claims:');
    const r3 = await claimPromoForUser(u2.id);
    ok('claimed=false, reason=not_eligible', r3.claimed === false && (r3 as any).reason === 'not_eligible', r3);
    const bal3 = await getPromoBalancesByPersona(u2.id);
    ok('no grants created for buyer', Object.keys(bal3).length === 0, bal3);
  } finally {
    await cleanup(u2.id);
  }

  console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
