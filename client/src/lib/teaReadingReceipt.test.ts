// Offer 04 — The Turn: the receipt's order lookup (with its poll), and the bump buyer's P.S.
//
//   npx vitest run client/src/lib/teaReadingReceipt.test.ts
//
// Copy source: improve-v1/v1-one-time-BEs/copy/04/04-T1-thank-you-page.md (receipt)
// ⛔ The page may print receipt lines or the bump's P.S. ONLY for an order verified as THIS
// offer's, and paid. The bump is the Double Turning (operator 2026-10-11) — intangible, so the
// P.S. links nothing. Everything else gets the one safe fallback. ⛔ It never names her cup — the
// cup is drawn at random at checkout and the reading itself is the reveal (operator 2026-10-11).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BACKEND_OFFER_CATALOG } from '@shared/backendOffers';
import {
  EMAIL_SUBJECTS,
  RECEIPT_BUMP_PS,
  RECEIPT_POLL_MS,
  RECEIPT_POLL_WINDOW_MS,
  loadTeaReceipt,
  lookupTeaReceipt,
  orderLookupUrl,
  receiptFirstName,
  receiptPostscript,
  receiptSessionId,
  type ReceiptFetch,
} from './teaReadingReceipt';

const doc = (name: string) =>
  readFileSync(new URL(`../../../improve-v1/v1-one-time-BEs/copy/04/${name}`, import.meta.url), 'utf8');

function respond(status: number, body: unknown): ReceiptFetch {
  return async () => ({ status, ok: status >= 200 && status < 300, json: async () => body });
}

/** Answers in order, repeating the last one. Counts calls. */
function sequence(...answers: Array<{ status: number; body?: unknown } | 'offline'>) {
  let calls = 0;
  const fetchImpl: ReceiptFetch = async () => {
    const a = answers[Math.min(calls, answers.length - 1)];
    calls++;
    if (a === 'offline') throw new TypeError('Failed to fetch');
    return { status: a.status, ok: a.status >= 200 && a.status < 300, json: async () => a.body };
  };
  return { fetchImpl, calls: () => calls };
}

/** A fake clock: sleep() advances it instantly. */
function fakeClock() {
  let t = 1_000_000;
  return { now: () => t, sleep: async (ms: number) => void (t += ms) };
}

const ORDER_04 = {
  reference: 'ABCD1234',
  offer: 'tea-reading',
  offerNumber: '04',
  firstName: 'Sarah',
  email: 'sarah@example.com',
  amountCents: 3500,
  readingCents: 3500,
  bumpPurchased: false,
  bumpCents: 0,
  status: 'paid',
  deliveryHours: 24,
  deliveredAt: null,
};

describe('orderLookupUrl / receiptSessionId', () => {
  it('asks the server for THIS offer’s order only, with the session id encoded', () => {
    expect(orderLookupUrl('cs_test_a/b')).toBe('/api/backend/order/cs_test_a%2Fb?offer=tea-reading');
  });

  it('reads ?s= (the upsell chain’s) and ?session_id= (Stripe’s)', () => {
    expect(receiptSessionId('?s=cs_test_1')).toBe('cs_test_1');
    expect(receiptSessionId('?session_id=cs_test_2')).toBe('cs_test_2');
    expect(receiptSessionId('?s=%20%20')).toBeNull();
    expect(receiptSessionId('')).toBeNull();
  });

  it('the receipt path is the catalog’s successPath', () => {
    expect(BACKEND_OFFER_CATALOG['tea-reading'].successPath).toBe('/offers/wiccan/tea-reading/success');
  });
});

describe('lookupTeaReceipt — one attempt', () => {
  it('a paid 04 order → verified, with only what the page prints', async () => {
    expect(await lookupTeaReceipt('cs_1', respond(200, { order: ORDER_04 }))).toEqual({
      kind: 'verified',
      order: { firstName: 'Sarah', bumpPurchased: false, delivered: false },
    });
  });

  it('⛔ a cup an older server still sends is dropped — the receipt never carries the draw', async () => {
    for (const cup of ['divided-rim', 'sunken-leaf', 'turned-handle']) {
      const s = await lookupTeaReceipt('cs_1', respond(200, { order: { ...ORDER_04, cup } }));
      expect(s.kind).toBe('verified');
      expect(s.kind === 'verified' && 'cup' in s.order, cup).toBe(false);
    }
  });

  it('the bump (bumpPurchased) counts for a literal true only', async () => {
    const yes = await lookupTeaReceipt('cs_1', respond(200, { order: { ...ORDER_04, bumpPurchased: true } }));
    expect(yes.kind === 'verified' && yes.order.bumpPurchased).toBe(true);
    for (const bumpPurchased of ['1', 1, 'true', null, undefined]) {
      const s = await lookupTeaReceipt('cs_1', respond(200, { order: { ...ORDER_04, bumpPurchased } }));
      expect(s.kind === 'verified' && s.order.bumpPurchased, String(bumpPurchased)).toBe(false);
    }
  });

  it('deliveredAt → delivered', async () => {
    const sent = await lookupTeaReceipt(
      'cs_1',
      respond(200, { order: { ...ORDER_04, deliveredAt: '2026-10-12T09:00:00.000Z' } }),
    );
    expect(sent.kind === 'verified' && sent.order.delivered).toBe(true);
  });

  it('another offer’s order is never shown, even if the server hands one back', async () => {
    expect(await lookupTeaReceipt('cs_1', respond(200, { order: { ...ORDER_04, offer: 'heart-cleanser' } }))).toEqual({
      kind: 'unverified',
      reason: 'not-found',
    });
    expect(await lookupTeaReceipt('cs_1', respond(200, { order: null }))).toEqual({ kind: 'unverified', reason: 'not-found' });
  });

  it('a refunded or cancelled row is not a reading on its way', async () => {
    for (const status of ['refunded', 'cancelled']) {
      expect(await lookupTeaReceipt('cs_1', respond(200, { order: { ...ORDER_04, status } }))).toEqual({
        kind: 'unverified',
        reason: 'unpaid',
      });
    }
  });

  it('404/400 are final; 402 and 5xx/offline are worth asking again', async () => {
    expect(await lookupTeaReceipt('cs_1', respond(404, {}))).toEqual({ kind: 'unverified', reason: 'not-found' });
    expect(await lookupTeaReceipt('bad', respond(400, {}))).toEqual({ kind: 'unverified', reason: 'not-found' });
    expect(await lookupTeaReceipt('cs_1', respond(402, {}))).toEqual({ kind: 'pending', reason: 'unpaid' });
    expect(await lookupTeaReceipt('cs_1', respond(500, {}))).toEqual({ kind: 'pending', reason: 'error' });
    expect(await lookupTeaReceipt('cs_1', sequence('offline').fetchImpl)).toEqual({ kind: 'pending', reason: 'error' });
  });

  it('a 200 whose body is not JSON → error', async () => {
    const html: ReceiptFetch = async () => ({
      status: 200,
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    });
    expect(await lookupTeaReceipt('cs_1', html)).toEqual({ kind: 'unverified', reason: 'error' });
  });
});

describe('loadTeaReceipt — the poll through the webhook race', () => {
  it('no ?s= → unverified (missing), and nothing is fetched', async () => {
    const s = sequence({ status: 200, body: { order: ORDER_04 } });
    expect(await loadTeaReceipt(null, { fetchImpl: s.fetchImpl })).toEqual({ kind: 'unverified', reason: 'missing' });
    expect(await loadTeaReceipt('  ', { fetchImpl: s.fetchImpl })).toEqual({ kind: 'unverified', reason: 'missing' });
    expect(s.calls()).toBe(0);
  });

  it('402, 402, then paid → verified on the third ask', async () => {
    const s = sequence({ status: 402 }, { status: 402 }, { status: 200, body: { order: ORDER_04 } });
    const clock = fakeClock();
    const state = await loadTeaReceipt('cs_1', { fetchImpl: s.fetchImpl, ...clock });
    expect(state.kind).toBe('verified');
    expect(s.calls()).toBe(3);
  });

  it('offline then paid → verified', async () => {
    const s = sequence('offline', { status: 200, body: { order: ORDER_04 } });
    expect((await loadTeaReceipt('cs_1', { fetchImpl: s.fetchImpl, ...fakeClock() })).kind).toBe('verified');
  });

  it('402 for the whole window → unverified (unpaid), after ~window/interval asks', async () => {
    const s = sequence({ status: 402 });
    const state = await loadTeaReceipt('cs_1', { fetchImpl: s.fetchImpl, ...fakeClock() });
    expect(state).toEqual({ kind: 'unverified', reason: 'unpaid' });
    expect(s.calls()).toBe(RECEIPT_POLL_WINDOW_MS / RECEIPT_POLL_MS + 1);
  });

  it('a 404 stops at once — no polling a session that is not this offer’s', async () => {
    const s = sequence({ status: 404 });
    expect(await loadTeaReceipt('cs_1', { fetchImpl: s.fetchImpl, ...fakeClock() })).toEqual({
      kind: 'unverified',
      reason: 'not-found',
    });
    expect(s.calls()).toBe(1);
  });

  it('cancelled (the page unmounted) → stops asking', async () => {
    const s = sequence({ status: 402 });
    let cancelled = false;
    const clock = fakeClock();
    const state = await loadTeaReceipt('cs_1', {
      fetchImpl: s.fetchImpl,
      now: clock.now,
      sleep: async (ms) => {
        await clock.sleep(ms);
        cancelled = true;
      },
      isCancelled: () => cancelled,
    });
    expect(state.kind).toBe('unverified');
    expect(s.calls()).toBe(1);
  });
});

describe('receipt copy', () => {
  const T1 = doc('04-T1-thank-you-page.md');

  it('names 04-T3’s subject and 04-T4’s title word for word', () => {
    const subjectOf = (md: string) => md.match(/\*\*Subject:\*\*\s*(.+)/)?.[1].trim();
    expect(EMAIL_SUBJECTS.confirmed).toBe(subjectOf(doc('04-T3-confirmation-email.md')));
    expect(EMAIL_SUBJECTS.delivered('%FIRSTNAME%')).toBe(subjectOf(doc('04-T4-delivery-email.md')));
    expect(T1).toContain(`> ### ${EMAIL_SUBJECTS.delivered('%FIRSTNAME%')}`);
    expect(T1).toContain(`**${EMAIL_SUBJECTS.confirmed}**`);
  });

  it('with no name the title reads "dear — your cup is turned", as T3 and T4 do', () => {
    expect(EMAIL_SUBJECTS.delivered(receiptFirstName(null))).toBe('dear — your cup is turned');
    expect(receiptFirstName('Friend')).toBe('dear');
    expect(receiptFirstName('')).toBe('dear');
    expect(receiptFirstName('Sarah')).toBe('Sarah');
  });

  it('T1 keeps the timing rules: within 24 hours, no tomorrow, no by morning', () => {
    const body = T1.slice(0, T1.indexOf('## Build notes'));
    expect(body).toContain('within **24 hours**');
    expect(body).not.toMatch(/tomorrow|by morning|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i);
    for (const m of body.matchAll(/[^.\n]*\btonight\b[^.\n]*/gi)) expect(m[0]).not.toMatch(/reading arriv|deliver|send it/i);
    expect(body).not.toMatch(/\$\d/);
  });

  it('⛔ T1 names no cup: no "Your reading follows" line, no interpretation’s name', () => {
    const body = T1.slice(0, T1.indexOf('## Build notes'));
    expect(body).not.toMatch(/follows/i);
    expect(body).not.toMatch(/Turned Handle|Divided Rim|Sunken Leaf/);
  });

  it('the bump P.S. is 04-T1’s, word for word — and links nothing', () => {
    expect(RECEIPT_BUMP_PS).toBe(
      "P.S. You added a Double Turning. I'll read your cup a second time before I send your reading. " +
        "There's nothing extra to look out for.",
    );
    expect(T1.replace(/\s+/g, ' ')).toContain(RECEIPT_BUMP_PS);
    expect(T1).not.toMatch(/still[ -]?cup\)|\/still-cup/i);
  });
});

describe('the bump P.S. — the Double Turning (intangible, operator 2026-10-11)', () => {
  it('shows for bump buyers only', () => {
    expect(receiptPostscript({ bumpPurchased: true })).toBe(RECEIPT_BUMP_PS);
    expect(receiptPostscript({ bumpPurchased: false })).toBeNull();
    for (const bumpPurchased of ['1', 1, 'true', null, undefined]) {
      expect(receiptPostscript({ bumpPurchased } as never), String(bumpPurchased)).toBeNull();
    }
  });

  it('follows a verified lookup: bump order → the P.S., no bump → nothing', async () => {
    const yes = await lookupTeaReceipt('cs_1', respond(200, { order: { ...ORDER_04, bumpPurchased: true } }));
    const no = await lookupTeaReceipt('cs_1', respond(200, { order: ORDER_04 }));
    expect(yes.kind === 'verified' && receiptPostscript(yes.order)).toBe(RECEIPT_BUMP_PS);
    expect(no.kind === 'verified' && receiptPostscript(no.order)).toBeNull();
  });

  it('says nothing is delivered: nothing extra to look out for, no link, no Still Cup', () => {
    expect(RECEIPT_BUMP_PS).toMatch(/nothing extra to look out for/);
    expect(RECEIPT_BUMP_PS).toMatch(/a second time/);
    expect(RECEIPT_BUMP_PS).not.toMatch(/https?:|\/offers|open|link|email|tonight|still cup/i);
  });
});
