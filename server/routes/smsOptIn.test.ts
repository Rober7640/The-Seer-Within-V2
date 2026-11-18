// Standalone post-purchase SMS opt-in (Twilio 30446 fix). No DB, no Stripe: the
// router takes fakes.
//
// Run:
//   npx vitest run server/routes/smsOptIn.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createSmsOptInRouter, type SmsOptInDeps } from './smsOptIn';
import {
  normalizeOptInPhone,
  parseSmsConsentFunnels,
  showsPostPurchaseSmsOptIn,
  smsOptInDisclosure,
  smsOptInRecordText,
  SMS_OPTIN_CHECKBOX_LABEL,
  SMS_OPTIN_DISCLOSURE_BODY,
  SMS_OPTIN_SOURCE,
  SMS_OPTIN_VERSION,
} from '../lib/smsConsent';

const BASE = 'https://dev.example.com';
const READ_ONLY = parseSmsConsentFunnels('v1-read');

describe('opt-in wording — what Judy approved', () => {
  it('checkbox label is the exact approved sentence', () => {
    expect(SMS_OPTIN_CHECKBOX_LABEL).toBe(
      'Yes, send me marketing and promotional text messages from The Seer Within',
    );
  });

  it('disclosure: recurring automated marketing, optional, not a condition of purchase, freq, rates, STOP/HELP, links', () => {
    const t = smsOptInDisclosure(`${BASE}/`);
    expect(t).toContain('recurring automated');
    expect(t).toContain('marketing and promotional text messages from The Seer Within');
    expect(t).toContain('optional and separate from your purchase');
    expect(t).toContain('consent is not a condition of any purchase');
    expect(t).toContain('Up to 3 msgs/week');
    expect(t).toContain('Msg & data rates may apply');
    expect(t).toContain('Reply STOP to opt out, HELP for help');
    expect(t).toContain(`${BASE}/terms`);
    expect(t).toContain(`${BASE}/privacy`);
    expect(t).not.toContain('//terms');
  });

  it('the stored record says the box was unticked by default', () => {
    expect(smsOptInRecordText(BASE)).toContain('unticked by default');
  });
});

describe('opt-in — where it shows', () => {
  it('/fb-read tea + coffee only, and only when switched on', () => {
    expect(showsPostPurchaseSmsOptIn('v1-read', 'tea', READ_ONLY)).toBe(true);
    expect(showsPostPurchaseSmsOptIn('v1-read', 'coffee', READ_ONLY)).toBe(true);
    expect(showsPostPurchaseSmsOptIn('v1-read', 'dream', READ_ONLY)).toBe(false);
    expect(showsPostPurchaseSmsOptIn('v1-read', undefined, READ_ONLY)).toBe(false);
    expect(showsPostPurchaseSmsOptIn('v1-tarot', undefined, READ_ONLY)).toBe(false);
    expect(showsPostPurchaseSmsOptIn(undefined, undefined, READ_ONLY)).toBe(false);
    expect(showsPostPurchaseSmsOptIn('v1-read', 'tea', parseSmsConsentFunnels(''))).toBe(false);
  });
});

describe('normalizeOptInPhone', () => {
  it.each([
    ['(555) 123-4567', '+15551234567'],
    ['555.123.4567', '+15551234567'],
    ['1 555 123 4567', '+15551234567'],
    ['+44 7700 900123', '+447700900123'],
    ['  +1-555-123-4567 ', '+15551234567'],
  ])('%s ⇒ %s', (raw, want) => expect(normalizeOptInPhone(raw)).toBe(want));

  it.each(['', '12345', '555-1234', 'call me', '+12', '2 555 123 4567', '5551234567x9', null, 123])(
    'refuses %s',
    (raw) => expect(normalizeOptInPhone(raw)).toBeNull(),
  );
});

// ── the endpoint ─────────────────────────────────────────────────────────────

const SESSIONS: Record<string, any> = {
  cs_test_teaPaidAAAAAAAAAA: { id: 'cs_test_teaPaidAAAAAAAAAA', payment_status: 'paid', metadata: { funnel: 'v1-read', readDevice: 'tea' }, customer_details: { email: 'buyer@example.com' } },
  cs_test_coffeePaidAAAAAAA: { id: 'cs_test_coffeePaidAAAAAAA', payment_status: 'paid', metadata: { funnel: 'v1-read', readDevice: 'coffee' }, customer_details: { email: 'c@example.com' } },
  cs_test_teaUnpaidAAAAAAAA: { id: 'cs_test_teaUnpaidAAAAAAAA', payment_status: 'unpaid', metadata: { funnel: 'v1-read', readDevice: 'tea' }, customer_details: {} },
  cs_test_dreamPaidAAAAAAAA: { id: 'cs_test_dreamPaidAAAAAAAA', payment_status: 'paid', metadata: { funnel: 'v1-read', readDevice: 'dream' }, customer_details: {} },
  cs_test_tarotPaidAAAAAAAA: { id: 'cs_test_tarotPaidAAAAAAAA', payment_status: 'paid', metadata: { funnel: 'v1-tarot' }, customer_details: {} },
};

const saved: any[] = [];
let upsertResult: 'saved' | 'conflict' = 'saved';
const FIXED_NOW = new Date('2026-11-02T10:00:00Z');

const deps: SmsOptInDeps = {
  retrieveSession: async (id) => {
    if (!SESSIONS[id]) throw new Error('No such checkout.session');
    return SESSIONS[id];
  },
  upsertOptIn: async (rec) => {
    saved.push(rec);
    return upsertResult;
  },
  getConsent: async (id) => (id === 'cs_test_coffeePaidAAAAAAA' ? { consented: true, source: SMS_OPTIN_SOURCE, optedOutAt: null } : null),
  policyBase: () => `${BASE}/`,
  enabled: () => READ_ONLY,
  now: () => FIXED_NOW,
};

let server: Server;
let url: string;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/sms-optin', createSmsOptInRouter(deps));
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/sms-optin`;
});
afterAll(() => new Promise((r) => server.close(r)));

const status = (sid: string) => fetch(`${url}/status?session_id=${sid}`).then((r) => r.json());
const post = (body: unknown) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('GET /api/sms-optin/status', () => {
  it('paid tea order ⇒ show, with the approved wording and links, not yet opted in', async () => {
    const s = await status('cs_test_teaPaidAAAAAAAAAA');
    expect(s).toMatchObject({
      show: true,
      checkboxLabel: SMS_OPTIN_CHECKBOX_LABEL,
      buttonLabel: 'Text me',
      disclosure: SMS_OPTIN_DISCLOSURE_BODY,
      termsUrl: `${BASE}/terms`,
      privacyUrl: `${BASE}/privacy`,
      alreadyOptedIn: false,
    });
  });

  it('already opted in ⇒ alreadyOptedIn', async () => {
    expect((await status('cs_test_coffeePaidAAAAAAA')).alreadyOptedIn).toBe(true);
  });

  it.each([
    'cs_test_teaUnpaidAAAAAAAA', // not paid
    'cs_test_dreamPaidAAAAAAAA', // dream lander
    'cs_test_tarotPaidAAAAAAAA', // other funnel
    'cs_test_unknownAAAAAAAAAA', // Stripe says no such session
    'demo_session',
    'not-a-session',
  ])('%s ⇒ show:false', async (sid) => {
    expect(await status(sid)).toEqual({ show: false });
  });
});

describe('POST /api/sms-optin', () => {
  it('ticked + valid number on a paid tea order ⇒ saved with the full record', async () => {
    saved.length = 0;
    const r = await post({ sessionId: 'cs_test_teaPaidAAAAAAAAAA', phone: '(555) 123-4567', agree: true });
    expect(r.status).toBe(200);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      stripeSessionId: 'cs_test_teaPaidAAAAAAAAAA',
      email: 'buyer@example.com',
      phone: '+15551234567',
      consentVersion: SMS_OPTIN_VERSION,
      consentText: smsOptInRecordText(BASE),
      source: SMS_OPTIN_SOURCE,
      funnel: 'v1-read',
      consentedAt: FIXED_NOW,
    });
  });

  it.each([
    [{ agree: false }, 400],
    [{ agree: 'true' }, 400], // only a literal true counts
    [{}, 400],
  ])('not ticked %j ⇒ %i, nothing saved', async (extra, code) => {
    saved.length = 0;
    const r = await post({ sessionId: 'cs_test_teaPaidAAAAAAAAAA', phone: '5551234567', ...extra });
    expect(r.status).toBe(code);
    expect(saved).toHaveLength(0);
  });

  it('bad number ⇒ 400, nothing saved', async () => {
    saved.length = 0;
    const r = await post({ sessionId: 'cs_test_teaPaidAAAAAAAAAA', phone: '12345', agree: true });
    expect(r.status).toBe(400);
    expect(saved).toHaveLength(0);
  });

  it.each(['cs_test_teaUnpaidAAAAAAAA', 'cs_test_dreamPaidAAAAAAAA', 'cs_test_tarotPaidAAAAAAAA', 'demo_session'])(
    'ineligible order %s ⇒ 404, nothing saved',
    async (sid) => {
      saved.length = 0;
      const r = await post({ sessionId: sid, phone: '5551234567', agree: true });
      expect(r.status).toBe(404);
      expect(saved).toHaveLength(0);
    },
  );

  it('an old checkout-question record for the same order ⇒ 409, not overwritten', async () => {
    upsertResult = 'conflict';
    try {
      const r = await post({ sessionId: 'cs_test_teaPaidAAAAAAAAAA', phone: '5551234567', agree: true });
      expect(r.status).toBe(409);
    } finally {
      upsertResult = 'saved';
    }
  });
});
