// LOCAL TEST seeder for the 6/6 promo. Creates a known test login with ZERO real
// balance and grants 6 free minutes (360 coins) on every active persona, so we can
// log in and watch the promo badge + promo-first spend in the real UI.
//
// This is NOT the production seeding script (that targets the emailed list). This one
// is purely for local verification. Idempotent — safe to re-run.
//
// Run with: npx tsx scripts/seed-promo-local-test.ts
//
// Then log in at http://localhost:5000/login with:
//   email:    promo-tester@local.test
//   password: TestPromo123!

import "dotenv/config";
import { db } from '../server/lib/db';
import { users, personas, promoGrants } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { hashPassword } from '../server/lib/auth';

const TEST_EMAIL = 'promo-tester@local.test';
const TEST_PASSWORD = 'TestPromo123!';
const CAMPAIGN = 'promo-6-6';
const COINS_PER_PERSONA = 360;       // 6 minutes @ 60 coins/min
const EXPIRY_DAYS = 14;              // local test expiry — production value is TBD (see plan)

async function main() {
  console.log('\n=== Seeding LOCAL 6/6 promo test data ===\n');

  // 1. Upsert the test user (zero real balance, verified + active so login works).
  const pwHash = await hashPassword(TEST_PASSWORD);
  const existing = (await db.select({ id: users.id }).from(users).where(eq(users.email, TEST_EMAIL)).limit(1))[0];
  let userId: string;
  if (existing) {
    userId = existing.id;
    await db.update(users).set({
      passwordHash: pwHash, emailVerified: true, accountStatus: 'active', coinBalance: 0,
    }).where(eq(users.id, userId));
    console.log(`Reused test user ${TEST_EMAIL} (reset to 0 real coins).`);
  } else {
    userId = (await db.insert(users).values({
      email: TEST_EMAIL, firstName: 'Promo Tester', passwordHash: pwHash,
      emailVerified: true, accountStatus: 'active', coinBalance: 0,
    }).returning())[0].id;
    console.log(`Created test user ${TEST_EMAIL}.`);
  }

  // 2. Grant 360 coins per ACTIVE persona, 14-day expiry. ON CONFLICT DO NOTHING so
  //    re-running never double-grants (mirrors what the production script will do).
  const activePersonas = await db.select({ id: personas.id, name: personas.displayName })
    .from(personas).where(eq(personas.isActive, true));

  let granted = 0;
  for (const p of activePersonas) {
    const res = await db.execute(sql`
      INSERT INTO promo_grants (user_id, persona_id, campaign_tag, coins_granted, coins_remaining, expires_at)
      VALUES (${userId}, ${p.id}, ${CAMPAIGN}, ${COINS_PER_PERSONA}, ${COINS_PER_PERSONA},
              (NOW() AT TIME ZONE 'UTC') + (${EXPIRY_DAYS} || ' days')::interval)
      ON CONFLICT (user_id, persona_id, campaign_tag) DO NOTHING
      RETURNING id`);
    if (res.rows.length > 0) { granted++; console.log(`  ✓ granted ${COINS_PER_PERSONA} to ${p.name}`); }
    else console.log(`  · ${p.name} already had a grant (skipped)`);
  }

  console.log(`\nDone. ${activePersonas.length} active personas, ${granted} new grants.`);
  console.log(`\nLog in at http://localhost:5000/login`);
  console.log(`  email:    ${TEST_EMAIL}`);
  console.log(`  password: ${TEST_PASSWORD}`);
  console.log(`Then open /personas to see the "🎁 6:00 free" badges.\n`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
