import { describe, it, expect } from "vitest";
import { perMinuteVaries, ladderLine, toTierView, paywallCopy } from "./paywallCopy";
import type { PricingTier } from "@shared/types";

const flat: PricingTier[] = [
  { packageType: "popular",    coins: 1000, bonusCoins: 0, totalCoins: 1000, priceUsd: 1000, label: "$10" },
  { packageType: "best_value", coins: 2000, bonusCoins: 0, totalCoins: 2000, priceUsd: 2000, label: "$20" },
  { packageType: "premium",    coins: 3000, bonusCoins: 0, totalCoins: 3000, priceUsd: 3000, label: "$30" },
];
const varying: PricingTier[] = [
  { packageType: "a", coins: 1000, bonusCoins: 0,   totalCoins: 1000, priceUsd: 1000, label: "$10" },
  { packageType: "b", coins: 2000, bonusCoins: 600, totalCoins: 2600, priceUsd: 2000, label: "$20" }, // cheaper per min
];

describe("ladder line honesty", () => {
  it("flat pricing does not imply a bulk discount", () => {
    expect(perMinuteVaries(flat, 299)).toBe(false);
    const line = ladderLine(flat, 299, "B");
    expect(line).not.toMatch(/bigger packs/i);
    expect(line).toContain("$2.99");
  });
  it("varying pricing keeps the as-low-as framing", () => {
    expect(perMinuteVaries(varying, 299)).toBe(true);
    expect(ladderLine(varying, 299, "B")).toMatch(/as low as/i);
  });
  it("variant A ladder is empty", () => {
    expect(ladderLine(flat, 299, "A")).toBe("");
  });
  it("variant B copy is truthful — no 'non-refundable', a money-back guarantee present", () => {
    const b = paywallCopy("B");
    const allB = JSON.stringify(b).toLowerCase();
    expect(allB).not.toContain("non-refundable");
    expect(b.refundLine.toLowerCase()).toMatch(/money-back|guarantee/);
    expect(b.noSubscription.toLowerCase()).toMatch(/no subscription|no auto-renew/);
  });
  it("variant A retains today's 'non-refundable' wording (byte-identical control)", () => {
    const a = paywallCopy("A");
    expect(a.refundLine.toLowerCase()).toContain("non-refundable");
  });
  it("toTierView emits no bonus and no NaN when bonusCoins is 0 or absent", () => {
    expect(toTierView(flat[0], 299).bonusMinutes).toBe(0);
    const noBonus = { ...flat[0] } as PricingTier;
    // @ts-expect-error simulate a legacy tier missing bonusCoins
    delete noBonus.bonusCoins;
    expect(Number.isNaN(toTierView(noBonus, 299).bonusMinutes)).toBe(false);
  });
});
