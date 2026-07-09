// Refund / billing deflection
// When a client asks for a refund, a chargeback, or to cancel/reverse a charge,
// we DO NOT route the message to the LLM. Instead we short-circuit with a fixed
// standard template that hands the request off to the support inbox. This keeps
// the persona out of billing negotiations, gives a consistent (legally reviewed)
// answer every time, and avoids burning the client's coins on the exchange.
//
// Two things here are meant to be edited by the team:
//   1. REFUND_PATTERNS — what phrases count as a refund/billing request
//   2. REFUND_TEMPLATE — the exact reply the client receives
//
// Wired into sendMessage() in chatEngine.ts, right after the safety check and
// BEFORE the credit check / LLM call.

// Customer-facing support inbox (The Seer Within brand inbox — same address used by
// the app's follow-up / top-up / session emails).
export const SUPPORT_EMAIL = 'hi@theseerwithin.com';

// Intent detection. Kept deliberately narrow so ordinary reading chat is never
// deflected — every pattern targets money-back / billing-reversal intent, not the
// bare word "cancel" (which clients use about relationships, plans, etc.).
const REFUND_PATTERNS: RegExp[] = [
  /\brefund/i,
  /money\s*back/i,
  /charge[\s-]?back/i,
  /reverse\s+(the|this|my)\s+(charge|payment|transaction)/i,
  /dispute\s+(the|this|my)\s+(charge|payment|transaction)/i,
  /unauthori[sz]ed\s+(charge|payment|transaction)/i,
  /stop\s+charging\s+me/i,
  /cancel\s+(my\s+)?(subscription|membership|payment|billing|charge|order|purchase)/i,
  /want\s+(a|my)\s+(refund|money)/i,
];

/**
 * Returns true when the message reads as a refund / billing-reversal request
 * that should be handled by support rather than the persona.
 */
export function isRefundRequest(message: string): boolean {
  if (!message) return false;
  const text = message.trim();
  if (!text) return false;
  return REFUND_PATTERNS.some((re) => re.test(text));
}

// Standard template returned in place of an LLM reading. Warm, stays in the
// persona's world, but clearly routes billing to the support inbox. Edit freely.
export const REFUND_TEMPLATE =
  "I hear you, and I want to make sure this is handled properly and quickly. " +
  "Anything to do with billing or a refund is taken care of by our support team directly — " +
  "not through the readings here. Please email " + SUPPORT_EMAIL + " from the address on your " +
  "account, and they'll take care of you right away. You can also see our full refund policy at /refund. " +
  "I'm still right here whenever you'd like to return.";
