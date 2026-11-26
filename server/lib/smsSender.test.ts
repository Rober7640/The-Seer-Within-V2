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
  smsMagicLink,
  topicFor,
  SMS_STEP_DELAY_MS,
  SMS_SEQUENCE_FUNNELS,
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

  it('texts 2 and 3 carry a SHORT link (Joel, 24 Nov); text 1 has none', () => {
    expect(buildSmsBody(2, ctx)).toContain(`${BASE}/s/2 Reply STOP`);
    expect(buildSmsBody(3, ctx)).toContain(`${BASE}/s/3 Reply STOP`);
    expect(buildSmsBody(1, ctx)).not.toContain('http');
  });

  it('with a login token, texts 2 and 3 link STRAIGHT into her V2 Evelyn chat (magic-auth), still tagged', () => {
    const tok = 'Ab3dEf6hIj9kLm';
    const t2 = buildSmsBody(2, { ...ctx, magicToken: tok });
    const t3 = buildSmsBody(3, { ...ctx, magicToken: tok });
    expect(t2).toContain(`${BASE}/s/2/${tok} Reply STOP to opt out`);
    expect(t3).toContain(`${BASE}/s/3/${tok} Reply STOP to opt out`);
    expect(t2).not.toContain('/evelyn');
    expect(isGsm7(t2) && isGsm7(t3)).toBe(true);
    // text 1 never carries a link, token or not
    expect(buildSmsBody(1, { ...ctx, magicToken: tok })).not.toContain('http');
    expect(smsMagicLink(2, tok, `${BASE}/`)).toBe(`${BASE}/s/2/${tok}`);
    // short link keeps texts 2/3 at 2 segments (was 3 with the long link): <= 306 GSM chars
    for (const bucket of ['love', 'money', 'purpose', 'specific', null]) {
      expect(buildSmsBody(2, { ...ctx, bucket, firstName: 'Christina', magicToken: tok }).length).toBeLessThanOrEqual(306);
      expect(buildSmsBody(3, { ...ctx, bucket, firstName: 'Christina', magicToken: tok }).length).toBeLessThanOrEqual(306);
    }
  });

  it('no token (no active V2 account) ⇒ falls back to the public /evelyn lander', () => {
    expect(buildSmsBody(2, { ...ctx, magicToken: null })).toContain(`${BASE}/s/2 `);
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

describe('SMS texts — EXACTLY as Joel approved them (23 Nov 2026; "ritual" + short link 24 Nov)', () => {
  const ctx = { firstName: 'Sarah', bucket: 'love', linkBase: BASE };
  it('text 1, right after purchase', () => {
    expect(buildSmsBody(1, ctx)).toBe(
      "The Seer Within: Thank you, Sarah. Evelyn here. I've begun your Energy Clearing Ritual. " +
      'Your ritual arrives by email in about 24 hours. Up to 3 msgs/week. Msg & data rates may apply. ' +
      'Reply HELP for help, STOP to opt out.',
    );
  });
  it('text 2, day 4', () => {
    expect(buildSmsBody(2, ctx)).toBe(
      "The Seer Within: Sarah, it's Evelyn. I hope your ritual spoke to you. If it stirred questions about love, " +
      `I'm here to talk: ${BASE}/s/2 Reply STOP to opt out`,
    );
  });
  it('text 3, day 7', () => {
    expect(buildSmsBody(3, ctx)).toBe(
      "The Seer Within: Sarah, it's Evelyn. Your ritual holds guidance for the weeks ahead. " +
      'Want me with you as it unfolds? First minutes are on me: ' +
      `${BASE}/s/3 Reply STOP to opt out`,
    );
  });
  it('/fb-tarot buyers are in the sequence (their main product is the Energy Clearing Ritual too)', () => {
    expect(SMS_SEQUENCE_FUNNELS.has('v1-tarot')).toBe(true);
    expect(SMS_SEQUENCE_FUNNELS.has('v1-read')).toBe(true);
  });
  it('/fb buyers (incl. belief lanes) are in the sequence; /fb2, /gdn, /fb-palm are not', () => {
    expect(SMS_SEQUENCE_FUNNELS.has('v1-fb')).toBe(true);
    expect(SMS_SEQUENCE_FUNNELS.has('v1-fb2')).toBe(false);
    expect(SMS_SEQUENCE_FUNNELS.has('v1-gdn')).toBe(false);
    expect(SMS_SEQUENCE_FUNNELS.has('v1-palm')).toBe(false);
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
    expect(isInSendWindow(new Date('2026-10-09T23:59:00Z'))).toBe(true);  // 7:59pm ET
    expect(isInSendWindow(new Date('2026-10-10T00:00:00Z'))).toBe(false); // 8pm ET
    // Winter (EST, UTC-5): 1pm ET = 18:00Z, 8pm ET = 01:00Z next day.
    expect(isInSendWindow(new Date('2026-11-24T17:59:00Z'))).toBe(false); // 12:59pm ET
    expect(isInSendWindow(new Date('2026-11-24T18:00:00Z'))).toBe(true);  // 1pm ET = 10am PT
    expect(isInSendWindow(new Date('2026-11-25T00:59:00Z'))).toBe(true);  // 7:59pm ET
    expect(isInSendWindow(new Date('2026-11-25T01:00:00Z'))).toBe(false); // 8pm ET
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
    expect(smsLink(2, 'https://x.test/')).toBe('https://x.test/s/2');
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
