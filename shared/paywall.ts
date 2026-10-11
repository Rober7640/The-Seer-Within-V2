// Shared paywall logic — used by BOTH the server (to shape /api/credits/pricing)
// and the client (preview + live components), so there is a single source of
// truth for variant-B presentation. See docs/posthog-evelyn-purchase-findings.md
// §3.14–3.15.

import type { PricingTier } from "./types";
import { COINS_PER_MINUTE, minutesToCoins, usdCentsToCoins } from "./types";

export type PaywallVariant = "A" | "B";

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

// ---------------------------------------------------------------------------
// PREVIEW ONLY — bonus-minute packs for the paywall tests (improve-v2 paywall
// "updated test 1"). Nothing live reads these: DEFAULT_PRICING and every persona's
// tiers are untouched.
//
// Each pack is defined by the two numbers its tile CLAIMS ("+2 min FREE",
// "9 min total"). The coins are derived so both claims always hold:
//   bonusCoins = max(free min in coins, total min in coins − price, 0)
// and the tile renders the claimed numbers, never a re-derived rounding.
// At $2.99/min (299¢):
//   first-timer: $10 → 3:20 ("3 min") · $20 → 9:00 ("+2 min FREE", "9 min total")
//                · $30 → 15:02 ("+5 min FREE", "15 min total")
//   repeat buyer adds: $50 → 30:00 ("+13", "30") · $100 → 70:00 ("+36", "70")
// Bonus coins are priced at the guide's own rate, so a guide with a different
// cents/min still gets at least what the tile says.
// ---------------------------------------------------------------------------

/** One pack: its price + the two numbers its tile shows. */
export interface BonusPackSpec {
  packageType: string;
  priceCents: number;
  /** "+N min FREE" on the tile; 0 = no pill. */
  freeMinutesShown: number;
  /** "N min total" (or "N min" when there is no bonus). */
  totalMinutesShown: number;
  badge?: string;
  recommended?: boolean;
}

/** A PricingTier that also carries the claims its tile renders. */
export interface BonusPreviewTier extends PricingTier {
  freeMinutesShown: number;
  totalMinutesShown: number;
}

/** First-timer card (LongCopyPaywall): the same $10/$20/$30 she knows today. */
export const FIRST_TIMER_LADDER: BonusPackSpec[] = [
  { packageType: "popular", priceCents: 1000, freeMinutesShown: 0, totalMinutesShown: 3 },
  { packageType: "best_value", priceCents: 2000, freeMinutesShown: 2, totalMinutesShown: 9, badge: "MOST POPULAR", recommended: true },
  { packageType: "premium", priceCents: 3000, freeMinutesShown: 5, totalMinutesShown: 15, badge: "BEST VALUE" },
];

/** Repeat-buyer card (RepeatBuyerPaywall): five packs + Custom. "whale_100" is a
 *  preview-only key — the server has no such package today. */
export const REPEAT_BUYER_LADDER: BonusPackSpec[] = [
  { packageType: "popular", priceCents: 1000, freeMinutesShown: 0, totalMinutesShown: 3 },
  { packageType: "best_value", priceCents: 2000, freeMinutesShown: 2, totalMinutesShown: 9, badge: "MOST POPULAR", recommended: true },
  { packageType: "premium", priceCents: 3000, freeMinutesShown: 5, totalMinutesShown: 15 },
  { packageType: "whale", priceCents: 5000, freeMinutesShown: 13, totalMinutesShown: 30 },
  { packageType: "whale_100", priceCents: 10000, freeMinutesShown: 36, totalMinutesShown: 70, badge: "BEST VALUE" },
];

/** Bonus coins that make BOTH of a pack's claims true at this rate. */
export function bonusCoinsFor(spec: BonusPackSpec, coinsPerMinute: number = COINS_PER_MINUTE): number {
  return Math.max(
    minutesToCoins(spec.freeMinutesShown, coinsPerMinute),
    minutesToCoins(spec.totalMinutesShown, coinsPerMinute) - spec.priceCents,
    0,
  );
}

/** A ladder as tiers at a given rate (a coin is a cent). */
export function buildBonusTiers(ladder: BonusPackSpec[], coinsPerMinute: number = COINS_PER_MINUTE): BonusPreviewTier[] {
  return ladder.map((p) => {
    const bonusCoins = bonusCoinsFor(p, coinsPerMinute);
    return {
      packageType: p.packageType,
      coins: p.priceCents,
      bonusCoins,
      totalCoins: p.priceCents + bonusCoins,
      priceUsd: p.priceCents,
      label: `$${p.priceCents / 100}`,
      ...(p.badge ? { badge: p.badge } : {}),
      recommended: !!p.recommended,
      freeMinutesShown: p.freeMinutesShown,
      totalMinutesShown: p.totalMinutesShown,
    };
  });
}

/** First-timer ladder as tiers. PREVIEW ONLY. */
export function buildBonusPreviewTiers(coinsPerMinute: number = COINS_PER_MINUTE): BonusPreviewTier[] {
  return buildBonusTiers(FIRST_TIMER_LADDER, coinsPerMinute);
}

/** Repeat-buyer ladder as tiers. PREVIEW ONLY. */
export function buildRepeatPreviewTiers(coinsPerMinute: number = COINS_PER_MINUTE): BonusPreviewTier[] {
  return buildBonusTiers(REPEAT_BUYER_LADDER, coinsPerMinute);
}

/** The ladders at the default rate. PREVIEW ONLY. */
export const PREVIEW_BONUS_TIERS: BonusPreviewTier[] = buildBonusPreviewTiers();
export const PREVIEW_REPEAT_TIERS: BonusPreviewTier[] = buildRepeatPreviewTiers();

/** What a custom amount buys on a bonus-pack card. */
export interface CustomBonusQuote {
  coins: number;
  bonusCoins: number;
  totalCoins: number;
  /** "+N min FREE" — copied from the pack the bonus came from; 0 = no pill. */
  freeMinutesShown: number;
  /** Whole minutes she gets, floored (never overstated). */
  totalMinutesShown: number;
  /** The pack whose bonus was copied, or null if the amount is below every pack. */
  fromPackageType: string | null;
}

/**
 * A custom amount gets the free minutes of the LARGEST pack priced at or below it
 * (bonus coins copied from that pack), so every custom amount is worth at least
 * the pack below it. E.g. repeat $60 → 20:04 + 13:17 = "33 min";
 * first-timer $40 → 13:22 + 5:00 = "18 min".
 *
 * PREVIEW ONLY. The server checkout charges a custom amount at the flat rate today
 * (coins = cents, bonusCoins = 0 — see usdCentsToCoins / CUSTOM_PACKAGE_TYPE), so
 * wiring this live needs a server change to grant the copied bonus.
 */
export function quoteCustomAmount(
  cents: number,
  tiers: BonusPreviewTier[],
  coinsPerMinute: number = COINS_PER_MINUTE,
): CustomBonusQuote {
  const coins = cents > 0 ? usdCentsToCoins(cents) : 0;
  const base = [...tiers]
    .filter((t) => t.priceUsd <= cents)
    .sort((a, b) => b.priceUsd - a.priceUsd)[0];
  const bonusCoins = base ? base.bonusCoins : 0;
  const totalCoins = coins + bonusCoins;
  return {
    coins,
    bonusCoins,
    totalCoins,
    freeMinutesShown: base && bonusCoins > 0 ? base.freeMinutesShown : 0,
    totalMinutesShown: Math.floor(totalCoins / Math.max(1, coinsPerMinute)),
    fromPackageType: base?.packageType ?? null,
  };
}
