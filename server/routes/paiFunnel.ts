/**
 * DEV-ONLY Payments.AI dummy funnel — the server half of `/fb-tarot/pai`.
 *
 * WHAT THIS IS FOR. We are going to split traffic between Stripe and Payments.AI
 * on the soulmate landers. Before any of that, we need to know whether their
 * written answers hold up inside the funnel we actually run — not just against
 * their API in isolation. So this clones the live tarot flow
 *   main + order bump  ->  upsell 1  ->  upsell 2  ->  DB row  ->  AWeber
 * onto Payments.AI, against the hook `cards-after-marriage`
 * (family soulmate-ageband, bucket love).
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
import { writeSoulmateSubscriber } from '../lib/aweber';
import { updateStripeData, markUpsellPurchased, markUpsell2Purchased } from '../lib/db';

const router = Router();

/** The tag that identifies every record this funnel creates. */
const PAI_TAG = 'paymentsAI';

/** The dummy lander this mirrors. */
const PAI_HOOK = 'cards-after-marriage';
const PAI_FUNNEL = 'fb-tarot';

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
router.get('/config', async (_req: Request, res: Response) => {
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
    hook: PAI_HOOK,
    funnel: PAI_FUNNEL,
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
    firstName = 'PaiTest',
    email: rawEmail,
    bucket = 'love',
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
          bumpProduct: 'soulmate_reading_bump',
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
    let aweber: { success: boolean; error?: string } = {
      success: false,
      error: 'not attempted',
    };
    let dbWritten = false;

    // DB row — dev Supabase, separate from production.
    if (approved) {
      try {
        await updateStripeData(
          email,
          {
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

      // AWeber — the REAL soulmate lists, with the paymentsAI tag added
      // alongside the existing ones. Safe because those lists carry thank-you
      // emails only and the address is +pai on a domain we own.
      aweber = await writeSoulmateSubscriber({
        listId: process.env.AWEBER_SOULMATE_PAID_LIST_ID || '',
        listLabel: 'Soulmate Sketch Buyers (PAI dev)',
        email,
        name: firstName,
        customFields: {
          stripe_order_id: settled.id,
          purchase_amount_usd: String(totalCents / 100),
          product: 'energy_clearing_ritual',
        },
        tags: ['soulmate-sketch-buyer', PAI_TAG],
      });
    }

    res.json({
      ok: approved,
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
        listConfigured: Boolean(process.env.AWEBER_SOULMATE_PAID_LIST_ID),
        listId: process.env.AWEBER_SOULMATE_PAID_LIST_ID || null,
        tags: ['soulmate-sketch-buyer', PAI_TAG],
      },
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
     * 🔴 EACH FUNNEL STAGE HAS ITS OWN AWEBER LIST. Getting this wrong does not
     * just misfile the subscriber: writeSoulmateSubscriber sends
     * update_existing:true, so sending two stages to the SAME list makes the
     * second overwrite the first's custom fields. That is exactly what happened
     * on the first dev run — main, upsell 1 and upsell 2 all went to the paid
     * list, and the main purchase's $44.77 / energy_clearing_ritual were
     * replaced by upsell 2's $47 / manifestation_bracelet.
     */
    awebeListId: string;
    /** The live tag for this stage — NOT a generated one. */
    awebeTag: string;
    awebeProduct: string;
    awebeLabel: string;
  },
) {
  const { customerId, instrumentId, mainTransactionId, amountCents, firstName = 'PaiTest', email: rawEmail } =
    req.body ?? {};

  if (!customerId || !instrumentId || !mainTransactionId) {
    return res
      .status(400)
      .json({ error: 'need customerId, instrumentId and mainTransactionId' });
  }

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
  let aweber: { success: boolean; error?: string } = { success: false, error: 'not attempted' };

  if (approved) {
    try {
      await opts.markPurchased(settled.id, cents, mainTransactionId);
    } catch (err) {
      logger.error(`[pai] ${opts.label} DB write failed: ${String(err)}`);
    }
    aweber = await writeSoulmateSubscriber({
      listId: opts.awebeListId || '',
      listLabel: `${opts.awebeLabel} (PAI dev)`,
      email,
      name: firstName,
      customFields: {
        stripe_order_id: settled.id,
        purchase_amount_usd: String(cents / 100),
        product: opts.awebeProduct,
      },
      // The live tag for this stage, plus our marker. Must match what the live
      // funnel writes, or any automation keyed on the tag will not fire.
      tags: [opts.awebeTag, PAI_TAG],
    });
  }

  res.json({
    ok: approved,
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
      listConfigured: Boolean(opts.awebeListId),
      listId: opts.awebeListId || null,
      tags: [opts.awebeTag, PAI_TAG],
    },
  });
}

router.post('/upsell/charge', (req, res) =>
  chargeUpsell(req, res, {
    product: 'protection_ritual',
    defaultCents: 4700,
    label: 'upsell1',
    markPurchased: (txId, cents, mainTxId) => markUpsellPurchased(mainTxId, txId, cents),
    // Its OWN list and the live tag — see the note on awebeListId above.
    awebeListId: process.env.AWEBER_SOULMATE_UPSELL1_LIST_ID || '',
    awebeTag: 'soulmate-bracelet-buyer',
    awebeProduct: 'soulmate_bracelet',
    awebeLabel: 'Soulmate Bracelet Buyers',
  }),
);

router.post('/upsell2/charge', (req, res) =>
  chargeUpsell(req, res, {
    product: 'manifestation_bracelet',
    defaultCents: 4700,
    label: 'upsell2',
    markPurchased: (txId, cents, mainTxId) =>
      markUpsell2Purchased(mainTxId, txId, cents, 'manifestation_bracelet'),
    awebeListId: process.env.AWEBER_SOULMATE_UPSELL2_LIST_ID || '',
    awebeTag: 'soulmate-love-tuner-buyer',
    awebeProduct: 'soulmate_love_tuner',
    awebeLabel: 'Soulmate Love Tuner Buyers',
  }),
);

export default router;
