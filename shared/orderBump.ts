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
export function bumpProductName(
  funnelSuffix: string,
  variant: BumpCopyVariant = 'control',
): string {
  // Defaulted so every pre-existing caller keeps its exact behaviour, and so an
  // un-seeded experiment renders the shipped name. Only variation A carries a
  // different one — it sells a stronger clearing, not a second reading.
  return `${bumpCopy(variant, 'love').productName}${funnelSuffix}`;
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

// ─── COPY SPLIT TEST (2026-08-11) ────────────────────────────────────────────
// Spec: docs/superpowers/specs/2026-08-11-order-bump-copy-test.md
//
// The bump ships live at 30%+ take rate, so this is a test to BEAT a strong
// control, not to repair a broken one. Three arms:
//
//   control — today's copy, untouched. What 30%+ was measured on.
//   A       — bumps the ACT. The $35 product is an Energy Clearing Ritual (a
//             thing Evelyn DOES tonight); the emailed 5-7 pages are its receipt.
//             A sells a stronger clearing and retires the second reading.
//   B       — bumps NOTHING. Same offer as control, same buttons, same Stripe
//             line. Only the description changes, so a win is attributable to
//             the copy alone.
//
// 🔴 ONE TABLE, TWO READERS — the same reason this module is shared at all. The
// CLIENT renders the offer from this and the SERVER prices the Stripe line item
// from it. If the arm resolved differently on the two sides, a buyer would see
// one offer and be billed for another.

export const BUMP_COPY_VARIANTS = ['control', 'A', 'B'] as const;
export type BumpCopyVariant = (typeof BUMP_COPY_VARIANTS)[number];

/** True when `v` is a known arm. Guards the experiment payload, which is config. */
export function isBumpCopyVariant(v: unknown): v is BumpCopyVariant {
  return typeof v === 'string' && (BUMP_COPY_VARIANTS as readonly string[]).includes(v);
}

/**
 * Which copy arm an experiment payload selects.
 *
 * 🔴 NOT THE SAME THING AS `assignment.variant`. The experiment's own arms are
 * named 'A'/'B' and decide whether the bump is OFFERED AT ALL; this reads a
 * separate `copy` key inside the payload and decides WHICH WORDS she sees. Two
 * namespaces that both use the letters A and B — always source the copy arm
 * from here, never from the assignment's variant id.
 *
 * An absent or malformed `copy` key ⇒ 'control'. That is what keeps this safe to
 * merge: the live payload today is `{ bump: true }` with no `copy` key, so every
 * enrolled lead keeps rendering the copy the 30%+ take rate was measured on
 * until someone deliberately seeds an arm.
 */
export function bumpCopyFromPayload(payload: unknown): BumpCopyVariant {
  const copy = (payload as { copy?: unknown } | null | undefined)?.copy;
  return isBumpCopyVariant(copy) ? copy : 'control';
}

/** Everything an arm needs to render. `productName` carries NO funnel suffix. */
export interface BumpCopyPack {
  /** Evelyn's offer line. May contain `\n\n` — the card renders one <p> each. */
  offer: string;
  accept: string;
  decline: string;
  /** Base Stripe product name; pass through `bumpProductName()` for the suffix. */
  productName: string;
  lineDescription: string;
}

/**
 * Variation A's offer. Bucket-agnostic on purpose: it sells depth on the ONE
 * block Evelyn already found, so there is no second topic to name.
 *
 * ⚠ MUST NOT PROMISE DURABILITY. Upsell 1 (Protection Ritual, $47) sells exactly
 * that gap — "removal is only half the work, your field rebuilds raw for 30 days
 * and shadows creep back". A bump that says "so it won't come back" leaves U1
 * with nothing to sell. Hence "nothing gets left in you": depth, tonight. A test
 * asserts this.
 *
 * `firstName` is optional and the copy closes over its absence cleanly — a lead
 * can reach the CTA without a captured name on the no-optin arm.
 */
function variationAOffer(firstName?: string): string {
  const name = (firstName ?? '').trim();
  const address = name ? `Before I begin, ${name} — one thing.` : 'Before I begin — one thing.';
  return [
    address,
    "A shadow this old has roots. Three hours gets its hold. It doesn't always get the root.",
    `For ${V1_BUMP_PRICE_LABEL} I'll go twice as deep tonight. Six hours instead of three, double the force, all the way down.`,
    'It drains me more. But nothing gets left in you.',
  ].join('\n\n');
}

/**
 * Variation B's offer. Same OFFER as control — a second reading on the paired
 * topic — reworded to answer the two questions control leaves open: why the
 * price is small (the channel is already open) and why not later (tomorrow is a
 * new sitting). It deliberately does NOT argue *why that topic*; read a win
 * accordingly.
 */
function variationBOffer(paired: BumpBucket): string {
  return (
    `I'm already in your energy tonight — the channel's open, and I can see a second thread ` +
    `pulling at your ${BUMP_TOPIC_LABELS[paired]} side. Reading it now costs ${V1_BUMP_PRICE_LABEL} ` +
    `because I don't have to open the way twice. Tomorrow it's a new reading at full price.`
  );
}

/**
 * Resolve one arm's full copy set.
 *
 * An UNRECOGNISED arm falls back to control rather than throwing or rendering
 * blank: this value arrives from experiment config, and a typo in a payload must
 * degrade to the shipped copy, never to an empty offer card mid-checkout.
 */
export function bumpCopy(
  variant: BumpCopyVariant,
  paired: BumpBucket,
  firstName?: string,
): BumpCopyPack {
  const control: BumpCopyPack = {
    offer: bumpOfferCopy(paired),
    accept: BUMP_ACCEPT_LABEL,
    decline: BUMP_DECLINE_LABEL,
    productName: V1_BUMP_PRODUCT_NAME,
    lineDescription: bumpLineDescription(paired),
  };

  switch (variant) {
    case 'A':
      return {
        offer: variationAOffer(firstName),
        accept: 'Yes — go all the way down',
        decline: 'No, the standard clearing is enough',
        productName: '+ Double-Strength Clearing',
        lineDescription: "Twice the depth on tonight's clearing",
      };
    case 'B':
      // Description-only by design — everything else is control's, by reference.
      return { ...control, offer: variationBOffer(paired) };
    default:
      return control;
  }
}
