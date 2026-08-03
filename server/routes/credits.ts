import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { users, creditPurchases, personas, checkoutViews, chatSessions } from '@shared/schema';
import { eq, and, ne, desc, sql } from 'drizzle-orm';
import { requireAuth, verifyToken } from '../lib/auth';
import { getPersonaPricing } from '../lib/personaPricing';
import { DEFAULT_PRICING, CUSTOM_TOPUP_MAX_USD, CUSTOM_PACKAGE_TYPE, WELCOME_PACK_COINS, WELCOME_PACK_PRICE_CENTS, usdCentsToCoins, coinsToClock, minutesToCoins, COINS_PER_MINUTE, type PricingTier } from '../../shared/types';
import { applyVariantPresentation } from '@shared/paywall';
import { resolvePaywallVariant, assign, logExposure, paywallScopePersonaId, PAYWALL_EXPERIMENT_KEY } from '../lib/experiments';
import Stripe from 'stripe';
import { getStripe, verifyStripeWebhook, activeStripeAccountTag } from '../lib/stripeAccount';
import logger from '../lib/logger';
import { posthog } from '../lib/posthog';
import { fireWithBreaker, stripeBreaker, isCircuitOpenError } from '../lib/circuitBreaker';
import * as paypal from '../lib/paypal';
import { fireV2PurchaseEvent } from '../lib/facebook';
import { maybeSchedulePostPurchaseDrip } from '../lib/postPurchaseDripTrigger';

const router = Router();

// Active-account Stripe client (A primary / B backup) via the central helper.
const stripe = getStripe();

// Special one-time welcome pack — not part of regular persona pricing
const WELCOME_TIER = {
  packageType: 'welcome',
  coins: WELCOME_PACK_COINS,
  bonusCoins: 0,
  totalCoins: WELCOME_PACK_COINS,
  priceUsd: WELCOME_PACK_PRICE_CENTS,
  label: coinsToClock(WELCOME_PACK_COINS),
};

// Aiden-only rescue hatch shown on the /aiden check-your-email screen after 60s.
// Same price, coins, and minutes as the generic starter ($9.99 / 180 coins / 3 min) —
// the distinct packageType 'aiden_rescue' exists purely so these purchases are
// directly attributable to the Aiden rescue-hatch flow in reporting, separate from
// regular in-chat starter top-ups that use packageType 'starter'.
const AIDEN_RESCUE_TIER = {
  packageType: 'aiden_rescue',
  coins: minutesToCoins(3),        // 3:00 of wallet at the default rate = 897¢ (was 180 coins/3min)
  bonusCoins: 0,
  totalCoins: minutesToCoins(3),
  priceUsd: 999,                   // $9.99 → effective $3.33/min (unchanged; Joel's call)
  label: coinsToClock(minutesToCoins(3)),  // "3:00"
};

/** Resolve tier: handle special code-level packageTypes or look up from persona pricing */
function resolveTier(packageType: string, pricing: { tiers: Array<{ packageType: string; coins: number; bonusCoins: number; totalCoins: number; priceUsd: number; label: string }> }) {
  if (packageType === 'welcome') return WELCOME_TIER;
  if (packageType === 'aiden_rescue') return AIDEN_RESCUE_TIER;
  return pricing.tiers.find(t => t.packageType === packageType);
}

/**
 * Build a synthetic tier for a CUSTOM top-up amount (in cents). Coins are
 * computed server-side from the flat per-minute rate (never trusting the
 * client), and the amount is validated against the floor (the persona's
 * cheapest pack) and the platform cap. Returns { error } if out of bounds.
 */
function resolveCustomTier(
  amountCents: number,
  pricing: { tiers: Array<{ priceUsd: number }> },
): PricingTier | { error: string } {
  if (!Number.isFinite(amountCents) || !Number.isInteger(amountCents)) {
    return { error: 'Invalid custom amount' };
  }
  const floor = pricing.tiers.length ? Math.min(...pricing.tiers.map(t => t.priceUsd)) : 1000;
  const cap = CUSTOM_TOPUP_MAX_USD * 100;
  if (amountCents < floor) return { error: `Minimum top-up is $${Math.round(floor / 100)}` };
  if (amountCents > cap) return { error: `Maximum top-up is $${CUSTOM_TOPUP_MAX_USD}` };
  const coins = usdCentsToCoins(amountCents);
  return {
    packageType: CUSTOM_PACKAGE_TYPE,
    coins,
    bonusCoins: 0,
    totalCoins: coins,
    priceUsd: amountCents,
    label: `$${(amountCents / 100).toFixed(2)}`,
  };
}

/**
 * Resolve whatever the client asked to buy — a named package OR a custom dollar
 * amount — into a concrete tier. One place so all three payment entry points
 * (Checkout, PaymentIntent, PayPal order) treat custom identically.
 */
function resolveRequestedTier(
  packageType: string,
  customAmountUsd: number | undefined,
  pricing: { tiers: Array<{ packageType: string; coins: number; bonusCoins: number; totalCoins: number; priceUsd: number; label: string }> },
): { tier?: any; error?: string } {
  if (packageType === CUSTOM_PACKAGE_TYPE) {
    if (typeof customAmountUsd !== 'number') return { error: 'Custom amount is required' };
    const result = resolveCustomTier(customAmountUsd, pricing);
    if ('error' in result) return { error: result.error };
    return { tier: result };
  }
  const tier = resolveTier(packageType, pricing);
  return tier ? { tier } : { error: 'Invalid package type' };
}

const checkoutSchema = z.object({
  packageType: z.string().min(1),
  personaId: z.string().min(1).optional(),
  successPath: z.string().optional(), // Optional override for post-checkout redirect (e.g. /chat/aiden-powers)
  customAmountUsd: z.number().int().positive().optional(), // cents, required when packageType === 'custom'
});

function getBaseUrl(req: Request): string {
  const origin = req.headers.origin;
  if (origin) return origin;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (host) return `${proto}://${host}`;
  return process.env.BASE_URL || 'http://localhost:5000';
}

// GET /api/credits/balance
router.get('/balance', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.select({
      coinBalance: users.coinBalance,
      totalCoinsUsed: users.totalCoinsUsed,
    })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    if (!result[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      coinBalance: result[0].coinBalance,
      totalCoinsUsed: result[0].totalCoinsUsed,
    });
  } catch (error) {
    logger.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// GET /api/credits/welcome-eligible — check if user can see the $2.99 welcome offer
router.get('/welcome-eligible', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await db.select({ id: creditPurchases.id })
      .from(creditPurchases)
      .where(
        and(
          eq(creditPurchases.userId, req.userId!),
          eq(creditPurchases.packageType, 'welcome'),
          eq(creditPurchases.status, 'completed'),
        ),
      )
      .limit(1);

    res.json({ eligible: existing.length === 0 });
  } catch (error) {
    logger.error('Welcome eligibility check error:', error);
    res.json({ eligible: false });
  }
});

/**
 * Which persona to resolve the paywall EXPERIMENT against when the request has no
 * explicit personaId (e.g. the universal /credits nav tab, which links to a bare
 * `/credits`). Order: the explicit param → the user's most-recently-used persona
 * → the paywall test's own scoped persona. This lets an enrolled user see THEIR
 * real variant on the shared credits page no matter how they got there, WITHOUT
 * enrolling out-of-scope users: assign()'s scope check still gates who's actually
 * in the test, so a non-Evelyn user resolves to their own persona and correctly
 * falls to control 'A'. Never throws — a lookup error falls through to the scope
 * persona (or null), i.e. today's behaviour.
 */
async function resolveExperimentPersonaId(
  userId: string | null,
  personaIdParam: string | null,
): Promise<string | null> {
  if (personaIdParam) return personaIdParam;
  if (userId) {
    try {
      const rows = await db
        .select({ personaId: chatSessions.personaId })
        .from(chatSessions)
        .where(eq(chatSessions.userId, userId))
        .orderBy(desc(chatSessions.updatedAt))
        .limit(1);
      if (rows[0]?.personaId) return rows[0].personaId;
    } catch (e) {
      logger.error('resolveExperimentPersonaId: latest-session lookup failed', e);
    }
  }
  return paywallScopePersonaId();
}

// GET /api/credits/pricing?personaId=xxx
// Public route. Returns pricing PLUS the paywall A/B `variant` for this user.
// Variant B re-badges tiers (MOST CHOSEN / BEST VALUE + `recommended`); variant
// A returns tiers untouched, so the current UI is byte-identical.
//
// When no personaId is supplied (the universal /credits tab), the VARIANT and the
// display persona fall back to the user's current persona (see
// resolveExperimentPersonaId) so an enrolled user still gets their real arm here;
// the priced tiers themselves are unchanged (bare request → DEFAULT_PRICING).
router.get('/pricing', async (req: Request, res: Response) => {
  try {
    const personaId = req.query.personaId as string | undefined;
    const pricing = personaId ? await getPersonaPricing(personaId) : DEFAULT_PRICING;

    // Optional auth: the route is public, but decode the bearer token when present
    // so the experiment assignment is sticky per user.id.
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const userId = token ? verifyToken(token)?.userId ?? null : null;

    // The `?paywallVariant=A|B` QA override is honoured in non-production, OR when
    // ALLOW_PAYWALL_QA_OVERRIDE=true is explicitly set — so QA can preview either
    // variant on the (production-build) Railway dev service WITHOUT starting the
    // experiment (it stays draft; nobody is enrolled; the shared-DB experiment row
    // is untouched). Production never sets this flag, so the override stays off
    // there and live users are still split only by the real experiment.
    const allowPaywallOverride =
      process.env.NODE_ENV !== 'production' || process.env.ALLOW_PAYWALL_QA_OVERRIDE === 'true';
    // Resolve the persona the experiment is scored against: the explicit param, else
    // the user's current persona, else the test's scoped persona — so a bare
    // /credits (nav tab) still yields the user's real arm. Priced tiers stay based
    // on the ORIGINAL param (bare → DEFAULT_PRICING), so no price changes.
    const experimentPersonaId = await resolveExperimentPersonaId(userId, personaId ?? null);
    const variant = await resolvePaywallVariant({
      userId,
      personaId: experimentPersonaId,
      override: (req.query.paywallVariant as string) ?? null,
      allowOverride: allowPaywallOverride,
    });

    // Persona display info (name + avatar) for the redesigned store/modal. Use the
    // explicit param, else the resolved experiment persona, so the variant-B store
    // still renders a name/avatar on the bare /credits tab.
    const displayPersonaId = personaId ?? experimentPersonaId;
    let persona: { id: string; displayName: string; avatarUrl: string | null; tagline: string | null; freeCoins: number; coinsPerMinute: number } | undefined;
    if (displayPersonaId) {
      const rows = await db.select({
        id: personas.id,
        displayName: personas.displayName,
        avatarUrl: personas.avatarUrl,
        tagline: personas.tagline,
        freeCoins: personas.freeCoins,
        coinsPerMinute: personas.coinsPerMinute,
      }).from(personas).where(eq(personas.id, displayPersonaId)).limit(1);
      persona = rows[0];
    }

    res.json({
      ...pricing,
      // The guide's $/min in wallet units (cents/min). The client derives pack
      // minutes and the "$X/min" label from THIS, so a per-persona rate shows the
      // right time + price at the point of sale. Falls back to the default rate for
      // a bare /credits request (no persona in context).
      coinsPerMinute: persona?.coinsPerMinute ?? COINS_PER_MINUTE,
      tiers: applyVariantPresentation(pricing.tiers, variant),
      persona,
      variant,
      experimentKey: PAYWALL_EXPERIMENT_KEY,
    });
  } catch (error) {
    logger.error('Get pricing error:', error);
    res.status(500).json({ error: 'Failed to get pricing' });
  }
});

// GET /api/credits/purchases
router.get('/purchases', requireAuth, async (req: Request, res: Response) => {
  try {
    const purchases = await db.select()
      .from(creditPurchases)
      .where(eq(creditPurchases.userId, req.userId!))
      .orderBy(desc(creditPurchases.createdAt))
      .limit(50);

    res.json({ purchases });
  } catch (error) {
    logger.error('Get purchases error:', error);
    res.status(500).json({ error: 'Failed to get purchases' });
  }
});

// POST /api/credits/checkout-view - Log when user opens a payment modal (for conversion tracking)
router.post('/checkout-view', requireAuth, async (req: Request, res: Response) => {
  try {
    const { packageType, personaId, source, isOutOfCredits } = req.body;
    if (!packageType || !source) {
      res.status(400).json({ error: 'packageType and source are required' });
      return;
    }
    await db.insert(checkoutViews).values({
      userId: req.userId!,
      packageType,
      personaId: personaId || null,
      source,
    });
    // Experiment exposure (Problem-4 paywall, folded into the generic framework).
    // Log ONLY when the subject is enrolled (test running + in scope), so the
    // first exposure row is their first IN-TEST exposure. While the experiment is
    // OFF (Phase-1 ship state) nothing is logged. Non-blocking — never fail UX.
    // Resolve the persona the SAME way /pricing does, so a modal opened from the
    // bare /credits tab (no personaId) still logs the exposure for an in-scope
    // user — and stays gated to in-scope users (assign()'s scope check), so
    // out-of-scope personas never get enrolled here.
    try {
      const experimentPersonaId = await resolveExperimentPersonaId(req.userId!, personaId ?? null);
      const a = await assign(PAYWALL_EXPERIMENT_KEY, req.userId!, {
        personaId: experimentPersonaId,
        isOutOfCredits: !!isOutOfCredits,
      });
      if (a?.enrolled) {
        await logExposure(PAYWALL_EXPERIMENT_KEY, req.userId!, a.variant, source, {
          personaId: experimentPersonaId,
          isOutOfCredits: !!isOutOfCredits,
        });
      }
    } catch (e) {
      logger.error('experiment exposure failed:', e);
    }
    posthog.capture({ distinctId: req.userId!, event: 'checkout_view_logged', properties: { package_type: packageType, persona_id: personaId ?? null, source } });
    res.json({ ok: true });
  } catch (error) {
    logger.error('Checkout view tracking error:', error);
    // Non-blocking — don't fail the user experience for tracking
    res.json({ ok: true });
  }
});

// POST /api/credits/checkout
router.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  const parseResult = checkoutSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.errors.map(e => e.message).join(', '),
    });
    return;
  }

  const { packageType, personaId, successPath, customAmountUsd } = parseResult.data;

  let pricing, tier, personaName: string, userResult;
  let personaRate: number = COINS_PER_MINUTE; // cents/min for the checkout time label
  try {
    pricing = personaId ? await getPersonaPricing(personaId) : DEFAULT_PRICING;
    const resolved = resolveRequestedTier(packageType, customAmountUsd, pricing);
    if (resolved.error) {
      res.status(400).json({ error: resolved.error });
      return;
    }
    tier = resolved.tier;

    personaName = 'Chat';
    if (personaId) {
      const personaResult = await db.select({ displayName: personas.displayName, coinsPerMinute: personas.coinsPerMinute })
        .from(personas)
        .where(eq(personas.id, personaId))
        .limit(1);
      personaName = personaResult[0]?.displayName || 'Chat';
      if (personaResult[0]?.coinsPerMinute) personaRate = personaResult[0].coinsPerMinute;
    }

    userResult = await db.select({ email: users.email, firstName: users.firstName })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    if (!userResult[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
  } catch (error) {
    logger.error('Credits checkout setup error:', error);
    res.status(500).json({ error: 'Checkout failed' });
    return;
  }

  // Insert the pending record only now that we have all the data we need.
  // If the Stripe call below fails we delete this record so we don't leak
  // orphaned pending rows.
  const purchase = await db.insert(creditPurchases).values({
    userId: req.userId!,
    personaId: personaId || null,
    packageType: tier.packageType,
    coinsPurchased: tier.coins,
    bonusCoins: tier.bonusCoins,
    priceUsd: tier.priceUsd,
    status: 'pending',
    stripeAccount: activeStripeAccountTag(),
  }).returning();

  const purchaseId = purchase[0].id;

  if (!stripe) {
    // Dev / test mode: instantly complete the purchase without a real Stripe session.
    await db.update(creditPurchases)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(creditPurchases.id, purchaseId));

    await db.update(users)
      .set({
        coinBalance: sql`coin_balance + ${tier.totalCoins}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.userId!));

    res.json({ url: successPath || '/chat-service?purchased=true', devMode: true });
    return;
  }

  try {
    // Customer-facing product name/description (shown on Stripe's checkout page
    // and the email receipt) — actual m:ss time, never the internal unit.
    const timeLabel = coinsToClock(tier!.totalCoins, personaRate);
    const session = await fireWithBreaker(stripeBreaker, () =>
      stripe!.checkout.sessions.create({
        customer_email: userResult[0].email,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${personaName} — ${timeLabel} of reading time`,
              description: `${timeLabel} of reading time with ${personaName}`,
            },
            unit_amount: tier!.priceUsd,
          },
          quantity: 1,
        }],
        mode: 'payment',
        metadata: {
          app: 'the-seer-within-chat',
          purchaseId,
          userId: req.userId!,
          ...(personaId ? { personaId } : {}),
          packageType: tier!.packageType,
          totalCoins: String(tier!.totalCoins),
        },
        success_url: successPath
          ? `${getBaseUrl(req)}${successPath}?purchased=true&session_id={CHECKOUT_SESSION_ID}`
          : `${getBaseUrl(req)}/chat-service?purchased=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: successPath
          ? `${getBaseUrl(req)}${successPath}?cancelled=true`
          : `${getBaseUrl(req)}/chat-service?cancelled=true`,
      }),
    );

    await db.update(creditPurchases)
      .set({ stripeSessionId: session.id, stripeAccount: activeStripeAccountTag(), updatedAt: new Date() })
      .where(eq(creditPurchases.id, purchaseId));

    posthog.capture({ distinctId: req.userId!, event: 'checkout_initiated', properties: { payment_method: 'stripe_checkout', package_type: tier!.packageType, coins: tier!.totalCoins, price_usd_cents: tier!.priceUsd, persona_id: personaId ?? null, purchase_id: purchaseId } });

    res.json({ url: session.url });
  } catch (error) {
    // Stripe call failed — remove the orphaned pending record so it doesn't
    // accumulate and skew reporting.
    try {
      await db.delete(creditPurchases).where(eq(creditPurchases.id, purchaseId));
    } catch (cleanupError) {
      logger.error('Failed to clean up pending purchase after Stripe error:', cleanupError);
    }

    if (isCircuitOpenError(error)) {
      logger.warn('Stripe circuit open, checkout unavailable');
      res.status(503).json({ error: 'Payment service temporarily unavailable. Please try again shortly.' });
    } else {
      logger.error('Credits checkout error:', error);
      res.status(500).json({ error: 'Checkout failed' });
    }
  }
});

// POST /api/credits/create-payment-intent - Stripe inline card payment
const paymentIntentSchema = z.object({
  packageType: z.string().min(1),
  personaId: z.string().min(1).optional(),
  customAmountUsd: z.number().int().positive().optional(), // cents, required when packageType === 'custom'
});

router.post('/create-payment-intent', requireAuth, async (req: Request, res: Response) => {
  const parseResult = paymentIntentSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors.map(e => e.message).join(', ') });
    return;
  }

  const { packageType, personaId, customAmountUsd } = parseResult.data;

  let tier;
  let userEmail: string | undefined;
  try {
    const pricing = personaId ? await getPersonaPricing(personaId) : DEFAULT_PRICING;
    const resolved = resolveRequestedTier(packageType, customAmountUsd, pricing);
    if (resolved.error) {
      res.status(400).json({ error: resolved.error });
      return;
    }
    tier = resolved.tier;

    const userResult = await db.select({ email: users.email })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);
    userEmail = userResult[0]?.email;
  } catch (error) {
    logger.error('Stripe create-payment-intent setup error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
    return;
  }

  const purchase = await db.insert(creditPurchases).values({
    userId: req.userId!,
    personaId: personaId || null,
    packageType: tier.packageType,
    coinsPurchased: tier.coins,
    bonusCoins: tier.bonusCoins,
    priceUsd: tier.priceUsd,
    status: 'pending',
    stripeAccount: activeStripeAccountTag(),
  }).returning();

  const purchaseId = purchase[0].id;

  // Dev mode: auto-complete without Stripe
  if (!stripe) {
    await db.update(creditPurchases)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(creditPurchases.id, purchaseId));

    const updatedUser = await db.update(users)
      .set({
        coinBalance: sql`coin_balance + ${tier.totalCoins}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.userId!))
      .returning({ coinBalance: users.coinBalance });

    res.json({ devMode: true, newBalance: updatedUser[0]?.coinBalance ?? 0 });
    return;
  }

  try {
    const paymentIntent = await fireWithBreaker(stripeBreaker, () =>
      stripe!.paymentIntents.create({
        amount: tier!.priceUsd,
        currency: 'usd',
        ...(userEmail ? { receipt_email: userEmail } : {}),
        metadata: {
          app: 'the-seer-within-chat',
          purchaseId,
          userId: req.userId!,
          ...(personaId ? { personaId } : {}),
          packageType: tier!.packageType,
          totalCoins: String(tier!.totalCoins),
        },
      }),
    );

    await db.update(creditPurchases)
      .set({ stripePaymentIntentId: paymentIntent.id, stripeAccount: activeStripeAccountTag(), updatedAt: new Date() })
      .where(eq(creditPurchases.id, purchaseId));

    res.json({ clientSecret: paymentIntent.client_secret, purchaseId });
  } catch (error) {
    try {
      await db.delete(creditPurchases).where(eq(creditPurchases.id, purchaseId));
    } catch (cleanupError) {
      logger.error('Failed to clean up pending purchase after Stripe error:', cleanupError);
    }

    if (isCircuitOpenError(error)) {
      logger.warn('Stripe circuit open, payment intent unavailable');
      res.status(503).json({ error: 'Payment service temporarily unavailable. Please try again shortly.' });
    } else {
      logger.error('Stripe create-payment-intent error:', error);
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
  }
});

// POST /api/credits/confirm-payment - Stripe payment confirmation
const confirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1),
});

router.post('/confirm-payment', requireAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = confirmPaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors.map(e => e.message).join(', ') });
      return;
    }

    const { paymentIntentId } = parseResult.data;

    if (!stripe) {
      res.status(400).json({ error: 'Stripe not configured' });
      return;
    }

    const purchases = await db.select()
      .from(creditPurchases)
      .where(eq(creditPurchases.stripePaymentIntentId, paymentIntentId))
      .limit(1);

    if (!purchases[0]) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }

    const purchase = purchases[0];
    if (purchase.userId !== req.userId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    if (purchase.status !== 'pending') {
      res.status(400).json({ error: 'Purchase already processed' });
      return;
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      res.status(400).json({ error: `Payment not completed (status: ${paymentIntent.status})` });
      return;
    }

    // Atomic flip: only the first caller (this confirm or the webhook) wins.
    // Returning row(s) tells us whether WE were the one that completed it,
    // so the FB first-purchase event fires exactly once per purchase.
    const flipped = await db.update(creditPurchases)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(and(eq(creditPurchases.id, purchase.id), eq(creditPurchases.status, 'pending')))
      .returning({ id: creditPurchases.id });

    if (flipped.length === 0) {
      // The webhook beat us to it — purchase is already credited. Return current balance.
      const currentUser = await db.select({ coinBalance: users.coinBalance })
        .from(users)
        .where(eq(users.id, req.userId!))
        .limit(1);
      res.json({ success: true, newBalance: currentUser[0]?.coinBalance ?? 0 });
      return;
    }

    const updatedUser = await db.update(users)
      .set({
        coinBalance: sql`coin_balance + ${purchase.coinsPurchased + (purchase.bonusCoins ?? 0)}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.userId!))
      .returning({ coinBalance: users.coinBalance });

    // Clean up any other pending purchases for this user (e.g. abandoned PayPal orders)
    await db.delete(creditPurchases)
      .where(and(
        eq(creditPurchases.userId, req.userId!),
        eq(creditPurchases.status, 'pending'),
        ne(creditPurchases.id, purchase.id),
      ))
      .catch(err => logger.error('Failed to clean up pending purchases:', err));

    // Fire-and-forget — never block the response on FB tracking. Helper
    // emits a Meta Purchase event per completed purchase for /aiden +
    // /evelyn funnel-attributed users (gated on users.signup_funnel).
    fireV2PurchaseEvent(purchase.id).catch(() => { /* logged inside */ });
    // Fire-and-forget — schedules the 10-email post-purchase pastoral-care drip,
    // but only on the first-ever completed purchase. Gated behind
    // ENABLE_POST_PURCHASE_DRIP at send time (cron level).
    maybeSchedulePostPurchaseDrip(purchase.id).catch(() => { /* logged inside */ });

    posthog.capture({ distinctId: req.userId!, event: 'credit_purchase_completed', properties: { payment_method: 'stripe_card', purchase_id: purchase.id, package_type: purchase.packageType, coins: (purchase.coinsPurchased ?? 0) + (purchase.bonusCoins ?? 0), price_usd_cents: purchase.priceUsd, persona_id: purchase.personaId ?? null } });

    const newBalance = updatedUser[0]?.coinBalance ?? 0;
    res.json({ success: true, newBalance });
  } catch (error) {
    logger.error('Stripe confirm-payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// POST /api/credits/create-order - PayPal order creation
const createOrderSchema = z.object({
  packageType: z.string().min(1),
  personaId: z.string().min(1).optional(),
  customAmountUsd: z.number().int().positive().optional(), // cents, required when packageType === 'custom'
});

router.post('/create-order', requireAuth, async (req: Request, res: Response) => {
  const parseResult = createOrderSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.errors.map(e => e.message).join(', '),
    });
    return;
  }

  const { packageType, personaId, customAmountUsd } = parseResult.data;

  let tier;
  try {
    const pricing = personaId ? await getPersonaPricing(personaId) : DEFAULT_PRICING;
    const resolved = resolveRequestedTier(packageType, customAmountUsd, pricing);
    if (resolved.error) {
      res.status(400).json({ error: resolved.error });
      return;
    }
    tier = resolved.tier;
  } catch (error) {
    logger.error('PayPal create-order setup error:', error);
    res.status(500).json({ error: 'Failed to create PayPal order' });
    return;
  }

  // Insert the pending record before calling PayPal so we have an ID to pass
  // as reference. If the PayPal call fails we delete this record immediately
  // to avoid orphaned pending rows.
  const purchase = await db.insert(creditPurchases).values({
    userId: req.userId!,
    personaId: personaId || null,
    packageType: tier.packageType,
    coinsPurchased: tier.coins,
    bonusCoins: tier.bonusCoins,
    priceUsd: tier.priceUsd,
    status: 'pending',
    stripeAccount: activeStripeAccountTag(),
  }).returning();

  const purchaseId = purchase[0].id;

  try {
    const priceFormatted = (tier.priceUsd / 100).toFixed(2);
    const orderId = await paypal.createOrder(priceFormatted, purchaseId);

    await db.update(creditPurchases)
      .set({ paypalOrderId: orderId, updatedAt: new Date() })
      .where(eq(creditPurchases.id, purchaseId));

    posthog.capture({ distinctId: req.userId!, event: 'checkout_initiated', properties: { payment_method: 'paypal', package_type: tier!.packageType, coins: tier!.totalCoins, price_usd_cents: tier!.priceUsd, persona_id: personaId ?? null, purchase_id: purchaseId } });

    res.json({ orderId });
  } catch (error) {
    // PayPal call failed — remove the orphaned pending record.
    try {
      await db.delete(creditPurchases).where(eq(creditPurchases.id, purchaseId));
    } catch (cleanupError) {
      logger.error('Failed to clean up pending purchase after PayPal error:', cleanupError);
    }

    logger.error('PayPal create-order error:', error);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
});

// POST /api/credits/capture-order - PayPal order capture
const captureOrderSchema = z.object({
  orderId: z.string().min(1),
});

router.post('/capture-order', requireAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = captureOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
      return;
    }

    const { orderId } = parseResult.data;

    const purchases = await db.select()
      .from(creditPurchases)
      .where(eq(creditPurchases.paypalOrderId, orderId))
      .limit(1);

    if (!purchases[0]) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }

    const purchase = purchases[0];
    if (purchase.userId !== req.userId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    // Idempotent path: if the webhook or reconciliation cron already credited
    // this purchase, return success with the current balance instead of 400.
    if (purchase.status === 'completed' && purchase.paypalCaptureId) {
      const currentUser = await db.select({ coinBalance: users.coinBalance })
        .from(users)
        .where(eq(users.id, req.userId!))
        .limit(1);
      res.json({ success: true, newBalance: currentUser[0]?.coinBalance ?? 0 });
      return;
    }

    if (purchase.status !== 'pending') {
      res.status(400).json({ error: 'Purchase already processed' });
      return;
    }

    const captureResult = await paypal.captureOrder(orderId);
    if (captureResult.status !== 'COMPLETED') {
      res.status(400).json({ error: `Payment not completed (status: ${captureResult.status})` });
      return;
    }

    // Atomic flip: only the winner (this capture-order or the PayPal webhook)
    // ends up calling the FB helper, so first-purchase fires exactly once.
    const flipped = await db.update(creditPurchases)
      .set({
        status: 'completed',
        paypalCaptureId: captureResult.captureId,
        updatedAt: new Date(),
      })
      .where(and(eq(creditPurchases.id, purchase.id), eq(creditPurchases.status, 'pending')))
      .returning({ id: creditPurchases.id });

    if (flipped.length === 0) {
      // Webhook beat us. Return current balance, skip coin grant + FB event.
      const currentUser = await db.select({ coinBalance: users.coinBalance })
        .from(users)
        .where(eq(users.id, req.userId!))
        .limit(1);
      res.json({ success: true, newBalance: currentUser[0]?.coinBalance ?? 0 });
      return;
    }

    const updatedUser = await db.update(users)
      .set({
        coinBalance: sql`coin_balance + ${purchase.coinsPurchased + (purchase.bonusCoins ?? 0)}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.userId!))
      .returning({ coinBalance: users.coinBalance });

    fireV2PurchaseEvent(purchase.id).catch(() => { /* logged inside */ });
    maybeSchedulePostPurchaseDrip(purchase.id).catch(() => { /* logged inside */ });

    posthog.capture({ distinctId: req.userId!, event: 'paypal_purchase_completed', properties: { purchase_id: purchase.id, package_type: purchase.packageType, coins: (purchase.coinsPurchased ?? 0) + (purchase.bonusCoins ?? 0), price_usd_cents: purchase.priceUsd, persona_id: purchase.personaId ?? null } });

    // Clean up any other pending purchases for this user (e.g. abandoned Stripe intents)
    await db.delete(creditPurchases)
      .where(and(
        eq(creditPurchases.userId, req.userId!),
        eq(creditPurchases.status, 'pending'),
        ne(creditPurchases.id, purchase.id),
      ))
      .catch(err => logger.error('Failed to clean up pending purchases:', err));

    const newBalance = updatedUser[0]?.coinBalance ?? 0;

    res.json({ success: true, newBalance });
  } catch (error) {
    logger.error('PayPal capture-order error:', error);
    res.status(500).json({ error: 'Failed to capture PayPal order' });
  }
});

// POST /api/credits/confirm-checkout - Confirm a Stripe Checkout Session and grant coins.
// Called by the frontend after a Stripe Checkout redirect (e.g. rescue hatch).
// This is the synchronous counterpart to the webhook — if the webhook already
// processed the purchase, this is a no-op that returns the current balance.
const confirmCheckoutSchema = z.object({
  sessionId: z.string().min(1),
});

router.post('/confirm-checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    const parseResult = confirmCheckoutSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors.map(e => e.message).join(', ') });
      return;
    }

    const { sessionId } = parseResult.data;

    if (!stripe) {
      res.status(400).json({ error: 'Stripe not configured' });
      return;
    }

    // Retrieve the Checkout Session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    if (checkoutSession.payment_status !== 'paid') {
      res.status(400).json({ error: `Payment not completed (status: ${checkoutSession.payment_status})` });
      return;
    }

    const purchaseId = checkoutSession.metadata?.purchaseId;
    const totalCoins = parseInt(checkoutSession.metadata?.totalCoins || '0', 10);

    if (!purchaseId || !totalCoins) {
      res.status(400).json({ error: 'Missing checkout metadata' });
      return;
    }

    // Idempotency: only grant coins if purchase is still pending.
    // If the webhook already processed it, this is a safe no-op.
    const updated = await db.update(creditPurchases)
      .set({
        status: 'completed',
        stripePaymentIntentId: checkoutSession.payment_intent as string,
        stripeAccount: activeStripeAccountTag(),
        updatedAt: new Date(),
      })
      .where(and(eq(creditPurchases.id, purchaseId), eq(creditPurchases.status, 'pending')))
      .returning({ id: creditPurchases.id });

    if (updated.length > 0) {
      // Purchase was still pending — grant coins now
      const userRow = await db.select({ emailVerified: users.emailVerified })
        .from(users)
        .where(eq(users.id, req.userId!))
        .limit(1);

      const needsImplicitVerify = userRow[0] && !userRow[0].emailVerified;

      await db.update(users)
        .set({
          coinBalance: sql`coin_balance + ${totalCoins}`,
          ...(needsImplicitVerify ? {
            emailVerified: true,
            verificationToken: null,
            verificationTokenExpiry: null,
          } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.userId!));

      if (needsImplicitVerify) {
        logger.info('Rescue hatch confirm-checkout: email auto-verified via payment', { userId: req.userId, purchaseId });
      }
      logger.info('Coins added via confirm-checkout', { totalCoins, userId: req.userId, purchaseId });

      fireV2PurchaseEvent(purchaseId).catch(() => { /* logged inside */ });
      maybeSchedulePostPurchaseDrip(purchaseId).catch(() => { /* logged inside */ });
      posthog.capture({ distinctId: req.userId!, event: 'confirm_checkout_completed', properties: { purchase_id: purchaseId, coins: totalCoins, package_type: checkoutSession.metadata?.packageType ?? null, price_usd_cents: checkoutSession.amount_total ?? 0 } });
    } else {
      logger.info('confirm-checkout: purchase already processed (webhook beat us)', { purchaseId });
    }

    // Always return current balance regardless of who granted the coins
    const currentUser = await db.select({ coinBalance: users.coinBalance })
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    res.json({ success: true, newBalance: currentUser[0]?.coinBalance ?? 0 });
  } catch (error) {
    logger.error('confirm-checkout error:', error);
    res.status(500).json({ error: 'Failed to confirm checkout' });
  }
});

// POST /api/credits/webhook - Stripe webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
  if (!stripe) {
    res.status(400).json({ error: 'Stripe not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'] as string;

  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody) {
    logger.error('Webhook: req.rawBody not available — check express.json verify middleware');
    res.status(400).json({ error: 'Missing raw body' });
    return;
  }

  // Verify against both accounts' credits-webhook secrets (A primary / B backup)
  // so B's events validate the instant we switch and A's in-flight events still
  // validate during handover.
  const verified = verifyStripeWebhook(rawBody, sig, 'credits');
  if (!verified.ok) {
    if (verified.reason === 'not_configured') {
      logger.error('Missing STRIPE_CREDITS_WEBHOOK_SECRET');
      res.status(500).json({ error: 'Webhook not configured' });
      return;
    }
    logger.error('Webhook signature verification failed');
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }
  const event = verified.event;

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.metadata?.app !== 'the-seer-within-chat') {
      res.json({ received: true });
      return;
    }

    const purchaseId = session.metadata?.purchaseId;
    const userId = session.metadata?.userId;
    const totalCoins = parseInt(session.metadata?.totalCoins || '0', 10);

    if (!purchaseId || !userId || !totalCoins) {
      logger.error('Missing webhook metadata:', session.metadata);
      res.status(400).json({ error: 'Missing metadata' });
      return;
    }

    try {
      // Idempotency: only grant coins if purchase is still pending.
      // Stripe may retry webhooks — this prevents double-granting.
      const updated = await db.update(creditPurchases)
        .set({
          status: 'completed',
          stripePaymentIntentId: session.payment_intent as string,
          // Tag with the account whose signing secret validated THIS event — during
          // a switch handover the live account's late events may still arrive.
          stripeAccount: verified.account,
          updatedAt: new Date(),
        })
        .where(and(eq(creditPurchases.id, purchaseId), eq(creditPurchases.status, 'pending')))
        .returning({ id: creditPurchases.id });

      if (updated.length === 0) {
        logger.warn('Webhook: purchase already processed, skipping coin grant', { purchaseId });
        res.json({ received: true });
        return;
      }

      // Rescue hatch: if user hasn't verified their email, a successful payment
      // implicitly verifies them. No bonus coins — the purchase itself is the 3 minutes.
      const userRow = await db.select({ emailVerified: users.emailVerified })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const needsImplicitVerify = userRow[0] && !userRow[0].emailVerified;

      await db.update(users)
        .set({
          coinBalance: sql`coin_balance + ${totalCoins}`,
          ...(needsImplicitVerify ? {
            emailVerified: true,
            verificationToken: null,
            verificationTokenExpiry: null,
          } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      if (needsImplicitVerify) {
        logger.info('Rescue hatch: email auto-verified via payment', { userId, purchaseId });
      }
      logger.info('Coins added', { totalCoins, userId, purchaseId });

      fireV2PurchaseEvent(purchaseId).catch(() => { /* logged inside */ });
      maybeSchedulePostPurchaseDrip(purchaseId).catch(() => { /* logged inside */ });

      posthog.capture({ distinctId: userId, event: 'stripe_webhook_purchase_completed', properties: { purchase_id: purchaseId, package_type: session.metadata?.packageType ?? null, coins: totalCoins, price_usd_cents: (session.amount_total ?? 0) } });
    } catch (dbError) {
      logger.error('Webhook DB error:', dbError);
      res.status(500).json({ error: 'Database error' });
      return;
    }
  }

  res.json({ received: true });
});

export default router;
