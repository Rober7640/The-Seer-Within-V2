import { Link } from "wouter";
import { Star, ChevronRight, ShoppingCart, Lock } from "lucide-react";

const DEFAULT_AVATAR = "/evelyn-avatar-new.png";

interface PersonaData {
  id: string;
  displayName: string;
  tagline: string | null;
  avatarUrl: string | null;
  description: string | null;
  categories?: string | null;
}

interface MemoryContext {
  hasPriorMemory: boolean;
  lastTopic?: string;
  sessionCount: number;
  recentTopics?: string[];
}

type PersonaStatus = 'busy-slow' | 'busy-fast' | 'connecting' | 'online';

interface PreReadingWelcomeProps {
  persona: PersonaData;
  memoryContext?: MemoryContext | null;
  lightMode?: boolean;
  coinBalance: number;
  freeCoinsAvailable: number;
  personaStatus: PersonaStatus;
  isStarting?: boolean;
  isOffline?: boolean;
  teaserMessage?: string | null;
  onStartSession: () => void;
  onBuyCredits: () => void;
  onRefillToSeeTeaser?: () => void;
}

const DEFAULT_SPECIALTIES = [
  "Tarot reading",
  "Numerology",
  "Zodiac compatibility",
  "Birth chart",
  "Relationships & Love",
];

function parseCategories(categories: string | null | undefined): string[] {
  if (!categories) return DEFAULT_SPECIALTIES;
  try {
    const parsed = JSON.parse(categories);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((c: string) =>
        c.charAt(0).toUpperCase() + c.slice(1)
      );
    }
    return DEFAULT_SPECIALTIES;
  } catch {
    return DEFAULT_SPECIALTIES;
  }
}

export function PreReadingWelcome({
  persona,
  memoryContext,
  lightMode = false,
  coinBalance,
  freeCoinsAvailable,
  personaStatus,
  isStarting = false,
  isOffline = false,
  teaserMessage,
  onStartSession,
  onBuyCredits,
  onRefillToSeeTeaser,
}: PreReadingWelcomeProps) {
  const isReturningUser = memoryContext?.hasPriorMemory || false;
  const hasCredits = coinBalance > 0 || freeCoinsAvailable > 0;
  const isOnline = personaStatus === 'online';
  const specialties = parseCategories(persona.categories);

  const statusHeading = isOnline
    ? `${persona.displayName} is ready`
    : `Connecting you to advisor`;

  const greetingMessage = isReturningUser
    ? `Welcome back! I'm happy to continue our journey together.`
    : `I'm happy to be your personal advisor.`;

  const avatarSrc = persona.avatarUrl?.trim() ? persona.avatarUrl : DEFAULT_AVATAR;

  return (
    <div className={`flex flex-col min-h-full ${lightMode ? 'text-gray-800' : 'text-white'}`}>
      {/* Heading */}
      <div className="text-center mb-5">
        <h1 className={`text-2xl font-bold tracking-tight mb-2 ${lightMode ? 'text-gray-900' : ''}`}>
          {statusHeading}
        </h1>
        <Link
          href="/personas"
          className="inline-flex items-center text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
        >
          Change advisor
          <ChevronRight className="w-4 h-4 ml-0.5" />
        </Link>
      </div>

      {/* Advisor Card — glowing border */}
      <div className="relative rounded-2xl p-[2px] mb-5 bg-gradient-to-br from-cyan-400/60 via-teal-400/30 to-cyan-400/60 shadow-[0_0_24px_rgba(6,182,212,0.15)]">
        <div className="bg-[#162036] rounded-2xl p-4">
          {/* Avatar & Info row */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-400/50 shrink-0 bg-[#1a2744]">
              <img
                src={avatarSrc}
                alt={persona.displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white mb-0.5">
                {persona.displayName}
              </h2>
              <p className="text-sm text-white/60 mb-1.5">
                {persona.tagline || "Intuitive advisor & spiritual guide"}
              </p>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-white font-semibold text-sm">4.9</span>
                <span className="text-white/50 text-sm">256 reviews</span>
              </div>
            </div>
          </div>

          {/* Specialty Tags */}
          <div className="flex flex-wrap gap-2">
            {specialties.map((specialty, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full text-xs font-medium border border-cyan-400/40 text-cyan-300 bg-cyan-400/10"
              >
                {specialty}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Bubble Greeting */}
      <div className="flex items-end gap-2.5 mb-5">
        <div className="bg-[#243347] rounded-2xl rounded-bl-sm px-4 py-3 flex-1 shadow-md">
          <p className="text-white/90 text-sm leading-relaxed">
            {greetingMessage}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/20 bg-[#1a2744]">
          <img
            src={avatarSrc}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
            }}
          />
        </div>
      </div>

      {/* Info Bullets */}
      <div className="space-y-3 mb-6">
        <div className="flex items-start gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 mt-1" />
          <p className={`text-sm ${lightMode ? 'text-gray-600' : 'text-white/80'}`}>
            It usually takes 15 seconds to connect
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 mt-1" />
          <p className={`text-sm ${lightMode ? 'text-gray-600' : 'text-white/80'}`}>
            Once connected, ask anything you want
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 mt-1" />
          <p className={`text-sm ${lightMode ? 'text-gray-600' : 'text-white/80'}`}>
            Your advisor is focused on you. Enjoy!
          </p>
        </div>
      </div>

      {/* Blurred teaser message — hidden when offline */}
      {!isOffline && teaserMessage && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-3.5 h-3.5 text-fuchsia-400" />
            <span className="text-fuchsia-300 text-xs font-semibold uppercase tracking-wider">
              Unread message from {persona.displayName}
            </span>
          </div>
          <div className="relative rounded-2xl overflow-hidden">
            {/* Blurred message content */}
            <div className="bg-[#243347] rounded-2xl px-4 py-3 select-none">
              <p
                className="text-white/90 text-sm leading-relaxed"
                style={{ filter: "blur(5px)", userSelect: "none" }}
              >
                {teaserMessage}
              </p>
            </div>
            {/* Overlay CTA */}
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f1729]/60 rounded-2xl backdrop-blur-[1px]">
              <button
                onClick={onRefillToSeeTeaser}
                className="px-5 py-2 rounded-xl text-white text-sm font-bold shadow-lg transition-all active:scale-[0.97]"
                style={{ background: "linear-gradient(90deg, #7c3aed, #c026d3)" }}
              >
                See the answer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CTA area */}
      <div className="mt-auto pt-2">
        {isOffline ? (
          <div className="rounded-xl bg-[#1a2744] border border-red-500/30 px-4 py-5 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-red-400 font-semibold text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              {persona.displayName} is currently offline
            </div>
            <p className={`text-xs leading-relaxed ${lightMode ? 'text-gray-500' : 'text-white/60'}`}>
              Come back during her available hours to begin your reading.
            </p>
          </div>
        ) : isOnline && hasCredits ? (
          <button
            onClick={onStartSession}
            disabled={isStarting}
            data-testid="start-session-button"
            className="w-full py-4 rounded-xl text-base font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98] disabled:opacity-80 flex items-center justify-center gap-2"
          >
            {isStarting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Connecting...
              </>
            ) : (
              'Begin Your Reading'
            )}
          </button>
        ) : isOnline && !hasCredits ? (
          <button
            onClick={onBuyCredits}
            className="w-full py-4 rounded-xl text-base font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Get Minutes
          </button>
        ) : (
          <div className="flex items-center justify-center gap-3 py-4">
            <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className={`text-sm font-medium ${lightMode ? 'text-gray-500' : 'text-white/60'}`}>
              Connecting to {persona.displayName}...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
