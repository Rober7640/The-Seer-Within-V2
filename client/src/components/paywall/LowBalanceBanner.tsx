// LowBalanceBanner — Wireframe A. Calm, dismissible nudge pinned above the chat
// input, fired BEFORE the balance hits zero (~90s left). Presentational.

import { X } from "lucide-react";
import { paywallCopy, type PaywallVariant } from "./paywallCopy";

interface LowBalanceBannerProps {
  personaName: string;
  /** Free-trial ending vs. paid balance running low — changes the message. */
  isFreeTrial?: boolean;
  onAction: () => void;
  onDismiss?: () => void;
  variant?: PaywallVariant;
}

export default function LowBalanceBanner({
  personaName,
  isFreeTrial = false,
  onAction,
  onDismiss,
  variant = "B",
}: LowBalanceBannerProps) {
  const copy = paywallCopy(variant);
  const firstName = personaName.split(" ")[0] || personaName;
  const message = isFreeTrial ? copy.banner.freeTrial : copy.banner.lowBalance(firstName);

  return (
    <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-amber-300/25 bg-gradient-to-r from-[#1c2342]/95 to-[#241d3e]/95 px-3.5 py-2.5 shadow-lg backdrop-blur-sm">
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-300 to-amber-500" />
      {/* Waning-moon glyph */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-300/15 text-amber-300">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M12 2a10 10 0 100 20c.5 0 1-.04 1.49-.11A8 8 0 0112 2z" />
        </svg>
      </div>
      <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-white/85">
        {message}
      </p>
      <button
        onClick={onAction}
        className="shrink-0 rounded-xl bg-gradient-to-r from-amber-300 to-amber-400 px-3.5 py-1.5 text-[13px] font-semibold text-[#1a1530] shadow transition-transform active:scale-95"
      >
        {copy.banner.cta} →
      </button>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 text-white/35 transition-colors hover:text-white/70"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
