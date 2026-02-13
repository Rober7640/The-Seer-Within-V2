import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, ArrowLeft, Star, Clock, DollarSign, Users, X } from "lucide-react";

interface PricingTier {
  packageType: string;
  minutes: number;
  priceUsd: number;
  label: string;
  pricePerMinute?: number;
}

interface PersonaDetail {
  id: string;
  slug: string;
  displayName: string;
  tagline: string | null;
  description: string | null;
  avatarUrl: string | null;
  isDefault: boolean;
  freeMinutes: number;
  categories: string[];
  pricing: {
    freeMinutes: number;
    tiers: PricingTier[];
  };
  specialties: string[];
  sampleGreeting: string | null;
  stats: {
    totalReadings: number;
    uniqueClients: number;
  };
}

interface PersonaListing {
  id: string;
  slug: string;
  displayName: string;
  tagline: string | null;
  description: string | null;
  avatarUrl: string | null;
  categories: string[];
  isDefault: boolean;
  freeMinutes: number;
  customPricing: string | null;
  pricingTiers?: PricingTier[];
}

const CATEGORY_LABELS: Record<string, string> = {
  love: "Love & Relationships",
  money: "Money & Abundance",
  purpose: "Life Purpose",
  career: "Career",
  spiritual: "Spiritual Growth",
  general: "General Guidance",
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export default function PersonasDirectory() {
  const [personas, setPersonas] = useState<PersonaListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<PersonaDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    async function fetchPersonas() {
      try {
        const res = await fetch("/api/personas?pricing=true");
        if (res.ok) {
          const data = await res.json();
          setPersonas(data);
        }
      } catch (err) {
        console.error("Failed to fetch personas:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPersonas();
  }, []);

  async function openDetail(slug: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/personas/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPersona(data);
      }
    } catch (err) {
      console.error("Failed to fetch persona detail:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  // Get all unique categories
  const allCategories = Array.from(
    new Set(personas.flatMap((p) => p.categories || [])),
  );

  // Filter personas
  const filtered = activeFilter
    ? personas.filter((p) => p.categories?.includes(activeFilter))
    : personas;

  // Get starting price for a persona
  function getStartingPrice(p: PersonaListing): string {
    if (p.pricingTiers && p.pricingTiers.length > 0) {
      const cheapest = p.pricingTiers.reduce((min, t) =>
        t.priceUsd < min.priceUsd ? t : min
      );
      return `From ${formatPrice(cheapest.priceUsd)}`;
    }
    return "From $15";
  }

  return (
    <div className="min-h-screen relative">
      <CosmicBackground />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <Link href="/">
          <button className="text-white/60 hover:text-white text-sm flex items-center gap-1 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Home
          </button>
        </Link>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-6 h-6 text-purple-300" />
            <h1 className="font-serif text-3xl text-white">
              Choose Your Guide
            </h1>
          </div>
          <p className="text-white/60 text-sm max-w-md mx-auto">
            Each guide brings unique gifts and perspectives. Find the one who
            resonates with your journey.
          </p>
        </div>

        {/* Category filters */}
        {allCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            <button
              onClick={() => setActiveFilter(null)}
              className={`px-4 py-1.5 rounded-full text-sm transition-all ${
                !activeFilter
                  ? "bg-purple-600 text-white"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              All
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  setActiveFilter(activeFilter === cat ? null : cat)
                }
                className={`px-4 py-1.5 rounded-full text-sm transition-all ${
                  activeFilter === cat
                    ? "bg-purple-600 text-white"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                {CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Personas grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((persona) => (
              <Card
                key={persona.id}
                className="bg-white/95 backdrop-blur-md border-white/20 overflow-hidden hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
                onClick={() => openDetail(persona.slug)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16 border-2 border-purple-200 shrink-0">
                      <AvatarImage
                        src={persona.avatarUrl || "/evelyn-avatar.png"}
                        alt={persona.displayName}
                      />
                      <AvatarFallback className="text-lg">
                        {persona.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-serif text-lg text-gray-900 truncate">
                          {persona.displayName}
                        </h3>
                        {persona.isDefault && (
                          <Badge
                            variant="outline"
                            className="text-purple-600 border-purple-200 text-[10px] shrink-0"
                          >
                            <Star className="w-2.5 h-2.5 mr-0.5" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      {persona.tagline && (
                        <p className="text-sm text-gray-500 mb-2">
                          {persona.tagline}
                        </p>
                      )}
                      {persona.description && (
                        <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                          {persona.description}
                        </p>
                      )}

                      {/* Pricing & categories row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-wrap gap-1">
                          {persona.categories &&
                            persona.categories.slice(0, 2).map((cat) => (
                              <Badge
                                key={cat}
                                variant="outline"
                                className="text-[10px] text-gray-500 border-gray-200"
                              >
                                {CATEGORY_LABELS[cat] || cat}
                              </Badge>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {persona.freeMinutes} free min
                          </span>
                          <span className="text-purple-600 font-medium">
                            {getStartingPrice(persona)}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/chat-service?persona=${persona.slug}`}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          Start Reading
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/40 text-sm">
              {activeFilter
                ? "No guides found for this category."
                : "No guides available yet."}
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-white/40 text-xs">
          <p>Each guide offers their own unique perspective and gifts.</p>
        </footer>
      </div>

      {/* Persona Detail Modal */}
      <Dialog
        open={!!selectedPersona || detailLoading}
        onOpenChange={(open) => {
          if (!open) setSelectedPersona(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detailLoading && !selectedPersona && (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {selectedPersona && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20 border-2 border-purple-200">
                    <AvatarImage
                      src={selectedPersona.avatarUrl || "/evelyn-avatar.png"}
                      alt={selectedPersona.displayName}
                    />
                    <AvatarFallback className="text-2xl">
                      {selectedPersona.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="font-serif text-xl flex items-center gap-2">
                      {selectedPersona.displayName}
                      {selectedPersona.isDefault && (
                        <Badge
                          variant="outline"
                          className="text-purple-600 border-purple-200 text-[10px]"
                        >
                          <Star className="w-2.5 h-2.5 mr-0.5" />
                          Featured
                        </Badge>
                      )}
                    </DialogTitle>
                    {selectedPersona.tagline && (
                      <p className="text-sm text-gray-500 mt-1">
                        {selectedPersona.tagline}
                      </p>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 mt-4">
                {/* Description */}
                {selectedPersona.description && (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {selectedPersona.description}
                  </p>
                )}

                {/* Stats */}
                {(selectedPersona.stats.totalReadings > 0 ||
                  selectedPersona.stats.uniqueClients > 0) && (
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>
                        {selectedPersona.stats.totalReadings} readings
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span>
                        {selectedPersona.stats.uniqueClients} clients
                      </span>
                    </div>
                  </div>
                )}

                {/* Categories */}
                {selectedPersona.categories.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                      Specialties
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPersona.categories.map((cat) => (
                        <Badge
                          key={cat}
                          variant="outline"
                          className="text-xs text-gray-600 border-gray-200"
                        >
                          {CATEGORY_LABELS[cat] || cat}
                        </Badge>
                      ))}
                      {selectedPersona.specialties.map((spec) => (
                        <Badge
                          key={spec}
                          variant="outline"
                          className="text-xs text-purple-600 border-purple-200"
                        >
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sample greeting */}
                {selectedPersona.sampleGreeting && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-purple-400 uppercase tracking-wider mb-1.5">
                      A message from {selectedPersona.displayName}
                    </p>
                    <p className="text-sm text-gray-700 italic leading-relaxed">
                      "{selectedPersona.sampleGreeting}"
                    </p>
                  </div>
                )}

                {/* Pricing */}
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                    Pricing
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-green-600 mb-3">
                    <Clock className="w-4 h-4" />
                    <span>
                      First {selectedPersona.pricing.freeMinutes} minutes free
                    </span>
                  </div>
                  <div className="space-y-2">
                    {selectedPersona.pricing.tiers.map((tier) => (
                      <div
                        key={tier.packageType}
                        className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
                      >
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {tier.label}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            ({tier.minutes} min)
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatPrice(tier.priceUsd)}
                          </span>
                          {tier.pricePerMinute && (
                            <span className="text-xs text-gray-400 ml-1">
                              ({formatPrice(tier.pricePerMinute)}/min)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-5"
                  onClick={() =>
                    navigate(
                      `/chat-service?persona=${selectedPersona.slug}`,
                    )
                  }
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Reading with {selectedPersona.displayName}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
