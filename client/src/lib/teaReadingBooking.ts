// Offer 04 — The Turn, a tea-leaf reading by Evelyn Cross: both booking treatments' copy and
// their checkout helpers, in one place.
//
// Copy specs: improve-v1/v1-one-time-BEs/copy/04/04-C1-booking-page-v2.md (page — the one-tick shape)
//             improve-v1/v1-one-time-BEs/copy/04/04-C2-booking-chat.md (chat)
// Change the doc first, then this file. Tests: teaReadingBooking.test.ts (reads the docs).
//
// ⭐ 04 is the deck's first PRICE LADDER. The price is NOT here and NOT in the page: it is the
// server's rung for today (GET /api/backend/offers/tea-reading/price, lib/ladderPrice.ts),
// printed where the spec says {{TODAYS_RUNG}}. The page posts back the DAY it printed
// (`quotedDay`); the server's clock decides the charge. ⛔ No other rung's price is ever printed.
//
// ⭐ NO CUP PICK (operator 2026-10-11). Which of the three readings she is sent is drawn at random
// by the SERVER at checkout (server/lib/be04Draw.ts). Neither screen asks, and nothing here sends
// a cup.
//
// ⚠ VOICE. Page: plain second person; the one tick and the bump label are in HER voice; Evelyn is
// named in the third person and never speaks. Chat: Evelyn speaks only in the stream; inside the
// card it is her voice, first person, talking to Evelyn.

import type { BackendCheckoutRequest } from './backendCheckout';
import type { LadderQuote } from './ladderPrice';
import { TEA_READING_BUMP_CENTS, priceLabel, type BookingTreatment } from '@shared/backendOffers';

export { TEA_READING_BUMP_CENTS, priceLabel } from '@shared/backendOffers';

export const TEA_READING_OFFER = 'tea-reading' as const;

/** The token the specs use where today's price goes. Never rendered — the screens swap in the rung. */
export const RUNG_TOKEN = '{{TODAYS_RUNG}}';

// ─── The page (04-C1 v2) ───────────────────────────────────────────────────────────────────

export const TAB_TITLE = 'The Turn — your tea-leaf reading | The Seer Within';

export const PAGE_HEADER = {
  eyebrow: 'Evelyn Cross',
  title: 'Your cup knows which week to speak in',
  subline: 'Evelyn reads where your seven symbols sat, and gives you the next 21 days, week by week.',
} as const;

// THE cup — the photo from the source letter, Evelyn's seven numbered marks and all
// (docs/04/product/images/esl/), cropped to 3:2 so it doesn't push the button off the first phone
// screen. Every buyer gets this one cup (operator, 2026-10-11); she has already seen it in the
// letter. The generated "full, unread cup" was rejected as unrealistic.
export const PAGE_IMAGE = {
  src: '/tea-reading/esl-cup-3x2.jpg',
  width: 1260,
  height: 840,
  alt: 'Your cup from the letter, seen from above on red velvet: the tea drunk, wet leaves on the inside wall, seven groups circled in red and numbered 1 to 7.',
  caption: 'Your cup from the letter. Where the seven sit is what Evelyn reads.',
} as const;

/** Beside the price. The price itself is today's rung, never a literal. */
export const PRICE_NOTES = ["Today's price · paid once", 'Your reading within 24 hours'] as const;

/** Display only — not checkboxes. */
export const CHECK_LINES = [
  'Which week to stay quiet, and which week to speak',
  "How long he's been pulling away, from where the bird sat",
  'Your 21 days on one page, free, to keep in sight',
] as const;

/** The ONE required tick, in her voice. */
export const READY_TICK = "Yes — I'm ready to stop guessing what to send.";

// The order bump — the Double Turning (operator 2026-10-11): Evelyn reads her cup a second time.
// ⭐ INTANGIBLE: nothing extra is delivered, so the copy promises nothing to look out for — same
// reading, same 21 days, same 24 hours. ⛔ Never pre-checked — a pre-selected paid add-on is a
// negative option under FTC and card-network rules. ⛔ Never tells her what to send.
export const BUMP = {
  label: 'Yes, double the strength of my reading',
  priceLabel: `+${priceLabel(TEA_READING_BUMP_CENTS)}`,
  note:
    'Evelyn reads your cup a second time and puts twice the strength into your reading. Same ' +
    'reading, same 21 days. It just works twice as hard: the quiet days hold better, and your one ' +
    'message lands harder.',
} as const;

export const CHECKOUT = {
  totalLabel: 'Total',
  button: 'TURN MY CUP',
  lockedHint: 'Tick the box above to continue.',
  trust: ["Paid once at today's price", 'Within 24 hours', "You don't need to send anything"],
  refundLabel: 'Refund policy',
  refundHref: '/refund',
  supportEmail: 'hi@theseerwithin.com',
} as const;

/** The price line's states other than "loaded" (04-C1 v2 "States of the price line"). */
export const PRICE_STATES = {
  loadingLabel: "Loading today's price",
  failed: "Today's price didn't load.",
  retry: 'Try again',
  cancelled: 'Nothing has been taken. Your cup is still here.',
} as const;

/** 409 price_changed, on the page. `label` is the NEW rung. */
export function pagePriceChangedNotice(label: string): string {
  return (
    `Today's price is now ${label}. It went up while this page was open. ` +
    `Press ${CHECKOUT.button} again to go on at ${label}.`
  );
}

export const WHAT_YOU_GET = {
  heading: 'What you get',
  items: [
    'Your reading: the next 21 days, week by week. Which weeks to stay quiet, which week to speak, and which week the bridge is for.',
    'How long the bird has been in flight, read from where it sat in your cup.',
    'The rim calendar, free: your 21 days on one page.',
    "A link to your reading, by email, within 24 hours. You don't need to send Evelyn anything.",
  ],
} as const;

// The ladder's reason-why (04-C1 statement 6, 04-E2 beat 14), out of her voice and into the
// page's. ⛔ Names no other rung's price.
export const WHY_THE_PRICE = {
  heading: "Why today's price is today's",
  body:
    "Your seven symbols don't change. Where they sit does: as the leaves dry, they lift and move. A " +
    "soft cup is an evening's work. A dry one has to be worked backwards, leaf by leaf, to where each " +
    "one sat, and that's more of Evelyn's night. So the price goes up each day after the letter, " +
    'until day four. You pay once, at the price on this page when you press the button.',
} as const;

// ─── The chat (04-C2) ──────────────────────────────────────────────────────────────────────

/** "confirm", never "confirmed" — she hasn't paid yet. */
export const CHAT_THREAD_TITLE = 'The Turn — confirm your booking';
export const CHAT_TAB_TITLE = `${CHAT_THREAD_TITLE} | The Seer Within`;

export type ChatBeat = { kind: 'evelyn'; lines: string[] } | { kind: 'gate' } | { kind: 'bump' };

// ⚠ ONE SENTENCE PER LINE — each line is its own turn. The letter re-argues nothing.
export const CHAT_SCRIPT: ChatBeat[] = [
  {
    kind: 'evelyn',
    lines: [
      'There you are, dear.',
      "Your cup's on my table, and I haven't turned it yet.",
      "Three things to agree to, and then I'll turn it.",
    ],
  },
  { kind: 'gate' },
  // No cup question (operator 2026-10-11: the server draws it). Straight on to the bump.
  { kind: 'evelyn', lines: ['Good.', 'One more thing before I start.'] },
  { kind: 'bump' },
];

// The card. Her voice, addressing Evelyn as "you". Statement 3 carries today's rung where the
// spec has {{TODAYS_RUNG}} — chatStatements() swaps it in.
export const CHAT_GATE = {
  heading: 'Before I turn your cup',
  deck: 'By booking this turning you agree to the following:',
  statements: [
    "Yes — you had it right, Evelyn. He's pulling away, and I've felt it for a while.",
    'Yes — turn my cup. I want my 21 days: when to speak, and when to stay quiet.',
    `Yes — I'll pay ${RUNG_TOKEN}, once. I know why it's today's price: as the leaves dry, turning them takes more of your night.`,
  ],
  totalLabel: 'Total today',
  button: 'TURN MY CUP',
  lockedHint: 'Tick all three to continue',
  smallPrint: "Paid once, at today's price. Your reading arrives within 24 hours. You don't need to send anything.",
} as const;

/**
 * The card's statements with today's price in place, as text segments so the screen can render
 * the price (or a blank bar while it loads) where the token was. ⛔ Never a guessed number.
 */
export function chatStatementParts(statement: string): { before: string; after: string } | null {
  const at = statement.indexOf(RUNG_TOKEN);
  if (at === -1) return null;
  return { before: statement.slice(0, at), after: statement.slice(at + RUNG_TOKEN.length) };
}

// The bump as Evelyn asks it — a question, not her checkbox label. The Double Turning is
// intangible: nothing extra arrives, so it promises nothing to look out for.
export const CHAT_BUMP = {
  body:
    'I can read your cup a second time, to put twice the strength into your ' +
    'reading. Same reading, same twenty-one days, just working twice as hard for you. Shall I do that?',
  priceLine: `+ ${priceLabel(TEA_READING_BUMP_CENTS)}`,
  accept: 'Yes, double the strength',
  decline: 'No, just my reading',
} as const;

/** 409 price_changed, in the chat. `label` is the NEW rung. */
export function chatPriceChangedNotice(label: string): string {
  return `Today's price moved to ${label} while we were talking. Press your answer again to go on at ${label}.`;
}

// Resume copy. Both land at the card, every box unticked; the bump is not restored.
// ⛔ Position is restored; consent never is.
export const CHAT_RESUME = {
  // ⛔ A refresh is not a return — she never left. No greeting for coming back.
  refreshed: ["I'm still here, dear.", "Your cup's on my table, not turned yet. Three things to agree to, and I'll turn it."],
  // Back from the secure checkout page — here she really did leave, and her live question is
  // whether she has been charged.
  cancelled: [
    'There you are again, dear.',
    "Your cup's still on my table, not turned. Nothing has been taken, and nothing's been started.",
  ],
} as const;

// ─── Helpers ───────────────────────────────────────────────────────────────────────────────

/** The Total line: today's rung, plus the bump while it is ticked. Printed with priceLabel. */
export function teaReadingTotalCents(rungCents: number, bump: boolean): number {
  return rungCents + (bump ? TEA_READING_BUMP_CENTS : 0);
}

/** The day a screen printed, if it printed one. */
function quotedDayOf(quote: Pick<LadderQuote, 'day'> | null | undefined): number | null {
  const day = quote?.day;
  return typeof day === 'number' && Number.isInteger(day) && day >= 1 ? day : null;
}

/**
 * What the button sends to beginBackendCheckout.
 *
 * ⛔ Posts NO price. `quotedDay` is the day the screen PRINTED (so a price that moved on while
 * the page was open is caught as 409 price_changed, never charged silently). ⛔ Posts NO cup —
 * the server draws one (operator 2026-10-11). Carries the letter's ?fn= and ?c= so fulfilment
 * knows her name and which letter she bought from.
 */
export function teaReadingCheckoutRequest(from: {
  treatment: BookingTreatment;
  firstName: string | null;
  letterCode: string | null;
  bump: boolean;
  quote: Pick<LadderQuote, 'day'> | null;
}): BackendCheckoutRequest {
  return {
    offer: TEA_READING_OFFER,
    treatment: from.treatment,
    bump: from.bump === true,
    firstName: from.firstName,
    letterCode: from.letterCode,
    quotedDay: quotedDayOf(from.quote),
  };
}
