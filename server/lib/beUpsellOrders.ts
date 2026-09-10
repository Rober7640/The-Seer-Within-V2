import { BACKEND_OFFER_CATALOG, isBackendOfferKey } from '@shared/backendOffers';
import { beUpsellOrders, type InsertBeUpsellOrder } from '@shared/schema';
import { backendUpsellFor } from './backendCustomerList';
import { db } from './db';
import logger from './logger';

// The shape we need off a Stripe PaymentIntent — narrowed so the mapping is a pure
// function testable with a plain object (no Stripe client).
export type UpsellPILike = {
  id: string;
  amount?: number | null;
  amount_received?: number | null;
  currency?: string | null;
  metadata?: Record<string, string | undefined> | null;
};

/**
 * Insert values for a backend upsell PI, or null when it is not an attributable
 * BE upsell (wrong product, or an offer we cannot resolve — better a missing row
 * than a mis-attributed one).
 */
export function upsellOrderValuesFromPI(pi: UpsellPILike): InsertBeUpsellOrder | null {
  const meta = pi.metadata ?? {};
  const listing = backendUpsellFor(meta.product);
  if (!listing) return null;
  if (!isBackendOfferKey(meta.offer)) return null;
  const offer = meta.offer;
  return {
    stripePaymentIntentId: pi.id,
    bookingSessionId: meta.originalSession ?? null,
    offer,
    offerNumber: BACKEND_OFFER_CATALOG[offer].number,
    product: listing.productKey,
    tier: meta.type === 'downsell' ? 'downsell' : 'full',
    amountCents: pi.amount_received ?? pi.amount ?? 0,
    currency: pi.currency ?? 'usd',
    email: meta.email ?? null,
    firstName: meta.firstName ?? null,
  };
}

/**
 * Record an upsell purchase. Idempotent on the PI id (Stripe retries the event),
 * non-blocking (the buyer has paid; a bookkeeping miss must not fail the webhook).
 */
export async function recordBackendUpsellOrder(pi: UpsellPILike): Promise<void> {
  const values = upsellOrderValuesFromPI(pi);
  if (!values) return;
  try {
    await db
      .insert(beUpsellOrders)
      .values(values)
      .onConflictDoNothing({ target: beUpsellOrders.stripePaymentIntentId });
  } catch (err) {
    logger.error('be_upsell_order: DB write failed (buyer paid; attribution lost)', {
      pi: pi.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
