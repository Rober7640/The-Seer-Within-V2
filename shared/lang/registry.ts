// Which language pack a locale runs. English has none: its patterns live where
// they always did, untouched. The server registers every pack at import
// (server/lib/locale.ts); the client registers the visitor's pack from the
// lazily loaded locale bundle (client/src/lib/i18n.ts loadLocale).
import type { LocaleCode } from "../locales";
import type { LangPack } from "./types";

const packs = new Map<LocaleCode, LangPack>();

export function registerLangPack(pack: LangPack): void {
  packs.set(pack.locale, pack);
}

export function langPackFor(locale: LocaleCode): LangPack | null {
  if (locale === "en") return null;
  return packs.get(locale) ?? null;
}

/** Test helper. */
export function __resetLangPacksForTests(): void {
  packs.clear();
}
