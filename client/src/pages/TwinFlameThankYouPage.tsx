// Offer 02 — Twin Flame Tarot: the thank-you page.
//
// Built because a 02 buyer was landing on V1's /success, which tells her
// "Energy Clearing Ritual — your personalized clearing begins tonight". She
// bought twelve tarot cards. (Operator caught it, 2026-08-07.)
//
// Copy spec: improve-v1/v1-one-time-BEs/copy/02/02-T1-thank-you-page.md
//
// ⚠ THIS PAGE SELLS NOTHING, deliberately (02-T1, and 00e §7a). She is Schwartz
// Level 5 and she has already paid; a headline, proof, or a second offer is
// friction here. 02 is a READING, so the page is a RECEIPT — confirm, name the
// delivery subject, state the SLA, stop.
//
// ⚠ That is why V1's Luna $50 cross-sell block is NOT here. It is real revenue
// on /success and dropping it is a genuine trade, not an oversight — see
// 00i-DELIVERABLES-U1-U2.md. If the operator wants it back, lift the block from
// SuccessPage.tsx wholesale; the `campaign=v1-ty-luna` tag is what the server
// keys the 30-minute coin grant off, so it must be carried over verbatim.

import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { CosmicBackground } from "../components/CosmicBackground";
import { CheckCircle, Mail } from "lucide-react";
import { displayName } from "../lib/backendOffers";

interface OrderData {
  firstName: string;
  email: string;
  upsellPurchased: boolean;
  upsell2Purchased: boolean;
  // Not in /api/order/details yet — see the bump block below.
  bumpPurchased?: boolean;
}

// 02-P4 / 02-T1: the subject line is load-bearing and the two MUST match. It is
// how she finds the product in a crowded inbox and it is the cheapest thing on
// this page. Do not "improve" it in one place only.
const EMAIL_SUBJECT = "%FIRSTNAME% — your twelve are laid";

// ⚠ Same placeholder as the upsells: /api/order/details returns whatever is on
// the conversation row, and 02's checkout sets no name, so it is the literal
// "Friend". Evelyn's own fallback is "dear".
const PLACEHOLDER_NAMES = ["Friend"] as const;

export default function TwinFlameThankYouPage() {
  const searchString = useSearch();
  const [order, setOrder] = useState<OrderData | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const sessionId = params.get("session_id");
    if (!sessionId) return;

    // ⚠ NOT BUILT, and deliberately: this page does NOT fire the Upsell-2
    // Purchase pixel, and does not run the fallback-checkout confirmation that
    // SuccessPage.tsx does. Both are meaningless until 02 has its own Stripe
    // checkout, and both depend on identifiers 02 still owes (its own bump
    // product key, its own event names — see 00h "NOT built"). Wire them here
    // when the checkout is built, or U2 purchases go unattributed.
    fetch(`/api/order/details?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.firstName) setOrder(d);
      })
      .catch((err) => console.error("Order details failed:", err));
  }, [searchString]);

  const known = displayName(order?.firstName, PLACEHOLDER_NAMES);
  const firstName = known || "dear";
  // ⚠ Never print "dear — your twelve are laid" as the subject. The email merges
  // her real name; promising a subject line she will not receive is worse than
  // showing the distinctive half, which is what she actually searches for.
  const subject = known
    ? EMAIL_SUBJECT.replace("%FIRSTNAME%", known)
    : "Your twelve are laid";

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4">
      <CosmicBackground />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-xl w-full">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/30 to-green-600/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>

        <div
          className="bg-slate-900/80 backdrop-blur-sm border border-purple-500/30 rounded-2xl shadow-2xl p-8 w-full"
          data-testid="card-thankyou-twinflame"
        >
          {/* BEAT 1 */}
          <h1 className="font-serif text-3xl text-white mb-6 text-center">
            Thank you, {firstName}.
          </h1>

          <div className="space-y-5 text-purple-100/85 leading-relaxed">
            {/* BEAT 2 — thanks framed as HER good judgment, not our good fortune.
                The only urgency on the page, and it is retrospective: it praises
                a decision she has already made. */}
            <p>
              You made the right decision, and you made it quickly. That matters
              more than you know with a draw like yours — the cards came away on
              their own, and cards that do that don't wait well.
            </p>

            {/* BEAT 3 — the work begins now */}
            <p>
              I'm starting tonight. The deck comes out after I finish this, and
              I'll be with your twelve until they're laid.
            </p>

            {/* BEAT 4 — exactly what to look for */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <p className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-400 mt-1 shrink-0" />
                <span>
                  <strong className="text-white">Watch your inbox.</strong> Your
                  reading arrives within <strong className="text-white">24 hours</strong>,
                  and it will be titled:
                </span>
              </p>
              <p
                className="font-serif text-lg text-white mt-4 pl-8"
                data-testid="text-email-subject"
              >
                {subject}
              </p>
            </div>

            <p className="text-purple-200/70 text-sm">
              Nothing else I send looks like that. If it hasn't reached you by
              this time tomorrow, check the promotions tab and anything your
              provider files as spam, then write to me and I'll send it again.
            </p>

            {/* BEAT 5 */}
            <p>I'm on your side in this, dear.</p>
            <p className="font-serif text-xl text-white">— Evelyn</p>
          </div>

          {/* Conditional — bump buyers only. 02-C3 promises "you can start it
              tonight", so the instructional has to be in her hands before she
              leaves this page, or that sentence is false within a minute of
              being agreed to.

              ⚠ TWO THINGS ARE MISSING and this block cannot ship without them:
                1. `bumpPurchased` is not returned by /api/order/details (the
                   column exists on `conversations`; the endpoint just doesn't
                   select it), so this is always false today.
                2. The link has NO TARGET. 02-C4 (the Astro Force instructional)
                   is written but not built as a page or a delivered asset.
              Until both land, a bump buyer sees nothing here — which is the safe
              failure, but it still breaks the bump's promise. */}
          {order?.bumpPurchased && (
            <div
              className="mt-8 pt-6 border-t border-white/10 text-purple-100/85"
              data-testid="block-bump-instructional"
            >
              <p className="mb-3">
                <strong className="text-white">
                  P.S. — Your Astro Force clearing is ready now.
                </strong>
              </p>
              <p className="mb-3">
                <a
                  href="#"
                  className="text-amber-300 underline underline-offset-4 hover:text-amber-200"
                  data-testid="link-astro-force"
                >
                  Open it here.
                </a>{" "}
                It's one night's work and it wants doing before the twelve reach
                you, so that what I'm reading isn't sitting under anything.
              </p>
              <p>Do it tonight if you can.</p>
            </div>
          )}
        </div>

        {/* No free-gift mention: the first house is delivered inside the product
            email as a second act (§6c). Announcing it twice spends it twice. */}
      </div>
    </div>
  );
}
