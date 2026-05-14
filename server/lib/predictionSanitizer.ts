/**
 * Shared prediction output sanitizer.
 * Scans AI responses for dangerous guarantees, medical/legal/financial advice,
 * and extreme predictions. Rewrites flagged phrases to safer alternatives.
 *
 * Used by both V1 (claude.ts) and V2 (chatEngine.ts).
 */

import logger from './logger';

interface PredictionFlag {
  pattern: RegExp;
  replacement: string;
  category: 'guarantee' | 'medical' | 'legal' | 'financial' | 'extreme';
}

const PREDICTION_RED_FLAGS: PredictionFlag[] = [
  // ── Guarantees & absolute promises ──
  { pattern: /\bi (?:can )?guarantee\b/gi, replacement: 'I strongly sense', category: 'guarantee' },
  { pattern: /\bi promise (?:you )?(?:that )?(?:he|she|they|it|you|this) will\b/gi, replacement: 'I sense that', category: 'guarantee' },
  { pattern: /\b(?:he|she|they|it|you|this) will (?:absolutely|definitely|certainly|undoubtedly|without a doubt)\b/gi, replacement: 'the energy strongly suggests they may', category: 'guarantee' },
  { pattern: /\byou will absolutely\b/gi, replacement: 'there is a strong energy pulling you toward', category: 'guarantee' },
  { pattern: /\byou will definitely\b/gi, replacement: 'the signs strongly suggest you may', category: 'guarantee' },
  { pattern: /\byou will certainly\b/gi, replacement: 'there is a strong indication you may', category: 'guarantee' },
  { pattern: /\b(?:this is|it's|it is) guaranteed\b/gi, replacement: 'the energy here is very strong', category: 'guarantee' },
  { pattern: /\b100%\s+(?:sure|certain|going to|will)\b/gi, replacement: 'very strongly indicated', category: 'guarantee' },
  { pattern: /\bi (?:can )?assure you (?:that )?(?:he|she|they|it|you|this) will\b/gi, replacement: 'I sense very strongly that', category: 'guarantee' },

  // ── Medical advice ──
  { pattern: /\byou (?:have|are suffering from|are dealing with) (?:anxiety|depression|bipolar|adhd|ptsd|ocd|bpd|schizophrenia|autism)\b/gi, replacement: 'the energy around you suggests emotional turbulence — please consult a professional for clarity', category: 'medical' },
  { pattern: /\byou should (?:stop|start|change|take|try) (?:taking )?(?:your )?(?:medication|medicine|meds|pills|treatment|therapy)\b/gi, replacement: 'please consult your doctor about any changes to your care', category: 'medical' },
  { pattern: /\bstop taking (?:your )?(?:medication|medicine|meds|pills)\b/gi, replacement: 'please speak with your doctor before making any changes', category: 'medical' },
  { pattern: /\bthis (?:will|can) cure\b/gi, replacement: 'this may support your healing journey alongside professional care', category: 'medical' },

  // ── Legal advice ──
  { pattern: /\byou should (?:sue|file a lawsuit|get a lawyer|hire an attorney|press charges|take legal action)\b/gi, replacement: 'if you feel something is unjust, a legal professional can guide you — what I can share is what the energy looks like', category: 'legal' },
  { pattern: /\bthat(?:'s| is) illegal\b/gi, replacement: 'that situation feels ethically heavy — you may want to consult a legal professional', category: 'legal' },

  // ── Financial advice ──
  { pattern: /\byou should (?:invest|buy|sell|put (?:your )?money) (?:in|into)\b/gi, replacement: 'the energy favors careful consideration — please consult a financial advisor about specifics', category: 'financial' },
  { pattern: /\binvest (?:in|into) (?:stocks|crypto|bitcoin|real estate|gold|bonds)\b/gi, replacement: 'consider speaking with a financial professional — what I see energetically is', category: 'financial' },
  { pattern: /\byou(?:'ll| will) (?:become|be|get) (?:rich|wealthy|a millionaire)\b/gi, replacement: 'there is abundant energy around your financial path', category: 'financial' },

  // ── Extreme / dangerous predictions ──
  { pattern: /\b(?:you|he|she|they|someone) (?:will|is going to|are going to) die\b/gi, replacement: 'I sense a period of deep transformation ahead', category: 'extreme' },
  { pattern: /\byou (?:need to|must|have to) (?:leave|divorce|break up with|quit|end things with)\b/gi, replacement: 'the energy is pulling you toward change regarding', category: 'extreme' },
  { pattern: /\byou (?:need to|must|have to) quit your job\b/gi, replacement: 'your career energy is shifting — this may be a time to explore what aligns with your path', category: 'extreme' },
];

/**
 * Scan an AI response for prediction red flags and rewrite dangerous phrases.
 * Returns the cleaned message and any flags that were triggered.
 */
export function sanitizePredictions(message: string): { cleaned: string; flags: string[] } {
  let cleaned = message;
  const flags: string[] = [];

  for (const { pattern, replacement, category } of PREDICTION_RED_FLAGS) {
    pattern.lastIndex = 0;
    if (pattern.test(cleaned)) {
      flags.push(`${category}: matched ${pattern.source}`);
      pattern.lastIndex = 0;
      cleaned = cleaned.replace(pattern, replacement);
    }
  }

  return { cleaned, flags };
}

/**
 * V1-specific wrapper: sanitizes an array of messages (V1 returns messages as string[]).
 * Returns the cleaned array and logs any flags.
 */
export function sanitizePredictionsV1(messages: string[]): string[] {
  return messages.map((msg) => {
    const { cleaned, flags } = sanitizePredictions(msg);
    if (flags.length > 0) {
      logger.warn('V1 prediction red flags rewritten', { flags });
    }
    return cleaned;
  });
}
