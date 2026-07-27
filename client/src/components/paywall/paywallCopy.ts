// Paywall copy — single source of truth for the redesigned (variant "B") paywall
// surfaces. Strings come from docs/evelyn-paywall-copy-rewrite.md (§ "Canonical
// before → after"). Variant "A" mirrors today's live strings so the same
// components can later be A/B gated per docs/posthog-evelyn-purchase-findings.md §3.14.
//
// Nothing here is wired into the live app yet — it is consumed only by the
// redesigned paywall components + the /paywall-preview design route.

import type { PricingTier } from "@shared/types";
import { COINS_PER_MINUTE } from "@shared/types";

// Pure tier logic lives in shared/ so the server shapes pricing identically.
export { applyBVariantBadges, defaultTier } from "@shared/paywall";
export type { PaywallVariant } from "@shared/paywall";
import type { PaywallVariant } from "@shared/paywall";

/** A pricing tier expressed in the units the new design leads with. */
export interface TierView {
  tier: PricingTier;
  minutes: number; // total minutes (paid + bonus)
  bonusMinutes: number; // free minutes from the bonus coins
  pricePerMinute: number; // dollars per minute, total-coins basis
  priceLabel: string; // "$49.99"
  perMinuteLabel: string; // "$1.67/m"
}

export function toTierView(tier: PricingTier, coinsPerMinute: number = COINS_PER_MINUTE): TierView {
  // Minutes and the "$X/m" label are derived at the GUIDE'S rate (cents/min), not a
  // global constant — so a guide priced at $9.99/min shows ~1:00 · $9.99/m for the
  // same $10 pack that shows ~3:20 · $2.99/m on Evelyn. Minutes floored to 1 decimal
  // so we never overstate the time; the per-minute price uses the EXACT minutes so a
  // $10 / 3.34-min pack reads "$2.99/m" rather than the $3.33 a whole-minute count gives.
  const exactMinutes = tier.totalCoins / coinsPerMinute;
  const minutes = Math.floor(exactMinutes * 10) / 10;
  const bonusMinutes = Math.floor((tier.bonusCoins / coinsPerMinute) * 10) / 10;
  const dollars = tier.priceUsd / 100;
  const pricePerMinute = exactMinutes > 0 ? dollars / exactMinutes : dollars;
  return {
    tier,
    minutes,
    bonusMinutes,
    pricePerMinute,
    priceLabel: `$${dollars.toFixed(2)}`,
    perMinuteLabel: `$${pricePerMinute.toFixed(2)}/m`,
  };
}

/** Lowest per-minute rate across the tiers at a guide's rate, e.g. "$1.33". */
export function lowestPerMinuteLabel(tiers: PricingTier[], coinsPerMinute: number = COINS_PER_MINUTE): string {
  const rates = tiers.map((t) => toTierView(t, coinsPerMinute).pricePerMinute).filter((r) => r > 0);
  const min = rates.length ? Math.min(...rates) : 0;
  return `$${min.toFixed(2)}`;
}

export interface PaywallCopy {
  modal: {
    headerOutOfCredits: string;
    headerLow: (persona: string) => string;
    subhead: (persona: string) => string;
    ladder: (lowest: string) => string;
    commit: (minutes: number) => string;
    cta: (persona: string, price: string) => string;
    railHint: string;
    decline: string;
  };
  banner: {
    lowBalance: (persona: string) => string;
    freeTrial: string;
    cta: string;
  };
  store: {
    title: (persona: string) => string;
    balanceLabel: string;
    balanceValue: (minutes: number) => string;
    idleNote: string;
    valueHeader: string;
    valueBody: (lowest: string) => string;
    sectionHeader: (persona: string) => string;
    tierCta: string;
    rateLine: string;
  };
  refundLine: string;
  trustLine: string;
  noSubscription: string;
  ratingLine: string;
}

const B: PaywallCopy = {
  modal: {
    headerOutOfCredits: "Let's pick this back up.",
    headerLow: (p) => `More time with ${p}`,
    subhead: (p) =>
      `You & ${p} were mid-thread — add a few minutes and pick up right where you left off.`,
    ladder: (lowest) => `As low as ${lowest}/min on bigger packs.`,
    commit: (minutes) => `Adding ${minutes} min`,
    cta: (p, price) => `Keep going with ${p} · ${price}`,
    railHint: "PayPal · Card",
    decline: "Not now — keep my place saved.",
  },
  banner: {
    lowBalance: (p) => `About a minute left with ${p} — keep the thread open.`,
    freeTrial: "Your free minutes are almost up — and we're just getting to the real thing.",
    cta: "Keep going",
  },
  store: {
    title: (p) => `Your time with ${p}`,
    balanceLabel: "Your balance",
    balanceValue: (minutes) => `${minutes} minutes left`,
    idleNote: "Idle time is free — you only spend in a live reading.",
    valueHeader: "Simple per-minute pricing",
    valueBody: (lowest) =>
      `One flat rate — ${lowest} a minute. You only spend during a live reading; idle time is free.`,
    sectionHeader: (p) => `How much time would you like with ${p}?`,
    tierCta: "Keep going",
    rateLine: "One flat rate per minute — no subscription, no auto-renew.",
  },
  refundLine: "30-day money-back guarantee on unused minutes — no questions asked.",
  trustLine: "Encrypted by PayPal & Stripe — we never see your card details.",
  noSubscription: "One-time — no subscription, no auto-renew.",
  ratingLine: "4.8 / 5 from thousands seeking clarity",
};

const A: PaywallCopy = {
  modal: {
    headerOutOfCredits: "Your Time Has Run Out",
    headerLow: () => "Get More Minutes",
    subhead: (p) => `Add more minutes to continue your journey with ${p}`,
    ladder: () => "",
    commit: (minutes) => `${minutes} min`,
    cta: () => "Add Minutes",
    railHint: "",
    decline: "",
  },
  banner: {
    lowBalance: () => "You're running low on time",
    freeTrial: "Your free trial is ending soon!",
    cta: "Refill",
  },
  store: {
    title: () => "Add Minutes",
    balanceLabel: "Current Balance",
    balanceValue: (minutes) => `${minutes} minutes left`,
    idleNote: "",
    valueHeader: "You don't have to figure things out alone",
    valueBody: () => "Simple per-minute pricing",
    sectionHeader: () => "Choose Your Package",
    tierCta: "Add Minutes",
    rateLine: "Same rate for all guides · no subscription",
  },
  refundLine: "One-time payment is non-refundable.",
  trustLine: "Guaranteed secure payments",
  noSubscription: "",
  ratingLine: "",
};

export function paywallCopy(variant: PaywallVariant): PaywallCopy {
  return variant === "B" ? B : A;
}
