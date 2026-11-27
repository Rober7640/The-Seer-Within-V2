// /fb Upsell 1 copy test (v1_fb_u1_copy_2026): who is in, and the one call that assigns,
// logs and answers. The route (GET /api/fb/u1-copy in server/routes.ts) is a thin wrapper.
//
// Everything is read off HER ORDER ROW, found by the checkout session id the Upsell 1 page
// already carries. Nothing the client says decides eligibility.
//
// ⛔ Every failure path answers today's copy, and only an assigned, enrolled arm is logged.

import type { Conversation } from '@shared/schema';
import { funnelParamFromPriceVariant } from '@shared/funnelConfig';
import { hashEmail } from './experiments';

export interface FbU1CopyAnswer {
  copy: 'today' | 'filter';
  candle: boolean;
}

export const FB_U1_COPY_TODAY: FbU1CopyAnswer = { copy: 'today', candle: false };

/** The only Upsell 1 price this test runs at (the operator's call, 2026-11-27). */
export const FB_U1_COPY_PRICE_CENTS = 4700;

const TOPICS = ['love', 'money', 'purpose', 'someone'];

// A Stripe checkout session (cs_test_/cs_live_) or a Payments.AI order (txn_), the two ids
// the Upsell 1 page is ever opened with. Anything else is not an order.
const ORDER_ID_RE = /^(cs_(test|live)_[A-Za-z0-9]{10,200}|txn_[A-Za-z0-9_-]{4,200})$/;

export type FbU1CopyRow = Pick<
  Conversation,
  'id' | 'email' | 'priceVariant' | 'lane' | 'upsell1AmountCents' | 'bucket' | 'abVisitorId'
>;

/**
 * Why this order is NOT in the test, or null when it is.
 *
 *  - not_fb:  /fb is read from price_variant (the `_fb` token, funnelParamFromPriceVariant),
 *             the same server-side funnel record the email tags and the retarget and
 *             thank-you gifts already use. conversations has no funnel column. A variant
 *             without the token (/fb2, /fb-tarot, root, none) is out.
 *  - lane:    any belief lane (/fb?lane=<id>), written once at lead capture.
 *  - price:   exactly 4700 on the row. NULL is out too: the row never stored a price.
 *  - bucket:  arm B is written per topic, so an unknown topic can only see today's copy.
 */
export function fbU1CopyIneligible(row: FbU1CopyRow | null | undefined): string | null {
  if (!row) return 'no_order';
  if (typeof row.email !== 'string' || !row.email.trim()) return 'no_email';
  if (funnelParamFromPriceVariant(row.priceVariant) !== 'v1-fb') return 'not_fb';
  if (row.lane) return 'lane';
  if (row.upsell1AmountCents !== FB_U1_COPY_PRICE_CENTS) return 'price';
  if (typeof row.bucket !== 'string' || !TOPICS.includes(row.bucket)) return 'bucket';
  return null;
}

export interface FbU1CopyDeps {
  findOrder(orderId: string): Promise<FbU1CopyRow | null>;
  resolveArm(email: string): Promise<{ filter: boolean; variant: string | null; enrolled: boolean }>;
  sawCandle(visitorIds: string[]): Promise<boolean>;
  logExposure(
    subjectId: string,
    variant: string,
    context: { conversationId: string; funnel: 'v1-fb' },
  ): Promise<void>;
}

/**
 * Assign, log and answer, for the order this Upsell 1 page was opened with.
 *
 * `cookieVisitorId` is this browser's ab_vid (read, never set): it and the row's own
 * ab_visitor_id are the two ids her /fb chat could have been logged under.
 *
 * The exposure is written LAST, after everything else is known, so the gap between
 * "logged" and "answered" is as small as it can be.
 */
export async function fbU1CopyForOrder(
  orderId: unknown,
  cookieVisitorId: string | null | undefined,
  deps: FbU1CopyDeps,
): Promise<FbU1CopyAnswer> {
  try {
    if (typeof orderId !== 'string' || !ORDER_ID_RE.test(orderId)) return FB_U1_COPY_TODAY;
    const row = await deps.findOrder(orderId);
    if (!row || fbU1CopyIneligible(row)) return FB_U1_COPY_TODAY;

    const arm = await deps.resolveArm(row.email);

    let candle = false;
    if (arm.filter) {
      const ids = Array.from(
        new Set([row.abVisitorId, cookieVisitorId].filter((v): v is string => !!v)),
      );
      candle = ids.length > 0 ? await deps.sawCandle(ids) : false;
    }

    if (arm.enrolled && arm.variant) {
      await deps.logExposure(hashEmail(row.email), arm.variant, {
        conversationId: row.id,
        funnel: 'v1-fb',
      });
    }

    return arm.filter ? { copy: 'filter', candle } : FB_U1_COPY_TODAY;
  } catch {
    return FB_U1_COPY_TODAY;
  }
}
