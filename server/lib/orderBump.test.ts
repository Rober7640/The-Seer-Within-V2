// Unit tests for the V1 order-bump shared module (node:test — run with
// `npx tsx --test server/lib/orderBump.test.ts`).
//
// Lives here rather than next to the module because this is the directory the
// node:test glob covers; the module itself is in shared/ precisely because the
// CLIENT renders the offer from it and the SERVER prices the line item from it.
// If those two ever disagreed about which topic was offered, a buyer would be
// charged for a reading other than the one she said yes to — which is what these
// tests exist to prevent.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  BUMP_PAIRINGS,
  BUMP_TOPIC_LABELS,
  V1_BUMP_CENTS,
  V1_BUMP_PRICE_LABEL,
  V1_BUMP_PRODUCT_KEY,
  V1_BUMP_DESCRIPTION_MARKER,
  V1_BUMP_PRODUCT_NAME,
  bumpLineDescription,
  bumpProductName,
  paymentIntentDescription,
  bumpOfferCopy,
  isBumpBucket,
  pairedBumpBucket,
  type BumpBucket,
} from '../../shared/orderBump';

const ALL_BUCKETS: BumpBucket[] = ['love', 'money', 'purpose', 'someone'];

describe('BUMP_PAIRINGS', () => {
  it('pairs each bucket exactly as specified', () => {
    assert.equal(BUMP_PAIRINGS.love, 'money');
    assert.equal(BUMP_PAIRINGS.money, 'love');
    assert.equal(BUMP_PAIRINGS.purpose, 'love');
    assert.equal(BUMP_PAIRINGS.someone, 'love');
  });

  it('covers every bucket — a missing entry would offer `undefined`', () => {
    for (const b of ALL_BUCKETS) {
      assert.ok(BUMP_PAIRINGS[b], `no pairing for ${b}`);
    }
  });

  // THE invariant. Pairing a bucket to itself would have Evelyn offer a second
  // reading on the topic she is already reading — an obvious refund request.
  it('never pairs a bucket with itself', () => {
    for (const b of ALL_BUCKETS) {
      assert.notEqual(BUMP_PAIRINGS[b], b, `${b} pairs to itself`);
    }
  });

  // Guards the naming mistake this design already made once: `bumpProduct` was
  // briefly 'money_path_reading', but LOVE is the second topic in 3 of the 4
  // pairings, so a money-flavoured product name is wrong most of the time.
  it('offers love more often than money, so the product name stays neutral', () => {
    const paired = ALL_BUCKETS.map((b) => BUMP_PAIRINGS[b]);
    assert.equal(paired.filter((p) => p === 'love').length, 3);
    assert.equal(paired.filter((p) => p === 'money').length, 1);
    assert.ok(
      !V1_BUMP_PRODUCT_KEY.includes('money') && !V1_BUMP_PRODUCT_KEY.includes('love'),
      'bumpProduct must be bucket-agnostic',
    );
  });
});

describe('isBumpBucket', () => {
  it('accepts the four real buckets', () => {
    for (const b of ALL_BUCKETS) assert.equal(isBumpBucket(b), true);
  });

  // This is the guard standing between an untrusted request body and Stripe
  // metadata that Mike's n8n flow reads.
  it('rejects anything else', () => {
    for (const junk of [null, undefined, '', 'LOVE', 'romance', 0, 1, {}, [], true]) {
      assert.equal(isBumpBucket(junk), false, `accepted ${JSON.stringify(junk)}`);
    }
  });
});

describe('pairedBumpBucket', () => {
  it('returns the paired topic for a real bucket', () => {
    assert.equal(pairedBumpBucket('love'), 'money');
    assert.equal(pairedBumpBucket('money'), 'love');
  });

  it('falls back to love for a missing or junk bucket', () => {
    // A lead with no recorded bucket still gets a coherent offer rather than the
    // offer silently collapsing to `undefined`.
    assert.equal(pairedBumpBucket(undefined), 'love');
    assert.equal(pairedBumpBucket(null), 'love');
    assert.equal(pairedBumpBucket('nonsense'), 'love');
  });

  it('always returns something isBumpBucket accepts', () => {
    for (const input of [...ALL_BUCKETS, null, undefined, 'junk', 42]) {
      assert.equal(isBumpBucket(pairedBumpBucket(input)), true);
    }
  });
});

describe('price', () => {
  // $12.77, not $12 — the spec body said 1200 but the source case study and
  // Lewis both say 12.77. Wrong here = wrong charge.
  it('is 1277 cents and renders as $12.77', () => {
    assert.equal(V1_BUMP_CENTS, 1277);
    assert.equal(V1_BUMP_PRICE_LABEL, '$12.77');
  });

  it('makes a $35 main offer total $47.77', () => {
    assert.equal(3500 + V1_BUMP_CENTS, 4777);
  });
});

describe('checkout line item', () => {
  // The "+" is what makes the second Stripe line read as an ADDITION to the
  // reading above rather than an unrelated second product (Lewis, 2026-08-04).
  it('opens with a + so it reads as an add-on', () => {
    assert.ok(V1_BUMP_PRODUCT_NAME.startsWith('+ '), V1_BUMP_PRODUCT_NAME);
  });

  // The NAME must stay identical for all four topics — four different product
  // names would be four cases for Mike's fulfilment flow, for one product.
  it('has a bucket-agnostic name; the topic lives in the description', () => {
    const n = V1_BUMP_PRODUCT_NAME.toLowerCase();
    for (const word of ['love', 'money', 'purpose', 'someone']) {
      assert.ok(!n.includes(word), `product name leaks the bucket: ${word}`);
    }
    assert.notEqual(bumpLineDescription('money'), bumpLineDescription('love'));
  });

  // The bump ships to fb-palm AND fb-tarot, so the line item has to say which —
  // exactly as the main product line does. Same suffix, same source.
  it('carries the funnel suffix, matching the main product line', () => {
    assert.equal(bumpProductName(' - PALM'), '+ Double Your Reading Add-On - PALM');
    assert.equal(bumpProductName(' - TAROT'), '+ Double Your Reading Add-On - TAROT');
    assert.notEqual(bumpProductName(' - PALM'), bumpProductName(' - TAROT'));
  });

  it('still opens with the + once the suffix is applied', () => {
    for (const suffix of [' - PALM', ' - TAROT', '']) {
      assert.ok(bumpProductName(suffix).startsWith('+ '), bumpProductName(suffix));
    }
  });

  // Base V1 traffic has no suffix — the name must stay clean, not gain a stray
  // separator (fbSuffix returns '' for unknown/base funnels).
  it('is unchanged for a funnel with no suffix', () => {
    assert.equal(bumpProductName(''), V1_BUMP_PRODUCT_NAME);
  });

  it('describes the exact topic she is buying', () => {
    assert.match(bumpLineDescription('money'), /Money path/);
    assert.match(bumpLineDescription('love'), /Love path/);
    for (const b of ALL_BUCKETS) {
      assert.doesNotMatch(bumpLineDescription(b), /undefined/);
    }
  });
});

describe('paymentIntentDescription (Stripe Dashboard column)', () => {
  const NAME = 'Energy Clearing Ritual - PALM';

  // THE regression guard. A normal order's description must be byte-identical to
  // what it was before the bump existed — this field is how every non-bump order
  // has always been identified in the payments list.
  it('is untouched for a normal order', () => {
    assert.equal(paymentIntentDescription(NAME), NAME);
    assert.equal(paymentIntentDescription(NAME, {}), NAME);
    assert.equal(paymentIntentDescription(NAME, { bump: false }), NAME);
  });

  it('marks a bump order so two-product orders are visible at a glance', () => {
    assert.equal(
      paymentIntentDescription(NAME, { bump: true }),
      'Energy Clearing Ritual - PALM + Double Reading',
    );
  });

  // The no-optin arm's existing marker must keep working, and stay last.
  it('keeps the no-email marker, in the same position, with or without a bump', () => {
    assert.equal(
      paymentIntentDescription(NAME, { noemail: true }),
      'Energy Clearing Ritual - PALM - No email',
    );
    assert.equal(
      paymentIntentDescription(NAME, { bump: true, noemail: true }),
      'Energy Clearing Ritual - PALM + Double Reading - No email',
    );
  });

  // The marker is internal reporting only — it must never reach the customer,
  // whose view comes from the line-item name.
  it('never leaks into the customer-facing product name', () => {
    assert.ok(!bumpProductName(' - PALM').includes(V1_BUMP_DESCRIPTION_MARKER));
    for (const b of ALL_BUCKETS) {
      assert.ok(!bumpLineDescription(b).includes(V1_BUMP_DESCRIPTION_MARKER));
    }
  });
});

describe('bumpOfferCopy', () => {
  it('names the paired topic and quotes the real price', () => {
    const copy = bumpOfferCopy('money');
    assert.match(copy, /Money path/);
    assert.match(copy, /\$12\.77/);
  });

  it('produces copy for every bucket with no undefined leaking in', () => {
    for (const b of ALL_BUCKETS) {
      const copy = bumpOfferCopy(b);
      assert.ok(copy.length > 0);
      assert.doesNotMatch(copy, /undefined/);
      assert.match(copy, new RegExp(BUMP_TOPIC_LABELS[b]));
    }
  });
});
