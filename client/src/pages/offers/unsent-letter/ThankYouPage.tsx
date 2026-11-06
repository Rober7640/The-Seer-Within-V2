// Offer 11 — The Unsent Letter: the receipt page (/tarot/unsent-letter/success?s=<session>).
//
// Copy spec: improve-v1/v1-one-time-BEs/docs/11/booking-page/11-T1-thank-you-page.md
// Lookup + poll + state rules: lib/unsentLetterReceipt.ts (tested there).
//
// ⚠ A RECEIPT (P7): confirm, name the email title, stop. It sells nothing, and the ONE exception
// is the operator's free chat gift under it (11-T1, this offer only). ⛔ No price on this page.
//
// Reached from OffersUpsell2 as `${successPath}?s=<session_id>`. The order is fetched with
// ?offer=unsent-letter, so another offer's session gets a 404 — and the page re-checks the offer
// anyway. Anything not verified as THIS paid order shows the fallback: no receipt lines, no P.S.
//
// ⛔ Timing (11-T1 build notes): only "within 24 hours". No times of day: delivery lands at any hour.

import { useEffect, useState } from 'react'
import { useSearch } from 'wouter'
import { CheckCircle, Loader2, Sparkles } from 'lucide-react'
import { CosmicBackground } from '@/components/CosmicBackground'
import { CHECKOUT, forgetIntake } from '@/lib/unsentLetterBooking'
import {
  EMAIL_SUBJECTS,
  LETTER_GIFT,
  letterGiftLine,
  loadLetterGiftHref,
  loadLetterReceipt,
  receiptFirstName,
  receiptPostscript,
  receiptSessionId,
  type LetterReceiptState,
  type VerifiedLetterOrder,
} from '@/lib/unsentLetterReceipt'

type PageState = LetterReceiptState | { kind: 'loading' }

const SUPPORT_EMAIL = CHECKOUT.supportEmail

function SupportLink() {
  return (
    <a
      href={`mailto:${SUPPORT_EMAIL}`}
      className="text-amber-300 underline underline-offset-4 hover:text-amber-200"
      data-testid="link-support"
    >
      {SUPPORT_EMAIL}
    </a>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden px-4 py-10">
      <CosmicBackground />
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-6">{children}</div>
    </div>
  )
}

/** The delivery email's title, in its own box — word for word what 11-T3 and 11-T4 say. */
function TitleBox({ name }: { name: string }) {
  return (
    <p
      className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center font-serif text-xl text-white"
      data-testid="text-delivery-title"
    >
      {EMAIL_SUBJECTS.delivered(name)}
    </p>
  )
}

export default function UnsentLetterThankYouPage() {
  const searchString = useSearch()
  const [state, setState] = useState<PageState>({ kind: 'loading' })

  useEffect(() => {
    document.title = 'The Unsent Letter — thank you | The Seer Within'
    // Her birth details have done their job in this tab.
    forgetIntake()
  }, [])

  useEffect(() => {
    let cancelled = false
    setState({ kind: 'loading' })
    loadLetterReceipt(receiptSessionId(searchString), { isCancelled: () => cancelled }).then((next) => {
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [searchString])

  if (state.kind === 'loading') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-24" data-testid="receipt-loading" role="status">
          <Loader2 className="h-8 w-8 animate-spin text-purple-300" aria-hidden="true" />
          <span className="text-sm text-purple-100/80">Confirming your order.</span>
        </div>
      </Shell>
    )
  }

  if (state.kind === 'unverified') return <FallbackReceipt reason={state.reason} />
  return <VerifiedReceipt order={state.order} sessionId={receiptSessionId(searchString)} />
}

// 11-T1 "Fallback — the order can't be verified". One calm screen for every reason.
function FallbackReceipt({ reason }: { reason: string }) {
  return (
    <Shell>
      <div
        className="w-full rounded-2xl border border-purple-500/30 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-sm md:p-8"
        data-testid="card-receipt-fallback"
        data-reason={reason}
      >
        <h1 className="mb-6 text-center font-serif text-3xl text-white">Thank you, dear.</h1>
        <div className="space-y-5 leading-relaxed text-purple-100/85">
          <p>
            I can't show your order on this page just now. Your confirmation email has the details, with the
            subject <strong className="text-white">{EMAIL_SUBJECTS.confirmed}</strong>.
          </p>
          <p>
            If it hasn't come, write to <SupportLink /> and someone will find your order.
          </p>
          <p className="font-serif text-xl text-white">— Evelyn</p>
        </div>
      </div>
    </Shell>
  )
}

// 11-T1 "The gift". Verified orders only, and only once the link is real: if the handoff fails,
// nothing shows, and the receipt stands on its own.
function LetterGift({ order, sessionId }: { order: VerifiedLetterOrder; sessionId: string | null }) {
  const [href, setHref] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    loadLetterGiftHref(sessionId).then((next) => {
      if (!cancelled) setHref(next)
    })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  if (!href) return null

  return (
    <div
      className="w-full rounded-2xl border border-purple-500/30 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-sm md:p-8"
      data-testid="card-letter-gift"
    >
      <p className="mb-5 leading-relaxed text-purple-100/85" data-testid="text-gift-line">
        {letterGiftLine(order)}
      </p>

      {/* The same ticket as SuccessPage's, so the gift looks like the gift it is. */}
      <div className="mb-5 flex items-stretch overflow-hidden rounded-xl border border-amber-300/50 bg-gradient-to-br from-amber-400/20 via-yellow-300/10 to-amber-500/20">
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-amber-400/25 to-yellow-500/15 px-4 py-4">
          <span className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80">{LETTER_GIFT.stubLabel}</span>
          <span className="whitespace-nowrap font-serif text-3xl font-bold leading-none text-amber-100">
            {LETTER_GIFT.stubAmount}
          </span>
        </div>
        <div className="relative flex flex-col items-center">
          <span className="-mt-1.5 h-3 w-3 rounded-full bg-slate-900" />
          <span className="flex-1 border-l-2 border-dashed border-amber-200/50" />
          <span className="-mb-1.5 h-3 w-3 rounded-full bg-slate-900" />
        </div>
        <div className="min-w-0 flex-1 px-4 py-3 text-left">
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80">{LETTER_GIFT.eyebrow}</span>
          </div>
          <p className="text-sm font-semibold leading-tight text-white">{LETTER_GIFT.title}</p>
          <p className="mt-0.5 text-xs text-amber-100/70">{LETTER_GIFT.withName}</p>
        </div>
      </div>

      <a
        href={href}
        className="block w-full rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-3 text-center font-medium text-white transition-colors hover:from-purple-400 hover:to-indigo-400"
        data-testid="link-letter-gift"
      >
        {LETTER_GIFT.button} &nbsp;→
      </a>
    </div>
  )
}

function VerifiedReceipt({ order, sessionId }: { order: VerifiedLetterOrder; sessionId: string | null }) {
  const name = receiptFirstName(order.firstName)
  const postscript = receiptPostscript(order)

  return (
    <Shell>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/30 to-green-600/30">
        <CheckCircle className="h-8 w-8 text-emerald-400" />
      </div>

      <div
        className="w-full rounded-2xl border border-purple-500/30 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-sm md:p-8"
        data-testid="card-thankyou-unsent-letter"
        data-delivered={order.delivered ? 'true' : 'false'}
      >
        <h1 className="mb-6 text-center font-serif text-3xl text-white" data-testid="text-receipt-heading">
          Thank you, {name}.
        </h1>

        <div className="space-y-5 leading-relaxed text-purple-100/85">
          {order.delivered ? (
            <p>It's written out, and your reading's been sent. Look for this title:</p>
          ) : (
            <>
              <p>They've had it long enough, and you said so.</p>
              <p>Your twelve are on my table now, and I've started.</p>
              <p>
                Your reading arrives within <strong className="text-white">24 hours</strong>, by email, under
                this title:
              </p>
            </>
          )}

          <TitleBox name={name} />

          <p>
            If 24 hours pass and it isn't there, look in your promotions tab first. Then reply to your
            confirmation email, or write to <SupportLink />, and I'll sort it out.
          </p>

          <p>There's nothing else to do. You don't write to anyone.</p>

          <p className="text-[15px]">
            Your confirmation is on its way now, with the subject{' '}
            <strong className="text-white" data-testid="text-subject-confirmed">
              {EMAIL_SUBJECTS.confirmed}
            </strong>
            .
          </p>

          <p className="font-serif text-xl text-white">— Evelyn</p>

          {/* P.S. — ONLY for a verified order that took Closing the Door. Otherwise nothing. */}
          {postscript && (
            <p className="rounded-xl border border-amber-300/30 bg-amber-200/5 p-5" data-testid="text-bump-ps">
              {postscript}
            </p>
          )}
        </div>
      </div>

      <LetterGift order={order} sessionId={sessionId} />
    </Shell>
  )
}
