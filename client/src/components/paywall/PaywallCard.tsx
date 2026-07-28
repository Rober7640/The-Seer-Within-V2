// PaywallCard — the redesigned in-chat paywall (Wireframe B, the HERO).
// Presentational only: it renders the minutes-led tiles, the value ladder, the
// branded primary CTA and the trust block. Payment rails live downstream (the
// CTA calls onCheckout, which the host wires to the payment sheet).
//
// Reused both inside the production Dialog wrapper and directly on the
// /paywall-preview design route, so it takes everything via props.

import { Check, Shield } from "lucide-react";
import { COINS_PER_MINUTE, type PricingTier } from "@shared/types";
import {
  paywallCopy,
  toTierView,
  lowestPerMinuteLabel,
  type PaywallVariant,
} from "./paywallCopy";

interface PaywallCardProps {
  personaName: string;
  avatarUrl?: string;
  tiers: PricingTier[];
  selectedPackage: string;
  onSelect: (packageType: string) => void;
  isOutOfCredits?: boolean;
  /** Low-balance (not yet zero) shows the soft "keep my place saved" decline. */
  showDecline?: boolean;
  onCheckout: () => void;
  onDecline?: () => void;
  onClose?: () => void;
  variant?: PaywallVariant;
  /** The guide's cents-per-minute rate; drives all minutes / per-minute math. */
  coinsPerMinute?: number;
}

export default function PaywallCard({
  personaName,
  avatarUrl,
  tiers,
  selectedPackage,
  onSelect,
  isOutOfCredits = true,
  showDecline = false,
  onCheckout,
  onDecline,
  onClose,
  variant = "B",
  coinsPerMinute = COINS_PER_MINUTE,
}: PaywallCardProps) {
  const copy = paywallCopy(variant);
  const selected = tiers.find((t) => t.packageType === selectedPackage) ?? tiers[0];
  const selectedView = selected ? toTierView(selected, coinsPerMinute) : null;
  const firstName = personaName.split(" ")[0] || personaName;

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/50">
      {/* Cosmic backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0e1426] via-[#141d3a] to-[#1a2348]" />
      <div className="absolute inset-x-0 -top-24 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(168,85,247,0.30),_transparent_70%)]" />
      <div className="absolute inset-x-0 -top-10 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.10),_transparent_70%)]" />

      {/* Close */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <div className="relative z-10 max-h-[88vh] overflow-y-auto px-5 pb-4 pt-5 sm:px-7">
        {/* Avatar + header */}
        <div className="mb-3 text-center">
          <div className="mx-auto mb-2 h-12 w-12 rounded-full p-[2px] ring-1 ring-amber-200/40 shadow-[0_0_24px_rgba(251,191,36,0.25)]">
            <img
              src={avatarUrl || "/evelyn-avatar.png"}
              alt={personaName}
              className="h-full w-full rounded-full object-cover"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.endsWith("/evelyn-avatar.png")) img.src = "/evelyn-avatar.png";
              }}
            />
          </div>
          <h2 className="font-serif text-2xl font-bold leading-tight text-white sm:text-[27px]">
            {isOutOfCredits ? copy.modal.headerOutOfCredits : copy.modal.headerLow(firstName)}
          </h2>
          <p className="mx-auto mt-1.5 max-w-[20rem] text-[13px] leading-snug text-white/65">
            {copy.modal.subhead(firstName)}
          </p>
        </div>

        {/* Tiles 2×2 */}
        <div className="mb-3 grid grid-cols-2 gap-x-2.5 gap-y-3.5 sm:gap-x-3">
          {tiers.map((tier) => {
            const v = toTierView(tier, coinsPerMinute);
            const isSelected = selectedPackage === tier.packageType;
            return (
              <button
                key={tier.packageType}
                onClick={() => onSelect(tier.packageType)}
                className={`relative rounded-2xl border-2 px-2.5 pb-2.5 pt-3 text-center transition-all duration-150 ${
                  isSelected
                    ? "border-amber-300/80 bg-amber-300/10 shadow-lg shadow-amber-500/10"
                    : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]"
                }`}
              >
                {tier.badge && (
                  <div
                    className={`absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide shadow-lg ${
                      isSelected
                        ? "bg-gradient-to-r from-amber-300 to-amber-400 text-[#1a1530]"
                        : "bg-gradient-to-r from-amber-400/90 to-orange-400/90 text-[#1a1530]"
                    }`}
                  >
                    {tier.badge}
                  </div>
                )}
                {isSelected && (
                  <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-300 shadow">
                    <Check className="h-3 w-3 text-[#1a1530]" strokeWidth={3} />
                  </div>
                )}

                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-[24px] font-bold leading-none text-white">{v.minutes}</span>
                  <span className="text-sm font-medium text-white/55">min</span>
                </div>
                <div className="mt-1.5 flex items-center justify-center gap-1.5">
                  <span className="text-[15px] font-semibold text-white/90">{v.priceLabel}</span>
                  {v.bonusMinutes > 0 && (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-emerald-300">
                      +{v.bonusMinutes} free
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Value ladder — one line */}
        <p className="mb-2.5 text-center text-[12px] leading-snug text-white/50">
          {copy.modal.ladder(lowestPerMinuteLabel(tiers, coinsPerMinute))}
        </p>

        {/* Selection summary */}
        {selectedView && (
          <p className="mb-2 text-center text-[12px] font-medium text-amber-200/80">
            {copy.modal.commit(selectedView.minutes)}
          </p>
        )}

        {/* Primary CTA */}
        <button
          onClick={onCheckout}
          className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 py-3 text-center font-semibold text-[#1a1530] shadow-lg shadow-amber-500/25 transition-transform active:scale-[0.99]"
        >
          <span className="text-[15px]">
            {selectedView ? copy.modal.cta(firstName, selectedView.priceLabel) : `Keep going with ${firstName}`}
          </span>
        </button>

        {/* Rail reassurance */}
        <p className="mt-2 text-center text-[11px] font-medium tracking-wide text-white/45">
          {copy.modal.railHint}
        </p>

        {/* Decline (low-balance only) */}
        {showDecline && (
          <button
            onClick={onDecline}
            className="mx-auto mt-3 block text-[12px] text-white/45 underline-offset-2 transition-colors hover:text-white/70 hover:underline"
          >
            {copy.modal.decline}
          </button>
        )}

        {/* Trust */}
        <div className="mt-3 space-y-1 border-t border-white/[0.07] pt-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/55">
            <Shield className="h-3.5 w-3.5 text-emerald-400/80" />
            <span>{copy.refundLine}</span>
          </div>
          <p className="text-[11px] text-white/40">{copy.noSubscription}</p>
        </div>
      </div>
    </div>
  );
}
