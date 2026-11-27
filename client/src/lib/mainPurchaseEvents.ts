// Browser-side MAIN purchase events (the $35 offer + order bump), fired ONCE per order.
//
// Moved here UNCHANGED from UpsellPage so two pages can share it (Joel, 25 Nov 2026):
//  - the SMS in-between page (<funnel>/preparing) fires these first, and
//  - Upsell 1 (<funnel>/welcome1) still calls them as a BACKUP.
// The once-only slot below is the same sessionStorage key Upsell 1 has always used,
// so whichever page runs first fires them and the other does nothing. Each event
// also carries its own dedup: Facebook event_id `purchase_<session>`, the Google
// Ads key `gads_main_tracked_<session>`, Trackdesk externalId = session id.
import { trackPurchase } from "./facebook";
import { trackGAdsPurchase } from "./gtm";
import { trackABConversion } from "../hooks/useABTest";
import { purchaseCurrency } from "./locale";

const PURCHASE_TRACKED_KEY = "seer_purchase_tracked";

/**
 * Claim the once-only slot synchronously, before any async work, so a parallel
 * re-mount can't fire twice with the same event_id. true = this caller fires.
 */
export function claimMainPurchaseSlot(sessionId: string): boolean {
  const key = `${PURCHASE_TRACKED_KEY}_${sessionId}`;
  if (sessionStorage.getItem(key)) return false;
  sessionStorage.setItem(key, "true");
  return true;
}

/** Give the slot back (load failed) so a retry on remount can fire. */
export function releaseMainPurchaseSlot(sessionId: string): void {
  sessionStorage.removeItem(`${PURCHASE_TRACKED_KEY}_${sessionId}`);
}

export interface MainPurchaseData {
  email?: string | null;
  /** Main offer only, in cents. */
  mainPurchaseAmount?: number;
  /** Order-bump amount in cents; 0/absent on every non-bump order. */
  bumpAmountCents?: number;
}

/** Fire the main purchase events. Call only after claimMainPurchaseSlot() returned true. */
export function fireMainPurchaseEvents(sessionId: string, data: MainPurchaseData): void {
  const purchaseAmount = (data.mainPurchaseAmount || 3500) / 100;
  // Ad platforms get the TRUE order total (main + order bump). The
  // server-side CAPI fire already reports Stripe's amount_total, and both
  // sides share one deterministic event_id — so if this stayed on the
  // main-only amount, the same deduped Purchase event would carry $35
  // from the browser and $47.77 from the server, and which one survived
  // would be down to whichever arrived first. Identical to purchaseAmount
  // whenever there is no bump.
  const orderTotal = purchaseAmount + (data.bumpAmountCents || 0) / 100;
  trackPurchase(orderTotal, purchaseCurrency(), data.email ?? undefined, "Energy Clearing Ritual", sessionId, { skipServerRelay: true });
  trackGAdsPurchase("main", orderTotal, sessionId);

  // V1 prompt A/B (v1_clearing_theme_palm_2026) — primary metric =
  // purchase_completed. Same-session, so the ab_vid cookie is present;
  // /api/ab/convert self-gates (no-op unless this visitor was enrolled in a
  // running test scoped to this page), so firing it here is safe for ALL
  // funnels. Inside the dedup guard ⇒ counts once per purchase.
  trackABConversion("v1_chat_palm");

  // Trackdesk affiliate conversion tracking - main purchase.
  //
  // ⚠ DELIBERATELY still the MAIN amount, not orderTotal: this figure
  // drives affiliate commission, so including the order bump would change
  // what partners are paid. That is a commercial decision, not a tracking
  // one — left unchanged pending Lewis/Joel. Ad platforms above correctly
  // use the full order total.
  if (typeof window.trackdesk === "function") {
    window.trackdesk("the-seer-within", "conversion", {
      conversionType: "sale",
      amount: { value: String(purchaseAmount) },
      externalId: sessionId,
      customerId: data.email,
      currencyCode: purchaseCurrency(),
    });
  }
}
