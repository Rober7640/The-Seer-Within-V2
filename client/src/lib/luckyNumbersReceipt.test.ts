// Offer 12 — Lucky Numbers: the receipt's order lookup, poll and copy.
//
//   npx vitest run client/src/lib/luckyNumbersReceipt.test.ts
//
// Copy sources: docs/12/booking-page/12-T1-thank-you-page.md, docs/12/order-emails/12-T3, 12-T4.

import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  EMAIL_SUBJECTS,
  GIFT_HANDOFF_URL,
  LUCKY_NUMBERS_TY_CAMPAIGN,
  NUMBERS_GIFT,
  RECEIPT_BUMP_PS,
  loadNumbersGiftHref,
  numbersGiftBring,
  numbersGiftHeadline,
  numbersGiftHref,
  numbersGiftLine,
  loadNumbersReceipt,
  lookupNumbersReceipt,
  orderLookupUrl,
  receiptFirstName,
  receiptPostscript,
  receiptSessionId,
  type ReceiptFetch,
} from './luckyNumbersReceipt';

const file = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const flat = (s: string) => s.replace(/[`*]/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
const DOCS = '../../../improve-v1/v1-one-time-BEs/docs/12';
const T1 = flat(file(`${DOCS}/booking-page/12-T1-thank-you-page.md`));
const T3 = flat(file(`${DOCS}/order-emails/12-T3-confirmation.md`));
const T4 = flat(file(`${DOCS}/order-emails/12-T4-delivery.md`));
const GIFT_DOC = flat(file(`${DOCS}/booking-page/12-T1-gift.md`));
const PAGE_RAW = file('../pages/offers/lucky-numbers/ThankYouPage.tsx');
const PAGE = flat(PAGE_RAW);

const reply = (status: number, body: unknown = {}): ReceiptFetch =>
  vi.fn(async () => ({ status, ok: status >= 200 && status < 300, json: async () => body }));

const paid = (o: Record<string, unknown> = {}) => ({
  order: { offer: 'lucky-numbers', status: 'paid', firstName: 'Sarah', bumpPurchased: false, deliveredAt: null, ...o },
});

describe('the subjects match T1, T3 and T4 word for word', () => {
  it('confirmation', () => {
    for (const doc of [T1, T3]) expect(doc).toContain(EMAIL_SUBJECTS.confirmed);
  });

  it('delivery', () => {
    const subject = EMAIL_SUBJECTS.delivered('%FIRSTNAME%');
    for (const doc of [T1, T3, T4]) expect(doc).toContain(subject);
    expect(EMAIL_SUBJECTS.delivered('dear')).toBe('dear — your lucky numbers are worked out');
  });

  it('the bump P.S.', () => {
    expect(T1).toContain(RECEIPT_BUMP_PS);
    expect(receiptPostscript({ bumpPurchased: true })).toBe(RECEIPT_BUMP_PS);
    expect(receiptPostscript({ bumpPurchased: false })).toBeNull();
  });

  it('every line the page prints is in T1', () => {
    for (const line of [
      'You asked for your own numbers, and that was the right call.',
      "Your name and date are on my table now, and I've started.",
      "There's nothing else to do. Leave your PIN as it is till your reading comes.",
      "Your numbers are worked out, and your reading's been sent. Look for this title:",
      "I can't show your order on this page just now.",
    ]) {
      expect(PAGE).toContain(line);
      expect(T1).toContain(line);
    }
  });
});

// The gift: 11's, with 12's tag and words (operator, 2026-11-03).
describe('the gift', () => {
  it('its words are 12-T1-gift’s, word for word', () => {
    for (const line of [NUMBERS_GIFT.writing, NUMBERS_GIFT.delivered]) expect(GIFT_DOC).toContain(line);
    expect(GIFT_DOC).toContain(`${NUMBERS_GIFT.stubLabel} · ${NUMBERS_GIFT.stubAmount}`);
    expect(GIFT_DOC).toContain(`${NUMBERS_GIFT.eyebrow} · ${NUMBERS_GIFT.title} · ${NUMBERS_GIFT.withName}`);
    expect(GIFT_DOC).toContain(`${NUMBERS_GIFT.button} →`);
    for (const line of [...NUMBERS_GIFT.bring, NUMBERS_GIFT.bringWriting, NUMBERS_GIFT.bringDelivered, NUMBERS_GIFT.note]) {
      expect(GIFT_DOC).toContain(line);
    }
    expect(GIFT_DOC).toContain(numbersGiftHeadline('Sarah'));
    expect(GIFT_DOC).toContain(numbersGiftHeadline(null));
    expect(T1).toContain('12-T1-gift');
  });

  it('carries none of the banned words, no price and no win', () => {
    for (const line of Object.values(NUMBERS_GIFT).flat()) {
      expect(line).not.toMatch(/\b(energy|journey|universe|perhaps|tarot|lava|win|jackpot|lottery|money|cheque)\b/i);
      expect(line).not.toMatch(/\$\d/);
    }
  });

  it('never invites her to ask Evelyn for a number: the chat never works one out', () => {
    for (const line of [...numbersGiftBring({ delivered: false }), ...numbersGiftBring({ delivered: true })]) {
      expect(line).not.toMatch(/\b(number|numbers|pin|date|day|days)\b/i);
    }
  });

  it('the bring list follows the reading: three lines, the last one changes once it is sent', () => {
    expect(numbersGiftBring({ delivered: false })).toEqual([...NUMBERS_GIFT.bring, NUMBERS_GIFT.bringWriting]);
    expect(numbersGiftBring({ delivered: true })).toEqual([...NUMBERS_GIFT.bring, NUMBERS_GIFT.bringDelivered]);
    expect(NUMBERS_GIFT.bringDelivered).not.toMatch(/once your reading/i);
  });

  it('the headline names her, or just invites', () => {
    expect(numbersGiftHeadline('Sarah')).toBe('Come and talk to me, Sarah.');
    expect(numbersGiftHeadline(null)).toBe('Come and talk to me.');
  });

  it('the voucher is 11’s, the same gift', async () => {
    const { LETTER_GIFT } = await import('./unsentLetterReceipt');
    const pick = (g: Record<string, unknown>) => ({
      stubLabel: g.stubLabel, stubAmount: g.stubAmount, eyebrow: g.eyebrow, title: g.title, withName: g.withName,
    });
    expect(pick(NUMBERS_GIFT)).toEqual(pick(LETTER_GIFT));
  });

  it('sent numbers are never still being worked out', () => {
    expect(numbersGiftLine({ delivered: false })).toBe(NUMBERS_GIFT.writing);
    expect(numbersGiftLine({ delivered: true })).toBe(NUMBERS_GIFT.delivered);
    expect(NUMBERS_GIFT.delivered).not.toMatch(/\bwork(ing)? out\b/i);
  });

  it('a buyer with an account gets a login link, under 12’s tag and UTM', () => {
    const href = numbersGiftHref({ mode: 'login', token: 'a b' });
    expect(href).toBe('/evelyn?token=a%20b&campaign=be12-ty-evelyn&utm_source=be12_ty&utm_medium=thankyou&utm_campaign=evelyn_15');
  });

  it('a new buyer gets a prefilled signup', () => {
    const href = numbersGiftHref({ mode: 'signup', email: 'sarah@example.com', firstName: 'Sarah' });
    expect(href).toContain('/evelyn?campaign=be12-ty-evelyn&');
    expect(href).toContain('email=sarah%40example.com');
    expect(href).toContain('name=Sarah');
  });

  it('no name: no name on the link', () => {
    expect(numbersGiftHref({ mode: 'signup', email: 's@e.com', firstName: null })).not.toContain('name=');
  });

  it.each([
    ['nothing', null],
    ['no mode', {}],
    ['login with no token', { mode: 'login' }],
    ['signup with no email', { mode: 'signup', firstName: 'Sarah' }],
  ])('%s: no link, so no voucher', (_name, reply) => {
    expect(numbersGiftHref(reply)).toBeNull();
  });

  it('posts the session to 12’s own handoff, and a failed call is just no voucher', async () => {
    expect(GIFT_HANDOFF_URL).toBe('/api/backend/lucky-numbers/gift-handoff');
    const ok = vi.fn(async () => ({ ok: true, json: async () => ({ mode: 'login', token: 't' }) }));
    expect(await loadNumbersGiftHref('cs_1', ok)).toContain('token=t');
    expect(ok).toHaveBeenCalledWith(GIFT_HANDOFF_URL, expect.objectContaining({ method: 'POST', body: '{"sessionId":"cs_1"}' }));
    expect(await loadNumbersGiftHref('cs_1', async () => ({ ok: false, json: async () => ({}) }))).toBeNull();
    expect(await loadNumbersGiftHref('cs_1', async () => { throw new Error('offline'); })).toBeNull();
  });

  it('the tag is the same on the receipt, the lander and the server', () => {
    expect(LUCKY_NUMBERS_TY_CAMPAIGN).toBe('be12-ty-evelyn');
    expect(file('../pages/EvelynLanderPage.tsx')).toContain(`"${LUCKY_NUMBERS_TY_CAMPAIGN}"`);
    expect(file('../../../server/lib/luckyNumbersTyGift.ts')).toContain(`LUCKY_NUMBERS_TY_CAMPAIGN = '${LUCKY_NUMBERS_TY_CAMPAIGN}'`);
  });

  it('11’s and /fb’s tags still reach the lander exactly as before', () => {
    const lander = file('../pages/EvelynLanderPage.tsx');
    expect(lander).toContain('"v1-ty-evelyn"');
    expect(lander).toContain('"be11-ty-evelyn"');
  });

  it('only a verified receipt can show it', () => {
    expect(PAGE_RAW.slice(PAGE_RAW.indexOf('function FallbackReceipt'), PAGE_RAW.indexOf('function NumbersGift'))).not.toContain('<NumbersGift');
    expect(PAGE_RAW.slice(PAGE_RAW.indexOf('function VerifiedReceipt'))).toContain('<NumbersGift');
  });

  it('the page says the gift is the operator’s decision of 2026-11-03', () => {
    expect(PAGE_RAW).toMatch(/operator's decision on 2026-11-03/);
  });

  it('no price on the page', () => {
    expect(PAGE_RAW).not.toMatch(/\$\d/);
  });
});

describe('the lookup', () => {
  it('asks for this offer only', () => {
    expect(orderLookupUrl('cs_1')).toBe('/api/backend/order/cs_1?offer=lucky-numbers');
  });

  it('a paid 12 order is verified', async () => {
    expect(await lookupNumbersReceipt('cs_1', reply(200, paid({ bumpPurchased: true })))).toEqual({
      kind: 'verified',
      order: { firstName: 'Sarah', bumpPurchased: true, delivered: false },
    });
  });

  it('another offer’s order is never printed', async () => {
    expect(await lookupNumbersReceipt('cs_1', reply(200, paid({ offer: 'unsent-letter' })))).toEqual({
      kind: 'unverified',
      reason: 'not-found',
    });
  });

  it('refunded is unverified; 402 is pending', async () => {
    expect((await lookupNumbersReceipt('cs_1', reply(200, paid({ status: 'refunded' })))).kind).toBe('unverified');
    expect(await lookupNumbersReceipt('cs_1', reply(402))).toEqual({ kind: 'pending', reason: 'unpaid' });
  });

  it('a delivered order says so', async () => {
    const r = await lookupNumbersReceipt('cs_1', reply(200, paid({ deliveredAt: '2027-01-01T00:00:00Z' })));
    expect(r).toMatchObject({ kind: 'verified', order: { delivered: true } });
  });

  it('no ?s= is unverified at once; the poll gives up after its window', async () => {
    expect(await loadNumbersReceipt(null)).toEqual({ kind: 'unverified', reason: 'missing' });
    let t = 0;
    const r = await loadNumbersReceipt('cs_1', {
      fetchImpl: reply(402),
      now: () => t,
      sleep: async (ms) => void (t += ms),
      intervalMs: 2000,
      windowMs: 6000,
    });
    expect(r).toEqual({ kind: 'unverified', reason: 'unpaid' });
  });

  it('?s= or Stripe’s own session_id; "Friend" is never a name', () => {
    expect(receiptSessionId('?s=cs_9')).toBe('cs_9');
    expect(receiptSessionId('?session_id=cs_8')).toBe('cs_8');
    expect(receiptFirstName('Friend')).toBe('dear');
    expect(receiptFirstName('Sarah')).toBe('Sarah');
  });
});
