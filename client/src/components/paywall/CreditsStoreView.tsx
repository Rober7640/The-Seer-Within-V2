// CreditsStoreView — the full-scroll credits/store page (dollar-wallet model).
//
// The wallet is NEUTRAL MONEY: balance and packs are shown in dollars, with a
// "works with every guide" line, so nothing reads as locked to one guide. Minutes
// live in ONE per-guide grid ("What your balance buys"), each guide at its own
// $/min rate; tapping a pack previews the projected new time for every guide.

import { useState } from "react";
import { Shield, Lock, Star } from "lucide-react";
import type { PricingTier } from "@shared/types";
import {
  CUSTOM_TOPUP_MAX_USD,
  CUSTOM_PACKAGE_TYPE,
  usdCentsToCoins,
  coinsToClock,
  COINS_PER_MINUTE,
} from "@shared/types";
import {
  paywallCopy,
  toTierView,
  type PaywallVariant,
} from "./paywallCopy";

/** A guide + its per-minute rate, for the "what your balance buys" grid. */
export interface GuideRate {
  id: string;
  name: string;
  avatarUrl?: string | null;
  coinsPerMinute: number;
  isCurrent?: boolean;
}

interface CreditsStoreViewProps {
  personaName: string;
  avatarUrl?: string;
  coinBalance: number;
  tiers: PricingTier[];
  onSelectTier: (tier: PricingTier) => void;
  showRating?: boolean;
  variant?: PaywallVariant;
  /** The current guide's cents-per-minute rate (used for the custom-amount preview). */
  coinsPerMinute?: number;
  /** All guides + rates for the per-guide grid. Omit to hide the grid. */
  guides?: GuideRate[];
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CreditsStoreView({
  personaName,
  avatarUrl,
  coinBalance,
  tiers,
  onSelectTier,
  showRating = false,
  variant = "B",
  coinsPerMinute = COINS_PER_MINUTE,
  guides = [],
}: CreditsStoreViewProps) {
  const copy = paywallCopy(variant);

  // Which pack is being previewed in the grid (tap a tile to preview; the button buys).
  const [preview, setPreview] = useState<PricingTier | null>(null);
  const projectedBalance = preview ? coinBalance + preview.totalCoins : null;

  // Current guide first, then the rest — so "reading now" leads the grid.
  const orderedGuides = [...guides].sort(
    (a, b) => Number(!!b.isCurrent) - Number(!!a.isCurrent),
  );

  // Custom amount — same rate as the packs, floored at the cheapest pack.
  const floorCents = tiers.length ? Math.min(...tiers.map((t) => t.priceUsd)) : 1000;
  const floorUsd = Math.round(floorCents / 100);
  const [customInput, setCustomInput] = useState("");
  const customDollars = parseFloat(customInput);
  const customCents = Number.isFinite(customDollars) ? Math.round(customDollars * 100) : 0;
  const customCoins = customCents > 0 ? usdCentsToCoins(customCents) : 0;
  const customTooLow = customInput.trim() !== "" && customCents > 0 && customCents < floorCents;
  const customTooHigh = customCents > CUSTOM_TOPUP_MAX_USD * 100;
  const customValid = customCents >= floorCents && !customTooHigh;

  const buyCustom = () => {
    if (!customValid) return;
    onSelectTier({
      packageType: CUSTOM_PACKAGE_TYPE,
      coins: customCoins,
      bonusCoins: 0,
      totalCoins: customCoins,
      priceUsd: customCents,
      label: money(customCents),
    });
  };

  return (
    <div className="space-y-5">
      {/* Neutral title — the wallet isn't tied to a guide */}
      <h1 className="font-serif text-xl text-white sm:text-2xl">Add to your balance</h1>

      {/* Balance card — dollars, works with everyone */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a2142] to-[#221b3c] p-5 text-center">
        <div className="absolute inset-x-0 -top-16 h-32 bg-[radial-gradient(ellipse_at_top,_rgba(168,85,247,0.25),_transparent_70%)]" />
        <p className="relative text-[11px] uppercase tracking-[0.18em] text-white/45">Your balance</p>
        <div className="relative mt-1.5 font-serif text-4xl font-bold text-white tabular-nums">
          {money(projectedBalance ?? coinBalance)}
        </div>
        <p className="relative mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-300">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-400/15 text-[10px]">✓</span>
          Works with every guide
        </p>
        {preview && (
          <p className="relative mt-1 text-[12px] text-white/50">
            {money(coinBalance)} + {money(preview.priceUsd)} preview
          </p>
        )}
        <p className="relative mt-2 text-[12px] text-white/45">{copy.store.idleNote}</p>
      </div>

      {/* Per-guide grid — what the balance buys with each guide */}
      {orderedGuides.length > 0 && (
        <div>
          <h3 className="font-serif text-lg text-white">
            {preview ? `What ${money(projectedBalance!)} would buy` : "What your balance buys"}
          </h3>
          <p className="mb-3 mt-0.5 text-[12px] text-white/45">
            The same balance — guides just read at different rates.
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {orderedGuides.map((g) => {
              const now = coinsToClock(coinBalance, g.coinsPerMinute);
              const proj = projectedBalance != null ? coinsToClock(projectedBalance, g.coinsPerMinute) : null;
              const added = preview ? coinsToClock(preview.totalCoins, g.coinsPerMinute) : null;
              return (
                <div
                  key={g.id}
                  // Stable hook for the per-guide grid assertions: the card's text
                  // shape ("Name$X.XX/min0:00min") is ambiguous with its own inner
                  // wrapper and with the grid container, so tests can't scope by text.
                  data-testid={`guide-card-${g.id}`}
                  className={`rounded-2xl border p-3.5 transition-colors ${
                    g.isCurrent ? "border-purple-400/40 bg-purple-400/[0.07]" : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={g.avatarUrl || "/evelyn-avatar.png"}
                      alt={g.name}
                      className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (!img.src.endsWith("/evelyn-avatar.png")) img.src = "/evelyn-avatar.png";
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-white">{g.name}</p>
                      <p className="text-[11px] text-white/45 tabular-nums">${(g.coinsPerMinute / 100).toFixed(2)}/min</p>
                    </div>
                    {g.isCurrent && (
                      <span className="rounded-full border border-purple-400/40 bg-purple-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-purple-200">
                        Reading now
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 flex items-baseline gap-1.5 tabular-nums">
                    {proj ? (
                      <>
                        <span className="text-lg font-bold text-white/40 line-through decoration-white/20">{now}</span>
                        <span className="text-xl font-bold text-emerald-300">{proj}</span>
                        <span className="text-[11px] font-medium text-emerald-300/70">min</span>
                        <span className="ml-auto rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-bold text-emerald-300">+{added} min</span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-white">{now}</span>
                        <span className="text-[12px] font-medium text-white/45">min</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Value prop */}
      <div className="text-center">
        <div className="mb-1 flex items-center justify-center gap-2">
          <span className="h-px w-6 bg-white/15" />
          <h2 className="font-serif text-base text-amber-100/90">One simple wallet</h2>
          <span className="h-px w-6 bg-white/15" />
        </div>
        <p className="mx-auto max-w-md text-[13px] leading-relaxed text-white/55">
          Top up in dollars and spend with any guide. You only pay during a live reading — idle time is free.
        </p>
      </div>

      {/* Packs — dollar-led; tap a tile to preview, the button buys */}
      <h3 className="font-serif text-lg text-white">Choose an amount</h3>
      <div className="space-y-2.5">
        {tiers.map((tier) => {
          const v = toTierView(tier, coinsPerMinute);
          const featured = !!tier.badge;
          const isPreview = preview?.packageType === tier.packageType;
          return (
            <div
              key={tier.packageType}
              role="button"
              tabIndex={0}
              aria-pressed={isPreview}
              onClick={() => setPreview(isPreview ? null : tier)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPreview(isPreview ? null : tier); } }}
              className={`relative block w-full cursor-pointer rounded-2xl border p-4 text-left transition-colors ${
                isPreview
                  ? "border-purple-400 bg-purple-400/[0.08] ring-1 ring-purple-400/60"
                  : featured
                    ? "border-amber-300/40 bg-amber-300/[0.06]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-2.5 left-4 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#1a1530] shadow">
                  {tier.badge}
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-2xl font-bold text-white tabular-nums">{v.priceLabel}</div>
                  <p className="mt-0.5 text-[12px] text-white/40">
                    {isPreview ? "Previewing above ✦" : "Drops into your wallet · tap to preview"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSelectTier(tier); }}
                  className={`shrink-0 rounded-xl px-4 py-2 text-[13px] font-semibold transition-transform active:scale-95 ${
                    featured
                      ? "bg-gradient-to-r from-amber-300 to-amber-400 text-[#1a1530] shadow shadow-amber-500/20"
                      : "bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  {copy.store.tierCta}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom amount */}
      <div
        className={`rounded-2xl border p-4 transition-colors ${
          customTooLow || customTooHigh ? "border-rose-400/50 bg-rose-400/[0.05]" : "border-white/10 bg-white/[0.03]"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-[12px] font-medium text-white/55">Or choose your own amount</p>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-semibold text-white/70">$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Custom Amount"
                value={customInput}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, "");
                  const parts = raw.split(".");
                  setCustomInput(parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : raw);
                }}
                className="w-full max-w-[8rem] bg-transparent text-[16px] text-white placeholder:text-white/40 focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={buyCustom}
            disabled={!customValid}
            className="shrink-0 rounded-xl bg-white/10 px-4 py-2 text-[13px] font-semibold text-white transition-transform hover:bg-white/15 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Buy
          </button>
        </div>
        {(customTooLow || customTooHigh) && (
          <p className="mt-2 text-[11px] text-rose-300/90">
            {customTooHigh ? `Maximum top-up is $${CUSTOM_TOPUP_MAX_USD}.` : `Minimum top-up is $${floorUsd}.`}
          </p>
        )}
      </div>

      {/* Rate line */}
      <p className="text-center text-[12px] text-white/45">One flat rate per guide — no subscription, no auto-renew.</p>

      {/* Trust block */}
      <div className="space-y-2 border-t border-white/[0.07] pt-4 text-center text-[12px] text-white/50">
        <div className="flex items-center justify-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-emerald-400/80" />
          <span>{copy.refundLine}</span>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-white/40" />
          <span>{copy.trustLine} · private &amp; confidential.</span>
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
