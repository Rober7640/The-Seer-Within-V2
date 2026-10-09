import { describe, it, expect, vi } from 'vitest';

// The pure helpers don't touch the database; stub it so importing doesn't connect.
vi.mock('./db', () => ({ db: {} }));

import {
  buildSmsBody,
  cleanFirstName,
  isGsm7,
  isInSendWindow,
  isUsOrCanada,
  nextStep,
  normalizePhone,
  sendingMode,
  smsLink,
  topicFor,
  SMS_STEP_DELAY_MS,
} from './smsSender';

const BASE = 'https://www.theseerwithin.com';

describe('SMS texts — what we told Twilio in the TFV form (9 Oct 2026)', () => {
  const ctx = { firstName: 'sarah', bucket: 'love', linkBase: BASE };

  it('every text starts with the brand and carries STOP', () => {
    for (const step of [1, 2, 3] as const) {
      const body = buildSmsBody(step, ctx);
      expect(body.startsWith('The Seer Within: ')).toBe(true);
      expect(body).toContain('STOP to opt out');
    }
  });

  it('text 1 is the opt-in confirmation: frequency, rates, HELP, STOP', () => {
    const t1 = buildSmsBody(1, ctx);
    expect(t1).toContain('Thank you, Sarah.');
    expect(t1).toContain('Energy Clearing Ritual');
    expect(t1).toContain('Up to 3 msgs/week.');
    expect(t1).toContain('Msg & data rates may apply.');
    expect(t1).toContain('Reply HELP for help, STOP to opt out.');
  });

  it('texts 2 and 3 link to the Evelyn chat, tagged for PostHog', () => {
    expect(buildSmsBody(2, ctx)).toContain(`${BASE}/evelyn?utm_source=sms&utm_campaign=v1-buyers&utm_content=t2`);
    expect(buildSmsBody(3, ctx)).toContain(`${BASE}/evelyn?utm_source=sms&utm_campaign=v1-buyers&utm_content=t3`);
    expect(buildSmsBody(1, ctx)).not.toContain('http');
  });

  it('text 2 names her topic, and reads fine without one', () => {
    expect(buildSmsBody(2, ctx)).toContain('questions about love,');
    expect(buildSmsBody(2, { ...ctx, bucket: 'specific' })).toContain('questions about the one on your mind,');
    expect(buildSmsBody(2, { ...ctx, bucket: null })).toContain('If it stirred questions, I');
  });

  it('reads fine with no usable name', () => {
    expect(buildSmsBody(1, { ...ctx, firstName: null })).toContain('Thank you. Evelyn here.');
    expect(buildSmsBody(2, { ...ctx, firstName: '🌙' })).toContain("The Seer Within: It's Evelyn.");
  });

  it('all texts stay plain GSM-7 (no curly quotes / emoji), for every bucket', () => {
    for (const bucket of ['love', 'money', 'purpose', 'specific', null]) {
      for (const step of [1, 2, 3] as const) {
        expect(isGsm7(buildSmsBody(step, { ...ctx, bucket }))).toBe(true);
      }
    }
    expect(isGsm7('it’s')).toBe(false); // curly apostrophe
    expect(isGsm7('hi 🌙')).toBe(false);
  });
});

describe('SMS helpers', () => {
  it('cleanFirstName keeps plain first names only', () => {
    expect(cleanFirstName('  sarah jane ')).toBe('Sarah');
    expect(cleanFirstName('MARY-ANN')).toBe('Mary-ann');
    expect(cleanFirstName('José')).toBeNull();
    expect(cleanFirstName('<script>')).toBeNull();
    expect(cleanFirstName('')).toBeNull();
    expect(cleanFirstName(null)).toBeNull();
  });

  it('topicFor maps chat buckets', () => {
    expect(topicFor('money')).toBe('money');
    expect(topicFor('purpose')).toBe('your purpose');
    expect(topicFor('someone')).toBe('the one on your mind');
    expect(topicFor('any')).toBeNull();
  });

  it('phones: normalize + US/Canada only', () => {
    expect(normalizePhone('+1 (201) 555-0123')).toBe('+12015550123');
    expect(isUsOrCanada('+12015550123')).toBe(true);
    expect(isUsOrCanada('+918123456789')).toBe(false);
    expect(isUsOrCanada('+1201555012')).toBe(false);
  });

  it('send window = 1pm-7pm New York (inside 10am-8pm in every US/Canada zone)', () => {
    // 9 Oct 2026 is EDT (UTC-4).
    expect(isInSendWindow(new Date('2026-10-09T16:59:00Z'))).toBe(false); // 12:59 ET
    expect(isInSendWindow(new Date('2026-10-09T17:00:00Z'))).toBe(true);  // 1pm ET = 10am PT
    expect(isInSendWindow(new Date('2026-10-09T22:59:00Z'))).toBe(true);  // 6:59pm ET
    expect(isInSendWindow(new Date('2026-10-09T23:00:00Z'))).toBe(false); // 7pm ET
  });

  it('steps go in order, purchase / day 4 / day 7', () => {
    expect(nextStep(new Set())).toBe(1);
    expect(nextStep(new Set([1]))).toBe(2);
    expect(nextStep(new Set([1, 2]))).toBe(3);
    expect(nextStep(new Set([1, 2, 3]))).toBeNull();
    expect(SMS_STEP_DELAY_MS[2] / 86_400_000).toBe(4);
    expect(SMS_STEP_DELAY_MS[3] / 86_400_000).toBe(7);
  });

  it('smsLink trims a trailing slash', () => {
    expect(smsLink(2, 'https://x.test/')).toBe('https://x.test/evelyn?utm_source=sms&utm_campaign=v1-buyers&utm_content=t2');
  });
});

describe('SMS switch — nothing is sent unless explicitly turned on', () => {
  const creds = { TWILIO_ACCOUNT_SID: 'AC1', TWILIO_AUTH_TOKEN: 't', TWILIO_FROM_NUMBER: '+13203356962' };

  it('off by default', () => {
    expect(sendingMode({}).kind).toBe('off');
    expect(sendingMode({ ...creds }).kind).toBe('off');
  });

  it('enabled but with no audience chosen = still off', () => {
    expect(sendingMode({ ...creds, SMS_SENDING_ENABLED: 'true' }).kind).toBe('off');
  });

  it('enabled without Twilio credentials = off', () => {
    expect(sendingMode({ SMS_SENDING_ENABLED: 'true', SMS_SEND_TO_ALL: 'true' }).kind).toBe('off');
  });

  it('allow-list wins over send-to-all (a test server can never text everyone)', () => {
    const m = sendingMode({ ...creds, SMS_SENDING_ENABLED: 'true', SMS_SEND_TO_ALL: 'true', SMS_ALLOWED_NUMBERS: '+91 81234 56789, +1 201 555 0123' });
    expect(m.kind).toBe('allowList');
    if (m.kind === 'allowList') expect([...m.numbers]).toEqual(['+918123456789', '+12015550123']);
  });

  it('send-to-all only with the explicit flag', () => {
    expect(sendingMode({ ...creds, SMS_SENDING_ENABLED: 'true', SMS_SEND_TO_ALL: 'true' }).kind).toBe('all');
  });
});
