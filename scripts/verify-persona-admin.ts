// Verifies the Phase 2.5 persona drip admin endpoints on local (dev server :5000).
// Seeds drip rows directly, then exercises the admin API. SAFE: trigger runs with the
// flag OFF so nothing sends.
//
// Run: npx tsx scripts/verify-persona-admin.ts

import 'dotenv/config';
import { db } from '../server/lib/db';
import { users, personaFollowupEmails } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../server/lib/auth';
import { schedulePersonaVerifiedDrip } from '../server/lib/personaVerifiedDripGenerator';

const BASE = 'http://localhost:5000';
const EMAIL = 'admin-drip-tester@local.test';

let fail = 0;
const ok = (n: string, c: boolean, x?: any) => {
  c ? console.log(`✓ ${n}`) : (fail++, console.error(`✗ ${n}`, x ?? ''));
};

async function adminToken(): Promise<string | null> {
  const r = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@theseerwithin.com', password: 'ChangeMe123!' }),
  });
  if (!r.ok) return null;
  return (await r.json()).token;
}

async function main() {
  // Seed: a verified test user with drip rows for 2 personas.
  const pwHash = await hashPassword('TestPromo123!');
  const existing = (await db.select({ id: users.id }).from(users).where(eq(users.email, EMAIL)).limit(1))[0];
  let userId: string;
  if (existing) {
    userId = existing.id;
    await db.update(users).set({ emailVerified: true, accountStatus: 'active', firstName: 'Rae' }).where(eq(users.id, userId));
  } else {
    userId = (await db.insert(users).values({
      email: EMAIL, firstName: 'Rae', passwordHash: pwHash, emailVerified: true, accountStatus: 'active', coinBalance: 0,
    }).returning())[0].id;
  }
  await db.delete(personaFollowupEmails).where(eq(personaFollowupEmails.userId, userId));
  await schedulePersonaVerifiedDrip({ userId, email: EMAIL, firstName: 'Rae', personaSlug: 'marcus-stone', bucket: 'love' });
  await schedulePersonaVerifiedDrip({ userId, email: EMAIL, firstName: 'Rae', personaSlug: 'luna-voss', bucket: 'money' });

  const token = await adminToken();
  if (!token) { console.error('Admin login failed — is the admin seeded? (admin@theseerwithin.com)'); process.exit(1); }
  const H = { Authorization: `Bearer ${token}` };

  // 1. personas switcher
  const personas = await (await fetch(`${BASE}/api/admin/persona-follow-ups/personas`, { headers: H })).json();
  ok('GET /personas → 4 personas', (personas.personas?.length ?? 0) === 4, personas.personas?.map((p: any) => p.slug));

  // 2. stats for marcus
  const stats = await (await fetch(`${BASE}/api/admin/persona-follow-ups/stats?persona=marcus-stone`, { headers: H })).json();
  const pending = (stats.breakdown || []).filter((r: any) => r.status === 'pending').reduce((a: number, r: any) => a + Number(r.total), 0);
  ok('GET /stats marcus → 10 pending', pending === 10, stats.breakdown);
  ok('GET /stats → flagEnabled false (safe)', stats.flagEnabled === false, stats.flagEnabled);
  ok('GET /stats → opened/clicked 0', stats.openedTotal === 0 && stats.clickedTotal === 0, stats);

  // 3. list for marcus
  const list = await (await fetch(`${BASE}/api/admin/persona-follow-ups?persona=marcus-stone&pageSize=25`, { headers: H })).json();
  ok('GET / list marcus → 10 rows', (list.rows?.length ?? 0) === 10, list.pagination);
  ok('GET / list → joined user email', list.rows?.[0]?.userEmail === EMAIL, list.rows?.[0]?.userEmail);

  // Persona isolation: luna list should be its own 10, not marcus's.
  const lunaList = await (await fetch(`${BASE}/api/admin/persona-follow-ups?persona=luna-voss`, { headers: H })).json();
  ok('persona filter isolates luna (10 rows)', (lunaList.pagination?.total ?? 0) === 10, lunaList.pagination);

  // 4. preview wraps with persona branding + ctaText
  const firstId = list.rows[0].id;
  const preview = await (await fetch(`${BASE}/api/admin/persona-follow-ups/preview/${firstId}`, { headers: H })).json();
  const html = preview.bodyHtml || '';
  ok('GET /preview → full HTML template', /^<!doctype|^<html/i.test(html.trim()), html.slice(0, 40));
  ok('GET /preview → Marcus CTA text', html.includes('Return to Marcus'), 'cta');

  // 5. trigger is safe with flag off
  const trig = await (await fetch(`${BASE}/api/admin/persona-follow-ups/trigger`, { method: 'POST', headers: H })).json();
  ok('POST /trigger → flag off, 0 sent', trig.stats?.flagEnabled === false && trig.stats?.sent === 0, trig.stats);

  // 6. auth required
  const noauth = await fetch(`${BASE}/api/admin/persona-follow-ups/stats?persona=marcus-stone`);
  ok('endpoints require admin auth (401 without token)', noauth.status === 401, noauth.status);

  // cleanup
  await db.delete(personaFollowupEmails).where(eq(personaFollowupEmails.userId, userId));

  console.log(`\n=== ${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' FAILED'} ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
