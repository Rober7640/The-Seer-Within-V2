import crypto from 'crypto';
import { and, eq, sql } from 'drizzle-orm';
import logger from './logger';
import { db } from './db';
import { creditPurchases, users } from '@shared/schema';

const FB_PIXEL_ID = process.env.FB_PIXEL_ID || '446814716830295';
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const FB_TEST_EVENT_CODE = process.env.FB_TEST_EVENT_CODE;

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
  if (!FB_ACCESS_TOKEN) {
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

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [eventPayload],
          ...(FB_TEST_EVENT_CODE ? { test_event_code: FB_TEST_EVENT_CODE } : {}),
        }),
      }
    );

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
