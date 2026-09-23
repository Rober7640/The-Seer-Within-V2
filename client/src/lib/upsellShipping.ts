// Does a post-purchase upsell still have to ASK her for a mailing address?
//
// Operator decision (Joel, 2026-09-16): "skip". A backend offer whose catalog row carries
// `collectsShipping` (09 Heart Cleanser, 06 Wishing Bracelet) takes her address on Stripe
// Checkout BEFORE payment. Making her type the same address again on Upsell 1 and Upsell 2
// is friction on a woman who has already paid twice.
//
// 🔴 THIS IS THE WHOLE DECISION, IN ONE PURE FUNCTION. The hooks own the chat; this owns
// the rule, so it can be proved without rendering a chat (see upsellShipping.test.ts).
//
// ⛔ V1 IS LIVE AND TAKES MONEY. `backend: false` returns null every time, whatever else it
// is handed, so the six live funnels keep opening the form exactly as they do today. The
// same is true of a backend offer that collected NO address (02, 03, 08): there is nothing
// to reuse, so it still asks.
//
// ⚠ When anything about the address is unusable we return null — ASK her — rather than
// shipping blind. A parcel with no street line is a parcel that never arrives.

import { BACKEND_OFFER_CATALOG, isBackendOfferKey } from "@shared/backendOffers";

/** The address shape the upsell hooks and ShippingForm already pass around. */
export interface UpsellShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal: string;
  country: string;
}

/** What `/api/backend/upsell/user-data` reports — every part optional, as Stripe sends it. */
type LooseAddress = {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal?: string | null;
  country?: string | null;
};

const clean = (v: string | null | undefined): string => (typeof v === "string" ? v.trim() : "");

/**
 * The address this upsell may REUSE instead of asking for it again — or null, meaning
 * "show the shipping form", which is what every caller did before this existed.
 *
 * @param backend  Is this the backend upsell engine (`/api/backend/upsell/*`)? V1 ⇒ false.
 * @param offer    The booking-session offer. Undefined on V1 and on 02's prefix-mounted pages.
 * @param shipping The address the booking session already carries.
 */
export function reusableUpsellShipping(opts: {
  backend: boolean;
  offer?: string | null;
  shipping?: LooseAddress | null;
}): UpsellShippingAddress | null {
  // ⛔ V1's funnel, untouched.
  if (!opts.backend) return null;

  // Only an offer that actually collected an address at checkout has one to reuse.
  const key = opts.offer;
  if (!isBackendOfferKey(key)) return null;
  if (!BACKEND_OFFER_CATALOG[key].collectsShipping) return null;

  const a = opts.shipping;
  if (!a) return null;

  // The two parts a parcel cannot be posted without. Anything less ⇒ ask her.
  const line1 = clean(a.line1);
  const country = clean(a.country).toUpperCase();
  if (!line1) return null;
  if (country.length !== 2) return null;

  const line2 = clean(a.line2);
  return {
    name: clean(a.name),
    line1,
    // Absent rather than empty: a blank second line is not a line on a label.
    ...(line2 ? { line2 } : {}),
    city: clean(a.city),
    state: clean(a.state),
    postal: clean(a.postal),
    country,
  };
}
