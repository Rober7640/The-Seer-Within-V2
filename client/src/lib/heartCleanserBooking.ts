// Offer 09 — the Heart Cleanser Love Charm booking, PAGE treatment copy.
//
// Copy source: improve-v1/v1-one-time-BEs/docs/09/booking-page/09-C1-booking-page.md (ticks, deck,
// caption, hint, total label and small print approved by the operator 2026-09-15 — the
// final copy and its cold read are in 09-C1-ticks-rewrite.md, Version 2). Change the doc
// first, then this file.
// Tests: heartCleanserBooking.test.ts
//
// ⚠ VOICE: the buyer's, first person, in every statement. Evelyn is named in the third
// person and never speaks on this page.
//
// Cloned from pixiuBooking.ts's shape (06). 09's order bump is its own: Reiki charging by
// Evelyn before packing, $11.11 (09-C3, Joel 2026-09-15) — a one-line label, not 06's
// multi-paragraph pitch. More things are 09's own:
//   - FOUR statements, all about the charm, the ritual and what it stands for — no
//     logistics (operator 2026-09-15). No request paragraph;
//   - the ADDRESS is taken on Stripe's page before payment (worldwide
//     shipping_address_collection), so the small print says so — not 06's "on the next
//     screen";
//   - one product image: the studio close-up (rosequartz, 570px — its full size, not
//     upscaled). ⛔ Not rosequartz3: its "Wish Miracle Bracelet" box and card would confuse
//     buyers next to this product's name (Joel, 2026-09-15). ⛔ Never the black-bead GIF.

import type { BackendCheckoutRequest } from './backendCheckout';
import { HEART_CLEANSER_BUMP_CENTS, HEART_CLEANSER_PRICE_CENTS } from '@shared/backendOffers';

// ⛔ Prices are NOT defined here — shared/backendOffers.ts is what the checkout endpoint
// charges from. Re-exported so the screen needs only this one import. No sentence on this
// page names an amount: the total and the bump's "+$11.11" are computed from the catalog cents.
export { HEART_CLEANSER_PRICE_CENTS, HEART_CLEANSER_BUMP_CENTS } from '@shared/backendOffers';

export const TAB_TITLE = 'Your Heart Cleanser Love Charm';

export const PAGE_HEADER = {
  title: 'Your Heart Cleanser Love Charm',
  deck: "Before checkout, please read and tick all four boxes below. Ticking the boxes doesn't charge you.",
} as const;

// Top of the white sheet, above statement 1. ~320px wide on desktop, full sheet width
// on a phone. Hosted at its full 570px. The alt names the clear crystal only as what the
// charm rests on; the caption says it is not included.
export const PAGE_IMAGE = {
  src: 'https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/backend-09/rosequartz-page-570.jpg',
  alt: 'The Heart Cleanser Love Charm, a pink quartz bracelet with a gold wish capsule, resting on a clear crystal.',
  caption: 'The Heart Cleanser Love Charm, a pink quartz bracelet with a wish capsule. The clear crystal under the bracelet is not included.',
} as const;

export interface PageStatement {
  lead: string;
  body: string;
}

// The four statements (09-C1-ticks-rewrite, Version 2): the charm, the ritual and what it stands for.
// ⛔ No logistics here — shipping, price, address and checkout live in CHECKOUT.reassurance.
// ⛔ Claim level of 09-E2/E3: "stands for", never "makes" or "brings". No outcome for another person.
export const PAGE_STATEMENTS: PageStatement[] = [
  {
    lead: 'Yes — I want to keep my wish for love inside my charm.',
    body:
      'My charm is the whole bracelet: pink quartz, with a small wish capsule built in. Blank wish papers ' +
      "come with my charm. I'll write my wish on one of the papers, put the paper in the capsule and close " +
      'the capsule. I can keep what I write to myself.',
  },
  {
    lead: 'Yes — I\'ll say, "I am ready to receive love, too."',
    body:
      '"Too" means I receive love as well as give it. After my wish is in the capsule, I\'ll hold my charm ' +
      'in my left palm and say that sentence.',
  },
  {
    lead: "Yes — I'll wear my pink quartz charm on my left wrist.",
    body:
      'Wearing my charm on the left stands for receiving love. The pink quartz stands for tenderness, the ' +
      "kind of love I'd like to welcome into my life.",
  },
  {
    lead: 'Yes — I want my wish to go with me through the day.',
    body:
      'As I put my charm on in the morning, I can stop for a moment and think of my wish. The paper with my ' +
      'wish stays in the capsule. When I touch the capsule, I can remember what I wrote.',
  },
];

// ⛔ No request paragraph (09-C1-ticks-rewrite): it was removed, not emptied — an empty
// block would still draw a divider and a gap above the bump.

// The order bump (09-C3, Joel 2026-09-15): Reiki charging by Evelyn before packing. Sits
// between the last statement and the total. ⛔ Never pre-checked — a pre-selected paid add-on
// is a negative option under FTC and card-network rules. Says what is ADDED and when; never
// that the charm lacks anything, never an outcome. A real service, done by hand before packing.
export const BUMP = {
  label: "Yes — have Evelyn charge my charm with Reiki before it's packed.",
  priceLabel: `+${formatTotal(HEART_CLEANSER_BUMP_CENTS)}`,
  note:
    "Before it's packed, Evelyn holds my charm in her hands and gives it Reiki for love. " +
    "So on my first morning, I'm not starting with a new stone. I'm starting with one she has " +
    "already worked on for me. No extra wait.",
} as const;

export const CHECKOUT = {
  totalLabel: 'Total',
  button: 'SEND ME MY LOVE CHARM',
  lockedHint: 'Tick all four boxes above to show the button.',
  // Under the button, small. Box contents and every logistic live here, not in a tick.
  // ⛔ No "$59" and no "one payment of" — the order bump sits beside the total and changes it.
  // ⛔ No "Stripe" — most readers didn't know the name.
  // Shipping wording word for word against 09-T1/T3/T4 and copy-check OFFERS['09'].sla.
  // Windows count from dispatch.
  reassurance:
    'In the gift box: your charm, blank wish papers that fit the capsule, and a printed card showing how to ' +
    'use and care for your charm. Free shipping worldwide. Your charm ships within 2 business days, then ' +
    'arrives in 7–14 days in the US and 2–4 weeks everywhere else. The 7–14 days and 2–4 weeks start on ' +
    'the day your charm ships. Once all four boxes are ticked, the button above takes you to the secure ' +
    "checkout page, where you'll enter your shipping address and pay. No subscription.",
  // Link and address only — no day counts from the refund page restated here.
  refundLabel: 'Refund policy',
  refundHref: '/refund',
  supportLead: 'Questions:',
  supportEmail: 'hi@theseerwithin.com',
} as const;

export function formatTotal(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** The button exists only when there is one tick per statement and every one is ticked. */
export function allStatementsTicked(checked: readonly boolean[]): boolean {
  return checked.length === PAGE_STATEMENTS.length && checked.every(Boolean);
}

/** The "Total" line: the charm, plus the bump while it is ticked. Both from the catalog. */
export function heartCleanserTotalCents(bumpTaken: boolean): number {
  return HEART_CLEANSER_PRICE_CENTS + (bumpTaken ? HEART_CLEANSER_BUMP_CENTS : 0);
}

/**
 * What the button sends to beginBackendCheckout. ⛔ Posts NO price — only whether she ticked
 * the bump; the server charges the catalog's 5900, plus 1111 for the bump. Carries the
 * letter's ?c= (09-E2 sends 1–4, 09-E3 sends 21–24) so fulfilment and reporting know
 * which letter she bought from — the pixiu page forgets this; 09 must not.
 */
export function heartCleanserCheckoutRequest(from: {
  firstName: string | null;
  letterCode: string | null;
  bump: boolean;
}): BackendCheckoutRequest {
  return {
    offer: 'heart-cleanser',
    treatment: 'page',
    bump: from.bump === true,
    firstName: from.firstName,
    letterCode: from.letterCode,
  };
}
