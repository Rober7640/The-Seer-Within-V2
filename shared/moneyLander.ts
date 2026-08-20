/**
 * The eleven /fb-tarot MONEY-BLOCK landers (Lewis, 2026-08-20).
 *
 * ONE predicate, deliberately. Two separate behaviours key off "is this a money
 * lander" — the free AWeber list she is written to (routes.ts `aweberLeadListId`)
 * and the `bumpProduct` value on her Stripe order (routes.ts `bumpMetadata`) — and
 * if those two ever disagreed you would get a lead on the money list whose order
 * still triggered Mike's PDF, or the reverse. Sharing this function is what makes
 * that impossible.
 *
 * 🔑 KEYED ON `bucket`, NOT ON THE HOOK. On /fb-tarot the chat's topic picker is
 * skipped and the bucket is derived from the hook by `hookToBucket()`
 * (client/src/content/tarotReads.ts), which returns 'money' for exactly these eleven
 * hooks and 'love' for all 74 others. So `bucket` already IS the hook's verdict; it
 * is the same value the AWeber `money` tag is written from; and it is the only one of
 * the two available at BOTH call sites, since /api/checkout never receives the hook.
 * Matching on a hook roster here would mean a second copy of that list on the server,
 * free to drift from the registry — the drift this codebase avoids everywhere else.
 *
 * 🔴 THE FUNNEL TEST IS LOAD-BEARING. `fbifyAweberTags()` does NOT funnel-suffix the
 * bucket tag, so a root / fb / fb2 / gdn visitor who picks "Money" in the topic picker
 * carries bucket === 'money' too. Without the funnel check both behaviours would leak
 * onto every funnel's money-bucket traffic.
 */
export function isTarotMoneyLead(
  funnel: string | null | undefined,
  bucket: unknown,
): boolean {
  return funnel === "v1-tarot" && bucket === "money";
}

/**
 * The money-block landers' own free AWeber list, or `undefined` to fall through to
 * the normal per-funnel chain.
 *
 * 🔴 UNSET ENV ⇒ undefined ⇒ THE EXACT OLD PATH. This returning `undefined` is the
 * whole safety guarantee: shipping the code changes nothing at all until
 * AWEBER_LIST_ID_TAROT_MONEY is set in Railway, so the deploy and the cutover are
 * separate, independently reversible steps and rollback is unsetting one variable.
 *
 * Kept separate from routes.ts's `aweberLeadListId()` so this decision is unit
 * testable without booting the server — that function's existing fallback chain is
 * deliberately left untouched.
 */
export function moneyLanderListId(
  funnel: string | null | undefined,
  bucket: unknown,
): string | undefined {
  if (!isTarotMoneyLead(funnel, bucket)) return undefined;
  return process.env.AWEBER_LIST_ID_TAROT_MONEY || undefined;
}
