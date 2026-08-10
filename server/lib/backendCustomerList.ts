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
  },
  'judgement-day': {
    number: '03',
    name: 'Judgement Day',
    tag: 'be-03-judgement-day',
    bumpTag: 'be-03-bump',
    deliveredTag: 'be-03-delivered',
  },
};

/** Tags to apply at the moment she pays. */
export function purchaseTags(offer: BackendOfferKey, bumpPurchased = false): string[] {
  const listing = BACKEND_OFFERS[offer];
  const tags = [BE_CUSTOMER_TAG, listing.tag];
  if (bumpPurchased) tags.push(listing.bumpTag);
  return tags;
}

/** Tag to apply when her reading has been produced and can be linked. */
export function deliveredTag(offer: BackendOfferKey): string {
  return BACKEND_OFFERS[offer].deliveredTag;
}
