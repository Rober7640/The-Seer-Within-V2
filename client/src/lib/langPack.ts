// The visitor's language pack on the client (shared/lang/). English: null, and
// every helper below returns exactly what the English code did before.
import { foldText } from "@shared/lang/fold";
import { langPackFor } from "@shared/lang/registry";
import type { LangPack } from "@shared/lang/types";
import { currentLocale } from "./locale";

export function activePack(): LangPack | null {
  return langPackFor(currentLocale());
}

type ReplyKey = keyof LangPack["upsellReplies"];

/**
 * The upsell question's answer class from the session language's patterns, or
 * null (English session, or nothing matched — the English detector then runs).
 */
export function packReply(key: ReplyKey, input: string): string | null {
  const pack = activePack();
  if (!pack) return null;
  const folded = foldText(input);
  for (const [cls, re] of pack.upsellReplies[key]) if (re.test(folded)) return cls;
  return null;
}

/**
 * The name she typed, from her answer to "what's your name?" / "what's his name?".
 * English: the first word, capitalised — exactly the old inline code. Another
 * language strips its intro ("Je m'appelle …", "Il s'appelle …") and trailing
 * punctuation first, and capitalises each part of a hyphenated name.
 */
export function nameFromAnswer(input: string, who: "self" | "other"): string {
  const pack = activePack();
  if (!pack) {
    const word = input.trim().split(' ')[0];
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  const trimmed = input.trim();
  const stripped = trimmed.replace(who === "self" ? pack.nameIntro : pack.otherNameIntro, "").trim();
  const word = (stripped || trimmed).split(/\s+/)[0].replace(/[.,!?;:…]+$/, "") || trimmed.split(/\s+/)[0];
  return word
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("-");
}
