import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth, authFetch } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, Sparkles, Info } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import PaymentModal from "@/components/PaymentModal";
import CreditsStoreView, { type GuideRate } from "@/components/paywall/CreditsStoreView";
import type { PricingTier, PersonaPricing } from "../../../shared/types";
import { COINS_PER_MINUTE } from "../../../shared/types";
import type { PaywallVariant } from "@shared/paywall";

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
  // The guide's cents-per-minute rate (from GET /api/credits/pricing); drives the
  // coins→time / per-minute math in the store and payment sheet.
  const [coinsPerMinute, setCoinsPerMinute] = useState<number>(COINS_PER_MINUTE);
  const [purchases, setPurchases] = useState<PurchaseHistory[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [personaInfo, setPersonaInfo] = useState<PersonaInfo | null>(null);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [variant, setVariant] = useState<PaywallVariant>("A");
  // Persona name/avatar for the variant-B store only — kept separate from
  // personaInfo so the variant-A page stays exactly as today.
  const [storePersona, setStorePersona] = useState<{ displayName: string; avatarUrl: string | null } | null>(null);
  // All guides + rates for the "what your balance buys" grid, and which one is current.
  const [guides, setGuides] = useState<GuideRate[]>([]);

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
      let currentId: string | null = null;
      try {
        const pricingParams = new URLSearchParams();
        if (personaId) pricingParams.set("personaId", personaId);
        // Non-prod QA override (§3.14.F): force a variant via the page URL.
        const qaVariant = new URLSearchParams(window.location.search).get("paywallVariant");
        if (qaVariant) pricingParams.set("paywallVariant", qaVariant);
        const qs = pricingParams.toString();
        const pricingUrl = `/api/credits/pricing${qs ? `?${qs}` : ""}`;
        const pricingRes = await authFetch(pricingUrl);
        if (pricingRes.ok) {
          const data: PersonaPricing & { persona?: PersonaInfo } =
            await pricingRes.json();
          if (data.tiers && data.tiers.length > 0) {
            setTiers(data.tiers);
          }
          if (data.persona) {
            setStorePersona(data.persona);
            currentId = data.persona.id ?? null; // the guide the grid highlights as "reading now"
          }
          setVariant((data as { variant?: string }).variant === "B" ? "B" : "A");
          setCoinsPerMinute((data as { coinsPerMinute?: number }).coinsPerMinute ?? COINS_PER_MINUTE);
        }
      } catch (err) {
        console.error("Failed to fetch pricing:", err);
      }

      // All active guides + their $/min for the per-guide "what your balance buys" grid.
      try {
        const personasRes = await authFetch("/api/personas");
        if (personasRes.ok) {
          const list = await personasRes.json();
          if (Array.isArray(list)) {
            setGuides(
              list.map((p: any) => ({
                id: p.id,
                name: p.displayName,
                avatarUrl: p.avatarUrl,
                coinsPerMinute: p.coinsPerMinute ?? COINS_PER_MINUTE,
                isCurrent: p.id === currentId,
              })),
            );
          }
        }
      } catch (err) {
        console.error("Failed to fetch guides:", err);
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
      {/* Single minutes-led store for everyone (the A/B layout split is retired). */}
      <CreditsStoreView
        personaName={storePersona?.displayName || "your guide"}
        avatarUrl={storePersona?.avatarUrl || undefined}
        coinBalance={coinBalance}
        tiers={tiers}
        onSelectTier={(t) => setSelectedTier(t)}
        variant="B"
        coinsPerMinute={coinsPerMinute}
        guides={guides}
      />

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
                      {formatPrice(purchase.coinsPurchased + (purchase.bonusCoins || 0))} added
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

      <PaymentModal
        tier={selectedTier}
        personaId={personaId}
        personaName={storePersona?.displayName}
        variant="B"
        coinsPerMinute={coinsPerMinute}
        isOpen={!!selectedTier}
        onClose={() => setSelectedTier(null)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
