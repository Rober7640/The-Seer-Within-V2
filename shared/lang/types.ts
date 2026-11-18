// A language pack: every piece of LANGUAGE LOGIC the funnel runs on what a buyer
// types, or on what Evelyn says back — for one non-English locale.
//
// English has no pack: the original English code paths are left exactly as they
// were. A non-English session runs its pack FIRST and the English checks after,
// because buyers mix languages (a French buyer may type "ok", or a whole line in
// English). So a pack only ever ADDS protection, never removes the English one.
//
// A pack holds LOGIC only (patterns and the instruction to Claude). Every line a
// buyer reads — the safety replies, the crisis message, the refund reply — is
// copy, and goes through the catalog like all other copy (msg()/tl(), translated
// by the funnel-localize run). The one exception is the prediction rewrites:
// each replacement is spliced into Evelyn's own sentence, so it must be written
// in the same language as the pattern that found it.
//
// Matching: patterns marked FOLDED run on foldText(input) — lower case, accents
// stripped, straight apostrophes (shared/lang/fold.ts) — so "déprimée",
// "deprimee" and "DÉPRIMÉE" all match one pattern written without accents.
//
// Packs are written by hand (with Codex as second reviewer) and unit-tested:
// tests/l10n/lang-<code>.test.ts. ⛔ No French traffic before the safety tests pass.
import type { LocaleCode } from "../locales";

/** All FOLDED. */
export interface SafetyPack {
  /** Explicit self-harm / suicide intent → the hard crisis response. */
  crisis: RegExp[];
  /** Text IMMEDIATELY before a crisis match that negates it ("je ne vais pas "). Anchored with $. */
  crisisDenialTail: RegExp;
  /** Passive ideation / distress → soft note, message still goes through. */
  softCrisis: RegExp[];
  /** 18+ only. A capture group 1 = numeric age (checked < 18). */
  minor: RegExp[];
  /** Sexual content DIRECTED at the persona (never a disclosure about someone else). */
  inappropriate: RegExp[];
  /** Prompt injection + AI-identity probing / assertions. */
  injection: RegExp[];
  harassment: RegExp[];
  /** Folded words that unambiguously mark a THIRD language (not this one, not English). */
  foreignWords: ReadonlySet<string>;
  /** How many foreignWords hits mark a message as a third language. */
  foreignThreshold: number;
}

/** RAW (runs on Evelyn's generated reply; must handle accents itself). */
export interface PredictionRewrite {
  pattern: RegExp; // global flag required
  replacement: string;
  category: "guarantee" | "medical" | "legal" | "financial" | "extreme";
}

/** FOLDED. Free-text intent classes of the main chat (client/src/lib/intent.ts), same order. */
export interface IntentPack {
  crisis: RegExp;
  inappropriate: RegExp;
  validShort: RegExp;
  timeBased: RegExp;
  positive: RegExp;
  clarification: RegExp;
  aiQuestion: RegExp;
  priceQuestion: RegExp;
  explicitDecline: RegExp;
  objectionPrice: RegExp;
  objectionSkepticism: RegExp;
  objectionInfo: RegExp;
  wantsMoreFree: RegExp;
}

/** FOLDED. Free-text answers to the upsell questions: class → pattern, tried in order. */
export type ReplyClasses = ReadonlyArray<readonly [string, RegExp]>;

export interface LangPack {
  locale: Exclude<LocaleCode, "en">;
  safety: SafetyPack;
  /** FOLDED. */
  refund: RegExp[];
  predictions: PredictionRewrite[];
  intent: IntentPack;
  upsellReplies: { u1q1: ReplyClasses; u1q2: ReplyClasses; u1q3: ReplyClasses; u2q1: ReplyClasses; u2q2: ReplyClasses; u2q3: ReplyClasses };
  /** RAW, anchored ^. "Je m'appelle Hélène" → stripped, so the first word is the name. */
  nameIntro: RegExp;
  /** RAW, anchored ^. "Il s'appelle Daniel" → same, for the other person's name. */
  otherNameIntro: RegExp;
  /** Appended to every V1 Claude prompt in this locale (server/lib/claude.ts). */
  outputBlock: string;
}
