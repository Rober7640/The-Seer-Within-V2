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
  /**
   * Someone ELSE's suicide or death ("mon mari s'est suicidé"), global flag. Masked
   * before both crisis scans, so bereavement is not read as her own intent; a mask
   * hit on its own gives the soft note (resources shown, reading goes on).
   */
  reportedCrisis: RegExp[];
  /**
   * Optional, global flag. Everyday idioms that CONTAIN a crisis phrase ("me quiero morir
   * de la vergüenza" holds the English list's own `quiero morir`; "sería un suicidio"
   * holds `suicidio`). Masked before both crisis scans with no note at all, because the
   * English list (server/lib/universalSafety.ts) cannot be narrowed from a pack.
   */
  figurative?: RegExp[];
  /** Someone she loved has died ("mon mari est décédé", "veuve"). Gates followTheDead. */
  deathContext: RegExp[];
  /** With a death in the message (reportedCrisis or deathContext): her wish to follow ("je veux le rejoindre") → hard crisis. */
  followTheDead: RegExp[];
  /**
   * Reported speech ("il m'a dit …", "il m'a traitée de …"), global flag, masked to the
   * end of the sentence before the inappropriate / injection / harassment checks: words
   * said TO her by someone else are a disclosure, not aimed at Evelyn.
   */
  reportedSpeech: RegExp;
  /** Passive ideation / distress → soft note, message still goes through. */
  softCrisis: RegExp[];
  /** 18+ only. A capture group 1 = numeric age (checked < 18). */
  minor: RegExp[];
  /**
   * Optional, global flag. Someone ELSE's age or school, or her own past ("mi hija está
   * en high school", "cuando cumplí 15 me casé"), masked before both minor scans with no
   * note, because the English list's bare `high school` (server/lib/universalSafety.ts)
   * cannot be narrowed from a pack. A pack without it: unchanged.
   */
  notMinor?: RegExp[];
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
  /**
   * Optional, global flag. Words of this language that HOLD an English trigger ("porno"
   * holds `porn`, "obsesionada" `bs`, "acostumbrada" `cost`), blanked before the English
   * branches of detectIntent only; this pack's own classes still read the whole text.
   * The English regexes cannot be narrowed from a pack. A pack without it: unchanged.
   */
  englishMask?: RegExp;
  /**
   * Optional. Try this pack's aiQuestion and priceQuestion BEFORE clarification: a
   * language that closes every question with "?" ("¿cuánto cuesta?") would otherwise
   * land every clear question on clarification. English order is unchanged.
   */
  questionsFirst?: boolean;
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
  /**
   * Last-line net on a live reply (server/lib/claude.ts), before typography: takes
   * out English words the English prompt leaks into this language ("…, dear.").
   */
  cleanReply?: (text: string) => string;
}
