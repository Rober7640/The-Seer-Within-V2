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
  V1_BUMP_CENTS_DOWNSELL,
  V1_BUMP_PRICE_LABEL,
  bumpCents,
  bumpPriceLabel,
  resolveBumpCents,
  V1_BUMP_PRODUCT_KEY,
  V1_BUMP_DESCRIPTION_MARKER,
  V1_BUMP_PRODUCT_NAME,
  bumpLineDescription,
  bumpProductName,
  paymentIntentDescription,
  bumpOfferCopy,
  isBumpBucket,
  pairedBumpBucket,
  BUMP_ACCEPT_LABEL,
  BUMP_DECLINE_LABEL,
  bumpCopy,
  isBumpCopyVariant,
  BUMP_COPY_VARIANTS,
  bumpCopyFromPayload,
  resolveBumpExperimentKey,
  type BumpBucket,
  type BumpCopyVariant,
} from '../../shared/orderBump';

const ALL_BUCKETS: BumpBucket[] = ['love', 'money', 'purpose', 'someone'];
const ALL_VARIANTS: BumpCopyVariant[] = ['control', 'A', 'B'];

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

// ─────────────────────────────────────────────────────────────────────────────
// COPY SPLIT TEST (2026-08-11) — see docs/superpowers/specs/2026-08-11-order-
// bump-copy-test.md. Three arms share one checkout path, so the copy each arm
// renders is resolved from ONE table that both the client card and the Stripe
// line item read. These tests exist because the two must never disagree: the
// client showing arm B's offer while Stripe bills arm A's line item is how a
// buyer gets charged for something she did not say yes to.
// ─────────────────────────────────────────────────────────────────────────────

describe('bumpCopy — control arm', () => {
  it('is byte-identical to the shipped copy for every bucket', () => {
    // THE GUARANTEE THAT MAKES THIS SAFE TO DEPLOY DARK. Until an arm is
    // started, every lead resolves to 'control'; if this test passes, merging
    // the split test changes nothing for anyone.
    for (const b of ALL_BUCKETS) {
      const pack = bumpCopy('control', b, 'Sarah');
      assert.equal(pack.offer, bumpOfferCopy(b));
      assert.equal(pack.accept, BUMP_ACCEPT_LABEL);
      assert.equal(pack.decline, BUMP_DECLINE_LABEL);
      assert.equal(pack.productName, V1_BUMP_PRODUCT_NAME);
      assert.equal(pack.lineDescription, bumpLineDescription(b));
    }
  });

  it('ignores firstName — the shipped control copy never used it', () => {
    assert.equal(
      bumpCopy('control', 'money', 'Sarah').offer,
      bumpCopy('control', 'money').offer,
    );
  });
});

describe('bumpCopy — every arm', () => {
  it('quotes the real price, never a hardcoded one', () => {
    // A copy string that drifts from V1_BUMP_CENTS bills an amount the offer
    // did not name. Assert against the label DERIVED from the charge.
    for (const v of ALL_VARIANTS) {
      for (const b of ALL_BUCKETS) {
        assert.match(
          bumpCopy(v, b, 'Sarah').offer,
          new RegExp(V1_BUMP_PRICE_LABEL.replace('$', '\\$').replace('.', '\\.')),
          `${v}/${b} does not quote ${V1_BUMP_PRICE_LABEL}`,
        );
      }
    }
  });

  it('never leaks undefined or an unfilled placeholder', () => {
    for (const v of ALL_VARIANTS) {
      for (const b of ALL_BUCKETS) {
        const pack = bumpCopy(v, b, 'Sarah');
        for (const [field, s] of Object.entries(pack)) {
          assert.ok(s.length > 0, `${v}/${b}/${field} is empty`);
          assert.doesNotMatch(s, /undefined|null|\{firstName\}|\{\w+\}/, `${v}/${b}/${field}`);
        }
      }
    }
  });

  it('keeps the product name free of the topic, for Mike\'s fulfilment', () => {
    // Naming the topic in the PRODUCT would give fulfilment four names for one
    // product. The topic belongs in the line DESCRIPTION only.
    for (const v of ALL_VARIANTS) {
      for (const b of ALL_BUCKETS) {
        assert.doesNotMatch(bumpCopy(v, b, 'Sarah').productName, /Money|Love|Purpose/);
      }
    }
  });
});

describe('bumpCopy — variation A (double-strength ritual)', () => {
  it('never names a topic — it sells the clearing, not a second reading', () => {
    for (const b of ALL_BUCKETS) {
      const pack = bumpCopy('A', b, 'Sarah');
      assert.doesNotMatch(pack.offer, /Money|Love|Purpose/);
      assert.doesNotMatch(pack.lineDescription, /Money|Love|Purpose/);
    }
  });

  it('renders identically for every bucket', () => {
    // A retires the pairing entirely, so the four buckets must be one string.
    const offers = new Set(ALL_BUCKETS.map((b) => bumpCopy('A', b, 'Sarah').offer));
    assert.equal(offers.size, 1);
  });

  it('does NOT promise durability — that gap belongs to Upsell 1', () => {
    // U1 (Protection Ritual, $47) sells "removal is only half the work, shadows
    // creep back". A bump that promises permanence guts the next offer.
    const offer = bumpCopy('A', 'money', 'Sarah').offer;
    assert.doesNotMatch(offer, /come back|comes back|coming back|won't return|can't return|never return|for good|permanent/i);
  });

  it('uses her first name, and degrades cleanly without one', () => {
    assert.match(bumpCopy('A', 'money', 'Sarah').offer, /Sarah/);
    const nameless = bumpCopy('A', 'money', '').offer;
    assert.doesNotMatch(nameless, /,\s*—/); // no orphaned comma before the dash
    assert.doesNotMatch(nameless, / {2,}/); // no double space where the name was
    // Paragraph breaks are legitimate here, so only literal double SPACES are
    // banned — a /\s{2,}/ assertion would outlaw the copy's own line breaks.
  });
});

describe('bumpCopy — variation B (the channel is already open)', () => {
  it('names the paired topic, like control does', () => {
    assert.match(bumpCopy('B', 'money', 'Sarah').offer, /Money/);
    assert.match(bumpCopy('B', 'love', 'Sarah').offer, /Love/);
  });

  it('is a DESCRIPTION-only test — buttons and Stripe strings match control', () => {
    // If any of these drift, a B win is no longer attributable to the copy.
    for (const b of ALL_BUCKETS) {
      const control = bumpCopy('control', b, 'Sarah');
      const arm = bumpCopy('B', b, 'Sarah');
      assert.equal(arm.accept, control.accept);
      assert.equal(arm.decline, control.decline);
      assert.equal(arm.productName, control.productName);
      assert.equal(arm.lineDescription, control.lineDescription);
      assert.notEqual(arm.offer, control.offer);
    }
  });
});

describe('isBumpCopyVariant / unknown arms', () => {
  it('accepts exactly the three known arms', () => {
    for (const v of ALL_VARIANTS) assert.equal(isBumpCopyVariant(v), true);
    assert.deepEqual([...BUMP_COPY_VARIANTS].sort(), ['A', 'B', 'control']);
  });

  it('rejects anything else, including near-misses', () => {
    for (const junk of ['a', 'b', 'CONTROL', '', null, undefined, 0, {}, ['A']]) {
      assert.equal(isBumpCopyVariant(junk), false, `accepted ${JSON.stringify(junk)}`);
    }
  });

  it('falls back to control for an unrecognised arm', () => {
    // A malformed experiment payload must degrade to the shipped copy, never to
    // an empty card.
    assert.deepEqual(
      bumpCopy('nonsense' as BumpCopyVariant, 'money', 'Sarah'),
      bumpCopy('control', 'money', 'Sarah'),
    );
  });
});

describe('bumpCopyFromPayload (experiment config → arm)', () => {
  it('reads the arm from the payload', () => {
    assert.equal(bumpCopyFromPayload({ bump: true, copy: 'A' }), 'A');
    assert.equal(bumpCopyFromPayload({ bump: true, copy: 'B' }), 'B');
    assert.equal(bumpCopyFromPayload({ bump: true, copy: 'control' }), 'control');
  });

  // THE deploy-dark guarantee at the config layer. Today's live payload is
  // `{ bump: true }` with no `copy` key at all; it must keep rendering the copy
  // the 30%+ take rate was measured on.
  it('defaults to control when the payload predates this test', () => {
    assert.equal(bumpCopyFromPayload({ bump: true }), 'control');
    assert.equal(bumpCopyFromPayload({}), 'control');
    assert.equal(bumpCopyFromPayload(null), 'control');
    assert.equal(bumpCopyFromPayload(undefined), 'control');
  });

  it('defaults to control on a typo rather than rendering nothing', () => {
    for (const junk of [{ copy: 'a' }, { copy: 'C' }, { copy: '' }, { copy: 42 }, { copy: null }]) {
      assert.equal(bumpCopyFromPayload(junk), 'control', JSON.stringify(junk));
    }
  });

  it('always returns something bumpCopy() can render', () => {
    for (const p of [{ copy: 'A' }, { copy: 'junk' }, null, 42, 'string', []]) {
      const v = bumpCopyFromPayload(p);
      assert.equal(isBumpCopyVariant(v), true);
      assert.ok(bumpCopy(v, 'money', 'Sarah').offer.length > 0);
    }
  });
});

describe('bumpProductName — per arm', () => {
  it('defaults to control, so every existing caller is unchanged', () => {
    assert.equal(bumpProductName(' - PALM'), '+ Double Your Reading Add-On - PALM');
    assert.equal(bumpProductName(' - PALM', 'control'), bumpProductName(' - PALM'));
    assert.equal(bumpProductName(' - PALM', 'B'), bumpProductName(' - PALM'));
  });

  it("uses variation A's own product name", () => {
    assert.equal(bumpProductName(' - PALM', 'A'), '+ Double-Strength Clearing - PALM');
    assert.equal(bumpProductName(' - TAROT', 'A'), '+ Double-Strength Clearing - TAROT');
  });

  it('keeps the leading + and the funnel suffix for every arm', () => {
    for (const v of ALL_VARIANTS) {
      for (const suffix of [' - PALM', ' - TAROT', '']) {
        const name = bumpProductName(suffix, v);
        assert.ok(name.startsWith('+ '), `${v}${suffix}: ${name}`);
        assert.ok(name.endsWith(suffix), `${v}${suffix}: ${name}`);
      }
    }
  });

  it('keeps PALM and TAROT distinguishable within an arm', () => {
    for (const v of ALL_VARIANTS) {
      assert.notEqual(bumpProductName(' - PALM', v), bumpProductName(' - TAROT', v));
    }
  });
});

describe('resolveBumpExperimentKey (cutover switch)', () => {
  // The copy test needs a NEW experiment key (the old one's control arm is "no
  // bump", which is the wrong control for a copy test). The key is a CONSTANT, not
  // config: no environment sets V1_BUMP_EXPERIMENT_KEY, matching how the original
  // bump shipped. What makes the cutover safe is ORDER — seed v1_bump_copy_2026
  // `running` on that environment's DB, then deploy — because resolveV1Bump returns
  // bump:false for a key with no running experiment. This assertion is the tripwire:
  // if it ever reads v1_order_bump_2026 again, the deploy is pointing at a concluded
  // test and every buyer silently gets the old copy.
  it('defaults to the copy-test experiment on every environment', () => {
    assert.equal(resolveBumpExperimentKey(undefined), 'v1_bump_copy_2026');
    assert.equal(resolveBumpExperimentKey(''), 'v1_bump_copy_2026');
    assert.equal(resolveBumpExperimentKey('   '), 'v1_bump_copy_2026');
  });

  // Deliberately a key that is NOT the default: asserting the default value here
  // would pass even if the override were dead code.
  it('switches to the key the env names', () => {
    assert.equal(resolveBumpExperimentKey('v1_bump_copy_next'), 'v1_bump_copy_next');
  });

  it('trims, so a stray space in the env var cannot point at a missing test', () => {
    // A key with whitespace finds no experiment, and no experiment ⇒ no bump at
    // all. Worth trimming rather than trusting the paste.
    assert.equal(resolveBumpExperimentKey('  v1_bump_copy_next  '), 'v1_bump_copy_next');
  });
});


// ── DOWNSELL BUMP PRICE (v1_downsell_bump_price_2026) ────────────────────────
// The downsell carried no bump at all until 2026-08-17. It now carries one at a
// PROPORTIONAL price: $12.77 is 36.5% of a $35 order but 51.1% of a $25 one, and
// $9.77 restores near-parity at 39.1%.
//
// What these tests actually protect: the price the CARD renders and the price the
// STRIPE LINE charges are both derived from one resolved number. A buyer shown
// $9.77 and charged $12.77 is the failure this whole tier-threading exists to stop.
describe('downsell bump price', () => {
  it('is 977 cents and renders as $9.77', () => {
    assert.equal(V1_BUMP_CENTS_DOWNSELL, 977);
    assert.equal(bumpPriceLabel(V1_BUMP_CENTS_DOWNSELL), '$9.77');
  });

  it('is proportionate to a $25 order the way $12.77 is to $35', () => {
    // The whole reason for a second price. Not a style choice — 51% of her order
    // is a materially different ask from 36%, and she reached the downsell by
    // saying the larger number was too much.
    const mainRatio = V1_BUMP_CENTS / 3500;
    const downsellRatio = V1_BUMP_CENTS_DOWNSELL / 2500;
    assert.ok(Math.abs(downsellRatio - mainRatio) < 0.03,
      `downsell ratio ${downsellRatio} should sit near main's ${mainRatio}`);
    // And the un-adjusted price would NOT have been proportionate.
    assert.ok(V1_BUMP_CENTS / 2500 - mainRatio > 0.14);
  });

  describe('tier defaults', () => {
    it('main is unchanged, with and without an explicit tier', () => {
      assert.equal(bumpCents(), V1_BUMP_CENTS);
      assert.equal(bumpCents('main'), V1_BUMP_CENTS);
      assert.equal(bumpPriceLabel(), V1_BUMP_PRICE_LABEL);
    });

    it('downsell resolves to the lower price', () => {
      assert.equal(bumpCents('downsell'), V1_BUMP_CENTS_DOWNSELL);
    });
  });

  describe('resolveBumpCents — the only thing that may reach a Stripe line', () => {
    it('accepts either allowed price', () => {
      assert.equal(resolveBumpCents(1277, 'downsell'), 1277);
      assert.equal(resolveBumpCents(977, 'downsell'), 977);
    });

    it('falls back to the tier default when the experiment is draft/OFF', () => {
      // null is what resolveV1DownsellBumpPrice returns for an unstarted test. It
      // must charge the tier default, never throw and never charge zero — she has
      // already committed to the checkout by this point.
      assert.equal(resolveBumpCents(null, 'downsell'), V1_BUMP_CENTS_DOWNSELL);
      assert.equal(resolveBumpCents(undefined, 'downsell'), V1_BUMP_CENTS_DOWNSELL);
      assert.equal(resolveBumpCents(null, 'main'), V1_BUMP_CENTS);
    });

    it('rejects anything outside the closed set', () => {
      // A client-supplied bargain, a typo'd payload, a string, an object. Every one
      // falls back rather than becoming a charge nobody chose.
      for (const junk of [1, 0, -977, 99999, '977 ', 'free', {}, [], NaN, Infinity]) {
        assert.equal(resolveBumpCents(junk, 'downsell'), V1_BUMP_CENTS_DOWNSELL,
          `junk value ${JSON.stringify(junk)} must not reach a Stripe line`);
      }
    });

    it('coerces a numeric string, since payloads arrive as JSON', () => {
      assert.equal(resolveBumpCents('977', 'downsell'), 977);
    });
  });

  describe('copy renders the price it will actually charge', () => {
    it('control names the resolved price, not the constant', () => {
      assert.ok(bumpOfferCopy('money', 977).includes('$9.77'));
      assert.ok(!bumpOfferCopy('money', 977).includes('$12.77'));
    });

    it('every copy arm carries the downsell price when given it', () => {
      for (const variant of ['control', 'A', 'B'] as const) {
        const pack = bumpCopy(variant, 'money', 'Carol', 977);
        assert.ok(pack.offer.includes('$9.77'),
          `${variant} must name the price being charged`);
        assert.ok(!pack.offer.includes('$12.77'),
          `${variant} must not name the main-path price on a downsell`);
      }
    });

    it('omitting the price leaves every arm byte-identical to today', () => {
      // The regression guard for the ~10 existing call sites that were never
      // touched: a defaulted parameter must not have moved any of them.
      for (const variant of ['control', 'A', 'B'] as const) {
        assert.deepEqual(
          bumpCopy(variant, 'money', 'Carol'),
          bumpCopy(variant, 'money', 'Carol', V1_BUMP_CENTS),
        );
      }
    });
  });
});
