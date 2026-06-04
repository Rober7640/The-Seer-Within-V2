// Creates a PASSWORDLESS local test user (null passwordHash) so we can verify the /6-6
// modal shows the green "sign-in link sent" success panel (not a red error) — #5a.
// Run: npx tsx scripts/seed-passwordless-test.ts
import "dotenv/config";
import { db } from '../server/lib/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const EMAIL = 'passwordless-tester@local.test';

async function main() {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, EMAIL)).limit(1);
  if (existing.length) {
    await db.update(users).set({ passwordHash: null, emailVerified: true, isActive: true }).where(eq(users.email, EMAIL));
    console.log('Updated existing passwordless user:', EMAIL);
  } else {
    await db.insert(users).values({
      email: EMAIL, firstName: 'Passwordless', passwordHash: null,
      emailVerified: true, isActive: true, coinBalance: 0,
    } as any);
    console.log('Created passwordless user:', EMAIL);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
