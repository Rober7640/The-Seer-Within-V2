// OFFER format of the /fb-tarot retargeting page (`/fb-tarot/b?src=retarget`,
// arm `offer` of the retarget format test). Same audience as the chat and letter
// formats, but this one does NOT lead with the cards and does NOT teach. It leads
// softly with Evelyn, then puts the offer — 14% off for a returning reader — at
// the centre of the page.
//
// The Facebook ad in front of it (operator, 2026-10-16) reads:
//   "My daughter laughed when I told her I was speaking with an online psychic…
//    But when I shared my results, she couldn't believe it xxx"
//   Headline: "Evelyn is waiting for you"
// The page must feel like the natural next step from that ad, without repeating
// or extending the daughter story (no testimonials or invented people on the page).
//
// Beats: soft lead (Evelyn, not the cards) → the offer + 14% off, early →
// what she gets → how it works → why it's 14% off → two doubts → button →
// sign-off → P.S. + button.
//
// No 'ask me one thing first' door on this format: the chat would charge the
// full price while this page shows the returning-reader price, and the page's
// job is the offer.
//
// ⛔ Nothing personal is load-bearing. Her first name is a bonus on a cookie hit only.
//
// Copy rules: improve-v1/retargeting-test/01-copy-rules.md
// Review doc: improve-v1/retargeting-test/page/04-offer-copy.md

export interface RetargetOffer {
  /** Small line next to Evelyn's photo at the very top. Echoes the ad: "Evelyn is waiting for you". */
  eyebrow: string;
  /** The headline. Subtle — about her and Evelyn, not about cards, not a hard sell. */
  headline: string;
  /** Opening line when we know her first name (cookie hit only). Replaces intro[0]. */
  introNamed: (firstName: string) => string;
  /** 2–4 short paragraphs: the soft lead. No cards, no teaching. */
  intro: string[];
  /** Small badge on the offer box. `pct` arrives formatted, e.g. "14%". */
  badge: (pct: string) => string;
  /** Offer box title, e.g. the name of what she's buying. */
  offerTitle: string;
  /** 1–2 sentences inside the offer box, above the price. */
  offerSummary: string;
  /** Short label shown next to the struck-through full price and the new price, e.g. "Returning reader rate". */
  priceLabel: string;
  /** Heading for the "what you get" list. */
  includesHeading: string;
  /** 3–5 items she gets. Each must be something the live funnel already delivers. */
  includes: { title: string; text: string }[];
  /** Heading for the steps. */
  stepsHeading: string;
  /** Exactly 3 steps, from her tapping the button to the reading in her inbox. */
  steps: { title: string; text: string }[];
  /** Heading + 1–2 short paragraphs: the honest reason it's 14% off. */
  whyHeading: string;
  why: string[];
  /** 2 doubts. `q` is HER question in her words; `a` is Evelyn's answer. */
  doubts: { q: string; a: string[] }[];
  /** Sign-off line above the signature, then the signature. */
  signOff: string;
  signature: string;
  /** The P.S., 1–3 sentences. Starts with "P.S." — the page adds no label. */
  ps: string;
  /** Label above the first-name box. */
  nameLabel: string;
  /** Buy button label. `price` arrives formatted, e.g. "$30". */
  offerButton: (price: string) => string;
  /** One short line under the button: what she gets. No guarantee or refund claim. */
  offerNote: string;
  /** Shown at the top when she backs out of Stripe and lands back on the page. */
  cancelledNote: string;
}

// ── Copy notes (writer, 2026-10-16) ─────────────────────────────────────────────
// • No cards, no three-card story, no teaching. The lead is Evelyn: she kept her place,
//   the blame comes off before it lands, the worry, then ONE flat claim (something has
//   been holding love back / holding her money still) and the offer.
// • The offer describes only what the live V1 close already promises for the Energy
//   Clearing Ritual — the source for every fact is the table in 02-page-copy.md and
//   04-offer-copy.md. No guarantee, no refund, no countdown.
// • Price and percentage appear ONLY in badge(pct), the price box (priceLabel) and
//   offerButton(price). Everywhere else the discount is said in words ("you pay less
//   than a first-time reader"), so the copy stays true if the rate ever changes.
// • The daughter story from the ad is NOT repeated or extended (no testimonials or
//   invented people on the page).
// • ps already starts with "P.S." — the renderer must not add its own.

const LOVE: RetargetOffer = {
  eyebrow: 'Evelyn is waiting for you',
  headline: "I've kept your place at my table, dear",
  introNamed: (firstName) =>
    `${firstName}, it's Evelyn. You came to me with love on your mind, and then life pulled you away. That's no crime.`,
  intro: [
    "It's Evelyn, dear. You came to me with love on your mind, and then life pulled you away. That's no crime.",
    "I don't usually call anyone back. But you've been on my mind more than once since, and I was worried about you.",
    "You were close to what you came for. Something has been holding love back from you, and I'd like to clear it myself, tonight.",
    "And because you came back, you pay the returning reader's rate.",
  ],
  badge: (pct) => `${pct} off for you`,
  offerTitle: 'Your Energy Clearing Ritual',
  offerSummary:
    "Tonight I'll trace that hold to its root, cut it, and seal it. My written reading reaches you by email within 24 hours.",
  priceLabel: 'Returning reader rate',
  includesHeading: "What you'll get",
  includes: [
    { title: 'The clearing, done by me tonight', text: 'Two to three hours of slow work, and every minute of it is mine.' },
    { title: 'The hold traced, cut and sealed', text: "I follow it back to its root, cut it, and seal it so it can't come back." },
    { title: 'Your written reading by email', text: "Sent straight to your inbox. It tells you what I found and what I cleared." },
    { title: 'Guidance for the weeks ahead', text: 'Written for you and sent in the same reading, so you know what comes next.' },
    { title: 'Nothing for you to do', text: "There's nothing to light, hold or practise. I do the work." },
  ],
  stepsHeading: 'How it works',
  steps: [
    {
      title: 'Write your first name and tap the button',
      text: "You'll pay on a secure checkout page and give your email there, so I know where to send your reading.",
    },
    {
      title: 'Tonight, I do the work',
      text: "I clear the hold myself, two to three hours of it. You carry on with your evening.",
    },
    {
      title: 'Your reading lands in your inbox',
      text: 'What I found, what I cleared, and my guidance for the weeks ahead.',
    },
  ],
  whyHeading: 'Why you pay less',
  why: [
    "Because you've sat at my table before, and you came back to it. So I've set a lower rate for you.",
    "There's no catch, dear. I'm glad you're back.",
  ],
  doubts: [
    {
      q: 'Is this really for me?',
      a: [
        "You came to me with love on your mind, dear. That's who this is for.",
        "I clear what's been holding love back from you. You don't need the right words or the perfect question.",
      ],
    },
    {
      q: 'Do I have to do anything?',
      a: [
        "No, dear. Write your first name so I know who I'm clearing this for, and I'll take it from there.",
        "There's nothing to light, hold or practise. I do the work, and you read what I found.",
      ],
    },
  ],
  signOff: "I'm here when you're ready,",
  signature: 'Evelyn',
  ps: "P.S. You pay less than a first-time reader, because you came back. Tonight I'll clear what's been holding love back from you, and my written reading reaches you within 24 hours.",
  nameLabel: 'Who am I clearing this for?',
  offerButton: (price) => `Begin my clearing · ${price}`,
  offerNote: "Evelyn's Energy Clearing Ritual, done tonight. Your written reading by email within 24 hours.",
  cancelledNote: "You're back, dear. Your place is still here, and there's no hurry at all.",
};

// MONEY — same beats. What she came for is money held back, not a man.
const MONEY: RetargetOffer = {
  eyebrow: 'Evelyn is waiting for you',
  headline: "I've kept your place at my table, dear",
  introNamed: (firstName) =>
    `${firstName}, it's Evelyn. You came to me with money on your mind, and then life pulled you away. That's no crime.`,
  intro: [
    "It's Evelyn, dear. You came to me with money on your mind, and then life pulled you away. That's no crime.",
    "I don't usually call anyone back. But you've been on my mind more than once since, and I was worried about you.",
    "You were close to what you came for. Something has been holding your money still, and I'd like to clear it myself, tonight.",
    "And because you came back, you pay the returning reader's rate.",
  ],
  badge: (pct) => `${pct} off for you`,
  offerTitle: 'Your Energy Clearing Ritual',
  offerSummary:
    "Tonight I'll trace that hold to its root, cut it, and seal it. My written reading reaches you by email within 24 hours.",
  priceLabel: 'Returning reader rate',
  includesHeading: "What you'll get",
  includes: [
    { title: 'The clearing, done by me tonight', text: 'Two to three hours of slow work, and every minute of it is mine.' },
    { title: 'The hold traced, cut and sealed', text: "I follow it back to its root, cut it, and seal it so it can't come back." },
    { title: 'Your written reading by email', text: "Sent straight to your inbox. It tells you what I found and what I cleared." },
    { title: 'Guidance for the weeks ahead', text: 'Written for you and sent in the same reading, so you know what comes next.' },
    { title: 'Nothing for you to do', text: "There's nothing to light, hold or practise. I do the work." },
  ],
  stepsHeading: 'How it works',
  steps: [
    {
      title: 'Write your first name and tap the button',
      text: "You'll pay on a secure checkout page and give your email there, so I know where to send your reading.",
    },
    {
      title: 'Tonight, I do the work',
      text: "I clear the hold on your money myself, two to three hours of it. You carry on with your evening.",
    },
    {
      title: 'Your reading lands in your inbox',
      text: 'What I found, what I cleared, and my guidance for the weeks ahead.',
    },
  ],
  whyHeading: 'Why you pay less',
  why: [
    "Because you've sat at my table before, and you came back to it. So I've set a lower rate for you.",
    "There's no catch, dear. I'm glad you're back.",
  ],
  doubts: [
    {
      q: 'Is this really for me?',
      a: [
        "You came to me with money on your mind, dear. That's who this is for.",
        "I clear what's been holding your money still. You don't need a new plan or the perfect question.",
      ],
    },
    {
      q: 'Do I have to do anything?',
      a: [
        "No, dear. Write your first name so I know who I'm clearing this for, and I'll take it from there.",
        "There's nothing to light, hold or practise. I do the work, and you read what I found.",
      ],
    },
  ],
  signOff: "I'm here when you're ready,",
  signature: 'Evelyn',
  ps: "P.S. You pay less than a first-time reader, because you came back. Tonight I'll clear what's been holding your money still, and my written reading reaches you within 24 hours.",
  nameLabel: 'Who am I clearing this for?',
  offerButton: (price) => `Begin my clearing · ${price}`,
  offerNote: "Evelyn's Energy Clearing Ritual, done tonight. Your written reading by email within 24 hours.",
  cancelledNote: "You're back, dear. Your place is still here, and there's no hurry at all.",
};

export const RETARGET_OFFER: Record<'love' | 'money', RetargetOffer> = {
  love: LOVE,
  money: MONEY,
};
