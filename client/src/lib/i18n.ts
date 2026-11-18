// Client-side translation helpers bound to the visitor's locale.
//
//   t("It's lovely to meet you, {name}.", { name })   — inline copy
//   pick("upsell1.v1", V1_UPSELL1)                    — data copy (localize/twins.json)
//
// For English both return the English text/object itself, so wrapping copy in
// them cannot change what an English visitor sees.

import { pickData, registerCatalog, registerData, translate, type LocaleBundle, type Vars } from "@shared/i18n";
import type { LocaleCode } from "@shared/locales";
import { registerLangPack } from "@shared/lang/registry";
import { currentLocale } from "./locale";

export function t(text: string, vars?: Vars): string {
  return translate(currentLocale(), text, vars);
}

export function pick<T>(key: string, english: T): T {
  return pickData(currentLocale(), key, english);
}

// One loader per non-English locale: client/src/l10n/<locale>/index.ts
// default-exports { catalog, data }. It is a separate chunk, fetched only by
// visitors in that locale, so the English bundle never carries another language.
// (Resolved lazily so scripts can import this module outside vite.)
function loaders(): Record<string, () => Promise<{ default: LocaleBundle }>> {
  return import.meta.glob<{ default: LocaleBundle }>("../l10n/*/index.ts");
}

/** Fetch + register a locale's catalog and data twins. English resolves at once. */
export async function loadLocale(locale: LocaleCode): Promise<void> {
  if (locale === "en") return;
  const loader = loaders()[`../l10n/${locale}/index.ts`];
  if (!loader) return; // locale declared but nothing translated yet → English fallback
  const { default: bundle } = await loader();
  registerCatalog(locale, bundle.catalog);
  for (const [key, value] of Object.entries(bundle.data ?? {})) registerData(locale, key, value);
  if (bundle.lang) registerLangPack(bundle.lang);
}
