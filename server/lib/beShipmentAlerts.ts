import { Resend } from 'resend';
import { BUSINESS } from '@shared/braceletProducts';
import type { BackendOffer } from '@shared/backendOffers';
import type { BeShipment } from '@shared/schema';
import type { StripeShippingAddress } from './stripeShipping';

// The operator emails for backend-deck SHIPMENTS: "a paid parcel is waiting", and "that
// parcel was refunded — do not ship it". Same sender and recipient as the storefront's
// order alert (server/lib/braceletOrders.ts).
//
// ⛔ These name the ADMIN API ROUTE that marks a parcel shipped, never an admin page:
//    how packing is run is the operator's own call (2026-09-15).
//
// Every value is plain text first; the HTML version is that text, escaped, so nothing a
// buyer typed into Stripe (her name, her address) can inject markup into the email.

export interface OperatorEmail {
  subject: string;
  text: string;
  html: string;
}

export type SendResult = { ok: true } | { ok: false; error: string };

const FROM_DEFAULT = 'The Seer Within <hi@theseerwithin.com>';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function asEmail(subject: string, lines: string[]): OperatorEmail {
  const text = lines.join('\n');
  return {
    subject,
    text,
    html:
      '<div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px;' +
      `line-height:1.5;white-space:pre-wrap;color:#0F172A">${escapeHtml(text)}</div>`,
  };
}

/**
 * Send one operator email. Never throws: a missing key, a Resend API error and a network
 * failure all come back as `{ ok: false, error }` for the caller to record.
 */
export async function sendOperatorEmail(msg: OperatorEmail): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: 'RESEND_API_KEY not set — operator alert not sent' };

  const to = process.env.ORDERS_NOTIFY_EMAIL || BUSINESS.email;
  const from = process.env.ORDERS_FROM_EMAIL || FROM_DEFAULT;

  try {
    const result = (await new Resend(key).emails.send({
      from,
      to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    })) as { error?: { message?: string } | null } | undefined;
    if (result?.error) {
      return { ok: false, error: `Resend: ${result.error.message ?? JSON.stringify(result.error)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── shared pieces ─────────────────────────────────────────────────────────────

const ref = (sessionId: string) => sessionId.slice(-8).toUpperCase();

function label(offerNumber: string, offer: BackendOffer | null, fallback: string): string {
  return `BE ${offerNumber} · ${offer?.stripeName ?? fallback}`;
}

function isoOf(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return typeof value === 'string' && value ? value : new Date().toISOString();
}

interface AddressParts {
  recipientName: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

export function addressLines(a: AddressParts): string[] {
  const statePostal = [a.state, a.postalCode].filter(Boolean).join(' ');
  const cityLine = [a.city, statePostal].filter(Boolean).join(', ');
  return [a.recipientName, a.line1, a.line2, cityLine, a.country].filter(
    (line): line is string => Boolean(line),
  );
}

function shipToBlock(a: AddressParts, addressMissing: boolean): string[] {
  if (addressMissing) {
    return [
      'Ship to:',
      'NO SHIPPING ADDRESS ON THE STRIPE SESSION — get the address from the buyer before packing.',
      ...(a.recipientName ? [`(Name on the session: ${a.recipientName})`] : []),
    ];
  }
  return ['Ship to:', ...addressLines(a)];
}

/**
 * The order bump, as the packer must see it. NULL unless the offer's bump is something a
 * person DOES before packing (`packingAlert`, 09's Reiki charging). A text-instructional
 * bump (06's Closed Purse) returns null, so it never borrows the alarm and adds no line.
 */
function packingBump(
  offer: BackendOffer | null,
  bumpPurchased: boolean,
): { headline: string | null; firstLine: string | null; detail: string } | null {
  const bump = offer?.bump;
  if (!bump?.packingAlert) return null;
  const name = bump.stripeName.replace(/^\+\s*/, '');
  if (!bumpPurchased) return { headline: null, firstLine: null, detail: `${name}: NO — pack as normal.` };
  const headline = `⚡ ${bump.packingAlert}`;
  return {
    headline,
    firstLine: `${headline} — this order paid for "${name}". Do it BEFORE the parcel is packed, without delaying dispatch.`,
    detail: `${name}: YES — paid add-on (${bump.productKey}).`,
  };
}

/** The alarm goes FIRST in the subject, so it survives an inbox that truncates. */
const withHeadline = (headline: string | null | undefined, subject: string) =>
  headline ? `${headline} · ${subject}` : subject;

function markShippedBlock(shipmentId: string): string[] {
  return [
    'When the parcel is posted, mark it shipped through the admin API (admin login token required):',
    `POST /api/admin/shipments/${shipmentId}/shipped`,
    '{"carrier": "…", "trackingNumber": "…", "trackingUrl": "https://…"}',
    'That stores the tracking and, where the offer has a shipped Campaign, applies its AWeber tag (her tracking email).',
    `If it must not ship: POST /api/admin/shipments/${shipmentId}/cancel with {"reason": "…"}`,
  ];
}

// ─── the three emails ──────────────────────────────────────────────────────────

/** A new paid parcel, recorded in be_shipments. */
export function newShipmentAlert(row: BeShipment, offer: BackendOffer | null): OperatorEmail {
  const name = label(row.offerNumber, offer, row.offer);
  const bump = packingBump(offer, row.bumpPurchased === true);
  const subject = withHeadline(
    bump?.headline,
    row.addressMissing
      ? `⚠ ${name} PAID — NO SHIPPING ADDRESS #${ref(row.stripeSessionId)}`
      : `📦 ${name} to ship #${ref(row.stripeSessionId)} — × ${row.quantity}`,
  );

  return asEmail(subject, [
    ...(bump?.firstLine ? [bump.firstLine, ''] : []),
    row.addressMissing
      ? 'A paid order is waiting to ship, but Stripe has NO shipping address for it.'
      : 'A paid order is waiting to be packed and shipped.',
    '',
    `Shipment id: ${row.id}`,
    `Offer: ${name}`,
    `SKU: ${row.sku}`,
    `Quantity: ${row.quantity}`,
    ...(bump ? [bump.detail] : []),
    '',
    ...shipToBlock(row, row.addressMissing),
    ...(row.phone ? [`Phone: ${row.phone}`] : []),
    '',
    `Buyer email: ${row.email ?? '(none on the session)'}`,
    `Paid: ${isoOf(row.createdAt)}`,
    `Stripe Checkout session: ${row.stripeSessionId}`,
    `Stripe PaymentIntent: ${row.stripePaymentIntentId ?? '(none on the session)'}`,
    '',
    ...markShippedBlock(row.id),
  ]);
}

/** A paid parcel that could NOT be written to be_shipments — the database is the problem. */
export function unrecordedShipmentAlert(input: {
  offer: BackendOffer;
  sessionId: string;
  paymentIntentId: string | null;
  email: string | null;
  phone: string | null;
  address: StripeShippingAddress;
  addressMissing: boolean;
  /** From the session metadata — the row that would have carried it was never written. */
  bumpPurchased: boolean;
  error: string;
}): OperatorEmail {
  const name = label(input.offer.number, input.offer, input.offer.key);
  const bump = packingBump(input.offer, input.bumpPurchased);
  const parts: AddressParts = {
    recipientName: input.address.name,
    line1: input.address.line1,
    line2: input.address.line2,
    city: input.address.city,
    state: input.address.state,
    postalCode: input.address.postal,
    country: input.address.country,
  };

  return asEmail(withHeadline(bump?.headline, `⚠ ${name} to ship — NOT RECORDED in be_shipments #${ref(input.sessionId)}`), [
    ...(bump?.firstLine ? [bump.firstLine, ''] : []),
    'A paid order needs packing and shipping, but it could NOT be saved to be_shipments.',
    `Why: ${input.error}`,
    'Until the row exists the admin API cannot mark it shipped. Opening the buyer\'s order page retries the save.',
    '',
    `Offer: ${name}`,
    `SKU: ${input.offer.stripeProduct}`,
    'Quantity: 1',
    ...(bump ? [bump.detail] : []),
    '',
    ...shipToBlock(parts, input.addressMissing),
    ...(input.phone ? [`Phone: ${input.phone}`] : []),
    '',
    `Buyer email: ${input.email ?? '(none on the session)'}`,
    `Stripe Checkout session: ${input.sessionId}`,
    `Stripe PaymentIntent: ${input.paymentIntentId ?? '(none on the session)'}`,
  ]);
}

/** A pending parcel whose payment was fully refunded — it has just been cancelled. */
export function doNotShipAlert(row: BeShipment, offer: BackendOffer | null): OperatorEmail {
  const name = label(row.offerNumber, offer, row.offer);
  // ⛔ No alarm headline here: DO NOT SHIP must stay first. The detail line only says whether
  //    the refunded order had paid for the bump, so nobody charges a charm that won't ship.
  const bump = packingBump(offer, row.bumpPurchased === true);
  return asEmail(`🛑 DO NOT SHIP — ${name} #${ref(row.stripeSessionId)} was refunded`, [
    'Stripe reports this order fully refunded. Its shipment has been set to cancelled.',
    'If the parcel is already packed, do not post it.',
    '',
    `Shipment id: ${row.id}`,
    `Offer: ${name}`,
    `SKU: ${row.sku}`,
    `Quantity: ${row.quantity}`,
    ...(bump ? [bump.detail] : []),
    '',
    ...shipToBlock(row, row.addressMissing),
    '',
    `Buyer email: ${row.email ?? '(none on the session)'}`,
    `Stripe Checkout session: ${row.stripeSessionId}`,
    `Stripe PaymentIntent: ${row.stripePaymentIntentId ?? '(none on the session)'}`,
  ]);
}
