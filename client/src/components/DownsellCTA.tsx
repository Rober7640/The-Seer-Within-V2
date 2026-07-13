interface DownsellCTAProps {
  onClick: () => void
  priceDollars?: number
  // Overrides the button text. Default stays the classic written-reading
  // downsell; the sliding-scale close passes the same-clearing label instead.
  label?: string
}

export function DownsellCTA({ onClick, priceDollars = 25, label }: DownsellCTAProps) {
  return (
    <div className="p-4 space-y-3">
      <button
        onClick={onClick}
        className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {label ?? `Get Your Written Reading - $${priceDollars}`}
      </button>
      <div className="flex justify-center gap-4 text-xs text-gray-400">
        <span>🔒 30-Day Guarantee</span>
        <span>100% Secure</span>
      </div>
    </div>
  )
}
