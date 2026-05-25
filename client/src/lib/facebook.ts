import { getPixelIdForUrl } from "@shared/fbPixelConfig";

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    clarity: (...args: unknown[]) => void;
    trackdesk: (...args: unknown[]) => void;
  }
}

// Lazy-init each FB Pixel only when an event is first fired to it. This
// avoids fbq('init') auto-firing a PageView to every pixel on every page,
// which would cross-contaminate per-funnel attribution. autoConfig=false
// suppresses Meta's automatic button-click/form-submit detection so only
// the events we explicitly fire are tracked.
const initedPixels = new Set<string>();
function ensurePixelInited(pixelId: string): void {
  if (initedPixels.has(pixelId)) return;
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("set", "autoConfig", "false", pixelId);
  window.fbq("init", pixelId);
  initedPixels.add(pixelId);
}

// Pick the FB Pixel ID that owns the current page's funnel, init'ing it
// on first use. Used to scope every fbq call to the right pixel.
function currentPixelId(): string {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const pixelId = getPixelIdForUrl(path);
  ensurePixelInited(pixelId);
  return pixelId;
}

/** Read the Trackdesk click-id cookie (set by their JS snippet). */
export function getTrackdeskClickId(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)trakdesk_cid=([^;]*)/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    return parsed.cid || null;
  } catch {
    return null;
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

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function getFbClickId(): string | undefined {
  return getCookie('_fbc');
}

function getFbBrowserId(): string | undefined {
  return getCookie('_fbp');
}

// Deterministic event-ID hash. MUST match the server-side equivalent in
// server/lib/facebook.ts so Pixel + CAPI dedup cleanly. Web Crypto SHA-256
// (async); first 16 hex chars only.
async function shortHashSha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
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
        fbc: getFbClickId(),
        fbp: getFbBrowserId(),
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
    window.fbq('trackSingle', currentPixelId(), 'PageView', {}, { eventID: eventId });
  }

  sendServerEvent('PageView', eventId);
}

export async function trackLead(
  email: string,
  firstName?: string,
  options?: { skipServerRelay?: boolean },
): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const eventId = `lead_${await shortHashSha256(normalized)}`;

  // value/currency intentionally omitted: Meta Events Manager flags
  // value=0 as a data-quality issue, and the spec lists both as optional
  // for the Lead event since email capture has no realized monetary value.
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackSingle', currentPixelId(), 'Lead', {
      content_name: 'Email Capture',
    }, { eventID: eventId });
  }

  // V1 chat flow passes skipServerRelay=true because /api/lead already fires
  // the server-side Lead with the same deterministic event_id — avoids the
  // duplicate "Server / Deduplicated" row in Meta Test Events. V2 callers
  // (AidenQuizPage, LoginPage) leave the option default so they keep their
  // existing /api/fb-event server-side relay path.
  if (!options?.skipServerRelay) {
    sendServerEvent('Lead', eventId, { email, firstName, content_name: 'Email Capture' });
  }
}

// `contentName` defaults to 'Energy Clearing Ritual' so V1-funnel callers
// (useConversation.ts, UpsellPage.tsx, SuccessPage.tsx) stay unchanged. V2
// callers pass an explicit value so Meta reporting separates V2 credit
// purchases from the V1 ritual offer.
export function trackInitiateCheckout(
  value: number = 35,
  currency: string = 'USD',
  contentName: string = 'Energy Clearing Ritual',
): void {
  const eventId = generateEventId();

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackSingle', currentPixelId(), 'InitiateCheckout', {
      value,
      currency,
      content_name: contentName,
    }, { eventID: eventId });
  }

  sendServerEvent('InitiateCheckout', eventId, {
    value,
    currency,
    content_name: contentName,
  });
}

export function trackPurchase(
  value: number = 35,
  currency: string = 'USD',
  email?: string,
  contentName: string = 'Energy Clearing Ritual',
  mainSessionId?: string,
  // V1/V1-FB callers pass skipServerRelay=true because the Stripe webhook's
  // fireStripePurchaseEvent already fires server-side with the same
  // deterministic event_id — avoids duplicate "Server / Deduplicated" rows.
  options?: { skipServerRelay?: boolean },
): void {
  const eventId = mainSessionId
    ? `purchase_${mainSessionId}`
    : generateEventId();

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackSingle', currentPixelId(), 'Purchase', {
      value,
      currency,
      content_name: contentName,
    }, { eventID: eventId });
  }

  if (!options?.skipServerRelay) {
    sendServerEvent('Purchase', eventId, {
      value,
      currency,
      email,
      content_name: contentName,
    });
  }
}

// Custom event fired when a /evelyn lander visitor clicks the "Continue your
// reading" CTA after the 2-message warm-up. Mirrored client-side via Pixel
// (trackCustom) and server-side via CAPI with the same eventID for dedup.
export function trackEvelynLanderCTA(segment?: string): void {
  const eventId = generateEventId();

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq(
      'trackSingleCustom',
      currentPixelId(),
      'EvelynLanderCTA',
      segment ? { segment } : {},
      { eventID: eventId },
    );
  }

  sendServerEvent('EvelynLanderCTA', eventId);
}

// Standard FB event fired once per account when email verification completes.
// Pairs with trackLead (which fires on signup form submit) for Meta's
// recommended pre-/post-verify funnel split.
export function trackCompleteRegistration(email?: string, firstName?: string): void {
  const eventId = generateEventId();

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackSingle', currentPixelId(), 'CompleteRegistration', {
      content_name: 'Account Verified',
    }, { eventID: eventId });
  }

  sendServerEvent('CompleteRegistration', eventId, {
    email,
    firstName,
    content_name: 'Account Verified',
  });
}

export function trackUpsellPurchase(
  value: number,
  currency: string = 'USD',
  email?: string,
  contentName: string = 'Manifestation Bracelet',
  mainSessionId?: string,
  // 'u1' = protection_ritual, 'u2' = manifestation_bracelet (V1 funnel),
  // 'sm' = soulmate_bracelet (soulmate funnel). Required to disambiguate
  // within the shared "Upsell" event_name across funnels.
  upsellSlot: 'u1' | 'u2' | 'sm' = 'u2',
  // V1/V1-FB callers pass skipServerRelay=true because the Stripe webhook's
  // fireStripePurchaseEvent already fires server-side with the same
  // deterministic event_id — avoids duplicate "Server / Deduplicated" rows.
  options?: { skipServerRelay?: boolean },
): void {
  const dedupKey = `upsell_purchase_tracked_${contentName}_${value}`;
  if (typeof window !== 'undefined' && sessionStorage.getItem(dedupKey)) {
    return;
  }
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(dedupKey, 'true');
  }

  const eventId = mainSessionId
    ? `upsell_${upsellSlot}_${mainSessionId}`
    : generateEventId();

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackSingleCustom', currentPixelId(), 'Upsell', {
      value,
      currency,
      content_name: contentName,
    }, { eventID: eventId });
  }

  if (!options?.skipServerRelay) {
    sendServerEvent('Upsell', eventId, {
      value,
      currency,
      email,
      content_name: contentName,
    });
  }
}

// Custom "Upsell2" event used by the V1-FB funnel /fb/success page so the
// Manifestation Bracelet purchase shows up as a distinct event line in Meta
// Events Manager (separate from the Upsell event fired for the Volcanic
// Stone). V1 (email-traffic) /success continues to fire trackUpsellPurchase
// → "Upsell" so historical reporting is unaffected.
export function trackUpsell2Purchase(
  value: number,
  currency: string = 'USD',
  email?: string,
  contentName: string = 'Manifestation Bracelet',
  mainSessionId?: string,
  // V1/V1-FB callers pass skipServerRelay=true because the Stripe webhook's
  // fireStripePurchaseEvent already fires server-side with the same
  // deterministic event_id — avoids duplicate "Server / Deduplicated" rows.
  options?: { skipServerRelay?: boolean },
): void {
  const dedupKey = `upsell2_purchase_tracked_${contentName}_${value}`;
  if (typeof window !== 'undefined' && sessionStorage.getItem(dedupKey)) {
    return;
  }
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(dedupKey, 'true');
  }

  const eventId = mainSessionId
    ? `upsell2_${mainSessionId}`
    : generateEventId();

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackSingleCustom', currentPixelId(), 'Upsell2', {
      value,
      currency,
      content_name: contentName,
    }, { eventID: eventId });
  }

  if (!options?.skipServerRelay) {
    sendServerEvent('Upsell2', eventId, {
      value,
      currency,
      email,
      content_name: contentName,
    });
  }
}
