// Translation runtime shared by client and server.
//
// Two mechanisms, matched to how the copy is written today:
//
// 1. `translate(locale, text, vars)` for copy written INLINE in functions
//    (Evelyn's chat lines in useConversation, labels in components, server
//    replies). The English source text IS the key, gettext-style, so wrapping a
//    literal in t() cannot change English output: with locale "en" (or no entry)
//    it returns the source text, interpolated. Placeholders are `{name}`.
//
// 2. `pickData(locale, key, english)` for copy that is DATA (module-level
//    constants and registries: the tarot reads, the upsell scripts, the FAQ).
//    Each such module gets a locale twin with the same type, registered under a
//    key; English always returns the English object itself.
//
// Catalogs and data twins for non-English locales are registered at boot
// (client: loadLocale() before React renders; server: at import). English
// registers nothing.

import type { LocaleCode } from "./locales";

export type Catalog = Readonly<Record<string, string>>;
export type Vars = Readonly<Record<string, string | number | null | undefined>>;

/** What one locale ships: the inline-copy catalog plus data twins by key. */
export interface LocaleBundle {
  catalog: Catalog;
  data?: Readonly<Record<string, unknown>>;
}

const catalogs = new Map<LocaleCode, Catalog>();
const dataTwins = new Map<LocaleCode, Map<string, unknown>>();
const missing = new Map<LocaleCode, Set<string>>();

export function registerCatalog(locale: LocaleCode, catalog: Catalog): void {
  if (locale === "en") return;
  const prev = catalogs.get(locale);
  catalogs.set(locale, prev ? { ...prev, ...catalog } : catalog);
}

export function registerData(locale: LocaleCode, key: string, value: unknown): void {
  if (locale === "en") return;
  let m = dataTwins.get(locale);
  if (!m) dataTwins.set(locale, (m = new Map()));
  m.set(key, value);
}

/**
 * Replace `{name}` placeholders with vars[name]. A `{word}` with no matching
 * var is left untouched, so English text that happens to contain braces is
 * returned exactly as written.
 */
export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name] ?? "") : whole,
  );
}

export function translate(locale: LocaleCode, text: string, vars?: Vars): string {
  if (locale === "en") return interpolate(text, vars);
  const hit = catalogs.get(locale)?.[text];
  if (hit === undefined) {
    let s = missing.get(locale);
    if (!s) missing.set(locale, (s = new Set()));
    s.add(text);
    return interpolate(text, vars);
  }
  return interpolate(hit, vars);
}

export function pickData<T>(locale: LocaleCode, key: string, english: T): T {
  if (locale === "en") return english;
  const twin = dataTwins.get(locale)?.get(key);
  return (twin as T | undefined) ?? english;
}

/** Source texts requested in `locale` that had no translation (for QA pages). */
export function missingTranslations(locale: LocaleCode): string[] {
  return Array.from(missing.get(locale) ?? []);
}

/** Test helper: forget every registered catalog and twin. */
export function __resetI18nForTests(): void {
  catalogs.clear();
  dataTwins.clear();
  missing.clear();
}
