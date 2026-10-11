// The client half of 04's PRICE SPLIT TEST (The Turn): what a booking screen prints, and what
// it does when checkout says the price changed.
//
// Server side: GET /api/backend/offers/tea-reading/price and the 409 in POST /api/backend/checkout
// (server/routes/backendOffers.ts). The arm is decided by resolveBe04Price (server/lib/experiments.ts):
// arm A $35 (control) or arm B $45, sticky per visitor — everyone gets A until the test is started.
// Tests: teaReadingBooking.test.ts.
//
// ⛔ Nothing here decides a price. The screen PRINTS the arm's price the server answered and posts
// back the ARM it printed (`quotedArm`); checkout re-resolves her arm and charges that. So the worst
// a bad value here can do is print the wrong number — and the server then answers 409 with the
// right one, which this file turns into "the price is now $X, press again".
//
// Pure on purpose (no window, no posthog, no storage): backendCheckout.ts and the screens both
// import it, and the tests run it under node. The screens pass the visitor id in.

import { priceLabel, type BackendOfferKey } from '@shared/backendOffers';

/** Her arm's price as a screen prints it. `label` is always priceLabel(cents) — the page's own format. */
export interface PriceQuote {
  /** The split-test arm the server put her in ('A' $35 control, 'B' $45). Posted back as `quotedArm`. */
  arm: string;
  cents: number;
  label: string;
  /** True when the server answered an `?arm=` PREVIEW (display only, never charged). */
  preview: boolean;
}

export type PriceQuoteResult = { kind: 'ok'; quote: PriceQuote } | { kind: 'error' };

/** An arm key as the experiment names it: short, plain. Anything else is not a quote. */
const ARM = /^[A-Za-z0-9_-]{1,16}$/;

/**
 * The price endpoint for this offer and this visitor. `subject` is her visitor id
 * (getBackendVisitorId) — the server buckets her on it, and checkout re-resolves the same id.
 * An `?arm=A` / `?arm=B` on the PAGE's URL is passed through, so a reviewer can see either
 * price while the offer is dark — the server honours it only while the offer is not open for
 * money, and checkout never reads it. Any other value is dropped rather than forwarded.
 */
export function priceQuoteUrl(offer: BackendOfferKey, subject: string, search?: string): string {
  const params = new URLSearchParams({ subject });
  const arm = (new URLSearchParams(search ?? '').get('arm') ?? '').trim().toUpperCase();
  if (arm === 'A' || arm === 'B') params.set('arm', arm);
  return `/api/backend/offers/${offer}/price?${params.toString()}`;
}

function armOf(value: unknown): string | null {
  return typeof value === 'string' && ARM.test(value) ? value : null;
}

function positiveCents(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

/**
 * The price endpoint's body as a quote, or null if it is not one for THIS offer.
 * ⚠ The label is re-printed here from the cents, never taken from the body, so the price line,
 * the total and the bump all share one format.
 */
export function parsePriceQuote(body: unknown, offer: BackendOfferKey): PriceQuote | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (b.offer !== offer) return null;
  const arm = armOf(b.arm);
  const cents = positiveCents(b.cents);
  if (arm === null || cents === null) return null;
  return { arm, cents, label: priceLabel(cents), preview: b.preview === true };
}

export type QuoteFetch = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

/** Her arm's price. Any failure — offline, a 404, a body that isn't a quote — is `error`, never a guess. */
export async function fetchPriceQuote(
  offer: BackendOfferKey,
  subject: string,
  search?: string,
  fetchImpl: QuoteFetch = (url) => fetch(url, { cache: 'no-store' }),
): Promise<PriceQuoteResult> {
  try {
    const response = await fetchImpl(priceQuoteUrl(offer, subject, search));
    if (!response.ok) return { kind: 'error' };
    const quote = parsePriceQuote(await response.json(), offer);
    return quote ? { kind: 'ok', quote } : { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}

/**
 * Checkout's "the price changed" answer → the server's price, or null if this response is
 * anything else. The server sends `409 { code: 'price_changed', current: { arm, cents, label } }`
 * when the arm her page printed is not the arm it would charge (the test started, paused or was
 * re-weighted while the page was open, or a preview): the screen must show the new price and ask
 * her to press again, re-sending the NEW arm. ⛔ Never charge a number she was not shown.
 */
export function parsePriceChanged(status: number, body: unknown): PriceQuote | null {
  if (status !== 409 || !body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (b.code !== 'price_changed' || !b.current || typeof b.current !== 'object') return null;
  const current = b.current as Record<string, unknown>;
  const arm = armOf(current.arm);
  const cents = positiveCents(current.cents);
  if (arm === null || cents === null) return null;
  return { arm, cents, label: priceLabel(cents), preview: false };
}
