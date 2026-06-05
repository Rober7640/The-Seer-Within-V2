import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Guide {
  id: string;
  slug: string;
  displayName: string;
  tagline: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  isOnline?: boolean;
  coinsPerMinute?: number;
}

interface GuideSidebarProps {
  guides: Guide[];
  selectedPersonaId: string | null;
  /** Persona IDs where the user has already sent at least one message */
  chattedGuideIds: Set<string>;
  mobileOpen: boolean;
  onMobileClose: () => void;
  /** Called with the target slug and the guide's full teaser message when user picks a different guide */
  onSwitchGuide: (slug: string, teaserFull: string) => void;
  /** Called when user clicks a busy/offline persona */
  onBusyClick?: (displayName: string) => void;
  /** Whether the user is still on their free trial (has not purchased credits) */
  isNewUser: boolean;
  /** True if the user has claimed the 6/6 promo (even on guides spent to 0). Suppresses the
   *  default "3 minutes FREE" trial label so used-up promo guides show nothing. */
  hasPromo?: boolean;
  /** Per-persona promo coins remaining (6/6 promo). When >0 for a guide, the promo
   *  "X:XX free" badge replaces the default "3 minutes FREE" trial badge. */
  promoBalances?: Record<string, number>;
}

// Format promo coins as remaining minutes:seconds, e.g. 360 @ 60/min → "6:00".
function formatPromoMins(coins: number, coinsPerMinute: number): string {
  const totalSeconds = Math.round((coins / (coinsPerMinute || 60)) * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

const DEFAULT_AVATAR = "/evelyn-avatar-new.png";

// Deterministic teaser message per guide so it doesn't flicker on re-render.
// Returns a short `preview` shown in the sidebar and a `full` message delivered
// to the user as the guide's opening line when they click through.
function getTeaserMessage(guide: Guide): { preview: string; full: string } {
  const messages = [
    {
      preview: `${guide.displayName} may know an answer to your question. Ask now.`,
      full: `I may have an answer to what's been weighing on your mind. Something tells me you've been seeking clarity. Tell me — what's going on?`,
    },
    {
      preview: `I've been sensing some energy around you. Come chat with me.`,
      full: `I've been sensing some energy around you lately — something is shifting. It could be something you've been carrying for a while. I'd love to talk it through with you. What's going on?`,
    },
    {
      preview: `I've been picking up on some energy around you. Come talk.`,
      full: `I've been picking up on some energy around you, and I'd love to give you a reading. I think there's something meaningful here for you. What's been on your mind lately?`,
    },
    {
      preview: `There are 3 things you can do right now to shift your...`,
      full: `There are 3 things you can do right now to shift your energy and open the door to what you've been asking for. I've been holding this for you. Are you ready to hear them?`,
    },
    {
      preview: `${guide.displayName} may know an answer to your question. Ask...`,
      full: `I may have some insight into the question you've been turning over in your mind. I'm here and ready to help. What would you like to explore?`,
    },
  ];
  // Pick based on slug character sum so it's stable per guide
  const idx = guide.slug
    .split("")
    .reduce((s, c) => s + c.charCodeAt(0), 0) % messages.length;
  return messages[idx];
}

function formatTime(): string {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function GuideItem({
  guide,
  showBadge,
  isNewUser,
  hasPromo,
  isBusy,
  promoCoins,
  onClick,
}: {
  guide: Guide;
  showBadge: boolean;
  isNewUser: boolean;
  hasPromo: boolean;
  isBusy: boolean;
  promoCoins: number;
  onClick: () => void;
}) {
  const teaser = getTeaserMessage(guide);
  const timeLabel = formatTime();
  const avatarSrc = guide.avatarUrl?.trim() ? guide.avatarUrl : DEFAULT_AVATAR;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left transition-colors ${isBusy ? "opacity-50 cursor-not-allowed" : "hover:bg-white/5 active:bg-white/10"}`}
    >
      {/* Row */}
      <div className="flex items-start gap-3 px-3 py-3">
        {/* Avatar */}
        <div className="relative shrink-0 mt-0.5">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-[#1a2744]">
            <img
              src={avatarSrc}
              alt={guide.displayName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
              }}
            />
          </div>
          {/* Status dot — green for online, rose for busy */}
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0d1226] ${isBusy ? "bg-rose-500" : "bg-emerald-500"}`}
          />
          {/* Unread badge — only the one active guide for this session */}
          {showBadge && !isBusy && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow">
              1
            </span>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Name + time/status row */}
          <div className="flex items-baseline justify-between gap-1 mb-0.5">
            <p className="text-white text-sm font-semibold truncate leading-tight">
              {guide.displayName}
            </p>
            {isBusy ? (
              <span className="text-rose-400/70 text-[10px] font-semibold shrink-0">Busy</span>
            ) : showBadge ? (
              <span className="text-white/40 text-[10px] shrink-0">{timeLabel}</span>
            ) : null}
          </div>

          {/* Teaser preview when badge is active, "Currently unavailable" when busy, tagline otherwise */}
          <p className="text-white/55 text-xs leading-snug line-clamp-2">
            {isBusy
              ? "Currently unavailable — try again later"
              : showBadge
                ? teaser.preview
                : (guide.tagline ?? "Available for a reading")}
          </p>
        </div>
      </div>

      {/* Promo "X:XX FREE" badge — replaces the trial badge for guides where the user
          has 6/6 promo coins. Driven by the user's actual remaining promo balance. */}
      {promoCoins > 0 && !isBusy ? (
        <div className="px-3 pb-2.5">
          <div
            className="w-full text-center py-1 rounded text-[10px] font-bold text-white/90 tracking-wide"
            style={{ background: "linear-gradient(90deg, #059669 0%, #10b981 100%)" }}
          >
            🎁 {formatPromoMins(promoCoins, guide.coinsPerMinute ?? 60)} FREE
          </div>
        </div>
      ) : isNewUser && !hasPromo && !isBusy ? (
        /* "3 min FREE" trial badge — only for genuine new/trial users. Hidden for 6/6 promo
           participants (hasPromo) so a used-up promo guide shows nothing, not a free offer
           they no longer have. */
        <div className="px-3 pb-2.5">
          <div
            className="w-full text-center py-1 rounded text-[10px] font-bold text-white/90 tracking-wide"
            style={{ background: "linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)" }}
          >
            3 minutes FREE
          </div>
        </div>
      ) : null}

      {/* Separator */}
      <div className="mx-3 border-b border-white/[0.06]" />
    </button>
  );
}

function SidebarContent({
  guides,
  selectedPersonaId,
  chattedGuideIds,
  isNewUser,
  hasPromo,
  promoBalances,
  onSelect,
  onBusyClick,
}: {
  guides: Guide[];
  selectedPersonaId: string | null;
  chattedGuideIds: Set<string>;
  isNewUser: boolean;
  hasPromo: boolean;
  promoBalances?: Record<string, number>;
  onSelect: (slug: string, teaserFull: string) => void;
  onBusyClick?: (displayName: string) => void;
}) {
  const otherGuides = guides.filter(
    (g) => g.isActive && g.id !== selectedPersonaId
  );

  // Pick exactly one guide per session to show the "1 message" badge (~33% of guides).
  // Only guides the user has never sent a message to are eligible for the badge.
  // The index is chosen randomly on first render and stored in sessionStorage so it
  // survives page refreshes but resets when the user opens a new tab/session.
  // If the chosen guide is currently selected, the badge shifts to the next eligible one.
  const activeBadgeSlug = useMemo(() => {
    // Only un-chatted, active guides are eligible
    const eligibleGuides = guides.filter(
      (g) => g.isActive && !chattedGuideIds.has(g.id)
    );
    if (eligibleGuides.length === 0) return null;

    let idx: number;
    try {
      const stored = sessionStorage.getItem("seer-badge-guide-idx");
      if (stored !== null) {
        idx = parseInt(stored, 10);
      } else {
        idx = Math.floor(Math.random() * eligibleGuides.length);
        sessionStorage.setItem("seer-badge-guide-idx", String(idx));
      }
    } catch {
      idx = 0;
    }

    const badgeGuide = eligibleGuides[idx % eligibleGuides.length];
    if (badgeGuide.id === selectedPersonaId) {
      // Badge guide is currently selected — shift to the next eligible one
      return eligibleGuides[(idx + 1) % eligibleGuides.length]?.slug ?? null;
    }
    return badgeGuide.slug;
  }, [guides, selectedPersonaId, chattedGuideIds]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-4 pb-3 border-b border-white/10">
        <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest">
          Other Guides
        </p>
      </div>

      {/* Guide list */}
      <div className="flex-1 overflow-y-auto">
        {otherGuides.length === 0 ? (
          <p className="text-white/25 text-xs px-4 py-6 text-center leading-relaxed">
            No other guides available right now
          </p>
        ) : (
          otherGuides.map((guide) => {
            const busy = guide.isOnline === false;
            return (
              <GuideItem
                key={guide.id}
                guide={guide}
                showBadge={!busy && guide.slug === activeBadgeSlug}
                isNewUser={isNewUser}
                hasPromo={hasPromo}
                isBusy={busy}
                promoCoins={promoBalances?.[guide.id] ?? 0}
                onClick={() => {
                  if (busy) {
                    onBusyClick?.(guide.displayName);
                  } else {
                    onSelect(guide.slug, getTeaserMessage(guide).full);
                  }
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

export function GuideSidebar({
  guides,
  selectedPersonaId,
  chattedGuideIds,
  mobileOpen,
  onMobileClose,
  onSwitchGuide,
  onBusyClick,
  isNewUser,
  hasPromo = false,
  promoBalances,
}: GuideSidebarProps) {
  const handleSelect = (slug: string, teaserFull: string) => {
    onMobileClose();
    onSwitchGuide(slug, teaserFull);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-[#0d1226] border-r border-white/10 flex-col h-full">
        <SidebarContent
          guides={guides}
          selectedPersonaId={selectedPersonaId}
          chattedGuideIds={chattedGuideIds}
          isNewUser={isNewUser}
          hasPromo={hasPromo}
          promoBalances={promoBalances}
          onSelect={handleSelect}
          onBusyClick={onBusyClick}
        />
      </aside>

      {/* Mobile sheet drawer */}
      <Sheet open={mobileOpen} onOpenChange={onMobileClose}>
        <SheetContent
          side="left"
          className="w-64 p-0 bg-[#0d1226] border-r border-white/10"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Other Guides</SheetTitle>
          </SheetHeader>
          <SidebarContent
            guides={guides}
            selectedPersonaId={selectedPersonaId}
            chattedGuideIds={chattedGuideIds}
            isNewUser={isNewUser}
            hasPromo={hasPromo}
            promoBalances={promoBalances}
            onSelect={handleSelect}
            onBusyClick={onBusyClick}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
