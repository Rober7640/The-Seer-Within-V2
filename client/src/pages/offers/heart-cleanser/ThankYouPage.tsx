// Offer 09 — the Heart Cleanser Love Charm: the receipt page.
//
// Copy spec: improve-v1/v1-one-time-BEs/docs/09/booking-page/09-T1-thank-you-page.md
// Lookup + state rules: lib/heartCleanserReceipt.ts (tested there).
//
// ⚠ A RECEIPT, not an intake (P7): she gave no reply and nothing is being written for
// her; a charm is being packed and shipped. Sells nothing. No reading language.
//
// Reached from OffersUpsell2 as `${successPath}?s=<session_id>`. The order is fetched
// with ?offer=heart-cleanser, so another offer's session gets a 404 — and the page
// re-checks the offer anyway. Anything not verified as THIS order (no ?s=, 404, 402,
// 5xx, offline) shows 09-T1's fallback: no receipt lines, no amount, no address.

import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { CheckCircle, Loader2, Mail, Package } from "lucide-react";
import { CosmicBackground } from "@/components/CosmicBackground";
import { CHECKOUT } from "@/lib/heartCleanserBooking";
import {
  EMAIL_SUBJECTS,
  RECEIPT_BUMP_LINE,
  RECEIPT_PAID_LABEL,
  loadHeartCleanserReceipt,
  receiptFirstName,
  type ReceiptState,
  type VerifiedReceiptOrder,
} from "@/lib/heartCleanserReceipt";

type PageState = ReceiptState | { kind: "loading" };

const SUPPORT_EMAIL = CHECKOUT.supportEmail;
const REFUND_HREF = CHECKOUT.refundHref;

function SupportLink() {
  return (
    <a
      href={`mailto:${SUPPORT_EMAIL}`}
      className="text-amber-300 underline underline-offset-4 hover:text-amber-200"
      data-testid="link-support"
    >
      {SUPPORT_EMAIL}
    </a>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-x-hidden px-4 py-10">
      <CosmicBackground />
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-xl w-full">{children}</div>
    </div>
  );
}

export default function HeartCleanserThankYouPage() {
  const searchString = useSearch();
  const [state, setState] = useState<PageState>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    setState({ kind: "loading" });
    const sessionId = new URLSearchParams(searchString).get("s");
    loadHeartCleanserReceipt(sessionId).then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [searchString]);

  if (state.kind === "loading") {
    return (
      <Shell>
        <div className="py-24" data-testid="receipt-loading" role="status">
          <Loader2 className="w-8 h-8 text-purple-300 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading your order</span>
        </div>
      </Shell>
    );
  }

  if (state.kind === "unverified") {
    return <FallbackReceipt reason={state.reason} />;
  }

  return <VerifiedReceipt order={state.order} />;
}

// 09-T1 "Fallback — the order can't be verified". One calm screen for every reason.
function FallbackReceipt({ reason }: { reason: string }) {
  return (
    <Shell>
      <div
        className="bg-slate-900/80 backdrop-blur-sm border border-purple-500/30 rounded-2xl shadow-2xl p-6 md:p-8 w-full"
        data-testid="card-receipt-fallback"
        data-reason={reason}
      >
        <h1 className="font-serif text-3xl text-white mb-6 text-center">Thank you, dear.</h1>
        <div className="space-y-5 text-purple-100/85 leading-relaxed">
          <p>
            I can't show your order details on this page just now. Your confirmation email has
            them, with the subject{" "}
            <strong className="text-white">{EMAIL_SUBJECTS.confirmed}</strong>.
          </p>
          <p>
            If it hasn't arrived, write to <SupportLink /> and we'll look it up for you.
          </p>
          <p className="font-serif text-xl text-white">— Evelyn</p>
        </div>
      </div>
    </Shell>
  );
}

function VerifiedReceipt({ order }: { order: VerifiedReceiptOrder }) {
  const firstName = receiptFirstName(order.firstName);

  return (
    <Shell>
      <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/30 to-green-600/30 rounded-full flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-emerald-400" />
      </div>

      <div
        className="bg-slate-900/80 backdrop-blur-sm border border-purple-500/30 rounded-2xl shadow-2xl p-6 md:p-8 w-full"
        data-testid="card-thankyou-heart-cleanser"
      >
        {/* BEAT 1 — confirms the order and the item, not just her name. */}
        <h1 className="font-serif text-3xl text-white mb-6 text-center">
          Thank you, {firstName}. Your Heart Cleanser Love Charm is ordered.
        </h1>

        <div className="space-y-6 text-purple-100/85 leading-relaxed">
          {/* BEAT 2 — thanks as her good judgement. */}
          <p>
            You chose to make room for your own wish, and you didn't put it off for another day.
            I'm glad you did.
          </p>

          {/* BEAT 3 — what happens now: packing and shipping. */}
          <p>
            Here's what happens now. We pack your charm in its gift box, with its wish papers and
            its card, and ship it within 2 business days.
          </p>

          {/* BEAT 4 — the receipt lines (09's checklist asks for the amount). */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/10" data-testid="block-receipt">
            <h2 className="font-serif text-xl text-white mb-3">Your receipt</h2>
            <p>
              <strong className="text-white">Order:</strong> one Heart Cleanser Love Charm
            </p>
            <p className="mt-1">
              <strong className="text-white">Paid:</strong> {RECEIPT_PAID_LABEL}
            </p>
            {/* BEAT 4b — ONLY for a verified order that took the 09-C3 bump. Otherwise nothing. */}
            {order.bumpPurchased && RECEIPT_BUMP_LINE && (
              <p className="mt-1" data-testid="text-receipt-bump">
                <strong className="text-white">{RECEIPT_BUMP_LINE.label}</strong> {RECEIPT_BUMP_LINE.text}
              </p>
            )}
          </div>

          {/* BEAT 5 — what's in the box. The operator's settled list, nothing added. */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/10">
            <h2 className="flex items-center gap-3 mb-3">
              <Package className="w-5 h-5 text-purple-300 shrink-0" />
              <span className="text-white font-serif text-xl">What's in the box</span>
            </h2>
            <ul className="space-y-2 list-disc pl-5 marker:text-purple-400/60">
              <li>Your Heart Cleanser Love Charm: pink quartz, with its wish capsule</li>
              <li>Blank wish papers that fit the capsule</li>
              <li>A printed card with the instructions and care notes</li>
              <li>A gift box to keep it in</li>
            </ul>
          </div>

          {/* BEAT 6 — where it's going: the address she typed into Stripe Checkout.
              Never a blank, never a literal token — the fallback line instead. */}
          <div>
            <h2 className="font-serif text-xl text-white mb-3">Where it's going</h2>
            {order.shipping ? (
              <p
                className="whitespace-pre-line break-words font-serif text-white pl-3 border-l-2 border-purple-400/40"
                data-testid="text-shipping-address"
              >
                {order.shipping}
              </p>
            ) : (
              <p data-testid="text-shipping-fallback">To the address you entered at checkout.</p>
            )}
          </div>

          {/* BEAT 7 — the real wait, word for word against 09-C1. */}
          <div>
            <h2 className="font-serif text-xl text-white mb-3">When it arrives</h2>
            <p>
              Your charm ships within <strong className="text-white">2 business days</strong>.
              After that, it arrives in <strong className="text-white">7–14 days</strong> in the US
              and <strong className="text-white">2–4 weeks</strong> everywhere else.
            </p>
          </div>

          {/* BEAT 8 — the two emails, by exact subject (09-T3, 09-T4). */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/10">
            <h2 className="flex items-center gap-3 mb-3">
              <Mail className="w-5 h-5 text-blue-400 shrink-0" />
              <span className="text-white font-serif text-xl">Two emails to look for</span>
            </h2>
            <p>Your order confirmation is on its way to your inbox now. Its subject is:</p>
            <p className="font-serif text-lg text-white my-3 pl-3" data-testid="text-subject-confirmed">
              <strong>{EMAIL_SUBJECTS.confirmed}</strong>
            </p>
            <p>When your charm ships, I'll email you the tracking link. That email's subject is:</p>
            <p className="font-serif text-lg text-white my-3 pl-3" data-testid="text-subject-shipped">
              <strong>{EMAIL_SUBJECTS.shipped}</strong>
            </p>
            <p>Until then, there's nothing you need to do.</p>
          </div>

          {/* BEAT 9 — support, then sign-off. */}
          <div>
            <h2 className="font-serif text-xl text-white mb-3">If you need help</h2>
            <p>
              Write to <SupportLink /> about anything to do with your order. Our refund policy is at{" "}
              <a
                href={REFUND_HREF}
                className="text-amber-300 underline underline-offset-4 hover:text-amber-200"
                data-testid="link-refund"
              >
                theseerwithin.com/refund
              </a>
              .
            </p>
          </div>

          <p>
            Keep your wish in mind while your charm travels to you, dear. You'll write it down when
            it arrives.
          </p>
          <p className="font-serif text-xl text-white">— Evelyn</p>
        </div>
      </div>
    </Shell>
  );
}
