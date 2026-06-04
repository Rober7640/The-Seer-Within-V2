import { useState, useEffect, useMemo } from "react";
import { useAuth, authFetch } from "@/hooks/useAuth";
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
  CheckCircle2,
  Briefcase,
  LogIn,
  UserPlus,
  Mail,
  Coins,
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

interface PersonaReview {
  id: string;
  reviewerName: string;
  reviewText: string | null;
  starRating: number;
  createdAt: string;
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
  coinsPerMinute?: number;
  categories: string[];
  pricing: { freeCoins: number; tiers: PricingTier[] };
  specialties: string[];
  sampleGreeting: string | null;
  stats: { totalReadings: number; uniqueClients: number };
  overallRating?: number | null;
  yearsExperience?: number | null;
  readingsCount?: number | null;
  isOnline?: boolean;
  reviews?: PersonaReview[];
  userReviews?: PersonaReview[];
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
  isFeatured?: boolean;
  accuracyRank?: number | null;
  freeCoins: number;
  coinsPerMinute?: number;
  customPricing: string | null;
  pricingTiers?: PricingTier[];
  overallRating?: number | null;
  yearsExperience?: number | null;
  readingsCount?: number | null;
  isOnline?: boolean;
  /** Promotional coins this user has for this guide (e.g. 6/6 promo). 0/undefined = none. */
  promoCoins?: number;
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

// The 6/6 promo offer size, in minutes — shown as the static "6 mins free" fallback on
// the /6-6 lander cards (before login / before the user's real grant has loaded).
const PROMO_OFFER_MINUTES = 6;

// Format promo coins as remaining minutes:seconds for the "free with [guide]" badge.
// e.g. 360 coins @ 60/min → "6:00", 105 coins @ 60/min → "1:45".
function formatPromoMins(coins: number, coinsPerMinute: number): string {
  const totalSeconds = Math.round((coins / (coinsPerMinute || 60)) * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

// Small "X:XX free" badge shown on a card when the user has promo coins for that guide.
function PromoBadge({ coins, coinsPerMinute }: { coins: number; coinsPerMinute: number }) {
  if (!coins || coins <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-[3px] rounded-full bg-emerald-500/15 text-emerald-300 font-bold uppercase tracking-wider border border-emerald-500/25">
      🎁 {formatPromoMins(coins, coinsPerMinute)} free
    </span>
  );
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

/* Returns "~$X.XX/min" using the best-value pricing tier, or null if no tiers */

/* ================================================================
   PersonaCard
   ================================================================ */

function PersonaCard({
  persona,
  index = 0,
  onViewDetails,
  onStartChat,
  showFreeMins = false,
  promoMode = false,
}: {
  persona: PersonaListing;
  index?: number;
  onViewDetails: () => void;
  onStartChat: () => void;
  showFreeMins?: boolean;
  promoMode?: boolean;
}) {
  const rating = useMemo(
    () => persona.overallRating ?? generateRating(persona.displayName),
    [persona.displayName, persona.overallRating],
  );
  const status = useMemo((): Status => {
    if (persona.isOnline === true) return { label: "Online", bgClass: "bg-teal-500/10", textClass: "text-teal-400", borderClass: "border-teal-500/20" };
    if (persona.isOnline === false) return { label: "Busy", bgClass: "bg-rose-500/10", textClass: "text-rose-400", borderClass: "border-rose-500/20" };
    return getStatus(persona.displayName);
  }, [persona.displayName, persona.isOnline]);
  const yearsExp = useMemo(
    () => persona.yearsExperience ?? generateYearsExp(persona.displayName),
    [persona.displayName, persona.yearsExperience],
  );
  const readings = useMemo(
    () => persona.readingsCount ?? generateReadings(persona.displayName),
    [persona.displayName, persona.readingsCount],
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
          <div className="flex items-center gap-2 text-[12px] text-white/35">
            <Coins className="w-3 h-3 text-amber-400/40 shrink-0" />
            <span>
              {persona.coinsPerMinute ?? 60} coins = 1 min
              {showFreeMins && !(persona.promoCoins ?? 0) && (promoMode
                ? ` · ${PROMO_OFFER_MINUTES} mins free`
                : (persona.freeCoins > 0 ? ` · ${Math.floor(persona.freeCoins / (persona.coinsPerMinute ?? 60))} mins free` : ``))}
            </span>
          </div>
          {(persona.promoCoins ?? 0) > 0 && (
            <div className="pt-0.5">
              <PromoBadge coins={persona.promoCoins ?? 0} coinsPerMinute={persona.coinsPerMinute ?? 60} />
            </div>
          )}
        </div>

        {/* ── Description ── */}
        {persona.description && (
          <p className="text-[13px] text-white/40 line-clamp-2 leading-[1.65]">
            {persona.description}
          </p>
        )}

        {/* ── Buttons ── */}
        <div className="flex gap-2 mt-auto pt-1">
          <Button
            size="sm"
            className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-[13px] h-[38px] rounded-lg font-medium tracking-wide"
            onClick={(e) => {
              e.stopPropagation();
              onStartChat();
            }}
          >
            Start Chat
          </Button>
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
      <div className="mb-4">
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
  onStartChat,
  showFreeMins = false,
  promoMode = false,
}: {
  persona: PersonaListing;
  onViewDetails: () => void;
  onStartChat: () => void;
  showFreeMins?: boolean;
  promoMode?: boolean;
}) {
  const rating = useMemo(
    () => persona.overallRating ?? generateRating(persona.displayName),
    [persona.displayName, persona.overallRating],
  );
  const status = useMemo((): Status => {
    if (persona.isOnline === true) return { label: "Online", bgClass: "bg-teal-500/10", textClass: "text-teal-400", borderClass: "border-teal-500/20" };
    if (persona.isOnline === false) return { label: "Busy", bgClass: "bg-rose-500/10", textClass: "text-rose-400", borderClass: "border-rose-500/20" };
    return getStatus(persona.displayName);
  }, [persona.displayName, persona.isOnline]);
  const yearsExp = useMemo(
    () => persona.yearsExperience ?? generateYearsExp(persona.displayName),
    [persona.displayName, persona.yearsExperience],
  );
  const readings = useMemo(
    () => persona.readingsCount ?? generateReadings(persona.displayName),
    [persona.displayName, persona.readingsCount],
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

          <div className="flex items-center gap-5 text-[13px] text-white/50 mb-2.5 flex-wrap">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-white/30" />
              {yearsExp} yrs experience
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-white/30" />
              {readings.toLocaleString()} readings
            </span>
            <span className="flex items-center gap-1.5 text-[12px] text-white/35">
              <Coins className="w-3 h-3 text-amber-400/40" />
              {persona.coinsPerMinute ?? 60} coins = 1 min
              {showFreeMins && !(persona.promoCoins ?? 0) && (promoMode
                ? ` · ${PROMO_OFFER_MINUTES} mins free`
                : (persona.freeCoins > 0 ? ` · ${Math.floor(persona.freeCoins / (persona.coinsPerMinute ?? 60))} mins free` : ``))}
            </span>
            {(persona.promoCoins ?? 0) > 0 && (
              <PromoBadge coins={persona.promoCoins ?? 0} coinsPerMinute={persona.coinsPerMinute ?? 60} />
            )}
          </div>

          {persona.description && (
            <p className="text-[13px] text-white/40 line-clamp-2 leading-[1.65] max-w-xl">
              {persona.description}
            </p>
          )}
        </div>

        {/* CTAs */}
        <div className="flex flex-row sm:flex-col gap-2.5 shrink-0">
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-500 text-white text-[13px] font-medium px-5 h-[40px]"
            onClick={(e) => {
              e.stopPropagation();
              onStartChat();
            }}
          >
            Start Reading
          </Button>
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
   Main Page
   ================================================================ */

export default function PersonasDirectory({ promoMode = false }: { promoMode?: boolean } = {}) {
  const { user, isLoading: authLoading, login, register } = useAuth();
  const isReturningUser = (user?.totalCoinsUsed ?? 0) > 0;

  const [rawPersonas, setRawPersonas] = useState<PersonaListing[]>([]);
  // Per-persona promo balances fetched separately (auth-gated). Kept in its own state
  // and merged below via useMemo so the two async loads can't race / clobber each other.
  const [promoBalances, setPromoBalances] = useState<Record<string, number>>({});
  const personas = useMemo(
    () => rawPersonas.map((p) => ({ ...p, promoCoins: promoBalances[p.id] ?? 0 })),
    [rawPersonas, promoBalances],
  );
  const [loading, setLoading] = useState(true);
  const [selectedPersona, setSelectedPersona] = useState<PersonaDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [, navigate] = useLocation();

  // Auth modal state (for guest "Start Chat" flow)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPersonaSlug, setAuthPersonaSlug] = useState<string | null>(null);
  const [authPersonaName, setAuthPersonaName] = useState<string | null>(null);
  const [authPersonaAvatar, setAuthPersonaAvatar] = useState<string | null>(null);
  const [authIsSignUp, setAuthIsSignUp] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFirstName, setAuthFirstName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [authVerificationSent, setAuthVerificationSent] = useState(false);
  const [authResendEmail, setAuthResendEmail] = useState("");
  const [authResendLoading, setAuthResendLoading] = useState(false);
  // Passwordless accounts: the login endpoint emails a sign-in link and returns a
  // NO_PASSWORD error. That's a SUCCESS for the user, so we show a green "check your
  // email" panel instead of leaking the raw error text in red.
  const [authMagicLinkSent, setAuthMagicLinkSent] = useState(false);
  // True when the popup was opened by the nav's generic "Sign in" (no guide chosen) — those
  // users stay on /6-6 after auth. False when opened from a guide card's "Start chat" — those
  // go straight into that guide's chat once the promo is claimed (#4).
  const [authStayOnPromo, setAuthStayOnPromo] = useState(false);

  // Queued Start Chat click received while auth was still loading (FRICTION-12)
  const [pendingChatSlug, setPendingChatSlug] = useState<{ slug: string; name: string; avatar: string | null } | null>(null);

  useEffect(() => {
    async function fetchPersonas() {
      try {
        const res = await fetch("/api/personas?pricing=true");
        if (res.ok) {
          const data = await res.json();
          setRawPersonas(data);
        }
      } catch (err) {
        console.error("Failed to fetch personas:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPersonas();
  }, []);

  // Once logged in, fetch this user's per-persona promo balances (6/6 promo etc.).
  // Stored separately and merged into `personas` via useMemo, so it can't race the
  // persona-list load. Re-runs when auth resolves. Non-fatal — failures leave promo at 0.
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        // On the /6-6 lander, claiming is what grants the 6 free minutes — and it ONLY
        // happens here (never on /login or /personas). Fire it before reading balances so
        // the badges reflect the just-granted coins. Buyer/already-claimed handled server-side.
        if (promoMode) {
          await authFetch("/api/chat-service/promo-claim", { method: "POST" }).catch(() => {});
          if (cancelled) return;
          // If the user got here via a passwordless sign-in link after picking a guide,
          // forward them into that guide's chat now that the promo is claimed (#5b,
          // same-device). Cross-device clicks have no stored guide → they stay on /6-6.
          const pendingPersona = localStorage.getItem("seer-6-6-pending-persona");
          if (pendingPersona) {
            localStorage.removeItem("seer-6-6-pending-persona");
            navigate(`/reading?persona=${pendingPersona}`);
            return;
          }
        }
        const res = await authFetch("/api/chat-service/promo-balances");
        if (!res.ok) return;
        const { balances } = await res.json() as { balances: Record<string, number> };
        if (cancelled || !balances) return;
        setPromoBalances(balances);
      } catch {
        /* promo display is best-effort */
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user, promoMode]);

  // Resolve a queued Start Chat once auth finishes loading (FRICTION-12)
  useEffect(() => {
    if (authLoading || !pendingChatSlug) return;
    const pending = pendingChatSlug;
    setPendingChatSlug(null);
    if (user) {
      navigate(`/reading?persona=${pending.slug}`);
    } else {
      openAuthModal(pending.slug, pending.name, pending.avatar);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, pendingChatSlug, user]);

  function openAuthModal(slug: string, displayName: string, avatarUrl: string | null, isSignUp = true, stayOnPromo = false) {
    setAuthPersonaSlug(slug);
    setAuthPersonaName(displayName);
    setAuthPersonaAvatar(avatarUrl);
    setAuthIsSignUp(isSignUp);
    setAuthStayOnPromo(stayOnPromo);
    setAuthEmail("");
    setAuthPassword("");
    setAuthFirstName("");
    setAuthError(null);
    setAuthVerificationSent(false);
    setAuthMagicLinkSent(false);
    setShowAuthModal(true);
  }

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

  function handleStartChat(slug: string, displayName: string, avatarUrl: string | null) {
    if (authLoading) {
      // Queue and resolve once auth finishes loading (FRICTION-12)
      setPendingChatSlug({ slug, name: displayName, avatar: avatarUrl });
      return;
    }
    if (user) {
      navigate(`/reading?persona=${slug}`);
    } else if (slug === 'aiden-powers' && !promoMode) {
      // Route to the Aiden quiz funnel instead of generic auth modal — but NOT on the
      // 6/6 promo lander, where every guide (Aiden included) opens the same account
      // popup so the promo claim can run.
      navigate('/aiden');
    } else {
      openAuthModal(slug, displayName, avatarUrl);
    }
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setFormLoading(true);
    try {
      if (authIsSignUp) {
        const data = await register(authEmail, authPassword, authFirstName);
        // On the /6-6 promo, grant immediately on signup: register already issued a token
        // (the user is authenticated), so we skip the verification wall and let them stay
        // on /6-6 — the claim fires and they can use the 6 min now. The verification email
        // still goes out for later, exactly like the lander signups.
        if (data.requiresVerification && !promoMode) {
          // Persist slug so it survives the email-verification redirect (FRICTION-3)
          if (authPersonaSlug) {
            localStorage.setItem("seer-pending-persona", authPersonaSlug);
          }
          setAuthVerificationSent(true);
          setAuthResendEmail(authEmail);
          return;
        }
      } else {
        // Passwordless accounts get an emailed sign-in link; redirect back to /6-6 so the
        // claim runs on return. The chosen guide is remembered in the catch below so a
        // same-device magic-link click lands in that guide's chat (#5b).
        await login(authEmail, authPassword, promoMode ? "/6-6" : undefined);
      }
      setShowAuthModal(false);
      if (promoMode) {
        // Claim now — before we leave /6-6 — because the on-/6-6 claim effect won't run
        // once we navigate away. Idempotent server-side, so a re-claim is harmless.
        await authFetch("/api/chat-service/promo-claim", { method: "POST" }).catch(() => {});
        // Generic nav "Sign in" (no guide chosen) stays on /6-6; a guide-card "Start chat"
        // sends the user straight into that guide's chat (#4).
        if (authStayOnPromo) return;
        navigate(`/reading?persona=${authPersonaSlug}`);
        return;
      }
      const target = `/reading?persona=${authPersonaSlug}`;
      navigate(target);
    } catch (err: any) {
      console.error("[PersonasDirectory] auth error:", err);
      const msg = typeof err?.message === "string" ? err.message : "";
      if (msg.includes("NO_PASSWORD")) {
        // Passwordless account — the server already emailed the sign-in link.
        setAuthResendEmail(authEmail);
        setAuthMagicLinkSent(true);
        // Remember the chosen guide so a same-device magic-link click lands the user in that
        // guide's chat after returning to /6-6 (#5b). Skipped for the generic nav sign-in.
        if (promoMode && !authStayOnPromo && authPersonaSlug) {
          localStorage.setItem("seer-6-6-pending-persona", authPersonaSlug);
        }
      } else {
        setAuthError(
          msg.includes("401")
            ? "Invalid email or password"
            : msg || "Something went wrong",
        );
      }
    } finally {
      setFormLoading(false);
    }
  }

  async function handleModalResend() {
    setAuthResendLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authResendEmail }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAuthError(data.error || "Failed to resend");
      }
    } catch {
      setAuthError("Failed to resend verification email");
    } finally {
      setAuthResendLoading(false);
    }
  }

  const featuredPersona = useMemo(
    () => personas.find((p) => p.isFeatured) || personas.find((p) => p.isDefault) || personas[0] || null,
    [personas],
  );

  // On /6-6, the nav's top-right "Sign in" opens THIS page's auth popup (instead of
  // navigating away to /login) so the user stays on /6-6 and the promo claim can fire
  // right after auth. Defaults to login mode (the button says "Sign in"); the modal still
  // has a "create an account" toggle for brand-new visitors. Guarded to promoMode so the
  // nav's normal /login link is untouched everywhere else.
  useEffect(() => {
    if (!promoMode) return;
    function handleOpenAuth() {
      if (user) return; // already signed in — nothing to open
      const p = featuredPersona;
      openAuthModal(p?.slug ?? "", p?.displayName ?? "your guide", p?.avatarUrl ?? null, false, true);
    }
    window.addEventListener("seer:open-auth", handleOpenAuth);
    return () => window.removeEventListener("seer:open-auth", handleOpenAuth);
  }, [promoMode, user, featuredPersona]);

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

  // Show banner when redirected because previous persona is unavailable
  const searchParams = new URLSearchParams(window.location.search);
  const personaUnavailable = searchParams.get("unavailable") === "1";

  return (
    <>
      <div className="max-w-[960px] mx-auto px-4 py-8 md:py-10">
        {/* ── Unavailable persona banner ── */}
        {personaUnavailable && (
          <div className="mb-6 rounded-lg bg-amber-600/20 border border-amber-500/30 px-4 py-3 text-center text-[14px] text-amber-200">
            Your previous advisor is currently unavailable. Please choose another guide.
          </div>
        )}

        {/* ── Header ── */}
        <h1
          className="animate-mp-fade-up font-serif text-[36px] md:text-[44px] text-white text-center mb-2 tracking-tight leading-[1.1]"
          style={{ animationDelay: "0ms" }}
        >
          {promoMode ? "Your free minutes are waiting" : "Choose your guide"}
        </h1>
        <p
          className="animate-mp-fade-up text-center text-[15px] text-white/40 mb-8 italic"
          style={{ animationDelay: "40ms" }}
        >
          Some connections are written before you arrive.
        </p>

        {/* ── 6/6 Promo Banner — shown on the /6-6 promo landing for emailed users ── */}
        {promoMode && (
          <div
            className="animate-mp-fade-up flex justify-center mb-10"
            style={{ animationDelay: "80ms" }}
          >
            <div className="inline-flex items-center gap-3 bg-emerald-600/90 rounded-full pl-3 pr-6 py-2.5 shadow-lg shadow-emerald-900/30">
              <span className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center shrink-0">
                <Gift className="w-[18px] h-[18px] text-emerald-900" />
              </span>
              <span className="text-[14px] text-white/90">
                You have{" "}
                <strong className="text-white font-bold">6 FREE minutes</strong>{" "}
                with <strong className="text-white font-bold">every guide</strong> — tap one to begin
              </span>
            </div>
          </div>
        )}

        {/* ── Promo Banner — new users only (wait for auth to load) ── */}
        {!promoMode && !authLoading && !isReturningUser && (
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
                  .sort((a, b) => {
                    const ar = a.accuracyRank ?? null;
                    const br = b.accuracyRank ?? null;
                    if (ar !== null && br !== null) return ar - br;
                    if (ar !== null) return -1;
                    if (br !== null) return 1;
                    return generateRating(b.displayName) - generateRating(a.displayName);
                  })
                  .slice(0, 3)
                  .map((p, i) => (
                    <PersonaCard
                      key={p.id}
                      persona={p}
                      index={i}
                      onViewDetails={() => openDetail(p.slug)}
                    onStartChat={() => handleStartChat(p.slug, p.displayName, p.avatarUrl ?? null)}
                    showFreeMins={!isReturningUser}
                    promoMode={promoMode}                    />
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
                        onStartChat={() => handleStartChat(p.slug, p.displayName, p.avatarUrl ?? null)}
                        showFreeMins={!isReturningUser}
                    promoMode={promoMode}                      />
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
                  onStartChat={() => handleStartChat(featuredPersona.slug, featuredPersona.displayName, featuredPersona.avatarUrl ?? null)}
                  showFreeMins={!isReturningUser}
                    promoMode={promoMode}                />
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
                    onStartChat={() => handleStartChat(p.slug, p.displayName, p.avatarUrl ?? null)}
                    showFreeMins={!isReturningUser}
                    promoMode={promoMode}                  />
                ))}
              </div>
            </Section>

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
                    .sort((a, b) => {
                      const ra = a.overallRating ?? generateRating(a.displayName);
                      const rb = b.overallRating ?? generateRating(b.displayName);
                      return rb - ra;
                    })
                    .slice(0, 3)
                    .map((p, i) => (
                      <PersonaCard
                        key={p.id}
                        persona={p}
                        index={i}
                        onViewDetails={() => openDetail(p.slug)}
                        onStartChat={() => handleStartChat(p.slug, p.displayName, p.avatarUrl ?? null)}
                        showFreeMins={!isReturningUser}
                    promoMode={promoMode}                      />
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
                    onStartChat={() => handleStartChat(p.slug, p.displayName, p.avatarUrl ?? null)}
                    showFreeMins={!isReturningUser}
                    promoMode={promoMode}                  />
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
         Auth Modal — shown when a guest clicks Start Chat
         ================================================================ */}
      <Dialog
        open={showAuthModal}
        onOpenChange={(open) => {
          // Keep modal open while awaiting email verification or a passwordless
          // sign-in link so the user doesn't lose the "Check Your Email" state (FRICTION-9)
          if (!open && !authVerificationSent && !authMagicLinkSent) setShowAuthModal(false);
        }}
      >
        <DialogContent className="max-w-sm bg-[#0c0c24] border-white/[0.06] text-white !rounded-2xl">
          {authVerificationSent ? (
            /* ── Verification sent state ── */
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-600/20 border border-purple-500/20 flex items-center justify-center">
                <Mail className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <h2 className="font-serif text-xl text-white mb-2">Check Your Email</h2>
                <p className="text-[14px] text-white/55 leading-relaxed">
                  We sent a verification link to{" "}
                  <strong className="text-white/80">{authResendEmail}</strong>.
                  Click it to activate your account and get your 3 free minutes.
                </p>
              </div>
              <button
                onClick={handleModalResend}
                disabled={authResendLoading}
                className="text-[13px] text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
              >
                {authResendLoading ? "Sending..." : "Resend verification email"}
              </button>
              <button
                onClick={() => { setAuthVerificationSent(false); setAuthIsSignUp(false); }}
                className="text-[13px] text-white/35 hover:text-white/55 transition-colors"
              >
                Back to sign in
              </button>
            </div>
          ) : authMagicLinkSent ? (
            /* ── Passwordless sign-in link sent (SUCCESS, not an error) ── */
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center">
                <Mail className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <h2 className="font-serif text-xl text-white mb-2">Check Your Email</h2>
                <p className="text-[14px] text-white/55 leading-relaxed">
                  We sent a sign-in link to{" "}
                  <strong className="text-white/80">{authResendEmail}</strong>.
                  Click it to continue to your free minutes.
                </p>
              </div>
              <button
                onClick={() => { setAuthMagicLinkSent(false); }}
                className="text-[13px] text-white/35 hover:text-white/55 transition-colors"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <div className="flex flex-col items-center gap-3 mb-1">
                  <Avatar className="w-16 h-16 ring-2 ring-white/[0.08] ring-offset-2 ring-offset-[#0c0c24]">
                    <AvatarImage src={authPersonaAvatar || "/evelyn-avatar.png"} alt={authPersonaName || ""} />
                    <AvatarFallback className="bg-white/5 text-white/60 text-xl">
                      {authPersonaName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className="text-[13px] text-white/45 mb-0.5">
                      {authIsSignUp ? "Create a free account to chat with" : "Sign in to chat with"}
                    </p>
                    <DialogTitle className="font-serif text-[22px] text-white">
                      {authPersonaName}
                    </DialogTitle>
                  </div>
                </div>
              </DialogHeader>

              {authIsSignUp && (
                <div className="flex items-center gap-2.5 bg-purple-600/15 border border-purple-500/15 rounded-xl px-3.5 py-2.5">
                  <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-[13px] text-white/75">
                    You get <strong className="text-white font-semibold">{promoMode ? PROMO_OFFER_MINUTES : 3} FREE minutes</strong> to get started
                  </span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3 mt-1">
                {authError && (
                  <p className="text-red-400 text-[12px] p-2.5 bg-red-500/10 rounded-lg text-center">
                    {authError}
                  </p>
                )}

                {authIsSignUp && (
                  <div>
                    <label className="text-[12px] text-white/45 mb-1 block">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={authFirstName}
                      onChange={(e) => setAuthFirstName(e.target.value)}
                      required={authIsSignUp}
                      className="w-full bg-white/[0.05] text-white rounded-lg px-3 py-2 text-[13px] border border-white/[0.1] focus:border-purple-500/50 focus:outline-none placeholder:text-white/25"
                      placeholder="Your first name"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[12px] text-white/45 mb-1 block">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    className="w-full bg-white/[0.05] text-white rounded-lg px-3 py-2 text-[13px] border border-white/[0.1] focus:border-purple-500/50 focus:outline-none placeholder:text-white/25"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="text-[12px] text-white/45 mb-1 block">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full bg-white/[0.05] text-white rounded-lg px-3 py-2 text-[13px] border border-white/[0.1] focus:border-purple-500/50 focus:outline-none placeholder:text-white/25"
                    placeholder={authIsSignUp ? "Min 8 characters" : "Your password"}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={formLoading}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white h-[42px] text-[13px] font-medium tracking-wide mt-1"
                >
                  {formLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : authIsSignUp ? (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Account & Start Reading
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>

              {!authIsSignUp && (
                <div className="text-center -mt-1">
                  <a
                    href="/forgot-password"
                    className="text-[12px] text-white/30 hover:text-white/50 transition-colors"
                  >
                    Forgot your password?
                  </a>
                </div>
              )}

              <div className="text-center mt-1">
                <button
                  onClick={() => { setAuthIsSignUp(!authIsSignUp); setAuthError(null); }}
                  className="text-[12px] text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {authIsSignUp
                    ? "Already have an account? Sign in"
                    : "New here? Create a free account"}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
                        rating={selectedPersona.overallRating ?? generateRating(selectedPersona.displayName)}
                        size="md"
                      />
                      {(() => {
                        const s = selectedPersona.isOnline === true
                          ? { label: "Online", bgClass: "bg-teal-500/10", textClass: "text-teal-400", borderClass: "border-teal-500/20" }
                          : selectedPersona.isOnline === false
                          ? { label: "Busy", bgClass: "bg-rose-500/10", textClass: "text-rose-400", borderClass: "border-rose-500/20" }
                          : getStatus(selectedPersona.displayName);
                        return (
                          <span className={`text-[12px] px-2.5 py-[2px] rounded-full font-semibold ${s.bgClass} ${s.textClass} border ${s.borderClass}`}>
                            {s.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 mt-5">
                {/* Stats */}
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-white/55">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-white/35" />
                    {(selectedPersona.yearsExperience ?? generateYearsExp(selectedPersona.displayName))} years experience
                  </span>
                  <span className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-white/35" />
                    {(selectedPersona.readingsCount ?? generateReadings(selectedPersona.displayName)).toLocaleString()} readings
                  </span>
                  {selectedPersona.stats.uniqueClients > 0 && (
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-white/35" />
                      {selectedPersona.stats.uniqueClients} clients
                    </span>
                  )}
                  <span className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-400/50" />
                    From {selectedPersona.coinsPerMinute ?? 60} coins / min
                  </span>
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

                {/* Admin testimonials */}
                {selectedPersona.reviews && selectedPersona.reviews.length > 0 && (
                  <div>
                    <p className="text-[12px] font-bold text-white/30 uppercase tracking-[0.18em] mb-3">
                      What clients say
                    </p>
                    <div className="space-y-3">
                      {selectedPersona.reviews.map((review) => (
                        <div key={review.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[13px] font-semibold text-white/80">{review.reviewerName}</span>
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3 h-3 ${s <= review.starRating ? 'text-amber-400 fill-amber-400' : 'text-white/10'}`}
                                />
                              ))}
                            </div>
                          </div>
                          {review.reviewText && (
                            <p className="text-[14px] text-white/55 italic leading-relaxed">&ldquo;{review.reviewText}&rdquo;</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* User Reviews — real feedback approved by admin */}
                {selectedPersona.userReviews && selectedPersona.userReviews.length > 0 && (
                  <div>
                    <p className="text-[12px] font-bold text-white/30 uppercase tracking-[0.18em] mb-3">
                      User Reviews
                    </p>
                    <div className="space-y-3">
                      {selectedPersona.userReviews.map((review) => (
                        <div key={review.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[13px] font-semibold text-white/80">{review.reviewerName}</span>
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3 h-3 ${s <= review.starRating ? 'text-amber-400 fill-amber-400' : 'text-white/10'}`}
                                />
                              ))}
                            </div>
                            <span className="text-[11px] text-white/25 ml-auto">
                              {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                            </span>
                          </div>
                          {review.reviewText && (
                            <p className="text-[14px] text-white/55 italic leading-relaxed">&ldquo;{review.reviewText}&rdquo;</p>
                          )}
                        </div>
                      ))}
                    </div>
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
                  onClick={() => {
                    setSelectedPersona(null);
                    handleStartChat(selectedPersona.slug, selectedPersona.displayName, selectedPersona.avatarUrl);
                  }}
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
