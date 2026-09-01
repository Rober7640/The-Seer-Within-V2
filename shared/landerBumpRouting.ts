import {
  V1_BUMP_PRODUCT_KEY,
  V1_BUMP_PRODUCT_KEY_DOWNSELL,
  V1_BUMP_PRODUCT_KEY_MONEY_LANDER,
  V1_BUMP_PRODUCT_KEY_READ_LANDER,
  V1_BUMP_PRODUCT_KEY_SOULMATE_LANDER,
  type BumpTier,
} from './orderBump';
import { isTarotMoneyLead, moneyLanderSplitLive } from './moneyLander';
import { isTarotSoulmateLead, soulmateLanderSplitLive } from './soulmateLander';

/**
 * Where a bump order's `bumpProduct` key is decided, and who reaches the bump-paid
 * AWeber list — for ALL lander families at once.
 *
 * 🔑 WHY THIS IS ITS OWN MODULE. Both decisions are single-valued: an order stamps
 * exactly one bumpProduct, and is either written to list 6969209 or not. When money
 * was the only split (2026-08-20) these two lived in shared/moneyLander.ts, which was
 * fine while there was one family. With soulmate added (2026-08-21) leaving them there
 * would have meant soulmate logic inside a file called moneyLander — and, worse, two
 * places that each believed they owned the key. One file owns the answer; the
 * per-family predicates and env switches stay in their own modules.
 *
 * Adding a third family is: a key in orderBump.ts, a `<family>Lander.ts` with its
 * predicate + switch, one branch below, and one entry in the exclusion list.
 */

/**
 * `metadata.bumpProduct` for an order.
 *
 * Money and soulmate landers get keys Mike's n8n does NOT match (he confirmed
 * 2026-08-20 that his filter is an EQUALS on `double_reading`), so no second-reading
 * PDF is generated for them. Everything else keeps the key his branch fires on.
 *
 * 🔴 THE TWO FAMILIES ARE PROVABLY DISJOINT, so the branch order below is a
 * formality rather than a precedence rule: money landers are the only tarot hooks
 * `hookToBucket()` maps to 'money', and every soulmate lander is 'love'. A test
 * asserts no hook can satisfy both predicates. If a future family ever CAN overlap,
 * make the precedence explicit here rather than relying on the order.
 *
 * 🔴 EACH FAMILY READS ITS OWN SWITCH. An environment can have money live and
 * soulmate dark, or the reverse — that is the point of two variables (Lewis,
 * 2026-08-21) — so neither branch may consult the other's env.
 */
export function bumpProductKeyFor(
  funnel: string | null | undefined,
  bucket: unknown,
  tarotHook?: unknown,
  // Which checkout the bump rode on. TRAILING AND DEFAULTED so every pre-existing
  // caller keeps its exact behaviour without being touched — only a caller that
  // deliberately passes 'downsell' can reach the branch below.
  tier: BumpTier = 'main',
): string {
  // /fb-read, every device. Disjoint from both tarot families by construction —
  // they require funnel === 'v1-tarot' and this requires 'v1-read' — so its position
  // in this chain is a formality, not a precedence rule. No env switch: see the key's
  // own docs for why a brand-new funnel does not need a reversible cutover.
  if (funnel === 'v1-read') {
    return V1_BUMP_PRODUCT_KEY_READ_LANDER;
  }
  if (moneyLanderSplitLive() && isTarotMoneyLead(funnel, bucket)) {
    return V1_BUMP_PRODUCT_KEY_MONEY_LANDER;
  }
  if (soulmateLanderSplitLive() && isTarotSoulmateLead(funnel, tarotHook)) {
    return V1_BUMP_PRODUCT_KEY_SOULMATE_LANDER;
  }
  // 🔴 LAST, AND ONLY OVER THE DEFAULT KEY. A money or soulmate lander keeps its
  // own key on the downsell too: those two values are what hold those orders OUT of
  // Mike's PDF branch AND off the order-bump paid list (bumpPaidListWanted reads the
  // stamped value), so overriding them here would put a money-lander downsell buyer
  // back on a list that follows up on a reading she is never sent — re-opening the
  // exact bug fixed on 2026-08-20. The downsell rename replaces `double_reading`
  // and nothing else.
  if (tier === 'downsell') return V1_BUMP_PRODUCT_KEY_DOWNSELL;
  return V1_BUMP_PRODUCT_KEY;
}

/**
 * Every bumpProduct value that must NOT be written to the order-bump paid list
 * (`theseerwithin_money_ob_paid`, 6969209).
 *
 * That list follows up on a second reading these buyers do not receive, so putting
 * them on it promises them something nobody is going to send.
 */
const BUMP_PAID_LIST_EXCLUDED_KEYS: readonly string[] = [
  V1_BUMP_PRODUCT_KEY_MONEY_LANDER,
  V1_BUMP_PRODUCT_KEY_SOULMATE_LANDER,
  // /fb-read (Lewis, 2026-09-01). Its bump sells a double-STRENGTH clearing, so its
  // buyers must not land on a list that follows up on a second reading. Mike's EQUALS
  // filter on `double_reading` does not match this key either, so no PDF is sent.
  V1_BUMP_PRODUCT_KEY_READ_LANDER,
  // The DOWNSELL bump is a double-STRENGTH clearing, not a second reading (Lewis,
  // 2026-08-25) — so its buyers must not land on a list that follows up on a second
  // reading. Consistent with Mike's EQUALS filter on `double_reading` not matching
  // this key, so no second-reading PDF is sent to them either.
  V1_BUMP_PRODUCT_KEY_DOWNSELL,
];

/**
 * Should this paid order be written to the ORDER-BUMP paid list (6969209)?
 *
 * 🔴 KEYED ON THE STAMPED `bumpProduct`, NOT re-derived from funnel + bucket + hook.
 * That is what makes this inherit each family's cutover switch for nothing: with a
 * switch OFF that family's orders stamp V1_BUMP_PRODUCT_KEY, so this returns true and
 * the write happens exactly as it always did; with it ON the order stamps the family
 * key and is skipped. List, bump key and this write therefore flip together, and the
 * half-on state stays unreachable.
 *
 * 🔴🔴 THIS IS THE BUG FROM 2026-08-20, and why it is a VALUE test rather than an
 * existence test. The original gate asked only whether `metadata.bumpProduct` was
 * truthy, so renaming the key still passed it and a real money-lander buyer landed on
 * 6969209 anyway. Found only by Lewis watching a live walk. Never weaken this back to
 * a presence check.
 *
 * Absent / empty / non-string ⇒ false, preserving the original truthiness gate: the
 * key is absent on every non-bump order, so this can still never fire for a plain main
 * purchase, an upsell, or another funnel's product.
 */
export function bumpPaidListWanted(bumpProduct: unknown): boolean {
  if (typeof bumpProduct !== 'string' || !bumpProduct.trim()) return false;
  return !BUMP_PAID_LIST_EXCLUDED_KEYS.includes(bumpProduct);
}
