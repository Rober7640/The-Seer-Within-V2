import crypto from 'crypto';
import { and, eq, sql } from 'drizzle-orm';
import logger from './logger';
import { db, getConversationByStripeSession } from './db';
import { creditPurchases, users } from '@shared/schema';

const FB_PIXEL_ID = process.env.FB_PIXEL_ID || '446814716830295';
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const FB_TEST_EVENT_CODE = process.env.FB_TEST_EVENT_CODE;
// When set, route CAPI through Stape's first-party domain (e.g.
// https://metrics.theseerwithin.com/data) instead of graph.facebook.com.
// Stape's Data Client expects a FLAT single-event JSON body (no `data: [...]`
// wrapper); access_token + test_event_code are configured inside the GTM tag,
// not in the request. When unset, fall back to direct Meta CAPI.
const FB_CAPI_ENDPOINT = process.env.FB_CAPI_ENDPOINT;

interface UserData {
  email?: string;
  firstName?: string;
  userAgent?: string;
  clientIpAddress?: string;
  fbc?: string;
  fbp?: string;
}

interface EventData {
  eventName: string;
  eventId: string;
  eventSourceUrl?: string;
  value?: number;
  currency?: string;
  contentName?: string;
  userData?: UserData;
}

function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

export async function sendFacebookEvent(data: EventData): Promise<{ success: boolean; error?: string }> {
  // FB_ACCESS_TOKEN is only required for the direct-to-Meta path. When routing
  // through Stape (FB_CAPI_ENDPOINT set), the access token lives in the GTM tag.
  if (!FB_CAPI_ENDPOINT && !FB_ACCESS_TOKEN) {
    logger.warn('FB_ACCESS_TOKEN not configured - skipping server-side event');
    return { success: false, error: 'FB_ACCESS_TOKEN not configured' };
  }

  try {
    const userData: Record<string, string> = {};
    
    if (data.userData?.email) {
      userData.em = hashValue(data.userData.email);
    }
    if (data.userData?.firstName) {
      userData.fn = hashValue(data.userData.firstName);
    }
    if (data.userData?.userAgent) {
      userData.client_user_agent = data.userData.userAgent;
    }
    if (data.userData?.clientIpAddress) {
      userData.client_ip_address = data.userData.clientIpAddress;
    }
    if (data.userData?.fbc) {
      userData.fbc = data.userData.fbc;
    }
    if (data.userData?.fbp) {
      userData.fbp = data.userData.fbp;
    }

    const customData: Record<string, unknown> = {};
    if (data.value !== undefined) {
      customData.value = data.value;
    }
    if (data.currency) {
      customData.currency = data.currency;
    }
    if (data.contentName) {
      customData.content_name = data.contentName;
    }

    const eventPayload = {
      event_name: data.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: data.eventId,
      event_source_url: data.eventSourceUrl,
      action_source: 'website',
      user_data: userData,
      custom_data: Object.keys(customData).length > 0 ? customData : undefined,
    };

    const url = FB_CAPI_ENDPOINT
      ?? `https://graph.facebook.com/v18.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`;
    const body = FB_CAPI_ENDPOINT
      ? JSON.stringify(eventPayload)
      : JSON.stringify({
          data: [eventPayload],
          ...(FB_TEST_EVENT_CODE ? { test_event_code: FB_TEST_EVENT_CODE } : {}),
        });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Facebook Conversions API error', { error: errorText });
      return { success: false, error: errorText };
    }

    const result = await response.json();
    logger.debug('FB Event sent', { eventName: data.eventName, eventId: data.eventId });
    return { success: true };
  } catch (error) {
    logger.error('Failed to send Facebook event', { error: String(error) });
    return { success: false, error: String(error) };
  }
}

// Fire-and-forget helper called from every place a V2 credit purchase flips
// from `pending` → `completed`. Emits a Meta `Purchase` event for EVERY
// completed purchase by a /aiden or /evelyn funnel-attributed user (gated
// on users.signup_funnel). Non-attributed users (signup_funnel IS NULL)
// stay silent so V2 reporting only reflects FB-attributed traffic.
//
// Sets event_source_url to ${BASE_URL}/${signupFunnel} so Meta Custom
// Conversion rules can segment per funnel via "URL contains" matching
// even though this event originates server-side.
//
// Never throws — payment processing must never be blocked by an FB tracking
// failure.
export async function fireV2PurchaseEvent(purchaseId: string): Promise<void> {
  try {
    const rows = await db
      .select({
        userId: creditPurchases.userId,
        priceUsd: creditPurchases.priceUsd,
      })
      .from(creditPurchases)
      .where(eq(creditPurchases.id, purchaseId))
      .limit(1);
    const purchase = rows[0];
    if (!purchase) {
      logger.warn('fireV2PurchaseEvent: purchase not found', { purchaseId });
      return;
    }

    const userRows = await db
      .select({
        email: users.email,
        firstName: users.firstName,
        signupFunnel: users.signupFunnel,
      })
      .from(users)
      .where(eq(users.id, purchase.userId))
      .limit(1);
    const user = userRows[0];
    if (!user) return;

    // Gate: only fire for /aiden or /evelyn funnel-attributed users
    if (user.signupFunnel !== 'aiden' && user.signupFunnel !== 'evelyn') {
      return;
    }

    const eventId = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const eventSourceUrl = `${baseUrl}/${user.signupFunnel}`;
    const contentName =
      user.signupFunnel === 'aiden' ? 'V2 Credits — Aiden' : 'V2 Credits — Evelyn';

    await sendFacebookEvent({
      eventName: 'Purchase',
      eventId,
      eventSourceUrl,
      value: (purchase.priceUsd ?? 0) / 100,
      currency: 'USD',
      contentName,
      userData: {
        email: user.email,
        firstName: user.firstName,
      },
    });

    logger.info('FB V2 Purchase event fired', {
      userId: purchase.userId,
      purchaseId,
      eventId,
      funnel: user.signupFunnel,
      valueUsd: (purchase.priceUsd ?? 0) / 100,
    });
  } catch (err) {
    logger.error('fireV2PurchaseEvent failed', { purchaseId, err: String(err) });
  }
}

// ============================================================
// V1 / V1-FB Stripe-triggered FB event firing (webhook path)
// ============================================================
// Server-side counterpart to client Pixel fires in UpsellPage / Upsell2Page /
// SuccessPage. Recovers events when the browser tab closes or adblock blocks
// `/api/fb-event`. Event ID scheme is deterministic and MUST match the client
// equivalent in client/src/lib/facebook.ts so Pixel + CAPI dedup cleanly.
// `mainSessionId` is the ORIGINAL main-purchase Checkout Session id; upsells
// key off metadata.originalSession so 1-click and fallback-Checkout paths
// produce identical ids.

const FB_PRODUCT_NAMES: Record<string, string> = {
  energy_clearing_ritual: 'Energy Clearing Ritual',
  protection_ritual: 'Volcanic Stone (aka Black Lava)',
  manifestation_bracelet: 'Manifestation Bracelet',
};

function resolveStripeEventName(
  product: string,
  funnel?: string,
): 'Purchase' | 'Upsell' | 'Upsell2' | null {
  switch (product) {
    case 'energy_clearing_ritual':
      return 'Purchase';
    case 'protection_ritual':
      return 'Upsell';
    case 'manifestation_bracelet':
      return funnel === 'v1-fb' ? 'Upsell2' : 'Upsell';
    default:
      return null;
  }
}

function makeStripeEventId(
  eventName: 'Purchase' | 'Upsell' | 'Upsell2',
  product: string,
  mainSessionId: string,
): string {
  if (eventName === 'Purchase') return `purchase_${mainSessionId}`;
  if (eventName === 'Upsell2') return `upsell2_${mainSessionId}`;
  // Upsell — disambiguate U1 (protection_ritual) from U2 (manifestation_bracelet
  // on V1) since both share event_name.
  const suffix = product === 'protection_ritual' ? 'u1' : 'u2';
  return `upsell_${suffix}_${mainSessionId}`;
}

function eventSourceUrlForStripeEvent(product: string, funnel?: string): string {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const prefix = funnel === 'v1-fb' ? '/fb' : '';
  switch (product) {
    case 'energy_clearing_ritual':
      return `${baseUrl}${prefix}/welcome1`;
    case 'protection_ritual':
      return `${baseUrl}${prefix}/welcome2`;
    case 'manifestation_bracelet':
      return `${baseUrl}${prefix}/success`;
    default:
      return `${baseUrl}${prefix}/`;
  }
}

interface StripeFbEventParams {
  // Pass the id we want surfaced in logs/dashboards — Checkout Session id for
  // main + fallback paths, PaymentIntent id for 1-click paths.
  stripeRefId: string;
  // Original main-purchase Checkout Session id. For the main Purchase fire this
  // equals stripeRefId. For upsells, this is metadata.originalSession.
  mainSessionId: string;
  product: string;
  type?: string;
  funnel?: string;
  amountCents: number;
  email?: string;
  firstName?: string;
}

export async function fireStripePurchaseEvent(
  params: StripeFbEventParams,
): Promise<void> {
  try {
    const eventName = resolveStripeEventName(params.product, params.funnel);
    if (!eventName) {
      logger.warn('fireStripePurchaseEvent: unknown product, skipping', {
        product: params.product,
      });
      return;
    }

    const eventId = makeStripeEventId(eventName, params.product, params.mainSessionId);

    // Backfill email/firstName when missing (1-click upsell PIs don't carry
    // them in metadata; pull from the original conversation row).
    let email = params.email;
    let firstName = params.firstName;
    if ((!email || !firstName) && params.mainSessionId) {
      try {
        const conv = await getConversationByStripeSession(params.mainSessionId);
        email = email || conv?.email || undefined;
        firstName = firstName || conv?.firstName || undefined;
      } catch (err) {
        logger.warn('fireStripePurchaseEvent: DB backfill failed', {
          err: String(err),
          mainSessionId: params.mainSessionId,
        });
      }
    }

    const contentName = FB_PRODUCT_NAMES[params.product] ?? '';

    await sendFacebookEvent({
      eventName,
      eventId,
      eventSourceUrl: eventSourceUrlForStripeEvent(params.product, params.funnel),
      value: params.amountCents / 100,
      currency: 'USD',
      contentName,
      userData: { email, firstName },
    });

    logger.info('FB Stripe event fired', {
      eventName,
      eventId,
      product: params.product,
      funnel: params.funnel ?? 'v1',
      stripeRefId: params.stripeRefId,
      valueUsd: params.amountCents / 100,
    });
  } catch (err) {
    logger.error('fireStripePurchaseEvent failed', {
      err: String(err),
      stripeRefId: params.stripeRefId,
      product: params.product,
    });
  }
}

// ============================================================
// Server-side Lead event firing (called from /api/lead)
// ============================================================
// event_id is `lead_${sha256(email).slice(0,16)}` — deterministic, matches
// client-side trackLead so Pixel + CAPI dedup cleanly.

export interface LeadFbEventParams {
  email: string;
  firstName?: string;
  funnel?: string;
  userAgent?: string;
  clientIpAddress?: string;
  fbc?: string;
  fbp?: string;
}

export function makeLeadEventId(email: string): string {
  const normalized = email.toLowerCase().trim();
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  return `lead_${hash.slice(0, 16)}`;
}

export async function fireLeadEvent(params: LeadFbEventParams): Promise<void> {
  try {
    if (!params.email) return;
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const prefix = params.funnel === 'v1-fb' ? '/fb' : '';
    const eventSourceUrl = `${baseUrl}${prefix}/chat`;
    await sendFacebookEvent({
      eventName: 'Lead',
      eventId: makeLeadEventId(params.email),
      eventSourceUrl,
      contentName: 'Email Capture',
      userData: {
        email: params.email,
        firstName: params.firstName,
        userAgent: params.userAgent,
        clientIpAddress: params.clientIpAddress,
        fbc: params.fbc,
        fbp: params.fbp,
      },
    });
    logger.info('FB Lead event fired (server-side)', {
      email: params.email,
      funnel: params.funnel ?? 'v1',
    });
  } catch (err) {
    logger.error('fireLeadEvent failed', { err: String(err), email: params.email });
  }
}

// LEGACY — kept dormant (zero callers as of 2026-05-12) for potential
// "lifetime-first" custom event use later. Same body shape as
// fireV2PurchaseEvent above but with a first-purchase gate. Do NOT call this
// for standard Purchase tracking — use fireV2PurchaseEvent.
export async function maybeFireFirstPurchaseEvent(purchaseId: string): Promise<void> {
  try {
    const rows = await db
      .select({
        userId: creditPurchases.userId,
        priceUsd: creditPurchases.priceUsd,
      })
      .from(creditPurchases)
      .where(eq(creditPurchases.id, purchaseId))
      .limit(1);
    const purchase = rows[0];
    if (!purchase) {
      logger.warn('maybeFireFirstPurchaseEvent: purchase not found', { purchaseId });
      return;
    }

    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(creditPurchases)
      .where(
        and(
          eq(creditPurchases.userId, purchase.userId),
          eq(creditPurchases.status, 'completed'),
        ),
      );
    const completedCount = countRows[0]?.count ?? 0;

    if (completedCount !== 1) {
      // 0 = race or freshly-rolled-back state; >1 = subsequent purchase.
      // Either way, do not fire.
      return;
    }

    const userRows = await db
      .select({ email: users.email, firstName: users.firstName })
      .from(users)
      .where(eq(users.id, purchase.userId))
      .limit(1);
    const user = userRows[0];
    if (!user) return;

    const eventId = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    await sendFacebookEvent({
      eventName: 'Purchase',
      eventId,
      value: (purchase.priceUsd ?? 0) / 100,
      currency: 'USD',
      contentName: 'V2 Credit Purchase (first-ever)',
      userData: {
        email: user.email,
        firstName: user.firstName,
      },
    });

    logger.info('FB first-purchase event fired', {
      userId: purchase.userId,
      purchaseId,
      eventId,
      valueUsd: (purchase.priceUsd ?? 0) / 100,
    });
  } catch (err) {
    logger.error('maybeFireFirstPurchaseEvent failed', { purchaseId, err: String(err) });
  }
}
