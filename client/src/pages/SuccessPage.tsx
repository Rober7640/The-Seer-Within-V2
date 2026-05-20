import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { CosmicBackground } from "../components/CosmicBackground";
import { Link } from "wouter";
import { CheckCircle, Package, Mail, Sparkles, Gem } from "lucide-react";
import { trackPurchase, trackUpsellPurchase, trackUpsell2Purchase } from "../lib/facebook";
import { trackGAdsPurchase } from "../lib/gtm";
import { isFbFunnel } from "../lib/funnel";

interface OrderData {
  firstName: string;
  email: string;
  bucket: string | null;
  upsellPurchased: boolean;
  upsellAmount: number | null;
  upsell2Purchased: boolean;
  upsell2Amount: number | null;
}

export default function SuccessPage() {
  const searchString = useSearch();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [hasUpsell, setHasUpsell] = useState(false);
  const [hasUpsell2, setHasUpsell2] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const sessionId = params.get("session_id");
    const fallbackSessionId = params.get("fallback_session_id");
    const upsellFromUrl = params.get("upsell") === "true";
    const upsell2FromUrl = params.get("upsell2") === "true";

    async function loadOrderData() {
      if (!sessionId) {
        setHasUpsell(upsellFromUrl);
        setHasUpsell2(upsell2FromUrl);
        return;
      }

      // If this is from fallback checkout, verify and confirm the purchase first
      // Use retry logic to ensure the confirmation completes
      if (fallbackSessionId && upsellFromUrl) {
        const confirmFallback = async (attempt = 1): Promise<boolean> => {
          try {
            const res = await fetch("/api/upsell/confirm-fallback", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                originalSessionId: sessionId,
                fallbackSessionId: fallbackSessionId,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              console.log("Fallback purchase confirmed:", data);
              return true;
            } else {
              const errorData = await res.json().catch(() => ({}));
              console.warn(
                `Confirm fallback attempt ${attempt} failed:`,
                res.status,
                errorData,
              );
              return false;
            }
          } catch (err) {
            console.error(`Confirm fallback attempt ${attempt} error:`, err);
            return false;
          }
        };

        // Try up to 3 times with delays
        let confirmed = await confirmFallback(1);
        if (!confirmed) {
          await new Promise((r) => setTimeout(r, 1000));
          confirmed = await confirmFallback(2);
        }
        if (!confirmed) {
          await new Promise((r) => setTimeout(r, 2000));
          confirmed = await confirmFallback(3);
        }

        if (confirmed) {
          setHasUpsell(true);
        }
      }

      // If this is from upsell2 fallback checkout, confirm that purchase too
      if (fallbackSessionId && upsell2FromUrl) {
        const confirmUpsell2Fallback = async (
          attempt = 1,
        ): Promise<boolean> => {
          try {
            const res = await fetch("/api/upsell2/confirm-fallback", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                originalSessionId: sessionId,
                fallbackSessionId: fallbackSessionId,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              console.log("Upsell2 fallback purchase confirmed:", data);
              return true;
            } else {
              const errorData = await res.json().catch(() => ({}));
              console.warn(
                `Upsell2 confirm fallback attempt ${attempt} failed:`,
                res.status,
                errorData,
              );
              return false;
            }
          } catch (err) {
            console.error(
              `Upsell2 confirm fallback attempt ${attempt} error:`,
              err,
            );
            return false;
          }
        };

        let confirmed2 = await confirmUpsell2Fallback(1);
        if (!confirmed2) {
          await new Promise((r) => setTimeout(r, 1000));
          confirmed2 = await confirmUpsell2Fallback(2);
        }
        if (!confirmed2) {
          await new Promise((r) => setTimeout(r, 2000));
          confirmed2 = await confirmUpsell2Fallback(3);
        }

        if (confirmed2) {
          setHasUpsell2(true);
        }
      }

      // Fetch order details from DB
      try {
        const res = await fetch(`/api/order/details?session_id=${sessionId}`);
        const data = await res.json();
        if (data.firstName) {
          setOrderData(data);
          // Use URL flags as primary (always up-to-date from the redirect),
          // DB values as fallback (may have timing lag)
          const boughtUpsell1 = upsellFromUrl || data.upsellPurchased;
          const boughtUpsell2 = upsell2FromUrl || data.upsell2Purchased;
          setHasUpsell(boughtUpsell1);
          setHasUpsell2(boughtUpsell2);

          // Track Upsell 2 event on /success load (fires once per session).
          // V1-FB funnel (/fb/success) fires the distinct "Upsell2" custom
          // event so Meta Events Manager separates the two upsell tiers; V1
          // /success keeps firing "Upsell" for historical continuity.
          if (boughtUpsell2 && sessionId) {
            const amount = (data.upsell2Amount || 4700) / 100;
            if (isFbFunnel()) {
              trackUpsell2Purchase(amount, "USD", data.email, "Manifestation Bracelet", sessionId);
            } else {
              trackUpsellPurchase(amount, "USD", data.email, "Manifestation Bracelet", sessionId, 'u2');
            }
            trackGAdsPurchase("upsell2", amount, sessionId);
          }
        }
      } catch (err) {
        console.error("Failed to fetch order data:", err);
      }
    }

    loadOrderData();
  }, [searchString]);

  const firstName = orderData?.firstName || "dear one";

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4">
      <CosmicBackground />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/30 to-green-600/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm border border-purple-500/30 rounded-2xl shadow-2xl p-8 w-full text-center">
          <h2 className="font-serif text-2xl text-white mb-2">
            Thank You, {firstName}
          </h2>
          <p className="text-purple-200/70 mb-6">Your order is confirmed</p>

          <div className="space-y-4 text-left mb-6">
            <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Energy Clearing Ritual</p>
                <p className="text-purple-200/70 text-sm">
                  Your personalized clearing begins tonight
                </p>
              </div>
            </div>

            {hasUpsell && (
              <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg">
                <Package className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">
                    Protection Ritual + Volcanic Stone
                  </p>
                  <p className="text-purple-200/70 text-sm">
                    Your charged talisman ships within 48 hours
                  </p>
                </div>
              </div>
            )}

            {hasUpsell2 && (
              <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg">
                <Gem className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">
                    Manifestation Bracelet
                  </p>
                  <p className="text-purple-200/70 text-sm">
                    Your 8-stone bracelet ships within 48 hours
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg">
              <Mail className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Your Reading</p>
                <p className="text-purple-200/70 text-sm">
                  Arrives in your inbox within 24 hours
                </p>
              </div>
            </div>
          </div>

          <p className="text-purple-200/60 text-sm mb-4">
            The universe is already responding to your commitment.
          </p>

          <Link href="/">
            <button
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              data-testid="button-return-home"
            >
              Return Home
            </button>
          </Link>
        </div>
      </div>

      <footer className="mt-8 text-white/30 text-xs text-center relative z-10">
        &copy; {new Date().getFullYear()} The Seer Within. For Entertainment
        Purposes Only.
      </footer>
    </div>
  );
}
