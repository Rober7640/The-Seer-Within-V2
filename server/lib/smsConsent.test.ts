// The (now retired) "Can we text you?" question on the main Stripe Checkout, and the
// switch it shares with the standalone opt-in.
//
// Run:
//   npx vitest run server/lib/smsConsent.test.ts

import { describe, it, expect } from 'vitest';
import {
  parseSmsConsentFunnels,
  showsSmsConsent,
  smsConsentSessionParams,
  smsConsentSessionMetadata,
  smsConsentDisclosure,
  readSmsConsent,
  SMS_CONSENT_FIELD_KEY,
  SMS_CONSENT_LABEL,
  SMS_CONSENT_VERSION,
} from './smsConsent';
import { FUNNELS } from '@shared/funnelConfig';

const BASE = 'https://dev.example.com';
const READ_ONLY = parseSmsConsentFunnels('v1-read');

describe('SMS consent — off by default', () => {
  it('unset / empty env shows it on NO funnel, root included', () => {
    for (const raw of [undefined, '', ' , ']) {
      const enabled = parseSmsConsentFunnels(raw);
      expect(showsSmsConsent(undefined, undefined, enabled)).toBe(false);
      for (const f of FUNNELS) expect(showsSmsConsent(f.param, 'tea', enabled), f.param).toBe(false);
    }
  });

  it('a session on a funnel that is not switched on is unchanged (empty spread)', () => {
    expect(smsConsentSessionParams('v1-tarot', undefined, BASE, READ_ONLY)).toEqual({});
    expect(smsConsentSessionParams(undefined, undefined, BASE, READ_ONLY)).toEqual({});
    expect(smsConsentSessionMetadata('v1-tarot', undefined, BASE, '1.2.3.4', READ_ONLY)).toEqual({});
  });

  it('SMS_CONSENT_FUNNELS=v1-read switches on /fb-read (tea + coffee) and nothing else', () => {
    expect(showsSmsConsent('v1-read', 'tea', READ_ONLY)).toBe(true);
    expect(showsSmsConsent('v1-read', 'coffee', READ_ONLY)).toBe(true);
    for (const f of FUNNELS.filter((f) => f.param !== 'v1-read')) {
      expect(showsSmsConsent(f.param, 'tea', READ_ONLY), f.param).toBe(false);
    }
    expect(showsSmsConsent(undefined, undefined, READ_ONLY)).toBe(false);
  });

  it('/fb-read dream lander — or no device at all — never shows it, even switched on', () => {
    expect(showsSmsConsent('v1-read', 'dream', READ_ONLY)).toBe(false);
    expect(showsSmsConsent('v1-read', undefined, READ_ONLY)).toBe(false);
    expect(smsConsentSessionParams('v1-read', 'dream', BASE, READ_ONLY)).toEqual({});
    expect(smsConsentSessionMetadata('v1-read', 'dream', BASE, '1.2.3.4', READ_ONLY)).toEqual({});
  });

  it('"root" switches on the no-funnel root checkout', () => {
    expect(showsSmsConsent(undefined, undefined, parseSmsConsentFunnels('root'))).toBe(true);
  });

  it('a typo turns nothing on', () => {
    expect(showsSmsConsent('v1-read', 'tea', parseSmsConsentFunnels('v1read'))).toBe(false);
  });
});

// 2 Nov 2026: Twilio rejected the toll-free verification (30446 — consent bundled
// with checkout). The checkout question is RETIRED in favour of the standalone
// opt-in on the thank-you page (smsOptIn.test.ts). Even switched on, no checkout
// carries the question or its metadata any more ⇒ the webhook records nothing.
describe('SMS consent — checkout question retired (Twilio 30446)', () => {
  it('tea + coffee, switched on: no custom field, no consent metadata', () => {
    for (const device of ['tea', 'coffee'] as const) {
      expect(smsConsentSessionParams('v1-read', device, BASE, READ_ONLY)).toEqual({});
      expect(smsConsentSessionMetadata('v1-read', device, BASE, '1.2.3.4', READ_ONLY)).toEqual({});
    }
    expect(smsConsentSessionParams(undefined, undefined, BASE, parseSmsConsentFunnels('root'))).toEqual({});
  });

  it('old-wording disclosure is kept for records already written', () => {
    const text = smsConsentDisclosure(`${BASE}/`);
    expect(text).toContain('Consent is not a condition of purchase');
    expect(text).toContain(`(${BASE}/terms)`);
    expect(SMS_CONSENT_LABEL.length).toBeLessThanOrEqual(50);
  });
});

describe('SMS consent — reading the answer back', () => {
  const shown = { smsConsentVersion: SMS_CONSENT_VERSION };
  const answer = (value: string | null) => [
    { key: SMS_CONSENT_FIELD_KEY, dropdown: { value } },
  ] as never;

  it('Yes ⇒ true', () => {
    expect(readSmsConsent({ metadata: shown, custom_fields: answer('yes') })).toBe(true);
  });

  it('No ⇒ false; left blank ⇒ false (never a yes by default)', () => {
    expect(readSmsConsent({ metadata: shown, custom_fields: answer('no') })).toBe(false);
    expect(readSmsConsent({ metadata: shown, custom_fields: answer(null) })).toBe(false);
    expect(readSmsConsent({ metadata: shown, custom_fields: [] })).toBe(false);
  });

  it('never shown ⇒ null (write no record), even if a field somehow says yes', () => {
    expect(readSmsConsent({ metadata: {}, custom_fields: answer('yes') })).toBeNull();
    expect(readSmsConsent({ metadata: null, custom_fields: [] })).toBeNull();
  });

});
