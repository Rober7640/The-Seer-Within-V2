// The seven-card draw at the heart of the reading (spec §1, §2 step 5).
//
// Seeded off the order's session id, so the same order always draws the same
// seven cards — a retry or regenerate never changes what she was shown. Card
// art is addressed by SLUG derived from the card name here, never from anything
// the model writes (spec §2 step 10 / 02 lesson 9): the model can't conjure a
// 403'd image into the PDF.

import { seededRng, seededShuffle } from './seededRandom';

const ASSET_BASE = 'https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/tarot-rws';

/** The seven questions, one per card, in order (spec §1). */
export const POSITION_QUESTIONS: readonly string[] = [
  'Who he is',
  'His first initial',
  'His last initial',
  'Someone new, or someone you already know',
  'Where you are likely to meet',
  'When',
  'What he is like (and what he looks like)',
];

/** Standard 78-card Rider–Waite–Smith deck. */
export const RWS_DECK: readonly string[] = [
  // Major Arcana
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
  'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
  'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
  'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun',
  'Judgement', 'The World',
  // Minor Arcana — Wands
  'Ace of Wands', 'Two of Wands', 'Three of Wands', 'Four of Wands', 'Five of Wands',
  'Six of Wands', 'Seven of Wands', 'Eight of Wands', 'Nine of Wands', 'Ten of Wands',
  'Page of Wands', 'Knight of Wands', 'Queen of Wands', 'King of Wands',
  // Cups
  'Ace of Cups', 'Two of Cups', 'Three of Cups', 'Four of Cups', 'Five of Cups',
  'Six of Cups', 'Seven of Cups', 'Eight of Cups', 'Nine of Cups', 'Ten of Cups',
  'Page of Cups', 'Knight of Cups', 'Queen of Cups', 'King of Cups',
  // Swords
  'Ace of Swords', 'Two of Swords', 'Three of Swords', 'Four of Swords', 'Five of Swords',
  'Six of Swords', 'Seven of Swords', 'Eight of Swords', 'Nine of Swords', 'Ten of Swords',
  'Page of Swords', 'Knight of Swords', 'Queen of Swords', 'King of Swords',
  // Pentacles
  'Ace of Pentacles', 'Two of Pentacles', 'Three of Pentacles', 'Four of Pentacles', 'Five of Pentacles',
  'Six of Pentacles', 'Seven of Pentacles', 'Eight of Pentacles', 'Nine of Pentacles', 'Ten of Pentacles',
  'Page of Pentacles', 'Knight of Pentacles', 'Queen of Pentacles', 'King of Pentacles',
];

export interface DrawnCard {
  position: number; // 1..7
  question: string;
  card: string;
  slug: string;
  imageUrl: string;
}

/** card name → URL-safe slug: lowercased, spaces→dashes, non-alphanumerics stripped. */
export function cardSlug(card: string): string {
  return card
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Draw the seven cards for an order. Deterministic in `sessionId`: same id →
 * same seven cards, same order, always. Cards are unique (drawn without
 * replacement from the 78-card deck).
 */
export function drawSeven(sessionId: string): DrawnCard[] {
  const rng = seededRng(`${sessionId}|draw`);
  const shuffled = seededShuffle(RWS_DECK, rng);
  return POSITION_QUESTIONS.map((question, i) => {
    const card = shuffled[i];
    const slug = cardSlug(card);
    return {
      position: i + 1,
      question,
      card,
      slug,
      imageUrl: `${ASSET_BASE}/${slug}.jpg`,
    };
  });
}
