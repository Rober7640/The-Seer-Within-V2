// Funnel-based Resend tags for the V1->V2 migration drip emails.
//
// Adds `funnel` (e.g. v1-palm) + `price_variant` (e.g. 35_palm) tags so the
// emails can be filtered by ad-funnel inside Resend. Derived from the migrated
// conversation's stored price_variant.
//
// SAFETY:
//  - Gated behind ENABLE_RESEND_FUNNEL_TAG (default OFF). When off, returns an
//    empty array so the send call is byte-identical to today.
//  - Resend tag name/value may contain ONLY [A-Za-z0-9_-]; an invalid value
//    makes the WHOLE send return 400. We sanitize and OMIT any tag that doesn't
//    survive, so a bad/missing value can only ever degrade to "untagged" — it
//    can never turn a successful send into a failed one.

import { funnelParamFromPriceVariant } from '@shared/funnelConfig';

// Strip anything outside Resend's allowed tag charset and cap length.
function sanitizeTagValue(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 256);
}

/**
 * Build the additive funnel tags for a migration email. Returns [] when the
 * feature flag is off or nothing safe can be derived.
 */
export function buildFunnelTags(
  priceVariant: string | null | undefined,
): Array<{ name: string; value: string }> {
  if (process.env.ENABLE_RESEND_FUNNEL_TAG !== 'true') return [];

  const tags: Array<{ name: string; value: string }> = [];

  const pv = priceVariant ? sanitizeTagValue(priceVariant) : '';
  if (pv) tags.push({ name: 'price_variant', value: pv });

  const funnel = funnelParamFromPriceVariant(priceVariant);
  if (funnel) {
    const fv = sanitizeTagValue(funnel);
    if (fv) tags.push({ name: 'funnel', value: fv });
  }

  return tags;
}
