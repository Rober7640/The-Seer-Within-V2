// Verifies Phase 2 (persona drip) scheduling + content + flag gate on local.
// SAFE: never sends email — only tests row scheduling and the OFF-flag no-op.
//
// Run: npx tsx scripts/verify-persona-drip.ts

import 'dotenv/config';
import { db } from '../server/lib/db';
import { users, personaFollowupEmails } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../server/lib/auth';
import {
  schedulePersonaVerifiedDrip,
  processPersonaVerifiedDripQueue,
} from '../server/lib/personaVerifiedDripGenerator';
import { PERSONA_DRIP_CONFIGS } from '../server/lib/personaDripConfig';

const EMAIL = 'drip-tester@local.test';
const EXPECTED_OFFSETS_H = [1, 25, 49, 97, 145, 193, 241, 289, 337, 385];

let fail = 0;
const ok = (n: string, c: boolean, x?: any) => {
  c ? console.log(`✓ ${n}`) : (fail++, console.error(`✗ ${n}`, x ?? ''));
};

async function main() {
  // Fresh test user (FK target), wipe any prior drip rows.
  const pwHash = await hashPassword('TestPromo123!');
  const existing = (await db.select({ id: users.id }).from(users).where(eq(users.email, EMAIL)).limit(1))[0];
  let userId: string;
  if (existing) {
    userId = existing.id;
    await db.update(users).set({ emailVerified: true, accountStatus: 'active', firstName: 'Dana' }).where(eq(users.id, userId));
  } else {
    userId = (await db.insert(users).values({
      email: EMAIL, firstName: 'Dana', passwordHash: pwHash, emailVerified: true, accountStatus: 'active', coinBalance: 0,
    }).returning())[0].id;
  }
  await db.delete(personaFollowupEmails).where(eq(personaFollowupEmails.userId, userId));

  const base = new Date('2026-07-01T00:00:00Z');

  for (const slug of Object.keys(PERSONA_DRIP_CONFIGS)) {
    const config = PERSONA_DRIP_CONFIGS[slug];
    await schedulePersonaVerifiedDrip({
      userId, email: EMAIL, firstName: 'Dana', personaSlug: slug, bucket: 'love', baseTime: base,
    });

    const rows = await db.select().from(personaFollowupEmails)
      .where(eq(personaFollowupEmails.userId, userId));
    const mine = rows.filter((r) => r.personaSlug === slug).sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    ok(`${config.personaName}: 10 rows scheduled`, mine.length === 10, mine.length);
    const seqs = mine.map((r) => r.sequenceNumber).join(',');
    ok(`${config.personaName}: sequence 1..10`, seqs === '1,2,3,4,5,6,7,8,9,10', seqs);

    const offsetsOk = mine.every((r, i) => {
      const offH = Math.round((r.scheduledFor.getTime() - base.getTime()) / 3_600_000);
      return offH === EXPECTED_OFFSETS_H[i];
    });
    ok(`${config.personaName}: cadence +1h/+25h/+49h…+385h`, offsetsOk,
      mine.map((r) => Math.round((r.scheduledFor.getTime() - base.getTime()) / 3_600_000)).join(','));

    // Content: subject matches config, body has firstName + signoff + topic phrase.
    const e1 = mine[0];
    ok(`${config.personaName}: email1 subject matches config`, e1.subject === config.emails[0].subject, e1.subject);
    ok(`${config.personaName}: email1 body has firstName`, e1.bodyHtml.includes('Dana'), e1.bodyHtml.slice(0, 80));
    ok(`${config.personaName}: email1 body has signoff`, e1.bodyText.includes(config.signoff), config.signoff);
    ok(`${config.personaName}: topic token filled (no {topic})`, !e1.bodyHtml.includes('{topic}') && !e1.bodyHtml.includes('{firstName}'), e1.bodyHtml.slice(0, 80));
    ok(`${config.personaName}: status pending + unsubscribe token`, e1.status === 'pending' && !!e1.unsubscribeToken, e1.status);
  }

  // Flag gate: with ENABLE_PERSONA_VERIFIED_DRIP unset/not 'true', processor no-ops (NO sends).
  const wasEnabled = process.env.ENABLE_PERSONA_VERIFIED_DRIP;
  delete process.env.ENABLE_PERSONA_VERIFIED_DRIP;
  const gate = await processPersonaVerifiedDripQueue();
  ok('processor no-ops when flag OFF (no sends)', gate.flagEnabled === false && gate.sent === 0, gate);
  if (wasEnabled) process.env.ENABLE_PERSONA_VERIFIED_DRIP = wasEnabled;

  // Cleanup
  await db.delete(personaFollowupEmails).where(eq(personaFollowupEmails.userId, userId));

  console.log(`\n=== ${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' FAILED'} ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
