// Offer 11 — The Unsent Letter: the receipt's order lookup, poll and copy.
//
//   npx vitest run client/src/lib/unsentLetterReceipt.test.ts
//
// Copy sources: docs/11/booking-page/11-T1-thank-you-page.md, docs/11/order-emails/11-T3, 11-T4.

import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  EMAIL_SUBJECTS,
  GIFT_HANDOFF_URL,
  LETTER_GIFT,
  RECEIPT_BUMP_PS,
  UNSENT_LETTER_TY_CAMPAIGN,
  letterGiftHref,
  letterGiftLine,
  loadLetterGiftHref,
  loadLetterReceipt,
  lookupLetterReceipt,
  orderLookupUrl,
  receiptFirstName,
  receiptPostscript,
  receiptSessionId,
  type ReceiptFetch,
} from './unsentLetterReceipt';

const file = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const flat = (s: string) => s.replace(/[`*]/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
const DOCS = '../../../improve-v1/v1-one-time-BEs/docs/11';
const T1 = flat(file(`${DOCS}/booking-page/11-T1-thank-you-page.md`));
const T3 = flat(file(`${DOCS}/order-emails/11-T3-confirmation.md`));
const T4 = flat(file(`${DOCS}/order-emails/11-T4-delivery.md`));
const PAGE = flat(file('../pages/offers/unsent-letter/ThankYouPage.tsx'));

const reply = (status: number, body: unknown = {}): ReceiptFetch =>
  vi.fn(async () => ({ status, ok: status >= 200 && status < 300, json: async () => body }));

const paid = (o: Record<string, unknown> = {}) => ({
  order: { offer: 'unsent-letter', status: 'paid', firstName: 'Sarah', bumpPurchased: false, deliveredAt: null, ...o },
});

describe('the gift', () => {
  it('its words are T1’s, word for word', () => {
    for (const line of [LETTER_GIFT.writing, LETTER_GIFT.delivered]) expect(T1).toContain(line);
    expect(T1).toContain(`${LETTER_GIFT.stubLabel} · ${LETTER_GIFT.stubAmount}`);
    expect(T1).toContain(`${LETTER_GIFT.eyebrow} · ${LETTER_GIFT.title} · ${LETTER_GIFT.withName}`);
    expect(T1).toContain(`${LETTER_GIFT.button} →`);
  });

  it('carries none of the banned words, and no price', () => {
    for (const line of Object.values(LETTER_GIFT)) {
      expect(line).not.toMatch(/\b(energy|journey|universe|perhaps)\b/i);
      expect(line).not.toMatch(/\$\d/);
    }
  });

  it('a sent reading is never still being written', () => {
    expect(letterGiftLine({ delivered: false })).toBe(LETTER_GIFT.writing);
    expect(letterGiftLine({ delivered: true })).toBe(LETTER_GIFT.delivered);
    expect(LETTER_GIFT.delivered).not.toMatch(/\bwrit/i);
  });

  it('a buyer with an account gets a login link, under 11’s tag', () => {
    const href = letterGiftHref({ mode: 'login', token: 'a b' });
    expect(href).toContain('/evelyn?token=a%20b&campaign=be11-ty-evelyn&');
    expect(href).toContain('utm_campaign=evelyn_15');
  });

  it('a new buyer gets a prefilled signup', () => {
    const href = letterGiftHref({ mode: 'signup', email: 'sarah@example.com', firstName: 'Sarah' });
    expect(href).toContain('/evelyn?campaign=be11-ty-evelyn&');
    expect(href).toContain('email=sarah%40example.com');
    expect(href).toContain('name=Sarah');
  });

  it('no name: no name on the link', () => {
    expect(letterGiftHref({ mode: 'signup', email: 's@e.com', firstName: null })).not.toContain('name=');
  });

  it.each([
    ['nothing', null],
    ['no mode', {}],
    ['login with no token', { mode: 'login' }],
    ['signup with no email', { mode: 'signup', firstName: 'Sarah' }],
  ])('%s: no link, so no voucher', (_name, reply) => {
    expect(letterGiftHref(reply)).toBeNull();
  });

  it('posts the session, and a failed call is just no voucher', async () => {
    const ok = vi.fn(async () => ({ ok: true, json: async () => ({ mode: 'login', token: 't' }) }));
    expect(await loadLetterGiftHref('cs_1', ok)).toContain('token=t');
    expect(ok).toHaveBeenCalledWith(GIFT_HANDOFF_URL, expect.objectContaining({ method: 'POST', body: '{"sessionId":"cs_1"}' }));
    expect(await loadLetterGiftHref('cs_1', async () => ({ ok: false, json: async () => ({}) }))).toBeNull();
    expect(await loadLetterGiftHref('cs_1', async () => { throw new Error('offline'); })).toBeNull();
  });

  it('the tag is the same on the receipt, the lander and the server', () => {
    expect(UNSENT_LETTER_TY_CAMPAIGN).toBe('be11-ty-evelyn');
    expect(file('../pages/EvelynLanderPage.tsx')).toContain(`"${UNSENT_LETTER_TY_CAMPAIGN}"`);
    expect(file('../../../server/lib/unsentLetterTyGift.ts')).toContain(`UNSENT_LETTER_TY_CAMPAIGN = '${UNSENT_LETTER_TY_CAMPAIGN}'`);
  });

  it('the /fb tag still reaches the lander exactly as before', () => {
    expect(file('../pages/EvelynLanderPage.tsx')).toContain('"v1-ty-evelyn"');
    expect(file('../pages/SuccessPage.tsx')).toContain('campaign=v1-ty-evelyn&utm_source=v1_ty');
  });

  it('only a verified receipt can show it', () => {
    const page = file('../pages/offers/unsent-letter/ThankYouPage.tsx');
    expect(page.slice(page.indexOf('function FallbackReceipt'), page.indexOf('function LetterGift'))).not.toContain('<LetterGift');
    expect(page.slice(page.indexOf('function VerifiedReceipt'))).toContain('<LetterGift');
  });
});

describe('the words', () => {
  it('T3’s subject and T4’s title are word for word what T1 prints', () => {
    expect(T1).toContain(EMAIL_SUBJECTS.confirmed);
    expect(T3).toContain(EMAIL_SUBJECTS.confirmed);
    const title = EMAIL_SUBJECTS.delivered('%FIRSTNAME%');
    for (const doc of [T1, T3, T4]) expect(doc).toContain(title);
  });

  it('with no name the title reads "dear — your letter is written out"', () => {
    expect(EMAIL_SUBJECTS.delivered(receiptFirstName(null))).toBe('dear — your letter is written out');
    expect(T1).toContain('dear — your letter is written out');
  });

  it('the P.S. is T1’s, word for word', () => {
    expect(T1).toContain(RECEIPT_BUMP_PS);
  });

  it.each([
    "They've had it long enough, and you said so.",
    "Your twelve are on my table now, and I've started.",
    "It's written out, and your reading's been sent. Look for this title:",
    "There's nothing else to do. You don't write to anyone.",
    "I can't show your order on this page just now.",
    'Confirming your order.',
  ])('the page prints: %s', (line) => {
    expect(T1).toContain(line);
    expect(PAGE).toContain(line);
  });

  it('no time of day, no price, no sell, no banned word on the page', () => {
    expect(PAGE).not.toMatch(/\btonight\b|\btomorrow\b|by morning|\$\d|\bnumerolog|\bjourney|\benergy|\bclearing/i);
  });
});

describe('receiptPostscript', () => {
  it('bump buyers only', () => {
    expect(receiptPostscript({ bumpPurchased: true })).toBe(RECEIPT_BUMP_PS);
    expect(receiptPostscript({ bumpPurchased: false })).toBeNull();
  });
});

describe('receiptFirstName', () => {
  it('her name, or dear; "Friend" is a placeholder, not a name', () => {
    expect(receiptFirstName('Sarah')).toBe('Sarah');
    expect(receiptFirstName(null)).toBe('dear');
    expect(receiptFirstName('')).toBe('dear');
    expect(receiptFirstName('Friend')).toBe('dear');
  });
});

describe('receiptSessionId', () => {
  it('takes ?s= or Stripe’s ?session_id=', () => {
    expect(receiptSessionId('?s=cs_1')).toBe('cs_1');
    expect(receiptSessionId('?session_id=cs_2')).toBe('cs_2');
    expect(receiptSessionId('')).toBeNull();
    expect(receiptSessionId('?s=%20')).toBeNull();
  });
});

describe('lookupLetterReceipt', () => {
  it('asks for this offer only', () => {
    expect(orderLookupUrl('cs/1')).toBe('/api/backend/order/cs%2F1?offer=unsent-letter');
  });

  it('a paid order of this offer is verified', async () => {
    expect(await lookupLetterReceipt('cs_1', reply(200, paid({ bumpPurchased: true })))).toEqual({
      kind: 'verified',
      order: { firstName: 'Sarah', bumpPurchased: true, delivered: false },
    });
  });

  it('deliveredAt turns on the delivered variant', async () => {
    const result = await lookupLetterReceipt('cs_1', reply(200, paid({ deliveredAt: '2026-11-02T10:00:00Z' })));
    expect(result).toMatchObject({ kind: 'verified', order: { delivered: true } });
  });

  it('only a literal true is a bump', async () => {
    const result = await lookupLetterReceipt('cs_1', reply(200, paid({ bumpPurchased: 'true' })));
    expect(result).toMatchObject({ order: { bumpPurchased: false } });
  });

  it.each([
    ['another offer', reply(200, paid({ offer: 'twin-flame' })), { kind: 'unverified', reason: 'not-found' }],
    ['refunded', reply(200, paid({ status: 'refunded' })), { kind: 'unverified', reason: 'unpaid' }],
    ['400', reply(400), { kind: 'unverified', reason: 'not-found' }],
    ['404', reply(404), { kind: 'unverified', reason: 'not-found' }],
    ['402 asks again', reply(402), { kind: 'pending', reason: 'unpaid' }],
    ['500 asks again', reply(500), { kind: 'pending', reason: 'error' }],
  ])('%s', async (_name, fetchImpl, expected) => {
    expect(await lookupLetterReceipt('cs_1', fetchImpl)).toEqual(expected);
  });

  it('a body that is not JSON is unverified', async () => {
    const fetchImpl: ReceiptFetch = async () => ({ status: 200, ok: true, json: async () => { throw new Error('html'); } });
    expect(await lookupLetterReceipt('cs_1', fetchImpl)).toEqual({ kind: 'unverified', reason: 'error' });
  });

  it('offline asks again', async () => {
    const fetchImpl: ReceiptFetch = async () => { throw new Error('offline'); };
    expect(await lookupLetterReceipt('cs_1', fetchImpl)).toEqual({ kind: 'pending', reason: 'error' });
  });
});

describe('loadLetterReceipt', () => {
  it('no session id fetches nothing', async () => {
    const fetchImpl = reply(200, paid());
    expect(await loadLetterReceipt(null, { fetchImpl })).toEqual({ kind: 'unverified', reason: 'missing' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('polls through the webhook race, then verifies', async () => {
    let calls = 0;
    const fetchImpl: ReceiptFetch = async () => {
      calls += 1;
      return calls < 3
        ? { status: 402, ok: false, json: async () => ({}) }
        : { status: 200, ok: true, json: async () => paid() };
    };
    const result = await loadLetterReceipt('cs_1', { fetchImpl, sleep: async () => {} });
    expect(result.kind).toBe('verified');
    expect(calls).toBe(3);
  });

  it('gives up when the window closes', async () => {
    let t = 0;
    const result = await loadLetterReceipt('cs_1', {
      fetchImpl: reply(402),
      now: () => t,
      sleep: async (ms) => { t += ms; },
    });
    expect(result).toEqual({ kind: 'unverified', reason: 'unpaid' });
  });
});
