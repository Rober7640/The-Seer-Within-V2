// V1 thank-you → Luna $50 / 30-minute welcome gift.
//
// Background: V1 buyers are auto-migrated into V2 (see funnelMigration*.ts), so by the
// time they click the Luna offer on /success they usually ALREADY have a V2 account
// (email-verified, temp password they never set). That broke the original design, which
// only granted the 1,800 coins at email-verify (a step existing users skip) and pushed
// them into a "register" flow that errored with "email already exists".
//
// This module makes the gift work for EVERY account state:
//   - resolveLunaTyHandoff() — mints a magic-login token for existing buyers (so they
//     land logged-in, no register/password), or signals "sign up" for not-yet-migrated
//     buyers. Driven server-side from the Stripe purchase, never a client-supplied email.
//   - claimLunaTyGift() — grants the 1,800 coins to the user's GLOBAL balance exactly
//     once, called from every entry path (verify-email, magic-verify, lander /cta).
//
// Idempotency + race-safety: the promo_grants unique index (user_id, persona_id,
// campaign_tag) via ON CONFLICT DO NOTHING guarantees at-most-one grant per buyer, even
// across concurrent clicks / two tabs. The promo_grants row is used purely as a
// claim-stamp (coins_remaining = 0) — the coins live in the normal global balance and
// are spent by the normal charge system, NOT the promo-wallet spend-down path.

import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db } from './db';
import { users, personas, personaLanderSessions, promoGrants, conversations } from '@shared/schema';
import { generateMagicLinkToken } from './magicLink';
import logger from './logger';

export const LUNA_TY_CAMPAIGN = 'v1-ty-luna';
export const LUNA_TY_FREE_COINS = 1800; // 30 minutes
const LUNA_SLUG = 'luna-voss';
// The gift is a global balance with no wall-clock expiry (Joel's decision). promo_grants
// .expires_at is NOT NULL, so we stamp a far-future sentinel; combined with
// coins_remaining = 0 the promo-wallet billing path (WHERE coins_remaining > 0) ignores
// this row entirely — it exists only as a one-time "already claimed" marker.
const CLAIM_STAMP_EXPIRY = new Date('2100-01-01T00:00:00Z');

// Eligible when a lander session linked to this user carries the Luna thank-you campaign
// tag. Scoped to the luna-voss slug so the tag can't be replayed onto another persona's
// lander. Silent-fails to false so a DB hiccup can never block login/verification.
export async function isFromLunaThankyouOffer(userId: string): Promise<boolean> {
  try {
    const row = await db
      .select({ id: personaLanderSessions.id })
      .from(personaLanderSessions)
      .where(
        and(
          eq(personaLanderSessions.resolvedUserId, userId),
          eq(personaLanderSessions.personaSlug, LUNA_SLUG),
          eq(personaLanderSessions.campaign, LUNA_TY_CAMPAIGN),
        ),
      )
      .limit(1);
    return !!row[0];
  } catch {
    return false;
  }
}

// Purchase gate: the gift is for people who actually BOUGHT on V1. Without this, the
// bare shareable `?campaign=v1-ty-luna` link would mint 1,800 coins for any stranger who
// signs up through it. We require a purchased V1 conversation matching the user's email —
// the same "is a paid buyer" bar the V1→V2 migration uses (checkMigrationEligibility).
// NOTE: conversations.purchased is set optimistically at checkout-start (see the V1
// checkout bug), so a buyer who reached Stripe but abandoned would also pass. That closes
// the mass "shared link" leak (strangers have no conversation at all); tightening to a
// Stripe-verified `payment_status=paid` check is a follow-up if zero-tolerance is needed.
async function hasV1Purchase(userId: string): Promise<boolean> {
  try {
    const u = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
    const email = u[0]?.email;
    if (!email) return false;
    // Case-insensitive: conversation emails are stored with original casing, users.email
    // is lowercased — an exact match would wrongly deny a buyer whose email had capitals.
    const conv = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(sql`lower(${conversations.email}) = ${email.trim().toLowerCase()}`, eq(conversations.purchased, true)))
      .limit(1);
    return !!conv[0];
  } catch {
    return false;
  }
}

// Grant the 1,800-coin gift to the user's global balance exactly once. Returns the coins
// actually granted (0 if not eligible, no purchase, or already claimed). Never throws —
// swallows errors so it can be awaited from auth flows without risking a login/verify failure.
export async function claimLunaTyGift(userId: string): Promise<number> {
  try {
    if (!(await isFromLunaThankyouOffer(userId))) return 0;
    if (!(await hasV1Purchase(userId))) {
      logger.warn('Luna TY gift denied: no V1 purchase found for user', { userId });
      return 0;
    }

    const lunaRows = await db
      .select({ id: personas.id })
      .from(personas)
      .where(eq(personas.slug, LUNA_SLUG))
      .limit(1);
    const lunaPersonaId = lunaRows[0]?.id;
    if (!lunaPersonaId) {
      logger.error('Luna TY gift: luna-voss persona not found — cannot grant');
      return 0;
    }

    // Atomic claim: only the first insert wins; a repeat click conflicts on the unique
    // index and returns an empty array (no coins granted twice).
    const inserted = await db
      .insert(promoGrants)
      .values({
        userId,
        personaId: lunaPersonaId,
        campaignTag: LUNA_TY_CAMPAIGN,
        coinsGranted: LUNA_TY_FREE_COINS,
        coinsRemaining: 0, // claim-stamp only; coins go to the global balance below
        coinsSpent: 0,
        expiresAt: CLAIM_STAMP_EXPIRY,
      })
      .onConflictDoNothing()
      .returning({ id: promoGrants.id });

    if (inserted.length === 0) return 0; // already claimed

    // Bring the welcome balance UP TO exactly LUNA_TY_FREE_COINS (1,800) rather than
    // stacking the gift on top of the generic 180-coin free-minutes default that a
    // V1→V2-migrated buyer is already seeded with (see funnelMigration*.ts) — otherwise
    // the total reads 1,980. GREATEST tops a fresh/near-empty account up to 1,800 and is a
    // no-op for anyone already above it (e.g. they'd bought coins), so we never remove any.
    await db
      .update(users)
      .set({ coinBalance: sql`GREATEST(coin_balance, ${LUNA_TY_FREE_COINS})`, updatedAt: new Date() })
      .where(eq(users.id, userId));

    logger.info('Luna TY gift granted', { userId, coins: LUNA_TY_FREE_COINS });
    return LUNA_TY_FREE_COINS;
  } catch (err: any) {
    logger.error('Luna TY gift claim failed', { userId, err: err?.message });
    return 0;
  }
}

export type LunaTyHandoff =
  | { mode: 'login'; token: string }
  | { mode: 'signup'; email: string; firstName: string | null };

// Decide how a thank-you buyer enters the Luna lander. Existing active accounts get a
// magic-login token (land logged-in, no register/password); everyone else is told to
// sign up inline (their brand-new lander flow already links the session + grants at
// verify). Email comes from the server-verified Stripe purchase, never the client.
export async function resolveLunaTyHandoff(
  email: string,
  firstName: string | null,
): Promise<LunaTyHandoff> {
  const normalized = email.trim().toLowerCase();
  const userRows = await db
    .select({ id: users.id, accountStatus: users.accountStatus })
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);
  const user = userRows[0];

  if (user && user.accountStatus === 'active') {
    const lunaRows = await db
      .select({ id: personas.id, slug: personas.slug })
      .from(personas)
      .where(eq(personas.slug, LUNA_SLUG))
      .limit(1);
    if (lunaRows[0]) {
      const token = await generateMagicLinkToken(user.id, lunaRows[0].id, lunaRows[0].slug);
      return { mode: 'login', token };
    }
  }

  return { mode: 'signup', email: normalized, firstName };
}
