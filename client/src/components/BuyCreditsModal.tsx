import { useState, useEffect } from "react";
import { useAuth, authFetch } from "@/hooks/useAuth";
import { X, Coins } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import type { PricingTier } from "@shared/types";
import PayPalCreditButton from "@/components/PayPalCreditButton";
import StripeCardForm from "@/components/StripeCardForm";

interface BuyCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personaId: string | null;
  personaName?: string;
  pricingTiers?: PricingTier[];
  onSuccess?: (newBalance: number) => void;
}

const FALLBACK_TIERS: PricingTier[] = [
  { packageType: "starter", coins: 180, bonusCoins: 0, totalCoins: 180, priceUsd: 999, label: "180 coins" },
  { packageType: "popular", coins: 360, bonusCoins: 180, totalCoins: 540, priceUsd: 1999, label: "540 coins" },
  { packageType: "best_value", coins: 540, bonusCoins: 360, totalCoins: 900, priceUsd: 2999, label: "900 coins", badge: "MOST POPULAR" },
  { packageType: "premium", coins: 720, bonusCoins: 1080, totalCoins: 1800, priceUsd: 3999, label: "1800 coins" },
];

export default function BuyCreditsModal({
  open,
  onOpenChange,
  personaId,
  personaName,
  pricingTiers,
  onSuccess,
}: BuyCreditsModalProps) {
  const { refreshUser } = useAuth();
  const tiers = pricingTiers && pricingTiers.length > 0 ? pricingTiers : FALLBACK_TIERS;
  const [selectedPackage, setSelectedPackage] = useState<string>(
    () => tiers.find((t) => t.badge)?.packageType ?? tiers[0]?.packageType ?? "popular",
  );
  // Log checkout view when modal opens
  useEffect(() => {
    if (open) {
      authFetch("/api/credits/checkout-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageType: selectedPackage, personaId, source: "buy_credits_modal" }),
      }).catch(() => {});
    }
  }, [open]);

  const handleSuccess = (newBalance: number) => {
    onOpenChange(false);
    onSuccess?.(newBalance);
    refreshUser();
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 bg-transparent border-0 shadow-none [&>button:last-child]:hidden">
        <div className="relative rounded-2xl overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f1628] via-[#162040] to-[#1a2550]" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-purple-900/30 to-transparent" />

          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative z-10 px-6 pt-8 pb-6 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white font-serif mb-2">
                Your Credits Have Run Out
              </h2>
              <p className="text-white/60 text-sm">
                Add more coins to continue your journey with {personaName || "your advisor"}
              </p>
            </div>

            {/* Pricing Grid - 2x2 */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {tiers.map((tier) => {
                const isSelected = selectedPackage === tier.packageType;
                const hasBadge = !!tier.badge;

                return (
                  <button
                    key={tier.packageType}
                    onClick={() => setSelectedPackage(tier.packageType)}
                    className={`relative rounded-xl p-4 text-center transition-all duration-200 border-2 ${
                      isSelected
                        ? "border-teal-400 bg-teal-900/20 shadow-lg shadow-teal-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/8"
                    }`}
                  >
                    {/* Selection checkmark */}
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-teal-400 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-[#0f1628]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {/* Badge (Most Popular) */}
                    {hasBadge && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-[10px] font-bold text-white whitespace-nowrap shadow-lg">
                        {tier.badge}
                      </div>
                    )}

                    {/* Coins — primary display */}
                    <div className="flex items-center justify-center gap-1 mb-0.5 mt-1">
                      <span className="text-2xl font-bold text-white">
                        {tier.totalCoins}
                      </span>
                      <Coins className="w-5 h-5 text-amber-400" />
                    </div>

                    {/* Bonus coins badge */}
                    {tier.bonusCoins > 0 && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-500/30 mb-2">
                        <span className="text-[11px] font-medium text-teal-300">
                          +{tier.bonusCoins} <Coins className="w-3 h-3 inline" /> free
                        </span>
                      </div>
                    )}

                    {/* Price */}
                    <div className="text-lg font-semibold text-white/90 mt-1">
                      {formatPrice(tier.priceUsd)}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Coin rate info */}
            <div className="flex justify-center mb-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.07] border border-white/10">
                <span className="text-xs text-white/70">Billed per minute · rate varies by guide</span>
              </div>
            </div>

            {/* PayPal primary */}
            <div className="mb-3">
              <PayPalCreditButton
                packageType={selectedPackage}
                personaId={personaId}
                onSuccess={handleSuccess}
              />
            </div>

            {/* Stripe inline card */}
            <StripeCardForm
              packageType={selectedPackage}
              personaId={personaId}
              amount={tiers.find(t => t.packageType === selectedPackage)?.priceUsd ?? 999}
              priceLabel={formatPrice(tiers.find(t => t.packageType === selectedPackage)?.priceUsd ?? 999)}
              onSuccess={handleSuccess}
            />

            <p className="text-xs text-white/50 text-center mt-3">
              One-time payment is non-refundable.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
