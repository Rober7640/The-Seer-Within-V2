// Shared pack tile for the PREVIEW-ONLY bonus-minute paywalls (LongCopyPaywall,
// RepeatBuyerPaywall). Top to bottom: price big → "+N min FREE" pill → whole-minute
// total small. It renders the pack's CLAIMED numbers (freeMinutesShown /
// totalMinutesShown from shared/paywall.ts) — never a m:ss clock and never a
// re-derived rounding. The coins behind each claim are proven by
// scripts/check-paywall-bonus-honesty.ts.

import { Check } from "lucide-react";
import type { BonusPreviewTier } from "@shared/paywall";

/** "9 min total" when there is a bonus, plain "3 min" when there isn't. */
export function minutesLabel(totalMinutes: number, freeMinutes: number): string {
  return freeMinutes > 0 ? `${totalMinutes} min total` : `${totalMinutes} min`;
}

/** The eye-catcher: solid emerald so the free minutes read before anything else. */
export function FreeMinutesPill({ minutes }: { minutes: number }) {
  return (
    <span className="whitespace-nowrap rounded-full bg-emerald-400 px-1.5 py-[3px] text-[11px] font-extrabold leading-none text-[#062619] shadow-[0_0_12px_rgba(52,211,153,0.35)]">
      +{minutes} min FREE
    </span>
  );
}

export function PackBadge({ badge }: { badge: string }) {
  const isPopular = badge === "MOST POPULAR";
  return (
    <div
      // 11px = the small-print floor. No letter-spacing and a slim side padding keep
      // "MOST POPULAR" inside a 360px-phone tile (~100px wide).
      className={`absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-[3px] text-[11px] font-bold uppercase leading-none shadow-lg ${
        isPopular
          ? "bg-gradient-to-r from-amber-400 to-orange-400 text-[#1a1530]"
          : "bg-gradient-to-r from-violet-300 to-fuchsia-300 text-[#1a1530]"
      }`}
    >
      {badge}
    </div>
  );
}

/** The "selected" tick. It sits on the BOTTOM-right corner: at the top-right it ran
 *  into the centred MOST POPULAR badge on phone-width tiles. */
export function SelectedCheck() {
  return (
    <div className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-teal-400 shadow">
      <Check className="h-3 w-3 text-[#0f1628]" strokeWidth={3} />
    </div>
  );
}

/** Tile box + inner row spacing, shared by the pack tiles and RepeatBuyerPaywall's
 *  Custom tile so all six stay the same height. Shorter on short phones (621–700px
 *  tall, then ≤ 620px) so the whole paywall fits without scrolling; the height ranges
 *  never overlap, so class order doesn't matter. */
export const TILE_BOX_CLASS =
  "relative rounded-2xl border-2 px-1 pb-2.5 pt-4 text-center transition-all duration-150 " +
  "[@media(min-height:621px)_and_(max-height:700px)]:pb-2 [@media(min-height:621px)_and_(max-height:700px)]:pt-3 " +
  "[@media(max-height:620px)]:pb-1.5 [@media(max-height:620px)]:pt-2.5";
/** The FREE-pill row (fixed 17px so tiles with and without a pill line up). */
export const TILE_PILL_ROW_CLASS = "mt-2 flex h-[17px] items-center justify-center [@media(max-height:700px)]:mt-1.5";
/** The "N min total" row. */
export const TILE_TOTAL_ROW_CLASS = "mt-1.5 text-[12px] font-medium leading-none text-white/60 [@media(max-height:700px)]:mt-1";

/** Border/background of a tile, selected or not (also used by the Custom tile). */
export function tileFrameClass(selected: boolean, invalid = false): string {
  if (selected && invalid) return "border-rose-400/60 bg-rose-400/[0.06]";
  return selected
    ? "border-teal-400 bg-teal-400/10 shadow-lg shadow-teal-500/10"
    : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]";
}

export function BonusPackTile({
  tier,
  selected,
  onSelect,
}: {
  tier: BonusPreviewTier;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`${TILE_BOX_CLASS} ${tileFrameClass(selected)}`}
    >
      {tier.badge && <PackBadge badge={tier.badge} />}
      {selected && <SelectedCheck />}
      <div className="text-[24px] font-bold leading-none text-white">${(tier.priceUsd / 100).toFixed(0)}</div>
      <div className={TILE_PILL_ROW_CLASS}>
        {tier.freeMinutesShown > 0 ? <FreeMinutesPill minutes={tier.freeMinutesShown} /> : null}
      </div>
      <div className={TILE_TOTAL_ROW_CLASS}>
        {minutesLabel(tier.totalMinutesShown, tier.freeMinutesShown)}
      </div>
    </button>
  );
}
