// Run against the LOCAL Postgres only:
//   DATABASE_URL=postgresql://postgres@127.0.0.1:5433/seer npx tsx --test --test-force-exit server/lib/smsOptIn.db.test.ts
// The standalone opt-in writes ONE consented row per order, updates it on a re-press,
// and never overwrites a record the old checkout question wrote.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const url = process.env.DATABASE_URL ?? '';
if (!/@(127\.0\.0\.1|localhost):5433\//.test(url)) {
  throw new Error(`refusing to run: DATABASE_URL must be the local :5433 test DB, got ${url.replace(/:[^:@]*@/, ':***@')}`);
}

const tag = `optin${Date.now()}`;
const sidNew = `cs_test_${tag}new`;
const sidOld = `cs_test_${tag}old`;

describe('upsertSmsOptIn', async () => {
  const { db, upsertSmsOptIn, recordSmsConsent, getSmsConsentForSession } = await import('./db');
  const { smsConsents, conversations } = await import('@shared/schema');
  const { sql, eq } = await import('drizzle-orm');
  const { SMS_OPTIN_SOURCE, SMS_OPTIN_VERSION } = await import('./smsConsent');

  const cleanup = async () => {
    await db.delete(smsConsents).where(sql`${smsConsents.stripeSessionId} like ${'%' + tag + '%'}`);
    await db.delete(conversations).where(sql`${conversations.stripeSessionId} like ${'%' + tag + '%'}`);
  };
  before(cleanup);
  after(cleanup);

  const rec = (sid: string, phone: string, at: Date) => ({
    stripeSessionId: sid,
    email: 'buyer@example.com',
    phone,
    consentText: 'TEXT',
    consentVersion: SMS_OPTIN_VERSION,
    ip: '127.0.0.1',
    funnel: 'v1-read',
    source: SMS_OPTIN_SOURCE,
    consentedAt: at,
  });

  it('first press ⇒ one consented row, linked to her order row', async () => {
    const [convo] = await db
      .insert(conversations)
      .values({ email: 'buyer@example.com', firstName: 'T', bucket: 'love', stripeSessionId: sidNew })
      .returning({ id: conversations.id });
    assert.equal(await upsertSmsOptIn(rec(sidNew, '+15551234567', new Date('2026-11-02T10:00:00Z'))), 'saved');
    const rows = await db.select().from(smsConsents).where(eq(smsConsents.stripeSessionId, sidNew));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].consented, true);
    assert.equal(rows[0].source, SMS_OPTIN_SOURCE);
    assert.equal(rows[0].conversationId, convo.id);
    assert.equal(rows[0].optedOutAt, null);
    const st = await getSmsConsentForSession(sidNew);
    assert.equal(st?.consented, true);
  });

  it('second press (fixed a typo) ⇒ same row, new number + time', async () => {
    assert.equal(await upsertSmsOptIn(rec(sidNew, '+15559876543', new Date('2026-11-02T10:05:00Z'))), 'saved');
    const rows = await db.select().from(smsConsents).where(eq(smsConsents.stripeSessionId, sidNew));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].phone, '+15559876543');
    assert.equal(rows[0].consentedAt.toISOString(), '2026-11-02T10:05:00.000Z');
  });

  it('an old checkout-question "no" for the same order is NOT overwritten', async () => {
    await recordSmsConsent({
      stripeSessionId: sidOld,
      email: 'old@example.com',
      phone: '+15550000000',
      consented: false,
      consentText: 'OLD',
      consentVersion: '2026-10-08-v2',
      ip: null,
      funnel: 'v1-read',
      consentedAt: new Date('2026-10-20T00:00:00Z'),
    });
    assert.equal(await upsertSmsOptIn(rec(sidOld, '+15551234567', new Date())), 'conflict');
    const [row] = await db.select().from(smsConsents).where(eq(smsConsents.stripeSessionId, sidOld));
    assert.equal(row.consented, false);
    assert.equal(row.source, 'stripe_checkout');
    assert.equal(row.phone, '+15550000000');
    assert.equal(row.consentText, 'OLD');
  });
});
