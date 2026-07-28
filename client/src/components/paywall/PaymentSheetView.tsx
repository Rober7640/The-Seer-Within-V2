// PaymentSheetView — redesigned payment sheet (presentational, light theme to
// match the live PaymentModal). Fixes the trust block: single guarantee line,
// "no subscription", encryption reassurance — replacing the vague "Guaranteed
// secure payments" and removing the modal/store refund contradiction.
//
// The actual PayPal SDK button + Stripe card form get slotted in via
// `paypalSlot` / `cardSlot` in production; the preview passes visual stand-ins.

import { useState, type ReactNode } from "react";
import { Shield, Lock, CreditCard } from "lucide-react";
import { coinsToClock, COINS_PER_MINUTE, type PricingTier } from "@shared/types";
import { paywallCopy, toTierView, type PaywallVariant } from "./paywallCopy";

interface PaymentSheetViewProps {
  tier: PricingTier;
  personaName: string;
  paypalSlot: ReactNode;
  cardSlot: ReactNode;
  variant?: PaywallVariant;
  /** The guide's cents-per-minute rate; drives all coins→time / per-minute math. */
  coinsPerMinute?: number;
}

export default function PaymentSheetView({
  tier,
  personaName,
  paypalSlot,
  cardSlot,
  variant = "B",
  coinsPerMinute = COINS_PER_MINUTE,
}: PaymentSheetViewProps) {
  const copy = paywallCopy(variant);
  const [method, setMethod] = useState<"paypal" | "card">("paypal");
  const v = toTierView(tier, coinsPerMinute);
  const firstName = personaName.split(" ")[0] || personaName;

  return (
    <div className="w-full overflow-hidden rounded-2xl bg-white text-gray-900 shadow-2xl">
      {/* Order summary */}
      <div className="bg-gradient-to-b from-slate-50 to-white px-5 pb-4 pt-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">
          Keep going with {firstName}
        </h3>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-700">
              {coinsToClock(tier.totalCoins, coinsPerMinute)} of reading time
              {v.bonusMinutes > 0 && (
                <span className="ml-1 text-emerald-600">(incl. {v.bonusMinutes} free)</span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {v.perMinuteLabel}
            </p>
          </div>
          <p className="text-sm font-semibold text-gray-900">{v.priceLabel}</p>
        </div>
        <div className="mt-3 flex justify-between border-t border-gray-100 pt-3">
          <p className="text-sm font-semibold text-gray-900">Total</p>
          <p className="text-sm font-semibold text-gray-900">{v.priceLabel}</p>
        </div>
      </div>

      <div className="px-5 pb-5">
        <h4 className="mb-3 text-center text-sm font-semibold text-gray-800">
          Choose payment method
        </h4>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMethod("paypal")}
            className={`flex items-center justify-center rounded-xl border-2 py-3 text-sm font-medium transition-all ${
              method === "paypal" ? "border-blue-500 bg-blue-50" : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <span className="text-[15px] font-extrabold">
              <span className="text-[#003087]">Pay</span>
              <span className="text-[#009cde]">Pal</span>
            </span>
          </button>
          <button
            onClick={() => setMethod("card")}
            className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-3 text-sm font-medium transition-all ${
              method === "card" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Credit Card
          </button>
        </div>

        {method === "paypal" ? paypalSlot : cardSlot}

        {/* Trust block — single source of refund truth */}
        <div className="mt-4 space-y-2 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-gray-600">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            {copy.refundLine}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <Lock className="h-3.5 w-3.5 text-gray-400" />
            {copy.trustLine}
          </div>
          <p className="text-[11px] text-gray-400">{copy.noSubscription}</p>
        </div>
      </div>
    </div>
  );
}
