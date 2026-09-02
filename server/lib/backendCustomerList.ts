// The backend deck's ONE customer list, and the tags that drive it.
//
// Decided 2026-08-09 (operator): one AWeber list for every backend offer, with a
// tag per offer — not a list per offer. Rationale: a woman who buys 02 and then
// 03 is one customer, in one place, counted once against the AWeber bill. The
// per-offer behaviour comes from tags instead of from list membership.
//
// ⛔ THESE STRINGS ARE AN API. Three things exact-match them and none of them
// live in this repo:
//   1. the AWeber Campaign that sends each offer's thank-you (trigger: "tag
//      applied", the offer tag below);
//   2. the AWeber Campaign that sends each offer's delivery email (trigger: the
//      delivered tag);
//   3. n8n's fulfilment filter, which already exact-matches product keys the
//      same way (see the order bump's `unburdening`).
// Renaming a tag here silently stops an automation in a system with no test
// suite. Add tags; do not rename them.
//
// ⚠ The list itself is created BY HAND in AWeber's web UI, like every other list
// on this account. Our tooling reads lists and writes subscribers; it has never
// created one. Its id then lands in AWEBER_BE_CUSTOMER_LIST_ID.

export type BackendOfferKey = 'twin-flame' | 'judgement-day';

export interface BackendOfferListing {
  /** The deck's number for the offer, as every doc cites it. */
  number: '02' | '03';
  /** Human name, for logs. */
  name: string;
  /** Applied to every buyer of this offer. Fires her thank-you email. */
  tag: string;
  /** Also applied when she took the order bump. */
  bumpTag: string;
  /** Applied when her reading is out. Fires the delivery email. */
  deliveredTag: string;
  /**
   * The AWeber list a reading buyer lands on, and where the delivery email fires.
   * ⚠ Created BY HAND in the AWeber UI; this is the id it was given.
   * Unset → falls back to AWEBER_BE_CUSTOMER_LIST_ID (the pre-per-product model).
   */
  initialListId?: string;
  /**
   * The separate AWeber list an ORDER-BUMP buyer also lands on. When set, a bump
   * buyer gets a second write here; when unset, the bump tag is folded into the
   * single initial write (the old one-list behaviour).
   */
  bumpListId?: string;
}

/** One AWeber write a purchase produces: which list, which tags, and its role. */
export interface BackendListWrite {
  listId: string;
  tags: string[];
  role: 'initial' | 'bump';
}

/** Applied to every backend buyer, whatever she bought. */
export const BE_CUSTOMER_TAG = 'be-customer';

export const BACKEND_OFFERS: Record<BackendOfferKey, BackendOfferListing> = {
  'twin-flame': {
    number: '02',
    name: 'Twin Flame Tarot',
    tag: 'be-02-twin-flame',
    bumpTag: 'be-02-bump',
    deliveredTag: 'be-02-delivered',
    // Per-product lists (operator, 2026-08-26): reading buyers to _be_customers,
    // order-bump buyers also to _be_ob. Upsell lists exist too (6972555/6972556)
    // but are NOT wired here — the upsells reuse V1 products; routing them is a
    // separate decision. See docs/BE-offer-02-aweber-lists-spec.md.
    initialListId: '6972552',
    bumpListId: '6972554',
  },
  'judgement-day': {
    number: '03',
    name: 'Judgement Day',
    tag: 'be-03-judgement-day',
    bumpTag: 'be-03-bump',
    deliveredTag: 'be-03-delivered',
    // Operator (2026-09-02): 03 REUSES 02's AWeber lists — initial 6972552, bump
    // 6972554 — and is distinguished only by TAG (be-03-*). The 03 Campaigns are set
    // up on those lists, filtered on the be-03 tag, manually. Shared lists, per-offer tags.
    initialListId: '6972552',
    bumpListId: '6972554',
  },
};

/** Tags to apply at the moment she pays. */
export function purchaseTags(offer: BackendOfferKey, bumpPurchased = false): string[] {
  const listing = BACKEND_OFFERS[offer];
  const tags = [BE_CUSTOMER_TAG, listing.tag];
  if (bumpPurchased) tags.push(listing.bumpTag);
  return tags;
}

/**
 * The AWeber write(s) a purchase produces.
 *
 * An offer with its own `bumpListId` puts a bump buyer on TWO lists — the reading
 * list and the order-bump list — each with its own tags. An offer without one
 * keeps the original single write, with the bump tag folded in, so nothing about
 * an un-split offer changes.
 */
export function purchaseListWrites(
  offer: BackendOfferKey,
  bumpPurchased = false,
): BackendListWrite[] {
  const listing = BACKEND_OFFERS[offer];
  const readingListId = listing.initialListId || process.env.AWEBER_BE_CUSTOMER_LIST_ID || '';
  const writes: BackendListWrite[] = [
    { listId: readingListId, tags: [BE_CUSTOMER_TAG, listing.tag], role: 'initial' },
  ];
  if (bumpPurchased) {
    if (listing.bumpListId) {
      writes.push({
        listId: listing.bumpListId,
        tags: [BE_CUSTOMER_TAG, listing.tag, listing.bumpTag],
        role: 'bump',
      });
    } else {
      writes[0].tags.push(listing.bumpTag);
    }
  }
  return writes;
}

/** The list a reading buyer lands on — and where her delivery email fires. */
export function initialListId(offer: BackendOfferKey): string {
  return BACKEND_OFFERS[offer].initialListId || process.env.AWEBER_BE_CUSTOMER_LIST_ID || '';
}

// ── Backend upsells: their OWN products, their OWN lists ──────────────────────
// The BE upsells (Protection Ritual, Bracelet) are NEW products, deliberately NOT
// V1's `protection_ritual` / `manifestation_bracelet`. So V1's webhook branches
// never match them and the live V1 upsell flow is untouched; they route to their
// own lists and fire no Facebook tracking. The physical items ship MANUALLY from
// the saved shipping address, so a new product key costs no fulfilment change.
export interface BackendUpsellListing {
  /** The `be_` Stripe product key. ⛔ Never one of V1's keys. */
  productKey: string;
  name: string;
  listId: string;
  tag: string;
  /** The product half of the tag (`upsell1-protection`), joined to the offer's
   *  number to make a per-offer tag: `be-03-upsell1-protection`. */
  tagSuffix: string;
  /** Full price in cents. Same as V1's ($47 / $47). */
  priceCents: number;
  /** The downsell price in cents, where the offer has one (Bracelet: $30). */
  downsellCents?: number;
}

export const BACKEND_UPSELLS: Record<string, BackendUpsellListing> = {
  be_protection_ritual: {
    productKey: 'be_protection_ritual',
    name: 'Protection Ritual',
    listId: '6972555',
    tag: 'be-02-upsell1-protection',
    tagSuffix: 'upsell1-protection',
    priceCents: 4700,
  },
  be_bracelet: {
    productKey: 'be_bracelet',
    name: 'Manifestation Bracelet',
    listId: '6972556',
    tag: 'be-02-upsell2-bracelet',
    tagSuffix: 'upsell2-bracelet',
    priceCents: 4700,
    downsellCents: 3000,
  },
};

/** The BE upsell for a Stripe product key, or null when it is not a BE upsell. */
export function backendUpsellFor(
  productKey: string | null | undefined,
): BackendUpsellListing | null {
  if (!productKey) return null;
  return BACKEND_UPSELLS[productKey] ?? null;
}

/** Tags for a BE upsell buyer: the shared tag, her ORIGINATING offer's tag, and the
 *  per-offer product tag (`be-03-upsell1-protection`). */
export function upsellPurchaseTags(offer: BackendOfferKey, productKey: string): string[] {
  const listing = BACKEND_UPSELLS[productKey];
  if (!listing) return [];
  const offerListing = BACKEND_OFFERS[offer];
  return [BE_CUSTOMER_TAG, offerListing.tag, `be-${offerListing.number}-${listing.tagSuffix}`];
}

/** Tag to apply when her reading has been produced and can be linked. */
export function deliveredTag(offer: BackendOfferKey): string {
  return BACKEND_OFFERS[offer].deliveredTag;
}
