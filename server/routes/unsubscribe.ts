// Public unsubscribe endpoint for partner emails (CAN-SPAM compliance).
//
// Two-step flow:
//   GET  /unsubscribe?email=...&src=... → renders a confirmation page. NO DB WRITE.
//   POST /unsubscribe (from the form)   → inserts into email_suppression AND,
//                                         if the email matches a known Seer Within
//                                         user, flips userFollowUpPreferences so the
//                                         drips (Aiden unverified, Aiden verified,
//                                         persona follow-ups, top-ups, migration)
//                                         also stop for that user at their next cron.
//
// Why two-step: Gmail / Outlook / Apple Mail link-prefetchers routinely GET every
// URL in an email to generate previews. A plain GET-based unsubscribe would
// unsub everyone who just received the email. The confirmation button blocks
// that while keeping the partner-facing URL a single unsigned template.

import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { emailSuppression, users, userFollowUpPreferences } from '@shared/schema';
import logger from '../lib/logger';

const router = Router();

// Keep the permitted source values tight so we don't end up with typo'd values
// polluting the reports column ('gpb', 'gpbl ', 'GPBL', etc).
const KNOWN_SOURCES = new Set([
  'gpbl',
  'theseerwithin',
  'resend',
  'aweber_import',
  'other',
]);
const DEFAULT_PARTNER_SOURCE = 'partner_unsub';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function normalizeEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.toLowerCase().trim() : '';
}

function normalizeSource(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.toLowerCase().trim() : '';
  if (!s) return DEFAULT_PARTNER_SOURCE;
  if (KNOWN_SOURCES.has(s)) return s;
  // Preserve arbitrary partner identifiers but clamp length so we can't get
  // a pathological value stuck into the column.
  return s.slice(0, 40).replace(/[^a-z0-9_\-]/g, '') || DEFAULT_PARTNER_SOURCE;
}

// ============================================================
// Step 1: GET /unsubscribe — render confirmation page, no DB write
// ============================================================

router.get('/unsubscribe', (req: Request, res: Response) => {
  const email = normalizeEmail(req.query.email);
  const src = normalizeSource(req.query.src);

  if (!email || !isValidEmail(email)) {
    return res.status(400).send(renderInvalidPage());
  }

  return res.status(200).send(renderConfirmPage(email, src));
});

// ============================================================
// Step 2: POST /unsubscribe — actually suppress + stop our emails
// ============================================================

router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email ?? req.query.email);
    const src = normalizeSource(req.body?.src ?? req.query.src);

    if (!email || !isValidEmail(email)) {
      return res.status(400).send(renderInvalidPage());
    }

    // If this email matches a Seer Within user, link the suppression row to
    // their userId and flip their userFollowUpPreferences so our own drips
    // also stop sending. If there's no matching user (pure partner-list
    // recipient), we still suppress at the email level.
    const userRow = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const matchedUserId = userRow[0]?.id ?? null;

    // (1) Central suppression table — ON CONFLICT DO NOTHING via Drizzle's
    // onConflictDoNothing so a second click on the same email is idempotent.
    await db
      .insert(emailSuppression)
      .values({
        email,
        reason: 'user_unsubscribed',
        source: src,
        userId: matchedUserId,
      })
      .onConflictDoNothing();

    // (2) If it's one of our users, also flip the follow-up preferences so
    // every persona drip (Aiden verified + unverified, follow-ups, top-ups,
    // migration) cascade-skips them at the next cron tick. Wrapped in its
    // own try so a preferences failure can't roll back the main suppression.
    if (matchedUserId) {
      try {
        const existing = await db
          .select({ userId: userFollowUpPreferences.userId })
          .from(userFollowUpPreferences)
          .where(eq(userFollowUpPreferences.userId, matchedUserId))
          .limit(1);

        if (existing[0]) {
          await db
            .update(userFollowUpPreferences)
            .set({
              enableFollowUps: false,
              unsubscribedAt: new Date(),
              unsubscribeReason: `partner_unsub:${src}`.slice(0, 100),
              updatedAt: new Date(),
            })
            .where(eq(userFollowUpPreferences.userId, matchedUserId));
        } else {
          await db.insert(userFollowUpPreferences).values({
            userId: matchedUserId,
            enableFollowUps: false,
            unsubscribedAt: new Date(),
            unsubscribeReason: `partner_unsub:${src}`.slice(0, 100),
          });
        }
      } catch (prefsError) {
        logger.warn('[suppression] Preferences update failed (suppression still recorded)', {
          userId: matchedUserId,
          error: (prefsError as Error).message,
        });
      }
    }

    logger.info('[suppression] Unsubscribed via public endpoint', {
      email,
      src,
      matchedUser: Boolean(matchedUserId),
    });

    return res.status(200).send(renderSuccessPage(email));
  } catch (error) {
    logger.error('[suppression] Public unsubscribe error:', error);
    return res.status(500).send(renderErrorPage());
  }
});

export default router;

// ============================================================
// Branded HTML pages — same cosmic/purple palette as the existing
// unsubscribePageHtml() in server/routes/webhooks.ts for visual consistency.
// ============================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pageShell(title: string, statusColor: string, statusLabel: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
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
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.35);
    }
    .status {
      font-size: 18px;
      color: ${statusColor};
      margin-bottom: 16px;
      letter-spacing: 0.02em;
    }
    .message {
      font-size: 16px;
      line-height: 1.6;
      color: #c0b0d8;
      margin-bottom: 24px;
    }
    .email {
      font-family: 'SF Mono', Menlo, monospace;
      background-color: rgba(255, 255, 255, 0.06);
      padding: 4px 10px;
      border-radius: 4px;
      color: #f5ecff;
      font-size: 14px;
    }
    button.confirm {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 16px;
      background-color: #6d28d9;
      color: #ffffff;
      border: 0;
      border-radius: 8px;
      padding: 14px 32px;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    button.confirm:hover { background-color: #7c3aed; }
    p.note {
      font-size: 13px;
      color: #8b7fa5;
      margin-top: 24px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="status">${escapeHtml(statusLabel)}</div>
    ${bodyHtml}
  </div>
</body>
</html>`;
}

function renderConfirmPage(email: string, src: string): string {
  const body = `
    <div class="message">
      You are about to unsubscribe <span class="email">${escapeHtml(email)}</span>
      from The Seer Within emails.
    </div>
    <form method="POST" action="/unsubscribe">
      <input type="hidden" name="email" value="${escapeHtml(email)}">
      <input type="hidden" name="src" value="${escapeHtml(src)}">
      <button type="submit" class="confirm">Confirm Unsubscribe</button>
    </form>
    <p class="note">Click the button to confirm. This prevents automated link
    previews from accidentally unsubscribing you.</p>`;
  return pageShell('Unsubscribe', '#c4b5fd', 'Confirm', body);
}

function renderSuccessPage(email: string): string {
  const body = `
    <div class="message">
      <span class="email">${escapeHtml(email)}</span> has been unsubscribed.
      You will no longer receive emails from The Seer Within.
    </div>
    <p class="note">If this was a mistake, you can re-subscribe by signing in
    to your account.</p>`;
  return pageShell('Unsubscribed', '#4ade80', 'Unsubscribed', body);
}

function renderInvalidPage(): string {
  const body = `
    <div class="message">
      This unsubscribe link is invalid or missing the required email parameter.
    </div>`;
  return pageShell('Invalid Link', '#f87171', 'Invalid Link', body);
}

function renderErrorPage(): string {
  const body = `
    <div class="message">
      Something went wrong processing your request. Please try again in a moment.
    </div>`;
  return pageShell('Error', '#f87171', 'Error', body);
}
