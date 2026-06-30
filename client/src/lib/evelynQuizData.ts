// Tap-quiz questions for the Evelyn lander "quiz" mechanic (Phase 4c structural
// A/B vs the open chatbox). Three single-select, Evelyn-flavoured questions. These
// are ENGAGEMENT/analytics only — the quiz finishes through the shared lander
// handleCta (same signup as the chatbox, with the bucket coming from the lander
// URL params), so the answers don't drive signup and carry no bucket here.

export interface QuizOption {
  value: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
}

export const EVELYN_QUIZ: QuizQuestion[] = [
  {
    id: "topic",
    prompt: "What's pulling at you most right now?",
    options: [
      { value: "love", label: "Love & connection" },
      { value: "money", label: "Money & work" },
      { value: "purpose", label: "Purpose & direction" },
      { value: "someone", label: "Someone specific" },
    ],
  },
  {
    id: "feeling",
    prompt: "When you sit with it, what comes up?",
    options: [
      { value: "stuck", label: "I feel stuck" },
      { value: "crossroads", label: "I'm at a crossroads" },
      { value: "off", label: "Something feels off" },
      { value: "hopeful", label: "Hopeful, but unsure" },
    ],
  },
  {
    id: "outcome",
    prompt: "What would change everything?",
    options: [
      { value: "clarity", label: "Clarity on what's next" },
      { value: "their_heart", label: "Knowing how they feel" },
      { value: "a_sign", label: "A sign I'm on the right path" },
      { value: "peace", label: "Peace with a decision" },
    ],
  },
];
