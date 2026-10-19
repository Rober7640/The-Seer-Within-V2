// Is this paid V1 order a /fb-tarot RETARGETING order? (2026-10-16)
//
// The retargeting offer page (`/fb-tarot/b?src=retarget`, TarotRetargetOffer.tsx) checks
// out with NO email, so nothing about the order is written to `conversations` at
// checkout. Its row is created (or an older lead row is reused) by the
// /api/upsell/user-data Stripe fallback, which writes only the Stripe ids and the amount
// — no `src`, and no price variant. The ONLY durable record that she came through the
// retargeting page is the Stripe Checkout Session's metadata (`src: 'retarget'`, set by
// /api/checkout). So the post-purchase path asks Stripe, once per session, and caches
// the answer.
//
// Used by exactly three places, each of which keeps its old behaviour for every order
// this does not recognise:
//   - /api/upsell2/user-data   → fixed U2 reveal copy instead of the AI one
//   - /api/luna-ty/handoff     → Evelyn (not Luna) on the thank-you page
//   - evelynThankyouGift.ts    → the 15-minute gift + the reading brief
//
// THE GATE: a paid Checkout Session whose metadata has `src === 'retarget'` AND
// `funnel === 'v1-tarot'`. Nothing else — not the URL, not the client.
//
// No schema change and no new column: deliberately, because the price-variant column
// (the obvious place to stamp '30_tarot_rt') is also what getVariantForEmail reads to
// price her NEXT checkout.

import type Stripe from 'stripe';
import { funnelParamFromPriceVariant } from '@shared/funnelConfig';
import { RETARGET_FUNNEL } from '@shared/retargetCheckout';
import logger from './logger';

export interface RetargetOrderInfo {
  /** The first name she typed on the offer page (clipped), or null. */
  firstName: string | null;
  /** The topic the offer page sold on — from the hook. Null if missing/unknown. */
  bucket: 'love' | 'money' | null;
}

type SessionLike = {
  payment_status?: string | null;
  metadata?: Record<string, string> | null;
};

const MAX_NAME_CHARS = 60;

/**
 * PURE. The gate itself, on a Checkout Session already in hand: paid, `src: 'retarget'`,
 * on the tarot funnel. Returns what the post-purchase path may use about her (first name
 * + love/money), or null for every other order.
 */
export function retargetOrderFromSession(session: SessionLike | null | undefined): RetargetOrderInfo | null {
  if (!session || session.payment_status !== 'paid') return null;
  const meta = session.metadata ?? {};
  if (meta.src !== 'retarget') return null;
  if (meta.funnel !== RETARGET_FUNNEL) return null;
  const rawName = (meta.firstName ?? '').replace(/\s+/g, ' ').trim();
  const bucket = meta.bucket === 'love' || meta.bucket === 'money' ? meta.bucket : null;
  return {
    firstName: rawName ? rawName.slice(0, MAX_NAME_CHARS) : null,
    bucket,
  };
}

/**
 * PURE. Could the order on this conversation row be a retarget order at all? A
 * retarget buyer's row carries either NO price variant (a row the Stripe fallback just
 * created) or the variant of her earlier /fb-tarot lead (the retargeting audience is
 * /fb-tarot non-buyers). Every other funnel's row (/fb, /fb2, /gdn, /fb-palm, /fb-read,
 * root) is answered "no" here without any Stripe call, so those buyers' paths are not
 * touched at all.
 */
export function couldBeRetargetOrder(priceVariant: string | null | undefined): boolean {
  if (!priceVariant) return true;
  return funnelParamFromPriceVariant(priceVariant) === RETARGET_FUNNEL;
}

// ── Per-session cache ───────────────────────────────────────────────────────────
// A paid session's metadata never changes, so one answer per session id is enough.
// Bounded so it cannot grow without limit; Map keeps insertion order, so the oldest
// entry is evicted first.
const CACHE_MAX = 5000;
const cache = new Map<string, RetargetOrderInfo | null>();

function remember(sessionId: string, info: RetargetOrderInfo | null): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(sessionId, info);
}

/** Test hook. */
export function _clearRetargetOrderCache(): void {
  cache.clear();
}

/**
 * Warm the cache from a session some other code path has ALREADY retrieved (the U1
 * page's own Stripe reads), so the U2 page and the thank-you page usually need no
 * Stripe call of their own. Never throws. Only a PAID session is remembered (an unpaid
 * one could still become paid).
 */
export function rememberRetargetSession(session: (SessionLike & { id?: string }) | null | undefined): void {
  try {
    if (!session?.id || session.payment_status !== 'paid') return;
    remember(session.id, retargetOrderFromSession(session));
  } catch {
    /* a cache write must never affect the caller */
  }
}

/**
 * Is this Stripe Checkout Session a paid retarget order? Cached per session id. Never
 * throws: a Stripe error, a non-Stripe order id (Payments.AI `txn_…`), or no client
 * answers null — i.e. "treat as a normal order", which is exactly today's behaviour.
 * Errors are NOT cached, so a transient failure is retried next time.
 */
export async function lookupRetargetOrder(
  sessionId: string | null | undefined,
  stripe: Pick<Stripe, 'checkout'> | null | undefined,
): Promise<RetargetOrderInfo | null> {
  if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) return null;
  if (cache.has(sessionId)) return cache.get(sessionId) ?? null;
  if (!stripe) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const info = retargetOrderFromSession(session as unknown as SessionLike);
    if (session.payment_status === 'paid') remember(sessionId, info);
    return info;
  } catch (err: any) {
    logger.warn('Retarget order lookup failed (treated as a normal order)', {
      sessionId,
      err: err?.message,
    });
    return null;
  }
}
