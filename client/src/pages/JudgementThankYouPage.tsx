// Offer 03 — Judgement Day: the thank-you page.
//
// Copy spec: improve-v1/v1-one-time-BEs/copy/03/03-T1-thank-you-page.md
//
// ⚠ THIS PAGE IS AN INTAKE GATE, not a receipt (P7, 00e §7). 03 is an ACT offer:
// the work cannot start until she replies to the delivery email with her Entry
// (who it is, what they did, how long she's carried it). So — deliberately, and
// unlike 02-T1 — the reply/Entry instruction sits ABOVE the delivery promise.
// Reading this top-to-bottom without registering the ask is the failure mode
// this page exists to prevent.
//
// ⚠ NOT an on-page form. The Entry is made by replying to her inbox, not by
// typing into this page. Do not add a text input here.
//
// ⚠ No bump delivery block on this page (unlike 02-T1's Astro Force P.S.).
// The Unburdening is aftercare and ships with the record after the third
// night — handing it over now would let her spend the cost before the debt
// is closed, which is the wrong order. See 03-T1 build notes.

import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { CosmicBackground } from "../components/CosmicBackground";
import { Mail } from "lucide-react";
import { displayName } from "../lib/backendOffers";

interface OrderData {
  firstName: string;
}

// 03's checkout has no name field the same way 02's doesn't — see
// TwinFlameThankYouPage's PLACEHOLDER_NAMES for the precedent. Evelyn's own
// fallback for an unresolved name is "dear".
const PLACEHOLDER_NAMES = ["Friend"] as const;

export default function JudgementThankYouPage() {
  const searchString = useSearch();
  const [order, setOrder] = useState<OrderData | null>(null);

  useEffect(() => {
    // ⚠ This offer's checkout redirects with `?s=<session_id>` (OffersUpsell2
    // navigates to `${successPath}?s=${sessionId}`, and BACKEND_OFFER_CATALOG's
    // successPath comment confirms `?s=` is what gets appended) — NOT the
    // `?session_id=` that TwinFlameThankYouPage reads. That page's endpoint
    // (`/api/order/details`) is also the wrong one here: this is a backend
    // (`be_`) order, looked up via `GET /api/backend/order/:sessionId`.
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

  // Graceful degradation: no resolved name → warm generic greeting, never a
  // literal "%FIRSTNAME%" or blank.
  const known = displayName(order?.firstName, PLACEHOLDER_NAMES);
  const firstName = known || "dear";

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4">
      <CosmicBackground />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-xl w-full">
        <div
          className="bg-slate-900/80 backdrop-blur-sm border border-purple-500/30 rounded-2xl shadow-2xl p-8 w-full"
          data-testid="card-thankyou-judgement"
        >
          {/* Your page is open, {firstName}. */}
          <h1 className="font-serif text-3xl text-white mb-6 text-center">
            Your page is open, {firstName}.
          </h1>

          <div className="space-y-5 text-purple-100/85 leading-relaxed">
            <p>
              I've written your name at the top of it and dated it. That much
              is done.
            </p>

            {/* P7 · ACT — the reply/Entry instruction, ABOVE the delivery
                promise, deliberately. This is the only thing on the page with
                a real deadline, because the work cannot start without it. */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <h2 className="font-serif text-xl text-white mb-3">
                Now the part only you can do
              </h2>
              <p className="flex items-start gap-3 mb-3">
                <Mail className="w-5 h-5 text-blue-400 mt-1 shrink-0" />
                <span>
                  <strong className="text-white">
                    Go to your inbox and reply to the email I've just sent
                    you.
                  </strong>
                </span>
              </p>
              <p className="mb-3">
                Tell me who it is. What they did. Roughly when, and how long
                you've been carrying it.
              </p>
              <p className="mb-3">
                In your own words — as much or as little as comes out, in
                whatever order it comes. Don't tidy it and don't make it fair
                to them. I am not going to be adjudicating; I am going to be{" "}
                <strong className="text-white">entering</strong> it, and an
                entry that has been made reasonable isn't accurate.
              </p>
              <p className="mb-3">
                That reply is the Entry. It is the first of your three
                nights, and I can't make it for you.
              </p>
              <p className="text-white">
                <strong>Write it tonight if you can.</strong> Not because
                anything expires — nothing here does — but because the page
                is open now, and an open page is the one part of this that's
                uncomfortable to leave sitting.
              </p>
            </div>

            {/* Then what happens — Entry, Transfer, Closing */}
            <div>
              <h2 className="font-serif text-xl text-white mb-3">
                Then what happens
              </h2>
              <p>
                Once your Entry is in, the three nights run: the Entry, the
                Transfer, the Closing.
              </p>
              <p className="mt-3">
                Your record comes to you after the third night. It will be
                titled:
              </p>
              <p
                className="font-serif text-lg text-white mt-4 pl-2 border-l-2 border-purple-400/40"
                data-testid="text-record-title"
              >
                {firstName} — your account is closed
              </p>
              <p className="text-purple-200/70 text-sm mt-3">
                Nothing else I send looks like that.
              </p>
            </div>

            <p>Take your time with the writing, dear. It's the only hard part.</p>
            <p className="font-serif text-xl text-white">— Evelyn</p>
          </div>
        </div>
      </div>
    </div>
  );
}
