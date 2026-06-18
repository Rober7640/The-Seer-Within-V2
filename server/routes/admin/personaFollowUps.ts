// Admin routes for the generalized persona drip (Marcus/Luna/Nova/Maren).
// Persona-aware version of evelynFollowUps.ts: one set of endpoints, filtered by a
// ?persona=<slug> query param, over the shared persona_followup_emails table.
// Only one drip track exists here today: 'verified_nopurchase' (10 emails).

import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import { personaFollowupEmails, users, personas } from '@shared/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import logger from '../../lib/logger';
import { processPersonaVerifiedDripQueue } from '../../lib/personaVerifiedDripGenerator';
import { getPersonaDripConfig, PERSONA_DRIP_SLUGS } from '../../lib/personaDripConfig';
import { buildFollowUpHtml } from '../../lib/emailTemplate';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const SEQUENCE_TYPE = 'verified_nopurchase';
const VALID_SEQUENCE_NUMBERS: ReadonlySet<string> = new Set(['1','2','3','4','5','6','7','8','9','10']);

const router = Router();

// Resolve + validate the ?persona= filter; default to the first configured persona.
function resolvePersona(req: Request): string {
  const raw = String(req.query.persona || '');
  return PERSONA_DRIP_SLUGS.includes(raw) ? raw : PERSONA_DRIP_SLUGS[0];
}

function isFullTemplateHtml(html: string): boolean {
  const head = html.trim().slice(0, 200).toLowerCase();
  return head.startsWith('<!doctype') || head.startsWith('<html');
}

// ============================================
// GET /api/admin/persona-follow-ups/personas
// List the personas that have a drip (for the UI switcher).
// ============================================
router.get('/personas', async (_req: Request, res: Response) => {
  const list = PERSONA_DRIP_SLUGS.map((slug) => ({
    slug,
    displayName: getPersonaDripConfig(slug)?.personaName ?? slug,
  }));
  return res.json({ personas: list });
});

// ============================================
// GET /api/admin/persona-follow-ups/stats?persona=<slug>
// ============================================
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const personaSlug = resolvePersona(req);
    const filter = and(
      eq(personaFollowupEmails.personaSlug, personaSlug),
      eq(personaFollowupEmails.sequenceType, SEQUENCE_TYPE),
    );

    const rows = await db
      .select({
        status: personaFollowupEmails.status,
        sequenceNumber: personaFollowupEmails.sequenceNumber,
        total: count(),
      })
      .from(personaFollowupEmails)
      .where(filter)
      .groupBy(personaFollowupEmails.status, personaFollowupEmails.sequenceNumber);

    const opened = await db
      .select({ total: count() })
      .from(personaFollowupEmails)
      .where(and(filter, sql`${personaFollowupEmails.openedAt} IS NOT NULL`));

    const clicked = await db
      .select({ total: count() })
      .from(personaFollowupEmails)
      .where(and(filter, sql`${personaFollowupEmails.clickedAt} IS NOT NULL`));

    return res.json({
      persona: personaSlug,
      flagEnabled: process.env.ENABLE_PERSONA_VERIFIED_DRIP === 'true',
      breakdown: rows,
      openedTotal: opened[0]?.total ?? 0,
      clickedTotal: clicked[0]?.total ?? 0,
    });
  } catch (error: any) {
    logger.error('Admin persona-follow-ups stats error:', error);
    return res.status(500).json({ error: 'Failed to load stats' });
  }
});

// ============================================
// GET /api/admin/persona-follow-ups?persona=<slug>  (paginated list)
// ============================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const personaSlug = resolvePersona(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 25));
    const offset = (page - 1) * pageSize;

    const statusFilter = req.query.status as string | undefined;
    const seqFilter = req.query.sequence as string | undefined;

    const conditions = [
      eq(personaFollowupEmails.personaSlug, personaSlug),
      eq(personaFollowupEmails.sequenceType, SEQUENCE_TYPE),
    ];
    if (statusFilter && ['pending', 'sent', 'failed', 'skipped'].includes(statusFilter)) {
      conditions.push(eq(personaFollowupEmails.status, statusFilter));
    }
    if (seqFilter && VALID_SEQUENCE_NUMBERS.has(seqFilter)) {
      conditions.push(eq(personaFollowupEmails.sequenceNumber, parseInt(seqFilter)));
    }
    const whereClause = and(...conditions);

    const rows = await db
      .select({
        id: personaFollowupEmails.id,
        userId: personaFollowupEmails.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        emailVerified: users.emailVerified,
        sequenceNumber: personaFollowupEmails.sequenceNumber,
        scheduledFor: personaFollowupEmails.scheduledFor,
        status: personaFollowupEmails.status,
        sentAt: personaFollowupEmails.sentAt,
        openedAt: personaFollowupEmails.openedAt,
        clickedAt: personaFollowupEmails.clickedAt,
        errorMessage: personaFollowupEmails.errorMessage,
        subject: personaFollowupEmails.subject,
        createdAt: personaFollowupEmails.createdAt,
      })
      .from(personaFollowupEmails)
      .leftJoin(users, eq(personaFollowupEmails.userId, users.id))
      .where(whereClause)
      .orderBy(desc(personaFollowupEmails.scheduledFor))
      .limit(pageSize)
      .offset(offset);

    const totalCountRow = await db
      .select({ total: count() })
      .from(personaFollowupEmails)
      .where(whereClause);
    const total = totalCountRow[0]?.total ?? 0;

    return res.json({
      persona: personaSlug,
      rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error: any) {
    logger.error('Admin persona-follow-ups list error:', error);
    return res.status(500).json({ error: 'Failed to load follow-ups' });
  }
});

// ============================================
// POST /api/admin/persona-follow-ups/trigger
// Drains the shared queue for ALL personas (one processor). Flag-gated.
// ============================================
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    logger.info('Admin: manually triggering persona drip queue', { adminId: (req as any).adminId });
    const stats = await processPersonaVerifiedDripQueue();
    return res.json({
      success: true,
      stats,
      note: stats.flagEnabled
        ? 'Persona drip queue processed (all personas). Check stats for send counts.'
        : 'ENABLE_PERSONA_VERIFIED_DRIP flag is OFF — no emails were sent. Set env var to "true" on Railway to enable.',
    });
  } catch (error: any) {
    logger.error('Admin persona-follow-ups trigger error:', error);
    return res.status(500).json({ error: 'Failed to process persona drip queue' });
  }
});

// ============================================
// GET /api/admin/persona-follow-ups/preview/:id
// ============================================
router.get('/preview/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const rows = await db
      .select({
        id: personaFollowupEmails.id,
        personaSlug: personaFollowupEmails.personaSlug,
        subject: personaFollowupEmails.subject,
        bodyHtml: personaFollowupEmails.bodyHtml,
        bodyText: personaFollowupEmails.bodyText,
        recipientEmail: personaFollowupEmails.recipientEmail,
        sequenceNumber: personaFollowupEmails.sequenceNumber,
        status: personaFollowupEmails.status,
        unsubscribeToken: personaFollowupEmails.unsubscribeToken,
      })
      .from(personaFollowupEmails)
      .where(eq(personaFollowupEmails.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) return res.status(404).json({ error: 'Not found' });

    // Sent rows already hold the full rendered template — return as-is.
    if (isFullTemplateHtml(row.bodyHtml)) return res.json(row);

    // Pending/failed/skipped rows hold only inner paragraphs — wrap with the same
    // template the cron uses so the preview matches what the recipient will see.
    const config = getPersonaDripConfig(row.personaSlug);
    const personaRow = await db
      .select({ avatarUrl: personas.avatarUrl, fromName: personas.fromName })
      .from(personas)
      .where(eq(personas.slug, row.personaSlug))
      .limit(1);

    const fromName = personaRow[0]?.fromName || config?.personaName || row.personaSlug;
    const avatarRel = personaRow[0]?.avatarUrl || `/uploads/avatars/${row.personaSlug}.png`;
    const avatarUrl = avatarRel.startsWith('http') ? avatarRel : `${BASE_URL}${avatarRel}`;

    const ctaUrl = `${BASE_URL}/login?preview=1`;
    const unsubscribeUrl = row.unsubscribeToken
      ? `${BASE_URL}/api/webhooks/unsubscribe?token=${row.unsubscribeToken}`
      : `${BASE_URL}/unsubscribe`;

    const fullHtml = buildFollowUpHtml({
      personaName: fromName,
      emailBody: row.bodyHtml,
      ctaUrl,
      ctaText: config?.ctaText || 'Continue your reading',
      unsubscribeUrl,
      privacyUrl: `${BASE_URL}/privacy`,
      avatarUrl,
    });

    return res.json({ ...row, bodyHtml: fullHtml, previewWrapped: true });
  } catch (error: any) {
    logger.error('Admin persona-follow-ups preview error:', error);
    return res.status(500).json({ error: 'Failed to load preview' });
  }
});

export default router;
