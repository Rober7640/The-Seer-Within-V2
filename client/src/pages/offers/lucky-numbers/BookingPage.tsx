import { useEffect, useMemo, useRef, useState } from 'react'
import { CosmicBackground } from '@/components/CosmicBackground'
import { backendOfferFunnel, bookingFirstName, bookingLetterCode } from '@/lib/funnel'
import { beginBackendCheckout } from '@/lib/backendCheckout'
import { track as trackPH } from '@/lib/posthog'
import {
  BUMP,
  CANCELLED_LINE,
  CHECKOUT,
  EMPTY_INTAKE,
  FIELDS,
  PAGE_HEADER,
  PRICE_NOTES,
  REASON_LINE,
  TAB_TITLE,
  LUCKY_NUMBERS_OFFER,
  LUCKY_NUMBERS_PRICE_CENTS,
  WHAT_YOU_GET,
  checkIntake,
  fieldForServerCode,
  forgetIntake,
  intakeFilled,
  priceLabel,
  restoreIntake,
  saveIntake,
  totalLabel,
  luckyNumbersCheckoutRequest,
  luckyNumbersTotalCents,
  type IntakeProblems,
  type LuckyNumbersIntake,
} from '@/lib/luckyNumbersBooking'

// Offer 12 — Lucky Numbers, a numbers reading by Evelyn Cross. Page treatment only.
//
// Copy spec: improve-v1/v1-one-time-BEs/docs/12/booking-page/12-C1-booking-page.md, bump 12-C3.
// Constants: lib/luckyNumbersBooking.ts. Shape: 11's page (unsent-letter/BookingPage.tsx), the
// same two fields, the same testids, with 12's words. No required tick: the bump is the one box.
//
// The button needs her two fields and nothing else. It looks disabled until they're filled, and a
// tap before then jumps to the first thing missing. The bump sits above the total, never pre-ticked,
// and one click toggles it and the total. On shorter phones the button starts below the screen, so
// ticking the bump scrolls just far enough to bring it into view.
//
// ⛔ Her birth name and date go to our server and be_order_intake, never to Stripe. ⛔ Posts NO
// price. While BACKEND_CHECKOUT_LIVE is false the button LOGS and stops (preview). ?c= (arm A 1–5,
// arm B 11–15) rides to Stripe metadata only; nothing on the page changes by arm.
//
// A Stripe cancel returns here as ?cancelled=1: her details come back from sessionStorage, the
// bump does not. ⛔ A paid add-on is never restored, not by the back button either.

/** The message ABOVE the input, below the label, prefixed "Error:" (MarcusBooking's FieldError). */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <span id={id} className="mt-0.5 block text-[13px] leading-snug text-red-700" data-testid={id}>
      {`Error: ${message}`}
    </span>
  )
}

const INPUT =
  'block h-11 w-full rounded-lg border bg-white px-3 text-[16px] text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200'

export default function LuckyNumbersBookingPage() {
  const search = useMemo(() => window.location.search, [])
  const cameBackFromCheckout = useMemo(() => new URLSearchParams(search).has('cancelled'), [search])

  const [intake, setIntake] = useState<LuckyNumbersIntake>(() =>
    cameBackFromCheckout ? restoreIntake() : EMPTY_INTAKE,
  )
  const [fieldErrors, setFieldErrors] = useState<IntakeProblems>({})
  // ⛔ Starts FALSE and only her click changes it — never pre-checked (negative option).
  const [bumpTaken, setBumpTaken] = useState(false)
  const [busy, setBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const checkoutButton = useRef<HTMLButtonElement>(null)

  const canCheckout = intakeFilled(intake)
  const dobInvalid = fieldErrors.dob ? true : undefined

  // Read once per mount: the letter's ?fn= and ?c=. Nothing on this page displays either.
  const firstName = useMemo(() => bookingFirstName(), [])
  const letterCode = useMemo(() => bookingLetterCode(), [])

  useEffect(() => {
    document.title = TAB_TITLE
    if (!cameBackFromCheckout) forgetIntake()
  }, [cameBackFromCheckout])

  // Back from Stripe via the browser's own Back: the page can come back from the back/forward
  // cache exactly as it was. Re-arm the button, and take the bump back off.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      setBusy(false)
      setBumpTaken(false)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  // The bump and the total sit ABOVE the button, so on a short phone it's below the screen when she
  // ticks the bump. Bring it into view (only if it's off the screen).
  useEffect(() => {
    if (!bumpTaken) return
    const button = checkoutButton.current
    if (!button || button.getBoundingClientRect().bottom <= window.innerHeight) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    button.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [bumpTaken])

  const setField = (key: keyof LuckyNumbersIntake, value: string) => {
    setIntake((prev) => ({ ...prev, [key]: value }))
    setCheckoutError(null)
    const errKey = key === 'birthName' ? 'birthName' : 'dob'
    if (fieldErrors[errKey]) setFieldErrors((prev) => ({ ...prev, [errKey]: undefined }))
  }

  const jumpTo = (id: string) => {
    const el = document.getElementById(id)
    el?.focus()
    el?.scrollIntoView({ block: 'center' })
  }

  const handleCheckout = async () => {
    if (busy) return
    setCheckoutError(null)

    // Mark every bad field and jump to the first. Checked on press only.
    const checked = checkIntake(intake)
    if (!checked.ok) {
      setFieldErrors(checked.problems)
      jumpTo(checked.problems.birthName ? 'birth-name' : 'dob-month')
      return
    }
    setBusy(true)
    saveIntake(intake)
    // ⛔ No name, no date: what she typed never goes to analytics.
    trackPH('checkout_initiated', {
      funnel: backendOfferFunnel(LUCKY_NUMBERS_OFFER),
      step: 'sales',
      product: 'be_lucky_numbers',
      price_cents: luckyNumbersTotalCents(bumpTaken),
      bump: bumpTaken,
      treatment: 'page',
    })
    const result = await beginBackendCheckout(
      luckyNumbersCheckoutRequest({
        firstName,
        letterCode,
        bump: bumpTaken,
        fullBirthName: checked.fullBirthName,
        dateOfBirth: checked.dateOfBirth,
      }),
    )
    if (result.status === 'error') {
      const field = fieldForServerCode(result.code)
      if (field) {
        setFieldErrors({ [field]: result.message })
        jumpTo(field === 'birthName' ? 'birth-name' : 'dob-month')
      } else {
        setCheckoutError(result.message)
      }
    }
    if (result.status !== 'redirecting') setBusy(false)
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <CosmicBackground />

      <div className="relative z-10 px-4 pb-10 pt-5 md:py-14">
        <div className="mx-auto max-w-2xl">
          {/* Masthead sits ON the starfield, same as the other backend pages. */}
          <header className="text-center">
            <div className="text-[11px] font-medium uppercase tracking-[0.35em] text-secondary">
              {PAGE_HEADER.eyebrow}
            </div>
            <h1 className="mx-auto mt-1.5 font-serif text-[25px] leading-[1.15] text-white md:mt-3 md:text-[38px]">
              {PAGE_HEADER.title}
            </h1>
            <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-snug text-purple-100/85 md:mt-3 md:text-[16px]">
              {PAGE_HEADER.subline}
            </p>
          </header>

          <div className="mt-3.5 rounded-2xl bg-white/97 p-4 shadow-2xl ring-1 ring-white/20 md:mt-8 md:p-10">
            <div className="mx-auto max-w-md">
              {cameBackFromCheckout && (
                <p
                  className="mb-2.5 text-center text-[13px] leading-snug text-gray-600"
                  data-testid="text-cancelled"
                >
                  {CANCELLED_LINE}
                </p>
              )}

              {/* The one reason this page gives for asking. Evelyn's own sentence, signed. */}
              <p className="text-center text-[14px] italic leading-snug text-gray-700" data-testid="text-reason-line">
                “{REASON_LINE.quote}” <span className="whitespace-nowrap not-italic">— {REASON_LINE.signature}</span>
              </p>

              <div className="mt-2.5" id="field-birth-name">
                <label htmlFor="birth-name" className="block text-[14px] font-semibold leading-snug text-gray-900">
                  {FIELDS.birthName.label}
                </label>
                <span className="block text-[12.5px] leading-snug text-gray-600">{FIELDS.birthName.hint}</span>
                <FieldError id="birth-name-error" message={fieldErrors.birthName} />
                <input
                  id="birth-name"
                  name="birth-name"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="words"
                  maxLength={200}
                  value={intake.birthName}
                  onChange={(ev) => setField('birthName', ev.currentTarget.value)}
                  aria-invalid={fieldErrors.birthName ? true : undefined}
                  aria-describedby={fieldErrors.birthName ? 'birth-name-error' : undefined}
                  className={`${INPUT} mt-1 ${fieldErrors.birthName ? 'border-red-500' : 'border-gray-300'}`}
                  data-testid="input-birth-name"
                />
              </div>

              <div className="mt-2.5" id="field-dob" role="group" aria-labelledby="dob-label">
                <span id="dob-label" className="block text-[14px] font-semibold leading-snug text-gray-900">
                  {FIELDS.dateOfBirth.label}
                </span>
                <span className="block text-[12.5px] leading-snug text-gray-600">{FIELDS.dateOfBirth.hint}</span>
                <FieldError id="dob-error" message={fieldErrors.dob} />
                <div className="mt-1 grid grid-cols-[1fr_1fr_1.4fr] gap-2">
                  <input
                    id="dob-month"
                    name="dob-month"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    autoComplete="bday-month"
                    placeholder={FIELDS.dateOfBirth.month}
                    aria-label="Month"
                    value={intake.month}
                    onChange={(ev) => setField('month', ev.currentTarget.value)}
                    aria-invalid={dobInvalid}
                    aria-describedby={dobInvalid ? 'dob-error' : undefined}
                    className={`${INPUT} text-center ${dobInvalid ? 'border-red-500' : 'border-gray-300'}`}
                    data-testid="input-dob-month"
                  />
                  <input
                    id="dob-day"
                    name="dob-day"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    autoComplete="bday-day"
                    placeholder={FIELDS.dateOfBirth.day}
                    aria-label="Day"
                    value={intake.day}
                    onChange={(ev) => setField('day', ev.currentTarget.value)}
                    aria-invalid={dobInvalid}
                    className={`${INPUT} text-center ${dobInvalid ? 'border-red-500' : 'border-gray-300'}`}
                    data-testid="input-dob-day"
                  />
                  <input
                    id="dob-year"
                    name="dob-year"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    autoComplete="bday-year"
                    placeholder={FIELDS.dateOfBirth.year}
                    aria-label="Year"
                    value={intake.year}
                    onChange={(ev) => setField('year', ev.currentTarget.value)}
                    aria-invalid={dobInvalid}
                    className={`${INPUT} text-center ${dobInvalid ? 'border-red-500' : 'border-gray-300'}`}
                    data-testid="input-dob-year"
                  />
                </div>
              </div>

              {/* From the catalog. Never typed. */}
              <div className="mt-3 flex items-center justify-center gap-3" data-testid="text-price-line">
                <span className="font-serif text-[32px] font-semibold leading-none text-gray-900" data-testid="text-price">
                  {priceLabel(LUCKY_NUMBERS_PRICE_CENTS)}
                </span>
                <span className="h-11 w-px bg-gray-300" aria-hidden="true" />
                <span className="text-left text-[12.5px] leading-[1.25] text-gray-600">
                  {PRICE_NOTES.map((note) => (
                    <span key={note} className="block">
                      {note}
                    </span>
                  ))}
                </span>
              </div>

              {/* The order bump (12-C3) stays INLINE, directly above the total and the button.
                  ⚠ Never pre-checked — a pre-selected paid add-on is a negative option under
                  FTC and card-network rules. */}
              <label
                className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 px-3 py-2.5"
                data-testid="checkbox-bump"
              >
                <input
                  type="checkbox"
                  checked={bumpTaken}
                  onChange={(e) => setBumpTaken(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-amber-600"
                />
                <span className="min-w-0 text-[12.5px] leading-snug text-gray-700">
                  <strong className="block text-[14.5px] leading-snug text-amber-900">
                    {BUMP.label}
                    {' · '}
                    <span className="whitespace-nowrap">{BUMP.priceLabel}</span>
                  </strong>
                  <span className="mt-0.5 block">
                    {BUMP.noteBefore} <strong>{BUMP.noteName}</strong> {BUMP.noteAfter}
                  </span>
                </span>
              </label>

              <div className="mt-2 flex items-baseline justify-between px-1">
                <span className="text-[14px] text-gray-600">{CHECKOUT.totalLabel}</span>
                <span className="font-serif text-[20px] leading-tight text-gray-900" data-testid="text-total">
                  {totalLabel(luckyNumbersTotalCents(bumpTaken))}
                </span>
              </div>

              {/* Not natively disabled before she's done, so a tap can jump to the first thing
                  missing; aria-disabled tells assistive tech it won't check out yet. */}
              <button
                ref={checkoutButton}
                type="button"
                onClick={handleCheckout}
                disabled={busy}
                aria-disabled={!canCheckout}
                className={`mt-3 w-full scroll-mb-4 rounded-lg px-4 py-3.5 font-serif text-[17px] font-bold transition-all duration-300 md:px-6 md:py-5 md:text-xl ${
                  canCheckout
                    ? 'animate-pulse bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg hover:animate-none hover:shadow-xl disabled:animate-none disabled:opacity-70'
                    : 'cursor-not-allowed bg-gray-200 text-gray-500'
                }`}
                data-testid="button-checkout"
              >
                {CHECKOUT.button} &nbsp;→
              </button>
              {!canCheckout && (
                <p className="mt-1.5 text-center text-[13px] italic text-gray-500" data-testid="text-locked-hint">
                  {CHECKOUT.lockedHint}
                </p>
              )}
              {checkoutError && (
                <p className="mt-3 text-center text-[13px] text-red-600" data-testid="text-checkout-error" role="alert">
                  {checkoutError}
                </p>
              )}
              <p
                className="mt-2 text-center text-[12px] leading-relaxed text-gray-500"
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
            <div className="mx-auto mt-8 max-w-md border-t border-gray-200 pt-6">
              <section data-testid="section-what-you-get">
                <h2 className="font-serif text-[19px] text-gray-900">{WHAT_YOU_GET.heading}</h2>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-snug text-gray-700 marker:text-purple-400">
                  {WHAT_YOU_GET.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="mt-3 text-[15px] leading-snug text-gray-700" data-testid="text-no-contact">
                  {WHAT_YOU_GET.closing}
                </p>
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
