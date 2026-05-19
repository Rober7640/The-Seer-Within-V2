// Webhook handler for Resend email events, Stripe payment events, and unsubscribe actions.

import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import Stripe from 'stripe';
import { db } from '../lib/db';
import { followUpEmails, userFollowUpPreferences, migrationDripEmails, topupEmails, aidenFollowupEmails, users, emailSuppression, creditPurchases } from '@shared/schema';
import { and, eq, sql } from 'drizzle-orm';
import logger from '../lib/logger';
import { posthog } from '../lib/posthog';
import * as paypal from '../lib/paypal';
import { fireV2PurchaseEvent } from '../lib/facebook';
import { maybeSchedulePostPurchaseDrip } from '../lib/postPurchaseDripTrigger';
import { addSoulmatePaidSubscriber } from '../lib/aweber';

const router = Router();

/**
 * POST /api/webhooks/resend
 * Handles Resend webhook events: delivered, opened, clicked, bounced, complained.
 * Verifies signature using Resend's svix-based signing when RESEND_WEBHOOK_SECRET is set.
 */
router.post('/resend', async (req: Request, res: Response) => {
  try {
    let event = req.body;

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const svixHeaders = {
        'svix-id': req.headers['svix-id'] as string,
        'svix-timestamp': req.headers['svix-timestamp'] as string,
        'svix-signature': req.headers['svix-signature'] as string,
      };

      if (!svixHeaders['svix-id'] || !svixHeaders['svix-timestamp'] || !svixHeaders['svix-signature']) {
        logger.warn('Resend webhook: Missing svix headers');
        return res.status(400).json({ error: 'Missing webhook signature headers' });
      }

      try {
        const wh = new Webhook(webhookSecret);
        const rawBody = (req as any).rawBody;
        const payload = rawBody ? rawBody.toString() : JSON.stringify(req.body);
        event = wh.verify(payload, svixHeaders) as any;
      } catch (err: any) {
        logger.error('Resend webhook signature verification failed:', err.message);
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    if (!event || !event.type) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    logger.info(`Resend webhook: ${event.type}`, event.data?.email_id || '');

    const emailId = event.data?.email_id;
    if (!emailId) {
      return res.status(200).json({ received: true });
    }

    // Find the email record by Resend email ID — check followUpEmails first, then migrationDripEmails
    const followUpRecords = await db
      .select()
      .from(followUpEmails)
      .where(eq(followUpEmails.resendEmailId, emailId))
      .limit(1);

    const record = followUpRecords[0];

    if (record) {
      // Handle follow-up email events
      switch (event.type) {
        case 'email.delivered':
          await db
            .update(followUpEmails)
            .set({ deliveryStatus: 'delivered', updatedAt: new Date() })
            .where(eq(followUpEmails.id, record.id));
          break;

        case 'email.opened':
          await db
            .update(followUpEmails)
            .set({ opened: true, openedAt: new Date(), updatedAt: new Date() })
            .where(eq(followUpEmails.id, record.id));
          break;

        case 'email.clicked':
          await db
            .update(followUpEmails)
            .set({ clicked: true, clickedAt: new Date(), updatedAt: new Date() })
            .where(eq(followUpEmails.id, record.id));
          break;

        case 'email.bounced':
          await db
            .update(followUpEmails)
            .set({ status: 'bounced', deliveryStatus: 'bounced', updatedAt: new Date() })
            .where(eq(followUpEmails.id, record.id));
          await autoUnsubscribe(record.userId, 'bounced');
          break;

        case 'email.complained':
          await db
            .update(followUpEmails)
            .set({ status: 'bounced', deliveryStatus: 'spam_complaint', updatedAt: new Date() })
            .where(eq(followUpEmails.id, record.id));
          await autoUnsubscribe(record.userId, 'spam_complaint');
          break;
      }

      return res.status(200).json({ received: true });
    }

    // Check migration drip emails
    const dripRecords = await db
      .select()
      .from(migrationDripEmails)
      .where(eq(migrationDripEmails.resendEmailId, emailId))
      .limit(1);

    const dripRecord = dripRecords[0];

    if (dripRecord) {
      switch (event.type) {
        case 'email.opened':
          if (!dripRecord.openedAt) {
            await db
              .update(migrationDripEmails)
              .set({ openedAt: new Date(), updatedAt: new Date() })
              .where(eq(migrationDripEmails.id, dripRecord.id));
          }
          break;

        case 'email.clicked':
          if (!dripRecord.clickedAt) {
            await db
              .update(migrationDripEmails)
              .set({ clickedAt: new Date(), updatedAt: new Date() })
              .where(eq(migrationDripEmails.id, dripRecord.id));
          }
          break;

        case 'email.bounced':
          await db
            .update(migrationDripEmails)
            .set({ status: 'failed', updatedAt: new Date() })
            .where(eq(migrationDripEmails.id, dripRecord.id));
          await autoUnsubscribe(dripRecord.userId, 'bounced');
          break;

        case 'email.complained':
          await db
            .update(migrationDripEmails)
            .set({ status: 'failed', updatedAt: new Date() })
            .where(eq(migrationDripEmails.id, dripRecord.id));
          await autoUnsubscribe(dripRecord.userId, 'spam_complaint');
          break;
      }

      return res.status(200).json({ received: true });
    }

    // Check top-up emails
    const topupRecords = await db
      .select()
      .from(topupEmails)
      .where(eq(topupEmails.resendEmailId, emailId))
      .limit(1);

    const topupRecord = topupRecords[0];

    if (topupRecord) {
      switch (event.type) {
        case 'email.delivered':
          await db
            .update(topupEmails)
            .set({ status: 'sent', updatedAt: new Date() })
            .where(eq(topupEmails.id, topupRecord.id));
          break;

        case 'email.opened':
          if (!topupRecord.openedAt) {
            await db
              .update(topupEmails)
              .set({ openedAt: new Date(), updatedAt: new Date() })
              .where(eq(topupEmails.id, topupRecord.id));
          }
          break;

        case 'email.clicked':
          if (!topupRecord.clickedAt) {
            await db
              .update(topupEmails)
              .set({ clickedAt: new Date(), updatedAt: new Date() })
              .where(eq(topupEmails.id, topupRecord.id));
          }
          break;

        case 'email.bounced':
          await db
            .update(topupEmails)
            .set({ status: 'failed', updatedAt: new Date() })
            .where(eq(topupEmails.id, topupRecord.id));
          await autoUnsubscribe(topupRecord.userId, 'bounced');
          break;

        case 'email.complained':
          await db
            .update(topupEmails)
            .set({ status: 'failed', updatedAt: new Date() })
            .where(eq(topupEmails.id, topupRecord.id));
          await autoUnsubscribe(topupRecord.userId, 'spam_complaint');
          break;
      }

      return res.status(200).json({ received: true });
    }

    // Check Aiden follow-up emails
    const aidenRecords = await db
      .select()
      .from(aidenFollowupEmails)
      .where(eq(aidenFollowupEmails.resendEmailId, emailId))
      .limit(1);

    const aidenRecord = aidenRecords[0];

    if (aidenRecord) {
      switch (event.type) {
        case 'email.opened':
          if (!aidenRecord.openedAt) {
            await db
              .update(aidenFollowupEmails)
              .set({ openedAt: new Date(), updatedAt: new Date() })
              .where(eq(aidenFollowupEmails.id, aidenRecord.id));
          }
          break;

        case 'email.clicked':
          if (!aidenRecord.clickedAt) {
            await db
              .update(aidenFollowupEmails)
              .set({ clickedAt: new Date(), updatedAt: new Date() })
              .where(eq(aidenFollowupEmails.id, aidenRecord.id));
          }
          break;

        case 'email.bounced':
          await db
            .update(aidenFollowupEmails)
            .set({ status: 'failed', errorMessage: 'bounced', updatedAt: new Date() })
            .where(eq(aidenFollowupEmails.id, aidenRecord.id));
          await autoUnsubscribe(aidenRecord.userId, 'bounced');
          break;

        case 'email.complained':
          await db
            .update(aidenFollowupEmails)
            .set({ status: 'failed', errorMessage: 'spam_complaint', updatedAt: new Date() })
            .where(eq(aidenFollowupEmails.id, aidenRecord.id));
          await autoUnsubscribe(aidenRecord.userId, 'spam_complaint');
          break;
      }

      return res.status(200).json({ received: true });
    }

    logger.info(`Resend webhook: No matching email record for ${emailId}`);
    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Resend webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * GET /api/webhooks/unsubscribe
 * One-click unsubscribe via token in email footer.
 */
router.get('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).send(unsubscribePageHtml('Missing unsubscribe token.', false));
    }

    // Find the email by unsubscribe token — check all 3 email tables
    let userId: string | null = null;

    const followUpRecord = await db
      .select({ userId: followUpEmails.userId })
      .from(followUpEmails)
      .where(eq(followUpEmails.unsubscribeToken, token))
      .limit(1);

    if (followUpRecord[0]) {
      userId = followUpRecord[0].userId;
    }

    if (!userId) {
      const topupRecord = await db
        .select({ userId: topupEmails.userId })
        .from(topupEmails)
        .where(eq(topupEmails.unsubscribeToken, token))
        .limit(1);

      if (topupRecord[0]) {
        userId = topupRecord[0].userId;
      }
    }

    if (!userId) {
      const dripRecord = await db
        .select({ userId: migrationDripEmails.userId })
        .from(migrationDripEmails)
        .where(eq(migrationDripEmails.unsubscribeToken, token))
        .limit(1);

      if (dripRecord[0]) {
        userId = dripRecord[0].userId;
      }
    }

    if (!userId) {
      const aidenRecord = await db
        .select({ userId: aidenFollowupEmails.userId })
        .from(aidenFollowupEmails)
        .where(eq(aidenFollowupEmails.unsubscribeToken, token))
        .limit(1);

      if (aidenRecord[0]) {
        userId = aidenRecord[0].userId;
      }
    }

    if (!userId) {
      return res.status(404).send(unsubscribePageHtml('Invalid or expired unsubscribe link.', false));
    }

    // Unsubscribe the user
    await autoUnsubscribe(userId, 'user_unsubscribed');

    return res.status(200).send(unsubscribePageHtml(
      'You have been unsubscribed from follow-up emails. You will no longer receive these messages.',
      true,
    ));
  } catch (error) {
    logger.error('Unsubscribe error:', error);
    return res.status(500).send(unsubscribePageHtml('Something went wrong. Please try again later.', false));
  }
});

/**
 * POST /api/webhooks/unsubscribe
 * Also handle POST for List-Unsubscribe header compliance.
 */
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const token = (req.query.token || req.body?.token) as string;

    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }

    // Find the email by unsubscribe token — check all 3 email tables
    let userId: string | null = null;

    const followUpRecord = await db
      .select({ userId: followUpEmails.userId })
      .from(followUpEmails)
      .where(eq(followUpEmails.unsubscribeToken, token))
      .limit(1);

    if (followUpRecord[0]) {
      userId = followUpRecord[0].userId;
    }

    if (!userId) {
      const topupRecord = await db
        .select({ userId: topupEmails.userId })
        .from(topupEmails)
        .where(eq(topupEmails.unsubscribeToken, token))
        .limit(1);

      if (topupRecord[0]) {
        userId = topupRecord[0].userId;
      }
    }

    if (!userId) {
      const dripRecord = await db
        .select({ userId: migrationDripEmails.userId })
        .from(migrationDripEmails)
        .where(eq(migrationDripEmails.unsubscribeToken, token))
        .limit(1);

      if (dripRecord[0]) {
        userId = dripRecord[0].userId;
      }
    }

    if (!userId) {
      const aidenRecord = await db
        .select({ userId: aidenFollowupEmails.userId })
        .from(aidenFollowupEmails)
        .where(eq(aidenFollowupEmails.unsubscribeToken, token))
        .limit(1);

      if (aidenRecord[0]) {
        userId = aidenRecord[0].userId;
      }
    }

    if (!userId) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    await autoUnsubscribe(userId, 'user_unsubscribed');

    return res.status(200).json({ success: true, message: 'Unsubscribed successfully' });
  } catch (error) {
    logger.error('Unsubscribe POST error:', error);
    return res.status(500).json({ error: 'Unsubscribe failed' });
  }
});

/**
 * Auto-unsubscribe a user from follow-up emails.
 *
 * Primary effect: updates userFollowUpPreferences so every ongoing drip
 * (Aiden verified + unverified, persona follow-ups, top-ups, migration)
 * cascade-skips this user at the next cron tick.
 *
 * Secondary effect: also records the email in the central email_suppression
 * table so the same address appears in CAN-SPAM exports to partners.
 * Wrapped in its own try/catch — a suppression-table write failure must
 * never roll back the preferences update (which is the primary compliance
 * requirement here).
 */
async function autoUnsubscribe(userId: string, reason: string): Promise<void> {
  const existing = await db
    .select()
    .from(userFollowUpPreferences)
    .where(eq(userFollowUpPreferences.userId, userId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(userFollowUpPreferences)
      .set({
        enableFollowUps: false,
        unsubscribedAt: new Date(),
        unsubscribeReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(userFollowUpPreferences.userId, userId));
  } else {
    await db.insert(userFollowUpPreferences).values({
      userId,
      enableFollowUps: false,
      unsubscribedAt: new Date(),
      unsubscribeReason: reason,
    });
  }

  logger.info(`User ${userId} unsubscribed from follow-ups (reason: ${reason})`);
  posthog.capture({ distinctId: userId, event: 'user_unsubscribed', properties: { reason } });

  // Mirror the unsubscribe into the central suppression list. Isolated so a
  // failure here (e.g. migration not yet applied on a new environment)
  // cannot break the follow-up preferences update above.
  try {
    const userRow = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const email = userRow[0]?.email?.toLowerCase().trim();
    if (email) {
      await db
        .insert(emailSuppression)
        .values({
          email,
          reason,
          source: 'theseerwithin',
          userId,
        })
        .onConflictDoNothing();
    }
  } catch (suppressionError) {
    logger.warn('[suppression] Central list write failed (userFollowUpPreferences still updated)', {
      userId,
      reason,
      error: (suppressionError as Error).message,
    });
  }
}

/**
 * Simple HTML page for unsubscribe confirmation.
 */
function unsubscribePageHtml(message: string, success: boolean): string {
  const statusColor = success ? '#4ade80' : '#f87171';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe</title>
  <style>
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background-color: #0f0a1a;
      color: #e8e0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background-color: #1a1128;
      border-radius: 12px;
      padding: 40px;
      max-width: 480px;
      text-align: center;
    }
    .status {
      font-size: 18px;
      color: ${statusColor};
      margin-bottom: 16px;
    }
    .message {
      font-size: 16px;
      line-height: 1.6;
      color: #c0b0d8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="status">${success ? 'Unsubscribed' : 'Error'}</div>
    <div class="message">${escapeHtml(message)}</div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================
// STRIPE WEBHOOK — server-side conversion tracking
// ============================================

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripeClient =
  stripeKey && stripeKey !== 'sk_test_placeholder'
    ? new Stripe(stripeKey)
    : null;

const TRACKDESK_API_KEY = process.env.TRACKDESK_API_KEY;
const TRACKDESK_CONVERSION_URL = 'https://the-seer-within.trackdesk.com/tracking/conversion/v1';

/**
 * Report a conversion to Trackdesk server-side.
 * Fails silently — affiliate tracking should never block purchases.
 */
export async function reportTrackdeskConversion(params: {
  clickId: string;
  conversionType: 'sale' | 'lead';
  externalId: string;
  customerId: string;
  amount?: number;
  currency?: string;
}) {
  // TRACKDESK_API_KEY acts as the feature flag for enabling tracking.
  // The tenant-scoped conversion endpoint below does not require the key in headers.
  if (!TRACKDESK_API_KEY) {
    logger.warn('Trackdesk: API key not configured, skipping conversion');
    return;
  }

  try {
    const body: Record<string, unknown> = {
      cid: params.clickId,
      conversionTypeCode: params.conversionType,
      externalId: params.externalId,
      customerId: params.customerId,
      status: 'CONVERSION_STATUS_APPROVED',
    };
    if (params.amount !== undefined) {
      body.amount = { value: String(params.amount) };
      body.currency = { code: params.currency || 'USD' };
    }

    const response = await fetch(TRACKDESK_CONVERSION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error(`Trackdesk ${params.conversionType} conversion failed (${response.status}) body=${text} payload=${JSON.stringify(body)}`);
    } else {
      const amountLabel = params.amount !== undefined ? ` — $${params.amount}` : '';
      logger.info(`Trackdesk ${params.conversionType} reported: ${params.externalId}${amountLabel}`);
    }
  } catch (err) {
    logger.error('Trackdesk conversion error:', err);
  }
}

/**
 * POST /api/webhooks/stripe
 * Handles Stripe checkout.session.completed events.
 * - Reports affiliate conversions to Trackdesk (server-side, reliable)
 */
router.post('/stripe', async (req: Request, res: Response) => {
  if (!stripeClient) {
    logger.warn('Stripe webhook: Stripe not configured');
    return res.status(400).json({ error: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_TRACKDESK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('Stripe webhook: STRIPE_TRACKDESK_WEBHOOK_SECRET not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event: Stripe.Event;

  try {
    const rawBody = (req as any).rawBody;
    event = stripeClient.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    logger.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const trackdeskClickId = metadata.trackdeskClickId;
    const product = metadata.product;
    const email = metadata.email || metadata.firstName || session.customer_email || '';

    logger.info(`Stripe webhook: checkout.session.completed — product=${product}, session=${session.id}`);

    // Only report to Trackdesk if an affiliate click ID is present
    if (trackdeskClickId) {
      const amountTotal = (session.amount_total || 0) / 100; // cents to dollars

      // Determine externalId based on product type
      const externalId = product === 'protection_ritual'
        ? `${metadata.originalSession || session.id}_upsell1`
        : session.id;

      reportTrackdeskConversion({
        clickId: trackdeskClickId,
        conversionType: 'sale',
        amount: amountTotal,
        externalId,
        customerId: email,
      });
    } else {
      logger.info('Stripe webhook: No trackdeskClickId in metadata, skipping affiliate tracking');
    }

    // PostHog: track funnel purchases (Phase 1 soulmate + Phase 2 V1/fb).
    // Soulmate products fix funnel='soulmate'. V1 products derive funnel from
    // metadata.funnel ('v1-fb' → 'fb', missing → 'v1').
    type TrackedProduct = { funnel: 'soulmate' | null; step: string; product: string };
    const TRACKED_PRODUCTS: Record<string, TrackedProduct> = {
      soulmate_sketch:        { funnel: 'soulmate', step: 'sales',   product: 'soulmate_sketch' },
      soulmate_bracelet:      { funnel: 'soulmate', step: 'upsell1', product: 'soulmate_bracelet' },
      soulmate_love_tuner:    { funnel: 'soulmate', step: 'upsell2', product: 'soulmate_love_tuner' },
      energy_clearing_ritual: { funnel: null,       step: 'sales',   product: 'energy_clearing_ritual' },
      protection_ritual:      { funnel: null,       step: 'upsell1', product: 'protection_ritual' },
      manifestation_bracelet: { funnel: null,       step: 'upsell2', product: 'manifestation_bracelet' },
    };
    const productInfo = product ? TRACKED_PRODUCTS[product] : undefined;
    if (productInfo) {
      const funnelValue = productInfo.funnel ?? (metadata.funnel === 'v1-fb' ? 'fb' : 'v1');
      const posthogDistinctId = metadata.posthogDistinctId || email;
      posthog.capture({
        distinctId: posthogDistinctId,
        event: 'purchase_completed',
        properties: {
          funnel: funnelValue,
          step: productInfo.step,
          product: productInfo.product,
          payment_method: 'stripe_checkout',
          amount_cents: session.amount_total ?? 0,
          stripe_session_id: session.id,
          email,
        },
      });
    }

    // AWeber: add soulmate sketch buyers to the Sketch Buyers list.
    // Fire-and-forget. Bracelet + Love Tuner are handled inline in routes.ts
    // after their 1-click charges (not webhook-driven), so this block only
    // covers the sketch path. No shipping for the sketch (digital deliverable).
    if (product === 'soulmate_sketch' && email) {
      addSoulmatePaidSubscriber({
        email,
        firstName: metadata.firstName || '',
        stripeOrderId: session.id,
        purchaseAmountCents: session.amount_total ?? 0,
      }).catch((err) => logger.error('AWeber Soulmate Paid error (non-blocking):', err));
    }
  }

  // Always return 200 to acknowledge receipt
  return res.json({ received: true });
});

/**
 * POST /api/webhooks/paypal
 * Handles PayPal PAYMENT.CAPTURE.COMPLETED events. Defense-in-depth alongside
 * the browser-driven /api/credits/capture-order and the 15-min reconciliation
 * cron. Race-safe via `WHERE status='pending'` guard.
 */
router.post('/paypal', async (req: Request, res: Response) => {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    logger.error('PayPal webhook: PAYPAL_WEBHOOK_ID not set');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody) {
    logger.error('PayPal webhook: req.rawBody not available');
    return res.status(400).json({ error: 'Missing raw body' });
  }

  let verified = false;
  try {
    verified = await paypal.verifyWebhookSignature(
      req.headers,
      rawBody.toString('utf8'),
      webhookId,
    );
  } catch (err: any) {
    logger.error('PayPal webhook: signature verification threw', err?.message ?? err);
    return res.status(400).json({ error: 'Signature verification failed' });
  }

  if (!verified) {
    logger.warn('PayPal webhook: invalid signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  const eventType = event?.event_type;
  if (eventType !== 'PAYMENT.CAPTURE.COMPLETED') {
    logger.info(`PayPal webhook: ignoring event type ${eventType}`);
    return res.json({ received: true });
  }

  const orderId: string | undefined =
    event?.resource?.supplementary_data?.related_ids?.order_id;
  const captureId: string | undefined = event?.resource?.id;

  if (!orderId || !captureId) {
    logger.warn('PayPal webhook: missing orderId or captureId in event', {
      eventId: event?.id,
      orderId,
      captureId,
    });
    return res.json({ received: true });
  }

  try {
    const result = await db.transaction(async (tx) => {
      const updated = await tx
        .update(creditPurchases)
        .set({
          status: 'completed',
          paypalCaptureId: captureId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(creditPurchases.paypalOrderId, orderId),
            eq(creditPurchases.status, 'pending'),
          ),
        )
        .returning({
          id: creditPurchases.id,
          userId: creditPurchases.userId,
          coinsPurchased: creditPurchases.coinsPurchased,
          bonusCoins: creditPurchases.bonusCoins,
        });

      if (updated.length === 0) return null;

      const row = updated[0];
      const totalCoins = (row.coinsPurchased ?? 0) + (row.bonusCoins ?? 0);
      await tx
        .update(users)
        .set({
          coinBalance: sql`coin_balance + ${totalCoins}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, row.userId));

      return { purchaseId: row.id, userId: row.userId, totalCoins };
    });

    if (result) {
      logger.info('PayPal webhook credited', { orderId, captureId, ...result });

      fireV2PurchaseEvent(result.purchaseId).catch(() => { /* logged inside */ });
      maybeSchedulePostPurchaseDrip(result.purchaseId).catch(() => { /* logged inside */ });
      posthog.capture({ distinctId: result.userId, event: 'paypal_webhook_purchase_completed', properties: { purchase_id: result.purchaseId, coins: result.totalCoins, order_id: orderId } });
    } else {
      logger.info('PayPal webhook: order already processed or unknown', {
        orderId,
        captureId,
      });
    }
    return res.json({ received: true });
  } catch (err) {
    logger.error('PayPal webhook DB error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

export default router;
