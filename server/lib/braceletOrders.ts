import Stripe from 'stripe';
import { Resend } from 'resend';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { braceletOrders } from '@shared/schema';
import { getBraceletBySlug, BUSINESS, FULFILMENT } from '@shared/braceletProducts';
import logger from './logger';

// Persist + confirm a bracelet order from the Facebook-compliance storefront.
//
// WHY THE WEBHOOK, NOT THE THANK-YOU PAGE
// The buyer can pay and close the tab before the redirect lands. The funnel already has
// exactly this bug — `addPaidSubscriber` has one caller, /api/upsell/user-data, so a
// pay-and-close-tab buyer is never added to the AWeber paid list and never counted. We
// are not repeating it. The Stripe webhook is authoritative; the thank-you page only
// READS what the webhook wrote (and upserts as a backstop if it arrives first).
//
// IDEMPOTENT. stripe_session_id is UNIQUE and this is an upsert, because Stripe retries
// checkout.session.completed and the thank-you page hits the same session. Two writes,
// one row, one email.

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.ORDERS_FROM_EMAIL || 'The Seer Within <hi@theseerwithin.com>';
/** Where the "you have an order to ship" alert goes. Falls back to the support inbox. */
const OPERATOR = process.env.ORDERS_NOTIFY_EMAIL || BUSINESS.email;

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export interface RecordedOrder {
  stripeSessionId: string;
  productSlug: string;
  productName: string;
  quantity: number;
  amountCents: number;
  email: string | null;
  customerName: string | null;
  shipping: {
    name: string | null;
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postal: string | null;
    country: string | null;
  };
  status: string;
  createdAt: Date;
}

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

function shippingFrom(session: Stripe.Checkout.Session) {
  // Stripe has moved this between `shipping_details` and `collected_information` across
  // API versions, and typings lag. Read both shapes defensively, fall back to the billing
  // address on customer_details — an order with no address is a parcel nobody can post.
  const raw = session as unknown as {
    shipping_details?: AddressLike;
    collected_information?: { shipping_details?: AddressLike };
    customer_details?: AddressLike;
  };
  const s =
    raw.shipping_details ??
    raw.collected_information?.shipping_details ??
    raw.customer_details;
  const addr = s?.address;
  return {
    name: s?.name ?? null,
    line1: addr?.line1 ?? null,
    line2: addr?.line2 ?? null,
    city: addr?.city ?? null,
    state: addr?.state ?? null,
    postal: addr?.postal_code ?? null,
    country: addr?.country ?? null,
  };
}

/**
 * Write the order and send both confirmation emails. Safe to call more than once for the
 * same session — the second call is a no-op for the email.
 */
export async function recordBraceletOrder(
  session: Stripe.Checkout.Session,
): Promise<RecordedOrder | null> {
  const slug = session.metadata?.slug;
  const product = getBraceletBySlug(slug);
  if (!product) {
    logger.warn('recordBraceletOrder: unknown slug, ignoring', { slug, session: session.id });
    return null;
  }

  const quantity = Number(session.metadata?.quantity) || 1;
  const email = session.customer_details?.email ?? null;
  const customerName = session.customer_details?.name ?? null;
  const phone = session.customer_details?.phone ?? null;
  const ship = shippingFrom(session);
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const [row] = await db
    .insert(braceletOrders)
    .values({
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      productSlug: product.slug,
      productName: product.name,
      quantity,
      amountCents: session.amount_total ?? product.priceCents * quantity,
      currency: session.currency ?? 'usd',
      email,
      customerName,
      phone,
      shippingName: ship.name,
      shippingLine1: ship.line1,
      shippingLine2: ship.line2,
      shippingCity: ship.city,
      shippingState: ship.state,
      shippingPostal: ship.postal,
      shippingCountry: ship.country,
      status: 'paid',
    })
    // Idempotent: a retry updates the same row instead of creating a second one.
    .onConflictDoUpdate({
      target: braceletOrders.stripeSessionId,
      set: {
        stripePaymentIntentId: paymentIntentId,
        email,
        customerName,
        phone,
        shippingName: ship.name,
        shippingLine1: ship.line1,
        shippingCity: ship.city,
        shippingPostal: ship.postal,
        shippingCountry: ship.country,
        updatedAt: new Date(),
      },
    })
    .returning();

  logger.info('braceletOrder recorded', {
    session: session.id,
    slug: product.slug,
    quantity,
    amountCents: row.amountCents,
  });

  // Emails are best-effort and must NEVER fail the webhook — Stripe would retry forever.
  if (!row.confirmationEmailSentAt) {
    sendConfirmationEmails(row.id, {
      productName: product.name,
      quantity,
      amountCents: row.amountCents,
      email,
      customerName,
      phone,
      shipping: ship,
      sessionId: session.id,
    }).catch((err) => logger.error('braceletOrder emails failed (non-blocking):', err));
  }

  return {
    stripeSessionId: row.stripeSessionId,
    productSlug: row.productSlug,
    productName: row.productName,
    quantity: row.quantity,
    amountCents: row.amountCents,
    email: row.email,
    customerName: row.customerName,
    shipping: ship,
    status: row.status,
    createdAt: row.createdAt,
  };
}

interface EmailInput {
  productName: string;
  quantity: number;
  amountCents: number;
  email: string | null;
  customerName: string | null;
  phone: string | null;
  shipping: ReturnType<typeof shippingFrom>;
  sessionId: string;
}

async function sendConfirmationEmails(orderId: string, o: EmailInput): Promise<void> {
  if (!resend) {
    logger.warn('braceletOrder: RESEND_API_KEY not set — skipping confirmation emails');
    return;
  }

  const addr = [o.shipping.name, o.shipping.line1, o.shipping.line2, o.shipping.city,
    o.shipping.state, o.shipping.postal, o.shipping.country]
    .filter(Boolean)
    .join(', ');
  const ref = o.sessionId.slice(-8).toUpperCase();

  // 1. The buyer.
  if (o.email) {
    await resend.emails.send({
      from: FROM,
      to: o.email,
      subject: `Order confirmed — ${o.productName}`,
      html: `
        <div style="font-family:Inter,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0F172A">
          <h1 style="font-family:Georgia,serif;font-size:24px;color:#0F172A">Thank you${o.customerName ? `, ${o.customerName}` : ''}.</h1>
          <p style="color:#475569;line-height:1.6">Your order is confirmed and we're preparing it now.</p>
          <table style="width:100%;border-collapse:collapse;margin:22px 0">
            <tr><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;color:#64748B">Order</td>
                <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;text-align:right"><strong>#${ref}</strong></td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;color:#64748B">Item</td>
                <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;text-align:right">${o.productName} × ${o.quantity}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;color:#64748B">Total</td>
                <td style="padding:10px 0;border-bottom:1px solid #E2E8F0;text-align:right"><strong>${money(o.amountCents)}</strong></td></tr>
            ${addr ? `<tr><td style="padding:10px 0;color:#64748B">Ships to</td>
                <td style="padding:10px 0;text-align:right">${addr}</td></tr>` : ''}
          </table>
          <p style="color:#475569;line-height:1.6">
            Your order ships within <strong>${FULFILMENT.shipsWithin}</strong>, and a tracking
            email follows ${FULFILMENT.trackingEmail}. Returns are accepted for
            ${FULFILMENT.returnWindowDays} days.
          </p>
          <p style="color:#475569;line-height:1.6">
            Any questions, just reply to this email or call ${BUSINESS.phone}.
          </p>
          <hr style="border:0;border-top:1px solid #E2E8F0;margin:26px 0">
          <p style="color:#94A3B8;font-size:12px;line-height:1.6">
            ${BUSINESS.legalName}<br>${BUSINESS.addressLines.join('<br>')}<br>
            ${BUSINESS.email} · ${BUSINESS.phone}
          </p>
        </div>`,
    });
  } else {
    logger.warn('braceletOrder: no customer email on the session — buyer not emailed', { orderId });
  }

  // 2. The operator — otherwise nobody knows there is a parcel to post.
  await resend.emails.send({
    from: FROM,
    to: OPERATOR,
    subject: `🔔 New bracelet order #${ref} — ${o.productName} × ${o.quantity} (${money(o.amountCents)})`,
    html: `
      <div style="font-family:monospace;font-size:14px;color:#0F172A">
        <h2>New order to ship</h2>
        <p><strong>${o.productName}</strong> × ${o.quantity} — ${money(o.amountCents)}</p>
        <p>Buyer: ${o.customerName || '(no name)'} &lt;${o.email || 'no email'}&gt;${o.phone ? ` · ${o.phone}` : ''}</p>
        <p>Ship to:<br>${addr ? addr.split(', ').join('<br>') : '<em>NO SHIPPING ADDRESS ON THE SESSION</em>'}</p>
        <p>Stripe session: ${o.sessionId}</p>
      </div>`,
  });

  await db
    .update(braceletOrders)
    .set({ confirmationEmailSentAt: new Date(), updatedAt: new Date() })
    .where(eq(braceletOrders.id, orderId));

  logger.info('braceletOrder confirmation emails sent', { orderId, to: o.email, operator: OPERATOR });
}

/** Read an order back for the thank-you page. */
export async function getBraceletOrderBySession(sessionId: string) {
  const [row] = await db
    .select()
    .from(braceletOrders)
    .where(eq(braceletOrders.stripeSessionId, sessionId))
    .limit(1);
  return row ?? null;
}
