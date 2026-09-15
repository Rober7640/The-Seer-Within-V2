import { useEffect, useRef, useState } from 'react'
import { useLocation, useSearch } from 'wouter'
import MarcusShell from './MarcusShell'
import { displayName } from '../../lib/upsellCopy/types'
import { sessionIdFromSearch, useMarcusOrder, type PublicMarcusOrder } from './marcusOrder'
import './bridge.css'

// 08 Marcus — the ORDER CONFIRMED sheet (post-purchase bridge).
// Route: /marcus/reading/bridge?session_id={CHECKOUT_SESSION_ID} (the catalog's
// `upsellEntryPath`; Stripe fills the placeholder). Also accepts `?s=`.
//
// Ported word-for-word from
// improve-v1/v1-one-time-BEs/local/08-marcus/client/pages/bridge.js (layout = design
// review 02 §3a; operator ruling 1 = auto-redirect with a countdown). Differences from
// the local file are all plumbing:
//   - the order is fetched here (the local harness loaded it in boot) and polled through
//     the webhook race — see marcusOrder.ts
//   - "paid" = the row exists and `status === 'paid'`; anything else fails CLOSED: no
//     redirect, the local page's fail-state copy
//   - the countdown starts only once the order reads as paid; a reload starts it again
//     (nothing is stored); unmount clears it, so back/forward can never push a second
//     upsell entry
//   - next = /marcus/reading/welcome1 (T8, the $17 recording), navigated with replace
//
// ⛔ No Meta pixel on any backend-deck page. PostHog $pageview fires from App.tsx on
// every route change, so nothing is tracked here.

const BRIDGE_SECONDS = 7
const NEXT_PATH = '/marcus/reading/welcome1'
const SUPPORT_EMAIL = 'hi@theseerwithin.com' // same address as the receipt sheet
// The row holds the literal "Friend" when the letter carried no ?fn= (02/06 convention).
const PLACEHOLDER_NAMES = ['Friend'] as const

export default function MarcusBridge() {
  const search = useSearch()
  const sessionId = sessionIdFromSearch(search)
  const state = useMarcusOrder(sessionId)

  return (
    <MarcusShell dateline={state.status === 'paid' ? 'Order confirmed' : undefined}>
      {state.status === 'loading' ? (
        <section className="review bridge-page">
          <p className="bridge">Confirming your order.</p>
        </section>
      ) : state.status === 'paid' ? (
        <ConfirmedSheet order={state.order} sessionId={sessionId as string} />
      ) : (
        <FailClosed />
      )}
    </MarcusShell>
  )
}

/** Fail closed: no paid order, no page and no redirect. Third copy pass (cold read 3):
 *  one idea per sentence, the likely case first, the bank check as the default action,
 *  a named person for the charged case, and the link alone on the last line. The link
 *  goes to the offer root, where the booking page lists readings. */
function FailClosed() {
  return (
    <section className="review bridge-page">
      <h1>No payment has reached Marcus’s team yet.</h1>
      <p className="bridge">
        Most of the time this means your card was not charged. Please check your bank. If there
        is no $35 charge, choose a reading. Opening the readings costs nothing.
      </p>
      <p className="bridge">
        If your bank does show a $35 charge, email{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with the time you paid. A person
        on Marcus’s team will match it to your order and send your reading. You will never be
        charged twice.
      </p>
      <p className="bridge">
        <a href="/marcus/reading" className="text-link">
          Choose a reading
        </a>
      </p>
    </section>
  )
}

function ConfirmedSheet({ order, sessionId }: { order: PublicMarcusOrder; sessionId: string }) {
  const [, navigate] = useLocation()
  const [left, setLeft] = useState(BRIDGE_SECONDS)
  const leftRef = useRef(false) // set once we have navigated; nothing may fire twice
  const fillRef = useRef<HTMLElement | null>(null)

  const next = `${NEXT_PATH}?session_id=${encodeURIComponent(sessionId)}`
  const leave = () => {
    if (leftRef.current) return
    leftRef.current = true
    navigate(next, { replace: true })
  }

  // The countdown: body type, one number changing once a second; no spinner, no red.
  useEffect(() => {
    let remaining = BRIDGE_SECONDS
    const timer = setInterval(() => {
      remaining -= 1
      if (remaining <= 0) {
        clearInterval(timer)
        setLeft(0)
        leave()
        return
      }
      setLeft(remaining)
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // The thin rule that fills over the same seconds (CSS transition; hidden under
  // reduced motion). Two frames so the initial scaleX(0) is painted first.
  useEffect(() => {
    const fill = fillRef.current
    if (!fill) return
    fill.style.transitionDuration = `${BRIDGE_SECONDS}s`
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => fill.classList.add('run'))
    })
    return () => {
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
    }
  }, [])

  const name = displayName(order.firstName, PLACEHOLDER_NAMES)
  // ⚠ Placeholder: Stripe collects an email on every hosted Checkout, so `email` should
  // never be empty. If it is, name the thing rather than print a blank.
  const email = order.email || 'your email address'
  const hours = order.deliveryHours

  return (
    <section className="review bridge-page">
      <div className="bridge-head">
        <p className="eyebrow ink">Order confirmed</p>
        <h1>
          Your personal reading <span className="nowrap">is now being prepared.</span>
        </h1>
      </div>
      <p className="bridge thanks">
        {name ? `Thank you, ${name}.` : 'Thank you.'} I have your question, the tarot cards turned
        over for you, and your personal tarot card from your birth name.
      </p>
      <div className="facts" id="delivery-facts">
        <div className="rule-double" aria-hidden="true" />
        <p>
          <strong>Your written reading is secured.</strong> It will be prepared for{' '}
          <strong className="email" id="delivery-email">
            {email}
          </strong>{' '}
          and delivered within {hours} hours of payment.
        </p>
        {/* label-over-value display lines (02 B2) — desktop only; on a phone they cost the first screen */}
        <dl>
          <div>
            <dt className="label">Delivery email</dt>
            <dd>{email}</dd>
          </div>
          <div>
            <dt className="label">Arrives</dt>
            <dd id="delivery-window">
              Within {hours} hours <small>of payment</small>
            </dd>
          </div>
        </dl>
        <div className="hair" aria-hidden="true" />
      </div>
      <p className="next">
        Before your receipt, the next page offers this same reading as an audio recording. It
        costs extra, and you can buy it or skip it.
      </p>
      <div className="action">
        <p className="count-line" id="countdown-line" aria-live="off">
          {left <= 0 ? (
            'Opening the next page now.'
          ) : (
            <>
              The next page opens in{' '}
              <span className="num" id="countdown">
                {left}
              </span>{' '}
              <span id="countdown-unit">{left === 1 ? 'second' : 'seconds'}</span>.
            </>
          )}
        </p>
        <div className="count-rule" aria-hidden="true">
          <i ref={fillRef} id="count-fill" />
        </div>
        <a
          className="text-button"
          id="to-upsell"
          href={next}
          onClick={(e) => {
            e.preventDefault()
            leave()
          }}
        >
          continue now
        </a>
      </div>
      <p className="under">Nothing on the next page changes or delays that order.</p>
    </section>
  )
}
