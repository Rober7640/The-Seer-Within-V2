// Webhook handler for Resend email events, Stripe payment events, and unsubscribe actions.

import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import Stripe from 'stripe';
import { getStripe, verifyStripeWebhook } from '../lib/stripeAccount';
import { db, markMainPaid } from '../lib/db';
import { followUpEmails, userFollowUpPreferences, migrationDripEmails, topupEmails, aidenFollowupEmails, personaFollowupEmails, evelynFollowupEmails, users, emailSuppression, creditPurchases, soulmateLanderSessions } from '@shared/schema';
import { and, eq, sql } from 'drizzle-orm';
import logger from '../lib/logger';
import { posthog } from '../lib/posthog';
import * as paypal from '../lib/paypal';
import { fireV2PurchaseEvent, fireStripePurchaseEvent } from '../lib/facebook';
import { buildPurchaseEvent } from '../lib/purchaseAnalytics';
import { recordBraceletOrder } from '../lib/braceletOrders';
import { migrateAndEmailFunnelUser } from '../lib/funnelMigrationEmail';
import { fireGoogleAdsConversion, gadsStepForProduct } from '../lib/googleAds';
import { maybeSchedulePostPurchaseDrip } from '../lib/postPurchaseDripTrigger';
import {
  addSoulmatePaidSubscriber,
  addSoulmateUpsell1Subscriber,
  addSoulmateUpsell2Subscriber,
  addBumpPaidSubscriber,
} from '../lib/aweber';
import { funnelDefForParam } from '@shared/funnelConfig';
import { recordSoulmatePurchase, getSoulmateOrderByEmail } from '../lib/soulmateOrders';

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

    // Check generalized persona drip emails (Marcus/Luna/Nova/Maren).
    const personaRecords = await db
      .select()
      .from(personaFollowupEmails)
      .where(eq(personaFollowupEmails.resendEmailId, emailId))
      .limit(1);

    const personaRecord = personaRecords[0];

    if (personaRecord) {
      switch (event.type) {
        case 'email.opened':
          if (!personaRecord.openedAt) {
            await db
              .update(personaFollowupEmails)
              .set({ openedAt: new Date(), updatedAt: new Date() })
              .where(eq(personaFollowupEmails.id, personaRecord.id));
          }
          break;

        case 'email.clicked':
          if (!personaRecord.clickedAt) {
            await db
              .update(personaFollowupEmails)
              .set({ clickedAt: new Date(), updatedAt: new Date() })
              .where(eq(personaFollowupEmails.id, personaRecord.id));
          }
          break;

        case 'email.bounced':
          await db
            .update(personaFollowupEmails)
            .set({ status: 'failed', errorMessage: 'bounced', updatedAt: new Date() })
            .where(eq(personaFollowupEmails.id, personaRecord.id));
          await autoUnsubscribe(personaRecord.userId, 'bounced');
          break;

        case 'email.complained':
          await db
            .update(personaFollowupEmails)
            .set({ status: 'failed', errorMessage: 'spam_complaint', updatedAt: new Date() })
            .where(eq(personaFollowupEmails.id, personaRecord.id));
          await autoUnsubscribe(personaRecord.userId, 'spam_complaint');
          break;
      }

      return res.status(200).json({ received: true });
    }

    // Check Evelyn lander follow-up / unverified-drip emails (Evelyn's #1 drip).
    // Mirrors the persona/aiden handlers: record opens/clicks idempotently, and
    // treat bounce/complaint as a hard failure + auto-unsubscribe. Without this,
    // evelynFollowupEmails recorded 0 opens/clicks.
    const evelynRecords = await db
      .select()
      .from(evelynFollowupEmails)
      .where(eq(evelynFollowupEmails.resendEmailId, emailId))
      .limit(1);

    const evelynRecord = evelynRecords[0];

    if (evelynRecord) {
      switch (event.type) {
        case 'email.opened':
          if (!evelynRecord.openedAt) {
            await db
              .update(evelynFollowupEmails)
              .set({ openedAt: new Date(), updatedAt: new Date() })
              .where(eq(evelynFollowupEmails.id, evelynRecord.id));
          }
          break;

        case 'email.clicked':
          if (!evelynRecord.clickedAt) {
            await db
              .update(evelynFollowupEmails)
              .set({ clickedAt: new Date(), updatedAt: new Date() })
              .where(eq(evelynFollowupEmails.id, evelynRecord.id));
          }
          break;

        case 'email.bounced':
          await db
            .update(evelynFollowupEmails)
            .set({ status: 'failed', errorMessage: 'bounced', updatedAt: new Date() })
            .where(eq(evelynFollowupEmails.id, evelynRecord.id));
          await autoUnsubscribe(evelynRecord.userId, 'bounced');
          break;

        case 'email.complained':
          await db
            .update(evelynFollowupEmails)
            .set({ status: 'failed', errorMessage: 'spam_complaint', updatedAt: new Date() })
            .where(eq(evelynFollowupEmails.id, evelynRecord.id));
          await autoUnsubscribe(evelynRecord.userId, 'spam_complaint');
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
      const personaRecord = await db
        .select({ userId: personaFollowupEmails.userId })
        .from(personaFollowupEmails)
        .where(eq(personaFollowupEmails.unsubscribeToken, token))
        .limit(1);
      if (personaRecord[0]) {
        userId = personaRecord[0].userId;
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
      const personaRecord = await db
        .select({ userId: personaFollowupEmails.userId })
        .from(personaFollowupEmails)
        .where(eq(personaFollowupEmails.unsubscribeToken, token))
        .limit(1);
      if (personaRecord[0]) {
        userId = personaRecord[0].userId;
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

  // Revoke any active soulmate intake tokens. Honors the unsub at the link
  // layer so a leaked CTA URL can't still resolve for somebody who opted out.
  // Isolated so a failure here can't break the unsubscribe itself.
  try {
    await db
      .update(soulmateLanderSessions)
      .set({ intakeTokenRevokedAt: new Date() })
      .where(and(
        eq(soulmateLanderSessions.resolvedUserId, userId),
        sql`${soulmateLanderSessions.intakeToken} IS NOT NULL`,
        sql`${soulmateLanderSessions.intakeTokenRevokedAt} IS NULL`,
      ));
  } catch (revokeError) {
    logger.warn('[suppression] Soulmate intake_token revoke on unsub failed', {
      userId,
      reason,
      error: (revokeError as Error).message,
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

// Active-account Stripe client (A primary / B backup) via the central helper.
const stripeClient = getStripe();

// Durable server-side Google Ads conversion for a paid Stripe product. The
// gclid lives on the main Checkout Session metadata; upsell PIs reference it
// via originalSession, so backfill from there when the upsell's own metadata
// doesn't carry it. orderId = mainSessionId matches the client transaction_id
// for Count="Every" dedup. Fire-and-forget; never blocks the webhook ack.
async function fireGAdsForStripe(opts: {
  product: string;
  mainSessionId: string;
  amountCents: number;
  gclidFromMeta?: string;
  email?: string;
}): Promise<void> {
  const step = gadsStepForProduct(opts.product);
  if (!step) return;

  let gclid = opts.gclidFromMeta;
  if (!gclid && stripeClient && opts.mainSessionId) {
    try {
      const original = await stripeClient.checkout.sessions.retrieve(opts.mainSessionId);
      gclid = original.metadata?.gclid || undefined;
    } catch (err) {
      logger.warn('fireGAdsForStripe: original session gclid backfill failed', {
        mainSessionId: opts.mainSessionId,
        err: String(err),
      });
    }
  }

  await fireGoogleAdsConversion({
    step,
    gclid,
    valueCents: opts.amountCents,
    orderId: opts.mainSessionId,
    email: opts.email,
  });
}

const TRACKDESK_API_KEY = process.env.TRACKDESK_API_KEY;
const TRACKDESK_CONVERSION_URL = 'https://the-seer-within.trackdesk.com/tracking/conversion/v1';

/**
 * Report a conversion to Trackdesk server-side.
 * Fails silently — affiliate tracking should never block purchases.
 */
export async function reportTrackdeskConversion(params: {
  clickId: string;
  conversionType: 'sale' | 'lead' | 'upsell1' | 'upsell2';
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

  // Verify against both accounts' trackdesk-webhook secrets (A primary / B backup)
  // so B's events validate the instant we switch and A's in-flight events still
  // validate during handover.
  const rawBody = (req as any).rawBody;
  const verified = verifyStripeWebhook(rawBody, sig, 'trackdesk');
  if (!verified.ok) {
    if (verified.reason === 'not_configured') {
      logger.error('Stripe webhook: STRIPE_TRACKDESK_WEBHOOK_SECRET not set');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }
    logger.error('Stripe webhook signature verification failed');
    return res.status(400).json({ error: 'Invalid signature' });
  }
  const event = verified.event;

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

      // Map the Stripe product to its Trackdesk conversion type + externalId.
      // Upsells report under their own types (upsell1/upsell2) so they no longer
      // share the main-purchase "sale" bucket; the main purchase stays "sale".
      // externalId is suffixed per-upsell and keyed to the original session so
      // it dedups against the client-side / 1-click-charge fire for the same order.
      const base = metadata.originalSession || session.id;
      let conversionType: 'sale' | 'upsell1' | 'upsell2' = 'sale';
      let externalId = session.id;
      if (product === 'protection_ritual') {
        conversionType = 'upsell1';
        externalId = `${base}_upsell1`;
      } else if (product === 'manifestation_bracelet') {
        conversionType = 'upsell2';
        externalId = `${base}_upsell2`;
      }

      reportTrackdeskConversion({
        clickId: trackdeskClickId,
        conversionType,
        amount: amountTotal,
        externalId,
        customerId: email,
      });
    } else {
      logger.info('Stripe webhook: No trackdeskClickId in metadata, skipping affiliate tracking');
    }

    // PostHog: track funnel purchases (Phase 1 soulmate + Phase 2 V1/fb/fb2/gdn).
    // Shape lives in lib/purchaseAnalytics so it can be unit tested — this one event
    // serves six products across three funnel families, and now also carries
    // price_variant + purchase_type so the sliding close's $35 grace is
    // distinguishable from a $35 control main (both are amount_cents 3500).
    const purchaseEvent = buildPurchaseEvent({
      product,
      metadata,
      amountCents: session.amount_total ?? 0,
      stripeSessionId: session.id,
      email,
    });
    if (purchaseEvent) {
      posthog.capture(purchaseEvent);
    }

    // AWeber + DB writes for soulmate bracelet/tuner FALLBACK Checkout
    // sessions. 1-click happy path writes these inline from routes.ts (off-
    // session PIs do NOT fire checkout.session.completed). This block ONLY
    // fires when the user fell back to hosted Stripe Checkout after a 1-click
    // decline. Shipping is rehydrated from soulmate_orders (already persisted
    // by /api/soulmate/upsell{,2}/charge before the failing PI attempt).
    if ((product === 'soulmate_bracelet' || product === 'soulmate_love_tuner') && email) {
      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;
      const amountCents = session.amount_total ?? 0;

      if (paymentIntentId) {
        recordSoulmatePurchase({
          email,
          product: product === 'soulmate_bracelet' ? 'bracelet' : 'tuner',
          paymentIntentId,
          amountCents,
        }).catch((err) => logger.error('recordSoulmatePurchase upsell-fallback error (non-blocking):', err));
      }

      getSoulmateOrderByEmail(email)
        .then((order) => {
          if (!order || !order.shippingLine1) {
            logger.warn(`Soulmate upsell-fallback AWeber skipped: no shipping in DB for ${email}`);
            return;
          }
          const shipping = {
            name: order.shippingName || metadata.firstName || '',
            line1: order.shippingLine1,
            line2: order.shippingLine2 || undefined,
            city: order.shippingCity || '',
            state: order.shippingState || '',
            postal: order.shippingPostal || '',
            country: order.shippingCountry || 'US',
            phone: order.shippingPhone || undefined,
          };
          const subscriberParams = {
            email,
            firstName: metadata.firstName || order.shippingName || '',
            stripeOrderId: paymentIntentId || session.id,
            purchaseAmountCents: amountCents,
            shipping,
          };
          const fn = product === 'soulmate_bracelet'
            ? addSoulmateUpsell1Subscriber
            : addSoulmateUpsell2Subscriber;
          return fn(subscriberParams);
        })
        .catch((err) => logger.error('AWeber soulmate upsell-fallback error (non-blocking):', err));
    }

    // AWeber: add soulmate sketch buyers to the Sketch Buyers list.
    // Fire-and-forget. Bracelet + Love Tuner happy-path 1-click charges write
    // inline in routes.ts; the block ABOVE this one handles the fallback path
    // when 1-click declines push the user into hosted Stripe Checkout.
    // No shipping for the sketch (digital deliverable). Use the PaymentIntent
    // id (pi_*) for parity with bracelet/tuner writes.
    if (product === 'soulmate_sketch' && email) {
      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;
      addSoulmatePaidSubscriber({
        email,
        firstName: metadata.firstName || '',
        stripeOrderId: paymentIntentId || session.id,
        purchaseAmountCents: session.amount_total ?? 0,
      }).catch((err) => logger.error('AWeber Soulmate Paid error (non-blocking):', err));

      // Persist sketch purchase to soulmate_orders. Bracelet/tuner are written
      // inline from their 1-click handlers (routes.ts); the sketch path only
      // fires here, so without this call sketch_pi_id / sketch_cents / sketch_at
      // never populate even on a successful purchase.
      if (paymentIntentId) {
        recordSoulmatePurchase({
          email,
          product: 'sketch',
          paymentIntentId,
          amountCents: session.amount_total ?? 0,
        }).catch((err) => logger.error('recordSoulmatePurchase sketch error (non-blocking):', err));
      }

      // Revoke any active intake tokens for this buyer. After purchase, the
      // lead-nurture CTA links (?t=<token>) should stop resolving — they're
      // for pre-purchase resumption only. Match by email so we hit all
      // soulmate_lander_sessions rows for the buyer regardless of whether the
      // V2 user row is linked. Fire-and-forget — never block the webhook ack.
      db.update(soulmateLanderSessions)
        .set({ intakeTokenRevokedAt: new Date() })
        .where(and(
          eq(soulmateLanderSessions.email, email.toLowerCase()),
          sql`${soulmateLanderSessions.intakeToken} IS NOT NULL`,
          sql`${soulmateLanderSessions.intakeTokenRevokedAt} IS NULL`,
        ))
        .catch((err) => logger.error('Soulmate intake_token revoke on purchase error (non-blocking):', err));
    }

    // Facebook-compliance storefront (/products/:slug). Physical goods, so somebody has
    // to be able to see what to ship and to whom. Recorded HERE and not on the thank-you
    // page because a buyer can pay and close the tab before the redirect lands — which is
    // exactly the pay-and-close-tab hole the funnel already has with addPaidSubscriber.
    //
    // Strictly name-gated on `bracelet_*`, so it can never fire for a funnel product.
    // Idempotent (stripe_session_id is UNIQUE, the write is an upsert), because Stripe
    // retries this event and the thank-you page reads the same session.
    if (product?.startsWith('bracelet_')) {
      await recordBraceletOrder(session).catch((err) =>
        logger.error('recordBraceletOrder failed (non-blocking):', err),
      );
    }

    // Reliable, browser-independent "front-end payment completed" signal for the
    // /admin/price-test dashboard. checkout.session.completed fires server-side on
    // every paid front-end sale, so stamping here catches buyers who paid but
    // never loaded /welcome1 — the ~30% the legacy `upsell_offered` signal misses.
    // Gated STRICTLY to the front-end product so it can never fire for an upsell
    // (protection_ritual / manifestation_bracelet) or any other funnel product.
    // Non-blocking + idempotent (no-op if the row isn't matched or already stamped);
    // matches on session.id, which /api/checkout saved on the row before payment.
    if (product === 'energy_clearing_ritual') {
      markMainPaid(session.id).catch((err) =>
        logger.error('markMainPaid failed (non-blocking):', err),
      );
    }

    // ── ORDER-BUMP paid list (theseerwithin_money_ob_paid, 6969209) ──────────
    //
    // WHY HERE AND NOT ON THE THANK-YOU PAGE: the normal paid list is written from
    // /api/upsell/user-data, which only runs if the buyer's browser reaches
    // /welcome1 — so a buyer who pays and closes the tab is never added. That hole
    // is real and documented (braceletOrders.ts). We are not repeating it for the
    // bump: checkout.session.completed fires server-side on every paid order and
    // Stripe retries it, so this is the authoritative signal.
    //
    // Gated on `bumpProduct` EXISTING in the session metadata — the key is absent
    // on every non-bump order (see /api/checkout), so this can never fire for a
    // plain main purchase, an upsell, or another funnel's product. Also requires
    // the front-end product, so it stays scoped to the V1 funnels.
    //
    // Idempotent: Stripe retries this event, and addBumpPaidSubscriber upserts
    // (update_existing) and treats "already subscribed" as success. Non-blocking —
    // an AWeber outage must never fail the webhook ack and trigger more retries.
    if (product === 'energy_clearing_ritual' && metadata.bumpProduct) {
      // Resolve the buyer's address properly rather than reusing the `email`
      // binding above, which falls back to metadata.firstName and can therefore
      // hold a NAME. Same precedence the no-optin branch below uses.
      const bumpEmail =
        session.customer_details?.email || session.customer_email || metadata.email;
      if (bumpEmail) {
        // Funnel-suffixed marker ("-palm" / "-tarot") so this list can be counted
        // per funnel, matching how the main paid list is tagged. Unknown/base
        // funnel ⇒ no suffix, exactly as elsewhere.
        const bumpFunnelSuffix = funnelDefForParam(metadata.funnel)?.aweberSuffix ?? '';
        const bumpTags = [
          'order-bump',
          'paid',
          // The topic she was ALREADY reading on. `bumpBucket` (the second,
          // paired topic) is carried in Stripe metadata for Mike's fulfilment;
          // this tag keeps the list segmentable the way the others are.
          metadata.bucket || 'seer-within',
          `initial-purchase${bumpFunnelSuffix}`,
        ];
        addBumpPaidSubscriber({
          email: bumpEmail,
          name: metadata.firstName || undefined,
          // 🔴 The CHECKOUT SESSION id (cs_…), not the PaymentIntent — this is the
          // id Mike's n8n sees as `body.data.object.id`, so it is what joins the
          // two systems. The main paid list deliberately keeps storing pi_….
          stripeOrderId: session.id,
          tags: bumpTags,
        }).catch((err) =>
          logger.error('AWeber bump paid list error (non-blocking):', err),
        );
      } else {
        logger.warn(
          `Order bump: no email on session ${session.id}, skipped bump paid list`,
        );
      }
    }

    // Server-side FB event firing — closes the gap when the browser tab
    // closes / adblock blocks `/api/fb-event`. Uses deterministic event_id
    // to dedup with the client-side Pixel fire (see client/src/lib/facebook.ts).
    // NOTE: bracelet_* products fall through here harmlessly — resolveStripeEventName()
    // returns null for them and the call logs "unknown product, skipping".
    if (product && (session.amount_total ?? 0) > 0) {
      const mainSessionId = metadata.originalSession || session.id;
      fireStripePurchaseEvent({
        stripeRefId: session.id,
        mainSessionId,
        product,
        type: metadata.type,
        funnel: metadata.funnel,
        amountCents: session.amount_total ?? 0,
        email: metadata.email || session.customer_email || undefined,
        firstName: metadata.firstName || undefined,
      }).catch(() => { /* logged inside */ });

      // Durable server-side Google Ads conversion (dedups with the client gtag
      // fire via the order id). Ships dark until SGTM_GADS_ENDPOINT is set.
      fireGAdsForStripe({
        product,
        mainSessionId,
        amountCents: session.amount_total ?? 0,
        gclidFromMeta: metadata.gclid,
        email: metadata.email || session.customer_email || undefined,
      }).catch(() => { /* logged inside */ });
    }

    // No-optin (`?noemail=1`) front-end buyers never hit the normal
    // /api/save-progress migration (no email was captured in chat), so they'd
    // otherwise stay out of V2. Create their V2 account here on the first
    // purchase, using the email Stripe collected on its hosted page. Reuses the
    // same idempotent migration the normal landers use (account + free coins +
    // Evelyn drip with a magic-link login). Gated on the no-optin flag AND the
    // front-end product, so it never fires for normal funnels or for upsells.
    if (metadata.noemail === '1' && product === 'energy_clearing_ritual') {
      const noOptinEmail =
        session.customer_details?.email || session.customer_email || undefined;
      if (noOptinEmail) {
        migrateAndEmailFunnelUser({
          email: noOptinEmail,
          firstName: metadata.firstName || 'Friend',
          bucket: metadata.bucket || undefined,
        }).catch((err) =>
          logger.error('No-optin V2 migration error (non-blocking):', err),
        );
      } else {
        logger.warn(
          'No-optin V2 migration skipped: no email on session',
          { session: session.id },
        );
      }
    }
  }

  // Handle payment_intent.succeeded — only for 1-click upsells
  // (main-purchase PIs are owned by a Checkout Session and handled above).
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const metadata = pi.metadata || {};

    // Filter: only genuine 1-click upsell charges carry metadata.flow="1click".
    // This deliberately excludes the side-effect PI of a fallback-Checkout upsell
    // (which DOES carry originalSession but no flow marker) — that path fires its
    // FB event from checkout.session.completed instead, so gating on flow here
    // prevents the double-fire. Main-purchase side-effect PIs carry neither.
    if (metadata.flow !== "1click") {
      logger.info(`Stripe webhook: payment_intent.succeeded skipped (not a 1-click upsell), pi=${pi.id}`);
      return res.json({ received: true });
    }

    logger.info(`Stripe webhook: payment_intent.succeeded — product=${metadata.product}, pi=${pi.id}`);

    if (metadata.product && pi.amount > 0) {
      fireStripePurchaseEvent({
        stripeRefId: pi.id,
        mainSessionId: metadata.originalSession,
        product: metadata.product,
        type: metadata.type,
        funnel: metadata.funnel,
        amountCents: pi.amount,
        email: metadata.email,
        firstName: metadata.firstName,
      }).catch(() => { /* logged inside */ });

      // Durable server-side Google Ads conversion for 1-click upsells. gclid
      // backfills from the original Checkout Session when the PI lacks it.
      fireGAdsForStripe({
        product: metadata.product,
        mainSessionId: metadata.originalSession,
        amountCents: pi.amount,
        gclidFromMeta: metadata.gclid,
        email: metadata.email,
      }).catch(() => { /* logged inside */ });
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
