import { useState, useEffect, useRef, useMemo } from 'react'
import { CosmicBackground } from '@/components/CosmicBackground'
import { useFloorSpoken } from '@/hooks/useFloorSpoken'
import { typingPace, BETWEEN_LINES_MS, BEFORE_CARD_MS } from '@/lib/chatPace'
import { bookingFirstName } from '@/lib/funnel'
import {
  CHAT_SCRIPT,
  CHAT_GATE,
  CHAT_THREAD_TITLE,
  TAB_TITLE,
  CHAT_BUMP,
  CHAT_RESUME,
  CHECKOUT,
  JUDGEMENT_MIN_CENTS,
  JUDGEMENT_BUMP_CENTS,
  JUDGEMENT_BUMP_PRODUCT_KEY,
} from '@/lib/judgementBooking'

// Offer 03 — Judgement Day booking, CHAT treatment. PREVIEW ONLY.
//
// Candidate 2 of 2 for what the email letter's CTA lands on. The page treatment
// is JudgementBookingPage.tsx. Copy + the reasoning behind every departure:
// lib/judgementBooking.ts and docs/00l-DELIVERABLES-03.md.
//
// ⛔ Nothing here charges. The buttons log and stop.
//
// Built class-for-class off TwinFlameBookingChat.tsx so the two offers' chats
// cannot drift, with 03's two necessary differences:
//   · an AMOUNT FIELD in the gate — 02 has no text input anywhere, but
//     pay-what-you-want has exactly one thing only the buyer can supply;
//   · FOUR statements, the fourth being the intake agreement. Without her reply
//     there is no product to make, so she agrees to it before paying.

// ⚠ ONE SENTENCE PER TURN, AT A HUMAN PACE *(operator, 2026-08-09)*. Evelyn's
// lines used to arrive as a block — a transcript being pasted in, not somebody
// talking. Each line is now its own turn: a beat, then the typing indicator for
// as long as that line would take to type, then the line.
//
// The three dots are the same markup the live V1 chat uses, and the pace comes
// from `lib/chatPace.ts` — proportional to the line's length, with variance, so
// no two runs are identical and a short line never takes as long as a long one.

// Survives a refresh, a navigate-away, and the Stripe round-trip. sessionStorage
// not localStorage: this should not outlive the tab.
// ⚠ Only the POSITION is stored. Never the ticked boxes, never the amount.
const RESUME_KEY = 'jd_booking_position'

// The script, flattened so that ONE STEP IS ONE TURN. A beat of two sentences
// is two steps, and each waits for the one before it.
type ChatStep = { kind: 'line'; text: string } | { kind: 'gate' } | { kind: 'bump' }

const STEPS: ChatStep[] = CHAT_SCRIPT.flatMap((beat) =>
  beat.kind === 'evelyn'
    ? beat.lines.map((text): ChatStep => ({ kind: 'line', text }))
    : [beat as ChatStep],
)

const GATE_INDEX = STEPS.findIndex((s) => s.kind === 'gate')

interface ChatMessage {
  id: string
  text: string
}

type EntryMode = 'fresh' | 'refreshed' | 'cancelled'

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

// "40", "40.00", "$40" and " 40 " are all a woman typing forty dollars.
// Anything else is not a number and stays invalid rather than being guessed at.
function parseAmountCents(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, '').replace(/,/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  const cents = Math.round(Number(cleaned) * 100)
  return Number.isFinite(cents) ? cents : null
}

export default function JudgementBookingChat() {
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
  const [isTyping, setIsTyping] = useState(false)
  const [checked, setChecked] = useState<boolean[]>(() => CHAT_GATE.statements.map(() => false))
  const [amount, setAmount] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const seq = useRef(0)

  // Nothing on screen displays it — the gate is her voice and never addresses
  // her. It is here for the screens after the money.
  const firstName = useMemo(() => bookingFirstName(), [])

  const allChecked = checked.every(Boolean)
  const amountCents = parseAmountCents(amount)
  const amountValid = amountCents !== null && amountCents >= JUDGEMENT_MIN_CENTS
  // ⛔ The floor is never announced — it speaks only once she is under it, and
  // ⛔ never mid-typing: "17" is under the floor until the 7 arrives.
  const { floorSpoken: showFloor, speakNow } = useFloorSpoken(amount, amountValid)
  const ready = allChecked && amountValid

  // Play Evelyn's run forward, ONE TURN AT A TIME, and stop at whatever needs
  // the buyer. She types, the line lands, she types again.
  useEffect(() => {
    const step = STEPS[beatIndex]
    if (!step) return

    if (step.kind === 'gate') {
      if (gateConfirmed) {
        setBeatIndex((i) => i + 1)
        return
      }
      // Already on screen means this is a resumed session — she is looking at
      // the card, and making her watch it arrive again would be theatre.
      if (showGate) return
      setIsTyping(true)
      const timer = setTimeout(() => {
        setIsTyping(false)
        setShowGate(true)
      }, BEFORE_CARD_MS)
      return () => clearTimeout(timer)
    }

    if (step.kind === 'bump') {
      if (showBump) return
      setIsTyping(true)
      const timer = setTimeout(() => {
        setIsTyping(false)
        setShowBump(true)
      }, BEFORE_CARD_MS)
      return () => clearTimeout(timer)
    }

    // Two timers, because a person does two things: pauses, then types. The gap
    // is skipped on the very first line — she has just arrived and there is
    // nothing yet to pause after — but the typing is not, so the chat opens on
    // Evelyn already writing rather than on a wall of text that was always there.
    const gap = beatIndex === 0 ? 0 : BETWEEN_LINES_MS
    const pace = typingPace(step.text)

    const startTyping = setTimeout(() => setIsTyping(true), gap)
    const land = setTimeout(() => {
      setIsTyping(false)
      setMessages((prev) => [...prev, { id: `m${seq.current++}`, text: step.text }])
      setBeatIndex((i) => i + 1)
    }, gap + pace)

    return () => {
      clearTimeout(startTyping)
      clearTimeout(land)
    }
  }, [beatIndex, gateConfirmed, showGate, showBump])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, showGate, showBump, isTyping])

  useEffect(() => {
    document.title = TAB_TITLE
  }, [])

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

  const handleBumpChoice = (taken: boolean) =>
    console.log('[preview] would checkout', {
      amountCents,
      bump: taken,
      bumpProduct: taken ? JUDGEMENT_BUMP_PRODUCT_KEY : null,
      totalCents: (amountCents ?? 0) + (taken ? JUDGEMENT_BUMP_CENTS : 0),
      firstName,
    })

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

        {/* The thread's subject. Without it the chat is the only screen in the
            funnel that never says which offer she is booking — the page
            treatment carries it as an H1, so the chat carries it here.
            ⛔ Not "confirmation": she has not paid yet, and that word belongs
            to the screen after the money. */}
        <div
          /* ⚠ Sized to hold ONE line down to a 320px phone. Wrapped, a subject
             strip stops reading as a label and starts reading as a message. */
          className="shrink-0 border-b border-gray-200 bg-white px-3 py-2 text-center text-[10px] uppercase tracking-[0.1em] text-gray-500 sm:px-4 sm:text-[11px] sm:tracking-[0.18em]"
          data-testid="text-thread-title"
        >
          {CHAT_THREAD_TITLE}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50/50 p-4 scroll-smooth">
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex w-full justify-start" data-testid="message-evelyn">
                <div className="max-w-[85%] rounded-2xl rounded-bl-none border border-gray-100 bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-sm md:text-base">
                  {msg.text}
                </div>
              </div>
            ))}

            {/* She is typing. ⚠ Markup lifted from V1's live chat (ChatPage.tsx)
                so the two look like the same woman at the same keyboard. */}
            {isTyping && (
              <div className="flex w-full justify-start" data-testid="indicator-typing">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-none border border-gray-100 bg-white px-4 py-3 shadow-sm">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></span>
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></span>
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></span>
                </div>
              </div>
            )}

            {/* THE GATE — one card, inline in the stream. Amber on cream with a
                serif italic heading, the family V1 already established for a
                gate in exactly this slot (CommitmentGateCard.tsx). */}
            {showGate && (
              <div className="mt-3 animate-cta-appear" data-testid="commitment-gate">
                <div className="overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 via-white to-white shadow-md">
                  {/* ⚠ Set larger than the statements below it *(operator,
                      2026-08-09)*. This is the card's title and the sentence
                      that says what ticking the boxes means — at the old size
                      it read as small print on the thing she is agreeing to. */}
                  <div className="px-5 pb-3 pt-5 text-center">
                    <div className="text-xs tracking-[0.3em] text-amber-500/90">✦</div>
                    <h3 className="mt-1.5 font-serif text-xl italic leading-snug text-gray-800">
                      {CHAT_GATE.heading}
                    </h3>
                    <p className="mt-2.5 text-[14px] italic leading-snug text-gray-600">
                      {CHAT_GATE.deck}
                    </p>
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

                  {/* The amount. ⚠ The only text input in either offer's booking
                      flow, and it exists because pay-what-you-want has one thing
                      only she can supply.
                      ⛔ No minimum is printed here. The floor speaks only if she
                      goes under it — a stated minimum is a price, and she has
                      just ticked a statement saying there isn't one. */}
                  <div className="mx-5 border-t border-amber-100 pt-4">
                    <label
                      htmlFor="judgement-chat-amount"
                      className="block text-[13px] text-gray-600"
                    >
                      {CHAT_GATE.amountLabel}
                    </label>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="font-serif text-[20px] text-gray-500">$</span>
                      <input
                        id="judgement-chat-amount"
                        name="amount"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        onBlur={speakNow}
                        className="w-28 rounded-lg border border-amber-200 bg-white px-3 py-1.5 font-serif text-[20px] text-gray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                        data-testid="input-amount"
                      />
                    </div>
                    {showFloor && (
                      <p className="mt-1.5 text-[11px] text-red-600" data-testid="text-floor-hint">
                        {CHAT_GATE.floorViolation}
                      </p>
                    )}
                  </div>

                  <div className="mx-5 mt-4 flex items-baseline justify-between border-t border-amber-100 pt-4">
                    <span className="text-[13px] text-gray-600">{CHECKOUT.totalLabel}</span>
                    <span className="font-serif text-[24px] text-gray-800" data-testid="text-total">
                      {centsToDollars(amountValid ? (amountCents as number) : 0)}
                    </span>
                  </div>

                  {/* The button is ABSENT from the DOM until every agreement is
                      made and she has said what she will give — not disabled.
                      That absence is the mechanism, per V1's gate. */}
                  <div className="px-4 pb-4 pt-4">
                    {ready ? (
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
                      <p
                        className="py-2 text-center text-[11px] italic text-gray-400"
                        data-testid="text-locked-hint"
                      >
                        {allChecked ? CHAT_GATE.amountHint : CHAT_GATE.lockedHint}
                      </p>
                    )}
                    <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-500">
                      {CHECKOUT.reassurance}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex justify-center gap-4 pb-2 text-xs text-gray-400">
                  <span>🔒 Secure checkout</span>
                  <span>One-time · no subscription</span>
                </div>
              </div>
            )}

            {/* THE BUMP — its own turn, after she has committed. Two actions,
                each going straight to checkout. ⛔ Do not add a third confirm
                step: this already sits between the CTA and Stripe. */}
            {showBump && (
              <div className="mt-3 animate-cta-appear" data-testid="order-bump">
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
                      {/* Her own figure plus the bump, so the total is never a
                          surprise on the Stripe page. */}
                      <span className="text-gray-500" data-testid="text-bump-total">
                        {centsToDollars((amountCents ?? 0) + JUDGEMENT_BUMP_CENTS)} total
                      </span>
                    </div>
                  </div>

                  {/* The decline is full-width and equally legible on purpose.
                      Burying it would make this a dark pattern, and the arm
                      would "win" on a charge she did not intend. */}
                  <div className="space-y-2 px-4 pb-4">
                    <button
                      type="button"
                      onClick={() => handleBumpChoice(true)}
                      className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 text-lg font-bold text-white shadow-lg transition-all duration-300 hover:shadow-xl"
                      data-testid="button-bump-accept"
                    >
                      {CHAT_BUMP.accept}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBumpChoice(false)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-600 transition-colors duration-200 hover:bg-gray-50"
                      data-testid="button-bump-decline"
                    >
                      {CHAT_BUMP.decline}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex justify-center gap-4 pb-2 text-xs text-gray-400">
                  <span>🔒 Secure checkout</span>
                  <span>One-time · no subscription</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
