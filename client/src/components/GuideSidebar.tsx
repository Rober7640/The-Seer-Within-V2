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
}

interface GuideSidebarProps {
  guides: Guide[];
  selectedPersonaId: string | null;
  mobileOpen: boolean;
  onMobileClose: () => void;
  /** Called with the target slug when user picks a different guide */
  onSwitchGuide: (slug: string) => void;
}

const DEFAULT_AVATAR = "/evelyn-avatar-new.png";

// Deterministic teaser message per guide so it doesn't flicker on re-render
function getTeaserMessage(guide: Guide): string {
  const messages = [
    `${guide.displayName} may know an answer to your question. Ask now.`,
    `I've been sensing some energy around you. Come chat with me.`,
    `Do you want to have a spiritual reading? I am a psychic...`,
    `There are 3 things you can do right now to shift your...`,
    `${guide.displayName} may know an answer to your question. Ask...`,
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
  onClick,
}: {
  guide: Guide;
  onClick: () => void;
}) {
  const teaserText = getTeaserMessage(guide);
  const timeLabel = formatTime();
  const avatarSrc = guide.avatarUrl?.trim() ? guide.avatarUrl : DEFAULT_AVATAR;

  return (
    <button
      onClick={onClick}
      className="w-full text-left transition-colors hover:bg-white/5 active:bg-white/10"
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
          {/* Unread notification badge */}
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow">
            1
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Name + time row */}
          <div className="flex items-baseline justify-between gap-1 mb-0.5">
            <p className="text-white text-sm font-semibold truncate leading-tight">
              {guide.displayName}
            </p>
            <span className="text-white/40 text-[10px] shrink-0">{timeLabel}</span>
          </div>

          {/* Message preview */}
          <p className="text-white/55 text-xs leading-snug line-clamp-2">
            {teaserText}
          </p>
        </div>
      </div>

      {/* "3 min FREE" badge row */}
      <div className="px-3 pb-2.5">
        <div
          className="w-full text-center py-1 rounded text-[10px] font-bold text-white/90 tracking-wide"
          style={{ background: "linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)" }}
        >
          3 minutes FREE
        </div>
      </div>

      {/* Separator */}
      <div className="mx-3 border-b border-white/[0.06]" />
    </button>
  );
}

function SidebarContent({
  guides,
  selectedPersonaId,
  onSelect,
}: {
  guides: Guide[];
  selectedPersonaId: string | null;
  onSelect: (slug: string) => void;
}) {
  const otherGuides = guides.filter(
    (g) => g.isActive && g.id !== selectedPersonaId
  );

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
          otherGuides.map((guide) => (
            <GuideItem
              key={guide.id}
              guide={guide}
              onClick={() => onSelect(guide.slug)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function GuideSidebar({
  guides,
  selectedPersonaId,
  mobileOpen,
  onMobileClose,
  onSwitchGuide,
}: GuideSidebarProps) {
  const handleSelect = (slug: string) => {
    onMobileClose();
    onSwitchGuide(slug);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-[#0d1226] border-r border-white/10 flex-col h-full">
        <SidebarContent
          guides={guides}
          selectedPersonaId={selectedPersonaId}
          onSelect={handleSelect}
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
            onSelect={handleSelect}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
