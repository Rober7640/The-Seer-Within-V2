// SMS in-between page — <funnel>/preparing (Joel, 25 Nov 2026 call).
//
// Joel: the SMS box on top of Upsell 1 is "very awkward … we can never put it
// there". So after a paid Stripe checkout on a funnel where the SMS opt-in is
// switched on, the server's success_url sends her HERE first:
//
//   Stripe paid → <funnel>/preparing?session_id=cs_… → <funnel>/welcome1?session_id=cs_…
//   Payments.AI approved → <funnel>/preparing?session_id=txn_… → <funnel>/welcome1?session_id=txn_…
//   (Lewis 26 Nov 2026 — server/lib/paiLive.ts afterMainRedirect, same switch.)
//
// A progress bar with status lines + "Preparing your Energy Clearing Ritual… Please
// don't close this page" (Joel 25 Nov: must not look finished) + the SAME approved opt-in box (pre-filled
// number, UNTICKED checkbox, unchanged wording). "Text me" saves her yes and moves
// on; "No thanks" moves on; anything unavailable/failed moves on at once. Only
// Yes / No are shown (Lewis, 25 Nov: no extra "Continue" link — it confused). It is
// never a dead end: a box that never loads moves her on after 8s (SmsOptInCard),
// and it hands Upsell 1 the exact same query string. NO timer on her decision.
//
// Main purchase events ($35 + order bump) fire HERE, read-only data from
// /api/upsell/prep, so a buyer who stops on this page is still counted. Upsell 1
// keeps the same call as a BACKUP; the shared once-only slot means only one fires.
// This page makes no database writes of its own (see /api/upsell/prep).
import { useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { CosmicBackground } from "../components/CosmicBackground";
import { SmsOptInCard } from "../components/SmsOptInCard";
import { funnelPath } from "../lib/funnel";
import { claimMainPurchaseSlot, fireMainPurchaseEvents } from "../lib/mainPurchaseEvents";

// Joel picked version B (25 Nov preview): a progress bar that fills to almost full
// while short status lines change. Visual only: it never reaches 100% and never
// moves her on by itself — the page still waits for "Text me" / "No thanks".
const LOADING_LINES = ["Reading your energy…", "Preparing your ritual…", "Almost ready…"];
const LINE_AT_MS = [0, 2500, 5500];
const BAR_FILL_MS = 7000;

function PreparingProgress() {
  const [line, setLine] = useState(0);
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    // Start the fill on the next frame so the width transition actually runs.
    const raf = requestAnimationFrame(() => setFilled(true));
    const timers = LINE_AT_MS.slice(1).map((ms, i) => setTimeout(() => setLine(i + 1), ms));
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, []);
  return (
    <div className="space-y-2">
      <div className="mx-auto h-2 w-[85%] overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-300 ease-out motion-reduce:transition-none"
          style={{ width: filled ? "88%" : "8%", transition: `width ${BAR_FILL_MS}ms ease-out` }}
          data-testid="preparing-progress-bar"
        />
      </div>
      <p className="text-white/80 text-sm md:text-base min-h-[1.5em]" data-testid="preparing-status">
        {LOADING_LINES[line]}
      </p>
    </div>
  );
}

export default function SmsOptInStepPage() {
  const searchString = useSearch();
  const [, navigate] = useLocation();
  const sessionId = new URLSearchParams(searchString).get("session_id");
  const leftRef = useRef(false);

  // Hand on to Upsell 1 — same query string, replace so Back doesn't return here.
  function goToUpsell1() {
    if (leftRef.current) return;
    leftRef.current = true;
    navigate(`${funnelPath("/welcome1")}${searchString ? `?${searchString}` : ""}`, { replace: true });
  }

  // Main purchase events. Claimed only once the order is confirmed eligible, so a
  // failed lookup leaves the slot free for Upsell 1's backup call.
  useEffect(() => {
    if (!sessionId) {
      goToUpsell1();
      return;
    }
    let cancelled = false;
    fetch(`/api/upsell/prep?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => (r.ok ? r.json() : { ok: false }))
      .then((d: { ok: boolean; email?: string | null; mainPurchaseAmount?: number; bumpAmountCents?: number }) => {
        if (cancelled || !d.ok) return;
        if (claimMainPurchaseSlot(sessionId)) fireMainPurchaseEvents(sessionId, d);
      })
      .catch(() => {
        /* Upsell 1's backup call fires them instead */
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="relative min-h-screen flex flex-col" data-testid="page-sms-optin-step">
      <CosmicBackground />
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg space-y-6">
          {/* Joel, 25 Nov: "transition page should have a loading — don't give people
              the impression it's done". Version B: progress bar + status lines +
              "don't close this page" (the "arrives by email in 24 hours" line read as
              finished, so it's gone). */}
          <div className="text-center space-y-3" role="status" data-testid="preparing-loading">
            <h1 className="font-serif text-2xl md:text-3xl text-white" data-testid="text-preparing-heading">
              Preparing your Energy Clearing Ritual…
            </h1>
            <PreparingProgress />
            <p className="text-white/70 text-sm md:text-base">
              Please don't close this page.
            </p>
          </div>

          <SmsOptInCard sessionId={sessionId} onFinished={goToUpsell1} />
        </div>
      </div>
    </div>
  );
}
