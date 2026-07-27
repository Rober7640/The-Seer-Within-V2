/**
 * The "minutes remaining" line injected into a persona prompt at [RUNTIME_CONTEXT].
 *
 * Extracted from chatEngine so it can be unit-tested. It is the only thing that tells
 * a guide how much time the client has left, and getting the threshold wrong is
 * expensive in a way that is invisible in eval: the eval harness gives every test
 * user 100 minutes (scripts/eval-chat.ts) precisely so billing never interferes, so
 * no eval run can ever exercise the wind-down branch.
 */

/**
 * How much time is left when the guide is told to start closing the reading.
 *
 * Sized against the SHORTEST thing a client can hold — the 3:00 free trial and the
 * 3:21 ($10) pack. The previous rule was `floor(coins / cpm) <= 2`, written when
 * packs were 15 and 30 minutes; after the move to per-minute pricing it fired below
 * 180 coins, i.e. for almost the whole trial and most of a $10 pack, telling the
 * guide to stop opening threads while the client was still deciding to buy.
 */
export const WIND_DOWN_SECONDS = 60;

export const WIND_DOWN_INSTRUCTION =
  ' TIME IS NEARLY UP — begin the wind-down NOW: synthesis, takeaway, next-opening. Do not open new threads.';

/**
 * Build the meter line for a spendable balance.
 *
 * @param spendableCoins coins the client can actually spend with this guide
 *                       (real balance + any promo wallet for this persona)
 * @param coinsPerMinute the persona's rate in wallet units (cents/min; a coin is a cent)
 */
export function buildMinutesMeterLine(spendableCoins: number, coinsPerMinute: number): string {
  const cpm = Math.max(1, coinsPerMinute);
  // Scale before dividing — `(coins / cpm) * 60` drops a second on exact values
  // (see coinsToClock in shared/types).
  const secondsLeft = Math.max(0, Math.floor((spendableCoins * 60) / cpm));
  const wholeMinutes = Math.floor(secondsLeft / 60);

  // Flooring to minutes rendered any sub-minute balance as "about 0 minutes", which
  // reads to the model as "no time at all" rather than "wrap up".
  const remaining = secondsLeft >= 60
    ? `about ${wholeMinutes} minute${wholeMinutes === 1 ? '' : 's'}`
    : 'less than a minute';

  const windDown = secondsLeft <= WIND_DOWN_SECONDS ? WIND_DOWN_INSTRUCTION : '';
  return `\nClient minutes remaining: ${remaining}.${windDown}`;
}
