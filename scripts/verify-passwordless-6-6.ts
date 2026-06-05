// Verifies the passwordless → magic-link → /6-6 → claim chain:
//   1. A passwordless user "logs in" with redirect=/6-6 → server returns NO_PASSWORD and
//      mints a magic token (link includes redirect=/6-6).
//   2. Clicking that link (/magic-auth?t=...&redirect=/6-6) logs them in and lands on /6-6.
//   3. The /6-6 claim fires → they get 6 min per guide.
//
// Run with: npx tsx scripts/verify-passwordless-6-6.ts   (dev server on :5000)

import "dotenv/config";
import { db } from '../server/lib/db';
import { users, promoGrants, magicLinkTokens } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { chromium } from 'playwright';

const BASE = 'http://localhost:5000';
const EMAIL = 'pwless-6-6@local.test';
let pass = 0, fail = 0;
const ok = (n: string, c: boolean, x?: unknown) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.error(`  ✗ ${n}`, JSON.stringify(x) ?? '')); };

async function promoCoins(userId: string) {
  const r = await db.execute(sql`SELECT COALESCE(SUM(coins_remaining),0)::int AS n FROM promo_grants WHERE user_id=${userId}`);
  return Number((r.rows[0] as any).n);
}

async function main() {
  console.log('\n=== passwordless → /6-6 claim chain ===\n');

  // Fresh passwordless, verified, active user with no grants
  const ex = (await db.select({ id: users.id }).from(users).where(eq(users.email, EMAIL)).limit(1))[0];
  let userId: string;
  if (ex) { userId = ex.id; await db.delete(promoGrants).where(eq(promoGrants.userId, userId)); await db.update(users).set({ passwordHash: null, emailVerified: true, accountStatus: 'active', coinBalance: 0 }).where(eq(users.id, userId)); }
  else { userId = (await db.insert(users).values({ email: EMAIL, firstName: 'Pwless', passwordHash: null, emailVerified: true, accountStatus: 'active', coinBalance: 0 }).returning())[0].id; }
  console.log('passwordless user ready, 0 grants\n');

  // 1. Login attempt with redirect=/6-6 → expect NO_PASSWORD
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: 'irrelevant', redirect: '/6-6' }),
  });
  const body = await res.json();
  ok('login returns 400 NO_PASSWORD (sends magic link)', res.status === 400 && body.code === 'NO_PASSWORD', { status: res.status, body });

  // 2. Grab the freshly-minted token from the DB (the email would carry it)
  const tok = (await db.select({ token: magicLinkTokens.token }).from(magicLinkTokens)
    .where(eq(magicLinkTokens.userId, userId)).orderBy(desc(magicLinkTokens.createdAt)).limit(1))[0];
  ok('a magic token was minted for the user', !!tok?.token);

  // 3. Click the link as the server would have built it (with redirect=/6-6)
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/magic-auth?t=${tok.token}&redirect=${encodeURIComponent('/6-6')}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000); // magic-verify → navigate to /6-6 → claim → balances
  const url = page.url();
  const txt = await page.innerText('body').catch(() => '');
  ok('landed on /6-6 after magic sign-in', url.includes('/6-6'), url);
  ok('/6-6 shows the 6:00 free badge', /6:00\s*free/i.test(txt));
  await browser.close();

  // 4. Confirm the grant actually happened
  const coins = await promoCoins(userId);
  ok('user now has promo coins (6×360=2160)', coins === 2160, coins);

  // cleanup
  await db.delete(promoGrants).where(eq(promoGrants.userId, userId));
  await db.delete(magicLinkTokens).where(eq(magicLinkTokens.userId, userId));

  console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
