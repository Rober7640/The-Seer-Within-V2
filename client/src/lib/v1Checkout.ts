// The V1 front-end checkout hand-off for the /fb-tarot retargeting offer page: POST
// /api/checkout, then send her to whichever processor the server picked. A COPY of the
// hand-off inside useConversation.handlePurchase (the live chat keeps its own inline
// version, untouched) — same request, same Stripe-vs-Payments.AI handling, same
// fallback. Duplication accepted on purpose so the live chat file never changes for
// this page. Keep the two in step if the chat's hand-off changes.
//
// Tracking (pixel / GAds / PostHog) stays with the caller; this helper only moves her
// to payment.

import { goToPaiCheckout } from './paiCheckout'

export interface V1CheckoutOptions {
  /** Shown pre-filled on our Payments.AI checkout page. Absent ⇒ she types it there. */
  email?: string
  firstName?: string
  /** FunnelParam ('v1-tarot', …) — for the SMS question on the Payments.AI page. */
  funnel?: string
  /** Where "Back" on the Payments.AI page goes — mirrors Stripe's cancel_url. */
  backUrl: string
  /** `<funnel>/checkout`, our Payments.AI checkout page. */
  checkoutPath: string
}

/**
 * Ask the server for a checkout and go there. Resolves without navigating only when
 * the server returned nothing usable (the caller has already logged/tracked).
 * Throws on a network error, exactly as the inline version did inside its try.
 */
export async function submitV1Checkout(
  checkoutBody: Record<string, unknown>,
  opts: V1CheckoutOptions,
): Promise<void> {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checkoutBody),
  })
  const data = await response.json()
  // The live gateway split: a Payments.AI buyer gets a signed order instead of a
  // Stripe URL and is sent to OUR checkout page, <funnel>/checkout
  // (pages/PaiCheckoutPage), as a Stripe buyer is sent to Stripe's. Every Stripe
  // buyer gets `{ url }` exactly as before.
  if (data?.gateway === 'paymentsai' && typeof data.orderToken === 'string') {
    const went = goToPaiCheckout(
      {
        orderToken: data.orderToken,
        totalCents: data.totalCents,
        mainCents: data.mainCents,
        bumpCents: data.bumpCents ?? 0,
        productName: data.productName ?? 'Energy Clearing Ritual',
        productDescription: data.productDescription,
        bumpName: data.bumpName,
        bumpDescription: data.bumpDescription,
        email: opts.email,
        firstName: opts.firstName,
        funnel: opts.funnel,
        backUrl: opts.backUrl,
        stripeFallbackBody: checkoutBody,
      },
      opts.checkoutPath,
    )
    if (went) return
    // This browser will not hold the order (storage blocked) — take her to Stripe
    // instead, so she can still pay.
    const retry = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...checkoutBody, forceStripe: true }),
    })
    const again = await retry.json()
    if (again?.url) window.location.href = again.url
    return
  }
  if (data?.url) window.location.href = data.url
}
