import { t } from "@/lib/i18n";
interface PurchaseCTAProps {
  onClick: () => void
  priceDollars?: number
}

export function PurchaseCTA({ onClick, priceDollars = 35 }: PurchaseCTAProps) {
  return (
    <div className="p-4 space-y-3">
      <button
        onClick={onClick}
        className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse hover:animate-none"
      >
        {t("Begin My Energy Clearing - ${priceDollars}", { priceDollars })}
      </button>
      <div className="flex justify-center gap-4 text-xs text-gray-400">
        <span>{t("🔒 30-Day Guarantee")}</span>
        <span>{t("100% Secure")}</span>
      </div>
    </div>
  )
}
