// LongCopyPaywall — the first-timer paywall for the "updated test 1" experiment
// (long copy + bonus-minute packs). PREVIEW ONLY for now: rendered on the dev-only
// /paywall-preview?surface=longcopy route; nothing live imports it yet.
//
// Order is deliberate: the personal part (what the guide still sees), the packs
// and the CTA come first; the reassurance + terms small print and "Not now" sit
// under the CTA. The WHOLE sheet fits on one phone screen with no scrolling, down
// to 360×560 / 375×548 (measured by .preview-shots/measure-fit.mjs). No customer
// review quotes (operator decision) — the header's aggregate rating is the only
// social proof.
//
// Presentational: everything comes in via props. `LongCopyPaywallPanel` is the
// card itself; the default export wraps it in the same Dialog + mobile bottom
// sheet as BuyCreditsModal so integration is a drop-in.

import { useMemo, useState } from "react";
import { Star, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PAYMENT_DIALOG_MOBILE_SHEET } from "@/lib/paymentDialog";
import {
  COINS_PER_MINUTE,
  CUSTOM_PACKAGE_TYPE,
  CUSTOM_TOPUP_MAX_USD,
  type PricingTier,
} from "@shared/types";
import { quoteCustomAmount, type BonusPreviewTier } from "@shared/paywall";
import { BonusPackTile, FreeMinutesPill, minutesLabel } from "./BonusPackTile";

export interface LongCopyPersona {
  name: string;
  avatarUrl?: string;
  /** Average star rating from real client feedback, e.g. 4.7. */
  rating?: number;
  /** Number of real client ratings behind `rating`. */
  ratingCount?: number;
}

export interface LongCopyPaywallProps {
  persona: LongCopyPersona;
  /** The three "What I still see for you" lines, written from HER chat. null = fallback line. */
  stillSee: string[] | null;
  /** Bonus-minute packs; each carries the numbers its tile claims (shared/paywall.ts). */
  tiers: BonusPreviewTier[];
  /** The guide's cents-per-minute rate; drives the custom-amount minutes. */
  coinsPerMinute?: number;
  /** Called with the chosen pack (a preset, or a synthesized custom tier). */
  onContinue: (tier: PricingTier) => void;
  onNotNow: () => void;
}

const FALLBACK_AVATAR = "/evelyn-avatar.png";

export function LongCopyPaywallPanel({
  persona,
  stillSee,
  tiers,
  coinsPerMinute = COINS_PER_MINUTE,
  onContinue,
  onNotNow,
}: LongCopyPaywallProps) {
  const firstName = (persona.name || "your guide").split(" ")[0];

  // The three packs, ascending.
  const presetTiers = useMemo(() => [...tiers].sort((a, b) => a.priceUsd - b.priceUsd).slice(0, 3), [tiers]);
  const defaultPackage =
    presetTiers.find((t) => t.recommended)?.packageType ??
    presetTiers[1]?.packageType ??
    presetTiers[0]?.packageType ??
    "";

  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [selectedPackage, setSelectedPackage] = useState(defaultPackage);
  const [customInput, setCustomInput] = useState("");

  // --- Custom amount: same floor/cap rules as BuyCreditsModal (floor = cheapest pack,
  // cap = platform max). It also gets the free minutes of the largest pack at or below
  // it (quoteCustomAmount). PREVIEW ONLY: the server charges custom amounts at the flat
  // rate today, so going live needs a server change to grant that bonus.
  const floorCents = presetTiers.length ? presetTiers[0].priceUsd : 1000;
  const floorUsd = Math.round(floorCents / 100);
  const customDollars = parseFloat(customInput);
  const customCents = Number.isFinite(customDollars) ? Math.round(customDollars * 100) : 0;
  const customQuote = quoteCustomAmount(customCents, presetTiers, coinsPerMinute);
  const customTooLow = customInput.trim() !== "" && customCents > 0 && customCents < floorCents;
  const customTooHigh = customCents > CUSTOM_TOPUP_MAX_USD * 100;
  const customValid = mode === "custom" && customCents >= floorCents && !customTooHigh;
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

  const lines = (stillSee ?? []).map((l) => l.trim()).filter(Boolean).slice(0, 3);
  const showRating = typeof persona.rating === "number" && (persona.ratingCount ?? 0) > 0;

  // Phone height tiers (Tailwind arbitrary variants; the ranges never overlap, so no
  // class order games): tall > 700px · compact 621–700px · tight ≤ 620px. The whole
  // sheet must fit with NO scrolling on every phone down to 360×560 / 375×548 (the
  // visible area under Safari/Chrome bars). Readability floor: still-see lines 14px,
  // small print 11px, buy button 48px tall, every other tap target 40px tall.
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-2xl max-sm:rounded-b-none">
      {/* Cosmic backdrop — same family as BuyCreditsModal */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f1628] via-[#162040] to-[#1a2550]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-purple-900/35 to-transparent" />

      {/* Phones: as tall as the visible screen allows (dvh tracks the browser bars),
          minus a 40px strip so the chat still shows above the sheet. Browsers without
          dvh keep 88vh. Measured: no scrolling down to 360×560 / 375×548 with up to two
          still-see lines wrapping; if all three wrap, ≤ 14px scrolls there. */}
      <div className="relative z-10 max-h-[88vh] overflow-y-auto px-5 pb-2 max-sm:max-h-[calc(100dvh-40px)] [@media(max-height:620px)]:px-4 [@media(max-height:620px)]:pb-0">
        {/* Guide + real rating — a sticky top bar that owns the close button, so the ✕
            never floats over scrolled text. Its fill matches the sheet's top gradient. */}
        <div className="sticky top-0 z-20 -mx-5 flex items-center gap-3 bg-gradient-to-b from-[#28164a] to-[#201840] px-5 pb-2 pt-5 [@media(min-height:621px)_and_(max-height:700px)]:pb-1.5 [@media(min-height:621px)_and_(max-height:700px)]:pt-4 [@media(max-height:620px)]:-mx-4 [@media(max-height:620px)]:gap-2.5 [@media(max-height:620px)]:px-4 [@media(max-height:620px)]:pb-1 [@media(max-height:620px)]:pt-2.5">
          <div className="h-11 w-11 shrink-0 rounded-full p-[2px] ring-1 ring-amber-200/40 shadow-[0_0_20px_rgba(251,191,36,0.22)] [@media(min-height:621px)_and_(max-height:700px)]:h-10 [@media(min-height:621px)_and_(max-height:700px)]:w-10 [@media(max-height:620px)]:h-8 [@media(max-height:620px)]:w-8">
            <img
              src={persona.avatarUrl || FALLBACK_AVATAR}
              alt={persona.name}
              className="h-full w-full rounded-full object-cover"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.endsWith(FALLBACK_AVATAR)) img.src = FALLBACK_AVATAR;
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-[16px] font-bold leading-tight text-white [@media(max-height:620px)]:text-[15px]">{persona.name}</p>
            {showRating && (
              <p className="mt-0.5 flex items-center gap-1 text-[12px] text-white/60 [@media(max-height:620px)]:mt-0 [@media(max-height:620px)]:text-[11px] [@media(max-height:620px)]:leading-tight">
                <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                <span className="font-semibold text-white/85">{persona.rating!.toFixed(1)}</span>
                <span>· {persona.ratingCount!.toLocaleString("en-US")} client ratings</span>
              </p>
            )}
          </div>
          {/* Close = the same decision as "Not now". A 40px tap area around the same
              28px circle; the negative margin keeps it from making the bar taller. */}
          <button
            onClick={onNotNow}
            aria-label="Close"
            className="group -m-1.5 flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-full focus-visible:outline-none"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/60 transition-all group-hover:bg-white/20 group-hover:text-white group-focus-visible:ring-2 group-focus-visible:ring-white/60">
              <X className="h-4 w-4" />
            </span>
          </button>
        </div>

        {/* Headline */}
        <h2 className="mt-2 font-serif text-[22px] font-bold leading-[1.2] text-white [@media(min-height:621px)_and_(max-height:700px)]:mt-1.5 [@media(min-height:621px)_and_(max-height:700px)]:text-[20px] [@media(max-height:620px)]:mt-0.5 [@media(max-height:620px)]:text-[18px] [@media(max-height:620px)]:leading-[1.15]">
          Your free minutes are up, but your reading isn't.
        </h2>

        {/* What the guide still sees — HER reading, not minutes. Lines stay 14px on
            every phone; a long line may wrap to two rows. */}
        <div className="mt-3.5 rounded-2xl border border-amber-200/15 bg-white/[0.04] px-4 py-3 [@media(min-height:621px)_and_(max-height:700px)]:mt-2.5 [@media(min-height:621px)_and_(max-height:700px)]:px-3.5 [@media(min-height:621px)_and_(max-height:700px)]:py-2.5 [@media(max-height:620px)]:mt-2 [@media(max-height:620px)]:px-3 [@media(max-height:620px)]:py-1.5">
          {lines.length > 0 ? (
            <>
              <p className="text-[13px] font-semibold leading-snug text-amber-200/90">What I still see for you:</p>
              <ul className="mt-2 space-y-1.5 [@media(min-height:621px)_and_(max-height:700px)]:mt-1.5 [@media(min-height:621px)_and_(max-height:700px)]:space-y-1 [@media(max-height:620px)]:mt-1 [@media(max-height:620px)]:space-y-0.5">
                {lines.map((line, i) => (
                  <li key={i} className="flex gap-2 text-[14px] leading-snug text-white/90 [@media(max-height:620px)]:gap-1.5 [@media(max-height:620px)]:leading-[1.3]">
                    <span aria-hidden className="shrink-0 text-amber-300">➤</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[14px] leading-snug text-white/90">
              {firstName} has more to tell you about your question.
            </p>
          )}
        </div>

        {/* Packs — price big, the FREE minutes as the eye-catcher, whole-minute total small.
            Bonus minutes grow faster than the price. The top gap leaves room for the badges. */}
        <div className="mt-5 grid grid-cols-3 gap-2 [@media(min-height:621px)_and_(max-height:700px)]:mt-4 [@media(max-height:620px)]:mt-3">
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
        </div>

        {/* Custom amount (compact) — ~20% of revenue, so it stays. A <label>, so a tap
            anywhere on the row (≥ 40px tall) focuses the field. */}
        <label
          className={`mt-2.5 flex min-h-11 cursor-text items-center justify-between gap-3 rounded-xl border px-3 transition-colors [@media(max-height:620px)]:mt-2 [@media(max-height:620px)]:min-h-10 ${
            mode === "custom"
              ? customTooLow || customTooHigh
                ? "border-rose-400/60 bg-rose-400/[0.06]"
                : "border-teal-400 bg-teal-400/10"
              : "border-white/10 bg-white/[0.03]"
          }`}
        >
          <span className="flex flex-1 items-center gap-1.5">
            <span className="text-[15px] font-semibold text-white/60">$</span>
            <input
              type="text"
              inputMode="decimal"
              aria-label="Other amount in dollars"
              placeholder="Other amount"
              value={customInput}
              onFocus={() => setMode("custom")}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, "");
                const parts = raw.split(".");
                const clean = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : raw;
                setMode("custom");
                setCustomInput(clean);
              }}
              className="w-full bg-transparent py-2 text-[14px] text-white placeholder:text-white/40 focus:outline-none"
            />
          </span>
          {customCents > 0 && !customTooHigh ? (
            <span className="flex shrink-0 items-center gap-1.5">
              {customQuote.freeMinutesShown > 0 && <FreeMinutesPill minutes={customQuote.freeMinutesShown} />}
              <span className="text-[12px] font-medium text-white/60">
                {minutesLabel(customQuote.totalMinutesShown, customQuote.freeMinutesShown)}
              </span>
            </span>
          ) : (
            <span className="shrink-0 text-[12px] font-medium text-white/40">0 min</span>
          )}
        </label>
        {mode === "custom" && (customTooLow || customTooHigh) && (
          <p className="mt-1.5 text-center text-[11px] text-rose-300/90">
            {customTooHigh ? `Maximum top-up is $${CUSTOM_TOPUP_MAX_USD}.` : `Minimum top-up is $${floorUsd}.`}
          </p>
        )}

        {/* CTA — never under 48px tall */}
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="mt-3.5 flex min-h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-teal-400 to-emerald-500 py-3.5 text-center text-[15px] font-bold text-[#0f1628] shadow-lg shadow-emerald-500/20 transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 [@media(min-height:621px)_and_(max-height:700px)]:mt-3 [@media(max-height:620px)]:mt-2 [@media(max-height:620px)]:py-3"
        >
          Continue my reading
        </button>

        {/* Reassurance + terms, merged into two rows of small print (was three ✓ lines
            + a terms line). Each row fits one line at 11px on a 360px phone. The refund
            promise lives in the "30-day Refund Policy" link (/refund: "30-day goodwill
            refund on unused purchased minutes"). */}
        <div className="mt-3 space-y-0.5 text-center text-[11px] leading-[1.35] text-white/50 [@media(min-height:621px)_and_(max-height:700px)]:mt-2.5 [@media(max-height:620px)]:mt-1.5 [@media(max-height:620px)]:space-y-0">
          <p>One-time payment · No subscription · Works with every guide</p>
          <p>
            By continuing you agree to our{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white/80">
              Terms
            </a>{" "}
            &amp;{" "}
            <a href="/refund" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white/80">
              30-day Refund Policy
            </a>
            .
          </p>
        </div>

        {/* Not now — a small text link with a full 40px tap area */}
        <button
          onClick={onNotNow}
          className="mx-auto mt-1 flex h-10 items-center px-5 text-[13px] font-medium text-white/60 underline decoration-white/30 underline-offset-[3px] transition-colors hover:text-white/85 [@media(max-height:620px)]:mt-0"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

/** The panel inside the same Dialog + phone bottom-sheet as BuyCreditsModal. */
export default function LongCopyPaywall({
  open,
  onOpenChange,
  ...props
}: LongCopyPaywallProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Don't land focus (and its ring) on the close button when the sheet opens.
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={`sm:max-w-md p-0 bg-transparent border-0 shadow-none [&>button:last-child]:hidden ${PAYMENT_DIALOG_MOBILE_SHEET}`}
      >
        <LongCopyPaywallPanel {...props} />
      </DialogContent>
    </Dialog>
  );
}
