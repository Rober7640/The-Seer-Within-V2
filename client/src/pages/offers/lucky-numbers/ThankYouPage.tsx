// Offer 12 — Lucky Numbers: the receipt page (/numerology/lucky-numbers/success?s=<session>).
//
// Copy spec: improve-v1/v1-one-time-BEs/docs/12/booking-page/12-T1-thank-you-page.md
// Lookup + poll + state rules: lib/luckyNumbersReceipt.ts (tested there).
//
// ⚠ A RECEIPT (P7): confirm, name the email title, stop. It sells nothing. ⛔ No chat gift: 11's
// was an operator exception for 11 alone. ⛔ No price on this page.
//
// Reached from OffersUpsell2 as `${successPath}?s=<session_id>`. The order is fetched with
// ?offer=lucky-numbers, so another offer's session gets a 404 — and the page re-checks the offer
// anyway. Anything not verified as THIS paid order shows the fallback: no receipt lines, no P.S.
//
// ⛔ Timing (12-T1 build notes): only "within 24 hours". No times of day.

import { useEffect, useState } from 'react'
import { useSearch } from 'wouter'
import { CheckCircle, Loader2 } from 'lucide-react'
import { CosmicBackground } from '@/components/CosmicBackground'
import { CHECKOUT, forgetIntake } from '@/lib/luckyNumbersBooking'
import {
  EMAIL_SUBJECTS,
  loadNumbersReceipt,
  receiptFirstName,
  receiptPostscript,
  receiptSessionId,
  type NumbersReceiptState,
  type VerifiedNumbersOrder,
} from '@/lib/luckyNumbersReceipt'

type PageState = NumbersReceiptState | { kind: 'loading' }

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

/** The delivery email's title, in its own box — word for word what 12-T3 and 12-T4 say. */
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

export default function LuckyNumbersThankYouPage() {
  const searchString = useSearch()
  const [state, setState] = useState<PageState>({ kind: 'loading' })

  useEffect(() => {
    document.title = 'Lucky Numbers — thank you | The Seer Within'
    // Her birth details have done their job in this tab.
    forgetIntake()
  }, [])

  useEffect(() => {
    let cancelled = false
    setState({ kind: 'loading' })
    loadNumbersReceipt(receiptSessionId(searchString), { isCancelled: () => cancelled }).then((next) => {
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
  return <VerifiedReceipt order={state.order} />
}

// 12-T1 "Fallback — the order can't be verified". One calm screen for every reason.
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

function VerifiedReceipt({ order }: { order: VerifiedNumbersOrder }) {
  const name = receiptFirstName(order.firstName)
  const postscript = receiptPostscript(order)

  return (
    <Shell>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/30 to-green-600/30">
        <CheckCircle className="h-8 w-8 text-emerald-400" />
      </div>

      <div
        className="w-full rounded-2xl border border-purple-500/30 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-sm md:p-8"
        data-testid="card-thankyou-lucky-numbers"
        data-delivered={order.delivered ? 'true' : 'false'}
      >
        <h1 className="mb-6 text-center font-serif text-3xl text-white" data-testid="text-receipt-heading">
          Thank you, {name}.
        </h1>

        <div className="space-y-5 leading-relaxed text-purple-100/85">
          {order.delivered ? (
            <p>Your numbers are worked out, and your reading's been sent. Look for this title:</p>
          ) : (
            <>
              <p>You asked for your own numbers, and that was the right call.</p>
              <p>Your name and date are on my table now, and I've started.</p>
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

          <p>There's nothing else to do. Leave your PIN as it is till your reading comes.</p>

          <p className="text-[15px]">
            Your confirmation is on its way now, with the subject{' '}
            <strong className="text-white" data-testid="text-subject-confirmed">
              {EMAIL_SUBJECTS.confirmed}
            </strong>
            .
          </p>

          <p className="font-serif text-xl text-white">— Evelyn</p>

          {/* P.S. — ONLY for a verified order that took The Full Year. Otherwise nothing. */}
          {postscript && (
            <p className="rounded-xl border border-amber-300/30 bg-amber-200/5 p-5" data-testid="text-bump-ps">
              {postscript}
            </p>
          )}
        </div>
      </div>
    </Shell>
  )
}
