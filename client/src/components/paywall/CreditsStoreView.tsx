// CreditsStoreView — Wireframe C, the full-scroll credits/store page.
// Minutes-led, no phone anchor. Presentational: balance, value prop, the tier
// list (one "Keep going" CTA per tier → host opens the payment sheet), rate
// line and a consistent trust block.

import { Shield, Lock, Star } from "lucide-react";
import type { PricingTier } from "@shared/types";
import { COINS_PER_MINUTE } from "@shared/types";
import {
  paywallCopy,
  toTierView,
  lowestPerMinuteLabel,
  type PaywallVariant,
} from "./paywallCopy";

interface CreditsStoreViewProps {
  personaName: string;
  avatarUrl?: string;
  coinBalance: number;
  tiers: PricingTier[];
  onSelectTier: (tier: PricingTier) => void;
  showRating?: boolean;
  variant?: PaywallVariant;
}

export default function CreditsStoreView({
  personaName,
  avatarUrl,
  coinBalance,
  tiers,
  onSelectTier,
  showRating = false,
  variant = "B",
}: CreditsStoreViewProps) {
  const copy = paywallCopy(variant);
  const firstName = personaName.split(" ")[0] || personaName;
  const balanceMinutes = Math.floor(coinBalance / COINS_PER_MINUTE);

  return (
    <div className="space-y-5">
      {/* Title row */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full p-[1.5px] ring-1 ring-amber-200/40">
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
        <h1 className="font-serif text-xl text-white sm:text-2xl">{copy.store.title(firstName)}</h1>
      </div>

      {/* Balance card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a2142] to-[#221b3c] p-5 text-center">
        <div className="absolute inset-x-0 -top-16 h-32 bg-[radial-gradient(ellipse_at_top,_rgba(168,85,247,0.25),_transparent_70%)]" />
        <p className="relative text-[11px] uppercase tracking-[0.18em] text-white/45">
          {copy.store.balanceLabel}
        </p>
        <div className="relative mt-1.5 flex items-baseline justify-center gap-2">
          <span className="font-serif text-4xl font-bold text-white">{balanceMinutes}</span>
          <span className="text-lg text-white/60">minutes left</span>
        </div>
        <p className="relative mt-0.5 text-xs text-amber-200/70">
          {coinBalance.toLocaleString()} coins
        </p>
        <p className="relative mt-2 text-[12px] text-white/45">{copy.store.idleNote}</p>
      </div>

      {/* Value prop */}
      <div className="text-center">
        <div className="mb-1 flex items-center justify-center gap-2">
          <span className="h-px w-6 bg-white/15" />
          <h2 className="font-serif text-base text-amber-100/90">{copy.store.valueHeader}</h2>
          <span className="h-px w-6 bg-white/15" />
        </div>
        <p className="mx-auto max-w-md text-[13px] leading-relaxed text-white/55">
          {copy.store.valueBody(lowestPerMinuteLabel(tiers))}
        </p>
      </div>

      {/* Section header */}
      <h3 className="font-serif text-lg text-white">{copy.store.sectionHeader(firstName)}</h3>

      {/* Tier list */}
      <div className="space-y-2.5">
        {tiers.map((tier) => {
          const v = toTierView(tier);
          const featured = !!tier.badge;
          return (
            <div
              key={tier.packageType}
              className={`relative rounded-2xl border p-4 transition-colors ${
                featured
                  ? "border-amber-300/40 bg-amber-300/[0.06]"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-2.5 left-4 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#1a1530] shadow">
                  {tier.badge}
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-white">{v.minutes}</span>
                    <span className="text-sm text-white/55">min</span>
                    {v.bonusMinutes > 0 && (
                      <span className="ml-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                        +{v.bonusMinutes} free
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] text-white/40">{v.perMinuteLabel}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-lg font-bold text-white">{v.priceLabel}</span>
                  <button
                    onClick={() => onSelectTier(tier)}
                    className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition-transform active:scale-95 ${
                      featured
                        ? "bg-gradient-to-r from-amber-300 to-amber-400 text-[#1a1530] shadow shadow-amber-500/20"
                        : "bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    {copy.store.tierCta}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rate line */}
      <p className="text-center text-[12px] text-white/45">{copy.store.rateLine}</p>

      {/* Trust block */}
      <div className="space-y-2 border-t border-white/[0.07] pt-4 text-center text-[12px] text-white/50">
        <div className="flex items-center justify-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-emerald-400/80" />
          <span>{copy.refundLine}</span>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-white/40" />
          <span>
            {copy.trustLine} · {copy.noSubscription.replace(/\.$/, "")} · private &amp; confidential.
          </span>
        </div>
        {showRating && (
          <div className="flex items-center justify-center gap-1.5 text-amber-200/70">
            <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
            <span>{copy.ratingLine}</span>
          </div>
        )}
      </div>
    </div>
  );
}
