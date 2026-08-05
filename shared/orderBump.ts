// V1 ORDER BUMP — "double reading" ($12.77)
//
// One extra chat turn wedged between the buy CTA and the Stripe redirect: Evelyn
// offers a SECOND reading on a paired topic, which rides the same checkout session
// as the main offer (one PaymentIntent, two line items).
//
// SHARED deliberately. The client renders the offer copy and the server validates
// what comes back + prices the line item, and if those two ever disagreed about
// which topic was offered, the buyer would be charged for a reading other than the
// one she said yes to. One table, imported by both.

/** The four topics the V1 funnel reads on. Mirrors the client `Bucket` union. */
export type BumpBucket = 'love' | 'money' | 'purpose' | 'someone';

/** The bump price, in cents. Single source of truth for client copy + Stripe. */
export const V1_BUMP_CENTS = 1277;

/** `$12.77` — formatted once so copy and the mockup can't drift from the charge. */
export const V1_BUMP_PRICE_LABEL = `$${(V1_BUMP_CENTS / 100).toFixed(2)}`;

/**
 * Which SECOND topic to offer, given the topic she already chose. Static — no AI
 * call — so the offer is instant and identical every time.
 *
 * Love is the second topic in 3 of the 4 pairings because it is the funnel's
 * strongest pull; the exception is a love-bucket buyer, who gets money. This is
 * also why `metadata.bumpProduct` is the bucket-AGNOSTIC `double_reading` rather
 * than anything money-flavoured — a "money path" name would be wrong 3 times in 4.
 */
export const BUMP_PAIRINGS: Record<BumpBucket, BumpBucket> = {
  love: 'money',
  money: 'love',
  purpose: 'love',
  someone: 'love',
};

/** How the paired topic is NAMED in the offer copy ("your Money path"). */
export const BUMP_TOPIC_LABELS: Record<BumpBucket, string> = {
  love: 'Love',
  money: 'Money',
  purpose: 'Purpose',
  someone: 'Love',
};

/** True when `v` is one of the four buckets. Guards untrusted client input. */
export function isBumpBucket(v: unknown): v is BumpBucket {
  return v === 'love' || v === 'money' || v === 'purpose' || v === 'someone';
}

/**
 * The paired second topic for a bucket. Unknown/missing bucket ⇒ 'love', which is
 * the modal pairing — so a buyer with no recorded bucket still gets a coherent
 * offer rather than no bump at all.
 */
export function pairedBumpBucket(bucket: unknown): BumpBucket {
  return isBumpBucket(bucket) ? BUMP_PAIRINGS[bucket] : 'love';
}

/**
 * The customer-facing line item on the Stripe checkout page + receipt.
 *
 * ⭐ THE LEADING "+" IS DELIBERATE (Lewis, 2026-08-04). On the hosted checkout the
 * two lines otherwise read as two unrelated products — "Energy Clearing Ritual —
 * PALM" and then a second thing she doesn't recognise. The "+" makes the second
 * line read as an ADDITION to the first at a glance, without touching the main
 * line's name (which carries the " - PALM" / " - TAROT" suffix fulfilment routes
 * on, so it is not safe to edit for this).
 *
 * 🔴 FIXED AND BUCKET-AGNOSTIC ON PURPOSE. Naming it per topic ("Money Path
 * Reading") would produce four different product names for Mike's fulfilment flow
 * to branch on, for what is one product. Which topic she actually bought is
 * carried by `metadata.bumpBucket`, and shown to HER in the line description.
 *
 * ⚠ PLACEHOLDER WORDING — pending Joel's sign-off (see the mockup). Changing it
 * is safe: nothing matches on this string. What must NOT change is
 * `metadata.product`, which Mike's n8n filter exact-matches.
 */
export const V1_BUMP_PRODUCT_NAME = '+ Double Your Reading Add-On';

/**
 * The bump's line-item name for a given funnel — the base name plus the SAME
 * funnel suffix the main line already carries (" - PALM" / " - TAROT").
 *
 * 🔑 Lewis, 2026-08-04: the bump ships to fb-palm AND fb-tarot, so its line item
 * must say which funnel it came from exactly as the main product does. Without
 * this, every bump order across both funnels would arrive under one
 * indistinguishable name — and the funnel suffix is what fulfilment routes on.
 *
 * Pass the suffix in (from `funnelDefForParam(funnel).productSuffix`) rather than
 * resolving it here: `shared/` must not depend on the funnel registry, and this
 * keeps the bump name derived from the very same value the main line uses, so the
 * two can never drift apart.
 *
 * Still bucket-agnostic — the funnel varies, the TOPIC never appears here.
 */
export function bumpProductName(funnelSuffix: string): string {
  return `${V1_BUMP_PRODUCT_NAME}${funnelSuffix}`;
}

/**
 * The line-item DESCRIPTION under the name, e.g. "Your second reading — Money
 * path". Naming the topic here (rather than in the product name) is what stops
 * her wondering what the extra charge is for, while keeping the product NAME
 * fixed and generic for fulfilment. Nothing matches on this string.
 */
export function bumpLineDescription(paired: BumpBucket): string {
  return `Your second reading — ${BUMP_TOPIC_LABELS[paired]} path`;
}

/** `metadata.bumpProduct` — the value Mike's n8n branches on. Bucket-agnostic. */
export const V1_BUMP_PRODUCT_KEY = 'double_reading';

/**
 * INTERNAL marker appended to the PaymentIntent description on a bump order, so
 * the Stripe Dashboard's Description column shows at a glance that the payment
 * covers two products (Lewis, 2026-08-04). Without it a bump order is
 * indistinguishable from a normal one in the payments list except by amount.
 *
 * NOT customer-facing: `product_data.name` is what appears on the checkout page
 * and the receipt, and it is untouched by this. Mirrors the existing " - No
 * email" marker the no-optin arm already appends to the same field.
 */
export const V1_BUMP_DESCRIPTION_MARKER = ' + Double Reading';

/**
 * The internal PaymentIntent description — what the Stripe Dashboard shows in its
 * Description column. Built here rather than inline so the "a normal order is
 * unchanged" guarantee is actually covered by a test: with both flags false this
 * returns `productName` untouched, exactly as it has always been.
 *
 * `noemail` stays last so the pre-existing " - No email" marker keeps its
 * position on the no-optin arm.
 */
export function paymentIntentDescription(
  productName: string,
  opts: { bump?: boolean; noemail?: boolean } = {},
): string {
  return (
    productName +
    (opts.bump ? V1_BUMP_DESCRIPTION_MARKER : '') +
    (opts.noemail ? ' - No email' : '')
  );
}

/**
 * Evelyn's offer line. `topic` is the PAIRED bucket, not her original one.
 *
 * ⚠ PLACEHOLDER COPY, from Joel's own wording on the 7/27 call — directional until
 * he approves the mockup.
 */
export function bumpOfferCopy(paired: BumpBucket): string {
  const topic = BUMP_TOPIC_LABELS[paired];
  return `Before I prepare your clearing… I'm also sensing something blocking your ${topic} path. Want me to reveal that too? Just ${V1_BUMP_PRICE_LABEL} more for the double reading.`;
}

export const BUMP_ACCEPT_LABEL = 'Yes, double it';
export const BUMP_DECLINE_LABEL = 'No, just my reading';
