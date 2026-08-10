// The backend deck's customer list — tags, and the two AWeber writes that use them.
//
//   npx vitest run server/lib/backendCustomerList.test.ts
//
// What these pin down:
//  1. THE TAG STRINGS THEMSELVES. Each one is the trigger on an AWeber Campaign
//     built by hand in a UI with no tests. A rename here is a thank-you email
//     that silently stops sending, discovered by a customer complaint. So the
//     literal strings are asserted, not derived.
//  2. custom_fields IS NEVER EMPTY. AWeber reads `custom_fields: {}` with
//     `update_existing` as "clear every custom field" — the bug that wiped a
//     soulmate buyer's stripe_order_id 11 seconds after she paid.
//  3. THE DELIVERY WRITE RE-SENDS what it did not change, for the same reason.
//  4. Missing ids are REFUSED, not sent. A write with no order id is worse than
//     no write: it upserts a row that later calls corrupt.

import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.AWEBER_ACCOUNT_ID = 'acct-test';
process.env.AWEBER_ACCESS_TOKEN = 'tok-test';
process.env.AWEBER_REFRESH_TOKEN = 'refresh-test';
process.env.AWEBER_BE_CUSTOMER_LIST_ID = 'list-test';

const { BACKEND_OFFERS, BE_CUSTOMER_TAG, deliveredTag, purchaseTags } = await import(
  './backendCustomerList'
);
const { addBackendCustomer, markBackendReadingDelivered } = await import('./aweber');

/** The JSON body of the single AWeber call made by the test. */
function sentBody(fetchMock: ReturnType<typeof vi.fn>): any {
  expect(fetchMock).toHaveBeenCalledTimes(1);
  return JSON.parse(fetchMock.mock.calls[0][1].body);
}

function okFetch() {
  const mock = vi.fn(async () => new Response('{}', { status: 201 }));
  vi.stubGlobal('fetch', mock);
  return mock;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('the tag strings', () => {
  it('are the exact strings the AWeber Campaigns are triggered by', () => {
    expect(BE_CUSTOMER_TAG).toBe('be-customer');
    expect(BACKEND_OFFERS['twin-flame'].tag).toBe('be-02-twin-flame');
    expect(BACKEND_OFFERS['twin-flame'].bumpTag).toBe('be-02-bump');
    expect(BACKEND_OFFERS['twin-flame'].deliveredTag).toBe('be-02-delivered');
    expect(BACKEND_OFFERS['judgement-day'].tag).toBe('be-03-judgement-day');
    expect(BACKEND_OFFERS['judgement-day'].bumpTag).toBe('be-03-bump');
    expect(BACKEND_OFFERS['judgement-day'].deliveredTag).toBe('be-03-delivered');
  });

  it('give every backend buyer the shared tag plus her own offer', () => {
    expect(purchaseTags('judgement-day')).toEqual(['be-customer', 'be-03-judgement-day']);
  });

  it('add the bump tag only when she took the bump', () => {
    expect(purchaseTags('twin-flame', false)).not.toContain('be-02-bump');
    expect(purchaseTags('twin-flame', true)).toContain('be-02-bump');
  });

  it('keeps each offer a separate trigger, so 02 and 03 cannot cross-send', () => {
    const two = new Set(purchaseTags('twin-flame', true));
    const three = new Set(purchaseTags('judgement-day', true));
    expect([...two].filter((t) => three.has(t))).toEqual([BE_CUSTOMER_TAG]);
    expect(deliveredTag('twin-flame')).not.toBe(deliveredTag('judgement-day'));
  });
});

describe('addBackendCustomer', () => {
  it('writes to the list in AWEBER_BE_CUSTOMER_LIST_ID', async () => {
    const f = okFetch();
    await addBackendCustomer({
      email: 'she@example.com',
      offer: 'judgement-day',
      stripeOrderId: 'cs_test_1',
    });
    expect(f.mock.calls[0][0]).toContain('/accounts/acct-test/lists/list-test/subscribers');
  });

  it('sends the offer tag that fires her thank-you', async () => {
    const f = okFetch();
    await addBackendCustomer({
      email: 'she@example.com',
      firstName: 'Sarah',
      offer: 'judgement-day',
      stripeOrderId: 'cs_test_1',
      bumpPurchased: true,
    });
    const body = sentBody(f);
    expect(body.tags).toEqual(['be-customer', 'be-03-judgement-day', 'be-03-bump']);
    expect(body.name).toBe('Sarah');
    expect(body.update_existing).toBe(true);
  });

  it('never sends an empty custom_fields object', async () => {
    const f = okFetch();
    await addBackendCustomer({
      email: 'she@example.com',
      offer: 'twin-flame',
      stripeOrderId: 'cs_test_2',
    });
    const body = sentBody(f);
    expect(Object.keys(body.custom_fields).length).toBeGreaterThan(0);
    expect(body.custom_fields.stripe_order_id).toBe('cs_test_2');
    expect(body.custom_fields.offer).toBe('twin-flame');
  });

  it('carries 03s Entry link when there is one, and omits the field when there is not', async () => {
    const withEntry = okFetch();
    await addBackendCustomer({
      email: 'she@example.com',
      offer: 'judgement-day',
      stripeOrderId: 'cs_test_3',
      entryUrl: 'https://www.theseerwithin.com/wiccan/judgement-day/entry?o=abc',
    });
    expect(sentBody(withEntry).custom_fields.entry_url).toContain('/entry?o=abc');

    vi.unstubAllGlobals();
    const without = okFetch();
    await addBackendCustomer({
      email: 'she@example.com',
      offer: 'judgement-day',
      stripeOrderId: 'cs_test_4',
    });
    expect(sentBody(without).custom_fields).not.toHaveProperty('entry_url');
  });

  it('refuses to write at all without an order id', async () => {
    const f = okFetch();
    const result = await addBackendCustomer({
      email: 'she@example.com',
      offer: 'twin-flame',
      stripeOrderId: '',
    });
    expect(result.success).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it('treats "already subscribed" as success, because a repeat buyer is normal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { message: 'Subscriber already subscribed' } }), {
            status: 400,
          }),
      ),
    );
    const result = await addBackendCustomer({
      email: 'she@example.com',
      offer: 'twin-flame',
      stripeOrderId: 'cs_test_5',
    });
    expect(result.success).toBe(true);
  });

  it('reports failure rather than swallowing it — a failed write is an unsent email', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const result = await addBackendCustomer({
      email: 'she@example.com',
      offer: 'twin-flame',
      stripeOrderId: 'cs_test_6',
    });
    expect(result.success).toBe(false);
  });
});

describe('markBackendReadingDelivered', () => {
  it('sends the reading URL and the delivered tag', async () => {
    const f = okFetch();
    await markBackendReadingDelivered({
      email: 'she@example.com',
      offer: 'judgement-day',
      stripeOrderId: 'cs_test_7',
      readingUrl: 'https://files.theseerwithin.com/be/03/abc.pdf',
    });
    const body = sentBody(f);
    expect(body.custom_fields.reading_url).toContain('abc.pdf');
    expect(body.tags).toEqual(['be-03-delivered']);
  });

  it('re-sends the fields it did not change, so the write cannot clear them', async () => {
    const f = okFetch();
    await markBackendReadingDelivered({
      email: 'she@example.com',
      offer: 'judgement-day',
      stripeOrderId: 'cs_test_8',
      readingUrl: 'https://files.theseerwithin.com/be/03/abc.pdf',
    });
    const body = sentBody(f);
    expect(body.custom_fields.stripe_order_id).toBe('cs_test_8');
    expect(body.custom_fields.offer).toBe('judgement-day');
  });

  it('refuses to fire the delivery email with no reading to point at', async () => {
    const f = okFetch();
    const result = await markBackendReadingDelivered({
      email: 'she@example.com',
      offer: 'judgement-day',
      stripeOrderId: 'cs_test_9',
      readingUrl: '',
    });
    expect(result.success).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});
