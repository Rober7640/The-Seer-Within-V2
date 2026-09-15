import { useSearch } from 'wouter'
import MarcusShell, { formatUsd } from './MarcusShell'
import { displayName } from '../../lib/upsellCopy/types'
import { sessionIdFromSearch, useMarcusOrder, type PublicMarcusOrder } from './marcusOrder'
import './thank-you.css'

// 08 Marcus — the RECEIPT sheet.
// Route: /marcus/reading/success?s=<session_id> (the catalog's `successPath`; Upsell 1
// navigates here). Also accepts `?session_id=`.
//
// Ported from improve-v1/v1-one-time-BEs/local/08-marcus/client/pages/thank-you.js
// (layout = design review 02 §3b/§4 + README ruling #7):
//   1. her name + the question she bought
//   2. STATUS ROWS first — one row per bought piece, written always first, the recording
//      only if bought; each row = glyph + state word + one plain line. Rows never share
//      a sentence. Raw statuses are mapped to plain words; no system words reach the page.
//   3. the delivery email as a display line, with the way to correct it (02 T5)
//   4. the total LAST and quiet — an itemised ledger, total at body weight, one line
//      saying what it covers
// The local-only "generate PDF fixture" control is harness-only and not ported.
//
// What production can and cannot say today (see marcusOrder.ts for the shape):
//   written state  ← `deliveredAt` set → Sent; otherwise Paid. Production has no
//                    queued/generating/failed signal on the public shape (the
//                    `fulfilmentNote` column is support-only), so "Being prepared" and
//                    "Delayed" cannot render yet.
//   recording      ← `audio.purchased` (T8 wires the real entitlement; always false now,
//                    so the row and its ledger line never render today).
//   question       ← `edition.question`; the blockquote is omitted when the edition
//                    could not be looked up, never invented.
//   deadline       ← `dueAt` + `deliveryHours`; when `dueAt` is missing the "by …" clause
//                    is dropped rather than printing a placeholder.
//
// This page never writes to the order: a visit never starts fulfilment or repeats a
// charge. ⛔ No Meta pixel (backend-deck rule). PostHog $pageview fires from App.tsx.

const SUPPORT_EMAIL = 'hi@theseerwithin.com' // Joel, 2026-09-13 (PARALLEL-PLAN T4)
const PLACEHOLDER_NAMES = ['Friend'] as const

/* ── the deadline as a human date: weekday first, no year (02 T7) ───────── */
function deadline(value: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isFinite(d.getTime())
    ? d.toLocaleString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null
}

/* ── the five plain states of the local page; production reaches two of them ── */
type PlainState = 'paid' | 'processing' | 'ready' | 'delivered' | 'failed'
const GLYPH: Record<PlainState, string> = { paid: '●', processing: '◐', ready: '◐', delivered: '✓', failed: '!' }
const STATE_WORD: Record<PlainState, string> = {
  paid: 'Paid',
  processing: 'Being prepared',
  ready: 'Finished',
  delivered: 'Sent',
  failed: 'Delayed',
}

function writtenState(order: PublicMarcusOrder): PlainState {
  return order.deliveredAt ? 'delivered' : 'paid'
}

/* one status row: glyph + piece name + state word + one plain line (+ optional deadline line) */
function StatusRow({
  id,
  piece,
  state,
  line,
  extra,
}: {
  id?: string
  piece: string
  state: PlainState
  line: React.ReactNode
  extra?: React.ReactNode
}) {
  return (
    <div className={`status-row state-${state}`} id={id}>
      <span className="glyph" aria-hidden="true">
        {GLYPH[state]}
      </span>
      <div className="status-body">
        <p className="status-head">
          <span className="piece">{piece}</span> <span className="state-word">{STATE_WORD[state]}</span>
        </p>
        <p className="status-line">{line}</p>
        {extra}
      </div>
    </div>
  )
}

export default function MarcusThankYou() {
  const search = useSearch()
  const sessionId = sessionIdFromSearch(search)
  const state = useMarcusOrder(sessionId)

  return (
    <MarcusShell dateline={state.status === 'paid' ? 'Receipt' : undefined}>
      {state.status === 'loading' ? (
        <section className="review thanks still">
          <p className="bridge">Confirming your order.</p>
        </section>
      ) : state.status === 'paid' ? (
        <Receipt order={state.order} />
      ) : (
        <section className="review thanks still">
          <h1>No payment has reached Marcus’s team yet.</h1>
          <p className="bridge">
            Most of the time this means your card was not charged. Please check your bank. If
            there is no $35 charge, choose a reading and pay for it. Opening the readings costs
            nothing. Nothing is charged until you press Pay.
          </p>
          <p className="bridge">
            If your bank does show a $35 charge, email{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with the time you paid. A
            person on Marcus’s team will match it to your order and send your reading. You will
            never be charged twice.
          </p>
          <p className="bridge">
            <a href="/marcus/reading" className="text-link">
              Choose a reading
            </a>
          </p>
        </section>
      )}
    </MarcusShell>
  )
}

function Receipt({ order }: { order: PublicMarcusOrder }) {
  const name = displayName(order.firstName, PLACEHOLDER_NAMES)
  const emailText = order.email || 'your email address' // ⚠ placeholder; Stripe always collects one
  const email = <strong className="email">{emailText}</strong>
  const hours = order.deliveryHours
  const dueText = deadline(order.dueAt)
  const due = dueText ? <strong className="due">{dueText}</strong> : null
  const audioBought = !!order.audio?.purchased

  /* — written row — */
  const w = writtenState(order)
  const writtenLines: Record<PlainState, React.ReactNode> = {
    paid: 'Marcus has your question and your cards.',
    processing: 'Marcus is writing it now.',
    ready: <>It is on its way to {email}.</>,
    delivered: <>It was sent to {email}. Look for an email from Marcus Stone.</>,
    failed:
      'We hit a problem preparing it. Your payment is safe and the deadline still stands. We will email you when it is fixed.',
  }
  const deadlineLine = (
    <p className="status-line" id="written-deadline">
      {w === 'delivered' ? (
        due ? (
          <>It was due within {hours} hours of payment, by {due}, your time.</>
        ) : (
          <>It was due within {hours} hours of payment.</>
        )
      ) : due ? (
        <>It arrives within {hours} hours of payment, so by {due}, your time.</>
      ) : (
        <>It arrives within {hours} hours of payment.</>
      )}
    </p>
  )

  /* — recording row (only if bought; never shares a sentence with the written row) —
     T8: production has no audio status yet; a bought recording reads as 'paid' until
     the entitlement carries a state. */
  let audioRow: React.ReactNode = null
  if (audioBought) {
    const a: PlainState = 'paid'
    const audioLines: Record<PlainState, React.ReactNode> = {
      paid: 'It is recorded after the written reading is finished, and delivered separately, by the same deadline.',
      processing: 'Marcus is recording it now. It is delivered separately, by the same deadline.',
      ready: <>It is on its way to {email}, separately from the written reading.</>,
      delivered: <>It was sent to {email}, separately from the written reading.</>,
      failed:
        'We hit a problem recording it. Your payment is safe and your written reading is not affected. We will email you when it is fixed.',
    }
    audioRow = <StatusRow id="audio-status" piece="Recording" state={a} line={audioLines[a]} />
  }

  /* — the ledger, last and quiet — */
  const bump = order.bumpCents > 0
  const covers = ['your written reading']
    .concat(bump ? ['its 12-hour delivery'] : [])
    .concat(audioBought ? ['the recording'] : [])
  const coversText =
    covers.length === 1 ? covers[0] : `${covers.slice(0, -1).join(', ')} and ${covers[covers.length - 1]}`

  return (
    <section className="review thanks">
      <h1>{name ? `Thank you, ${name}.` : 'Thank you.'}</h1>
      {order.edition?.question ? <blockquote className="question">{order.edition.question}</blockquote> : null}

      <section className="status" aria-labelledby="status-title">
        <p className="label" id="status-title">
          Where things stand
        </p>
        <StatusRow piece="Written reading" state={w} line={writtenLines[w]} extra={deadlineLine} />
        {audioRow}
      </section>

      <dl className="facts">
        <div>
          <dt className="label">Delivery email</dt>
          <dd id="delivery-email">{emailText}</dd>
        </div>
      </dl>
      {/* 02 T5 — the way out of a wrong address. NEW COPY, needs a cold read. */}
      <p className="fix-email">
        Wrong address? Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we will correct it.
      </p>

      <section className="ledger-block" aria-labelledby="ledger-title">
        <p className="label" id="ledger-title">
          What you paid
        </p>
        <div className="ledger-rows">
          <div className="ledger-row">
            <span>Personal reading</span>
            <span className="num">{formatUsd(order.readingCents)}</span>
          </div>
          {bump ? (
            <div className="ledger-row">
              <span>12-hour delivery</span>
              <span className="num">+ {formatUsd(order.bumpCents)}</span>
            </div>
          ) : null}
          {audioBought ? (
            <div className="ledger-row">
              <span>Recording</span>
              <span className="num">+ {formatUsd(order.audio.priceCents)}</span>
            </div>
          ) : null}
          <div className="ledger-total" id="order-total">
            <span>Total</span>
            <span className="num">{formatUsd(order.amountCents)}</span>
          </div>
        </div>
        <p className="ledger-note">This covers {coversText}.</p>
        {audioBought ? (
          <p className="ledger-note">
            It was paid as two separate payments, the reading first and then the recording, so your card
            statement may show two lines.
          </p>
        ) : null}
        <p className="ledger-note">Reference {order.reference}</p>
      </section>
    </section>
  )
}
