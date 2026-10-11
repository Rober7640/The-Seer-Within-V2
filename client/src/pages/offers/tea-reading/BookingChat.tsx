import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CosmicBackground } from '@/components/CosmicBackground'
import { typingPace, BETWEEN_LINES_MS, BEFORE_CARD_MS } from '@/lib/chatPace'
import { backendOfferFunnel, bookingFirstName, bookingLetterCode } from '@/lib/funnel'
import { beginBackendCheckout } from '@/lib/backendCheckout'
import { fetchLadderQuote, type LadderQuote } from '@/lib/ladderPrice'
import { track as trackPH } from '@/lib/posthog'
import {
  CHAT_SCRIPT,
  CHAT_GATE,
  CHAT_CUP,
  CHAT_CUP_REPLIES,
  CHAT_BUMP,
  CHAT_RESUME,
  CHAT_THREAD_TITLE,
  CHAT_TAB_TITLE,
  PRICE_STATES,
  TEA_READING_OFFER,
  chatPriceChangedNotice,
  chatStatementParts,
  priceLabel,
  teaReadingCheckoutRequest,
  teaReadingTotalCents,
} from '@/lib/teaReadingBooking'
import type { TeaCup } from '@shared/backendOffers'

// Offer 04 — The Turn, booking CHAT treatment (/offers/wiccan/tea-reading/chat).
// The page treatment is ./BookingPage.tsx at the offer root.
//
// Copy spec: improve-v1/v1-one-time-BEs/copy/04/04-C2-booking-chat.md (constants in
// lib/teaReadingBooking.ts). Built class-for-class off 03's JudgementBookingChat — the agreed
// shape (workflow A2, "copy 03's chat, not 02's") — with 04's differences:
//   · THREE statements, the third carrying today's rung (a price LADDER: fetched from the
//     server, never guessed — a blank bar until it loads);
//   · the cup pick as a QUICK-REPLY turn after she commits — optional, "you choose" included;
//   · the bump as its own turn after that, as Evelyn's question.
//
// ⚠ ONE SENTENCE PER TURN, AT A HUMAN PACE. Each line waits for the typing indicator for as long
// as it would take to type (lib/chatPace.ts — proportional to length, with variance). The card
// gets its own beat. The chat opens on her already writing.
//
// ⛔ Posts NO price — the day the card printed (`quotedDay`), the bump answer and her cup. While
// BACKEND_CHECKOUT_LIVE is false the bump answer LOGS and stops (preview). A 409 price_changed
// puts the new price on the card and asks her to press her answer again.

// Survives a refresh, a navigate-away and the Stripe round-trip. sessionStorage, not
// localStorage: it should not outlive the tab. ⚠ Only the POSITION is stored — never the ticks,
// never the cup, never the bump.
const RESUME_KEY = 'tr_booking_position'

type ChatStep = { kind: 'line'; text: string } | { kind: 'gate' } | { kind: 'cup' } | { kind: 'bump' }

// The script, flattened so that ONE STEP IS ONE TURN.
const STEPS: ChatStep[] = CHAT_SCRIPT.flatMap((beat) =>
  beat.kind === 'evelyn' ? beat.lines.map((text): ChatStep => ({ kind: 'line', text })) : [beat as ChatStep],
)

const GATE_INDEX = STEPS.findIndex((s) => s.kind === 'gate')

interface ChatMessage {
  id: string
  text: string
  from: 'evelyn' | 'her'
}

type EntryMode = 'fresh' | 'refreshed' | 'cancelled'

function resolveEntry(search: string): EntryMode {
  const cancelled = new URLSearchParams(search).has('cancelled')
  let stored = false
  try {
    stored = sessionStorage.getItem(RESUME_KEY) !== null
  } catch {
    // Private mode / storage disabled → a fresh arrival. Replaying the greeting is a far better
    // failure than a blank screen.
  }
  if (cancelled) return 'cancelled'
  return stored ? 'refreshed' : 'fresh'
}

type PriceState = { status: 'loading' } | { status: 'ready'; quote: LadderQuote } | { status: 'failed' }

export default function TeaReadingBookingChat() {
  const entry = useRef<EntryMode>(resolveEntry(window.location.search)).current
  const isResume = entry !== 'fresh'

  // A resumed session opens AT THE CARD with the resume lines already on screen — the greeting
  // is not replayed, and neither the cup nor the bump is restored.
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    isResume
      ? CHAT_RESUME[entry === 'cancelled' ? 'cancelled' : 'refreshed'].map((text, i) => ({
          id: `r${i}`,
          text,
          from: 'evelyn' as const,
        }))
      : [],
  )
  const [beatIndex, setBeatIndex] = useState(isResume ? GATE_INDEX : 0)
  const [showGate, setShowGate] = useState(isResume)
  // Where the card sits in the thread: after the messages that came before it. Everything Evelyn
  // says after she commits flows BENEATH it.
  const [gateAt, setGateAt] = useState<number>(() =>
    isResume ? CHAT_RESUME[entry === 'cancelled' ? 'cancelled' : 'refreshed'].length : 0,
  )
  const [gateConfirmed, setGateConfirmed] = useState(false)
  const [showCupReplies, setShowCupReplies] = useState(false)
  const [cupAnswer, setCupAnswer] = useState<string | null>(null) // Evelyn's line, still to type
  const [cup, setCup] = useState<TeaCup | null>(null)
  const [showBump, setShowBump] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [checked, setChecked] = useState<boolean[]>(() => CHAT_GATE.statements.map(() => false))
  const [price, setPrice] = useState<PriceState>({ status: 'loading' })
  const [movedTo, setMovedTo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const seq = useRef(0)
  const messageCount = useRef(messages.length)
  messageCount.current = messages.length

  // Nothing on screen displays either — they are for the screens after the money.
  const firstName = useMemo(() => bookingFirstName(), [])
  const letterCode = useMemo(() => bookingLetterCode(), [])
  const search = useMemo(() => window.location.search, [])

  const quote = price.status === 'ready' ? price.quote : null
  const allChecked = checked.every(Boolean)
  const ready = allChecked && quote !== null

  const loadPrice = useCallback(async () => {
    setPrice({ status: 'loading' })
    const result = await fetchLadderQuote(TEA_READING_OFFER, search)
    setPrice(result.kind === 'ok' ? { status: 'ready', quote: result.quote } : { status: 'failed' })
  }, [search])

  useEffect(() => {
    void loadPrice()
  }, [loadPrice])

  // Back from Stripe via the browser's Back button: re-arm the answers and re-ask today's price.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      setBusy(false)
      void loadPrice()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [loadPrice])

  const addMessage = (text: string, from: ChatMessage['from']) =>
    setMessages((prev) => [...prev, { id: `m${seq.current++}`, text, from }])

  // Play Evelyn's run forward, ONE TURN AT A TIME, and stop at whatever needs the buyer.
  useEffect(() => {
    const step = STEPS[beatIndex]
    if (!step) return

    if (step.kind === 'gate') {
      if (gateConfirmed) {
        setBeatIndex((i) => i + 1)
        return
      }
      // Already on screen means a resumed session — she is looking at the card.
      if (showGate) return
      setIsTyping(true)
      const timer = setTimeout(() => {
        setIsTyping(false)
        setGateAt(messageCount.current)
        setShowGate(true)
      }, BEFORE_CARD_MS)
      return () => clearTimeout(timer)
    }

    if (step.kind === 'cup') {
      // She answers; then Evelyn types her one-line answer, then the run moves on.
      if (cupAnswer !== null) {
        const startTyping = setTimeout(() => setIsTyping(true), BETWEEN_LINES_MS)
        const land = setTimeout(() => {
          setIsTyping(false)
          addMessage(cupAnswer, 'evelyn')
          setCupAnswer(null)
          setBeatIndex((i) => i + 1)
        }, BETWEEN_LINES_MS + typingPace(cupAnswer))
        return () => {
          clearTimeout(startTyping)
          clearTimeout(land)
        }
      }
      if (!showCupReplies) {
        const timer = setTimeout(() => setShowCupReplies(true), BETWEEN_LINES_MS)
        return () => clearTimeout(timer)
      }
      return
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

    // Two timers, because a person does two things: pauses, then types. The gap is skipped on the
    // very first line, but the typing is not — the chat opens on Evelyn already writing.
    const gap = beatIndex === 0 ? 0 : BETWEEN_LINES_MS
    const pace = typingPace(step.text)
    const startTyping = setTimeout(() => setIsTyping(true), gap)
    const land = setTimeout(() => {
      setIsTyping(false)
      addMessage(step.text, 'evelyn')
      setBeatIndex((i) => i + 1)
    }, gap + pace)
    return () => {
      clearTimeout(startTyping)
      clearTimeout(land)
    }
  }, [beatIndex, gateConfirmed, showGate, showBump, showCupReplies, cupAnswer])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, showGate, showCupReplies, showBump, isTyping, movedTo, checkoutError])

  useEffect(() => {
    document.title = CHAT_TAB_TITLE
  }, [])

  // Mark her position the moment the card is shown, so a refresh from anywhere downstream
  // resumes rather than restarts.
  useEffect(() => {
    if (!showGate) return
    try {
      sessionStorage.setItem(RESUME_KEY, 'gate')
    } catch {
      // Storage unavailable → she gets the greeting again on refresh. Acceptable.
    }
  }, [showGate])

  const toggle = (index: number) => setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)))

  // She has committed. The card stays on screen as her record of what she agreed to.
  const handleGateConfirm = () => {
    if (gateConfirmed || !ready) return
    setGateConfirmed(true)
    setBeatIndex((i) => i + 1)
  }

  // Her quick reply. null = "None of these — you choose" → no pick, the server's default.
  const handleCupReply = (picked: TeaCup | null, text: string) => {
    if (!showCupReplies || cupAnswer !== null) return
    setShowCupReplies(false)
    setCup(picked)
    addMessage(text, 'her')
    setCupAnswer(CHAT_CUP.answer(picked))
  }

  // The bump answer IS the checkout on this treatment — the last turn before the money.
  const handleBumpChoice = async (taken: boolean) => {
    if (busy || !quote) return
    setBusy(true)
    setCheckoutError(null)
    setMovedTo(null)
    trackPH('checkout_initiated', {
      funnel: backendOfferFunnel(TEA_READING_OFFER),
      step: 'sales',
      product: 'be_tea_reading',
      price_cents: teaReadingTotalCents(quote.cents, taken),
      bump: taken,
      treatment: 'chat',
      rung: quote.day,
      cup: cup ?? 'none',
    })
    const result = await beginBackendCheckout(
      teaReadingCheckoutRequest({ treatment: 'chat', firstName, letterCode, bump: taken, quote, cup }),
    )
    if (result.status === 'price_changed') {
      setPrice({ status: 'ready', quote: result.current })
      setMovedTo(result.current.label)
    }
    if (result.status === 'error') setCheckoutError(result.message)
    // 'redirecting' leaves it disabled — the tab is on its way to Stripe.
    if (result.status !== 'redirecting') setBusy(false)
  }

  const renderMessage = (msg: ChatMessage) =>
    msg.from === 'evelyn' ? (
      <div key={msg.id} className="flex w-full justify-start" data-testid="message-evelyn">
        <div className="max-w-[85%] rounded-2xl rounded-bl-none border border-gray-100 bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-sm md:text-base">
          {msg.text}
        </div>
      </div>
    ) : (
      <div key={msg.id} className="flex w-full justify-end" data-testid="message-her">
        <div className="max-w-[85%] rounded-2xl rounded-br-none bg-purple-600 px-4 py-3 text-sm leading-relaxed text-white shadow-sm md:text-base">
          {msg.text}
        </div>
      </div>
    )

  const priceSlot = quote ? (
    <strong className="whitespace-nowrap font-semibold text-gray-900" data-testid="text-gate-price">
      {quote.label}
    </strong>
  ) : (
    <span
      className="inline-block h-3.5 w-9 animate-pulse rounded bg-amber-100 align-middle"
      role="status"
      aria-label={PRICE_STATES.loadingLabel}
      data-testid="price-loading"
    />
  )

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

        {/* The thread's subject: what she is here to do, not a receipt. Sized to hold ONE line
            down to a 320px phone. */}
        <div
          className="shrink-0 border-b border-gray-200 bg-white px-3 py-2 text-center text-[10px] uppercase tracking-[0.1em] text-gray-500 sm:px-4 sm:text-[11px] sm:tracking-[0.18em]"
          data-testid="text-thread-title"
        >
          {CHAT_THREAD_TITLE}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50/50 p-4 scroll-smooth">
          <div className="flex flex-col gap-3">
            {(showGate ? messages.slice(0, gateAt) : messages).map(renderMessage)}

            {/* THE CARD — one card, inline in the stream, in her voice. Same family as 03's. */}
            {showGate && (
              <div className="mt-3 animate-cta-appear" data-testid="commitment-gate">
                <div className="overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 via-white to-white shadow-md">
                  <div className="px-5 pb-3 pt-5 text-center">
                    <div className="text-xs tracking-[0.3em] text-amber-500/90">✦</div>
                    <h3 className="mt-1.5 font-serif text-xl italic leading-snug text-gray-800">{CHAT_GATE.heading}</h3>
                    <p className="mt-2.5 text-[14px] italic leading-snug text-gray-600">{CHAT_GATE.deck}</p>
                  </div>

                  <div className="space-y-2.5 px-5 pb-4">
                    {CHAT_GATE.statements.map((statement, index) => {
                      const parts = chatStatementParts(statement)
                      return (
                        <label
                          key={statement}
                          className="flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-gray-700"
                          data-testid={`checkbox-statement-${index}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked[index]}
                            disabled={gateConfirmed}
                            onChange={() => toggle(index)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600"
                          />
                          <span>
                            {parts ? (
                              <>
                                {parts.before}
                                {priceSlot}
                                {parts.after}
                              </>
                            ) : (
                              statement
                            )}
                          </span>
                        </label>
                      )
                    })}
                  </div>

                  {price.status === 'failed' && (
                    <p className="mx-5 mb-3 text-center text-[12.5px] text-gray-700" role="alert" data-testid="text-price-failed">
                      {PRICE_STATES.failed}{' '}
                      <button
                        type="button"
                        onClick={() => void loadPrice()}
                        className="font-semibold text-amber-700 underline underline-offset-2"
                        data-testid="button-price-retry"
                      >
                        {PRICE_STATES.retry}
                      </button>
                    </p>
                  )}

                  <div className="mx-5 flex items-baseline justify-between border-t border-amber-100 pt-4">
                    <span className="text-[13px] text-gray-600">{CHAT_GATE.totalLabel}</span>
                    <span className="font-serif text-[24px] text-gray-800" data-testid="text-total">
                      {quote ? quote.label : '—'}
                    </span>
                  </div>

                  {/* The button is ABSENT until every agreement is made and today's price is on
                      the card — not disabled. That absence is the mechanism, per V1's gate. */}
                  <div className="px-4 pb-4 pt-4">
                    {ready ? (
                      <button
                        type="button"
                        disabled={gateConfirmed}
                        onClick={handleGateConfirm}
                        className="w-full animate-pulse rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 text-lg font-bold text-white shadow-lg transition-all duration-300 hover:animate-none hover:shadow-xl disabled:animate-none disabled:opacity-50"
                        data-testid="button-checkout"
                      >
                        {CHAT_GATE.button} &nbsp;→
                      </button>
                    ) : (
                      <p className="py-2 text-center text-[11px] italic text-gray-400" data-testid="text-locked-hint">
                        {CHAT_GATE.lockedHint}
                      </p>
                    )}
                    <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-500" data-testid="text-small-print">
                      {CHAT_GATE.smallPrint}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Everything said after the card flows beneath it. */}
            {showGate && messages.slice(gateAt).map(renderMessage)}

            {/* She is typing. ⚠ Markup lifted from V1's live chat (ChatPage.tsx). */}
            {isTyping && (
              <div className="flex w-full justify-start" data-testid="indicator-typing">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-none border border-gray-100 bg-white px-4 py-3 shadow-sm">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></span>
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></span>
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></span>
                </div>
              </div>
            )}

            {/* THE CUP — a quick-reply turn. Optional: "you choose" moves her on like the rest. */}
            {showCupReplies && (
              <div className="flex flex-wrap justify-end gap-2 animate-cta-appear" data-testid="cup-replies">
                {CHAT_CUP_REPLIES.map((reply) => (
                  <button
                    key={reply.text}
                    type="button"
                    onClick={() => handleCupReply(reply.cup, reply.text)}
                    className="rounded-full border border-purple-300 bg-white px-4 py-2 text-sm font-medium text-purple-800 shadow-sm transition-colors hover:bg-purple-50"
                    data-testid={`cup-reply-${reply.cup ?? 'skip'}`}
                  >
                    {reply.text}
                  </button>
                ))}
              </div>
            )}

            {/* THE BUMP — its own turn, after she has committed. Two actions, each going straight
                to checkout. ⛔ No third confirm step. */}
            {showBump && (
              <div className="mt-3 animate-cta-appear" data-testid="order-bump">
                <div className="overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/90 via-white to-white shadow-md">
                  <div className="px-5 pb-2 pt-4 text-center">
                    <div className="text-xs tracking-[0.3em] text-amber-500/90">✦</div>
                    <p className="mt-2 font-serif text-base leading-relaxed text-gray-800">{CHAT_BUMP.body}</p>
                  </div>

                  <div className="px-5 pb-4">
                    <div className="flex items-baseline justify-center gap-2 text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">{CHAT_BUMP.priceLine}</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500" data-testid="text-bump-total">
                        {quote ? `${priceLabel(teaReadingTotalCents(quote.cents, true))} total` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* The decline is full-width and equally legible on purpose. */}
                  <div className="space-y-2 px-4 pb-4">
                    <button
                      type="button"
                      onClick={() => handleBumpChoice(true)}
                      disabled={busy || !quote}
                      className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 text-lg font-bold text-white shadow-lg transition-all duration-300 hover:shadow-xl disabled:opacity-70"
                      data-testid="button-bump-accept"
                    >
                      {CHAT_BUMP.accept}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBumpChoice(false)}
                      disabled={busy || !quote}
                      className="w-full rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-600 transition-colors duration-200 hover:bg-gray-50 disabled:opacity-70"
                      data-testid="button-bump-decline"
                    >
                      {CHAT_BUMP.decline}
                    </button>
                    {movedTo && (
                      <p
                        className="rounded-lg bg-amber-50 px-3 py-2 text-center text-[12.5px] leading-snug text-amber-900"
                        role="alert"
                        data-testid="text-price-changed"
                      >
                        {chatPriceChangedNotice(movedTo)}
                      </p>
                    )}
                    {checkoutError && (
                      <p className="pt-1 text-center text-[12px] text-red-600" data-testid="text-checkout-error" role="alert">
                        {checkoutError}
                      </p>
                    )}
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
