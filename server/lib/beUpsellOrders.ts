import { and, eq } from 'drizzle-orm';
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
  /**
   * Where this upsell parcel goes. Set at charge time from the address she gave at the
   * booking checkout for a `collectsShipping` offer (09, 06) — the upsells no longer ask
   * her to type it a second time (Joel, 2026-09-16: "skip") — or, on every other offer,
   * from the shipping form she filled in after paying.
   */
  shipping?: {
    name?: string | null;
    address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
      country?: string | null;
    } | null;
  } | null;
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
  // The address the charge carried. ⚠ This is the ONLY record of where an upsell parcel
  // goes once the chat stops asking for it, so it is written even when it is all nulls —
  // a null column is a visible gap; a missing one is a silent guess.
  const address = pi.shipping?.address ?? null;
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
    recipientName: pi.shipping?.name ?? null,
    line1: address?.line1 ?? null,
    line2: address?.line2 ?? null,
    city: address?.city ?? null,
    state: address?.state ?? null,
    postalCode: address?.postal_code ?? null,
    country: address?.country ?? null,
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

/**
 * Did this booking session buy the given upsell product? Read-only entitlement check
 * for a receipt — the upsell is a SEPARATE PaymentIntent linked to the booking by
 * `booking_session_id`, so a booking's receipt cannot see it from its own row.
 *
 * Returns the amount paid in cents (so the receipt can itemise the exact charge, not a
 * catalog guess) or null when no such upsell exists. A DB miss returns null rather than
 * throwing — a receipt must never break because an entitlement lookup hiccuped; the worst
 * case is the line is omitted, never a broken page.
 */
export async function paidUpsellAmountCents(
  bookingSessionId: string | null | undefined,
  productKey: string,
): Promise<number | null> {
  if (!bookingSessionId) return null;
  try {
    const rows = await db
      .select({ amountCents: beUpsellOrders.amountCents })
      .from(beUpsellOrders)
      .where(
        and(
          eq(beUpsellOrders.bookingSessionId, bookingSessionId),
          eq(beUpsellOrders.product, productKey),
        ),
      )
      .limit(1);
    return rows[0]?.amountCents ?? null;
  } catch (err) {
    logger.warn('be_upsell_order: entitlement lookup failed; receipt renders without it', {
      product: productKey,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
