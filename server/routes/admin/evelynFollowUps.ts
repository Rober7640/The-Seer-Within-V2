// Admin routes for Evelyn follow-up emails (/evelyn lander signups).
// Mirrors server/routes/admin/aidenFollowUps.ts but operates on evelyn_followup_emails.

import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import { evelynFollowupEmails, users, personas } from '@shared/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import logger from '../../lib/logger';
import { processEvelynFollowupQueue } from '../../lib/evelynFollowupEmailGenerator';
import {
  processEvelynVerifiedDripQueue,
  backfillEvelynVerifiedDripExtension,
} from '../../lib/evelynVerifiedDripGenerator';
import { processEvelynPostPurchaseDripQueue } from '../../lib/evelynPostPurchaseDripGenerator';
import { buildFollowUpHtml } from '../../lib/emailTemplate';

// Valid sequence numbers for the verified-not-purchased drip filter dropdown.
// Both unverified (1–3) and verified_nopurchase (1–13) sequence_types share
// this filter; we accept up to 13 here so the verified extension shows up.
const VALID_SEQUENCE_NUMBERS: ReadonlySet<string> = new Set([
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13',
]);

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const EVELYN_SLUG = 'evelyn-cross';
const EVELYN_FROM_NAME_FALLBACK = 'Evelyn Cross';
const EVELYN_AVATAR_FALLBACK = '/uploads/avatars/evelyn-cross.png';

// True for stored bodyHtml that's already a full email template (sent rows
// get their bodyHtml overwritten with the full rendered HTML by processSingleRow).
// Pending/failed/skipped rows still hold only the inner-content paragraphs.
function isFullTemplateHtml(html: string): boolean {
  const head = html.trim().slice(0, 200).toLowerCase();
  return head.startsWith('<!doctype') || head.startsWith('<html');
}

const router = Router();

const SEQUENCE_TYPES = ['unverified', 'verified_nopurchase', 'post_purchase'] as const;
type SequenceType = (typeof SEQUENCE_TYPES)[number];

function parseSequenceType(raw: unknown): SequenceType {
  if (raw === 'verified_nopurchase') return 'verified_nopurchase';
  if (raw === 'post_purchase') return 'post_purchase';
  return 'unverified';
}

// ============================================
// GET /api/admin/evelyn-follow-ups/stats
// Query: ?sequenceType=unverified | verified_nopurchase
// ============================================
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const sequenceType = parseSequenceType(req.query.sequenceType);
    const typeFilter = eq(evelynFollowupEmails.sequenceType, sequenceType);

    const rows = await db
      .select({
        status: evelynFollowupEmails.status,
        sequenceNumber: evelynFollowupEmails.sequenceNumber,
        total: count(),
      })
      .from(evelynFollowupEmails)
      .where(typeFilter)
      .groupBy(evelynFollowupEmails.status, evelynFollowupEmails.sequenceNumber);

    const opened = await db
      .select({ total: count() })
      .from(evelynFollowupEmails)
      .where(and(typeFilter, sql`${evelynFollowupEmails.openedAt} IS NOT NULL`));

    const clicked = await db
      .select({ total: count() })
      .from(evelynFollowupEmails)
      .where(and(typeFilter, sql`${evelynFollowupEmails.clickedAt} IS NOT NULL`));

    const flagEnabled =
      sequenceType === 'verified_nopurchase'
        ? process.env.ENABLE_EVELYN_VERIFIED_DRIP === 'true'
        : sequenceType === 'post_purchase'
          ? process.env.ENABLE_POST_PURCHASE_DRIP === 'true'
          : process.env.ENABLE_EVELYN_FOLLOWUPS === 'true';

    return res.json({
      sequenceType,
      flagEnabled,
      breakdown: rows,
      openedTotal: opened[0]?.total ?? 0,
      clickedTotal: clicked[0]?.total ?? 0,
    });
  } catch (error: any) {
    logger.error('Admin evelyn-follow-ups stats error:', error);
    return res.status(500).json({ error: 'Failed to load stats' });
  }
});

// ============================================
// GET /api/admin/evelyn-follow-ups
// Paginated list with user info
// ============================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 25));
    const offset = (page - 1) * pageSize;

    const sequenceType = parseSequenceType(req.query.sequenceType);
    const statusFilter = req.query.status as string | undefined;
    const seqFilter = req.query.sequence as string | undefined;

    const conditions = [eq(evelynFollowupEmails.sequenceType, sequenceType)];
    if (statusFilter && ['pending', 'sent', 'failed', 'skipped'].includes(statusFilter)) {
      conditions.push(eq(evelynFollowupEmails.status, statusFilter));
    }
    if (seqFilter && VALID_SEQUENCE_NUMBERS.has(seqFilter)) {
      conditions.push(eq(evelynFollowupEmails.sequenceNumber, parseInt(seqFilter)));
    }
    const whereClause = and(...conditions);

    const rowsQuery = db
      .select({
        id: evelynFollowupEmails.id,
        userId: evelynFollowupEmails.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        emailVerified: users.emailVerified,
        sequenceNumber: evelynFollowupEmails.sequenceNumber,
        scheduledFor: evelynFollowupEmails.scheduledFor,
        status: evelynFollowupEmails.status,
        sentAt: evelynFollowupEmails.sentAt,
        openedAt: evelynFollowupEmails.openedAt,
        clickedAt: evelynFollowupEmails.clickedAt,
        errorMessage: evelynFollowupEmails.errorMessage,
        subject: evelynFollowupEmails.subject,
        createdAt: evelynFollowupEmails.createdAt,
      })
      .from(evelynFollowupEmails)
      .leftJoin(users, eq(evelynFollowupEmails.userId, users.id));

    const rows = await rowsQuery
      .where(whereClause)
      .orderBy(desc(evelynFollowupEmails.scheduledFor))
      .limit(pageSize)
      .offset(offset);

    const totalCountRow = await db
      .select({ total: count() })
      .from(evelynFollowupEmails)
      .where(whereClause);

    const total = totalCountRow[0]?.total ?? 0;

    return res.json({
      sequenceType,
      rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    logger.error('Admin evelyn-follow-ups list error:', error);
    return res.status(500).json({ error: 'Failed to load follow-ups' });
  }
});

// ============================================
// POST /api/admin/evelyn-follow-ups/trigger
// Manually process the queue. Body/query: ?sequenceType=unverified|verified_nopurchase
// Each sequence_type has its own env flag:
//   - unverified         → ENABLE_EVELYN_FOLLOWUPS
//   - verified_nopurchase → ENABLE_EVELYN_VERIFIED_DRIP
// ============================================
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const sequenceType = parseSequenceType(req.query.sequenceType ?? req.body?.sequenceType);
    logger.info('Admin: manually triggering Evelyn drip queue', {
      adminId: (req as any).adminId,
      sequenceType,
    });

    if (sequenceType === 'verified_nopurchase') {
      const stats = await processEvelynVerifiedDripQueue();
      return res.json({
        success: true,
        sequenceType,
        stats,
        note: stats.flagEnabled
          ? 'Verified-drip queue processed. Check stats for send counts.'
          : 'ENABLE_EVELYN_VERIFIED_DRIP flag is OFF — no emails were sent. Set env var to "true" on Railway to enable.',
      });
    }

    if (sequenceType === 'post_purchase') {
      const stats = await processEvelynPostPurchaseDripQueue();
      return res.json({
        success: true,
        sequenceType,
        stats,
        note: stats.flagEnabled
          ? 'Post-purchase drip queue processed. Check stats for send counts.'
          : 'ENABLE_POST_PURCHASE_DRIP flag is OFF — no emails were sent. Set env var to "true" on Railway to enable.',
      });
    }

    const stats = await processEvelynFollowupQueue();
    return res.json({
      success: true,
      sequenceType,
      stats,
      note: stats.flagEnabled
        ? 'Unverified drip queue processed. Check stats for send counts.'
        : 'ENABLE_EVELYN_FOLLOWUPS flag is OFF — no emails were sent. Set env var to "true" on Railway to enable.',
    });
  } catch (error: any) {
    logger.error('Admin evelyn-follow-ups trigger error:', error);
    return res.status(500).json({ error: 'Failed to process Evelyn follow-up queue' });
  }
});

// ============================================
// POST /api/admin/evelyn-follow-ups/backfill-extension
// One-shot backfill: schedules emails 4–13 for users who already have rows 1–3
// and haven't purchased / unsubscribed. Idempotent — safe to call multiple times.
// Cadence: seq 4 fires at now + 1h, then 48h apart through seq 13.
// ============================================
router.post('/backfill-extension', async (req: Request, res: Response) => {
  try {
    logger.info('Admin: backfilling Evelyn verified drip extension (seq 4–13)', {
      adminId: (req as any).adminId,
    });
    const result = await backfillEvelynVerifiedDripExtension();
    return res.json({
      success: true,
      result,
      note: `Found ${result.found} users with seq 1–3 rows. Scheduled extension for ${result.scheduled}, skipped ${result.skipped} (purchased / unsubscribed / already backfilled / inactive).`,
    });
  } catch (error: any) {
    logger.error('Admin evelyn-follow-ups backfill-extension error:', error);
    return res.status(500).json({ error: 'Backfill failed', message: error?.message });
  }
});

// ============================================
// GET /api/admin/evelyn-follow-ups/preview/:id
// Return the stored HTML for eye-icon preview.
// ============================================
router.get('/preview/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const rows = await db
      .select({
        id: evelynFollowupEmails.id,
        subject: evelynFollowupEmails.subject,
        bodyHtml: evelynFollowupEmails.bodyHtml,
        bodyText: evelynFollowupEmails.bodyText,
        recipientEmail: evelynFollowupEmails.recipientEmail,
        sequenceNumber: evelynFollowupEmails.sequenceNumber,
        sequenceType: evelynFollowupEmails.sequenceType,
        status: evelynFollowupEmails.status,
        unsubscribeToken: evelynFollowupEmails.unsubscribeToken,
      })
      .from(evelynFollowupEmails)
      .where(eq(evelynFollowupEmails.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Not found' });
    }

    // For sent rows, bodyHtml is already the full rendered template — return as-is.
    // For pending/failed/skipped rows, bodyHtml is just the inner paragraphs, so
    // we wrap it with the same email template the cron uses at send time so the
    // admin preview matches what the recipient will actually see.
    if (isFullTemplateHtml(row.bodyHtml)) {
      return res.json(row);
    }

    // Resolve Evelyn persona for branding. Fallbacks ensure the preview still
    // renders even if the personas row is somehow missing.
    const personaRow = await db
      .select({
        avatarUrl: personas.avatarUrl,
        fromName: personas.fromName,
      })
      .from(personas)
      .where(eq(personas.slug, EVELYN_SLUG))
      .limit(1);

    const fromName = personaRow[0]?.fromName || EVELYN_FROM_NAME_FALLBACK;
    const avatarRel = personaRow[0]?.avatarUrl || EVELYN_AVATAR_FALLBACK;
    const avatarUrl = avatarRel.startsWith('http') ? avatarRel : `${BASE_URL}${avatarRel}`;

    // CTA text differs by drip: unverified rows push verification, verified-
    // not-purchased rows return to Evelyn's chat, post-purchase rows soft-invite
    // a return without urgency.
    const ctaText =
      row.sequenceType === 'verified_nopurchase'
        ? 'Return to Evelyn'
        : row.sequenceType === 'post_purchase'
          ? 'Talk with Evelyn'
          : 'Confirm Your Email';

    // Preview-only placeholder URLs — we don't want to mint a real magic-link
    // token just to render an admin preview. Real CTAs are minted at send time
    // inside processSingleRow.
    const ctaUrl = `${BASE_URL}/login?preview=1`;
    const unsubscribeUrl = row.unsubscribeToken
      ? `${BASE_URL}/api/webhooks/unsubscribe?token=${row.unsubscribeToken}`
      : `${BASE_URL}/unsubscribe`;

    const fullHtml = buildFollowUpHtml({
      personaName: fromName,
      emailBody: row.bodyHtml,
      ctaUrl,
      ctaText,
      unsubscribeUrl,
      privacyUrl: `${BASE_URL}/privacy`,
      avatarUrl,
    });

    return res.json({
      ...row,
      bodyHtml: fullHtml,
      previewWrapped: true,
    });
  } catch (error: any) {
    logger.error('Admin evelyn-follow-ups preview error:', error);
    return res.status(500).json({ error: 'Failed to load preview' });
  }
});

export default router;
