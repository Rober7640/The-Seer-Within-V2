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

import { useMemo } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PAYMENT_DIALOG_MOBILE_SHEET } from "@/lib/paymentDialog";
import { COINS_PER_MINUTE, CUSTOM_TOPUP_MAX_USD, type PricingTier } from "@shared/types";
import type { BonusPreviewTier } from "@shared/paywall";
import {
  BonusPackTile,
  DialogDescriptionIf,
  DialogTitleIf,
  FreeMinutesPill,
  SelectedCheck,
  TILE_BOX_CLASS,
  TILE_PILL_ROW_CLASS,
  TILE_TOTAL_ROW_CLASS,
  focusDialogItself,
  minutesLabel,
  tileFrameClass,
  usePackSelection,
} from "./BonusPackTile";

/** How she closed the sheet: the ✕, the End Chat / Maybe later button, or (in the
 *  Dialog) Esc / a tap outside. Same decision every time; the host may log which. */
export type RepeatCloseVia = "x" | "button" | "dismiss";

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
  /** ✕, "End Chat" and "Maybe later" — the same decision, as in BuyCreditsModal
   *  (plus Esc / a tap outside in the Dialog). */
  onClose: (via: RepeatCloseVia) => void;
  /** Rendered inside the real Dialog (the default export): the heading becomes its title. */
  inDialog?: boolean;
  /** Preview page only: a tighter cap on the sheet's height (CSS length), so the sheet
   *  never slides under the preview bar. The Dialog leaves it unset. */
  maxHeight?: string;
}

export function RepeatBuyerPaywallPanel({
  personaName,
  avatarUrl,
  isOutOfCredits = true,
  tiers,
  coinsPerMinute = COINS_PER_MINUTE,
  onContinue,
  onClose,
  inDialog,
  maxHeight,
}: RepeatBuyerPaywallProps) {
  const firstName = (personaName || "your guide").split(" ")[0];

  // Five packs ascending; the sixth slot is Custom.
  const presetTiers = useMemo(() => [...tiers].sort((a, b) => a.priceUsd - b.priceUsd).slice(0, 5), [tiers]);

  // Pack + custom amount (usePackSelection), identical to the first-timer card: typing
  // switches to the custom amount; tapping the Custom tile only opens the field, and an
  // empty field keeps / restores the chosen pack. Same floor/cap as BuyCreditsModal, at
  // the price per minute of the biggest pack at or below the amount on the full
  // five-pack ladder (quoteCustomAmount). PREVIEW ONLY: the server checkout still
  // charges custom amounts at the flat rate (no bonus), so going live needs the server
  // to grant the bonus with that same function.
  const sel = usePackSelection(presetTiers, coinsPerMinute, onContinue);
  const customInput = sel.customInput;

  // Typed amounts match the pack prices ($60 at 24px), shrinking for long entries
  // ("200.00") so they never spill out of a phone-width tile.
  const customFontClass =
    customInput.length <= 4 ? "text-[24px]" : customInput.length <= 6 ? "text-[17px]" : "text-[13px]";

  return (
    // Phones: square bottom corners, docked to the screen edge like the first-timer sheet.
    <div className="relative overflow-hidden rounded-2xl shadow-2xl max-sm:rounded-b-none">
      {/* Cosmic backdrop (our theme, not Keen green) — as BuyCreditsModal */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f1628] via-[#162040] to-[#1a2550]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-purple-900/30 to-transparent" />

      {/* Close — the same 28px circle in the same spot as BuyCreditsModal, inside a
          40px tap area. */}
      <button
        onClick={() => onClose("x")}
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
      <div
        style={maxHeight ? { maxHeight } : undefined}
        className="relative z-10 max-h-[88vh] overflow-y-auto px-6 pb-6 pt-7 max-sm:max-h-[calc(100dvh-40px)] [@media(max-height:620px)]:pb-4 [@media(max-height:620px)]:pt-4"
      >
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
          <DialogTitleIf on={inDialog}>
            <h2 className="font-serif text-2xl font-bold leading-tight text-white [@media(max-height:620px)]:text-[22px]">
              {isOutOfCredits ? "Continue Your Chat" : "More time together"}
            </h2>
          </DialogTitleIf>
          <p className="mt-1.5 text-[13px] text-white/60 [@media(max-height:620px)]:mt-1">{firstName} will wait for you</p>
        </div>

        {/* Add-minutes label (the Dialog's description) */}
        <DialogDescriptionIf on={inDialog}>
          <p className="mb-3.5 text-[13px] font-medium text-white/70 [@media(max-height:620px)]:mb-3 [@media(max-height:620px)]:leading-snug">
            Add minutes to keep chatting.
            <span className="ml-1 font-normal text-white/45">Your balance works with every guide.</span>
          </p>
        </DialogDescriptionIf>

        {/* Packs — 3×2: $10 / $20 / $30, then $50 / $100 / Custom. The row gap is
            wider than the column gap so the bottom row's badge never touches the
            tiles above it, nor the tick on a selected tile above. */}
        <div className="mb-3 grid grid-cols-3 gap-x-2 gap-y-5 [@media(max-height:620px)]:mb-2.5">
          {presetTiers.map((tier) => (
            <BonusPackTile
              key={tier.packageType}
              tier={tier}
              selected={!sel.customMode && sel.selectedPackage === tier.packageType}
              onSelect={() => sel.pickPack(tier.packageType)}
            />
          ))}

          {/* Custom — the sixth tile. Same three rows: amount, FREE pill, minutes. A
              <label> like the first-timer's custom row: a tap anywhere on the tile only
              opens the field. It looks selected only once an amount is typed (focused
              and empty = a lighter border; the chosen pack stays selected). */}
          <label
            className={`${TILE_BOX_CLASS} block cursor-text ${tileFrameClass(sel.customMode, !!sel.customError)} ${
              sel.customMode ? "" : "focus-within:border-white/35"
            }`}
          >
            {sel.customValid && <SelectedCheck />}
            <div className={`flex h-[24px] items-center justify-center font-bold leading-none text-white ${customFontClass}`}>
              {customInput !== "" && <span>$</span>}
              <input
                {...sel.inputProps}
                aria-label="Custom amount in dollars"
                placeholder="Custom"
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
              {sel.showQuote && sel.quote.freeMinutesShown > 0 ? (
                <FreeMinutesPill minutes={sel.quote.freeMinutesShown} />
              ) : null}
            </div>
            <div className={TILE_TOTAL_ROW_CLASS}>
              {sel.showQuote
                ? minutesLabel(sel.quote.totalMinutesShown, sel.quote.freeMinutesShown)
                : <span className="text-white/40">${sel.floorUsd}–${CUSTOM_TOPUP_MAX_USD}</span>}
            </div>
          </label>
        </div>

        {/* Custom validation hint: every state that greys out Continue says why. */}
        {sel.customError && (
          <p id={sel.errorId} className="mb-2 text-center text-[11px] text-rose-300/90">
            {sel.customError}
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
            onClick={() => onClose("button")}
            className="rounded-2xl border-2 border-white/15 py-3 text-center text-[14px] font-semibold text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            {isOutOfCredits ? "End Chat" : "Maybe later"}
          </button>
          <button
            onClick={sel.handleContinue}
            disabled={!sel.canContinue}
            className="rounded-2xl bg-gradient-to-r from-teal-400 to-emerald-500 py-3 text-center text-[14px] font-semibold text-[#0f1628] shadow-lg shadow-emerald-500/20 transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

/** The panel inside the same Dialog + phone bottom-sheet as BuyCreditsModal.
 *  It closes itself: ✕, End Chat / Maybe later, Esc and a tap outside all call
 *  onClose (saying which) and then onOpenChange(false). */
export default function RepeatBuyerPaywall({
  open,
  onOpenChange,
  ...props
}: Omit<RepeatBuyerPaywallProps, "inDialog" | "maxHeight"> & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const close = (via: RepeatCloseVia) => {
    props.onClose(via);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close("dismiss"))}>
      <DialogContent
        // Focus the sheet itself: no focus ring on the ✕ at open (see focusDialogItself).
        onOpenAutoFocus={focusDialogItself}
        className={`sm:max-w-md p-0 bg-transparent border-0 shadow-none focus:outline-none [&>button:last-child]:hidden ${PAYMENT_DIALOG_MOBILE_SHEET}`}
      >
        <RepeatBuyerPaywallPanel {...props} onClose={close} inDialog />
      </DialogContent>
    </Dialog>
  );
}
