// Offer 02 — Twin Flame Tarot booking, copy for BOTH candidate treatments.
//
// One source of truth so the page/chat comparison can't drift on wording.
// Copy spec: improve-v1/v1-one-time-BEs/copy/02/02-C1-booking-page.md
//   - the PAGE treatment is the section above the divider (six statements)
//   - the CHAT treatment is `02-C1b` below it (three statements + the request)
//
// ⚠ The two treatments deliberately differ in statement COUNT as well as
// format: the page is faithful to the source package, the chat is faithful to
// the 3-point commitment gate in docs/intel/how-i-built-a-60k-per-month-astrology-offer.md.
// That is a product comparison, not a clean single-variable experiment.

// ⛔ The prices are NOT defined here. They live in shared/backendOffers.ts, which is
// also what the checkout endpoint charges from — one number, so the page and the card
// can never disagree. Re-exported so this file stays the one import a screen needs.
export {
  TWIN_FLAME_PRICE_CENTS,
  TWIN_FLAME_BUMP_CENTS,
  TWIN_FLAME_BUMP_PRODUCT_KEY,
} from '@shared/backendOffers';

export const BUMP = {
  headline: 'YES! I Want To Remove Negative KARMA forever!',
  body:
    "Use my Astro Force ritual to dispel the negative karma you have built up through your life — " +
    'the karma that is preventing your good luck and bringing misfortune in. A simple, clear ' +
    'instructional you can start tonight.',
  priceLabel: '+$12.77',
} as const;

// CHAT treatment only. Modelled on the live fb-tarot bump card, which is not in
// this repo on any branch — replicated from a screenshot of
// the-seer-within-v2-development.up.railway.app/fb-tarot/chat.
//
// ⚠ The register is completely different from `BUMP` above, and deliberately.
// The source's headline (*"YES! I Want To Remove Negative KARMA forever!"*) is a
// CHECKBOX LABEL in the buyer's voice — right on the page, wrong in a chat.
// Here it is Evelyn speaking: no headline, no capitals, first person, and the
// ask is a QUESTION. That is exactly what the live card does — *"Before I
// prepare your clearing… I'm also sensing something blocking your Money path.
// Want me to reveal that too?"* — and it is why the card reads as the
// conversation continuing rather than an ad interrupting it.
export const CHAT_BUMP = {
  // Same shape as the live one: before I do X · I'm also sensing Y ·
  // want me to Z too? · just $N more.
  // ⚠ Kept short on purpose. Centred serif italic is the hardest setting to read
  // in the whole flow, and our panel is max-w-lg — narrower than the live card
  // this is modelled on — so the same copy wraps to more lines here.
  // ⚠ "the working that lifts it", not "want me to clear it". 02-C4 is an
  // INSTRUCTIONAL — she performs the ritual, Evelyn supplies it. Copy that
  // promises Evelyn does the clearing and then delivers a DIY working is a
  // refund driver, and the source's own bump says so plainly: "a simple and
  // clear instructional you can start tonight."
  body:
    'Before I lay your twelve… there is old karma sitting over your luck, and it will dull whatever ' +
    'they show you. Want the working that lifts it? Just $12.77, and you can start tonight.',
  priceLine: '+ $12.77',
  totalLine: '$47.77 total',
  accept: 'Yes, clear it first',
  decline: 'No, just my reading',
} as const;

export const CHECKOUT = {
  totalLabel: 'Total today',
  button: 'LAY MY TWELVE',
  reassurance:
    'One payment. Nothing recurring. Your reading reaches you within 24 hours.',
} as const;

// ---------------------------------------------------------------------------
// PAGE treatment — six agreement statements, price in the sixth.
// ---------------------------------------------------------------------------

export const PAGE_HEADER = {
  title: 'The Twin Flame Tarot Reading — your booking',
  deck: 'By booking this reading you agree to the following:',
} as const;

export interface PageStatement {
  lead: string;
  body: string;
}

export const PAGE_STATEMENTS: PageStatement[] = [
  {
    lead: 'Yes — you were right, Evelyn.',
    body: 'You read it correctly, and I want to see the rest of what you saw.',
  },
  {
    lead: 'Yes — I give Evelyn Cross permission to draw my destiny.',
    body:
      'The full twelve, one to each house, on the strength of the three that came away in her hand. ' +
      'My future is already drawn. I would rather see it than be surprised by it.',
  },
  {
    lead:
      'Yes — I understand this is done by a professional, and that its instructions are not to be taken lightly.',
    body: 'If the spread asks something of me, I am asking for it because I intend to act on it.',
  },
  {
    lead: 'Yes — I understand Evelyn does not lay a twelve on request.',
    body:
      'She lays it when a first draw asks for one, and mine asked. I understand a draw that comes ' +
      'away on its own may not come to me twice.',
  },
  {
    lead: 'Yes — I understand this is the heaviest reading she does.',
    body:
      'It takes the whole of a night and it cannot be hurried. My reading will take a minimum of ' +
      '24 hours to reach me.',
  },
  {
    lead: 'Yes — I agree to pay a modest one-time sum of $35.00 for this.',
    body:
      'I understand it is priced the way it is because it is twelve trumps drawn out of the ' +
      'twenty-two, laid one to a house, and because she keeps the whole of a night for it.',
  },
];

export const PAGE_REQUEST = [
  'Evelyn — you are now in possession of my complete spread.',
  'I therefore ask you to lay my twelve and produce my complete reading. Tell me plainly what my ' +
    'Tower is standing on: its name, its face, and how close it is. Tell me which of the two the ' +
    'Lovers handed me, and which door the windfalls come through.',
  'Give me the day, the door, and who is standing at it —',
  'so that I stop finding out last.',
];

// ⚠ The free gift is the FIRST HOUSE, sent tonight — not the 28-night ledger.
// The ledger still ships, unannounced, inside the product email (02-P3 / 02-P1).
export const PAGE_GIFT =
  'And I understand that you will also lay my first house tonight — the house of myself — and send ' +
  'me that card free of charge, long before the rest of the spread is down. Thank you, Evelyn. ' +
  "I'll be watching for it.";

// ---------------------------------------------------------------------------
// CHAT treatment — Evelyn talks, and the close is ONE inline gate card holding
// all three statements. *(operator, 2026-08-06 — chosen over per-statement taps)*
//
// ⚠ The buyer has NO conversational turn. Statements are ticked inside the card
// and never post to her side of the stream. An earlier build had each statement
// tapped as her own message; that is superseded, and the mechanism is now the
// same one running live on fb-palm as `35_palm_gate`
// (client/src/components/CommitmentGateCard.tsx) — three agreements, and the
// button does not exist until all three are made.
// ---------------------------------------------------------------------------

export type ChatBeat =
  | { kind: 'evelyn'; lines: string[] }
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'gate' }
  | { kind: 'bump' };

// ⚠ STRIPPED to a greeting and the gate *(operator, 2026-08-06)*. Everything
// between them is gone: the scarcity and SLA lines, the face-down hero, the
// first-house gift, and her request. The letter already did all of that work,
// and re-doing it here is the "nothing re-argues the offer" rule being broken by
// its own author.
// ⛔ Two consequences, deliberate and recorded: the free gift is no longer
// PROMISED anywhere pre-purchase (P9's thank-before-receiving device is spent),
// and the 24h SLA is no longer stated before payment — it survives only in the
// line under the button.
export const CHAT_SCRIPT: ChatBeat[] = [
  {
    kind: 'evelyn',
    lines: [
      'You came.',
      'Then let me take this down properly, dear. Three things to agree to, and I start tonight.',
    ],
  },

  { kind: 'gate' },

  // ⚠ The bump is its own TURN, after the purchase button, not a tick inside
  // the gate *(operator, 2026-08-06)*. She has already committed before she is
  // asked, which is the strongest moment to ask — and it keeps the gate to the
  // three agreements and nothing else.
  // ⛔ Cost of the move, recorded: this puts an interstitial between the CTA and
  // Stripe. Anyone who stalls here is lost after committing, which is the most
  // expensive place in the funnel to lose someone. Both actions therefore go
  // STRAIGHT to checkout — no third confirm step — and both state their total.
  {
    kind: 'evelyn',
    lines: [
      "Good. Your twelve are booked and I'll lay them tonight.",
      'One thing before I start, dear.',
    ],
  },
  { kind: 'bump' },
];

// The inline gate card. Modelled on the source's checkout page and on
// CommitmentGateCard.tsx — three agreements, then her request, then the money.
// ⚠ VOICE: everything inside this card is the BUYER's, first person. Evelyn is
// named in the third person here and does not speak inside the card. She has
// just finished speaking in the stream above it.
export const CHAT_GATE = {
  heading: 'Before I lay your twelve',
  deck: 'By booking this reading you agree to the following:',

  // ⚠ Tightened to roughly one line each, because the card is now the entire
  // experience rather than the end of a run. Each still carries a proposition
  // you can assent to — 00e P2's test, and the thing 03's "I will contribute
  // what I am able" failed.
  statements: [
    // ① affirms the READER was right — the cheapest rung, and it opens the
    // relationship debt every later statement repays (00e P8).
    'Yes — you were right, Evelyn. I want to see the rest of what you saw.',
    // ② the permission. The big idea, and the thing actually being bought.
    'Yes — I give you permission to draw my destiny. The full twelve, one to each house.',
    // ③ the price. ⚠ FIRST MENTION OF MONEY IN THE FUNNEL, and it is the third
    // rung rather than the sixth — a recorded deviation from 00e §3 rule 2,
    // which says five agreements must precede it. The short reason-why stays:
    // 02 is fixed-price so P2 does not force one, but it still earns its place.
    'Yes — I agree to pay a modest one-time sum of $35.00. Twelve trumps, and a whole night of your work.',
  ],

  lockedHint: 'Check all three to continue',
} as const;

// Resume copy. Both paths land in the SAME place — the gate, button live, bump
// not shown — because V1's rule is that a restored session must never carry two
// live purchase actions (useConversation.ts:322-327, 340-343). Tapping the
// button replays the bump turn from the top.
//
// ⛔ The checkboxes come back UNTICKED on every path. Position is restored,
// consent is not: re-ticking costs seconds, and restoring an agreement she did
// not re-give hollows out the device and is the wrong side of a chargeback.
export const CHAT_RESUME = {
  // Plain refresh, or she navigated away and came back. Short — she has not
  // done anything that needs acknowledging.
  refreshed: ['You came back.', "I've kept your place, dear. Nothing is lost."],

  // Returned from Stripe without paying — cancelled, or the browser back button.
  // She has committed twice by this point, so this is the most valuable person
  // in the flow to not fumble. No guilt, no re-selling: just the door held open.
  cancelled: [
    'You came back.',
    "I've been holding it for you. The offer still stands, and I have not started yet.",
  ],
} as const;
