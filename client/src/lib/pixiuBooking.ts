// Offer 06 — the Wishing Bracelet (Pixiu) booking, PAGE treatment copy.
//
// Copy spec: improve-v1/v1-one-time-BEs/copy/06/06-C1-booking-page.md (the five
// statements + request + button) and 06-C3-order-bump.md ("The Closed Purse").
//
// ⚠ VOICE: the buyer's, first person, throughout. Evelyn is named in the third
// person and never speaks on this page — deck-wide rule, unchanged for a
// physical offer (06-C1).
//
// 06 is fixed-price like 02, so this clones twinFlameBooking.ts's shape — a
// single scrolling sheet, not 03's two-step PWYW split. Two things are 06's own:
//   - a fifth statement about a REAL SHIPPING WAIT (06-C1 statement 4), the one
//     no digital offer in the deck needed;
//   - a multi-paragraph bump in the buyer's voice (06-C3), so BUMP carries
//     `paragraphs[]` like 03's, not 02's single `body`.
// There is NO free-gift statement (06-C1: 06 has none specced — deliberately
// absent, not an oversight).

// ⛔ Prices are NOT defined here — they live in shared/backendOffers.ts, which is
// also what the checkout endpoint charges from, so the page and the card can
// never disagree. Re-exported so a screen needs only this one import.
export {
  WISHING_BRACELET_PRICE_CENTS,
  WISHING_BRACELET_BUMP_CENTS,
  WISHING_BRACELET_BUMP_PRODUCT_KEY,
} from '@shared/backendOffers';

export const TAB_TITLE = 'The Wishing Bracelet — your booking';

export const PAGE_HEADER = {
  title: 'The Wishing Bracelet — your booking',
  deck: 'By booking this you agree to the following:',
} as const;

export interface PageStatement {
  lead: string;
  body: string;
}

// The five statements (06-C1). Statement 1 is candidate-specific (creature-a's
// "no reading to be right about" — affirms the buyer's OWN words, not Evelyn's
// accuracy). Statement 4 is the load-bearing new one: the real shipping wait,
// stated as the honest cost of a real object. ⛔ Do not soften "7 business
// days" / "1–2 weeks" into "soon" — say the real numbers (06-C1 build note).
export const PAGE_STATEMENTS: PageStatement[] = [
  {
    lead: "Yes — that's exactly it.",
    body:
      'Money has reached me before and not stayed. I’ve said as much myself, more than once, ' +
      'in my own words. I’m not imagining it.',
  },
  {
    lead: 'Yes — I want the seal, not another reading.',
    body:
      'I understand what’s being sent isn’t a prediction. It’s a container — something ' +
      'built with no way out, so that what already reaches me stops leaking back before I’ve had ' +
      'the use of it.',
  },
  {
    lead: 'Yes — I understand this only works if I do my part.',
    body:
      'I’ll write down the one specific thing that got away — not “more money” — and ' +
      'seal it in before I wear it. I understand a sealed capsule with nothing specific inside it is ' +
      'just a sealed capsule.',
  },
  {
    lead:
      'Yes — I understand this is a real, physical object, made and posted, not a file that arrives tonight.',
    body:
      'It isn’t typed and sent. It’s prepared and shipped, and I understand that takes ' +
      '7 business days to prepare, and 1–2 weeks to reach me after that. I’d rather wait ' +
      'for the real thing than get a fast version of nothing.',
  },
  {
    lead: 'Yes — I’ll send $49, once, and that’s the whole of what this costs.',
    body:
      'I understand it’s a real object — black agate, a cast Pixiu, a sealed capsule built into ' +
      'it, boxed and carded — not a download that costs nothing to make, and that it’s priced ' +
      'accordingly.',
  },
];

// Statement 6 — the request, ending on the promise in the buyer's own words.
// The button (CHECKOUT.button) completes this sentence.
export const PAGE_REQUEST = [
  'Evelyn — send me the piece you told me about.',
  'I understand what it does and what it doesn’t: it won’t put money in front of me that ' +
    'wasn’t already finding its way to me. It keeps what already reaches me from leaking back out ' +
    'before I’ve had the chance to close my hand around it.',
  'Send it to me, and I’ll do the rest — write my one sentence, seal it in, wear it left.',
];

// The order bump, "The Closed Purse" (06-C3). Multi-paragraph and in the
// buyer's voice, so it carries `paragraphs[]` like 03's bump, not 02's single
// `body`. ⚠ Never pre-checked — a pre-selected paid add-on is a negative option
// under FTC + card-network rules.
export const BUMP = {
  headline: 'Yes — I want the other side of this closed too.',
  priceLabel: '+$11.11',
  paragraphs: [
    'The bracelet keeps what reaches me from leaking back out through the one door it was built ' +
      'without. It was never going to do anything about the doors I left open myself.',
    'So yes — send me The Closed Purse as well.',
    'Not a working on him. A working on me, once: one evening, going back through the last month ' +
      'with an honest light on it — the subscription I forgot to cancel, the money I lent and stopped ' +
      'expecting back, the “good deal” that turned out to just be a hole. Not guilt. Just a ' +
      'light where there wasn’t one before.',
    'It’s one sitting. Nothing to track after it, nothing to keep up. Done once, and it stays done.',
  ],
  addLabel: 'Add The Closed Purse to my booking — $11.11',
} as const;

export const CHECKOUT = {
  totalLabel: 'Total today',
  button: 'SEND ME THE SEAL',
  lockedHint: 'Agree to all five above to continue',
  // 06-C1's under-button line. ⚠ States the real SLA and that the address is
  // collected on the NEXT screen (never bolted onto the commitment ladder).
  reassurance:
    'One payment. Nothing recurring. Ships within 7 business days; reaches you 1–2 weeks after ' +
    'that. You’ll give us your address on the next screen.',
} as const;
