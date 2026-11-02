// Offer 12 — Lucky Numbers: the receipt page's order lookup.
//
// Copy spec: improve-v1/v1-one-time-BEs/docs/12/booking-page/12-T1-thank-you-page.md
// Tests: luckyNumbersReceipt.test.ts
//
// 11's receipt (lib/unsentLetterReceipt.ts) with 12's offer key and words, and ⛔ no chat gift:
// 11's free 15 minutes were an operator exception for 11 alone.
//
// ⛔ THE RULE: never print receipt lines or the bump's P.S. for an order that wasn't verified as
// THIS offer's, and paid. So the page has exactly two final shapes:
//   verified   — the server returned a paid lucky-numbers order for this ?s=;
//   unverified — anything else: no ?s=, 400/404 (not this offer's order), a refunded or cancelled
//                row, a body that isn't JSON, or an order for another offer — and, once the poll
//                window closes, a 402 (not paid yet) or a 5xx/offline that never cleared.
//
// The poll exists for one race: Stripe's success_url (via the upsells) can land her here before
// the paid webhook has written the row.

import { displayName } from './upsellCopy/types';

export const LUCKY_NUMBERS_OFFER = 'lucky-numbers' as const;

// 12-T3's subject and 12-T4's, word for word (the test reads the docs). With no name the
// title reads "dear — your lucky numbers are worked out".
export const EMAIL_SUBJECTS = {
  confirmed: 'Your Lucky Numbers reading is confirmed',
  delivered: (name: string): string => `${name} — your lucky numbers are worked out`,
} as const;

// The bump buyer's P.S. (12-T1), word for word. ⭐ The Full Year is the last page of her PDF.
export const RECEIPT_BUMP_PS =
  "P.S. You added The Full Year. It's the last page of your reading: every lucky day you've got in 2027, on one calendar page.";

/** The P.S. for this order: bump buyers only, otherwise nothing. */
export function receiptPostscript(order: Pick<VerifiedNumbersOrder, 'bumpPurchased'>): string | null {
  return order.bumpPurchased === true ? RECEIPT_BUMP_PS : null;
}

export interface VerifiedNumbersOrder {
  firstName: string | null;
  /** She took The Full Year. Only a literal `true` from the server counts. */
  bumpPurchased: boolean;
  /** The reading has already gone out (`deliveredAt` set). */
  delivered: boolean;
}

export type UnverifiedReason = 'missing' | 'not-found' | 'unpaid' | 'error';

export type NumbersReceiptState =
  | { kind: 'verified'; order: VerifiedNumbersOrder }
  | { kind: 'unverified'; reason: UnverifiedReason };

/** One lookup's answer: final, or worth asking again until the window closes. */
export type NumbersReceiptAttempt = NumbersReceiptState | { kind: 'pending'; reason: 'unpaid' | 'error' };

export type ReceiptFetch = (
  url: string,
) => Promise<{ status: number; ok: boolean; json: () => Promise<unknown> }>;

export function orderLookupUrl(sessionId: string): string {
  return `/api/backend/order/${encodeURIComponent(sessionId)}?offer=${LUCKY_NUMBERS_OFFER}`;
}

const unverified = (reason: UnverifiedReason): NumbersReceiptState => ({ kind: 'unverified', reason });

/** The `?s=` the upsell chain hands over (Stripe's own `?session_id=` accepted as well). */
export function receiptSessionId(search: string): string | null {
  const params = new URLSearchParams(search);
  const id = params.get('s') || params.get('session_id');
  return id && id.trim() ? id.trim() : null;
}

/** ONE lookup. 402 and 5xx/offline are `pending` — the poll asks again. */
export async function lookupNumbersReceipt(
  sessionId: string,
  fetchImpl: ReceiptFetch = (url) => fetch(url),
): Promise<NumbersReceiptAttempt> {
  let response: Awaited<ReturnType<ReceiptFetch>>;
  try {
    response = await fetchImpl(orderLookupUrl(sessionId));
  } catch {
    return { kind: 'pending', reason: 'error' };
  }

  if (response.status === 402) return { kind: 'pending', reason: 'unpaid' };
  if (response.status === 400 || response.status === 404) return unverified('not-found');
  if (!response.ok) return { kind: 'pending', reason: 'error' };

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return unverified('error');
  }

  const order = (body as { order?: unknown } | null)?.order as Record<string, unknown> | null | undefined;
  // Defence in depth: the server already filters on ?offer=, but a receipt must never print
  // another offer's order whatever comes back.
  if (!order || typeof order !== 'object' || order.offer !== LUCKY_NUMBERS_OFFER) {
    return unverified('not-found');
  }
  // A refunded or cancelled row is not a reading on its way.
  if (order.status !== 'paid') return unverified('unpaid');

  return {
    kind: 'verified',
    order: {
      firstName: typeof order.firstName === 'string' ? order.firstName : null,
      bumpPurchased: order.bumpPurchased === true,
      delivered: typeof order.deliveredAt === 'string' && order.deliveredAt.length > 0,
    },
  };
}

/** Every 2 s, up to ~40 s — the window 04's and 08's receipts tolerate. */
export const RECEIPT_POLL_MS = 2_000;
export const RECEIPT_POLL_WINDOW_MS = 40_000;

export interface PollOptions {
  fetchImpl?: ReceiptFetch;
  intervalMs?: number;
  windowMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  /** Stop early (the page unmounted, or ?s= changed). The result is then discarded. */
  isCancelled?: () => boolean;
}

/**
 * Load the receipt for a session id, polling through the webhook race. Resolves to a FINAL
 * state: `pending` turns into `unverified` with its reason once the window closes.
 */
export async function loadNumbersReceipt(
  sessionId: string | null | undefined,
  options: PollOptions = {},
): Promise<NumbersReceiptState> {
  const id = sessionId?.trim();
  if (!id) return unverified('missing');

  const {
    fetchImpl,
    intervalMs = RECEIPT_POLL_MS,
    windowMs = RECEIPT_POLL_WINDOW_MS,
    now = () => Date.now(),
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    isCancelled = () => false,
  } = options;
  const deadline = now() + windowMs;

  for (;;) {
    const attempt = await lookupNumbersReceipt(id, fetchImpl);
    if (attempt.kind !== 'pending') return attempt;
    if (isCancelled() || now() + intervalMs > deadline) return unverified(attempt.reason);
    await sleep(intervalMs);
    if (isCancelled()) return unverified(attempt.reason);
  }
}

/** Her name, or Evelyn's own fallback. "Friend" is the checkout placeholder, not a name. */
export function receiptFirstName(firstName: string | null | undefined): string {
  return displayName(firstName, ['Friend']) || 'dear';
}
