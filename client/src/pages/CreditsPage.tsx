import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth, authFetch } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Check, Sparkles, Info } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import PaymentModal from "@/components/PaymentModal";
import type { PricingTier, PersonaPricing } from "../../../shared/types";
import { COINS_PER_MINUTE } from "../../../shared/types";

interface PurchaseHistory {
  id: string;
  packageType: string;
  coinsPurchased: number;
  bonusCoins: number;
  priceUsd: number;
  status: string;
  createdAt: string;
}

interface PersonaInfo {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  tagline: string | null;
  freeCoins: number;
}

export default function CreditsPage() {
  const { user, isLoading: authLoading, isAuthenticated, refreshUser } =
    useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseHistory[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [personaInfo, setPersonaInfo] = useState<PersonaInfo | null>(null);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const personaId = urlParams.get("personaId");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Tag session for Microsoft Clarity filtering
  useEffect(() => {
    if (isAuthenticated && window.clarity) {
      window.clarity("set", "intent", "purchase");
      window.clarity("event", "credits_page_view");
    }
  }, [isAuthenticated]);

  async function fetchPurchaseHistory() {
    try {
      const historyRes = await authFetch("/api/credits/purchases");
      if (historyRes.ok) {
        const data = await historyRes.json();
        setPurchases(data.purchases || []);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setPurchasesLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchData() {
      try {
        const pricingUrl = personaId
          ? `/api/credits/pricing?personaId=${personaId}`
          : "/api/credits/pricing";
        const pricingRes = await authFetch(pricingUrl);
        if (pricingRes.ok) {
          const data: PersonaPricing & { persona?: PersonaInfo } =
            await pricingRes.json();
          if (data.tiers && data.tiers.length > 0) {
            setTiers(data.tiers);
          }
          if (data.persona) {
            setPersonaInfo(data.persona);
          }
        }
      } catch (err) {
        console.error("Failed to fetch pricing:", err);
      }

      await fetchPurchaseHistory();
    }

    fetchData();
  }, [isAuthenticated, personaId]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("credit_success");
    if (success === "true") {
      refreshUser();
      const pid = urlParams.get("personaId");
      window.history.replaceState(
        {},
        "",
        pid ? `/credits?personaId=${pid}` : "/credits",
      );
    }
  }, [refreshUser]);

  const handleSuccess = (newBalance: number) => {
    toast({ title: "Payment successful!", description: `Your balance has been updated.` });
    refreshUser();
    fetchPurchaseHistory();
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const coinBalance = (user as any)?.coinBalance ?? 0;
  const totalCoinsUsed = (user as any)?.totalCoinsUsed ?? 0;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Persona context banner */}
      {personaInfo && (
        <div className="flex items-center gap-3 mb-4 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
          <Avatar className="w-10 h-10 border-2 border-purple-400/50">
            <AvatarImage
              src={personaInfo.avatarUrl || "/evelyn-avatar.png"}
              alt={personaInfo.displayName}
            />
            <AvatarFallback>
              {personaInfo.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white text-sm font-medium">
              Pricing for {personaInfo.displayName}
            </p>
            {personaInfo.freeCoins > 0 && (
              <p className="text-purple-300 text-xs">
                Includes {personaInfo.freeCoins} free coins for new users
              </p>
            )}
          </div>
        </div>
      )}

      {/* Balance card */}
      <Card className="bg-gradient-to-br from-purple-900/80 to-purple-800/60 border-purple-700/30 backdrop-blur-md mb-8">
        <CardContent className="p-6 text-center">
          <p className="text-purple-200 text-sm mb-1">Current Balance</p>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Coins className="w-6 h-6 text-yellow-400" />
            <span className="text-4xl font-bold text-white font-serif">
              {coinBalance}
            </span>
            <span className="text-purple-200 text-lg">coins</span>
          </div>
          <p className="text-purple-300 text-xs">
            ~{Math.floor(coinBalance / COINS_PER_MINUTE)} minutes of
            consultation &middot; {totalCoinsUsed} coins used total
          </p>
        </CardContent>
      </Card>

      {/* Rate definition */}
      <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs -mt-6 mb-6">
        <Info className="w-3 h-3 shrink-0" />
        <span>60 coins = 1 minute &middot; same rate for all guides</span>
      </div>

      {/* Promo banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 p-6 text-center border border-purple-600/30">
        <Sparkles className="absolute top-3 left-3 w-5 h-5 text-purple-400/40" />
        <Sparkles className="absolute bottom-3 right-3 w-5 h-5 text-purple-400/40" />
        <p className="text-purple-300 text-xs uppercase tracking-widest mb-1">
          Special Offer
        </p>
        <h2 className="text-white font-serif text-xl mb-1">
          You don't have to figure things out alone
        </h2>
        <p className="text-purple-200 text-sm">
          Get bonus coins on every package
        </p>
      </div>

      {/* Coin packages grid */}
      <h2 className="font-serif text-xl text-white mb-4">
        {personaInfo
          ? `${personaInfo.displayName}'s Packages`
          : "Choose Your Package"}
      </h2>
      <div className="grid gap-3 mb-6">
        {tiers.map((tier) => (
          <div
            key={tier.packageType}
            className="relative rounded-xl p-4 transition-all border-2 border-slate-600/50 bg-slate-800/60"
          >
            {/* Badge */}
            {tier.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-emerald-500 text-white border-0 text-[10px] px-3 py-0.5 uppercase tracking-wider font-bold shadow-lg">
                  {tier.badge}
                </Badge>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl font-bold text-white">
                    {tier.coins}
                  </span>
                  <span className="text-lg text-white">coins</span>
                </div>
                {tier.bonusCoins > 0 && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs font-medium">
                    +{tier.bonusCoins} extra coins
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {formatPrice(tier.priceUsd)}
                </p>
                <p className="text-[10px] text-slate-400">
                  ~{Math.floor(tier.totalCoins / COINS_PER_MINUTE)} min
                </p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => setSelectedTier(tier)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-900/30"
              >
                Buy Coins
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Purchase History */}
      <h2 className="font-serif text-xl text-white mb-4 mt-8">
        Purchase History
      </h2>
      <Card className="bg-slate-800/60 backdrop-blur-md border-slate-600/30">
        <CardContent className="p-0">
          {purchasesLoading ? (
            <div className="p-6 text-center text-slate-400 text-sm">
              Loading history...
            </div>
          ) : purchases.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">
              No purchases yet. Choose a package above to get started.
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {purchase.coinsPurchased} coins
                      {purchase.bonusCoins > 0 && (
                        <span className="text-emerald-400 text-xs ml-1">
                          (incl. {purchase.bonusCoins} bonus)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(purchase.createdAt)}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {formatPrice(purchase.priceUsd)}
                    </span>
                    <Badge
                      variant={
                        purchase.status === "completed" ? "default" : "outline"
                      }
                      className={
                        purchase.status === "completed"
                          ? "bg-emerald-500/20 text-emerald-400 border-0"
                          : "text-slate-400"
                      }
                    >
                      {purchase.status === "completed" && (
                        <Check className="w-3 h-3 mr-0.5" />
                      )}
                      {purchase.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center mt-8 text-white/40 text-xs space-y-1">
        <p>Secure payments powered by PayPal & Stripe</p>
        <p>30-day goodwill refund on unused credits</p>
      </div>

      <PaymentModal
        tier={selectedTier}
        personaId={personaId}
        isOpen={!!selectedTier}
        onClose={() => setSelectedTier(null)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
