import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { CosmicBackground } from "../components/CosmicBackground";
import { Link } from "wouter";
import { CheckCircle, Package, Mail, Sparkles, Gem, MessageCircle } from "lucide-react";
import { trackPurchase, trackUpsellPurchase, trackUpsell2Purchase } from "../lib/facebook";
import { trackGAdsPurchase } from "../lib/gtm";
import { currentFunnel } from "../lib/funnel";

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

          // Track Upsell 2 on /success load (fires once per session). Both
          // paths fire a standard `Purchase` (content_category='upsell'). The
          // event_id MUST match the server's resolveStripeEventName: any
          // recognized ad funnel (fb/fb2/gdn/palm) → `upsell2_<session>`; bare
          // V1 → `upsell_u2_<session>`. Gating on currentFunnel() (not
          // isFbFunnel) keeps palm/gdn in sync with the server webhook fire —
          // otherwise the browser (upsell_u2_) and server (upsell2_) ids diverge
          // and Meta double-counts the upsell.
          if (boughtUpsell2 && sessionId) {
            const amount = (data.upsell2Amount || 4700) / 100;
            if (currentFunnel()) {
              trackUpsell2Purchase(amount, "USD", data.email, "Manifestation Bracelet", sessionId, { skipServerRelay: true });
            } else {
              trackUpsellPurchase(amount, "USD", data.email, "Manifestation Bracelet", sessionId, 'u2', { skipServerRelay: true });
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
          <p className="text-purple-200/70 mb-4">Your order is confirmed</p>
          <p className="text-purple-200/60 text-sm mb-6">
            The moment you took action, something shifted. Most people stay
            curious. You chose to look.
          </p>

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

          {/* Luna Voss $50 / 30-minute welcome-chat offer.
              CTA carries campaign=v1-ty-luna — the tag the server keys the
              1,800-coin (30-min) verify-time grant off of (see auth.ts
              isFromLunaThankyouOffer). utm_* params are for ad/analytics only. */}
          <div className="mt-2 mb-6 p-5 rounded-xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-400/40 text-left">
            <p className="text-purple-100/80 text-sm mb-3">
              But before you go — there's something the stars want you to know.
            </p>
            <p className="text-purple-200/70 text-sm mb-4">
              A general reading tells you the <em>what</em>. A conversation
              tells you the <em>why</em>, the <em>when</em>, and the{" "}
              <em>what now</em>.
            </p>
            <div className="flex items-start gap-3 mb-4">
              <MessageCircle className="w-5 h-5 text-purple-300 mt-0.5 flex-shrink-0" />
              <p className="text-white text-sm">
                As a welcome gift, we've reserved{" "}
                <span className="font-semibold text-purple-200">
                  30 minutes of free chat (a $50 value)
                </span>{" "}
                for you to speak directly with{" "}
                <span className="font-semibold">Astrologer Luna Voss</span> —
                one of our most sought-after readers, known for cutting straight
                to the truth others tip-toe around.
              </p>
            </div>
            <p className="text-purple-200/70 text-sm mb-4">
              Bring her your real question. The one you didn't put into a form.
            </p>

            {/* $50 gift-voucher visual (pure CSS ticket — no image asset). */}
            <div className="mb-5 flex items-stretch rounded-xl overflow-hidden border border-amber-300/50 bg-gradient-to-br from-amber-400/20 via-yellow-300/10 to-amber-500/20 shadow-lg shadow-amber-900/20">
              {/* Amount stub */}
              <div className="flex flex-col items-center justify-center px-5 py-4 bg-gradient-to-br from-amber-400/25 to-yellow-500/15">
                <span className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80">
                  Value
                </span>
                <span className="font-serif text-4xl font-bold text-amber-100 leading-none drop-shadow-sm">
                  $50
                </span>
              </div>
              {/* Perforated divider */}
              <div className="relative flex flex-col items-center">
                <span className="w-3 h-3 rounded-full bg-slate-900 -mt-1.5" />
                <span className="flex-1 border-l-2 border-dashed border-amber-200/50" />
                <span className="w-3 h-3 rounded-full bg-slate-900 -mb-1.5" />
              </div>
              {/* Details stub */}
              <div className="flex-1 px-4 py-3 text-left">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80">
                    Gift Voucher
                  </span>
                </div>
                <p className="text-white font-semibold text-sm leading-tight">
                  30 Minutes of Free Chat
                </p>
                <p className="text-amber-100/70 text-xs mt-0.5">
                  with Astrologer Luna Voss
                </p>
              </div>
            </div>

            <a
              href="/luna?campaign=v1-ty-luna&utm_source=v1_ty&utm_medium=thankyou&utm_campaign=luna_50"
              data-testid="link-luna-offer"
              className="block w-full text-center bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Start My Conversation with Luna →
            </a>
            <p className="text-purple-200/50 text-xs text-center mt-3">
              Your 30 free minutes with Luna are reserved for the next 24 hours.
              Verify your email to lock them in.
            </p>
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
