// The optional Upsell 1 downsell, and the U1 charge body, as pure functions so they can be
// tested without React. useUpsellChat.ts calls every one of them.
//
// ⛔ Default OFF. The downsell needs all three: the copy writes DOWNSELL, the server names an own
// U1 product for the offer (`upsell1Product`, from the catalog), and that product has a downsell
// price. V1 and every offer before 12 have none of them, so a decline goes straight to the soft
// decline and the charge body stays `{ checkoutSessionId, email }`, byte for byte.
//
// Tests: upsell1Downsell.test.ts

import type { Upsell1Copy } from './upsellCopy/types';

export interface Upsell1ProductData {
  upsell1Product?: string;
  upsell1DownsellCents?: number | null;
}

export type Upsell1Tier = 'full' | 'downsell';

export function upsell1DownsellOn(
  copy: Pick<Upsell1Copy, 'DOWNSELL'>,
  user: Upsell1ProductData | null | undefined,
): boolean {
  return Boolean(copy.DOWNSELL?.length && user?.upsell1Product && user?.upsell1DownsellCents);
}

/** `{downsellPrice}`. The $30 fallback is never shown: without a price the downsell is off. */
export function formatDownsellPrice(cents: number | null | undefined): string {
  return cents ? `$${Math.round(cents / 100)}` : '$30';
}

/** The PostHog `product` name. V1's literal for every offer without its own U1 product. */
export function upsell1PhProduct(user: Upsell1ProductData | null | undefined): string {
  return user?.upsell1Product ? user.upsell1Product.replace(/^be_/, '') : 'protection_ritual';
}

/**
 * The body for /api/backend/upsell/charge and /fallback-checkout. An offer with its own U1
 * product names it, plus the downsell tier when taken. Otherwise the lean body, which the server
 * reads as the Protection Ritual at full price.
 */
export function upsell1BackendBody(
  sessionId: string,
  email: string,
  user: Upsell1ProductData | null | undefined,
  tier: Upsell1Tier,
): Record<string, string> {
  return {
    checkoutSessionId: sessionId,
    email,
    ...(user?.upsell1Product ? { product: user.upsell1Product } : {}),
    ...(tier === 'downsell' ? { tier: 'downsell' } : {}),
  };
}
