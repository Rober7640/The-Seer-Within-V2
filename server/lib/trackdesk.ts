// Server-side Trackdesk affiliate conversion reporting.
//
// Moved here from routes/webhooks.ts so it sits beside the other conversion
// transports (facebook.ts, googleAds.ts) and can be fired by any payment path.
// routes/webhooks.ts re-exports it, so existing importers are unchanged.
//
// Payments.AI charges never reach the Stripe webhook, so paiFunnel.ts calls this
// directly; importing webhooks.ts there would drag in Stripe, PayPal and svix.

import logger from './logger';

const TRACKDESK_API_KEY = process.env.TRACKDESK_API_KEY;
const TRACKDESK_CONVERSION_URL = 'https://the-seer-within.trackdesk.com/tracking/conversion/v1';

/**
 * Report a conversion to Trackdesk server-side.
 * Fails silently — affiliate tracking should never block purchases.
 */
export async function reportTrackdeskConversion(params: {
  clickId: string;
  conversionType: 'sale' | 'lead' | 'upsell1' | 'upsell2';
  externalId: string;
  customerId: string;
  amount?: number;
  currency?: string;
}) {
  // TRACKDESK_API_KEY acts as the feature flag for enabling tracking.
  // The tenant-scoped conversion endpoint below does not require the key in headers.
  if (!TRACKDESK_API_KEY) {
    logger.warn('Trackdesk: API key not configured, skipping conversion');
    return;
  }

  try {
    const body: Record<string, unknown> = {
      cid: params.clickId,
      conversionTypeCode: params.conversionType,
      externalId: params.externalId,
      customerId: params.customerId,
      status: 'CONVERSION_STATUS_APPROVED',
    };
    if (params.amount !== undefined) {
      body.amount = { value: String(params.amount) };
      body.currency = { code: params.currency || 'USD' };
    }

    const response = await fetch(TRACKDESK_CONVERSION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error(`Trackdesk ${params.conversionType} conversion failed (${response.status}) body=${text} payload=${JSON.stringify(body)}`);
    } else {
      const amountLabel = params.amount !== undefined ? ` — $${params.amount}` : '';
      logger.info(`Trackdesk ${params.conversionType} reported: ${params.externalId}${amountLabel}`);
    }
  } catch (err) {
    logger.error('Trackdesk conversion error:', err);
  }
}
