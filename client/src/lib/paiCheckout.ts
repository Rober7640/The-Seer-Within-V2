/**
 * The live Stripe-vs-Payments.AI split — browser side.
 *
 * When /api/checkout puts a buyer on Payments.AI it answers with a signed ORDER
 * instead of a Stripe URL (server/lib/paiLive.ts). The chat hook hands that order
 * here, and <PaiCheckoutHost/> (mounted on the chat page) opens the card form for it.
 * A tiny store rather than more chat state, so the Stripe path through
 * useConversation stays exactly as it was: it only ever sees `{ url }`.
 */

export interface PaiCheckoutRequest {
  orderToken: string;
  totalCents: number;
  mainCents: number;
  bumpCents: number;
  productName: string;
  /** The bump's line name, exactly as the Stripe checkout shows it. */
  bumpName?: string;
  email?: string;
  firstName?: string;
  /** FunnelParam of this chat ('v1-fb', 'v1-tarot', …) — for the SMS question. */
  funnel?: string;
  /** She closed the form without paying: put the buy button back. */
  onCancel: () => void;
  /**
   * The card form could not load in this browser. Re-asks /api/checkout for Stripe
   * (`forceStripe`) with the same body, so she can still pay.
   */
  stripeFallbackBody: Record<string, unknown>;
}

type Listener = (req: PaiCheckoutRequest | null) => void;

let current: PaiCheckoutRequest | null = null;
const listeners = new Set<Listener>();

export function openPaiCheckout(req: PaiCheckoutRequest): void {
  current = req;
  listeners.forEach((l) => l(current));
}

export function closePaiCheckout(): void {
  current = null;
  listeners.forEach((l) => l(null));
}

export function subscribePaiCheckout(l: Listener): () => void {
  listeners.add(l);
  l(current);
  return () => {
    listeners.delete(l);
  };
}

/**
 * What survives the 3DS round trip (Payments.AI sends her to her bank and back to
 * <funnel>/chat?paiReturn=1). Tab-scoped, like the rest of the funnel's state.
 */
export interface PaiPending3ds {
  orderToken: string;
  transactionId: string;
  phone: string;
  smsConsent?: string;
  totalCents: number;
  email?: string;
}

const PENDING_KEY = 'pai-live-3ds';

export function savePending3ds(p: PaiPending3ds): boolean {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

export function readPending3ds(): PaiPending3ds | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PaiPending3ds) : null;
  } catch {
    return null;
  }
}

export function clearPending3ds(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}
