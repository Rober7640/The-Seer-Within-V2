import { useState, useEffect } from "react";
import { PayPalButtons, FUNDING } from "@paypal/react-paypal-js";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { authFetch, useAuth } from "@/hooks/useAuth";
import { Shield, CreditCard } from "lucide-react";
import { COINS_PER_MINUTE } from "../../../shared/types";
import type { PricingTier } from "../../../shared/types";
import StripeCardForm from "@/components/StripeCardForm";
import { trackInitiateCheckout } from "@/lib/facebook";

interface Props {
  tier: PricingTier | null;
  personaId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

export default function PaymentModal({
  tier,
  personaId,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [method, setMethod] = useState<"paypal" | "card">("paypal");
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const { user } = useAuth();

  // Log checkout view when modal opens
  useEffect(() => {
    if (isOpen && tier) {
      authFetch("/api/credits/checkout-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageType: tier.packageType, personaId, source: "credits_page" }),
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!tier) return null;

  const price = `$${(tier.priceUsd / 100).toFixed(2)}`;
  const minutes = Math.floor(tier.totalCoins / COINS_PER_MINUTE);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white text-gray-900 max-w-sm w-full p-0 rounded-2xl overflow-hidden border-0 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Order details */}
        <div className="px-5 pt-5 pb-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Order details:</h3>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-700">Package</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {tier.totalCoins} coins (~{minutes} min)
              </p>
            </div>
            <p className="text-sm font-medium text-gray-900">{price}</p>
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between">
            <p className="text-sm font-semibold text-gray-900">Total:</p>
            <p className="text-sm font-semibold text-gray-900">{price}</p>
          </div>
        </div>

        <div className="px-5 pb-5">
          {/* Payment method tabs */}
          <h4 className="font-semibold text-center text-gray-800 text-sm mb-3">
            Choose payment method
          </h4>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setMethod("paypal")}
              className={`flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                method === "paypal"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              <span className="font-extrabold text-[15px]">
                <span className="text-[#003087]">Pay</span>
                <span className="text-[#009cde]">Pal</span>
              </span>
            </button>
            <button
              onClick={() => setMethod("card")}
              className={`flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                method === "card"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Credit Card
            </button>
          </div>

          {/* Payment action */}
          {method === "paypal" ? (
            <div>
              <PayPalButtons
                fundingSource={FUNDING.PAYPAL}
                style={{
                  layout: "vertical",
                  color: "gold",
                  shape: "rect",
                  label: "buynow",
                  tagline: false,
                  height: 45,
                }}
                createOrder={async () => {
                  setPaypalError(null);
                  // Fire InitiateCheckout for /aiden + /evelyn funnel users only.
                  // Unconditional per attempt — no first-time gate.
                  if (user?.signupFunnel === 'aiden' || user?.signupFunnel === 'evelyn') {
                    trackInitiateCheckout(
                      tier.priceUsd / 100,
                      "USD",
                      "V2 Credits — PayPal",
                    );
                  }
                  const res = await authFetch("/api/credits/create-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      packageType: tier.packageType,
                      ...(personaId ? { personaId } : {}),
                    }),
                  });
                  if (!res.ok) throw new Error("Failed to create order");
                  const data = await res.json();
                  return data.orderId;
                }}
                onApprove={async (data) => {
                  const res = await authFetch("/api/credits/capture-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderId: data.orderID }),
                  });
                  if (!res.ok) {
                    setPaypalError("Payment capture failed. Please try again.");
                    return;
                  }
                  const result = await res.json();
                  onSuccess(result.newBalance);
                  onClose();
                }}
                onError={() =>
                  setPaypalError("PayPal encountered an error. Please try again.")
                }
              />
              {paypalError && (
                <p className="text-red-500 text-xs mt-2 text-center">{paypalError}</p>
              )}
            </div>
          ) : (
            <StripeCardForm
              packageType={tier.packageType}
              personaId={personaId}
              amount={tier.priceUsd}
              priceLabel={price}
              onSuccess={(newBalance) => {
                onSuccess(newBalance);
                onClose();
              }}
            />
          )}

          {/* Trust signals */}
          <div className="mt-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-gray-400 text-xs">
              <Shield className="w-3.5 h-3.5 text-green-500" />
              Guaranteed secure payments
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="px-2 py-0.5 border border-gray-200 rounded text-[10px] font-bold text-[#1a1f71]">VISA</span>
              <span className="px-2 py-0.5 border border-gray-200 rounded text-[10px] font-bold text-[#eb001b]">MC</span>
              <span className="px-2 py-0.5 border border-gray-200 rounded text-[10px] font-bold text-[#2e77bc]">AMEX</span>
              <span className="px-2 py-0.5 border border-gray-200 rounded text-[10px] font-bold text-[#e65c1a]">DISC</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
