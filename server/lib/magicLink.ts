// Magic Link Tokens: one-click re-engagement login for follow-up emails.
//
// Flow:
//   1. generateMagicLinkToken() → stores a DB row, returns the raw token
//   2. Email CTA: https://theseerwithin.com/magic-auth?t=<token>
//   3. Frontend MagicAuthPage calls POST /api/auth/magic-verify { token }
//   4. verifyMagicLinkToken() → looks up row, checks expiry, marks usedAt
//   5. Server issues a normal JWT → frontend stores in localStorage

import { randomBytes } from 'crypto';
import { db } from './db';
import { magicLinkTokens, users } from '@shared/schema';
import { eq, and, gt, lt } from 'drizzle-orm';
import logger from './logger';

/**
 * How long a minted magic link stays clickable. Exported because it is also the
 * outer bound on how long the Live Thread flow can still be in progress for a
 * reader — server/lib/liveThreadReplay.ts reuses it as its freshness window so
 * the two can never drift apart. Shortening this shortens that window too, which
 * is the intended coupling: a parked reply should outlive every link that can
 * still deliver its owner into the chat, and not a day longer.
 */
export const MAGIC_LINK_EXPIRY_DAYS = 30;

/**
 * Generate a magic link token for a user/persona pair and persist it.
 * Returns the raw token string (to embed in the email CTA URL).
 */
export async function generateMagicLinkToken(
  userId: string,
  personaId: string,
  personaSlug: string,
): Promise<string> {
  const token = randomBytes(32).toString('hex'); // 64-char hex, unguessable

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + MAGIC_LINK_EXPIRY_DAYS);

  await db.insert(magicLinkTokens).values({
    token,
    userId,
    personaId,
    personaSlug,
    expiresAt,
  });

  logger.info('Magic link token generated', { userId, personaSlug });
  return token;
}

/**
 * Verify a magic link token.
 * Returns the userId and personaSlug if valid; null otherwise.
 * Marks the token as used (usedAt = now) on first verification.
 */
export async function verifyMagicLinkToken(
  token: string,
): Promise<{ userId: string; personaSlug: string } | null> {
  const now = new Date();

  const rows = await db
    .select()
    .from(magicLinkTokens)
    .where(
      and(
        eq(magicLinkTokens.token, token),
        gt(magicLinkTokens.expiresAt, now), // not expired
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    logger.warn('Magic link verification failed: token not found or expired');
    return null;
  }

  // Verify the user still exists and is active
  const userRows = await db
    .select({ id: users.id, accountStatus: users.accountStatus })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);

  if (!userRows[0] || userRows[0].accountStatus !== 'active') {
    logger.warn('Magic link verification failed: user inactive or not found', {
      userId: row.userId,
    });
    return null;
  }

  // Mark as used (but don't invalidate — 30-day window, re-clickable)
  if (!row.usedAt) {
    await db
      .update(magicLinkTokens)
      .set({ usedAt: now })
      .where(eq(magicLinkTokens.id, row.id));
  }

  return { userId: row.userId, personaSlug: row.personaSlug };
}

/**
 * Clean up expired magic link tokens (call from a cron or on-demand).
 */
export async function cleanupExpiredMagicLinks(): Promise<void> {
  const now = new Date();
  await db.delete(magicLinkTokens).where(lt(magicLinkTokens.expiresAt, now));
  logger.info('Magic link: expired tokens cleaned up');
}
