// The backend deck's offers, keyed by the URL prefix each one lives at.
//
// Every offer in the deck (02 Twin Flame, 03 Judgement Day, and whatever
// follows) mounts the SAME shared upsell components at its own prefix and
// differs only in the copy object it resolves to. So the resolution is a table
// lookup, not a chain of `if (isXOffer())` branches — adding an offer means
// adding one row here plus one file under ./upsellCopy/.
//
// A path outside every registered prefix gets V1's conversation, which is what
// the six live funnels run.
//
// ⚠ The prefixes themselves live in lib/funnel.ts, not here, so that
// funnelPath() can route /welcome1 → /welcome2 → /success inside an offer
// without importing any copy. Keep it that way — the import must not go both
// directions.

import { backendOfferPrefix, TWIN_FLAME_PREFIX } from "@/lib/funnel";
import type { Upsell1Copy, Upsell2Copy } from "./upsellCopy/types";
import { V1_UPSELL1, V1_UPSELL2 } from "./upsellCopy/v1";
import { TWIN_FLAME_UPSELL1, TWIN_FLAME_UPSELL2 } from "./upsellCopy/twinFlame";
import type { BackendOfferKey } from "@shared/backendOffers";
import { JUDGEMENT_UPSELL1, JUDGEMENT_UPSELL2 } from "./upsellCopy/judgement";
import { PIXIU_UPSELL1, PIXIU_UPSELL2 } from "./upsellCopy/pixiu";

interface BackendOfferCopy {
  upsell1: Upsell1Copy;
  upsell2: Upsell2Copy;
}

const OFFERS: Record<string, BackendOfferCopy> = {
  [TWIN_FLAME_PREFIX]: {
    upsell1: TWIN_FLAME_UPSELL1,
    upsell2: TWIN_FLAME_UPSELL2,
  },
};

function offerFor(pathname?: string): BackendOfferCopy | undefined {
  const prefix = backendOfferPrefix(pathname);
  return prefix ? OFFERS[prefix] : undefined;
}

// Resolved from the URL, like every other per-funnel behaviour in the shared V1
// components.
export function upsell1Copy(pathname?: string): Upsell1Copy {
  return offerFor(pathname)?.upsell1 ?? V1_UPSELL1;
}

export function upsell2Copy(pathname?: string): Upsell2Copy {
  return offerFor(pathname)?.upsell2 ?? V1_UPSELL2;
}

/**
 * The pitch registry keyed by OFFER, for the shared /offers/upsell/ pages, which
 * resolve the offer from the booking session (not the URL). The pathname-based
 * upsell1Copy/upsell2Copy above stay for 02's own prefix-mounted pages.
 */
export const BACKEND_UPSELL_PITCH: Record<BackendOfferKey, { upsell1: Upsell1Copy; upsell2: Upsell2Copy }> = {
  'twin-flame': { upsell1: TWIN_FLAME_UPSELL1, upsell2: TWIN_FLAME_UPSELL2 },
  'judgement-day': { upsell1: JUDGEMENT_UPSELL1, upsell2: JUDGEMENT_UPSELL2 },
  'wishing-bracelet': { upsell1: PIXIU_UPSELL1, upsell2: PIXIU_UPSELL2 },
};

export function upsell1CopyForOffer(offer: BackendOfferKey): Upsell1Copy {
  return BACKEND_UPSELL_PITCH[offer].upsell1;
}

export function upsell2CopyForOffer(offer: BackendOfferKey): Upsell2Copy {
  return BACKEND_UPSELL_PITCH[offer].upsell2;
}

export { displayName } from "./upsellCopy/types";
export type {
  Upsell1Chain,
  Upsell2Chain,
  Upsell1Copy,
  Upsell2Copy,
} from "./upsellCopy/types";
