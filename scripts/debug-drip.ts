import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { users, conversations } from '../shared/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const db = drizzle(pool);

async function debug() {
  // Check how many candidates the query returns
  const candidates = await db
    .select({
      userId: users.id,
      email: users.email,
      conversationId: users.migratedFromConversationId,
    })
    .from(users)
    .where(
      and(
        sql`${users.migratedFromConversationId} IS NOT NULL`,
        isNull(users.lastLoginAt),
        eq(users.accountStatus, 'active'),
        sql`${users.email} NOT LIKE '%@example.com' AND ${users.email} NOT LIKE '%@test.com'`,
        sql`${users.id} NOT IN (SELECT user_id FROM migration_drip_emails WHERE sequence_number = 1)`,
      ),
    )
    .limit(5);

  console.log(`Found ${candidates.length} candidates`);

  for (const c of candidates) {
    console.log(`\n--- ${c.email} ---`);
    console.log(`  conversationId: ${c.conversationId}`);

    if (!c.conversationId) {
      console.log('  NO conversationId!');
      continue;
    }

    const convo = await db
      .select({ concern: conversations.concern, vision: conversations.vision })
      .from(conversations)
      .where(eq(conversations.id, c.conversationId))
      .limit(1);

    if (!convo[0]) {
      console.log('  Conversation NOT FOUND in DB');
    } else {
      console.log(`  concern: ${convo[0].concern ? 'YES' : 'NULL'}`);
      console.log(`  vision: ${convo[0].vision ? 'YES' : 'NULL'}`);
    }
  }

  // Also check: is lewis in the candidates?
  const lewis = candidates.find(c => c.email === 'lewis@altiuspublishing.com');
  console.log('\nLewis in candidates?', lewis ? 'YES' : 'NO');

  await pool.end();
}

debug().catch((e) => { console.error(e); pool.end(); });
