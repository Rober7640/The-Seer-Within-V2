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
  | 'gibberish';

export interface SafetyCheckResult {
  safe: boolean;
  violationType: ViolationType | null;
  response: string | null;
  confidence: number; // 0-1
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
};

// ============================================================
// Pattern Definitions
// ============================================================

// Crisis detection - HIGHEST PRIORITY, most strict
const CRISIS_PATTERNS: RegExp[] = [
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

  // 2. Inappropriate content
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

  // 3. Prompt injection
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

  // 4. Harassment
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

  // 5. Gibberish
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

  return result;
}
