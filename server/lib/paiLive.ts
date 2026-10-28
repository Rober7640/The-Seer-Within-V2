/**
 * The LIVE Stripe-vs-Payments.AI split — the Payments.AI half of the real funnel.
 *
 * WHAT THIS IS. Lewis, 2026-10-12: the three landers with live FB traffic serve 50%
 * of buyers through Stripe exactly as today and 50% through Payments.AI, assigned by
 * an ordinary admin experiment (shared/paymentGateway.ts) so it can be started,
 * paused and read from /admin/experiments.
 *
 * HOW IT STAYS OUT OF STRIPE'S WAY.
 *   - The gateway is decided ONCE, in /api/checkout, and only for a lander on the
 *     hard allow-list (paiEligibleLander). Everything else never calls in here.
 *   - From then on the ORDER ID says which processor it is on: Payments.AI ids are
 *     `txn_…`, Stripe's are `cs_…` (isPaiOrderId). welcome1, the upsells and the
 *     shipping saves branch on that prefix at their very first line, so a Stripe
 *     order takes no new code and no new lookup anywhere on its way through.
 *   - Every side effect the Stripe webhook and the 1-click upsell routes fire is
 *     fired here too, with the SAME writer functions, the SAME list ids and the SAME
 *     tags (plus `paymentsAI`), so the two arms report identically. The few helpers
 *     that live privately inside routes.ts are passed in (PaiLiveDeps) rather than
 *     moved, so not a line of the Stripe path had to change to share them.
 *
 * WHAT IS PROVEN ALREADY (dev harness /fb-tarot/pai, 8-9 Oct, sandbox): FramePay
 * tokenise → CIT → saved card → MIT upsells; 3DS challenge round trip; declines;
 * phone + SMS consent; once-per-order upsells; Mike's n8n fulfilling from the
 * webhook. This module is that flow wired into the real pages.
 */
import crypto from 'crypto';
import logger from './logger';
import {
  charge,
  createCustomer,
  settleTransaction,
  assertCitApproved,
  instrumentIdOf,
  pendingChallengeLink,
  getTransaction,
  mergeTransactionMetadata,
  updateCustomerAddress,
  liveConfig,
  paiLiveReady,
  isSandboxBase,
  type PaiTransaction,
} from './paymentsai';
import {
  addPaidSubscriber,
  addBumpPaidSubscriber,
  addUpsellSubscriber,
  addUpsell2Subscriber,
} from './aweber';
import {
  db,
  updateStripeData,
  markMainPaid,
  savePhoneForSession,
  recordSmsConsent,
  markUpsellPurchased,
  markUpsell2Purchased,
  getConversationByStripeSession,
  saveShippingAddress,
  saveShipping2Address,
} from './db';
import { assign, hashEmail } from './experiments';
import { posthog } from './posthog';
import { buildPurchaseEvent } from './purchaseAnalytics';
import { fireStripePurchaseEvent } from './facebook';
import { fireGoogleAdsConversion, gadsStepForProduct } from './googleAds';
import { reportTrackdeskConversion } from './trackdesk';
import {
  SMS_CONSENT_LABEL,
  SMS_CONSENT_NO_LABEL,
  SMS_CONSENT_VERSION,
  SMS_CONSENT_YES_LABEL,
  showsSmsConsent,
  smsConsentDisclosure,
  smsConsentRecordText,
} from './smsConsent';
import { bumpPaidListWanted } from '@shared/landerBumpRouting';
import { srcMetadata, type CheckoutSrc } from '@shared/orderBump';
import {
  GATEWAY_ARM_PAI,
  GATEWAY_EXPERIMENT_KEY,
  isPaiOrderId,
  paiEligibleLander,
} from '@shared/paymentGateway';
import { funnelDefForParam, type FunnelParam } from '@shared/funnelConfig';
import { paymentAttempts, type Conversation } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * A fresh idempotency key for one charge.
 *
 * 🔴 PAYMENTS.AI CAPS idempotencyKey AT 50 CHARACTERS and answers a longer one with an
 * opaque 422 "Transaction action failed." (no detail) — proven in the sandbox
 * 2026-10-12: 54 chars refused, the same request at 50 accepted. A `prefix-<uuid>`
 * key silently crosses the line once the prefix passes 13 characters, which is how
 * the upsell card page broke. Kept to ≤ 40 here.
 */
export function idemKey(tag: string): string {
  const key = `live-${tag}-${crypto.randomBytes(10).toString('hex')}`;
  return key.length <= 50 ? key : key.slice(0, 50);
}

/** A housekeeping timer that never keeps the process alive on its own. */
function later(fn: () => void, ms: number): void {
  setTimeout(fn, ms).unref?.();
}

/** The AWeber tag on every Payments.AI buyer, beside the live tags (never instead). */
export const PAI_TAG = 'paymentsAI';

// ── Helpers that live privately in routes.ts, passed in rather than moved ───────
export interface PaiLiveDeps {
  fbifyAweberTags: (tags: string[], funnel: FunnelParam | undefined) => string[];
  funnelPath: (v1Path: string, funnel: FunnelParam | undefined) => string;
  fbPosthogName: (funnel: FunnelParam | undefined) => string;
  fbTagSuffix: (funnel: FunnelParam | undefined) => string;
  isFbFunnel: (funnel: FunnelParam | undefined) => boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. WHICH GATEWAY — decided once, in /api/checkout
// ═══════════════════════════════════════════════════════════════════════════════

export interface GatewayDecision {
  gateway: 'stripe' | 'paymentsai';
  /** The arm, when the experiment applies — what the exposure records. */
  variant: string | null;
  /** Running + in scope ⇒ log the exposure (the denominator). */
  enrolled: boolean;
  /** Why it is Stripe, for the log. */
  reason?: string;
}

/**
 * TEST BUYERS (28 Oct) — `PAI_TEST_BUYERS`, comma-separated emails. A listed email is
 * sent to Payments.AI whatever the split says (draft or paused too) and pays
 * TEST_BUYER_CENTS for the main, the bump and each upsell. For a real-card check on
 * Production BEFORE the split starts. Unset or empty ⇒ nobody, and nothing changes.
 * Never enrolled: a test buyer writes no exposure, so the split report stays clean.
 */
export const TEST_BUYER_CENTS = 10;

export function isPaiTestBuyer(email: unknown): boolean {
  if (typeof email !== 'string' || !email.trim()) return false;
  const list = (process.env.PAI_TEST_BUYERS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

/** `cents`, or TEST_BUYER_CENTS for a listed test buyer. */
export function testBuyerCents(email: unknown, cents: number): number {
  return isPaiTestBuyer(email) ? TEST_BUYER_CENTS : cents;
}

const STRIPE = (reason: string): GatewayDecision => ({
  gateway: 'stripe',
  variant: null,
  enrolled: false,
  reason,
});

/**
 * Stripe unless EVERY one of these holds — and any error is Stripe:
 *   - PAI_LIVE_ENABLED=1 and a complete PAI_LIVE_* config on this deploy
 *   - she has an email (Payments.AI needs a customer; the no-optin arm stays Stripe)
 *   - the lander is on the hard allow-list
 *   - the experiment is running (or concluded on Payments.AI) and puts her there
 *
 * 🔴 Not configured ⇒ NOT ENROLLED, not merely Stripe. An enrolled "paymentsai"
 * exposure for a buyer who was actually sent to Stripe would poison the report.
 */
export async function resolveGateway(args: {
  email: unknown;
  funnel: FunnelParam | undefined;
  hook?: string;
  deck?: string;
  noemail?: boolean;
}): Promise<GatewayDecision> {
  try {
    const ready = paiLiveReady();
    if (!ready.ready) return STRIPE(`payments.ai not ready: ${ready.reason}`);
    if (!orderSecret()) return STRIPE('no order-signing secret');
    if (args.noemail) return STRIPE('no-optin arm');
    const email = typeof args.email === 'string' ? args.email.trim().toLowerCase() : '';
    if (!email) return STRIPE('no email');
    if (!paiEligibleLander(args.funnel, args.hook)) return STRIPE('lander not eligible');
    if (isPaiTestBuyer(email)) {
      return { gateway: 'paymentsai', variant: null, enrolled: false, reason: 'test buyer' };
    }

    // Subject = hashEmail, the SAME id the exposure row is keyed on, so the opt-in
    // assignment freeze (scope.freezeAssignment) finds her first exposure.
    const a = await assign(GATEWAY_EXPERIMENT_KEY, hashEmail(email), {
      funnel: args.funnel ?? null,
      hook: args.hook ?? null,
      deck: args.deck ?? null,
    });
    if (!a) return STRIPE('experiment not found');
    const pai = a.applied && a.variant === GATEWAY_ARM_PAI;
    return {
      gateway: pai ? 'paymentsai' : 'stripe',
      variant: a.enrolled || a.applied ? a.variant : null,
      enrolled: a.enrolled,
    };
  } catch (err) {
    logger.error('[pai-live] gateway resolution failed — Stripe', { err: String(err) });
    return STRIPE('error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. THE ORDER — priced by /api/checkout, carried to the card form, signed
// ═══════════════════════════════════════════════════════════════════════════════
//
// /api/checkout already resolved everything a Stripe session is created from — the
// price arm, the bump arm, the bump key, the funnel. The Payments.AI card form posts
// back later, so that decision rides along as a SIGNED token: the browser can carry
// it but cannot change a price, a product or a list. Stateless, so a restart or a
// second server between the click and the card does not lose the order.

export interface PaiOrder {
  v: 1;
  email: string;
  firstName: string;
  bucket: string | null;
  funnel: FunnelParam | null;
  hook: string | null;
  deck: string | null;
  type: 'main' | 'downsell';
  /** The headline price alone — what mainPurchaseAmount stores. */
  mainCents: number;
  bumpOffered: boolean;
  bumpApplied: boolean;
  bumpCents: number;
  bumpBucket: string | null;
  bumpProduct: string | null;
  priceVariant: string;
  productName: string;
  gclid: string | null;
  trackdeskClickId: string | null;
  posthogDistinctId: string | null;
  /** 'recovery' | 'retarget' — the closed set from normaliseSrc (shared/orderBump). */
  src: CheckoutSrc | null;
  readDevice: string | null;
  /** Issued-at, ms. */
  iat: number;
}

/** How long a priced order may wait for her card. Generous: 3DS can be slow. */
export const ORDER_TTL_MS = 6 * 60 * 60 * 1000;

function orderSecret(): string | null {
  return process.env.PAI_ORDER_SECRET || process.env.JWT_SECRET || null;
}

function hmac(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('base64url');
}

export function signOrder(order: PaiOrder, secret = orderSecret()): string {
  if (!secret) throw new Error('no order-signing secret');
  const body = Buffer.from(JSON.stringify(order), 'utf8').toString('base64url');
  return `${body}.${hmac(body, secret)}`;
}

export function verifyOrder(
  token: unknown,
  now = Date.now(),
  secret = orderSecret(),
): PaiOrder | null {
  if (!secret || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = hmac(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const order = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as PaiOrder;
    if (order?.v !== 1 || typeof order.iat !== 'number') return null;
    if (now - order.iat > ORDER_TTL_MS || order.iat - now > 60_000) return null;
    return order;
  } catch {
    return null;
  }
}

/** What she is charged at checkout: the main offer plus the bump when she took it. */
export function orderTotalCents(order: Pick<PaiOrder, 'mainCents' | 'bumpApplied' | 'bumpCents'>): number {
  return order.mainCents + (order.bumpApplied ? order.bumpCents : 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. payment_attempts — every attempt, approved or not, both processors
// ═══════════════════════════════════════════════════════════════════════════════

export interface AttemptRecord {
  gateway: 'stripe' | 'paymentsai';
  step: 'main' | 'upsell1' | 'upsell2';
  initiator: 'cit' | 'mit';
  result: 'approved' | 'declined' | 'error' | 'needs_action';
  amountCents: number;
  processorRef?: string | null;
  orderRef?: string | null;
  declineReason?: string | null;
  email?: string | null;
  funnel?: string | null;
  hook?: string | null;
}

/** Fire-and-forget. Never throws, never delays a charge. */
export function recordPaymentAttempt(a: AttemptRecord): void {
  void db
    .insert(paymentAttempts)
    .values({
      gateway: a.gateway,
      step: a.step,
      initiator: a.initiator,
      result: a.result,
      amountCents: Math.round(a.amountCents) || 0,
      processorRef: a.processorRef ?? null,
      orderRef: a.orderRef ?? null,
      declineReason: a.declineReason ? String(a.declineReason).slice(0, 300) : null,
      email: a.email ?? null,
      funnel: a.funnel ?? null,
      hook: a.hook ?? null,
    })
    .catch((err: unknown) =>
      logger.error('[payment_attempts] insert failed (non-blocking)', { err: String(err) }),
    );
}

/** The funnel recorded on a Payments.AI attempt — for the shipping saves. */
export async function funnelForPaiPayment(processorRef: string | null | undefined): Promise<FunnelParam | undefined> {
  if (!processorRef) return undefined;
  try {
    const rows = await db
      .select({ funnel: paymentAttempts.funnel })
      .from(paymentAttempts)
      .where(eq(paymentAttempts.processorRef, processorRef))
      .limit(1);
    return funnelDefForParam(rows[0]?.funnel)?.param;
  } catch (err) {
    logger.warn('[pai-live] funnel lookup failed', { err: String(err) });
    return undefined;
  }
}

/**
 * A refused charge request, as text for the log and payment_attempts. Their `message`
 * alone is often just "Transaction action failed." — the body says why.
 */
function chargeErrorText(tx: { error?: string; status: number; raw?: string }): string {
  const text = `${tx.error ?? `HTTP ${tx.status}`} · HTTP ${tx.status}${tx.raw ? ` · ${tx.raw.slice(0, 220)}` : ''}`;
  logger.warn(`[pai-live] charge refused: ${text}`);
  return text;
}

/** Map a settled transaction onto an attempt result. */
function resultOf(tx: PaiTransaction | null | undefined): AttemptRecord['result'] {
  const r = String(tx?.result ?? '').toLowerCase();
  if (r === 'approved') return 'approved';
  if (r === 'declined') return 'declined';
  if (pendingChallengeLink(tx)) return 'needs_action';
  return 'error';
}

function declineReasonOf(tx: PaiTransaction | null | undefined): string | null {
  const t = tx as (PaiTransaction & Record<string, unknown>) | null | undefined;
  if (!t) return null;
  const parts = [t.result, t.status, t.message, t.processorResponse, (t as any).declineReason]
    .filter((x) => typeof x === 'string' && x);
  return parts.length ? parts.join(' · ') : null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. MAIN PURCHASE (customer-initiated)
// ═══════════════════════════════════════════════════════════════════════════════

/** E.164 with the country code — what Payments.AI support asked for. */
export function normalizePhone(raw: unknown): string | null {
  const s = String(raw ?? '').replace(/[\s\-().]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

/** The provider metadata — the same keys the Stripe session carries. */
export function mainMetadata(order: PaiOrder): Record<string, string> {
  return {
    product: 'energy_clearing_ritual',
    type: order.type,
    ...(order.funnel ? { funnel: order.funnel } : {}),
    ...(order.bucket ? { bucket: order.bucket } : {}),
    firstName: order.firstName,
    email: order.email,
    app: 'the-seer-within',
    priceVariant: order.priceVariant,
    ...(order.readDevice ? { readDevice: order.readDevice } : {}),
    ...(order.trackdeskClickId ? { trackdeskClickId: order.trackdeskClickId } : {}),
    ...(order.gclid ? { gclid: order.gclid } : {}),
    ...(order.posthogDistinctId ? { posthogDistinctId: order.posthogDistinctId } : {}),
    ...(order.src ? { src: order.src } : {}),
    ...(order.bumpApplied && order.bumpProduct
      ? {
          bumpProduct: order.bumpProduct,
          ...(order.bumpBucket ? { bumpBucket: order.bumpBucket } : {}),
          bumpAmount: String(order.bumpCents),
        }
      : {}),
  };
}

export interface MainChargeInput {
  order: PaiOrder;
  cardToken: string;
  phone: string;
  smsAnswer: unknown;
  ip?: string;
  /** Where 3DS sends her back to. */
  returnUrl: string;
  /** Base for the SMS policy links (BASE_URL or this host). */
  policyBase: string;
}

export type MainOutcome =
  | { kind: 'approved'; transactionId: string; redirect: string; totalCents: number }
  | { kind: 'needs3ds'; transactionId: string; approvalLink: string }
  | { kind: 'declined'; transactionId?: string; message: string }
  | { kind: 'error'; message: string };

const DECLINED_COPY = 'Your card was declined. Please check the details or try a different card.';

/**
 * In-flight guard per order: a double-click on Pay must never create two charges.
 * Keyed on the signed token, which is unique per priced order.
 */
const MAIN_IN_FLIGHT = new Map<string, Promise<MainOutcome>>();

export async function chargeMain(input: MainChargeInput, deps: PaiLiveDeps): Promise<MainOutcome> {
  const key = crypto.createHash('sha256').update(signOrder(input.order)).digest('hex');
  const prior = MAIN_IN_FLIGHT.get(key);
  if (prior) return prior;
  const run = chargeMainOnce(input, deps);
  MAIN_IN_FLIGHT.set(key, run);
  // Keep a finished APPROVAL around so a late double-click gets the same answer;
  // anything else may be retried with another card straight away.
  run.then(
    (o) => {
      if (o.kind === 'approved') later(() => MAIN_IN_FLIGHT.delete(key), 10 * 60 * 1000);
      else MAIN_IN_FLIGHT.delete(key);
    },
    () => MAIN_IN_FLIGHT.delete(key),
  );
  return run;
}

async function chargeMainOnce(input: MainChargeInput, deps: PaiLiveDeps): Promise<MainOutcome> {
  const { order } = input;
  const cfg = liveConfig();
  const total = orderTotalCents(order);
  const attemptBase = {
    gateway: 'paymentsai' as const,
    step: 'main' as const,
    initiator: 'cit' as const,
    amountCents: total,
    email: order.email,
    funnel: order.funnel,
    hook: order.hook,
  };

  const cust = await createCustomer(
    { email: order.email, firstName: order.firstName, phoneNumber: input.phone },
    cfg,
  );
  if (!cust.ok || !cust.data?.id) {
    logger.error('[pai-live] createCustomer failed', { error: cust.error });
    recordPaymentAttempt({ ...attemptBase, result: 'error', declineReason: `createCustomer: ${cust.error}` });
    return { kind: 'error', message: 'We could not start the payment. Please try again.' };
  }

  const tx = await charge(
    {
      customerId: cust.data.id,
      amountCents: total,
      metadata: mainMetadata(order),
      idempotencyKey: idemKey('main'),
      token: input.cardToken,
      isMerchantInitiated: false,
      redirectUrl: input.returnUrl,
    },
    cfg,
  );
  if (!tx.ok || !tx.data?.id) {
    logger.error('[pai-live] main charge failed', { error: tx.error, status: tx.status });
    recordPaymentAttempt({ ...attemptBase, result: 'error', declineReason: chargeErrorText(tx) });
    return { kind: 'error', message: 'We could not complete the payment. Please try again.' };
  }

  const settled = (await settleTransaction(tx.data.id, 6, 1500, cfg)) ?? tx.data;
  const approvalLink = pendingChallengeLink(settled);
  if (approvalLink) {
    // Not recorded yet — the attempt is decided when she comes back (completeMain).
    return { kind: 'needs3ds', transactionId: settled.id, approvalLink };
  }
  return settleMain(order, settled, {
    customerId: cust.data.id,
    phone: input.phone,
    smsAnswer: input.smsAnswer,
    ip: input.ip,
    policyBase: input.policyBase,
  }, deps);
}

interface BuyerExtras {
  customerId: string;
  phone: string;
  smsAnswer: unknown;
  ip?: string;
  policyBase: string;
}

/** Decided either way: record the attempt and, only on approved, fulfil. */
async function settleMain(
  order: PaiOrder,
  settled: PaiTransaction,
  extras: BuyerExtras,
  deps: PaiLiveDeps,
): Promise<MainOutcome> {
  const total = orderTotalCents(order);
  const result = resultOf(settled);
  recordPaymentAttempt({
    gateway: 'paymentsai',
    step: 'main',
    initiator: 'cit',
    result,
    amountCents: total,
    processorRef: settled.id,
    orderRef: settled.id,
    declineReason: result === 'approved' ? null : declineReasonOf(settled),
    email: order.email,
    funnel: order.funnel,
    hook: order.hook,
  });
  if (result !== 'approved') {
    return { kind: 'declined', transactionId: settled.id, message: DECLINED_COPY };
  }
  await fulfilMain(order, settled, extras, deps);
  return {
    kind: 'approved',
    transactionId: settled.id,
    totalCents: total,
    redirect: `${deps.funnelPath('/welcome1', order.funnel ?? undefined)}?session_id=${encodeURIComponent(settled.id)}`,
  };
}

/**
 * 3DS: she is back from the challenge. Re-read the transaction — never trust the
 * return URL — and finish exactly once. The DB row doubles as the idempotency
 * record: an order already written as paid is answered, never fulfilled again.
 */
const COMPLETE_IN_FLIGHT = new Map<string, Promise<MainOutcome | { kind: 'waiting'; transactionId: string }>>();

export async function completeMain(
  args: { order: PaiOrder; transactionId: string; phone: string; smsAnswer: unknown; ip?: string; policyBase: string },
  deps: PaiLiveDeps,
): Promise<MainOutcome | { kind: 'waiting'; transactionId: string }> {
  const prior = COMPLETE_IN_FLIGHT.get(args.transactionId);
  if (prior) return prior;
  const run = (async () => {
    const already = await getConversationByStripeSession(args.transactionId);
    if (already?.mainPaidAt && already.paymentGateway === 'paymentsai') {
      return {
        kind: 'approved' as const,
        transactionId: args.transactionId,
        totalCents: orderTotalCents(args.order),
        redirect: `${deps.funnelPath('/welcome1', args.order.funnel ?? undefined)}?session_id=${encodeURIComponent(args.transactionId)}`,
      };
    }
    const cfg = liveConfig();
    let settled: PaiTransaction | null = null;
    for (let i = 0; i < 6; i++) {
      settled = await settleTransaction(args.transactionId, 1, i === 0 ? 0 : 1500, cfg);
      const r = String(settled?.result ?? '').toLowerCase();
      if (r && r !== 'pending' && r !== 'unknown') break;
    }
    if (!settled) return { kind: 'error' as const, message: 'We could not confirm the payment. Please contact support.' };

    // 🔴 The token must describe THIS transaction — otherwise a valid token for a $35
    // order could be replayed against someone else's approved txn id.
    const md = settled.metadata ?? {};
    const sameBuyer = String(md.email ?? '').toLowerCase() === args.order.email.toLowerCase();
    const sameAmount = Math.round(Number(settled.amount ?? 0) * 100) === orderTotalCents(args.order);
    if (!sameBuyer || !sameAmount) {
      logger.error('[pai-live] 3DS completion does not match the order — refused', {
        txn: args.transactionId,
        sameBuyer,
        sameAmount,
      });
      return { kind: 'error' as const, message: 'We could not confirm the payment. Please contact support.' };
    }

    const r = String(settled.result ?? '').toLowerCase();
    if (r !== 'approved' && r !== 'declined') {
      return { kind: 'waiting' as const, transactionId: args.transactionId };
    }
    const customerId = (settled as any).customerId ?? settled.customer?.id ?? '';
    return settleMain(args.order, settled, {
      customerId,
      phone: args.phone,
      smsAnswer: args.smsAnswer,
      ip: args.ip,
      policyBase: args.policyBase,
    }, deps);
  })();
  COMPLETE_IN_FLIGHT.set(args.transactionId, run);
  const forget = () => later(() => COMPLETE_IN_FLIGHT.delete(args.transactionId), 60_000);
  run.then(forget, forget);
  return run;
}

/**
 * Everything an APPROVED Stripe main purchase triggers, for a Payments.AI one:
 *   the conversations row (/api/checkout + webhook) · main_paid_at (webhook) ·
 *   phone + SMS consent (webhook) · PostHog purchase (webhook) · Facebook CAPI
 *   (webhook) · Google Ads (webhook) · Trackdesk (webhook) · AWeber paid list
 *   (/api/upsell/user-data) · AWeber order-bump list (webhook).
 *
 * The DB row is AWAITED — /welcome1 reads it by this transaction id the moment the
 * browser lands. Everything else is fire-and-forget, as on the Stripe webhook.
 */
async function fulfilMain(order: PaiOrder, settled: PaiTransaction, x: BuyerExtras, deps: PaiLiveDeps) {
  const txn = settled.id;
  const total = orderTotalCents(order);
  const funnel = order.funnel ?? undefined;
  const instrumentId = instrumentIdOf(settled);

  await updateStripeData(
    order.email,
    {
      paymentGateway: 'paymentsai',
      stripeSessionId: txn,
      stripeCustomerId: x.customerId,
      ...(instrumentId ? { stripePaymentMethodId: instrumentId } : {}),
      // MAIN OFFER ONLY, exactly as /api/checkout writes it — the bump beside it.
      mainPurchaseAmount: order.mainCents,
      ...(order.bumpOffered
        ? {
            bumpOffered: true,
            bumpPurchased: order.bumpApplied,
            ...(order.bumpApplied
              ? { bumpBucket: order.bumpBucket ?? undefined, bumpAmountCents: order.bumpCents }
              : {}),
          }
        : {}),
    },
    { firstName: order.firstName, bucket: order.bucket ?? undefined },
  );
  await markMainPaid(txn);
  await savePhoneForSession(txn, x.phone);

  if (showsSmsConsent(funnel)) {
    recordSmsConsent({
      stripeSessionId: txn,
      email: order.email,
      phone: x.phone,
      consented: x.smsAnswer === 'yes',
      consentText: smsConsentRecordText(x.policyBase),
      consentVersion: SMS_CONSENT_VERSION,
      ip: x.ip ? x.ip.slice(0, 64) : null,
      funnel: funnel ?? 'root',
      source: 'paymentsai_framepay',
      consentedAt: new Date(),
    }).catch((err) => logger.error('[pai-live] recordSmsConsent failed (non-blocking)', { err: String(err) }));
  }

  // PostHog — same builder as the Stripe webhook; payment_gateway separates the arms.
  try {
    const event = buildPurchaseEvent({
      product: 'energy_clearing_ritual',
      metadata: mainMetadata(order),
      amountCents: total,
      stripeSessionId: txn,
      email: order.email,
      paymentGateway: 'paymentsai',
    });
    if (event) {
      event.properties.sandbox = isSandboxBase(liveConfig());
      posthog.capture(event);
    }
  } catch (err) {
    logger.error('[pai-live] posthog capture failed', { err: String(err) });
  }

  // Facebook CAPI — event_id purchase_<txn>, the id /welcome1's browser Pixel sends.
  fireStripePurchaseEvent({
    stripeRefId: txn,
    mainSessionId: txn,
    product: 'energy_clearing_ritual',
    type: order.type,
    funnel: funnel,
    amountCents: total,
    email: order.email,
    firstName: order.firstName,
  }).catch(() => { /* logged inside */ });

  const gadsStep = gadsStepForProduct('energy_clearing_ritual');
  if (gadsStep) {
    fireGoogleAdsConversion({
      step: gadsStep,
      gclid: order.gclid ?? undefined,
      valueCents: total,
      orderId: txn,
      email: order.email,
    }).catch(() => { /* logged inside */ });
  }

  if (order.trackdeskClickId) {
    reportTrackdeskConversion({
      clickId: order.trackdeskClickId,
      conversionType: 'sale',
      amount: total / 100,
      externalId: txn,
      customerId: order.email,
    });
  }

  // AWeber paid list — the tags /api/upsell/user-data builds for a Stripe buyer.
  const purchaseTypeTag = order.type === 'downsell' ? 'downsell' : 'initial-purchase';
  const paidTags = [order.bucket || 'seer-within', 'paid', purchaseTypeTag];
  if (deps.isFbFunnel(funnel)) paidTags.push(`${purchaseTypeTag}${deps.fbTagSuffix(funnel)}`);
  const paidListTags = [...deps.fbifyAweberTags(paidTags, funnel), PAI_TAG];

  // AWeber order-bump list — the webhook's rule: only when the stamped key wants it.
  const wantsBumpList = order.bumpApplied && bumpPaidListWanted(order.bumpProduct);
  const suffix = funnelDefForParam(funnel)?.aweberSuffix ?? '';
  const bumpTags = ['order-bump', 'paid', order.bucket || 'seer-within', `initial-purchase${suffix}`, PAI_TAG];

  // ONE AFTER THE OTHER, never together (28 Oct). Fired at the same instant on an
  // expired AWeber token, both writes refresh it at once and the second refresh
  // voids the first token — one list then 401s at random (seen live on dev: paid
  // list for one buyer, bump list for the next). On Stripe the two writes come from
  // different places seconds apart, so it never bites there. Still fire-and-forget:
  // /welcome1 does not wait for AWeber.
  void (async () => {
    logger.info(`[pai-live] AWeber paid list ← ${txn} tags=${paidListTags.join(',')}`);
    await addPaidSubscriber({
      email: order.email,
      name: order.firstName || undefined,
      stripeOrderId: txn,
      tags: paidListTags,
      phone: x.phone,
    }).catch((err) => logger.warn('[pai-live] AWeber paid list error (non-blocking)', { err: String(err) }));

    if (wantsBumpList) {
      logger.info(`[pai-live] AWeber order-bump list ← ${txn} tags=${bumpTags.join(',')}`);
      await addBumpPaidSubscriber({
        email: order.email,
        name: order.firstName || undefined,
        stripeOrderId: txn,
        tags: bumpTags,
      }).catch((err) => logger.error('[pai-live] AWeber bump list error (non-blocking)', { err: String(err) }));
    }
  })();
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. UPSELLS — 1-click on the saved card, and the card-entry fallback
// ═══════════════════════════════════════════════════════════════════════════════
//
// 1-CLICK. Called from the FIRST line of /api/upsell/charge and /api/upsell2/charge
// when the order id is a txn_…, with the body those routes already validated.
// Answers in the shape the upsell pages already understand:
// { success, paymentIntentId } or { success:false, fallback:true }.
//
// FALLBACK. When a Stripe 1-click is declined, the page sends her to a HOSTED Stripe
// checkout to pay with a card (and give a shipping address). The Payments.AI
// equivalent is our own card page (/pai/pay) — without it the Payments.AI arm would
// lose every sale Stripe's fallback recovers, and the comparison would be unfair.

export interface UpsellBody {
  checkoutSessionId: string;
  email?: string;
  firstName?: string;
  funnel?: FunnelParam;
  trackdeskClickId?: string;
}

export type UpsellStep = 'upsell1' | 'upsell2';

type UpsellReply = { status: number; body: Record<string, unknown> };

export interface ShippingInput {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal: string;
  country: string;
}

interface UpsellSpec {
  step: UpsellStep;
  product: 'protection_ritual' | 'manifestation_bracelet';
  cents: number;
  /** upsell2 only: 'full' | 'downsell' — the bracelet tier. */
  braceletType?: 'full' | 'downsell';
}

/**
 * The shipping address onto Payments.AI, in two places:
 *   1. the upsell's own transaction, under the SAME seven keys Stripe's upsell
 *      PaymentIntent carries. 🔴 Until Payments.AI enables those seven fields on their
 *      side they are silently dropped (registering them through the API is not enough —
 *      proven 13 Oct); nothing breaks, the keys just don't show yet.
 *   2. the customer's address, a built-in field — visible on the dashboard today.
 * Never throws: the sale is already made.
 */
export async function attachShippingToPaiPayment(
  txnId: string | null | undefined,
  s: ShippingInput | null | undefined,
): Promise<void> {
  if (!txnId || !isPaiOrderId(txnId) || !s?.line1) return;
  const cfg = liveConfig();
  const tx = await getTransaction(txnId, cfg).catch(() => null);
  const customerId = tx?.data?.customer?.id;
  if (customerId) {
    const c = await updateCustomerAddress(customerId, s, cfg)
      .catch((err) => ({ ok: false, status: 0, error: String(err) }) as const);
    if (c.ok) logger.info(`[pai-live] shipping address on customer ${customerId}`);
    else logger.error(`[pai-live] could not set customer address ${customerId}`, { status: c.status, error: c.error });
  } else {
    logger.warn(`[pai-live] no customer on ${txnId} — customer address not set`);
  }
  const r = await mergeTransactionMetadata(
    txnId,
    {
      shipping_name: s.name || '',
      shipping_line1: s.line1 || '',
      shipping_line2: s.line2 || '',
      shipping_city: s.city || '',
      shipping_state: s.state || '',
      shipping_postal: s.postal || '',
      shipping_country: s.country || '',
    },
    cfg,
  ).catch((err) => ({ ok: false, status: 0, error: String(err) }) as const);
  if (r.ok) logger.info(`[pai-live] shipping keys sent to ${txnId} (kept only once Payments.AI enables the fields)`);
  else logger.error(`[pai-live] could not add shipping to ${txnId}`, { status: r.status, error: r.error });
}

export function upsell2Cents(type: 'full' | 'downsell'): number {
  return type === 'full' ? 4700 : 3000;
}

function boughtRef(c: Conversation, step: UpsellStep): string | null {
  return step === 'upsell1'
    ? (c.upsellPurchased && c.upsellPaymentId ? c.upsellPaymentId : null)
    : (c.upsell2Purchased && c.upsell2PaymentId ? c.upsell2PaymentId : null);
}

const UPSELL_IN_FLIGHT = new Map<string, Promise<unknown>>();

function once<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prior = UPSELL_IN_FLIGHT.get(key) as Promise<T> | undefined;
  if (prior) return prior;
  const run = fn();
  UPSELL_IN_FLIGHT.set(key, run);
  // A short memory is enough: once approved, the DB flag answers every later repeat.
  const forget = () => later(() => UPSELL_IN_FLIGHT.delete(key), 30_000);
  run.then(forget, forget);
  return run;
}

/** The order must exist, be a Payments.AI order, and belong to her. */
async function loadOrder(
  orderId: string,
  email: string | undefined,
): Promise<{ convo: Conversation } | { reply: UpsellReply }> {
  const convo = await getConversationByStripeSession(orderId);
  if (!convo || convo.paymentGateway !== 'paymentsai') {
    logger.warn(`[pai-live] no Payments.AI order ${orderId}`);
    return { reply: { status: 200, body: { success: false, fallback: true, error: 'Order not found' } } };
  }
  if (email && convo.email && email.toLowerCase() !== convo.email.toLowerCase()) {
    return { reply: { status: 403, body: { success: false, error: 'Session ownership verification failed' } } };
  }
  return { convo };
}

interface Fulfil {
  spec: UpsellSpec;
  orderId: string;
  txnId: string;
  email: string;
  firstName?: string;
  funnel: FunnelParam | undefined;
  trackdeskClickId?: string;
  gclid?: string;
  noemail: boolean;
  initiator: 'cit' | 'mit';
  /** Given on the card page; the 1-click path collects it afterwards, as Stripe's does. */
  shipping?: ShippingInput;
}

/**
 * Everything an approved Stripe upsell triggers, for a Payments.AI one: the DB flag,
 * Trackdesk, PostHog, Facebook + Google Ads (keyed on the MAIN order so they dedup
 * with the browser fire), and the stage's own AWeber list with the live tags.
 */
async function fulfilUpsell(f: Fulfil, deps: PaiLiveDeps): Promise<void> {
  const { spec } = f;
  if (spec.step === 'upsell1') {
    await markUpsellPurchased(f.orderId, f.txnId, spec.cents);
    if (f.shipping) await saveShippingAddress(f.orderId, f.shipping);
  } else {
    await markUpsell2Purchased(f.orderId, f.txnId, spec.cents, spec.braceletType ?? 'full');
    if (f.shipping) await saveShipping2Address(f.orderId, f.shipping);
  }
  // Card page: the address came with the payment — put it on the transaction, as
  // Stripe's hosted fallback checkout does. (Upsell 2 is handled below with the
  // address it finds; the 1-click upsell 1 gets it from the shipping save.)
  if (spec.step === 'upsell1' && f.shipping) void attachShippingToPaiPayment(f.txnId, f.shipping);

  if (f.trackdeskClickId) {
    reportTrackdeskConversion({
      clickId: f.trackdeskClickId,
      conversionType: spec.step,
      amount: spec.cents / 100,
      externalId: `${f.orderId}_${spec.step}`,
      customerId: f.email || '',
    });
  }

  posthog.capture({
    distinctId: f.email || 'anonymous',
    event: 'purchase_completed',
    properties: {
      funnel: deps.fbPosthogName(f.funnel),
      step: spec.step,
      product: spec.product,
      payment_method: f.initiator === 'mit' ? 'paymentsai_1click' : 'paymentsai_card',
      payment_gateway: 'paymentsai',
      amount_cents: spec.cents,
      ...(spec.braceletType ? { amount_variant: spec.braceletType } : {}),
      payment_intent_id: f.txnId,
      email: f.email,
      email_gate: f.noemail ? 'off' : 'on',
      sandbox: isSandboxBase(liveConfig()),
    },
  });

  fireStripePurchaseEvent({
    stripeRefId: f.txnId,
    mainSessionId: f.orderId,
    product: spec.product,
    funnel: f.funnel,
    amountCents: spec.cents,
    email: f.email,
    firstName: f.firstName,
  }).catch(() => { /* logged inside */ });
  const gadsStep = gadsStepForProduct(spec.product);
  if (gadsStep) {
    fireGoogleAdsConversion({
      step: gadsStep,
      gclid: f.gclid,
      valueCents: spec.cents,
      orderId: f.orderId,
      email: f.email,
    }).catch(() => { /* logged inside */ });
  }

  const shippingFor = (s?: ShippingInput) =>
    s ? { ...s, line2: s.line2 ?? '' } : undefined;

  if (spec.step === 'upsell1') {
    const base = f.noemail ? ['seer-within-upsell', 'noemail'] : ['seer-within-upsell'];
    const u1Tags = [...deps.fbifyAweberTags(base, f.funnel), PAI_TAG];
    logger.info(`[pai-live] AWeber upsell-1 list ← ${f.txnId} tags=${u1Tags.join(',')}`);
    addUpsellSubscriber({
      email: f.email,
      name: f.firstName,
      stripeOrderId: f.txnId,
      tags: u1Tags,
      shipping: shippingFor(f.shipping),
    }).catch((err) => logger.error('[pai-live] upsell1 AWeber error', { err: String(err) }));
    return;
  }

  // Upsell 2: the Stripe route waits up to ~5s for the shipping form, then writes with
  // whichever address it has (Path A reuses upsell 1's). Same here.
  const type = spec.braceletType ?? 'full';
  void (async () => {
    try {
      let ship = shippingFor(f.shipping);
      if (!ship) {
        let c = await getConversationByStripeSession(f.orderId);
        for (const wait of [3000, 2000]) {
          if (c?.shipping2Line1 || c?.shippingLine1) break;
          await new Promise((r) => setTimeout(r, wait));
          c = await getConversationByStripeSession(f.orderId);
        }
        ship = c?.shipping2Line1
          ? {
              name: c.shipping2Name || '', line1: c.shipping2Line1 || '', line2: c.shipping2Line2 || '',
              city: c.shipping2City || '', state: c.shipping2State || '',
              postal: c.shipping2Postal || '', country: c.shipping2Country || '',
            }
          : c?.shippingLine1
            ? {
                name: c.shippingName || '', line1: c.shippingLine1 || '', line2: c.shippingLine2 || '',
                city: c.shippingCity || '', state: c.shippingState || '',
                postal: c.shippingPostal || '', country: c.shippingCountry || '',
              }
            : undefined;
      }
      // Stripe's 1-click upsell 2 writes this same address onto its PaymentIntent.
      if (ship) await attachShippingToPaiPayment(f.txnId, ship);
      const base = f.noemail
        ? ['seer-within-upsell2', `bracelet-${type}`, 'noemail']
        : ['seer-within-upsell2', `bracelet-${type}`];
      const u2Tags = [...deps.fbifyAweberTags(base, f.funnel), PAI_TAG];
      logger.info(`[pai-live] AWeber upsell-2 list ← ${f.txnId} tags=${u2Tags.join(',')} shipping=${ship ? 'yes' : 'no'}`);
      await addUpsell2Subscriber({
        email: f.email,
        name: f.firstName,
        stripeOrderId: f.txnId,
        tags: u2Tags,
        shipping: ship,
      });
    } catch (err) {
      logger.error('[pai-live] upsell2 AWeber error', { err: String(err) });
    }
  })();
}

function upsellMetadata(
  spec: UpsellSpec,
  orderId: string,
  email: string,
  firstName: string | undefined,
  funnel: FunnelParam | undefined,
  mainMd: Record<string, string>,
  flow: '1click' | 'card',
): Record<string, string> {
  return {
    product: spec.product,
    type: spec.braceletType ?? spec.step,
    originalSession: orderId,
    flow,
    ...(funnel ? { funnel } : {}),
    ...(firstName ? { firstName } : {}),
    email,
    app: 'the-seer-within',
    ...(mainMd.gclid ? { gclid: mainMd.gclid } : {}),
    ...srcMetadata(mainMd.src),
    ...(mainMd.noemail === '1' ? { noemail: '1' } : {}),
  };
}

/** 1-click on the saved card (merchant-initiated). */
async function chargeUpsellMit(body: UpsellBody, spec: UpsellSpec, deps: PaiLiveDeps): Promise<UpsellReply> {
  const orderId = body.checkoutSessionId;
  return once(`${spec.step}:${orderId}`, async (): Promise<UpsellReply> => {
    const loaded = await loadOrder(orderId, body.email);
    if ('reply' in loaded) return loaded.reply;
    const { convo } = loaded;
    spec = { ...spec, cents: testBuyerCents(convo.email, spec.cents) };
    // Once per order — a refresh, back button or double tap must never charge twice.
    const bought = boughtRef(convo, spec.step);
    if (bought) {
      logger.warn(`[pai-live] ${spec.step} repeat for ${orderId} — NOT charged again`);
      return { status: 200, body: { success: true, paymentIntentId: bought, alreadyPurchased: true } };
    }
    if (!convo.stripeCustomerId || !convo.stripePaymentMethodId) {
      return { status: 200, body: { success: false, fallback: true, error: 'No saved card' } };
    }

    const cfg = liveConfig();
    const email = convo.email;
    const firstName = body.firstName || convo.firstName || undefined;
    const attemptBase = {
      gateway: 'paymentsai' as const,
      step: spec.step,
      initiator: 'mit' as const,
      amountCents: spec.cents,
      orderRef: orderId,
      email,
      funnel: body.funnel ?? null,
    };

    // 🔴 MIT GUARD — never bill the saved card unless the main charge was approved.
    const guard = await assertCitApproved(orderId, cfg);
    if (!guard.approved) {
      recordPaymentAttempt({ ...attemptBase, result: 'error', declineReason: `MIT guard: ${guard.reason}` });
      return { status: 200, body: { success: false, fallback: true, error: 'Original payment not approved' } };
    }
    const mainMd = guard.tx?.metadata ?? {};

    const tx = await charge(
      {
        customerId: convo.stripeCustomerId,
        amountCents: spec.cents,
        idempotencyKey: idemKey(spec.step),
        paymentInstrumentId: convo.stripePaymentMethodId,
        isMerchantInitiated: true,
        metadata: upsellMetadata(spec, orderId, email, firstName, body.funnel, mainMd, '1click'),
      },
      cfg,
    );
    if (!tx.ok || !tx.data?.id) {
      recordPaymentAttempt({ ...attemptBase, result: 'error', declineReason: chargeErrorText(tx) });
      return { status: 200, body: { success: false, fallback: true } };
    }
    const settled = (await settleTransaction(tx.data.id, 6, 1500, cfg)) ?? tx.data;
    const result = resultOf(settled);
    recordPaymentAttempt({
      ...attemptBase,
      result,
      processorRef: settled.id,
      declineReason: result === 'approved' ? null : declineReasonOf(settled),
    });
    if (result !== 'approved') {
      return { status: 200, body: { success: false, fallback: true } };
    }

    await fulfilUpsell(
      {
        spec,
        orderId,
        txnId: settled.id,
        email,
        firstName,
        funnel: body.funnel,
        trackdeskClickId: body.trackdeskClickId,
        gclid: mainMd.gclid || undefined,
        noemail: mainMd.noemail === '1',
        initiator: 'mit',
      },
      deps,
    );
    return { status: 200, body: { success: true, paymentIntentId: settled.id } };
  });
}

export function chargeUpsell1Pai(body: UpsellBody, cents: number, deps: PaiLiveDeps): Promise<UpsellReply> {
  return chargeUpsellMit(body, { step: 'upsell1', product: 'protection_ritual', cents }, deps);
}

export function chargeUpsell2Pai(
  body: UpsellBody & { type: 'full' | 'downsell' },
  deps: PaiLiveDeps,
): Promise<UpsellReply> {
  return chargeUpsellMit(
    body,
    { step: 'upsell2', product: 'manifestation_bracelet', cents: upsell2Cents(body.type), braceletType: body.type },
    deps,
  );
}

/** Where the card page sends her once the upsell is paid — what Stripe's fallback does. */
export function afterUpsellPath(
  step: UpsellStep,
  orderId: string,
  funnel: FunnelParam | undefined,
  deps: PaiLiveDeps,
): string {
  const id = encodeURIComponent(orderId);
  return step === 'upsell1'
    ? `${deps.funnelPath('/welcome2', funnel)}?session_id=${id}`
    : `${deps.funnelPath('/success', funnel)}?session_id=${id}&upsell2=true`;
}

export type CardUpsellOutcome =
  | { kind: 'approved'; redirect: string; transactionId: string }
  | { kind: 'needs3ds'; transactionId: string; approvalLink: string }
  | { kind: 'declined' | 'error'; message: string };

/**
 * FALLBACK: pay for the upsell with a card typed on /pai/pay (customer-initiated, so
 * 3DS can run). The order's funnel, click ids and recovery marker come from the MAIN
 * transaction's own metadata — nothing the page sends can change them.
 */
export async function payUpsellWithCard(
  args: {
    orderId: string;
    step: UpsellStep;
    cents: number;
    braceletType?: 'full' | 'downsell';
    cardToken: string;
    shipping?: ShippingInput;
    returnUrl: string;
  },
  deps: PaiLiveDeps,
): Promise<CardUpsellOutcome> {
  return once(`card:${args.step}:${args.orderId}`, async (): Promise<CardUpsellOutcome> => {
    const spec: UpsellSpec = args.step === 'upsell1'
      ? { step: 'upsell1', product: 'protection_ritual', cents: args.cents }
      : {
          step: 'upsell2',
          product: 'manifestation_bracelet',
          cents: args.cents,
          braceletType: args.braceletType ?? 'full',
        };
    const loaded = await loadOrder(args.orderId, undefined);
    if ('reply' in loaded || !loaded.convo.stripeCustomerId) {
      return { kind: 'error', message: 'We could not find your order.' };
    }
    const { convo } = loaded;
    spec.cents = testBuyerCents(convo.email, spec.cents);
    const cfg = liveConfig();
    const guard = await assertCitApproved(args.orderId, cfg);
    if (!guard.approved) return { kind: 'error', message: 'We could not find your order.' };
    const mainMd = guard.tx?.metadata ?? {};
    const funnel = funnelDefForParam(mainMd.funnel)?.param;

    const already = boughtRef(convo, args.step);
    if (already) {
      return { kind: 'approved', transactionId: already, redirect: afterUpsellPath(args.step, args.orderId, funnel, deps) };
    }

    const attemptBase = {
      gateway: 'paymentsai' as const,
      step: args.step,
      initiator: 'cit' as const,
      amountCents: spec.cents,
      orderRef: args.orderId,
      email: convo.email,
      funnel: funnel ?? null,
    };
    const tx = await charge(
      {
        customerId: convo.stripeCustomerId!,
        amountCents: spec.cents,
        idempotencyKey: idemKey(`${args.step}-card`),
        token: args.cardToken,
        isMerchantInitiated: false,
        redirectUrl: args.returnUrl,
        metadata: upsellMetadata(spec, args.orderId, convo.email, convo.firstName || undefined, funnel, mainMd, 'card'),
      },
      cfg,
    );
    if (!tx.ok || !tx.data?.id) {
      recordPaymentAttempt({ ...attemptBase, result: 'error', declineReason: chargeErrorText(tx) });
      return { kind: 'error', message: 'We could not complete the payment. Please try again.' };
    }
    const settled = (await settleTransaction(tx.data.id, 6, 1500, cfg)) ?? tx.data;
    const link = pendingChallengeLink(settled);
    if (link) {
      // Her shipping rides through the 3DS round trip on the page, not here.
      return { kind: 'needs3ds', transactionId: settled.id, approvalLink: link };
    }
    return finishCardUpsell(spec, args.orderId, convo, settled, mainMd, args.shipping, deps, attemptBase);
  });
}

/** Back from 3DS on the card page: re-read, check it IS this order's upsell, finish once. */
export async function completeUpsellWithCard(
  args: {
    orderId: string;
    step: UpsellStep;
    transactionId: string;
    shipping?: ShippingInput;
  },
  deps: PaiLiveDeps,
): Promise<CardUpsellOutcome | { kind: 'waiting' }> {
  return once(`card-complete:${args.transactionId}`, async (): Promise<CardUpsellOutcome | { kind: 'waiting' }> => {
    const loaded = await loadOrder(args.orderId, undefined);
    if ('reply' in loaded) return { kind: 'error', message: 'We could not find your order.' };
    const { convo } = loaded;
    const cfg = liveConfig();
    const mainTx = await getTransaction(args.orderId, cfg);
    const mainMd = mainTx.data?.metadata ?? {};
    const funnel = funnelDefForParam(mainMd.funnel)?.param;

    const done = boughtRef(convo, args.step);
    if (done) {
      return { kind: 'approved', transactionId: done, redirect: afterUpsellPath(args.step, args.orderId, funnel, deps) };
    }
    let settled: PaiTransaction | null = null;
    for (let i = 0; i < 6; i++) {
      settled = await settleTransaction(args.transactionId, 1, i === 0 ? 0 : 1500, cfg);
      const r = String(settled?.result ?? '').toLowerCase();
      if (r && r !== 'pending' && r !== 'unknown') break;
    }
    const md = settled?.metadata ?? {};
    const product = args.step === 'upsell1' ? 'protection_ritual' : 'manifestation_bracelet';
    // 🔴 The transaction must BE this order's upsell — never finish someone else's.
    if (!settled || md.originalSession !== args.orderId || md.product !== product) {
      logger.error('[pai-live] card-upsell completion does not match the order — refused', {
        txn: args.transactionId,
        orderId: args.orderId,
      });
      return { kind: 'error', message: 'We could not confirm the payment. Please contact support.' };
    }
    const r = String(settled.result ?? '').toLowerCase();
    if (r !== 'approved' && r !== 'declined') return { kind: 'waiting' };
    const cents = Math.round(Number(settled.amount ?? 0) * 100);
    const spec: UpsellSpec = args.step === 'upsell1'
      ? { step: 'upsell1', product: 'protection_ritual', cents }
      : {
          step: 'upsell2',
          product: 'manifestation_bracelet',
          cents,
          braceletType: md.type === 'downsell' ? 'downsell' : 'full',
        };
    return finishCardUpsell(spec, args.orderId, convo, settled, mainMd, args.shipping, deps, {
      gateway: 'paymentsai',
      step: args.step,
      initiator: 'cit',
      amountCents: cents,
      orderRef: args.orderId,
      email: convo.email,
      funnel: funnel ?? null,
    });
  });
}

async function finishCardUpsell(
  spec: UpsellSpec,
  orderId: string,
  convo: Conversation,
  settled: PaiTransaction,
  mainMd: Record<string, string>,
  shipping: ShippingInput | undefined,
  deps: PaiLiveDeps,
  attemptBase: Omit<AttemptRecord, 'result'>,
): Promise<CardUpsellOutcome> {
  const result = resultOf(settled);
  recordPaymentAttempt({
    ...attemptBase,
    result,
    processorRef: settled.id,
    declineReason: result === 'approved' ? null : declineReasonOf(settled),
  });
  if (result !== 'approved') {
    return { kind: 'declined', message: 'Your card was declined. Please check the details or try a different card.' };
  }
  const funnel = funnelDefForParam(mainMd.funnel)?.param;
  await fulfilUpsell(
    {
      spec,
      orderId,
      txnId: settled.id,
      email: convo.email,
      firstName: convo.firstName || undefined,
      funnel,
      trackdeskClickId: mainMd.trackdeskClickId || undefined,
      gclid: mainMd.gclid || undefined,
      noemail: mainMd.noemail === '1',
      initiator: 'cit',
      shipping,
    },
    deps,
  );
  return { kind: 'approved', transactionId: settled.id, redirect: afterUpsellPath(spec.step, orderId, funnel, deps) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. What the card form needs to boot
// ═══════════════════════════════════════════════════════════════════════════════

export async function publishableKey(): Promise<string | null> {
  const cfg = liveConfig();
  try {
    const r = await fetch(`${cfg.base}/v1/organizations/${cfg.orgId}/public-keys/publishable`, {
      headers: { Authorization: `ApiKey ${cfg.apiKey}`, Accept: 'application/json' },
    });
    const j: any = await r.json().catch(() => null);
    return j?.data?.value ?? null;
  } catch (err) {
    logger.warn('[pai-live] could not fetch the publishable key', { err: String(err) });
    return null;
  }
}

/** The SMS question exactly as the Stripe checkout words it, or null when not shown. */
export function smsQuestion(funnel: FunnelParam | undefined, policyBase: string) {
  if (!showsSmsConsent(funnel)) return null;
  return {
    label: SMS_CONSENT_LABEL,
    yesLabel: SMS_CONSENT_YES_LABEL,
    noLabel: SMS_CONSENT_NO_LABEL,
    disclosure: smsConsentDisclosure(policyBase),
  };
}

/** For the 3DS return: what the transaction is, read straight from Payments.AI. */
export async function readTransaction(id: string) {
  return getTransaction(id, liveConfig());
}
