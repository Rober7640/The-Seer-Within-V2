import { useState, useEffect, useRef } from "react";
import { authFetch } from "@/hooks/useAuth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { PricingTier } from "@shared/types";

interface OutOfCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personaId: string | null;
  personaName?: string;
  personaAvatarUrl?: string | null;
  pricingTiers?: PricingTier[];
  countdownSeconds?: number;
}

const FALLBACK_TIERS: PricingTier[] = [
  { packageType: "starter", coins: 180, bonusCoins: 0, totalCoins: 180, priceUsd: 999, label: "180 coins" },
  { packageType: "popular", coins: 360, bonusCoins: 180, totalCoins: 540, priceUsd: 1999, label: "540 coins" },
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
}: OutOfCreditsModalProps) {
  const [tiers, setTiers] = useState<PricingTier[]>(pricingTiers ?? FALLBACK_TIERS);
  const [timeLeft, setTimeLeft] = useState(countdownSeconds);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pick starter/cheapest tier to highlight
  const featuredTier = tiers.find((t) => t.packageType === "starter") ?? tiers[0];

  // Reset countdown when modal opens
  useEffect(() => {
    if (open) {
      setTimeLeft(countdownSeconds);
    }
  }, [open, countdownSeconds]);

  // Countdown timer
  useEffect(() => {
    if (!open) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          onOpenChange(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open, onOpenChange]);

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

  const handleGetCredits = async () => {
    if (!personaId) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsCheckingOut(true);
    try {
      const packageType = featuredTier?.packageType ?? "starter";
      const res = await authFetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageType, personaId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Fake "original" price is 2x the actual for urgency
  const salePrice = featuredTier ? formatPrice(featuredTier.priceUsd) : "$9.99";
  const originalPrice = featuredTier
    ? formatPrice(featuredTier.priceUsd * 2)
    : "$19.99";
  const coinsLabel = featuredTier
    ? `${featuredTier.totalCoins} credits`
    : "180 credits";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 bg-transparent border-0 shadow-none [&>button]:hidden">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1640] via-[#1e1c50] to-[#1a2060]" />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-purple-800/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-indigo-900/30 to-transparent" />

          <div className="relative z-10 px-6 pt-7 pb-6 text-center">
            {/* Title */}
            <h2 className="text-[22px] font-bold text-white leading-tight mb-1">
              You've run out of credits
            </h2>

            {/* Offer line */}
            {featuredTier && (
              <div className="inline-flex items-center gap-1.5 mt-2 mb-5 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08]">
                <span className="text-[13px] text-white/55">
                  Get credits in 1 click
                </span>
                <span className="text-[13px] font-semibold text-white/50 ml-1">
                  {coinsLabel} for{" "}
                </span>
                <span className="text-[13px] text-white/40 line-through">
                  {originalPrice}
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

            {/* CTA Button */}
            <button
              onClick={handleGetCredits}
              disabled={isCheckingOut}
              className="w-full py-3.5 rounded-xl font-bold text-[15px] text-white shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(90deg, #a855f7 0%, #ec4899 100%)",
                boxShadow: "0 4px 24px rgba(168,85,247,0.35)",
              }}
            >
              {isCheckingOut ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                "Get credits"
              )}
            </button>

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
