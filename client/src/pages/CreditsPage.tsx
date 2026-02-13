import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth, authFetch } from "@/hooks/useAuth";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Coins,
  Sparkles,
  ArrowLeft,
  Check,
  Star,
  User,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface CreditPackage {
  id: string;
  label: string;
  minutes: number;
  priceUsd: number; // in cents
  popular?: boolean;
  savings?: string;
}

interface PurchaseHistory {
  id: string;
  packageType: string;
  minutesPurchased: number;
  priceUsd: number;
  status: string;
  createdAt: string;
}

interface PersonaInfo {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  tagline: string | null;
  freeMinutes: number;
}

const DEFAULT_PACKAGES: CreditPackage[] = [
  {
    id: "15min",
    label: "Quick Reading",
    minutes: 15,
    priceUsd: 1500,
  },
  {
    id: "30min",
    label: "Deep Reading",
    minutes: 30,
    priceUsd: 2500,
    popular: true,
    savings: "Save 17%",
  },
  {
    id: "60min",
    label: "Extended Session",
    minutes: 60,
    priceUsd: 4500,
    savings: "Save 25%",
  },
];

export default function CreditsPage() {
  const { user, isLoading: authLoading, isAuthenticated, refreshUser } =
    useAuth();
  const [, navigate] = useLocation();

  const [packages, setPackages] = useState<CreditPackage[]>(DEFAULT_PACKAGES);
  const [purchases, setPurchases] = useState<PurchaseHistory[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [personaInfo, setPersonaInfo] = useState<PersonaInfo | null>(null);

  // Read persona context from URL
  const urlParams = new URLSearchParams(window.location.search);
  const personaId = urlParams.get("personaId");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch pricing and purchase history
  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchData() {
      try {
        // Fetch pricing (persona-specific if personaId is provided)
        const pricingUrl = personaId
          ? `/api/credits/pricing?personaId=${personaId}`
          : "/api/credits/pricing";
        const pricingRes = await authFetch(pricingUrl);
        if (pricingRes.ok) {
          const data = await pricingRes.json();
          if (data.packages && data.packages.length > 0) {
            setPackages(data.packages);
          }
          if (data.persona) {
            setPersonaInfo(data.persona);
          }
        }
      } catch (err) {
        console.error("Failed to fetch pricing:", err);
      }

      try {
        // Fetch purchase history
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

    fetchData();
  }, [isAuthenticated, personaId]);

  // Handle Stripe redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("credit_success");
    if (success === "true") {
      refreshUser();
      // Clean up URL, preserve personaId if present
      const pid = urlParams.get("personaId");
      window.history.replaceState(
        {},
        "",
        pid ? `/credits?personaId=${pid}` : "/credits",
      );
    }
  }, [refreshUser]);

  const handlePurchase = async (pkg: CreditPackage) => {
    setIsCheckingOut(pkg.id);
    try {
      const res = await authFetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageType: pkg.id,
          ...(personaId ? { personaId } : {}),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setIsCheckingOut(null);
    }
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  if (authLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <CosmicBackground />
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin z-10" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen relative">
      <CosmicBackground />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Back navigation */}
        <Link href={personaId ? `/reading?persona=${personaInfo?.displayName?.toLowerCase().replace(/\s+/g, "-") || ""}` : "/reading"}>
          <button className="text-white/60 hover:text-white text-sm flex items-center gap-1 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Reading
          </button>
        </Link>

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
              {personaInfo.freeMinutes > 0 && (
                <p className="text-purple-300 text-xs">
                  Includes {personaInfo.freeMinutes} free minutes for new users
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
              <Clock className="w-6 h-6 text-purple-300" />
              <span className="text-4xl font-bold text-white font-serif">
                {user?.creditMinutes ?? 0}
              </span>
              <span className="text-purple-200 text-lg">minutes</span>
            </div>
            <p className="text-purple-300 text-xs">
              {user?.totalMinutesUsed ?? 0} minutes used total
            </p>
          </CardContent>
        </Card>

        {/* Packages */}
        <h2 className="font-serif text-xl text-white mb-4">
          {personaInfo
            ? `${personaInfo.displayName}'s Packages`
            : "Choose Your Package"}
        </h2>
        <div className="grid gap-4 mb-8">
          {packages.map((pkg) => (
            <Card
              key={pkg.id}
              className={`backdrop-blur-md transition-all cursor-pointer hover:scale-[1.02] ${
                pkg.popular
                  ? "bg-white/95 border-purple-400 shadow-lg shadow-purple-500/20"
                  : "bg-white/90 border-white/20"
              }`}
              onClick={() => handlePurchase(pkg)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        pkg.popular
                          ? "bg-purple-100 text-purple-600"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {pkg.label}
                        </h3>
                        {pkg.popular && (
                          <Badge className="bg-purple-100 text-purple-700 border-0 text-[10px]">
                            <Star className="w-2.5 h-2.5 mr-0.5" />
                            Most Popular
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {pkg.minutes} minutes of reading time
                      </p>
                      {pkg.savings && (
                        <span className="text-xs text-green-600 font-medium">
                          {pkg.savings}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPrice(pkg.priceUsd)}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {formatPrice(Math.round(pkg.priceUsd / pkg.minutes))}/min
                    </p>
                  </div>
                </div>
                <Button
                  className={`w-full mt-4 ${
                    pkg.popular
                      ? "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                      : ""
                  }`}
                  disabled={isCheckingOut === pkg.id}
                >
                  {isCheckingOut === pkg.id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Coins className="w-4 h-4 mr-2" />
                      Purchase
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Purchase History */}
        <h2 className="font-serif text-xl text-white mb-4">
          Purchase History
        </h2>
        <Card className="bg-white/90 backdrop-blur-md border-white/20">
          <CardContent className="p-0">
            {purchasesLoading ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                Loading history...
              </div>
            ) : purchases.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                No purchases yet. Choose a package above to get started.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {purchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {purchase.minutesPurchased} minutes
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(purchase.createdAt)}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {formatPrice(purchase.priceUsd)}
                      </span>
                      <Badge
                        variant={
                          purchase.status === "completed"
                            ? "default"
                            : "outline"
                        }
                        className={
                          purchase.status === "completed"
                            ? "bg-green-100 text-green-700 border-0"
                            : ""
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
          <p>Secure payments powered by Stripe</p>
          <p>60-day money-back guarantee on all purchases</p>
        </div>
      </div>
    </div>
  );
}
