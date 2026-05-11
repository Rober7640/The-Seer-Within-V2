// Admin test-send endpoint for the post-purchase pastoral-care drip.
//
// Purpose: render ONE Haiku-personalized email and send it via Resend to a
// caller-specified recipient — without inserting anything into the DB and
// without requiring a real purchase to exist. Lets us QA Haiku output, the
// shared template wrapping, Resend deliverability, and persona voice
// independently of the cron / scheduling pipeline.
//
// Not gated by ENABLE_POST_PURCHASE_DRIP (this is a manual admin action,
// distinct from the cron path). Subject is prefixed with [TEST] so any test
// emails are easy to spot in inboxes / Resend dashboard.

import { Router, Request, Response } from 'express';
import { Resend } from 'resend';
import { z } from 'zod';
import { db } from '../../lib/db';
import { personas } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { buildFollowUpHtml, buildFollowUpText } from '../../lib/emailTemplate';
import { fireWithBreaker, resendBreaker } from '../../lib/circuitBreaker';
import { generateEvelynPostPurchaseTestContent } from '../../lib/evelynPostPurchaseDripGenerator';
import { generateAidenPostPurchaseTestContent } from '../../lib/aidenPostPurchaseDripGenerator';
import logger from '../../lib/logger';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

const EVELYN_SLUG = 'evelyn-cross';
const AIDEN_SLUG = 'aiden-powers';

const router = Router();

const testSendSchema = z.object({
  personaSlug: z.enum(['evelyn-cross', 'aiden-powers']),
  sequenceNumber: z.number().int().min(1).max(10),
  recipientEmail: z.string().email().max(255),
  firstName: z.string().min(1).max(80).optional(),
  // Evelyn personalization (optional). Maps to BUCKET_PHRASES in the generator.
  bucket: z.enum(['love', 'money', 'purpose', 'specific']).optional(),
  // Aiden personalization (optional). Maps to TOPIC_PHRASES in the generator.
  topic: z.enum(['life_direction', 'love_relationships', 'career_money', 'something_specific']).optional(),
});

// ============================================
// POST /api/admin/post-purchase-drip/test-send
// ============================================
router.post('/test-send', async (req: Request, res: Response) => {
  try {
    const parsed = testSendSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      });
    }
    const { personaSlug, sequenceNumber, recipientEmail, firstName, bucket, topic } = parsed.data;

    // (1) Persona lookup — for from-name, from-email, avatar
    const personaRow = await db
      .select({
        id: personas.id,
        avatarUrl: personas.avatarUrl,
        fromEmail: personas.fromEmail,
        fromName: personas.fromName,
      })
      .from(personas)
      .where(eq(personas.slug, personaSlug))
      .limit(1);

    if (!personaRow[0]) {
      return res.status(404).json({ error: `Persona not found in DB: ${personaSlug}` });
    }

    // (2) Generate content via the persona-specific helper
    const fn = firstName || 'there';
    const content =
      personaSlug === EVELYN_SLUG
        ? await generateEvelynPostPurchaseTestContent(sequenceNumber, fn, bucket ?? null)
        : await generateAidenPostPurchaseTestContent(sequenceNumber, fn, topic ?? null);

    // (3) From / branding fallbacks
    const fromEmail =
      personaRow[0].fromEmail ||
      (personaSlug === EVELYN_SLUG ? 'evelyn@theseerwithin.com' : 'aiden@theseerwithin.com');
    const fromName =
      personaRow[0].fromName ||
      (personaSlug === EVELYN_SLUG ? 'Evelyn Cross' : 'Aiden Powers');
    const avatarRel =
      personaRow[0].avatarUrl ||
      (personaSlug === EVELYN_SLUG
        ? '/uploads/avatars/evelyn-cross.png'
        : '/uploads/avatars/aiden-powers.png');
    const avatarUrl = avatarRel.startsWith('http') ? avatarRel : `${BASE_URL}${avatarRel}`;

    // (4) Placeholder CTA URL — test sends don't mint real magic-link tokens
    // since no actual user is required. Real magic-link plumbing is exercised
    // by the cron path, not the test-send path.
    const ctaUrl = `${BASE_URL}/login?test=1`;
    const unsubscribeUrl = `${BASE_URL}/unsubscribe?test=1`;
    const ctaText = personaSlug === EVELYN_SLUG ? 'Talk with Evelyn' : 'Pull a card with Aiden';

    const fullHtml = buildFollowUpHtml({
      personaName: fromName,
      emailBody: content.bodyHtml,
      ctaUrl,
      ctaText,
      unsubscribeUrl,
      privacyUrl: `${BASE_URL}/privacy`,
      avatarUrl,
    });
    const fullText = buildFollowUpText({
      personaName: fromName,
      emailBody: content.bodyText,
      ctaUrl,
      unsubscribeUrl,
    });

    if (!resend) {
      return res.status(500).json({
        error: 'Resend not configured (RESEND_API_KEY missing on this environment)',
      });
    }

    // (5) Send via Resend with [TEST] subject prefix
    const subject = `[TEST] ${content.subject}`;
    const tagPrefix = personaSlug === EVELYN_SLUG ? 'evelyn' : 'aiden';

    const result = await fireWithBreaker(resendBreaker, () =>
      resend!.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: recipientEmail,
        replyTo: fromEmail,
        subject,
        html: fullHtml,
        text: fullText,
        tags: [
          { name: 'type', value: `${tagPrefix}_post_purchase_test` },
          { name: 'sequence', value: String(sequenceNumber) },
          { name: 'admin_test', value: 'true' },
        ],
      }),
    );

    if (result.error) {
      logger.error('Post-purchase drip test-send Resend error', {
        adminId: req.adminId,
        personaSlug,
        sequenceNumber,
        error: result.error.message,
      });
      return res.status(500).json({
        error: 'Resend send failed',
        message: result.error.message,
      });
    }

    logger.info('Post-purchase drip test send OK', {
      adminId: req.adminId,
      personaSlug,
      sequenceNumber,
      recipientEmail,
      resendId: result.data?.id,
      generatedBy: content.generatedBy,
    });

    return res.json({
      success: true,
      personaSlug,
      sequenceNumber,
      recipientEmail,
      subject,
      generatedBy: content.generatedBy,
      resendId: result.data?.id ?? null,
      note:
        content.generatedBy === 'claude-haiku'
          ? 'Sent with fresh Haiku-personalized copy.'
          : 'Sent with static fallback copy (Haiku generation failed or returned malformed JSON).',
    });
  } catch (error: any) {
    logger.error('Post-purchase drip test-send error:', error);
    return res.status(500).json({
      error: 'Test send failed',
      message: error?.message || 'unknown',
    });
  }
});

export default router;
