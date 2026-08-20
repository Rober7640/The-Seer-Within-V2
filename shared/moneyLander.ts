import { V1_BUMP_PRODUCT_KEY, V1_BUMP_PRODUCT_KEY_MONEY_LANDER } from './orderBump';

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

/**
 * Is the money-lander cutover LIVE on this environment?
 *
 * 🔑 ONE SWITCH FOR BOTH BEHAVIOURS, deliberately. The free list and the bump key are
 * a single cutover: they describe the same eleven landers, and an environment where
 * one is on and the other off is a state nobody asked for — money leads filed on the
 * new list while their orders still trigger Mike's PDF, or the reverse. Two variables
 * could drift into exactly that; one cannot.
 *
 * The presence of AWEBER_LIST_ID_TAROT_MONEY IS that switch. It reads slightly oddly
 * that an AWeber variable also governs Stripe metadata, which is why this function
 * exists rather than the env being read inline in two places — the coupling is the
 * point, and it is named and documented here.
 *
 * 🔴 UNSET ⇒ EVERY LANDER BEHAVES EXACTLY AS IT DID BEFORE, the eleven included. That
 * is what lets the code reach production inert, with the cutover and the rollback both
 * being one variable rather than a deploy.
 */
export function moneyLanderSplitLive(): boolean {
  return !!(process.env.AWEBER_LIST_ID_TAROT_MONEY || '').trim();
}

/**
 * `metadata.bumpProduct` for an order, given its funnel and bucket.
 *
 * Money landers get the key Mike's n8n does NOT match (he confirmed 2026-08-20 that
 * his filter is an EQUALS on `double_reading`), so no second-reading PDF is generated
 * for them. Everything else keeps the key his branch fires on.
 */
export function bumpProductKeyFor(
  funnel: string | null | undefined,
  bucket: unknown,
): string {
  return moneyLanderSplitLive() && isTarotMoneyLead(funnel, bucket)
    ? V1_BUMP_PRODUCT_KEY_MONEY_LANDER
    : V1_BUMP_PRODUCT_KEY;
}

/**
 * Should this paid order be written to the ORDER-BUMP paid list
 * (`theseerwithin_money_ob_paid`, 6969209)?
 *
 * 🔴 THE ELEVEN MONEY LANDERS ARE EXCLUDED (Lewis, 2026-08-20, after seeing a real
 * money-lander buyer land on it). That list exists to follow up on a second reading
 * those buyers do not receive, so putting them on it promises them something nobody
 * is going to send.
 *
 * 🔑 KEYED ON THE STAMPED `bumpProduct`, NOT re-derived from funnel + bucket. That is
 * what makes this inherit the cutover switch for nothing: with the switch OFF a money
 * lander stamps V1_BUMP_PRODUCT_KEY, so this returns true and the write happens
 * exactly as it always did; with it ON the order stamps the money key and is skipped.
 * The list, the bump key and this write therefore flip together, and the half-on state
 * stays unreachable.
 *
 * Absent / empty / non-string ⇒ false, preserving the original truthiness gate: the
 * key is absent on every non-bump order, so this can still never fire for a plain main
 * purchase, an upsell, or another funnel's product.
 */
export function bumpPaidListWanted(bumpProduct: unknown): boolean {
  if (typeof bumpProduct !== 'string' || !bumpProduct.trim()) return false;
  return bumpProduct !== V1_BUMP_PRODUCT_KEY_MONEY_LANDER;
}
