// Offer 04 — The Turn: the receipt page (/offers/wiccan/tea-reading/success?s=<session>).
//
// Copy spec: improve-v1/v1-one-time-BEs/copy/04/04-T1-thank-you-page.md
// Lookup + poll + state rules: lib/teaReadingReceipt.ts (tested there).
//
// ⚠ A RECEIPT, not an intake (P7): 04 needs nothing from her. Confirm, name the email title,
// stop. Sells nothing. ⛔ No price on this page.
//
// Reached from OffersUpsell2 as `${successPath}?s=<session_id>`. The order is fetched with
// ?offer=tea-reading, so another offer's session gets a 404 — and the page re-checks the offer
// anyway. While Stripe's payment is still settling (402) or the lookup fails, it asks again every
// 2s for up to 40s. Anything not verified as THIS paid order shows the fallback: no receipt lines,
// no bump P.S. ⛔ No receipt names her cup — it is drawn at random at checkout, and the
// reading itself is the reveal (operator 2026-10-11).
//
// ⛔ Timing (04-T1 build notes): only "within 24 hours". Never tonight, by morning, tomorrow or a
// weekday about delivery — a woman who books at 8am would read her reading arrive before "tonight".

import { useEffect, useState } from 'react'
import { useSearch } from 'wouter'
import { CheckCircle, Loader2 } from 'lucide-react'
import { CosmicBackground } from '@/components/CosmicBackground'
import { CHECKOUT } from '@/lib/teaReadingBooking'
import {
  EMAIL_SUBJECTS,
  loadTeaReceipt,
  receiptFirstName,
  receiptPostscript,
  receiptSessionId,
  type TeaReceiptState,
  type VerifiedTeaOrder,
} from '@/lib/teaReadingReceipt'

type PageState = TeaReceiptState | { kind: 'loading' }

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

/** The delivery email's title, in its own box — word for word what 04-T3 and 04-T4 say. */
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

export default function TeaReadingThankYouPage() {
  const searchString = useSearch()
  const [state, setState] = useState<PageState>({ kind: 'loading' })

  useEffect(() => {
    document.title = 'The Turn — thank you | The Seer Within'
  }, [])

  useEffect(() => {
    let cancelled = false
    setState({ kind: 'loading' })
    loadTeaReceipt(receiptSessionId(searchString), { isCancelled: () => cancelled }).then((next) => {
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

// 04-T1 "Fallback — the order can't be verified". One calm screen for every reason.
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

function VerifiedReceipt({ order }: { order: VerifiedTeaOrder }) {
  const name = receiptFirstName(order.firstName)
  const postscript = receiptPostscript(order)

  return (
    <Shell>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/30 to-green-600/30">
        <CheckCircle className="h-8 w-8 text-emerald-400" />
      </div>

      <div
        className="w-full rounded-2xl border border-purple-500/30 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-sm md:p-8"
        data-testid="card-thankyou-tea-reading"
        data-delivered={order.delivered ? 'true' : 'false'}
      >
        <h1 className="mb-6 text-center font-serif text-3xl text-white" data-testid="text-receipt-heading">
          Thank you, {name}.
        </h1>

        <div className="space-y-5 leading-relaxed text-purple-100/85">
          {order.delivered ? (
            <p>Your cup's turned, and your reading's been sent. Look for this title:</p>
          ) : (
            <>
              <p>Your cup's on my table now, and I've started.</p>
              <p>
                Your reading arrives within <strong className="text-white">24 hours</strong>, by email, under
                this title:
              </p>
            </>
          )}

          <TitleBox name={name} />

          <p>That title is only ever used for this, so it's easy to find.</p>

          <p>
            If 24 hours pass and it isn't there, look in your promotions tab first. Then reply to your
            confirmation email, or write to <SupportLink />, and I'll sort it out.
          </p>

          <p>You don't need to send me anything. Nothing else is needed from you while you wait.</p>

          <p className="text-[15px]">
            Your confirmation is on its way now, with the subject{' '}
            <strong className="text-white" data-testid="text-subject-confirmed">
              {EMAIL_SUBJECTS.confirmed}
            </strong>
            .
          </p>

          <p className="font-serif text-xl text-white">— Evelyn</p>

          {/* P.S. — ONLY for a verified order that took the Double Turning. Otherwise nothing.
              ⭐ Intangible: no link, nothing to open — it says so. */}
          {postscript && (
            <p
              className="rounded-xl border border-amber-300/30 bg-amber-200/5 p-5"
              data-testid="text-bump-ps"
            >
              {postscript}
            </p>
          )}
        </div>
      </div>
    </Shell>
  )
}
