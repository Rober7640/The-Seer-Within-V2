// RepeatBuyerPaywall — PREVIEW ONLY. The live short paywall repeat buyers see today
// (BuyCreditsModal) with ONE change: the packs. Same backdrop, avatar, headline,
// sub-line, label, terms line and buttons; the 3 clock tiles + Custom Amount row
// become a 3×2 grid of bonus-minute packs: $10 / $20 / $30 on top, $50 / $100 /
// Custom below. Rendered only on the dev-only /paywall-preview?surface=repeat
// route; nothing live imports it, and BuyCreditsModal itself is untouched.
//
// Presentational: everything comes in via props. `RepeatBuyerPaywallPanel` is the
// card; the default export wraps it in the same Dialog + mobile bottom sheet as
// BuyCreditsModal.

import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PAYMENT_DIALOG_MOBILE_SHEET } from "@/lib/paymentDialog";
import {
  COINS_PER_MINUTE,
  CUSTOM_PACKAGE_TYPE,
  CUSTOM_TOPUP_MAX_USD,
  type PricingTier,
} from "@shared/types";
import { quoteCustomAmount, type BonusPreviewTier } from "@shared/paywall";
import {
  BonusPackTile,
  FreeMinutesPill,
  SelectedCheck,
  TILE_BOX_CLASS,
  TILE_PILL_ROW_CLASS,
  TILE_TOTAL_ROW_CLASS,
  minutesLabel,
  tileFrameClass,
} from "./BonusPackTile";

export interface RepeatBuyerPaywallProps {
  personaName?: string;
  avatarUrl?: string;
  /** Headline "Continue Your Chat" + "End Chat" when out; else "More time together" + "Maybe later". */
  isOutOfCredits?: boolean;
  /** Bonus-minute packs (shared/paywall.ts REPEAT_BUYER_LADDER); the five cheapest are shown. */
  tiers: BonusPreviewTier[];
  /** The guide's cents-per-minute rate; drives the custom-amount minutes. */
  coinsPerMinute?: number;
  /** Called with the chosen pack (a preset, or a synthesized custom tier). */
  onContinue: (tier: PricingTier) => void;
  /** ✕, "End Chat" and "Maybe later" — the same decision, as in BuyCreditsModal. */
  onClose: () => void;
}

export function RepeatBuyerPaywallPanel({
  personaName,
  avatarUrl,
  isOutOfCredits = true,
  tiers,
  coinsPerMinute = COINS_PER_MINUTE,
  onContinue,
  onClose,
}: RepeatBuyerPaywallProps) {
  const firstName = (personaName || "your guide").split(" ")[0];

  // Five packs ascending; the sixth slot is Custom.
  const presetTiers = useMemo(() => [...tiers].sort((a, b) => a.priceUsd - b.priceUsd).slice(0, 5), [tiers]);
  const defaultPackage =
    presetTiers.find((t) => t.recommended)?.packageType ??
    presetTiers[1]?.packageType ??
    presetTiers[0]?.packageType ??
    "";

  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [selectedPackage, setSelectedPackage] = useState(defaultPackage);
  const [customInput, setCustomInput] = useState("");

  // --- Custom amount: same floor/cap as BuyCreditsModal (floor = cheapest pack, cap =
  // platform max), plus the free minutes of the largest pack at or below the amount
  // (quoteCustomAmount). PREVIEW ONLY: the server checkout charges custom amounts at
  // the flat rate today (no bonus), so wiring this live needs a server change.
  const floorCents = presetTiers.length ? presetTiers[0].priceUsd : 1000;
  const floorUsd = Math.round(floorCents / 100);
  const customDollars = parseFloat(customInput);
  const customCents = Number.isFinite(customDollars) ? Math.round(customDollars * 100) : 0;
  const customQuote = quoteCustomAmount(customCents, presetTiers, coinsPerMinute);
  const customTooLow = customInput.trim() !== "" && customCents > 0 && customCents < floorCents;
  const customTooHigh = customCents > CUSTOM_TOPUP_MAX_USD * 100;
  const customValid = mode === "custom" && customCents >= floorCents && !customTooHigh;
  const customActive = mode === "custom";
  const canContinue = mode === "preset" ? !!selectedPackage : customValid;

  const handleContinue = () => {
    if (mode === "custom") {
      if (!customValid) return;
      onContinue({
        packageType: CUSTOM_PACKAGE_TYPE,
        coins: customQuote.coins,
        bonusCoins: customQuote.bonusCoins,
        totalCoins: customQuote.totalCoins,
        priceUsd: customCents,
        label: `$${(customCents / 100).toFixed(2)}`,
      });
      return;
    }
    const tier = presetTiers.find((t) => t.packageType === selectedPackage) ?? presetTiers[0];
    if (tier) onContinue(tier);
  };

  const customInputRef = useRef<HTMLInputElement>(null);
  // Typed amounts match the pack prices ($60 at 24px), shrinking for long entries
  // ("200.00") so they never spill out of a phone-width tile.
  const customFontClass =
    customInput.length <= 4 ? "text-[24px]" : customInput.length <= 6 ? "text-[17px]" : "text-[13px]";

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-2xl">
      {/* Cosmic backdrop (our theme, not Keen green) — as BuyCreditsModal */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f1628] via-[#162040] to-[#1a2550]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-purple-900/30 to-transparent" />

      {/* Close — the same 28px circle in the same spot as BuyCreditsModal, inside a
          40px tap area. */}
      <button
        onClick={onClose}
        aria-label="Close"
        className="group absolute right-1.5 top-1.5 z-20 flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-none"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/60 transition-all group-hover:bg-white/20 group-hover:text-white group-focus-visible:ring-2 group-focus-visible:ring-white/60">
          <X className="h-4 w-4" />
        </span>
      </button>

      {/* Short phones (≤ 620px tall, e.g. 375×548 / 360×560 under the browser bars) get a
          tighter header and gaps so the six packs AND the buttons fit with no scrolling.
          Phones: as tall as the visible screen allows (dvh) minus a 40px strip of chat;
          browsers without dvh keep 88vh. */}
      <div className="relative z-10 max-h-[88vh] overflow-y-auto px-6 pb-6 pt-7 max-sm:max-h-[calc(100dvh-40px)] [@media(max-height:620px)]:pb-4 [@media(max-height:620px)]:pt-4">
        {/* Header — same words as BuyCreditsModal */}
        <div className="mb-4 text-center [@media(max-height:620px)]:mb-3">
          <div className="mx-auto mb-2.5 h-12 w-12 rounded-full p-[2px] ring-1 ring-amber-200/40 shadow-[0_0_24px_rgba(251,191,36,0.25)] [@media(max-height:620px)]:mb-1.5 [@media(max-height:620px)]:h-10 [@media(max-height:620px)]:w-10">
            <img
              src={avatarUrl || "/evelyn-avatar.png"}
              alt={personaName || "your guide"}
              className="h-full w-full rounded-full object-cover"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.endsWith("/evelyn-avatar.png")) img.src = "/evelyn-avatar.png";
              }}
            />
          </div>
          <h2 className="font-serif text-2xl font-bold leading-tight text-white [@media(max-height:620px)]:text-[22px]">
            {isOutOfCredits ? "Continue Your Chat" : "More time together"}
          </h2>
          <p className="mt-1.5 text-[13px] text-white/60 [@media(max-height:620px)]:mt-1">{firstName} will wait for you</p>
        </div>

        {/* Add-minutes label */}
        <p className="mb-3.5 text-[13px] font-medium text-white/70 [@media(max-height:620px)]:mb-3 [@media(max-height:620px)]:leading-snug">
          Add minutes to keep chatting.
          <span className="ml-1 font-normal text-white/45">Your balance works with every guide.</span>
        </p>

        {/* Packs — 3×2: $10 / $20 / $30, then $50 / $100 / Custom. The row gap is
            wider than the column gap so the bottom row's badge never touches the
            tiles above it, nor the tick on a selected tile above. */}
        <div className="mb-3 grid grid-cols-3 gap-x-2 gap-y-5 [@media(max-height:620px)]:mb-2.5">
          {presetTiers.map((tier) => (
            <BonusPackTile
              key={tier.packageType}
              tier={tier}
              selected={mode === "preset" && selectedPackage === tier.packageType}
              onSelect={() => {
                setMode("preset");
                setSelectedPackage(tier.packageType);
                setCustomInput("");
              }}
            />
          ))}

          {/* Custom — the sixth tile. Same three rows: amount, FREE pill, minutes. */}
          <div
            role="button"
            tabIndex={-1}
            aria-pressed={customActive}
            onClick={() => {
              setMode("custom");
              customInputRef.current?.focus();
            }}
            className={`${TILE_BOX_CLASS} cursor-text ${tileFrameClass(
              customActive,
              customTooLow || customTooHigh,
            )}`}
          >
            {customValid && <SelectedCheck />}
            <div className={`flex h-[24px] items-center justify-center font-bold leading-none text-white ${customFontClass}`}>
              {customInput !== "" && <span>$</span>}
              <input
                ref={customInputRef}
                type="text"
                inputMode="decimal"
                aria-label="Custom amount in dollars"
                placeholder="Custom"
                value={customInput}
                onFocus={() => setMode("custom")}
                onChange={(e) => {
                  // digits + one optional decimal point (as BuyCreditsModal)
                  const raw = e.target.value.replace(/[^0-9.]/g, "");
                  const parts = raw.split(".");
                  const clean = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : raw;
                  setMode("custom");
                  setCustomInput(clean);
                }}
                // Typed: shrink to the digits so "$" + amount centre as one word ("$60").
                style={customInput !== "" ? { width: `${Math.min(customInput.length, 7)}ch` } : undefined}
                className={`min-w-0 bg-transparent font-bold text-white focus:outline-none ${
                  customInput !== ""
                    ? `text-left tabular-nums ${customFontClass}`
                    : "w-full text-center text-[16px] font-semibold placeholder:text-white/70"
                }`}
              />
            </div>
            <div className={TILE_PILL_ROW_CLASS}>
              {customCents > 0 && !customTooHigh && customQuote.freeMinutesShown > 0 ? (
                <FreeMinutesPill minutes={customQuote.freeMinutesShown} />
              ) : null}
            </div>
            <div className={TILE_TOTAL_ROW_CLASS}>
              {customCents > 0 && !customTooHigh
                ? minutesLabel(customQuote.totalMinutesShown, customQuote.freeMinutesShown)
                : <span className="text-white/40">${floorUsd}–${CUSTOM_TOPUP_MAX_USD}</span>}
            </div>
          </div>
        </div>

        {/* Custom validation hint */}
        {customActive && (customTooLow || customTooHigh) && (
          <p className="mb-2 text-center text-[11px] text-rose-300/90">
            {customTooHigh ? `Maximum top-up is $${CUSTOM_TOPUP_MAX_USD}.` : `Minimum top-up is $${floorUsd}.`}
          </p>
        )}

        {/* Terms line */}
        <p className="mb-3.5 text-center text-[11px] leading-snug text-white/40 [@media(max-height:620px)]:mb-3">
          By continuing you agree to our{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white/70">
            Terms
          </a>{" "}
          &amp;{" "}
          <a href="/refund" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white/70">
            Refund Policy
          </a>
          .
        </p>

        {/* Actions — as BuyCreditsModal */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={onClose}
            className="rounded-2xl border-2 border-white/15 py-3 text-center text-[14px] font-semibold text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            {isOutOfCredits ? "End Chat" : "Maybe later"}
          </button>
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className="rounded-2xl bg-gradient-to-r from-teal-400 to-emerald-500 py-3 text-center text-[14px] font-semibold text-[#0f1628] shadow-lg shadow-emerald-500/20 transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

/** The panel inside the same Dialog + phone bottom-sheet as BuyCreditsModal. */
export default function RepeatBuyerPaywall({
  open,
  onOpenChange,
  ...props
}: RepeatBuyerPaywallProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-md p-0 bg-transparent border-0 shadow-none [&>button:last-child]:hidden ${PAYMENT_DIALOG_MOBILE_SHEET}`}
      >
        <RepeatBuyerPaywallPanel {...props} />
      </DialogContent>
    </Dialog>
  );
}
