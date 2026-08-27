import type Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { beOrders, type BeOrder } from '@shared/schema';
import {
  BACKEND_OFFER_CATALOG,
  backendOfferForStripeProduct,
  isBackendOfferKey,
  isBookingTreatment,
  type BackendOffer,
} from '@shared/backendOffers';
import { addBackendCustomer } from './aweber';
import { logBeBookingConversion } from './experiments';
import logger from './logger';

// Persist a backend-deck purchase, then put her on the customer list.
//
// Workflow: improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md — asset S4, and Phase C rule 8.
//
// ── WHY THE WEBHOOK, NOT THE THANK-YOU PAGE ─────────────────────────────────────
// She can pay and close the tab before the redirect lands. V1 already has exactly that
// bug — `addPaidSubscriber` has one caller, /api/upsell/user-data — so a pay-and-close
// buyer never reaches the paid list and is never counted. We are not repeating it here,
// where the consequence is worse: on this deck the AWeber write IS the send.
//
// ── THE AWEBER WRITE IS THE THANK-YOU EMAIL ─────────────────────────────────────
// Her offer tag is the trigger on an AWeber Campaign. So this is not bookkeeping to be
// tidied up later — if it fails, a woman who paid gets no email at all. It therefore:
//   · runs on the authoritative server-side signal, not in a browser;
//   · records its own success (`customer_list_written_at`) and its own failure
//     (`customer_list_error`), so "paid but never emailed" is one SQL query;
//   · is retried by the thank-you page's own lookup, which is the one moment a real
//     buyer is standing in front of us again.
//
// IDEMPOTENT throughout. `stripe_session_id` is UNIQUE and the write is an upsert,
// because Stripe retries checkout.session.completed and the thank-you page reads the
// same session. `addBackendCustomer` upserts on AWeber's side for the same reason.

/** Stripe metadata this module reads. Written by /api/backend/checkout. */
interface BackendSessionMeta {
  product?: string;
  offer?: string;
  treatment?: string;
  firstName?: string;
  email?: string;
  readingCents?: string;
  bump?: string;
  bumpProduct?: string;
  /** The booking-treatment A/B visitor subject, for purchase attribution. */
  expSubject?: string;
}

function centsFrom(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/**
 * Record the order and put her on the customer list.
 *
 * Returns null when the session is not a backend order — the webhook is gated on the
 * `be_` prefix already, so that only happens if something changed underneath us, and
 * a warn is the right answer rather than a throw that would make Stripe retry forever.
 */
export async function recordBackendOrder(
  session: Stripe.Checkout.Session,
): Promise<BeOrder | null> {
  const metadata = (session.metadata || {}) as BackendSessionMeta;
  const offer = backendOfferForStripeProduct(metadata.product);
  if (!offer) {
    logger.warn('recordBackendOrder: not a backend product, ignoring', {
      product: metadata.product,
      session: session.id,
    });
    return null;
  }

  const email =
    session.customer_details?.email || session.customer_email || metadata.email || null;
  const firstName = metadata.firstName || null;
  const treatment = isBookingTreatment(metadata.treatment) ? metadata.treatment : null;

  const amountCents = session.amount_total ?? 0;
  const bumpPurchased = metadata.bump === '1';
  const bumpCents = bumpPurchased ? offer.bump.cents : 0;
  // Prefer what checkout recorded; fall back to the arithmetic Stripe can prove. The
  // two agree unless a coupon was applied, and then Stripe's total is the truth.
  const readingCents = centsFrom(metadata.readingCents) ?? Math.max(0, amountCents - bumpCents);

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  let row: BeOrder | undefined;
  try {
    [row] = await db
      .insert(beOrders)
      .values({
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        offer: offer.key,
        offerNumber: offer.number,
        treatment,
        readingCents,
        bumpPurchased,
        bumpCents,
        bumpProductKey: bumpPurchased ? offer.bump.productKey : null,
        amountCents,
        currency: session.currency ?? 'usd',
        email,
        firstName,
        status: 'paid',
      })
      // Idempotent: a Stripe retry, or the thank-you page arriving first, updates the
      // same row. ⛔ Deliberately does NOT touch the fulfilment or customer-list columns
      // — a second write must never un-stamp work that already happened.
      .onConflictDoUpdate({
        target: beOrders.stripeSessionId,
        set: {
          stripePaymentIntentId: paymentIntentId,
          email,
          firstName,
          amountCents,
          updatedAt: new Date(),
        },
      })
      .returning();
  } catch (err) {
    // 🔴 THE ROW IS NOT THE PRODUCT. If the table is missing (the migration was never
    // run) or the database is down, she has still paid — so bookkeeping failing must
    // not also cost her the email. Write her to the customer list straight from the
    // session and let the tag fire her thank-you. The order is then reconstructable
    // from Stripe, which is the system of record for money anyway.
    logger.error('be_order: DB WRITE FAILED — falling back to a list-only write', {
      session: session.id,
      offer: offer.key,
      error: err instanceof Error ? err.message : String(err),
    });
    if (email) {
      await addBackendCustomer({
        email,
        firstName: firstName || undefined,
        offer: offer.key,
        stripeOrderId: session.id,
        bumpPurchased,
      }).catch((awErr) =>
        logger.error('be_order: fallback customer-list write ALSO failed — buyer paid, ' +
          'no row and no email', {
          session: session.id,
          error: awErr instanceof Error ? awErr.message : String(awErr),
        }),
      );
    }
    return null;
  }

  logger.info('be_order recorded', {
    session: session.id,
    offer: offer.key,
    treatment,
    amountCents,
    bump: bumpPurchased,
  });

  // Attribute the sale to the booking-treatment A/B arm she saw (02 only, and only
  // if she was enrolled). Non-blocking and self-guarding — a measurement miss must
  // never cost her the order or her email.
  if (offer.key === 'twin-flame' && metadata.expSubject) {
    await logBeBookingConversion(metadata.expSubject, amountCents).catch((err) =>
      logger.error('be_order: booking-conversion log failed (order still recorded)', {
        session: session.id,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }

  return writeToCustomerList(row, offer);
}

/**
 * Put her on the backend customer list, unless that already happened.
 *
 * Split out so the thank-you page can retry it: that page is the one moment a buyer
 * whose write failed is in front of us again, and a second attempt costs nothing
 * (AWeber upserts, and the row is only stamped on success).
 */
export async function writeToCustomerList(
  row: BeOrder,
  offer?: BackendOffer,
): Promise<BeOrder> {
  if (row.customerListWrittenAt) return row;

  const listing = offer ?? offerFor(row.offer);
  if (!listing) {
    logger.error('be_order: unknown offer on the row, cannot reach the customer list', {
      session: row.stripeSessionId,
      offer: row.offer,
    });
    return row;
  }

  if (!row.email) {
    // Nothing to write to. Stripe collects an email on every hosted Checkout, so this
    // is a shape we should never see — record it as the failure it is rather than
    // silently doing nothing.
    return stamp(row, 'no email on the session');
  }

  const result = await addBackendCustomer({
    email: row.email,
    firstName: row.firstName || undefined,
    offer: listing.key,
    // 🔴 The CHECKOUT SESSION id (cs_…), not the PaymentIntent — it is what joins back
    // to Stripe and to n8n, whose filter reads the session as `body.data.object`.
    stripeOrderId: row.stripeSessionId,
    bumpPurchased: row.bumpPurchased,
    // ⚠ Sent only when that screen exists — see `entryPath` in shared/backendOffers.ts.
    entryUrl: entryUrlFor(listing, row),
  }).catch((err) => ({
    success: false as const,
    error: err instanceof Error ? err.message : 'unknown error',
  }));

  if (result.success) {
    const [updated] = await db
      .update(beOrders)
      .set({ customerListWrittenAt: new Date(), customerListError: null, updatedAt: new Date() })
      .where(eq(beOrders.id, row.id))
      .returning();
    logger.info('be_order: on the customer list, thank-you tag applied', {
      session: row.stripeSessionId,
      offer: listing.key,
    });
    return updated ?? row;
  }

  // 🔴 Rule 8: the write is the send. Loud, and recorded, because this is a woman who
  // has paid and has not been emailed.
  logger.error('be_order: CUSTOMER LIST WRITE FAILED — buyer paid and was not emailed', {
    session: row.stripeSessionId,
    offer: listing.key,
    email: row.email,
    error: result.error,
  });
  return stamp(row, result.error || 'unknown error');
}

async function stamp(row: BeOrder, error: string): Promise<BeOrder> {
  const [updated] = await db
    .update(beOrders)
    .set({ customerListError: error.slice(0, 500), updatedAt: new Date() })
    .where(eq(beOrders.id, row.id))
    .returning();
  return updated ?? row;
}

function offerFor(key: string): BackendOffer | null {
  return isBackendOfferKey(key) ? BACKEND_OFFER_CATALOG[key] : null;
}

/** ACT offers only, and only once their Entry form exists. */
function entryUrlFor(offer: BackendOffer, row: BeOrder): string | undefined {
  if (!offer.entryPath) return undefined;
  const base = (process.env.BASE_URL || 'https://www.theseerwithin.com').replace(/\/$/, '');
  return `${base}${offer.entryPath}?s=${encodeURIComponent(row.stripeSessionId)}`;
}

/** Read an order back — for the thank-you page, and for support. */
export async function getBeOrderBySession(sessionId: string): Promise<BeOrder | null> {
  const [row] = await db
    .select()
    .from(beOrders)
    .where(eq(beOrders.stripeSessionId, sessionId))
    .limit(1);
  return row ?? null;
}
