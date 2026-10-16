// The /fb-tarot retargeting offer page's buy action (pages/TarotRetargetOffer.tsx):
// tracking, the /api/checkout body and the Stripe / Payments.AI hand-off
// (lib/v1Checkout.ts). Used ONLY by the offer page.

import { currentFunnel, funnelPath, getPostHogFunnel, skipEmail } from './funnel'
import { track, getDistinctId } from './posthog'
import { trackInitiateCheckout, getTrackdeskClickId } from './facebook'
import { trackGAdsCheckout, getGclid } from './gtm'
import { tarotEventProps } from './tarotAttribution'
import { submitV1Checkout } from './v1Checkout'
import type { TarotDeck, TarotHook } from '../content/tarotReads'
import { RETARGET_FUNNEL, RETARGET_OFFER_MARKER, retargetLanderPath } from '@shared/retargetCheckout'

export interface RetargetBuyOptions {
  firstName: string
  hook: TarotHook
  bucket: 'love' | 'money'
  deck: TarotDeck
  /** Whole dollars, from retargetOfferPricing().offerDollars. Tracking only: the SERVER
   *  prices the order from the offer-page marker, never from a client number. */
  price: number
  /** The page's own event props (deck/facing/hook/angle/version/bucket/mode). */
  eventProps: Record<string, unknown>
  /** Extra props for retarget_offer_click only (the CTA position). */
  clickProps?: Record<string, unknown>
  namePrefilled: boolean
}

/**
 * Track the click, POST /api/checkout and go to Stripe. Resolves without navigating only
 * when the server returned nothing to follow (the caller then lets her try again).
 */
export async function submitRetargetCheckout(o: RetargetBuyOptions): Promise<void> {
  const { firstName, hook, bucket, deck, price } = o
  const tarot = getPostHogFunnel() === 'tarot' ? tarotEventProps() : undefined
  track('retarget_offer_click', {
    ...o.eventProps,
    ...(o.clickProps ?? {}),
    price_cents: price * 100,
    name_prefilled: o.namePrefilled,
  })
  trackInitiateCheckout(price, 'USD')
  trackGAdsCheckout(price)
  track('checkout_initiated', {
    funnel: getPostHogFunnel() ?? 'tarot',
    step: 'sales',
    product: 'energy_clearing_ritual',
    price_cents: price * 100,
    bump_accepted: false,
    value_cents: price * 100,
    sign: tarot?.deck ?? deck,
    ...(tarot ?? {}),
    email_gate: skipEmail() ? 'off' : 'on',
    src: 'retarget',
    mode: 'retarget',
  })

  const funnel = currentFunnel() ?? RETARGET_FUNNEL
  // NO email, even when the browser remembers one: a returning lead's price is
  // locked on her conversation row and a price test can lock a number this page
  // cannot see. The server charges the offer price from the same table this page
  // prints from (shared/retargetCheckout.ts). Stripe collects the email.
  const checkoutBody: Record<string, unknown> = {
    firstName,
    bucket,
    type: 'main',
    trackdeskClickId: getTrackdeskClickId(),
    gclid: getGclid(),
    funnel,
    tarotHook: hook,
    tarotDeck: deck,
    src: 'retarget',
    // The offer-page marker: validated server-side (exactly 'offer'), written to Stripe
    // as metadata.rtfmt, and what makes the server charge the returning-reader price
    // (never a client price). Only this page sends it.
    retargetPage: RETARGET_OFFER_MARKER,
    // Stripe's cancel URL comes back to THIS page (`&cancelled=1`), not to a chat she
    // never had.
    returnTo: 'lander',
    posthogDistinctId: getDistinctId(),
  }
  await submitV1Checkout(checkoutBody, {
    firstName,
    funnel,
    backUrl: retargetLanderPath(funnel, hook, { cancelled: true }) ?? funnelPath('/b'),
    checkoutPath: funnelPath('/checkout'),
  })
}
