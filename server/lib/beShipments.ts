import type Stripe from 'stripe';
import { and, eq, sql } from 'drizzle-orm';
import { db } from './db';
import { beOrders, beShipments, type BeShipment, type InsertBeShipment } from '@shared/schema';
import {
  BACKEND_OFFER_CATALOG,
  BACKEND_STRIPE_PRODUCT_PREFIX,
  backendOfferForStripeProduct,
  isBackendOfferKey,
  type BackendOffer,
} from '@shared/backendOffers';
import { shippingFromSession } from './stripeShipping';
import {
  addressLines,
  doNotShipAlert,
  newShipmentAlert,
  sendOperatorEmail,
  unrecordedShipmentAlert,
} from './beShipmentAlerts';
import logger from './logger';

// Backend-deck SHIPMENTS — one parcel per paid physical booking (06, 09).
//
// ── WHY ITS OWN TABLE, AND WHY IT DOES NOT WAIT FOR be_orders ────────────────────
// Production may lack the 07/08 be_orders columns, so the be_orders insert can fail there.
// A woman who paid for a physical object must still have a parcel on record and the
// operator must still be told to post it. So this module is called from the webhook AND
// the order-lookup retry, beside recordBackendOrder, never inside it.
//
// ── IDEMPOTENT ───────────────────────────────────────────────────────────────────
// `stripe_session_id` is UNIQUE and the write is an upsert that never rewrites the
// address, status or tracking. The operator alert is stamped (`operator_alerted_at`) and
// skipped once stamped; a failed alert is recorded (`operator_alert_error`) and the next
// caller retries it. Check-then-send, on purpose: two racing callers can at worst send the
// operator a duplicate email, never zero emails.
//
// 🔴 NOTHING HERE THROWS. Every caller is a webhook or a receipt; a shipment failure must
//    never fail either. Failures are logged loudly and, where possible, recorded.

const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

function offerForKey(key: string): BackendOffer | null {
  return isBackendOfferKey(key) ? BACKEND_OFFER_CATALOG[key] : null;
}

/** Read a shipment back by its Checkout session. Throws on a database error. */
export async function getShipmentBySession(sessionId: string): Promise<BeShipment | null> {
  const [row] = await db
    .select()
    .from(beShipments)
    .where(eq(beShipments.stripeSessionId, sessionId))
    .limit(1);
  return row ?? null;
}

/**
 * Record the parcel a paid physical backend booking owes, then tell the operator.
 *
 * Returns null — and writes nothing — for anything that is not a PAID session of a
 * catalog offer with `collectsShipping`: funnel products, digital offers, upsells.
 */
export async function recordBackendShipment(
  session: Stripe.Checkout.Session,
  opts: { beOrderId?: string | null } = {},
): Promise<BeShipment | null> {
  const metadata = (session.metadata || {}) as Record<string, string | undefined>;
  const offer = backendOfferForStripeProduct(metadata.product);
  if (!offer || !offer.collectsShipping) return null;

  if (session.payment_status !== 'paid') {
    logger.warn('be_shipments: session is not paid — no shipment recorded', {
      session: session.id,
      offer: offer.key,
      paymentStatus: session.payment_status,
    });
    return null;
  }

  // ⛔ No billing fallback: a billing address is often just a country and a postcode.
  const { address } = shippingFromSession(session, { billingFallback: false });
  const addressMissing = !address.line1 || !address.country;
  const email = session.customer_details?.email || session.customer_email || metadata.email || null;
  const phone = session.customer_details?.phone ?? null;
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
  const beOrderId = opts.beOrderId ?? null;
  // The order bump, read exactly as beOrders reads it: checkout writes `bump: '1'` from what
  // the SERVER priced, and the key comes from the catalog, never from the metadata. An offer
  // with no bump cannot have sold one. 09's bump is done by hand before packing (09-C3).
  const bump = metadata.bump === '1' ? offer.bump : undefined;
  const bumpPurchased = Boolean(bump);

  const values: InsertBeShipment = {
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    beOrderId,
    offer: offer.key,
    offerNumber: offer.number,
    sku: offer.stripeProduct,
    // Operator decision 2026-09-15: one per order, no quantity selector.
    quantity: 1,
    bumpPurchased,
    bumpProductKey: bump?.productKey ?? null,
    email,
    recipientName: address.name,
    phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postal,
    country: address.country,
    addressMissing,
    status: 'pending',
  };

  let row: BeShipment | undefined;
  try {
    [row] = await db
      .insert(beShipments)
      .values(values)
      .onConflictDoUpdate({
        target: beShipments.stripeSessionId,
        // ⛔ A retry may only FILL a missing link. It never rewrites the address, the
        //    status or the tracking — the parcel may already be packed or posted.
        set: {
          stripePaymentIntentId: sql`COALESCE(${beShipments.stripePaymentIntentId}, ${paymentIntentId}::text)`,
          beOrderId: sql`COALESCE(${beShipments.beOrderId}, ${beOrderId}::varchar)`,
          updatedAt: new Date(),
        },
      })
      .returning();
  } catch (err) {
    const error = errMsg(err);
    logger.error('be_shipments: WRITE FAILED — a paid parcel has no shipment row; alerting the operator anyway', {
      session: session.id,
      offer: offer.key,
      error,
    });
    // 🔴 The row is not the parcel. Tell the operator straight from the session.
    const sent = await sendOperatorEmail(
      unrecordedShipmentAlert({ offer, sessionId: session.id, paymentIntentId, email, phone, address, addressMissing, bumpPurchased, error }),
    );
    if (!sent.ok) {
      logger.error('be_shipments: fallback operator alert ALSO failed — nobody has been told to post this parcel', {
        session: session.id,
        offer: offer.key,
        error: sent.error,
      });
    }
    return null;
  }

  if (!row) return null;

  if (addressMissing) {
    logger.error('be_shipments: PAID ORDER HAS NO SHIPPING ADDRESS — the operator must contact the buyer', {
      session: session.id,
      offer: offer.key,
      shipment: row.id,
    });
  }

  return alertOperatorOnce(row);
}

/**
 * Send the "post this parcel" email unless it already went. Records success or failure
 * on the row; never throws. Returns the row as it stands afterwards.
 */
export async function alertOperatorOnce(row: BeShipment): Promise<BeShipment> {
  if (row.operatorAlertedAt) return row;

  const sent = await sendOperatorEmail(newShipmentAlert(row, offerForKey(row.offer)));

  try {
    if (sent.ok) {
      const [updated] = await db
        .update(beShipments)
        .set({ operatorAlertedAt: new Date(), operatorAlertError: null, updatedAt: new Date() })
        .where(eq(beShipments.id, row.id))
        .returning();
      logger.info('be_shipments: operator alerted', { shipment: row.id, offer: row.offer });
      return updated ?? row;
    }

    logger.error('be_shipments: OPERATOR ALERT FAILED — nobody has been told to post this parcel', {
      shipment: row.id,
      session: row.stripeSessionId,
      offer: row.offer,
      error: sent.error,
    });
    const [updated] = await db
      .update(beShipments)
      .set({ operatorAlertError: sent.error.slice(0, 500), updatedAt: new Date() })
      .where(eq(beShipments.id, row.id))
      .returning();
    return updated ?? row;
  } catch (err) {
    logger.error('be_shipments: could not record the operator-alert outcome', {
      shipment: row.id,
      alertSent: sent.ok,
      error: errMsg(err),
    });
    return row;
  }
}

/**
 * The order-lookup backstop: make sure a physical order has its shipment row and its
 * operator alert. For a digital or unknown offer it does nothing and reads nothing.
 * Never throws — a receipt must render even when shipments are broken.
 */
export async function ensureBackendShipment(opts: {
  sessionId: string;
  offerKey: string;
  beOrderId?: string | null;
  /** A session already retrieved from Stripe, when the caller has one. */
  session?: Stripe.Checkout.Session | null;
  /** How to fetch the session when the row is missing and none was passed. */
  retrieveSession?: () => Promise<Stripe.Checkout.Session | null>;
}): Promise<BeShipment | null> {
  const offer = offerForKey(opts.offerKey);
  if (!offer?.collectsShipping) return null;

  try {
    const existing = await getShipmentBySession(opts.sessionId);
    if (existing) return existing.operatorAlertedAt ? existing : await alertOperatorOnce(existing);

    const session = opts.session ?? (opts.retrieveSession ? await opts.retrieveSession() : null);
    if (!session) return null;
    return await recordBackendShipment(session, { beOrderId: opts.beOrderId ?? null });
  } catch (err) {
    logger.error('be_shipments: order-lookup backstop failed (receipt still renders)', {
      session: opts.sessionId,
      offer: opts.offerKey,
      error: errMsg(err),
    });
    return null;
  }
}

/**
 * What a thank-you page may show about the parcel.
 *
 * `shipping` is ONE STRING, one address line per line — the shape the 06 receipt already
 * types and renders (`whitespace-pre-line`). `shippingAddress` is the same address,
 * structured, for a page that wants the parts. ⛔ No phone, no payment ids, no email.
 */
export function publicShipping(row: BeShipment | null): {
  shipping: string | null;
  shippingAddress: {
    recipientName: string | null;
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    status: string;
    addressMissing: boolean;
  } | null;
} {
  if (!row) return { shipping: null, shippingAddress: null };
  const lines = addressLines(row);
  return {
    shipping: row.addressMissing || lines.length === 0 ? null : lines.join('\n'),
    shippingAddress: {
      recipientName: row.recipientName,
      line1: row.line1,
      line2: row.line2,
      city: row.city,
      state: row.state,
      postalCode: row.postalCode,
      country: row.country,
      status: row.status,
      addressMissing: row.addressMissing,
    },
  };
}

/**
 * `charge.refunded`, for BACKEND products only.
 *
 * Gate: the charge's `metadata.product` must start with `be_`. When the charge carries no
 * product, the PaymentIntent's metadata is read instead (checkout puts `product` there).
 * Anything else — every funnel product — returns before touching the database.
 *
 * On a FULL refund: be_orders.status → 'refunded' (when a row exists), any PENDING shipment
 * → 'cancelled' (reason 'refunded'), and a "DO NOT SHIP" email per cancelled parcel. A
 * shipment already shipped is left alone. A PARTIAL refund changes nothing and is logged —
 * a goodwill partial refund must not silently stop a parcel. Never throws.
 */
export async function handleBackendRefund(
  charge: Stripe.Charge,
  deps: {
    retrievePaymentIntent?: (id: string) => Promise<{ metadata?: Record<string, string> | null } | null>;
  } = {},
): Promise<void> {
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id ?? null;

  try {
    let product: string | undefined = charge.metadata?.product;
    if (!product && paymentIntentId && deps.retrievePaymentIntent) {
      try {
        product = (await deps.retrievePaymentIntent(paymentIntentId))?.metadata?.product;
      } catch (err) {
        logger.warn('BE refund: could not read the PaymentIntent to identify the product', {
          charge: charge.id,
          error: errMsg(err),
        });
        return;
      }
    }
    if (!product?.startsWith(BACKEND_STRIPE_PRODUCT_PREFIX)) return;

    if (!paymentIntentId) {
      logger.warn('BE refund: charge has no PaymentIntent — cannot find the order', { charge: charge.id, product });
      return;
    }

    if (!charge.refunded) {
      logger.warn('BE refund: PARTIAL refund — order and shipment left as they are; check by hand', {
        charge: charge.id,
        paymentIntent: paymentIntentId,
        product,
        amount: charge.amount,
        amountRefunded: charge.amount_refunded,
      });
      return;
    }

    // 1 · the order. No `.returning()` — production may lack the 07/08 be_orders columns.
    try {
      await db
        .update(beOrders)
        .set({ status: 'refunded', updatedAt: new Date() })
        .where(eq(beOrders.stripePaymentIntentId, paymentIntentId));
    } catch (err) {
      logger.error('BE refund: could not mark be_orders refunded (continuing to the shipment)', {
        paymentIntent: paymentIntentId,
        error: errMsg(err),
      });
    }

    // 2 · the parcel.
    const rows = await db
      .select()
      .from(beShipments)
      .where(and(eq(beShipments.stripePaymentIntentId, paymentIntentId), eq(beShipments.status, 'pending')));

    for (const pending of rows.filter((r) => r.status === 'pending')) {
      const [cancelled] = await db
        .update(beShipments)
        .set({ status: 'cancelled', cancelledAt: new Date(), cancelReason: 'refunded', updatedAt: new Date() })
        .where(and(eq(beShipments.id, pending.id), eq(beShipments.status, 'pending')))
        .returning();
      if (!cancelled) continue;

      logger.warn('BE refund: pending shipment CANCELLED — do not ship', {
        shipment: cancelled.id,
        session: cancelled.stripeSessionId,
        offer: cancelled.offer,
      });
      const sent = await sendOperatorEmail(doNotShipAlert(cancelled, offerForKey(cancelled.offer)));
      if (!sent.ok) {
        logger.error('BE refund: DO-NOT-SHIP alert FAILED — the operator may still post a refunded parcel', {
          shipment: cancelled.id,
          session: cancelled.stripeSessionId,
          error: sent.error,
        });
      }
    }
  } catch (err) {
    logger.error('BE refund handling failed (webhook still acknowledged)', {
      charge: charge.id,
      paymentIntent: paymentIntentId,
      error: errMsg(err),
    });
  }
}
