import { useState, useEffect, useMemo } from "react";
import { useAuth, authFetch } from "@/hooks/useAuth";
import { X, Check } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  CUSTOM_TOPUP_MAX_USD,
  CUSTOM_PACKAGE_TYPE,
  usdCentsToCoins,
  coinsToClock,
  COINS_PER_MINUTE,
  type PricingTier,
} from "@shared/types";
import PaymentModal from "@/components/PaymentModal";
import { PAYMENT_DIALOG_MOBILE_SHEET } from "@/lib/paymentDialog";

interface BuyCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personaId: string | null;
  personaName?: string;
  isOutOfCredits?: boolean;
  pricingTiers?: PricingTier[];
  onSuccess?: (newBalance: number) => void;
  avatarUrl?: string;
  /** The guide's cents-per-minute rate; drives all coins→time math in the modal. */
  coinsPerMinute?: number;
}

// Fallback pricing if the server hasn't answered yet. The in-chat popup only
// ever SHOWS the three cheapest packs (Keen-style); the $50 pack still exists
// for the /credits store and is reachable here via the Custom Amount field.
const FALLBACK_TIERS: PricingTier[] = [
  { packageType: "popular", coins: 1000, bonusCoins: 0, totalCoins: 1000, priceUsd: 1000, label: "$10" },
  { packageType: "best_value", coins: 2000, bonusCoins: 0, totalCoins: 2000, priceUsd: 2000, label: "$20" },
  { packageType: "premium", coins: 3000, bonusCoins: 0, totalCoins: 3000, priceUsd: 3000, label: "$30" },
  { packageType: "whale", coins: 5000, bonusCoins: 0, totalCoins: 5000, priceUsd: 5000, label: "$50" },
];

export default function BuyCreditsModal({
  open,
  onOpenChange,
  personaId,
  personaName,
  isOutOfCredits = false,
  pricingTiers,
  onSuccess,
  avatarUrl,
  coinsPerMinute = COINS_PER_MINUTE,
}: BuyCreditsModalProps) {
  const { refreshUser } = useAuth();
  const tiers = pricingTiers && pricingTiers.length > 0 ? pricingTiers : FALLBACK_TIERS;

  // The three cheapest packs, ascending — the Keen-style row of presets.
  const presetTiers = useMemo(
    () => [...tiers].sort((a, b) => a.priceUsd - b.priceUsd).slice(0, 3),
    [tiers],
  );
  // Custom floor = the cheapest pack; the customer can't buy less than that.
  const floorCents = presetTiers.length ? presetTiers[0].priceUsd : 1000;
  const floorUsd = Math.round(floorCents / 100);

  // "preset" = a pack tile is selected; "custom" = the Custom Amount field is active.
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [selectedPackage, setSelectedPackage] = useState<string>(
    () => presetTiers[1]?.packageType ?? presetTiers[0]?.packageType ?? "best_value",
  );
  const [customInput, setCustomInput] = useState("");
  const [payTier, setPayTier] = useState<PricingTier | null>(null);
  const firstName = (personaName || "your guide").split(" ")[0];

  // Reset to a clean state whenever the modal opens.
  useEffect(() => {
    if (open) {
      setMode("preset");
      setSelectedPackage(presetTiers[1]?.packageType ?? presetTiers[0]?.packageType ?? "best_value");
      setCustomInput("");
      setPayTier(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Log checkout view when modal opens
  useEffect(() => {
    if (open) {
      authFetch("/api/credits/checkout-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageType: selectedPackage, personaId, source: "buy_credits_modal", isOutOfCredits }),
      }).catch(() => {});
      if (window.clarity) {
        window.clarity("set", "intent", "purchase");
        window.clarity("event", isOutOfCredits ? "out_of_credits_modal" : "buy_credits_modal");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // --- Custom amount math (all derived from the shared $/min rate) ---
  const customDollars = parseFloat(customInput);
  const customCents = Number.isFinite(customDollars) ? Math.round(customDollars * 100) : 0;
  const customCoins = customCents > 0 ? usdCentsToCoins(customCents) : 0;
  const customClock = coinsToClock(customCoins, coinsPerMinute);
  const customTooLow = customInput.trim() !== "" && customCents > 0 && customCents < floorCents;
  const customTooHigh = customCents > CUSTOM_TOPUP_MAX_USD * 100;
  const customValid = mode === "custom" && customCents >= floorCents && !customTooHigh;

  const canContinue = mode === "preset" ? true : customValid;

  const handleContinue = () => {
    if (mode === "custom") {
      if (!customValid) return;
      setPayTier({
        packageType: CUSTOM_PACKAGE_TYPE,
        coins: customCoins,
        bonusCoins: 0,
        totalCoins: customCoins,
        priceUsd: customCents,
        label: `$${(customCents / 100).toFixed(2)}`,
      });
    } else {
      setPayTier(presetTiers.find((t) => t.packageType === selectedPackage) ?? presetTiers[0] ?? null);
    }
  };

  const handleSuccess = (newBalance: number) => {
    setPayTier(null);
    onOpenChange(false);
    onSuccess?.(newBalance);
    refreshUser();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`sm:max-w-md p-0 bg-transparent border-0 shadow-none [&>button:last-child]:hidden ${PAYMENT_DIALOG_MOBILE_SHEET}`}>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
            {/* Cosmic backdrop (our theme, not Keen green) */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0f1628] via-[#162040] to-[#1a2550]" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-purple-900/30 to-transparent" />

            {/* Close */}
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="absolute top-3 right-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/60 transition-all hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-10 max-h-[88vh] overflow-y-auto px-6 pb-6 pt-7">
              {/* Header */}
              <div className="mb-4 text-center">
                <div className="mx-auto mb-2.5 h-12 w-12 rounded-full p-[2px] ring-1 ring-amber-200/40 shadow-[0_0_24px_rgba(251,191,36,0.25)]">
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
                <h2 className="font-serif text-2xl font-bold leading-tight text-white">
                  {isOutOfCredits ? "Continue Your Chat" : "More time together"}
                </h2>
                <p className="mt-1.5 text-[13px] text-white/60">
                  {firstName} will wait for you
                </p>
              </div>

              {/* Add-minutes label */}
              <p className="mb-3 text-[13px] font-medium text-white/70">
                Add minutes to keep chatting.
                <span className="ml-1 font-normal text-white/45">Your balance works with every guide.</span>
              </p>

              {/* Preset packs — row of 3 */}
              <div className="mb-3 grid grid-cols-3 gap-2.5">
                {presetTiers.map((tier, i) => {
                  const isSelected = mode === "preset" && selectedPackage === tier.packageType;
                  const isPopular = i === 1; // middle pack
                  return (
                    <button
                      key={tier.packageType}
                      onClick={() => {
                        setMode("preset");
                        setSelectedPackage(tier.packageType);
                        setCustomInput("");
                      }}
                      className={`relative rounded-2xl border-2 px-1.5 pb-3 pt-4 text-center transition-all duration-150 ${
                        isSelected
                          ? "border-teal-400 bg-teal-400/10 shadow-lg shadow-teal-500/10"
                          : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]"
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#1a1530] shadow-lg">
                          Popular
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-teal-400 shadow">
                          <Check className="h-3 w-3 text-[#0f1628]" strokeWidth={3} />
                        </div>
                      )}
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="text-xl font-bold leading-none text-white">
                          {coinsToClock(tier.totalCoins, coinsPerMinute)}
                        </span>
                      </div>
                      <div className="mt-1.5 text-[13px] font-semibold text-white/90">
                        ${(tier.priceUsd / 100).toFixed(0)}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom amount */}
              <div
                className={`mb-2 rounded-2xl border-2 px-3.5 py-3 transition-colors ${
                  mode === "custom"
                    ? customTooLow || customTooHigh
                      ? "border-rose-400/60 bg-rose-400/[0.06]"
                      : "border-teal-400 bg-teal-400/10"
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-1 items-center gap-1.5">
                    <span className="text-lg font-semibold text-white/70">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Custom Amount"
                      value={customInput}
                      onFocus={() => setMode("custom")}
                      onChange={(e) => {
                        // digits + one optional decimal point
                        const raw = e.target.value.replace(/[^0-9.]/g, "");
                        const parts = raw.split(".");
                        const clean = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : raw;
                        setMode("custom");
                        setCustomInput(clean);
                      }}
                      className="w-full bg-transparent text-[15px] text-white placeholder:text-white/40 focus:outline-none"
                    />
                  </div>
                  <span className="shrink-0 text-[13px] font-medium text-white/55">
                    = {customInput.trim() !== "" ? customClock : "0:00"}
                  </span>
                </div>
              </div>

              {/* Custom validation hint */}
              {mode === "custom" && (customTooLow || customTooHigh) && (
                <p className="mb-2 text-center text-[11px] text-rose-300/90">
                  {customTooHigh
                    ? `Maximum top-up is $${CUSTOM_TOPUP_MAX_USD}.`
                    : `Minimum top-up is $${floorUsd}.`}
                </p>
              )}

              {/* Terms line */}
              <p className="mb-3.5 text-center text-[11px] leading-snug text-white/40">
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

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => onOpenChange(false)}
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
        </DialogContent>
      </Dialog>

      {/* Payment step (PayPal + Card) */}
      <PaymentModal
        tier={payTier}
        personaId={personaId}
        personaName={personaName}
        isOpen={!!payTier}
        onClose={() => setPayTier(null)}
        onSuccess={handleSuccess}
        variant="B"
        coinsPerMinute={coinsPerMinute}
      />
    </>
  );
}
