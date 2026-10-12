import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CosmicBackground } from '@/components/CosmicBackground'
import { backendOfferFunnel, bookingFirstName, bookingLetterCode } from '@/lib/funnel'
import { beginBackendCheckout } from '@/lib/backendCheckout'
import { getBackendVisitorId } from '@/lib/backendVisitor'
import { fetchPriceQuote, type PriceQuote } from '@/lib/teaReadingPrice'
import { track as trackPH } from '@/lib/posthog'
import {
  PAGE_HEADER,
  PAGE_IMAGE,
  PRICE_NOTES,
  CHECK_LINES,
  READY_TICK,
  BUMP,
  CHECKOUT,
  PRICE_STATES,
  WHAT_YOU_GET,
  TAB_TITLE,
  TEA_READING_OFFER,
  pagePriceChangedNotice,
  priceLabel,
  teaReadingCheckoutRequest,
  teaReadingTotalCents,
} from '@/lib/teaReadingBooking'

// Offer 04 — The Turn, a tea-leaf reading by Evelyn Cross. PAGE treatment (the offer root).
// The chat treatment is ./BookingChat.tsx.
//
// Copy spec: improve-v1/v1-one-time-BEs/copy/04/04-C1-booking-page-v2.md (bump included).
// Constants: lib/teaReadingBooking.ts. Shape: 09's v2 one-tick page.
//
// The FIRST PHONE SCREEN (390×844) is the whole decision: headline, sub-line, photo, the
// price, three check lines, ONE tick and the button. The button is ALWAYS on screen: it looks
// disabled until the tick is ticked, and a tap before then points her at the tick. Once ticked,
// the order bump (`double_turning` — intangible) and the total appear between the tick and the button.
//
// ⭐ NO CUP PICK (operator 2026-10-11). Which of the three readings she gets is drawn at random by
// the server at checkout; this page never asks and never sends a cup.
//
// ⭐ THE PRICE IS HER ARM'S, from the server (lib/teaReadingPrice.ts): $35 (A, control) or $45
// (B) in the 50/50 split test, sticky per visitor — $35 for everyone until the test is started.
// While it loads the price line is a blank bar and the button cannot be pressed; if it fails, a
// retry line. ⛔ Never a guessed number. The page posts back the ARM it printed (`quotedArm`); if
// the server answers 409 price_changed, its price replaces the old one here and she is asked to
// press again.
//
// ⛔ Posts NO price. While BACKEND_CHECKOUT_LIVE is false the button LOGS and stops (preview).
//
// A Stripe cancel returns here as ?cancelled=1: a small line says nothing has been taken, the
// tick is unticked, and the name and letter code come back from sessionStorage.

type PriceState =
  | { status: 'loading' }
  | { status: 'ready'; quote: PriceQuote }
  | { status: 'failed' }

export default function TeaReadingBookingPage() {
  const [ready, setReady] = useState(false)
  // ⛔ Starts FALSE and only her click changes it — never pre-checked (negative option).
  const [bumpTaken, setBumpTaken] = useState(false)
  const [price, setPrice] = useState<PriceState>({ status: 'loading' })
  // Set when checkout answered 409 price_changed; cleared on her next press.
  const [movedTo, setMovedTo] = useState<string | null>(null)
  const [nudge, setNudge] = useState(false)
  const [busy, setBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const readyInput = useRef<HTMLInputElement>(null)
  const checkoutButton = useRef<HTMLButtonElement>(null)

  const quote = price.status === 'ready' ? price.quote : null
  const bumpInOrder = ready && bumpTaken
  const canCheckout = ready && quote !== null

  // Read once per mount: the letter's ?fn= and ?c=. Nothing on this page displays either.
  const firstName = useMemo(() => bookingFirstName(), [])
  const letterCode = useMemo(() => bookingLetterCode(), [])
  const search = useMemo(() => window.location.search, [])
  const cameBackFromCheckout = useMemo(() => new URLSearchParams(search).has('cancelled'), [search])

  const loadPrice = useCallback(async () => {
    setPrice({ status: 'loading' })
    const result = await fetchPriceQuote(TEA_READING_OFFER, getBackendVisitorId(), search)
    setPrice(result.kind === 'ok' ? { status: 'ready', quote: result.quote } : { status: 'failed' })
  }, [search])

  useEffect(() => {
    void loadPrice()
  }, [loadPrice])

  useEffect(() => {
    document.title = TAB_TITLE
  }, [])

  // Back from Stripe via the browser's own Back: the page can come back from the back/forward
  // cache exactly as it was — button disabled, price possibly stale (the test may have started
  // or stopped). Re-arm the button and ask for her price again.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      setBusy(false)
      void loadPrice()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [loadPrice])

  // Ticking adds the bump and the total ABOVE the button, which can push it off the first phone
  // screen. Bring it back into view (only if it left the screen).
  useEffect(() => {
    if (!ready) return
    const button = checkoutButton.current
    if (!button || button.getBoundingClientRect().bottom <= window.innerHeight) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    button.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [ready])

  const onReadyChange = (next: boolean) => {
    setReady(next)
    setNudge(false)
    // Unticking hides the bump; it comes back UNTICKED, never as she left it.
    if (!next) setBumpTaken(false)
  }

  const handleCheckout = async () => {
    if (!ready) {
      setNudge(true)
      readyInput.current?.focus()
      return
    }
    if (busy || !quote) return
    setBusy(true)
    setCheckoutError(null)
    setMovedTo(null)
    trackPH('checkout_initiated', {
      funnel: backendOfferFunnel(TEA_READING_OFFER),
      step: 'sales',
      product: 'be_tea_reading',
      price_cents: teaReadingTotalCents(quote.cents, bumpInOrder),
      bump: bumpInOrder,
      treatment: 'page',
      price_arm: quote.arm,
    })
    const result = await beginBackendCheckout(
      teaReadingCheckoutRequest({ treatment: 'page', firstName, letterCode, bump: bumpInOrder, quote }),
    )
    if (result.status === 'price_changed') {
      // Show the server's price everywhere it is printed; her next press sends the new arm.
      setPrice({ status: 'ready', quote: result.current })
      setMovedTo(result.current.label)
    }
    if (result.status === 'error') setCheckoutError(result.message)
    if (result.status !== 'redirecting') setBusy(false)
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <CosmicBackground />

      <div className="relative z-10 px-4 pb-10 pt-6 md:py-14">
        <div className="mx-auto max-w-2xl">
          {/* Masthead sits ON the starfield, same as the other backend pages. */}
          <header className="text-center">
            <div className="text-[11px] font-medium uppercase tracking-[0.35em] text-secondary">
              {PAGE_HEADER.eyebrow}
            </div>
            <h1 className="mx-auto mt-2 max-w-[20ch] font-serif text-[27px] leading-[1.15] text-white md:mt-3 md:text-[38px]">
              {PAGE_HEADER.title}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-snug text-purple-100/85 md:mt-3 md:text-[16px]">
              {PAGE_HEADER.subline}
            </p>
          </header>

          <div className="mt-5 rounded-2xl bg-white/97 p-5 shadow-2xl ring-1 ring-white/20 md:mt-8 md:p-10">
            {cameBackFromCheckout && (
              <p
                className="-mt-1 mb-3 text-center text-[13px] leading-snug text-gray-600"
                data-testid="text-cancelled"
              >
                {PRICE_STATES.cancelled}
              </p>
            )}

            {/* The FULL, unread cup — pre-cropped to 3:2 so it doesn't push the button down. */}
            <figure className="mx-auto w-full md:w-[380px]" data-testid="figure-cup">
              <img
                src={PAGE_IMAGE.src}
                alt={PAGE_IMAGE.alt}
                width={PAGE_IMAGE.width}
                height={PAGE_IMAGE.height}
                className="block aspect-[3/2] h-auto w-full rounded-xl bg-stone-900 object-cover"
                decoding="async"
              />
              <figcaption className="mt-1 text-center text-[12px] italic leading-snug text-gray-500">
                {PAGE_IMAGE.caption}
              </figcaption>
            </figure>

            {/* Her arm's price, from the server. Never a literal, never a guess. */}
            <div
              className="mt-3 flex min-h-[40px] items-center justify-center gap-3"
              data-testid="text-price-line"
              data-state={price.status}
              data-arm={quote?.arm ?? ''}
            >
              {price.status === 'failed' ? (
                <p className="text-center text-[14px] text-gray-700" role="alert" data-testid="text-price-failed">
                  {PRICE_STATES.failed}{' '}
                  <button
                    type="button"
                    onClick={() => void loadPrice()}
                    className="font-semibold text-purple-700 underline underline-offset-2"
                    data-testid="button-price-retry"
                  >
                    {PRICE_STATES.retry}
                  </button>
                </p>
              ) : (
                <>
                  {quote ? (
                    <span
                      className="font-serif text-[32px] font-semibold leading-none text-gray-900"
                      data-testid="text-price"
                    >
                      {quote.label}
                    </span>
                  ) : (
                    <span
                      className="block h-8 w-16 animate-pulse rounded-md bg-gray-200"
                      role="status"
                      aria-label={PRICE_STATES.loadingLabel}
                      data-testid="price-loading"
                    />
                  )}
                  <span className="h-9 w-px bg-gray-300" aria-hidden="true" />
                  <span className="text-left text-[13px] leading-snug text-gray-600">
                    {PRICE_NOTES.map((note) => (
                      <span key={note} className="block">
                        {note}
                      </span>
                    ))}
                  </span>
                </>
              )}
            </div>

            {/* Display only — not checkboxes. */}
            <ul className="mx-auto mt-4 max-w-sm space-y-1.5" data-testid="list-checks">
              {CHECK_LINES.map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-[15px] leading-snug text-gray-800">
                  <span
                    aria-hidden="true"
                    className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-[11px] font-bold text-white"
                  >
                    ✓
                  </span>
                  <span className="text-pretty">{line}</span>
                </li>
              ))}
            </ul>

            <div className="mx-auto mt-4 max-w-md">
              {/* The ONE required tick, in her voice. */}
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3.5 py-3 transition-colors ${
                  ready ? 'border-purple-500 bg-purple-50' : 'border-purple-200 bg-white'
                } ${nudge && !ready ? 'ring-2 ring-purple-500 ring-offset-2' : ''}`}
                data-testid="checkbox-ready"
              >
                <input
                  ref={readyInput}
                  type="checkbox"
                  checked={ready}
                  onChange={(e) => onReadyChange(e.target.checked)}
                  className="h-6 w-6 shrink-0 accent-purple-600"
                />
                <span className="text-balance text-[16px] font-semibold leading-snug text-gray-900">{READY_TICK}</span>
              </label>

              {ready && (
                <>
                  {/* The order bump (the Double Turning, 04-C1 v2) stays INLINE, directly above the total and
                      the button. ⚠ Never pre-checked — a pre-selected paid add-on is a negative
                      option under FTC and card-network rules. */}
                  <label
                    className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 px-3.5 py-2.5"
                    data-testid="checkbox-bump"
                  >
                    <input
                      type="checkbox"
                      checked={bumpTaken}
                      onChange={() => setBumpTaken((v) => !v)}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-amber-600"
                    />
                    <span className="min-w-0 text-[12.5px] leading-snug text-gray-700">
                      <strong className="block text-[14.5px] leading-snug text-amber-900">
                        {BUMP.label}
                        {' · '}
                        <span className="whitespace-nowrap">{BUMP.priceLabel}</span>
                      </strong>
                      <span className="mt-0.5 block">{BUMP.note}</span>
                    </span>
                  </label>

                  <div className="mt-2 flex items-baseline justify-between px-1">
                    <span className="text-[14px] text-gray-600">{CHECKOUT.totalLabel}</span>
                    <span className="font-serif text-[20px] leading-tight text-gray-900" data-testid="text-total">
                      {quote ? priceLabel(teaReadingTotalCents(quote.cents, bumpInOrder)) : '—'}
                    </span>
                  </div>
                </>
              )}

              {movedTo && (
                <p
                  className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-[13.5px] leading-snug text-amber-900"
                  role="alert"
                  data-testid="text-price-changed"
                >
                  {pagePriceChangedNotice(movedTo)}
                </p>
              )}

              {/* ALWAYS on screen. Not natively disabled before the tick, so a tap can point her at
                  the tick; aria-disabled tells assistive tech it won't check out yet. Natively
                  disabled while there is no price to charge, or while it is on its way to Stripe. */}
              <button
                ref={checkoutButton}
                type="button"
                onClick={handleCheckout}
                disabled={busy || !quote}
                aria-disabled={!canCheckout}
                className={`mt-3 w-full scroll-mb-4 rounded-lg px-5 py-4 font-serif text-lg font-bold transition-all duration-300 md:px-6 md:py-5 md:text-xl ${
                  canCheckout
                    ? 'animate-pulse bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg hover:animate-none hover:shadow-xl disabled:animate-none disabled:opacity-70'
                    : 'cursor-not-allowed bg-gray-200 text-gray-400'
                }`}
                data-testid="button-checkout"
              >
                {CHECKOUT.button} &nbsp;→
              </button>
              {!ready && (
                <p
                  className="mt-2 text-center text-[13px] italic text-gray-500"
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
                className="mt-3 text-center text-[12px] leading-relaxed text-gray-500"
                data-testid="text-small-print"
              >
                {CHECKOUT.trust.map((item) => (
                  <span key={item}>
                    <span className="whitespace-nowrap">{item}</span>
                    {' · '}
                  </span>
                ))}
                <a
                  href={CHECKOUT.refundHref}
                  className="underline underline-offset-2 hover:text-gray-700"
                  data-testid="link-refund"
                >
                  {CHECKOUT.refundLabel}
                </a>
                {' · '}
                <a
                  href={`mailto:${CHECKOUT.supportEmail}`}
                  className="underline underline-offset-2 hover:text-gray-700"
                  data-testid="link-support"
                >
                  {CHECKOUT.supportEmail}
                </a>
              </p>
            </div>

            {/* Below the fold. */}
            <div className="mx-auto mt-8 max-w-md space-y-7 border-t border-gray-200 pt-6">
              <section data-testid="section-what-you-get">
                <h2 className="font-serif text-[19px] text-gray-900">{WHAT_YOU_GET.heading}</h2>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-snug text-gray-700 marker:text-purple-400">
                  {WHAT_YOU_GET.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

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
