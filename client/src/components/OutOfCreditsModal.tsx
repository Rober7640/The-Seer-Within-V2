import { useState, useEffect, useRef } from "react";
import { useAuth, authFetch } from "@/hooks/useAuth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Coins } from "lucide-react";
import type { PricingTier } from "@shared/types";
import PayPalCreditButton from "@/components/PayPalCreditButton";
import StripeCardForm from "@/components/StripeCardForm";

interface OutOfCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personaId: string | null;
  personaName?: string;
  personaAvatarUrl?: string | null;
  pricingTiers?: PricingTier[];
  countdownSeconds?: number;
  onSuccess?: (newBalance: number) => void;
}

const FALLBACK_TIERS: PricingTier[] = [
  { packageType: "popular", coins: 360, bonusCoins: 180, totalCoins: 540, priceUsd: 1999, label: "540 coins" },
  { packageType: "best_value", coins: 540, bonusCoins: 360, totalCoins: 900, priceUsd: 2999, label: "900 coins" },
  { packageType: "premium", coins: 1000, bonusCoins: 800, totalCoins: 1800, priceUsd: 4999, label: "1800 coins", badge: "MOST POPULAR" },
  { packageType: "whale", coins: 2000, bonusCoins: 2500, totalCoins: 4500, priceUsd: 9999, label: "4500 coins" },
];

// Circular countdown SVG ring
function CountdownRing({
  seconds,
  total,
}: {
  seconds: number;
  total: number;
}) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / total;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        {/* Track */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="6"
        />
        {/* Progress */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#ringGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white leading-none tabular-nums">
          {seconds}
        </span>
        <span className="text-xs text-white/50 mt-0.5 tracking-wide">seconds</span>
      </div>
    </div>
  );
}

export default function OutOfCreditsModal({
  open,
  onOpenChange,
  personaId,
  personaName,
  personaAvatarUrl,
  pricingTiers,
  countdownSeconds = 30,
  onSuccess,
}: OutOfCreditsModalProps) {
  const { refreshUser } = useAuth();
  const [tiers, setTiers] = useState<PricingTier[]>(pricingTiers ?? FALLBACK_TIERS);
  const [timeLeft, setTimeLeft] = useState(countdownSeconds);
  const [paypalActive, setPaypalActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  // Log checkout view when modal opens
  useEffect(() => {
    if (open) {
      authFetch("/api/credits/checkout-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageType: featuredTier?.packageType ?? "starter", personaId, source: "out_of_credits" }),
      }).catch(() => {});
    }
  }, [open]);

  const handlePayPalSuccess = (newBalance: number) => {
    setPaypalActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    // Don't call onOpenChange here — let onSuccess handle closing the modal.
    // This way onOpenChange only fires for user dismissals (not payment success).
    onSuccess?.(newBalance);
    refreshUser();
  };

  // Pick starter/cheapest tier to highlight
  const featuredTier = tiers.find((t) => t.packageType === "starter") ?? tiers[0];

  // Reset countdown when modal opens
  useEffect(() => {
    if (open) {
      setTimeLeft(countdownSeconds);
    }
  }, [open, countdownSeconds]);

  // Countdown timer — pauses while PayPal flow is active
  useEffect(() => {
    if (!open || paypalActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          onOpenChangeRef.current(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open, paypalActive]);

  // Fetch pricing if not provided
  useEffect(() => {
    if (!pricingTiers && open && personaId) {
      authFetch(`/api/credits/pricing?personaId=${personaId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.tiers?.length) setTiers(data.tiers);
        })
        .catch(() => {});
    }
  }, [open, personaId, pricingTiers]);

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const salePrice = featuredTier ? formatPrice(featuredTier.priceUsd) : "$9.99";
  const coinsAmount = featuredTier ? featuredTier.totalCoins : 180;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 bg-transparent border-0 shadow-none [&>button]:hidden">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1640] via-[#1e1c50] to-[#1a2060]" />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-purple-800/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-indigo-900/30 to-transparent" />

          <div className="relative z-10 px-6 pt-7 pb-6 text-center max-h-[85vh] overflow-y-auto">
            {/* Title */}
            <h2 className="text-[22px] font-bold text-white leading-tight mb-1">
              You've run out of credits
            </h2>

            {/* Offer line */}
            {featuredTier && (
              <div className="inline-flex items-center gap-1.5 mt-2 mb-5 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08]">
                <span className="text-[13px] text-white/55">
                  Top up
                </span>
                <span className="text-[13px] font-semibold text-white/50 ml-1 inline-flex items-center gap-1">
                  {coinsAmount} <Coins className="w-3.5 h-3.5 text-amber-400" /> for{" "}
                </span>
                <span className="text-[13px] font-bold text-teal-300">
                  {salePrice}
                </span>
              </div>
            )}

            {/* Countdown */}
            <CountdownRing seconds={timeLeft} total={countdownSeconds} />

            {/* Persona waiting message */}
            <p className="mt-4 mb-6 text-[15px] text-white/70 font-medium">
              {personaName ? `${personaName} will wait for you!` : "Your guide will wait for you!"}
            </p>

            {/* PayPal primary */}
            <div className="mb-3">
              <PayPalCreditButton
                packageType={featuredTier?.packageType ?? "starter"}
                personaId={personaId}
                amount={featuredTier?.priceUsd ?? 999}
                onSuccess={handlePayPalSuccess}
                onClick={() => setPaypalActive(true)}
                onCancel={() => setPaypalActive(false)}
              />
            </div>

            {/* Stripe inline card */}
            <StripeCardForm
              packageType={featuredTier?.packageType ?? "starter"}
              personaId={personaId}
              amount={featuredTier?.priceUsd ?? 999}
              priceLabel={salePrice}
              onSuccess={handlePayPalSuccess}
              onClick={() => setPaypalActive(true)}
              onCancel={() => setPaypalActive(false)}
            />

            {/* Dismiss */}
            <button
              onClick={() => onOpenChange(false)}
              className="mt-4 text-[13px] text-white/35 hover:text-white/55 transition-colors"
            >
              I don't want to continue reading
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
