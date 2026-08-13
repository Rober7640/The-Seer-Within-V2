import { useState, useEffect, useMemo, useRef } from 'react'
import { CosmicBackground } from '@/components/CosmicBackground'
import { bookingFirstName } from '@/lib/funnel'
import { beginBackendCheckout } from '@/lib/backendCheckout'
import {
  CHAT_SCRIPT,
  CHAT_GATE,
  CHAT_BUMP,
  CHAT_RESUME,
  CHECKOUT,
  TWIN_FLAME_PRICE_CENTS,
  TWIN_FLAME_BUMP_CENTS,
} from '@/lib/twinFlameBooking'

// Offer 02 — Twin Flame Tarot booking, CHAT treatment. PREVIEW ONLY.
//
// Candidate 2 of 2 for what the email sales letter's CTA lands on. The page
// treatment is TwinFlameBookingPage.tsx. Spec: 02-C1b in
// improve-v1/v1-one-time-BEs/copy/02/02-C1-booking-page.md
//
// ⛔ Nothing here charges. The button logs and stops. Wiring Stripe is phase 2,
// and only for whichever treatment wins.
//
// SHAPE *(operator, 2026-08-06)*: Evelyn talks, and the close is ONE inline
// gate card carrying all three statements. The buyer has no conversational
// turn and nothing posts to her side of the stream — an earlier build had each
// statement tapped as her own message and it is superseded. This mirrors
// CommitmentGateCard.tsx, the `35_palm_gate` gate live on fb-palm.
//
// What survives from the copy spec regardless:
//   · Evelyn never speaks INSIDE the card. Everything in it is the buyer's,
//     first person, and Evelyn is named in the third person there.
//   · Nothing is asked and nothing re-argues the offer. The letter sold.
//   · The price is inside statement 3 and appears nowhere earlier.
//   · The bump sits adjacent to the total, at the moment of payment.
//   · No text input anywhere in this flow.

const EVELYN_LINE_DELAY_MS = 550

// Survives a refresh, a navigate-away, and the Stripe round-trip. sessionStorage
// not localStorage: this should not outlive the tab. A week-old "you came back"
// to someone who has since bought is worse than a clean greeting.
// ⚠ Only the POSITION is stored. Never the ticked boxes — see CHAT_RESUME.
const RESUME_KEY = 'tft_booking_position'

const GATE_INDEX = CHAT_SCRIPT.findIndex((b) => b.kind === 'gate')

interface ChatMessage {
  id: string
  text?: string
  image?: { src: string; alt: string }
}

type EntryMode = 'fresh' | 'refreshed' | 'cancelled'

// Which of the three ways she got here. `?cancelled` is Stripe's cancel_url and
// the browser back button; a stored position with no flag is a refresh.
// ⚠ A buyer who already paid must never reach this screen — the real build
// resolves that server-side and redirects to the thank-you page. There is no
// server in the preview, so it cannot be represented here.
function resolveEntry(search: string): EntryMode {
  const cancelled = new URLSearchParams(search).has('cancelled')
  let stored = false
  try {
    stored = sessionStorage.getItem(RESUME_KEY) !== null
  } catch {
    // Private mode / storage disabled → treat as a fresh arrival. Replaying the
    // greeting is a far better failure than a blank screen.
  }
  if (cancelled) return 'cancelled'
  return stored ? 'refreshed' : 'fresh'
}

function centsToDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default function TwinFlameBookingChat() {
  // Resolved once, on the first render, so a re-render can't change how she
  // arrived halfway through the flow.
  const entry = useRef<EntryMode>(resolveEntry(window.location.search)).current
  const isResume = entry !== 'fresh'

  // A resumed session opens AT THE GATE with the welcome-back lines already on
  // screen — the greeting is not replayed, and the bump is not restored even if
  // that is where she was when she left.
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    isResume
      ? CHAT_RESUME[entry === 'cancelled' ? 'cancelled' : 'refreshed'].map((text, i) => ({
          id: `r${i}`,
          text,
        }))
      : [],
  )
  const [beatIndex, setBeatIndex] = useState(isResume ? GATE_INDEX : 0)
  const [showGate, setShowGate] = useState(isResume)
  const [gateConfirmed, setGateConfirmed] = useState(false)
  const [showBump, setShowBump] = useState(false)
  const [checked, setChecked] = useState<boolean[]>(() => CHAT_GATE.statements.map(() => false))
  const [busy, setBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const seq = useRef(0)

  // The letter's ?fn=, read once. Carried into Stripe metadata so every screen after
  // the money can greet her by name.
  const firstName = useMemo(() => bookingFirstName(), [])

  const allChecked = checked.every(Boolean)

  // Play Evelyn's run forward and stop at whatever needs the buyer. Deliberately
  // brisk — in V1 the chat IS the product, so latency reads as presence; here it
  // is a checkout, and latency reads as a slow one.
  useEffect(() => {
    const beat = CHAT_SCRIPT[beatIndex]
    if (!beat) return

    if (beat.kind === 'gate') {
      if (!gateConfirmed) {
        setShowGate(true)
        return
      }
      setBeatIndex((i) => i + 1)
      return
    }
    if (beat.kind === 'bump') {
      setShowBump(true)
      return
    }

    const timer = setTimeout(
      () => {
        setMessages((prev) =>
          beat.kind === 'image'
            ? [...prev, { id: `m${seq.current++}`, image: { src: beat.src, alt: beat.alt } }]
            : [...prev, ...beat.lines.map((text) => ({ id: `m${seq.current++}`, text }))],
        )
        setBeatIndex((i) => i + 1)
      },
      beatIndex === 0 ? 0 : EVELYN_LINE_DELAY_MS,
    )

    return () => clearTimeout(timer)
  }, [beatIndex, gateConfirmed])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, showGate, showBump])

  const toggle = (index: number) =>
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)))

  // Mark her position the moment the gate is shown, so a refresh from anywhere
  // downstream resumes rather than restarts.
  useEffect(() => {
    if (!showGate) return
    try {
      sessionStorage.setItem(RESUME_KEY, 'gate')
    } catch {
      // Storage unavailable → she gets the greeting again on refresh. Acceptable.
    }
  }, [showGate])

  // She has committed. The gate stays on screen as her record of what she
  // agreed to; Evelyn picks the conversation back up and the bump follows.
  const handleGateConfirm = () => {
    if (gateConfirmed) return
    setGateConfirmed(true)
    setBeatIndex((i) => i + 1)
  }

  // The bump answer IS the checkout on this treatment — it is the last turn before
  // the money. ⛔ Posts no price; the server charges the catalog's. While
  // BACKEND_CHECKOUT_LIVE is false this still just logs, as A2 requires.
  const handleBumpChoice = async (taken: boolean) => {
    if (busy) return
    setBusy(true)
    setCheckoutError(null)
    const result = await beginBackendCheckout({
      offer: 'twin-flame',
      treatment: 'chat',
      bump: taken,
      firstName,
    })
    if (result.status === 'error') setCheckoutError(result.message)
    // 'redirecting' leaves it disabled — the tab is on its way to Stripe, and a
    // re-enabled button is a second charge waiting to happen.
    if (result.status !== 'redirecting') setBusy(false)
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden p-0 md:p-4">
      <CosmicBackground />

      <div className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-hidden border border-white/20 bg-white/95 shadow-2xl backdrop-blur-md md:h-[90vh] md:rounded-2xl">
        <header className="flex shrink-0 items-center gap-3 bg-bg-mid p-4 text-white shadow-md">
          <div className="relative">
            <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-secondary">
              <img src="/evelyn-avatar.png" alt="Evelyn" className="h-full w-full object-cover" />
            </div>
            <div className="absolute bottom-0 right-0 h-3 w-3 animate-pulse rounded-full border-2 border-bg-mid bg-green-500"></div>
          </div>
          <div>
            <h1 className="font-serif text-lg font-bold leading-none">Evelyn Cross</h1>
            <span className="text-xs font-medium text-green-400">Online Now</span>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50/50 p-4 scroll-smooth">
          <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <div key={msg.id} className="flex w-full justify-start" data-testid="message-evelyn">
              {msg.image ? (
                <div className="max-w-[75%] overflow-hidden rounded-2xl border border-purple-200/20 shadow-lg">
                  <img src={msg.image.src} alt={msg.image.alt} className="h-auto w-full" />
                </div>
              ) : (
                <div className="max-w-[85%] rounded-2xl rounded-bl-none border border-gray-100 bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-sm md:text-base">
                  {msg.text}
                </div>
              )}
            </div>
          ))}

          {/* THE GATE — one card, inline in the stream.
              ⚠ AESTHETIC *(operator, 2026-08-06)*: this deliberately does NOT
              use Treatment B's white/red/green + Arial. Those values are locked
              for the standalone booking PAGE (00b §3), where a plain
              direct-response look is the whole point. Inside Evelyn's chat that
              reads as a foreign object dropped into the conversation, so the
              card follows CommitmentGateCard.tsx instead — amber on cream,
              serif italic heading — the family V1 already established for a gate
              in exactly this slot. The two treatments diverging visually is
              correct, not drift. */}
          {showGate && (
            <div className="mt-3 animate-cta-appear" data-testid="commitment-gate">
              <div className="overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 via-white to-white shadow-md">
                <div className="px-5 pb-3 pt-4 text-center">
                  <div className="text-xs tracking-[0.3em] text-amber-500/90">✦</div>
                  <h3 className="mt-1 font-serif text-base italic text-gray-800">
                    {CHAT_GATE.heading}
                  </h3>
                  <p className="mt-2 text-[12px] italic text-gray-500">{CHAT_GATE.deck}</p>
                </div>

                <div className="space-y-2.5 px-5 pb-4">
                  {CHAT_GATE.statements.map((statement, index) => (
                    <label
                      key={statement}
                      className="flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-gray-700"
                      data-testid={`checkbox-statement-${index}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked[index]}
                        onChange={() => toggle(index)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600"
                      />
                      <span>{statement}</span>
                    </label>
                  ))}
                </div>

                <div className="mx-5 mt-1 flex items-baseline justify-between border-t border-amber-100 pt-4">
                  <span className="text-[13px] text-gray-600">{CHECKOUT.totalLabel}</span>
                  <span className="font-serif text-[24px] text-gray-800" data-testid="text-total">
                    {centsToDollars(TWIN_FLAME_PRICE_CENTS)}
                  </span>
                </div>

                {/* V1's gate REPLACES the button with the locked hint rather than
                    disabling it — the button is absent from the DOM until all
                    three are ticked, and the seed comment says that absence is
                    the point of the test. Matched here. */}
                <div className="px-4 pb-4 pt-4">
                  {allChecked ? (
                    <button
                      type="button"
                      disabled={gateConfirmed}
                      onClick={handleGateConfirm}
                      className="w-full animate-pulse rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 text-lg font-bold text-white shadow-lg transition-all duration-300 hover:animate-none hover:shadow-xl disabled:animate-none disabled:opacity-50"
                      data-testid="button-checkout"
                    >
                      {CHECKOUT.button} &nbsp;→
                    </button>
                  ) : (
                    <p className="py-2 text-center text-[11px] italic text-gray-400">
                      {CHAT_GATE.lockedHint}
                    </p>
                  )}
                  <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-500">
                    {CHECKOUT.reassurance}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex justify-center gap-4 pb-2 text-xs text-gray-400">
                <span>🔒 30-Day Guarantee</span>
                <span>100% Secure</span>
              </div>
            </div>
          )}

          {/* THE BUMP — its own turn, after she has committed. Two actions, each
              stating its total, and each going straight to checkout. ⛔ Do not
              add a third confirm step: this already sits between the CTA and
              Stripe, which is the most expensive place in the funnel to stall
              someone. */}
          {showBump && (
            <div className="mt-3 animate-cta-appear" data-testid="order-bump">
              {/* Class-for-class with client/src/components/BumpOfferCard.tsx —
                  the shipped V1 bump, which arrived in the development merge.
                  ⚠ ONE deliberate deviation: the offer line is roman, not italic
                  *(operator, 2026-08-06)*. Every other value is the real card's,
                  so this preview cannot drift from what actually ships.
                  ⛔ Do NOT re-scale these. An earlier pass set the body to 19px
                  by eye off a screenshot and it was unreadable in a max-w-lg
                  panel. The real card is text-base. */}
              <div className="overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 via-white to-white shadow-md">
                <div className="px-5 pb-2 pt-4 text-center">
                  <div className="text-xs tracking-[0.3em] text-amber-500/90">✦</div>
                  <p className="mt-2 font-serif text-base leading-relaxed text-gray-800">
                    {CHAT_BUMP.body}
                  </p>
                </div>

                <div className="px-5 pb-4">
                  <div className="flex items-baseline justify-center gap-2 text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">{CHAT_BUMP.priceLine}</span>
                    <span className="text-gray-400">·</span>
                    {/* Shown so the total is never a surprise on the Stripe page. */}
                    <span className="text-gray-500">{CHAT_BUMP.totalLine}</span>
                  </div>
                </div>

                {/* The decline is full-width and equally legible on purpose.
                    Burying it would make this a dark pattern, and the arm would
                    "win" on a charge she did not intend. */}
                <div className="space-y-2 px-4 pb-4">
                  <button
                    type="button"
                    onClick={() => handleBumpChoice(true)}
                    disabled={busy}
                    className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 text-lg font-bold text-white shadow-lg transition-all duration-300 hover:shadow-xl disabled:opacity-70"
                    data-testid="button-bump-accept"
                  >
                    {CHAT_BUMP.accept}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBumpChoice(false)}
                    disabled={busy}
                    className="w-full rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-600 transition-colors duration-200 hover:bg-gray-50 disabled:opacity-70"
                    data-testid="button-bump-decline"
                  >
                    {CHAT_BUMP.decline}
                  </button>
                  {/* A dead button is the worst outcome on the turn that takes the
                      money — if checkout refuses, say so. */}
                  {checkoutError && (
                    <p
                      className="pt-1 text-center text-[12px] text-red-600"
                      data-testid="text-checkout-error"
                      role="alert"
                    >
                      {checkoutError}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex justify-center gap-4 pb-2 text-xs text-gray-400">
                <span>🔒 30-Day Guarantee</span>
                <span>100% Secure</span>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
