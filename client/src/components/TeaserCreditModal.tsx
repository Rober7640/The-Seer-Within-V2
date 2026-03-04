import { useState } from "react";
import { authFetch } from "@/hooks/useAuth";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface TeaserCreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personaId: string | null;
}

export default function TeaserCreditModal({
  open,
  onOpenChange,
  personaId,
}: TeaserCreditModalProps) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleSeeAnswer = async () => {
    if (!personaId) return;
    setIsCheckingOut(true);
    try {
      const res = await authFetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageType: "starter", personaId }),
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

          <div className="px-6 pt-8 pb-6">
            {/* Title */}
            <h2 className="text-white text-xl font-bold text-center mb-2">
              Refill credits to see the answer
            </h2>
            <p className="text-white/60 text-sm text-center mb-6 leading-relaxed">
              You need &gt;30 credits on the balance to see the message.
              Credits will not be deducted.
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

            {/* CTA button */}
            <button
              onClick={handleSeeAnswer}
              disabled={isCheckingOut}
              className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                background: isCheckingOut
                  ? "rgba(255,255,255,0.15)"
                  : "linear-gradient(90deg, #7c3aed 0%, #c026d3 50%, #ea580c 100%)",
              }}
            >
              {isCheckingOut ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                "See the answer"
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
