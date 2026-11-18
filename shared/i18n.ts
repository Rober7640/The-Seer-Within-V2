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
import type { LangPack } from "./lang/types";

export type Catalog = Readonly<Record<string, string>>;
export type Vars = Readonly<Record<string, string | number | null | undefined>>;

/** What one locale ships: the inline-copy catalog plus data twins by key. */
export interface LocaleBundle {
  catalog: Catalog;
  data?: Readonly<Record<string, unknown>>;
  /** The language pack the CLIENT runs for this locale (intent, upsell replies, name capture). */
  lang?: LangPack;
}

/**
 * Marks a source string as translatable copy where it is DEFINED, for copy that
 * is translated later where it is USED (a constant passed to tl()/t() by
 * reference). Returns the text unchanged — the extractor reads the marker.
 * (gettext's N_ / gettext_noop.)
 */
export function msg<T extends string>(text: T): T {
  return text;
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

/**
 * A data twin is an OVERLAY on the English value: plain objects merge key by key
 * (so a twin may carry only the landers / stages translated so far), while
 * strings, arrays and functions are replaced whole (a translation may split a
 * message into a different number of bubbles). Whether a page may be served
 * in a locale at all is decided before mount (coverage), never here.
 */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

export function overlay<T>(english: T, twin: unknown): T {
  if (twin === undefined) return english;
  if (!isPlainObject(twin) || !(isPlainObject(english) || isModuleNamespace(english))) return twin as T;
  const out: Record<string, unknown> = { ...(english as Record<string, unknown>) };
  for (const [k, v] of Object.entries(twin)) out[k] = overlay(out[k], v);
  return out as T;
}

function isModuleNamespace(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && (v as { [Symbol.toStringTag]?: string })[Symbol.toStringTag] === "Module";
}

const merged = new Map<string, { english: unknown; twin: unknown; value: unknown }>();

export function pickData<T>(locale: LocaleCode, key: string, english: T): T {
  if (locale === "en") return english;
  const twin = dataTwins.get(locale)?.get(key);
  if (twin === undefined) return english;
  const memoKey = `${locale}\u0000${key}`;
  const hit = merged.get(memoKey);
  if (hit && hit.english === english && hit.twin === twin) return hit.value as T;
  const value = overlay(english, twin);
  merged.set(memoKey, { english, twin, value });
  return value;
}

/** The registered twin itself (no overlay) — for coverage checks. */
export function twinFor(locale: LocaleCode, key: string): unknown {
  return locale === "en" ? undefined : dataTwins.get(locale)?.get(key);
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
  merged.clear();
}
