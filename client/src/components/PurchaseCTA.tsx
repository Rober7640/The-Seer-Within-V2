interface PurchaseCTAProps {
  onClick: () => void
}

export function PurchaseCTA({ onClick }: PurchaseCTAProps) {
  return (
    <div className="p-4 space-y-3">
      <button
        onClick={onClick}
        className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse hover:animate-none"
      >
        Begin My Energy Clearing - $35
      </button>
      <div className="flex justify-center gap-4 text-xs text-gray-400">
        <span>🔒 60-Day Guarantee</span>
        <span>100% Secure</span>
      </div>
    </div>
  )
}
