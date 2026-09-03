import { useEffect, useMemo, useState } from 'react'
import { CosmicBackground } from '@/components/CosmicBackground'
import { bookingFirstName } from '@/lib/funnel'
import { track as trackPH } from '@/lib/posthog'
import { beginBackendCheckout } from '@/lib/backendCheckout'
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
// The A/B challenger to the locked chat flow (TwinFlameBookingChat.tsx).
// Copy spec: 02-C1 in improve-v1/v1-one-time-BEs/copy/02/02-C1-booking-page.md
// Deliverables + what is locked: docs/00h-DELIVERABLES-BEs.md
//
// ⛔ Nothing here charges. The button logs and stops.
//
// ⚠ THIS IS A PAGE, NOT A CHAT *(operator, 2026-08-06)*. An earlier build put
// this copy inside ChatPage's shell — the frosted max-w-lg panel, the avatar
// header, "Online Now", a fixed-viewport container. That was incoherent: it
// looked like a conversation and wasn't one. So:
//   ⛔ no chat panel, no avatar, no presence indicator, no Exit
//   ✓  it SCROLLS like a document, because it is one
//   ✓  a wider column than a chat bubble — long-form text needs the measure
//   ✓  a light sheet over the starfield, because a 700-word commitment
//      statement cannot be read off a dark ground
// It stays in Evelyn's world (CosmicBackground, purple, gold, serif) so the
// buyer arriving from her letter lands somewhere recognisable — but as her
// stationery, not her chat window.
//
// ⚠ VOICE: the buyer's, first person, throughout. Evelyn is named in the third
// person and never speaks on this page. One sentence of her talking collapses
// the commitment device.

function centsToDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default function TwinFlameBookingPage() {
  // ⚠ OPEN DECISION (00-FLOW-BEs.md #5): required vs decorative. Built as
  // REQUIRED — and like the gate, the button does not exist until every box is
  // ticked. The source's wireframe shows them PRE-CHECKED, which would make them
  // decorative and would also make this an unfair comparison against the chat.
  const [checked, setChecked] = useState<boolean[]>(() => PAGE_STATEMENTS.map(() => false))
  const [bumpTaken, setBumpTaken] = useState(false)
  const [busy, setBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const allChecked = checked.every(Boolean)
  const totalCents = TWIN_FLAME_PRICE_CENTS + (bumpTaken ? TWIN_FLAME_BUMP_CENTS : 0)

  // Read once per mount: the letter's ?fn=. Nothing on this page displays it — the page
  // is HER voice and never addresses her — but checkout carries it into Stripe metadata
  // so every screen after the money greets her properly.
  const firstName = useMemo(() => bookingFirstName(), [])

  // The order bump is inline on this treatment, so it is "offered" the moment the
  // page renders. Mirrors fb-read's `bump_offered` exposure so the two funnels line
  // up in PostHog. funnel:'twinflame' slots it straight into the Twin Flame dashboard.
  useEffect(() => {
    trackPH('bump_offered', {
      funnel: 'twinflame',
      step: 'sales',
      price_cents: TWIN_FLAME_BUMP_CENTS,
      treatment: 'page',
    })
  }, [])

  const toggle = (index: number) =>
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)))

  // ⛔ Posts no price. The server charges the catalog's. See lib/backendCheckout.ts —
  // while BACKEND_CHECKOUT_LIVE is false this still just logs, as A2 requires.
  const handleCheckout = async () => {
    if (busy) return
    setBusy(true)
    setCheckoutError(null)
    // She has started the checkout — the counterpart to fb-read's `checkout_initiated`,
    // so the Twin Flame funnel gets a lander_view → checkout_initiated → purchase step.
    trackPH('checkout_initiated', {
      funnel: 'twinflame',
      step: 'sales',
      product: 'be_twin_flame',
      price_cents: totalCents,
      bump: bumpTaken,
      treatment: 'page',
    })
    const result = await beginBackendCheckout({
      offer: 'twin-flame',
      treatment: 'page',
      bump: bumpTaken,
      firstName,
    })
    if (result.status === 'error') setCheckoutError(result.message)
    // 'redirecting' deliberately leaves the button disabled — the tab is on its way out,
    // and a re-enabled button is a second charge waiting to happen.
    if (result.status !== 'redirecting') setBusy(false)
  }

  return (
    <div className="relative min-h-screen">
      <CosmicBackground />

      <div className="relative z-10 px-4 py-10 md:py-14">
        <div className="mx-auto max-w-2xl">
          {/* Masthead sits ON the starfield — the only part of the page that
              does, so the sheet below reads as something laid on her table. */}
          <header className="text-center">
            <div className="text-[11px] font-medium uppercase tracking-[0.35em] text-secondary">
              Evelyn Cross
            </div>
            <h1 className="mt-3 font-serif text-[26px] leading-tight text-white md:text-[34px]">
              {PAGE_HEADER.title}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[14px] italic leading-relaxed text-purple-200/80">
              {PAGE_HEADER.deck}
            </p>
          </header>

          {/* The sheet. Long-form commitment copy needs a light ground and a
              real measure — this is the part a chat bubble cannot do. */}
          <div className="mt-8 rounded-2xl bg-white/97 p-6 shadow-2xl ring-1 ring-white/20 md:p-10">
            <div className="space-y-6">
              {PAGE_STATEMENTS.map((statement, index) => (
                <label
                  key={statement.lead}
                  className="flex cursor-pointer items-start gap-4"
                  data-testid={`checkbox-statement-${index}`}
                >
                  <input
                    type="checkbox"
                    checked={checked[index]}
                    onChange={() => toggle(index)}
                    className="mt-1 h-5 w-5 shrink-0 accent-purple-600"
                  />
                  <span className="text-[15px] leading-relaxed text-gray-700 md:text-[16px]">
                    <strong className="block text-gray-900">{statement.lead}</strong>
                    <span className="mt-1 block">{statement.body}</span>
                  </span>
                </label>
              ))}
            </div>

            {/* Statement 7 — the request, ending on the promise in her words. */}
            <div className="mt-8 space-y-4 border-t border-gray-200 pt-8 text-[15px] leading-relaxed text-gray-700 md:text-[16px]">
              {PAGE_REQUEST.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {/* Statement 8 — the gift, received and thanked for BEFORE it
                arrives (P9). ⚠ The gift is the FIRST HOUSE sent tonight, NOT the
                28-night ledger, which now ships unannounced inside the product
                email. Announcing it here sold a second idea during a close. */}
            <p className="mt-6 text-[15px] leading-relaxed text-gray-700 md:text-[16px]">
              {PAGE_GIFT}
            </p>

            {/* The bump stays INLINE here, beside the total. That is the whole
                reason a bump converts, and it is one of the axes on which this
                treatment differs from the chat, where it is its own turn.
                ⚠ Never pre-check it — a pre-selected paid add-on is a negative
                option under FTC and card-network rules. */}
            <label
              className="mt-8 flex cursor-pointer gap-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-5"
              data-testid="checkbox-bump"
            >
              <input
                type="checkbox"
                checked={bumpTaken}
                onChange={() => setBumpTaken((v) => !v)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-amber-600"
              />
              <span className="text-[14px] leading-snug text-gray-700">
                <strong className="block font-serif text-[15px] italic text-amber-800">
                  {BUMP.headline}{' '}
                  <span className="whitespace-nowrap not-italic">{BUMP.priceLabel}</span>
                </strong>
                <span className="mt-1.5 block">{BUMP.body}</span>
              </span>
            </label>

            <div className="mt-8 flex items-baseline justify-between border-t border-gray-200 pt-6">
              <span className="text-[15px] text-gray-600">{CHECKOUT.totalLabel}</span>
              <span className="font-serif text-[30px] text-gray-900" data-testid="text-total">
                {centsToDollars(totalCents)}
              </span>
            </div>

            {/* P3 — the button completes statement 7's own sentence. Permission
                verb AND the payoff. The page never says "buy". Like the gate, it
                does not exist until every agreement is made. */}
            <div className="mt-6">
              {allChecked ? (
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={busy}
                  className="w-full animate-pulse rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 font-serif text-xl font-bold text-white shadow-lg transition-all duration-300 hover:animate-none hover:shadow-xl disabled:animate-none disabled:opacity-70"
                  data-testid="button-checkout"
                >
                  {CHECKOUT.button} &nbsp;→
                </button>
              ) : (
                <p
                  className="py-4 text-center text-[13px] italic text-gray-400"
                  data-testid="text-locked-hint"
                >
                  Agree to all six above to continue
                </p>
              )}
              {/* A dead button is the worst outcome on the screen that takes the money —
                  if checkout refuses, say so and say what to do. */}
              {checkoutError && (
                <p
                  className="mt-3 text-center text-[13px] text-red-600"
                  data-testid="text-checkout-error"
                  role="alert"
                >
                  {checkoutError}
                </p>
              )}
              <p className="mt-4 text-center text-[13px] leading-relaxed text-gray-500">
                {CHECKOUT.reassurance}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-5 text-xs text-purple-200/50">
            <span>🔒 Secure checkout</span>
            <span>One-time · no subscription</span>
          </div>
        </div>
      </div>
    </div>
  )
}
