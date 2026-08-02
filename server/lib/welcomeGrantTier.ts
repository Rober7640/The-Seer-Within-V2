// Which welcome-grant tier a user falls into at verification time.
//
// WHY THIS EXISTS. The tier decision is read by two kinds of caller that must never
// disagree:
//   - the GRANT — /verify-email and /magic-verify (server/routes/auth.ts), which turn
//     the tier into coins;
//   - the QUOTE — /api/evelyn-lander/check-email (server/routes/evelynLander.ts), which
//     turns it into the free-minutes number printed in the verification email.
// They used to derive it independently, and that drifted the moment the tiers stopped
// agreeing numerically: /check-email checked only "is there a linked Evelyn session?"
// while the grant chain checked soulmate FIRST. A /soulmate signup is created
// unverified with defaultPersonaId=evelyn-cross and a linked soulmate row
// (soulmateLanderSignup.ts:129-149), so that reader could satisfy the Evelyn Live
// Thread conditions, be quoted 10, and then be granted 5 by the soulmate branch.
// One ordered chain, read by both, is what stops that recurring.
//
// ORDER IS THE CONTRACT. The sequence below is the tier precedence. Changing it
// changes what real users receive, so it is expressed exactly once:
//
//   1. luna-thankyou   — the $50/30-min gift is granted SEPARATELY and additively by
//                        claimLunaTyGift(), so the ordinary welcome grant is skipped
//                        entirely (0) to avoid stacking a second small grant on top.
//   2. soulmate-lander — 5 min. Checked before the Evelyn tiers so a reader linked to
//                        both (they hit both landers with the same email pre-verify)
//                        resolves to exactly one tier, deterministically.
//   3. live-thread     — 10 min. A STRICT SUBSET of evelyn-lander: same persona check,
//                        same linked-row requirement, plus "one of those rows carries a
//                        pending_reply". So it can only ever displace the 5 below it —
//                        never the 3, the soulmate 5, or the Luna 0.
//   4. evelyn-lander   — 5 min.
//   5. persona-default — the persona's own personas.free_coins (3 min at the default
//                        rate). The only tier whose amount lives in the DB rather than
//                        in a constant, which is why this module returns a tier rather
//                        than a number: the caller still has to resolve that one.
//
// Every lookup silent-fails to false, so a DB hiccup degrades a reader to a LOWER tier
// rather than blocking verification. Under-granting is the safe direction to be wrong in.

import { and, eq } from 'drizzle-orm';
import { db } from './db';
import { evelynLanderSessions, personas, soulmateLanderSessions } from '@shared/schema';
import { isFromLunaThankyouOffer } from './lunaThankyouGift';
import { userHasLiveThreadReply } from './liveThreadEngagement';
import logger from './logger';

export type WelcomeGrantTier =
  | 'luna-thankyou'
  | 'soulmate-lander'
  | 'live-thread'
  | 'evelyn-lander'
  | 'persona-default';

/**
 * Is Evelyn this user's default persona? Also used by the drip-enrolment checks in
 * auth.ts, which is why it is exported rather than kept private here.
 * Silent-fails to false so a DB hiccup can never block verification.
 */
export async function isEvelynUser(personaId: string | null | undefined): Promise<boolean> {
  if (!personaId) return false;
  try {
    const row = await db
      .select({ slug: personas.slug })
      .from(personas)
      .where(eq(personas.id, personaId))
      .limit(1);
    return row[0]?.slug === 'evelyn-cross';
  } catch {
    return false;
  }
}

/** Any evelyn_lander_sessions row stamped with this user id. Existence, not recency. */
async function hasEvelynLanderLink(userId: string): Promise<boolean> {
  try {
    const row = await db
      .select({ id: evelynLanderSessions.id })
      .from(evelynLanderSessions)
      .where(eq(evelynLanderSessions.resolvedUserId, userId))
      .limit(1);
    return !!row[0];
  } catch (error: any) {
    logger.warn('welcome-tier: evelyn lander link lookup failed', { error: error?.message });
    return false;
  }
}

/** Any soulmate_lander_sessions row stamped with this user id. */
async function hasSoulmateLanderLink(userId: string): Promise<boolean> {
  try {
    const row = await db
      .select({ id: soulmateLanderSessions.id })
      .from(soulmateLanderSessions)
      .where(eq(soulmateLanderSessions.resolvedUserId, userId))
      .limit(1);
    return !!row[0];
  } catch (error: any) {
    logger.warn('welcome-tier: soulmate lander link lookup failed', { error: error?.message });
    return false;
  }
}

/**
 * Resolve the single tier this user's welcome grant falls into. See the header for the
 * precedence contract — callers must NOT re-order or re-derive it.
 */
export async function resolveWelcomeGrantTier(
  userId: string,
  defaultPersonaId: string | null | undefined,
): Promise<WelcomeGrantTier> {
  if (await isFromLunaThankyouOffer(userId)) return 'luna-thankyou';

  // Both remaining lander tiers require Evelyn as the default persona, so this one
  // check gates all three of them.
  const evelynUser = await isEvelynUser(defaultPersonaId);
  if (!evelynUser) return 'persona-default';

  if (await hasSoulmateLanderLink(userId)) return 'soulmate-lander';
  if (!(await hasEvelynLanderLink(userId))) return 'persona-default';

  return (await userHasLiveThreadReply(userId)) ? 'live-thread' : 'evelyn-lander';
}
