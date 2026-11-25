// SMS in-between page — <funnel>/preparing (Joel, 25 Nov 2026 call).
//
// Joel: the SMS box on top of Upsell 1 is "very awkward … we can never put it
// there". So after a paid Stripe checkout on a funnel where the SMS opt-in is
// switched on, the server's success_url sends her HERE first:
//
//   Stripe paid → <funnel>/preparing?session_id=cs_… → <funnel>/welcome1?session_id=cs_…
//
// "Your ritual is being prepared" + the SAME approved opt-in box (pre-filled
// number, UNTICKED checkbox, unchanged wording). "Text me" saves her yes and moves
// on; "No thanks" moves on; anything unavailable/failed moves on at once. It is
// never a dead end, and it hands Upsell 1 the exact same query string.
//
// Main purchase events ($35 + order bump) fire HERE, read-only data from
// /api/upsell/prep, so a buyer who stops on this page is still counted. Upsell 1
// keeps the same call as a BACKUP; the shared once-only slot means only one fires.
// This page makes no database writes of its own (see /api/upsell/prep).
import { useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { CosmicBackground } from "../components/CosmicBackground";
import { SmsOptInCard } from "../components/SmsOptInCard";
import { Button } from "@/components/ui/button";
import { funnelPath } from "../lib/funnel";
import { claimMainPurchaseSlot, fireMainPurchaseEvents } from "../lib/mainPurchaseEvents";

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
          <div className="text-center space-y-2">
            <h1 className="font-serif text-2xl md:text-3xl text-white" data-testid="text-preparing-heading">
              Your Energy Clearing Ritual is being prepared
            </h1>
            <p className="text-white/70 text-sm md:text-base">
              It will arrive by email in about 24 hours.
            </p>
          </div>

          <SmsOptInCard sessionId={sessionId} onFinished={goToUpsell1} />

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={goToUpsell1}
              className="text-white/60 hover:text-white hover:bg-white/10 text-sm"
              data-testid="button-preparing-continue"
            >
              Continue →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
