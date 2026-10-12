/**
 * /api/pai-live — the Payments.AI card form on the REAL funnel (the live split).
 *
 * Reached only by a buyer /api/checkout has already put on Payments.AI: it hands the
 * page a signed order instead of a Stripe URL, and the page posts that order back
 * here with the card. See server/lib/paiLive.ts for the whole design.
 *
 * Unlike the dev harness (/api/pai, staging-only, refused on the live hosts) this
 * router is meant to run in production — it is gated on PAI_LIVE_ENABLED=1 and a
 * complete PAI_LIVE_* config instead, and every request still needs a valid signed
 * order, which only /api/checkout can issue.
 */
import { Router, Request, Response } from 'express';
import logger from '../lib/logger';
import {
  chargeMain,
  completeMain,
  payUpsellWithCard,
  completeUpsellWithCard,
  upsell2Cents,
  afterUpsellPath,
  funnelForPaiPayment,
  type ShippingInput,
  type UpsellStep,
  normalizePhone,
  publishableKey,
  smsQuestion,
  verifyOrder,
  type PaiLiveDeps,
} from '../lib/paiLive';
import { liveConfig, paiLiveReady } from '../lib/paymentsai';
import { getConversationByStripeSession } from '../lib/db';
import { getVariantForEmail } from '../lib/priceVariant';
import { funnelDefForParam } from '@shared/funnelConfig';
import { isPaiOrderId } from '@shared/paymentGateway';

/** A shipping address from the card page, or undefined if it is not a complete one. */
function shippingOf(raw: unknown): ShippingInput | undefined {
  const a = (raw ?? {}) as Record<string, unknown>;
  const str = (k: string, max = 200) => (typeof a[k] === 'string' ? (a[k] as string).trim().slice(0, max) : '');
  const out = {
    name: str('name'),
    line1: str('line1'),
    line2: str('line2') || undefined,
    city: str('city'),
    state: str('state'),
    postal: str('postal', 20),
    country: str('country', 2).toUpperCase(),
  };
  return out.name && out.line1 && out.city && out.postal && out.country.length === 2 ? out : undefined;
}

function stepOf(raw: unknown): UpsellStep | null {
  return raw === 'upsell1' || raw === 'upsell2' ? raw : null;
}

function braceletTypeOf(raw: unknown): 'full' | 'downsell' {
  return raw === 'downsell' ? 'downsell' : 'full';
}

/** The price of this order's upsell — the same sources the Stripe routes use. */
async function upsellCents(email: string, step: UpsellStep, type: 'full' | 'downsell'): Promise<number> {
  return step === 'upsell1' ? (await getVariantForEmail(email)).upsell1Cents : upsell2Cents(type);
}

const UPSELL_NAMES: Record<UpsellStep, Record<'full' | 'downsell', string>> = {
  upsell1: { full: 'Protection Ritual + Volcanic Stone', downsell: 'Protection Ritual + Volcanic Stone' },
  upsell2: { full: 'Manifestation Bracelet', downsell: 'Manifestation Bracelet (Standard)' },
};

function requestOrigin(req: Request): string {
  const proto = String(req.headers['x-forwarded-proto'] ?? req.protocol).split(',')[0].trim();
  return `${proto}://${req.get('host')}`;
}

function clientIp(req: Request): string | undefined {
  const fwd = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
  return fwd || req.socket.remoteAddress || undefined;
}

export function createPaiLiveRouter(deps: PaiLiveDeps): Router {
  const router = Router();

  router.use((_req, res, next) => {
    const ready = paiLiveReady();
    if (!ready.ready) return res.status(404).json({ error: 'not found' });
    next();
  });

  const policyBase = (req: Request) => process.env.BASE_URL || requestOrigin(req);

  /** Everything the card form needs to boot. Never the secret key. */
  router.get('/config', async (req: Request, res: Response) => {
    const funnel = funnelDefForParam(req.query.funnel)?.param;
    const key = await publishableKey();
    if (!key) return res.status(503).json({ error: 'payment form unavailable' });
    const cfg = liveConfig();
    res.json({
      publishableKey: key,
      organizationId: cfg.orgId,
      websiteId: process.env.PAI_LIVE_WEBSITE_ID || undefined,
      sms: smsQuestion(funnel, policyBase(req)),
    });
  });

  /** She pressed Pay: charge the card for the order /api/checkout priced. */
  router.post('/checkout', async (req: Request, res: Response) => {
    const order = verifyOrder(req.body?.orderToken);
    if (!order) return res.status(400).json({ ok: false, error: 'This checkout has expired. Please go back and try again.' });
    const cardToken = typeof req.body?.cardToken === 'string' ? req.body.cardToken : '';
    if (!cardToken) return res.status(400).json({ ok: false, error: 'Please enter your card details.' });
    const phone = normalizePhone(req.body?.phone);
    if (!phone) {
      return res.status(400).json({ ok: false, error: 'Please enter your phone number with the country code, e.g. +1 555 555 0123' });
    }

    // Where 3DS sends her back: the funnel's own chat page, flagged to finish.
    const returnUrl =
      `${requestOrigin(req)}${deps.funnelPath('/chat', order.funnel ?? undefined)}?paiReturn=1`;
    try {
      const out = await chargeMain(
        {
          order,
          cardToken,
          phone,
          smsAnswer: req.body?.smsConsent,
          ip: clientIp(req),
          returnUrl,
          policyBase: policyBase(req),
        },
        deps,
      );
      switch (out.kind) {
        case 'approved':
          return res.json({ ok: true, transactionId: out.transactionId, redirect: out.redirect, totalCents: out.totalCents });
        case 'needs3ds':
          return res.json({ ok: false, needs3ds: true, transactionId: out.transactionId, approvalLink: out.approvalLink });
        case 'declined':
          return res.json({ ok: false, declined: true, error: out.message });
        default:
          return res.status(502).json({ ok: false, error: out.message });
      }
    } catch (err) {
      logger.error('[pai-live] checkout error', { err: String(err) });
      return res.status(500).json({ ok: false, error: 'We could not complete the payment. Please try again.' });
    }
  });

  /** Back from the 3DS challenge. */
  router.post('/checkout/complete', async (req: Request, res: Response) => {
    const order = verifyOrder(req.body?.orderToken);
    const transactionId = typeof req.body?.transactionId === 'string' ? req.body.transactionId : '';
    if (!order || !transactionId.startsWith('txn_')) {
      return res.status(400).json({ ok: false, error: 'This checkout has expired. Please go back and try again.' });
    }
    const phone = normalizePhone(req.body?.phone) ?? '';
    try {
      const out = await completeMain(
        {
          order,
          transactionId,
          phone,
          smsAnswer: req.body?.smsConsent,
          ip: clientIp(req),
          policyBase: policyBase(req),
        },
        deps,
      );
      switch (out.kind) {
        case 'approved':
          return res.json({ ok: true, transactionId: out.transactionId, redirect: out.redirect, totalCents: out.totalCents });
        case 'waiting':
          return res.json({ ok: false, stillWaiting: true, transactionId: out.transactionId });
        case 'declined':
          return res.json({ ok: false, declined: true, error: out.message });
        case 'needs3ds':
          return res.json({ ok: false, needs3ds: true, transactionId: out.transactionId, approvalLink: out.approvalLink });
        default:
          return res.status(502).json({ ok: false, error: out.message });
      }
    } catch (err) {
      logger.error('[pai-live] 3DS completion error', { err: String(err) });
      return res.status(500).json({ ok: false, error: 'We could not confirm the payment. Please contact support.' });
    }
  });

  // ── The card page (/pai/pay): the upsell fallback ───────────────────────────
  // Where a declined 1-click upsell on a Payments.AI order goes — the counterpart of
  // the hosted Stripe checkout a declined Stripe 1-click goes to.

  /** What the page shows: the product and price. No personal data. */
  router.get('/upsell/info', async (req: Request, res: Response) => {
    const orderId = String(req.query.order ?? '');
    const step = stepOf(req.query.step);
    if (!isPaiOrderId(orderId) || !step) return res.status(400).json({ error: 'bad request' });
    const convo = await getConversationByStripeSession(orderId);
    if (!convo || convo.paymentGateway !== 'paymentsai') return res.status(404).json({ error: 'Order not found' });
    const type = braceletTypeOf(req.query.type);
    const bought = step === 'upsell1' ? convo.upsellPurchased : convo.upsell2Purchased;
    // The funnel the order was bought on (its main attempt row), for the next page.
    const funnel = await funnelForPaiPayment(orderId);
    res.json({
      // Where to go after paying — or on "no thanks" — exactly where Stripe's would.
      next: afterUpsellPath(step, orderId, funnel, deps),
      skip:
        step === 'upsell1'
          ? `${deps.funnelPath('/welcome2', funnel)}?session_id=${encodeURIComponent(orderId)}`
          : `${deps.funnelPath('/success', funnel)}?session_id=${encodeURIComponent(orderId)}`,
      step,
      type,
      productName: UPSELL_NAMES[step][type],
      cents: await upsellCents(convo.email, step, type),
      alreadyPurchased: !!bought,
      // Upsell 2 reuses upsell 1's address when there is one (Path A) — never shown.
      needsShipping: step === 'upsell1' || !convo.shippingLine1,
    });
  });

  router.post('/upsell/pay', async (req: Request, res: Response) => {
    const orderId = String(req.body?.orderId ?? '');
    const step = stepOf(req.body?.step);
    const cardToken = typeof req.body?.cardToken === 'string' ? req.body.cardToken : '';
    if (!isPaiOrderId(orderId) || !step || !cardToken) {
      return res.status(400).json({ ok: false, error: 'Please enter your card details.' });
    }
    const convo = await getConversationByStripeSession(orderId);
    if (!convo || convo.paymentGateway !== 'paymentsai') {
      return res.status(404).json({ ok: false, error: 'We could not find your order.' });
    }
    const type = braceletTypeOf(req.body?.type);
    const shipping = shippingOf(req.body?.shipping);
    if (!shipping && (step === 'upsell1' || !convo.shippingLine1)) {
      return res.status(400).json({ ok: false, error: 'Please enter your full shipping address.' });
    }
    const q = new URLSearchParams({ order: orderId, step, type, paiReturn: '1' });
    try {
      const out = await payUpsellWithCard(
        {
          orderId,
          step,
          cents: await upsellCents(convo.email, step, type),
          braceletType: type,
          cardToken,
          shipping,
          returnUrl: `${requestOrigin(req)}/pai/pay?${q.toString()}`,
        },
        deps,
      );
      switch (out.kind) {
        case 'approved':
          return res.json({ ok: true, redirect: out.redirect });
        case 'needs3ds':
          return res.json({ ok: false, needs3ds: true, transactionId: out.transactionId, approvalLink: out.approvalLink });
        case 'declined':
          return res.json({ ok: false, declined: true, error: out.message });
        default:
          return res.status(502).json({ ok: false, error: out.message });
      }
    } catch (err) {
      logger.error('[pai-live] upsell card error', { err: String(err) });
      return res.status(500).json({ ok: false, error: 'We could not complete the payment. Please try again.' });
    }
  });

  router.post('/upsell/complete', async (req: Request, res: Response) => {
    const orderId = String(req.body?.orderId ?? '');
    const step = stepOf(req.body?.step);
    const transactionId = String(req.body?.transactionId ?? '');
    if (!isPaiOrderId(orderId) || !step || !isPaiOrderId(transactionId)) {
      return res.status(400).json({ ok: false, error: 'bad request' });
    }
    try {
      const out = await completeUpsellWithCard(
        { orderId, step, transactionId, shipping: shippingOf(req.body?.shipping) },
        deps,
      );
      switch (out.kind) {
        case 'approved':
          return res.json({ ok: true, redirect: out.redirect });
        case 'waiting':
          return res.json({ ok: false, stillWaiting: true });
        case 'declined':
          return res.json({ ok: false, declined: true, error: out.message });
        case 'needs3ds':
          return res.json({ ok: false, needs3ds: true, approvalLink: out.approvalLink });
        default:
          return res.status(502).json({ ok: false, error: out.message });
      }
    } catch (err) {
      logger.error('[pai-live] upsell 3DS completion error', { err: String(err) });
      return res.status(500).json({ ok: false, error: 'We could not confirm the payment. Please contact support.' });
    }
  });

  return router;
}

