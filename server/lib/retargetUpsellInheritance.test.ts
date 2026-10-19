// node:test — run: npx tsx --test server/lib/retargetUpsellInheritance.test.ts
// The upsell orders of a /fb-tarot RETARGETING buyer inherit `src: 'retarget'` and
// `rtfmt: 'offer'` from her main Checkout Session — on U1 and U2 (incl. the $30 downsell,
// which is a `type` of the same U2 charge), both the 1-click PaymentIntent and the
// fallback hosted checkout.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normaliseSrc, srcMetadata } from '@shared/orderBump';
import { retargetOfferMetadata } from '@shared/retargetCheckout';

const offerSession = { metadata: { src: 'retarget', rtfmt: 'offer', funnel: 'v1-tarot', firstName: 'Ann', bucket: 'love' } };
const normalTarot = { metadata: { funnel: 'v1-tarot', email: 'a@b.c', firstName: 'Ann', bucket: 'love' } } as { metadata: Record<string, string> };
const recovery = { metadata: { src: 'recovery', funnel: 'v1-tarot' } } as { metadata: Record<string, string> };

// The 1-click charges (U1 /api/upsell/charge, U2 /api/upsell2/charge) spread exactly this.
const oneClick = (session: { metadata: Record<string, string> }) => ({
  ...srcMetadata(session.metadata?.src),
  ...retargetOfferMetadata(session.metadata?.src, session.metadata?.rtfmt),
});
// The fallback hosted checkouts (U1 + U2) spread exactly this, from the same retrieve.
const fallback = (orig: { metadata: Record<string, string> }) => {
  const inheritSrc = normaliseSrc(orig.metadata?.src);
  const inheritRtfmt = retargetOfferMetadata(orig.metadata?.src, orig.metadata?.rtfmt);
  return { ...(inheritSrc && { src: inheritSrc }), ...inheritRtfmt };
};

test('offer-page order: every upsell inherits src=retarget AND rtfmt=offer', () => {
  assert.deepEqual(oneClick(offerSession), { src: 'retarget', rtfmt: 'offer' });
  assert.deepEqual(fallback(offerSession), { src: 'retarget', rtfmt: 'offer' });
});

test('every other order inherits nothing new (normal) or only its own src (recovery)', () => {
  assert.deepEqual(oneClick(normalTarot), {});
  assert.deepEqual(fallback(normalTarot), {});
  assert.deepEqual(oneClick(recovery), { src: 'recovery' });
  assert.deepEqual(fallback(recovery), { src: 'recovery' });
  // A src=retarget order WITHOUT the offer marker keeps src only.
  assert.deepEqual(oneClick({ metadata: { src: 'retarget' } }), { src: 'retarget' });
});

test('tripwire: all four upsell creation sites in routes.ts still carry both markers', () => {
  const src = readFileSync(new URL('../routes.ts', import.meta.url), 'utf8');
  const count = (needle: string) => src.split(needle).length - 1;
  // U1 + U2 1-click PaymentIntents.
  assert.equal(count('...srcMetadata(session.metadata?.src),'), 2);
  assert.equal(count('...retargetOfferMetadata(session.metadata?.src, session.metadata?.rtfmt),'), 2);
  // U1 + U2 fallback checkouts: PaymentIntent metadata AND session metadata each.
  assert.equal(count('inheritRtfmt = retargetOfferMetadata(orig.metadata?.src, orig.metadata?.rtfmt);'), 2);
  assert.equal(count('...(inheritSrc && { src: inheritSrc }),'), 4);
  assert.equal(count('...inheritRtfmt,'), 4);
});
