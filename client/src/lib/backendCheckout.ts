import type { BackendOfferKey, BookingTreatment } from '@shared/backendOffers';
import { getBackendVisitorId } from './backendVisitor';

// The one way a backend booking screen reaches Stripe.
//
// Workflow: improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md — Phase A, assets S4/S5.
// Server side: server/routes/backendOffers.ts.
//
// ── ⛔ THE DECK SHIPS PREVIEW-ONLY BY DEFAULT ────────────────────────────────────
// `BACKEND_CHECKOUT_LIVE` is false UNLESS the build sees `VITE_BACKEND_CHECKOUT_LIVE=true`.
// Absent/anything-else ⇒ every button below still LOGS and stops (A2's preview). So it is
// OFF on any deployment that does not explicitly set the var — production stays dark until
// someone sets it there. Set it on DEV to walk the real (test-mode) flow.
//
// ⚠ It is a BUILD-time Vite var: set it in Railway, then REDEPLOY so the client is rebuilt
// with it. Setting it without a rebuild changes nothing.
//
// ⚠ Before flipping it, in this order:
//   1. run migrations/2026-08-10-be-orders.sql against the database (⛔ never db:push);
//   2. finish C0 — the AWeber list `theseerwithin_be_customer` and its four custom
//      fields exist by hand, and AWEBER_BE_CUSTOMER_LIST_ID is in .env. Without it the
//      order is banked and NO thank-you email sends, because the tag is the send;
//   3. refresh the AWeber access tokens (both were expired 2026-08-10);
//   4. point the Stripe `checkout.session.completed` webhook at /api/webhooks/stripe
//      for whichever account is live, and take one real test order;
//   5. update the state column in "Every screen we have built" — a row still saying
//      *preview* after Stripe lands is worse than no row.
//
// ⚠ 03 additionally must not go live before its thank-you/Entry form (A6) exists: it is
// an ACT offer, nothing on the booking screens asks for the Entry, and a paid order we
// cannot fulfil is the dispute code we lose.
export const BACKEND_CHECKOUT_LIVE =
  import.meta.env.VITE_BACKEND_CHECKOUT_LIVE === 'true';

export interface BackendCheckoutRequest {
  offer: BackendOfferKey;
  treatment: BookingTreatment;
  bump: boolean;
  /** Pay-what-you-want offers only. Ignored, server-side, on a fixed-price offer. */
  amountCents?: number | null;
  /** From the letter's ?fn=. Carried into Stripe metadata so every screen after the
   *  money can greet her by name. */
  firstName?: string | null;
}

export type BackendCheckoutResult =
  | { status: 'preview' }
  | { status: 'redirecting' }
  | { status: 'error'; message: string };

const GENERIC_ERROR = 'Something went wrong starting checkout. Please try again.';

/**
 * Send her to Stripe.
 *
 * ⛔ Posts NO price. The server reads the offer's price from the catalog; the only
 * number this can influence is a pay-what-you-want amount, which the server
 * floor-checks. That is what stops a $35 reading being bought for a cent.
 */
export async function beginBackendCheckout(
  req: BackendCheckoutRequest,
): Promise<BackendCheckoutResult> {
  if (!BACKEND_CHECKOUT_LIVE) {
    // The preview behaviour the screens have always had, kept identical so a reviewer
    // walking the funnel sees what they saw before.
    console.log('[preview] would checkout', {
      offer: req.offer,
      treatment: req.treatment,
      bump: req.bump,
      amountCents: req.amountCents ?? null,
      firstName: req.firstName ?? null,
    });
    return { status: 'preview' };
  }

  try {
    const response = await fetch('/api/backend/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offer: req.offer,
        treatment: req.treatment,
        bump: req.bump,
        amountCents: req.amountCents ?? undefined,
        firstName: req.firstName ?? undefined,
        // The booking-treatment A/B subject, so the purchase attributes back to the
        // arm she saw. Harmless when the test is off (no exposure → not counted).
        expSubject: getBackendVisitorId(),
      }),
    });

    const data = await response.json().catch(() => ({}) as { url?: string; error?: string });

    if (!response.ok || !data?.url) {
      // The server's own message when it has one — a refused amount needs to say what
      // to change, not just fail. Anything else falls back to the generic line.
      return { status: 'error', message: data?.error || GENERIC_ERROR };
    }

    window.location.href = data.url;
    return { status: 'redirecting' };
  } catch {
    // Offline, or the request never landed. Never leave the button silently dead.
    return { status: 'error', message: GENERIC_ERROR };
  }
}
