// /evelyn/thank-you — the Soulmate Initials Reading's thank-you page (spec §6).
//
// Reached from U2 (`/offers/upsell/welcome2`) as `${successPath}?s=<session_id>`
// per the catalog's successPath for 'soulmate-initials' (spec §5) — same `?s=`
// convention JudgementThankYouPage and the heart-cleanser receipt already use.
//
// ⚠ TOLERANT BY DESIGN: this page must never crash or show nothing useful just
// because `?s=` is missing, the fulfilment lookup 401s (it's n8n's Bearer-gated
// door, not a public one — the page degrades to the fallback rather than ever
// showing a logged-in secret to a browser), or the network call fails outright.
// Every failure path below renders the same generic (but still warm, still
// correct) thank-you — her stone/add-on detail is a bonus, not a dependency.
//
// ⚠ U1/U2 (the Protection Ritual and Manifestation Bracelet upsells) are NOT shown
// here. Spec §6 asks for "U1/U2 purchases if any", but neither the fulfilment
// endpoint (server/routes/beFulfilment.ts) nor the public order lookup
// (/api/backend/order/:sessionId → publicOrder()) reports whether this session's
// later /offers/upsell/welcome1|2 charges succeeded — only the checkout-time
// add-on (`order.bumpPurchased`, the $11.11 stone charge) is readable today. The
// 08 Marcus-audio upsell has its own purpose-built `paidUpsellAmountCents` lookup;
// 10 has no equivalent for U1/U2. Until that lookup exists, this page is silent
// on U1/U2 rather than guessing — the same safe-failure TwinFlameThankYouPage's
// bump block takes while its own data is unavailable.
import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { CheckCircle, Mail } from "lucide-react";
import { CosmicBackground } from "@/components/CosmicBackground";
import { displayName } from "@/lib/backendOffers";
import { DELIVERY_PROMISE, stoneLabel, isStone, type StoneKey } from "@shared/evelynVsl";

const SUPPORT_EMAIL = "hi@theseerwithin.com";
const STORAGE_KEY = "evelyn_vsl_v1";
// Checkout's own placeholder for an unresolved first name (CheckoutPage / 09's
// precedent) — never a literal "Friend" on this page; Evelyn's own fallback is "dear".
const PLACEHOLDER_NAMES = ["Friend"] as const;

interface FulfilmentDetails {
  firstName: string | null;
  stone: StoneKey | null;
  bumpPurchased: boolean;
}

function readStoredStone(): string | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.stone === "string" ? parsed.stone : null;
  } catch {
    return null;
  }
}

/**
 * Best-effort lookup. `GET /api/be/soulmate-initials/fulfilment/:sessionId` is
 * n8n's door (shared-secret auth) — a browser call to it will 401, and that is
 * expected, not an error worth surfacing. Any non-OK response, a network failure,
 * or malformed JSON all resolve to `null` so the caller falls back cleanly.
 */
async function loadFulfilmentDetails(sessionId: string): Promise<FulfilmentDetails | null> {
  try {
    const res = await fetch(`/api/be/soulmate-initials/fulfilment/${encodeURIComponent(sessionId)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as {
      order?: { displayFirstName?: unknown; firstName?: unknown; bumpPurchased?: unknown };
      intake?: { stone?: unknown; firstName?: unknown } | null;
    };
    const firstName =
      (typeof body.intake?.firstName === "string" ? body.intake.firstName : null) ??
      (typeof body.order?.displayFirstName === "string" ? body.order.displayFirstName : null) ??
      (typeof body.order?.firstName === "string" ? body.order.firstName : null);
    const stone = isStone(body.intake?.stone) ? body.intake.stone : null;
    // The checkout-time add-on (the $11.11 "charge my stone tonight" bump) —
    // NOT U1/U2, which are separate later Stripe charges this endpoint does not
    // report (see the ThankYouPage header comment / task report for the gap).
    const bumpPurchased = body.order?.bumpPurchased === true;
    return { firstName, stone, bumpPurchased };
  } catch {
    return null;
  }
}

export default function ThankYouPage() {
  const searchString = useSearch();
  const [details, setDetails] = useState<FulfilmentDetails | null>(null);

  useEffect(() => {
    document.title = "Thank you — The Seer Within";
  }, []);

  useEffect(() => {
    let active = true;
    const sessionId = new URLSearchParams(searchString).get("s");
    // No session — tolerant: render the generic thank-you, no network call.
    if (!sessionId) return;

    loadFulfilmentDetails(sessionId).then((found) => {
      if (active) setDetails(found);
    });
    return () => {
      active = false;
    };
  }, [searchString]);

  const known = displayName(details?.firstName, PLACEHOLDER_NAMES);
  const firstName = known || "dear";

  // Stone: the fulfilment lookup wins when it resolved one; otherwise fall back
  // to the pick she made on /evelyn/reading (spec requirement — "Fall back to
  // localStorage['evelyn_vsl_v1'] for the stone if no session").
  const storedStone = readStoredStone();
  const stoneKey = details?.stone ?? (isStone(storedStone) ? storedStone : null);
  const stoneName = stoneKey ? stoneLabel(stoneKey) : null;
  const bumpPurchased = details?.bumpPurchased === true;

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4">
      <CosmicBackground />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-xl w-full">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/30 to-green-600/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>

        <div
          className="bg-slate-900/80 backdrop-blur-sm border border-purple-500/30 rounded-2xl shadow-2xl p-6 md:p-8 w-full"
          data-testid="card-thankyou-soulmate-initials"
        >
          {/* "Thank you, {first name}. Your Soulmate Initials Reading is being
              prepared." — spec §6, word for word. */}
          <h1 className="font-serif text-3xl text-white mb-6 text-center" data-testid="text-thankyou-headline">
            Thank you, {firstName}. Your Soulmate Initials Reading is being prepared.
          </h1>

          <div className="space-y-5 text-purple-100/85 leading-relaxed">
            {/* Her stone, and the add-on charge line if she bought it. Only when
                a stone was actually resolved — never a blank or a literal token. */}
            {stoneName && (
              <p data-testid="text-stone-line">
                Your <strong className="text-white">{stoneName}</strong> is noted for your reading.
                {bumpPurchased && (
                  <>
                    {" "}
                    And yes — your <strong className="text-white">{stoneName}</strong> will be charged
                    tonight.
                  </>
                )}
              </p>
            )}

            {/* Delivery, by the one shared constant — never retyped. */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10" data-testid="block-delivery">
              <p className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-400 mt-1 shrink-0" />
                <span>
                  <strong className="text-white">Watch your inbox.</strong> Your reading arrives{" "}
                  {DELIVERY_PROMISE}.
                </span>
              </p>
            </div>

            <p className="text-purple-200/70 text-sm" data-testid="text-check-spam">
              If it hasn't reached you by this time tomorrow, check your spam and promotions
              folders, then write to me and I'll send it again.
            </p>

            <p>I'm looking forward to laying your cards, dear.</p>
            <p className="font-serif text-xl text-white">— Evelyn</p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-purple-200/70 text-sm">
              Questions about your order?{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-amber-300 underline underline-offset-4 hover:text-amber-200"
                data-testid="link-support"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
