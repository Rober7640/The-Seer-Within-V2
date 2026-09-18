import { useEffect, useRef, useState } from 'react'
import { useLocation, useSearch } from 'wouter'
import MarcusShell from './MarcusShell'
import { displayName } from '../../lib/upsellCopy/types'
import { track as trackPH } from '../../lib/posthog'
import { sessionIdFromSearch, useMarcusOrder, type PublicMarcusOrder } from './marcusOrder'
import './marcus.css'
import './upsell.css'

// 08 Marcus — Upsell 1, the $17 audio recording (T8). Route: /marcus/reading/welcome1.
//
// Ported from improve-v1/v1-one-time-BEs/local/08-marcus/client/pages/upsell.js
// (design-reviews/03-audio-upsell.md; copy = upsell-1-audio/COPY.md verbatim). The
// differences from the local file are all plumbing:
//   - the order is fetched here through the webhook race (marcusOrder.ts), and fails
//     CLOSED exactly like the bridge: no paid order → no offer, no charge
//   - the running-order sleeve reads the edition's positions from the public editions
//     endpoint (the order JSON carries only `editionId`); the count is never hard-coded
//   - Yes = the 1-click charge off the card saved at booking (Joel's D2), product
//     `be_08_marcus_audio`, which n8n exact-matches to fulfil the audio. A card that
//     rejects the off-session charge falls back to a hosted Stripe checkout.
//   - No / accepted → /marcus/reading/success (the deck's `?s=` receipt). There is NO
//     welcome2: buy or decline, she lands on the receipt.
//
// ⛔ No Meta pixel on any backend-deck page; the `be_` product is invisible to V1.

const SUCCESS_PATH = '/marcus/reading/success'
const AUDIO_PRODUCT = 'be_08_marcus_audio'
// PostHog props for this step. `funnel` matches the booking + server value ('marcusreading')
// so the whole Marcus funnel filters as one; `step`/`product` mirror the deck's upsell events.
const PH_PROPS = { funnel: 'marcusreading', step: 'upsell1', product: AUDIO_PRODUCT }
const AUDIO_CENTS_FALLBACK = 1700
const SUPPORT_EMAIL = 'hi@theseerwithin.com'
// The row holds the literal "Friend" when the letter carried no name (02/06 convention).
const PLACEHOLDER_NAMES = ['Friend'] as const

interface PublicPosition {
  id: string
  number: number
  label: string
  visibility: 'free' | 'paid'
}

/** "$17" for whole dollars, "$47.77" otherwise — the letter says "$17", never "$17.00". */
function dollars(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`
}

function audioCents(order: PublicMarcusOrder): number {
  return order.audio?.priceCents || AUDIO_CENTS_FALLBACK
}

export default function MarcusUpsell() {
  const search = useSearch()
  const sessionId = sessionIdFromSearch(search)
  const state = useMarcusOrder(sessionId)

  return (
    <MarcusShell dateline={state.status === 'paid' ? 'One addition' : undefined}>
      {state.status === 'loading' ? (
        <section className="review upsell">
          <p className="upsell-copy">Confirming your order.</p>
        </section>
      ) : state.status === 'paid' ? (
        <AudioOffer order={state.order} sessionId={sessionId as string} />
      ) : (
        <FailClosed />
      )}
    </MarcusShell>
  )
}

/** Fail closed: no paid order, no offer and no charge — the bridge's copy, same address. */
function FailClosed() {
  return (
    <section className="review upsell">
      <h1>No payment has reached Marcus’s team yet.</h1>
      <p className="upsell-copy">
        Most of the time this means your card was not charged. Please check your bank. If there
        is no $35 charge, choose a reading. Opening the readings costs nothing.
      </p>
      <p className="upsell-copy">
        If your bank does show a $35 charge, email{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and a person on Marcus’s team
        will match it to your order.
      </p>
      <p className="upsell-copy">
        <a href="/marcus/reading" className="text-link">
          Choose a reading
        </a>
      </p>
    </section>
  )
}

function AudioOffer({ order, sessionId }: { order: PublicMarcusOrder; sessionId: string }) {
  const [, navigate] = useLocation()
  const [positions, setPositions] = useState<PublicPosition[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const leftRef = useRef(false) // set once we have navigated; nothing may fire twice
  const sleeveRef = useRef<HTMLElement | null>(null)

  const name = displayName(order.firstName, PLACEHOLDER_NAMES)
  const hours = order.deliveryHours
  const price = dollars(audioCents(order))

  // The running-order sleeve reads the edition's positions. The order carries only the
  // edition id; the labels come from the public editions endpoint (same source the
  // booking page uses). A miss just renders the sleeve without its per-position rows.
  useEffect(() => {
    const editionId = order.editionId
    if (!editionId) return
    let cancelled = false
    fetch(`/api/backend/marcus/editions/${encodeURIComponent(editionId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.edition?.positions) setPositions(data.edition.positions)
      })
      .catch(() => {
        /* the sleeve is still readable without the position rows */
      })
    return () => {
      cancelled = true
    }
  }, [order.editionId])

  const toReceipt = () => {
    if (leftRef.current) return
    leftRef.current = true
    navigate(`${SUCCESS_PATH}?s=${encodeURIComponent(sessionId)}`, { replace: true })
  }

  const decline = () => {
    if (busy || leftRef.current) return
    trackPH('upsell_declined', PH_PROPS)
    toReceipt()
  }

  const accept = async () => {
    if (busy || leftRef.current) return
    setBusy(true)
    setError(null)
    try {
      const r = await fetch('/api/backend/upsell/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutSessionId: sessionId,
          email: order.email,
          product: AUDIO_PRODUCT,
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (data?.success) {
        trackPH('upsell_accepted', { ...PH_PROPS, amount_cents: audioCents(order) })
        toReceipt()
        return
      }
      // A card that rejects the off-session charge (Indian cards, 3DS/SCA) → a hosted
      // Stripe checkout for the same product, where she authenticates and pays.
      if (data?.fallback) {
        const f = await fetch('/api/backend/upsell/fallback-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkoutSessionId: sessionId,
            email: order.email,
            product: AUDIO_PRODUCT,
          }),
        })
        const fd = await f.json().catch(() => ({}))
        if (fd?.url) {
          trackPH('upsell_fallback_redirect', PH_PROPS)
          window.location.href = fd.url
          return
        }
      }
      throw new Error('charge failed')
    } catch {
      setBusy(false)
      setError('That didn’t go through. Your written reading is safe — you can try again or continue to your order.')
    }
  }

  // The one motion: the track fills and the rows settle once, when the sleeve scrolls
  // into view. Anything that stops this leaves the sleeve fully drawn; reduced motion
  // never adds the class. Mirrors the local page's settleSleeve().
  useEffect(() => {
    const sleeve = sleeveRef.current
    if (!sleeve) return
    const motionOk =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: no-preference)').matches
    if (!motionOk || !('IntersectionObserver' in window)) return
    sleeve.classList.add('pending')
    let done = false
    const settle = () => {
      if (done) return
      done = true
      sleeve.classList.remove('pending')
      sleeve.classList.add('in')
      obs.disconnect()
      clearTimeout(timer)
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) settle()
      },
      { threshold: 0.2 },
    )
    obs.observe(sleeve)
    const timer = setTimeout(settle, 4000)
    return () => {
      obs.disconnect()
      clearTimeout(timer)
    }
  }, [positions.length])

  const segCount = positions.length + 2
  const acceptLabel = `Yes—add my audio reading for ${price}`

  return (
    <section className="review upsell">
      <p className="step-label">A quick warning before you view your receipt.</p>
      <h1>Don’t skip to the answer. You could miss how to use it.</h1>

      <div className="upsell-copy">
        <p>{name ? `${name},` : 'Friend,'}</p>
        <p>When your reading arrives, you may feel tempted to scroll straight to the final answer.</p>
        <p>But the final paragraph can only tell you where the reading leads. It cannot make sense on its own.</p>
        <p>
          Skip the explanation, and you may finish with advice you agree with—yet still have no idea
          why the cards point there, what to consider first, or how to use it in your situation.
        </p>
        <p>
          Your reading is built in an order. Each card answers a different part of your question. Then
          I read those cards together through the strengths and habits represented by your personal
          card.
        </p>
        <p>
          <strong>The connections are what turn several card meanings into one answer meant for you.</strong>
        </p>
        <p>That is why I can also prepare your complete reading as an audio recording.</p>
      </div>

      <figure
        className="sleeve"
        ref={sleeveRef}
        aria-label="Your audio reading, running order. Not yet recorded."
      >
        <div className="sleeve-head">
          <span className="kicker ink">Your audio reading · running order</span>
          <span className="sleeve-state">Not yet recorded</span>
        </div>
        <div className="player" aria-hidden="true">
          <span className="play" />
          <span className="track" style={{ ['--segs' as string]: segCount }}>
            {positions.map((_, i) => (
              <i key={`seg-${i}`} className="seg" style={{ ['--i' as string]: i }} />
            ))}
            <i className="seg lens" style={{ ['--i' as string]: positions.length }} />
            <i className="seg end" style={{ ['--i' as string]: positions.length + 1 }} />
          </span>
        </div>
        <ol className="chapters">
          {positions.map((p, i) => (
            <li key={p.id} style={{ ['--i' as string]: i }}>
              <span className="n num">{p.number || i + 1}</span>
              <span className="t">{p.label}</span>
            </li>
          ))}
          <li className="lens" style={{ ['--i' as string]: positions.length }}>
            <span className="n" aria-hidden="true">
              ◆
            </span>
            <span className="t">The cards read together through your personal card</span>
          </li>
          <li className="end" style={{ ['--i' as string]: positions.length + 1 }}>
            <span className="n" aria-hidden="true">
              →
            </span>
            <span className="t">The closing advice, and the reasoning behind it</span>
          </li>
        </ol>
        <figcaption className="sleeve-foot">
          Recorded after your written reading is prepared. Ready by the same {hours}-hour deadline.
          Length shown once recorded.
        </figcaption>
      </figure>

      <div className="upsell-copy">
        <p>
          Instead of scanning ahead, press play and hear each part lead naturally into the next.
          Pause when something lands. Replay the passages you need more time with. Return to the
          reasoning behind the closing advice whenever you need it.
        </p>
        <p>
          Your written reading remains complete. The audio gives you the same personal reading in a
          form designed to be followed from beginning to end.
        </p>
      </div>

      <section className="offer-stack insert includes" aria-labelledby="includes-h">
        <h2 id="includes-h" className="includes-h">
          Your audio reading includes
        </h2>
        <ul>
          <li>Your complete personal reading, narrated in order</li>
          <li>The same saved spread and personal-card lens</li>
          <li>A private recording you can pause and replay</li>
          <li>Delivery by the same {hours}-hour deadline as your written reading</li>
        </ul>
      </section>

      <section className="summary offer-close" aria-labelledby="offer-h">
        <div className="price-row">
          <h2 id="offer-h">Add your complete audio reading</h2>
          <span className="price num">{price}</span>
        </div>
        <p className="offer-note">
          One additional payment. Your written order is already confirmed and will continue whether
          you add audio or not.
        </p>
        <dl className="charge-ledger" aria-label="What is paid and what would be added">
          <div className="paid">
            <dt>
              Your written reading <em className="tag">Paid</em>
            </dt>
            <dd className="num">{dollars(order.amountCents)}</dd>
          </div>
          <div className="add-row">
            <dt>
              Audio recording <em className="tag">Only if you add it</em>
            </dt>
            <dd className="num">{price}</dd>
          </div>
        </dl>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="actions upsell-actions">
          <button
            type="button"
            id="audio-yes"
            className="primary"
            onClick={accept}
            disabled={busy}
          >
            {busy ? 'One moment…' : acceptLabel}
          </button>
          <button
            type="button"
            id="audio-no"
            className="upsell-decline"
            onClick={decline}
            disabled={busy}
          >
            No thanks—I’ll read it on my own.
          </button>
        </div>
      </section>

      <p className="sign">Marcus</p>
    </section>
  )
}
