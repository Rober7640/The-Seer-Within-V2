import { SOULMATE_LANDER_HOOKS } from './soulmateLanderHooks';

/**
 * The nineteen /fb-tarot SOULMATE landers (Lewis, 2026-08-21).
 *
 * The money split, done a second time — see shared/moneyLander.ts for the original
 * and the reasoning behind each piece. Two behaviours key off "is this a soulmate
 * lander": the free AWeber list she is written to (routes.ts `aweberLeadListId`) and
 * the `bumpProduct` value on her Stripe order (routes.ts `bumpMetadata`). A third,
 * the bump-paid list skip, keys off the stamped bumpProduct downstream and therefore
 * inherits this decision for free.
 *
 * 🔑 KEYED ON THE HOOK, NOT ON `bucket` — AND THAT IS THE ONE REAL DIFFERENCE FROM
 * MONEY. `hookToBucket()` returns 'money' for exactly the eleven money landers, so
 * over there `bucket` already WAS the hook's verdict and no roster was needed. These
 * nineteen are all `love`, the same bucket as the other ~74 tarot landers and as every
 * funnel's "Love" topic-picker traffic, so `bucket` cannot separate them from anything.
 * The hook is the only signal that can, which is why /api/checkout had to start
 * receiving it — it never did before. See the plumbing note in server/routes.ts.
 *
 * 🔴 THE FUNNEL TEST IS STILL LOAD-BEARING even though the hook roster is specific.
 * A tarot hook is an untrusted client string at both call sites; pinning the funnel
 * keeps a stray or replayed value from reaching this decision off a non-tarot funnel,
 * and costs nothing since these hooks only exist on /fb-tarot.
 */
export function isTarotSoulmateLead(
  funnel: string | null | undefined,
  tarotHook: unknown,
): boolean {
  if (funnel !== 'v1-tarot') return false;
  if (typeof tarotHook !== 'string') return false;
  return SOULMATE_LANDER_HOOKS.includes(tarotHook.trim());
}

/**
 * The soulmate landers' own free AWeber list, or `undefined` to fall through to the
 * normal per-funnel chain.
 *
 * 🔴 UNSET ENV ⇒ undefined ⇒ THE EXACT OLD PATH, exactly as with money. Shipping this
 * code changes nothing at all until AWEBER_LIST_ID_TAROT_SOULMATE is set in Railway,
 * so the deploy and the cutover stay separate, independently reversible steps and the
 * rollback is unsetting one variable.
 *
 * ⚠️ The new list MUST define the `resume_url` custom field before the variable is
 * set. AWeber rejects an undefined custom field for the WHOLE request, so without it
 * addSubscriberToList() retries without custom fields (aweber.ts) and every soulmate
 * lead silently loses its recovery link. This bit the money list on 2026-08-20.
 */
export function soulmateLanderListId(
  funnel: string | null | undefined,
  tarotHook: unknown,
): string | undefined {
  if (!isTarotSoulmateLead(funnel, tarotHook)) return undefined;
  return process.env.AWEBER_LIST_ID_TAROT_SOULMATE || undefined;
}

/**
 * Is the soulmate-lander cutover LIVE on this environment?
 *
 * 🔑 ONE SWITCH FOR BOTH BEHAVIOURS, for the same reason money has one: the free list
 * and the bump key describe the same nineteen landers, and an environment where one is
 * on and the other off is a state nobody asked for — soulmate leads filed on the new
 * list while their orders still trigger Mike's PDF, or the reverse.
 *
 * 🔑 ITS OWN VARIABLE, NOT THE MONEY ONE (Lewis, 2026-08-21). The two cutovers are
 * independent decisions and either must be reversible without disturbing the other.
 *
 * 🔴 UNSET ⇒ EVERY LANDER BEHAVES EXACTLY AS IT DID BEFORE, the nineteen included.
 */
export function soulmateLanderSplitLive(): boolean {
  return !!(process.env.AWEBER_LIST_ID_TAROT_SOULMATE || '').trim();
}
