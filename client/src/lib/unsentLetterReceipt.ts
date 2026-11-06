// Offer 11 — The Unsent Letter: the receipt page's order lookup.
//
// Copy spec: improve-v1/v1-one-time-BEs/docs/11/booking-page/11-T1-thank-you-page.md
// Tests: unsentLetterReceipt.test.ts
//
// 04's receipt pattern (lib/teaReadingReceipt.ts), which is 09's with 08's poll.
//
// ⛔ THE RULE: never print receipt lines or the bump's P.S. for an order that wasn't verified as
// THIS offer's, and paid. So the page has exactly two final shapes:
//   verified   — the server returned a paid unsent-letter order for this ?s=;
//   unverified — anything else: no ?s=, 400/404 (not this offer's order), a refunded or cancelled
//                row, a body that isn't JSON, or an order for another offer — and, once the poll
//                window closes, a 402 (not paid yet) or a 5xx/offline that never cleared.
//
// The poll exists for one race: Stripe's success_url (via the upsells) can land her here before
// the paid webhook has written the row.

import { displayName } from './upsellCopy/types';

export const UNSENT_LETTER_OFFER = 'unsent-letter' as const;

// 11-T3's subject and 11-T4's, word for word (the test reads the docs). With no name the
// title reads "dear — your letter is written out".
export const EMAIL_SUBJECTS = {
  confirmed: 'Your Unsent Letter reading is confirmed',
  delivered: (name: string): string => `${name} — your letter is written out`,
} as const;

// The bump buyer's P.S. (11-T1), word for word. ⭐ Closing the Door is the last page of her PDF.
export const RECEIPT_BUMP_PS =
  "P.S. You added Closing the Door. It's the last page of your reading. Don't do it until you've read the letter.";

/** The P.S. for this order: bump buyers only, otherwise nothing. */
export function receiptPostscript(order: Pick<VerifiedLetterOrder, 'bumpPurchased'>): string | null {
  return order.bumpPurchased === true ? RECEIPT_BUMP_PS : null;
}

export interface VerifiedLetterOrder {
  firstName: string | null;
  /** She took Closing the Door. Only a literal `true` from the server counts. */
  bumpPurchased: boolean;
  /** The reading has already gone out (`deliveredAt` set). */
  delivered: boolean;
}

export type UnverifiedReason = 'missing' | 'not-found' | 'unpaid' | 'error';

export type LetterReceiptState =
  | { kind: 'verified'; order: VerifiedLetterOrder }
  | { kind: 'unverified'; reason: UnverifiedReason };

/** One lookup's answer: final, or worth asking again until the window closes. */
export type LetterReceiptAttempt = LetterReceiptState | { kind: 'pending'; reason: 'unpaid' | 'error' };

export type ReceiptFetch = (
  url: string,
) => Promise<{ status: number; ok: boolean; json: () => Promise<unknown> }>;

export function orderLookupUrl(sessionId: string): string {
  return `/api/backend/order/${encodeURIComponent(sessionId)}?offer=${UNSENT_LETTER_OFFER}`;
}

const unverified = (reason: UnverifiedReason): LetterReceiptState => ({ kind: 'unverified', reason });

/** The `?s=` the upsell chain hands over (Stripe's own `?session_id=` accepted as well). */
export function receiptSessionId(search: string): string | null {
  const params = new URLSearchParams(search);
  const id = params.get('s') || params.get('session_id');
  return id && id.trim() ? id.trim() : null;
}

/** ONE lookup. 402 and 5xx/offline are `pending` — the poll asks again. */
export async function lookupLetterReceipt(
  sessionId: string,
  fetchImpl: ReceiptFetch = (url) => fetch(url),
): Promise<LetterReceiptAttempt> {
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
  if (!order || typeof order !== 'object' || order.offer !== UNSENT_LETTER_OFFER) {
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
export async function loadLetterReceipt(
  sessionId: string | null | undefined,
  options: PollOptions = {},
): Promise<LetterReceiptState> {
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
    const attempt = await lookupLetterReceipt(id, fetchImpl);
    if (attempt.kind !== 'pending') return attempt;
    if (isCancelled() || now() + intervalMs > deadline) return unverified(attempt.reason);
    await sleep(intervalMs);
    if (isCancelled()) return unverified(attempt.reason);
  }
}

// ── The gift: 15 free minutes with Evelyn (11-T1, operator 2026-11-02) ────────────────────────
// ⚠ Must match server/lib/unsentLetterTyGift.ts and EvelynLanderPage.tsx (a test holds all three).
export const UNSENT_LETTER_TY_CAMPAIGN = 'be11-ty-evelyn';
const GIFT_UTM = `campaign=${UNSENT_LETTER_TY_CAMPAIGN}&utm_source=be11_ty&utm_medium=thankyou&utm_campaign=evelyn_15`;

export const LETTER_GIFT = {
  writing: 'While I write, come and talk to me. The first 15 minutes are on me.',
  delivered: "Once you've read it, come and talk to me. The first 15 minutes are on me.",
  stubLabel: 'Free',
  stubAmount: '15 min',
  eyebrow: 'Gift voucher',
  title: '15 minutes of free chat',
  withName: 'with Evelyn Cross',
  button: 'Talk to Evelyn',
} as const;

/** The line over the voucher. It must not say she's still writing a reading that's gone out. */
export function letterGiftLine(order: Pick<VerifiedLetterOrder, 'delivered'>): string {
  return order.delivered ? LETTER_GIFT.delivered : LETTER_GIFT.writing;
}

export const GIFT_HANDOFF_URL = '/api/backend/unsent-letter/gift-handoff';

/**
 * Where the voucher's button goes, from the server's answer: a login link for a buyer with a V2
 * account, a prefilled signup otherwise. Null for anything else, and the page then shows no
 * voucher: without her email the gift can't find her order, so it would be a promise that fails.
 */
export function letterGiftHref(handoff: unknown): string | null {
  const h = handoff as { mode?: unknown; token?: unknown; email?: unknown; firstName?: unknown } | null;
  if (h?.mode === 'login' && typeof h.token === 'string' && h.token) {
    return `/evelyn?token=${encodeURIComponent(h.token)}&${GIFT_UTM}`;
  }
  if (h?.mode === 'signup' && typeof h.email === 'string' && h.email) {
    const q = new URLSearchParams({ email: h.email });
    if (typeof h.firstName === 'string' && h.firstName) q.set('name', h.firstName);
    return `/evelyn?${GIFT_UTM}&${q.toString()}`;
  }
  return null;
}

export type GiftFetch = (
  url: string,
  init: RequestInit,
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

/** The voucher's link for this order, or null. Never throws: a failure is just no voucher. */
export async function loadLetterGiftHref(
  sessionId: string,
  fetchImpl: GiftFetch = (url, init) => fetch(url, init),
): Promise<string | null> {
  try {
    const response = await fetchImpl(GIFT_HANDOFF_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    return response.ok ? letterGiftHref(await response.json()) : null;
  } catch {
    return null;
  }
}

/** Her name, or Evelyn's own fallback. "Friend" is the checkout placeholder, not a name. */
export function receiptFirstName(firstName: string | null | undefined): string {
  return displayName(firstName, ['Friend']) || 'dear';
}
