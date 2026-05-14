// Evelyn "Unverified" Follow-Up Drip — 3-email nurture for /evelyn lander signups
// who created an account but haven't clicked the verification link.
//
// Cadence (from signup time):
//   Sequence 1: +10 minutes  — soft pull ("the thread we started")
//   Sequence 2: +24 hours    — quietly revelatory ("something pulled me back")
//   Sequence 3: +48 hours    — last reach with dignity ("one last note")
//
// Rows are created at signup when the user came through the /evelyn lander.
// Cron picks up ripe rows and processes them.
//
// Send-time skip checks: user verified (cascade), account inactive, email
// changed, unsubscribed, stale window.
//
// Gated behind ENABLE_EVELYN_FOLLOWUPS env var — defaults OFF. No emails
// send to users who existed before this module deploys.

import { Resend } from 'resend';
import { db } from './db';
import {
  users,
  personas,
  evelynFollowupEmails,
  userFollowUpPreferences,
  evelynLanderSessions,
} from '@shared/schema';
import { eq, and, lte, sql, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { buildFollowUpHtml, buildFollowUpText } from './emailTemplate';
import { generateMagicLinkToken } from './magicLink';
import { fireWithBreaker, resendBreaker } from './circuitBreaker';
import logger from './logger';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const EVELYN_SLUG = 'evelyn-cross';

// Delays from signup time (user.createdAt for lander signups).
const DELAY_MS: Record<1 | 2 | 3, number> = {
  1: 10 * 60 * 1000,
  2: 24 * 60 * 60 * 1000,
  3: 48 * 60 * 60 * 1000,
};

// Stale windows — if scheduledFor is more than this behind NOW when the cron
// finally wakes, skip the email rather than send something that no longer makes
// sense. Mirrors the Aiden cadence one-to-one.
const STALE_MS: Record<1 | 2 | 3, number> = {
  1: 4 * 60 * 60 * 1000,         // +10m: skip if >4h late
  2: 20 * 60 * 60 * 1000,        // +24h: skip if >20h late
  3: 24 * 60 * 60 * 1000,        // +48h: skip if >24h late
};

// Lander bucket → opener phrase. Slot grammatically into the static fallback
// bodies in the form "around <phrase>" or "settled around <phrase>".
const BUCKET_PHRASES: Record<string, string> = {
  love:     "love and what's been pulling at your heart",
  money:    "the question of money you carried in",
  purpose:  "the path you're trying to find",
  specific: "the situation you brought to me",
};
const BUCKET_DEFAULT = "what surfaced when we last spoke";

// Fallbacks if the personas row is somehow unavailable.
const EVELYN_FROM_EMAIL_FALLBACK = 'evelyn@theseerwithin.com';
const EVELYN_FROM_NAME_FALLBACK = 'Evelyn Cross';
const EVELYN_AVATAR_FALLBACK = '/uploads/avatars/evelyn-cross.png';

// ============================================================
// Utilities
// ============================================================

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeFirstName(raw: string | null | undefined): string {
  const trimmed = (raw || '').trim();
  return escapeHtml(trimmed || 'there');
}

// ============================================================
// Email content — Evelyn's voice, locked at copy review.
// Static-with-bucket-substitution, mirroring Aiden's Drip 1 pattern.
// ============================================================

function buildEmailContent(
  seq: 1 | 2 | 3,
  firstName: string,
  bucketPhrase: string,
): { subject: string; bodyHtml: string; bodyText: string } {
  const fn = safeFirstName(firstName);
  const phrase = escapeHtml(bucketPhrase);

  if (seq === 1) {
    return {
      subject: `Your space is still here, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>The thread we started a moment ago — I felt it pull tight when you stepped away. There's more sitting here for you than fits one conversation.</p>`,
        `<p>I can't open the door fully until you confirm your email. One click is all the cards need.</p>`,
        `<p>— Evelyn</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">If this wasn't you, simply leave it. The space will keep until it's right.</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `The thread we started a moment ago — I felt it pull tight when you stepped away. There's more sitting here for you than fits one conversation.`,
        '',
        `I can't open the door fully until you confirm your email. One click is all the cards need.`,
        '',
        `— Evelyn`,
        '',
        `If this wasn't you, simply leave it. The space will keep until it's right.`,
      ].join('\n'),
    };
  }

  if (seq === 2) {
    return {
      subject: `Something pulled me back to your reading, ${fn}`,
      bodyHtml: [
        `<p>${fn},</p>`,
        `<p>I don't usually return to a thread once it's been left — but yours surfaced again last night, around ${phrase}. The energy hasn't gone quiet.</p>`,
        `<p>I held a small piece back when we first spoke — something I'd rather you hear from me than wonder about. The verification link is still good. One tap and we can finish what we started.</p>`,
        `<p>— Evelyn</p>`,
        `<p style="margin-top:28px;font-style:italic;color:#6a6275;">No reply needed. Whatever finds you, finds you.</p>`,
      ].join('\n'),
      bodyText: [
        `${fn},`,
        '',
        `I don't usually return to a thread once it's been left — but yours surfaced again last night, around ${bucketPhrase}. The energy hasn't gone quiet.`,
        '',
        `I held a small piece back when we first spoke — something I'd rather you hear from me than wonder about. The verification link is still good. One tap and we can finish what we started.`,
        '',
        `— Evelyn`,
        '',
        `No reply needed. Whatever finds you, finds you.`,
      ].join('\n'),
    };
  }

  // seq === 3 — last reach with dignity
  return {
    subject: `One last note, ${fn}`,
    bodyHtml: [
      `<p>${fn},</p>`,
      `<p>This is the last time I'll write. Not because the reading has closed — it hasn't, your name is still on it — but some thresholds you have to cross on your own.</p>`,
      `<p>Your five free minutes haven't moved. The thread we started is still here, exactly where you left it. Whenever you're ready, the door opens with one click.</p>`,
      `<p>— Evelyn</p>`,
      `<p style="margin-top:28px;font-style:italic;color:#6a6275;">Whatever you choose, what brought you to me wasn't an accident.</p>`,
    ].join('\n'),
    bodyText: [
      `${fn},`,
      '',
      `This is the last time I'll write. Not because the reading has closed — it hasn't, your name is still on it — but some thresholds you have to cross on your own.`,
      '',
      `Your five free minutes haven't moved. The thread we started is still here, exactly where you left it. Whenever you're ready, the door opens with one click.`,
      '',
      `— Evelyn`,
      '',
      `Whatever you choose, what brought you to me wasn't an accident.`,
    ].join('\n'),
  };
}

// ============================================================
// scheduleEvelynFollowups — called from signup handler when the
// user came through /evelyn lander.
// ============================================================

export async function scheduleEvelynFollowups(params: {
  userId: string;
  email: string;
  firstName: string;
  bucket?: string | null;
  baseTime?: Date;
}): Promise<void> {
  try {
    const baseMs = (params.baseTime ?? new Date()).getTime();
    const bucketPhrase =
      (params.bucket && BUCKET_PHRASES[params.bucket]) || BUCKET_DEFAULT;

    const rows = ([1, 2, 3] as const).map((seq) => {
      const content = buildEmailContent(seq, params.firstName, bucketPhrase);
      return {
        userId: params.userId,
        sequenceType: 'unverified' as const,
        sequenceNumber: seq,
        scheduledFor: new Date(baseMs + DELAY_MS[seq]),
        recipientEmail: params.email,
        subject: content.subject,
        bodyHtml: content.bodyHtml,
        bodyText: content.bodyText,
        status: 'pending' as const,
        unsubscribeToken: randomUUID(),
      };
    });

    await db.insert(evelynFollowupEmails).values(rows);
    logger.info('[EvelynFollowup] Scheduled 3 unverified-track emails', {
      userId: params.userId,
    });
  } catch (error) {
    logger.error('[EvelynFollowup] Failed to schedule follow-ups', {
      userId: params.userId,
      error: (error as Error).message,
    });
    // Swallow — registration must never be blocked by drip scheduling.
  }
}

// ============================================================
// skipEvelynFollowupsForUser — call on verify-email or unsubscribe
// to cascade-skip the user's pending unverified-track rows.
// ============================================================

export async function skipEvelynFollowupsForUser(
  userId: string,
  reason: string,
): Promise<void> {
  try {
    await db
      .update(evelynFollowupEmails)
      .set({
        status: 'skipped',
        errorMessage: reason.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(evelynFollowupEmails.userId, userId),
          eq(evelynFollowupEmails.sequenceType, 'unverified'),
          eq(evelynFollowupEmails.status, 'pending'),
        ),
      );
  } catch (error) {
    logger.warn('[EvelynFollowup] Failed to skip pending rows', {
      userId,
      error: (error as Error).message,
    });
  }
}

// ============================================================
// processEvelynFollowupQueue — cron entry point AND manual admin trigger
// ============================================================

export interface EvelynFollowupProcessResult {
  flagEnabled: boolean;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
}

export async function processEvelynFollowupQueue(): Promise<EvelynFollowupProcessResult> {
  const flagEnabled = process.env.ENABLE_EVELYN_FOLLOWUPS === 'true';

  if (!flagEnabled) {
    logger.info(
      '[EvelynFollowup] ENABLE_EVELYN_FOLLOWUPS is not "true" — skipping queue',
    );
    return { flagEnabled: false, processed: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const now = new Date();

  // Load ripe pending unverified-track rows. Earlier-scheduled fires first.
  const rows = await db
    .select()
    .from(evelynFollowupEmails)
    .where(
      and(
        eq(evelynFollowupEmails.sequenceType, 'unverified'),
        eq(evelynFollowupEmails.status, 'pending'),
        lte(evelynFollowupEmails.scheduledFor, now),
      ),
    )
    .orderBy(evelynFollowupEmails.scheduledFor)
    .limit(200);

  if (rows.length === 0) {
    return { flagEnabled: true, processed: 0, sent: 0, skipped: 0, failed: 0 };
  }

  // Resolve Evelyn persona once for the batch (from/avatar + personaId for magic link).
  const personaRow = await db
    .select({
      id: personas.id,
      avatarUrl: personas.avatarUrl,
      fromEmail: personas.fromEmail,
      fromName: personas.fromName,
    })
    .from(personas)
    .where(eq(personas.slug, EVELYN_SLUG))
    .limit(1);

  if (!personaRow[0]) {
    logger.error('[EvelynFollowup] Evelyn persona row not found — aborting batch');
    return { flagEnabled: true, processed: 0, sent: 0, skipped: 0, failed: rows.length };
  }

  const persona = personaRow[0];
  const fromEmail = persona.fromEmail || EVELYN_FROM_EMAIL_FALLBACK;
  const fromName = persona.fromName || EVELYN_FROM_NAME_FALLBACK;
  const avatarRel = persona.avatarUrl || EVELYN_AVATAR_FALLBACK;
  const avatarUrl = avatarRel.startsWith('http')
    ? avatarRel
    : `${BASE_URL}${avatarRel}`;

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    processed++;
    try {
      const outcome = await processSingleRow(row, now, {
        personaId: persona.id,
        fromEmail,
        fromName,
        avatarUrl,
      });
      if (outcome === 'sent') sent++;
      else if (outcome === 'skipped') skipped++;
      else failed++;
    } catch (error) {
      failed++;
      logger.error('[EvelynFollowup] Error processing row', {
        rowId: row.id,
        error: (error as Error).message,
      });
      await markFailed(row.id, (error as Error).message || 'unknown');
    }
  }

  logger.info('[EvelynFollowup] Batch complete', {
    processed,
    sent,
    skipped,
    failed,
  });
  return { flagEnabled: true, processed, sent, skipped, failed };
}

// ============================================================
// processSingleRow — all send-time skip checks + Resend call
// ============================================================

async function processSingleRow(
  row: typeof evelynFollowupEmails.$inferSelect,
  now: Date,
  personaCtx: {
    personaId: string;
    fromEmail: string;
    fromName: string;
    avatarUrl: string;
  },
): Promise<'sent' | 'skipped' | 'failed'> {
  // (1) Fresh user lookup
  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified,
      accountStatus: users.accountStatus,
    })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);

  const user = userRows[0];
  if (!user) {
    await markSkipped(row.id, 'user_not_found');
    return 'skipped';
  }

  // User verified between schedule and now → cascade-skip THIS and any later-pending rows.
  if (user.emailVerified) {
    await db
      .update(evelynFollowupEmails)
      .set({ status: 'skipped', errorMessage: 'user_verified', updatedAt: new Date() })
      .where(
        and(
          eq(evelynFollowupEmails.userId, row.userId),
          eq(evelynFollowupEmails.sequenceType, 'unverified'),
          eq(evelynFollowupEmails.status, 'pending'),
        ),
      );
    return 'skipped';
  }

  if (user.accountStatus !== 'active') {
    await markSkipped(row.id, `account_${user.accountStatus}`);
    return 'skipped';
  }

  // Email changed since schedule → drip stops (the content no longer applies).
  if (row.recipientEmail.toLowerCase() !== user.email.toLowerCase()) {
    await db
      .update(evelynFollowupEmails)
      .set({ status: 'skipped', errorMessage: 'email_changed', updatedAt: new Date() })
      .where(
        and(
          eq(evelynFollowupEmails.userId, row.userId),
          eq(evelynFollowupEmails.sequenceType, 'unverified'),
          eq(evelynFollowupEmails.status, 'pending'),
        ),
      );
    return 'skipped';
  }

  // (2) Unsubscribe
  const prefs = await db
    .select({
      unsubscribedAt: userFollowUpPreferences.unsubscribedAt,
      enableFollowUps: userFollowUpPreferences.enableFollowUps,
    })
    .from(userFollowUpPreferences)
    .where(eq(userFollowUpPreferences.userId, user.id))
    .limit(1);

  if (
    prefs[0] &&
    (prefs[0].unsubscribedAt !== null || prefs[0].enableFollowUps === false)
  ) {
    await db
      .update(evelynFollowupEmails)
      .set({ status: 'skipped', errorMessage: 'unsubscribed', updatedAt: new Date() })
      .where(
        and(
          eq(evelynFollowupEmails.userId, row.userId),
          eq(evelynFollowupEmails.sequenceType, 'unverified'),
          eq(evelynFollowupEmails.status, 'pending'),
        ),
      );
    return 'skipped';
  }

  // (3) Stale window — if we're too late, skip.
  const ageMs = now.getTime() - row.scheduledFor.getTime();
  const seq = row.sequenceNumber as 1 | 2 | 3;
  if (STALE_MS[seq] && ageMs > STALE_MS[seq]) {
    await markSkipped(row.id, 'stale');
    return 'skipped';
  }

  // (4) Build CTA: magic-link auto-logs and lands on Evelyn chat.
  const magicToken = await generateMagicLinkToken(
    user.id,
    personaCtx.personaId,
    EVELYN_SLUG,
  );
  const ctaUrl = `${BASE_URL}/magic-auth?t=${magicToken}&redirect=/reading?persona=${EVELYN_SLUG}`;
  const unsubscribeUrl = `${BASE_URL}/api/webhooks/unsubscribe?token=${row.unsubscribeToken}`;

  // (5) Render final HTML/text via shared email template
  const fullHtml = buildFollowUpHtml({
    personaName: personaCtx.fromName,
    emailBody: row.bodyHtml,
    ctaUrl,
    ctaText: 'Confirm Your Email',
    unsubscribeUrl,
    privacyUrl: `${BASE_URL}/privacy`,
    avatarUrl: personaCtx.avatarUrl,
  });
  const fullText = buildFollowUpText({
    personaName: personaCtx.fromName,
    emailBody: row.bodyText,
    ctaUrl,
    unsubscribeUrl,
  });

  // (6) Send
  if (!resend) {
    await markFailed(row.id, 'resend_not_configured');
    return 'failed';
  }

  try {
    const result = await fireWithBreaker(resendBreaker, () =>
      resend!.emails.send({
        from: `${personaCtx.fromName} <${personaCtx.fromEmail}>`,
        to: row.recipientEmail,
        replyTo: personaCtx.fromEmail,
        subject: row.subject,
        html: fullHtml,
        text: fullText,
        tags: [
          { name: 'type',     value: 'evelyn_followup' },
          { name: 'sequence', value: String(row.sequenceNumber) },
          { name: 'user_id',  value: user.id },
        ],
      }),
    );

    if (result.error) {
      await markFailed(row.id, result.error.message || 'resend_error');
      return 'failed';
    }

    await db
      .update(evelynFollowupEmails)
      .set({
        status: 'sent',
        sentAt: new Date(),
        resendEmailId: result.data?.id || null,
        bodyHtml: fullHtml,
        bodyText: fullText,
        attemptCount: sql`attempt_count + 1`,
        updatedAt: new Date(),
      })
      .where(eq(evelynFollowupEmails.id, row.id));

    return 'sent';
  } catch (error) {
    await markFailed(row.id, (error as Error).message || 'send_exception');
    return 'failed';
  }
}

async function markSkipped(rowId: string, reason: string): Promise<void> {
  await db
    .update(evelynFollowupEmails)
    .set({
      status: 'skipped',
      errorMessage: reason.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(eq(evelynFollowupEmails.id, rowId));
}

async function markFailed(rowId: string, reason: string): Promise<void> {
  await db
    .update(evelynFollowupEmails)
    .set({
      status: 'failed',
      errorMessage: reason.slice(0, 500),
      attemptCount: sql`attempt_count + 1`,
      updatedAt: new Date(),
    })
    .where(eq(evelynFollowupEmails.id, rowId));
}

// ============================================================
// lookupEvelynBucket — helper exposed for the verified drip generator
// to share the same evelyn_lander_sessions lookup logic.
// Returns the bucket string ('love' | 'money' | 'purpose' | 'specific')
// or null if no lander session exists for this user.
// ============================================================

export async function lookupEvelynBucket(userId: string): Promise<string | null> {
  try {
    const rows = await db
      .select({ bucket: evelynLanderSessions.bucket })
      .from(evelynLanderSessions)
      .where(eq(evelynLanderSessions.resolvedUserId, userId))
      .orderBy(desc(evelynLanderSessions.startedAt))
      .limit(1);
    return rows[0]?.bucket ?? null;
  } catch {
    return null;
  }
}
