// PostHog `purchase_completed` event shape for Stripe CHECKOUT-SESSION purchases.
//
// Extracted from the checkout.session.completed webhook so it can be unit tested:
// this one builder serves SIX products across THREE funnel families (V1 front-end,
// V1 upsell fallback checkouts, and soulmate), so a change here can quietly break
// PostHog funnels for landers that have nothing to do with the change. The tests in
// purchaseAnalytics.test.ts pin the exact emitted properties for every product.
//
// NOT the only emitter: the 1-click upsell charges (protection_ritual,
// manifestation_bracelet, soulmate_bracelet, soulmate_love_tuner) capture their own
// purchase_completed inline in routes.ts, because they never create a checkout
// session. This builder only covers what actually flows through the webhook — which
// includes EVERY V1 front-end purchase (main and downsell), since there is no
// 1-click path for the front-end offer.
//
// ── Why price_variant / purchase_type exist ──────────────────────────────────
// Without them the sliding close ($55 anchor / $35 grace) is INVISIBLE in PostHog:
//
//     control  main   → amount_cents 3500
//     sliding  grace  → amount_cents 3500     ← identical. Indistinguishable.
//
// Nothing else on the event separates them, so any PostHog revenue/conversion
// breakdown of the palm price test would silently mix the two arms. The DB-backed
// /admin/price-test readout is unaffected (it reads conversations.price_variant) —
// this only fixes what PostHog can see.

import { funnelDefForParam } from '@shared/funnelConfig';

interface TrackedProduct {
  funnel: 'soulmate' | null;
  step: string;
  product: string;
}

// Soulmate products fix funnel='soulmate'. V1 products derive funnel from
// metadata.funnel via funnelDefForParam (missing → 'v1').
export const TRACKED_PRODUCTS: Record<string, TrackedProduct> = {
  soulmate_sketch:        { funnel: 'soulmate', step: 'sales',   product: 'soulmate_sketch' },
  soulmate_bracelet:      { funnel: 'soulmate', step: 'upsell1', product: 'soulmate_bracelet' },
  soulmate_love_tuner:    { funnel: 'soulmate', step: 'upsell2', product: 'soulmate_love_tuner' },
  energy_clearing_ritual: { funnel: null,       step: 'sales',   product: 'energy_clearing_ritual' },
  protection_ritual:      { funnel: null,       step: 'upsell1', product: 'protection_ritual' },
  manifestation_bracelet: { funnel: null,       step: 'upsell2', product: 'manifestation_bracelet' },
};

export interface PurchaseEventInput {
  /** Stripe session metadata.product. Unknown/absent → no event. */
  product?: string;
  /** Stripe checkout session metadata. */
  metadata: Record<string, string | undefined>;
  /** session.amount_total — the amount ACTUALLY charged, not the assigned price. */
  amountCents: number;
  stripeSessionId: string;
  email: string;
}

export interface PurchaseEvent {
  distinctId: string;
  event: 'purchase_completed';
  properties: Record<string, unknown>;
}

/**
 * Build the PostHog purchase_completed event for a completed checkout session.
 * Returns null for products we don't track (caller emits nothing) — same as before.
 */
export function buildPurchaseEvent(input: PurchaseEventInput): PurchaseEvent | null {
  const info = input.product ? TRACKED_PRODUCTS[input.product] : undefined;
  if (!info) return null;

  const md = input.metadata;
  const funnelValue = info.funnel ?? (funnelDefForParam(md.funnel)?.posthog ?? 'v1');

  return {
    distinctId: md.posthogDistinctId || input.email,
    event: 'purchase_completed',
    properties: {
      funnel: funnelValue,
      step: info.step,
      product: info.product,
      payment_method: 'stripe_checkout',
      amount_cents: input.amountCents,
      stripe_session_id: input.stripeSessionId,
      email: input.email,
      // No-optin arm marker so purchases are filterable/comparable in PostHog
      // (email_gate=off = no-email lander). Derived from the session metadata.
      email_gate: md.noemail === '1' ? 'off' : 'on',

      // ── Added 2026-07-14 for the sliding close. Purely ADDITIVE: PostHog is
      // schemaless, so every existing insight/funnel keyed on the properties above
      // keeps working untouched. Products that don't carry this metadata (soulmate,
      // upsell fallback checkouts) emit null rather than a missing key, so the
      // property is always present and safe to filter on.
      //
      // price_variant: which arm of the V1 price test this buyer was in
      //                (e.g. '35_palm_u47' control vs '55-35_palm' sliding).
      // purchase_type: 'main' = the headline price, 'downsell' = the reduced price.
      //                Under the sliding close, 'downsell' IS the $35 grace option —
      //                a first-class choice, not a rescue. Together these two make
      //                the two $3500 purchases above distinguishable.
      price_variant: md.priceVariant ?? null,
      purchase_type: md.type ?? null,
    },
  };
}
