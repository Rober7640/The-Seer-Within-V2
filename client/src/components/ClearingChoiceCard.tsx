// Sliding-scale close ('55-35*' variants) — the checkout choice card.
// Replaces PurchaseCTA for the sliding arm only: a deliverables checklist plus
// the two-tier offering. Order and framing are deliberate (Lourdes-close
// architecture): the $35 grace option comes FIRST as the quiet, dignified
// choice; the $55 full offering sits LAST with the RECOMMENDED mark so the eye
// rests on it. Both charge paths are the same product server-side.
interface ClearingChoiceCardProps {
  onFullOffering: () => void
  onGraceOffering: () => void
  fullDollars?: number
  graceDollars?: number
}

export function ClearingChoiceCard({
  onFullOffering,
  onGraceOffering,
  fullDollars = 55,
  graceDollars = 35,
}: ClearingChoiceCardProps) {
  return (
    <div className="p-4 animate-cta-appear" data-testid="clearing-choice-card">
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 via-white to-white shadow-md overflow-hidden">
        {/* Offering-note header */}
        <div className="pt-4 pb-3 px-5 text-center">
          <div className="text-amber-500/90 text-xs tracking-[0.3em]">✦</div>
          <h3 className="font-serif italic text-gray-800 text-base mt-1">
            What your offering carries
          </h3>
        </div>

        {/* Deliverables */}
        <ul className="px-5 pb-4 space-y-1.5 text-[13px] leading-snug text-gray-700">
          <li className="flex gap-2">
            <span className="text-amber-600 shrink-0">✓</span>
            <span>Your clearing ritual, performed tonight — 2-3 hours of focused work</span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-600 shrink-0">✓</span>
            <span>Your personalized 5-7 page reading, within 24 hours</span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-600 shrink-0">✓</span>
            <span>30-day guarantee — if nothing shifts, every penny returned</span>
          </li>
        </ul>

        <div className="px-4 pb-4 space-y-3">
          {/* Grace offering — quiet, dignified, first */}
          <button
            onClick={onGraceOffering}
            data-testid="button-grace-offering"
            className="w-full rounded-lg border border-purple-200 bg-white py-3 px-4 text-purple-900 hover:bg-purple-50 transition-colors duration-200"
          >
            <span className="block text-[10px] uppercase tracking-[0.18em] text-purple-400">
              I need a little grace
            </span>
            <span className="block font-semibold text-[15px] mt-0.5">
              Begin My Energy Clearing · ${graceDollars}
            </span>
          </button>
          <p className="text-[11px] italic text-gray-400 text-center -mt-1.5 px-2">
            This offering exists so money is never in the way — the clearing is the same.
          </p>

          {/* Full offering — recommended, candle-glow, last */}
          <div className="relative pt-2">
            <span className="absolute -top-0.5 right-3 z-10 rounded-full bg-amber-500 text-white text-[9px] font-bold uppercase tracking-[0.14em] px-2.5 py-0.5 shadow">
              Recommended
            </span>
            <button
              onClick={onFullOffering}
              data-testid="button-full-offering"
              className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 py-4 px-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse hover:animate-none"
            >
              <span className="block text-[10px] uppercase tracking-[0.18em] text-amber-100">
                Cover the Full Offering
              </span>
              <span className="block font-bold text-lg mt-0.5">
                Begin My Energy Clearing · ${fullDollars}
              </span>
            </button>
          </div>
          <p className="text-[11px] italic text-gray-400 text-center -mt-1.5 px-2">
            This is what the work fully asks.
          </p>
        </div>
      </div>

      <div className="flex justify-center gap-4 text-xs text-gray-400 mt-3">
        <span>🔒 30-Day Guarantee</span>
        <span>100% Secure</span>
      </div>
    </div>
  )
}
