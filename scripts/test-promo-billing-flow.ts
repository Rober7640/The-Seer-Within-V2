// End-to-end billing-flow test for promo coins against the LOCAL Postgres DB.
// Drives the REAL billing functions (checkpointSession + endChatSession) through a
// backdated chat_sessions row to prove the promo wiring at the three deduction sites
// behaves: promo is spent first, real balance is the fallback, promo_coins_charged is
// tracked, and the run-out-mid-chat handoff works.
//
// Run with: npx tsx scripts/test-promo-billing-flow.ts
// Creates throwaway rows and deletes them at the end.

import "dotenv/config";
import { db } from '../server/lib/db';
import { users, personas, promoGrants, chatSessions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { checkpointSession, endChatSession } from '../server/lib/creditTracking';

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.error(`  ✗ ${name}`, JSON.stringify(extra) ?? ''); }
}

async function sessionRow(id: string) {
  const r = await db.execute(sql`SELECT coins_charged, promo_coins_charged, status FROM chat_sessions WHERE id = ${id}`);
  return r.rows[0] as { coins_charged: number; promo_coins_charged: number; status: string };
}
async function realBalance(userId: string) {
  const r = await db.execute(sql`SELECT coin_balance FROM users WHERE id = ${userId}`);
  return Number((r.rows[0] as any)?.coin_balance ?? 0);
}
async function promoRemaining(userId: string, personaId: string) {
  const r = await db.execute(sql`SELECT coins_remaining FROM promo_grants WHERE user_id = ${userId} AND persona_id = ${personaId} ORDER BY expires_at DESC LIMIT 1`);
  return Number((r.rows[0] as any)?.coins_remaining ?? 0);
}

// Insert an active session backdated by `secondsAgo`, with last_message_at = now
// (so it's NOT idle and the full elapsed time is billable).
async function makeSession(userId: string, personaId: string, secondsAgo: number): Promise<string> {
  const r = await db.execute(sql`
    INSERT INTO chat_sessions (user_id, persona_id, status, coins_charged, promo_coins_charged,
                               duration_seconds, started_at, last_message_at, created_at)
    VALUES (${userId}, ${personaId}, 'active', 0, 0, 0,
            (NOW() AT TIME ZONE 'UTC') - (${secondsAgo} || ' seconds')::interval,
            (NOW() AT TIME ZONE 'UTC'), (NOW() AT TIME ZONE 'UTC'))
    RETURNING id`);
  return (r.rows[0] as any).id;
}

async function main() {
  console.log('\n=== Promo billing-flow test (local DB, real checkpoint/end) ===\n');

  const persona = (await db.select({ id: personas.id, cpm: personas.coinsPerMinute }).from(personas).limit(1))[0];
  if (!persona) { console.error('No persona — run `npm run seed`.'); process.exit(1); }
  const cpm = persona.cpm ?? 60;
  // 90s elapsed → at cpm coins/min, 15s blocks: floor(90/15)=6 blocks * (cpm/4) coins.
  const expected90s = Math.floor(90 / 15) * (cpm / 4);
  console.log(`persona coinsPerMinute=${cpm}, expected charge for 90s = ${expected90s}\n`);

  const user = (await db.insert(users).values({
    email: `promo-bill-${Date.now()}@example.test`, firstName: 'PromoBill', coinBalance: 1000,
  }).returning())[0];

  try {
    // ---- Scenario 1: promo amply covers the charge → real untouched ----
    console.log('Scenario 1 — promo (360) covers a 90s charge, real balance stays 1000:');
    await db.insert(promoGrants).values({
      userId: user.id, personaId: persona.id, campaignTag: 'bill-test-ample',
      coinsGranted: 360, coinsRemaining: 360,
      expiresAt: sql`(NOW() AT TIME ZONE 'UTC') + INTERVAL '14 days'` as any,
    });
    const s1 = await makeSession(user.id, persona.id, 90);
    await checkpointSession(s1);
    let row = await sessionRow(s1);
    check('coins_charged = expected', Number(row.coins_charged) === expected90s, row);
    check('all charge came from promo (promo_coins_charged = coins_charged)',
      Number(row.promo_coins_charged) === Number(row.coins_charged), row);
    check('real balance untouched (1000)', await realBalance(user.id) === 1000);
    check('promo drained by the charge', await promoRemaining(user.id, persona.id) === 360 - expected90s);
    await endChatSession(s1);
    check('session ended', (await sessionRow(s1)).status === 'ended');
    // reset promo for next scenario
    await db.delete(promoGrants).where(eq(promoGrants.userId, user.id));

    // ---- Scenario 2: tiny promo runs out → handoff to real balance ----
    console.log('\nScenario 2 — promo only 30 coins, rest must come from real balance:');
    await db.update(users).set({ coinBalance: 1000 }).where(eq(users.id, user.id));
    await db.insert(promoGrants).values({
      userId: user.id, personaId: persona.id, campaignTag: 'bill-test-tiny',
      coinsGranted: 30, coinsRemaining: 30,
      expiresAt: sql`(NOW() AT TIME ZONE 'UTC') + INTERVAL '14 days'` as any,
    });
    const s2 = await makeSession(user.id, persona.id, 90);
    await checkpointSession(s2);
    row = await sessionRow(s2);
    check('coins_charged = expected', Number(row.coins_charged) === expected90s, row);
    check('promo_coins_charged capped at grant (30)', Number(row.promo_coins_charged) === 30, row);
    check('real balance reduced by the non-promo remainder',
      await realBalance(user.id) === 1000 - (expected90s - 30));
    check('promo fully drained to 0', await promoRemaining(user.id, persona.id) === 0);
    await endChatSession(s2);
    check('session ended', (await sessionRow(s2)).status === 'ended');

    // ---- Scenario 3: zero promo (control) → behaves like before, all real ----
    console.log('\nScenario 3 — no promo grant, charge falls entirely on real balance (control):');
    await db.delete(promoGrants).where(eq(promoGrants.userId, user.id));
    await db.update(users).set({ coinBalance: 1000 }).where(eq(users.id, user.id));
    const s3 = await makeSession(user.id, persona.id, 90);
    await checkpointSession(s3);
    row = await sessionRow(s3);
    check('promo_coins_charged = 0', Number(row.promo_coins_charged) === 0, row);
    check('real balance reduced by full charge', await realBalance(user.id) === 1000 - expected90s);
    await endChatSession(s3);
  } finally {
    await db.delete(promoGrants).where(eq(promoGrants.userId, user.id));
    await db.delete(chatSessions).where(eq(chatSessions.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
    console.log('\n(cleaned up test user + sessions + grants)');
  }

  console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
