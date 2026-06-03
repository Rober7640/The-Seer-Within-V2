// Promo campaign config + claim logic for the 6/6 launch ("6 free minutes with every
// guide"). Grant happens ON ARRIVAL at /6-6 (not pre-seeded), gated to non-buyers, once
// per user, expiring at the campaign end. Reusable for future campaigns by editing the
// ACTIVE_PROMO_CAMPAIGN config (or swapping which campaign is active).

import { db } from './db';
import { personas, creditPurchases, promoGrants } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import logger from './logger';

export interface PromoCampaign {
  tag: string;
  coinsPerPersona: number;   // 360 = 6 min @ 60 coins/min
  /** Hard expiry for granted coins AND the claim window. Past this, claims are refused
   *  and any granted coins are ignored by the billing path (expires_at filter). */
  expiresAt: Date;
  /** Optional earliest claim time. null = claimable any time before expiry (the email
   *  send timing controls the real start). */
  startsAt: Date | null;
}

// 6/6 promo: ends end-of-day June 6 2026 in America/New_York (the app's cron timezone).
// EDT is UTC-4, so midnight June 7 ET = 2026-06-07T04:00:00Z.
export const ACTIVE_PROMO_CAMPAIGN: PromoCampaign = {
  tag: 'promo-6-6',
  coinsPerPersona: 360,
  expiresAt: new Date('2026-06-07T04:00:00Z'),
  startsAt: null,
};

export function isCampaignClaimable(campaign: PromoCampaign, now: Date): boolean {
  if (now >= campaign.expiresAt) return false;
  if (campaign.startsAt && now < campaign.startsAt) return false;
  return true;
}

/** True if the user has ever completed a credit purchase (i.e. a "customer"/buyer). */
export async function isBuyer(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: creditPurchases.id })
    .from(creditPurchases)
    .where(and(eq(creditPurchases.userId, userId), eq(creditPurchases.status, 'completed')))
    .limit(1);
  return rows.length > 0;
}

export type ClaimResult =
  | { claimed: true; alreadyHad: boolean; grantedPersonas: number }
  | { claimed: false; reason: 'inactive' | 'not_eligible' };

/**
 * Claim the active promo for a user (called when they arrive on /6-6 logged in).
 * - Refuses if the campaign isn't currently claimable.
 * - Refuses buyers (customers) — they never get the promo, even via a shared link.
 * - Idempotent: if the user already has this campaign's grants, returns them unchanged.
 * - Otherwise grants `coinsPerPersona` for EVERY active persona, expiring at campaign end.
 */
export async function claimPromoForUser(
  userId: string,
  campaign: PromoCampaign = ACTIVE_PROMO_CAMPAIGN,
  now: Date = new Date(),
): Promise<ClaimResult> {
  if (!isCampaignClaimable(campaign, now)) {
    return { claimed: false, reason: 'inactive' };
  }

  if (await isBuyer(userId)) {
    logger.info('claimPromo: refused — user is a buyer', { userId, campaign: campaign.tag });
    return { claimed: false, reason: 'not_eligible' };
  }

  // Already claimed? (idempotent — re-visiting /6-6 never stacks more minutes)
  const existing = await db
    .select({ id: promoGrants.id })
    .from(promoGrants)
    .where(and(eq(promoGrants.userId, userId), eq(promoGrants.campaignTag, campaign.tag)))
    .limit(1);
  if (existing.length > 0) {
    return { claimed: true, alreadyHad: true, grantedPersonas: 0 };
  }

  const activePersonas = await db
    .select({ id: personas.id })
    .from(personas)
    .where(eq(personas.isActive, true));

  let granted = 0;
  for (const p of activePersonas) {
    // ON CONFLICT DO NOTHING on the (user_id, persona_id, campaign_tag) unique index —
    // safe against concurrent double-claims (e.g. two tabs).
    const res = await db.execute(sql`
      INSERT INTO promo_grants (user_id, persona_id, campaign_tag, coins_granted, coins_remaining, expires_at)
      VALUES (${userId}, ${p.id}, ${campaign.tag}, ${campaign.coinsPerPersona}, ${campaign.coinsPerPersona}, ${campaign.expiresAt.toISOString()})
      ON CONFLICT (user_id, persona_id, campaign_tag) DO NOTHING
      RETURNING id`);
    if (res.rows.length > 0) granted++;
  }

  logger.info('claimPromo: granted', { userId, campaign: campaign.tag, grantedPersonas: granted });
  return { claimed: true, alreadyHad: false, grantedPersonas: granted };
}
