// Major Arcana — Rider-Waite-Smith deck (public domain via Wikimedia Commons)

export interface TarotCard {
  id: number;
  name: string;
  imageUrl: string;
  keywords: string[];
  meaning: string; // sent to Claude as context when card is drawn
}

// Wikimedia Commons Special:FilePath redirects — reliable, no hash guessing needed
const WC = (filename: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}`;

export const MAJOR_ARCANA: TarotCard[] = [
  {
    id: 0,
    name: "The Fool",
    imageUrl: WC("RWS_Tarot_00_Fool.jpg"),
    keywords: ["new beginnings", "innocence", "spontaneity", "leap of faith"],
    meaning: "The Fool represents new beginnings, a leap of faith, and unbounded potential. He steps off the cliff with trust, not recklessness — a soul ready to experience life without the weight of the past.",
  },
  {
    id: 1,
    name: "The Magician",
    imageUrl: WC("RWS_Tarot_01_Magician.jpg"),
    keywords: ["willpower", "manifestation", "skill", "resourcefulness"],
    meaning: "The Magician says: you have everything you need. This is a card of focused will, of turning thought into reality. The tools are on the table — the question is whether you'll use them.",
  },
  {
    id: 2,
    name: "The High Priestess",
    imageUrl: WC("RWS_Tarot_02_High_Priestess.jpg"),
    keywords: ["intuition", "mystery", "inner knowing", "the unconscious"],
    meaning: "The High Priestess guards the veil between worlds. She speaks of deep intuition, of truths that can't be reasoned — only felt. Something is being withheld, or not yet ready to be revealed.",
  },
  {
    id: 3,
    name: "The Empress",
    imageUrl: WC("RWS_Tarot_03_Empress.jpg"),
    keywords: ["abundance", "fertility", "nurturing", "creativity"],
    meaning: "The Empress is the embodiment of fertile abundance. She speaks to creativity, nurturing, and the natural cycles of growth. Whatever you've been tending is ready to bloom.",
  },
  {
    id: 4,
    name: "The Emperor",
    imageUrl: WC("RWS_Tarot_04_Emperor.jpg"),
    keywords: ["authority", "structure", "stability", "father figure"],
    meaning: "The Emperor demands order, discipline, and structure. This card can represent an authority figure in your life, or the need to establish your own foundations before moving forward.",
  },
  {
    id: 5,
    name: "The Hierophant",
    imageUrl: WC("RWS_Tarot_05_Hierophant.jpg"),
    keywords: ["tradition", "spiritual guidance", "conformity", "institutions"],
    meaning: "The Hierophant speaks of institutions, tradition, and inherited beliefs. He asks: are you following a path because it's truly yours, or because it was handed to you?",
  },
  {
    id: 6,
    name: "The Lovers",
    imageUrl: WC("RWS_Tarot_06_Lovers.jpg"),
    keywords: ["love", "union", "alignment", "choice"],
    meaning: "The Lovers is not just about romance — it's about alignment. A choice between two paths, two values, two versions of yourself. What are you truly choosing when you choose this person or this path?",
  },
  {
    id: 7,
    name: "The Chariot",
    imageUrl: WC("RWS_Tarot_07_Chariot.jpg"),
    keywords: ["willpower", "victory", "control", "determination"],
    meaning: "The Chariot speaks of victory through sheer force of will. You're being asked to take control — not of others, but of the opposing forces within yourself. Focus. Forward.",
  },
  {
    id: 8,
    name: "Strength",
    imageUrl: WC("RWS_Tarot_08_Strength.jpg"),
    keywords: ["courage", "patience", "inner strength", "compassion"],
    meaning: "Strength is not brute force — it's the quiet power of someone who has tamed their own inner beast. Compassion, patience, and gentle persistence will take you further than aggression.",
  },
  {
    id: 9,
    name: "The Hermit",
    imageUrl: WC("RWS_Tarot_09_Hermit.jpg"),
    keywords: ["solitude", "inner guidance", "wisdom", "soul-searching"],
    meaning: "The Hermit has withdrawn from the world to find the light within. This card speaks of a necessary period of solitude, reflection, and soul-searching. The answers you seek aren't outside you.",
  },
  {
    id: 10,
    name: "Wheel of Fortune",
    imageUrl: WC("RWS_Tarot_10_Wheel_of_Fortune.jpg"),
    keywords: ["cycles", "fate", "turning point", "luck"],
    meaning: "The Wheel turns — always. This is a moment of destiny, a turning point where forces larger than yourself are at work. You can't control the wheel, but you can choose how you meet it.",
  },
  {
    id: 11,
    name: "Justice",
    imageUrl: WC("RWS_Tarot_11_Justice.jpg"),
    keywords: ["truth", "fairness", "law", "cause and effect"],
    meaning: "Justice is cold, clear-eyed truth. What you put out returns to you. A decision is being weighed — either by circumstances, by someone in authority, or by your own conscience.",
  },
  {
    id: 12,
    name: "The Hanged Man",
    imageUrl: WC("RWS_Tarot_12_Hanged_Man.jpg"),
    keywords: ["surrender", "new perspective", "pause", "sacrifice"],
    meaning: "The Hanged Man chose to hang there. This is willing surrender — a pause, a shift in perspective. What looks like stagnation from the outside is often profound inner transformation.",
  },
  {
    id: 13,
    name: "Death",
    imageUrl: WC("RWS_Tarot_13_Death.jpg"),
    keywords: ["transformation", "endings", "transition", "letting go"],
    meaning: "Death is the great transformer. Not physical death — but the death of an old self, an old chapter, an old way of being. Something must end so something new can begin. Let it go.",
  },
  {
    id: 14,
    name: "Temperance",
    imageUrl: WC("RWS_Tarot_14_Temperance.jpg"),
    keywords: ["balance", "patience", "moderation", "purpose"],
    meaning: "Temperance pours slowly, mixing opposing elements into something new. This is the alchemy of patience — finding the middle path, integrating extremes, and trusting the process.",
  },
  {
    id: 15,
    name: "The Devil",
    imageUrl: WC("RWS_Tarot_15_Devil.jpg"),
    keywords: ["shadow self", "bondage", "addiction", "materialism"],
    meaning: "The Devil shows us what binds us — and the chains are often looser than we think. This card confronts the shadow: the patterns, addictions, and illusions that keep us in a cage we helped build.",
  },
  {
    id: 16,
    name: "The Tower",
    imageUrl: WC("RWS_Tarot_16_Tower.jpg"),
    keywords: ["sudden change", "upheaval", "revelation", "ego death"],
    meaning: "The Tower falls because it was built on false foundations. This is sudden, disruptive truth — the kind that feels like destruction but is actually liberation. What's collapsing needed to collapse.",
  },
  {
    id: 17,
    name: "The Star",
    imageUrl: WC("RWS_Tarot_17_Star.jpg"),
    keywords: ["hope", "renewal", "serenity", "inspiration"],
    meaning: "The Star rises after the Tower falls. This is a card of quiet hope, of healing, of renewed faith in yourself and in life. The worst has passed. Breathe. You are being restored.",
  },
  {
    id: 18,
    name: "The Moon",
    imageUrl: WC("RWS_Tarot_18_Moon.jpg"),
    keywords: ["illusion", "fear", "the unconscious", "confusion"],
    meaning: "The Moon illuminates what the daylight hides — fears, illusions, things we don't want to look at directly. Things may not be as they appear. Pay attention to dreams, instincts, and what hides in shadow.",
  },
  {
    id: 19,
    name: "The Sun",
    imageUrl: WC("RWS_Tarot_19_Sun.jpg"),
    keywords: ["joy", "success", "vitality", "clarity"],
    meaning: "The Sun burns through all doubt. This is pure, unambiguous joy — success, clarity, vitality. If The Sun appears in your reading, something is working, and the light is on your side.",
  },
  {
    id: 20,
    name: "Judgement",
    imageUrl: WC("RWS_Tarot_20_Judgement.jpg"),
    keywords: ["rebirth", "awakening", "reckoning", "calling"],
    meaning: "Judgement calls you to rise. This is the moment of reckoning — not punishment, but honest self-assessment and rebirth. Your past doesn't define you, but you must face it to move beyond it.",
  },
  {
    id: 21,
    name: "The World",
    imageUrl: WC("RWS_Tarot_21_World.jpg"),
    keywords: ["completion", "integration", "accomplishment", "wholeness"],
    meaning: "The World is the end of one great cycle and the beginning of another. Something is complete — truly complete. You've grown through it. Now you carry this wisdom into whatever comes next.",
  },
];

/**
 * Shuffle the deck and return `count` random cards.
 */
export function drawCards(count: number): TarotCard[] {
  const shuffled = [...MAJOR_ARCANA].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
