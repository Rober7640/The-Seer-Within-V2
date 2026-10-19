// Unit tests for the /fb-tarot RETARGETING checkout rules (node:test — run with
// `npx tsx --test server/lib/retargetCheckout.test.ts`).
//
// Three things must hold:
//   1. `src` stays a CLOSED marker. 'retarget' is the second accepted value; the
//      recovery marker must behave exactly as before, and junk must never reach
//      Stripe metadata (Mike's n8n flow reads it).
//   2. A no-email retarget order WITHOUT the offer-page marker is priced from the
//      funnel's FIXED entry, and its Stripe line never reads "Personalized reading for
//      undefined". Every other order is unchanged.
//   3. The $30 offer price is reachable ONLY with `src=retarget` AND the offer-page
//      marker (`retargetPage: 'offer'`), which only the offer page sends — a chat URL
//      carrying `src=retarget` never gets it.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  isRecoverySrc,
  normaliseSrc,
  paymentIntentDescription,
  srcMetadata,
  V1_RETARGET_DESCRIPTION_MARKER,
} from '@shared/orderBump';
import { FIXED_FUNNEL_PRICES, RETARGET_OFFER_PRICES } from '@shared/fixedFunnelPrices';
import { funnelParamFromPriceVariant } from '@shared/funnelConfig';
import { isSlidingCloseVariant } from '@shared/types';
import {
  checkoutLineDescription,
  isSafeHookSlug,
  retargetFixedVariant,
  retargetLanderPath,
  isRetargetOfferMarker,
  retargetOfferMetadata,
  RETARGET_OFFER_MARKER,
  percentOff,
  resolveCheckoutVariant,
  retargetOfferPricing,
  retargetOfferVariant,
} from '@shared/retargetCheckout';

describe('normaliseSrc (untrusted ?src= from the client)', () => {
  it('accepts exactly the two markers', () => {
    assert.equal(normaliseSrc('recovery'), 'recovery');
    assert.equal(normaliseSrc('retarget'), 'retarget');
  });

  it('rejects everything else', () => {
    for (const v of [undefined, null, '', 'Retarget', 'RECOVERY', ' retarget', 'retarget ', 'organic', 1, true, {}, ['retarget']]) {
      assert.equal(normaliseSrc(v), null, `expected null for ${JSON.stringify(v)}`);
    }
  });

  it('leaves isRecoverySrc unchanged — retarget is NOT recovery', () => {
    assert.equal(isRecoverySrc('recovery'), true);
    assert.equal(isRecoverySrc('retarget'), false);
    assert.equal(isRecoverySrc(undefined), false);
  });
});

describe('srcMetadata (upsells inheriting the main order\'s marker)', () => {
  it('writes the same { src: "recovery" } the inline checks used to', () => {
    assert.deepEqual(srcMetadata('recovery'), { src: 'recovery' });
  });
  it('carries retarget', () => {
    assert.deepEqual(srcMetadata('retarget'), { src: 'retarget' });
  });
  it('is empty — key ABSENT — for anything else', () => {
    assert.deepEqual(srcMetadata(undefined), {});
    assert.deepEqual(srcMetadata('junk'), {});
    assert.equal('src' in srcMetadata(null), false);
  });
});

describe('paymentIntentDescription — retarget marker', () => {
  const NAME = 'Energy Clearing Ritual - TAROT';
  it('normal and recovery orders are byte-identical to before', () => {
    assert.equal(paymentIntentDescription(NAME), NAME);
    assert.equal(paymentIntentDescription(NAME, { retarget: false }), NAME);
    assert.equal(paymentIntentDescription(NAME, { recovery: true }), `${NAME} - Recovery`);
    assert.equal(
      paymentIntentDescription(NAME, { bump: true, recovery: true, noemail: true }),
      `${NAME} + Double Reading - Recovery - No email`,
    );
  });
  it('marks a retarget order', () => {
    assert.equal(V1_RETARGET_DESCRIPTION_MARKER, ' - Retarget');
    assert.equal(paymentIntentDescription(NAME, { retarget: true }), `${NAME} - Retarget`);
  });
});

describe('retargetFixedVariant (no-email retarget price)', () => {
  it('charges the tarot funnel\'s fixed 35_tarot entry, not the root "35" fallback', () => {
    assert.deepEqual(retargetFixedVariant('v1-tarot'), {
      variant: '35_tarot',
      priceCents: 3500,
      downsellCents: 2500,
      upsell1Cents: 4700,
    });
  });
  it('is the SAME number the offer page prints as its struck full price', () => {
    assert.equal(retargetOfferPricing().fullDollars * 100, FIXED_FUNNEL_PRICES['v1-tarot'].priceCents);
    assert.equal(retargetFixedVariant('v1-tarot')!.priceCents, retargetOfferPricing().fullDollars * 100);
  });
  it('is null on a funnel with no fixed price (caller keeps its old fallback)', () => {
    assert.equal(retargetFixedVariant('v1-palm'), null);
    assert.equal(retargetFixedVariant(undefined), null);
    assert.equal(retargetFixedVariant(null), null);
  });
});

describe('checkoutLineDescription (customer-facing Stripe line)', () => {
  it('is byte-identical for every non-retarget order, including the old "undefined"', () => {
    assert.equal(checkoutLineDescription('Mary', null), 'Personalized reading for Mary');
    assert.equal(checkoutLineDescription('Mary', 'recovery'), 'Personalized reading for Mary');
    assert.equal(checkoutLineDescription(undefined, null), 'Personalized reading for undefined');
    assert.equal(checkoutLineDescription(undefined, 'recovery'), 'Personalized reading for undefined');
  });
  it('uses her name on a retarget order when it has one', () => {
    assert.equal(checkoutLineDescription('Mary', 'retarget'), 'Personalized reading for Mary');
  });
  it('never prints undefined/null/blank on a retarget order', () => {
    for (const v of [undefined, null, '', '   ']) {
      const d = checkoutLineDescription(v, 'retarget');
      assert.equal(d, 'Personalized reading for you');
      assert.doesNotMatch(d, /undefined|null/);
    }
  });
});

describe('retargetLanderPath (Stripe cancel URL / Payments.AI back link)', () => {
  it('returns to the page with the hook and cancelled=1', () => {
    assert.equal(
      retargetLanderPath('v1-tarot', 'cards-return', { cancelled: true }),
      '/fb-tarot/b?src=retarget&hook=cards-return&cancelled=1',
    );
    assert.equal(retargetLanderPath('v1-tarot', 'cards-return'), '/fb-tarot/b?src=retarget&hook=cards-return');
  });
  it('drops a hook that is not a plain slug rather than echo it into the URL', () => {
    for (const bad of ['a&b=c', 'x y', '../x', '<script>', 'UPPER', '', undefined, 42]) {
      assert.equal(isSafeHookSlug(bad), false);
      assert.equal(
        retargetLanderPath('v1-tarot', bad, { cancelled: true }),
        '/fb-tarot/b?src=retarget&cancelled=1',
      );
    }
  });
  it('is null off the tarot funnel', () => {
    assert.equal(retargetLanderPath('v1-palm', 'cards-return', { cancelled: true }), null);
    assert.equal(retargetLanderPath(undefined, 'cards-return'), null);
  });
});

describe('isRetargetOfferMarker / retargetOfferMetadata (body retargetPage → Stripe metadata.rtfmt)', () => {
  it('accepts exactly "offer"', () => {
    assert.equal(RETARGET_OFFER_MARKER, 'offer');
    assert.equal(isRetargetOfferMarker('offer'), true);
  });
  it('rejects everything else', () => {
    for (const v of [undefined, null, '', 'Offer', 'OFFER', ' offer', 'offer ', 'offers', 'chat', 'letter', 1, true, {}, ['offer'], { offer: true }]) {
      assert.equal(isRetargetOfferMarker(v), false, `expected false for ${JSON.stringify(v)}`);
    }
  });
  it('writes rtfmt: offer on a retarget order with the marker', () => {
    assert.deepEqual(retargetOfferMetadata('retarget', 'offer'), { rtfmt: 'offer' });
  });
  it('is empty — key ABSENT — for a junk or missing marker', () => {
    for (const f of [undefined, null, '', 'OFFER', 'chat', 'letter', 42]) {
      const m = retargetOfferMetadata('retarget', f);
      assert.deepEqual(m, {});
      assert.equal('rtfmt' in m, false);
    }
  });
  it('is empty for every non-retarget order, even with the marker', () => {
    for (const src of [undefined, null, '', 'recovery', 'Retarget', 'organic']) {
      assert.deepEqual(retargetOfferMetadata(src, 'offer'), {});
    }
  });
});

describe('retargetLanderPath — no format param any more', () => {
  it('the cancel URL never carries a format param', () => {
    const p = retargetLanderPath('v1-tarot', 'cards-return', { cancelled: true });
    assert.equal(p, '/fb-tarot/b?src=retarget&hook=cards-return&cancelled=1');
    assert.doesNotMatch(p!, /fmt/);
  });
});

// ── The OFFER page's price ($30, 14% off) ─────────────────────────────────────────

const OFFER = { variant: '30_tarot_rt', priceCents: 3000, downsellCents: 2500, upsell1Cents: 4700 };
const TAROT_FIXED = { variant: '35_tarot', priceCents: 3500, downsellCents: 2500, upsell1Cents: 4700 };

describe('retargetOfferVariant (the offer-page marker is the ONLY way to the $30 price)', () => {
  it('retarget + offer on v1-tarot → 3000 cents, variant 30_tarot_rt, upsell/downsell unchanged', () => {
    assert.deepEqual(retargetOfferVariant('retarget', 'v1-tarot', 'offer'), OFFER);
  });
  it('a retarget order without the marker (e.g. a chat URL carrying src=retarget) gets NO offer price', () => {
    assert.equal(retargetOfferVariant('retarget', 'v1-tarot', undefined), null);
    assert.equal(retargetOfferVariant('retarget', 'v1-tarot', 'chat'), null);
    assert.equal(retargetOfferVariant('retarget', 'v1-tarot', 'letter'), null);
  });
  it('junk markers are not offer', () => {
    for (const f of ['Offer', 'OFFER', ' offer', 'offer ', 'offer&x=1', '30', 3000, ['offer'], { offer: 1 }, null, '']) {
      assert.equal(retargetOfferVariant('retarget', 'v1-tarot', f), null, `expected null for ${JSON.stringify(f)}`);
    }
  });
  it('non-retarget orders never get it, even claiming offer', () => {
    for (const src of [undefined, null, '', 'recovery', 'Retarget', 'organic']) {
      assert.equal(retargetOfferVariant(src, 'v1-tarot', 'offer'), null);
    }
  });
  it('other funnels never get it', () => {
    for (const f of ['v1-palm', 'v1-fb', 'v1-read', 'v1-fb2', 'v1-gdn', null, undefined, '']) {
      assert.equal(retargetOfferVariant('retarget', f, 'offer'), null);
    }
  });
});

describe('resolveCheckoutVariant (/api/checkout price source — regression)', () => {
  const lookups: Array<[string, unknown]> = [];
  const EMAIL_VARIANT = { variant: '45_fb', priceCents: 4500, downsellCents: 3200, upsell1Cents: 4700 };
  const lookupByEmail = async (email: string, funnel: string | null | undefined) => {
    lookups.push([email, funnel]);
    return EMAIL_VARIANT;
  };
  const run = (o: { src: unknown; funnel: string | null | undefined; offerMarker: unknown; email: unknown }) =>
    resolveCheckoutVariant({ ...o, lookupByEmail });

  it('offer page: $30 / 30_tarot_rt with no email, and the email lookup is never consulted', async () => {
    lookups.length = 0;
    assert.deepEqual(await run({ src: 'retarget', funnel: 'v1-tarot', offerMarker: 'offer', email: undefined }), OFFER);
    assert.deepEqual(await run({ src: 'retarget', funnel: 'v1-tarot', offerMarker: 'offer', email: 'a@b.co' }), OFFER);
    assert.equal(lookups.length, 0);
  });
  it('retarget orders without the marker, no email: the fixed 35_tarot, exactly as before', async () => {
    for (const offerMarker of [undefined, 'chat', 'letter', 'junk', 'Offer']) {
      assert.deepEqual(await run({ src: 'retarget', funnel: 'v1-tarot', offerMarker, email: undefined }), TAROT_FIXED);
    }
  });
  it('a CHAT checkout whose URL carries src=retarget never gets $30 — it sends no marker, so the email lookup prices it', async () => {
    // useConversation (byte-identical to 899f7b8) forwards the URL's `src` and its email,
    // and never sends `retargetPage`. That body must never reach the offer price.
    lookups.length = 0;
    // The same two steps /api/checkout runs: body.retargetPage → retargetOfferMetadata → offerMarker.
    const chatReqBody: Record<string, unknown> = { src: 'retarget', funnel: 'v1-tarot', email: 'a@b.co', firstName: 'Ann' };
    const offerMarker = retargetOfferMetadata(chatReqBody.src, chatReqBody.retargetPage).rtfmt;
    assert.equal(offerMarker, undefined);
    const chatBody = { src: 'retarget', funnel: 'v1-tarot', offerMarker, email: 'a@b.co' };
    const v = await run(chatBody);
    assert.deepEqual(v, EMAIL_VARIANT);
    assert.notEqual((v as { priceCents: number }).priceCents, OFFER.priceCents);
    assert.deepEqual(lookups, [['a@b.co', 'v1-tarot']]);
    // …and with no email it is the fixed $35, still not $30.
    assert.deepEqual(await run({ ...chatBody, email: undefined }), TAROT_FIXED);
  });
  it('non-retarget orders: email lookup with an email, null (→ the "35" fallback) without — even claiming offer', async () => {
    for (const src of [null, 'recovery']) {
      for (const offerMarker of [undefined, 'offer']) {
        assert.deepEqual(await run({ src, funnel: 'v1-tarot', offerMarker, email: 'a@b.co' }), EMAIL_VARIANT);
        assert.equal(await run({ src, funnel: 'v1-tarot', offerMarker, email: undefined }), null);
        assert.equal(await run({ src, funnel: 'v1-fb', offerMarker, email: '' }), null);
      }
    }
  });
  it('retarget off the tarot funnel: unchanged (fixed entry or null), never the offer price', async () => {
    assert.equal(await run({ src: 'retarget', funnel: 'v1-palm', offerMarker: 'offer', email: undefined }), null);
    assert.deepEqual(await run({ src: 'retarget', funnel: 'v1-read', offerMarker: 'offer', email: undefined }), {
      variant: '35_read', priceCents: 3500, downsellCents: 2500, upsell1Cents: 4700,
    });
  });
});

describe('retargetOfferPricing / percentOff (what the offer page prints)', () => {
  it('$35 struck, $30 now, 14% — from the same tables the server charges', () => {
    assert.deepEqual(retargetOfferPricing(), { fullDollars: 35, offerDollars: 30, pct: 14 });
    assert.equal(retargetOfferPricing().fullDollars * 100, FIXED_FUNNEL_PRICES['v1-tarot'].priceCents);
    assert.equal(retargetOfferPricing().offerDollars * 100, RETARGET_OFFER_PRICES['v1-tarot'].priceCents);
    assert.equal(retargetOfferPricing().offerDollars * 100, retargetOfferVariant('retarget', 'v1-tarot', 'offer')!.priceCents);
  });
  it('round((35-30)/35*100) = 14, and edge cases', () => {
    assert.equal(percentOff(3500, 3000), 14);
    assert.equal(percentOff(3500, 3500), 0);
    assert.equal(percentOff(3500, 4000), 0);
    assert.equal(percentOff(0, 0), 0);
    assert.equal(percentOff(4500, 3500), 22);
  });
});

describe('30_tarot_rt is handled by every price-variant parser', () => {
  it('funnelParamFromPriceVariant attributes it to v1-tarot (AWeber tags, Evelyn TY check, reports)', () => {
    assert.equal(funnelParamFromPriceVariant('30_tarot_rt'), 'v1-tarot');
    assert.equal(funnelParamFromPriceVariant('35_tarot'), 'v1-tarot');
  });
  it('is not mistaken for the sliding close', () => {
    assert.equal(isSlidingCloseVariant('30_tarot_rt'), false);
  });
  it('is its own id, distinct from the full-price tarot entry', () => {
    assert.notEqual(RETARGET_OFFER_PRICES['v1-tarot'].id, FIXED_FUNNEL_PRICES['v1-tarot'].id);
  });
});
