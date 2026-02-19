import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Star,
  Clock,
  Users,
  Gift,
  Crown,
  Heart,
  Eye,
  MessageCircle,
  Sparkles,
  Award,
  Compass,
  ChevronRight,
  Zap,
  CheckCircle2,
  Briefcase,
} from "lucide-react";

/* ================================================================
   Types
   ================================================================ */

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
  freeCoins: number;
  categories: string[];
  pricing: { freeCoins: number; tiers: PricingTier[] };
  specialties: string[];
  sampleGreeting: string | null;
  stats: { totalReadings: number; uniqueClients: number };
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
  freeCoins: number;
  customPricing: string | null;
  pricingTiers?: PricingTier[];
}

/* ================================================================
   Constants
   ================================================================ */

const CATEGORY_LABELS: Record<string, string> = {
  love: "Love & Relationships",
  money: "Money & Abundance",
  purpose: "Life Purpose",
  career: "Career",
  spiritual: "Spiritual Growth",
  general: "General Guidance",
};

const CATEGORY_SHORT: Record<string, string> = {
  love: "Love",
  money: "Money",
  purpose: "Purpose",
  career: "Career",
  spiritual: "Spiritual",
  general: "General",
};

const SECTION_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  love: Heart,
  money: Briefcase,
  purpose: Compass,
  career: Award,
  spiritual: Eye,
  general: Sparkles,
};

/* ================================================================
   Utilities
   ================================================================ */

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) % 1000;
  }
  return h;
}

function generateRating(name: string): number {
  return 4.0 + (hashName(name) % 10) / 10;
}

function generateYearsExp(name: string): number {
  return 3 + (hashName(name) % 13);
}

function generateReadings(name: string): number {
  return 200 + (hashName(name) % 4800);
}

type Status = {
  label: "Online" | "Busy";
  bgClass: string;
  textClass: string;
  borderClass: string;
};

function getStatus(name: string): Status {
  const isOnline = hashName(name) % 3 !== 2;
  return isOnline
    ? {
        label: "Online",
        bgClass: "bg-teal-500/10",
        textClass: "text-teal-400",
        borderClass: "border-teal-500/20",
      }
    : {
        label: "Busy",
        bgClass: "bg-rose-500/10",
        textClass: "text-rose-400",
        borderClass: "border-rose-500/20",
      };
}

/* ================================================================
   StarRating
   ================================================================ */

function StarRating({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const px = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`${px} ${
              s <= Math.floor(rating)
                ? "text-amber-400 fill-amber-400"
                : s - 0.5 <= rating
                  ? "text-amber-400 fill-amber-400/50"
                  : "text-white/10"
            }`}
          />
        ))}
      </span>
      <span
        className={`font-semibold ${size === "md" ? "text-sm" : "text-[12px]"} text-white/65`}
      >
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

/* ================================================================
   PersonaCard
   ================================================================ */

function PersonaCard({
  persona,
  index = 0,
  onViewDetails,
}: {
  persona: PersonaListing;
  index?: number;
  onViewDetails: () => void;
}) {
  const rating = useMemo(
    () => generateRating(persona.displayName),
    [persona.displayName],
  );
  const status = useMemo(
    () => getStatus(persona.displayName),
    [persona.displayName],
  );
  const yearsExp = useMemo(
    () => generateYearsExp(persona.displayName),
    [persona.displayName],
  );
  const readings = useMemo(
    () => generateReadings(persona.displayName),
    [persona.displayName],
  );

  return (
    <div
      className="animate-mp-fade-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div
        className="mp-card bg-[#10102a]/90 border border-white/[0.06] rounded-xl p-5 flex flex-col gap-3 cursor-pointer h-full"
        onClick={onViewDetails}
      >
        {/* ── Header: Avatar + Name + Rating + Status ── */}
        <div className="flex items-start gap-3">
          <Avatar className="w-16 h-16 shrink-0 ring-2 ring-white/[0.08] ring-offset-2 ring-offset-[#10102a]">
            <AvatarImage
              src={persona.avatarUrl || "/evelyn-avatar.png"}
              alt={persona.displayName}
            />
            <AvatarFallback className="bg-white/5 text-white/60">
              {persona.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-[18px] font-semibold text-white leading-tight truncate">
              {persona.displayName}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StarRating rating={rating} />
              {persona.isDefault && (
                <span className="text-[10px] px-2 py-[2px] rounded bg-amber-500/15 text-amber-300 font-bold uppercase tracking-wider border border-amber-500/15">
                  Top
                </span>
              )}
              <span
                className={`text-[11px] px-2 py-[2px] rounded-full font-semibold ${status.bgClass} ${status.textClass} border ${status.borderClass}`}
              >
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* ── Tags ── */}
        <div className="flex flex-wrap gap-1.5">
          {persona.categories?.slice(0, 4).map((cat) => (
            <span
              key={cat}
              className="text-[12px] px-2.5 py-[3px] rounded-full bg-white/[0.05] text-white/55 border border-white/[0.07] font-medium leading-none"
            >
              {CATEGORY_SHORT[cat] || cat}
            </span>
          ))}
        </div>

        {/* ── Checkmark stats ── */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[13px] text-white/55">
            <CheckCircle2 className="w-3.5 h-3.5 text-white/30 shrink-0" />
            <span>{yearsExp} years experience</span>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-white/55">
            <CheckCircle2 className="w-3.5 h-3.5 text-white/30 shrink-0" />
            <span>{readings.toLocaleString()} readings</span>
          </div>
        </div>

        {/* ── Description ── */}
        {persona.description && (
          <p className="text-[13px] text-white/40 line-clamp-2 leading-[1.65]">
            {persona.description}
          </p>
        )}

        {/* ── Buttons ── */}
        <div className="flex gap-2 mt-auto pt-1">
          <Link
            href={`/reading?persona=${persona.slug}`}
            className="flex-1"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <Button
              size="sm"
              className="w-full bg-purple-600 hover:bg-purple-500 text-white text-[13px] h-[38px] rounded-lg font-medium tracking-wide"
            >
              Start Chat
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="text-[13px] h-[38px] rounded-lg border-white/[0.1] text-white/60 bg-transparent hover:bg-white/[0.05] hover:text-white/80 hover:border-white/[0.15] font-medium px-3"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
          >
            View Profile
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Section
   ================================================================ */

function Section({
  icon: Icon,
  title,
  subtitle,
  delay = 0,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="animate-mp-section bg-[#0c0c24]/70 border border-white/[0.04] rounded-2xl p-5 md:p-6"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-[3px]">
            <span className="w-[30px] h-[30px] rounded-md bg-amber-500/8 border border-amber-400/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-amber-400/80" />
            </span>
            <h2 className="text-[16px] font-bold text-white uppercase tracking-[0.1em] leading-none">
              {title}
            </h2>
          </div>
          <p className="text-[13px] text-white/40 pl-[38px]">{subtitle}</p>
        </div>
        <button className="flex items-center gap-0.5 text-[13px] text-white/40 hover:text-white/60 transition-colors font-medium shrink-0 mt-0.5 group">
          View All
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
      {children}
    </div>
  );
}

/* ================================================================
   FeaturedCard — "Guide of the Day"
   ================================================================ */

function FeaturedCard({
  persona,
  onViewDetails,
}: {
  persona: PersonaListing;
  onViewDetails: () => void;
}) {
  const rating = useMemo(
    () => generateRating(persona.displayName),
    [persona.displayName],
  );
  const status = useMemo(
    () => getStatus(persona.displayName),
    [persona.displayName],
  );
  const yearsExp = useMemo(
    () => generateYearsExp(persona.displayName),
    [persona.displayName],
  );
  const readings = useMemo(
    () => generateReadings(persona.displayName),
    [persona.displayName],
  );

  return (
    <div
      className="mp-card relative overflow-hidden bg-[#10102a]/90 border border-white/[0.06] rounded-xl cursor-pointer"
      onClick={onViewDetails}
    >
      <div className="relative flex flex-col sm:flex-row items-start gap-5 p-5 md:p-6">
        {/* Avatar */}
        <Avatar className="w-[80px] h-[80px] shrink-0 ring-2 ring-white/[0.08] ring-offset-[3px] ring-offset-[#10102a]">
          <AvatarImage
            src={persona.avatarUrl || "/evelyn-avatar.png"}
            alt={persona.displayName}
          />
          <AvatarFallback className="bg-white/5 text-white/60 text-2xl">
            {persona.displayName.charAt(0)}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h3 className="font-serif text-[22px] font-bold text-white">
              {persona.displayName}
            </h3>
            <StarRating rating={rating} size="md" />
            <span
              className={`text-[11px] px-2 py-[2px] rounded-full font-semibold ${status.bgClass} ${status.textClass} border ${status.borderClass}`}
            >
              {status.label}
            </span>
          </div>

          {persona.tagline && (
            <p className="text-[14px] text-white/50 mb-2.5 leading-snug">
              {persona.tagline}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {persona.categories?.map((cat) => (
              <span
                key={cat}
                className="text-[12px] px-2.5 py-[3px] rounded-full bg-white/[0.05] text-white/55 border border-white/[0.07] font-medium leading-none"
              >
                {CATEGORY_LABELS[cat] || cat}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-5 text-[13px] text-white/50 mb-2.5">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-white/30" />
              {yearsExp} yrs experience
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-white/30" />
              {readings.toLocaleString()} readings
            </span>
          </div>

          {persona.description && (
            <p className="text-[13px] text-white/40 line-clamp-2 leading-[1.65] max-w-xl">
              {persona.description}
            </p>
          )}
        </div>

        {/* CTAs */}
        <div className="flex flex-row sm:flex-col gap-2.5 shrink-0">
          <Link href={`/reading?persona=${persona.slug}`}>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-500 text-white text-[13px] font-medium px-5 h-[40px]"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              Start Reading
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="text-[13px] h-[40px] border-white/[0.1] text-white/60 bg-transparent hover:bg-white/[0.05] hover:text-white/80 hover:border-white/[0.15] font-medium px-4"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
          >
            View Profile
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   PromoCTA
   ================================================================ */

function PromoCTA() {
  return (
    <div className="animate-mp-aura relative overflow-hidden rounded-2xl border border-white/[0.04]">
      <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c24] via-[#14102e] to-[#0c0c24]" />

      <div className="relative px-6 py-7 md:px-8 md:py-8 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1">
          <h3 className="font-serif text-[22px] md:text-[24px] text-white mb-3 leading-snug">
            Accurate Insights in your App
          </h3>
          <div className="space-y-2.5 mb-5">
            {[
              "Personalized spiritual guidance",
              "In-depth astrology, numerology & tarot",
              "Connect with a guide at any time",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <span className="w-[20px] h-[20px] rounded-full bg-amber-500/8 border border-amber-400/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5 text-amber-400/70" />
                </span>
                <span className="text-[13px] text-white/50 leading-snug">
                  {item}
                </span>
              </div>
            ))}
          </div>
          <Link href="/credits">
            <Button className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-7 h-10 text-[13px] tracking-wide">
              <Zap className="w-4 h-4 mr-2" />
              Get Free Credits
            </Button>
          </Link>
        </div>

        <div className="hidden md:flex items-center justify-center">
          <div className="relative w-52 h-52">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.04] rotate-3" />
            <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-white/[0.02] to-transparent border border-white/[0.03] -rotate-2 flex items-center justify-center">
              <div className="text-center">
                <Sparkles className="w-10 h-10 text-amber-400/15 mx-auto mb-2" />
                <span className="text-[11px] text-white/15 uppercase tracking-[0.2em] font-semibold">
                  The Seer Within
                </span>
              </div>
            </div>
            <div className="absolute -top-2 -right-2">
              <Sparkles className="w-5 h-5 text-amber-400/20" />
            </div>
            <div className="absolute -bottom-1 -left-1">
              <Heart className="w-4 h-4 text-rose-400/15 fill-current" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Main Page
   ================================================================ */

export default function PersonasDirectory() {
  const { user } = useAuth();
  const isReturningUser = (user?.totalCoinsUsed ?? 0) > 0;

  const [personas, setPersonas] = useState<PersonaListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPersona, setSelectedPersona] = useState<PersonaDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
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

  const featuredPersona = useMemo(
    () => personas.find((p) => p.isDefault) || personas[0] || null,
    [personas],
  );

  const categorySections = useMemo(() => {
    const sections: Record<string, PersonaListing[]> = {};
    for (const p of personas) {
      for (const cat of p.categories || []) {
        if (!sections[cat]) sections[cat] = [];
        if (!sections[cat].find((x) => x.id === p.id)) {
          sections[cat].push(p);
        }
      }
    }
    return Object.entries(sections).filter(([, list]) => list.length > 0);
  }, [personas]);

  const visibleAll = showAll ? personas : personas.slice(0, 6);

  let sectionDelay = 0;
  function nextDelay() {
    sectionDelay += 120;
    return sectionDelay;
  }

  return (
    <>
      <div className="max-w-[960px] mx-auto px-4 py-8 md:py-10">
        {/* ── Header ── */}
        <h1
          className="animate-mp-fade-up font-serif text-[36px] md:text-[44px] text-white text-center mb-2 tracking-tight leading-[1.1]"
          style={{ animationDelay: "0ms" }}
        >
          Choose your guide
        </h1>
        <p
          className="animate-mp-fade-up text-center text-[15px] text-white/40 mb-8 italic"
          style={{ animationDelay: "40ms" }}
        >
          Some connections are written before you arrive.
        </p>

        {/* ── Promo Banner — new users only ── */}
        {!isReturningUser && (
          <div
            className="animate-mp-fade-up flex justify-center mb-10"
            style={{ animationDelay: "80ms" }}
          >
            <div className="inline-flex items-center gap-3 bg-purple-600/90 rounded-full pl-3 pr-6 py-2.5 shadow-lg shadow-purple-900/30">
              <span className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center shrink-0">
                <Gift className="w-[18px] h-[18px] text-purple-900" />
              </span>
              <span className="text-[14px] text-white/90">
                You have{" "}
                <strong className="text-white font-bold">3 FREE minutes</strong>{" "}
                with 1 guide
              </span>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-white/20 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ── Content ── */}
        {!loading && personas.length > 0 && (
          <div className="space-y-7">
            {/* VOTED MOST ACCURATE */}
            <Section
              icon={Award}
              title="Voted Most Accurate"
              subtitle="Most accurate in their predictions and guidance"
              delay={nextDelay()}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...personas]
                  .sort(
                    (a, b) =>
                      generateRating(b.displayName) -
                      generateRating(a.displayName),
                  )
                  .slice(0, 3)
                  .map((p, i) => (
                    <PersonaCard
                      key={p.id}
                      persona={p}
                      index={i}
                      onViewDetails={() => openDetail(p.slug)}
                    />
                  ))}
              </div>
            </Section>

            {/* BEST IN LOVE READINGS */}
            {categorySections
              .filter(([cat]) => cat === "love")
              .map(([cat, catPersonas]) => (
                <Section
                  key={cat}
                  icon={Heart}
                  title="Best In Love Readings"
                  subtitle="The best in the field of love and relationships"
                  delay={nextDelay()}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catPersonas.slice(0, 3).map((p, i) => (
                      <PersonaCard
                        key={p.id}
                        persona={p}
                        index={i}
                        onViewDetails={() => openDetail(p.slug)}
                      />
                    ))}
                  </div>
                </Section>
              ))}

            {/* GUIDE OF THE DAY */}
            {featuredPersona && (
              <Section
                icon={Star}
                title="Guide Of The Day"
                subtitle="Our featured spiritual guide"
                delay={nextDelay()}
              >
                <FeaturedCard
                  persona={featuredPersona}
                  onViewDetails={() => openDetail(featuredPersona.slug)}
                />
              </Section>
            )}

            {/* RECOMMENDED FOR YOU */}
            <Section
              icon={Crown}
              title="Recommended For You"
              subtitle="Best matches with your profile and highly recommended"
              delay={nextDelay()}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {personas.slice(0, 3).map((p, i) => (
                  <PersonaCard
                    key={p.id}
                    persona={p}
                    index={i}
                    onViewDetails={() => openDetail(p.slug)}
                  />
                ))}
              </div>
            </Section>

            {/* PROMO CTA */}
            <div
              className="animate-mp-section"
              style={{ animationDelay: `${nextDelay()}ms` }}
            >
              <PromoCTA />
            </div>

            {/* TOP RATED */}
            {personas.length > 1 && (
              <Section
                icon={Sparkles}
                title="Top Rated"
                subtitle="Superior guides rated by thousands of users"
                delay={nextDelay()}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...personas]
                    .sort(
                      (a, b) =>
                        generateRating(b.displayName) -
                        generateRating(a.displayName),
                    )
                    .slice(0, 3)
                    .map((p, i) => (
                      <PersonaCard
                        key={p.id}
                        persona={p}
                        index={i}
                        onViewDetails={() => openDetail(p.slug)}
                      />
                    ))}
                </div>
              </Section>
            )}

            {/* ALL PSYCHICS */}
            <Section
              icon={Users}
              title="All Psychics"
              subtitle="Browse all available spiritual guides"
              delay={nextDelay()}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleAll.map((p, i) => (
                  <PersonaCard
                    key={p.id}
                    persona={p}
                    index={i}
                    onViewDetails={() => openDetail(p.slug)}
                  />
                ))}
              </div>
              {!showAll && personas.length > 6 && (
                <div className="flex justify-center mt-7">
                  <Button
                    variant="outline"
                    className="border-white/[0.1] text-white/50 bg-transparent hover:bg-white/[0.05] hover:text-white/70 hover:border-white/[0.15] rounded-full px-8 h-10 text-[12px] font-medium tracking-wide"
                    onClick={() => setShowAll(true)}
                  >
                    Browse more psychics
                  </Button>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && personas.length === 0 && (
          <div className="text-center py-24">
            <Sparkles className="w-10 h-10 text-white/10 mx-auto mb-4" />
            <p className="text-white/45 text-sm">
              No guides available yet. Check back soon.
            </p>
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="mt-16 pt-8 border-t border-white/[0.04]">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-white/35 mb-5">
            <Link
              href="/privacy"
              className="hover:text-white/40 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-white/40 transition-colors"
            >
              Terms of Use
            </Link>
            <Link
              href="/refund"
              className="hover:text-white/40 transition-colors"
            >
              Refund Policy
            </Link>
            <Link
              href="/credits"
              className="hover:text-white/40 transition-colors"
            >
              Payment Info
            </Link>
          </div>
          <p className="text-center text-[12px] text-white/25 tracking-wide">
            The Seer Within &middot; Spiritual guidance for your journey
          </p>
        </footer>
      </div>

      {/* ================================================================
         Detail Modal
         ================================================================ */}
      <Dialog
        open={!!selectedPersona || detailLoading}
        onOpenChange={(open) => {
          if (!open) setSelectedPersona(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-[#0c0c24] border-white/[0.06] text-white !rounded-2xl">
          {detailLoading && !selectedPersona && (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-2 border-white/20 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {selectedPersona && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-5">
                  <Avatar className="w-24 h-24 shrink-0 ring-2 ring-white/[0.08] ring-offset-[3px] ring-offset-[#0c0c24]">
                    <AvatarImage
                      src={
                        selectedPersona.avatarUrl || "/evelyn-avatar.png"
                      }
                      alt={selectedPersona.displayName}
                    />
                    <AvatarFallback className="bg-white/5 text-white/60 text-2xl">
                      {selectedPersona.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="font-serif text-[24px] text-white flex items-center gap-2">
                      {selectedPersona.displayName}
                      {selectedPersona.isDefault && (
                        <span className="text-[11px] px-2 py-[2px] rounded bg-amber-500/15 text-amber-300 font-bold uppercase tracking-wider border border-amber-500/15">
                          Top
                        </span>
                      )}
                    </DialogTitle>
                    {selectedPersona.tagline && (
                      <p className="text-[15px] text-white/55 mt-1.5">
                        {selectedPersona.tagline}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <StarRating
                        rating={generateRating(selectedPersona.displayName)}
                        size="md"
                      />
                      <span
                        className={`text-[12px] px-2.5 py-[2px] rounded-full font-semibold ${getStatus(selectedPersona.displayName).bgClass} ${getStatus(selectedPersona.displayName).textClass} border ${getStatus(selectedPersona.displayName).borderClass}`}
                      >
                        {getStatus(selectedPersona.displayName).label}
                      </span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 mt-5">
                {/* Stats */}
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-white/55">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-white/35" />
                    {generateYearsExp(selectedPersona.displayName)} years experience
                  </span>
                  <span className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-white/35" />
                    {generateReadings(selectedPersona.displayName).toLocaleString()} readings
                  </span>
                  {selectedPersona.stats.uniqueClients > 0 && (
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-white/35" />
                      {selectedPersona.stats.uniqueClients} clients
                    </span>
                  )}
                </div>

                {/* Description */}
                {selectedPersona.description && (
                  <p className="text-[15px] text-white/65 leading-[1.75]">
                    {selectedPersona.description}
                  </p>
                )}

                {/* Categories & Specialties */}
                {(selectedPersona.categories.length > 0 ||
                  selectedPersona.specialties.length > 0) && (
                  <div>
                    <p className="text-[12px] font-bold text-white/30 uppercase tracking-[0.18em] mb-2.5">
                      Specialties
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPersona.categories.map((cat) => (
                        <span
                          key={cat}
                          className="text-[13px] px-3 py-1 rounded-full bg-white/[0.05] text-white/60 border border-white/[0.07] font-medium"
                        >
                          {CATEGORY_LABELS[cat] || cat}
                        </span>
                      ))}
                      {selectedPersona.specialties.map((spec) => (
                        <span
                          key={spec}
                          className="text-[13px] px-3 py-1 rounded-full bg-white/[0.05] text-white/60 border border-white/[0.07] font-medium"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sample Greeting */}
                {selectedPersona.sampleGreeting && (
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5">
                    <p className="text-[12px] font-bold text-white/30 uppercase tracking-[0.18em] mb-2.5">
                      A message from {selectedPersona.displayName}
                    </p>
                    <p className="text-[15px] text-white/60 italic leading-[1.75]">
                      &ldquo;{selectedPersona.sampleGreeting}&rdquo;
                    </p>
                  </div>
                )}

                {/* Session note */}
                <div className="flex items-center gap-2 text-[15px] text-teal-400">
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isReturningUser
                      ? `${selectedPersona.displayName} is ready to receive you`
                      : `${selectedPersona.pricing.freeCoins} free coins to get started`}
                  </span>
                </div>

                {/* CTA */}
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white py-6 text-[15px] font-medium tracking-wide"
                  onClick={() =>
                    navigate(`/reading?persona=${selectedPersona.slug}`)
                  }
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Start Reading with {selectedPersona.displayName}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
