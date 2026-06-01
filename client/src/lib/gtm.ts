declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

function push(event: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(event);
}

// Read the Google Ads click id from the `_gcl_aw` cookie (set by the GTM
// Conversion Linker already loaded in the container). Cookie format is
// `GCL.<timestamp>.<gclid>`. Returns the gclid portion, or undefined.
export function getGclid(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(/(?:^|;\s*)_gcl_aw=([^;]*)/);
  if (!match) return undefined;
  const parts = decodeURIComponent(match[1]).split('.');
  return parts.length >= 3 ? parts.slice(2).join('.') : undefined;
}

export function trackGAdsLead(): void {
  push({ event: 'lead' });
}

export function trackGAdsCheckout(value: number): void {
  push({
    event: 'initiate_checkout',
    value,
    currency: 'USD',
  });
}

export function trackGAdsPurchase(
  kind: 'main' | 'upsell1' | 'upsell2',
  value: number,
  transactionId: string,
): void {
  if (typeof window === 'undefined') return;

  const dedupKey = `gads_${kind}_tracked_${transactionId}`;
  if (sessionStorage.getItem(dedupKey)) return;
  sessionStorage.setItem(dedupKey, 'true');

  const eventName =
    kind === 'main' ? 'purchase'
    : kind === 'upsell1' ? 'upsell1_purchase'
    : 'upsell2_purchase';

  push({
    event: eventName,
    value,
    currency: 'USD',
    transaction_id: transactionId,
  });
}
