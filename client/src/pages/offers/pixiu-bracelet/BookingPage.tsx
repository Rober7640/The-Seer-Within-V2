import { useEffect, useMemo, useState } from 'react'
import { CosmicBackground } from '@/components/CosmicBackground'
import { bookingFirstName } from '@/lib/funnel'
import { beginBackendCheckout } from '@/lib/backendCheckout'
import {
  PAGE_HEADER,
  PAGE_STATEMENTS,
  PAGE_REQUEST,
  BUMP,
  CHECKOUT,
  TAB_TITLE,
  WISHING_BRACELET_PRICE_CENTS,
  WISHING_BRACELET_BUMP_CENTS,
} from '@/lib/pixiuBooking'

// Offer 06 — the Wishing Bracelet (Pixiu) booking page. PAGE treatment.
//
// Copy spec: 06-C1 (booking-page.md) + 06-C3 (order-bump.md). Build spec:
// improve-v1/v1-one-time-BEs/docs/06/HANDOVER.md §4.3.
//
// Cloned from TwinFlameBookingPage.tsx — 06 is fixed-price like 02, a single
// scrolling sheet, NOT 03's two-step PWYW split (nothing here asks for an
// amount). Five agreement statements, the bump inline beside the total, and a
// button that does not EXIST until every box is ticked (the absence is the
// mechanism, per V1's gate — not a disabled button).
//
// ⛔ Posts NO price. The server charges the catalog's ($49). While
// BACKEND_CHECKOUT_LIVE is false the button LOGS and stops (A2 preview).
//
// ⚠ VOICE: the buyer's, first person, throughout. Evelyn is named in the third
// person and never speaks on this page. One sentence of her talking collapses
// the commitment device.
//
// ⚠ 06 is the deck's first PHYSICAL product — the shipping address is NOT
// collected here (06-C1: don't bolt an address form onto the commitment ladder).
// It is collected AFTER Stripe; the under-button line says so.

function centsToDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default function PixiuBookingPage() {
  const [checked, setChecked] = useState<boolean[]>(() => PAGE_STATEMENTS.map(() => false))
  const [bumpTaken, setBumpTaken] = useState(false)
  const [busy, setBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const allChecked = checked.every(Boolean)
  const totalCents = WISHING_BRACELET_PRICE_CENTS + (bumpTaken ? WISHING_BRACELET_BUMP_CENTS : 0)

  // Read once per mount: the letter's ?fn=. Nothing on this page displays it —
  // the page is HER voice and never addresses her — but checkout carries it into
  // Stripe metadata so every screen after the money greets her properly.
  const firstName = useMemo(() => bookingFirstName(), [])

  useEffect(() => {
    document.title = TAB_TITLE
  }, [])

  const toggle = (index: number) =>
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)))

  const handleCheckout = async () => {
    if (busy) return
    setBusy(true)
    setCheckoutError(null)
    const result = await beginBackendCheckout({
      offer: 'wishing-bracelet',
      treatment: 'page',
      bump: bumpTaken,
      firstName,
    })
    if (result.status === 'error') setCheckoutError(result.message)
    // 'redirecting' deliberately leaves the button disabled — the tab is on its
    // way out, and a re-enabled button is a second charge waiting to happen.
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

            {/* Statement 6 — the request, ending on the promise in her words.
                The button completes its own sentence. */}
            <div className="mt-8 space-y-4 border-t border-gray-200 pt-8 text-[15px] leading-relaxed text-gray-700 md:text-[16px]">
              {PAGE_REQUEST.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {/* The bump stays INLINE, beside the total — that is the whole reason
                a bump converts. Multi-paragraph and in her voice (06-C3), so it
                is set as running text, not 02's one-line italic headline.
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
                <strong className="block font-serif text-[16px] leading-snug text-amber-900">
                  {BUMP.headline} <span className="whitespace-nowrap">{BUMP.priceLabel}</span>
                </strong>
                {BUMP.paragraphs.map((paragraph) => (
                  <span key={paragraph} className="mt-1.5 block">
                    {paragraph}
                  </span>
                ))}
                <strong className="mt-2 block text-amber-900">{BUMP.addLabel}</strong>
              </span>
            </label>

            <div className="mt-8 flex items-baseline justify-between border-t border-gray-200 pt-6">
              <span className="text-[15px] text-gray-600">{CHECKOUT.totalLabel}</span>
              <span className="font-serif text-[30px] text-gray-900" data-testid="text-total">
                {centsToDollars(totalCents)}
              </span>
            </div>

            {/* The button completes statement 6's own sentence. The page never
                says "buy". Like the gate, it does not exist until every
                agreement is made. */}
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
                  {CHECKOUT.lockedHint}
                </p>
              )}
              {/* A dead button is the worst outcome on the screen that takes the
                  money — if checkout refuses, say so and say what to do. */}
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
