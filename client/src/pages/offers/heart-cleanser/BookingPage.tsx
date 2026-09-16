import { useEffect, useMemo, useState } from 'react'
import { CosmicBackground } from '@/components/CosmicBackground'
import { backendOfferFunnel, bookingFirstName, bookingLetterCode } from '@/lib/funnel'
import { beginBackendCheckout } from '@/lib/backendCheckout'
import { track as trackPH } from '@/lib/posthog'
import {
  PAGE_HEADER,
  PAGE_IMAGE,
  PAGE_STATEMENTS,
  BUMP,
  CHECKOUT,
  TAB_TITLE,
  allStatementsTicked,
  formatTotal,
  heartCleanserCheckoutRequest,
  heartCleanserTotalCents,
} from '@/lib/heartCleanserBooking'

// Offer 09 — the Heart Cleanser Love Charm booking page. PAGE treatment only.
//
// Copy spec: improve-v1/v1-one-time-BEs/docs/09/booking-page/09-C1-booking-page.md + 09-C3-order-bump.md
// (constants in lib/heartCleanserBooking.ts).
//
// Cloned from the pixiu (06) BookingPage — same shell and visual system. One agreement
// statement per entry in PAGE_STATEMENTS (four, about the charm and the ritual — no
// logistics), the order bump (Reiki charging, 09-C3) inline above the total, and a button
// that does not EXIST until every statement is ticked (the absence is the mechanism, not a
// disabled button). The bump sits BEHIND the same gate: it only appears once every
// statement is ticked, together with the button (Joel, 2026-09-16). There is no request
// paragraph (09-C1-ticks-rewrite): the statements run straight into the bump.
//
// ⛔ Posts NO price — only whether the bump is ticked. The server charges the catalog's
// ($59, plus $11.11 for the bump). While BACKEND_CHECKOUT_LIVE is false the button LOGS and
// stops (preview).
//
// ⚠ VOICE: the buyer's, first person, in every statement. Evelyn is named in the third
// person and never speaks on this page.
//
// ⚠ The shipping address is taken on Stripe's own Checkout page, BEFORE payment
// (worldwide). No address form here, and the small print under the button says so.
//
// A Stripe cancel returns here as ?cancelled=1 with nothing else on the URL. Like
// 06's page, nothing special is shown for it: the page renders fresh, and the name
// and letter code come back from sessionStorage (bookingFirstName/bookingLetterCode).

export default function HeartCleanserBookingPage() {
  const [checked, setChecked] = useState<boolean[]>(() => PAGE_STATEMENTS.map(() => false))
  // ⛔ Starts FALSE and only her click changes it — never pre-checked (negative option).
  const [bumpTaken, setBumpTaken] = useState(false)
  const [busy, setBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const allChecked = allStatementsTicked(checked)
  // The bump only counts while it is on screen, i.e. while every statement is ticked.
  const bumpInOrder = allChecked && bumpTaken
  const totalCents = heartCleanserTotalCents(bumpInOrder)

  // Read once per mount: the letter's ?fn= and ?c=. Nothing on this page displays
  // either — checkout carries them into Stripe metadata (the name for every screen
  // after the money; the code so we know which letter she bought from).
  const firstName = useMemo(() => bookingFirstName(), [])
  const letterCode = useMemo(() => bookingLetterCode(), [])

  useEffect(() => {
    document.title = TAB_TITLE
  }, [])

  // 'redirecting' leaves the button disabled on purpose (no second charge). But if
  // she presses Back on Stripe, the browser can restore this page from its back/
  // forward cache exactly as it was — disabled. Re-arm it so she is never left
  // with a dead button.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  const toggle = (index: number) =>
    setChecked((prev) => {
      const next = prev.map((v, i) => (i === index ? !v : v))
      // Unticking a statement hides the bump; it comes back UNTICKED, never as she left it.
      if (!allStatementsTicked(next)) setBumpTaken(false)
      return next
    })

  const handleCheckout = async () => {
    if (busy) return
    setBusy(true)
    setCheckoutError(null)
    trackPH('checkout_initiated', {
      funnel: backendOfferFunnel('heart-cleanser'),
      step: 'sales',
      product: 'be_heart_cleanser',
      price_cents: totalCents,
      bump: bumpInOrder,
      treatment: 'page',
    })
    const result = await beginBackendCheckout(
      heartCleanserCheckoutRequest({ firstName, letterCode, bump: bumpInOrder }),
    )
    if (result.status === 'error') setCheckoutError(result.message)
    if (result.status !== 'redirecting') setBusy(false)
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <CosmicBackground />

      <div className="relative z-10 px-4 py-10 md:py-14">
        <div className="mx-auto max-w-2xl">
          {/* Masthead sits ON the starfield, same as the live Pixiu page. */}
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

          <div className="mt-8 rounded-2xl bg-white/97 p-6 shadow-2xl ring-1 ring-white/20 md:p-10">
            {/* The one product image — the studio close-up, rosequartz 570px (see lib/heartCleanserBooking.ts). */}
            <figure className="mx-auto mb-8 w-full md:w-[320px]" data-testid="figure-charm">
              <img
                src={PAGE_IMAGE.src}
                alt={PAGE_IMAGE.alt}
                className="block h-auto w-full max-w-full rounded-xl"
                decoding="async"
              />
              <figcaption className="mt-2 text-center text-[13px] italic leading-snug text-gray-500">
                {PAGE_IMAGE.caption}
              </figcaption>
            </figure>

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
                  <span className="min-w-0 text-[15px] leading-relaxed text-gray-700 md:text-[16px]">
                    <strong className="block text-gray-900">{statement.lead}</strong>
                    <span className="mt-1 block">{statement.body}</span>
                  </span>
                </label>
              ))}
            </div>

            {/* The order bump (09-C3) stays INLINE, directly above the total — that is the
                whole reason a bump converts. One label and one short line in her voice.
                It appears only once every statement is ticked (Joel, 2026-09-16).
                ⚠ Never pre-checked — a pre-selected paid add-on is a negative option under
                FTC and card-network rules. */}
            {allChecked && (
            <label
              className="mt-8 flex cursor-pointer items-start gap-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-4 md:p-5"
              data-testid="checkbox-bump"
            >
              <input
                type="checkbox"
                checked={bumpTaken}
                onChange={() => setBumpTaken((v) => !v)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-amber-600"
              />
              <span className="min-w-0 text-[14px] leading-snug text-gray-700 md:text-[15px]">
                <strong className="block font-serif text-[16px] leading-snug text-amber-900">
                  {BUMP.label}
                </strong>
                <span className="mt-1.5 block">
                  <strong className="whitespace-nowrap text-amber-900">{BUMP.priceLabel}</strong>
                  {' · '}
                  {BUMP.note}
                </span>
              </span>
            </label>
            )}

            <div className="mt-6 flex items-baseline justify-between border-t border-gray-200 pt-6">
              <span className="text-[15px] text-gray-600">{CHECKOUT.totalLabel}</span>
              <span className="font-serif text-[30px] text-gray-900" data-testid="text-total">
                {formatTotal(totalCents)}
              </span>
            </div>

            <div className="mt-6">
              {allChecked ? (
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={busy}
                  className="w-full animate-pulse rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-5 font-serif text-lg font-bold text-white shadow-lg transition-all duration-300 hover:animate-none hover:shadow-xl disabled:animate-none disabled:opacity-70 md:px-6 md:text-xl"
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
              {checkoutError && (
                <p
                  className="mt-3 text-center text-[13px] text-red-600"
                  data-testid="text-checkout-error"
                  role="alert"
                >
                  {checkoutError}
                </p>
              )}
              <p
                className="mt-4 text-center text-[13px] leading-relaxed text-gray-500"
                data-testid="text-small-print"
              >
                {CHECKOUT.reassurance}
              </p>
              <p className="mt-2 text-center text-[13px] leading-relaxed text-gray-500">
                <a
                  href={CHECKOUT.refundHref}
                  className="underline underline-offset-2 hover:text-gray-700"
                  data-testid="link-refund"
                >
                  {CHECKOUT.refundLabel}
                </a>
                {' · '}
                {CHECKOUT.supportLead}{' '}
                <a
                  href={`mailto:${CHECKOUT.supportEmail}`}
                  className="underline underline-offset-2 hover:text-gray-700"
                  data-testid="link-support"
                >
                  {CHECKOUT.supportEmail}
                </a>
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-purple-200/50">
            <span>🔒 Secure checkout</span>
            <span>One-time · no subscription</span>
          </div>
        </div>
      </div>
    </div>
  )
}
