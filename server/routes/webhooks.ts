// Webhook handler for Resend email events, Stripe payment events, and unsubscribe actions.

import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import Stripe from 'stripe';
import { db } from '../lib/db';
import { followUpEmails, userFollowUpPreferences, migrationDripEmails, topupEmails } from '@shared/schema';
import { eq } from 'drizzle-orm';
import logger from '../lib/logger';

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
  if (!TRACKDESK_API_KEY) {
    logger.warn('Trackdesk: API key not configured, skipping conversion');
    return;
  }

  try {
    const body: Record<string, unknown> = {
      clickId: params.clickId,
      conversionType: params.conversionType,
      externalId: params.externalId,
      customerId: params.customerId,
      currencyCode: params.currency || 'USD',
    };
    if (params.amount !== undefined) {
      body.amount = { value: String(params.amount) };
    }

    const response = await fetch('https://api.trackdesk.com/v1/conversions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': TRACKDESK_API_KEY,
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
  }

  // Always return 200 to acknowledge receipt
  return res.json({ received: true });
});

export default router;
