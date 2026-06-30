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

export function toTierView(tier: PricingTier): TierView {
  const minutes = Math.floor(tier.totalCoins / COINS_PER_MINUTE);
  const bonusMinutes = Math.floor(tier.bonusCoins / COINS_PER_MINUTE);
  const dollars = tier.priceUsd / 100;
  const pricePerMinute = minutes > 0 ? dollars / minutes : dollars;
  return {
    tier,
    minutes,
    bonusMinutes,
    pricePerMinute,
    priceLabel: `$${dollars.toFixed(2)}`,
    perMinuteLabel: `$${pricePerMinute.toFixed(2)}/m`,
  };
}

/** Lowest per-minute rate across the tiers, e.g. "$1.33". */
export function lowestPerMinuteLabel(tiers: PricingTier[]): string {
  const rates = tiers.map((t) => toTierView(t).pricePerMinute).filter((r) => r > 0);
  const min = rates.length ? Math.min(...rates) : 0;
  return `$${min.toFixed(2)}`;
}

export interface PaywallCopy {
  modal: {
    headerOutOfCredits: string;
    headerLow: (persona: string) => string;
    subhead: (persona: string) => string;
    ladder: (lowest: string) => string;
    commit: (minutes: number, coins: number) => string;
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
    balanceValue: (minutes: number, coins: number) => string;
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
    commit: (minutes, coins) => `Adding ${minutes} min · ${coins.toLocaleString()} coins`,
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
    balanceValue: (minutes, coins) =>
      `${minutes} minutes left · ${coins.toLocaleString()} coins`,
    idleNote: "Idle time is free — you only spend in a live reading.",
    valueHeader: "You get more minutes than you pay for",
    valueBody: (lowest) =>
      `Every package adds free bonus minutes, and the bigger the pack, the less each minute costs — as low as ${lowest}.`,
    sectionHeader: (p) => `How much time would you like with ${p}?`,
    tierCta: "Keep going",
    rateLine: "60 coins = 1 minute with any guide.",
  },
  refundLine: "30-day money-back guarantee on unused coins — no questions asked.",
  trustLine: "Encrypted by PayPal & Stripe — we never see your card details.",
  noSubscription: "One-time — no subscription, no auto-renew.",
  ratingLine: "4.8 / 5 from thousands seeking clarity",
};

const A: PaywallCopy = {
  modal: {
    headerOutOfCredits: "Your Credits Have Run Out",
    headerLow: () => "Get More Coins",
    subhead: (p) => `Add more coins to continue your journey with ${p}`,
    ladder: () => "",
    commit: (_m, coins) => `${coins.toLocaleString()} coins`,
    cta: () => "Buy Coins",
    railHint: "",
    decline: "",
  },
  banner: {
    lowBalance: () => "You're running low on credits",
    freeTrial: "Your free trial is ending soon!",
    cta: "Refill",
  },
  store: {
    title: () => "Buy Credits",
    balanceLabel: "Current Balance",
    balanceValue: (_m, coins) => `${coins.toLocaleString()} coins`,
    idleNote: "",
    valueHeader: "You don't have to figure things out alone",
    valueBody: () => "Get bonus coins on every package",
    sectionHeader: () => "Choose Your Package",
    tierCta: "Buy Coins",
    rateLine: "60 coins = 1 minute · same rate for all guides",
  },
  refundLine: "One-time payment is non-refundable.",
  trustLine: "Guaranteed secure payments",
  noSubscription: "",
  ratingLine: "",
};

export function paywallCopy(variant: PaywallVariant): PaywallCopy {
  return variant === "B" ? B : A;
}
