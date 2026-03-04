// Webhook handler for Resend email events and unsubscribe actions.

import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { followUpEmails, userFollowUpPreferences } from '@shared/schema';
import { eq } from 'drizzle-orm';
import logger from '../lib/logger';

const router = Router();

/**
 * POST /api/webhooks/resend
 * Handles Resend webhook events: delivered, opened, clicked, bounced, complained.
 */
router.post('/resend', async (req: Request, res: Response) => {
  try {
    const event = req.body;

    if (!event || !event.type) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    logger.info(`Resend webhook: ${event.type}`, event.data?.email_id || '');

    const emailId = event.data?.email_id;
    if (!emailId) {
      return res.status(200).json({ received: true });
    }

    // Find the email record by Resend email ID
    const emailRecords = await db
      .select()
      .from(followUpEmails)
      .where(eq(followUpEmails.resendEmailId, emailId))
      .limit(1);

    const record = emailRecords[0];
    if (!record) {
      logger.info(`Resend webhook: No matching email record for ${emailId}`);
      return res.status(200).json({ received: true });
    }

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
          .set({
            opened: true,
            openedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(followUpEmails.id, record.id));
        break;

      case 'email.clicked':
        await db
          .update(followUpEmails)
          .set({
            clicked: true,
            clickedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(followUpEmails.id, record.id));
        break;

      case 'email.bounced':
        await db
          .update(followUpEmails)
          .set({
            status: 'bounced',
            deliveryStatus: 'bounced',
            updatedAt: new Date(),
          })
          .where(eq(followUpEmails.id, record.id));

        // Auto-unsubscribe on bounce
        await autoUnsubscribe(record.userId, 'bounced');
        break;

      case 'email.complained':
        await db
          .update(followUpEmails)
          .set({
            status: 'bounced',
            deliveryStatus: 'spam_complaint',
            updatedAt: new Date(),
          })
          .where(eq(followUpEmails.id, record.id));

        // Auto-unsubscribe on spam complaint
        await autoUnsubscribe(record.userId, 'spam_complaint');
        break;

      default:
        logger.info(`Resend webhook: Unhandled event type ${event.type}`);
    }

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

    // Find the email by unsubscribe token
    const emailRecords = await db
      .select()
      .from(followUpEmails)
      .where(eq(followUpEmails.unsubscribeToken, token))
      .limit(1);

    const record = emailRecords[0];
    if (!record) {
      return res.status(404).send(unsubscribePageHtml('Invalid or expired unsubscribe link.', false));
    }

    // Unsubscribe the user
    await autoUnsubscribe(record.userId, 'user_unsubscribed');

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

    const emailRecords = await db
      .select()
      .from(followUpEmails)
      .where(eq(followUpEmails.unsubscribeToken, token))
      .limit(1);

    const record = emailRecords[0];
    if (!record) {
      return res.status(404).json({ error: 'Invalid token' });
    }

    await autoUnsubscribe(record.userId, 'user_unsubscribed');

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

export default router;
