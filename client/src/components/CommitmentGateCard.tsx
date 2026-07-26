import { useState } from 'react'

// fb-palm commitment-gate A/B test ('35_palm_gate') — CRO pattern adapted from
// competitor intel (docs/intel/how-i-built-a-60k-per-month-astrology-offer.md):
// a 3-checkbox commitment ask renders in place of the purchase button; the
// button itself only appears once all 3 are checked. Styled to match
// ClearingChoiceCard's card so it reads as the same product family.
interface CommitmentGateCardProps {
  firstName: string | null
  onConfirm: () => void
  priceDollars?: number
}

const COMMITMENTS = [
  'I understand belief is required for this to work',
  "I won't tell anyone else about this reading — it weakens it",
  "I understand once this is done, there's no undoing it",
] as const

export function CommitmentGateCard({ firstName, onConfirm, priceDollars = 35 }: CommitmentGateCardProps) {
  const [checked, setChecked] = useState<boolean[]>([false, false, false])
  const allChecked = checked.every(Boolean)

  const toggle = (index: number) => {
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)))
  }

  return (
    <div className="p-4 animate-cta-appear" data-testid="commitment-gate-card">
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 via-white to-white shadow-md overflow-hidden">
        <div className="pt-4 pb-3 px-5 text-center">
          <div className="text-amber-500/90 text-xs tracking-[0.3em]">✦</div>
          <h3 className="font-serif italic text-gray-800 text-base mt-1">
            {firstName ? `${firstName}, before I prepare this for you` : 'Before I prepare this for you'} — I need to know you're truly ready.
          </h3>
        </div>

        <div className="px-5 pb-4 space-y-2.5">
          {COMMITMENTS.map((label, index) => (
            <label
              key={label}
              className="flex items-start gap-3 text-[13px] leading-snug text-gray-700 cursor-pointer"
              data-testid={`checkbox-commitment-${index}`}
            >
              <input
                type="checkbox"
                checked={checked[index]}
                onChange={() => toggle(index)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <div className="px-4 pb-4">
          {allChecked ? (
            <button
              onClick={onConfirm}
              data-testid="button-commitment-confirm"
              className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse hover:animate-none"
            >
              Get My Reading — ${priceDollars}
            </button>
          ) : (
            <p className="text-center text-[11px] italic text-gray-400 py-2">
              Check all three to continue
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-4 text-xs text-gray-400 mt-3">
        <span>🔒 30-Day Guarantee</span>
        <span>100% Secure</span>
      </div>
    </div>
  )
}
