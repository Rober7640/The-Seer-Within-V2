// Locale typography for text WE generate (Evelyn's live replies) and a check for
// translated copy. English: returned untouched.
//
// French (France): a narrow no-break space (U+202F) before ? ! ; and a no-break
// space (U+00A0) before : and inside « », so the mark never wraps onto a line of
// its own. Straight double quotes around a phrase become « ».
//
// Never touched: URLs, emails, {placeholders}, ${…}, HTML tags, times (12:30),
// emoticons (:) ;) :-( :D).
import type { LocaleCode } from "./locales";

const NNBSP = "\u202f";
const NBSP = "\u00a0";
const PROTECTED = /(https?:\/\/\S+|www\.\S+|[^\s@]+@[^\s@]+\.[a-z]{2,}|\{[A-Za-z_][A-Za-z0-9_]*\}|\$\{[^}]*\}|<[^>]+>|[:;][-']?[)(DPpOo3*|\]\[](?![a-zA-Z])|\d+:\d+)/g;

function french(part: string): string {
  return part
    // plain / no-break space before ? ! ; → narrow no-break space
    .replace(/[ \t\u00a0]+([!?;]+)/g, `${NNBSP}$1`)
    // no space before ? ! ; (after a word, quote or bracket) → add one
    .replace(/([^\s\u00a0\u202f!?;:.…(«])([!?;]+)/g, `$1${NNBSP}$2`)
    // colon followed by a space or the end: no-break space before it
    .replace(/[ \t\u202f]+:(?=\s|$)/g, `${NBSP}:`)
    .replace(/([^\s\u00a0\u202f:]):(?=\s|$)/g, `$1${NBSP}:`)
    // "phrase" → « phrase », and one no-break space inside guillemets
    .replace(/"([^"\n]+)"/g, `«${NBSP}$1${NBSP}»`)
    .replace(/«[ \t\u00a0\u202f]*/g, `«${NBSP}`)
    .replace(/[ \t\u00a0\u202f]*»/g, `${NBSP}»`);
}

export function applyLocaleTypography(text: string, locale: LocaleCode): string {
  if (locale !== "fr-FR" || !text) return text;
  let out = "";
  let last = 0;
  PROTECTED.lastIndex = 0;
  for (let m = PROTECTED.exec(text); m; m = PROTECTED.exec(text)) {
    out += french(text.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  return out + french(text.slice(last));
}

/** For the translation checks: does this French string already follow the rules? */
export function typographyIssues(text: string, locale: LocaleCode): string[] {
  const fixed = applyLocaleTypography(text, locale);
  return fixed === text ? [] : [`typography: expected ${JSON.stringify(fixed)}`];
}
