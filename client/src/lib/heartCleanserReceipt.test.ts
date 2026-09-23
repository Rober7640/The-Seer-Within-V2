// Offer 09 — the Heart Cleanser Love Charm: receipt page order lookup.
//
//   npx vitest run client/src/lib/heartCleanserReceipt.test.ts
//
// Copy source: improve-v1/v1-one-time-BEs/docs/09/booking-page/09-T1-thank-you-page.md
// ⛔ The page may print receipt lines, an amount or an address ONLY for an order
// verified as THIS offer's. Everything else gets the one safe fallback.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  EMAIL_SUBJECTS,
  loadHeartCleanserReceipt,
  orderLookupUrl,
  receiptFirstName,
  RECEIPT_BUMP_LINE,
  RECEIPT_PAID_LABEL,
} from './heartCleanserReceipt';

type FetchLike = (url: string) => Promise<{ status: number; ok: boolean; json: () => Promise<unknown> }>;

function respond(status: number, body: unknown): FetchLike {
  return async () => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  });
}

const ORDER_09 = {
  reference: 'ABCD1234',
  offer: 'heart-cleanser',
  firstName: 'Sarah',
  email: 'sarah@example.com',
  amountCents: 5900,
  shipping: 'Sarah Lee\n1 Main St\nAustin, TX 78701\nUS',
};

describe('orderLookupUrl', () => {
  it('asks the server for THIS offer’s order only, with the session id encoded', () => {
    expect(orderLookupUrl('cs_test_a/b')).toBe('/api/backend/order/cs_test_a%2Fb?offer=heart-cleanser');
  });
});

describe('loadHeartCleanserReceipt', () => {
  it('no ?s= → unverified (missing), and nothing is fetched', async () => {
    let called = false;
    const fetchImpl: FetchLike = async () => {
      called = true;
      throw new Error('should not fetch');
    };
    expect(await loadHeartCleanserReceipt(null, fetchImpl)).toEqual({ kind: 'unverified', reason: 'missing' });
    expect(await loadHeartCleanserReceipt('   ', fetchImpl)).toEqual({ kind: 'unverified', reason: 'missing' });
    expect(called).toBe(false);
  });

  it('a 09 order → verified, with only the name, the address and the bump flag the page prints', async () => {
    const state = await loadHeartCleanserReceipt('cs_test_1', respond(200, { order: ORDER_09 }));
    expect(state).toEqual({
      kind: 'verified',
      order: { firstName: 'Sarah', shipping: ORDER_09.shipping, bumpPurchased: false },
    });
  });

  it('a 09 order with no address yet → verified with shipping null (the page prints the fallback line)', async () => {
    const state = await loadHeartCleanserReceipt(
      'cs_test_1',
      respond(200, { order: { ...ORDER_09, shipping: null } }),
    );
    expect(state).toEqual({ kind: 'verified', order: { firstName: 'Sarah', shipping: null, bumpPurchased: false } });
    const blank = await loadHeartCleanserReceipt('cs_test_1', respond(200, { order: { ...ORDER_09, shipping: '  ' } }));
    expect(blank).toEqual({ kind: 'verified', order: { firstName: 'Sarah', shipping: null, bumpPurchased: false } });
  });

  it('a 09 order with the Reiki bump → bumpPurchased true (the page prints the Added line)', async () => {
    const state = await loadHeartCleanserReceipt(
      'cs_test_1',
      respond(200, { order: { ...ORDER_09, amountCents: 7011, bumpPurchased: true, bumpProductKey: 'reiki_charge' } }),
    );
    expect(state).toEqual({
      kind: 'verified',
      order: { firstName: 'Sarah', shipping: ORDER_09.shipping, bumpPurchased: true },
    });
  });

  it('only a literal true shows the bump line — never a truthy string or number', async () => {
    for (const bumpPurchased of ['1', 1, 'true', null, undefined]) {
      const state = await loadHeartCleanserReceipt('cs_test_1', respond(200, { order: { ...ORDER_09, bumpPurchased } }));
      expect(state.kind === 'verified' && state.order.bumpPurchased, String(bumpPurchased)).toBe(false);
    }
  });

  it('another offer’s order is never shown, even if the server hands one back', async () => {
    const state = await loadHeartCleanserReceipt(
      'cs_test_1',
      respond(200, { order: { ...ORDER_09, offer: 'pixiu-bracelet' } }),
    );
    expect(state).toEqual({ kind: 'unverified', reason: 'not-found' });
  });

  it('a 200 with no order → not-found', async () => {
    expect(await loadHeartCleanserReceipt('cs_test_1', respond(200, { order: null }))).toEqual({
      kind: 'unverified',
      reason: 'not-found',
    });
  });

  it('404 and 400 → not-found; 402 → unpaid; 5xx → error', async () => {
    expect(await loadHeartCleanserReceipt('cs_x', respond(404, { error: 'Order not found.' }))).toEqual({
      kind: 'unverified',
      reason: 'not-found',
    });
    expect(await loadHeartCleanserReceipt('bad', respond(400, { error: 'Invalid session.' }))).toEqual({
      kind: 'unverified',
      reason: 'not-found',
    });
    expect(await loadHeartCleanserReceipt('cs_x', respond(402, { error: 'This order has not been paid.' }))).toEqual({
      kind: 'unverified',
      reason: 'unpaid',
    });
    expect(await loadHeartCleanserReceipt('cs_x', respond(500, { error: 'Could not load your order.' }))).toEqual({
      kind: 'unverified',
      reason: 'error',
    });
  });

  it('a network failure or a non-JSON body → error', async () => {
    const offline: FetchLike = async () => {
      throw new TypeError('Failed to fetch');
    };
    expect(await loadHeartCleanserReceipt('cs_x', offline)).toEqual({ kind: 'unverified', reason: 'error' });
    const html: FetchLike = async () => ({
      status: 200,
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    });
    expect(await loadHeartCleanserReceipt('cs_x', html)).toEqual({ kind: 'unverified', reason: 'error' });
  });
});

describe('receiptFirstName', () => {
  it('falls back to "dear" for the Friend placeholder or no name', () => {
    expect(receiptFirstName('Sarah')).toBe('Sarah');
    expect(receiptFirstName('Friend')).toBe('dear');
    expect(receiptFirstName('')).toBe('dear');
    expect(receiptFirstName(null)).toBe('dear');
  });
});

describe('receipt constants', () => {
  const subjectOf = (file: string) => {
    const md = readFileSync(
      new URL(`../../../improve-v1/v1-one-time-BEs/docs/09/${file}`, import.meta.url),
      'utf8',
    );
    return md.match(/\*\*Subject:\*\*\s*(.+)/)?.[1].trim();
  };

  it('names 09-T3’s and 09-T4’s subjects word for word', () => {
    expect(EMAIL_SUBJECTS.confirmed).toBe(subjectOf('order-emails/09-T3-confirmation-email.md'));
    expect(EMAIL_SUBJECTS.shipped).toBe(subjectOf('order-emails/09-T4-shipment-email.md'));
  });

  it('the paid line is the catalog price with free shipping', () => {
    expect(RECEIPT_PAID_LABEL).toBe('$59 (free shipping)');
  });

  it('the bump line is 09-T1’s conditional line word for word, named as the Stripe line item', () => {
    expect(RECEIPT_BUMP_LINE).toEqual({ label: 'Added:', text: 'Reiki charging by Evelyn before packing, $11.11' });
    for (const file of ['booking-page/09-T1-thank-you-page.md', 'booking-page/09-C3-order-bump.md']) {
      const md = readFileSync(new URL(`../../../improve-v1/v1-one-time-BEs/docs/09/${file}`, import.meta.url), 'utf8');
      expect(md, file).toContain(`**${RECEIPT_BUMP_LINE.label}** ${RECEIPT_BUMP_LINE.text}`);
    }
  });
});
