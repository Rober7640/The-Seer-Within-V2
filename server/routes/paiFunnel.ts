/**
 * DEV-ONLY Payments.AI dummy funnel — the server half of `/fb-tarot/pai`.
 *
 * WHAT THIS IS FOR. We are going to split traffic between Stripe and Payments.AI
 * on the soulmate landers. Before any of that, we need to know whether their
 * written answers hold up inside the funnel we actually run — not just against
 * their API in isolation. So this clones the live tarot flow
 *   main + order bump  ->  upsell 1  ->  upsell 2  ->  DB row  ->  AWeber
 * onto Payments.AI, against one of the dummy landers in PAI_LANDERS below —
 * `cards-after-marriage` (soulmate, the default) or `cards-meant-alone` (alone),
 * picked by `?hook=` on the page. Each writes the AWeber lists its LIVE lander does.
 *
 * WHAT THIS IS NOT. It is not the live funnel and never becomes it. Nothing in
 * routes.ts's existing Stripe handlers calls into this file; the live path is
 * byte-identical to what it was. This router refuses to mount unless it is
 * explicitly switched on in a non-production environment.
 *
 * ── THREE GUARDS, ALL OF WHICH MUST PASS TO SERVE ─────────────────────────────
 *   1. PAI_DEV_FUNNEL must be "1"              (explicit opt-in, per environment)
 *   2. PAYMENTSAI_BASE must contain "staging"  (enforced in lib/paymentsai.ts)
 *   3. the request host must not be a production domain
 *
 * 🔴 NOT NODE_ENV. The obvious guard — refuse when NODE_ENV==="production" — is
 * USELESS on Railway: the dev environment reports environment:"production" on
 * /api/health too, because the runtime needs the production build. Guarding on it
 * blocked dev while providing no protection that distinguishes the two.
 *
 * What actually protects us, in order of strength:
 *   - the STAGING BASE check is unconditional and is the one that matters. Even if
 *     this router were somehow enabled on the live site, it can only ever reach
 *     Payments.AI's sandbox. It cannot move real money.
 *   - PAI_DEV_FUNNEL is opt-in per environment and is simply never set on prod.
 *   - the host check refuses the live domains outright.
 *
 * ── WHAT IT WILL TELL US ──────────────────────────────────────────────────────
 *   - which of the 17 metadata keys survive a real charge (12 expected, 5 known lost)
 *   - whether the CIT -> MIT upsell chain works with no session object to join on
 *   - whether the 23-October MIT guard actually blocks a declined-CIT upsell
 *   - whether the AWeber write lands with the `paymentsAI` tag
 */
import { Router, Request, Response } from 'express';
import logger from '../lib/logger';
import {
  charge,
  createCustomer,
  settleTransaction,
  assertCitApproved,
  instrumentIdOf,
  auditMetadata,
  paymentsAiReady,
  type PaiTransaction,
} from '../lib/paymentsai';
import {
  writeSoulmateSubscriber,
  addPaidSubscriber,
  addBumpPaidSubscriber,
  addUpsellSubscriber,
  addUpsell2Subscriber,
} from '../lib/aweber';
import { updateStripeData, markUpsellPurchased, markUpsell2Purchased } from '../lib/db';
import { posthog } from '../lib/posthog';
import { buildPurchaseEvent } from '../lib/purchaseAnalytics';
import { funnelDefForParam, type FunnelParam } from '@shared/funnelConfig';
import { bumpProductKeyFor, bumpPaidListWanted } from '@shared/landerBumpRouting';

const router = Router();

/** The tag that identifies every record this funnel creates. */
export const PAI_TAG = 'paymentsAI';

const PAI_FUNNEL = 'fb-tarot';

/**
 * The PostHog funnel this lander's purchases belong to, as a real `FunnelParam`.
 *
 * 🔴 DELIBERATELY NOT `PAI_FUNNEL`. That constant is the loose lander label
 * ('fb-tarot') reported by /config and sent in the provider metadata. It is NOT a
 * FunnelParam — `funnelDefForParam('fb-tarot')` returns null and the event would
 * silently report funnel='v1'. The live Stripe tarot arm reports funnel='tarot',
 * so using PAI_FUNNEL here would file the two arms of the 50/50 test into
 * DIFFERENT PostHog funnels while looking perfectly fine in the payload.
 */
const PAI_POSTHOG_FUNNEL: FunnelParam = 'v1-tarot';

// ── THE DUMMY LANDERS ───────────────────────────────────────────────────────────
//
// One entry per lander this harness can run. What differs between them is WHERE
// the buyer is filed — the AWeber list and tags at each stage, and the bump key —
// because that is what differs between their live counterparts. The charge chain,
// the MIT guard and the DB row are the same for all of them.
//
// 🔴 EACH ENTRY MUST MIRROR ITS LIVE LANDER, not the other dummy. The two families
// use DIFFERENT lists on the live Stripe path: the soulmate dummy writes the soulmate
// lists (the 2026-09-10 decision), while every other tarot lander — the alone family
// included — writes the four shared V1 lists through the exact functions the live
// Stripe path calls. Reusing one family's lists for the other would "work" and prove
// nothing about the lists that lander really uses.
//
// 🔴 update_existing:true on every writer ⇒ each STAGE needs its own list, or the
// later stage overwrites the earlier one's custom fields. Both families have that.

interface StageArgs {
  email: string;
  name: string;
  /** The Payments.AI txn id — it stands in for the Stripe order id on every list. */
  orderId: string;
  cents: number;
}

/** One AWeber write for one funnel stage, plus where it lands (for the response). */
export interface StageWrite {
  listId: string | null;
  tags: string[];
  write: () => Promise<{ success: boolean; error?: string }>;
}

export interface PaiLander {
  hook: string;
  family: string;
  bucket: string;
  /** metadata.bumpProduct on a bump order — whatever the LIVE lander stamps. */
  bumpProduct: () => string;
  main: (a: StageArgs) => StageWrite;
  /** The order-bump paid list (6969209), or null when this dummy never writes it. */
  bump: ((a: StageArgs) => StageWrite) | null;
  upsell1: (a: StageArgs) => StageWrite;
  upsell2: (a: StageArgs) => StageWrite;
}

/** A soulmate-list stage — the exact write this file made before PAI_LANDERS existed. */
function soulmateStage(listEnv: string, label: string, tag: string, product: string) {
  return (a: StageArgs): StageWrite => {
    const listId = process.env[listEnv] || '';
    const tags = [tag, PAI_TAG];
    return {
      listId: listId || null,
      tags,
      write: () =>
        writeSoulmateSubscriber({
          listId,
          listLabel: `${label} (PAI dev)`,
          email: a.email,
          name: a.name,
          customFields: {
            stripe_order_id: a.orderId,
            purchase_amount_usd: String(a.cents / 100),
            product,
          },
          tags,
        }),
    };
  };
}

/** "-tarot" — the same registry value the live path's fbTagSuffix() reads. */
const TAROT_TAG_SUFFIX = funnelDefForParam(PAI_POSTHOG_FUNNEL)?.aweberSuffix ?? '';

/**
 * The four V1 tarot stages, tagged exactly as the live Stripe path tags a tarot
 * buyer (routes.ts /api/upsell/user-data, webhooks.ts bump block, the two 1-click
 * upsell charges), plus our marker. The list ids shown are each writer's own
 * fallback, repeated here for REPORTING only — the writer decides where it goes.
 */
function tarotStages(bucket: string) {
  return {
    main: (a: StageArgs): StageWrite => {
      const tags = [bucket, 'paid', 'initial-purchase', `initial-purchase${TAROT_TAG_SUFFIX}`, PAI_TAG];
      return {
        listId: process.env.AWEBER_PAID_LIST_ID || '6936955',
        tags,
        write: () => addPaidSubscriber({ email: a.email, name: a.name, stripeOrderId: a.orderId, tags }),
      };
    },
    bump: (a: StageArgs): StageWrite => {
      const tags = ['order-bump', 'paid', bucket, `initial-purchase${TAROT_TAG_SUFFIX}`, PAI_TAG];
      return {
        listId: process.env.AWEBER_BUMP_PAID_LIST_ID || '6969209',
        tags,
        write: () => addBumpPaidSubscriber({ email: a.email, name: a.name, stripeOrderId: a.orderId, tags }),
      };
    },
    upsell1: (a: StageArgs): StageWrite => {
      const tags = [`seer-within-upsell${TAROT_TAG_SUFFIX}`, PAI_TAG];
      return {
        listId: '6937139',
        tags,
        write: () => addUpsellSubscriber({ email: a.email, name: a.name, stripeOrderId: a.orderId, tags }),
      };
    },
    upsell2: (a: StageArgs): StageWrite => {
      // `bracelet-full`: this harness only ever sells the $47 bracelet.
      const tags = [`seer-within-upsell2${TAROT_TAG_SUFFIX}`, 'bracelet-full', PAI_TAG];
      return {
        listId: '6939683',
        tags,
        write: () => addUpsell2Subscriber({ email: a.email, name: a.name, stripeOrderId: a.orderId, tags }),
      };
    },
  };
}

export const DEFAULT_PAI_HOOK = 'cards-after-marriage';
const ALONE_HOOK = 'cards-meant-alone';

export const PAI_LANDERS: Record<string, PaiLander> = {
  // The original dummy — unchanged in every write it makes.
  [DEFAULT_PAI_HOOK]: {
    hook: DEFAULT_PAI_HOOK,
    family: 'soulmate-ageband',
    bucket: 'love',
    bumpProduct: () => 'soulmate_reading_bump',
    main: soulmateStage('AWEBER_SOULMATE_PAID_LIST_ID', 'Soulmate Sketch Buyers', 'soulmate-sketch-buyer', 'energy_clearing_ritual'),
    bump: null,
    upsell1: soulmateStage('AWEBER_SOULMATE_UPSELL1_LIST_ID', 'Soulmate Bracelet Buyers', 'soulmate-bracelet-buyer', 'soulmate_bracelet'),
    upsell2: soulmateStage('AWEBER_SOULMATE_UPSELL2_LIST_ID', 'Soulmate Love Tuner Buyers', 'soulmate-love-tuner-buyer', 'soulmate_love_tuner'),
  },
  // "Am I meant to be alone?" — the alone (loneliness) family, bucket love. Not a
  // soulmate or money lander, so live it gets the default bump key and the shared
  // V1 lists. The key comes from the live resolver rather than a copied literal.
  [ALONE_HOOK]: {
    hook: ALONE_HOOK,
    family: 'loneliness',
    bucket: 'love',
    bumpProduct: () => bumpProductKeyFor(PAI_POSTHOG_FUNNEL, 'love', ALONE_HOOK),
    ...tarotStages('love'),
  },
};

/** No hook ⇒ the original dummy, so existing callers are unchanged. Unknown ⇒ null. */
export function resolvePaiLander(hook: unknown): PaiLander | null {
  if (hook === undefined || hook === null || hook === '') return PAI_LANDERS[DEFAULT_PAI_HOOK];
  if (typeof hook !== 'string') return null;
  return Object.prototype.hasOwnProperty.call(PAI_LANDERS, hook) ? PAI_LANDERS[hook] : null;
}

/** What an AWeber write reports back in the response. */
type AweberResult = { success: boolean; error?: string; ms?: number; timedOut?: boolean };

/** How long a charge response waits on one AWeber write. */
export const AWEBER_WAIT_MS = 20_000;

/**
 * Await one AWeber write — but never longer than `waitMs` — and time it.
 *
 * 🔴 WHY (22 Sep, alone-lander run). The main charge was approved and its DB row
 * written at 08:33:13, then the response never came back: the browser gave up
 * with "Failed to fetch" at 08:39:20. The writers have no timeout of their own,
 * so one AWeber call that does not answer holds the buyer's response for as long
 * as Node's fetch will wait (minutes). The live Stripe path never awaits AWeber
 * at all; this harness does only so it can REPORT the result.
 *
 * The write is NOT cancelled on timeout — it may still land — so whatever it
 * eventually does is logged with its real duration.
 */
export async function timedWrite(stage: StageWrite, label: string, waitMs = AWEBER_WAIT_MS): Promise<AweberResult> {
  const started = Date.now();
  const write = stage.write().catch((err): AweberResult => ({ success: false, error: String(err) }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), waitMs);
  });
  const first = await Promise.race([write, timeout]);
  clearTimeout(timer);
  if (first === 'timeout') {
    logger.warn(`[pai] ${label}: no AWeber answer from list ${stage.listId} within ${waitMs}ms`);
    void write.then((r) =>
      logger.warn(`[pai] ${label}: AWeber answered ${Date.now() - started}ms after the call: ${JSON.stringify(r)}`),
    );
    return {
      success: false,
      error: `no answer from AWeber within ${waitMs / 1000}s (the write may still land)`,
      ms: Date.now() - started,
      timedOut: true,
    };
  }
  const ms = Date.now() - started;
  logger.info(`[pai] ${label}: AWeber list ${stage.listId} ${first.success ? 'ok' : 'FAILED'} in ${ms}ms`);
  return { ...first, ms, timedOut: false };
}

function unknownHook(res: Response, hook: unknown) {
  return res.status(400).json({
    error: `unknown hook ${JSON.stringify(hook)}`,
    hooks: Object.keys(PAI_LANDERS),
  });
}

/**
 * Emit the PostHog `purchase_completed` event for a Payments.AI sale.
 *
 * 🔴 Before 2026-09-18 this funnel emitted NOTHING, so every Payments.AI sale was
 * invisible in PostHog — a 50/50 gateway test would have shown revenue for the
 * Stripe arm only and read as a catastrophic loss for Payments.AI. Same builder as
 * the Stripe webhook so the two arms are directly comparable; `paymentGateway` is
 * what separates them.
 */
function capturePaiPurchase(args: {
  metadata: Record<string, string>;
  amountCents: number;
  transactionId: string;
  email: string;
}): void {
  try {
    const event = buildPurchaseEvent({
      product: args.metadata.product,
      // Override the lander label with a real FunnelParam — see PAI_POSTHOG_FUNNEL.
      metadata: { ...args.metadata, funnel: PAI_POSTHOG_FUNNEL },
      amountCents: args.amountCents,
      // Payments.AI has no session; the txn id rides in the stripe_session_id
      // property, whose KEY is deliberately unchanged so existing insights work.
      stripeSessionId: args.transactionId,
      email: args.email,
      paymentGateway: 'paymentsai',
    });
    if (event) {
      // 🔴 THE SANDBOX MARKER. These events carry funnel='tarot' — the same name as
      // the live tarot funnel, on purpose, so the 50/50 arms match — and nothing
      // else on them says "no real money moved". If the dev and prod environments
      // report into ONE PostHog project, every dummy purchase lands in the real
      // tarot revenue, and `sandbox = true` is the single filter that takes it out.
      // Derived from the API base (not hardcoded) so it can never survive onto a
      // production Payments.AI base by accident.
      event.properties.sandbox = (
        process.env.PAYMENTSAI_BASE || 'https://staging-api.payments.ai'
      ).includes('staging');
      posthog.capture(event);
    }
  } catch (err) {
    // Analytics must never fail a charge that already succeeded.
    logger.error(`[pai] posthog capture failed: ${String(err)}`);
  }
}

/** Hosts this must never serve on, whatever the environment claims to be. */
const FORBIDDEN_HOSTS = [
  'theseerwithin.com',
  'www.theseerwithin.com',
  'the-seer-within-v2-production.up.railway.app',
];

export function hostIsForbidden(host: string | undefined): boolean {
  if (!host) return false;
  const h = host.split(':')[0].toLowerCase();
  return FORBIDDEN_HOSTS.includes(h);
}

export function paiFunnelEnabled(): { enabled: boolean; reason: string } {
  if (process.env.PAI_DEV_FUNNEL !== '1') {
    return { enabled: false, reason: 'PAI_DEV_FUNNEL is not 1' };
  }
  const ready = paymentsAiReady();
  if (!ready.ready) return { enabled: false, reason: ready.reason ?? 'not configured' };
  return { enabled: true, reason: 'enabled' };
}

/** Re-checked per request, not just at mount. */
router.use((req: Request, res: Response, next) => {
  if (hostIsForbidden(req.headers.host)) {
    logger.error(`[pai] REFUSED on a production host: ${req.headers.host}`);
    return res.status(404).json({ error: 'not found' });
  }
  const gate = paiFunnelEnabled();
  if (!gate.enabled) {
    // The reason is safe to surface here precisely because we have already
    // established this is not a production host — and without it a misconfigured
    // dev environment is undiagnosable from outside.
    return res.status(404).json({ error: 'not found', reason: gate.reason });
  }
  next();
});

/**
 * Test addresses are ALWAYS `+pai` tagged.
 *
 * 🔴 writeSoulmateSubscriber sends `update_existing: true`. A colliding address
 * would overwrite a real subscriber's custom fields — there is a documented
 * incident in lib/aweber.ts where exactly that wiped three fields 11 seconds
 * after they were set. The `+pai` tag makes a collision with a real buyer
 * impossible.
 */
function paiTestEmail(raw: string): string {
  const clean = (raw || '').trim().toLowerCase();
  if (!clean || !clean.includes('@')) return `lewis+pai-${Date.now()}@theseerwithin.com`;
  if (clean.includes('+pai')) return clean;
  const [user, domain] = clean.split('@');
  return `${user}+pai@${domain}`;
}

function idem(prefix: string): string {
  return `pai-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Everything the FramePay page needs to boot. Never returns the secret API key. */
router.get('/config', async (req: Request, res: Response) => {
  const lander = resolvePaiLander(req.query.hook);
  if (!lander) return unknownHook(res, req.query.hook);

  const orgId = process.env.PAYMENTSAI_ORG_ID;
  const websiteId = process.env.PAYMENTSAI_WEBSITE_ID;
  const base = process.env.PAYMENTSAI_BASE || 'https://staging-api.payments.ai';

  // The publishable key is fetched server-side so the secret key never leaves here.
  let publishableKey: string | null = null;
  try {
    const r = await fetch(`${base}/v1/organizations/${orgId}/public-keys/publishable`, {
      headers: {
        Authorization: `ApiKey ${process.env.PAYMENTSAI_API_KEY}`,
        Accept: 'application/json',
      },
    });
    const j: any = await r.json().catch(() => null);
    publishableKey = j?.data?.value ?? null;
  } catch (err) {
    logger.warn(`[pai] could not fetch publishable key: ${String(err)}`);
  }

  if (publishableKey && !publishableKey.startsWith('pk_sandbox')) {
    // Refuse to hand a live key to a dev page under any circumstances.
    logger.error('[pai] publishable key is NOT sandbox — refusing to serve config');
    return res.status(500).json({ error: 'non-sandbox key refused' });
  }

  res.json({
    publishableKey,
    organizationId: orgId,
    // 🔴 websiteId is NOT enforced by their API (a fabricated id is approved), and
    // FramePay does not bind it to the page's origin — both proven in
    // scripts/audit/pai-r20-framepay-origin.mjs. We reuse an existing record
    // because their `url` field caps at 50 chars and our dev URL is 52.
    websiteId,
    hook: lander.hook,
    family: lander.family,
    bucket: lander.bucket,
    hooks: Object.keys(PAI_LANDERS),
    funnel: PAI_FUNNEL,
  });
});

/**
 * WEBHOOK RECEIVER — so we can answer questions ourselves instead of asking.
 *
 * Two things we would otherwise have to ask Payments.AI are answerable by simply
 * receiving ONE real delivery:
 *   1. the AMOUNT SCALE on the webhook. Their API takes and returns decimal
 *      dollars (we send 44.77, read back 44.77) but their sample payload shows
 *      "amount": 2000 for a $20 charge, which reads as minor units. Getting this
 *      wrong is a 100x billing error.
 *   2. how an ORDER BUMP is represented. Our bump is a second line item on one
 *      Stripe Checkout session; here it is one combined charge, and we need to
 *      see what actually arrives.
 *
 * Their destinations are NOT per-event subscriptions — "once registered, it
 * receives the event stream for your account and you filter on type" — so this
 * receives everything and records it.
 *
 * SECURITY. Basic auth, matching what we set on the destination. Their own answer
 * is explicit that this is a shared secret, not a signature: it "doesn't prove
 * payload integrity or block replay". Fine for a dev receiver whose only job is to
 * record what arrives; NOT a template for production fulfilment, which must
 * re-fetch and confirm state via the authenticated API before acting.
 *
 * Storage is in-memory and capped — this is a diagnostic, not a queue. A restart
 * loses it, which is acceptable because we read it minutes after the charge.
 */
const RECEIVED: Array<{
  at: string;
  type?: string;
  authOk: boolean;
  authHeaderPresent?: boolean;
  authUser?: string | null;
  sourceIp?: string | null;
  /** The HTTP status we answered with — 503 marks a deliberately failed delivery. */
  responded?: number;
  body: unknown;
}> = [];
// Room for a retry probe: every event is delivered up to 12 times to a failing
// destination, so 50 fills after about four events.
const MAX_RECEIVED = 200;

/**
 * RETRY PROBE — a destination registered with THIS basic-auth username has its
 * delivery recorded and then answered 503, so Payments.AI treats it as failed
 * and retries.
 *
 * Their written answer (16 Sep): 12 attempts, backoff 15s, 30s, 1m … ~4h, about
 * 8.5 hours in all, then delivery stops; at-least-once, so "dedupe on the event
 * ID". None of it has been observed, and the payload carries BOTH `id` and
 * `eventId`, so which one is "the event ID" is not known. Watching one failing
 * destination answers all of it.
 *
 * Every other username still gets 200, so our normal destination receives the
 * same events once and is the control. Keyed on the username alone, not the
 * password: the worst anyone can do by sending it is get a 503 from a diagnostic.
 */
export const RETRY_PROBE_USER = 'paymentsai-retryprobe';

export function webhookResponseStatus(authUser: string | null | undefined): number {
  return authUser === RETRY_PROBE_USER ? 503 : 200;
}

router.post('/webhook', (req: Request, res: Response) => {
  const expectUser = process.env.PAI_WEBHOOK_USER || 'paymentsai';
  const expectPass = process.env.PAI_WEBHOOK_PASS || '';
  const header = req.headers.authorization || '';
  let authOk = false;
  if (header.startsWith('Basic ')) {
    const [u, p] = Buffer.from(header.slice(6), 'base64').toString('utf8').split(':');
    authOk = u === expectUser && !!expectPass && p === expectPass;
  }

  // Record whether an Authorization header was sent AT ALL, separately from
  // whether it matched. Without this split we cannot tell "they sent no auth"
  // from "our expected password is unset", and the second is our own config.
  // Record the SOURCE IP so we can check their section 25b answer (a single
  // address, 34.203.5.234) against what actually connects, rather than asking
  // them to confirm something we can observe. Railway sits behind a proxy, so
  // x-forwarded-for is the real client; req.ip would be the proxy.
  const fwd = String(req.headers['x-forwarded-for'] ?? '');
  const sourceIp = fwd.split(',')[0].trim() || req.socket?.remoteAddress || null;

  const authHeaderPresent = header.startsWith('Basic ');
  const authUser = authHeaderPresent
    ? Buffer.from(header.slice(6), 'base64').toString('utf8').split(':')[0]
    : null;

  const body: any = req.body;
  const responded = webhookResponseStatus(authUser);
  RECEIVED.unshift({
    at: new Date().toISOString(),
    type: body?.type ?? body?.meta?.eventType,
    authOk,
    authHeaderPresent,
    authUser,
    sourceIp,
    responded,
    body,
  });
  if (RECEIVED.length > MAX_RECEIVED) RECEIVED.length = MAX_RECEIVED;

  logger.info(`[pai] webhook ${body?.type ?? 'unknown'} authOk=${authOk} responded=${responded}`);
  // 200 for everything except the retry probe: a non-2xx makes them retry, and on
  // any other destination we want a clean record, not a redelivery storm. Auth
  // failures are recorded, not rejected.
  res.status(responded).json({ received: true });
});

/** Read what has arrived, newest first. */
router.get('/webhook/received', (req: Request, res: Response) => {
  const full = req.query.full === '1';
  res.json({
    count: RECEIVED.length,
    // Lets a probe script refuse to run against a deploy that predates the probe.
    retryProbeUser: RETRY_PROBE_USER,
    events: RECEIVED.map((e) =>
      full
        ? e
        : {
            at: e.at,
            type: e.type,
            authOk: e.authOk,
            authHeaderPresent: e.authHeaderPresent,
            authUser: e.authUser,
            sourceIp: e.sourceIp,
            responded: e.responded,
            // Both candidates for "the event ID" — the retry probe compares them.
            id: (e.body as any)?.id,
            eventId: (e.body as any)?.eventId,
            // The two fields we are actually here to read.
            amount: (e.body as any)?.meta?.metadata?.transaction?.amount,
            metadataKeys: Object.keys(
              (e.body as any)?.meta?.metadata?.transaction?.metadata ?? {},
            ),
          },
    ),
  });
});

/**
 * MAIN + ORDER BUMP — the customer-initiated transaction.
 *
 * On Stripe this is a hosted Checkout redirect. Payments.AI has no hosted
 * checkout, so here the card is tokenised browser-side by FramePay and we charge
 * server-side with the resulting token.
 *
 * 🔴 ONE CHARGE, NOT TWO. Our Stripe order bump adds a second line item to the
 * same Checkout session, so the buyer sees a single combined amount. We mirror
 * that: main + bump are charged as one transaction, with `bumpAmount` carrying
 * the bump's share. That keeps `mainPurchaseAmount` clean for the price test,
 * exactly as the live path does.
 */
router.post('/checkout', async (req: Request, res: Response) => {
  const {
    token,
    hook,
    firstName = 'PaiTest',
    email: rawEmail,
    mainCents = 3500,
    bumpApplied = false,
    bumpCents = 977,
    bumpBucket = 'money',
    priceVariant = '35',
    posthogDistinctId,
    trackdeskClickId,
    gclid,
  } = req.body ?? {};

  if (!token) return res.status(400).json({ error: 'missing FramePay token' });

  // Before any money moves: an unknown hook would otherwise be charged and then
  // filed to the wrong lists.
  const lander = resolvePaiLander(hook);
  if (!lander) return unknownHook(res, hook);
  // The lander's bucket, as the live path derives it from the hook — not the body's.
  const bucket = lander.bucket;
  const bumpProduct = lander.bumpProduct();

  const email = paiTestEmail(rawEmail);
  const totalCents = bumpApplied ? mainCents + bumpCents : mainCents;

  // Every key the live funnel writes today, so we can report what survives.
  const metadata: Record<string, string> = {
    product: 'energy_clearing_ritual',
    type: 'main',
    funnel: PAI_FUNNEL,
    bucket,
    firstName,
    email,
    app: 'the-seer-within',
    priceVariant: String(priceVariant),
    ...(posthogDistinctId ? { posthogDistinctId: String(posthogDistinctId) } : {}),
    ...(trackdeskClickId ? { trackdeskClickId: String(trackdeskClickId) } : {}),
    ...(gclid ? { gclid: String(gclid) } : {}),
    ...(bumpApplied
      ? {
          bumpProduct,
          bumpBucket: String(bumpBucket),
          bumpAmount: String(bumpCents),
        }
      : {}),
  };

  try {
    const cust = await createCustomer({ email, firstName, lastName: 'PaiDev' });
    if (!cust.ok || !cust.data?.id) {
      return res.status(502).json({ error: 'createCustomer failed', detail: cust.error, raw: cust.raw });
    }

    const tx = await charge({
      customerId: cust.data.id,
      amountCents: totalCents,
      metadata,
      idempotencyKey: idem('main'),
      token,
      isMerchantInitiated: false,
    });
    if (!tx.ok || !tx.data?.id) {
      return res.status(502).json({ error: 'charge failed', detail: tx.error, raw: tx.raw });
    }

    const settled = (await settleTransaction(tx.data.id)) ?? tx.data;
    const approved = String(settled.result ?? '').toLowerCase() === 'approved';
    const audit = auditMetadata(metadata, settled.metadata);
    const instrumentId = instrumentIdOf(settled);
    // Reported in the response so a chain run can PROVE the AWeber write landed.
    // Without this the only evidence is a server log nobody outside Railway sees.
    let aweber: AweberResult = {
      success: false,
      error: 'not attempted',
    };
    const stageArgs: StageArgs = { email, name: firstName, orderId: settled.id, cents: totalCents };
    const mainStage = lander.main(stageArgs);
    // Written exactly when the live webhook writes it: a bump order whose stamped key
    // is not on the exclusion list — and only for a dummy that mirrors a lander
    // whose bump buyers go there at all.
    const bumpStage =
      bumpApplied && lander.bump && bumpPaidListWanted(bumpProduct) ? lander.bump(stageArgs) : null;
    let bumpAweber: AweberResult = { success: false, error: 'not attempted' };
    let dbWritten = false;

    // DB row — dev Supabase, separate from production.
    if (approved) {
      try {
        await updateStripeData(
          email,
          {
            // 🔴 THE DISCRIMINATOR. Without it this row cannot be told from a Stripe
            // one: the three id columns below are shared by both processors, and
            // Payments.AI customer ids are ALSO `cus_`-prefixed. The 50/50 revenue
            // comparison reads this column and nothing else.
            paymentGateway: 'paymentsai',
            // Payments.AI has no session object; the transaction id is the only
            // durable handle, so it takes the session column's place.
            stripeSessionId: settled.id,
            stripeCustomerId: cust.data.id,
            ...(instrumentId ? { stripePaymentMethodId: instrumentId } : {}),
            mainPurchaseAmount: mainCents,
            ...(bumpApplied
              ? {
                  bumpOffered: true,
                  bumpPurchased: true,
                  bumpBucket: String(bumpBucket),
                  bumpAmountCents: bumpCents,
                }
              : { bumpOffered: true, bumpPurchased: false }),
          },
          { firstName, bucket },
        );
        dbWritten = true;
      } catch (err) {
        logger.error(`[pai] DB write failed: ${String(err)}`);
      }

      // PostHog — the 50/50 test's revenue for this arm. amountCents is what was
      // ACTUALLY charged (bump included), matching session.amount_total on the
      // Stripe side so the two arms are comparable.
      capturePaiPurchase({
        metadata,
        amountCents: totalCents,
        transactionId: settled.id,
        email,
      });

      // AWeber — the REAL lists this lander's live counterpart writes, with the
      // paymentsAI tag added alongside the live ones. The address is always +pai on
      // a domain we own, so it can never collide with a real subscriber.
      aweber = await timedWrite(mainStage, 'main');
      if (bumpStage) bumpAweber = await timedWrite(bumpStage, 'bump');
    }

    res.json({
      ok: approved,
      hook: lander.hook,
      family: lander.family,
      bumpProduct: bumpApplied ? bumpProduct : null,
      transactionId: settled.id,
      result: settled.result,
      status: settled.status,
      amountReturned: settled.amount,
      amountSentCents: totalCents,
      instrumentId,
      customerId: cust.data.id,
      email,
      gateway: { name: settled.gatewayName, slug: settled.gatewaySlug },
      metadataAudit: audit,
      dbWritten,
      aweber: {
        attempted: approved,
        ...aweber,
        listConfigured: Boolean(mainStage.listId),
        listId: mainStage.listId,
        tags: mainStage.tags,
      },
      // null ⇒ this order is not one the live path puts on the order-bump list.
      bumpList: bumpStage
        ? {
            attempted: approved,
            ...bumpAweber,
            listId: bumpStage.listId,
            tags: bumpStage.tags,
          }
        : null,
    });
  } catch (err) {
    logger.error(`[pai] checkout error: ${String(err)}`);
    res.status(500).json({ error: String(err) });
  }
});

/** Shared by both upsells — the only difference is product, price and DB call. */
async function chargeUpsell(
  req: Request,
  res: Response,
  opts: {
    product: string;
    defaultCents: number;
    label: string;
    markPurchased: (txId: string, cents: number, mainTxId: string) => Promise<void>;
    /**
     * 🔴 EACH FUNNEL STAGE HAS ITS OWN AWEBER LIST — picked from the lander. Getting
     * this wrong does not just misfile the subscriber: every writer sends
     * update_existing:true, so sending two stages to the SAME list makes the
     * second overwrite the first's custom fields. That is exactly what happened
     * on the first dev run — main, upsell 1 and upsell 2 all went to the paid
     * list, and the main purchase's $44.77 / energy_clearing_ritual were
     * replaced by upsell 2's $47 / manifestation_bracelet.
     */
    stage: (lander: PaiLander) => PaiLander['upsell1'];
  },
) {
  const { customerId, instrumentId, mainTransactionId, amountCents, hook, firstName = 'PaiTest', email: rawEmail } =
    req.body ?? {};

  if (!customerId || !instrumentId || !mainTransactionId) {
    return res
      .status(400)
      .json({ error: 'need customerId, instrumentId and mainTransactionId' });
  }

  // Before the charge, same as /checkout. The page sends the hook the main
  // purchase used; with none, this is the original soulmate dummy.
  const lander = resolvePaiLander(hook);
  if (!lander) return unknownHook(res, hook);

  // 🔴 THE 23-OCTOBER GUARD. Their platform does not enforce this — Tim
  // reproduced a declined CIT still allowing an approved MIT on production.
  const guard = await assertCitApproved(mainTransactionId);
  if (!guard.approved) {
    logger.warn(`[pai] ${opts.label} BLOCKED by MIT guard: ${guard.reason}`);
    return res.status(409).json({
      ok: false,
      blockedByGuard: true,
      reason: guard.reason,
      note: 'Refused because the originating customer-initiated transaction was not approved. '
        + 'Payments.AI does not enforce this today; MasterCard begins enforcing 23 October.',
    });
  }

  const email = paiTestEmail(rawEmail);
  const cents = Number(amountCents) || opts.defaultCents;

  const metadata: Record<string, string> = {
    product: opts.product,
    type: opts.label,
    funnel: PAI_FUNNEL,
    firstName,
    email,
    app: 'the-seer-within',
    // The ONLY join back to the main purchase — Payments.AI has no session
    // object, so this is what Stripe's cs_live_… grouping is replaced by.
    originalSession: mainTransactionId,
    flow: '1click',
  };

  const tx = await charge({
    customerId,
    amountCents: cents,
    metadata,
    idempotencyKey: idem(opts.label),
    paymentInstrumentId: instrumentId,
    isMerchantInitiated: true,
  });
  if (!tx.ok || !tx.data?.id) {
    return res.status(502).json({ ok: false, error: tx.error, raw: tx.raw });
  }

  const settled = (await settleTransaction(tx.data.id)) ?? tx.data;
  const approved = String(settled.result ?? '').toLowerCase() === 'approved';
  let aweber: AweberResult = { success: false, error: 'not attempted' };
  const stage = opts.stage(lander)({ email, name: firstName, orderId: settled.id, cents });

  if (approved) {
    try {
      await opts.markPurchased(settled.id, cents, mainTransactionId);
    } catch (err) {
      logger.error(`[pai] ${opts.label} DB write failed: ${String(err)}`);
    }

    // PostHog for the upsell leg. The agreed A/B design splits the UPSELL CHARGE,
    // so this is the arm's headline number — it must not be missing.
    capturePaiPurchase({
      metadata,
      amountCents: cents,
      transactionId: settled.id,
      email,
    });
    // The live tag for this stage, plus our marker. Must match what the live
    // funnel writes, or any automation keyed on the tag will not fire.
    aweber = await timedWrite(stage, opts.label);
  }

  res.json({
    ok: approved,
    hook: lander.hook,
    transactionId: settled.id,
    result: settled.result,
    amountReturned: settled.amount,
    amountSentCents: cents,
    // Their answers say this links a refund to its parent; on an MIT we have
    // seen it come back null in every sandbox round. Reported so we can see it.
    parentTransactionId: settled.parentTransactionId ?? null,
    metadataAudit: auditMetadata(metadata, settled.metadata),
    aweber: {
      attempted: approved,
      ...aweber,
      listConfigured: Boolean(stage.listId),
      listId: stage.listId,
      tags: stage.tags,
    },
  });
}

router.post('/upsell/charge', (req, res) =>
  chargeUpsell(req, res, {
    product: 'protection_ritual',
    defaultCents: 4700,
    label: 'upsell1',
    markPurchased: (txId, cents, mainTxId) => markUpsellPurchased(mainTxId, txId, cents),
    // Its OWN list and the live tag — see the note on `stage` above.
    stage: (l) => l.upsell1,
  }),
);

router.post('/upsell2/charge', (req, res) =>
  chargeUpsell(req, res, {
    product: 'manifestation_bracelet',
    defaultCents: 4700,
    label: 'upsell2',
    markPurchased: (txId, cents, mainTxId) =>
      markUpsell2Purchased(mainTxId, txId, cents, 'manifestation_bracelet'),
    stage: (l) => l.upsell2,
  }),
);

export default router;
