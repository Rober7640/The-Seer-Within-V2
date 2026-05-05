import { useEffect } from "react";
import { useAuth, authFetch } from "@/hooks/useAuth";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import PayPalCreditButton from "@/components/PayPalCreditButton";
import StripeCardForm from "@/components/StripeCardForm";

interface TeaserCreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personaId: string | null;
  onSuccess?: (newBalance: number) => void;
}

export default function TeaserCreditModal({
  open,
  onOpenChange,
  personaId,
  onSuccess,
}: TeaserCreditModalProps) {
  const { refreshUser } = useAuth();

  // Log checkout view when modal opens
  useEffect(() => {
    if (open) {
      authFetch("/api/credits/checkout-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageType: "welcome", personaId, source: "teaser" }),
      }).catch(() => {});
      // Tag session for Microsoft Clarity filtering
      if (window.clarity) {
        window.clarity("set", "intent", "purchase");
        window.clarity("event", "teaser_credit_modal");
      }
    }
  }, [open]);

  const handleSuccess = (newBalance: number) => {
    onSuccess?.(newBalance);
    refreshUser();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 bg-transparent border-0 shadow-none [&>button:last-child]:hidden">
        <div className="relative rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1a1060 0%, #2d1b8e 60%, #1e0f5c 100%)" }}>

          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>

          <div className="px-6 pt-8 pb-6 max-h-[85vh] overflow-y-auto">
            {/* Title */}
            <h2 className="text-white text-xl font-bold text-center mb-2">
              Refill credits to see the answer
            </h2>
            <p className="text-white/60 text-sm text-center mb-6 leading-relaxed">
              Your reading is paused. Refill credits to pick up where you left off.
            </p>

            {/* Offer card */}
            <div className="relative rounded-xl border-2 border-fuchsia-500/60 bg-white/5 p-5 mb-5">
              {/* Discount badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span
                  className="px-4 py-1 rounded-full text-xs font-black text-white tracking-wide"
                  style={{ background: "linear-gradient(90deg, #d946ef, #a855f7)" }}
                >
                  -85% DISCOUNT
                </span>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div>
                  <p className="text-white font-bold text-base">Welcome pack</p>
                  <p className="text-white/80 text-sm mt-0.5">160 credits</p>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-sm line-through">$19.99</p>
                  <p className="text-white font-extrabold text-2xl leading-tight">$2.99</p>
                </div>
              </div>
            </div>

            {/* PayPal */}
            <div className="mb-3">
              <PayPalCreditButton
                packageType="welcome"
                personaId={personaId}
                amount={299}
                onSuccess={handleSuccess}
              />
            </div>

            {/* Stripe inline card */}
            <StripeCardForm
              packageType="welcome"
              personaId={personaId}
              amount={299}
              priceLabel="$2.99"
              onSuccess={handleSuccess}
            />

            {/* Dismiss */}
            <button
              onClick={() => onOpenChange(false)}
              className="mt-4 w-full text-[13px] text-white/35 hover:text-white/55 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
