/**
 * The live Stripe-vs-Payments.AI split — browser side.
 *
 * When /api/checkout puts a buyer on Payments.AI it answers with a signed ORDER
 * instead of a Stripe URL (server/lib/paiLive.ts). Just as a Stripe buyer is sent to
 * Stripe's hosted checkout, a Payments.AI buyer is sent to OUR checkout page,
 * `<funnel>/checkout` (pages/PaiCheckoutPage.tsx). The order rides along in this
 * tab's sessionStorage — never in the URL, which would put her email in the address
 * bar, the browser history and the analytics page views.
 */

export interface PaiCheckoutOrder {
  orderToken: string;
  totalCents: number;
  mainCents: number;
  bumpCents: number;
  productName: string;
  productDescription?: string;
  /** The bump's line, exactly as the Stripe checkout shows it. */
  bumpName?: string;
  bumpDescription?: string;
  email?: string;
  firstName?: string;
  /** FunnelParam of this chat ('v1-fb', 'v1-tarot', …) — for the SMS question. */
  funnel?: string;
  /** "Back" goes here — the chat she came from, as Stripe's cancel_url does. */
  backUrl: string;
  /**
   * The card form could not load in this browser. Re-asks /api/checkout for Stripe
   * (`forceStripe`) with the same body, so she can still pay.
   */
  stripeFallbackBody: Record<string, unknown>;
}

const ORDER_KEY = 'pai-live-order';

/**
 * Store the order and go to the checkout page. Returns false (and goes nowhere)
 * when this browser will not store it — the caller then sends her to Stripe.
 */
export function goToPaiCheckout(order: PaiCheckoutOrder, checkoutPath: string): boolean {
  try {
    sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {
    return false;
  }
  window.location.href = checkoutPath;
  return true;
}

export function readPaiOrder(): PaiCheckoutOrder | null {
  try {
    const raw = sessionStorage.getItem(ORDER_KEY);
    return raw ? (JSON.parse(raw) as PaiCheckoutOrder) : null;
  } catch {
    return null;
  }
}

export function clearPaiOrder(): void {
  try {
    sessionStorage.removeItem(ORDER_KEY);
  } catch {
    /* ignore */
  }
}

/** What survives the 3DS round trip (her bank → `<funnel>/checkout?paiReturn=1`). */
export interface PaiPending3ds {
  transactionId: string;
  phone: string;
  smsConsent?: string;
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
