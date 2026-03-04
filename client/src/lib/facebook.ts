declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
  }
}

function generateEventId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function getUserAgent(): string {
  return typeof navigator !== 'undefined' ? navigator.userAgent : '';
}

function getPageUrl(): string {
  return typeof window !== 'undefined' ? window.location.href : '';
}

export interface FBEventData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  email?: string;
  firstName?: string;
}

async function sendServerEvent(
  eventName: string,
  eventId: string,
  eventData?: FBEventData
): Promise<void> {
  try {
    await fetch('/api/fb-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName,
        eventId,
        eventSourceUrl: getPageUrl(),
        userAgent: getUserAgent(),
        ...eventData,
      }),
    });
  } catch (error) {
    console.warn('Failed to send server-side FB event:', error);
  }
}

export function trackPageView(): void {
  const eventId = generateEventId();
  
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'PageView', {}, { eventID: eventId });
  }
  
  sendServerEvent('PageView', eventId);
}

export function trackLead(email: string, firstName?: string): void {
  const eventId = generateEventId();
  
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Lead', {
      content_name: 'Email Capture',
    }, { eventID: eventId });
  }
  
  sendServerEvent('Lead', eventId, { email, firstName, content_name: 'Email Capture' });
}

export function trackInitiateCheckout(value: number = 35, currency: string = 'USD'): void {
  const eventId = generateEventId();
  
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'InitiateCheckout', {
      value,
      currency,
      content_name: 'Sacred Clearing Ritual',
    }, { eventID: eventId });
  }
  
  sendServerEvent('InitiateCheckout', eventId, {
    value,
    currency,
    content_name: 'Sacred Clearing Ritual',
  });
}

export function trackPurchase(value: number = 35, currency: string = 'USD', email?: string): void {
  const eventId = generateEventId();
  
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Purchase', {
      value,
      currency,
      content_name: 'Sacred Clearing Ritual',
    }, { eventID: eventId });
  }
  
  sendServerEvent('Purchase', eventId, {
    value,
    currency,
    email,
    content_name: 'Sacred Clearing Ritual',
  });
}

export function trackUpsell2Purchase(value: number, currency: string = 'USD', email?: string, contentName: string = 'Manifestation Bracelet'): void {
  const dedupKey = `upsell2_purchase_tracked_${value}`;
  if (typeof window !== 'undefined' && sessionStorage.getItem(dedupKey)) {
    return;
  }
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(dedupKey, 'true');
  }

  const eventId = generateEventId();
  
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Purchase', {
      value,
      currency,
      content_name: contentName,
    }, { eventID: eventId });
  }
  
  sendServerEvent('Purchase', eventId, {
    value,
    currency,
    email,
    content_name: contentName,
  });
}
