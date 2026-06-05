// Promo Wallet: per-persona promotional coin pots (e.g. the 6/6 launch promo).
//
// A promo grant is a separate pot the billing path spends BEFORE the user's real
// `users.coin_balance`, scoped to a single persona, that expires after the campaign
// window. The user's real balance is never touched by the grant itself.
//
// Design notes:
//   - "Spend promo first": every deduction tries the active promo grant for that
//     persona, then falls back to the real balance for the remainder.
//   - "Refund real first": when a session over-billed and we refund, we give back the
//     real-balance portion first, then the promo portion — the reverse of spend order —
//     so the user's real coins are always made whole before promo coins.
//   - The spend/refund SPLIT math is pure (no DB) so it can be unit-tested directly.
//   - The DB helpers take the active transaction (`tx`) and MUST run inside the same
//     transaction as the rest of the billing write, so the deduction is atomic.
//   - Lock ordering is ALWAYS promo_grants then users — consistent across every call
//     site — to avoid deadlocks with the existing FOR UPDATE on users.

import { db } from './db';
import { sql } from 'drizzle-orm';

// Minimal shape of the thing we run SQL against — both `db` and a Drizzle `tx`
// expose `.execute()`, so either can be passed in.
export interface SqlExecutor {
  execute: (query: any) => Promise<{ rows: any[] }>;
}

export interface SpendSplit {
  fromPromo: number;
  fromReal: number;
  total: number;
}

export interface RefundSplit {
  toPromo: number;
  toReal: number;
}

/**
 * Pure: given how many coins we WANT to deduct and what's available in the promo pot
 * and the real balance, decide how much comes from each. Promo is spent first.
 * Never returns more than is actually available (caller may have less than `wanted`).
 */
export function computeSpendSplit(
  wanted: number,
  promoRemaining: number,
  realBalance: number,
): SpendSplit {
  const want = Math.max(0, wanted);
  const fromPromo = Math.min(want, Math.max(0, promoRemaining));
  const fromReal = Math.min(want - fromPromo, Math.max(0, realBalance));
  return { fromPromo, fromReal, total: fromPromo + fromReal };
}

/**
 * Pure: given a refund amount and how this session's charge was split between promo
 * and real, decide how much to return to each. Real is refunded first (reverse of
 * spend order) so real coins are restored before promo coins.
 */
export function computeRefundSplit(
  refund: number,
  promoCharged: number,
  realCharged: number,
): RefundSplit {
  const amount = Math.max(0, refund);
  const toReal = Math.min(amount, Math.max(0, realCharged));
  const toPromo = Math.min(amount - toReal, Math.max(0, promoCharged));
  return { toPromo, toReal };
}

/**
 * Read-only: coins remaining in the user's active (non-expired) promo grant for a
 * persona. Sums across grants in case more than one campaign is live. Best-effort:
 * returns 0 on any error so promo can never block normal balance checks.
 */
export async function getPromoBalance(userId: string, personaId: string): Promise<number> {
  try {
    const res = await db.execute(
      sql`SELECT COALESCE(SUM(coins_remaining), 0)::int AS coins
          FROM promo_grants
          WHERE user_id = ${userId}
            AND persona_id = ${personaId}
            AND coins_remaining > 0
            AND expires_at > (NOW() AT TIME ZONE 'UTC')`
    );
    return Number((res.rows[0] as any)?.coins ?? 0);
  } catch {
    return 0;
  }
}

/**
 * Read-only: total coins the user can actually spend in a chat with THIS persona =
 * real balance + active promo for the persona. This is the number shown as the in-chat
 * "remaining coins" countdown, since a session spends promo-first then real. Best-effort:
 * falls back to just the real balance if the promo read fails.
 */
export async function getSpendableCoins(userId: string, personaId: string, realBalance: number): Promise<number> {
  const promo = await getPromoBalance(userId, personaId);
  return Math.max(0, realBalance) + promo;
}

/**
 * Read-only: per-persona promo balances for a user, keyed by personaId. Used by the
 * personas/cards endpoint to show "6:00 free with [guide]". Best-effort → {} on error.
 */
export async function getPromoBalancesByPersona(userId: string): Promise<Record<string, number>> {
  try {
    const res = await db.execute(
      sql`SELECT persona_id, COALESCE(SUM(coins_remaining), 0)::int AS coins
          FROM promo_grants
          WHERE user_id = ${userId}
            AND coins_remaining > 0
            AND expires_at > (NOW() AT TIME ZONE 'UTC')
          GROUP BY persona_id`
    );
    const out: Record<string, number> = {};
    for (const r of res.rows as Array<{ persona_id: string; coins: number }>) {
      out[r.persona_id] = Number(r.coins);
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Spend `wanted` coins, promo-first then real balance, inside the given transaction.
 *
 * Locks the active promo grant (FOR UPDATE) and the user row (FOR UPDATE) in that
 * order. Decrements promo_grants.coins_remaining first, then users.coin_balance for
 * the remainder. `total_coins_used` only counts REAL coins (promo spend is tracked on
 * the grant via coins_spent), so lifetime "paid usage" metrics stay accurate.
 *
 * Returns the actual split — caller records `total` as coins_charged and `fromPromo`
 * as promo_coins_charged on the session.
 */
export async function spendCoins(
  tx: SqlExecutor,
  userId: string,
  personaId: string,
  wanted: number,
): Promise<SpendSplit> {
  const want = Math.max(0, wanted);
  if (want === 0) return { fromPromo: 0, fromReal: 0, total: 0 };

  // 1. Lock the most-recently-expiring active promo grant for this persona.
  const grantRes = await tx.execute(
    sql`SELECT id, coins_remaining
        FROM promo_grants
        WHERE user_id = ${userId}
          AND persona_id = ${personaId}
          AND coins_remaining > 0
          AND expires_at > (NOW() AT TIME ZONE 'UTC')
        ORDER BY expires_at ASC
        LIMIT 1
        FOR UPDATE`
  );
  const grant = grantRes.rows[0] as { id: string; coins_remaining: number } | undefined;
  const promoRemaining = grant ? Number(grant.coins_remaining) : 0;

  // 2. Lock the user balance.
  const balRes = await tx.execute(
    sql`SELECT coin_balance FROM users WHERE id = ${userId} FOR UPDATE`
  );
  const realBalance = Number((balRes.rows[0] as any)?.coin_balance ?? 0);

  const split = computeSpendSplit(want, promoRemaining, realBalance);

  if (split.fromPromo > 0 && grant) {
    await tx.execute(
      sql`UPDATE promo_grants SET
            coins_remaining = coins_remaining - ${split.fromPromo},
            coins_spent = coins_spent + ${split.fromPromo},
            updated_at = (NOW() AT TIME ZONE 'UTC')
          WHERE id = ${grant.id}`
    );
  }

  if (split.fromReal > 0) {
    await tx.execute(
      sql`UPDATE users SET
            coin_balance = coin_balance - ${split.fromReal},
            total_coins_used = total_coins_used + ${split.fromReal},
            updated_at = (NOW() AT TIME ZONE 'UTC')
          WHERE id = ${userId}`
    );
  }

  return split;
}

/**
 * Refund `refund` coins for a session that over-billed, real-first then promo, inside
 * the given transaction. `promoCharged`/`realCharged` are this session's charged split
 * (realCharged = coins_charged - promo_coins_charged). Returns the actual split applied
 * so the caller can adjust the session's promo_coins_charged.
 *
 * Promo is refunded into the most-recently-expiring grant for the persona (active if
 * possible, else the latest one) — refunding into an expired pot is harmless and keeps
 * coins_charged accounting consistent.
 */
export async function refundCoins(
  tx: SqlExecutor,
  userId: string,
  personaId: string,
  refund: number,
  promoCharged: number,
  realCharged: number,
): Promise<RefundSplit> {
  const split = computeRefundSplit(refund, promoCharged, realCharged);

  if (split.toReal > 0) {
    await tx.execute(
      sql`UPDATE users SET
            coin_balance = coin_balance + ${split.toReal},
            total_coins_used = GREATEST(0, total_coins_used - ${split.toReal}),
            updated_at = (NOW() AT TIME ZONE 'UTC')
          WHERE id = ${userId}`
    );
  }

  if (split.toPromo > 0) {
    // Prefer an active grant; fall back to the latest grant for this persona.
    const grantRes = await tx.execute(
      sql`SELECT id FROM promo_grants
          WHERE user_id = ${userId} AND persona_id = ${personaId}
          ORDER BY (expires_at > (NOW() AT TIME ZONE 'UTC')) DESC, expires_at DESC
          LIMIT 1
          FOR UPDATE`
    );
    const grant = grantRes.rows[0] as { id: string } | undefined;
    if (grant) {
      await tx.execute(
        sql`UPDATE promo_grants SET
              coins_remaining = coins_remaining + ${split.toPromo},
              coins_spent = GREATEST(0, coins_spent - ${split.toPromo}),
              updated_at = (NOW() AT TIME ZONE 'UTC')
            WHERE id = ${grant.id}`
      );
    } else {
      // No grant to refund into (deleted?) — return the promo portion to real balance
      // so the user is never short-changed.
      await tx.execute(
        sql`UPDATE users SET
              coin_balance = coin_balance + ${split.toPromo},
              updated_at = (NOW() AT TIME ZONE 'UTC')
            WHERE id = ${userId}`
      );
    }
  }

  return split;
}

/**
 * Self-heal "promo-first" at session finalization.
 *
 * If a session ended up charging REAL coins (`realCharged`) while the persona STILL has
 * unspent promo, this moves that over-charge from the real balance back into the promo
 * pot: it debits the active promo grant and refunds the same amount to `coin_balance`.
 * The TOTAL charged for the session is unchanged — this is pure re-bucketing of the
 * user's own coins so the (June-6-expiring) promo is always consumed before real coins,
 * even if an upstream race billed real early.
 *
 * SCOPED + SAFE: a no-op (`returns 0`) whenever there is no active promo grant with
 * coins remaining for this persona — i.e. it never touches a normal/non-promo user's
 * billing. Locks promo_grants then users (same order as spendCoins) to avoid deadlocks.
 * `total_coins_used` is decremented by the moved amount (it only ever counts real spend),
 * mirroring how spendCoins increments it for the real portion.
 *
 * Returns the number of coins moved real→promo (0 if nothing to do).
 */
export async function reconcilePromoFirst(
  tx: SqlExecutor,
  userId: string,
  personaId: string,
  realCharged: number,
): Promise<number> {
  if (!(realCharged > 0)) return 0;

  // Same active-grant selection as spendCoins (sooner-expiring first).
  const grantRes = await tx.execute(
    sql`SELECT id, coins_remaining
        FROM promo_grants
        WHERE user_id = ${userId}
          AND persona_id = ${personaId}
          AND coins_remaining > 0
          AND expires_at > (NOW() AT TIME ZONE 'UTC')
        ORDER BY expires_at ASC
        LIMIT 1
        FOR UPDATE`
  );
  const grant = grantRes.rows[0] as { id: string; coins_remaining: number } | undefined;
  if (!grant) return 0; // no promo to move into → non-promo billing untouched

  const move = Math.min(realCharged, Math.max(0, Number(grant.coins_remaining)));
  if (move <= 0) return 0;

  // Debit promo, refund the same amount to the real balance.
  await tx.execute(
    sql`UPDATE promo_grants SET
          coins_remaining = coins_remaining - ${move},
          coins_spent = coins_spent + ${move},
          updated_at = (NOW() AT TIME ZONE 'UTC')
        WHERE id = ${grant.id}`
  );
  await tx.execute(
    sql`UPDATE users SET
          coin_balance = coin_balance + ${move},
          total_coins_used = GREATEST(0, total_coins_used - ${move}),
          updated_at = (NOW() AT TIME ZONE 'UTC')
        WHERE id = ${userId}`
  );

  return move;
}
