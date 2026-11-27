// Per-language AWeber list routing. The decision (Joel, 2026-11-27): each language
// gets its OWN mirror of the English /fb list set; the order's locale picks the
// list. The French list ids live in env vars (AWEBER_<SLOT>_LIST_ID_FRNCH); until
// they're set, every order falls back to the English list, so this is dormant and
// English is byte-identical. Keyed on the ORDER's locale (webhooks carry no cookie).
import { localeDef, type LocaleCode } from "@shared/locales";

/**
 * The env-var / tag suffix for a locale's AWeber lists, derived from its
 * `suffix.aweber` ("-frnch" → "FRNCH"). English (or no locale) → null, i.e. the
 * single English list, exactly as today.
 */
export function aweberLangSuffix(locale: LocaleCode | undefined): string | null {
  if (!locale || locale === "en") return null;
  const raw = localeDef(locale).suffix.aweber.replace(/[^a-z0-9]/gi, "");
  return raw ? raw.toUpperCase() : null;
}

/**
 * The AWeber list id to use for an order. Returns `englishListId` for an English
 * order, or when the locale's per-language env var (`${envBase}_${SUFFIX}`) is
 * unset — so a French order lands on the English list until Joel provisions the
 * French list id. `env` is injectable for tests.
 */
export function localizedAweberList(
  englishListId: string,
  envBase: string,
  locale: LocaleCode | undefined,
  env: Record<string, string | undefined> = process.env,
): string {
  const suffix = aweberLangSuffix(locale);
  if (!suffix) return englishListId;
  return env[`${envBase}_${suffix}`] || englishListId;
}
