// The V1 front-end checkout hand-off for the /fb-tarot retargeting offer page: POST
// /api/checkout, then send her to whichever processor the server picked. A COPY of the
// hand-off inside useConversation.handlePurchase (the live chat keeps its own inline
// version, untouched) — same request, same Stripe-vs-Payments.AI handling, same
// fallback. Duplication accepted on purpose so the live chat file never changes for
// this page. Keep the two in step if the chat's hand-off changes.
//
// Tracking (pixel / GAds / PostHog) stays with the caller; this helper only moves her
// to payment.

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
  // Production has no Payments.AI checkout: the server always answers `{ url }`
  // (Stripe). The development copy of this file also handles a Payments.AI order.
  if (data?.url) window.location.href = data.url
}
