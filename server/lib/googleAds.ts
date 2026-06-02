// Server-side Google Ads conversion firing via the Stape sGTM Data Client.
//
// Mirrors the FB CAPI transport in ./facebook.ts: we POST a flat single-event
// JSON to the sGTM first-party endpoint (e.g. https://metrics.theseerwithin.com
// /data). A Google Ads Conversion Tracking tag in the server container
// (GTM-PRDKFSLC) fires on the event_name, reading gclid + value + order id and
// reporting the conversion to Google Ads. The Conversion ID / Label live in
// the GTM tag, not here.
//
// Ships dark: when SGTM_GADS_ENDPOINT is unset, every call is a no-op, so the
// code is safe to deploy before the container is configured.
//
// This is the durable, server-side counterpart to the client-side gtag fires
// in client/src/lib/gtm.ts. The two dedup in Google Ads:
//   - Lead + Begin checkout are Count="One" → auto-deduped per click.
//   - Purchase / Upsell1 / Upsell2 are Count="Every" → deduped by order id, so
//     the server MUST send the same order id the client sends (the main
//     Checkout Session id).

import crypto from 'crypto';
import logger from './logger';

const SGTM_GADS_ENDPOINT = process.env.SGTM_GADS_ENDPOINT;
// When set, attaches `X-Gtm-Server-Preview: <token>` to every outgoing event so
// server-fired conversions show up in the sGTM container's Preview pane (the
// GAds equivalent of FB Events Manager → Test Events). Copy the value from the
// Preview session's ⋮ menu → "Send requests manually". Unset when done.
const SGTM_PREVIEW_TOKEN = process.env.SGTM_PREVIEW_TOKEN;

export type GAdsStep =
  | 'lead'
  | 'initiate_checkout'
  | 'purchase'
  | 'upsell1'
  | 'upsell2';

// Stripe product → conversion step. Used by the webhook to map a paid product
// to the right Google Ads conversion action.
const PRODUCT_TO_STEP: Record<string, GAdsStep> = {
  energy_clearing_ritual: 'purchase',
  protection_ritual: 'upsell1',
  manifestation_bracelet: 'upsell2',
};

export function gadsStepForProduct(product: string | undefined | null): GAdsStep | null {
  return product ? PRODUCT_TO_STEP[product] ?? null : null;
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input.toLowerCase().trim()).digest('hex');
}

export interface GAdsConversionParams {
  step: GAdsStep;
  // The Google Ads click id (from the _gcl_aw cookie). Required — without a
  // click to attribute to, a server-side conversion can't be credited, so we
  // skip the fire entirely rather than emit unattributed noise.
  gclid?: string;
  valueCents?: number;
  currency?: string;
  // Order id for client/server dedup on Count="Every" conversions. Must equal
  // the client's transaction_id (the main Checkout Session id).
  orderId?: string;
  // Plain email — hashed here for Enhanced Conversions to lift match rate.
  email?: string;
}

// Fire-and-forget. NEVER throws — payment processing must not be blocked by a
// tracking failure.
export async function fireGoogleAdsConversion(params: GAdsConversionParams): Promise<void> {
  try {
    if (!SGTM_GADS_ENDPOINT) return; // ship dark until the container is configured
    if (!params.gclid) return; // no click to attribute → nothing to report

    const payload = {
      event_name: `gads_${params.step}`,
      gclid: params.gclid,
      value: params.valueCents != null ? params.valueCents / 100 : undefined,
      currency: params.currency ?? 'USD',
      transaction_id: params.orderId,
      email_sha256: params.email ? sha256(params.email) : undefined,
    };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (SGTM_PREVIEW_TOKEN) headers['X-Gtm-Server-Preview'] = SGTM_PREVIEW_TOKEN;

    const res = await fetch(SGTM_GADS_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      logger.error('Google Ads sGTM conversion error', {
        step: params.step,
        status: res.status,
      });
      return;
    }

    logger.info('Google Ads conversion fired', {
      step: params.step,
      orderId: params.orderId,
      valueUsd: payload.value,
    });
  } catch (err) {
    logger.error('fireGoogleAdsConversion failed', { step: params.step, err: String(err) });
  }
}
