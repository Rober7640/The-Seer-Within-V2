import type Stripe from 'stripe';

// Read the mailing address off a Stripe Checkout session.
//
// Extracted from server/lib/braceletOrders.ts (the storefront) so the backend deck's
// shipments (server/lib/beShipments.ts) read addresses the same way. The storefront's
// behaviour is unchanged: it still falls back to the billing address.

export interface StripeShippingAddress {
  name: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postal: string | null;
  country: string | null;
}

/** Where the address came from. `null` ⇒ no address anywhere we were allowed to look. */
export type StripeShippingSource =
  | 'shipping_details'
  | 'collected_information'
  | 'customer_details'
  | null;

interface AddressLike {
  name?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
}

/**
 * Stripe has moved the address between `shipping_details` and `collected_information`
 * across API versions, and typings lag, so both shapes are read defensively.
 *
 * `billingFallback` (default true — the storefront's long-standing behaviour) falls back
 * to `customer_details`, the BILLING address. Pass `false` where only a real shipping
 * address will do: a billing address is often just a country and a postcode.
 */
export function shippingFromSession(
  session: Stripe.Checkout.Session,
  opts: { billingFallback?: boolean } = {},
): { address: StripeShippingAddress; source: StripeShippingSource } {
  const billingFallback = opts.billingFallback ?? true;
  const raw = session as unknown as {
    shipping_details?: AddressLike | null;
    collected_information?: { shipping_details?: AddressLike | null } | null;
    customer_details?: AddressLike | null;
  };

  let s: AddressLike | null | undefined;
  let source: StripeShippingSource = null;
  if (raw.shipping_details) {
    s = raw.shipping_details;
    source = 'shipping_details';
  } else if (raw.collected_information?.shipping_details) {
    s = raw.collected_information.shipping_details;
    source = 'collected_information';
  } else if (billingFallback && raw.customer_details) {
    s = raw.customer_details;
    source = 'customer_details';
  }

  const addr = s?.address;
  return {
    address: {
      name: s?.name ?? null,
      line1: addr?.line1 ?? null,
      line2: addr?.line2 ?? null,
      city: addr?.city ?? null,
      state: addr?.state ?? null,
      postal: addr?.postal_code ?? null,
      country: addr?.country ?? null,
    },
    source,
  };
}

/** The `shipping` parameter a Stripe PaymentIntent takes. */
export interface StripeShippingParam {
  name: string;
  address: {
    line1: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country: string;
  };
}

/**
 * The session's SHIPPING address, shaped as the `shipping` param a PaymentIntent takes —
 * so a backend upsell charge can carry the address she gave at checkout instead of asking
 * for it again (operator decision, Joel 2026-09-16: "skip").
 *
 * ⛔ Never the billing address: `billingFallback: false`, always. A billing address is often
 * just a country and a postcode, which is not somewhere to post a parcel.
 *
 * Returns null unless there is both a street line and an ISO alpha-2 country. A full country
 * name would make Stripe reject the whole charge, so we drop the address rather than the
 * sale — fulfilment can chase an address, but nobody can chase a charge that never happened.
 */
export function shippingParamFromSession(
  session: Stripe.Checkout.Session,
): StripeShippingParam | null {
  const { address } = shippingFromSession(session, { billingFallback: false });

  const line1 = address.line1?.trim() ?? '';
  const country = (address.country?.trim() ?? '').toUpperCase();
  if (!line1 || country.length !== 2) return null;

  const part = (v: string | null | undefined): string | undefined => {
    const t = typeof v === 'string' ? v.trim() : '';
    return t || undefined;
  };

  const line2 = part(address.line2);
  const city = part(address.city);
  const state = part(address.state);
  const postal = part(address.postal);
  // The name on the card is a better label than no name at all.
  const cardName = (session.customer_details?.name ?? '').trim();

  return {
    name: part(address.name) ?? cardName,
    address: {
      line1,
      ...(line2 ? { line2 } : {}),
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
      ...(postal ? { postal_code: postal } : {}),
      country,
    },
  };
}
