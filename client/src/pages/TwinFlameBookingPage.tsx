import { useState } from 'react'
import { CosmicBackground } from '@/components/CosmicBackground'
import {
  PAGE_HEADER,
  PAGE_STATEMENTS,
  PAGE_REQUEST,
  PAGE_GIFT,
  BUMP,
  CHECKOUT,
  TWIN_FLAME_PRICE_CENTS,
  TWIN_FLAME_BUMP_CENTS,
} from '@/lib/twinFlameBooking'

// Offer 02 — Twin Flame Tarot booking, PAGE treatment. PREVIEW ONLY.
//
// Candidate 1 of 2 for what the email sales letter's CTA lands on. The chat
// treatment is TwinFlameBookingChat.tsx. Spec: 02-C1 in
// improve-v1/v1-one-time-BEs/copy/02/02-C1-booking-page.md
//
// ⛔ Nothing here charges. The button logs and stops.
//
// ⚠ AESTHETIC *(operator, 2026-08-06 — supersedes 00b §3, and supersedes an
// earlier build of this file that wore the Soulmate funnel's blue/Merriweather
// look)*: the reference is ChatPage.tsx — `/chat`, the V1 reading itself.
// CosmicBackground behind a frosted white panel, capped at max-w-lg, with the
// bg-mid header carrying Evelyn's avatar in a gold ring. The buyer met her on
// that screen and is going back to it at /welcome1 straight after, so the
// booking step has to sit between them without a visual seam.
// Treatment B (white/red/green + Arial) is dead for this page.
//
// ⚠ VOICE: the buyer's, first person, throughout. Evelyn is named in the third
// person and never speaks on this page — the header is chrome, not her talking.
// One sentence of her speaking collapses the commitment device.

function centsToDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default function TwinFlameBookingPage() {
  // ⚠ OPEN DECISION (00-FLOW-BEs.md, open decisions #5): required vs decorative.
  // Built as REQUIRED — and, like CommitmentGateCard, the button does not exist
  // until every box is ticked. The source's own wireframe shows them PRE-CHECKED,
  // which would make them decorative and would also make this an unfair
  // comparison against the chat, where the gate is real.
  const [checked, setChecked] = useState<boolean[]>(() => PAGE_STATEMENTS.map(() => false))
  const [bumpTaken, setBumpTaken] = useState(false)
  const allChecked = checked.every(Boolean)
  const totalCents = TWIN_FLAME_PRICE_CENTS + (bumpTaken ? TWIN_FLAME_BUMP_CENTS : 0)

  const toggle = (index: number) =>
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)))

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden p-0 md:p-4">
      <CosmicBackground />

      <div className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-hidden border border-white/20 bg-white/95 shadow-2xl backdrop-blur-md md:h-[90vh] md:rounded-2xl">
        <header className="flex shrink-0 items-center gap-3 bg-bg-mid p-4 text-white shadow-md">
          <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-secondary">
            <img src="/evelyn-avatar.png" alt="Evelyn" className="h-full w-full object-cover" />
          </div>
          <div>
            <h1 className="font-serif text-lg font-bold leading-none">Evelyn Cross</h1>
            <span className="text-xs font-medium text-secondary">Twin Flame Tarot</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 scroll-smooth">
          <div className="text-center">
            <h2 className="font-serif text-[21px] font-bold leading-snug text-gray-900">
              {PAGE_HEADER.title}
            </h2>
            <p className="mt-2 text-[13px] italic text-gray-500">{PAGE_HEADER.deck}</p>
          </div>

          {/* The six statements. */}
          <div className="mt-5 space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            {PAGE_STATEMENTS.map((statement, index) => (
              <label
                key={statement.lead}
                className="flex cursor-pointer items-start gap-3"
                data-testid={`checkbox-statement-${index}`}
              >
                <input
                  type="checkbox"
                  checked={checked[index]}
                  onChange={() => toggle(index)}
                  className="mt-1 h-5 w-5 shrink-0 accent-purple-600"
                />
                <span className="text-[14px] leading-relaxed text-gray-700">
                  <strong className="block text-gray-900">{statement.lead}</strong>
                  <span className="mt-1 block">{statement.body}</span>
                </span>
              </label>
            ))}
          </div>

          {/* Statement 7 (the request) and 8 (the gift, thanked for before it
              arrives — P9). Given its own card so her declaration reads as a
              separate act from the agreements above it.
              ⚠ The gift is the FIRST HOUSE sent tonight, NOT the 28-night
              ledger. The ledger still ships, unannounced, inside the product
              email — announcing it here sold a second idea during a close. */}
          <div className="mt-4 space-y-3 rounded-2xl border border-purple-100 bg-purple-50/60 p-5 text-[14px] leading-relaxed text-gray-700">
            {PAGE_REQUEST.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <p className="border-t border-purple-100 pt-3">{PAGE_GIFT}</p>
          </div>

          {/* The bump. ⚠ Never pre-check it — a pre-selected paid add-on is a
              negative option under FTC and card-network rules. */}
          <label
            className="mt-4 flex cursor-pointer gap-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-4"
            data-testid="checkbox-bump"
          >
            <input
              type="checkbox"
              checked={bumpTaken}
              onChange={() => setBumpTaken((v) => !v)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-amber-600"
            />
            <span className="text-[13px] leading-snug text-gray-700">
              <strong className="block font-serif text-[14px] italic text-amber-800">
                {BUMP.headline}{' '}
                <span className="whitespace-nowrap not-italic">{BUMP.priceLabel}</span>
              </strong>
              <span className="mt-1 block">{BUMP.body}</span>
            </span>
          </label>

          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-[14px] text-gray-600">{CHECKOUT.totalLabel}</span>
              <span className="font-serif text-[26px] text-gray-900" data-testid="text-total">
                {centsToDollars(totalCents)}
              </span>
            </div>

            {/* P3 — the button completes statement 7's own sentence. Permission
                verb AND the payoff. The page never says "buy". */}
            <div className="mt-4">
              {allChecked ? (
                <button
                  type="button"
                  onClick={() =>
                    console.log('[preview] would checkout', { bump: bumpTaken, totalCents })
                  }
                  className="w-full animate-pulse rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 font-serif text-lg font-bold text-white shadow-lg transition-all duration-300 hover:animate-none hover:shadow-xl"
                  data-testid="button-checkout"
                >
                  {CHECKOUT.button} &nbsp;→
                </button>
              ) : (
                <p
                  className="py-3 text-center text-[11px] italic text-gray-400"
                  data-testid="text-locked-hint"
                >
                  Agree to all six above to continue
                </p>
              )}
              <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-500">
                {CHECKOUT.reassurance}
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-center gap-4 pb-2 text-xs text-gray-400">
            <span>🔒 Secure checkout</span>
            <span>One-time · no subscription</span>
          </div>
        </div>
      </div>
    </div>
  )
}
