// Shared paywall logic — used by BOTH the server (to shape /api/credits/pricing)
// and the client (preview + live components), so there is a single source of
// truth for variant-B presentation. See docs/posthog-evelyn-purchase-findings.md
// §3.14–3.15.

import type { PricingTier } from "./types";
import { usdCentsToCoins } from "./types";

export type PaywallVariant = "A" | "B";

/**
 * Coins a custom top-up amount buys, INCLUDING any bonus — the single source of
 * truth shared by the server grant (resolveCustomTier) and the client preview
 * (the custom field + checkout popup), so what a buyer is shown always equals
 * what they are granted.
 *
 * - `coins` = the flat-rate base (the honest minimum this amount always buys).
 * - The richest pack priced at or below the amount sets the rate: its
 *   total-coins-per-cent is scaled onto the custom amount (floored), so a custom
 *   amount above a bonus pack inherits that pack's generosity. Never below base.
 * - `bonusCoins` = whatever that scaling adds on top of the base.
 */
export function resolveCustomTierCoins(
  amountCents: number,
  tiers: Array<{ priceUsd: number; totalCoins: number }>,
): { coins: number; bonusCoins: number; totalCoins: number } {
  const baseCoins = usdCentsToCoins(amountCents);
  const anchor = tiers
    .filter((t) => t.priceUsd <= amountCents && t.priceUsd > 0)
    .sort((a, b) => b.priceUsd - a.priceUsd)[0];
  const totalCoins = anchor
    ? Math.max(baseCoins, Math.floor((amountCents * anchor.totalCoins) / anchor.priceUsd))
    : baseCoins;
  return { coins: baseCoins, bonusCoins: Math.max(0, totalCoins - baseCoins), totalCoins };
}

/**
 * Apply the variant-B badge presentation to a persona's real pricing tiers:
 * the mid tier becomes "MOST CHOSEN" + `recommended` (the default selection),
 * the highest-priced tier becomes "BEST VALUE", everything else loses its badge.
 * Robust to custom per-persona pricing (any tier count / packageTypes).
 *
 * Variant A returns the tiers untouched (today's badges), so Arm A is unchanged.
 */
export function applyBVariantBadges(tiers: PricingTier[]): PricingTier[] {
  if (!tiers.length) return tiers.map((t) => ({ ...t }));
  const byPrice = [...tiers].sort((a, b) => a.priceUsd - b.priceUsd);
  const best = byPrice[byPrice.length - 1];
  const mid =
    tiers.find((t) => t.packageType === "premium") ??
    byPrice[byPrice.length - 2] ??
    byPrice[0];
  return tiers.map((t) => {
    if (t.packageType === mid.packageType) {
      return { ...t, badge: "MOST CHOSEN", recommended: true };
    }
    if (best && t.packageType === best.packageType) {
      return { ...t, badge: "BEST VALUE", recommended: false };
    }
    return { ...t, badge: undefined, recommended: false };
  });
}

/** Apply the presentation for a given variant: B re-badges, A is untouched. */
export function applyVariantPresentation(tiers: PricingTier[], variant: PaywallVariant): PricingTier[] {
  return variant === "B" ? applyBVariantBadges(tiers) : tiers;
}

/**
 * The tier selected by default when the paywall opens.
 * - Variant B: the `recommended` tier (mid "MOST CHOSEN"), falling back to the
 *   `premium` package, then the last badged tier, then the first tier.
 * - Variant A: today's behaviour — the last badged tier (the $99.99 "whale").
 */
export function defaultTier(tiers: PricingTier[], variant: PaywallVariant): PricingTier | undefined {
  if (!tiers.length) return undefined;
  if (variant === "B") {
    return (
      tiers.find((t) => t.recommended) ??
      tiers.find((t) => t.packageType === "premium") ??
      tiers.findLast((t) => t.badge) ??
      tiers[0]
    );
  }
  return tiers.findLast((t) => t.badge) ?? tiers[0];
}
