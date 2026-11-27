// /fb Upsell 2 copy test (v1_fb_u2_copy_2026): who is in, and the one call that assigns,
// logs and answers. The route (GET /api/fb/u2-copy in server/routes.ts) is a thin wrapper.
//
// Everything is read off HER ORDER ROW, found by the checkout session id the Upsell 2 page
// already carries. Nothing the client says decides eligibility.
//
// ⛔ Every failure path answers today's copy, and only an assigned, enrolled arm is logged.

import type { Conversation } from '@shared/schema';
import { funnelParamFromPriceVariant } from '@shared/funnelConfig';
import { hashEmail } from './experiments';

export interface FbU2CopyAnswer {
  copy: 'today' | 'magnet';
  candle: boolean;
}

export const FB_U2_COPY_TODAY: FbU2CopyAnswer = { copy: 'today', candle: false };

/**
 * Upsell 2's price. NOT an eligibility rule: it is the same for every V1 order. The $47 /
 * $30 pair is hard-coded at every V1 charge site (/api/upsell2/charge, the hosted
 * /api/upsell2/fallback-checkout, and upsell2Cents() for Payments.AI orders), and no
 * experiment or price variant moves it. Only the backend offers' be_bracelet has its own
 * price, and those pages never ask for this test. Kept here so the spec, the SQL and the
 * tally have one place that says it.
 */
export const FB_U2_COPY_PRICE_CENTS = { full: 4700, downsell: 3000 } as const;

const TOPICS = ['love', 'money', 'purpose', 'someone'];

// A Stripe checkout session (cs_test_/cs_live_) or a Payments.AI order (txn_), the two ids
// the Upsell 2 page is ever opened with. Anything else is not an order.
const ORDER_ID_RE = /^(cs_(test|live)_[A-Za-z0-9]{10,200}|txn_[A-Za-z0-9_-]{4,200})$/;

export type FbU2CopyRow = Pick<
  Conversation,
  'id' | 'email' | 'priceVariant' | 'lane' | 'bucket' | 'abVisitorId' | 'upsellPurchased'
>;

/**
 * Why this order is NOT in the test, or null when it is.
 *
 *  - not_fb:  /fb is read from price_variant (the `_fb` token, funnelParamFromPriceVariant),
 *             the same server-side funnel record the Upsell 1 copy test uses. A variant
 *             without the token (/fb2, /fb-tarot, root, none) is out. This also keeps out
 *             every /fb-tarot RETARGET order (their fixed Upsell 2 copy, retargetUpsell2.ts):
 *             those are v1-tarot or have no variant at all (couldBeRetargetOrder).
 *  - lane:    any belief lane (/fb?lane=<id>), written once at lead capture. Same as U1.
 *  - bucket:  arm B is written per topic, so an unknown topic can only see today's copy.
 *
 * No price rule: Upsell 2 is $47 / $30 for every V1 order (FB_U2_COPY_PRICE_CENTS).
 * Both paths (A bought Upsell 1, B declined it) and both /fb chat-flow arms are in.
 */
export function fbU2CopyIneligible(row: FbU2CopyRow | null | undefined): string | null {
  if (!row) return 'no_order';
  if (typeof row.email !== 'string' || !row.email.trim()) return 'no_email';
  if (funnelParamFromPriceVariant(row.priceVariant) !== 'v1-fb') return 'not_fb';
  if (row.lane) return 'lane';
  if (typeof row.bucket !== 'string' || !TOPICS.includes(row.bucket)) return 'bucket';
  return null;
}

/**
 * Path A (she bought Upsell 1, so she has an address) or Path B (she declined it). The page
 * reads the very same column (/api/upsell2/user-data → upsellPurchased), so the path logged
 * here is the opening she is shown.
 */
export function fbU2Path(row: Pick<FbU2CopyRow, 'upsellPurchased'>): 'A' | 'B' {
  return row.upsellPurchased === true ? 'A' : 'B';
}

export interface FbU2ExposureContext {
  conversationId: string;
  funnel: 'v1-fb';
  path: 'A' | 'B';
  topic: string;
  // true only when RITUAL_INSTRUCTION bubble 2 names the candle: arm B AND she saw it.
  candle: boolean;
}

export interface FbU2CopyDeps {
  findOrder(orderId: string): Promise<FbU2CopyRow | null>;
  resolveArm(email: string): Promise<{ magnet: boolean; variant: string | null; enrolled: boolean }>;
  sawCandle(visitorIds: string[]): Promise<boolean>;
  logExposure(subjectId: string, variant: string, context: FbU2ExposureContext): Promise<void>;
}

/**
 * Assign, log and answer, for the order this Upsell 2 page was opened with.
 *
 * `cookieVisitorId` is this browser's ab_vid (read, never set): it and the row's own
 * ab_visitor_id are the two ids her /fb chat could have been logged under.
 *
 * The exposure is written LAST, after everything else is known, so the gap between
 * "logged" and "answered" is as small as it can be.
 */
export async function fbU2CopyForOrder(
  orderId: unknown,
  cookieVisitorId: string | null | undefined,
  deps: FbU2CopyDeps,
): Promise<FbU2CopyAnswer> {
  try {
    if (typeof orderId !== 'string' || !ORDER_ID_RE.test(orderId)) return FB_U2_COPY_TODAY;
    const row = await deps.findOrder(orderId);
    if (!row || fbU2CopyIneligible(row)) return FB_U2_COPY_TODAY;

    const arm = await deps.resolveArm(row.email);

    let candle = false;
    if (arm.magnet) {
      const ids = Array.from(
        new Set([row.abVisitorId, cookieVisitorId].filter((v): v is string => !!v)),
      );
      candle = ids.length > 0 ? await deps.sawCandle(ids) : false;
    }

    if (arm.enrolled && arm.variant) {
      await deps.logExposure(hashEmail(row.email), arm.variant, {
        conversationId: row.id,
        funnel: 'v1-fb',
        path: fbU2Path(row),
        topic: row.bucket as string,
        candle: arm.magnet && candle,
      });
    }

    return arm.magnet ? { copy: 'magnet', candle } : FB_U2_COPY_TODAY;
  } catch {
    return FB_U2_COPY_TODAY;
  }
}
