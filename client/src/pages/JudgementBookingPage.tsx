import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearch } from 'wouter'
import { CosmicBackground } from '@/components/CosmicBackground'
import { useFloorSpoken } from '@/hooks/useFloorSpoken'
import { bookingFirstName } from '@/lib/funnel'
import { beginBackendCheckout } from '@/lib/backendCheckout'
import {
  PAGE_HEADER,
  PAGE_STEP_ONE,
  PAGE_STEP_TWO,
  PAGE_STATEMENTS,
  PRICE_STATEMENT,
  PAGE_REQUEST,
  PAGE_GIFT,
  FLOOR_VIOLATION,
  TAB_TITLE,
  BUMP,
  CHECKOUT,
  JUDGEMENT_MIN_CENTS,
  JUDGEMENT_BUMP_CENTS,
} from '@/lib/judgementBooking'

// Offer 03 — Judgement Day booking page. TWO STEPS.
//
// Copy spec: 03-C1 in improve-v1/v1-one-time-BEs/copy/03/03-C1-booking-page.md
// Bump spec: 03-C3. Workflow: docs/0-WORKFLOW.md steps A2 + A3.
// The split: docs/00l-DELIVERABLES-03.md, and the approved wireframe it cites.
//
// ⛔ Nothing here charges. 03 has no Stripe. The button logs and stops.
//
// Built as the PAGE treatment, following 02's (TwinFlameBookingPage.tsx): a
// light sheet over the starfield, because a commitment statement this long
// cannot be read off a dark ground. No chat panel, no avatar, no presence.
//
// ⚠ WHY IT IS TWO SCREENS *(operator, 2026-08-09)*. One column was 3,450px on a
// phone — 4.1 screens to reach the button. Split, each screen asks for one kind
// of thing: step 1 takes four taps and no keyboard, step 2 takes the money.
// Screen 3, her Entry, comes after the money and is not built yet.
//
// ⚠ The step lives in the URL. That is the whole reason it is a query parameter
// and not a piece of private state: the browser's own Back walks her between the
// steps instead of throwing her out of the funnel, and her ticks survive it
// because this component never unmounts. ⛔ A COLD arrival at step 2 — refresh,
// deep link, a shared URL — is sent back to step 1. Consent that was not given
// in this page's lifetime is not assumed.

const BOOKING_PATH = '/wiccan/judgement-day'

function centsToDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// "40", "40.00", "$40" and " 40 " are all a woman typing forty dollars.
// Anything else is not a number and stays invalid rather than being guessed at.
function parseAmountCents(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, '').replace(/,/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  const cents = Math.round(Number(cleaned) * 100)
  return Number.isFinite(cents) ? cents : null
}

// Two dots, so she can see she is one screen from done. The wireframe's one
// concession to progress chrome — a numbered stepper would make this a form.
function StepMarker({ step }: { step: 'agree' | 'give' }) {
  const onGive = step === 'give'
  const copy = onGive ? PAGE_STEP_TWO : PAGE_STEP_ONE
  return (
    <div className="mb-6">
      <div className="flex gap-1.5" aria-hidden="true">
        <i className="h-[3px] flex-1 rounded-full bg-purple-600" />
        <i className={`h-[3px] flex-1 rounded-full ${onGive ? 'bg-purple-600' : 'bg-gray-200'}`} />
      </div>
      <div
        className="mt-2 flex items-baseline justify-between text-[11px] uppercase tracking-[0.16em] text-gray-400"
        data-testid="text-step-tag"
      >
        <span>{copy.tag}</span>
        <span className="font-medium text-gray-600">{copy.name}</span>
      </div>
    </div>
  )
}

export default function JudgementBookingPage() {
  const search = useSearch()
  const [, navigate] = useLocation()
  const step: 'agree' | 'give' =
    new URLSearchParams(search).get('step') === 'give' ? 'give' : 'agree'

  // Step 1's four. Required, not decorative — and, like 02's, the button does
  // not exist until every box is ticked. Four, not five: statement 4 is cut
  // with the capacity cap (D3), and the price rung now lives on step 2.
  const [checked, setChecked] = useState<boolean[]>(() => PAGE_STATEMENTS.map(() => false))
  // Step 2's one, kept separately so a step's own gate is its own state.
  const [priceChecked, setPriceChecked] = useState(false)
  const [amount, setAmount] = useState('')
  const [bumpTaken, setBumpTaken] = useState(false)

  // Read once per mount: the letter's ?fn=, kept for the tab. Nothing on this
  // page displays it — the page is HER voice and never addresses her — but it
  // is what checkout will carry into Stripe metadata so every screen after the
  // money greets her properly. ⚠ It survives the step navigation because
  // bookingFirstName() puts it in sessionStorage; the ?step=give URL drops ?fn=.
  const firstName = useMemo(() => bookingFirstName(), [])

  const agreed = checked.every(Boolean)
  const amountCents = parseAmountCents(amount)
  const amountValid = amountCents !== null && amountCents >= JUDGEMENT_MIN_CENTS
  const totalCents = (amountCents ?? 0) + (bumpTaken ? JUDGEMENT_BUMP_CENTS : 0)
  const ready = priceChecked && amountValid
  // ⛔ Never mid-typing — "17" is under the floor until the 7 arrives.
  const { floorSpoken, speakNow } = useFloorSpoken(amount, amountValid)

  const [busy, setBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // ⛔ Posts her amount, never a price. The server re-checks the floor — hiding it
  // client-side is not enforcing it. While BACKEND_CHECKOUT_LIVE is false this still
  // just logs, as A2 requires.
  const handleCheckout = async () => {
    if (busy) return
    setBusy(true)
    setCheckoutError(null)
    const result = await beginBackendCheckout({
      offer: 'judgement-day',
      treatment: 'page',
      bump: bumpTaken,
      amountCents,
      firstName,
    })
    if (result.status === 'error') setCheckoutError(result.message)
    // 'redirecting' leaves it disabled — the tab is on its way to Stripe.
    if (result.status !== 'redirecting') setBusy(false)
  }

  // ⛔ Step 2 without the agreements is not a state this page has. Refreshing
  // there, or opening a shared ?step=give link, lands her back at step 1 with
  // the boxes clear. `replace` so the bounce does not become a Back trap.
  useEffect(() => {
    if (step === 'give' && !agreed) navigate(BOOKING_PATH, { replace: true })
  }, [step, agreed, navigate])

  useEffect(() => {
    document.title = TAB_TITLE
  }, [])

  // Each step starts at its own top. Step 1 is short enough that returning to
  // it whole is better than restoring a scroll position mid-statement.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])

  const toggle = (index: number) =>
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)))

  return (
    <div className="relative min-h-screen">
      <CosmicBackground />

      <div className="relative z-10 px-4 py-10 md:py-14">
        <div className="mx-auto max-w-2xl">
          {/* Masthead sits ON the starfield — the only part of the page that
              does, so the sheet below reads as something laid on her table.
              ⚠ The deck line belongs to step 1: it introduces the statements,
              and by step 2 she has already agreed to them. */}
          <header className="text-center">
            <div className="text-[11px] font-medium uppercase tracking-[0.35em] text-secondary">
              Evelyn Cross
            </div>
            <h1 className="mt-3 font-serif text-[26px] leading-tight text-white md:text-[34px]">
              {PAGE_HEADER.title}
            </h1>
            {step === 'agree' && (
              <p className="mx-auto mt-3 max-w-md text-[14px] italic leading-relaxed text-purple-200/80">
                {PAGE_HEADER.deck}
              </p>
            )}
          </header>

          <div className="mt-8 rounded-2xl bg-white/97 p-6 shadow-2xl ring-1 ring-white/20 md:p-10">
            <StepMarker step={step} />

            {step === 'agree' ? (
              /* ── 1 · AGREE ──────────────────────────────────────────────
                 The agreement ladder, undiluted: four statements, no money, no
                 keyboard. The cheapest screen in the funnel, and the whole
                 point of the device — the first thing she meets costs her
                 nothing but assent. */
              <>
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

                {/* Absent until every box is ticked, not disabled — that
                    absence is the mechanism, per V1's gate. */}
                <div className="mt-8">
                  {agreed ? (
                    <button
                      type="button"
                      onClick={() => navigate(`${BOOKING_PATH}?step=give`)}
                      className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 font-serif text-xl font-bold text-white shadow-lg transition-all duration-300 hover:shadow-xl"
                      data-testid="button-step-one"
                    >
                      {PAGE_STEP_ONE.button} &nbsp;→
                    </button>
                  ) : (
                    <p
                      className="py-4 text-center text-[13px] italic text-gray-400"
                      data-testid="text-locked-hint"
                    >
                      {PAGE_STEP_ONE.lockedHint}
                    </p>
                  )}
                  <p className="mt-4 text-center text-[13px] leading-relaxed text-gray-500">
                    {PAGE_STEP_ONE.note}
                  </p>
                </div>
              </>
            ) : (
              /* ── 2 · GIVE ───────────────────────────────────────────────
                 Money, and only money. Her request opens it — the sentence the
                 button finishes (P3) — then the price rung, the amount, the
                 gift, and the bump beside the total. */
              <>
                {/* Statement 7 — the request, ending on the promise in her
                    own words. */}
                <div className="space-y-4 text-[15px] leading-relaxed text-gray-700 md:text-[16px]">
                  {PAGE_REQUEST.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>

                {/* Statement 6 — the price rung, and the only one that asks
                    her for something. The amount field follows it directly, so
                    the number she types comes after a paragraph that has
                    already answered "will less get me less?". */}
                <label
                  className="mt-8 flex cursor-pointer items-start gap-4 border-t border-gray-200 pt-8"
                  data-testid="checkbox-statement-price"
                >
                  <input
                    type="checkbox"
                    checked={priceChecked}
                    onChange={() => setPriceChecked((v) => !v)}
                    className="mt-1 h-5 w-5 shrink-0 accent-purple-600"
                  />
                  <span className="text-[15px] leading-relaxed text-gray-700 md:text-[16px]">
                    <strong className="block text-gray-900">{PRICE_STATEMENT.lead}</strong>
                    <span className="mt-1 block">{PRICE_STATEMENT.body}</span>
                    <span className="mt-3 block italic text-gray-500">{PRICE_STATEMENT.anchor}</span>
                  </span>
                </label>

                {/* The amount box ships EMPTY (D4). A prefilled number is a
                    price, and the statement above it has just said she is not
                    being given one.
                    ⛔ And no minimum is printed under it. A stated floor does
                    not read as a limit, it reads as the price — put $17 under
                    an empty box and the box fills with $17. It speaks only once
                    she is under it, which is the rule the chat already keeps. */}
                <div className="mt-6 rounded-xl border border-purple-200 bg-purple-50/60 p-5">
                  <label
                    htmlFor="judgement-amount"
                    className="block font-serif text-[16px] text-gray-900"
                  >
                    {PRICE_STATEMENT.amountLabel}
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-serif text-[24px] text-gray-500">$</span>
                    <input
                      id="judgement-amount"
                      name="amount"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      onBlur={speakNow}
                      className="w-36 rounded-lg border border-gray-300 bg-white px-3 py-2 font-serif text-[24px] text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      data-testid="input-amount"
                    />
                  </div>
                  {floorSpoken && (
                    <p className="mt-2 text-[13px] text-red-600" data-testid="text-floor-hint">
                      {FLOOR_VIOLATION}
                    </p>
                  )}
                </div>

                {/* Statement 8 — the gift, received and thanked for BEFORE it
                    arrives (P9). */}
                <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-gray-700 md:text-[16px]">
                  {PAGE_GIFT.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>

                {/* The bump stays INLINE beside the total. That is the whole
                    reason a bump converts, and it is why the split does not
                    give it a screen of its own the way the chat gives it a turn.
                    ⚠ Never pre-check it — a pre-selected paid add-on is a
                    negative option under FTC and card-network rules. */}
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
                    {/* ⚠ NOT set in italic, unlike 02's. 02's bump headline is
                        six words; 03's is a full sentence in her voice, and a
                        sentence that long in serif italic on an amber ground is
                        the hardest setting on the page to read. */}
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

                {/* P3 — the button completes the request paragraph's own
                    sentence. Like 02's, it does not exist until the agreement
                    is made and she has said what she will give. */}
                <div className="mt-6">
                  {ready ? (
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
                      {priceChecked ? PAGE_STEP_TWO.amountHint : PAGE_STEP_TWO.lockedHint}
                    </p>
                  )}
                  {/* A dead button is the worst outcome on the screen that takes the
                      money. ⛔ The server's floor message never names the floor either —
                      the rule holds on both sides. */}
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
                    {PAGE_STEP_TWO.reassurance}
                  </p>
                </div>
              </>
            )}
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
