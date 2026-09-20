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

const {
  BACKEND_OFFERS,
  BE_CUSTOMER_TAG,
  deliveredTag,
  purchaseTags,
  purchaseListWrites,
  backendUpsellFor,
  upsellPurchaseTags,
} = await import('./backendCustomerList');
const { addBackendCustomer, markBackendReadingDelivered, addBackendUpsellCustomer } = await import(
  './aweber'
);

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

describe('purchaseListWrites — which list(s) she lands on', () => {
  it('sends a Twin Flame reading buyer to the initial list only', () => {
    expect(purchaseListWrites('twin-flame', false)).toEqual([
      { listId: '6972552', tags: ['be-customer', 'be-02-twin-flame'], role: 'initial' },
    ]);
  });

  it('adds a SECOND write to the order-bump list when she took the bump', () => {
    expect(purchaseListWrites('twin-flame', true)).toEqual([
      { listId: '6972552', tags: ['be-customer', 'be-02-twin-flame'], role: 'initial' },
      { listId: '6972554', tags: ['be-customer', 'be-02-twin-flame', 'be-02-bump'], role: 'bump' },
    ]);
  });

  it('sends a Judgement Day buyer to 02s lists, distinguished only by the be-03 tags', () => {
    // 03 REUSES 02's lists (6972552 initial / 6972554 bump); the operator sets up the
    // 03 Campaign on those lists filtered on the be-03 tag. Two writes, like 02.
    expect(purchaseListWrites('judgement-day', true)).toEqual([
      { listId: '6972552', tags: ['be-customer', 'be-03-judgement-day'], role: 'initial' },
      { listId: '6972554', tags: ['be-customer', 'be-03-judgement-day', 'be-03-bump'], role: 'bump' },
    ]);
  });

  it('sends a Judgement Day reading buyer (no bump) to 02s initial list with the be-03 tag', () => {
    expect(purchaseListWrites('judgement-day', false)).toEqual([
      { listId: '6972552', tags: ['be-customer', 'be-03-judgement-day'], role: 'initial' },
    ]);
  });
});

describe('backend upsell routing — own products, own lists, walled off from V1', () => {
  it('routes the BE Protection Ritual to list 6972555', () => {
    const u = backendUpsellFor('be_protection_ritual');
    expect(u?.listId).toBe('6972555');
    expect(u?.tag).toBe('be-02-upsell1-protection');
  });

  it('routes the BE Bracelet to list 6972556', () => {
    const u = backendUpsellFor('be_bracelet');
    expect(u?.listId).toBe('6972556');
    expect(u?.tag).toBe('be-02-upsell2-bracelet');
  });

  it('does NOT recognise V1s own upsell product keys — those stay on V1s lists', () => {
    expect(backendUpsellFor('protection_ritual')).toBeNull();
    expect(backendUpsellFor('manifestation_bracelet')).toBeNull();
  });

  it('tags an upsell buyer with the base tags plus her product tag', () => {
    expect(upsellPurchaseTags('twin-flame', 'be_protection_ritual')).toEqual([
      'be-customer',
      'be-02-twin-flame',
      'be-02-upsell1-protection',
    ]);
  });

  it('prices the Protection Ritual at $47 and the Bracelet at $47 with a $30 downsell', () => {
    expect(backendUpsellFor('be_protection_ritual')?.priceCents).toBe(4700);
    expect(backendUpsellFor('be_bracelet')?.priceCents).toBe(4700);
    expect(backendUpsellFor('be_bracelet')?.downsellCents).toBe(3000);
  });
});

describe('addBackendCustomer', () => {
  it('writes a Judgement Day initial buyer to 02s initial list (6972552)', async () => {
    const f = okFetch();
    await addBackendCustomer({
      email: 'she@example.com',
      offer: 'judgement-day',
      stripeOrderId: 'cs_test_1',
    });
    expect(f.mock.calls[0][0]).toContain('/accounts/acct-test/lists/6972552/subscribers');
  });

  it('sends the offer tag that fires her thank-you', async () => {
    const f = okFetch();
    await addBackendCustomer({
      email: 'she@example.com',
      firstName: 'Sarah',
      offer: 'judgement-day',
      stripeOrderId: 'cs_test_1',
    });
    // No bump → the single initial write to 6972552 carries the thank-you tag.
    const body = sentBody(f);
    expect(body.tags).toEqual(['be-customer', 'be-03-judgement-day']);
    expect(body.name).toBe('Sarah');
    expect(body.update_existing).toBe(true);
  });

  it('writes a bump buyer to BOTH 02s lists with the be-03 tags', async () => {
    const f = okFetch();
    await addBackendCustomer({
      email: 'she@example.com',
      offer: 'judgement-day',
      stripeOrderId: 'cs_test_1b',
      bumpPurchased: true,
    });
    expect(f).toHaveBeenCalledTimes(2);
    expect(f.mock.calls[0][0]).toContain('/lists/6972552/subscribers'); // initial
    expect(f.mock.calls[1][0]).toContain('/lists/6972554/subscribers'); // bump
    expect(JSON.parse(f.mock.calls[1][1].body).tags).toEqual(['be-customer', 'be-03-judgement-day', 'be-03-bump']);
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

  it('writes a Twin Flame bump buyer to BOTH the initial list and the order-bump list', async () => {
    const f = okFetch();
    await addBackendCustomer({
      email: 'she@example.com',
      firstName: 'Sarah',
      offer: 'twin-flame',
      stripeOrderId: 'cs_bump_1',
      bumpPurchased: true,
    });
    expect(f).toHaveBeenCalledTimes(2);
    const urls = f.mock.calls.map((c) => c[0]);
    expect(urls.some((u: string) => u.includes('/lists/6972552/'))).toBe(true);
    expect(urls.some((u: string) => u.includes('/lists/6972554/'))).toBe(true);
  });

  it('does not send custom fields to the order-bump list (it has none to hold)', async () => {
    const f = okFetch();
    await addBackendCustomer({
      email: 'she@example.com',
      offer: 'twin-flame',
      stripeOrderId: 'cs_bump_2',
      bumpPurchased: true,
    });
    const obCall = f.mock.calls.find((c) => c[0].includes('/lists/6972554/'));
    const obBody = JSON.parse(obCall![1].body);
    expect(obBody).not.toHaveProperty('custom_fields');
    expect(obBody.tags).toEqual(['be-customer', 'be-02-twin-flame', 'be-02-bump']);
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

describe('08 Marcus — its own lists, one order_id field on every write', () => {
  it('routes the reading to 6975749 and the bump to 6975750', () => {
    // A bump buyer carries be-08-speed on BOTH lists — on the reading list so its delivery
    // campaign can detect the 12-hour customer and stop its own 24-hour send.
    expect(purchaseListWrites('marcus-reading', true)).toEqual([
      { listId: '6975749', tags: ['be-customer', 'be-08', 'be-08-speed'], role: 'initial' },
      { listId: '6975750', tags: ['be-customer', 'be-08', 'be-08-speed'], role: 'bump' },
    ]);
  });

  it('a NON-bump reading buyer gets no speed tag on the reading list', () => {
    expect(purchaseListWrites('marcus-reading', false)).toEqual([
      { listId: '6975749', tags: ['be-customer', 'be-08'], role: 'initial' },
    ]);
  });

  it('routes the audio upsell to its own list 6975753', () => {
    expect(backendUpsellFor('be_08_marcus_audio')?.listId).toBe('6975753');
  });

  it('writes order_id (the session id) and NOT the deck stripe_order_id/offer fields', async () => {
    const f = okFetch();
    await addBackendCustomer({
      email: 'she@example.com',
      offer: 'marcus-reading',
      stripeOrderId: 'cs_marcus_1',
    });
    const body = sentBody(f);
    expect(body.custom_fields.order_id).toBe('cs_marcus_1');
    expect(body.custom_fields).not.toHaveProperty('stripe_order_id');
    expect(body.custom_fields).not.toHaveProperty('offer');
  });

  it('carries order_id on BOTH the reading and the bump list', async () => {
    const f = okFetch();
    await addBackendCustomer({
      email: 'she@example.com',
      offer: 'marcus-reading',
      stripeOrderId: 'cs_marcus_2',
      bumpPurchased: true,
    });
    expect(f).toHaveBeenCalledTimes(2);
    const initial = JSON.parse(f.mock.calls.find((c) => c[0].includes('/lists/6975749/'))![1].body);
    const bump = JSON.parse(f.mock.calls.find((c) => c[0].includes('/lists/6975750/'))![1].body);
    expect(initial.custom_fields.order_id).toBe('cs_marcus_2');
    expect(bump.custom_fields.order_id).toBe('cs_marcus_2');
  });

  it('writes the m8_* content fields to the reading list but NOT the bump list', async () => {
    const f = okFetch();
    await addBackendCustomer({
      email: 'she@example.com',
      offer: 'marcus-reading',
      stripeOrderId: 'cs_marcus_c',
      bumpPurchased: true,
      contentFields: { m8_question: 'What are my blind spots?', m8_hours: '12', m8_paid_count: 'seven' },
    });
    const reading = JSON.parse(f.mock.calls.find((c) => c[0].includes('/lists/6975749/'))![1].body);
    const bump = JSON.parse(f.mock.calls.find((c) => c[0].includes('/lists/6975750/'))![1].body);
    // reading list carries the content fields + the order id
    expect(reading.custom_fields.m8_question).toBe('What are my blind spots?');
    expect(reading.custom_fields.m8_hours).toBe('12');
    expect(reading.custom_fields.order_id).toBe('cs_marcus_c');
    // bump list holds only the order id — no content (it has no campaign)
    expect(bump.custom_fields.order_id).toBe('cs_marcus_c');
    expect(bump.custom_fields).not.toHaveProperty('m8_question');
  });

  it('writes the same order_id to the audio upsell list', async () => {
    const f = okFetch();
    await addBackendUpsellCustomer({
      email: 'she@example.com',
      firstName: 'Sarah',
      productKey: 'be_08_marcus_audio',
      offer: 'marcus-reading',
      orderId: 'cs_marcus_3',
    });
    expect(f.mock.calls[0][0]).toContain('/lists/6975753/subscribers');
    const body = sentBody(f);
    expect(body.custom_fields.order_id).toBe('cs_marcus_3');
    expect(body.tags).toEqual(['be-customer', 'be-08', 'be-08-upsell1-audio']);
  });

  it('writes order_id + the audio-confirmation content fields to the audio list', async () => {
    const f = okFetch();
    await addBackendUpsellCustomer({
      email: 'she@example.com',
      productKey: 'be_08_marcus_audio',
      offer: 'marcus-reading',
      orderId: 'cs_marcus_4',
      contentFields: { m8_question: 'What are my blind spots?', m8_hours: '12' },
    });
    const body = sentBody(f);
    expect(body.custom_fields.order_id).toBe('cs_marcus_4');
    expect(body.custom_fields.m8_question).toBe('What are my blind spots?');
    expect(body.custom_fields.m8_hours).toBe('12');
  });
});

describe('addBackendUpsellCustomer — the upsell lands on its OWN list', () => {
  it('writes a Protection Ritual buyer to list 6972555 with her tags and NO custom fields', async () => {
    const f = okFetch();
    await addBackendUpsellCustomer({
      email: 'she@example.com',
      firstName: 'Sarah',
      productKey: 'be_protection_ritual',
      offer: 'twin-flame',
    });
    expect(f.mock.calls[0][0]).toContain('/lists/6972555/subscribers');
    const body = sentBody(f);
    expect(body.tags).toEqual(['be-customer', 'be-02-twin-flame', 'be-02-upsell1-protection']);
    expect(body).not.toHaveProperty('custom_fields');
  });

  it('refuses to write for a V1 upsell key — those stay on V1s lists', async () => {
    const f = okFetch();
    const result = await addBackendUpsellCustomer({
      email: 'she@example.com',
      productKey: 'protection_ritual',
      offer: 'twin-flame',
    });
    expect(result.success).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});

describe('per-offer upsell tags', () => {
  it('keeps 02 tags byte-identical', () => {
    expect(upsellPurchaseTags('twin-flame', 'be_protection_ritual'))
      .toEqual(['be-customer', 'be-02-twin-flame', 'be-02-upsell1-protection']);
    expect(upsellPurchaseTags('twin-flame', 'be_bracelet'))
      .toEqual(['be-customer', 'be-02-twin-flame', 'be-02-upsell2-bracelet']);
  });

  it('emits be-03 tags for a judgement-day upsell buyer', () => {
    expect(upsellPurchaseTags('judgement-day', 'be_protection_ritual'))
      .toEqual(['be-customer', 'be-03-judgement-day', 'be-03-upsell1-protection']);
    expect(upsellPurchaseTags('judgement-day', 'be_bracelet'))
      .toEqual(['be-customer', 'be-03-judgement-day', 'be-03-upsell2-bracelet']);
  });

  it('returns [] for an unknown product', () => {
    expect(upsellPurchaseTags('twin-flame', 'be_nope')).toEqual([]);
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

// ─── 09 · the Heart Cleanser Love Charm ────────────────────────────────────────
// A physical offer with NO reading. Its Campaign triggers are the purchase tag
// (thank-you), the SHIPPED tag (tracking email) and — since 09-C3, 2026-09-15 — the BUMP
// tag for the Reiki charging bump, on the shared order-bump list exactly as 06. Literals.
const { markBackendOrderShipped } = await import('./aweber');

describe('09 · the tag strings and lists', () => {
  it('are the exact strings the 09 AWeber Campaigns are triggered by', () => {
    const charm = BACKEND_OFFERS['heart-cleanser'];
    expect(charm.number).toBe('09');
    expect(charm.tag).toBe('be-09-heart-cleanser');
    expect(charm.shippedTag).toBe('be-09-shipped');
    expect(charm.bumpTag).toBe('be-09-bump');
    expect(charm.deliveredTag).toBeUndefined();
    // Same initial AND bump lists as 06 (and 02/03/08), told apart only by tag.
    expect(charm.initialListId).toBe('6972552');
    expect(charm.bumpListId).toBe('6972554');
    expect(charm.initialListId).toBe(BACKEND_OFFERS['pixiu-bracelet'].initialListId);
    expect(charm.bumpListId).toBe(BACKEND_OFFERS['pixiu-bracelet'].bumpListId);
  });

  it('adds be-09-bump only when she took the bump', () => {
    expect(purchaseTags('heart-cleanser', false)).toEqual(['be-customer', 'be-09-heart-cleanser']);
    expect(purchaseTags('heart-cleanser', true)).toEqual(['be-customer', 'be-09-heart-cleanser', 'be-09-bump']);
  });

  it('a bump buyer gets a SECOND write to the order-bump list; a non-bump buyer only the first', () => {
    expect(purchaseListWrites('heart-cleanser', false)).toEqual([
      { listId: '6972552', tags: ['be-customer', 'be-09-heart-cleanser'], role: 'initial' },
    ]);
    expect(purchaseListWrites('heart-cleanser', true)).toEqual([
      { listId: '6972552', tags: ['be-customer', 'be-09-heart-cleanser'], role: 'initial' },
      { listId: '6972554', tags: ['be-customer', 'be-09-heart-cleanser', 'be-09-bump'], role: 'bump' },
    ]);
  });

  it('tags a 09 upsell buyer with be-09 product tags', () => {
    expect(upsellPurchaseTags('heart-cleanser', 'be_protection_ritual'))
      .toEqual(['be-customer', 'be-09-heart-cleanser', 'be-09-upsell1-protection']);
    expect(upsellPurchaseTags('heart-cleanser', 'be_bracelet'))
      .toEqual(['be-customer', 'be-09-heart-cleanser', 'be-09-upsell2-bracelet']);
  });

  it('writes a 09 buyer without the bump to ONE list', async () => {
    const f = okFetch();
    await addBackendCustomer({
      email: 'she@example.com',
      offer: 'heart-cleanser',
      stripeOrderId: 'cs_test_09',
      bumpPurchased: false,
    });
    expect(f).toHaveBeenCalledTimes(1);
    const body = sentBody(f);
    expect(f.mock.calls[0][0]).toContain('/lists/6972552/subscribers');
    expect(body.tags).toEqual(['be-customer', 'be-09-heart-cleanser']);
    expect(body.custom_fields).toEqual({ stripe_order_id: 'cs_test_09', offer: 'heart-cleanser' });
  });

  it('writes a 09 bump buyer to the initial list AND the order-bump list with be-09-bump', async () => {
    const f = okFetch();
    await addBackendCustomer({
      email: 'she@example.com',
      offer: 'heart-cleanser',
      stripeOrderId: 'cs_test_09_bump',
      bumpPurchased: true,
    });
    expect(f).toHaveBeenCalledTimes(2);
    expect(f.mock.calls[0][0]).toContain('/lists/6972552/subscribers');
    expect(JSON.parse(f.mock.calls[0][1].body).tags).toEqual(['be-customer', 'be-09-heart-cleanser']);
    expect(f.mock.calls[1][0]).toContain('/lists/6972554/subscribers');
    expect(JSON.parse(f.mock.calls[1][1].body).tags).toEqual(['be-customer', 'be-09-heart-cleanser', 'be-09-bump']);
  });
});

describe('regression: 06/07/08 tags and lists are unchanged', () => {
  it('keeps every existing literal', () => {
    expect(BACKEND_OFFERS['pixiu-bracelet']).toEqual({
      number: '06',
      name: 'Wishing Bracelet',
      tag: 'be-06-pixiu-bracelet',
      bumpTag: 'be-06-bump',
      deliveredTag: 'be-06-delivered',
      initialListId: '6972552',
      bumpListId: '6972554',
    });
    expect(BACKEND_OFFERS['marcus-daily']).toEqual({
      number: '07',
      name: 'Marcus Daily Tarot',
      tag: 'be-07-marcus-daily',
      bumpTag: 'be-07-bump',
      deliveredTag: 'be-07-delivered',
    });
    // ⚠ 08 moved off the shared BE lists onto its OWN per-product lists in the be08
    // Marcus funnel build (origin/development) — reading 6975749, bump 6975750, plus
    // `order_id` and the bump tag riding the initial write. Re-pinned here so this
    // regression still guards 06/07/08 against drift from the 09 work.
    expect(BACKEND_OFFERS['marcus-reading']).toEqual({
      number: '08',
      name: 'Marcus Personal Reading',
      tag: 'be-08',
      bumpTag: 'be-08-speed',
      deliveredTag: 'be-08-delivered',
      initialListId: '6975749',
      bumpListId: '6975750',
      orderIdField: 'order_id',
      bumpTagOnInitial: true,
    });
    expect(purchaseListWrites('pixiu-bracelet', true)).toEqual([
      { listId: '6972552', tags: ['be-customer', 'be-06-pixiu-bracelet'], role: 'initial' },
      { listId: '6972554', tags: ['be-customer', 'be-06-pixiu-bracelet', 'be-06-bump'], role: 'bump' },
    ]);
  });
});

describe('markBackendOrderShipped — the tracking email trigger', () => {
  const shipped = {
    email: 'she@example.com',
    offer: 'heart-cleanser' as const,
    stripeOrderId: 'cs_test_ship_1',
    carrier: 'USPS',
    trackingNumber: '9400 1000 0000 0000 0000 00',
    trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400100000000000000000',
  };

  it('applies the shipped tag on the 09 initial list with the tracking fields', async () => {
    const f = okFetch();
    const result = await markBackendOrderShipped(shipped);
    expect(result.success).toBe(true);
    expect(f.mock.calls[0][0]).toContain('/accounts/acct-test/lists/6972552/subscribers');
    const body = sentBody(f);
    expect(body.tags).toEqual(['be-09-shipped']);
    expect(body.update_existing).toBe(true);
    expect(body.custom_fields).toEqual({
      stripe_order_id: 'cs_test_ship_1',
      offer: 'heart-cleanser',
      tracking_url: shipped.trackingUrl,
      tracking_number: shipped.trackingNumber,
      carrier: 'USPS',
    });
  });

  it('re-sends stripe_order_id and offer so custom_fields is never a partial wipe', async () => {
    const f = okFetch();
    await markBackendOrderShipped({ ...shipped, carrier: '', trackingNumber: '' });
    const body = sentBody(f);
    expect(body.custom_fields).toEqual({
      stripe_order_id: 'cs_test_ship_1',
      offer: 'heart-cleanser',
      tracking_url: shipped.trackingUrl,
    });
  });

  it('refuses an offer with no shipped tag — no Campaign to fire, so nothing is written', async () => {
    const f = okFetch();
    for (const offer of ['pixiu-bracelet', 'twin-flame'] as const) {
      const result = await markBackendOrderShipped({ ...shipped, offer });
      expect(result.success, offer).toBe(false);
    }
    expect(f).not.toHaveBeenCalled();
  });

  it('refuses a non-https tracking link, and a missing order id', async () => {
    const f = okFetch();
    for (const trackingUrl of ['http://tools.usps.com/x', 'javascript:alert(1)', '', 'not a url']) {
      expect((await markBackendOrderShipped({ ...shipped, trackingUrl })).success, trackingUrl).toBe(false);
    }
    expect((await markBackendOrderShipped({ ...shipped, stripeOrderId: '' })).success).toBe(false);
    expect((await markBackendOrderShipped({ ...shipped, email: '' })).success).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it('reports an AWeber failure instead of swallowing it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const result = await markBackendOrderShipped(shipped);
    expect(result.success).toBe(false);
    expect(result.error).toContain('500');
  });
});

describe('09 has no reading, so no reading-delivery write', () => {
  it('markBackendReadingDelivered refuses heart-cleanser without calling AWeber', async () => {
    const f = okFetch();
    const result = await markBackendReadingDelivered({
      email: 'she@example.com',
      offer: 'heart-cleanser',
      stripeOrderId: 'cs_test_09_d',
      readingUrl: 'https://files.theseerwithin.com/x.pdf',
    });
    expect(result.success).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});
