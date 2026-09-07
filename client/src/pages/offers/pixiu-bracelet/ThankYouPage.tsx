// Offer 06 — the Wishing Bracelet (Pixiu): the thank-you page.
//
// Copy spec: improve-v1/v1-one-time-BEs/copy/06/06-T1-thank-you-page.md
//
// ⚠ THIS PAGE IS A RECEIPT, not an intake (P7, 00e §7). 06 is Reading-shaped
// (the buyer gave no reply anywhere) wrapped around an Object-shaped product, so
// — unlike 03's thank-you, which IS the intake — this page sells nothing and is
// deliberately short: confirm the order, say plainly that a REAL OBJECT is being
// made and posted, state the real wait, name the delivery email's subject, stop.
//
// ⛔ THE ONE HARD RULE: no "your reading is being prepared" language anywhere.
// Beat 3 says the opposite outright — nothing is being read, nothing written —
// because the easy mistake here is letting 02/04's reading-receipt language
// survive the clone. Cloned from TwinFlameThankYouPage.tsx (02's own receipt),
// but reads `?s=` + the backend order endpoint like JudgementThankYouPage (the
// /offers/ success pages' convention), NOT 02's `?session_id=` / /api/order/details.

import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { CosmicBackground } from "../../../components/CosmicBackground";
import { CheckCircle, Mail, Package } from "lucide-react";
import { displayName } from "../../../lib/backendOffers";

interface OrderData {
  firstName: string;
  bumpPurchased?: boolean;
  // ⚠ NOT returned by /api/backend/order/:sessionId today — shipping is not yet
  // captured for the main order (see the shipping-collection decision). When it
  // is, publicOrder() should surface a formatted address string here and Beat 5
  // prints it instead of the fallback below. Forward-compatible on purpose.
  shipping?: string | null;
}

// 06-T4's real subject, verbatim (P7: this page's named subject MUST match the
// delivery email exactly). ⚠ If 06-T4's subject changes, change it here too.
const EMAIL_SUBJECT = "%FIRSTNAME% — Bixie's on his way to you";

// 06's checkout carries firstName from the letter's ?fn= when present; when it
// doesn't, the row holds the literal "Friend". Evelyn's own fallback is "dear".
const PLACEHOLDER_NAMES = ["Friend"] as const;

export default function PixiuThankYouPage() {
  const searchString = useSearch();
  const [order, setOrder] = useState<OrderData | null>(null);

  useEffect(() => {
    // ?s=<session_id> (OffersUpsell2 navigates to `${successPath}?s=${sessionId}`);
    // backend (`be_`) order, looked up via GET /api/backend/order/:sessionId.
    const params = new URLSearchParams(searchString);
    const sessionId = params.get("s");
    if (!sessionId) return;

    fetch(`/api/backend/order/${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.order?.firstName) setOrder(d.order);
      })
      .catch((err) => console.error("Order details failed:", err));
  }, [searchString]);

  const known = displayName(order?.firstName, PLACEHOLDER_NAMES);
  const firstName = known || "dear";
  // ⚠ Never print "dear — Bixie's on his way to you" as the subject — the email
  // merges her real name; showing the distinctive half is what she searches for.
  const subject = known
    ? EMAIL_SUBJECT.replace("%FIRSTNAME%", known)
    : "Bixie's on his way to you";

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4">
      <CosmicBackground />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-xl w-full">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/30 to-green-600/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>

        <div
          className="bg-slate-900/80 backdrop-blur-sm border border-purple-500/30 rounded-2xl shadow-2xl p-8 w-full"
          data-testid="card-thankyou-pixiu"
        >
          {/* BEAT 1 — confirms the order itself, not just her name. */}
          <h1 className="font-serif text-3xl text-white mb-6 text-center">
            Thank you, {firstName}. The Wishing Bracelet is yours.
          </h1>

          <div className="space-y-5 text-purple-100/85 leading-relaxed">
            {/* BEAT 2 — thanks framed as HER good judgment, grounded in her own
                quoted words from the letter. */}
            <p>
              You said it yourself, more than once — that everything appears to
              be reaching you but doesn't. You didn't argue yourself out of it
              once you'd said it plainly, and you didn't sit on it either. That's
              exactly right of you, dear.
            </p>

            {/* BEAT 3 — the load-bearing difference from every reading offer.
                ⛔ NOTHING is being read tonight — say it outright. */}
            <p>
              I want to say this next part plainly, because most nights with me
              it's the opposite: nothing is being read for you tonight. Nobody's
              laying cards, nobody's writing a page with your name at the top of
              it. What's happening now is a real, physical thing — your piece is
              being made and packed. The actual bracelet. The actual capsule.
              Boxed to travel.
            </p>

            {/* BEAT 4 — receipt-style itemization of what ships. */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <p className="flex items-center gap-3 mb-3">
                <Package className="w-5 h-5 text-purple-300 shrink-0" />
                <strong className="text-white font-serif text-lg">What's coming</strong>
              </p>
              <ul className="space-y-2 list-disc pl-5 marker:text-purple-400/60">
                <li>
                  The bracelet itself — black agate, the two-horned Pixiu sitting
                  on top of it, the sealed capsule built in.
                </li>
                <li>A small box, built to keep it in.</li>
                <li>A card recording what it is and where it's from.</li>
                <li>Care instructions.</li>
                <li>
                  Four or five blank papers for your sentence, not just the one
                  you'll seal in — so you're not stuck if the first try doesn't
                  feel like the right one.
                </li>
              </ul>
              <p className="mt-4 text-white">
                Left wrist when it reaches you. You already know why.
              </p>
            </div>

            {/* BEAT 5 — confirms the address + states the real SLA, word for word
                against 06-C1's statement 4. ⚠ Fallback discipline (06-T1 build
                note): if the address isn't available, never print a blank or a
                literal %SHIPPING_ADDRESS% — fall back to naming the screen. */}
            <div>
              <h2 className="font-serif text-xl text-white mb-3">
                Where it's headed, and when
              </h2>
              {order?.shipping ? (
                <>
                  <p className="mb-3">Here's what you gave me on the last screen:</p>
                  <p
                    className="whitespace-pre-line font-serif text-white pl-2 border-l-2 border-purple-400/40 mb-3"
                    data-testid="text-shipping-address"
                  >
                    {order.shipping}
                  </p>
                </>
              ) : (
                <p className="mb-3">
                  It's going to the address you gave us on the last screen.
                </p>
              )}
              <p>
                And here's the timeline — the same one you already said yes to.{" "}
                <strong className="text-white">7 business days</strong> to prepare
                it, then <strong className="text-white">1–2 weeks</strong> to
                reach you after that. I'm not going to pretend a real, physical
                thing moves faster than it does.
              </p>
            </div>

            {/* BEAT 6 — where updates come from; names 06-T4's exact subject. */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <p className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-400 mt-1 shrink-0" />
                <span>
                  You'll hear from me again once it's packed and on its way, and
                  it'll be titled:
                </span>
              </p>
              <p
                className="font-serif text-lg text-white mt-4 pl-8"
                data-testid="text-email-subject"
              >
                {subject}
              </p>
              <p className="text-purple-200/70 text-sm mt-4 pl-8">
                That's when the tracking comes, not before. Until then there's
                nothing to check and nothing you need to do.
              </p>
            </div>

            {/* BEAT 7 — sign-off. Deliberately NOT 02-T1's "I'm on your side in
                this, dear" (a flagged corpus collision); tied to the no-exit
                mechanism instead. */}
            <p>
              It's on its way now, dear. The whole point of him is that once a
              thing reaches you, it doesn't have to leave again.
            </p>
            <p className="font-serif text-xl text-white">— Evelyn</p>
          </div>

          {/* Conditional — bump buyers only ("The Closed Purse"). ⚠ Same real
              gap 02-T1 has: the instructional (06-C4-equivalent) isn't drafted
              and the link has no target yet, so a bump buyer sees a P.S. that
              goes nowhere — the safe failure, not a silent one. No same-night
              urgency, because 06-C3 makes no same-night promise (contrast 02). */}
          {order?.bumpPurchased && (
            <div
              className="mt-8 pt-6 border-t border-white/10 text-purple-100/85"
              data-testid="block-bump-instructional"
            >
              <p className="mb-3">
                <strong className="text-white">
                  P.S. — you added The Closed Purse too.
                </strong>
              </p>
              <p>
                <a
                  href="#"
                  className="text-amber-300 underline underline-offset-4 hover:text-amber-200"
                  data-testid="link-closed-purse"
                >
                  Open it here.
                </a>{" "}
                It's one sitting, and there's no clock on this one — do it
                whenever the evening is quiet enough to be honest in.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
