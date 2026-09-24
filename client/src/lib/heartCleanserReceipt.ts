// Offer 09 — the Heart Cleanser Love Charm: the receipt page's order lookup.
//
// Copy source: improve-v1/v1-one-time-BEs/docs/09/booking-page/09-T1-thank-you-page.md
// Tests: heartCleanserReceipt.test.ts
//
// ⛔ THE RULE (09-T1 "Fallback"): never print receipt lines, an amount or an address
// that weren't verified for THIS order. So the page has exactly two shapes:
//   verified   — the server returned a heart-cleanser order for this ?s=;
//   unverified — anything else: no ?s=, 400/404 (not this offer's order), 402 (not
//                paid), 5xx, offline, a body that isn't JSON, or an order for another
//                offer. All of these render the same calm fallback.
// The lookup is a GET with no side effect the page depends on, so a refresh simply
// asks again.

import { BACKEND_OFFER_CATALOG, HEART_CLEANSER_PRICE_CENTS } from '@shared/backendOffers';
import { displayName } from './upsellCopy/types';

export const HEART_CLEANSER_OFFER = 'heart-cleanser' as const;

// 09-T3's and 09-T4's subjects, word for word (the test reads both docs). Neither
// carries her name, so the page prints them exactly.
export const EMAIL_SUBJECTS = {
  confirmed: 'Your Heart Cleanser Love Charm order is confirmed',
  shipped: 'Your Heart Cleanser Love Charm has shipped',
} as const;

// "Paid: $59 (free shipping)" — the charm only; U1/U2 have their own charges.
export const RECEIPT_PAID_LABEL = `$${
  HEART_CLEANSER_PRICE_CENTS % 100 === 0
    ? HEART_CLEANSER_PRICE_CENTS / 100
    : (HEART_CLEANSER_PRICE_CENTS / 100).toFixed(2)
} (free shipping)`;

// 09-T1 BEAT 4b — printed ONLY for an order whose lookup says `bumpPurchased: true`. Named
// exactly as the Stripe line item, so her card receipt and this page agree; the amount is the
// catalog's. Null if the catalog ever loses the bump, so the page can never print a stale line.
const CHARM_BUMP = BACKEND_OFFER_CATALOG['heart-cleanser'].bump;
export const RECEIPT_BUMP_LINE: { label: string; text: string } | null = CHARM_BUMP
  ? {
      label: 'Added:',
      text: `${CHARM_BUMP.stripeName.replace(/^\+\s*/, '')}, $${(CHARM_BUMP.cents / 100).toFixed(2)}`,
    }
  : null;

export interface VerifiedReceiptOrder {
  firstName: string | null;
  /** The Stripe Checkout address as one newline-joined string, or null → fallback line. */
  shipping: string | null;
  /** She took the 09-C3 bump. Only a literal `true` from the server counts. */
  bumpPurchased: boolean;
}

export type UnverifiedReason = 'missing' | 'not-found' | 'unpaid' | 'error';

export type ReceiptState =
  | { kind: 'verified'; order: VerifiedReceiptOrder }
  | { kind: 'unverified'; reason: UnverifiedReason };

export type ReceiptFetch = (
  url: string,
) => Promise<{ status: number; ok: boolean; json: () => Promise<unknown> }>;

export function orderLookupUrl(sessionId: string): string {
  return `/api/backend/order/${encodeURIComponent(sessionId)}?offer=${HEART_CLEANSER_OFFER}`;
}

const unverified = (reason: UnverifiedReason): ReceiptState => ({ kind: 'unverified', reason });

export async function loadHeartCleanserReceipt(
  sessionId: string | null | undefined,
  fetchImpl: ReceiptFetch = (url) => fetch(url),
): Promise<ReceiptState> {
  const id = sessionId?.trim();
  if (!id) return unverified('missing');

  let response: Awaited<ReturnType<ReceiptFetch>>;
  try {
    response = await fetchImpl(orderLookupUrl(id));
  } catch {
    return unverified('error');
  }

  if (response.status === 402) return unverified('unpaid');
  if (response.status === 400 || response.status === 404) return unverified('not-found');
  if (!response.ok) return unverified('error');

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return unverified('error');
  }

  const order = (body as { order?: unknown } | null)?.order as Record<string, unknown> | null | undefined;
  // Defence in depth: the server already filters on ?offer=, but a receipt must never
  // print another offer's order whatever comes back.
  if (!order || typeof order !== 'object' || order.offer !== HEART_CLEANSER_OFFER) {
    return unverified('not-found');
  }

  const shipping = typeof order.shipping === 'string' && order.shipping.trim() ? order.shipping : null;
  return {
    kind: 'verified',
    order: {
      firstName: typeof order.firstName === 'string' ? order.firstName : null,
      shipping,
      bumpPurchased: order.bumpPurchased === true,
    },
  };
}

/** Her name, or Evelyn's own fallback. "Friend" is the checkout placeholder, not a name. */
export function receiptFirstName(firstName: string | null | undefined): string {
  return displayName(firstName, ['Friend']) || 'dear';
}
