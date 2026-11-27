// Country names in the visitor's language. English keeps the exact labels each
// form has always shown (passed in by the caller); other locales ask the
// browser (Intl.DisplayNames), so no list of country names is translated by hand.
import { localeDef } from "@shared/locales";
import { currentLocale } from "./locale";

let cache: { intl: string; names: Intl.DisplayNames | null } | null = null;

function displayNames(intl: string): Intl.DisplayNames | null {
  if (cache?.intl === intl) return cache.names;
  let names: Intl.DisplayNames | null = null;
  try { names = new Intl.DisplayNames([intl], { type: "region" }); } catch { names = null; }
  cache = { intl, names };
  return names;
}

/** `english` for English visitors; the browser's name for `code` in any other locale. */
export function countryLabel(code: string, english: string): string {
  const locale = currentLocale();
  if (locale === "en") return english;
  return displayNames(localeDef(locale).market.intl)?.of(code) ?? english;
}

/** The Intl tag to sort/display country names with ('en' for English, as before). */
export function countryIntl(): string {
  const locale = currentLocale();
  return locale === "en" ? "en" : localeDef(locale).market.intl;
}
