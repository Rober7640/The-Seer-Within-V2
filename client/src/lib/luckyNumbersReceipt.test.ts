// Offer 12 — Lucky Numbers: the receipt's order lookup, poll and copy.
//
//   npx vitest run client/src/lib/luckyNumbersReceipt.test.ts
//
// Copy sources: docs/12/booking-page/12-T1-thank-you-page.md, docs/12/order-emails/12-T3, 12-T4.

import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import * as receipt from './luckyNumbersReceipt';
import {
  EMAIL_SUBJECTS,
  RECEIPT_BUMP_PS,
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

describe('no gift: that was 11’s alone', () => {
  it('the receipt lib and the page carry no voucher', () => {
    expect(Object.keys(receipt).filter((k) => /gift/i.test(k))).toEqual([]);
    // Comments may name 11's gift to say it isn't here; the code must not.
    const code = PAGE_RAW.replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    expect(code).not.toMatch(/gift|voucher|free chat|15 minutes/i);
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
