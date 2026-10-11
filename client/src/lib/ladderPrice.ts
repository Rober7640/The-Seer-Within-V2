// The client half of a PRICE LADDER (04 The Turn): what a booking screen prints, and what it
// does when checkout says the rung moved on.
//
// Server side: GET /api/backend/offers/:offer/price and the 409 in POST /api/backend/checkout
// (server/routes/backendOffers.ts). The rules: shared/backendOffers.ts, resolveLadderCharge().
// Tests: teaReadingBooking.test.ts.
//
// ⛔ Nothing here decides a price. The screen PRINTS the rung the server answered and posts back
// the DAY it printed (`quotedDay`); the server's clock decides the charge. So the worst a bad
// value here can do is print the wrong number — and the server then answers 409 with the right
// one, which this file turns into "the price is now $X, press again".
//
// Pure on purpose (no window, no posthog): backendCheckout.ts and the screens both import it,
// and the tests run it under node.

import { priceLabel, type BackendOfferKey } from '@shared/backendOffers';

/** One rung as a screen prints it. `label` is always priceLabel(cents) — the page's own format. */
export interface LadderQuote {
  day: number;
  cents: number;
  label: string;
  /** True when the server answered a `?day=` PREVIEW (display only, never charged). */
  preview: boolean;
}

export type LadderQuoteResult = { kind: 'ok'; quote: LadderQuote } | { kind: 'error' };

/**
 * The price endpoint for this offer. A `?day=N` on the PAGE's URL is passed through, so a
 * reviewer can see every rung while the offer is dark — the server honours it only while the
 * offer is not open for money, and checkout never reads it. Anything that is not a small whole
 * number is dropped rather than forwarded.
 */
export function ladderPriceUrl(offer: BackendOfferKey, search?: string): string {
  const base = `/api/backend/offers/${offer}/price`;
  const raw = new URLSearchParams(search ?? '').get('day');
  const day = raw !== null && /^\d{1,2}$/.test(raw.trim()) ? Number(raw.trim()) : 0;
  return day >= 1 ? `${base}?day=${day}` : base;
}

function wholeDay(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null;
}

function positiveCents(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

/**
 * The price endpoint's body as a quote, or null if it is not one for THIS offer.
 * ⚠ The label is re-printed here from the cents, never taken from the body, so the price line,
 * the total and the bump all share one format.
 */
export function parseLadderQuote(body: unknown, offer: BackendOfferKey): LadderQuote | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (b.offer !== offer) return null;
  const day = wholeDay(b.day);
  const cents = positiveCents(b.cents);
  if (day === null || cents === null) return null;
  return { day, cents, label: priceLabel(cents), preview: b.preview === true };
}

export type QuoteFetch = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

/** Today's rung. Any failure — offline, a 404, a body that isn't a quote — is `error`, never a guess. */
export async function fetchLadderQuote(
  offer: BackendOfferKey,
  search?: string,
  fetchImpl: QuoteFetch = (url) => fetch(url, { cache: 'no-store' }),
): Promise<LadderQuoteResult> {
  try {
    const response = await fetchImpl(ladderPriceUrl(offer, search));
    if (!response.ok) return { kind: 'error' };
    const quote = parseLadderQuote(await response.json(), offer);
    return quote ? { kind: 'ok', quote } : { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}

/**
 * Checkout's "the ladder moved on" answer → today's rung, or null if this response is anything
 * else. The server sends `409 { code: 'price_changed', current: { day, cents, label } }` when the
 * day her page showed has expired past the grace window: the screen must show the new price and
 * ask her to press again, re-sending the NEW day. ⛔ Never charge a number she was not shown.
 */
export function parsePriceChanged(status: number, body: unknown): LadderQuote | null {
  if (status !== 409 || !body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (b.code !== 'price_changed' || !b.current || typeof b.current !== 'object') return null;
  const current = b.current as Record<string, unknown>;
  const day = wholeDay(current.day);
  const cents = positiveCents(current.cents);
  if (day === null || cents === null) return null;
  return { day, cents, label: priceLabel(cents), preview: false };
}
