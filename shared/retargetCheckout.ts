// The /fb-tarot RETARGETING page's checkout rules — shared so the page and the server
// agree on them (`/fb-tarot/b?src=retarget`, client/src/pages/TarotRetargetOffer.tsx —
// the offer page, the only retarget page since 2026-10-16).
//
// The page sends her straight to checkout with NO email (see the "why no email" note
// on retargetFixedVariant). /api/checkout already handles a no-email order — the
// no-optin arm does it every day — but two of its fallbacks are wrong for this page:
//
//   1. PRICE. With no email there is no conversation row to read a price from, so the
//      server fell back to the root funnel's "35" variant. The amount is the same $35,
//      but the variant id is what attributes the order to a funnel later
//      (funnelParamFromPriceVariant), so a tarot order would book as a root order.
//   2. LINE TEXT. The Stripe line reads "Personalized reading for ${firstName}", which
//      prints "undefined" when we never learned her name.
//
// Both fixes are scoped to `src === 'retarget'` so the no-optin arm and every other
// order keep their exact behaviour.

import type { CheckoutSrc } from './orderBump';
import { FIXED_FUNNEL_PRICES, RETARGET_OFFER_PRICES } from './fixedFunnelPrices';
import { funnelDefForParam } from './funnelConfig';

/** The funnel the retargeting page lives on. */
export const RETARGET_FUNNEL = 'v1-tarot';

/** The deck every live tarot ad uses. Retarget mode always shows it. */
export const RETARGET_DECK = 'return-mhf' as const;

/**
 * The price a NO-EMAIL retarget checkout WITHOUT the offer-page marker is charged: the
 * funnel's fixed price entry (the offer page itself is priced by retargetOfferVariant).
 *
 * Why the page sends no email even when it knows one: a returning lead's price is
 * LOCKED on her conversation row at lead capture, and a price experiment on this
 * funnel can lock a different number there (resolveV1Price writes the arm's cents).
 * The page cannot see that number, so passing her email could charge a price other
 * than the one it prints. With no email the server charges from the same tables the
 * page prints from.
 *
 * null when the funnel has no fixed price (the caller then keeps its old fallback).
 */
export function retargetFixedVariant(funnel: string | null | undefined): {
  variant: string;
  priceCents: number;
  downsellCents: number;
  upsell1Cents: number;
} | null {
  const fixed = funnel ? FIXED_FUNNEL_PRICES[funnel] : undefined;
  if (!fixed) return null;
  return {
    variant: fixed.id,
    priceCents: fixed.priceCents,
    downsellCents: fixed.downsellCents,
    upsell1Cents: fixed.upsell1Cents,
  };
}

// ── The OFFER-PAGE marker — the ONLY way to the $30 returning-reader price ─────────
// The offer page (client/src/pages/TarotRetargetOffer.tsx) sends `retargetPage: 'offer'`
// in its /api/checkout body. Nothing else sends it — not the chat, not any lander — so a
// chat URL that merely carries `src=retarget` never reaches the offer price. The value is
// a CLOSED check (exactly the string 'offer'), the same contract as normaliseSrc: a client
// can only ever say "this is the offer page", never name a price.
//
// Stripe metadata keeps the historical key `rtfmt: 'offer'` so offer-page sales stay
// identifiable (and upsells inherit it, exactly like `src`).

/** The one accepted value of the offer-page marker (body `retargetPage`, metadata `rtfmt`). */
export const RETARGET_OFFER_MARKER = 'offer' as const;
export type RetargetOfferMarker = typeof RETARGET_OFFER_MARKER;

/** CLOSED CHECK on an untrusted value: exactly 'offer'; anything else (case, padding, arrays) is false. */
export function isRetargetOfferMarker(value: unknown): value is RetargetOfferMarker {
  return value === RETARGET_OFFER_MARKER;
}

/**
 * The OFFER page's price — ONLY for an order that is `src=retarget` AND carries the
 * offer-page marker on a funnel with a RETARGET_OFFER_PRICES entry (v1-tarot). null for
 * everything else: a retarget order without the marker (e.g. a chat URL carrying
 * `src=retarget`), every non-retarget order, a junk or differently-cased marker, another
 * funnel.
 */
export function retargetOfferVariant(
  src: unknown,
  funnel: string | null | undefined,
  marker: unknown,
): RetargetCheckoutVariant | null {
  if (src !== 'retarget') return null;
  if (!isRetargetOfferMarker(marker)) return null;
  const offer = funnel ? RETARGET_OFFER_PRICES[funnel] : undefined;
  if (!offer) return null;
  return {
    variant: offer.id,
    priceCents: offer.priceCents,
    downsellCents: offer.downsellCents,
    upsell1Cents: offer.upsell1Cents,
  };
}

/**
 * The `rtfmt` Stripe metadata for an order: `{ rtfmt: 'offer' }` ONLY on a retarget order
 * carrying the offer-page marker, ABSENT (not empty) on every other order — so "does rtfmt
 * exist" stays a clean test, exactly like `src`. Also used by the upsells to inherit it
 * from the main session's metadata.
 */
export function retargetOfferMetadata(src: unknown, marker: unknown): { rtfmt?: RetargetOfferMarker } {
  if (src !== 'retarget') return {};
  return isRetargetOfferMarker(marker) ? { rtfmt: RETARGET_OFFER_MARKER } : {};
}

/** Whole-number percent off, e.g. (3500, 3000) → 14. 0 when there is no saving. */
export function percentOff(fullCents: number, offerCents: number): number {
  if (!(fullCents > 0) || !(offerCents < fullCents)) return 0;
  return Math.round(((fullCents - offerCents) / fullCents) * 100);
}

/**
 * What the OFFER page prints: the struck full price, the offer price and the percent —
 * all from the SAME tables /api/checkout charges from (FIXED_FUNNEL_PRICES +
 * RETARGET_OFFER_PRICES), so nothing is hard-coded in the component.
 */
export function retargetOfferPricing(): { fullDollars: number; offerDollars: number; pct: number } {
  const fullCents = FIXED_FUNNEL_PRICES[RETARGET_FUNNEL]?.priceCents ?? 3500;
  const offerCents = RETARGET_OFFER_PRICES[RETARGET_FUNNEL]?.priceCents ?? fullCents;
  return { fullDollars: fullCents / 100, offerDollars: offerCents / 100, pct: percentOff(fullCents, offerCents) };
}

export interface RetargetCheckoutVariant {
  variant: string;
  priceCents: number;
  downsellCents: number;
  upsell1Cents: number;
}

/**
 * /api/checkout's price source, in ONE place so the precedence is unit-testable:
 *
 *   1. retarget + the offer-page marker (v1-tarot) → the offer price, '30_tarot_rt'. Wins
 *      even if an email were sent (the offer page sends none), so the offer page always
 *      charges exactly what it prints.
 *   2. an email → the caller's lookup (getVariantForEmail) — UNCHANGED.
 *   3. retarget, no email → the funnel's fixed entry ('35_tarot') — UNCHANGED.
 *   4. otherwise null → the caller's historical "35" / $35 / $25 fallback — UNCHANGED.
 *
 * A retarget order without the marker, and every non-retarget order, take exactly the
 * path they took before the offer page existed.
 */
export async function resolveCheckoutVariant<V>(o: {
  src: unknown;
  funnel: string | null | undefined;
  offerMarker: unknown;
  email: unknown;
  lookupByEmail: (email: string, funnel: string | null | undefined) => Promise<V>;
}): Promise<V | RetargetCheckoutVariant | null> {
  const offer = retargetOfferVariant(o.src, o.funnel, o.offerMarker);
  if (offer) return offer;
  if (typeof o.email === 'string' && o.email) return o.lookupByEmail(o.email, o.funnel);
  return o.src === 'retarget' ? retargetFixedVariant(o.funnel) : null;
}

/**
 * The customer-facing Stripe line description. Byte-identical to the old template for
 * every order EXCEPT a retarget order with no name, which reads naturally instead of
 * "Personalized reading for undefined".
 */
export function checkoutLineDescription(firstName: unknown, src: CheckoutSrc | null): string {
  const hasName = typeof firstName === 'string' && firstName.trim().length > 0;
  if (src === 'retarget' && !hasName) return 'Personalized reading for you';
  return `Personalized reading for ${firstName}`;
}

/** Hook slugs are lowercase words joined by dashes. Anything else is not echoed into a URL. */
export function isSafeHookSlug(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 60;
}

/**
 * The retargeting page's own path: `/fb-tarot/b?src=retarget&hook=<hook>`, plus
 * `&cancelled=1` for the Stripe cancel URL. `hook` is dropped (not escaped) when it is
 * not a plain slug, so an untrusted request can never inject into the URL; the page
 * then falls back to its default hook. null off the tarot funnel.
 */
export function retargetLanderPath(
  funnel: string | null | undefined,
  hook: unknown,
  opts: { cancelled?: boolean } = {},
): string | null {
  if (funnel !== RETARGET_FUNNEL) return null;
  const def = funnelDefForParam(funnel);
  if (!def) return null;
  const parts = ['src=retarget'];
  if (isSafeHookSlug(hook)) parts.push(`hook=${hook}`);
  if (opts.cancelled) parts.push('cancelled=1');
  return `${def.prefix}/b?${parts.join('&')}`;
}
