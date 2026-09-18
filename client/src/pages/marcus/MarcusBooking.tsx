import { useEffect, useState } from 'react'
import { Link, useRoute } from 'wouter'
import MarcusShell, { MarcusError, formatUsd } from './MarcusShell'
import { marcusAsset } from './assets'
import { BACKEND_CHECKOUT_LIVE } from '@/lib/backendCheckout'
import { getBackendVisitorId } from '@/lib/backendVisitor'
import { getDistinctId, getUTMs, track as trackPH } from '@/lib/posthog'
import { MARCUS_READING_BUMP_CENTS, MARCUS_READING_PRICE_CENTS } from '@shared/backendOffers'
import './booking.css'

// 08 Marcus — the ORDER FORM sheet: page two of the same morning paper.
// Route: /marcus/reading/:editionId (and /marcus/reading with no id → the list of
// readings). Catalog key `marcus-reading` (shared/backendOffers.ts).
//
// PORT of improve-v1/v1-one-time-BEs/local/08-marcus/client/pages/booking.js — the
// locked design (Joel, 2026-09-13). Markup, class names and every customer-facing
// sentence are carried over as written; marcus.css + booking.css style them.
//
// Operator ruling 3 / D5 (2026-09-13), AMENDED 2026-09-14: Stripe's docs forbid personal
// data in Checkout custom fields, so the three personal boxes live HERE, above the pay
// button — ported from local/08-marcus/client/pages/checkout-sim.js (its labels, hints,
// error sentences and the Month · Day · Year memorable-date pattern). Shape:
//   headline → the turned cards in one row → bridge → the table photograph →
//   the face-down positions as a ruled ledger → price + delivery promise → signature →
//   her first name · full birth name · date of birth → speed bump → live total →
//   ONE button to secure payment.
// The button posts { offer, treatment, editionId, bump, displayFirstName, fullBirthName,
// dateOfBirth } to /api/backend/checkout and follows the Stripe URL. Stripe's hosted
// Checkout collects email, card and name on card only.
//
// The three values + the bump sit in sessionStorage (never the URL, never localStorage)
// so a Stripe cancel (`?cancelled=1`) brings the form back as she left it.
//
// ⛔ Posts NO price. The server charges the catalog's. While BACKEND_CHECKOUT_LIVE is
// false the button LOGS and stops (the deck's preview gate, same as 02/03/06).

interface PublicCard { id: string; name: string; image: string }
interface PublicPosition {
  id: string
  number: number
  label: string
  visibility: 'free' | 'paid'
  card?: PublicCard
}
interface BookingCopy { headline: string; intro: string; bridge: string; offer: string; name: string }
interface PublicEdition {
  id: string
  version: number
  slug: string
  question: string
  theme: string
  spread: { id: string; name: string; version: number }
  positions: PublicPosition[]
  bookingCopy: BookingCopy | null
}

const BOOKING_FALLBACK_COPY = {
  intro: 'Continue your personal reading.',
  bridge: 'Let’s continue with the remaining cards.',
  offer: 'I’ll bring the remaining cards together around your question.',
  name: 'I’ll interpret your cards with your personal card’s strengths and habits in mind.',
}
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII']
const WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']

const BOOKING_PRICE = MARCUS_READING_PRICE_CENTS
const BOOKING_BUMP = MARCUS_READING_BUMP_CENTS
const OFFER_ROOT = '/marcus/reading'
const GENERIC_ERROR = 'Please try again.'

const bookingPromise = (h: 12 | 24) =>
  'A written reading, sent as a PDF link to your email within ' + h + ' hours of payment.'

/* $35 when the amount is whole, $47.77 when it is not — one way of writing a price (05 fix 11). */
function bookingMoney(cents: number): string {
  return cents % 100 === 0 ? '$' + cents / 100 : formatUsd(cents)
}

const bumpKey = (editionId: string) => `m8_bump_${editionId}`
function readBump(editionId: string): boolean {
  try { return sessionStorage.getItem(bumpKey(editionId)) === '1' } catch { return false }
}
function writeBump(editionId: string, on: boolean) {
  try { sessionStorage.setItem(bumpKey(editionId), on ? '1' : '0') } catch { /* per-browser convenience only */ }
}

// ── her details (checkout-sim's fields) ──────────────────────────────────────────
// Month · Day · Year as three boxes (review 05 §4, GOV.UK memorable-date pattern), kept
// as typed until submit, then combined to YYYY-MM-DD.
interface Intake { firstName: string; birthName: string; month: string; day: string; year: string }
const EMPTY_INTAKE: Intake = { firstName: '', birthName: '', month: '', day: '', year: '' }
type IntakeErrors = Partial<Record<'firstName' | 'birthName' | 'dob', string>>

const intakeKey = (editionId: string) => `m8_intake_${editionId}`
function readIntake(editionId: string): Intake {
  try {
    const raw = sessionStorage.getItem(intakeKey(editionId))
    if (!raw) return EMPTY_INTAKE
    const v = JSON.parse(raw) as Partial<Intake>
    const s = (x: unknown) => (typeof x === 'string' ? x : '')
    return { firstName: s(v.firstName), birthName: s(v.birthName), month: s(v.month), day: s(v.day), year: s(v.year) }
  } catch { return EMPTY_INTAKE }
}
function writeIntake(editionId: string, intake: Intake) {
  try { sessionStorage.setItem(intakeKey(editionId), JSON.stringify(intake)) } catch { /* per-browser convenience only */ }
}

/* Combine the three boxes; return {value} or {error}. Validate on submit only (05 §4).
   checkout-sim's three sentences, then the calendar check the server also runs. */
function dateOfBirthFromBoxes(month: string, day: string, year: string): { value: string } | { error: string } {
  const m = month.trim(), d = day.trim(), y = year.trim()
  if (!/^\d{1,2}$/.test(m) || +m < 1 || +m > 12) return { error: 'enter the month as a number from 1 to 12.' }
  if (!/^\d{1,2}$/.test(d) || +d < 1 || +d > 31) return { error: 'enter the day as a number from 1 to 31.' }
  if (!/^\d{4}$/.test(y)) return { error: 'the year should have four numbers, for example 1961.' }
  const date = new Date(Date.UTC(+y, +m - 1, +d))
  if (date.getUTCMonth() !== +m - 1 || date.getUTCDate() !== +d) {
    return { error: 'that month does not have that many days — please check the day.' }
  }
  return { value: y + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0') }
}

class ApiError extends Error {
  code?: string
  constructor(message: string, code?: string) { super(message); this.code = code }
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const v = (await r.json().catch(() => ({}))) as T & { error?: string; code?: string }
  if (!r.ok) throw new ApiError(v.error || GENERIC_ERROR, v.code)
  return v
}

/* Face-up cards get an ink frame and a FIG. numeral; face-down get a hairline frame and a word. */
function UpFigure({ position, fig }: { position: PublicPosition; fig: number }) {
  const name = position.card?.name ?? position.card?.id ?? ''
  const word = WORDS[position.number - 1] || String(position.number)
  return (
    <figure className="up">
      <span className="cut">
        <img
          className="tarot"
          src={marcusAsset(position.card?.image ?? position.card?.id ?? 'back')}
          width={350}
          height={600}
          alt={name}
        />
      </span>
      <figcaption className="fig">
        <span className="position fig-no">
          <span className="figno">Fig. {ROMAN[fig] || String(fig + 1)} · </span>Position {word}
        </span>
        <div className="fig-pos">{position.label}</div>
        <span className="card-name fig-name">{name}</span>
      </figcaption>
    </figure>
  )
}

function DownFigure({ position }: { position: PublicPosition }) {
  const word = WORDS[position.number - 1] || String(position.number)
  return (
    <li>
      <figure className="down">
        <span className="cut">
          <img className="tarot" src={marcusAsset('back')} width={350} height={600} alt="Card still face down" />
        </span>
        <figcaption className="fig">
          <span className="position fig-no">Position {word}</span>
          <div className="fig-pos">{position.label}</div>
        </figcaption>
      </figure>
    </li>
  )
}

/* checkout-sim's coSetError: the message ABOVE the input, below the label, prefixed "Error:". */
function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <span className="field-error" id={id} hidden={!message}>
      {message ? 'Error: ' + message : ''}
    </span>
  )
}

type Screen =
  | { kind: 'loading' }
  | { kind: 'list'; editions: PublicEdition[] }
  | { kind: 'edition'; edition: PublicEdition }
  | { kind: 'error'; message: string }

export default function MarcusBooking() {
  const [, params] = useRoute<{ editionId: string }>(`${OFFER_ROOT}/:editionId`)
  const editionId = params?.editionId ?? null
  const cancelled =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('cancelled') === '1'

  const [screen, setScreen] = useState<Screen>({ kind: 'loading' })
  const [sameDay, setSameDay] = useState(false)
  const [intake, setIntake] = useState<Intake>(EMPTY_INTAKE)
  const [fieldErrors, setFieldErrors] = useState<IntakeErrors>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hero, setHero] = useState<'pending' | 'shown' | 'gone'>('pending')
  const [sigFailed, setSigFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setScreen({ kind: 'loading' })
    setError(null)
    setFieldErrors({})
    setHero('pending')
    window.scrollTo(0, 0)
    const load = async () => {
      if (!editionId) {
        const { editions } = await api<{ editions: PublicEdition[] }>('/api/backend/marcus/editions')
        if (alive) setScreen({ kind: 'list', editions })
        return
      }
      const { edition } = await api<{ edition: PublicEdition }>(
        `/api/backend/marcus/editions/${encodeURIComponent(editionId)}`,
      )
      if (!alive) return
      // Her bump choice and the three boxes survive the Stripe round-trip (the local app
      // kept them on S.intake).
      if (cancelled) {
        setSameDay(readBump(editionId))
        setIntake(readIntake(editionId))
      }
      setScreen({ kind: 'edition', edition })
    }
    load().catch((e: unknown) => {
      if (!alive) return
      setScreen({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    })
    return () => { alive = false }
    // `cancelled` is read from the URL at mount; a re-run on it would only re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editionId])

  const toggleBump = (on: boolean) => {
    setSameDay(on)
    if (editionId) writeBump(editionId, on)
  }

  const setField = (key: keyof Intake, value: string) => {
    setIntake((prev) => {
      const next = { ...prev, [key]: value }
      if (editionId) writeIntake(editionId, next)
      return next
    })
    // Typing clears the field's own error (checkout-sim's `input → clearError`).
    const errKey: keyof IntakeErrors = key === 'firstName' ? 'firstName' : key === 'birthName' ? 'birthName' : 'dob'
    if (fieldErrors[errKey]) setFieldErrors((prev) => ({ ...prev, [errKey]: undefined }))
    if (error) setError(null)
  }

  const filled =
    intake.firstName.trim() !== '' &&
    intake.birthName.trim() !== '' &&
    intake.month.trim() !== '' &&
    intake.day.trim() !== '' &&
    intake.year.trim() !== ''

  const handleCheckout = async (edition: PublicEdition) => {
    if (busy) return
    setError(null)

    // Mark every bad field, focus the first (05 §4 error placement). checkout-sim's rules.
    const displayFirstName = intake.firstName.replace(/\s+/g, ' ').trim()
    const fullBirthName = intake.birthName.replace(/\s+/g, ' ').trim()
    const dob = dateOfBirthFromBoxes(intake.month, intake.day, intake.year)
    const problems: IntakeErrors = {}
    if (!displayFirstName) problems.firstName = 'please enter your first name.'
    if (!/\S\s+\S/.test(fullBirthName)) problems.birthName = 'please enter your first and last name as it is on your birth certificate.'
    if ('error' in dob) problems.dob = dob.error
    if (problems.firstName || problems.birthName || problems.dob) {
      setFieldErrors(problems)
      const first = problems.firstName ? 'first-name' : problems.birthName ? 'birth-name' : 'dob-month'
      const el = document.getElementById(first)
      el?.focus()
      el?.scrollIntoView({ block: 'center' })
      return
    }
    const dateOfBirth = (dob as { value: string }).value

    setBusy(true)
    const totalCents = sameDay ? BOOKING_PRICE + BOOKING_BUMP : BOOKING_PRICE
    trackPH('checkout_initiated', {
      // The funnel identifier must match the server's purchase_completed value
      // (BACKEND_FUNNEL['marcus-reading'] = 'marcusreading') so the whole Marcus funnel
      // filters as ONE in PostHog — the same convention Twin Flame uses ('twinflame').
      funnel: 'marcusreading',
      step: 'booking',
      product: 'be_marcus_reading',
      price_cents: totalCents,
      bump: sameDay,
      treatment: 'page',
      edition_id: edition.id,
      edition_version: edition.version,
    })
    if (!BACKEND_CHECKOUT_LIVE) {
      // The deck's preview behaviour (lib/backendCheckout.ts): log and stop. ⚠ No PII in
      // the log — only that the three were present.
      console.log('[preview] would checkout', {
        offer: 'marcus-reading',
        treatment: 'page',
        editionId: edition.id,
        bump: sameDay,
        fields: { displayFirstName: true, fullBirthName: true, dateOfBirth: true },
      })
      setBusy(false)
      return
    }
    try {
      const { url } = await api<{ url: string }>('/api/backend/checkout', {
        offer: 'marcus-reading',
        treatment: 'page',
        editionId: edition.id,
        bump: sameDay,
        // What Marcus needs before he can read her (D5 as amended 2026-09-14). Parked on
        // be_order_intake server-side; never on the URL, never on Stripe metadata.
        displayFirstName,
        fullBirthName,
        dateOfBirth,
        // Same attribution body lib/backendCheckout.ts sends for the other offers.
        expSubject: getBackendVisitorId(),
        posthogDistinctId: getDistinctId(),
        utm: getUTMs(),
      })
      if (!url) throw new Error(GENERIC_ERROR)
      // The button stays disabled — the tab is on its way out, and a re-enabled button
      // is a second charge waiting to happen.
      window.location.href = url
    } catch (e: unknown) {
      // A 400 about one of the three boxes lands on that box (the server's own words);
      // anything else is the page-level error.
      const code = e instanceof ApiError ? e.code ?? '' : ''
      const message = e instanceof Error ? e.message : GENERIC_ERROR
      if (code.startsWith('dob')) setFieldErrors({ dob: message })
      else if (code.startsWith('birth_name')) setFieldErrors({ birthName: message })
      else if (code.startsWith('first_name')) setFieldErrors({ firstName: message })
      else setError(message)
      setBusy(false)
    }
  }

  if (screen.kind === 'loading') {
    return (
      <MarcusShell dateline="Order form">
        <MarcusError message={null} />
      </MarcusShell>
    )
  }

  if (screen.kind === 'error') {
    return (
      <MarcusShell dateline="Order form">
        <h1>Let’s find your reading.</h1>
        <p className="bridge">
          This link could not be loaded.{' '}
          <Link href={OFFER_ROOT} className="text-link">Choose a reading</Link>.
        </p>
        <MarcusError message={screen.message} />
      </MarcusShell>
    )
  }

  if (screen.kind === 'list') {
    return (
      <MarcusShell dateline="Order form">
        <h1>Choose a reading.</h1>
        <div className="daily-links">
          {screen.editions.map((e) => (
            <Link key={`${e.id}-${e.version}`} href={`${OFFER_ROOT}/${encodeURIComponent(e.id)}`} className="text-link">
              {e.question}
            </Link>
          ))}
        </div>
        <MarcusError message={null} />
      </MarcusShell>
    )
  }

  const e = screen.edition
  const c: BookingCopy = e.bookingCopy ?? { headline: e.question, ...BOOKING_FALLBACK_COPY }
  const upPositions = e.positions.filter((p) => p.visibility === 'free')
  const downPositions = e.positions.filter((p) => p.visibility !== 'free')
  const up = upPositions.length
  const down = downPositions.length
  const heroUrl = marcusAsset('08-hero-' + e.slug)
  const totalCents = sameDay ? BOOKING_PRICE + BOOKING_BUMP : BOOKING_PRICE
  const buttonLabel = 'Continue to secure payment — ' + bookingMoney(totalCents)
  const note =
    'Personal reading ' + bookingMoney(BOOKING_PRICE) + (sameDay ? ' + 12-hour delivery ' + bookingMoney(BOOKING_BUMP) : '')
  const dobInvalid = fieldErrors.dob ? true : undefined

  return (
    <MarcusShell dateline="Order form">
      <div className="intro">
        <h1>{c.headline}</h1>
        <p className="lead">{c.intro}</p>
      </div>
      {cancelled && (
        <p className="resume" role="status">
          You came back. Nothing has been charged — your order below is as you left it.
        </p>
      )}
      <div className="up-cards" style={{ '--n': up } as React.CSSProperties} aria-label="The cards already turned">
        {upPositions.map((p, i) => (
          <UpFigure key={p.id} position={p} fig={i} />
        ))}
      </div>
      <section className="remaining">
        <h2>What we’ll look at next</h2>
        <div className="bridge">{c.bridge}</div>
        {/* the table photograph: shown only once it has loaded; a 404 leaves no hole */}
        {hero !== 'gone' && (
          <figure className="table" hidden={hero !== 'shown'}>
            <img
              src={heroUrl}
              width={1200}
              height={800}
              alt="The cards as they lie on the table"
              onLoad={(ev) => { if (ev.currentTarget.naturalWidth > 0) setHero('shown') }}
              onError={() => setHero('gone')}
            />
            <figcaption>
              <span className="label ink">
                <span className="figno">Fig. {ROMAN[up] || String(up + 1)} · </span>The table
              </span>{' '}
              — as the cards lie this morning.
            </figcaption>
          </figure>
        )}
        <ol
          className="down-cards ledger-down"
          style={{ '--rows': Math.ceil(down / 2) } as React.CSSProperties}
          aria-label="The positions still face down"
        >
          {downPositions.map((p) => (
            <DownFigure key={p.id} position={p} />
          ))}
        </ol>
      </section>
      <section className="offer">
        <div className="price-row">
          <h2>Your personal reading</h2>
          <span className="price num">{bookingMoney(BOOKING_PRICE)}</span>
        </div>
        <p className="delivery">{bookingPromise(sameDay ? 12 : 24)}</p>
        <p className="offer-copy">{c.offer}</p>
        {/* the ask is stated once, by the edition's own copy (cold-read gated per edition) */}
        <p className="name-note">{c.name}</p>
        <div className="sig-row">
          {sigFailed ? (
            <span className="sig-name">Marcus Stone</span>
          ) : (
            <img
              className="sig"
              src={marcusAsset('08-signature')}
              width={560}
              height={185}
              alt="Marcus Stone"
              onError={() => setSigFailed(true)}
            />
          )}
        </div>
        {/* her details — checkout-sim's three fields, above the pay button (D5 amended 2026-09-14) */}
        <div className="intake" aria-label="Your details">
          <div className="field" id="field-first-name">
            <label htmlFor="first-name">First name</label>
            <span className="hint">I’ll use your first name when I write to you.</span>
            <FieldError id="first-name-error" message={fieldErrors.firstName} />
            <input
              id="first-name"
              name="first-name"
              type="text"
              autoComplete="given-name"
              autoCapitalize="words"
              maxLength={60}
              value={intake.firstName}
              onChange={(ev) => setField('firstName', ev.currentTarget.value)}
              aria-invalid={fieldErrors.firstName ? true : undefined}
              aria-describedby={fieldErrors.firstName ? 'first-name-error' : undefined}
              data-testid="input-first-name"
            />
          </div>
          <div className="field" id="field-birth-name">
            <label htmlFor="birth-name">Your first and last name on your birth certificate</label>
            <span className="hint">
              If you married and changed your name, use your maiden name. This is how I find your personal card.
            </span>
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
              data-testid="input-birth-name"
            />
          </div>
          <div className="field" id="field-dob">
            <label htmlFor="dob-month">Your date of birth</label>
            <span className="hint">For example, 03 14 1961</span>
            <FieldError id="dob-error" message={fieldErrors.dob} />
            <div className="dob">
              <div>
                <label htmlFor="dob-month">Month</label>
                <input
                  id="dob-month"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  autoComplete="bday-month"
                  placeholder="MM"
                  value={intake.month}
                  onChange={(ev) => setField('month', ev.currentTarget.value)}
                  aria-invalid={dobInvalid}
                  aria-describedby={dobInvalid ? 'dob-error' : undefined}
                  data-testid="input-dob-month"
                />
              </div>
              <div>
                <label htmlFor="dob-day">Day</label>
                <input
                  id="dob-day"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  autoComplete="bday-day"
                  placeholder="DD"
                  value={intake.day}
                  onChange={(ev) => setField('day', ev.currentTarget.value)}
                  aria-invalid={dobInvalid}
                  data-testid="input-dob-day"
                />
              </div>
              <div className="year">
                <label htmlFor="dob-year">Year</label>
                <input
                  id="dob-year"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoComplete="bday-year"
                  placeholder="YYYY"
                  value={intake.year}
                  onChange={(ev) => setField('year', ev.currentTarget.value)}
                  aria-invalid={dobInvalid}
                  data-testid="input-dob-year"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="booking-bump insert">
          <span className="review-label">Optional speed upgrade</span>
          <div className="price-row">
            <h3>Receive it within 12 hours</h3>
            <span className="summary-price add num">+{bookingMoney(BOOKING_BUMP)}</span>
          </div>
          <p className="extra-desc">
            Your written reading normally arrives within 24 hours of payment. Add this to receive it within 12 hours.
          </p>
          <label className="check" htmlFor="same-day">
            <input
              type="checkbox"
              id="same-day"
              checked={sameDay}
              onChange={(ev) => toggleBump(ev.currentTarget.checked)}
            />
            <span>Yes, prepare my reading within 12 hours — add {bookingMoney(BOOKING_BUMP)}</span>
          </label>
        </div>
        <div className="total booking-total">
          <span>
            Total <small className="cur">USD</small>
          </span>
          <strong className="num" aria-live="polite" data-testid="text-total">
            {bookingMoney(totalCents)}
          </strong>
        </div>
        <p className="total-note">{note}</p>
        <button
          type="button"
          className="primary submit"
          disabled={busy || !filled}
          aria-busy={busy || undefined}
          onClick={() => handleCheckout(e)}
          data-testid="button-checkout"
        >
          {buttonLabel}
        </button>
        <MarcusError message={error} />
        <p className="under">Name, email and card details are taken on the secure payment page.</p>
      </section>
    </MarcusShell>
  )
}
