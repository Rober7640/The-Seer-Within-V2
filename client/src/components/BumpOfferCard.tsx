import {
  bumpCopy,
  V1_BUMP_PRICE_LABEL,
  type BumpBucket,
  type BumpCopyVariant,
} from '@shared/orderBump'

// V1 ORDER BUMP ("double reading", v1_order_bump_2026) — the two quick replies
// that follow Evelyn's offer turn. Rendered in place of the purchase CTA after
// she taps buy, so there is exactly one live action on screen at a time and no
// way to double-submit into two checkout sessions.
//
// Styled off CommitmentGateCard so the close reads as one product family across
// all three CTA variants (plain / sliding / gate) — every one of them can lead
// here, since they all converge on the same purchase call.
//
// The DECLINE path is a full-width, equally legible button on purpose: it goes
// straight to the normal checkout she already asked for. Burying it would make
// this a dark pattern, and the arm would "win" on a charge she didn't intend.
interface BumpOfferCardProps {
  // The PAIRED topic being offered — not the one she originally chose.
  paired: BumpBucket
  onAccept: () => void
  onDecline: () => void
  mainDollars?: number
  // COPY SPLIT TEST (2026-08-11). Defaulted to control so any caller that has not
  // been updated renders exactly today's card.
  variant?: BumpCopyVariant
  // Only variation A addresses her by name. Optional because the no-optin arm can
  // reach the CTA without one, and that arm's copy closes over its absence.
  firstName?: string
}

export function BumpOfferCard({
  paired,
  onAccept,
  onDecline,
  mainDollars = 35,
  variant = 'control',
  firstName,
}: BumpOfferCardProps) {
  const total = (mainDollars + 12.77).toFixed(2)
  const copy = bumpCopy(variant, paired, firstName)

  return (
    <div className="p-4 animate-cta-appear" data-testid="bump-offer-card">
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 via-white to-white shadow-md overflow-hidden">
        <div className="pt-4 pb-2 px-5 text-center">
          <div className="text-amber-500/90 text-xs tracking-[0.3em]">✦</div>
          {/* Evelyn's full offer line lives IN the card (matches the approved
              mockup), so the persuasive copy sits at the decision point instead
              of scrolling up into the chat log. Same string the bubble used
              (bumpCopy) — the duplicate sendBotMessage bubble was removed
              from useConversation so it is not shown twice.

              Split on blank lines: control and B are one paragraph (so this
              renders a single <p>, byte-identical to before), while variation A
              is four short beats and needs the breathing room. */}
          {copy.offer.split('\n\n').map((para, i) => (
            <p
              key={i}
              className={`font-serif italic text-gray-800 text-base leading-relaxed ${
                i === 0 ? 'mt-2' : 'mt-3'
              }`}
            >
              {para}
            </p>
          ))}
        </div>

        <div className="px-5 pb-4">
          <div className="flex items-baseline justify-center gap-2 text-sm text-gray-700">
            <span className="font-semibold text-gray-900">
              + {V1_BUMP_PRICE_LABEL}
            </span>
            <span className="text-gray-400">·</span>
            {/* Shown so the total is never a surprise on the Stripe page. */}
            <span className="text-gray-500">${total} total</span>
          </div>
        </div>

        <div className="px-4 pb-4 space-y-2">
          <button
            onClick={onAccept}
            data-testid="button-bump-accept"
            className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {copy.accept}
          </button>
          <button
            onClick={onDecline}
            data-testid="button-bump-decline"
            className="w-full py-3 px-6 rounded-lg border border-gray-200 bg-white text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors duration-200"
          >
            {copy.decline}
          </button>
        </div>
      </div>

      <div className="flex justify-center gap-4 text-xs text-gray-400 mt-3">
        <span>🔒 30-Day Guarantee</span>
        <span>100% Secure</span>
      </div>
    </div>
  )
}
