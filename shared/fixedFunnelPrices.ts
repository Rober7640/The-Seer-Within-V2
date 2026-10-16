// Funnels that run a single FIXED price (no A/B). Moved here from
// server/lib/priceVariant.ts (2026-10-16) so the CLIENT can show the exact price the
// server will charge without hard-coding it: the /fb-tarot retarget page prints this
// number on its buy button, and the server's no-email retarget checkout charges it.
// One source of truth, so the button and the charge can never disagree.
//
// assignVariantIfMissing stamps these directly instead of drawing from the weighted
// system_config pool — so the funnel ships with correct pricing without a config row,
// and never pulls another funnel's variant via the scopeVariantsToFunnel full-pool
// fallback.
//
// NOTE: /fb2 used to be fixed-price here, but now runs the same weighted price split
// test as /fb via funnel-scoped variants ('v1-fb2': 35_fb2 / 45_fb2) in the
// system_config 'v1_price_variants' pool. Add an entry here only for a NEW funnel that
// should ship single-price; if you do, make sure NOT to also add matching weighted
// variants (the fixed entry takes precedence and would silently shadow them).

export interface FixedFunnelPrice {
  id: string;
  priceCents: number;
  downsellCents: number;
  upsell1Cents: number;
}

export const FIXED_FUNNEL_PRICES: Record<string, FixedFunnelPrice> = {
  // Tarot "decode-him card" funnel launches at a flat single price (no A/B split,
  // like thumb-angle at launch). The '35_tarot' id carries the '-tarot' token so
  // funnelParamFromPriceVariant attributes it back to v1-tarot. To start a price
  // test later, add funnel-scoped weighted variants to the system_config pool and
  // REMOVE this entry (a fixed entry shadows any matching weighted variants).
  'v1-tarot': { id: '35_tarot', priceCents: 3500, downsellCents: 2500, upsell1Cents: 4700 },
  // The /fb-read bridge launches at the same flat single price as tarot. Priced at
  // the FUNNEL level, so every device on it is priced correctly automatically and
  // there is no per-device money-safety roster to keep in sync (unlike palm's
  // OTHER_SIGNS). The '_read' token lets funnelParamFromPriceVariant attribute a
  // stored variant back to v1-read.
  'v1-read': { id: '35_read', priceCents: 3500, downsellCents: 2500, upsell1Cents: 4700 },
};

// ── RETARGET OFFER price (the /fb-tarot retargeting page) ─────────────────────────
// The retargeting page (`/fb-tarot/b?src=retarget`, client/src/pages/TarotRetargetOffer.tsx)
// sells the SAME product at a returning-reader price: $30, i.e. 14% off the funnel's $35
// (round((35-30)/35*100) = 14).
//
// The page prints the struck "$35", the "$30" and the "14%" from THIS table and the
// FIXED_FUNNEL_PRICES entry above, and /api/checkout charges from the same table — so
// the screen and the charge can never disagree. Applied ONLY to an order that carries
// `src=retarget` AND the closed-set offer-page marker on this funnel
// (shared/retargetCheckout.ts retargetOfferVariant); every other order is untouched.
//
// '30_tarot_rt': the '_tarot' token keeps funnelParamFromPriceVariant attributing it to
// v1-tarot (substring match on `_<token>`), the leading '30' is the price like every
// other id, and '_rt' tells it apart from '35_tarot' in Stripe metadata / PostHog
// `price_variant`. It does NOT start with the sliding-close prefix ('55-35').
// Upsell and downsell are the tarot funnel's own ($47 / $25) — only the main changes.
export const RETARGET_OFFER_PRICES: Record<string, FixedFunnelPrice> = {
  'v1-tarot': { id: '30_tarot_rt', priceCents: 3000, downsellCents: 2500, upsell1Cents: 4700 },
};
