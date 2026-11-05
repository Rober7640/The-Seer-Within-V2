// LongCopyPaywallModal — host for the long-copy paywall test ("updated test 1").
// Renders the first-timer long-copy paywall OR the repeat-buyer paywall (chosen by
// the server via /pricing's longCopyTest.mode), hands a chosen pack to PaymentModal
// (the SAME purchase + grant path as BuyCreditsModal), and — for first-timers who
// tap "Not now" — shows the one-tap "What stopped you?" sheet and logs the pick.
//
// Drop-in alternative to BuyCreditsModal: ChatServicePage renders this instead when
// the user is in the test arm, passing the same open / onOpenChange / onSuccess.

import { useEffect, useState } from "react";
import { useAuth, authFetch } from "@/hooks/useAuth";
import PaymentModal from "@/components/PaymentModal";
import LongCopyPaywall from "@/components/paywall/LongCopyPaywall";
import RepeatBuyerPaywall from "@/components/paywall/RepeatBuyerPaywall";
import ExitReasonSheet, { type ExitReason } from "@/components/paywall/ExitReasonSheet";
import { COINS_PER_MINUTE, type PricingTier } from "@shared/types";
import type { BonusPreviewTier } from "@shared/paywall";

interface LongCopyPaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "first_timer" | "repeat";
  personaId: string | null;
  personaName?: string;
  avatarUrl?: string;
  tiers: BonusPreviewTier[];
  coinsPerMinute?: number;
  /** Up to 3 "what I still see for you" lines (first-timer card). null = fallback line. */
  stillSee?: string[] | null;
  isOutOfCredits?: boolean;
  onSuccess?: (newBalance: number) => void;
}

export default function LongCopyPaywallModal({
  open,
  onOpenChange,
  mode,
  personaId,
  personaName,
  avatarUrl,
  tiers,
  coinsPerMinute = COINS_PER_MINUTE,
  stillSee = null,
  isOutOfCredits = false,
  onSuccess,
}: LongCopyPaywallModalProps) {
  const { refreshUser } = useAuth();
  const [payTier, setPayTier] = useState<PricingTier | null>(null);
  const [showExit, setShowExit] = useState(false);

  // Reset + log the checkout view (which also logs the experiment exposure) on open.
  useEffect(() => {
    if (open) {
      setPayTier(null);
      setShowExit(false);
      authFetch("/api/credits/checkout-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageType: "longcopy",
          personaId,
          source: mode === "repeat" ? "longcopy_repeat" : "longcopy_first_timer",
          isOutOfCredits,
        }),
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    setPayTier(null);
    setShowExit(false);
    onOpenChange(false);
  };

  const handleSuccess = (newBalance: number) => {
    setPayTier(null);
    setShowExit(false);
    onOpenChange(false);
    onSuccess?.(newBalance);
    refreshUser();
  };

  const recordExit = (reason: ExitReason | null) => {
    if (reason) {
      authFetch("/api/credits/exit-reason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, personaId }),
      }).catch(() => {});
    }
    close();
  };

  // The paywall stays mounted while PaymentModal overlays it (matches BuyCreditsModal),
  // and hides once the user has moved on to the exit sheet.
  const paywallOpen = open && !showExit;

  return (
    <>
      {mode === "first_timer" ? (
        <LongCopyPaywall
          open={paywallOpen}
          onOpenChange={() => {}}
          persona={{ name: personaName || "your guide", avatarUrl, rating: 4.7, ratingCount: 290 }}
          stillSee={stillSee}
          tiers={tiers}
          coinsPerMinute={coinsPerMinute}
          onContinue={(tier) => setPayTier(tier)}
          onNotNow={() => setShowExit(true)}
        />
      ) : (
        <RepeatBuyerPaywall
          open={paywallOpen}
          onOpenChange={() => {}}
          personaName={personaName}
          avatarUrl={avatarUrl}
          isOutOfCredits={isOutOfCredits}
          tiers={tiers}
          coinsPerMinute={coinsPerMinute}
          onContinue={(tier) => setPayTier(tier)}
          onClose={() => close()}
        />
      )}

      <ExitReasonSheet open={open && showExit} onOpenChange={() => {}} onPick={recordExit} />

      {payTier && (
        <PaymentModal
          isOpen={!!payTier}
          onClose={() => setPayTier(null)}
          tier={payTier}
          personaId={personaId}
          personaName={personaName}
          coinsPerMinute={coinsPerMinute}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
