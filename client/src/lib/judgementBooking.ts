// Offer 03 — Judgement Day: the booking page's copy, in one place.
//
// Copy specs: improve-v1/v1-one-time-BEs/copy/03/03-C1-booking-page.md (page)
//             improve-v1/v1-one-time-BEs/copy/03/03-C3-order-bump.md (bump)
// Workflow:   improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md steps A2 + A3
//
// ⚠ VOICE: the buyer's, first person, throughout — including the bump. Evelyn
// is named in the third person and never speaks on this page. One sentence of
// her talking collapses the commitment device.
//
// ⚠ 03 is an ACT offer, so two things differ from 02's booking copy:
//   · statement 2 authorises an INTERVENTION ("close it on my behalf"), not a
//     reading, and it carries the compliance position inside the buyer's own
//     words — "what she closes is my side of it, and I am not asking for
//     anything to be done to anybody";
//   · a NINTH element (P1) sits directly above the button: she agrees to reply
//     with her Entry. 03 cannot be fulfilled without that reply, and a paid
//     order we cannot fill is the dispute code we lose.
//
// ⛔ RECORDED CUT — statement 4 (decision D3, 2026-08-08). The spec's fourth
// statement is the scarcity rung: "I understand she holds one account at a
// time… if the week is spoken for, this page closes until it isn't." That
// promise needs the capacity cap (`S8`), which is not built, and 00e P4 is
// explicit — build it or don't write the line. So the page ships with FIVE
// statements, not six. Restore it verbatim from 03-C1 the day `S8` lands.

// PWYW floor, decision D4 (2026-08-08). The box ships EMPTY — no prefill —
// because "she sets no price" is the whole reason-why in statement 6, and a
// number already sitting in the field is a price. The $300 / $250 anchor in
// that statement does the work a prefill would have done.
export const JUDGEMENT_MIN_CENTS = 1700;

// Fixed price on a pay-what-you-want offer, and coherent: the WORKING is priced
// by what she can give; the instructional is a defined product with a defined
// price (03-C3).
export const JUDGEMENT_BUMP_CENTS = 1277;

// ⛔ 03's bump gets its OWN key. n8n exact-matches this string to decide what to
// fulfil, so reusing V1's `double_reading` would post her a second reading
// instead of The Unburdening.
export const JUDGEMENT_BUMP_PRODUCT_KEY = 'unburdening';

// ⚠ "CONFIRM", NEVER "CONFIRMED" *(operator, 2026-08-09)*. She clicked "Open my
// page" in the letter, so a booking is already in flight and this screen is
// where she finishes it — the verb is true the moment she lands, and it names
// the job. It is also the same move the rest of the copy makes by never saying
// "buy": booking, permission, request, close, take.
//
// ⛔ The NOUN is what must not appear before the money. "Booking confirmation",
// "confirmed", "your order" — those describe a state that does not exist until
// she has paid, and they are the words the screen AFTER the money needs.
export const PAGE_HEADER = {
  title: 'Judgement Day — confirm your booking',
  deck: 'By requesting this working you agree to the following:',
} as const;

// What the browser tab says, on BOTH treatments. Without it a tab she left open
// reads "The Seer Within - Psychic Chat", which is the wrong product.
export const TAB_TITLE = `${PAGE_HEADER.title} | The Seer Within`;

// ⚠ The chat's thread subject — a thin strip under Evelyn's name, the same
// words the page carries as its H1 *(operator asked for a title, 2026-08-09)*.
// It is what she is here to do, not a receipt: see the tense rule above.
//
// ⚠ Identical to the page's title on purpose. The two treatments are an A/B on
// MECHANISM; if they also name the offer differently, the test measures two
// things at once.
export const CHAT_THREAD_TITLE = PAGE_HEADER.title;

// ---------------------------------------------------------------------------
// THE TWO STEPS *(operator, 2026-08-09 — approved wireframe)*
//
// The page is split. It was measured at 3,450px on a phone — 4.1 screens of
// unbroken commitment copy to reach the button — and the Entry form would have
// taken it to ~5. So each screen now asks for ONE KIND of thing:
//
//   1 · AGREE  the four non-money statements. Four taps, no keyboard, no price
//   2 · GIVE   her request, the price rung, the amount, the gift, the bump
//   3 · ENTER  her story — but that lives AFTER the money, on the thank-you
//              screen, and is not built yet
//
// ⚠ The copy did not move between blocks. It was already grouped this way in
// this file; the split only decides which group is on screen.
//
// ⛔ The step is in the URL (`?step=give`) so the browser's own Back walks
// between the two instead of leaving the funnel. Her ticks survive that Back —
// but a COLD arrival at step 2 (refresh, deep link) goes back to step 1, because
// consent that was never given in this page's lifetime must not be assumed. Same
// rule the chat already keeps: position is restored, consent is not.
// ---------------------------------------------------------------------------

export const PAGE_STEP_ONE = {
  tag: 'Step one of two',
  name: 'Agree',
  // ⚠ NOT "Next" and not "Continue". It is her own sentence, in her own voice,
  // and it carries her forward rather than submitting a form.
  button: 'GO ON, EVELYN',
  // Says out loud what the screen costs her. The objection at a step 1 of 2 is
  // "how much of this is there", and both halves of the answer are here.
  note: 'Four taps. Nothing to type, and no price yet.',
  lockedHint: 'Agree to all four above to continue',
} as const;

export const PAGE_STEP_TWO = {
  tag: 'Step two of two',
  name: 'Give',
  lockedHint: 'Agree to the statement above to continue',
  amountHint: 'Enter what you will give to continue',
  // ⚠ 03's page-treatment reassurance loses the old third clause, *"Reply to
  // the confirmation email to begin."* — the reply is no longer how this begins.
  // The Entry is a screen in the funnel now, not an email she has to answer.
  // ⚠ The CHAT still carries the old line, because its gate still asks her to
  // reply; the two converge when the chat is split.
  reassurance: 'One payment, whatever you choose. Nothing recurring.',
} as const;

export interface PageStatement {
  lead: string;
  body: string;
}

// Statements 1, 2, 3 and 5 of the spec. See the recorded cut above for 4;
// statement 6 is PRICE_STATEMENT below, because it carries the amount field.
export const PAGE_STATEMENTS: PageStatement[] = [
  {
    // ① P8 — affirm the READER was right. The cheapest rung on the ladder.
    lead: 'Yes — you read me correctly, Evelyn.',
    body:
      'There is an account open, I know exactly whose it is, and I have been carrying it a long time.',
  },
  {
    // ② the permission, and the compliance position, in her own words.
    lead: 'Yes — I give Evelyn Cross permission to close it on my behalf.',
    body:
      'To make the Entry in my name, move the weight off me, and rule the line. I understand that ' +
      'what she closes is my side of it, and that I am not asking for anything to be done to anybody.',
  },
  {
    // ③ accept its weight.
    lead: 'Yes — this is skilled work and I am not treating it lightly.',
    body:
      'A closed account does not reopen. I am asking for this because I want it finished, not ' +
      'because I want it revisited.',
  },
  {
    // ⑤ ACT offers cite the RITUAL'S OWN duration, not preparation time.
    lead: 'Yes — I understand this takes three nights and cannot be hurried.',
    body:
      'The Entry, the Transfer, the Closing — one a night. A debt entered and closed the same night ' +
      'is not closed. My record reaches me after the third night.',
  },
];

// ⑥ The price rung. P2: a pay-what-you-want statement asserts nothing on its
// own — "I will contribute what I am able" has no proposition to agree to — so
// the reason-why IS the thing agreed to here. The last clause of `body` is the
// load-bearing one: at a blank amount field her live question is *how much, and
// will less get me less?*, and it is answered in the same breath.
//
// ⚠ The anchor sits AFTER the reason, in italics, in her voice. Leading with
// $300 makes the page a negotiation; leading with why there is no price makes
// the anchor context she is repeating rather than a number she is resisting.
export const PRICE_STATEMENT = {
  lead: 'Yes — I understand why Evelyn sets no price for this.',
  body:
    'A debt settled with money has been bought, not closed, and I would be swapping one open ' +
    'account for another. So I will give what I am able, and it will not change what she does. She ' +
    'does not work harder for more or less carefully for less; the three nights are the three nights.',
  anchor:
    'Others pay $300 for a working of this length, and she has been urged to hold it at $250 to ' +
    'keep it exclusive. She has declined to. I will contribute what is right for me.',
  amountLabel: 'I will give:',
} as const;

// ⛔ THE FLOOR IS NEVER ANNOUNCED — on either treatment *(operator, 2026-08-09)*.
//
// The page used to print "Minimum $17 — below that the card charges take more
// of it than she does." That line is deleted. A stated minimum does not read as
// a limit, it reads as THE PRICE: put a number under an empty box and the box
// fills with that number. It also contradicts the statement directly above it,
// which has just told her there is no price.
//
// The floor still holds. It speaks only once she is under it, and then it
// explains itself and blames the rails rather than her.
//
// ⚠ One string, shared by the page and the chat, because the two treatments no
// longer differ here — they say the same thing at the same moment.
export const FLOOR_VIOLATION = '$17 is the smallest amount that will go through.';

// ⑦ The request, ending on the brief's PROMISE in her own words. The button
// completes this sentence (P3).
export const PAGE_REQUEST = [
  'Evelyn — you have my say-so.',
  'Open my page, make the Entry, and take this off my hands. Move it off my name, rule the line ' +
    'under it, and seal it so it does not come back.',
  'I am not asking you to make me happy about it and I am not asking for an apology I am never ' +
    'going to get.',
  'I am asking to put it down —',
  'so that I get into bed and nothing comes up.',
];

// ⑨ P1 — THE NINTH ELEMENT, retired from the page *(operator, 2026-08-09)*.
//
// It read: "And I understand what happens next / After I confirm, I will reply
// to Evelyn's email and tell her who it is, what they did, and how long ago…
// that reply is the Entry — it is the first of the three nights, not paperwork
// — and that she cannot begin without it."
//
// ⛔ It is not softened and not moved down the page — the whole mechanism it
// described is gone. The Entry is no longer a reply to an email; it is screen 3
// of this funnel, a form she fills in after the money. So the agreement to
// reply has nothing left to agree to.
//
// ⚠ WHAT THIS OWES: until the Entry screen is built, this page tells her
// nothing about the part only she can do. That gap closes with the thank-you
// rewrite and must not be left open past it.
//
// ⚠ The CHAT still holds the email version, in `CHAT_GATE.statements[3]`. It
// goes the same way when the chat is split.

// ⑧ P9 — the free gift is RECEIVED and thanked for BEFORE it arrives, and it is
// described by its JOB (something to do during the private window) rather than
// neutrally. ⚠ Binding on 03-P3 and on the +24h abandon nudge, which already
// promised this exact shape.
export const PAGE_GIFT = [
  'And I understand that with the closing she will send me Nine Nights of Water — the nine-night ' +
    'practice for the days when the change is still private, and I would otherwise be lying awake ' +
    'wondering whether anything had happened at all.',
  "Thank you, Evelyn. I'll keep to it properly.",
];

// The order bump (03-C3), inline beside the total.
//
// ⚠ Adjacent, not identical: the working closes a DEBT, this sets down what
// carrying it COST her. That is why it doesn't cannibalise — a woman can have
// her ledger ruled off and still be rehearsing in the shower on Thursday.
// ⚠ She burns what it COST her, never the target's name. The exclusion lives in
// her own voice — "not their name, not what they did" — which is the safest
// place for it. Burning a named person is a different product from this one.
export const BUMP = {
  headline: 'Yes — I want the replaying to stop as well, and stop for good.',
  priceLabel: '+$12.77',
  paragraphs: [
    'Closing the account takes the debt off my name. It does not, on its own, stop me running the ' +
      'conversation again in the car. So yes — send me The Unburdening too.',
    'The debt is one thing. What it cost me is another, and that part is still mine: the years of ' +
      'being careful, the friendships I got quieter in, the version of myself I put away because it ' +
      "wasn't useful any more. Nobody owes me that back. That's the part I have to set down myself.",
    'The instructions are short and there is nothing to work out. One sitting, the night my page is ' +
      'sealed. I write out what it cost me — not their name, not what they did — and then I burn ' +
      'that page and watch it go.',
    'Twenty minutes. Once.',
  ],
  addLabel: 'Add The Unburdening — $12.77',
} as const;

// ---------------------------------------------------------------------------
// CHAT treatment — Evelyn talks, and the close is ONE inline gate card.
//
// The A/B challenger to the page above, exactly as 02 has one. Same mechanism
// as `02-C1b`: the buyer has NO conversational turn, statements are ticked
// inside the card and never post to her side of the stream, and the button does
// not exist until every agreement is made.
//
// ⚠ Two things are 03's alone, and both break a rule 02's chat could keep:
//
//   1. THERE IS A TEXT INPUT. 02's flow has none — it asks her nothing. 03 is
//      pay-what-you-want, so the amount is the one thing only she can supply.
//   2. THE GATE HOLDS FOUR STATEMENTS, not three. The fourth is the intake
//      agreement (P1), and on an ACT offer it is not optional: without her
//      reply there is no product to make. Ticking it is stronger than being
//      told it, and it happens before the money rather than after.
//
// ⛔ THE FLOOR IS NOT ANNOUNCED *(operator, 2026-08-08)*. No "minimum $17"
// under the field. A stated minimum is a price, and she has just ticked a
// statement saying there isn't one. The floor still exists — it speaks only if
// she goes under it, and then it explains itself.
// ---------------------------------------------------------------------------

export type ChatBeat = { kind: 'evelyn'; lines: string[] } | { kind: 'gate' } | { kind: 'bump' };

// ⚠ The letter sold. Nothing here re-argues the offer — this is a greeting and
// a close, and everything between them is deliberately absent.
export const CHAT_SCRIPT: ChatBeat[] = [
  {
    kind: 'evelyn',
    lines: [
      'You came.',
      "Then let me take it down properly, dear. Four things to agree to, and I'll open your page tonight.",
    ],
  },

  { kind: 'gate' },

  // ⚠ The bump is its own TURN, after she has committed — the strongest moment
  // to ask, and it keeps the gate to the four agreements and nothing else.
  // ⛔ Both actions go STRAIGHT to checkout. No third confirm step: this already
  // sits between the CTA and Stripe, the most expensive place to stall someone.
  {
    kind: 'evelyn',
    lines: [
      "Good. Your page is open, and your name goes at the top of it tonight.",
      'One thing before I start, dear.',
    ],
  },
  { kind: 'bump' },
];

// ⚠ VOICE inside the card: the BUYER's, first person, addressing Evelyn as
// "you". Evelyn has just finished speaking in the stream above it and does not
// speak inside the card.
export const CHAT_GATE = {
  heading: 'Before I open your page',
  deck: 'By requesting this working you agree to the following:',

  statements: [
    // ① P8 — affirm the READER was right. The cheapest rung.
    'Yes — you read me correctly, Evelyn. There is an account open and I have carried it a long time.',
    // ② the permission, and the compliance position, in her own words.
    'Yes — I give you permission to close it on my behalf. What you close is my side of it, and I am not asking for anything to be done to anybody.',
    // ③ P2 — the money rung. A pay-what-you-want statement asserts nothing on
    // its own, so the reason-why IS what she agrees to, and the last clause
    // answers "will less get me less?" before she reaches the field.
    'Yes — I understand why you set no price for this. A debt settled with money has been bought, not closed. I will give what I am able, and it will not change what you do.',
    // ④ P1 — the intake agreement. ⛔ 03 cannot be fulfilled without this.
    'Yes — I will reply to your email and tell you who it is, what they did, and how long ago. That reply is the Entry, and you cannot begin without it.',
  ],

  amountLabel: 'I will give:',
  // ⛔ Shown ONLY when what she typed is under the floor. Never on arrival.
  floorViolation: FLOOR_VIOLATION,
  lockedHint: 'Check all four to continue',
  amountHint: 'Say what you will give to continue',
} as const;

// The bump, as Evelyn asks it. ⚠ Completely different register from `BUMP`
// above: that one is a checkbox label in the buyer's voice, right for a page
// and wrong in a chat. Here Evelyn speaks, first person, and the ask is a
// QUESTION — the same shape as the live V1 bump card.
export const CHAT_BUMP = {
  body:
    'Closing the account takes the debt off your name. It will not, on its own, stop you running ' +
    'the conversation again in the car. The Unburdening is what sets that part down — one sitting, ' +
    'the night your page is sealed, twenty minutes and no working out. Shall I send it with your ' +
    'record?',
  priceLine: '+ $12.77',
  accept: 'Yes, send it with my record',
  decline: 'No, just the closing',
} as const;

// Resume copy. Both paths land in the SAME place — the gate, with the bump not
// shown — because V1's rule is that a restored session must never carry two
// live purchase actions.
//
// ⛔ The checkboxes AND the amount come back empty on every path. Position is
// restored; consent is not, and neither is the number she chose. Re-ticking
// costs seconds, and restoring an agreement she did not re-give hollows out the
// device and is the wrong side of a chargeback.
export const CHAT_RESUME = {
  // ⛔ A REFRESH IS NOT A RETURN *(operator, 2026-08-09)*. She reloaded the tab;
  // she never went anywhere. "You came back" claims an absence that did not
  // happen, and greeting her for it is the moment the chat stops sounding like
  // the woman who wrote the letter. This is a CONTINUATION, not a greeting:
  // Evelyn is simply still there, and says what is true of the page.
  //
  // ⚠ It also has to carry the instruction, because the greeting beat is not
  // replayed on a resume and she lands straight at the gate.
  //
  // ⚠ The furniture is the letter's own — the ledger, her page, nothing written
  // on it yet. The old line ("I've kept your place. Nothing is lost.") was
  // waiting-room language from a different business.
  refreshed: [
    'Still here, dear.',
    'Your page is where you left it, and nothing is written on it yet. Four things to agree to.',
  ],

  // Returned from Stripe without paying. ⚠ HERE she really did leave and come
  // back, which is what makes the line mean something — it is kept for the one
  // door it is true of. She has committed twice by this point, so this is the
  // most valuable person in the flow to not fumble. No guilt, no re-selling:
  // the door held open, and the truthful state of the work.
  //
  // ⚠ And the money is named. She has just walked off a payment page, so her
  // live question is whether she has been charged. Answering it unasked costs
  // nothing and is the difference between a return and a support email.
  cancelled: [
    'You came back.',
    "I've kept the book open at your page, dear. Nothing has been started, and nothing has been taken.",
  ],
} as const;

// Shared by both treatments. ⚠ The hints are NOT here — the page's are
// per-step (`PAGE_STEP_ONE` / `PAGE_STEP_TWO`) and the chat's are in
// `CHAT_GATE`, because each gate locks for its own reason.
export const CHECKOUT = {
  totalLabel: 'Total today',
  // P3 — completes the request paragraph's own sentence. The page never says
  // "buy": booking, permission, request, close, take.
  button: 'TAKE THIS OFF MY HANDS',
  // ⚠ CHAT ONLY. The chat's gate still asks her to reply by email, so this
  // still ends on that instruction. The page's version is in `PAGE_STEP_TWO`
  // and has dropped it — see the retired ninth element above.
  reassurance:
    'One payment, whatever you choose. Nothing recurring. Reply to the confirmation email to begin.',
} as const;
