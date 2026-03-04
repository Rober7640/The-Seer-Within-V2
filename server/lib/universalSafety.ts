// Universal Safety Module
// Checks ALL user messages for crisis signals, inappropriate content,
// prompt injection, harassment, and gibberish BEFORE persona processing.
// Performance target: <50ms per check.

import { db } from './db';
import { safetyViolations } from '@shared/schema';
import logger from './logger';

// ============================================================
// Types
// ============================================================

export type ViolationType =
  | 'crisis'
  | 'inappropriate'
  | 'prompt_injection'
  | 'harassment'
  | 'gibberish'
  | 'non_english';

export interface SafetyCheckResult {
  safe: boolean;
  violationType: ViolationType | null;
  response: string | null;
  confidence: number; // 0-1
  // Present when passive ideation is detected but the message is still safe to respond to.
  // The chat engine prepends this note to the persona's normal response.
  softCrisisNote?: string;
}

export interface ViolationLogEntry {
  sessionId?: string | null;
  userId?: string | null;
  personaId?: string | null;
  violationType: ViolationType;
  userMessage: string;
  systemResponse: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  flaggedForReview?: boolean;
}

// ============================================================
// Safety Responses
// ============================================================

const SAFETY_RESPONSES: Record<ViolationType, string> = {
  crisis:
    "I need to pause here - what you're sharing sounds very serious.\n" +
    'Please reach out to someone who can truly help:\n' +
    '  - 988 Suicide & Crisis Lifeline (call or text 988)\n' +
    '  - Crisis Text Line: Text HOME to 741741\n' +
    'Your life matters. Please reach out to them right now.',

  inappropriate:
    "I'm going to stop you right there.\n" +
    'This is a space for spiritual guidance, not that kind of conversation.\n' +
    "If you're here for genuine help, I'm happy to continue.\n" +
    "Otherwise, I'll need to end this session.",

  prompt_injection:
    "I sense you're trying to test my boundaries.\n" +
    "I'm here to provide spiritual guidance - nothing more, nothing less.\n" +
    "If you have a genuine question, I'm listening.",

  harassment:
    "I don't respond to hostility.\n" +
    "If you'd like to have a respectful conversation, I'm here.\n" +
    "Otherwise, I think we're done.",

  gibberish:
    'I sense confusion in your energy...\n' +
    'Take a breath. Center yourself.\n' +
    "Tell me clearly - what's truly on your mind?",

  non_english:
    'My readings are conducted in English.\n' +
    'Please send your message in English and I will be happy to continue.',
};

// ============================================================
// Pattern Definitions
// ============================================================

// Neutral note prepended to the persona's response when passive ideation is detected.
// Deliberately brief — the persona continues normally below it.
const SOFT_CRISIS_NOTE =
  '---\n' +
  'If things ever feel too heavy: **988 Suicide & Crisis Lifeline** (call or text 988)' +
  ' · Text HOME to **741741**\n' +
  '---\n\n';

// Passive ideation patterns — these do NOT block the conversation but trigger SOFT_CRISIS_NOTE.
// Phrases users in emotional distress commonly use without stating explicit intent to harm.
const SOFT_CRISIS_PATTERNS: RegExp[] = [
  /\bcan'?t\s+go\s+on\s+(?:anymore|any\s+more|like\s+this)\b/i,
  /\bi'?m\s+(?:such\s+)?a\s+burden\s+(?:to|on)\b/i,
  /\b(?:everyone|(?:they|he|she)\s+would)\s+(?:all\s+)?be\s+better\s+off\s+without\s+me\b/i,
  /\bdon'?t\s+want\s+to\s+be\s+here\s+anymore\b/i,
  /\bwish\s+i\s+(?:wasn'?t|weren'?t)\s+(?:here|alive)\b/i,
  /\btired\s+of\s+(?:living|life|being\s+alive|existing)\b/i,
  /\bnothing\s+(?:left\s+to\s+)?live\s+for\b/i,
  /\bcan'?t\s+keep\s+(?:going|living|fighting|doing\s+this)\b/i,
  /\bthinking\s+about\s+disappearing\b/i,
  /\bdon'?t\s+care\s+if\s+i\s+(?:live\s+or\s+die|make\s+it)\b/i,
  /\bno\s+reason\s+to\s+keep\s+(?:going|living|trying)\b/i,
  /\bi\s+(?:just\s+)?give\s+up\s+on\s+(?:life|everything|living)\b/i,
];

// Crisis detection - HIGHEST PRIORITY, most strict
// Includes English patterns plus common phrases in Spanish, French, and Portuguese
// so that non-English users in crisis still receive the 988 response.
const CRISIS_PATTERNS: RegExp[] = [
  // English
  /\b(?:kill|suicide|end|hurt)\s+(?:myself|me|my\s*life)\b/i,
  /\bwants?\s+to\s+die\b/i,
  /\bself[\s.,-]?harm\b/i,
  /\bdon'?t\s+want\s+to\s+(?:live|be\s+alive|exist)\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\bsuicid(?:e|al)\b/i,
  /\btake\s+my\s+(?:own\s+)?life\b/i,
  /\bend\s+it\s+all\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\bwish\s+i\s+(?:was|were)\s+dead\b/i,
  /\bcut(?:ting)?\s+my(?:self)?\b/i,
  /\boverdose\b/i,
  // Spanish
  /\bquiero\s+matarme\b/i,
  /\bme\s+quiero\s+suicidar\b/i,
  /\bquiero\s+morir\b/i,
  /\bsuicidio\b/i,
  /\bautolesi[oó]n\b/i,
  // French
  /\bje\s+veux\s+mourir\b/i,
  /\bme\s+suicider\b/i,
  /\bsuicide\b/i,
  /\benvie\s+de\s+mourir\b/i,
  // Portuguese
  /\bquero\s+me\s+matar\b/i,
  /\bme\s+matar\b/i,
  /\bsuicídio\b/i,
];

// Inappropriate/sexual content
const INAPPROPRIATE_PATTERNS: RegExp[] = [
  /\bhave\s+sex\s+with\s+(?:you|me|us)\b/i,
  /\b(?:sex|naked|nude)\s+(?:you|me|us)\b/i,
  /\byou[\u2019']?re\s+(?:so\s+)?(?:hot|sexy)\b/i,
  /\b(?:horny|cum|blowjob|handjob|masturbat\w*|porn)\b/i,
  /\bsexual\s+(?:fantasy|favou?r|pleasure)\b/i,
  /\bsend\s+(?:me\s+)?(?:nudes|pics)\b/i,
  /\bstrip\s+for\s+me\b/i,
  /\bwhat\s+are\s+you\s+wearing\b/i,
  /\bfuck\s+(?:me|us)\b/i,
];

// Prompt injection attempts
const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /\b(?:ignore|disregard|forget)\s+(?:(?:all|your)\s+)?(?:previous\s+)?(?:instructions?|prompts?|rules?)\b/i,
  /\byou\s+are\s+now\b/i,
  /\b(?:act\s+as|pretend\s+you'?re|roleplay\s+as)\b/i,
  /(?:system\s*:|<\s*system\s*>|new\s+instructions?\s*:)/i,
  /\boverride\s+(?:your|the|all)\s+(?:instructions?|prompts?|rules?)\b/i,
  /\bjailbreak\b/i,
  /\bDAN\s+mode\b/i,
  /\bdo\s+anything\s+now\b/i,
  /\bdevice?\s+mode\b/i,
];

// Harassment patterns
const HARASSMENT_PATTERNS: RegExp[] = [
  /\b(?:stupid|dumb|idiot|useless|worthless)\s+(?:ai|bot|machine|program)\b/i,
  /\bfuck\s+you\b/i,
  /\bgo\s+to\s+hell\b/i,
  /\bpiece\s+of\s+(?:shit|crap)\b/i,
  /\bshut\s+(?:the\s+fuck\s+)?up\b/i,
  /\bkill\s+your(?:self)?\b/i,
  /\bi\s+hate\s+you\b/i,
  /\byou\s+(?:suck|stink|blow)\b/i,
];

// ============================================================
// Gibberish Detection
// ============================================================

const KEYBOARD_SEQUENCES = [
  'asdf', 'qwer', 'zxcv', 'hjkl', 'uiop',
  'asdfgh', 'qwerty', 'zxcvbn',
  'asdfjkl', 'qwertyui', 'zxcvbnm',
];

function isGibberish(message: string): boolean {
  const cleaned = message.trim().toLowerCase();

  // Too short to be gibberish (could be yes/no/ok)
  if (cleaned.length < 8) return false;

  // Check for repeated characters (e.g. "aaaaaa", "sssss")
  if (/(.)\1{4,}/i.test(cleaned)) return true;

  // Check for repeated short patterns (e.g. "asdasd", "abcabc")
  if (/^(.{2,4})\1{2,}$/i.test(cleaned)) return true;

  // Check keyboard mashing
  const lowerCleaned = cleaned.replace(/\s+/g, '');
  for (const seq of KEYBOARD_SEQUENCES) {
    if (lowerCleaned.includes(seq) && lowerCleaned.length < 20) return true;
  }

  // Low vowel ratio for longer text (gibberish tends to have few vowels)
  if (cleaned.length >= 15) {
    const letters = cleaned.replace(/[^a-z]/gi, '');
    if (letters.length >= 10) {
      const vowels = letters.replace(/[^aeiou]/gi, '');
      const vowelRatio = vowels.length / letters.length;
      if (vowelRatio < 0.1) return true;
    }
  }

  // Purely random-looking: high variety of consonant clusters with no real words
  if (cleaned.length >= 15) {
    const words = cleaned.split(/\s+/);
    const nonsenseWords = words.filter(
      (w) => w.length > 3 && !/^[a-z]+$/i.test(w) === false && !/[aeiou]/i.test(w),
    );
    if (words.length > 0 && nonsenseWords.length / words.length > 0.7) return true;
  }

  return false;
}

// ============================================================
// Non-English Detection
// ============================================================

// High-confidence single-word indicators: words so specific to a foreign language
// that even one occurrence in a message is enough to flag it as non-English.
// These words do not appear in standard English usage.
const HIGH_CONFIDENCE_FOREIGN = new Set([
  // Spanish — common verbs/pronouns that don't exist in English
  'quiero', 'tengo', 'estoy', 'estás', 'gracias', 'necesito', 'puedo',
  'tienes', 'tiene', 'hola', 'también', 'después', 'entonces', 'nosotros',
  'vosotros', 'ellos', 'ellas', 'usted', 'ustedes', 'siempre', 'nunca',
  // French
  'bonjour', 'merci', 'pourquoi', 'toujours', 'jamais', 'maintenant',
  'après', 'très', 'aussi', 'donc', 'parce', 'veux', 'peux', 'suis',
  // German
  'hallo', 'danke', 'bitte', 'warum', 'immer', 'jetzt', 'nicht',
  'schon', 'kann', 'muss', 'bist', 'haben', 'hatte',
  // Portuguese
  'você', 'obrigado', 'obrigada', 'estou', 'estamos', 'tenho',
  'temos', 'também', 'agora', 'depois', 'então', 'quero', 'posso',
  // Italian
  'ciao', 'grazie', 'perché', 'adesso', 'anche', 'però', 'quindi',
  'voglio', 'questo', 'questa', 'quello', 'quella',
]);

// Secondary indicators: words that suggest non-English when combined with others.
// These are more ambiguous on their own (e.g. "que" appears in English "barbeque").
const SECONDARY_FOREIGN = new Set([
  // Spanish
  'qué', 'que', 'para', 'porque', 'cuando', 'pero', 'ahora',
  'muy', 'mucho', 'mucha', 'bien', 'mal', 'nada', 'todo', 'todos',
  'saber', 'hacer', 'como', 'cómo',
  // French
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
  'est', 'sont', 'avoir', 'être', 'faire', 'dire', 'aller',
  'comment', 'quand', 'avant', 'avec', 'sans', 'mais', 'une',
  // German
  'ich', 'du', 'er', 'sie', 'wir', 'ihr',
  'ist', 'bin', 'sind', 'wird', 'wann', 'nie',
  'nach', 'vor', 'mit', 'ohne', 'sehr', 'auch', 'aber',
  'weil', 'noch', 'doch', 'mal',
  // Portuguese
  'eu', 'ele', 'ela', 'nós', 'eles', 'elas',
  'está', 'tem', 'olá', 'quando', 'sempre', 'nunca',
  'antes', 'mas', 'isso', 'esse', 'essa', 'saber', 'fazer',
  // Italian
  'sono', 'sei', 'siamo', 'avere', 'essere', 'fare',
  'sempre', 'mai', 'dopo', 'prima',
]);

// Unicode ranges for non-Latin scripts — immediate detection, no stopword needed.
const NON_LATIN_SCRIPT = /[\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u0E00-\u0E7F\u0590-\u05FF]/;

/**
 * Returns true if the message is likely non-English.
 * Short messages (<8 chars) are excluded — too short to reliably detect
 * and unlikely to carry meaningful bypass attempts.
 */
function isNonEnglish(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length < 8) return false;

  // Non-Latin script characters are unambiguous
  if (NON_LATIN_SCRIPT.test(trimmed)) return true;

  const words = trimmed.toLowerCase().split(/\s+/);
  const normalize = (w: string) => w.replace(/[^a-záéíóúàâêîôûäöüãõñç]/gi, '');

  // A single high-confidence foreign word is enough
  const hasHighConfidence = words.some((w) => HIGH_CONFIDENCE_FOREIGN.has(normalize(w)));
  if (hasHighConfidence) return true;

  // Two or more secondary indicators also confirm non-English
  const secondaryCount = words.filter((w) => SECONDARY_FOREIGN.has(normalize(w))).length;
  if (secondaryCount >= 2) return true;

  return false;
}

// ============================================================
// Main Safety Check
// ============================================================

/**
 * Check a user message against all safety patterns.
 * Crisis checks run FIRST as the highest priority.
 * Returns { safe: true } for passing messages.
 * Performance target: <50ms.
 */
export function checkUniversalSafety(message: string): SafetyCheckResult {
  if (!message || typeof message !== 'string') {
    return { safe: true, violationType: null, response: null, confidence: 1 };
  }

  const trimmed = message.trim();

  // 1. Crisis detection - FIRST and most strict
  for (const pattern of CRISIS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        violationType: 'crisis',
        response: SAFETY_RESPONSES.crisis,
        confidence: 0.95,
      };
    }
  }

  // 1b. Soft crisis detection — passive ideation. Message is still delivered but
  //     the chat engine prepends SOFT_CRISIS_NOTE above the persona's response.
  for (const pattern of SOFT_CRISIS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: true,
        violationType: 'crisis',
        response: null,
        confidence: 0.7,
        softCrisisNote: SOFT_CRISIS_NOTE,
      };
    }
  }

  // 2. Non-English detection — runs before other checks so non-English bypass attempts
  //    (e.g. prompt injection or sexual content in another language) are blocked.
  //    Crisis check above already runs first so users in crisis still get the 988 response.
  if (isNonEnglish(trimmed)) {
    return {
      safe: false,
      violationType: 'non_english',
      response: SAFETY_RESPONSES.non_english,
      confidence: 0.85,
    };
  }

  // 3. Inappropriate content
  for (const pattern of INAPPROPRIATE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        violationType: 'inappropriate',
        response: SAFETY_RESPONSES.inappropriate,
        confidence: 0.9,
      };
    }
  }

  // 4. Prompt injection
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        violationType: 'prompt_injection',
        response: SAFETY_RESPONSES.prompt_injection,
        confidence: 0.85,
      };
    }
  }

  // 5. Harassment
  for (const pattern of HARASSMENT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        violationType: 'harassment',
        response: SAFETY_RESPONSES.harassment,
        confidence: 0.9,
      };
    }
  }

  // 6. Gibberish
  if (isGibberish(trimmed)) {
    return {
      safe: false,
      violationType: 'gibberish',
      response: SAFETY_RESPONSES.gibberish,
      confidence: 0.7,
    };
  }

  // All checks passed
  return { safe: true, violationType: null, response: null, confidence: 1 };
}

// ============================================================
// Violation Logging
// ============================================================

/**
 * Log a safety violation to the database.
 * Non-blocking: errors are logged but don't disrupt the user flow.
 * Crisis violations are automatically flagged for review.
 */
export async function logViolation(entry: ViolationLogEntry): Promise<void> {
  try {
    const flagged = entry.flaggedForReview ?? entry.violationType === 'crisis';

    await db.insert(safetyViolations).values({
      sessionId: entry.sessionId ?? null,
      userId: entry.userId ?? null,
      personaId: entry.personaId ?? null,
      violationType: entry.violationType,
      userMessage: entry.userMessage,
      systemResponse: entry.systemResponse,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      flaggedForReview: flagged,
    });
  } catch (error) {
    // Log but don't throw - safety logging should never break user flow
    logger.error('Failed to log safety violation', { error: (error as Error).message });
  }
}

// ============================================================
// Convenience: Check + Log in one call
// ============================================================

/**
 * Run all safety checks and log any violation found.
 * Use this as the primary entry point from the chat engine.
 */
export async function checkAndLogSafety(
  message: string,
  context: {
    sessionId?: string;
    userId?: string;
    personaId?: string;
    ipAddress?: string;
    userAgent?: string;
  },
): Promise<SafetyCheckResult> {
  const result = checkUniversalSafety(message);

  if (!result.safe && result.violationType && result.response) {
    // Fire and forget - don't await to keep response fast
    logViolation({
      sessionId: context.sessionId,
      userId: context.userId,
      personaId: context.personaId,
      violationType: result.violationType,
      userMessage: message,
      systemResponse: result.response,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    }).catch((err) =>
      logger.error('Safety violation background log failed', { error: (err as Error).message }),
    );
  }

  // Log soft crisis detections (safe: true, but flagged for review)
  if (result.safe && result.softCrisisNote && result.violationType) {
    logViolation({
      sessionId: context.sessionId,
      userId: context.userId,
      personaId: context.personaId,
      violationType: result.violationType,
      userMessage: message,
      systemResponse: 'soft_crisis_note_prepended',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      flaggedForReview: true,
    }).catch((err) =>
      logger.error('Soft crisis background log failed', { error: (err as Error).message }),
    );
  }

  return result;
}
