import { useEffect, useRef, useState } from 'react'
import { useLocation, Link } from 'wouter'
import { Check } from 'lucide-react'
import { CosmicBackground } from '../components/CosmicBackground'
import { linkParams } from '../lib/funnel'
import { track } from '../lib/posthog'
import { submitRetargetCheckout } from '../lib/retargetBuy'
import {
  NAME_ERROR,
  NAME_PLACEHOLDER,
  RETARGET_DECK,
  cleanFirstName,
  retargetBucket,
  retargetHook,
  storedFirstName,
} from '../lib/tarotRetarget'
import { angleForHook, getDeck, type TarotVersion } from '../content/tarotReads'
import { RETARGET_OFFER } from '../content/tarotRetargetOffer'
import { retargetOfferPricing } from '@shared/retargetCheckout'

// The /fb-tarot RETARGETING page (`/fb-tarot/b?src=retarget&hook=<hook>`) — the offer
// page, the only retarget page since 2026-10-16. TarotBridge renders it for every
// `src=retarget` visit.
//
// It does not lead with the cards (there are NO card images on this page) and puts the
// offer — the returning-reader price — high on the page. The price is NOT decided here:
// the struck full price, the offer price and the percent all come from
// retargetOfferPricing() (shared/retargetCheckout.ts), which reads the same tables
// /api/checkout charges from; the checkout sends the offer-page marker
// (`retargetPage: 'offer'`) and the SERVER charges the offer price for it.
//
// No "ask me one thing first" door, on purpose: the chat would charge the full price.
//
// `?cancelled=1` (she backed out of Stripe): the cancelled note at the top, and the
// page scrolls to the first buy block.
//
// Copy: content/tarotRetargetOffer.ts. The name box is ONE value shared by both buy
// blocks — typing in one fills the other.

function money(dollars: number): string {
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`
}

export default function TarotRetargetOffer() {
  const [location] = useLocation()
  const path = location.replace(/\/+$/, '')
  const version: TarotVersion = path.endsWith('/b') ? 'b' : path.endsWith('/c') ? 'c' : 'a'

  const [setup] = useState(() => {
    const params = linkParams()
    const hook = retargetHook()
    return {
      hook,
      bucket: retargetBucket(hook),
      cancelled: params.get('cancelled') === '1',
      knownName: storedFirstName(),
      seg: params.get('seg') || undefined,
      utmContent: params.get('utm_content') || undefined,
    }
  })
  const { hook, bucket, cancelled, knownName } = setup
  const copy = RETARGET_OFFER[bucket]
  const deck = RETARGET_DECK
  const cfg = getDeck(deck)
  const pricing = retargetOfferPricing()
  const fullLabel = money(pricing.fullDollars)
  const offerLabel = money(pricing.offerDollars)
  const pctLabel = `${pricing.pct}%`

  const [name, setName] = useState(knownName ?? '')
  const [errorAt, setErrorAt] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const alive = useRef(true)
  const inputs = useRef<Record<number, HTMLInputElement | null>>({})
  const firstCta = useRef<HTMLDivElement | null>(null)

  const baseProps = {
    deck,
    facing: cfg.facing,
    hook,
    angle: angleForHook(hook),
    version,
    bucket,
    mode: 'retarget' as const,
    full_price_cents: Math.round(pricing.fullDollars * 100),
    discount_pct: pricing.pct,
  }

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // Page view (+ the cancelled return: straight to the first buy block).
  useEffect(() => {
    track('tarot_bridge_view', {
      ...baseProps,
      seg: setup.seg,
      utm_content: setup.utmContent,
      cancelled,
      known_name: knownName !== null,
    })
    if (cancelled) {
      track('retarget_cancelled_view', baseProps)
      const id = requestAnimationFrame(() => {
        firstCta.current?.scrollIntoView({ block: 'start' })
      })
      return () => cancelAnimationFrame(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onBuy = async (position: 1 | 2) => {
    if (submitting) return
    const firstName = cleanFirstName(name)
    track('retarget_offer_cta_click', { ...baseProps, position, name_valid: firstName !== null })
    if (!firstName) {
      setErrorAt(position)
      inputs.current[position]?.focus()
      return
    }
    setErrorAt(null)
    setSubmitting(true)
    try {
      await submitRetargetCheckout({
        firstName,
        hook,
        bucket,
        deck,
        // Tracking only — the server prices the order from the offer-page marker.
        price: pricing.offerDollars,
        eventProps: baseProps,
        clickProps: { position },
        namePrefilled: knownName !== null,
      })
    } catch (error) {
      console.error('Checkout error:', error)
    }
    // Still here ⇒ the server gave nothing to follow. Let her try again.
    if (alive.current) setSubmitting(false)
  }

  /** The struck full price + the offer price, with one clear sentence for screen readers. */
  // Plain render functions, NOT components: a component defined in here would remount
  // on every keystroke and drop the input's focus.
  const priceLine = (size: 'lg' | 'md', position: 1 | 2) => (
    <p
      className="flex items-baseline justify-center gap-3 flex-wrap [font-variant-numeric:lining-nums]"
      data-testid={`offer-price-line-${position}`}
    >
      <span className="sr-only" data-testid={`offer-price-sr-${position}`}>{`Was ${fullLabel}, now ${offerLabel}.`}</span>
      <s
        aria-hidden="true"
        className={`font-serif text-[#8a7559] decoration-[#b5452f] decoration-[3px] ${size === 'lg' ? 'text-[1.875rem]' : 'text-[1.5rem]'}`}
        data-testid={`offer-price-full-${position}`}
      >
        {fullLabel}
      </s>
      <span
        aria-hidden="true"
        className={`font-serif font-bold text-[#2a1d12] leading-none ${size === 'lg' ? 'text-[3.25rem]' : 'text-[2.5rem]'}`}
        data-testid={`offer-price-now-${position}`}
      >
        {offerLabel}
      </span>
    </p>
  )

  const buyForm = (position: 1 | 2) => {
    const inputId = `offer-first-name-${position}`
    const errorId = `offer-name-error-${position}`
    const hasError = errorAt === position
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void onBuy(position)
        }}
        noValidate
        className="text-left"
      >
        <label htmlFor={inputId} className="block font-serif text-[1.0625rem] text-[#3b2a1a] mb-2">
          {copy.nameLabel}
        </label>
        <input
          id={inputId}
          ref={(el) => {
            inputs.current[position] = el
          }}
          name="firstName"
          type="text"
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="go"
          maxLength={40}
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (errorAt !== null) setErrorAt(null)
          }}
          placeholder={NAME_PLACEHOLDER}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className={`w-full bg-white text-gray-900 placeholder-gray-400 rounded-lg py-3 px-4 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 border ${hasError ? 'border-red-400' : 'border-[#d9c7a3]'}`}
          data-testid={`offer-first-name-${position}`}
        />
        {hasError && (
          <p id={errorId} className="text-sm text-red-700 mt-1.5" data-testid={`offer-name-error-${position}`}>
            {NAME_ERROR}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-3 w-full py-4 px-5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-800 text-white font-semibold text-base leading-snug shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
          data-testid={`offer-button-${position}`}
        >
          {submitting ? 'One moment…' : copy.offerButton(offerLabel)}
        </button>
        <p className="text-center text-[0.8125rem] text-[#6b5a45] mt-2 leading-relaxed" data-testid={`offer-note-${position}`}>
          {copy.offerNote}
        </p>
      </form>
    )
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden" data-testid="retarget-offer-page">
      <CosmicBackground />
      {/* Body copy: 17px on phones, 18px up, line-height 1.65. */}
      <style>{`
        [data-testid="retarget-offer-page"] .offer-p {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 1.0625rem;
          line-height: 1.65;
          color: #2e261f;
          margin: 0 0 1.05em;
        }
        @media (min-width: 640px) {
          [data-testid="retarget-offer-page"] .offer-p { font-size: 1.125rem; }
        }
        [data-testid="retarget-offer-page"] .offer-h2 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.375rem;
          line-height: 1.3;
          color: #2a1d12;
          margin: 0 0 1rem;
        }
        @media (min-width: 640px) {
          [data-testid="retarget-offer-page"] .offer-h2 { font-size: 1.625rem; }
        }
      `}</style>

      <div className="relative z-10 pt-4 pb-3 text-center">
        <p className="font-serif text-xl md:text-2xl text-secondary drop-shadow-md">The Seer Within</p>
      </div>

      <main className="relative z-10 sm:px-4 pb-10">
        <article
          className="mx-auto max-w-[640px] bg-[#fbf6ec] sm:rounded-lg shadow-2xl px-4 pt-6 pb-10 sm:px-12 sm:pt-10 sm:pb-12 border-y sm:border border-[#eadfc9]"
          data-testid="offer-paper"
        >
          {cancelled && (
            <p
              className="offer-p !mb-6 rounded-lg border border-[#e2cfa6] bg-[#fff6df] px-4 py-3 italic text-[#5a4632]"
              data-testid="offer-cancelled-note"
              role="status"
            >
              {copy.cancelledNote}
            </p>
          )}

          {/* 1 — Evelyn, the eyebrow, the headline, the soft lead. */}
          <header>
            <div className="flex items-center gap-3.5 mb-4">
              <img
                src="/evelyn-avatar.png"
                alt="Evelyn Cross"
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover border-2 border-secondary shadow-md shrink-0"
                data-testid="offer-evelyn-photo"
              />
              <p className="text-[0.9375rem] text-[#6b5a45] tracking-wide leading-snug" data-testid="offer-eyebrow">
                {copy.eyebrow}
              </p>
            </div>
            <h1
              className="font-serif text-[1.75rem] leading-[1.2] sm:text-[2.25rem] text-[#2a1d12] mb-5"
              data-testid="offer-headline"
            >
              {copy.headline}
            </h1>
          </header>

          <div data-testid="offer-intro">
            {copy.intro.map((t, i) => (
              <p key={i} className="offer-p" data-testid={i === 0 ? 'offer-intro-first' : undefined}>
                {i === 0 && knownName ? copy.introNamed(knownName) : t}
              </p>
            ))}
          </div>

          {/* 2 — The offer box, high on the page. */}
          <section
            ref={firstCta}
            aria-labelledby="offer-title"
            className="relative mt-7 mb-10 rounded-2xl border-2 border-[#c9a24a] bg-[#fffaf0] px-4 pt-7 pb-5 sm:px-7 sm:pt-8 sm:pb-6 shadow-[0_6px_24px_rgba(60,40,20,0.12)] text-center scroll-mt-8"
            data-testid="offer-box"
          >
            <span
              className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#7a2e8e] px-4 py-1 text-[0.8125rem] font-semibold tracking-wide text-white shadow"
              data-testid="offer-badge"
            >
              {copy.badge(pctLabel)}
            </span>
            <h2 id="offer-title" className="offer-h2 !mb-2" data-testid="offer-title">
              {copy.offerTitle}
            </h2>
            <p className="offer-p !mb-4 text-[#4a3b2c]" data-testid="offer-summary">
              {copy.offerSummary}
            </p>
            {priceLine('lg', 1)}
            <p className="mt-1 mb-5 text-[0.875rem] uppercase tracking-[0.08em] text-[#7a6650]" data-testid="offer-price-label">
              {copy.priceLabel}
            </p>
            <div data-testid="offer-cta-1">
              {buyForm(1)}
            </div>
          </section>

          {/* 3 — What she gets, how it works, why it's cheaper, two doubts. */}
          <section aria-labelledby="offer-includes-h" className="mb-10" data-testid="offer-includes">
            <h2 id="offer-includes-h" className="offer-h2">
              {copy.includesHeading}
            </h2>
            <ul className="space-y-4">
              {copy.includes.map((it, i) => (
                <li key={i} className="flex gap-3" data-testid="offer-include-item">
                  <span
                    aria-hidden="true"
                    className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e9dcbc] text-[#5b3d0f]"
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <div className="min-w-0">
                    <p className="offer-p !mb-0.5 font-bold text-[#2a1d12]">{it.title}</p>
                    <p className="offer-p !mb-0">{it.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="offer-steps-h" className="mb-10" data-testid="offer-steps">
            <h2 id="offer-steps-h" className="offer-h2">
              {copy.stepsHeading}
            </h2>
            <ol className="space-y-4">
              {copy.steps.map((st, i) => (
                <li key={i} className="flex gap-3" data-testid="offer-step">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7a2e8e] font-serif text-[0.9375rem] font-bold text-white"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="offer-p !mb-0.5 font-bold text-[#2a1d12]">{st.title}</p>
                    <p className="offer-p !mb-0">{st.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="offer-why-h" className="mb-10" data-testid="offer-why">
            <h2 id="offer-why-h" className="offer-h2">
              {copy.whyHeading}
            </h2>
            {copy.why.map((t, i) => (
              <p key={i} className="offer-p">
                {t}
              </p>
            ))}
          </section>

          <div data-testid="offer-doubts">
            {copy.doubts.map((d, i) => (
              <div key={i} className="mb-8 border-l-2 border-[#c9a24a] pl-4 sm:pl-5" data-testid="offer-doubt">
                <h3 className="offer-p !mb-2 font-bold italic text-[#3b2a1a]" data-testid="offer-doubt-q">
                  {d.q}
                </h3>
                {d.a.map((t, j) => (
                  <p key={j} className="offer-p">
                    {t}
                  </p>
                ))}
              </div>
            ))}
          </div>

          {/* The second buy block — same name value as the first. */}
          <section
            aria-label={`${copy.offerTitle} — ${offerLabel}`}
            className="my-10 rounded-xl border border-[#e2cfa6] bg-[#fffaf0] px-4 py-5 sm:px-6 sm:py-6 shadow-[0_2px_12px_rgba(60,40,20,0.08)] text-center"
            data-testid="offer-cta-2"
          >
            <span className="inline-block mb-2 rounded-full bg-[#7a2e8e] px-3.5 py-0.5 text-[0.8125rem] font-semibold tracking-wide text-white">
              {copy.badge(pctLabel)}
            </span>
            {priceLine('md', 2)}
            <p className="mt-1 mb-4 text-[0.8125rem] uppercase tracking-[0.08em] text-[#7a6650]">{copy.priceLabel}</p>
            {buyForm(2)}
          </section>

          <div className="mt-10" data-testid="offer-signoff">
            <p className="offer-p !mb-1">{copy.signOff}</p>
            <p className="font-serif italic text-[2rem] leading-tight text-[#3b2a1a]" data-testid="offer-signature">
              {copy.signature}
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-[#e7dcc6]" data-testid="offer-ps">
            <p className="offer-p !mb-0">{copy.ps}</p>
          </div>
        </article>
      </main>

      <footer className="relative z-10 pb-8 px-4 text-white/40 text-xs text-center space-y-2">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/privacy">
            <span className="hover:text-white/70 cursor-pointer transition-colors">Privacy Policy</span>
          </Link>
          <span>·</span>
          <Link href="/terms">
            <span className="hover:text-white/70 cursor-pointer transition-colors">Terms of Service</span>
          </Link>
          <span>·</span>
          <Link href="/refund">
            <span className="hover:text-white/70 cursor-pointer transition-colors">Refund Policy</span>
          </Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Cosmo Numerology Pte Ltd. For Entertainment Purposes Only.</p>
      </footer>
    </div>
  )
}
